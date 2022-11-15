// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/draft-EIP712.sol";
import "./RoleController.sol";
import "./IUDAOC.sol";

interface IStakingContract {
    function registerValidation() external;
}

contract ValidationManager is RoleController, EIP712 {
    string private constant SIGNING_DOMAIN = "ValidationSetter";
    string private constant SIGNATURE_VERSION = "1";

    // UDAO (ERC721) Token interface
    IUDAOC udaoc;
    IStakingContract staker;

    constructor(address udaocAddress, address irmAddress)
        EIP712(SIGNING_DOMAIN, SIGNATURE_VERSION)
        RoleController(irmAddress)
    {
        udaoc = IUDAOC(udaocAddress);
    }

    /// @notice Represents an un-minted NFT, which has not yet been recorded into the blockchain.
    /// A signed voucher can be redeemed for a real NFT using the redeem function.
    struct ValidationVoucher {
        /// @notice The id of the token to be redeemed.
        uint256 tokenId;
        /// @notice Address of the redeemer
        address redeemer;
        /// @notice the EIP-712 signature of all other fields in the ContentVoucher struct.
        bytes signature;
    }

    event ValidationEnded(uint validationId, uint tokenId, bool result);

    // tokenId => result
    mapping(uint => bool) isValidated;
    // validator => score
    mapping(address => uint256) validatorScore;

    struct Validation {
        uint id;
        uint tokenId;
        uint8 validationCount;
        address[] validators;
        uint acceptVoteCount;
        bool finalValidationResult;
        mapping(address => bool) vote;
        mapping(address => bool) isVoted;
        uint resultDate;
        uint validationScore;
        uint validatorScore; // successfulValidation * validationScore
    }

    uint public requiredValidator;
    uint public minRequiredAcceptVote;

    Validation[] validations;

    mapping(address => uint) validationCount;
    mapping(address => uint) activeValidation;
    mapping(address => bool) isInDispute;
    mapping(address => uint) public successfulValidation;
    mapping(address => uint) public unsuccessfulValidation;
    uint public totalSuccessfulValidation;

    function setAsValidated(ValidationVoucher calldata voucher) external {
        // make sure redeemer is redeeming
        require(voucher.redeemer == msg.sender, "You are not the redeemer");
        // make sure signature is valid and get the address of the signer
        address signer = _verify(voucher);
        require(
            IRM.hasRole(BACKEND_ROLE, signer),
            "Signature invalid or unauthorized"
        );
        isValidated[voucher.tokenId] = true;
    }

    function setUDAOC(address udaocAddress) external onlyRole(FOUNDATION_ROLE) {
        udaoc = IUDAOC(udaocAddress);
    }

    function setStaker(address stakerAddress)
        external
        onlyRole(FOUNDATION_ROLE)
    {
        staker = IStakingContract(stakerAddress);
    }

    function createValidation(uint tokenId, uint score)
        external
        onlyRole(BACKEND_ROLE)
    {
        /// @notice starts new validation for content
        /// @param tokenId id of the content that will be validated
        /// @param score validation score of the content
        Validation storage validation = validations.push();
        validation.id = validations.length;
        validation.tokenId = tokenId;
        validation.validationScore = score;
    }

    function getValidationResults(address account)
        external
        view
        returns (uint[2] memory results)
    {
        /// @notice returns successful and unsuccessful validation count of the account
        /// @param account wallet address of the account that wanted to be checked
        results[0] = successfulValidation[account];
        results[1] = unsuccessfulValidation[account];
    }

    function getTotalValidation() external view returns (uint) {
        /// @notice returns total successful validation count
        return totalSuccessfulValidation;
    }

    function getIsValidated(uint tokenId) external view returns (bool) {
        return isValidated[tokenId];
    }

    /// @notice Returns a hash of the given ContentVoucher, prepared using EIP712 typed data hashing rules.
    /// @param voucher A ContentVoucher to hash.
    function _hash(ValidationVoucher calldata voucher)
        internal
        view
        returns (bytes32)
    {
        return
            _hashTypedDataV4(
                keccak256(
                    abi.encode(
                        keccak256(
                            "ValidationVoucher(uint256 tokenId,address redeemer)"
                        ),
                        voucher.tokenId,
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
    function _verify(ValidationVoucher calldata voucher)
        internal
        view
        returns (address)
    {
        bytes32 digest = _hash(voucher);
        return ECDSA.recover(digest, voucher.signature);
    }
}
