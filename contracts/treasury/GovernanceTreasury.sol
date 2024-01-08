// SPDX-License-Identifier: MIT
/// @title Treasury for governance related roles.
/// @dev This contract is intended to distribute the accumulated pool balances for jurors, validators, and governance to respective individuals in future functionalities.
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract GovernanceTreasury {
    // UDAO (ERC20) Token contract address
    IERC20 udao;

    /// @notice Balance of jurors, its a pool for jurors.
    uint jurorBalance;
    /// @notice Balance of validators, its a pool for validators.
    uint validatorBalance;
    /// @notice Balance of governance, its a pool for governance.
    uint governanceBalance;

    /// @notice Address of the deployer of this dummy contract
    address ownerOfDummy;

    /// @notice Constructor function of governance treasury contract.
    /// @param udaoAddress Address of the UDAO token contract.
    constructor(address udaoAddress) {
        udao = IERC20(udaoAddress);
        ownerOfDummy = msg.sender;
    }

    /// @notice Updates the jurors balance in this treasury.
    /// @param _balance The balance to update.
    function jurorBalanceUpdate(uint _balance) external {
        jurorBalance += _balance;
    }

    /// @notice Updates the validators balance in this treasury.
    /// @param _balance The balance to update.
    function validatorBalanceUpdate(uint _balance) external {
        validatorBalance += _balance;
    }

    /// @notice Updates the governance balance in this treasury.
    /// @param _balance The balance to update.
    function governanceBalanceUpdate(uint _balance) external {
        governanceBalance += _balance;
    }

    /// @notice withdraws governance balance to governance treasury
    /// TODO Bu fonksiyon gereksiz gibi. governanceTreasury aslında platformTreasury. Para burada birikiyor ve
    /// transferGovernanceRewards fonksiyonu ile staking contract'a transfer ediliyor. Burada biriken parayı
    /// governanceTreasury'e transfer etmek gereksiz.
    function withdrawGovernance() external whenNotPaused {
        require(
            roleManager.hasRole(GOVERNANCE_ROLE, msg.sender),
            "Only governance can withdraw"
        );
        uint withdrawableBalance = governanceBalance;
        governanceBalance = 0; /// @dev zeroing before the actual withdraw
        udao.transfer(governanceTreasury, withdrawableBalance);
        emit GovernanceWithdrawn(withdrawableBalance);
    }

    /// @notice calculates validator earnings and withdraws calculated earning to validator's wallet
    function withdrawValidator() external whenNotPaused {
        require(
            roleManager.hasRole(VALIDATOR_ROLE, msg.sender),
            "Only validator can withdraw"
        );
        uint claimableRound = lastValidatorClaim[msg.sender];
        uint withdrawableBalance = 0;
        uint validatorScore = 0;
        for (uint i = claimableRound; i < distributionRound; i++) {
            validatorScore += ISupVis.getValidatorScore(
                msg.sender,
                claimableRound
            );
            withdrawableBalance += (payPerValidationScore[claimableRound] *
                validatorScore);
        }
        lastValidatorClaim[msg.sender] = distributionRound;
        udao.transfer(msg.sender, withdrawableBalance);
        emit ValidatorWithdrawn(msg.sender, withdrawableBalance);
    }

    /// @notice calculates juror earnings and withdraws calculated earning to juror's wallet
    function withdrawJuror() external whenNotPaused {
        require(
            roleManager.hasRole(JUROR_ROLE, msg.sender),
            "Only juror can withdraw"
        );
        uint claimableRound = lastJurorClaim[msg.sender];
        uint withdrawableBalance = 0;
        uint jurorScore = 0;
        for (uint i = claimableRound; i < distributionRound; i++) {
            jurorScore += ISupVis.getJurorScore(msg.sender, claimableRound);
            withdrawableBalance += (payPerJuror[claimableRound] * jurorScore);
        }
        lastJurorClaim[msg.sender] = distributionRound;
        udao.transfer(msg.sender, withdrawableBalance);
        emit JurorWithdrawn(msg.sender, withdrawableBalance);
    }

    function transferGovernanceRewards(
        address _to,
        uint _amount
    ) external whenNotPaused {
        require(
            roleManager.hasRole(STAKING_CONTRACT, msg.sender),
            "Only staking contract can transfer governance rewards"
        );
        udao.transfer(_to, _amount);
    }

    /// @notice Withdraws the balance of the treasury.
    /// @dev this dummy contract should not accumulate any balance, if any at all it an unwanted behaviour and deployer can save the funds.
    function emergencyWithdraw() external {
        require(
            msg.sender == ownerOfDummy,
            "you are not owner of dummy contract"
        );
        udao.transfer(msg.sender, udao.balanceOf(address(this)));
        validatorBalance = 0;
        jurorBalance = 0;
        governanceBalance = 0;
    }
}
