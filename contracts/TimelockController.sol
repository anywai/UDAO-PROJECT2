// SPDX-License-Identifier: MIT
/// @title UDAO timelock controller for governance
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/governance/TimelockController.sol";

contract UDAOTimelockController is TimelockController {
    constructor(
        uint256 minDelay,
        address[] memory proposers,
        address[] memory executors
    ) TimelockController(minDelay, proposers, executors) {}

    /// @notice executes the acceepted proposal
    /// TODO Write Parameters
    function execute(
        address target,
        uint256 value,
        bytes calldata data,
        bytes32 predecessor,
        bytes32 salt
    )
        public
        payable
        virtual
        override(TimelockController)
        onlyRoleOrOpenRole(EXECUTOR_ROLE)
    {
        return super.execute(target, value, data, predecessor, salt);
    }
}
