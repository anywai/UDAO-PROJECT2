const { expect } = require("chai");
const hardhat = require("hardhat");
const { ethers } = hardhat;
const chai = require("chai");
const BN = require("bn.js");
const { LazyCoaching } = require("../lib/LazyCoaching");
const { LazyRole } = require("../lib/LazyRole");
const { Redeem } = require("../lib/Redeem");
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
  contractVoucherVerifier = replace.contractVoucherVerifier;
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
async function runValidation(
  contractSupervision,
  backend,
  validator1,
  validator2,
  validator3,
  validator4,
  validator5,
  contentCreator
) {
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
  await expect(contractSupervision.connect(validator4).sendValidation(1, true))
    .to.emit(contractSupervision, "ValidationResultSent")
    .withArgs(ethers.BigNumber.from(0), ethers.BigNumber.from(1), validator4.address, true);
  await expect(contractSupervision.connect(validator5).sendValidation(1, false))
    .to.emit(contractSupervision, "ValidationResultSent")
    .withArgs(ethers.BigNumber.from(0), ethers.BigNumber.from(1), validator5.address, false);
  await expect(contractSupervision.connect(contentCreator).finalizeValidation(1))
    .to.emit(contractSupervision, "ValidationEnded")
    .withArgs(ethers.BigNumber.from(0), ethers.BigNumber.from(1), true);
}

async function createContentVoucher(
  contractUDAOContent,
  backend,
  contentCreator,
  partPrices,
  coachingEnabled = true,
  coachingRefundable = true,
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
    "udao",
    "ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi",
    contentCreator.address,
    ethers.utils.parseEther("1"),
    "udao",
    coachingEnabled,
    coachingRefundable,
    redeemType,
    validationScore
  );
}

