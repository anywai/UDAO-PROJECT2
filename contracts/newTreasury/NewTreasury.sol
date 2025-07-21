// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/cryptography/draft-EIP712.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
using SafeERC20 for IERC20;

interface IGovernanceTreasury {
    function addGovernanceFunds(address tokenAddress, uint256 amount) external;
}

contract NewTreasury is AccessControl, EIP712, ReentrancyGuard {
    string private constant SIGNING_DOMAIN = "NewTreasuryVouchers";
    string private constant SIGNATURE_VERSION = "1";

    /////### ROLES AND AFFILIATIONS ###/////
    bytes32 public constant BACKEND_ROLE = keccak256("BACKEND_ROLE");
    bytes32 public constant FOUNDATION_ROLE = keccak256("FOUNDATION_ROLE");

    address public foundationWallet;
    event FoundationWalletUpdated(
        address indexed newFoundationWallet,
        address indexed previousFoundationWallet
    );

    function setFoundationWallet(address _foundationWallet) external {
        require(hasRole(FOUNDATION_ROLE, msg.sender), "Not authorized");
        require(
            _foundationWallet != address(0),
            "Foundation wallet address cannot be zero"
        );

        foundationWallet = _foundationWallet;
        _grantRole(FOUNDATION_ROLE, _foundationWallet);
        _grantRole(BACKEND_ROLE, _foundationWallet);

        // revoke foundation&backend role from the previous foundation wallet
        if (msg.sender != _foundationWallet) {
            _revokeRole(FOUNDATION_ROLE, msg.sender);
            // if still has backend role, revoke it
            if (hasRole(BACKEND_ROLE, msg.sender)) {
                _revokeRole(BACKEND_ROLE, msg.sender);
            }
        }

        emit FoundationWalletUpdated(_foundationWallet, msg.sender);
    }

    address public udaoTokenAddress;
    event UdaoTokenAddressUpdated(address indexed newUdaoTokenAddress);

    function setUdaoTokenAddress(address _udaoTokenAddress) external {
        require(hasRole(BACKEND_ROLE, msg.sender), "Not authorized");
        require(
            _udaoTokenAddress != address(0),
            "Udao token address cannot be zero"
        );

        udaoTokenAddress = _udaoTokenAddress;

        emit UdaoTokenAddressUpdated(_udaoTokenAddress);
    }

    address public governanceContract;
    event GovernanceContractUpdated(address indexed newGovernanceContract);

    function setGovernanceContract(address _governanceContract) external {
        require(hasRole(BACKEND_ROLE, msg.sender), "Not authorized");
        require(
            _governanceContract != address(0),
            "Governance contract address cannot be zero"
        );

        governanceContract = _governanceContract;

        emit GovernanceContractUpdated(_governanceContract);
    }

    function grantBackendRole(address _backendAddress) external {
        require(
            hasRole(FOUNDATION_ROLE, msg.sender),
            "Only foundation can grant backend role"
        );
        require(
            _backendAddress != address(0),
            "Backend address cannot be zero"
        );

        _grantRole(BACKEND_ROLE, _backendAddress);
    }

    function revokeBackendRole(address _backendAddress) external {
        require(
            hasRole(FOUNDATION_ROLE, msg.sender),
            "Only foundation can revoke backend role"
        );
        require(
            _backendAddress != address(0),
            "Backend address cannot be zero"
        );

        _revokeRole(BACKEND_ROLE, _backendAddress);
    }

    constructor(
        address _foundationWallet,
        address _udaoTokenAddress,
        address _governanceContract
    ) EIP712(SIGNING_DOMAIN, SIGNATURE_VERSION) {
        require(
            _foundationWallet != address(0),
            "Foundation address cannot be zero"
        );
        require(
            _udaoTokenAddress != address(0),
            "Udao token address cannot be zero"
        );
        require(
            _governanceContract != address(0),
            "Governance contract address cannot be zero"
        );

        foundationWallet = _foundationWallet; // set foundation wallet address
        governanceContract = _governanceContract; // set governance contract address
        udaoTokenAddress = _udaoTokenAddress; // set udao token address

        _grantRole(FOUNDATION_ROLE, _foundationWallet);
        _grantRole(BACKEND_ROLE, _foundationWallet); // ensure foundation wallet has the backend role
        _grantRole(BACKEND_ROLE, msg.sender);
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
    mapping(bytes32 => uint256) public uriToCourseId;

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

        // hash URI
        bytes32 uriHash = keccak256(bytes(uri));
        require(uriToCourseId[uriHash] == 0, "URI already used");

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

        // check withdrawers and redeemer and uri are valid
        _validateWithdrawersAndRedeemer(withdrawers, uri);

        courseCounter++;
        uint256 newCourseId = courseCounter;
        courses[newCourseId] = Course({uri: uri, sellable: true});
        // save uriHash to courseId to eliminate duplicate courses
        uriToCourseId[uriHash] = newCourseId;

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
        string memory newUri = voucher.uri;
        address[] memory withdrawers = voucher.withdrawers;
        address redeemer = voucher.redeemer;
        uint256 validUntil = voucher.validUntil;

        bytes32 newUriHash = keccak256(bytes(newUri));

        // create digest
        bytes32 digest = _hashTypedDataV4(
            keccak256(
                abi.encode(
                    UPDATE_COURSE_VOUCHER_TYPEHASH,
                    courseId,
                    sellable,
                    newUriHash,
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
        _validateWithdrawersAndRedeemer(withdrawers, newUri);

        require(courseId > 0 && courseId <= courseCounter, "Invalid courseId");

        // get existing course
        Course storage courseExisting = courses[courseId];

        // get old URI and compare
        bytes32 oldUriHash = keccak256(bytes(courseExisting.uri));

        // only if uri is changing
        if (oldUriHash != newUriHash) {
            require(uriToCourseId[newUriHash] == 0, "New URI already used");

            delete uriToCourseId[oldUriHash]; // clean up old
            uriToCourseId[newUriHash] = courseId; // assign new

            courseExisting.uri = newUri;
        }

        // clear previous authorized withdrawers
        address[] storage previousWithdrawers = authorizedWithdrawers[courseId]; //storage gas cheper in this case

        uint256 len = previousWithdrawers.length;
        for (uint256 i = 0; i < len; i++) {
            isAuthorizedWithdrawer[previousWithdrawers[i]][courseId] = false;
        }

        // update sellable
        if (courseExisting.sellable != sellable) {
            courseExisting.sellable = sellable;
        }
        _setAuthorizedWithdrawers(courseId, withdrawers);

        emit CourseUpdated(courseId);
    }

    function _validateWithdrawersAndRedeemer(
        address[] memory _withdrawers,
        string memory _uri
    ) internal view {
        uint256 len = _withdrawers.length; //array length

        require(len > 0, "Withdrawers required");

        require(len <= maxWithdrawer, "Max withdrawers exceeded");

        bool isRedeemerAuthorized = false;
        for (uint256 i = 0; i < len; i++) {
            address w = _withdrawers[i];
            require(w != address(0), "Withdrawer cannot be zero address");
            if (w == msg.sender) {
                isRedeemerAuthorized = true;
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
        authorizedWithdrawers[_courseId] = _withdrawers;

        uint256 len = _withdrawers.length;
        for (uint256 i = 0; i < len; i++) {
            address w = _withdrawers[i];
            isAuthorizedWithdrawer[w][_courseId] = true;
        }
    }

    /////### BASE PAYMENT SETTINGS & LOGIC ###/////
    uint256 public maxWithdrawer = 4; // max 4 withdrawers allowed

    event MaxWithdrawersUpdated(uint256 indexed maxWithdrawer);

    function setMaxWithdrawers(uint256 _maxWithdrawer) external {
        require(hasRole(BACKEND_ROLE, msg.sender), "Not authorized");
        require(_maxWithdrawer > 0, "Max withdrawers must be greater than 0");
        maxWithdrawer = _maxWithdrawer;

        emit MaxWithdrawersUpdated(_maxWithdrawer);
    }

    uint256 public refundWindow = 20 days;

    event RefundWindowUpdated(uint256 newRefundWindow);

    function setRefundWindow(uint256 _refundWindow) external {
        require(hasRole(BACKEND_ROLE, msg.sender), "Not authorized");

        uint256 oneDay = 24 * 60 * 60; // seconds in a day

        refundWindow = _refundWindow * oneDay; // convert days to seconds

        emit RefundWindowUpdated(refundWindow);
    }

    // course sale cuts with any other token else udao
    uint256 public atFoundCut = 6000; // %4 foundation cut (any token)
    uint256 public atGoverCut = 1000; // %1 governance cut (any token)

    // course sale cuts with udao token
    uint256 public utFoundCut = 4000; // %4 foundation cut (udao)
    uint256 public utGoverCut = 500; // %1 governance cut (udao)

    event CourseCutsUpdated();

    function setCourseCuts(
        uint256 _atFoundCut,
        uint256 _atGoverCut,
        uint256 _utFoundCut,
        uint256 _utGoverCut
    ) external {
        require(hasRole(BACKEND_ROLE, msg.sender), "Not authorized");

        uint256 newATotal = _atFoundCut + _atGoverCut;
        require(newATotal < 100000, "Cuts can't exceed 100%");

        uint256 newUTotal = _utFoundCut + _utGoverCut;
        require(newUTotal < 100000, "Cuts can't exceed 100%");

        atFoundCut = _atFoundCut;
        atGoverCut = _atGoverCut;

        utFoundCut = _utFoundCut;
        utGoverCut = _utGoverCut;

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
            uint256 instructorShare
        )
    {
        uint256 found = atFoundCut;
        uint256 gover = atGoverCut;

        if (_tokenAddress == udaoTokenAddress) {
            found = utFoundCut;
            gover = utGoverCut;
        }

        foundShare = (_totalAmount * found) / 100000;
        goverShare = (_totalAmount * gover) / 100000;

        instructorShare = _totalAmount - foundShare - goverShare;
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
            // payment in erc20 token
            require(msg.value == 0, "Use ERC20, not native token");
            // transfer the erc20 token from redeemer to this contract
            IERC20(_tokenAddress).safeTransferFrom(
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

        // pair paymentId with courseReceiver and courseId
        courseOwnerToPayment[_courseReceiver][_courseId] = newPaymentId;

        if (ownedCourses[_courseReceiver].length == 0) {
            // if the course receiver does not have any courses yet, initialize the mapping
            ownedCourses[_courseReceiver].push(0); // zero index always holds 0
        }

        // add the courseId to the ownedCourses mapping
        ownedCourses[_courseReceiver].push(_courseId);
        // save the index of the courseId in the ownedCourses mapping
        ownedCourseIndex[_courseReceiver][_courseId] =
            ownedCourses[_courseReceiver].length -
            1; // aslında +1 index değil çünkü satın alımda 0 pushlandı.
        // update hasOwnedCourse mapping
        hasOwnedCourse[_courseReceiver][_courseId] = true;

        emit ContentPurchased(newPaymentId, _courseId, _courseReceiver);
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

    struct RefundCourseByOwnerAndCourseIdVoucher {
        address courseOwner;
        uint256 courseId;
        address redeemer;
        uint256 validUntil; // voucher valid until timestamp
        bytes signature;
    }

    bytes32
        private constant REFUND_COURSE_BY_OWNER_AND_COURSE_ID_VOUCHER_TYPEHASH =
        keccak256(
            "RefundCourseByOwnerAndCourseIdVoucher(address courseOwner,uint256 courseId,address redeemer,uint256 validUntil)"
        );

    function refundCourseByOwnerAndCourseId(
        RefundCourseByOwnerAndCourseIdVoucher calldata voucher
    ) external nonReentrant {
        // encode the voucher fields to reduce gas cost
        address courseOwner = voucher.courseOwner;
        uint256 courseId = voucher.courseId;

        uint256 paymentId = courseOwnerToPayment[courseOwner][courseId];
        require(paymentId > 0, "No payment found for this course and owner");

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
        uint256 courseIndex = ownedCourseIndex[_receiver][_courseId];
        require(courseIndex > 0, "Course not found in receiver's owned list"); //buraya gelemedim ben
        uint256 lastIndex = ownedCourses[_receiver].length - 1;
        uint256 lastCourseId = ownedCourses[_receiver][lastIndex];

        //swap & pop
        if (courseIndex != lastIndex) {
            ownedCourses[_receiver][courseIndex] = lastCourseId; // swap with the last element
            ownedCourseIndex[_receiver][lastCourseId] = courseIndex; // update the index of the last element
        }

        ownedCourses[_receiver].pop(); // remove the last element
        delete ownedCourseIndex[_receiver][_courseId]; // delete the index of the removed courseId
        delete courseOwnerToPayment[_receiver][_courseId]; // remove the paymentId for the course owner

        // Transfer refund
        if (_tokenAddress == address(0)) {
            // native token
            (bool sent, ) = payable(_payer).call{value: _totalAmount}("");
            require(sent, "Native refund failed");
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

    event MaxWithdrawBatchSizeUpdated(uint256 indexed maxWithdrawBatchSize);

    /////### WITHDRAW LOGIC ###/////
    uint256 public maxWithdrawBatchSize = 10; // max 10 sales can be withdrawn at once

    function setMaxWithdrawRange(uint256 newRange) external {
        require(hasRole(BACKEND_ROLE, msg.sender), "Not authorized");
        require(newRange > 0, "Max withdraw range must be greater than 0");
        maxWithdrawBatchSize = newRange;

        emit MaxWithdrawBatchSizeUpdated(newRange);
    }

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
            toIndex - fromIndex + 1 <= maxWithdrawBatchSize,
            "Max withdraw range exceeded"
        );
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
            if (paymentId == 0) continue;

            Payment storage p = payments[paymentId];

            if (
                p.isRefunded ||
                p.isWithdrawn ||
                p.endOfRefundWindow > block.timestamp
            ) continue;

            try this.attemptSingleWithdrawOrRevert(paymentId, msg.sender) {
                withdrawnCompleted++;
            } catch {
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
        require(msg.sender == address(this), "Only callable internally");

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
            require(iOK);

            (bool fOK, ) = payable(foundationWallet).call{value: fShare}("");
            require(fOK);

            (bool gOK, ) = payable(governanceContract).call{value: gShare}("");
            require(gOK);
        } else {
            // ERC20 transfers
            IERC20(tokenAddress).safeTransfer(instructor, iShare);
            IERC20(tokenAddress).safeTransfer(foundationWallet, fShare);
            IERC20(tokenAddress).safeTransfer(governanceContract, gShare);
        }
        try
            IGovernanceTreasury(governanceContract).addGovernanceFunds(
                tokenAddress,
                gShare
            )
        {} catch {
            revert("Governance fund record failed");
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
        require(courseId > 0 && courseId <= courseCounter, "Invalid courseId");
        require(fromIndex <= toIndex, "Invalid index range");
        require(
            fromIndex > 0 && toIndex <= saleCounterPerCourse[courseId],
            "Index out of bounds"
        );

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

    receive() external payable {
        revert("Direct ETH not accepted"); // prevent direct ETH transfers
    }
}

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
*/
