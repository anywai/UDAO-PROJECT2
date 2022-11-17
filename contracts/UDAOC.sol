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

    // tokenId => price
    mapping(uint => mapping(uint => uint)) contentPrice;

    /// @param rmAddress The address of the deployed role manager
    constructor(address rmAddress)
        ERC721("UDAO Content", "UDAOC")
        EIP712(SIGNING_DOMAIN, SIGNATURE_VERSION)
        RoleController(rmAddress)
    {}

    /// @notice Represents an un-minted NFT, which has not yet been recorded into the blockchain.
    /// A signed voucher can be redeemed for a real NFT using the redeem function.
    struct ContentVoucher {
        /// @notice The id of the token to be redeemed.
        uint256 tokenId;
        /// @notice The price of the content
        uint256[] contentPrice;
        /// @notice The metadata URI to associate with this token.
        string uri;
        /// @notice Address of the redeemer
        address redeemer;
        /// @notice The name of the NFT
        string name;
        /// @notice The descriptiom of the NFT
        string description;
        /// @notice the EIP-712 signature of all other fields in the ContentVoucher struct.
        bytes signature;
    }

    /// @notice Redeems a ContentVoucher for an actual NFT, creating it in the process.
    /// @param voucher A signed ContentVoucher that describes the NFT to be redeemed.
    function redeem(ContentVoucher calldata voucher) public {
        // make sure redeemer is redeeming
        require(voucher.redeemer == msg.sender, "You are not the redeemer");

        /// @dev KYC control is already done at transfer
        //make sure redeemer is kyced
        // require(irm.getKYC(msg.sender), "You are not KYCed");

        // make sure signature is valid and get the address of the signer
        address signer = _verify(voucher);
        require(
            IRM.hasRole(BACKEND_ROLE, signer),
            "Signature invalid or unauthorized"
        );

        _mint(voucher.redeemer, voucher.tokenId);
        _setTokenURI(voucher.tokenId, voucher.uri);

        // save the content price
        uint partLength = voucher.contentPrice.length;
        for (uint i = 0; i < partLength; i++) {
            contentPrice[voucher.tokenId][i] = voucher.contentPrice[i];
        }
    }

    /// @notice Returns a hash of the given ContentVoucher, prepared using EIP712 typed data hashing rules.
    /// @param voucher A ContentVoucher to hash.
    function _hash(ContentVoucher calldata voucher)
        internal
        view
        returns (bytes32)
    {
        return
            _hashTypedDataV4(
                keccak256(
                    abi.encode(
                        keccak256(
                            "ContentVoucher(uint256 tokenId,uint256[] contentPrice,string uri,address redeemer,string name,string description)"
                        ),
                        voucher.tokenId,
                        keccak256(abi.encodePacked(voucher.contentPrice)),
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

    /// @notice Verifies the signature for a given ContentVoucher, returning the address of the signer.
    /// @dev Will revert if the signature is invalid. Does not verify that the signer is authorized to mint NFTs.
    /// @param voucher A ContentVoucher describing an unminted NFT.
    function _verify(ContentVoucher calldata voucher)
        internal
        view
        returns (address)
    {
        bytes32 digest = _hash(voucher);
        return ECDSA.recover(digest, voucher.signature);
    }

    function burn(uint256 tokenId) external onlyRoles(administrator_roles) {
        _burn(tokenId);
    }

    function _burn(uint256 tokenId)
        internal
        override(ERC721, ERC721URIStorage)
    {
        super._burn(tokenId);
    }

    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 tokenId
    ) internal virtual override {
        /// @notice make sure the transfer is made to a KYCed wallet
        super._beforeTokenTransfer(from, to, tokenId);
        if (to != address(0)) {
            require(IRM.getKYC(to), "Receiver is not KYCed!");
            require(!IRM.getBan(to), "Receiver is banned!");
        }
        if (from != address(0)) {
            require(IRM.getKYC(from), "Sender is not KYCed!");
            require(!IRM.getBan(from), "Sender is banned!");
        }
    }

    /// @notice returns the price of a specific content
    /// @param tokenId the content ID of the token
    /// @param partId the part ID of the token (microlearning)
    function getPriceContent(uint tokenId, uint partId)
        external
        view
        returns (uint)
    {
        return contentPrice[tokenId][partId];
    }

    /// @notice allows content owners to set content price
    /// @param tokenId the content ID of the token
    /// @param _contentPrice the price to set
    function setPriceContent(uint tokenId, uint _contentPrice) external {
        require(ownerOf(tokenId) == msg.sender, "You are not the owner");
        contentPrice[tokenId][0] = _contentPrice;
    }

    /// @notice allows content owners to set price for a part in a content (microlearning)
    /// @param tokenId the content ID of the token
    /// @param _contentPrice the price to set
    function setPartialContent(
        uint tokenId,
        uint partId,
        uint _contentPrice
    ) external {
        require(ownerOf(tokenId) == msg.sender, "You are not the owner");
        contentPrice[tokenId][partId] = _contentPrice;
    }

    /// @notice allows content owners to set price for multiple parts in a content (microlearning)
    /// @param tokenId the content ID of the token
    /// @param _contentPrice the price to set
    function setBatchPartialContent(
        uint tokenId,
        uint[] calldata partId,
        uint[] calldata _contentPrice
    ) external {
        require(ownerOf(tokenId) == msg.sender, "You are not the owner");
        uint partLength = partId.length;
        for (uint i = 0; i < partLength; i++) {
            contentPrice[tokenId][partId[i]] = _contentPrice[i];
        }
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
