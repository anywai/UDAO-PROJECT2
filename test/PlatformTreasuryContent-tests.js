const { expect } = require("chai");
const hardhat = require("hardhat");
const { ethers } = hardhat;
const chai = require("chai");
const BN = require("bn.js");
const { DiscountedPurchase } = require("../lib/DiscountedPurchase");
const { RefundVoucher } = require("../lib/RefundVoucher");
const { Redeem } = require("../lib/Redeem");
const helpers = require("@nomicfoundation/hardhat-network-helpers");
const { deploy } = require("../lib/deployments");
const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");

// Enable and inject BN dependency
chai.use(require("chai-bn")(BN));
/// HELPERS---------------------------------------------------------------------
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
  const futureBlockBigNumber = BigInt(futureBlock);

  const redeemer = contentCreator;

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
async function readEvent(tx, eventName, contract) {
  /// Wait for the transaction to be mined and get the receipt
  const txReceipt = await tx.wait();
  /// Access ABI from contract instance
  const contractABI = contract.interface.fragments;
  /// create ether.js interface using the contract ABI
  const interfaceOfContract = new ethers.Interface(contractABI);
  /// Get the logs from the transaction receipt
  const logs = txReceipt.logs;

  /// Find the log entry that matches the event name
  const matchingLog = logs.find((logEntry) => {
    try {
      const parsedLog = interfaceOfContract.parseLog(logEntry);
      return parsedLog.name === eventName;
    } catch (error) {
      // Handle or ignore the error if the log doesn't match any event in the interface
      return false;
    }
  });

  if (matchingLog) {
    const parsedLog = interfaceOfContract.parseLog(matchingLog);
    return parsedLog.args;
  } else {
    console.error(`${eventName} event not found in transaction receipt.`);
  }
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
  await contractUDAO.transfer(contentBuyer.address, ethers.parseEther("100.0"));
  const balanceBeforePurchase = await contractUDAO.balanceOf(contentBuyer.address);
  /// Content buyer needs to give approval to the platformtreasury
  await contractUDAO.connect(contentBuyer).approve(contractPlatformTreasury, ethers.parseEther("999999999999.0"));

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
        { name: "userId", type: "string" },
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
  /// get decoded event from the transaction
  const decodedEvent = await readEvent(purchaseTx, "ContentBought", contractPlatformTreasury);
  /// Decoded results for ContentBought event
  const userId = decodedEvent[0];
  const contentSaleID = decodedEvent[2];
  // expect to get the same userId
  expect(userIds[0]).to.equal(userId);
  // Get content struct
  const contentStruct = await contractPlatformTreasury.contentSales(contentSaleID);
  // Check if returned learner address is the same as the buyer address
  for (let i = 0; i < tokenIds.length; i++) {
    if (giftReceiver[i] == ethers.ZeroAddress) {
      expect(contentStruct.contentReceiver).to.equal(contentBuyer.address);
    } else {
      expect(contentStruct.contentReceiver).to.equal(giftReceiver[i]);
    }
  }
  const balanceOfContentBuyer = await contractUDAO.balanceOf(contentBuyer.address);
  return [balanceBeforePurchase, balanceOfContentBuyer];
}
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
  contractGovernanceTreasury = replace.contractGovernanceTreasury;
}

async function skipDays(_days) {
  // There is 86400 second in a day (24h*60m*60s=86400s), and also in polygon 1 block is mined every 2 seconds
  const numBlocksToMine = Math.ceil((_days * 24 * 60 * 60) / 2);
  await hre.network.provider.send("hardhat_mine", [`0x${numBlocksToMine.toString(16)}`, "0x2"]);
}

