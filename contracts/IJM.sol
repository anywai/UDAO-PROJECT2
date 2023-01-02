// SPDX-License-Identifier: MIT
/// @title Interface of validation manager
pragma solidity ^0.8.4;

interface IJurorManager {
    function getJurorScore(
        address _juror,
        uint _round
    ) external view returns (uint);

    function getTotalJurorScore() external view returns (uint);

    function nextRound() external;
}
