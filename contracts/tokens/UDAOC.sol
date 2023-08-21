// SPDX-License-Identifier: MIT
/// @title UDAOC (UDAO-Content) token.
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/draft-EIP712.sol";
import "../ContractManager.sol";
import "../RoleController.sol";
import "../interfaces/IPriceGetter.sol";
import "../interfaces/IUDAOC.sol";
import "../interfaces/ISupervision.sol";

contract UDAOContent is
    IUDAOC,
    ERC721,
    EIP712,
    ERC721URIStorage,
    RoleController
{
    ContractManager public contractManager;
    using Counters for Counters.Counter;
    Counters.Counter private _tokenIds;

    string private constant SIGNING_DOMAIN = "UDAOCMinter";
    string private constant SIGNATURE_VERSION = "1";

    ISupervision ISupVis;

    /// @param irmAdress The address of the deployed role manager
    constructor(
        address irmAdress
    )
        ERC721("UDAO Content", "UDAOC")
        RoleController(irmAdress)
        EIP712(SIGNING_DOMAIN, SIGNATURE_VERSION)
    {
        //contractManager = ContractManager(_contractManager);
        //ISupVis = ISupervision(contractManager.ISupVisAddress());
    }

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

    bool isKYCRequiredToCreateContent = false;

    event newPartAdded(uint tokenId, uint newPartId, uint newPartPrice);
    /// @notice This event is triggered if the contract manager updates the addresses.
    event AddressesUpdated(address isupvis);

    ///@notice A signed voucher can be redeemed for a real content NFT using the redeem function.
    struct RedeemVoucher {
        /// @notice The date until the voucher is valid
        uint256 validUntil;
        /// @notice The price of the content, first price is the full price
        uint256[] _contentPrice;
        /// @notice Token id of the content, not used if new content creation
        uint256 tokenId;
        /// @notice Name of the selling currency
        string _currencyName;
        /// @notice The metadata URI to associate with this token.
        string _uri;
        /// @notice Address of the redeemer
        address _redeemer;
        /// @notice The price of the coaching service
        uint256 _coachingPrice;
        /// @notice Name of the coaching currency
        string _coachingCurrencyName;
        /// @notice Whether learner can buy coaching or not
        bool _isCoachingEnabled;
        /// @notice Whether coaching is refundable or not
        bool _isCoachingRefundable;
        /// @notice Whether new content or modification, 0 undefined, 1 new content, 2 modification
        uint256 redeemType;
        /// @notice validaton score of the content
        uint256 validationScore;
        /// @notice the EIP-712 signature of all other fields in the CertificateVoucher struct.
        bytes signature;
    }

    /// @notice Allows backend to set the contract manager address
    /// @dev This function is needed because the contract manager address is not known at compile time.
    /// @param _contractManager The address of the contract manager
    function setContractManager(
        address _contractManager
    ) external onlyRole(BACKEND_ROLE) {
        contractManager = ContractManager(_contractManager);
    }

    /// @notice Get the updated addresses from contract manager
    function updateAddresses() external onlyRole(BACKEND_ROLE) {
        ISupVis = ISupervision(contractManager.ISupVisAddress());

        emit AddressesUpdated(contractManager.ISupVisAddress());
    }

    /// @notice Allows backend to set the KYC requirement for creating content
    /// @param _status The status of the KYC requirement
    function setKYCRequirementForCreateContent(
        bool _status
    ) external onlyRoles(administrator_roles) {
        isKYCRequiredToCreateContent = _status;
    }

    // TODO No name or description for individual NFT. Is this a problem?
    /// @notice Redeems a RedeemVoucher for an actual NFT, creating it in the process.
    /// @param voucher A RedeemVoucher describing an unminted NFT.
    function createContent(
        RedeemVoucher calldata voucher
    ) public whenNotPaused {
        // make sure signature is valid and get the address of the signer
        address signer = _verify(voucher);
        require(
            IRM.hasRole(BACKEND_ROLE, signer),
            "Signature invalid or unauthorized"
        );
        require(voucher.validUntil >= block.timestamp, "Voucher has expired.");
        require(voucher.redeemType == 1, "Redeem type is not new content");
        uint tokenId = _tokenIds.current();
        // make sure redeemer is redeeming
        require(voucher._redeemer == msg.sender, "You are not the redeemer");
        // KYC requirement is predetermined by admin roles.
        if (isKYCRequiredToCreateContent) {
            //make sure redeemer is kyced
            require(IRM.isKYCed(msg.sender), "You are not KYCed");
        }
        //make sure redeemer is not banned
        require(!IRM.isBanned(msg.sender), "Redeemer is banned!");
        require(voucher.validationScore != 0, "Validation score cannot be 0");
        // make sure the content price is not 0
        require(voucher._contentPrice[0] != 0, "Content price cannot be 0");
        // make sure the coaching price is not 0
        require(voucher._coachingPrice != 0, "Coaching price cannot be 0");
        
        require(
            !isCalldataStringEmpty(voucher._coachingCurrencyName),
            "Coaching currency cannot be empty"
        );
        require(
            !isCalldataStringEmpty(voucher._currencyName),
            "Content currency cannot be empty"
        );
       
        require(
            !isCalldataStringEmpty(voucher._uri),
            "Content URI cannot be empty"
        );
        
        coachingEnabled[tokenId] = voucher._isCoachingEnabled;
        coachingRefundable[tokenId] = voucher._isCoachingRefundable;

        // save the content price (it should test removing for partLength)
        uint partLength = voucher._contentPrice.length;
        partNumberOfContent[tokenId] = partLength;

        currencyName[tokenId] = keccak256(
            abi.encodePacked(voucher._currencyName)
        );

        coachingPrice[tokenId] = voucher._coachingPrice;
        coachingCurrency[tokenId] = keccak256(
            abi.encodePacked(voucher._coachingCurrencyName)
        );

        /// @dev First index is the full price for the content
        for (uint i = 0; i < partLength; i++) {
            contentPrice[tokenId][i] = voucher._contentPrice[i];
        }

        _mint(voucher._redeemer, tokenId);
        _setTokenURI(tokenId, voucher._uri);
        _tokenIds.increment();

        ISupVis.createValidation(tokenId, voucher.validationScore);
    }

    /// @notice Checks if a string is empty
    /// @param input The string to check
    function isCalldataStringEmpty(string calldata input) internal pure returns (bool) {
        return keccak256(abi.encodePacked(input)) == keccak256(abi.encodePacked(""));
    }

    /// Allows token owners to burn the token
    // TODO Content should be marked as not validated
    function modifyContent(
        RedeemVoucher calldata voucher
    ) external whenNotPaused {
        // score bilgisini çek
        // bool defaultu false
        // score hesaplandı = SkorContractı.scoreHesaplandı(tokenId);
        // require(score hesaplandı == true, "score henüz hesaplanmadı");
        // uint score = SkorContractı.getScore(tokenId);
        // if(score > 0){createValidation}; // score 0 dan büyükse validasyon oluştur,0 ise sadece order değişti
        // make sure signature is valid and get the address of the signer
        address signer = _verify(voucher);
        require(
            IRM.hasRole(BACKEND_ROLE, signer),
            "Signature invalid or unauthorized"
        );
        require(voucher.validUntil >= block.timestamp, "Voucher has expired.");
        require(voucher.redeemType == 2, "Redeem type is not modification");
        require(
            ownerOf(voucher.tokenId) == msg.sender,
            "You are not the owner of token"
        );
        // KYC requirement is predetermined by admin roles.
        if (isKYCRequiredToCreateContent) {
            //make sure redeemer is kyced
            require(IRM.isKYCed(msg.sender), "You are not KYCed");
        }
        //make sure caller is not banned
        require(!IRM.isBanned(msg.sender), "You are banned");

        if (voucher.validationScore != 0) {
            require(
                ISupVis.getIsValidated(voucher.tokenId) != 2,
                "Content is already in validation"
            );
        }
        // Create the new token
        // save the content price (it should test removing for partLength)
        uint partLength = voucher._contentPrice.length;
        partNumberOfContent[voucher.tokenId] = partLength;

        currencyName[voucher.tokenId] = keccak256(
            abi.encodePacked(voucher._currencyName)
        );
        /// @dev First index is the full price for the content
        for (uint i = 0; i < partLength; i++) {
            contentPrice[voucher.tokenId][i] = voucher._contentPrice[i];
        }
        _setTokenURI(voucher.tokenId, voucher._uri);

        if (voucher.validationScore != 0) {
            //ISupVis.setValidationStatus(voucher.tokenId, 0);
            ISupVis.createValidation(voucher.tokenId, voucher.validationScore);
        }
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
        // KYC requirement is predetermined by admin roles.
        if (isKYCRequiredToCreateContent) {
            //make sure redeemer is kyced
            require(IRM.isKYCed(msg.sender), "You are not KYCed");
        }
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

    /// @notice Returns a hash of the given RedeemVoucher, prepared using EIP712 typed data hashing rules.
    /// @param voucher A RedeemVoucher to hash.
    function _hash(
        RedeemVoucher calldata voucher
    ) internal view returns (bytes32) {
        return
            _hashTypedDataV4(
                keccak256(
                    abi.encode(
                        keccak256(
                            "RedeemVoucher(uint256 validUntil,uint256[] _contentPrice,uint256 tokenId,string _currencyName,string _uri,address _redeemer,uint256 _coachingPrice,string _coachingCurrencyName,bool _isCoachingEnabled,bool _isCoachingRefundable,uint256 redeemType,uint256 validationScore)"
                        ),
                        voucher.validUntil,
                        keccak256(abi.encodePacked(voucher._contentPrice)),
                        voucher.tokenId,
                        keccak256(bytes(voucher._currencyName)),
                        keccak256(bytes(voucher._uri)),
                        voucher._redeemer,
                        voucher._coachingPrice,
                        keccak256(bytes(voucher._coachingCurrencyName)),
                        voucher._isCoachingEnabled,
                        voucher._isCoachingRefundable,
                        voucher.redeemType,
                        voucher.validationScore
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

    /// @notice Verifies the signature for a given RedeemVoucher, returning the address of the signer.
    /// @dev Will revert if the signature is invalid. Does not verify that the signer is authorized to mint NFTs.
    /// @param voucher A RedeemVoucher describing an unminted NFT.
    function _verify(
        RedeemVoucher calldata voucher
    ) internal view returns (address) {
        bytes32 digest = _hash(voucher);
        return ECDSA.recover(digest, voucher.signature);
    }

    function supportsInterface(
        bytes4 interfaceId
    ) public view override(ERC721, IERC165) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}
