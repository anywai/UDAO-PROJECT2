// SPDX-License-Identifier: MIT
/// @title UDAOC (UDAO-Content) token.
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "./IKYC.sol";
import "./RoleManager.sol";

contract UDAOContent is ERC721, ERC721URIStorage, RoleManager {
    using Counters for Counters.Counter;

    IKYC ikyc;

    Counters.Counter private _tokenIdCounter;

    string public defaultURI;

    // tokenId => price
    mapping(uint => uint) contentPrice;

    constructor(address _kycAddress) ERC721("UDAO Content", "UDAOC") {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        ikyc = IKYC(_kycAddress);
    }

    /// @dev add KYC control
    /// change to lazy mint
    function safeMint(
        address to,
        string memory uri,
        uint _contentPrice
    ) public {
        /// @notice mints content token to `to` address
        /// @param to address of content owner
        /// @param uri URI address of content
        /// @param _contentPrice price of content
        uint256 tokenId = _tokenIdCounter.current();
        _tokenIdCounter.increment();
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, uri);
        contentPrice[tokenId] = _contentPrice;
    }

    // The following functions are overrides required by Solidity.

    /// @dev her token'ın kendi URI'yı olacağı için override kısmına taşıyıp comment out ettim
    // function _baseURI() internal view override returns (string memory) {
    //     return defaultURI;
    // }

    // function setBaseURI(string calldata _newURI)
    //     external
    //     onlyRole(DEFAULT_ADMIN_ROLE)
    // {
    //     defaultURI = _newURI;
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

    // Getters
    function getPriceContent(uint tokenId) external view returns (uint) {
        return contentPrice[tokenId];
    }

    // Setters

    function setPriceContent(uint tokenId, uint _contentPrice) external {
        require(ownerOf(tokenId) == msg.sender);
        contentPrice[tokenId] = _contentPrice;
    }

    function setKycContractAddress(address _kycAddress)
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        ikyc = IKYC(address(_kycAddress));
    }

    // The following functions are overrides required by Solidity.

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, AccessControl)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
