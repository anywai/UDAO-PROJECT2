// SPDX-License-Identifier: MIT
/// @title UDAOC (UDAO-Content) token.
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/draft-EIP712.sol";
import "./RoleController.sol";

contract UDAOContent is ERC721, EIP712, ERC721URIStorage, RoleController {
    string private constant SIGNING_DOMAIN = "UDAOCMinter";
    string private constant SIGNATURE_VERSION = "1";

    /// @param rmAddress The address of the deployed role manager
    constructor(
        address rmAddress
    )
        ERC721("UDAO Content", "UDAOC")
        EIP712(SIGNING_DOMAIN, SIGNATURE_VERSION)
        RoleController(rmAddress)
    {}

    /// @notice Represents an un-minted NFT, which has not yet been recorded into the blockchain.
    /// A signed voucher can be redeemed for a real NFT using the redeem function.
    struct ContentVoucher {
        /// @notice The id of the token to be redeemed.
        uint256 tokenId;
        /// @notice The metadata URI to associate with this token.
        string uri;
        /// @notice Address of the redeemer
        address redeemer;
        /// @notice Whether learner can buy coaching or not
        bool isCoachingEnabled;
        /// @notice The name of the NFT
        string name;
        /// @notice The description of the NFT
        string description;
        /// @notice the EIP-712 signature of all other fields in the ContentVoucher struct.
        bytes signature;
    }

    // tokenId => is coaching service buyable
    mapping(uint => bool) coachingEnabled;

    /// @notice Redeems a ContentVoucher for an actual NFT, creating it in the process.
    /// @param voucher A signed ContentVoucher that describes the NFT to be redeemed.
    function redeem(ContentVoucher calldata voucher) public {
        // make sure redeemer is redeeming
        require(voucher.redeemer == msg.sender, "You are not the redeemer");

        // make sure signature is valid and get the address of the signer
        address signer = _verify(voucher);
        require(
            IRM.hasRole(BACKEND_ROLE, signer),
            "Signature invalid or unauthorized"
        );
        coachingEnabled[voucher.tokenId] = voucher.isCoachingEnabled;
        _mint(voucher.redeemer, voucher.tokenId);
        _setTokenURI(voucher.tokenId, voucher.uri);
    }

    /// @notice Allows instructers' to enable coaching for a specific content
    /// @param tokenId The content id
    function enableCoaching(uint tokenId) external {
        require(
            ownerOf(tokenId) == msg.sender,
            "You are not the owner of token"
        );
        coachingEnabled[tokenId] = true;
    }

    /// @notice Allows instructers' to disable coaching for a specific content
    /// @param tokenId tokenId of the content that will be not coached
    function disableCoaching(uint tokenId) external {
        require(
            ownerOf(tokenId) == msg.sender,
            "You are not the owner of token"
        );
        coachingEnabled[tokenId] = false;
    }

    function isCoachingEnabled(uint tokenId) external view returns (bool) {
        return coachingEnabled[tokenId];
    }

    /// @notice Returns a hash of the given ContentVoucher, prepared using EIP712 typed data hashing rules.
    /// @param voucher A ContentVoucher to hash.
    function _hash(
        ContentVoucher calldata voucher
    ) internal view returns (bytes32) {
        return
            _hashTypedDataV4(
                keccak256(
                    abi.encode(
                        keccak256(
                            "ContentVoucher(uint256 tokenId,string uri,address redeemer,bool isCoachingEnabled,string name,string description)"
                        ),
                        voucher.tokenId,
                        keccak256(bytes(voucher.uri)),
                        voucher.redeemer,
                        voucher.isCoachingEnabled,
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

    /// @notice Verifies the signature for a given ContentVoucher, returning the address of the signer.
    /// @dev Will revert if the signature is invalid. Does not verify that the signer is authorized to mint NFTs.
    /// @param voucher A ContentVoucher describing an unminted NFT.
    function _verify(
        ContentVoucher calldata voucher
    ) internal view returns (address) {
        bytes32 digest = _hash(voucher);
        return ECDSA.recover(digest, voucher.signature);
    }

    /// @notice A content can be completely removed if it is against our terms of policy
    /// @param tokenId The token ID of a content
    /// TODO Bunu administrator roller yerine juror'lara mı versek. Bilmiyorum çok fazla güç onlar içinde sanki. Karasız kaldım.
    function burn(uint256 tokenId) external onlyRoles(administrator_roles) {
        _burn(tokenId);
    }

    function _burn(
        uint256 tokenId
    ) internal override(ERC721, ERC721URIStorage) {
        super._burn(tokenId);
    }

    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 tokenId
    ) internal virtual override {
        /// @notice make sure the transfer is made to a KYCed wallet
        /// TODO Removing KYC from here could be a problem.
        super._beforeTokenTransfer(from, to, tokenId);
        if (to != address(0)) {
            require(IRM.isKYCed(to), "Receiver is not KYCed!");
            require(!IRM.isBanned(to), "Receiver is banned!");
        }
        if (from != address(0)) {
            require(IRM.isKYCed(from), "Sender is not KYCed!");
            require(!IRM.isBanned(from), "Sender is banned!");
        }
    }

    /// @notice Allows off-chain check if a token(content) exists
    function exists(uint tokenId) external view returns (bool) {
        return _exists(tokenId);
    }

    // The following functions are overrides required by Solidity.

    function tokenURI(
        uint256 tokenId
    ) public view override(ERC721, ERC721URIStorage) returns (string memory) {
        return super.tokenURI(tokenId);
    }

    function supportsInterface(
        bytes4 interfaceId
    ) public view override(ERC721) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}
