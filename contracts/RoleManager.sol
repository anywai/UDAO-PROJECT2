// SPDX-License-Identifier: MIT
/// @title UDAO smart contract's role definitions. Other contracts inherits this to allow usage of custom roles.
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/access/AccessControl.sol";

contract RoleManager is AccessControl {
    bytes32 public constant BACKEND_ROLE = keccak256("BACKEND_ROLE");

    mapping(address => bool) isKYCed;
    mapping(address => bool) isBanned;

    function checkRole(bytes32 role, address account) external view {
        _checkRole(role, account);
    }

    function checkRoles(bytes32[] memory roles, address account) external view {
        _checkRoles(roles, account);
    }

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

    function setKYC(address _address, bool _isKYCed)
        external
        onlyRole(BACKEND_ROLE)
    {
        /// @notice set KYC for the address
        /// @param _address address that will be KYCed
        /// @param _isKYCed result of KYC
        isKYCed[_address] = _isKYCed;
    }

    function setBan(address _address, bool _isBanned)
        external
        onlyRole(BACKEND_ROLE)
    {
        /// @notice set ban for the address
        /// @param _address address that will be ban set
        /// @param _isBanned ban set result
        isBanned[_address] = _isBanned;
    }

    function getKYC(address _address) external view returns (bool) {
        /// @notice gets KYC result of the address
        /// @param _address wallet that KYC result will be sent
        return isKYCed[_address];
    }

    function getBan(address _address) external view returns (bool) {
        /// @notice gets ban result of the address
        /// @param _address wallet that ban result will be sent
        return isBanned[_address];
    }
}
