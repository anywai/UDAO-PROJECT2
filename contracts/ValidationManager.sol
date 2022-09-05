// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "./RoleManager.sol";

abstract contract ValidationManager is RoleManager {
    mapping(uint => uint) contentPrice;
    mapping(uint => uint) isValidated;

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
    mapping(uint => uint[]) validationIdOfToken;
    mapping(address => uint) validationCount;
    mapping(address => uint) activeValidation;
    mapping(address => bool) isInDispute;
    mapping(address => uint) maximumValidation;
    mapping(address => uint) public successfulValidation;
    mapping(address => uint) public unsuccessfulValidation;
    uint public totalSuccesfulValidation;

    function sendValidation(uint tokenId, bool result) external {
        require(
            hasRole(VALIDATOR_ROLE, msg.sender) ||
                hasRole(SUPER_VALIDATOR_ROLE, msg.sender),
            "You are not a validator"
        );
        require(
            activeValidation[msg.sender] == tokenId,
            "This content is not assigned to this wallet"
        );
        validationCount[msg.sender]++;
        activeValidation[msg.sender] = 0;
        if (result) {
            validations[tokenId].validationResults++;
        }
        validations[tokenId].isVoted[msg.sender] = true;
        validations[tokenId].vote[msg.sender] = true;
        validations[tokenId].validationCount++;
        if (validations[tokenId].validationCount >= requiredValidator) {
            if (validations[tokenId].validationResults >= minRequiredVote) {
                validations[tokenId].finalValidationResult = true;
            } else {
                validations[tokenId].finalValidationResult = false;
            }
            validations[tokenId].resultDate = block.timestamp;
        }
    }

    function dismissValidation(uint tokenId) external {
        require(
            hasRole(VALIDATOR_ROLE, msg.sender) ||
                hasRole(SUPER_VALIDATOR_ROLE, msg.sender),
            "You are not a validator"
        );
        require(
            activeValidation[msg.sender] == tokenId,
            "This content is not assigned to this wallet"
        );
        activeValidation[msg.sender] = 0;
        for (uint i; i < validations[tokenId].validators.length; i++) {
            if (msg.sender == validations[tokenId].validators[i]) {
                validations[tokenId].validators[i] = validations[tokenId]
                    .validators[validations[tokenId].validators.length - 1];
                validations[tokenId].validators.pop();
            }
        }
    }

    function seetMaximumValidation(uint _requiredValidator)
        external
        onlyRole(GOVERNANCE_ROLE)
    {
        requiredValidator = _requiredValidator;
    }

    function createValidatior(uint tokenId, uint score)
        external
        onlyRole(BACKEND_ROLE)
    {
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
        results[0] = successfulValidation[account];
        results[1] = unsuccessfulValidation[account];
    }

    function getTotalValidation() external view returns (uint) {
        return totalSuccesfulValidation;
    }

    function setDispute(uint id) external onlyRole(FOUNDATION_ROLE) {
        //millet canı sıkıldıkça dispute açmasın (off-chain rapor toplayıp foundation dispute açabilir)
        Validation storage validation = validations[id];
        address[] memory disputedAddresses = validation.validators;
        for (uint i; i < disputedAddresses.length; i++) {
            isInDispute[disputedAddresses[i]] = true;
            successfulValidation[disputedAddresses[i]]--;
            unsuccessfulValidation[disputedAddresses[i]]++;
        }
    }

    function endDispute(
        uint id,
        bool result // result true means validators lost the case
    ) external onlyRole(FOUNDATION_ROLE) {
        Validation storage validation = validations[id];
        address[] memory disputedAddresses = validation.validators;
        for (uint i; i < disputedAddresses.length; i++) {
            isInDispute[disputedAddresses[i]] = false;
            if (!result) {
                successfulValidation[disputedAddresses[i]]++;
                unsuccessfulValidation[disputedAddresses[i]]--;
            }
        }
    }

    function grantValidatorRole(uint8 roleId, address account)
        external
        onlyRole(STAKING_CONTRACT)
    {
        if (roleId == 0) {
            _grantRole(VALIDATOR_ROLE, account);
        }
        if (roleId == 1) {
            _grantRole(SUPER_VALIDATOR_ROLE, account);
        }
    }

    function revokeValidatorRole(uint8 roleId, address account)
        external
        onlyRole(STAKING_CONTRACT)
    {
        if (roleId == 0) {
            _revokeRole(VALIDATOR_ROLE, account);
        }
        if (roleId == 1) {
            _revokeRole(SUPER_VALIDATOR_ROLE, account);
        }
    }

    function assignValidation(uint tokenId) external {
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
            validations[tokenId].validators.length < requiredValidator,
            "Content already have enough validators!"
        );

        activeValidation[msg.sender] = tokenId;
        validations[tokenId].validators.push(msg.sender);
    }
}
