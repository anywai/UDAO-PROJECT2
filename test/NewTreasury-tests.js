const { expect } = require("chai");
const { ethers } = require("hardhat");
require("dotenv").config();

const {
  initTestEnv,
  assignContracts,
  batchDistributeTokens,
  batchApproveSpender,
} = require("../utils/setupTestEnv.js");
const { getVoucherHelpers } = require("../lib/newTreasuryVoucher");

const walletNames = [
  "backend",
  "foundation",
  "instructor1",
  "instructor2",
  "instructor3",
  "instructor4",
  "instructor5",
  "buyer1",
  "buyer2",
  "buyer3",
  "buyer4",
  "buyer5",
  "person1",
  "person2",
  "person3",
  "person4",
  "person5",
];
const contractNames = ["NewTreasury", "NewGovDummy", "MKT1", "MKT2"];

let snapshotId; // Use fixtures instead of manual snapshots Bir ara bak buna!

before(async () => {
  //Initialize wallet(signers) and contract labels, expose globally
  await initTestEnv({ walletNames, contractNames });
  //// ### DEPLOY LOGIC ### ////
  // Create Factory for MockERC20 contract and deploy MKT1 and MKT2 tokens
  const MockERC20Factory = await ethers.getContractFactory("contracts/newTreasury/MockERC20.sol:MockERC20");
  MKT1 = await MockERC20Factory.connect(backend).deploy("MockToken1", "MKT1", ethers.parseEther("100000"));
  MKT2 = await MockERC20Factory.connect(backend).deploy("MockToken2", "MKT2", ethers.parseEther("1000000"));
  await Promise.all([MKT1.waitForDeployment(), MKT2.waitForDeployment()]);

  // Create Factory for NewGovernanceTreasuryDummy contract and deploy it
  const NewGovernanceDummyFactory = await ethers.getContractFactory(
    "contracts/newTreasury/NewGovernanceTreasuryDummy.sol:NewGovernanceTreasuryDummy"
  );
  NewGovDummy = await NewGovernanceDummyFactory.connect(backend).deploy();
  await NewGovDummy.waitForDeployment();

  // Create Factory for NewTreasury contract and deploy it
  const NewTreasuryFactory = await ethers.getContractFactory("contracts/newTreasury/NewTreasury.sol:NewTreasury");
  NewTreasury = await NewTreasuryFactory.connect(backend).deploy(foundation.address, MKT1.target, NewGovDummy.target);
  await NewTreasury.waitForDeployment();

  // Expose contract(x) instances to contract(.x) scope and global(.x) scope
  assignContracts({
    MKT1,
    MKT2,
    NewTreasury,
    NewGovDummy,
  });

  // Distribute mock tokens to users and approve them for NewTreasury
  await batchDistributeTokens({
    token: MKT1,
    amount: "1000",
    spenderAddress: NewTreasury.target,
    walletList: walletNames,
  });
  await batchDistributeTokens({
    token: MKT2,
    amount: "1000",
    spenderAddress: NewTreasury.target,
    walletList: walletNames,
  });

  // Project-specific initialization logic
  await NewTreasury.connect(backend).setRefundWindow(19); // 1 gün
  //// ### END OF DEPLOY LOGIC ### ////
  // Take a snapshot of the current state
  snapshotId = await ethers.provider.send("evm_snapshot");
});

// EVM time utils for test-time manipulation:
// `now` holds timestamp, updatenow() refreshes it, fastForwardTime skip it()
let now;
async function updatenow() {
  const block = await ethers.provider.getBlock("latest");
  now = Number(block.timestamp);
}
async function fastForwardTime({ days = 0, hours = 0, minutes = 0, seconds = 0 }) {
  const totalSeconds = days * 86400 + hours * 3600 + minutes * 60 + seconds;
  await ethers.provider.send("evm_increaseTime", [totalSeconds]);
  await ethers.provider.send("evm_mine");
  await updatenow();
}
// Voucher helpers to avoid repetition in tests (createVH, buyVH, etc.)
let createVH, updateVH, buyVH, refundVH, refundByOwnerVH, withdrawVH;

