// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "./ContentManager.sol";

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
        require(
            instBalance[msg.sender] >= instRefundedBalance[msg.sender],
            "Debt is larger than balance"
        );
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
        _sendCurrentGlobalCutsToGovernanceTreasury();

        uint debtAmount = instRefundedBalance[msg.sender];
        uint withdrawableBalance = instBalance[msg.sender] - debtAmount;
        instBalance[msg.sender] = 0;
        instRefundedBalance[msg.sender] = 0;
        udao.transfer(msg.sender, withdrawableBalance);

        emit InstructorWithdrawn(msg.sender, withdrawableBalance, debtAmount);
    }
}
