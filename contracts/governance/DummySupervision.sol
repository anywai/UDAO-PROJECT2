// SPDX-License-Identifier: MIT
/// @title Dummy version of the supervision contract.

pragma solidity ^0.8.4;

contract DummySupervision {
    uint public silenceWarnings0 = 0;
    uint public silenceWarnings1 = 1;
    address[] public silenceWarningEmptyArray = new address[](0);

    /// @notice Returns the validation result of a token
    /// @param tokenId The ID of a token
    function getIsValidated(uint tokenId) external view returns (uint256) {
        return silenceWarnings1;
    }

    /// @notice Returns the score of a validator for a specific round
    /// @param _validator The address of the validator
    /// @param _round Reward round ID
    function getValidatorScore(
        address _validator,
        uint _round
    ) external view returns (uint) {
        return silenceWarnings0;
    }

    function setValidationStatus(uint256 tokenId, uint256 status) external {}

    /// @notice returns total successful validation count
    function getTotalValidationScore() external view returns (uint) {
        return silenceWarnings0;
    }

    function getValidatorsOfVal(
        uint validationId
    ) external view returns (address[] memory) {
        return silenceWarningEmptyArray;
    }

    /// @notice Returns the validation result of a token
    /// @param tokenId The ID of a token
    function getLatestValidationIdOfToken(
        uint tokenId
    ) external view returns (uint) {
        return silenceWarnings0;
    }

    /// @notice Returns the score of a juror for a speficied round
    function getJurorScore(
        address _juror,
        uint _round
    ) external view returns (uint) {
        return silenceWarnings0;
    }

    /// @notice returns total juror scores
    function getTotalJurorScore() external view returns (uint) {
        return silenceWarnings0;
    }

    /// @notice starts new validation for content
    /// @param tokenId id of the content that will be validated
    /// @param score validation score of the content
    function createValidation(uint256 tokenId, uint256 score) external {}

    /// @dev Common functions
    /// @notice Starts the new reward round
    function nextRound() external {}

    /// @notice allows validators to be fired or resigned
    /// @param demissionAddress is the address that will be revoked from validator role
    function dismissValidation(address demissionAddress) external {}

    /// @notice allows validators to dismiss a validation assignment
    /// @param demissionAddress id of the content that will be dismissed
    function dismissDispute(address demissionAddress) external {}
}
