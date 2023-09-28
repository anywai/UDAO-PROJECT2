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
import "./IGovernanceTreasury.sol";

abstract contract MyBasePlatform is Pausable, RoleController {
    ////////////////////////////////////////////////////////
    ////////////////COMMON WİTH OLD TREASURY////////////////
    ////////////////////////////////////////////////////////

    //ContractManager is our update contract
    ContractManager public contractManager;

    IGovernanceTreasury public iGovernanceTreasury;

    // UDAO (ERC20) Token interface
    IERC20 udao;

    // UDAO (ERC721) Token interface
    IUDAOC udaoc;

    // Addresses of governanceTreasury & foundation wallet
    address governanceTreasury;
    address foundationWallet;

    // user address => content id => content owned by the user
    mapping(address => mapping(uint => mapping(uint => bool))) isTokenBought;

    // SETTERS COMMON

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
        iGovernanceTreasury = IGovernanceTreasury(contractManager.GovernanceTreasuryAddress());

        /*
        //REMOVED BELONGS TO OLD TREASURY
            //ISupVis = ISupervision(contractManager.ISupVisAddress());
            //priceGetter = IPriceGetter(contractManager.IPriceGetterAddress());
        */

        emit AddressesUpdated(
            contractManager.UdaoAddress(),
            contractManager.UdaocAddress(),
            contractManager.ISupVisAddress(),
            contractManager.IrmAddress()
        );
    }

    constructor(
        address _contractManager,
        address _rmAddress,
        address _iGovernanceTreasuryAddress
    ) RoleController(_rmAddress) {
        contractManager = ContractManager(_contractManager);
        udao = IERC20(contractManager.UdaoAddress());
        udaoc = IUDAOC(contractManager.UdaocAddress());
        iGovernanceTreasury = IGovernanceTreasury(_iGovernanceTreasuryAddress);
        /*
        //REMOVED BELONGS TO OLD TREASURY
            //ISupVis = ISupervision(contractManager.ISupVisAddress());
            //priceGetter = IPriceGetter(priceGetterAddress);
        */
    }

    // EVENTS COMMON

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

    ////////////////////////////////////////////////////////
    ////////////////NEWLY ADDED TO TREASURY/////////////////
    ////////////////////////////////////////////////////////

    // Accepted refund period by platform
    uint256 refundWindow = 14;
    // Constant one day equals that in epoch time
    uint256 epochOneDay = 86400;

    // Instructor => current balance & future balances of instructor
    mapping(address => uint) public instCurBalance;
    mapping(address => uint[]) public instFuBalance;

    // Current balance & future balances of total contract pool for content sale
    uint256 public glbCntntCurBalance;
    uint256[] public glbCntntFuBalance;
    // Current balance & future balances of total contract pool for coaching sale
    uint256 public glbCoachCurBalance;
    uint256[] public glbCoachFuBalance;

    // Current balance of foundation/governance/juror/validator pool
    uint public foundCurBalance;
    uint public goverCurBalance;
    uint public jurorCurBalance;
    uint public valdtrCurBalance;

    // Instructor => last update time of instructor's current balance
    mapping(address => uint256) public instUpdTime;
    // Last update time of current balances
    uint public glbCntntUpdTime;
    uint public glbCoachUpdTime;

    // Instructor => instructor debt amount (debt occured due to refund)
    mapping(address => uint) public instRefDebt;
    // Global balances debt amount (debt occured due to refund)
    uint256 globalCntntRefDebt;
    uint256 globalCoachRefDebt;

    // 100000 -> 100% | 5000 -> 5%
    // Cuts for foundation/governance/juror/validator for a coaching sale
    uint public coachFoundCut = 4000;
    uint public coachGoverCut = 0; //700;
    uint public coachJurorCut = 0; //new!!
    // Cuts for foundation/governance/juror/validator for a content sale
    uint public cntntFoundCut = 4000;
    uint public cntntGoverCut = 0; //700;
    uint public cntntJurorCut = 0; //100;
    uint public cntntValidtrCut = 0; //200;

    // Total cuts for content&coaching sale
    uint256 cntntTotalCut =
        cntntFoundCut + cntntGoverCut + cntntJurorCut + cntntValidtrCut;
    uint256 totalCutCoaching = coachFoundCut + coachGoverCut + coachJurorCut;

    // There is no GovernanceTreasury in MVP, after governance release will be set
    bool isGovernanceTreasuryOnline = false;

    /*
    //REMOVED to reduce gas cost
        //future balances of foundation/governance/juror/validator pool
            uint[] public foundFuBalance;
            uint[] public goverFuBalance;
            uint[] public jurorFuBalance;
            uint[] public valdtrFuBalance;
        // last update time of global balances (common for Foundation/Governance/Jurors/Validators)
            uint public gloUpdTime;
    */

    /// @notice This event is triggered if a cut is updated.
    event PlatformCutsUpdated(
        uint coachFnd,
        uint coachGov,
        uint coachJuror,
        uint contentFnd,
        uint contentGov,
        uint contentJuror,
        uint contentValid
    );

    function calculateContentFoundShare(
        uint256 _priceOf
    ) public view returns (uint256) {
        return ((_priceOf * cntntFoundCut) / cntntTotalCut);
    }

    function calculateContentGoverShare(
        uint256 _priceOf
    ) public view returns (uint256) {
        return ((_priceOf * cntntGoverCut) / cntntTotalCut);
    }

    function calculateContentJurorShare(
        uint256 _priceOf
    ) public view returns (uint256) {
        return ((_priceOf * cntntJurorCut) / cntntTotalCut);
    }

    function calculateContentValdtrShare(
        uint256 _priceOf
    ) public view returns (uint256) {
        return ((_priceOf * cntntValidtrCut) / cntntTotalCut);
    }

    function calculateTotalCutContentShare(
        uint256 _priceOf
    ) public view returns (uint256) {
        return ((_priceOf * cntntTotalCut) / 100000);
    }

    // SETTERS

    /// @notice changes cut from coaching for foundation
    /// @param _cut new cut (100000 -> 100% | 5000 -> 5%)
    function setCoachFoundCut(uint _cut) external onlyRole(GOVERNANCE_ROLE) {
        uint256 otherCuts = coachGoverCut + coachJurorCut;
        require(_cut + otherCuts < 100000, "Cuts cant be higher than %100");

        coachFoundCut = _cut;
        setCoachTotalCut();
    }

    /// @notice changes cut from coaching for governance
    /// @param _cut new cut (100000 -> 100% | 5000 -> 5%)
    function setCoachGoverCut(uint _cut) external onlyRole(GOVERNANCE_ROLE) {
        uint256 otherCuts = coachGoverCut + coachJurorCut;
        require(_cut + otherCuts < 100000, "Cuts cant be higher than %100");

        coachGoverCut = _cut;
        setCoachTotalCut();
    }

    /// @notice changes cut from coaching for governance
    /// @param _cut new cut (100000 -> 100% | 5000 -> 5%)
    function setCoachJurorCut(uint256 _cut) external onlyRole(GOVERNANCE_ROLE) {
        uint256 otherCuts = coachFoundCut + coachGoverCut;
        require(_cut + otherCuts < 100000, "Cuts cant be higher than %100");

        coachJurorCut = _cut;
        setCoachTotalCut();
    }

    function setCoachTotalCut() internal {
        totalCutCoaching = (coachFoundCut + coachGoverCut + coachJurorCut);

        emit PlatformCutsUpdated(
            coachFoundCut,
            coachGoverCut,
            coachJurorCut,
            cntntFoundCut,
            cntntGoverCut,
            cntntJurorCut,
            cntntValidtrCut
        );
    }

    /// @notice changes cut from content for foundation
    /// @param _cut new cut (100000 -> 100% | 5000 -> 5%)
    function setCntntFounCut(uint _cut) external onlyRole(GOVERNANCE_ROLE) {
        //uint256 otherCuts = cntntGoverCut + cntntJurorCut + cntntValdtrCut;
        uint otherCuts = cntntGoverCut + cntntJurorCut + cntntValidtrCut;
        require(_cut + otherCuts < 10000, "Cuts cant be higher than %100");

        cntntFoundCut = _cut;
        setCntntTotalCut();
    }

    /// @notice changes cut from content for governance
    /// @param _cut new cut (100000 -> 100% | 5000 -> 5%)
    function setCntntGoverCut(uint _cut) external onlyRole(GOVERNANCE_ROLE) {
        uint otherCuts = cntntFoundCut + cntntJurorCut + cntntValidtrCut;
        require(_cut + otherCuts < 10000, "Cuts cant be higher than %100");

        cntntGoverCut = _cut;
        setCntntTotalCut();
    }

    /// @notice changes cut from content for juror pool
    /// @param _cut new cut (100000 -> 100% | 5000 -> 5%)
    function setCntntJurorCut(uint _cut) external onlyRole(GOVERNANCE_ROLE) {
        uint otherCuts = cntntFoundCut + cntntGoverCut + cntntValidtrCut;
        require(_cut + otherCuts < 10000, "Cuts cant be higher than %100");

        cntntJurorCut = _cut;
        setCntntTotalCut();
    }

    /// @notice changes cut from content for validator pool
    /// @param _cut new cut (100000 -> 100% | 5000 -> 5%)
    function setCntntValidtrCut(uint _cut) external onlyRole(GOVERNANCE_ROLE) {
        uint otherCuts = cntntFoundCut + cntntGoverCut + cntntJurorCut;
        require(_cut + otherCuts < 10000, "Cuts cant be higher than %100");

        cntntValidtrCut = _cut;
        setCntntTotalCut();
    }

    function setCntntTotalCut() internal {
        cntntTotalCut = (cntntFoundCut +
            cntntGoverCut +
            cntntJurorCut +
            cntntValidtrCut);

        emit PlatformCutsUpdated(
            coachFoundCut,
            coachGoverCut,
            coachJurorCut,
            cntntFoundCut,
            cntntGoverCut,
            cntntJurorCut,
            cntntValidtrCut
        );
    }
}
