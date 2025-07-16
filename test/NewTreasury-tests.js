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
  // Get current course counter to check against expected values
  const currentCourseCounter = await NewTreasury.courseCounter();
  // calculate next courseId based on current counter
  const nextCourseId = currentCourseCounter + 1n;

  const expectFail = {
    courseId: nextCourseId, // not yet created
    courseCounter: currentCourseCounter,
    uri: "",
    sellable: false,
    withdrawers: [],
  };

  const expectSuccess = {
    courseId: nextCourseId,
    courseCounter: currentCourseCounter + 1n, // incremented counter
    uri: uri,
    sellable: true,
    withdrawers: withdrawers,
  };

  const voucher = await createVH.signVoucher({
    uri,
    withdrawers,
    redeemer: redeemer.address,
    validUntil,
  });
  const tx = await NewTreasury.connect(redeemer).createCourse(voucher);

  return {
    courseId: nextCourseId,
    redeemer: redeemer.address,
    tx,
    expectFail,
    expectSuccess,
  };
}

async function updateCourseHelper({ courseId, uri, sellable, withdrawers, redeemer, validUntil }) {
  const courseCounter = await NewTreasury.courseCounter();
  const courseBefore = await NewTreasury.getCourse(courseId);
  const existingWithdrawers = await NewTreasury.getAuthorizedWithdrawers(courseId);

  const expectFail = {
    courseId: courseId,
    courseCounter: courseCounter,
    uri: courseBefore.uri,
    sellable: courseBefore.sellable,
    withdrawers: existingWithdrawers,
  };

  const expectSuccess = {
    courseId: courseId,
    courseCounter: courseCounter,
    uri: uri,
    sellable: sellable,
    withdrawers: withdrawers,
  };

  const voucher = await updateVH.signVoucher({
    courseId,
    uri,
    sellable,
    withdrawers,
    redeemer: redeemer.address,
    validUntil,
  });
  const tx = await NewTreasury.connect(redeemer).updateCourse(voucher);

  return {
    courseId: courseId,
    redeemer: redeemer.address,
    tx,
    expectFail,
    expectSuccess,
  };
}

async function expectCourse(expected, previousWithdrawers = []) {
  const courseCounter = await NewTreasury.courseCounter();
  expect(courseCounter).to.equal(expected.courseCounter);

  const courseId = expected.courseId;

  const course = await NewTreasury.getCourse(courseId);
  expect(course.uri).to.equal(expected.uri);
  expect(course.sellable).to.equal(expected.sellable);

  const actualWithdrawers = await NewTreasury.getAuthorizedWithdrawers(courseId);
  expect(actualWithdrawers).to.deep.equal(expected.withdrawers);

  // check expected withdrawers authorization
  for (const w of expected.withdrawers || []) {
    const isAuth = await NewTreasury.isAuthorizedWithdrawer(w, courseId);
    expect(isAuth).to.equal(true);
  }

  // check also previous withdrawers if removed revoked
  for (const oldW of previousWithdrawers) {
    if (!expected.withdrawers.includes(oldW)) {
      const isStillAuthorized = await NewTreasury.isAuthorizedWithdrawer(oldW, courseId);
      expect(isStillAuthorized).to.equal(false);
    } else {
      const isStillAuthorized = await NewTreasury.isAuthorizedWithdrawer(oldW, courseId);
      expect(isStillAuthorized).to.equal(true);
    }
  }

  return {
    courseId: courseId,
    uri: course.uri,
    sellable: course.sellable,
    withdrawers: actualWithdrawers,
  };
}

