const { expect } = require("chai");
const hardhat = require("hardhat");
const { ethers } = hardhat;
const chai = require("chai");
const BN = require("bn.js");
const helpers = require("@nomicfoundation/hardhat-network-helpers");
const { LazyRole } = require("../lib/LazyRole");
const { deploy } = require("../lib/deployments");
const { Redeem } = require("../lib/Redeem");

require("dotenv").config();

const TEST_VERSION = process.env.TEST_VERSION;

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
  if (reApplyRolesViaVoucher) {
    for (let i = 0; i < reApplyValidatorRoles.length; i++) {
      await contractRoleManager.revokeRole(VALIDATOR_ROLE, reApplyValidatorRoles[i].address);
    }
    for (let i = 0; i < reApplyJurorRoles.length; i++) {
      await contractRoleManager.revokeRole(JUROR_ROLE, reApplyJurorRoles[i].address);
    }
    for (let i = 0; i < reApplyValidatorRoles.length; i++) {
      await grantValidatorRole(
        reApplyValidatorRoles[i],
        contractRoleManager,
        contractUDAO,
        contractUDAOStaker,
        backend
      );
    }
    for (let i = 0; i < reApplyJurorRoles.length; i++) {
      await grantJurorRole(reApplyJurorRoles[i], contractRoleManager, contractUDAO, contractUDAOStaker, backend);
    }
  }
}
async function grantValidatorRole(account, contractRoleManager, contractUDAO, contractUDAOStaker, backend) {
  await contractRoleManager.setKYC(account.address, true);
  await contractUDAO.transfer(account.address, ethers.utils.parseEther("100.0"));
  await contractUDAO.connect(account).approve(contractUDAOStaker.address, ethers.utils.parseEther("999999999999.0"));

  // Staking
  await contractUDAOStaker.connect(account).stakeForGovernance(ethers.utils.parseEther("10"), 30);
  await contractUDAOStaker.connect(account).applyForValidator();
  const lazyRole = new LazyRole({
    contract: contractUDAOStaker,
    signer: backend,
  });
  const role_voucher = await lazyRole.createVoucher(account.address, Date.now() + 999999999, 0);
  await contractUDAOStaker.connect(account).getApproved(role_voucher);
}

async function grantJurorRole(account, contractRoleManager, contractUDAO, contractUDAOStaker, backend) {
  await contractRoleManager.setKYC(account.address, true);
  await contractUDAO.transfer(account.address, ethers.utils.parseEther("100.0"));

  await contractUDAO.connect(account).approve(contractUDAOStaker.address, ethers.utils.parseEther("999999999999.0"));

  // Staking

  await contractUDAOStaker.connect(account).stakeForGovernance(ethers.utils.parseEther("10"), 30);
  await contractUDAOStaker.connect(account).applyForJuror();
  const lazyRole = new LazyRole({
    contract: contractUDAOStaker,
    signer: backend,
  });
  const role_voucher = await lazyRole.createVoucher(account.address, Date.now() + 999999999, 1);
  await contractUDAOStaker.connect(account).getApproved(role_voucher);
}
async function createContentVoucher(
  contractUDAOContent,
  backend,
  contentCreator,
  contentPrice,
  partPrices,
  redeemType = 1,
  validationScore = 1
) {
  // Get the current block timestamp
  const block = await ethers.provider.getBlock("latest");
  // add some minutes to it and convert it to a BigNumber
  const futureBlock = block.timestamp + 1000;
  // convert it to a BigNumber
  const futureBlockBigNumber = ethers.BigNumber.from(futureBlock);

  return await new Redeem({
    contract: contractUDAOContent,
    signer: backend,
  }).createVoucher(
    futureBlockBigNumber,
    contentPrice,
    partPrices,
    0,
    "ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi",
    contentCreator.address,
    redeemType,
    validationScore
  );
}

// Enable and inject BN dependency
chai.use(require("chai-bn")(BN));