describe("Platform Treasury Contract - Coaching", function () {
  it("Should a user able to buy a coaching", async function () {
    await reDeploy();
    /// Set KYC
    await contractRoleManager.setKYC(contentCreator.address, true);
    await contractRoleManager.setKYC(contentBuyer.address, true);

    /// Send UDAO to the buyer's wallet
    await contractUDAO.transfer(contentBuyer.address, ethers.utils.parseEther("100.0"));
    /// Get the amount of UDAO in the buyer's wallet
    const buyerBalance = await contractUDAO.balanceOf(contentBuyer.address);
    /// Content buyer needs to give approval to the platformtreasury
    await contractUDAO
      .connect(contentBuyer)
      .approve(contractPlatformTreasury.address, ethers.utils.parseEther("999999999999.0"));

    // Create CoachingVoucher to be able to buy coaching
    const lazyCoaching = new LazyCoaching({
      contract: contractVoucherVerifier,
      signer: backend,
    });
    const coachingPrice = ethers.utils.parseEther("1.0");
    /// Get the current block timestamp
    const currentBlockTimestamp = (await hre.ethers.provider.getBlock()).timestamp;
    /// Coaching date is 3 days from now
    const coachingDate = currentBlockTimestamp + 3 * 24 * 60 * 60;
    const role_voucher = await lazyCoaching.createVoucher(contentCreator.address, coachingPrice, coachingDate, contentBuyer.address);
    // Buy coaching
    const purchaseTx = await contractPlatformTreasury.connect(contentBuyer).buyCoaching(role_voucher);
    const queueTxReceipt = await purchaseTx.wait();
    const queueTxEvent = queueTxReceipt.events.find((e) => e.event == "CoachingBought");
    const coachingSaleID = queueTxEvent.args[0];
    // Get the amount of UDAO in the buyer's wallet after buying coaching
    const buyerBalanceAfter = await contractUDAO.balanceOf(contentBuyer.address);
    // Check if correct amount of UDAO was deducted from the buyer's wallet
    expect(buyerBalance.sub(buyerBalanceAfter)).to.equal(coachingPrice);
    // Get coaching struct
    const coachingStruct = await contractPlatformTreasury.coachSales(coachingSaleID);
    // Check if returned learner address is the same as the buyer address
    expect(coachingStruct.contentReceiver).to.equal(contentBuyer.address);
  });

  it("Should fail to buy coaching if buyer is banned", async function () {
    await reDeploy();
    /// Set KYC
    await contractRoleManager.setKYC(contentCreator.address, true);
    await contractRoleManager.setKYC(contentBuyer.address, true);

    /// Send UDAO to the buyer's wallet
    await contractUDAO.transfer(contentBuyer.address, ethers.utils.parseEther("100.0"));

    /// Content buyer needs to give approval to the platformtreasury
    await contractUDAO
      .connect(contentBuyer)
      .approve(contractPlatformTreasury.address, ethers.utils.parseEther("999999999999.0"));

    // Create CoachingVoucher to be able to buy coaching
    const lazyCoaching = new LazyCoaching({
      contract: contractVoucherVerifier,
      signer: backend,
    });
    const coachingPrice = ethers.utils.parseEther("1.0");
    /// Get the current block timestamp
    const currentBlockTimestamp = (await hre.ethers.provider.getBlock()).timestamp;
    /// Coaching date is 3 days from now
    const coachingDate = currentBlockTimestamp + 3 * 24 * 60 * 60;
    const role_voucher = await lazyCoaching.createVoucher(contentCreator.address, coachingPrice, coachingDate, contentBuyer.address);
    // Set BAN
    await contractRoleManager.setBan(contentBuyer.address, true);
    // Buy coaching
    await expect(contractPlatformTreasury.connect(contentBuyer).buyCoaching(role_voucher)).to.revertedWith("Learner is banned");
  });

  it("Should fail to buy coaching if instructer is banned", async function () {
    await reDeploy();
    /// Set KYC
    await contractRoleManager.setKYC(contentCreator.address, true);
    await contractRoleManager.setKYC(contentBuyer.address, true);

    /// Send UDAO to the buyer's wallet
    await contractUDAO.transfer(contentBuyer.address, ethers.utils.parseEther("100.0"));

    /// Content buyer needs to give approval to the platformtreasury
    await contractUDAO
      .connect(contentBuyer)
      .approve(contractPlatformTreasury.address, ethers.utils.parseEther("999999999999.0"));

    // Create CoachingVoucher to be able to buy coaching
    const lazyCoaching = new LazyCoaching({
      contract: contractVoucherVerifier,
      signer: backend,
    });
    const coachingPrice = ethers.utils.parseEther("1.0");
    /// Get the current block timestamp
    const currentBlockTimestamp = (await hre.ethers.provider.getBlock()).timestamp;
    /// Coaching date is 3 days from now
    const coachingDate = currentBlockTimestamp + 3 * 24 * 60 * 60;
    const role_voucher = await lazyCoaching.createVoucher(contentCreator.address, coachingPrice, coachingDate, contentBuyer.address);
    // Set BAN
    await contractRoleManager.setBan(contentCreator.address, true);
    // Buy coaching
    await expect(contractPlatformTreasury.connect(contentBuyer).buyCoaching(role_voucher)).to.revertedWith("Coach is banned");    
  });

  it("Should refund payment for coaching requested by buyer if 1 day prior to coaching date", async function () {
    await reDeploy();
    /// Set KYC
    await contractRoleManager.setKYC(contentCreator.address, true);
    await contractRoleManager.setKYC(contentBuyer.address, true);

    /// Send UDAO to the buyer's wallet
    await contractUDAO.transfer(contentBuyer.address, ethers.utils.parseEther("100.0"));
    /// Get the amount of UDAO in the buyer's wallet
    const buyerBalance = await contractUDAO.balanceOf(contentBuyer.address);
    /// Content buyer needs to give approval to the platformtreasury
    await contractUDAO
      .connect(contentBuyer)
      .approve(contractPlatformTreasury.address, ethers.utils.parseEther("999999999999.0"));

    // Create CoachingVoucher to be able to buy coaching
    const lazyCoaching = new LazyCoaching({
      contract: contractVoucherVerifier,
      signer: backend,
    });
    const coachingPrice = ethers.utils.parseEther("1.0");
    /// Get the current block timestamp
    const currentBlockTimestamp = (await hre.ethers.provider.getBlock()).timestamp;
    /// Coaching date is 3 days from now
    const coachingDate = currentBlockTimestamp + 3 * 24 * 60 * 60;
    const role_voucher = await lazyCoaching.createVoucher(contentCreator.address, coachingPrice, coachingDate, contentBuyer.address);
    // Buy coaching
    const purchaseTx = await contractPlatformTreasury.connect(contentBuyer).buyCoaching(role_voucher);
    const queueTxReceipt = await purchaseTx.wait();
    const queueTxEvent = queueTxReceipt.events.find((e) => e.event == "CoachingBought");
    const coachingSaleID = queueTxEvent.args[0];
    // Get the amount of UDAO in the buyer's wallet after buying coaching
    const buyerBalanceAfter = await contractUDAO.balanceOf(contentBuyer.address);
    // Check if correct amount of UDAO was deducted from the buyer's wallet
    expect(buyerBalance.sub(buyerBalanceAfter)).to.equal(coachingPrice);
    // Get coaching struct
    const coachingStruct = await contractPlatformTreasury.coachSales(coachingSaleID);
    // Check if returned learner address is the same as the buyer address
    expect(coachingStruct.contentReceiver).to.equal(contentBuyer.address);
    // Refund coaching
    const refundType = 0 // 0 since refund is coaching
    await expect(contractPlatformTreasury.connect(contentBuyer).refundCoachingByInstructorOrLearner(coachingSaleID))
      .to.emit(contractPlatformTreasury, "SaleRefunded")
      .withArgs(coachingSaleID, refundType);
    // Get the amount of UDAO in the buyer's wallet after refunding coaching
    const buyerBalanceAfterRefund = await contractUDAO.balanceOf(contentBuyer.address);
    // Check if correct amount of UDAO was refunded to the buyer's wallet
    expect(buyerBalanceAfterRefund.sub(buyerBalanceAfter)).to.equal(coachingPrice);
  });
  it("Should allow coach to refund anytime before refundablePeriod", async function () {
    await reDeploy();
    /// Set KYC
    await contractRoleManager.setKYC(contentCreator.address, true);
    await contractRoleManager.setKYC(contentBuyer.address, true);

    /// Send UDAO to the buyer's wallet
    await contractUDAO.transfer(contentBuyer.address, ethers.utils.parseEther("100.0"));
    /// Get the amount of UDAO in the buyer's wallet
    const buyerBalance = await contractUDAO.balanceOf(contentBuyer.address);
    /// Content buyer needs to give approval to the platformtreasury
    await contractUDAO
      .connect(contentBuyer)
      .approve(contractPlatformTreasury.address, ethers.utils.parseEther("999999999999.0"));

    // Create CoachingVoucher to be able to buy coaching
    const lazyCoaching = new LazyCoaching({
      contract: contractVoucherVerifier,
      signer: backend,
    });
    const coachingPrice = ethers.utils.parseEther("1.0");
    /// Get the current block timestamp
    const currentBlockTimestamp = (await hre.ethers.provider.getBlock()).timestamp;
    /// Coaching date is 3 days from now
    const coachingDate = currentBlockTimestamp + 3 * 24 * 60 * 60;
    const role_voucher = await lazyCoaching.createVoucher(contentCreator.address, coachingPrice, coachingDate, contentBuyer.address);
    // Buy coaching
    const purchaseTx = await contractPlatformTreasury.connect(contentBuyer).buyCoaching(role_voucher);
    const queueTxReceipt = await purchaseTx.wait();
    const queueTxEvent = queueTxReceipt.events.find((e) => e.event == "CoachingBought");
    const coachingSaleID = queueTxEvent.args[0];
    // Get the amount of UDAO in the buyer's wallet after buying coaching
    const buyerBalanceAfter = await contractUDAO.balanceOf(contentBuyer.address);
    // Check if correct amount of UDAO was deducted from the buyer's wallet
    expect(buyerBalance.sub(buyerBalanceAfter)).to.equal(coachingPrice);
    // Get coaching struct
    const coachingStruct = await contractPlatformTreasury.coachSales(coachingSaleID);
    // Check if returned learner address is the same as the buyer address
    expect(coachingStruct.contentReceiver).to.equal(contentBuyer.address);
    // Mine 5 days of blocks
    const numBlocksToMine = Math.ceil((5 * 86400) / 2);
    await hre.network.provider.send("hardhat_mine", [`0x${numBlocksToMine.toString(16)}`, "0x2"]);
    // Refund coaching
    const refundType = 0 // 0 since refund is coaching
    await expect(contractPlatformTreasury.connect(contentCreator).refundCoachingByInstructorOrLearner(coachingSaleID))
      .to.emit(contractPlatformTreasury, "SaleRefunded")
      .withArgs(coachingSaleID, refundType);
    // Get the amount of UDAO in the buyer's wallet after refunding coaching
    const buyerBalanceAfterRefund = await contractUDAO.balanceOf(contentBuyer.address);
    // Check if correct amount of UDAO was refunded to the buyer's wallet
    expect(buyerBalanceAfterRefund.sub(buyerBalanceAfter)).to.equal(coachingPrice);
  });
  it("Should fail to refund if coach tries to refund after refundablePeriod", async function () {
    await reDeploy();
    /// Set KYC
    await contractRoleManager.setKYC(contentCreator.address, true);
    await contractRoleManager.setKYC(contentBuyer.address, true);

    /// Send UDAO to the buyer's wallet
    await contractUDAO.transfer(contentBuyer.address, ethers.utils.parseEther("100.0"));
    /// Get the amount of UDAO in the buyer's wallet
    const buyerBalance = await contractUDAO.balanceOf(contentBuyer.address);
    /// Content buyer needs to give approval to the platformtreasury
    await contractUDAO
      .connect(contentBuyer)
      .approve(contractPlatformTreasury.address, ethers.utils.parseEther("999999999999.0"));

    // Create CoachingVoucher to be able to buy coaching
    const lazyCoaching = new LazyCoaching({
      contract: contractVoucherVerifier,
      signer: backend,
    });
    const coachingPrice = ethers.utils.parseEther("1.0");
    /// Get the current block timestamp
    const currentBlockTimestamp = (await hre.ethers.provider.getBlock()).timestamp;
    /// Coaching date is 3 days from now
    const coachingDate = currentBlockTimestamp + 3 * 24 * 60 * 60;
    const role_voucher = await lazyCoaching.createVoucher(contentCreator.address, coachingPrice, coachingDate, contentBuyer.address);
    // Buy coaching
    const purchaseTx = await contractPlatformTreasury.connect(contentBuyer).buyCoaching(role_voucher);
    const queueTxReceipt = await purchaseTx.wait();
    const queueTxEvent = queueTxReceipt.events.find((e) => e.event == "CoachingBought");
    const coachingSaleID = queueTxEvent.args[0];
    // Get the amount of UDAO in the buyer's wallet after buying coaching
    const buyerBalanceAfter = await contractUDAO.balanceOf(contentBuyer.address);
    // Check if correct amount of UDAO was deducted from the buyer's wallet
    expect(buyerBalance.sub(buyerBalanceAfter)).to.equal(coachingPrice);
    // Get coaching struct
    const coachingStruct = await contractPlatformTreasury.coachSales(coachingSaleID);
    // Get refundable period
    const refundablePeriod = coachingStruct.refundablePeriod;
    // Check if returned learner address is the same as the buyer address
    expect(coachingStruct.contentReceiver).to.equal(contentBuyer.address);
    // Mine refundablePeriod days of blocks
    const numBlocksToMine = Math.ceil((refundablePeriod * 86400) / 2);
    await hre.network.provider.send("hardhat_mine", [`0x${numBlocksToMine.toString(16)}`, "0x2"]);
    // Refund coaching
    const refundType = 0 // 0 since refund is coaching
    await expect(contractPlatformTreasury.connect(contentCreator).refundCoachingByInstructorOrLearner(coachingSaleID)).to.revertedWith(
      "Refund period over you cant refund"
    );
  });
  it("Should fail to refund payment for coaching requested by buyer if less than 1 day prior to coaching date", async function () {
    await reDeploy();
    /// Set KYC
    await contractRoleManager.setKYC(contentCreator.address, true);
    await contractRoleManager.setKYC(contentBuyer.address, true);

    /// Send UDAO to the buyer's wallet
    await contractUDAO.transfer(contentBuyer.address, ethers.utils.parseEther("100.0"));

    /// Content buyer needs to give approval to the platformtreasury
    await contractUDAO
      .connect(contentBuyer)
      .approve(contractPlatformTreasury.address, ethers.utils.parseEther("999999999999.0"));

    // Create CoachingVoucher to be able to buy coaching
    const lazyCoaching = new LazyCoaching({
      contract: contractVoucherVerifier,
      signer: backend,
    });
    const coachingPrice = ethers.utils.parseEther("1.0");
    /// Get the current block timestamp
    const currentBlockTimestamp = (await hre.ethers.provider.getBlock()).timestamp;
    /// Coaching date is 3 days from now
    const coachingDate = currentBlockTimestamp + 3 * 24 * 60 * 60;
    const role_voucher = await lazyCoaching.createVoucher(contentCreator.address, coachingPrice, coachingDate, contentBuyer.address);
    // Buy coaching
    const purchaseTx = await contractPlatformTreasury.connect(contentBuyer).buyCoaching(role_voucher);
    const queueTxReceipt = await purchaseTx.wait();
    const queueTxEvent = queueTxReceipt.events.find((e) => e.event == "CoachingBought");
    const coachingSaleID = queueTxEvent.args[0];
    // Get coaching struct
    const coachingStruct = await contractPlatformTreasury.coachSales(coachingSaleID);
    // Check if returned learner address is the same as the buyer address
    expect(coachingStruct.contentReceiver).to.equal(contentBuyer.address);
    // Mine 2 days of blocks
    const numBlocksToMine = Math.ceil((2 * 86400) / 2);
    await hre.network.provider.send("hardhat_mine", [`0x${numBlocksToMine.toString(16)}`, "0x2"]);
    // Refund coaching
    await expect(contractPlatformTreasury.connect(contentBuyer).refundCoachingByInstructorOrLearner(coachingSaleID)).to.revertedWith(
      "You can't refund less than 1 day prior to coaching date"
    );
  });
});
