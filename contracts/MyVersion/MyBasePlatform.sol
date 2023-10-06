// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "../ContractManager.sol";
import "../interfaces/IUDAOC.sol";
import "../interfaces/ISupervision.sol";
import "../interfaces/IPriceGetter.sol";
import "./IGovernanceTreasury.sol";
import "../interfaces/IRoleManager.sol";
import "../RoleNames.sol";

abstract contract MyBasePlatform is Pausable, RoleNames {
    ////////////////////////////////////////////////////////
    ////////////////COMMON WİTH OLD TREASURY////////////////
    ////////////////////////////////////////////////////////
    IRoleManager roleManager;
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
    function setGovernanceTreasuryAddress(address _newAddress) external {
        require(
            roleManager.hasRole(BACKEND_ROLE, msg.sender),
            "Only backend can set governance treasury address"
        );
        governanceTreasury = _newAddress;
        emit GovernanceTreasuryUpdated(_newAddress);
    }

    /// @notice Sets the address of the foundation wallet
    /// @param _newAddress New address of the foundation wallet
    function setFoundationWalletAddress(address _newAddress) external {
        require(
            roleManager.hasRole(BACKEND_ROLE, msg.sender),
            "Only backend can set foundation wallet address"
        );
        foundationWallet = _newAddress;
        emit FoundationWalletUpdated(_newAddress);
    }

    /// @notice Sets the address of the contract manager
    /// @param _newAddress New address of the contract manager
    function setContractManagerAddress(address _newAddress) external {
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
        roleManager = IRoleManager(contractManager.RmAddress());
        iGovernanceTreasury = IGovernanceTreasury(
            contractManager.GovernanceTreasuryAddress()
        );

        /*
        //REMOVED BELONGS TO OLD TREASURY
            //ISupVis = ISupervision(contractManager.ISupVisAddress());
            //priceGetter = IPriceGetter(contractManager.IPriceGetterAddress());
        */

        emit AddressesUpdated(
            contractManager.UdaoAddress(),
            contractManager.UdaocAddress(),
            contractManager.ISupVisAddress(),
            contractManager.RmAddress()
        );
    }

    constructor(
        address _contractManager,
        address rmAddress,
        address _iGovernanceTreasuryAddress
    ) {
        roleManager = IRoleManager(rmAddress);
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
    mapping(address => uint) public instCurrentBalance;
    mapping(address => uint[]) public instFutureBalance;

    // Current balance & future balances of total contract pool for content sale
    uint256 public gContentCutCurrentBalance;
    uint256[] public gContentCutFutureBalance;
    // Current balance & future balances of total contract pool for coaching sale
    uint256 public gCoachingCurrentBalance;
    uint256[] public gCoachingFutureBalance;

    // Current balance of foundation/governance/juror/validator pool
    uint public foundCurrentBalance;
    uint public goverCurrentBalance;
    uint public jurorCurrentBalance;
    uint public validCurrentBalance;

    // Instructor => last update time of instructor's current balance
    mapping(address => uint256) public instUpdateTime;
    // Last update time of current balances
    uint public gContentUpdateTime;
    uint public gCoachingUpdateTime;

    // Instructor => instructor debt amount (debt occured due to refund)
    mapping(address => uint) public instRefundDebt;
    // Global balances debt amount (debt occured due to refund)
    uint256 gContentRefundDebt;
    uint256 gCoachingRefundDebt;

    // 100000 -> 100% | 5000 -> 5%
    // Cuts for foundation/governance/juror/validator for a coaching sale
    uint public coachFoundCut = 4000;
    uint public coachGoverCut = 0; //700;
    uint public coachJurorCut = 0; //new!!
    uint public coachValidCut = 0;
    // Cuts for foundation/governance/juror/validator for a content sale
    uint public contentFoundCut = 4000;
    uint public contentGoverCut = 0; //700;
    uint public contentJurorCut = 0; //100;
    uint public contentValidCut = 0; //200;

    // Total cuts for content&coaching sale
    uint256 contentTotalCut =
        contentFoundCut + contentGoverCut + contentJurorCut + contentValidCut;
    uint256 totalCutCoaching =
        coachFoundCut + coachGoverCut + coachJurorCut + coachValidCut;

    // There is no GovernanceTreasury in MVP, after governance release will be set
    bool isGovernanceTreasuryOnline = false;

    /// @notice This event is triggered if a cut is updated.
    event PlatformCutsUpdated(
        uint256 coachFoundCut,
        uint256 coachGoverCut,
        uint256 coachJurorCut,
        uint256 coachValidCut,
        uint256 contentFoundCut,
        uint256 contentGoverCut,
        uint256 contentJurorCut,
        uint256 contentValidCut
    );

    function calculateContentFoundShare(
        uint256 _priceOf
    ) public view returns (uint256) {
        return ((_priceOf * contentFoundCut) / contentTotalCut);
    }

    function calculateContentGoverShare(
        uint256 _priceOf
    ) public view returns (uint256) {
        return ((_priceOf * contentGoverCut) / contentTotalCut);
    }

    function calculateContentJurorShare(
        uint256 _priceOf
    ) public view returns (uint256) {
        return ((_priceOf * contentJurorCut) / contentTotalCut);
    }

    function calculateContentValdtrShare(
        uint256 _priceOf
    ) public view returns (uint256) {
        return ((_priceOf * contentValidCut) / contentTotalCut);
    }

    function calculateTotalCutContentShare(
        uint256 _priceOf
    ) public view returns (uint256) {
        return ((_priceOf * contentTotalCut) / 100000);
    }

    function calculateCoachingFoundShare(
        uint256 _priceOf
    ) public view returns (uint256) {
        return ((_priceOf * coachFoundCut) / totalCutCoaching);
    }

    function calculateCoachingGoverShare(
        uint256 _priceOf
    ) public view returns (uint256) {
        return ((_priceOf * coachGoverCut) / totalCutCoaching);
    }

    function calculateCoachingJurorShare(
        uint256 _priceOf
    ) public view returns (uint256) {
        return ((_priceOf * coachJurorCut) / totalCutCoaching);
    }

    function calculateCoachingValidShare(
        uint256 _priceOf
    ) public view returns (uint256) {
        return ((_priceOf * coachValidCut) / totalCutCoaching);
    }

    function calculateTotalCutCoachingShare(
        uint256 _priceOf
    ) public view returns (uint256) {
        return ((_priceOf * totalCutCoaching) / 100000);
    }

    // SETTERS

    /// @notice changes cut from coaching for foundation
    /// @param _cut new cut (100000 -> 100% | 5000 -> 5%)
    function setCoachFoundCut(uint _cut) external {
        require(
            roleManager.hasRole(GOVERNANCE_ROLE, msg.sender),
            "Only governance can set coach foundation cut"
        );
        uint256 otherCuts = coachGoverCut + coachJurorCut + coachValidCut;
        require(_cut + otherCuts < 100000, "Cuts cant be higher than %100");

        coachFoundCut = _cut;
        setCoachTotalCut();
    }

    /// @notice changes cut from coaching for governance
    /// @param _cut new cut (100000 -> 100% | 5000 -> 5%)
    function setCoachGoverCut(uint _cut) external {
        require(
            roleManager.hasRole(GOVERNANCE_ROLE, msg.sender),
            "Only governance can set coach governance cut"
        );
        uint256 otherCuts = coachGoverCut + coachJurorCut + coachValidCut;
        require(_cut + otherCuts < 100000, "Cuts cant be higher than %100");

        coachGoverCut = _cut;
        setCoachTotalCut();
    }

    /// @notice changes cut from coaching for governance
    /// @param _cut new cut (100000 -> 100% | 5000 -> 5%)
    function setCoachJurorCut(uint256 _cut) external {
        require(
            roleManager.hasRole(GOVERNANCE_ROLE, msg.sender),
            "Only backend can set governance treasury address"
        );
        uint256 otherCuts = coachFoundCut + coachGoverCut + coachValidCut;
        require(_cut + otherCuts < 100000, "Cuts cant be higher than %100");

        coachJurorCut = _cut;
        setCoachTotalCut();
    }

    function setCoachValidCut(uint256 _cut) external {
        require(
            roleManager.hasRole(GOVERNANCE_ROLE, msg.sender),
            "Only backend can set governance treasury address"
        );
        uint256 otherCuts = coachFoundCut + coachGoverCut + coachJurorCut;
        require(_cut + otherCuts < 100000, "Cuts cant be higher than %100");

        coachValidCut = _cut;
        setCoachTotalCut();
    }

    function setCoachTotalCut() internal {
        totalCutCoaching = (coachFoundCut +
            coachGoverCut +
            coachJurorCut +
            coachValidCut);

        emit PlatformCutsUpdated(
            coachFoundCut,
            coachGoverCut,
            coachJurorCut,
            coachValidCut,
            contentFoundCut,
            contentGoverCut,
            contentJurorCut,
            contentValidCut
        );
    }

    /// @notice changes cut from content for foundation
    /// @param _cut new cut (100000 -> 100% | 5000 -> 5%)
    function setcontentFoundCut(uint _cut) external {
        require(
            roleManager.hasRole(GOVERNANCE_ROLE, msg.sender),
            "Only backend can set governance treasury address"
        );
        //uint256 otherCuts = contentGoverCut + contentJurorCut + cntntValdtrCut;
        uint otherCuts = contentGoverCut + contentJurorCut + contentValidCut;
        require(_cut + otherCuts < 10000, "Cuts cant be higher than %100");

        contentFoundCut = _cut;
        setcontentTotalCut();
    }

    /// @notice changes cut from content for governance
    /// @param _cut new cut (100000 -> 100% | 5000 -> 5%)
    function setcontentGoverCut(uint _cut) external {
        require(
            roleManager.hasRole(GOVERNANCE_ROLE, msg.sender),
            "Only backend can set governance treasury address"
        );
        uint otherCuts = contentFoundCut + contentJurorCut + contentValidCut;
        require(_cut + otherCuts < 10000, "Cuts cant be higher than %100");

        contentGoverCut = _cut;
        setcontentTotalCut();
    }

    /// @notice changes cut from content for juror pool
    /// @param _cut new cut (100000 -> 100% | 5000 -> 5%)
    function setcontentJurorCut(uint _cut) external {
        require(
            roleManager.hasRole(GOVERNANCE_ROLE, msg.sender),
            "Only backend can set governance treasury address"
        );
        uint otherCuts = contentFoundCut + contentGoverCut + contentValidCut;
        require(_cut + otherCuts < 10000, "Cuts cant be higher than %100");

        contentJurorCut = _cut;
        setcontentTotalCut();
    }

    /// @notice changes cut from content for validator pool
    /// @param _cut new cut (100000 -> 100% | 5000 -> 5%)
    function setcontentValidCut(uint _cut) external {
        require(
            roleManager.hasRole(GOVERNANCE_ROLE, msg.sender),
            "Only backend can set governance treasury address"
        );
        uint otherCuts = contentFoundCut + contentGoverCut + contentJurorCut;
        require(_cut + otherCuts < 10000, "Cuts cant be higher than %100");

        contentValidCut = _cut;
        setcontentTotalCut();
    }

    function setcontentTotalCut() internal {
        contentTotalCut = (contentFoundCut +
            contentGoverCut +
            contentJurorCut +
            contentValidCut);

        emit PlatformCutsUpdated(
            coachFoundCut,
            coachGoverCut,
            coachJurorCut,
            coachValidCut,
            contentFoundCut,
            contentGoverCut,
            contentJurorCut,
            contentValidCut
        );
    }
}
