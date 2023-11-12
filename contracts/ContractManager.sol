// SPDX-License-Identifier: MIT

/// @title A contract for storing and updating project-wide contract addresses.
/// @dev This helper-contract facilitates straightforward updates and synchronization of contract addresses within the project.

import "./interfaces/IRoleManager.sol";
import "./RoleLegacy.sol";

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

contract ContractManager is RoleLegacy {
    // UDAO Version 1.0 contract addresses
    /// @notice Address record of UDAO Token Contract
    address public udaoAddress;
    /// @notice Address record of RoleManager Contract
    address public roleManagerAddress;
    /// @notice Address record of UDAOC Token Contract
    address public udaocAddress;
    /// @notice Address record of UDAO-Cert Token Contract
    address public udaoCertAddress;
    /// @notice Address record of Voucher Verifier Contract
    address public voucherVerifierAddress;
    /// @notice Address record of Platform Treasury Contract
    address public platformTreasuryAddress;

    // UDAO Version 1.0-2.0 common(dummy) contract addresses
    /// @notice Address record of Governance Treasury Contract
    /// @dev The Governance Treasury contract is a placeholder with a dummy version on the MVP release and needs to be replaced with a functional contract.
    address public governanceTreasuryAddress; // Have a dummy version on MVP
    /// @notice Address record of Supervision Contract
    /// @dev The Supervision contract is a placeholder with a dummy version on the MVP release and needs to be replaced with a functional contract.
    address public supervisionAddress; // Have a dummy version on MVP

    // UDAO Version 2.0 (Governance Update) contract addresses
    /// @notice Address record of UDAO-VP Token Contract
    address public udaoVpAddress;
    /// @notice Address record of UDAO Staker Contract
    address public udaoStakerAddress;
    /// @notice Address record of UDAO Governor Contract
    address public udaoGovernorAddress;

    constructor(address _roleManagerAddress) {
        roleManagerAddress = _roleManagerAddress;
        roleManager = IRoleManager(_roleManagerAddress);
    }

    /// @notice This function updates the addresses records held in this contract for the contracts used in UDAO Project version1.0
    /// @dev Intended for use after the release of UDAO version 1.0 to perform bulk updates on address records for UDAO Project version 1.0 contracts.
    /// @param _udaoAddress The new address recond of the UDAO token contract to be held in this contract.
    /// @param _roleManagerAddress The new address recond of the Role Manager contract to be held in this contract.
    /// @param _udaocAddress The new address recond of the UDAOC (Content) token contract to be held in this contract.
    /// @param _udaoCertAddress The new address recond of the UDAO-Cert token contract to be held in this contract.
    /// @param _voucherVerifierAddress The new address recond of the Voucher Verifier contract to be held in this contract.
    /// @param _platformTreasuryAddress The new address recond of the Platform Treasury contract to be held in this contract.
    function setAddresesVersion1Contracts(
        address _udaoAddress,
        address _roleManagerAddress,
        address _udaocAddress,
        address _udaoCertAddress,
        address _voucherVerifierAddress,
        address _platformTreasuryAddress
    ) external {
        require(
            hasRole(BACKEND_ROLE, msg.sender),
            "Only backend can set governance treasury address"
        );
        udaoAddress = _udaoAddress;
        roleManagerAddress = _roleManagerAddress;
        udaocAddress = _udaocAddress;
        udaoCertAddress = _udaoCertAddress;
        voucherVerifierAddress = _voucherVerifierAddress;
        platformTreasuryAddress = _platformTreasuryAddress;
    }

    /// @notice This function updates the addresses records held in this contract for the common contracts used in UDAO Project version 1.0 and 2.0
    /// @dev Intended for use after the release of UDAO version 1.0 and 2.0 to update Governance Treasury and Supervison contract address records.
    /// @param _governanceTreasuryAddress The new address recond of the Governance Treasury contract to be held in this contract.
    /// @param _supervisionAddress The new address recond of the Supervision contract to be held in this contract.
    function setAddresesCommonInVersion1and2(
        address _governanceTreasuryAddress,
        address _supervisionAddress
    ) external {
        require(
            hasRole(BACKEND_ROLE, msg.sender),
            "Only backend can set governance treasury address"
        );
        governanceTreasuryAddress = _governanceTreasuryAddress;
        supervisionAddress = _supervisionAddress;
    }

    /// @notice This function updates the addresses records held in this contract for the contracts used in UDAO Project version2.0 (Governance Update)
    /// @dev Intended for use after the release of UDAO version 2.0 to perform bulk updates on address records for UDAO Project version 2.0 contracts.
    /// @param _udaoVpAddress The new address recond of the UDAO-VP token contract to be held in this contract.
    /// @param _udaoStakerAddress The new address recond of the UDAO Staker contract to be held in this contract.
    /// @param _udaoGovernorAddress The new address recond of the UDAO Governor contract to be held in this contract.
    function setAddresesVersion2GovernanceContracts(
        address _udaoVpAddress,
        address _udaoStakerAddress,
        address _udaoGovernorAddress
    ) external {
        require(
            hasRole(BACKEND_ROLE, msg.sender),
            "Only backend can set governance treasury address"
        );
        udaoVpAddress = _udaoVpAddress;
        udaoStakerAddress = _udaoStakerAddress;
        udaoGovernorAddress = _udaoGovernorAddress;
    }

    /// @notice Updates and syncs addresses of UDAO version 1.0 contracts.
    /// @dev This function performs contract wise address updates on UDAO version 1.0 contracts and synchronizes them with the records in this contract.
    function syncVersion1ContractAddresses() external {
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

    /// @notice Updates and syncs addresses of UDAO version 2.0 contracts.
    /// @dev This function performs contract wise address updates on UDAO version 2.0 contracts and synchronizes them with the records in this contract.
    function syncVersion2ContractAddresses() external {
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

    /// @notice This function updates the address record held in this contract for the UDAO token contract
    /// @param _udaoAddress The new address recond of the UDAO token contract to be held in this contract.
    function setAddressUDAOContract(address _udaoAddress) external {
        require(
            hasRole(BACKEND_ROLE, msg.sender),
            "Only backend can set udao address"
        );
        udaoAddress = _udaoAddress;
    }

    /// @notice This function updates the address record held in this contract for the Role Manager contract
    /// @param _roleManagerAddress The new address recond of the Role Manager contract to be held in this contract.
    function setAddressRoleManagerContract(
        address _roleManagerAddress
    ) external {
        require(
            hasRole(BACKEND_ROLE, msg.sender),
            "Only backend can set irm address"
        );
        roleManagerAddress = _roleManagerAddress;
    }

    /// @notice This function updates the address record held in this contract for the UDAOContent token contract
    /// @param _udaocAddress The new address recond of the UDAOC (Content) token contract to be held in this contract.
    function setAddressUDAOCContract(address _udaocAddress) external {
        require(
            hasRole(BACKEND_ROLE, msg.sender),
            "Only backend can set udaoc address"
        );
        udaocAddress = _udaocAddress;
    }

    /// @notice This function updates the address record held in this contract for the UDAO-Cert token contract
    /// @param _udaoCertAddress The new address recond of the UDAO-Cert token contract to be held in this contract.
    function setAddressUDAOCertContract(address _udaoCertAddress) external {
        require(
            hasRole(BACKEND_ROLE, msg.sender),
            "Only backend can set udaoc address"
        );
        udaoCertAddress = _udaoCertAddress;
    }

    /// @notice This function updates the address record held in this contract for the Voucher Verifier contract
    /// @param _voucherVerifierAddress The new address recond of the Voucher Verifier contract to be held in this contract.
    function setAddressVoucherVerifierContract(
        address _voucherVerifierAddress
    ) external {
        require(
            hasRole(BACKEND_ROLE, msg.sender),
            "Only backend can set voucher verifier address"
        );
        voucherVerifierAddress = _voucherVerifierAddress;
    }

    /// @notice This function updates the address record held in this contract for the Platform Treasury contract
    /// @param _platformTreasuryAddress The new address recond of the Platform Treasury contract to be held in this contract.
    function setAddressPlatformTreasuryContract(
        address _platformTreasuryAddress
    ) external {
        require(
            hasRole(BACKEND_ROLE, msg.sender),
            "Only backend can set platform treasury address"
        );
        platformTreasuryAddress = _platformTreasuryAddress;
    }

    /// @notice This function updates the address record held in this contract for the Governance Treasury contract
    /// @param _governanceTreasuryAddress The new address recond of the Governance Treasury contract to be held in this contract.
    function setAddressGovernanceTreasuryContract(
        address _governanceTreasuryAddress
    ) external {
        require(
            hasRole(BACKEND_ROLE, msg.sender),
            "Only backend can set governance treasury address"
        );
        governanceTreasuryAddress = _governanceTreasuryAddress;
    }

    /// @notice This function updates the address record held in this contract for the Supervision contract
    /// @param _supervisionAddress The new address recond of the Supervision contract to be held in this contract.
    function setAddressSupervisionContract(
        address _supervisionAddress
    ) external {
        require(
            hasRole(BACKEND_ROLE, msg.sender),
            "Only backend can set ISupVis address"
        );
        supervisionAddress = _supervisionAddress;
    }

    /// @notice This function updates the address record held in this contract for the UDAO-VP token contract
    /// @param _udaoVpAddress The new address recond of the UDAO-VP token contract to be held in this contract.
    function setAddressUDAOvpContract(address _udaoVpAddress) external {
        require(
            hasRole(BACKEND_ROLE, msg.sender),
            "Only backend can set udao vp address"
        );
        udaoVpAddress = _udaoVpAddress;
    }

    /// @notice This function updates the address record held in this contract for the UDAO Staker contract
    /// @param _udaoStakerAddress The new address recond of the UDAO Staker contract to be held in this contract.
    function setAddressUDAOStakerContract(address _udaoStakerAddress) external {
        require(
            hasRole(BACKEND_ROLE, msg.sender),
            "Only backend can set staking address"
        );
        udaoStakerAddress = _udaoStakerAddress;
    }

    /// @notice This function updates the address record held in this contract for the UDAO Governor contract
    /// @param _udaoGovernorAddress The new address recond of the UDAO Governor contract to be held in this contract.
    function setAddressUDAOGovernorContract(
        address _udaoGovernorAddress
    ) external {
        require(
            hasRole(BACKEND_ROLE, msg.sender),
            "Only backend can set staking address"
        );
        udaoGovernorAddress = _udaoGovernorAddress;
    }
}
