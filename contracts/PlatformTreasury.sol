// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/draft-EIP712.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "./RoleController.sol";
import "./ContentManager.sol";

contract PlatformTreasury is Pausable, ContentManager, EIP712 {
    string private constant SIGNING_DOMAIN = "ValidationScore";
    string private constant SIGNATURE_VERSION = "1";

    /// @param udaoAddress The address of the deployed udao token contract
    /// @param udaocAddress The address of the deployed udao content token
    /// @param rmAddress The address of the deployed role manager
    /// @param vmAddress The address of the deployed validation manager
    constructor(
        address udaoAddress,
        address udaocAddress,
        address rmAddress,
        address vmAddress
    )
        EIP712(SIGNING_DOMAIN, SIGNATURE_VERSION)
        BasePlatform(udaoAddress, udaocAddress, rmAddress)
        ContentManager(vmAddress)
    {}

    /// @notice The id of the token to be redeemed.
    struct ScoreVoucher {
        /// @dev Current accumulated score points in off-chain
        int256 score;
        /// @dev The number of validation that matched with the final verdict
        uint256 successfulValidation;
        /// @dev The number of validation that didn't match with the final verdict
        uint256 unsuccessfulValidation;
        /// @dev Address of the redeemer (validator)
        address redeemer;
        /// @dev the EIP-712 signature of all other fields in the ContentVoucher struct
        bytes signature;
    }

    // validator => score
    mapping(address => int256) validatorScore;

    /// @notice withdraws governance balance to governance treasury
    function withdrawGovernance() external onlyRole(GOVERNANCE_ROLE) {
        udao.transfer(governanceTreasury, governanceBalance);
    }

    /// @notice withdraws foundation balance to foundation wallet
    function withdrawFoundation() external onlyRole(FOUNDATION_ROLE) {
        udao.transfer(foundationWallet, foundationBalance);
    }

    /// @notice Allows validators to record their score on-chain
    /// @param _scoreVoucher The voucher of the score information
    function writeValidatorScore(ScoreVoucher calldata _scoreVoucher)
        external
        onlyRoles(validator_roles)
    {
        // make sure redeemer is redeeming
        require(
            _scoreVoucher.redeemer == msg.sender,
            "You are not the redeemer"
        );

        // make sure signature is valid and get the address of the signer
        address signer = _verify(_scoreVoucher);
        require(
            IRM.hasRole(BACKEND_ROLE, signer),
            "Signature invalid or unauthorized"
        );

        validatorScore[_scoreVoucher.redeemer] = _scoreVoucher.score;
    }

    /// @notice calculates validator earnings and withdraws calculated earning to validator wallet
    function withdrawValidator() external onlyRoles(validator_roles) {
        uint[2] memory results = udaoc.getValidationResults(msg.sender);
        /// @dev results[0] is successful validations
        uint participation = (results[0] * 100000) / udaoc.getTotalValidation();
        uint earning = (participation * validatorBalance) / 100000;
        udao.transfer(msg.sender, earning);
    }

    /// @notice Allows instructers to withdraw individually.
    function withdrawInstructor() external {
        udao.transfer(msg.sender, instructorBalance[msg.sender]);
    }

    /// @notice Returns a hash of the given ScoreVoucher, prepared using EIP712 typed data hashing rules.
    /// @param voucher A ScoreVoucher to hash.
    function _hash(ScoreVoucher calldata voucher)
        internal
        view
        returns (bytes32)
    {
        return
            _hashTypedDataV4(
                keccak256(
                    abi.encode(
                        keccak256(
                            "ScoreVoucher(int256 score,uint256 successfulValidation,uint256 unsuccessfulValidation,address redeemer)"
                        ),
                        voucher.score,
                        voucher.successfulValidation,
                        voucher.unsuccessfulValidation,
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

    /// @notice Verifies the signature for a given ScoreVoucher, returning the address of the signer.
    /// @dev Will revert if the signature is invalid. Does not verify that the signer is authorized to mint NFTs.
    /// @param voucher A ScoreVoucher describing an unminted NFT.
    function _verify(ScoreVoucher calldata voucher)
        internal
        view
        returns (address)
    {
        bytes32 digest = _hash(voucher);
        return ECDSA.recover(digest, voucher.signature);
    }
}
