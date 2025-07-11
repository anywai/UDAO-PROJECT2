const { TypedDataEncoder, getAddress, recoverAddress } = require("ethers");

const SIGNING_DOMAIN_NAME = "NewTreasuryVouchers";
const SIGNING_DOMAIN_VERSION = "1";

class CreateCourseVoucherHelper {
  constructor({ contractAddress, signer }) {
    this.contractAddress = contractAddress;
    this.signer = signer;
    this._domain = null;
  }

  async _signingDomain() {
    if (this._domain) return this._domain;

    const { chainId } = await this.signer.provider.getNetwork();

    this._domain = {
      name: SIGNING_DOMAIN_NAME,
      version: SIGNING_DOMAIN_VERSION,
      chainId,
      verifyingContract: this.contractAddress,
    };

    return this._domain;
  }

  async signVoucher({ uri, withdrawers, redeemer, validUntil }) {
    const domain = await this._signingDomain();

    const types = {
      CreateCourseVoucher: [
        { name: "uri", type: "string" },
        { name: "withdrawers", type: "address[]" },
        { name: "redeemer", type: "address" },
        { name: "validUntil", type: "uint256" },
      ],
    };

    const voucher = {
      uri,
      withdrawers: withdrawers.map(getAddress),
      redeemer: getAddress(redeemer),
      validUntil,
    };

    const signature = await this.signer.signTypedData(domain, types, voucher);

    return {
      ...voucher,
      signature,
    };
  }

  async verifyVoucher(voucher, expectedSigner) {
    const domain = await this._signingDomain();

    const types = {
      CreateCourseVoucher: [
        { name: "uri", type: "string" },
        { name: "withdrawers", type: "address[]" },
        { name: "redeemer", type: "address" },
        { name: "validUntil", type: "uint256" },
      ],
    };

    const digest = TypedDataEncoder.hash(domain, types, {
      uri: voucher.uri,
      withdrawers: voucher.withdrawers.map(getAddress),
      redeemer: getAddress(voucher.redeemer),
      validUntil: voucher.validUntil,
    });

    const recovered = recoverAddress(digest, voucher.signature);
    return recovered.toLowerCase() === expectedSigner.toLowerCase();
  }
}

class UpdateCourseVoucherHelper {
  constructor({ contractAddress, signer }) {
    this.contractAddress = contractAddress;
    this.signer = signer;
    this._domain = null;
  }

  async _signingDomain() {
    if (this._domain) return this._domain;

    const { chainId } = await this.signer.provider.getNetwork();

    this._domain = {
      name: SIGNING_DOMAIN_NAME,
      version: SIGNING_DOMAIN_VERSION,
      chainId,
      verifyingContract: this.contractAddress,
    };

    return this._domain;
  }

  async signVoucher({ courseId, sellable, uri, withdrawers, redeemer, validUntil }) {
    const domain = await this._signingDomain();

    const types = {
      UpdateCourseVoucher: [
        { name: "courseId", type: "uint256" },
        { name: "sellable", type: "bool" },
        { name: "uri", type: "string" },
        { name: "withdrawers", type: "address[]" },
        { name: "redeemer", type: "address" },
        { name: "validUntil", type: "uint256" },
      ],
    };

    const voucher = {
      courseId,
      sellable,
      uri,
      withdrawers: withdrawers.map(getAddress),
      redeemer: getAddress(redeemer),
      validUntil,
    };

    const signature = await this.signer.signTypedData(domain, types, voucher);

    return {
      ...voucher,
      signature,
    };
  }

  async verifyVoucher(voucher, expectedSigner) {
    const domain = await this._signingDomain();

    const types = {
      UpdateCourseVoucher: [
        { name: "courseId", type: "uint256" },
        { name: "sellable", type: "bool" },
        { name: "uri", type: "string" },
        { name: "withdrawers", type: "address[]" },
        { name: "redeemer", type: "address" },
        { name: "validUntil", type: "uint256" },
      ],
    };

    const digest = TypedDataEncoder.hash(domain, types, {
      courseId: voucher.courseId,
      sellable: voucher.sellable,
      uri: voucher.uri,
      withdrawers: voucher.withdrawers.map(getAddress),
      redeemer: getAddress(voucher.redeemer),
      validUntil: voucher.validUntil,
    });

    const recovered = recoverAddress(digest, voucher.signature);
    return recovered.toLowerCase() === expectedSigner.toLowerCase();
  }
}