describe("Platform Treasury Contract - Content", function () {
  it("Should fail to set validation manager if not FOUNDATION", async function () {
    await reDeploy();

    await expect(contractPlatformTreasury.connect(contentBuyer).setFoundationAddress(contractUDAO)).to.revertedWith(
      "Only foundation can set foundation wallet address"
    );
  });
  //!!Bu dünkü test
  it("Should a user able to buy the full content", async function () {
    await reDeploy();
    /// Set KYC
    await contractRoleManager.setKYC(contentCreator.address, true);
    await contractRoleManager.setKYC(contentBuyer.address, true);
    // Create content
    const contentParts = [0, 1];
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
    const tx = await contractUDAOContent.connect(contentCreator).createContent(createContentVoucherSample);
    /// get decoded event from the transaction
    const decodedEvent = await readEvent(tx, "NewContentCreated", contractUDAOContent);
    /// Decoded results for NewContentCreated event
    const tokenId = Number(decodedEvent[0]);
    // You need to use all parts of the content to buy it. Get all parts of the content
    const parts = await contractUDAOContent.getContentParts(tokenId);
    // convert bigNumber parts to number
    const partsNumber = parts.map((part) => Number(part));
    // convert map to array
    const partsNumberArray = Array.from(partsNumber);
    // Make a content purchase
    const tokenIds = [1];
    const purchasedParts = [partsNumberArray];
    const redeemers = [contentBuyer1.address];
    const giftReceiver = [ethers.ZeroAddress];
    const userIds = ["c8d53630-233a-4f95-90cb-4df253ae9283"];

    const fullContentPurchase = [true];
    const pricesToPay = [ethers.parseEther("1")];
    const validUntil = Date.now() + 999999999;
    const balances = await makeContentPurchase(
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
    const balanceBefore = balances[0];
    const balanceAfter = balances[1];

    /// @notice user address => content token Id => is full content purchase
    //mapping(address => mapping(uint256 => bool)) public ;

    /// Check if the buyer has the content part
    const result = await contractPlatformTreasury.connect(contentBuyer1).getOwnedParts(contentBuyer1.address, tokenId);
    expect(result[0]).to.equal(purchasedParts[0][0]);
    const isFullyPurchased = await contractPlatformTreasury.isFullyPurchased(contentBuyer1.address, tokenId);

    expect(isFullyPurchased).to.equal(true);
    /// Get tokenId 0 price with calculatePriceToPay function
    const priceToPay = pricesToPay[0];
    /// Check if the buyer paid the correct amount
    expect(balanceBefore - balanceAfter).to.equal(priceToPay);
  });

  it("Should backend can buy a content behalf of content buyer if it is a fiat purchase", async function () {
    await reDeploy();
    /// Set KYC
    await contractRoleManager.setKYC(contentCreator.address, true);
    await contractRoleManager.setKYC(contentBuyer1.address, true);
    // Create content
    const contentParts = [0, 1];
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
    const tx = await contractUDAOContent.connect(contentCreator).createContent(createContentVoucherSample);
    /// get decoded event from the transaction
    const decodedEvent = await readEvent(tx, "NewContentCreated", contractUDAOContent);
    /// Decoded results for NewContentCreated event
    const tokenId = Number(decodedEvent[0]);
    // You need to use all parts of the content to buy it. Get all parts of the content
    const parts = await contractUDAOContent.getContentParts(tokenId);
    // convert bigNumber parts to number
    const partsNumber = parts.map((part) => Number(part));
    // convert map to array
    const partsNumberArray = Array.from(partsNumber);
    // Make a content purchase
    const tokenIds = [1];
    const purchasedParts = [partsNumberArray];
    const redeemers = [backend.address];
    const giftReceiver = [contentBuyer1.address];
    const fullContentPurchase = [true];
    const pricesToPay = [ethers.parseEther("1")];
    const validUntil = Date.now() + 999999999;
    const userIds = ["c8d53630-233a-4f95-90cb-4df253ae9283"];

    /// Set KYC
    await contractRoleManager.setKYC(contentBuyer.address, true);
    /// Send UDAO to the buyer's wallet
    await contractUDAO.transfer(contentBuyer.address, ethers.parseEther("100.0"));
    const balanceBefore = await contractUDAO.balanceOf(backend.address);
    /// Content buyer needs to give approval to the platformtreasury
    await contractUDAO.connect(backend).approve(contractPlatformTreasury, ethers.parseEther("999999999999.0"));

    /// Create content purchase vouchers
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
    const purchaseTx = await contractPlatformTreasury.connect(backend).buyContent(contentPurchaseVouchers);
    /// get decoded event from the transaction
    const decodedEventContentBought = await readEvent(purchaseTx, "ContentBought", contractPlatformTreasury);
    /// Decoded results for ContentBought event
    const contentSaleID = decodedEventContentBought[2];
    // Get content struct
    const contentStruct = await contractPlatformTreasury.contentSales(contentSaleID);
    const balanceAfter = await contractUDAO.balanceOf(backend.address);

    /// Check if the buyer has the content part
    const result = await contractPlatformTreasury.connect(contentBuyer1).getOwnedParts(contentBuyer1.address, tokenId);
    expect(result[0]).to.equal(purchasedParts[0][0]);
    const isFullyPurchased = await contractPlatformTreasury.isFullyPurchased(contentBuyer1.address, tokenId);

    expect(isFullyPurchased).to.equal(true);

    /// Get tokenId 0 price with calculatePriceToPay function
    const priceToPay = pricesToPay[0];
    /// Check if the buyer paid the correct amount
    const changeOnBalance = balanceBefore - balanceAfter;
    // Get total price
    const totalCutRatio = await contractPlatformTreasury.contentTotalCut();
    const totalCut = (priceToPay * totalCutRatio) / BigInt(100000);

    // Check if correct amount of UDAO was deducted from the buyer's wallet
    expect(changeOnBalance).to.equal(totalCut);
  });

  it("Should fail user buy a content if have not enough udao balance", async function () {
    await reDeploy();
    /// Set KYC
    await contractRoleManager.setKYC(contentCreator.address, true);
    await contractRoleManager.setKYC(contentBuyer1.address, true);
    // Create content
    const contentParts = [0, 1];
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
    const tx = await contractUDAOContent.connect(contentCreator).createContent(createContentVoucherSample);
    /// get decoded event from the transaction
    const decodedEvent = await readEvent(tx, "NewContentCreated", contractUDAOContent);
    /// Decoded results for NewContentCreated event
    const tokenId = Number(decodedEvent[0]);
    // You need to use all parts of the content to buy it. Get all parts of the content
    const parts = await contractUDAOContent.getContentParts(tokenId);
    // convert bigNumber parts to number
    const partsNumber = parts.map((part) => Number(part));
    // convert map to array
    const partsNumberArray = Array.from(partsNumber);
    // Make a content purchase
    const tokenIds = [1];
    const purchasedParts = [partsNumberArray];
    const redeemers = [contentBuyer1.address];
    const giftReceiver = [contentBuyer1.address];
    const fullContentPurchase = [true];
    const pricesToPay = [ethers.parseEther("1")];
    const validUntil = Date.now() + 999999999;
    const userIds = ["c8d53630-233a-4f95-90cb-4df253ae9283"];

    /// Set KYC
    await contractRoleManager.setKYC(contentBuyer.address, true);
    /// Send UDAO to the buyer's wallet
    //await contractUDAO.transfer(contentBuyer1.address, ethers.parseEther("100.0"));
    /// Content buyer needs to give approval to the platformtreasury
    await contractUDAO.connect(contentBuyer1).approve(contractPlatformTreasury, ethers.parseEther("999999999999.0"));

    /// Create content purchase vouchers
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
    const purchaseTx = contractPlatformTreasury.connect(contentBuyer1).buyContent(contentPurchaseVouchers);
    //not enough udao balance
    await expect(purchaseTx).to.be.revertedWith("Not enough UDAO sent!");
  });

  it("Should fail user buy a content if have not enough udao allowance", async function () {
    await reDeploy();
    /// Set KYC
    await contractRoleManager.setKYC(contentCreator.address, true);
    await contractRoleManager.setKYC(contentBuyer1.address, true);
    // Create content
    const contentParts = [0, 1];
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
    const tx = await contractUDAOContent.connect(contentCreator).createContent(createContentVoucherSample);
    /// get decoded event from the transaction
    const decodedEvent = await readEvent(tx, "NewContentCreated", contractUDAOContent);
    /// Decoded results for NewContentCreated event
    const tokenId = Number(decodedEvent[0]);
    // You need to use all parts of the content to buy it. Get all parts of the content
    const parts = await contractUDAOContent.getContentParts(tokenId);
    // convert bigNumber parts to number
    const partsNumber = parts.map((part) => Number(part));
    // convert map to array
    const partsNumberArray = Array.from(partsNumber);
    // Make a content purchase
    const tokenIds = [1];
    const purchasedParts = [partsNumberArray];
    const redeemers = [contentBuyer1.address];
    const giftReceiver = [contentBuyer1.address];
    const fullContentPurchase = [true];
    const pricesToPay = [ethers.parseEther("1")];
    const validUntil = Date.now() + 999999999;
    const userIds = ["c8d53630-233a-4f95-90cb-4df253ae9283"];

    /// Set KYC
    await contractRoleManager.setKYC(contentBuyer.address, true);
    /// Send UDAO to the buyer's wallet
    await contractUDAO.transfer(contentBuyer1.address, ethers.parseEther("100.0"));
    /// Content buyer needs to give approval to the platformtreasury
    //await contractUDAO
    //  .connect(contentBuyer1)
    //  .approve(contractPlatformTreasury, ethers.parseEther("999999999999.0"));

    /// Create content purchase vouchers
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
    const purchaseTx = contractPlatformTreasury.connect(contentBuyer1).buyContent(contentPurchaseVouchers);
    //not enough udao balance
    await expect(purchaseTx).to.be.revertedWith("Not enough allowance!");
  });

  it("Should fail backend buy a content to ownself if it is a fiat purchase", async function () {
    await reDeploy();
    /// Set KYC
    await contractRoleManager.setKYC(contentCreator.address, true);
    await contractRoleManager.setKYC(backend.address, true);
    // Create content
    const contentParts = [0, 1];
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
    const tx = await contractUDAOContent.connect(contentCreator).createContent(createContentVoucherSample);
    /// get decoded event from the transaction
    const decodedEvent = await readEvent(tx, "NewContentCreated", contractUDAOContent);
    /// Decoded results for NewContentCreated event
    const tokenId = Number(decodedEvent[0]);
    // You need to use all parts of the content to buy it. Get all parts of the content
    const parts = await contractUDAOContent.getContentParts(tokenId);
    // convert bigNumber parts to number
    const partsNumber = parts.map((part) => Number(part));
    // convert map to array
    const partsNumberArray = Array.from(partsNumber);
    // Make a content purchase
    const tokenIds = [1];
    const purchasedParts = [partsNumberArray];
    const redeemers = [backend.address];
    const giftReceiver = [backend.address];
    const fullContentPurchase = [true];
    const pricesToPay = [ethers.parseEther("1")];
    const validUntil = Date.now() + 999999999;
    const userIds = ["c8d53630-233a-4f95-90cb-4df253ae9283"];
    /// Set KYC
    await contractRoleManager.setKYC(contentBuyer.address, true);
    /// Send UDAO to the buyer's wallet
    await contractUDAO.transfer(contentBuyer.address, ethers.parseEther("100.0"));
    const balanceBefore = await contractUDAO.balanceOf(backend.address);
    /// Content buyer needs to give approval to the platformtreasury
    await contractUDAO.connect(backend).approve(contractPlatformTreasury, ethers.parseEther("999999999999.0"));

    /// Create content purchase vouchers
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
    const purchaseTx = contractPlatformTreasury.connect(backend).buyContent(contentPurchaseVouchers);
    expect(purchaseTx).to.be.revertedWith("Fiat purchase requires a gift receiver!");
  });

  it("Should a user able to buy parts of a content", async function () {
    await reDeploy();
    /// Set KYC
    await contractRoleManager.setKYC(contentCreator.address, true);
    await contractRoleManager.setKYC(contentBuyer.address, true);
    // Create content
    const contentParts = [0, 1, 2, 3, 4, 5];
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
    const tx = await contractUDAOContent.connect(contentCreator).createContent(createContentVoucherSample);
    /// get decoded event from the transaction
    const decodedEvent = await readEvent(tx, "NewContentCreated", contractUDAOContent);
    /// Decoded results for NewContentCreated event
    const tokenId = Number(decodedEvent[0]);
    // You need to use all parts of the content to buy it. Get all parts of the content
    const parts = await contractUDAOContent.getContentParts(tokenId);
    // convert bigNumber parts to number
    const partsNumber = parts.map((part) => Number(part));
    // convert map to array
    const partsNumberArray = Array.from(partsNumber);
    // Make a content purchase
    const tokenIds = [1];
    const purchasedParts = [[2, 3, 5]];
    const redeemers = [contentBuyer1.address];
    const giftReceiver = [ethers.ZeroAddress];
    const fullContentPurchase = [false];
    const pricesToPay = [ethers.parseEther("1")];
    const validUntil = Date.now() + 999999999;
    const userIds = ["c8d53630-233a-4f95-90cb-4df253ae9283"];

    const balances = await makeContentPurchase(
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
    const balanceBefore = balances[0];
    const balanceAfter = balances[1];

    /// Check if the buyer has the content part
    const result = await contractPlatformTreasury.connect(contentBuyer1).getOwnedParts(contentBuyer1.address, tokenId);
    expect(result[0]).to.equal(purchasedParts[0][0]);
    expect(result[1]).to.equal(purchasedParts[0][1]);
    expect(result[2]).to.equal(purchasedParts[0][2]);
    /// Check if the buyer paid the correct amount
    expect(balanceBefore - balanceAfter).to.equal(pricesToPay[0]);
  });
  //İkinci
  it("Should fail to buy a content part if content part already purchased", async function () {
    await reDeploy();
    /// Set KYC
    await contractRoleManager.setKYC(contentCreator.address, true);
    await contractRoleManager.setKYC(contentBuyer.address, true);
    // Create content
    const contentParts = [0, 1, 2, 3, 4, 5];
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
    const tx = await contractUDAOContent.connect(contentCreator).createContent(createContentVoucherSample);
    /// get decoded event from the transaction
    const decodedEvent = await readEvent(tx, "NewContentCreated", contractUDAOContent);
    /// Decoded results for NewContentCreated event
    const tokenId = Number(decodedEvent[0]);
    // You need to use all parts of the content to buy it. Get all parts of the content
    const parts = await contractUDAOContent.getContentParts(tokenId);
    // convert bigNumber parts to number
    const partsNumber = parts.map((part) => Number(part));
    // convert map to array
    const partsNumberArray = Array.from(partsNumber);
    // Make a content purchase
    const tokenIds = [1];
    const purchasedParts = [[2, 3, 5]];
    const redeemers = [contentBuyer1.address];
    const giftReceiver = [ethers.ZeroAddress];
    const fullContentPurchase = [false];
    const pricesToPay = [ethers.parseEther("1")];
    const validUntil = Date.now() + 999999999;
    const userIds = ["c8d53630-233a-4f95-90cb-4df253ae9283"];

    const balances = await makeContentPurchase(
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
    const balanceBefore = balances[0];
    const balanceAfter = balances[1];
    /// Check if the buyer has the content part
    const result = await contractPlatformTreasury.connect(contentBuyer1).getOwnedParts(contentBuyer1.address, tokenId);
    expect(result[0]).to.equal(purchasedParts[0][0]);
    expect(result[1]).to.equal(purchasedParts[0][1]);
    expect(result[2]).to.equal(purchasedParts[0][2]);
    /// Check if the buyer paid the correct amount
    expect(balanceBefore - balanceAfter).to.equal(pricesToPay[0]);
    // Try to buy the same content part again
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
    await expect(contractPlatformTreasury.connect(contentBuyer1).buyContent(contentPurchaseVouchers)).to.revertedWith(
      "Part is already owned!"
    );
  });

  it("Should fail to buy a content if caller is not redeemer", async function () {
    await reDeploy();
    /// Set KYC
    await contractRoleManager.setKYC(contentCreator.address, true);
    await contractRoleManager.setKYC(contentBuyer.address, true);
    await contractRoleManager.setKYC(contentBuyer2.address, true);
    // Create content
    const contentParts = [0, 1, 2, 3, 4, 5];
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
    const tx = await contractUDAOContent.connect(contentCreator).createContent(createContentVoucherSample);
    /// get decoded event from the transaction
    const decodedEvent = await readEvent(tx, "NewContentCreated", contractUDAOContent);
    /// Decoded results for NewContentCreated event
    const tokenId = Number(decodedEvent[0]);
    // Make a content purchase
    const tokenIds = [1];
    const purchasedParts = [[2, 3, 5]];
    const redeemers = [contentBuyer1.address];
    const giftReceiver = [ethers.ZeroAddress];
    const userIds = ["c8d53630-233a-4f95-90cb-4df253ae9283"];

    const fullContentPurchase = [false];
    const pricesToPay = [ethers.parseEther("1")];
    const validUntil = Date.now() + 999999999;
    const balances = await makeContentPurchase(
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
    const balanceBefore = balances[0];
    const balanceAfter = balances[1];
    /// Check if the buyer has the content part
    const result = await contractPlatformTreasury.connect(contentBuyer1).getOwnedParts(contentBuyer1.address, tokenId);
    expect(result[0]).to.equal(purchasedParts[0][0]);
    expect(result[1]).to.equal(purchasedParts[0][1]);
    expect(result[2]).to.equal(purchasedParts[0][2]);
    /// Check if the buyer paid the correct amount
    expect(balanceBefore - balanceAfter).to.equal(pricesToPay[0]);
    // Try to buy the same content part again
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
    await expect(contractPlatformTreasury.connect(contentBuyer2).buyContent(contentPurchaseVouchers)).to.revertedWith(
      "You are not redeemer"
    );
  });

  it("Should fail to buy a content if content does not exists", async function () {
    await reDeploy();
    /// Set KYC
    await contractRoleManager.setKYC(contentCreator.address, true);
    await contractRoleManager.setKYC(contentBuyer1.address, true);
    // Give approval to the platformtreasury
    await contractUDAO.connect(contentBuyer).approve(contractPlatformTreasury, ethers.parseEther("999999999999.0"));
    // Send UDAO to the buyer's wallet
    await contractUDAO.transfer(contentBuyer.address, ethers.parseEther("100.0"));
    // Try to buy a content that does not exists
    // Make a content purchase
    const tokenIds = [1];
    const purchasedParts = [[2, 3, 5]];
    const redeemers = [contentBuyer1.address];
    const giftReceiver = [ethers.ZeroAddress];
    const fullContentPurchase = [false];
    const pricesToPay = [ethers.parseEther("1")];
    const validUntil = Date.now() + 999999999;
    const userIds = ["c8d53630-233a-4f95-90cb-4df253ae9283"];
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
    /// Try to purchase the content
    await expect(contractPlatformTreasury.connect(contentBuyer1).buyContent(contentPurchaseVouchers)).to.revertedWith(
      "Content not exist!"
    );
  });

  it("Should fail to buy content if buyer is banned", async function () {
    await reDeploy();
    /// Set KYC
    await contractRoleManager.setKYC(contentCreator.address, true);
    await contractRoleManager.setKYC(contentBuyer1.address, true);
    // Create content
    const contentParts = [0, 1, 2, 3, 4, 5];
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
    const tx = await contractUDAOContent.connect(contentCreator).createContent(createContentVoucherSample);
    // Ban the buyer
    await contractRoleManager.setBan(contentBuyer1.address, true);
    /// get decoded event from the transaction
    const decodedEvent = await readEvent(tx, "NewContentCreated", contractUDAOContent);
    /// Decoded results for NewContentCreated event
    const tokenId = Number(decodedEvent[0]);
    // Make a content purchase
    const tokenIds = [1];
    const purchasedParts = [[2, 3, 5]];
    const redeemers = [contentBuyer1.address];
    const giftReceiver = [ethers.ZeroAddress];
    const fullContentPurchase = [false];
    const pricesToPay = [ethers.parseEther("1")];
    const validUntil = Date.now() + 999999999;
    const userIds = ["c8d53630-233a-4f95-90cb-4df253ae9283"];
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
    /// Try to purchase the content with banned buyer
    await expect(contractPlatformTreasury.connect(contentBuyer1).buyContent(contentPurchaseVouchers)).to.revertedWith(
      "You are banned"
    );
  });

  it("Should fail to buy content if buyer is not kyced", async function () {
    await reDeploy();
    /// Set KYC
    await contractRoleManager.setKYC(contentCreator.address, true);
    //await contractRoleManager.setKYC(contentBuyer1.address, true);
    // Create content
    const contentParts = [0, 1, 2, 3, 4, 5];
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
    const tx = await contractUDAOContent.connect(contentCreator).createContent(createContentVoucherSample);
    // Ban the buyer
    await contractRoleManager.setBan(contentBuyer1.address, true);
    /// get decoded event from the transaction
    const decodedEvent = await readEvent(tx, "NewContentCreated", contractUDAOContent);
    /// Decoded results for NewContentCreated event
    const tokenId = Number(decodedEvent[0]);
    // Make a content purchase
    const tokenIds = [1];
    const purchasedParts = [[2, 3, 5]];
    const redeemers = [contentBuyer1.address];
    const giftReceiver = [ethers.ZeroAddress];
    const fullContentPurchase = [false];
    const pricesToPay = [ethers.parseEther("1")];
    const validUntil = Date.now() + 999999999;
    const userIds = ["c8d53630-233a-4f95-90cb-4df253ae9283"];
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
    /// Try to purchase the content with banned buyer
    await expect(contractPlatformTreasury.connect(contentBuyer1).buyContent(contentPurchaseVouchers)).to.revertedWith(
      "You are not KYCed"
    );
  });

  it("Should fail to buy content if instructer is banned and isSelleble set to false", async function () {
    await reDeploy();
    /// Set KYC
    await contractRoleManager.setKYC(contentCreator.address, true);
    await contractRoleManager.setKYC(contentBuyer1.address, true);
    // Create content
    const contentParts = [0, 1, 2, 3, 4, 5];
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
    const tx = await contractUDAOContent.connect(contentCreator).createContent(createContentVoucherSample);
    // Ban the instructor
    await contractRoleManager.setBan(contentCreator.address, true);
    /// get decoded event from the transaction
    const decodedEvent = await readEvent(tx, "NewContentCreated", contractUDAOContent);
    /// Decoded results for NewContentCreated event
    const tokenId = Number(decodedEvent[0]);
    // set sellebla to false
    await contractUDAOContent.connect(backend).setSellable(tokenId, false);
    // Make a content purchase
    const tokenIds = [1];
    const purchasedParts = [[2, 3, 5]];
    const redeemers = [contentBuyer1.address];
    const giftReceiver = [ethers.ZeroAddress];
    const fullContentPurchase = [false];
    const pricesToPay = [ethers.parseEther("1")];
    const validUntil = Date.now() + 999999999;
    const userIds = ["c8d53630-233a-4f95-90cb-4df253ae9283"];
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
    /// Try to purchase the content with banned instructor
    await expect(contractPlatformTreasury.connect(contentBuyer1).buyContent(contentPurchaseVouchers)).to.revertedWith(
      "Not sellable"
    );
  });

  it("Should allow to buy content if instructer is banned and isSelleble set to true", async function () {
    await reDeploy();
    /// Set KYC
    await contractRoleManager.setKYC(contentCreator.address, true);
    await contractRoleManager.setKYC(contentBuyer.address, true);
    // Create content
    const contentParts = [0, 1, 2, 3, 4, 5];
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
    const tx = await contractUDAOContent.connect(contentCreator).createContent(createContentVoucherSample);
    // Ban the instructor
    await contractRoleManager.setBan(contentCreator.address, true);
    /// get decoded event from the transaction
    const decodedEvent = await readEvent(tx, "NewContentCreated", contractUDAOContent);
    /// Decoded results for NewContentCreated event
    const tokenId = Number(decodedEvent[0]);
    // Make a content purchase
    const tokenIds = [1];
    const purchasedParts = [[2, 3, 5]];
    const redeemers = [contentBuyer1.address];
    const giftReceiver = [ethers.ZeroAddress];
    const userIds = ["c8d53630-233a-4f95-90cb-4df253ae9283"];

    const fullContentPurchase = [false];
    const pricesToPay = [ethers.parseEther("1")];
    const validUntil = Date.now() + 999999999;

    const balances = await makeContentPurchase(
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
    const balanceBefore = balances[0];
    const balanceAfter = balances[1];

    /// Check if the buyer has the content part
    const result = await contractPlatformTreasury.connect(contentBuyer1).getOwnedParts(contentBuyer1.address, tokenId);
    expect(result[0]).to.equal(purchasedParts[0][0]);
    /// Get tokenId 0 price with calculatePriceToPay function
    const priceToPay = pricesToPay[0];
    /// Check if the buyer paid the correct amount
    expect(balanceBefore - balanceAfter).to.equal(priceToPay);
  });

  it("Should fail to buy a content part if full content is already purchased", async function () {
    await reDeploy();
    /// Set KYC
    await contractRoleManager.setKYC(contentCreator.address, true);
    await contractRoleManager.setKYC(contentBuyer.address, true);
    // Create content
    const contentParts = [0, 1];
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
    const tx = await contractUDAOContent.connect(contentCreator).createContent(createContentVoucherSample);
    /// get decoded event from the transaction
    const decodedEvent = await readEvent(tx, "NewContentCreated", contractUDAOContent);
    /// Decoded results for NewContentCreated event
    const tokenId = Number(decodedEvent[0]);
    // You need to use all parts of the content to buy it. Get all parts of the content
    const parts = await contractUDAOContent.getContentParts(tokenId);
    // convert bigNumber parts to number
    const partsNumber = parts.map((part) => Number(part));
    // convert map to array
    const partsNumberArray = Array.from(partsNumber);
    // Make a content purchase
    const tokenIds = [1];
    const purchasedParts = [partsNumberArray];
    const redeemers = [contentBuyer1.address];
    const giftReceiver = [ethers.ZeroAddress];
    const userIds = ["c8d53630-233a-4f95-90cb-4df253ae9283"];

    const fullContentPurchase = [true];
    const pricesToPay = [ethers.parseEther("1")];
    const validUntil = Date.now() + 999999999;
    const balances = await makeContentPurchase(
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
    const balanceBefore = balances[0];
    const balanceAfter = balances[1];

    /// Check if the buyer has the content part
    const result = await contractPlatformTreasury.connect(contentBuyer1).getOwnedParts(contentBuyer1.address, tokenId);
    expect(result[0]).to.equal(purchasedParts[0][0]);
    /// Get tokenId 0 price with calculatePriceToPay function
    const priceToPay = pricesToPay[0];
    /// Check if the buyer paid the correct amount
    expect(balanceBefore - balanceAfter).to.equal(priceToPay);
    /// Try to buy the same content part again

    await expect(
      makeContentPurchase(
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
      )
    ).to.revertedWith("Content is already fully purchased!");
  });

  it("Should fail to buy a content part if the part does not exist", async function () {
    await reDeploy();
    /// Set KYC
    await contractRoleManager.setKYC(contentCreator.address, true);
    await contractRoleManager.setKYC(contentBuyer.address, true);
    // Give approval to the platformtreasury
    await contractUDAO.connect(contentBuyer).approve(contractPlatformTreasury, ethers.parseEther("999999999999.0"));
    // Send UDAO to the buyer's wallet
    await contractUDAO.transfer(contentBuyer.address, ethers.parseEther("100.0"));
    // Create content
    const contentParts = [0, 1];
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
    const tx = await contractUDAOContent.connect(contentCreator).createContent(createContentVoucherSample);
    /// get decoded event from the transaction
    const decodedEvent = await readEvent(tx, "NewContentCreated", contractUDAOContent);
    /// Decoded results for NewContentCreated event
    const tokenId = Number(decodedEvent[0]);
    // Make a content purchase
    const tokenIds = [1];
    const purchasedParts = [[8]];
    const redeemers = [contentBuyer1.address];
    const giftReceiver = [ethers.ZeroAddress];
    const fullContentPurchase = [false];
    const pricesToPay = [ethers.parseEther("1")];
    const validUntil = Date.now() + 999999999;
    // Try to buy a content part that does not exists
    const userIds = ["c8d53630-233a-4f95-90cb-4df253ae9283"];

    await expect(
      makeContentPurchase(
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
      )
    ).to.revertedWith("Part does not exist!");
  });

  it("Should buy the full content for someone else", async function () {
    await reDeploy();
    /// Set KYC
    await contractRoleManager.setKYC(contentCreator.address, true);
    await contractRoleManager.setKYC(contentBuyer.address, true);
    await contractRoleManager.setKYC(contentBuyer3.address, true);
    // Give approval to the platformtreasury
    await contractUDAO.connect(contentBuyer).approve(contractPlatformTreasury, ethers.parseEther("999999999999.0"));
    // Send UDAO to the buyer's wallet
    await contractUDAO.transfer(contentBuyer.address, ethers.parseEther("100.0"));
    // Create content
    const contentParts = [0, 1];
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
    const tx = await contractUDAOContent.connect(contentCreator).createContent(createContentVoucherSample);
    /// get decoded event from the transaction
    const decodedEvent = await readEvent(tx, "NewContentCreated", contractUDAOContent);
    /// Decoded results for NewContentCreated event
    const tokenId = Number(decodedEvent[0]);
    // You need to use all parts of the content to buy it. Get all parts of the content
    const parts = await contractUDAOContent.getContentParts(tokenId);
    // convert bigNumber parts to number
    const partsNumber = parts.map((part) => Number(part));
    // convert map to array
    const partsNumberArray = Array.from(partsNumber);
    // Make a content purchase
    const tokenIds = [1];
    const purchasedParts = [partsNumberArray];
    const redeemers = [contentBuyer1.address];
    const giftReceiver = [contentBuyer3.address];
    const userIds = ["c8d53630-233a-4f95-90cb-4df253ae9283"];

    const fullContentPurchase = [true];
    const pricesToPay = [ethers.parseEther("1")];
    const validUntil = Date.now() + 999999999;
    const balances = await makeContentPurchase(
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
    const balanceBefore = balances[0];
    const balanceAfter = balances[1];
    // Check if the buyer has the content part
    const result = await contractPlatformTreasury.connect(contentBuyer3).getOwnedParts(contentBuyer3.address, tokenId);
    expect(result[0]).to.equal(purchasedParts[0][0]);
    expect(result[1]).to.equal(purchasedParts[0][1]);

    /// Check if the buyer paid the correct amount
    //expect(balanceBefore-balanceAfter).to.equal(priceToPay);
    expect(balanceBefore - balanceAfter).to.equal(pricesToPay[0]);
  });

  it("Should buy the part of the content for someone else", async function () {
    await reDeploy();
    /// Set KYC
    await contractRoleManager.setKYC(contentCreator.address, true);
    await contractRoleManager.setKYC(contentBuyer.address, true);
    await contractRoleManager.setKYC(contentBuyer3.address, true);
    // Create content
    const contentParts = [0, 1, 2, 3, 4, 5];
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
    const tx = await contractUDAOContent.connect(contentCreator).createContent(createContentVoucherSample);
    /// get decoded event from the transaction
    const decodedEvent = await readEvent(tx, "NewContentCreated", contractUDAOContent);
    /// Decoded results for NewContentCreated event
    const tokenId = Number(decodedEvent[0]);
    // Make a content purchase
    const tokenIds = [1];
    const purchasedParts = [[2, 3, 4]];
    const redeemers = [contentBuyer1.address];
    const giftReceiver = [contentBuyer3.address];
    const userIds = ["c8d53630-233a-4f95-90cb-4df253ae9283"];

    const fullContentPurchase = [false];
    const pricesToPay = [ethers.parseEther("1")];
    const validUntil = Date.now() + 999999999;
    const balances = await makeContentPurchase(
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
    const balanceBefore = balances[0];
    const balanceAfter = balances[1];
    /// Check if the buyer has the content part
    const result = await contractPlatformTreasury.connect(contentBuyer1).getOwnedParts(contentBuyer3.address, tokenId);
    expect(result[0]).to.equal(purchasedParts[0][0]);
    expect(result[1]).to.equal(purchasedParts[0][1]);
    expect(result[2]).to.equal(purchasedParts[0][2]);

    /// Check if the buyer paid the correct amount
    expect(balanceBefore - balanceAfter).to.equal(pricesToPay[0]);
  });

  it("Should fail to buy the full content for someone else if other account is banned", async function () {
    await reDeploy();
    /// Set KYC
    await contractRoleManager.setKYC(contentCreator.address, true);
    await contractRoleManager.setKYC(contentBuyer.address, true);
    await contractRoleManager.setKYC(contentBuyer3.address, true);
    /// Ban the contentBuyer 3
    await contractRoleManager.setBan(contentBuyer3.address, true);
    // Give approval to the platformtreasury
    await contractUDAO.connect(contentBuyer).approve(contractPlatformTreasury, ethers.parseEther("999999999999.0"));
    // Send UDAO to the buyer's wallet
    await contractUDAO.transfer(contentBuyer.address, ethers.parseEther("100.0"));
    // Create content
    const contentParts = [0, 1];
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
    const tx = await contractUDAOContent.connect(contentCreator).createContent(createContentVoucherSample);
    /// get decoded event from the transaction
    const decodedEvent = await readEvent(tx, "NewContentCreated", contractUDAOContent);
    /// Decoded results for NewContentCreated event
    const tokenId = Number(decodedEvent[0]);
    // You need to use all parts of the content to buy it. Get all parts of the content
    const parts = await contractUDAOContent.getContentParts(tokenId);
    // convert bigNumber parts to number
    const partsNumber = parts.map((part) => Number(part));
    // convert map to array
    const partsNumberArray = Array.from(partsNumber);
    // Make a content purchase
    const tokenIds = [1];
    const purchasedParts = [partsNumberArray];
    const redeemers = [contentBuyer1.address];
    const giftReceiver = [contentBuyer3.address];

    const userIds = ["c8d53630-233a-4f95-90cb-4df253ae9283"];

    const fullContentPurchase = [true];
    const pricesToPay = [ethers.parseEther("1")];
    const validUntil = Date.now() + 999999999;
    // Try to buy the content
    await expect(
      makeContentPurchase(
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
      )
    ).to.revertedWith("Gift receiver is banned");
  });

  it("Should fail to buy the full content for someone else if other account is dont have kyc", async function () {
    await reDeploy();
    /// Set KYC
    await contractRoleManager.setKYC(contentCreator.address, true);
    await contractRoleManager.setKYC(contentBuyer.address, true);
    await contractRoleManager.setKYC(contentBuyer3.address, false);
    /// Ban the contentBuyer 3
    // Give approval to the platformtreasury
    await contractUDAO.connect(contentBuyer).approve(contractPlatformTreasury, ethers.parseEther("999999999999.0"));
    // Send UDAO to the buyer's wallet
    await contractUDAO.transfer(contentBuyer.address, ethers.parseEther("100.0"));
    // Create content
    const contentParts = [0, 1];
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
    const tx = await contractUDAOContent.connect(contentCreator).createContent(createContentVoucherSample);
    /// get decoded event from the transaction
    const decodedEvent = await readEvent(tx, "NewContentCreated", contractUDAOContent);
    /// Decoded results for NewContentCreated event
    const tokenId = Number(decodedEvent[0]);
    // You need to use all parts of the content to buy it. Get all parts of the content
    const parts = await contractUDAOContent.getContentParts(tokenId);
    // convert bigNumber parts to number
    const partsNumber = parts.map((part) => Number(part));
    // convert map to array
    const partsNumberArray = Array.from(partsNumber);
    // Make a content purchase
    const tokenIds = [1];
    const purchasedParts = [partsNumberArray];
    const redeemers = [contentBuyer1.address];
    const giftReceiver = [contentBuyer3.address];
    const userIds = ["c8d53630-233a-4f95-90cb-4df253ae9283"];

    const fullContentPurchase = [true];
    const pricesToPay = [ethers.parseEther("1")];
    const validUntil = Date.now() + 999999999;
    // Try to buy the content
    await expect(
      makeContentPurchase(
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
      )
    ).to.revertedWith("Gift receiver is not KYCed");
  });

  it("Should fail to buy content if purchased parts not in a order", async function () {
    await reDeploy();
    /// Set KYC
    await contractRoleManager.setKYC(contentCreator.address, true);
    await contractRoleManager.setKYC(contentBuyer1.address, true);
    await contractRoleManager.setKYC(contentBuyer3.address, true);
    // Give approval to the platformtreasury
    await contractUDAO.connect(contentBuyer1).approve(contractPlatformTreasury, ethers.parseEther("999999999999.0"));
    // Send UDAO to the buyer's wallet
    await contractUDAO.transfer(contentBuyer1.address, ethers.parseEther("100.0"));
    // Create content
    const contentParts = [0, 1];
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
    const tx = await contractUDAOContent.connect(contentCreator).createContent(createContentVoucherSample);
    /// get decoded event from the transaction
    const decodedEvent = await readEvent(tx, "NewContentCreated", contractUDAOContent);
    /// Decoded results for NewContentCreated event
    const tokenId = Number(decodedEvent[0]);
    // Make a content purchase
    const tokenIds = [1];
    const purchasedParts = [[1, 0]];
    const redeemers = [contentBuyer1.address];
    const giftReceiver = [contentBuyer3.address];
    const userIds = ["c8d53630-233a-4f95-90cb-4df253ae9283"];

    const fullContentPurchase = [false];
    const pricesToPay = [ethers.parseEther("1")];
    const validUntil = Date.now() + 999999999;
    // Try to buy the content
    await expect(
      makeContentPurchase(
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
      )
    ).to.revertedWith("Parts are not in order or duplicated!");
  });

  it("Should a user able to buy multiple content", async function () {
    await reDeploy();
    /// Set KYC
    await contractRoleManager.setKYC(contentCreator.address, true);
    await contractRoleManager.setKYC(contentBuyer.address, true);
    await contractRoleManager.setKYC(contentBuyer1.address, true);
    // Create content
    const contentParts = [0, 1, 2, 3, 4];
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
    const tx1 = await contractUDAOContent.connect(contentCreator).createContent(createContentVoucherSample);
    /// get decoded event from the transaction
    const decodedEvent1 = await readEvent(tx1, "NewContentCreated", contractUDAOContent);
    /// Decoded results for NewContentCreated event
    const tokenId1 = Number(decodedEvent1[0]);
    // You need to use all parts of the content to buy it. Get all parts of the content
    const parts1 = await contractUDAOContent.getContentParts(tokenId1);
    // convert bigNumber parts to number
    const partsNumber1 = parts1.map((part1) => Number(part1));
    // convert map to array
    const partsNumberArray1 = Array.from(partsNumber1);
    // Create content
    const contentParts2 = [0, 1, 2, 3, 4, 5, 6];
    // Create content voucher
    const createContentVoucherSample2 = await createContentVoucher(
      contractUDAOContent,
      backend,
      contentCreator,
      contentParts2,
      (redeemType = 1),
      (validationScore = 1)
    );

    // Create content with voucher
    const tx2 = await contractUDAOContent.connect(contentCreator).createContent(createContentVoucherSample2);
    /// get decoded event from the transaction
    const decodedEvent2 = await readEvent(tx2, "NewContentCreated", contractUDAOContent);
    /// Decoded results for NewContentCreated event
    const tokenId2 = Number(decodedEvent2[0]);
    // You need to use all parts of the content to buy it. Get all parts of the content
    const parts2 = await contractUDAOContent.getContentParts(tokenId2);
    // convert bigNumber parts to number
    const partsNumber2 = parts2.map((part2) => Number(part2));
    // convert map to array
    const partsNumberArray2 = Array.from(partsNumber2);
    // Make a content purchase for token 1
    const tokenIds = [1];
    const purchasedParts1 = [partsNumberArray1];
    const redeemers1 = [contentBuyer1.address];
    const giftReceiver = [ethers.ZeroAddress];

    const fullContentPurchase = [true];
    const pricesToPay = [ethers.parseEther("1")];
    const validUntil = Date.now() + 999999999;
    const userIds = ["c8d53630-233a-4f95-90cb-4df253ae9283"];
    const balances = await makeContentPurchase(
      contractPlatformTreasury,
      contractVoucherVerifier,
      contentBuyer1,
      contractRoleManager,
      contractUDAO,
      tokenIds,
      purchasedParts1,
      pricesToPay,
      fullContentPurchase,
      validUntil,
      redeemers1,
      giftReceiver,
      userIds
    );
    const balanceBefore1 = balances[0];
    const balanceAfter1 = balances[1];
    // Check if the buyer has the content part
    const result = await contractPlatformTreasury.connect(contentBuyer1).getOwnedParts(contentBuyer1.address, tokenId1);
    // Check if purchasedParts1[0] array same as result array
    for (let i = 0; i < purchasedParts1[0].length; i++) {
      expect(result[i]).to.equal(purchasedParts1[0][i]);
    }
    // Check if the buyer paid the correct amount
    expect(balanceBefore1 - balanceAfter1).to.equal(pricesToPay[0]);
    // Make a content purchase for token 2
    const tokenIds2 = [2];
    const purchasedParts2 = [partsNumberArray2];
    const redeemers2 = [contentBuyer1.address];
    const giftReceiver2 = [ethers.ZeroAddress];

    const fullContentPurchase2 = [true];
    const pricesToPay2 = [ethers.parseEther("1")];
    const validUntil2 = Date.now() + 999999999;
    const balances2 = await makeContentPurchase(
      contractPlatformTreasury,
      contractVoucherVerifier,
      contentBuyer1,
      contractRoleManager,
      contractUDAO,
      tokenIds2,
      purchasedParts2,
      pricesToPay2,
      fullContentPurchase2,
      validUntil2,
      redeemers2,
      giftReceiver2,
      userIds
    );
    const balanceBefore2 = balances2[0];
    const balanceAfter2 = balances2[1];
    // Check if the buyer has the content part
    const result2 = await contractPlatformTreasury
      .connect(contentBuyer1)
      .getOwnedParts(contentBuyer1.address, tokenId2);
    // Check if purchasedParts2[0] array same as result2 array
    for (let i = 0; i < purchasedParts2[0].length; i++) {
      expect(result2[i]).to.equal(purchasedParts2[0][i]);
    }
    // Check if the buyer paid the correct amount
    expect(balanceBefore2 - balanceAfter2).to.equal(pricesToPay2[0]);
  });

  it("Should allow a user to buy multiple contents cart purchase with a single transaction", async function () {
    await reDeploy();
    /// Set KYC
    await contractRoleManager.setKYC(contentCreator.address, true);
    // Create content
    const contentParts = [0, 1, 2, 3, 4];
    // Create content voucher
    const createContentVoucherSample = await createContentVoucher(
      contractUDAOContent,
      backend,
      contentCreator,
      contentParts
    );

    // Create content with voucher
    const tx1 = await contractUDAOContent.connect(contentCreator).createContent(createContentVoucherSample);
    /// get decoded event from the transaction
    const decodedEvent1 = await readEvent(tx1, "NewContentCreated", contractUDAOContent);
    /// Decoded results for NewContentCreated event
    const tokenId1 = Number(decodedEvent1[0]);
    // You need to use all parts of the content to buy it. Get all parts of the content
    const parts1 = await contractUDAOContent.getContentParts(tokenId1);
    // convert bigNumber parts to number
    const partsNumber1 = parts1.map((part1) => Number(part1));
    // convert map to array
    const partsNumberArray1 = Array.from(partsNumber1);
    // Create content
    const contentParts2 = [0, 1, 2, 3, 4, 5, 6];
    // Create content voucher
    const createContentVoucherSample2 = await createContentVoucher(
      contractUDAOContent,
      backend,
      contentCreator,
      contentParts2
    );
    // Create content with voucher
    const tx2 = await contractUDAOContent.connect(contentCreator).createContent(createContentVoucherSample2);
    /// get decoded event from the transaction
    const decodedEvent2 = await readEvent(tx2, "NewContentCreated", contractUDAOContent);
    /// Decoded results for NewContentCreated event
    const tokenId2 = Number(decodedEvent2[0]);
    // You need to use all parts of the content to buy it. Get all parts of the content
    const parts2 = await contractUDAOContent.getContentParts(tokenId2);
    // convert bigNumber parts to number
    const partsNumber2 = parts2.map((part2) => Number(part2));
    // convert map to array
    const partsNumberArray2 = Array.from(partsNumber2);
    // Make a content purchase for token 1 and token 2 together with cart purchase
    const tokenIds = [1, 2];
    const purchasedParts = [partsNumberArray1, partsNumberArray2];
    const redeemers = [contentBuyer1.address, contentBuyer1.address];
    const giftReceiver = [ethers.ZeroAddress, ethers.ZeroAddress];
    const fullContentPurchase = [true, true];
    const pricesToPay = [ethers.parseEther("1"), ethers.parseEther("1")];
    const validUntil = Date.now() + 999999999;
    const userIds = ["c8d53630-233a-4f95-90cb-4df253ae9283", "c8d53630-233a-4f95-90cb-4df253ae9283"];
    const balances = await makeContentPurchase(
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
    const balanceBefore = balances[0];
    const balanceAfter = balances[1];
    // Check if the buyer has the content part
    const result = await contractPlatformTreasury.connect(contentBuyer1).getOwnedParts(contentBuyer1.address, tokenId1);
    // Check if purchasedParts1[0] array same as result array
    for (let i = 0; i < purchasedParts[0].length; i++) {
      expect(result[i]).to.equal(purchasedParts[0][i]);
    }
    // Check if the buyer has the content part
    const result2 = await contractPlatformTreasury
      .connect(contentBuyer1)
      .getOwnedParts(contentBuyer1.address, tokenId2);
    // Check if purchasedParts2[0] array same as result2 array
    for (let i = 0; i < purchasedParts[1].length; i++) {
      expect(result2[i]).to.equal(purchasedParts[1][i]);
    }
    // Check if the buyer paid the correct amount
    expect(balanceBefore - balanceAfter).to.equal(pricesToPay[0] + pricesToPay[1]);
  });

  it("Should allow a user to buy multiple contents cart purchase with a single transaction and gift to someone else", async function () {
    await reDeploy();
    /// Set KYC
    await contractRoleManager.setKYC(contentCreator.address, true);
    await contractRoleManager.setKYC(contentBuyer3.address, true);
    // Create content
    const contentParts = [0, 1, 2, 3, 4];
    // Create content voucher
    const createContentVoucherSample = await createContentVoucher(
      contractUDAOContent,
      backend,
      contentCreator,
      contentParts
    );

    // Create content with voucher
    const tx1 = await contractUDAOContent.connect(contentCreator).createContent(createContentVoucherSample);
    /// get decoded event from the transaction
    const decodedEvent1 = await readEvent(tx1, "NewContentCreated", contractUDAOContent);
    /// Decoded results for NewContentCreated event
    const tokenId1 = Number(decodedEvent1[0]);
    // You need to use all parts of the content to buy it. Get all parts of the content
    const parts1 = await contractUDAOContent.getContentParts(tokenId1);
    // convert bigNumber parts to number
    const partsNumber1 = parts1.map((part1) => Number(part1));
    // convert map to array
    const partsNumberArray1 = Array.from(partsNumber1);
    // Create content
    const contentParts2 = [0, 1, 2, 3, 4, 5, 6];
    // Create content voucher
    const createContentVoucherSample2 = await createContentVoucher(
      contractUDAOContent,
      backend,
      contentCreator,
      contentParts2
    );
    // Create content with voucher
    const tx2 = await contractUDAOContent.connect(contentCreator).createContent(createContentVoucherSample2);
    /// get decoded event from the transaction
    const decodedEvent2 = await readEvent(tx2, "NewContentCreated", contractUDAOContent);
    /// Decoded results for NewContentCreated event
    const tokenId2 = Number(decodedEvent2[0]);
    // You need to use all parts of the content to buy it. Get all parts of the content
    const parts2 = await contractUDAOContent.getContentParts(tokenId2);
    // convert bigNumber parts to number
    const partsNumber2 = parts2.map((part2) => Number(part2));
    // convert map to array
    const partsNumberArray2 = Array.from(partsNumber2);
    // Make a content purchase for token 1 and token 2 together with cart purchase
    const tokenIds = [1, 2];
    const purchasedParts = [partsNumberArray1, partsNumberArray2];
    const redeemers = [contentBuyer1.address, contentBuyer1.address];
    const giftReceiver = [contentBuyer3.address, contentBuyer3.address];
    const userIds = ["c8d53630-233a-4f95-90cb-4df253ae9283", "c8d53630-233a-4f95-90cb-4df253ae9283"];

    const fullContentPurchase = [true, true];
    const pricesToPay = [ethers.parseEther("1"), ethers.parseEther("1")];
    const validUntil = Date.now() + 999999999;
    const balances = await makeContentPurchase(
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
    const balanceBefore = balances[0];
    const balanceAfter = balances[1];
    // Check if the buyer has the content part
    const result = await contractPlatformTreasury.connect(contentBuyer3).getOwnedParts(contentBuyer3.address, tokenId1);
    // Check if purchasedParts1[0] array same as result array
    for (let i = 0; i < purchasedParts[0].length; i++) {
      expect(result[i]).to.equal(purchasedParts[0][i]);
    }
    // Check if the buyer has the content part
    const result2 = await contractPlatformTreasury
      .connect(contentBuyer3)
      .getOwnedParts(contentBuyer3.address, tokenId2);
    // Check if purchasedParts2[0] array same as result2 array
    for (let i = 0; i < purchasedParts[1].length; i++) {
      expect(result2[i]).to.equal(purchasedParts[1][i]);
    }
    // Check if the buyer paid the correct amount
    expect(balanceBefore - balanceAfter).to.equal(pricesToPay[0] + pricesToPay[1]);
  });

  it("Should allow backend to activate Governance Treasury and transfer funds to governance treasury", async function () {
    await reDeploy();
    /// Set KYC
    await contractRoleManager.setKYC(contentCreator.address, true);
    await contractRoleManager.setKYC(contentBuyer.address, true);
    await contractRoleManager.setKYC(contentBuyer1.address, true);
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
    const txCoachCuts = await contractPlatformTreasury
      .connect(backend)
      .setCoachCuts(_coachFoundCut, _coachGoverCut, _coachJurorCut, _coachValidCut);
    const txContentCuts = await contractPlatformTreasury
      .connect(backend)
      .setContentCuts(_contentFoundCut, _contentGoverCut, _contentJurorCut, _contentValidCut);

    // expect PlatformCutsUpdated event
    await expect(txContentCuts)
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

    // Create content
    const contentParts = [0, 1, 2, 3, 4];
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
    const tx1 = await contractUDAOContent.connect(contentCreator).createContent(createContentVoucherSample);
    /// get decoded event from the transaction
    const decodedEvent1 = await readEvent(tx1, "NewContentCreated", contractUDAOContent);
    /// Decoded results for NewContentCreated event
    const tokenId1 = Number(decodedEvent1[0]);
    // You need to use all parts of the content to buy it. Get all parts of the content
    const parts1 = await contractUDAOContent.getContentParts(tokenId1);
    // convert bigNumber parts to number
    const partsNumber1 = parts1.map((part1) => Number(part1));
    // convert map to array
    const partsNumberArray1 = Array.from(partsNumber1);
    // Create content
    const contentParts2 = [0, 1, 2, 3, 4, 5, 6];
    // Create content voucher
    const createContentVoucherSample2 = await createContentVoucher(
      contractUDAOContent,
      backend,
      contentCreator,
      contentParts2,
      (redeemType = 1),
      (validationScore = 1)
    );
    // Create content with voucher
    const tx2 = await contractUDAOContent.connect(contentCreator).createContent(createContentVoucherSample2);
    /// get decoded event from the transaction
    const decodedEvent2 = await readEvent(tx2, "NewContentCreated", contractUDAOContent);
    /// Decoded results for NewContentCreated event
    const tokenId2 = Number(decodedEvent2[0]);
    // You need to use all parts of the content to buy it. Get all parts of the content
    const parts2 = await contractUDAOContent.getContentParts(tokenId2);
    // convert bigNumber parts to number
    const partsNumber2 = parts2.map((part2) => Number(part2));
    // convert map to array
    const partsNumberArray2 = Array.from(partsNumber2);
    // Make a content purchase for token 1
    const tokenIds = [1];
    const purchasedParts1 = [partsNumberArray1];
    const redeemers1 = [contentBuyer1.address];
    const giftReceiver = [ethers.ZeroAddress];
    const userIds = ["c8d53630-233a-4f95-90cb-4df253ae9283"];
    const fullContentPurchase = [true];
    const pricesToPay = [ethers.parseEther("10")];
    const validUntil = Date.now() + 999999999;
    const balances = await makeContentPurchase(
      contractPlatformTreasury,
      contractVoucherVerifier,
      contentBuyer1,
      contractRoleManager,
      contractUDAO,
      tokenIds,
      purchasedParts1,
      pricesToPay,
      fullContentPurchase,
      validUntil,
      redeemers1,
      giftReceiver,
      userIds
    );

    const balanceBefore1 = balances[0];
    const balanceAfter1 = balances[1];
    // Check if the buyer has the content part
    const result = await contractPlatformTreasury.connect(contentBuyer1).getOwnedParts(contentBuyer1.address, tokenId1);
    // Check if purchasedParts1[0] array same as result array
    for (let i = 0; i < purchasedParts1[0].length; i++) {
      expect(result[i]).to.equal(purchasedParts1[0][i]);
    }
    // activate governance treasury
    await contractPlatformTreasury.connect(backend).activateGovernanceTreasury(true);
    /// @dev Skip "refund window" days to allow foundation to withdraw funds
    const refundWindowDays = await contractPlatformTreasury.refundWindow();
    /// convert big number to number
    const refundWindowDaysNumber = Number(refundWindowDays);

    /// @dev Skip 20'refund window period' days to allow foundation to withdraw funds
    skipDays(refundWindowDaysNumber);

    // Check if the buyer paid the correct amount
    expect(balanceBefore1 - balanceAfter1).to.equal(pricesToPay[0]);
    // Make a content purchase for token 2
    const tokenIds2 = [2];
    const purchasedParts2 = [partsNumberArray2];
    const redeemers2 = [contentBuyer1.address];
    const giftReceiver2 = [ethers.ZeroAddress];

    const fullContentPurchase2 = [true];
    const pricesToPay2 = [ethers.parseEther("1")];
    const validUntil2 = Date.now() + 999999999;
    const balances2 = await makeContentPurchase(
      contractPlatformTreasury,
      contractVoucherVerifier,
      contentBuyer1,
      contractRoleManager,
      contractUDAO,
      tokenIds2,
      purchasedParts2,
      pricesToPay2,
      fullContentPurchase2,
      validUntil2,
      redeemers2,
      giftReceiver2,
      userIds
    );
    const balanceBefore2 = balances2[0];
    const balanceAfter2 = balances2[1];
    // Check if the buyer has the content part
    const result2 = await contractPlatformTreasury
      .connect(contentBuyer1)
      .getOwnedParts(contentBuyer1.address, tokenId2);
    // Check if purchasedParts2[0] array same as result2 array
    for (let i = 0; i < purchasedParts2[0].length; i++) {
      expect(result2[i]).to.equal(purchasedParts2[0][i]);
    }
    // Check if the buyer paid the correct amount
    expect(balanceBefore2 - balanceAfter2).to.equal(pricesToPay2[0]);
    // Check if the governance treasury has the correct amount with respect to the platform cut percentages
    const governanceTreasuryBalance = await contractUDAO.balanceOf(contractGovernanceTreasury);
    // Get total price
    const totalPrice = pricesToPay[0];
    // Get contentFoundCut
    const contentFoundCut = (totalPrice * BigInt(_contentFoundCut)) / BigInt(100000);
    // Get contentGoverCut
    const contentGoverCut = (totalPrice * BigInt(_contentGoverCut)) / BigInt(100000);
    // Get contentJurorCut
    const contentJurorCut = (totalPrice * BigInt(_contentJurorCut)) / BigInt(100000);
    // Get contentValidCut
    const contentValidCut = (totalPrice * BigInt(_contentValidCut)) / BigInt(100000);
    // Get total cut
    const totalCut = contentGoverCut + contentJurorCut + contentValidCut;
    // Check if the governance treasury has the correct amount with respect to the platform cut percentages
    expect(governanceTreasuryBalance).to.equal(totalCut);
  });

  it("Should allow buyer to refund a full content in refundable window", async function () {
    await reDeploy();
    /// Set KYC
    await contractRoleManager.setKYC(contentCreator.address, true);
    await contractRoleManager.setKYC(contentBuyer.address, true);
    // Create content
    const contentParts = [0, 1];
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
    const tx = await contractUDAOContent.connect(contentCreator).createContent(createContentVoucherSample);
    /// get decoded event from the transaction
    const decodedEvent = await readEvent(tx, "NewContentCreated", contractUDAOContent);
    /// Decoded results for NewContentCreated event
    const tokenId = Number(decodedEvent[0]);
    // You need to use all parts of the content to buy it. Get all parts of the content
    const parts = await contractUDAOContent.getContentParts(tokenId);
    // convert bigNumber parts to number
    const partsNumber = parts.map((part) => Number(part));
    // convert map to array
    const partsNumberArray = Array.from(partsNumber);
    // Make a content purchase
    const tokenIds = [1];
    const purchasedParts = [partsNumberArray];
    const redeemers = [contentBuyer1.address];
    const giftReceiver = [ethers.ZeroAddress];
    const userIds = ["c8d53630-233a-4f95-90cb-4df253ae9283"];

    const fullContentPurchase = [true];
    const pricesToPay = [ethers.parseEther("1")];
    const validUntil = Date.now() + 999999999;
    const balances = await makeContentPurchase(
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
    const balanceBefore = balances[0];
    const balanceAfter = balances[1];

    /// @notice user address => content token Id => is full content purchase
    //mapping(address => mapping(uint256 => bool)) public ;
    /// Check if the buyer has the content part
    const result = await contractPlatformTreasury.connect(contentBuyer1).getOwnedParts(contentBuyer1.address, tokenId);
    expect(result[0]).to.equal(purchasedParts[0][0]);
    const isFullyPurchased = await contractPlatformTreasury.isFullyPurchased(contentBuyer1.address, tokenId);

    expect(isFullyPurchased).to.equal(true);
    /// Get tokenId 0 price with calculatePriceToPay function
    const priceToPay = pricesToPay[0];
    /// Check if the buyer paid the correct amount
    expect(balanceBefore - balanceAfter).to.equal(priceToPay);

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
    // Refund the content
    await expect(contractPlatformTreasury.connect(contentCreator).newRefundContent(refund_voucher))
      .to.emit(contractPlatformTreasury, "SaleRefunded")
      .withArgs(contentSaleId, refundType);
    // Check if the buyer has finalParts
    const result2 = await contractPlatformTreasury.connect(contentBuyer1).getOwnedParts(contentBuyer1.address, tokenId);
    /// convert result2 to array
    const result2Array = Array.from(result2);
    expect(result2Array).to.eql(finalParts);

    // Check if the buyer has finalContents
    const result3 = await contractPlatformTreasury.connect(contentBuyer1).getOwnedContents(contentBuyer1.address);
    /// convert result3 to array
    const result3Array = Array.from(result3);
    expect(result3Array).to.eql(finalContents);
  });

  it("Should fail buyer to refund a content if it is already refunded", async function () {
    await reDeploy();
    /// Set KYC
    await contractRoleManager.setKYC(contentCreator.address, true);
    await contractRoleManager.setKYC(contentBuyer.address, true);
    // Create content
    const contentParts = [0, 1];
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
    const tx = await contractUDAOContent.connect(contentCreator).createContent(createContentVoucherSample);
    /// get decoded event from the transaction
    const decodedEvent = await readEvent(tx, "NewContentCreated", contractUDAOContent);
    /// Decoded results for NewContentCreated event
    const tokenId = Number(decodedEvent[0]);
    // You need to use all parts of the content to buy it. Get all parts of the content
    const parts = await contractUDAOContent.getContentParts(tokenId);
    // convert bigNumber parts to number
    const partsNumber = parts.map((part) => Number(part));
    // convert map to array
    const partsNumberArray = Array.from(partsNumber);
    // Make a content purchase
    const tokenIds = [1];
    const purchasedParts = [partsNumberArray];
    const redeemers = [contentBuyer1.address];
    const giftReceiver = [ethers.ZeroAddress];
    const userIds = ["c8d53630-233a-4f95-90cb-4df253ae9283"];

    const fullContentPurchase = [true];
    const pricesToPay = [ethers.parseEther("1")];
    const validUntil = Date.now() + 999999999;
    const balances = await makeContentPurchase(
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
    const balanceBefore = balances[0];
    const balanceAfter = balances[1];

    /// @notice user address => content token Id => is full content purchase
    //mapping(address => mapping(uint256 => bool)) public ;
    /// Check if the buyer has the content part
    const result = await contractPlatformTreasury.connect(contentBuyer1).getOwnedParts(contentBuyer1.address, tokenId);
    expect(result[0]).to.equal(purchasedParts[0][0]);
    const isFullyPurchased = await contractPlatformTreasury.isFullyPurchased(contentBuyer1.address, tokenId);

    expect(isFullyPurchased).to.equal(true);
    /// Get tokenId 0 price with calculatePriceToPay function
    const priceToPay = pricesToPay[0];
    /// Check if the buyer paid the correct amount
    expect(balanceBefore - balanceAfter).to.equal(priceToPay);

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
    const finalContents = [2]; // Empty since buyer had no co
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
    // Check if the buyer has finalParts
    const result2 = await contractPlatformTreasury.connect(contentBuyer1).getOwnedParts(contentBuyer1.address, tokenId);
    /// convert result2 to array
    const result2Array = Array.from(result2);
    expect(result2Array).to.eql(finalParts);
    // Check if the buyer has finalContents
    const result3 = await contractPlatformTreasury.connect(contentBuyer1).getOwnedContents(contentBuyer1.address);
    /// convert result3 nignumber array to number mapping
    const result3NumberMap = result3.map((element) => Number(element));
    // convert bigNumber parts to number
    const result3Array = Array.from(result3NumberMap);
    expect(result3Array).to.eql(finalContents);

    // Refund the content
    await expect(contractPlatformTreasury.connect(contentCreator).newRefundContent(refund_voucher)).to.be.revertedWith(
      "Already refunded!"
    );
  });

  it("Should fail buyer to refund a full content if not in refundable window", async function () {
    await reDeploy();
    /// Set KYC
    await contractRoleManager.setKYC(contentCreator.address, true);
    await contractRoleManager.setKYC(contentBuyer.address, true);
    // Create content
    const contentParts = [0, 1];
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
    const tx = await contractUDAOContent.connect(contentCreator).createContent(createContentVoucherSample);
    /// get decoded event from the transaction
    const decodedEvent = await readEvent(tx, "NewContentCreated", contractUDAOContent);
    /// Decoded results for NewContentCreated event
    const tokenId = Number(decodedEvent[0]);
    // You need to use all parts of the content to buy it. Get all parts of the content
    const parts = await contractUDAOContent.getContentParts(tokenId);
    // convert bigNumber parts to number
    const partsNumber = parts.map((part) => Number(part));
    // convert map to array
    const partsNumberArray = Array.from(partsNumber);
    // Make a content purchase
    const tokenIds = [1];
    const purchasedParts = [partsNumberArray];
    const redeemers = [contentBuyer1.address];
    const giftReceiver = [ethers.ZeroAddress];
    const userIds = ["c8d53630-233a-4f95-90cb-4df253ae9283"];

    const fullContentPurchase = [true];
    const pricesToPay = [ethers.parseEther("1")];
    const validUntil = Date.now() + 999999999;
    const balances = await makeContentPurchase(
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
    const balanceBefore = balances[0];
    const balanceAfter = balances[1];

    /// @notice user address => content token Id => is full content purchase
    //mapping(address => mapping(uint256 => bool)) public ;
    /// Check if the buyer has the content part
    const result = await contractPlatformTreasury.connect(contentBuyer1).getOwnedParts(contentBuyer1.address, tokenId);
    expect(result[0]).to.equal(purchasedParts[0][0]);
    const isFullyPurchased = await contractPlatformTreasury.isFullyPurchased(contentBuyer1.address, tokenId);

    expect(isFullyPurchased).to.equal(true);
    /// Get tokenId 0 price with calculatePriceToPay function
    const priceToPay = pricesToPay[0];
    /// Check if the buyer paid the correct amount
    expect(balanceBefore - balanceAfter).to.equal(priceToPay);

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
    // Get refund window days
    const refundWindowDaysNumberInBigNumber = await contractPlatformTreasury.refundWindow();
    /// convert big number to number
    const refundWindowDaysNumber = Number(refundWindowDaysNumberInBigNumber);
    /// @dev Skip 20'refund window period' days to complete the refund window
    skipDays(refundWindowDaysNumber + 1);

    // Refund the content
    await expect(contractPlatformTreasury.connect(contentCreator).newRefundContent(refund_voucher)).to.be.revertedWith(
      "refund period over you cant refund"
    );
  });

  it("Should backed change refund window", async function () {
    await reDeploy();
    /// Set KYC
    await contractRoleManager.setKYC(contentCreator.address, true);
    await contractRoleManager.setKYC(contentBuyer.address, true);
    await contractRoleManager.setKYC(contentBuyer1.address, true);
    // Create content
    const contentParts = [0, 1, 2, 3, 4];
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
    const tx1 = await contractUDAOContent.connect(contentCreator).createContent(createContentVoucherSample);
    /// get decoded event from the transaction
    const decodedEvent1 = await readEvent(tx1, "NewContentCreated", contractUDAOContent);
    /// Decoded results for NewContentCreated event
    const tokenId1 = Number(decodedEvent1[0]);
    // You need to use all parts of the content to buy it. Get all parts of the content
    const parts1 = await contractUDAOContent.getContentParts(tokenId1);
    // convert bigNumber parts to number
    const partsNumber1 = parts1.map((part1) => Number(part1));
    // convert map to array
    const partsNumberArray1 = Array.from(partsNumber1);
    // Create content
    const contentParts2 = [0, 1, 2, 3, 4, 5, 6];
    // Create content voucher
    const createContentVoucherSample2 = await createContentVoucher(
      contractUDAOContent,
      backend,
      contentCreator,
      contentParts2,
      (redeemType = 1),
      (validationScore = 1)
    );

    // Create content with voucher
    const tx2 = await contractUDAOContent.connect(contentCreator).createContent(createContentVoucherSample2);
    /// get decoded event from the transaction
    const decodedEvent2 = await readEvent(tx2, "NewContentCreated", contractUDAOContent);
    /// Decoded results for NewContentCreated event
    const tokenId2 = Number(decodedEvent2[0]);
    // You need to use all parts of the content to buy it. Get all parts of the content
    const parts2 = await contractUDAOContent.getContentParts(tokenId2);
    // convert bigNumber parts to number
    const partsNumber2 = parts2.map((part2) => Number(part2));
    // convert map to array
    const partsNumberArray2 = Array.from(partsNumber2);
    // Make a content purchase for token 1
    const tokenIds = [1];
    const purchasedParts1 = [partsNumberArray1];
    const redeemers1 = [contentBuyer1.address];
    const giftReceiver = [ethers.ZeroAddress];
    const userIds = ["c8d53630-233a-4f95-90cb-4df253ae9283"];

    const fullContentPurchase = [true];
    const pricesToPay = [ethers.parseEther("3")];
    const validUntil = Date.now() + 999999999;
    const balances = await makeContentPurchase(
      contractPlatformTreasury,
      contractVoucherVerifier,
      contentBuyer1,
      contractRoleManager,
      contractUDAO,
      tokenIds,
      purchasedParts1,
      pricesToPay,
      fullContentPurchase,
      validUntil,
      redeemers1,
      giftReceiver,
      userIds
    );
    const balanceBefore1 = balances[0];
    const balanceAfter1 = balances[1];
    // Check if the buyer has the content part
    const result = await contractPlatformTreasury.connect(contentBuyer1).getOwnedParts(contentBuyer1.address, tokenId1);
    // Check if purchasedParts1[0] array same as result array
    for (let i = 0; i < purchasedParts1[0].length; i++) {
      expect(result[i]).to.equal(purchasedParts1[0][i]);
    }
    // Check if the buyer paid the correct amount
    expect(balanceBefore1 - balanceAfter1).to.equal(pricesToPay[0]);
    /// @dev Skip "refund window-1" days to allow foundation to withdraw funds
    /// @dev Skip "refund window" days to allow foundation to withdraw funds
    const refundWindowDays = await contractPlatformTreasury.refundWindow();
    /// convert big number to number
    const refundWindowDaysNumber = Number(refundWindowDays);

    /// @dev Skip 20'refund window period' days to allow foundation to withdraw funds
    skipDays(refundWindowDaysNumber - 1);

    // Make a content purchase for token 2
    const tokenIds2 = [2];
    const purchasedParts2 = [partsNumberArray2];
    const redeemers2 = [contentBuyer1.address];
    const giftReceiver2 = [ethers.ZeroAddress];
    const fullContentPurchase2 = [true];
    const pricesToPay2 = [ethers.parseEther("5")];
    const validUntil2 = Date.now() + 999999999;
    const balances2 = await makeContentPurchase(
      contractPlatformTreasury,
      contractVoucherVerifier,
      contentBuyer1,
      contractRoleManager,
      contractUDAO,
      tokenIds2,
      purchasedParts2,
      pricesToPay2,
      fullContentPurchase2,
      validUntil2,
      redeemers2,
      giftReceiver2,
      userIds
    );
    const balanceBefore2 = balances2[0];
    const balanceAfter2 = balances2[1];
    // Check if the buyer has the content part
    const result2 = await contractPlatformTreasury
      .connect(contentBuyer1)
      .getOwnedParts(contentBuyer1.address, tokenId2);
    // Check if purchasedParts2[0] array same as result2 array
    for (let i = 0; i < purchasedParts2[0].length; i++) {
      expect(result2[i]).to.equal(purchasedParts2[0][i]);
    }
    // Check if the buyer paid the correct amount
    expect(balanceBefore2 - balanceAfter2).to.equal(pricesToPay2[0]);

    /// @dev Skip 1 day to complete refund window for first purchase
    skipDays(1);

    // change refund window to 7 days
    const oldRefundWindow = refundWindowDaysNumber;
    const newRefundWindow = 7;
    await contractPlatformTreasury.connect(backend).changeRefundWindow(newRefundWindow);

    expect(await contractPlatformTreasury.refundWindow()).to.equal(newRefundWindow);

    const _contentFoundCut = await contractPlatformTreasury.contentFoundCut();
    const totalPrice1 = pricesToPay[0];
    const contentFoundCut1 = (totalPrice1 * _contentFoundCut) / BigInt(100000);
    expect(await contractPlatformTreasury.foundationBalance()).to.equal(contentFoundCut1);

    /// @dev Skip new refund window to complete refund window for seccond purchase
    skipDays(oldRefundWindow);
    const totalPrice2 = pricesToPay2[0];
    const contentFoundCut2 = (totalPrice2 * _contentFoundCut) / BigInt(100000);

    // Update balances
    await contractPlatformTreasury.updateAndTransferPlatformBalances();
    skipDays(1);
    expect(await contractPlatformTreasury.foundationBalance()).to.equal(contentFoundCut1 + contentFoundCut2);
    // foundation withdraw funds
    await contractPlatformTreasury.connect(foundation).withdrawFoundation();
    // expect recorded balance to be zero
    expect(await contractPlatformTreasury.foundationBalance()).to.equal(0);
    // Expect UDAO balance of foundation to be equal to the total found cut
    expect(await contractUDAO.balanceOf(foundation.address)).to.equal(contentFoundCut1 + contentFoundCut2);
  });

  it("Should instructers locked balances preserved after the refund window change", async function () {
    await reDeploy();
    /// Set KYC
    await contractRoleManager.setKYC(contentCreator.address, true);
    await contractRoleManager.setKYC(contentBuyer.address, true);
    await contractRoleManager.setKYC(contentBuyer1.address, true);
    await contractRoleManager.setKYC(contentBuyer2.address, true);
    // Create content
    const contentParts = [0, 1, 2, 3, 4];
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
    const tx1 = await contractUDAOContent.connect(contentCreator).createContent(createContentVoucherSample);
    /// get decoded event from the transaction
    const decodedEvent1 = await readEvent(tx1, "NewContentCreated", contractUDAOContent);
    /// Decoded results for NewContentCreated event
    const tokenId1 = Number(decodedEvent1[0]);
    // You need to use all parts of the content to buy it. Get all parts of the content
    const parts1 = await contractUDAOContent.getContentParts(tokenId1);
    // convert bigNumber parts to number
    const partsNumber1 = parts1.map((part1) => Number(part1));
    // convert map to array
    const partsNumberArray1 = Array.from(partsNumber1);
    // Create content
    const contentParts2 = [0, 1, 2, 3, 4, 5, 6];
    // Create content voucher
    const createContentVoucherSample2 = await createContentVoucher(
      contractUDAOContent,
      backend,
      contentCreator,
      contentParts2,
      (redeemType = 1),
      (validationScore = 1)
    );

    // Create content with voucher
    const tx2 = await contractUDAOContent.connect(contentCreator).createContent(createContentVoucherSample2);
    /// get decoded event from the transaction
    const decodedEvent2 = await readEvent(tx2, "NewContentCreated", contractUDAOContent);
    /// Decoded results for NewContentCreated event
    const tokenId2 = Number(decodedEvent2[0]);
    // You need to use all parts of the content to buy it. Get all parts of the content
    const parts2 = await contractUDAOContent.getContentParts(tokenId2);
    // convert bigNumber parts to number
    const partsNumber2 = parts2.map((part2) => Number(part2));
    // convert map to array
    const partsNumberArray2 = Array.from(partsNumber2);
    // Make a content purchase for token 1
    const tokenIds = [1];
    const purchasedParts1 = [partsNumberArray1];
    const redeemers1 = [contentBuyer1.address];
    const giftReceiver = [ethers.ZeroAddress];
    const userIds = ["c8d53630-233a-4f95-90cb-4df253ae9283"];

    const fullContentPurchase = [true];
    const pricesToPay = [ethers.parseEther("3")];
    const validUntil = Date.now() + 999999999;
    const balances = await makeContentPurchase(
      contractPlatformTreasury,
      contractVoucherVerifier,
      contentBuyer1,
      contractRoleManager,
      contractUDAO,
      tokenIds,
      purchasedParts1,
      pricesToPay,
      fullContentPurchase,
      validUntil,
      redeemers1,
      giftReceiver,
      userIds
    );
    const balanceBefore1 = balances[0];
    const balanceAfter1 = balances[1];
    // Check if the buyer has the content part
    const result = await contractPlatformTreasury.connect(contentBuyer1).getOwnedParts(contentBuyer1.address, tokenId1);
    // Check if purchasedParts1[0] array same as result array
    for (let i = 0; i < purchasedParts1[0].length; i++) {
      expect(result[i]).to.equal(purchasedParts1[0][i]);
    }
    // Check if the buyer paid the correct amount
    expect(balanceBefore1 - balanceAfter1).to.equal(pricesToPay[0]);
    /// @dev Skip "refund window-1" days to allow foundation to withdraw funds
    /// @dev Skip "refund window" days to allow foundation to withdraw funds
    const refundWindowDays = await contractPlatformTreasury.refundWindow();
    /// convert big number to number
    const refundWindowDaysNumber = Number(refundWindowDays);

    /// @dev Skip 20'refund window period' days to allow foundation to withdraw funds
    skipDays(refundWindowDaysNumber);

    //calculate total inst locked balance
    let totalInstLB = BigInt(0);
    for (let i = 0; i < refundWindowDaysNumber; i++) {
      let temp;
      temp = await contractPlatformTreasury.instLockedBalance(contentCreator.address, i);
      //add big number temp to number totalInstLB
      totalInstLB = totalInstLB + temp;
    }
    // change refund window to 7 days
    const newRefundWindow = 7;
    await contractPlatformTreasury.connect(backend).changeRefundWindow(newRefundWindow);

    expect(await contractPlatformTreasury.refundWindow()).to.equal(newRefundWindow);

    const _contentFoundCut = await contractPlatformTreasury.contentFoundCut();
    const totalPrice1 = pricesToPay[0];
    const contentFoundCut1 = (totalPrice1 * _contentFoundCut) / BigInt(100000);
    expect(await contractPlatformTreasury.foundationBalance()).to.equal(contentFoundCut1);

    /// a new sale occur
    const redeemers2 = [contentBuyer2.address];
    const balances2 = await makeContentPurchase(
      contractPlatformTreasury,
      contractVoucherVerifier,
      contentBuyer2,
      contractRoleManager,
      contractUDAO,
      tokenIds,
      purchasedParts1,
      pricesToPay,
      fullContentPurchase,
      validUntil,
      redeemers2,
      giftReceiver,
      userIds
    );
    //calculate total inst locked balance
    let totalInstLB2 = BigInt(0);
    for (let i = 0; i < newRefundWindow; i++) {
      let temp;
      temp = await contractPlatformTreasury.instLockedBalance(contentCreator.address, i);
      //add big number temp to number totalInstLB
      totalInstLB2 = totalInstLB2 + temp;
    }

    //calculate total instructor share from new sale
    const totalCutRate = await contractPlatformTreasury.contentTotalCut();
    const newSaleRevenue = pricesToPay[0] - (pricesToPay[0] * totalCutRate) / BigInt(100000);

    // new sale revenue + old sale revenue is must bu inst locked balance
    expect(totalInstLB2).to.equal(totalInstLB + newSaleRevenue);
  });

  it("Should fail to change refund window if not backed", async function () {
    await reDeploy();
    /// try to change refund window
    const newRefundWindow = 7;
    await expect(
      contractPlatformTreasury.connect(contentCreator).changeRefundWindow(newRefundWindow)
    ).to.be.revertedWith("Only backend can set refund window");
  });
});
