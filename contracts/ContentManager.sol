// SPDX-License-Identifier: MIT
/// @title Content purchasing and cut management
pragma solidity ^0.8.4;
import "./BasePlatform.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/draft-EIP712.sol";

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
    struct ContentPurchaseVoucher {
        /// @notice The id of the token (content) to be redeemed.
        uint256 tokenId;
        /// @notice True, if full content is purchased
        bool fullContentPurchase;
        /// @notice Purchased parts
        uint256[] purchasedParts;
        /// @notice Address of the gift receiver if purhcase is a gift
        address giftReceiver;
    }

    /// @notice Represents usage rights for a content (or part)
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

    /// @notice Represents usage rights for a coaching service
    struct CoachingPurchaseVoucher {
        /// @notice The id of the token (content) to be redeemed.
        uint256 tokenId;
        /// @notice The price to deduct from buyer
        uint256 priceToPay;
        /// @notice if the coaching service is refundable or not
        bool isRefundable;
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

    constructor() EIP712(SIGNING_DOMAIN, SIGNATURE_VERSION) {}

    /// @notice allows users to purchase a content
    /// @param voucher voucher for the content purchase
    function buyContent(ContentPurchaseVoucher calldata voucher)
        external
        whenNotPaused
    {
        uint256 tokenId = voucher.tokenId;
        uint256 partIdLength = voucher.purchasedParts.length;
        uint256 priceToPay;
        address contentReceiver = msg.sender;

        require(udaoc.exists(tokenId), "Content does not exist!");
        require(!IRM.isBanned(msg.sender), "You are banned");
        require(IRM.isKYCed(msg.sender), "You are not KYCed");
        if(voucher.giftReceiver != address(0)){
            contentReceiver = voucher.giftReceiver;
            require(!IRM.isBanned(contentReceiver), "Gift receiver is banned");
            require(IRM.isKYCed(contentReceiver), "Gift receiver is not KYCed");
        }
        address instructor = udaoc.ownerOf(tokenId);
        require(IRM.isKYCed(instructor), "Instructor is not KYCed");
        require(!IRM.isBanned(instructor), "Instructor is banned");
        require(IVM.getIsValidated(tokenId), "Content is not validated yet");
        require(
            isTokenBought[msg.sender][tokenId][0] == false,
            "Full content is already bought"
        );

        /// @dev Get the total payment amount first
        if (voucher.fullContentPurchase) {
            priceToPay += udaoc.getPriceContent(tokenId, 0);
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
                priceToPay += udaoc.getPriceContent(
                    tokenId,
                    voucher.purchasedParts[j]
                );
            }
        }

        /// @dev Calculate and assing the cuts
        uint256 foundationCalc = (priceToPay * contentFoundationCut) / 100000;
        uint256 governanceCalc = (priceToPay * contentGovernancenCut) / 100000;
        uint256 validatorCalc = (priceToPay * validatorBalance) / 100000;
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

        /// @dev transfer the tokens from buyer to contract
        udao.transferFrom(msg.sender, address(this), priceToPay);

        if (voucher.fullContentPurchase) {
            _updateOwned(tokenId, 0, contentReceiver);
        } else {
            for (uint256 j; j < partIdLength; j++) {
                _updateOwned(tokenId, voucher.purchasedParts[j], contentReceiver);
            }
        }

        emit ContentBought(
            voucher.tokenId,
            voucher.purchasedParts,
            priceToPay,
            msg.sender
        );
    }

    /// @notice allows users to purchase a content
    /// @param voucher voucher for the content purchase
    function buyDiscountedContent(ContentDiscountVoucher calldata voucher)
        external
        whenNotPaused
    {
        // make sure signature is valid and get the address of the signer
        address signer = _verify(voucher);
        require(
            IRM.hasRole(BACKEND_ROLE, signer),
            "Signature invalid or unauthorized"
        );
        require(voucher.validUntil >= block.timestamp, "Voucher has expired.");
        require(msg.sender == voucher.redeemer, "You are not redeemer.");

        uint256 tokenId = voucher.tokenId;
        uint256 partIdLength = voucher.purchasedParts.length;
        address contentReceiver = msg.sender;

        require(udaoc.exists(tokenId), "Content does not exist!");
        if(voucher.giftReceiver != address(0)){
            contentReceiver = voucher.giftReceiver;
            require(!IRM.isBanned(contentReceiver), "Gift receiver is banned");
            require(IRM.isKYCed(contentReceiver), "Gift receiver is not KYCed");
        }
        require(!IRM.isBanned(msg.sender), "You are banned");
        require(IRM.isKYCed(msg.sender), "You are not KYCed");
        address instructor = udaoc.ownerOf(tokenId);
        require(IRM.isKYCed(instructor), "Instructor is not KYCed");
        require(!IRM.isBanned(instructor), "Instructor is banned");
        require(IVM.getIsValidated(tokenId), "Content is not validated yet");
        require(
            isTokenBought[contentReceiver][tokenId][0] == false,
            "Full content is already bought"
        );
        require(msg.sender == voucher.redeemer, "You are not redeemer.");

        /// @dev Calculate and assing the cuts
        uint256 priceToPay = voucher.priceToPay;
        uint256 foundationCalc = (priceToPay * contentFoundationCut) / 100000;
        uint256 governanceCalc = (priceToPay * contentGovernancenCut) / 100000;
        uint256 validatorCalc = (priceToPay * validatorBalance) / 100000;
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

        /// @dev transfer the tokens from buyer to contract
        udao.transferFrom(msg.sender, address(this), priceToPay);

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
                _updateOwned(tokenId, voucher.purchasedParts[j], contentReceiver);
            }
        }

        emit ContentBought(
            voucher.tokenId,
            voucher.purchasedParts,
            priceToPay,
            msg.sender
        );
    }

    /**
     * @notice an internal function to update owned contents of the user
     * @param tokenId id of the token that bought (completely of partially)
     * @param purchasedPart purchased part of the content (all of the content if 0)
     * @param contentReceiver content receiver
     */
    function _updateOwned(uint256 tokenId, uint256 purchasedPart, address contentReceiver) internal {
        require(
            isTokenBought[contentReceiver][tokenId][purchasedPart] == false,
            "Content part is already bought"
        );

        isTokenBought[contentReceiver][tokenId][purchasedPart] = true;
        ownedContents[contentReceiver].push([tokenId, purchasedPart]);
    }

    /// @notice Allows users to buy coaching service.
    /// @param voucher voucher for the coaching purchase
    function buyCoaching(CoachingPurchaseVoucher calldata voucher)
        external
        whenNotPaused
    {
        require(udaoc.exists(voucher.tokenId), "Content does not exist!");
        require(!IRM.isBanned(msg.sender), "You are banned");
        require(IRM.isKYCed(msg.sender), "You are not KYCed");
        address instructor = udaoc.ownerOf(voucher.tokenId);
        require(!IRM.isBanned(instructor), "Instructor is banned");
        require(IRM.isKYCed(instructor), "Instructor is not KYCed");
        require(
            udaoc.isCoachingEnabled(voucher.tokenId),
            "Coaching is not enabled for this content"
        );
        require(
            IVM.getIsValidated(voucher.tokenId),
            "Content is not validated yet"
        );
        uint256 priceToPay = voucher.priceToPay;
        foundationBalance += (priceToPay * coachingFoundationCut) / 100000;
        governanceBalance += (priceToPay * coachingGovernancenCut) / 100000;
        coachingStructs[coachingIndex] = CoachingStruct({
            coach: instructor,
            learner: msg.sender,
            isDone: 0,
            isRefundable: voucher.isRefundable,
            totalPaymentAmount: priceToPay,
            coachingPaymentAmount: (priceToPay -
                foundationBalance -
                governanceBalance),
            moneyLockDeadline: block.timestamp + 30 days
        });

        coachingIdsOfToken[voucher.tokenId].push(coachingIndex);
        emit CoachingBought(msg.sender, voucher.tokenId, coachingIndex);
        coachingIndex++;

        studentList[voucher.tokenId].push(msg.sender);
        udao.transferFrom(msg.sender, address(this), priceToPay);
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
    function forcedPayment(uint256 _coachingId)
        external
        whenNotPaused
        onlyRoles(administrator_roles)
    {
        CoachingStruct storage currentCoaching = coachingStructs[_coachingId];
        instructorBalance[currentCoaching.coach] += coachingStructs[_coachingId]
            .coachingPaymentAmount;

        currentCoaching.isDone = 1;
        emit ForcedPayment(_coachingId, currentCoaching.coach);
    }

    /// @notice Payment and coaching service can be forcefully done by jurors
    /// @param _coachingId id of the coaching service
    function forcedPaymentJuror(uint256 _coachingId)
        external
        whenNotPaused
        onlyRole(JUROR_CONTRACT)
    {
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
            (totalPaymentAmount * coachingGovernancenCut) /
            100000;

        currentCoaching.isDone = 2;
        udao.transfer(currentCoaching.learner, totalPaymentAmount);

        emit Refund(_coachingId, currentCoaching.learner, totalPaymentAmount);
    }

    /// @notice forces refund of coaching service only be callable by administrator_role (FOUNDATION_ROLE, GOVERNANCE_ROLE)
    /// @param _coachingId id of the coaching service
    function forcedRefundAdmin(uint256 _coachingId)
        external
        whenNotPaused
        onlyRoles(administrator_roles)
    {
        uint256 startGas = gasleft();
        CoachingStruct storage currentCoaching = coachingStructs[_coachingId];
        uint256 totalPaymentAmount = currentCoaching.totalPaymentAmount;

        require(currentCoaching.isRefundable, "Coaching is not refundable");
        foundationBalance -=
            (totalPaymentAmount * coachingFoundationCut) /
            100000;
        governanceBalance -=
            (totalPaymentAmount * coachingGovernancenCut) /
            100000;

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
            instructorBalance[currentCoaching.coach] >= (gasUsed * tx.gasprice)
        ) {
            instructorBalance[currentCoaching.coach] -= gasUsed * tx.gasprice;
        } else {
            instructorDebt[currentCoaching.coach] += gasUsed * tx.gasprice;
        }

        emit Refund(_coachingId, currentCoaching.learner, totalPaymentAmount);
    }

    /// @notice Jurors can force refund of a coaching service
    /// @param _coachingId The ID of the coaching service
    function forcedRefundJuror(uint256 _coachingId)
        external
        whenNotPaused
        onlyRole(JUROR_CONTRACT)
    {
        uint256 startGas = gasleft();
        CoachingStruct storage currentCoaching = coachingStructs[_coachingId];
        uint256 totalPaymentAmount = currentCoaching.totalPaymentAmount;

        require(currentCoaching.isRefundable, "Coaching is not refundable");
        foundationBalance -=
            (totalPaymentAmount * coachingFoundationCut) /
            100000;
        governanceBalance -=
            (totalPaymentAmount * coachingGovernancenCut) /
            100000;

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
            instructorBalance[currentCoaching.coach] >= (gasUsed * tx.gasprice)
        ) {
            instructorBalance[currentCoaching.coach] -= gasUsed * tx.gasprice;
        } else {
            instructorDebt[currentCoaching.coach] += gasUsed * tx.gasprice;
        }
        emit Refund(_coachingId, msg.sender, totalPaymentAmount);
    }

    /// @notice returns coaching informations of token
    /// @param _tokenId id of token that coaching will be returned
    function getCoachings(uint256 _tokenId)
        external
        view
        returns (uint256[] memory)
    {
        return coachingIdsOfToken[_tokenId];
    }

    /// @notice returns owned contents of the _owner
    /// @param _owner address of the user that will owned contents be returned
    function getOwnedContent(address _owner)
        public
        view
        returns (uint256[][] memory)
    {
        return (ownedContents[_owner]);
    }

    /// @notice Returns the buyers of a coaching service for a token
    /// @param tokenId The token ID of a course of a coaching service
    function getStudentListOfToken(uint256 tokenId)
        public
        view
        returns (address[] memory)
    {
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
    function _hash(ContentDiscountVoucher calldata voucher)
        internal
        view
        returns (bytes32)
    {
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
    function _verify(ContentDiscountVoucher calldata voucher)
        internal
        view
        returns (address)
    {
        bytes32 digest = _hash(voucher);
        return ECDSA.recover(digest, voucher.signature);
    }
}
