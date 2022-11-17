// SPDX-License-Identifier: MIT
/// @title Interface for UDAO smart contract's role definitions. Other contracts inherits this to allow usage of custom roles.
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/access/IAccessControl.sol";

interface IRoleManager is IAccessControl {
    function checkRole(bytes32 roles, address account) external view;

    function checkRoles(bytes32[] memory roles, address account) external view;

    function getKYC(address _address) external view returns (bool);

    function getBan(address _address) external view returns (bool);
}
