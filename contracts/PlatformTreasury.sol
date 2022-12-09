// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "./RoleController.sol";
import "./ContentManager.sol";

contract PlatformTreasury is Pausable, ContentManager {
    string private constant SIGNING_DOMAIN = "ValidationScore";
    string private constant SIGNATURE_VERSION = "1";

    /// @param udaoAddress The address of the deployed udao token contract
    /// @param udaocAddress The address of the deployed udao content token
    /// @param rmAddress The address of the deployed role manager
    /// @param vmAddress The address of the deployed validation manager
    constructor(
        address udaoAddress,
        address udaocAddress,
        address rmAddress,
        address vmAddress
    ) BasePlatform(udaoAddress, udaocAddress, rmAddress, vmAddress) {}

    /// @notice withdraws governance balance to governance treasury
    function withdrawGovernance() external onlyRole(GOVERNANCE_ROLE) {
        udao.transfer(governanceTreasury, governanceBalance);
    }

    /// @notice withdraws foundation balance to foundation wallet
    function withdrawFoundation() external onlyRole(FOUNDATION_ROLE) {
        udao.transfer(foundationWallet, foundationBalance);
    }

    /// @notice calculates validator earnings and withdraws calculated earning to validator wallet
    function withdrawValidator() external onlyRoles(validator_roles) {
        uint claimableRound = lastValidatorClaim[msg.sender];
        uint withdrawableBalance = 0;
        uint validatorScore = 0;
        for (uint i = claimableRound; i < distributionRound; i++) {
            validatorScore += IVM.getValidatorScore(msg.sender, claimableRound);
            withdrawableBalance += (payPerValidationScore[claimableRound] *
                validatorScore);
        }
        lastValidatorClaim[msg.sender] = distributionRound;
        udao.transfer(msg.sender, withdrawableBalance);
    }

    /// @notice Allows instructers to withdraw individually.
    function withdrawInstructor() external {
        udao.transfer(msg.sender, instructorBalance[msg.sender]);
    }
}
