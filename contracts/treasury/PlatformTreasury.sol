// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "./ContentManager.sol";

contract PlatformTreasury is Pausable, ContentManager {
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
        address priceGetterAddress
    ) BasePlatform(_contractManagerAddress, _rmAddress, priceGetterAddress) {}

    /// @notice withdraws foundation balance to foundation wallet
    function withdrawFoundation() external whenNotPaused {
        require(
            roleManager.hasRole(FOUNDATION_ROLE, msg.sender),
            "Only foundation can withdraw"
        );
        uint withdrawableBalance = foundCurrentBalance;
        foundCurrentBalance = 0; /// @dev zeroing before the actual withdraw
        udao.transfer(foundationWallet, withdrawableBalance);
        emit FoundationWithdrawn(withdrawableBalance);
    }

    /// @notice Allows instructers to withdraw individually.
    function withdrawInstructor() external whenNotPaused {
        require(
            instCurrentBalance[msg.sender] >= instRefundDebt[msg.sender],
            "Debt is larger than balance"
        );
        uint debtAmount = instRefundDebt[msg.sender];
        uint withdrawableBalance = instCurrentBalance[msg.sender] - debtAmount;
        instCurrentBalance[msg.sender] = 0;
        instRefundDebt[msg.sender] = 0;
        udao.transfer(msg.sender, withdrawableBalance);

        emit InstructorWithdrawn(msg.sender, withdrawableBalance, debtAmount);
    
    }
}
