// SPDX-License-Identifier: MIT
/// @title Content purchasing and cut management
pragma solidity ^0.8.4;
import "./MyBasePlatform.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/draft-EIP712.sol";

//import "../interfaces/IPriceGetter.sol";

abstract contract ContentManager is EIP712, MyBasePlatform {
    string private constant SIGNING_DOMAIN = "ContentManager";
    string private constant SIGNATURE_VERSION = "1";

    /// @notice  triggered if coaching service payment to the instructor is forced
    event ForcedPayment(uint256 _coachingId, address forcedBy);
    /// @notice triggered when any kind of refund is done
    event Refund(
        uint256 _coachingId,
        address forcedBy,
        uint256 totalPaymentAmount
    );
    /// @notice triggered when coaching bought
    event CoachingBought(address learner, uint256 tokenId, uint256 coachingId);
    /// @notice triggered when coaching finalized
    event CoachingFinalized(uint256 coachingId, address coach, address learner);
    /// @notice triggered when coaching deadline delayed
    event DeadlineDelayed(uint256 coachingId, uint256 newDeadline);
    /// @notice triggered when content bought
    event ContentBought(
        uint256 tokenId,
        uint256[] parts,
        uint256 pricePaid,
        address buyer
    );

    /// @notice Represents usage rights for a content (or part)
    /**
     * @notice struct to hold content discount voucher information
     * @param tokenId id of the content
     * @param fullContentPurchase is full content purchased
     * @param purchasedParts parts of the content purchased
     * @param priceToPay price to pay
     * @param validUntil date until the voucher is valid
     * @param redeemer address of the redeemer
     * @param giftReceiver address of the gift receiver if purchase is a gift
     * @param signature the EIP-712 signature of all other fields in the ContentDiscountVoucher struct.
     */
    struct ContentDiscountVoucher {
        /// @notice The id of the token (content) to be redeemed.
        uint256 tokenId;
        /// @notice True, if full content is purchased
        bool fullContentPurchase;
        /// @notice Purchased parts
        uint256[] purchasedParts;
        /// @notice Price to deduct
        uint256 priceToPay;
        /// @notice The date until the voucher is valid
        uint256 validUntil;
        /// @notice Address of the redeemer
        address redeemer;
        /// @notice Address of the gift receiver if purhcase is a gift
        address giftReceiver;
        /// @notice the EIP-712 signature of all other fields in the ContentDiscountVoucher struct.
        bytes signature;
    }

    /// @notice Represents a refund voucher for a coaching
    struct RefundVoucher {
        address contentReceiver;
        uint256 refundID;
        uint256 tokenId;
        uint256[] finalParts;
        uint256 validUntil;
        bytes signature;
    }

    // wallet => content token Ids
    mapping(address => uint256[][]) ownedContents;
    // tokenId => student addresses
    mapping(uint256 => address[]) public studentList;

    /**
     * @notice struct to hold coaching information
     * @param coach address of the coach
     * @param learner address of the learner
     * @param moneyLockDeadline deadline of the money locked
     * @param coachingPaymentAmount amount of token that coach is going to get
     * @param isDone status of the coaching
     * @param totalPaymentAmount total payment amount to buy coaching (includes cuts for platform)
     * @param isRefundable is coaching refundable
     */
    struct CoachingStruct {
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
    mapping(uint256 => CoachingStruct) public coachingStructs;
    uint256 private coachingIndex;

    //IPriceGetter priceGetter;

    constructor()
        // address priceGetterAddress
        EIP712(SIGNING_DOMAIN, SIGNATURE_VERSION)
    {
        //priceGetter = IPriceGetter(priceGetterAddress);
    }

    //@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@//
    //@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@//
    using Counters for Counters.Counter;
    Counters.Counter private purchaseID;

    struct ASaleOccured {
        address payee;
        address contentReceiver;
        uint256 instrShare;
        uint256 totalCut;
        uint256 tokenId;
        uint256[] purchasedParts;
        uint256 validDate;
    }

    mapping(uint256 => ASaleOccured) public sales;

    /// @notice Returns amount of UDAO that is needed to buy the contents
    /// @param tokenIds ids of the content
    /// @param fullContentPurchases is full content purchased
    /// @param purchasedParts parts of the content purchased
    function calculatePriceToPay(
        uint256[] calldata tokenIds,
        bool[] calldata fullContentPurchases,
        uint256[][] calldata purchasedParts
    ) external view returns (uint256) {
        uint256 tokenIdsLength = tokenIds.length;
        uint256 totalPriceToPayUdao;
        for (uint256 i; i < tokenIdsLength; i++) {
            // Calculate purchased parts (or full Content) total list price.
            totalPriceToPayUdao += _calculatePriceToPay(
                tokenIds[i],
                fullContentPurchases[i],
                purchasedParts[i]
            );
        }
        return (totalPriceToPayUdao);
    }

    /// @notice Allows multiple content purchases using buyContent
    /// @param tokenIds ids of the content
    /// @param fullContentPurchases is full content purchased
    /// @param purchasedParts parts of the content purchased
    /// @param giftReceivers address of the gift receiver if purchase is a gift
    function buyContent(
        uint256[] calldata tokenIds,
        bool[] calldata fullContentPurchases,
        uint256[][] calldata purchasedParts,
        address[] calldata giftReceivers,
        uint256 amountToPay
    ) external payable whenNotPaused {
        require(
            udao.allowance(msg.sender, address(this)) >= amountToPay,
            "Not enough allowance!"
        );
        uint256 tokenIdsLength = tokenIds.length;
        require(
            tokenIdsLength == fullContentPurchases.length &&
                tokenIdsLength == purchasedParts.length &&
                tokenIdsLength == giftReceivers.length,
            "Array lengths are not equal!"
        );
        uint256 totalPriceToPayUdao;
        uint256[] memory priceToPay;
        for (uint256 i; i < tokenIdsLength; i++) {
            priceToPay[i] = _calculatePriceToPay(
                tokenIds[i],
                fullContentPurchases[i],
                purchasedParts[i]
            );
            // Calculate purchased parts (or full Content) total list price.
            totalPriceToPayUdao += priceToPay[i];
            //HELLOOO: Eğer bir array tanımlayım _calculatePriceları içine atıp aşşağıdaki internale direl totalPrice sokarsan daha mı iyi?
        }

        require(amountToPay >= totalPriceToPayUdao, "Not enough UDAO sent!");

        for (uint256 i; i < tokenIdsLength; i++) {
            _buyContentwithUDAO(
                tokenIds[i],
                fullContentPurchases[i],
                purchasedParts[i],
                giftReceivers[i],
                priceToPay[i]
            );
        }

        _sendCurrentGlobalCutsToGovernanceTreasury();
    }

    function _buyContentwithUDAO(
        uint256 tokenId,
        bool fullContentPurchase,
        uint256[] calldata purchasedParts,
        address giftReceiver,
        uint256 _priceToPayUdao
    ) internal whenNotPaused {
        // Check the existence of the content, if not revert
        require(udaoc.exists(tokenId), "Content does not exist!");
        // Is this purchase a gift to someone?, if it is change the receiver
        address contentReceiver = msg.sender;
        if (giftReceiver != address(0)) {
            contentReceiver = giftReceiver;
        }
        // Check do receiver have that content or its part, if it is revert
        bool receiverHaveIt = _doReceiverHaveContentOrPart(
            tokenId,
            fullContentPurchase,
            purchasedParts,
            contentReceiver
        );
        require(receiverHaveIt == false, "Content or part's is already bought");
        // Who created and own that content?
        address instructor = udaoc.ownerOf(tokenId);

        uint256 totalCut = getTotalCutContentShare(_priceToPayUdao);
        uint256 instrShare = _priceToPayUdao - totalCut;

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
            contentReceiver,
            instrShare,
            totalCut,
            tokenId,
            purchasedParts,
            transactionTime + refundWindow
        );

        //TODO we need to check functions visibility(view/pure/public) and behaviour (external/internal)
        emit ContentBought(
            tokenId,
            purchasedParts,
            _priceToPayUdao,
            msg.sender
        );
    }

    function _buyContentwithFIAT(
        uint256 tokenId,
        bool fullContentPurchase,
        uint256[] calldata purchasedParts,
        address contentReceiver
    ) internal whenNotPaused {
        // Check the existence of the content, if not revert
        require(udaoc.exists(tokenId), "Content does not exist!");
        // Platform uses backend wallet to do this transaction There should be a receiver
        require(
            contentReceiver != address(0),
            "Content receiver cannot be zero address"
        );
        // Check do receiver have that content or its part, if it is revert
        bool receiverHaveIt = _doReceiverHaveContentOrPart(
            tokenId,
            fullContentPurchase,
            purchasedParts,
            contentReceiver
        );
        require(receiverHaveIt == false, "Content or part's is already bought");
        // Who created and own that content?
        address instructor = udaoc.ownerOf(tokenId);
        // Calculate purchased parts (or full Content) total list price.
        uint256 priceToPayUdao = _calculatePriceToPay(
            tokenId,
            fullContentPurchase,
            purchasedParts
        );

        uint256 totalCut = getTotalCutContentShare(priceToPayUdao);
        uint256 instrShare = 0;

        //timestamp returns 1694513188: 12Sep2023-10:06:28 so buyerTransactionTime is 19612.42
        //this means 19612.42 day passed since 1Jan1970-0:0:0
        //There is no fractional number in solidity so that buyerTransactionTime is 19612
        uint256 transactionTime = (block.timestamp / epochOneDay);

        //transactionFuIndex determines which position it will be added to in the FutureBalances array.
        uint256 transactionFuIndex = transactionTime % refundWindow;

        // transfer the tokens from buyer to contract (NOTE: Actually priceToPayUdao= totalCut + instrShare, maybe use that)
        // NOTE: Eğer payable olacaksa buna gerekyok. Hala batch bir fonsiyon lazım ama yeni bir buyContentFIAT fonksiyonu yazalım o bu internal fonksiyonu çağırsın.
        udao.transferFrom(msg.sender, address(this), totalCut);

        // distribute everyones share and pay to instructor (NOTE: maybe we should hold shares as a whole and end of lifecyle we should split them)
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
            contentReceiver,
            instrShare,
            totalCut,
            tokenId,
            purchasedParts,
            transactionTime + refundWindow
        );

        //TODO List
        //2)also cuts must be send to governanceTreasury but maybe we can add it to inside _updateGlobalBalances
        //3)we need to check functions visibility(view/pure/public) and behaviour (external/internal)
        //NOTE: aşşağıdaki fonksiyonu batch buyContentFIAT external fonksiyonuna taşı
        _sendCurrentGlobalCutsToGovernanceTreasury();
        emit ContentBought(tokenId, purchasedParts, priceToPayUdao, msg.sender);
    }

    function _calculatePriceToPay(
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

    function _calculateShares(
        uint256 _priceOf,
        bool isAContentSale,
        bool isAFIATPayout
    )
        internal
        view
        returns (uint256, uint256, uint256, uint256, uint256, uint256)
    {
        uint256 foundShare;
        uint256 goverShare;
        uint256 valdtrShare;
        uint256 jurorShare;
        uint256 instrShare;

        //isAContentSale: (=true for ContentSale), (=false for CoachingSale)
        if (isAContentSale) {
            foundShare = (_priceOf * contentFoundationCut) / 100000;
            goverShare = (_priceOf * contentGovernanceCut) / 100000;
            valdtrShare = (_priceOf * contentValidatorCut) / 100000;
            jurorShare = (_priceOf * contentJurorCut) / 100000;
        } else {
            foundShare = (_priceOf * coachingFoundationCut) / 100000;
            goverShare = (_priceOf * coachingGovernanceCut) / 100000;
            valdtrShare = 0; //due to (_priceOf * {coachingValidatorCut=0}) / 100000;
            jurorShare = (_priceOf * coachingJurorCut) / 100000;
        }

        uint256 totalCut;
        totalCut = foundShare + goverShare + valdtrShare + jurorShare;

        if (isAFIATPayout) {
            instrShare = 0;
        } else {
            instrShare = _priceOf - totalCut;
        }

        return (
            foundShare,
            goverShare,
            valdtrShare,
            jurorShare,
            totalCut,
            instrShare
        );
    }

    function _updateInstructorBalances(
        uint256 _instrShare,
        address _inst,
        uint256 _transactionTime,
        uint256 _transactionFuIndex
    ) internal {
        //how many day passed since last update of instructor balance
        uint256 dayPassedInst = _transactionTime - instUpdTime[_inst];

        if (dayPassedInst < refundWindow) {
            // if(true):There is no payment yet to be paid to the seller in the future balance array.
            // add new payment to instructor futureBalanceArray
            instFuBalance[_inst][_transactionFuIndex] += _instrShare;
        } else {
            // if(else): The future balance array contains values that must be paid to the user.
            if (dayPassedInst >= (refundWindow * 2)) {
                //Whole Future Balance Array must paid to user (Because (refundWindow x2)28 day passed)
                for (uint256 i = 0; i < refundWindow; i++) {
                    instCurBalance[_inst] += instFuBalance[_inst][i];
                    instFuBalance[_inst][i] = 0;
                }
                // add new payment to instructor futureBalanceArray
                instFuBalance[_inst][_transactionFuIndex] += _instrShare;

                // you updated instructor currentBalance of instructorso declare a new time to instUpdTime
                // why (-refundWindow + 1)? This will sustain today will be no more update on balances...
                // ...but tomarrow a transaction will produce new update.
                instUpdTime[_inst] = (_transactionTime - refundWindow) + 1;
            } else {
                //Just some part of Future Balance Array must paid to instructor
                uint256 dayPassedInstMod = dayPassedInst % refundWindow;
                //minimum dayPassedInst=14 so Mod 0, maximum dayPassedInst=27 so Mod 13
                //if Mod 0 for loop works for today, if Mod 2 it works for today+ yesterday,,, if it 13
                for (uint256 i = 0; i <= dayPassedInstMod; i++) {
                    //Index of the day to be payout to instructor.
                    uint256 indexOfPayout = ((_transactionFuIndex +
                        refundWindow) - i) % refundWindow;
                    instCurBalance[_inst] += instFuBalance[_inst][
                        indexOfPayout
                    ];
                    instFuBalance[_inst][indexOfPayout] = 0;
                }

                // add new payment to instructor futureBalanceArray
                instFuBalance[_inst][_transactionFuIndex] += _instrShare;

                // you updated instructor currentBalance of instructorso declare a new time to instUpdTime
                // why (-refundWindow + 1)? This will sustain today will be no more update on balances...
                // ...but tomarrow a transaction will produce new update.
                instUpdTime[_inst] = (_transactionTime - refundWindow) + 1;
            }
        }
    }

    function _updateGlobalBalances(
        uint256 foundShare,
        uint256 goverShare,
        uint256 valdtrShare,
        uint256 jurorShare
    ) internal {
        //timestamp returns 1694513188: 12Sep2023-10:06:28 so buyerTransactionTime is 19612.42
        //this means 19612.42 day passed since 1Jan1970-0:0:0
        //There is no fractional number in solidity so that buyerTransactionTime is 19612
        uint256 transactionTime = (block.timestamp / epochOneDay);

        //transactionFuIndex determines which position it will be added to in the FutureBalances array.
        uint256 transactionFuIndex = transactionTime % refundWindow;

        //how many day passed since last update of instructor balance
        uint256 dayPassedGlo = transactionTime - gloUpdTime;

        if (dayPassedGlo < refundWindow) {
            // if(true):There is no payment yet to be paid to the seller in the future balance array.
            // add new payment to instructor futureBalanceArray
            //REP//instFuBalance[_inst][transactionFuIndex] += _instrShare;
            foundFuBalance[transactionFuIndex] += foundShare;
            goverFuBalance[transactionFuIndex] += goverShare;
            valdtrFuBalance[transactionFuIndex] += valdtrShare;
            jurorFuBalance[transactionFuIndex] += jurorShare;
        } else {
            // if(else): The future balance array contains values that must be paid to the user.
            if (dayPassedGlo >= (refundWindow * 2)) {
                //Whole Future Balance Array must paid to user (Because (refundWindow x2)28 day passed)
                for (uint256 i = 0; i < refundWindow; i++) {
                    //REP//instCurBalance[_inst] += instFuBalance[_inst][i];
                    foundCurBalance += foundFuBalance[i];
                    goverCurBalance += goverFuBalance[i];
                    valdtrCurBalance += valdtrFuBalance[i];
                    jurorCurBalance += jurorFuBalance[i];
                    //REP//instFuBalance[_inst][i] = 0;
                    foundFuBalance[i] = 0;
                    goverFuBalance[i] = 0;
                    valdtrFuBalance[i] = 0;
                    jurorFuBalance[i] = 0;
                }

                // add new payment to instructor futureBalanceArray
                //REP//instFuBalance[_inst][transactionFuIndex] += _instrShare;
                foundFuBalance[transactionFuIndex] += foundShare;
                goverFuBalance[transactionFuIndex] += goverShare;
                valdtrFuBalance[transactionFuIndex] += valdtrShare;
                jurorFuBalance[transactionFuIndex] += jurorShare;

                // you updated instructor currentBalance of instructorso declare a new time to instUpdTime
                // why (-refundWindow + 1)? This will sustain today will be no more update on balances...
                // ...but tomarrow a transaction will produce new update.
                //REP//instUpdTime[_inst] = (transactionTime - refundWindow) + 1;
                gloUpdTime = (transactionTime - refundWindow) + 1;
            } else {
                //Just some part of Future Balance Array must paid to instructor
                uint256 dayPassedGloMod = dayPassedGlo % refundWindow;
                //minimum dayPassedInst=14 so Mod 0, maximum dayPassedInst=27 so Mod 13
                //if Mod 0 for loop works for today, if Mod 2 it works for today+ yesterday,,, if it 13
                for (uint256 i = 0; i <= dayPassedGloMod; i++) {
                    //Index of the day to be payout to instructor.
                    uint256 indexOfPayout = ((transactionFuIndex +
                        refundWindow) - i) % refundWindow;
                    //REP//instCurBalance[_inst] += instFuBalance[_inst][indexOfPayout];
                    foundCurBalance += foundFuBalance[indexOfPayout];
                    goverCurBalance += goverFuBalance[indexOfPayout];
                    valdtrCurBalance += valdtrFuBalance[indexOfPayout];
                    jurorCurBalance += jurorFuBalance[indexOfPayout];
                    //REP//instFuBalance[_inst][indexOfPayout] = 0;
                    foundFuBalance[indexOfPayout] = 0;
                    goverFuBalance[indexOfPayout] = 0;
                    valdtrFuBalance[indexOfPayout] = 0;
                    jurorFuBalance[indexOfPayout] = 0;
                }

                // add new payment to instructor futureBalanceArray
                //REP//instFuBalance[_inst][transactionFuIndex] += _instrShare;
                foundFuBalance[transactionFuIndex] += foundShare;
                goverFuBalance[transactionFuIndex] += goverShare;
                valdtrFuBalance[transactionFuIndex] += valdtrShare;
                jurorFuBalance[transactionFuIndex] += jurorShare;

                // you updated instructor futureBalanceArray updated so declare a new time to instUpdTime
                // why (-refundWindow + 1)? This will sustain today will be no more update on balances...
                // ...but tomarrow a transaction will produce new update.
                //REP//instUpdTime[_inst] = (transactionTime - refundWindow) + 1;
                gloUpdTime = (transactionTime - refundWindow) + 1;
            }
        }
    }

    //    uint256 public glbCntntCurBalance;
    //    uint256[] public glbCntntFuBalance;
    function _updateGlobalContentBalances(
        uint256 totalCutContentShare,
        uint256 _transactionTime,
        uint256 _transactionFuIndex
    ) internal {
        //how many day passed since last update of instructor balance
        uint256 dayPassedGlo = _transactionTime - gloCntntUpdTime;

        if (dayPassedGlo < refundWindow) {
            // if(true):There is no payment yet to be paid to the seller in the future balance array.
            // add new payment to instructor futureBalanceArray
            glbCntntFuBalance[_transactionFuIndex] += totalCutContentShare;
        } else {
            // if(else): The future balance array contains values that must be paid to the user.
            if (dayPassedGlo >= (refundWindow * 2)) {
                //Whole Future Balance Array must paid to user (Because (refundWindow x2)28 day passed)
                for (uint256 i = 0; i < refundWindow; i++) {
                    glbCntntCurBalance += glbCntntFuBalance[i];

                    glbCntntFuBalance[i] = 0;
                }

                // add new payment to instructor futureBalanceArray
                glbCntntFuBalance[_transactionFuIndex] += totalCutContentShare;

                // you updated instructor currentBalance of instructorso declare a new time to instUpdTime
                // why (-refundWindow + 1)? This will sustain today will be no more update on balances...
                // ...but tomarrow a transaction will produce new update.
                gloCntntUpdTime = (_transactionTime - refundWindow) + 1;
            } else {
                //Just some part of Future Balance Array must paid to instructor
                uint256 dayPassedGloMod = dayPassedGlo % refundWindow;
                //minimum dayPassedInst=14 so Mod 0, maximum dayPassedInst=27 so Mod 13
                //if Mod 0 for loop works for today, if Mod 2 it works for today+ yesterday,,, if it 13
                for (uint256 i = 0; i <= dayPassedGloMod; i++) {
                    //Index of the day to be payout to instructor.
                    uint256 indexOfPayout = ((_transactionFuIndex +
                        refundWindow) - i) % refundWindow;
                    glbCntntCurBalance += glbCntntFuBalance[indexOfPayout];

                    glbCntntFuBalance[indexOfPayout] = 0;
                }

                // add new payment to instructor futureBalanceArray
                glbCntntFuBalance[_transactionFuIndex] += totalCutContentShare;

                // you updated instructor futureBalanceArray updated so declare a new time to instUpdTime
                // why (-refundWindow + 1)? This will sustain today will be no more update on balances...
                // ...but tomarrow a transaction will produce new update.
                gloCntntUpdTime = (_transactionTime - refundWindow) + 1;
            }
        }
    }

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

    function _saveTheSaleOnAListForRefund(
        address _contentReceiver,
        uint256 _instrShare,
        uint256 _totalCut,
        uint256 _tokenId,
        uint256[] memory _purchasedParts,
        uint256 _validDate
    ) internal {
        sales[purchaseID.current()] = ASaleOccured({
            payee: msg.sender,
            contentReceiver: _contentReceiver,
            instrShare: _instrShare,
            totalCut: _totalCut,
            tokenId: _tokenId,
            purchasedParts: _purchasedParts,
            validDate: _validDate
        });
        purchaseID.increment();
        //TODO Not implemented YET
    }

    function _sendCurrentGlobalCutsToGovernanceTreasury() internal {
        //TODO Not implemented YET
        if (glbCntntCurBalance > 0) {
            jurorCurBalance = getContentJurorShare(glbCntntCurBalance);
            valdtrCurBalance = getContentValdtrShare(glbCntntCurBalance);
            goverCurBalance = getContentGoverShare(glbCntntCurBalance);
            foundCurBalance = getContentFoundShare(glbCntntCurBalance);
        }
        if (isGovernanceTreasuryOnline == true) {
            if (jurorCurBalance > 0) {
                uint sendJurorShareToGovTre = jurorCurBalance;
                jurorCurBalance = 0;
                udao.transferFrom(
                    address(this),
                    governanceTreasury,
                    sendJurorShareToGovTre
                );
                //iGovernanceTreasury.jurorBalanceUpdate(sendJurorShareToGovTre);
            }
            if (valdtrCurBalance > 0) {
                uint sendValdtrShareToGovTre = valdtrCurBalance;
                valdtrCurBalance = 0;
                udao.transferFrom(
                    address(this),
                    governanceTreasury,
                    sendValdtrShareToGovTre
                );
                //iGovernanceTreasury.validatorBalanceUpdate(sendValdtrShareToGovTre);
            }
            if (goverCurBalance > 0) {
                uint sendGoverShareToGovTre = goverCurBalance;
                goverCurBalance = 0;
                udao.transferFrom(
                    address(this),
                    governanceTreasury,
                    sendGoverShareToGovTre
                );
                //iGovernanceTreasury.governanceBalanceUpdate(sendGoverShareToGovTre);
            }
        }
    }

    //    mapping(uint256 => ASaleOccured) public sales;
    /// @notice Represents a refund voucher for a coaching
    /*
    struct RefundVoucher {
        address contentReceiver;
        uint256 refundID;
        uint256 tokenId;
        uint256[] finalParts;
        uint256 validUntil;
        bytes signature;
    }
    */
    function newRefund(RefundVoucher calldata voucher) external {
        address signer = _verifyRefundVoucher(voucher);
        require(
            IRM.hasRole(BACKEND_ROLE, signer),
            "Signature invalid or unauthorized"
        );

        ASaleOccured storage refundItem = sales[voucher.refundID];

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
            refundItem.validDate < (block.timestamp / epochOneDay),
            "refund period over you cant refund"
        );
        /*
        1,2
        4,5
        3
        [1][1,2,4,5,3]
        [1][], [][]
        [1][1,2,3]
        */
        /// @dev First remove specific content from the contentReceiver
        delete ownedContents[voucher.contentReceiver][voucher.tokenId];
        /// @dev Then add the content to the contentReceiver
        ownedContents[voucher.contentReceiver][voucher.tokenId] = voucher.finalParts;

        address instructor = udaoc.ownerOf(refundItem.tokenId);
        instructorDebt[instructor] += refundItem.instrShare;
        globalCntntRefDept += refundItem.totalCut;

        udao.transferFrom(
            address(this),
            refundItem.payee,
            (refundItem.instrShare + refundItem.totalCut)
        );
    }

    function _buyDisc() internal {
        //TODO Not implemented YET
    }

    // TODO Refund voucher için backend dışında farklı bir wallet kullanılsın.
    // Biz kendimiz otomatize edelim.
    /*
    function refund(calldata RefundVoucher voucher) external {
        uint256 buyTransactionTime = voucher.buyTransactionTime;
        
        uint paidPrice = voucher.paidPrice; //(instrShare + totalCut)
        /// @dev Shares
        uint256 foundShare = voucher.foundShare;
        uint256 goverShare = voucher.goverShare;
        uint256 valdtrShare = voucher.validtrShare;
        uint256 jurorShare = voucher.jurorShare;
        uint256 totalCut = = voucher.total.cut;
        uint256 instrShare = voucher.instrShare;
        /// @dev Wallet addrsses
        address instructor = voucher.instructor;
        address payee = voucher.payee;
        address contentReceiver = voucher.contentReceiver;

        uint256 tokenID = voucher.tokenID;
        uint256[] memory purchasedParts = voucher.purchasedParts;
        bool isAFIATPayout = voucher.isAFIATPayout;
        uint256 validUntil = voucher.validUntil; //e.g  buyTransactionTime + RefundWindow
        require(
            // şu anki tarih <= 28 ocaktan küçük olmalı
            block.timestamp <= validUntil,
            "Refund voucher is expired!"
        );

        // Check if contentReceiver has the content or part
        bool receiverHaveIt = _doReceiverHaveContentOrPart(
            tokenID,
            false,
            purchasedParts,
            contentReceiver
        );
        require(receiverHaveIt == true, "Content or part's is not bought");
        // delete content from contentReceiver
        // juror/foundation/validator/governance 'a borç yaz
        // instructor' a borç yaz
        // implement refund (udao.transfer(payee, paidPrice)))
        
        
    }
    */
    //TODO We should have
    //_saveTheSaleOnAListForRefund(TransactionTime, msg.sender, (paidPrice, isAFIATPayout), instructor, contentReceiver, (tokenID, purchasedParts))
    ////// Parayı FutureBalanceArray'inden alma, "Dept" olarak ekle! Çünkü refund windowu gelecekte değiştirirsen problem yaşarsın. (jurorDept, instructorDept[address],foundationDept)
    ////// TransactionTime Lazım! Bu ve refund window kullanılarak refundun gerçekleşebileceği tarhi aralığı bulunur.
    // TrasnactionTime lazım değil. Bir event trigger ederiz. Backend o eventin gerçekleşme tarihine bakar geçmişe dönük.
    // ya da backendde satın alma tarihleri tutulur. Ona göre voucher oluşturulur.
    ////// msg.sender kaydedilmeli! Bu parayı kime iade edeceğimi gösterecek. (Kişi çağırdıysa kişi platform çağırdıysa platform)
    // Buna da gerek yok. transactionTime için yazdıklarım bunun içinde geçerli bence. uygulanabilir...
    ////// fiatPayout mu udaoPayout mu? msg.sender'a ne kadar gidecek bu bilgi lazım. direk instructorShare + totalCut'ı yaz buraya
    // Buna da gerek yok :D Yine backend halleder.
    ////// instructor adress lazım! ödeme yapıldıysa kimden parayı geri alıcam.
    // Buna da gerek yok. ownerOf(tokenId) zaten instructor adresini veriyor.
    ////// contentReceiver lazım.
    // Bunun için de voucher oluşturulurken contentReceiver'ı da yazdırırız.
    ////// tokenID - purchasedParts lazım hangi kontenti ve parçalarını alıcıdan silicem
    // BOSVER VOUCHER KULLAN burdaki tüm değişkenleri eventle dışarı aktar offchain Kaydetsin bieyere!

    //_aNewRefundFunction()
    ////// Refund talebi kullanıcı tarafından offChainde bize bildirilir.
    ////// eğer fiat ödemeyse, kişi offChain butona basar ve refund fonksiyonunu biz çağırırız yada onaylamazsak çağırmayız. (yada tamamen voucher veririz ve bunu çağır deriz. seçeneklerdir bunlar.)
    ////// off chainde biz belirlediğimiz şartlara göre onaylarsak yada instructor onaylarsa ödeme iade olur.(CALL refund function) Eğer iki tarafta redederse iade reddedilir. (NO CALL) Juror yok burda hiçbir şekil.

    //_sendCurrentGlobalCutsToGovernanceTreasury

    //BuyDiscountedContent() function

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
                            "RefundVoucher(address contentReceiver,uint256 refundID,uint256 tokenId,uint256[] finalParts,uint256 validUntil)"
                        ),
                        voucher.contentReceiver,
                        voucher.refundID,
                        voucher.tokenId,
                        keccak256(abi.encodePacked(voucher.finalParts)),
                        voucher.validUntil
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
}
