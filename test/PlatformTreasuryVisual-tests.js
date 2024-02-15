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

///NEW FUNCTIONS
async function skipDays(_days) {
  const numBlocksToMine = Math.ceil((_days * 24 * 60 * 60) / 2);
  await hre.network.provider.send("hardhat_mine", [`0x${numBlocksToMine.toString(16)}`, "0x2"]);
}

async function calculateLockBalanceIndex(_refundWindow) {
  const block = await hre.ethers.provider.getBlock();
  const timeStampInDays = Math.floor(block.timestamp / 86400);
  const _lockBalanceIndex = timeStampInDays % _refundWindow;
  return _lockBalanceIndex;
}

async function getInstructorLockedBalanceArray(_refundWindow, _contentCreator) {
  let _instructorLockedBalanceArray = [];
  for (let i = 0; i < _refundWindow; i++) {
    _instructorLockedBalanceArray[i] = ethers.utils.formatEther(
      await contractPlatformTreasury.instLockedBalance(_contentCreator.address, i)
    );
  }
  return _instructorLockedBalanceArray;
}

async function getContentLockedBalanceArray(_refundWindow) {
  let _contentLockedBalanceArray = [];
  for (let i = 0; i < _refundWindow; i++) {
    _contentLockedBalanceArray[i] = ethers.utils.formatEther(await contractPlatformTreasury.contentCutLockedPool(i));
  }
  return _contentLockedBalanceArray;
}

async function getCoachingLockedBalanceArray(_refundWindow) {
  let _coachingLockedBalanceArray = [];
  for (let i = 0; i < _refundWindow; i++) {
    _coachingLockedBalanceArray[i] = ethers.utils.formatEther(await contractPlatformTreasury.coachingCutLockedPool(i));
  }
  return _coachingLockedBalanceArray;
}

async function getInstructorCurrentUnlockedRefundedBalances(_contentCreator) {
  const _currentBalanceInst = ethers.utils.formatEther(
    await contractPlatformTreasury.instBalance(contentCreator.address)
  );
  const [_unlockedBalanceInstBN, _refundendBalanceInstBN] =
    await contractPlatformTreasury.getWithdrawableBalanceInstructor(contentCreator.address);
  const _unlockedBalanceInst = ethers.utils.formatEther(_unlockedBalanceInstBN);
  const _refundendBalanceInst = ethers.utils.formatEther(_refundendBalanceInstBN);
  const _iRefBalance = ethers.utils.formatEther(
    await contractPlatformTreasury.instRefundedBalance(contentCreator.address)
  );
  if (_iRefBalance - _refundendBalanceInst != 0) {
    console.log("ERROR: getWithdarwableBalanceInstructor() is not working properly");
  }
  return [_currentBalanceInst, _unlockedBalanceInst, _refundendBalanceInst];
}

async function getContentCurrentRefundedBalances() {
  const _currentBalanceContent = ethers.utils.formatEther(await contractPlatformTreasury.contentCutPool());
  const _refundendBalanceContent = ethers.utils.formatEther(await contractPlatformTreasury.contentCutRefundedBalance());

  //Calculate the distributed content cuts
  const _totalRoleBalances = await getTotalRoleBalances();

  return [_currentBalanceContent, _refundendBalanceContent, _totalRoleBalances];
}
async function getCoachingCurrentRefundedBalances() {
  const _currentBalanceCoach = ethers.utils.formatEther(await contractPlatformTreasury.coachingCutPool());
  const _refundendBalanceCoach = ethers.utils.formatEther(await contractPlatformTreasury.coachingCutRefundedBalance());

  //Calculate the distributed content cuts
  const _totalRoleBalances = await getTotalRoleBalances();

  return [_currentBalanceCoach, _refundendBalanceCoach, _totalRoleBalances];
}

async function getTotalRoleBalances() {
  const _foundationBalance = await contractPlatformTreasury.foundationBalance();
  const _governanceBalance = await contractPlatformTreasury.governanceBalance();
  const _jurorBalance = await contractPlatformTreasury.jurorBalance();
  const _validatorBalance = await contractPlatformTreasury.validatorsBalance();
  const _sumOfBalances = ethers.utils.formatEther(
    _foundationBalance.add(_governanceBalance).add(_jurorBalance).add(_validatorBalance)
  );
  return _sumOfBalances;
}

/// @dev Console Log functions and declarations
let consoleLogOn = false;
let instroctorBalances_consoleLogOn = false;
let contentPool_consoleLogOn = false;
let coachingPool_consoleLogOn = false;
// Main colors
const colorRed = "\u001b[31m";
const colorGreen = "\u001b[32m";
const colorYellow = "\u001b[33m";
const colorBlue = "\u001b[34m";
const colorMagenta = "\u001b[35m";
const colorCyan = "\u001b[36m";

const colorMagenta_BackCyan = "\u001b[37;44m";
const colorReset = "\u001b[0m";

