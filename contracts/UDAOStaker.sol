// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import "@openzeppelin/contracts/governance/utils/IVotes.sol";
import "@openzeppelin/contracts/governance/IGovernor.sol";
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
    IGovernor public igovernor;
    address platformTreasuryAddress;

    uint public payablePerValidation;
    /// @notice the required duration to be a validator
    uint public validatorLockTime = 90 days;
    /// @notice the required duration to be a super validator
    uint public superValidatorLockTime = 180 days;
    /// @notice Amount to deduct from super validator application
    uint superValidatorLockAmount = 1000 ether;

    struct StakeLock {
        uint256 validationAmount;
        uint256 amount;
    }

    struct ValidationLock {
        uint256 validationDate;
        uint256 lockAmountForValidation;
    }

    mapping(address => StakeLock) validatorLock;
    mapping(address => StakeLock) superValidatorLock;
    mapping(address => ValidationLock[]) validationLocks;

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
        uint256 expire;
        address applicant;
        bool isSuper;
        bool isFinished;
    }

    ValidationApplication[] public validatorApplications;
    mapping(address => uint) validatorApplicationId;
    uint private applicationIndex;

    constructor(
        address udaovpAddress,
        address udaoAddress,
        address governorAddress,
        address _platformTreasuryAddress,
        address irmAddress
    ) EIP712(SIGNING_DOMAIN, SIGNATURE_VERSION) RoleController(irmAddress) {
        udao = IERC20(udaoAddress);
        udaovp = IUDAOVP(udaovpAddress);
        igovernor = IGovernor(governorAddress);
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
            !irm.hasRole(SUPER_VALIDATOR_ROLE, msg.sender),
            "Address is a Super Validator"
        );
        require(
            !irm.hasRole(VALIDATOR_ROLE, msg.sender),
            "Address is already a Validator"
        );
        uint tokenToExtract = payablePerValidation * validationAmount;

        udao.transferFrom(msg.sender, address(this), tokenToExtract);

        StakeLock storage userInfo = validatorLock[msg.sender];
        userInfo.amount += tokenToExtract;
        userInfo.validationAmount += validationAmount;

        ValidationApplication
            storage validationApplication = validatorApplications.push();
        validationApplication.applicant = msg.sender;
        validationApplication.expire = block.timestamp + validatorLockTime;
        validatorApplicationId[msg.sender] = applicationIndex;
        applicationIndex++;
    }

    function applyForSuperValidator() external {
        require(
            !irm.hasRole(SUPER_VALIDATOR_ROLE, msg.sender),
            "Address is a Super Validator"
        );
        require(
            irm.hasRole(VALIDATOR_ROLE, msg.sender),
            "Address should be a Validator"
        );

        udao.transferFrom(msg.sender, address(this), superValidatorLockAmount);

        StakeLock storage userInfo = superValidatorLock[msg.sender];
        userInfo.amount = superValidatorLockAmount;
        userInfo.validationAmount = 2**256 - 1;
        ValidationApplication
            storage validationApplication = validatorApplications.push();
        validationApplication.applicant = msg.sender;
        validationApplication.expire = block.timestamp + superValidatorLockTime;
        validationApplication.isSuper = true;
        validatorApplicationId[msg.sender] = applicationIndex;
        applicationIndex++;
    }

    function addMoreValidation(uint validationAmount)
        external
        onlyRole(VALIDATOR_ROLE)
    {
        require(
            !irm.hasRole(SUPER_VALIDATOR_ROLE, msg.sender),
            "Address is a Super Validator"
        );
        uint tokenToExtract = payablePerValidation * validationAmount;

        udao.transferFrom(msg.sender, address(this), tokenToExtract);

        StakeLock storage userInfo = validatorLock[msg.sender];
        userInfo.amount += tokenToExtract;
        userInfo.validationAmount += validationAmount;
    }

    function registerValidation() external onlyRole(VALIDATION_MANAGER) {
        require(
            validationLocks[_msgSender()].length <
                validatorLock[_msgSender()].validationAmount
        );
        ValidationLock storage lock = validationLocks[_msgSender()].push();
        lock.validationDate = block.timestamp;
        lock.lockAmountForValidation = payablePerValidation;
    }

    function getRole(RoleVoucher calldata voucher) external {
        // make sure redeemer is redeeming
        require(voucher.redeemer == msg.sender, "You are not the redeemer");
        //make sure redeemer is kyced
        require(irm.getKYC(msg.sender), "You are not KYCed");
        // make sure signature is valid and get the address of the signer
        address signer = _verify(voucher);
        require(
            irm.hasRole(BACKEND_ROLE, signer),
            "Signature invalid or unauthorized"
        );

        ValidationApplication
            storage validationApplication = validatorApplications[
                validatorApplicationId[voucher.redeemer]
            ];
        if (validationApplication.isSuper) {
            irm.grantRole(SUPER_VALIDATOR_ROLE, voucher.redeemer);
            StakeLock storage userInfo = validatorLock[msg.sender];
            userInfo = superValidatorLock[msg.sender];
            delete superValidatorLock[msg.sender];
        } else {
            irm.grantRole(VALIDATOR_ROLE, voucher.redeemer);
            validationApplication.expire = 0;
        }
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
        if (validationApplication.isSuper) {
            StakeLock storage userInfo = validatorLock[msg.sender];
            userInfo = superValidatorLock[msg.sender];
            userInfo.validationAmount = 0;
            delete superValidatorLock[msg.sender];
        }
        validationApplication.expire = 0;
        validationApplication.isFinished = true;
    }

    /// @notice allows validators to withdraw their staked tokens
    function withdrawValidatorStake() public {
        uint withdrawableBalance;
        StakeLock storage lock = validatorLock[msg.sender];
        if (irm.hasRole(VALIDATOR_ROLE, msg.sender)) {
            uint lockedAmount;
            for (int i; uint(i) < validationLocks[msg.sender].length; i++) {
                ValidationLock storage validationLock = validationLocks[
                    msg.sender
                ][uint(i)];
                if (
                    block.timestamp >=
                    (validationLock.validationDate + validatorLockTime)
                ) {
                    validationLocks[msg.sender][uint(i)] = validationLocks[
                        msg.sender
                    ][validationLocks[msg.sender].length - 1];
                    validationLocks[msg.sender].pop();
                    i--;
                } else {
                    lockedAmount += validationLock.lockAmountForValidation;
                }
            }
            withdrawableBalance = lock.amount - lockedAmount;
        } else if (irm.hasRole(SUPER_VALIDATOR_ROLE, msg.sender)) {
            ValidationApplication
                storage validationApplication = validatorApplications[
                    validatorApplicationId[msg.sender]
                ];
            if (validationApplication.expire < block.timestamp) {
                delete validatorApplications[
                    validatorApplicationId[msg.sender]
                ];
                withdrawableBalance = lock.amount;
            }
        } else {
            ValidationApplication
                storage validationApplication = validatorApplications[
                    validatorApplicationId[msg.sender]
                ];
            if (validationApplication.isFinished) {
                delete validatorApplications[
                    validatorApplicationId[msg.sender]
                ];
                withdrawableBalance = lock.amount;
            }
        }
        require(withdrawableBalance > 0, "You don't have withdrawable token");
        udao.transfer(msg.sender, withdrawableBalance);
    }

    function withdrawableValidatorStake() public view returns (uint) {
        uint withdrawableBalance;
        StakeLock storage lock = validatorLock[msg.sender];
        if (irm.hasRole(VALIDATOR_ROLE, msg.sender)) {
            uint lockedAmount;
            for (int i; uint(i) < validationLocks[msg.sender].length; i++) {
                ValidationLock storage validationLock = validationLocks[
                    msg.sender
                ][uint(i)];
                if (
                    block.timestamp <
                    (validationLock.validationDate + validatorLockTime)
                ) {
                    lockedAmount += validationLock.lockAmountForValidation;
                }
            }
            withdrawableBalance = lock.amount - lockedAmount;
        } else if (irm.hasRole(SUPER_VALIDATOR_ROLE, msg.sender)) {
            ValidationApplication
                storage validationApplication = validatorApplications[
                    validatorApplicationId[msg.sender]
                ];
            if (validationApplication.expire < block.timestamp) {
                withdrawableBalance = lock.amount;
            }
        } else {
            ValidationApplication
                storage validationApplication = validatorApplications[
                    validatorApplicationId[msg.sender]
                ];
            if (validationApplication.isFinished) {
                withdrawableBalance = lock.amount;
            }
        }
        return withdrawableBalance;
    }

    function stakeForGovernance(uint _amount, uint _days) public {
        require(_amount > 0, "Stake amount can't be 0");
        require(_days >= 7, "Minimum lock duration is 7 days");
        require(irm.getKYC(msg.sender), "Address is not KYCed");
        require(!irm.getBan(msg.sender), "Address is banned");
        udao.transferFrom(msg.sender, address(this), _amount);

        GovernanceLock storage lock = governanceStakes[msg.sender].push();
        lock.amount = _amount;
        lock.expire = block.timestamp + (_days * (1 days));
        lock.vpamount = _amount * _days;

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

    function addProposalRewards(uint _amount, address proposer)
        external
        onlyRole(GOVERNANCE_ROLE)
    {
        rewardBalanceOf[proposer] += _amount;
    }

    function withdrawRewards() external {
        uint voteRewards = rewardableAmountFromVotes();
        lastRewardBlock[msg.sender] = block.number;
        uint reward = rewardBalanceOf[msg.sender] + voteRewards;
        rewardBalanceOf[msg.sender] = 0;
        udao.transferFrom(platformTreasuryAddress, msg.sender, reward);
    }

    function rewardableAmountFromVotes() public view returns (uint) {
        uint totalVotes = udaovp.getPastVotes(msg.sender, block.number);
        uint latestVotes = udaovp.getPastVotes(
            msg.sender,
            lastRewardBlock[msg.sender]
        );
        uint reward = (totalVotes - latestVotes) * voteReward;
        return reward;
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
