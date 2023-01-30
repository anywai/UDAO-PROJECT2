// SPDX-License-Identifier: MIT
/// @title Set contract addresses from a central location


import "./RoleController.sol";


pragma solidity ^0.8.0;

contract ContractManager is RoleController {
    address public IVMAddress; // validation interface address
    //address public IStakingContractAddress; //staking interface address
    address public IJMAddress;  // juror interface manager
    address public UdaoAddress;  // udao token address
    address public UdaocAddress;  // content token address
    address public IrmAddress;  // role manager interface address

    constructor(address _vmAddress, address _jmAddress, address _udaoAddress, address _udaocAddress, address _irmAddress) 
    RoleController(_irmAddress)
    {
        // Set the initial addresses of contracts 
        IVMAddress = _vmAddress;
        //IStakingContractAddress = _stakerAddress;
        IJMAddress = _jmAddress;
        UdaoAddress = _udaoAddress;
        UdaocAddress = _udaocAddress;
        IrmAddress = _irmAddress;
    }

    function setAddressIVM(address _vmAddress) external onlyRole(BACKEND_ROLE){
        IVMAddress = _vmAddress;
    }
    /*
    function setAddressStaker(address _stakerAddress) external onlyRole(BACKEND_ROLE) {
        IStakingContractAddress = _stakerAddress;
    }
    */
     function setAddressIJMAddress(address _jmAddress) external onlyRole(BACKEND_ROLE) {
        IJMAddress = _jmAddress;
    }
     function setAddressUdaoAddress(address _udaoAddress) external onlyRole(BACKEND_ROLE) {
        UdaoAddress = _udaoAddress;
    }
     function setAddressUdaocAddress(address _udaocAddress) external onlyRole(BACKEND_ROLE) {
        UdaocAddress = _udaocAddress;
    }
     function setAddressIrmAddress(address _irmAddress) external onlyRole(BACKEND_ROLE) {
        IrmAddress = _irmAddress;
    }
}
