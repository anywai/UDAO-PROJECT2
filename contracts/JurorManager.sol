// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/draft-EIP712.sol";

import "./RoleController.sol";

interface IStakingContract {
    function registerValidation() external;
}

contract JurorManager is RoleController, EIP712 {
    string private constant SIGNING_DOMAIN = "JurorSetter";
    string private constant SIGNATURE_VERSION = "1";

    event EndDispute(uint256 caseId, address[] jurors, uint256 totalJurorScore);
    event NextRound(uint256 newRoundId);

    // juror => round => score
    mapping(address => mapping(uint256 => uint256)) public jurorScorePerRound;

    uint256 public distributionRound;

    uint256 public totalCaseScore;

    /**
     * @param rmAddress address of the role manager contract
     */
    constructor(
        address rmAddress
    ) EIP712(SIGNING_DOMAIN, SIGNATURE_VERSION) RoleController(rmAddress) {}


    struct CaseVoucher {
        /// @notice The off-chain id of the case
        uint256 caseId;
        /// @notice The date until the voucher is valid
        uint256 validUntil;
        /// @notice contract that will be modified
        address contractAddress;
        /// @notice List of jurors who participated in the dispute
        address[] jurors;
        /// @notice The data required to make calls to the contract that will be modified.
        bytes _data;
        /// @notice the EIP-712 signature of all other fields in the CaseVoucher struct.
        bytes signature;
    }

    uint256 public totalJurorScore;
    /**
     * @notice Ends a dispute, executes actions based on the result.
     * @param voucher voucher required to end a dispute
     */
    function endDispute(
        CaseVoucher calldata voucher
    ) external whenNotPaused onlyRole(JUROR_ROLE) {
        // make sure signature is valid and get the address of the signer
        address signer = _verify(voucher);
        require(
            IRM.hasRole(BACKEND_ROLE, signer),
            "Signature invalid or unauthorized"
        );
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

    /// @notice Adds scores of jurors that took a case
    /// @param _jurors list of jurors contained in voucher
    function _addJurorScores(address[] calldata _jurors) internal {
        uint totalJurors = _jurors.length;

        for (uint i; i < totalJurors; i++) {
            jurorScorePerRound[_jurors[i]][distributionRound]++;
            totalJurorScore++;
        }
    }

    /// @notice Starts the new reward round
    function nextRound() external whenNotPaused onlyRole(TREASURY_CONTRACT) {
        distributionRound++;
        emit NextRound(distributionRound);
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

    /// @notice Returns a hash of the given CaseVoucher, prepared using EIP712 typed data hashing rules.
    /// @param voucher A CaseVoucher to hash.
    function _hash(
        CaseVoucher calldata voucher
    ) internal view returns (bytes32) {
        return
            _hashTypedDataV4(
                keccak256(
                    abi.encode(
                        keccak256(
                            "CaseVoucher(uint256 caseId,uint256 validUntil,address contractAddress,address[] jurors,bytes _data)"
                        ),
                        voucher.caseId,
                        voucher.validUntil,
                        voucher.contractAddress,
                        keccak256(abi.encodePacked(voucher.jurors)),
                        voucher._data
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

    /// @notice Verifies the signature for a given CaseVoucher, returning the address of the signer.
    /// @dev Will revert if the signature is invalid. Does not verify that the signer is authorized to mint NFTs.
    /// @param voucher A CaseVoucher describing an unminted NFT.
    function _verify(
        CaseVoucher calldata voucher
    ) internal view returns (address) {
        bytes32 digest = _hash(voucher);
        return ECDSA.recover(digest, voucher.signature);
    }
}
