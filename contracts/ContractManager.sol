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
    address public ISupVisAddress; // supervision interface address
    address public UdaoAddress; // udao token address
    address public UdaocAddress; // content token address
    address public IrmAddress; // role manager interface address

    /// @dev unknown if before or after
    address public IPriceGetterAddress; // price getter interface address
    address public GovernanceTreasuryAddress; // governance treasury contract

    constructor(
        address _supAddress,
        address _udaoAddress,
        address _udaocAddress,
        address _irmAddress
    ) RoleController(_irmAddress) {
        // Set the initial addresses of contracts
        ISupVisAddress = _supAddress;
        UdaoAddress = _udaoAddress;
        UdaocAddress = _udaocAddress;
        IrmAddress = _irmAddress;
    }

    function setGovernanceTreasuryAddress(
        address _governanceTreasuryAddress
    ) external onlyRole(BACKEND_ROLE) {
        GovernanceTreasuryAddress = _governanceTreasuryAddress;
    }
    function setPlatformTreasuryAddress(
        address _platformTreasuryAddress
    ) external onlyRole(BACKEND_ROLE) {
        PlatformTreasuryAddress = _platformTreasuryAddress;
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

    function setAddressISupVisAddress(
        address _supAddress
    ) external onlyRole(BACKEND_ROLE) {
        ISupVisAddress = _supAddress;
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

    function setAddressIPriceGetterAddress(
        address _priceGetterAddress
    ) external onlyRole(BACKEND_ROLE) {
        IPriceGetterAddress = _priceGetterAddress;
    }
}
