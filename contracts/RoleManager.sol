// SPDX-License-Identifier: MIT
/// @title UDAO smart contract's role definitions. Other contracts inherits this to allow usage of custom roles.
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/access/AccessControl.sol";

contract RoleManager is AccessControl {
    function checkRole(bytes32 role, address account) external view {
        _checkRole(role, account);
    }

    function checkRoles(bytes32[] calldata roles, address account)
        external
        view
    {
        _checkRoles(roles, account);
    }

    function _checkRoles(bytes32[] calldata roles, address account)
        internal
        view
        virtual
    {
        uint rolesLength = roles.length;
        for (uint i = 0; i < rolesLength; i++) {
            if (hasRole(roles[i], account)) {
                return;
            }
        }
        revert(
            string(
                abi.encodePacked(
                    "AccessControl: account ",
                    Strings.toHexString(uint160(account), 20),
                    " is missing role "
                )
            )
        );
    }
}
