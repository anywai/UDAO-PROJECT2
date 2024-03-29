// SPDX-License-Identifier: MIT
/// @title UDAO smart contract's role definitions.
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "./interfaces/IRoleManager.sol";
import "./ContractManager.sol";

import "./interfaces/ISupervision.sol";

contract RoleManager is AccessControl, IRoleManager {
    ContractManager public contractManager;
    ISupervision ISupVis;

    bytes32 public constant VALIDATOR_ROLE = keccak256("VALIDATOR_ROLE");
    bytes32 public constant BACKEND_ROLE = keccak256("BACKEND_ROLE");
    bytes32 public constant FOUNDATION_ROLE = keccak256("FOUNDATION_ROLE");
    bytes32 public constant STAKING_CONTRACT = keccak256("STAKING_CONTRACT");
    bytes32 public constant GOVERNANCE_ROLE = keccak256("GOVERNANCE_ROLE");
    bytes32 public constant GOVERNANCE_CONTRACT =
        keccak256("GOVERNANCE_CONTRACT");
    bytes32 public constant UDAOC_CONTRACT = keccak256("UDAOC_CONTRACT");
    bytes32 public constant JUROR_ROLE = keccak256("JUROR_ROLE");
    bytes32 public constant SUPERVISION_CONTRACT =
        keccak256("SUPERVISION_CONTRACT");
    bytes32 public constant TREASURY_CONTRACT = keccak256("TREASURY_CONTRACT");
    bytes32 public constant CORPORATE_ROLE = keccak256("CORPORATE_ROLE");
    bytes32 public constant ROLEMANAGER_CONTRACT =
        keccak256("ROLEMANAGER_CONTRACT");

    mapping(address => bool) KYCList;
    mapping(address => bool) BanList;

    /// @notice events fired when a KYC or Ban is set
    event SetKYC(address indexed user, bool indexed result);
    event SetBan(address indexed user, bool indexed result);

    /// @notice Deployer gets the admin role.
    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ROLEMANAGER_CONTRACT, address(this));
    }

    function setContractManager(
        address _contractManager
    ) external onlyRole(BACKEND_ROLE) {
        contractManager = ContractManager(_contractManager);
    }

    /// @notice Get the updated addresses from contract manager
    function updateAddresses() external onlyRole(BACKEND_ROLE) {
        ISupVis = ISupervision(contractManager.ISupVisAddress());

        //emit AddressesUpdated(contractManager.ISupVisAddress());
    }

    /// @notice Used for checking if the given account has the asked role
    /// @param role The name of the role to check
    /// @param account The address of the account to check
    function checkRole(bytes32 role, address account) external view {
        _checkRole(role, account);
    }

    /// @notice Used for checking if given account has given multiple roles
    /// @param roles The name of the roles to check
    /// @param account The address of the account to check
    function checkRoles(bytes32[] memory roles, address account) external view {
        _checkRoles(roles, account);
    }

    /// @notice Modified AccessControl checkRoles for multiple role check
    /// @param roles The name of the roles to check
    /// @param account The address of the account to check
    function _checkRoles(
        bytes32[] memory roles,
        address account
    ) internal view virtual {
        uint rolesLength = roles.length;
        for (uint i = 0; i < rolesLength; i++) {
            if (hasRole(roles[i], account)) {
                return;
            }
        }
        revert(
            string(
                abi.encodePacked(
                    "AccessControl: account ",
                    Strings.toHexString(uint160(account), 20),
                    " is missing role"
                )
            )
        );
    }

    /// @notice set KYC for an account address
    /// @param _address address that will be KYCed
    /// @param _isKYCed result of KYC
    function setKYC(
        address _address,
        bool _isKYCed
    ) external onlyRole(BACKEND_ROLE) {
        KYCList[_address] = _isKYCed;
        emit SetKYC(_address, _isKYCed);

        if (!_isKYCed) {
            ISupVis.dismissValidation(_address);
            ISupVis.dismissDispute(_address);
        }
    }

    /// @notice set ban for an account address
    /// @param _address address that will be ban set
    /// @param _isBanned ban set result
    function setBan(address _address, bool _isBanned) external {
        require(
            hasRole(BACKEND_ROLE, msg.sender) ||
                hasRole(SUPERVISION_CONTRACT, msg.sender),
            "Only backend or supervision contract can set ban"
        );
        require(!hasRole(BACKEND_ROLE, _address), "Backend cannot be banned");
        require(
            !hasRole(FOUNDATION_ROLE, _address),
            "Foundation cannot be banned"
        );

        BanList[_address] = _isBanned;
        emit SetBan(_address, _isBanned);

        if (_isBanned) {
            ISupVis.dismissValidation(_address);
            ISupVis.dismissDispute(_address);
        }
    }

    /// @notice gets KYC result of the address
    /// @param _address wallet that KYC result will be sent
    function isKYCed(address _address) external view returns (bool) {
        return KYCList[_address];
    }

    /// @notice gets ban result of the address
    /// @param _address wallet that ban result will be sent
    function isBanned(address _address) external view returns (bool) {
        return BanList[_address];
    }

    /// @notice grants a role to an account
    /// @param role The name of the role to grant
    /// @param user The address of the account to grant the role to
    function grantRoleStaker(
        bytes32 role,
        address user
    ) external onlyRole(STAKING_CONTRACT) {
        _grantRole(role, user);
    }

    /// @notice revokes a role from an account
    /// @param role The name of the role to revoke
    /// @param user The address of the account to revoke the role from
    function revokeRoleStaker(
        bytes32 role,
        address user
    ) external onlyRole(STAKING_CONTRACT) {
        _revokeRole(role, user);
    }

    /// @notice grants BACKEND_ROLE to a new address
    /// @param backendAddress The address of the backend to grant
    function grantBackend(
        address backendAddress
    ) external onlyRole(FOUNDATION_ROLE) {
        _grantRole(BACKEND_ROLE, backendAddress);
    }

    /// @notice revokes BACKEND_ROLE and bans the backend address
    /// @param backendAddress The address of the backend to revoke
    function revokeBackend(
        address backendAddress
    ) external onlyRole(FOUNDATION_ROLE) {
        _revokeRole(BACKEND_ROLE, backendAddress);
        BanList[backendAddress] = true;
    }
}
