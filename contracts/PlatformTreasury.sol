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

    constructor(
        address udaoAddress,
        address udaocAddress,
        address irmAddress,
        address ivmAddress
    )   
        EIP712(SIGNING_DOMAIN, SIGNATURE_VERSION)
        BasePlatform(udaoAddress, udaocAddress, irmAddress)
        ContentManager(ivmAddress)
    {}

    struct ValidationScoreVoucher {
        /// @notice The id of the token to be redeemed.
        int256 score;
    
        uint256 successfulValidation;
        uint256 unsuccessfulValidation;
        /// @notice Address of the redeemer
        address redeemer;
        /// @notice the EIP-712 signature of all other fields in the ContentVoucher struct.
        bytes signature;
    }

    // validator => score
    mapping(address => int256) validatorScore;

    function withdrawGovernance() external onlyRole(GOVERNANCE_ROLE) {
        /// @notice withdraws governance balance to governance treasury
        udao.transfer(governanceTreasury, governanceBalance);
    }

    function withdrawFoundation() external onlyRole(FOUNDATION_ROLE) {
        /// @notice withdraws foundation balance to foundation wallet
        udao.transfer(foundationWallet, foundationBalance);
    }

    function writeValidatorScore(ValidationScoreVoucher calldata _scoreVoucher) external onlyRoles(validator_roles){
        // make sure redeemer is redeeming
        require(_scoreVoucher.redeemer == msg.sender, "You are not the redeemer");

        // make sure signature is valid and get the address of the signer
        address signer = _verify(_scoreVoucher);
        require(
            irm.hasRole(BACKEND_ROLE, signer),
            "Signature invalid or unauthorized"
        );

        validatorScore[_scoreVoucher.redeemer] = _scoreVoucher.score;
    }

    function withdrawValidator() external onlyRoles(validator_roles) {
        /// @notice calculates validator earnings and withdraws calculated earning to validator wallet
        uint[2] memory results = udaoc.getValidationResults(msg.sender);
        /// @dev results[0] is successful validations
        uint participation = (results[0] * 100000) / udaoc.getTotalValidation();
        uint earning = (participation * validatorBalance) / 100000;
        udao.transfer(msg.sender, earning);
    }

    function withdrawInstructor() external {
        /// @dev Allows coaches to withdraw individually.
        udao.transfer(msg.sender, instructorBalance[msg.sender]);
    }

    /// @notice Returns a hash of the given ValidationScoreVoucher, prepared using EIP712 typed data hashing rules.
    /// @param voucher A ValidationScoreVoucher to hash.
    function _hash(ValidationScoreVoucher calldata voucher)
        internal
        view
        returns (bytes32)
    {
        return
            _hashTypedDataV4(
                keccak256(
                    abi.encode(
                        keccak256(
                            "ValidationScoreVoucher(int256 score,uint256 successfulValidation,uint256 unsuccessfulValidation,address redeemer)"
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

    /// @notice Verifies the signature for a given ContentVoucher, returning the address of the signer.
    /// @dev Will revert if the signature is invalid. Does not verify that the signer is authorized to mint NFTs.
    /// @param voucher A ContentVoucher describing an unminted NFT.
    function _verify(ValidationScoreVoucher calldata voucher)
        internal
        view
        returns (address)
    {
        bytes32 digest = _hash(voucher);
        return ECDSA.recover(digest, voucher.signature);
    }

}
