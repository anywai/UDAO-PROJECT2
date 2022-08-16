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
        isKYCed[_address] = _isKYCed;
    }

    function setBan(address _address, bool _isBanned) external onlyOwner {
        isBanned[_address] = _isBanned;
    }

    function getKYC(address _address) external view returns (bool) {
        return isKYCed[_address];
    }

    function getBan(address _address) external view returns (bool) {
        return isBanned[_address];
    }
}
