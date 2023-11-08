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
async function makeContentPurchase(contractPlatformTreasury, contractVoucherVerifier, contentBuyer, contractRoleManager, contractUDAO, tokenIds, purchasedParts, pricesToPay, fullContentPurchase, validUntil, redeemers, giftReceiver) {
  /// Set KYC
  await contractRoleManager.setKYC(contentBuyer.address, true);
  /// Send UDAO to the buyer's wallet
  await contractUDAO.transfer(contentBuyer.address, ethers.utils.parseEther("100.0"));
  const balanceBeforePurchase = await contractUDAO.balanceOf(contentBuyer.address);
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
  for (let i = 0; i < tokenIds.length; i++) {
    if (giftReceiver[i] == ethers.constants.AddressZero) {
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

describe("Platform Treasury Contract - Content", function () {
  it("Should fail to set validation manager if not FOUNDATION", async function () {
    await reDeploy();

    await expect(
      contractPlatformTreasury
        .connect(foundation)
        .updateAddresses(
          contractUDAO.address,
          contractUDAOContent.address,
          contractRoleManager.address,
          contractUDAOGovernor.address,
          contractVoucherVerifier.address
        )
    ).to.revertedWith("Only backend and contract manager can update addresses");
  });
  //!!Bu dünkü test
  it("Should a user able to buy the full content", async function () {
    await reDeploy();
    /// Set KYC
    await contractRoleManager.setKYC(contentCreator.address, true);
    await contractRoleManager.setKYC(contentBuyer.address, true);
    // Create content
    const contentParts = [0, 1]
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
    const tx = await contractUDAOContent.connect(contentCreator).createContent(createContentVoucherSample)
    // Get NewContentCreated event and get tokenId
    const receipt = await tx.wait();
    const tokenId = receipt.events[0].args[2].toNumber();
    // You need to use all parts of the content to buy it. Get all parts of the content

    const parts = await contractUDAOContent.getContentParts(tokenId);
    // Make a content purchase
    const tokenIds = [0];
    const purchasedParts = [parts];
    const redeemers = [contentBuyer1.address];
    const giftReceiver = [ethers.constants.AddressZero];
    const fullContentPurchase = [true];
    const pricesToPay = [ethers.utils.parseEther("1")];
    const validUntil = Date.now() + 999999999;
    const balances = await makeContentPurchase(contractPlatformTreasury, contractVoucherVerifier, contentBuyer1, contractRoleManager, contractUDAO, tokenIds, purchasedParts, pricesToPay, fullContentPurchase, validUntil, redeemers, giftReceiver);
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
    expect(balanceBefore.sub(balanceAfter)).to.equal(priceToPay);
  });

  it("Should a user able to buy parts of a content", async function () {
    await reDeploy();
    /// Set KYC
    await contractRoleManager.setKYC(contentCreator.address, true);
    await contractRoleManager.setKYC(contentBuyer.address, true);
    // Create content
    const contentParts = [0, 1, 2, 3, 4, 5]
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
    const tx = await contractUDAOContent.connect(contentCreator).createContent(createContentVoucherSample)
    // Get NewContentCreated event and get tokenId
    const receipt = await tx.wait();
    const tokenId = receipt.events[0].args[2].toNumber();
    // Make a content purchase
    const tokenIds = [0];
    const purchasedParts = [[2, 3, 5]];
    const redeemers = [contentBuyer1.address];
    const giftReceiver = [ethers.constants.AddressZero];
    const fullContentPurchase = [false];
    const pricesToPay = [ethers.utils.parseEther("1")];
    const validUntil = Date.now() + 999999999;

    const balances = await makeContentPurchase(contractPlatformTreasury, contractVoucherVerifier, contentBuyer1, contractRoleManager, contractUDAO, tokenIds, purchasedParts, pricesToPay, fullContentPurchase, validUntil, redeemers, giftReceiver);
    const balanceBefore = balances[0];
    const balanceAfter = balances[1];

    /// Check if the buyer has the content part
    const result = await contractPlatformTreasury.connect(contentBuyer1).getOwnedParts(contentBuyer1.address, tokenId);
    expect(result[0]).to.equal(purchasedParts[0][0]);
    expect(result[1]).to.equal(purchasedParts[0][1]);
    expect(result[2]).to.equal(purchasedParts[0][2]);
    /// Check if the buyer paid the correct amount
    expect(balanceBefore.sub(balanceAfter)).to.equal(pricesToPay[0]);
  });
  //İkinci
  it("Should fail to buy a content part if content part already purchased", async function () {
    await reDeploy();
    /// Set KYC
    await contractRoleManager.setKYC(contentCreator.address, true);
    await contractRoleManager.setKYC(contentBuyer.address, true);
    // Create content
    const contentParts = [0, 1, 2, 3, 4, 5]
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
    const tx = await contractUDAOContent.connect(contentCreator).createContent(createContentVoucherSample)
    // Get NewContentCreated event and get tokenId
    const receipt = await tx.wait();
    const tokenId = receipt.events[0].args[2].toNumber();
    // Make a content purchase
    const tokenIds = [0];
    const purchasedParts = [[2, 3, 5]];
    const redeemers = [contentBuyer1.address];
    const giftReceiver = [ethers.constants.AddressZero];
    const fullContentPurchase = [false];
    const pricesToPay = [ethers.utils.parseEther("1")];
    const validUntil = Date.now() + 999999999;
    const balances = await makeContentPurchase(contractPlatformTreasury, contractVoucherVerifier, contentBuyer1, contractRoleManager, contractUDAO, tokenIds, purchasedParts, pricesToPay, fullContentPurchase, validUntil, redeemers, giftReceiver);
    const balanceBefore = balances[0];
    const balanceAfter = balances[1];
    /// Check if the buyer has the content part
    const result = await contractPlatformTreasury.connect(contentBuyer1).getOwnedParts(contentBuyer1.address, tokenId);
    expect(result[0]).to.equal(purchasedParts[0][0]);
    expect(result[1]).to.equal(purchasedParts[0][1]);
    expect(result[2]).to.equal(purchasedParts[0][2]);
    /// Check if the buyer paid the correct amount
    expect(balanceBefore.sub(balanceAfter)).to.equal(pricesToPay[0]);
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
        giftReceiver[i]
      );
      // Save the voucher to the array
      contentPurchaseVouchers.push(contentPurchaseVoucher);
    }
    /// Buy content
    await expect(
      contractPlatformTreasury.connect(contentBuyer1).buyContentWithDiscount(contentPurchaseVouchers)
    ).to.revertedWith("Part is already owned!");

  });

  it("Should fail to buy a content if content does not exists", async function () {
    await reDeploy();
    /// Set KYC
    await contractRoleManager.setKYC(contentCreator.address, true);
    await contractRoleManager.setKYC(contentBuyer1.address, true);
    // Give approval to the platformtreasury
    await contractUDAO.connect(contentBuyer).approve(contractPlatformTreasury.address, ethers.utils.parseEther("999999999999.0"));
    // Send UDAO to the buyer's wallet
    await contractUDAO.transfer(contentBuyer.address, ethers.utils.parseEther("100.0"));
    // Try to buy a content that does not exists
    // Make a content purchase
    const tokenIds = [0];
    const purchasedParts = [[2, 3, 5]];
    const redeemers = [contentBuyer1.address];
    const giftReceiver = [ethers.constants.AddressZero];
    const fullContentPurchase = [false];
    const pricesToPay = [ethers.utils.parseEther("1")];
    const validUntil = Date.now() + 999999999;
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
    /// Try to purchase the content
    await expect(
      contractPlatformTreasury.connect(contentBuyer1).buyContentWithDiscount(contentPurchaseVouchers)
    ).to.revertedWith("Content not exist!");

  });

  it("Should fail to buy content if buyer is banned", async function () {
    await reDeploy();
    /// Set KYC
    await contractRoleManager.setKYC(contentCreator.address, true);
    await contractRoleManager.setKYC(contentBuyer1.address, true);
    // Create content
    const contentParts = [0, 1, 2, 3, 4, 5]
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
    const tx = await contractUDAOContent.connect(contentCreator).createContent(createContentVoucherSample)
    // Ban the buyer
    await contractRoleManager.setBan(contentBuyer1.address, true);
    // Get NewContentCreated event and get tokenId
    const receipt = await tx.wait();
    const tokenId = receipt.events[0].args[2].toNumber();
    // Make a content purchase
    const tokenIds = [0];
    const purchasedParts = [[2, 3, 5]];
    const redeemers = [contentBuyer1.address];
    const giftReceiver = [ethers.constants.AddressZero];
    const fullContentPurchase = [false];
    const pricesToPay = [ethers.utils.parseEther("1")];
    const validUntil = Date.now() + 999999999;
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
    /// Try to purchase the content with banned buyer
    await expect(
      contractPlatformTreasury.connect(contentBuyer1).buyContentWithDiscount(contentPurchaseVouchers)
    ).to.revertedWith("You are banned");


  });

  it("Should fail to buy content if instructer is banned and isSelleble set to false", async function () {
    await reDeploy();
    /// Set KYC
    await contractRoleManager.setKYC(contentCreator.address, true);
    await contractRoleManager.setKYC(contentBuyer1.address, true);
    // Create content
    const contentParts = [0, 1, 2, 3, 4, 5]
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
    const tx = await contractUDAOContent.connect(contentCreator).createContent(createContentVoucherSample)
    // Ban the instructor
    await contractRoleManager.setBan(contentCreator.address, true);

    // Get NewContentCreated event and get tokenId
    const receipt = await tx.wait();
    const tokenId = receipt.events[0].args[2].toNumber();
    // set sellebla to false
    await contractUDAOContent.connect(backend).setSellable(tokenId, false);
    // Make a content purchase
    const tokenIds = [0];
    const purchasedParts = [[2, 3, 5]];
    const redeemers = [contentBuyer1.address];
    const giftReceiver = [ethers.constants.AddressZero];
    const fullContentPurchase = [false];
    const pricesToPay = [ethers.utils.parseEther("1")];
    const validUntil = Date.now() + 999999999;
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
    /// Try to purchase the content with banned instructor
    await expect(
      contractPlatformTreasury.connect(contentBuyer1).buyContentWithDiscount(contentPurchaseVouchers)
    ).to.revertedWith("Not sellable");
  });
  it("Should allow to buy content if instructer is banned and isSelleble set to true", async function () {
    await reDeploy();
    /// Set KYC
    await contractRoleManager.setKYC(contentCreator.address, true);
    await contractRoleManager.setKYC(contentBuyer.address, true);
    // Create content
    const contentParts = [0, 1, 2, 3, 4, 5]
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
    const tx = await contractUDAOContent.connect(contentCreator).createContent(createContentVoucherSample)
    // Ban the instructor 
    await contractRoleManager.setBan(contentCreator.address, true);
    // Get NewContentCreated event and get tokenId
    const receipt = await tx.wait();
    const tokenId = receipt.events[0].args[2].toNumber();
    // Make a content purchase
    const tokenIds = [0];
    const purchasedParts = [[2, 3, 5]];
    const redeemers = [contentBuyer1.address];
    const giftReceiver = [ethers.constants.AddressZero];
    const fullContentPurchase = [false];
    const pricesToPay = [ethers.utils.parseEther("1")];
    const validUntil = Date.now() + 999999999;

    const balances = await makeContentPurchase(contractPlatformTreasury, contractVoucherVerifier, contentBuyer1, contractRoleManager, contractUDAO, tokenIds, purchasedParts, pricesToPay, fullContentPurchase, validUntil, redeemers, giftReceiver);
    const balanceBefore = balances[0];
    const balanceAfter = balances[1];

    /// Check if the buyer has the content part
    const result = await contractPlatformTreasury.connect(contentBuyer1).getOwnedParts(contentBuyer1.address, tokenId);
    expect(result[0]).to.equal(purchasedParts[0][0]);
    /// Get tokenId 0 price with calculatePriceToPay function
    const priceToPay = pricesToPay[0]
    /// Check if the buyer paid the correct amount
    expect(balanceBefore.sub(balanceAfter)).to.equal(priceToPay);

  });

  it("Should fail to buy a content part if full content is already purchased", async function () {
    await reDeploy();
    /// Set KYC
    await contractRoleManager.setKYC(contentCreator.address, true);
    await contractRoleManager.setKYC(contentBuyer.address, true);
    // Create content
    const contentParts = [0, 1]
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
    const tx = await contractUDAOContent.connect(contentCreator).createContent(createContentVoucherSample)
    // Get NewContentCreated event and get tokenId
    const receipt = await tx.wait();
    const tokenId = receipt.events[0].args[2].toNumber();
    // You need to use all parts of the content to buy it. Get all parts of the content

    const parts = await contractUDAOContent.getContentParts(tokenId);
    // Make a content purchase
    const tokenIds = [0];
    const purchasedParts = [parts];
    const redeemers = [contentBuyer1.address];
    const giftReceiver = [ethers.constants.AddressZero];
    const fullContentPurchase = [true];
    const pricesToPay = [ethers.utils.parseEther("1")];
    const validUntil = Date.now() + 999999999;
    const balances = await makeContentPurchase(contractPlatformTreasury, contractVoucherVerifier, contentBuyer1, contractRoleManager, contractUDAO, tokenIds, purchasedParts, pricesToPay, fullContentPurchase, validUntil, redeemers, giftReceiver);
    const balanceBefore = balances[0];
    const balanceAfter = balances[1];

    /// Check if the buyer has the content part
    const result = await contractPlatformTreasury.connect(contentBuyer1).getOwnedParts(contentBuyer1.address, tokenId);
    expect(result[0]).to.equal(purchasedParts[0][0]);
    /// Get tokenId 0 price with calculatePriceToPay function
    const priceToPay = pricesToPay[0];
    /// Check if the buyer paid the correct amount
    expect(balanceBefore.sub(balanceAfter)).to.equal(priceToPay);
    /// Try to buy the same content part again
    await expect(makeContentPurchase(contractPlatformTreasury, contractVoucherVerifier, contentBuyer1, contractRoleManager, contractUDAO, tokenIds, purchasedParts, pricesToPay, fullContentPurchase, validUntil, redeemers, giftReceiver)).to.revertedWith("Content is already fully purchased!");
  });

  it("Should fail to buy a content part if the part does not exist", async function () {
    await reDeploy();
    /// Set KYC
    await contractRoleManager.setKYC(contentCreator.address, true);
    await contractRoleManager.setKYC(contentBuyer.address, true);
    // Give approval to the platformtreasury
    await contractUDAO.connect(contentBuyer).approve(contractPlatformTreasury.address, ethers.utils.parseEther("999999999999.0"));
    // Send UDAO to the buyer's wallet
    await contractUDAO.transfer(contentBuyer.address, ethers.utils.parseEther("100.0"));
    // Create content
    const partPricesArray = [ethers.utils.parseEther("1"), ethers.utils.parseEther("1")];
    const contentPriceSet = ethers.utils.parseEther("2");
    const createContentVoucherSample = await createContentVoucher(
      contractUDAOContent,
      backend,
      contentCreator,
      contentPriceSet,
      partPricesArray,
      (redeemType = 1),
      (validationScore = 1)
    );
    await contractUDAOContent.connect(contentCreator).createContent(createContentVoucherSample)
    // Try to buy a content part that does not exists
    await expect(
      contractPlatformTreasury.connect(contentBuyer).buyContent([0], [[8]], [ethers.constants.AddressZero])
    ).to.revertedWith("Part does not exist!");
  });

  it("Should buy the full content for someone else", async function () {
    await reDeploy();
    /// Set KYC
    await contractRoleManager.setKYC(contentCreator.address, true);
    await contractRoleManager.setKYC(contentBuyer.address, true);
    await contractRoleManager.setKYC(contentBuyer3.address, true);
    // Create content
    const contentParts = [0, 1, 2, 3, 4, 5]

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
    const tx = await contractUDAOContent.connect(contentCreator).createContent(createContentVoucherSample)
    // Get NewContentCreated event and get tokenId
    const receipt = await tx.wait();
    const tokenId = receipt.events[0].args[2].toNumber();
    //const parts = await contractUDAOContent.getContentParts(tokenId);
    // Make a content purchase
    // Make a content purchase
    const tokenIds = [0];
    const purchasedParts = [[2, 3, 5]];
    const redeemers = [contentBuyer1.address];
    const giftReceiver = [contentBuyer3.address];
    const fullContentPurchase = [false];
    const pricesToPay = [ethers.utils.parseEther("1")];
    const validUntil = Date.now() + 999999999;
    const balances = await makeContentPurchase(contractPlatformTreasury, contractVoucherVerifier, contentBuyer1, contractRoleManager, contractUDAO, tokenIds, purchasedParts, pricesToPay, fullContentPurchase, validUntil, redeemers, giftReceiver);
    const balanceBefore = balances[0];
    const balanceAfter = balances[1];
    // Check if the buyer has the content part
    const result = await contractPlatformTreasury.connect(contentBuyer3).getOwnedParts(contentBuyer3.address, tokenId);
    expect(result[0]).to.equal(purchasedParts[0][0]);
    expect(result[1]).to.equal(purchasedParts[0][1]);
    expect(result[2]).to.equal(purchasedParts[0][2]);

    /// Check if the buyer paid the correct amount
    //expect(balanceBefore.sub(balanceAfter)).to.equal(priceToPay);
    expect(balanceBefore.sub(balanceAfter)).to.equal(pricesToPay[0]);

  });

  it("Should buy the part of the content for someone else", async function () {
    await reDeploy();
    /// Set KYC
    await contractRoleManager.setKYC(contentCreator.address, true);
    await contractRoleManager.setKYC(contentBuyer.address, true);
    await contractRoleManager.setKYC(contentBuyer3.address, true);
    /// part prices must be determined before creating content
    const partPricesArray = [ethers.utils.parseEther("1"), ethers.utils.parseEther("2"), ethers.utils.parseEther("3"), ethers.utils.parseEther("4")];
    const contentPriceSet = ethers.utils.parseEther("2");
    /// Create Voucher from redeem.js and use it for creating content
    // Create content voucher
    const createContentVoucherSample = await createContentVoucher(
      contractUDAOContent,
      backend,
      contentCreator,
      contentPriceSet,
      partPricesArray,
      (redeemType = 1),
      (validationScore = 1)
    );
    // Create content with voucher 
    const tx = await contractUDAOContent.connect(contentCreator).createContent(createContentVoucherSample)
    // Get NewContentCreated event and get tokenId
    const receipt = await tx.wait();
    const tokenId = receipt.events[0].args[2].toNumber();
    // Define which parts of the content will be purchased
    const purchasedParts = [[1, 3]];
    const giftReceiver = [contentBuyer3.address];
    const balances = await makeContentPurchase(contractPlatformTreasury, contentBuyer1, contractRoleManager, contractUDAO, [tokenId], purchasedParts, giftReceiver);
    const balanceBefore = balances[0];
    const balanceAfter = balances[1];
    /// Check if the buyer has the content part
    const result = await contractPlatformTreasury.connect(contentBuyer1).getOwnedParts(contentBuyer3.address, tokenId);
    expect(result[0]).to.equal(purchasedParts[0][0]);
    expect(result[1]).to.equal(purchasedParts[0][1]);
    let totalPartPrice = 0;
    /// Get total part prices with getContentPartPrice function
    for (let i = 0; i < purchasedParts[0].length; i++) {
      const priceToPay = await contractUDAOContent.getContentPartPrice(tokenId, purchasedParts[0][i]);
      totalPartPrice = priceToPay.add(totalPartPrice);
    }
    /// Check if the buyer paid the correct amount
    expect(balanceBefore.sub(balanceAfter)).to.equal(totalPartPrice);

  });

  it("Should fail to buy the full content for someone else if other account is banned", async function () {
    await reDeploy();
    /// Set KYC
    await contractRoleManager.setKYC(contentCreator.address, true);
    await contractRoleManager.setKYC(contentBuyer.address, true);
    await contractRoleManager.setKYC(contentBuyer3.address, true);
    /// Set ban
    await contractRoleManager.setBan(contentBuyer3.address, true);
    /// part prices must be determined before creating content
    const partPricesArray = [ethers.utils.parseEther("1"), ethers.utils.parseEther("1")];
    const contentPriceSet = ethers.utils.parseEther("2");
    /// Create Voucher from redeem.js and use it for creating content
    // Create content voucher
    const createContentVoucherSample = await createContentVoucher(
      contractUDAOContent,
      backend,
      contentCreator,
      contentPriceSet,
      partPricesArray,
      (redeemType = 1),
      (validationScore = 1)
    );
    // Create content with voucher 
    const tx = await contractUDAOContent.connect(contentCreator).createContent(createContentVoucherSample)
    // Get NewContentCreated event and get tokenId
    const receipt = await tx.wait();
    const tokenId = receipt.events[0].args[2].toNumber();
    // You need to use all parts of the content to buy it. Get all parts of the content
    const parts = await contractUDAOContent.getContentParts(tokenId);
    // Make a content purchase
    const purchasedParts = [parts];
    const giftReceiver = [contentBuyer3.address];
    // Try to buy the content
    await expect(
      contractPlatformTreasury.connect(contentBuyer).buyContent([tokenId], purchasedParts, giftReceiver)
    ).to.revertedWith("Gift receiver is banned");
  });

  it("Should a user able to buy the full content with discount", async function () {
    await reDeploy();
    /// Set KYC
    await contractRoleManager.setKYC(contentCreator.address, true);
    await contractRoleManager.setKYC(contentBuyer.address, true);
    await contractRoleManager.setKYC(contentBuyer1.address, true);
    /// part prices must be determined before creating content
    const partPricesArray = [ethers.utils.parseEther("2"), ethers.utils.parseEther("2")];
    const contentPriceSet = ethers.utils.parseEther("4");
    /// Create Voucher from redeem.js and use it for creating content
    // Create content voucher
    const createContentVoucherSample = await createContentVoucher(
      contractUDAOContent,
      backend,
      contentCreator,
      contentPriceSet,
      partPricesArray,
      (redeemType = 1),
      (validationScore = 1),
      (isDiscounted = true)
    );
    // Create content with voucher
    const tx = await contractUDAOContent.connect(contentCreator).createContent(createContentVoucherSample)
    // Get NewContentCreated event and get tokenId
    const receipt = await tx.wait();
    const tokenId = receipt.events[0].args[2].toNumber();
    // You need to use all parts of the content to buy it. Get all parts of the content
    const parts = await contractUDAOContent.getContentParts(tokenId);
    // Make a content purchase
    const purchasedParts = [parts];
    const giftReceiver = [ethers.constants.AddressZero];
    const isFullContentPurchase = true;
    const discountedPrice = ethers.utils.parseEther("0.1");
    // Create DiscountedPurchase voucher
    // tokenId, fullContentPurchase, purchasedParts, priceToPay, validUntil, redeemer, giftReceiver
    const DiscountedPurchaseVoucher = await new DiscountedPurchase({
      contract: contractVoucherVerifier,
      signer: backend,
    }).createVoucher(
      tokenId,
      isFullContentPurchase,
      purchasedParts[0],
      discountedPrice,
      999999999999999,
      contentBuyer.address,
      giftReceiver[0]
    );
    // Send UDAO to the buyer's wallet
    await contractUDAO.transfer(contentBuyer.address, ethers.utils.parseEther("100.0"));
    // Give approval to the platformtreasury
    await contractUDAO.connect(contentBuyer).approve(contractPlatformTreasury.address, ethers.utils.parseEther("999999999999.0"));
    const balanceBefore = await contractUDAO.balanceOf(contentBuyer.address);
    // Buy the content with DiscountedPurchase voucher
    await contractPlatformTreasury.connect(contentBuyer).buyContentWithDiscount([DiscountedPurchaseVoucher]);
    // Check if the buyer has the content part
    const result = await contractPlatformTreasury.connect(contentBuyer).getOwnedParts(contentBuyer.address, tokenId);
    expect(result[0]).to.equal(purchasedParts[0][0]);
    // Check if the buyer paid the correct amount
    const balanceAfter = await contractUDAO.balanceOf(contentBuyer.address);
    expect(balanceBefore.sub(balanceAfter)).to.equal(discountedPrice);
  });

  it("Should a user able to buy multiple content", async function () {
    await reDeploy();
    /// Set KYC
    await contractRoleManager.setKYC(contentCreator.address, true);
    await contractRoleManager.setKYC(contentBuyer.address, true);
    await contractRoleManager.setKYC(contentBuyer1.address, true);
    /// part prices must be determined before creating content
    const partPricesArray1 = [ethers.utils.parseEther("1"), ethers.utils.parseEther("1")];
    const contentPriceSet1 = ethers.utils.parseEther("2");
    const partPricesArray2 = [ethers.utils.parseEther("2"), ethers.utils.parseEther("2")];
    const contentPriceSet2 = ethers.utils.parseEther("4");
    /// Create Voucher from redeem.js and use it for creating content
    // Create content voucher 1
    const createContentVoucherSample1 = await createContentVoucher(
      contractUDAOContent,
      backend,
      contentCreator,
      contentPriceSet1,
      partPricesArray1,
      (redeemType = 1),
      (validationScore = 1)
    );
    // Create content with voucher 1
    const tx1 = await contractUDAOContent.connect(contentCreator).createContent(createContentVoucherSample1)
    // Get NewContentCreated event and get tokenId
    const receipt1 = await tx1.wait();
    const tokenId1 = receipt1.events[0].args[2].toNumber();
    // Create content voucher 2
    const createContentVoucherSample2 = await createContentVoucher(
      contractUDAOContent,
      backend,
      contentCreator,
      contentPriceSet2,
      partPricesArray2,
      (redeemType = 1),
      (validationScore = 1)
    );
    // Create content with voucher 2
    const tx2 = await contractUDAOContent.connect(contentCreator).createContent(createContentVoucherSample2)
    // Get NewContentCreated event and get tokenId
    const receipt2 = await tx2.wait();
    const tokenId2 = receipt2.events[0].args[2].toNumber();
    // You need to use all parts of the content to buy it. Get all parts of the content
    const parts1 = await contractUDAOContent.getContentParts(tokenId1);
    const parts2 = await contractUDAOContent.getContentParts(tokenId2);
    // Make a content purchase
    const purchasedParts1 = [parts1];
    const purchasedParts2 = [parts2];
    const giftReceiver = [ethers.constants.AddressZero];
    // Send UDAO to the buyer's wallet
    await contractUDAO.transfer(contentBuyer.address, ethers.utils.parseEther("100.0"));
    // Give approval to the platformtreasury
    await contractUDAO.connect(contentBuyer).approve(contractPlatformTreasury.address, ethers.utils.parseEther("999999999999.0"));
    const balanceBefore = await contractUDAO.balanceOf(contentBuyer.address);
    // Buy the content 1
    await contractPlatformTreasury.connect(contentBuyer).buyContent([tokenId1], purchasedParts1, giftReceiver);
    // Buy the content 2
    await contractPlatformTreasury.connect(contentBuyer).buyContent([tokenId2], purchasedParts2, giftReceiver);
    // Check if the buyer has the content part
    const result1 = await contractPlatformTreasury.connect(contentBuyer).getOwnedParts(contentBuyer.address, tokenId1);
    expect(result1[0]).to.equal(purchasedParts1[0][0]);
    const result2 = await contractPlatformTreasury.connect(contentBuyer).getOwnedParts(contentBuyer.address, tokenId2);
    expect(result2[0]).to.equal(purchasedParts2[0][0]);
    // Check if the buyer paid the correct amount
    const balanceAfter = await contractUDAO.balanceOf(contentBuyer.address);
    expect(balanceBefore.sub(balanceAfter)).to.equal(contentPriceSet1.add(contentPriceSet2));
  });
});