async function buyCourseHelper({ courseId, tokenAddress, coursePrice, courseReceiver, redeemer, validUntil }) {
  ///prepare expectations
  const currentPaymentCounter = await NewTreasury.paymentCounter();
  const currentSaleCounterPerCourse = await NewTreasury.saleCounterPerCourse(courseId);
  const currentOwnedCourses = await NewTreasury.getOwnedCourses(courseReceiver);
  const currentHasOwnedCourse = await NewTreasury.hasOwnedCourse(courseReceiver, courseId);
  const newPaymentId = currentPaymentCounter + 1n;
  const newCourseSpecificSaleId = currentSaleCounterPerCourse + 1n;

  const expectFail = {
    paymentId: newPaymentId, // yok, olmayan bir paymentId
    courseId: courseId, // alınmak istenen courseId
    courseSpecificSaleId: newCourseSpecificSaleId, // yok, satış gerçekleşmedi
    courseReceiver: courseReceiver, // alınmak istenen courseReceiver

    paymentCounter: currentPaymentCounter, // artmadı çünkü fail
    saleCounterOfCourse: currentSaleCounterPerCourse, // artmadı çünkü fail
    courseSaleRecords: 0, // ---> (courseId, saleCounterOfCourse) to paymentId so that 0

    courseOwnerToPayment: 0, // yok,
    ownedCoursesArrayOfReceiver: currentOwnedCourses, // değişmedi eski array
    ownedCourseIndexPlusOne: 0, // yok kurs arraye eklenmedi
    hasOwnedCourse: currentHasOwnedCourse, // eski durum korunur, satış yok değişim yok

    payment: {
      courseId: 0n,
      payer: ethers.ZeroAddress,
      courseReceiver: ethers.ZeroAddress,
      tokenAddress: ethers.ZeroAddress,
      totalAmount: 0n,
      instructorShare: 0n,
      foundationShare: 0n,
      governanceShare: 0n,
      endOfRefundWindow: 0n,
      isRefunded: false,
      isWithdrawn: false,
    },
  };

  const newOwnedCourses = currentOwnedCourses.length === 0 ? [0, courseId] : [...currentOwnedCourses, courseId];
  // 📌 COURSE CUT CALCULATION (same logic as contract)
  const isUdao = tokenAddress === (await NewTreasury.udaoTokenAddress());
  let foundCut, goverCut;
  if (isUdao) {
    foundCut = await NewTreasury.utFoundCut();
    goverCut = await NewTreasury.utGoverCut();
  } else {
    foundCut = await NewTreasury.atFoundCut();
    goverCut = await NewTreasury.atGoverCut();
  }
  const foundationShare = (coursePrice * foundCut) / 100000n;
  const governanceShare = (coursePrice * goverCut) / 100000n;
  const instructorShare = coursePrice - foundationShare - governanceShare;

  const refundWindow = await NewTreasury.refundWindow();

  const expectSuccess = {
    paymentId: newPaymentId, // valid, oluşturuldu
    courseId: courseId, // alınmak istenen courseId
    courseSpecificSaleId: newCourseSpecificSaleId, // valid, satış gerçekleşti
    courseReceiver: courseReceiver, // alınmak istenen courseReceiver

    paymentCounter: currentPaymentCounter + 1n, //inc counter ++
    saleCounterOfCourse: currentSaleCounterPerCourse + 1n, //inc counter ++
    courseSaleRecords: newPaymentId, // yeni paymentId'yi tutuyor

    courseOwnerToPayment: newPaymentId, // yeni paymentId'yi tutuyor
    ownedCoursesArrayOfReceiver: newOwnedCourses, // yeni array, alın++++++++++++++++++++++++++++++++++++an kurs eklendi
    ownedCourseIndexPlusOne: newOwnedCourses.length - 1, // bir indis değeri atandı
    hasOwnedCourse: true, // true, artık bu kursa sahip

    payment: {
      courseId: BigInt(courseId),
      payer: redeemer.address,
      courseReceiver: courseReceiver,
      tokenAddress: tokenAddress,
      totalAmount: coursePrice,
      instructorShare: instructorShare,
      foundationShare: foundationShare,
      governanceShare: governanceShare,
      endOfRefundWindow: BigInt(now) + refundWindow,
      isRefunded: false,
      isWithdrawn: false,
    },
  };

  // tx
  const buyVoucher = await buyVH.signVoucher({
    courseId: courseId,
    tokenAddress: tokenAddress,
    coursePrice: coursePrice,
    courseReceiver: courseReceiver,
    redeemer: redeemer.address,
    validUntil: validUntil,
  });
  const isNative = tokenAddress === ethers.ZeroAddress;
  const tx = await NewTreasury.connect(redeemer).buyCourse(buyVoucher, {
    value: isNative ? coursePrice : 0,
  });

  return {
    paymentId: newPaymentId,
    courseId: courseId,
    courseReceiver: courseReceiver,
    redeemer: redeemer.address,
    tx,
    expectFail,
    expectSuccess,
  };
}

