// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import "@openzeppelin/contracts/governance/utils/IVotes.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/draft-EIP712.sol";
import "../RoleController.sol";
import "../ContractManager.sol";
import "../interfaces/IPlatformTreasury.sol";

interface IUDAOVP is IVotes, IERC20 {
    function mint(address to, uint256 amount) external;

    function burnFrom(address account, uint256 amount) external;
}

contract UDAOStaker is RoleController, EIP712 {
    string private constant SIGNING_DOMAIN = "UDAOStaker";
    string private constant SIGNATURE_VERSION = "1";

    IERC20 public udao;
    IUDAOVP public udaovp;
    ContractManager public contractManager;
    address public platformTreasuryAddress;

    /// @notice the required duration to be a validator
    uint256 public jurorLockTime = 30 days;
    /// @notice the required duration to be a validator
    uint256 public validatorLockTime = 90 days;
    /// @notice Amount to deduct from validator application
    uint256 public validatorLockAmount = 150 ether;
    /// @notice Amount to deduct from juror application
    uint256 public jurorLockAmount = 150 ether;

    event SetValidatorLockAmount(uint256 _newAmount);
    event SetVoteReward(uint256 _newAmount);
    event SetPlatformTreasuryAddress(address _newAddress);
    event RoleApplied(uint256 _roleId, address _user, uint256 _jobAmount);
    event RoleApproved(uint256 _roleId, address _user);
    event RoleRejected(uint256 _roleId, address _user);
    event ValidationAdded(uint256 _amount);
    event ValidationRegistered(address _validator, uint256 _validationId);
    event ValidatorStakeWithdrawn(address _validator, uint256 _amount);
    event JobListingRegistered(address corporate, uint amountPerListing);
    event JobListingUnregistered(
        address corporate,
        uint[] listingId,
        uint amount
    );
    event JurorStakeWithdrawn(address _juror, uint256 _amount);

    event GovernanceStake(
        address _member,
        uint256 _stakeAmount,
        uint256 _vpAmount
    );
    event GovernanceStakeWithdraw(
        address _member,
        uint256 _unstakeAmount,
        uint256 _vpAmount
    );
    event VoteRewardAdded(address _rewardee, uint256 _amount);
    event VoteRewardsWithdrawn(address _rewardee, uint256 _amount);

    mapping(address => uint256) validationBalanceOf;
    mapping(address => uint256) jurorBalanceOf;
    mapping(address => uint256) latestValidatorStakeId;
    mapping(address => uint256) latestJurorStakeId;
    mapping(address => uint256) latestValidationLockId;

    mapping(address => bool) public activeApplicationForValidator;
    mapping(address => bool) public activeApplicationForJuror;

    uint256 public corporateStakePerListing = 500 ether; //setter getter, decider=adminler
    mapping(address => uint) corporateStakedUDAO;
    mapping(address => uint) corporateLockedUDAO;
    mapping(address => uint) corporateActiveListingAmount;

    struct GovernanceLock {
        uint256 expire;
        uint256 amount;
        uint256 vpamount;
    }

    mapping(address => GovernanceLock[]) governanceStakes;
    mapping(address => uint256) rewardBalanceOf;
    mapping(address => uint256) lastRewardBlock;
    uint256 public voteReward = 0.0001 ether; // SHOULD BE UPDATED

    struct ValidationApplication {
        address applicant;
        bool isFinished;
        uint256 expire;
    }

    ValidationApplication[] public validatorApplications;
    mapping(address => uint256) validatorApplicationId;
    uint256 private validationApplicationIndex;

    struct JurorApplication {
        address applicant;
        bool isFinished;
        uint256 expire;
    }

    JurorApplication[] public jurorApplications;
    mapping(address => uint256) jurorApplicationId;
    uint256 private caseApplicationIndex;

    uint256 public totalVotingPower;

    /**
     * @param _platformTreasuryAddress address of the platform treasury contract
     * @param rmAddress address of the role manager contract
     * @param _contractManager address of the contract manager
     */
    constructor(
        address _platformTreasuryAddress,
        address rmAddress,
        address udaoVpAddress,
        address _contractManager
    ) EIP712(SIGNING_DOMAIN, SIGNATURE_VERSION) RoleController(rmAddress) {
        contractManager = ContractManager(_contractManager);
        udao = IERC20(contractManager.UdaoAddress());
        udaovp = IUDAOVP(udaoVpAddress);
        platformTreasuryAddress = _platformTreasuryAddress;
    }

    /// @notice Get the updated addresses from contract manager
    function updateAddresses() external onlyRole(BACKEND_ROLE) {
        platformTreasuryAddress = contractManager.PlatformTreasuryAddress();
        udao = IERC20(contractManager.UdaoAddress());
        udaovp = IUDAOVP(contractManager.UdaoVpAddress());
    }

    /**
     * @notice set the required lock amount for validators
     * @param _amount new amount that requried to be locked
     */
    function setValidatorLockAmount(
        uint256 _amount
    ) external onlyRoles(administrator_roles) {
        validatorLockAmount = _amount;
        emit SetValidatorLockAmount(_amount);
    }

    /**
     * @notice sets the vote reward given when governance member votes
     * @param _reward new amount of reward
     */
    function setVoteReward(
        uint256 _reward
    ) external onlyRoles(administrator_roles) {
        voteReward = _reward;
        emit SetVoteReward(_reward);
    }

    /**
     * @notice sets the platform treasury address
     * @param _platformTreasuryAddress the address of the new platform treasury
     */
    function setPlatformTreasuryAddress(
        address _platformTreasuryAddress
    ) external onlyRole(BACKEND_ROLE) {
        platformTreasuryAddress = _platformTreasuryAddress;
        emit SetPlatformTreasuryAddress(_platformTreasuryAddress);
    }

    /// @notice Represents the right to get a role
    struct RoleVoucher {
        /// @notice Address of the redeemer
        address redeemer;
        /// @notice The date until the voucher is valid
        uint256 validUntil;
        /// @notice 0 validator, 1 juror, 2 corporate, 3 super validator
        uint256 roleId;
        /// @notice the EIP-712 signature of all other fields in the RoleVoucher struct.
        bytes signature;
    }

    /// @notice allows users to apply for validator role
    function applyForValidator() external whenNotPaused {
        //make sure redeemer is kyced and not banned
        require(IRM.isKYCed(msg.sender), "You are not KYCed");
        require(!IRM.isBanned(msg.sender), "You were banned");
        require(
            udaovp.balanceOf(msg.sender) > 0,
            "You have to be governance member to apply"
        );
        require(
            !IRM.hasRole(SUPER_VALIDATOR_ROLE, msg.sender),
            "Address is a Super Validator"
        );
        require(
            !IRM.hasRole(VALIDATOR_ROLE, msg.sender),
            "Address is already a Validator"
        );
        require(
            !activeApplicationForValidator[msg.sender],
            "You already have an active application"
        );
        ValidationApplication
            storage validationApplication = validatorApplications.push();
        validationApplication.applicant = msg.sender;
        validationApplication.expire = block.timestamp + validatorLockTime;
        validatorApplicationId[msg.sender] = validationApplicationIndex;
        validationApplicationIndex++;
        validationBalanceOf[msg.sender] += validatorLockAmount;
        activeApplicationForValidator[msg.sender] = true;
        udao.transferFrom(msg.sender, address(this), validatorLockAmount);
        emit RoleApplied(0, msg.sender, validatorLockAmount);
    }

    /// @notice Allows validators to apply for super validator role
    function applyForSuperValidator() external whenNotPaused {
        //make sure redeemer is kyced and not banned
        require(IRM.isKYCed(msg.sender), "You are not KYCed");
        require(!IRM.isBanned(msg.sender), "You were banned");
        /// TODO super validator requirementlari ekle
        require(
            udaovp.balanceOf(msg.sender) > 0,
            "You have to be governance member to apply"
        );
        require(
            IRM.hasRole(VALIDATOR_ROLE, msg.sender),
            "Address should be a Validator"
        );
        require(
            !IRM.hasRole(SUPER_VALIDATOR_ROLE, msg.sender),
            "Address is a Super Validator"
        );
        require(
            !activeApplicationForValidator[msg.sender],
            "You already have an active application"
        );

        ValidationApplication
            storage validationApplication = validatorApplications.push();
        validationApplication.applicant = msg.sender;
        validatorApplicationId[msg.sender] = validationApplicationIndex;
        validationApplicationIndex++;

        activeApplicationForValidator[msg.sender] = true;
        emit RoleApplied(3, msg.sender, 0);
    }

    /// @notice allows users to apply for juror role
    function applyForJuror() external whenNotPaused {
        //make sure redeemer is kyced and not banned
        require(IRM.isKYCed(msg.sender), "You are not KYCed");
        require(!IRM.isBanned(msg.sender), "You were banned");
        require(
            udaovp.balanceOf(msg.sender) > 0,
            "You have to be governance member to apply"
        );
        require(
            !IRM.hasRole(JUROR_ROLE, msg.sender),
            "Address is already a Juror"
        );

        JurorApplication storage jurorApplication = jurorApplications.push();
        jurorApplication.applicant = msg.sender;
        jurorApplicationId[msg.sender] = caseApplicationIndex;
        jurorApplication.expire = block.timestamp + jurorLockTime;
        caseApplicationIndex++;
        jurorBalanceOf[msg.sender] += jurorLockAmount;
        activeApplicationForJuror[msg.sender] = true;
        udao.transferFrom(msg.sender, address(this), jurorLockAmount);

        emit RoleApplied(1, msg.sender, jurorLockAmount);
    }

    /// @notice Users can use this function and assign validator or juror roles to themselves
    function getApproved(RoleVoucher calldata voucher) external whenNotPaused {
        //make sure redeemer is kyced and not banned
        require(IRM.isKYCed(msg.sender), "You are not KYCed");
        require(!IRM.isBanned(msg.sender), "You were banned");
        // make sure redeemer is redeeming
        require(voucher.redeemer == msg.sender, "You are not the redeemer");
        //make sure redeemer is kyced
        require(IRM.isKYCed(msg.sender), "You are not KYCed");
        // make sure signature is valid and get the address of the signer
        address signer = _verifyRole(voucher);
        require(voucher.validUntil >= block.timestamp, "Voucher has expired.");
        require(
            IRM.hasRole(BACKEND_ROLE, signer),
            "Signature invalid or unauthorized"
        );

        uint256 roleId = voucher.roleId;

        if (roleId == 0) {
            ValidationApplication
                storage validationApplication = validatorApplications[
                    validatorApplicationId[voucher.redeemer]
                ];

            IRM.grantRoleStaker(VALIDATOR_ROLE, voucher.redeemer);
            activeApplicationForValidator[voucher.redeemer] = false;
            validationApplication.isFinished = true;
        } else if (roleId == 1) {
            require(
                udaovp.balanceOf(voucher.redeemer) > 0,
                "You are not governance member"
            );

            JurorApplication storage jurorApplication = jurorApplications[
                jurorApplicationId[voucher.redeemer]
            ];

            IRM.grantRoleStaker(JUROR_ROLE, voucher.redeemer);
            activeApplicationForJuror[voucher.redeemer] = false;
            jurorApplication.isFinished = true;
        } else if (roleId == 2) {
            IRM.grantRoleStaker(CORPORATE_ROLE, voucher.redeemer);
        } else if (roleId == 3) {
            ValidationApplication
                storage validationApplication = validatorApplications[
                    validatorApplicationId[voucher.redeemer]
                ];

            IRM.grantRoleStaker(SUPER_VALIDATOR_ROLE, voucher.redeemer);
            activeApplicationForValidator[voucher.redeemer] = false;
            validationApplication.isFinished = true;
        } else {
            revert("Undefined role ID!");
        }

        emit RoleApproved(roleId, msg.sender);
    }

    /// @notice Allows backend to reject role assignment application
    /// @param _applicant The address of the applicant
    function rejectApplication(
        address _applicant,
        uint256 roleId
    ) external onlyRole(BACKEND_ROLE) {
        if (roleId == 0 || roleId == 3) {
            ValidationApplication
                storage validationApplication = validatorApplications[
                    validatorApplicationId[_applicant]
                ];
            validationApplication.expire = 0;
            validationApplication.isFinished = true;
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

    /**
     * @notice allows validators to withdraw their staked tokens
     */
    function withdrawValidatorStake() public whenNotPaused {
        uint256 withdrawableBalance;
        ValidationApplication
            storage validationApplication = validatorApplications[
                validatorApplicationId[msg.sender]
            ];

        if (IRM.hasRole(VALIDATOR_ROLE, msg.sender)) {
            if (
                validationApplication.isFinished &&
                validationApplication.expire < block.timestamp
            ) {
                IRM.revokeRoleStaker(VALIDATOR_ROLE, msg.sender);
                withdrawableBalance = validationBalanceOf[msg.sender];
                validationBalanceOf[msg.sender] = 0;
            }
        } else {
            // If application got rejected
            if (validationApplication.isFinished) {
                withdrawableBalance = validationBalanceOf[msg.sender];
                validationBalanceOf[msg.sender] = 0;
            }
        }
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

        if (IRM.hasRole(JUROR_ROLE, msg.sender)) {
            if (
                jurorApplication.isFinished &&
                jurorApplication.expire < block.timestamp
            ) {
                IRM.revokeRoleStaker(JUROR_ROLE, msg.sender);
                withdrawableBalance = jurorBalanceOf[msg.sender];
                jurorBalanceOf[msg.sender] = 0;
            }
        } else {
            // If application got rejected
            if (jurorApplication.isFinished) {
                withdrawableBalance = jurorBalanceOf[msg.sender];
                jurorBalanceOf[msg.sender] = 0;
            }
        }
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
        ValidationApplication
            storage validationApplication = validatorApplications[
                validatorApplicationId[msg.sender]
            ];

        if (IRM.hasRole(VALIDATOR_ROLE, msg.sender)) {
            if (
                validationApplication.isFinished &&
                validationApplication.expire < block.timestamp
            ) {
                withdrawableBalance = validationBalanceOf[msg.sender];
            }
        } else {
            // If application got rejected
            if (validationApplication.isFinished) {
                withdrawableBalance = validationBalanceOf[msg.sender];
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
        require(IRM.isKYCed(msg.sender), "Address is not KYCed");
        require(!IRM.isBanned(msg.sender), "Address is banned");
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

    /**
     * @notice add vote reward to voters reward count
     * @param voter address of the voter
     */
    function addVoteRewards(
        address voter
    ) external whenNotPaused onlyRole(GOVERNANCE_CONTRACT) {
        require(udaovp.balanceOf(voter) > 0, "Voter has no voting power");
        uint256 votingPowerRatio = (udaovp.balanceOf(voter) * 10000) /
            totalVotingPower;

        rewardBalanceOf[voter] += (votingPowerRatio * voteReward) / 10000;
        emit VoteRewardAdded(voter, (votingPowerRatio * voteReward) / 10000);
    }

    /**
     * @notice withdraws reward earned from voting
     */
    function withdrawRewards() external whenNotPaused {
        require(
            rewardBalanceOf[msg.sender] > 0,
            "You don't have any reward balance"
        );
        uint256 voteRewards = rewardBalanceOf[msg.sender];
        rewardBalanceOf[msg.sender] = 0;
        IPlatformTreasury(platformTreasuryAddress).transferGovernanceRewards(
            msg.sender,
            voteRewards
        );
        emit VoteRewardsWithdrawn(msg.sender, voteRewards);
    }

    mapping(address => mapping(uint => uint)) corporateListingId;
    mapping(address => uint) corporateLatestListingId;

    function registerJobListing(
        uint jobListingCount
    ) external onlyRole(CORPORATE_ROLE) {
        //make sure juror is kyced and not banned
        require(IRM.isKYCed(msg.sender), "You are not KYCed");
        require(!IRM.isBanned(msg.sender), "You were banned");
        require(jobListingCount > 0,
            "Zero job listing count is not allowed"
        );
        udao.transferFrom(
            msg.sender,
            address(this),
            jobListingCount * corporateStakePerListing
        );
        for (uint i = 0; i < jobListingCount; i++) {
            corporateListingId[msg.sender][
                corporateLatestListingId[msg.sender]
            ] = corporateStakePerListing;
            corporateLatestListingId[msg.sender]++;
        }
        emit JobListingRegistered(
            msg.sender,
            jobListingCount * corporateStakePerListing
        );
    }

    function unregisterJobListing(
        uint[] calldata listingIds
    ) external onlyRole(CORPORATE_ROLE) {
        uint totalUnstakeAmount;
        for (uint i = 0; i < listingIds.length; i++) {
            totalUnstakeAmount += corporateListingId[msg.sender][listingIds[i]];
            corporateListingId[msg.sender][listingIds[i]] = 0;
        }
        require(totalUnstakeAmount > 0, "Cannot unstake zero tokens");
        udao.transfer(msg.sender, totalUnstakeAmount);
        emit JobListingUnregistered(msg.sender, listingIds, totalUnstakeAmount);
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
}
