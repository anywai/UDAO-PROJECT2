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

    /*
    /// @notice executes the acceepted proposal
    /// @param  target the address of the smart contract that the timelock should operate on
    /// @param value  in wei, that should be sent with the transaction. Most of the time this will be 0
    /// @param data containing the encoded function selector and parameters of the call. 
    This can be produced using a number of tools.
    /// @param predecessor that specifies a dependency between operations. 
    This dependency is optional. Use bytes32(0) if the operation does not have any dependency.
    /// @param salt  Used to disambiguate two otherwise identical operations. This can be any random value.
    */
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
