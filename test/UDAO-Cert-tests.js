const { expect } = require("chai");
const hardhat = require("hardhat");
const { ethers } = hardhat;
const chai = require("chai");
const BN = require("bn.js");
const { LazyUDAOCertMinter } = require("../lib/LazyUDAOCertMinter");
const helpers = require("@nomicfoundation/hardhat-network-helpers");
const { deploy } = require("../lib/deployments");

// Enable and inject BN dependency
chai.use(require("chai-bn")(BN));
/// HELPERS---------------------------------------------------------------------
/// @dev Deploy contracts and assign them
async function reDeploy(reApplyRolesViaVoucher = true, isDexRequired = false) {
  const replace = await deploy(isDexRequired);
  backend = replace.backend;
  contentCreator = replace.contentCreator;
  contentBuyer = replace.contentBuyer;
  contentBuyer1 = replace.contentBuyer1;
  contentBuyer2 = replace.contentBuyer2;
  contentBuyer3 = replace.contentBuyer3;
  validatorCandidate = replace.validatorCandidate;
  validator = replace.validator;
  validator1 = replace.validator1;
  validator2 = replace.validator2;
  validator3 = replace.validator3;
  validator4 = replace.validator4;
  validator5 = replace.validator5;
  superValidatorCandidate = replace.superValidatorCandidate;
  superValidator = replace.superValidator;
  foundation = replace.foundation;
  governanceCandidate = replace.governanceCandidate;
  governanceMember = replace.governanceMember;
  jurorCandidate = replace.jurorCandidate;
  jurorMember = replace.jurorMember;
  jurorMember1 = replace.jurorMember1;
  jurorMember2 = replace.jurorMember2;
  jurorMember3 = replace.jurorMember3;
  jurorMember4 = replace.jurorMember4;
  corporation = replace.corporation;
  contractUDAO = replace.contractUDAO;
  contractRoleManager = replace.contractRoleManager;
  contractUDAOCertificate = replace.contractUDAOCertificate;
  contractUDAOContent = replace.contractUDAOContent;
  contractSupervision = replace.contractSupervision;
  contractSupervision = replace.contractSupervision;
  contractPlatformTreasury = replace.contractPlatformTreasury;
  contractUDAOVp = replace.contractUDAOVp;
  contractUDAOStaker = replace.contractUDAOStaker;
  contractUDAOTimelockController = replace.contractUDAOTimelockController;
  contractUDAOGovernor = replace.contractUDAOGovernor;
  contractSupervision = replace.contractSupervision;
  GOVERNANCE_ROLE = replace.GOVERNANCE_ROLE;
  BACKEND_ROLE = replace.BACKEND_ROLE;
  contractContractManager = replace.contractContractManager;
  account1 = replace.account1;
  account2 = replace.account2;
  account3 = replace.account3;
  contractPriceGetter = replace.contractPriceGetter;
  const reApplyValidatorRoles = [validator, validator1, validator2, validator3, validator4, validator5];
  const reApplyJurorRoles = [jurorMember, jurorMember1, jurorMember2, jurorMember3, jurorMember4];
  const VALIDATOR_ROLE = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("VALIDATOR_ROLE"));
  const JUROR_ROLE = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("JUROR_ROLE"));
}

