// SPDX-License-Identifier: MIT
/// @title Content purchasing and cut management
pragma solidity ^0.8.4;
import "./BasePlatform.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/draft-EIP712.sol";

interface IValidationManager {
    function isValidated(uint tokenId) external view returns (bool);
}

abstract contract ContentManager is EIP712, BasePlatform  {
    string private constant SIGNING_DOMAIN = "ContentManager";
    string private constant SIGNATURE_VERSION = "1";

    /// @notice Represents usage rights for a content (or part)
    struct ContentPurchaseVoucher {
        /// @notice The id of the token (content) to be redeemed.
        uint256 tokenId;
        /// @notice Purchased parts, whole content purchased if first index is 0
        uint256[] purchasedParts; 
        /// @notice The price to deduct from buyer
        uint256 priceToPay;
        /// @notice Address of the redeemer
        address redeemer;
        /// @notice the EIP-712 signature of all other fields in the ContentVoucher struct.
        bytes signature;
    }
    
    // wallet => content token Ids
    mapping(address => uint[][]) ownedContents;
    // tokenId => fee
    mapping(uint => uint) coachingFee;
    // tokenId => buyable
    mapping(uint => bool) coachingEnabled;

    IValidationManager public IVM;

    /// @param vmAddress The address of the deployed ValidationManager contract
    constructor(address vmAddress) 
    EIP712(SIGNING_DOMAIN, SIGNATURE_VERSION)
    {
        IVM = IValidationManager(vmAddress);
    }

    /// @notice Allows seting the address of the valdation manager contract
    /// @param vmAddress The address of the deployed ValidationManager contract
    function setValidationManager(address vmAddress)
        external
        onlyRole(FOUNDATION_ROLE)
    {
        IVM = IValidationManager(vmAddress);
    }

    /// @notice allows KYCed users to purchase a content
    function buyContent(ContentPurchaseVoucher calldata voucher) external {
        uint256 tokenId = voucher.tokenId;
        uint256[] memory purchasedParts = voucher.purchasedParts;
        uint priceToPay = voucher.priceToPay;

        require(udaoc.exists(tokenId), "Content does not exist!");
        require(!IRM.isBanned(msg.sender), "You are banned");
        require(IRM.isKYCed(msg.sender), "You are not KYCed");
        address instructor = udaoc.ownerOf(tokenId);
        require(IRM.isKYCed(instructor), "Instructor is not KYCed");
        require(!IRM.isBanned(instructor), "Instructor is banned");
        require(IVM.isValidated(tokenId), "Content is not validated yet");
        require(
            isTokenBought[msg.sender][tokenId][0] == false,
            "Full content is already bought"
        );

        uint partIdLength = purchasedParts.length;

        for (uint i; i < partIdLength; i++) {
            require(
                purchasedParts[i] < udaoc.getPartNumberOfContent(tokenId),
                "Part does not exist!"
            );
            require(
                isTokenBought[msg.sender][tokenId][purchasedParts[i]] == false,
                "Content part is already bought"
            );
            priceToPay += udaoc.getPriceContent(tokenId, purchasedParts[i]);

            isTokenBought[msg.sender][tokenId][purchasedParts[i]] = true;
            ownedContents[msg.sender].push([tokenId, purchasedParts[i]]);
        }
        foundationBalance += (priceToPay * contentFoundationCut) / 100000;
        governanceBalance += (priceToPay * contentGovernancenCut) / 100000;
        validatorBalance += (priceToPay * validatorBalance) / 100000;
        jurorBalance += (priceToPay * contentJurorCut) / 100000;
        instructorBalance[instructor] +=
            priceToPay -
            ((priceToPay * contentFoundationCut) / 100000) -
            ((priceToPay * contentGovernancenCut) / 100000) -
            ((priceToPay * validatorBalance) / 100000) -
            ((priceToPay * contentGovernancenCut) / 100000);
        udao.transferFrom(msg.sender, address(this), priceToPay);
    }

    /// @notice Allows users to buy coaching service.
    /// @param tokenId Content token id is used for finding the address of the coach
    function buyCoaching(uint tokenId) external {
        require(IRM.isKYCed(msg.sender), "You are not KYCed");
        address instructor = udaoc.ownerOf(tokenId);
        require(IRM.isKYCed(instructor), "Instructor is not KYCed");
        require(!IRM.isBanned(instructor), "Instructor is banned");
        require(IVM.isValidated(tokenId), "Content is not validated yet");

        foundationBalance +=
            (coachingFee[tokenId] * coachingFoundationCut) /
            100000;
        governanceBalance +=
            (coachingFee[tokenId] * coachingGovernancenCut) /
            100000;
        instructorBalance[instructor] += (coachingFee[tokenId] -
            foundationBalance -
            governanceBalance);
        udao.transferFrom(msg.sender, address(this), coachingFee[tokenId]);
    }

    /// @notice Allows instructers' to enable coaching for a specific content
    /// @param tokenId The content id
    function enableCoaching(uint tokenId) external {
        require(
            udaoc.ownerOf(tokenId) == msg.sender,
            "You are not the owner of token"
        );
        coachingEnabled[tokenId] = true;
    }

    /// @notice Allows instructers' to disable coaching for a specific content
    /// @param tokenId tokenId of the content that will be not coached
    function disableCoaching(uint tokenId) external {
        require(
            udaoc.ownerOf(tokenId) == msg.sender,
            "You are not the owner of token"
        );
        coachingEnabled[tokenId] = false;
    }

    /// @notice Allows coaches to set their coaching fee.
    /// @param tokenId tokenId of the content that will be coached
    /// @param _coachingFee The fee to set
    function setCoachingFee(uint tokenId, uint _coachingFee) external {
        require(
            udaoc.ownerOf(tokenId) == msg.sender,
            "You are not the owner of token"
        );
        coachingFee[tokenId] = _coachingFee;
    }

    function getOwnedContent(address _owner)
        public
        view
        returns (uint[][] memory)
    {
        return (ownedContents[_owner]);
    }

    /// @notice Returns a hash of the given PurchaseVoucher, prepared using EIP712 typed data hashing rules.
    /// @param voucher A PurchaseVoucher to hash.
    function _hash(ContentPurchaseVoucher calldata voucher)
        internal
        view
        returns (bytes32)
    {
        return
            _hashTypedDataV4(
                keccak256(
                    abi.encode(
                        keccak256(
                            "PurchaseVoucher(uint256 tokenId,uint256[] purchasedParts,uint256 priceToPay,address redeemer)"
                        ),
                        voucher.tokenId,
                        keccak256(abi.encodePacked(voucher.purchasedParts)),
                        voucher.priceToPay,
                        voucher.redeemer
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

    /// @notice Verifies the signature for a given PurchaseVoucher, returning the address of the signer.
    /// @dev Will revert if the signature is invalid. Does not verify that the signer is authorized to mint NFTs.
    /// @param voucher A PurchaseVoucher describing an unminted NFT.
    function _verify(ContentPurchaseVoucher calldata voucher)
        internal
        view
        returns (address)
    {
        bytes32 digest = _hash(voucher);
        return ECDSA.recover(digest, voucher.signature);
    }
}
