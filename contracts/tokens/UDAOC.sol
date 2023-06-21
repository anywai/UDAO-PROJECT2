// SPDX-License-Identifier: MIT
/// @title UDAOC (UDAO-Content) token.
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "../RoleController.sol";
import "../interfaces/IPriceGetter.sol";
import "../interfaces/IUDAOC.sol";

contract UDAOContent is IUDAOC, ERC721, ERC721URIStorage, RoleController {
    using Counters for Counters.Counter;
    Counters.Counter private _tokenIds;

    /// @param irmAdress The address of the deployed role manager
    constructor(
        address irmAdress
    ) ERC721("UDAO Content", "UDAOC") RoleController(irmAdress) {}

    // tokenId => (partId => price), first part is the full price
    mapping(uint => mapping(uint => uint)) public contentPrice;
    // tokenId => currency name
    mapping(uint => bytes32) currencyName;
    // tokenId => number of Parts
    mapping(uint => uint) private partNumberOfContent;

    // tokenId => is coaching service buyable
    mapping(uint => bool) public coachingEnabled;
    // tokenId => coaching price
    mapping(uint => uint) coachingPrice;
    // tokenId => coaching currency
    mapping(uint => bytes32) coachingCurrency;
    // tokenId => is coaching refundable
    mapping(uint => bool) public coachingRefundable;

    event newPartAdded(uint tokenId, uint newPartId, uint newPartPrice);

    // TODO No name or description for individual NFT. Is this a problem?
    /// @notice Redeems a ContentVoucher for an actual NFT, creating it in the process.
    /// @param _contentPrice The price of the content, first price is the full price
    /// @param _currencyName Name of the selling currency
    /// @param _uri The metadata URI to associate with this token.
    /// @param _redeemer Address of the redeemer
    /// @param _coachingPrice The price of the coaching service
    /// @param _coachingCurrencyName Name of the coaching currency
    /// @param _isCoachingEnabled Whether learner can buy coaching or not
    /// @param _isCoachingRefundable Whether coaching is refundable or not
    function redeem(
        uint256[] calldata _contentPrice,
        string calldata _currencyName,
        string calldata _uri,
        address _redeemer,
        uint256 _coachingPrice,
        string calldata _coachingCurrencyName,
        bool _isCoachingEnabled,
        bool _isCoachingRefundable
    ) public whenNotPaused {
        uint tokenId = _tokenIds.current();
        // make sure redeemer is redeeming
        require(_redeemer == msg.sender, "You are not the redeemer");
        //make sure redeemer is kyced
        require(IRM.isKYCed(msg.sender), "You are not KYCed");
        //make sure redeemer is not banned
        require(!IRM.isBanned(msg.sender), "Redeemer is banned!");
        coachingEnabled[tokenId] = _isCoachingEnabled;
        coachingRefundable[tokenId] = _isCoachingRefundable;

        // save the content price (it should test removing for partLength)
        uint partLength = _contentPrice.length;
        partNumberOfContent[tokenId] = partLength;

        currencyName[tokenId] = keccak256(abi.encodePacked(_currencyName));

        coachingPrice[tokenId] = _coachingPrice;
        coachingCurrency[tokenId] = keccak256(
            abi.encodePacked(_coachingCurrencyName)
        );

        /// @dev First index is the full price for the content
        for (uint i = 0; i < partLength; i++) {
            contentPrice[tokenId][i] = _contentPrice[i];
        }

        _mint(_redeemer, tokenId);
        _setTokenURI(tokenId, _uri);
        _tokenIds.increment();
    }

    /// Allows token owners to burn the token
    // TODO Content should be marked as not validated
    function modifyContent(
        uint tokenId,
        uint256[] calldata _contentPrice,
        string calldata _currencyName,
        string calldata _uri
    ) external whenNotPaused {
        // score bilgisini çek
        // bool defaultu false
        // score hesaplandı = SkorContractı.scoreHesaplandı(tokenId);
        // require(score hesaplandı == true, "score henüz hesaplanmadı");
        // uint score = SkorContractı.getScore(tokenId);
        // if(score > 0){createValidation}; // score 0 dan büyükse validasyon oluştur,0 ise sadece order değişti
        require(
            ownerOf(tokenId) == msg.sender,
            "You are not the owner of token"
        );
        //make sure caller is kyced
        require(IRM.isKYCed(msg.sender), "You are not KYCed");
        //make sure caller is not banned
        require(!IRM.isBanned(msg.sender), "You are banned");

        // Burn the token
        _burn(tokenId);

        // Create the new token
        // save the content price (it should test removing for partLength)
        uint partLength = _contentPrice.length;
        partNumberOfContent[tokenId] = partLength;

        currencyName[tokenId] = keccak256(abi.encodePacked(_currencyName));
        /// @dev First index is the full price for the content
        for (uint i = 0; i < partLength; i++) {
            contentPrice[tokenId][i] = _contentPrice[i];
        }

        _mint(msg.sender, tokenId);
        _setTokenURI(tokenId, _uri);
    }

    /// @dev Allows content owners to insert new parts
    /// @param tokenId The id of the token
    /// @param newPartId The id of the new part
    /// @param newPartPrice The price of the new part
    function addNewPart(
        uint tokenId,
        uint newPartId,
        uint newPartPrice,
        string calldata _currencyName
    ) external whenNotPaused {
        require(
            ownerOf(tokenId) == msg.sender,
            "You are not the owner of token"
        );
        //make sure caller is kyced
        require(IRM.isKYCed(msg.sender), "You are not KYCed");
        //make sure caller is not banned
        require(!IRM.isBanned(msg.sender), "You are banned");
        // make sure currency name is the same
        require(
            keccak256(abi.encodePacked(_currencyName)) == currencyName[tokenId],
            "Original currency name is not the same as the new currency name"
        );
        // make sure new part id is not bigger than the number of parts
        require(
            newPartId <= partNumberOfContent[tokenId],
            "Part id is bigger than the total number of parts"
        );
        // make sure new part is not the zero part since it is the full price
        require(newPartId != 0, "0 sent as new part id, parts starts from 1");
        // if new part is the last part, just push it
        if (newPartId == partNumberOfContent[tokenId]) {
            contentPrice[tokenId][newPartId] = newPartPrice;
            partNumberOfContent[tokenId]++;
        } else {
            // if new part is not the last part, shift the parts
            _insertNewPart(tokenId, newPartId, newPartPrice);
        }
        emit newPartAdded(tokenId, newPartId, newPartPrice);
    }

    /// @dev Internal function to insert a new part in between existing parts
    /// @param tokenId The id of the token
    /// @param newPartId The id of the new part
    /// @param newPartPrice The price of the new part
    function _insertNewPart(
        uint tokenId,
        uint newPartId,
        uint newPartPrice
    ) internal {
        require(newPartId <= partNumberOfContent[tokenId], "Invalid index");
        uint256[] memory prices = new uint256[](3); // Change to dynamic memory array

        for (uint i = 0; i < 3; i++) {
            prices[i] = contentPrice[tokenId][i];
        }

        // Create a new array with an increased length
        uint[] memory newArray = new uint[](prices.length + 1);

        // Copy the elements before the desired index
        for (uint i = 0; i < newPartId; i++) {
            newArray[i] = prices[i];
        }

        // Insert the new value at the desired index
        newArray[newPartId] = newPartPrice;

        // Copy the remaining elements from the original array
        for (uint i = newPartId; i < prices.length; i++) {
            newArray[i + 1] = prices[i];
        }

        // Replace the original array with the new array
        prices = newArray;

        // replace content price mapping
        for (uint i = 0; i < prices.length; i++) {
            contentPrice[tokenId][i] = prices[i];
        }

        // save the content price
        uint partLength = prices.length;
        partNumberOfContent[tokenId] = partLength;
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
    /// @param tokenId the content ID of the token
    function isCoachingEnabled(uint tokenId) external view returns (bool) {
        return coachingEnabled[tokenId];
    }

    /// @notice sets the coaching price and currency of a specific content
    /// @param tokenId the content ID of the token
    /// @param price the price of the coaching
    /// @param currency the currency of the coaching
    function setCoachingPriceAndCurrency(
        uint tokenId,
        uint price,
        bytes32 currency
    ) external whenNotPaused {
        require(
            ownerOf(tokenId) == msg.sender,
            "You are not the owner of token"
        );
        //make sure caller is kyced
        require(IRM.isKYCed(msg.sender), "You are not KYCed");
        //make sure caller is not banned
        require(!IRM.isBanned(msg.sender), "You were banned!");
        coachingPrice[tokenId] = price;
        coachingCurrency[tokenId] = currency;
    }

    /// @notice returns the coaching price and currency of a specific content
    /// @param tokenId the content ID of the token
    function getCoachingPriceAndCurrency(
        uint tokenId
    ) external view returns (uint256, bytes32) {
        return (coachingPrice[tokenId], coachingCurrency[tokenId]);
    }

    /// @notice returns the price of a specific content
    /// @param tokenId the content ID of the token
    /// @param partId the part ID of the token (microlearning), full content price if 0
    function getContentPriceAndCurrency(
        uint tokenId,
        uint partId
    ) external view returns (uint256, bytes32) {
        return (contentPrice[tokenId][partId], currencyName[tokenId]);
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
        require(
            partId != 0,
            "Full content price is set with setFullPriceContent"
        );
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
            require(
                partId[i] != 0,
                "Full content price is set with setBatchFullContent"
            );
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
        require(
            partId[0] == 0,
            "First index of partId should be zero to set the full content price. Use setBatchPartialContent if you don't want to set the full content price"
        );
        for (uint i = 0; i < partLength; i++) {
            require(
                partId[i] < _getPartNumberOfContent(tokenId),
                "Part does not exist!"
            );
            contentPrice[tokenId][partId[i]] = _contentPrice[i];
        }
    }

    /// @notice Returns the part numbers that a content has
    function _getPartNumberOfContent(
        uint tokenId
    ) internal view returns (uint) {
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
    ) public view override(ERC721, IERC165) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}
