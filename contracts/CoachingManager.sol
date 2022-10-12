// SPDX-License-Identifier: MIT
/// @title Coach and coach team manager
pragma solidity ^0.8.4;

import "./BasePlatform.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

abstract contract CoachingManager is BasePlatform {

    // address => fee
    mapping(address => uint) coachingFee;


    function buyCoaching(address _coach) external {
        /// @notice Allows users to buy coaching service.
        /// @param _coach The address of the coach that a user want to buy service from
        require(ikyc.getKYC(msg.sender), "You are not KYCed");
        require(!ikyc.getBan(_coach), "Coach is banned");

        foundationBalance +=
            (coachingFee[_coach] * coachingFoundationCut) /
            100000;
        governanceBalance +=
            (coachingFee[_coach] * coachingGovernancenCut) /
            100000;
        udao.transferFrom(
            msg.sender,
            address(this),
            coachingFee[_coach]
        );
    }

    function setCoachingFee(
        uint _coachingFee
    ) external {
        /// @notice Allows team leaders to modify coaching fees in their teams.
        /// @param _coachingFee The new coaching fee.
        coachingFee[msg.sender] = _coachingFee;
    }

    function withdrawCoach() external {
        /// @dev Allows coaches to withdraw individually.
        udao.transfer(msg.sender, coachBalance[msg.sender]);
    }
}
