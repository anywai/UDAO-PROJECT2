// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title NewTreasury - Voucher-gated course lifecycle, payments, refunds, and withdrawals
/// @notice Manages course create/update, purchases, refunds, and instructor withdrawals using EIP-712 vouchers.
/// @dev Uses EIP712, ECDSA, ReentrancyGuard, and SafeERC20. All amounts use 5-decimal basis points (100_000 = 100%).
///      Roles: foundation (owner) and backend signers. Backend signs vouchers; redeemer must match caller.

import "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

using SafeERC20 for IERC20;

/// @title Governance treasury hook
/// @notice Minimal interface to credit governance funds on withdrawals.
interface IGovernanceTreasury {
    /// @notice Credit collected governance share for a token.
    /// @param tokenAddress ERC20 token or zero for native.
    /// @param amount Amount to credit.
    function addGovernanceFunds(address tokenAddress, uint256 amount) external;
}

/// @notice Treasury implementation.
/// @dev EIP712 domain: SIGNING_DOMAIN/SIGNATURE_VERSION. Vouchers expire via `validUntil`.
contract NewTreasury is EIP712, ReentrancyGuard {
    /// @dev EIP712 domain name and version.
    string internal constant SIGNING_DOMAIN = "NewTreasuryVouchers";
    string internal constant SIGNATURE_VERSION = "1";

    /// @dev EIP712 typehashes for all voucher kinds.
    bytes32 internal constant CREATE_COURSE_VOUCHER_TYPEHASH =
        keccak256(
            "CreateCourseVoucher(string uri,address[] withdrawers,address redeemer,uint256 validUntil)"
        );
    bytes32 internal constant UPDATE_COURSE_VOUCHER_TYPEHASH =
        keccak256(
            "UpdateCourseVoucher(uint256 courseId,bool sellable,string uri,address[] withdrawers,address redeemer,uint256 validUntil)"
        );
    bytes32 internal constant BUY_COURSE_VOUCHER_TYPEHASH =
        keccak256(
            "BuyCourseVoucher(uint256 courseId,address tokenAddress,uint256 coursePrice,address courseReceiver,address redeemer,uint256 validUntil)"
        );
    bytes32 internal constant REFUND_COURSE_VOUCHER_TYPEHASH =
        keccak256(
            "RefundCourseVoucher(uint256 paymentId,address redeemer,uint256 validUntil)"
        );
    bytes32
        internal constant REFUND_COURSE_BY_OWNER_AND_COURSE_ID_VOUCHER_TYPEHASH =
        keccak256(
            "RefundCourseByOwnerAndCourseIdVoucher(address courseOwner,uint256 courseId,address redeemer,uint256 validUntil)"
        );
    bytes32 internal constant WITHDRAW_VOUCHER_TYPEHASH =
        keccak256(
            "WithdrawVoucher(uint256 courseId,uint256 fromIndex,uint256 toIndex,address redeemer,uint256 validUntil)"
        );

    /// @dev Hash of empty string to detect empty URIs.
    bytes32 internal constant EMPTY_URI_HASH = keccak256(bytes(""));

    // ---------------- Errors ----------------

    // Zero address
    error BackendAddressIsZero();
    error FoundationAddressIsZero();
    error UdaoTokenAddressIsZero();
    error GovernanceAddressIsZero();
    error WithdrawerAddressIsZero();

    // Auth / Role
    error CallerIsNotBackend();
    error CallerIsNotFoundation();
    error BackendRoleAlreadyAssigned();
    error BackendRoleAlreadyAbsent();

    // Generic
    error ChangeHasNoEffect();
    error ValueIsZero();
    error NonUdaoCutsSumExceeds100Percent();
    error UdaoCutsSumExceeds100Percent();

    // voucher
    error SignatureIsInvalid();
    error SignerIsNotBackend();
    error CallerIsNotVoucherRedeemer();
    error VoucherIsExpired();

    // create/update course
    error CreateBatchSizeExceedsLimit();
    error UriIsAlreadyUsedOrDuplicatedInBatch();
    error UriIsAlreadyUsed();
    error UriIsEmpty();
    error WithdrawerArrayIsEmpty();
    error WithdrawerArrayExceedsLimit();
    error WithdrawerArrayContainsDuplicates();
    error CallerIsNeitherWithdrawerNorBackend();

    // buy
    error BuyBatchSizeExceedsLimit();
    error CourseIdIsInvalid();
    error CourseIsNotSellable();
    error CourseIsAlreadyOwnedByReceiverOrDuplicatedInBatch();
    error CoursePriceIsZero();
    error NativeValueNotEqualToTotal();

    // refund
    error PaymentIdIsInvalid();
    error PaymentNotFoundForOwnerAndCourse();
    error PaymentIsAlreadyRefunded();
    error PaymentIsAlreadyWithdrawn();
    error RefundWindowHasPassed();
    error CourseIsNotOwnedByReceiver();
    error NativeRefundFailed();

    // withdraw
    error WithdrawBatchSizeExceedsLimit();
    error WithdrawIndexRangeIsInvalid();

    error CallerIsNotAuthorizedWithdrawer();
    error CallerIsNotThisContract();

    error NativeTransferToInstructorFailed();
    error NativeTransferToFoundationFailed();
    error NativeTransferToGovernanceFailed();

    // -------- ROLES AND AFFILIATIONS --------

    /// @notice Backend role mapping.
    mapping(address => bool) public hasBackendRole;

    /// @notice Foundation controller address.
    address public foundationAddress;

    /// @notice UDAO ERC20 token address.
    address public udaoTokenAddress;

    /// @notice Governance treasury contract or wallet.
    address public governanceAddress;

    /// @notice Emitted on backend role grant.
    /// @param backendAddress Address that received role.
    event BackendRoleGranted(address indexed backendAddress);

    /// @notice Emitted on backend role revoke.
    /// @param backendAddress Address that lost role.
    event BackendRoleRevoked(address indexed backendAddress);

    /// @notice Emitted when foundation address changes.
    /// @param newFoundationAddress New foundation.
    /// @param previousFoundationAddress Old foundation.
    event FoundationAddressUpdated(
        address indexed newFoundationAddress,
        address indexed previousFoundationAddress
    );

    /// @notice Emitted when UDAO token address changes.
    /// @param newUdaoTokenAddress New token.
    /// @param previousUdaoTokenAddress Old token.
    /// @param changedBy Caller.
    event UdaoTokenAddressUpdated(
        address indexed newUdaoTokenAddress,
        address indexed previousUdaoTokenAddress,
        address indexed changedBy
    );

    /// @notice Emitted when governance address changes.
    /// @param newGovernanceAddress New governance.
    /// @param previousGovernanceAddress Old governance.
    event GovernanceAddressUpdated(
        address indexed newGovernanceAddress,
        address indexed previousGovernanceAddress
    );

    /// @notice Grant backend signer role.
    /// @param _newAddress Account to grant.
    function grantBackendRole(address _newAddress) external {
        if (msg.sender != foundationAddress) revert CallerIsNotFoundation();
        if (_newAddress == address(0)) revert BackendAddressIsZero();
        if (hasBackendRole[_newAddress]) revert BackendRoleAlreadyAssigned();

        hasBackendRole[_newAddress] = true;
        emit BackendRoleGranted(_newAddress);
    }

    /// @notice Revoke backend signer role.
    /// @param _backendAddress Account to revoke.
    function revokeBackendRole(address _backendAddress) external {
        if (msg.sender != foundationAddress) revert CallerIsNotFoundation();
        if (_backendAddress == address(0)) revert BackendAddressIsZero();
        if (!hasBackendRole[_backendAddress]) revert BackendRoleAlreadyAbsent();

        hasBackendRole[_backendAddress] = false;

        emit BackendRoleRevoked(_backendAddress);
    }

    /// @notice Update foundation address. Only current foundation.
    /// @param newFoundation New foundation address.
    /// @dev Also transfers backend role to the new foundation.
    function setFoundationAddress(address newFoundation) external {
        address prevFoundation = foundationAddress;
        if (msg.sender != prevFoundation) revert CallerIsNotFoundation();
        if (newFoundation == address(0)) revert FoundationAddressIsZero();
        if (newFoundation == prevFoundation) revert ChangeHasNoEffect();

        foundationAddress = newFoundation;
        hasBackendRole[newFoundation] = true; // ensure new foundation wallet has the backend role
        hasBackendRole[prevFoundation] = false; // revoke backend role from old foundation address

        emit FoundationAddressUpdated(newFoundation, prevFoundation);
    }

    /// @notice Set UDAO token address.
    /// @param newUdaoToken ERC20 token address.
    function setUdaoTokenAddress(address newUdaoToken) external {
        if (!hasBackendRole[msg.sender]) revert CallerIsNotBackend();
        if (newUdaoToken == address(0)) revert UdaoTokenAddressIsZero();
        address prevUdaoToken = udaoTokenAddress;
        if (newUdaoToken == prevUdaoToken) revert ChangeHasNoEffect();

        udaoTokenAddress = newUdaoToken;
        emit UdaoTokenAddressUpdated(newUdaoToken, prevUdaoToken, msg.sender);
    }

    /// @notice Set governance address.
    /// @param newGovernance Governance wallet or contract.
    function setGovernanceAddress(address newGovernance) external {
        if (msg.sender != foundationAddress) revert CallerIsNotFoundation();
        if (newGovernance == address(0)) revert GovernanceAddressIsZero();
        address prevGovernance = governanceAddress;
        if (newGovernance == prevGovernance) revert ChangeHasNoEffect();

        governanceAddress = newGovernance;
        emit GovernanceAddressUpdated(newGovernance, prevGovernance);
    }

    // -------- BASE PAYMENT SETTINGS --------

    /// @notice Max allowed withdrawers for a course.
    uint256 public maxAllowedWithdrawers = 4;

    /// @notice Max courses per create batch.
    uint256 public maxBatchCreateSize = 10;

    /// @notice Max purchases per buy batch.
    uint256 public maxBatchBuySize = 10;

    /// @notice Max withdrawals processed per call.
    uint256 public maxBatchWithdrawSize = 10;

    /// @notice Foundation cut for non-UDAO, in 1e5 bps.
    uint32 public atFoundCut = 6000; // 6%

    /// @notice Governance cut for non-UDAO, in 1e5 bps.
    uint32 public atGoverCut = 1000; // 1%

    /// @notice Foundation cut for UDAO, in 1e5 bps.
    uint32 public utFoundCut = 4000; // 4%

    /// @notice Governance cut for UDAO, in 1e5 bps.
    uint32 public utGoverCut = 500; // 0.5%

    /// @notice Refund window duration in seconds.
    uint32 public refundWindow = 20 days;

    /// @notice Emitted when max withdrawers changes.
    event MaxAllowedWithdrawersUpdated(
        uint256 indexed newMaxAllowedWithdrawers,
        uint256 indexed previousMaxAllowedWithdrawers,
        address indexed changedBy
    );

    /// @notice Emitted when max batch create size changes.
    event MaxBatchCreateSizeUpdated(
        uint256 indexed newMaxBatchCreateSize,
        uint256 indexed previousMaxBatchCreateSize,
        address indexed changedBy
    );

    /// @notice Emitted when max batch buy size changes.
    event MaxBatchBuySizeUpdated(
        uint256 indexed newMaxBatchBuySize,
        uint256 indexed previousMaxBatchBuySize,
        address indexed changedBy
    );

    /// @notice Emitted when max batch withdraw size changes.
    event MaxBatchWithdrawSizeUpdated(
        uint256 indexed newMaxBatchWithdrawSize,
        uint256 indexed previousMaxBatchWithdrawSize,
        address indexed changedBy
    );

    /// @notice Emitted when refund window changes.
    event RefundWindowUpdated(
        uint32 indexed newRefundWindow,
        uint32 indexed previousRefundWindow,
        address indexed changedBy
    );

    /// @notice Emitted when fee cuts change.
    event CourseCutsUpdated(
        uint32 newAtFoundCut,
        uint32 newAtGoverCut,
        uint32 newUtFoundCut,
        uint32 newUtGoverCut,
        uint32 prevAtFoundCut,
        uint32 prevAtGoverCut,
        uint32 prevUtFoundCut,
        uint32 prevUtGoverCut,
        address indexed changedBy
    );

    /// @notice Set max withdrawers.
    /// @param newMax New cap.
    function setMaxAllowedWithdrawers(uint256 newMax) external {
        if (!hasBackendRole[msg.sender]) revert CallerIsNotBackend();
        if (newMax == 0) revert ValueIsZero();
        uint256 prevMax = maxAllowedWithdrawers;
        if (newMax == prevMax) revert ChangeHasNoEffect();

        maxAllowedWithdrawers = newMax;
        emit MaxAllowedWithdrawersUpdated(newMax, prevMax, msg.sender);
    }

    /// @notice Set max batch size for create.
    /// @param newMaxBatch New cap.
    function setMaxBatchCreateSize(uint256 newMaxBatch) external {
        if (!hasBackendRole[msg.sender]) revert CallerIsNotBackend();
        if (newMaxBatch == 0) revert ValueIsZero();
        uint256 prevMaxBatch = maxBatchCreateSize;
        if (newMaxBatch == prevMaxBatch) revert ChangeHasNoEffect();

        maxBatchCreateSize = newMaxBatch;
        emit MaxBatchCreateSizeUpdated(newMaxBatch, prevMaxBatch, msg.sender);
    }

    /// @notice Set max batch size for buy.
    /// @param newMaxBatch New cap.
    function setMaxBatchBuySize(uint256 newMaxBatch) external {
        if (!hasBackendRole[msg.sender]) revert CallerIsNotBackend();
        if (newMaxBatch == 0) revert ValueIsZero();
        uint256 prevMaxBatch = maxBatchBuySize;
        if (newMaxBatch == prevMaxBatch) revert ChangeHasNoEffect();

        maxBatchBuySize = newMaxBatch;
        emit MaxBatchBuySizeUpdated(newMaxBatch, prevMaxBatch, msg.sender);
    }

    /// @notice Set max batch size for withdrawals.
    /// @param newMaxBatch New cap.
    function setMaxBatchWithdrawSize(uint256 newMaxBatch) external {
        if (!hasBackendRole[msg.sender]) revert CallerIsNotBackend();
        if (newMaxBatch == 0) revert ValueIsZero();
        uint256 prevMaxBatch = maxBatchWithdrawSize;
        if (newMaxBatch == prevMaxBatch) revert ChangeHasNoEffect();

        maxBatchWithdrawSize = newMaxBatch;
        emit MaxBatchWithdrawSizeUpdated(newMaxBatch, prevMaxBatch, msg.sender);
    }

    /// @notice Set refund window.
    /// @param newWindow New duration in seconds.
    function setRefundWindow(uint32 newWindow) external {
        if (!hasBackendRole[msg.sender]) revert CallerIsNotBackend();
        uint32 prevWindow = refundWindow;
        if (newWindow == prevWindow) revert ChangeHasNoEffect();

        refundWindow = newWindow;
        emit RefundWindowUpdated(newWindow, prevWindow, msg.sender);
    }

    /// @notice Set fee cuts for UDAO and non-UDAO.
    /// @param _atFoundCut Foundation cut (any token).
    /// @param _atGoverCut Governance cut (any token).
    /// @param _utFoundCut Foundation cut (UDAO).
    /// @param _utGoverCut Governance cut (UDAO).
    /// @dev All inputs are in 1e5 bps. Sums must be < 100_000.
    function setCourseCuts(
        uint32 _atFoundCut,
        uint32 _atGoverCut,
        uint32 _utFoundCut,
        uint32 _utGoverCut
    ) external {
        if (!hasBackendRole[msg.sender]) revert CallerIsNotBackend();
        if (_atFoundCut + _atGoverCut >= 100_000)
            revert NonUdaoCutsSumExceeds100Percent();
        if (_utFoundCut + _utGoverCut >= 100_000)
            revert UdaoCutsSumExceeds100Percent();

        uint32 prevAtF = atFoundCut;
        uint32 prevAtG = atGoverCut;
        uint32 prevUtF = utFoundCut;
        uint32 prevUtG = utGoverCut;
        if (
            _atFoundCut == prevAtF &&
            _atGoverCut == prevAtG &&
            _utFoundCut == prevUtF &&
            _utGoverCut == prevUtG
        ) revert ChangeHasNoEffect();

        atFoundCut = _atFoundCut;
        atGoverCut = _atGoverCut;
        utFoundCut = _utFoundCut;
        utGoverCut = _utGoverCut;

        emit CourseCutsUpdated(
            _atFoundCut,
            _atGoverCut,
            _utFoundCut,
            _utGoverCut,
            prevAtF,
            prevAtG,
            prevUtF,
            prevUtG,
            msg.sender
        );
    }

    /// @notice Deploy treasury.
    /// @param _foundationAddress Foundation controller.
    /// @param _udaoTokenAddress UDAO ERC20.
    /// @param _governanceContract Governance wallet/contract.
    /// @dev Deployer also receives backend role if not foundation.
    constructor(
        address _foundationAddress,
        address _udaoTokenAddress,
        address _governanceContract
    ) EIP712(SIGNING_DOMAIN, SIGNATURE_VERSION) {
        if (_foundationAddress == address(0)) revert FoundationAddressIsZero();
        if (_udaoTokenAddress == address(0)) revert UdaoTokenAddressIsZero();
        if (_governanceContract == address(0)) revert GovernanceAddressIsZero();

        foundationAddress = _foundationAddress;
        governanceAddress = _governanceContract;
        udaoTokenAddress = _udaoTokenAddress;

        hasBackendRole[_foundationAddress] = true;
        if (msg.sender != _foundationAddress) {
            hasBackendRole[msg.sender] = true;
        }
    }

    // -------- COURSE CREATION & UPDATES --------

    /// @notice Course data.
    struct Course {
        /// @notice Off-chain metadata URI.
        string uri;
        /// @notice True if purchasable.
        bool sellable;
    }

    /// @notice Incremental course id counter.
    /// @dev Starts from 1. Zero means non-existent course.
    uint256 public courseCounter;

    /// @notice Course id to data.
    mapping(uint256 => Course) public courses;

    /// @notice Authorized withdrawers per course.
    mapping(uint256 => address[]) public authorizedWithdrawers;

    /// @notice Quick lookup of withdrawer auth.
    mapping(address => mapping(uint256 => bool)) public isAuthorizedWithdrawer;

    /// @notice URI hash to course id. Zero means unused.
    mapping(bytes32 => uint256) public uriToCourseId;

    /// @notice Emitted on course creation.
    /// @param courseId New course id.
    /// @param uriHash keccak256(uri).
    /// @param createdBy Caller who redeemed voucher.
    event CourseCreated(
        uint256 indexed courseId,
        bytes32 indexed uriHash,
        address createdBy
    );

    /// @notice Voucher to create a course.
    /// @param uri Metadata URI.
    /// @param withdrawers Withdraw-authorized addresses.
    /// @param redeemer Must equal caller.
    /// @param validUntil Expiry timestamp.
    /// @param signature Backend EIP712 signature.
    struct CreateCourseVoucher {
        string uri;
        address[] withdrawers;
        address redeemer;
        uint256 validUntil;
        bytes signature;
    }

    /// @notice Dry-run validation for a batch of create vouchers.
    /// @param vouchers Batched vouchers.
    /// @return success True if all pass.
    /// @return failedIndex First failing index if any.
    /// @return reason Stringified error selector-like text.
    function previewCreateCourseBatch(
        CreateCourseVoucher[] calldata vouchers
    )
        external
        view
        returns (bool success, uint256 failedIndex, string memory reason)
    {
        if (vouchers.length > maxBatchCreateSize)
            return (false, 0, "CreateBatchSizeExceedsLimit()");
        bytes32[] memory uriHashes = new bytes32[](vouchers.length);

        for (uint256 i = 0; i < vouchers.length; i++) {
            CreateCourseVoucher calldata voucher = vouchers[i];
            bytes32 uriHash = keccak256(bytes(voucher.uri));
            if (uriHash == EMPTY_URI_HASH) return (false, i, "UriIsEmpty()");
            if (uriToCourseId[uriHash] != 0)
                return (false, i, "UriIsAlreadyUsedOrDuplicatedInBatch()");
            for (uint256 k = 0; k < i; k++) {
                if (uriHashes[k] == uriHash)
                    return (false, i, "UriIsAlreadyUsedOrDuplicatedInBatch()");
            }
            uriHashes[i] = uriHash;

            address[] calldata withdrawers = voucher.withdrawers;
            uint256 lenW = withdrawers.length;
            if (lenW == 0) return (false, i, "WithdrawerArrayIsEmpty()");
            if (lenW > maxAllowedWithdrawers)
                return (false, i, "WithdrawerArrayExceedsLimit()");

            if (voucher.redeemer != msg.sender)
                return (false, i, "CallerIsNotVoucherRedeemer()");
            if (voucher.validUntil < block.timestamp)
                return (false, i, "VoucherIsExpired()");
            (address signer, ECDSA.RecoverError err, ) = ECDSA.tryRecover(
                _hashTypedDataV4(
                    keccak256(
                        abi.encode(
                            CREATE_COURSE_VOUCHER_TYPEHASH,
                            uriHash,
                            keccak256(abi.encodePacked(withdrawers)),
                            voucher.redeemer,
                            voucher.validUntil
                        )
                    )
                ),
                voucher.signature
            );
            if (uint256(err) != 0) return (false, i, "SignatureIsInvalid()");
            if (!hasBackendRole[signer])
                return (false, i, "SignerIsNotBackend()");

            bool found = false;
            for (uint256 j = 0; j < lenW; j++) {
                address w = withdrawers[j];
                if (w == address(0))
                    return (false, i, "WithdrawerAddressIsZero()");
                if (w == msg.sender) {
                    found = true;
                }
                for (uint256 k = 0; k < j; k++) {
                    if (withdrawers[k] == w)
                        return (
                            false,
                            i,
                            "WithdrawerArrayContainsDuplicates()"
                        );
                }
            }
            if (!hasBackendRole[msg.sender]) {
                if (!found)
                    return (false, i, "CallerIsNeitherWithdrawerNorBackend()");
            }
        }
        return (true, 0, "");
    }

    /// @notice Create courses from vouchers.
    /// @param vouchers Batched create vouchers.
    /// @dev Enforces unique URI and authorized withdrawers. Caller must be voucher.redeemer.
    function createCourseBatch(
        CreateCourseVoucher[] calldata vouchers
    ) external {
        uint256 len = vouchers.length;
        if (len > maxBatchCreateSize) revert CreateBatchSizeExceedsLimit();
        uint256 maxW = maxAllowedWithdrawers;
        bool isCallerBackend = hasBackendRole[msg.sender];
        for (uint256 i = 0; i < len; ) {
            CreateCourseVoucher calldata voucher = vouchers[i];
            bytes32 uriHash = keccak256(bytes(voucher.uri));
            if (uriHash == EMPTY_URI_HASH) revert UriIsEmpty();
            if (uriToCourseId[uriHash] != 0)
                revert UriIsAlreadyUsedOrDuplicatedInBatch();
            address[] memory withdrawers = voucher.withdrawers;
            uint256 lenW = withdrawers.length;
            if (lenW == 0) revert WithdrawerArrayIsEmpty();
            if (lenW > maxW) revert WithdrawerArrayExceedsLimit();
            bytes32 wHash;
            assembly {
                wHash := keccak256(add(withdrawers, 0x20), mul(lenW, 0x20))
            }
            address redeemer = voucher.redeemer;
            if (redeemer != msg.sender) revert CallerIsNotVoucherRedeemer();
            uint256 validUntil = voucher.validUntil;
            if (validUntil < block.timestamp) revert VoucherIsExpired();
            (address signer, ECDSA.RecoverError err, ) = ECDSA.tryRecover(
                _hashTypedDataV4(
                    keccak256(
                        abi.encode(
                            CREATE_COURSE_VOUCHER_TYPEHASH,
                            uriHash,
                            wHash,
                            redeemer,
                            validUntil
                        )
                    )
                ),
                voucher.signature
            );
            if (uint256(err) != 0) revert SignatureIsInvalid();
            if (!hasBackendRole[signer]) revert SignerIsNotBackend();

            uint256 newCourseId;
            unchecked {
                newCourseId = ++courseCounter;
            }

            address[] storage aw = authorizedWithdrawers[newCourseId];
            uint256 base;
            assembly {
                sstore(aw.slot, lenW)
                mstore(0x00, aw.slot)
                base := keccak256(0x00, 0x20)
            }
            for (uint256 j = 0; j < lenW; ) {
                address w = withdrawers[j];
                if (w == address(0)) revert WithdrawerAddressIsZero();
                if (isAuthorizedWithdrawer[w][newCourseId])
                    revert WithdrawerArrayContainsDuplicates();
                isAuthorizedWithdrawer[w][newCourseId] = true;
                assembly {
                    sstore(add(base, j), w)
                }
                unchecked {
                    j++;
                }
            }
            if (!isCallerBackend) {
                if (!isAuthorizedWithdrawer[msg.sender][newCourseId])
                    revert CallerIsNeitherWithdrawerNorBackend();
            }
            uriToCourseId[uriHash] = newCourseId;
            courses[newCourseId] = Course({uri: voucher.uri, sellable: true});
            emit CourseCreated(newCourseId, uriHash, msg.sender);
            unchecked {
                i++;
            }
        }
    }

    /// @notice Emitted when course URI hash changes.
    event CourseUriUpdated(
        uint256 indexed courseId,
        bytes32 indexed newUriHash,
        bytes32 indexed oldUriHash
    );

    /// @notice Emitted on course updates.
    /// @param courseId Course id.
    /// @param sellable New sellable flag.
    /// @param uriChanged True if URI updated.
    /// @param updatedBy Caller.
    event CourseUpdated(
        uint256 indexed courseId,
        bool sellable,
        bool uriChanged,
        address indexed updatedBy
    );

    /// @notice Voucher to update a course.
    /// @dev Empty `uri` or `withdrawers` means no change for that field.
    struct UpdateCourseVoucher {
        uint256 courseId;
        bool sellable;
        string uri;
        address[] withdrawers;
        address redeemer;
        uint256 validUntil;
        bytes signature;
    }

    /// @notice Update course metadata, sellable flag, and withdrawers via voucher.
    /// @param voucher Signed update voucher.
    function updateCourse(UpdateCourseVoucher calldata voucher) external {
        uint256 courseId = voucher.courseId;
        if (courseId == 0 || courseId > courseCounter)
            revert CourseIdIsInvalid();

        address[] memory withdrawers = voucher.withdrawers;
        uint256 lenW = withdrawers.length;
        if (lenW > maxAllowedWithdrawers) revert WithdrawerArrayExceedsLimit();

        bytes32 newUriHash = keccak256(bytes(voucher.uri));
        bool updateUri = false;
        if (newUriHash != EMPTY_URI_HASH) {
            uint256 hashToId = uriToCourseId[newUriHash];
            if (hashToId == 0) {
                updateUri = true;
            } else if (hashToId != courseId) {
                revert UriIsAlreadyUsed();
            }
        }
        bool sellable = voucher.sellable;
        {
            bytes32 wHash;
            assembly {
                wHash := keccak256(add(withdrawers, 0x20), mul(lenW, 0x20))
            }
            address redeemer = voucher.redeemer;
            if (redeemer != msg.sender) revert CallerIsNotVoucherRedeemer();
            uint256 validUntil = voucher.validUntil;
            if (validUntil < block.timestamp) revert VoucherIsExpired();
            (address signer, ECDSA.RecoverError err, ) = ECDSA.tryRecover(
                _hashTypedDataV4(
                    keccak256(
                        abi.encode(
                            UPDATE_COURSE_VOUCHER_TYPEHASH,
                            courseId,
                            sellable,
                            newUriHash,
                            wHash,
                            redeemer,
                            validUntil
                        )
                    )
                ),
                voucher.signature
            );
            if (uint256(err) != 0) revert SignatureIsInvalid();
            if (!hasBackendRole[signer]) revert SignerIsNotBackend();
        }

        if (lenW != 0) {
            address[] storage aw = authorizedWithdrawers[courseId];
            uint256 lenPW = aw.length;
            for (uint256 i = 0; i < lenPW; ) {
                isAuthorizedWithdrawer[aw[i]][courseId] = false;
                unchecked {
                    i++;
                }
            }
            uint256 base;
            assembly {
                sstore(aw.slot, lenW)
                mstore(0x00, aw.slot)
                base := keccak256(0x00, 0x20)
            }
            for (uint256 i = 0; i < lenW; ) {
                address w = withdrawers[i];
                if (w == address(0)) revert WithdrawerAddressIsZero();
                if (isAuthorizedWithdrawer[w][courseId])
                    revert WithdrawerArrayContainsDuplicates();
                isAuthorizedWithdrawer[w][courseId] = true;
                assembly {
                    sstore(add(base, i), w)
                }
                unchecked {
                    i++;
                }
            }
        }

        if (!hasBackendRole[msg.sender]) {
            if (!isAuthorizedWithdrawer[msg.sender][courseId])
                revert CallerIsNeitherWithdrawerNorBackend();
        }

        Course storage courseExisting = courses[courseId];
        if (updateUri) {
            bytes32 oldUriHash = keccak256(bytes(courseExisting.uri));
            delete uriToCourseId[oldUriHash];
            uriToCourseId[newUriHash] = courseId;
            courseExisting.uri = voucher.uri;
            emit CourseUriUpdated(courseId, newUriHash, oldUriHash);
        }
        courseExisting.sellable = sellable;

        emit CourseUpdated(courseId, sellable, updateUri, msg.sender);
    }

    // -------- PAYMENTS --------

    /// @notice Payment id counter.
    /// @dev Starts from 1. Zero means non-existent payment.
    uint256 public paymentCounter;

    /// @notice Payments by id.
    mapping(uint256 => Payment) public payments;

    /// @notice Per-course sale counters.
    /// @dev Zero is never used as a sale index.
    mapping(uint256 => uint256) public saleCounterPerCourse;

    /// @notice courseId => saleIndex => paymentId.
    mapping(uint256 => mapping(uint256 => uint256)) public courseSaleRecords;

    /// @notice Owned course list per user. Index 0 is sentinel 0 when non-empty.
    mapping(address => uint256[]) public ownedCourses;

    /// @notice Index of a course id in a user's ownedCourses.
    mapping(address => mapping(uint256 => uint256)) public ownedCourseIndex;

    /// @notice Fast ownership flag.
    mapping(address => mapping(uint256 => bool)) public hasOwnedCourse;

    /// @notice courseOwner => courseId => paymentId.
    mapping(address => mapping(uint256 => uint256)) public courseOwnerToPayment;

    /// @notice Locked balances by token to protect refunds and pending withdrawals.
    mapping(address => uint256) public locked;

    /// @notice Payment record.
    struct Payment {
        uint256 courseId;
        address payer;
        address courseReceiver;
        address tokenAddress; // 0x0 for native
        uint256 totalAmount;
        uint256 instructorShare;
        uint256 foundationShare;
        uint256 governanceShare;
        uint256 endOfRefundWindow;
        bool isRefunded;
        bool isWithdrawn;
    }

    /// @notice Emitted on successful purchase.
    event ContentPurchased(
        uint256 indexed paymentId,
        uint256 indexed courseId,
        address indexed contentReceiver,
        address payer,
        address tokenAddress,
        uint256 receivedCoursePrice
    );

    /// @notice Voucher to buy a course.
    struct BuyCourseVoucher {
        uint256 courseId;
        address tokenAddress;
        uint256 coursePrice;
        address courseReceiver;
        address redeemer;
        uint256 validUntil;
        bytes signature;
    }

    /// @notice Dry-run validation for a batch of buy vouchers.
    /// @param vouchers Batched vouchers.
    /// @return success True if all pass.
    /// @return failedIndex First failing index if any.
    /// @return reason Stringified error.
    function previewBuyCourseBatch(
        BuyCourseVoucher[] calldata vouchers
    )
        external
        view
        returns (bool success, uint256 failedIndex, string memory reason)
    {
        if (vouchers.length > maxBatchBuySize)
            return (false, 0, "BuyBatchSizeExceedsLimit()");
        bytes32[] memory seen = new bytes32[](vouchers.length);
        uint256 seenLen = 0;
        for (uint256 i = 0; i < vouchers.length; i++) {
            BuyCourseVoucher calldata voucher = vouchers[i];
            address receiver = voucher.courseReceiver;
            uint256 courseId = voucher.courseId;

            if (courseId == 0 || courseId > courseCounter)
                return (false, i, "CourseIdIsInvalid()");
            if (!courses[courseId].sellable)
                return (false, i, "CourseIsNotSellable()");
            if (voucher.coursePrice == 0)
                return (false, i, "CoursePriceIsZero()");

            if (hasOwnedCourse[receiver][courseId])
                return (
                    false,
                    i,
                    "CourseIsAlreadyOwnedByReceiverOrDuplicatedInBatch()"
                );

            bytes32 key = keccak256(abi.encodePacked(receiver, courseId));
            for (uint256 j = 0; j < seenLen; j++) {
                if (seen[j] == key)
                    return (
                        false,
                        i,
                        "CourseIsAlreadyOwnedByReceiverOrDuplicatedInBatch()"
                    );
            }
            seen[seenLen++] = key;

            if (voucher.redeemer != msg.sender)
                return (false, i, "CallerIsNotVoucherRedeemer()");
            if (voucher.validUntil < block.timestamp)
                return (false, i, "VoucherIsExpired()");

            (address signer, ECDSA.RecoverError err, ) = ECDSA.tryRecover(
                _hashTypedDataV4(
                    keccak256(
                        abi.encode(
                            BUY_COURSE_VOUCHER_TYPEHASH,
                            courseId,
                            voucher.tokenAddress,
                            voucher.coursePrice,
                            receiver,
                            voucher.redeemer,
                            voucher.validUntil
                        )
                    )
                ),
                voucher.signature
            );
            if (uint256(err) != 0) return (false, i, "SignatureIsInvalid()");
            if (!hasBackendRole[signer])
                return (false, i, "SignerIsNotBackend()");
        }
        return (true, 0, "");
    }

    /// @notice Buy courses from vouchers.
    /// @param vouchers Batched buy vouchers.
    /// @dev msg.value must equal the sum of native-priced vouchers. ERC20s are pulled via transferFrom.
    function buyCourseBatch(
        BuyCourseVoucher[] calldata vouchers
    ) external payable nonReentrant {
        uint256 len = vouchers.length;
        if (len > maxBatchBuySize) revert BuyBatchSizeExceedsLimit();
        uint256 totalNativeRequired = 0;
        uint256[] memory gotAmounts = new uint256[](len);
        address lastTok = address(0);
        uint256 lastBal = 0;

        for (uint256 i = 0; i < len; ) {
            BuyCourseVoucher calldata voucher = vouchers[i];
            uint256 courseId = voucher.courseId;
            if (courseId == 0 || courseId > courseCounter)
                revert CourseIdIsInvalid();
            if (!courses[courseId].sellable) revert CourseIsNotSellable();
            uint256 coursePrice = voucher.coursePrice;
            if (coursePrice == 0) revert CoursePriceIsZero();
            address courseReceiver = voucher.courseReceiver;
            if (hasOwnedCourse[courseReceiver][courseId]) {
                revert CourseIsAlreadyOwnedByReceiverOrDuplicatedInBatch();
            }
            address tokenAddress = voucher.tokenAddress;
            address redeemer = voucher.redeemer;
            if (redeemer != msg.sender) revert CallerIsNotVoucherRedeemer();
            uint256 validUntil = voucher.validUntil;
            if (validUntil < block.timestamp) revert VoucherIsExpired();
            (address signer, ECDSA.RecoverError err, ) = ECDSA.tryRecover(
                _hashTypedDataV4(
                    keccak256(
                        abi.encode(
                            BUY_COURSE_VOUCHER_TYPEHASH,
                            courseId,
                            tokenAddress,
                            coursePrice,
                            courseReceiver,
                            redeemer,
                            validUntil
                        )
                    )
                ),
                voucher.signature
            );
            if (uint256(err) != 0) revert SignatureIsInvalid();
            if (!hasBackendRole[signer]) revert SignerIsNotBackend();

            if (tokenAddress == address(0)) {
                totalNativeRequired += coursePrice;
                gotAmounts[i] = coursePrice;
                lastTok = address(0);
            } else {
                uint256 beforeBal = (tokenAddress == lastTok)
                    ? lastBal
                    : IERC20(tokenAddress).balanceOf(address(this));
                IERC20(tokenAddress).safeTransferFrom(
                    msg.sender,
                    address(this),
                    coursePrice
                );
                lastBal = IERC20(tokenAddress).balanceOf(address(this));
                gotAmounts[i] = lastBal - beforeBal;
                lastTok = tokenAddress;
            }

            hasOwnedCourse[courseReceiver][courseId] = true;
            unchecked {
                i++;
            }
        }

        if (msg.value != totalNativeRequired)
            revert NativeValueNotEqualToTotal();

        address _udao = udaoTokenAddress;
        uint32 _atF = atFoundCut;
        uint32 _atG = atGoverCut;
        uint32 _utF = utFoundCut;
        uint32 _utG = utGoverCut;
        uint32 _rw = refundWindow;

        for (uint256 i = 0; i < len; ) {
            BuyCourseVoucher calldata voucher = vouchers[i];
            uint256 courseId = voucher.courseId;
            address tokenAddress = voucher.tokenAddress;
            uint256 receivedCoursePrice = gotAmounts[i];
            address courseReceiver = voucher.courseReceiver;

            locked[tokenAddress] += receivedCoursePrice;

            bool isUdao = (tokenAddress == _udao);
            uint256 foundShare = (receivedCoursePrice *
                (isUdao ? _utF : _atF)) / 100_000;
            uint256 goverShare = (receivedCoursePrice *
                (isUdao ? _utG : _atG)) / 100_000;

            uint256 newPaymentId;
            unchecked {
                newPaymentId = ++paymentCounter;
            }

            payments[newPaymentId] = Payment({
                courseId: courseId,
                payer: msg.sender,
                courseReceiver: courseReceiver,
                tokenAddress: tokenAddress,
                totalAmount: receivedCoursePrice,
                instructorShare: receivedCoursePrice - foundShare - goverShare,
                foundationShare: foundShare,
                governanceShare: goverShare,
                endOfRefundWindow: block.timestamp + _rw,
                isRefunded: false,
                isWithdrawn: false
            });

            courseOwnerToPayment[courseReceiver][courseId] = newPaymentId;

            unchecked {
                saleCounterPerCourse[courseId]++;
            }
            courseSaleRecords[courseId][
                saleCounterPerCourse[courseId]
            ] = newPaymentId;

            uint256 lenOwned = ownedCourses[courseReceiver].length;
            if (lenOwned == 0) {
                ownedCourses[courseReceiver].push(0);
                lenOwned = 1; /// @note Zero index always holds 0
            }
            ownedCourses[courseReceiver].push(courseId);
            ownedCourseIndex[courseReceiver][courseId] = lenOwned;

            emit ContentPurchased(
                newPaymentId,
                courseId,
                courseReceiver,
                msg.sender,
                tokenAddress,
                receivedCoursePrice
            );
            unchecked {
                ++i;
            }
        }
    }

    // -------- REFUNDS --------

    /// @notice Emitted on refund.
    event CourseRefunded(
        uint256 indexed paymentId,
        uint256 indexed courseId,
        address indexed courseReceiver,
        address refundedTo,
        address tokenAddress,
        uint256 refundedAmount
    );

    /// @notice Voucher to refund by payment id.
    struct RefundCourseVoucher {
        uint256 paymentId;
        address redeemer;
        uint256 validUntil;
        bytes signature;
    }

    /// @notice Refund a payment by id via voucher.
    /// @param voucher Signed refund voucher.
    function refundCourse(
        RefundCourseVoucher calldata voucher
    ) external nonReentrant {
        uint256 paymentId = voucher.paymentId;
        if (paymentId == 0 || paymentId > paymentCounter)
            revert PaymentIdIsInvalid();
        address redeemer = voucher.redeemer;
        if (redeemer != msg.sender) revert CallerIsNotVoucherRedeemer();
        uint256 validUntil = voucher.validUntil;
        if (validUntil < block.timestamp) revert VoucherIsExpired();
        (address signer, ECDSA.RecoverError err, ) = ECDSA.tryRecover(
            _hashTypedDataV4(
                keccak256(
                    abi.encode(
                        REFUND_COURSE_VOUCHER_TYPEHASH,
                        paymentId,
                        redeemer,
                        validUntil
                    )
                )
            ),
            voucher.signature
        );
        if (uint256(err) != 0) revert SignatureIsInvalid();
        if (!hasBackendRole[signer]) revert SignerIsNotBackend();

        _refundCourse(paymentId);
    }

    /// @notice Voucher to refund by owner+course.
    struct RefundCourseByOwnerAndCourseIdVoucher {
        address courseOwner;
        uint256 courseId;
        address redeemer;
        uint256 validUntil;
        bytes signature;
    }

    /// @notice Refund using owner and course id.
    /// @param voucher Signed refund voucher.
    function refundCourseByOwnerAndCourseId(
        RefundCourseByOwnerAndCourseIdVoucher calldata voucher
    ) external nonReentrant {
        address courseOwner = voucher.courseOwner;
        uint256 courseId = voucher.courseId;

        uint256 paymentId = courseOwnerToPayment[courseOwner][courseId];
        if (paymentId == 0) revert PaymentNotFoundForOwnerAndCourse();

        address redeemer = voucher.redeemer;
        if (redeemer != msg.sender) revert CallerIsNotVoucherRedeemer();

        uint256 validUntil = voucher.validUntil;
        if (validUntil < block.timestamp) revert VoucherIsExpired();
        (address signer, ECDSA.RecoverError err, ) = ECDSA.tryRecover(
            _hashTypedDataV4(
                keccak256(
                    abi.encode(
                        REFUND_COURSE_BY_OWNER_AND_COURSE_ID_VOUCHER_TYPEHASH,
                        courseOwner,
                        courseId,
                        redeemer,
                        validUntil
                    )
                )
            ),
            voucher.signature
        );
        if (uint256(err) != 0) revert SignatureIsInvalid();
        if (!hasBackendRole[signer]) revert SignerIsNotBackend();

        _refundCourse(paymentId);
    }

    /// @notice Internal refund handler. Reverts on invalid state.
    /// @param _paymentId Payment id.
    /// @dev Updates ownership sets, transfers funds back to payer, and reduces locked balance.
    function _refundCourse(uint256 _paymentId) internal {
        Payment storage payment = payments[_paymentId];

        if (payment.isRefunded) revert PaymentIsAlreadyRefunded();
        if (payment.isWithdrawn) revert PaymentIsAlreadyWithdrawn();
        if (payment.endOfRefundWindow < block.timestamp)
            revert RefundWindowHasPassed();

        address _receiver = payment.courseReceiver;
        uint256 _courseId = payment.courseId;

        uint256[] storage oc = ownedCourses[_receiver];
        mapping(uint256 => uint256) storage oi = ownedCourseIndex[_receiver];
        uint256 courseIndex = oi[_courseId];
        if (courseIndex == 0) revert CourseIsNotOwnedByReceiver();

        payment.isRefunded = true;

        unchecked {
            uint256 lastIndex = oc.length - 1;
            if (courseIndex != lastIndex) {
                uint256 lastCourseId = oc[lastIndex];
                oc[courseIndex] = lastCourseId;
                oi[lastCourseId] = courseIndex;
            }
        }
        oc.pop();
        delete oi[_courseId];
        delete courseOwnerToPayment[_receiver][_courseId];
        hasOwnedCourse[_receiver][_courseId] = false;

        address _payer = payment.payer;
        address _tokenAddress = payment.tokenAddress;
        uint256 _totalAmount = payment.totalAmount;

        if (_tokenAddress == address(0)) {
            (bool isSent, ) = payable(_payer).call{value: _totalAmount}("");
            if (!isSent) revert NativeRefundFailed();
        } else {
            IERC20(_tokenAddress).safeTransfer(_payer, _totalAmount);
        }

        locked[_tokenAddress] -= _totalAmount;

        emit CourseRefunded(
            _paymentId,
            _courseId,
            _receiver,
            _payer,
            _tokenAddress,
            _totalAmount
        );
    }

    // -------- WITHDRAWALS --------

    /// @notice Voucher to withdraw a range of matured sales for a course.
    struct WithdrawVoucher {
        uint256 courseId;
        uint256 fromIndex; // inclusive
        uint256 toIndex; // inclusive
        address redeemer; // must be authorized withdrawer and caller
        uint256 validUntil;
        bytes signature;
    }

    /// @notice Withdraw matured payments for a course.
    /// @param voucher Signed withdraw voucher including sale index range.
    /// @dev Skips refunded/withdrawn/in-window payments. Emits counts per attempt.
    function withdrawCoursePayments(
        WithdrawVoucher calldata voucher
    ) external nonReentrant {
        uint256 courseId = voucher.courseId;
        if (courseId == 0 || courseId > courseCounter)
            revert CourseIdIsInvalid();
        if (!isAuthorizedWithdrawer[msg.sender][courseId])
            revert CallerIsNotAuthorizedWithdrawer();
        uint256 fromIndex = voucher.fromIndex;
        uint256 toIndex = voucher.toIndex;
        if (
            fromIndex == 0 ||
            fromIndex > toIndex ||
            toIndex > saleCounterPerCourse[courseId]
        ) revert WithdrawIndexRangeIsInvalid();
        unchecked {
            if (toIndex - fromIndex + 1 > maxBatchWithdrawSize)
                revert WithdrawBatchSizeExceedsLimit();
        }
        address redeemer = voucher.redeemer;
        if (redeemer != msg.sender) revert CallerIsNotVoucherRedeemer();
        uint256 validUntil = voucher.validUntil;
        if (validUntil < block.timestamp) revert VoucherIsExpired();
        (address signer, ECDSA.RecoverError err, ) = ECDSA.tryRecover(
            _hashTypedDataV4(
                keccak256(
                    abi.encode(
                        WITHDRAW_VOUCHER_TYPEHASH,
                        courseId,
                        fromIndex,
                        toIndex,
                        redeemer,
                        validUntil
                    )
                )
            ),
            voucher.signature
        );
        if (uint256(err) != 0) revert SignatureIsInvalid();
        if (!hasBackendRole[signer]) revert SignerIsNotBackend();

        uint256 withdrawnCompleted = 0;
        uint256 withdrawnFailed = 0;
        mapping(uint256 => uint256) storage csr = courseSaleRecords[courseId];

        for (uint256 j = fromIndex; j <= toIndex; ) {
            uint256 paymentId = csr[j];
            unchecked {
                j++;
            }
            if (paymentId == 0) continue;

            Payment storage p = payments[paymentId];
            if (
                p.isRefunded ||
                p.isWithdrawn ||
                p.endOfRefundWindow > block.timestamp
            ) continue;

            try this.attemptSingleWithdrawOrRevert(paymentId, msg.sender) {
                unchecked {
                    withdrawnCompleted++;
                }
            } catch {
                unchecked {
                    withdrawnFailed++;
                }
            }
        }

        emit CoursePaymentsWithdrawn(
            courseId,
            fromIndex,
            toIndex,
            msg.sender,
            withdrawnCompleted,
            withdrawnFailed
        );
    }

    /// @notice Emitted after a withdrawal attempt range completes.
    event CoursePaymentsWithdrawn(
        uint256 indexed courseId,
        uint256 fromIndex,
        uint256 toIndex,
        address indexed withdrawer,
        uint256 withdrawnSucceeded,
        uint256 withdrawnFailed
    );

    /// @notice Single payment withdrawal. Callable only by this contract.
    /// @param paymentId Payment id.
    /// @param instructor Target withdrawer to receive instructor share.
    /// @dev Marks withdrawn, sends instructor/foundation/governance shares, updates locked.
    function attemptSingleWithdrawOrRevert(
        uint256 paymentId,
        address instructor
    ) external {
        if (msg.sender != address(this)) revert CallerIsNotThisContract();

        Payment storage p = payments[paymentId];
        p.isWithdrawn = true;
        address tokenAddress = p.tokenAddress;
        uint256 totalAmount = p.totalAmount;
        uint256 iShare = p.instructorShare;
        uint256 fShare = p.foundationShare;
        uint256 gShare = p.governanceShare;
        address gAddress = governanceAddress;

        if (tokenAddress == address(0)) {
            if (iShare != 0) {
                (bool iOK, ) = payable(instructor).call{value: iShare}("");
                if (!iOK) revert NativeTransferToInstructorFailed();
            }
            if (fShare != 0) {
                (bool fOK, ) = payable(foundationAddress).call{value: fShare}(
                    ""
                );
                if (!fOK) revert NativeTransferToFoundationFailed();
            }
            if (gShare != 0) {
                (bool gOK, ) = payable(gAddress).call{value: gShare}("");
                if (!gOK) revert NativeTransferToGovernanceFailed();
            }
        } else {
            if (iShare != 0) {
                IERC20(tokenAddress).safeTransfer(instructor, iShare);
            }
            if (fShare != 0) {
                IERC20(tokenAddress).safeTransfer(foundationAddress, fShare);
            }
            if (gShare != 0) {
                IERC20(tokenAddress).safeTransfer(gAddress, gShare);
            }
        }
        locked[tokenAddress] -= totalAmount;

        if (gShare != 0 && gAddress.code.length > 0) {
            IGovernanceTreasury(gAddress).addGovernanceFunds(
                tokenAddress,
                gShare
            );
        }
    }

    /// @notice Preview withdrawal statuses for a sale index range.
    /// @param courseId Course id.
    /// @param fromIndex Inclusive sale index.
    /// @param toIndex Inclusive sale index.
    /// @return refunded Sale indices refunded.
    /// @return withdrawn Sale indices withdrawn.
    /// @return inWindow Sale indices still in refund window.
    /// @return ready Sale indices ready to withdraw.
    function previewWithdrawStatus(
        uint256 courseId,
        uint256 fromIndex,
        uint256 toIndex
    )
        external
        view
        returns (
            uint256[] memory refunded,
            uint256[] memory withdrawn,
            uint256[] memory inWindow,
            uint256[] memory ready
        )
    {
        if (courseId == 0 || courseId > courseCounter)
            revert CourseIdIsInvalid();
        if (
            fromIndex == 0 ||
            fromIndex > toIndex ||
            toIndex > saleCounterPerCourse[courseId]
        ) revert WithdrawIndexRangeIsInvalid();

        uint256 len = toIndex - fromIndex + 1;

        refunded = new uint256[](len);
        withdrawn = new uint256[](len);
        inWindow = new uint256[](len);
        ready = new uint256[](len);

        uint256 r = 0;
        uint256 w = 0;
        uint256 i = 0;
        uint256 e = 0;

        for (uint256 j = fromIndex; j <= toIndex; j++) {
            uint256 paymentId = courseSaleRecords[courseId][j];
            if (paymentId == 0) continue;

            Payment memory p = payments[paymentId];

            if (p.isRefunded) {
                refunded[r] = j;
                r++;
            } else if (p.isWithdrawn) {
                withdrawn[w] = j;
                w++;
            } else if (p.endOfRefundWindow >= block.timestamp) {
                inWindow[i] = j;
                i++;
            } else {
                ready[e] = j;
                e++;
            }
        }

        assembly {
            mstore(refunded, r)
            mstore(withdrawn, w)
            mstore(inWindow, i)
            mstore(ready, e)
        }
    }

    /// @notice Get all authorized withdrawers for a course.
    /// @param courseId Course id.
    function getAuthorizedWithdrawers(
        uint256 courseId
    ) external view returns (address[] memory) {
        return authorizedWithdrawers[courseId];
    }

    /// @notice Get number of authorized withdrawers for a course.
    /// @param courseId Course id.
    function getAuthorizedWithdrawersLength(
        uint256 courseId
    ) external view returns (uint256) {
        return authorizedWithdrawers[courseId].length;
    }

    /// @notice Get full owned courses array for user.
    /// @param user Account.
    function getOwnedCourses(
        address user
    ) external view returns (uint256[] memory) {
        return ownedCourses[user];
    }

    /// @notice Get owned courses array length for user.
    /// @param user Account.
    function getOwnedCoursesLength(
        address user
    ) external view returns (uint256) {
        return ownedCourses[user].length;
    }

    /// @notice Slice of owned course ids.
    /// @param user Account.
    /// @param startIdx Start index into logical list (excluding sentinel).
    /// @param limit Max items.
    /// @return out Array slice.
    function getOwnedCoursesSlice(
        address user,
        uint256 startIdx,
        uint256 limit
    ) external view returns (uint256[] memory out) {
        uint256 len = ownedCourses[user].length;
        uint256 maxIdx = len == 0 ? 0 : len - 1;

        if (maxIdx == 0 || limit == 0 || startIdx > maxIdx)
            return new uint256[](0);
        uint256 remaining = maxIdx - startIdx + 1;
        uint256 n = (limit < remaining) ? limit : remaining;

        out = new uint256[](n);
        for (uint256 i = 0; i < n; ) {
            out[i] = ownedCourses[user][startIdx + i];
            unchecked {
                ++i;
            }
        }
    }

    /// @notice Slice of course sale records -> paymentIds.
    /// @param courseId Course id.
    /// @param startIdx Start sale index.
    /// @param limit Max items.
    /// @return out Payment id slice.
    function getCourseSaleRecordsSlice(
        uint256 courseId,
        uint256 startIdx,
        uint256 limit
    ) external view returns (uint256[] memory out) {
        uint256 maxIdx = saleCounterPerCourse[courseId];

        if (maxIdx == 0 || limit == 0 || startIdx > maxIdx)
            return new uint256[](0);
        uint256 remaining = maxIdx - startIdx + 1;
        uint256 n = (limit < remaining) ? limit : remaining;

        out = new uint256[](n);
        for (uint256 i; i < n; ) {
            out[i] = courseSaleRecords[courseId][startIdx + i];
            unchecked {
                ++i;
            }
        }
    }

    /*
    function getPaymentsSlice(
        uint256 startIdx,
        uint256 limit
    ) external view returns (Payment[] memory out) {
        uint256 maxIdx = paymentCounter;

        if (maxIdx == 0 || limit == 0 || startIdx > maxIdx)
            return new Payment[](0);
        uint256 remaining = maxIdx - startIdx + 1;
        uint256 n = (limit < remaining) ? limit : remaining;

        out = new Payment[](n);
        for (uint256 i; i < n; ) {
            out[i] = payments[startIdx + i];
            unchecked {
                ++i;
            }
        }
    }

    function getPaymentsBatch(
        uint256[] calldata ids
    ) external view returns (Payment[] memory out) {
        uint256 n = ids.length;
        out = new Payment[](n);
        for (uint256 i; i < n; ) {
            out[i] = payments[ids[i]];
            unchecked {
                ++i;
            }
        }
    }
    */

    event SurplusRescued(
        address indexed tokenAddress,
        address indexed sentTo,
        uint256 rescueAmount,
        address indexed rescuedBy
    );

    /// @notice Rescue surplus funds above locked balance to foundation.
    /// @param tokenAddress ERC20 token or zero for native.
    /// @dev Does nothing if no surplus. Reverts on failed native transfer.
    function rescueSurplus(address tokenAddress) external nonReentrant {
        address to = foundationAddress;
        uint256 contractBalance = tokenAddress == address(0)
            ? address(this).balance
            : IERC20(tokenAddress).balanceOf(address(this));
        uint256 lockedBalance = locked[tokenAddress];

        if (contractBalance > lockedBalance) {
            uint256 surplus = contractBalance - lockedBalance;
            if (tokenAddress == address(0)) {
                (bool ok, ) = payable(to).call{value: surplus}("");
                if (!ok) revert NativeTransferToFoundationFailed();
            } else {
                IERC20(tokenAddress).safeTransfer(to, surplus);
            }
            emit SurplusRescued(tokenAddress, to, surplus, msg.sender);
        }
    }

    /// @notice View current surplus for a token.
    /// @param token ERC20 token or zero for native.
    /// @return Surplus amount available to rescue.
    function getSurplusBalance(address token) external view returns (uint256) {
        uint256 bal = token == address(0)
            ? address(this).balance
            : IERC20(token).balanceOf(address(this));
        uint256 lockedBalance = locked[token];
        return bal > lockedBalance ? bal - lockedBalance : 0;
    }

    /// @notice Accept native token.
    receive() external payable {}

    /// @notice Calculate fee shares for a payment amount.
    /// @param _totalAmount Gross amount.
    /// @param _tokenAddress Token used. Determines UDAO vs non-UDAO cuts.
    /// @return foundShare Foundation share.
    /// @return goverShare Governance share.
    /// @return instructorShare Remainder to instructor.
    function getCalculatedCourseCutShares(
        uint256 _totalAmount,
        address _tokenAddress
    )
        external
        view
        returns (
            uint256 foundShare,
            uint256 goverShare,
            uint256 instructorShare
        )
    {
        bool isUdao = _tokenAddress == udaoTokenAddress;

        uint256 foundCut = isUdao ? utFoundCut : atFoundCut;
        uint256 goverCut = isUdao ? utGoverCut : atGoverCut;

        foundShare = (_totalAmount * foundCut) / 100_000;
        goverShare = (_totalAmount * goverCut) / 100_000;
        instructorShare = _totalAmount - foundShare - goverShare;
    }
}
