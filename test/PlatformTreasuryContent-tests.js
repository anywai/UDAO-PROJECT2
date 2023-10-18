const { expect } = require("chai");
const hardhat = require("hardhat");
const { ethers } = hardhat;
const chai = require("chai");
const BN = require("bn.js");
const { DiscountedPurchase } = require("../lib/DiscountedPurchase");
const { LazyRole } = require("../lib/LazyRole");
const { RefundVoucher } = require("../lib/RefundVoucher");
const { Redeem } = require("../lib/Redeem");
const helpers = require("@nomicfoundation/hardhat-network-helpers");
const { deploy } = require("../lib/deployments");
const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");

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
  contractVoucherVerifier = replace.contractVoucherVerifier;
  GOVERNANCE_ROLE = replace.GOVERNANCE_ROLE;
  BACKEND_ROLE = replace.BACKEND_ROLE;
  contractContractManager = replace.contractContractManager;
  account1 = replace.account1;
  account2 = replace.account2;
  account3 = replace.account3;
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
async function runValidation(
  contractSupervision,
  backend,
  validator1,
  validator2,
  validator3,
  validator4,
  validator5,
  contentCreator,
  tokenId = 0,
  validationId = 1
) {
  await expect(contractSupervision.connect(validator1).assignValidation(validationId))
    .to.emit(contractSupervision, "ValidationAssigned")
    .withArgs(ethers.BigNumber.from(tokenId), ethers.BigNumber.from(validationId), validator1.address);
  await expect(contractSupervision.connect(validator2).assignValidation(validationId))
    .to.emit(contractSupervision, "ValidationAssigned")
    .withArgs(ethers.BigNumber.from(tokenId), ethers.BigNumber.from(validationId), validator2.address);
  await expect(contractSupervision.connect(validator3).assignValidation(validationId))
    .to.emit(contractSupervision, "ValidationAssigned")
    .withArgs(ethers.BigNumber.from(tokenId), ethers.BigNumber.from(validationId), validator3.address);
  await expect(contractSupervision.connect(validator4).assignValidation(validationId))
    .to.emit(contractSupervision, "ValidationAssigned")
    .withArgs(ethers.BigNumber.from(tokenId), ethers.BigNumber.from(validationId), validator4.address);
  await expect(contractSupervision.connect(validator5).assignValidation(validationId))
    .to.emit(contractSupervision, "ValidationAssigned")
    .withArgs(ethers.BigNumber.from(tokenId), ethers.BigNumber.from(validationId), validator5.address);

  await expect(contractSupervision.connect(validator1).sendValidation(validationId, true))
    .to.emit(contractSupervision, "ValidationResultSent")
    .withArgs(ethers.BigNumber.from(tokenId), ethers.BigNumber.from(validationId), validator1.address, true);
  await expect(contractSupervision.connect(validator2).sendValidation(validationId, true))
    .to.emit(contractSupervision, "ValidationResultSent")
    .withArgs(ethers.BigNumber.from(tokenId), ethers.BigNumber.from(validationId), validator2.address, true);
  await expect(contractSupervision.connect(validator3).sendValidation(validationId, true))
    .to.emit(contractSupervision, "ValidationResultSent")
    .withArgs(ethers.BigNumber.from(tokenId), ethers.BigNumber.from(validationId), validator3.address, true);
  await expect(contractSupervision.connect(validator4).sendValidation(validationId, true))
    .to.emit(contractSupervision, "ValidationResultSent")
    .withArgs(ethers.BigNumber.from(tokenId), ethers.BigNumber.from(validationId), validator4.address, true);
  await expect(contractSupervision.connect(validator5).sendValidation(validationId, false))
    .to.emit(contractSupervision, "ValidationResultSent")
    .withArgs(ethers.BigNumber.from(tokenId), ethers.BigNumber.from(validationId), validator5.address, false);
  await expect(contractSupervision.connect(contentCreator).finalizeValidation(validationId))
    .to.emit(contractSupervision, "ValidationEnded")
    .withArgs(ethers.BigNumber.from(tokenId), ethers.BigNumber.from(validationId), true);
}

async function createContentVoucher(
  contractUDAOContent,
  backend,
  contentCreator,
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
    partPrices,
    0,
    "ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi",
    contentCreator.address,
    redeemType,
    validationScore
  );
}

