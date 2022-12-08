// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/draft-EIP712.sol";
import "./RoleController.sol";
import "./IUDAOC.sol";

contract ValidationManager is RoleController, EIP712 {
    string private constant SIGNING_DOMAIN = "ValidationSetter";
    string private constant SIGNATURE_VERSION = "1";

    // UDAO (ERC721) Token interface
    IUDAOC udaoc;

    constructor(
        address udaocAddress,
        address irmAddress
    ) EIP712(SIGNING_DOMAIN, SIGNATURE_VERSION) RoleController(irmAddress) {
        udaoc = IUDAOC(udaocAddress);
    }

    struct ValidationVoucher {
        /// @notice The id of the token to be redeemed.
        uint256 tokenId;
        /// @notice Addresses of the validators
        address[] validators;
        /// @notice Scores validators earned from this validation
        uint[] validationScore;
        /// @notice Final verdict of the validation process
        bool isValidated;
        /// @notice the EIP-712 signature of all other fields in the ContentVoucher struct.
        bytes signature;
    }

    event ValidationEnded(uint tokenId, bool result);

    // tokenId => result
    mapping(uint => bool) public isValidated;
    // validator => round => score
    mapping(address => mapping(uint256 => uint)) public validatorScorePerRound;

    uint public distributionRound;

    uint public totalSuccessfulValidationScore;

    function setUDAOC(address udaocAddress) external onlyRole(FOUNDATION_ROLE) {
        udaoc = IUDAOC(udaocAddress);
    }

    function setAsValidated(ValidationVoucher calldata voucher) external {
        // make sure signature is valid and get the address of the signer
        address signer = _verify(voucher);
        require(
            IRM.hasRole(BACKEND_ROLE, signer),
            "Signature invalid or unauthorized"
        );
        require(udaoc.exists(voucher.tokenId), "ERC721: invalid token ID");
        isValidated[voucher.tokenId] = voucher.isValidated;
        _recordScores(voucher.validators, voucher.validationScore);

        emit ValidationEnded(voucher.tokenId, true);
    }

    function _recordScores(
        address[] calldata _validators,
        uint[] calldata _validationScores
    ) internal {
        uint totalValidators = _validators.length;

        for (uint i; i < totalValidators; i++) {
            validatorScorePerRound[_validators[i]][
                distributionRound
            ] += _validationScores[i];
            totalSuccessfulValidationScore += _validationScores[i];
        }
    }

    function getValidatorScore(
        address _validator,
        uint _round
    ) external view returns (uint) {
        return validatorScorePerRound[_validator][_round];
    }

    function getTotalValidationScore() external view returns (uint) {
        /// @notice returns total successful validation count
        return totalSuccessfulValidationScore;
    }

    function getIsValidated(uint tokenId) external view returns (bool) {
        return isValidated[tokenId];
    }

    function nextRound() external onlyRole(TREASURY_CONTRACT) {
        distributionRound++;
    }

    /// @notice Returns a hash of the given ContentVoucher, prepared using EIP712 typed data hashing rules.
    /// @param voucher A ContentVoucher to hash.
    function _hash(
        ValidationVoucher calldata voucher
    ) internal view returns (bytes32) {
        return
            _hashTypedDataV4(
                keccak256(
                    abi.encode(
                        keccak256(
                            "ValidationVoucher(uint256 tokenId,address[] validators,uint256[] validationScore,bool isValidated)"
                        ),
                        voucher.tokenId,
                        keccak256(abi.encodePacked(voucher.validators)),
                        keccak256(abi.encodePacked(voucher.validationScore)),
                        voucher.isValidated
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

    /// @notice Verifies the signature for a given ContentVoucher, returning the address of the signer.
    /// @dev Will revert if the signature is invalid. Does not verify that the signer is authorized to mint NFTs.
    /// @param voucher A ContentVoucher describing an unminted NFT.
    function _verify(
        ValidationVoucher calldata voucher
    ) internal view returns (address) {
        bytes32 digest = _hash(voucher);
        return ECDSA.recover(digest, voucher.signature);
    }
}
