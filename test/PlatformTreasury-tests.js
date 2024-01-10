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
  const purchaseTx = await contractPlatformTreasury
    .connect(contentBuyer)
    .buyContent(contentPurchaseVouchers);
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

describe("Platform Treasury General", function () {
  it("Should allow backend to set update addresses", async function () {
    await reDeploy();
    const newUdaoAddress = contractUDAO.address;
    const newUdaocAddress = contractUDAOContent.address;
    const newRoleManagerAddress = contractRoleManager.address;
    const newGovernanceTreasuryAddress = contractSupervision.address;
    const newVoucherVerifierAddress = contractVoucherVerifier.address;

    await expect(
      contractPlatformTreasury
        .connect(backend)
        .updateAddresses(
          newUdaoAddress,
          newUdaocAddress,
          newRoleManagerAddress,
          newGovernanceTreasuryAddress,
          newVoucherVerifierAddress
        )
    )
      .to.emit(contractPlatformTreasury, "AddressesUpdated")
      .withArgs(
        newUdaoAddress,
        newUdaocAddress,
        newRoleManagerAddress,
        newGovernanceTreasuryAddress,
        newVoucherVerifierAddress
      );
  });

  it("Should allow foundation to update addresses after ownership of contract transfered", async function () {
    await reDeploy();
    const newUdaoAddress = contractUDAO.address;
    const newUdaocAddress = contractUDAOContent.address;
    const newRoleManagerAddress = contractRoleManager.address;
    const newGovernanceTreasuryAddress = contractSupervision.address;
    const newVoucherVerifierAddress = contractVoucherVerifier.address;

    await expect(
      contractPlatformTreasury
        .connect(foundation)
        .updateAddresses(
          newUdaoAddress,
          newUdaocAddress,
          newRoleManagerAddress,
          newGovernanceTreasuryAddress,
          newVoucherVerifierAddress
        )
    )
      .to.emit(contractPlatformTreasury, "AddressesUpdated")
      .withArgs(
        newUdaoAddress,
        newUdaocAddress,
        newRoleManagerAddress,
        newGovernanceTreasuryAddress,
        newVoucherVerifierAddress
      );
  });

  it("Should fail foundation-else or backend-else role to update addresses", async function () {
    await reDeploy();
    const newUdaoAddress = contractUDAO.address;
    const newUdaocAddress = contractUDAOContent.address;
    const newRoleManagerAddress = contractRoleManager.address;
    const newGovernanceTreasuryAddress = contractSupervision.address;
    const newVoucherVerifierAddress = contractVoucherVerifier.address;

    await expect(
      contractPlatformTreasury
        .connect(contentBuyer1)
        .updateAddresses(
          newUdaoAddress,
          newUdaocAddress,
          newRoleManagerAddress,
          newGovernanceTreasuryAddress,
          newVoucherVerifierAddress
        )
    ).to.be.revertedWith("Only backend and contract manager can update addresses");
  });

  it("Should fail backend-else role to set governance treasury online", async function () {
    await reDeploy();
    /// Set governance treasury online
    await expect(contractPlatformTreasury.connect(contentBuyer1).activateGovernanceTreasury(true)).to.be.revertedWith(
      "Only backend can activate governance treasury"
    );
  });

  it("Should allow backend-deployer to set foundation wallet address for platform treasury contract", async function () {
    await reDeploy();

    // new dummy foundation address
    const newFoundation = await ethers.Wallet.createRandom();
    // set new foundation address
    await expect(contractPlatformTreasury.connect(foundation).setFoundationAddress(newFoundation.address))
      .to.emit(contractPlatformTreasury, "FoundationWalletUpdated")
      .withArgs(newFoundation.address);
  });

  it("Should fail backend-deployer to set foundation wallet address if foundation wallet address already changed", async function () {
    await reDeploy();
    await contractPlatformTreasury.connect(foundation).setFoundationAddress(contentBuyer1.address);

    await expect(
      contractPlatformTreasury.connect(foundation).setFoundationAddress(contentBuyer1.address)
    ).to.revertedWith("Only foundation can set foundation wallet address");
  });

  it("Should allow foundation to withdraw funds from the treasury after a content purchase", async function () {
    await reDeploy();
    // KYC content creator and content buyer
    await contractRoleManager.setKYC(contentCreator.address, true);
    await contractRoleManager.setKYC(contentBuyer1.address, true);
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
      .withArgs("0x0000000000000000000000000000000000000000", contentCreator.address, 1);

    // Make a content purchase to gather funds for governance
    const tokenIds = [1];
    const purchasedParts = [[1]];
    const redeemers = [contentBuyer1.address];
    const giftReceiver = [ethers.constants.AddressZero];
    const fullContentPurchase = [false];
    const pricesToPay = [ethers.utils.parseEther("1")];
    const validUntil = Date.now() + 999999999;
    const userIds = ["c8d53630-233a-4f95-90cb-4df253ae9283"];
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

    /// @dev Skip "refund window" days to allow foundation to withdraw funds
    const refundWindowDays = await contractPlatformTreasury.refundWindow();
    /// convert big number to number
    const refundWindowDaysNumber = refundWindowDays.toNumber();

    const numBlocksToMine = Math.ceil((refundWindowDaysNumber * 24 * 60 * 60) / 2);
    await hre.network.provider.send("hardhat_mine", [`0x${numBlocksToMine.toString(16)}`, "0x2"]);

    /// @dev Withdraw foundation funds from the treasury
    await contractPlatformTreasury.connect(foundation).withdrawFoundation();

    /// @dev Get the current percent cut of the foundation
    const currentFoundationCut = await contractPlatformTreasury.contentFoundCut();
    /// Get the current foundation balance
    const currentFoundationBalance = await contractUDAO.balanceOf(foundation.address);
    const contentPrice = pricesToPay[0];
    /// Multiply the content price with the current foundation cut and divide by 100000 to get the expected foundation balance
    const expectedFoundationBalanceBeforePercentage = contentPrice.mul(currentFoundationCut);
    const expectedFoundationBalance = expectedFoundationBalanceBeforePercentage.div(100000);

    /// Check if the governance treasury balance is equal to the expected governance treasury balance
    await expect(currentFoundationBalance).to.equal(expectedFoundationBalance);
  });

  it("Should allow foundation to withdraw funds from the treasury after multiple content purchases", async function () {
    await reDeploy();
    // KYC content creator and content buyers
    await contractRoleManager.setKYC(contentCreator.address, true);
    await contractRoleManager.setKYC(contentBuyer1.address, true);
    await contractRoleManager.setKYC(contentBuyer2.address, true);
    await contractRoleManager.setKYC(contentBuyer3.address, true);
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
      .withArgs("0x0000000000000000000000000000000000000000", contentCreator.address, 1);
    // Make a content purchase to gather funds for governance
    const tokenIds = [1];
    const purchasedParts = [[1]];
    const redeemers1 = [contentBuyer1.address];
    const redeemers2 = [contentBuyer2.address];
    const redeemers3 = [contentBuyer3.address];
    const giftReceiver = [ethers.constants.AddressZero];
    const fullContentPurchase = [false];
    const pricesToPay = [ethers.utils.parseEther("1")];
    const validUntil = Date.now() + 999999999;
    const userIds = ["c8d53630-233a-4f95-90cb-4df253ae9283"];
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
      redeemers1,
      giftReceiver,
      userIds
    );
    await makeContentPurchase(
      contractPlatformTreasury,
      contractVoucherVerifier,
      contentBuyer2,
      contractRoleManager,
      contractUDAO,
      tokenIds,
      purchasedParts,
      pricesToPay,
      fullContentPurchase,
      validUntil,
      redeemers2,
      giftReceiver,
      userIds
    );
    await makeContentPurchase(
      contractPlatformTreasury,
      contractVoucherVerifier,
      contentBuyer3,
      contractRoleManager,
      contractUDAO,
      tokenIds,
      purchasedParts,
      pricesToPay,
      fullContentPurchase,
      validUntil,
      redeemers3,
      giftReceiver,
      userIds
    );

    /// @dev Skip "refund window" days to allow foundation to withdraw funds
    const refundWindowDays = await contractPlatformTreasury.refundWindow();
    /// convert big number to number
    const refundWindowDaysNumber = refundWindowDays.toNumber();

    /// @dev Skip 20 days to allow foundation to withdraw funds
    const numBlocksToMine = Math.ceil((refundWindowDaysNumber * 24 * 60 * 60) / 2);
    await hre.network.provider.send("hardhat_mine", [`0x${numBlocksToMine.toString(16)}`, "0x2"]);

    /// @dev Withdraw foundation funds from the treasury
    await contractPlatformTreasury.connect(foundation).withdrawFoundation();

    /// @dev Get the current percent cut of the foundation
    const currentFoundationCut = await contractPlatformTreasury.contentFoundCut();

    /// Get the current foundation balance
    const currentFoundationBalance = await contractUDAO.balanceOf(foundation.address);
    const contentPrice = pricesToPay[0];
    /// Multiply content price with 3 since 3 content purchases were made
    const contentPriceTimesThree = contentPrice.mul(3);
    /// Multiply the content price with the current foundation cut and divide by 100000 to get the expected foundation balance
    const expectedFoundationBalanceBeforePercentage = contentPriceTimesThree.mul(currentFoundationCut);
    const expectedFoundationBalance = expectedFoundationBalanceBeforePercentage.div(100000);

    /// Check if the governance treasury balance is equal to the expected governance treasury balance
    await expect(currentFoundationBalance).to.equal(expectedFoundationBalance);
  });

  it("Should allow instructers to withdraw their earnings", async function () {
    await reDeploy();
    // KYC content creator and content buyers
    await contractRoleManager.setKYC(contentCreator.address, true);
    await contractRoleManager.setKYC(contentBuyer1.address, true);
    await contractRoleManager.setKYC(contentBuyer2.address, true);
    await contractRoleManager.setKYC(contentBuyer3.address, true);
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
      .withArgs("0x0000000000000000000000000000000000000000", contentCreator.address, 1);
    // Make a content purchase to gather funds for governance
    const tokenIds = [1];
    const purchasedParts = [[1]];
    const redeemers = [contentBuyer1.address];
    const giftReceiver = [ethers.constants.AddressZero];
    const fullContentPurchase = [false];
    const pricesToPay = [ethers.utils.parseEther("1")];
    const validUntil = Date.now() + 999999999;
    const userIds = ["c8d53630-233a-4f95-90cb-4df253ae9283"];
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

    // Get the instructer balance before withdrawal
    const instructerBalanceBefore = await contractUDAO.balanceOf(contentCreator.address);
    // Expect that the instructer balance is 0 before withdrawal
    await expect(instructerBalanceBefore).to.equal(0);
    /// @dev Skip "refund window" days to allow foundation to withdraw funds
    const refundWindowDays = await contractPlatformTreasury.refundWindow();
    /// convert big number to number
    const refundWindowDaysNumber = refundWindowDays.toNumber();

    /// @dev Skip 20 days to allow foundation to withdraw funds
    const numBlocksToMine = Math.ceil((refundWindowDaysNumber * 24 * 60 * 60) / 2);
    await hre.network.provider.send("hardhat_mine", [`0x${numBlocksToMine.toString(16)}`, "0x2"]);
    // Instructer should call withdrawInstructor from platformtreasury contract
    await contractPlatformTreasury.connect(contentCreator).withdrawInstructor();
    // Get the instructer balance after withdrawal
    const instructerBalanceAfter = await contractUDAO.balanceOf(contentCreator.address);
    // Expect that the instructer balance is not 0 after withdrawal
    await expect(instructerBalanceAfter).to.not.equal(0);

    /// @dev Calculate how much the instructer should receive
    const contentPrice = pricesToPay[0];
    // Calculate the foundation cut
    const currentFoundationCut = await contractPlatformTreasury.contentFoundCut();
    const expectedFoundationBalanceBeforePercentage = contentPrice.mul(currentFoundationCut);
    const expectedFoundationBalance = expectedFoundationBalanceBeforePercentage.div(100000);
    // Calculate the governance cut
    const currentGovernanceTreasuryCut = await contractPlatformTreasury.contentGoverCut();
    const expectedGovernanceTreasuryBalanceBeforePercentage = contentPrice.mul(currentGovernanceTreasuryCut);
    const expectedGovernanceTreasuryBalance = expectedGovernanceTreasuryBalanceBeforePercentage.div(100000);
    // Calculate the validator cut
    const validatorCut = await contractPlatformTreasury.contentValidCut();
    const validatorBalance = contentPrice.mul(validatorCut).div(100000);
    // Calculate the juror cut
    const jurorCut = await contractPlatformTreasury.contentJurorCut();
    const jurorBalance = contentPrice.mul(jurorCut).div(100000);
    // Expect instructerBalance to be equal to priceToPay minus the sum of all cuts
    await expect(instructerBalanceAfter).to.equal(
      contentPrice
        .sub(expectedFoundationBalance)
        .sub(expectedGovernanceTreasuryBalance)
        .sub(validatorBalance)
        .sub(jurorBalance)
    );
  });

  it("Should instructers current balance shouldn't change with a new sale when a refund period completed after withdraw", async function () {
    await reDeploy();
    // KYC content creator and content buyers
    await contractRoleManager.setKYC(contentCreator.address, true);
    await contractRoleManager.setKYC(contentBuyer1.address, true);
    await contractRoleManager.setKYC(contentBuyer2.address, true);
    await contractRoleManager.setKYC(contentBuyer3.address, true);
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
      .withArgs("0x0000000000000000000000000000000000000000", contentCreator.address, 1);
    // Make a content purchase to gather funds for governance
    const tokenIds = [1];
    const purchasedParts = [[1]];
    const redeemers = [contentBuyer1.address];
    const giftReceiver = [ethers.constants.AddressZero];
    const fullContentPurchase = [false];
    const pricesToPay = [ethers.utils.parseEther("1")];
    const validUntil = Date.now() + 999999999;
    const userIds = ["c8d53630-233a-4f95-90cb-4df253ae9283"];
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

    // Get the instructer balance before withdrawal
    const instructerBalanceBefore = await contractUDAO.balanceOf(contentCreator.address);
    // Expect that the instructer balance is 0 before withdrawal
    await expect(instructerBalanceBefore).to.equal(0);
    /// @dev Skip "refund window" days to allow foundation to withdraw funds
    const refundWindowDays = await contractPlatformTreasury.refundWindow();
    /// convert big number to number
    const refundWindowDaysNumber = refundWindowDays.toNumber();

    /// @dev Skip 20 days to allow foundation to withdraw funds
    const numBlocksToMine = Math.ceil((refundWindowDaysNumber * 24 * 60 * 60) / 2);
    await hre.network.provider.send("hardhat_mine", [`0x${numBlocksToMine.toString(16)}`, "0x2"]);
    // Instructer should call withdrawInstructor from platformtreasury contract
    await contractPlatformTreasury.connect(contentCreator).withdrawInstructor();
    // Get the instructer balance after withdrawal
    const instructerBalanceAfter = await contractUDAO.balanceOf(contentCreator.address);
    // Expect that the instructer balance is not 0 after withdrawal
    await expect(instructerBalanceAfter).to.not.equal(0);

    /// @dev Calculate how much the instructer should receive
    const contentPrice = pricesToPay[0];
    // Calculate the foundation cut
    const currentFoundationCut = await contractPlatformTreasury.contentFoundCut();
    const expectedFoundationBalanceBeforePercentage = contentPrice.mul(currentFoundationCut);
    const expectedFoundationBalance = expectedFoundationBalanceBeforePercentage.div(100000);
    // Calculate the governance cut
    const currentGovernanceTreasuryCut = await contractPlatformTreasury.contentGoverCut();
    const expectedGovernanceTreasuryBalanceBeforePercentage = contentPrice.mul(currentGovernanceTreasuryCut);
    const expectedGovernanceTreasuryBalance = expectedGovernanceTreasuryBalanceBeforePercentage.div(100000);
    // Calculate the validator cut
    const validatorCut = await contractPlatformTreasury.contentValidCut();
    const validatorBalance = contentPrice.mul(validatorCut).div(100000);
    // Calculate the juror cut
    const jurorCut = await contractPlatformTreasury.contentJurorCut();
    const jurorBalance = contentPrice.mul(jurorCut).div(100000);
    // Expect instructerBalance to be equal to priceToPay minus the sum of all cuts
    await expect(instructerBalanceAfter).to.equal(
      contentPrice
        .sub(expectedFoundationBalance)
        .sub(expectedGovernanceTreasuryBalance)
        .sub(validatorBalance)
        .sub(jurorBalance)
    );
    /// @dev Skip 20 days to allow foundation to withdraw funds
    await hre.network.provider.send("hardhat_mine", [`0x${numBlocksToMine.toString(16)}`, "0x2"]);

    const purchasedParts2 = [[0]];

    // Make a new content sale
    await makeContentPurchase(
      contractPlatformTreasury,
      contractVoucherVerifier,
      contentBuyer1,
      contractRoleManager,
      contractUDAO,
      tokenIds,
      purchasedParts2,
      pricesToPay,
      fullContentPurchase,
      validUntil,
      redeemers,
      giftReceiver,
      userIds
    );
    /// get instructer balance from platform treasury
    const instBalance = await contractPlatformTreasury.instBalance(contentCreator.address);
    /// instructerBalance shouldn't change with a new sale when a refund period completed after withdraw
    expect(instBalance).to.equal(0);
  });

  it("Should _checkPartReceiver return buyer address if purchase valid", async function () {
    await reDeploy();
    // KYC content creator and content buyer
    await contractRoleManager.setKYC(contentCreator.address, true);
    await contractRoleManager.setKYC(contentBuyer1.address, true);
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
      .withArgs("0x0000000000000000000000000000000000000000", contentCreator.address, 1);
    // Make a content purchase to gather funds for governance
    const tokenIds = [1];
    const purchasedParts = [[1]];
    const redeemers = [contentBuyer1.address];
    const giftReceiver = [ethers.constants.AddressZero];
    const fullContentPurchase = [false];
    const pricesToPay = [ethers.utils.parseEther("1")];
    const validUntil = Date.now() + 999999999;
    // _checkPartReceiver should return the content buyer's address
    const validAddress = await contractPlatformTreasury._checkPartReceiver(
      tokenIds,
      purchasedParts,
      contentBuyer1.address
    );

    // valid address should be equal to the content buyer's address
    await expect(validAddress).to.equal(contentBuyer1.address);
  });

  it("Should _checkPartReceiver return buyer address if purchase valid while kyc non-required for buyer", async function () {
    await reDeploy();
    // KYC content creator and content buyer
    await contractRoleManager.setKYC(contentCreator.address, true);
    //await contractRoleManager.setKYC(contentBuyer1.address, true);
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
      .withArgs("0x0000000000000000000000000000000000000000", contentCreator.address, 1);
    // Make a content purchase to gather funds for governance
    const tokenIds = [1];
    const purchasedParts = [[1]];
    const redeemers = [contentBuyer1.address];
    const giftReceiver = [ethers.constants.AddressZero];
    const fullContentPurchase = [false];
    const pricesToPay = [ethers.utils.parseEther("1")];
    const validUntil = Date.now() + 999999999;

    // 22 is function id for kyc check of buyer in _checkPartReceiver function
    await contractRoleManager.setActiveKYCFunctions(22, false);

    // _checkPartReceiver should return the content buyer's address
    const validAddress = await contractPlatformTreasury._checkPartReceiver(
      tokenIds,
      purchasedParts,
      contentBuyer1.address
    );

    // valid address should be equal to the content buyer's address
    await expect(validAddress).to.equal(contentBuyer1.address);
  });

  it("Should _checkPartReceiver return buyer address if purchase valid while ban check disabled for buyer", async function () {
    await reDeploy();
    // KYC content creator and content buyer
    await contractRoleManager.setKYC(contentCreator.address, true);
    await contractRoleManager.setKYC(contentBuyer1.address, true);

    await contractRoleManager.setBan(contentBuyer1.address, true);
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
      .withArgs("0x0000000000000000000000000000000000000000", contentCreator.address, 1);
    // Make a content purchase to gather funds for governance
    const tokenIds = [1];
    const purchasedParts = [[1]];
    const redeemers = [contentBuyer1.address];
    const giftReceiver = [ethers.constants.AddressZero];
    const fullContentPurchase = [false];
    const pricesToPay = [ethers.utils.parseEther("1")];
    const validUntil = Date.now() + 999999999;

    // 29 is function id for ban check of buyer in _checkPartReceiver function
    await contractRoleManager.setActiveBanFunctions(29, false);

    // _checkPartReceiver should return the content buyer's address
    const validAddress = await contractPlatformTreasury._checkPartReceiver(
      tokenIds,
      purchasedParts,
      contentBuyer1.address
    );

    //await expect(contractPlatformTreasury._checkPartReceiver(tokenIds, purchasedParts, contentBuyer1.address)).to.equal(
    //  contentBuyer1.address
    //);
    // valid address should be equal to the content buyer's address
    await expect(validAddress).to.equal(contentBuyer1.address);
  });

  it("Should fail buy coaching or content when paused", async function () {
    await reDeploy();
    /// KYC content creator and content buyer
    await contractRoleManager.setKYC(contentCreator.address, true);
    await contractRoleManager.setKYC(contentBuyer1.address, true);
    /// Pause contract
    await contractPlatformTreasury.connect(backend).pause();
    /// Make coaching purchase
    await expect(
      makeCoachingPurchase(
        contractRoleManager,
        contractUDAO,
        contractPlatformTreasury,
        contentBuyer1,
        contentCreator,
        1
      )
    ).to.be.revertedWith("Pausable: paused");
    /// Create content
    const contentParts = [0, 1];
    const redeemer = contentCreator;
    /// Create content voucher
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
    const tx = await contractUDAOContent.connect(contentCreator).createContent(createContentVoucherSample);
    // Get NewContentCreated event and get tokenId
    const receipt = await tx.wait();
    const tokenId = receipt.events[0].args[2].toNumber();
    // You need to use all parts of the content to buy it. Get all parts of the content

    const parts = await contractUDAOContent.getContentParts(tokenId);
    const userIds = ["c8d53630-233a-4f95-90cb-4df253ae9283"];

    /// Make content purchase
    await expect(
      makeContentPurchase(
        contractPlatformTreasury,
        contractVoucherVerifier,
        contentBuyer1,
        contractRoleManager,
        contractUDAO,
        [tokenId],
        [parts],
        [ethers.utils.parseEther("1")],
        [false],
        Date.now() + 999999999,
        [contentBuyer1.address],
        [ethers.constants.AddressZero],
        userIds
      )
    ).to.be.revertedWith("Pausable: paused");
  });

  it("Should fail refund coaching by using any refund function when paused", async function () {
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
      contentBuyer.address,
      "c8d53630-233a-4f95-90cb-4df253ae9283"
    );
    // Buy coaching
    const purchaseTx = await contractPlatformTreasury.connect(contentBuyer).buyCoaching(role_voucher);
    const queueTxReceipt = await purchaseTx.wait();
    const queueTxEvent = queueTxReceipt.events.find((e) => e.event == "CoachingBought");
    const coachingSaleID = queueTxEvent.args[1];
    // Get the amount of UDAO in the buyer's wallet after buying coaching
    const buyerBalanceAfter = await contractUDAO.balanceOf(contentBuyer.address);
    // Check if correct amount of UDAO was deducted from the buyer's wallet
    expect(buyerBalance.sub(buyerBalanceAfter)).to.equal(coachingPrice);
    // Get coaching struct
    const coachingStruct = await contractPlatformTreasury.coachSales(coachingSaleID);
    // Check if returned learner address is the same as the buyer address
    expect(coachingStruct.contentReceiver).to.equal(contentBuyer.address);
    /// Pause contract
    await contractPlatformTreasury.connect(backend).pause();

    ///// Try to refund coaching by using refundCoachingByInstructorOrLearner function
    await expect(
      contractPlatformTreasury.connect(contentCreator).refundCoachingByInstructorOrLearner(coachingSaleID)
    ).to.be.revertedWith("Pausable: paused");

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
    /// Try to refund coaching by using newRefundCoaching function
    await expect(contractPlatformTreasury.connect(contentCreator).newRefundCoaching(refund_voucher)).to.revertedWith(
      "Pausable: paused"
    );
  });

  it("Should fail refund content when paused", async function () {
    await reDeploy();
    /// Set KYC
    await contractRoleManager.setKYC(contentCreator.address, true);
    await contractRoleManager.setKYC(contentBuyer.address, true);
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
    const tx = await contractUDAOContent.connect(contentCreator).createContent(createContentVoucherSample);
    // Get NewContentCreated event and get tokenId
    const receipt = await tx.wait();
    const tokenId = receipt.events[0].args[2].toNumber();
    // You need to use all parts of the content to buy it. Get all parts of the content
    const parts = await contractUDAOContent.getContentParts(tokenId);
    // Make a content purchase
    const tokenIds = [1];
    const purchasedParts = [parts];
    const redeemers = [contentBuyer1.address];
    const giftReceiver = [ethers.constants.AddressZero];
    const fullContentPurchase = [true];
    const pricesToPay = [ethers.utils.parseEther("1")];
    const validUntil = Date.now() + 999999999;
    const userIds = ["c8d53630-233a-4f95-90cb-4df253ae9283"];
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

    /// Check if the buyer has the content part
    const result = await contractPlatformTreasury.connect(contentBuyer1).getOwnedParts(contentBuyer1.address, tokenId);
    expect(result[0]).to.equal(purchasedParts[0][0]);
    const isFullyPurchased = await contractPlatformTreasury.isFullyPurchased(contentBuyer1.address, tokenId);
    expect(isFullyPurchased).to.equal(true);
    //  Create RefundVoucher
    const refundVoucher = new RefundVoucher({
      contract: contractVoucherVerifier,
      signer: backend,
    });
    const refundType = 1; // 0 since refund is content
    // Voucher will be valid for 1 day
    const voucherValidUntil = Date.now() + 86400;
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
    /// Pause contract
    await contractPlatformTreasury.connect(backend).pause();

    /// Try to Refund the content
    await expect(contractPlatformTreasury.connect(contentCreator).newRefundContent(refund_voucher)).to.be.revertedWith(
      "Pausable: paused"
    );
  });

  it("Should fail instructers or foundation to withdraw their earnings when paused", async function () {
    await reDeploy();
    // KYC content creator and content buyers
    await contractRoleManager.setKYC(contentCreator.address, true);
    await contractRoleManager.setKYC(contentBuyer1.address, true);
    await contractRoleManager.setKYC(contentBuyer2.address, true);
    await contractRoleManager.setKYC(contentBuyer3.address, true);
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
      .withArgs("0x0000000000000000000000000000000000000000", contentCreator.address, 1);
    // Make a content purchase to gather funds for governance
    const tokenIds = [1];
    const purchasedParts = [[1]];
    const redeemers = [contentBuyer1.address];
    const giftReceiver = [ethers.constants.AddressZero];
    const fullContentPurchase = [false];
    const pricesToPay = [ethers.utils.parseEther("1")];
    const validUntil = Date.now() + 999999999;
    const userIds = ["c8d53630-233a-4f95-90cb-4df253ae9283"];
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

    // Get the instructer balance before withdrawal
    const instructerBalanceBefore = await contractUDAO.balanceOf(contentCreator.address);
    // Expect that the instructer balance is 0 before withdrawal
    await expect(instructerBalanceBefore).to.equal(0);
    /// @dev Skip "refund window" days to allow foundation to withdraw funds
    const refundWindowDays = await contractPlatformTreasury.refundWindow();
    /// convert big number to number
    const refundWindowDaysNumber = refundWindowDays.toNumber();

    /// @dev Skip 20 days to allow foundation to withdraw funds
    const numBlocksToMine = Math.ceil((refundWindowDaysNumber * 24 * 60 * 60) / 2);
    await hre.network.provider.send("hardhat_mine", [`0x${numBlocksToMine.toString(16)}`, "0x2"]);

    /// Pause contract
    await contractPlatformTreasury.connect(backend).pause();
    // Instructer try to withdrawInstructor from platformtreasury contract
    await expect(contractPlatformTreasury.connect(contentCreator).withdrawInstructor()).to.be.revertedWith(
      "Pausable: paused"
    );
    // Get the instructer balance after withdrawal
    const instructerBalanceAfter = await contractUDAO.balanceOf(contentCreator.address);

    // Expect instructerBalance to be equal to priceToPay minus the sum of all cuts
    await expect(instructerBalanceAfter).to.equal(0);

    /// Foundation try to withdrawFoundation funds from the platformtreasury contract
    await expect(contractPlatformTreasury.connect(foundation).withdrawFoundation()).to.be.revertedWith(
      "Pausable: paused"
    );

    /// Get the current foundation balance
    const currentFoundationBalance = await contractUDAO.balanceOf(foundation.address);

    /// Check if the governance treasury balance is equal to the expected governance treasury balance
    await expect(currentFoundationBalance).to.equal(0);
  });

  it("Should allow backend to pause/unpause contract", async function () {
    await reDeploy();
    /// Pause contract
    await contractPlatformTreasury.connect(backend).pause();
    /// check if contract is paused
    const isPausedAfterPause = await contractPlatformTreasury.paused();
    expect(isPausedAfterPause).to.equal(true);
    /// Unpause contract
    await contractPlatformTreasury.connect(backend).unpause();
    /// check if contract is unpaused
    const isPausedAfterUnpause = await contractPlatformTreasury.paused();
    expect(isPausedAfterUnpause).to.equal(false);
  });

  it("Should fail backend-else role to pause/unpause contract", async function () {
    await reDeploy();
    /// Try to Pause contract with non backed role
    await expect(contractPlatformTreasury.connect(contentBuyer1).pause()).to.be.revertedWith("Only backend can pause");
    /// pause status should be false
    const isPausedAfterPause1 = await contractPlatformTreasury.paused();
    expect(isPausedAfterPause1).to.equal(false);

    /// pause the contract with backend role
    await contractPlatformTreasury.connect(backend).pause();
    /// pause status should be true
    const isPausedAfterPause2 = await contractPlatformTreasury.paused();
    expect(isPausedAfterPause2).to.equal(true);

    /// Try to Unpause contract with non backed role
    await expect(contractPlatformTreasury.connect(contentBuyer1).unpause()).to.be.revertedWith(
      "Only backend can unpause"
    );
    /// pause status should be false
    const isPausedAfterUnpause = await contractPlatformTreasury.paused();
    expect(isPausedAfterUnpause).to.equal(true);
  });

  it("Should fail foundation-else withdraw foundation funds from the treasury", async function () {
    await reDeploy();
    /// try to withdraw foundation funds from the treasury with non foundation role
    await expect(contractPlatformTreasury.connect(contentBuyer1).withdrawFoundation()).to.be.revertedWith(
      "Only foundation can withdraw"
    );
  });

  it("Should fail instructor to withdraw earnings from treasury if they have no earnings in contract", async function () {
    await reDeploy();
    /// try to withdraw foundation funds from the treasury with non foundation role
    await expect(contractPlatformTreasury.connect(contentCreator).withdrawInstructor()).to.be.revertedWith(
      "No balance to withdraw"
    );
  });

  it("Should fail instructor to widthdraw earning from treasury if they dont have revenue greater than refunded amount", async function () {
    await reDeploy();
    // KYC content creator and content buyers
    await contractRoleManager.setKYC(contentCreator.address, true);
    await contractRoleManager.setKYC(contentBuyer1.address, true);
    await contractRoleManager.setKYC(contentBuyer2.address, true);
    await contractRoleManager.setKYC(contentBuyer3.address, true);
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
      .withArgs("0x0000000000000000000000000000000000000000", contentCreator.address, 1);
    // Make a content purchase to gather funds for governance
    const tokenIds = [1];
    const purchasedParts = [[1]];
    const redeemers = [contentBuyer1.address];
    const giftReceiver = [ethers.constants.AddressZero];
    const fullContentPurchase = [false];
    const pricesToPay = [ethers.utils.parseEther("1")];
    const validUntil = Date.now() + 999999999;
    const userIds = ["c8d53630-233a-4f95-90cb-4df253ae9283"];
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

    // Get the instructer balance before withdrawal
    const instructerBalanceBefore = await contractUDAO.balanceOf(contentCreator.address);
    // Expect that the instructer balance is 0 before withdrawal
    await expect(instructerBalanceBefore).to.equal(0);

    /// @dev Skip 1 days
    const numBlocksToMine0 = Math.ceil((1 * 24 * 60 * 60) / 2);
    await hre.network.provider.send("hardhat_mine", [`0x${numBlocksToMine0.toString(16)}`, "0x2"]);

    /// Check if the buyer has the content part
    const result = await contractPlatformTreasury
      .connect(contentBuyer1)
      .getOwnedParts(contentBuyer1.address, tokenIds[0]);
    expect(result[0]).to.equal(purchasedParts[0][0]);
    //  Create RefundVoucher
    const refundVoucher = new RefundVoucher({
      contract: contractVoucherVerifier,
      signer: backend,
    });

    const refundType = 1; // 0 since refund is content
    // Voucher will be valid for 1 day
    const voucherValidUntil = Date.now() + 86400;
    const contentSaleId = 0; // 0 since only one content is created and sold
    const finalParts = [0]; // Empty since buyer had no parts
    const finalContents = [1]; // Empty since buyer had no co
    const refund_voucher = await refundVoucher.createVoucher(
      contentSaleId,
      contentCreator.address,
      finalParts,
      finalContents,
      voucherValidUntil
    );

    /// refund the content
    await contractPlatformTreasury.connect(contentCreator).newRefundContent(refund_voucher);

    /// @dev Skip "refund window" days to allow foundation to withdraw funds
    const refundWindowDays = await contractPlatformTreasury.refundWindow();
    /// convert big number to number
    const refundWindowDaysNumber = refundWindowDays.toNumber();

    /// @dev Skip 20 days to allow foundation to withdraw funds
    const numBlocksToMine1 = Math.ceil((refundWindowDaysNumber * 2 * 24 * 60 * 60) / 2);
    await hre.network.provider.send("hardhat_mine", [`0x${numBlocksToMine1.toString(16)}`, "0x2"]);

    /// a new purchase will be update the instructer balance
    const redeemers2 = [contentBuyer2.address];

    await makeContentPurchase(
      contractPlatformTreasury,
      contractVoucherVerifier,
      contentBuyer2,
      contractRoleManager,
      contractUDAO,
      tokenIds,
      purchasedParts,
      pricesToPay,
      fullContentPurchase,
      validUntil,
      redeemers2,
      giftReceiver,
      userIds
    );

    // should fail instructor to withdraw earnings from treasury due to no earnings
    await expect(contractPlatformTreasury.connect(contentCreator).withdrawInstructor()).to.be.revertedWith(
      "Debt is larger than or equal to balance"
    );
    // Get the instructer balance after withdrawal
    const instructerBalanceAfter = await contractUDAO.balanceOf(contentCreator.address);
    // Expect that the instructer balance is not 0 after withdrawal
    await expect(instructerBalanceAfter).to.equal(0);
  });

  it("Should fail to set coach or content cuts if caller have not admin role", async function () {
    await reDeploy();
    /// new platform cuts
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

    /// try to set coach cut with non admin role
    await expect(
      contractPlatformTreasury
        .connect(contentBuyer1)
        .setCoachCuts(_coachFoundCut, _coachGoverCut, _coachJurorCut, _coachValidCut)
    ).to.be.revertedWith("Only admins can set coach cuts");
    /// try to set content cut with non admin role
    await expect(
      contractPlatformTreasury
        .connect(contentBuyer1)
        .setContentCuts(_contentFoundCut, _contentGoverCut, _contentJurorCut, _contentValidCut)
    ).to.be.revertedWith("Only admins can set content cuts");
    /// FOUNDATION_ROLE have right to set cuts
    /// try to set coach cut with non admin role
    await expect(
      contractPlatformTreasury
        .connect(foundation)
        .setCoachCuts(_coachFoundCut, _coachGoverCut, _coachJurorCut, _coachValidCut)
    ).emit(contractPlatformTreasury, "PlatformCutsUpdated");
    /// try to set content cut with non admin role
    await expect(
      contractPlatformTreasury
        .connect(foundation)
        .setContentCuts(_contentFoundCut, _contentGoverCut, _contentJurorCut, _contentValidCut)
    ).emit(contractPlatformTreasury, "PlatformCutsUpdated");
    /// grant role to contentBuyer1 to GOVERNANCE_ROLE
    await contractRoleManager.connect(foundation).grantRole(GOVERNANCE_ROLE, contentBuyer1.address);
    /// GOVERNANCE_ROLE role have right to set cuts
    /// try to set coach cut with non admin role
    await expect(
      contractPlatformTreasury
        .connect(contentBuyer1)
        .setCoachCuts(_coachFoundCut, _coachGoverCut, _coachJurorCut, _coachValidCut)
    ).emit(contractPlatformTreasury, "PlatformCutsUpdated");
    /// try to set content cut with non admin role
    await expect(
      contractPlatformTreasury
        .connect(contentBuyer1)
        .setContentCuts(_contentFoundCut, _contentGoverCut, _contentJurorCut, _contentValidCut)
    ).emit(contractPlatformTreasury, "PlatformCutsUpdated");
    /// BACKEND_ROLE have right to set cuts
    /// try to set coach cut with non admin role
    await expect(
      contractPlatformTreasury
        .connect(backend)
        .setCoachCuts(_coachFoundCut, _coachGoverCut, _coachJurorCut, _coachValidCut)
    ).emit(contractPlatformTreasury, "PlatformCutsUpdated");
    /// try to set content cut with non admin role
    await expect(
      contractPlatformTreasury
        .connect(backend)
        .setContentCuts(_contentFoundCut, _contentGoverCut, _contentJurorCut, _contentValidCut)
    ).emit(contractPlatformTreasury, "PlatformCutsUpdated");
  });

  it("Should fail to set coach or content cuts if total cut greater than 100%", async function () {
    await reDeploy();
    /// new platform cuts
    const _contentFoundCut = 400000;
    const _contentGoverCut = 700;
    const _contentJurorCut = 100;
    const _contentValidCut = 200;
    const _contentTotalCut = _contentFoundCut + _contentGoverCut + _contentJurorCut + _contentValidCut;

    const _coachFoundCut = 4000;
    const _coachGoverCut = 700000;
    const _coachJurorCut = 100;
    const _coachValidCut = 200;
    const _coachTotalCut = _coachFoundCut + _coachGoverCut + _coachJurorCut + _coachValidCut;

    /// try to set coach cut with non admin role
    await expect(
      contractPlatformTreasury
        .connect(foundation)
        .setCoachCuts(_coachFoundCut, _coachGoverCut, _coachJurorCut, _coachValidCut)
    ).to.be.revertedWith("Cuts cant be higher than %100");

    /// try to set content cut with non admin role
    await expect(
      contractPlatformTreasury
        .connect(foundation)
        .setContentCuts(_contentFoundCut, _contentGoverCut, _contentJurorCut, _contentValidCut)
    ).to.be.revertedWith("Cuts cant be higher than %100");
  });
});
