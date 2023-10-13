// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

/// @title BasePlatform - PlatformTreasury
/// @author anywaiTR: Bugrahan Duran, Batuhan Darcin
/// @notice Contains key definitions for a platform treasury.
/// @dev This contract is inherited by ContentManager contract.

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
    /// @notice RoleManager contract is used to check roles of users and KYC/Ban status
    IRoleManager roleManager;
    /// @notice VoucherVerifier contract is defines the vouchers of PlatformTreasury and used to verify vouchers
    IVoucherVerifier voucherVerifier;
    /// @notice ContractManager contract is used to update contract addresses of project
    ContractManager public contractManager;
    /// @notice GovernanceTreasury contract is platforms governance related funds treasury contract
    IGovernanceTreasury public iGovernanceTreasury;

    /// @notice UDAO (ERC20) Token is main token of the platform and used for payments
    IERC20 udao;
    /// @notice UDAOC (ERC721) Token is defines contents and used for content ownership
    IUDAOC udaoc;

    /// @notice Address of governanceTreasury
    address governanceTreasury;
    /// @notice Address of foundation wallet
    address foundationWallet;

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

    /// @notice user address => (content id => (content part id => part owned/not owned by the user))
    mapping(address => mapping(uint => mapping(uint => bool))) isTokenBought;
    /// @notice during refund windows all payments locked on contract and users can request refund
    /// @dev instLockedBalance and coaching/contentCutLockedPool arrays's size defines the maximum setable refund window
    uint256 refundWindow = 14;
    /// @notice one day equals to 86400 second in epoch time
    uint256 epochOneDay = 86400;

    /// @notice instructor address => instructor's balance
    mapping(address => uint) public instBalance;
    /// @notice instructor address => instructor's locked balances
    mapping(address => uint[61]) public instLockedBalance;
    /// @notice content cut pool for content sales
    uint256 public contentCutPool;
    /// @notice content cut locked pool for content sales (locked revenues during refund window)
    uint256[61] public contentCutLockedPool;
    /// @notice coaching cut pool for coaching sales
    uint256 public coachingCutPool;
    /// @notice coaching cut locked pool for coaching sales (locked revenues during refund window)
    uint256[61] public coachingCutLockedPool;

    /// @notice foundation balance
    uint public foundationBalance;
    /// @notice governance pool balance
    uint public governanceBalance;
    /// @notice juror pool balance
    uint public jurorBalance;
    /// @notice validator pool balance
    uint public validatorsBalance;

    /// @notice instructor address => the date of the oldest locked payment of instructor.
    mapping(address => uint256) public instLockTime;
    /// @notice the date of the oldest locked payment in contentCutLockedPool
    uint public contentLockTime;
    /// @notice the date of the oldest locked payment in coachingCutLockedPool
    uint public coachingLockTime;

    /// @notice instructor address => instructor's refunded balance to users
    mapping(address => uint) public instRefundedBalance;
    /// @notice content cut pool's refunded cuts to users
    uint256 contentCutRefundedBalance;
    /// @notice coaching cut pool's refunded cuts to users
    uint256 coachingCutRefundedBalance;

    /// @notice The allocated cut for foundation from content sales
    /// @dev initiated as (4000/100000 = 4%)
    uint public contentFoundCut = 4000;
    /// @notice The allocated cut for governance pool from content sales
    /// @dev initiated as 0% and planned to be (700/100000 = 0.7%) after governance release
    uint public contentGoverCut = 0;
    /// @notice The allocated cut for juror pool from content sales
    /// @dev initiated as 0% and planned to be (100/100000 = 0.1%) after governance release
    uint public contentJurorCut = 0;
    /// @notice The allocated cut for validator pool from content sales
    /// @dev initiated as 0% and planned to be (200/100000 = 0.2%) after governance release
    uint public contentValidCut = 0;

    /// @notice The allocated cut for foundation from coaching sales
    /// @dev initiated as (4000/100000 = 4%)
    uint public coachFoundCut = 4000;
    /// @notice The allocated cut for governance pool from coaching sales
    /// @dev initiated as 0% and planned to be (700/100000 = 0.7%) after governance release
    uint public coachGoverCut = 0;
    /// @notice The allocated cut for juror pool from coaching sales
    /// @dev initiated as 0% and planned to be (100/100000 = 0.1%) after governance release
    uint public coachJurorCut = 0;
    /// @notice The allocated cut for validator pool from coaching sales
    /// @dev initiated as 0% and there is no use case
    uint public coachValidCut = 0;

    /// @notice allocated total cut for foundation, governance, juror and validator from content sales
    uint256 contentTotalCut =
        contentFoundCut + contentGoverCut + contentJurorCut + contentValidCut;
    /// @notice allocated total cut for foundation, governance, juror and validator from coaching sales
    uint256 coachTotalCut =
        coachFoundCut + coachGoverCut + coachJurorCut + coachValidCut;

    /// @notice is governance part of platform released
    bool isGovernanceTreasuryOnline = false;

    /// @notice constructor of BasePlatform
    /// @param _contractManager is address of ContractManager contract
    /// @param rmAddress is address of RoleManager contract
    /// @param _iGovernanceTreasuryAddress is address of GovernanceTreasury contract
    /// @param _voucherVerifierAddress is address of VoucherVerifier contract
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

    /// @notice distribute the shares of foundation and governance/juror/validator pools from a platform's content sale revenue
    /// @param _revenue is the content sale revenue to be shared
    function distributeContentCutShares(uint256 _revenue) internal {
        foundationBalance += ((_revenue * contentFoundCut) / contentTotalCut);
        governanceBalance += ((_revenue * contentGoverCut) / contentTotalCut);
        jurorBalance += ((_revenue * contentJurorCut) / contentTotalCut);
        validatorsBalance += ((_revenue * contentValidCut) / contentTotalCut);
    }

    /// @notice distribute the shares of foundation and governance/juror/validator pools from a platform's coaching sale revenue
    /// @param _revenue is the coaching sale revenue to be shared
    function distributeCoachingCutShares(uint256 _revenue) internal {
        foundationBalance += ((_revenue * coachFoundCut) / coachTotalCut);
        governanceBalance += ((_revenue * coachGoverCut) / coachTotalCut);
        jurorBalance += ((_revenue * coachJurorCut) / coachTotalCut);
        validatorsBalance += ((_revenue * coachValidCut) / coachTotalCut);
    }

    /// @notice calculates the total cut to be applied by the platform in a content purchase.
    /// @param _priceOf is the price of the content
    function calculateContentSaleTotalCut(
        uint256 _priceOf
    ) public view returns (uint256) {
        return ((_priceOf * contentTotalCut) / 100000);
    }

    /// @notice calculates the total cut to be applied by the platform in a coaching purchase.
    /// @param _priceOf is the price of the coaching
    function calculateCoachingSaleTotalCut(
        uint256 _priceOf
    ) public view returns (uint256) {
        return ((_priceOf * coachTotalCut) / 100000);
    }

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

        coachTotalCut = newTotal;

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
