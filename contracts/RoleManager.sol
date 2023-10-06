// SPDX-License-Identifier: MIT
/// @title UDAO smart contract's role definitions.
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "./ContractManager.sol";

import "./interfaces/ISupervision.sol";
import "./RoleNames.sol";

contract RoleManager is AccessControl, RoleNames {
    ContractManager public contractManager;
    ISupervision ISupVis;
    
    // functionId => if Active or not
    mapping(uint256 => bool) public activeKYCFunctions;
    mapping(uint256 => bool) public activeBanFunctions;

    event AddressesUpdated(address ContractManagerAddress);

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

    function setContractManager(address _contractManager) external {
        require(
            hasRole(BACKEND_ROLE, msg.sender),
            "Only backend can set contract manager"
        );
        contractManager = ContractManager(_contractManager);
    }

    /// @notice Get the updated addresses from contract manager
    function updateAddresses() external {
        require(
            hasRole(BACKEND_ROLE, msg.sender),
            "Only backend can update addresses"
        );
        ISupVis = ISupervision(contractManager.ISupVisAddress());

        emit AddressesUpdated(contractManager.ISupVisAddress());
    }

    /// @notice Modified AccessControl checkRoles for multiple role check
    /// @param roles The name of the roles to check
    function hasRoles(
        bytes32[] memory roles,
        address account
    ) public view returns (bool) {
        uint rolesLength = roles.length;
        for (uint i = 0; i < rolesLength; i++) {
            if (hasRole(roles[i], account)) {
                return true;
            }
        }
        return false;
    }

    /// @notice set KYC for an account address
    /// @param _address address that will be KYCed
    /// @param _isKYCed result of KYC
    function setKYC(address _address, bool _isKYCed) external {
        require(hasRole(BACKEND_ROLE, msg.sender), "deneme");
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

    /// @notice Setter function of activeKYCFunctions
    /// @param functionId function id of the function
    /// @param status KYC status of the function
    function setActiveKYCFunctions(uint256 functionId, bool status) external {
        require(
            hasRole(BACKEND_ROLE, msg.sender),
            "Only backend can set activeKYCFunctions"
        );
        activeKYCFunctions[functionId] = status;
    }

    /// @notice Setter function of activeBanFunctions
    /// @param functionId function id of the function
    /// @param status Ban status of the function
    function setActiveBanFunctions(uint256 functionId, bool status) external {
        require(
            hasRole(BACKEND_ROLE, msg.sender),
            "Only backend can set activeBanFunctions"
        );
        activeBanFunctions[functionId] = status;
    }

    /// @notice gets KYC result of the address
    /// @param _address wallet that KYC result will be sent
    function isKYCed(address _address, uint256 functionId) external view returns (bool) {
        if(activeKYCFunctions[functionId] == false){
            return true;
        }else{
            return KYCList[_address];
        }
    }

    /// @notice gets ban result of the address
    /// @param _address wallet that ban result will be sent
    function isBanned(address _address, uint256 functionId) external view returns (bool) {
        if(activeBanFunctions[functionId] == false){
            return false;
        }else{
            return BanList[_address];
        }
    }

    /// @notice grants a role to an account
    /// @param role The name of the role to grant
    /// @param user The address of the account to grant the role to
    function grantRoleStaker(bytes32 role, address user) external {
        require(
            hasRole(STAKING_CONTRACT, msg.sender),
            "Only staking contract can grant roles"
        );
        _grantRole(role, user);
    }

    /// @notice revokes a role from an account
    /// @param role The name of the role to revoke
    /// @param user The address of the account to revoke the role from
    function revokeRoleStaker(bytes32 role, address user) external {
        require(
            hasRole(STAKING_CONTRACT, msg.sender),
            "Only staking contract can revoke roles"
        );
        _revokeRole(role, user);
    }

    /// @notice grants BACKEND_ROLE to a new address
    /// @param backendAddress The address of the backend to grant
    function grantBackend(address backendAddress) external {
        require(
            hasRole(FOUNDATION_ROLE, msg.sender),
            "Only foundation can grant backend"
        );
        _grantRole(BACKEND_ROLE, backendAddress);
    }

    /// @notice revokes BACKEND_ROLE and bans the backend address
    /// @param backendAddress The address of the backend to revoke
    function revokeBackend(address backendAddress) external {
        require(
            hasRole(FOUNDATION_ROLE, msg.sender),
            "Only foundation can revoke backend"
        );
        _revokeRole(BACKEND_ROLE, backendAddress);
        BanList[backendAddress] = true;
    }
}
