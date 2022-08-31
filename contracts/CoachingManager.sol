// SPDX-License-Identifier: MIT
/// @title 
pragma solidity ^0.8.4;

import "./BasePlatform.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

abstract contract CoachingManager is BasePlatform {
    struct Coach {
        uint teamId;
        bool isTeamLeader;
        uint coachingFee;
    }

    mapping(address => Coach) coaches;

    using Counters for Counters.Counter;
    Counters.Counter private teamIds;

    function buyCoaching(address _coach) external {
        /// @dev Should be updated
        require(ikyc.getKYC(msg.sender), "You are not KYCed");
        require(coaches[_coach].teamId != 0, "Address is not coach");
        require(!ikyc.getBan(_coach), "Coach is banned");
        foundationBalance +=
            (coaches[_coach].coachingFee * coachingFoundationCut) /
            100000;
        governacneBalance +=
            (coaches[_coach].coachingFee * coachingGovernancenCut) /
            100000;
        teamBalance[coaches[_coach].teamId] +=
            coaches[_coach].coachingFee -
            ((coaches[_coach].coachingFee * coachingFoundationCut) / 100000) -
            ((coaches[_coach].coachingFee * coachingGovernancenCut) / 100000);
        udao.transferFrom(
            msg.sender,
            address(this),
            coaches[_coach].coachingFee
        );
    }

    function createTeam(uint coachingFee) external {
        /// @dev Modify to allow coaches to be a part of multiple teams
        require(ikyc.getKYC(msg.sender), "You are not KYCed");
        require(
            coaches[msg.sender].teamId == 0,
            "You are already registered as a coach"
        );
        teamIds.increment();
        coaches[msg.sender] = Coach(teamIds.current(), true, coachingFee);
    }

    function addCoachToTeam(address _coachAddress, uint _coachingFee) external {
        /// @dev Modify to allow coaches to be a part of multiple teams, move to off-chain maybe?
        require(udaoc.balanceOf(msg.sender) > 0, "You are not an instructor");
        require(
            coaches[msg.sender].isTeamLeader == true,
            "You are not the team leader"
        );
        coaches[_coachAddress] = Coach(
            coaches[msg.sender].teamId,
            false,
            _coachingFee
        );
    }

    function removeCoachFromTeam(address _coachAddress) external {
        /// @dev Modify to allow coaches to be a part of multiple teams, move to off-chain maybe?
        require(
            coaches[msg.sender].isTeamLeader == true,
            "You are not the team leader"
        );
        require(coaches[msg.sender].teamId == coaches[_coachAddress].teamId);
        delete coaches[_coachAddress];
    }

    function setCoachingFee(address _coachAddress, uint _coachingFee) external {
        require(
            coaches[msg.sender].isTeamLeader == true,
            "You are not the team leader"
        );
        require(coaches[msg.sender].teamId == coaches[_coachAddress].teamId);
        coaches[_coachAddress].coachingFee = _coachingFee;
    }
}
