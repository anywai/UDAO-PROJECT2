// SPDX-License-Identifier: MIT
/// @title Dummy version of the supervision contract.

pragma solidity ^0.8.4;

contract DummySupervision {
    mapping(uint => uint) emptyMapping;

    /// @notice Returns the validation result of a token
    /// @param tokenId The ID of a token
    function getIsValidated(uint tokenId) external view returns (uint256) {
        return (emptyMapping[tokenId] + 1);
    }

    /// @notice starts new validation for content
    /// @param tokenId id of the content that will be validated
    /// @param score validation score of the content
    function createValidation(uint256 tokenId, uint256 score) external {}

    /// @notice allows validators to be fired or resigned
    /// @param demissionAddress is the address that will be revoked from validator role
    function dismissValidation(address demissionAddress) external {}

    /// @notice allows validators to dismiss a validation assignment
    /// @param demissionAddress id of the content that will be dismissed
    function dismissDispute(address demissionAddress) external {}
}
