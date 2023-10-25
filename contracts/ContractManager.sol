// SPDX-License-Identifier: MIT
/// @title Set contract addresses from a central location

import "./interfaces/IRoleManager.sol";
import "./RoleNames.sol";

interface updRoleManager {
    function updateAddresses(address supervisionAddress) external;
}

interface updUDAOC {
    function updateAddresses(
        address roleManagerAddress,
        address supervisionAddress
    ) external;
}

interface updUDAOCert {
    function updateAddresses(address roleManagerAddress) external;
}

interface updVoucherVerifier {
    function updateAddresses(address roleManagerAddress) external;
}

interface updPlatformTreasury {
    function updateAddresses(
        address udaoAddress,
        address udaocAddress,
        address roleManagerAddress,
        address governanceTreasuryAddress,
        address voucherVerifierAddress
    ) external;
}

interface updSupervision {
    function updateAddresses(
        address roleManagerAddress,
        address udaocAddress,
        address platformTreasuryAddress,
        address udaoStakerAddres
    ) external;
}

interface updUDAOvp {
    function updateAddresses(
        address roleManagerAddress,
        address udaoStakerAddres
    ) external;
}

interface updUDAOStaker {
    function updateAddresses(
        address roleManagerAddress,
        address udaoAddress,
        address platformTreasuryAddress,
        address udaoVpAddress
    ) external;
}

interface updUDAOGovernor {
    function updateAddresses(
        address roleManagerAddress,
        address udaoStakerAddress
    ) external;
}

pragma solidity ^0.8.0;

contract ContractManager is RoleNames {
    IRoleManager roleManager;

    // MVP contract addresses
    address public udaoAddress;
    address public roleManagerAddress;
    address public governanceTreasuryAddress; // Have a dummy version on MVP
    address public supervisionAddress; // Have a dummy version on MVP
    address public udaocAddress;
    address public udaoCertAddress;
    address public voucherVerifierAddress;
    address public platformTreasuryAddress;

    // Governance update contract addresses
    address public udaoVpAddress;
    address public udaoStakerAddress;
    address public udaoGovernorAddress;

    /// @dev Below should be set after the deployment
    /// TODO OLD CODE
    address public StakingContractAddress; // staking contract
    address public PlatformTreasuryAddress; // platform treasury contract
    address public UdaoVpAddress; // udao vp contract

    /// @dev Below needs to be set during deployment
    /// TODO OLD CODE
    address public ISupVisAddress; // supervision interface address
    address public UdaoAddress; // udao token address
    address public UdaocAddress; // content token address
    address public RmAddress; // role manager interface address

    /// @dev unknown if before or after
    /// TODO OLD CODE
    address public GovernanceTreasuryAddress; // governance treasury contract
    address public VoucherVerifierAddress; // voucher verifier contract

    constructor(address _roleManagerAddress) {
        roleManagerAddress = _roleManagerAddress;
        roleManager = IRoleManager(_roleManagerAddress);
    }

    function setMVPAddreses(
        address _udaoAddress,
        address _roleManagerAddress,
        address _udaocAddress,
        address _udaoCertAddress,
        address _voucherVerifierAddress,
        address _platformTreasuryAddress
    ) external {
        require(
            roleManager.hasRole(BACKEND_ROLE, msg.sender),
            "Only backend can set governance treasury address"
        );
        udaoAddress = _udaoAddress;
        roleManagerAddress = _roleManagerAddress;
        udaocAddress = _udaocAddress;
        udaoCertAddress = _udaoCertAddress;
        voucherVerifierAddress = _voucherVerifierAddress;
        platformTreasuryAddress = _platformTreasuryAddress;
    }

    function setDummyAddreses(
        address _governanceTreasuryAddress,
        address _supervisionAddress
    ) external {
        require(
            roleManager.hasRole(BACKEND_ROLE, msg.sender),
            "Only backend can set governance treasury address"
        );
        governanceTreasuryAddress = _governanceTreasuryAddress;
        supervisionAddress = _supervisionAddress;
    }

    function setGovernanceUpdateAddreses(
        address _udaoVpAddress,
        address _udaoStakerAddress,
        address _udaoGovernorAddress
    ) external {
        require(
            roleManager.hasRole(BACKEND_ROLE, msg.sender),
            "Only backend can set governance treasury address"
        );
        udaoVpAddress = _udaoVpAddress;
        udaoStakerAddress = _udaoStakerAddress;
        udaoGovernorAddress = _udaoGovernorAddress;
    }

    function callUpdAddFunctionsMVP() external {
        updRoleManager(roleManagerAddress).updateAddresses(supervisionAddress);
        updUDAOC(udaoAddress).updateAddresses(
            roleManagerAddress,
            supervisionAddress
        );
        updUDAOCert(udaoCertAddress).updateAddresses(roleManagerAddress);
        updVoucherVerifier(voucherVerifierAddress).updateAddresses(
            roleManagerAddress
        );
        updPlatformTreasury(platformTreasuryAddress).updateAddresses(
            udaoAddress,
            udaocAddress,
            roleManagerAddress,
            governanceTreasuryAddress,
            voucherVerifierAddress
        );
    }

    function callUpdAddFunctionsGoverUpd() external {
        updSupervision(supervisionAddress).updateAddresses(
            roleManagerAddress,
            udaocAddress,
            platformTreasuryAddress,
            udaoStakerAddress
        );
        updUDAOvp(udaoVpAddress).updateAddresses(
            roleManagerAddress,
            udaoStakerAddress
        );
        updUDAOStaker(udaoStakerAddress).updateAddresses(
            roleManagerAddress,
            udaoAddress,
            platformTreasuryAddress,
            udaoVpAddress
        );
        updUDAOGovernor(udaoGovernorAddress).updateAddresses(
            roleManagerAddress,
            udaoStakerAddress
        );
    }

    /// TODO OLD CODE BELOW
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
