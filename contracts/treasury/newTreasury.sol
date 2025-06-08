// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";

interface IVoucherVerifier {
    function verifyCourseVoucher(
        address instructor,
        address redeemer,
        string calldata uri,
        uint256 validUntil,
        bytes calldata signature
    ) external view returns (address);
}

contract NewTreasury is AccessControl {
    bytes32 public constant BACKEND_ROLE = keccak256("BACKEND_ROLE");
    bytes32 public constant FOUNDATION_ROLE = keccak256("FOUNDATION_ROLE");
    bytes32 public constant INSTRUCTOR_ROLE = keccak256("INSTRUCTOR_ROLE"); //??

    constructor(address foundation) {
        _grantRole(DEFAULT_ADMIN_ROLE, foundation);
        _grantRole(FOUNDATION_ROLE, foundation);
        _grantRole(BACKEND_ROLE, msg.sender);
    }

    struct Course {
        string uri;
        bool sellable;
    }

    struct Payment {
        uint256 courseId;
        address buyer; 
        address tokenAddress; // erc20 adressi or 0x0 for native token
        uint256 amount;
        uint256 timestamp; // end of refund window
        bool isRefunded; // true if refunded
    }

    struct CourseVoucher {
        address[] authorizedWithdrawers;
        address redeemer;
        string uri;
        uint256 validUntil;
        bytes signature;
    }

    IVoucherVerifier public voucherVerifier;

    uint256 public courseCounter;
    uint256 public paymentCounter;
    uint256 public refundWindow = 20 days;

    mapping(uint256 => Course) public courses; // courseId => Course struct
    mapping(uint256 => address[]) public authorizedWithdrawers; // courseId => list of addresses authorized to withdraw
    mapping(address => (uint256 => bool)) public isAuthorizedWithdrawer; // address => true if the address is authorized to withdraw
    
    mapping(uint256 => Payment) public payments; // paymentId => Payment struct
    mapping(address => uint256[]) public ownedCourses; // buyer => list of courseIds owned by the buyer
    mapping(address => mapping (uint256 => bool) ) public hasOwnedCourse; // buyer => courseId => true if the buyer has owned the course

    mapping(address => uint256[]) public ownedPayments; // buyer => list of paymentIds owned by the buyer


    modifier onlyWithdrawer(uint256 courseId) {
        bool found = false;
        for (uint i = 0; i < authorizedWithdrawers[courseId].length; i++) {
            if (authorizedWithdrawers[courseId][i] == msg.sender) {
                found = true;
                break;
            }
        }
        require(found, "Not authorized to withdraw");
        _;
    }

    function setVoucherVerifier(
        address verifier
    ) external onlyRole(FOUNDATION_ROLE) {
        voucherVerifier = IVoucherVerifier(verifier);
    }

function createCourseWithVoucher(
    CourseVoucher calldata voucher
) external {
    require(voucher.authorizedWithdrawers.length > 0, "At least one withdrawer required");

    for (uint i = 0; i < voucher.authorizedWithdrawers.length; i++) {
        require(voucher.authorizedWithdrawers[i] != address(0), "Zero address not allowed");
    }

    address signer = voucherVerifier.verifyCourseVoucher(
        voucher.authorizedWithdrawers[0], // signer olarak ilk withdrawer varsayımı
        voucher.redeemer,
        voucher.uri,
        voucher.validUntil,
        voucher.signature
    );

    // signer valid mi kontrolü: redeemer, authorizedWithdrawer veya msg.sender
    bool isValidSigner = signer == voucher.redeemer || signer == msg.sender;
    for (uint i = 0; i < voucher.authorizedWithdrawers.length && !isValidSigner; i++) {
        if (signer == voucher.authorizedWithdrawers[i]) {
            isValidSigner = true;
        }
    }
    require(isValidSigner, "Invalid or unauthorized signature");

    if (msg.sender != voucher.redeemer) {
        require(
            hasRole(INSTRUCTOR_ROLE, msg.sender),
            "Only instructor or redeemer can create course"
        );
    }

    require(voucher.validUntil >= block.timestamp, "Voucher expired");
    require(bytes(voucher.uri).length > 0, "Course URI empty");

    uint256 newCourseId = ++courseCounter;
    courses[newCourseId] = Course({
        uri: voucher.uri,
        sellable: true
    });

    for (uint i = 0; i < voucher.authorizedWithdrawers.length; i++) {
        address withdrawer = voucher.authorizedWithdrawers[i];
        authorizedWithdrawers[newCourseId].push(withdrawer);
        isAuthorizedWithdrawer[withdrawer][newCourseId] = true;
    }

    emit CourseCreated(newCourseId);
}



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

    function updateWithdrawers(
        uint256 courseId,
        address[] calldata newList
    ) external onlyWithdrawer(courseId) {
        require(newList.length > 0, "At least one address required");
        delete authorizedWithdrawers[courseId];
        for (uint i = 0; i < newList.length; i++) {
            require(newList[i] != address(0), "Zero address not allowed");
            authorizedWithdrawers[courseId].push(newList[i]);
        }
    }

    function _isAuthorizedWithdrawer(
        uint256 courseId,
        address user
    ) internal view returns (bool) {
        address[] storage list = authorizedWithdrawers[courseId];
        for (uint i = 0; i < list.length; i++) {
            if (list[i] == user) return true;
        }
        return false;
    }

    receive() external payable {}
}
