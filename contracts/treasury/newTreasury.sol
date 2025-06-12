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

    mapping(uint256 => Payment) public payments; // paymentId => Payment struct
    mapping(address => uint256[]) public ownedCourses; // buyer => list of courseIds owned by the buyer
    mapping(address => mapping(uint256 => bool)) public hasOwnedCourse; // buyer => courseId => true if the buyer has owned the course

    mapping(address => uint256[]) public ownedPayments; // buyer => list of paymentIds owned by the buyer

    struct Payment {
        uint256 courseId;
        address buyer;
        address tokenAddress; // erc20 adressi or 0x0 for native token
        uint256 amount;
        uint256 timestamp; // end of refund window
        bool isRefunded; // true if refunded
    }

    uint256 public paymentCounter;
    uint256 public refundWindow = 20 days;

    function recordPayment(
        uint256 courseId,
        address buyer,
        uint256 amount
    ) external onlyRole(BACKEND_ROLE) {
        payments[++paymentCounter] = Payment({
            id: paymentCounter,
            courseId: courseId,
            buyer: buyer,
            amount: amount,
            timestamp: block.timestamp,
            refunded: false
        });
        ownedCourses[buyer].push(courseId);

        emit PaymentRecorded(paymentCounter, courseId, buyer, amount);
    }

    function refund(uint256 paymentId) external onlyRole(BACKEND_ROLE) {
        require(paymentId <= paymentCounter, "Invalid paymentId");
        payments[paymentId].refunded = true;

        emit Refunded(paymentId);
    }

    function withdraw(uint256 paymentId, address to) external {
        Payment storage p = payments[paymentId];
        require(!p.refunded, "Payment refunded");
        require(
            block.timestamp >= p.timestamp + refundWindow,
            "Refund window not passed"
        );

        require(to != address(0), "Cannot withdraw to zero");
        require(p.amount > 0, "Already withdrawn");

        require(
            _isAuthorizedWithdrawer(p.courseId, msg.sender),
            "Not authorized withdrawer"
        );

        uint amount = p.amount;
        p.amount = 0; // prevent reentrancy
        (bool success, ) = to.call{value: amount}("");
        require(success, "Withdraw failed");

        emit Withdrawn(paymentId, to);
    }

    receive() external payable {}
}
