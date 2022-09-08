// SPDX-License-Identifier: MIT
/// @title The token given to the users who successfully complete a course.
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

contract UDAOCertificate is ERC721, ERC721URIStorage, Ownable {
    using Counters for Counters.Counter;

    Counters.Counter private _tokenIdCounter;

    constructor() ERC721("UDAO Certificate", "UDAO-Cert") {}

    function safeMint(address to, string memory uri) public onlyOwner {
        /// @notice mints certificate token to `to` address
        /// @param to address of certificate owner
        /// @param uri URI address of certificate
        uint256 tokenId = _tokenIdCounter.current();
        _tokenIdCounter.increment();
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, uri);
    }

    // The following functions are overrides required by Solidity.

    /// @dev her token'ın kendi URI'yı olacağı için override kısmına taşıyıp comment out ettim
    // function _baseURI() internal view override returns (string memory) {
    //     return super._baseURI();
    // }

    function _burn(uint256 tokenId)
        internal
        override(ERC721, ERC721URIStorage)
    {
        super._burn(tokenId);
    }

    function tokenURI(uint256 tokenId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (string memory)
    {
        return super.tokenURI(tokenId);
    }
}