async function createCourseHelper({ uri, withdrawers, redeemer, validUntil }) {
  const voucher = await createVH.signVoucher({
    uri,
    withdrawers,
    redeemer: redeemer.address,
    validUntil,
  });

  const currentCourseCounter = await NewTreasury.courseCounter();
  const nextCourseId = currentCourseCounter + 1n;

  const expectedStateIfReverted = {
    courseCounter: currentCourseCounter,
    uri: "",
    sellable: false,
    withdrawers: [],
  };

  const expectedStateIfSuccessful = {
    courseCounter: nextCourseId,
    uri,
    sellable: true,
    withdrawers,
  };

  const tx = await NewTreasury.connect(redeemer).createCourse(voucher);

  return {
    courseId: nextCourseId,
    redeemer: redeemer.address,
    tx,
    expectedStateIfReverted,
    expectedStateIfSuccessful,
  };
}

async function updateCourseHelper({ courseId, uri, sellable, withdrawers, redeemer, validUntil }) {
  const voucher = await updateVH.signVoucher({
    courseId,
    uri,
    sellable,
    withdrawers,
    redeemer: redeemer.address,
    validUntil,
  });

  const courseBefore = await NewTreasury.getCourse(courseId);
  const existingWithdrawers = await NewTreasury.getAuthorizedWithdrawers(courseId);

  const expectedStateIfReverted = {
    courseCounter: courseId,
    uri: courseBefore.uri,
    sellable: courseBefore.sellable,
    withdrawers: existingWithdrawers,
    isAuthorizedArray: existingWithdrawers.map(() => true),
  };

  const expectedStateIfSuccessful = {
    courseCounter: courseId,
    uri,
    sellable,
    withdrawers,
    isAuthorizedArray: withdrawers.map(() => true),
  };

  const tx = await NewTreasury.connect(redeemer).updateCourse(voucher);

  return {
    courseId,
    redeemer: redeemer.address,
    tx,
    expectedStateIfReverted,
    expectedStateIfSuccessful,
  };
}

async function expectCourseStateMatches(expected, courseId) {
  const courseCounter = await NewTreasury.courseCounter();
  expect(courseCounter).to.equal(expected.courseCounter);

  const course = await NewTreasury.getCourse(courseId);
  expect(course.uri).to.equal(expected.uri);
  expect(course.sellable).to.equal(expected.sellable);

  const actualWithdrawers = await NewTreasury.getAuthorizedWithdrawers(courseId);
  expect(actualWithdrawers).to.deep.equal(expected.withdrawers);

  if (expected.isAuthorizedArray) {
    for (let i = 0; i < expected.withdrawers.length; i++) {
      const w = expected.withdrawers[i];
      const expectedAuth = expected.isAuthorizedArray[i];
      const isAuth = await NewTreasury.isAuthorizedWithdrawer(w, courseId);
      expect(isAuth).to.equal(expectedAuth);
    }
  }
}

//// HELPERS ////

