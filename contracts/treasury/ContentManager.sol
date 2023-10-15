// SPDX-License-Identifier: MIT
/// @title Content purchasing and cut management
pragma solidity ^0.8.4;
import "./BasePlatform.sol";
import "hardhat/console.sol";

abstract contract ContentManager is BasePlatform {
    /// @notice Emitted when a content is bought
    event ContentBought(
        uint256 tokenId,
        uint256[] parts,
        uint256 pricePaid,
        address buyer
    );

    event CoachingBought(uint256 coachingSaleID);

    using Counters for Counters.Counter;
    /// @notice Used to generate unique ids for content sales
    Counters.Counter private contentSaleID;
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
        address coach;
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

    uint256 private coachingIndex;

    //@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@//

    /// @notice Allows users to buy content with discount voucher
    /// @param voucher discount vouchers
    function buyContentWithDiscount(
        IVoucherVerifier.ContentDiscountVoucher[] calldata voucher
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
            require(
                udaoc.isSellable(voucher[i].tokenId) == true,
                "Not sellable"
            );
            // make sure signature is valid and get the address of the signer
            voucherVerifier.verifyDiscountVoucher(voucher[i]);
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
            totalCut[i] = calculateContentSaleTotalCut(priceToPay[i]);

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
        IVoucherVerifier.CoachingVoucher calldata voucher
    ) external whenNotPaused {
        uint256 totalCut;
        uint256 instrShare;
        address learner;
        bool isFiatPurchase;

        voucherVerifier.verifyCoachingVoucher(voucher);
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

        totalCut = calculateCoachingSaleTotalCut(voucher.priceToPay);

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

        //Save the sale on a refund list
        coachSales[coachingSaleID.current()] = CoachingSale({
            payee: msg.sender,
            contentReceiver: learner,
            coach: voucher.coach,
            instrShare: instrShare,
            totalCut: totalCut,
            isRefunded: false,
            coachingDate: voucher.coachingDate,
            refundablePeriod: transactionTime + refundWindow
        });
        coachingSaleID.increment();
        _sendCurrentGlobalCutsToGovernanceTreasury();

        emit CoachingBought(coachingSaleID.current() - 1);
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
        address[] memory giftReceivers
    ) external whenNotPaused {
        /// @dev Used for recording the price to pay for each item in the cart
        uint256[] memory priceToPay = new uint[](tokenIds.length);
        /// @dev Used for recording the all roles cut for each item in the cart
        uint256[] memory totalCut = new uint[](tokenIds.length);
        /// @dev Used for recording the instructor share for each item in the cart
        uint256[] memory instrShare = new uint[](tokenIds.length);
        /// @dev Used for recording the total roles cut for all items in the cart
        uint256 totalRequiredUdao;
        /// @dev Boolean flag to determine if the purchase is made by a backend role
        /// if so then this purchase is a fiat purchase
        bool isFiatPurchase;

        if (roleManager.hasRole(BACKEND_ROLE, msg.sender)) {
            isFiatPurchase = true;
        }
        /// @dev The function arguments must have equal size
        require(
            tokenIds.length == fullContentPurchases.length &&
                tokenIds.length == purchasedParts.length &&
                tokenIds.length == giftReceivers.length,
            "Array lengths are not equal!"
        );

        for (uint256 i; i < tokenIds.length; i++) {
            require(udaoc.isSellable(tokenIds[i]) == true, "Not sellable");
            /// @dev Check the existance of content for each item in the cart
            require(udaoc.exists(tokenIds[i]) == true, "Content not exist!");
            /// @dev Determine the RECEIVER of each item in cart, address(0) means RECEIVER is BUYER
            if (giftReceivers[i] != address(0)) {
                giftReceivers[i];
            } else {
                require(
                    !isFiatPurchase,
                    "Fiat purchase requires a gift receiver!"
                );
                giftReceivers[i] = msg.sender;
            }
            /// @dev The RECEIVER cannot already own the content or parts which in the cart.
            require(
                _doReceiverHaveContentOrPart(
                    tokenIds[i],
                    fullContentPurchases[i],
                    purchasedParts[i],
                    giftReceivers[i]
                ) == false,
                "Content or part's is already bought"
            );
            /// @dev Calculate the BUYER's, how much will pay to each item
            priceToPay[i] = calculatePriceToPay(
                tokenIds[i],
                fullContentPurchases[i],
                purchasedParts[i]
            );
            totalCut[i] = calculateContentSaleTotalCut(priceToPay[i]);

            if (isFiatPurchase) {
                instrShare[i] = 0;
            } else {
                instrShare[i] = priceToPay[i] - totalCut[i];
            }

            totalRequiredUdao += totalCut[i] + instrShare[i];
        }

        /// @dev The BUYER should have enough UDAO to pay for the cart
        require(
            udao.balanceOf(msg.sender) >= totalRequiredUdao,
            "Not enough UDAO sent!"
        );

        /// @dev The BUYER should approve the contract for the amount they will pay
        require(
            udao.allowance(msg.sender, address(this)) >= totalRequiredUdao,
            "Not enough allowance!"
        );

        for (uint256 i; i < tokenIds.length; i++) {
            _buyContentwithUDAO(
                tokenIds[i],
                fullContentPurchases[i],
                purchasedParts[i],
                giftReceivers[i],
                totalCut[i],
                instrShare[i]
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

        //uint256 totalCut = calculateContentSaleTotalCut(_priceToPayUdao);
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

        // Update owned contert or part
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

        //Save the sale on a refund list
        sales[contentSaleID.current()] = ContentSale({
            payee: msg.sender,
            contentReceiver: contentReceiver,
            instructor: instructor,
            instrShare: instrShare,
            totalCut: totalCut,
            tokenId: tokenId,
            purchasedParts: purchasedParts,
            isRefunded: false,
            refundablePeriod: transactionTime + refundWindow
        });
        contentSaleID.increment();

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
            _priceToPay = udaoc.getContentPriceAndCurrency(_tokenId, 0);
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
                _pricePerPart = udaoc.getContentPriceAndCurrency(
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
        uint256 dayPassedGlo = _transactionTime - contentLockTime;

        if (dayPassedGlo < refundWindow) {
            // if(true):There is no payment yet to be paid to the seller in the future balance array.
            // add new payment to instructor futureBalanceArray
            contentCutLockedPool[_transactionFuIndex] += totalCutContentShare;
        } else {
            // if(else): The future balance array contains values that must be paid to the user.
            if (dayPassedGlo >= (refundWindow * 2)) {
                //Whole Future Balance Array must paid to user (Because (refundWindow x2)28 day passed)
                for (uint256 i = 0; i < refundWindow; i++) {
                    contentCutPool += contentCutLockedPool[i];

                    contentCutLockedPool[i] = 0;
                }

                // add new payment to instructor futureBalanceArray
                contentCutLockedPool[
                    _transactionFuIndex
                ] += totalCutContentShare;

                // you updated instructor currentBalance of instructorso declare a new time to instLockTime
                // why (-refundWindow + 1)? This will sustain today will be no more update on balances...
                // ...but tomarrow a transaction will produce new update.
                contentLockTime = (_transactionTime - refundWindow) + 1;
            } else {
                //Just some part of Future Balance Array must paid to instructor
                uint256 dayPassedGloMod = dayPassedGlo % refundWindow;
                //minimum dayPassedInst=14 so Mod 0, maximum dayPassedInst=27 so Mod 13
                //if Mod 0 for loop works for today, if Mod 2 it works for today+ yesterday,,, if it 13
                for (uint256 i = 0; i <= dayPassedGloMod; i++) {
                    //Index of the day to be payout to instructor.
                    uint256 indexOfPayout = ((_transactionFuIndex +
                        refundWindow) - i) % refundWindow;
                    contentCutPool += contentCutLockedPool[indexOfPayout];

                    contentCutLockedPool[indexOfPayout] = 0;
                }

                // add new payment to instructor futureBalanceArray
                contentCutLockedPool[
                    _transactionFuIndex
                ] += totalCutContentShare;

                // you updated instructor futureBalanceArray updated so declare a new time to instLockTime
                // why (-refundWindow + 1)? This will sustain today will be no more update on balances...
                // ...but tomarrow a transaction will produce new update.
                contentLockTime = (_transactionTime - refundWindow) + 1;
            }
        }
    }

    function _updateGlobalCoachingBalances(
        uint256 totalCutCoachingShare,
        uint256 _transactionTime,
        uint256 _transactionFuIndex
    ) internal {
        //how many day passed since last update of instructor balance
        uint256 dayPassedGlo = _transactionTime - coachingLockTime;

        if (dayPassedGlo < refundWindow) {
            // if(true):There is no payment yet to be paid to the seller in the future balance array.
            // add new payment to instructor futureBalanceArray
            coachingCutLockedPool[_transactionFuIndex] += totalCutCoachingShare;
        } else {
            // if(else): The future balance array contains values that must be paid to the user.
            if (dayPassedGlo >= (refundWindow * 2)) {
                //Whole Future Balance Array must paid to user (Because (refundWindow x2)28 day passed)
                for (uint256 i = 0; i < refundWindow; i++) {
                    coachingCutPool += coachingCutLockedPool[i];

                    coachingCutLockedPool[i] = 0;
                }

                // add new payment to instructor futureBalanceArray
                coachingCutLockedPool[
                    _transactionFuIndex
                ] += totalCutCoachingShare;

                // you updated instructor currentBalance of instructorso declare a new time to instLockTime
                // why (-refundWindow + 1)? This will sustain today will be no more update on balances...
                // ...but tomarrow a transaction will produce new update.
                coachingLockTime = (_transactionTime - refundWindow) + 1;
            } else {
                //Just some part of Future Balance Array must paid to instructor
                uint256 dayPassedGloMod = dayPassedGlo % refundWindow;
                //minimum dayPassedInst=14 so Mod 0, maximum dayPassedInst=27 so Mod 13
                //if Mod 0 for loop works for today, if Mod 2 it works for today+ yesterday,,, if it 13
                for (uint256 i = 0; i <= dayPassedGloMod; i++) {
                    //Index of the day to be payout to instructor.
                    uint256 indexOfPayout = ((_transactionFuIndex +
                        refundWindow) - i) % refundWindow;
                    coachingCutPool += coachingCutLockedPool[indexOfPayout];

                    coachingCutLockedPool[indexOfPayout] = 0;
                }

                // add new payment to instructor futureBalanceArray
                coachingCutLockedPool[
                    _transactionFuIndex
                ] += totalCutCoachingShare;

                // you updated instructor futureBalanceArray updated so declare a new time to instLockTime
                // why (-refundWindow + 1)? This will sustain today will be no more update on balances...
                // ...but tomarrow a transaction will produce new update.
                coachingLockTime = (_transactionTime - refundWindow) + 1;
            }
        }
    }

    /** @notice Updates the instructor balances and locked balances according to the refund window. ...
    ... New payments are added to the locked balances and if there any payments that should be paid to the instructor, ...
    ... they are removed from locked balances and added to the instructor balance.
    **/
    /// @param _instrShare amount of UDAO to be paid to the instructor, it revenue of instructor after the content sale
    /// @param _inst address of the instructor
    /// @param _transactionTime indicates the day of the transaction (how many days passed since 1Jan1970-0:0:0)
    /// @param _transactionLBIndex determines the payment will be added to which position in the insLockedBalance array.
    function _updateInstructorBalances(
        uint256 _instrShare,
        address _inst,
        uint256 _transactionTime,
        uint256 _transactionLBIndex
    ) internal {
        // safety variable for eliminate reentrancy attacks
        uint256 tempSafetyBalance;
        // is there any change on the refund window? Or, is it the instructor's first sale?
        if (prevInstRefundWindow[_inst] != refundWindow) {
            // 'for' loop will iterate during the old refund window period if it is bot equal to '0' ...
            // ... The loop collect instructor locked balances and remove them from the insLockedBalance array.
            for (uint256 i = 0; i < prevInstRefundWindow[_inst]; i++) {
                tempSafetyBalance += instLockedBalance[_inst][i];
                instLockedBalance[_inst][i] = 0;
            }
            // prevInstRefundWindow holds the refund window of the instructor's last sale.
            prevInstRefundWindow[_inst] = refundWindow;
            // initiate the instructor lock time
            instLockTime[_inst] = _transactionTime;
            // add the "collected old balances" to instructor locked balance according to the new refund window.
            instLockedBalance[_inst][_transactionLBIndex] += tempSafetyBalance;
        }
        // how many day passed since last update of instructor balance
        uint256 dayPassedInst = _transactionTime - instLockTime[_inst];

        // "if/else": is there any payment in insLockedBalance array that should be paid to the instructor ...
        if (dayPassedInst < refundWindow) {
            // if(TRUE): there is no payment yet to be paid to the seller in the insLockedBalance array.
            // add the "new payment" to instructor insLockedBalance
            instLockedBalance[_inst][_transactionLBIndex] += _instrShare;
        } else {
            // if(FALSE): the instLockedBalance array contains payments that must be paid to the user.
            // "if/else": how many elements of the insLockedBalance array must be paid to the instructor ...
            if (dayPassedInst >= (refundWindow * 2)) {
                // if(TRUE): every element insLockedBalance array completed the refund window period.
                // 'for' loop will iterate through all the elements of the insLockedBalance array ...
                // ... The loop add them to the instructor balance and remove them from the insLockedBalance array.
                for (uint256 i = 0; i < refundWindow; i++) {
                    tempSafetyBalance = instLockedBalance[_inst][i];
                    instLockedBalance[_inst][i] = 0;
                    instBalance[_inst] += tempSafetyBalance;
                }
                // instLockTime holds the date of the oldest element in the insLockedBalance that hasn't paid to the user yet. ...
                // ... As of Today, all payments that have completed the refund window have been paid to the user. ...
                // ... "The oldest day which the payment has not been paid to instructor yet" is (today-refundWindow)+1.
                instLockTime[_inst] = (_transactionTime - refundWindow) + 1;
                // add the "new payment" to instructor insLockedBalance
                instLockedBalance[_inst][_transactionLBIndex] += _instrShare;
            } else {
                // ...if(FALSE): some elements of the insLockedBalance array must be paid to the instructor
                // how many elements completed the refund window period
                uint256 dayPassedInstMod = dayPassedInst % refundWindow;
                // so 'for'loop will iterate for the number of elements that completed the refund window period. ...
                // ... The loop add them to the instructor balance and remove them from the insLockedBalance array.
                for (uint256 i = 0; i <= dayPassedInstMod; i++) {
                    // indexOfPayout determines which element of the insLockedBalance array will be paid to the instructor. ...
                    // ... it start from today(i=0) and goes to past during for loop iterations. ...
                    // ... add and mod operation with refundWindow is for make it a circular array.
                    uint256 indexOfPayout = ((_transactionLBIndex +
                        refundWindow) - i) % refundWindow;
                    tempSafetyBalance = instLockedBalance[_inst][indexOfPayout];
                    instLockedBalance[_inst][indexOfPayout] = 0;
                    instBalance[_inst] += tempSafetyBalance;
                }
                // instLockTime holds the date of the oldest element in the insLockedBalance that hasn't paid to the user yet. ...
                // ... As of Today, all payments that have completed the refund window have been paid to the user. ...
                // ... "The oldest day which the payment has not been paid to instructor yet" is (today-refundWindow)+1.
                instLockTime[_inst] = (_transactionTime - refundWindow) + 1;
                // add the "new payment" to instructor insLockedBalance
                instLockedBalance[_inst][_transactionLBIndex] += _instrShare;
            }
        }
    }

    function _sendCurrentGlobalCutsToGovernanceTreasury() internal {
        if (contentCutPool > contentCutRefundedBalance) {
            uint withdrawableContentShare = contentCutPool -
                contentCutRefundedBalance;
            contentCutPool = 0;
            contentCutRefundedBalance = 0;

            distributeContentCutShares(withdrawableContentShare);
        }

        if (coachingCutPool > coachingCutRefundedBalance) {
            uint withdrawableCoachingShare = coachingCutPool -
                coachingCutRefundedBalance;
            coachingCutPool = 0;
            coachingCutRefundedBalance = 0;

            distributeCoachingCutShares(withdrawableCoachingShare);
        }
        if (isGovernanceTreasuryOnline == true) {
            if (jurorBalance > 0) {
                uint sendJurorShareToGovTre = jurorBalance;
                jurorBalance = 0;
                udao.transfer(governanceTreasury, sendJurorShareToGovTre);
                iGovernanceTreasury.jurorBalanceUpdate(sendJurorShareToGovTre);
            }
            if (validatorsBalance > 0) {
                uint sendValdtrShareToGovTre = validatorsBalance;
                validatorsBalance = 0;
                udao.transfer(governanceTreasury, sendValdtrShareToGovTre);
                iGovernanceTreasury.validatorBalanceUpdate(
                    sendValdtrShareToGovTre
                );
            }
            if (governanceBalance > 0) {
                uint sendGoverShareToGovTre = governanceBalance;
                governanceBalance = 0;
                udao.transfer(governanceTreasury, sendGoverShareToGovTre);
                iGovernanceTreasury.governanceBalanceUpdate(
                    sendGoverShareToGovTre
                );
            }
        }
    }

    /// @notice Allows learner to get refund of coaching 1 day prior to coaching date or coach to refund anytime
    /// @param _refCoachSaleID id of the coaching sale
    function refundCoachingByInstructorOrLearner(
        uint256 _refCoachSaleID
    ) external whenNotPaused {
        CoachingSale storage refundItem = coachSales[_refCoachSaleID];
        require(
            refundItem.refundablePeriod >= (block.timestamp / epochOneDay),
            "Refund period over you cant refund"
        );
        if (msg.sender == refundItem.payee) {
            require(refundItem.coachingDate >= block.timestamp + 1 days);
        } else if (msg.sender != refundItem.coach) {
            revert("You are not the payee or coach");
        }

        require(refundItem.isRefunded == false, "Already refunded!");
        coachSales[_refCoachSaleID].isRefunded = true;

        instRefundedBalance[refundItem.coach] += refundItem.instrShare;
        coachingCutRefundedBalance += refundItem.totalCut;

        udao.transfer(
            refundItem.payee,
            (refundItem.instrShare + refundItem.totalCut)
        );
    }

    /// @notice Allows refund of coaching with a voucher
    /// @param voucher A RefundVoucher
    function newRefundCoaching(
        IVoucherVerifier.RefundVoucher calldata voucher
    ) external whenNotPaused {
        voucherVerifier.verifyRefundVoucher(voucher);

        CoachingSale storage refundItem = coachSales[voucher.saleID];
        require(
            refundItem.refundablePeriod >= (block.timestamp / epochOneDay),
            "Refund period over you cant refund"
        );

        require(refundItem.isRefunded == false, "Already refunded!");
        coachSales[voucher.saleID].isRefunded = true;

        instRefundedBalance[refundItem.coach] += refundItem.instrShare;
        coachingCutRefundedBalance += refundItem.totalCut;

        udao.transfer(
            refundItem.payee,
            (refundItem.instrShare + refundItem.totalCut)
        );
    }

    /// @notice Allows refund of a content with a voucher
    /// @param voucher A RefundVoucher
    function newRefundContent(
        IVoucherVerifier.RefundVoucher calldata voucher
    ) external whenNotPaused {
        voucherVerifier.verifyRefundVoucher(voucher);

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

        instRefundedBalance[refundItem.instructor] += refundItem.instrShare;
        contentCutRefundedBalance += refundItem.totalCut;

        udao.transfer(
            refundItem.payee,
            (refundItem.instrShare + refundItem.totalCut)
        );
    }

    //@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@//
    //@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@//

    /// @notice returns owned contents of the _owner
    /// @param _owner address of the user that will owned contents be returned
    function getOwnedContent(
        address _owner
    ) public view returns (uint256[][] memory) {
        return (ownedContents[_owner]);
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
}

//TODO we need to check functions visibility(view/pure/public) and behaviour (external/internal)
//TODO Refund voucher icin backend disinda farkli bir wallet kullanilsin. DONE
//TODO event ler eksik
//TODO pnly Role ler eksik
//TODO ban -kyc checklerde eksik var
//TODO create content srasında instructor ıpdate time 'ı başlatman gerek!
//TODO instructorWitdrawableBalance view fonksiyonu eksik
//TODO set new refundWindow algoritması implemente edilmesi gerekiyor!
