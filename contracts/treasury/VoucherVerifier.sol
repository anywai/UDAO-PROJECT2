// SPDX-License-Identifier: MIT
/// @title Main contract for voucher verification of platform treasury
pragma solidity ^0.8.4;

import "../RoleLegacy.sol";
import "../interfaces/IRoleManager.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/draft-EIP712.sol";

contract VoucherVerifier is EIP712, RoleLegacy {
    string private constant SIGNING_DOMAIN = "TreasuryVouchers";
    string private constant SIGNATURE_VERSION = "1";

    constructor(
        address roleManagerAddress
    ) EIP712(SIGNING_DOMAIN, SIGNATURE_VERSION) {
        roleManager = IRoleManager(roleManagerAddress);
    }

    /// @notice This event is triggered if the contract manager updates the addresses.
    event AddressesUpdated(address roleManagerAddress);

    /// @notice struct to hold content discount voucher information
    /// @param tokenId id of the content
    /// @param fullContentPurchase is full content purchased
    /// @param purchasedParts parts of the content purchased
    /// @param priceToPay price to pay
    /// @param validUntil date until the voucher is valid
    /// @param redeemer address of the redeemer
    /// @param giftReceiver address of the gift receiver if purchase is a gift or fiat purchase
    /// @param userId user id of the redeemer
    /// @param signature the EIP-712 signature of all other fields in the ContentDiscountVoucher struct.
    struct ContentDiscountVoucher {
        uint256 tokenId;
        bool fullContentPurchase;
        uint256[] purchasedParts;
        uint256 priceToPay;
        uint256 validUntil;
        address redeemer;
        address giftReceiver;
        string userId;
        bytes signature;
    }
    /// @notice Represents a refund voucher for a coaching
    /// @param saleID id of the sale to be refunded
    /// @param instructor address of the instructor
    /// @param finalParts parts that will remain in the learner's wallet after refund
    /// @param finalContents contents that will remain in the learner's wallet after refund
    /// @param validUntil date until the voucher is valid
    /// @param signature the EIP-712 signature of all other fields in the RefundVoucher struct.
    struct RefundVoucher {
        uint256 saleID;
        address instructor;
        uint256[] finalParts;
        uint256[] finalContents;
        uint256 validUntil;
        bytes signature;
    }

    /// @notice struct to hold coaching voucher information
    /// @param coach address of the coach
    /// @param priceToPay price to pay
    /// @param coachingDate date of the coaching
    /// @param learner address of the learner
    /// @param userId user id of the learner
    /// @param signature the EIP-712 signature of all other fields in the CoachingVoucher struct.
    struct CoachingVoucher {
        address coach;
        uint256 priceToPay;
        uint256 coachingDate;
        address learner;
        string userId;
        bytes signature;
    }

    /// @notice Get the updated addresses from contract manager
    /// @param roleManagerAddress The address of the role manager contract
    function updateAddresses(address roleManagerAddress) external {
        if (msg.sender != foundationWallet) {
            require(
                (hasRole(BACKEND_ROLE, msg.sender) ||
                    hasRole(CONTRACT_MANAGER, msg.sender)),
                "Only backend and contract manager can update addresses"
            );
        }
        roleManager = IRoleManager(roleManagerAddress);

        emit AddressesUpdated(roleManagerAddress);
    }

    /// @notice Returns a hash of the given ContentDiscountVoucher, prepared using EIP712 typed data hashing rules.
    /// @param voucher A ContentDiscountVoucher to hash.
    function _hashDiscountVoucher(
        ContentDiscountVoucher calldata voucher
    ) internal view returns (bytes32) {
        return
            _hashTypedDataV4(
                keccak256(
                    abi.encode(
                        keccak256(
                            "ContentDiscountVoucher(uint256 tokenId,bool fullContentPurchase,uint256[] purchasedParts,uint256 priceToPay,uint256 validUntil,address redeemer,address giftReceiver,string userId)"
                        ),
                        voucher.tokenId,
                        voucher.fullContentPurchase,
                        keccak256(abi.encodePacked(voucher.purchasedParts)),
                        voucher.priceToPay,
                        voucher.validUntil,
                        voucher.redeemer,
                        voucher.giftReceiver,
                        keccak256(bytes(voucher.userId))
                    )
                )
            );
    }

    /// @notice Returns a hash of the given RefundVoucher, prepared using EIP712 typed data hashing rules.
    /// @param voucher A RefundVoucher to hash.
    function _hashRefundVoucher(
        RefundVoucher calldata voucher
    ) internal view returns (bytes32) {
        return
            _hashTypedDataV4(
                keccak256(
                    abi.encode(
                        keccak256(
                            "RefundVoucher(uint256 saleID,address instructor,uint256[] finalParts,uint256[] finalContents,uint256 validUntil)"
                        ),
                        voucher.saleID,
                        voucher.instructor,
                        keccak256(abi.encodePacked(voucher.finalParts)),
                        keccak256(abi.encodePacked(voucher.finalContents)),
                        voucher.validUntil
                    )
                )
            );
    }

    /// @notice Returns a hash of the given CoachingVoucher, prepared using EIP712 typed data hashing rules.
    /// @param voucher A CoachingVoucher to hash.
    function _hashCoachingVoucher(
        CoachingVoucher calldata voucher
    ) internal view returns (bytes32) {
        return
            _hashTypedDataV4(
                keccak256(
                    abi.encode(
                        keccak256(
                            "CoachingVoucher(address coach,uint256 priceToPay,uint256 coachingDate,address learner,string userId)"
                        ),
                        voucher.coach,
                        voucher.priceToPay,
                        voucher.coachingDate,
                        voucher.learner,
                        keccak256(bytes(voucher.userId))
                    )
                )
            );
    }

    /// @notice Verifies the signature for a given ContentDiscountVoucher, returning the address of the signer.
    /// @dev Will revert if the signature is invalid.
    /// @param voucher A ContentDiscountVoucher describing a content purchase.
    function verifyDiscountVoucher(
        ContentDiscountVoucher calldata voucher
    ) external view {
        bytes32 digest = _hashDiscountVoucher(voucher);

        // make sure signature is valid and get the address of the signer
        address signer = ECDSA.recover(digest, voucher.signature);
        require(
            roleManager.hasRole(VOUCHER_VERIFIER, signer),
            "Signature invalid or unauthorized"
        );
        require(voucher.validUntil >= block.timestamp, "Voucher has expired.");
    }

    /// @notice Verifies the signature for a given RefundVoucher, returning the address of the signer.
    /// @dev Will revert if the signature is invalid.
    /// @param voucher A RefundVoucher describing a refund.
    function verifyRefundVoucher(RefundVoucher calldata voucher) external view {
        bytes32 digest = _hashRefundVoucher(voucher);
        address signer = ECDSA.recover(digest, voucher.signature);
        require(
            roleManager.hasRole(VOUCHER_VERIFIER, signer),
            "Signature invalid or unauthorized"
        );
    }

    /// @notice Verifies the signature for a given CoachingVoucher, returning the address of the signer.
    /// @dev Will revert if the signature is invalid.
    /// @param voucher A CoachingVoucher describing a coaching purchase.
    function verifyCoachingVoucher(
        CoachingVoucher calldata voucher
    ) external view {
        bytes32 digest = _hashCoachingVoucher(voucher);
        address signer = ECDSA.recover(digest, voucher.signature);
        require(
            signer == voucher.coach ||
                roleManager.hasRole(VOUCHER_VERIFIER, signer),
            "Signature invalid or unauthorized"
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
}
