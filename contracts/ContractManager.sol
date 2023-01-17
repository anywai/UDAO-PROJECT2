// SPDX-License-Identifier: MIT
/// @title Set contract addresses from a central location

pragma solidity ^0.8.0;

contract ContractManager {
    address public IVMAddress;
    address public StakerAddress;

    constructor(address _vmAddress, address _stakerAddress) public {
        // Set the initial addresses of contracts A and B
        IVMAddress = address(_vmAddress);
        StakerAddress = address(_stakerAddress);
    }

    function setAddressIVM(address _vmAddress) public {
        IVMAddress = _vmAddress;
    }

    function setAddressStaker(address _stakerAddress) public {
        StakerAddress = _stakerAddress;
    }
}
