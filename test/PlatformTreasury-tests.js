const { expect } = require("chai");
const hardhat = require("hardhat");
const { ethers } = hardhat;
const chai = require("chai");
const BN = require("bn.js");
const { LazyRole } = require("../lib/LazyRole");
const { LazyCoaching } = require("../lib/LazyCoaching");
const { DiscountedPurchase } = require("../lib/DiscountedPurchase");
const helpers = require("@nomicfoundation/hardhat-network-helpers");
const { Redeem } = require("../lib/Redeem");
const { deploy } = require("../lib/deployments");
const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");

// Enable and inject BN dependency
chai.use(require("chai-bn")(BN));
require("dotenv").config();

const TEST_VERSION = process.env.TEST_VERSION;
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

  const contentParts = [0,1]
  /// Create Voucher from redeem.js and use it for creating content
  const createContentVoucherSample = await createContentVoucher(
    contractUDAOContent,
    backend,
    contentCreator,
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
async function makeContentPurchase(contractPlatformTreasury,contractVoucherVerifier, contentBuyer, contractRoleManager, contractUDAO, tokenIds, purchasedParts, pricesToPay, fullContentPurchase, validUntil, redeemers, giftReceiver) {
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
      giftReceiver[i]
    );
    // Save the voucher to the array
    contentPurchaseVouchers.push(contentPurchaseVoucher);
  }
  /// Buy content
  const purchaseTx = await contractPlatformTreasury
    .connect(contentBuyer)
    .buyContentWithDiscount(contentPurchaseVouchers);
  const queueTxReceipt = await purchaseTx.wait();
  const queueTxEvent = queueTxReceipt.events.find((e) => e.event == "ContentBought");
  const contentSaleID = queueTxEvent.args[0];
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
  return coachingSaleID;
}

