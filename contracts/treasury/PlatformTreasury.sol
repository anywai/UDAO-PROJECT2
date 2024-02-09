// SPDX-License-Identifier: MIT
/// @title Platform Treasury contract for the UDAO Platform's primary financial operations.
/// @author anywaiTR: Bugrahan Duran, Batuhan Darcin
/// @notice This contract manages revenue distribution and withdrawals for the UDAO Platform, inheriting critical functionalities from the ContentManager and BasePlatform contracts.
/// @dev The contract facilitates platform revenue distribution, role dependent revenue share management, and instructor withdrawals based on a refund window mechanism.

pragma solidity ^0.8.4;
import "./ContentManager.sol";

contract PlatformTreasury is ContentManager {
    ///@notice this event gets triggered when founcation withdraw tokens
    /// @param amount The amount of tokens withdrawn
    event FoundationWithdrawn(uint amount);
    ///@notice this event gets triggered when a instructor withdraw tokens
    /// @param instructor The address of the instructor
    /// @param amount The amount of tokens withdrawn
    /// @param debt The amount of tokens that are not withdrawn due to the debt
    event InstructorWithdrawn(
        address indexed instructor,
        uint amount,
        uint debt
    );
    /// @notice this event gets triggered when the refund window is updated
    /// @param newWindow The new refund window period
    event RefundWindowUpdated(uint newWindow);

    /// @notice constructor of the PlatformTreasury contract
    /// @param _rmAddress The address of the deployed role manager
    /// @param _udaoAddress The address of the deployed UDAO token
    /// @param _udaocAddress The address of the deployed UDAOC token
    /// @param _governanceTreasuryAddress The address of the deployed governance treasury
    /// @param _voucherVerifierAddress The address of the deployed voucher verifier
    constructor(
        address _rmAddress,
        address _udaoAddress,
        address _udaocAddress,
        address _governanceTreasuryAddress,
        address _voucherVerifierAddress
    )
        BasePlatform(
            _rmAddress,
            _udaoAddress,
            _udaocAddress,
            _governanceTreasuryAddress,
            _voucherVerifierAddress
        )
    {}

    /// @notice Allows anyone to update the platform cut balances and transfer the platform cut to governance
    function updateAndTransferPlatformBalances() external {
        /// @dev this is the timestamp of the transaction in days
        uint256 transactionTime = (block.timestamp / 86400);
        /// @dev transactionLBIndex determines a "transaction time dependent position" in the Locked balanaces array.
        uint256 transactionLBIndex = transactionTime % refundWindow;
        /// @dev update platform cut (coaching&content) pools and platform locked pools
        _updatePlatformCutBalances(
            0, //contentCut=0 due to there is no content revenue on this transaction
            0, //coachingCut=0 due to there is no coaching revenue on this transaction
            transactionTime,
            transactionLBIndex
        );
        /// @dev update instructor balance and instructor locked balances,
        _updateInstructorBalances(
            0, //instShare=0 due to there is no new revenue on this transaction
            msg.sender,
            transactionTime,
            transactionLBIndex
        );
        /// @dev if there is any revenue in platform cut pools, distribute role shares to roles and transfer governance role shares to governance treasury
        _transferPlatformCutstoGovernance();
    }

    /// @notice withdraws foundation balance to foundation wallet
    function withdrawFoundation() external whenNotPaused {
        require(
            block.timestamp > precautionWithdrawalTimestamp,
            "Precaution withdrawal period is not over"
        );

        require(
            hasRole(FOUNDATION_ROLE, msg.sender),
            "Only foundation can withdraw"
        );
        /// @dev this is the timestamp of the transaction in days
        uint256 transactionTime = (block.timestamp / 86400);
        /// @dev transactionLBIndex determines a "transaction time dependent position" in the Locked balanaces array.
        uint256 transactionLBIndex = transactionTime % refundWindow;
        /// @dev update platform cut (coaching&content) pools and platform locked pools
        _updatePlatformCutBalances(
            0, //contentCut=0 due to there is no content revenue on this transaction
            0, //coachingCut=0 due to there is no coaching revenue on this transaction
            transactionTime,
            transactionLBIndex
        );
        /// @dev if there is any revenue in platform cut pools, distribute role shares to roles and transfer governance role shares to governance treasury
        _transferPlatformCutstoGovernance();
        /// @dev calculate the withdrawable balance of foundation
        uint withdrawableBalance = foundationBalance;
        /// @dev zeroing before the actual withdraw
        foundationBalance = 0; /// @dev zeroing before the actual withdraw
        /// @dev transfer the withdrawable balance to the foundation wallet
        udao.transfer(foundationWallet, withdrawableBalance);

        emit FoundationWithdrawn(withdrawableBalance);
    }

    /// @notice Allows instructers to withdraw individually.
    function withdrawInstructor() external whenNotPaused {
        require(
            block.timestamp > precautionWithdrawalTimestamp,
            "Precaution withdrawal period is not over"
        );

        uint positiveBalance;
        uint refundedBalance;
        (positiveBalance, refundedBalance) = getWithdrawableBalanceInstructor(
            msg.sender
        );
        require(positiveBalance > 0, "No balance to withdraw");
        require(
            positiveBalance - refundedBalance > 0,
            "Debt is larger than or equal to balance"
        );
        /// @dev this is the timestamp of the transaction in days
        uint256 transactionTime = (block.timestamp / 86400);
        /// @dev transactionLBIndex determines a "transaction time dependent position" in the Locked balanaces array.
        uint256 transactionLBIndex = transactionTime % refundWindow;
        /// @dev update platform cut (coaching&content) pools and platform locked pools
        _updatePlatformCutBalances(
            0, //contentCut=0 due to there is no content revenue on this transaction
            0, //coachingCut=0 due to there is no coaching revenue on this transaction
            transactionTime,
            transactionLBIndex
        );
        /// @dev if there is any revenue in platform cut pools, distribute role shares to roles and transfer governance role shares to governance treasury
        _transferPlatformCutstoGovernance();
        /// @dev update instructor balance and instructor locked balances,
        _updateInstructorBalances(
            0, //instShare=0 due to there is no new revenue on this transaction
            msg.sender,
            transactionTime,
            transactionLBIndex
        );

        /// @dev calculate the debt(refunded and blocked balance) amount and withdrawable balance of the instructor
        uint debtAmount = instRefundedBalance[msg.sender];
        uint withdrawableBalance = instBalance[msg.sender] - debtAmount;
        /// @dev zeroing before the actual withdraw
        instBalance[msg.sender] = 0;
        instRefundedBalance[msg.sender] = 0;
        /// @dev transfer the withdrawable balance to the instructor
        udao.transfer(msg.sender, withdrawableBalance);

        emit InstructorWithdrawn(msg.sender, withdrawableBalance, debtAmount);
    }

    /// @notice returns the withdrawable balance of the instructor
    /// @param _inst The address of the instructor
    /// @return withdrawableBalance The withdrawable balance of the given instructor
    function getWithdrawableBalanceInstructor(
        address _inst
    ) public view returns (uint, uint) {
        uint instPositiveBalanceOnLock;
        uint instCurrentPositiveBalance;
        instCurrentPositiveBalance += instBalance[_inst];

        if (prevInstRefundWindow[_inst] == refundWindow) {
            /// @dev this is the timestamp of the transaction in days
            uint256 transactionTime = (block.timestamp / 86400);
            /// @dev transactionLBIndex determines a "transaction time dependent position" in the Locked balanaces array.
            uint256 transactionLBIndex = transactionTime % refundWindow;

            uint256 dayPassedInst = transactionTime - instLockTime[_inst];
            if (dayPassedInst >= refundWindow) {
                uint256 dayPassedInstMod;
                /// @dev if the instructor is locked for more than 2 refund window, the instructor will be able to withdraw all the locked balance
                if (dayPassedInst >= (refundWindow * 2)) {
                    dayPassedInstMod = refundWindow - 1;
                } else {
                    dayPassedInstMod = dayPassedInst % refundWindow;
                }
                /// @dev calculate the positive balance of the instructor
                for (uint256 i = 0; i <= dayPassedInstMod; i++) {
                    //Index of the day to be payout to instructor.
                    uint256 indexOfPayout = ((transactionLBIndex +
                        refundWindow) - i) % refundWindow;
                    instPositiveBalanceOnLock += instLockedBalance[_inst][
                        indexOfPayout
                    ];
                }
            }
        }
        /// @dev return the calculated positive balance and refunded balance of the instructor
        return (
            instCurrentPositiveBalance + instPositiveBalanceOnLock,
            instRefundedBalance[_inst]
        );
    }

    /// @notice Allows backend to change platform refun window period
    /// @param _newWindow The new refund window period
    function changeRefundWindow(uint256 _newWindow) external {
        require(
            hasRole(BACKEND_ROLE, msg.sender),
            "Only backend can set refund window"
        );
        /// @dev this is the timestamp of the transaction in days
        uint256 transactionTime = (block.timestamp / 86400);
        /// @dev transactionLBIndex determines a "transaction time dependent position" in the Locked balanaces array.
        uint256 transactionLBIndex = transactionTime % refundWindow;
        /// @dev update platform cut (coaching&content) pools and platform locked pools
        _updatePlatformCutBalances(
            0, //contentCut=0 due to there is no content revenue on this transaction
            0, //coachingCut=0 due to there is no coaching revenue on this transaction
            transactionTime,
            transactionLBIndex
        );
        /// @dev if there is any revenue in platform cut pools, distribute role shares to roles and transfer governance role shares to governance treasury
        _transferPlatformCutstoGovernance();
        /// @dev locked balances will be emptied and re-added to the platform cut pools
        uint256 emptiedContentCutPool;
        uint256 emptiedCoachingCutPool;
        /// @dev save the possession of locked balances and empty the locked balances
        for (uint256 i = 0; i < refundWindow; i++) {
            emptiedContentCutPool += contentCutLockedPool[i];
            contentCutLockedPool[i] = 0;
            emptiedCoachingCutPool += coachingCutLockedPool[i];
            coachingCutLockedPool[i] = 0;
        }

        if (refundWindow > _newWindow) {
            uint temp = block.timestamp + (refundWindow * 86400);
            if (temp > precautionWithdrawalTimestamp) {
                precautionWithdrawalTimestamp = temp;
            }
        }

        refundWindow = _newWindow;
        emit RefundWindowUpdated(_newWindow);

        /// @dev transactionLBIndex determines a "transaction time dependent position" in the Locked balanaces array.
        transactionLBIndex = transactionTime % refundWindow;
        /// @dev update platform cut (coaching&content) pools and platform locked pools
        _updatePlatformCutBalances(
            emptiedContentCutPool,
            emptiedCoachingCutPool,
            transactionTime,
            transactionLBIndex
        );
    }
}
