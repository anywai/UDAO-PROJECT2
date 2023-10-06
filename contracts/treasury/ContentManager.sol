// SPDX-License-Identifier: MIT
/// @title Content purchasing and cut management
pragma solidity ^0.8.4;
import "./BasePlatform.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/draft-EIP712.sol";

//import "../interfaces/IPriceGetter.sol";

abstract contract ContentManager is EIP712, BasePlatform {
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
    ) external whenNotPaused {
        uint256 tokenIdsLength = tokenIds.length;
        require(
            tokenIdsLength == fullContentPurchases.length &&
                tokenIdsLength == purchasedParts.length &&
                tokenIdsLength == giftReceivers.length,
            "Array lengths are not equal!"
        );
        for (uint256 i; i < tokenIdsLength; i++) {
            _buyContent(
                tokenIds[i],
                fullContentPurchases[i],
                purchasedParts[i],
                giftReceivers[i]
            );
        }
    }

    /// @notice allows users to purchase a content
    /// @param tokenId id of the content
    /// @param fullContentPurchase is full content purchased
    /// @param purchasedParts parts of the content purchased
    /// @param giftReceiver address of the gift receiver if purchase is a gift
    function _buyContent(
        uint256 tokenId,
        bool fullContentPurchase,
        uint256[] calldata purchasedParts,
        address giftReceiver
    ) internal whenNotPaused {
        uint256 partIdLength = purchasedParts.length;
        uint256 priceToPayUdao;
        uint256 priceToPay;
        uint256 pricePerPart;
        bytes32 sellingCurrency;
        address contentReceiver = msg.sender;

        require(udaoc.exists(tokenId), "Content does not exist!");
        if (giftReceiver != address(0)) {
            contentReceiver = giftReceiver;
            require(
                !roleManager.isBanned(contentReceiver, 28),
                "Gift receiver is banned"
            );
        }
        require(!roleManager.isBanned(msg.sender, 29), "You are banned");
        address instructor = udaoc.ownerOf(tokenId);
        require(!roleManager.isBanned(instructor, 30), "Instructor is banned");
        require(
            isTokenBought[msg.sender][tokenId][0] == false,
            "Full content is already bought"
        );

        /// @dev Get the total payment amount first
        if (fullContentPurchase) {
            (priceToPay, sellingCurrency) = udaoc.getContentPriceAndCurrency(
                tokenId,
                0
            );
        } else {
            require(
                purchasedParts[0] != 0,
                "Purchased parts says 0, but fullContentPurchase is false!"
            );
            for (uint256 j; j < partIdLength; j++) {
                require(
                    purchasedParts[j] < udaoc.getPartNumberOfContent(tokenId),
                    "Part does not exist!"
                );
                (pricePerPart, sellingCurrency) = udaoc
                    .getContentPriceAndCurrency(tokenId, purchasedParts[j]);
                priceToPay += pricePerPart;
            }
        }

        /// @dev Check if sold in udao or fiat and get the price in udao
        if (sellingCurrency == keccak256(abi.encodePacked("udao"))) {
            priceToPayUdao = priceToPay;
        } else {
            priceToPayUdao = priceGetter.getUdaoOut(
                uint128(priceToPay),
                sellingCurrency
            );
        }

        /// @dev transfer the tokens from buyer to contract
        udao.transferFrom(msg.sender, address(this), priceToPayUdao);

        /// @dev Calculate and assign the cuts
        _updateBalancesContent(priceToPayUdao, instructor);

        if (fullContentPurchase) {
            _updateOwned(tokenId, 0, contentReceiver);
        } else {
            for (uint256 j; j < partIdLength; j++) {
                _updateOwned(tokenId, purchasedParts[j], contentReceiver);
            }
        }

        emit ContentBought(tokenId, purchasedParts, priceToPayUdao, msg.sender);
    }

    /// @notice allows users to purchase a content. Notice that there is no price conversion
    /// since the total payment amount is coming from backend with voucher where
    /// the total amount of payment in UDAO is calculated.
    /// @param voucher voucher for the content purchase
    function buyDiscountedContent(
        ContentDiscountVoucher calldata voucher
    ) external whenNotPaused {
        // make sure signature is valid and get the address of the signer
        address signer = _verify(voucher);
        require(
            roleManager.hasRole(BACKEND_ROLE, signer),
            "Signature invalid or unauthorized"
        );
        require(voucher.validUntil >= block.timestamp, "Voucher has expired.");
        require(msg.sender == voucher.redeemer, "You are not redeemer.");
        require(!roleManager.isBanned(msg.sender, 31), "You are banned");

        uint256 tokenId = voucher.tokenId;
        uint256 partIdLength = voucher.purchasedParts.length;
        address contentReceiver = msg.sender;

        require(udaoc.exists(tokenId), "Content does not exist!");
        if (voucher.giftReceiver != address(0)) {
            contentReceiver = voucher.giftReceiver;
            require(
                !roleManager.isBanned(contentReceiver, 32),
                "Gift receiver is banned"
            );
        }
        address instructor = udaoc.ownerOf(tokenId);
        require(!roleManager.isBanned(instructor, 33), "Instructor is banned");
        require(
            isTokenBought[contentReceiver][tokenId][0] == false,
            "Full content is already bought"
        );
        require(msg.sender == voucher.redeemer, "You are not redeemer.");

        uint256 priceToPay = voucher.priceToPay;
        /// @dev transfer the tokens from buyer to contract
        udao.transferFrom(msg.sender, address(this), priceToPay);

        /// @dev Calculate and assing the cuts
        _updateBalancesContent(priceToPay, instructor);

        /// @dev Get the total payment amount first
        if (voucher.fullContentPurchase) {
            _updateOwned(tokenId, voucher.purchasedParts[0], contentReceiver);
        } else {
            require(
                voucher.purchasedParts[0] != 0,
                "Purchased parts says 0, but fullContentPurchase is false!"
            );
            for (uint256 j; j < partIdLength; j++) {
                require(
                    voucher.purchasedParts[j] <
                        udaoc.getPartNumberOfContent(tokenId),
                    "Part does not exist!"
                );
                _updateOwned(
                    tokenId,
                    voucher.purchasedParts[j],
                    contentReceiver
                );
            }
        }

        emit ContentBought(
            voucher.tokenId,
            voucher.purchasedParts,
            priceToPay,
            msg.sender
        );
    }

    /*
    function buyContent(
        address instructor
    ) external payable onlyRole(RELAY_ROLE) {
        uint256 foundationCalc = (priceToPay * contentFoundationCut) / 100000;
        uint256 governanceCalc = (priceToPay * contentGovernanceCut) / 100000;
        uint256 validatorCalc = (priceToPay * contentValidatorCut) / 100000;
        uint256 jurorCalc = (priceToPay * contentJurorCut) / 100000;

        foundationBalance += foundationCalc;
        governanceBalance += governanceCalc;
        validatorBalanceForRound += validatorCalc;
        jurorBalanceForRound += jurorCalc;

        instructorBalance[instructor] +=
            priceToPay -
            (foundationCalc) -
            (governanceCalc) -
            (validatorCalc) -
            (jurorCalc);
    }
    */

    /// @notice allows users to purchase a content
    /// @param priceToPay price to pay for the content
    /// @param instructor instructor of the content
    function _updateBalancesContent(
        uint priceToPay,
        address instructor
    ) internal {
        uint256 foundationCalc = (priceToPay * contentFoundationCut) / 100000;
        uint256 governanceCalc = (priceToPay * contentGovernanceCut) / 100000;
        uint256 validatorCalc = (priceToPay * contentValidatorCut) / 100000;
        uint256 jurorCalc = (priceToPay * contentJurorCut) / 100000;

        foundationBalance += foundationCalc;
        governanceBalance += governanceCalc;
        validatorBalanceForRound += validatorCalc;
        jurorBalanceForRound += jurorCalc;

        instructorBalance[instructor] +=
            priceToPay -
            (foundationCalc) -
            (governanceCalc) -
            (validatorCalc) -
            (jurorCalc);
    }

    /**
     * @notice an internal function to update owned contents of the user
     * @param tokenId id of the token that bought (completely of partially)
     * @param purchasedPart purchased part of the content (all of the content if 0)
     * @param contentReceiver content receiver
     */
    function _updateOwned(
        uint256 tokenId,
        uint256 purchasedPart,
        address contentReceiver
    ) internal {
        require(
            isTokenBought[contentReceiver][tokenId][purchasedPart] == false,
            "Content part is already bought"
        );

        isTokenBought[contentReceiver][tokenId][purchasedPart] = true;
        ownedContents[contentReceiver].push([tokenId, purchasedPart]);
    }

    /// @notice Allows users to buy coaching service.
    function buyCoaching(uint tokenId) external whenNotPaused {
        require(udaoc.exists(tokenId), "Content does not exist!");
        require(!roleManager.isBanned(msg.sender, 34), "You are banned");
        address instructor = udaoc.ownerOf(tokenId);
        require(!roleManager.isBanned(instructor, 35), "Instructor is banned");
        require(
            udaoc.coachingEnabled(tokenId),
            "Coaching is not enabled for this content"
        );
        require(
            ISupVis.getIsValidated(tokenId) == 1,
            "Content is not validated yet"
        );
        (uint priceToPay, bytes32 sellingCurrency) = udaoc
            .getCoachingPriceAndCurrency(tokenId);
        uint priceToPayUdao;
        /// @dev Check if sold in udao or fiat and get the price in udao
        if (sellingCurrency == keccak256(abi.encodePacked("udao"))) {
            priceToPayUdao = priceToPay;
        } else {
            priceToPayUdao = priceGetter.getUdaoOut(
                uint128(priceToPay),
                sellingCurrency
            );
        }
        udao.transferFrom(msg.sender, address(this), priceToPayUdao);
        uint256 foundationBalanceFromThisPurchase = (priceToPayUdao *
            coachingFoundationCut) / 100000;
        uint256 governanceBalanceFromThisPurchase = (priceToPayUdao *
            coachingGovernanceCut) / 100000;
        foundationBalance += foundationBalanceFromThisPurchase;
        governanceBalance += governanceBalanceFromThisPurchase;
        coachingStructs[coachingIndex] = CoachingStruct({
            coach: instructor,
            learner: msg.sender,
            isDone: 0,
            isRefundable: udaoc.coachingRefundable(tokenId),
            totalPaymentAmount: priceToPayUdao,
            coachingPaymentAmount: (priceToPayUdao -
                foundationBalanceFromThisPurchase -
                governanceBalanceFromThisPurchase),
            moneyLockDeadline: block.timestamp + 30 days
        });

        coachingIdsOfToken[tokenId].push(coachingIndex);
        emit CoachingBought(msg.sender, tokenId, coachingIndex);
        coachingIndex++;

        studentList[tokenId].push(msg.sender);
    }

    /// @notice Allows both parties to finalize coaching service.
    /// @param _coachingId The ID of the coaching service
    function finalizeCoaching(uint256 _coachingId) external whenNotPaused {
        require(_coachingId < coachingIndex, "Coaching id doesn't exist");
        CoachingStruct storage currentCoaching = coachingStructs[_coachingId];
        require(
            (msg.sender == currentCoaching.coach) ||
                (msg.sender == currentCoaching.learner),
            "You are not learner neither coach"
        );
        if (msg.sender == currentCoaching.coach) {
            require(
                (block.timestamp > currentCoaching.moneyLockDeadline),
                "Deadline is not met yet"
            );
        }
        instructorBalance[currentCoaching.coach] += coachingStructs[_coachingId]
            .coachingPaymentAmount;

        currentCoaching.isDone = 1;
        emit CoachingFinalized(
            _coachingId,
            currentCoaching.coach,
            currentCoaching.learner
        );
    }

    /**
     *  @notice The learner or the coach could delay the service payment
     *  deadline in the last 3 days of the deadline
     *  @param _coachingId id of the coaching service
     */
    function delayDeadline(uint256 _coachingId) external whenNotPaused {
        require(
            msg.sender == coachingStructs[_coachingId].coach ||
                msg.sender == coachingStructs[_coachingId].learner,
            "You are neither coach nor learner"
        );
        require(
            (coachingStructs[_coachingId].moneyLockDeadline - block.timestamp) <
                3 days,
            "Only can be delayed in last 3 days"
        );
        coachingStructs[_coachingId].moneyLockDeadline += 7 days;
        emit DeadlineDelayed(
            _coachingId,
            coachingStructs[_coachingId].moneyLockDeadline
        );
    }

    /// @notice Payment and coaching service can be forcefully done by administrator_roles
    /// @param _coachingId id of the coaching service
    function forcedPayment(uint256 _coachingId) external whenNotPaused {
        require(
            roleManager.hasRoles(administrator_roles, msg.sender),
            "Only administrator_roles can force payment"
        );
        CoachingStruct storage currentCoaching = coachingStructs[_coachingId];
        instructorBalance[currentCoaching.coach] += coachingStructs[_coachingId]
            .coachingPaymentAmount;

        currentCoaching.isDone = 1;
        emit ForcedPayment(_coachingId, currentCoaching.coach);
    }

    /// @notice Payment and coaching service can be forcefully done by jurors
    /// @param _coachingId id of the coaching service
    function forcedPaymentJuror(uint256 _coachingId) external whenNotPaused {
        require(
            roleManager.hasRole(SUPERVISION_CONTRACT, msg.sender),
            "Only supervision contract can force payment"
        );
        CoachingStruct storage currentCoaching = coachingStructs[_coachingId];
        instructorBalance[currentCoaching.coach] += coachingStructs[_coachingId]
            .coachingPaymentAmount;

        currentCoaching.isDone = 1;
        emit ForcedPayment(_coachingId, msg.sender);
    }

    /// @notice refunds the coaching service callable by coach
    /// @param _coachingId id of the coaching service
    function refund(uint256 _coachingId) external whenNotPaused {
        CoachingStruct storage currentCoaching = coachingStructs[_coachingId];
        uint256 totalPaymentAmount = currentCoaching.totalPaymentAmount;
        require(msg.sender == currentCoaching.coach, "Your are not the coach");
        foundationBalance -=
            (totalPaymentAmount * coachingFoundationCut) /
            100000;
        governanceBalance -=
            (totalPaymentAmount * coachingGovernanceCut) /
            100000;

        uint instructorRefunds = 0;
        if (currentCoaching.isDone == 1) {
            instructorRefunds =
                totalPaymentAmount -
                ((totalPaymentAmount * coachingFoundationCut) / 100000) -
                ((totalPaymentAmount * coachingGovernanceCut) / 100000);
        }

        currentCoaching.isDone = 2;

        if (instructorBalance[currentCoaching.coach] >= instructorRefunds) {
            instructorBalance[currentCoaching.coach] -= instructorRefunds;
        } else {
            instructorDebt[currentCoaching.coach] += instructorRefunds;
        }
        udao.transfer(currentCoaching.learner, totalPaymentAmount);

        emit Refund(_coachingId, currentCoaching.learner, totalPaymentAmount);
    }

    /// @notice forces refund of coaching service only be callable by administrator_role (FOUNDATION_ROLE, GOVERNANCE_ROLE)
    /// @param _coachingId id of the coaching service
    function forcedRefundAdmin(uint256 _coachingId) external whenNotPaused {
        require(
            roleManager.hasRoles(administrator_roles, msg.sender),
            "Only administrator_roles can force refund"
        );
        uint256 startGas = gasleft();
        CoachingStruct storage currentCoaching = coachingStructs[_coachingId];
        uint256 totalPaymentAmount = currentCoaching.totalPaymentAmount;

        require(currentCoaching.isRefundable, "Coaching is not refundable");
        foundationBalance -=
            (totalPaymentAmount * coachingFoundationCut) /
            100000;
        governanceBalance -=
            (totalPaymentAmount * coachingGovernanceCut) /
            100000;
        uint instructorRefunds = 0;
        if (currentCoaching.isDone == 1) {
            instructorRefunds =
                totalPaymentAmount -
                ((totalPaymentAmount * coachingFoundationCut) / 100000) -
                ((totalPaymentAmount * coachingGovernanceCut) / 100000);
        }
        currentCoaching.isDone = 2;
        udao.transfer(currentCoaching.learner, totalPaymentAmount);

        /**
         * @dev this function checks the gas used since the start of the function using the global
         * function `gasleft()`, then checks if instructor balance has more tokens than required gas
         * to pay for this function. If instructos has enough balance, gas cost of this function is
         * deducted from instructors balance, if instructor does not have enough balance, insturctor
         * balance deducts to 0.
         *
         */
        uint256 gasUsed = startGas - gasleft();

        if (
            instructorBalance[currentCoaching.coach] >=
            (gasUsed * tx.gasprice + instructorRefunds)
        ) {
            instructorBalance[currentCoaching.coach] -= (gasUsed *
                tx.gasprice +
                instructorRefunds);
        } else {
            instructorDebt[currentCoaching.coach] += (gasUsed *
                tx.gasprice +
                instructorRefunds);
        }

        emit Refund(_coachingId, currentCoaching.learner, totalPaymentAmount);
    }

    /// @notice Jurors can force refund of a coaching service
    /// @param _coachingId The ID of the coaching service
    function forcedRefundJuror(uint256 _coachingId) external whenNotPaused {
        require(
            roleManager.hasRole(SUPERVISION_CONTRACT, msg.sender),
            "Only supervision contract can force refund"
        );
        uint256 startGas = gasleft();
        CoachingStruct storage currentCoaching = coachingStructs[_coachingId];
        uint256 totalPaymentAmount = currentCoaching.totalPaymentAmount;

        require(currentCoaching.isRefundable, "Coaching is not refundable");
        foundationBalance -=
            (totalPaymentAmount * coachingFoundationCut) /
            100000;
        governanceBalance -=
            (totalPaymentAmount * coachingGovernanceCut) /
            100000;

        uint instructorRefunds = 0;
        if (currentCoaching.isDone == 1) {
            instructorRefunds =
                totalPaymentAmount -
                ((totalPaymentAmount * coachingFoundationCut) / 100000) -
                ((totalPaymentAmount * coachingGovernanceCut) / 100000);
        }
        currentCoaching.isDone = 2;
        udao.transfer(currentCoaching.learner, totalPaymentAmount);

        /**
         * @dev this function checks the gas used since the start of the function using the global
         * function `gasleft()`, then checks if instructor balance has more tokens than required gas
         * to pay for this function. If instructos has enough balance, gas cost of this function is
         * deducted from instructors balance, if instructor does not have enough balance, insturctor
         * balance deducts to 0.
         */
        uint256 gasUsed = startGas - gasleft();
        if (
            instructorBalance[currentCoaching.coach] >=
            (gasUsed * tx.gasprice + instructorRefunds)
        ) {
            instructorBalance[currentCoaching.coach] -= (gasUsed *
                tx.gasprice +
                instructorRefunds);
        } else {
            instructorDebt[currentCoaching.coach] += (gasUsed *
                tx.gasprice +
                instructorRefunds);
        }

        emit Refund(_coachingId, msg.sender, totalPaymentAmount);
    }

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
