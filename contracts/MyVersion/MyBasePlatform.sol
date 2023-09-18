// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "../ContractManager.sol";
import "../interfaces/IUDAOC.sol";
import "../RoleController.sol";
import "../interfaces/ISupervision.sol";

import "../interfaces/IPriceGetter.sol";

abstract contract MyBasePlatform is Pausable, RoleController {
    //ContractManager is our update contract
    ContractManager public contractManager;

    // UDAO (ERC20) Token interface
    IERC20 udao;

    // UDAO (ERC721) Token interface
    IUDAOC udaoc;

    // instructor => instructor's current balance
    mapping(address => uint) public instCurBalance;
    // instructor => instructor's future balances
    mapping(address => uint[]) public instFuBalance;

    // instructor => last update time of instructor's balance
    mapping(address => uint256) public instUpdTime;
    // last update time of global balances (common for Foundation/Governance/Jurors/Validators)
    uint public gloUpdTime;

    // accepted refund period by platform
    uint256 refundWindow = 14;
    // constant one day equals that in epoch time
    uint256 epochOneDay = 86400;

    //newTime
    uint public gloCntntUpdTime;
    uint public gloCoachUpdTime;

    // Platform
    uint256 public glbCntntCurBalance;
    uint256[] public glbCntntFuBalance;

    // Platform
    uint256 public glbCoachCurBalance;
    uint256[] public glbCoachFuBalance;

    // current balance & future balances of foundation pool
    uint public foundCurBalance;
    uint[] public foundFuBalance;

    // current balance & future balances of governance pool
    uint public goverCurBalance;
    uint[] public goverFuBalance;

    // current balance & future balances of juror pool
    uint public jurorCurBalance;
    uint[] public jurorFuBalance;

    // current balance & future balances of validator pool
    uint public valdtrCurBalance;
    uint[] public valdtrFuBalance;

    // balance to be used in staking pool
    uint public stakingBalance;

    // 100000 -> 100% | 5000 -> 5%
    // cuts for foundation/governance/juror/validator from a coaching
    uint public coachingFoundationCut = 4000;
    uint public coachingGovernanceCut = 0; //700;
    uint public coachingJurorCut = 0; //NOT IMPLEMENTED YET
    // cuts for foundation/governance/juror/validator from a content
    uint public contentFoundationCut = 4000;
    uint public contentGovernanceCut = 0; //700;
    uint public contentJurorCut = 0; //100;
    uint public contentValidatorCut = 0; //200;

    //totalCut
    uint256 totalCutContent = (contentFoundationCut +
        contentGovernanceCut +
        contentJurorCut +
        contentValidatorCut);

    uint256 totalCutCoaching = (coachingFoundationCut +
        coachingGovernanceCut +
        coachingJurorCut);

    mapping(address => uint) public instructorDebt;
    uint256 globalCntntRefDept;
    uint256 globalCoachRefDept;

    // Addresses of governanceTreasury & foundation wallet
    address governanceTreasury;
    address foundationWallet;

    bool isGovernanceTreasuryOnline = false;

    // user address => content id => content owned by the user
    mapping(address => mapping(uint => mapping(uint => bool))) isTokenBought;

    function getContentFoundShare(
        uint256 _priceOf
    ) public view returns (uint256) {
        return ((_priceOf * contentFoundationCut) / totalCutContent);
    }

    function getContentGoverShare(
        uint256 _priceOf
    ) public view returns (uint256) {
        return ((_priceOf * contentGovernanceCut) / totalCutContent);
    }

    function getContentJurorShare(
        uint256 _priceOf
    ) public view returns (uint256) {
        return ((_priceOf * contentJurorCut) / totalCutContent);
    }

    function getContentValdtrShare(
        uint256 _priceOf
    ) public view returns (uint256) {
        return ((_priceOf * contentValidatorCut) / totalCutContent);
    }

    function getTotalCutContentShare(
        uint256 _priceOf
    ) public view returns (uint256) {
        return ((_priceOf * totalCutContent) / 100000);
    }

    //_some for coaching...

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

    /**

     */
    constructor(
        address _contractManager,
        address _rmAddress
    ) RoleController(_rmAddress) {
        contractManager = ContractManager(_contractManager);
        udao = IERC20(contractManager.UdaoAddress());
        udaoc = IUDAOC(contractManager.UdaocAddress());
    }

    // SETTERS

    /// @notice Sets the address of the governance treasury
    /// @param _newAddress New address of the governance treasury
    function setGovernanceTreasuryAddress(
        address _newAddress
    ) external onlyRole(BACKEND_ROLE) {
        governanceTreasury = _newAddress;
        emit GovernanceTreasuryUpdated(_newAddress);
    }

    /// @notice Sets the address of the foundation wallet
    /// @param _newAddress New address of the foundation wallet
    function setFoundationWalletAddress(
        address _newAddress
    ) external onlyRole(BACKEND_ROLE) {
        foundationWallet = _newAddress;
        emit FoundationWalletUpdated(_newAddress);
    }

    /// @notice Sets the address of the contract manager
    /// @param _newAddress New address of the contract manager
    function setContractManagerAddress(
        address _newAddress
    ) external onlyRole(BACKEND_ROLE) {
        contractManager = ContractManager(_newAddress);
        emit ContractManagerUpdated(_newAddress);
    }

    /// @notice Get the updated addresses from contract manager
    function updateAddresses() external onlyRole(BACKEND_ROLE) {
        udao = IERC20(contractManager.UdaoAddress());
        udaoc = IUDAOC(contractManager.UdaocAddress());
        IRM = IRoleManager(contractManager.IrmAddress());

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
    ) external onlyRole(GOVERNANCE_ROLE) {
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
    ) external onlyRole(GOVERNANCE_ROLE) {
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
    ) external onlyRole(GOVERNANCE_ROLE) {
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
    ) external onlyRole(GOVERNANCE_ROLE) {
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
    function setContentJurorCut(uint _cut) external onlyRole(GOVERNANCE_ROLE) {
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
    ) external onlyRole(GOVERNANCE_ROLE) {
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
}
