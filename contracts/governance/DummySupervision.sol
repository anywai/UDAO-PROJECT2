// SPDX-License-Identifier: MIT
/// @title Dummy version of the supervision contract. This contract will be replaced at UDAO version 2.0.
/// @dev This contract only serves as a placeholder so that other contracts can be compiled and work.
import "../interfaces/IUDAOC.sol";
import "../interfaces/IPlatformTreasury.sol";
import "../interfaces/IRoleManager.sol";

pragma solidity ^0.8.4;

contract DummySupervision {
    ///@notice Placeholder empty mapping to disable hardhat warnings.
    mapping(uint => uint) emptyMapping;

    /// @notice Event emitted when a validation is created
    event ValidationCreated(uint256 indexed tokenId, uint256 score);

    /// @notice UDAOC (ERC721) Token is defines contents and used for content ownership
    IUDAOC udaoc;
    /// @notice Role manager contract address
    IRoleManager roleManager;

    constructor(address roleManagerAddress, address udaocAddress) {
        roleManager = IRoleManager(roleManagerAddress);
        udaoc = IUDAOC(udaocAddress);
    }

    /// @notice Returns the validation result of a token
    /// @param tokenId The ID of a token
    function getIsValidated(uint tokenId) external view returns (uint256) {
        return (emptyMapping[tokenId] + 1);
    }

    /// @notice starts new validation for content
    /// @param tokenId id of the content that will be validated
    /// @param score validation score of the content
    function createValidation(uint256 tokenId, uint256 score) external {
        emit ValidationCreated(tokenId, score);
    }

    /// @notice allows validators to be fired or resigned from a validation job
    /// @param demissionAddress is the address that will be revoked from validation job
    function dismissValidation(address demissionAddress) external {}

    /// @notice allows jurors to be fired or resigned from a dispute
    /// @param demissionAddress is the address that will be revoked from dispute
    function dismissDispute(address demissionAddress) external {}
}
