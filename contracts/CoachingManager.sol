// SPDX-License-Identifier: MIT
/// @title
pragma solidity ^0.8.4;

import "./BasePlatform.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

abstract contract CoachingManager is BasePlatform {
    using Counters for Counters.Counter;
    Counters.Counter private teamIds;

    //teeamid => teamLeader
    mapping(uint => address) teamLeader;

    // teamid => members
    mapping(uint => mapping(address => bool)) teamMembers;

    // teamid => (address => fee))
    mapping(uint => mapping(address => uint)) coachingFees;

    // teamid => "does leader distribute earnings"
    mapping(uint => bool) leaderDistributed;

    function buyCoaching(address _coach, uint _teamId) external {
        /// @dev Should be updated
        require(ikyc.getKYC(msg.sender), "You are not KYCed");
        require(
            teamMembers[_teamId][_coach],
            "Address is not registered as a coach in this team."
        );
        require(!ikyc.getBan(_coach), "Coach is banned");
        foundationBalance +=
            (coachingFees[_teamId][_coach] * coachingFoundationCut) /
            100000;
        governacneBalance +=
            (coachingFees[_teamId][_coach] * coachingGovernancenCut) /
            100000;
        if (leaderDistributed[_teamId]) {
            teamBalance[_teamId] +=
                coachingFees[_teamId][_coach] -
                ((coachingFees[_teamId][_coach] * coachingFoundationCut) /
                    100000) -
                ((coachingFees[_teamId][_coach] * coachingGovernancenCut) /
                    100000);
        } else {
            coachBalance[_coach] +=
                coachingFees[_teamId][_coach] -
                ((coachingFees[_teamId][_coach] * coachingFoundationCut) /
                    100000) -
                ((coachingFees[_teamId][_coach] * coachingGovernancenCut) /
                    100000);
        }
        udao.transferFrom(
            msg.sender,
            address(this),
            coachingFees[_teamId][_coach]
        );
    }

    function createTeam(uint _coachingFee, bool _leaderDistributed) external {
        /// @dev Modify to allow coaches to be a part of multiple teams
        require(udaoc.balanceOf(msg.sender) > 0, "You are not an instructor");
        require(ikyc.getKYC(msg.sender), "You are not KYCed");
        teamIds.increment();
        teamLeader[teamIds.current()] = msg.sender;
        teamMembers[teamIds.current()][msg.sender] = true;
        coachingFees[teamIds.current()][msg.sender] = _coachingFee;
        leaderDistributed[teamIds.current()] = _leaderDistributed;
    }

    function setLeaderDistributed(uint _teamId, bool _leaderDistributed)
        external
    {
        require(
            teamLeader[_teamId] == msg.sender,
            "You are not the team leader."
        );
        leaderDistributed[teamIds.current()] = _leaderDistributed;
    }

    function addCoachToTeam(
        uint _teamId,
        address _coachAddress,
        uint _coachingFee
    ) external {
        /// @dev Modify to allow coaches to be a part of multiple teams, move to off-chain maybe?
        require(
            teamLeader[_teamId] == msg.sender,
            "You are not the team leader."
        );
        teamMembers[_teamId][_coachAddress] = true;
        coachingFees[_teamId][_coachAddress] = _coachingFee;
    }

    function removeCoachFromTeam(uint _teamId, address _coachAddress) external {
        /// @dev Modify to allow coaches to be a part of multiple teams, move to off-chain maybe?
        require(
            teamLeader[_teamId] == msg.sender,
            "You are not the team leader."
        );
        teamMembers[_teamId][_coachAddress] = false;
        coachingFees[_teamId][_coachAddress] = 0;
    }

    function setCoachingFee(
        uint _teamId,
        address _coachAddress,
        uint _coachingFee
    ) external {
        require(
            teamLeader[_teamId] == msg.sender,
            "You are not the team leader."
        );
        require(
            teamMembers[_teamId][_coachAddress] == true,
            "This coach doesn't belong to this team."
        );
        coachingFees[_teamId][_coachAddress] = _coachingFee;
    }

    function withdrawTeam(uint _teamId) external {
        require(
            teamLeader[_teamId] == msg.sender,
            "You are not the team leader."
        );
        udao.transfer(teamLeader[_teamId], teamBalance[_teamId]);
    }

    function withdrawCoach() external {
        udao.transfer(msg.sender, coachBalance[msg.sender]);
    }
}
