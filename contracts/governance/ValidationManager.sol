// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "../RoleController.sol";
import "../interfaces/IUDAOC.sol";

interface IStakingContract {
    function registerValidation(uint256 validationId) external;
}

contract ValidationManager is RoleController {
    // UDAO (ERC721) Token interface
    IUDAOC udaoc;
    IStakingContract staker;

    constructor(
        address udaocAddress,
        address irmAddress
    ) RoleController(irmAddress) {
        udaoc = IUDAOC(udaocAddress);
        validations.push();
    }

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
    event ValidationEnded(uint256 tokenId, uint256 validationId, bool result);
    event NextRound(uint256 newRoundId);

    // tokenId => is validation done
    mapping(uint256 => bool) public isValidated;

    // tokenId => validationId
    mapping(uint256 => uint256) public latestValidationOfToken;

    struct Validation {
        uint id;
        uint tokenId;
        uint8 validationCount;
        address[] validators;
        uint acceptVoteCount;
        bool finalValidationResult;
        mapping(address => bool) vote;
        mapping(address => bool) isVoted;
        uint resultDate;
        uint validationScore;
        uint validatorScore; // successfulValidation * validationScore
    }

    uint128 public requiredValidators = 5;
    uint128 public minRequiredAcceptVote = 3;
    // validator => round => score
    mapping(address => mapping(uint256 => uint256))
        public validatorScorePerRound;

    Validation[] validations;

    function getValidatorsOfVal(
        uint validationId
    ) external view returns (address[] memory) {
        return validations[validationId].validators;
    }

    mapping(address => uint) public validationCount;
    mapping(address => uint) public activeValidation;
    mapping(address => bool) public isInDispute;
    mapping(address => uint) public successfulValidation;
    mapping(address => uint) public unsuccessfulValidation;

    uint256 public distributionRound;
    /// @dev is used during the calculation of a validator score
    uint256 public totalValidationScore;

    function setUDAOC(address udaocAddress) external onlyRole(FOUNDATION_ROLE) {
        udaoc = IUDAOC(udaocAddress);
    }

    /// @notice creates a validation for a token
    /// @param stakerAddress address of staking contract
    function setStaker(
        address stakerAddress
    ) external onlyRole(FOUNDATION_ROLE) {
        staker = IStakingContract(stakerAddress);
    }

    /// Sends validation result of validator to blockchain
    /// @param validationId id of validation
    /// @param result result of validation
    function sendValidation(
        uint validationId,
        bool result
    ) external onlyRoles(validator_roles) {
        /// @notice sends validation result
        /// @param validationId id of the validation
        /// @param result result of validation
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

    function finalizeValidation(uint256 validationId) external {
        /// @notice finalizes validation if enough validation is sent
        /// @param validationId id of the validation
        require(
            validations[validationId].validationCount >= requiredValidators,
            "Not enough validation"
        );
        if (
            validations[validationId].acceptVoteCount >= minRequiredAcceptVote
        ) {
            validations[validationId].finalValidationResult = true;
            /// @dev Easier to check the validation result with token Id
            isValidated[validations[validationId].tokenId] = true;
        } else {
            validations[validationId].finalValidationResult = false;
            /// @dev Easier to check the validation result with token Id
            isValidated[validations[validationId].tokenId] = false;
        }

        validations[validationId].resultDate = block.timestamp;
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
        latestValidationOfToken[
            validations[validationId].tokenId
        ] = validationId;
        emit ValidationEnded(
            validations[validationId].tokenId,
            validations[validationId].id,
            validations[validationId].finalValidationResult
        );
    }

    function dismissValidation(
        uint validationId
    ) external onlyRoles(validator_roles) {
        /// @notice allows validators to dismiss a validation assignment
        /// @param validationId id of the content that will be dismissed
        require(
            activeValidation[msg.sender] == validationId,
            "This content is not assigned to this wallet"
        );
        activeValidation[msg.sender] = 0;
        for (uint i; i < validations[validationId].validators.length; i++) {
            if (msg.sender == validations[validationId].validators[i]) {
                validations[validationId].validators[i] = validations[
                    validationId
                ].validators[validations[validationId].validators.length - 1];
                validations[validationId].validators.pop();
            }
        }
    }

    /// @notice sets required validator vote count per content
    /// @param _requiredValidators new required vote count
    function setRequiredValidators(
        uint128 _requiredValidators
    ) external onlyRole(GOVERNANCE_ROLE) {
        requiredValidators = _requiredValidators;
    }

    /// @notice starts new validation for content
    /// @param tokenId id of the content that will be validated
    /// @param score validation score of the content
    function createValidation(
        uint256 tokenId,
        uint256 score
    ) external onlyRole(BACKEND_ROLE) {
        require(udaoc.exists(tokenId), "ERC721: invalid token ID");
        Validation storage validation = validations.push();
        validation.id = validations.length - 1;
        validation.tokenId = tokenId;
        validation.validationScore = score;
        emit ValidationCreated(tokenId, validations.length - 1);
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

    /// @notice Only foundation can open a dispute after enough off-chain dispute reports gathered from users.
    /// @param validationId id of the validation
    function openDispute(uint validationId) external onlyRole(FOUNDATION_ROLE) {
        Validation storage validation = validations[validationId];
        address[] memory disputedAddresses = validation.validators;
        for (uint i; i < disputedAddresses.length; i++) {
            isInDispute[disputedAddresses[i]] = true;
            successfulValidation[disputedAddresses[i]]--;
            unsuccessfulValidation[disputedAddresses[i]]++;
        }
    }

    /// @notice ends dispute
    /// @param validationId id of the validation
    /// @param result result of the dispute
    function endDispute(
        uint validationId,
        bool result // result true means validators lost the case
    ) external onlyRole(JUROR_CONTRACT) {
        Validation storage validation = validations[validationId];
        address[] memory disputedAddresses = validation.validators;
        uint disputeLength = disputedAddresses.length;
        for (uint i; i < disputeLength; i++) {
            isInDispute[disputedAddresses[i]] = false;
            if (!result) {
                successfulValidation[disputedAddresses[i]]++;
                unsuccessfulValidation[disputedAddresses[i]]--;
            }
        }
    }

    /// @notice assign validation to self
    /// @param validationId id of the validation
    function assignValidation(
        uint256 validationId
    ) external onlyRoles(validator_roles) {
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
        emit ValidationAssigned(
            validations[validationId].tokenId,
            validationId,
            msg.sender
        );
    }

    /// @notice Returns the validation result of a token
    /// @param tokenId The ID of a token
    function getIsValidated(uint tokenId) external view returns (bool) {
        return isValidated[tokenId];
    }

    /// @notice Returns the validation result of a token
    /// @param tokenId The ID of a token
    function getLatestValidationIdOfToken(
        uint tokenId
    ) external view returns (uint) {
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

    /// @notice Starts the new reward round
    function nextRound() external whenNotPaused onlyRole(TREASURY_CONTRACT) {
        distributionRound++;
        emit NextRound(distributionRound);
    }
}
