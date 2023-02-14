// SPDX-License-Identifier: MIT
/// @title Content (UDAOC) interface.
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";

interface IUDAOC is IERC721 {
    function hasRole(
        bytes32 role,
        address account
    ) external view returns (bool);

    function getValidationResults(
        address account
    ) external view returns (uint[2] memory results);

    function getTotalValidation() external view returns (uint);

    function exists(uint tokenId) external view returns (bool);

    function isCoachingEnabled(uint tokenId) external view returns (bool);

    function getPriceContent(uint tokenId, uint partId) external view returns (uint);

    function getPartNumberOfContent(uint tokenId) external view returns (uint);
}
