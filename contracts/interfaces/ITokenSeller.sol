// SPDX-License-Identifier: MIT
/// @title Interface of supervision contract
pragma solidity ^0.8.4;

interface ITokenSeller {
    function addBalance(address _user, uint256 _amount) external;

    function getBalance(address _user) external view returns (uint256);

    function setUDAOContract(address _UDAOContract) external;

    function resetBalance(address _user) external;
}