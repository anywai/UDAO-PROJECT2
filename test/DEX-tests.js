const { expect } = require("chai");
const hardhat = require("hardhat");
const { ethers } = hardhat;
const chai = require("chai");
const BN = require("bn.js");
const bn = require("bignumber.js");
const { Redeem } = require("../lib/Redeem");
const { LazyRole } = require("../lib/LazyRole");
const helpers = require("@nomicfoundation/hardhat-network-helpers");
const { deploy } = require("../lib/deployments");

require("dotenv").config();
const {
  WMATIC_ABI,
  NonFunbiblePositionABI,
  NonFunbiblePositionAddress,
  WMATICAddress,
} = require("../lib/abis");

bn.config({ EXPONENTIAL_AT: 999999, DECIMAL_PLACES: 40 });

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
  GOVERNANCE_ROLE = replace.GOVERNANCE_ROLE;
  BACKEND_ROLE = replace.BACKEND_ROLE;
  contractContractManager = replace.contractContractManager;
  account1 = replace.account1;
  account2 = replace.account2;
  account3 = replace.account3;
  contractPriceGetter = replace.contractPriceGetter;
  const reApplyValidatorRoles = [validator, validator1, validator2, validator3, validator4, validator5];
  const reApplyJurorRoles = [jurorMember, jurorMember1, jurorMember2, jurorMember3, jurorMember4];
  const VALIDATOR_ROLE = ethers.utils.keccak256(
    ethers.utils.toUtf8Bytes("VALIDATOR_ROLE")
  );
  const JUROR_ROLE = ethers.utils.keccak256(
    ethers.utils.toUtf8Bytes("JUROR_ROLE")
  );
  if (reApplyRolesViaVoucher) {
    for (let i = 0; i < reApplyValidatorRoles.length; i++) {
      await contractRoleManager.revokeRole(
        VALIDATOR_ROLE,
        reApplyValidatorRoles[i].address
      );
    }
    for (let i = 0; i < reApplyJurorRoles.length; i++) {
      await contractRoleManager.revokeRole(
        JUROR_ROLE,
        reApplyJurorRoles[i].address
      );
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
      await grantJurorRole(
        reApplyJurorRoles[i],
        contractRoleManager,
        contractUDAO,
        contractUDAOStaker,
        backend
      );
    }
  }
}
async function grantValidatorRole(
  account,
  contractRoleManager,
  contractUDAO,
  contractUDAOStaker,
  backend
) {
  await contractRoleManager.setKYC(account.address, true);
  await contractUDAO.transfer(
    account.address,
    ethers.utils.parseEther("100.0")
  );
  await contractUDAO
    .connect(account)
    .approve(
      contractUDAOStaker.address,
      ethers.utils.parseEther("999999999999.0")
    );

  // Staking
  await contractUDAOStaker
    .connect(account)
    .stakeForGovernance(ethers.utils.parseEther("10"), 30);
  await contractUDAOStaker.connect(account).applyForValidator();
  const lazyRole = new LazyRole({
    contract: contractUDAOStaker,
    signer: backend,
  });
  const role_voucher = await lazyRole.createVoucher(
    account.address,
    Date.now() + 999999999,
    0
  );
  await contractUDAOStaker.connect(account).getApproved(role_voucher);
}

