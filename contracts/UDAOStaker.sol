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

    uint256 public payablePerValidation;
    uint256 public payablePerCase;
    /// @notice the required duration to be a validator
    uint256 public jurorLockTime = 30 days;
    /// @notice the required duration for listing a job
    uint256 public corporateLockTime = 30 days;
    /// @notice the required duration to be a validator
    uint256 public validatorLockTime = 90 days;
    /// @notice the required duration to be a super validator
    uint256 public superValidatorLockTime = 180 days;
    /// @notice Amount to deduct from super validator application
    uint256 superValidatorLockAmount = 150 ether;

    event SetSuperValidatorLockAmount(uint256 _newAmount);
    event SetVoteReward(uint256 _newAmount);
    event SetPlatformTreasuryAddress(address _newAddress);
    event RoleApplied(uint256 _roleId, address _user, uint256 _jobAmount);
    event RoleApproved(uint256 _roleId, address _user);
    event RoleRejected(uint256 _roleId, address _user);
    event ValidationAdded(uint256 _amount);
    event CaseAdded(uint256 _amount);
    event ValidationRegistered(address _validator, uint256 _validationId);
    event CaseRegistered(address _juror, uint256 _caseId);
    event ValidatorStakeWithdrawn(address _validator, uint256 _amount);

    // @TODO Juror staking eklendiğinde kullanılacak

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

    event StakeForJobListing(
        address corporateAddress,
        uint256 amount,
        uint256 stakePerListing
    );

    event UnstakeForJobListing(address corporateAddress, uint256 amount);

    struct ValidatorStakeLock {
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
    
    struct CorporateStakeLock {
        uint256 lockAmount;
        uint256 expire;
    }

    struct JurorStakeLock {
        uint256 maxCaseAmount;
        uint256 doneCaseAmount;
        uint256 amountPerCase;
        uint256 expire;
    }

    struct CaseLock {
        uint128 id;
        uint128 caseId;
        uint128 lockAmount;
        uint256 validationDate;
        uint256 expireDate;
    }

    mapping(address => uint256) validationBalanceOf;
    mapping(address => uint256) jurorBalanceOf;
    mapping(address => ValidatorStakeLock[]) validatorLock;
    mapping(address => ValidationLock[]) validationLocks;
    mapping(address => JurorStakeLock[]) jurorLocks;
    mapping(address => CaseLock[]) caseLocks;
    mapping(address => uint256) latestValidatorStakeId;
    mapping(address => uint256) latestJurorStakeId;
    mapping(address => uint256) latestValidationLockId;

    uint256 public corporateStakePerListing = 500 ether; //setter getter, decider=adminler
    mapping(address => CorporateStakeLock[]) corporateLocks;

    struct GovernanceLock {
        uint256 expire;
        uint256 amount;
        uint256 vpamount;
    }

    mapping(address => GovernanceLock[]) governanceStakes;
    mapping(address => uint256) rewardBalanceOf;
    mapping(address => uint256) lastRewardBlock;
    uint256 public voteReward;

    struct ValidationApplication {
        address applicant;
        bool isSuper;
        bool isFinished;
        uint256 maxValidationAmount;
        uint256 amountPerValidation;
        uint256 expire;
    }

    ValidationApplication[] public validatorApplications;
    mapping(address => uint256) validatorApplicationId;
    uint256 private validationApplicationIndex;

    struct JurorApplication {
        address applicant;
        bool isFinished;
        uint256 maxCaseAmount;
        uint256 amountPerCase;
        uint256 expire;
    }

    JurorApplication[] public jurorApplications;
    mapping(address => uint256) jurorApplicationId;
    uint256 private caseApplicationIndex;

    uint256 public totalVotingPower;

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

    function setSuperValidatorLockAmount(uint256 _amount)
        external
        onlyRoles(administrator_roles)
    {
        superValidatorLockAmount = _amount;
        emit SetSuperValidatorLockAmount(_amount);
    }

    function setVoteReward(uint256 _reward)
        external
        onlyRoles(administrator_roles)
    {
        voteReward = _reward;
        emit SetVoteReward(_reward);
    }

    function setPlatformTreasuryAddress(address _platformTreasuryAddress)
        external
        onlyRoles(administrator_roles)
    {
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

    /// @notice Validation work registered to onchain with this
    struct RegisterValidationVoucher {
        /// @notice The off-chain ID of the validation work
        uint256 validationId;
        /// @notice the EIP-712 signature of all other fields in the RegisterValidationVoucher struct.
        bytes signature;
    }

    /// @notice allows users to apply for validator role
    /// @param validationAmount The amount of validations that a validator wants to do
    function applyForValidator(uint256 validationAmount) external {
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
        uint256 tokenToExtract = payablePerValidation * validationAmount;

        ValidationApplication
            storage validationApplication = validatorApplications.push();
        validationApplication.applicant = msg.sender;
        validatorApplicationId[msg.sender] = validationApplicationIndex;
        validationApplication.amountPerValidation += payablePerValidation;
        validationApplication.maxValidationAmount += validationAmount;
        validationApplication.expire = block.timestamp + validatorLockTime;
        validationApplicationIndex++;
        validationBalanceOf[msg.sender] += tokenToExtract;
        udao.transferFrom(msg.sender, address(this), tokenToExtract);

        emit RoleApplied(0, msg.sender, validationAmount);
    }

    /// @notice Allows validators to apply for super validator role
    function applyForSuperValidator() external {
        require(
            udaovp.balanceOf(msg.sender) > 0,
            "You have to be governance member to apply"
        );
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
        validatorApplicationId[msg.sender] = validationApplicationIndex;
        validationApplicationIndex++;
        validationApplication.amountPerValidation = superValidatorLockAmount;
        validationApplication.maxValidationAmount = 2**256 - 1;
        validationApplication.expire = block.timestamp + superValidatorLockTime;
        validationBalanceOf[msg.sender] += superValidatorLockAmount;
        udao.transferFrom(msg.sender, address(this), superValidatorLockAmount);

        emit RoleApplied(3, msg.sender, 0);
    }

    /// @notice Allows validators to add more rights to get validation work
    /// @param validationAmount Amount of validation work to get
    function addMoreValidation(uint256 validationAmount)
        external
        onlyRole(VALIDATOR_ROLE)
    {
        require(
            !IRM.hasRole(SUPER_VALIDATOR_ROLE, msg.sender),
            "Address is a Super Validator"
        );
        uint256 tokenToExtract = payablePerValidation * validationAmount;

        udao.transferFrom(msg.sender, address(this), tokenToExtract);

        ValidatorStakeLock storage userInfo = validatorLock[msg.sender].push();
        userInfo.amountPerValidation = tokenToExtract;
        userInfo.maxValidationAmount = validationAmount;
        userInfo.expire = block.timestamp + validatorLockTime;

        emit ValidationAdded(validationAmount);
    }

    /// @notice Allows jurors to add more rights to get case work
    /// @param caseAmount Amount of case work to get
    function addMoreCase(uint256 caseAmount) external onlyRole(JUROR_ROLE) {
        uint256 tokenToExtract = payablePerCase * caseAmount;

        udao.transferFrom(msg.sender, address(this), tokenToExtract);

        JurorStakeLock storage userInfo = jurorLocks[msg.sender].push();
        userInfo.amountPerCase = tokenToExtract;
        userInfo.maxCaseAmount = caseAmount;
        userInfo.expire = block.timestamp + jurorLockTime;

        emit CaseAdded(caseAmount);
    }
    

    /// @notice Allows validators to accept the validation work
    function registerValidation(RegisterValidationVoucher calldata voucher)
        external
        onlyRoles(validator_roles)
    {
        address signer = _verifyValidation(voucher);

        require(
            IRM.hasRole(BACKEND_ROLE, signer),
            "Signature invalid or unauthorized"
        );
        
        ValidatorStakeLock storage stakeLock = validatorLock[_msgSender()][
            latestValidatorStakeId[_msgSender()]
        ];
        require(
            stakeLock.doneValidationAmount < stakeLock.maxValidationAmount,
            "You don't have empty validation slots"
        );
        ValidationLock storage lock = validationLocks[_msgSender()].push();
        lock.expireDate = block.timestamp + validatorLockTime;
        lock.validationDate = block.timestamp;
        lock.lockAmount = uint128(payablePerValidation);
        stakeLock.doneValidationAmount++;
        if (stakeLock.doneValidationAmount == stakeLock.maxValidationAmount) {
            latestValidatorStakeId[_msgSender()]++;
        }

        emit ValidationRegistered(msg.sender, voucher.validationId);
    }

    /// @notice Allows jurors to accept the cases
    function registerCase(uint256 caseId) external onlyRole(JUROR_ROLE) {
        JurorStakeLock storage stakeLock = jurorLocks[_msgSender()][
            latestJurorStakeId[_msgSender()]
        ];
        require(
            stakeLock.doneCaseAmount < stakeLock.maxCaseAmount,
            "You don't have empty validation slots"
        );
        CaseLock storage lock = caseLocks[_msgSender()].push();
        lock.expireDate = block.timestamp + jurorLockTime;
        lock.validationDate = block.timestamp;
        lock.lockAmount = uint128(payablePerCase);
        stakeLock.doneCaseAmount++;
        if (stakeLock.doneCaseAmount == stakeLock.maxCaseAmount) {
            latestJurorStakeId[_msgSender()]++;
        }

        emit CaseRegistered(msg.sender, caseId);
    }

    /// @notice allows users to apply for juror role
    /// @param caseAmount The amount of cases that a juror wants to do
    function applyForJuror(uint256 caseAmount) external {
        require(
            udaovp.balanceOf(msg.sender) > 0,
            "You have to be governance member to apply"
        );
        uint256 tokenToExtract = payablePerCase * caseAmount;

        JurorApplication storage jurorApplication = jurorApplications.push();
        jurorApplication.applicant = msg.sender;
        jurorApplicationId[msg.sender] = caseApplicationIndex;
        jurorApplication.amountPerCase = payablePerCase;
        jurorApplication.maxCaseAmount += caseAmount;
        jurorApplication.expire = block.timestamp + jurorLockTime;
        caseApplicationIndex++;
        jurorBalanceOf[msg.sender] += tokenToExtract;
        udao.transferFrom(msg.sender, address(this), tokenToExtract);

        emit RoleApplied(1, msg.sender, caseAmount);
    }

    /// @notice Users can use this function and assign validator or juror roles to themselves
    function getApproved(RoleVoucher calldata voucher) external {
        // make sure redeemer is redeeming
        require(voucher.redeemer == msg.sender, "You are not the redeemer");
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
            ValidatorStakeLock storage userInfo = validatorLock[msg.sender]
                .push();

            if (validationApplication.isSuper) {
                IRM.grantRole(SUPER_VALIDATOR_ROLE, voucher.redeemer);
                userInfo.expire = block.timestamp + superValidatorLockTime;
                roleId = 3; // supervalidator
            } else {
                IRM.grantRole(VALIDATOR_ROLE, voucher.redeemer);
                userInfo.expire = block.timestamp + validatorLockTime;
            }
            userInfo.amountPerValidation = validationApplication
                .amountPerValidation;
            userInfo.maxValidationAmount = validationApplication
                .maxValidationAmount;
            validationApplication.isFinished = true;
        } else if (roleId == 1) {
            require(
                udaovp.balanceOf(voucher.redeemer) > 0,
                "You are not governance member"
            );

            JurorApplication storage jurorApplication = jurorApplications[
                jurorApplicationId[voucher.redeemer]
            ];
            JurorStakeLock storage userInfo = jurorLocks[msg.sender].push();

            IRM.grantRole(JUROR_ROLE, voucher.redeemer);
            userInfo.expire = block.timestamp + validatorLockTime;

            userInfo.amountPerCase = jurorApplication.amountPerCase;
            userInfo.maxCaseAmount = jurorApplication.maxCaseAmount;
            jurorApplication.isFinished = true;
        } else if (roleId == 2) {
            IRM.grantRole(CORPORATE_ROLE, voucher.redeemer);
        } else {
            revert("Undefined role ID!");
        }

        emit RoleApproved(roleId, msg.sender);
    }

    /// @notice Allows backend to reject role assignment application
    /// @param _applicant The address of the applicant
    function rejectApplication(address _applicant, uint256 roleId)
        external
        onlyRole(BACKEND_ROLE)
    {
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

    /// @notice allows validators to withdraw their staked tokens
    function withdrawValidatorStake(uint amount) public {
        uint256 withdrawableBalance;
        uint256 validatorLockLength = validatorLock[msg.sender].length;
        ValidationApplication
            storage validationApplication = validatorApplications[
                validatorApplicationId[msg.sender]
            ];

        if (IRM.hasRole(VALIDATOR_ROLE, msg.sender)) {
            for (int256 j; uint256(j) < validatorLockLength; j++) {
                ValidatorStakeLock storage lock = validatorLock[msg.sender][
                    uint256(j)
                ];
                if (lock.expire < block.timestamp) {
                    withdrawableBalance +=
                        lock.amountPerValidation *
                        (lock.maxValidationAmount - lock.doneValidationAmount);
                    /// @dev Remove the unstaked struct
                    validatorLock[msg.sender][uint256(j)] = validatorLock[
                        msg.sender
                    ][validatorLock[msg.sender].length - 1];
                    validatorLock[msg.sender].pop();
                    j--;
                    if(withdrawableBalance >= amount){
                        _withdrawValidator(msg.sender, withdrawableBalance);
                        return;
                    }
                }
            }
            for (
                int256 i;
                uint256(i) < validationLocks[msg.sender].length;
                i++
            ) {
                ValidationLock storage validationLock = validationLocks[
                    msg.sender
                ][uint256(i)];
                if (block.timestamp >= (validationLock.expireDate)) {
                    withdrawableBalance += validationLock.lockAmount;
                    /// @dev Remove the unstaked struct
                    validationLocks[msg.sender][uint256(i)] = validationLocks[
                        msg.sender
                    ][validationLocks[msg.sender].length - 1];
                    validationLocks[msg.sender].pop();
                    i--;
                    if(withdrawableBalance >= amount){
                        _withdrawValidator(msg.sender, withdrawableBalance);
                        return;
                    }
                }
            }
        } else if (IRM.hasRole(SUPER_VALIDATOR_ROLE, msg.sender)) {
            for (int256 j; uint256(j) < validatorLockLength; j++) {
                ValidatorStakeLock storage lock = validatorLock[msg.sender][
                    uint256(j)
                ];
                if (lock.expire < block.timestamp) {
                    withdrawableBalance +=
                        lock.amountPerValidation *
                        (lock.maxValidationAmount - lock.doneValidationAmount);
                        
                    /// @dev Remove the unstaked struct
                    validatorLock[msg.sender][uint256(j)] = validatorLock[
                        msg.sender
                    ][validatorLock[msg.sender].length - 1];
                    validatorLock[msg.sender].pop();
                    j--;
                    if(withdrawableBalance >= amount){
                        _withdrawValidator(msg.sender, withdrawableBalance);
                        return;
                    }
                }
            }
        } else {
            // If application got rejected
            if (validationApplication.isFinished) {
                withdrawableBalance = validationBalanceOf[msg.sender];
            }
        }
        _withdrawValidator(msg.sender, withdrawableBalance);
    }

    /// @notice Withdraws desired amounts of tokens to "to" address 
    function _withdrawValidator(address to, uint withdrawableBalance) internal {
        require(withdrawableBalance > 0, "You don't have withdrawable token");
        udao.transfer(to, withdrawableBalance);
        emit ValidatorStakeWithdrawn(to, withdrawableBalance);
    }

    /// @notice allows jurors to withdraw their staked tokens
    function withdrawJurorStake(uint amount) public {
        uint256 withdrawableBalance;
        uint256 jurorLockLength = jurorLocks[msg.sender].length;
        JurorApplication storage jurorApplication = jurorApplications[
            jurorApplicationId[msg.sender]
        ];

        if (IRM.hasRole(JUROR_ROLE, msg.sender)) {
            for (int256 j; uint256(j) < jurorLockLength; j++) {
                JurorStakeLock storage lock = jurorLocks[msg.sender][
                    uint256(j)
                ];
                if (lock.expire < block.timestamp) {
                    withdrawableBalance +=
                        lock.amountPerCase *
                        (lock.maxCaseAmount - lock.doneCaseAmount);
                    jurorLocks[msg.sender][uint256(j)] = jurorLocks[
                        msg.sender
                    ][jurorLocks[msg.sender].length - 1];
                    jurorLocks[msg.sender].pop();
                    j--;
                    if(withdrawableBalance >= amount) {
                        _withdrawJuror(msg.sender, withdrawableBalance);
                        return;
                    }
                }
            }
            for (int256 i; uint256(i) < jurorLocks[msg.sender].length; i++) {
                CaseLock storage caseLock = caseLocks[msg.sender][uint256(i)];
                if (block.timestamp >= (caseLock.expireDate)) {
                    withdrawableBalance += caseLock.lockAmount;
                    caseLocks[msg.sender][uint256(i)] = caseLocks[msg.sender][
                        caseLocks[msg.sender].length - 1
                    ];
                    caseLocks[msg.sender].pop();
                    i--;
                    /// @dev We cannot split rewards
                    if(withdrawableBalance >= amount) {
                        _withdrawJuror(msg.sender, withdrawableBalance);
                        return;
                    }
                }
            }
        } else {
            // If application got rejected
            if (jurorApplication.isFinished) {
                withdrawableBalance = jurorBalanceOf[msg.sender];
            }
        }
        _withdrawJuror(msg.sender, withdrawableBalance);
        return;
    }

    /// @notice Withdraws desired amounts of tokens to "to" address 
    function _withdrawJuror(address to, uint withdrawableBalance) internal {
        require(withdrawableBalance > 0, "You don't have withdrawable token");
        udao.transfer(to, withdrawableBalance);
        emit ValidatorStakeWithdrawn(to, withdrawableBalance);
    }

    /// @notice Returns the amount of token a validator could withdraw
    function withdrawableValidatorStake() public view returns (uint256) {
        uint256 withdrawableBalance;
        uint256 validatorLockLength = validatorLock[msg.sender].length;
        uint256 validationLockLength = validationLocks[msg.sender].length;
        ValidationApplication
            storage validationApplication = validatorApplications[
                validatorApplicationId[msg.sender]
            ];

        if (IRM.hasRole(VALIDATOR_ROLE, msg.sender)) {
            for (int256 j; uint256(j) < validatorLockLength; j++) {
                ValidatorStakeLock storage lock = validatorLock[msg.sender][
                    uint256(j)
                ];
                if (lock.expire < block.timestamp) {
                    withdrawableBalance +=
                        lock.amountPerValidation *
                        (lock.maxValidationAmount - lock.doneValidationAmount);
                }
            }
            for (int256 i; uint256(i) < validationLockLength; i++) {
                ValidationLock storage validationLock = validationLocks[
                    msg.sender
                ][uint256(i)];
                if (block.timestamp >= (validationLock.expireDate)) {
                    withdrawableBalance += validationLock.lockAmount;
                }
            }
        } else if (IRM.hasRole(SUPER_VALIDATOR_ROLE, msg.sender)) {
            for (int256 j; uint256(j) < validatorLockLength; j++) {
                ValidatorStakeLock storage lock = validatorLock[msg.sender][
                    uint256(j)
                ];
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

    /// @notice staking function to become a governance member
    /// @param _amount amount of UDAO token that will be staked
    /// @param _days amount of days UDAO token that will be staked for
    function stakeForGovernance(uint256 _amount, uint256 _days) public {
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
        emit GovernanceStake(msg.sender, _amount, lock.vpamount);
    }

    /// @notice withdraw function for released UDAO tokens
    /// @param _amount amount of UDAO token that will be unstaked
    function withdrawGovernanceStake(uint256 _amount) public {
        require(_amount > 0, "Stake amount can't be 0");
        uint256 withdrawableBalance;
        uint256 vpBalance;
        uint256 stakingsLength = governanceStakes[msg.sender].length;
        for (int256 i = 0; uint256(i) < stakingsLength; i++) {
            GovernanceLock storage lock = governanceStakes[msg.sender][
                uint256(i)
            ];
            if (block.timestamp >= lock.expire) {
                if (_amount < (withdrawableBalance + lock.amount)) {
                    uint256 vpFromLatest = ((lock.vpamount *
                        (((_amount - withdrawableBalance) * 100) /
                            lock.amount)) / 100);
                    uint256 udaoFromLatest = lock.amount -
                        (_amount - withdrawableBalance);
                    lock.amount -= udaoFromLatest;
                    lock.vpamount -= vpFromLatest;
                    vpBalance += vpFromLatest;
                    totalVotingPower -= vpBalance;
                    udaovp.transferFrom(msg.sender, address(0x0), vpBalance);
                    udao.transfer(msg.sender, _amount);
                    emit GovernanceStakeWithdraw(
                        msg.sender,
                        _amount,
                        vpBalance
                    );
                    return;
                }
                withdrawableBalance += lock.amount;
                vpBalance += lock.vpamount;
                governanceStakes[msg.sender][uint256(i)] = governanceStakes[
                    msg.sender
                ][governanceStakes[msg.sender].length - 1];
                governanceStakes[msg.sender].pop();
                i--;
            }
        }
    }

    function addVoteRewards(address voter) external onlyRole(GOVERNANCE_ROLE) {
        uint256 votingPowerRatio = (udaovp.balanceOf(voter) * 10000) /
            totalVotingPower;
        rewardBalanceOf[voter] += votingPowerRatio * voteReward;
        emit VoteRewardAdded(voter, votingPowerRatio * voteReward);
    }

    function withdrawRewards() external {
        require(
            rewardBalanceOf[msg.sender] > 0,
            "You don't have any reward balance"
        );
        uint256 voteRewards = rewardBalanceOf[msg.sender];
        rewardBalanceOf[msg.sender] = 0;
        udao.transferFrom(platformTreasuryAddress, msg.sender, voteRewards);
        emit VoteRewardsWithdrawn(msg.sender, voteRewards);
    }

    /// @notice Allows corporate accounts to stake. Staker and staked amount returned with event.
    /// @param amount The amount of stake
    function stakeForJobListing(uint256 amount)
        external
        onlyRole(CORPORATE_ROLE)
    {
        require(amount > 0, "Cannot unstake zero tokens");
        require(
            amount % corporateStakePerListing == 0,
            string(
                abi.encodePacked(
                    "Sent UDAO must be multiples of ",
                    Strings.toHexString(corporateStakePerListing),
                    " UDAO"
                )
            )
        );
        CorporateStakeLock storage stakeLock = corporateLocks[msg.sender].push();
        stakeLock.lockAmount = amount;
        stakeLock.expire = block.timestamp + corporateLockTime;

        udao.transferFrom(msg.sender, address(this), amount);
        emit StakeForJobListing(msg.sender, amount, corporateStakePerListing);
    }

    struct CorporateWithdrawVoucher {
        address redeemer;
        uint amount;
        bytes signature;
    }


    /// @notice Allows corporate accounts to unstake if they've found employee for job listing 
    /// before staking lock duration. 
    function unstakeForJobListing(CorporateWithdrawVoucher calldata voucher)
        external
        onlyRole(CORPORATE_ROLE)
    {
        
        uint256 withdrawableBalance;
        uint256 corporateLockLength = corporateLocks[msg.sender].length;

        address signer = _verifyCorporate(voucher);
        require(
            IRM.hasRole(BACKEND_ROLE, signer),
            "Signature invalid or unauthorized"
        );

        for (int256 j; uint256(j) < corporateLockLength; j++) {
            CorporateStakeLock storage lock = corporateLocks[msg.sender][
                uint256(j)
            ];
            withdrawableBalance += lock.lockAmount;

            corporateLocks[msg.sender][uint256(j)] = corporateLocks[
                msg.sender
            ][corporateLocks[msg.sender].length - 1];
            corporateLocks[msg.sender].pop();
            j--;
            if(withdrawableBalance >= voucher.amount) {
                _withdrawCorporate(msg.sender, withdrawableBalance);
                return;
            }
            
        }
    }


    /// @notice Allows corporate accounts to unstake. Staker and unstaked amount returned with event.
    /// @param amount The unstaked amount.
    function unstakeForJobListing(uint256 amount)
        external
        onlyRole(CORPORATE_ROLE)
    {
        require(amount > 0, "Cannot unstake zero tokens");
        
        uint256 withdrawableBalance;
        uint256 corporateLockLength = corporateLocks[msg.sender].length;

        for (int256 j; uint256(j) < corporateLockLength; j++) {
            CorporateStakeLock storage lock = corporateLocks[msg.sender][
                uint256(j)
            ];
            if (lock.expire <= block.timestamp) {
                withdrawableBalance += lock.lockAmount;

                corporateLocks[msg.sender][uint256(j)] = corporateLocks[
                    msg.sender
                ][corporateLocks[msg.sender].length - 1];
                corporateLocks[msg.sender].pop();
                j--;
                if(withdrawableBalance >= amount) {
                    _withdrawCorporate(msg.sender, withdrawableBalance);
                    return;
                }
            }
        }
    }

    function _withdrawCorporate(address to, uint withdrawableBalance) internal {
        udao.transferFrom(address(this), to, withdrawableBalance);
        emit UnstakeForJobListing(to, withdrawableBalance);
    }

    /// @notice Returns a hash of the given ContentVoucher, prepared using EIP712 typed data hashing rules.
    /// @param voucher A ContentVoucher to hash.
    function _hashRole(RoleVoucher calldata voucher)
        internal
        view
        returns (bytes32)
    {
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

    function _hashCorporate(CorporateWithdrawVoucher calldata voucher)
        internal
        view
        returns (bytes32)
    {
        return
            _hashTypedDataV4(
                keccak256(
                    abi.encode(
                        keccak256(
                            "UDAOStaker(address redeemer,uint256 amount)"
                        ),
                        voucher.redeemer,
                        voucher.amount
                    )
                )
            );
    }

    function _hashValidation(RegisterValidationVoucher calldata voucher)
        internal
        view
        returns (bytes32)
    {
        return
            _hashTypedDataV4(
                keccak256(
                    abi.encode(
                        keccak256(
                            "UDAOStaker(uint256 validationId)"
                        ),
                        voucher.validationId
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
    function _verifyRole(RoleVoucher calldata voucher)
        internal
        view
        returns (address)
    {
        bytes32 digest = _hashRole(voucher);
        return ECDSA.recover(digest, voucher.signature);
    }

    /// @notice Verifies the signature for a given CorporateWithdrawVoucher, returning the address of the signer.
    /// @dev Will revert if the signature is invalid. Does not verify that the signer is authorized to mint NFTs.
    /// @param voucher A CorporateWithdrawVoucher describing an unminted NFT.
    function _verifyCorporate(CorporateWithdrawVoucher calldata voucher)
        internal
        view
        returns (address)
    {
        bytes32 digest = _hashCorporate(voucher);
        return ECDSA.recover(digest, voucher.signature);
    }

    /// @notice Verifies the signature for a given RegisterValidationVoucher, returning the address of the signer.
    /// @dev Will revert if the signature is invalid. Does not verify that the signer is authorized to mint NFTs.
    /// @param voucher A RegisterValidationVoucher describing an unminted NFT.
    function _verifyValidation(RegisterValidationVoucher calldata voucher)
        internal
        view
        returns (address)
    {
        bytes32 digest = _hashValidation(voucher);
        return ECDSA.recover(digest, voucher.signature);
    }
}
