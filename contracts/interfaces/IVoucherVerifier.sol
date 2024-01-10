// SPDX-License-Identifier: MIT
/// @title Interface of voucher verifier contract
pragma solidity ^0.8.4;

interface IVoucherVerifier {
    /// @notice struct to hold content discount voucher information
    /// @param tokenId id of the content
    /// @param fullContentPurchase is full content purchased
    /// @param purchasedParts parts of the content purchased
    /// @param priceToPay price to pay
    /// @param validUntil date until the voucher is valid
    /// @param redeemer address of the redeemer
    /// @param giftReceiver address of the gift receiver if purchase is a gift
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
    struct RefundVoucher {
        uint256 saleID;
        address instructor;
        uint256[] finalParts;
        uint256[] finalContents;
        uint256 validUntil;
        bytes signature;
    }

    /// @notice struct to hold coaching voucher information
    struct CoachingVoucher {
        address coach;
        uint256 priceToPay;
        uint256 coachingDate;
        address learner;
        string userId;
        bytes signature;
    }

    function verifyDiscountVoucher(
        ContentDiscountVoucher calldata voucher
    ) external view;

    function verifyRefundVoucher(RefundVoucher calldata voucher) external view;

    function verifyCoachingVoucher(
        CoachingVoucher calldata voucher
    ) external view;
}
