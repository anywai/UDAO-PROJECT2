// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "./IKYC.sol";
import "./IUDAOC.sol";
import "./RoleManager.sol";

abstract contract BasePlatform is Pausable, RoleManager {
    mapping(address => bool) isCompany;

    mapping(address => uint[]) ownedContents;
    mapping(uint => uint) teamBalance;
    mapping(address => uint) contentBalance;
    mapping(address => mapping(uint => bool)) isTokenBought;
    uint public foundationBalance;
    uint public governacneBalance;
    uint public stakingBalance;
    uint public jurorBalance;
    uint public validatorBalance;

    IKYC ikyc;
    IERC20 udao;
    IUDAOC udaoc;

    // 100000 -> 100% | 5000 -> 5%

    uint public coachingFoundationCut;
    uint public coachingGovernancenCut;
    uint public courseFoundationCut;
    uint public courseGovernancenCut;
    uint public courseJurorCut;
    uint public courseValidatorCut;

    address public governanceTreasury;
    address public foundationWallet;

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

    function setCoachingFoundationCut(uint _cut)
        external
        onlyRole(GOVERNANCE_ROLE)
    {
        coachingFoundationCut = _cut;
    }

    function setCoachingGovernanceCut(uint _cut)
        external
        onlyRole(GOVERNANCE_ROLE)
    {
        coachingGovernancenCut = _cut;
    }

    function setcourseFoundationCut(uint _cut)
        external
        onlyRole(GOVERNANCE_ROLE)
    {
        courseFoundationCut = _cut;
    }

    function setcourseGovernanceCut(uint _cut)
        external
        onlyRole(GOVERNANCE_ROLE)
    {
        courseGovernancenCut = _cut;
    }

    function setcourseJurorCut(uint _cut) external onlyRole(GOVERNANCE_ROLE) {
        courseJurorCut = _cut;
    }

    function setcourseValidatorCut(uint _cut)
        external
        onlyRole(GOVERNANCE_ROLE)
    {
        courseValidatorCut = _cut;
    }

    function withdrawGovernance() external onlyRole(GOVERNANCE_ROLE) {
        udao.transfer(governanceTreasury, governacneBalance);
    }

    function withdrawFoundation() external onlyRole(FOUNDATION_ROLE) {
        udao.transfer(foundationWallet, foundationBalance);
    }

    function withdrawValidator() external {
        require(udaoc.hasRole(VALIDATOR_ROLE, msg.sender));
        uint[2] memory results = udaoc.getValidationResults(msg.sender);
        uint participation = (results[0] * 100000) / udaoc.getTotalValidation();
        uint earning = (participation * validatorBalance) / 100000;
        udao.transfer(msg.sender, earning);
    }
}
