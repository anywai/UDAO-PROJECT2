// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "../ContractManager.sol";
import "../interfaces/IUDAOC.sol";
import "../interfaces/ISupervision.sol";
import "../interfaces/IPriceGetter.sol";
import "../interfaces/IRoleManager.sol";
import "../RoleNames.sol";


abstract contract BasePlatform is Pausable, RoleNames {
    ContractManager public contractManager;
    IRoleManager roleManager;

    // content id => content balance
    mapping(address => uint) public instructorBalance;
    mapping(address => uint) public instructorDebt;

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
    mapping(uint => uint) public payPerJuror;

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
    uint public coachingGovernanceCut = 700;
    // cut for foundation from content
    uint public contentFoundationCut = 4000;
    // cut for governance from content
    uint public contentGovernanceCut = 700;
    // cut for juror pool from content
    uint public contentJurorCut = 100;
    // cut for validator pool from content
    uint public contentValidatorCut = 200;

    address governanceTreasury; 
    address foundationWallet;

    ISupervision ISupVis;

    /// @notice Triggered after every round is finalized and rewards are distributed
    event RewardsDistributed(
        uint payPerValidationScore,
        uint payPerJurorPoint,
        uint newRoundId
    );

    /// @notice This event is triggered if a cut is updated.
    event CutsUpdated(
        uint coachFnd,
        uint coachGov,
        uint contentFnd,
        uint contentGov,
        uint contentJuror,
        uint contentValid
    );

    /// @notice This event is triggered if the governance treasury address is updated.
    event GovernanceTreasuryUpdated(address newAddress);

    /// @notice This event is triggered if the foundation wallet address is updated.
    event FoundationWalletUpdated(address newAddress);

    /// @notice This event is triggered if the contract manager address is updated.
    event ContractManagerUpdated(address newAddress);

    /// @notice This event is triggered if the contract manager updates the addresses.
    event AddressesUpdated(
        address udao,
        address udaoc,
        address isupvis,
        address irm
    );

    IPriceGetter priceGetter;

    /**

     */
    constructor(
        address _contractManager,
        address rmAddress,
        address priceGetterAddress
    ) {
        contractManager = ContractManager(_contractManager);
        udao = IERC20(contractManager.UdaoAddress());
        udaoc = IUDAOC(contractManager.UdaocAddress());
        ISupVis = ISupervision(contractManager.ISupVisAddress());
        priceGetter = IPriceGetter(priceGetterAddress);
        roleManager = IRoleManager(rmAddress);
    }

    // SETTERS

    /// @notice Sets the address of the governance treasury
    /// @param _newAddress New address of the governance treasury
    function setGovernanceTreasuryAddress(
        address _newAddress
    ) external {
        require(
            roleManager.hasRole(BACKEND_ROLE, msg.sender),
            "Only backend can set governance treasury address"
        );
        governanceTreasury = _newAddress;
        emit GovernanceTreasuryUpdated(_newAddress);
    }

    /// @notice Sets the address of the foundation wallet
    /// @param _newAddress New address of the foundation wallet
    function setFoundationWalletAddress(
        address _newAddress
    ) external {
        require(
            roleManager.hasRole(BACKEND_ROLE, msg.sender),
            "Only backend can set foundation wallet address"
        );
        foundationWallet = _newAddress;
        emit FoundationWalletUpdated(_newAddress);
    }

    /// @notice Sets the address of the contract manager
    /// @param _newAddress New address of the contract manager
    function setContractManagerAddress(
        address _newAddress
    ) external {
        require(
            roleManager.hasRole(BACKEND_ROLE, msg.sender),
            "Only backend can set contract manager address"
        );
        contractManager = ContractManager(_newAddress);
        emit ContractManagerUpdated(_newAddress);
    }

    /// @notice Get the updated addresses from contract manager
    function updateAddresses() external {
        require(
            roleManager.hasRole(BACKEND_ROLE, msg.sender),
            "Only backend can update addresses"
        );
        udao = IERC20(contractManager.UdaoAddress());
        udaoc = IUDAOC(contractManager.UdaocAddress());
        ISupVis = ISupervision(contractManager.ISupVisAddress());
        roleManager = IRoleManager(contractManager.IrmAddress());

        priceGetter = IPriceGetter(contractManager.IPriceGetterAddress());

        emit AddressesUpdated(
            contractManager.UdaoAddress(),
            contractManager.UdaocAddress(),
            contractManager.ISupVisAddress(),
            contractManager.IrmAddress()
        );
    }

    /// @notice changes cut from coaching for foundation
    /// @param _cut new cut (100000 -> 100% | 5000 -> 5%)
    function setCoachingFoundationCut(
        uint _cut
    ) external {
        require(roleManager.hasRole(BACKEND_ROLE, msg.sender), "Only backend can set cut");
        require(
            _cut + coachingGovernanceCut < 100000,
            "Cuts cant be higher than %100"
        );
        coachingFoundationCut = _cut;
        emit CutsUpdated(
            coachingFoundationCut,
            coachingGovernanceCut,
            contentFoundationCut,
            contentGovernanceCut,
            contentJurorCut,
            contentValidatorCut
        );
    }

    /// @notice changes cut from coaching for governance
    /// @param _cut new cut (100000 -> 100% | 5000 -> 5%)
    function setCoachingGovernanceCut(
        uint _cut
    ) external {
        require(roleManager.hasRole(GOVERNANCE_ROLE, msg.sender), "Only governance can set cut");
        require(
            coachingFoundationCut + _cut < 100000,
            "Cuts cant be higher than %100"
        );
        coachingGovernanceCut = _cut;
        emit CutsUpdated(
            coachingFoundationCut,
            coachingGovernanceCut,
            contentFoundationCut,
            contentGovernanceCut,
            contentJurorCut,
            contentValidatorCut
        );
    }

    /// @notice changes cut from content for foundation
    /// @param _cut new cut (100000 -> 100% | 5000 -> 5%)
    function setContentFoundationCut(
        uint _cut
    ) external {
        require(roleManager.hasRole(GOVERNANCE_ROLE, msg.sender), "Only governance can set cut");
        require(
            _cut +
                contentGovernanceCut +
                contentJurorCut +
                contentValidatorCut <
                10000,
            "Cuts cant be higher than %100"
        );
        contentFoundationCut = _cut;
        emit CutsUpdated(
            coachingFoundationCut,
            coachingGovernanceCut,
            contentFoundationCut,
            contentGovernanceCut,
            contentJurorCut,
            contentValidatorCut
        );
    }

    /// @notice changes cut from content for governance
    /// @param _cut new cut (100000 -> 100% | 5000 -> 5%)
    function setContentGovernanceCut(
        uint _cut
    ) external  {
        require(roleManager.hasRole(GOVERNANCE_ROLE, msg.sender), "Only governance can set cut");
        require(
            contentFoundationCut +
                _cut +
                contentJurorCut +
                contentValidatorCut <
                10000,
            "Cuts cant be higher than %100"
        );
        contentGovernanceCut = _cut;
        emit CutsUpdated(
            coachingFoundationCut,
            coachingGovernanceCut,
            contentFoundationCut,
            contentGovernanceCut,
            contentJurorCut,
            contentValidatorCut
        );
    }

    /// @notice changes cut from content for juror pool
    /// @param _cut new cut (100000 -> 100% | 5000 -> 5%)
    function setContentJurorCut(uint _cut) external {
        require(roleManager.hasRole(GOVERNANCE_ROLE, msg.sender), "Only governance can set cut");
        require(
            contentFoundationCut +
                contentGovernanceCut +
                _cut +
                contentValidatorCut <
                10000,
            "Cuts cant be higher than %100"
        );
        contentJurorCut = _cut;
        emit CutsUpdated(
            coachingFoundationCut,
            coachingGovernanceCut,
            contentFoundationCut,
            contentGovernanceCut,
            contentJurorCut,
            contentValidatorCut
        );
    }

    /// @notice changes cut from content for validator pool
    /// @param _cut new cut (100000 -> 100% | 5000 -> 5%)
    function setContentValidatorCut(
        uint _cut
    ) external {
        require(roleManager.hasRole(GOVERNANCE_ROLE, msg.sender), "Only governance can set cut");
        require(
            contentFoundationCut +
                contentGovernanceCut +
                contentJurorCut +
                _cut <
                10000,
            "Cuts cant be higher than %100"
        );
        contentValidatorCut = _cut;
        emit CutsUpdated(
            coachingFoundationCut,
            coachingGovernanceCut,
            contentFoundationCut,
            contentGovernanceCut,
            contentJurorCut,
            contentValidatorCut
        );
    }

    /**
     * @notice distributes rewards for round
     * Gets balance accumulated this round and distributes it per point
     * for validators to claim it later.
     * TODO Automate this process with sentinels?
     */
    function distributeRewards()
        external
        whenNotPaused
    {
        require(
            roleManager.hasRoles(administrator_roles, msg.sender),
            "Only admins can distribute rewards"
        );
        // Validator reward distribution
        uint currentTotalValidatorScore = ISupVis.getTotalValidationScore();
        if (validatorBalanceForRound > 0 && currentTotalValidatorScore > 0) {
            payPerValidationScore[distributionRound] =
                validatorBalanceForRound /
                currentTotalValidatorScore;
            validatorBalanceForRound = 0;
        }

        // Juror reward distribution
        uint currentJurorTotalScore = ISupVis.getTotalJurorScore();
        if (jurorBalanceForRound > 0 && currentJurorTotalScore > 0) {
            payPerJuror[distributionRound] =
                jurorBalanceForRound /
                currentJurorTotalScore;
            jurorBalanceForRound = 0;
        }

        ISupVis.nextRound();
        distributionRound++;

        emit RewardsDistributed(
            payPerValidationScore[distributionRound - 1],
            payPerJuror[distributionRound - 1],
            distributionRound
        );
    }
}