async function grantJurorRole(
  account,
  contractRoleManager,
  contractUDAO,
  contractUDAOStaker,
  backend
) {
  await contractRoleManager.setKYC(account.address, true);
  await contractUDAO.transfer(
    account.address,
    ethers.utils.parseEther("100.0")
  );

  await contractUDAO
    .connect(account)
    .approve(
      contractUDAOStaker.address,
      ethers.utils.parseEther("999999999999.0")
    );

  // Staking

  await contractUDAOStaker
    .connect(account)
    .stakeForGovernance(ethers.utils.parseEther("10"), 30);
  await contractUDAOStaker.connect(account).applyForJuror();
  const lazyRole = new LazyRole({
    contract: contractUDAOStaker,
    signer: backend,
  });
  const role_voucher = await lazyRole.createVoucher(
    account.address,
    Date.now() + 999999999,
    1
  );
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
    .withArgs(
      ethers.BigNumber.from(0),
      ethers.BigNumber.from(1),
      validator1.address
    );
  await expect(contractSupervision.connect(validator2).assignValidation(1))
    .to.emit(contractSupervision, "ValidationAssigned")
    .withArgs(
      ethers.BigNumber.from(0),
      ethers.BigNumber.from(1),
      validator2.address
    );
  await expect(contractSupervision.connect(validator3).assignValidation(1))
    .to.emit(contractSupervision, "ValidationAssigned")
    .withArgs(
      ethers.BigNumber.from(0),
      ethers.BigNumber.from(1),
      validator3.address
    );
  await expect(contractSupervision.connect(validator4).assignValidation(1))
    .to.emit(contractSupervision, "ValidationAssigned")
    .withArgs(
      ethers.BigNumber.from(0),
      ethers.BigNumber.from(1),
      validator4.address
    );
  await expect(contractSupervision.connect(validator5).assignValidation(1))
    .to.emit(contractSupervision, "ValidationAssigned")
    .withArgs(
      ethers.BigNumber.from(0),
      ethers.BigNumber.from(1),
      validator5.address
    );

  await expect(contractSupervision.connect(validator1).sendValidation(1, true))
    .to.emit(contractSupervision, "ValidationResultSent")
    .withArgs(
      ethers.BigNumber.from(0),
      ethers.BigNumber.from(1),
      validator1.address,
      true
    );
  await expect(contractSupervision.connect(validator2).sendValidation(1, true))
    .to.emit(contractSupervision, "ValidationResultSent")
    .withArgs(
      ethers.BigNumber.from(0),
      ethers.BigNumber.from(1),
      validator2.address,
      true
    );
  await expect(contractSupervision.connect(validator3).sendValidation(1, true))
    .to.emit(contractSupervision, "ValidationResultSent")
    .withArgs(
      ethers.BigNumber.from(0),
      ethers.BigNumber.from(1),
      validator3.address,
      true
    );
  await expect(contractSupervision.connect(validator4).sendValidation(1, true))
    .to.emit(contractSupervision, "ValidationResultSent")
    .withArgs(
      ethers.BigNumber.from(0),
      ethers.BigNumber.from(1),
      validator4.address,
      true
    );
  await expect(contractSupervision.connect(validator5).sendValidation(1, false))
    .to.emit(contractSupervision, "ValidationResultSent")
    .withArgs(
      ethers.BigNumber.from(0),
      ethers.BigNumber.from(1),
      validator5.address,
      false
    );
  await expect(
    contractSupervision.connect(contentCreator).finalizeValidation(1)
  )
    .to.emit(contractSupervision, "ValidationEnded")
    .withArgs(ethers.BigNumber.from(0), ethers.BigNumber.from(1), true);
}

