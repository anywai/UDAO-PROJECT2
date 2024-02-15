const ethers = require("ethers");

// These constants must match the ones used in the smart contract.
const SIGNING_DOMAIN_NAME = "TreasuryVouchers";
const SIGNING_DOMAIN_VERSION = "1";

/**
 * JSDoc typedefs.
 *
 * @typedef {object} CoachingVoucher
 * @param {ethers.BigNumber | number} tokenId the id of content
 * @param {ethers.BigNumber | number} priceToPay price that is going to be paid to coach
 * @param {ethers.BigNumber | number} validUntil deadline of validaity of voucher
 * @param {boolean} isRefundable is coaching refundable
 * @param {ethers.utils.getAddress | address} redeemer the address of the learner
 * @param {string} userId the id of the learner
 * @property {ethers.BytesLike} signature an EIP-712 signature of all fields in the NFTVoucher, apart from signature itself.
 */

/**
 * LazyMinter is a helper class that creates NFTVoucher objects and signs them, to be redeemed later by the LazyNFT contract.
 */
class LazyCoaching {
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

  async createVoucher(coach, priceToPay, coachingDate, learner, userId) {
    const voucher = {
      coach,
      priceToPay,
      coachingDate,
      learner,
      userId,
    };
    const domain = await this._signingDomain();
    const types = {
      CoachingVoucher: [
        { name: "coach", type: "address" },
        { name: "priceToPay", type: "uint256" },
        { name: "coachingDate", type: "uint256" },
        { name: "learner", type: "address" },
        { name: "userId", type: "string" },
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
  LazyCoaching,
};
