// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "./IUDAOC.sol";
import "./RoleController.sol";

abstract contract BasePlatform is Pausable, RoleController {
    // content id => content balance
    mapping(address => uint) instructorBalance;

    // user address => content id => content owned by the user
    mapping(address => mapping(uint => mapping(uint => bool))) isTokenBought;

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
        address udaoAddress,
        address udaocAddress,
        address rmAddress
    ) RoleController(rmAddress) {
        udao = IERC20(udaoAddress);
        udaoc = IUDAOC(udaocAddress);
    }

    // SETTERS

    /// @notice changes cut from coaching for foundation
    /// @param _cut new cut (100000 -> 100% | 5000 -> 5%)
    function setCoachingFoundationCut(uint _cut)
        external
        onlyRole(GOVERNANCE_ROLE)
    {
        coachingFoundationCut = _cut;
    }

    /// @notice changes cut from coaching for governance
    /// @param _cut new cut (100000 -> 100% | 5000 -> 5%)
    function setCoachingGovernanceCut(uint _cut)
        external
        onlyRole(GOVERNANCE_ROLE)
    {
        coachingGovernancenCut = _cut;
    }

    /// @notice changes cut from content for foundation
    /// @param _cut new cut (100000 -> 100% | 5000 -> 5%)
    function setContentFoundationCut(uint _cut)
        external
        onlyRole(GOVERNANCE_ROLE)
    {
        contentFoundationCut = _cut;
    }

    /// @notice changes cut from content for governance
    /// @param _cut new cut (100000 -> 100% | 5000 -> 5%)
    function setContentGovernanceCut(uint _cut)
        external
        onlyRole(GOVERNANCE_ROLE)
    {
        contentGovernancenCut = _cut;
    }

    /// @notice changes cut from content for juror pool
    /// @param _cut new cut (100000 -> 100% | 5000 -> 5%)
    function setContentJurorCut(uint _cut) external onlyRole(GOVERNANCE_ROLE) {
        contentJurorCut = _cut;
    }

    /// @notice changes cut from content for validator pool
    /// @param _cut new cut (100000 -> 100% | 5000 -> 5%)
    function setContentValidatorCut(uint _cut)
        external
        onlyRole(GOVERNANCE_ROLE)
    {
        contentValidatorCut = _cut;
    }
}
