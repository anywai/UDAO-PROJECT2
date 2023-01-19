// SPDX-License-Identifier: MIT
/// @title Set contract addresses from a central location

pragma solidity ^0.8.0;

contract ContractManager {
    address public IVMAddress; // validation interface address
    address public IStakingContractAddress; //staking interface address
    address public IJMAddress;  // juror interface manager
    address public UdaoAddress;  // udao token address
    address public UdaocAddress;  // content token address
    address public RmAddress;  // role manager address

    constructor(address _vmAddress, address _stakerAddress) public {
        // Set the initial addresses of contracts A and B
        IVMAddress = address(_vmAddress);
        IStakingContractAddress = address(_stakerAddress);
    }

    function setAddressIVM(address _vmAddress) public {
        IVMAddress = _vmAddress;
    }

    function setAddressStaker(address _stakerAddress) public {
        IStakingContractAddress = _stakerAddress;
    }
}
