// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "./IKYC.sol";

interface IUDAOC is IERC721 {
    function getPriceContent(uint tokenId) external view returns (uint);
}

contract Platform is Pausable, AccessControl {
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");
    bytes32 public constant FOUNDATION_ROLE = keccak256("FOUNDATION_ROLE");
    mapping(address => bool) isCompany;
    struct Coach {
        uint teamId;
        bool isTeamLeader;
        uint coachingFee;
    }

    mapping(address => Coach) coaches;
    mapping(address => uint[]) ownedContents;

    using Counters for Counters.Counter;
    Counters.Counter private teamIds;

    IKYC ikyc;
    IERC20 udao;
    IUDAOC udaoc;

    // ITreasury treasury;

    constructor(
        address _kycAddress,
        address udaoAddress,
        address udaocAddress
    ) {
        ikyc = IKYC(_kycAddress);
        udao = IERC20(udaoAddress);
        udaoc = IUDAOC(udaocAddress);
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(PAUSER_ROLE, msg.sender);
    }

    function pause() public onlyRole(PAUSER_ROLE) {
        _pause();
    }

    function unpause() public onlyRole(PAUSER_ROLE) {
        _unpause();
    }

    function buyCoaching(address _coach) external {
        /// @dev Should be updated
        require(ikyc.getKYC(msg.sender), "You are not KYCed");
        require(coaches[_coach].teamId != 0, "Address is not coach");
        require(ikyc.getBan(_coach), "Coach is banned");
        udao.transferFrom(
            msg.sender,
            address(this),
            100
        );
    }

    function buyContent(uint tokenId) external {
        require(ikyc.getKYC(msg.sender), "You are not KYCed");
        udao.transferFrom(
            msg.sender,
            address(this),
            udaoc.getPriceContent(tokenId)
        );
        ownedContents[msg.sender].push(tokenId);
    }

    function buyCourse(uint tokenId) external {}

    // SETTERS

    function setCompany(address _companyAddress, bool _isCompany)
        external
        onlyRole(FOUNDATION_ROLE)
    {
        isCompany[_companyAddress] = _isCompany;
    }

    function setKycContractAddress(address _kycAddress)
        external
        onlyRole(FOUNDATION_ROLE)
    {
        ikyc = IKYC(address(_kycAddress));
    }

    function createCoach(uint coachingFee) external {
        require(ikyc.getKYC(msg.sender), "You are not KYCed");
        require(coaches[msg.sender].teamId == 0, "You are already registered as a coach");
        teamIds.increment();
        coaches[msg.sender] = Coach(teamIds.current(), true, coachingFee);
    }
    
    function addCoachToTeam(address _coachAddress, uint _coachingFee) external {
        require(udaoc.balanceOf(msg.sender) > 0, "You are not an instructor");
        require(coaches[msg.sender].isTeamLeader == true, "You are not the team leader");
        coaches[_coachAddress] = Coach(coaches[msg.sender].teamId, false, _coachingFee);
    }

    function removeCoachFromTeam(address _coachAddress) external {
        require(coaches[msg.sender].isTeamLeader == true, "You are not the team leader");
        require(coaches[msg.sender].teamId == coaches[_coachAddress].teamId);
        delete coaches[_coachAddress];
    }

    function setCoachingFee(address _coachAddress, uint _coachingFee) external {
        require(coaches[msg.sender].isTeamLeader == true, "You are not the team leader");
        require(coaches[msg.sender].teamId == coaches[_coachAddress].teamId);
        coaches[_coachAddress].coachingFee = _coachingFee;
    }
}
