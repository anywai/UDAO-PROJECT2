// SPDX-License-Identifier: MIT
/// @title Set contract addresses from a central location

import "./RoleController.sol";

pragma solidity ^0.8.0;

contract ContractManager is RoleController {
    /// @dev Below should be set after the deployment
    address public StakingContractAddress; // staking contract
    address public PlatformTreasuryAddress; // platform treasury contract
    address public UdaoVpAddress; // udao vp contract

    /// @dev Below needs to be set during deployment
    address public IVMAddress; // validation interface address
    address public IJMAddress; // juror interface manager
    address public ISupervision; // supervision interface address
    address public UdaoAddress; // udao token address
    address public UdaocAddress; // content token address
    address public IrmAddress; // role manager interface address

    constructor(
        address _vmAddress,
        address _jmAddress,
        address _supAddress,
        address _udaoAddress,
        address _udaocAddress,
        address _irmAddress
    ) RoleController(_irmAddress) {
        // Set the initial addresses of contracts
        IVMAddress = _vmAddress;
        IJMAddress = _jmAddress;
        ISupervision = _supAddress;
        UdaoAddress = _udaoAddress;
        UdaocAddress = _udaocAddress;
        IrmAddress = _irmAddress;
    }

    function setPlatformTreasuryAddress(
        address _platformTreasuryAddress
    ) external onlyRole(BACKEND_ROLE) {
        PlatformTreasuryAddress = _platformTreasuryAddress;
    }

    function setAddressIVM(address _vmAddress) external onlyRole(BACKEND_ROLE) {
        IVMAddress = _vmAddress;
    }

    function setAddressStaking(
        address _stakingAddress
    ) external onlyRole(BACKEND_ROLE) {
        StakingContractAddress = _stakingAddress;
    }

    function setAddressUdaoVp(
        address _udaoVpAddress
    ) external onlyRole(BACKEND_ROLE) {
        UdaoVpAddress = _udaoVpAddress;
    }

    function setAddressIJMAddress(
        address _jmAddress
    ) external onlyRole(BACKEND_ROLE) {
        IJMAddress = _jmAddress;
    }

    function setAddressISupervision(
        address _supAddress
    ) external onlyRole(BACKEND_ROLE) {
        ISupervision = _supAddress;
    }

    function setAddressUdaoAddress(
        address _udaoAddress
    ) external onlyRole(BACKEND_ROLE) {
        UdaoAddress = _udaoAddress;
    }

    function setAddressUdaocAddress(
        address _udaocAddress
    ) external onlyRole(BACKEND_ROLE) {
        UdaocAddress = _udaocAddress;
    }

    function setAddressIrmAddress(
        address _irmAddress
    ) external onlyRole(BACKEND_ROLE) {
        IrmAddress = _irmAddress;
    }
}
