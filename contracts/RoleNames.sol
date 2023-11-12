// SPDX-License-Identifier: MIT
/// @title UDAO smart contract's role name definitions.
pragma solidity ^0.8.4;

abstract contract RoleNames {
    bytes32 public constant VALIDATOR_ROLE = keccak256("VALIDATOR_ROLE");
    bytes32 public constant BACKEND_ROLE = keccak256("BACKEND_ROLE");
    bytes32 public constant FOUNDATION_ROLE = keccak256("FOUNDATION_ROLE");
    bytes32 public constant STAKING_CONTRACT = keccak256("STAKING_CONTRACT");
    bytes32 public constant GOVERNANCE_ROLE = keccak256("GOVERNANCE_ROLE");
    bytes32 public constant GOVERNANCE_CONTRACT =
        keccak256("GOVERNANCE_CONTRACT");
    bytes32 public constant UDAOC_CONTRACT = keccak256("UDAOC_CONTRACT");
    bytes32 public constant JUROR_ROLE = keccak256("JUROR_ROLE");
    bytes32 public constant SUPERVISION_CONTRACT =
        keccak256("SUPERVISION_CONTRACT");
    bytes32 public constant TREASURY_CONTRACT = keccak256("TREASURY_CONTRACT");
    bytes32 public constant ROLEMANAGER_CONTRACT =
        keccak256("ROLEMANAGER_CONTRACT");
    bytes32 public constant CONTRACT_MANAGER = keccak256("CONTRACT_MANAGER");
    bytes32 public constant SALE_CONTROLLER = keccak256("SALE_CONTROLLER");
    bytes32 public constant VOUCHER_VERIFIER = keccak256("VOUCHER_VERIFIER");
    bytes32 public constant CONTENT_PUBLISHER = keccak256("CONTENT_PUBLISHER");

    /// Role group for administrator roles
    bytes32[] administrator_roles;

    constructor() {
        administrator_roles.push(FOUNDATION_ROLE);
        administrator_roles.push(GOVERNANCE_ROLE);
        administrator_roles.push(BACKEND_ROLE);
    }
}
