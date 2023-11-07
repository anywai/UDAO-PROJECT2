// SPDX-License-Identifier: MIT
/// @title UDAOC (UDAO-Content) token.
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/draft-EIP712.sol";
import "../interfaces/IUDAOC.sol";
import "../interfaces/ISupervision.sol";
import "../interfaces/IRoleManager.sol";
import "../RoleLegacy.sol";
import "@openzeppelin/contracts/security/Pausable.sol";

contract UDAOContent is
    Pausable,
    RoleLegacy,
    IUDAOC,
    ERC721,
    EIP712,
    ERC721URIStorage
{
    using Counters for Counters.Counter;
    Counters.Counter private _tokenIds;

    string private constant SIGNING_DOMAIN = "UDAOCMinter";
    string private constant SIGNATURE_VERSION = "1";

    ISupervision supervision;

    /// @param roleManagerAddress The address of the deployed role manager
    constructor(
        address roleManagerAddress
    )
        ERC721("UDAO Content", "UDAOC")
        EIP712(SIGNING_DOMAIN, SIGNATURE_VERSION)
    {
        roleManager = IRoleManager(roleManagerAddress);
    }

    mapping(uint256 => bool) public isSellable;
    // tokenId => (partId => price)
    mapping(uint => mapping(uint => uint)) public partPrices;
    // tokenId => price
    mapping(uint => uint) public contentPrices;
    // tokenId => partIds
    mapping(uint256 => uint256[]) public contentParts;

    /// @notice This event is triggered when a new content is created
    event NewContentCreated(uint indexed tokenId, address indexed owner);
    /// @notice This event is triggered when a new part is added to a content
    event newPartAdded(uint tokenId, uint newPartId, uint newPartPrice);
    /// @notice This event is triggered if the contract manager updates the addresses.
    event AddressesUpdated(address RoleManager, address Supervision);
    /// @notice Triggered when KYC requirement for content creating is changed
    event KYCRequirementForCreateContentChanged(bool status);

    ///@notice A signed voucher can be redeemed for a real content NFT using the redeem function.
    struct RedeemVoucher {
        /// @notice The date until the voucher is valid
        uint256 validUntil;
        /// @notice The price of the content
        uint256 _contentPrice;
        /// @notice The price of the content parts
        uint256[] _partPrice;
        /// @notice Token id of the content, not used if new content creation
        uint256 tokenId;
        /// @notice The metadata URI to associate with this token.
        string _uri;
        /// @notice Address of the redeemer
        address _redeemer;
        /// @notice Whether new content or modification, 0 undefined, 1 new content, 2 modification
        uint256 redeemType;
        /// @notice validaton score of the content
        uint256 validationScore;
        /// @notice the EIP-712 signature of all other fields in the CertificateVoucher struct.
        bytes signature;
    }

    /// @notice Allows sale controller to set sellable status of a content
    /// @param _tokenId id of the content
    /// @param _isSellable is content sellable
    function setSellable(uint _tokenId, bool _isSellable) external {
        require(
            hasRole(SALE_CONTROLLER, msg.sender),
            "Only sale controller can set sellable"
        );
        isSellable[_tokenId] = _isSellable;
    }

    /// @notice Get the updated addresses from contract manager
    function updateAddresses(
        address roleManagerAddress,
        address supervisionAddress
    ) external {
        if (msg.sender != foundationWallet) {
            require(
                (hasRole(BACKEND_ROLE, msg.sender) ||
                    hasRole(CONTRACT_MANAGER, msg.sender)),
                "Only backend can update addresses"
            );
        }
        roleManager = IRoleManager(roleManagerAddress);
        supervision = ISupervision(supervisionAddress);

        emit AddressesUpdated(roleManagerAddress, supervisionAddress);
    }

    /// @notice Redeems a RedeemVoucher for an actual NFT, creating it in the process.
    /// @param voucher A RedeemVoucher describing an unminted NFT.
    function createContent(
        RedeemVoucher calldata voucher
    ) public whenNotPaused {
        // make sure signature is valid and get the address of the signer
        address signer = _verify(voucher);
        require(
            hasRole(VOUCHER_VERIFIER, signer),
            "Signature invalid or unauthorized"
        );
        require(voucher.validUntil >= block.timestamp, "Voucher has expired.");
        /// @dev 1 is new content, 2 is modification
        require(voucher.redeemType == 1, "Redeem type is not new content");
        uint tokenId = _tokenIds.current();
        //make sure redeemer is kyced
        require(isKYCed(voucher._redeemer, 13), "You are not KYCed");
        //make sure redeemer is not banned
        require(isNotBanned(voucher._redeemer, 13), "Redeemer is banned!");
        require(voucher.validationScore != 0, "Validation score cannot be 0");
        // make sure the full content price is not 0
        require(voucher._contentPrice != 0, "Full content price cannot be 0");

        require(
            !isCalldataStringEmpty(voucher._uri),
            "Content URI cannot be empty"
        );

        // save the content price
        uint partLength = voucher._partPrice.length;

        contentPrices[tokenId] = voucher._contentPrice;
        for (uint i = 0; i < partLength; i++) {
            partPrices[tokenId][i] = voucher._partPrice[i];
            contentParts[tokenId].push(i);
        }

        _mint(voucher._redeemer, tokenId);
        _setTokenURI(tokenId, voucher._uri);
        _tokenIds.increment();
        isSellable[tokenId] = true;

        supervision.createValidation(tokenId, voucher.validationScore);
        emit NewContentCreated(tokenId, voucher._redeemer);
    }

    /// @notice Checks if a string is empty
    /// @param input The string to check
    function isCalldataStringEmpty(
        string calldata input
    ) internal pure returns (bool) {
        return
            keccak256(abi.encodePacked(input)) ==
            keccak256(abi.encodePacked(""));
    }

    /// @notice Redeems a RedeemVoucher for an actual NFT, modifying existing content in the process.
    /// @param voucher A RedeemVoucher describing an unminted NFT.
    // TODO Content should be marked as not validated
    function modifyContent(
        RedeemVoucher calldata voucher
    ) external whenNotPaused {
        // make sure signature is valid and get the address of the signer
        address signer = _verify(voucher);
        require(
            hasRole(VOUCHER_VERIFIER, signer),
            "Signature invalid or unauthorized"
        );
        require(voucher.validUntil >= block.timestamp, "Voucher has expired.");
        /// @dev 1 is new content, 2 is modification
        require(voucher.redeemType == 2, "Redeem type is not modification");
        address instructor = ownerOf(voucher.tokenId);
        //make sure redeemer is kyced
        require(isKYCed(instructor, 14), "You are not KYCed");
        // make sure caller is not banned
        require(isNotBanned(instructor, 14), "You are banned");
        // A content can be modified only if it is not in validation
        if (voucher.validationScore != 0) {
            require(
                /// @dev 0: rejected, 1: validated, 2: in validation
                supervision.getIsValidated(voucher.tokenId) != 2,
                "Content is already in validation"
            );
        }
        /// @dev Create the new token
        // save the content price (it should test removing for partLength) batuhan ?
        uint partLength = voucher._partPrice.length;
        contentPrices[voucher.tokenId] = voucher._contentPrice;
        for (uint i = 0; i < partLength; i++) {
            partPrices[voucher.tokenId][i] = voucher._partPrice[i];
            contentParts[voucher.tokenId].push(i);
        }
        _setTokenURI(voucher.tokenId, voucher._uri);

        if (voucher.validationScore != 0) {
            supervision.createValidation(
                voucher.tokenId,
                voucher.validationScore
            );
        }
    }

    /// @notice returns the price of a specific content
    /// @param tokenId the content ID of the token
    function getContentPrice(uint tokenId) external view returns (uint256) {
        return (contentPrices[tokenId]);
    }

    /// @notice returns the price of a specific content
    /// @param tokenId the content ID of the token
    /// @param partId the part ID of the token (microlearning), full content price if 0
    function getContentPartPrice(
        uint tokenId,
        uint partId
    ) external view returns (uint256) {
        return (partPrices[tokenId][partId]);
    }

    /// @notice returns the parts array of a specific content
    /// @param tokenId the content ID of the token
    function getContentParts(
        uint tokenId
    ) external view returns (uint256[] memory) {
        return (contentParts[tokenId]);
    }

    /// @notice allows content owners to set full content price
    /// @param tokenId the content ID of the token
    /// @param _contentPrice the price to set
    function setFullPriceContent(uint tokenId, uint _contentPrice) external {
        require(ownerOf(tokenId) == msg.sender, "You are not the owner");
        //make sure caller is not banned
        require(isNotBanned(msg.sender, 24), "You were banned!");
        // make sure full content price is not zero
        require(_contentPrice != 0, "Full content price cannot be 0");

        contentPrices[tokenId] = _contentPrice;
    }

    /// @notice allows content owners to set price for single part in a content
    /// @param tokenId the content ID of the token
    /// @param _partPrice the price to set
    function setPartialContent(
        uint tokenId,
        uint partId,
        uint _partPrice
    ) external {
        require(ownerOf(tokenId) == msg.sender, "You are not the owner");
        require(
            partId < _getPartNumberOfContent(tokenId),
            "Part does not exist!"
        );
        //make sure caller is not banned
        require(isNotBanned(msg.sender, 25), "You were banned!");
        partPrices[tokenId][partId] = _partPrice;
    }

    /// @notice allows content owners to set price for multiple parts in a content
    /// @param tokenId the content ID of the token
    /// @param _partIds the part IDs of the token
    /// @param _partPrices the price to set
    function setBatchPartialContent(
        uint tokenId,
        uint[] calldata _partIds,
        uint[] calldata _partPrices
    ) external {
        require(ownerOf(tokenId) == msg.sender, "You are not the owner");
        //make sure caller is not banned
        require(isNotBanned(msg.sender, 26), "You were banned!");
        uint partLength = _partIds.length;
        for (uint i = 0; i < partLength; i++) {
            require(
                _partIds[i] < _getPartNumberOfContent(tokenId),
                "Part does not exist!"
            );
            partPrices[tokenId][_partIds[i]] = _partPrices[i];
        }
    }

    /// @notice allows content owners to set price for full content and multiple parts in a content
    /// @param tokenId the content ID of the token
    /// @param _partIds the part IDs of the token
    /// @param _partPrices the prices to set
    /// @param _contentPrice the price to set, first price is for full content price
    function setBatchFullContent(
        uint tokenId,
        uint[] calldata _partIds,
        uint[] calldata _partPrices,
        uint _contentPrice
    ) external {
        require(ownerOf(tokenId) == msg.sender, "You are not the owner");
        //make sure caller is not banned
        require(isNotBanned(msg.sender, 27), "You were banned!");
        uint partLength = _partIds.length;

        for (uint i = 0; i < partLength; i++) {
            require(
                _partIds[i] < _getPartNumberOfContent(tokenId),
                "Part does not exist!"
            );
            partPrices[tokenId][_partIds[i]] = _partPrices[i];
        }
        contentPrices[tokenId] = _contentPrice;
    }

    /// @notice Returns the part numbers that a content has
    function _getPartNumberOfContent(
        uint tokenId
    ) internal view returns (uint) {
        return contentParts[tokenId].length;
    }

    /// @notice Returns the part numbers that a content has
    function getPartNumberOfContent(uint tokenId) external view returns (uint) {
        return contentParts[tokenId].length;
    }

    function _burn(
        uint256 tokenId
    ) internal override(ERC721, ERC721URIStorage) {
        require(
            hasRole(BACKEND_ROLE, msg.sender),
            "Only backend can burn a content"
        );
        super._burn(tokenId);
    }

    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 tokenId
    ) internal virtual override {
        super._beforeTokenTransfer(from, to, tokenId);
        if (to != address(0)) {
            require(isKYCed(to, 18), "Receiver is not KYCed!");
            require(isNotBanned(to, 18), "Receiver is banned!");
        }
        if (from != address(0)) {
            require(isKYCed(from, 19), "Sender is not KYCed!");
            require(isNotBanned(from, 19), "Sender is banned!");
        }
    }

    /// @notice Allows off-chain check if a token(content) exists
    function existsBatch(
        uint[] memory tokenId
    ) external view returns (bool[] memory) {
        bool[] memory existanceResult;
        for (uint i = 0; i < tokenId.length; i++) {
            existanceResult[i] = _exists(tokenId[i]);
        }
        return existanceResult;
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
                            "RedeemVoucher(uint256 validUntil,uint256 _contentPrice,uint256[] _partPrice,uint256 tokenId,string _uri,address _redeemer,uint256 redeemType,uint256 validationScore)"
                        ),
                        voucher.validUntil,
                        voucher._contentPrice,
                        keccak256(abi.encodePacked(voucher._partPrice)),
                        voucher.tokenId,
                        keccak256(bytes(voucher._uri)),
                        voucher._redeemer,
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

    function pause() external {
        require(hasRole(BACKEND_ROLE, msg.sender), "Only backend can pause");
        _pause();
    }

    function unpause() external {
        require(hasRole(BACKEND_ROLE, msg.sender), "Only backend can unpause");
        _unpause();
    }
}
