// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

using SafeERC20 for IERC20;

interface IGovernanceTreasury {
    function addGovernanceFunds(address tokenAddress, uint256 amount) external;
}

contract NewTreasury is EIP712, ReentrancyGuard {
    string private constant SIGNING_DOMAIN = "NewTreasuryVouchers";
    string private constant SIGNATURE_VERSION = "1";

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
    error SignatureIsInvalidOrSignerIsNotBackend(); // TODO: X1 divide later
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

    // Fallback
    error DirectETHNotAccepted();

    /////### ROLES AND AFFILIATIONS ###/////
    mapping(address => bool) public hasBackendRole;
    address public foundationAddress;
    address public udaoTokenAddress;
    address public governanceAddress;

    event BackendRoleGranted(address indexed backendAddress);
    event BackendRoleRevoked(address indexed backendAddress);

    event FoundationAddressUpdated(
        address indexed newFoundationAddress,
        address indexed previousFoundationAddress
    );
    event UdaoTokenAddressUpdated(
        address indexed newUdaoTokenAddress,
        address indexed previousUdaoTokenAddress
    );
    event GovernanceAddressUpdated(
        address indexed newGovernanceAddress,
        address indexed previousGovernanceAddress
    );

    function grantBackendRole(address _backendAddress) external {
        if (msg.sender != foundationAddress) revert CallerIsNotFoundation();
        if (_backendAddress == address(0)) revert BackendAddressIsZero();
        if (hasBackendRole[_backendAddress])
            revert BackendRoleAlreadyAssigned();

        hasBackendRole[_backendAddress] = true;
        emit BackendRoleGranted(_backendAddress);
    }

    function revokeBackendRole(address _backendAddress) external {
        if (msg.sender != foundationAddress) revert CallerIsNotFoundation();
        if (_backendAddress == address(0)) revert BackendAddressIsZero();
        if (!hasBackendRole[_backendAddress]) revert BackendRoleAlreadyAbsent();

        hasBackendRole[_backendAddress] = false;
        emit BackendRoleRevoked(_backendAddress);
    }

    function setFoundationAddress(address newFoundationAddress) external {
        address currentFoundation = foundationAddress;
        if (msg.sender != currentFoundation) revert CallerIsNotFoundation();
        if (newFoundationAddress == address(0))
            revert FoundationAddressIsZero();
        if (newFoundationAddress == currentFoundation)
            revert ChangeHasNoEffect();

        foundationAddress = newFoundationAddress;
        hasBackendRole[newFoundationAddress] = true; // ensure new foundation wallet has the backend role
        hasBackendRole[currentFoundation] = false; // revoke backend role from old foundation address

        emit FoundationAddressUpdated(newFoundationAddress, currentFoundation);
    }

    function setUdaoTokenAddress(address newUdaoTokenAddress) external {
        if (!hasBackendRole[msg.sender]) revert CallerIsNotBackend();
        if (newUdaoTokenAddress == address(0)) revert UdaoTokenAddressIsZero();
        address currentUdaoTokenAddress = udaoTokenAddress;
        if (newUdaoTokenAddress == currentUdaoTokenAddress)
            revert ChangeHasNoEffect();

        udaoTokenAddress = newUdaoTokenAddress;
        emit UdaoTokenAddressUpdated(
            newUdaoTokenAddress,
            currentUdaoTokenAddress
        );
    }

    function setGovernanceAddress(address newGovernanceAddress) external {
        if (!hasBackendRole[msg.sender]) revert CallerIsNotBackend();
        if (newGovernanceAddress == address(0))
            revert GovernanceAddressIsZero();
        address currentGovernanceAddress = governanceAddress;
        if (newGovernanceAddress == currentGovernanceAddress)
            revert ChangeHasNoEffect();

        governanceAddress = newGovernanceAddress;
        emit GovernanceAddressUpdated(
            newGovernanceAddress,
            currentGovernanceAddress
        );
    }

    constructor(
        address _foundationAddress,
        address _udaoTokenAddress,
        address _governanceContract
    ) EIP712(SIGNING_DOMAIN, SIGNATURE_VERSION) {
        if (_foundationAddress == address(0)) revert FoundationAddressIsZero();
        if (_udaoTokenAddress == address(0)) revert UdaoTokenAddressIsZero();
        if (_governanceContract == address(0)) revert GovernanceAddressIsZero();

        foundationAddress = _foundationAddress; // set foundation wallet address
        governanceAddress = _governanceContract; // set governance contract address
        udaoTokenAddress = _udaoTokenAddress; // set udao token address

        hasBackendRole[_foundationAddress] = true; // ensure foundation wallet has the backend role
        if (msg.sender != _foundationAddress) {
            hasBackendRole[msg.sender] = true;
        }
    }

    //string constant EMPTY_URI = "";
    bytes32 public constant EMPTY_URI_HASH = keccak256(bytes(""));

    /////### COURSE CREATION & UPDATING LOGIC ###/////
    struct Course {
        string uri;
        bool sellable;
    }

    uint256 public courseCounter; //0x00 empty not used
    mapping(uint256 => Course) public courses; // courseId => Course struct
    mapping(uint256 => address[]) public authorizedWithdrawers; // courseId => list of authorized withdrawers
    mapping(address => mapping(uint256 => bool)) public isAuthorizedWithdrawer; // withdrawer => courseId => true if the withdrawer is authorized for the course
    mapping(bytes32 => uint256) public uriToCourseId;

    event CourseCreated(uint256 indexed courseId);
    struct CreateCourseVoucher {
        string uri;
        address[] withdrawers;
        address redeemer;
        uint256 validUntil;
        bytes signature;
    }
    bytes32 private constant CREATE_COURSE_VOUCHER_TYPEHASH =
        keccak256(
            "CreateCourseVoucher(string uri,address[] withdrawers,address redeemer,uint256 validUntil)"
        );

    function createCourseBatch(
        CreateCourseVoucher[] calldata vouchers
    ) external {
        uint256 len = vouchers.length;
        if (len > maxBatchCreateSize) revert CreateBatchSizeExceedsLimit();
        uint256 maxW = maxAllowedWithdrawers;
        bool isCallerBackend = hasBackendRole[msg.sender];

        for (uint256 i = 0; i < len; ) {
            CreateCourseVoucher calldata voucher = vouchers[i];
            //uri hash
            bytes32 uriHash = keccak256(bytes(voucher.uri));
            if (uriHash == EMPTY_URI_HASH) revert UriIsEmpty();
            if (uriToCourseId[uriHash] != 0)
                revert UriIsAlreadyUsedOrDuplicatedInBatch();

            // withdrawers
            address[] memory withdrawers = voucher.withdrawers;
            uint256 lenW = withdrawers.length; //array length
            if (lenW == 0) revert WithdrawerArrayIsEmpty();
            if (lenW > maxW) revert WithdrawerArrayExceedsLimit();
            address redeemer = voucher.redeemer;
            uint256 validUntil = voucher.validUntil;

            // create digest for the voucher
            bytes32 digest = _hashTypedDataV4(
                keccak256(
                    abi.encode(
                        CREATE_COURSE_VOUCHER_TYPEHASH,
                        uriHash,
                        keccak256(abi.encodePacked(withdrawers)),
                        redeemer,
                        validUntil
                    )
                )
            );
            // verify voucher, signer and validity
            _verifyVoucherSignerAndValidity(
                digest,
                voucher.signature,
                redeemer,
                validUntil
            );

            uint256 newCourseId;
            unchecked {
                newCourseId = ++courseCounter; // önce arttır, sonra arttırdığın değeri ata. Tek okuma ve yazma.
            }

            address[] storage aw = authorizedWithdrawers[newCourseId];
            // spare memory for withdrawers array
            uint256 base;
            assembly {
                sstore(aw.slot, lenW) // set array length once
                mstore(0x00, aw.slot) // store array slot in memory
                base := keccak256(0x00, 0x20) // get first element slot
            }

            for (uint256 j = 0; j < lenW; ) {
                address w = withdrawers[j];
                if (w == address(0)) revert WithdrawerAddressIsZero();
                if (isAuthorizedWithdrawer[w][newCourseId])
                    revert WithdrawerArrayContainsDuplicates();

                isAuthorizedWithdrawer[w][newCourseId] = true;
                // gas efficient aw.push(w) op:
                assembly {
                    sstore(add(base, j), w) // store w into array
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

            emit CourseCreated(newCourseId);
            unchecked {
                i++;
            }
        }
        // end of createCourseBatch
    }

    event CourseUpdated(uint256 indexed courseId);
    struct UpdateCourseVoucher {
        uint256 courseId;
        bool sellable; // true if sellable, false if not
        string uri; // if empty no change in uri
        address[] withdrawers; // if empty no change in withdrawers
        address redeemer;
        uint256 validUntil;
        bytes signature;
    }
    bytes32 private constant UPDATE_COURSE_VOUCHER_TYPEHASH =
        keccak256(
            "UpdateCourseVoucher(uint256 courseId,bool sellable,string uri,address[] withdrawers,address redeemer,uint256 validUntil)"
        );

    function updateCourse(UpdateCourseVoucher calldata voucher) external {
        // local copy to optimize calldata reads
        uint256 courseId = voucher.courseId;
        if (courseId == 0 || courseId > courseCounter)
            revert CourseIdIsInvalid();

        address[] memory withdrawers = voucher.withdrawers;
        uint256 lenW = withdrawers.length; //array length
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
        // create digest
        {
            address redeemer = voucher.redeemer;
            //uint256 validUntil = voucher.validUntil;
            bytes32 digest = _hashTypedDataV4(
                keccak256(
                    abi.encode(
                        UPDATE_COURSE_VOUCHER_TYPEHASH,
                        courseId,
                        sellable,
                        newUriHash,
                        keccak256(abi.encodePacked(withdrawers)),
                        redeemer,
                        voucher.validUntil
                    )
                )
            );

            // verify signer and validity
            _verifyVoucherSignerAndValidity(
                digest,
                voucher.signature,
                redeemer,
                voucher.validUntil
            );
        }

        if (lenW != 0) {
            // clear previous authorized withdrawers
            address[] storage aw = authorizedWithdrawers[courseId]; //storage gas cheper in this case
            uint256 lenPW = aw.length;
            for (uint256 i = 0; i < lenPW; ) {
                isAuthorizedWithdrawer[aw[i]][courseId] = false;
                unchecked {
                    i++;
                }
            }

            uint256 base;
            assembly {
                sstore(aw.slot, lenW) // set length once
                mstore(0x00, aw.slot)
                base := keccak256(0x00, 0x20) // first element slot
            }

            for (uint256 i = 0; i < lenW; ) {
                address w = withdrawers[i];
                if (w == address(0)) revert WithdrawerAddressIsZero();
                if (isAuthorizedWithdrawer[w][courseId])
                    revert WithdrawerArrayContainsDuplicates();

                isAuthorizedWithdrawer[w][courseId] = true;

                assembly {
                    sstore(add(base, i), w) //store new ws' to authorizedWithdrawers
                }

                unchecked {
                    i++;
                }
            }
            //COMMENTED authorizedWithdrawers[courseId] = withdrawers; push daha verimli hatta asembly push dahada verimli.
        }

        if (!hasBackendRole[msg.sender]) {
            if (!isAuthorizedWithdrawer[msg.sender][courseId])
                revert CallerIsNeitherWithdrawerNorBackend();
        }

        // get existing course
        Course storage courseExisting = courses[courseId];
        // URI: only if non-empty and actually changed
        if (updateUri) {
            //COMMENTED! bytes32 oldUriHash = keccak256(bytes(courseExisting.uri));
            delete uriToCourseId[keccak256(bytes(courseExisting.uri))]; // clean up old
            uriToCourseId[newUriHash] = courseId; // assign new
            courseExisting.uri = voucher.uri;
        }

        // update sellable
        courseExisting.sellable = sellable;

        // emit event
        emit CourseUpdated(courseId);
    }

    /////### BASE PAYMENT SETTINGS & LOGIC ###/////
    uint256 public maxAllowedWithdrawers = 4; // max 4 withdrawers allowed
    uint256 public maxBatchCreateSize = 10; // max 10 courses can be created at once
    uint256 public maxBatchBuySize = 10; // max 10 courses can be bought at once
    uint256 public maxBatchWithdrawSize = 10; // max 10 sales can be withdrawn at once

    uint32 public atFoundCut = 6000; // %6 foundation cut (any token)
    uint32 public atGoverCut = 1000; // %1 governance cut (any token)
    uint32 public utFoundCut = 4000; // %4 foundation cut (udao)
    uint32 public utGoverCut = 500; // %0.5 governance cut (udao)
    uint32 public refundWindow = 20 days;

    event MaxAllowedWithdrawersUpdated(
        uint256 indexed newMaxAllowedWithdrawers,
        uint256 indexed previousMaxAllowedWithdrawers
    );
    event MaxBatchCreateSizeUpdated(
        uint256 indexed newMaxBatchCreateSize,
        uint256 indexed previousMaxBatchCreateSize
    );
    event MaxBatchBuySizeUpdated(
        uint256 indexed newMaxBatchBuySize,
        uint256 indexed previousMaxBatchBuySize
    );
    event MaxBatchWithdrawSizeUpdated(
        uint256 indexed newMaxBatchWithdrawSize,
        uint256 indexed previousMaxBatchWithdrawSize
    );
    event RefundWindowUpdated(
        uint256 newRefundWindow,
        uint256 previousRefundWindow
    );
    event CourseCutsUpdated();

    function setMaxAllowedWithdrawers(uint256 newMax) external {
        if (!hasBackendRole[msg.sender]) revert CallerIsNotBackend();
        if (newMax == 0) revert ValueIsZero();
        uint256 currentMax = maxAllowedWithdrawers;
        if (newMax == currentMax) revert ChangeHasNoEffect();

        maxAllowedWithdrawers = newMax;
        emit MaxAllowedWithdrawersUpdated(newMax, currentMax);
    }

    function setMaxBatchCreateSize(uint256 newMaxBatch) external {
        if (!hasBackendRole[msg.sender]) revert CallerIsNotBackend();
        if (newMaxBatch == 0) revert ValueIsZero();
        uint256 currentMaxBatch = maxBatchCreateSize;
        if (newMaxBatch == currentMaxBatch) revert ChangeHasNoEffect();

        maxBatchCreateSize = newMaxBatch;
        emit MaxBatchCreateSizeUpdated(newMaxBatch, currentMaxBatch);
    }

    function setMaxBatchBuySize(uint256 newMaxBatch) external {
        if (!hasBackendRole[msg.sender]) revert CallerIsNotBackend();
        if (newMaxBatch == 0) revert ValueIsZero();
        uint256 currentMaxBatch = maxBatchBuySize;
        if (newMaxBatch == currentMaxBatch) revert ChangeHasNoEffect();

        maxBatchBuySize = newMaxBatch;
        emit MaxBatchBuySizeUpdated(newMaxBatch, currentMaxBatch);
    }

    function setMaxBatchWithdrawSize(uint256 newMaxBatch) external {
        if (!hasBackendRole[msg.sender]) revert CallerIsNotBackend();
        if (newMaxBatch == 0) revert ValueIsZero();
        uint256 currentMaxBatch = maxBatchWithdrawSize;
        if (newMaxBatch == currentMaxBatch) revert ChangeHasNoEffect();

        maxBatchWithdrawSize = newMaxBatch;
        emit MaxBatchWithdrawSizeUpdated(newMaxBatch, currentMaxBatch);
    }

    function setRefundWindow(uint32 newWindow) external {
        if (!hasBackendRole[msg.sender]) revert CallerIsNotBackend();
        uint32 currentWindow = refundWindow;
        if (newWindow == currentWindow) revert ChangeHasNoEffect();

        refundWindow = newWindow;
        emit RefundWindowUpdated(newWindow, currentWindow);
    }

    function setCourseCuts(
        uint32 _atFoundCut,
        uint32 _atGoverCut,
        uint32 _utFoundCut,
        uint32 _utGoverCut
    ) external {
        if (!hasBackendRole[msg.sender]) revert CallerIsNotBackend();
        if (
            _atFoundCut == atFoundCut &&
            _atGoverCut == atGoverCut &&
            _utFoundCut == utFoundCut &&
            _utGoverCut == utGoverCut
        ) revert ChangeHasNoEffect();
        if (_atFoundCut + _atGoverCut >= 100_000)
            revert NonUdaoCutsSumExceeds100Percent();
        if (_utFoundCut + _utGoverCut >= 100_000)
            revert UdaoCutsSumExceeds100Percent();

        atFoundCut = _atFoundCut;
        atGoverCut = _atGoverCut;

        utFoundCut = _utFoundCut;
        utGoverCut = _utGoverCut;

        emit CourseCutsUpdated();
    }

    /////### VOUCHER LOGIC ###/////
    function _verifyVoucherSignerAndValidity(
        bytes32 _digest,
        bytes calldata signature,
        address _redeemer,
        uint256 _validUntil
    ) internal view {
        if (_redeemer != msg.sender) revert CallerIsNotVoucherRedeemer();
        if (_validUntil < block.timestamp) revert VoucherIsExpired();
        address signer = ECDSA.recover(_digest, signature);
        if (!hasBackendRole[signer])
            revert SignatureIsInvalidOrSignerIsNotBackend();
    }

    /////### PAYMENT LOGIC ###/////
    uint256 public paymentCounter; // 0x00 empty not used
    mapping(uint256 => Payment) public payments; // paymentId => Payment struct

    mapping(uint256 => uint256) public saleCounterPerCourse; // courseId => howManySalesMadeForThisCourse 0is empty never used
    mapping(uint256 => mapping(uint256 => uint256)) public courseSaleRecords; // courseId => (saleCounterPerCourse => paymentId) start from 1 - 1

    mapping(address => uint256[]) public ownedCourses; // aUser => list of courseIds owned by the buyer
    mapping(address => mapping(uint256 => uint256)) public ownedCourseIndex; // aUser => courseId => index in the ownedCourses array
    mapping(address => mapping(uint256 => bool)) public hasOwnedCourse; // aUser => courseId => true if the buyer has owned the course
    // refund directly to the course receiver - courseID
    mapping(address => mapping(uint256 => uint256)) public courseOwnerToPayment; // aUser => courseId => paymentId

    struct Payment {
        uint256 courseId;
        address payer; // buyer who paid for the course
        address courseReceiver; // user address who gets the course
        address tokenAddress; // ERC20 token address or 0x0 for native
        uint256 totalAmount; // total amount of the payment
        uint256 instructorShare; // amount delivered to the instructor
        uint256 foundationShare; // amount delivered to the foundation
        uint256 governanceShare; // amount delivered to the governance
        uint256 endOfRefundWindow; // end of refund window
        bool isRefunded; // true if already refunded
        bool isWithdrawn; // true if already withdrawn
    }

    event ContentPurchased(
        uint256 indexed paymentId,
        uint256 indexed courseId,
        address indexed contentReceiver
    );
    struct BuyCourseVoucher {
        uint256 courseId;
        address tokenAddress; // erc20 adressi or 0x0 for native token
        uint256 coursePrice; // Total amount of the payment
        address courseReceiver; // who will owns the course after payment
        address redeemer; // who pays for the course
        uint256 validUntil; // voucher valid until timestamp
        bytes signature; // signature of the voucher
    }

    bytes32 private constant BUY_COURSE_VOUCHER_TYPEHASH =
        keccak256(
            "BuyCourseVoucher(uint256 courseId,address tokenAddress,uint256 coursePrice,address courseReceiver,address redeemer,uint256 validUntil)"
        );

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
            // encode the voucher fields to reduce gas cost
            uint256 courseId = voucher.courseId;
            if (courseId == 0 || courseId > courseCounter)
                revert CourseIdIsInvalid();
            if (!courses[courseId].sellable) revert CourseIsNotSellable();
            uint256 coursePrice = voucher.coursePrice;
            //course price must be greater than 0
            if (coursePrice == 0) revert CoursePriceIsZero();
            address courseReceiver = voucher.courseReceiver;
            //content receiver has to be dont have the course already
            if (hasOwnedCourse[courseReceiver][courseId]) {
                revert CourseIsAlreadyOwnedByReceiverOrDuplicatedInBatch();
            }
            address tokenAddress = voucher.tokenAddress;

            {
                address redeemer = voucher.redeemer;
                uint256 validUntil = voucher.validUntil;

                // create digest for the voucher
                bytes32 digest = _hashTypedDataV4(
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
                );
                // verify voucher, signer and validity
                _verifyVoucherSignerAndValidity(
                    digest,
                    voucher.signature,
                    redeemer,
                    validUntil
                );
            }

            // check if the payment is made in native token or erc20 token
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

        // cache constants / globals
        address _udao = udaoTokenAddress;
        uint32 _atF = atFoundCut;
        uint32 _atG = atGoverCut;
        uint32 _utF = utFoundCut;
        uint32 _utG = utGoverCut;
        uint32 _rw = refundWindow;

        for (uint256 i = 0; i < len; ) {
            BuyCourseVoucher calldata voucher = vouchers[i];
            // encode the voucher fields to reduce gas cost
            uint256 courseId = voucher.courseId;
            address tokenAddress = voucher.tokenAddress;
            uint256 coursePrice = gotAmounts[i];
            address courseReceiver = voucher.courseReceiver;

            // calculate shares
            uint256 foundShare = (coursePrice *
                (tokenAddress == _udao ? _utF : _atF)) / 100_000;
            uint256 goverShare = (coursePrice *
                (tokenAddress == _udao ? _utG : _atG)) / 100_000;

            // save the payment details
            uint256 newPaymentId;
            unchecked {
                newPaymentId = ++paymentCounter; // önce arttır, sonra arttırdığın değeri ata. Tek okuma ve yazma.
            }

            payments[newPaymentId] = Payment({
                courseId: courseId,
                payer: msg.sender,
                courseReceiver: courseReceiver,
                tokenAddress: tokenAddress,
                totalAmount: coursePrice,
                instructorShare: coursePrice - foundShare - goverShare,
                foundationShare: foundShare,
                governanceShare: goverShare,
                endOfRefundWindow: block.timestamp + _rw, //refundWindow,
                isRefunded: false,
                isWithdrawn: false
            });

            // pair paymentId with courseReceiver and courseId
            courseOwnerToPayment[courseReceiver][courseId] = newPaymentId;

            // increase saleCounterPerCourse for this course
            unchecked {
                saleCounterPerCourse[courseId]++;
            }
            // save paymentId to courseSaleRecords mapping according to CourseSaleCounter for this course
            courseSaleRecords[courseId][
                saleCounterPerCourse[courseId]
            ] = newPaymentId;

            uint256 lenOwned = ownedCourses[courseReceiver].length;
            if (lenOwned == 0) {
                // If the course receiver has owned courses, update the mapping
                ownedCourses[courseReceiver].push(0);
                lenOwned = 1; // zero index always holds 0
            }
            ownedCourses[courseReceiver].push(courseId);
            ownedCourseIndex[courseReceiver][courseId] = lenOwned;
            // update hasOwnedCourse mapping, Removed because saved in first loop //hasOwnedCourse[_courseReceiver][_courseId] = true;

            emit ContentPurchased(newPaymentId, courseId, courseReceiver);
            unchecked {
                ++i;
            }
        }
    }

    /////### COURSE REFUND LOGIC ###/////
    event CourseRefunded(
        uint256 indexed paymentId,
        uint256 indexed courseId,
        address indexed courseReceiver,
        uint256 amount,
        address tokenAddress,
        address payer
    );

    bytes32 private constant REFUND_COURSE_VOUCHER_TYPEHASH =
        keccak256(
            "RefundCourseVoucher(uint256 paymentId,address redeemer,uint256 validUntil)"
        );

    bytes32
        private constant REFUND_COURSE_BY_OWNER_AND_COURSE_ID_VOUCHER_TYPEHASH =
        keccak256(
            "RefundCourseByOwnerAndCourseIdVoucher(address courseOwner,uint256 courseId,address redeemer,uint256 validUntil)"
        );

    struct RefundCourseVoucher {
        uint256 paymentId;
        address redeemer;
        uint256 validUntil; // voucher valid until timestamp
        bytes signature;
    }

    function refundCourse(
        RefundCourseVoucher calldata voucher
    ) external nonReentrant {
        // encode the voucher fields to reduce gas cost
        uint256 paymentId = voucher.paymentId;
        if (paymentId == 0 || paymentId > paymentCounter)
            revert PaymentIdIsInvalid();
        address redeemer = voucher.redeemer;
        uint256 validUntil = voucher.validUntil;

        bytes32 digest = _hashTypedDataV4(
            keccak256(
                abi.encode(
                    REFUND_COURSE_VOUCHER_TYPEHASH,
                    paymentId,
                    redeemer,
                    validUntil
                )
            )
        );

        _verifyVoucherSignerAndValidity(
            digest,
            voucher.signature,
            redeemer,
            validUntil
        );

        _refundCourse(paymentId);
    }

    struct RefundCourseByOwnerAndCourseIdVoucher {
        address courseOwner;
        uint256 courseId;
        address redeemer;
        uint256 validUntil; // voucher valid until timestamp
        bytes signature;
    }

    function refundCourseByOwnerAndCourseId(
        RefundCourseByOwnerAndCourseIdVoucher calldata voucher
    ) external nonReentrant {
        // encode the voucher fields to reduce gas cost
        address courseOwner = voucher.courseOwner;
        uint256 courseId = voucher.courseId;

        uint256 paymentId = courseOwnerToPayment[courseOwner][courseId];
        if (paymentId == 0) revert PaymentNotFoundForOwnerAndCourse();

        address redeemer = voucher.redeemer;
        uint256 validUntil = voucher.validUntil;

        bytes32 digest = _hashTypedDataV4(
            keccak256(
                abi.encode(
                    REFUND_COURSE_BY_OWNER_AND_COURSE_ID_VOUCHER_TYPEHASH,
                    courseOwner,
                    courseId,
                    redeemer,
                    validUntil
                )
            )
        );

        _verifyVoucherSignerAndValidity(
            digest,
            voucher.signature,
            redeemer,
            validUntil
        );

        _refundCourse(paymentId);
    }

    function _refundCourse(uint256 _paymentId) internal {
        Payment storage payment = payments[_paymentId];

        if (payment.isRefunded) revert PaymentIsAlreadyRefunded();
        if (payment.isWithdrawn) revert PaymentIsAlreadyWithdrawn();
        if (payment.endOfRefundWindow < block.timestamp)
            revert RefundWindowHasPassed();

        //avoid the field access to save gas
        address _receiver = payment.courseReceiver;
        uint256 _courseId = payment.courseId;

        uint256 courseIndex = ownedCourseIndex[_receiver][_courseId];
        if (courseIndex == 0) revert CourseIsNotOwnedByReceiver(); //TODO: BATU buraya gelemedim ben
        // Mark refunded before transfer to prevent re-entrancy
        payment.isRefunded = true;
        // update hasOwnedCourse mapping
        hasOwnedCourse[_receiver][_courseId] = false;
        // remove the courseId from the ownedCourses list and update the indexes
        uint256 lastIndex = ownedCourses[_receiver].length - 1;
        //swap & pop
        if (courseIndex != lastIndex) {
            uint256 lastCourseId = ownedCourses[_receiver][lastIndex];
            ownedCourses[_receiver][courseIndex] = lastCourseId; // swap with the last element
            ownedCourseIndex[_receiver][lastCourseId] = courseIndex; // update the index of the last element
        }
        ownedCourses[_receiver].pop(); // remove the last element
        delete ownedCourseIndex[_receiver][_courseId]; // delete the index of the removed courseId
        delete courseOwnerToPayment[_receiver][_courseId]; // remove the paymentId for the course owner

        address _payer = payment.payer;
        address _tokenAddress = payment.tokenAddress;
        uint256 _totalAmount = payment.totalAmount;

        // Transfer refund
        if (_tokenAddress == address(0)) {
            // native token
            (bool sent, ) = payable(_payer).call{value: _totalAmount}("");
            if (!sent) revert NativeRefundFailed();
        } else {
            // ERC20
            IERC20(_tokenAddress).safeTransfer(_payer, _totalAmount);
        }

        emit CourseRefunded(
            _paymentId,
            _courseId,
            _receiver,
            _totalAmount,
            _tokenAddress,
            _payer
        );
    }

    /////### WITHDRAW LOGIC ###/////
    // withdraw logic
    struct WithdrawVoucher {
        uint256 courseId;
        uint256 fromIndex; // inclusive
        uint256 toIndex; // inclusive
        address redeemer;
        uint256 validUntil;
        bytes signature;
    }

    bytes32 private constant WITHDRAW_VOUCHER_TYPEHASH =
        keccak256(
            "WithdrawVoucher(uint256 courseId,uint256 fromIndex,uint256 toIndex,address redeemer,uint256 validUntil)"
        );

    function withdrawCoursePayments(
        WithdrawVoucher calldata voucher
    ) external nonReentrant {
        // encode the voucher fields to reduce gas cost
        uint256 courseId = voucher.courseId;
        uint256 fromIndex = voucher.fromIndex;
        uint256 toIndex = voucher.toIndex;
        address redeemer = voucher.redeemer;
        uint256 validUntil = voucher.validUntil;

        if (courseId == 0 || courseId > courseCounter)
            revert CourseIdIsInvalid();

        if (
            fromIndex == 0 ||
            fromIndex > toIndex ||
            toIndex > saleCounterPerCourse[courseId]
        ) revert WithdrawIndexRangeIsInvalid();

        if (toIndex - fromIndex + 1 > maxBatchWithdrawSize)
            revert WithdrawBatchSizeExceedsLimit();

        // create digest for the voucher
        bytes32 digest = _hashTypedDataV4(
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
        );

        // verify voucher, signer and validity
        _verifyVoucherSignerAndValidity(
            digest,
            voucher.signature,
            redeemer,
            validUntil
        );

        if (!isAuthorizedWithdrawer[msg.sender][courseId])
            revert CallerIsNotAuthorizedWithdrawer();

        _withdrawCoursePayments(courseId, fromIndex, toIndex);
    }

    event CoursePaymentsWithdrawn(
        uint256 indexed courseId,
        uint256 fromIndex,
        uint256 toIndex,
        address indexed withdrawer,
        uint256 withdrawnCompleted
    );

    function _withdrawCoursePayments(
        uint256 courseId,
        uint256 fromIndex,
        uint256 toIndex
    ) internal {
        uint256 withdrawnCompleted = 0;

        for (uint256 j = fromIndex; j <= toIndex; j++) {
            uint256 paymentId = courseSaleRecords[courseId][j];
            if (paymentId == 0) continue; // TODO: BATU buraya gelemedim ben

            Payment storage p = payments[paymentId];

            if (
                p.isRefunded ||
                p.isWithdrawn ||
                p.endOfRefundWindow > block.timestamp
            ) continue;

            try this.attemptSingleWithdrawOrRevert(paymentId, msg.sender) {
                withdrawnCompleted++;
            } catch {
                //p.isWithdrawn = false; //if reverted, this will not be set
                // nothing
                // needed: emit CourseWithdrawFailed(courseId, paymentId, msg.sender, reason);
                // TODO: çok silent
            }
        }

        emit CoursePaymentsWithdrawn(
            courseId,
            fromIndex,
            toIndex,
            msg.sender,
            withdrawnCompleted
        );
    }

    function attemptSingleWithdrawOrRevert(
        uint256 paymentId,
        address instructor
    ) external {
        if (msg.sender != address(this)) revert CallerIsNotThisContract();

        Payment storage p = payments[paymentId];
        // mark as withdrawn before attempting (reentrancy protection)
        p.isWithdrawn = true; //if reverted, this will not be set

        address tokenAddress = p.tokenAddress;
        uint256 iShare = p.instructorShare;
        uint256 fShare = p.foundationShare;
        uint256 gShare = p.governanceShare;

        if (tokenAddress == address(0)) {
            // Native token transfers
            (bool iOK, ) = payable(instructor).call{value: iShare}("");
            //require(iOK);
            if (!iOK) revert NativeTransferToInstructorFailed(); // da yani okunamıyor ki bu.

            (bool fOK, ) = payable(foundationAddress).call{value: fShare}("");
            //require(fOK);
            if (!fOK) revert NativeTransferToFoundationFailed();

            (bool gOK, ) = payable(governanceAddress).call{value: gShare}("");
            //require(gOK);
            if (!gOK) revert NativeTransferToGovernanceFailed();
        } else {
            // ERC20 transfers
            IERC20(tokenAddress).safeTransfer(instructor, iShare);
            IERC20(tokenAddress).safeTransfer(foundationAddress, fShare);
            IERC20(tokenAddress).safeTransfer(governanceAddress, gShare);
        }
        if (governanceAddress.code.length > 0) {
            // governanceAddress is a contract
            IGovernanceTreasury(governanceAddress).addGovernanceFunds(
                tokenAddress,
                gShare
            );
        }
    }

    function checkWithdrawStatus(
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

        // max length = toIndex - fromIndex + 1
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
            if (paymentId == 0) continue; //TODO: BATU buraya gelemedim ben

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

        // shrink arrays
        assembly {
            mstore(refunded, r)
            mstore(withdrawn, w)
            mstore(inWindow, i)
            mstore(ready, e)
        }
    }

    function getAuthorizedWithdrawers(
        uint256 courseId
    ) external view returns (address[] memory) {
        return authorizedWithdrawers[courseId];
    }

    function getOwnedCourses(
        address user
    ) external view returns (uint256[] memory) {
        return ownedCourses[user];
    }

    function getCourse(
        uint256 courseId
    ) external view returns (string memory uri, bool sellable) {
        Course memory c = courses[courseId];
        return (c.uri, c.sellable);
    }

    function getPayment(
        uint256 id
    )
        external
        view
        returns (
            uint256 courseId,
            address payer,
            address courseReceiver,
            address tokenAddress,
            uint256 totalAmount,
            uint256 instructorShare,
            uint256 foundationShare,
            uint256 governanceShare,
            uint256 endOfRefundWindow,
            bool isRefunded,
            bool isWithdrawn
        )
    {
        Payment memory p = payments[id];
        return (
            p.courseId,
            p.payer,
            p.courseReceiver,
            p.tokenAddress,
            p.totalAmount,
            p.instructorShare,
            p.foundationShare,
            p.governanceShare,
            p.endOfRefundWindow,
            p.isRefunded,
            p.isWithdrawn
        );
    }

    /*
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
    */

    receive() external payable {
        revert DirectETHNotAccepted(); // prevent direct ETH transfers
    }
}

// TODO BATU eğer governanceAddress kontrat değilse try catch'i kapat
// TODO BATU getCourse ve getPayment getterlarının gereksiz olduğunu düşünüyorum.

/*
fallback() external payable {
    revert("Direct ETH not accepted");
}

NOTE:
Eğer ileride farklı token’lar için farklı cut yapısı (örneğin USDC, USDT, DAI özel oranlar) gerekiyorsa, 
şöyle extensible yapabilirsin:

struct Cut {
    uint256 foundation;
    uint256 governance;
}

mapping(address => Cut) public tokenCuts;

ve

Cut memory cut = tokenCuts[_tokenAddress];
if (cut.foundation == 0 && cut.governance == 0) {
    cut = tokenCuts[DEFAULT_TOKEN];
}
// ve setCourseCuts fonksiyonunda da bu mapping’i güncelleyebilirsin.
NOTE:
require(_tokenAddress.code.length > 0, "Invalid token contract");
gerekirse böyle bir şey kontrat çağrışlarını engellemek için kullanılabilir.

2. hasOwnedCourse ≠ ownedCourses Sync Risk
hasOwnedCourse mapping’i ile ownedCourses dizisinin senkronize olması elzem. refundCourse() içinde hasOwnedCourse update sonrası index manipülasyonu başarılı gözüküyor ama testlerde pop() sonrası doğru elemanın silindiğinden emin olmalısın.

Eğer bir bug çıkacaksa, swap & pop içindeki require(courseIndex > 0) sonrası index=0 durumunda olabilir. Bunun testini yaz.

Adım 5: hasOwnedCourse flag’ini mapping yerine bit-packing ile array’de tutmak

    unchecked { i++; } verimli! 3 gaz sadece ama.

isRefunded isWithdrawn ve course struct daha verimli eğer tamamını okuyacaksan. bölersen SLoad artar


✅ Neden Güvende:
Hiçbir Ether transferi yok.

Hiçbir low-level external call (call, send, transfer) yok.

safeTransfer veya transferFrom gibi token çekme/gönderme işlemi de yok.

external call sadece _verifyVoucherSignerAndValidity ve _validateWithdrawersAndRedeemer gibi internal fonksiyonlar, ve bunların kendisi de reentrant değil (senin kontrolünde).

courseCounter ve uriToCourseId gibi state değişiklikleri external çağrılardan sonra değil, sonra geliyorlar.

🔐 Ne Zaman Gerekebilirdi?
Eğer fonksiyon:

payable olsaydı,

ya da içinden Ether/token gönderseydi (örneğin _setAuthorizedWithdrawers içinde call varsa dikkat gerekirdi),

ya da başka kontratlar seni tekrar çağırabilseydi,

O zaman reentrancy riskine karşı nonReentrant gerekirdi.

*/

/*
TODO X1: Voucher konusuna tekrar bir bak mümkünse ECDSA yı jumpsız kullan. internal fonksiyonu düzenle ve verify'ın gaz costunu düşür.
TODO X2: Eventleri gözden geçir. Indexed pahalı. minimum gereken ile minimum gaz costu hedefle
TODO X3: DONE! 32byte değişkeleri 8-16-32 gibi değerlere düşürebilirsin. atFound Refund Window maxxBatch vs.
TODO X4: DONE! fonksiyon içi değişkenler uint256 mı olmak zorunda bir bak. Mesela for loop i.
TODO X5: onlyBackend onlyFoundation modifier'a dönebilir. Sürekli tekrarlayan revertler internal pure'a dönebilir. (Jump cost)
TODO X6: public private değişkenler, sabitler gaza etkisi.
TODO X7: {} sadece o blokta tanımlanan değişkenlerin ömrünü kısaltır. Gerekliyse kullan.
*/