async function consoleLog_skipedDays(_days) {
  if (consoleLogOn) {
    console.log(colorMagenta, "----- " + _days + " day passed ----", colorReset);
  }
}
async function consoleLog_lockBalanceIndex(_lockBalanceIndex) {
  if (consoleLogOn) {
    console.log(" Today's Lock Balance Index: ", colorYellow, _lockBalanceIndex, colorReset);
  }
}
async function consoleLog_emptySpace() {
  if (consoleLogOn) {
    console.log("");
    console.log("");
  }
}
async function consoleLog_instructorLockedBalanceArray(_instructorLockedBalanceArray) {
  if (consoleLogOn && instroctorBalances_consoleLogOn) {
    console.log(colorRed, "Instructor", colorReset, "Locked Balance Array: ");
    console.log(_instructorLockedBalanceArray);
  }
}
async function consoleLog_contentLockedBalanceArray(_contentLockedBalanceArray) {
  if (consoleLogOn && contentPool_consoleLogOn) {
    console.log(colorBlue, "Content", colorReset, "Locked Balance Array: ");
    console.log(_contentLockedBalanceArray);
  }
}
async function consoleLog_coachingLockedBalanceArray(_coachingLockedBalanceArray) {
  if (consoleLogOn && coachingPool_consoleLogOn) {
    console.log(colorCyan, "Coaching", colorReset, "Locked Balance Array: ");
    console.log(_coachingLockedBalanceArray);
  }
}
async function consoleLog_instructorOtherBalances(_insCurrentB, _insUnlockedB, _insRefundedB) {
  if (consoleLogOn && instroctorBalances_consoleLogOn) {
    console.log(
      colorRed,
      "Instructor",
      colorReset,
      "Other Balances= ",
      "CurrentBalance:",
      colorYellow,
      _insCurrentB,
      colorReset,
      "RefundendBalance:",
      colorYellow,
      _insRefundedB,
      colorReset,
      "UnlockedBalance:",
      colorYellow,
      _insUnlockedB,
      colorReset
    );
  }
}
async function consoleLog_contentPoolOtherBalances(_contentCurrentB, _contentRefundedB, _totalRoleBalances) {
  if (consoleLogOn && contentPool_consoleLogOn) {
    console.log(
      colorBlue,
      "Content Pool",
      colorReset,
      "Other Balances= ",
      "CurrentBalance:",
      colorYellow,
      _contentCurrentB,
      colorReset,
      "RefundendBalance:",
      colorYellow,
      _contentRefundedB,
      colorReset,
      "++SummationOfRoleBalances:",
      colorGreen,
      _totalRoleBalances,
      colorReset
    );
  }
}
async function consoleLog_coachingPoolOtherBalances(_coachingCurrentB, _coachingRefundedB, _totalRoleBalances) {
  if (consoleLogOn && coachingPool_consoleLogOn) {
    console.log(
      colorCyan,
      "Coaching Pool",
      colorReset,
      "Other Balances= ",
      "CurrentBalance:",
      colorYellow,
      _coachingCurrentB,
      colorReset,
      "RefundendBalance:",
      colorYellow,
      _coachingRefundedB,
      colorReset,
      "++SummationOfRoleBalances:",
      colorGreen,
      _totalRoleBalances,
      colorReset
    );
  }
}

async function consoleLog_stageChange(_stage) {
  if (consoleLogOn) {
    console.log(colorMagenta_BackCyan, _stage, colorReset);
  }
}

