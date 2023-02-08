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

    // tokenId => (partId => price), first part is the full price
    mapping(uint => mapping(uint => uint)) contentPrice;
     // tokenId => number of Parts
     mapping(uint => uint) private partNumberOfContent;

    /// @notice Represents an un-minted NFT, which has not yet been recorded into the blockchain.
    /// A signed voucher can be redeemed for a real NFT using the redeem function.
    struct ContentVoucher {
        /// @notice The id of the token to be redeemed.
        uint256 tokenId;
        /// @notice The price of the content, first price is the full price
        uint256[] contentPrice;
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
        //make sure redeemer is not banned
        require(!IRM.isBanned(msg.sender), "Redeemer is banned!");
        coachingEnabled[voucher.tokenId] = voucher.isCoachingEnabled;
        _mint(voucher.redeemer, voucher.tokenId);
        _setTokenURI(voucher.tokenId, voucher.uri);
        // save the content price
        uint partLength = voucher.contentPrice.length;
        partNumberOfContent[voucher.tokenId] = partLength;
        /// @dev If microlearning enabled for a content
        if(partLength > 1){
            /// @dev First index is the full price for the content
            uint priceLength = partLength + 1;
            for (uint i = 0; i < priceLength; i++) {
                contentPrice[voucher.tokenId][i] = voucher.contentPrice[i];
            }
        }else{ /// @dev If microlearning not enabled, only full content price
            contentPrice[voucher.tokenId][0] = voucher.contentPrice[0];
        }
        
    }

    /// @notice Allows instructers' to enable coaching for a specific content
    /// @param tokenId The content id
    function enableCoaching(uint tokenId) external whenNotPaused {
        require(
            ownerOf(tokenId) == msg.sender,
            "You are not the owner of token"
        );
        //make sure caller is kyced
        require(IRM.isKYCed(msg.sender), "You are not KYCed");
        //make sure caller is not banned
        require(!IRM.isBanned(msg.sender), "You were banned!");

        coachingEnabled[tokenId] = true;
    }

    /// @notice Allows instructers' to disable coaching for a specific content
    /// @param tokenId tokenId of the content that will be not coached
    function disableCoaching(uint tokenId) external whenNotPaused {
        require(
            ownerOf(tokenId) == msg.sender,
            "You are not the owner of token"
        );
        //make sure caller is kyced
        require(IRM.isKYCed(msg.sender), "You are not KYCed");
        //make sure caller is not banned
        require(!IRM.isBanned(msg.sender), "You were banned!");
        coachingEnabled[tokenId] = false;
    }

    /// @notice Returns if a coaching enabled for a token or not
    function isCoachingEnabled(uint tokenId) external view returns (bool) {
        return coachingEnabled[tokenId];
    }

    /// @notice returns the price of a specific content
    /// @param tokenId the content ID of the token
    /// @param partId the part ID of the token (microlearning), full content price if 0
    function getPriceContent(uint tokenId, uint partId)
        external
        view
        returns (uint)
    {
        return contentPrice[tokenId][partId];
    }

    /// @notice allows content owners to set full content price
    /// @param tokenId the content ID of the token
    /// @param _contentPrice the price to set
    function setFullPriceContent(uint tokenId, uint _contentPrice) external {
        require(ownerOf(tokenId) == msg.sender, "You are not the owner");
        //make sure caller is kyced
        require(IRM.isKYCed(msg.sender), "You are not KYCed");
        //make sure caller is not banned
        require(!IRM.isBanned(msg.sender), "You were banned!");

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
        require(partId != 0, "Full content price is set with setFullPriceContent");
        require(
                    partId < _getPartNumberOfContent(tokenId),
                    "Part does not exist!"
                );
        //make sure caller is kyced
        require(IRM.isKYCed(msg.sender), "You are not KYCed");
        //make sure caller is not banned
        require(!IRM.isBanned(msg.sender), "You were banned!");
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
        //make sure caller is kyced
        require(IRM.isKYCed(msg.sender), "You are not KYCed");
        //make sure caller is not banned
        require(!IRM.isBanned(msg.sender), "You were banned!");
        uint partLength = partId.length;
        for (uint i = 0; i < partLength; i++) {
            require(
                    partId[i] < _getPartNumberOfContent(tokenId),
                    "Part does not exist!"
            );
            require(partId[i] != 0, "Full content price is set with setBatchFullContent");
            contentPrice[tokenId][partId[i]] = _contentPrice[i];
        }
    }

    /// @notice allows content owners to set price for full content and multiple parts in a content 
    /// @param tokenId the content ID of the token
    /// @param _contentPrice the price to set, first price is for full content price
    function setBatchFullContent(
        uint tokenId,
        uint[] calldata partId,
        uint[] calldata _contentPrice
    ) external {
        require(ownerOf(tokenId) == msg.sender, "You are not the owner");
        //make sure caller is kyced
        require(IRM.isKYCed(msg.sender), "You are not KYCed");
        //make sure caller is not banned
        require(!IRM.isBanned(msg.sender), "You were banned!");
        uint partLength = partId.length;
        require(partId[0] == 0, "First index of partId should be zero to set the full content price. Use setBatchPartialContent if you don't want to set the full content price");
        for (uint i = 0; i < partLength; i++) {
            require(
                    partId[i] < _getPartNumberOfContent(tokenId),
                    "Part does not exist!"
            );
            contentPrice[tokenId][partId[i]] = _contentPrice[i];
        }
    }

    /// @notice Returns the part numbers that a content has
    function _getPartNumberOfContent(uint tokenId) internal view returns (uint) {
         return partNumberOfContent[tokenId];
     }

    /// @notice Returns the part numbers that a content has
    function getPartNumberOfContent(uint tokenId) external view returns (uint) {
         return partNumberOfContent[tokenId];
     }

    /// @notice A content can be completely removed by the owner
    /// @param tokenId The token ID of a content
    function burn(uint256 tokenId) external whenNotPaused {
        require(
            ownerOf(tokenId) == msg.sender,
            "You are not the owner of token"
        );
        //make sure caller is kyced
        require(IRM.isKYCed(msg.sender), "You are not KYCed");
        //make sure caller is not banned
        require(!IRM.isBanned(msg.sender), "You were banned!");
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
