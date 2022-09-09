// SPDX-License-Identifier: MIT
/// @title UDAO smart contract's role definitions. Other contracts inherits this to allow usage of custom roles.
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/access/AccessControl.sol";

abstract contract RoleManager is AccessControl {
    bytes32 public constant VALIDATOR_ROLE = keccak256("VALIDATOR_ROLE");
    bytes32 public constant SUPER_VALIDATOR_ROLE =
        keccak256("SUPER_VALIDATOR_ROLE");
    bytes32 public constant BACKEND_ROLE = keccak256("BACKEND_ROLE");
    bytes32 public constant FOUNDATION_ROLE = keccak256("FOUNDATION_ROLE");
    bytes32 public constant STAKING_CONTRACT = keccak256("STAKING_CONTRACT");
    bytes32 public constant GOVERNANCE_ROLE = keccak256("GOVERNANCE_ROLE");
    bytes32 public constant JUROR_ROLE = keccak256("JUROR_ROLE");
    bytes32 public constant JUROR_CONTRACT = keccak256("JUROR_CONTRACT");
}