describe("UDAO Cert Contract", function () {
  it("Should deploy", async function () {
    await reDeploy();
  });

  it("Should create certificate", async function () {
    await reDeploy();
    await contractRoleManager.setKYC(contentBuyer.address, true);

    const tx = await contractUDAOCertificate.getChainID();
    const lazyMinter = new LazyUDAOCertMinter({
      contract: contractUDAOCertificate,
      signer: backend,
    });
    const voucher = await lazyMinter.createVoucher(
      1,
      "ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi",
      contentBuyer.address,
      "Content Name",
      "Content Description"
    );
    await expect(contractUDAOCertificate.connect(contentBuyer).redeem(voucher))
      .to.emit(contractUDAOCertificate, "Transfer") // transfer from null address to minter
      .withArgs("0x0000000000000000000000000000000000000000", contentBuyer.address, voucher.tokenId);
  });

  it("Should fail to create certificate if wrong redeemer", async function () {
    await reDeploy();
    await contractRoleManager.setKYC(contentCreator.address, true);

    const tx = await contractUDAOCertificate.getChainID();
    const lazyMinter = new LazyUDAOCertMinter({
      contract: contractUDAOCertificate,
      signer: backend,
    });
    const voucher = await lazyMinter.createVoucher(
      1,
      "ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi",
      contentBuyer.address,
      "Content Name",
      "Content Description"
    );
    await expect(contractUDAOCertificate.connect(contentCreator).redeem(voucher)).to.revertedWith(
      "You are not the redeemer"
    );
  });

  it("Should fail to create certificate if wrong signer", async function () {
    await reDeploy();
    await contractRoleManager.setKYC(contentBuyer.address, true);

    const tx = await contractUDAOCertificate.getChainID();
    const lazyMinter = new LazyUDAOCertMinter({
      contract: contractUDAOCertificate,
      signer: foundation,
    });
    const voucher = await lazyMinter.createVoucher(
      1,
      "ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi",
      contentBuyer.address,
      "Content Name",
      "Content Description"
    );
    await expect(contractUDAOCertificate.connect(contentBuyer).redeem(voucher)).to.revertedWith(
      "Signature invalid or unauthorized"
    );
  });

  it("Should fail to create certificate if not KYCed", async function () {
    const {
      backend,
      contentCreator,
      contentBuyer,
      validatorCandidate,
      validator,
      superValidatorCandidate,
      superValidator,
      foundation,
      governanceCandidate,
      governanceMember,
      jurorCandidate,
      jurorMember,
      contractUDAO,
      contractRoleManager,
      contractUDAOCertificate,
      contractUDAOContent,
      contractSupervision,
      contractPlatformTreasury,
      contractUDAOVp,
      contractUDAOStaker,
      contractUDAOTimelockController,
      contractUDAOGovernor,
    } = await deploy();
    await contractRoleManager.setKYC(contentBuyer.address, false);

    const tx = await contractUDAOCertificate.getChainID();
    const lazyMinter = new LazyUDAOCertMinter({
      contract: contractUDAOCertificate,
      signer: foundation,
    });
    const voucher = await lazyMinter.createVoucher(
      1,
      "ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi",
      contentBuyer.address,
      "Content Name",
      "Content Description"
    );
    await expect(contractUDAOCertificate.connect(contentBuyer).redeem(voucher)).to.revertedWith("You are not KYCed");
  });

  it("Should fail to create certificate if banned", async function () {
    const {
      backend,
      contentCreator,
      contentBuyer,
      validatorCandidate,
      validator,
      superValidatorCandidate,
      superValidator,
      foundation,
      governanceCandidate,
      governanceMember,
      jurorCandidate,
      jurorMember,
      contractUDAO,
      contractRoleManager,
      contractUDAOCertificate,
      contractUDAOContent,
      contractSupervision,
      contractPlatformTreasury,
      contractUDAOVp,
      contractUDAOStaker,
      contractUDAOTimelockController,
      contractUDAOGovernor,
    } = await deploy();
    await contractRoleManager.setKYC(contentBuyer.address, true);
    await contractRoleManager.setBan(contentBuyer.address, true);
    const tx = await contractUDAOCertificate.getChainID();
    const lazyMinter = new LazyUDAOCertMinter({
      contract: contractUDAOCertificate,
      signer: foundation,
    });
    const voucher = await lazyMinter.createVoucher(
      1,
      "ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi",
      contentBuyer.address,
      "Content Name",
      "Content Description"
    );
    await expect(contractUDAOCertificate.connect(contentBuyer).redeem(voucher)).to.revertedWith("You were banned");
  });

  it("Should get token URI of the Content", async function () {
    await reDeploy();
    await contractRoleManager.setKYC(contentBuyer.address, true);

    const tx = await contractUDAOCertificate.getChainID();
    const lazyMinter = new LazyUDAOCertMinter({
      contract: contractUDAOCertificate,
      signer: backend,
    });
    const voucher = await lazyMinter.createVoucher(
      1,
      "ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi",
      contentBuyer.address,
      "Content Name",
      "Content Description"
    );
    await expect(contractUDAOCertificate.connect(contentBuyer).redeem(voucher))
      .to.emit(contractUDAOCertificate, "Transfer") // transfer from null address to minter
      .withArgs("0x0000000000000000000000000000000000000000", contentBuyer.address, voucher.tokenId);
    expect(await contractUDAOCertificate.tokenURI(1)).to.eql(
      "ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi"
    );
  });

  it("Should emergency transfer certificate if backend", async function () {
    await reDeploy();
    await contractRoleManager.setKYC(contentCreator.address, true);
    await contractRoleManager.setKYC(contentBuyer.address, true);

    const tx = await contractUDAOCertificate.getChainID();
    const lazyMinter = new LazyUDAOCertMinter({
      contract: contractUDAOCertificate,
      signer: backend,
    });
    const voucher = await lazyMinter.createVoucher(
      1,
      "ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi",
      contentCreator.address,
      "Content Name",
      "Content Description"
    );
    await expect(contractUDAOCertificate.connect(contentCreator).redeem(voucher))
      .to.emit(contractUDAOCertificate, "Transfer") // transfer from null address to minter
      .withArgs("0x0000000000000000000000000000000000000000", contentCreator.address, voucher.tokenId);
    await expect(
      contractUDAOCertificate.connect(backend).emergencyTransfer(contentCreator.address, contentBuyer.address, 1)
    )
      .to.emit(contractUDAOCertificate, "Transfer") // transfer from null address to minter
      .withArgs(contentCreator.address, contentBuyer.address, voucher.tokenId);
  });

  it("Should backend fail to transfer if receiver is not KYCed", async function () {
    await reDeploy();
    await contractRoleManager.setKYC(contentCreator.address, true);
    await contractRoleManager.setKYC(contentBuyer.address, true);

    const tx = await contractUDAOCertificate.getChainID();
    const lazyMinter = new LazyUDAOCertMinter({
      contract: contractUDAOCertificate,
      signer: backend,
    });
    const voucher = await lazyMinter.createVoucher(
      1,
      "ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi",
      contentCreator.address,
      "Content Name",
      "Content Description"
    );

    await expect(contractUDAOCertificate.connect(contentCreator).redeem(voucher))
      .to.emit(contractUDAOCertificate, "Transfer") // transfer from null address to minter
      .withArgs("0x0000000000000000000000000000000000000000", contentCreator.address, voucher.tokenId);

    await contractRoleManager.setKYC(contentBuyer.address, false);
    await expect(
      contractUDAOCertificate.connect(backend).emergencyTransfer(contentCreator.address, contentBuyer.address, 1)
    ).to.be.revertedWith("Receiver is not KYCed");
  });

  it("Should backend fail to transfer if receiver is banned", async function () {
    await reDeploy();
    await contractRoleManager.setKYC(contentCreator.address, true);
    await contractRoleManager.setKYC(contentBuyer.address, true);

    const tx = await contractUDAOCertificate.getChainID();
    const lazyMinter = new LazyUDAOCertMinter({
      contract: contractUDAOCertificate,
      signer: backend,
    });
    const voucher = await lazyMinter.createVoucher(
      1,
      "ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi",
      contentCreator.address,
      "Content Name",
      "Content Description"
    );

    await expect(contractUDAOCertificate.connect(contentCreator).redeem(voucher))
      .to.emit(contractUDAOCertificate, "Transfer") // transfer from null address to minter
      .withArgs("0x0000000000000000000000000000000000000000", contentCreator.address, voucher.tokenId);

    await contractRoleManager.setBan(contentBuyer.address, true);
    await expect(
      contractUDAOCertificate.connect(backend).emergencyTransfer(contentCreator.address, contentBuyer.address, 1)
    ).to.be.revertedWith("Receiver is banned");
  });

  it("Should fail emergency transfer certificate if not backend", async function () {
    await reDeploy();
    await contractRoleManager.setKYC(contentCreator.address, true);
    await contractRoleManager.setKYC(contentBuyer.address, true);

    const tx = await contractUDAOCertificate.getChainID();
    const lazyMinter = new LazyUDAOCertMinter({
      contract: contractUDAOCertificate,
      signer: backend,
    });
    const voucher = await lazyMinter.createVoucher(
      1,
      "ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi",
      contentCreator.address,
      "Content Name",
      "Content Description"
    );
    await expect(contractUDAOCertificate.connect(contentCreator).redeem(voucher))
      .to.emit(contractUDAOCertificate, "Transfer") // transfer from null address to minter
      .withArgs("0x0000000000000000000000000000000000000000", contentCreator.address, voucher.tokenId);
    await expect(
      contractUDAOCertificate.connect(foundation).emergencyTransfer(contentCreator.address, contentBuyer.address, 1)
    ).to.revertedWith("You don't have right to transfer token");
  });

  it("Should fail transfer certificate if not backend", async function () {
    await reDeploy();
    await contractRoleManager.setKYC(contentCreator.address, true);
    await contractRoleManager.setKYC(contentBuyer.address, true);

    const tx = await contractUDAOCertificate.getChainID();
    const lazyMinter = new LazyUDAOCertMinter({
      contract: contractUDAOCertificate,
      signer: backend,
    });
    const voucher = await lazyMinter.createVoucher(
      1,
      "ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi",
      contentCreator.address,
      "Content Name",
      "Content Description"
    );
    await expect(contractUDAOCertificate.connect(contentCreator).redeem(voucher))
      .to.emit(contractUDAOCertificate, "Transfer") // transfer from null address to minter
      .withArgs("0x0000000000000000000000000000000000000000", contentCreator.address, voucher.tokenId);
    await expect(
      contractUDAOCertificate.connect(contentCreator).transferFrom(contentCreator.address, contentBuyer.address, 1)
    ).to.revertedWith("You don't have right to transfer token");
  });

  it("Should burn certificate if owner", async function () {
    await reDeploy();
    await contractRoleManager.setKYC(contentCreator.address, true);
    await contractRoleManager.setKYC(contentBuyer.address, true);

    const tx = await contractUDAOCertificate.getChainID();
    const lazyMinter = new LazyUDAOCertMinter({
      contract: contractUDAOCertificate,
      signer: backend,
    });
    const voucher = await lazyMinter.createVoucher(
      1,
      "ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi",
      contentCreator.address,
      "Content Name",
      "Content Description"
    );
    await expect(contractUDAOCertificate.connect(contentCreator).redeem(voucher))
      .to.emit(contractUDAOCertificate, "Transfer") // transfer from null address to minter
      .withArgs("0x0000000000000000000000000000000000000000", contentCreator.address, voucher.tokenId);
    await expect(contractUDAOCertificate.connect(contentCreator).burn(1))
      .to.emit(contractUDAOCertificate, "Transfer") // transfer from null address to minter
      .withArgs(contentCreator.address, "0x0000000000000000000000000000000000000000", voucher.tokenId);
  });

  it("Should fail burning certificate if not owner", async function () {
    await reDeploy();
    await contractRoleManager.setKYC(contentCreator.address, true);
    await contractRoleManager.setKYC(contentBuyer.address, true);

    const tx = await contractUDAOCertificate.getChainID();
    const lazyMinter = new LazyUDAOCertMinter({
      contract: contractUDAOCertificate,
      signer: backend,
    });
    const voucher = await lazyMinter.createVoucher(
      1,
      "ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi",
      contentCreator.address,
      "Content Name",
      "Content Description"
    );
    await expect(contractUDAOCertificate.connect(contentCreator).redeem(voucher))
      .to.emit(contractUDAOCertificate, "Transfer") // transfer from null address to minter
      .withArgs("0x0000000000000000000000000000000000000000", contentCreator.address, voucher.tokenId);
    await expect(contractUDAOCertificate.connect(contentBuyer).burn(1)).to.revertedWith(
      "You are not the owner of the token"
    );
  });

  it("Should fail to create certificate when the user hasn't kyced", async function () {
    await reDeploy();
    await contractRoleManager.setKYC(contentBuyer.address, false);

    const tx = await contractUDAOCertificate.getChainID();
    const lazyMinter = new LazyUDAOCertMinter({
      contract: contractUDAOCertificate,
      signer: backend,
    });
    const voucher = await lazyMinter.createVoucher(
      1,
      "ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi",
      contentBuyer.address,
      "Content Name",
      "Content Description"
    );
    await expect(contractUDAOCertificate.connect(contentBuyer).redeem(voucher)).to.revertedWith("You are not KYCed");
  });

  it("Should fail to create certificate when paused", async function () {
    await reDeploy();
    await contractRoleManager.setKYC(contentBuyer.address, false);

    const tx = await contractUDAOCertificate.getChainID();
    const lazyMinter = new LazyUDAOCertMinter({
      contract: contractUDAOCertificate,
      signer: backend,
    });
    const voucher = await lazyMinter.createVoucher(
      1,
      "ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi",
      contentBuyer.address,
      "Content Name",
      "Content Description"
    );

    await expect(contractUDAOCertificate.pause());

    await expect(contractUDAOCertificate.connect(contentBuyer).redeem(voucher)).to.revertedWith("Pausable: paused");
  });

  it("Should able to create certificate when unpaused", async function () {
    await reDeploy();
    await contractRoleManager.setKYC(contentBuyer.address, true);

    const tx = await contractUDAOCertificate.getChainID();
    const lazyMinter = new LazyUDAOCertMinter({
      contract: contractUDAOCertificate,
      signer: backend,
    });
    const voucher = await lazyMinter.createVoucher(
      1,
      "ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi",
      contentBuyer.address,
      "Content Name",
      "Content Description"
    );

    await expect(contractUDAOCertificate.pause());
    await expect(contractUDAOCertificate.unpause());

    await expect(contractUDAOCertificate.connect(contentBuyer).redeem(voucher)).to.emit(
      contractUDAOCertificate,
      "Transfer"
    );
  });

  it("Should fail to pause if not backend", async function () {
    await reDeploy();
    await expect(contractUDAOCertificate.connect(contentBuyer1).pause()).to.revertedWith("Only backend can pause");
  });

  it("Should fail to unpause if not backend", async function () {
    await reDeploy();
    await expect(contractUDAOCertificate.connect(backend).pause());

    await expect(contractUDAOCertificate.connect(contentBuyer1).unpause()).to.revertedWith("Only backend can unpause");
  });
});
