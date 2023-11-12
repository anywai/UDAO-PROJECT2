// SPDX-License-Identifier: MIT
/// @title UDAOC (UDAO-Content) token is an ERC721 token.
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
    /// @dev The counter for content token ids.
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
        _tokenIds.increment();
    }

    /// @dev tokenId => true/false (is sellable)
    mapping(uint256 => bool) public isSellable;
    /// @dev tokenId => partIds
    mapping(uint256 => uint256[]) public contentParts;

    /// @notice This event is triggered when a new content is created
    event NewContentCreated(uint indexed tokenId, address indexed owner);
    /// @notice This event is triggered when a new part is added to a content
    event ContentModified(
        uint indexed tokenId,
        address indexed owner,
        uint newPartNumber
    );
    /// @notice This event is triggered if the contract manager updates the addresses.
    event AddressesUpdated(address RoleManager, address Supervision);
    /// @notice Triggered when KYC requirement for content creating is changed
    event KYCRequirementForCreateContentChanged(bool status);

    ///@notice A signed voucher can be redeemed for a real content NFT using the redeem function.
    struct RedeemVoucher {
        /// @notice The date until the voucher is valid
        uint256 validUntil;
        /// @notice Parts of the content
        uint256[] _parts;
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
    /// @param roleManagerAddress The address of the role manager contract
    /// @param supervisionAddress The address of the supervision contract
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
        // Revert if the msg.sender is not the voucher._redeemer or has the CONTENT_PUBLISHER role
        require(
            hasRole(CONTENT_PUBLISHER, msg.sender) ||
                voucher._redeemer == msg.sender,
            "Only content modifier or redeemer can create content"
        );
        require(voucher.validUntil >= block.timestamp, "Voucher has expired.");
        /// @dev 1 is new content, 2 is modification
        require(voucher.redeemType == 1, "Redeem type is not new content");
        uint tokenId = _tokenIds.current();
        //make sure redeemer is kyced
        require(isKYCed(voucher._redeemer, 13), "You are not KYCed");
        //make sure redeemer is not banned
        require(isNotBanned(voucher._redeemer, 13), "Redeemer is banned!");

        require(
            !isCalldataStringEmpty(voucher._uri),
            "Content URI cannot be empty"
        );

        // save the content parts
        contentParts[tokenId] = voucher._parts;

        _mint(voucher._redeemer, tokenId);
        _setTokenURI(tokenId, voucher._uri);
        _tokenIds.increment();
        isSellable[tokenId] = true;

        if (voucher.validationScore != 0) {
            supervision.createValidation(tokenId, voucher.validationScore);
        }
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

    /// @notice Allows modification of a content by redeeming a voucher.
    /// @param voucher A RedeemVoucher describing an unminted NFT.
    function modifyContent(
        RedeemVoucher calldata voucher
    ) external whenNotPaused {
        // make sure signature is valid and get the address of the signer
        address signer = _verify(voucher);
        require(
            hasRole(VOUCHER_VERIFIER, signer),
            "Signature invalid or unauthorized"
        );
        // Revert if the msg.sender is not the owner of the content or has the CONTENT_PUBLISHER role
        require(
            hasRole(CONTENT_PUBLISHER, msg.sender) ||
                ownerOf(voucher.tokenId) == msg.sender,
            "Only content modifier or owner can modify content"
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
        contentParts[voucher.tokenId] = voucher._parts;

        _setTokenURI(voucher.tokenId, voucher._uri);

        if (voucher.validationScore != 0) {
            supervision.createValidation(
                voucher.tokenId,
                voucher.validationScore
            );
        }

        emit ContentModified(
            voucher.tokenId,
            voucher._redeemer,
            voucher._parts.length
        );
    }

    /// @notice returns the parts array of a specific content
    /// @param tokenId the content ID of the token
    function getContentParts(
        uint tokenId
    ) external view returns (uint256[] memory) {
        return (contentParts[tokenId]);
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

    /// @notice Burns a content which is not allowed
    /// @param tokenId The id of the token to burn
    function _burn(
        uint256 tokenId
    ) internal override(ERC721, ERC721URIStorage) {
        require(
            hasRole(BACKEND_ROLE, msg.sender),
            "Only backend can burn a content"
        );
        super._burn(tokenId);
    }

    /// @notice Allows transfer of a content with KYC and ban checks
    /// @param from The current token owner
    /// @param to Token to send to
    /// @param tokenId The id of the token to transfer
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

    /// @notice Allows off-chain check if batch of tokens(content) exists
    /// @param tokenIds Array of token IDs
    function existsBatch(
        uint[] memory tokenIds
    ) external view returns (bool[] memory) {
        bool[] memory existanceResult;
        for (uint i = 0; i < tokenIds.length; i++) {
            existanceResult[i] = _exists(tokenIds[i]);
        }
        return existanceResult;
    }

    /// @notice Allows off-chain check if a token(content) exists
    /// @param tokenId The ID of a token
    function exists(uint tokenId) external view returns (bool) {
        return _exists(tokenId);
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
                            "RedeemVoucher(uint256 validUntil,uint256[] _parts,uint256 tokenId,string _uri,address _redeemer,uint256 redeemType,uint256 validationScore)"
                        ),
                        voucher.validUntil,
                        keccak256(abi.encodePacked(voucher._parts)),
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

    /// @notice Allows backend to pause the contract
    function pause() external {
        require(hasRole(BACKEND_ROLE, msg.sender), "Only backend can pause");
        _pause();
    }

    /// @notice Allows backend to unpause the contract
    function unpause() external {
        require(hasRole(BACKEND_ROLE, msg.sender), "Only backend can unpause");
        _unpause();
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
