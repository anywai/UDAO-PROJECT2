// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "./ContentManager.sol";
import "hardhat/console.sol";

contract PlatformTreasury is ContentManager {
    ///@notice this event gets triggered when founcation withdraw tokens
    event FoundationWithdrawn(uint amount);
    ///@notice this event gets triggered when a instructor withdraw tokens
    event InstructorWithdrawn(address instructor, uint amount, uint debt);
    /// @notice this event gets triggered when the refund window is updated
    event RefundWindowUpdated(uint newWindow);

    /// @param _rmAddress The address of the deployed role manager
    constructor(
        address _udaoAddress,
        address _udaocAddress,
        address _rmAddress,
        address _iGovernanceTreasuryAddress,
        address voucherVerifierAddress
    )
        BasePlatform(
            _udaoAddress,
            _udaocAddress,
            _rmAddress,
            _iGovernanceTreasuryAddress,
            voucherVerifierAddress
        )
    {}

    /// @notice Allows anyone to update the platform cut balances and transfer the platform cut to governance
    function updateAndTransferPlatformBalances() external {
        uint256 transactionTime = (block.timestamp / epochOneDay);
        uint256 transactionFuIndex = transactionTime % refundWindow;
        _updatePlatformCutBalances(0, 0, transactionTime, transactionFuIndex);
        _transferPlatformCutstoGovernance();
    }

    /// @notice withdraws foundation balance to foundation wallet
    function withdrawFoundation() external whenNotPaused {
        require(
            hasRole(FOUNDATION_ROLE, msg.sender),
            "Only foundation can withdraw"
        );

        uint256 transactionTime = (block.timestamp / epochOneDay);
        uint256 transactionFuIndex = transactionTime % refundWindow;
        _updatePlatformCutBalances(0, 0, transactionTime, transactionFuIndex);
        _transferPlatformCutstoGovernance();

        uint withdrawableBalance = foundationBalance;
        foundationBalance = 0; /// @dev zeroing before the actual withdraw
        udao.transfer(foundationWallet, withdrawableBalance);

        emit FoundationWithdrawn(withdrawableBalance);
    }

    /// @notice Allows instructers to withdraw individually.
    function withdrawInstructor() external whenNotPaused {
        require(
            getWithdrawableBalanceInstructor(msg.sender) > 0,
            "No balance to withdraw"
        );

        uint256 transactionTime = (block.timestamp / epochOneDay);
        uint256 transactionFuIndex = transactionTime % refundWindow;
        _updatePlatformCutBalances(0, 0, transactionTime, transactionFuIndex);
        _transferPlatformCutstoGovernance();
        _updateInstructorBalances(
            0,
            msg.sender,
            transactionTime,
            transactionFuIndex
        );

        require(
            instBalance[msg.sender] >= instRefundedBalance[msg.sender],
            "Debt is larger than balance"
        );
        uint debtAmount = instRefundedBalance[msg.sender];
        uint withdrawableBalance = instBalance[msg.sender] - debtAmount;
        instBalance[msg.sender] = 0;
        instRefundedBalance[msg.sender] = 0;
        udao.transfer(msg.sender, withdrawableBalance);

        emit InstructorWithdrawn(msg.sender, withdrawableBalance, debtAmount);
    }

    /// @notice returns the withdrawable balance of the instructor
    /// @param _inst The address of the instructor
    /// @return withdrawableBalance The withdrawable balance of the given instructor
    function getWithdrawableBalanceInstructor(
        address _inst
    ) public view returns (uint) {
        uint256 transactionTime = (block.timestamp / epochOneDay);
        //transactionFuIndex determines which position it will be added to in the FutureBalances array.
        uint256 transactionFuIndex = transactionTime % refundWindow;
        uint instPositiveBalance;

        uint256 dayPassedInst = transactionTime - instLockTime[_inst];
        uint256 dayPassedInstMod;

        if (dayPassedInst >= (refundWindow * 2)) {
            dayPassedInstMod = refundWindow - 1;
        } else {
            dayPassedInstMod = dayPassedInst % refundWindow;
        }

        for (uint256 i = 0; i <= dayPassedInstMod; i++) {
            //Index of the day to be payout to instructor.
            uint256 indexOfPayout = ((transactionFuIndex + refundWindow) - i) %
                refundWindow;
            instPositiveBalance += instLockedBalance[_inst][indexOfPayout];
        }

        if ((instPositiveBalance - instRefundedBalance[_inst]) > 0) {
            return instPositiveBalance - instRefundedBalance[_inst];
        } else {
            return 0;
        }
    }

    /// @notice Allows backend to change platform refun window period
    /// @param _newWindow The new refund window period
    function changeRefundWindow(uint256 _newWindow) external {
        require(
            hasRole(BACKEND_ROLE, msg.sender),
            "Only backend can set refund window"
        );
        require(notBanned(msg.sender, 34), "Caller is banned");

        uint256 transactionTime = (block.timestamp / epochOneDay);
        uint256 transactionFuIndex = transactionTime % refundWindow;

        _updatePlatformCutBalances(0, 0, transactionTime, transactionFuIndex);
        // locked balances will be emptied
        uint256 emptiedContentCutPool;
        uint256 emptiedCoachingCutPool;
        // save the possession of locked balances and empty the locked balances
        for (uint256 i = 0; i < refundWindow; i++) {
            emptiedContentCutPool += contentCutLockedPool[i];
            contentCutLockedPool[i] = 0;
            emptiedCoachingCutPool += coachingCutLockedPool[i];
            coachingCutLockedPool[i] = 0;
        }
        refundWindow = _newWindow;
        emit RefundWindowUpdated(_newWindow);

        _updatePlatformCutBalances(
            emptiedContentCutPool,
            emptiedCoachingCutPool,
            transactionTime,
            transactionFuIndex
        );
        _transferPlatformCutstoGovernance();
    }
}
