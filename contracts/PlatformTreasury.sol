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
        address vmAddress,
        address jmAddress
    ) BasePlatform(udaoAddress, udaocAddress, rmAddress, vmAddress, jmAddress) {}

    /// @notice withdraws governance balance to governance treasury
    function withdrawGovernance() external onlyRole(GOVERNANCE_ROLE) {
        uint withdrawableBalance = governanceBalance;
        governanceBalance = 0;
        udao.transfer(governanceTreasury, withdrawableBalance);
    }

    /// @notice withdraws foundation balance to foundation wallet
    function withdrawFoundation() external onlyRole(FOUNDATION_ROLE) {
        uint withdrawableBalance = foundationBalance;
        foundationBalance = 0;
        udao.transfer(foundationWallet, withdrawableBalance);
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

    function withdrawJuror() external onlyRole(JUROR_ROLE) {
        uint claimableRound = lastJurorClaim[msg.sender];
        uint withdrawableBalance = 0;
        uint jurorScore = 0;
        for (uint i = claimableRound; i < distributionRound; i++) {
            jurorScore += IJM.getJurorScore(msg.sender, claimableRound);
            withdrawableBalance += (payPerJuror[claimableRound] * jurorScore);
        }
        lastJurorClaim[msg.sender] = distributionRound;
        udao.transfer(msg.sender, withdrawableBalance);
    }

    /// @notice Allows instructers to withdraw individually.
    function withdrawInstructor() external {
        uint withdrawableBalnce = instructorBalance[msg.sender];
        instructorBalance[msg.sender] = 0;
        udao.transfer(msg.sender, withdrawableBalnce);
    }
}
