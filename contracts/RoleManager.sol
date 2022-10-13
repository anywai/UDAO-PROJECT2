// SPDX-License-Identifier: MIT
/// @title UDAO smart contract's role definitions. Other contracts inherits this to allow usage of custom roles.
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/access/AccessControl.sol";

contract RoleManager is AccessControl {
    bytes32 public constant VALIDATOR_ROLE = keccak256("VALIDATOR_ROLE");
    bytes32 public constant SUPER_VALIDATOR_ROLE =
        keccak256("SUPER_VALIDATOR_ROLE");
    bytes32 public constant BACKEND_ROLE = keccak256("BACKEND_ROLE");
    bytes32 public constant FOUNDATION_ROLE = keccak256("FOUNDATION_ROLE");
    bytes32 public constant STAKING_CONTRACT = keccak256("STAKING_CONTRACT");
    bytes32 public constant GOVERNANCE_ROLE = keccak256("GOVERNANCE_ROLE");
    bytes32 public constant JUROR_ROLE = keccak256("JUROR_ROLE");
    bytes32 public constant JUROR_CONTRACT = keccak256("JUROR_CONTRACT");

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