describe("UDAOC Contract", function () {
  it("Should deploy", async function () {
    await reDeploy();
  });

  it("Should KYC Content Creator", async function () {
    await reDeploy();
    await expect(contractRoleManager.setKYC(contentCreator.address, true))
      .to.emit(contractRoleManager, "SetKYC") // transfer from null address to minter
      .withArgs(contentCreator.address, true);
    await expect(contractRoleManager.setKYC(contentCreator.address, false))
      .to.emit(contractRoleManager, "SetKYC") // transfer from null address to minter
      .withArgs(contentCreator.address, false);
  });
  it("Should ban Content Creator", async function () {
    await reDeploy();
    await expect(contractRoleManager.setBan(contentCreator.address, true))
      .to.emit(contractRoleManager, "SetBan") // transfer from null address to minter
      .withArgs(contentCreator.address, true);
    await expect(contractRoleManager.setBan(contentCreator.address, true))
      .to.emit(contractRoleManager, "SetBan") // transfer from null address to minter
      .withArgs(contentCreator.address, true);
  });

  it("Should create Content", async function () {
    await reDeploy();
    await contractRoleManager.setKYC(contentCreator.address, true);

    /// part prices must be determined before creating content
    const partPricesArray = [ethers.utils.parseEther("1"), ethers.utils.parseEther("1")];
    const contentPrice = ethers.utils.parseEther("2");
    /// Create Voucher from redeem.js and use it for creating content

    const createContentVoucherSample = await createContentVoucher(
      contractUDAOContent,
      backend,
      contentCreator,
      contentPrice,
      partPricesArray,
      (redeemType = 1),
      (validationScore = 1)
    );
    await expect(contractUDAOContent.connect(contentCreator).createContent(createContentVoucherSample))
      .to.emit(contractUDAOContent, "Transfer") // transfer from null address to minter
      .withArgs("0x0000000000000000000000000000000000000000", contentCreator.address, 0);
  });

  it("Should fail to create Content if wrong redeemer", async function () {
    await reDeploy();
    await contractRoleManager.setKYC(contentCreator.address, true);
    /// part prices must be determined before creating content
    const partPricesArray = [ethers.utils.parseEther("1"), ethers.utils.parseEther("1")];
    const contentPrice = ethers.utils.parseEther("2");

    /// Create Voucher from redeem.js and use it for creating content
    const createContentVoucherSample = await createContentVoucher(
      contractUDAOContent,
      backend,
      contentCreator,
      contentPrice,
      partPricesArray,
      (redeemType = 1),
      (validationScore = 1)
    );
    await expect(contractUDAOContent.connect(contentBuyer).createContent(createContentVoucherSample)).to.revertedWith(
      "You are not the redeemer"
    );
  });

  it("Should get token URI of the Content", async function () {
    await reDeploy();
    await contractRoleManager.setKYC(contentCreator.address, true);

    /// part prices must be determined before creating content
    const partPricesArray = [ethers.utils.parseEther("1"), ethers.utils.parseEther("1")];
    const contentPrice = ethers.utils.parseEther("2");
    /// Create Voucher from redeem.js and use it for creating content
    const createContentVoucherSample = await createContentVoucher(
      contractUDAOContent,
      backend,
      contentCreator,
      contentPrice,
      partPricesArray,
      (redeemType = 1),
      (validationScore = 1)
    );

    await expect(contractUDAOContent.connect(contentCreator).createContent(createContentVoucherSample))
      .to.emit(contractUDAOContent, "Transfer") // transfer from null address to minter
      .withArgs("0x0000000000000000000000000000000000000000", contentCreator.address, 0);
    expect(await contractUDAOContent.tokenURI(0)).to.eql(
      "ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi"
    );
  });

  it("Should transfer token", async function () {
    await reDeploy();
    await contractRoleManager.setKYC(contentCreator.address, true);
    await contractRoleManager.setKYC(contentBuyer.address, true);

    /// part prices must be determined before creating content
    const partPricesArray = [ethers.utils.parseEther("1"), ethers.utils.parseEther("1")];
    const contentPrice = ethers.utils.parseEther("2");
    /// Create Voucher from redeem.js and use it for creating content
    const createContentVoucherSample = await createContentVoucher(
      contractUDAOContent,
      backend,
      contentCreator,
      contentPrice,
      partPricesArray,
      (redeemType = 1),
      (validationScore = 1)
    );

    await expect(contractUDAOContent.connect(contentCreator).createContent(createContentVoucherSample))
      .to.emit(contractUDAOContent, "Transfer") // transfer from null address to minter
      .withArgs("0x0000000000000000000000000000000000000000", contentCreator.address, 0);
    await expect(
      contractUDAOContent.connect(contentCreator).transferFrom(contentCreator.address, contentBuyer.address, 0)
    )
      .to.emit(contractUDAOContent, "Transfer") // transfer from null address to minter
      .withArgs(contentCreator.address, contentBuyer.address, 0);
  });

  it("Should fail to transfer token if sender is not KYCed", async function () {
    await reDeploy();
    await contractRoleManager.setKYC(contentCreator.address, true);
    await contractRoleManager.setKYC(contentBuyer.address, true);

    /// part prices must be determined before creating content
    const partPricesArray = [ethers.utils.parseEther("1"), ethers.utils.parseEther("1")];
    const contentPrice = ethers.utils.parseEther("2");
    /// Create Voucher from redeem.js and use it for creating content
    const createContentVoucherSample = await createContentVoucher(
      contractUDAOContent,
      backend,
      contentCreator,
      contentPrice,
      partPricesArray,
      (redeemType = 1),
      (validationScore = 1)
    );

    await expect(contractUDAOContent.connect(contentCreator).createContent(createContentVoucherSample))
      .to.emit(contractUDAOContent, "Transfer") // transfer from null address to minter
      .withArgs("0x0000000000000000000000000000000000000000", contentCreator.address, 0);
    await contractRoleManager.setKYC(contentCreator.address, false);

    await expect(
      contractUDAOContent.connect(contentCreator).transferFrom(contentCreator.address, contentBuyer.address, 0)
    ).to.revertedWith("Sender is not KYCed!");
  });

  it("Should fail to transfer token if sender is banned", async function () {
    await reDeploy();

    await contractRoleManager.setKYC(contentCreator.address, true);
    await contractRoleManager.setKYC(contentBuyer.address, true);

    /// part prices must be determined before creating content
    const partPricesArray = [ethers.utils.parseEther("1"), ethers.utils.parseEther("1")];
    const contentPrice = ethers.utils.parseEther("2");
    /// Create Voucher from redeem.js and use it for creating content
    const createContentVoucherSample = await createContentVoucher(
      contractUDAOContent,
      backend,
      contentCreator,
      contentPrice,
      partPricesArray,
      (redeemType = 1),
      (validationScore = 1)
    );

    await expect(contractUDAOContent.connect(contentCreator).createContent(createContentVoucherSample))
      .to.emit(contractUDAOContent, "Transfer") // transfer from null address to minter
      .withArgs("0x0000000000000000000000000000000000000000", contentCreator.address, 0);

    await contractRoleManager.setBan(contentCreator.address, true);
    await expect(
      contractUDAOContent.connect(contentCreator).transferFrom(contentCreator.address, contentBuyer.address, 0)
    ).to.revertedWith("Sender is banned!");
  });

  it("Should fail to transfer token if receiver is banned", async function () {
    await reDeploy();

    await contractRoleManager.setKYC(contentCreator.address, true);
    await contractRoleManager.setKYC(contentBuyer.address, true);
    await contractRoleManager.setBan(contentBuyer.address, true);

    /// part prices must be determined before creating content
    const partPricesArray = [ethers.utils.parseEther("1"), ethers.utils.parseEther("1")];
    const contentPrice = ethers.utils.parseEther("2");
    /// Create Voucher from redeem.js and use it for creating content
    const createContentVoucherSample = await createContentVoucher(
      contractUDAOContent,
      backend,
      contentCreator,
      contentPrice,
      partPricesArray,
      (redeemType = 1),
      (validationScore = 1)
    );

    await expect(contractUDAOContent.connect(contentCreator).createContent(createContentVoucherSample))
      .to.emit(contractUDAOContent, "Transfer") // transfer from null address to minter
      .withArgs("0x0000000000000000000000000000000000000000", contentCreator.address, 0);
    await expect(
      contractUDAOContent.connect(contentCreator).transferFrom(contentCreator.address, contentBuyer.address, 0)
    ).to.revertedWith("Receiver is banned!");
  });

  it("Should fail to transfer token if sender is not KYCed", async function () {
    await reDeploy();

    await contractRoleManager.setKYC(contentCreator.address, true);
    await contractRoleManager.setKYC(contentBuyer.address, true);

    /// part prices must be determined before creating content
    const partPricesArray = [ethers.utils.parseEther("1"), ethers.utils.parseEther("1")];
    const contentPrice = ethers.utils.parseEther("2");
    /// Create Voucher from redeem.js and use it for creating content
    const createContentVoucherSample = await createContentVoucher(
      contractUDAOContent,
      backend,
      contentCreator,
      contentPrice,
      partPricesArray,
      (redeemType = 1),
      (validationScore = 1)
    );

    await expect(contractUDAOContent.connect(contentCreator).createContent(createContentVoucherSample))
      .to.emit(contractUDAOContent, "Transfer") // transfer from null address to minter
      .withArgs("0x0000000000000000000000000000000000000000", contentCreator.address, 0);
    await contractRoleManager.setKYC(contentCreator.address, false);

    await expect(
      contractUDAOContent.connect(contentCreator).transferFrom(contentCreator.address, contentBuyer.address, 0)
    ).to.revertedWith("Sender is not KYCed!");
  });

  it("Should fail to burn token with TypeError since there is no burn function", async function () {
    await reDeploy();
    await contractRoleManager.setKYC(contentCreator.address, true);
    await contractRoleManager.setKYC(contentBuyer.address, true);

    /// part prices must be determined before creating content
    const partPricesArray = [ethers.utils.parseEther("1"), ethers.utils.parseEther("1")];
    const contentPrice = ethers.utils.parseEther("2");
    /// Create Voucher from redeem.js and use it for creating content
    const createContentVoucherSample = await createContentVoucher(
      contractUDAOContent,
      backend,
      contentCreator,
      contentPrice,
      partPricesArray,
      (redeemType = 1),
      (validationScore = 1)
    );

    await expect(contractUDAOContent.connect(contentCreator).createContent(createContentVoucherSample))
      .to.emit(contractUDAOContent, "Transfer") // transfer from null address to minter
      .withArgs("0x0000000000000000000000000000000000000000", contentCreator.address, 0);
    //await expect(contractUDAOContent.connect(contentCreator).burn(0)).to.be.revertedWithPanic();
    //  "TypeError: contractUDAOContent.connect().burn is not a function"
    //);

    try {
      await contractUDAOContent.connect(contentCreator).burn(0);
    } catch (error) {
      expect(error);
    }
  });

  it("Should return true if supports ERC721 interface", async function () {
    await reDeploy();
    await contractRoleManager.setKYC(contentCreator.address, true);
    await contractRoleManager.setKYC(contentBuyer.address, true);

    expect(await contractUDAOContent.supportsInterface("0x80ac58cd")).to.eql(true);
  });

  it("Should modify content, add a new part in between existing parts", async function () {
    await reDeploy();
    await contractRoleManager.setKYC(contentCreator.address, true);

    /// part prices must be determined before creating content
    const partPricesArray = [ethers.utils.parseEther("1"), ethers.utils.parseEther("2"), ethers.utils.parseEther("3")];
    const contentPrice = ethers.utils.parseEther("10");
    /// Create Voucher from redeem.js and use it for creating content
    const createContentVoucherSample = await createContentVoucher(
      contractUDAOContent,
      backend,
      contentCreator,
      contentPrice,
      partPricesArray,
      (redeemType = 1),
      (validationScore = 1)
    );

    await expect(contractUDAOContent.connect(contentCreator).createContent(createContentVoucherSample))
      .to.emit(contractUDAOContent, "Transfer") // transfer from null address to min
      .withArgs("0x0000000000000000000000000000000000000000", contentCreator.address, 0);

    // new part information
    const tokenId = 0;
    const _NewPartPricesArray = [
      ethers.utils.parseEther("1"),
      ethers.utils.parseEther("2"),
      ethers.utils.parseEther("4"),
      ethers.utils.parseEther("3"),
    ];

    /// Create Voucher from redeem.js and use it for modifying content
    const createModifyVoucherSample = await createContentVoucher(
      contractUDAOContent,
      backend,
      contentCreator,
      contentPrice,
      _NewPartPricesArray,
      (redeemType = 2),
      (validationScore = 0)
    );

    // add new part and expect newPartAdded event to emit
    await expect(contractUDAOContent.connect(contentCreator).modifyContent(createModifyVoucherSample));
    // epxpect previous parts to be shifted
    const returnedPartPrice0 = await contractUDAOContent.getContentPartPrice(tokenId, 0);
    const returnedPartPrice1 = await contractUDAOContent.getContentPartPrice(tokenId, 1);
    const returnedPartPrice2 = await contractUDAOContent.getContentPartPrice(tokenId, 2);
    const returnedPartPrice3 = await contractUDAOContent.getContentPartPrice(tokenId, 3);

    expect(returnedPartPrice0).to.equal(_NewPartPricesArray[0]);
    expect(returnedPartPrice1).to.equal(_NewPartPricesArray[1]);
    expect(returnedPartPrice2).to.equal(_NewPartPricesArray[2]);
    expect(returnedPartPrice3).to.equal(_NewPartPricesArray[3]);
  });

  it("Should revert modify content if caller is not owner of content", async function () {
    await reDeploy();
    await contractRoleManager.setKYC(contentCreator.address, true);
    await contractRoleManager.setKYC(contentBuyer.address, true);

    /// part prices must be determined before creating content
    const partPricesArray = [ethers.utils.parseEther("1"), ethers.utils.parseEther("2"), ethers.utils.parseEther("3")];
    const contentPrice = ethers.utils.parseEther("10");

    /// Create Voucher from redeem.js and use it for creating content
    const createContentVoucherSample = await createContentVoucher(
      contractUDAOContent,
      backend,
      contentCreator,
      contentPrice,
      partPricesArray,
      (redeemType = 1),
      (validationScore = 1)
    );

    await expect(contractUDAOContent.connect(contentCreator).createContent(createContentVoucherSample))
      .to.emit(contractUDAOContent, "Transfer") // transfer from null address to min
      .withArgs("0x0000000000000000000000000000000000000000", contentCreator.address, 0);

    // new part information
    const tokenId = 0;
    const _NewContentPrice = ethers.utils.parseEther("20");
    const _NewPartPriceArray = [ethers.utils.parseEther("20")];

    /// Create Voucher from redeem.js and use it for modifying content
    const createModifyContentVoucherSample = await createContentVoucher(
      contractUDAOContent,
      backend,
      contentBuyer,
      _NewContentPrice,
      _NewPartPriceArray,
      (redeemType = 2),
      (validationScore = 0)
    );
    // modify content and expect it to revert
    await expect(
      contractUDAOContent.connect(contentBuyer).modifyContent(createModifyContentVoucherSample)
    ).to.be.revertedWith("You are not the owner of token");
  });

  it("Should revert if add new part caller is not kyced", async function () {
    const {
      backend,
      contentCreator,
      contentBuyer,
      contentBuyer1,
      contentBuyer2,
      contentBuyer3,
      validatorCandidate,
      validator,
      validator1,
      validator2,
      validator3,
      validator4,
      validator5,
      superValidatorCandidate,
      superValidator,
      foundation,
      governanceCandidate,
      governanceMember,
      jurorCandidate,
      jurorMember,
      jurorMember1,
      jurorMember2,
      jurorMember3,
      jurorMember4,
      corporation,
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
      GOVERNANCE_ROLE,
      BACKEND_ROLE,
      contractContractManager,
      account1,
      account2,
      account3,
      contractPriceGetter,
    } = await deploy(true);
    if (TEST_VERSION == 1) {
      this.skip();
    }
    await contractRoleManager.setKYC(contentCreator.address, true);
    /// part prices must be determined before creating content
    const partPricesArray = [ethers.utils.parseEther("1"), ethers.utils.parseEther("2"), ethers.utils.parseEther("3")];

    /// Create Voucher from redeem.js and use it for creating content
    const createContentVoucherSample = await createContentVoucher(
      contractUDAOContent,
      backend,
      contentCreator,
      partPricesArray,
      false,
      false
    );
    await expect(contractUDAOContent.connect(contentCreator).createContent(createContentVoucherSample))
      .to.emit(contractUDAOContent, "Transfer") // transfer from null address to
      .withArgs("0x0000000000000000000000000000000000000000", contentCreator.address, 0);

    // UnKYC content creator
    await contractRoleManager.setKYC(contentCreator.address, false);
    // Add KYC requirement and expect it to emit KYCRequirementForCreateContentChanged
    await expect(contractUDAOContent.connect(backend).setKYCRequirementForCreateContent(true))
      .to.emit(contractUDAOContent, "KYCRequirementForCreateContentChanged")
      .withArgs(true);
    // new part information
    const tokenId = 0;
    const newPartId = 1;
    const newPartPrice = ethers.utils.parseEther("20");
    // add new part and expect it to revert
    await expect(
      contractUDAOContent.connect(contentCreator).addNewPart(tokenId, newPartId, newPartPrice)
    ).to.be.revertedWith("You are not KYCed");
  });

  it("Should revert add new part if content creator gets banned", async function () {
    const {
      backend,
      contentCreator,
      contentBuyer,
      contentBuyer1,
      contentBuyer2,
      contentBuyer3,
      validatorCandidate,
      validator,
      validator1,
      validator2,
      validator3,
      validator4,
      validator5,
      superValidatorCandidate,
      superValidator,
      foundation,
      governanceCandidate,
      governanceMember,
      jurorCandidate,
      jurorMember,
      jurorMember1,
      jurorMember2,
      jurorMember3,
      jurorMember4,
      corporation,
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
      GOVERNANCE_ROLE,
      BACKEND_ROLE,
      contractContractManager,
      account1,
      account2,
      account3,
      contractPriceGetter,
    } = await deploy(true);
    if (TEST_VERSION == 1) {
      this.skip();
    }
    await contractRoleManager.setKYC(contentCreator.address, true);

    /// part prices must be determined before creating content
    const partPricesArray = [ethers.utils.parseEther("1"), ethers.utils.parseEther("2"), ethers.utils.parseEther("3")];

    /// Create Voucher from redeem.js and use it for creating content
    const createContentVoucherSample = await createContentVoucher(
      contractUDAOContent,
      backend,
      contentCreator,
      partPricesArray,
      false,
      false
    );

    await expect(contractUDAOContent.connect(contentCreator).createContent(createContentVoucherSample))
      .to.emit(contractUDAOContent, "Transfer") // transfer from null address
      .withArgs("0x0000000000000000000000000000000000000000", contentCreator.address, 0);

    // Ban content creator
    await contractRoleManager.setBan(contentCreator.address, true);
    // new part information
    const tokenId = 0;
    const newPartId = 1;
    const newPartPrice = ethers.utils.parseEther("20");
    // add new part and expect it to revert
    await expect(
      contractUDAOContent.connect(contentCreator).addNewPart(tokenId, newPartId, newPartPrice)
    ).to.be.revertedWith("You are banned");
  });
});
