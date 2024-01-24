// SPDX-License-Identifier: MIT
/// @title Interface of governance treasury contract
pragma solidity ^0.8.4;

interface IGovernanceTreasury {
    function jurorBalanceUpdate(uint _balance) external;

    function validatorBalanceUpdate(uint _balance) external;

    function governanceBalanceUpdate(uint _balance) external;

    function incValidatorScorePerRound(address _validator) external;

    function incJurorScorePerRound(address _juror) external;

    function decValidatorScorePerRound(address _validator) external;

    function decJurorScorePerRound(address _juror) external;

    function nextValidatorDistributionRound() external;

    function nextJurorDistributionRound() external;

    function transferGovernanceRewards(address _to, uint _amount) external;
}
