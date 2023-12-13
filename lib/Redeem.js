const ethers = require("ethers");

// These constants must match the ones used in the smart contract.
const SIGNING_DOMAIN_NAME = "UDAOCMinter";
const SIGNING_DOMAIN_VERSION = "1";

/**
 * JSDoc typedefs.
 *
 * @typedef {object} RedeemVoucher
 * @property {ethers.BigNumber | number} validUntil The date until the voucher is valid
 * @property {ethers.BigNumber | number} tokenId the id of the un-minted NFT
 * @property {boolean} fullContentPurchase the metadata URI to associate with this NFT
 * @property {ethers.BigNumber | number} minPrice the minimum price (in wei) that the creator will accept to redeem this NFT
 * @property {ethers.BigNumber | number} royaltyAmount the percentage of royalty fee
 * @property {ethers.utils.getAddress | address} royaltyReceiver the address of which the royalty fee will be sent
 * @property {ethers.BytesLike} signature an EIP-712 signature of all fields in the NFTVoucher, apart from signature itself.
 */

/**
 * LazyMinter is a helper class that creates NFTVoucher objects and signs them, to be redeemed later by the LazyNFT contract.
 */
class Redeem {
  /**
   * Create a new LazyMinter targeting a deployed instance of the LazyNFT contract.
   *
   * @param {Object} options
   * @param {ethers.Contract} contract an ethers Contract that's wired up to the deployed contract
   * @param {ethers.Signer} signer a Signer whose account is authorized to mint NFTs on the deployed contract
   */
  constructor({ contract, signer }) {
    this.contract = contract;
    this.signer = signer;
  }

  /**
   ///@notice A signed voucher can be redeemed for a real content NFT using the redeem function.
   /// @notice The date until the voucher is valid
        uint256 validUntil;
        /// @notice The price of the content
        uint256 _contentPrice;
        /// @notice The price of the content parts
        uint256[] _partPrice;
        /// @notice Token id of the content, not used if new content creation
        uint256 tokenId;
        /// @notice The metadata URI to associate with this token.
        string _uri;
        /// @notice Address of the content creator
        address _contentCreator;
        /// @notice Address of the redeemer
        address _redeemer;
        /// @notice Whether new content or modification, 0 undefined, 1 new content, 2 modification
        uint256 redeemType;
        /// @notice validaton score of the content
        uint256 validationScore;
        /// @notice the EIP-712 signature of all other fields in the CertificateVoucher struct.
        bytes signature;
   */
  async createVoucher(validUntil, _parts, tokenId, _uri, _contentCreator, _redeemer, redeemType, validationScore) {
    const voucher = {
      validUntil,
      _parts,
      tokenId,
      _uri,
      _contentCreator,
      _redeemer,
      redeemType,
      validationScore,
    };
    const domain = await this._signingDomain();

    const types = {
      RedeemVoucher: [
        { name: "validUntil", type: "uint256" },
        { name: "_parts", type: "uint256[]" },
        { name: "tokenId", type: "uint256" },
        { name: "_uri", type: "string" },
        { name: "_contentCreator", type: "address" },
        { name: "_redeemer", type: "address" },
        { name: "redeemType", type: "uint256" },
        { name: "validationScore", type: "uint256" },
      ],
    };
    const signature = await this.signer._signTypedData(domain, types, voucher);

    return {
      ...voucher,
      signature,
    };
  }

  /**
   * @private
   * @returns {object} the EIP-721 signing domain, tied to the chainId of the signer
   */
  async _signingDomain() {
    if (this._domain != null) {
      return this._domain;
    }
    const chainId = await this.contract.getChainID();
    this._domain = {
      name: SIGNING_DOMAIN_NAME,
      version: SIGNING_DOMAIN_VERSION,
      verifyingContract: this.contract.address,
      chainId,
    };
    return this._domain;
  }
}

module.exports = {
  Redeem,
};
