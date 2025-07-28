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

    struct BuyCourseVoucher {
        uint256 courseId;
        address tokenAddress; // erc20 adressi or 0x0 for native token
        uint256 coursePrice; // Total amount of the payment
        address courseReceiver; // who will owns the course after payment
        address redeemer; // who pays for the course
        uint256 validUntil; // voucher valid until timestamp
        bytes signature; // signature of the voucher
    }

    function buyCourse(BuyCourseVoucher calldata voucher) external payable;
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

    /// Call buyCourse on NewTreasury
    function triggerBuy(
        address treasury,
        INewTreasury.BuyCourseVoucher calldata voucher
    ) external payable {
        INewTreasury(treasury).buyCourse{value: msg.value}(voucher);
    }
}
