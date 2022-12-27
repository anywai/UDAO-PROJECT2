// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "./IUDAOC.sol";
import "./RoleController.sol";
import "./IVM.sol";
import "./IJM.sol";

abstract contract BasePlatform is Pausable, RoleController {
    // content id => content balance
    mapping(address => uint) public instructorBalance;

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

    // balance accumulated for current round
    uint public jurorBalanceForRound;

    // balance to be used for validator rewards
    uint public validatorBalance;

    // balance accumulated for current round
    uint public validatorBalanceForRound;

    // active distribution round
    uint public distributionRound;

    // round => pay per point for validation score
    mapping(uint => uint) payPerValidationScore;

    // round => pay per juror since there won't be a juror point
    mapping(uint => uint) payPerJuror;

    // validator => last claimed round
    mapping(address => uint) lastValidatorClaim;

    // juror => last claimed round
    mapping(address => uint) lastJurorClaim;

    // UDAO (ERC20) Token interface
    IERC20 udao;

    // UDAO (ERC721) Token interface
    IUDAOC udaoc;

    // 100000 -> 100% | 5000 -> 5%
    // cut for foundation from coaching
    uint public coachingFoundationCut = 4000;
    // cut for governance from coaching
    uint public coachingGovernancenCut = 700;
    // cut for foundation from content
    uint public contentFoundationCut = 4000;
    // cut for governance from content
    uint public contentGovernancenCut = 700;
    // cut for juror pool from content
    uint public contentJurorCut = 100;
    // cut for validator pool from content
    uint public contentValidatorCut = 200;

    address public governanceTreasury;
    address public foundationWallet;

    IValidationManager public IVM;
    IJurorManager public IJM;

    modifier checkCoachingCuts() {
        require(
            coachingFoundationCut + coachingGovernancenCut < 100000,
            "Cuts cant be higher than %100"
        );
        _;
    }

    modifier checkContentCuts() {
        require(
            contentFoundationCut +
                contentGovernancenCut +
                contentJurorCut +
                contentValidatorCut <
                10000,
            "Cuts cant be higher than %100"
        );
        _;
    }

    event RewardsDistributed(
        uint payPerValidationScore,
        uint payPerJurorPoint,
        uint newRoundId
    );

    event CutsUpdated(
        uint coachFnd,
        uint coachGov,
        uint contentFnd,
        uint contentGov,
        uint contentJuror,
        uint contentValid
    );

    constructor(
        address udaoAddress,
        address udaocAddress,
        address rmAddress,
        address vmAddress,
        address jmAddress
    ) RoleController(rmAddress) {
        udao = IERC20(udaoAddress);
        udaoc = IUDAOC(udaocAddress);
        IVM = IValidationManager(vmAddress);
        IJM = IJurorManager(jmAddress);
    }

    // SETTERS

    /// @notice changes cut from coaching for foundation
    /// @param _cut new cut (100000 -> 100% | 5000 -> 5%)
    function setCoachingFoundationCut(
        uint _cut
    ) external onlyRole(GOVERNANCE_ROLE) checkCoachingCuts {
        coachingFoundationCut = _cut;
        emit CutsUpdated(
            coachingFoundationCut,
            coachingGovernancenCut,
            contentFoundationCut,
            contentGovernancenCut,
            contentJurorCut,
            contentValidatorCut
        );
    }

    /// @notice changes cut from coaching for governance
    /// @param _cut new cut (100000 -> 100% | 5000 -> 5%)
    function setCoachingGovernanceCut(
        uint _cut
    ) external onlyRole(GOVERNANCE_ROLE) checkCoachingCuts {
        coachingGovernancenCut = _cut;
        emit CutsUpdated(
            coachingFoundationCut,
            coachingGovernancenCut,
            contentFoundationCut,
            contentGovernancenCut,
            contentJurorCut,
            contentValidatorCut
        );
    }

    /// @notice changes cut from content for foundation
    /// @param _cut new cut (100000 -> 100% | 5000 -> 5%)
    function setContentFoundationCut(
        uint _cut
    ) external onlyRole(GOVERNANCE_ROLE) checkContentCuts {
        contentFoundationCut = _cut;
        emit CutsUpdated(
            coachingFoundationCut,
            coachingGovernancenCut,
            contentFoundationCut,
            contentGovernancenCut,
            contentJurorCut,
            contentValidatorCut
        );
    }

    /// @notice changes cut from content for governance
    /// @param _cut new cut (100000 -> 100% | 5000 -> 5%)
    function setContentGovernanceCut(
        uint _cut
    ) external onlyRole(GOVERNANCE_ROLE) checkContentCuts {
        contentGovernancenCut = _cut;
        emit CutsUpdated(
            coachingFoundationCut,
            coachingGovernancenCut,
            contentFoundationCut,
            contentGovernancenCut,
            contentJurorCut,
            contentValidatorCut
        );
    }

    /// @notice changes cut from content for juror pool
    /// @param _cut new cut (100000 -> 100% | 5000 -> 5%)
    function setContentJurorCut(
        uint _cut
    ) external onlyRole(GOVERNANCE_ROLE) checkContentCuts {
        contentJurorCut = _cut;
        emit CutsUpdated(
            coachingFoundationCut,
            coachingGovernancenCut,
            contentFoundationCut,
            contentGovernancenCut,
            contentJurorCut,
            contentValidatorCut
        );
    }

    /// @notice changes cut from content for validator pool
    /// @param _cut new cut (100000 -> 100% | 5000 -> 5%)
    function setContentValidatorCut(
        uint _cut
    ) external onlyRole(GOVERNANCE_ROLE) checkContentCuts {
        contentValidatorCut = _cut;
        emit CutsUpdated(
            coachingFoundationCut,
            coachingGovernancenCut,
            contentFoundationCut,
            contentGovernancenCut,
            contentJurorCut,
            contentValidatorCut
        );
    }

    /**
     * @notice distributes rewards for round
     * Gets balance accumulated this round and distributes it per point
     * for validators to claim it later.
     *
     */
    function distributeRewards() external onlyRoles(administrator_roles) {
        // Validator reward distribution
        payPerValidationScore[distributionRound] =
            validatorBalanceForRound /
            IVM.getTotalValidationScore();
        IVM.nextRound();
        validatorBalanceForRound = 0;

        // Juror reward distribution
        payPerJuror[distributionRound] =
            jurorBalanceForRound /
            IJM.getTotalJurorScore();
        IJM.nextRound();
        jurorBalanceForRound = 0;
        distributionRound++;

        emit RewardsDistributed(
            payPerValidationScore[distributionRound - 1],
            payPerJuror[distributionRound - 1],
            distributionRound
        );
    }
}
