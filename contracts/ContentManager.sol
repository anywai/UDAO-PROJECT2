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

    /// @param ivmAddress The address of the deployed ValidationManager contract
    constructor(address ivmAddress) {
        ivm = IValidationManager(ivmAddress);
    }

    /// @notice Allows seting the address of the valdation manager contract
    /// @param ivmAddress The address of the deployed ValidationManager contract
    function setValidationManager(address ivmAddress)
        external
        onlyRole(FOUNDATION_ROLE)
    {
        ivm = IValidationManager(ivmAddress);
    }
    /// @notice allows KYCed users to purchase a content
    /// @param tokenId id of the token that will be bought
    /// @param partId id of the part of a content (microlearning)
    function buyContent(uint tokenId, uint partId) external {
        require(irm.getKYC(msg.sender), "You are not KYCed");
        address instructor = udaoc.ownerOf(tokenId);
        require(!irm.getKYC(instructor), "Instructor is not KYCed");
        require(!irm.getBan(instructor), "Instructor is banned");
        require(ivm.isValidated(tokenId), "Content is not validated yet");
        require(
            isTokenBought[msg.sender][tokenId] == false,
            "Content is already bought"
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

    /// @notice Allows users to buy coaching service.
    /// @param tokenId Content token id is used for finding the address of the coach
    function buyCoaching(uint tokenId) external {
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

    /// @notice Allows instructers' to enable coaching for a specific content
    /// @param tokenId The content id
    function createCoaching(uint tokenId) external {
        require(
            udaoc.ownerOf(tokenId) == msg.sender,
            "You are not the owner of token"
        );
        coachingEnabled[tokenId] = true;
    }

    /// @notice Allows instructers' to disable coaching for a specific content
    /// @param tokenId tokenId of the content that will be not coached
    function deleteCoaching(uint tokenId) external {
        require(
            udaoc.ownerOf(tokenId) == msg.sender,
            "You are not the owner of token"
        );
        coachingEnabled[tokenId] = false;
    }

    /// @notice Allows coaches to set their coaching fee.
    /// @param tokenId tokenId of the content that will be coached
    /// @param _coachingFee The fee to set 
    function setCoachingFee(uint tokenId, uint _coachingFee) external {
        require(
            udaoc.ownerOf(tokenId) == msg.sender,
            "You are not the owner of token"
        );
        coachingFee[tokenId] = _coachingFee;
    }
}
