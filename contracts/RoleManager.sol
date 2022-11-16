// SPDX-License-Identifier: MIT
/// @title UDAO smart contract's role definitions.
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/access/AccessControl.sol";

contract RoleManager is AccessControl {
    bytes32 public constant BACKEND_ROLE = keccak256("BACKEND_ROLE");

    mapping(address => bool) isKYCed;
    mapping(address => bool) isBanned;

    /// @notice events fired when a KYC or Ban is set
    event SetKYC(address indexed user, bool indexed result);
    event SetBan(address indexed user, bool indexed result);

    /// @notice Deployer gets the admin role.
    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
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
    function _checkRoles(bytes32[] memory roles, address account)
        internal
        view
        virtual
    {
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
                    " is missing role "
                )
            )
        );
    }

    /// @notice set KYC for an account address
    /// @param _address address that will be KYCed
    /// @param _isKYCed result of KYC
    function setKYC(address _address, bool _isKYCed)
        external
        onlyRole(BACKEND_ROLE)
    {
        isKYCed[_address] = _isKYCed;
        emit SetKYC(_address,_isKYCed);
    }

    /// @notice set ban for an account address
    /// @param _address address that will be ban set
    /// @param _isBanned ban set result
    function setBan(address _address, bool _isBanned)
        external
        onlyRole(BACKEND_ROLE)
    {
        isBanned[_address] = _isBanned;
        emit SetBan(_address,_isBanned);

    }

    /// @notice gets KYC result of the address
    /// @param _address wallet that KYC result will be sent
    function getKYC(address _address) external view returns (bool) {
        return isKYCed[_address];
    }
    
    /// @notice gets ban result of the address
    /// @param _address wallet that ban result will be sent
    function getBan(address _address) external view returns (bool) {
        return isBanned[_address];
    }
}
