// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "./IKYC.sol";
import "./IUDAOC.sol";
import "./RoleManager.sol";

abstract contract BasePlatform is Pausable, RoleManager {

    // coach wallet => team balance
    mapping(address => uint) coachBalance;

    // content id => content balance
    mapping(address => uint) contentBalance;

    // user address => content id => content owned by the user
    mapping(address => mapping(uint => bool)) isTokenBought;

    // balance of foundation
    uint public foundationBalance;

    // balance of governance
    uint public governanceBalance;

    // balance to be used in staking pool
    uint public stakingBalance;

    // balance to be used for juror rewards
    uint public jurorBalance;

    // balance to be used for validator rewards
    uint public validatorBalance;

    // KYC interface
    IKYC ikyc;

    // UDAO (ERC20) Token interface
    IERC20 udao;

    // UDAO (ERC721) Token interface
    IUDAOC udaoc;

    // 100000 -> 100% | 5000 -> 5%
    // cut for foundation from coaching
    uint public coachingFoundationCut;
    // cut for governance from coaching
    uint public coachingGovernancenCut;
    // cut for foundation from content
    uint public contentFoundationCut;
    // cut for governance from content
    uint public contentGovernancenCut;
    // cut for juror pool from content
    uint public contentJurorCut;
    // cut for validator pool from content
    uint public contentValidatorCut;

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
    }

    function pause() public onlyRole(GOVERNANCE_ROLE) {
        _pause();
    }

    function unpause() public onlyRole(GOVERNANCE_ROLE) {
        _unpause();
    }

    // SETTERS
    function setKycContractAddress(address _kycAddress)
        external
        onlyRole(FOUNDATION_ROLE)
    {
        /// @notice changes KYC contract address
        /// @param _kycAddress address of new KYC contract
        ikyc = IKYC(address(_kycAddress));
    }

    function setCoachingFoundationCut(uint _cut)
        external
        onlyRole(GOVERNANCE_ROLE)
    {
        /// @notice changes cut from coaching for foundation
        /// @param _cut new cut (100000 -> 100% | 5000 -> 5%)
        coachingFoundationCut = _cut;
    }

    function setCoachingGovernanceCut(uint _cut)
        external
        onlyRole(GOVERNANCE_ROLE)
    {
        /// @notice changes cut from coaching for governance
        /// @param _cut new cut (100000 -> 100% | 5000 -> 5%)
        coachingGovernancenCut = _cut;
    }

    function setContentFoundationCut(uint _cut)
        external
        onlyRole(GOVERNANCE_ROLE)
    {
        /// @notice changes cut from content for foundation
        /// @param _cut new cut (100000 -> 100% | 5000 -> 5%)
        contentFoundationCut = _cut;
    }

    function setContentGovernanceCut(uint _cut)
        external
        onlyRole(GOVERNANCE_ROLE)
    {
        /// @notice changes cut from content for governance
        /// @param _cut new cut (100000 -> 100% | 5000 -> 5%)
        contentGovernancenCut = _cut;
    }

    function setContentJurorCut(uint _cut) external onlyRole(GOVERNANCE_ROLE) {
        /// @notice changes cut from content for juror pool
        /// @param _cut new cut (100000 -> 100% | 5000 -> 5%)
        contentJurorCut = _cut;
    }

    function setContentValidatorCut(uint _cut)
        external
        onlyRole(GOVERNANCE_ROLE)
    {
        /// @notice changes cut from content for validator pool
        /// @param _cut new cut (100000 -> 100% | 5000 -> 5%)
        contentValidatorCut = _cut;
    }

    function withdrawGovernance() external onlyRole(GOVERNANCE_ROLE) {
        /// @notice withdraws governance balance to governance treasury
        udao.transfer(governanceTreasury, governanceBalance);
    }

    function withdrawFoundation() external onlyRole(FOUNDATION_ROLE) {
        /// @notice withdraws foundation balance to foundation wallet
        udao.transfer(foundationWallet, foundationBalance);
    }

    function withdrawValidator() external {
        /// @notice calculates validator earnings and withdraws calculated earning to validator wallet
        require(udaoc.hasRole(VALIDATOR_ROLE, msg.sender));
        uint[2] memory results = udaoc.getValidationResults(msg.sender);
        uint participation = (results[0] * 100000) / udaoc.getTotalValidation();
        uint earning = (participation * validatorBalance) / 100000;
        udao.transfer(msg.sender, earning);
    }
}
