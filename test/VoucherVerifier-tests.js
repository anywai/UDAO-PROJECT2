const { expect } = require("chai");
const hardhat = require("hardhat");
const { ethers } = hardhat;
const chai = require("chai");
const BN = require("bn.js");
const { DiscountedPurchase } = require("../lib/DiscountedPurchase");
const { RefundVoucher } = require("../lib/RefundVoucher");
const { Redeem } = require("../lib/Redeem");
const { LazyCoaching } = require("../lib/LazyCoaching");
const helpers = require("@nomicfoundation/hardhat-network-helpers");
const { deploy } = require("../lib/deployments");

// Enable and inject BN dependency
chai.use(require("chai-bn")(BN));

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
  contractPlatformTreasury = replace.contractPlatformTreasury;
  contractSupervision = replace.contractSupervision;
  GOVERNANCE_ROLE = replace.GOVERNANCE_ROLE;
  BACKEND_ROLE = replace.BACKEND_ROLE;
  contractContractManager = replace.contractContractManager;
  account1 = replace.account1;
  account2 = replace.account2;
  account3 = replace.account3;
  contractVoucherVerifier = replace.contractVoucherVerifier;
  contractGovernanceTreasury = replace.contractGovernanceTreasury;
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

describe("Voucher Verifier", function () {
  it("Should deploy", async function () {
    await reDeploy();
  });

  it("Should allow backend to set update addresses", async function () {
    await reDeploy();
    const newRoleManagerAddress = contractRoleManager.address;

    await expect(contractVoucherVerifier.connect(backend).updateAddresses(newRoleManagerAddress))
      .to.emit(contractVoucherVerifier, "AddressesUpdated")
      .withArgs(newRoleManagerAddress);
  });

  it("Should allow foundation to update addresses after ownership of contract transfered", async function () {
    await reDeploy();
    const newRoleManagerAddress = contractRoleManager.address;

    await expect(contractVoucherVerifier.connect(foundation).updateAddresses(newRoleManagerAddress))
      .to.emit(contractVoucherVerifier, "AddressesUpdated")
      .withArgs(newRoleManagerAddress);
  });

  it("Should fail foundation-else or backend-else role to update addresses", async function () {
    await reDeploy();
    const newRoleManagerAddress = contractRoleManager.address;

    await expect(
      contractVoucherVerifier.connect(contentBuyer1).updateAddresses(newRoleManagerAddress)
    ).to.be.revertedWith("Only backend and contract manager can update addresses");
  });

  it("Should fail to verifyDiscountVoucher if voucher not signer by voucher verifier role", async function () {
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

    ///////////////////////MAKE CONTENT PURCHASE//////////////////////////
    contentBuyer = contentBuyer1;

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
        signer: contentBuyer1,
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
    /// Try to buy content and revert with "Signature invalid or unauthorized"
    const transaction = contractPlatformTreasury
      .connect(contentCreator)
      .buyContentWithDiscount(contentPurchaseVouchers);
    await expect(transaction).to.be.revertedWith("Signature invalid or unauthorized");

    const transaction2 = contractVoucherVerifier
      .connect(contentBuyer)
      .verifyDiscountVoucher(contentPurchaseVouchers[0]);
    await expect(transaction2).to.be.revertedWith("Signature invalid or unauthorized");
  });

  it("Should fail to verifyDiscountVoucher if voucher expired", async function () {
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
    const validUntil = 1000000;

    ///////////////////////MAKE CONTENT PURCHASE//////////////////////////
    contentBuyer = contentBuyer1;

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

    /// Try to buy content and revert with "Signature invalid or unauthorized"
    const transaction = contractPlatformTreasury
      .connect(contentCreator)
      .buyContentWithDiscount(contentPurchaseVouchers);
    await expect(transaction).to.be.revertedWith("Voucher has expired.");

    const transaction2 = contractVoucherVerifier
      .connect(contentBuyer)
      .verifyDiscountVoucher(contentPurchaseVouchers[0]);
    await expect(transaction2).to.be.revertedWith("Voucher has expired.");
  });

  it("Should fail to verifyRefundVoucher if voucher not signer by voucher verifier role", async function () {
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

    ///////////////////////MAKE CONTENT PURCHASE//////////////////////////
    contentBuyer = contentBuyer1;

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
    const balanceBefore = balanceBeforePurchase;
    const balanceAfter = balanceOfContentBuyer;

    /// TEST
    /// Check if the buyer has the content part
    const result = await contractPlatformTreasury.connect(contentBuyer1).getOwnedParts(contentBuyer1.address, tokenId);
    expect(result[0]).to.equal(purchasedParts[0][0]);
    const isFullyPurchased = await contractPlatformTreasury.isFullyPurchased(contentBuyer1.address, tokenId);

    expect(isFullyPurchased).to.equal(true);
    /// Get tokenId 0 price with calculatePriceToPay function
    const priceToPay = pricesToPay[0];
    /// Check if the buyer paid the correct amount
    expect(balanceBefore.sub(balanceAfter)).to.equal(priceToPay);
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
    // Create refund voucher
    const refund_voucher = await refundVoucher.createVoucher(
      contentSaleId,
      contentCreator.address,
      finalParts,
      finalContents,
      voucherValidUntil
    );
    // change the voucher and try to manipulate final parts
    refund_voucher.finalParts = [2, 3];

    // Refund the content
    const transaction = contractPlatformTreasury.connect(contentCreator).newRefundContent(refund_voucher);
    await expect(transaction).to.be.revertedWith("Signature invalid or unauthorized");
    const transaction2 = contractVoucherVerifier.connect(contentCreator).verifyRefundVoucher(refund_voucher);
    await expect(transaction2).to.be.revertedWith("Signature invalid or unauthorized");
  });

  it("Should fail to verifyCoachingVoucher if voucher not signer by voucher verifier role", async function () {
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
      signer: contentBuyer3,
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
    // change the voucher and try to manipulate coach
    role_voucher.coach = contentBuyer2.address;

    const transaction = contractPlatformTreasury.connect(contentBuyer).buyCoaching(role_voucher);
    await expect(transaction).to.be.revertedWith("Signature invalid or unauthorized");
    const transaction2 = contractVoucherVerifier.connect(contentBuyer).verifyCoachingVoucher(role_voucher);
    await expect(transaction2).to.be.revertedWith("Signature invalid or unauthorized");
  });
});
