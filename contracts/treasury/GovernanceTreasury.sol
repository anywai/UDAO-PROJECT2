// SPDX-License-Identifier: MIT
/// @title Dummy version of the governance treasury contract.
/// @notice This contract is only a placeholder to enable compilation and interaction for other contracts, and will be replaced at UDAO version 2.0 with a functional contract.
/// @dev This contract is intended to distribute the accumulated pool balances for jurors, validators, and governance to respective individuals in future functionalities.
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract GovernanceTreasury {
    // UDAO (ERC20) Token contract address
    IERC20 udao;

    /// @notice Balance of jurors, its a pool for jurors transferred from platform treasury.
    uint jurorBalance;
    /// @notice Balance of validators, its a pool for validators transferred from platform treasury.
    uint validatorBalance;
    /// @notice Balance of governance, its a pool for governance transferred from platform treasury.
    uint governanceBalance;

    /// @notice Address of the deployer of this dummy contract
    address ownerOfDummy;

    /// @notice Constructor function of governance treasury contract.
    /// @param udaoAddress Address of the UDAO token contract.
    constructor(address udaoAddress) {
        udao = IERC20(udaoAddress);
        ownerOfDummy = msg.sender;
    }

    /// @notice Updates the jurors balance in this treasury.
    /// @param _balance The balance to update.
    function jurorBalanceUpdate(uint _balance) external {
        jurorBalance += _balance;
    }

    /// @notice Updates the validators balance in this treasury.
    /// @param _balance The balance to update.
    function validatorBalanceUpdate(uint _balance) external {
        validatorBalance += _balance;
    }

    /// @notice Updates the governance balance in this treasury.
    /// @param _balance The balance to update.
    function governanceBalanceUpdate(uint _balance) external {
        governanceBalance += _balance;
    }

    /// @notice Withdraws the balance of the treasury.
    /// @dev this dummy contract should not accumulate any balance, if any at all it an unwanted behaviour and deployer can save the funds.
    function emergencyWithdraw() external {
        require(
            msg.sender == ownerOfDummy,
            "you are not owner of dummy contract"
        );
        udao.transfer(msg.sender, udao.balanceOf(address(this)));
        validatorBalance = 0;
        jurorBalance = 0;
        governanceBalance = 0;
    }
}
