// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "./RoleController.sol";
import "./ContentManager.sol";

contract PlatformTreasury is Pausable, ContentManager {
    string private constant SIGNING_DOMAIN = "ValidationScore";
    string private constant SIGNATURE_VERSION = "1";

    /// this event gets triggered when governance withdraw tokens
    event GovernanceWithdrawn(uint amount);
    
    /// this event gets triggered when founcation withdraw tokens
    event FoundationWithdrawn(uint amount);

    /// this event gets triggered when a validator withdraw tokens
    event ValidatorWithdrawn(address validator, uint amount);

    /// this event gets triggered when a juror withdraw tokens
    event JurorWithdrawn(address juror, uint amount);

    /// this event gets triggered when a instructor withdraw tokens
    event InstructorWithdrawn(address instructor, uint amount);

    /// @param udaoAddress The address of the deployed udao token contract
    /// @param udaocAddress The address of the deployed udao content token
    /// @param rmAddress The address of the deployed role manager
    /// @param vmAddress The address of the deployed validation manager
    /// @param jmAddress The address of the deployed juror manager
    constructor(
        address udaoAddress,
        address udaocAddress,
        address rmAddress,
        address vmAddress,
        address jmAddress
    )
        BasePlatform(udaoAddress, udaocAddress, rmAddress, vmAddress, jmAddress)
    {}

    /// @notice withdraws governance balance to governance treasury
    function withdrawGovernance() external onlyRole(GOVERNANCE_ROLE) {
        uint withdrawableBalance = governanceBalance;
        governanceBalance = 0;  /// @dev zeroing before the actual withdraw
        udao.transfer(governanceTreasury, withdrawableBalance);
        emit GovernanceWithdrawn(withdrawableBalance);
    }

    /// @notice withdraws foundation balance to foundation wallet
    function withdrawFoundation() external onlyRole(FOUNDATION_ROLE) {
        uint withdrawableBalance = foundationBalance;
        foundationBalance = 0;  /// @dev zeroing before the actual withdraw
        udao.transfer(foundationWallet, withdrawableBalance);
        emit FoundationWithdrawn(withdrawableBalance);
    }

    /// @notice calculates validator earnings and withdraws calculated earning to validator's wallet
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
        emit ValidatorWithdrawn(msg.sender, withdrawableBalance);
    }

    /// @notice calculates juror earnings and withdraws calculated earning to juror's wallet
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
        emit JurorWithdrawn(msg.sender, withdrawableBalance);
    }

    /// @notice Allows instructers to withdraw individually.
    function withdrawInstructor() external {
        uint withdrawableBalnce = instructorBalance[msg.sender];
        instructorBalance[msg.sender] = 0;
        udao.transfer(msg.sender, withdrawableBalnce);
        emit InstructorWithdrawn(msg.sender, withdrawableBalnce);
    }
}
