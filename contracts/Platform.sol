// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "./IKYC.sol";

interface IUDAOC is IERC721 {
    function getPriceContent(uint tokenId) external view returns (uint);
}

contract Platform is Pausable, Ownable {
    mapping(address => bool) isCompany;
    mapping(address => bool) isCoach;
    mapping(address => uint[]) ownedContents;

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
    }

    function pause() public onlyOwner {
        _pause();
    }

    function unpause() public onlyOwner {
        _unpause();
    }

    function buyCoaching(address _coach) external {
        require(ikyc.getKYC(msg.sender), "You are not KYCed");
        require(isCoach[_coach], "Address is not coach");
        require(ikyc.getBan(_coach), "Coach is banned");
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
        onlyOwner
    {
        isCompany[_companyAddress] = _isCompany;
    }

    function setKycContractAddress(address _kycAddress) external onlyOwner {
        ikyc = IKYC(address(_kycAddress));
    }

    function setCoach(address _coachAddress, bool _isCoach) external {
        require(udaoc.balanceOf(msg.sender) > 0, "You are not an instructor");
        isCoach[_coachAddress] = _isCoach;
    }
}
