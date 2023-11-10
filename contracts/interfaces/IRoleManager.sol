// SPDX-License-Identifier: MIT
/// @title Interface of role manager: UDAO smart contract's role, KYC and ban management
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/access/IAccessControl.sol";

interface IRoleManager is IAccessControl {
    function checkRole(bytes32 roles, address account) external view;

    function checkRoles(bytes32[] memory roles, address account) external view;

    function hasRoles(
        bytes32[] memory roles,
        address account
    ) external view returns (bool);

    function isKYCed(
        address _address,
        uint256 functionId
    ) external view returns (bool);

    function isBanned(
        address _address,
        uint256 functionId
    ) external view returns (bool);

    function grantRoleStaker(bytes32 role, address user) external;

    function revokeRoleStaker(bytes32 role, address user) external;
}
