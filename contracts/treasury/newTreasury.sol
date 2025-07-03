// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/cryptography/draft-EIP712.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract NewTreasury is AccessControl, EIP712, ReentrancyGuard {
    string private constant SIGNING_DOMAIN = "TreasuryVouchers";
    string private constant SIGNATURE_VERSION = "1";

    bytes32 public constant BACKEND_ROLE = keccak256("BACKEND_ROLE");
    bytes32 public constant FOUNDATION_ROLE = keccak256("FOUNDATION_ROLE");

    address public udaoTokenAddress; // address of the udao token, set by the foundation
    event UdaoTokenAddressUpdated(address newUdaoTokenAddress);

    function setUdaoTokenAddress(address _udaoTokenAddress) external {
        require(
            hasRole(BACKEND_ROLE, msg.sender) ||
                hasRole(FOUNDATION_ROLE, msg.sender),
            "Not authorized"
        );
        require(
            _udaoTokenAddress != address(0),
            "Udao token address cannot be zero"
        );

        udaoTokenAddress = _udaoTokenAddress;

        emit UdaoTokenAddressUpdated(_udaoTokenAddress);
    }

    constructor(
        address foundation,
        address _udaoTokenAddress
    ) EIP712(SIGNING_DOMAIN, SIGNATURE_VERSION) {
        _grantRole(DEFAULT_ADMIN_ROLE, foundation); // TODO BATU1 Bunu istiyormuyuz set foundation olacak mı?
        _grantRole(FOUNDATION_ROLE, foundation);
        _grantRole(BACKEND_ROLE, msg.sender);
        udaoTokenAddress = _udaoTokenAddress;
    }

    /////### COURSE CREATION & UPDATING LOGIC ###/////
    struct Course {
        string uri;
        bool sellable;
    }

    uint256 public courseCounter; //0x00 empty not used
    mapping(uint256 => Course) public courses; // courseId => Course struct
    mapping(uint256 => address[]) public authorizedWithdrawers; // courseId => list of authorized withdrawers
    mapping(address => mapping(uint256 => bool)) public isAuthorizedWithdrawer; // withdrawer => courseId => true if the withdrawer is authorized for the course

    event CourseCreated(uint256 indexed courseId);
    struct CreateCourseVoucher {
        string uri;
        address[] withdrawers; // max 4 enforced, first is required in all cases
        address redeemer;
        uint256 validUntil;
        bytes signature;
    }
    bytes32 private constant CREATE_COURSE_VOUCHER_TYPEHASH =
        keccak256(
            "CreateCourseVoucher(string uri,address[] withdrawers,address redeemer,uint256 validUntil)"
        );

    function createCourse(CreateCourseVoucher calldata voucher) external {
        // local copy to optimize calldata reads
        string memory uri = voucher.uri;
        address[] memory withdrawers = voucher.withdrawers;
        address redeemer = voucher.redeemer;
        uint256 validUntil = voucher.validUntil;

        // create digest for the voucher
        bytes32 digest = _hashTypedDataV4(
            keccak256(
                abi.encode(
                    CREATE_COURSE_VOUCHER_TYPEHASH,
                    keccak256(bytes(uri)),
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

        // check withdrawers and redeemer and uri are valid
        _validateWithdrawersAndRedeemer(withdrawers, uri);

        courseCounter++;
        uint256 newCourseId = courseCounter;

        courses[newCourseId] = Course({uri: uri, sellable: true});

        _setAuthorizedWithdrawers(newCourseId, withdrawers);

        emit CourseCreated(newCourseId);
    }

    event CourseUpdated(uint256 indexed courseId);

    struct UpdateCourseVoucher {
        uint256 courseId;
        bool sellable; // true if sellable, false if not
        string uri;
        address[] withdrawers; // max 4 enforced, first required
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
        bool sellable = voucher.sellable;
        string memory uri = voucher.uri;
        address[] memory withdrawers = voucher.withdrawers;
        address redeemer = voucher.redeemer;
        uint256 validUntil = voucher.validUntil;

        // create digest
        bytes32 digest = _hashTypedDataV4(
            keccak256(
                abi.encode(
                    UPDATE_COURSE_VOUCHER_TYPEHASH,
                    courseId,
                    sellable,
                    keccak256(bytes(uri)),
                    keccak256(abi.encodePacked(withdrawers)),
                    redeemer,
                    validUntil
                )
            )
        );

        // verify signer and validity
        _verifyVoucherSignerAndValidity(
            digest,
            voucher.signature,
            redeemer,
            validUntil
        );

        // check withdrawers and redeemer and uri are valid
        _validateWithdrawersAndRedeemer(withdrawers, uri);

        require(courseId > 0 && courseId <= courseCounter, "Invalid courseId");

        // clear previous authorized withdrawers
        address[] memory previousWithdrawers = authorizedWithdrawers[courseId];
        for (uint i = 0; i < previousWithdrawers.length; i++) {
            isAuthorizedWithdrawer[previousWithdrawers[i]][courseId] = false;
        }
        authorizedWithdrawers[courseId] = new address[](0);

        // update
        courses[courseId] = Course({uri: uri, sellable: sellable});
        _setAuthorizedWithdrawers(courseId, withdrawers);

        emit CourseUpdated(courseId);
    }

    function _validateWithdrawersAndRedeemer(
        address[] memory _withdrawers,
        string memory _uri
    ) internal view {
        require(_withdrawers.length > 0, "Withdrawers required");
        require(_withdrawers[0] != address(0), "Main withdrawer required");
        require(
            _withdrawers.length <= maxWithdrawer,
            "Max withdrawers exceeded"
        );

        bool isRedeemerAuthorized = false;
        for (uint256 i = 0; i < _withdrawers.length; i++) {
            if (_withdrawers[i] == msg.sender) {
                isRedeemerAuthorized = true;
                break;
            }
        }

        if (!isRedeemerAuthorized) {
            require(
                hasRole(BACKEND_ROLE, msg.sender),
                "Redeemer must be backend role if not any withdrawer"
            );
        }

        require(bytes(_uri).length > 0, "Course URI empty");
    }

    function _setAuthorizedWithdrawers(
        uint256 _courseId,
        address[] memory _withdrawers
    ) internal {
        for (uint256 i = 0; i < _withdrawers.length; i++) {
            address w = _withdrawers[i];
            if (w != address(0)) {
                authorizedWithdrawers[_courseId].push(w);
                isAuthorizedWithdrawer[w][_courseId] = true;
            }
        }
    }

    /////### BASE PAYMENT SETTINGS & LOGIC ###/////
    uint256 public maxWithdrawer = 4; // max 4 withdrawers allowed

    event MaxWithdrawersUpdated(uint256 indexed maxWithdrawer);

    function setMaxWithdrawers(uint256 _maxWithdrawer) external {
        require(
            hasRole(BACKEND_ROLE, msg.sender) ||
                hasRole(FOUNDATION_ROLE, msg.sender),
            "Not authorized"
        );
        require(_maxWithdrawer > 0, "Max withdrawers must be greater than 0");
        maxWithdrawer = _maxWithdrawer;

        emit MaxWithdrawersUpdated(_maxWithdrawer);
    }

    uint256 public refundWindow = 20 days;

    event RefundWindowUpdated(uint256 newRefundWindow);

    function setRefundWindow(uint256 _refundWindow) external {
        require(
            hasRole(BACKEND_ROLE, msg.sender) ||
                hasRole(FOUNDATION_ROLE, msg.sender),
            "Not authorized"
        );

        uint256 oneDay = 24 * 60 * 60; // seconds in a day

        refundWindow = _refundWindow * oneDay; // convert days to seconds

        emit RefundWindowUpdated(refundWindow);
    }

    // course sale cuts with any other token else udao
    uint256 atFoundCut = 4000; // %4 any token course sale foundation cut
    uint256 atGoverCut = 1000; // %1 any token course sale governance cut
    uint256 atJurorCut = 1000; // %1 any token course sale juror cut
    uint256 atValidCut = 1000; // %1 any token course sale valid cut
    uint256 atTotalCut = atFoundCut + atGoverCut + atJurorCut + atValidCut;

    // course sale cuts with udao token
    uint256 utFoundCut = 4000; // %4 any token course sale foundation cut
    uint256 utGoverCut = 1000; // %1 any token course sale governance cut
    uint256 utJurorCut = 1000; // %1 any token course sale juror cut
    uint256 utValidCut = 1000; // %1 any token course sale valid cut
    uint256 utTotalCut = utFoundCut + utGoverCut + utJurorCut + utValidCut;

    event CourseCutsUpdated();

    function setCourseCuts(
        uint256 _atFoundCut,
        uint256 _atGoverCut,
        uint256 _atJurorCut,
        uint256 _atValidCut,
        uint256 _utFoundCut,
        uint256 _utGoverCut,
        uint256 _utJurorCut,
        uint256 _utValidCut
    ) external {
        require(
            hasRole(BACKEND_ROLE, msg.sender) ||
                hasRole(FOUNDATION_ROLE, msg.sender),
            "Not authorized"
        );

        uint256 newATotal = _atFoundCut +
            _atGoverCut +
            _atJurorCut +
            _atValidCut;
        require(newATotal < 100000, "Cuts can't exceed 100%");

        uint256 newUTotal = _utFoundCut +
            _utGoverCut +
            _utJurorCut +
            _utValidCut;
        require(newUTotal < 100000, "Cuts can't exceed 100%");

        atFoundCut = _atFoundCut;
        atGoverCut = _atGoverCut;
        atJurorCut = _atJurorCut;
        atValidCut = _atValidCut;
        atTotalCut = newATotal;

        utFoundCut = _utFoundCut;
        utGoverCut = _utGoverCut;
        utJurorCut = _utJurorCut;
        utValidCut = _utValidCut;
        utTotalCut = newUTotal;

        emit CourseCutsUpdated();
    }

    function _calculateCourseCutShares(
        uint256 _totalAmount,
        address _tokenAddress
    )
        internal
        view
        returns (
            uint256 foundShare,
            uint256 goverShare,
            uint256 jurorShare,
            uint256 validShare,
            uint256 instructorShare
        )
    {
        uint256 found;
        uint256 gover;
        uint256 juror;
        uint256 valid;

        if (_tokenAddress == udaoTokenAddress) {
            found = utFoundCut;
            gover = utGoverCut;
            juror = utJurorCut;
            valid = utValidCut;
        } else {
            found = atFoundCut;
            gover = atGoverCut;
            juror = atJurorCut;
            valid = atValidCut;
        }

        foundShare = (_totalAmount * found) / 100000;
        goverShare = (_totalAmount * gover) / 100000;
        jurorShare = (_totalAmount * juror) / 100000;
        validShare = (_totalAmount * valid) / 100000;

        uint256 cutSum = foundShare + goverShare + jurorShare + validShare;
        instructorShare = _totalAmount - cutSum;
    }

    /////### VOUCHER LOGIC ###/////
    function _verifyVoucherSignerAndValidity(
        bytes32 _digest,
        bytes memory signature,
        address _redeemer,
        uint256 _validUntil
    ) internal view {
        address signer = ECDSA.recover(_digest, signature);
        require(
            hasRole(BACKEND_ROLE, signer),
            "Signature invalid or unauthorized"
        );
        require(_redeemer == msg.sender, "Only redeemer can use this voucher");
        require(_validUntil >= block.timestamp, "Voucher expired");
    }

    /////### PAYMENT LOGIC ###/////
    uint256 public paymentCounter; // 0x00 empty not used
    mapping(uint256 => Payment) public payments; // paymentId => Payment struct

    mapping(uint256 => uint256) public saleCounterPerCourse; // courseId => howManySalesMadeForThisCourse 0is empty never used
    mapping(uint256 => mapping(uint256 => uint256)) public courseSaleRecords; // courseId => (saleCounterPerCourse => paymentId) start from 1 - 1

    mapping(address => uint256[]) public ownedCourses; // aUser => list of courseIds owned by the buyer
    mapping(address => mapping(uint256 => uint256))
        public ownedCourseIndexPlusOne; // aUser => courseId => index in the ownedCourses array
    mapping(address => mapping(uint256 => bool)) public hasOwnedCourse; // aUser => courseId => true if the buyer has owned the course
    struct Payment {
        uint256 courseId;
        address payer; // buyer who paid for the course
        address courseReceiver; // user address who gets the course
        address tokenAddress; // ERC20 token address or 0x0 for native
        uint256 totalAmount; // total amount of the payment
        uint256 instructorShare; // amount delivered to the instructor
        uint256 foundationShare; // amount delivered to the foundation
        uint256 governanceShare; // amount delivered to the governance
        uint256 jurorShare; // amount delivered to the juror
        uint256 validatorShare; // amount delivered to the validator
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

    function buyCourse(
        BuyCourseVoucher calldata voucher
    ) external payable nonReentrant {
        // encode the voucher fields to reduce gas cost
        uint256 courseId = voucher.courseId;
        address tokenAddress = voucher.tokenAddress;
        uint256 coursePrice = voucher.coursePrice;
        address courseReceiver = voucher.courseReceiver;
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
        // do the job
        _buyCourse(courseId, courseReceiver, tokenAddress, coursePrice);
    }

    function _buyCourse(
        uint _courseId,
        address _courseReceiver,
        address _tokenAddress,
        uint _coursePrice
    ) internal {
        require(
            _courseId > 0 && _courseId <= courseCounter,
            "Invalid courseId"
        );
        require(courses[_courseId].sellable, "Course is not sellable");
        //content receiver has to be dont have the course already
        require(
            !hasOwnedCourse[_courseReceiver][_courseId],
            "Content receiver already owns this course"
        );
        //course price must be greater than 0
        require(_coursePrice > 0, "Course price must be greater than 0");

        // calculate shares
        (
            uint256 foundShare,
            uint256 goverShare,
            uint256 jurorShare,
            uint256 validShare,
            uint256 instructorShare
        ) = _calculateCourseCutShares(_coursePrice, _tokenAddress);

        // check if the payment is made in native token or erc20 token
        if (_tokenAddress == address(0)) {
            // payment in native token
            require(
                msg.value == _coursePrice,
                "Incorrect amount sent for native token payment"
            );
        } else {
            require(
                IERC20(_tokenAddress).totalSupply() > 0,
                "Invalid or empty ERC20 token"
            );

            // payment in erc20 token
            require(
                msg.value == 0,
                "Native token payment not allowed for ERC20 token purchase"
            );
            // transfer the erc20 token from redeemer to this contract
            IERC20(_tokenAddress).transferFrom(
                msg.sender,
                address(this),
                _coursePrice
            );
        }
        // save the payment details

        paymentCounter++;

        uint256 newPaymentId = paymentCounter;
        payments[newPaymentId] = Payment({
            courseId: _courseId,
            payer: msg.sender,
            courseReceiver: _courseReceiver,
            tokenAddress: _tokenAddress,
            totalAmount: _coursePrice,
            instructorShare: instructorShare,
            foundationShare: foundShare,
            governanceShare: goverShare,
            jurorShare: jurorShare,
            validatorShare: validShare,
            endOfRefundWindow: block.timestamp + refundWindow,
            isRefunded: false,
            isWithdrawn: false
        });

        // increase saleCounterPerCourse for this course
        saleCounterPerCourse[_courseId]++;
        // save paymentId to courseSaleRecords mapping according to CourseSaleCounter for this course
        courseSaleRecords[_courseId][
            saleCounterPerCourse[_courseId]
        ] = newPaymentId;

        if (ownedCourses[_courseReceiver].length == 0) {
            // if the course receiver does not have any courses yet, initialize the mapping
            ownedCourses[_courseReceiver].push(0); // zero index always holds 0
        }

        // add the courseId to the ownedCourses mapping
        ownedCourses[_courseReceiver].push(_courseId);
        // save the index of the courseId in the ownedCourses mapping
        ownedCourseIndexPlusOne[_courseReceiver][_courseId] =
            ownedCourses[_courseReceiver].length -
            1;
        // update hasOwnedCourse mapping
        hasOwnedCourse[_courseReceiver][_courseId] = true;

        emit ContentPurchased(newPaymentId, _courseId, _courseReceiver);
    }

    // TODO BATU1 ADD BACKEND ROLE setter
    // TODO BATU2 check what is SafeERC20 kullanımı önerilir. .safeTransferFrom Yoksa revert yerine false döner
    // TODO BATU3 check voucher reuse problem,  İmza Yeniden Kullanımı (Replay Attack) Engeli
    // TODO BATU4 content owner - courseId versiyonunu hazırla.
    // TODO BATU5 daha verimli bir withdraw fonksiyonu yaz.

    /////### COURSE REFUND LOGIC ###/////
    event CourseRefunded(
        uint256 indexed paymentId,
        uint256 indexed courseId,
        address indexed courseReceiver,
        uint256 amount,
        address tokenAddress,
        address payer
    );
    struct RefundCourseVoucher {
        uint256 paymentId;
        address redeemer;
        uint256 validUntil; // voucher valid until timestamp
        bytes signature;
    }

    bytes32 private constant REFUND_COURSE_VOUCHER_TYPEHASH =
        keccak256(
            "RefundCourseVoucher(uint256 paymentId,address redeemer,uint256 validUntil)"
        );

    function refundCourse(
        RefundCourseVoucher calldata voucher
    ) external nonReentrant {
        // encode the voucher fields to reduce gas cost
        uint256 paymentId = voucher.paymentId;
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

    function _refundCourse(uint256 _paymentId) internal {
        require(
            _paymentId > 0 && _paymentId <= paymentCounter,
            "Invalid paymentId"
        );

        Payment storage payment = payments[_paymentId];
        //avoid the field access to save gas
        address _payer = payment.payer;
        address _tokenAddress = payment.tokenAddress;
        uint256 _totalAmount = payment.totalAmount;
        address _receiver = payment.courseReceiver;
        uint256 _courseId = payment.courseId;

        require(!payment.isRefunded, "Already refunded");
        require(!payment.isWithdrawn, "Already withdrawn");
        require(
            payment.endOfRefundWindow >= block.timestamp,
            "Refund window passed"
        );

        // Mark refunded before transfer to prevent re-entrancy
        payment.isRefunded = true;

        // update hasOwnedCourse mapping
        hasOwnedCourse[_receiver][_courseId] = false;
        // remove the courseId from the ownedCourses list and update the indexes
        uint256 courseIndex = ownedCourseIndexPlusOne[_receiver][_courseId];
        require(courseIndex > 0, "Course not found in receiver's owned list"); // bu gereksiz
        uint256 lastIndex = ownedCourses[_receiver].length - 1;
        uint256 lastCourseId = ownedCourses[_receiver][lastIndex];

        //swap & pop
        if (courseIndex != lastIndex) {
            ownedCourses[_receiver][courseIndex] = lastCourseId; // swap with the last element
            ownedCourseIndexPlusOne[_receiver][lastCourseId] = courseIndex; // update the index of the last element
        }

        ownedCourses[_receiver].pop(); // remove the last element
        delete ownedCourseIndexPlusOne[_receiver][_courseId]; // delete the index of the removed courseId

        // Transfer refund
        if (_tokenAddress == address(0)) {
            // native token
            (bool sent, ) = payable(_payer).call{value: _totalAmount}("");
            require(sent, "Native refund failed");
        } else {
            // ERC20
            IERC20(_tokenAddress).transfer(_payer, _totalAmount);
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

        require(courseId > 0 && courseId <= courseCounter, "Invalid courseId");
        require(fromIndex <= toIndex, "Invalid index range");
        require(
            fromIndex > 0 && toIndex <= saleCounterPerCourse[courseId],
            "Invalid index range"
        );

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

        require(
            isAuthorizedWithdrawer[msg.sender][courseId],
            "Not authorized withdrawer for this course"
        );

        _withdrawCoursePayments(courseId, fromIndex, toIndex);
    }

    function _withdrawCoursePayments(
        uint256 courseId,
        uint256 fromIndex,
        uint256 toIndex
    ) internal {
        uint256[] memory refunded = new uint256[](toIndex - fromIndex + 1);
        uint256[] memory withdrawn = new uint256[](toIndex - fromIndex + 1);
        uint256[] memory inWindow = new uint256[](toIndex - fromIndex + 1);
        uint256[] memory completed = new uint256[](toIndex - fromIndex + 1);

        uint r = 0;
        uint w = 0;
        uint i = 0;
        uint c = 0;

        for (uint256 j = fromIndex; j <= toIndex; j++) {
            uint256 paymentId = courseSaleRecords[courseId][i];
            if (paymentId == 0) break; //bu gereklimi?

            Payment storage p = payments[paymentId];

            if (p.isRefunded) {
                refunded[r++] = j;
                continue;
            }

            if (p.isWithdrawn) {
                withdrawn[w++] = j;
                continue;
            }

            if (p.endOfRefundWindow >= block.timestamp) {
                inWindow[i++] = j;
                continue;
            }

            p.isWithdrawn = true; // Mark as withdrawn before processing
            completed[c++] = j;

            if (p.tokenAddress == address(0)) {
                (bool sent, ) = payable(msg.sender).call{
                    value: p.instructorShare
                }("");
                require(sent, "Native token transfer failed");
            } else {
                IERC20(p.tokenAddress).transfer(msg.sender, p.instructorShare);
            }
        }

        // Emit only used portion of arrays
        emit CoursePaymentsWithdrawn(
            courseId,
            slice(refunded, r),
            slice(withdrawn, w),
            slice(inWindow, i),
            slice(completed, c)
        );
    }

    function slice(
        uint256[] memory array,
        uint256 length
    ) internal pure returns (uint256[] memory) {
        uint256[] memory result = new uint256[](length);
        for (uint256 i = 0; i < length; i++) {
            result[i] = array[i];
        }
        return result;
    }

    event CoursePaymentsWithdrawn(
        uint256 indexed courseId,
        uint256[] refundedIndexes,
        uint256[] withdrawnIndexes,
        uint256[] inWindowIndexes,
        uint256[] completedIndexes
    );

    receive() external payable {}
}

/*

function _withdrawCoursePayments(
    uint256 courseId,
    uint256 fromIndex,
    uint256 toIndex
) internal {
    for (uint256 i = fromIndex; i <= toIndex; i++) {
        uint256 paymentId = courseSaleRecords[courseId][i];
        if (paymentId == 0) continue;

        Payment storage p = payments[paymentId];

        if (p.isRefunded || p.isWithdrawn || p.endOfRefundWindow >= block.timestamp) {
            continue;
        }

        p.isWithdrawn = true;

        if (p.tokenAddress == address(0)) {
            (bool sent, ) = payable(msg.sender).call{value: p.instructorShare}("");
            require(sent, "Native transfer failed");
        } else {
            IERC20(p.tokenAddress).transfer(msg.sender, p.instructorShare);
        }

        emit CoursePaymentWithdrawn(
            courseId,
            i,
            paymentId,
            p.tokenAddress,
            p.instructorShare
        );
    }
}

*/
