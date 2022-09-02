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
        /// @notice Allows users to buy coaching service. Please note that coaching fees may change
        /// for the same coach depending on the team that a coach belongs to. 
        /// @param _coach The address of the coach that a user want to buy service from
        /// @param _teamId The ID of the team that the coach belongs to.
        require(ikyc.getKYC(msg.sender), "You are not KYCed");
        require(!ikyc.getBan(_coach), "Coach is banned");
        require(
            teamMembers[_teamId][_coach],
            "Address is not registered as a coach in this team."
        );
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
        /// @notice Allows insturcters to initilize coaching teams. 
        /// @param _coachingFee The fee for the coach.
        /// @param _leaderDistributed explain
        /// @dev to Burak: What is the unit of fee? Fraction? Please write info to param.
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
        /// @dev explain
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
        /// @notice Allows team leaders to add new coaches to their teams.
        /// @dev Maybe we should also create another function add multiple coaches.
        /// @param _teamId The ID of the team to add new coaches.
        /// @param _coachAddress The address of the coach to add to the team
        /// @param _coachingFee The fee for the coach
        require(
            teamLeader[_teamId] == msg.sender,
            "You are not the team leader."
        );
        teamMembers[_teamId][_coachAddress] = true;
        coachingFees[_teamId][_coachAddress] = _coachingFee;
    }

    function removeCoachFromTeam(uint _teamId, address _coachAddress) external {
        /// @notice Allows team leaders to remove coaches from their teams.
        /// @dev Maybe we should also create another function add multiple coaches.
        /// @param _teamId The ID of the team to remove a coach.
        /// @param _coachAddress The address of the coach to remove from the team
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
        /// @notice Allows team leaders to modify coaching fees in their teams.
        /// @param _teamId The ID of the team to make changes.
        /// @param _coachAddress The address of the coach to make changes.
        /// @param _coachingFee The new coaching fee.
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
        /// @dev explain
        require(
            teamLeader[_teamId] == msg.sender,
            "You are not the team leader."
        );
        udao.transfer(teamLeader[_teamId], teamBalance[_teamId]);
    }

    function withdrawCoach() external {
        /// @dev explain
        udao.transfer(msg.sender, coachBalance[msg.sender]);
    }
}
