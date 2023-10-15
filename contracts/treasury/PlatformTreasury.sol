// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "./ContentManager.sol";
import "hardhat/console.sol";

contract PlatformTreasury is ContentManager {
    string private constant SIGNING_DOMAIN = "ValidationScore";
    string private constant SIGNATURE_VERSION = "1";

    /// this event gets triggered when governance withdraw tokens
    event GovernanceWithdrawn(uint amount);

    /// this event gets triggered when founcation withdraw tokens
    event FoundationWithdrawn(uint amount);

    /// this event gets triggered when a validator withdraw tokens
    event ValidatorWithdrawn(address validator, uint amount);

    /// this event gets triggered when a juror withdraw tokens
    event JurorWithdrawn(address juror, uint amount);

    /// this event gets triggered when a instructor withdraw tokens
    event InstructorWithdrawn(address instructor, uint amount, uint debt);

    /// @param _contractManagerAddress The address of the deployed role manager
    /// @param _rmAddress The address of the deployed role manager
    constructor(
        address _contractManagerAddress,
        address _rmAddress,
        address _iGovernanceTreasuryAddress,
        address voucherVerifierAddress
    )
        BasePlatform(
            _contractManagerAddress,
            _rmAddress,
            _iGovernanceTreasuryAddress,
            voucherVerifierAddress
        )
    {}

    /// @notice withdraws foundation balance to foundation wallet
    function withdrawFoundation() external whenNotPaused {
        require(
            roleManager.hasRole(FOUNDATION_ROLE, msg.sender),
            "Only foundation can withdraw"
        );

        uint256 transactionTime = (block.timestamp / epochOneDay);
        uint256 transactionFuIndex = transactionTime % refundWindow;
        _updateGlobalContentBalances(0, transactionTime, transactionFuIndex);
        _updateGlobalCoachingBalances(0, transactionTime, transactionFuIndex);
        _sendCurrentGlobalCutsToGovernanceTreasury();

        uint withdrawableBalance = foundationBalance;
        foundationBalance = 0; /// @dev zeroing before the actual withdraw
        udao.transfer(foundationWallet, withdrawableBalance);
        emit FoundationWithdrawn(withdrawableBalance);
    }

    /// @notice Allows instructers to withdraw individually.
    function withdrawInstructor() external whenNotPaused {
        // TODO instructorWitdrawableBalance view function
        uint256 transactionTime = (block.timestamp / epochOneDay);
        uint256 transactionFuIndex = transactionTime % refundWindow;
        _updateGlobalContentBalances(0, transactionTime, transactionFuIndex);
        _updateGlobalCoachingBalances(0, transactionTime, transactionFuIndex);
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
        _sendCurrentGlobalCutsToGovernanceTreasury();

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
        if (dayPassedInst >= (refundWindow * 2)) {
            for (uint256 i = 0; i < refundWindow; i++) {
                instPositiveBalance += instLockedBalance[_inst][i];
            }
        } else {
            uint256 dayPassedInstMod = dayPassedInst % refundWindow;
            for (uint256 i = 0; i <= dayPassedInstMod; i++) {
                //Index of the day to be payout to instructor.
                uint256 indexOfPayout = ((transactionFuIndex + refundWindow) -
                    i) % refundWindow;
                instPositiveBalance += instLockedBalance[_inst][indexOfPayout];
            }
        }
        return instPositiveBalance - instRefundedBalance[_inst];
    }

    function changeRefundWindow(uint256 _newWindow) external {
        require(
            roleManager.hasRole(BACKEND_ROLE, msg.sender),
            "Only backend can set refund window"
        );
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

        uint256 transactionTime = (block.timestamp / epochOneDay);
        uint256 transactionFuIndex = transactionTime % refundWindow;

        _updateGlobalContentBalances(
            emptiedContentCutPool,
            transactionTime,
            transactionFuIndex
        );
        _updateGlobalCoachingBalances(
            emptiedCoachingCutPool,
            transactionTime,
            transactionFuIndex
        );
        //emit RefundWindowUpdated(_newWindow);
    }
}
