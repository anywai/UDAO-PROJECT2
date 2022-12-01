// SPDX-License-Identifier: MIT
/// @title Content purchasing and cut management
pragma solidity ^0.8.4;
import "./BasePlatform.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/draft-EIP712.sol";

interface IValidationManager {
    function isValidated(uint tokenId) external view returns (bool);
}

abstract contract ContentManager is EIP712, BasePlatform {
    string private constant SIGNING_DOMAIN = "ContentManager";
    string private constant SIGNATURE_VERSION = "1";

    /// @notice Represents usage rights for a content (or part)
    struct ContentPurchaseVoucher {
        /// @notice The id of the token (content) to be redeemed.
        uint256 tokenId;
        /// @notice Purchased parts, whole content purchased if first index is 0
        uint256[] purchasedParts;
        /// @notice The price to deduct from buyer
        uint256 priceToPay;
        /// @notice The date until the voucher is valid
        uint256 validUntil;
        /// @notice Address of the redeemer
        address redeemer;
        /// @notice the EIP-712 signature of all other fields in the ContentVoucher struct.
        bytes signature;
    }

    /// @notice Represents usage rights for a coaching service
    struct CoachingPurchaseVoucher {
        /// @notice The id of the token (content) to be redeemed.
        uint256 tokenId;
        /// @notice The price to deduct from buyer
        uint256 priceToPay;
        /// @notice The date until the voucher is valid
        uint256 validUntil;
        /// @notice if the coaching service is refundable or not
        bool isRefundable;
        /// @notice Address of the redeemer
        address redeemer;
        /// @notice the EIP-712 signature of all other fields in the ContentVoucher struct.
        bytes signature;
    }

    // wallet => content token Ids
    mapping(address => uint[][]) ownedContents;
    // tokenId => buyable
    mapping(uint => bool) coachingEnabled;
    // tokenId => student addresses
    mapping(uint => address[]) studentList;

    struct CoachingStruct {
        address coach;
        address learner;
        uint8 isDone; // 0 not done, 1 done, 2 refunded
        bool isRefundable;
        uint totalPaymentAmount;
        uint coachingPaymentAmount;
        uint moneyLockDeadline;
    }

    // tokenId => coachingId[]  which tokens have which coachings
    mapping(uint => uint[]) coachingIdsOfToken;
    // coachinId => coachingStruct  Coaching details
    mapping(uint => CoachingStruct) public coachingStructs;
    uint private coachingIndex;

    IValidationManager public IVM;

    /// @param vmAddress The address of the deployed ValidationManager contract
    constructor(address vmAddress) EIP712(SIGNING_DOMAIN, SIGNATURE_VERSION) {
        IVM = IValidationManager(vmAddress);
    }

    /// @notice Allows seting the address of the valdation manager contract
    /// @param vmAddress The address of the deployed ValidationManager contract
    function setValidationManager(
        address vmAddress
    ) external onlyRole(FOUNDATION_ROLE) {
        IVM = IValidationManager(vmAddress);
    }

    /// @notice allows KYCed users to purchase a content
    function buyContent(ContentPurchaseVoucher calldata voucher) external {
        // make sure signature is valid and get the address of the signer
        address signer = _verifyContent(voucher);
        require(
            IRM.hasRole(BACKEND_ROLE, signer),
            "Signature invalid or unauthorized"
        );

        require(voucher.validUntil >= block.timestamp, "Voucher has expired.");
        uint256 tokenId = voucher.tokenId;
        uint256[] memory purchasedParts = voucher.purchasedParts;
        uint priceToPay = voucher.priceToPay;

        require(udaoc.exists(tokenId), "Content does not exist!");
        require(!IRM.isBanned(msg.sender), "You are banned");
        require(IRM.isKYCed(msg.sender), "You are not KYCed");
        address instructor = udaoc.ownerOf(tokenId);
        require(IRM.isKYCed(instructor), "Instructor is not KYCed");
        require(!IRM.isBanned(instructor), "Instructor is banned");
        require(IVM.isValidated(tokenId), "Content is not validated yet");
        require(
            isTokenBought[msg.sender][tokenId][0] == false,
            "Full content is already bought"
        );

        uint partIdLength = purchasedParts.length;

        for (uint i; i < partIdLength; i++) {
            require(
                purchasedParts[i] < udaoc.getPartNumberOfContent(tokenId),
                "Part does not exist!"
            );
            require(
                isTokenBought[msg.sender][tokenId][purchasedParts[i]] == false,
                "Content part is already bought"
            );
            priceToPay += udaoc.getPriceContent(tokenId, purchasedParts[i]);

            isTokenBought[msg.sender][tokenId][purchasedParts[i]] = true;
            ownedContents[msg.sender].push([tokenId, purchasedParts[i]]);
        }
        foundationBalance += (priceToPay * contentFoundationCut) / 100000;
        governanceBalance += (priceToPay * contentGovernancenCut) / 100000;
        validatorBalance += (priceToPay * validatorBalance) / 100000;
        jurorBalance += (priceToPay * contentJurorCut) / 100000;
        instructorBalance[instructor] +=
            priceToPay -
            ((priceToPay * contentFoundationCut) / 100000) -
            ((priceToPay * contentGovernancenCut) / 100000) -
            ((priceToPay * validatorBalance) / 100000) -
            ((priceToPay * contentGovernancenCut) / 100000);
        udao.transferFrom(msg.sender, address(this), priceToPay);
    }

    /// @notice Allows users to buy coaching service.
    function buyCoaching(CoachingPurchaseVoucher calldata voucher) external {
        // make sure signature is valid and get the address of the signer
        address signer = _verifyCoaching(voucher);
        require(
            IRM.hasRole(BACKEND_ROLE, signer),
            "Signature invalid or unauthorized"
        );

        require(voucher.validUntil >= block.timestamp, "Voucher has expired.");
        uint256 priceToPay = voucher.priceToPay;
        require(IRM.isKYCed(msg.sender), "You are not KYCed");
        address instructor = udaoc.ownerOf(voucher.tokenId);
        require(IRM.isKYCed(instructor), "Instructor is not KYCed");
        require(!IRM.isBanned(instructor), "Instructor is banned");
        require(
            IVM.isValidated(voucher.tokenId),
            "Content is not validated yet"
        );

        foundationBalance += (priceToPay * coachingFoundationCut) / 100000;
        governanceBalance += (priceToPay * coachingGovernancenCut) / 100000;
        coachingStructs[coachingIndex] = CoachingStruct({
            coach: instructor,
            learner: voucher.redeemer,
            isLearnerVerified: false,
            isCoachVerified: false,
            isDone: 0,
            isRefundable: voucher.isRefundable,
            totalPaymentAmount: priceToPay,
            coachingPaymentAmount: (priceToPay -
                foundationBalance -
                governanceBalance),
            moneyLockDeadline: block.timestamp + 30 days
        });
        coachingIdsOfToken[voucher.tokenId].push(coachingIndex);
        coachingIndex++;

        udao.transferFrom(msg.sender, address(this), priceToPay);
        studentList[voucher.tokenId].push(voucher.redeemer);
    }

    /// @notice Allows both parties to finalize coaching service.
    /// @param _coachingId The ID of the coaching service
    function finalizeCoaching(uint _coachingId) external {
        CoachingStruct storage currentCoaching = coachingStructs[_coachingId];

        if (msg.sender == currentCoaching.coach) {
            if ((block.timestamp > currentCoaching.moneyLockDeadline)) {
                instructorBalance[currentCoaching.coach] += coachingStructs[
                    _coachingId
                ].coachingPaymentAmount;

                currentCoaching.isDone = 1;
            }
        } else if (msg.sender == currentCoaching.learner) {
            instructorBalance[currentCoaching.coach] += coachingStructs[
                _coachingId
            ].coachingPaymentAmount;

            currentCoaching.isDone = 1;
        } else {
            revert("You are not learner neither coach");
        }
    }

    function delayDeadline(uint _coachingId) external {
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
    }

    function forcedPayment(
        uint _coachingId
    ) external onlyRoles(administrator_roles) {
        CoachingStruct storage currentCoaching = coachingStructs[_coachingId];
        instructorBalance[currentCoaching.coach] += coachingStructs[_coachingId]
            .coachingPaymentAmount;

        currentCoaching.isDone = 1;
    }

    function forcedPaymentJuror(
        uint _coachingId
    ) external onlyRole(JUROR_CONTRACT) {
        CoachingStruct storage currentCoaching = coachingStructs[_coachingId];
        instructorBalance[currentCoaching.coach] += coachingStructs[_coachingId]
            .coachingPaymentAmount;

        currentCoaching.isDone = 1;
    }

    function refund(uint _coachingId) {
        CoachingStruct storage currentCoaching = coachingStructs[_coachingId];
        require(msg.sender == currentCoaching.coach, "Your are not the coach");
        foundationBalance -=
            (currentCoaching.totalPaymentAmount * coachingFoundationCut) /
            100000;
        governanceBalance -=
            (currentCoaching.totalPaymentAmount * coachingGovernancenCut) /
            100000;

        currentCoaching.isDone = 2;
        udao.transferFrom(
            address(this),
            currentCoaching.learner,
            currentCoaching.totalPaymentAmount
        );
    }

    function forcedRefundAdmin(
        uint _coachingId
    ) external onlyRole(administrator_roles) {
        uint256 startGas = gasleft();
        CoachingStruct storage currentCoaching = coachingStructs[_coachingId];
        require(currentCoaching.isRefundable, "Coaching is not refundable");
        foundationBalance -=
            (currentCoaching.totalPaymentAmount * coachingFoundationCut) /
            100000;
        governanceBalance -=
            (currentCoaching.totalPaymentAmount * coachingGovernancenCut) /
            100000;

        currentCoaching.isDone = 2;
        udao.transferFrom(
            address(this),
            currentCoaching.learner,
            currentCoaching.totalPaymentAmount
        );

        uint gasUsed = startGas - gasleft();

        if (
            instructorBalance[currentCoaching.coach] >= (gasUsed * tx.gasprice)
        ) {
            instructorBalance[currentCoaching.coach] -= gasUsed * tx.gasprice;
        }
    }

    function forcedRefundJuror(
        uint _coachingId
    ) external onlyRole(JUROR_CONTRACT) {
        uint256 startGas = gasleft();
        CoachingStruct storage currentCoaching = coachingStructs[_coachingId];
        require(currentCoaching.isRefundable, "Coaching is not refundable");
        foundationBalance -=
            (currentCoaching.totalPaymentAmount * coachingFoundationCut) /
            100000;
        governanceBalance -=
            (currentCoaching.totalPaymentAmount * coachingGovernancenCut) /
            100000;

        currentCoaching.isDone = 2;
        udao.transferFrom(
            address(this),
            currentCoaching.learner,
            currentCoaching.totalPaymentAmount
        );

        uint gasUsed = startGas - gasleft();
        if (
            instructorBalance[currentCoaching.coach] >= (gasUsed * tx.gasprice)
        ) {
            instructorBalance[currentCoaching.coach] -= gasUsed * tx.gasprice;
        }
    }

    function getCoachings(uint _tokenId) external view returns (uint[] memory) {
        return coachingIdsOfToken[_tokenId];
    }

    /// @notice Allows instructers' to enable coaching for a specific content
    /// @param tokenId The content id
    function enableCoaching(uint tokenId) external {
        require(
            udaoc.ownerOf(tokenId) == msg.sender,
            "You are not the owner of token"
        );
        coachingEnabled[tokenId] = true;
    }

    /// @notice Allows instructers' to disable coaching for a specific content
    /// @param tokenId tokenId of the content that will be not coached
    function disableCoaching(uint tokenId) external {
        require(
            udaoc.ownerOf(tokenId) == msg.sender,
            "You are not the owner of token"
        );
        coachingEnabled[tokenId] = false;
    }

    function getOwnedContent(
        address _owner
    ) public view returns (uint[][] memory) {
        return (ownedContents[_owner]);
    }

    /// @notice Returns a hash of the given PurchaseVoucher, prepared using EIP712 typed data hashing rules.
    /// @param voucher A PurchaseVoucher to hash.
    function _hashContent(
        ContentPurchaseVoucher calldata voucher
    ) internal view returns (bytes32) {
        return
            _hashTypedDataV4(
                keccak256(
                    abi.encode(
                        keccak256(
                            "ContentPurchaseVoucher(uint256 tokenId,uint256[] purchasedParts,uint256 priceToPay,uint256 validUntil,address redeemer)"
                        ),
                        voucher.tokenId,
                        keccak256(abi.encodePacked(voucher.purchasedParts)),
                        voucher.priceToPay,
                        voucher.validUntil,
                        voucher.redeemer
                    )
                )
            );
    }

    /// @notice Returns a hash of the given CoachingPurchaseVoucher, prepared using EIP712 typed data hashing rules.
    /// @param voucher A CoachingPurchaseVoucher to hash.
    function _hashCoaching(
        CoachingPurchaseVoucher calldata voucher
    ) internal view returns (bytes32) {
        return
            _hashTypedDataV4(
                keccak256(
                    abi.encode(
                        keccak256(
                            "CoachingPurchaseVoucher(uint256 tokenId,uint256 priceToPay,uint256 validUntil,bool isRefundable,address redeemer)"
                        ),
                        voucher.tokenId,
                        voucher.priceToPay,
                        voucher.validUntil,
                        voucher.isRefundable,
                        voucher.redeemer
                    )
                )
            );
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

    /// @notice Verifies the signature for a given ContentPurchaseVoucher, returning the address of the signer.
    /// @dev Will revert if the signature is invalid.
    /// @param voucher A ContentPurchaseVoucher describing a content access rights.
    function _verifyContent(
        ContentPurchaseVoucher calldata voucher
    ) internal view returns (address) {
        bytes32 digest = _hashContent(voucher);
        return ECDSA.recover(digest, voucher.signature);
    }

    /// @notice Verifies the signature for a given CoachingPurchaseVoucher, returning the address of the signer.
    /// @dev Will revert if the signature is invalid.
    /// @param voucher A CoachingPurchaseVoucher describing a coaching se
    function _verifyCoaching(
        CoachingPurchaseVoucher calldata voucher
    ) internal view returns (address) {
        bytes32 digest = _hashCoaching(voucher);
        return ECDSA.recover(digest, voucher.signature);
    }
}
