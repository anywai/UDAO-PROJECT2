// SPDX-License-Identifier: MIT
/// @title KYC interface
pragma solidity ^0.8.4;

interface IKYC {
    function getKYC(address _address) external view returns (bool);

    function getBan(address _address) external view returns (bool);
}
