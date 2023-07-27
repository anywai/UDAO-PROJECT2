// SPDX-License-Identifier: MIT
/// @title Interface of validation manager
pragma solidity ^0.8.4;

interface IValidationManager {
    function getIsValidated(uint tokenId) external view returns (bool);

    function getValidatorScore(
        address _validator,
        uint _round
    ) external view returns (uint);

    function getTotalValidationScore() external view returns (uint);

    function nextRound() external;

    function getValidatorsOfVal(
        uint validationId
    ) external view returns (address[] memory);

    function getLatestValidationIdOfToken(
        uint tokenId
    ) external view returns (uint);
}