class BuyCourseVoucherHelper {
  constructor({ contractAddress, signer }) {
    this.contractAddress = contractAddress;
    this.signer = signer;
    this._domain = null;
  }

  async _signingDomain() {
    if (this._domain) return this._domain;

    const { chainId } = await this.signer.provider.getNetwork();

    this._domain = {
      name: SIGNING_DOMAIN_NAME,
      version: SIGNING_DOMAIN_VERSION,
      chainId,
      verifyingContract: this.contractAddress,
    };

    return this._domain;
  }

  async signVoucher({ courseId, tokenAddress, coursePrice, courseReceiver, redeemer, validUntil }) {
    const domain = await this._signingDomain();

    const types = {
      BuyCourseVoucher: [
        { name: "courseId", type: "uint256" },
        { name: "tokenAddress", type: "address" },
        { name: "coursePrice", type: "uint256" },
        { name: "courseReceiver", type: "address" },
        { name: "redeemer", type: "address" },
        { name: "validUntil", type: "uint256" },
      ],
    };

    const voucher = {
      courseId,
      tokenAddress: getAddress(tokenAddress),
      coursePrice,
      courseReceiver: getAddress(courseReceiver),
      redeemer: getAddress(redeemer),
      validUntil,
    };

    const signature = await this.signer.signTypedData(domain, types, voucher);

    return {
      ...voucher,
      signature,
    };
  }

  async verifyVoucher(voucher, expectedSigner) {
    const domain = await this._signingDomain();

    const types = {
      BuyCourseVoucher: [
        { name: "courseId", type: "uint256" },
        { name: "tokenAddress", type: "address" },
        { name: "coursePrice", type: "uint256" },
        { name: "courseReceiver", type: "address" },
        { name: "redeemer", type: "address" },
        { name: "validUntil", type: "uint256" },
      ],
    };

    const digest = TypedDataEncoder.hash(domain, types, {
      courseId: voucher.courseId,
      tokenAddress: getAddress(voucher.tokenAddress),
      coursePrice: voucher.coursePrice,
      courseReceiver: getAddress(voucher.courseReceiver),
      redeemer: getAddress(voucher.redeemer),
      validUntil: voucher.validUntil,
    });

    const recovered = recoverAddress(digest, voucher.signature);
    return recovered.toLowerCase() === expectedSigner.toLowerCase();
  }
}

class RefundCourseVoucherHelper {
  constructor({ contractAddress, signer }) {
    this.contractAddress = contractAddress;
    this.signer = signer;
    this._domain = null;
  }

  async _signingDomain() {
    if (this._domain) return this._domain;

    const { chainId } = await this.signer.provider.getNetwork();

    this._domain = {
      name: SIGNING_DOMAIN_NAME,
      version: SIGNING_DOMAIN_VERSION,
      chainId,
      verifyingContract: this.contractAddress,
    };

    return this._domain;
  }

  async signVoucher({ paymentId, redeemer, validUntil }) {
    const domain = await this._signingDomain();

    const types = {
      RefundCourseVoucher: [
        { name: "paymentId", type: "uint256" },
        { name: "redeemer", type: "address" },
        { name: "validUntil", type: "uint256" },
      ],
    };

    const voucher = {
      paymentId,
      redeemer: getAddress(redeemer),
      validUntil,
    };

    const signature = await this.signer.signTypedData(domain, types, voucher);

    return {
      ...voucher,
      signature,
    };
  }

  async verifyVoucher(voucher, expectedSigner) {
    const domain = await this._signingDomain();

    const types = {
      RefundCourseVoucher: [
        { name: "paymentId", type: "uint256" },
        { name: "redeemer", type: "address" },
        { name: "validUntil", type: "uint256" },
      ],
    };

    const digest = TypedDataEncoder.hash(domain, types, {
      paymentId: voucher.paymentId,
      redeemer: getAddress(voucher.redeemer),
      validUntil: voucher.validUntil,
    });

    const recovered = recoverAddress(digest, voucher.signature);
    return recovered.toLowerCase() === expectedSigner.toLowerCase();
  }
}

