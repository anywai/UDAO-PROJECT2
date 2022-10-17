// SPDX-License-Identifier: MIT
/// @title UDAOC (UDAO-Content) token.
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/draft-EIP712.sol";
import "./IKYC.sol";
import "./RoleController.sol";

contract UDAOContent is ERC721, EIP712, ERC721URIStorage, RoleController{
    IKYC ikyc;

    string private constant SIGNING_DOMAIN = "UDAOCMinter";
    string private constant SIGNATURE_VERSION = "1";

    // tokenId => price
    mapping(uint => uint) contentPrice;

    constructor(address _kycAddress, address irmAdress) 
    ERC721("UDAO Content", "UDAOC")
    EIP712(SIGNING_DOMAIN, SIGNATURE_VERSION)
    RoleController(irmAdress)
    {
        ikyc = IKYC(_kycAddress);
    }

    /// @notice Represents an un-minted NFT, which has not yet been recorded into the blockchain.
    /// A signed voucher can be redeemed for a real NFT using the redeem function.
    struct NFTVoucher {
        /// @notice The id of the token to be redeemed. Must be unique - if another token with this ID already exists, the redeem function will revert.
        uint256 tokenId;
        /// @notice The price of the content
        uint256 contentPrice;
        /// @notice The metadata URI to associate with this token.
        string uri;
        /// @notice The name of the NFT
        string name;
        /// @notice The descriptiom of the NFT
        string description;
        /// @notice the EIP-712 signature of all other fields in the NFTVoucher struct. For a voucher to be valid, it must be signed by an account with the MINTER_ROLE.
        bytes signature;
    }

    /// @notice Redeems an NFTVoucher for an actual NFT, creating it in the process.
    /// @param redeemer The address of the account which will receive the NFT upon success.
    /// @param voucher A signed NFTVoucher that describes the NFT to be redeemed.
    function redeem(address redeemer, NFTVoucher calldata voucher) public {
        // make sure signature is valid and get the address of the signer
        address signer = _verify(voucher);

        require(irm.hasRole(BACKEND_ROLE, signer), "Signature invalid or unauthorized");

        _mint(redeemer, voucher.tokenId);
        _setTokenURI(voucher.tokenId, voucher.uri);

        // save the content price
        contentPrice[voucher.tokenId] = voucher.contentPrice;
    }

    /// @notice Returns a hash of the given NFTVoucher, prepared using EIP712 typed data hashing rules.
    /// @param voucher An NFTVoucher to hash.
    function _hash(NFTVoucher calldata voucher) internal view returns (bytes32) {
    return _hashTypedDataV4(keccak256(abi.encode(
        keccak256("UDAOCMinter(uint256 tokenId,uint256 contentPrice,string uri,string name,string description)"),
        voucher.tokenId,
        voucher.contentPrice,
        keccak256(bytes(voucher.uri)),
        keccak256(bytes(voucher.name)),
        keccak256(bytes(voucher.description))
        )));
    }

    /// @notice Returns the chain id of the current blockchain.
    /// @dev This is used to workaround an issue with ganache returning different values from the on-chain chainid() function and
    ///  the eth_chainId RPC method. See https://github.com/protocol/nft-website/issues/121 for context.
    function getChainID() external view returns (uint256) {
        uint256 id;
        assembly {
        id := chainid()
        }
        return id;
    }

    /// @notice Verifies the signature for a given NFTVoucher, returning the address of the signer.
    /// @dev Will revert if the signature is invalid. Does not verify that the signer is authorized to mint NFTs.
    /// @param voucher An NFTVoucher describing an unminted NFT.
    function _verify(NFTVoucher calldata voucher) internal view returns (address) {
        bytes32 digest = _hash(voucher);
        return ECDSA.recover(digest, voucher.signature);
    }

    function _burn(uint256 tokenId)
        internal
        override(ERC721, ERC721URIStorage)
    {
        super._burn(tokenId);
    }

    // Getters
    function getPriceContent(uint tokenId) external view returns (uint) {
        /// @notice returns the price of a specific content
        /// @param tokenId the content ID of the token
        return contentPrice[tokenId];
    }

    // Setters

    function setPriceContent(uint tokenId, uint _contentPrice) external {
        /// @notice allows content owners to set content price
        /// @param tokenId the content ID of the token
        /// @param _contentPrice the price to set
        require(ownerOf(tokenId) == msg.sender);
        contentPrice[tokenId] = _contentPrice;
    }

    function setKycContractAddress(address _kycAddress)
        external
    {
        ikyc = IKYC(address(_kycAddress));
    }

    // The following functions are overrides required by Solidity.

    function tokenURI(uint256 tokenId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (string memory)
    {
        return super.tokenURI(tokenId);
    }
    
    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
