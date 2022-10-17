// SPDX-License-Identifier: MIT
/// @title #########################
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/security/Pausable.sol";
import "./IRoleManager.sol";
import "@openzeppelin/contracts/utils/Context.sol";

abstract contract RoleController is Context, Pausable {
    bytes32 public constant VALIDATOR_ROLE = keccak256("VALIDATOR_ROLE");
    bytes32 public constant SUPER_VALIDATOR_ROLE =
        keccak256("SUPER_VALIDATOR_ROLE");
    bytes32 public constant BACKEND_ROLE = keccak256("BACKEND_ROLE");
    bytes32 public constant FOUNDATION_ROLE = keccak256("FOUNDATION_ROLE");
    bytes32 public constant STAKING_CONTRACT = keccak256("STAKING_CONTRACT");
    bytes32 public constant GOVERNANCE_ROLE = keccak256("GOVERNANCE_ROLE");
    bytes32 public constant JUROR_ROLE = keccak256("JUROR_ROLE");
    bytes32 public constant JUROR_CONTRACT = keccak256("JUROR_CONTRACT");

    bytes32[] validator_roles;

    IRoleManager irm;

    modifier onlyRole(bytes32 role) {
        irm.checkRole(role, _msgSender());
        _;
    }
    modifier onlyRoles(bytes32[] memory roles) {
        irm.checkRoles(roles, _msgSender());
        _;
    }

    constructor(address irmAddress) {
        irm = IRoleManager(irmAddress);
        validator_roles.push(VALIDATOR_ROLE);
        validator_roles.push(SUPER_VALIDATOR_ROLE);
    }

    function pause() public onlyRole(BACKEND_ROLE) {
        _pause();
    }

    function unpause() public onlyRole(BACKEND_ROLE) {
        _unpause();
    }
}
