// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

interface IPlatformTreasury {
    function transferGovernanceRewards(address _to, uint _amount) external;

    function forcedRefundJuror(uint256 _coachingId) external;
}
