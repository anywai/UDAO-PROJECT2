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

    /// this event gets triggered when a instructor withdraw tokens and if has debt
    event InstructorWithdrawnWithDebt(address instructor, uint amount, uint debtAmount);

    /// @param _contractManagerAddress The address of the deployed role manager
    /// @param _rmAddress The address of the deployed role manager
    constructor(
        address _contractManagerAddress,
        address _rmAddress
    )
        BasePlatform(_contractManagerAddress, _rmAddress)
    {}

    /// @notice withdraws governance balance to governance treasury
    function withdrawGovernance() external whenNotPaused onlyRole(GOVERNANCE_ROLE) {
        uint withdrawableBalance = governanceBalance;
        governanceBalance = 0;  /// @dev zeroing before the actual withdraw
        udao.transfer(governanceTreasury, withdrawableBalance);
        emit GovernanceWithdrawn(withdrawableBalance);
    }

    /// @notice withdraws foundation balance to foundation wallet
    function withdrawFoundation() external whenNotPaused onlyRole(FOUNDATION_ROLE) {
        uint withdrawableBalance = foundationBalance;
        foundationBalance = 0;  /// @dev zeroing before the actual withdraw
        udao.transfer(foundationWallet, withdrawableBalance);
        emit FoundationWithdrawn(withdrawableBalance);
    }

    /// @notice calculates validator earnings and withdraws calculated earning to validator's wallet
    function withdrawValidator() external whenNotPaused onlyRoles(validator_roles) {
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
    function withdrawJuror() external whenNotPaused onlyRole(JUROR_ROLE) {
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
    function withdrawInstructor() whenNotPaused external {
        require(instructorBalance[msg.sender]>=instructorDebt[msg.sender], "Debt is larger than balance");
        uint debtAmount = 0;
        if(instructorDebt[msg.sender] > 0) {
            debtAmount = instructorDebt[msg.sender];
        }
        uint withdrawableBalance = instructorBalance[msg.sender] - instructorDebt[msg.sender];
        instructorBalance[msg.sender] = 0;
        instructorDebt[msg.sender] = 0;
        udao.transfer(msg.sender, withdrawableBalance);
        if(debtAmount > 0) {
            emit InstructorWithdrawnWithDebt(msg.sender, withdrawableBalance, debtAmount);
        } else {emit InstructorWithdrawn(msg.sender, withdrawableBalance);}
    }
}