describe("Uniswap DEX Tests", function () {
  it("Should create a pool", async function () {
    await reDeploy(reApplyRolesViaVoucher = true, isDexRequired = true);

    // console.log("Deployed price getter");

    await helpers.time.increase(2);
    await helpers.time.increase(2);
    await helpers.time.increase(2);
    await helpers.time.increase(2);
    await helpers.time.increase(2);
    await helpers.time.increase(2);
    await helpers.time.increase(2);
    await helpers.time.increase(2);
    await helpers.time.increase(2);
    await helpers.time.increase(2);
    await helpers.time.increase(2);
    await helpers.time.increase(2);
    await helpers.time.increase(2);
    await helpers.time.increase(2);
    await helpers.time.increase(2);

    const out = await contractPriceGetter.getUdaoOut(
      ethers.utils.parseEther("1.0"),
      ethers.utils.keccak256(ethers.utils.toUtf8Bytes("eur"))
    );
    //console.log("Out is ", out);
  });

  it("Should buy the full content for someone else with USD", async function () {
    await reDeploy(reApplyRolesViaVoucher = true, isDexRequired = true);

    /// Set KYC
    await contractRoleManager.setKYC(contentCreator.address, true);
    await contractRoleManager.setKYC(contentBuyer.address, true);
    await contractRoleManager.setKYC(validator1.address, true);

    // Get the current block timestamp
    const block = await ethers.provider.getBlock("latest");
    // add some minutes to it and convert it to a BigNumber
    const futureBlock = block.timestamp + 1000;
    // convert it to a BigNumber
    const futureBlockBigNumber = ethers.BigNumber.from(futureBlock);

    /// Create content voucher
    const createContentVoucherSample = await new Redeem({
      contract: contractUDAOContent,
      signer: backend,
    }).createVoucher(
      futureBlockBigNumber,
      [10],
      0,
      "usd",
      "ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi",
      contentCreator.address,
      ethers.utils.parseEther("2"),
      "udao",
      coachingEnabled = true,
      coachingRefundable = true,
      redeemType = 1,
      validationScore = 1
    );

    /// Create content
    await expect(
      contractUDAOContent
        .connect(contentCreator)
        .createContent(createContentVoucherSample)
    )
      .to.emit(contractUDAOContent, "Transfer") // transfer from null address to minter
      .withArgs(
        "0x0000000000000000000000000000000000000000",
        contentCreator.address,
        0
      );
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
    const contentBuyerBalance = await contractUDAO.balanceOf(
      contentBuyer.address
    );
    //Balance of contentBuyer
    //console.log(
    //  "Balance of contentBuyer is     %lf",
    //  contentBuyerBalance.toString()
    //);
    /// Send UDAO to the buyer's wallet
    await contractUDAO.transfer(
      contentBuyer.address,
      ethers.utils.parseEther("3.0")
    );

    //New Balance of contentBuyer
    const contentBuyerNewBalance = await contractUDAO.balanceOf(
      contentBuyer.address
    );
    //console.log("New Balance of contentBuyer is: ", contentBuyerNewBalance.toString());

    /// Content buyer needs to give approval to the platformtreasury
    await contractUDAO
      .connect(contentBuyer)
      .approve(
        contractPlatformTreasury.address,
        ethers.utils.parseEther("3.0")
      );

    await expect(
      contractPlatformTreasury
        .connect(contentBuyer)
        .buyContent([0], [true], [[1]], [validator1.address])
    )
      .to.emit(contractPlatformTreasury, "ContentBought")
      .withArgs(0, [1], "886525018013279181", contentBuyer.address); // Content bought event

    const result = await contractPlatformTreasury
      .connect(contentBuyer)
      .getOwnedContent(validator1.address);

    //After Sale Balance of contentBuyer
    const contentBuyerAfterSaleBalance = await contractUDAO.balanceOf(
      contentBuyer.address
    );
    //console.log("After Sale Balance of contentBuyer is: ", contentBuyerAfterSaleBalance.toString());

    const spentUser = contentBuyerNewBalance.sub(contentBuyerAfterSaleBalance);
    //console.log("User how much spent: " + spentUser.toString());

    const numArray = result.map((x) => x.map((y) => y.toNumber()));
    expect(numArray).to.eql([[0, 0]]);

    //Calculated content price in UDAO for given BlockNumber and 10USD
    const calculatedContentPrice = 886525018013279181n;

    await expect(spentUser).to.equal(calculatedContentPrice);
  });

  it("Should a user able to buy a coaching with USD", async function () {
    await reDeploy(reApplyRolesViaVoucher = true, isDexRequired = true);
    /// Set KYC
    await contractRoleManager.setKYC(contentCreator.address, true);
    await contractRoleManager.setKYC(contentBuyer.address, true);

    // Get the current block timestamp
    const block = await ethers.provider.getBlock("latest");
    // add some minutes to it and convert it to a BigNumber
    const futureBlock = block.timestamp + 1000;
    // convert it to a BigNumber
    const futureBlockBigNumber = ethers.BigNumber.from(futureBlock);

    /// Create content voucher
    const createContentVoucherSample = await new Redeem({
      contract: contractUDAOContent,
      signer: backend,
    }).createVoucher(
      futureBlockBigNumber,
      [ethers.utils.parseEther("1"), ethers.utils.parseEther("1")],
      0,
      "udao",
      "ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi",
      contentCreator.address,
      [10],
      "usd",
      coachingEnabled = true,
      coachingRefundable = true,
      redeemType = 1,
      validationScore = 1
    );

    /// Create content
    await expect(
      contractUDAOContent
        .connect(contentCreator)
        .createContent(createContentVoucherSample)
    )
      .to.emit(contractUDAOContent, "Transfer") // transfer from null address to minter
      .withArgs(
        "0x0000000000000000000000000000000000000000",
        contentCreator.address,
        0
      );

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
    await contractUDAO.transfer(
      contentBuyer.address,
      ethers.utils.parseEther("3.0")
    );

    //New Balance of contentBuyer
    const contentBuyerNewBalance = await contractUDAO.balanceOf(
      contentBuyer.address
    );
    //console.log("New Balance of contentBuyer is: ", contentBuyerNewBalance.toString());

    /// Content buyer needs to give approval to the platformtreasury
    await contractUDAO
      .connect(contentBuyer)
      .approve(
        contractPlatformTreasury.address,
        ethers.utils.parseEther("3.0")
      );

    // Buy coaching
    const purchaseTx = await contractPlatformTreasury
      .connect(contentBuyer)
      .buyCoaching(0);
    const queueTxReceipt = await purchaseTx.wait();
    const queueTxEvent = queueTxReceipt.events.find(
      (e) => e.event == "CoachingBought"
    );

    //// Buy coaching
    //// await expect(
    ////   contractPlatformTreasury.connect(contentBuyer).buyCoaching(0) //, true, [1], validator1.address)
    //// )
    ////   .to.emit(contractPlatformTreasury, "ContentBought")
    ////   .withArgs(contentBuyer.address, 0, 1); // Content bought event

    const coachingId = queueTxEvent.args[2];
    // Get coaching struct
    const coachingStruct = await contractPlatformTreasury.coachingStructs(
      coachingId
    );
    // Check if returned learner address is the same as the buyer address
    expect(coachingStruct.learner).to.equal(contentBuyer.address);

    //After Sale Balance of contentBuyer
    const contentBuyerAfterSaleBalance = await contractUDAO.balanceOf(
      contentBuyer.address
    );
    //console.log("After Sale Balance of contentBuyer is: ", contentBuyerAfterSaleBalance.toString());

    const spentUser = contentBuyerNewBalance.sub(contentBuyerAfterSaleBalance);
    //console.log("User how much spent: " + spentUser.toString());

    //Calculated coaching price in UDAO for given BlockNumber and 10USD
    const calculatedCoachingPrice = 886525018013279181n;

    await expect(spentUser).to.equal(calculatedCoachingPrice);
  });
});
