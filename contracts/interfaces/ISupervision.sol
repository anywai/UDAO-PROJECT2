// SPDX-License-Identifier: MIT
/// @title Interface of supervision contract
pragma solidity ^0.8.4;

interface ISupervision {
    function getIsValidated(uint tokenId) external view returns (uint256);

    function createValidation(uint256 tokenId, uint256 score) external;

    function dismissValidation(address demissionAdress) external;

    function dismissDispute(address demissionAdress) external;
}
