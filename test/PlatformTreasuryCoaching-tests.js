const { expect } = require("chai");
const hardhat = require("hardhat");
const { ethers } = hardhat;
const chai = require("chai");
const BN = require("bn.js");
const { LazyCoaching } = require("../lib/LazyCoaching");
const { RefundVoucher } = require("../lib/RefundVoucher");
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
  contractGovernanceTreasury = replace.contractGovernanceTreasury;
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
    const role_voucher = await lazyCoaching.createVoucher(
      contentCreator.address,
      coachingPrice,
      coachingDate,
      contentBuyer.address
    );
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

  it("Should fail user to buy a coaching if have not enough udao balance", async function () {
    await reDeploy();
    /// Set KYC
    await contractRoleManager.setKYC(contentCreator.address, true);
    await contractRoleManager.setKYC(contentBuyer.address, true);

    /// Send UDAO to the buyer's wallet
    //await contractUDAO.transfer(contentBuyer.address, ethers.utils.parseEther("100.0"));
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
    const role_voucher = await lazyCoaching.createVoucher(
      contentCreator.address,
      coachingPrice,
      coachingDate,
      contentBuyer.address
    );
    // Buy coaching
    const purchaseTx = contractPlatformTreasury.connect(contentBuyer).buyCoaching(role_voucher);
    // dont enough udao
    await expect(purchaseTx).to.be.revertedWith("Not enough UDAO sent!");
  });

  it("Should fail user to buy a coaching if have not enough udao allowance", async function () {
    await reDeploy();
    /// Set KYC
    await contractRoleManager.setKYC(contentCreator.address, true);
    await contractRoleManager.setKYC(contentBuyer.address, true);

    /// Send UDAO to the buyer's wallet
    await contractUDAO.transfer(contentBuyer.address, ethers.utils.parseEther("100.0"));
    /// Get the amount of UDAO in the buyer's wallet
    const buyerBalance = await contractUDAO.balanceOf(contentBuyer.address);
    /// Content buyer needs to give approval to the platformtreasury
    //await contractUDAO
    //  .connect(contentBuyer)
    //  .approve(contractPlatformTreasury.address, ethers.utils.parseEther("999999999999.0"));

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
    const role_voucher = await lazyCoaching.createVoucher(
      contentCreator.address,
      coachingPrice,
      coachingDate,
      contentBuyer.address
    );
    // Buy coaching
    const purchaseTx = contractPlatformTreasury.connect(contentBuyer).buyCoaching(role_voucher);
    // dont enough udao
    await expect(purchaseTx).to.be.revertedWith("Not enough allowance!");
  });

  it("Should a user able to buy a coaching when coaching voucher created by coach", async function () {
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
      signer: contentCreator,
    });
    const coachingPrice = ethers.utils.parseEther("1.0");
    /// Get the current block timestamp
    const currentBlockTimestamp = (await hre.ethers.provider.getBlock()).timestamp;
    /// Coaching date is 3 days from now
    const coachingDate = currentBlockTimestamp + 3 * 24 * 60 * 60;
    const role_voucher = await lazyCoaching.createVoucher(
      contentCreator.address,
      coachingPrice,
      coachingDate,
      contentBuyer.address
    );
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

  it("Should fail to buy coaching if learner is banned", async function () {
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
    const role_voucher = await lazyCoaching.createVoucher(
      contentCreator.address,
      coachingPrice,
      coachingDate,
      contentBuyer.address
    );
    // Set BAN
    await contractRoleManager.setBan(contentBuyer.address, true);
    // Buy coaching
    await expect(contractPlatformTreasury.connect(contentBuyer).buyCoaching(role_voucher)).to.revertedWith(
      "Learner is banned"
    );
  });

  it("Should fail to buy coaching if learner dont have kyc", async function () {
    await reDeploy();
    /// Set KYC
    await contractRoleManager.setKYC(contentCreator.address, true);
    await contractRoleManager.setKYC(contentBuyer.address, false);

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
    const role_voucher = await lazyCoaching.createVoucher(
      contentCreator.address,
      coachingPrice,
      coachingDate,
      contentBuyer.address
    );

    // Buy coaching
    await expect(contractPlatformTreasury.connect(contentBuyer).buyCoaching(role_voucher)).to.revertedWith(
      "Learner is not KYCed"
    );
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
    const role_voucher = await lazyCoaching.createVoucher(
      contentCreator.address,
      coachingPrice,
      coachingDate,
      contentBuyer.address
    );
    // Set BAN
    await contractRoleManager.setBan(contentCreator.address, true);
    // Buy coaching
    await expect(contractPlatformTreasury.connect(contentBuyer).buyCoaching(role_voucher)).to.revertedWith(
      "Coach is banned"
    );
  });

  it("Should fail to buy coaching if instructer dont have kyc", async function () {
    await reDeploy();
    /// Set KYC
    await contractRoleManager.setKYC(contentCreator.address, false);
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
    const role_voucher = await lazyCoaching.createVoucher(
      contentCreator.address,
      coachingPrice,
      coachingDate,
      contentBuyer.address
    );
    // Buy coaching
    await expect(contractPlatformTreasury.connect(contentBuyer).buyCoaching(role_voucher)).to.revertedWith(
      "Coach is not KYCed"
    );
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
    const role_voucher = await lazyCoaching.createVoucher(
      contentCreator.address,
      coachingPrice,
      coachingDate,
      contentBuyer.address
    );
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
    const refundType = 0; // 0 since refund is coaching
    await expect(contractPlatformTreasury.connect(contentBuyer).refundCoachingByInstructorOrLearner(coachingSaleID))
      .to.emit(contractPlatformTreasury, "SaleRefunded")
      .withArgs(coachingSaleID, refundType);
    // Get the amount of UDAO in the buyer's wallet after refunding coaching
    const buyerBalanceAfterRefund = await contractUDAO.balanceOf(contentBuyer.address);
    // Check if correct amount of UDAO was refunded to the buyer's wallet
    expect(buyerBalanceAfterRefund.sub(buyerBalanceAfter)).to.equal(coachingPrice);
  });

  it("Should fail refund payment for coaching if caller is not payee or coach", async function () {
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
    const role_voucher = await lazyCoaching.createVoucher(
      contentCreator.address,
      coachingPrice,
      coachingDate,
      contentBuyer.address
    );
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
    const refundType = 0; // 0 since refund is coaching
    await expect(
      contractPlatformTreasury.connect(contentBuyer2).refundCoachingByInstructorOrLearner(coachingSaleID)
    ).to.be.revertedWith("You are not the payee or coach");
  });

  it("Should allow coach to refund anytime in refundablePeriod", async function () {
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
    const role_voucher = await lazyCoaching.createVoucher(
      contentCreator.address,
      coachingPrice,
      coachingDate,
      contentBuyer.address
    );
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
    const refundType = 0; // 0 since refund is coaching
    await expect(contractPlatformTreasury.connect(contentCreator).refundCoachingByInstructorOrLearner(coachingSaleID))
      .to.emit(contractPlatformTreasury, "SaleRefunded")
      .withArgs(coachingSaleID, refundType);
    // Get the amount of UDAO in the buyer's wallet after refunding coaching
    const buyerBalanceAfterRefund = await contractUDAO.balanceOf(contentBuyer.address);
    // Check if correct amount of UDAO was refunded to the buyer's wallet
    expect(buyerBalanceAfterRefund.sub(buyerBalanceAfter)).to.equal(coachingPrice);
  });

  it("Should fail refund coaching by instructor or learner if it is already refunded", async function () {
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
    const role_voucher = await lazyCoaching.createVoucher(
      contentCreator.address,
      coachingPrice,
      coachingDate,
      contentBuyer.address
    );
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
    const refundType = 0; // 0 since refund is coaching
    await expect(contractPlatformTreasury.connect(contentCreator).refundCoachingByInstructorOrLearner(coachingSaleID))
      .to.emit(contractPlatformTreasury, "SaleRefunded")
      .withArgs(coachingSaleID, refundType);
    // Get the amount of UDAO in the buyer's wallet after refunding coaching
    const buyerBalanceAfterRefund = await contractUDAO.balanceOf(contentBuyer.address);
    // Check if correct amount of UDAO was refunded to the buyer's wallet
    expect(buyerBalanceAfterRefund.sub(buyerBalanceAfter)).to.equal(coachingPrice);

    await expect(
      contractPlatformTreasury.connect(contentCreator).refundCoachingByInstructorOrLearner(coachingSaleID)
    ).to.be.revertedWith("Already refunded!");
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
    const role_voucher = await lazyCoaching.createVoucher(
      contentCreator.address,
      coachingPrice,
      coachingDate,
      contentBuyer.address
    );
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
    const refundWindow = await contractPlatformTreasury.refundWindow();
    // Mine days of blocks that bigger than refundWindow days:
    const numBlocksToMine = Math.ceil((refundWindow.add(1) * 86400) / 2);
    await hre.network.provider.send("hardhat_mine", [`0x${numBlocksToMine.toString(16)}`, "0x2"]);
    // Refund coaching
    await expect(
      contractPlatformTreasury.connect(contentCreator).refundCoachingByInstructorOrLearner(coachingSaleID)
    ).to.revertedWith("Refund period over you cant refund");
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
    const role_voucher = await lazyCoaching.createVoucher(
      contentCreator.address,
      coachingPrice,
      coachingDate,
      contentBuyer.address
    );
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
    await expect(
      contractPlatformTreasury.connect(contentBuyer).refundCoachingByInstructorOrLearner(coachingSaleID)
    ).to.revertedWith("You can't refund less than 1 day prior to coaching date");
  });

  it("Should refund coaching with voucher if before refundablePeriod", async function () {
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
    const role_voucher = await lazyCoaching.createVoucher(
      contentCreator.address,
      coachingPrice,
      coachingDate,
      contentBuyer.address
    );
    // Get buyer's UDAO balance
    const buyerBalance = await contractUDAO.balanceOf(contentBuyer.address);
    // Buy coaching
    const purchaseTx = await contractPlatformTreasury.connect(contentBuyer).buyCoaching(role_voucher);
    const queueTxReceipt = await purchaseTx.wait();
    const queueTxEvent = queueTxReceipt.events.find((e) => e.event == "CoachingBought");
    const coachingSaleID = queueTxEvent.args[0];
    // Get buyer's UDAO balance after buying coaching
    const buyerBalanceAfter = await contractUDAO.balanceOf(contentBuyer.address);
    // Check if correct amount of UDAO was deducted from the buyer's wallet
    expect(buyerBalance.sub(buyerBalanceAfter)).to.equal(coachingPrice);
    // Get coaching struct
    const coachingStruct = await contractPlatformTreasury.coachSales(coachingSaleID);
    // Check if returned learner address is the same as the buyer address
    expect(coachingStruct.contentReceiver).to.equal(contentBuyer.address);
    // Mine 2 days of blocks
    const numBlocksToMine = Math.ceil((2 * 86400) / 2);
    await hre.network.provider.send("hardhat_mine", [`0x${numBlocksToMine.toString(16)}`, "0x2"]);
    //  Create RefundVoucher
    const refundVoucher = new RefundVoucher({
      contract: contractVoucherVerifier,
      signer: backend,
    });
    const refundType = 0; // 0 since refund is coaching
    // Voucher will be valid for 1 day
    const voucherValidUntil = Date.now() + 86400;
    const refund_voucher = await refundVoucher.createVoucher(
      coachingSaleID,
      contentCreator.address,
      [],
      [],
      voucherValidUntil
    );
    // Refund coaching
    await expect(contractPlatformTreasury.connect(contentCreator).newRefundCoaching(refund_voucher))
      .to.emit(contractPlatformTreasury, "SaleRefunded")
      .withArgs(coachingSaleID, refundType);
    // Get buyer's UDAO balance after refunding coaching
    const buyerBalanceAfterRefund = await contractUDAO.balanceOf(contentBuyer.address);
    // Check if correct amount of UDAO was refunded to the buyer's wallet
    expect(buyerBalanceAfterRefund.sub(buyerBalanceAfter)).to.equal(coachingPrice);
  });

  it("Should fail refund coaching with voucher if it is already refunded", async function () {
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
    const role_voucher = await lazyCoaching.createVoucher(
      contentCreator.address,
      coachingPrice,
      coachingDate,
      contentBuyer.address
    );
    // Get buyer's UDAO balance
    const buyerBalance = await contractUDAO.balanceOf(contentBuyer.address);
    // Buy coaching
    const purchaseTx = await contractPlatformTreasury.connect(contentBuyer).buyCoaching(role_voucher);
    const queueTxReceipt = await purchaseTx.wait();
    const queueTxEvent = queueTxReceipt.events.find((e) => e.event == "CoachingBought");
    const coachingSaleID = queueTxEvent.args[0];
    // Get buyer's UDAO balance after buying coaching
    const buyerBalanceAfter = await contractUDAO.balanceOf(contentBuyer.address);
    // Check if correct amount of UDAO was deducted from the buyer's wallet
    expect(buyerBalance.sub(buyerBalanceAfter)).to.equal(coachingPrice);
    // Get coaching struct
    const coachingStruct = await contractPlatformTreasury.coachSales(coachingSaleID);
    // Check if returned learner address is the same as the buyer address
    expect(coachingStruct.contentReceiver).to.equal(contentBuyer.address);
    // Mine 2 days of blocks
    const numBlocksToMine = Math.ceil((2 * 86400) / 2);
    await hre.network.provider.send("hardhat_mine", [`0x${numBlocksToMine.toString(16)}`, "0x2"]);
    //  Create RefundVoucher
    const refundVoucher = new RefundVoucher({
      contract: contractVoucherVerifier,
      signer: backend,
    });
    const refundType = 0; // 0 since refund is coaching
    // Voucher will be valid for 1 day
    const voucherValidUntil = Date.now() + 86400;
    const refund_voucher = await refundVoucher.createVoucher(
      coachingSaleID,
      contentCreator.address,
      [],
      [],
      voucherValidUntil
    );
    // Refund coaching
    await expect(contractPlatformTreasury.connect(contentCreator).newRefundCoaching(refund_voucher))
      .to.emit(contractPlatformTreasury, "SaleRefunded")
      .withArgs(coachingSaleID, refundType);
    // Get buyer's UDAO balance after refunding coaching
    const buyerBalanceAfterRefund = await contractUDAO.balanceOf(contentBuyer.address);
    // Check if correct amount of UDAO was refunded to the buyer's wallet
    expect(buyerBalanceAfterRefund.sub(buyerBalanceAfter)).to.equal(coachingPrice);

    // Refund coaching
    await expect(contractPlatformTreasury.connect(contentCreator).newRefundCoaching(refund_voucher)).to.be.revertedWith(
      "Already refunded!"
    );
  });

  it("Should fail to refund coaching with voucher if after refundablePeriod", async function () {
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
    const role_voucher = await lazyCoaching.createVoucher(
      contentCreator.address,
      coachingPrice,
      coachingDate,
      contentBuyer.address
    );
    // Get buyer's UDAO balance
    const buyerBalance = await contractUDAO.balanceOf(contentBuyer.address);
    // Buy coaching
    const purchaseTx = await contractPlatformTreasury.connect(contentBuyer).buyCoaching(role_voucher);
    const queueTxReceipt = await purchaseTx.wait();
    const queueTxEvent = queueTxReceipt.events.find((e) => e.event == "CoachingBought");
    const coachingSaleID = queueTxEvent.args[0];
    // Get buyer's UDAO balance after buying coaching
    const buyerBalanceAfter = await contractUDAO.balanceOf(contentBuyer.address);
    // Check if correct amount of UDAO was deducted from the buyer's wallet
    expect(buyerBalance.sub(buyerBalanceAfter)).to.equal(coachingPrice);
    // Get coaching struct
    const coachingStruct = await contractPlatformTreasury.coachSales(coachingSaleID);
    // Check if returned learner address is the same as the buyer address
    expect(coachingStruct.contentReceiver).to.equal(contentBuyer.address);
    // Mine more than refund period
    const refundWindow = await contractPlatformTreasury.refundWindow();
    // Mine days of blocks that bigger than refundWindow days:
    const numBlocksToMine = Math.ceil((refundWindow.add(1) * 86400) / 2);
    await hre.network.provider.send("hardhat_mine", [`0x${numBlocksToMine.toString(16)}`, "0x2"]);
    //  Create RefundVoucher
    const refundVoucher = new RefundVoucher({
      contract: contractVoucherVerifier,
      signer: backend,
    });
    const refundType = 0; // 0 since refund is coaching
    // Voucher will be valid for 1 day
    const voucherValidUntil = Date.now() + 86400;
    const refund_voucher = await refundVoucher.createVoucher(
      coachingSaleID,
      contentCreator.address,
      [],
      [],
      voucherValidUntil
    );
    // Refund coaching
    await expect(contractPlatformTreasury.connect(contentCreator).newRefundCoaching(refund_voucher)).to.revertedWith(
      "Refund period over you cant refund"
    );
  });

  it("Should allow backend to activate Governance Treasury and transfer funds to governance treasury", async function () {
    await reDeploy();
    /// Set KYC
    await contractRoleManager.setKYC(contentCreator.address, true);
    await contractRoleManager.setKYC(contentBuyer.address, true);
    /// activate platform cuts
    const _contentFoundCut = 4000;
    const _contentGoverCut = 700;
    const _contentJurorCut = 100;
    const _contentValidCut = 200;
    const _contentTotalCut = _contentFoundCut + _contentGoverCut + _contentJurorCut + _contentValidCut;

    const _coachFoundCut = 4000;
    const _coachGoverCut = 700;
    const _coachJurorCut = 100;
    const _coachValidCut = 200;
    const _coachTotalCut = _coachFoundCut + _coachGoverCut + _coachJurorCut + _coachValidCut;

    // Set coach cuts
    const txContentCuts = await contractPlatformTreasury
      .connect(backend)
      .setContentCuts(_contentFoundCut, _contentGoverCut, _contentJurorCut, _contentValidCut);
    const txCoachCuts = await contractPlatformTreasury
      .connect(backend)
      .setCoachCuts(_coachFoundCut, _coachGoverCut, _coachJurorCut, _coachValidCut);

    // expect PlatformCutsUpdated event
    await expect(txCoachCuts)
      .to.emit(contractPlatformTreasury, "PlatformCutsUpdated")
      .withArgs(
        _contentFoundCut,
        _contentGoverCut,
        _contentJurorCut,
        _contentValidCut,
        _contentTotalCut,
        _coachFoundCut,
        _coachGoverCut,
        _coachJurorCut,
        _coachValidCut,
        _coachTotalCut
      );
    // Activate governance treasury
    await contractPlatformTreasury.connect(backend).activateGovernanceTreasury(true);

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
    const role_voucher = await lazyCoaching.createVoucher(
      contentCreator.address,
      coachingPrice,
      coachingDate,
      contentBuyer.address
    );
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

    /// @dev Skip "refund window" days to allow foundation to withdraw funds
    const refundWindowDays = await contractPlatformTreasury.refundWindow();
    /// convert big number to number
    const refundWindowDaysNumber = refundWindowDays.toNumber();

    /// @dev Skip 20'refund window period' days to allow foundation to withdraw funds
    const numBlocksToMine = Math.ceil((refundWindowDaysNumber * 24 * 60 * 60) / 2);
    await hre.network.provider.send("hardhat_mine", [`0x${numBlocksToMine.toString(16)}`, "0x2"]);
    // Update transfer platform balances
    await contractPlatformTreasury.connect(backend).updateAndTransferPlatformBalances();
    /// @dev Check if the governance treasury has the correct amount with respect to the platform cut percentages
    const governanceTreasuryBalance = await contractUDAO.balanceOf(contractGovernanceTreasury.address);

    // Get total price
    const totalPrice = coachingPrice;
    // Get coachFoundCut
    const coachFoundCut = totalPrice.mul(_coachFoundCut).div(100000);
    // Get coachGoverCut
    const coachGoverCut = totalPrice.mul(_coachGoverCut).div(100000);
    // Get conachJurorCut
    const coachJurorCut = totalPrice.mul(_coachJurorCut).div(100000);
    // Get coachValidCut
    const coachValidCut = totalPrice.mul(_coachValidCut).div(100000);
    // Get total cut
    const totalCut = coachGoverCut.add(coachJurorCut).add(coachValidCut);
    // Check if the governance treasury has the correct amount with respect to the platform cut percentages
    expect(governanceTreasuryBalance).to.equal(totalCut);

    /// @dev Skip 20 days to allow foundation to withdraw funds
    const numBlocksToMine2 = Math.ceil((refundWindowDaysNumber * 24 * 60 * 60) / 2);
    await hre.network.provider.send("hardhat_mine", [`0x${numBlocksToMine2.toString(16)}`, "0x2"]);
    await contractPlatformTreasury.updateAndTransferPlatformBalances();
  });

  it("Should fail buy a coaching if there isnt time to the scheduled coaching date at least 1 day and at most 7 days", async function () {
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
    const coachingDate1 = currentBlockTimestamp;
    const role_voucher1 = await lazyCoaching.createVoucher(
      contentCreator.address,
      coachingPrice,
      coachingDate1,
      contentBuyer.address
    );
    // Buy coaching revety
    await expect(contractPlatformTreasury.connect(contentBuyer).buyCoaching(role_voucher1)).to.revertedWith(
      "Coaching date must be at least 1 day before"
    );
    /// Coaching date is 3 days from now
    const coachingDate2 = currentBlockTimestamp + 8 * 24 * 60 * 60;
    const role_voucher2 = await lazyCoaching.createVoucher(
      contentCreator.address,
      coachingPrice,
      coachingDate2,
      contentBuyer.address
    );
    // Buy coaching revety
    await expect(contractPlatformTreasury.connect(contentBuyer).buyCoaching(role_voucher2)).to.revertedWith(
      "Coaching date must be at most 7 days before"
    );
  });

  it("Should fail buy a coaching if learner in voucher is not the caller", async function () {
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
    const coachingDate1 = currentBlockTimestamp + 3 * 24 * 60 * 60;
    const role_voucher1 = await lazyCoaching.createVoucher(
      contentCreator.address,
      coachingPrice,
      coachingDate1,
      contentBuyer.address
    );
    // Buy coaching revety
    await expect(contractPlatformTreasury.connect(contentBuyer2).buyCoaching(role_voucher1)).to.revertedWith(
      "You are not the learner"
    );
  });

  it("Should backend can buy coaching behalf of user if it is a fiat payment", async function () {
    await reDeploy();
    /// Set KYC
    await contractRoleManager.setKYC(contentCreator.address, true);
    await contractRoleManager.setKYC(contentBuyer.address, true);

    /// Send UDAO to the buyer's wallet
    await contractUDAO.transfer(backend.address, ethers.utils.parseEther("100.0"));
    /// Get the amount of UDAO in the buyer's wallet
    const buyerBalance = await contractUDAO.balanceOf(backend.address);
    /// Content buyer needs to give approval to the platformtreasury
    await contractUDAO
      .connect(backend)
      .approve(contractPlatformTreasury.address, ethers.utils.parseEther("999999999999.0"));
    // Create CoachingVoucher to be able to buy coaching
    const lazyCoaching = new LazyCoaching({
      contract: contractVoucherVerifier,
      signer: contentCreator,
    });
    const coachingPrice = ethers.utils.parseEther("1.0");
    /// Get the current block timestamp
    const currentBlockTimestamp = (await hre.ethers.provider.getBlock()).timestamp;
    /// Coaching date is 3 days from now
    const coachingDate = currentBlockTimestamp + 3 * 24 * 60 * 60;
    const role_voucher = await lazyCoaching.createVoucher(
      contentCreator.address,
      coachingPrice,
      coachingDate,
      contentBuyer.address
    );
    // Buy coaching
    const purchaseTx = await contractPlatformTreasury.connect(backend).buyCoaching(role_voucher);
    const queueTxReceipt = await purchaseTx.wait();
    const queueTxEvent = queueTxReceipt.events.find((e) => e.event == "CoachingBought");
    const coachingSaleID = queueTxEvent.args[0];
    // Get the amount of UDAO in the buyer's wallet after buying coaching
    const buyerBalanceAfter = await contractUDAO.balanceOf(backend.address);
    const changeOnBalance = buyerBalance.sub(buyerBalanceAfter);
    // Get total price
    const totalCutRatio = await contractPlatformTreasury.coachTotalCut();
    const totalCut = coachingPrice.mul(totalCutRatio).div(100000);
    // Check if correct amount of UDAO was deducted from the buyer's wallet
    expect(changeOnBalance).to.equal(totalCut);
    // Get coaching struct
    const coachingStruct = await contractPlatformTreasury.coachSales(coachingSaleID);
    // Check if returned learner address is the same as the buyer address
    expect(coachingStruct.contentReceiver).to.equal(contentBuyer.address);
  });

  it("Should fail backend buy coaching to ownself if it is a fiat payment", async function () {
    await reDeploy();
    /// Set KYC
    await contractRoleManager.setKYC(contentCreator.address, true);
    await contractRoleManager.setKYC(contentBuyer.address, true);

    /// Send UDAO to the buyer's wallet
    await contractUDAO.transfer(backend.address, ethers.utils.parseEther("100.0"));
    /// Get the amount of UDAO in the buyer's wallet
    const buyerBalance = await contractUDAO.balanceOf(backend.address);
    /// Content buyer needs to give approval to the platformtreasury
    await contractUDAO
      .connect(backend)
      .approve(contractPlatformTreasury.address, ethers.utils.parseEther("999999999999.0"));
    // Create CoachingVoucher to be able to buy coaching
    const lazyCoaching = new LazyCoaching({
      contract: contractVoucherVerifier,
      signer: contentCreator,
    });
    const coachingPrice = ethers.utils.parseEther("1.0");
    /// Get the current block timestamp
    const currentBlockTimestamp = (await hre.ethers.provider.getBlock()).timestamp;
    /// Coaching date is 3 days from now
    const coachingDate = currentBlockTimestamp + 3 * 24 * 60 * 60;
    const role_voucher = await lazyCoaching.createVoucher(
      contentCreator.address,
      coachingPrice,
      coachingDate,
      backend.address
    );
    // Buy coaching
    const purchaseTx = contractPlatformTreasury.connect(backend).buyCoaching(role_voucher);
    //Fiat purchase requires a learner!
    expect(purchaseTx).to.be.revertedWith("Fiat purchase requires a learner!");
  });
});
