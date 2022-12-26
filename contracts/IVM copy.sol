// SPDX-License-Identifier: MIT
/// @title Interface of validation manager
pragma solidity ^0.8.4;

interface I {
    function getIsValidated(uint tokenId) external view returns (bool);

    function getValidatorScore(
        address _validator,
        uint _round
    ) external view returns (uint);

    function getTotalValidationScore() external view returns (uint);

    function nextRound() external;
}
