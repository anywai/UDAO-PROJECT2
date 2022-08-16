// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "./IKYC.sol";

contract UDAOContent is ERC721, ERC721URIStorage, Ownable {
    using Counters for Counters.Counter;

    IKYC ikyc;

    Counters.Counter private _tokenIdCounter;

    mapping(uint => uint) contentPrice;

    constructor(address _kycAddress) ERC721("UDAO Content", "UDAOC-O") {
        ikyc = IKYC(_kycAddress);
    }

    function _baseURI() internal pure override returns (string memory) {
        return "ipfs://CID/";
    }

    function safeMint(
        address to,
        string memory uri,
        uint _contentPrice
    ) public {
        uint256 tokenId = _tokenIdCounter.current();
        _tokenIdCounter.increment();
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, uri);
        contentPrice[tokenId] = _contentPrice;
    }

    // The following functions are overrides required by Solidity.

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

    // Getters
    function getPriceContent(uint tokenId) external view returns (uint) {
        return contentPrice[tokenId];
    }

    // Setters

    function setPriceContent(uint tokenId, uint _contentPrice) external {
        require(ownerOf(tokenId) == msg.sender);
        contentPrice[tokenId] = _contentPrice;
    }

    function setKycContractAddress(address _kycAddress) external onlyOwner {
        ikyc = IKYC(address(_kycAddress));
    }
}
