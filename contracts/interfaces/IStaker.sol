// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

interface IStaker {
    function checkExpireDateValidator(
        address _user
    ) external view returns (uint256 expireDate);

    function checkExpireDateJuror(
        address _user
    ) external view returns (uint256 expireDate);
}
