const ethers = require("ethers");

// These constants must match the ones used in the smart contract.
const SIGNING_DOMAIN_NAME = "TreasuryVouchers";
const SIGNING_DOMAIN_VERSION = "1";

/**
 * JSDoc typedefs.
 *
 * @typedef {object} ContentDiscountVoucher
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
class DiscountedPurchase {
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
   * Creates a new ContentDiscountVoucher object and signs it using this LazyMinter's signing key.
   *
   * @param {ethers.BigNumber | number} tokenId the id of content
   * @param {ethers.BigNumber | number} priceToPay price that is going to be paid to coach
   * @param {ethers.BigNumber | number} validUntil deadline of validaity of voucher
   * @param {boolean} isRefundable is coaching refundable
   * @param {ethers.utils.getAddress | address} redeemer the address of the learner
   *
   * @returns {ContentDiscountVoucher}
   */
  async createVoucher(tokenId, fullContentPurchase, purchasedParts, priceToPay, validUntil, redeemer, giftReceiver) {
    const voucher = {
      tokenId,
      fullContentPurchase,
      purchasedParts,
      priceToPay,
      validUntil,
      redeemer,
      giftReceiver,
    };
    const domain = await this._signingDomain();

    const types = {
      ContentDiscountVoucher: [
        { name: "tokenId", type: "uint256" },
        { name: "fullContentPurchase", type: "bool" },
        { name: "purchasedParts", type: "uint256[]" },
        { name: "priceToPay", type: "uint256" },
        { name: "validUntil", type: "uint256" },
        { name: "redeemer", type: "address" },
        { name: "giftReceiver", type: "address" },
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
  DiscountedPurchase,
};
