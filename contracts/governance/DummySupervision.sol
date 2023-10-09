// SPDX-License-Identifier: MIT
/// @title Dummy version of the supervision contract.

pragma solidity ^0.8.4;

contract DummySupervision {
    function getIsValidated(uint tokenId) external view returns (uint256) {
        return 1;
    }

    function getValidatorScore(
        address _validator,
        uint _round
    ) external view returns (uint) {
        return 0;
    }

    function setValidationStatus(uint256 tokenId, uint256 status) external {}

    function getTotalValidationScore() external view returns (uint) {
        return 0;
    }

    function getValidatorsOfVal(
        uint validationId
    ) external view returns (address[] memory) {
        return new address[](0);
    }

    function getLatestValidationIdOfToken(
        uint tokenId
    ) external view returns (uint) {
        return 0;
    }

    function getJurorScore(
        address _juror,
        uint _round
    ) external view returns (uint) {
        return 0;
    }

    function getTotalJurorScore() external view returns (uint) {
        return 0;
    }

    function createValidation(uint256 tokenId, uint256 score) external {}

    function nextRound() external {}

    function dismissValidation(address demissionAdress) external {}

    function dismissDispute(address demissionAdress) external {}
}