describe("Platform Treasury Visual Tests", function () {
  it("Should platform balances must hold correct amount of token during repeated buy, refund, refundWindow change cycles", async function () {
    /// @note This test gives balances as a console log and do not check anything at all. its purpose is to see balance changes on the platform and it is totally manual.
    /// To show the console logs uncomment the console.log lines below
    //consoleLogOn = true;
    instroctorBalances_consoleLogOn = true;
    contentPool_consoleLogOn = true;
    coachingPool_consoleLogOn = true;

    /// Initial Setup of Platform for Test
    // re-deploy the contracts
    await reDeploy();
    // KYC content creator and content buyers
    await contractRoleManager.setKYC(contentCreator.address, true);
    await contractRoleManager.setKYC(contentBuyer1.address, true);
    await contractRoleManager.setKYC(contentBuyer2.address, true);
    await contractRoleManager.setKYC(contentBuyer3.address, true);
    await contractRoleManager.setKYC(validator1.address, true);
    await contractRoleManager.setKYC(validator2.address, true);
    await contractRoleManager.setKYC(validator3.address, true);
    await contractRoleManager.setKYC(validator4.address, true);
    await contractRoleManager.setKYC(validator5.address, true);

    // Set content&coaching cut percentages to work without fractional numbers (foundation, governance, juror, validator), 10000 = 10%
    await contractPlatformTreasury.connect(backend).setContentCuts(20000, 10000, 10000, 10000);
    await contractPlatformTreasury.connect(backend).setCoachCuts(20000, 10000, 10000, 10000);
    // Expect total cut now %50
    expect(await contractPlatformTreasury.contentTotalCut()).to.equal(50000);
    expect(await contractPlatformTreasury.coachTotalCut()).to.equal(50000);

    // Get the refund window in the first place
    const initialRefundWindow = (await contractPlatformTreasury.refundWindow()).toNumber();
    // Change refund window to 5 days to work with smaller locked balance arrays
    await contractPlatformTreasury.connect(backend).changeRefundWindow(5);
    let refundWindowC1 = (await contractPlatformTreasury.refundWindow()).toNumber();
    //Empty space
    consoleLog_emptySpace();
    if (consoleLogOn) {
      console.log(colorMagenta, "----REFUND WINDOW CHANGED----", colorReset);
      console.log("----New refund window is ", refundWindowC1, " days----");
    }
    // Wait end of previous refund window to eliminate precaution withdraw block on balances
    skipDays(initialRefundWindow);
    if (consoleLogOn) {
      console.log("----End of precaution withdrawal period ", initialRefundWindow, " day----");
    }

    /// Create Content
    // Content have 2 parts: 0,1 and creator is: contentCreator
    const contentParts = [0, 1];
    const redeemer = contentCreator;
    // Backend should suply to creater a create content voucher
    const createContentVoucherSample = await createContentVoucher(
      contractUDAOContent,
      backend,
      contentCreator,
      redeemer,
      contentParts,
      (redeemType = 1),
      (validationScore = 1)
    );
    // Instructor uses this voucher to Create Content on platform
    await expect(contractUDAOContent.connect(contentCreator).createContent(createContentVoucherSample))
      .to.emit(contractUDAOContent, "Transfer") // transfer from null address to minter
      .withArgs(ethers.constants.AddressZero, contentCreator.address, 1);

    /// Backend should supply to buyers a purchase voucher
    // Common parts in the purchase voucher will be used in all purchases
    const tokenIds = [1];
    const purchasedParts = [[1]];
    const giftReceiver = [ethers.constants.AddressZero];
    const fullContentPurchase = [false];
    const pricesToPay = [ethers.utils.parseEther("2")];
    const validUntil = Date.now() + 999999999;
    const userIds = ["c8d53630-233a-4f95-90cb-4df253ae9283"];

    ///////////////////////////////////////////////////////////////////////////////////////////////////
    /// Start of the Test

    ///////////////////////////////////////////////////////////////////////////////////////////////////
    /// 0- Balances at the beginning
    // Get "Locked Balances" arrays and "Current, Refunded, Unlocked" balances at the beginning
    const instLB_S0 = await getInstructorLockedBalanceArray(refundWindowC1, contentCreator);
    const contLB_S0 = await getContentLockedBalanceArray(refundWindowC1);
    const coachLB_S0 = await getCoachingLockedBalanceArray(refundWindowC1);
    const [iCurB_S0, iUnlockB_S0, iRefundB_S0] = await getInstructorCurrentUnlockedRefundedBalances(contentCreator);
    const [contCurB_S0, contRefundendB_S0, contSumRB_S0] = await getContentCurrentRefundedBalances();
    const [coachCurB_S0, coachRefundendB_S0, coachSumRB_S0] = await getCoachingCurrentRefundedBalances();

    // Console log the balances at the beginning
    //Empty space
    consoleLog_emptySpace();
    if (consoleLogOn) {
      console.log("Beginnig of the test, Refund Window is ", refundWindowC1);
    }
    //GetCurrentBlocksTimestamp
    const currentLockBalanceIndex_S0 = await calculateLockBalanceIndex(refundWindowC1);
    consoleLog_lockBalanceIndex(currentLockBalanceIndex_S0);
    //instrucor
    consoleLog_instructorLockedBalanceArray(instLB_S0);
    consoleLog_instructorOtherBalances(iCurB_S0, iUnlockB_S0, iRefundB_S0);
    //Content Pool
    consoleLog_contentLockedBalanceArray(contLB_S0);
    consoleLog_contentPoolOtherBalances(contCurB_S0, contRefundendB_S0, contSumRB_S0);
    //Coaching Pool
    consoleLog_coachingLockedBalanceArray(coachLB_S0);
    consoleLog_coachingPoolOtherBalances(coachCurB_S0, coachRefundendB_S0, coachSumRB_S0);

    ///////////////////////////////////////////////////////////////////////////////////////////////////
    /// 1- Make a content purchase
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
    // GET "Locked Balances" arrays and "Current, Unlocked, Refunded" balances after the 1st sale
    const instLB_S1 = await getInstructorLockedBalanceArray(refundWindowC1, contentCreator);
    const contLB_S1 = await getContentLockedBalanceArray(refundWindowC1);
    const coachLB_S1 = await getCoachingLockedBalanceArray(refundWindowC1);
    const [iCurB_S1, iUnlockB_S1, iRefundB_S1] = await getInstructorCurrentUnlockedRefundedBalances(contentCreator);
    const [contCurB_S1, contRefundendB_S1, contSumRB_S1] = await getContentCurrentRefundedBalances();
    const [coachCurB_S1, coachRefundendB_S1, coachSumRB_S1] = await getCoachingCurrentRefundedBalances();

    // Console log the balances after the 1st sale
    //Empty space
    consoleLog_emptySpace();
    consoleLog_stageChange("1ST Sale Completed");
    //GetCurrentBlocksTimestamp
    const currentLockBalanceIndex_S1 = await calculateLockBalanceIndex(refundWindowC1);
    consoleLog_lockBalanceIndex(currentLockBalanceIndex_S1);
    //instrucor
    consoleLog_instructorLockedBalanceArray(instLB_S1);
    consoleLog_instructorOtherBalances(iCurB_S1, iUnlockB_S1, iRefundB_S1);
    //Content Pool
    consoleLog_contentLockedBalanceArray(contLB_S1);
    consoleLog_contentPoolOtherBalances(contCurB_S1, contRefundendB_S1, contSumRB_S1);
    //Coaching Pool
    consoleLog_coachingLockedBalanceArray(coachLB_S1);
    consoleLog_coachingPoolOtherBalances(coachCurB_S1, coachRefundendB_S1, coachSumRB_S1);

    ///////////////////////////////////////////////////////////////////////////////////////////////////
    /// Skip 1 day
    skipDays(1);
    //Empty space
    consoleLog_emptySpace();
    //Console log the skipped days
    consoleLog_skipedDays(1);

    ///////////////////////////////////////////////////////////////////////////////////////////////////
    // 2- Make a new content purchase
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
    // GET "Locked Balances" arrays and "Current, Unlocked, Refunded" balances after the 2nd sale
    const instLB_S2 = await getInstructorLockedBalanceArray(refundWindowC1, contentCreator);
    const contLB_S2 = await getContentLockedBalanceArray(refundWindowC1);
    const coachLB_S2 = await getCoachingLockedBalanceArray(refundWindowC1);
    const [iCurB_S2, iUnlockB_S2, iRefundB_S2] = await getInstructorCurrentUnlockedRefundedBalances(contentCreator);
    const [contCurB_S2, contRefundendB_S2, contSumRB_S2] = await getContentCurrentRefundedBalances();
    const [coachCurB_S2, coachRefundendB_S2, coachSumRB_S2] = await getCoachingCurrentRefundedBalances();

    // Console log the balances after the 2nd sale
    //Empty space
    consoleLog_emptySpace();
    consoleLog_stageChange("2ND Sale Completed");
    //GetCurrentBlocksTimestamp
    const currentLockBalanceIndex_S2 = await calculateLockBalanceIndex(refundWindowC1);
    consoleLog_lockBalanceIndex(currentLockBalanceIndex_S2);
    //instrucor
    consoleLog_instructorLockedBalanceArray(instLB_S2);
    consoleLog_instructorOtherBalances(iCurB_S2, iUnlockB_S2, iRefundB_S2);
    //Content Pool
    consoleLog_contentLockedBalanceArray(contLB_S2);
    consoleLog_contentPoolOtherBalances(contCurB_S2, contRefundendB_S2, contSumRB_S2);
    //Coaching Pool
    consoleLog_coachingLockedBalanceArray(coachLB_S2);
    consoleLog_coachingPoolOtherBalances(coachCurB_S2, coachRefundendB_S2, coachSumRB_S2);

    ///////////////////////////////////////////////////////////////////////////////////////////////////
    // 2R- Refund the 2nd sale
    //Create RefundVoucher
    const refundVoucher = new RefundVoucher({
      contract: contractVoucherVerifier,
      signer: backend,
    });
    const refundType = 1; // 0 since refund is content
    //Voucher will be valid for 1 day
    const voucherValidUntil = Date.now() + 86400;
    const contentSaleId = 1; // 0 since only one content is created and sold
    const finalParts = []; // Empty since buyer had no parts
    const finalContents = []; // Empty since buyer had no co
    const refund_voucher = await refundVoucher.createVoucher(
      contentSaleId,
      contentCreator.address,
      finalParts,
      finalContents,
      voucherValidUntil
    );
    //Refund the content
    await expect(contractPlatformTreasury.connect(contentCreator).newRefundContent(refund_voucher))
      .to.emit(contractPlatformTreasury, "SaleRefunded")
      .withArgs(contentSaleId, refundType);
    // GET "Locked Balances" arrays and "Current, Unlocked, Refunded" balances after the refund of the 2nd sale
    const instLB_S2R = await getInstructorLockedBalanceArray(refundWindowC1, contentCreator);
    const contLB_S2R = await getContentLockedBalanceArray(refundWindowC1);
    const coachLB_S2R = await getCoachingLockedBalanceArray(refundWindowC1);
    const [iCurB_S2R, iUnlockB_S2R, iRefundB_S2R] = await getInstructorCurrentUnlockedRefundedBalances(contentCreator);
    const [contCurB_S2R, contRefundendB_S2R, contSumRB_S2R] = await getContentCurrentRefundedBalances();
    const [coachCurB_S2R, coachRefundendB_S2R, coachSumRB_S2R] = await getCoachingCurrentRefundedBalances();

    // Console log the balances after the refund of the 2nd sale
    //Empty space
    consoleLog_emptySpace();
    consoleLog_stageChange("2ND Sale Refunded");
    //GetCurrentBlocksTimestamp
    const currentLockBalanceIndex_S2R = await calculateLockBalanceIndex(refundWindowC1);
    consoleLog_lockBalanceIndex(currentLockBalanceIndex_S2R);
    //instrucor
    consoleLog_instructorLockedBalanceArray(instLB_S2R);
    consoleLog_instructorOtherBalances(iCurB_S2R, iUnlockB_S2R, iRefundB_S2R);
    //Content Pool
    consoleLog_contentLockedBalanceArray(contLB_S2R);
    consoleLog_contentPoolOtherBalances(contCurB_S2R, contRefundendB_S2R, contSumRB_S2R);
    //Coaching Pool
    consoleLog_coachingLockedBalanceArray(coachLB_S2R);
    consoleLog_coachingPoolOtherBalances(coachCurB_S2R, coachRefundendB_S2R, coachSumRB_S2R);

    ///////////////////////////////////////////////////////////////////////////////////////////////////
    // Skip 2 day
    skipDays(2);
    //Empty space
    consoleLog_emptySpace();
    //Console log the skipped days
    consoleLog_skipedDays(2);

    ///////////////////////////////////////////////////////////////////////////////////////////////////
    // 3- Make a new content purchase
    const redeemers3 = [contentBuyer3.address];
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
    // GET "Locked Balances" arrays and "Current, Unlocked, Refunded" balances after the 3rd sale
    const instLB_S3 = await getInstructorLockedBalanceArray(refundWindowC1, contentCreator);
    const contLB_S3 = await getContentLockedBalanceArray(refundWindowC1);
    const coachLB_S3 = await getCoachingLockedBalanceArray(refundWindowC1);
    const [iCurB_S3, iUnlockB_S3, iRefundB_S3] = await getInstructorCurrentUnlockedRefundedBalances(contentCreator);
    const [contCurB_S3, contRefundendB_S3, contSumRB_S3] = await getContentCurrentRefundedBalances();
    const [coachCurB_S3, coachRefundendB_S3, coachSumRB_S3] = await getCoachingCurrentRefundedBalances();

    // Console log the balances after the 3rd sale
    //Empty space
    consoleLog_emptySpace();
    consoleLog_stageChange("3RD Sale Completed");
    //GetCurrentBlocksTimestamp
    const currentLockBalanceIndex_S3 = await calculateLockBalanceIndex(refundWindowC1);
    consoleLog_lockBalanceIndex(currentLockBalanceIndex_S3);
    //instrucor
    consoleLog_instructorLockedBalanceArray(instLB_S3);
    consoleLog_instructorOtherBalances(iCurB_S3, iUnlockB_S3, iRefundB_S3);
    //Content Pool
    consoleLog_contentLockedBalanceArray(contLB_S3);
    consoleLog_contentPoolOtherBalances(contCurB_S3, contRefundendB_S3, contSumRB_S3);
    //Coaching Pool
    consoleLog_coachingLockedBalanceArray(coachLB_S3);
    consoleLog_coachingPoolOtherBalances(coachCurB_S3, coachRefundendB_S3, coachSumRB_S3);

    ///////////////////////////////////////////////////////////////////////////////////////////////////
    // Change refund window to 3 days to work to see the effect of the change
    await contractPlatformTreasury.connect(backend).changeRefundWindow(3);
    let refundWindowC2 = (await contractPlatformTreasury.refundWindow()).toNumber();
    //Empty space
    consoleLog_emptySpace();
    if (consoleLogOn) {
      console.log(colorMagenta, "----REFUND WINDOW CHANGED----", colorReset);
      console.log("----New refund window is ", refundWindowC2, " days----");
    }
    // wait end of previous refund window to eliminate precaution withdraw block on balances
    skipDays(refundWindowC1);
    if (consoleLogOn) {
      console.log("----End of precaution withdrawal period ", refundWindowC1, " day----");
    }

    ///////////////////////////////////////////////////////////////////////////////////////////////////
    // Skip 4 day
    skipDays(4);
    //Empty space
    consoleLog_emptySpace();
    //Console log the skipped days
    consoleLog_skipedDays(4);

    ///////////////////////////////////////////////////////////////////////////////////////////////////
    // 4- Make a new content purchase
    const purchasedPartsNew = [[0]];
    const redeemers4 = [contentBuyer1.address];
    await makeContentPurchase(
      contractPlatformTreasury,
      contractVoucherVerifier,
      contentBuyer1,
      contractRoleManager,
      contractUDAO,
      tokenIds,
      purchasedPartsNew,
      pricesToPay,
      fullContentPurchase,
      validUntil,
      redeemers4,
      giftReceiver,
      userIds
    );
    // GET "Locked Balances" arrays and "Current, Unlocked, Refunded" balances after the 4th sale
    const instLB_S4 = await getInstructorLockedBalanceArray(refundWindowC2, contentCreator);
    const contLB_S4 = await getContentLockedBalanceArray(refundWindowC2);
    const coachLB_S4 = await getCoachingLockedBalanceArray(refundWindowC2);
    const [iCurB_S4, iUnlockB_S4, iRefundB_S4] = await getInstructorCurrentUnlockedRefundedBalances(contentCreator);
    const [contCurB_S4, contRefundendB_S4, contSumRB_S4] = await getContentCurrentRefundedBalances();
    const [coachCurB_S4, coachRefundendB_S4, coachSumRB_S4] = await getCoachingCurrentRefundedBalances();

    // Console log the balances after the 4th sale
    //Empty space
    consoleLog_emptySpace();
    consoleLog_stageChange("4TH Sale Completed");
    //GetCurrentBlocksTimestamp
    const currentLockBalanceIndex_S4 = await calculateLockBalanceIndex(refundWindowC2);
    consoleLog_lockBalanceIndex(currentLockBalanceIndex_S4);
    //instrucor
    consoleLog_instructorLockedBalanceArray(instLB_S4);
    consoleLog_instructorOtherBalances(iCurB_S4, iUnlockB_S4, iRefundB_S4);
    //Content Pool
    consoleLog_contentLockedBalanceArray(contLB_S4);
    consoleLog_contentPoolOtherBalances(contCurB_S4, contRefundendB_S4, contSumRB_S4);
    //Coaching Pool
    consoleLog_coachingLockedBalanceArray(coachLB_S4);
    consoleLog_coachingPoolOtherBalances(coachCurB_S4, coachRefundendB_S4, coachSumRB_S4);

    ///////////////////////////////////////////////////////////////////////////////////////////////////
    // 4R- Refund the 4th sale
    //Create RefundVoucher
    const refundVoucher2 = new RefundVoucher({
      contract: contractVoucherVerifier,
      signer: backend,
    });
    const voucherValidUntil2 = Date.now() + 86400;
    const contentSaleId2 = 3; // 0 since only one content is created and sold
    const refund_voucher2 = await refundVoucher2.createVoucher(
      contentSaleId2,
      contentCreator.address,
      finalParts,
      finalContents,
      voucherValidUntil2
    );
    // Refund the content
    await expect(contractPlatformTreasury.connect(contentCreator).newRefundContent(refund_voucher2))
      .to.emit(contractPlatformTreasury, "SaleRefunded")
      .withArgs(contentSaleId2, refundType);
    // GET "Locked Balances" arrays and "Current, Unlocked, Refunded" balances after the refund of the 4th sale
    const instLB_S4R = await getInstructorLockedBalanceArray(refundWindowC2, contentCreator);
    const contLB_S4R = await getContentLockedBalanceArray(refundWindowC2);
    const coachLB_S4R = await getCoachingLockedBalanceArray(refundWindowC2);
    const [iCurB_S4R, iUnlockB_S4R, iRefundB_S4R] = await getInstructorCurrentUnlockedRefundedBalances(contentCreator);
    const [contCurB_S4R, contRefundendB_S4R, contSumRB_S4R] = await getContentCurrentRefundedBalances();
    const [coachCurB_S4R, coachRefundendB_S4R, coachSumRB_S4R] = await getCoachingCurrentRefundedBalances();

    // Console log the balances after the refund of the 4th sale
    //Empty space
    consoleLog_emptySpace();
    consoleLog_stageChange("4TH Sale Refunded");
    //GetCurrentBlocksTimestamp
    const currentLockBalanceIndex_S4R = await calculateLockBalanceIndex(refundWindowC2);
    consoleLog_lockBalanceIndex(currentLockBalanceIndex_S4R);
    //instrucor
    consoleLog_instructorLockedBalanceArray(instLB_S4R);
    consoleLog_instructorOtherBalances(iCurB_S4R, iUnlockB_S4R, iRefundB_S4R);
    //Content Pool
    consoleLog_contentLockedBalanceArray(contLB_S4R);
    consoleLog_contentPoolOtherBalances(contCurB_S4R, contRefundendB_S4R, contSumRB_S4R);
    //Coaching Pool
    consoleLog_coachingLockedBalanceArray(coachLB_S4R);
    consoleLog_coachingPoolOtherBalances(coachCurB_S4R, coachRefundendB_S4R, coachSumRB_S4R);

    ///////////////////////////////////////////////////////////////////////////////////////////////////
    // Skip 1 day
    skipDays(1);
    //Empty space
    consoleLog_emptySpace();
    //Console log the skipped days
    consoleLog_skipedDays(1);

    ///////////////////////////////////////////////////////////////////////////////////////////////////
    // 5- Make a new content purchase
    const redeemers5 = [contentBuyer2.address];
    await makeContentPurchase(
      contractPlatformTreasury,
      contractVoucherVerifier,
      contentBuyer2,
      contractRoleManager,
      contractUDAO,
      tokenIds,
      purchasedPartsNew,
      pricesToPay,
      fullContentPurchase,
      validUntil,
      redeemers5,
      giftReceiver,
      userIds
    );
    // GET "Locked Balances" arrays and "Current, Unlocked, Refunded" balances after the 5th sale
    const instLB_S5 = await getInstructorLockedBalanceArray(refundWindowC2, contentCreator);
    const contLB_S5 = await getContentLockedBalanceArray(refundWindowC2);
    const coachLB_S5 = await getCoachingLockedBalanceArray(refundWindowC2);
    const [iCurB_S5, iUnlockB_S5, iRefundB_S5] = await getInstructorCurrentUnlockedRefundedBalances(contentCreator);
    const [contCurB_S5, contRefundendB_S5, contSumRB_S5] = await getContentCurrentRefundedBalances();
    const [coachCurB_S5, coachRefundendB_S5, coachSumRB_S5] = await getCoachingCurrentRefundedBalances();

    // Console log the balances after the 5th sale
    //Empty space
    consoleLog_emptySpace();
    consoleLog_stageChange("5TH Sale Completed");
    //GetCurrentBlocksTimestamp
    const currentLockBalanceIndex_S5 = await calculateLockBalanceIndex(refundWindowC2);
    consoleLog_lockBalanceIndex(currentLockBalanceIndex_S5);
    //instrucor
    consoleLog_instructorLockedBalanceArray(instLB_S5);
    consoleLog_instructorOtherBalances(iCurB_S5, iUnlockB_S5, iRefundB_S5);
    //Content Pool
    consoleLog_contentLockedBalanceArray(contLB_S5);
    consoleLog_contentPoolOtherBalances(contCurB_S5, contRefundendB_S5, contSumRB_S5);
    //Coaching Pool
    consoleLog_coachingLockedBalanceArray(coachLB_S5);
    consoleLog_coachingPoolOtherBalances(coachCurB_S5, coachRefundendB_S5, coachSumRB_S5);

    ///////////////////////////////////////////////////////////////////////////////////////////////////
    // Skip 2 day
    skipDays(2);
    //Empty space
    consoleLog_emptySpace();
    //Console log the skipped days
    consoleLog_skipedDays(2);

    ///////////////////////////////////////////////////////////////////////////////////////////////////
    // GET "Locked Balances" arrays and "Current, Unlocked, Refunded" balances before the withdrawal
    const instLB_W1 = await getInstructorLockedBalanceArray(refundWindowC2, contentCreator);
    const contLB_W1 = await getContentLockedBalanceArray(refundWindowC2);
    const coachLB_W1 = await getCoachingLockedBalanceArray(refundWindowC2);
    const [iCurB_W1, iUnlockB_W1, iRefundB_W1] = await getInstructorCurrentUnlockedRefundedBalances(contentCreator);
    const [contCurB_W1, contRefundendB_W1, contSumRB_W1] = await getContentCurrentRefundedBalances();
    const [coachCurB_W1, coachRefundendB_W1, coachSumRB_W1] = await getCoachingCurrentRefundedBalances();

    // Console log the balances before the withdrawal
    //Empty space
    consoleLog_emptySpace();
    if (consoleLogOn) {
      console.log(colorMagenta, "*****************************************************", colorReset);
    }
    if (consoleLogOn) {
      console.log(colorMagenta, "Before Withdraw", colorReset);
    }
    //GetCurrentBlocksTimestamp
    const currentLockBalanceIndex_W1 = await calculateLockBalanceIndex(refundWindowC2);
    consoleLog_lockBalanceIndex(currentLockBalanceIndex_W1);
    //instrucor
    consoleLog_instructorLockedBalanceArray(instLB_W1);
    consoleLog_instructorOtherBalances(iCurB_W1, iUnlockB_W1, iRefundB_W1);
    //Content Pool
    consoleLog_contentLockedBalanceArray(contLB_W1);
    consoleLog_contentPoolOtherBalances(contCurB_W1, contRefundendB_W1, contSumRB_W1);
    //Coaching Pool
    consoleLog_coachingLockedBalanceArray(coachLB_W1);
    consoleLog_coachingPoolOtherBalances(coachCurB_W1, coachRefundendB_W1, coachSumRB_W1);

    ///////////////////////////////////////////////////////////////////////////////////////////////////
    // Instructor withdraws his earnings
    const instructerBalanceBefore = await contractUDAO.balanceOf(contentCreator.address);
    await contractPlatformTreasury.connect(contentCreator).withdrawInstructor();
    const instructerBalanceAfter = await contractUDAO.balanceOf(contentCreator.address);
    let instructerBalanceChange = instructerBalanceAfter - instructerBalanceBefore;

    // console log the instructor balance change
    if (consoleLogOn) {
      console.log(colorMagenta, "*****************INSTRUCTOR WITHDRAW*****************", colorReset);
      console.log(
        colorRed,
        "Instructor",
        colorReset,
        "UDAO Balance change:",
        colorGreen,
        ethers.utils.formatEther(instructerBalanceChange.toString()),
        colorReset
      );
    }

    //GET "Locked Balances" arrays and "Current, Unlocked, Refunded" balances after the withdrawal
    const instLB_W2 = await getInstructorLockedBalanceArray(refundWindowC2, contentCreator);
    const contLB_W2 = await getContentLockedBalanceArray(refundWindowC2);
    const coachLB_W2 = await getCoachingLockedBalanceArray(refundWindowC2);
    const [iCurB_W2, iUnlockB_W2, iRefundB_W2] = await getInstructorCurrentUnlockedRefundedBalances(contentCreator);
    const [contCurB_W2, contRefundendB_W2, contSumRB_W2] = await getContentCurrentRefundedBalances();
    const [coachCurB_W2, coachRefundendB_W2, coachSumRB_W2] = await getCoachingCurrentRefundedBalances();

    // Console log the balances after the withdrawal
    //Empty space
    consoleLog_emptySpace();
    if (consoleLogOn) {
      console.log(colorMagenta, "After Withdraw", colorReset);
    }
    //GetCurrentBlocksTimestamp
    const currentLockBalanceIndex_W2 = await calculateLockBalanceIndex(refundWindowC2);
    consoleLog_lockBalanceIndex(currentLockBalanceIndex_W2);
    //instrucor
    consoleLog_instructorLockedBalanceArray(instLB_W2);
    consoleLog_instructorOtherBalances(iCurB_W2, iUnlockB_W2, iRefundB_W2);
    //Content Pool
    consoleLog_contentLockedBalanceArray(contLB_W2);
    consoleLog_contentPoolOtherBalances(contCurB_W2, contRefundendB_W2, contSumRB_W2);
    //Coaching Pool
    consoleLog_coachingLockedBalanceArray(coachLB_W2);
    consoleLog_coachingPoolOtherBalances(coachCurB_W2, coachRefundendB_W2, coachSumRB_W2);
    if (consoleLogOn) {
      console.log(colorMagenta, "*****************************************************", colorReset);
    }

    ///////////////////////////////////////////////////////////////////////////////////////////////////
    // 6- Make a new content purchase
    const redeemers6 = [contentBuyer3.address];
    await makeContentPurchase(
      contractPlatformTreasury,
      contractVoucherVerifier,
      contentBuyer3,
      contractRoleManager,
      contractUDAO,
      tokenIds,
      purchasedPartsNew,
      pricesToPay,
      fullContentPurchase,
      validUntil,
      redeemers6,
      giftReceiver,
      userIds
    );
    // GET "Locked Balances" arrays and "Current, Unlocked, Refunded" balances after the 6th sale
    const instLB_S6 = await getInstructorLockedBalanceArray(refundWindowC2, contentCreator);
    const contLB_S6 = await getContentLockedBalanceArray(refundWindowC2);
    const coachLB_S6 = await getCoachingLockedBalanceArray(refundWindowC2);
    const [iCurB_S6, iUnlockB_S6, iRefundB_S6] = await getInstructorCurrentUnlockedRefundedBalances(contentCreator);
    const [contCurB_S6, contRefundendB_S6, contSumRB_S6] = await getContentCurrentRefundedBalances();
    const [coachCurB_S6, coachRefundendB_S6, coachSumRB_S6] = await getCoachingCurrentRefundedBalances();

    // Console log the balances after the 6th sale
    //Empty space
    consoleLog_emptySpace();
    consoleLog_stageChange("6TH Sale Completed");
    //GetCurrentBlocksTimestamp
    const currentLockBalanceIndex_S6 = await calculateLockBalanceIndex(refundWindowC2);
    consoleLog_lockBalanceIndex(currentLockBalanceIndex_S6);
    //instrucor
    consoleLog_instructorLockedBalanceArray(instLB_S6);
    consoleLog_instructorOtherBalances(iCurB_S6, iUnlockB_S6, iRefundB_S6);
    //Content Pool
    consoleLog_contentLockedBalanceArray(contLB_S6);
    consoleLog_contentPoolOtherBalances(contCurB_S6, contRefundendB_S6, contSumRB_S6);
    //Coaching Pool
    consoleLog_coachingLockedBalanceArray(coachLB_S6);
    consoleLog_coachingPoolOtherBalances(coachCurB_S6, coachRefundendB_S6, coachSumRB_S6);

    ///////////////////////////////////////////////////////////////////////////////////////////////////
    // 6R- Refund the 6th sale
    //Create RefundVoucher
    const refundVoucher3 = new RefundVoucher({
      contract: contractVoucherVerifier,
      signer: backend,
    });
    const voucherValidUntil3 = Date.now() + 86400;
    const contentSaleId3 = 5; // 0 since only one content is created and sold
    const refund_voucher3 = await refundVoucher3.createVoucher(
      contentSaleId3,
      contentCreator.address,
      finalParts,
      finalContents,
      voucherValidUntil3
    );
    //Refund the content
    await expect(contractPlatformTreasury.connect(contentCreator).newRefundContent(refund_voucher3))
      .to.emit(contractPlatformTreasury, "SaleRefunded")
      .withArgs(contentSaleId3, refundType);
    // GET "Locked Balances" arrays and "Current, Unlocked, Refunded" balances after the refund of the 6th sale
    const instLB_S6R = await getInstructorLockedBalanceArray(refundWindowC2, contentCreator);
    const contLB_S6R = await getContentLockedBalanceArray(refundWindowC2);
    const coachLB_S6R = await getCoachingLockedBalanceArray(refundWindowC2);
    const [iCurB_S6R, iUnlockB_S6R, iRefundB_S6R] = await getInstructorCurrentUnlockedRefundedBalances(contentCreator);
    const [contCurB_S6R, contRefundendB_S6R, contSumRB_S6R] = await getContentCurrentRefundedBalances();
    const [coachCurB_S6R, coachRefundendB_S6R, coachSumRB_S6R] = await getCoachingCurrentRefundedBalances();

    // Console log the balances after the refund of the 6th sale
    //Empty space
    consoleLog_emptySpace();
    consoleLog_stageChange("6TH Sale Refunded");
    //GetCurrentBlocksTimestamp
    const currentLockBalanceIndex_S6R = await calculateLockBalanceIndex(refundWindowC2);
    consoleLog_lockBalanceIndex(currentLockBalanceIndex_S6R);
    //instrucor
    consoleLog_instructorLockedBalanceArray(instLB_S6R);
    consoleLog_instructorOtherBalances(iCurB_S6R, iUnlockB_S6R, iRefundB_S6R);
    //Content Pool
    consoleLog_contentLockedBalanceArray(contLB_S6R);
    consoleLog_contentPoolOtherBalances(contCurB_S6R, contRefundendB_S6R, contSumRB_S6R);
    //Coaching Pool
    consoleLog_coachingLockedBalanceArray(coachLB_S6R);
    consoleLog_coachingPoolOtherBalances(coachCurB_S6R, coachRefundendB_S6R, coachSumRB_S6R);

    ///////////////////////////////////////////////////////////////////////////////////////////////////
    // Change refund window to 6 days to work to see the effect of the change
    await contractPlatformTreasury.connect(backend).changeRefundWindow(6);
    let refundWindowC3 = (await contractPlatformTreasury.refundWindow()).toNumber();
    //Empty space
    consoleLog_emptySpace();
    if (consoleLogOn) {
      console.log(colorMagenta, "----REFUND WINDOW CHANGED----", colorReset);
      console.log("----New refund window is ", refundWindowC3, " days----");
    }
    // No need to wait any precaution withdrawal period since the refund window is increased

    ///////////////////////////////////////////////////////////////////////////////////////////////////
    // 7- Make a new content purchase
    const redeemers7 = [validator1.address];
    await makeContentPurchase(
      contractPlatformTreasury,
      contractVoucherVerifier,
      validator1,
      contractRoleManager,
      contractUDAO,
      tokenIds,
      purchasedPartsNew,
      pricesToPay,
      fullContentPurchase,
      validUntil,
      redeemers7,
      giftReceiver,
      userIds
    );
    // GET "Locked Balances" arrays and "Current, Unlocked, Refunded" balances after the 7th sale
    const instLB_S7 = await getInstructorLockedBalanceArray(refundWindowC3, contentCreator);
    const contLB_S7 = await getContentLockedBalanceArray(refundWindowC3);
    const coachLB_S7 = await getCoachingLockedBalanceArray(refundWindowC3);
    const [iCurB_S7, iUnlockB_S7, iRefundB_S7] = await getInstructorCurrentUnlockedRefundedBalances(contentCreator);
    const [contCurB_S7, contRefundendB_S7, contSumRB_S7] = await getContentCurrentRefundedBalances();
    const [coachCurB_S7, coachRefundendB_S7, coachSumRB_S7] = await getCoachingCurrentRefundedBalances();

    // Console log the balances after the 7th sale
    //Empty space
    consoleLog_emptySpace();
    consoleLog_stageChange("7TH Sale Completed");
    //GetCurrentBlocksTimestamp
    const currentLockBalanceIndex_S7 = await calculateLockBalanceIndex(refundWindowC3);
    consoleLog_lockBalanceIndex(currentLockBalanceIndex_S7);
    //instrucor
    consoleLog_instructorLockedBalanceArray(instLB_S7);
    consoleLog_instructorOtherBalances(iCurB_S7, iUnlockB_S7, iRefundB_S7);
    //Content Pool
    consoleLog_contentLockedBalanceArray(contLB_S7);
    consoleLog_contentPoolOtherBalances(contCurB_S7, contRefundendB_S7, contSumRB_S7);
    //Coaching Pool
    consoleLog_coachingLockedBalanceArray(coachLB_S7);
    consoleLog_coachingPoolOtherBalances(coachCurB_S7, coachRefundendB_S7, coachSumRB_S7);

    ///////////////////////////////////////////////////////////////////////////////////////////////////
    // Skip 1 day
    skipDays(1);
    //Empty space
    consoleLog_emptySpace();
    //Console log the skipped days
    consoleLog_skipedDays(1);

    ///////////////////////////////////////////////////////////////////////////////////////////////////
    // 8- Make a new content purchase
    const redeemers8 = [validator2.address];
    await makeContentPurchase(
      contractPlatformTreasury,
      contractVoucherVerifier,
      validator2,
      contractRoleManager,
      contractUDAO,
      tokenIds,
      purchasedPartsNew,
      pricesToPay,
      fullContentPurchase,
      validUntil,
      redeemers8,
      giftReceiver,
      userIds
    );
    // GET "Locked Balances" arrays and "Current, Unlocked, Refunded" balances after the 8th sale
    const instLB_S8 = await getInstructorLockedBalanceArray(refundWindowC3, contentCreator);
    const contLB_S8 = await getContentLockedBalanceArray(refundWindowC3);
    const coachLB_S8 = await getCoachingLockedBalanceArray(refundWindowC3);
    const [iCurB_S8, iUnlockB_S8, iRefundB_S8] = await getInstructorCurrentUnlockedRefundedBalances(contentCreator);
    const [contCurB_S8, contRefundendB_S8, contSumRB_S8] = await getContentCurrentRefundedBalances();
    const [coachCurB_S8, coachRefundendB_S8, coachSumRB_S8] = await getCoachingCurrentRefundedBalances();

    // Console log the balances after the 8th sale
    //Empty space
    consoleLog_emptySpace();
    consoleLog_stageChange("8TH Sale Completed");
    //GetCurrentBlocksTimestamp
    const currentLockBalanceIndex_S8 = await calculateLockBalanceIndex(refundWindowC3);
    consoleLog_lockBalanceIndex(currentLockBalanceIndex_S8);
    //instrucor
    consoleLog_instructorLockedBalanceArray(instLB_S8);
    consoleLog_instructorOtherBalances(iCurB_S8, iUnlockB_S8, iRefundB_S8);
    //Content Pool
    consoleLog_contentLockedBalanceArray(contLB_S8);
    consoleLog_contentPoolOtherBalances(contCurB_S8, contRefundendB_S8, contSumRB_S8);
    //Coaching Pool
    consoleLog_coachingLockedBalanceArray(coachLB_S8);
    consoleLog_coachingPoolOtherBalances(coachCurB_S8, coachRefundendB_S8, coachSumRB_S8);

    ///////////////////////////////////////////////////////////////////////////////////////////////////
    // 8R- Refund the 8th sale
    //Create RefundVoucher
    const refundVoucher4 = new RefundVoucher({
      contract: contractVoucherVerifier,
      signer: backend,
    });
    const voucherValidUntil4 = Date.now() + 86400;
    const contentSaleId4 = 7; // 0 since only one content is created and sold
    const refund_voucher4 = await refundVoucher4.createVoucher(
      contentSaleId4,
      contentCreator.address,
      finalParts,
      finalContents,
      voucherValidUntil4
    );
    //Refund the content
    await expect(contractPlatformTreasury.connect(contentCreator).newRefundContent(refund_voucher4))
      .to.emit(contractPlatformTreasury, "SaleRefunded")
      .withArgs(contentSaleId4, refundType);
    // GET "Locked Balances" arrays and "Current, Unlocked, Refunded" balances after the refund of the 8th sale
    const instLB_S8R = await getInstructorLockedBalanceArray(refundWindowC3, contentCreator);
    const contLB_S8R = await getContentLockedBalanceArray(refundWindowC3);
    const coachLB_S8R = await getCoachingLockedBalanceArray(refundWindowC3);
    const [iCurB_S8R, iUnlockB_S8R, iRefundB_S8R] = await getInstructorCurrentUnlockedRefundedBalances(contentCreator);
    const [contCurB_S8R, contRefundendB_S8R, contSumRB_S8R] = await getContentCurrentRefundedBalances();
    const [coachCurB_S8R, coachRefundendB_S8R, coachSumRB_S8R] = await getCoachingCurrentRefundedBalances();

    // Console log the balances after the refund of the 8th sale
    //Empty space
    consoleLog_emptySpace();
    consoleLog_stageChange("8TH Sale Refunded");
    //GetCurrentBlocksTimestamp
    const currentLockBalanceIndex_S8R = await calculateLockBalanceIndex(refundWindowC3);
    consoleLog_lockBalanceIndex(currentLockBalanceIndex_S8R);
    //instrucor
    consoleLog_instructorLockedBalanceArray(instLB_S8R);
    consoleLog_instructorOtherBalances(iCurB_S8R, iUnlockB_S8R, iRefundB_S8R);
    //Content Pool
    consoleLog_contentLockedBalanceArray(contLB_S8R);
    consoleLog_contentPoolOtherBalances(contCurB_S8R, contRefundendB_S8R, contSumRB_S8R);
    //Coaching Pool
    consoleLog_coachingLockedBalanceArray(coachLB_S8R);
    consoleLog_coachingPoolOtherBalances(coachCurB_S8R, coachRefundendB_S8R, coachSumRB_S8R);

    ///////////////////////////////////////////////////////////////////////////////////////////////////
  });
});
