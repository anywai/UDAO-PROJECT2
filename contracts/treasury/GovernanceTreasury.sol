// SPDX-License-Identifier: MIT
/// @title UDAO #####
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "../RoleController.sol";

contract GovernanceTreasury is RoleController {
    ///TODO: Add events

    // To send ETH to a contract, valid sender addresses can be store into the contract
    address payable public BasePlatform;

    constructor(
        address rmAddress,
        address bpAddress
    ) payable RoleController(rmAddress) {
        BasePlatform = payable(bpAddress);
    }

    // UDAO (ERC20) Token interface
    IERC20 udao;

    /// @notice This function is used to transfer UDAO token to an address
    /// @param receiver The address of receiver
    /// @param amount The amount of UDAO token to transfer
    function transferUDAOFund(
        address receiver,
        uint amount
    ) external onlyRole(GOVERNANCE_ROLE) {
        require(
            udao.balanceOf(address(this)) >= amount,
            "GovernanceTreasury: Not enough UDAO in treasury"
        );

        udao.transfer(receiver, amount);
        //emit ThisIsAEmit1 -UDAOtransfered()-
    }

    /// @notice This function is used to transfer ETH to an address
    /// @param receiver The address of receiver
    /// @param amount The amount of ETH to transfer
    function transferETHFund(
        address payable receiver,
        uint amount
    ) external onlyRole(GOVERNANCE_ROLE) {
        require(
            address(this).balance >= amount,
            "GovernanceTreasury: Not enough ETH in treasury"
        );

        receiver.transfer(amount);
        //emit ThisIsAEmit2 -ETHtransfered()-
    }

    /// @notice This function is used to send ETH to this contract
    /// @dev To send ETH to a contract, the contract must have a receive() function
    function depositETHFund() public payable {
        //emit ThisIsAEmit3 -ETHreceived()-
    }

    /// @notice This function is used to get UDAO balance of GovernanceTreasury
    function getGovernanceTreasuryUDAOBalance() external view returns (uint) {
        return udao.balanceOf(address(this));
    }

    /// @notice This function is used to get UDAO balance of GovernanceTreasury
    function getGovernanceTreasuryETHBalance() external view returns (uint) {
        return address(this).balance;
    }
}
