// SPDX-License-Identifier: MIT
/// @title UDAO smart contract's role definitions.

pragma solidity ^0.8.4;

import "./RoleNames.sol";
import "./interfaces/IRoleManager.sol";

abstract contract RoleLegacy is RoleNames {
    /// @notice Role manager contract address
    IRoleManager roleManager;

    function hasRole(
        bytes32 _role,
        address _account
    ) internal view returns (bool) {
        return (roleManager.hasRole(_role, _account));
    }

    function isNotBanned(
        address _userAddress,
        uint _functionID
    ) internal view returns (bool) {
        return !roleManager.isBanned(_userAddress, _functionID);
    }

    function isKYCed(
        address _userAddress,
        uint _functionID
    ) internal view returns (bool) {
        return roleManager.isKYCed(_userAddress, _functionID);
    }
}
