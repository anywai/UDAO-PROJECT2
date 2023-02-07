// SPDX-License-Identifier: MIT
/// @title UDAOC (UDAO-Content) token.
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "./RoleController.sol";

contract UDAOContent is ERC721, ERC721URIStorage, RoleController {

    /// @param irmAdress The address of the deployed role manager
    constructor(
        address irmAdress
    )
        ERC721("UDAO Content", "UDAOC")
        RoleController(irmAdress)
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
    }

    // tokenId => is coaching service buyable
    mapping(uint => bool) coachingEnabled;

    /// @notice Redeems a ContentVoucher for an actual NFT, creating it in the process.
    /// @param voucher A signed ContentVoucher that describes the NFT to be redeemed.
    function redeem(ContentVoucher calldata voucher) public whenNotPaused {
        // make sure redeemer is redeeming
        require(voucher.redeemer == msg.sender, "You are not the redeemer");
        //make sure redeemer is kyced
        require(IRM.isKYCed(msg.sender), "You are not KYCed");
        coachingEnabled[voucher.tokenId] = voucher.isCoachingEnabled;
        _mint(voucher.redeemer, voucher.tokenId);
        _setTokenURI(voucher.tokenId, voucher.uri);
    }

    /// @notice Allows instructers' to enable coaching for a specific content
    /// @param tokenId The content id
    function enableCoaching(uint tokenId) external whenNotPaused {
        require(
            ownerOf(tokenId) == msg.sender,
            "You are not the owner of token"
        );
        coachingEnabled[tokenId] = true;
    }

    /// @notice Allows instructers' to disable coaching for a specific content
    /// @param tokenId tokenId of the content that will be not coached
    function disableCoaching(uint tokenId) external whenNotPaused {
        require(
            ownerOf(tokenId) == msg.sender,
            "You are not the owner of token"
        );
        coachingEnabled[tokenId] = false;
    }

    /// @notice Returns if a coaching enabled for a token or not
    function isCoachingEnabled(uint tokenId) external view returns (bool) {
        return coachingEnabled[tokenId];
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

    /// @notice A content can be completely removed by the owner
    /// @param tokenId The token ID of a content
    function burn(uint256 tokenId) external whenNotPaused {
        require(
            ownerOf(tokenId) == msg.sender,
            "You are not the owner of token"
        );
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
