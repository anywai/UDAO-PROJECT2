// SPDX-License-Identifier: MIT
/// @title Content purchasing and cut management
pragma solidity ^0.8.4;
import "./BasePlatform.sol";
import "hardhat/console.sol";

abstract contract ContentManager is BasePlatform {
    /// @notice Emitted when a content is bought
    event ContentBought(uint256 cartSaleID, uint256 contentSaleID);
    /// @notice Emitted when a coaching is bought
    event CoachingBought(uint256 coachingSaleID);
    /// @notice Emitted when refund is requested. saleType: 0=coaching, 1=content
    event SaleRefunded(uint256 saleID, uint8 saleType);
    /// @notice
    event ContentCutPoolUpdated(uint256 _contentCutPool);
    event CoachingCutPoolUpdated(uint256 _coachingCutPool);
    event ContentCutLockedPoolUpdated();
    event CoachingCutLockedPoolUpdated();
    event RoleBalancesUpdated(
        uint256 foundationBalance,
        uint256 jurorBalance,
        uint256 validatorsBalance,
        uint256 governanceBalance
    );
    event InstructorBalanceUpdated(address _instructor, uint256 _instBalance);
    event InstructorLockedBalanceUpdated(address _instructor);

    using Counters for Counters.Counter;
    /// @notice Used to generate unique ids for content sales
    Counters.Counter private contentSaleID;
    /// @notice Used to generate unique ids for coaching sales
    Counters.Counter private coachingSaleID;
    /// @notice Used to generate unique ids for cart sales
    Counters.Counter private cartSaleID;

    /// @notice Used to store the content sales
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
        bool fullPurchase;
    }
    /// @notice Used to store the coaching sales
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

    /// @notice content sale id => the content sale
    mapping(uint256 => ContentSale) public contentSales;
    /// @notice coaching sale id => the coaching sale
    mapping(uint256 => CoachingSale) public coachSales;
    /// @notice user address => (content id => (content part id => part owned/not owned by the user))
    mapping(address => mapping(uint => mapping(uint => bool))) isTokenBought;
    /// @notice user address => content token Id => content part Id
    mapping(address => mapping(uint256 => uint256[])) ownedContents;
    /// @notice user address => content token Id => is full content purchase
    mapping(address => mapping(uint256 => bool)) isFullyPurchased;

    /* TODO New content purchase and record method
    /// @notice user address => users owned [content token Ids]-[content part Ids]
    //mapping(address => uint256[][]) ownedContents; //reworked by BUGRAHAN (ownedContentsNew)       

    // tokenId => (partId => price), first part is the full price
    mapping(uint => mapping(uint => uint)) public contentPrice; //fiyatlar
    // tokenId => full content price
    mapping(uint => uint) public fullContentPrice; //fiyatlar
    */

    /// @notice Allows users to buy coaching with a voucher created by instructor
    /// @param voucher buy coaching voucher
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
            require(!roleManager.isBanned(msg.sender, 32), "Caller is banned");
            require(roleManager.isKYCed(msg.sender, 25), "Caller is not KYCed");
        } else {
            require(msg.sender == voucher.learner, "You are not the learner.");
            learner = msg.sender;
        }

        require(roleManager.isKYCed(learner, 26), "Learner is not KYCed");
        require(!roleManager.isBanned(learner, 33), "Learner is banned");
        require(roleManager.isKYCed(voucher.coach, 27), "Coach is not KYCed");
        require(!roleManager.isBanned(voucher.coach, 35), "Coach is banned");

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
        _updatePlatformCutBalances(
            0, //contentCut=0
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
        _transferPlatformCutstoGovernance();

        emit CoachingBought(coachingSaleID.current() - 1);
    }

    /// @notice Allows users to purchase multiple contents for the caller or gift receiver with discount vouchers
    /// @param vouchers buy discount content voucher array
    function buyContentWithDiscount(
        IVoucherVerifier.ContentDiscountVoucher[] calldata vouchers
    ) external whenNotPaused {
        /// @dev Determine the number of items in the cart
        uint256 voucherIdsLength = vouchers.length;
        /// @dev Determine the RECEIVER of each item in the cart
        address[] memory contentReceiver;
        /// @dev Used for recording the price to pay for each item in the cart
        uint256[] memory priceToPay;
        /// @dev Used for recording the all roles cut for each item in the cart
        uint256[] memory totalCut;
        /// @dev Used for recording the instructor share for each item in the cart
        uint256[] memory instrShare;
        /// @dev Used for recording the total roles cut for all items in the cart
        uint256 totalRequiredUdao;
        /// @dev Boolean flag to determine if the purchase is made by a backend role
        /// if so then this purchase is a fiat purchase
        bool isFiatPurchase;

        if (roleManager.hasRole(BACKEND_ROLE, msg.sender)) {
            isFiatPurchase = true;
        }

        require(!roleManager.isBanned(msg.sender, 20), "You are banned");
        require(roleManager.isKYCed(msg.sender, 20), "You are not KYCed");
        /// @dev Loop through the cart
        for (uint256 i; i < voucherIdsLength; i++) {
            require(
                udaoc.isSellable(vouchers[i].tokenId) == true,
                "Not sellable"
            );
            // make sure signature is valid and get the address of the signer
            voucherVerifier.verifyDiscountVoucher(vouchers[i]);

            require(
                msg.sender == vouchers[i].redeemer,
                "You are not redeemer."
            );

            require(
                !roleManager.isBanned(vouchers[i].redeemer, 28),
                "Redeemer is banned"
            );
            require(
                !roleManager.isBanned(vouchers[i].giftReceiver, 29),
                "Gift receiver is banned"
            );
            require(
                roleManager.isKYCed(vouchers[i].redeemer, 21),
                "Redeemer is not KYCed"
            );
            require(
                roleManager.isKYCed(vouchers[i].giftReceiver, 22),
                "Gift receiver is not KYCed"
            );

            /// @dev Check the existance of content for each item in the cart
            require(
                udaoc.exists(vouchers[i].tokenId) == true,
                "Content not exist!"
            );
            /// @dev Determine the RECEIVER of each item in cart, address(0) means RECEIVER is BUYER
            if (vouchers[i].giftReceiver != address(0)) {
                contentReceiver[i] = vouchers[i].giftReceiver;
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
                    vouchers[i].tokenId,
                    vouchers[i].purchasedParts,
                    contentReceiver[i]
                ) == false,
                "Content or part's is already bought"
            );
            /// @dev Calculate the BUYER's, how much will pay to each item
            priceToPay[i] = calculatePriceToPay(
                vouchers[i].tokenId,
                vouchers[i].fullContentPurchase,
                vouchers[i].purchasedParts,
                contentReceiver[i]
            );
            totalCut[i] = calculateContentSaleTotalCut(priceToPay[i]);

            if (isFiatPurchase) {
                instrShare[i] = 0;
            } else {
                instrShare[i] = priceToPay[i] - totalCut[i];
            }

            totalRequiredUdao += (totalCut[i] + instrShare[i]);
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
        cartSaleID.increment();
        for (uint256 i; i < voucherIdsLength; i++) {
            _buyContentwithUDAO(
                vouchers[i].tokenId,
                vouchers[i].fullContentPurchase,
                vouchers[i].purchasedParts,
                contentReceiver[i],
                totalCut[i],
                instrShare[i],
                cartSaleID.current() - 1
            );
        }
        _transferPlatformCutstoGovernance();
    }

    /// @notice Allows users to purchase multiple content for the caller or gift receiver.
    /// @param tokenIds An array of token IDs representing the contents in the cart.
    /// @param purchasedParts An array of arrays representing the content parts to be purchased.
    /// @param giftReceivers An array of addresses of the gift receivers if the purchase is a gift.
    function buyContent(
        uint256[] calldata tokenIds,
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
        bool[] memory fullContentPurchases;

        if (roleManager.hasRole(BACKEND_ROLE, msg.sender)) {
            isFiatPurchase = true;
        }
        /// @dev The function arguments must have equal size
        require(
            tokenIds.length == purchasedParts.length &&
                tokenIds.length == giftReceivers.length,
            "Array lengths are not equal!"
        );

        require(roleManager.isKYCed(msg.sender, 23), "You are not KYCed");
        require(!roleManager.isBanned(msg.sender, 30), "You are banned");

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

            require(
                !roleManager.isBanned(giftReceivers[i], 31),
                "Gift receiver is banned"
            );
            require(
                roleManager.isKYCed(giftReceivers[i], 24),
                "Gift receiver is not KYCed"
            );

            /// @dev The RECEIVER cannot already own the content or parts which in the cart.
            require(
                _doReceiverHaveContentOrPart(
                    tokenIds[i],
                    purchasedParts[i],
                    giftReceivers[i]
                ) == false,
                "Content or part's is already bought"
            );

            // Check if this is a full content purchase or not
            if (
                ownedContents[giftReceivers[i]][tokenIds[i]].length +
                    purchasedParts[i].length ==
                udaoc.getPartNumberOfContent(tokenIds[i])
            ) {
                fullContentPurchases[i] = true;
            } else {
                fullContentPurchases[i] = false;
            }
            /// @dev Calculate the BUYER's, how much will pay to each item
            priceToPay[i] = calculatePriceToPay(
                tokenIds[i],
                fullContentPurchases[i],
                purchasedParts[i],
                giftReceivers[i]
            );
            totalCut[i] = calculateContentSaleTotalCut(priceToPay[i]);

            if (isFiatPurchase) {
                instrShare[i] = 0;
            } else {
                instrShare[i] = priceToPay[i] - totalCut[i];
            }

            totalRequiredUdao += (totalCut[i] + instrShare[i]);
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
        cartSaleID.increment();
        for (uint256 i; i < tokenIds.length; i++) {
            _buyContentwithUDAO(
                tokenIds[i],
                fullContentPurchases[i],
                purchasedParts[i],
                giftReceivers[i],
                totalCut[i],
                instrShare[i],
                cartSaleID.current() - 1
            );
        }

        _transferPlatformCutstoGovernance();
    }

    /// @notice Used by buy content functions to receive payment from user and deliver the content to user
    /// @param tokenId The token ID of the content.
    /// @param fullContentPurchase A boolean indicating whether it's a full content purchase.
    /// @param purchasedParts An array representing the parts of the content purchased.
    /// @param contentReceiver The address of the content receiver.
    /// @param totalCut The total platform cut applied to the content sale.
    /// @param instrShare The instructor's share from the the content sale.
    /// @param _cartSaleID The ID of the cart sale.
    function _buyContentwithUDAO(
        uint256 tokenId,
        bool fullContentPurchase,
        uint256[] calldata purchasedParts,
        address contentReceiver,
        uint256 totalCut,
        uint256 instrShare,
        uint256 _cartSaleID
    ) internal {
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
        _updatePlatformCutBalances(
            totalCut,
            0, //coachingCut=0
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
            ownedContents[contentReceiver][tokenId] = udaoc.getContentParts(
                tokenId
            );
            isFullyPurchased[contentReceiver][tokenId] = true;
        } else {
            for (uint256 j; j < purchasedParts.length; j++) {
                uint part = purchasedParts[j];
                isTokenBought[contentReceiver][tokenId][part] = true;
                /// @dev If the user has not bought any part of the content before, initialize the array
                if (ownedContents[contentReceiver][tokenId].length == 0) {
                    ownedContents[contentReceiver][tokenId] = new uint[](0);
                }
                ownedContents[contentReceiver][tokenId].push(part);
            }
            isFullyPurchased[contentReceiver][tokenId] = false;
        }

        //Save the sale on a refund list
        contentSales[contentSaleID.current()] = ContentSale({
            payee: msg.sender,
            contentReceiver: contentReceiver,
            instructor: instructor,
            instrShare: instrShare,
            totalCut: totalCut,
            tokenId: tokenId,
            purchasedParts: purchasedParts,
            isRefunded: false,
            refundablePeriod: transactionTime + refundWindow,
            fullPurchase: fullContentPurchase
        });
        contentSaleID.increment();

        emit ContentBought(_cartSaleID, contentSaleID.current() - 1);
    }

    /// @notice Checks does the receiver already own the content or content part
    /// @param tokenId The token ID of the content.
    /// @param purchasedParts An array representing the parts of the content purchased.
    /// @param contentReceiver The address of the content receiver.
    function _doReceiverHaveContentOrPart(
        uint256 tokenId,
        uint256[] calldata purchasedParts,
        address contentReceiver
    ) internal view returns (bool) {
        for (uint256 j; j < purchasedParts.length; j++) {
            uint256 part = purchasedParts[j];
            if (isTokenBought[contentReceiver][tokenId][part] == true) {
                return true;
            }
        }

        return false;
    }

    /// @notice Calculates total amount to pay for a cart purchase
    /// @param tokenIds An array of token IDs representing the contents in the cart.
    /// @param fullContentPurchases An array indicating whether each purchase is for full content.
    /// @param purchasedParts An array of arrays representing the content parts to be purchased.
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
                purchasedParts[i],
                msg.sender
            );
        }
        return (totalPriceToPayUdao);
    }

    /// @notice Returns the parts owned by buyer if buyer has bought any parts in the past
    /// @param _buyer The address of the buyer.
    /// @param _tokenId The token ID of the content.
    function getOwnedParts(
        address _buyer,
        uint256 _tokenId
    ) external view returns (uint256[] memory) {
        return ownedContents[_buyer][_tokenId];
    }

    /// @notice Calculates price to pay for a content purchase
    /// @param _tokenId The token ID of the content.
    /// @param _fullContentPurchase A boolean indicating whether it's a full content purchase.
    /// @param _purchasedParts An array representing the parts of the content purchased.
    function calculatePriceToPay(
        uint256 _tokenId,
        bool _fullContentPurchase,
        uint256[] calldata _purchasedParts,
        address contentReceiver
    ) public view returns (uint256) {
        uint256 _priceToPay;
        uint256 _pricePerPart;

        /// @dev Get the total payment amount first
        if (
            _fullContentPurchase == true &&
            ownedContents[contentReceiver][_tokenId].length == 0
        ) {
            _priceToPay = udaoc.getContentPrice(_tokenId);
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
                _pricePerPart = udaoc.getContentPartPrice(
                    _tokenId,
                    _purchasedParts[j]
                );
                _priceToPay += _pricePerPart;
            }
        }
        return _priceToPay;
    }

    /// @notice Update content and coaching CutPools and handle locked payments during the refund window.
    /// @param totalCutContentShare amount of UDAO to be paid to the platform, it is revenue of platform from content sales.
    /// @param totalCutCoachingShare amount of UDAO to be paid to the platform, it is revenue of platform from coaching sales.
    /// @param _transactionTime indicates the day of the transaction (number of days passed since 1Jan1970-0:0:0)
    /// @param _transactionLBIndex determines the payment will be added to which position in the CutLockedPool arrays.
    function _updatePlatformCutBalances(
        uint256 totalCutContentShare,
        uint256 totalCutCoachingShare,
        uint256 _transactionTime,
        uint256 _transactionLBIndex
    ) internal {
        /// @dev Safety variables to prevent reentrancy attacks.
        uint256 tempSafetyContent;
        uint256 tempSafetyCoaching;
        /// @dev Calculate the number of days that have passed since the last update of CutPools.
        uint256 dayPassedPlatform = _transactionTime - platformLockTime;
        /// @dev Check if there are any payments in the CutLockedPool arrays that need to be transferred to CutPools.
        if (dayPassedPlatform >= refundWindow) {
            /// @dev CutLockedPool arrays contain payments that need be transferred to CutPools.
            /// @dev Defines how many elements of CutLockedPool arrays have completed the refund window period.
            uint256 dayPassedPlatformMod;
            /// @dev Check if all elements in the CutLockedPool arrays have completed the refund window period.
            if (dayPassedPlatform >= (refundWindow * 2)) {
                /// @dev All elements, CutLockedPool arrays holds payments within the range [0, refundWindow-1].
                dayPassedPlatformMod = refundWindow - 1;
            } else {
                /// @dev Not all, but some, elements of the CutLockedPool arrays have completed the refund window period.
                dayPassedPlatformMod = dayPassedPlatform % refundWindow;
            }
            /// @dev Iterate the loop through elements that completed the refund window period.
            /// @dev Adding completed payments to tempSafetyContent/Coaching, and remove them from the CutLockedPool arrays.
            for (uint256 i = 0; i <= dayPassedPlatformMod; i++) {
                /// @dev The indexOfPayout determines which element of the CutLockedPool arrays will be transferred to the CutPools.
                /// @dev It start from today(i=0) and goes to past during the loop iterations.
                /// @dev Circular array indexing prevents negative indexes using addition and modulo operations with refundWindow.
                uint256 indexOfPayout = ((_transactionLBIndex + refundWindow) -
                    i) % refundWindow;
                tempSafetyContent += contentCutLockedPool[indexOfPayout];
                contentCutLockedPool[indexOfPayout] = 0;
                tempSafetyCoaching += coachingCutLockedPool[indexOfPayout];
                coachingCutLockedPool[indexOfPayout] = 0;
            }
            /// @dev Add the sum of refund window's completed payments to CutPools.
            contentCutPool += tempSafetyContent;
            coachingCutPool += tempSafetyCoaching;
            /// @dev Update platformLockTime to the oldest day where payments have not been transferred to CutPools yet.
            /// @dev It is "(today-refundWindow)+1" so as of today, all refund window completed payments have been transfered.
            platformLockTime = (_transactionTime - refundWindow) + 1;

            if (tempSafetyContent != 0) {
                emit ContentCutPoolUpdated(contentCutPool);
            }
            if (tempSafetyCoaching != 0) {
                emit CoachingCutPoolUpdated(coachingCutPool);
            }
        }
        /// @dev Add the "new payment" to CutLockedPools.
        contentCutLockedPool[_transactionLBIndex] += totalCutContentShare;
        coachingCutLockedPool[_transactionLBIndex] += totalCutCoachingShare;

        if ((totalCutContentShare != 0) || (tempSafetyContent != 0)) {
            emit ContentCutLockedPoolUpdated();
        }
        if ((totalCutCoachingShare != 0) || (tempSafetyCoaching != 0)) {
            emit CoachingCutLockedPoolUpdated();
        }
    }

    /// @notice Updates instructor balances and handle locked payments during the refund window.
    /// @param _instrShare amount of UDAO to be paid to the instructor, it is revenue of instructor from content sales.
    /// @param _inst address of the instructor.
    /// @param _transactionTime indicates the day of the transaction (number of days passed since 1Jan1970-0:0:0)
    /// @param _transactionLBIndex determines the payment will be added to which position in the insLockedBalance array.
    function _updateInstructorBalances(
        uint256 _instrShare,
        address _inst,
        uint256 _transactionTime,
        uint256 _transactionLBIndex
    ) internal {
        /// @dev Safety variable to prevent reentrancy attacks.
        uint256 tempSafetyBalance;
        /// @dev "if/else": is there any change on the refund window? Or, is it the instructor's first sale?
        if (prevInstRefundWindow[_inst] != refundWindow) {
            /// @dev 'for' loop will iterate during the old refund window period if it is bot equal to '0' ...
            /// @dev ... The loop collects instructor locked balances and removes them from the insLockedBalance array.
            for (uint256 i = 0; i < prevInstRefundWindow[_inst]; i++) {
                tempSafetyBalance += instLockedBalance[_inst][i];
                instLockedBalance[_inst][i] = 0;
            }
            /// @dev initiate or update the instructor's previous refund window with platform's refund window.
            prevInstRefundWindow[_inst] = refundWindow;
            /// @dev initiate or update the instructor lock time
            instLockTime[_inst] = _transactionTime;
            /// @dev add the "collected old balances" to instructor locked balance according to the new refund window.
            instLockedBalance[_inst][_transactionLBIndex] += tempSafetyBalance;
        }
        /// @dev Calculate the number of days that have passed since the last update of instructor balance.
        uint256 dayPassedInst = _transactionTime - instLockTime[_inst];
        /// @dev Check if there are any payments in the instLockedBalance array that need to be paid to the instructor.
        if (dayPassedInst >= refundWindow) {
            /// @dev The instLockedBalance array contains payments that need be paid to the instructor.
            /// @dev Defines how many elements of instLockedBalance array have completed the refund window period.
            uint256 dayPassedInstMod;
            /// @dev Check if all elements in the instLockedBalance arrays have completed the refund window period.
            if (dayPassedInst >= (refundWindow * 2)) {
                /// @dev All elements, instLockedBalance array holds payments within the range [0, refundWindow-1].
                dayPassedInstMod = refundWindow - 1;
            } else {
                /// @dev Not all, but some, elements of the instLockedBalance have completed the refund window period.
                dayPassedInstMod = dayPassedInst % refundWindow;
            }
            /// @dev Iterate the loop through elements that completed the refund window period.
            /// @dev Adding completed payments to tempSafetyBalance, and remove them from the instLockedBalance array.
            for (uint256 i = 0; i <= dayPassedInstMod; i++) {
                /// @dev The indexOfPayout determines which element of the instLockedBalance array will be paid to the instructor.
                /// @dev It start from today(i=0) and goes to past during the loop iterations.
                /// @dev Circular array indexing prevents negative indexes using addition and modulo operations with refundWindow.
                uint256 indexOfPayout = ((_transactionLBIndex + refundWindow) -
                    i) % refundWindow;
                tempSafetyBalance += instLockedBalance[_inst][indexOfPayout];
                instLockedBalance[_inst][indexOfPayout] = 0;
            }
            /// @dev Add the sum of refund window's completed payments to the instructor balance.
            instBalance[_inst] += tempSafetyBalance;
            /// @dev Update instLockTime to the oldest day where payments have not been paid to the instructor yet.
            /// @dev It is "(today-refundWindow)+1" so as of today, all refund window completed payments have been transfered.
            instLockTime[_inst] = (_transactionTime - refundWindow) + 1;

            if (tempSafetyBalance != 0) {
                emit InstructorBalanceUpdated(_inst, instBalance[_inst]);
            }
        }
        /// @dev Add the "new payment" to instLockedBalance.
        instLockedBalance[_inst][_transactionLBIndex] += _instrShare;

        if ((_instrShare != 0) || (tempSafetyBalance != 0)) {
            emit InstructorLockedBalanceUpdated(_inst);
        }
    }

    /// @notice Distributes platform revenue to platform roles and transfers governance role shares to the governance treasury.
    function _transferPlatformCutstoGovernance() internal {
        if (contentCutPool > contentCutRefundedBalance) {
            uint positiveContentCutPool = contentCutPool -
                contentCutRefundedBalance;
            contentCutPool = 0;
            contentCutRefundedBalance = 0;
            emit ContentCutPoolUpdated(contentCutPool);

            _distributeContentCutShares(positiveContentCutPool);
            emit RoleBalancesUpdated(
                foundationBalance,
                jurorBalance,
                validatorsBalance,
                governanceBalance
            );
        }

        if (coachingCutPool > coachingCutRefundedBalance) {
            uint positiveCoachingCutPool = coachingCutPool -
                coachingCutRefundedBalance;
            coachingCutPool = 0;
            coachingCutRefundedBalance = 0;
            emit CoachingCutPoolUpdated(coachingCutPool);

            _distributeCoachingCutShares(positiveCoachingCutPool);
            emit RoleBalancesUpdated(
                foundationBalance,
                jurorBalance,
                validatorsBalance,
                governanceBalance
            );
        }

        if (isGovernanceTreasuryOnline == true) {
            uint transferredJurorBalance = jurorBalance;
            uint transferredValidatorBalance = validatorsBalance;
            uint transferredGovernanceBalance = governanceBalance;

            if (jurorBalance > 0) {
                jurorBalance = 0;
                udao.transfer(governanceTreasury, transferredJurorBalance);
                iGovernanceTreasury.jurorBalanceUpdate(transferredJurorBalance);
            }
            if (validatorsBalance > 0) {
                validatorsBalance = 0;
                udao.transfer(governanceTreasury, transferredValidatorBalance);
                iGovernanceTreasury.validatorBalanceUpdate(
                    transferredValidatorBalance
                );
            }
            if (governanceBalance > 0) {
                governanceBalance = 0;
                udao.transfer(governanceTreasury, transferredGovernanceBalance);
                iGovernanceTreasury.governanceBalanceUpdate(
                    transferredGovernanceBalance
                );
            }
            if (
                (transferredJurorBalance +
                    transferredValidatorBalance +
                    transferredGovernanceBalance) > 0
            ) {
                emit RoleBalancesUpdated(
                    foundationBalance,
                    jurorBalance,
                    validatorsBalance,
                    governanceBalance
                );
            }
        }
    }

    /// @notice Allows learner to get refund of coaching 1 day prior to coaching date, or coach to refund in refund window
    /// @param _refCoachSaleID The ID of the coaching sale
    function refundCoachingByInstructorOrLearner(
        uint256 _refCoachSaleID
    ) external whenNotPaused {
        CoachingSale storage refundItem = coachSales[_refCoachSaleID];
        require(
            refundItem.refundablePeriod >= (block.timestamp / epochOneDay),
            "Refund period over you cant refund"
        );
        if (msg.sender == refundItem.payee) {
            require(
                refundItem.coachingDate >= block.timestamp + epochOneDay,
                "You can't refund less than 1 day prior to coaching date"
            );
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
        emit SaleRefunded(_refCoachSaleID, 0);
    }

    /// @notice Allows refund of coaching with a voucher created by platform
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
        emit SaleRefunded(voucher.saleID, 0);
    }

    /// @notice Allows refund of a content with a voucher created by platform
    /// @param voucher A RefundVoucher
    function newRefundContent(
        IVoucherVerifier.RefundVoucher calldata voucher
    ) external whenNotPaused {
        voucherVerifier.verifyRefundVoucher(voucher);

        ContentSale storage refundItem = contentSales[voucher.saleID];

        require(
            refundItem.refundablePeriod >= (block.timestamp / epochOneDay),
            "refund period over you cant refund"
        );

        require(refundItem.isRefunded == false, "Already refunded!");

        for (uint256 j; j < refundItem.purchasedParts.length; j++) {
            uint256 part = refundItem.purchasedParts[j];
            /// @dev Set the content as not bought
            isTokenBought[refundItem.contentReceiver][refundItem.tokenId][
                part
            ] = false;
        }
        /// @dev If the sale was a full content purchase...
        if (refundItem.fullPurchase == true) {
            isFullyPurchased[refundItem.contentReceiver][
                refundItem.tokenId
            ] = false;
        }

        contentSales[voucher.saleID].isRefunded = true;
        /// @dev First remove specific content from the contentReceiver
        delete ownedContents[refundItem.contentReceiver][refundItem.tokenId];

        /// @dev Then add the content to the contentReceiver if voucher.finalParts exists;
        if (voucher.finalParts.length > 0) {
            ownedContents[refundItem.contentReceiver][
                refundItem.tokenId
            ] = voucher.finalParts;
        }

        instRefundedBalance[refundItem.instructor] += refundItem.instrShare;
        contentCutRefundedBalance += refundItem.totalCut;

        udao.transfer(
            refundItem.payee,
            (refundItem.instrShare + refundItem.totalCut)
        );
        emit SaleRefunded(voucher.saleID, 1);
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
