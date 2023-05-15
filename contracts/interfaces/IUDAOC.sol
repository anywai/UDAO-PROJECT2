// SPDX-License-Identifier: MIT
/// @title Content (UDAOC) interface.
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";

interface IUDAOC is IERC721 {
    function exists(uint tokenId) external view returns (bool);

    function coachingEnabled(uint tokenId) external view returns (bool);

    function coachingRefundable(uint tokenId) external view returns (bool);

    function getContentPriceAndCurrency(
        uint tokenId,
        uint partId
    ) external view returns (uint256, bytes32);

    function getCoachingPriceAndCurrency(
        uint tokenId
    ) external view returns (uint256, bytes32);

    function getPartNumberOfContent(uint tokenId) external view returns (uint);
}