async function expectBuy(expected) {
  const {
    paymentId,
    courseId,
    courseSpecificSaleId,
    courseReceiver,

    paymentCounter,
    saleCounterOfCourse,
    courseSaleRecords,

    courseOwnerToPayment,
    ownedCoursesArrayOfReceiver,
    ownedCourseIndexPlusOne,
    hasOwnedCourse,

    payment,
  } = expected;

  // 1. paymentCounter
  const actualCounter = await NewTreasury.paymentCounter();
  expect(actualCounter).to.equal(paymentCounter);

  // 2. payments[paymentId]
  const actualPayment = await NewTreasury.getPayment(paymentId);
  expect(actualPayment.courseId).to.equal(payment.courseId);
  expect(actualPayment.payer).to.equal(payment.payer);
  expect(actualPayment.courseReceiver).to.equal(payment.courseReceiver);
  expect(actualPayment.tokenAddress).to.equal(payment.tokenAddress);
  expect(actualPayment.totalAmount).to.equal(payment.totalAmount);
  expect(actualPayment.instructorShare).to.equal(payment.instructorShare);
  expect(actualPayment.foundationShare).to.equal(payment.foundationShare);
  expect(actualPayment.governanceShare).to.equal(payment.governanceShare);
  expect(actualPayment.isRefunded).to.equal(payment.isRefunded);
  expect(actualPayment.isWithdrawn).to.equal(payment.isWithdrawn);

  // refundWindow dinamik olduğu için ± toleransla kontrol
  const diff = BigInt(actualPayment.endOfRefundWindow) - BigInt(payment.endOfRefundWindow);
  expect(diff >= 0n && diff <= 120n).to.equal(true);

  // 3. saleCounterPerCourse
  const saleCounter = await NewTreasury.saleCounterPerCourse(courseId);
  expect(saleCounter).to.equal(saleCounterOfCourse);

  // 4. courseSaleRecords
  const saleRecord = await NewTreasury.courseSaleRecords(courseId, courseSpecificSaleId);
  expect(saleRecord).to.equal(courseSaleRecords);

  // 5. courseOwnerToPayment
  const courseOwnerPayment = await NewTreasury.courseOwnerToPayment(courseReceiver, courseId);
  expect(courseOwnerPayment).to.equal(courseOwnerToPayment);

  // 6. ownedCourses[receiver]
  const ownedCourses = await NewTreasury.getOwnedCourses(courseReceiver);
  expect(ownedCourses.map(Number)).to.deep.equal(ownedCoursesArrayOfReceiver.map(Number));

  // 7. ownedCourseIndexPlusOne
  const indexPlusOne = await NewTreasury.ownedCourseIndexPlusOne(courseReceiver, courseId);
  expect(indexPlusOne).to.equal(ownedCourseIndexPlusOne);

  // 8. hasOwnedCourse
  const hasOwned = await NewTreasury.hasOwnedCourse(courseReceiver, courseId);
  expect(hasOwned).to.equal(hasOwnedCourse);
}

async function refundCourseHelper({ paymentId, redeemer, validUntil }) {
  //tx create and use voucher
  const refundVoucher = await refundVH.signVoucher({
    paymentId,
    redeemer: redeemer.address,
    validUntil,
  });
  const tx = await NewTreasury.connect(redeemer).refundCourse(refundVoucher);

  return await _refundCoursesCommonHelper({ paymentId, redeemer, tx });
}

async function refundCourseByOwnerHelper({ courseOwner, courseId, redeemer, validUntil }) {
  // get paymentId from courseOwner + courseId
  const paymentId = await NewTreasury.courseOwnerToPayment(courseOwner, courseId);

  // create voucher and send tx
  const refundVoucher = await refundByOwnerVH.signVoucher({
    courseOwner,
    courseId,
    redeemer: redeemer.address,
    validUntil,
  });
  const tx = await NewTreasury.connect(redeemer).refundCourseByOwnerAndCourseId(refundVoucher);

  return await _refundCoursesCommonHelper({ paymentId, redeemer, tx });
}

