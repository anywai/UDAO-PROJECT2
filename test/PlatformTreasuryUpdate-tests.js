const { expect } = require("chai");
const hardhat = require("hardhat");
const { ethers } = hardhat;
const chai = require("chai");
const BN = require("bn.js");
const { DiscountedPurchase } = require("../lib/DiscountedPurchase");
const { LazyCoaching } = require("../lib/LazyCoaching");
const { RefundVoucher } = require("../lib/RefundVoucher");
const helpers = require("@nomicfoundation/hardhat-network-helpers");
const { Redeem } = require("../lib/Redeem");
const { deploy } = require("../lib/deployments");
const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");

// Enable and inject BN dependency
chai.use(require("chai-bn")(BN));
require("dotenv").config();

// @dev Proposal states
/*
 enum ProposalState {
        Pending,
        Active,
        Canceled,
        Defeated,
        Succeeded,
        Queued,
        Expired,
        Executed
    }
*/
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
}

async function checkAccountUDAOVpBalanceAndDelegate(contractUDAOVp, account) {
  const accountBalance = await contractUDAOVp.balanceOf(account.address);
  await expect(accountBalance).to.equal(ethers.utils.parseEther("300"));
  await contractUDAOVp.connect(account).delegate(account.address);
  const accountVotes = await contractUDAOVp.getVotes(account.address);
  await expect(accountVotes).to.equal(ethers.utils.parseEther("300"));
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

async function setupGovernanceMember(contractRoleManager, contractUDAO, contractUDAOStaker, governanceCandidate) {
  await contractRoleManager.setKYC(governanceCandidate.address, true);
  await contractUDAO.transfer(governanceCandidate.address, ethers.utils.parseEther("100.0"));
  await contractUDAO
    .connect(governanceCandidate)
    .approve(contractUDAOStaker.address, ethers.utils.parseEther("999999999999.0"));
  await expect(contractUDAOStaker.connect(governanceCandidate).stakeForGovernance(ethers.utils.parseEther("10"), 30))
    .to.emit(contractUDAOStaker, "GovernanceStake") // transfer from null address to minter
    .withArgs(governanceCandidate.address, ethers.utils.parseEther("10"), ethers.utils.parseEther("300"));
}
async function createContentVoucher(
  contractUDAOContent,
  backend,
  contentCreator,
  redeemer,
  contentParts,
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
    contentParts,
    0,
    "ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi",
    contentCreator.address,
    redeemer.address,
    redeemType,
    validationScore
  );
}

async function _createContent(
  contractRoleManager,
  contractUDAOContent,
  contractSupervision,
  backend,
  validator1,
  validator2,
  validator3,
  validator4,
  validator5,
  contentCreator,
  coachingEnabled = true,
  coachingRefundable = true,
  redeemType = 1,
  validationScore = 1
) {
  /// Set KYC
  await contractRoleManager.setKYC(contentCreator.address, true);

  const contentParts = [0, 1];
  const redeemer = contentCreator;
  /// Create Voucher from redeem.js and use it for creating content
  const createContentVoucherSample = await createContentVoucher(
    contractUDAOContent,
    backend,
    contentCreator,
    redeemer,
    contentParts,
    redeemType,
    validationScore
  );

  /// Redeem content
  await expect(contractUDAOContent.connect(contentCreator).createContent(createContentVoucherSample))
    .to.emit(contractUDAOContent, "Transfer") // transfer from null address to minter
    .withArgs(ethers.constants.AddressZero, contentCreator.address, 0);

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
}
async function makeContentPurchase(
  contractPlatformTreasury,
  contractVoucherVerifier,
  contentBuyer,
  contractRoleManager,
  contractUDAO,
  tokenIds,
  purchasedParts,
  pricesToPay,
  fullContentPurchase,
  validUntil,
  redeemers,
  giftReceiver,
  userIds
) {
  /// Set KYC
  await contractRoleManager.setKYC(contentBuyer.address, true);
  /// Send UDAO to the buyer's wallet
  await contractUDAO.transfer(contentBuyer.address, ethers.utils.parseEther("100.0"));
  /// Content buyer needs to give approval to the platformtreasury
  await contractUDAO
    .connect(contentBuyer)
    .approve(contractPlatformTreasury.address, ethers.utils.parseEther("999999999999.0"));
  /// Create content purchase vouchers
  /*
  ContentDiscountVoucher: [
        { name: "tokenId", type: "uint256" },
        { name: "fullContentPurchase", type: "bool" },
        { name: "purchasedParts", type: "uint256[]" },
        { name: "priceToPay", type: "uint256" },
        { name: "validUntil", type: "uint256" },
        { name: "redeemer", type: "address" },
        { name: "giftReceiver", type: "address" },
        { name: "userId", type: "string"}
      ],
  */
  const contentPurchaseVouchers = [];
  for (let i = 0; i < tokenIds.length; i++) {
    const contentPurchaseVoucher = await new DiscountedPurchase({
      contract: contractVoucherVerifier,
      signer: backend,
    }).createVoucher(
      tokenIds[i],
      fullContentPurchase[i],
      purchasedParts[i],
      pricesToPay[i],
      validUntil,
      redeemers[i],
      giftReceiver[i],
      userIds[i]
    );
    // Save the voucher to the array
    contentPurchaseVouchers.push(contentPurchaseVoucher);
  }
  /// Buy content
  const purchaseTx = await contractPlatformTreasury.connect(contentBuyer).buyContent(contentPurchaseVouchers);
  const queueTxReceipt = await purchaseTx.wait();
  const queueTxEvent = queueTxReceipt.events.find((e) => e.event == "ContentBought");
  const contentSaleID = queueTxEvent.args[2];
  const userId = queueTxEvent.args[0];
  // Expect that the userId is equal to the userId of the first voucher
  expect(userIds[0]).to.equal(userId);

  // Get content struct
  const contentStruct = await contractPlatformTreasury.contentSales(contentSaleID);
  // Check if returned learner address is the same as the buyer address
  expect(contentStruct.contentReceiver).to.equal(contentBuyer.address);
}
async function makeCoachingPurchase(
  contractRoleManager,
  contractUDAO,
  contractPlatformTreasury,
  contentBuyer,
  contentCreator,
  coachingPrice
) {
  /// Make coaching purchase and finalize it
  // Set KYC
  await contractRoleManager.setKYC(contentBuyer.address, true);
  // Send some UDAO to contentBuyer
  await contractUDAO.transfer(contentBuyer.address, ethers.utils.parseEther("100.0"));
  // Content buyer needs to give approval to the platformtreasury
  await contractUDAO
    .connect(contentBuyer)
    .approve(contractPlatformTreasury.address, ethers.utils.parseEther("999999999999.0"));

  // Create CoachingVoucher to be able to buy coaching
  const lazyCoaching = new LazyCoaching({
    contract: contractVoucherVerifier,
    signer: backend,
  });
  /// Get the current block timestamp
  const currentBlockTimestamp = (await hre.ethers.provider.getBlock()).timestamp;
  /// Coaching date is 3 days from now
  const coachingDate = currentBlockTimestamp + 3 * 24 * 60 * 60;
  const role_voucher = await lazyCoaching.createVoucher(
    contentCreator.address,
    coachingPrice,
    coachingDate,
    contentBuyer.address,
    "c8d53630-233a-4f95-90cb-4df253ae9283"
  );
  // Buy coaching
  const purchaseTx = await contractPlatformTreasury.connect(contentBuyer).buyCoaching(role_voucher);
  const queueTxReceipt = await purchaseTx.wait();
  const queueTxEvent = queueTxReceipt.events.find((e) => e.event == "CoachingBought");
  const coachingSaleID = queueTxEvent.args[1];
  // Get coaching struct
  const coachingStruct = await contractPlatformTreasury.coachSales(coachingSaleID);
  // Check if returned learner address is the same as the buyer address
  expect(coachingStruct.contentReceiver).to.equal(contentBuyer.address);
  return coachingSaleID;
}