describe("Platform Treasury Contract - Content", function () {
  it("Should get updated address of the validation manager", async function () {
    await reDeploy();
    await contractContractManager
      .connect(backend)
      .setAddressISupVisAddress("0x5B38Da6a701c568545dCfcB03FcB875f56beddC4");
    // Get updated address
    await expect(contractPlatformTreasury.connect(backend).updateAddresses())
      .to.emit(contractPlatformTreasury, "AddressesUpdated")
      .withArgs(anyValue, anyValue, "0x5B38Da6a701c568545dCfcB03FcB875f56beddC4", anyValue);
    await contractContractManager.connect(backend).setAddressISupVisAddress(contractSupervision.address);
    // Get updated address
    await expect(contractPlatformTreasury.connect(backend).updateAddresses())
      .to.emit(contractPlatformTreasury, "AddressesUpdated")
      .withArgs(anyValue, anyValue, contractSupervision.address, anyValue);
  });

  it("Should fail to set validation manager if not FOUNDATION", async function () {
    await reDeploy();

    await expect(contractPlatformTreasury.connect(foundation).updateAddresses()).to.revertedWith(
      "Only backend can update addresses"
    );
  });
  //!!Bu dünkü test
  it("Should a user able to buy the full content", async function () {
    await reDeploy();
    /// Set KYC
    await contractRoleManager.setKYC(contentCreator.address, true);
    await contractRoleManager.setKYC(contentBuyer.address, true);
    /// part prices must be determined before creating content
    const partPricesArray = [ethers.utils.parseEther("1"), ethers.utils.parseEther("1")];
    /// Create Voucher from redeem.js and use it for creating content
    const createContentVoucherSample = await createContentVoucher(
      contractUDAOContent,
      backend,
      contentCreator,
      partPricesArray
    );
    /// Create content
    await expect(contractUDAOContent.connect(contentCreator).createContent(createContentVoucherSample))
      .to.emit(contractUDAOContent, "Transfer") // transfer from null address to minter
      .withArgs("0x0000000000000000000000000000000000000000", contentCreator.address, 0);
    /// Start validation and finalize it
    await runValidation(
      contractSupervision,
      backend,
      validator1,
      validator2,
      validator3,
      validator4,
      validator5,
      contentCreator
    );
    /// Send UDAO to the buyer's wallet
    await contractUDAO.transfer(contentBuyer.address, ethers.utils.parseEther("100.0"));
    /// Get current UDAO balance of the buyer
    const balanceBefore = await contractUDAO.balanceOf(contentBuyer.address);
    /// Content buyer needs to give approval to the platformtreasury
    await contractUDAO
      .connect(contentBuyer)
      .approve(contractPlatformTreasury.address, ethers.utils.parseEther("999999999999.0"));
    await contractPlatformTreasury.connect(contentBuyer).buyContent([0], [true], [[1]], [ethers.constants.AddressZero]);
    const result = await contractPlatformTreasury.connect(contentBuyer).getOwnedContent(contentBuyer.address);
    /// Get current UDAO balance of the buyer
    const balanceAfter = await contractUDAO.balanceOf(contentBuyer.address);
    /// Get tokenId 0 price with calculatePriceToPay function
    const priceToPay = await contractPlatformTreasury.calculatePriceToPay(0, true, [1]);
    
    /// Check if the buyer's balance is decreased

    const numArray = result.map((x) => x.map((y) => y.toNumber()));
    expect(numArray).to.eql([[0, 0]]);
  });

  it("Should a user able to buy parts of a content", async function () {
    await reDeploy();

    /// Set KYC
    await contractRoleManager.setKYC(contentCreator.address, true);
    await contractRoleManager.setKYC(contentBuyer.address, true);

    /// part prices must be determined before creating content
    const partPricesArray = [
      ethers.utils.parseEther("1"),
      ethers.utils.parseEther("1"),
      ethers.utils.parseEther("1"),
      ethers.utils.parseEther("1"),
    ];

    /// Create Voucher from redeem.js and use it for creating content
    const createContentVoucherSample = await createContentVoucher(
      contractUDAOContent,
      backend,
      contentCreator,
      partPricesArray
    );

    /// Create content
    await expect(contractUDAOContent.connect(contentCreator).createContent(createContentVoucherSample))
      .to.emit(contractUDAOContent, "Transfer") // transfer from null address to minter
      .withArgs("0x0000000000000000000000000000000000000000", contentCreator.address, 0);
    /// Start validation and finalize it
    await runValidation(
      contractSupervision,
      backend,
      validator1,
      validator2,
      validator3,
      validator4,
      validator5,
      contentCreator
    );

    /// Send UDAO to the buyer's wallet
    await contractUDAO.transfer(contentBuyer.address, ethers.utils.parseEther("100.0"));
    /// Content buyer needs to give approval to the platformtreasury
    await contractUDAO
      .connect(contentBuyer)
      .approve(contractPlatformTreasury.address, ethers.utils.parseEther("999999999999.0"));

    await contractPlatformTreasury.connect(contentBuyer).buyContent([0], [false], [[1, 2, 3]], [contentBuyer.address]);
    const result = await contractPlatformTreasury.connect(contentBuyer).getOwnedContent(contentBuyer.address);
    const numArray = result.map((x) => x.map((y) => y.toNumber()));
    expect(numArray).to.eql([
      [0, 1],
      [0, 2],
      [0, 3],
    ]);
  });
  //İkinci
  it("Should fail to buy a content part if content part already purchased", async function () {
    await reDeploy();

    /// Set KYC
    await contractRoleManager.setKYC(contentCreator.address, true);
    await contractRoleManager.setKYC(contentBuyer.address, true);

    /// part prices must be determined before creating content
    const partPricesArray = [
      ethers.utils.parseEther("1"),
      ethers.utils.parseEther("1"),
      ethers.utils.parseEther("1"),
      ethers.utils.parseEther("1"),
    ];

    /// Create Voucher from redeem.js and use it for creating content
    const createContentVoucherSample = await createContentVoucher(
      contractUDAOContent,
      backend,
      contentCreator,
      partPricesArray
    );

    /// create content
    await expect(contractUDAOContent.connect(contentCreator).createContent(createContentVoucherSample))
      .to.emit(contractUDAOContent, "Transfer") // transfer from null address to minter
      .withArgs("0x0000000000000000000000000000000000000000", contentCreator.address, 0);
    /// Start validation and finalize it
    await runValidation(
      contractSupervision,
      backend,
      validator1,
      validator2,
      validator3,
      validator4,
      validator5,
      contentCreator
    );

    /// Send UDAO to the buyer's wallet
    await contractUDAO.transfer(contentBuyer.address, ethers.utils.parseEther("100.0"));
    /// Content buyer needs to give approval to the platformtreasury
    await contractUDAO
      .connect(contentBuyer)
      .approve(contractPlatformTreasury.address, ethers.utils.parseEther("999999999999.0"));

    await contractPlatformTreasury.connect(contentBuyer).buyContent([0], [false], [[2]], [contentBuyer.address]);

    await expect(
      contractPlatformTreasury.connect(contentBuyer).buyContent([0], [false], [[2]], [contentBuyer.address])
    ).to.revertedWith("Content part is already bought");
  });

  it("Should fail to buy a content if content does not exists", async function () {
    await reDeploy();

    /// Set KYC
    await contractRoleManager.setKYC(contentCreator.address, true);
    await contractRoleManager.setKYC(contentBuyer.address, true);

    /// Content buyer needs to give approval to the platformtreasury
    await contractUDAO
      .connect(contentBuyer)
      .approve(contractPlatformTreasury.address, ethers.utils.parseEther("999999999999.0"));

    await expect(
      contractPlatformTreasury.connect(contentBuyer).buyContent([0], [true], [[1]], [ethers.constants.AddressZero])
    ).to.revertedWith("Content does not exist!");
  });

  it("Should fail to buy content if buyer is banned", async function () {
    await reDeploy();

    /// Set KYC
    await contractRoleManager.setKYC(contentCreator.address, true);
    await contractRoleManager.setKYC(contentBuyer.address, true);

    /// Set BAN
    await contractRoleManager.setBan(contentBuyer.address, true);

    /// part prices must be determined before creating content
    const partPricesArray = [ethers.utils.parseEther("1"), ethers.utils.parseEther("1")];

    /// Create voucher from redeem.js and use it for creating content
    const createContentVoucherSample = await createContentVoucher(
      contractUDAOContent,
      backend,
      contentCreator,
      partPricesArray
    );

    /// Create content
    await expect(contractUDAOContent.connect(contentCreator).createContent(createContentVoucherSample))
      .to.emit(contractUDAOContent, "Transfer") // transfer from null address to minter
      .withArgs("0x0000000000000000000000000000000000000000", contentCreator.address, 0);
    /// Start validation and finalize it
    await runValidation(
      contractSupervision,
      backend,
      validator1,
      validator2,
      validator3,
      validator4,
      validator5,
      contentCreator
    );

    /// Send UDAO to the buyer's wallet
    await contractUDAO.transfer(contentBuyer.address, ethers.utils.parseEther("100.0"));
    /// Content buyer needs to give approval to the platformtreasury
    await contractUDAO
      .connect(contentBuyer)
      .approve(contractPlatformTreasury.address, ethers.utils.parseEther("999999999999.0"));

    await expect(
      contractPlatformTreasury.connect(contentBuyer).buyContent([0], [true], [[1]], [ethers.constants.AddressZero])
    ).to.revertedWith("You are banned");
  });

  it("Should fail to buy content if instructer is banned", async function () {
    await reDeploy();

    /// Set KYC
    await contractRoleManager.setKYC(contentCreator.address, true);
    await contractRoleManager.setKYC(contentBuyer.address, true);

    /// part prices must be determined before creating content
    const partPricesArray = [ethers.utils.parseEther("1"), ethers.utils.parseEther("1")];

    /// Create voucher from redeem.js and use it for creating content
    const createContentVoucherSample = await createContentVoucher(
      contractUDAOContent,
      backend,
      contentCreator,
      partPricesArray
    );

    /// Create content
    await expect(contractUDAOContent.connect(contentCreator).createContent(createContentVoucherSample))
      .to.emit(contractUDAOContent, "Transfer") // transfer from null address to minter
      .withArgs("0x0000000000000000000000000000000000000000", contentCreator.address, 0);
    /// Start validation and finalize it
    await runValidation(
      contractSupervision,
      backend,
      validator1,
      validator2,
      validator3,
      validator4,
      validator5,
      contentCreator
    );

    /// Send UDAO to the buyer's wallet
    await contractUDAO.transfer(contentBuyer.address, ethers.utils.parseEther("100.0"));
    /// Content buyer needs to give approval to the platformtreasury
    await contractUDAO
      .connect(contentBuyer)
      .approve(contractPlatformTreasury.address, ethers.utils.parseEther("999999999999.0"));

    /// Set BAN
    await contractRoleManager.setBan(contentCreator.address, true);

    await expect(
      contractPlatformTreasury.connect(contentBuyer).buyContent([0], [true], [[1]], [ethers.constants.AddressZero])
    ).to.revertedWith("Instructor is banned");
  });

  it("Should fail to buy a content part if full content is already purchased", async function () {
    await reDeploy();

    /// Set KYC
    await contractRoleManager.setKYC(contentCreator.address, true);
    await contractRoleManager.setKYC(contentBuyer.address, true);

    /// part prices must be determined before creating content
    const partPricesArray = [
      ethers.utils.parseEther("1"),
      ethers.utils.parseEther("1"),
      ethers.utils.parseEther("1"),
      ethers.utils.parseEther("1"),
    ];

    ///Create Voucher from redeem.js and use it for creating content
    const createContentVoucherSample = await createContentVoucher(
      contractUDAOContent,
      backend,
      contentCreator,
      partPricesArray
    );

    /// Create content
    await expect(contractUDAOContent.connect(contentCreator).createContent(createContentVoucherSample))
      .to.emit(contractUDAOContent, "Transfer") // transfer from null address to minter
      .withArgs("0x0000000000000000000000000000000000000000", contentCreator.address, 0);
    /// Start validation and finalize it
    await runValidation(
      contractSupervision,
      backend,
      validator1,
      validator2,
      validator3,
      validator4,
      validator5,
      contentCreator
    );

    /// Send UDAO to the buyer's wallet
    await contractUDAO.transfer(contentBuyer.address, ethers.utils.parseEther("100.0"));
    /// Content buyer needs to give approval to the platformtreasury
    await contractUDAO
      .connect(contentBuyer)
      .approve(contractPlatformTreasury.address, ethers.utils.parseEther("999999999999.0"));

    await contractPlatformTreasury.connect(contentBuyer).buyContent([0], [true], [[1]], [ethers.constants.AddressZero]);

    await expect(
      contractPlatformTreasury.connect(contentBuyer).buyContent([0], [false], [[3]], [contentBuyer.address])
    ).to.revertedWith("Full content is already bought");
  });

  it("Should fail to buy a full content if fullContentPurchase is false", async function () {
    await reDeploy();

    /// Set KYC
    await contractRoleManager.setKYC(contentCreator.address, true);
    await contractRoleManager.setKYC(contentBuyer.address, true);

    /// part prices must be determined before creating content
    const partPricesArray = [
      ethers.utils.parseEther("1"),
      ethers.utils.parseEther("1"),
      ethers.utils.parseEther("1"),
      ethers.utils.parseEther("1"),
    ];

    ///Create Voucher from redeem.js and use it for creating content
    const createContentVoucherSample = await createContentVoucher(
      contractUDAOContent,
      backend,
      contentCreator,
      partPricesArray
    );

    /// Create content
    await expect(contractUDAOContent.connect(contentCreator).createContent(createContentVoucherSample))
      .to.emit(contractUDAOContent, "Transfer") // transfer from null address to minter
      .withArgs("0x0000000000000000000000000000000000000000", contentCreator.address, 0);
    await expect(contractSupervision.connect(validator1).assignValidation(1))
      .to.emit(contractSupervision, "ValidationAssigned")
      .withArgs(ethers.BigNumber.from(0), ethers.BigNumber.from(1), validator1.address);
    await expect(contractSupervision.connect(validator2).assignValidation(1))
      .to.emit(contractSupervision, "ValidationAssigned")
      .withArgs(ethers.BigNumber.from(0), ethers.BigNumber.from(1), validator2.address);
    await expect(contractSupervision.connect(validator3).assignValidation(1))
      .to.emit(contractSupervision, "ValidationAssigned")
      .withArgs(ethers.BigNumber.from(0), ethers.BigNumber.from(1), validator3.address);
    await expect(contractSupervision.connect(validator4).assignValidation(1))
      .to.emit(contractSupervision, "ValidationAssigned")
      .withArgs(ethers.BigNumber.from(0), ethers.BigNumber.from(1), validator4.address);
    await expect(contractSupervision.connect(validator5).assignValidation(1))
      .to.emit(contractSupervision, "ValidationAssigned")
      .withArgs(ethers.BigNumber.from(0), ethers.BigNumber.from(1), validator5.address);

    await expect(contractSupervision.connect(validator1).sendValidation(1, true))
      .to.emit(contractSupervision, "ValidationResultSent")
      .withArgs(ethers.BigNumber.from(0), ethers.BigNumber.from(1), validator1.address, true);
    await expect(contractSupervision.connect(validator2).sendValidation(1, true))
      .to.emit(contractSupervision, "ValidationResultSent")
      .withArgs(ethers.BigNumber.from(0), ethers.BigNumber.from(1), validator2.address, true);
    await expect(contractSupervision.connect(validator3).sendValidation(1, true))
      .to.emit(contractSupervision, "ValidationResultSent")
      .withArgs(ethers.BigNumber.from(0), ethers.BigNumber.from(1), validator3.address, true);
    await expect(contractSupervision.connect(validator4).sendValidation(1, false))
      .to.emit(contractSupervision, "ValidationResultSent")
      .withArgs(ethers.BigNumber.from(0), ethers.BigNumber.from(1), validator4.address, false);
    await expect(contractSupervision.connect(validator5).sendValidation(1, false))
      .to.emit(contractSupervision, "ValidationResultSent")
      .withArgs(ethers.BigNumber.from(0), ethers.BigNumber.from(1), validator5.address, false);
    await expect(contractSupervision.connect(contentCreator).finalizeValidation(1))
      .to.emit(contractSupervision, "ValidationEnded")
      .withArgs(ethers.BigNumber.from(0), ethers.BigNumber.from(1), true);

    /// Send UDAO to the buyer's wallet
    await contractUDAO.transfer(contentBuyer.address, ethers.utils.parseEther("100.0"));
    /// Content buyer needs to give approval to the platformtreasury
    await contractUDAO
      .connect(contentBuyer)
      .approve(contractPlatformTreasury.address, ethers.utils.parseEther("999999999999.0"));

    await expect(
      contractPlatformTreasury.connect(contentBuyer).buyContent([0], [false], [[0]], [ethers.constants.AddressZero])
    ).to.revertedWith("Purchased parts says 0, but fullContentPurchase is false!");
  });

  it("Should fail to buy a content part if the part does not exist", async function () {
    await reDeploy();

    /// Set KYC
    await contractRoleManager.setKYC(contentCreator.address, true);
    await contractRoleManager.setKYC(contentBuyer.address, true);

    /// part prices must be determined before creating content
    const partPricesArray = [
      ethers.utils.parseEther("1"),
      ethers.utils.parseEther("1"),
      ethers.utils.parseEther("1"),
      ethers.utils.parseEther("1"),
    ];

    ///Create Voucher from redeem.js and use it for creating content
    const createContentVoucherSample = await createContentVoucher(
      contractUDAOContent,
      backend,
      contentCreator,
      partPricesArray
    );

    /// Create content
    await expect(contractUDAOContent.connect(contentCreator).createContent(createContentVoucherSample))
      .to.emit(contractUDAOContent, "Transfer") // transfer from null address to minter
      .withArgs("0x0000000000000000000000000000000000000000", contentCreator.address, 0);
    await expect(contractSupervision.connect(validator1).assignValidation(1))
      .to.emit(contractSupervision, "ValidationAssigned")
      .withArgs(ethers.BigNumber.from(0), ethers.BigNumber.from(1), validator1.address);
    await expect(contractSupervision.connect(validator2).assignValidation(1))
      .to.emit(contractSupervision, "ValidationAssigned")
      .withArgs(ethers.BigNumber.from(0), ethers.BigNumber.from(1), validator2.address);
    await expect(contractSupervision.connect(validator3).assignValidation(1))
      .to.emit(contractSupervision, "ValidationAssigned")
      .withArgs(ethers.BigNumber.from(0), ethers.BigNumber.from(1), validator3.address);
    await expect(contractSupervision.connect(validator4).assignValidation(1))
      .to.emit(contractSupervision, "ValidationAssigned")
      .withArgs(ethers.BigNumber.from(0), ethers.BigNumber.from(1), validator4.address);
    await expect(contractSupervision.connect(validator5).assignValidation(1))
      .to.emit(contractSupervision, "ValidationAssigned")
      .withArgs(ethers.BigNumber.from(0), ethers.BigNumber.from(1), validator5.address);

    await expect(contractSupervision.connect(validator1).sendValidation(1, true))
      .to.emit(contractSupervision, "ValidationResultSent")
      .withArgs(ethers.BigNumber.from(0), ethers.BigNumber.from(1), validator1.address, true);
    await expect(contractSupervision.connect(validator2).sendValidation(1, true))
      .to.emit(contractSupervision, "ValidationResultSent")
      .withArgs(ethers.BigNumber.from(0), ethers.BigNumber.from(1), validator2.address, true);
    await expect(contractSupervision.connect(validator3).sendValidation(1, true))
      .to.emit(contractSupervision, "ValidationResultSent")
      .withArgs(ethers.BigNumber.from(0), ethers.BigNumber.from(1), validator3.address, true);
    await expect(contractSupervision.connect(validator4).sendValidation(1, false))
      .to.emit(contractSupervision, "ValidationResultSent")
      .withArgs(ethers.BigNumber.from(0), ethers.BigNumber.from(1), validator4.address, false);
    await expect(contractSupervision.connect(validator5).sendValidation(1, false))
      .to.emit(contractSupervision, "ValidationResultSent")
      .withArgs(ethers.BigNumber.from(0), ethers.BigNumber.from(1), validator5.address, false);
    await expect(contractSupervision.connect(contentCreator).finalizeValidation(1))
      .to.emit(contractSupervision, "ValidationEnded")
      .withArgs(ethers.BigNumber.from(0), ethers.BigNumber.from(1), true);

    /// Send UDAO to the buyer's wallet
    await contractUDAO.transfer(contentBuyer.address, ethers.utils.parseEther("100.0"));
    /// Content buyer needs to give approval to the platformtreasury
    await contractUDAO
      .connect(contentBuyer)
      .approve(contractPlatformTreasury.address, ethers.utils.parseEther("999999999999.0"));

    await expect(
      contractPlatformTreasury.connect(contentBuyer).buyContent([0], [false], [[20]], [ethers.constants.AddressZero])
    ).to.revertedWith("Part does not exist!");
  });

  it("Should buy the full content for someone else", async function () {
    await reDeploy();

    /// Set KYC
    await contractRoleManager.setKYC(contentCreator.address, true);
    await contractRoleManager.setKYC(contentBuyer.address, true);
    await contractRoleManager.setKYC(validator1.address, true);

    /// part prices must be determined before creating content
    const partPricesArray = [ethers.utils.parseEther("1"), ethers.utils.parseEther("1")];

    ///Create Voucher from redeem.js and use it for creating content
    const createContentVoucherSample = await createContentVoucher(
      contractUDAOContent,
      backend,
      contentCreator,
      partPricesArray
    );

    /// Create content
    await expect(contractUDAOContent.connect(contentCreator).createContent(createContentVoucherSample))
      .to.emit(contractUDAOContent, "Transfer") // transfer from null address to minter
      .withArgs("0x0000000000000000000000000000000000000000", contentCreator.address, 0);
    /// Start validation and finalize it
    await runValidation(
      contractSupervision,
      backend,
      validator1,
      validator2,
      validator3,
      validator4,
      validator5,
      contentCreator
    );

    /// Send UDAO to the buyer's wallet
    await contractUDAO.transfer(contentBuyer.address, ethers.utils.parseEther("100.0"));
    /// Content buyer needs to give approval to the platformtreasury
    await contractUDAO
      .connect(contentBuyer)
      .approve(contractPlatformTreasury.address, ethers.utils.parseEther("999999999999.0"));

    await contractPlatformTreasury.connect(contentBuyer).buyContent([0], [true], [[1]], [validator1.address]);
    const result = await contractPlatformTreasury.connect(contentBuyer).getOwnedContent(validator1.address);

    const numArray = result.map((x) => x.map((y) => y.toNumber()));
    expect(numArray).to.eql([[0, 0]]);
  });

  it("Should buy the part of the content for someone else", async function () {
    await reDeploy();

    /// Set KYC
    await contractRoleManager.setKYC(contentCreator.address, true);
    await contractRoleManager.setKYC(contentBuyer.address, true);
    await contractRoleManager.setKYC(validator1.address, true);

    /// part prices must be determined before creating content
    const partPricesArray = [ethers.utils.parseEther("1"), ethers.utils.parseEther("1"), ethers.utils.parseEther("1")];

    ///Create Voucher from redeem.js and use it for creating content
    const createContentVoucherSample = await createContentVoucher(
      contractUDAOContent,
      backend,
      contentCreator,
      partPricesArray
    );

    /// Create content
    await expect(contractUDAOContent.connect(contentCreator).createContent(createContentVoucherSample))
      .to.emit(contractUDAOContent, "Transfer") // transfer from null address to minter
      .withArgs("0x0000000000000000000000000000000000000000", contentCreator.address, 0);
    /// Start validation and finalize it
    await runValidation(
      contractSupervision,
      backend,
      validator1,
      validator2,
      validator3,
      validator4,
      validator5,
      contentCreator
    );

    /// Send UDAO to the buyer's wallet
    await contractUDAO.transfer(contentBuyer.address, ethers.utils.parseEther("100.0"));
    /// Content buyer needs to give approval to the platformtreasury
    await contractUDAO
      .connect(contentBuyer)
      .approve(contractPlatformTreasury.address, ethers.utils.parseEther("999999999999.0"));

    await contractPlatformTreasury.connect(contentBuyer).buyContent([0], [false], [[1, 2]], [validator1.address]);
    const result = await contractPlatformTreasury.connect(contentBuyer).getOwnedContent(validator1.address);

    const numArray = result.map((x) => x.map((y) => y.toNumber()));
    expect(numArray).to.eql([
      [0, 1],
      [0, 2],
    ]);
  });

  it("Should fail to buy the full content for someone else if other account is banned", async function () {
    await reDeploy();

    /// Set KYC
    await contractRoleManager.setKYC(contentCreator.address, true);
    await contractRoleManager.setKYC(contentBuyer.address, true);

    /// part prices must be determined before creating content
    const partPricesArray = [ethers.utils.parseEther("1"), ethers.utils.parseEther("1")];

    ///Create Voucher from redeem.js and use it for creating content
    const createContentVoucherSample = await createContentVoucher(
      contractUDAOContent,
      backend,
      contentCreator,
      partPricesArray
    );

    /// Create content
    await expect(contractUDAOContent.connect(contentCreator).createContent(createContentVoucherSample))
      .to.emit(contractUDAOContent, "Transfer") // transfer from null address to minter
      .withArgs("0x0000000000000000000000000000000000000000", contentCreator.address, 0);
    /// Start validation and finalize it
    await runValidation(
      contractSupervision,
      backend,
      validator1,
      validator2,
      validator3,
      validator4,
      validator5,
      contentCreator
    );
    /// Send UDAO to the buyer's wallet
    await contractUDAO.transfer(contentBuyer.address, ethers.utils.parseEther("100.0"));
    /// Content buyer needs to give approval to the platformtreasury
    await contractUDAO
      .connect(contentBuyer)
      .approve(contractPlatformTreasury.address, ethers.utils.parseEther("999999999999.0"));
    // Set Ban the gift receiver
    await contractRoleManager.setBan(validator1.address, true);
    // Buy Content
    await expect(
      contractPlatformTreasury.connect(contentBuyer).buyContent([0], [true], [[1]], [validator1.address])
    ).to.revertedWith("Gift receiver is banned");
  });

  it("Should a user able to buy the full content with discount", async function () {
    await reDeploy();

    /// Set KYC
    await contractRoleManager.setKYC(contentCreator.address, true);
    await contractRoleManager.setKYC(contentBuyer.address, true);

    /// part prices must be determined before creating content
    const partPricesArray = [ethers.utils.parseEther("1"), ethers.utils.parseEther("1")];

    ///Create Voucher from redeem.js and use it for creating content
    const createContentVoucherSample = await createContentVoucher(
      contractUDAOContent,
      backend,
      contentCreator,
      partPricesArray
    );

    /// Create content
    await expect(contractUDAOContent.connect(contentCreator).createContent(createContentVoucherSample))
      .to.emit(contractUDAOContent, "Transfer") // transfer from null address to minter
      .withArgs("0x0000000000000000000000000000000000000000", contentCreator.address, 0);
    /// Start validation and finalize it
    await runValidation(
      contractSupervision,
      backend,
      validator1,
      validator2,
      validator3,
      validator4,
      validator5,
      contentCreator
    );

    /// Send UDAO to the buyer's wallet
    await contractUDAO.transfer(contentBuyer.address, ethers.utils.parseEther("100.0"));
    /// Content buyer needs to give approval to the platformtreasury
    await contractUDAO
      .connect(contentBuyer)
      .approve(contractPlatformTreasury.address, ethers.utils.parseEther("999999999999.0"));

    const discountedPurchase = new DiscountedPurchase({
      contract: contractPlatformTreasury,
      signer: backend,
    });
    const coaching_voucher = await discountedPurchase.createVoucher(
      0,
      true,
      [0],
      ethers.utils.parseEther("0.5"),
      Date.now() + 999999999,
      contentBuyer.address,
      ethers.constants.AddressZero
    );

    await contractPlatformTreasury.connect(contentBuyer).buyDiscountedContent(coaching_voucher);
    const result = await contractPlatformTreasury.connect(contentBuyer).getOwnedContent(contentBuyer.address);

    const numArray = result.map((x) => x.map((y) => y.toNumber()));
    expect(numArray).to.eql([[0, 0]]);
  });

  it("Should a user able to buy multiple content", async function () {
    await reDeploy();

    /// Set KYC
    await contractRoleManager.setKYC(contentCreator.address, true);
    await contractRoleManager.setKYC(contentBuyer.address, true);

    /// part prices must be determined before creating content
    const partPricesArray1stContent = [
      ethers.utils.parseEther("2"),
      ethers.utils.parseEther("1"),
      ethers.utils.parseEther("1"),
    ];
    const partPricesArray2ndContent = [ethers.utils.parseEther("3"), ethers.utils.parseEther("2")];
    const partPricesArray3rdContent = [
      ethers.utils.parseEther("5"),
      ethers.utils.parseEther("1"),
      ethers.utils.parseEther("3"),
    ];

    /// Create Voucher from redeem.js and use it for creating content
    const createContentVoucherSample1stContent = await createContentVoucher(
      contractUDAOContent,
      backend,
      contentCreator,
      partPricesArray1stContent
    );
    const createContentVoucherSample2ndContent = await createContentVoucher(
      contractUDAOContent,
      backend,
      contentCreator,
      partPricesArray2ndContent
    );
    const createContentVoucherSample3rdContent = await createContentVoucher(
      contractUDAOContent,
      backend,
      contentCreator,
      partPricesArray3rdContent
    );

    /// Create content
    //1st content
    await expect(contractUDAOContent.connect(contentCreator).createContent(createContentVoucherSample1stContent))
      .to.emit(contractUDAOContent, "Transfer") // transfer from null address to minter
      .withArgs("0x0000000000000000000000000000000000000000", contentCreator.address, 0);
    //2nd content
    await expect(contractUDAOContent.connect(contentCreator).createContent(createContentVoucherSample2ndContent))
      .to.emit(contractUDAOContent, "Transfer") // transfer from null address to minter
      .withArgs("0x0000000000000000000000000000000000000000", contentCreator.address, 1);
    //3rd content
    await expect(contractUDAOContent.connect(contentCreator).createContent(createContentVoucherSample3rdContent))
      .to.emit(contractUDAOContent, "Transfer") // transfer from null address to minter
      .withArgs("0x0000000000000000000000000000000000000000", contentCreator.address, 2);

    /// Start validation and finalize it for 1st content
    await runValidation(
      contractSupervision,
      backend,
      validator1,
      validator2,
      validator3,
      validator4,
      validator5,
      contentCreator
    );
    /// Start validation and finalize it for 2nd content
    await runValidation(
      contractSupervision,
      backend,
      validator1,
      validator2,
      validator3,
      validator4,
      validator5,
      contentCreator,
      (tokenId = 1),
      (validationId = 2)
    );
    /// Start validation and finalize it for 2nd content
    await runValidation(
      contractSupervision,
      backend,
      validator1,
      validator2,
      validator3,
      validator4,
      validator5,
      contentCreator,
      (tokenId = 2),
      (validationId = 3)
    );

    /// Send UDAO to the buyer's wallet
    await contractUDAO.transfer(contentBuyer.address, ethers.utils.parseEther("100.0"));
    /// Content buyer needs to give approval to the platformtreasury
    await contractUDAO
      .connect(contentBuyer)
      .approve(contractPlatformTreasury.address, ethers.utils.parseEther("999999999999.0"));

    await contractPlatformTreasury
      .connect(contentBuyer)
      .buyContent(
        [0, 1, 2],
        [true, true, false],
        [[1], [1], [1, 2]],
        [ethers.constants.AddressZero, validator1.address, ethers.constants.AddressZero]
      );
    const resultForBuyer = await contractPlatformTreasury.connect(contentBuyer).getOwnedContent(contentBuyer.address);

    const numArrayForBuyer = resultForBuyer.map((x) => x.map((y) => y.toNumber()));
    expect(numArrayForBuyer).to.eql([
      [0, 0], // 1st content, part 0 (Full Content)
      //[1, 0], // 2nd content, part 0 (Full Content) but it is a gift
      [2, 1], // 3rd content, part 1 (Partial Content)
      [2, 2], // 3rd content, part 2 (Partial Content)
    ]);

    const resultForGiftReceiver = await contractPlatformTreasury
      .connect(contentBuyer)
      .getOwnedContent(validator1.address);

    const numArrayForGiftReceiver = resultForGiftReceiver.map((x) => x.map((y) => y.toNumber()));
    expect(numArrayForGiftReceiver).to.eql([[1, 0]]);
  });
});
