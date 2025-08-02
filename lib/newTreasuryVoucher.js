const { TypedDataEncoder, getAddress, recoverAddress } = require("ethers");

const SIGNING_DOMAIN_NAME = "NewTreasuryVouchers";
const SIGNING_DOMAIN_VERSION = "1";

class BaseVoucherHelper {
  constructor({ contractAddress, signer, domainName, domainVersion, typeName, fields }) {
    this.contractAddress = contractAddress;
    this.signer = signer;
    this.typeName = typeName;
    this.fields = fields;
    this._domain = null;
    this.domainName = domainName;
    this.domainVersion = domainVersion;
  }

  async _signingDomain() {
    if (this._domain) return this._domain;
    const { chainId } = await this.signer.provider.getNetwork();
    this._domain = {
      name: this.domainName,
      version: this.domainVersion,
      chainId,
      verifyingContract: this.contractAddress,
    };
    return this._domain;
  }

  async signVoucher(data) {
    const domain = await this._signingDomain();
    const sanitized = this._sanitize(data);
    const types = { [this.typeName]: this.fields };
    const signature = await this.signer.signTypedData(domain, types, sanitized);
    return { ...sanitized, signature };
  }

  async verifyVoucher(voucher, expectedSigner) {
    const domain = await this._signingDomain();
    const types = { [this.typeName]: this.fields };
    const sanitized = this._sanitize(voucher);
    const digest = TypedDataEncoder.hash(domain, types, sanitized);
    const recovered = recoverAddress(digest, voucher.signature);
    return recovered.toLowerCase() === expectedSigner.toLowerCase();
  }

  _sanitize(data) {
    // override if needed
    return data;
  }
}

class CreateCourseVoucherHelper extends BaseVoucherHelper {
  constructor(opts) {
    super({
      ...opts,
      domainName: SIGNING_DOMAIN_NAME,
      domainVersion: SIGNING_DOMAIN_VERSION,
      typeName: "CreateCourseVoucher",
      fields: [
        { name: "uri", type: "string" },
        { name: "withdrawers", type: "address[]" },
        { name: "redeemer", type: "address" },
        { name: "validUntil", type: "uint256" },
      ],
    });
  }

  _sanitize(data) {
    return {
      uri: data.uri,
      withdrawers: data.withdrawers.map(getAddress),
      redeemer: getAddress(data.redeemer),
      validUntil: data.validUntil,
    };
  }
}

class UpdateCourseVoucherHelper extends BaseVoucherHelper {
  constructor(opts) {
    super({
      ...opts,
      domainName: SIGNING_DOMAIN_NAME,
      domainVersion: SIGNING_DOMAIN_VERSION,
      typeName: "UpdateCourseVoucher",
      fields: [
        { name: "courseId", type: "uint256" },
        { name: "sellable", type: "bool" },
        { name: "uri", type: "string" },
        { name: "withdrawers", type: "address[]" },
        { name: "redeemer", type: "address" },
        { name: "validUntil", type: "uint256" },
      ],
    });
  }

  _sanitize(data) {
    return {
      courseId: data.courseId,
      sellable: data.sellable,
      uri: data.uri,
      withdrawers: data.withdrawers.map(getAddress),
      redeemer: getAddress(data.redeemer),
      validUntil: data.validUntil,
    };
  }
}

class BuyCourseVoucherHelper extends BaseVoucherHelper {
  constructor(opts) {
    super({
      ...opts,
      domainName: SIGNING_DOMAIN_NAME,
      domainVersion: SIGNING_DOMAIN_VERSION,
      typeName: "BuyCourseVoucher",
      fields: [
        { name: "courseId", type: "uint256" },
        { name: "tokenAddress", type: "address" },
        { name: "coursePrice", type: "uint256" },
        { name: "courseReceiver", type: "address" },
        { name: "redeemer", type: "address" },
        { name: "validUntil", type: "uint256" },
      ],
    });
  }

