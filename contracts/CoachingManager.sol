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
        governanceBalance +=
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
        /// @param _coachingFee The fee for the coach in unit of UDAO.
        /// @param _leaderDistributed Bool - If leader distributes off chain or on chain
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
        /// @notice Set if the money distributed by the leader or by smart contract.
        /// @param _teamId The ID of the team.
        /// @param _leaderDistributed Bool - If leader distributes off chain or on chain
        require(
            teamLeader[_teamId] == msg.sender,
            "You are not the team leader."
        );
        leaderDistributed[_teamId] = _leaderDistributed;
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

    function addCoachesToTeam(
        uint _teamId,
        address[] calldata _coachAddresses,
        uint[] calldata _coachingFees
    ) external {
        /// @notice Allows team leaders to add multiple new coaches to their teams.
        /// @param _teamId The ID of the team to add new coaches.
        /// @param _coachAddresses The addresses of the coaches to add to the team
        /// @param _coachingFees The fees for the coaches
        require(
            teamLeader[_teamId] == msg.sender,
            "You are not the team leader."
        );
        require(_coachAddresses.length == _coachingFees.length, "There should be same amount of coaches and fees.");
        for (uint i; i<_coachAddresses.length; i++){
            teamMembers[_teamId][_coachAddresses[i]] = true;
            coachingFees[_teamId][_coachAddresses[i]] = _coachingFees[i];
        }

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

    function removeCoachesFromTeam(uint _teamId, address[] calldata _coachAddresses) external {
        /// @notice Allows team leaders to remove multiple coaches from their teams.
        /// @dev Maybe we should also create another function add multiple coaches.
        /// @param _teamId The ID of the team to remove a coach.
        /// @param _coachAddresses The addresses of the coaches to remove from the team
        require(
            teamLeader[_teamId] == msg.sender,
            "You are not the team leader."
        );
        for (uint i;i<_coachAddresses.length;i++){
            teamMembers[_teamId][_coachAddresses[i]] = false;
            coachingFees[_teamId][_coachAddresses[i]] = 0;
        }

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

    function setCoachingFees(
        uint _teamId,
        address[] calldata _coachAddresses,
        uint[] calldata _coachingFees
    ) external {
        /// @notice Allows team leaders to modify coaching fees in their teams.
        /// @param _teamId The ID of the team to make changes.
        /// @param _coachAddresses The addresses of the coaches to make changes.
        /// @param _coachingFees The new coaching fees.
        require(
            teamLeader[_teamId] == msg.sender,
            "You are not the team leader."
        );
        require(_coachAddresses.length == _coachingFees.length, "There should be same amount of coaches and fees.");
        for(uint i; i<_coachAddresses.length;i++){
            require(
                teamMembers[_teamId][_coachAddresses[i]] == true,
                "This coach doesn't belong to this team."
            );
            coachingFees[_teamId][_coachAddresses[i]] = _coachingFees[i];
        }

    }

    function withdrawTeam(uint _teamId) external {
        /// @notice Allows team leader to withdraw.
        /// @param _teamId The ID of the team.
        require(
            teamLeader[_teamId] == msg.sender,
            "You are not the team leader."
        );
        udao.transfer(teamLeader[_teamId], teamBalance[_teamId]);
    }

    function withdrawCoach() external {
        /// @dev Allows coaches to withdraw individually.
        udao.transfer(msg.sender, coachBalance[msg.sender]);
    }
}
