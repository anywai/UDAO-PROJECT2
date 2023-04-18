// SPDX-License-Identifier: MIT
/// @title Controls roles for whole platform. All contracts inherits this contract.
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
    bytes32 public constant GOVERNANCE_CONTRACT = keccak256("GOVERNANCE_CONTRACT");
    bytes32 public constant JUROR_ROLE = keccak256("JUROR_ROLE");
    bytes32 public constant JUROR_CONTRACT = keccak256("JUROR_CONTRACT");
    bytes32 public constant TREASURY_CONTRACT = keccak256("TREASURY_CONTRACT");
    bytes32 public constant VALIDATION_MANAGER =
        keccak256("VALIDATION_MANAGER");
    bytes32 public constant CORPORATE_ROLE =
        keccak256("CORPORATE_ROLE");

    /// Role group for validators
    bytes32[] validator_roles;

    /// Role group for administrator roles
    bytes32[] administrator_roles;

    IRoleManager IRM;

    /**
     * @notice onlyRole is used to check if the msg.sender has the a role required to call that function
     */
    modifier onlyRole(bytes32 role) {
        IRM.checkRole(role, _msgSender());
        _;
    }

    /**
     * @notice onlyRole is used to check if the msg.sender has one of the roles required to call that function
     */
    modifier onlyRoles(bytes32[] memory roles) {
        IRM.checkRoles(roles, _msgSender());
        _;
    }

    /// @param rmAddress The address of the deployed role manager
    constructor(address rmAddress) {
        IRM = IRoleManager(rmAddress);
        validator_roles.push(VALIDATOR_ROLE);
        validator_roles.push(SUPER_VALIDATOR_ROLE);
        administrator_roles.push(FOUNDATION_ROLE);
        administrator_roles.push(GOVERNANCE_ROLE);
    }

    /// @notice pauses function
    function pause() public onlyRole(BACKEND_ROLE) {
        _pause();
    }

    /// @notice unpauses function
    function unpause() public onlyRole(BACKEND_ROLE) {
        _unpause();
    }
}
