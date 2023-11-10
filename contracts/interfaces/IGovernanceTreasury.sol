// SPDX-License-Identifier: MIT
/// @title Interface of governance treasury contract
pragma solidity ^0.8.4;

interface IGovernanceTreasury {
    function jurorBalanceUpdate(uint _balance) external;

    function validatorBalanceUpdate(uint _balance) external;

    function governanceBalanceUpdate(uint _balance) external;
}