async function _refundCoursesCommonHelper({ paymentId, redeemer, tx }) {
  // get current payment struct
  const paymentStruct = await NewTreasury.getPayment(paymentId);
  const {
    courseId,
    payer,
    courseReceiver,
    tokenAddress,
    totalAmount,
    instructorShare,
    foundationShare,
    governanceShare,
    endOfRefundWindow,
    isRefunded,
    isWithdrawn,
  } = paymentStruct;

  const courseOwnerToPaymentBefore = await NewTreasury.courseOwnerToPayment(courseReceiver, courseId);
  const ownedCoursesBefore = await NewTreasury.getOwnedCourses(courseReceiver);
  const indexPlusOneBefore = await NewTreasury.ownedCourseIndexPlusOne(courseReceiver, courseId);
  const hasOwnedBefore = await NewTreasury.hasOwnedCourse(courseReceiver, courseId);

  const expectFail = {
    paymentId: paymentId,
    courseId: courseId,
    courseReceiver: courseReceiver,

    courseOwnerToPayment: courseOwnerToPaymentBefore,
    ownedCoursesArrayOfReceiver: ownedCoursesBefore,
    ownedCourseIndexPlusOne: indexPlusOneBefore,
    hasOwnedCourse: hasOwnedBefore,

    payment: {
      courseId: courseId,
      payer: payer,
      courseReceiver: courseReceiver,
      tokenAddress: tokenAddress,
      totalAmount: totalAmount,
      instructorShare: instructorShare,
      foundationShare: foundationShare,
      governanceShare: governanceShare,
      endOfRefundWindow: endOfRefundWindow,
      isRefunded: isRefunded,
      isWithdrawn: isWithdrawn,
    },
  };

  //Başarılı satış ve iade:
  const newOwnedCourses = [...ownedCoursesBefore];
  if (indexPlusOneBefore > 0) {
    const index = Number(indexPlusOneBefore); // 1-based index
    const lastIndex = newOwnedCourses.length - 1;
    if (index !== lastIndex) {
      // swap with last
      newOwnedCourses[index] = newOwnedCourses[lastIndex];
    }
    // pop last
    newOwnedCourses.pop();
  }

  const expectSuccess = {
    paymentId: paymentId,
    courseId: courseId,
    courseReceiver: courseReceiver,

    courseOwnerToPayment: 0, // = 0 olmalı
    ownedCoursesArrayOfReceiver: newOwnedCourses,
    ownedCourseIndexPlusOne: 0, // = 0 olmalı
    hasOwnedCourse: false, // = false

    payment: {
      courseId: courseId,
      payer: payer,
      courseReceiver: courseReceiver,
      tokenAddress: tokenAddress,
      totalAmount: totalAmount,
      instructorShare: instructorShare,
      foundationShare: foundationShare,
      governanceShare: governanceShare,
      endOfRefundWindow: endOfRefundWindow,
      isRefunded: true,
      isWithdrawn: isWithdrawn,
    },
  };
  // aa
  return {
    paymentId: paymentId,
    courseId: courseId,
    courseReceiver: courseReceiver,
    coursePrice: totalAmount,
    tokenAddress: tokenAddress,
    payer: payer,
    redeemer: redeemer.address,
    tx,
    expectFail,
    expectSuccess,
  };
}

