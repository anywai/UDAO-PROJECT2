// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// Minimal interface of NewTreasury to call withdraw
interface INewTreasury {
    struct WithdrawVoucher {
        uint256 courseId;
        uint256 fromIndex;
        uint256 toIndex;
        address redeemer;
        uint256 validUntil;
        bytes signature;
    }

    function withdrawCoursePayments(WithdrawVoucher calldata voucher) external;
}

/// @dev Receive fonksiyonu koşula bağlı olarak revert atar.
/// withdraw'ı kendisi tetikleyebilsin diye triggerWithdraw fonksiyonu içerir.
contract FailNativeReceiver {
    bool public rejectPayments = false;

    function setRejectPayments(bool value) external {
        rejectPayments = value;
    }

    receive() external payable {
        if (rejectPayments) {
            revert("Native payment rejected");
        }
    }

    /// Call withdrawCoursePayments on NewTreasury
    function triggerWithdraw(
        address treasury,
        INewTreasury.WithdrawVoucher calldata voucher
    ) external {
        INewTreasury(treasury).withdrawCoursePayments(voucher);
    }
}
