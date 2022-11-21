// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import "@openzeppelin/contracts/governance/utils/IVotes.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/draft-EIP712.sol";
import "./RoleController.sol";

interface IUDAOVP is IVotes, IERC20 {}

contract UDAOStaker is RoleController, EIP712 {
    string private constant SIGNING_DOMAIN = "UDAOStaker";
    string private constant SIGNATURE_VERSION = "1";

    IERC20 public udao;
    IUDAOVP public udaovp;
    address platformTreasuryAddress;

    uint public payablePerValidation;
    /// @notice the required duration to be a validator
    uint public validatorLockTime = 90 days;
    /// @notice the required duration to be a super validator
    uint public superValidatorLockTime = 180 days;
    /// @notice Amount to deduct from super validator application
    uint superValidatorLockAmount = 150 ether;

    struct StakeLock {
        uint256 maxValidationAmount;
        uint256 doneValidationAmount;
        uint256 amountPerValidation;
        uint256 expire;
    }

    struct ValidationLock {
        uint128 id;
        uint128 tokenId;
        uint128 lockAmount;
        uint256 validationDate;
        uint256 expireDate;
    }

    mapping(address => uint) validationBalanceOf;
    mapping(address => StakeLock[]) validatorLock;
    mapping(address => ValidationLock[]) validationLocks;
    mapping(address => uint) latestStakeId;
    mapping(address => uint) latestValidationLockId;

    struct GovernanceLock {
        uint256 expire;
        uint256 amount;
        uint256 vpamount;
    }

    mapping(address => GovernanceLock[]) governanceStakes;
    mapping(address => uint) rewardBalanceOf;
    mapping(address => uint) lastRewardBlock;
    uint public voteReward;

    struct ValidationApplication {
        address applicant;
        bool isSuper;
        bool isFinished;
        uint256 maxValidationAmount;
        uint256 amountPerValidation;
        uint256 expire;
    }

    ValidationApplication[] public validatorApplications;
    mapping(address => uint) validatorApplicationId;
    uint private applicationIndex;

    uint public totalVotingPower;

    constructor(
        address udaovpAddress,
        address udaoAddress,
        address _platformTreasuryAddress,
        address irmAddress
    ) EIP712(SIGNING_DOMAIN, SIGNATURE_VERSION) RoleController(irmAddress) {
        udao = IERC20(udaoAddress);
        udaovp = IUDAOVP(udaovpAddress);
        platformTreasuryAddress = _platformTreasuryAddress;
    }

    function setSuperValidatorLockAmount(uint _amount)
        external
        onlyRoles(administrator_roles)
    {
        superValidatorLockAmount = _amount;
    }

    function setVoteReward(uint _reward)
        external
        onlyRoles(administrator_roles)
    {
        voteReward = _reward;
    }

    function setPlatformTreasuryAddress(address _platformTreasuryAddress)
        external
        onlyRoles(administrator_roles)
    {
        platformTreasuryAddress = _platformTreasuryAddress;
    }

    /// @notice Represents the right to get a role
    struct RoleVoucher {
        /// @notice Address of the redeemer
        address redeemer;
        /// @notice the EIP-712 signature of all other fields in the ContentVoucher struct.
        bytes signature;
    }

    /// @notice allows users to apply for validator role
    /// @param validationAmount The amount of validations that a validator wants to do
    function applyForValidator(uint validationAmount) external {
        require(
            !IRM.hasRole(SUPER_VALIDATOR_ROLE, msg.sender),
            "Address is a Super Validator"
        );
        require(
            !IRM.hasRole(VALIDATOR_ROLE, msg.sender),
            "Address is already a Validator"
        );
        uint tokenToExtract = payablePerValidation * validationAmount;

        ValidationApplication
            storage validationApplication = validatorApplications.push();
        validationApplication.applicant = msg.sender;
        validatorApplicationId[msg.sender] = applicationIndex;
        validationApplication.amountPerValidation += payablePerValidation;
        validationApplication.maxValidationAmount += validationAmount;
        validationApplication.expire = block.timestamp + validatorLockTime;
        applicationIndex++;
        validationBalanceOf[msg.sender] += tokenToExtract;
        udao.transferFrom(msg.sender, address(this), tokenToExtract);
    }

    function applyForSuperValidator() external {
        require(
            !IRM.hasRole(SUPER_VALIDATOR_ROLE, msg.sender),
            "Address is a Super Validator"
        );
        require(
            IRM.hasRole(VALIDATOR_ROLE, msg.sender),
            "Address should be a Validator"
        );

        ValidationApplication
            storage validationApplication = validatorApplications.push();
        validationApplication.applicant = msg.sender;
        validationApplication.isSuper = true;
        validatorApplicationId[msg.sender] = applicationIndex;
        applicationIndex++;
        validationApplication.amountPerValidation = superValidatorLockAmount;
        validationApplication.maxValidationAmount = 2**256 - 1;
        validationApplication.expire = block.timestamp + superValidatorLockTime;
        validationBalanceOf[msg.sender] += superValidatorLockAmount;
        udao.transferFrom(msg.sender, address(this), superValidatorLockAmount);
    }

    function addMoreValidation(uint validationAmount)
        external
        onlyRole(VALIDATOR_ROLE)
    {
        require(
            !IRM.hasRole(SUPER_VALIDATOR_ROLE, msg.sender),
            "Address is a Super Validator"
        );
        uint tokenToExtract = payablePerValidation * validationAmount;

        udao.transferFrom(msg.sender, address(this), tokenToExtract);

        StakeLock storage userInfo = validatorLock[msg.sender].push();
        userInfo.amountPerValidation = tokenToExtract;
        userInfo.maxValidationAmount = validationAmount;
        userInfo.expire = block.timestamp + validatorLockTime;
    }

    function registerValidation() external onlyRole(VALIDATION_MANAGER) {
        for (
            int i = int(latestStakeId[_msgSender()]);
            uint(i) < validatorLock[_msgSender()].length;
            i++
        ) {
            StakeLock storage stakeLock = validatorLock[_msgSender()][uint(i)];
            if (
                stakeLock.doneValidationAmount < stakeLock.maxValidationAmount
            ) {
                ValidationLock storage lock = validationLocks[_msgSender()]
                    .push();
                lock.expireDate = block.timestamp + validatorLockTime;
                lock.validationDate = block.timestamp;
                lock.lockAmount = uint128(payablePerValidation);
                stakeLock.doneValidationAmount++;
                latestStakeId[_msgSender()] = uint(i);
                return;
            }
        }
        revert("You don't have empty validation slots");
    }

    function getApproved(RoleVoucher calldata voucher) external {
        // make sure redeemer is redeeming
        require(voucher.redeemer == msg.sender, "You are not the redeemer");
        //make sure redeemer is kyced
        require(IRM.isKYCed(msg.sender), "You are not KYCed");
        // make sure signature is valid and get the address of the signer
        address signer = _verify(voucher);
        require(
            IRM.hasRole(BACKEND_ROLE, signer),
            "Signature invalid or unauthorized"
        );

        ValidationApplication
            storage validationApplication = validatorApplications[
                validatorApplicationId[voucher.redeemer]
            ];
        StakeLock storage userInfo = validatorLock[msg.sender].push();

        if (validationApplication.isSuper) {
            IRM.grantRole(SUPER_VALIDATOR_ROLE, voucher.redeemer);
            userInfo.expire = block.timestamp + superValidatorLockTime;
        } else {
            IRM.grantRole(VALIDATOR_ROLE, voucher.redeemer);

            userInfo.expire = block.timestamp + validatorLockTime;
        }
        userInfo.amountPerValidation = validationApplication
            .amountPerValidation;
        userInfo.maxValidationAmount = validationApplication
            .maxValidationAmount;
        validationApplication.isFinished = true;
    }

    function rejectApplication(address _applicant)
        external
        onlyRole(BACKEND_ROLE)
    {
        ValidationApplication
            storage validationApplication = validatorApplications[
                validatorApplicationId[_applicant]
            ];
        validationApplication.expire = 0;
        validationApplication.isFinished = true;
    }

    /// @notice allows validators to withdraw their staked tokens
    function withdrawValidatorStake() public {
        uint withdrawableBalance;
        uint validatorLockLength = validatorLock[msg.sender].length;
        ValidationApplication
            storage validationApplication = validatorApplications[
                validatorApplicationId[msg.sender]
            ];

        if (IRM.hasRole(VALIDATOR_ROLE, msg.sender)) {
            for (int j; uint(j) < validatorLockLength; j++) {
                StakeLock storage lock = validatorLock[msg.sender][uint(j)];
                if (lock.expire < block.timestamp) {
                    withdrawableBalance +=
                        lock.amountPerValidation *
                        (lock.maxValidationAmount - lock.doneValidationAmount);
                }
            }
            for (int i; uint(i) < validationLocks[msg.sender].length; i++) {
                ValidationLock storage validationLock = validationLocks[
                    msg.sender
                ][uint(i)];
                if (block.timestamp >= (validationLock.expireDate)) {
                    withdrawableBalance += validationLock.lockAmount;
                    validationLocks[msg.sender][uint(i)] = validationLocks[
                        msg.sender
                    ][validationLocks[msg.sender].length - 1];
                    validationLocks[msg.sender].pop();
                    i--;
                }
            }
        } else if (IRM.hasRole(SUPER_VALIDATOR_ROLE, msg.sender)) {
            for (int j; uint(j) < validatorLockLength; j++) {
                StakeLock storage lock = validatorLock[msg.sender][uint(j)];
                if (lock.expire < block.timestamp) {
                    withdrawableBalance +=
                        lock.amountPerValidation *
                        (lock.maxValidationAmount - lock.doneValidationAmount);
                }
            }
        } else {
            if (validationApplication.isFinished) {
                withdrawableBalance = validationBalanceOf[msg.sender];
            }
        }
        require(withdrawableBalance > 0, "You don't have withdrawable token");
        require(
            withdrawableBalance < validationBalanceOf[msg.sender],
            "You don't have enough balance"
        );
        udao.transfer(msg.sender, withdrawableBalance);
    }

    function withdrawableValidatorStake() public view returns (uint) {
        uint withdrawableBalance;
        uint validatorLockLength = validatorLock[msg.sender].length;
        uint validationLockLength = validationLocks[msg.sender].length;
        ValidationApplication
            storage validationApplication = validatorApplications[
                validatorApplicationId[msg.sender]
            ];

        if (IRM.hasRole(VALIDATOR_ROLE, msg.sender)) {
            for (int j; uint(j) < validatorLockLength; j++) {
                StakeLock storage lock = validatorLock[msg.sender][uint(j)];
                if (lock.expire < block.timestamp) {
                    withdrawableBalance +=
                        lock.amountPerValidation *
                        (lock.maxValidationAmount - lock.doneValidationAmount);
                }
            }
            for (int i; uint(i) < validationLockLength; i++) {
                ValidationLock storage validationLock = validationLocks[
                    msg.sender
                ][uint(i)];
                if (block.timestamp >= (validationLock.expireDate)) {
                    withdrawableBalance += validationLock.lockAmount;
                }
            }
        } else if (IRM.hasRole(SUPER_VALIDATOR_ROLE, msg.sender)) {
            for (int j; uint(j) < validatorLockLength; j++) {
                StakeLock storage lock = validatorLock[msg.sender][uint(j)];
                if (lock.expire < block.timestamp) {
                    withdrawableBalance +=
                        lock.amountPerValidation *
                        (lock.maxValidationAmount - lock.doneValidationAmount);
                }
            }
        } else {
            if (validationApplication.isFinished) {
                withdrawableBalance = validationBalanceOf[msg.sender];
            }
        }
        return withdrawableBalance;
    }

    function stakeForGovernance(uint _amount, uint _days) public {
        require(_amount > 0, "Stake amount can't be 0");
        require(_days >= 7, "Minimum lock duration is 7 days");
        require(IRM.isKYCed(msg.sender), "Address is not KYCed");
        require(!IRM.isBanned(msg.sender), "Address is banned");
        udao.transferFrom(msg.sender, address(this), _amount);

        GovernanceLock storage lock = governanceStakes[msg.sender].push();
        lock.amount = _amount;
        lock.expire = block.timestamp + (_days * (1 days));
        lock.vpamount = _amount * _days;
        totalVotingPower += lock.vpamount;
        udaovp.transfer(msg.sender, lock.vpamount);
    }

    function withdrawGovernanceStake(uint _amount) public {
        require(_amount > 0, "Stake amount can't be 0");
        uint withdrawableBalance;
        uint vpBalance;
        uint stakingsLength = governanceStakes[msg.sender].length;
        for (int i = 0; uint(i) < stakingsLength; i++) {
            GovernanceLock storage lock = governanceStakes[msg.sender][uint(i)];
            if (block.timestamp >= lock.expire) {
                if (_amount < (withdrawableBalance + lock.amount)) {
                    uint vpFromLatest = ((lock.vpamount *
                        (((_amount - withdrawableBalance) * 100) /
                            lock.amount)) / 100);
                    uint udaoFromLatest = lock.amount -
                        (_amount - withdrawableBalance);
                    lock.amount -= udaoFromLatest;
                    lock.vpamount -= vpFromLatest;
                    vpBalance += vpFromLatest;
                    totalVotingPower -= vpBalance;
                    udaovp.transferFrom(msg.sender, address(0x0), vpBalance);
                    udao.transfer(msg.sender, _amount);
                }
                withdrawableBalance += lock.amount;
                vpBalance += lock.vpamount;
                governanceStakes[msg.sender][uint(i)] = governanceStakes[
                    msg.sender
                ][governanceStakes[msg.sender].length - 1];
                governanceStakes[msg.sender].pop();
                i--;
            }
        }
    }

    function addVoteRewards(address voter) external onlyRole(GOVERNANCE_ROLE) {
        uint votingPowerRatio = (udaovp.balanceOf(voter) * 10000) /
            totalVotingPower;
        rewardBalanceOf[voter] += votingPowerRatio * voteReward;
    }

    function withdrawRewards() external {
        require(
            rewardBalanceOf[msg.sender] > 0,
            "You don't have any reward balance"
        );
        uint voteRewards = rewardBalanceOf[msg.sender];
        rewardBalanceOf[msg.sender] = 0;
        udao.transferFrom(platformTreasuryAddress, msg.sender, voteRewards);
    }

    /// @notice Returns a hash of the given ContentVoucher, prepared using EIP712 typed data hashing rules.
    /// @param voucher A ContentVoucher to hash.
    function _hash(RoleVoucher calldata voucher)
        internal
        view
        returns (bytes32)
    {
        return
            _hashTypedDataV4(
                keccak256(
                    abi.encode(
                        keccak256("UDAOStaker(address redeemer)"),
                        voucher.redeemer
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
    function _verify(RoleVoucher calldata voucher)
        internal
        view
        returns (address)
    {
        bytes32 digest = _hash(voucher);
        return ECDSA.recover(digest, voucher.signature);
    }
}
