// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/draft-EIP712.sol";
import "./RoleController.sol";
import "./IUDAOC.sol";

interface IStakingContract {
    function registerValidation() external;
}

contract JurorManager is RoleController, EIP712 {
    string private constant SIGNING_DOMAIN = "JurorSetter";
    string private constant SIGNATURE_VERSION = "1";

    // UDAO (ERC721) Token interface
    IUDAOC udaoc;
    IStakingContract staker;

    constructor(address udaocAddress, address rmAddress)
        EIP712(SIGNING_DOMAIN, SIGNATURE_VERSION)
        RoleController(rmAddress)
    {
        udaoc = IUDAOC(udaocAddress);
    }

    /// @notice Represents an un-minted NFT, which has not yet been recorded into the blockchain.
    /// A signed voucher can be redeemed for a real NFT using the redeem function.
    struct CaseVoucher {
        /// @notice Address of the redeemer
        address redeemer;
        /// @notice the EIP-712 signature of all other fields in the ContentVoucher struct.
        bytes signature;
    }

    // juror => score
    mapping(address => uint256) jurorScore;

    uint public totalJurorScore;

    function addJurorPoint(CaseVoucher calldata voucher) external {
        // make sure redeemer is redeeming
        require(voucher.redeemer == msg.sender, "You are not the redeemer");
        // make sure signature is valid and get the address of the signer
        address signer = _verify(voucher);
        require(
            IRM.hasRole(BACKEND_ROLE, signer),
            "Signature invalid or unauthorized"
        );
        jurorScore[voucher.redeemer]++;
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

    function getTotalJurorScore() external view returns (uint) {
        /// @notice returns total successful validation count
        return totalJurorScore;
    }

    /// @notice Returns a hash of the given ContentVoucher, prepared using EIP712 typed data hashing rules.
    /// @param voucher A ContentVoucher to hash.
    function _hash(CaseVoucher calldata voucher)
        internal
        view
        returns (bytes32)
    {
        return
            _hashTypedDataV4(
                keccak256(
                    abi.encode(
                        keccak256("CaseVoucher(address redeemer)"),
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
    function _verify(CaseVoucher calldata voucher)
        internal
        view
        returns (address)
    {
        bytes32 digest = _hash(voucher);
        return ECDSA.recover(digest, voucher.signature);
    }
}
