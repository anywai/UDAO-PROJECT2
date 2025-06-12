// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";

contract NewTreasury is AccessControl {
    bytes32 public constant BACKEND_ROLE = keccak256("BACKEND_ROLE");
    bytes32 public constant FOUNDATION_ROLE = keccak256("FOUNDATION_ROLE");

    constructor(address foundation) {
        _grantRole(DEFAULT_ADMIN_ROLE, foundation);
        _grantRole(FOUNDATION_ROLE, foundation);
        _grantRole(BACKEND_ROLE, msg.sender);
    }

    struct Course {
        string uri;
        bool sellable;
        address mainWithdrawer;
    }
    struct NewCourseVoucher {
        string uri;
        address redeemer;
        uint256 validUntil;
        address mainWithdrawer;
        address extraWithdrawer1; // optional 0x0 address for not used
        address extraWithdrawer2; // optional 0x0 address for not used
        address extraWithdrawer3; // optional 0x0 address for not used
        bytes signature;
    }

    struct UpdateCourseVoucher {
        uint256 courseId;
        bool sellable; // true if sellable, false if not
        string uri;
        address redeemer;
        uint256 validUntil;
        address mainWithdrawer;
        address extraWithdrawer1; // optional 0x0 address for not used
        address extraWithdrawer2; // optional 0x0 address for not used
        address extraWithdrawer3; // optional 0x0 address for not used
        bytes signature;
    }

    bytes32 private constant COURSE_VOUCHER_TYPEHASH =
        keccak256(
            "NewCourseVoucher(string uri,address redeemer,uint256 validUntil,address mainWithdrawer,address extraWithdrawer1,address extraWithdrawer2,address extraWithdrawer3)"
        );
    bytes32 private constant UPDATE_COURSE_VOUCHER_TYPEHASH =
        keccak256(
            "UpdateCourseVoucher(uint256 courseId,bool sellable,string uri,address redeemer,uint256 validUntil,address mainWithdrawer,address extraWithdrawer1,address extraWithdrawer2,address extraWithdrawer3)"
        );

    uint256 public courseCounter;
    mapping(uint256 => Course) public courses; // courseId => Course struct
    mapping(uint256 => address[]) public authorizedWithdrawers; // courseId => list of authorized withdrawers
    mapping(address => mapping(uint256 => bool)) public isAuthorizedWithdrawer; // withdrawer => courseId => true if the withdrawer is authorized for the course

    event CourseCreated(uint256 indexed courseId);
    event CourseUpdated(
        uint256 indexed courseId,
        string uri,
        bool sellable,
        address mainWithdrawer,
        address extraWithdrawer1,
        address extraWithdrawer2,
        address extraWithdrawer3
    );

    function createCourseWithVoucher(
        NewCourseVoucher calldata voucher
    ) external {
        //Basic requirements
        require(voucher.validUntil > block.timestamp, "Voucher expired");
        require(
            voucher.mainWithdrawer != address(0),
            "Main withdrawer required"
        );
        require(bytes(voucher.uri).length > 0, "Course URI empty");
        require(
            msg.sender == voucher.redeemer,
            "Only redeemer can use this voucher to create course"
        );
        // Signature verification
        // Get encoded fields for NewCourseVoucher struct
        bytes memory encodedWithType = abi.encode(
            COURSE_VOUCHER_TYPEHASH,
            keccak256(bytes(voucher.uri)),
            voucher.redeemer,
            voucher.validUntil,
            voucher.mainWithdrawer,
            voucher.extraWithdrawer1,
            voucher.extraWithdrawer2,
            voucher.extraWithdrawer3
        );
        // Recover the signer with ECDSA using digest and signature
        address signer = _verifyVoucher(encodedWithType, voucher.signature);

        // Check if the signer has the BACKEND_ROLE
        require(
            hasRole(BACKEND_ROLE, signer), //  VOUCHER_VERIFIER
            "Signature invalid or unauthorized"
        );
        // If redeemer is not the main withdrawer, check if the redeemer is backend role
        if (voucher.redeemer != voucher.mainWithdrawer) {
            require(
                hasRole(BACKEND_ROLE, voucher.redeemer),
                "Redeemer must be backend role if not main withdrawer"
            );
        }
        // Course creation
        unchecked {
            courseCounter++;
        } //less gass cost than courseCounter++
        uint256 newCourseId = courseCounter;
        courses[newCourseId] = Course({
            uri: voucher.uri,
            sellable: true,
            mainWithdrawer: voucher.mainWithdrawer
        });

        // Set authorizedWithdrawers list and update isAuthorizedWithdrawer mapping
        _setAuthorizedWithdrawers(
            false, // _clearPrevious is false because this is a new course
            newCourseId,
            voucher.mainWithdrawer,
            voucher.extraWithdrawer1,
            voucher.extraWithdrawer2,
            voucher.extraWithdrawer3
        );

        emit CourseCreated(newCourseId);
    }

    function _setAuthorizedWithdrawers(
        bool _clearPreviousWithdrawers,
        uint256 _courseId,
        address _main,
        address _extra1,
        address _extra2,
        address _extra3
    ) internal {
        if (_clearPreviousWithdrawers) {
            // clear previous isAuthorizedWithdrawer mapping according to authorizedWithdrawers list
            address[] memory previousWithdrawers = authorizedWithdrawers[
                _courseId
            ];
            for (uint i = 0; i < previousWithdrawers.length; i++) {
                isAuthorizedWithdrawer[previousWithdrawers[i]][
                    _courseId
                ] = false;
            }
        }
        // initialize authorized withdrawers mapping
        authorizedWithdrawers[_courseId] = new address[](0);
        // deal with main withdrawer
        _addWithdrawer(_courseId, _main);
        // deal with extra withdrawers
        _addWithdrawer(_courseId, _extra1);
        _addWithdrawer(_courseId, _extra2);
        _addWithdrawer(_courseId, _extra3);
    }

    function _addWithdrawer(uint256 _courseId, address addr) internal {
        if (addr != address(0)) {
            authorizedWithdrawers[_courseId].push(addr);
            isAuthorizedWithdrawer[addr][_courseId] = true;
        }
    }

    function updateCourseWithVoucher(
        UpdateCourseVoucher calldata voucher
    ) external {
        require(voucher.validUntil >= block.timestamp, "Voucher expired");
        require(
            voucher.mainWithdrawer != address(0),
            "Main withdrawer required"
        );
        require(bytes(voucher.uri).length > 0, "Course URI empty");
        require(
            msg.sender == voucher.redeemer,
            "Only redeemer can use this voucher"
        );
        require(
            voucher.courseId > 0 && voucher.courseId <= courseCounter,
            "Invalid courseId"
        );
        // Signature verification
        // Get encoded fields for UpdateCourseVoucher struct
        bytes memory encodedWithType = abi.encode(
            UPDATE_COURSE_VOUCHER_TYPEHASH,
            voucher.courseId,
            voucher.sellable,
            keccak256(bytes(voucher.uri)),
            voucher.redeemer,
            voucher.validUntil,
            voucher.mainWithdrawer,
            voucher.extraWithdrawer1,
            voucher.extraWithdrawer2,
            voucher.extraWithdrawer3
        );

        // Recover the signer with ECDSA using digest and signature
        address signer = _verifyVoucher(encodedWithType, voucher.signature);

        // Check if the signer has the BACKEND_ROLE
        require(
            hasRole(BACKEND_ROLE, signer),
            "Signature invalid or unauthorized"
        );

        if (!isAuthorizedWithdrawer[voucher.redeemer][voucher.courseId]) {
            // If redeemer is not authorized withdrawer, check if the redeemer has backend role
            require(
                hasRole(BACKEND_ROLE, voucher.redeemer),
                "Redeemer must be backend role or authorized withdrawer"
            );
        }

        // update courses mapping
        courses[voucher.courseId] = Course({
            uri: voucher.uri,
            sellable: voucher.sellable,
            mainWithdrawer: voucher.mainWithdrawer
        });

        // set authorizedWithdrawers list and update isAuthorizedWithdrawer mapping
        _setAuthorizedWithdrawers(
            true, // _clearPrevious is true because this is an update
            voucher.courseId,
            voucher.mainWithdrawer,
            voucher.extraWithdrawer1,
            voucher.extraWithdrawer2,
            voucher.extraWithdrawer3
        );

        emit CourseUpdated(
            voucher.courseId,
            voucher.uri,
            voucher.sellable,
            voucher.mainWithdrawer,
            voucher.extraWithdrawer1,
            voucher.extraWithdrawer2,
            voucher.extraWithdrawer3
        );
    }

    function _verifyVoucher(
        bytes memory encodedFieldsWithType,
        bytes memory signature
    ) internal view returns (address) {
        bytes32 digest = _hashTypedDataV4(keccak256(encodedFieldsWithType));
        return ECDSA.recover(digest, signature);
    }

    ////////////PAYMENT LOGIC////////////
    ////////////PAYMENT LOGIC////////////
    ////////////PAYMENT LOGIC////////////
    ////////////PAYMENT LOGIC////////////
    event ContentPurchased(
        uint256 indexed paymentId,
        uint256 indexed courseId,
        address indexed payer,
        address courseReceiver,
        address tokenAddress,
        uint256 totalAmount
    );

    ////////////PAYMENT LOGIC////////////
    uint256 public paymentCounter;
    mapping(uint256 => Payment) public payments; // paymentId => Payment struct

    mapping(uint256 => uint256) public anyCourseSaleCounter; // courseId => howManySalesMadeForThisCourse
    mapping(uint256 => mapping(uint256 => uint256)) public anyCourseSales; // courseId => (coursesSaleCounter => paymentId)

    mapping(address => uint256[]) public ownedCourses; // aUser => list of courseIds owned by the buyer
    mapping(address => mapping(uint256 => uint256)) public ownedCourseOneIndex; // aUser => courseId => index in the ownedCourses array
    mapping(address => mapping(uint256 => bool)) public hasOwnedCourse; // aUser => courseId => true if the buyer has owned the course

    struct BuyContentVoucher {
        uint256 courseId;
        address redeemer; // who pays for the course
        address courseReceiver; // who will owns the course after payment
        address tokenAddress; // erc20 adressi or 0x0 for native token
        uint256 coursePrice; // Total amount of the payment
        bytes signature; // signature of the voucher
    }

    bytes32 private constant BUY_CONTENT_VOUCHER_TYPEHASH =
        keccak256(
            "BuyContentVoucher(uint256 courseId,address redeemer,address courseReceiver,address tokenAddress,uint256 coursePrice)"
        );

    struct Payment {
        uint256 courseId;
        address payer;
        address courseReceiver; // who owns the course after payment
        address tokenAddress; // erc20 adressi or 0x0 for native token
        uint256 totalAmount; // total amount of the payment
        uint256 instructorShare; // amount delivered to the instructor
        uint256 foundationShare; // amount delivered to the foundation
        uint256 governanceShare; // amount delivered to the governance
        uint256 jurorShare; // amount delivered to the juror
        uint256 validatorShare; // amount delivered to the validator
        uint256 endOfRefundWindow; // end of refund window
        bool isRefunded; // true if refunded
        bool isWithdrawn; // true if withdrawn
    }

    uint256 public refundWindow = 20 days;

    uint256 csFoundCut = 4000; // %4 course sale foundation cut
    uint256 csGoverCut = 1000; // %1 course sale governance cut
    uint256 csJurorCut = 1000; // %1 course sale juror cut
    uint256 csValidCut = 1000; // %1 course sale valid cut
    uint256 csTotalCut = csFoundCut + csGoverCut + csJurorCut + csValidCut;

    event CourseCutsUpdated(
        uint256 foundationCut,
        uint256 governanceCut,
        uint256 jurorCut,
        uint256 validatorCut,
        uint256 totalCut
    );

    function setCourseCuts(
        uint256 _csFoundCut,
        uint256 _csGoverCut,
        uint256 _csJurorCut,
        uint256 _csValidCut
    ) external {
        require(
            hasRole(BACKEND_ROLE, msg.sender) ||
                hasRole(FOUNDATION_ROLE, msg.sender),
            "Not authorized"
        );

        uint256 newTotal = _csFoundCut +
            _csGoverCut +
            _csJurorCut +
            _csValidCut;
        require(newTotal < 100000, "Cuts can't exceed 100%");

        csFoundCut = _csFoundCut;
        csGoverCut = _csGoverCut;
        csJurorCut = _csJurorCut;
        csValidCut = _csValidCut;
        csTotalCut = newTotal;

        emit CourseCutsUpdated(
            csFoundCut,
            csGoverCut,
            csJurorCut,
            csValidCut,
            csTotalCut
        );
    }

    function _calculateCourseCutShares(
        uint256 _totalAmount
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
        goverShare = (_totalAmount * csGoverCut) / csTotalCut;
        jurorShare = (_totalAmount * csJurorCut) / csTotalCut;
        validShare = (_totalAmount * csValidCut) / csTotalCut;
        foundShare = (_totalAmount * csFoundCut) / csTotalCut;
        uint256 cutSum = foundShare + goverShare + jurorShare + validShare;
        instructorShare = _totalAmount - cutSum;
    }

    function buyContentWithVoucher(
        BuyContentVoucher calldata voucher
    ) external payable {
        require(
            voucher.courseId > 0 && voucher.courseId <= courseCounter,
            "Invalid courseId"
        );
        require(courses[voucher.courseId].sellable, "Course is not sellable");
        require(
            voucher.redeemer == msg.sender,
            "Only redeemer can use this voucher"
        );
        //content receiver has to be dont have the course already
        require(
            !hasOwnedCourse[voucher.courseReceiver][voucher.courseId],
            "Content receiver already owns this course"
        );
        //TODO: token address must be valid supply of erc20 token should be greater than 0
        //course price must be greater than 0
        require(voucher.coursePrice > 0, "Course price must be greater than 0");

        // Signature verification
        // Get encoded fields for BuyContentVoucher struct
        bytes memory encodedWithType = abi.encode(
            BUY_CONTENT_VOUCHER_TYPEHASH,
            voucher.courseId,
            voucher.redeemer,
            voucher.courseReceiver,
            voucher.tokenAddress,
            voucher.coursePrice
        );
        // Recover the signer with ECDSA using digest and signature
        address signer = _verifyVoucher(encodedWithType, voucher.signature);

        // Check if the signer has the BACKEND_ROLE
        require(
            hasRole(BACKEND_ROLE, signer),
            "Signature invalid or unauthorized"
        );

        // calculate shares
        (
            uint256 foundShare,
            uint256 goverShare,
            uint256 jurorShare,
            uint256 validShare,
            uint256 instructorShare
        ) = _calculateCourseCutShares(voucher.coursePrice);

        // check if the payment is made in native token or erc20 token
        if (voucher.tokenAddress == address(0)) {
            // payment in native token
            require(
                msg.value == voucher.coursePrice,
                "Incorrect amount sent for native token payment"
            );
        } else {
            // payment in erc20 token
            require(
                msg.value == 0,
                "Native token payment not allowed for ERC20 token purchase"
            );
            // transfer the erc20 token from redeemer to this contract
            IERC20(voucher.tokenAddress).transferFrom(
                voucher.redeemer,
                address(this),
                voucher.coursePrice
            );
        }
        // save the payment details
        paymentCounter++;
        uint256 newPaymentId = paymentCounter;
        payments[newPaymentId] = Payment({
            courseId: voucher.courseId,
            payer: voucher.redeemer,
            courseReceiver: voucher.courseReceiver,
            tokenAddress: voucher.tokenAddress,
            totalAmount: voucher.coursePrice,
            instructorShare: instructorShare,
            foundationShare: foundShare,
            governanceShare: goverShare,
            jurorShare: jurorShare,
            validatorShare: validShare,
            endOfRefundWindow: block.timestamp + refundWindow,
            isRefunded: false,
            isWithdrawn: false
        });
        // increase anyCourseSaleCounter for this course
        anyCourseSaleCounter[voucher.courseId]++;
        // save paymentId to anyCourseSales mapping according to CourseSaleCounter for this course
        anyCourseSales[voucher.courseId][
            anyCourseSaleCounter[voucher.courseId]
        ] = newPaymentId;

        // add the courseId to the ownedCourses mapping
        ownedCourses[voucher.courseReceiver].push(voucher.courseId);
        // save the index of the courseId in the ownedCourses mapping
        ownedCourseOneIndex[voucher.courseReceiver][
            voucher.courseId
        ] = ownedCourses[voucher.courseReceiver].length;
        // update hasOwnedCourse mapping
        hasOwnedCourse[voucher.courseReceiver][voucher.courseId] = true;

        emit ContentPurchased(
            newPaymentId,
            voucher.courseId,
            voucher.redeemer,
            voucher.courseReceiver,
            voucher.tokenAddress,
            voucher.coursePrice
        );
    }

    //REFUND LOGIC

    struct RefundCourseVoucher {
        uint256 paymentId;
        address redeemer;
        bytes signature;
    }

    bytes32 private constant REFUND_COURSE_VOUCHER_TYPEHASH =
        keccak256("RefundCourseVoucher(uint256 paymentId,address redeemer)");

    event CourseRefunded(
        uint256 indexed paymentId,
        uint256 amount,
        address indexed receiver,
        address tokenAddress
    );

    function refundContentWithVoucher(
        RefundCourseVoucher calldata voucher
    ) external {
        require(
            voucher.paymentId > 0 && voucher.paymentId <= paymentCounter,
            "Invalid paymentId"
        );

        Payment storage payment = payments[voucher.paymentId];

        require(!payment.isRefunded, "Already refunded");
        require(!payment.isWithdrawn, "Already withdrawn");
        require(
            payment.endOfRefundWindow >= block.timestamp,
            "Refund window passed"
        );
        require(voucher.redeemer == msg.sender, "Not redeemer");

        // Signature verification
        bytes memory encoded = abi.encode(
            BUY_CONTENT_REFUND_VOUCHER_TYPEHASH,
            voucher.paymentId,
            voucher.redeemer
        );
        address signer = _verifyVoucher(encoded, voucher.signature);
        require(
            hasRole(BACKEND_ROLE, signer),
            "Signature invalid or unauthorized"
        );

        // Mark refunded before transfer to prevent re-entrancy
        payment.isRefunded = true;

        // update hasOwnedCourse mapping
        hasOwnedCourse[payment.courseReceiver][payment.courseId] = false;
        // remove the courseId from the ownedCourses list and update the indexes
        uint256 courseIndex = ownedCourseOneIndex[payment.courseReceiver][
            payment.courseId
        ];
        require(courseIndex > 0, "Course not owned by receiver");
        uint256 lastIndex = ownedCourses[payment.courseReceiver].length;
        uint256 lastCourseId = ownedCourses[payment.courseReceiver][
            lastIndex - 1
        ];

        //swap & pop
        ownedCourses[payment.courseReceiver][courseIndex - 1] = lastCourseId; // swap with the last element
        ownedCourseOneIndex[payment.courseReceiver][lastCourseId] = courseIndex; // update the index of the last element

        ownedCourses[payment.courseReceiver].pop(); // remove the last element
        delete ownedCourseOneIndex[payment.courseReceiver][payment.courseId]; // delete the index of the removed courseId

        // Transfer refund
        if (payment.tokenAddress == address(0)) {
            // native token
            (bool sent, ) = payable(payment.payer).call{
                value: payment.totalAmount
            }("");
            require(sent, "Native refund failed");
        } else {
            // ERC20
            IERC20(payment.tokenAddress).transfer(
                payment.payer,
                payment.totalAmount
            );
        }

        emit CourseRefunded(
            voucher.paymentId,
            payment.totalAmount,
            payment.payer,
            payment.tokenAddress
        );
    }

    // withdraw logic
    struct WithdrawVoucher {
        uint256 courseId;
        uint256 fromIndex; // inclusive
        uint256 toIndex; // inclusive
        address redeemer;
        bytes signature;
    }

    bytes32 private constant WITHDRAW_VOUCHER_TYPEHASH =
        keccak256(
            "WithdrawVoucher(uint256 courseId,uint256 fromIndex,uint256 toIndex,address redeemer)"
        );

    event CoursePaymentsWithdrawn(
        uint256 indexed courseId,
        uint256 fromIndex,
        uint256 toIndex,
        address indexed redeemer,
        address tokenAddress,
        uint256 totalAmount
    );

    function withdrawPaymentsWithVoucher(
        WithdrawVoucher calldata voucher
    ) external {
        require(
            voucher.courseId > 0 && voucher.courseId <= courseCounter,
            "Invalid courseId"
        );
        require(voucher.fromIndex <= voucher.toIndex, "Invalid index range");
        require(voucher.redeemer == msg.sender, "Not redeemer");

        // Signature verification
        bytes32 structHash = keccak256(
            abi.encode(
                WITHDRAW_VOUCHER_TYPEHASH,
                voucher.courseId,
                voucher.fromIndex,
                voucher.toIndex,
                voucher.redeemer
            )
        );
        address signer = _verifyVoucher(structHash, voucher.signature);
        require(
            hasRole(BACKEND_ROLE, signer),
            "Signature invalid or unauthorized"
        );

        require(
            isAuthorizedWithdrawer[voucher.redeemer][voucher.courseId],
            "Not authorized withdrawer for this course"
        );

        uint256 totalAmount = 0;
        address tokenAddress = address(0); // to be set after first match

        for (uint256 i = voucher.fromIndex; i <= voucher.toIndex; i++) {
            uint256 paymentId = anyCourseSales[voucher.courseId][i];
            if (paymentId == 0) continue; // no payment recorded at this index

            Payment storage payment = payments[paymentId];
            if (payment.isRefunded || payment.isWithdrawn) continue;

            // Enforce consistent token
            if (totalAmount == 0) {
                tokenAddress = payment.tokenAddress;
            } else {
                require(
                    payment.tokenAddress == tokenAddress,
                    "Inconsistent token type"
                );
            }

            totalAmount += payment.instructorShare;
            payment.isWithdrawn = true;
        }

        require(totalAmount > 0, "Nothing to withdraw");

        // Transfer payment
        if (tokenAddress == address(0)) {
            (bool sent, ) = payable(voucher.redeemer).call{value: totalAmount}(
                ""
            );
            require(sent, "Native transfer failed");
        } else {
            IERC20(tokenAddress).transfer(voucher.redeemer, totalAmount);
        }

        emit CoursePaymentsWithdrawn(
            voucher.courseId,
            voucher.fromIndex,
            voucher.toIndex,
            voucher.redeemer,
            tokenAddress,
            totalAmount
        );
    }

    receive() external payable {}
}
