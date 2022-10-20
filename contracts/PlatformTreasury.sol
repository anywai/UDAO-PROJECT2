// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/security/Pausable.sol";
import "./RoleController.sol";
import "./ContentManager.sol";

contract PlatformTreasury is Pausable, ContentManager {
    constructor(
        address udaoAddress,
        address udaocAddress,
        address irmAddress,
        address ivmAddress
    )
        BasePlatform(udaoAddress, udaocAddress, irmAddress)
        ContentManager(ivmAddress)
    {}

    function withdrawGovernance() external onlyRole(GOVERNANCE_ROLE) {
        /// @notice withdraws governance balance to governance treasury
        udao.transfer(governanceTreasury, governanceBalance);
    }

    function withdrawFoundation() external onlyRole(FOUNDATION_ROLE) {
        /// @notice withdraws foundation balance to foundation wallet
        udao.transfer(foundationWallet, foundationBalance);
    }

    function withdrawValidator() external onlyRoles(validator_roles) {
        /// @notice calculates validator earnings and withdraws calculated earning to validator wallet
        uint[2] memory results = udaoc.getValidationResults(msg.sender);
        uint participation = (results[0] * 100000) / udaoc.getTotalValidation();
        uint earning = (participation * validatorBalance) / 100000;
        udao.transfer(msg.sender, earning);
    }

    function withdrawInstructor() external {
        /// @dev Allows coaches to withdraw individually.
        udao.transfer(msg.sender, instructorBalance[msg.sender]);
    }
}
