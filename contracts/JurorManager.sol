// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/draft-EIP712.sol";
import "./ContractManager.sol";
import "./RoleController.sol";
import "./IUDAOC.sol";
import "./IVM.sol";

contract JurorManager is RoleController {
    IUDAOC udaoc;
    IValidationManager public IVM;

    ContractManager public contractManager;

    event EndDispute(uint256 caseId, address[] jurors, uint256 totalJurorScore);
    event NextRound(uint256 newRoundId);
    event DisputeCreated(uint256 caseId, uint256 caseScope, string question);
    event DisputeAssigned(uint256 caseId, address juror);
    event DisputeResultSent(uint256 caseId, address juror, bool result);
    event DisputeEnded(uint256 caseId, bool verdict);
    // juror => round => score
    mapping(address => mapping(uint256 => uint256)) public jurorScorePerRound;
    // juror => caseId
    mapping(address => uint256) activeDispute;
    mapping(address => uint) public successfulDispute;
    mapping(address => uint) public unsuccessfulDispute;

    uint256 public distributionRound;
    uint256 public totalCaseScore;
    uint128 public requiredJurors = 3;
    uint128 public minRequiredAcceptVote = 2;

    /**
     * @param rmAddress address of the role manager contract
     */
    constructor(
        address rmAddress,
        address udaocAddress,
        address ivmAddress
    ) RoleController(rmAddress) {
        udaoc = IUDAOC(udaocAddress);
        IVM = IValidationManager(ivmAddress);
        disputes.push();
    }

    /// @notice Get the updated addresses from contract manager
    function updateAddresses() external onlyRole(BACKEND_ROLE) {
        IRM = IRoleManager(contractManager.IrmAddress());
    }

    struct Dispute {
        /// @dev The id of the case
        uint256 caseId;
        /// @dev Scope of the case
        uint128 caseScope;
        /// @dev Number of votes made
        uint128 voteCount;
        /// @dev Number of positive votes to the question
        uint128 acceptVoteCount;
        /// @dev List of jurors who participated in the dispute
        address[] jurors;
        /// @dev Question asked to the jurors (also case description)
        string question;
        /// @dev Vote of jurors
        mapping(address => bool) vote;
        /// @dev Checks whether or not a juror has voted
        mapping(address => bool) isVoted;
        /// @dev Final verdict of a dispute
        bool verdict;
        /// @dev if token related dipsute or not (e.g validation)
        bool isTokenRelated;
        /// @dev Related token ID, default to 0
        uint256 tokenId;
        /// @dev Case result date
        uint256 resultDate;
        /// @dev The data required to make calls to the contract that will be modified.
        bytes _data;
    }

    Dispute[] disputes;

    uint256 public totalJurorScore;

    /// TODO Wth is this function.
    /// @notice sets required juror count per dispute
    /// @param _requiredJurors new required juror count
    function setRequiredJurors(
        uint128 _requiredJurors
    ) external onlyRole(GOVERNANCE_ROLE) {
        requiredJurors = _requiredJurors;
    }

    /// @notice starts new dispute case
    function createDispute(
        uint128 caseScope,
        string calldata question,
        bool isTokenRelated,
        uint256 tokenId
    ) external onlyRole(BACKEND_ROLE) {
        Dispute storage dispute = disputes.push();
        dispute.caseId = disputes.length - 1;
        dispute.caseScope = caseScope;
        dispute.question = question;
        dispute.isTokenRelated = isTokenRelated;
        if (isTokenRelated) {
            dispute.tokenId = tokenId;
        }
        emit DisputeCreated(dispute.caseId, caseScope, question);
    }

    /// @notice assign a dispute to self
    /// @param caseId id of the dispute
    function assignDispute(uint256 caseId) external onlyRole(JUROR_ROLE) {
        require(caseId < disputes.length, "Dispute does not exist!");
        require(
            activeDispute[msg.sender] == 0,
            "You already have an assigned dispute"
        );
        require(
            disputes[caseId].jurors.length < requiredJurors,
            "Dispute already have enough jurors!"
        );
        require(
            udaoc.ownerOf(disputes[caseId].tokenId) != msg.sender,
            "You are the instructor of this course."
        );

        uint validationId = IVM.getLatestValidationIdOfToken(
            disputes[caseId].tokenId
        );
        address[] memory validators = IVM.getValidatorsOfVal(validationId);

        uint validatorLength = validators.length;

        for (uint i = 0; i < validatorLength; i++) {
            require(
                msg.sender != validators[i],
                "You can't assign content you validated!"
            );
        }

        activeDispute[msg.sender] = caseId;
        disputes[caseId].jurors.push(msg.sender);
        emit DisputeAssigned(caseId, msg.sender);
    }

    /// @notice Allows jurors to send dipsute result
    /// @param caseId id of the dispute
    /// @param result result of validation
    function sendDisputeResult(
        uint256 caseId,
        bool result
    ) external onlyRole(JUROR_ROLE) {
        require(
            activeDispute[msg.sender] == caseId,
            "This dispute is not assigned to this wallet"
        );
        activeDispute[msg.sender] = 0;
        if (result) {
            disputes[caseId].acceptVoteCount++;
        }
        disputes[caseId].isVoted[msg.sender] = true;
        disputes[caseId].vote[msg.sender] = result;
        disputes[caseId].voteCount++;
        emit DisputeResultSent(caseId, msg.sender, result);
    }

    /// @notice finalizes dispute if enough juror vote is sent
    /// @param caseId id of the dispute
    function finalizeDispute(uint256 caseId) external {
        /// @dev Check if the caller is in the list of jurors
        _checkJuror(disputes[caseId].jurors);

        require(
            disputes[caseId].voteCount >= requiredJurors,
            "Not enough juror votes to finalize the case"
        );
        if (disputes[caseId].acceptVoteCount >= minRequiredAcceptVote) {
            disputes[caseId].verdict = true;
        } else {
            disputes[caseId].verdict = false;
        }

        disputes[caseId].resultDate = block.timestamp;

        /// TODO Below is for unfixed juror scores and juror penalty..

        for (uint i; i < disputes[caseId].jurors.length; i++) {
            if (
                disputes[caseId].verdict ==
                disputes[caseId].vote[disputes[caseId].jurors[i]]
            ) {
                jurorScorePerRound[disputes[caseId].jurors[i]][
                    distributionRound
                ]++;
                totalJurorScore++;
                /// @dev Record success point of a validator
                successfulDispute[disputes[caseId].jurors[i]]++;
            } else {
                /// @dev Record unsuccess point of a validator
                unsuccessfulDispute[disputes[caseId].jurors[i]]++;
            }
        }
        emit DisputeEnded(caseId, disputes[caseId].verdict);
    }

    /**
     * @notice Ends a dispute, executes actions based on the result.
     * @param voucher voucher required to end a dispute
     */
    /** 
    function endDispute(
        CaseVoucher calldata voucher
    ) external whenNotPaused onlyRole(JUROR_ROLE) {
        require(voucher.validUntil >= block.timestamp, "Voucher has expired.");
        _checkJuror(voucher.jurors);

        // Call a function from a contract
        if (voucher.contractAddress != address(0x0)) {
            (bool success, ) = voucher.contractAddress.call(voucher._data);
            /// _contract.call(abi.encodeWithSignature("setVars(uint256)", _num)
            require(success, "Call has failed");
        }

        _addJurorScores(voucher.jurors);
        emit EndDispute(voucher.caseId, voucher.jurors, totalJurorScore);
    }
    */

    /// @notice Makes sure if the end dispute caller is a juror participated in a certain case.
    /// @param _jurors list of jurors contained in voucher
    function _checkJuror(address[] memory _jurors) internal view {
        /// Check if the caller is juror recorded for this case
        uint256 jurorsNum = _jurors.length;
        for (uint i = 0; i < jurorsNum; i++) {
            if (msg.sender == _jurors[i]) {
                return;
            }
        }
        revert("Sender is not in juror list");
    }

    /// @notice Starts the new reward round
    function nextRound() external whenNotPaused onlyRole(TREASURY_CONTRACT) {
        distributionRound++;
        emit NextRound(distributionRound);
    }

    /// @notice returns successful and unsuccessful case count of the account
    /// @param account wallet address of the account that wanted to be checked
    function getCaseResults(
        address account
    ) external view returns (uint[2] memory results) {
        results[0] = successfulDispute[account];
        results[1] = unsuccessfulDispute[account];
    }

    /// @notice Returns the score of a juror for a speficied round
    function getJurorScore(
        address _juror,
        uint _round
    ) external view returns (uint) {
        return jurorScorePerRound[_juror][_round];
    }

    /// @notice returns total juror scores
    function getTotalJurorScore() external view returns (uint) {
        return totalJurorScore;
    }
}
