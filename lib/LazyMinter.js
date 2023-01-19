const ethers = require("ethers");

// These constants must match the ones used in the smart contract.
const SIGNING_DOMAIN_NAME = "UDAOCMinter";
const SIGNING_DOMAIN_VERSION = "1";

/**
 * JSDoc typedefs.
 *
 * @typedef {object} ContentVoucher
 * @param {ethers.BigNumber | number} tokenId the id of the un-minted NFT
 * @param {string} uri the metadata URI to associate with this NFT
 * @param {ethers.utils.getAddress | address} redeemer the address of the instructor
 * @param {boolean} isCoachingEnabled is coaching enabled for the content
 * @param {string} name the name of the content
 * @param {string} description the description of the content
 * @property {ethers.BytesLike} signature an EIP-712 signature of all fields in the NFTVoucher, apart from signature itself.
 */

/**
 * LazyMinter is a helper class that creates NFTVoucher objects and signs them, to be redeemed later by the LazyNFT contract.
 */
class LazyMinter {
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
   * Creates a new ContentVoucher object and signs it using this LazyMinter's signing key.
   *
   * @param {ethers.BigNumber | number} tokenId the id of the un-minted NFT
   * @param {string} uri the metadata URI to associate with this NFT
   * @param {ethers.utils.getAddress | address} redeemer the address of the instructor
   * @param {boolean} isCoachingEnabled is coaching enabled for the content
   * @param {string} name the name of the content
   * @param {string} description the description of the content
   *
   * @returns {ContentVoucher}
   */
  async createVoucher(
    tokenId,
    uri,
    redeemer,
    isCoachingEnabled,
    name,
    description
  ) {
    const voucher = {
      tokenId,
      uri,
      redeemer,
      isCoachingEnabled,
      name,
      description,
    };
    const domain = await this._signingDomain();

    const types = {
      ContentVoucher: [
        { name: "tokenId", type: "uint256" },
        { name: "uri", type: "string" },
        { name: "redeemer", type: "address" },
        { name: "isCoachingEnabled", type: "bool" },
        { name: "name", type: "string" },
        { name: "description", type: "string" },
      ],
    };
    const signature = await this.signer._signTypedData(domain, types, voucher);

    return {
      ...voucher,
      signature,
    };
  }

  /**
   * Creates a new TransferVoucher object and signs it using this LazyMinter's signing key.
   *
   * @param {ethers.BigNumber | number} tokenId the id of the un-minted NFT
   * @param {ethers.utils.getAddress | address} from the address of the instructor
   * @param {ethers.utils.getAddress | address} to the address of the redeemer
   *
   * @returns {TransferVoucher}
   */
  async createTransferVoucher(
    tokenId,
    from,
    to
  ) {
    const voucher = {
      tokenId,
      from,
      to
    };
    const domain = await this._signingDomain();

    const types = {
      TransferVoucher: [
        { name: "tokenId", type: "uint256" },
        { name: "from", type: "address" },
        { name: "to", type: "address" },
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
  LazyMinter,
};
