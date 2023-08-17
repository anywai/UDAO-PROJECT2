// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/draft-EIP712.sol";
import "../ContractManager.sol";
import "../RoleController.sol";
import "../interfaces/IUDAOC.sol";
import "../interfaces/IPlatformTreasury.sol";
import "hardhat/console.sol";

interface IStakingContract {
    function checkExpireDateValidator(
        address _user
    ) external view returns (uint256 expireDate);

    function checkExpireDateJuror(
        address _user
    ) external view returns (uint256 expireDate);
}

contract Supervision is RoleController {
    IUDAOC udaoc;
    IPlatformTreasury PT;
    IStakingContract staker;

    ContractManager contractManager;

    /// @dev Events
    // Juror events
    event EndDispute(uint256 caseId, address[] jurors, uint256 totalJurorScore);
    event NextRound(uint256 newRoundId);
    event DisputeCreated(uint256 caseId, uint256 caseScope, string question);
    event DisputeAssigned(uint256 caseId, address juror);
    event DisputeResultSent(uint256 caseId, bool result, address juror);
    event DisputeEnded(uint256 caseId, bool verdict);
    event LateJurorScoreRecorded(uint256 caseId, address juror);
    event AddressesUpdated(address IRMAddress, address PTAddress);
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
    constructor(
        address rmAddress,
        address udaocAddress
    )
        //address ivmAddress
        RoleController(rmAddress)
    {
        udaoc = IUDAOC(udaocAddress);
        disputes.push();
        validations.push();
    }

    /// @dev Setters
    // Juror setters
    function setContractManager(
        address _contractManager
    ) external onlyRole(BACKEND_ROLE) {
        contractManager = ContractManager(_contractManager);
    }

    function setPlatformTreasury(
        address _platformTreasury
    ) external onlyRole(BACKEND_ROLE) {
        PT = IPlatformTreasury(_platformTreasury);
    }

    function checkApplicationN(address _user) public view returns (uint256) {
        return staker.checkExpireDateJuror(_user);
    }

    /// TODO Wth is this function.
    /// @notice sets required juror count per dispute
    /// @param _requiredJurors new required juror count
    function setRequiredJurors(
        uint128 _requiredJurors
    ) external onlyRole(GOVERNANCE_ROLE) {
        requiredJurors = _requiredJurors;
    }

    // Validation setters
    function setUDAOC(address udaocAddress) external onlyRole(BACKEND_ROLE) {
        udaoc = IUDAOC(udaocAddress);
    }

    /// @notice creates a validation for a token
    /// @param stakerAddress address of staking contract
    function setAddressStaking(
        address stakerAddress
    ) external onlyRole(BACKEND_ROLE) {
        staker = IStakingContract(stakerAddress);
    }

    /// @notice sets required validator vote count per content
    /// @param _requiredValidators new required vote count
    function setRequiredValidators(
        uint128 _requiredValidators
    ) external onlyRole(GOVERNANCE_ROLE) {
        requiredValidators = _requiredValidators;
    }

    /// @notice sets maximum objection count per latest validation
    /// @param _maxObjection new objection count
    function setMaxObjectionCount(
        uint256 _maxObjection
    ) external onlyRole(GOVERNANCE_ROLE) {
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
    ) external onlyRole(BACKEND_ROLE) {
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
    function assignDispute(uint256 caseId) external onlyRole(JUROR_ROLE) {
        //make sure juror is kyced and not banned
        require(IRM.isKYCed(msg.sender), "You are not KYCed");
        require(!IRM.isBanned(msg.sender), "You were banned");
        require(
            staker.checkExpireDateJuror(msg.sender) > block.timestamp,
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
        require(
            _wasntTheOwner(caseId, msg.sender),
            "You can't assign content that you own!"
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
    function sendDisputeResult(
        uint256 caseId,
        bool result
    ) external onlyRole(JUROR_ROLE) {
        require(
            activeDispute[msg.sender] == caseId,
            "This dispute is not assigned to this wallet"
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
                disputes[caseId].voteCount >= requiredJurors ||
                disputes[caseId].acceptVoteCount >= minMajortyVote ||
                disputes[caseId].rejectVoteCount >= minMajortyVote
            ) {
                _finalizeDispute(caseId);
            }
        } else {
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

    /* TODO
    function replaceBannedJurors(address bannedJuror, uint256 caseId) external {
        
         for (uint256 i = 0; i < disputes[caseId].jurors.length; i++) {
            if (disputes[caseId].jurors[i] == bannedJuror) {
                // Move the last element to the current position
                disputes[caseId].jurors[i] = disputes[caseId].jurors[disputes[caseId].jurors.length - 1];
                // Reduce the array size by one
                disputes[caseId].jurors.pop();
                // Exit the loop since we found and removed the address
                break;
            }
        }
    }
    */

    // Validation functions
    /// Sends validation result of validator to blockchain
    /// @param validationId id of validation
    /// @param result result of validation
    function sendValidation(
        uint validationId,
        bool result
    ) external onlyRole(VALIDATOR_ROLE) {
        require(
            activeValidation[msg.sender] == validationId,
            "This content is not assigned to this wallet"
        );
        validationCount[msg.sender]++;
        activeValidation[msg.sender] = 0;
        if (result) {
            validations[validationId].acceptVoteCount++;
        }
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
            removeValidatorFromValidation(demissionAddress);
        } else {
            require(
                IRM.hasRole(BACKEND_ROLE, msg.sender) ||
                    IRM.hasRole(ROLEMANAGER_CONTRACT, msg.sender),
                "Only backend or role manager contract can set ban"
            );
            if (activeValidation[demissionAddress] != 0) {
                removeValidatorFromValidation(demissionAddress);
            }
        }
    }

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
                IRM.hasRole(BACKEND_ROLE, msg.sender) ||
                    IRM.hasRole(ROLEMANAGER_CONTRACT, msg.sender),
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
    function createValidation(
        uint256 tokenId,
        uint256 score
    ) external onlyRole(UDAOC_CONTRACT) {
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
        require(!IRM.isBanned(tokenOwner), "Token owner is banned");

        // Change status to in validation
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
        require(!IRM.isBanned(tokenOwner), "Token owner is banned");
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
    function assignValidation(
        uint256 validationId
    ) external onlyRole(VALIDATOR_ROLE) {
        require(IRM.isKYCed(msg.sender), "You are not KYCed");
        require(!IRM.isBanned(msg.sender), "You were banned");
        require(
            staker.checkExpireDateValidator(msg.sender) > block.timestamp,
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
        ///if(validations[validationId].validators.length == requiredValidators) {
        ///    isFull= true;
        ///}
        emit ValidationAssigned(
            validations[validationId].tokenId,
            validationId,
            msg.sender
            /// isFull
        );
    }

    function setValidationStatus(
        uint256 tokenId,
        uint256 status
    ) external onlyRole(UDAOC_CONTRACT) {
        isValidated[tokenId] = status;
    }

    /// @dev Common functions
    /// @notice Starts the new reward round
    function nextRound() external whenNotPaused onlyRole(TREASURY_CONTRACT) {
        distributionRound++;
        emit NextRound(distributionRound);
    }

    /// @notice Get the updated addresses from contract manager
    /// TODO is this correct?
    function updateAddresses() external onlyRole(BACKEND_ROLE) {
        IRM = IRoleManager(contractManager.IrmAddress());
        PT = IPlatformTreasury(contractManager.PlatformTreasuryAddress());
        emit AddressesUpdated(address(IRM), address(PT));
    }
}