describe("NewTreasury Contract Tests", function () {
  // ethers v6 uses `.target` instead of `.address` for deployed contracts
  beforeEach(async function () {
    // Revert to snapshot and take a new one for next test
    await network.provider.send("evm_revert", [snapshotId]);
    snapshotId = await network.provider.send("evm_snapshot");
    // Repeted setup for every test
    ({ createVH, updateVH, buyVH, refundVH, refundByOwnerVH, withdrawVH } = getVoucherHelpers());
    await updatenow();
  });

  // Create Course Tests
  it("should create a course successfully yy", async function () {
    // 1) Create a new course using voucher and save returned data
    const create_course1 = await createCourseHelper({
      uri: "https://example.com/course/1",
      withdrawers: [instructor1.address, instructor2.address],
      redeemer: instructor1,
      validUntil: now + 86400,
    });

    await expect(create_course1.tx).to.emit(NewTreasury, "CourseCreated").withArgs(create_course1.courseId);

    await expectCourseStateMatches(create_course1.expectedStateIfSuccessful, create_course1.courseId);
  });

  it("should update a course successfully using a valid voucher", async function () {
    // Step 1: create course
    const create_course1 = await createCourseHelper({
      uri: "https://example.com/course/1",
      withdrawers: [instructor1.address, instructor2.address],
      redeemer: instructor1,
      validUntil: now + 86400,
    });

    await expect(create_course1.tx).to.emit(NewTreasury, "CourseCreated").withArgs(create_course1.courseId);

    await expectCourseStateMatches(create_course1.expectedStateIfSuccessful, create_course1.courseId);

    // Step 2: update course
    const update_course1 = await updateCourseHelper({
      courseId: create_course1.courseId,
      uri: "https://example.com/course/1New",
      sellable: false,
      withdrawers: [instructor1.address, instructor3.address],
      redeemer: instructor1,
      validUntil: now + 86400,
    });

    await expect(update_course1.tx).to.emit(NewTreasury, "CourseUpdated").withArgs(update_course1.courseId);

    await expectCourseStateMatches(update_course1.expectedStateIfSuccessful, update_course1.courseId);

    expect(await NewTreasury.isAuthorizedWithdrawer(instructor2.address, update_course1.courseId)).to.equal(false);

    // Step 1: instructor1 creates a course via CreateCourseVoucher
    // Step 2: instructor1 updates course via UpdateCourseVoucher
  });

  /*
  it("should create a course successfully xx", async function () {
    // 1) Create a new course using voucher and save returned data
    const course1Voucher = await createVH.signVoucher({
      uri: "https://example.com/course/1",
      withdrawers: [instructor1.address, instructor2.address],
      redeemer: instructor1.address,
      validUntil: now + 86400,
    });

    expect(await NewTreasury.connect(instructor1).createCourse(course1Voucher))
      .to.emit(NewTreasury, "CourseCreated")
      .withArgs(1n);

    // 3) Verify state updates after course creation
    // Verify courseCounter is incremented, should be 1 after first course
    const courseCounter = await NewTreasury.courseCounter();
    expect(courseCounter).to.equal(1);
    // Verify course metadata (uri and sellable flag)
    const [uri, sellable] = await NewTreasury.getCourse(1);
    expect(uri).to.equal(course1Voucher.uri);
    expect(sellable).to.equal(true);
    // Verify list of authorized withdrawers matches input
    const authorizedWithdrawers = await NewTreasury.getAuthorizedWithdrawers(1);
    expect(authorizedWithdrawers).to.deep.equal([instructor1.address, instructor2.address]);
    // Verify each withdrawer is individually authorized for this course
    for (const withdrawer of course1Voucher.withdrawers) {
      const isAuthorized = await NewTreasury.isAuthorizedWithdrawer(withdrawer, 1);
      expect(isAuthorized).to.equal(true);
    }
  }); 
  */

  /*
  async function performCreateCourse({ uri, withdrawers, redeemer, validUntil }) {
  const voucher = await createVH.signVoucher({
    uri,
    withdrawers,
    redeemer: redeemer.address,
    validUntil,
  });

  const tx = await NewTreasury.connect(redeemer).createCourse(voucher);
  const receipt = await tx.wait();

  const courseId = await NewTreasury.courseCounter();

  return {
    courseId,
    uri,
    withdrawers,
    redeemer: redeemer.address,
    receipt,
  };
}

async function performUpdateCourse({ courseId, sellable, uri, withdrawers, redeemer, validUntil }) {
  const voucher = await updateVH.signVoucher({
    courseId,
    sellable,
    uri,
    withdrawers,
    redeemer: redeemer.address,
    validUntil,
  });

  const tx = await NewTreasury.connect(redeemer).updateCourse(voucher);
  const receipt = await tx.wait();

  return {
    courseId,
    uri,
    withdrawers,
    redeemer: redeemer.address,
    receipt,
  };
}

function assertEventArgs(receipt, eventName, expected = {}, contract = NewTreasury) {
  const iface = contract.interface;
  const eventFragment = iface.getEvent(eventName);
  const topicHash = eventFragment.topicHash;

  const log = receipt.logs.find((log) => log.topics[0] === topicHash);
  expect(log, `Event "${eventName}" not found in receipt`).to.exist;

  const decodedArgs = iface.decodeEventLog(eventFragment, log.data, log.topics);

  for (const [key, expectedValue] of Object.entries(expected)) {
    const actualValue = decodedArgs[key];

    const expectedNormalized = typeof expectedValue === "bigint" ? expectedValue.toString() : expectedValue;
    const actualNormalized = typeof actualValue === "bigint" ? actualValue.toString() : actualValue;

    expect(actualNormalized, `Event "${eventName}" arg "${key}" mismatch`).to.equal(expectedNormalized);
  }

  return decodedArgs;
}
  
  it("should create a course successfully new versiyon", async function () {
    // 1) Create a new course using voucher and save returned data
    const course1 = await performCreateCourse({
      uri: "https://example.com/course/1",
      withdrawers: [instructor1.address, instructor2.address],
      redeemer: instructor1,
      validUntil: now + 86400,
    });

    // 2) Verify CourseCreated event was emitted with arguments
    assertEventArgs(course1.receipt, "CourseCreated", {
      courseId: 1n,
    });

    // 3) Verify state updates after course creation
    // Verify courseCounter is incremented, should be 1 after first course
    const courseCounter = await NewTreasury.courseCounter();
    expect(courseCounter).to.equal(1);
    // Verify course metadata (uri and sellable flag)
    const [uri, sellable] = await NewTreasury.getCourse(1);
    expect(uri).to.equal(course1.uri);
    expect(sellable).to.equal(true);
    // Verify list of authorized withdrawers matches input
    const authorizedWithdrawers = await NewTreasury.getAuthorizedWithdrawers(1);
    expect(authorizedWithdrawers).to.deep.equal([instructor1.address, instructor2.address]);
    // Verify each withdrawer is individually authorized for this course
    for (const withdrawer of course1.withdrawers) {
      const isAuthorized = await NewTreasury.isAuthorizedWithdrawer(withdrawer, 1);
      expect(isAuthorized).to.equal(true);
    }
  });
  */

  it("should allow a user to buy a course using a valid BuyCourseVoucher", async function () {
    const { createVH, buyVH } = getVoucherHelpers();

    // Step 1: Create course via instructor1
    const createVoucher = await createVH.signVoucher({
      uri: "https://example.com/course/1",
      withdrawers: [instructor1.address, instructor2.address],
      redeemer: instructor1.address,
      validUntil: now + 86400,
    });

    await NewTreasury.connect(instructor1).createCourse(createVoucher);

    // Step 2: buyer1 buys the course for person1 using voucher
    const courseId = 1;
    const coursePrice = ethers.parseEther("10");

    const buyVoucher = await buyVH.signVoucher({
      courseId,
      tokenAddress: MKT1.target,
      coursePrice,
      courseReceiver: person1.address,
      redeemer: buyer1.address,
      validUntil: now + 86400,
    });

    const tx = await NewTreasury.connect(buyer1).buyCourse(buyVoucher);
    const receipt = await tx.wait();

    // check event
    const iface = NewTreasury.interface;
    const eventTopic = iface.getEvent("ContentPurchased").topicHash;

    const purchaseLog = receipt.logs.find((log) => log.topics[0] === eventTopic);
    expect(purchaseLog).to.exist;

    const decoded = iface.decodeEventLog("ContentPurchased", purchaseLog.data, purchaseLog.topics);
    expect(decoded.courseId).to.equal(1);
    expect(decoded.contentReceiver).to.equal(person1.address);

    // verify ownership
    const hasCourse = await NewTreasury.hasOwnedCourse(person1.address, courseId);
    expect(hasCourse).to.equal(true);

    // verify payment info
    const paymentId = await NewTreasury.courseOwnerToPayment(person1.address, courseId);
    const payment = await NewTreasury.payments(paymentId);

    expect(payment.courseId).to.equal(courseId);
    expect(payment.courseReceiver).to.equal(person1.address);
    expect(payment.tokenAddress).to.equal(MKT1.target);
    expect(payment.totalAmount).to.equal(coursePrice);
    expect(payment.isRefunded).to.equal(false);
    expect(payment.isWithdrawn).to.equal(false);
  });

  it("should allow a course to be refunded using a valid RefundCourseVoucher", async function () {
    const { createVH, buyVH, refundVH } = getVoucherHelpers();

    // Step 1: instructor1 creates a course
    const createVoucher = await createVH.signVoucher({
      uri: "https://example.com/course/1",
      withdrawers: [instructor1.address, instructor2.address],
      redeemer: instructor1.address,
      validUntil: now + 86400,
    });

    await NewTreasury.connect(instructor1).createCourse(createVoucher);

    // Step 2: buyer1 buys course 1 for person1
    const courseId = 1;
    const coursePrice = ethers.parseEther("10");

    const buyVoucher = await buyVH.signVoucher({
      courseId,
      tokenAddress: MKT1.target,
      coursePrice,
      courseReceiver: person1.address,
      redeemer: buyer1.address,
      validUntil: now + 86400,
    });

    await NewTreasury.connect(buyer1).buyCourse(buyVoucher);

    // Step 3: instructor5 initiates refund on behalf of person1
    const paymentId = await NewTreasury.courseOwnerToPayment(person1.address, courseId);

    const refundVoucher = await refundVH.signVoucher({
      paymentId,
      redeemer: instructor5.address, // doesn't matter who redeems as long as voucher is valid
      validUntil: now + 86400,
    });

    const tx = await NewTreasury.connect(instructor5).refundCourse(refundVoucher);
    const receipt = await tx.wait();

    // Decode CourseRefunded event
    const iface = NewTreasury.interface;
    const topic = iface.getEvent("CourseRefunded").topicHash;
    const log = receipt.logs.find((l) => l.topics[0] === topic);
    expect(log).to.exist;

    const decoded = iface.decodeEventLog("CourseRefunded", log.data, log.topics);
    expect(decoded.paymentId).to.equal(paymentId);
    expect(decoded.courseId).to.equal(courseId);
    expect(decoded.courseReceiver).to.equal(person1.address);
    expect(decoded.tokenAddress).to.equal(MKT1.target);
    expect(decoded.payer).to.equal(buyer1.address);
    expect(decoded.amount).to.equal(coursePrice);

    // Confirm refund flags updated
    const payment = await NewTreasury.payments(paymentId);
    expect(payment.isRefunded).to.be.true;

    const ownsCourse = await NewTreasury.hasOwnedCourse(person1.address, courseId);
    expect(ownsCourse).to.equal(false);
  });

  it("should allow refund using RefundCourseByOwnerAndCourseIdVoucher", async function () {
    const { createVH, buyVH, refundByOwnerVH } = getVoucherHelpers();

    // Step 1: instructor1 creates a course
    const createVoucher = await createVH.signVoucher({
      uri: "https://example.com/course/1",
      withdrawers: [instructor1.address],
      redeemer: instructor1.address,
      validUntil: now + 86400,
    });

    await NewTreasury.connect(instructor1).createCourse(createVoucher);

    // Step 2: buyer1 buys course for person1
    const courseId = 1;
    const coursePrice = ethers.parseEther("10");

    const buyVoucher = await buyVH.signVoucher({
      courseId,
      tokenAddress: MKT1.target,
      coursePrice,
      courseReceiver: person1.address,
      redeemer: buyer1.address,
      validUntil: now + 86400,
    });

    await NewTreasury.connect(buyer1).buyCourse(buyVoucher);

    // Step 3: instructor5 initiates refund using courseOwner + courseId
    const refundVoucher = await refundByOwnerVH.signVoucher({
      courseOwner: person1.address,
      courseId,
      redeemer: instructor5.address,
      validUntil: now + 86400,
    });

    // get paymentId from courseOwner and courseId before refund
    const paymentId = await NewTreasury.courseOwnerToPayment(person1.address, courseId);
    expect(paymentId).to.not.equal(0); // ensure payment exists

    const tx = await NewTreasury.connect(instructor5).refundCourseByOwnerAndCourseId(refundVoucher);
    const receipt = await tx.wait();

    // Decode CourseRefunded event
    const iface = NewTreasury.interface;
    const topic = iface.getEvent("CourseRefunded").topicHash;
    const log = receipt.logs.find((l) => l.topics[0] === topic);
    expect(log).to.exist;

    const decoded = iface.decodeEventLog("CourseRefunded", log.data, log.topics);
    expect(decoded.courseId).to.equal(courseId);
    expect(decoded.courseReceiver).to.equal(person1.address);
    expect(decoded.tokenAddress).to.equal(MKT1.target);
    expect(decoded.payer).to.equal(buyer1.address);
    expect(decoded.amount).to.equal(coursePrice);

    const ownsCourse = await NewTreasury.hasOwnedCourse(person1.address, courseId);
    expect(ownsCourse).to.equal(false);

    const payment = await NewTreasury.payments(paymentId);
    expect(payment.isRefunded).to.be.true;
  });

  it("should allow instructor1 to withdraw payments for sales 1 to 3", async function () {
    const latestBlock = await ethers.provider.getBlock("latest");
    const now = Number(latestBlock.timestamp);

    const { createVH, buyVH, withdrawVH } = getVoucherHelpers();

    // 1. instructor1 course oluşturur
    const createVoucher = await createVH.signVoucher({
      uri: "https://example.com/withdraw-course/1",
      withdrawers: [instructor1.address],
      redeemer: instructor1.address,
      validUntil: now + 86400,
    });

    await NewTreasury.connect(instructor1).createCourse(createVoucher);

    const courseId = 1;
    const price = ethers.parseEther("10");
    const validUntil = now + 86400;

    const buyers = [buyer1, buyer2, buyer3, buyer4, buyer5];
    const receivers = [person1, person2, person3, person4, person5];

    for (let i = 0; i < 5; i++) {
      const buyVoucher = await buyVH.signVoucher({
        courseId,
        tokenAddress: MKT1.target,
        coursePrice: price,
        courseReceiver: receivers[i].address,
        redeemer: buyers[i].address,
        validUntil,
      });

      await NewTreasury.connect(buyers[i]).buyCourse(buyVoucher);
    }

    // 2. Zamanı ileri al: refund window sonlansın
    fastForwardTime({ days: 25 }); // 25 gün ileri al
    const withdrawDValidUntil = validUntil + 86400 * 25;

    // 3. Balance öncesi
    const instructorBalBefore = await MKT1.balanceOf(instructor1.address);
    const contractBalBefore = await MKT1.balanceOf(NewTreasury.target);

    // 4. Withdraw işlemi
    const withdrawVoucher = await withdrawVH.signVoucher({
      courseId,
      fromIndex: 1,
      toIndex: 3,
      redeemer: instructor1.address,
      validUntil: withdrawDValidUntil,
    });

    const tx = await NewTreasury.connect(instructor1).withdrawCoursePayments(withdrawVoucher);
    const receipt = await tx.wait();

    // Event kontrolü
    const iface = NewTreasury.interface;
    const topic = iface.getEvent("CoursePaymentsWithdrawn").topicHash;
    const log = receipt.logs.find((l) => l.topics[0] === topic);
    expect(log).to.exist;

    const decoded = iface.decodeEventLog("CoursePaymentsWithdrawn", log.data, log.topics);
    expect(decoded.courseId).to.equal(courseId);
    expect(decoded.fromIndex).to.equal(1n);
    expect(decoded.toIndex).to.equal(3n);
    expect(decoded.withdrawer).to.equal(instructor1.address);
    expect(decoded.withdrawnCompleted).to.equal(3n);

    // 5. Flag kontrolü
    for (let j = 1; j <= 3; j++) {
      const paymentId = await NewTreasury.courseSaleRecords(courseId, j);
      const payment = await NewTreasury.payments(paymentId);
      expect(payment.isWithdrawn).to.equal(true);
    }

    // 6. Balance fark kontrolü
    const instructorBalAfter = await MKT1.balanceOf(instructor1.address);
    const contractBalAfter = await MKT1.balanceOf(NewTreasury.target);

    const gained = instructorBalAfter - instructorBalBefore;
    const spent = contractBalBefore - contractBalAfter;

    expect(gained).to.be.gt(0n);
    expect(spent).to.be.gt(0n);
    expect(gained).to.be.lt(spent); // çünkü contract → foundation + governance da gönderdi

    // 7. checkWithdrawStatus ile kontrol
    const [refunded, withdrawn, inWindow, ready] = await NewTreasury.checkWithdrawStatus(courseId, 1, 3);

    expect(withdrawn.map(Number)).to.deep.equal([1, 2, 3]);
    expect(refunded.length).to.equal(0);
    expect(inWindow.length).to.equal(0);
    expect(ready.length).to.equal(0);
  });

  it("should allow instructor1 to withdraw payments from mixed tokens (MKT1, MKT2, ETH)", async function () {
    const latestBlock = await ethers.provider.getBlock("latest");
    const now = Number(latestBlock.timestamp);

    const { createVH, buyVH, withdrawVH } = getVoucherHelpers();

    // 1. instructor1 creates a course
    const createVoucher = await createVH.signVoucher({
      uri: "https://example.com/mixed-course/1",
      withdrawers: [instructor1.address],
      redeemer: instructor1.address,
      validUntil: now + 86400,
    });

    await NewTreasury.connect(instructor1).createCourse(createVoucher);

    const courseId = 1;
    const validUntil = now + 86400;

    // === Sales ===
    // buyer1 buys for person1 with 10 MKT1
    const buyVoucher1 = await buyVH.signVoucher({
      courseId,
      tokenAddress: MKT1.target,
      coursePrice: ethers.parseEther("10"),
      courseReceiver: person1.address,
      redeemer: buyer1.address,
      validUntil,
    });
    await NewTreasury.connect(buyer1).buyCourse(buyVoucher1);

    // buyer2 buys for person2 with 5 MKT2
    const buyVoucher2 = await buyVH.signVoucher({
      courseId,
      tokenAddress: MKT2.target,
      coursePrice: ethers.parseEther("5"),
      courseReceiver: person2.address,
      redeemer: buyer2.address,
      validUntil,
    });
    await NewTreasury.connect(buyer2).buyCourse(buyVoucher2);

    // buyer3 buys for person3 with 10 ETH
    const buyVoucher3 = await buyVH.signVoucher({
      courseId,
      tokenAddress: ethers.ZeroAddress,
      coursePrice: ethers.parseEther("10"),
      courseReceiver: person3.address,
      redeemer: buyer3.address,
      validUntil,
    });
    await NewTreasury.connect(buyer3).buyCourse(buyVoucher3, {
      value: ethers.parseEther("10"),
    });

    // buyer4 buys for person4 with 10 ETH
    const buyVoucher4 = await buyVH.signVoucher({
      courseId,
      tokenAddress: ethers.ZeroAddress,
      coursePrice: ethers.parseEther("10"),
      courseReceiver: person4.address,
      redeemer: buyer4.address,
      validUntil,
    });
    await NewTreasury.connect(buyer4).buyCourse(buyVoucher4, {
      value: ethers.parseEther("10"),
    });

    // buyer5 buys for person5 with 10 ETH
    const buyVoucher5 = await buyVH.signVoucher({
      courseId,
      tokenAddress: ethers.ZeroAddress,
      coursePrice: ethers.parseEther("10"),
      courseReceiver: person5.address,
      redeemer: buyer5.address,
      validUntil,
    });
    await NewTreasury.connect(buyer5).buyCourse(buyVoucher5, {
      value: ethers.parseEther("10"),
    });

    // 2. Time travel after refund window
    fastForwardTime({ days: 25 }); // 25 gün ileri al

    // 3. Balances before
    const MKT1Before = await MKT1.balanceOf(instructor1.address);
    const MKT2Before = await MKT2.balanceOf(instructor1.address);
    const ethBefore = await ethers.provider.getBalance(instructor1.address);

    // 4. Withdraw 1 → 5
    const withdrawVoucher = await withdrawVH.signVoucher({
      courseId,
      fromIndex: 1,
      toIndex: 5,
      redeemer: instructor1.address,
      validUntil: validUntil + 86400 * 25,
    });

    const tx = await NewTreasury.connect(instructor1).withdrawCoursePayments(withdrawVoucher);
    const receipt = await tx.wait();

    // 5. Event kontrolü
    const iface = NewTreasury.interface;
    const topic = iface.getEvent("CoursePaymentsWithdrawn").topicHash;
    const log = receipt.logs.find((l) => l.topics[0] === topic);
    expect(log).to.exist;

    const decoded = iface.decodeEventLog("CoursePaymentsWithdrawn", log.data, log.topics);
    expect(decoded.courseId).to.equal(courseId);
    expect(decoded.fromIndex).to.equal(1n);
    expect(decoded.toIndex).to.equal(5n);
    expect(decoded.withdrawer).to.equal(instructor1.address);
    expect(decoded.withdrawnCompleted).to.equal(5n);
    // governance conract failing.

    // 6. Check flags
    for (let j = 1; j <= 5; j++) {
      const paymentId = await NewTreasury.courseSaleRecords(courseId, j);
      const payment = await NewTreasury.payments(paymentId);
      expect(payment.isWithdrawn).to.equal(true);
    }

    // 7. Withdraw status check
    const [refunded, withdrawn, inWindow, ready] = await NewTreasury.checkWithdrawStatus(courseId, 1, 5);
    expect(withdrawn.map(Number)).to.deep.equal([1, 2, 3, 4, 5]);
    expect(refunded.length).to.equal(0);
    expect(inWindow.length).to.equal(0);
    expect(ready.length).to.equal(0);

    // 8. Balance check
    const MKT1After = await MKT1.balanceOf(instructor1.address);
    const MKT2After = await MKT2.balanceOf(instructor1.address);
    const ethAfter = await ethers.provider.getBalance(instructor1.address);

    expect(MKT1After).to.be.gt(MKT1Before);
    expect(MKT2After).to.be.gt(MKT2Before);
    expect(ethAfter).to.be.gt(ethBefore); // withdraw sonrası eth arttı
  });

  // End of tests
});