describe("Platform Treasury General", function () {
  it("Should allow backend to set new governance treasury address", async function () {
    await reDeploy();
    const newGovernanceTreasury = contractUDAOTimelockController;

    // set new governance treasury address

    await expect(
      contractPlatformTreasury
        .connect(backend)
        .updateAddresses(
          contractUDAO.address,
          contractUDAOContent.address,
          contractRoleManager.address,
          newGovernanceTreasury.address,
          contractVoucherVerifier.address
        )
    )
      .to.emit(contractPlatformTreasury, "AddressesUpdated")
      .withArgs(
        contractUDAO.address,
        contractUDAOContent.address,
        contractRoleManager.address,
        newGovernanceTreasury.address,
        contractVoucherVerifier.address
      );
  });

  it("Should allow backend to set new foundation wallet address", async function () {
    await reDeploy();

    // new dummy foundation address
    const newFoundation = await ethers.Wallet.createRandom();
    // set new foundation address
    await expect(contractPlatformTreasury.connect(backend).setFoundationAddress(newFoundation.address))
      .to.emit(contractPlatformTreasury, "FoundationWalletUpdated")
      .withArgs(newFoundation.address);
  });

  it("Should allow governance to withdraw funds from the treasury after a content purchase", async function () {
    await reDeploy();
    if (TEST_VERSION == 1) {
      this.skip();
    }
    await contractRoleManager.setKYC(contentCreator.address, true);
    await contractRoleManager.setKYC(contentBuyer1.address, true);

    /// @dev Setup governance member
    await setupGovernanceMember(contractRoleManager, contractUDAO, contractUDAOStaker, governanceCandidate);
    await setupGovernanceMember(contractRoleManager, contractUDAO, contractUDAOStaker, superValidator);
    await setupGovernanceMember(contractRoleManager, contractUDAO, contractUDAOStaker, superValidatorCandidate);
    await setupGovernanceMember(contractRoleManager, contractUDAO, contractUDAOStaker, validatorCandidate);
    await setupGovernanceMember(contractRoleManager, contractUDAO, contractUDAOStaker, jurorCandidate);

    /// @dev Check account UDAO-vp balance and delegate to themselves
    await checkAccountUDAOVpBalanceAndDelegate(contractUDAOVp, governanceCandidate);
    await checkAccountUDAOVpBalanceAndDelegate(contractUDAOVp, superValidator);
    //await checkAccountUDAOVpBalanceAndDelegate(contractUDAOVp, superValidatorCandidate);
    await checkAccountUDAOVpBalanceAndDelegate(contractUDAOVp, validatorCandidate);
    await checkAccountUDAOVpBalanceAndDelegate(contractUDAOVp, jurorCandidate);
    // Create content
    const contentParts = [0,1]
    /// Create Voucher from redeem.js and use it for creating content
    const createContentVoucherSample = await createContentVoucher(
      contractUDAOContent,
      backend,
      contentCreator,
      contentParts
    );
    /// Create content
    await expect(contractUDAOContent.connect(contentCreator).createContent(createContentVoucherSample))
      .to.emit(contractUDAOContent, "Transfer") // transfer from null address to minter
      .withArgs("0x0000000000000000000000000000000000000000", contentCreator.address, 0);
    // Make a content purchase to gather funds for governance
    await makeContentPurchase(contractPlatformTreasury, contractVoucherVerifier, contentBuyer1, contractRoleManager, contractUDAO);

    // new dummy governance treasury address
    const newGovernanceTreasury = contractUDAOTimelockController;

    // set new governance treasury address
    await expect(
      contractPlatformTreasury.connect(backend).setGovernanceTreasuryAddress(contractUDAOTimelockController.address)
    )
      .to.emit(contractPlatformTreasury, "GovernanceTreasuryUpdated")
      .withArgs(newGovernanceTreasury.address);

    /// @dev Check if the governance candidate has the correct amount of UDAO-vp tokens
    const governanceCandidateBalance = await contractUDAOVp.balanceOf(governanceCandidate.address);
    await expect(governanceCandidateBalance).to.equal(ethers.utils.parseEther("300"));

    /// @dev delegate governance candidate's UDAO-vp tokens to himself
    await contractUDAOVp.connect(governanceCandidate).delegate(governanceCandidate.address);

    /// @dev Check votes for governance candidate on latest block
    const governanceCandidateVotes = await contractUDAOVp.getVotes(governanceCandidate.address);
    await expect(governanceCandidateVotes).to.equal(ethers.utils.parseEther("300"));

    // Create proposal settings to withdraw funds from the treasury
    const targetContractAddress = contractPlatformTreasury.address;
    const targetContract = await ethers.getContractAt("GovernanceTreasury", contractPlatformTreasury.address);
    const proposalValues = 0;
    const proposalCalldata = targetContract.interface.encodeFunctionData("withdrawGovernance");
    const proposalDescription = "Withdraw funds from the treasury";

    // propose
    const proposeTx = await contractUDAOGovernor
      .connect(governanceCandidate)
      .propose([targetContractAddress], [proposalValues], [proposalCalldata], proposalDescription);

    /// @dev Wait for the transaction to be mined
    const tx = await proposeTx.wait();
    const proposalId = tx.events.find((e) => e.event == "ProposalCreated").args.proposalId;

    /// @dev Check if the proposal was created propoerly
    const proposerAddress = tx.events.find((e) => e.event == "ProposalCreated").args.proposer;
    const targetInfo = tx.events.find((e) => e.event == "ProposalCreated").args.targets;
    const returnedCallData = tx.events.find((e) => e.event == "ProposalCreated").args.calldatas;
    await expect(proposerAddress).to.equal(governanceCandidate.address);
    await expect(targetInfo).to.deep.equal([targetContractAddress]);
    await expect(returnedCallData).to.deep.equal([proposalCalldata]);

    /// @dev get to the start of the voting period
    const numBlocksToMine = Math.ceil((7 * 24 * 60 * 60) / 2);
    await hre.network.provider.send("hardhat_mine", [`0x${numBlocksToMine.toString(16)}`, "0x2"]);

    /// @dev Vote on the proposal
    await contractUDAOGovernor.connect(superValidator).castVote(proposalId, 1);
    await contractUDAOGovernor.connect(superValidatorCandidate).castVote(proposalId, 1);
    await contractUDAOGovernor.connect(jurorCandidate).castVote(proposalId, 1);
    await contractUDAOGovernor.connect(validatorCandidate).castVote(proposalId, 1);

    /// @dev Check if the vote was casted
    const proposalState = await contractUDAOGovernor.state(proposalId);
    await expect(proposalState).to.equal(1);

    /// @dev Skip to the end of the voting period
    const numBlocksToMineToEnd = Math.ceil((7 * 24 * 60 * 60) / 2);
    await hre.network.provider.send("hardhat_mine", [`0x${numBlocksToMineToEnd.toString(16)}`, "0x2"]);
    /// @dev Check if the proposal was successful
    const proposalStateAtStart = await contractUDAOGovernor.state(proposalId);
    await expect(proposalStateAtStart).to.equal(4);
    /// @dev Queue the proposal and Check the ProposalQueued event
    const queueTx = await contractUDAOGovernor
      .connect(governanceCandidate)
      .queue([targetContractAddress], [proposalValues], [proposalCalldata], ethers.utils.id(proposalDescription));
    const queueTxReceipt = await queueTx.wait();
    const queueTxEvent = queueTxReceipt.events.find((e) => e.event == "ProposalQueued");
    await expect(queueTxEvent.args.proposalId).to.equal(proposalId);
    //await expect(queueTxEvent.args.eta).to.equal(0);
    /// @dev Check if the proposal was queued
    const proposalStateAfterQueue = await contractUDAOGovernor.state(proposalId);
    await expect(proposalStateAfterQueue).to.equal(5);
    /// @dev Execute the proposal
    const executeTx = await contractUDAOGovernor
      .connect(governanceCandidate)
      .execute([targetContractAddress], [proposalValues], [proposalCalldata], ethers.utils.id(proposalDescription));
    const executeTxReceipt = await executeTx.wait();
    const executeTxEvent = executeTxReceipt.events.find((e) => e.event == "ProposalExecuted");
    await expect(executeTxEvent.args.proposalId).to.equal(proposalId);

    /// @dev Check if the proposal was executed
    const proposalStateAfterExecution = await contractUDAOGovernor.state(proposalId);
    await expect(proposalStateAfterExecution).to.equal(7);

    /// @dev Get the current percent cut of the governance treasury
    const currentGovernanceTreasuryCut = await contractPlatformTreasury.contentGoverCut();

    /// Get the current governance treasury balance
    const currentGovernanceTreasuryBalance = await contractUDAO.balanceOf(newGovernanceTreasury.address);
    /// Get the content price of token Id 0 from UDAOC (first 0 is token ID, second 0 is full price of content)
    const contentPrice = await contractUDAOContent.contentPrice(0, 0);
    /// Multiply the content price with the current governance treasury cut and divide by 100000 to get the expected governance treasury balance
    const expectedGovernanceTreasuryBalanceBeforePercentage = contentPrice.mul(currentGovernanceTreasuryCut);
    const expectedGovernanceTreasuryBalance = expectedGovernanceTreasuryBalanceBeforePercentage.div(100000);

    /// Check if the governance treasury balance is equal to the expected governance treasury balance
    await expect(currentGovernanceTreasuryBalance).to.equal(expectedGovernanceTreasuryBalance);
  });

  it("Should allow governance to withdraw funds from the treasury after multiple content purchases", async function () {
    await reDeploy();
    if (TEST_VERSION == 1) {
      this.skip();
    }
    /// @dev Setup governance member
    await setupGovernanceMember(contractRoleManager, contractUDAO, contractUDAOStaker, governanceCandidate);
    await setupGovernanceMember(contractRoleManager, contractUDAO, contractUDAOStaker, superValidator);
    await setupGovernanceMember(contractRoleManager, contractUDAO, contractUDAOStaker, superValidatorCandidate);
    await setupGovernanceMember(contractRoleManager, contractUDAO, contractUDAOStaker, validatorCandidate);
    await setupGovernanceMember(contractRoleManager, contractUDAO, contractUDAOStaker, jurorCandidate);

    /// @dev Check account UDAO-vp balance and delegate to themselves
    await checkAccountUDAOVpBalanceAndDelegate(contractUDAOVp, governanceCandidate);
    await checkAccountUDAOVpBalanceAndDelegate(contractUDAOVp, superValidator);
    await checkAccountUDAOVpBalanceAndDelegate(contractUDAOVp, validatorCandidate);
    await checkAccountUDAOVpBalanceAndDelegate(contractUDAOVp, jurorCandidate);
    // Create content
    await _createContent(
      contractRoleManager,
      contractUDAOContent,
      contractSupervision,
      backend,
      validator1,
      validator2,
      validator3,
      validator4,
      validator5,
      contentCreator
    );
    // Make a content purchase to gather funds for governance
    await makeContentPurchase(contractPlatformTreasury, contentBuyer1, contractRoleManager, contractUDAO);
    await makeContentPurchase(contractPlatformTreasury, contentBuyer2, contractRoleManager, contractUDAO);
    await makeContentPurchase(contractPlatformTreasury, contentBuyer3, contractRoleManager, contractUDAO);

    // new dummy governance treasury address
    const newGovernanceTreasury = contractUDAOTimelockController;

    // set new governance treasury address
    await expect(
      contractPlatformTreasury.connect(backend).setGovernanceTreasuryAddress(contractUDAOTimelockController.address)
    )
      .to.emit(contractPlatformTreasury, "GovernanceTreasuryUpdated")
      .withArgs(newGovernanceTreasury.address);

    /// @dev Check if the governance candidate has the correct amount of UDAO-vp tokens
    const governanceCandidateBalance = await contractUDAOVp.balanceOf(governanceCandidate.address);
    await expect(governanceCandidateBalance).to.equal(ethers.utils.parseEther("300"));

    /// @dev delegate governance candidate's UDAO-vp tokens to himself
    await contractUDAOVp.connect(governanceCandidate).delegate(governanceCandidate.address);

    /// @dev Check votes for governance candidate on latest block
    const governanceCandidateVotes = await contractUDAOVp.getVotes(governanceCandidate.address);
    await expect(governanceCandidateVotes).to.equal(ethers.utils.parseEther("300"));

    // Create proposal settings to withdraw funds from the treasury
    const targetContractAddress = contractPlatformTreasury.address;
    const targetContract = await ethers.getContractAt("PlatformTreasury", contractPlatformTreasury.address);
    const proposalValues = 0;
    const proposalCalldata = targetContract.interface.encodeFunctionData("withdrawGovernance");
    const proposalDescription = "Withdraw funds from the treasury";

    // propose
    const proposeTx = await contractUDAOGovernor
      .connect(governanceCandidate)
      .propose([targetContractAddress], [proposalValues], [proposalCalldata], proposalDescription);

    /// @dev Wait for the transaction to be mined
    const tx = await proposeTx.wait();
    const proposalId = tx.events.find((e) => e.event == "ProposalCreated").args.proposalId;

    /// @dev Check if the proposal was created propoerly
    const proposerAddress = tx.events.find((e) => e.event == "ProposalCreated").args.proposer;
    const targetInfo = tx.events.find((e) => e.event == "ProposalCreated").args.targets;
    const returnedCallData = tx.events.find((e) => e.event == "ProposalCreated").args.calldatas;
    await expect(proposerAddress).to.equal(governanceCandidate.address);
    await expect(targetInfo).to.deep.equal([targetContractAddress]);
    await expect(returnedCallData).to.deep.equal([proposalCalldata]);

    /// @dev get to the start of the voting period
    const numBlocksToMine = Math.ceil((7 * 24 * 60 * 60) / 2);
    await hre.network.provider.send("hardhat_mine", [`0x${numBlocksToMine.toString(16)}`, "0x2"]);

    /// @dev Vote on the proposal
    await contractUDAOGovernor.connect(superValidator).castVote(proposalId, 1);
    await contractUDAOGovernor.connect(superValidatorCandidate).castVote(proposalId, 1);
    await contractUDAOGovernor.connect(jurorCandidate).castVote(proposalId, 1);
    await contractUDAOGovernor.connect(validatorCandidate).castVote(proposalId, 1);

    /// @dev Check if the vote was casted
    const proposalState = await contractUDAOGovernor.state(proposalId);
    await expect(proposalState).to.equal(1);

    /// @dev Skip to the end of the voting period
    const numBlocksToMineToEnd = Math.ceil((7 * 24 * 60 * 60) / 2);
    await hre.network.provider.send("hardhat_mine", [`0x${numBlocksToMineToEnd.toString(16)}`, "0x2"]);
    /// @dev Check if the proposal was successful
    const proposalStateAtStart = await contractUDAOGovernor.state(proposalId);
    await expect(proposalStateAtStart).to.equal(4);
    /// @dev Queue the proposal and Check the ProposalQueued event
    const queueTx = await contractUDAOGovernor
      .connect(governanceCandidate)
      .queue([targetContractAddress], [proposalValues], [proposalCalldata], ethers.utils.id(proposalDescription));
    const queueTxReceipt = await queueTx.wait();
    const queueTxEvent = queueTxReceipt.events.find((e) => e.event == "ProposalQueued");
    await expect(queueTxEvent.args.proposalId).to.equal(proposalId);
    //await expect(queueTxEvent.args.eta).to.equal(0);
    /// @dev Check if the proposal was queued
    const proposalStateAfterQueue = await contractUDAOGovernor.state(proposalId);
    await expect(proposalStateAfterQueue).to.equal(5);
    /// @dev Execute the proposal
    const executeTx = await contractUDAOGovernor
      .connect(governanceCandidate)
      .execute([targetContractAddress], [proposalValues], [proposalCalldata], ethers.utils.id(proposalDescription));
    const executeTxReceipt = await executeTx.wait();
    const executeTxEvent = executeTxReceipt.events.find((e) => e.event == "ProposalExecuted");
    await expect(executeTxEvent.args.proposalId).to.equal(proposalId);

    /// @dev Check if the proposal was executed
    const proposalStateAfterExecution = await contractUDAOGovernor.state(proposalId);
    await expect(proposalStateAfterExecution).to.equal(7);

    /// @dev Get the current percent cut of the governance treasury
    const currentGovernanceTreasuryCut = await contractPlatformTreasury.contentGoverCut();

    /// Get the current governance treasury balance
    const currentGovernanceTreasuryBalance = await contractUDAO.balanceOf(newGovernanceTreasury.address);
    /// Get the content price of token Id 0 from UDAOC (first 0 is token ID, second 0 is full price of content)
    const contentPrice = await contractUDAOContent.contentPrice(0, 0);
    /// Multiply contentPrice with 3 since we have 3 content buyers
    const contentPriceWithThreeBuyers = contentPrice.mul(3);
    /// Multiply the content price with the current governance treasury cut and divide by 100000 to get the expected governance treasury balance
    const expectedGovernanceTreasuryBalanceBeforePercentage =
      contentPriceWithThreeBuyers.mul(currentGovernanceTreasuryCut);
    const expectedGovernanceTreasuryBalance = expectedGovernanceTreasuryBalanceBeforePercentage.div(100000);

    /// Check if the governance treasury balance is equal to the expected governance treasury balance
    await expect(currentGovernanceTreasuryBalance).to.equal(expectedGovernanceTreasuryBalance);
  });

  it("Should allow foundation to withdraw funds from the treasury after a content purchase", async function () {
    await reDeploy();
    // KYC content creator and content buyer
    await contractRoleManager.setKYC(contentCreator.address, true);
    await contractRoleManager.setKYC(contentBuyer1.address, true);
    // Create content
    const contentParts = [0,1]
    // Create content voucher
    const createContentVoucherSample = await createContentVoucher(
      contractUDAOContent,
      backend,
      contentCreator,
      contentParts,
      (redeemType = 1),
      (validationScore = 1)
    );
    // Create content with voucher
    await expect(contractUDAOContent.connect(contentCreator).createContent(createContentVoucherSample))
      .to.emit(contractUDAOContent, "Transfer") // transfer from null address to minter
      .withArgs("0x0000000000000000000000000000000000000000", contentCreator.address, 0);
    // Make a content purchase to gather funds for governance
    const tokenIds = [0];
    const purchasedParts = [[1]];
    const redeemers = [contentBuyer1.address];
    const giftReceiver = [ethers.constants.AddressZero];
    const fullContentPurchase = [false];
    const pricesToPay = [ethers.utils.parseEther("1")];
    const validUntil = Date.now() + 999999999;
    await makeContentPurchase(contractPlatformTreasury, contractVoucherVerifier, contentBuyer1, contractRoleManager, contractUDAO, tokenIds, purchasedParts, pricesToPay, fullContentPurchase, validUntil, redeemers, giftReceiver);
    // set foundation wallet address
    await expect(contractPlatformTreasury.connect(backend).setFoundationAddress(foundation.address))
      .to.emit(contractPlatformTreasury, "FoundationWalletUpdated")
      .withArgs(foundation.address);

    /// @dev Skip 14 days to allow foundation to withdraw funds
    const numBlocksToMine = Math.ceil((14 * 24 * 60 * 60) / 2);
    await hre.network.provider.send("hardhat_mine", [`0x${numBlocksToMine.toString(16)}`, "0x2"]);

    /// @dev Withdraw foundation funds from the treasury
    await contractPlatformTreasury.connect(foundation).withdrawFoundation();

    /// @dev Get the current percent cut of the foundation
    const currentFoundationCut = await contractPlatformTreasury.contentFoundCut();
    /// Get the current foundation balance
    const currentFoundationBalance = await contractUDAO.balanceOf(foundation.address);
    const contentPrice = pricesToPay[0]
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
    const contentParts = [0,1]

    // Create content voucher
    const createContentVoucherSample = await createContentVoucher(
      contractUDAOContent,
      backend,
      contentCreator,
      contentParts,
      (redeemType = 1),
      (validationScore = 1)
    );
    // Create content with voucher
    await expect(contractUDAOContent.connect(contentCreator).createContent(createContentVoucherSample))
      .to.emit(contractUDAOContent, "Transfer") // transfer from null address to minter
      .withArgs("0x0000000000000000000000000000000000000000", contentCreator.address, 0);
    // Make a content purchase to gather funds for governance
    const tokenIds = [0];
    const purchasedParts = [[1]];
    const redeemers1 = [contentBuyer1.address];
    const redeemers2 = [contentBuyer2.address];
    const redeemers3 = [contentBuyer3.address];
    const giftReceiver = [ethers.constants.AddressZero];
    const fullContentPurchase = [false];
    const pricesToPay = [ethers.utils.parseEther("1")];
    const validUntil = Date.now() + 999999999;
    await makeContentPurchase(contractPlatformTreasury, contractVoucherVerifier, contentBuyer1, contractRoleManager, contractUDAO, tokenIds, purchasedParts, pricesToPay, fullContentPurchase, validUntil, redeemers1, giftReceiver);
    await makeContentPurchase(contractPlatformTreasury, contractVoucherVerifier, contentBuyer2, contractRoleManager, contractUDAO, tokenIds, purchasedParts, pricesToPay, fullContentPurchase, validUntil, redeemers2, giftReceiver);
    await makeContentPurchase(contractPlatformTreasury, contractVoucherVerifier, contentBuyer3, contractRoleManager, contractUDAO, tokenIds, purchasedParts, pricesToPay, fullContentPurchase, validUntil, redeemers3, giftReceiver);


    // set foundation wallet address
    await expect(contractPlatformTreasury.connect(backend).setFoundationAddress(foundation.address))
      .to.emit(contractPlatformTreasury, "FoundationWalletUpdated")
      .withArgs(foundation.address);

    /// @dev Skip 14 days to allow foundation to withdraw funds
    const numBlocksToMine = Math.ceil((14 * 24 * 60 * 60) / 2);
    await hre.network.provider.send("hardhat_mine", [`0x${numBlocksToMine.toString(16)}`, "0x2"]);

    /// @dev Withdraw foundation funds from the treasury
    await contractPlatformTreasury.connect(foundation).withdrawFoundation();

    /// @dev Get the current percent cut of the foundation
    const currentFoundationCut = await contractPlatformTreasury.contentFoundCut();

    /// Get the current foundation balance
    const currentFoundationBalance = await contractUDAO.balanceOf(foundation.address);
    const contentPrice = pricesToPay[0]
    /// Multiply content price with 3 since 3 content purchases were made
    const contentPriceTimesThree = contentPrice.mul(3);
    /// Multiply the content price with the current foundation cut and divide by 100000 to get the expected foundation balance
    const expectedFoundationBalanceBeforePercentage = contentPriceTimesThree.mul(currentFoundationCut);
    const expectedFoundationBalance = expectedFoundationBalanceBeforePercentage.div(100000);

    /// Check if the governance treasury balance is equal to the expected governance treasury balance
    await expect(currentFoundationBalance).to.equal(expectedFoundationBalance);
  });

  it("Should allow validator to withdraw funds from the treasury after a content purchase", async function () {
    await reDeploy();
    if (TEST_VERSION == 1) {
      this.skip();
    }
    // Create content
    await _createContent(
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
      500
    );
    // Make a content purchase to gather funds for governance
    await makeContentPurchase(contractPlatformTreasury, contentBuyer1, contractRoleManager, contractUDAO);

    // Check account balances of validators before withdrawal
    const validator1BalanceBefore = await contractUDAO.balanceOf(validator1.address);
    const validator2BalanceBefore = await contractUDAO.balanceOf(validator2.address);
    const validator3BalanceBefore = await contractUDAO.balanceOf(validator3.address);
    const validator4BalanceBefore = await contractUDAO.balanceOf(validator4.address);
    const validator5BalanceBefore = await contractUDAO.balanceOf(validator5.address);
    // expect balances to be equal to zero (They not anymore since commit: 617d510)
    //await expect(validator1BalanceBefore).to.equal(0);
    //...2-3-4...
    //await expect(validator5BalanceBefore).to.equal(0);

    // Get the ID of the current distribution round
    const currentDistributionRound = await contractSupervision.distributionRound();
    // Foundation should call distributeRewards to distribute rewards to validators
    await contractPlatformTreasury.connect(foundation).distributeRewards();

    // Call withdrawValidator from platformtreasury contract for each validator
    await contractPlatformTreasury.connect(validator1).withdrawValidator();
    await contractPlatformTreasury.connect(validator2).withdrawValidator();
    await contractPlatformTreasury.connect(validator3).withdrawValidator();
    await contractPlatformTreasury.connect(validator4).withdrawValidator();
    await contractPlatformTreasury.connect(validator5).withdrawValidator();

    // Check account balances of validators after withdrawal
    const validator1BalanceAfter = await contractUDAO.balanceOf(validator1.address);
    const validator2BalanceAfter = await contractUDAO.balanceOf(validator2.address);
    const validator3BalanceAfter = await contractUDAO.balanceOf(validator3.address);
    const validator4BalanceAfter = await contractUDAO.balanceOf(validator4.address);
    const validator5BalanceAfter = await contractUDAO.balanceOf(validator5.address);

    /// @dev Calculate how much each validator should receive
    // Get the current validator cut
    const currentValidatorCut = await contractPlatformTreasury.contentValidatorCut();
    // Get the content price of token Id 0 from UDAOC (first 0 is token ID, second 0 is full price of content)
    const contentPrice = await contractUDAOContent.contentPrice(0, 0);
    // Get the total validation score
    const totalValidationScore = await contractSupervision.totalValidationScore();
    // Get the validator scores of validators
    const validator1Score = await contractSupervision.getValidatorScore(validator1.address, currentDistributionRound);
    const validator2Score = await contractSupervision.getValidatorScore(validator2.address, currentDistributionRound);
    const validator3Score = await contractSupervision.getValidatorScore(validator3.address, currentDistributionRound);
    const validator4Score = await contractSupervision.getValidatorScore(validator4.address, currentDistributionRound);
    const validator5Score = await contractSupervision.getValidatorScore(validator5.address, currentDistributionRound);
    // Calculate the expected validators cut
    const expectedValidator1Cut = contentPrice
      .mul(currentValidatorCut)
      .mul(validator1Score)
      .div(totalValidationScore)
      .div(100000);
    const expectedValidator2Cut = contentPrice
      .mul(currentValidatorCut)
      .mul(validator2Score)
      .div(totalValidationScore)
      .div(100000);
    const expectedValidator3Cut = contentPrice
      .mul(currentValidatorCut)
      .mul(validator3Score)
      .div(totalValidationScore)
      .div(100000);
    const expectedValidator4Cut = contentPrice
      .mul(currentValidatorCut)
      .mul(validator4Score)
      .div(totalValidationScore)
      .div(100000);
    const expectedValidator5Cut = contentPrice
      .mul(currentValidatorCut)
      .mul(validator5Score)
      .div(totalValidationScore)
      .div(100000);

    /// @dev Check if the validator balances are equal to the expected validator balances
    await expect(validator1BalanceAfter.sub(validator1BalanceBefore)).to.equal(expectedValidator1Cut);
    await expect(validator2BalanceAfter.sub(validator2BalanceBefore)).to.equal(expectedValidator2Cut);
    await expect(validator3BalanceAfter.sub(validator3BalanceBefore)).to.equal(expectedValidator3Cut);
    await expect(validator4BalanceAfter.sub(validator4BalanceBefore)).to.equal(expectedValidator4Cut);
    await expect(validator5BalanceAfter.sub(validator5BalanceBefore)).to.equal(expectedValidator5Cut);
  });

  it("Should allow validator to withdraw funds from the treasury after multiple content purchases", async function () {
    await reDeploy();
    if (TEST_VERSION == 1) {
      this.skip();
    }
    // Create content
    await _createContent(
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
      500
    );
    // Make a content purchase to gather funds for governance
    await makeContentPurchase(contractPlatformTreasury, contentBuyer1, contractRoleManager, contractUDAO);
    await makeContentPurchase(contractPlatformTreasury, contentBuyer2, contractRoleManager, contractUDAO);
    await makeContentPurchase(contractPlatformTreasury, contentBuyer3, contractRoleManager, contractUDAO);

    // Check account balances of validators before withdrawal
    const validator1BalanceBefore = await contractUDAO.balanceOf(validator1.address);
    const validator2BalanceBefore = await contractUDAO.balanceOf(validator2.address);
    const validator3BalanceBefore = await contractUDAO.balanceOf(validator3.address);
    const validator4BalanceBefore = await contractUDAO.balanceOf(validator4.address);
    const validator5BalanceBefore = await contractUDAO.balanceOf(validator5.address);
    // expect balances to be equal to zero (They not anymore since commit: 617d510)
    //await expect(validator1BalanceBefore).to.equal(0);
    //...2-3-4...
    //await expect(validator5BalanceBefore).to.equal(0);

    // Get the ID of the current distribution round
    const currentDistributionRound = await contractSupervision.distributionRound();
    // Foundation should call distributeRewards to distribute rewards to validators
    await contractPlatformTreasury.connect(foundation).distributeRewards();

    // Call withdrawValidator from platformtreasury contract for each validator
    await contractPlatformTreasury.connect(validator1).withdrawValidator();
    await contractPlatformTreasury.connect(validator2).withdrawValidator();
    await contractPlatformTreasury.connect(validator3).withdrawValidator();
    await contractPlatformTreasury.connect(validator4).withdrawValidator();
    await contractPlatformTreasury.connect(validator5).withdrawValidator();

    // Check account balances of validators after withdrawal
    const validator1BalanceAfter = await contractUDAO.balanceOf(validator1.address);
    const validator2BalanceAfter = await contractUDAO.balanceOf(validator2.address);
    const validator3BalanceAfter = await contractUDAO.balanceOf(validator3.address);
    const validator4BalanceAfter = await contractUDAO.balanceOf(validator4.address);
    const validator5BalanceAfter = await contractUDAO.balanceOf(validator5.address);

    /// @dev Calculate how much each validator should receive
    // Get the current validator cut
    const currentValidatorCut = await contractPlatformTreasury.contentValidatorCut();
    // Get the content price of token Id 0 from UDAOC (first 0 is token ID, second 0 is full price of content)
    const contentPrice = await contractUDAOContent.contentPrice(0, 0);
    // Multiply content price with 3 since there are 3 content purchases
    const totalContentPrice = contentPrice.mul(3);
    // Get the total validation score
    const totalValidationScore = await contractSupervision.totalValidationScore();
    // Get the validator scores of validators
    const validator1Score = await contractSupervision.getValidatorScore(validator1.address, currentDistributionRound);
    const validator2Score = await contractSupervision.getValidatorScore(validator2.address, currentDistributionRound);
    const validator3Score = await contractSupervision.getValidatorScore(validator3.address, currentDistributionRound);
    const validator4Score = await contractSupervision.getValidatorScore(validator4.address, currentDistributionRound);
    const validator5Score = await contractSupervision.getValidatorScore(validator5.address, currentDistributionRound);
    // Calculate the expected validators cut
    const expectedValidator1Cut = totalContentPrice
      .mul(currentValidatorCut)
      .mul(validator1Score)
      .div(totalValidationScore)
      .div(100000);
    const expectedValidator2Cut = totalContentPrice
      .mul(currentValidatorCut)
      .mul(validator2Score)
      .div(totalValidationScore)
      .div(100000);
    const expectedValidator3Cut = totalContentPrice
      .mul(currentValidatorCut)
      .mul(validator3Score)
      .div(totalValidationScore)
      .div(100000);
    const expectedValidator4Cut = totalContentPrice
      .mul(currentValidatorCut)
      .mul(validator4Score)
      .div(totalValidationScore)
      .div(100000);
    const expectedValidator5Cut = totalContentPrice
      .mul(currentValidatorCut)
      .mul(validator5Score)
      .div(totalValidationScore)
      .div(100000);

    /// @dev Check if the validator balances are equal to the expected validator balances
    await expect(validator1BalanceAfter.sub(validator1BalanceBefore)).to.equal(expectedValidator1Cut);
    await expect(validator2BalanceAfter.sub(validator2BalanceBefore)).to.equal(expectedValidator2Cut);
    await expect(validator3BalanceAfter.sub(validator3BalanceBefore)).to.equal(expectedValidator3Cut);
    await expect(validator4BalanceAfter.sub(validator4BalanceBefore)).to.equal(expectedValidator4Cut);
    await expect(validator5BalanceAfter.sub(validator5BalanceBefore)).to.equal(expectedValidator5Cut);
  });

  it("Should allow jurors to withdraw funds from the treasury after a dispute is resolved", async function () {
    await reDeploy();
    if (TEST_VERSION == 1) {
      this.skip();
    }
    /// Set KYC
    await contractRoleManager.setKYC(jurorMember1.address, true);
    await contractRoleManager.setKYC(jurorMember2.address, true);
    await contractRoleManager.setKYC(jurorMember3.address, true);
    /// @dev Dispute settings
    const caseScope = 1;
    const caseQuestion = "Should we remove this content?";
    const caseTokenRelated = true;
    const caseTokenId = 0;
    const _data = "0x";
    const _targetContract = ethers.constants.AddressZero;
    // Create content
    await _createContent(
      contractRoleManager,
      contractUDAOContent,
      contractSupervision,
      backend,
      validator1,
      validator2,
      validator3,
      validator4,
      validator5,
      contentCreator
    );
    // Make a content purchase to gather funds for governance
    await makeContentPurchase(contractPlatformTreasury, contentBuyer1, contractRoleManager, contractUDAO);
    /// @dev Create dispute
    await contractSupervision
      .connect(backend)
      .createDispute(caseScope, caseQuestion, caseTokenRelated, caseTokenId, _data, _targetContract);
    /// @dev Assign dispute to juror
    const disputeId = 1;
    await contractSupervision.connect(jurorMember1).assignDispute(disputeId);
    await contractSupervision.connect(jurorMember2).assignDispute(disputeId);
    await contractSupervision.connect(jurorMember3).assignDispute(disputeId);
    /// @dev Send dispute result
    const disputeResultOfJurorMember1 = 1;
    const disputeResultOfJurorMember2 = 0;
    const disputeResultOfJurorMember3 = 0;
    const disputeVerdict = false;
    await contractSupervision.connect(jurorMember1).sendDisputeResult(disputeId, disputeResultOfJurorMember1);
    await contractSupervision.connect(jurorMember2).sendDisputeResult(disputeId, disputeResultOfJurorMember2);
    await expect(contractSupervision.connect(jurorMember3).sendDisputeResult(disputeId, disputeResultOfJurorMember3))
      .to.emit(contractSupervision, "DisputeEnded")
      .withArgs(disputeId, disputeVerdict);

    // Get the ID of the current distribution round
    const currentDistributionRound = await contractSupervision.distributionRound();

    /// @dev Check scores of jurors in this round
    const scoreOfJuror1 = await contractSupervision.getJurorScore(jurorMember1.address, currentDistributionRound);
    const scoreOfJuror2 = await contractSupervision.getJurorScore(jurorMember2.address, currentDistributionRound);
    const scoreOfJuror3 = await contractSupervision.getJurorScore(jurorMember3.address, currentDistributionRound);
    expect(scoreOfJuror1).to.equal(0);
    expect(scoreOfJuror2).to.equal(1);
    expect(scoreOfJuror3).to.equal(1);

    /// @dev Check account balances of jurors before withdrawal
    const jurorMember1BalanceBefore = await contractUDAO.balanceOf(jurorMember1.address);
    const jurorMember2BalanceBefore = await contractUDAO.balanceOf(jurorMember2.address);
    const jurorMember3BalanceBefore = await contractUDAO.balanceOf(jurorMember3.address);
    //@dev Expect balances to 0 (They not anymore since commit: 617d510)
    //await expect(jurorMember1BalanceBefore).to.equal(0);
    //await expect(jurorMember2BalanceBefore).to.equal(0);
    //await expect(jurorMember3BalanceBefore).to.equal(0);

    // Get the current juror balance for a round (calculated in content manager)
    const jurorBalanceForRound = await contractPlatformTreasury.jurorBalanceForRound();
    // Foundation should call distributeRewards to distribute rewards to jurors
    await contractPlatformTreasury.connect(foundation).distributeRewards();

    // Call withdrawJuror from platformtreasury contract for each juror
    await contractPlatformTreasury.connect(jurorMember1).withdrawJuror();
    await contractPlatformTreasury.connect(jurorMember2).withdrawJuror();
    await contractPlatformTreasury.connect(jurorMember3).withdrawJuror();

    /// @dev Check account balances of jurors after withdrawal
    const jurorMember1BalanceAfter = await contractUDAO.balanceOf(jurorMember1.address);
    const jurorMember2BalanceAfter = await contractUDAO.balanceOf(jurorMember2.address);
    const jurorMember3BalanceAfter = await contractUDAO.balanceOf(jurorMember3.address);
    /// @dev Calculate how much each juror should receive
    // Get the juror cut
    const jurorCut = await contractPlatformTreasury.contentJurorCut();
    // Get the content price of token Id 0 from UDAOC (first 0 is token ID, second 0 is full price of content)
    const contentPrice = await contractUDAOContent.contentPrice(0, 0);
    // Get the total juror score
    const totalJurorScore = scoreOfJuror1.add(scoreOfJuror2).add(scoreOfJuror3);
    // Check if this matches with getTotalJurorScore result
    const getCumulativeJurorScore = await contractSupervision.getTotalJurorScore();
    expect(getCumulativeJurorScore).to.equal(totalJurorScore);
    // Expect calculated juror balance for round to be equal to content price * juror cut / 100000
    expect(jurorBalanceForRound).to.equal(contentPrice.mul(jurorCut).div(100000));
    // Calculate payPerJuror
    const calculatedPayPerJuror = jurorBalanceForRound.div(totalJurorScore);
    // Get payPerJuror from contract
    const payPerJuror = await contractPlatformTreasury.payPerJuror(currentDistributionRound);
    // Check if calculated payPerJuror matches with payPerJuror from contract
    expect(calculatedPayPerJuror).to.equal(payPerJuror);
    // Calculate the expected juror balances
    const expectedJurorMember1Balance = payPerJuror.mul(scoreOfJuror1);
    const expectedJurorMember2Balance = payPerJuror.mul(scoreOfJuror2);
    const expectedJurorMember3Balance = payPerJuror.mul(scoreOfJuror3);
    // Expect that the account balances of jurors are equal to the expected balances
    await expect(jurorMember1BalanceAfter.sub(jurorMember1BalanceBefore)).to.equal(expectedJurorMember1Balance);
    await expect(jurorMember2BalanceAfter.sub(jurorMember2BalanceBefore)).to.equal(expectedJurorMember2Balance);
    await expect(jurorMember3BalanceAfter.sub(jurorMember3BalanceBefore)).to.equal(expectedJurorMember3Balance);
  });

  /// TODO
  it("Should distribute rewards to jurors when there are multiple disputes", async function () {});

  it("Should allow instructers to withdraw their earnings", async function () {
    await reDeploy();
    // KYC content creator and content buyers
    await contractRoleManager.setKYC(contentCreator.address, true);
    await contractRoleManager.setKYC(contentBuyer1.address, true);
    await contractRoleManager.setKYC(contentBuyer2.address, true);
    await contractRoleManager.setKYC(contentBuyer3.address, true);
    // Create content
    const contentParts = [0,1]

    // Create content voucher
    const createContentVoucherSample = await createContentVoucher(
      contractUDAOContent,
      backend,
      contentCreator,
      contentParts,
      (redeemType = 1),
      (validationScore = 1)
    );
    // Create content with voucher
    await expect(contractUDAOContent.connect(contentCreator).createContent(createContentVoucherSample))
      .to.emit(contractUDAOContent, "Transfer") // transfer from null address to minter
      .withArgs("0x0000000000000000000000000000000000000000", contentCreator.address, 0);
    // Make a content purchase to gather funds for governance
    const tokenIds = [0];
    const purchasedParts = [[1]];
    const redeemers = [contentBuyer1.address];
    const giftReceiver = [ethers.constants.AddressZero];
    const fullContentPurchase = [false];
    const pricesToPay = [ethers.utils.parseEther("1")];
    const validUntil = Date.now() + 999999999;
    await makeContentPurchase(contractPlatformTreasury, contractVoucherVerifier, contentBuyer1, contractRoleManager, contractUDAO, tokenIds, purchasedParts, pricesToPay, fullContentPurchase, validUntil, redeemers, giftReceiver);
    

    // Get the instructer balance before withdrawal
    const instructerBalanceBefore = await contractUDAO.balanceOf(contentCreator.address);
    // Expect that the instructer balance is 0 before withdrawal
    await expect(instructerBalanceBefore).to.equal(0);
    /// @dev Skip 14 days to allow foundation to withdraw funds
    const numBlocksToMine = Math.ceil((14 * 24 * 60 * 60) / 2);
    await hre.network.provider.send("hardhat_mine", [`0x${numBlocksToMine.toString(16)}`, "0x2"]);
    // Instructer should call withdrawInstructor from platformtreasury contract
    await contractPlatformTreasury.connect(contentCreator).withdrawInstructor();
    // Get the instructer balance after withdrawal
    const instructerBalanceAfter = await contractUDAO.balanceOf(contentCreator.address);
    // Expect that the instructer balance is not 0 after withdrawal
    await expect(instructerBalanceAfter).to.not.equal(0);

    /// @dev Calculate how much the instructer should receive
    const contentPrice = pricesToPay[0]
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

  it("Should allow Banned-jurors to withdraw funds from the treasury after a dispute is resolved", async function () {
    if (TEST_VERSION == 1) {
      this.skip();
    }
    await reDeploy();
    /// Set KYC
    await contractRoleManager.setKYC(jurorMember1.address, true);
    await contractRoleManager.setKYC(jurorMember2.address, true);
    await contractRoleManager.setKYC(jurorMember3.address, true);
    /// @dev Dispute settings
    const caseScope = 1;
    const caseQuestion = "Should we remove this content?";
    const caseTokenRelated = true;
    const caseTokenId = 0;
    const caseRefund = false;
    const caseRefundId = 0;
    const _data = "0x";
    const _targetContract = ethers.constants.AddressZero;
    // Create content
    await _createContent(
      contractRoleManager,
      contractUDAOContent,
      contractSupervision,
      backend,
      validator1,
      validator2,
      validator3,
      validator4,
      validator5,
      contentCreator
    );
    // Make a content purchase to gather funds for governance
    await makeContentPurchase(contractPlatformTreasury, contentBuyer1, contractRoleManager, contractUDAO);

    /// @dev Create dispute
    await contractSupervision
      .connect(backend)
      .createDispute(caseScope, caseQuestion, caseTokenRelated, caseTokenId, _data, _targetContract);
    /// @dev Assign dispute to juror
    const disputeId = 1;
    await contractSupervision.connect(jurorMember1).assignDispute(disputeId);
    await contractSupervision.connect(jurorMember2).assignDispute(disputeId);
    await contractSupervision.connect(jurorMember3).assignDispute(disputeId);
    /// @dev Send dispute result
    const disputeResultOfJurorMember1 = 1;
    const disputeResultOfJurorMember2 = 0;
    const disputeResultOfJurorMember3 = 0;
    const disputeVerdict = false;
    await contractSupervision.connect(jurorMember1).sendDisputeResult(disputeId, disputeResultOfJurorMember1);
    await contractSupervision.connect(jurorMember2).sendDisputeResult(disputeId, disputeResultOfJurorMember2);
    await expect(contractSupervision.connect(jurorMember3).sendDisputeResult(disputeId, disputeResultOfJurorMember3))
      .to.emit(contractSupervision, "DisputeEnded")
      .withArgs(disputeId, disputeVerdict);

    // Get the ID of the current distribution round
    const currentDistributionRound = await contractSupervision.distributionRound();

    /// @dev Check scores of jurors in this round
    const scoreOfJuror1 = await contractSupervision.getJurorScore(jurorMember1.address, currentDistributionRound);
    const scoreOfJuror2 = await contractSupervision.getJurorScore(jurorMember2.address, currentDistributionRound);
    const scoreOfJuror3 = await contractSupervision.getJurorScore(jurorMember3.address, currentDistributionRound);
    expect(scoreOfJuror1).to.equal(0);
    expect(scoreOfJuror2).to.equal(1);
    expect(scoreOfJuror3).to.equal(1);

    /// @dev Check account balances of jurors before withdrawal
    const jurorMember1BalanceBefore = await contractUDAO.balanceOf(jurorMember1.address);
    const jurorMember2BalanceBefore = await contractUDAO.balanceOf(jurorMember2.address);
    const jurorMember3BalanceBefore = await contractUDAO.balanceOf(jurorMember3.address);
    /// @dev Expect balances to 0 (They not anymore since commit: 617d510)
    //await expect(jurorMember1BalanceBefore).to.equal(0);
    //await expect(jurorMember2BalanceBefore).to.equal(0);
    //await expect(jurorMember3BalanceBefore).to.equal(0);

    // Get the current juror balance for a round (calculated in content manager)
    const jurorBalanceForRound = await contractPlatformTreasury.jurorBalanceForRound();
    // Foundation should call distributeRewards to distribute rewards to jurors
    await contractPlatformTreasury.connect(foundation).distributeRewards();

    // Ban the Jurors
    await contractRoleManager.setBan(jurorMember1.address, true);
    await contractRoleManager.setBan(jurorMember2.address, true);
    await contractRoleManager.setBan(jurorMember3.address, true);

    // Call withdrawJuror from platformtreasury contract for each juror
    await contractPlatformTreasury.connect(jurorMember1).withdrawJuror();
    await contractPlatformTreasury.connect(jurorMember2).withdrawJuror();
    await contractPlatformTreasury.connect(jurorMember3).withdrawJuror();

    /// @dev Check account balances of jurors after withdrawal
    const jurorMember1BalanceAfter = await contractUDAO.balanceOf(jurorMember1.address);
    const jurorMember2BalanceAfter = await contractUDAO.balanceOf(jurorMember2.address);
    const jurorMember3BalanceAfter = await contractUDAO.balanceOf(jurorMember3.address);
    /// @dev Calculate how much each juror should receive
    // Get the juror cut
    const jurorCut = await contractPlatformTreasury.contentJurorCut();
    // Get the content price of token Id 0 from UDAOC (first 0 is token ID, second 0 is full price of content)
    const contentPrice = await contractUDAOContent.contentPrice(0, 0);
    // Get the total juror score
    const totalJurorScore = scoreOfJuror1.add(scoreOfJuror2).add(scoreOfJuror3);
    // Check if this matches with getTotalJurorScore result
    const getCumulativeJurorScore = await contractSupervision.getTotalJurorScore();
    expect(getCumulativeJurorScore).to.equal(totalJurorScore);
    // Expect calculated juror balance for round to be equal to content price * juror cut / 100000
    expect(jurorBalanceForRound).to.equal(contentPrice.mul(jurorCut).div(100000));
    // Calculate payPerJuror
    const calculatedPayPerJuror = jurorBalanceForRound.div(totalJurorScore);
    // Get payPerJuror from contract
    const payPerJuror = await contractPlatformTreasury.payPerJuror(currentDistributionRound);
    // Check if calculated payPerJuror matches with payPerJuror from contract
    expect(calculatedPayPerJuror).to.equal(payPerJuror);
    // Calculate the expected juror balances
    const expectedJurorMember1Balance = payPerJuror.mul(scoreOfJuror1);
    const expectedJurorMember2Balance = payPerJuror.mul(scoreOfJuror2);
    const expectedJurorMember3Balance = payPerJuror.mul(scoreOfJuror3);
    // Expect that the account balances of jurors are equal to the expected balances
    await expect(jurorMember1BalanceAfter.sub(jurorMember1BalanceBefore)).to.equal(expectedJurorMember1Balance);
    await expect(jurorMember2BalanceAfter.sub(jurorMember2BalanceBefore)).to.equal(expectedJurorMember2Balance);
    await expect(jurorMember3BalanceAfter.sub(jurorMember3BalanceBefore)).to.equal(expectedJurorMember3Balance);
  });

  it("Should allow Banned-validator to withdraw funds from the treasury after a content purchase", async function () {
    if (TEST_VERSION == 1) {
      this.skip();
    }
    await reDeploy();
    // Create content
    await _createContent(
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
      500
    );
    // Make a content purchase to gather funds for governance
    await makeContentPurchase(contractPlatformTreasury, contentBuyer1, contractRoleManager, contractUDAO);

    // Check account balances of validators before withdrawal
    const validator1BalanceBefore = await contractUDAO.balanceOf(validator1.address);
    const validator2BalanceBefore = await contractUDAO.balanceOf(validator2.address);
    const validator3BalanceBefore = await contractUDAO.balanceOf(validator3.address);
    const validator4BalanceBefore = await contractUDAO.balanceOf(validator4.address);
    const validator5BalanceBefore = await contractUDAO.balanceOf(validator5.address);
    // expect balances to be equal to zero (They not anymore since commit: 617d510)
    //await expect(validator1BalanceBefore).to.equal(0);
    //...2-3-4...
    //await expect(validator5BalanceBefore).to.equal(0);

    // Get the ID of the current distribution round
    const currentDistributionRound = await contractSupervision.distributionRound();
    // Foundation should call distributeRewards to distribute rewards to validators
    await contractPlatformTreasury.connect(foundation).distributeRewards();

    // Ban the Validators
    await contractRoleManager.setBan(validator1.address, true);
    await contractRoleManager.setBan(validator2.address, true);
    await contractRoleManager.setBan(validator3.address, true);
    await contractRoleManager.setBan(validator4.address, true);
    await contractRoleManager.setBan(validator5.address, true);

    // Call withdrawValidator from platformtreasury contract for each validator
    await contractPlatformTreasury.connect(validator1).withdrawValidator();
    await contractPlatformTreasury.connect(validator2).withdrawValidator();
    await contractPlatformTreasury.connect(validator3).withdrawValidator();
    await contractPlatformTreasury.connect(validator4).withdrawValidator();
    await contractPlatformTreasury.connect(validator5).withdrawValidator();

    // Check account balances of validators after withdrawal
    const validator1BalanceAfter = await contractUDAO.balanceOf(validator1.address);
    const validator2BalanceAfter = await contractUDAO.balanceOf(validator2.address);
    const validator3BalanceAfter = await contractUDAO.balanceOf(validator3.address);
    const validator4BalanceAfter = await contractUDAO.balanceOf(validator4.address);
    const validator5BalanceAfter = await contractUDAO.balanceOf(validator5.address);

    /// @dev Calculate how much each validator should receive
    // Get the current validator cut
    const currentValidatorCut = await contractPlatformTreasury.contentValidatorCut();
    // Get the content price of token Id 0 from UDAOC (first 0 is token ID, second 0 is full price of content)
    const contentPrice = await contractUDAOContent.contentPrice(0, 0);
    // Get the total validation score
    const totalValidationScore = await contractSupervision.totalValidationScore();
    // Get the validator scores of validators
    const validator1Score = await contractSupervision.getValidatorScore(validator1.address, currentDistributionRound);
    const validator2Score = await contractSupervision.getValidatorScore(validator2.address, currentDistributionRound);
    const validator3Score = await contractSupervision.getValidatorScore(validator3.address, currentDistributionRound);
    const validator4Score = await contractSupervision.getValidatorScore(validator4.address, currentDistributionRound);
    const validator5Score = await contractSupervision.getValidatorScore(validator5.address, currentDistributionRound);
    // Calculate the expected validators cut
    const expectedValidator1Cut = contentPrice
      .mul(currentValidatorCut)
      .mul(validator1Score)
      .div(totalValidationScore)
      .div(100000);
    const expectedValidator2Cut = contentPrice
      .mul(currentValidatorCut)
      .mul(validator2Score)
      .div(totalValidationScore)
      .div(100000);
    const expectedValidator3Cut = contentPrice
      .mul(currentValidatorCut)
      .mul(validator3Score)
      .div(totalValidationScore)
      .div(100000);
    const expectedValidator4Cut = contentPrice
      .mul(currentValidatorCut)
      .mul(validator4Score)
      .div(totalValidationScore)
      .div(100000);
    const expectedValidator5Cut = contentPrice
      .mul(currentValidatorCut)
      .mul(validator5Score)
      .div(totalValidationScore)
      .div(100000);

    /// @dev Check if the validator balances are equal to the expected validator balances
    await expect(validator1BalanceAfter.sub(validator1BalanceBefore)).to.equal(expectedValidator1Cut);
    await expect(validator2BalanceAfter.sub(validator2BalanceBefore)).to.equal(expectedValidator2Cut);
    await expect(validator3BalanceAfter.sub(validator3BalanceBefore)).to.equal(expectedValidator3Cut);
    await expect(validator4BalanceAfter.sub(validator4BalanceBefore)).to.equal(expectedValidator4Cut);
    await expect(validator5BalanceAfter.sub(validator5BalanceBefore)).to.equal(expectedValidator5Cut);
  });

  it("Should allow Banned-validator to withdraw funds from the treasury after multiple content purchases", async function () {
    if (TEST_VERSION == 1) {
      this.skip();
    }
    await reDeploy();
    // Create content
    await _createContent(
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
      500
    );
    // Make a content purchase to gather funds for governance
    await makeContentPurchase(contractPlatformTreasury, contentBuyer1, contractRoleManager, contractUDAO);
    await makeContentPurchase(contractPlatformTreasury, contentBuyer2, contractRoleManager, contractUDAO);
    await makeContentPurchase(contractPlatformTreasury, contentBuyer3, contractRoleManager, contractUDAO);

    // Check account balances of validators before withdrawal
    const validator1BalanceBefore = await contractUDAO.balanceOf(validator1.address);
    const validator2BalanceBefore = await contractUDAO.balanceOf(validator2.address);
    const validator3BalanceBefore = await contractUDAO.balanceOf(validator3.address);
    const validator4BalanceBefore = await contractUDAO.balanceOf(validator4.address);
    const validator5BalanceBefore = await contractUDAO.balanceOf(validator5.address);
    // expect balances to be equal to zero (They not anymore since commit: 617d510)
    //await expect(validator1BalanceBefore).to.equal(0);
    //...2-3-4...
    //await expect(validator5BalanceBefore).to.equal(0);

    // Get the ID of the current distribution round
    const currentDistributionRound = await contractSupervision.distributionRound();
    // Foundation should call distributeRewards to distribute rewards to validators
    await contractPlatformTreasury.connect(foundation).distributeRewards();

    // Ban the Validators
    await contractRoleManager.setBan(validator1.address, true);
    await contractRoleManager.setBan(validator2.address, true);
    await contractRoleManager.setBan(validator3.address, true);
    await contractRoleManager.setBan(validator4.address, true);
    await contractRoleManager.setBan(validator5.address, true);

    // Call withdrawValidator from platformtreasury contract for each validator
    await contractPlatformTreasury.connect(validator1).withdrawValidator();
    await contractPlatformTreasury.connect(validator2).withdrawValidator();
    await contractPlatformTreasury.connect(validator3).withdrawValidator();
    await contractPlatformTreasury.connect(validator4).withdrawValidator();
    await contractPlatformTreasury.connect(validator5).withdrawValidator();

    // Check account balances of validators after withdrawal
    const validator1BalanceAfter = await contractUDAO.balanceOf(validator1.address);
    const validator2BalanceAfter = await contractUDAO.balanceOf(validator2.address);
    const validator3BalanceAfter = await contractUDAO.balanceOf(validator3.address);
    const validator4BalanceAfter = await contractUDAO.balanceOf(validator4.address);
    const validator5BalanceAfter = await contractUDAO.balanceOf(validator5.address);

    /// @dev Calculate how much each validator should receive
    // Get the current validator cut
    const currentValidatorCut = await contractPlatformTreasury.contentValidatorCut();
    // Get the content price of token Id 0 from UDAOC (first 0 is token ID, second 0 is full price of content)
    const contentPrice = await contractUDAOContent.contentPrice(0, 0);
    // Multiply content price with 3 since there are 3 content purchases
    const totalContentPrice = contentPrice.mul(3);
    // Get the total validation score
    const totalValidationScore = await contractSupervision.totalValidationScore();
    // Get the validator scores of validators
    const validator1Score = await contractSupervision.getValidatorScore(validator1.address, currentDistributionRound);
    const validator2Score = await contractSupervision.getValidatorScore(validator2.address, currentDistributionRound);
    const validator3Score = await contractSupervision.getValidatorScore(validator3.address, currentDistributionRound);
    const validator4Score = await contractSupervision.getValidatorScore(validator4.address, currentDistributionRound);
    const validator5Score = await contractSupervision.getValidatorScore(validator5.address, currentDistributionRound);
    // Calculate the expected validators cut
    const expectedValidator1Cut = totalContentPrice
      .mul(currentValidatorCut)
      .mul(validator1Score)
      .div(totalValidationScore)
      .div(100000);
    const expectedValidator2Cut = totalContentPrice
      .mul(currentValidatorCut)
      .mul(validator2Score)
      .div(totalValidationScore)
      .div(100000);
    const expectedValidator3Cut = totalContentPrice
      .mul(currentValidatorCut)
      .mul(validator3Score)
      .div(totalValidationScore)
      .div(100000);
    const expectedValidator4Cut = totalContentPrice
      .mul(currentValidatorCut)
      .mul(validator4Score)
      .div(totalValidationScore)
      .div(100000);
    const expectedValidator5Cut = totalContentPrice
      .mul(currentValidatorCut)
      .mul(validator5Score)
      .div(totalValidationScore)
      .div(100000);

    /// @dev Check if the validator balances are equal to the expected validator balances
    await expect(validator1BalanceAfter.sub(validator1BalanceBefore)).to.equal(expectedValidator1Cut);
    await expect(validator2BalanceAfter.sub(validator2BalanceBefore)).to.equal(expectedValidator2Cut);
    await expect(validator3BalanceAfter.sub(validator3BalanceBefore)).to.equal(expectedValidator3Cut);
    await expect(validator4BalanceAfter.sub(validator4BalanceBefore)).to.equal(expectedValidator4Cut);
    await expect(validator5BalanceAfter.sub(validator5BalanceBefore)).to.equal(expectedValidator5Cut);
  });

  it("Should allow governance to withdraw funds from the treasury after a content purchase while governance member banned", async function () {
    if (TEST_VERSION == 1) {
      this.skip();
    }
    await reDeploy();
    /// @dev Setup governance member
    await setupGovernanceMember(contractRoleManager, contractUDAO, contractUDAOStaker, governanceCandidate);
    await setupGovernanceMember(contractRoleManager, contractUDAO, contractUDAOStaker, superValidator);
    await setupGovernanceMember(contractRoleManager, contractUDAO, contractUDAOStaker, superValidatorCandidate);
    await setupGovernanceMember(contractRoleManager, contractUDAO, contractUDAOStaker, validatorCandidate);
    await setupGovernanceMember(contractRoleManager, contractUDAO, contractUDAOStaker, jurorCandidate);

    /// @dev Check account UDAO-vp balance and delegate to themselves
    await checkAccountUDAOVpBalanceAndDelegate(contractUDAOVp, governanceCandidate);
    await checkAccountUDAOVpBalanceAndDelegate(contractUDAOVp, superValidator);
    await checkAccountUDAOVpBalanceAndDelegate(contractUDAOVp, validatorCandidate);
    await checkAccountUDAOVpBalanceAndDelegate(contractUDAOVp, jurorCandidate);
    // Create content
    await _createContent(
      contractRoleManager,
      contractUDAOContent,
      contractSupervision,
      backend,
      validator1,
      validator2,
      validator3,
      validator4,
      validator5,
      contentCreator
    );
    // Make a content purchase to gather funds for governance
    await makeContentPurchase(contractPlatformTreasury, contentBuyer1, contractRoleManager, contractUDAO);

    // new dummy governance treasury address
    const newGovernanceTreasury = contractUDAOTimelockController;

    // set new governance treasury address
    await expect(
      contractPlatformTreasury.connect(backend).setGovernanceTreasuryAddress(contractUDAOTimelockController.address)
    )
      .to.emit(contractPlatformTreasury, "GovernanceTreasuryUpdated")
      .withArgs(newGovernanceTreasury.address);

    /// @dev Check if the governance candidate has the correct amount of UDAO-vp tokens
    const governanceCandidateBalance = await contractUDAOVp.balanceOf(governanceCandidate.address);
    await expect(governanceCandidateBalance).to.equal(ethers.utils.parseEther("300"));

    /// @dev delegate governance candidate's UDAO-vp tokens to himself
    await contractUDAOVp.connect(governanceCandidate).delegate(governanceCandidate.address);

    /// @dev Check votes for governance candidate on latest block
    const governanceCandidateVotes = await contractUDAOVp.getVotes(governanceCandidate.address);
    await expect(governanceCandidateVotes).to.equal(ethers.utils.parseEther("300"));

    // Create proposal settings to withdraw funds from the treasury
    const targetContractAddress = contractPlatformTreasury.address;
    const targetContract = await ethers.getContractAt("PlatformTreasury", contractPlatformTreasury.address);

    //Ban the governance member
    await contractRoleManager.setBan(governanceCandidate.address, true);

    const proposalValues = 0;
    const proposalCalldata = targetContract.interface.encodeFunctionData("withdrawGovernance");
    const proposalDescription = "Withdraw funds from the treasury";

    // propose
    const proposeTx = await contractUDAOGovernor
      .connect(governanceCandidate)
      .propose([targetContractAddress], [proposalValues], [proposalCalldata], proposalDescription);

    /// @dev Wait for the transaction to be mined
    const tx = await proposeTx.wait();
    const proposalId = tx.events.find((e) => e.event == "ProposalCreated").args.proposalId;

    /// @dev Check if the proposal was created propoerly
    const proposerAddress = tx.events.find((e) => e.event == "ProposalCreated").args.proposer;
    const targetInfo = tx.events.find((e) => e.event == "ProposalCreated").args.targets;
    const returnedCallData = tx.events.find((e) => e.event == "ProposalCreated").args.calldatas;
    await expect(proposerAddress).to.equal(governanceCandidate.address);
    await expect(targetInfo).to.deep.equal([targetContractAddress]);
    await expect(returnedCallData).to.deep.equal([proposalCalldata]);

    /// @dev get to the start of the voting period
    const numBlocksToMine = Math.ceil((7 * 24 * 60 * 60) / 2);
    await hre.network.provider.send("hardhat_mine", [`0x${numBlocksToMine.toString(16)}`, "0x2"]);

    /// @dev Vote on the proposal
    await contractUDAOGovernor.connect(superValidator).castVote(proposalId, 1);
    await contractUDAOGovernor.connect(superValidatorCandidate).castVote(proposalId, 1);
    await contractUDAOGovernor.connect(jurorCandidate).castVote(proposalId, 1);
    await contractUDAOGovernor.connect(validatorCandidate).castVote(proposalId, 1);

    /// @dev Check if the vote was casted
    const proposalState = await contractUDAOGovernor.state(proposalId);
    await expect(proposalState).to.equal(1);

    /// @dev Skip to the end of the voting period
    const numBlocksToMineToEnd = Math.ceil((7 * 24 * 60 * 60) / 2);
    await hre.network.provider.send("hardhat_mine", [`0x${numBlocksToMineToEnd.toString(16)}`, "0x2"]);
    /// @dev Check if the proposal was successful
    const proposalStateAtStart = await contractUDAOGovernor.state(proposalId);
    await expect(proposalStateAtStart).to.equal(4);
    /// @dev Queue the proposal and Check the ProposalQueued event
    const queueTx = await contractUDAOGovernor
      .connect(governanceCandidate)
      .queue([targetContractAddress], [proposalValues], [proposalCalldata], ethers.utils.id(proposalDescription));
    const queueTxReceipt = await queueTx.wait();
    const queueTxEvent = queueTxReceipt.events.find((e) => e.event == "ProposalQueued");
    await expect(queueTxEvent.args.proposalId).to.equal(proposalId);
    //await expect(queueTxEvent.args.eta).to.equal(0);
    /// @dev Check if the proposal was queued
    const proposalStateAfterQueue = await contractUDAOGovernor.state(proposalId);
    await expect(proposalStateAfterQueue).to.equal(5);
    /// @dev Execute the proposal
    const executeTx = await contractUDAOGovernor
      .connect(governanceCandidate)
      .execute([targetContractAddress], [proposalValues], [proposalCalldata], ethers.utils.id(proposalDescription));
    const executeTxReceipt = await executeTx.wait();
    const executeTxEvent = executeTxReceipt.events.find((e) => e.event == "ProposalExecuted");
    await expect(executeTxEvent.args.proposalId).to.equal(proposalId);

    /// @dev Check if the proposal was executed
    const proposalStateAfterExecution = await contractUDAOGovernor.state(proposalId);
    await expect(proposalStateAfterExecution).to.equal(7);

    /// @dev Get the current percent cut of the governance treasury
    const currentGovernanceTreasuryCut = await contractPlatformTreasury.contentGoverCut();

    /// Get the current governance treasury balance
    const currentGovernanceTreasuryBalance = await contractUDAO.balanceOf(newGovernanceTreasury.address);
    /// Get the content price of token Id 0 from UDAOC (first 0 is token ID, second 0 is full price of content)
    const contentPrice = await contractUDAOContent.contentPrice(0, 0);
    /// Multiply the content price with the current governance treasury cut and divide by 100000 to get the expected governance treasury balance
    const expectedGovernanceTreasuryBalanceBeforePercentage = contentPrice.mul(currentGovernanceTreasuryCut);
    const expectedGovernanceTreasuryBalance = expectedGovernanceTreasuryBalanceBeforePercentage.div(100000);

    /// Check if the governance treasury balance is equal to the expected governance treasury balance
    await expect(currentGovernanceTreasuryBalance).to.equal(expectedGovernanceTreasuryBalance);
  });

  it("Should allow governance to withdraw funds from the treasury after multiple content purchases while governance member banned", async function () {
    if (TEST_VERSION == 1) {
      this.skip();
    }
    await reDeploy();
    /// @dev Setup governance member
    await setupGovernanceMember(contractRoleManager, contractUDAO, contractUDAOStaker, governanceCandidate);
    await setupGovernanceMember(contractRoleManager, contractUDAO, contractUDAOStaker, superValidator);
    await setupGovernanceMember(contractRoleManager, contractUDAO, contractUDAOStaker, superValidatorCandidate);
    await setupGovernanceMember(contractRoleManager, contractUDAO, contractUDAOStaker, validatorCandidate);
    await setupGovernanceMember(contractRoleManager, contractUDAO, contractUDAOStaker, jurorCandidate);

    /// @dev Check account UDAO-vp balance and delegate to themselves
    await checkAccountUDAOVpBalanceAndDelegate(contractUDAOVp, governanceCandidate);
    await checkAccountUDAOVpBalanceAndDelegate(contractUDAOVp, superValidator);
    await checkAccountUDAOVpBalanceAndDelegate(contractUDAOVp, validatorCandidate);
    await checkAccountUDAOVpBalanceAndDelegate(contractUDAOVp, jurorCandidate);

    // Create content
    await _createContent(
      contractRoleManager,
      contractUDAOContent,
      contractSupervision,
      backend,
      validator1,
      validator2,
      validator3,
      validator4,
      validator5,
      contentCreator
    );
    // Make a content purchase to gather funds for governance
    await makeContentPurchase(contractPlatformTreasury, contentBuyer1, contractRoleManager, contractUDAO);
    await makeContentPurchase(contractPlatformTreasury, contentBuyer2, contractRoleManager, contractUDAO);
    await makeContentPurchase(contractPlatformTreasury, contentBuyer3, contractRoleManager, contractUDAO);

    // new dummy governance treasury address
    const newGovernanceTreasury = contractUDAOTimelockController;

    // set new governance treasury address
    await expect(
      contractPlatformTreasury.connect(backend).setGovernanceTreasuryAddress(contractUDAOTimelockController.address)
    )
      .to.emit(contractPlatformTreasury, "GovernanceTreasuryUpdated")
      .withArgs(newGovernanceTreasury.address);

    /// @dev Check if the governance candidate has the correct amount of UDAO-vp tokens
    const governanceCandidateBalance = await contractUDAOVp.balanceOf(governanceCandidate.address);
    await expect(governanceCandidateBalance).to.equal(ethers.utils.parseEther("300"));

    /// @dev delegate governance candidate's UDAO-vp tokens to himself
    await contractUDAOVp.connect(governanceCandidate).delegate(governanceCandidate.address);

    /// @dev Check votes for governance candidate on latest block
    const governanceCandidateVotes = await contractUDAOVp.getVotes(governanceCandidate.address);
    await expect(governanceCandidateVotes).to.equal(ethers.utils.parseEther("300"));

    // Create proposal settings to withdraw funds from the treasury
    const targetContractAddress = contractPlatformTreasury.address;
    const targetContract = await ethers.getContractAt("PlatformTreasury", contractPlatformTreasury.address);

    //Ban the governance member
    await contractRoleManager.setBan(governanceCandidate.address, true);

    const proposalValues = 0;
    const proposalCalldata = targetContract.interface.encodeFunctionData("withdrawGovernance");
    const proposalDescription = "Withdraw funds from the treasury";

    // propose
    const proposeTx = await contractUDAOGovernor
      .connect(governanceCandidate)
      .propose([targetContractAddress], [proposalValues], [proposalCalldata], proposalDescription);

    /// @dev Wait for the transaction to be mined
    const tx = await proposeTx.wait();
    const proposalId = tx.events.find((e) => e.event == "ProposalCreated").args.proposalId;

    /// @dev Check if the proposal was created propoerly
    const proposerAddress = tx.events.find((e) => e.event == "ProposalCreated").args.proposer;
    const targetInfo = tx.events.find((e) => e.event == "ProposalCreated").args.targets;
    const returnedCallData = tx.events.find((e) => e.event == "ProposalCreated").args.calldatas;
    await expect(proposerAddress).to.equal(governanceCandidate.address);
    await expect(targetInfo).to.deep.equal([targetContractAddress]);
    await expect(returnedCallData).to.deep.equal([proposalCalldata]);

    /// @dev get to the start of the voting period
    const numBlocksToMine = Math.ceil((7 * 24 * 60 * 60) / 2);
    await hre.network.provider.send("hardhat_mine", [`0x${numBlocksToMine.toString(16)}`, "0x2"]);

    /// @dev Vote on the proposal
    await contractUDAOGovernor.connect(superValidator).castVote(proposalId, 1);
    await contractUDAOGovernor.connect(superValidatorCandidate).castVote(proposalId, 1);
    await contractUDAOGovernor.connect(jurorCandidate).castVote(proposalId, 1);
    await contractUDAOGovernor.connect(validatorCandidate).castVote(proposalId, 1);

    /// @dev Check if the vote was casted
    const proposalState = await contractUDAOGovernor.state(proposalId);
    await expect(proposalState).to.equal(1);

    /// @dev Skip to the end of the voting period
    const numBlocksToMineToEnd = Math.ceil((7 * 24 * 60 * 60) / 2);
    await hre.network.provider.send("hardhat_mine", [`0x${numBlocksToMineToEnd.toString(16)}`, "0x2"]);
    /// @dev Check if the proposal was successful
    const proposalStateAtStart = await contractUDAOGovernor.state(proposalId);
    await expect(proposalStateAtStart).to.equal(4);
    /// @dev Queue the proposal and Check the ProposalQueued event
    const queueTx = await contractUDAOGovernor
      .connect(governanceCandidate)
      .queue([targetContractAddress], [proposalValues], [proposalCalldata], ethers.utils.id(proposalDescription));
    const queueTxReceipt = await queueTx.wait();
    const queueTxEvent = queueTxReceipt.events.find((e) => e.event == "ProposalQueued");
    await expect(queueTxEvent.args.proposalId).to.equal(proposalId);
    //await expect(queueTxEvent.args.eta).to.equal(0);
    /// @dev Check if the proposal was queued
    const proposalStateAfterQueue = await contractUDAOGovernor.state(proposalId);
    await expect(proposalStateAfterQueue).to.equal(5);
    /// @dev Execute the proposal
    const executeTx = await contractUDAOGovernor
      .connect(governanceCandidate)
      .execute([targetContractAddress], [proposalValues], [proposalCalldata], ethers.utils.id(proposalDescription));
    const executeTxReceipt = await executeTx.wait();
    const executeTxEvent = executeTxReceipt.events.find((e) => e.event == "ProposalExecuted");
    await expect(executeTxEvent.args.proposalId).to.equal(proposalId);

    /// @dev Check if the proposal was executed
    const proposalStateAfterExecution = await contractUDAOGovernor.state(proposalId);
    await expect(proposalStateAfterExecution).to.equal(7);

    /// @dev Get the current percent cut of the governance treasury
    const currentGovernanceTreasuryCut = await contractPlatformTreasury.contentGoverCut();

    /// Get the current governance treasury balance
    const currentGovernanceTreasuryBalance = await contractUDAO.balanceOf(newGovernanceTreasury.address);
    /// Get the content price of token Id 0 from UDAOC (first 0 is token ID, second 0 is full price of content)
    const contentPrice = await contractUDAOContent.contentPrice(0, 0);
    /// Multiply contentPrice with 3 since we have 3 content buyers
    const contentPriceWithThreeBuyers = contentPrice.mul(3);
    /// Multiply the content price with the current governance treasury cut and divide by 100000 to get the expected governance treasury balance
    const expectedGovernanceTreasuryBalanceBeforePercentage =
      contentPriceWithThreeBuyers.mul(currentGovernanceTreasuryCut);
    const expectedGovernanceTreasuryBalance = expectedGovernanceTreasuryBalanceBeforePercentage.div(100000);

    /// Check if the governance treasury balance is equal to the expected governance treasury balance
    await expect(currentGovernanceTreasuryBalance).to.equal(expectedGovernanceTreasuryBalance);
  });

  it("Should allow Banned-instructers to withdraw their rewards", async function () {
    if (TEST_VERSION == 1) {
      this.skip();
    }
    await reDeploy();
    // Create content
    await _createContent(
      contractRoleManager,
      contractUDAOContent,
      contractSupervision,
      backend,
      validator1,
      validator2,
      validator3,
      validator4,
      validator5,
      contentCreator
    );
    // Make a content purchase
    await makeContentPurchase(contractPlatformTreasury, contentBuyer1, contractRoleManager, contractUDAO);

    // Get the instructer balance before withdrawal
    const instructerBalanceBefore = await contractUDAO.balanceOf(contentCreator.address);
    // Expect that the instructer balance is 0 before withdrawal
    await expect(instructerBalanceBefore).to.equal(0);

    // Ban the Instructor
    await contractRoleManager.setBan(contentCreator.address, true);
    /// @dev Skip 14 days to allow foundation to withdraw funds
    const numBlocksToMine = Math.ceil((14 * 24 * 60 * 60) / 2);
    await hre.network.provider.send("hardhat_mine", [`0x${numBlocksToMine.toString(16)}`, "0x2"]);
    // Instructer should call withdrawInstructor from platformtreasury contract
    await contractPlatformTreasury.connect(contentCreator).withdrawInstructor();
    // Get the instructer balance after withdrawal
    const instructerBalanceAfter = await contractUDAO.balanceOf(contentCreator.address);
    // Expect that the instructer balance is not 0 after withdrawal
    await expect(instructerBalanceAfter).to.not.equal(0);

    /// @dev Calculate how much the instructer should receive
    const contentPrice = await contractUDAOContent.contentPrice(0, 0);
    // Calculate the foundation cut
    const currentFoundationCut = await contractPlatformTreasury.contentFoundCut();
    const expectedFoundationBalanceBeforePercentage = contentPrice.mul(currentFoundationCut);
    const expectedFoundationBalance = expectedFoundationBalanceBeforePercentage.div(100000);
    // Calculate the governance cut
    const currentGovernanceTreasuryCut = await contractPlatformTreasury.contentGoverCut();
    const expectedGovernanceTreasuryBalanceBeforePercentage = contentPrice.mul(currentGovernanceTreasuryCut);
    const expectedGovernanceTreasuryBalance = expectedGovernanceTreasuryBalanceBeforePercentage.div(100000);
    // Calculate the validator cut
    const validatorBalanceForRound = await contractPlatformTreasury.validatorBalanceForRound();
    // Calculate the juror cut
    const jurorBalanceForRound = await contractPlatformTreasury.jurorBalanceForRound();
    // Expect instructerBalance to be equal to priceToPay minus the sum of all cuts
    await expect(instructerBalanceAfter).to.equal(
      contentPrice
        .sub(expectedFoundationBalance)
        .sub(expectedGovernanceTreasuryBalance)
        .sub(validatorBalanceForRound)
        .sub(jurorBalanceForRound)
    );
  });
});
