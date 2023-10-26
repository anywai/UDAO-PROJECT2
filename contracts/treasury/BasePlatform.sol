// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

/// @title BasePlatform - PlatformTreasury
/// @author anywaiTR: Bugrahan Duran, Batuhan Darcin
/// @notice Contains key definitions for a platform treasury.
/// @dev This contract is inherited by ContentManager contract.

import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "../interfaces/IUDAOC.sol";
import "../interfaces/IGovernanceTreasury.sol";
import "../interfaces/IRoleManager.sol";
import "../interfaces/IVoucherVerifier.sol";

abstract contract BasePlatform is Pausable {
    bytes32 public constant BACKEND_ROLE = keccak256("BACKEND_ROLE");
    bytes32 public constant FOUNDATION_ROLE = keccak256("FOUNDATION_ROLE");
    bytes32 public constant GOVERNANCE_ROLE = keccak256("GOVERNANCE_ROLE");
    bytes32 public constant CONTRACT_MANAGER = keccak256("CONTRACT_MANAGER");

    /// @notice Role manager contract address
    IRoleManager roleManager;
    /// @notice UDAO (ERC20) Token is main token of the platform and used for payments
    IERC20 udao;
    /// @notice UDAOC (ERC721) Token is defines contents and used for content ownership
    IUDAOC udaoc;
    /// @notice VoucherVerifier contract is defines the vouchers of PlatformTreasury and used to verify vouchers
    IVoucherVerifier voucherVerifier;
    /// @notice GovernanceTreasury contract is platforms governance related funds treasury contract
    IGovernanceTreasury governanceTreasury;

    /// @notice Address of foundation wallet is used for sending funds to foundation
    address foundationWallet;

    /// @notice during refund windows all payments locked on contract and users can request refund
    /// @dev instLockedBalance and coaching/contentCutLockedPool arrays's size defines the maximum setable refund window
    uint256 public refundWindow = 14;

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
    /// @notice the date of the oldest locked payment in content/coaching CutLockedPool
    /// @dev platformLockTime initialized with deployment time
    uint public platformLockTime = (block.timestamp / 86400);

    /// @notice instructor address => instructor's refunded balance to users
    mapping(address => uint) public instRefundedBalance;
    /// @notice content cut pool's refunded cuts to users
    uint256 contentCutRefundedBalance;
    /// @notice coaching cut pool's refunded cuts to users
    uint256 coachingCutRefundedBalance;

    /// @notice instructor address => instructor's previous refund window for last sale
    mapping(address => uint) public prevInstRefundWindow;

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
    /// @param roleManagerAddress is address of RoleManager contract
    /// @param governanceTreasuryAddress is address of GovernanceTreasury contract
    /// @param voucherVerifierAddress is address of VoucherVerifier contract
    constructor(
        address roleManagerAddress,
        address udaoAddress,
        address udaocAddress,
        address governanceTreasuryAddress,
        address voucherVerifierAddress
    ) {
        roleManager = IRoleManager(roleManagerAddress);
        udao = IERC20(udaoAddress);
        udaoc = IUDAOC(udaocAddress);
        governanceTreasury = IGovernanceTreasury(governanceTreasuryAddress);
        voucherVerifier = IVoucherVerifier(voucherVerifierAddress);
    }

    /// @notice This event is triggered if the foundation wallet address is updated.
    event FoundationWalletUpdated(address newAddress);

    /// @notice This event is triggered if the contract manager updates the addresses.
    event AddressesUpdated(
        address UDAOAddress,
        address UDAOCAddress,
        address RoleManagerAddress,
        address GovernanceTreasuryAddress,
        address VoucherVerifierAddress
    );

    /// @notice This event is triggered if a cut is updated.
    event PlatformCutsUpdated();

    /// @notice sets foundation wallet addresses
    /// @param _newAddress new address of the contract
    function setFoundationAddress(address _newAddress) external {
        require(
            hasRole(BACKEND_ROLE, msg.sender),
            "Only backend can set contract address"
        );
        foundationWallet = _newAddress;
        emit FoundationWalletUpdated(_newAddress);
    }

    /// @notice Get the updated addresses from contract manager
    function updateAddresses(
        address udaoAddress,
        address udaocAddress,
        address roleManagerAddress,
        address governanceTreasuryAddress,
        address voucherVerifierAddress
    ) external {
        require(
            (hasRole(BACKEND_ROLE, msg.sender) ||
                hasRole(CONTRACT_MANAGER, msg.sender)),
            "Only backend and contract manager can update addresses"
        );
        udao = IERC20(udaoAddress);
        udaoc = IUDAOC(udaocAddress);
        roleManager = IRoleManager(roleManagerAddress);
        governanceTreasury = IGovernanceTreasury(governanceTreasuryAddress);
        voucherVerifier = IVoucherVerifier(voucherVerifierAddress);

        emit AddressesUpdated(
            udaoAddress,
            udaocAddress,
            roleManagerAddress,
            governanceTreasuryAddress,
            voucherVerifierAddress
        );
    }

    function hasRole(
        bytes32 _role,
        address _account
    ) internal view returns (bool) {
        return (roleManager.hasRole(_role, _account));
    }

    function isNotBanned(
        address _userAddress,
        uint _functionID
    ) internal view returns (bool) {
        return !roleManager.isBanned(_userAddress, _functionID);
    }

    function isKYCed(
        address _userAddress,
        uint _functionID
    ) internal view returns (bool) {
        return roleManager.isKYCed(_userAddress, _functionID);
    }

    function activateGovernanceTreasury(bool _boolean) external {
        require(
            hasRole(BACKEND_ROLE, msg.sender),
            "Only backend can activate governance treasury"
        );
        isGovernanceTreasuryOnline = _boolean;
    }

    /// @notice distribute the shares of foundation and governance/juror/validator pools from a platform's content sale revenue
    /// @param _revenue is the content sale revenue to be shared
    function _distributeContentCutShares(uint256 _revenue) internal {
        uint256 goverShare = ((_revenue * contentGoverCut) / contentTotalCut);
        uint256 jurorShare = ((_revenue * contentJurorCut) / contentTotalCut);
        uint256 validShare = ((_revenue * contentValidCut) / contentTotalCut);
        uint256 foundShare = _revenue - (goverShare + jurorShare + validShare);

        foundationBalance += foundShare;
        governanceBalance += goverShare;
        jurorBalance += jurorShare;
        validatorsBalance += validShare;
    }

    /// @notice distribute the shares of foundation and governance/juror/validator pools from a platform's coaching sale revenue
    /// @param _revenue is the coaching sale revenue to be shared
    function _distributeCoachingCutShares(uint256 _revenue) internal {
        uint256 goverShare = ((_revenue * coachGoverCut) / coachTotalCut);
        uint256 jurorShare = ((_revenue * coachJurorCut) / coachTotalCut);
        uint256 validShare = ((_revenue * coachValidCut) / coachTotalCut);
        uint256 foundShare = _revenue - (goverShare + jurorShare + validShare);

        foundationBalance += foundShare;
        governanceBalance += goverShare;
        jurorBalance += jurorShare;
        validatorsBalance += validShare;
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
        require(
            (hasRole(BACKEND_ROLE, msg.sender) ||
                hasRole(FOUNDATION_ROLE, msg.sender) ||
                hasRole(GOVERNANCE_ROLE, msg.sender)),
            "Only admins can set coach cuts"
        );
        uint newTotal = _coachFoundCut +
            _coachGoverCut +
            _coachJurorCut +
            _coachFoundCut;

        require(newTotal < 100000, "Cuts cant be higher than %100");

        coachFoundCut = _coachFoundCut;
        coachGoverCut = _coachGoverCut;
        coachJurorCut = _coachJurorCut;
        coachValidCut = _coachValidCut;

        coachTotalCut = newTotal;

        emit PlatformCutsUpdated();
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
        require(
            (hasRole(BACKEND_ROLE, msg.sender) ||
                hasRole(FOUNDATION_ROLE, msg.sender) ||
                hasRole(GOVERNANCE_ROLE, msg.sender)),
            "Only admins can set content cuts"
        );
        uint newTotal = _contentFoundCut +
            _contentGoverCut +
            _contentJurorCut +
            _contentFoundCut;
        require(newTotal < 100000, "Cuts cant be higher than %100");

        contentFoundCut = _contentFoundCut;
        contentGoverCut = _contentGoverCut;
        contentJurorCut = _contentJurorCut;
        contentValidCut = _contentValidCut;

        contentTotalCut = newTotal;

        emit PlatformCutsUpdated();
    }
}