describe("Platform Treasury Updated General", function () {
  it("Should put the instructor earnings in the correct index with correct amount", async function () {
    const consoleLogOn = true;
    await reDeploy();
    /// KYC content creator and content buyers
    await contractRoleManager.setKYC(contentCreator.address, true);
    await contractRoleManager.setKYC(contentBuyer1.address, true);
    await contractRoleManager.setKYC(contentBuyer2.address, true);
    await contractRoleManager.setKYC(contentBuyer3.address, true);
    await contractRoleManager.setKYC(validator1.address, true);
    await contractRoleManager.setKYC(validator2.address, true);
    await contractRoleManager.setKYC(validator3.address, true);
    await contractRoleManager.setKYC(validator4.address, true);
    await contractRoleManager.setKYC(validator5.address, true);

    // Define the instructer balance variables
    let currentBlockTimestampIndex;

    /// Create content
    // Create content
    const contentParts = [0, 1];
    const redeemer = contentCreator;
    // Create content voucher
    const createContentVoucherSample = await createContentVoucher(
      contractUDAOContent,
      backend,
      contentCreator,
      redeemer,
      contentParts,
      (redeemType = 1),
      (validationScore = 1)
    );
    // Create content with voucher
    await expect(contractUDAOContent.connect(contentCreator).createContent(createContentVoucherSample))
      .to.emit(contractUDAOContent, "Transfer") // transfer from null address to minter
      .withArgs(ethers.constants.AddressZero, contentCreator.address, 1);

    // common parts in the purchase voucher
    const tokenIds = [1];
    const purchasedParts = [[1]];
    const giftReceiver = [ethers.constants.AddressZero];
    const fullContentPurchase = [false];
    const pricesToPay = [ethers.utils.parseEther("1")];
    const validUntil = Date.now() + 999999999;
    const userIds = ["c8d53630-233a-4f95-90cb-4df253ae9283"];

    // Make a content purchase
    const redeemers = [contentBuyer1.address];
    await makeContentPurchase(
      contractPlatformTreasury,
      contractVoucherVerifier,
      contentBuyer1,
      contractRoleManager,
      contractUDAO,
      tokenIds,
      purchasedParts,
      pricesToPay,
      fullContentPurchase,
      validUntil,
      redeemers,
      giftReceiver,
      userIds
    );

    // Get current refund window
    const refundWindow = await contractPlatformTreasury.refundWindow();

    // Get the instructer balance array before withdrawal
    let instructorLockedBalanceArrayBN = [];
    for (let i = 0; i < refundWindow; i++) {
      instructorLockedBalanceArrayBN[i] = ethers.utils.formatEther(
        await contractPlatformTreasury.instLockedBalance(contentCreator.address, i)
      );
    }

    // Get current blocks timestamp
    currentBlockTimestampIndex = Math.floor(
      ((await hre.ethers.provider.getBlock()).timestamp % (refundWindow * 86400)) / 86400
    );
    /// @dev Calculate amount of instructor should have receive
    // Get total price
    const totalPrice = pricesToPay[0];
    // Get contentFoundCut
    const _contentFoundCut = await contractPlatformTreasury.contentFoundCut();
    const contentFoundCut = totalPrice.mul(_contentFoundCut).div(100000);
    // Get contentGoverCut
    const _contentGoverCut = await contractPlatformTreasury.contentGoverCut();
    const contentGoverCut = totalPrice.mul(_contentGoverCut).div(100000);
    // Get contentJurorCut
    const _contentJurorCut = await contractPlatformTreasury.contentJurorCut();
    const contentJurorCut = totalPrice.mul(_contentJurorCut).div(100000);
    // Get contentValidCut
    const _contentValidCut = await contractPlatformTreasury.contentValidCut();
    const contentValidCut = totalPrice.mul(_contentValidCut).div(100000);
    // Get total cut
    const totalCut = contentGoverCut.add(contentJurorCut).add(contentValidCut).add(contentFoundCut);
    // Use total cut to get what instructor should receive and check if it is recorded in the correct index
    expect(instructorLockedBalanceArrayBN[currentBlockTimestampIndex]).to.equal(
      ethers.utils.formatEther(pricesToPay[0].sub(totalCut))
    );
  });

  it("Should put the instructor's 2nd sale that happened 1 day after the 1st sale in the correct index", async function () {
    const consoleLogOn = true;
    await reDeploy();
    /// KYC content creator and content buyers
    await contractRoleManager.setKYC(contentCreator.address, true);
    await contractRoleManager.setKYC(contentBuyer1.address, true);
    await contractRoleManager.setKYC(contentBuyer2.address, true);
    await contractRoleManager.setKYC(contentBuyer3.address, true);
    await contractRoleManager.setKYC(validator1.address, true);
    await contractRoleManager.setKYC(validator2.address, true);
    await contractRoleManager.setKYC(validator3.address, true);
    await contractRoleManager.setKYC(validator4.address, true);
    await contractRoleManager.setKYC(validator5.address, true);

    // Define the instructer balance variables
    let currentBlockTimestampIndex;

    /// @dev Create 2 contents
    // Create content 1
    const contentParts = [0, 1];
    const redeemer = contentCreator;
    // Create content voucher
    const createContentVoucherSample = await createContentVoucher(
      contractUDAOContent,
      backend,
      contentCreator,
      redeemer,
      contentParts,
      (redeemType = 1),
      (validationScore = 1)
    );
    // Create content with voucher
    await expect(contractUDAOContent.connect(contentCreator).createContent(createContentVoucherSample))
      .to.emit(contractUDAOContent, "Transfer") // transfer from null address to minter
      .withArgs(ethers.constants.AddressZero, contentCreator.address, 1);
    // Create content 1
    const contentParts2 = [0, 1];
    const redeemer2 = contentCreator;
    // Create content voucher
    const createContentVoucherSample2 = await createContentVoucher(
      contractUDAOContent,
      backend,
      contentCreator,
      redeemer2,
      contentParts2,
      (redeemType = 1),
      (validationScore = 1)
    );
    // Create content with voucher
    await expect(contractUDAOContent.connect(contentCreator).createContent(createContentVoucherSample2))
      .to.emit(contractUDAOContent, "Transfer") // transfer from null address to minter
      .withArgs(ethers.constants.AddressZero, contentCreator.address, 2);

    // common parts in the purchase voucher
    const tokenIds = [1];
    const purchasedParts = [[1]];
    const giftReceiver = [ethers.constants.AddressZero];
    const fullContentPurchase = [true];
    const pricesToPay = [ethers.utils.parseEther("1")];
    const validUntil = Date.now() + 999999999;
    const userIds = ["c8d53630-233a-4f95-90cb-4df253ae9283"];

    // Make a content purchase
    const redeemers = [contentBuyer1.address];
    await makeContentPurchase(
      contractPlatformTreasury,
      contractVoucherVerifier,
      contentBuyer1,
      contractRoleManager,
      contractUDAO,
      tokenIds,
      purchasedParts,
      pricesToPay,
      fullContentPurchase,
      validUntil,
      redeemers,
      giftReceiver,
      userIds
    );

    // Get current refund window
    const refundWindow = await contractPlatformTreasury.refundWindow();

    // Get the instructer balance array before withdrawal
    let instructorLockedBalanceArrayBN = [];
    for (let i = 0; i < refundWindow; i++) {
      instructorLockedBalanceArrayBN[i] = ethers.utils.formatEther(
        await contractPlatformTreasury.instLockedBalance(contentCreator.address, i)
      );
    }

    // Get current blocks timestamp
    currentBlockTimestampIndex = Math.floor(
      ((await hre.ethers.provider.getBlock()).timestamp % (refundWindow * 86400)) / 86400
    );
    /// @dev Calculate amount of instructor should have receive
    // Get total price
    const totalPrice = pricesToPay[0];
    // Get contentFoundCut
    const _contentFoundCut = await contractPlatformTreasury.contentFoundCut();
    const contentFoundCut = totalPrice.mul(_contentFoundCut).div(100000);
    // Get contentGoverCut
    const _contentGoverCut = await contractPlatformTreasury.contentGoverCut();
    const contentGoverCut = totalPrice.mul(_contentGoverCut).div(100000);
    // Get contentJurorCut
    const _contentJurorCut = await contractPlatformTreasury.contentJurorCut();
    const contentJurorCut = totalPrice.mul(_contentJurorCut).div(100000);
    // Get contentValidCut
    const _contentValidCut = await contractPlatformTreasury.contentValidCut();
    const contentValidCut = totalPrice.mul(_contentValidCut).div(100000);
    // Get total cut
    const totalCut = contentGoverCut.add(contentJurorCut).add(contentValidCut).add(contentFoundCut);
    // Use total cut to get what instructor should receive and check if it is recorded in the correct index
    expect(instructorLockedBalanceArrayBN[currentBlockTimestampIndex]).to.equal(
      ethers.utils.formatEther(pricesToPay[0].sub(totalCut))
    );
    // skip 1 day
    const numBlocksToMine0 = Math.ceil((1 * 24 * 60 * 60) / 2);
    await hre.network.provider.send("hardhat_mine", [`0x${numBlocksToMine0.toString(16)}`, "0x2"]);

    // common parts in the purchase voucher
    const tokenIds2 = [2];
    const pricesToPay2 = [ethers.utils.parseEther("2")];

    // Make a content purchase
    await makeContentPurchase(
      contractPlatformTreasury,
      contractVoucherVerifier,
      contentBuyer1,
      contractRoleManager,
      contractUDAO,
      tokenIds2,
      purchasedParts,
      pricesToPay2,
      fullContentPurchase,
      validUntil,
      redeemers,
      giftReceiver,
      userIds
    );

    // Get current blocks timestamp
    currentBlockTimestampIndex = Math.floor(
      ((await hre.ethers.provider.getBlock()).timestamp % (refundWindow * 86400)) / 86400
    );
    //Get the instructer balance before withdrawal
    let instructorLockedBalanceArrayBN2 = [];
    for (let i = 0; i < refundWindow; i++) {
      instructorLockedBalanceArrayBN2[i] = ethers.utils.formatEther(
        await contractPlatformTreasury.instLockedBalance(contentCreator.address, i)
      );
    }
    /// @dev Calculate amount of instructor should have receive
    // Get total price
    const totalPrice2 = pricesToPay2[0];
    // Get contentFoundCut
    const contentFoundCut2 = totalPrice2.mul(_contentFoundCut).div(100000);
    // Get contentGoverCut
    const contentGoverCut2 = totalPrice2.mul(_contentGoverCut).div(100000);
    // Get contentJurorCut
    const contentJurorCut2 = totalPrice2.mul(_contentJurorCut).div(100000);
    // Get contentValidCut
    const contentValidCut2 = totalPrice2.mul(_contentValidCut).div(100000);
    // Get total cut
    const totalCut2 = contentGoverCut2.add(contentJurorCut2).add(contentValidCut2).add(contentFoundCut2);
    // Use total cut to get what instructor should receive and check if it is recorded in the correct index
    expect(instructorLockedBalanceArrayBN2[currentBlockTimestampIndex]).to.equal(
      ethers.utils.formatEther(pricesToPay2[0].sub(totalCut2))
    );
  });

  it("Should put the instructor's 3rd sale that happened 1 day after the 2nd sale in the correct index", async function () {
    const consoleLogOn = true;
    await reDeploy();
    /// KYC content creator and content buyers
    await contractRoleManager.setKYC(contentCreator.address, true);
    await contractRoleManager.setKYC(contentBuyer1.address, true);
    await contractRoleManager.setKYC(contentBuyer2.address, true);
    await contractRoleManager.setKYC(contentBuyer3.address, true);
    await contractRoleManager.setKYC(validator1.address, true);
    await contractRoleManager.setKYC(validator2.address, true);
    await contractRoleManager.setKYC(validator3.address, true);
    await contractRoleManager.setKYC(validator4.address, true);
    await contractRoleManager.setKYC(validator5.address, true);

    // Define the instructer balance variables
    let currentBlockTimestampIndex;

    /// @dev Create 3 contents
    // Create content 1
    const contentParts = [0, 1];
    const redeemer = contentCreator;
    // Create content voucher
    const createContentVoucherSample = await createContentVoucher(
      contractUDAOContent,
      backend,
      contentCreator,
      redeemer,
      contentParts,
      (redeemType = 1),
      (validationScore = 1)
    );
    // Create content with voucher
    await expect(contractUDAOContent.connect(contentCreator).createContent(createContentVoucherSample))
      .to.emit(contractUDAOContent, "Transfer") // transfer from null address to minter
      .withArgs(ethers.constants.AddressZero, contentCreator.address, 1);
    // Create content 2
    const contentParts2 = [0, 1];
    const redeemer2 = contentCreator;
    // Create content voucher
    const createContentVoucherSample2 = await createContentVoucher(
      contractUDAOContent,
      backend,
      contentCreator,
      redeemer2,
      contentParts2,
      (redeemType = 1),
      (validationScore = 1)
    );
    // Create content with voucher
    await expect(contractUDAOContent.connect(contentCreator).createContent(createContentVoucherSample2))
      .to.emit(contractUDAOContent, "Transfer") // transfer from null address to minter
      .withArgs(ethers.constants.AddressZero, contentCreator.address, 2);
    // Create content 3
    const contentParts3 = [0, 1];
    const redeemer3 = contentCreator;
    // Create content voucher
    const createContentVoucherSample3 = await createContentVoucher(
      contractUDAOContent,
      backend,
      contentCreator,
      redeemer3,
      contentParts3,
      (redeemType = 1),
      (validationScore = 1)
    );
    // Create content with voucher
    await expect(contractUDAOContent.connect(contentCreator).createContent(createContentVoucherSample3))
      .to.emit(contractUDAOContent, "Transfer") // transfer from null address to minter
      .withArgs(ethers.constants.AddressZero, contentCreator.address, 3);

    // common parts in the purchase voucher
    const tokenIds = [1];
    const purchasedParts = [[1]];
    const giftReceiver = [ethers.constants.AddressZero];
    const fullContentPurchase = [true];
    const pricesToPay = [ethers.utils.parseEther("1")];
    const validUntil = Date.now() + 999999999;
    const userIds = ["c8d53630-233a-4f95-90cb-4df253ae9283"];

    // Make a content purchase
    const redeemers = [contentBuyer1.address];
    await makeContentPurchase(
      contractPlatformTreasury,
      contractVoucherVerifier,
      contentBuyer1,
      contractRoleManager,
      contractUDAO,
      tokenIds,
      purchasedParts,
      pricesToPay,
      fullContentPurchase,
      validUntil,
      redeemers,
      giftReceiver,
      userIds
    );

    // Get current refund window
    const refundWindow = await contractPlatformTreasury.refundWindow();

    // Get the instructer balance array before withdrawal
    let instructorLockedBalanceArrayBN = [];
    for (let i = 0; i < refundWindow; i++) {
      instructorLockedBalanceArrayBN[i] = ethers.utils.formatEther(
        await contractPlatformTreasury.instLockedBalance(contentCreator.address, i)
      );
    }

    // Get current blocks timestamp
    currentBlockTimestampIndex = Math.floor(
      ((await hre.ethers.provider.getBlock()).timestamp % (refundWindow * 86400)) / 86400
    );
    /// @dev Calculate amount of instructor should have receive
    // Get total price
    const totalPrice = pricesToPay[0];
    // Get contentFoundCut
    const _contentFoundCut = await contractPlatformTreasury.contentFoundCut();
    const contentFoundCut = totalPrice.mul(_contentFoundCut).div(100000);
    // Get contentGoverCut
    const _contentGoverCut = await contractPlatformTreasury.contentGoverCut();
    const contentGoverCut = totalPrice.mul(_contentGoverCut).div(100000);
    // Get contentJurorCut
    const _contentJurorCut = await contractPlatformTreasury.contentJurorCut();
    const contentJurorCut = totalPrice.mul(_contentJurorCut).div(100000);
    // Get contentValidCut
    const _contentValidCut = await contractPlatformTreasury.contentValidCut();
    const contentValidCut = totalPrice.mul(_contentValidCut).div(100000);
    // Get total cut
    const totalCut = contentGoverCut.add(contentJurorCut).add(contentValidCut).add(contentFoundCut);
    // Use total cut to get what instructor should receive and check if it is recorded in the correct index
    expect(instructorLockedBalanceArrayBN[currentBlockTimestampIndex]).to.equal(
      ethers.utils.formatEther(pricesToPay[0].sub(totalCut))
    );
    // skip 1 day
    const numBlocksToMine0 = Math.ceil((1 * 24 * 60 * 60) / 2);
    await hre.network.provider.send("hardhat_mine", [`0x${numBlocksToMine0.toString(16)}`, "0x2"]);

    // common parts in the purchase voucher
    const tokenIds2 = [2];
    const pricesToPay2 = [ethers.utils.parseEther("2")];

    // Make a content purchase
    await makeContentPurchase(
      contractPlatformTreasury,
      contractVoucherVerifier,
      contentBuyer1,
      contractRoleManager,
      contractUDAO,
      tokenIds2,
      purchasedParts,
      pricesToPay2,
      fullContentPurchase,
      validUntil,
      redeemers,
      giftReceiver,
      userIds
    );

    // Get current blocks timestamp
    currentBlockTimestampIndex = Math.floor(
      ((await hre.ethers.provider.getBlock()).timestamp % (refundWindow * 86400)) / 86400
    );
    //Get the instructer balance before withdrawal
    let instructorLockedBalanceArrayBN2 = [];
    for (let i = 0; i < refundWindow; i++) {
      instructorLockedBalanceArrayBN2[i] = ethers.utils.formatEther(
        await contractPlatformTreasury.instLockedBalance(contentCreator.address, i)
      );
    }
    /// @dev Calculate amount of instructor should have receive
    // Get total price
    const totalPrice2 = pricesToPay2[0];
    // Get contentFoundCut
    const contentFoundCut2 = totalPrice2.mul(_contentFoundCut).div(100000);
    // Get contentGoverCut
    const contentGoverCut2 = totalPrice2.mul(_contentGoverCut).div(100000);
    // Get contentJurorCut
    const contentJurorCut2 = totalPrice2.mul(_contentJurorCut).div(100000);
    // Get contentValidCut
    const contentValidCut2 = totalPrice2.mul(_contentValidCut).div(100000);
    // Get total cut
    const totalCut2 = contentGoverCut2.add(contentJurorCut2).add(contentValidCut2).add(contentFoundCut2);
    // Use total cut to get what instructor should receive and check if it is recorded in the correct index
    expect(instructorLockedBalanceArrayBN2[currentBlockTimestampIndex]).to.equal(
      ethers.utils.formatEther(pricesToPay2[0].sub(totalCut2))
    );
    // skip 1 day
    const numBlocksToMine1 = Math.ceil((1 * 24 * 60 * 60) / 2);
    await hre.network.provider.send("hardhat_mine", [`0x${numBlocksToMine1.toString(16)}`, "0x2"]);

    // common parts in the purchase voucher
    const tokenIds3 = [3];
    const pricesToPay3 = [ethers.utils.parseEther("3")];

    // Make a content purchase
    await makeContentPurchase(
      contractPlatformTreasury,
      contractVoucherVerifier,
      contentBuyer1,
      contractRoleManager,
      contractUDAO,
      tokenIds3,
      purchasedParts,
      pricesToPay3,
      fullContentPurchase,
      validUntil,
      redeemers,
      giftReceiver,
      userIds
    );

    // Get current blocks timestamp
    currentBlockTimestampIndex = Math.floor(
      ((await hre.ethers.provider.getBlock()).timestamp % (refundWindow * 86400)) / 86400
    );
    //Get the instructer balance before withdrawal
    let instructorLockedBalanceArrayBN3 = [];
    for (let i = 0; i < refundWindow; i++) {
      instructorLockedBalanceArrayBN3[i] = ethers.utils.formatEther(
        await contractPlatformTreasury.instLockedBalance(contentCreator.address, i)
      );
    }
    /// @dev Calculate amount of instructor should have receive
    // Get total price
    const totalPrice3 = pricesToPay3[0];
    // Get contentFoundCut
    const contentFoundCut3 = totalPrice3.mul(_contentFoundCut).div(100000);
    // Get contentGoverCut
    const contentGoverCut3 = totalPrice3.mul(_contentGoverCut).div(100000);
    // Get contentJurorCut
    const contentJurorCut3 = totalPrice3.mul(_contentJurorCut).div(100000);
    // Get contentValidCut
    const contentValidCut3 = totalPrice3.mul(_contentValidCut).div(100000);
    // Get total cut
    const totalCut3 = contentGoverCut3.add(contentJurorCut3).add(contentValidCut3).add(contentFoundCut3);
    // Use total cut to get what instructor should receive and check if it is recorded in the correct index
    expect(instructorLockedBalanceArrayBN3[currentBlockTimestampIndex]).to.equal(
      ethers.utils.formatEther(pricesToPay3[0].sub(totalCut3))
    );
  });

  it("Should put the instructor's 1st sale into the correct index even after a refund window change and before precaution withdrawal period", async function () {
    const consoleLogOn = true;
    await reDeploy();
    /// KYC content creator and content buyers
    await contractRoleManager.setKYC(contentCreator.address, true);
    await contractRoleManager.setKYC(contentBuyer1.address, true);
    await contractRoleManager.setKYC(contentBuyer2.address, true);
    await contractRoleManager.setKYC(contentBuyer3.address, true);
    await contractRoleManager.setKYC(validator1.address, true);
    await contractRoleManager.setKYC(validator2.address, true);
    await contractRoleManager.setKYC(validator3.address, true);
    await contractRoleManager.setKYC(validator4.address, true);
    await contractRoleManager.setKYC(validator5.address, true);

    // Define the instructer balance variables
    let currentBlockTimestampIndex;

    /// Create content
    // Create content
    const contentParts = [0, 1];
    const redeemer = contentCreator;
    // Create content voucher
    const createContentVoucherSample = await createContentVoucher(
      contractUDAOContent,
      backend,
      contentCreator,
      redeemer,
      contentParts,
      (redeemType = 1),
      (validationScore = 1)
    );
    // Create content with voucher
    await expect(contractUDAOContent.connect(contentCreator).createContent(createContentVoucherSample))
      .to.emit(contractUDAOContent, "Transfer") // transfer from null address to minter
      .withArgs(ethers.constants.AddressZero, contentCreator.address, 1);

    /// @dev Change the refund window to 5 days
    await contractPlatformTreasury.connect(backend).changeRefundWindow(5);
    // common parts in the purchase voucher
    const tokenIds = [1];
    const purchasedParts = [[1]];
    const giftReceiver = [ethers.constants.AddressZero];
    const fullContentPurchase = [true];
    const pricesToPay = [ethers.utils.parseEther("1")];
    const validUntil = Date.now() + 999999999;
    const userIds = ["c8d53630-233a-4f95-90cb-4df253ae9283"];

    // Make a content purchase
    const redeemers = [contentBuyer1.address];
    await makeContentPurchase(
      contractPlatformTreasury,
      contractVoucherVerifier,
      contentBuyer1,
      contractRoleManager,
      contractUDAO,
      tokenIds,
      purchasedParts,
      pricesToPay,
      fullContentPurchase,
      validUntil,
      redeemers,
      giftReceiver,
      userIds
    );

    // Get current refund window
    const refundWindow = await contractPlatformTreasury.refundWindow();

    // Get the instructer balance array before withdrawal
    let instructorLockedBalanceArrayBN = [];
    for (let i = 0; i < refundWindow; i++) {
      instructorLockedBalanceArrayBN[i] = ethers.utils.formatEther(
        await contractPlatformTreasury.instLockedBalance(contentCreator.address, i)
      );
    }
    // Get the content locked pool array before withdrawal
    let contentLockedBalanceArrayBN = [];
    for (let i = 0; i < refundWindow; i++) {
      contentLockedBalanceArrayBN[i] = ethers.utils.formatEther(await contractPlatformTreasury.contentCutLockedPool(i));
    }

    // Get current blocks timestamp
    currentBlockTimestampIndex = Math.floor(
      ((await hre.ethers.provider.getBlock()).timestamp % (refundWindow * 86400)) / 86400
    );
    /// @dev Calculate amount of instructor should have receive
    // Get total price
    const totalPrice = pricesToPay[0];
    // Get contentFoundCut
    const _contentFoundCut = await contractPlatformTreasury.contentFoundCut();
    const contentFoundCut = totalPrice.mul(_contentFoundCut).div(100000);
    // Get contentGoverCut
    const _contentGoverCut = await contractPlatformTreasury.contentGoverCut();
    const contentGoverCut = totalPrice.mul(_contentGoverCut).div(100000);
    // Get contentJurorCut
    const _contentJurorCut = await contractPlatformTreasury.contentJurorCut();
    const contentJurorCut = totalPrice.mul(_contentJurorCut).div(100000);
    // Get contentValidCut
    const _contentValidCut = await contractPlatformTreasury.contentValidCut();
    const contentValidCut = totalPrice.mul(_contentValidCut).div(100000);
    // Get total cut
    const totalCut = contentGoverCut.add(contentJurorCut).add(contentValidCut).add(contentFoundCut);
    // Use total cut to get what instructor should receive and check if it is recorded in the correct index
    expect(instructorLockedBalanceArrayBN[currentBlockTimestampIndex]).to.equal(
      ethers.utils.formatEther(pricesToPay[0].sub(totalCut))
    );
    expect(contentLockedBalanceArrayBN[currentBlockTimestampIndex]).to.equal(ethers.utils.formatEther(totalCut));
  });

  it("Should put the instructor's 2nd sale in the correct index after a refund window change", async function () {
    const consoleLogOn = true;
    await reDeploy();
    /// KYC content creator and content buyers
    await contractRoleManager.setKYC(contentCreator.address, true);
    await contractRoleManager.setKYC(contentBuyer1.address, true);
    await contractRoleManager.setKYC(contentBuyer2.address, true);
    await contractRoleManager.setKYC(contentBuyer3.address, true);
    await contractRoleManager.setKYC(validator1.address, true);
    await contractRoleManager.setKYC(validator2.address, true);
    await contractRoleManager.setKYC(validator3.address, true);
    await contractRoleManager.setKYC(validator4.address, true);
    await contractRoleManager.setKYC(validator5.address, true);

    // Define the instructer balance variables
    let currentBlockTimestampIndex;

    /// @dev Create 2 contents
    // Create content 1
    const contentParts = [0, 1];
    const redeemer = contentCreator;
    // Create content voucher
    const createContentVoucherSample = await createContentVoucher(
      contractUDAOContent,
      backend,
      contentCreator,
      redeemer,
      contentParts,
      (redeemType = 1),
      (validationScore = 1)
    );
    // Create content with voucher
    await expect(contractUDAOContent.connect(contentCreator).createContent(createContentVoucherSample))
      .to.emit(contractUDAOContent, "Transfer") // transfer from null address to minter
      .withArgs(ethers.constants.AddressZero, contentCreator.address, 1);
    // Create content 2
    const contentParts2 = [0, 1];
    const redeemer2 = contentCreator;
    // Create content voucher
    const createContentVoucherSample2 = await createContentVoucher(
      contractUDAOContent,
      backend,
      contentCreator,
      redeemer2,
      contentParts2,
      (redeemType = 1),
      (validationScore = 1)
    );
    // Create content with voucher
    await expect(contractUDAOContent.connect(contentCreator).createContent(createContentVoucherSample2))
      .to.emit(contractUDAOContent, "Transfer") // transfer from null address to minter
      .withArgs(ethers.constants.AddressZero, contentCreator.address, 2);

    // common parts in the purchase voucher
    const tokenIds = [1];
    const purchasedParts = [[1]];
    const giftReceiver = [ethers.constants.AddressZero];
    const fullContentPurchase = [true];
    const pricesToPay = [ethers.utils.parseEther("1")];
    const validUntil = Date.now() + 999999999;
    const userIds = ["c8d53630-233a-4f95-90cb-4df253ae9283"];

    // Make a content purchase
    const redeemers = [contentBuyer1.address];
    await makeContentPurchase(
      contractPlatformTreasury,
      contractVoucherVerifier,
      contentBuyer1,
      contractRoleManager,
      contractUDAO,
      tokenIds,
      purchasedParts,
      pricesToPay,
      fullContentPurchase,
      validUntil,
      redeemers,
      giftReceiver,
      userIds
    );

    // Get current refund window
    const refundWindow = await contractPlatformTreasury.refundWindow();

    // Get the instructer balance array before withdrawal
    let instructorLockedBalanceArrayBN = [];
    for (let i = 0; i < refundWindow; i++) {
      instructorLockedBalanceArrayBN[i] = ethers.utils.formatEther(
        await contractPlatformTreasury.instLockedBalance(contentCreator.address, i)
      );
    }
    // Get the content locked pool array before withdrawal
    let contentLockedBalanceArrayBN = [];
    for (let i = 0; i < refundWindow; i++) {
      contentLockedBalanceArrayBN[i] = ethers.utils.formatEther(await contractPlatformTreasury.contentCutLockedPool(i));
    }

    // Get current blocks timestamp
    currentBlockTimestampIndex = Math.floor(
      ((await hre.ethers.provider.getBlock()).timestamp % (refundWindow * 86400)) / 86400
    );
    /// @dev Calculate amount of instructor should have receive
    // Get total price
    const totalPrice = pricesToPay[0];
    // Get contentFoundCut
    const _contentFoundCut = await contractPlatformTreasury.contentFoundCut();
    const contentFoundCut = totalPrice.mul(_contentFoundCut).div(100000);
    // Get contentGoverCut
    const _contentGoverCut = await contractPlatformTreasury.contentGoverCut();
    const contentGoverCut = totalPrice.mul(_contentGoverCut).div(100000);
    // Get contentJurorCut
    const _contentJurorCut = await contractPlatformTreasury.contentJurorCut();
    const contentJurorCut = totalPrice.mul(_contentJurorCut).div(100000);
    // Get contentValidCut
    const _contentValidCut = await contractPlatformTreasury.contentValidCut();
    const contentValidCut = totalPrice.mul(_contentValidCut).div(100000);
    // Get total cut
    const totalCut = contentGoverCut.add(contentJurorCut).add(contentValidCut).add(contentFoundCut);
    // Use total cut to get what instructor should receive and check if it is recorded in the correct index
    expect(instructorLockedBalanceArrayBN[currentBlockTimestampIndex]).to.equal(
      ethers.utils.formatEther(pricesToPay[0].sub(totalCut))
    );
    expect(contentLockedBalanceArrayBN[currentBlockTimestampIndex]).to.equal(ethers.utils.formatEther(totalCut));
    /// @dev Change the refund window to 5 days
    await contractPlatformTreasury.connect(backend).changeRefundWindow(5);
    // Get the current refund window
    const refundWindow2 = await contractPlatformTreasury.refundWindow();
    /// @dev Check the current instructer locked balance according to old refund window since it is not updated yet
    const instructorLockedBalanceArrayBN2 = [];
    for (let i = 0; i < refundWindow; i++) {
      instructorLockedBalanceArrayBN2[i] = ethers.utils.formatEther(
        await contractPlatformTreasury.instLockedBalance(contentCreator.address, i)
      );
    }
    /// @dev Check the current content locked pool
    const contentLockedBalanceArrayBN2 = [];
    for (let i = 0; i < refundWindow2; i++) {
      contentLockedBalanceArrayBN2[i] = ethers.utils.formatEther(
        await contractPlatformTreasury.contentCutLockedPool(i)
      );
    }
    expect(instructorLockedBalanceArrayBN2[currentBlockTimestampIndex]).to.equal(
      ethers.utils.formatEther(pricesToPay[0].sub(totalCut))
    );
    // Get current blocks timestamp to check if the content cut is recorded in the correct index
    currentBlockTimestampIndex = Math.floor(
      ((await hre.ethers.provider.getBlock()).timestamp % (refundWindow2 * 86400)) / 86400
    );
    expect(contentLockedBalanceArrayBN2[currentBlockTimestampIndex]).to.equal(ethers.utils.formatEther(totalCut));
    // Make a content purchase
    const redeemers2 = [contentBuyer1.address];
    const tokenIds2 = [2];
    const pricesToPay2 = [ethers.utils.parseEther("2")];
    await makeContentPurchase(
      contractPlatformTreasury,
      contractVoucherVerifier,
      contentBuyer1,
      contractRoleManager,
      contractUDAO,
      tokenIds2,
      purchasedParts,
      pricesToPay2,
      fullContentPurchase,
      validUntil,
      redeemers2,
      giftReceiver,
      userIds
    );

    // Get the instructer balance array before withdrawal
    let instructorLockedBalanceArrayBN3 = [];
    for (let i = 0; i < refundWindow2; i++) {
      instructorLockedBalanceArrayBN3[i] = ethers.utils.formatEther(
        await contractPlatformTreasury.instLockedBalance(contentCreator.address, i)
      );
    }
    // Get the content locked pool array before withdrawal
    let contentLockedBalanceArrayBN3 = [];
    for (let i = 0; i < refundWindow2; i++) {
      contentLockedBalanceArrayBN3[i] = ethers.utils.formatEther(
        await contractPlatformTreasury.contentCutLockedPool(i)
      );
    }
    // Get current blocks timestamp to check if the content cut is recorded in the correct index
    currentBlockTimestampIndex = Math.floor(
      ((await hre.ethers.provider.getBlock()).timestamp % (refundWindow2 * 86400)) / 86400
    );

    /// @dev Calculate amount of instructor should have receive
    // Get total price
    const totalPrice2 = pricesToPay2[0];
    // Get contentFoundCut
    const contentFoundCut2 = totalPrice2.mul(_contentFoundCut).div(100000);
    // Get contentGoverCut
    const contentGoverCut2 = totalPrice2.mul(_contentGoverCut).div(100000);
    // Get contentJurorCut
    const contentJurorCut2 = totalPrice2.mul(_contentJurorCut).div(100000);
    // Get contentValidCut
    const contentValidCut2 = totalPrice2.mul(_contentValidCut).div(100000);
    // Get total cut
    const totalCut2 = contentGoverCut2.add(contentJurorCut2).add(contentValidCut2).add(contentFoundCut2);

    expect(instructorLockedBalanceArrayBN3[currentBlockTimestampIndex]).to.equal(
      ethers.utils.formatEther(pricesToPay2[0].sub(totalCut2).add(pricesToPay[0].sub(totalCut)))
    );
    expect(contentLockedBalanceArrayBN3[currentBlockTimestampIndex]).to.equal(
      ethers.utils.formatEther(totalCut.add(totalCut2))
    );
  });

  it("Should put the instructor's 2nd sale in the correct index after a refund window change and 1 day later", async function () {
    const consoleLogOn = true;
    await reDeploy();
    /// KYC content creator and content buyers
    await contractRoleManager.setKYC(contentCreator.address, true);
    await contractRoleManager.setKYC(contentBuyer1.address, true);
    await contractRoleManager.setKYC(contentBuyer2.address, true);
    await contractRoleManager.setKYC(contentBuyer3.address, true);
    await contractRoleManager.setKYC(validator1.address, true);
    await contractRoleManager.setKYC(validator2.address, true);
    await contractRoleManager.setKYC(validator3.address, true);
    await contractRoleManager.setKYC(validator4.address, true);
    await contractRoleManager.setKYC(validator5.address, true);

    // Define the instructer balance variables
    let currentBlockTimestampIndex;

    /// @dev Create 2 contents
    // Create content 1
    const contentParts = [0, 1];
    const redeemer = contentCreator;
    // Create content voucher
    const createContentVoucherSample = await createContentVoucher(
      contractUDAOContent,
      backend,
      contentCreator,
      redeemer,
      contentParts,
      (redeemType = 1),
      (validationScore = 1)
    );
    // Create content with voucher
    await expect(contractUDAOContent.connect(contentCreator).createContent(createContentVoucherSample))
      .to.emit(contractUDAOContent, "Transfer") // transfer from null address to minter
      .withArgs(ethers.constants.AddressZero, contentCreator.address, 1);
    // Create content 2
    const contentParts2 = [0, 1];
    const redeemer2 = contentCreator;
    // Create content voucher
    const createContentVoucherSample2 = await createContentVoucher(
      contractUDAOContent,
      backend,
      contentCreator,
      redeemer2,
      contentParts2,
      (redeemType = 1),
      (validationScore = 1)
    );
    // Create content with voucher
    await expect(contractUDAOContent.connect(contentCreator).createContent(createContentVoucherSample2))
      .to.emit(contractUDAOContent, "Transfer") // transfer from null address to minter
      .withArgs(ethers.constants.AddressZero, contentCreator.address, 2);

    // common parts in the purchase voucher
    const tokenIds = [1];
    const purchasedParts = [[1]];
    const giftReceiver = [ethers.constants.AddressZero];
    const fullContentPurchase = [true];
    const pricesToPay = [ethers.utils.parseEther("1")];
    const validUntil = Date.now() + 999999999;
    const userIds = ["c8d53630-233a-4f95-90cb-4df253ae9283"];

    // Make a content purchase
    const redeemers = [contentBuyer1.address];
    await makeContentPurchase(
      contractPlatformTreasury,
      contractVoucherVerifier,
      contentBuyer1,
      contractRoleManager,
      contractUDAO,
      tokenIds,
      purchasedParts,
      pricesToPay,
      fullContentPurchase,
      validUntil,
      redeemers,
      giftReceiver,
      userIds
    );

    // Get current refund window
    const refundWindow = await contractPlatformTreasury.refundWindow();

    // Get the instructer balance array before withdrawal
    let instructorLockedBalanceArrayBN = [];
    for (let i = 0; i < refundWindow; i++) {
      instructorLockedBalanceArrayBN[i] = ethers.utils.formatEther(
        await contractPlatformTreasury.instLockedBalance(contentCreator.address, i)
      );
    }
    // Get the content locked pool array before withdrawal
    let contentLockedBalanceArrayBN = [];
    for (let i = 0; i < refundWindow; i++) {
      contentLockedBalanceArrayBN[i] = ethers.utils.formatEther(await contractPlatformTreasury.contentCutLockedPool(i));
    }

    // Get current blocks timestamp
    currentBlockTimestampIndex = Math.floor(
      ((await hre.ethers.provider.getBlock()).timestamp % (refundWindow * 86400)) / 86400
    );
    /// @dev Calculate amount of instructor should have receive
    // Get total price
    const totalPrice = pricesToPay[0];
    // Get contentFoundCut
    const _contentFoundCut = await contractPlatformTreasury.contentFoundCut();
    const contentFoundCut = totalPrice.mul(_contentFoundCut).div(100000);
    // Get contentGoverCut
    const _contentGoverCut = await contractPlatformTreasury.contentGoverCut();
    const contentGoverCut = totalPrice.mul(_contentGoverCut).div(100000);
    // Get contentJurorCut
    const _contentJurorCut = await contractPlatformTreasury.contentJurorCut();
    const contentJurorCut = totalPrice.mul(_contentJurorCut).div(100000);
    // Get contentValidCut
    const _contentValidCut = await contractPlatformTreasury.contentValidCut();
    const contentValidCut = totalPrice.mul(_contentValidCut).div(100000);
    // Get total cut
    const totalCut = contentGoverCut.add(contentJurorCut).add(contentValidCut).add(contentFoundCut);
    // Use total cut to get what instructor should receive and check if it is recorded in the correct index
    expect(instructorLockedBalanceArrayBN[currentBlockTimestampIndex]).to.equal(
      ethers.utils.formatEther(pricesToPay[0].sub(totalCut))
    );
    expect(contentLockedBalanceArrayBN[currentBlockTimestampIndex]).to.equal(ethers.utils.formatEther(totalCut));
    /// @dev Change the refund window to 5 days
    await contractPlatformTreasury.connect(backend).changeRefundWindow(5);
    // Get the current refund window
    const refundWindow2 = await contractPlatformTreasury.refundWindow();
    /// @dev Check the current instructer locked balance according to old refund window since it is not updated yet
    const instructorLockedBalanceArrayBN2 = [];
    for (let i = 0; i < refundWindow; i++) {
      instructorLockedBalanceArrayBN2[i] = ethers.utils.formatEther(
        await contractPlatformTreasury.instLockedBalance(contentCreator.address, i)
      );
    }
    /// @dev Check the current content locked pool
    const contentLockedBalanceArrayBN2 = [];
    for (let i = 0; i < refundWindow2; i++) {
      contentLockedBalanceArrayBN2[i] = ethers.utils.formatEther(
        await contractPlatformTreasury.contentCutLockedPool(i)
      );
    }
    expect(instructorLockedBalanceArrayBN2[currentBlockTimestampIndex]).to.equal(
      ethers.utils.formatEther(pricesToPay[0].sub(totalCut))
    );

    // Get current blocks timestamp to check if the content cut is recorded in the correct index
    currentBlockTimestampIndex = Math.floor(
      ((await hre.ethers.provider.getBlock()).timestamp % (refundWindow2 * 86400)) / 86400
    );
    expect(contentLockedBalanceArrayBN2[currentBlockTimestampIndex]).to.equal(ethers.utils.formatEther(totalCut)); //0.04
    // Skip 1 day
    const numBlocksToMine0 = Math.ceil((1 * 24 * 60 * 60) / 2);
    await hre.network.provider.send("hardhat_mine", [`0x${numBlocksToMine0.toString(16)}`, "0x2"]);
    // Make a content purchase
    const redeemers2 = [contentBuyer1.address];
    const tokenIds2 = [2];
    const pricesToPay2 = [ethers.utils.parseEther("2")];
    await makeContentPurchase(
      contractPlatformTreasury,
      contractVoucherVerifier,
      contentBuyer1,
      contractRoleManager,
      contractUDAO,
      tokenIds2,
      purchasedParts,
      pricesToPay2,
      fullContentPurchase,
      validUntil,
      redeemers2,
      giftReceiver,
      userIds
    );

    // Get the instructer balance array before withdrawal
    let instructorLockedBalanceArrayBN3 = [];
    for (let i = 0; i < refundWindow2; i++) {
      instructorLockedBalanceArrayBN3[i] = ethers.utils.formatEther(
        await contractPlatformTreasury.instLockedBalance(contentCreator.address, i)
      );
    }
    // Get the content locked pool array before withdrawal
    let contentLockedBalanceArrayBN3 = [];
    for (let i = 0; i < refundWindow2; i++) {
      contentLockedBalanceArrayBN3[i] = ethers.utils.formatEther(
        await contractPlatformTreasury.contentCutLockedPool(i)
      );
    }
    // Get current blocks timestamp to check if the content cut is recorded in the correct index
    currentBlockTimestampIndex = Math.floor(
      ((await hre.ethers.provider.getBlock()).timestamp % (refundWindow2 * 86400)) / 86400
    );

    /// @dev Calculate amount of instructor should have receive
    // Get total price
    const totalPrice2 = pricesToPay2[0];
    // Get contentFoundCut
    const contentFoundCut2 = totalPrice2.mul(_contentFoundCut).div(100000);
    // Get contentGoverCut
    const contentGoverCut2 = totalPrice2.mul(_contentGoverCut).div(100000);
    // Get contentJurorCut
    const contentJurorCut2 = totalPrice2.mul(_contentJurorCut).div(100000);
    // Get contentValidCut
    const contentValidCut2 = totalPrice2.mul(_contentValidCut).div(100000);
    // Get total cut
    const totalCut2 = contentGoverCut2.add(contentJurorCut2).add(contentValidCut2).add(contentFoundCut2);
    expect(instructorLockedBalanceArrayBN3[currentBlockTimestampIndex]).to.equal(
      ethers.utils.formatEther(pricesToPay2[0].sub(totalCut2).add(pricesToPay[0].sub(totalCut)))
    );
    /// @dev Cuts are not added together since the 2nd sale is 1 day later
    expect(contentLockedBalanceArrayBN3[currentBlockTimestampIndex]).to.equal(ethers.utils.formatEther(totalCut2));
    const lastcurrentBlockTimestampIndex =
      (currentBlockTimestampIndex - 1 + refundWindow2.toNumber()) % refundWindow2.toNumber();
    expect(contentLockedBalanceArrayBN3[lastcurrentBlockTimestampIndex]).to.equal(ethers.utils.formatEther(totalCut));
  });

  it("Should not allow anyone to withdraw after a refund window change and before precaution withdrawal timestamp", async function () {
    const consoleLogOn = true;
    await reDeploy();
    /// KYC content creator and content buyers
    await contractRoleManager.setKYC(contentCreator.address, true);
    await contractRoleManager.setKYC(contentBuyer1.address, true);
    await contractRoleManager.setKYC(contentBuyer2.address, true);
    await contractRoleManager.setKYC(contentBuyer3.address, true);
    await contractRoleManager.setKYC(validator1.address, true);
    await contractRoleManager.setKYC(validator2.address, true);
    await contractRoleManager.setKYC(validator3.address, true);
    await contractRoleManager.setKYC(validator4.address, true);
    await contractRoleManager.setKYC(validator5.address, true);

    // Define the instructer balance variables
    let currentBlockTimestampIndex;

    /// @dev Create a content
    // Create content
    const contentParts = [0, 1];
    const redeemer = contentCreator;
    // Create content voucher
    const createContentVoucherSample = await createContentVoucher(
      contractUDAOContent,
      backend,
      contentCreator,
      redeemer,
      contentParts,
      (redeemType = 1),
      (validationScore = 1)
    );
    // Create content with voucher
    await expect(contractUDAOContent.connect(contentCreator).createContent(createContentVoucherSample))
      .to.emit(contractUDAOContent, "Transfer") // transfer from null address to minter
      .withArgs(ethers.constants.AddressZero, contentCreator.address, 1);

    // Buy the content
    const tokenIds = [1];
    const purchasedParts = [[1]];
    const giftReceiver = [ethers.constants.AddressZero];
    const fullContentPurchase = [true];
    const pricesToPay = [ethers.utils.parseEther("1")];
    const validUntil = Date.now() + 999999999;
    const userIds = ["c8d53630-233a-4f95-90cb-4df253ae9283"];
    const redeemers = [contentBuyer1.address];
    await makeContentPurchase(
      contractPlatformTreasury,
      contractVoucherVerifier,
      contentBuyer1,
      contractRoleManager,
      contractUDAO,
      tokenIds,
      purchasedParts,
      pricesToPay,
      fullContentPurchase,
      validUntil,
      redeemers,
      giftReceiver,
      userIds
    );

    // Get current refund window
    const refundWindow = await contractPlatformTreasury.refundWindow();

    // Get the instructer balance array before withdrawal
    let instructorLockedBalanceArrayBN = [];
    for (let i = 0; i < refundWindow; i++) {
      instructorLockedBalanceArrayBN[i] = ethers.utils.formatEther(
        await contractPlatformTreasury.instLockedBalance(contentCreator.address, i)
      );
    }
    // Get the content locked pool array before withdrawal
    let contentLockedBalanceArrayBN = [];
    for (let i = 0; i < refundWindow; i++) {
      contentLockedBalanceArrayBN[i] = ethers.utils.formatEther(await contractPlatformTreasury.contentCutLockedPool(i));
    }

    // Get current blocks timestamp
    currentBlockTimestampIndex = Math.floor(
      ((await hre.ethers.provider.getBlock()).timestamp % (refundWindow * 86400)) / 86400
    );
    /// @dev Calculate amount of instructor should have receive
    // Get total price
    const totalPrice = pricesToPay[0];
    // Get contentFoundCut
    const _contentFoundCut = await contractPlatformTreasury.contentFoundCut();
    const contentFoundCut = totalPrice.mul(_contentFoundCut).div(100000);
    // Get contentGoverCut
    const _contentGoverCut = await contractPlatformTreasury.contentGoverCut();
    const contentGoverCut = totalPrice.mul(_contentGoverCut).div(100000);
    // Get contentJurorCut
    const _contentJurorCut = await contractPlatformTreasury.contentJurorCut();
    const contentJurorCut = totalPrice.mul(_contentJurorCut).div(100000);
    // Get contentValidCut
    const _contentValidCut = await contractPlatformTreasury.contentValidCut();
    const contentValidCut = totalPrice.mul(_contentValidCut).div(100000);
    // Get total cut
    const totalCut = contentGoverCut.add(contentJurorCut).add(contentValidCut).add(contentFoundCut);
    // Use total cut to get what instructor should receive and check if it is recorded in the correct index
    expect(instructorLockedBalanceArrayBN[currentBlockTimestampIndex]).to.equal(
      ethers.utils.formatEther(pricesToPay[0].sub(totalCut))
    );
    expect(contentLockedBalanceArrayBN[currentBlockTimestampIndex]).to.equal(ethers.utils.formatEther(totalCut));
    /// @dev Change the refund window to 5 days
    await contractPlatformTreasury.connect(backend).changeRefundWindow(5);
    // Get the current refund window
    const refundWindow2 = await contractPlatformTreasury.refundWindow();
    // Get the precaution withdrawal timestamp
    const precautionWithdrawalTimestamp = await contractPlatformTreasury.precautionWithdrawalTimestamp();
    // Skip days by new refund window + 1
    const numBlocksToMine0 = Math.ceil(((refundWindow2.toNumber() + 1) * 24 * 60 * 60) / 2);
    await hre.network.provider.send("hardhat_mine", [`0x${numBlocksToMine0.toString(16)}`, "0x2"]);
    // Try to withdraw as a content creator
    await expect(contractPlatformTreasury.connect(contentCreator).withdrawInstructor()).to.be.revertedWith(
      "Precaution withdrawal period is not over"
    );
  });

  it("Should allow anyone to withdraw after a refund window change and after precaution withdrawal timestamp", async function () {
    const consoleLogOn = true;
    await reDeploy();
    /// KYC content creator and content buyers
    await contractRoleManager.setKYC(contentCreator.address, true);
    await contractRoleManager.setKYC(contentBuyer1.address, true);
    await contractRoleManager.setKYC(contentBuyer2.address, true);
    await contractRoleManager.setKYC(contentBuyer3.address, true);
    await contractRoleManager.setKYC(validator1.address, true);
    await contractRoleManager.setKYC(validator2.address, true);
    await contractRoleManager.setKYC(validator3.address, true);
    await contractRoleManager.setKYC(validator4.address, true);
    await contractRoleManager.setKYC(validator5.address, true);

    // Define the instructer balance variables
    let currentBlockTimestampIndex;

    /// @dev Create a content
    // Create content
    const contentParts = [0, 1];
    const redeemer = contentCreator;
    // Create content voucher
    const createContentVoucherSample = await createContentVoucher(
      contractUDAOContent,
      backend,
      contentCreator,
      redeemer,
      contentParts,
      (redeemType = 1),
      (validationScore = 1)
    );
    // Create content with voucher
    await expect(contractUDAOContent.connect(contentCreator).createContent(createContentVoucherSample))
      .to.emit(contractUDAOContent, "Transfer") // transfer from null address to minter
      .withArgs(ethers.constants.AddressZero, contentCreator.address, 1);

    // Buy the content
    const tokenIds = [1];
    const purchasedParts = [[1]];
    const giftReceiver = [ethers.constants.AddressZero];
    const fullContentPurchase = [true];
    const pricesToPay = [ethers.utils.parseEther("1")];
    const validUntil = Date.now() + 999999999;
    const userIds = ["c8d53630-233a-4f95-90cb-4df253ae9283"];
    const redeemers = [contentBuyer1.address];
    await makeContentPurchase(
      contractPlatformTreasury,
      contractVoucherVerifier,
      contentBuyer1,
      contractRoleManager,
      contractUDAO,
      tokenIds,
      purchasedParts,
      pricesToPay,
      fullContentPurchase,
      validUntil,
      redeemers,
      giftReceiver,
      userIds
    );

    // Get current refund window
    const refundWindow = await contractPlatformTreasury.refundWindow();

    // Get the instructer balance array before withdrawal
    let instructorLockedBalanceArrayBN = [];
    for (let i = 0; i < refundWindow; i++) {
      instructorLockedBalanceArrayBN[i] = ethers.utils.formatEther(
        await contractPlatformTreasury.instLockedBalance(contentCreator.address, i)
      );
    }
    // Get the content locked pool array before withdrawal
    let contentLockedBalanceArrayBN = [];
    for (let i = 0; i < refundWindow; i++) {
      contentLockedBalanceArrayBN[i] = ethers.utils.formatEther(await contractPlatformTreasury.contentCutLockedPool(i));
    }

    // Get current blocks timestamp
    currentBlockTimestampIndex = Math.floor(
      ((await hre.ethers.provider.getBlock()).timestamp % (refundWindow * 86400)) / 86400
    );
    /// @dev Calculate amount of instructor should have receive
    // Get total price
    const totalPrice = pricesToPay[0];
    // Get contentFoundCut
    const _contentFoundCut = await contractPlatformTreasury.contentFoundCut();
    const contentFoundCut = totalPrice.mul(_contentFoundCut).div(100000);
    // Get contentGoverCut
    const _contentGoverCut = await contractPlatformTreasury.contentGoverCut();
    const contentGoverCut = totalPrice.mul(_contentGoverCut).div(100000);
    // Get contentJurorCut
    const _contentJurorCut = await contractPlatformTreasury.contentJurorCut();
    const contentJurorCut = totalPrice.mul(_contentJurorCut).div(100000);
    // Get contentValidCut
    const _contentValidCut = await contractPlatformTreasury.contentValidCut();
    const contentValidCut = totalPrice.mul(_contentValidCut).div(100000);
    // Get total cut
    const totalCut = contentGoverCut.add(contentJurorCut).add(contentValidCut).add(contentFoundCut);
    // Use total cut to get what instructor should receive and check if it is recorded in the correct index
    expect(instructorLockedBalanceArrayBN[currentBlockTimestampIndex]).to.equal(
      ethers.utils.formatEther(pricesToPay[0].sub(totalCut))
    );
    expect(contentLockedBalanceArrayBN[currentBlockTimestampIndex]).to.equal(ethers.utils.formatEther(totalCut));
    /// @dev Change the refund window to 5 days
    await contractPlatformTreasury.connect(backend).changeRefundWindow(5);
    // Get the current refund window
    const refundWindow2 = await contractPlatformTreasury.refundWindow();
    // Get the precaution withdrawal timestamp
    const precautionWithdrawalTimestamp = await contractPlatformTreasury.precautionWithdrawalTimestamp();
    // Update instructor balance by calling updateAndTransferPlatformBalances
    await contractPlatformTreasury.connect(contentCreator).updateAndTransferPlatformBalances();
    // Skip days by the precautionWithdrawalTimestamp
    await network.provider.send("evm_setNextBlockTimestamp", [precautionWithdrawalTimestamp.toNumber() + 1]);
    await network.provider.send("evm_mine");
    // Try to withdraw as a content creator
    await expect(contractPlatformTreasury.connect(contentCreator).withdrawInstructor()).to.emit(
      contractPlatformTreasury,
      "InstructorWithdrawn"
    );
    // Try to withdraw as the foundation
    await expect(contractPlatformTreasury.connect(foundation).withdrawFoundation()).to.emit(
      contractPlatformTreasury,
      "FoundationWithdrawn"
    );
  });

  it("Should not allow anyone to withdraw after a refund window change for precation withdrawal timestamp even after a sale is made after new refund window", async function () {
    const consoleLogOn = true;
    await reDeploy();
    /// KYC content creator and content buyers
    await contractRoleManager.setKYC(contentCreator.address, true);
    await contractRoleManager.setKYC(contentBuyer1.address, true);
    await contractRoleManager.setKYC(contentBuyer2.address, true);
    await contractRoleManager.setKYC(contentBuyer3.address, true);
    await contractRoleManager.setKYC(validator1.address, true);
    await contractRoleManager.setKYC(validator2.address, true);
    await contractRoleManager.setKYC(validator3.address, true);
    await contractRoleManager.setKYC(validator4.address, true);
    await contractRoleManager.setKYC(validator5.address, true);

    // Define the instructer balance variables
    let currentBlockTimestampIndex;

    /// @dev Create 2 contents
    // Create content 1
    const contentParts = [0, 1];
    const redeemer = contentCreator;
    // Create content voucher
    const createContentVoucherSample = await createContentVoucher(
      contractUDAOContent,
      backend,
      contentCreator,
      redeemer,
      contentParts,
      (redeemType = 1),
      (validationScore = 1)
    );
    // Create content with voucher
    await expect(contractUDAOContent.connect(contentCreator).createContent(createContentVoucherSample))
      .to.emit(contractUDAOContent, "Transfer") // transfer from null address to minter
      .withArgs(ethers.constants.AddressZero, contentCreator.address, 1);
    // Create content 2
    // Create content voucher
    const createContentVoucherSample2 = await createContentVoucher(
      contractUDAOContent,
      backend,
      contentCreator,
      redeemer,
      contentParts,
      (redeemType = 1),
      (validationScore = 1)
    );

    // Create content with voucher
    await expect(contractUDAOContent.connect(contentCreator).createContent(createContentVoucherSample2))
      .to.emit(contractUDAOContent, "Transfer") // transfer from null address to minter
      .withArgs(ethers.constants.AddressZero, contentCreator.address, 2);
    // Buy the content
    const tokenIds = [1];
    const purchasedParts = [[1]];
    const giftReceiver = [ethers.constants.AddressZero];
    const fullContentPurchase = [true];
    const pricesToPay = [ethers.utils.parseEther("1")];
    const validUntil = Date.now() + 999999999;
    const userIds = ["c8d53630-233a-4f95-90cb-4df253ae9283"];
    const redeemers = [contentBuyer1.address];
    await makeContentPurchase(
      contractPlatformTreasury,
      contractVoucherVerifier,
      contentBuyer1,
      contractRoleManager,
      contractUDAO,
      tokenIds,
      purchasedParts,
      pricesToPay,
      fullContentPurchase,
      validUntil,
      redeemers,
      giftReceiver,
      userIds
    );

    // Get current refund window
    const refundWindow = await contractPlatformTreasury.refundWindow();

    // Get the instructer balance array before withdrawal
    let instructorLockedBalanceArrayBN = [];
    for (let i = 0; i < refundWindow; i++) {
      instructorLockedBalanceArrayBN[i] = ethers.utils.formatEther(
        await contractPlatformTreasury.instLockedBalance(contentCreator.address, i)
      );
    }
    // Get the content locked pool array before withdrawal
    let contentLockedBalanceArrayBN = [];
    for (let i = 0; i < refundWindow; i++) {
      contentLockedBalanceArrayBN[i] = ethers.utils.formatEther(await contractPlatformTreasury.contentCutLockedPool(i));
    }

    // Get current blocks timestamp
    currentBlockTimestampIndex = Math.floor(
      ((await hre.ethers.provider.getBlock()).timestamp % (refundWindow * 86400)) / 86400
    );
    /// @dev Calculate amount of instructor should have receive
    // Get total price
    const totalPrice = pricesToPay[0];
    // Get contentFoundCut
    const _contentFoundCut = await contractPlatformTreasury.contentFoundCut();
    const contentFoundCut = totalPrice.mul(_contentFoundCut).div(100000);
    // Get contentGoverCut
    const _contentGoverCut = await contractPlatformTreasury.contentGoverCut();
    const contentGoverCut = totalPrice.mul(_contentGoverCut).div(100000);
    // Get contentJurorCut
    const _contentJurorCut = await contractPlatformTreasury.contentJurorCut();
    const contentJurorCut = totalPrice.mul(_contentJurorCut).div(100000);
    // Get contentValidCut
    const _contentValidCut = await contractPlatformTreasury.contentValidCut();
    const contentValidCut = totalPrice.mul(_contentValidCut).div(100000);
    // Get total cut
    const totalCut = contentGoverCut.add(contentJurorCut).add(contentValidCut).add(contentFoundCut);
    // Use total cut to get what instructor should receive and check if it is recorded in the correct index
    expect(instructorLockedBalanceArrayBN[currentBlockTimestampIndex]).to.equal(
      ethers.utils.formatEther(pricesToPay[0].sub(totalCut))
    );
    expect(contentLockedBalanceArrayBN[currentBlockTimestampIndex]).to.equal(ethers.utils.formatEther(totalCut));
    /// @dev Change the refund window to 5 days
    await contractPlatformTreasury.connect(backend).changeRefundWindow(5);
    // Get the current refund window
    const refundWindow2 = await contractPlatformTreasury.refundWindow();
    // Skip for 1 day
    const numBlocksToMine0 = Math.ceil((1 * 24 * 60 * 60) / 2);
    await hre.network.provider.send("hardhat_mine", [`0x${numBlocksToMine0.toString(16)}`, "0x2"]);
    // Buy content 2
    // Buy the content
    const tokenIds2 = [2];
    const pricesToPay2 = [ethers.utils.parseEther("2")];
    await makeContentPurchase(
      contractPlatformTreasury,
      contractVoucherVerifier,
      contentBuyer1,
      contractRoleManager,
      contractUDAO,
      tokenIds2,
      purchasedParts,
      pricesToPay2,
      fullContentPurchase,
      validUntil,
      redeemers,
      giftReceiver,
      userIds
    );
    // Skip for new refund window
    const numBlocksToMine1 = Math.ceil((refundWindow2.toNumber() * 24 * 60 * 60) / 2);
    await hre.network.provider.send("hardhat_mine", [`0x${numBlocksToMine1.toString(16)}`, "0x2"]);
    // Try to withdraw as a content creator
    await expect(contractPlatformTreasury.connect(contentCreator).withdrawInstructor()).to.be.revertedWith(
      "Precaution withdrawal period is not over"
    );
  });

  it("Should learner can refund depend on the old refund window after a refund window change and instructor cannot withdraw meanwhile", async function () {
    // re-deploy the contracts
    await reDeploy();
    /// KYC content creator and content buyers
    await contractRoleManager.setKYC(contentCreator.address, true);
    await contractRoleManager.setKYC(contentBuyer1.address, true);
    await contractRoleManager.setKYC(contentBuyer2.address, true);
    // create a content
    const contentParts = [0, 1];
    const redeemer = contentCreator;
    // create content voucher
    const createContentVoucherSample = await createContentVoucher(
      contractUDAOContent,
      backend,
      contentCreator,
      redeemer,
      contentParts,
      (redeemType = 1),
      (validationScore = 1)
    );
    // create content with voucher
    await expect(contractUDAOContent.connect(contentCreator).createContent(createContentVoucherSample))
      .to.emit(contractUDAOContent, "Transfer") // transfer from null address to minter
      .withArgs(ethers.constants.AddressZero, contentCreator.address, 1);
    // change the refund window to 60 days
    await contractPlatformTreasury.connect(backend).changeRefundWindow(60);
    // get the refund window
    const refundWindow = (await contractPlatformTreasury.refundWindow()).toNumber();
    // skip 60 days
    const numBlocksToMine0 = Math.ceil(((refundWindow + 1) * 24 * 60 * 60) / 2);
    await hre.network.provider.send("hardhat_mine", [`0x${numBlocksToMine0.toString(16)}`, "0x2"]);
    // make a content purchase
    const tokenIds = [1];
    const purchasedParts = [[1]];
    const giftReceiver = [ethers.constants.AddressZero];
    const fullContentPurchase = [true];
    const pricesToPay = [ethers.utils.parseEther("1")];
    const validUntil = Date.now() + 999999999;
    const userIds = ["c8d53630-233a-4f95-90cb-4df253ae9283"];
    const redeemers = [contentBuyer1.address];
    await makeContentPurchase(
      contractPlatformTreasury,
      contractVoucherVerifier,
      contentBuyer1,
      contractRoleManager,
      contractUDAO,
      tokenIds,
      purchasedParts,
      pricesToPay,
      fullContentPurchase,
      validUntil,
      redeemers,
      giftReceiver,
      userIds
    );

    // Get the instructer balance array before withdrawal
    let instructorLockedBalanceArrayBN = [];
    for (let i = 0; i < refundWindow; i++) {
      instructorLockedBalanceArrayBN[i] = ethers.utils.formatEther(
        await contractPlatformTreasury.instLockedBalance(contentCreator.address, i)
      );
    }
    // Get the content locked pool array before withdrawal
    let contentLockedBalanceArrayBN = [];
    for (let i = 0; i < refundWindow; i++) {
      contentLockedBalanceArrayBN[i] = ethers.utils.formatEther(await contractPlatformTreasury.contentCutLockedPool(i));
    }

    // Get current blocks timestamp
    currentBlockTimestampIndex = Math.floor(
      ((await hre.ethers.provider.getBlock()).timestamp % (refundWindow * 86400)) / 86400
    );
    /// @dev Calculate amount of instructor should have receive
    // Get total price
    const totalPrice = pricesToPay[0];
    // Get contentFoundCut
    const _contentFoundCut = await contractPlatformTreasury.contentFoundCut();
    const contentFoundCut = totalPrice.mul(_contentFoundCut).div(100000);
    // Get contentGoverCut
    const _contentGoverCut = await contractPlatformTreasury.contentGoverCut();
    const contentGoverCut = totalPrice.mul(_contentGoverCut).div(100000);
    // Get contentJurorCut
    const _contentJurorCut = await contractPlatformTreasury.contentJurorCut();
    const contentJurorCut = totalPrice.mul(_contentJurorCut).div(100000);
    // Get contentValidCut
    const _contentValidCut = await contractPlatformTreasury.contentValidCut();
    const contentValidCut = totalPrice.mul(_contentValidCut).div(100000);
    // Get total cut
    const totalCut = contentGoverCut.add(contentJurorCut).add(contentValidCut).add(contentFoundCut);
    // Use total cut to get what instructor should receive and check if it is recorded in the correct index
    expect(instructorLockedBalanceArrayBN[currentBlockTimestampIndex]).to.equal(
      ethers.utils.formatEther(pricesToPay[0].sub(totalCut))
    );
    expect(contentLockedBalanceArrayBN[currentBlockTimestampIndex]).to.equal(ethers.utils.formatEther(totalCut));

    // change the refund window to 5 days
    await contractPlatformTreasury.connect(backend).changeRefundWindow(5);
    // get the refund window
    const refundWindow2 = (await contractPlatformTreasury.refundWindow()).toNumber();
    // get current blocks timestamp
    currentBlockTimestampIndex = Math.floor(
      ((await hre.ethers.provider.getBlock()).timestamp % (refundWindow2 * 86400)) / 86400
    );
    // update instructor balance by calling updateAndTransferPlatformBalances
    await contractPlatformTreasury.connect(contentCreator).updateAndTransferPlatformBalances();
    // get the instructer balance array before withdrawal
    let instructorLockedBalanceArrayBN2 = [];
    for (let i = 0; i < refundWindow2; i++) {
      instructorLockedBalanceArrayBN2[i] = ethers.utils.formatEther(
        await contractPlatformTreasury.instLockedBalance(contentCreator.address, i)
      );
    }
    // get the content locked pool array before withdrawal
    let contentLockedBalanceArrayBN2 = [];
    for (let i = 0; i < refundWindow2; i++) {
      contentLockedBalanceArrayBN2[i] = ethers.utils.formatEther(
        await contractPlatformTreasury.contentCutLockedPool(i)
      );
    }

    // Use total cut to get what instructor should receive and check if it is recorded in the correct index according to the new index
    expect(instructorLockedBalanceArrayBN2[currentBlockTimestampIndex]).to.equal(
      ethers.utils.formatEther(pricesToPay[0].sub(totalCut))
    );
    expect(contentLockedBalanceArrayBN2[currentBlockTimestampIndex]).to.equal(ethers.utils.formatEther(totalCut));
    // skip days by the new refund window
    const numBlocksToMine1 = Math.ceil(((refundWindow2 + 1) * 24 * 60 * 60) / 2);
    await hre.network.provider.send("hardhat_mine", [`0x${numBlocksToMine1.toString(16)}`, "0x2"]);
    // update instructor balance by calling updateAndTransferPlatformBalances
    await contractPlatformTreasury.connect(contentCreator).updateAndTransferPlatformBalances();

    // balance transferred from locked balances to current balances
    // check insTructor current balance
    const currentBalanceInstS1 = ethers.utils.formatEther(
      await contractPlatformTreasury.instBalance(contentCreator.address)
    );
    expect(currentBalanceInstS1).to.equal(ethers.utils.formatEther(pricesToPay[0].sub(totalCut)));
    const currentCutBalanceS1 = ethers.utils.formatEther(await contractPlatformTreasury.contentCutPool());
    expect(currentCutBalanceS1).to.equal(ethers.utils.formatEther(totalCut));

    // don't allow instructor to withdraw due to the precaution withdrawal period even instturctor has positive balance
    // get instructor positive and refunded balance
    const [getWithdrawableBalanceS1, getRefundendBalanceS1] =
      await contractPlatformTreasury.getWithdrawableBalanceInstructor(contentCreator.address);
    const getWithdrawableBalanceS2 = ethers.utils.formatEther(getWithdrawableBalanceS1);
    const getRefundendBalanceS2 = ethers.utils.formatEther(getRefundendBalanceS1);
    expect(getWithdrawableBalanceS2).to.equal(ethers.utils.formatEther(pricesToPay[0].sub(totalCut)));
    expect(getRefundendBalanceS2).to.equal("0.0");
    await expect(contractPlatformTreasury.connect(contentCreator).withdrawInstructor()).to.be.revertedWith(
      "Precaution withdrawal period is not over"
    );
    // skip days by refund window
    const numBlocksToMine2 = Math.ceil(((refundWindow2 + 1) * 24 * 60 * 60) / 2);
    await hre.network.provider.send("hardhat_mine", [`0x${numBlocksToMine2.toString(16)}`, "0x2"]);
    // allow refund the content because old refund window is still valid for that purchase
    //  Create RefundVoucher
    const refundVoucher = new RefundVoucher({
      contract: contractVoucherVerifier,
      signer: backend,
    });
    const refundType = 1; // 0 since refund is content
    // Voucher will be valid for 1 day
    const voucherValidUntil = Date.now() + 9999999;
    const contentSaleId = 0; // 0 since only one content is created and sold
    const finalParts = []; // Empty since buyer had no parts
    const finalContents = []; // Empty since buyer had no co
    const refund_voucher = await refundVoucher.createVoucher(
      contentSaleId,
      contentCreator.address,
      finalParts,
      finalContents,
      voucherValidUntil
    );
    // Refund the content
    await expect(contractPlatformTreasury.connect(contentCreator).newRefundContent(refund_voucher))
      .to.emit(contractPlatformTreasury, "SaleRefunded")
      .withArgs(contentSaleId, refundType);
    // get instructor positive and refunded balance
    const [getWithdrawableBalanceS3, getRefundendBalanceS3] =
      await contractPlatformTreasury.getWithdrawableBalanceInstructor(contentCreator.address);
    expect(getWithdrawableBalanceS3).to.equal(pricesToPay[0].sub(totalCut));
    expect(getRefundendBalanceS3).to.equal(pricesToPay[0].sub(totalCut));
    const getRefundendCutBalanceS3 = ethers.utils.formatEther(
      await contractPlatformTreasury.contentCutRefundedBalance()
    );
    expect(getRefundendCutBalanceS3).to.equal(ethers.utils.formatEther(totalCut));
  });

  it("Should not allow refund of a content based on the new refund window", async function () {
    // re-deploy the contracts
    await reDeploy();
    /// KYC content creator and content buyers
    await contractRoleManager.setKYC(contentCreator.address, true);
    await contractRoleManager.setKYC(contentBuyer1.address, true);
    // create a content
    const contentParts = [0, 1];
    const redeemer = contentCreator;
    // create content voucher
    const createContentVoucherSample = await createContentVoucher(
      contractUDAOContent,
      backend,
      contentCreator,
      redeemer,
      contentParts,
      (redeemType = 1),
      (validationScore = 1)
    );
    // create content with voucher
    await expect(contractUDAOContent.connect(contentCreator).createContent(createContentVoucherSample))
      .to.emit(contractUDAOContent, "Transfer") // transfer from null address to minter
      .withArgs(ethers.constants.AddressZero, contentCreator.address, 1);

    // make a content purchase
    const tokenIds = [1];
    const purchasedParts = [[1]];
    const giftReceiver = [ethers.constants.AddressZero];
    const fullContentPurchase = [true];
    const pricesToPay = [ethers.utils.parseEther("1")];
    const validUntil = Date.now() + 999999999;
    const userIds = ["c8d53630-233a-4f95-90cb-4df253ae9283"];
    const redeemers = [contentBuyer1.address];
    await makeContentPurchase(
      contractPlatformTreasury,
      contractVoucherVerifier,
      contentBuyer1,
      contractRoleManager,
      contractUDAO,
      tokenIds,
      purchasedParts,
      pricesToPay,
      fullContentPurchase,
      validUntil,
      redeemers,
      giftReceiver,
      userIds
    );

    // change the refund window to 40 days
    await contractPlatformTreasury.connect(backend).changeRefundWindow(40);
    // get the refund window
    const refundWindow2 = (await contractPlatformTreasury.refundWindow()).toNumber();
    // skip 30 days
    const numBlocksToMine1 = Math.ceil((30 * 24 * 60 * 60) / 2);
    await hre.network.provider.send("hardhat_mine", [`0x${numBlocksToMine1.toString(16)}`, "0x2"]);
    // try to refund the content
    //  Create RefundVoucher
    const refundVoucher = new RefundVoucher({
      contract: contractVoucherVerifier,
      signer: backend,
    });
    const refundType = 1; // 0 since refund is content
    // Voucher will be valid for 1 day
    const voucherValidUntil = Date.now() + 9999999;
    const contentSaleId = 0; // 0 since only one content is created and sold
    const finalParts = []; // Empty since buyer had no parts
    const finalContents = []; // Empty since buyer had no co
    const refund_voucher = await refundVoucher.createVoucher(
      contentSaleId,
      contentCreator.address,
      finalParts,
      finalContents,
      voucherValidUntil
    );
    // Refund the content
    await expect(contractPlatformTreasury.connect(contentCreator).newRefundContent(refund_voucher)).to.be.revertedWith(
      "refund period over you cant refund"
    );
  });

  it("Should fail to change refund window less than 2 day", async function () {
    // re-deploy the contracts
    await reDeploy();
    // change the refund window to 1 day
    await expect(contractPlatformTreasury.connect(backend).changeRefundWindow(1)).to.be.revertedWith(
      "Refund window period should be at least 2 days"
    );
  });

  it("Should fail to change refund window more than 61 days", async function () {
    // re-deploy the contracts
    await reDeploy();
    // change the refund window to 366 days
    await expect(contractPlatformTreasury.connect(backend).changeRefundWindow(366)).to.be.revertedWith(
      "Refund window period should be at most 60 days"
    );
  });

  it("Should fail to change refund window to the same value", async function () {
    // re-deploy the contracts
    await reDeploy();
    // get the refund window
    const refundWindow = await contractPlatformTreasury.refundWindow();
    // change the refund window to 60 days
    await expect(contractPlatformTreasury.connect(backend).changeRefundWindow(refundWindow)).to.be.revertedWith(
      "New window period is the same as the current one"
    );
  });
});