class RefundCourseByOwnerAndCourseIdVoucherHelper {
  constructor({ contractAddress, signer }) {
    this.contractAddress = contractAddress;
    this.signer = signer;
    this._domain = null;
  }

  async _signingDomain() {
    if (this._domain) return this._domain;

    const { chainId } = await this.signer.provider.getNetwork();

    this._domain = {
      name: SIGNING_DOMAIN_NAME,
      version: SIGNING_DOMAIN_VERSION,
      chainId,
      verifyingContract: this.contractAddress,
    };

    return this._domain;
  }

  async signVoucher({ courseOwner, courseId, redeemer, validUntil }) {
    const domain = await this._signingDomain();

    const types = {
      RefundCourseByOwnerAndCourseIdVoucher: [
        { name: "courseOwner", type: "address" },
        { name: "courseId", type: "uint256" },
        { name: "redeemer", type: "address" },
        { name: "validUntil", type: "uint256" },
      ],
    };

    const voucher = {
      courseOwner: getAddress(courseOwner),
      courseId,
      redeemer: getAddress(redeemer),
      validUntil,
    };

    const signature = await this.signer.signTypedData(domain, types, voucher);

    return {
      ...voucher,
      signature,
    };
  }

  async verifyVoucher(voucher, expectedSigner) {
    const domain = await this._signingDomain();

    const types = {
      RefundCourseByOwnerAndCourseIdVoucher: [
        { name: "courseOwner", type: "address" },
        { name: "courseId", type: "uint256" },
        { name: "redeemer", type: "address" },
        { name: "validUntil", type: "uint256" },
      ],
    };

    const digest = TypedDataEncoder.hash(domain, types, {
      courseOwner: getAddress(voucher.courseOwner),
      courseId: voucher.courseId,
      redeemer: getAddress(voucher.redeemer),
      validUntil: voucher.validUntil,
    });

    const recovered = recoverAddress(digest, voucher.signature);
    return recovered.toLowerCase() === expectedSigner.toLowerCase();
  }
}

class WithdrawVoucherHelper {
  constructor({ contractAddress, signer }) {
    this.contractAddress = contractAddress;
    this.signer = signer;
    this._domain = null;
  }

  async _signingDomain() {
    if (this._domain) return this._domain;

    const { chainId } = await this.signer.provider.getNetwork();

    this._domain = {
      name: SIGNING_DOMAIN_NAME,
      version: SIGNING_DOMAIN_VERSION,
      chainId,
      verifyingContract: this.contractAddress,
    };

    return this._domain;
  }

  async signVoucher({ courseId, fromIndex, toIndex, redeemer, validUntil }) {
    const domain = await this._signingDomain();

    const types = {
      WithdrawVoucher: [
        { name: "courseId", type: "uint256" },
        { name: "fromIndex", type: "uint256" },
        { name: "toIndex", type: "uint256" },
        { name: "redeemer", type: "address" },
        { name: "validUntil", type: "uint256" },
      ],
    };

    const voucher = {
      courseId,
      fromIndex,
      toIndex,
      redeemer: getAddress(redeemer),
      validUntil,
    };

    const signature = await this.signer.signTypedData(domain, types, voucher);

    return {
      ...voucher,
      signature,
    };
  }

  async verifyVoucher(voucher, expectedSigner) {
    const domain = await this._signingDomain();

    const types = {
      WithdrawVoucher: [
        { name: "courseId", type: "uint256" },
        { name: "fromIndex", type: "uint256" },
        { name: "toIndex", type: "uint256" },
        { name: "redeemer", type: "address" },
        { name: "validUntil", type: "uint256" },
      ],
    };

    const digest = TypedDataEncoder.hash(domain, types, {
      courseId: voucher.courseId,
      fromIndex: voucher.fromIndex,
      toIndex: voucher.toIndex,
      redeemer: getAddress(voucher.redeemer),
      validUntil: voucher.validUntil,
    });

    const recovered = recoverAddress(digest, voucher.signature);
    return recovered.toLowerCase() === expectedSigner.toLowerCase();
  }
}

module.exports = {
  CreateCourseVoucherHelper,
  UpdateCourseVoucherHelper,
  BuyCourseVoucherHelper,
  RefundCourseVoucherHelper,
  RefundCourseByOwnerAndCourseIdVoucherHelper,
  WithdrawVoucherHelper,
};
