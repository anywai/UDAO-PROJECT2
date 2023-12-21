// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/draft-EIP712.sol";
import "../interfaces/IUDAOC.sol";
import "../interfaces/IPlatformTreasury.sol";
import "../interfaces/IRoleManager.sol";
import "hardhat/console.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "../RoleLegacy.sol";

interface IStakingContract {
    function checkExpireDateValidator(
        address _user
    ) external view returns (uint256 expireDate);

    function checkExpireDateJuror(
        address _user
    ) external view returns (uint256 expireDate);
}

contract Supervision is Pausable, RoleLegacy {
    IUDAOC udaoc;
    IPlatformTreasury platformTreasury;
    IStakingContract udaoStaker;

    /// @dev Events
    // Juror events
    event EndDispute(uint256 caseId, address[] jurors, uint256 totalJurorScore);
    event NextRound(uint256 newRoundId);
    event DisputeCreated(uint256 caseId, uint256 caseScope, string question);
    event DisputeAssigned(uint256 caseId, address juror);
    event DisputeResultSent(uint256 caseId, bool result, address juror);
    event DisputeEnded(uint256 caseId, bool verdict);
    event LateJurorScoreRecorded(uint256 caseId, address juror);
    event AddressesUpdated(
        address roleManagerAddress,
        address udaocAddress,
        address platformTreasuryAddress,
        address udaoStakerAddres
    );

    // Validation events
    event ValidationCreated(uint256 tokenId, uint256 validationId);
    event ValidationAssigned(
        uint256 tokenId,
        uint256 validationId,
        address validator
    );
    event ValidationResultSent(
        uint256 tokenId,
        uint256 validationId,
        address validator,
        bool result
    );
    event ValidatorRemovedFromValidation(
        uint256 tokenId,
        address validator,
        uint256 validationId
    );

    event JurorRemovedFromDispute(
        uint256 caseId,
        address juror,
        uint256 disputeId
    );

    event ValidationEnded(uint256 tokenId, uint256 validationId, bool result);

    /// @dev MAPPINGS
    // JUROR MAPPINGS
    // juror => (round => score)
    mapping(address => mapping(uint256 => uint256)) public jurorScorePerRound;
    // juror => caseId
    mapping(address => uint256) activeDispute;
    mapping(address => uint) public successfulDispute;
    mapping(address => uint) public unsuccessfulDispute;
    // VALIDATION MAPPINGS
    // tokenId => validation status (0: rejected, 1: validated, 2: in validation)
    mapping(uint256 => uint256) public isValidated;
    // tokenId => validationId
    mapping(uint256 => uint256) public latestValidationOfToken;
    // validator => (round => score)
    mapping(address => mapping(uint256 => uint256))
        public validatorScorePerRound;
    mapping(address => uint) public validationCount;
    // validator => validationId
    mapping(address => uint) public activeValidation;
    mapping(address => bool) public isInDispute;
    mapping(address => uint) public successfulValidation;
    mapping(address => uint) public unsuccessfulValidation;
    // token id => objection count
    mapping(uint256 => uint256) objectionCount;
    /// @dev Structs
    struct Dispute {
        /// @dev The id of the case
        uint256 caseId;
        // TODO REMOVE CASE SCOPE
        /// @dev Scope of the case
        uint128 caseScope;
        /// @dev Number of votes made
        uint128 voteCount;
        /// @dev Number of positive votes to the question
        uint128 acceptVoteCount;
        /// @dev Number of negative votes to the question
        uint128 rejectVoteCount;
        /// @dev List of jurors who participated in the dispute
        address[] jurors;
        /// @dev Question asked to the jurors (also case description)
        string question;
        /// @dev Vote of jurors
        mapping(address => bool) vote;
        /// @dev Checks whether or not a juror has voted
        mapping(address => bool) isVoted;
        /// @dev Final verdict of a dispute
        bool verdict;
        /// @dev if token related dipsute or not (e.g validation)
        // TODO isTokenRelated should be in removed
        bool isTokenRelated;
        /// @dev Related token ID, default to 0
        uint256 tokenId;
        /// @dev coaching id
        uint256 coachingId;
        /// @dev If the dispute is finalized or not
        bool isFinalized;
        /// @dev Case result date
        uint256 resultDate;
        /// @dev target contract address
        address targetContract;
        /// @dev The data required to make calls to the contract that will be modified.
        bytes data;
    }
    // TODO convert disputes to private before deployment
    Dispute[] public disputes;
    struct Validation {
        uint id;
        uint tokenId;
        uint8 validationCount;
        address[] validators;
        uint acceptVoteCount;
        uint rejectVoteCount;
        bool finalValidationResult;
        mapping(address => bool) vote;
        mapping(address => bool) isVoted;
        uint resultDate;
        uint validationScore;
        uint validatorScore; // successfulValidation * validationScore
        bool isFinalized;
    }
    Validation[] validations;

    /// @dev Variables
    // Juror variables
    uint256 public distributionRound;
    uint256 public totalCaseScore;
    uint128 public requiredJurors = 3;
    // TODO change below parameter name to minAcceptVoteJuror
    uint128 public minMajortyVote = 2;
    uint256 public totalJurorScore;
    // Validation variables
    uint128 public requiredValidators = 5;
    uint128 public minAcceptVoteValidation = 3;
    /// @dev is used during the calculation of a validator score
    uint256 public totalValidationScore;
    uint256 maxObjection = 3;

    /// @dev Constructor
    constructor(address roleManagerAddress, address udaocAddress) {
        roleManager = IRoleManager(roleManagerAddress);
        udaoc = IUDAOC(udaocAddress);
        /* @dev disputes start from 1, meaning that the first dispute will have id 1.
        This is because we are assigning 0 if juror is not assigned to any dispute.
        */
        disputes.push();
        validations.push();
    }

    /// @notice Get the updated addresses from contract manager
    function updateAddresses(
        address roleManagerAddress,
        address udaocAddress,
        address platformTreasuryAddress,
        address udaoStakerAddres
    ) external {
        if (msg.sender != foundationWallet) {
            require(
                (hasRole(BACKEND_ROLE, msg.sender) ||
                    hasRole(CONTRACT_MANAGER, msg.sender)),
                "Only backend and contract manager can update addresses"
            );
        }
        roleManager = IRoleManager(roleManagerAddress);
        udaoc = IUDAOC(udaocAddress);
        platformTreasury = IPlatformTreasury(platformTreasuryAddress);
        udaoStaker = IStakingContract(udaoStakerAddres);

        emit AddressesUpdated(
            roleManagerAddress,
            udaocAddress,
            platformTreasuryAddress,
            udaoStakerAddres
        );
    }

    /// @dev Setters
    // Juror setters

    /// TODO remove this function update address function is enough
    function setPlatformTreasury(address _platformTreasury) external {
        require(
            hasRole(BACKEND_ROLE, msg.sender),
            "Only backend can set platform treasury"
        );
        platformTreasury = IPlatformTreasury(_platformTreasury);
    }

    function checkApplicationN(address _user) public view returns (uint256) {
        return udaoStaker.checkExpireDateJuror(_user);
    }

    /// TODO Wth is this function.
    /// @notice sets required juror count per dispute
    /// @param _requiredJurors new required juror count
    function setRequiredJurors(uint128 _requiredJurors) external {
        require(
            hasRole(GOVERNANCE_ROLE, msg.sender),
            "Only governance can set required juror count"
        );
        requiredJurors = _requiredJurors;
    }

    // Validation setters
    /// TODO remove this function update address function is enough
    function setUDAOC(address udaocAddress) external {
        require(
            hasRole(BACKEND_ROLE, msg.sender),
            "Only backend can set UDAOC"
        );
        udaoc = IUDAOC(udaocAddress);
    }

    /// @notice creates a validation for a token
    /// @param udaoStakerAddress address of staking contract
    /// TODO remove this function update address function is enough
    function setAddressStaking(address udaoStakerAddress) external {
        require(
            hasRole(BACKEND_ROLE, msg.sender),
            "Only backend can set staking contract"
        );
        udaoStaker = IStakingContract(udaoStakerAddress);
    }

    /// @notice sets required validator vote count per content
    /// @param _requiredValidators new required vote count
    function setRequiredValidators(uint128 _requiredValidators) external {
        require(
            hasRole(GOVERNANCE_ROLE, msg.sender),
            "Only governance can set required validator count"
        );
        requiredValidators = _requiredValidators;
    }

    /// @notice sets maximum objection count per latest validation
    /// @param _maxObjection new objection count
    function setMaxObjectionCount(uint256 _maxObjection) external {
        require(
            hasRole(GOVERNANCE_ROLE, msg.sender),
            "Only governance can set objection count"
        );
        maxObjection = _maxObjection;
    }

    /// @dev Getters
    // Juror getters
    /// @notice returns successful and unsuccessful case count of the account
    /// @param account wallet address of the account that wanted to be checked
    function getCaseResults(
        address account
    ) external view returns (uint[2] memory results) {
        results[0] = successfulDispute[account];
        results[1] = unsuccessfulDispute[account];
    }

    /// @notice Returns the score of a juror for a speficied round
    function getJurorScore(
        address _juror,
        uint _round
    ) external view returns (uint) {
        return jurorScorePerRound[_juror][_round];
    }

    /// @notice returns total juror scores
    function getTotalJurorScore() external view returns (uint) {
        return totalJurorScore;
    }

    // Validation getters

    function getValidatorsOfVal(
        uint validationId
    ) public view returns (address[] memory) {
        return validations[validationId].validators;
    }

    /// @notice returns successful and unsuccessful validation count of the account
    /// @param account wallet address of the account that wanted to be checked
    function getValidationResults(
        address account
    ) external view returns (uint[2] memory results) {
        results[0] = successfulValidation[account];
        results[1] = unsuccessfulValidation[account];
    }

    /// @notice returns total successful validation count
    function getTotalValidationScore() external view returns (uint) {
        return totalValidationScore;
    }

    /// @notice Returns the validation result of a token
    /// @param tokenId The ID of a token
    function getIsValidated(uint tokenId) external view returns (uint256) {
        return isValidated[tokenId];
    }

    /// @notice Returns the validation result of a token
    /// @param tokenId The ID of a token
    function getLatestValidationIdOfToken(
        uint tokenId
    ) public view returns (uint) {
        return latestValidationOfToken[tokenId];
    }

    /// @notice Returns the score of a validator for a specific round
    /// @param _validator The address of the validator
    /// @param _round Reward round ID
    function getValidatorScore(
        address _validator,
        uint256 _round
    ) external view returns (uint256) {
        return validatorScorePerRound[_validator][_round];
    }

    /// @dev General functions
    // Juror functions
    /// @notice starts new dispute case
    function createDispute(
        uint128 caseScope,
        string calldata question,
        bool isTokenRelated,
        uint256 tokenId,
        bytes calldata _data,
        address _targetContract
    ) external {
        require(
            hasRole(BACKEND_ROLE, msg.sender),
            "Only backend can create dispute"
        );
        Dispute storage dispute = disputes.push();
        dispute.caseId = disputes.length - 1;
        dispute.caseScope = caseScope;
        dispute.question = question;
        dispute.data = _data;
        dispute.targetContract = _targetContract;
        // TODO it seems like we are not using the info below
        dispute.isTokenRelated = isTokenRelated;
        if (isTokenRelated) {
            dispute.tokenId = tokenId;
        }

        emit DisputeCreated(dispute.caseId, caseScope, question);
    }

    /// @notice assign a dispute to self
    /// @param caseId id of the dispute
    function assignDispute(uint256 caseId) external {
        require(
            hasRole(JUROR_ROLE, msg.sender),
            "Only jurors can assign dispute"
        );
        //make sure juror is kyced and not banned
        require(isKYCed(msg.sender, 1), "You are not KYCed");
        require(isNotBanned(msg.sender, 1), "You were banned");
        require(
            udaoStaker.checkExpireDateJuror(msg.sender) > block.timestamp,
            "Your application is expired"
        );
        require(caseId < disputes.length, "Dispute does not exist!");
        require(
            activeDispute[msg.sender] == 0,
            "You already have an assigned dispute"
        );
        require(
            disputes[caseId].jurors.length < requiredJurors,
            "Dispute already have enough jurors!"
        );
        require(
            udaoc.ownerOf(disputes[caseId].tokenId) != msg.sender,
            "You are the instructor of this course."
        );
        require(
            _wasntTheValidator(caseId, msg.sender),
            "You can't assign content you validated!"
        );

        activeDispute[msg.sender] = caseId;
        disputes[caseId].jurors.push(msg.sender);
        emit DisputeAssigned(caseId, msg.sender);
    }

    /// @dev Checks if a juror was also validator of the content
    /// @param caseId id of the dispute
    /// @param juror address of the juror
    /// @return true if the juror was not the validator of the content, false otherwise
    function _wasntTheValidator(
        uint256 caseId,
        address juror
    ) internal view returns (bool) {
        uint validationId = getLatestValidationIdOfToken(
            disputes[caseId].tokenId
        );
        address[] memory validators = getValidatorsOfVal(validationId);
        uint validatorLength = validators.length;
        for (uint i = 0; i < validatorLength; i++) {
            if (juror == validators[i]) {
                return false;
            }
        }
        return true;
    }

    /// @dev Checks if a juror is the owner of the content
    /// @param caseId id of the dispute
    /// @param juror address of the juror
    /// @return true if the juror was not the owner of the content, false otherwise
    function _wasntTheOwner(
        uint256 caseId,
        address juror
    ) internal view returns (bool) {
        address tokenOwner = udaoc.ownerOf(disputes[caseId].tokenId);
        if (tokenOwner == juror) {
            return false;
        }
        return true;
    }

    /// @notice Allows jurors to send dipsute result
    /// @param caseId id of the dispute
    /// @param result result of dispute
    function sendDisputeResult(uint256 caseId, bool result) external {
        require(
            hasRole(JUROR_ROLE, msg.sender),
            "Only jurors can send dispute result"
        );
        /// @dev Below two requires are protecting against reentrancy
        require(
            activeDispute[msg.sender] == caseId,
            "This dispute is not assigned to this wallet"
        );
        require(
            activeDispute[msg.sender] != 0,
            "You are not assigned to any dispute"
        );

        activeDispute[msg.sender] = 0;
        if (result) {
            disputes[caseId].acceptVoteCount++;
        } else {
            disputes[caseId].rejectVoteCount++;
        }
        disputes[caseId].isVoted[msg.sender] = true;
        disputes[caseId].vote[msg.sender] = result;
        disputes[caseId].voteCount++;
        emit DisputeResultSent(caseId, result, msg.sender);
        /// TODO replaceBannedJurors(); //add this function to contract and after that there will be no use of finalizeDispute();
        if (disputes[caseId].isFinalized == false) {
            if (
                /// @dev Dispute can be finalized if majority of jurors voted in favor or against
                disputes[caseId].voteCount >= requiredJurors ||
                disputes[caseId].acceptVoteCount >= minMajortyVote ||
                disputes[caseId].rejectVoteCount >= minMajortyVote
            ) {
                _finalizeDispute(caseId);
            }
        } else {
            /// @dev Records the score of a juror if dispute is already finalized
            _recordLateJurorScore(caseId, msg.sender);
        }
    }

    /// @notice finalizes dispute if last dispute result is sent
    /// @param caseId id of the dispute
    function _finalizeDispute(uint256 caseId) internal {
        /// @dev Check if the caller is in the list of jurors
        //_checkJuror(disputes[caseId].jurors);
        if (disputes[caseId].acceptVoteCount >= minMajortyVote) {
            disputes[caseId].verdict = true;
            // Call a function from a contract
            address contractAddress = disputes[caseId].targetContract;
            if (contractAddress != address(0x0)) {
                (bool success, ) = contractAddress.call(disputes[caseId].data);
                require(success, "Call has failed");
            }
        } else {
            disputes[caseId].verdict = false;
        }

        disputes[caseId].resultDate = block.timestamp;

        /// TODO Below is for unfixed juror scores and juror penalty..

        _recordJurorScores(caseId);
        disputes[caseId].isFinalized = true;
        emit DisputeEnded(caseId, disputes[caseId].verdict);
    }

    /// @notice record juror score
    /// @param caseId id of the dispute
    function _recordJurorScores(uint caseId) internal {
        for (uint i; i < disputes[caseId].jurors.length; i++) {
            if (disputes[caseId].isVoted[msg.sender] == true) {
                if (
                    disputes[caseId].verdict ==
                    disputes[caseId].vote[disputes[caseId].jurors[i]]
                ) {
                    jurorScorePerRound[disputes[caseId].jurors[i]][
                        distributionRound
                    ]++;
                    totalJurorScore++;
                    /// @dev Record success point of a juror
                    successfulDispute[disputes[caseId].jurors[i]]++;
                } else {
                    /// @dev Record unsuccess point of a juror
                    unsuccessfulDispute[disputes[caseId].jurors[i]]++;
                }
            }
        }
    }

    /// @notice record late coming juror score
    /// @param caseId id of the dispute
    /// @param juror address of the juror
    function _recordLateJurorScore(uint caseId, address juror) internal {
        if (disputes[caseId].verdict == disputes[caseId].vote[juror]) {
            jurorScorePerRound[juror][distributionRound]++;
            totalJurorScore++;
            /// @dev Record success point of a juror
            successfulDispute[juror]++;
        } else {
            /// @dev Record unsuccess point of a juror
            unsuccessfulDispute[juror]++;
        }
        emit LateJurorScoreRecorded(caseId, juror);
    }

    // Validation functions
    /// Sends validation result of validator to blockchain
    /// @param validationId id of validation
    /// @param result result of validation
    function sendValidation(uint validationId, bool result) external {
        require(
            hasRole(VALIDATOR_ROLE, msg.sender),
            "Only validators can send validation result"
        );
        /// @dev Below two requires are protecting against reentrancy
        require(
            activeValidation[msg.sender] == validationId,
            "This content is not assigned to this wallet"
        );
        require(
            activeValidation[msg.sender] != 0,
            "You are not assigned to any validation"
        );
        activeValidation[msg.sender] = 0;
        validationCount[msg.sender]++; //?

        if (result) {
            validations[validationId].acceptVoteCount++;
        } //else??
        validations[validationId].isVoted[msg.sender] = true;
        validations[validationId].vote[msg.sender] = result;
        validations[validationId].validationCount++;
        emit ValidationResultSent(
            validations[validationId].tokenId,
            validationId,
            msg.sender,
            result
        );
    }

    /// @notice finalizes validation if enough validation is sent
    /// @param validationId id of the validation
    function finalizeValidation(uint256 validationId) external {
        require(
            validations[validationId].validationCount >= requiredValidators,
            "Not enough validation"
        );
        require(
            validations[validationId].isFinalized == false,
            "Validation is already finalized"
        );
        validations[validationId].isFinalized = true;
        if (
            validations[validationId].acceptVoteCount >= minAcceptVoteValidation
        ) {
            validations[validationId].finalValidationResult = true;
            /// @dev Easier to check the validation result with token Id
            isValidated[validations[validationId].tokenId] = 1;
            objectionCount[validations[validationId].tokenId] = 0;
        } else {
            validations[validationId].finalValidationResult = false;
            /// @dev Easier to check the validation result with token Id
            isValidated[validations[validationId].tokenId] = 0;
        }
        /// @dev Record the date of the validation
        validations[validationId].resultDate = block.timestamp;
        /// @dev Record the validation result
        for (uint i; i < validations[validationId].validators.length; i++) {
            if (
                validations[validationId].finalValidationResult ==
                validations[validationId].vote[
                    validations[validationId].validators[i]
                ]
            ) {
                /// @dev Record score of a validator in this round
                validatorScorePerRound[validations[validationId].validators[i]][
                    distributionRound
                ] += validations[validationId].validationScore;
                totalValidationScore += validations[validationId]
                    .validationScore;
                /// @dev Record success point of a validator
                successfulValidation[validations[validationId].validators[i]]++;
            } else {
                /// @dev Record unsuccess point of a validator
                unsuccessfulValidation[
                    validations[validationId].validators[i]
                ]++;
            }
        }
        /// @dev Record the latest validation of a token
        latestValidationOfToken[
            validations[validationId].tokenId
        ] = validationId;
        emit ValidationEnded(
            validations[validationId].tokenId,
            validations[validationId].id,
            validations[validationId].finalValidationResult
        );
    }

    /// @notice allows validators to be fired or resigned
    /// @param demissionAddress is the address that will be revoked from validator role
    function dismissValidation(address demissionAddress) external {
        if (msg.sender == demissionAddress) {
            //why  we dont check is, activeValidation[demissionAddress] != 0 ?
            removeValidatorFromValidation(demissionAddress);
        } else {
            require(
                hasRole(BACKEND_ROLE, msg.sender) ||
                    hasRole(ROLEMANAGER_CONTRACT, msg.sender),
                "Only backend or role manager contract can set ban"
            );
            if (activeValidation[demissionAddress] != 0) {
                removeValidatorFromValidation(demissionAddress);
            }
        }
    }

    /* SIKINTI TODO
    1 = true;
    2 = true;
    validations[validationId].validationCount = 2
        2 banladık.
        ---2 nin yerine 4. kişi geldi.---
    3 = true;
        validations[validationId].validationCount = 3
    finalizeValidation() çalıştı.
    4. kişi henüz oy kullanmadı?!?!?!?!
    */

    /* Muhtemel Çözüm TODO
    1 = true;
    2 = true;
    validations[validationId].validationCount = 2
    2 banladık.
    validations[validationId].validationCount--;
    eğer banlanan true dediyse:
     validations[validationId].acceptVoteCount--;
     else:
     validations[validationId].rejectVoteCount--;
    2 nin yerine 4. kişi geldi.
    3 = true;
    validations[validationId].validationCount = 2
    finalizeValidation() çalışmaz.
    4 == false;
    finalizeValidaiton() çalışır.
    */

    /// @notice allows validators to dismiss a validation assignment
    /// @param demissionAddress id of the content that will be dismissed
    function removeValidatorFromValidation(address demissionAddress) internal {
        uint validationId = activeValidation[demissionAddress];
        //uint[] person = validations[validationId].validators;
        activeValidation[demissionAddress] = 0;
        for (uint i; i < validations[validationId].validators.length; i++) {
            if (msg.sender == validations[validationId].validators[i]) {
                if (
                    demissionAddress == validations[validationId].validators[i]
                ) {
                    validations[validationId].validators[i] = validations[
                        validationId
                    ].validators[
                            validations[validationId].validators.length - 1
                        ];
                    validations[validationId].validators.pop();
                }
            }
            emit ValidatorRemovedFromValidation(
                validations[validationId].tokenId,
                demissionAddress,
                validationId
            );
        }
    }

    /// @notice allows validators to dismiss a validation assignment
    /// @param demissionAddress id of the content that will be dismissed
    function dismissDispute(address demissionAddress) external {
        if (msg.sender == demissionAddress) {
            removeJurorFromDispute(demissionAddress);
        } else {
            require(
                hasRole(BACKEND_ROLE, msg.sender) ||
                    hasRole(ROLEMANAGER_CONTRACT, msg.sender),
                "Only backend or role manager contract can set ban"
            );
            if (activeValidation[demissionAddress] != 0) {
                removeJurorFromDispute(demissionAddress);
            }
        }
    }

    /// @notice allows validators to dismiss a validation assignment
    /// @param demissionAddress id of the content that will be dismissed
    function removeJurorFromDispute(address demissionAddress) internal {
        uint caseId = activeDispute[demissionAddress];
        activeDispute[demissionAddress] = 0;
        for (uint i; i < disputes[caseId].jurors.length; i++) {
            if (msg.sender == disputes[caseId].jurors[i]) {
                if (demissionAddress == disputes[caseId].jurors[i]) {
                    disputes[caseId].jurors[i] = disputes[caseId].jurors[
                        disputes[caseId].jurors.length - 1
                    ];
                    disputes[caseId].jurors.pop();
                }
            }
            emit JurorRemovedFromDispute(
                disputes[caseId].tokenId,
                demissionAddress,
                caseId
            );
        }
    }

    /// @notice starts new validation for content
    /// @param tokenId id of the content that will be validated
    /// @param score validation score of the content
    function createValidation(uint256 tokenId, uint256 score) external {
        require(
            hasRole(UDAOC_CONTRACT, msg.sender),
            "Only UDAOC contract can create validation"
        );
        require(
            udaoc.ownerOf(tokenId) != address(0),
            "Token owner is zero address"
        );
        //require(
        //    isValidated[tokenId] == 0,
        //    "Content must be invalidated to create new validation"
        //);

        address tokenOwner = udaoc.ownerOf(tokenId);
        //make sure token owner is not banned
        require(isNotBanned(tokenOwner, 2), "Token owner is banned");

        // Change status to 2 = in validation
        isValidated[tokenId] = 2;
        Validation storage validation = validations.push();
        validation.id = validations.length - 1;
        validation.tokenId = tokenId;
        validation.validationScore = score;
        emit ValidationCreated(tokenId, validations.length - 1);
    }

    /// @notice re-creates validation for unchanged content if it is invalidated for no valid reason
    function objectToLatestValidation(uint256 tokenId) external {
        require(
            isValidated[tokenId] == 0,
            "Content must be invalidated to create new validation"
        );
        require(
            objectionCount[tokenId] < maxObjection,
            "Maximum objection count reached"
        );
        address tokenOwner = udaoc.ownerOf(tokenId);
        require(
            tokenOwner == msg.sender,
            "Only token owner can re-create validation"
        );
        //make sure token owner is not banned
        require(isNotBanned(tokenOwner, 3), "Token owner is banned");
        // Get the latest validation for this token
        uint256 validationId = latestValidationOfToken[tokenId];
        // Get the score
        uint256 score = validations[validationId].validationScore;
        // Change status to in validation
        isValidated[tokenId] = 2;
        Validation storage validation = validations.push();
        validation.id = validations.length - 1;
        validation.tokenId = tokenId;
        validation.validationScore = score;
        objectionCount[tokenId]++;
        emit ValidationCreated(tokenId, validations.length - 1);
    }

    /// @notice assign validation to self
    /// @param validationId id of the validation
    function assignValidation(uint256 validationId) external {
        require(
            hasRole(VALIDATOR_ROLE, msg.sender),
            "Only validators can assign validation"
        );
        require(isKYCed(msg.sender, 4), "You are not KYCed");
        require(isNotBanned(msg.sender, 4), "You were banned");
        require(
            udaoStaker.checkExpireDateValidator(msg.sender) > block.timestamp,
            "Validation is expired"
        );
        require(
            validationId < validations.length,
            "Validation does not exist!"
        );
        require(
            activeValidation[msg.sender] == 0,
            "You already have an assigned content"
        );
        require(
            validations[validationId].validators.length < requiredValidators,
            "Content already have enough validators!"
        );
        require(
            udaoc.ownerOf(validations[validationId].tokenId) != msg.sender,
            "You are the instructor of this course."
        );
        activeValidation[msg.sender] = validationId;
        validations[validationId].validators.push(msg.sender);
        /// TODO Return if validation is full
        /// if(validations[validationId].validators.length == requiredValidators) {
        ///     isFull= true;
        /// }
        emit ValidationAssigned(
            validations[validationId].tokenId,
            validationId,
            msg.sender
            /// isFull
        );
    }

    function setValidationStatus(uint256 tokenId, uint256 status) external {
        require(
            hasRole(UDAOC_CONTRACT, msg.sender),
            "Only UDAOC contract can set validation status"
        );

        isValidated[tokenId] = status;
    }

    /// @dev Common functions
    /// @notice Starts the new reward round
    function nextRound() external whenNotPaused {
        require(
            hasRole(TREASURY_CONTRACT, msg.sender),
            "Only treasury contract can start new round"
        );
        distributionRound++;
        emit NextRound(distributionRound);
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
