// SPDX-License-Identifier: MIT
/// @title Interface of supervision contract
pragma solidity ^0.8.4;

interface ISupervision {
    function getIsValidated(uint tokenId) external view returns (bool);

    function getValidatorScore(
        address _validator,
        uint _round
    ) external view returns (uint);

    function getTotalValidationScore() external view returns (uint);

    function getValidatorsOfVal(
        uint validationId
    ) external view returns (address[] memory);

    function getLatestValidationIdOfToken(
        uint tokenId
    ) external view returns (uint);

    function getJurorScore(
        address _juror,
        uint _round
    ) external view returns (uint);

    function getTotalJurorScore() external view returns (uint);

    function nextRound() external;
}