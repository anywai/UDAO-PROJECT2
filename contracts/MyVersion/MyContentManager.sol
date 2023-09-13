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
    /// @notice Allows multiple content purchases using buyContent
    /// @param tokenIds ids of the content
    /// @param fullContentPurchases is full content purchased
    /// @param purchasedParts parts of the content purchased
    /// @param giftReceivers address of the gift receiver if purchase is a gift
    function buyContent(
        uint256[] calldata tokenIds,
        bool[] calldata fullContentPurchases,
        uint256[][] calldata purchasedParts,
        address[] calldata giftReceivers
    ) external payable whenNotPaused {
        uint256 tokenIdsLength = tokenIds.length;
        require(
            tokenIdsLength == fullContentPurchases.length &&
                tokenIdsLength == purchasedParts.length &&
                tokenIdsLength == giftReceivers.length,
            "Array lengths are not equal!"
        );
        uint256 totalPriceToPayUdao;
        for (uint256 i; i < tokenIdsLength; i++) {
            // Calculate purchased parts (or full Content) total list price.
            totalPriceToPayUdao += _calculatePriceToPay(
                tokenIds[i],
                fullContentPurchases[i],
                purchasedParts[i]
            );
        }
        require(msg.value >= totalPriceToPayUdao, "Not enough UDAO sent!");
        for (uint256 i; i < tokenIdsLength; i++) {
            _buyContentwithUDAO(
                tokenIds[i],
                fullContentPurchases[i],
                purchasedParts[i],
                giftReceivers[i]
            );
        }
    }

    function _buyContentwithUDAO(
        uint256 tokenId,
        bool fullContentPurchase,
        uint256[] calldata purchasedParts,
        address giftReceiver
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
        // Calculate purchased parts (or full Content) total list price.
        uint256 priceToPayUdao = _calculatePriceToPay(
            tokenId,
            fullContentPurchase,
            purchasedParts
        );
        // Calculate the shares of those who will earn income.
        uint256 foundShare;
        uint256 goverShare;
        uint256 valdtrShare;
        uint256 jurorShare;
        uint256 totalCut;
        uint256 instrShare;
        // _calculateShares will use contentCuts if isAContentSale=true and will use coachingCuts if isAcontentSale=false (Note: Maybe I should split them)
        // _calculateShares will return instrShare= priceToPayUdao-totalCut if lastisAFIATPayout = false
        (
            foundShare,
            goverShare,
            valdtrShare,
            jurorShare,
            totalCut,
            instrShare
        ) = _calculateShares(priceToPayUdao, true, false);

        //require(priceToPayUdao==msg.value);
        // transfer the tokens from buyer to contract
        // udao.transferFrom(msg.sender, address(this), priceToPayUdao);

        // distribute everyones share and pay to instructor (NOTE: maybe we should hold shares as a whole and end of lifecyle we should split them)
        _updateGlobalBalances(foundShare, goverShare, valdtrShare, jurorShare);
        _updateInstructorBalances(instrShare, instructor);

        // give the content to the receiver
        _updateOwnedContentOrPart(
            tokenId,
            fullContentPurchase,
            purchasedParts,
            contentReceiver
        );

        //TODO List
        //1)every sale must be saved to a list/struct or whatever for if refund needed!
        //2)also cuts must be send to governanceTreasury but maybe we can add it to inside _updateGlobalBalances
        //3)we need to check functions visibility(view/pure/public) and behaviour (external/internal)
        _saveTheSaleOnAListForRefund();
        _sendCurrentGlobalCutsToGovernanceTreasury();

        emit ContentBought(tokenId, purchasedParts, priceToPayUdao, msg.sender);
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
        // Calculate the shares of those who will earn income.
        uint256 foundShare;
        uint256 goverShare;
        uint256 valdtrShare;
        uint256 jurorShare;
        uint256 totalCut;
        uint256 instrShare;
        // _calculateShares will use contentCuts if isAContentSale=true and will use coachingCuts if isAcontentSale=false (Note: Maybe I should split them)
        // _calculateShares will return instrShare=0 if lastisAFIATPayout = true
        (
            foundShare,
            goverShare,
            valdtrShare,
            jurorShare,
            totalCut,
            instrShare
        ) = _calculateShares(priceToPayUdao, true, true);

        // transfer the tokens from buyer to contract (NOTE: Actually priceToPayUdao= totalCut + instrShare, maybe use that)
        udao.transferFrom(msg.sender, address(this), totalCut);

        // distribute everyones share and pay to instructor (NOTE: maybe we should hold shares as a whole and end of lifecyle we should split them)
        _updateGlobalBalances(foundShare, goverShare, valdtrShare, jurorShare);
        _updateInstructorBalances(instrShare, instructor);

        // give the content to the receiver
        _updateOwnedContentOrPart(
            tokenId,
            fullContentPurchase,
            purchasedParts,
            contentReceiver
        );

        //TODO List
        //1)every sale must be saved to a list/struct or whatever for if refund needed!
        //2)also cuts must be send to governanceTreasury but maybe we can add it to inside _updateGlobalBalances
        //3)we need to check functions visibility(view/pure/public) and behaviour (external/internal)
        _saveTheSaleOnAListForRefund();
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
        address _inst
    ) internal {
        //timestamp returns 1694513188: 12Sep2023-10:06:28 so buyerTransactionTime is 19612.42
        //this means 19612.42 day passed since 1Jan1970-0:0:0
        //There is no fractional number in solidity so that buyerTransactionTime is 19612
        uint256 transactionTime = (block.timestamp / epochOneDay);

        //transactionFuIndex determines which position it will be added to in the FutureBalances array.
        uint256 transactionFuIndex = transactionTime % refundWindow;

        //how many day passed since last update of instructor balance
        uint256 dayPassedInst = transactionTime - instUpdTime[_inst];

        if (dayPassedInst < refundWindow) {
            // if(true):There is no payment yet to be paid to the seller in the future balance array.
            // add new payment to instructor futureBalanceArray
            instFuBalance[_inst][transactionFuIndex] += _instrShare;
        } else {
            // if(else): The future balance array contains values that must be paid to the user.
            if (dayPassedInst >= (refundWindow * 2)) {
                //Whole Future Balance Array must paid to user (Because (refundWindow x2)28 day passed)
                for (uint256 i = 0; i < refundWindow; i++) {
                    instCurBalance[_inst] += instFuBalance[_inst][i];
                    instFuBalance[_inst][i] = 0;
                }
                // add new payment to instructor futureBalanceArray
                instFuBalance[_inst][transactionFuIndex] += _instrShare;

                // you updated instructor currentBalance of instructorso declare a new time to instUpdTime
                // why (-refundWindow + 1)? This will sustain today will be no more update on balances...
                // ...but tomarrow a transaction will produce new update.
                instUpdTime[_inst] = (transactionTime - refundWindow) + 1;
            } else {
                //Just some part of Future Balance Array must paid to instructor
                uint256 dayPassedInstMod = dayPassedInst % refundWindow;
                //minimum dayPassedInst=14 so Mod 0, maximum dayPassedInst=27 so Mod 13
                //if Mod 0 for loop works for today, if Mod 2 it works for today+ yesterday,,, if it 13
                for (uint256 i = 0; i <= dayPassedInstMod; i++) {
                    //Index of the day to be payout to instructor.
                    uint256 indexOfPayout = ((transactionFuIndex +
                        refundWindow) - i) % refundWindow;
                    instCurBalance[_inst] += instFuBalance[_inst][
                        indexOfPayout
                    ];
                    instFuBalance[_inst][indexOfPayout] = 0;
                }

                // add new payment to instructor futureBalanceArray
                instFuBalance[_inst][transactionFuIndex] += _instrShare;

                // you updated instructor currentBalance of instructorso declare a new time to instUpdTime
                // why (-refundWindow + 1)? This will sustain today will be no more update on balances...
                // ...but tomarrow a transaction will produce new update.
                instUpdTime[_inst] = (transactionTime - refundWindow) + 1;
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

    function _saveTheSaleOnAListForRefund() internal {
        //TODO Not implemented YET
    }

    function _sendCurrentGlobalCutsToGovernanceTreasury() internal {
        //TODO Not implemented YET
    }

    //TODO We should have

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
    function _hash(
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

    /// @notice Verifies the signature for a given ContentDiscountVoucher, returning the address of the signer.
    /// @dev Will revert if the signature is invalid.
    /// @param voucher A ContentDiscountVoucher describing a content access rights.
    function _verify(
        ContentDiscountVoucher calldata voucher
    ) internal view returns (address) {
        bytes32 digest = _hash(voucher);
        return ECDSA.recover(digest, voucher.signature);
    }
}
