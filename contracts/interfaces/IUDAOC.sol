// SPDX-License-Identifier: MIT
/// @title Content (UDAOC) interface.
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";

interface IUDAOC is IERC721 {
    function exists(uint tokenId) external view returns (bool);

    function getPartNumberOfContent(uint tokenId) external view returns (uint);

    function isSellable(uint tokenId) external view returns (bool);

    function getContentParts(
        uint tokenId
    ) external view returns (uint256[] memory);
}
