// SPDX-License-Identifier: MIT
/// @title yardimcidir bu.
pragma solidity ^0.8.4;

contract ErrorMessages {
string constant public setContractAddress = "Only backend can set contract address";
string constant public updateAddresses = "Only backend can update addresses";
string constant public setCoachCuts_OnlyAdminsCanSetCoachCuts = "Only admins can set coach cuts";
string constant public setCoachCuts_CutsCantBeHigherThan = "Cuts cant be higher than %100";
string constant public setContentCuts_OnlyAdminsCanSetContentCuts = "Only admins can set coach cuts";
string constant public setContentCuts_CutsCantBeHigherThan = "Cuts cant be higher than %100";
string constant public buyCoaching_CoachingDateMustBe1DayBefore = "Coaching date must be 1 day before";
string constant public buyCoaching_CoachingDateMustBe7DaysBefore = "Coaching date must be 7 days before.";

string constant public buyCoaching_CallerIsBanned = "Caller is banned";
string constant public buyCoaching_CallerIsNotKYCed = "Caller is not KYCed";
string constant public buyCoaching_CallerIsntLearner = "Caller isnt learner";


string constant public buyCoaching_LearnerIsNotKYCed  = "Learner is not KYCed";
string constant public buyCoaching_LearnerIsBanned = "Learner is banned";
string constant public buyCoaching_CoachIsNotKYCed = "Coach is not KYCed";
string constant public buyCoaching_CoachIsBanned = "Coach is banned";


string constant public buyCoaching_NotEnoughUDAOSent = "Not enough UDAO sent!";
string constant public buyCoaching_NotEnoughAllowance = "Not enough allowance!";//
}