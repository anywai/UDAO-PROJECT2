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

    IValidationManager public IVM;

    /// @param vmAddress The address of the deployed ValidationManager contract
    constructor(address vmAddress) {
        IVM = IValidationManager(vmAddress);
    }

    /// @notice Allows seting the address of the valdation manager contract
    /// @param vmAddress The address of the deployed ValidationManager contract
    function setValidationManager(address vmAddress)
        external
        onlyRole(FOUNDATION_ROLE)
    {
        IVM = IValidationManager(vmAddress);
    }

    /// @notice allows KYCed users to purchase a content
    /// @param tokenId id of the token that will be bought
    /// @param partIds ids of the parts of a content (microlearning)
    function buyContent(uint tokenId, uint[] calldata partIds) external {
        require(udaoc.exists(tokenId), "Content does not exist!");
        require(!IRM.isBanned(msg.sender), "You are banned");
        require(IRM.isKYCed(msg.sender), "You are not KYCed");
        address instructor = udaoc.ownerOf(tokenId);
        require(IRM.isKYCed(instructor), "Instructor is not KYCed");
        require(!IRM.isBanned(instructor), "Instructor is banned");
        require(IVM.isValidated(tokenId), "Content is not validated yet");
        require(
            isTokenBought[msg.sender][tokenId][0] == false,
            "Full content is already bought"
        );
        uint partIdLength = partIds.length;
        uint contentPrice;
        for (uint i; i < partIdLength; i++) {
            require(
                partIds[i] < udaoc.getPartNumberOfContent(tokenId),
                "Part does not exist!"
            );
            require(
                isTokenBought[msg.sender][tokenId][partIds[i]] == false,
                "Content part is already bought"
            );
            contentPrice += udaoc.getPriceContent(tokenId, partIds[i]);

            isTokenBought[msg.sender][tokenId][partIds[i]] = true;
            ownedContents[msg.sender].push([tokenId, partIds[i]]);
        }
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
    }

    /// @notice Allows users to buy coaching service.
    /// @param tokenId Content token id is used for finding the address of the coach
    function buyCoaching(uint tokenId) external {
        require(IRM.isKYCed(msg.sender), "You are not KYCed");
        address instructor = udaoc.ownerOf(tokenId);
        require(IRM.isKYCed(instructor), "Instructor is not KYCed");
        require(!IRM.isBanned(instructor), "Instructor is banned");
        require(IVM.isValidated(tokenId), "Content is not validated yet");

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
    function enableCoaching(uint tokenId) external {
        require(
            udaoc.ownerOf(tokenId) == msg.sender,
            "You are not the owner of token"
        );
        coachingEnabled[tokenId] = true;
    }

    /// @notice Allows instructers' to disable coaching for a specific content
    /// @param tokenId tokenId of the content that will be not coached
    function disableCoaching(uint tokenId) external {
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

    function getOwnedContent(address _owner)
        public
        view
        returns (uint[][] memory)
    {
        return (ownedContents[_owner]);
    }
}
