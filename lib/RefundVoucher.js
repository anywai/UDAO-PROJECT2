const ethers = require("ethers");

// These constants must match the ones used in the smart contract.
const SIGNING_DOMAIN_NAME = "TreasuryVouchers";
const SIGNING_DOMAIN_VERSION = "1";

/**
 struct RefundVoucher {
        uint256 saleID;
        address instructor;
        uint256[] finalParts;
        uint256 ownedContentIndex;
        uint256 validUntil;
        bytes signature;
    }
 */

class RefundVoucher {
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

  async createVoucher(saleID, instructor, finalParts, ownedContentIndex, validUntil) {
    const voucher = {
      saleID,
      instructor,
      finalParts,
      ownedContentIndex,
      validUntil,
    };
    const domain = await this._signingDomain();
    const types = {
      RefundVoucher: [
        { name: "saleID", type: "uint256" },
        { name: "instructor", type: "address" },
        { name: "finalParts", type: "uint256[]" },
        { name: "ownedContentIndex", type: "uint256" },
        { name: "validUntil", type: "uint256" },
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
  RefundVoucher,
};
