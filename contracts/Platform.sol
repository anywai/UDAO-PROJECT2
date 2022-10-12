// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "./IKYC.sol";
import "./IUDAOC.sol";
import "./RoleManager.sol";
import "./BasePlatform.sol";
import "./ContentManager.sol";

contract Platform is BasePlatform, ContentManager {
    // ITreasury treasury;

    constructor(
        address _kycAddress,
        address udaoAddress,
        address udaocAddress
    ) BasePlatform(_kycAddress, udaoAddress, udaocAddress) {}

    // SETTERS
}
