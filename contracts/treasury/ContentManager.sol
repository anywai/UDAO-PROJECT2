// SPDX-License-Identifier: MIT
/// @title Content purchasing and cut management
pragma solidity ^0.8.4;
import "./BasePlatform.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/draft-EIP712.sol";

abstract contract ContentManager is EIP712, BasePlatform {
    string private constant SIGNING_DOMAIN = "ContentManager";
    string private constant SIGNATURE_VERSION = "1";

    /// @notice Emitted when a content is bought
    event ContentBought(
        uint256 tokenId,
        uint256[] parts,
        uint256 pricePaid,
        address buyer
    );

    /// @notice struct to hold content discount voucher information
    /// @param tokenId id of the content
    /// @param fullContentPurchase is full content purchased
    /// @param purchasedParts parts of the content purchased
    /// @param priceToPay price to pay
    /// @param validUntil date until the voucher is valid
    /// @param redeemer address of the redeemer
    /// @param giftReceiver address of the gift receiver if purchase is a gift
    /// @param signature the EIP-712 signature of all other fields in the ContentDiscountVoucher struct.
    struct ContentDiscountVoucher {
        uint256 tokenId;
        bool fullContentPurchase;
        uint256[] purchasedParts;
        uint256 priceToPay;
        uint256 validUntil;
        address redeemer;
        address giftReceiver;
        bytes signature;
    }

    /// @notice Represents a refund voucher for a coaching
    struct RefundVoucher {
        uint256 saleID;
        address instructor;
        uint256[] finalParts;
        uint256 validUntil;
        bytes signature;
    }

    /// @notice struct to hold coaching voucher information
    struct CoachingVoucher {
        address coach;
        uint256 priceToPay;
        uint256 coachingDate;
        address learner;
        bytes signature;
    }

    using Counters for Counters.Counter;
    /// @notice Used to generate unique ids for content sales
    Counters.Counter private saleID;
    /// @notice Used to generate unique ids for coaching sales
    Counters.Counter private coachingSaleID;

    struct ContentSale {
        address payee;
        address contentReceiver;
        address instructor;
        uint256 instrShare;
        uint256 totalCut;
        uint256 tokenId;
        uint256[] purchasedParts;
        bool isRefunded;
        uint256 refundablePeriod;
    }
    struct CoachingSale {
        address payee;
        address contentReceiver;
        address instructor;
        uint256 instrShare;
        uint256 totalCut;
        bool isRefunded;
        uint256 coachingDate;
        uint256 refundablePeriod;
    }

    mapping(uint256 => ContentSale) public sales;
    mapping(uint256 => CoachingSale) public coachSales;

    // wallet => content token Ids
    mapping(address => uint256[][]) ownedContents;
    // tokenId => student addresses (Coaching Related)
    mapping(uint256 => address[]) public studentList;

    /// @notice struct to hold coaching information
    /// @param coach address of the coach
    /// @param learner address of the learner
    /// @param moneyLockDeadline deadline of the money locked
    /// @param coachingPaymentAmount amount of token that coach is going to get
    /// @param isDone status of the coaching
    /// @param totalPaymentAmount total payment amount to buy coaching (includes cuts for platform)
    /// @param isRefundable is coaching refundable
    struct CoachingStructOld {
        address coach;
        address learner;
        uint256 moneyLockDeadline;
        uint256 coachingPaymentAmount;
        uint8 isDone; // 0 not done, 1 done, 2 refunded
        uint256 totalPaymentAmount;
        bool isRefundable;
    }

    // tokenId => coachingId[]  which tokens have which coachings
    mapping(uint256 => uint256[]) coachingIdsOfToken;
    // coachinId => coachingStruct  Coaching details
    mapping(uint256 => CoachingStructOld) public coachingStructs;
    uint256 private coachingIndex;

    constructor() EIP712(SIGNING_DOMAIN, SIGNATURE_VERSION) {}

    //@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@//

    /// @notice Allows users to buy content with discount voucher
    /// @param voucher discount vouchers
    function buyContentWithDiscount(
        ContentDiscountVoucher[] calldata voucher
    ) external whenNotPaused {
        /// @dev Determine the number of items in the cart
        uint256 voucherIdsLength = voucher.length;
        /// @dev Determine the RECEIVER of each item in the cart
        address[] memory contentReceiver;
        /// @dev Used for recording the price to pay for each item in the cart
        uint256[] memory priceToPay;
        /// @dev Used for recording the all roles cut for each item in the cart
        uint256[] memory totalCut;
        /// @dev Used for recording the instructor share for each item in the cart
        uint256[] memory instrShare;
        /// @dev Used for recording the total roles cut for all items in the cart
        uint256 totalTotalCut;
        /// @dev Used for recording the total instructor share for all items in the cart
        uint256 totalInstrShare;
        /// @dev Boolean flag to determine if the purchase is made by a backend role
        /// if so then this purchase is a fiat purchase
        bool isFiatPurchase;
        if (roleManager.hasRole(BACKEND_ROLE, msg.sender)) {
            isFiatPurchase = true;
        }

        /// @dev Loop through the cart
        for (uint256 i; i < voucherIdsLength; i++) {
            // make sure signature is valid and get the address of the signer
            address signer = _verifyDiscountVoucher(voucher[i]);
            require(
                roleManager.hasRole(BACKEND_ROLE, signer),
                "Signature invalid or unauthorized"
            );
            require(
                voucher[i].validUntil >= block.timestamp,
                "Voucher has expired."
            );
            require(msg.sender == voucher[i].redeemer, "You are not redeemer.");
            require(!roleManager.isBanned(msg.sender, 20), "You are banned");

            /// @dev Check the existance of content for each item in the cart
            require(
                udaoc.exists(voucher[i].tokenId) == true,
                "Content not exist!"
            );
            /// @dev Determine the RECEIVER of each item in cart, address(0) means RECEIVER is BUYER
            if (voucher[i].giftReceiver != address(0)) {
                contentReceiver[i] = voucher[i].giftReceiver;
            } else {
                require(
                    !isFiatPurchase,
                    "Fiat purchase requires a gift receiver!"
                );
                contentReceiver[i] = msg.sender;
            }
            /// @dev The RECEIVER cannot already own the content or parts which in the cart.
            require(
                _doReceiverHaveContentOrPart(
                    voucher[i].tokenId,
                    voucher[i].fullContentPurchase,
                    voucher[i].purchasedParts,
                    contentReceiver[i]
                ) == false,
                "Content or part's is already bought"
            );
            /// @dev Calculate the BUYER's, how much will pay to each item
            priceToPay[i] = calculatePriceToPay(
                voucher[i].tokenId,
                voucher[i].fullContentPurchase,
                voucher[i].purchasedParts
            );
            totalCut[i] = calculateTotalCutContentShare(priceToPay[i]);

            if (isFiatPurchase) {
                instrShare[i] = 0;
            } else {
                instrShare[i] = priceToPay[i] - totalCut[i];
            }

            totalTotalCut += totalCut[i];
            totalInstrShare += instrShare[i];
        }

        /// @dev The BUYER should have enough UDAO to pay for the cart
        require(
            udao.balanceOf(msg.sender) >= totalTotalCut + totalInstrShare,
            "Not enough UDAO sent!"
        );

        /// @dev The BUYER should approve the contract for the amount they will pay
        require(
            udao.allowance(msg.sender, address(this)) >=
                totalTotalCut + totalInstrShare,
            "Not enough allowance!"
        );

        for (uint256 i; i < voucherIdsLength; i++) {
            _buyContentwithUDAO(
                voucher[i].tokenId,
                voucher[i].fullContentPurchase,
                voucher[i].purchasedParts,
                contentReceiver[i],
                totalCut[i],
                instrShare[i]
            );
        }
        _sendCurrentGlobalCutsToGovernanceTreasury();
    }

    //@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@//
    function buyCoaching(
        CoachingVoucher calldata voucher
    ) external whenNotPaused {
        uint256 totalCut;
        uint256 instrShare;
        address learner;
        bool isFiatPurchase;

        address signer = _verifyCoachingVoucher(voucher);
        require(signer == voucher.coach, "Signature invalid or unauthorized");
        require(
            voucher.coachingDate >= block.timestamp + epochOneDay * 1,
            "Coaching date must be at least 1 day before."
        );
        require(
            voucher.coachingDate <= block.timestamp + epochOneDay * 7,
            "Coaching date must be at most 7 days before."
        );
        if (roleManager.hasRole(BACKEND_ROLE, msg.sender)) {
            learner = voucher.learner;
            isFiatPurchase = true;
        } else {
            require(msg.sender == voucher.learner, "You are not the learner.");
            require(!roleManager.isBanned(msg.sender, 21), "You are banned");
            learner = msg.sender;
        }

        totalCut = calculateTotalCutCoachingShare(voucher.priceToPay);

        if (isFiatPurchase) {
            instrShare = 0;
        } else {
            instrShare = voucher.priceToPay - totalCut;
        }

        /// @dev The BUYER should have enough UDAO to pay for the cart
        require(
            udao.balanceOf(msg.sender) >= totalCut + instrShare,
            "Not enough UDAO sent!"
        );

        /// @dev The BUYER should approve the contract for the amount they will pay
        require(
            udao.allowance(msg.sender, address(this)) >= totalCut + instrShare,
            "Not enough allowance!"
        );

        udao.transferFrom(msg.sender, address(this), totalCut + instrShare);

        uint256 transactionTime = (block.timestamp / epochOneDay);

        //transactionFuIndex determines which position it will be added to in the FutureBalances array.
        uint256 transactionFuIndex = transactionTime % refundWindow;
        _updateGlobalCoachingBalances(
            totalCut,
            transactionTime,
            transactionFuIndex
        );
        _updateInstructorBalances(
            instrShare,
            voucher.coach,
            transactionTime,
            transactionFuIndex
        );

        _saveTheSaleOnAListForRefund(
            msg.sender,
            learner,
            voucher.coach,
            instrShare,
            totalCut,
            0, //empty tokenId
            new uint256[](0), //empty purchased parts
            voucher.coachingDate,
            transactionTime + refundWindow,
            false
        );

        _sendCurrentGlobalCutsToGovernanceTreasury();
    }

    struct buyContentSpecs {
        /// @dev Determine the number of items in the cart
        uint256 tokenIdsLength;
        /// @dev Determine the RECEIVER of each item in the cart
        address[] contentReceiver;
        /// @dev Used for recording the price to pay for each item in the cart
        uint256[] priceToPay;
        /// @dev Used for recording the all roles cut for each item in the cart
        uint256[] totalCut;
        /// @dev Used for recording the instructor share for each item in the cart
        uint256[] instrShare;
        /// @dev Used for recording the total roles cut for all items in the cart
        uint256 totalTotalCut;
        /// @dev Used for recording the total instructor share for all items in the cart
        uint256 totalInstrShare;
        /// @dev Boolean flag to determine if the purchase is made by a backend role
        /// if so then this purchase is a fiat purchase
        bool isFiatPurchase;
    }

    /// @notice Allows multiple content purchases using buyContent
    /// @param tokenIds ids of the content
    /// @param fullContentPurchases is full content purchased
    /// @param purchasedParts parts of the content purchased
    /// @param giftReceivers address of the gift receiver if purchase is a gift
    function buyContent(
        uint256[] calldata tokenIds,
        bool[] calldata fullContentPurchases,
        uint256[][] calldata purchasedParts,
        address[] calldata giftReceivers
    ) external whenNotPaused {
        buyContentSpecs memory specs;
        specs.tokenIdsLength = tokenIds.length;

        if (roleManager.hasRole(BACKEND_ROLE, msg.sender)) {
            specs.isFiatPurchase = true;
        }
        /// @dev The function arguments must have equal size
        require(
            specs.tokenIdsLength == fullContentPurchases.length &&
                specs.tokenIdsLength == purchasedParts.length &&
                specs.tokenIdsLength == giftReceivers.length,
            "Array lengths are not equal!"
        );

        for (uint256 i; i < specs.tokenIdsLength; i++) {
            /// @dev Check the existance of content for each item in the cart
            require(udaoc.exists(tokenIds[i]) == true, "Content not exist!");
            /// @dev Determine the RECEIVER of each item in cart, address(0) means RECEIVER is BUYER
            if (giftReceivers[i] != address(0)) {
                specs.contentReceiver[i] = giftReceivers[i];
            } else {
                require(
                    !specs.isFiatPurchase,
                    "Fiat purchase requires a gift receiver!"
                );
                specs.contentReceiver[i] = msg.sender;
            }
            /// @dev The RECEIVER cannot already own the content or parts which in the cart.
            require(
                _doReceiverHaveContentOrPart(
                    tokenIds[i],
                    fullContentPurchases[i],
                    purchasedParts[i],
                    specs.contentReceiver[i]
                ) == false,
                "Content or part's is already bought"
            );
            /// @dev Calculate the BUYER's, how much will pay to each item
            specs.priceToPay[i] = calculatePriceToPay(
                tokenIds[i],
                fullContentPurchases[i],
                purchasedParts[i]
            );
            specs.totalCut[i] = calculateTotalCutContentShare(
                specs.priceToPay[i]
            );

            if (specs.isFiatPurchase) {
                specs.instrShare[i] = 0;
            } else {
                specs.instrShare[i] = specs.priceToPay[i] - specs.totalCut[i];
            }

            specs.totalTotalCut += specs.totalCut[i];
            specs.totalInstrShare += specs.instrShare[i];
        }

        /// @dev The BUYER should have enough UDAO to pay for the cart
        require(
            udao.balanceOf(msg.sender) >=
                specs.totalTotalCut + specs.totalInstrShare,
            "Not enough UDAO sent!"
        );

        /// @dev The BUYER should approve the contract for the amount they will pay
        require(
            udao.allowance(msg.sender, address(this)) >=
                specs.totalTotalCut + specs.totalInstrShare,
            "Not enough allowance!"
        );

        for (uint256 i; i < specs.tokenIdsLength; i++) {
            _buyContentwithUDAO(
                tokenIds[i],
                fullContentPurchases[i],
                purchasedParts[i],
                specs.contentReceiver[i],
                specs.totalCut[i],
                specs.instrShare[i]
            );
        }
        _sendCurrentGlobalCutsToGovernanceTreasury();
    }

    function _buyContentwithUDAO(
        uint256 tokenId,
        bool fullContentPurchase,
        uint256[] calldata purchasedParts,
        address contentReceiver,
        uint256 totalCut,
        uint256 instrShare
    ) internal whenNotPaused {
        // Who created and own that content?
        address instructor = udaoc.ownerOf(tokenId);

        //uint256 totalCut = calculateTotalCutContentShare(_priceToPayUdao);
        //uint256 instrShare = _priceToPayUdao - totalCut;

        udao.transferFrom(msg.sender, address(this), instrShare + totalCut);

        //timestamp returns 1694513188: 12Sep2023-10:06:28 so buyerTransactionTime is 19612.42
        //this means 19612.42 day passed since 1Jan1970-0:0:0
        //There is no fractional number in solidity so that buyerTransactionTime is 19612
        uint256 transactionTime = (block.timestamp / epochOneDay);

        //transactionFuIndex determines which position it will be added to in the FutureBalances array.
        uint256 transactionFuIndex = transactionTime % refundWindow;
        _updateGlobalContentBalances(
            totalCut,
            transactionTime,
            transactionFuIndex
        );
        _updateInstructorBalances(
            instrShare,
            instructor,
            transactionTime,
            transactionFuIndex
        );

        // give the content to the receiver
        _updateOwnedContentOrPart(
            tokenId,
            fullContentPurchase,
            purchasedParts,
            contentReceiver
        );
        _saveTheSaleOnAListForRefund(
            msg.sender,
            contentReceiver,
            instructor,
            instrShare,
            totalCut,
            tokenId,
            purchasedParts,
            0, //coachingdate
            transactionTime + refundWindow,
            true
        );

        emit ContentBought(
            tokenId,
            purchasedParts,
            totalCut + instrShare,
            msg.sender
        );
    }

    // NEW CONTENT SALE HELPER FUNCTIONS
    function _doReceiverHaveContentOrPart(
        uint256 tokenId,
        bool fullContentPurchase,
        uint256[] calldata purchasedParts,
        address contentReceiver
    ) internal view returns (bool) {
        if (fullContentPurchase = true) {
            /// @dev user address => content id => content owned by the user
            /// @dev content receiver => token Id => full content
            if (isTokenBought[contentReceiver][tokenId][0]) {
                return true;
            }
        } else {
            for (uint256 j; j < purchasedParts.length; j++) {
                uint256 part = purchasedParts[j];
                if (isTokenBought[contentReceiver][tokenId][part] == true) {
                    return true;
                }
            }
        }
        return false;
    }

    /// @notice Calculates total amount to pay for a cart purchase
    /// @param tokenIds ids of the contents
    /// @param fullContentPurchases is full content purchased
    /// @param purchasedParts parts of the content purchased
    function calculatePriceToPayInTotal(
        uint256[] calldata tokenIds,
        bool[] calldata fullContentPurchases,
        uint256[][] calldata purchasedParts
    ) external view returns (uint256) {
        uint256 tokenIdsLength = tokenIds.length;
        uint256 totalPriceToPayUdao;
        for (uint256 i; i < tokenIdsLength; i++) {
            // Calculate purchased parts (or full Content) total list price.
            totalPriceToPayUdao += calculatePriceToPay(
                tokenIds[i],
                fullContentPurchases[i],
                purchasedParts[i]
            );
        }
        return (totalPriceToPayUdao);
    }

    /// @notice Calculates price to pay for a purchase
    /// @param _tokenId id of the content
    /// @param _fullContentPurchase is full content purchased
    /// @param _purchasedParts parts of the content purchased
    function calculatePriceToPay(
        uint256 _tokenId,
        bool _fullContentPurchase,
        uint256[] calldata _purchasedParts
    ) public view returns (uint256) {
        uint256 _priceToPay;
        uint256 _pricePerPart;

        /// @dev Get the total payment amount first
        if (_fullContentPurchase) {
            _priceToPay = udaoc.getContentPrice(_tokenId, 0);
        } else {
            require(
                _purchasedParts[0] != 0,
                "Purchased parts says 0, but fullContentPurchase is false!"
            );

            for (uint256 j; j < _purchasedParts.length; j++) {
                require(
                    _purchasedParts[j] < udaoc.getPartNumberOfContent(_tokenId),
                    "Part does not exist!"
                );
                _pricePerPart = udaoc.getContentPrice(
                    _tokenId,
                    _purchasedParts[j]
                );
                _priceToPay += _pricePerPart;
            }
        }
        return _priceToPay;
    }

    function _updateGlobalContentBalances(
        uint256 totalCutContentShare,
        uint256 _transactionTime,
        uint256 _transactionFuIndex
    ) internal {
        //how many day passed since last update of instructor balance
        uint256 dayPassedGlo = _transactionTime - gContentUpdateTime;

        if (dayPassedGlo < refundWindow) {
            // if(true):There is no payment yet to be paid to the seller in the future balance array.
            // add new payment to instructor futureBalanceArray
            gContentCutFutureBalance[
                _transactionFuIndex
            ] += totalCutContentShare;
        } else {
            // if(else): The future balance array contains values that must be paid to the user.
            if (dayPassedGlo >= (refundWindow * 2)) {
                //Whole Future Balance Array must paid to user (Because (refundWindow x2)28 day passed)
                for (uint256 i = 0; i < refundWindow; i++) {
                    gContentCutCurrentBalance += gContentCutFutureBalance[i];

                    gContentCutFutureBalance[i] = 0;
                }

                // add new payment to instructor futureBalanceArray
                gContentCutFutureBalance[
                    _transactionFuIndex
                ] += totalCutContentShare;

                // you updated instructor currentBalance of instructorso declare a new time to instUpdateTime
                // why (-refundWindow + 1)? This will sustain today will be no more update on balances...
                // ...but tomarrow a transaction will produce new update.
                gContentUpdateTime = (_transactionTime - refundWindow) + 1;
            } else {
                //Just some part of Future Balance Array must paid to instructor
                uint256 dayPassedGloMod = dayPassedGlo % refundWindow;
                //minimum dayPassedInst=14 so Mod 0, maximum dayPassedInst=27 so Mod 13
                //if Mod 0 for loop works for today, if Mod 2 it works for today+ yesterday,,, if it 13
                for (uint256 i = 0; i <= dayPassedGloMod; i++) {
                    //Index of the day to be payout to instructor.
                    uint256 indexOfPayout = ((_transactionFuIndex +
                        refundWindow) - i) % refundWindow;
                    gContentCutCurrentBalance += gContentCutFutureBalance[
                        indexOfPayout
                    ];

                    gContentCutFutureBalance[indexOfPayout] = 0;
                }

                // add new payment to instructor futureBalanceArray
                gContentCutFutureBalance[
                    _transactionFuIndex
                ] += totalCutContentShare;

                // you updated instructor futureBalanceArray updated so declare a new time to instUpdateTime
                // why (-refundWindow + 1)? This will sustain today will be no more update on balances...
                // ...but tomarrow a transaction will produce new update.
                gContentUpdateTime = (_transactionTime - refundWindow) + 1;
            }
        }
    }

    function _updateGlobalCoachingBalances(
        uint256 totalCutCoachingShare,
        uint256 _transactionTime,
        uint256 _transactionFuIndex
    ) internal {
        //how many day passed since last update of instructor balance
        uint256 dayPassedGlo = _transactionTime - gCoachingUpdateTime;

        if (dayPassedGlo < refundWindow) {
            // if(true):There is no payment yet to be paid to the seller in the future balance array.
            // add new payment to instructor futureBalanceArray
            gCoachingFutureBalance[
                _transactionFuIndex
            ] += totalCutCoachingShare;
        } else {
            // if(else): The future balance array contains values that must be paid to the user.
            if (dayPassedGlo >= (refundWindow * 2)) {
                //Whole Future Balance Array must paid to user (Because (refundWindow x2)28 day passed)
                for (uint256 i = 0; i < refundWindow; i++) {
                    gCoachingCurrentBalance += gCoachingFutureBalance[i];

                    gCoachingFutureBalance[i] = 0;
                }

                // add new payment to instructor futureBalanceArray
                gCoachingFutureBalance[
                    _transactionFuIndex
                ] += totalCutCoachingShare;

                // you updated instructor currentBalance of instructorso declare a new time to instUpdateTime
                // why (-refundWindow + 1)? This will sustain today will be no more update on balances...
                // ...but tomarrow a transaction will produce new update.
                gCoachingUpdateTime = (_transactionTime - refundWindow) + 1;
            } else {
                //Just some part of Future Balance Array must paid to instructor
                uint256 dayPassedGloMod = dayPassedGlo % refundWindow;
                //minimum dayPassedInst=14 so Mod 0, maximum dayPassedInst=27 so Mod 13
                //if Mod 0 for loop works for today, if Mod 2 it works for today+ yesterday,,, if it 13
                for (uint256 i = 0; i <= dayPassedGloMod; i++) {
                    //Index of the day to be payout to instructor.
                    uint256 indexOfPayout = ((_transactionFuIndex +
                        refundWindow) - i) % refundWindow;
                    gCoachingCurrentBalance += gCoachingFutureBalance[
                        indexOfPayout
                    ];

                    gCoachingFutureBalance[indexOfPayout] = 0;
                }

                // add new payment to instructor futureBalanceArray
                gCoachingFutureBalance[
                    _transactionFuIndex
                ] += totalCutCoachingShare;

                // you updated instructor futureBalanceArray updated so declare a new time to instUpdateTime
                // why (-refundWindow + 1)? This will sustain today will be no more update on balances...
                // ...but tomarrow a transaction will produce new update.
                gCoachingUpdateTime = (_transactionTime - refundWindow) + 1;
            }
        }
    }

    function _updateInstructorBalances(
        uint256 _instrShare,
        address _inst,
        uint256 _transactionTime,
        uint256 _transactionFuIndex
    ) internal {
        //how many day passed since last update of instructor balance
        uint256 dayPassedInst = _transactionTime - instUpdateTime[_inst];
        uint256 tempSafetyBalance; // for reentrancy check
        if (dayPassedInst < refundWindow) {
            // if(true):There is no payment yet to be paid to the seller in the future balance array.
            // add new payment to instructor futureBalanceArray
            instFutureBalance[_inst][_transactionFuIndex] += _instrShare;
        } else {
            // if(else): The future balance array contains values that must be paid to the user.
            if (dayPassedInst >= (refundWindow * 2)) {
                //Whole Future Balance Array must paid to user (Because (refundWindow x2)28 day passed)
                for (uint256 i = 0; i < refundWindow; i++) {
                    tempSafetyBalance = instFutureBalance[_inst][i];
                    instFutureBalance[_inst][i] = 0;
                    instCurrentBalance[_inst] += tempSafetyBalance;
                }
                // add new payment to instructor futureBalanceArray
                instFutureBalance[_inst][_transactionFuIndex] += _instrShare;

                // you updated instructor currentBalance of instructorso declare a new time to instUpdateTime
                // why (-refundWindow + 1)? This will sustain today will be no more update on balances...
                // ...but tomarrow a transaction will produce new update.
                instUpdateTime[_inst] = (_transactionTime - refundWindow) + 1;
            } else {
                //Just some part of Future Balance Array must paid to instructor
                uint256 dayPassedInstMod = dayPassedInst % refundWindow;
                //minimum dayPassedInst=14 so Mod 0, maximum dayPassedInst=27 so Mod 13
                //if Mod 0 for loop works for today, if Mod 2 it works for today+ yesterday,,, if it 13
                for (uint256 i = 0; i <= dayPassedInstMod; i++) {
                    //Index of the day to be payout to instructor.
                    uint256 indexOfPayout = ((_transactionFuIndex +
                        refundWindow) - i) % refundWindow;
                    tempSafetyBalance = instFutureBalance[_inst][indexOfPayout];
                    instFutureBalance[_inst][indexOfPayout] = 0;
                    instCurrentBalance[_inst] += tempSafetyBalance;
                }

                // add new payment to instructor futureBalanceArray
                instFutureBalance[_inst][_transactionFuIndex] += _instrShare;

                // you updated instructor currentBalance of instructorso declare a new time to instUpdateTime
                // why (-refundWindow + 1)? This will sustain today will be no more update on balances...
                // ...but tomarrow a transaction will produce new update.
                instUpdateTime[_inst] = (_transactionTime - refundWindow) + 1;
            }
        }
    }

    function _updateOwnedContentOrPart(
        uint256 tokenId,
        bool fullContentPurchase,
        uint256[] calldata purchasedParts,
        address contentReceiver
    ) internal {
        if (fullContentPurchase) {
            isTokenBought[contentReceiver][tokenId][0] = true;
            ownedContents[contentReceiver].push([tokenId, 0]);
        } else {
            for (uint256 j; j < purchasedParts.length; j++) {
                uint part = purchasedParts[j];
                isTokenBought[contentReceiver][tokenId][part] = true;
                ownedContents[contentReceiver].push([tokenId, part]);
            }
        }
    }

    function _sendCurrentGlobalCutsToGovernanceTreasury() internal {
        uint foundTempBalance;
        uint goverTempBalance;
        uint jurorTempBalance;
        uint validTempBalance;

        if (gContentCutCurrentBalance > gContentRefundDebt) {
            uint withdrawableContentShare = gContentCutCurrentBalance -
                gContentRefundDebt;
            gContentCutCurrentBalance = 0;
            gContentRefundDebt = 0;

            (
                foundTempBalance,
                goverTempBalance,
                jurorTempBalance,
                validTempBalance
            ) = calculateTotalCutContentShares(withdrawableContentShare);

            foundCurrentBalance += foundTempBalance;
            goverCurrentBalance += goverTempBalance;
            jurorCurrentBalance += jurorTempBalance;
            validCurrentBalance += validTempBalance;
        }

        if (gCoachingCurrentBalance > gCoachingRefundDebt) {
            uint withdrawableContentShare = gCoachingCurrentBalance -
                gCoachingRefundDebt;
            gCoachingCurrentBalance = 0;
            gCoachingRefundDebt = 0;

            (
                foundTempBalance,
                goverTempBalance,
                jurorTempBalance,
                validTempBalance
            ) = calculateTotalCutCoachingShares(withdrawableContentShare);

            foundCurrentBalance += foundTempBalance;
            goverCurrentBalance += goverTempBalance;
            jurorCurrentBalance += jurorTempBalance;
            validCurrentBalance += validTempBalance;
        }
        if (isGovernanceTreasuryOnline == true) {
            if (jurorCurrentBalance > 0) {
                uint sendJurorShareToGovTre = jurorCurrentBalance;
                jurorCurrentBalance = 0;
                udao.transfer(governanceTreasury, sendJurorShareToGovTre);
                iGovernanceTreasury.jurorBalanceUpdate(sendJurorShareToGovTre);
            }
            if (validCurrentBalance > 0) {
                uint sendValdtrShareToGovTre = validCurrentBalance;
                validCurrentBalance = 0;
                udao.transfer(governanceTreasury, sendValdtrShareToGovTre);
                iGovernanceTreasury.validatorBalanceUpdate(
                    sendValdtrShareToGovTre
                );
            }
            if (goverCurrentBalance > 0) {
                uint sendGoverShareToGovTre = goverCurrentBalance;
                goverCurrentBalance = 0;
                udao.transfer(governanceTreasury, sendGoverShareToGovTre);
                iGovernanceTreasury.governanceBalanceUpdate(
                    sendGoverShareToGovTre
                );
            }
        }
    }

    function _saveTheSaleOnAListForRefund(
        address _payee,
        address _contentReceiver,
        address _instructor,
        uint256 _instrShare,
        uint256 _totalCut,
        uint256 _tokenId,
        uint256[] memory _purchasedParts,
        uint256 _coachingDate,
        uint256 _refundablePeriod,
        bool isContentSale
    ) internal {
        if (isContentSale) {
            sales[saleID.current()] = ContentSale({
                payee: _payee,
                contentReceiver: _contentReceiver,
                instructor: _instructor,
                instrShare: _instrShare,
                totalCut: _totalCut,
                tokenId: _tokenId,
                purchasedParts: _purchasedParts,
                isRefunded: false,
                refundablePeriod: _refundablePeriod
            });
            saleID.increment();
        } else {
            coachSales[coachingSaleID.current()] = CoachingSale({
                payee: _payee,
                contentReceiver: _contentReceiver,
                instructor: _instructor,
                instrShare: _instrShare,
                totalCut: _totalCut,
                isRefunded: false,
                coachingDate: _coachingDate,
                refundablePeriod: _refundablePeriod
            });
            coachingSaleID.increment();
        }
    }

    /// @notice Allows learner to get refund of coaching 1 day prior to coaching date or instructor to refund anytime
    /// @param _saleID id of the coaching sale
    function refundCoachingByInstructorOrLearner(uint256 _saleID) external {
        CoachingSale storage refundItem = coachSales[_saleID];
        require(
            refundItem.refundablePeriod >= (block.timestamp / epochOneDay),
            "Refund period over you cant refund"
        );
        if (msg.sender == refundItem.payee) {
            require(refundItem.coachingDate >= block.timestamp + 1 days);
        } else if (msg.sender != refundItem.instructor) {
            revert("You are not the payee or instructor");
        }

        require(refundItem.isRefunded == false, "Already refunded!");
        coachSales[_saleID].isRefunded = true;

        instRefundDebt[refundItem.instructor] += refundItem.instrShare;
        gCoachingRefundDebt += refundItem.totalCut;

        udao.transfer(
            refundItem.payee,
            (refundItem.instrShare + refundItem.totalCut)
        );
    }

    /// @notice Allows refund of coaching with a voucher
    /// @param voucher A RefundVoucher
    function newRefundCoaching(RefundVoucher calldata voucher) external {
        address signer = _verifyRefundVoucher(voucher);
        require(
            roleManager.hasRole(BACKEND_ROLE, signer),
            "Signature invalid or unauthorized"
        );

        CoachingSale storage refundItem = coachSales[voucher.saleID];
        require(
            refundItem.refundablePeriod >= (block.timestamp / epochOneDay),
            "Refund period over you cant refund"
        );

        require(refundItem.isRefunded == false, "Already refunded!");
        coachSales[voucher.saleID].isRefunded = true;

        instRefundDebt[refundItem.instructor] += refundItem.instrShare;
        gCoachingRefundDebt += refundItem.totalCut;

        udao.transfer(
            refundItem.payee,
            (refundItem.instrShare + refundItem.totalCut)
        );
    }

    /// @notice Allows refund of a content with a voucher
    /// @param voucher A RefundVoucher
    function newRefundContent(RefundVoucher calldata voucher) external {
        address signer = _verifyRefundVoucher(voucher);
        require(
            roleManager.hasRole(BACKEND_ROLE, signer),
            "Signature invalid or unauthorized"
        );

        ContentSale storage refundItem = sales[voucher.saleID];

        for (uint256 j; j < refundItem.purchasedParts.length; j++) {
            uint256 part = refundItem.purchasedParts[j];
            if (
                isTokenBought[refundItem.contentReceiver][refundItem.tokenId][
                    part
                ] == false
            ) {
                revert("contentReceiver already refund this purchase");
            }
        }

        require(
            refundItem.refundablePeriod < (block.timestamp / epochOneDay),
            "refund period over you cant refund"
        );

        require(refundItem.isRefunded == false, "Already refunded!");
        coachSales[voucher.saleID].isRefunded = true;

        /// @dev First remove specific content from the contentReceiver
        delete ownedContents[refundItem.contentReceiver][refundItem.tokenId];
        /// @dev Then add the content to the contentReceiver
        ownedContents[refundItem.contentReceiver][refundItem.tokenId] = voucher
            .finalParts;

        address instructor = udaoc.ownerOf(refundItem.tokenId);
        instRefundDebt[instructor] += refundItem.instrShare;
        gContentRefundDebt += refundItem.totalCut;

        udao.transfer(
            refundItem.payee,
            (refundItem.instrShare + refundItem.totalCut)
        );
    }

    //@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@//
    //@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@//

    /// @notice returns coaching informations of token
    /// @param _tokenId id of token that coaching will be returned
    function getCoachings(
        uint256 _tokenId
    ) external view returns (uint256[] memory) {
        return coachingIdsOfToken[_tokenId];
    }

    /// @notice returns owned contents of the _owner
    /// @param _owner address of the user that will owned contents be returned
    function getOwnedContent(
        address _owner
    ) public view returns (uint256[][] memory) {
        return (ownedContents[_owner]);
    }

    /// @notice Returns the buyers of a coaching service for a token
    /// @param tokenId The token ID of a course of a coaching service
    function getStudentListOfToken(
        uint256 tokenId
    ) public view returns (address[] memory) {
        return studentList[tokenId];
    }

    /// @notice Returns the chain id of the current blockchain.
    /// @dev This is used to workaround an issue with ganache returning different values from the on-chain chainid() function and
    ///  the eth_chainId RPC method. See https://github.com/protocol/nft-website/issues/121 for context.
    function getChainID() external view returns (uint256) {
        uint256 id;
        assembly {
            id := chainid()
        }
        return id;
    }

    /// @notice Returns a hash of the given ContentDiscountVoucher, prepared using EIP712 typed data hashing rules.
    /// @param voucher A ContentDiscountVoucher to hash.
    function _hashDiscountVoucher(
        ContentDiscountVoucher calldata voucher
    ) internal view returns (bytes32) {
        return
            _hashTypedDataV4(
                keccak256(
                    abi.encode(
                        keccak256(
                            "ContentDiscountVoucher(uint256 tokenId,bool fullContentPurchase,uint256[] purchasedParts,uint256 priceToPay,uint256 validUntil,address redeemer,address giftReceiver)"
                        ),
                        voucher.tokenId,
                        voucher.fullContentPurchase,
                        keccak256(abi.encodePacked(voucher.purchasedParts)),
                        voucher.priceToPay,
                        voucher.validUntil,
                        voucher.redeemer,
                        voucher.giftReceiver
                    )
                )
            );
    }

    /// @notice Returns a hash of the given RefundVoucher, prepared using EIP712 typed data hashing rules.
    /// @param voucher A RefundVoucher to hash.
    function _hashRefundVoucher(
        RefundVoucher calldata voucher
    ) internal view returns (bytes32) {
        return
            _hashTypedDataV4(
                keccak256(
                    abi.encode(
                        keccak256(
                            "RefundVoucher(uint256 saleID,address instructor,uint256[] finalParts,uint256 validUntil)"
                        ),
                        voucher.saleID,
                        voucher.instructor,
                        keccak256(abi.encodePacked(voucher.finalParts)),
                        voucher.validUntil
                    )
                )
            );
    }

    /// @notice Returns a hash of the given CoachingVoucher, prepared using EIP712 typed data hashing rules.
    /// @param voucher A CoachingVoucher to hash.
    function _hashCoachingVoucher(
        CoachingVoucher calldata voucher
    ) internal view returns (bytes32) {
        return
            _hashTypedDataV4(
                keccak256(
                    abi.encode(
                        keccak256(
                            "CoachingVoucher(address coach,uint256 priceToPay,uint256 coachingDate,address learner)"
                        ),
                        voucher.coach,
                        voucher.priceToPay,
                        voucher.coachingDate,
                        voucher.learner
                    )
                )
            );
    }

    /// @notice Verifies the signature for a given ContentDiscountVoucher, returning the address of the signer.
    /// @dev Will revert if the signature is invalid.
    /// @param voucher A ContentDiscountVoucher describing a content access rights.
    function _verifyDiscountVoucher(
        ContentDiscountVoucher calldata voucher
    ) internal view returns (address) {
        bytes32 digest = _hashDiscountVoucher(voucher);
        return ECDSA.recover(digest, voucher.signature);
    }

    /// @notice Verifies the signature for a given ContentDiscountVoucher, returning the address of the signer.
    /// @dev Will revert if the signature is invalid.
    /// @param voucher A ContentDiscountVoucher describing a content access rights.
    function _verifyRefundVoucher(
        RefundVoucher calldata voucher
    ) internal view returns (address) {
        bytes32 digest = _hashRefundVoucher(voucher);
        return ECDSA.recover(digest, voucher.signature);
    }

    /// @notice Verifies the signature for a given CoachingVoucher, returning the address of the signer.
    /// @dev Will revert if the signature is invalid.
    /// @param voucher A CoachingVoucher describing a content access rights.
    function _verifyCoachingVoucher(
        CoachingVoucher calldata voucher
    ) internal view returns (address) {
        bytes32 digest = _hashCoachingVoucher(voucher);
        return ECDSA.recover(digest, voucher.signature);
    }
}

//TODO we need to check functions visibility(view/pure/public) and behaviour (external/internal)
//TODO Refund voucher icin backend disinda farkli bir wallet kullanilsin.
//TODO event ler eksik
//TODO pnly Role ler eksik
