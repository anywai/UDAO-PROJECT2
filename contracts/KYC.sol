// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract KYC is Pausable, Ownable {
    mapping(address => bool) isKYCed;
    mapping(address => bool) isBanned;

    function pause() public onlyOwner {
        _pause();
    }

    function unpause() public onlyOwner {
        _unpause();
    }

    function setKYC(address _address, bool _isKYCed) external onlyOwner {
        /// @notice set KYC for the address
        /// @param _address address that will be KYCed
        /// @param _isKYCed result of KYC
        isKYCed[_address] = _isKYCed;
    }

    function setBan(address _address, bool _isBanned) external onlyOwner {
        /// @notice set ban for the address
        /// @param _address address that will be ban set
        /// @param _isBanned ban seet result
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
