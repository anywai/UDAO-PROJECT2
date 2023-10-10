// SPDX-License-Identifier: MIT
/// @title Set contract addresses from a central location

import "./interfaces/IRoleManager.sol";
import "./RoleNames.sol";

pragma solidity ^0.8.0;

contract ContractManager is RoleNames {
    IRoleManager roleManager;

    /// @dev Below should be set after the deployment
    address public StakingContractAddress; // staking contract
    address public PlatformTreasuryAddress; // platform treasury contract
    address public UdaoVpAddress; // udao vp contract

    /// @dev Below needs to be set during deployment
    address public ISupVisAddress; // supervision interface address
    address public UdaoAddress; // udao token address
    address public UdaocAddress; // content token address
    address public RmAddress; // role manager interface address

    /// @dev unknown if before or after
    address public GovernanceTreasuryAddress; // governance treasury contract
    address public VoucherVerifierAddress; // voucher verifier contract

    constructor(
        address _supAddress,
        address _udaoAddress,
        address _udaocAddress,
        address _rmAddress
    ) {
        // Set the initial addresses of contracts
        ISupVisAddress = _supAddress;
        UdaoAddress = _udaoAddress;
        UdaocAddress = _udaocAddress;
        RmAddress = _rmAddress;
        roleManager = IRoleManager(_rmAddress);
    }

    function setGovernanceTreasuryAddress(
        address _governanceTreasuryAddress
    ) external {
        require(
            roleManager.hasRole(BACKEND_ROLE, msg.sender),
            "Only backend can set governance treasury address"
        );
        GovernanceTreasuryAddress = _governanceTreasuryAddress;
    }

    function setPlatformTreasuryAddress(
        address _platformTreasuryAddress
    ) external {
        require(
            roleManager.hasRole(BACKEND_ROLE, msg.sender),
            "Only backend can set platform treasury address"
        );
        PlatformTreasuryAddress = _platformTreasuryAddress;
    }

    function setAddressStaking(address _stakingAddress) external {
        require(
            roleManager.hasRole(BACKEND_ROLE, msg.sender),
            "Only backend can set staking address"
        );
        StakingContractAddress = _stakingAddress;
    }

    function setAddressUdaoVp(address _udaoVpAddress) external {
        require(
            roleManager.hasRole(BACKEND_ROLE, msg.sender),
            "Only backend can set udao vp address"
        );
        UdaoVpAddress = _udaoVpAddress;
    }

    function setAddressISupVisAddress(address _supAddress) external {
        require(
            roleManager.hasRole(BACKEND_ROLE, msg.sender),
            "Only backend can set ISupVis address"
        );
        ISupVisAddress = _supAddress;
    }

    function setAddressUdaoAddress(address _udaoAddress) external {
        require(
            roleManager.hasRole(BACKEND_ROLE, msg.sender),
            "Only backend can set udao address"
        );
        UdaoAddress = _udaoAddress;
    }

    function setAddressUdaocAddress(address _udaocAddress) external {
        require(
            roleManager.hasRole(BACKEND_ROLE, msg.sender),
            "Only backend can set udaoc address"
        );
        UdaocAddress = _udaocAddress;
    }

    function setAddressIrmAddress(address _rmAddress) external {
        require(
            roleManager.hasRole(BACKEND_ROLE, msg.sender),
            "Only backend can set irm address"
        );
        RmAddress = _rmAddress;
    }

    function setAddressVoucherVerifierAddress(
        address _voucherVerifierAddress
    ) external {
        require(
            roleManager.hasRole(BACKEND_ROLE, msg.sender),
            "Only backend can set voucher verifier address"
        );
        VoucherVerifierAddress = _voucherVerifierAddress;
    }
}