async function expectRefund(expected) {
  const {
    paymentId,
    courseId,
    courseReceiver,

    courseOwnerToPayment,
    ownedCoursesArrayOfReceiver,
    ownedCourseIndexPlusOne,
    hasOwnedCourse,

    payment,
  } = expected;

  // 2. payments[paymentId]
  const actualPayment = await NewTreasury.getPayment(paymentId);
  expect(actualPayment.courseId).to.equal(payment.courseId);
  expect(actualPayment.payer).to.equal(payment.payer);
  expect(actualPayment.courseReceiver).to.equal(payment.courseReceiver);
  expect(actualPayment.tokenAddress).to.equal(payment.tokenAddress);
  expect(actualPayment.totalAmount).to.equal(payment.totalAmount);
  expect(actualPayment.instructorShare).to.equal(payment.instructorShare);
  expect(actualPayment.foundationShare).to.equal(payment.foundationShare);
  expect(actualPayment.governanceShare).to.equal(payment.governanceShare);
  expect(actualPayment.isRefunded).to.equal(payment.isRefunded);
  expect(actualPayment.isWithdrawn).to.equal(payment.isWithdrawn);

  // refundWindow dinamik olduğu için ± toleransla kontrol
  const diff = BigInt(actualPayment.endOfRefundWindow) - BigInt(payment.endOfRefundWindow);
  expect(diff >= 0n && diff <= 120n).to.equal(true);

  // 5. courseOwnerToPayment
  const courseOwnerPayment = await NewTreasury.courseOwnerToPayment(courseReceiver, courseId);
  expect(courseOwnerPayment).to.equal(courseOwnerToPayment);

  // 6. ownedCourses[receiver]
  const ownedCourses = await NewTreasury.getOwnedCourses(courseReceiver);
  expect(ownedCourses.map(Number)).to.deep.equal(ownedCoursesArrayOfReceiver.map(Number));

  // 7. ownedCourseIndexPlusOne
  const indexPlusOne = await NewTreasury.ownedCourseIndexPlusOne(courseReceiver, courseId);
  expect(indexPlusOne).to.equal(ownedCourseIndexPlusOne);

  // 8. hasOwnedCourse
  const hasOwned = await NewTreasury.hasOwnedCourse(courseReceiver, courseId);
  expect(hasOwned).to.equal(hasOwnedCourse);
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

    const course1 = await expectCourse(create_course1.expectSuccess);
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

    const course1 = await expectCourse(create_course1.expectSuccess);

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

    const course1upd1 = await expectCourse(update_course1.expectSuccess);
    // Step 1: instructor1 creates a course via CreateCourseVoucher
    // Step 2: instructor1 updates course via UpdateCourseVoucher
  });

  it("should allow a user to buy a course using a valid BuyCourseVoucher", async function () {
    // 1. instructor1 creates a course
    const create_course1 = await createCourseHelper({
      uri: "https://example.com/course/1",
      withdrawers: [instructor1.address, instructor2.address],
      redeemer: instructor1,
      validUntil: now + 86400,
    });

    await expect(create_course1.tx).to.emit(NewTreasury, "CourseCreated").withArgs(create_course1.courseId);

    const course1 = await expectCourse(create_course1.expectSuccess);

    // 2. buyer1 buys the course for person1
    const buy_course1 = await buyCourseHelper({
      courseId: course1.courseId,
      tokenAddress: MKT1.target,
      coursePrice: ethers.parseEther("10"),
      courseReceiver: person1.address,
      redeemer: buyer1,
      validUntil: now + 86400,
    });

    await expect(buy_course1.tx)
      .to.emit(NewTreasury, "ContentPurchased")
      .withArgs(buy_course1.paymentId, buy_course1.courseId, buy_course1.courseReceiver);

    // 3. validate resulting state
    await expectBuy(buy_course1.expectSuccess);

    //
  });

  it("should allow a course to be refunded using a valid RefundCourseVoucher", async function () {
    // Step 1: instructor1 creates a course
    const create_course1 = await createCourseHelper({
      uri: "https://example.com/course/1",
      withdrawers: [instructor1.address, instructor2.address],
      redeemer: instructor1,
      validUntil: now + 86400,
    });

    await expect(create_course1.tx).to.emit(NewTreasury, "CourseCreated").withArgs(create_course1.courseId);

    await expectCourse(create_course1.expectSuccess);

    // 2. buyer1 buys course for person1
    const buy_course1 = await buyCourseHelper({
      courseId: create_course1.courseId,
      tokenAddress: MKT1.target,
      coursePrice: ethers.parseEther("10"),
      courseReceiver: person1.address,
      redeemer: buyer1,
      validUntil: now + 86400,
    });

    await expect(buy_course1.tx)
      .to.emit(NewTreasury, "ContentPurchased")
      .withArgs(buy_course1.paymentId, buy_course1.courseId, buy_course1.courseReceiver);

    await expectBuy(buy_course1.expectSuccess);

    // 3. instructor5 refunds the course on behalf of person1
    const refund_course1 = await refundCourseHelper({
      paymentId: buy_course1.paymentId,
      redeemer: instructor5,
      validUntil: now + 86400,
    });

    await expect(refund_course1.tx)
      .to.emit(NewTreasury, "CourseRefunded")
      .withArgs(
        refund_course1.paymentId,
        refund_course1.courseId,
        refund_course1.courseReceiver,
        refund_course1.coursePrice,
        refund_course1.tokenAddress,
        refund_course1.payer
      );

    await expectRefund(refund_course1.expectSuccess);
  });

  it("should allow refund using RefundCourseByOwnerAndCourseIdVoucher", async function () {
    // 1. instructor1 creates a course
    const create_course = await createCourseHelper({
      uri: "https://example.com/course/1",
      withdrawers: [instructor1.address],
      redeemer: instructor1,
      validUntil: now + 86400,
    });

    await expect(create_course.tx).to.emit(NewTreasury, "CourseCreated").withArgs(create_course.courseId);

    await expectCourse(create_course.expectSuccess);

    // 2. buyer1 buys course for person1
    const buy_course = await buyCourseHelper({
      courseId: create_course.courseId,
      tokenAddress: MKT1.target,
      coursePrice: ethers.parseEther("10"),
      courseReceiver: person1.address,
      redeemer: buyer1,
      validUntil: now + 86400,
    });

    await expect(buy_course.tx)
      .to.emit(NewTreasury, "ContentPurchased")
      .withArgs(buy_course.paymentId, buy_course.courseId, buy_course.courseReceiver);

    await expectBuy(buy_course.expectSuccess);

    // 3. instructor5 initiates refund using courseOwner + courseId
    const refund_course = await refundCourseByOwnerHelper({
      courseOwner: person1.address,
      courseId: buy_course.courseId,
      redeemer: instructor5,
      validUntil: now + 86400,
    });

    await expect(refund_course.tx)
      .to.emit(NewTreasury, "CourseRefunded")
      .withArgs(
        refund_course.paymentId,
        refund_course.courseId,
        refund_course.courseReceiver,
        refund_course.coursePrice,
        refund_course.tokenAddress,
        refund_course.payer
      );

    await expectRefund(refund_course.expectSuccess);
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
    await fastForwardTime({ days: 25 }); // 25 gün ileri al
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
    await fastForwardTime({ days: 25 }); // 25 gün ileri al

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

//Başarısız satış:
//paymentCounter // artmaz, ama talep edilen yerlerde gelecek için kontrol edersin.
//payments[newPaymentId] // boş payment struct
//saleCounterPerCourse[_courseId] // artmaz
//courseSaleRecords[_courseId][-coursun satış sayısı-] // 0

//courseOwnerToPayment[_courseReceiver][_courseId] // 0
//ownedCourses[_courseReceiver] //değişmez
//ownedCourseIndexPlusOne[_courseReceiver][_courseId] // 0
//hasOwnedCourse

//Başarılı satış ve iade:
//paymentCounter // +1 --> azaltılamaz
//payments[newPaymentId] // new payment sctruct --> .refunded
//saleCounterPerCourse[_courseId] // +1, bu kursun satış sayısı --> azaltılamaz
//courseSaleRecords[_courseId][-coursun satış sayısı-] //yeni paymentId'yi tutuyor --> record silinmedi kalıcak

//courseOwnerToPayment[_courseReceiver][_courseId] // paymentId tutuyor --> silindi onlyRefund diğer durumlarda stable değil
//ownedCourses[_courseReceiver] //courseId array'e eklendi [0,1] olmalı. --> sonuncuyla yerdeğişti silindi
//ownedCourseIndexPlusOne[_courseReceiver][_courseId] // kaçıncı indiste gerçek değer, --> silindi
//hasOwnedCourse --> false

//////////////////////////////////////////////////////////////////////////////////////////////////////

//Başarılı satış ve iade:
//paymentCounter // +1 --> azaltılamaz
//saleCounterPerCourse[_courseId] // +1, bu kursun satış sayısı --> azaltılamaz
//courseSaleRecords[_courseId][-coursun satış sayısı-] //yeni paymentId'yi tutuyor --> record silinmedi kalıcak

//courseOwnerToPayment[_courseReceiver][_courseId] // paymentId tutuyor --> silindi onlyRefund diğer durumlarda stable değil
//ownedCourses[_courseReceiver] //courseId array'e eklendi [0,1] olmalı. --> sonuncuyla yerdeğişti silindi
//ownedCourseIndexPlusOne[_courseReceiver][_courseId] // kaçıncı indiste gerçek değer, --> silindi
//hasOwnedCourse --> false
//payments[newPaymentId] // new payment sctruct --> .refunded

//Başarılı satış baraşırız iade:
//paymentCounter // +1 --> azaltılamaz
//saleCounterPerCourse[_courseId] // +1, bu kursun satış sayısı --> azaltılamaz
//courseSaleRecords[_courseId][-coursun satış sayısı-] //yeni paymentId'yi tutuyor --> değişmez

//courseOwnerToPayment[_courseReceiver][_courseId] // paymentId tutuyor --> değişmez
//ownedCourses[_courseReceiver] //courseId array'e eklendi [0,1] olmalı. --> değişmez
//ownedCourseIndexPlusOne[_courseReceiver][_courseId] // kaçıncı indiste gerçek değer, --> değişmez
//hasOwnedCourse --> değişmez
//payments[newPaymentId] // new payment sctruct --> değişmez