  _sanitize(data) {
    return {
      courseId: data.courseId,
      tokenAddress: getAddress(data.tokenAddress),
      coursePrice: data.coursePrice,
      courseReceiver: getAddress(data.courseReceiver),
      redeemer: getAddress(data.redeemer),
      validUntil: data.validUntil,
    };
  }
}
class RefundCourseVoucherHelper extends BaseVoucherHelper {
  constructor(opts) {
    super({
      ...opts,
      domainName: SIGNING_DOMAIN_NAME,
      domainVersion: SIGNING_DOMAIN_VERSION,
      typeName: "RefundCourseVoucher",
      fields: [
        { name: "paymentId", type: "uint256" },
        { name: "redeemer", type: "address" },
        { name: "validUntil", type: "uint256" },
      ],
    });
  }

  _sanitize(data) {
    return {
      paymentId: data.paymentId,
      redeemer: getAddress(data.redeemer),
      validUntil: data.validUntil,
    };
  }
}
class RefundCourseByOwnerAndCourseIdVoucherHelper extends BaseVoucherHelper {
  constructor(opts) {
    super({
      ...opts,
      domainName: SIGNING_DOMAIN_NAME,
      domainVersion: SIGNING_DOMAIN_VERSION,
      typeName: "RefundCourseByOwnerAndCourseIdVoucher",
      fields: [
        { name: "courseOwner", type: "address" },
        { name: "courseId", type: "uint256" },
        { name: "redeemer", type: "address" },
        { name: "validUntil", type: "uint256" },
      ],
    });
  }

  _sanitize(data) {
    return {
      courseOwner: getAddress(data.courseOwner),
      courseId: data.courseId,
      redeemer: getAddress(data.redeemer),
      validUntil: data.validUntil,
    };
  }
}

class WithdrawVoucherHelper extends BaseVoucherHelper {
  constructor(opts) {
    super({
      ...opts,
      domainName: SIGNING_DOMAIN_NAME,
      domainVersion: SIGNING_DOMAIN_VERSION,
      typeName: "WithdrawVoucher",
      fields: [
        { name: "courseId", type: "uint256" },
        { name: "fromIndex", type: "uint256" },
        { name: "toIndex", type: "uint256" },
        { name: "redeemer", type: "address" },
        { name: "validUntil", type: "uint256" },
      ],
    });
  }

  _sanitize(data) {
    return {
      courseId: data.courseId,
      fromIndex: data.fromIndex,
      toIndex: data.toIndex,
      redeemer: getAddress(data.redeemer),
      validUntil: data.validUntil,
    };
  }
}

// Unified helper initializer
function getVoucherHelpers(opts = {}) {
  // a ?? b --> a tanımlıysa(null-undefined değilse) return a, değilse b döner.
  // b?.property --> b.property tanımlıysa değer, değilse undefined döner.
  const contractAddress = opts.contractAddress ?? globalThis.NewTreasury?.target;
  const signer = opts.signer ?? globalThis.backend;

  return {
    createVH: new CreateCourseVoucherHelper({ contractAddress, signer }),
    updateVH: new UpdateCourseVoucherHelper({ contractAddress, signer }),
    buyVH: new BuyCourseVoucherHelper({ contractAddress, signer }),
    refundVH: new RefundCourseVoucherHelper({ contractAddress, signer }),
    refundByOwnerVH: new RefundCourseByOwnerAndCourseIdVoucherHelper({ contractAddress, signer }),
    withdrawVH: new WithdrawVoucherHelper({ contractAddress, signer }),
  };
}

module.exports = {
  CreateCourseVoucherHelper,
  UpdateCourseVoucherHelper,
  BuyCourseVoucherHelper,
  RefundCourseVoucherHelper,
  RefundCourseByOwnerAndCourseIdVoucherHelper,
  WithdrawVoucherHelper,
  getVoucherHelpers,
};

/*

// voucher-helper.js (aynı dosya)
class BaseVoucherHelper {
  // ... mevcut kod ...

  async recoverSigner(voucher) {
    const domain = await this._signingDomain();
    const types = { [this.typeName]: this.fields };
    // imzalayanı geri döndür
    const digest = TypedDataEncoder.hash(domain, types, this._sanitize(voucher));
    const signer = recoverAddress(digest, voucher.signature);
    return getAddress(signer);
  }
}

*/
