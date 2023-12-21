// SPDX-License-Identifier: MIT
/// @title Staking contract for UDAO
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import "@openzeppelin/contracts/governance/utils/IVotes.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/draft-EIP712.sol";
import "../interfaces/IPlatformTreasury.sol";
import "../interfaces/IRoleManager.sol";
import "../RoleLegacy.sol";
import "@openzeppelin/contracts/security/Pausable.sol";

interface IUDAOVP is IVotes, IERC20 {
    function mint(address to, uint256 amount) external;

    function burnFrom(address account, uint256 amount) external;
}

contract UDAOStaker is RoleLegacy, EIP712, Pausable {
    string private constant SIGNING_DOMAIN = "UDAOStaker";
    string private constant SIGNATURE_VERSION = "1";

    IERC20 udao;
    IUDAOVP udaovp;
    IPlatformTreasury platformTreasury;

    /// @notice the required duration to be a validator
    uint256 public jurorLockTime = 30 days;
    /// @notice the required duration to be a validator
    uint256 public validatorLockTime = 90 days;
    /// @notice the lock duration for applications
    uint256 public applicationLockTime = 7 days;
    /// @notice Amount to deduct from validator application
    uint256 public validatorLockAmount = 1 ether;
    /// @notice Amount to deduct from juror application
    uint256 public jurorLockAmount = 1 ether;
    /// @notice the minimum duration for governance stake
    uint256 public minimum_stake_days = 7 days; // 1 WEEK
    /// @notice the maximum duration for governance stake
    uint256 public maximum_stake_days = 1460 days; // 4 YEARS

    /// @notice Triggered when validator lock amount is updated
    event SetValidatorLockAmount(uint256 _newAmount);
    /// @notice Triggered when juror lock amount is updated
    event SetJurorLockAmount(uint256 _newAmount);
    /// @notice Triggered when validator lock time is updated
    event SetValidatorLockTime(uint256 _newLockTime);
    /// @notice Triggered when juror lock time is updated
    event SetJurorLockTime(uint256 _newLockTime);
    /// @notice Triggered when application lock time is updated
    event SetApplicationLockTime(uint256 _newLockTime);
    /// @notice Triggered when vote reward is updated
    event SetVoteReward(uint256 _newAmount);
    /// @notice Triggered when platform treasury address is updated
    event SetPlatformTreasuryAddress(address _newAddress);
    /// @notice Triggered when any role is applied, roleId: 0 validator, 1 juror
    event RoleApplied(uint256 _roleId, address _user, uint256 _lockAmount);
    /// @notice Triggered when any role is approved, roleId: 0 validator, 1 juror
    event RoleApproved(uint256 _roleId, address _user);
    /// @notice Triggered when any role is rejected, roleId: 0 validator, 1 juror
    event RoleRejected(uint256 _roleId, address _user);
    /// @notice Triggered when validator stake is withdrawn
    event ValidatorStakeWithdrawn(address _validator, uint256 _amount);
    /// @notice Triggered when juror stake is withdrawn
    event JurorStakeWithdrawn(address _juror, uint256 _amount);
    /// @notice Triggered when governance stake is added
    event GovernanceStake(
        address _member,
        uint256 _stakeAmount,
        uint256 _vpAmount
    );
    /// @notice Triggered when governance stake is withdrawn
    event GovernanceStakeWithdraw(
        address _member,
        uint256 _unstakeAmount,
        uint256 _vpAmount
    );
    /// @notice Triggered when vote reward is added to voters reward balance
    event VoteRewardAdded(address _rewardee, uint256 _amount);
    /// @notice Triggered when vote reward is withdrawn
    event VoteRewardsWithdrawn(address _rewardee, uint256 _amount);
    /// @notice Triggered when governance maximum stake days is updated
    event SetMaximumStakeDays(uint256 _newAmount);
    /// @notice Triggered when governance minimum stake days is updated
    event SetMinimumStakeDays(uint256 _newAmount);

    /// @notice the balance of the validator
    mapping(address => uint256) validatorBalanceOf;
    /// @notice the balance of the juror
    mapping(address => uint256) jurorBalanceOf;
    /* TODO These were 8 months old and never used, why?
    mapping(address => uint256) latestValidatorStakeId;
    mapping(address => uint256) latestJurorStakeId;
    mapping(address => uint256) latestValidationLockId;
    */

    /// @notice if user has an active application for validator role
    mapping(address => bool) public activeApplicationForValidator;
    /// @notice if user has an active application for juror role
    mapping(address => bool) public activeApplicationForJuror;
    /// @notice Governance lock struct for each governance member
    struct GovernanceLock {
        uint256 expire;
        uint256 amount;
        uint256 vpamount;
    }
    /// @notice Governance lock array for each governance member
    mapping(address => GovernanceLock[]) governanceStakes;
    /// @notice Reward balance of each governance member
    mapping(address => uint256) rewardBalanceOf;
    /// @notice Last reward block of each governance member TODO This is not used??
    mapping(address => uint256) lastRewardBlock;
    /// @notice Reward given to each voter for each vote with respect to their voting power
    uint256 public voteReward = 0.0001 ether;
    /// @notice Validator application struct
    struct ValidatiorApplication {
        address applicant;
        bool isFinished;
        uint256 expire;
    }
    /// @notice Array of validator applications
    ValidatiorApplication[] public validatorApplications;
    /// @notice Validator application index, a simple counter
    uint256 private validatiorApplicationIndex;
    /// @notice Validator application id for each validator
    mapping(address => uint256) validatorApplicationId;
    /// @notice Juror application struct
    struct JurorApplication {
        address applicant;
        bool isFinished;
        uint256 expire;
    }
    /// @notice Array of juror applications
    JurorApplication[] public jurorApplications;
    /// @notice Juror application id for each juror
    mapping(address => uint256) jurorApplicationId;
    /// @notice Juror application index, a simple counter
    uint256 private caseApplicationIndex;
    /// @notice The total voting power of all governance members
    uint256 totalVotingPower;

    /// @param roleManagerAddress address of the role manager contract
    /// @param udaoAddress address of the udao token contract
    /// @param platformTreasuryAddress address of the platform treasury contract
    /// @param udaoVpAddress address of the udao voting power token contract
    constructor(
        address roleManagerAddress,
        address udaoAddress,
        address platformTreasuryAddress,
        address udaoVpAddress
    ) EIP712(SIGNING_DOMAIN, SIGNATURE_VERSION) {
        roleManager = IRoleManager(roleManagerAddress);
        udao = IERC20(udaoAddress);
        platformTreasury = IPlatformTreasury(platformTreasuryAddress);
        udaovp = IUDAOVP(udaoVpAddress);
    }

    event AddressesUpdated(
        address RoleManagerAddress,
        address UdaoAddress,
        address PlatformTreasuryAddress,
        address UdaoVpAddress
    );

    /// @notice Get the updated addresses from contract manager
    function updateAddresses(
        address roleManagerAddress,
        address udaoAddress,
        address platformTreasuryAddress,
        address udaoVpAddress
    ) external {
        if (msg.sender != foundationWallet) {
            require(
                (hasRole(BACKEND_ROLE, msg.sender) ||
                    hasRole(CONTRACT_MANAGER, msg.sender)),
                "Only backend and contract manager can update addresses"
            );
        }
        roleManager = IRoleManager(roleManagerAddress);
        udao = IERC20(udaoAddress);
        platformTreasury = IPlatformTreasury(platformTreasuryAddress);
        udaovp = IUDAOVP(udaoVpAddress);

        emit AddressesUpdated(
            roleManagerAddress,
            udaoAddress,
            platformTreasuryAddress,
            udaoVpAddress
        );
    }

    /// @notice Allows admins to set validator lock amount
    /// @param _amount new amount that requried to be locked
    function setValidatorLockAmount(uint256 _amount) external {
        require(
            roleManager.hasRoles(administrator_roles, msg.sender),
            "Only admins can set validator lock amount"
        );
        validatorLockAmount = _amount;
        emit SetValidatorLockAmount(_amount);
    }

    /// @notice Allows admins to set juror lock amount
    /// @param _amount new amount that requried to be locked
    function setJurorLockAmount(uint256 _amount) external {
        require(
            roleManager.hasRoles(administrator_roles, msg.sender),
            "Only admins can set juror lock amount"
        );
        jurorLockAmount = _amount;
        emit SetJurorLockAmount(_amount);
    }

    /// @notice Allows admins to set validator lock time
    /// @param _lockTime is new lock time for validators
    function setValidatorLockTime(uint256 _lockTime) external {
        require(
            roleManager.hasRoles(administrator_roles, msg.sender),
            "Only admins can set validator lock time"
        );
        //convert it to unix timestamp
        _lockTime = _lockTime * (1 days);
        validatorLockTime = _lockTime;
        emit SetValidatorLockTime(_lockTime);
    }

    /// @notice Allows admins to set juror lock time
    /// @param _lockTime is new lock time for jurors
    function setJurorLockTime(uint256 _lockTime) external {
        require(
            roleManager.hasRoles(administrator_roles, msg.sender),
            "Only admins can set juror lock time"
        );
        //convert it to unix timestamp
        _lockTime = _lockTime * (1 days);
        jurorLockTime = _lockTime;
        emit SetJurorLockTime(_lockTime);
    }

    /// @notice Allows admins to set application lock time for role applications
    /// @param _lockTime is new lock time for role applications
    function setApplicationLockTime(uint256 _lockTime) external {
        require(
            roleManager.hasRoles(administrator_roles, msg.sender),
            "Only admins can set application lock time"
        );
        //convert it to unix timestamp
        _lockTime = _lockTime * (1 days);
        applicationLockTime = _lockTime;
        emit SetApplicationLockTime(_lockTime);
    }

    /// @notice sets the vote reward given when governance member votes
    /// @param _reward new amount of reward
    function setVoteReward(uint256 _reward) external {
        require(
            roleManager.hasRoles(administrator_roles, msg.sender),
            "Only admins can set vote reward"
        );
        voteReward = _reward;
        emit SetVoteReward(_reward);
    }

    /// @notice sets the platform treasury address
    /// @param platformTreasuryAddress the address of the new platform treasury
    /// TODO remove this function and use updateAddresses instead
    function setPlatformTreasuryAddress(
        address platformTreasuryAddress
    ) external {
        require(
            roleManager.hasRoles(administrator_roles, msg.sender),
            "Only admins can set platform treasury address"
        );
        platformTreasury = IPlatformTreasury(platformTreasuryAddress);
        emit SetPlatformTreasuryAddress(platformTreasuryAddress);
    }

    /// @notice sets the maximum stake days for governance members
    /// @param _maximum_stake_days the new maximum stake days
    function setMaximumStakeDays(uint256 _maximum_stake_days) external {
        require(
            roleManager.hasRoles(administrator_roles, msg.sender),
            "Only admins can set maximum stake days"
        );
        //convert it to unix timestamp
        _maximum_stake_days = _maximum_stake_days * (1 days);
        require(
            _maximum_stake_days >= minimum_stake_days,
            "Maximum stake days must be greater than minimum days"
        );
        maximum_stake_days = _maximum_stake_days;
        emit SetMaximumStakeDays(_maximum_stake_days);
    }

    /// @notice sets the minimum stake days for governance members
    /// @param _minimum_stake_days the new minimum stake days
    function setMinimumStakeDays(uint256 _minimum_stake_days) external {
        require(
            roleManager.hasRoles(administrator_roles, msg.sender),
            "Only admins can set minimum stake days"
        );
        //convert it to unix timestamp
        _minimum_stake_days = _minimum_stake_days * (1 days);
        require(
            _minimum_stake_days < maximum_stake_days,
            "Minimum stake days must be less than maximum days"
        );
        minimum_stake_days = _minimum_stake_days;
        emit SetMinimumStakeDays(_minimum_stake_days);
    }

    /// @notice Represents the right to get a role
    struct RoleVoucher {
        /// @notice Address of the redeemer
        address redeemer;
        /// @notice The date until the voucher is valid
        uint256 validUntil;
        /// @notice 0 validator, 1 juror
        uint256 roleId;
        /// @notice the EIP-712 signature of all other fields in the RoleVoucher struct.
        bytes signature;
    }

    /// @notice allows users to apply for validator role
    function applyForValidator() external whenNotPaused {
        //make sure redeemer is kyced and not banned
        require(isKYCed(msg.sender, 5), "You are not KYCed");
        require(isNotBanned(msg.sender, 5), "You were banned");
        require(
            udaovp.balanceOf(msg.sender) > 0,
            "You have to be governance member to apply"
        );
        require(
            !hasRole(VALIDATOR_ROLE, msg.sender),
            "Address is already a Validator"
        );
        require(
            !activeApplicationForValidator[msg.sender],
            "You already have an active application"
        );
        udao.transferFrom(msg.sender, address(this), validatorLockAmount);
        ValidatiorApplication
            storage validatorApplication = validatorApplications.push();
        validatorApplication.applicant = msg.sender;
        validatorApplication.expire = block.timestamp + applicationLockTime;
        validatorApplicationId[msg.sender] = validatiorApplicationIndex;
        validatiorApplicationIndex++;
        validatorBalanceOf[msg.sender] += validatorLockAmount;
        activeApplicationForValidator[msg.sender] = true;

        emit RoleApplied(0, msg.sender, validatorLockAmount);
    }

    /// @notice allows users to apply for juror role
    function applyForJuror() external whenNotPaused {
        //make sure redeemer is kyced and not banned
        require(isKYCed(msg.sender, 6), "You are not KYCed");
        require(isNotBanned(msg.sender, 6), "You were banned");
        require(
            udaovp.balanceOf(msg.sender) > 0,
            "You have to be governance member to apply"
        );
        require(!hasRole(JUROR_ROLE, msg.sender), "Address is already a Juror");
        require(
            !activeApplicationForJuror[msg.sender],
            "You already have an active application"
        );
        udao.transferFrom(msg.sender, address(this), jurorLockAmount);
        JurorApplication storage jurorApplication = jurorApplications.push();
        jurorApplication.applicant = msg.sender;
        jurorApplicationId[msg.sender] = caseApplicationIndex;
        jurorApplication.expire = block.timestamp + applicationLockTime;
        caseApplicationIndex++;
        jurorBalanceOf[msg.sender] += jurorLockAmount;
        activeApplicationForJuror[msg.sender] = true;

        emit RoleApplied(1, msg.sender, jurorLockAmount);
    }

    /// @notice Users can use this function and assign validator or juror roles to themselves
    function getApproved(RoleVoucher calldata voucher) external whenNotPaused {
        //make sure redeemer is kyced and not banned
        require(isKYCed(msg.sender, 7), "You are not KYCed");
        require(isNotBanned(msg.sender, 7), "You were banned");
        // make sure redeemer is redeeming
        require(voucher.redeemer == msg.sender, "You are not the redeemer");
        // make sure signature is valid and get the address of the signer
        address signer = _verifyRole(voucher);
        require(voucher.validUntil >= block.timestamp, "Voucher has expired.");
        require(
            hasRole(VOUCHER_VERIFIER, signer),
            "Signature invalid or unauthorized"
        );

        uint256 roleId = voucher.roleId;

        if (roleId == 0) {
            /// @dev validator role application
            ValidatiorApplication
                storage validatorApplication = validatorApplications[
                    validatorApplicationId[voucher.redeemer]
                ];
            require(
                validatorApplication.isFinished == false,
                "Application was already finished"
            );

            validatorApplication.isFinished = true;
            validatorApplication.expire = block.timestamp + validatorLockTime;
            roleManager.grantRoleStaker(VALIDATOR_ROLE, voucher.redeemer);
            activeApplicationForValidator[voucher.redeemer] = false;
        } else if (roleId == 1) {
            /// @dev juror role application
            require(
                udaovp.balanceOf(voucher.redeemer) > 0,
                "You are not governance member"
            );
            JurorApplication storage jurorApplication = jurorApplications[
                jurorApplicationId[voucher.redeemer]
            ];
            require(
                jurorApplication.isFinished == false,
                "Application was already finished"
            );
            jurorApplication.isFinished = true;
            jurorApplication.expire = block.timestamp + jurorLockTime;
            roleManager.grantRoleStaker(JUROR_ROLE, voucher.redeemer);
            activeApplicationForJuror[voucher.redeemer] = false;
        } else {
            revert("Undefined role ID!");
        }

        emit RoleApproved(roleId, msg.sender);
    }

    /// @notice Allows backend to reject role assignment application
    /// @param _applicant The address of the applicant
    function rejectApplication(address _applicant, uint256 roleId) external {
        require(
            hasRole(BACKEND_ROLE, msg.sender),
            "Only backend can reject application"
        );
        if (roleId == 0) {
            ValidatiorApplication
                storage validatorApplication = validatorApplications[
                    validatorApplicationId[_applicant]
                ];
            validatorApplication.expire = 0;
            validatorApplication.isFinished = true;
        } else if (roleId == 1) {
            JurorApplication storage jurorApplication = jurorApplications[
                jurorApplicationId[_applicant]
            ];
            jurorApplication.expire = 0;
            jurorApplication.isFinished = true;
        } else {
            revert("Role Id does not exist!");
        }

        emit RoleRejected(roleId, _applicant);
    }

    /// @notice Returns expire dates for validator
    /// @param _user address of the user
    function checkExpireDateValidator(
        address _user
    ) external view returns (uint256 expireDate) {
        expireDate = validatorApplications[validatorApplicationId[_user]]
            .expire;
        return expireDate;
    }

    /// @notice Returns expire dates for juror
    /// @param _user address of the user
    function checkExpireDateJuror(
        address _user
    ) external view returns (uint256 expireDate) {
        expireDate = jurorApplications[jurorApplicationId[_user]].expire;
        return expireDate;
    }

    /// @notice allows validators to withdraw their staked tokens
    function withdrawValidatorStake() public whenNotPaused {
        uint256 withdrawableBalance;
        ValidatiorApplication
            storage validatorApplication = validatorApplications[
                validatorApplicationId[msg.sender]
            ];

        if (hasRole(VALIDATOR_ROLE, msg.sender)) {
            if (
                validatorApplication.isFinished &&
                validatorApplication.expire < block.timestamp
            ) {
                roleManager.revokeRoleStaker(VALIDATOR_ROLE, msg.sender);
                withdrawableBalance = validatorBalanceOf[msg.sender];
                validatorBalanceOf[msg.sender] = 0;
            }
        } else {
            // If application not finalized in time or got rejected
            if (
                validatorApplication.expire < block.timestamp ||
                validatorApplication.isFinished
            ) {
                withdrawableBalance = validatorBalanceOf[msg.sender];
                validatorBalanceOf[msg.sender] = 0;
            }
        }
        validatorApplication.isFinished == true;
        _withdrawValidator(msg.sender, withdrawableBalance);
    }

    /**
     * @notice Withdraws desired amounts of tokens to "to" address
     * @param to address of the redeemer of the tokens
     * @param withdrawableBalance amount of tokens that will be withdrawn
     */
    function _withdrawValidator(address to, uint withdrawableBalance) internal {
        require(withdrawableBalance > 0, "You don't have withdrawable token");
        udao.transfer(to, withdrawableBalance);
        emit ValidatorStakeWithdrawn(to, withdrawableBalance);
    }

    /**
     * @notice allows jurors to withdraw their staked tokens
     */
    function withdrawJurorStake() public whenNotPaused {
        uint256 withdrawableBalance;
        JurorApplication storage jurorApplication = jurorApplications[
            jurorApplicationId[msg.sender]
        ];

        if (hasRole(JUROR_ROLE, msg.sender)) {
            if (
                jurorApplication.isFinished &&
                jurorApplication.expire < block.timestamp
            ) {
                roleManager.revokeRoleStaker(JUROR_ROLE, msg.sender);
                withdrawableBalance = jurorBalanceOf[msg.sender];
                jurorBalanceOf[msg.sender] = 0;
            }
        } else {
            // If application not finalized in time or got rejected
            if (
                jurorApplication.expire < block.timestamp ||
                jurorApplication.isFinished
            ) {
                withdrawableBalance = jurorBalanceOf[msg.sender];
                jurorBalanceOf[msg.sender] = 0;
            }
        }

        jurorApplication.isFinished == true;
        _withdrawJuror(msg.sender, withdrawableBalance);
        return;
    }

    /**
     * @notice Withdraws desired amounts of tokens to "to" address
     * @param to address of the redeemer of the tokens
     * @param withdrawableBalance amount of tokens that will be withdrawn
     */
    function _withdrawJuror(address to, uint withdrawableBalance) internal {
        require(withdrawableBalance > 0, "You don't have withdrawable token");
        udao.transfer(to, withdrawableBalance);
        emit JurorStakeWithdrawn(to, withdrawableBalance);
    }

    /// @notice Returns the amount of token a validator could withdraw
    function withdrawableValidatorStake() public view returns (uint256) {
        uint256 withdrawableBalance;
        ValidatiorApplication
            storage validatorApplication = validatorApplications[
                validatorApplicationId[msg.sender]
            ];

        if (hasRole(VALIDATOR_ROLE, msg.sender)) {
            if (
                validatorApplication.isFinished &&
                validatorApplication.expire < block.timestamp
            ) {
                withdrawableBalance = validatorBalanceOf[msg.sender];
            }
        } else {
            // If application got rejected
            if (validatorApplication.isFinished) {
                withdrawableBalance = validatorBalanceOf[msg.sender];
            }
        }
        return withdrawableBalance;
    }

    /// @notice staking function to become a governance member
    /// @param _amount amount of UDAO token that will be staked
    /// @param _days amount of days UDAO token that will be staked for
    function stakeForGovernance(
        uint256 _amount,
        uint256 _days
    ) public whenNotPaused {
        require(isKYCed(msg.sender, 8), "Address is not KYCed");
        require(isNotBanned(msg.sender, 8), "Address is banned");
        require(
            _days * (1 days) >= minimum_stake_days,
            "Can't stake less than minimum_stake_days"
        );
        require(
            _days * (1 days) <= maximum_stake_days,
            "Can't stake more than maximum_stake_days"
        );
        udao.transferFrom(msg.sender, address(this), _amount);
        GovernanceLock storage lock = governanceStakes[msg.sender].push();
        lock.amount = _amount;
        lock.expire = block.timestamp + (_days * (1 days));
        lock.vpamount = _amount * _days;
        totalVotingPower += lock.vpamount;
        udaovp.mint(msg.sender, lock.vpamount);
        emit GovernanceStake(msg.sender, _amount, lock.vpamount);
    }

    /// @notice withdraw function for released UDAO tokens
    /// @param _amount amount of UDAO token that will be unstaked
    function withdrawGovernanceStake(uint256 _amount) public whenNotPaused {
        /** 
        Here is the explanation for the code above:
        1. First we check if the amount is greater than 0 or not. If it is 0 then throw an error.
        2. Second we declare 2 variables withdrawableBalance and vpBalance. withdrawableBalance is 
        the amount of udao that can be withdrawn and vpBalance is the amount of voting power that can be withdrawn.
        3. Then we loop over the governanceStakes[msg.sender] array and check if the lock is expired or not. 
        If it is expired then we check if the amount is greater than the lock.amount or not. If it is greater 
        then we add the lock.amount to the withdrawableBalance and lock.vpamount to vpBalance, and then we 
        remove the lock from the array. If the amount is not greater then we calculate how much udao and 
        voting power can be withdrawn from the lock and then we reduce the lock.amount and lock.vpamount 
        by that much and then we add the udao and voting power to withdrawableBalance and vpBalance respectively. 
        And then we check if the _amount is less than or equal to withdrawableBalance or not. If it is then we burn 
        the voting power and transfer the udao to the user and then emit an event. If it is not then we revert with an error.
        4. If we reach the end of the loop and the _amount is still not less than or equal to withdrawableBalance then 
        it means that the user doesn't have enough withdrawable balance. So we revert with an error. 
        */
        require(_amount > 0, "Unstake amount can't be 0");
        uint256 withdrawableBalance;
        uint256 vpBalance;
        for (
            int256 i = 0;
            uint256(i) < governanceStakes[msg.sender].length;
            i++
        ) {
            GovernanceLock storage lock = governanceStakes[msg.sender][
                uint256(i)
            ];
            if (block.timestamp >= lock.expire) {
                if ((_amount - withdrawableBalance) >= lock.amount) {
                    withdrawableBalance += lock.amount;
                    vpBalance += lock.vpamount;
                    governanceStakes[msg.sender][uint256(i)] = governanceStakes[
                        msg.sender
                    ][governanceStakes[msg.sender].length - 1];
                    governanceStakes[msg.sender].pop();
                    i--;
                } else {
                    uint256 vpFromLatest = ((lock.vpamount *
                        (((_amount - withdrawableBalance) * 100) /
                            lock.amount)) / 100);
                    uint256 udaoFromLatest = lock.amount -
                        (_amount - withdrawableBalance);
                    lock.amount -= udaoFromLatest;
                    lock.vpamount -= vpFromLatest;
                    vpBalance += vpFromLatest;
                    totalVotingPower -= vpBalance;
                    withdrawableBalance += udaoFromLatest;
                }
                if (_amount <= withdrawableBalance) {
                    udaovp.burnFrom(msg.sender, vpBalance);
                    udao.transfer(msg.sender, _amount);
                    emit GovernanceStakeWithdraw(
                        msg.sender,
                        _amount,
                        vpBalance
                    );
                    return;
                }
            }
        }
        revert("You don't have enough withdrawable balance");
    }

    /// @notice add vote reward to voters reward count
    /// @param voter address of the voter
    function addVoteRewards(address voter) external whenNotPaused {
        require(
            hasRole(GOVERNANCE_CONTRACT, msg.sender),
            "Only governance contract can add vote rewards"
        );
        require(udaovp.balanceOf(voter) > 0, "Voter has no voting power");
        uint256 votingPowerRatio = (udaovp.balanceOf(voter) * 10000) /
            totalVotingPower;

        rewardBalanceOf[voter] += (votingPowerRatio * voteReward) / 10000;
        emit VoteRewardAdded(voter, (votingPowerRatio * voteReward) / 10000);
    }

    /// @notice withdraws reward earned from voting
    function withdrawRewards() external whenNotPaused {
        require(
            rewardBalanceOf[msg.sender] > 0,
            "You don't have any reward balance"
        );
        uint256 voteRewards = rewardBalanceOf[msg.sender];
        rewardBalanceOf[msg.sender] = 0;
        platformTreasury.transferGovernanceRewards(msg.sender, voteRewards);
        emit VoteRewardsWithdrawn(msg.sender, voteRewards);
    }

    /// @notice Returns a hash of the given ContentVoucher, prepared using EIP712 typed data hashing rules.
    /// @param voucher A ContentVoucher to hash.
    function _hashRole(
        RoleVoucher calldata voucher
    ) internal view returns (bytes32) {
        return
            _hashTypedDataV4(
                keccak256(
                    abi.encode(
                        keccak256(
                            "UDAOStaker(address redeemer,uint256 validUntil,uint256 roleId)"
                        ),
                        voucher.redeemer,
                        voucher.validUntil,
                        voucher.roleId
                    )
                )
            );
    }

    /// @notice Returns the chain id of the current blockchain.
    /// @dev This is used to workaround an issue with ganache returning different values from the on-chain chainid() function and
    ///  the eth_chainId RPC method. See https://github.com/protocol/nft-website/issues/121 for context.
    function getChainID() external view returns (uint256) {
        uint256 id;
        assembly {
            id := chainid()
        }
        return id;
    }

    /// @notice Verifies the signature for a given ContentVoucher, returning the address of the signer.
    /// @dev Will revert if the signature is invalid. Does not verify that the signer is authorized to mint NFTs.
    /// @param voucher A ContentVoucher describing an unminted NFT.
    function _verifyRole(
        RoleVoucher calldata voucher
    ) internal view returns (address) {
        bytes32 digest = _hashRole(voucher);
        return ECDSA.recover(digest, voucher.signature);
    }

    function pause() external {
        require(hasRole(BACKEND_ROLE, msg.sender), "Only backend can pause");
        _pause();
    }

    function unpause() external {
        require(hasRole(BACKEND_ROLE, msg.sender), "Only backend can unpause");
        _unpause();
    }
}
