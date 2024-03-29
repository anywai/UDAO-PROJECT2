const ethers = require("ethers");

// These constants must match the ones used in the smart contract.
const SIGNING_DOMAIN_NAME = "UDAOStaker";
const SIGNING_DOMAIN_VERSION = "1";

/**
 * JSDoc typedefs.
 *
 * @typedef {object} UDAOStaker
 * @param {ethers.utils.getAddress | address} redeemer the address of the staker
 * @param {ethers.utils.getAddress | address} validUntil the date until the voucher is valid
 * @param {ethers.utils.getAddress | address} roleId the id of the role 0 validator, 1 juror, 2 corporate, 3 super validator
 * @property {ethers.BytesLike} signature an EIP-712 signature of all fields in the NFTVoucher, apart from signature itself.
 */

/**
 * LazyMinter is a helper class that creates NFTVoucher objects and signs them, to be redeemed later by the LazyNFT contract.
 */
class LazyRole {
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
   * Creates a new UDAOStaker object and signs it using this LazyMinter's signing key.
   *
   * @param {ethers.utils.getAddress | address} redeemer the address of the staker
   * @param {ethers.utils.getAddress | address} validUntil the date until the voucher is valid
   * @param {ethers.utils.getAddress | address} roleId the id of the role 0 validator, 1 juror, 2 corporate, 3 super validator
   *
   * @returns {UDAOStaker}
   */
  async createVoucher(redeemer, validUntil, roleId) {
    const voucher = {
      redeemer,
      validUntil,
      roleId,
    };
    const domain = await this._signingDomain();

    const types = {
      UDAOStaker: [
        { name: "redeemer", type: "address" },
        { name: "validUntil", type: "uint256" },
        { name: "roleId", type: "uint256" },
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
  LazyRole,
};
