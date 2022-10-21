// SPDX-License-Identifier: MIT
/// @title Content purchasing and cut management
pragma solidity ^0.8.4;
import "./BasePlatform.sol";

interface IValidationManager {
    function isValidated(uint tokenId) external view returns (bool);
}

abstract contract ContentManager is BasePlatform {
    // wallet => content token Ids
    mapping(address => uint[][]) ownedContents;
    // tokenId => fee
    mapping(uint => uint) coachingFee;

    // tokenId => buyable
    mapping(uint => bool) coachingEnabled;

    IValidationManager ivm;

    constructor(address ivmAddress) {
        ivm = IValidationManager(ivmAddress);
    }

    function setValidationManager(address ivmAddress)
        external
        onlyRole(FOUNDATION_ROLE)
    {
        ivm = IValidationManager(ivmAddress);
    }

    function buyContent(uint tokenId, uint partId) external {
        /// @notice allows KYCed users to purchase a content
        /// @param tokenId id of the token that will be bought
        require(irm.getKYC(msg.sender), "You are not KYCed");
        address instructor = udaoc.ownerOf(tokenId);
        require(!irm.getKYC(instructor), "Instructor is not KYCed");
        require(!irm.getBan(instructor), "Instructor is banned");
        require(ivm.isValidated(tokenId), "Content is not validated yet");
        require(
            isTokenBought[msg.sender][tokenId] == false,
            "Content Already Bought"
        );
        uint contentPrice = udaoc.getPriceContent(tokenId, partId);
        foundationBalance += (contentPrice * contentFoundationCut) / 100000;
        governanceBalance += (contentPrice * contentGovernancenCut) / 100000;
        validatorBalance += (contentPrice * validatorBalance) / 100000;
        jurorBalance += (contentPrice * contentJurorCut) / 100000;
        instructorBalance[instructor] +=
            contentPrice -
            ((contentPrice * contentFoundationCut) / 100000) -
            ((contentPrice * contentGovernancenCut) / 100000) -
            ((contentPrice * validatorBalance) / 100000) -
            ((contentPrice * contentGovernancenCut) / 100000);
        udao.transferFrom(msg.sender, address(this), contentPrice);
        isTokenBought[msg.sender][tokenId] = true;
        ownedContents[msg.sender].push([tokenId, partId]);
    }

    function buyCoaching(uint tokenId) external {
        /// @notice Allows users to buy coaching service.
        /// @param _coach The address of the coach that a user want to buy service from
        require(irm.getKYC(msg.sender), "You are not KYCed");
        address instructor = udaoc.ownerOf(tokenId);
        require(!irm.getKYC(instructor), "Instructor is not KYCed");
        require(!irm.getBan(instructor), "Instructor is banned");
        require(ivm.isValidated(tokenId), "Content is not validated yet");

        foundationBalance +=
            (coachingFee[tokenId] * coachingFoundationCut) /
            100000;
        governanceBalance +=
            (coachingFee[tokenId] * coachingGovernancenCut) /
            100000;
        instructorBalance[instructor] += (coachingFee[tokenId] -
            foundationBalance -
            governanceBalance);
        udao.transferFrom(msg.sender, address(this), coachingFee[tokenId]);
    }

    function createCoaching(uint tokenId) external {
        require(
            udaoc.ownerOf(tokenId) == msg.sender,
            "You are not the owner of token"
        );
        coachingEnabled[tokenId] = true;
    }

    function deleteCoaching(uint tokenId) external {
        require(
            udaoc.ownerOf(tokenId) == msg.sender,
            "You are not the owner of token"
        );
        coachingEnabled[tokenId] = false;
    }

    function setCoachingFee(uint tokenId, uint _coachingFee) external {
        /// @notice Allows coaches to set their coaching fee.
        /// @param tokenId tokenId of the content that will be coached
        /// @param _coachingFee The new coaching fee.
        require(
            udaoc.ownerOf(tokenId) == msg.sender,
            "You are not the owner of token"
        );
        coachingFee[tokenId] = _coachingFee;
    }
}
