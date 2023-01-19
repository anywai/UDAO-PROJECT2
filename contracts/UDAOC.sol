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

    bool isKycChecked;
    /// @param rmAddress The address of the deployed role manager
    constructor(
        address rmAddress
    )
        ERC721("UDAO Content", "UDAOC")
        EIP712(SIGNING_DOMAIN, SIGNATURE_VERSION)
        RoleController(rmAddress)
    {isKycChecked=true;}

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

    /// @notice For transfers with "transfer" function
    struct TransferVoucher {
        /// @notice The id of the token to be redeemed.
        uint256 tokenId;
        /// @notice Address of the current owner
        address from;
        /// @notice Address of the redeemer
        address to;
        /// @notice The date until the voucher is valid
        uint256 validUntil;
        /// @notice the EIP-712 signature of all other fields in the ContentVoucher struct.
        bytes signature;
    }

    /// @notice For transfers with "safeTransferFrom" functions
    struct TransferVoucherData {
        /// @notice The id of the token to be redeemed.
        uint256 tokenId;
        /// @notice Address of the current owner
        address from;
        /// @notice Address of the redeemer
        address to;
        /// @notice Data variable in "safeTransferFrom"
        bytes data;
        /// @notice The date until the voucher is valid
        uint256 validUntil;
        /// @notice the EIP-712 signature of all other fields in the ContentVoucher struct.
        bytes signature;
    }

    uint256 private constant _NOT_VOUCHER = 1;
    uint256 private constant _VOUCHER = 2;

    uint256 private _is_voucher;


    /// @notice Redeems a ContentVoucher for an actual NFT, creating it in the process.
    /// @param voucher A signed ContentVoucher that describes the NFT to be redeemed.
    function redeem(ContentVoucher calldata voucher) public whenNotPaused {
        // make sure redeemer is redeeming
        require(voucher.redeemer == msg.sender, "You are not the redeemer");

        // make sure signature is valid and get the address of the signer
        address signer = _verifyRedeem(voucher);
        require(
            IRM.hasRole(BACKEND_ROLE, signer),
            "Signature invalid or unauthorized"
        );
        coachingEnabled[voucher.tokenId] = voucher.isCoachingEnabled;
        _is_voucher = _VOUCHER;
        _mint(voucher.redeemer, voucher.tokenId);
        _is_voucher = _NOT_VOUCHER;
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


    /// @notice Allows backend to either to force or not the KYC check before transfers 
    function setIsKycChecked(bool _isKycChecked) external onlyRole(FOUNDATION_ROLE){
        isKycChecked = _isKycChecked;
    }

    /// @notice ERC721 transferFrom with a voucher
    function voucherTransferFrom(TransferVoucher calldata voucher) public whenNotPaused {
        address signer = _verifyTransfer(voucher);
        require(
                voucher.validUntil >= block.timestamp,
                "Voucher has expired."
            );
        require(
            IRM.hasRole(BACKEND_ROLE, signer),
            "Signature invalid or unauthorized"
        );
        _is_voucher = _VOUCHER;
        transferFrom(voucher.from,voucher.to, voucher.tokenId);
        _is_voucher = _NOT_VOUCHER;
    }

    /// @notice ERC721 safeTransferFrom with a voucher
    function voucherSafeTransferFrom(TransferVoucher calldata voucher) public whenNotPaused {
        address signer = _verifyTransfer(voucher);
        require(
                voucher.validUntil >= block.timestamp,
                "Voucher has expired."
            );
        require(
            IRM.hasRole(BACKEND_ROLE, signer),
            "Signature invalid or unauthorized"
        );
        _is_voucher = _VOUCHER;
        safeTransferFrom(voucher.from,voucher.to, voucher.tokenId);
        _is_voucher = _NOT_VOUCHER;
    }

    /// @notice ERC721 safeTransferFrom with data variable with a voucher
    function voucherSafeTransferFrom(TransferVoucherData calldata voucher) public whenNotPaused {
        address signer = _verifyTransferData(voucher);
        require(
                voucher.validUntil >= block.timestamp,
                "Voucher has expired."
            );
        require(
            IRM.hasRole(BACKEND_ROLE, signer),
            "Signature invalid or unauthorized"
        );
        _is_voucher = _VOUCHER;
        safeTransferFrom(voucher.from,voucher.to, voucher.tokenId, voucher.data);
        _is_voucher = _NOT_VOUCHER;
    }

    /// @notice Returns a hash of the given ContentVoucher, prepared using EIP712 typed data hashing rules.
    /// @param voucher A ContentVoucher to hash.
    function _hashRedeem(
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

    /// @notice Returns a hash of the given TransferVoucher, prepared using EIP712 typed data hashing rules.
    /// @param voucher A TransferVoucher to hash.
    function _hashTransfer(
        TransferVoucher calldata voucher
    ) internal view returns (bytes32) {
        return
            _hashTypedDataV4(
                keccak256(
                    abi.encode(
                        keccak256(
                            "TransferVoucher(uint256 tokenId,address from,address to,uint256 validUntil)"
                        ),
                        voucher.tokenId,
                        voucher.from,
                        voucher.to,
                        voucher.validUntil
                    )
                )
            );
    }

    /// @notice Returns a hash of the given TransferVoucherData, prepared using EIP712 typed data hashing rules.
    /// @param voucher A TransferVoucherData to hash.
    function _hashTransferData(
        TransferVoucherData calldata voucher
    ) internal view returns (bytes32) {
        return
            _hashTypedDataV4(
                keccak256(
                    abi.encode(
                        keccak256(
                            "TransferVoucherData(uint256 tokenId,address from,address to,bytes data,uint256 validUntil)"
                        ),
                        voucher.tokenId,
                        voucher.from,
                        voucher.to,
                        voucher.data,
                        voucher.validUntil
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
    function _verifyRedeem(
        ContentVoucher calldata voucher
    ) internal view returns (address) {
        bytes32 digest = _hashRedeem(voucher);
        return ECDSA.recover(digest, voucher.signature);
    }

     /// @notice Verifies the signature for a given transferVoucher, returning the address of the signer.
    /// @dev Will revert if the signature is invalid. Does not verify that the signer is authorized to mint NFTs.
    /// @param voucher A transferVoucher describing an unminted NFT.
    function _verifyTransfer(
        TransferVoucher calldata voucher
    ) internal view returns (address) {
        bytes32 digest = _hashTransfer(voucher);
        return ECDSA.recover(digest, voucher.signature);
    }

    /// @notice Verifies the signature for a given transferVoucherData, returning the address of the signer.
    /// @dev Will revert if the signature is invalid. Does not verify that the signer is authorized to mint NFTs.
    /// @param voucher A transferVoucherData describing an unminted NFT.
    function _verifyTransferData(
        TransferVoucherData calldata voucher
    ) internal view returns (address) {
        bytes32 digest = _hashTransferData(voucher);
        return ECDSA.recover(digest, voucher.signature);
    }

    /// @notice A content can be completely removed by the owner
    /// @param tokenId The token ID of a content
    function burn(uint256 tokenId) external whenNotPaused {
        require(
            ownerOf(tokenId) == msg.sender,
            "You are not the owner of token"
        );
        _is_voucher = _VOUCHER;
        _burn(tokenId);
        _is_voucher = _NOT_VOUCHER;
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
        if(isKycChecked) { /// @notice if KYC check is active with vouchers
            require(_is_voucher == _VOUCHER, "Non voucher transfers are not allowed");
            require(IRM.isBanned(from)==false, "Sender is banned");
            require(IRM.isBanned(to)==false, "Receiver is banned");
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
