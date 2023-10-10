// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "../ContractManager.sol";
import "../interfaces/IUDAOC.sol";
import "../interfaces/IGovernanceTreasury.sol";
import "../interfaces/IRoleManager.sol";
import "../RoleNames.sol";
import "../interfaces/IVoucherVerifier.sol";

abstract contract BasePlatform is Pausable, RoleNames {

    IRoleManager roleManager;
    IVoucherVerifier voucherVerifier;
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
        voucherVerifier = IVoucherVerifier(
            contractManager.VoucherVerifierAddress()
        );

        emit AddressesUpdated(
            contractManager.UdaoAddress(),
            contractManager.UdaocAddress(),
            contractManager.ISupVisAddress(),
            contractManager.RmAddress(),
            contractManager.VoucherVerifierAddress()
        );
    }

    constructor(
        address _contractManager,
        address rmAddress,
        address _iGovernanceTreasuryAddress,
        address _voucherVerifierAddress
    ) {
        roleManager = IRoleManager(rmAddress);
        contractManager = ContractManager(_contractManager);
        udao = IERC20(contractManager.UdaoAddress());
        udaoc = IUDAOC(contractManager.UdaocAddress());
        iGovernanceTreasury = IGovernanceTreasury(_iGovernanceTreasuryAddress);
        voucherVerifier = IVoucherVerifier(_voucherVerifierAddress);
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
        address irm,
        address voucherVerifier
    );

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
    uint public coachValidCut = 0; //new!!ButNoUseArea
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

    function calculateTotalCutContentShares(
        uint256 _priceOf
    )
        public
        view
        returns (
            uint256 foundationShare,
            uint256 governanceShare,
            uint256 jurorShare,
            uint256 validatorShare
        )
    {
        foundationShare = ((_priceOf * contentFoundCut) / contentTotalCut);
        governanceShare = ((_priceOf * contentGoverCut) / contentTotalCut);
        jurorShare = ((_priceOf * contentJurorCut) / contentTotalCut);
        validatorShare = ((_priceOf * contentValidCut) / contentTotalCut);
    }

    function calculateTotalCutContentShare(
        uint256 _priceOf
    ) public view returns (uint256) {
        return ((_priceOf * contentTotalCut) / 100000);
    }

    function calculateTotalCutCoachingShares(
        uint256 _priceOf
    )
        public
        view
        returns (
            uint256 foundationShare,
            uint256 governanceShare,
            uint256 jurorShare,
            uint256 validatorShare
        )
    {
        foundationShare = ((_priceOf * coachFoundCut) / totalCutCoaching);
        governanceShare = ((_priceOf * coachGoverCut) / totalCutCoaching);
        jurorShare = ((_priceOf * coachJurorCut) / totalCutCoaching);
        validatorShare = ((_priceOf * coachValidCut) / totalCutCoaching);
    }

    function calculateTotalCutCoachingShare(
        uint256 _priceOf
    ) public view returns (uint256) {
        return ((_priceOf * totalCutCoaching) / 100000);
    }

    // SETTERS

    /// @notice sets the cut for foundation/governance/juror/validator for a coaching sale
    /// @param _coachFoundCut new cut for foundation
    /// @param _coachGoverCut new cut for governance
    /// @param _coachJurorCut new cut for juror pool
    /// @param _coachValidCut new cut for validator pool
    function setCoachCuts(
        uint256 _coachFoundCut,
        uint256 _coachGoverCut,
        uint256 _coachJurorCut,
        uint256 _coachValidCut
    ) external {
        uint newTotal = _coachFoundCut +
            _coachGoverCut +
            _coachJurorCut +
            _coachFoundCut;
        require(
            roleManager.hasRoles(administrator_roles, msg.sender),
            "Only admins can set coach cuts"
        );

        require(newTotal < 100000, "Cuts cant be higher than %100");

        coachFoundCut = _coachFoundCut;
        coachGoverCut = _coachGoverCut;
        coachJurorCut = _coachJurorCut;
        coachValidCut = _coachValidCut;

        totalCutCoaching = newTotal;

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

    /// @notice sets the cut for foundation/governance/juror/validator for a content sale
    /// @param _contentFoundCut new cut for foundation
    /// @param _contentGoverCut new cut for governance
    /// @param _contentJurorCut new cut for juror pool
    /// @param _contentValidCut new cut for validator pool
    function setContentCuts(
        uint256 _contentFoundCut,
        uint256 _contentGoverCut,
        uint256 _contentJurorCut,
        uint256 _contentValidCut
    ) external {
        uint newTotal = _contentFoundCut +
            _contentGoverCut +
            _contentJurorCut +
            _contentFoundCut;
        require(
            roleManager.hasRoles(administrator_roles, msg.sender),
            "Only admins can set content cuts"
        );

        require(newTotal < 100000, "Cuts cant be higher than %100");

        contentFoundCut = _contentFoundCut;
        contentGoverCut = _contentGoverCut;
        contentJurorCut = _contentJurorCut;
        contentValidCut = _contentValidCut;

        contentTotalCut = newTotal;

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
