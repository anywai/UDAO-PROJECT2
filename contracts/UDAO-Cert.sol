// SPDX-License-Identifier: MIT
/// @title The token given to the users who successfully complete a course.
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/draft-EIP712.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "./RoleController.sol";

contract UDAOCertificate is
    ERC721,
    EIP712,
    ERC721URIStorage,
    RoleController,
    Ownable
{
    string private constant SIGNING_DOMAIN = "UDAOCertMinter";
    string private constant SIGNATURE_VERSION = "1";

    using Counters for Counters.Counter;

    Counters.Counter private _tokenIdCounter;

    constructor(address irmAdress)
        ERC721("UDAO Certificate", "UDAO-Cert")
        EIP712(SIGNING_DOMAIN, SIGNATURE_VERSION)
        RoleController(irmAdress)
    {}

    /// @notice Represents an un-minted NFT, which has not yet been recorded into the blockchain.
    /// A signed voucher can be redeemed for a real NFT using the redeem function.
    struct CertificateVoucher {
        /// @notice The id of the token to be redeemed.
        uint256 tokenId;
        /// @notice The metadata URI to associate with this token.
        string uri;
        /// @notice Redeemer address
        address redeemer;
        /// @notice The name of the NFT
        string name;
        /// @notice The descriptiom of the NFT
        string description;
        /// @notice the EIP-712 signature of all other fields in the CertificateVoucher struct.
        bytes signature;
    }

    /// @notice Redeems a CertificateVoucher for an actual NFT, creating it in the process.
    /// @param voucher A signed CertificateVoucher that describes the NFT to be redeemed.
    function redeem(CertificateVoucher calldata voucher) public whenNotPaused {
        // make sure redeemer is redeeming
        require(voucher.redeemer == msg.sender, "You are not the redeemer");
        // make sure signature is valid and get the address of the signer
        address signer = _verify(voucher);
        require(
            IRM.hasRole(BACKEND_ROLE, signer),
            "Signature invalid or unauthorized"
        );

        _mint(voucher.redeemer, voucher.tokenId);
        _setTokenURI(voucher.tokenId, voucher.uri);
    }

    /// @notice Returns a hash of the given CertificateVoucher, prepared using EIP712 typed data hashing rules.
    /// @param voucher A CertificateVoucher to hash.
    function _hash(CertificateVoucher calldata voucher)
        internal
        view
        returns (bytes32)
    {
        return
            _hashTypedDataV4(
                keccak256(
                    abi.encode(
                        keccak256(
                            "CertificateVoucher(uint256 tokenId,string uri,address redeemer,string name,string description)"
                        ),
                        voucher.tokenId,
                        keccak256(bytes(voucher.uri)),
                        voucher.redeemer,
                        keccak256(bytes(voucher.name)),
                        keccak256(bytes(voucher.description))
                    )
                )
            );
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

    /// @notice Verifies the signature for a given CertificateVoucher, returning the address of the signer.
    /// @dev Will revert if the signature is invalid. Does not verify that the signer is authorized to mint NFTs.
    /// @param voucher A CertificateVoucher describing an unminted NFT.
    function _verify(CertificateVoucher calldata voucher)
        internal
        view
        returns (address)
    {
        bytes32 digest = _hash(voucher);
        return ECDSA.recover(digest, voucher.signature);
    }

    /// @notice Checks if token transfer is allowed. Reverts if not allowed.
    /// @param from The current token owner
    /// @param to Token to send to
    /// @param tokenId The id of the token to transfer
    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 tokenId
    ) internal virtual override {
        super._beforeTokenTransfer(from, to, tokenId);
        if (from != address(0) && to != address(0)) {
            require(
                IRM.hasRole(BACKEND_ROLE, msg.sender),
                "You don't have right to transfer token"
            );
        }
    }

    /// @notice transfer token in emergency
    /// @param from The current token owner
    /// @param to Token to send to
    /// @param tokenId The id of the token to transfer
    function emergencyTransfer(
        address from,
        address to,
        uint256 tokenId
    ) external onlyRole(BACKEND_ROLE) {
        _transfer(from, to, tokenId);
    }

    /// @notice burn tokens if owner does not want to have certificate any more
    /// @param tokenId The id of the token to burn
    function burn(uint256 tokenId) external {
        require(
            msg.sender == ownerOf(tokenId),
            "You are not the owner of the token"
        );
        _burn(tokenId);
    }

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
