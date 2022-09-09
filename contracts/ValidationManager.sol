// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "./RoleManager.sol";

abstract contract ValidationManager is RoleManager {
    event ValidationEnded(uint validationId, uint tokenId, bool result);

    // tokenId => is validation done
    mapping(uint => bool) isValidated;

    struct Validation {
        uint id;
        uint tokenId;
        uint8 validationCount;
        address[] validators;
        uint validationResults;
        bool finalValidationResult;
        mapping(address => bool) vote;
        mapping(address => bool) isVoted;
        uint resultDate;
        uint validationScore;
        uint validatorScore; // successfulValidation * validationScore
    }

    uint public requiredValidator;
    uint public minRequiredVote;

    Validation[] validations;

    mapping(address => uint) validationCount;
    mapping(address => uint) activeValidation;
    mapping(address => bool) isInDispute;
    mapping(address => uint) maximumValidation; ///TODO after staking contract
    mapping(address => uint) public successfulValidation;
    mapping(address => uint) public unsuccessfulValidation;
    uint public totalSuccessfulValidation;

    function sendValidation(uint validationId, bool result) external {
        /// @notice sends validation result
        /// @param validationId id of the validation
        /// @param result result of validation
        require(
            hasRole(VALIDATOR_ROLE, msg.sender) ||
                hasRole(SUPER_VALIDATOR_ROLE, msg.sender),
            "You are not a validator"
        );
        require(
            activeValidation[msg.sender] == validationId,
            "This content is not assigned to this wallet"
        );
        validationCount[msg.sender]++;
        activeValidation[msg.sender] = 0;
        if (result) {
            validations[validationId].validationResults++;
        }
        validations[validationId].isVoted[msg.sender] = true;
        validations[validationId].vote[msg.sender] = true;
        validations[validationId].validationCount++;
    }

    function finalizeValidation(uint validationId) external {
        /// @notice finalizes validation if enough validation is sent
        /// @param validationId id of the validation
        require(
            validations[validationId].validationCount >= requiredValidator,
            "Not enough validation"
        );
        if (validations[validationId].validationResults >= minRequiredVote) {
            validations[validationId].finalValidationResult = true;
        } else {
            validations[validationId].finalValidationResult = false;
        }
        isValidated[validationId] = true;
        validations[validationId].resultDate = block.timestamp;
        for (uint i; i < validations[validationId].validators.length; i++) {
            if (
                validations[validationId].finalValidationResult ==
                validations[validationId].vote[
                    validations[validationId].validators[i]
                ]
            ) {
                successfulValidation[validations[validationId].validators[i]]++;
                totalSuccessfulValidation++;
            } else {
                unsuccessfulValidation[
                    validations[validationId].validators[i]
                ]++;
            }
        }
        emit ValidationEnded(
            validations[validationId].id,
            validations[validationId].tokenId,
            validations[validationId].finalValidationResult
        );
    }

    function dismissValidation(uint validationId) external {
        /// @notice dismisses validation of content
        /// @param validationId id of the content that will be dismissed
        require(
            hasRole(VALIDATOR_ROLE, msg.sender) ||
                hasRole(SUPER_VALIDATOR_ROLE, msg.sender),
            "You are not a validator"
        );
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

    function setMaximumValidation(uint _requiredValidator)
        external
        onlyRole(GOVERNANCE_ROLE)
    {
        /// @notice sets required validator vote count per content
        /// @param _requiredValidator new required vote count
        requiredValidator = _requiredValidator;
    }

    function createValidation(uint tokenId, uint score)
        external
        onlyRole(BACKEND_ROLE)
    {
        /// @notice starts new validation for content
        /// @param tokenId id of the content that will be validated
        /// @param score validation score of the content
        Validation storage validation = validations.push();
        validation.id = validations.length;
        validation.tokenId = tokenId;
        validation.validationScore = score;
    }

    function getValidationResults(address account)
        external
        view
        returns (uint[2] memory results)
    {
        /// @notice returns successful and unsuccessful validation count of the account
        /// @param account wallet address of the account that wanted to be checked
        results[0] = successfulValidation[account];
        results[1] = unsuccessfulValidation[account];
    }

    function getTotalValidation() external view returns (uint) {
        /// @notice returns total successful validation count
        return totalSuccessfulValidation;
    }

    function openDispute(uint validationId) external onlyRole(FOUNDATION_ROLE) {
        /// @notice Only foundation can open a dispute after enough off-chain dispute reports gathered from users.
        /// @param validationId id of the validation
        Validation storage validation = validations[validationId];
        address[] memory disputedAddresses = validation.validators;
        for (uint i; i < disputedAddresses.length; i++) {
            isInDispute[disputedAddresses[i]] = true;
            successfulValidation[disputedAddresses[i]]--;
            totalSuccessfulValidation--;
            unsuccessfulValidation[disputedAddresses[i]]++;
        }
    }

    function endDispute(
        uint validationId,
        bool result // result true means validators lost the case
    ) external onlyRole(FOUNDATION_ROLE) {
        /// @notice ends dispute
        /// @param validationId id of the validation
        /// @param result result of the dispute
        Validation storage validation = validations[validationId];
        address[] memory disputedAddresses = validation.validators;
        for (uint i; i < disputedAddresses.length; i++) {
            isInDispute[disputedAddresses[i]] = false;
            if (!result) {
                successfulValidation[disputedAddresses[i]]++;
                totalSuccessfulValidation++;
                unsuccessfulValidation[disputedAddresses[i]]--;
            }
        }
    }

    function assignValidation(uint validationId) external {
        /// @notice assign validation to self
        /// @param validationId id of the validation
        require(
            hasRole(VALIDATOR_ROLE, msg.sender) ||
                hasRole(SUPER_VALIDATOR_ROLE, msg.sender),
            "You are not a validator"
        );
        require(
            activeValidation[msg.sender] == 0,
            "You already have an assigned content"
        );
        require(
            validations[validationId].validators.length < requiredValidator,
            "Content already have enough validators!"
        );

        activeValidation[msg.sender] = validationId;
        validations[validationId].validators.push(msg.sender);
    }
}
