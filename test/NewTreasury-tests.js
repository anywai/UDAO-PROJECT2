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
  // grant backend role
  await NewTreasury.connect(backend).setRefundWindow(19 * 86400); // 1 gün
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

/////### TEST HELPERS ###/////
async function createCourseHelper({ uri, withdrawers, redeemer, validUntil, expectRevertWith, expectSuccessWith }) {
  const input = {
    uri,
    withdrawers,
    redeemer,
    uriHash: ethers.keccak256(ethers.toUtf8Bytes(uri)),
  };
  const current = {
    courseCounter: await NewTreasury.courseCounter(),
    existingUriToId: await NewTreasury.uriToCourseId(input.uriHash),
  };

  const desired = {
    courseId: current.courseCounter + 1n, // next courseId
  };

  const waitSuccess =
    expectSuccessWith && !expectRevertWith
      ? true
      : expectRevertWith && !expectSuccessWith
      ? false
      : (() => {
          throw new Error("Exactly one of expectSuccessWith or expectRevertWith must be defined.");
        })();

  const expectedOutcome = await _prepareExpectedCreateState({
    input,
    current,
    desired,
    waitSuccess,
  });

  const voucher = await createVH.signVoucher({
    uri,
    withdrawers,
    redeemer: redeemer.address,
    validUntil,
  });

  let tx;

  if (expectRevertWith) {
    await expect(NewTreasury.connect(redeemer).createCourse(voucher)).to.be.revertedWith(expectRevertWith);
  } else if (expectSuccessWith) {
    tx = await NewTreasury.connect(redeemer).createCourse(voucher);
    await expect(tx).to.emit(NewTreasury, expectSuccessWith).withArgs(desired.courseId);
  } else {
    throw new Error("What you expect? No success or revert condition provided. --createCourseHelper--");
  }

  await _expectCreate(input, desired, expectedOutcome);

  return {
    courseId: desired.courseId,
    uri: input.uri,
    sellable: true,
    withdrawers: input.withdrawers,
    tx: tx,
  };
}

async function _prepareExpectedCreateState({ input, current, desired, waitSuccess }) {
  const isUriAlreadyExists = current.existingUriToId > 0n;
  const isMaxWithdrawersExceeded = input.withdrawers.length > (await NewTreasury.maxAllowedWithdrawers());
  const hasZeroWithdrawer = input.withdrawers.includes(ethers.ZeroAddress);
  const isRedeemerWithdrawer = input.withdrawers.includes(input.redeemer.address);
  const unauthorizedCreator = !isRedeemerWithdrawer && input.redeemer.address !== backend.address;
  const hasEmptyUri = input.uri.length === 0;
  const hasEmptyWithdrawers = input.withdrawers.length === 0;

  if (!waitSuccess) {
    // Case 1: URI already exists, cannot create a new course
    if (isUriAlreadyExists) {
      return {
        courseCounter: current.courseCounter,
        uri: "",
        sellable: false,
        withdrawers: [],
        newUriHashHolds: current.existingUriToId,
      };
    }
    // Case 2: Max withdrawers exceeded, zero withdrawer or empty withdrawers, empty URI, or unauthorized creator
    if (isMaxWithdrawersExceeded || hasZeroWithdrawer || hasEmptyWithdrawers || hasEmptyUri || unauthorizedCreator) {
      return {
        courseCounter: current.courseCounter,
        uri: "",
        sellable: false,
        withdrawers: [],
        newUriHashHolds: 0n,
      };
    }

    // Case 3: Valid input but creation reverted (e.g., missing gas, voucher revert)
    return {
      courseCounter: current.courseCounter,
      uri: "",
      sellable: false,
      withdrawers: [],
      newUriHashHolds: 0n,
    };
  }
  // Case Success: Valid input, expect course creation to succeed
  return {
    courseCounter: current.courseCounter + 1n,
    uri: input.uri,
    sellable: true,
    withdrawers: input.withdrawers,
    newUriHashHolds: desired.courseId,
  };
}

async function _expectCreate(input, desired, expected) {
  const courseCounter = await NewTreasury.courseCounter();
  expect(courseCounter).to.equal(expected.courseCounter);

  const course = await NewTreasury.getCourse(desired.courseId);
  expect(course.uri).to.equal(expected.uri);
  expect(course.sellable).to.equal(expected.sellable);

  // check uriToCourseId mapping
  const hashToId = await NewTreasury.uriToCourseId(input.uriHash);
  expect(hashToId).to.equal(expected.newUriHashHolds);

  // check withdrawers
  const actualWithdrawers = await NewTreasury.getAuthorizedWithdrawers(desired.courseId);
  expect(actualWithdrawers).to.deep.equal(expected.withdrawers);

  // check expected withdrawers authorization
  for (const w of expected.withdrawers) {
    const isAuth = await NewTreasury.isAuthorizedWithdrawer(w, desired.courseId);
    expect(isAuth).to.equal(true);
  }
}

async function updateCourseHelper({
  courseId,
  uri,
  sellable,
  withdrawers,
  redeemer,
  validUntil,
  expectRevertWith,
  expectSuccessWith,
  previousWithdrawers,
}) {
  const input = {
    courseId,
    uri,
    sellable,
    withdrawers,
    redeemer,
    uriHash: ethers.keccak256(ethers.toUtf8Bytes(uri)),
  };

  const current = {
    courseCounter: await NewTreasury.courseCounter(),
    course: await NewTreasury.getCourse(courseId),
    existingWithdrawers: await NewTreasury.getAuthorizedWithdrawers(courseId),
    oldUriHash: ethers.keccak256(ethers.toUtf8Bytes((await NewTreasury.getCourse(courseId)).uri)),
    oldUriHashHolds: await NewTreasury.uriToCourseId(
      ethers.keccak256(ethers.toUtf8Bytes((await NewTreasury.getCourse(courseId)).uri))
    ),
    newUriHashHolds: await NewTreasury.uriToCourseId(input.uriHash),
  };

  const waitSuccess =
    expectSuccessWith && !expectRevertWith
      ? true
      : expectRevertWith && !expectSuccessWith
      ? false
      : (() => {
          throw new Error("Exactly one of expectSuccessWith or expectRevertWith must be defined.");
        })();

  const expectedOutcome = await _prepareExpectedUpdateState({ input, current, waitSuccess });

  // Create voucher for updateCourse
  const voucher = await updateVH.signVoucher({
    courseId,
    uri,
    sellable,
    withdrawers,
    redeemer: redeemer.address,
    validUntil,
  });

  let tx;

  if (expectRevertWith) {
    await expect(NewTreasury.connect(redeemer).updateCourse(voucher)).to.be.revertedWith(expectRevertWith);
  } else if (expectSuccessWith) {
    tx = await NewTreasury.connect(redeemer).updateCourse(voucher);
    await expect(tx).to.emit(NewTreasury, expectSuccessWith).withArgs(courseId);
  } else {
    throw new Error("What you expect? No success or revert condition provided. --updateCourseHelper--");
  }

  await _expectUpdate(input, current, expectedOutcome, previousWithdrawers);

  return {
    courseId: courseId,
    uri: uri,
    sellable: sellable,
    withdrawers: withdrawers,
    tx,
  };
}

async function _prepareExpectedUpdateState({ input, current, waitSuccess }) {
  const isUriAlreadyExists = current.newUriHashHolds > 0n && current.newUriHashHolds !== input.courseId;
  const isMaxWithdrawersExceeded = input.withdrawers.length > (await NewTreasury.maxAllowedWithdrawers());
  const hasZeroWithdrawer = input.withdrawers.includes(ethers.ZeroAddress);
  const isRedeemerWithdrawer = input.withdrawers.includes(input.redeemer.address);
  const unauthorizedUpdater = !isRedeemerWithdrawer && input.redeemer.address !== backend.address;
  const hasEmptyUri = input.uri.length === 0;
  const hasEmptyWithdrawers = input.withdrawers.length === 0;
  const isCourseIdValid = input.courseId > 0n && input.courseId <= current.courseCounter;

  if (!waitSuccess) {
    if (isUriAlreadyExists) {
      // Case 1: URI already exists, cannot update course
      return {
        uri: current.course.uri,
        sellable: current.course.sellable,
        withdrawers: current.existingWithdrawers,
        oldUriHashHolds: current.oldUriHashHolds,
        newUriHashHolds: current.newUriHashHolds,
      };
    }
    // Case 2: Max withdrawers exceeded, zero withdrawer or empty withdrawers, empty URI, or unauthorized updater
    if (
      isMaxWithdrawersExceeded ||
      hasZeroWithdrawer ||
      hasEmptyWithdrawers ||
      hasEmptyUri ||
      unauthorizedUpdater ||
      !isCourseIdValid
    ) {
      return {
        uri: current.course.uri,
        sellable: current.course.sellable,
        withdrawers: current.existingWithdrawers,
        oldUriHashHolds: current.oldUriHashHolds,
        newUriHashHolds: "",
      };
    }
    // Case 3: Valid input but update reverted (e.g., missing gas, voucher revert)
    return {
      uri: current.course.uri,
      sellable: current.course.sellable,
      withdrawers: current.existingWithdrawers,
      oldUriHashHolds: current.oldUriHashHolds,
      newUriHashHolds: "",
    };
  }

  return {
    uri: input.uri,
    sellable: input.sellable,
    withdrawers: input.withdrawers,
    oldUriHashHolds: input.uriHash == current.oldUriHash ? input.courseId : 0n, // if same, holds courseId, else 0
    newUriHashHolds: input.courseId,
  };
}

async function _expectUpdate(input, previous, expected, previousWithdrawers = []) {
  const courseCounter = await NewTreasury.courseCounter();
  expect(courseCounter).to.equal(previous.courseCounter);

  const course = await NewTreasury.getCourse(input.courseId);
  expect(course.uri).to.equal(expected.uri);
  expect(course.sellable).to.equal(expected.sellable);

  // check uriToCourseId mapping
  const newHashToId = await NewTreasury.uriToCourseId(input.uriHash);
  expect(newHashToId).to.equal(expected.newUriHashHolds);

  // Sadece farklıysa eski hash’i kontrol et
  const oldHashToId = await NewTreasury.uriToCourseId(previous.oldUriHash);
  expect(oldHashToId).to.equal(expected.oldUriHashHolds);

  // check withdrawers
  const actualWithdrawers = await NewTreasury.getAuthorizedWithdrawers(input.courseId);
  expect(actualWithdrawers).to.deep.equal(expected.withdrawers);

  for (const w of expected.withdrawers) {
    const isAuth = await NewTreasury.isAuthorizedWithdrawer(w, input.courseId);
    expect(isAuth).to.equal(true);
  }

  for (const oldW of previousWithdrawers) {
    const isStillAuthorized = await NewTreasury.isAuthorizedWithdrawer(oldW, input.courseId);
    expect(isStillAuthorized).to.equal(expected.withdrawers.includes(oldW));
  }
}

async function buyCourseHelper({
  courseId,
  tokenAddress,
  coursePrice,
  courseReceiver,
  redeemer,
  validUntil,
  nativeMsgValue,
  expectRevertWith,
  expectSuccessWith,
}) {
  // Prepare voucher input, current contract state, and desired states
  const input = {
    courseId,
    tokenAddress,
    coursePrice,
    courseReceiver,
    redeemer,
    validUntil,
    nativeMsgValue,
  };
  const current = {
    paymentCounter: await NewTreasury.paymentCounter(),
    saleCounterPerCourse: await NewTreasury.saleCounterPerCourse(courseId),
    courseOwnerToPayment: await NewTreasury.courseOwnerToPayment(courseReceiver, courseId),
    ownedCourses: await NewTreasury.getOwnedCourses(courseReceiver),
    hasOwnedCourse: await NewTreasury.hasOwnedCourse(courseReceiver, courseId),
    ownedCourseIndex: await NewTreasury.ownedCourseIndex(courseReceiver, courseId),
    udaoTokenAddress: await NewTreasury.udaoTokenAddress(),
    refundWindow: await NewTreasury.refundWindow(),
    utFoundCut: await NewTreasury.utFoundCut(),
    utGoverCut: await NewTreasury.utGoverCut(),
    atFoundCut: await NewTreasury.atFoundCut(),
    atGoverCut: await NewTreasury.atGoverCut(),
  };
  const desired = {
    paymentId: current.paymentCounter + 1n, // new paymentId
    courseSpecificSaleId: current.saleCounterPerCourse + 1n, // new saleId
  };

  // Get expected contract state after buy operation
  const waitSuccess =
    expectSuccessWith && !expectRevertWith
      ? true
      : expectRevertWith && !expectSuccessWith
      ? false
      : (() => {
          throw new Error("Exactly one of expectSuccessWith or expectRevertWith must be defined.");
        })();
  const expectedOutcome = await _prepareExpectedBuyStates(input, current, desired, waitSuccess);

  // Get balances before transaction
  const beforeTxBalances = await getBalances({
    payer: redeemer.address,
    courseReceiver: courseReceiver,
    contract: NewTreasury.target,
    tokenAddress: tokenAddress,
  });

  // tx
  const buyVoucher = await buyVH.signVoucher({
    courseId: courseId,
    tokenAddress: tokenAddress,
    coursePrice: coursePrice,
    courseReceiver: courseReceiver,
    redeemer: redeemer.address,
    validUntil: validUntil,
  });

  let tx = null;
  let gasCost = 0n;

  if (!waitSuccess) {
    await expect(
      NewTreasury.connect(redeemer).buyCourse(buyVoucher, {
        value: nativeMsgValue,
      })
    ).to.be.revertedWith(expectRevertWith);
    // not possible to catch gas cost on revert
  } else if (waitSuccess) {
    tx = await NewTreasury.connect(redeemer).buyCourse(buyVoucher, {
      value: nativeMsgValue,
    });
    await expect(tx).to.emit(NewTreasury, expectSuccessWith).withArgs(desired.paymentId, courseId, courseReceiver);
    // catch gas cost
    const receipt = await tx.wait();
    const effectiveGasPrice = receipt.effectiveGasPrice ?? receipt.gasPrice ?? 0n;
    gasCost = receipt.gasUsed * effectiveGasPrice;
  }

  await _expectBuy(input, desired, expectedOutcome);

  // check balances after transaction
  await checkBalancesAfter({
    operation: "buy", // if refund use "refund"
    gasCost: gasCost, // 0 if revert, otherwise gas used success
    beforeTxBalances: beforeTxBalances,
    coursePrice: coursePrice,
    tokenAddress: tokenAddress,
  });

  return {
    // desired if success
    paymentId: desired.paymentId, // new paymentId
    courseSpecificSaleId: desired.courseSpecificSaleId, // new saleId
    // alredy know if success
    courseId: courseId,
    courseReceiver: courseReceiver,
    buyer: redeemer.address,
    tokenAddress: tokenAddress, // alındıysa tokenAddress
    coursePrice: coursePrice, // alındıysa coursePrice
    // calculated
    endOfRefundWindow: expectedOutcome.payment.endOfRefundWindow, // alındıysa endOfRefundWindow
    afterBuyReceiverOwnedCourses: expectedOutcome.ownedCoursesArrayOfReceiver,
    instructorShare: expectedOutcome.payment.instructorShare, //instructorShare, // alındıysa instructorShare
    foundationShare: expectedOutcome.payment.foundationShare, // foundationShare, // alındıysa foundationShare
    governanceShare: expectedOutcome.payment.governanceShare, // alındıysa governanceShare

    tx,
  };
}

async function _prepareExpectedBuyStates(input, current, desired, waitSuccess) {
  const isValidCourseId = input.courseId > 0 && input.courseId <= (await NewTreasury.courseCounter());
  const isCourseSellable = (await NewTreasury.courses(input.courseId)).sellable;
  const hasAlreadyOwnThisCourse = current.hasOwnedCourse;
  const isZeroCoursePrice = input.coursePrice === 0n;
  const isNative = input.courseTokenAddress === ethers.ZeroAddress;
  const isMsgValueCorrect = isNative ? input.nativeMsgValue == input.coursePrice : input.nativeMsgValue == 0n; // ERC20 ödemede msg.value sıfır olmalı

  emptyPayment = {
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
  };

  if (!waitSuccess) {
    // Case 1: Invalid courseId (does not exist)
    if (!isValidCourseId) {
      return {
        paymentCounter: current.paymentCounter,
        saleCounterOfCourse: current.saleCounterPerCourse,
        courseSaleRecords: 0,

        courseOwnerToPayment: 0n,
        ownedCoursesArrayOfReceiver: current.ownedCourses,
        ownedCourseIndex: 0n,
        hasOwnedCourse: false,

        payment: { ...emptyPayment },
      };
    }
    // Case 2: Valid courseId but already own this course
    if (hasAlreadyOwnThisCourse) {
      return {
        paymentCounter: current.paymentCounter,
        saleCounterOfCourse: current.saleCounterPerCourse,
        courseSaleRecords: 0,

        courseOwnerToPayment: current.courseOwnerToPayment,
        ownedCoursesArrayOfReceiver: current.ownedCourses,
        ownedCourseIndex: current.ownedCourseIndex,
        hasOwnedCourse: true,

        payment: { ...emptyPayment },
      };
    }

    // Case 3: Valid courseId but course is not sellable
    if (!isCourseSellable || isZeroCoursePrice || !isMsgValueCorrect) {
      return {
        paymentCounter: current.paymentCounter,
        saleCounterOfCourse: current.saleCounterPerCourse,
        courseSaleRecords: 0,

        courseOwnerToPayment: 0n,
        ownedCoursesArrayOfReceiver: current.ownedCourses,
        ownedCourseIndex: 0n,
        hasOwnedCourse: false,

        payment: { ...emptyPayment },
      };
    }
    // Case 4: Valid courseId valid buy but reverted. transfer fail, missing gas, voucher revert
    return {
      paymentCounter: current.paymentCounter,
      saleCounterOfCourse: current.saleCounterPerCourse,
      courseSaleRecords: 0,

      courseOwnerToPayment: current.courseOwnerToPayment,
      ownedCoursesArrayOfReceiver: current.ownedCourses,
      ownedCourseIndex: current.ownedCourseIndex,
      hasOwnedCourse: current.hasOwnedCourse,

      payment: { ...emptyPayment },
    };
  }
  // Case Success: Valid courseId, expect purchase to succeed
  // Calculate role shares of purchase
  const isUdao = input.tokenAddress === current.udaoTokenAddress;
  const foundCut = isUdao ? current.utFoundCut : current.atFoundCut;
  const goverCut = isUdao ? current.utGoverCut : current.atGoverCut;
  const foundationShare = (input.coursePrice * foundCut) / 100000n;
  const governanceShare = (input.coursePrice * goverCut) / 100000n;
  const instructorShare = input.coursePrice - foundationShare - governanceShare;
  // Calculate end of refund window
  const endOfRefundWindow = BigInt(now) + current.refundWindow;
  // Calculate new owned courses array
  const newOwnedCourses =
    current.ownedCourses.length === 0 ? [0, input.courseId] : [...current.ownedCourses, input.courseId];

  return {
    paymentCounter: current.paymentCounter + 1n,
    saleCounterOfCourse: current.saleCounterPerCourse + 1n,
    courseSaleRecords: desired.paymentId,

    courseOwnerToPayment: desired.paymentId,
    ownedCoursesArrayOfReceiver: newOwnedCourses,
    ownedCourseIndex: newOwnedCourses.length - 1,
    hasOwnedCourse: true,

    payment: {
      courseId: BigInt(input.courseId),
      payer: input.redeemer.address,
      courseReceiver: input.courseReceiver,
      tokenAddress: input.tokenAddress,
      totalAmount: input.coursePrice,
      instructorShare,
      foundationShare,
      governanceShare,
      endOfRefundWindow,
      isRefunded: false,
      isWithdrawn: false,
    },
  };
}

async function _expectBuy(input, desired, expected) {
  const { courseId, courseReceiver } = input;
  const { paymentId, courseSpecificSaleId } = desired;

  const {
    paymentCounter,
    saleCounterOfCourse,
    courseSaleRecords,

    courseOwnerToPayment,
    ownedCoursesArrayOfReceiver,
    ownedCourseIndex,
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

  // 7. ownedCourseIndex
  const indexPlusOne = await NewTreasury.ownedCourseIndex(courseReceiver, courseId);
  expect(indexPlusOne).to.equal(ownedCourseIndex);

  // 8. hasOwnedCourse
  const hasOwned = await NewTreasury.hasOwnedCourse(courseReceiver, courseId);
  expect(hasOwned).to.equal(hasOwnedCourse);
}

async function refundCourseHelper({ paymentId, redeemer, validUntil, expectRevertWith, expectSuccessWith }) {
  // Prepare input, desired refund payment, current contract state,
  const input = {
    paymentId,
    redeemer,
  };
  const payment = await NewTreasury.getPayment(paymentId);
  const current = {
    paymentCounter: await NewTreasury.paymentCounter(),
    courseOwnerToPayment: await NewTreasury.courseOwnerToPayment(payment.courseReceiver, payment.courseId),
    ownedCourses: await NewTreasury.getOwnedCourses(payment.courseReceiver),
    ownedCourseIndex: await NewTreasury.ownedCourseIndex(payment.courseReceiver, payment.courseId),
    hasOwnedCourse: await NewTreasury.hasOwnedCourse(payment.courseReceiver, payment.courseId),
  };
  // Get expected contract state after buy operation
  const waitSuccess =
    expectSuccessWith && !expectRevertWith
      ? true
      : expectRevertWith && !expectSuccessWith
      ? false
      : (() => {
          throw new Error("Exactly one of expectSuccessWith or expectRevertWith must be defined.");
        })();

  // push paymentId to common helper to get expected values
  const expectedOutcome = await _prepareExpectedRefundStates(input, payment, current, waitSuccess);

  // get balances before transaction
  const beforeTxBalances = await getBalances({
    payer: payment.payer,
    courseReceiver: payment.courseReceiver,
    contract: NewTreasury.target,
    tokenAddress: payment.tokenAddress,
    refundCaller: redeemer.address, // redeemer is the caller
  });

  //tx create and use voucher
  const refundVoucher = await refundVH.signVoucher({
    paymentId,
    redeemer: redeemer.address,
    validUntil,
  });

  let tx = null;
  let gasCost = 0n;

  if (!waitSuccess) {
    await expect(NewTreasury.connect(redeemer).refundCourse(refundVoucher)).to.be.revertedWith(expectRevertWith);
  } else if (waitSuccess) {
    tx = await NewTreasury.connect(redeemer).refundCourse(refundVoucher);
    await expect(tx)
      .to.emit(NewTreasury, expectSuccessWith)
      .withArgs(
        paymentId,
        payment.courseId,
        payment.courseReceiver,
        payment.totalAmount,
        payment.tokenAddress,
        payment.payer
      );

    const receipt = await tx.wait();
    const effectiveGasPrice = receipt.effectiveGasPrice ?? receipt.gasPrice ?? 0n;
    gasCost = receipt.gasUsed * effectiveGasPrice;
  } else if (waitSuccess) {
    throw new Error("No expectRevertWith or expectSuccessWith provided --refundCourseHelper--");
  }

  await _expectRefund(input, expectedOutcome);

  // check balances after transaction
  await checkBalancesAfter({
    operation: "refund", // if refund use "refund"
    gasCost: gasCost, // 0 if revert, otherwise gas used success
    beforeTxBalances: beforeTxBalances,
    coursePrice: payment.totalAmount,
    tokenAddress: payment.tokenAddress,
  });

  return {
    paymentId: paymentId,
    courseId: payment.courseId,
    courseReceiver: payment.courseReceiver,
    coursePrice: payment.totalAmount,
    tokenAddress: payment.tokenAddress,
    payer: payment.payer,
    redeemer: redeemer.address,
    tx,
  };
}

async function refundCourseByOwnerHelper({
  courseOwner,
  courseId,
  redeemer,
  validUntil,
  expectRevertWith,
  expectSuccessWith,
}) {
  // get paymentId from courseOwner + courseId and push to common helper
  const paymentId = await NewTreasury.courseOwnerToPayment(courseOwner, courseId);
  // Prepare input, desired refund payment, current contract state,
  const input = {
    paymentId,
    redeemer,
  };
  const payment = await NewTreasury.getPayment(paymentId);
  const current = {
    courseOwnerToPayment: await NewTreasury.courseOwnerToPayment(payment.courseReceiver, payment.courseId),
    ownedCourses: await NewTreasury.getOwnedCourses(payment.courseReceiver),
    ownedCourseIndex: await NewTreasury.ownedCourseIndex(payment.courseReceiver, payment.courseId),
    hasOwnedCourse: await NewTreasury.hasOwnedCourse(payment.courseReceiver, payment.courseId),
  };
  // Get expected contract state after buy operation
  const waitSuccess =
    expectSuccessWith && !expectRevertWith
      ? true
      : expectRevertWith && !expectSuccessWith
      ? false
      : (() => {
          throw new Error("Exactly one of expectSuccessWith or expectRevertWith must be defined.");
        })();

  const expectedOutcome = await _prepareExpectedRefundStates(input, payment, current, waitSuccess);

  // get balances before transaction
  const beforeTxBalances = await getBalances({
    payer: payment.payer,
    courseReceiver: payment.courseReceiver,
    contract: NewTreasury.target,
    tokenAddress: payment.tokenAddress,
    refundCaller: redeemer.address, // redeemer is the caller
  });

  // create voucher and send tx
  const refundVoucher = await refundByOwnerVH.signVoucher({
    courseOwner,
    courseId,
    redeemer: redeemer.address,
    validUntil,
  });
  //const tx = await NewTreasury.connect(redeemer).refundCourseByOwnerAndCourseId(refundVoucher);
  let tx;
  let gasCost = 0n;

  if (!waitSuccess) {
    await expect(NewTreasury.connect(redeemer).refundCourseByOwnerAndCourseId(refundVoucher)).to.be.revertedWith(
      expectRevertWith
    );
  } else if (waitSuccess) {
    tx = await NewTreasury.connect(redeemer).refundCourseByOwnerAndCourseId(refundVoucher);

    await expect(tx)
      .to.emit(NewTreasury, expectSuccessWith)
      .withArgs(
        paymentId,
        payment.courseId,
        payment.courseReceiver,
        payment.totalAmount,
        payment.tokenAddress,
        payment.payer
      );

    const receipt = await tx.wait();
    const effectiveGasPrice = receipt.effectiveGasPrice ?? receipt.gasPrice ?? 0n;
    gasCost = receipt.gasUsed * effectiveGasPrice;
  } else {
    throw new Error("No expectRevertWith or expectSuccessWith provided --refundCourseByOwnerHelper--");
  }

  await _expectRefund(input, expectedOutcome);

  // check balances after transaction
  await checkBalancesAfter({
    operation: "refund",
    gasCost: gasCost,
    beforeTxBalances: beforeTxBalances,
    coursePrice: payment.totalAmount,
    tokenAddress: payment.tokenAddress,
  });

  return {
    paymentId: paymentId,
    courseId: payment.courseId,
    courseReceiver: payment.courseReceiver,
    coursePrice: payment.totalAmount,
    tokenAddress: payment.tokenAddress,
    payer: payment.payer,
    redeemer: redeemer.address,
    tx,
  };
}

async function _prepareExpectedRefundStates(input, payment, current, waitSuccess) {
  const { paymentId, redeemer } = input;

  const isInvalidPaymentId = paymentId === 0n || paymentId > current.paymentCounter;
  const isAlreadyRefunded = payment.isRefunded;
  const isRefundWindowExpired = BigInt(now) > payment.endOfRefundWindow;

  const emptyPayment = {
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
  };

  const basePayment = {
    courseId: payment.courseId,
    payer: payment.payer,
    courseReceiver: payment.courseReceiver,
    tokenAddress: payment.tokenAddress,
    totalAmount: payment.totalAmount,
    instructorShare: payment.instructorShare,
    foundationShare: payment.foundationShare,
    governanceShare: payment.governanceShare,
    endOfRefundWindow: payment.endOfRefundWindow,
    isRefunded: payment.isRefunded,
    isWithdrawn: payment.isWithdrawn,
  };

  if (!waitSuccess) {
    // Case 1: Invalid paymentId (does not exist)
    if (isInvalidPaymentId) {
      return {
        courseOwnerToPayment: 0n,
        ownedCoursesArrayOfReceiver: current.ownedCourses,
        ownedCourseIndex: 0,
        hasOwnedCourse: false,
        payment: { ...emptyPayment },
      };
    }
    // Case 2: Valid paymentId but already refunded
    if (isAlreadyRefunded) {
      return {
        courseOwnerToPayment: 0,
        ownedCoursesArrayOfReceiver: current.ownedCourses,
        ownedCourseIndex: 0,
        hasOwnedCourse: false,
        payment: { ...basePayment, isRefunded: true },
      };
    }
    // Case 3: Valid paymentId but refund window expired
    if (isRefundWindowExpired) {
      return {
        courseOwnerToPayment: paymentId,
        ownedCoursesArrayOfReceiver: current.ownedCourses,
        ownedCourseIndex: current.ownedCourseIndex,
        hasOwnedCourse: true,
        payment: { ...basePayment },
      };
    }
    // Case 4: Valid paymentId and valid refund but reverted. transfer fail, missing gas, voucher revert
    return {
      courseOwnerToPayment: current.courseOwnerToPayment,
      ownedCoursesArrayOfReceiver: current.ownedCourses,
      ownedCourseIndex: current.ownedCourseIndex,
      hasOwnedCourse: current.hasOwnedCourse,
      payment: { ...basePayment },
    };
  }

  // Case Success: Valid paymentId and refund expected to succeed
  const newOwnedCourses = [...current.ownedCourses];
  if (current.ownedCourseIndex > 0) {
    const index = Number(current.ownedCourseIndex);
    const lastIndex = newOwnedCourses.length - 1;
    if (index !== lastIndex) {
      newOwnedCourses[index] = newOwnedCourses[lastIndex];
    }
    newOwnedCourses.pop();
  }

  return {
    courseOwnerToPayment: 0n,
    ownedCoursesArrayOfReceiver: newOwnedCourses,
    ownedCourseIndex: 0,
    hasOwnedCourse: false,
    payment: { ...basePayment, isRefunded: true },
  };
}

async function _expectRefund(input, expected) {
  const { paymentId } = input;
  const { payment, courseOwnerToPayment, ownedCoursesArrayOfReceiver, ownedCourseIndex, hasOwnedCourse } = expected;
  // 1) compare payment struct states
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
  const diff = BigInt(actualPayment.endOfRefundWindow) - BigInt(payment.endOfRefundWindow);
  expect(diff >= 0n && diff <= 120n).to.equal(true); // ± 2 dakika tolerans
  // 2) compare courseOwnerToPayment mapping
  const courseOwnerPayment = await NewTreasury.courseOwnerToPayment(payment.courseReceiver, payment.courseId);
  expect(courseOwnerPayment).to.equal(courseOwnerToPayment);
  // 3) compare ownedCourses mapping
  const ownedCourses = await NewTreasury.getOwnedCourses(payment.courseReceiver);
  expect(ownedCourses.map(Number)).to.deep.equal(ownedCoursesArrayOfReceiver.map(Number));
  // 4) compare ownedCourseIndex mapping
  const indexPlusOne = await NewTreasury.ownedCourseIndex(payment.courseReceiver, payment.courseId);
  expect(indexPlusOne).to.equal(ownedCourseIndex);
  // 5) check hasOwnedCourse mapping
  const hasOwned = await NewTreasury.hasOwnedCourse(payment.courseReceiver, payment.courseId);
  expect(hasOwned).to.equal(hasOwnedCourse);
  // throw error if already refunded and already withdrawn is same time
  if (payment.isRefunded && payment.isWithdrawn) {
    throw new Error("Payment is already refunded and withdrawn");
  }
}

async function getBalances({ payer, courseReceiver, contract, tokenAddress, refundCaller = ethers.ZeroAddress }) {
  const isNative = tokenAddress === ethers.ZeroAddress;
  const isAnyRefCaller = refundCaller !== ethers.ZeroAddress;

  let payerToken = 0n;
  let receiverToken = 0n;
  let contractToken = 0n;
  let refundCallerToken = 0n;

  if (!isNative) {
    const ERC20 = await ethers.getContractAt("IERC20", tokenAddress);
    payerToken = await ERC20.balanceOf(payer);
    receiverToken = await ERC20.balanceOf(courseReceiver);
    contractToken = await ERC20.balanceOf(contract);
    refundCallerToken = refundCaller !== ethers.ZeroAddress ? await ERC20.balanceOf(refundCaller) : 0n;
  }

  const payerNative = await ethers.provider.getBalance(payer);
  const receiverNative = await ethers.provider.getBalance(courseReceiver);
  const contractNative = await ethers.provider.getBalance(contract);
  const refundCallerNative = refundCaller !== ethers.ZeroAddress ? await ethers.provider.getBalance(refundCaller) : 0n;

  return {
    payer: {
      address: payer,
      nativeBalance: payerNative,
      tokenBalance: payerToken,
    },
    courseReceiver: {
      address: courseReceiver,
      nativeBalance: receiverNative,
      tokenBalance: receiverToken,
    },
    contract: {
      address: contract,
      nativeBalance: contractNative,
      tokenBalance: contractToken,
    },
    refundCaller: {
      address: refundCaller,
      nativeBalance: refundCallerNative,
      tokenBalance: refundCallerToken,
    },
  };
}

async function checkBalancesAfter({ operation, gasCost, beforeTxBalances, coursePrice, tokenAddress }) {
  const beforeTx = beforeTxBalances;
  const afterTx = await getBalances({
    payer: beforeTxBalances.payer.address,
    courseReceiver: beforeTxBalances.courseReceiver.address,
    contract: beforeTxBalances.contract.address,
    tokenAddress,
    refundCaller: beforeTxBalances.refundCaller.address,
  });

  const isNative = tokenAddress === ethers.ZeroAddress;
  const isBuy = operation === "buy";
  const isRefund = operation === "refund";
  const txSucceeded = gasCost > 0n;

  if (txSucceeded && (isBuy || isRefund)) {
    if (isBuy && isNative) {
      // payer native ↓ by coursePrice + gasUsed
      const nativeDelta = beforeTx.payer.nativeBalance - afterTx.payer.nativeBalance;
      expect(nativeDelta).to.equal(coursePrice + gasCost);
      // contract native ↑ by coursePrice
      const contractNativeDelta = afterTx.contract.nativeBalance - beforeTx.contract.nativeBalance;
      expect(contractNativeDelta).to.equal(coursePrice);
    }

    if (isBuy && !isNative) {
      // payer native ↓ gasUsed
      const nativeDelta = beforeTx.payer.nativeBalance - afterTx.payer.nativeBalance;
      expect(nativeDelta).to.equal(gasCost);
      // contract native is unchanged
      expect(afterTx.contract.nativeBalance).to.equal(beforeTx.contract.nativeBalance);

      // payer token ↓ by coursePrice
      const tokenDelta = beforeTx.payer.tokenBalance - afterTx.payer.tokenBalance;
      expect(tokenDelta).to.equal(coursePrice);
      // contract token ↑ by coursePrice
      const contractTokenDelta = afterTx.contract.tokenBalance - beforeTx.contract.tokenBalance;
      expect(contractTokenDelta).to.equal(coursePrice);
    }
    if (beforeTx.payer.address === beforeTx.refundCaller.address) {
      if (isRefund && isNative) {
        // payer native ↑ (by coursePrice - by gasCost)
        const nativeDelta = afterTx.payer.nativeBalance - beforeTx.payer.nativeBalance;
        expect(nativeDelta).to.equal(coursePrice - gasCost);
        // contract native ↓ by coursePrice
        const contractNativeDelta = beforeTx.contract.nativeBalance - afterTx.contract.nativeBalance;
        expect(contractNativeDelta).to.equal(coursePrice);
      }

      if (isRefund && !isNative) {
        // payer native ↓ by gasCost
        const nativeDelta = beforeTx.payer.nativeBalance - afterTx.payer.nativeBalance;
        expect(nativeDelta).to.equal(gasCost);
        // contract native is unchanged
        expect(afterTx.contract.nativeBalance).to.equal(beforeTx.contract.nativeBalance);
        // payer token ↑ by coursePrice
        const tokenDelta = afterTx.payer.tokenBalance - beforeTx.payer.tokenBalance;
        expect(tokenDelta).to.equal(coursePrice);
        // contract token ↓ by coursePrice
        const contractTokenDelta = beforeTx.contract.tokenBalance - afterTx.contract.tokenBalance;
        expect(contractTokenDelta).to.equal(coursePrice);
      }
    }
    if (beforeTx.payer.address != beforeTx.refundCaller.address) {
      if (isRefund && isNative) {
        // refund caller native ↓ (by gasCost)
        const nativeDeltaRC = beforeTx.refundCaller.nativeBalance - afterTx.refundCaller.nativeBalance;
        expect(nativeDeltaRC).to.equal(gasCost);
        // payer native ↑ (by coursePrice)
        const nativeDelta = afterTx.payer.nativeBalance - beforeTx.payer.nativeBalance;
        expect(nativeDelta).to.equal(coursePrice - gasCost);
        // contract native ↓ by coursePrice
        const contractNativeDelta = beforeTx.contract.nativeBalance - afterTx.contract.nativeBalance;
        expect(contractNativeDelta).to.equal(coursePrice);
      }

      if (isRefund && !isNative) {
        // refund caller native ↓ (by gasCost)
        const nativeDeltaRC = beforeTx.refundCaller.nativeBalance - afterTx.refundCaller.nativeBalance;
        expect(nativeDeltaRC).to.equal(gasCost);
        // payer native is unchanged
        expect(afterTx.payer.nativeBalance).to.equal(beforeTx.payer.nativeBalance);
        // contract native is unchanged
        expect(afterTx.contract.nativeBalance).to.equal(beforeTx.contract.nativeBalance);
        // payer token ↑ by coursePrice
        const tokenDelta = afterTx.payer.tokenBalance - beforeTx.payer.tokenBalance;
        expect(tokenDelta).to.equal(coursePrice);
        // contract token ↓ by coursePrice
        const contractTokenDelta = beforeTx.contract.tokenBalance - afterTx.contract.tokenBalance;
        expect(contractTokenDelta).to.equal(coursePrice);
      }
    }
  }

  const isThereARefundCaller = beforeTx.refundCaller.address !== ethers.ZeroAddress;
  const isRefundCallerSameAsPayer = beforeTx.payer.address === beforeTx.refundCaller.address;

  if (!txSucceeded) {
    if ((isThereARefundCaller && isRefundCallerSameAsPayer) || !isThereARefundCaller) {
      // payer native ↓ by UNNOWN amount (gas cost)
      const nativeDelta = beforeTx.payer.nativeBalance - afterTx.payer.nativeBalance;
      expect(nativeDelta).to.be.greaterThan(0n);
      // contract native is unchanged
      expect(afterTx.contract.nativeBalance).to.equal(beforeTx.contract.nativeBalance);
      if (!isNative) {
        // payer token is unchanged
        expect(afterTx.payer.tokenBalance).to.equal(beforeTx.payer.tokenBalance);
        // contract token is unchanged
        expect(afterTx.contract.tokenBalance).to.equal(beforeTx.contract.tokenBalance);
      }
    }

    if (isThereARefundCaller && !isRefundCallerSameAsPayer) {
      // refund caller native ↓ by UNNOWN amount (gas cost)
      const nativeDeltaRC = beforeTx.refundCaller.nativeBalance - afterTx.refundCaller.nativeBalance;
      expect(nativeDeltaRC).to.be.greaterThan(0n);
      // payer native is unchanged
      expect(afterTx.payer.nativeBalance).to.equal(beforeTx.payer.nativeBalance);
      // contract native is unchanged
      expect(afterTx.contract.nativeBalance).to.equal(beforeTx.contract.nativeBalance);
      if (!isNative) {
        // refund caller token is unchanged
        expect(afterTx.refundCaller.tokenBalance).to.equal(beforeTx.refundCaller.tokenBalance);
        // payer token is unchanged
        expect(afterTx.payer.tokenBalance).to.equal(beforeTx.payer.tokenBalance);
        // contract token is unchanged
        expect(afterTx.contract.tokenBalance).to.equal(beforeTx.contract.tokenBalance);
      }
    }
  }
  const isUniqueReceiver =
    beforeTx.courseReceiver.address !== beforeTx.payer.address &&
    beforeTx.courseReceiver.address !== beforeTx.contract.address &&
    beforeTx.courseReceiver.address !== ethers.ZeroAddress;
  if (isUniqueReceiver) {
    // receiver native is unchanged in all cases
    expect(afterTx.courseReceiver.nativeBalance).to.equal(beforeTx.courseReceiver.nativeBalance);
    if (!isNative) {
      // receiver token is unchanged in all cases during erc20 operations
      expect(afterTx.courseReceiver.tokenBalance).to.equal(beforeTx.courseReceiver.tokenBalance);
    }
  }
  // other operations can be added here
}
/////### END OF TEST HELPERS ###/////

const PaymentState = {
  WI: "WI", // Already Withdrawn, In refund window
  WE: "WE", // Already Withdrawn, refund window Ended,
  RI: "RI", // Already Refunded, In refund window,
  RE: "RE", // Already Refunded, refund window Ended,
  PI: "PI", // Pending, In refund window,
  PEF: "PEF", // Pending, refund window Ended, expect Fail
  PES: "PES", // Pending, refund window Ended, expect Success
};

const { PES, PEF, PI, WI, WE, RI, RE } = PaymentState;

async function withdrawCoursePaymentsHelper({
  courseId,
  fromIndex,
  toIndex,
  redeemer,
  validUntil,
  expectRevertWith,
  expectSuccessWith,
  expectations,
}) {
  let isInputError = false; // calculate using toIndex - fromIndex
  if (fromIndex <= 0 || fromIndex > toIndex) {
    isInputError = true;
  } else {
    const saleCount = await NewTreasury.saleCounterPerCourse(courseId);
    if (toIndex > Number(saleCount)) isInputError = true;
  }

  const input = {
    courseId,
    fromIndex,
    toIndex,
    redeemer,
    redeemerInitialNativeBalance: await ethers.provider.getBalance(redeemer.address),
  };

  const waitSuccess =
    expectSuccessWith && !expectRevertWith
      ? true
      : expectRevertWith && !expectSuccessWith
      ? false
      : (() => {
          throw new Error("Exactly one of expectSuccessWith or expectRevertWith must be defined.");
        })();

  let tokenStats = null;
  if (!isInputError) {
    tokenStats = await _validateExpectations(input, expectations);
  }

  const voucher = await withdrawVH.signVoucher({
    courseId,
    fromIndex,
    toIndex,
    redeemer: redeemer.address,
    validUntil,
  });

  let tx = null;
  let gasCost = 0n;

  if (!waitSuccess) {
    await expect(NewTreasury.connect(redeemer).withdrawCoursePayments(voucher)).to.be.revertedWith(expectRevertWith);
  } else if (waitSuccess) {
    const expectedWithdrawCount = expectations.filter((e) => e === PES).length;

    tx = await NewTreasury.connect(redeemer).withdrawCoursePayments(voucher);
    await expect(tx)
      .to.emit(NewTreasury, expectSuccessWith)
      .withArgs(courseId, fromIndex, toIndex, redeemer.address, expectedWithdrawCount);

    const receipt = await tx.wait();
    const effectiveGasPrice = receipt.effectiveGasPrice ?? receipt.gasPrice ?? 0n;
    gasCost = receipt.gasUsed * effectiveGasPrice;
  }

  if (!isInputError) {
    await _expectWithdraw(input, tokenStats, gasCost, expectations, waitSuccess);
  }
  return {
    tx,
    courseId,
    fromIndex,
    toIndex,
    redeemer,
    tokenStats,
  };
}

async function _validateExpectations(input, expectations) {
  const expectedLength = input.toIndex - input.fromIndex + 1;
  if (expectations.length !== expectedLength) {
    throw new Error(
      `expectations.length (${expectations.length}) must equal toIndex - fromIndex + 1 (${expectedLength})`
    );
  }

  const isValidCourseId = input.courseId > 0 && input.courseId <= (await NewTreasury.courseCounter());

  const tokenStats = new Map(); // tokenAddress -> { price, instructor, foundation, governance }
  const treasury = NewTreasury.target;
  const foundation = await NewTreasury.foundationAddress();
  const governance = await NewTreasury.governanceAddress();
  const instructor = input.redeemer.address;

  // validate my allegations
  for (let i = input.fromIndex; i <= input.toIndex; i++) {
    const expected = expectations[i - input.fromIndex]; // match index

    const paymentId = await NewTreasury.courseSaleRecords(input.courseId, i);

    const rawPayment = await NewTreasury.getPayment(paymentId);
    const payment = {
      courseId: rawPayment[0],
      payer: rawPayment[1],
      courseReceiver: rawPayment[2],
      tokenAddress: rawPayment[3],
      coursePrice: rawPayment[4],
      instructorShare: rawPayment[5],
      foundationShare: rawPayment[6],
      governanceShare: rawPayment[7],
      endOfRefundWindow: rawPayment[8],
      isRefunded: rawPayment[9],
      isWithdrawn: rawPayment[10],
    };

    const { isRefunded, isWithdrawn, endOfRefundWindow } = payment;
    const isInRefundWindow = endOfRefundWindow > BigInt(now);

    let actualState;
    if (isWithdrawn) {
      actualState = isInRefundWindow ? PaymentState.WI : PaymentState.WE;
    } else if (isRefunded) {
      actualState = isInRefundWindow ? PaymentState.RI : PaymentState.RE;
    } else if (isInRefundWindow) {
      actualState = PaymentState.PI;
    } else {
      actualState = expected === PaymentState.PEF ? PaymentState.PEF : PaymentState.PES;
    }

    //check my allegations
    expect(actualState).to.equal(
      expected,
      `Mismatch at index ${i} (paymentId ${paymentId}) → expected ${expected}, got ${actualState}`
    );

    if (!tokenStats.has(payment.tokenAddress)) {
      // İlk kez bu tokenAddress ile karşılaşıyoruz, balance'ları al ve cache'e yaz
      let initialBalances;
      if (payment.tokenAddress === ethers.ZeroAddress) {
        // Native token
        initialBalances = {
          instructor: await ethers.provider.getBalance(instructor),
          foundation: await ethers.provider.getBalance(foundation),
          governance: await ethers.provider.getBalance(governance),
          treasury: await ethers.provider.getBalance(treasury),
        };
      } else {
        const tokenContract = await ethers.getContractAt("IERC20", payment.tokenAddress);
        initialBalances = {
          instructor: await tokenContract.balanceOf(instructor),
          foundation: await tokenContract.balanceOf(foundation),
          governance: await tokenContract.balanceOf(governance),
          treasury: await tokenContract.balanceOf(treasury),
        };
      }

      tokenStats.set(payment.tokenAddress, {
        totalPrice: 0n,
        totalInstructor: 0n,
        totalFoundation: 0n,
        totalGovernance: 0n,
        initialBalances,
      });
    }

    if (actualState === PaymentState.PES) {
      const stats = tokenStats.get(payment.tokenAddress);
      stats.totalPrice += payment.coursePrice;
      stats.totalInstructor += payment.instructorShare;
      stats.totalFoundation += payment.foundationShare;
      stats.totalGovernance += payment.governanceShare;
    }
  }

  if (isValidCourseId) {
    // On-chain withdraw status ile expectations karşılaştır
    const [refundedOnChain, withdrawnOnChain, inWindowOnChain, readyOnChain] = await NewTreasury.checkWithdrawStatus(
      input.courseId,
      input.fromIndex,
      input.toIndex
    );

    const refunded = [];
    const withdrawn = [];
    const inWindow = [];
    const ready = [];
    for (let i = input.fromIndex; i <= input.toIndex; i++) {
      const expected = expectations[i - input.fromIndex];

      if ([PaymentState.RI, PaymentState.RE].includes(expected)) refunded.push(i);
      else if ([PaymentState.WI, PaymentState.WE].includes(expected)) withdrawn.push(i);
      else if (expected === PaymentState.PI) inWindow.push(i);
      else if ([PaymentState.PEF, PaymentState.PES].includes(expected)) ready.push(i);
    }

    expect(refundedOnChain.map((n) => Number(n))).to.have.members(refunded);
    expect(withdrawnOnChain.map((n) => Number(n))).to.have.members(withdrawn);
    expect(inWindowOnChain.map((n) => Number(n))).to.have.members(inWindow);
    expect(readyOnChain.map((n) => Number(n))).to.have.members(ready);
  }
  //else {
  //  // Wait revert if courseId is invalid
  //  await expect(NewTreasury.checkWithdrawStatus(input.courseId, input.fromIndex, input.toIndex)).to.be.revertedWith(
  //    "Invalid courseId"
  //  );
  //}

  return tokenStats;
}

async function _expectWithdraw(input, tokenStats, gasCost, expectations, waitSuccess) {
  const isValidCourseId = input.courseId > 0 && input.courseId <= (await NewTreasury.courseCounter());

  const treasury = NewTreasury.target;
  const instructor = input.redeemer.address;
  const foundation = await NewTreasury.foundationAddress();
  const governance = await NewTreasury.governanceAddress();

  for (const [token, stats] of tokenStats.entries()) {
    const { totalPrice, totalInstructor, totalFoundation, totalGovernance, initialBalances } = stats;

    if (token === ethers.ZeroAddress) {
      // Native token
      const newTreasury = await ethers.provider.getBalance(treasury);
      const newInstructor = await ethers.provider.getBalance(instructor);
      const newFoundation = await ethers.provider.getBalance(foundation);
      const newGovernance = await ethers.provider.getBalance(governance);

      if (waitSuccess) {
        expect(newTreasury).to.equal(initialBalances.treasury - totalPrice);
        expect(newInstructor).to.equal(initialBalances.instructor + totalInstructor - gasCost);
        expect(newFoundation).to.equal(initialBalances.foundation + totalFoundation);
        expect(newGovernance).to.equal(initialBalances.governance + totalGovernance);
      } else {
        expect(newInstructor).to.be.below(initialBalances.instructor);
        expect(newFoundation).to.equal(initialBalances.foundation);
        expect(newGovernance).to.equal(initialBalances.governance);
        expect(newTreasury).to.equal(initialBalances.treasury);
      }
    } else {
      const tokenContract = await ethers.getContractAt("IERC20", token);

      const newTreasury = await tokenContract.balanceOf(treasury);
      const newInstructor = await tokenContract.balanceOf(instructor);
      const newFoundation = await tokenContract.balanceOf(foundation);
      const newGovernance = await tokenContract.balanceOf(governance);

      if (waitSuccess) {
        expect(newTreasury).to.equal(initialBalances.treasury - totalPrice);
        expect(newInstructor).to.equal(initialBalances.instructor + totalInstructor);
        expect(newFoundation).to.equal(initialBalances.foundation + totalFoundation);
        expect(newGovernance).to.equal(initialBalances.governance + totalGovernance);
      } else {
        expect(newInstructor).to.equal(initialBalances.instructor);
        expect(newFoundation).to.equal(initialBalances.foundation);
        expect(newGovernance).to.equal(initialBalances.governance);
        expect(newTreasury).to.equal(initialBalances.treasury);
      }
    }
  }

  // Instructor native balance düşüşü gasCost kadar olmalı
  if (!tokenStats.has(ethers.ZeroAddress)) {
    const postNativeBalance = await ethers.provider.getBalance(instructor);
    if (waitSuccess) {
      expect(postNativeBalance).to.equal(
        input.redeemerInitialNativeBalance - gasCost,
        "Native balance should drop by gasCost even if token used was ERC20"
      );
    } else {
      expect(postNativeBalance).to.be.below(
        input.redeemerInitialNativeBalance,
        "Instructor native balance should decrease slightly due to revert gas cost"
      );
    }
  }

  // check contract state changes.
  for (let i = input.fromIndex; i <= input.toIndex; i++) {
    const expected = expectations[i - input.fromIndex];
    const paymentId = await NewTreasury.courseSaleRecords(input.courseId, i);
    const raw = await NewTreasury.getPayment(paymentId);

    const payment = {
      endOfRefundWindow: raw[8],
      isRefunded: raw[9],
      isWithdrawn: raw[10],
    };

    const isInRWindow = payment.endOfRefundWindow > BigInt(now);

    const expectedWithdrawn = {
      [WI]: true,
      [WE]: true,
      [RI]: false,
      [RE]: false,
      [PI]: false,
      [PEF]: false,
      [PES]: waitSuccess, // true if waitSuccess==true, false if waitSuccess==false
    }[expected];

    const expectedRefunded = [RI, RE].includes(expected);
    const expectedInRWindow = [WI, RI, PI].includes(expected);

    expect(expectedWithdrawn).to.not.equal(undefined, `Unhandled expected state: ${expected}`);
    expect(payment.isWithdrawn).to.equal(
      expectedWithdrawn,
      `Expected ${expected}: isWithdrawn = ${expectedWithdrawn}, got ${payment.isWithdrawn} at ${paymentId}`
    );
    expect(payment.isRefunded).to.equal(
      expectedRefunded,
      `Expected ${expected}: isRefunded = ${expectedRefunded}, got ${payment.isRefunded} at ${paymentId}`
    );
    expect(isInRWindow).to.equal(
      expectedInRWindow,
      `Expected ${expected}: refund window should be ${expectedInRWindow ? "open" : "closed"} at ${paymentId}`
    );
  }
  if (isValidCourseId) {
    // Final check with checkWithdrawStatus
    const [refundedOnChain, withdrawnOnChain, inWindowOnChain, readyOnChain] = await NewTreasury.checkWithdrawStatus(
      input.courseId,
      input.fromIndex,
      input.toIndex
    );

    const refunded = [];
    const withdrawn = [];
    const inWindow = [];
    const ready = [];

    for (let i = input.fromIndex; i <= input.toIndex; i++) {
      const expected = expectations[i - input.fromIndex];

      if ([RI, RE].includes(expected)) refunded.push(i);
      else if ([WI, WE].includes(expected) || (expected === PES && waitSuccess)) withdrawn.push(i);
      else if (expected === PI) inWindow.push(i);
      else if ([PEF, PES].includes(expected) && !(expected === PES && waitSuccess)) ready.push(i);
    }

    expect(refundedOnChain.map((n) => Number(n))).to.have.members(refunded);
    expect(withdrawnOnChain.map((n) => Number(n))).to.have.members(withdrawn);
    expect(inWindowOnChain.map((n) => Number(n))).to.have.members(inWindow);
    expect(readyOnChain.map((n) => Number(n))).to.have.members(ready);
  }
}

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

  // 1. Course Management
  describe("📘 COURSE MANAGEMENT", function () {
    describe("✅ Success Cases", function () {
      it("should create a course with valid voucher", async function () {
        // Step 1: instructor1 creates a course via CreateCourseVoucher
        const course1 = await createCourseHelper({
          uri: "https://example.com/course/1",
          withdrawers: [instructor1.address, instructor2.address],
          redeemer: instructor1,
          validUntil: now + 86400,
          expectSuccessWith: "CourseCreated",
        });
        // Expect: "CourseCreated" with expected success states
      });

      it("should update an existing course with valid voucher", async function () {
        // Step 1: instructor1 creates a course via CreateCourseVoucher
        const course1 = await createCourseHelper({
          uri: "https://example.com/course/1",
          withdrawers: [instructor1.address, instructor2.address],
          redeemer: instructor1,
          validUntil: now + 86400,
          expectSuccessWith: "CourseCreated",
        });
        // Step 2: instructor1 updates course via UpdateCourseVoucher
        const update_course1 = await updateCourseHelper({
          courseId: course1.courseId,
          uri: "https://example.com/course/1New",
          sellable: false,
          withdrawers: [instructor1.address, instructor3.address],
          redeemer: instructor1,
          validUntil: now + 86400,
          expectSuccessWith: "CourseUpdated",
          previousWithdrawers: course1.withdrawers,
        });
        // Expect: "CourseUpdated" with expected success states
      });

      it("should allow reusing a URI after course updates it to a new URI", async function () {
        // Step 1: instructor1 creates a course with URI_A
        const createA = await createCourseHelper({
          uri: "https://example.com/uri-a",
          withdrawers: [instructor1.address],
          redeemer: instructor1,
          validUntil: now + 86400,
          expectSuccessWith: "CourseCreated",
        });

        // Step 2: instructor1 updates that course to URI_B
        const updateToB = await updateCourseHelper({
          courseId: createA.courseId,
          uri: "https://example.com/uri-b",
          sellable: createA.sellable,
          withdrawers: createA.withdrawers,
          redeemer: instructor1,
          validUntil: now + 86400,
          expectSuccessWith: "CourseUpdated",
          previousWithdrawers: createA.withdrawers,
        });

        // Step 3: instructor1 creates a new course again using URI_A
        const createAgainA = await createCourseHelper({
          uri: "https://example.com/uri-a",
          withdrawers: [instructor1.address],
          redeemer: instructor1,
          validUntil: now + 86400,
          expectSuccessWith: "CourseCreated",
        });
        // Expect: all 3 steps succeed, and URI_A is used again for the second course
      });

      it("should allow course creation if redeemer is backend and not in withdrawers", async function () {
        // Step 1: backend creates a course for other withdrawers
        const course1 = await createCourseHelper({
          uri: "https://example.com/backend-not-in-withdrawers",
          withdrawers: [instructor2.address, instructor3.address],
          redeemer: backend,
          validUntil: now + 86400,
          expectSuccessWith: "CourseCreated",
        });
        // Expect: "CourseCreated" with expected success states
      });

      it("should allow course update if redeemer is backend and not in withdrawers", async function () {
        // Step 1: instructor1 creates a valid course
        const course1 = await createCourseHelper({
          uri: "https://example.com/backend-update-course",
          withdrawers: [instructor1.address],
          redeemer: instructor1,
          validUntil: now + 86400,
          expectSuccessWith: "CourseCreated",
        });

        // Step 2: backend updates the course (not in withdrawers)
        const update_course1 = await updateCourseHelper({
          courseId: course1.courseId,
          uri: "https://example.com/backend-updated-uri",
          sellable: true,
          withdrawers: [instructor2.address, instructor3.address], // yeni withdrawer set
          redeemer: backend, // backend yetkili
          validUntil: now + 86400,
          expectSuccessWith: "CourseUpdated",
          previousWithdrawers: course1.withdrawers,
        });
        // Expect: update succeeds via backend signer
      });

      it("should allow creating a course with duplicate withdrawers", async function () {
        // Step 1: instructor1 creates a course with duplicate withdrawers
        const course = await createCourseHelper({
          uri: "https://example.com/duplicate-withdrawers",
          withdrawers: [instructor1.address, instructor1.address, instructor1.address],
          redeemer: instructor1,
          validUntil: now + 86400,
          expectSuccessWith: "CourseCreated",
        });
        // Expect: "CourseCreated" with expected success states
      });

      it("should allow multiple course creations with unique URIs", async function () {
        // Step 1: Create course 1
        const course1 = await createCourseHelper({
          uri: "https://example.com/multi/1",
          withdrawers: [instructor1.address, instructor2.address],
          redeemer: instructor1,
          validUntil: now + 86400,
          expectSuccessWith: "CourseCreated",
        });

        // Step 2: Create course 2
        const course2 = await createCourseHelper({
          uri: "https://example.com/multi/2",
          withdrawers: [instructor2.address, instructor1.address],
          redeemer: instructor2,
          validUntil: now + 86400,
          expectSuccessWith: "CourseCreated",
        });

        // Step 3: Create course 3
        const course3 = await createCourseHelper({
          uri: "https://example.com/multi/3",
          withdrawers: [instructor1.address, instructor3.address, instructor2.address],
          redeemer: instructor2,
          validUntil: now + 86400,
          expectSuccessWith: "CourseCreated",
        });
        // Expect: all 3 courses created successfully with unique URIs
      });

      it("should allow isolated and combined updates of sellable, withdrawers, and URI", async function () {
        // Step 1: create course
        const course1 = await createCourseHelper({
          uri: "https://example.com/isolate/initial",
          withdrawers: [instructor1.address],
          redeemer: instructor1,
          validUntil: now + 86400,
          expectSuccessWith: "CourseCreated",
        });

        // Step 2: update only sellable toggle
        const update1 = await updateCourseHelper({
          courseId: course1.courseId,
          uri: course1.uri,
          sellable: false,
          withdrawers: course1.withdrawers,
          redeemer: instructor1,
          validUntil: now + 86400,
          expectSuccessWith: "CourseUpdated",
          previousWithdrawers: course1.withdrawers,
        });

        // Step 3: update only withdrawers
        const update2 = await updateCourseHelper({
          courseId: course1.courseId,
          uri: update1.uri,
          sellable: update1.sellable,
          withdrawers: [instructor2.address],
          redeemer: instructor2,
          validUntil: now + 86400,
          expectSuccessWith: "CourseUpdated",
          previousWithdrawers: update1.withdrawers,
        });

        // Step 4: update only URI
        const update3 = await updateCourseHelper({
          courseId: course1.courseId,
          uri: "https://example.com/isolate/only-uri",
          sellable: update2.sellable,
          withdrawers: update2.withdrawers,
          redeemer: instructor2,
          validUntil: now + 86400,
          expectSuccessWith: "CourseUpdated",
          previousWithdrawers: update2.withdrawers,
        });

        // Step 5: update all fields at once
        const update4 = await updateCourseHelper({
          courseId: course1.courseId,
          uri: "https://example.com/isolate/all-updated",
          sellable: true,
          withdrawers: [instructor2.address, instructor3.address],
          redeemer: instructor2,
          validUntil: now + 86400,
          expectSuccessWith: "CourseUpdated",
          previousWithdrawers: update3.withdrawers,
        });
        // Expect: all updates succeed, each isolated and combined update works as expected
      });

      it("should allow redundant updates with partial or full parameter repetition", async function () {
        // Step 1: create course
        const course1 = await createCourseHelper({
          uri: "https://example.com/redundant/start",
          withdrawers: [instructor1.address],
          redeemer: instructor1,
          validUntil: now + 86400,
          expectSuccessWith: "CourseCreated",
        });

        // Step 2: sellable same (true), URI and withdrawers change
        const update1 = await updateCourseHelper({
          courseId: course1.courseId,
          uri: "https://example.com/redundant/uri1",
          sellable: true,
          withdrawers: [instructor2.address],
          redeemer: instructor2,
          validUntil: now + 86400,
          expectSuccessWith: "CourseUpdated",
          previousWithdrawers: course1.withdrawers,
        });

        // Step 3: withdrawers same as step2, sellable and URI change
        const update2 = await updateCourseHelper({
          courseId: course1.courseId,
          uri: "https://example.com/redundant/uri2-3",
          sellable: false,
          withdrawers: update1.withdrawers,
          redeemer: instructor2,
          validUntil: now + 86400,
          expectSuccessWith: "CourseUpdated",
          previousWithdrawers: update1.withdrawers,
        });

        // Step 4: URI same as step3, sellable and withdrawers change
        const update3 = await updateCourseHelper({
          courseId: course1.courseId,
          uri: update2.uri,
          sellable: true,
          withdrawers: [instructor3.address],
          redeemer: instructor3,
          validUntil: now + 86400,
          expectSuccessWith: "CourseUpdated",
          previousWithdrawers: update2.withdrawers,
        });

        // Step 5: all params same as step3
        const update4 = await updateCourseHelper({
          courseId: course1.courseId,
          uri: update3.uri,
          sellable: update3.sellable,
          withdrawers: update3.withdrawers,
          redeemer: instructor3,
          validUntil: now + 86400,
          expectSuccessWith: "CourseUpdated",
          previousWithdrawers: update3.withdrawers,
        });
        // Expect: all updates succeed, selective redundancy is handled gracefully
      });
      /////### End of Success Cases###/////
    });

    describe("❌ Failure Cases", function () {
      it("should fail to create a course with invalid signer", async function () {
        // Step 1: Override default createVH and get a new voucher with invalid signer
        createVH = getVoucherHelpers({ signer: instructor3 }).createVH;
        // Step 2: Try to create a course with invalid signer
        const course1 = await createCourseHelper({
          uri: "https://example.com/course/1",
          withdrawers: [instructor1.address, instructor2.address],
          redeemer: instructor1,
          validUntil: now + 86400,
          expectRevertWith: "Signature invalid or unauthorized",
        });
        // Expect: Reverts with "Signature invalid or unauthorized"
      });

      it("should fail to update a course with invalid signer", async function () {
        // Step 1: Create course with valid signer (backend)
        const course1 = await createCourseHelper({
          uri: "https://example.com/course/1",
          withdrawers: [instructor1.address],
          redeemer: instructor1,
          validUntil: now + 86400,
          expectSuccessWith: "CourseCreated",
        });

        // Step 2: Override default updateVH and get a new voucher with invalid signer
        updateVH = getVoucherHelpers({ signer: instructor1 }).updateVH;

        // Step 3: Try to update course using invalid signer
        const updated = await updateCourseHelper({
          courseId: course1.courseId,
          uri: "https://example.com/course/1-updated",
          sellable: false,
          withdrawers: [instructor1.address],
          redeemer: instructor1,
          validUntil: now + 86400,
          expectRevertWith: "Signature invalid or unauthorized",
          previousWithdrawers: course1.withdrawers,
        });

        // Expect: Reverts with "Signature invalid or unauthorized"
      });

      it("should fail to create a course with expired voucher", async function () {
        // Step 1: set up an expired timestamp for the voucher validUntil
        const expiredTimestamp = now - 60; // 1 dakika önce

        // Step 2: Try to create a course with an expired voucher
        const course1 = await createCourseHelper({
          uri: "https://example.com/expired-voucher",
          withdrawers: [instructor1.address],
          redeemer: instructor1,
          validUntil: expiredTimestamp,
          expectRevertWith: "Voucher expired",
        });

        // Expect: Reverts with "Voucher expired"
      });

      it("should fail to update a course with expired voucher", async function () {
        // Step 1: instructor1 creates a valid course first
        const course1 = await createCourseHelper({
          uri: "https://example.com/original-course",
          withdrawers: [instructor1.address],
          redeemer: instructor1,
          validUntil: now + 86400,
          expectSuccessWith: "CourseCreated",
        });

        // Step 2: set up an expired validUntil timestamp
        const expiredTimestamp = now - 60; // 1 dakika önce

        // Step 3: try to update the course using an expired voucher
        const update1 = await updateCourseHelper({
          courseId: course1.courseId,
          uri: "https://example.com/expired-update",
          sellable: false,
          withdrawers: course1.withdrawers,
          redeemer: instructor1,
          validUntil: expiredTimestamp,
          expectRevertWith: "Voucher expired",
          previousWithdrawers: course1.withdrawers,
        });

        // Expect: Reverts with "Voucher expired"
      });

      it("should fail to create a course with duplicate URI", async function () {
        // Step 1: instructor1 creates a course via CreateCourseVoucher
        const course1 = await createCourseHelper({
          uri: "https://example.com/course/duplicate",
          withdrawers: [instructor1.address],
          redeemer: instructor1,
          validUntil: now + 86400,
          expectSuccessWith: "CourseCreated",
        });
        // Step 2: Try to create another course with the same URI and same voucher
        const course2 = await createCourseHelper({
          uri: "https://example.com/course/duplicate",
          withdrawers: [instructor1.address],
          redeemer: instructor1,
          validUntil: now + 86400,
          expectRevertWith: "URI already used",
        });
        // Expect: Reverts with "URI already used", with failure states
      });

      it("should fail to create a course with same URI but different withdrawers", async function () {
        // Step 1: instructor1 creates first course with URI
        await createCourseHelper({
          uri: "https://example.com/same-uri-different-withdrawers",
          withdrawers: [instructor1.address],
          redeemer: instructor1,
          validUntil: now + 86400,
          expectSuccessWith: "CourseCreated",
        });

        // Step 2: Try to create another course with same URI but different withdrawers
        await createCourseHelper({
          uri: "https://example.com/same-uri-different-withdrawers",
          withdrawers: [instructor2.address],
          redeemer: instructor2,
          validUntil: now + 86400,
          expectRevertWith: "URI already used",
        });
      });

      it("should fail to update course with a URI that is already used by another course", async function () {
        // Step 1: instructor1 creates first course with URI-A
        const courseA = await createCourseHelper({
          uri: "https://example.com/uri-a",
          withdrawers: [instructor1.address],
          redeemer: instructor1,
          validUntil: now + 86400,
          expectSuccessWith: "CourseCreated",
        });

        // Step 2: instructor2 creates second course with URI-B
        const courseB = await createCourseHelper({
          uri: "https://example.com/uri-b",
          withdrawers: [instructor2.address],
          redeemer: instructor2,
          validUntil: now + 86400,
          expectSuccessWith: "CourseCreated",
        });

        // Step 3: Try to update their course to use URI-A (which is already taken)
        const updateB = await updateCourseHelper({
          courseId: courseB.courseId,
          uri: "https://example.com/uri-a", // trying to reuse uri-a
          sellable: courseB.sellable,
          withdrawers: courseB.withdrawers,
          redeemer: instructor2,
          validUntil: now + 86400,
          expectRevertWith: "New URI already used",
          previousWithdrawers: courseB.withdrawers,
        });
        // Expect: Reverts with "New URI already used"
      });

      it("should fail to create a course with more than 4 withdrawers", async function () {
        // Step 1: Read maxAllowedWithdrawers from contract and convert to Number
        const max = Number(await NewTreasury.maxAllowedWithdrawers());

        // Step 2: Generate (max + 1) random addresses
        const extraWithdrawers = [];
        for (let i = 0; i < max + 1; i++) {
          extraWithdrawers.push(ethers.Wallet.createRandom().address);
        }

        // Step 3: Try to create a course with too many withdrawers
        const course = await createCourseHelper({
          uri: "https://example.com/exceed-withdrawers",
          withdrawers: extraWithdrawers,
          redeemer: instructor1,
          validUntil: now + 86400,
          expectRevertWith: "Max withdrawers exceeded",
        });
        // Expect: Reverts with "Max withdrawers exceeded"
      });

      it("should fail to update a course with more than allowed withdrawers", async function () {
        // Step 1: instructor1 creates a course with valid withdrawers
        const course = await createCourseHelper({
          uri: "https://example.com/original-update",
          withdrawers: [instructor1.address],
          redeemer: instructor1,
          validUntil: now + 86400,
          expectSuccessWith: "CourseCreated",
        });

        // Step 2: Read maxAllowedWithdrawers from contract and convert to Number
        const max = Number(await NewTreasury.maxAllowedWithdrawers());

        // Step 3: Generate (max + 1) random addresses
        const extraWithdrawers = [];
        for (let i = 0; i < max + 1; i++) {
          extraWithdrawers.push(ethers.Wallet.createRandom().address);
        }
        extraWithdrawers.push(instructor1.address); // Ensure redeemer is included

        // Step 4: Try to update the course with too many withdrawers
        const update = await updateCourseHelper({
          courseId: course.courseId,
          uri: "https://example.com/updated-uri-exceed",
          sellable: true,
          withdrawers: extraWithdrawers,
          redeemer: instructor1,
          validUntil: now + 86400,
          expectRevertWith: "Max withdrawers exceeded",
          previousWithdrawers: course.withdrawers,
        });
        // Expect: Reverts with "Max withdrawers exceeded"
      });

      it("should fail to create a course if any withdrawer is address(0)", async function () {
        // Step 1: Construct withdrawers array where 3rd, and 4th are zero address
        const invalidWithdrawers = [
          instructor3.address, // index 0 → valid
          instructor1.address, // index 1 → valid
          ethers.ZeroAddress, // index 2 → invalid
          ethers.ZeroAddress, // index 3 → invalid
        ];

        // Step 2: Try to create course
        const course = await createCourseHelper({
          uri: "https://example.com/zero-address-withdrawer",
          withdrawers: invalidWithdrawers,
          redeemer: instructor1,
          validUntil: now + 86400,
          expectRevertWith: "Withdrawer cannot be zero address",
        });
        // Expect: Reverts with "Zero address not allowed"
      });

      it("should fail to update a course if any withdrawer is address(0)", async function () {
        // Step 1: Create valid course first
        const course = await createCourseHelper({
          uri: "https://example.com/valid-course-to-update",
          withdrawers: [instructor1.address],
          redeemer: instructor1,
          validUntil: now + 86400,
          expectSuccessWith: "CourseCreated",
        });

        // Step 2: Set withdrawers with zero addresses in index 0
        const invalidWithdrawers = [instructor1.address, ethers.ZeroAddress];

        // Step 3: Try to update course
        const update = await updateCourseHelper({
          courseId: course.courseId,
          uri: "https://example.com/update-with-zero",
          sellable: true,
          withdrawers: invalidWithdrawers,
          redeemer: instructor1,
          validUntil: now + 86400,
          expectRevertWith: "Withdrawer cannot be zero address",
          previousWithdrawers: course.withdrawers,
        });
        // Expect: Reverts with "Zero address not allowed"
      });

      it("should fail to create a course with empty withdrawers array", async function () {
        // Step 1: Try to create course with empty withdrawers
        const course = await createCourseHelper({
          uri: "https://example.com/empty-withdrawer",
          withdrawers: [],
          redeemer: instructor1,
          validUntil: now + 86400,
          expectRevertWith: "Withdrawers required",
        });
        // Expect: Reverts with "Withdrawers required"
      });

      it("should fail to update a course with empty withdrawers array", async function () {
        // Step 1: Create a valid course
        const course = await createCourseHelper({
          uri: "https://example.com/to-be-emptied",
          withdrawers: [instructor1.address],
          redeemer: instructor1,
          validUntil: now + 86400,
          expectSuccessWith: "CourseCreated",
        });

        // Step 2: Try to update course with empty withdrawers
        const update = await updateCourseHelper({
          courseId: course.courseId,
          uri: "https://example.com/emptied-uri",
          sellable: true,
          withdrawers: [],
          redeemer: instructor1,
          validUntil: now + 86400,
          expectRevertWith: "Withdrawers required",
          previousWithdrawers: course.withdrawers,
        });
        // Expect: Reverts with "Withdrawers required"
      });

      it("should fail to create a course if redeemer is not in withdrawers and not backend", async function () {
        // Step 1: Try to create a course where redeemer is not in withdrawers and not backend
        const course1 = await createCourseHelper({
          uri: "https://example.com/redeemer-not-in-withdrawers",
          withdrawers: [instructor2.address, instructor3.address], // instructor1 yok
          redeemer: instructor1,
          validUntil: now + 86400,
          expectRevertWith: "Redeemer must be backend role if not any withdrawer",
        });
        // Expect: Reverts due to invalid role
      });

      it("should fail to update course if redeemer is not in withdrawers and not backend", async function () {
        // Step 1: instructor1 creates a valid course
        const course1 = await createCourseHelper({
          uri: "https://example.com/redeemer-not-in-withdrawers-update",
          withdrawers: [instructor1.address],
          redeemer: instructor1,
          validUntil: now + 86400,
          expectSuccessWith: "CourseCreated",
        });

        // Step 2: instructor2 tries to update, but is not in withdrawers
        const update1_course1 = await updateCourseHelper({
          courseId: course1.courseId,
          uri: "https://example.com/invalid-update-attempt",
          sellable: false,
          withdrawers: [instructor3.address],
          redeemer: instructor2,
          validUntil: now + 86400,
          expectRevertWith: "Redeemer must be backend role if not any withdrawer",
          previousWithdrawers: course1.withdrawers,
        });

        // Expect: revert due to unauthorized redeemer
      });

      it("should fail to create a course with empty URI", async function () {
        // Step 1: Try to create a course with empty URI
        const course1 = await createCourseHelper({
          uri: "", // boş string
          withdrawers: [instructor1.address],
          redeemer: instructor1,
          validUntil: now + 86400,
          expectRevertWith: "Course URI empty",
        });
        // Expect: Reverts with "Course URI empty"
      });

      it("should fail to update a course with empty URI", async function () {
        // Step 1: instructor1 creates a valid course first
        const course1 = await createCourseHelper({
          uri: "https://example.com/original-uri",
          withdrawers: [instructor1.address],
          redeemer: instructor1,
          validUntil: now + 86400,
          expectSuccessWith: "CourseCreated",
        });

        // Step 2: Try to update the course with empty URI
        const update1_course1 = await updateCourseHelper({
          courseId: course1.courseId,
          uri: "", // boş URI
          sellable: true,
          withdrawers: [instructor1.address],
          redeemer: instructor1,
          validUntil: now + 86400,
          expectRevertWith: "Course URI empty",
          previousWithdrawers: course1.withdrawers,
        });
        // Expect: Reverts with "Course URI empty"
      });

      it("should fail to update a course with courseId = 0", async function () {
        // Step 1: try to update courseId = 0
        const update1 = await updateCourseHelper({
          courseId: 0,
          uri: "https://example.com/update-zero-id",
          sellable: true,
          withdrawers: [instructor1.address],
          redeemer: instructor1,
          validUntil: now + 86400,
          expectRevertWith: "Invalid courseId",
          previousWithdrawers: [], // ID 0 zaten yok
        });
        // Expect: Reverts with "Invalid courseId"
      });

      it("should fail to update a course with non-existing courseId", async function () {
        // Step 1: Get current courseCounter, then +1 to get a nonexistent ID
        const current = await NewTreasury.courseCounter();
        const nonexistentId = current + 1n;

        // Step 2: Try to update a course with this nonexistent ID
        const update1 = await updateCourseHelper({
          courseId: nonexistentId,
          uri: "https://example.com/nonexistent-id",
          sellable: true,
          withdrawers: [instructor1.address],
          redeemer: instructor1,
          validUntil: now + 86400,
          expectRevertWith: "Invalid courseId",
          previousWithdrawers: [], // course zaten yok
        });
        // Expect: Reverts with "Invalid courseId"

        // Step 3: Create a course with valid ID to increase courseCounter
        const course1 = await createCourseHelper({
          uri: "https://example.com/valid-course-for-high-id",
          withdrawers: [instructor1.address],
          redeemer: instructor1,
          validUntil: now + 86400,
          expectSuccessWith: "CourseCreated",
        });

        // Step 4: Get the new courseCounter after creation
        const currentAfterCreate = await NewTreasury.courseCounter();
        const nonExistentIdAfterCreate = currentAfterCreate + 1n;

        // Step 5: Try to update again with the new nonexistent ID
        const update2 = await updateCourseHelper({
          courseId: nonExistentIdAfterCreate,
          uri: "https://example.com/update-nonexistent-id",
          sellable: true,
          withdrawers: [instructor1.address],
          redeemer: instructor1,
          validUntil: now + 86400,
          expectRevertWith: "Invalid courseId",
          previousWithdrawers: [], // çünkü o ID yok
        });
        // Expect: Reverts with "Invalid courseId"
      });
      /////###End of Failure Cases###/////
    });
    /////###End of Course Management###/////
  });

  // 2. Course Purchase
  describe("💰 COURSE PURCHASE", function () {
    describe("✅ Success Cases", function () {
      it("should allow a user to buy a course using an ERC20 token and a valid voucher", async function () {
        // Step 1: instructor1 creates a course
        const course1 = await createCourseHelper({
          uri: "https://example.com/course/1",
          withdrawers: [instructor1.address, instructor2.address],
          redeemer: instructor1,
          validUntil: now + 86400,
          expectSuccessWith: "CourseCreated",
        });
        // Step 2: buyer1 buys course for person1
        const buy_course1 = await buyCourseHelper({
          courseId: course1.courseId,
          tokenAddress: MKT1.target,
          coursePrice: ethers.parseEther("10"),
          courseReceiver: person1.address,
          redeemer: buyer1,
          validUntil: now + 86400,
          nativeMsgValue: 0,
          expectSuccessWith: "ContentPurchased",
        });
        // Step 3: Expect "ContentPurchased" event with expected success states
      });

      it("should allow a user to buy a course using native token and a valid voucher", async function () {
        // Step 1: instructor1 creates a course
        const course1 = await createCourseHelper({
          uri: "https://example.com/course/1",
          withdrawers: [instructor1.address, instructor2.address],
          redeemer: instructor1,
          validUntil: now + 86400,
          expectSuccessWith: "CourseCreated",
        });
        // Step 2: buyer1 buys course for person1 with native token
        const buy_course1 = await buyCourseHelper({
          courseId: course1.courseId,
          tokenAddress: ethers.ZeroAddress, // native token
          coursePrice: ethers.parseEther("10"),
          courseReceiver: person1.address,
          redeemer: buyer1,
          validUntil: now + 86400,
          nativeMsgValue: ethers.parseEther("10"),
          expectSuccessWith: "ContentPurchased",
        });
        // Step 3: Expect "ContentPurchased" event with expected success states
      });

      it("should allow a user to buy multiple different courses", async function () {
        // Step 1: instructors creates 3 different courses
        const course1 = await createCourseHelper({
          uri: "https://example.com/course/1",
          withdrawers: [instructor1.address],
          redeemer: instructor1,
          validUntil: now + 86400,
          expectSuccessWith: "CourseCreated",
        });

        const course2 = await createCourseHelper({
          uri: "https://example.com/course/2",
          withdrawers: [instructor1.address],
          redeemer: instructor1,
          validUntil: now + 86400,
          expectSuccessWith: "CourseCreated",
        });

        const course3 = await createCourseHelper({
          uri: "https://example.com/course/3",
          withdrawers: [instructor2.address],
          redeemer: instructor2,
          validUntil: now + 86400,
          expectSuccessWith: "CourseCreated",
        });

        // Step 2: buyers buys all 3 courses for person1
        const buy1 = await buyCourseHelper({
          courseId: course1.courseId,
          tokenAddress: MKT1.target,
          coursePrice: ethers.parseEther("10"),
          courseReceiver: person1.address,
          redeemer: buyer1,
          validUntil: now + 86400,
          nativeMsgValue: 0,
          expectSuccessWith: "ContentPurchased",
        });

        const buy2 = await buyCourseHelper({
          courseId: course2.courseId,
          tokenAddress: ethers.ZeroAddress,
          coursePrice: ethers.parseEther("5"),
          courseReceiver: person1.address,
          redeemer: buyer1,
          validUntil: now + 86400,
          nativeMsgValue: ethers.parseEther("5"),
          expectSuccessWith: "ContentPurchased",
        });

        const buy3 = await buyCourseHelper({
          courseId: course3.courseId,
          tokenAddress: MKT2.target,
          coursePrice: ethers.parseEther("15"),
          courseReceiver: person1.address,
          redeemer: buyer2,
          validUntil: now + 86400,
          nativeMsgValue: 0,
          expectSuccessWith: "ContentPurchased",
        });
        // Expect: all purchases succeed with "ContentPurchased" event
      });

      it("should allow a user to buy a course for themselves", async function () {
        // Step 1: instructor1 creates a course
        const course = await createCourseHelper({
          uri: "https://example.com/self-buy",
          withdrawers: [instructor1.address],
          redeemer: instructor1,
          validUntil: now + 86400,
          expectSuccessWith: "CourseCreated",
        });

        // Step 2: buyer1 buys course for themselves
        const buy_course1 = await buyCourseHelper({
          courseId: course.courseId,
          tokenAddress: MKT1.target,
          coursePrice: ethers.parseEther("10"),
          courseReceiver: buyer1.address, // self-buy
          redeemer: buyer1,
          validUntil: now + 86400,
          nativeMsgValue: 0,
          expectSuccessWith: "ContentPurchased",
        });
        // Expect: "ContentPurchased" event with expected success states
      });

      it("should allow a course to be sold to multiple receivers using different tokens and prices", async function () {
        // Step 1: instructor1 creates a course
        const course1 = await createCourseHelper({
          uri: "https://example.com/multi-sale",
          withdrawers: [instructor1.address],
          redeemer: instructor1,
          validUntil: now + 86400,
          expectSuccessWith: "CourseCreated",
        });

        // Step 2: person1 buys for 10 mtk1
        const buy1_course1 = await buyCourseHelper({
          courseId: course1.courseId,
          tokenAddress: MKT1.target,
          coursePrice: ethers.parseEther("10"),
          courseReceiver: person1.address,
          redeemer: backend,
          validUntil: now + 86400,
          nativeMsgValue: 0,
          expectSuccessWith: "ContentPurchased",
        });

        // Step 3: person2 buys for 5 mtk1
        const buy2_course1 = await buyCourseHelper({
          courseId: course1.courseId,
          tokenAddress: MKT1.target,
          coursePrice: ethers.parseEther("5"),
          courseReceiver: person2.address,
          redeemer: buyer1,
          validUntil: now + 86400,
          nativeMsgValue: 0,
          expectSuccessWith: "ContentPurchased",
        });

        // Step 4: person3 buys for 15 mtk2
        const buy3_course1 = await buyCourseHelper({
          courseId: course1.courseId,
          tokenAddress: MKT2.target,
          coursePrice: ethers.parseEther("15"),
          courseReceiver: person3.address,
          redeemer: buyer1,
          validUntil: now + 86400,
          nativeMsgValue: 0,
          expectSuccessWith: "ContentPurchased",
        });

        // Step 5: person4 buys for 20 eth (native)
        const buy4_course1 = await buyCourseHelper({
          courseId: course1.courseId,
          tokenAddress: ethers.ZeroAddress,
          coursePrice: ethers.parseEther("20"),
          courseReceiver: person4.address,
          redeemer: buyer1,
          validUntil: now + 86400,
          nativeMsgValue: ethers.parseEther("20"),
          expectSuccessWith: "ContentPurchased",
        });

        // Step 6: person5 buys for 25 eth (native)
        const buy5_course1 = await buyCourseHelper({
          courseId: course1.courseId,
          tokenAddress: ethers.ZeroAddress,
          coursePrice: ethers.parseEther("25"),
          courseReceiver: person5.address,
          redeemer: buyer1,
          validUntil: now + 86400,
          nativeMsgValue: ethers.parseEther("25"),
          expectSuccessWith: "ContentPurchased",
        });
        // Expect: all purchases succeed with "ContentPurchased" event
      });
      /////###End of Success Cases###/////
    });

    describe("❌ Failure Cases", function () {
      it("should fail to buy a course with invalid signer", async function () {
        // Step 1: Create a course
        const course1 = await createCourseHelper({
          uri: "https://example.com/course/invalid-signer-buy",
          withdrawers: [instructor1.address],
          redeemer: instructor1,
          validUntil: now + 86400,
          expectSuccessWith: "CourseCreated",
        });

        // Step 2: Override buyVH with invalid signer
        buyVH = getVoucherHelpers({ signer: instructor3 }).buyVH;

        // Step 3: Try to buy with invalid voucher signer
        const buy_course1 = await buyCourseHelper({
          courseId: course1.courseId,
          tokenAddress: MKT1.target,
          coursePrice: ethers.parseEther("10"),
          courseReceiver: person1.address,
          redeemer: buyer1,
          validUntil: now + 86400,
          nativeMsgValue: 0,
          expectRevertWith: "Signature invalid or unauthorized",
        });
        // Expect: Reverts with "Signature invalid or unauthorized"
      });

      it("should fail to buy a course with expired voucher", async function () {
        // Step 1: Create a course
        const course1 = await createCourseHelper({
          uri: "https://example.com/course/expired-buy",
          withdrawers: [instructor1.address],
          redeemer: instructor1,
          validUntil: now + 86400,
          expectSuccessWith: "CourseCreated",
        });

        // Step 2: Use expired timestamp
        const expired = now - 60;

        // Step 3: Try to buy with expired voucher
        const buy_course1 = await buyCourseHelper({
          courseId: course1.courseId,
          tokenAddress: MKT1.target,
          coursePrice: ethers.parseEther("10"),
          courseReceiver: person1.address,
          redeemer: buyer1,
          validUntil: expired,
          nativeMsgValue: 0,
          expectRevertWith: "Voucher expired",
        });
        // Expect: Reverts with "Voucher expired"
      });

      it("should fail if the same course is purchased twice for the same receiver", async function () {
        // Step 1: instructor1 creates a course
        const course1 = await createCourseHelper({
          uri: "https://example.com/duplicate-buy",
          withdrawers: [instructor1.address],
          redeemer: instructor1,
          validUntil: now + 86400,
          expectSuccessWith: "CourseCreated",
        });

        // Step 2: buyer1 buys the course for person1
        const buy1_course1 = await buyCourseHelper({
          courseId: course1.courseId,
          tokenAddress: MKT1.target,
          coursePrice: ethers.parseEther("10"),
          courseReceiver: person1.address,
          redeemer: buyer1,
          validUntil: now + 86400,
          nativeMsgValue: 0,
          expectSuccessWith: "ContentPurchased",
        });

        // Step 3: Try to buy the same course again for the same person → should revert
        const buy2_course1 = await buyCourseHelper({
          courseId: course1.courseId,
          tokenAddress: MKT1.target,
          coursePrice: ethers.parseEther("10"),
          courseReceiver: person1.address,
          redeemer: buyer2,
          validUntil: now + 86400,
          nativeMsgValue: 0,
          expectRevertWith: "Content receiver already owns this course",
        });
        // Expect: Reverts with "Content receiver already owns this course"
      });

      it("should fail to buy a course with courseId zero", async function () {
        // Step 1: Try to buy a course with courseId = 0
        const buy_course1 = await buyCourseHelper({
          courseId: 0,
          tokenAddress: MKT1.target,
          coursePrice: ethers.parseEther("10"),
          courseReceiver: person1.address,
          redeemer: buyer1,
          validUntil: now + 86400,
          nativeMsgValue: 0,
          expectRevertWith: "Invalid courseId",
        });
        // Step 2: Create a valid course (unrelated, just to init counter)
        const course1 = await createCourseHelper({
          uri: "https://example.com/course/valid",
          withdrawers: [instructor1.address],
          redeemer: instructor1,
          validUntil: now + 86400,
          expectSuccessWith: "CourseCreated",
        });

        // Step 3: Try to buy with courseId = 0
        const buy_course2 = await buyCourseHelper({
          courseId: 0,
          tokenAddress: MKT1.target,
          coursePrice: ethers.parseEther("10"),
          courseReceiver: person1.address,
          redeemer: buyer1,
          validUntil: now + 86400,
          nativeMsgValue: 0,
          expectRevertWith: "Invalid courseId",
        });
        // Expect: Reverts with "Invalid courseId"
      });

      it("should fail to buy a course with non-existent courseId", async function () {
        // Step 1: Get courseCounter from contract and increment by 1
        const invalidCourseId1 = (await NewTreasury.courseCounter()) + 1n;
        // Step 2: Try to buy a course with courseId = 0
        const buy1_course1 = await buyCourseHelper({
          courseId: invalidCourseId1,
          tokenAddress: MKT1.target,
          coursePrice: ethers.parseEther("10"),
          courseReceiver: person1.address,
          redeemer: buyer1,
          validUntil: now + 86400,
          nativeMsgValue: 0,
          expectRevertWith: "Invalid courseId",
        });
        // Step 3: Create a valid course (unrelated, just to init counter)
        const course1 = await createCourseHelper({
          uri: "https://example.com/course/valid",
          withdrawers: [instructor1.address],
          redeemer: instructor1,
          validUntil: now + 86400,
          expectSuccessWith: "CourseCreated",
        });

        // Step 4: Get again courseCounter from contract and increment by 1
        const invalidCourseId2 = (await NewTreasury.courseCounter()) + 1n;

        // Step 5: Try to buy with non-existent courseId
        const buy2_course1 = await buyCourseHelper({
          courseId: invalidCourseId2,
          tokenAddress: MKT1.target,
          coursePrice: ethers.parseEther("10"),
          courseReceiver: person1.address,
          redeemer: buyer1,
          validUntil: now + 86400,
          nativeMsgValue: 0,
          expectRevertWith: "Invalid courseId",
        });
        // Expect: Reverts with "Invalid courseId"
      });

      it("should fail to buy a course that is not sellable", async function () {
        // Step 1: instructor1 creates a course
        const course1 = await createCourseHelper({
          uri: "https://example.com/course/not-sellable",
          withdrawers: [instructor1.address],
          redeemer: instructor1,
          validUntil: now + 86400,
          expectSuccessWith: "CourseCreated",
        });

        // Step 2: backend disables the course for sale
        const update1_course1 = await updateCourseHelper({
          courseId: course1.courseId,
          uri: "https://example.com/course/not-sellable-updated",
          sellable: false, // set sellable to false
          withdrawers: course1.withdrawers,
          redeemer: backend,
          validUntil: now + 86400,
          expectSuccessWith: "CourseUpdated",
          previousWithdrawers: course1.withdrawers,
        });

        // Step 3: buyer1 tries to buy the course
        const buy_course1 = await buyCourseHelper({
          courseId: course1.courseId,
          tokenAddress: MKT1.target,
          coursePrice: ethers.parseEther("10"),
          courseReceiver: person1.address,
          redeemer: buyer1,
          validUntil: now + 86400,
          nativeMsgValue: 0,
          expectRevertWith: "Course is not sellable",
        });
        // Expect: Reverts with "Course is not sellable"
      });

      it("should fail to buy a course with zero price", async function () {
        // Step 1: instructor1 creates a course
        const course1 = await createCourseHelper({
          uri: "https://example.com/course/zero-price",
          withdrawers: [instructor1.address],
          redeemer: instructor1,
          validUntil: now + 86400,
          expectSuccessWith: "CourseCreated",
        });

        // Step 2: buyer1 tries to buy with zero price
        const buy_course1 = await buyCourseHelper({
          courseId: course1.courseId,
          tokenAddress: MKT1.target,
          coursePrice: 0n,
          courseReceiver: person1.address,
          redeemer: buyer1,
          validUntil: now + 86400,
          nativeMsgValue: 0,
          expectRevertWith: "Course price must be greater than 0",
        });
        // Expect: Reverts with "Course price must be greater than 0"
      });

      it("should fail to buy a course with zero price using native token", async function () {
        // Step 1: instructor1 creates a course
        const course1 = await createCourseHelper({
          uri: "https://example.com/course/zero-price-native",
          withdrawers: [instructor1.address],
          redeemer: instructor1,
          validUntil: now + 86400,
          expectSuccessWith: "CourseCreated",
        });

        // Step 2: buyer1 tries to buy with zero price and native token
        const buy_course1 = await buyCourseHelper({
          courseId: course1.courseId,
          tokenAddress: ethers.ZeroAddress, // native token
          coursePrice: 0n,
          courseReceiver: person1.address,
          redeemer: buyer1,
          validUntil: now + 86400,
          nativeMsgValue: 0,
          expectRevertWith: "Course price must be greater than 0",
        });
        // Expect: Reverts with "Course price must be greater than 0"
      });

      it("should fail to buy a course with incorrect native token amount (less or more than price)", async function () {
        // Step 1: instructor1 creates a course
        const course1 = await createCourseHelper({
          uri: "https://example.com/course/insufficient-native",
          withdrawers: [instructor1.address],
          redeemer: instructor1,
          validUntil: now + 86400,
          expectSuccessWith: "CourseCreated",
        });

        // Step 2: buyer1 tries to pay less than coursePrice in native token
        const buy_course1 = await buyCourseHelper({
          courseId: course1.courseId,
          tokenAddress: ethers.ZeroAddress,
          coursePrice: ethers.parseEther("10"),
          courseReceiver: person1.address,
          redeemer: buyer1,
          validUntil: now + 86400,
          nativeMsgValue: ethers.parseEther("5"), // less than price
          expectRevertWith: "Incorrect amount sent for native token payment",
        });

        // Step 3: buyer1 tries to pay more than coursePrice in native token
        const buy_course2 = await buyCourseHelper({
          courseId: course1.courseId,
          tokenAddress: ethers.ZeroAddress,
          coursePrice: ethers.parseEther("10"),
          courseReceiver: person1.address,
          redeemer: buyer1,
          validUntil: now + 86400,
          nativeMsgValue: ethers.parseEther("15"), // more than price
          expectRevertWith: "Incorrect amount sent for native token payment",
        });
        // Expect: Incorrect amount sent in native payment
      });

      it("should fail to buy a course with ERC20 token if any native token value is sent", async function () {
        // Step 1: instructor1 creates a course
        const course1 = await createCourseHelper({
          uri: "https://example.com/course/erc20-with-native",
          withdrawers: [instructor1.address],
          redeemer: instructor1,
          validUntil: now + 86400,
          expectSuccessWith: "CourseCreated",
        });

        // Step 2: buyer1 tries to buy the course with ERC20 but sends native token value
        const buy_course1 = await buyCourseHelper({
          courseId: course1.courseId,
          tokenAddress: MKT1.target, // ERC20 token
          coursePrice: ethers.parseEther("10"),
          courseReceiver: person1.address,
          redeemer: buyer1,
          validUntil: now + 86400,
          nativeMsgValue: ethers.parseEther("1"), // should be 0
          expectRevertWith: "Use ERC20, not native token",
        });
        // Expect: Reverts with "Use ERC20, not native token"
      });
      /////###End of Failure Cases###/////
    });
    /////###End of Course Purchase###/////
  });

  // 3. Refunds: paymentId
  describe("💸 REFUNDS: refundCourse", function () {
    describe("✅ Success Cases", function () {
      it("should allow a course purchased with native token to be refunded", async function () {
        // Step 1: instructor1 creates a course
        const course1 = await createCourseHelper({
          uri: "https://example.com/course/native-refund",
          withdrawers: [instructor1.address],
          redeemer: instructor1,
          validUntil: now + 86400,
          expectSuccessWith: "CourseCreated",
        });

        // Step 2: buyer1 buys course for person1 with native token
        const buy_course1 = await buyCourseHelper({
          courseId: course1.courseId,
          tokenAddress: ethers.ZeroAddress,
          coursePrice: ethers.parseEther("7"),
          courseReceiver: person1.address,
          redeemer: buyer1,
          validUntil: now + 86400,
          nativeMsgValue: ethers.parseEther("7"),
          expectSuccessWith: "ContentPurchased",
        });

        // Step 3: buyer1 refunds the course
        const refund_course1 = await refundCourseHelper({
          paymentId: buy_course1.paymentId,
          redeemer: buyer1,
          validUntil: now + 86400,
          expectSuccessWith: "CourseRefunded",
        });
        // Expect: "CourseRefunded" event with expected success states
      });

      it("should allow a course purchased with ERC20 token to be refunded", async function () {
        // Step 1: instructor1 creates a course
        const course1 = await createCourseHelper({
          uri: "https://example.com/course/erc20-refund",
          withdrawers: [instructor1.address],
          redeemer: instructor1,
          validUntil: now + 86400,
          expectSuccessWith: "CourseCreated",
        });

        // Step 2: buyer1 buys course for person1 with ERC20 token
        const buy_course1 = await buyCourseHelper({
          courseId: course1.courseId,
          tokenAddress: MKT1.target,
          coursePrice: ethers.parseEther("5"),
          courseReceiver: person1.address,
          redeemer: buyer1,
          validUntil: now + 86400,
          nativeMsgValue: 0,
          expectSuccessWith: "ContentPurchased",
        });

        // Step 3: buyer1 refunds the course
        const refund_course1 = await refundCourseHelper({
          paymentId: buy_course1.paymentId,
          redeemer: buyer1,
          validUntil: now + 86400,
          expectSuccessWith: "CourseRefunded",
        });
        // Expect: "CourseRefunded" event with expected success states
      });

      it("should allow multiple courses purchased with ERC20 token to be refunded", async function () {
        // Step 1: instructor1 creates course1
        const course1 = await createCourseHelper({
          uri: "https://example.com/course/erc20-multi-1",
          withdrawers: [instructor1.address],
          redeemer: instructor1,
          validUntil: now + 86400,
          expectSuccessWith: "CourseCreated",
        });

        // Step 2: instructor1 creates course2
        const course2 = await createCourseHelper({
          uri: "https://example.com/course/erc20-multi-2",
          withdrawers: [instructor1.address],
          redeemer: instructor1,
          validUntil: now + 86400,
          expectSuccessWith: "CourseCreated",
        });

        // Step 3: instructor1 creates course3
        const course3 = await createCourseHelper({
          uri: "https://example.com/course/erc20-multi-3",
          withdrawers: [instructor3.address],
          redeemer: instructor3,
          validUntil: now + 86400,
          expectSuccessWith: "CourseCreated",
        });

        // Step 4: buyer1 buys all three courses for person1 with ERC20 token
        const buy_course1 = await buyCourseHelper({
          courseId: course1.courseId,
          tokenAddress: MKT1.target,
          coursePrice: ethers.parseEther("5"),
          courseReceiver: person1.address,
          redeemer: buyer1,
          validUntil: now + 86400,
          nativeMsgValue: 0,
          expectSuccessWith: "ContentPurchased",
        });

        const buy_course2 = await buyCourseHelper({
          courseId: course2.courseId,
          tokenAddress: MKT2.target,
          coursePrice: ethers.parseEther("7"),
          courseReceiver: person1.address,
          redeemer: buyer1,
          validUntil: now + 86400,
          nativeMsgValue: 0,
          expectSuccessWith: "ContentPurchased",
        });

        const buy_course3 = await buyCourseHelper({
          courseId: course3.courseId,
          tokenAddress: ethers.ZeroAddress, // native token
          coursePrice: ethers.parseEther("9"),
          courseReceiver: person1.address,
          redeemer: buyer1,
          validUntil: now + 86400,
          nativeMsgValue: ethers.parseEther("9"),
          expectSuccessWith: "ContentPurchased",
        });

        // Step 5: buyer1 refunds all three courses
        const refund1 = await refundCourseHelper({
          paymentId: buy_course1.paymentId,
          redeemer: buyer1,
          validUntil: now + 86400,
          expectSuccessWith: "CourseRefunded",
        });

        const refund2 = await refundCourseHelper({
          paymentId: buy_course2.paymentId,
          redeemer: buyer2,
          validUntil: now + 86400,
          expectSuccessWith: "CourseRefunded",
        });

        const refund3 = await refundCourseHelper({
          paymentId: buy_course3.paymentId,
          redeemer: buyer1,
          validUntil: now + 86400,
          expectSuccessWith: "CourseRefunded",
        });

        // Expect: Each refund emits "CourseRefunded" event with expected success states
      });

      it("should allow a course to be refunded by a different redeemer than the original buyer", async function () {
        // Step 1: instructor1 creates a course
        const course1 = await createCourseHelper({
          uri: "https://example.com/course/diff-redeemer",
          withdrawers: [instructor1.address],
          redeemer: instructor1,
          validUntil: now + 86400,
          expectSuccessWith: "CourseCreated",
        });

        // Step 2: buyer1 buys course for person1 using ERC20
        const buy_course = await buyCourseHelper({
          courseId: course1.courseId,
          tokenAddress: MKT1.target,
          coursePrice: ethers.parseEther("12"),
          courseReceiver: person1.address,
          redeemer: buyer1,
          validUntil: now + 86400,
          nativeMsgValue: 0,
          expectSuccessWith: "ContentPurchased",
        });

        // Step 3: buyer2 (a different redeemer) initiates refund
        const refund_course = await refundCourseHelper({
          paymentId: buy_course.paymentId,
          redeemer: buyer2,
          validUntil: now + 86400,
          expectSuccessWith: "CourseRefunded",
        });

        // Expect: "CourseRefunded" event with expected success states
      });

      it("should allow a course to be bought, refunded, and bought again by the same receiver", async function () {
        // Step 1: instructor1 creates a course
        const course1 = await createCourseHelper({
          uri: "https://example.com/course/rebuy-after-refund",
          withdrawers: [instructor1.address],
          redeemer: instructor1,
          validUntil: now + 86400,
          expectSuccessWith: "CourseCreated",
        });

        // Step 2: buyer1 buys course for person1
        const buy1 = await buyCourseHelper({
          courseId: course1.courseId,
          tokenAddress: MKT1.target,
          coursePrice: ethers.parseEther("9"),
          courseReceiver: person1.address,
          redeemer: buyer1,
          validUntil: now + 86400,
          nativeMsgValue: 0,
          expectSuccessWith: "ContentPurchased",
        });

        // Step 3: refund the course
        const refund1 = await refundCourseHelper({
          paymentId: buy1.paymentId,
          redeemer: buyer1,
          validUntil: now + 86400,
          expectSuccessWith: "CourseRefunded",
        });

        // Step 4: buy again
        const buy2 = await buyCourseHelper({
          courseId: course1.courseId,
          tokenAddress: MKT1.target,
          coursePrice: ethers.parseEther("9"),
          courseReceiver: person1.address,
          redeemer: buyer2,
          validUntil: now + 86400,
          nativeMsgValue: 0,
          expectSuccessWith: "ContentPurchased",
        });

        // Expect: both purchases and refund succeed
      });

      it("should allow refund if original refund window is still valid despite later refundWindow shortened", async function () {
        // Step 1: instructor1 creates a course
        const course1 = await createCourseHelper({
          uri: "https://example.com/refund-window-after-purchase",
          withdrawers: [instructor1.address],
          redeemer: instructor1,
          validUntil: now + 86400,
          expectSuccessWith: "CourseCreated",
        });

        // Step 2: buyer1 buys the course
        const buy_course = await buyCourseHelper({
          courseId: course1.courseId,
          tokenAddress: MKT1.target,
          coursePrice: ethers.parseEther("10"),
          courseReceiver: person1.address,
          redeemer: buyer1,
          validUntil: now + 86400,
          nativeMsgValue: 0,
          expectSuccessWith: "ContentPurchased",
        });

        // Step 3: set refundWindow to 1 day
        await NewTreasury.connect(backend).setRefundWindow(1 * 86400);

        // Step 4: fast forward 3 days
        await fastForwardTime({ days: 3 });

        // Step 5: refund should succeed since original refund window was longer
        const refund = await refundCourseHelper({
          paymentId: buy_course.paymentId,
          redeemer: buyer1,
          validUntil: now + 86400,
          expectSuccessWith: "CourseRefunded",
        });

        // Expect: Refund succeeds even though current refundWindow is 1 day
      });

      /////###End of Success Cases###/////
    });

    describe("❌ Failure Cases", function () {
      it("should fail to refund with invalid signer", async function () {
        // Step 1: instructor1 creates a course
        const course1 = await createCourseHelper({
          uri: "https://example.com/refund-invalid-signer",
          withdrawers: [instructor1.address],
          redeemer: instructor1,
          validUntil: now + 86400,
          expectSuccessWith: "CourseCreated",
        });

        // Step 2: buyer1 buys course for person1
        const buy_course = await buyCourseHelper({
          courseId: course1.courseId,
          tokenAddress: MKT1.target,
          coursePrice: ethers.parseEther("10"),
          courseReceiver: person1.address,
          redeemer: buyer1,
          validUntil: now + 86400,
          nativeMsgValue: 0,
          expectSuccessWith: "ContentPurchased",
        });

        // Step 3: Use wrong signer for the refund voucher
        refundVH = getVoucherHelpers({ signer: instructor2 }).refundVH;

        // Step 4: Attempt refund with invalid signer
        const refund_course = await refundCourseHelper({
          paymentId: buy_course.paymentId,
          redeemer: buyer1,
          validUntil: now + 86400,
          expectRevertWith: "Signature invalid or unauthorized",
        });
      });

      it("should fail to refund with expired voucher", async function () {
        // Step 1: instructor1 creates a course
        const course1 = await createCourseHelper({
          uri: "https://example.com/refund-expired",
          withdrawers: [instructor1.address],
          redeemer: instructor1,
          validUntil: now + 86400,
          expectSuccessWith: "CourseCreated",
        });

        // Step 2: buyer1 buys course for person1
        const buy_course = await buyCourseHelper({
          courseId: course1.courseId,
          tokenAddress: MKT1.target,
          coursePrice: ethers.parseEther("10"),
          courseReceiver: person1.address,
          redeemer: buyer1,
          validUntil: now + 86400,
          nativeMsgValue: 0,
          expectSuccessWith: "ContentPurchased",
        });

        // Step 3: Attempt refund with expired voucher
        const refund_course = await refundCourseHelper({
          paymentId: buy_course.paymentId,
          redeemer: buyer2,
          validUntil: now - 60, // expired
          expectRevertWith: "Voucher expired",
        });
      });

      it("should fail to refund twice for the same course", async function () {
        // Step 1: instructor1 creates a course
        const course1 = await createCourseHelper({
          uri: "https://example.com/refund-double",
          withdrawers: [instructor1.address],
          redeemer: instructor1,
          validUntil: now + 86400,
          expectSuccessWith: "CourseCreated",
        });

        // Step 2: buyer1 buys course for person1
        const buy_course = await buyCourseHelper({
          courseId: course1.courseId,
          tokenAddress: MKT1.target,
          coursePrice: ethers.parseEther("10"),
          courseReceiver: person1.address,
          redeemer: buyer1,
          validUntil: now + 86400,
          nativeMsgValue: 0,
          expectSuccessWith: "ContentPurchased",
        });

        // Step 3: First refund
        const refund1 = await refundCourseHelper({
          paymentId: buy_course.paymentId,
          redeemer: buyer1,
          validUntil: now + 86400,
          expectSuccessWith: "CourseRefunded",
        });

        // Step 4: Attempt second refund → should fail
        const refund2 = await refundCourseHelper({
          paymentId: buy_course.paymentId,
          redeemer: buyer1,
          validUntil: now + 86400,
          expectRevertWith: "Already refunded",
        });
      });

      it("should fail to refund if paymentId is invalid", async function () {
        // Step 1: read latest paymentCounter and use an invalid one (e.g. +1)
        const latestPaymentCounter1 = await NewTreasury.paymentCounter();
        const invalidPaymentId1 = latestPaymentCounter1 + 1n;

        // Step 2: try to refund to non existing course with invalidPaymentId
        const refund1 = await refundCourseHelper({
          paymentId: invalidPaymentId1,
          redeemer: buyer1,
          validUntil: now + 86400,
          expectRevertWith: "Invalid paymentId",
        });

        // Step 3: create a valid course
        const course1 = await createCourseHelper({
          uri: "https://example.com/invalid-paymentId",
          withdrawers: [instructor1.address],
          redeemer: instructor1,
          validUntil: now + 86400,
          expectSuccessWith: "CourseCreated",
        });

        // Step 4: buyer the course (just to advance payment counters)
        const buy_course1 = await buyCourseHelper({
          courseId: course1.courseId,
          tokenAddress: MKT1.target,
          coursePrice: ethers.parseEther("10"),
          courseReceiver: person1.address,
          redeemer: buyer1,
          validUntil: now + 86400,
          nativeMsgValue: 0,
          expectSuccessWith: "ContentPurchased",
        });

        // Step 5: read latest paymentCounter and use an invalid one (e.g. +1)
        const latestPaymentCounter2 = await NewTreasury.paymentCounter();
        const invalidPaymentId2 = latestPaymentCounter2 + 1n;

        // Step 6: try to refund to non existing course with invalidPaymentId
        const refund_course1 = await refundCourseHelper({
          paymentId: invalidPaymentId2,
          redeemer: buyer1,
          validUntil: now + 86400,
          expectRevertWith: "Invalid paymentId",
        });
        // Expect: Reverts with "Invalid paymentId"
      });

      it("should fail to refund if paymentId is zero (before and after course purchase)", async function () {
        // Step 1: Try refunding with paymentId = 0 before any course exists
        await refundCourseHelper({
          paymentId: 0n,
          redeemer: buyer1,
          validUntil: now + 86400,
          expectRevertWith: "Invalid paymentId",
        });

        // Step 2: create a course
        const course1 = await createCourseHelper({
          uri: "https://example.com/paymentId-zero-2",
          withdrawers: [instructor1.address],
          redeemer: instructor1,
          validUntil: now + 86400,
          expectSuccessWith: "CourseCreated",
        });

        // Step 3: buyer1 buys course
        const buy_course1 = await buyCourseHelper({
          courseId: course1.courseId,
          tokenAddress: MKT1.target,
          coursePrice: ethers.parseEther("10"),
          courseReceiver: person1.address,
          redeemer: buyer1,
          validUntil: now + 86400,
          nativeMsgValue: 0,
          expectSuccessWith: "ContentPurchased",
        });

        // Step 4: Try refunding with paymentId = 0 again after purchase
        await refundCourseHelper({
          paymentId: 0n,
          redeemer: buyer1,
          validUntil: now + 86400,
          expectRevertWith: "Invalid paymentId",
        });
        // Expect: Reverts with "Invalid paymentId"
      });

      it("should fail to refund if refund window has passed", async function () {
        // Step 1: Read refundWindow from contract
        const refundWindow = await NewTreasury.refundWindow();
        // Step 2: Create a course
        const course1 = await createCourseHelper({
          uri: "https://example.com/refund-window-passed",
          withdrawers: [instructor1.address],
          redeemer: instructor1,
          validUntil: now + 86400,
          expectSuccessWith: "CourseCreated",
        });

        // Step 3: Buyer1 buys the course for person1
        const buy_course1 = await buyCourseHelper({
          courseId: course1.courseId,
          tokenAddress: MKT1.target,
          coursePrice: ethers.parseEther("10"),
          courseReceiver: person1.address,
          redeemer: buyer1,
          validUntil: now + 86400,
          nativeMsgValue: 0,
          expectSuccessWith: "ContentPurchased",
        });

        // Step 4: Fast forward time by refundWindow + 1 second
        const refundWindowInSec = Number(refundWindow);
        await fastForwardTime({ seconds: refundWindowInSec + 1 });

        // Step 5: Try to refund and expect failure
        await refundCourseHelper({
          paymentId: buy_course1.paymentId,
          redeemer: buyer1,
          validUntil: now + 86400,
          expectRevertWith: "Refund window passed",
        });
      });

      it("should fail refund if original refund window expired despite later refundWindow was extended", async function () {
        // Step 1: set refundWindow to 1 day
        await NewTreasury.connect(backend).setRefundWindow(1);

        // Step 2: instructor1 creates a course
        const course1 = await createCourseHelper({
          uri: "https://example.com/refund-window-extended-fail",
          withdrawers: [instructor1.address],
          redeemer: instructor1,
          validUntil: now + 86400,
          expectSuccessWith: "CourseCreated",
        });

        // Step 3: buyer1 buys the course
        const buy_course = await buyCourseHelper({
          courseId: course1.courseId,
          tokenAddress: MKT1.target,
          coursePrice: ethers.parseEther("10"),
          courseReceiver: person1.address,
          redeemer: buyer1,
          validUntil: now + 86400,
          nativeMsgValue: 0,
          expectSuccessWith: "ContentPurchased",
        });

        // Step 4: extend refundWindow to 10 days (simulates a global policy change)
        await NewTreasury.connect(backend).setRefundWindow(10 * 86400);

        // Step 5: fast forward 3 days (beyond original 1 day window)
        await fastForwardTime({ days: 3 });

        // Step 6: attempt refund → should fail since original refund window passed
        await refundCourseHelper({
          paymentId: buy_course.paymentId,
          redeemer: buyer1,
          validUntil: now + 86400,
          expectRevertWith: "Refund window passed",
        });

        // Expect: Reverts even though current refundWindow is 10 days
      });

      it("should fail refund by paymentId if payment was already withdrawn", async function () {
        // Step 1: instructor1 creates a course
        const course1 = await createCourseHelper({
          uri: "https://example.com/paymentid-refund-after-withdraw",
          withdrawers: [instructor1.address],
          redeemer: instructor1,
          validUntil: now + 86400,
          expectSuccessWith: "CourseCreated",
        });

        // Step 2: buyer1 purchases course for person1
        const buy = await buyCourseHelper({
          courseId: course1.courseId,
          tokenAddress: MKT1.target,
          coursePrice: ethers.parseEther("10"),
          courseReceiver: person1.address,
          redeemer: buyer1,
          validUntil: now + 86400,
          nativeMsgValue: 0,
          expectSuccessWith: "ContentPurchased",
        });

        // Step 3: fast forward time beyond refund window
        const refundWindowInDays = Number(await NewTreasury.refundWindow()) / 86400;
        await fastForwardTime({ days: refundWindowInDays + 1 });

        // Step 4: instructor withdraws the payment
        await withdrawCoursePaymentsHelper({
          courseId: course1.courseId,
          fromIndex: 1,
          toIndex: 1,
          redeemer: instructor1,
          validUntil: now + 86400,
          expectSuccessWith: "CoursePaymentsWithdrawn",
          expectations: [PES],
        });

        // Step 5: try to refund using paymentId (should fail due to already withdrawn)
        await refundCourseHelper({
          paymentId: buy.paymentId,
          redeemer: buyer1,
          validUntil: now + 86400,
          expectRevertWith: "Already withdrawn",
        });

        // Expectation: Refund fails because the payment was already withdrawn
      });

      /////###End of Failure Cases###/////
    });
    /////###End of Refunds: paymentId###/////
  });

  // 4. Refunds: byowner and courseId
  describe("💸 REFUNDS: refundCourseByOwnerAndCourseId", function () {
    describe("✅ Success Cases", function () {
      it("should allow refund using RefundCourseByOwnerAndCourseIdVoucher", async function () {
        // 1. instructor1 creates a course
        const course1 = await createCourseHelper({
          uri: "https://example.com/course/1",
          withdrawers: [instructor1.address],
          redeemer: instructor1,
          validUntil: now + 86400,
          expectSuccessWith: "CourseCreated",
        });
        // 2. buyer1 buys course for person1
        const buy_course = await buyCourseHelper({
          courseId: course1.courseId,
          tokenAddress: MKT1.target,
          coursePrice: ethers.parseEther("10"),
          courseReceiver: person1.address,
          redeemer: buyer1,
          validUntil: now + 86400,
          nativeMsgValue: 0,
          expectSuccessWith: "ContentPurchased",
        });

        // 3. instructor5 initiates refund using courseOwner + courseId
        const refund_course = await refundCourseByOwnerHelper({
          courseOwner: person1.address,
          courseId: buy_course.courseId,
          redeemer: buyer1,
          validUntil: now + 86400,
          expectSuccessWith: "CourseRefunded",
        });
      });

      it("should allow a course purchased with native token to be refunded", async function () {
        // Step 1: instructor1 creates a course
        const course1 = await createCourseHelper({
          uri: "https://example.com/course/native-refund",
          withdrawers: [instructor1.address],
          redeemer: instructor1,
          validUntil: now + 86400,
          expectSuccessWith: "CourseCreated",
        });

        // Step 2: buyer1 buys course for person1 with native token
        const buy_course1 = await buyCourseHelper({
          courseId: course1.courseId,
          tokenAddress: ethers.ZeroAddress,
          coursePrice: ethers.parseEther("7"),
          courseReceiver: person1.address,
          redeemer: buyer1,
          validUntil: now + 86400,
          nativeMsgValue: ethers.parseEther("7"),
          expectSuccessWith: "ContentPurchased",
        });

        // Step 3: buyer1 refunds the course
        const refund_course1 = await refundCourseByOwnerHelper({
          courseOwner: person1.address,
          courseId: buy_course1.courseId,
          redeemer: buyer1,
          validUntil: now + 86400,
          expectSuccessWith: "CourseRefunded",
        });
        // Expect: "CourseRefunded" event with expected success states
      });

      it("should allow a course purchased with ERC20 token to be refunded using refundCourseByOwnerHelper", async function () {
        // Step 1: instructor1 creates a course
        const course1 = await createCourseHelper({
          uri: "https://example.com/course/erc20-refund",
          withdrawers: [instructor1.address],
          redeemer: instructor1,
          validUntil: now + 86400,
          expectSuccessWith: "CourseCreated",
        });

        // Step 2: buyer1 buys course for person1 with ERC20 token
        const buy_course1 = await buyCourseHelper({
          courseId: course1.courseId,
          tokenAddress: MKT1.target,
          coursePrice: ethers.parseEther("5"),
          courseReceiver: person1.address,
          redeemer: buyer1,
          validUntil: now + 86400,
          nativeMsgValue: 0,
          expectSuccessWith: "ContentPurchased",
        });

        // Step 3: buyer1 refunds the course
        const refund_course1 = await refundCourseByOwnerHelper({
          courseOwner: person1.address,
          courseId: buy_course1.courseId,
          redeemer: buyer1,
          validUntil: now + 86400,
          expectSuccessWith: "CourseRefunded",
        });
        // Expect: "CourseRefunded" event with expected success states
      });

      it("should allow multiple courses purchased with ERC20 token to be refunded", async function () {
        // Step 1: instructor1 creates course1
        const course1 = await createCourseHelper({
          uri: "https://example.com/course/erc20-multi-1",
          withdrawers: [instructor1.address],
          redeemer: instructor1,
          validUntil: now + 86400,
          expectSuccessWith: "CourseCreated",
        });

        // Step 2: instructor1 creates course2
        const course2 = await createCourseHelper({
          uri: "https://example.com/course/erc20-multi-2",
          withdrawers: [instructor1.address],
          redeemer: instructor1,
          validUntil: now + 86400,
          expectSuccessWith: "CourseCreated",
        });

        // Step 3: instructor1 creates course3
        const course3 = await createCourseHelper({
          uri: "https://example.com/course/erc20-multi-3",
          withdrawers: [instructor3.address],
          redeemer: instructor3,
          validUntil: now + 86400,
          expectSuccessWith: "CourseCreated",
        });

        // Step 4: buyer1 buys all three courses for person1 with ERC20 token
        const buy_course1 = await buyCourseHelper({
          courseId: course1.courseId,
          tokenAddress: MKT1.target,
          coursePrice: ethers.parseEther("5"),
          courseReceiver: person1.address,
          redeemer: buyer1,
          validUntil: now + 86400,
          nativeMsgValue: 0,
          expectSuccessWith: "ContentPurchased",
        });

        const buy_course2 = await buyCourseHelper({
          courseId: course2.courseId,
          tokenAddress: MKT2.target,
          coursePrice: ethers.parseEther("7"),
          courseReceiver: person1.address,
          redeemer: buyer1,
          validUntil: now + 86400,
          nativeMsgValue: 0,
          expectSuccessWith: "ContentPurchased",
        });

        const buy_course3 = await buyCourseHelper({
          courseId: course3.courseId,
          tokenAddress: ethers.ZeroAddress, // native token
          coursePrice: ethers.parseEther("9"),
          courseReceiver: person1.address,
          redeemer: buyer1,
          validUntil: now + 86400,
          nativeMsgValue: ethers.parseEther("9"),
          expectSuccessWith: "ContentPurchased",
        });

        // Step 5: buyer1 refunds all three courses
        const refund1 = await refundCourseByOwnerHelper({
          courseOwner: person1.address,
          courseId: buy_course1.courseId,
          redeemer: buyer1,
          validUntil: now + 86400,
          expectSuccessWith: "CourseRefunded",
        });

        const refund2 = await refundCourseByOwnerHelper({
          courseOwner: person1.address,
          courseId: buy_course2.courseId,
          redeemer: buyer2,
          validUntil: now + 86400,
          expectSuccessWith: "CourseRefunded",
        });

        const refund3 = await refundCourseByOwnerHelper({
          courseOwner: person1.address,
          courseId: buy_course3.courseId,
          redeemer: buyer1,
          validUntil: now + 86400,
          expectSuccessWith: "CourseRefunded",
        });

        // Expect: Each refund emits "CourseRefunded" event with expected success states
      });

      it("should allow a course to be refunded by a different redeemer than the original buyer", async function () {
        // Step 1: instructor1 creates a course
        const course1 = await createCourseHelper({
          uri: "https://example.com/course/diff-redeemer",
          withdrawers: [instructor1.address],
          redeemer: instructor1,
          validUntil: now + 86400,
          expectSuccessWith: "CourseCreated",
        });

        // Step 2: buyer1 buys course for person1 using ERC20
        const buy_course = await buyCourseHelper({
          courseId: course1.courseId,
          tokenAddress: MKT1.target,
          coursePrice: ethers.parseEther("12"),
          courseReceiver: person1.address,
          redeemer: buyer1,
          validUntil: now + 86400,
          nativeMsgValue: 0,
          expectSuccessWith: "ContentPurchased",
        });

        // Step 3: buyer2 (a different redeemer) initiates refund
        const refund_course = await refundCourseByOwnerHelper({
          courseOwner: person1.address,
          courseId: buy_course.courseId,
          redeemer: buyer2,
          validUntil: now + 86400,
          expectSuccessWith: "CourseRefunded",
        });

        // Expect: "CourseRefunded" event with expected success states
      });

      it("should allow a course to be bought, refunded, and bought again by the same receiver", async function () {
        // Step 1: instructor1 creates a course
        const course1 = await createCourseHelper({
          uri: "https://example.com/course/rebuy-after-refund",
          withdrawers: [instructor1.address],
          redeemer: instructor1,
          validUntil: now + 86400,
          expectSuccessWith: "CourseCreated",
        });

        // Step 2: buyer1 buys course for person1
        const buy1 = await buyCourseHelper({
          courseId: course1.courseId,
          tokenAddress: MKT1.target,
          coursePrice: ethers.parseEther("9"),
          courseReceiver: person1.address,
          redeemer: buyer1,
          validUntil: now + 86400,
          nativeMsgValue: 0,
          expectSuccessWith: "ContentPurchased",
        });

        // Step 3: refund the course
        const refund1 = await refundCourseByOwnerHelper({
          courseOwner: person1.address,
          courseId: course1.courseId,
          redeemer: buyer1,
          validUntil: now + 86400,
          expectSuccessWith: "CourseRefunded",
        });

        // Step 4: buy again
        const buy2 = await buyCourseHelper({
          courseId: course1.courseId,
          tokenAddress: MKT1.target,
          coursePrice: ethers.parseEther("9"),
          courseReceiver: person1.address,
          redeemer: buyer2,
          validUntil: now + 86400,
          nativeMsgValue: 0,
          expectSuccessWith: "ContentPurchased",
        });

        // Expect: both purchases and refund succeed
      });

      it("should allow refund by owner if original refund window is still valid despite later refundWindow shortened", async function () {
        // Step 1: instructor1 creates a course
        const course1 = await createCourseHelper({
          uri: "https://example.com/owner-refund-window-long-then-short",
          withdrawers: [instructor1.address],
          redeemer: instructor1,
          validUntil: now + 86400,
          expectSuccessWith: "CourseCreated",
        });

        // Step 2: buyer1 buys the course for person1
        const buy_course = await buyCourseHelper({
          courseId: course1.courseId,
          tokenAddress: MKT1.target,
          coursePrice: ethers.parseEther("10"),
          courseReceiver: person1.address,
          redeemer: buyer1,
          validUntil: now + 86400,
          nativeMsgValue: 0,
          expectSuccessWith: "ContentPurchased",
        });

        // Step 3: new refund window set to 1 day
        await NewTreasury.connect(backend).setRefundWindow(1 * 86400); // 1 gün

        // Step 4: fast forward 3 days
        await fastForwardTime({ days: 3 });

        // Step 5: instructor5 refunds the course by owner
        await refundCourseByOwnerHelper({
          courseOwner: person1.address,
          courseId: course1.courseId,
          redeemer: buyer1,
          validUntil: now + 86400,
          expectSuccessWith: "CourseRefunded",
        });

        // Expect: Refund succeeds even though current refundWindow is 1 day old refund window valid for this course
      });

      /////###End of Success Cases###/////
    });

    describe("❌ Failure Cases", function () {
      it("should fail to refund with invalid signer", async function () {
        // Step 1: instructor1 creates a course
        const course1 = await createCourseHelper({
          uri: "https://example.com/refund-invalid-signer",
          withdrawers: [instructor1.address],
          redeemer: instructor1,
          validUntil: now + 86400,
          expectSuccessWith: "CourseCreated",
        });

        // Step 2: buyer1 buys course for person1
        const buy_course = await buyCourseHelper({
          courseId: course1.courseId,
          tokenAddress: MKT1.target,
          coursePrice: ethers.parseEther("10"),
          courseReceiver: person1.address,
          redeemer: buyer1,
          validUntil: now + 86400,
          nativeMsgValue: 0,
          expectSuccessWith: "ContentPurchased",
        });

        // Step 3: Use wrong signer for the refund voucher
        refundByOwnerVH = getVoucherHelpers({ signer: instructor2 }).refundByOwnerVH;

        // Step 4: Attempt refund with invalid signer
        const refund_course = await refundCourseByOwnerHelper({
          courseOwner: person1.address,
          courseId: buy_course.courseId,
          redeemer: buyer1,
          validUntil: now + 86400,
          expectRevertWith: "Signature invalid or unauthorized",
        });
      });

      it("should fail to refund with expired voucher", async function () {
        // Step 1: instructor1 creates a course
        const course1 = await createCourseHelper({
          uri: "https://example.com/refund-expired",
          withdrawers: [instructor1.address],
          redeemer: instructor1,
          validUntil: now + 86400,
          expectSuccessWith: "CourseCreated",
        });

        // Step 2: buyer1 buys course for person1
        const buy_course = await buyCourseHelper({
          courseId: course1.courseId,
          tokenAddress: MKT1.target,
          coursePrice: ethers.parseEther("10"),
          courseReceiver: person1.address,
          redeemer: buyer1,
          validUntil: now + 86400,
          nativeMsgValue: 0,
          expectSuccessWith: "ContentPurchased",
        });

        // Step 3: Attempt refund with expired voucher
        const refund_course = await refundCourseByOwnerHelper({
          courseOwner: person1.address,
          courseId: buy_course.courseId,
          redeemer: buyer2,
          validUntil: now - 60, // expired
          expectRevertWith: "Voucher expired",
        });
      });

      it("should fail to refund twice for the same course", async function () {
        // Step 1: instructor1 creates a course
        const course1 = await createCourseHelper({
          uri: "https://example.com/refund-double",
          withdrawers: [instructor1.address],
          redeemer: instructor1,
          validUntil: now + 86400,
          expectSuccessWith: "CourseCreated",
        });

        // Step 2: buyer1 buys course for person1
        const buy_course = await buyCourseHelper({
          courseId: course1.courseId,
          tokenAddress: MKT1.target,
          coursePrice: ethers.parseEther("10"),
          courseReceiver: person1.address,
          redeemer: buyer1,
          validUntil: now + 86400,
          nativeMsgValue: 0,
          expectSuccessWith: "ContentPurchased",
        });

        // Step 3: First refund
        const refund1 = await refundCourseByOwnerHelper({
          courseOwner: person1.address,
          courseId: buy_course.courseId,
          redeemer: buyer1,
          validUntil: now + 86400,
          expectSuccessWith: "CourseRefunded",
        });

        // Step 4: Attempt second refund → should fail
        const refund2 = await refundCourseByOwnerHelper({
          courseOwner: person1.address,
          courseId: buy_course.courseId,
          redeemer: buyer1,
          validUntil: now + 86400,
          expectRevertWith: "No payment found for this course and owner",
        });
      });

      it("should fail to refund if paymentId is invalid", async function () {
        // Step 1: read latest paymentCounter and use an invalid one (e.g. +1)
        const latestPaymentCounter1 = await NewTreasury.paymentCounter();
        const invalidPaymentId1 = latestPaymentCounter1 + 1n;

        // Step 2: try to refund to non existing course with invalidPaymentId
        const refund1 = await refundCourseByOwnerHelper({
          courseOwner: buyer1.address,
          courseId: invalidPaymentId1, // intentionally bogus
          redeemer: buyer1,
          validUntil: now + 86400,
          expectRevertWith: "No payment found for this course and owner",
        });

        // Step 3: create a valid course
        const course1 = await createCourseHelper({
          uri: "https://example.com/invalid-paymentId",
          withdrawers: [instructor1.address],
          redeemer: instructor1,
          validUntil: now + 86400,
          expectSuccessWith: "CourseCreated",
        });

        // Step 4: buyer the course (just to advance payment counters)
        const buy_course1 = await buyCourseHelper({
          courseId: course1.courseId,
          tokenAddress: MKT1.target,
          coursePrice: ethers.parseEther("10"),
          courseReceiver: person1.address,
          redeemer: buyer1,
          validUntil: now + 86400,
          nativeMsgValue: 0,
          expectSuccessWith: "ContentPurchased",
        });

        // Step 5: read latest paymentCounter and use an invalid one (e.g. +1)
        const latestPaymentCounter2 = await NewTreasury.paymentCounter();
        const invalidPaymentId2 = latestPaymentCounter2 + 1n;

        // Step 6: try to refund to non existing course with invalidPaymentId
        const refund_course1 = await refundCourseByOwnerHelper({
          courseOwner: buyer1.address,
          courseId: invalidPaymentId2, // again intentionally wrong
          redeemer: buyer1,
          validUntil: now + 86400,
          expectRevertWith: "No payment found for this course and owner",
        });
        // Expect: Reverts with "No payment found for this course and owner"
      });

      it("should fail to refund if paymentId is zero (before and after course purchase)", async function () {
        // Step 1: Try refunding with paymentId = 0 before any course exists
        await refundCourseByOwnerHelper({
          courseOwner: person1.address,
          courseId: 0n,
          redeemer: buyer1,
          validUntil: now + 86400,
          expectRevertWith: "No payment found for this course and owner",
        });

        // Step 2: create a course
        const course1 = await createCourseHelper({
          uri: "https://example.com/paymentId-zero-2",
          withdrawers: [instructor1.address],
          redeemer: instructor1,
          validUntil: now + 86400,
          expectSuccessWith: "CourseCreated",
        });

        // Step 3: buyer1 buys course
        const buy_course1 = await buyCourseHelper({
          courseId: course1.courseId,
          tokenAddress: MKT1.target,
          coursePrice: ethers.parseEther("10"),
          courseReceiver: person1.address,
          redeemer: buyer1,
          validUntil: now + 86400,
          nativeMsgValue: 0,
          expectSuccessWith: "ContentPurchased",
        });

        // Step 4: Try refunding with paymentId = 0 again after purchase
        await refundCourseByOwnerHelper({
          courseOwner: person1.address,
          courseId: 0n,
          redeemer: buyer1,
          validUntil: now + 86400,
          expectRevertWith: "No payment found for this course and owner",
        });
        // Expect: Reverts with "Invalid paymentId"
      });

      it("should fail to refund if refund window has passed", async function () {
        // Step 1: Read refundWindow from contract
        const refundWindow = await NewTreasury.refundWindow();

        // Step 2: Create a course
        const course1 = await createCourseHelper({
          uri: "https://example.com/refund-window-passed",
          withdrawers: [instructor1.address],
          redeemer: instructor1,
          validUntil: now + 86400,
          expectSuccessWith: "CourseCreated",
        });

        // Step 3: Buyer1 buys the course for person1
        const buy_course1 = await buyCourseHelper({
          courseId: course1.courseId,
          tokenAddress: MKT1.target,
          coursePrice: ethers.parseEther("10"),
          courseReceiver: person1.address,
          redeemer: buyer1,
          validUntil: now + 86400,
          nativeMsgValue: 0,
          expectSuccessWith: "ContentPurchased",
        });

        // Step 4: Fast forward time by refundWindow + 1 second
        const refundWindowInSec = Number(refundWindow);
        await fastForwardTime({ seconds: refundWindowInSec + 1 });

        // Step 5: Try to refund and expect failure
        await refundCourseByOwnerHelper({
          courseOwner: person1.address,
          courseId: buy_course1.courseId,
          redeemer: buyer1,
          validUntil: now + 86400,
          expectRevertWith: "Refund window passed",
        });
      });

      it("should fail refund by owner if original refund window expired despite later refundWindow was extended", async function () {
        // Step 1: set refund window to a short duration (e.g. 1 day)
        await NewTreasury.connect(backend).setRefundWindow(1);

        // Step 2: instructor1 creates a course
        const course1 = await createCourseHelper({
          uri: "https://example.com/owner-refund-window-short-then-long",
          withdrawers: [instructor1.address],
          redeemer: instructor1,
          validUntil: now + 86400,
          expectSuccessWith: "CourseCreated",
        });

        // Step 3: buyer1 purchases course for person1
        const buy_course = await buyCourseHelper({
          courseId: course1.courseId,
          tokenAddress: MKT1.target,
          coursePrice: ethers.parseEther("10"),
          courseReceiver: person1.address,
          redeemer: buyer1,
          validUntil: now + 86400,
          nativeMsgValue: 0,
          expectSuccessWith: "ContentPurchased",
        });

        // Step 4: extend refund window to 10 days (policy updated but shouldn't affect past purchases)
        await NewTreasury.connect(backend).setRefundWindow(10 * 86400);

        // Step 5: fast forward time by 3 days
        await fastForwardTime({ days: 3 });

        // Step 6: try to refund (original window was 1 day, now expired)
        await refundCourseByOwnerHelper({
          courseOwner: person1.address,
          courseId: course1.courseId,
          redeemer: buyer1,
          validUntil: now + 86400,
          expectRevertWith: "Refund window passed",
        });

        // Expectation: Refund fails because the refund window at the time of purchase already expired
      });

      it("should fail refund by owner if payment was already withdrawn", async function () {
        // Step 1: instructor1 creates a course
        const course1 = await createCourseHelper({
          uri: "https://example.com/owner-refund-after-withdraw",
          withdrawers: [instructor1.address],
          redeemer: instructor1,
          validUntil: now + 86400,
          expectSuccessWith: "CourseCreated",
        });

        // Step 2: buyer1 purchases course for person1
        const buy = await buyCourseHelper({
          courseId: course1.courseId,
          tokenAddress: MKT1.target,
          coursePrice: ethers.parseEther("10"),
          courseReceiver: person1.address,
          redeemer: buyer1,
          validUntil: now + 86400,
          nativeMsgValue: 0,
          expectSuccessWith: "ContentPurchased",
        });

        // Step 3: fast forward the refund window to allow withdrawal
        const refundWindowInDays = Number(await NewTreasury.refundWindow()) / 86400;
        await fastForwardTime({ days: refundWindowInDays + 1 });

        // Step 4: instructor withdraws the payment
        await withdrawCoursePaymentsHelper({
          courseId: course1.courseId,
          fromIndex: 1,
          toIndex: 1,
          redeemer: instructor1,
          validUntil: now + 86400,
          expectSuccessWith: "CoursePaymentsWithdrawn",
          expectations: [PES],
        });

        // Step 5: try to refund by owner (should fail due to already withdrawn)
        await refundCourseByOwnerHelper({
          courseOwner: person1.address,
          courseId: course1.courseId,
          redeemer: buyer1,
          validUntil: now + 86400,
          expectRevertWith: "Already withdrawn",
        });

        // Expectation: Refund fails because funds were already withdrawn
      });

      /////###End of Failure Cases###/////
    });
    /////###End of Refunds: byOwner and courseId###/////
  });

  // 5. Withdrawals
  describe("🏦 WITHDRAWALS", function () {
    describe("✅ Success Cases", function () {
      it("should allow instructor1 to withdraw payments for sales 1 to 3", async function () {
        // Step 1: instructor1 creates a course
        const course1 = await createCourseHelper({
          uri: "https://example.com/withdraw-course/1",
          withdrawers: [instructor1.address],
          redeemer: instructor1,
          validUntil: now + 86400,
          expectSuccessWith: "CourseCreated",
        });

        // Step 2: 5 different sale occur for the course
        const price = [5, 10, 15, 20, 25];
        const buyers = [buyer1, buyer2, buyer3, buyer4, buyer5];
        const receivers = [person1, person2, person3, person4, person5];

        for (let i = 0; i < 5; i++) {
          await buyCourseHelper({
            courseId: course1.courseId,
            tokenAddress: MKT1.target,
            coursePrice: ethers.parseEther(price[i].toString()),
            courseReceiver: receivers[i].address,
            redeemer: buyers[i],
            validUntil: now + 86400,
            nativeMsgValue: 0,
            expectSuccessWith: "ContentPurchased",
          });
        }

        // Step 3: Fast forward time after refund window, 25 days
        await fastForwardTime({ days: 25 });

        // Step 4: Withdraw payments from sales 1 to 3
        const withdrawResult = await withdrawCoursePaymentsHelper({
          courseId: course1.courseId,
          fromIndex: 1,
          toIndex: 3,
          redeemer: instructor1,
          validUntil: now + 86400,
          expectSuccessWith: "CoursePaymentsWithdrawn",
          expectations: [PES, PES, PES],
        });
        // Expect: "CoursePaymentsWithdrawn" with expected success states
        // console.log("withdrawResult tokenStats:", withdrawResult.tokenStats);
      });

      it("should allow withdraw if original refund window expired before refundWindow was extended", async function () {
        // Step 1: set initial refundWindow to 1 days
        await NewTreasury.connect(backend).setRefundWindow(1 * 86400);

        // Step 2: instructor1 creates course
        const course1 = await createCourseHelper({
          uri: "https://example.com/withdraw-window-long-then-short",
          withdrawers: [instructor1.address],
          redeemer: instructor1,
          validUntil: now + 86400,
          expectSuccessWith: "CourseCreated",
        });

        // Step 3: buyer buys course
        await buyCourseHelper({
          courseId: course1.courseId,
          tokenAddress: MKT1.target,
          coursePrice: ethers.parseEther("10"),
          courseReceiver: person1.address,
          redeemer: buyer1,
          validUntil: now + 86400,
          nativeMsgValue: 0,
          expectSuccessWith: "ContentPurchased",
        });

        // Step 4: shorten refundWindow to 10 day
        await NewTreasury.connect(backend).setRefundWindow(10 * 86400);

        // Step 5: fast forward 3 days (beyond original the old 1 day window)
        await fastForwardTime({ days: 3 });

        // Step 6: withdraw should succeed
        await withdrawCoursePaymentsHelper({
          courseId: course1.courseId,
          fromIndex: 1,
          toIndex: 1,
          redeemer: instructor1,
          validUntil: now + 86400,
          expectSuccessWith: "CoursePaymentsWithdrawn",
          expectations: [PES],
        });
      });

      /////###End of Success Cases###/////
    });

    describe("🔁 Partial Success Cases", function () {
      it("should skip withdraw if purchase is still within original refund window despite refundWindow being shortened later", async function () {
        // Step 1: set initial refundWindow to 10 days
        await NewTreasury.connect(backend).setRefundWindow(10 * 86400);

        // Step 2: instructor1 creates course
        const course1 = await createCourseHelper({
          uri: "https://example.com/withdraw-window-still-in-long-window",
          withdrawers: [instructor1.address],
          redeemer: instructor1,
          validUntil: now + 86400,
          expectSuccessWith: "CourseCreated",
        });

        // Step 3: buyer buys course
        await buyCourseHelper({
          courseId: course1.courseId,
          tokenAddress: MKT1.target,
          coursePrice: ethers.parseEther("10"),
          courseReceiver: person1.address,
          redeemer: buyer1,
          validUntil: now + 86400,
          nativeMsgValue: 0,
          expectSuccessWith: "ContentPurchased",
        });

        // Step 4: shorten refundWindow to 1 day (but purchase was made with 10-day window)
        await NewTreasury.connect(backend).setRefundWindow(1 * 86400);

        // Step 5: fast forward 3 days (refund window according to new policy is passed, but not the old one)
        await fastForwardTime({ days: 3 });

        // Step 6: withdraw attempt should emit event, but no tokens processed
        await withdrawCoursePaymentsHelper({
          courseId: course1.courseId,
          fromIndex: 1,
          toIndex: 1,
          redeemer: instructor1,
          validUntil: now + 86400,
          expectSuccessWith: "CoursePaymentsWithdrawn", // emit edilir
          expectations: [PI], // işlem yapılmaz
        });
      });

      /////###End of Partial Success Cases###/////
    });

    describe("❌ Failure Cases", function () {
      it("should fail to withdraw with invalid signer", async function () {
        // Step 1: instructor1 creates course
        const course1 = await createCourseHelper({
          uri: "https://example.com/withdraw-invalid-signer",
          withdrawers: [instructor1.address],
          redeemer: instructor1,
          validUntil: now + 86400,
          expectSuccessWith: "CourseCreated",
        });

        // Step 2: buyer1 purchases course for person1
        await buyCourseHelper({
          courseId: course1.courseId,
          tokenAddress: MKT1.target,
          coursePrice: ethers.parseEther("10"),
          courseReceiver: person1.address,
          redeemer: buyer1,
          validUntil: now + 86400,
          nativeMsgValue: 0,
          expectSuccessWith: "ContentPurchased",
        });

        // Step 3: fast forward to after refund window
        const refundWindowInDays = Number(await NewTreasury.refundWindow()) / 86400;
        await fastForwardTime({ days: refundWindowInDays + 1 });

        // Step 4: switch to an invalid signer
        withdrawVH = getVoucherHelpers({ signer: instructor2 }).withdrawVH;

        // Step 5: attempt withdraw with wrong signer
        const withdrawResult = await withdrawCoursePaymentsHelper({
          courseId: course1.courseId,
          fromIndex: 1,
          toIndex: 1,
          redeemer: instructor1,
          validUntil: now + 86400,
          expectRevertWith: "Signature invalid or unauthorized",
          expectations: [PES],
        });
        // Expect: Reverts with "Signature invalid or unauthorized"
        //console.log("withdrawResult tokenStats:", withdrawResult.tokenStats);
      });

      it("should fail to withdraw with expired voucher", async function () {
        // Step 1: instructor1 creates course
        const course1 = await createCourseHelper({
          uri: "https://example.com/withdraw-expired",
          withdrawers: [instructor1.address],
          redeemer: instructor1,
          validUntil: now + 86400,
          expectSuccessWith: "CourseCreated",
        });

        // Step 2: buyer1 purchases course
        await buyCourseHelper({
          courseId: course1.courseId,
          tokenAddress: MKT1.target,
          coursePrice: ethers.parseEther("10"),
          courseReceiver: person1.address,
          redeemer: buyer1,
          validUntil: now + 86400,
          nativeMsgValue: 0,
          expectSuccessWith: "ContentPurchased",
        });

        // Step 3: fast forward time to pass refund window
        const refundWindowInDays = Number(await NewTreasury.refundWindow()) / 86400;
        await fastForwardTime({ days: refundWindowInDays + 1 });

        // Step 4: expired voucher
        const withdrawResult = await withdrawCoursePaymentsHelper({
          courseId: course1.courseId,
          fromIndex: 1,
          toIndex: 1,
          redeemer: instructor1,
          validUntil: now - 60, // expired
          expectRevertWith: "Voucher expired",
          expectations: [PES],
        });
        // Expect: Reverts with "Voucher expired" with expected fail states
        //console.log("withdrawResult tokenStats:", withdrawResult.tokenStats);
      });

      it("should fail to withdraw with courseId = 0", async function () {
        // Step 1: Try withdraw without any course created for non-existing courseId = 0 expect fail
        const withdrawResult1 = await withdrawCoursePaymentsHelper({
          courseId: 0,
          fromIndex: 1,
          toIndex: 1,
          redeemer: instructor1,
          validUntil: now + 86400,
          expectRevertWith: "Invalid courseId",
          expectations: [PES],
        });

        // Step 2: Create a valid course
        const validCourse = await createCourseHelper({
          uri: "https://example.com/withdraw-invalid-courseid",
          withdrawers: [instructor1.address],
          redeemer: instructor1,
          validUntil: now + 86400,
          expectSuccessWith: "CourseCreated",
        });

        // Step 3: Try withdraw without any course created for non-existing courseId = 0 expect fail
        const withdrawResult2 = await withdrawCoursePaymentsHelper({
          courseId: 0,
          fromIndex: 1,
          toIndex: 1,
          redeemer: instructor1,
          validUntil: now + 86400,
          expectRevertWith: "Invalid courseId",
          expectations: [PES],
        });
        // Expect: Reverts with "Invalid courseId" in both cases
      });

      it("should fail to withdraw with courseId > courseCounter", async function () {
        // Step 1: Use a courseId greater than current courseCounter
        const invalidCourseId1 = Number(await NewTreasury.courseCounter()) + 1;

        // Step 2: Try withdraw with invalid courseId
        const withdrawResult1 = await withdrawCoursePaymentsHelper({
          courseId: invalidCourseId1,
          fromIndex: 1,
          toIndex: 1,
          redeemer: instructor1,
          validUntil: now + 86400,
          expectRevertWith: "Invalid courseId",
          expectations: [PES],
        });

        // Step 3: Create a valid course
        const validCourse = await createCourseHelper({
          uri: "https://example.com/withdraw-courseid-overflow",
          withdrawers: [instructor1.address],
          redeemer: instructor1,
          validUntil: now + 86400,
          expectSuccessWith: "CourseCreated",
        });

        // Step 4: Use a courseId greater than current courseCounter
        const invalidCourseId2 = Number(await NewTreasury.courseCounter()) + 1;

        // Step 5: Try withdraw with invalid courseId
        const withdrawResult = await withdrawCoursePaymentsHelper({
          courseId: invalidCourseId2,
          fromIndex: 1,
          toIndex: 1,
          redeemer: instructor1,
          validUntil: now + 86400,
          expectRevertWith: "Invalid courseId",
          expectations: [PES],
        });
        // Expect: Reverts with "Invalid courseId" in both cases
      });

      it("should fail to withdraw when index range is invalid (fromIndex > toIndex, fromIndex = 0, toIndex > saleCount)", async function () {
        // Step 1: instructor1 creates a course
        const course1 = await createCourseHelper({
          uri: "https://example.com/withdraw-invalid-range",
          withdrawers: [instructor1.address],
          redeemer: instructor1,
          validUntil: now + 86400,
          expectSuccessWith: "CourseCreated",
        });

        // Step 2: 5 different valid sales occur for the course
        const receivers = [person1, person2, person3, person4, person5];
        for (let i = 0; i < 5; i++) {
          await buyCourseHelper({
            courseId: course1.courseId,
            tokenAddress: MKT1.target,
            coursePrice: ethers.parseEther("10"),
            courseReceiver: receivers[i].address,
            redeemer: backend,
            validUntil: now + 86400,
            nativeMsgValue: 0,
            expectSuccessWith: "ContentPurchased",
          });
        }

        // Step 3: fromIndex = 0
        await withdrawCoursePaymentsHelper({
          courseId: course1.courseId,
          fromIndex: 0,
          toIndex: 1,
          redeemer: instructor1,
          validUntil: now + 86400,
          expectRevertWith: "Invalid index range: 1toMax_saleCounterPerCourse",
          expectations: [PES],
        });

        // Step 4: fromIndex > toIndex
        await withdrawCoursePaymentsHelper({
          courseId: course1.courseId,
          fromIndex: 3,
          toIndex: 2,
          redeemer: instructor1,
          validUntil: now + 86400,
          expectRevertWith: "Invalid index range: 1toMax_saleCounterPerCourse",
          expectations: [PES],
        });

        // Step 5: toIndex > saleCounterPerCourse[courseId] (5 satış oldu, toIndex = 6)
        const invalidEnd = Number(await NewTreasury.saleCounterPerCourse(course1.courseId)) + 1;
        await withdrawCoursePaymentsHelper({
          courseId: course1.courseId,
          fromIndex: 4,
          toIndex: invalidEnd, //its 6, only five sales occured: "1-2-3-4-5"
          redeemer: instructor1,
          validUntil: now + 86400,
          expectRevertWith: "Invalid index range: 1toMax_saleCounterPerCourse",
          expectations: [PES, PES, PES], // len doesn't matter here, skipped in helper
        });
        // Expect: Reverts with "Invalid index range: 1toMax_saleCounterPerCourse" in all cases
      });

      it("should fail to withdraw when batch size exceeds maxBatchWithdrawSize", async function () {
        // Step 1: instructor1 creates a course
        const course1 = await createCourseHelper({
          uri: "https://example.com/withdraw-batch-limit",
          withdrawers: [instructor1.address],
          redeemer: instructor1,
          validUntil: now + 86400,
          expectSuccessWith: "CourseCreated",
        });

        // Step 2: get maxBatchWithdrawSize
        const maxBatch = Number(await NewTreasury.maxBatchWithdrawSize());
        const numSales = maxBatch + 1; // one more than max allowed batch size

        // Step 3: make sales more than max allowed batch size of withdraw
        const receivers = Array.from({ length: numSales }, () => ethers.Wallet.createRandom());

        for (let i = 0; i < numSales; i++) {
          await buyCourseHelper({
            courseId: course1.courseId,
            tokenAddress: MKT1.target,
            coursePrice: ethers.parseEther("10"),
            courseReceiver: receivers[i].address,
            redeemer: backend,
            validUntil: now + 86400,
            nativeMsgValue: 0,
            expectSuccessWith: "ContentPurchased",
          });
        }

        // Step 4: fast forward time after refund window
        const refundWindowInDays = Number(await NewTreasury.refundWindow()) / 86400;
        await fastForwardTime({ days: refundWindowInDays + 1 });

        // Step 5: attempt withdraw with a batch size exceeding the limit
        const fromIndex = 1; // first sale also minimum allowed index
        const toIndex = numSales; // bigger than maxBatchWithdrawSize also its last sale index

        const expectations = Array(toIndex - fromIndex + 1).fill(PES);

        const withdrawResult = await withdrawCoursePaymentsHelper({
          courseId: course1.courseId,
          fromIndex,
          toIndex,
          redeemer: instructor1,
          validUntil: now + 86400,
          expectRevertWith: "Max allowed batch withdraw range exceeded",
          expectations,
        });
        // Expect: Reverts with "Max allowed batch withdraw range exceeded"
      });

      it("should fail to withdraw when redeemer is not an authorized withdrawer", async function () {
        // Step 1: instructor1 creates course with only instructor1 as authorized withdrawer
        const course1 = await createCourseHelper({
          uri: "https://example.com/withdraw-unauthorized",
          withdrawers: [instructor1.address],
          redeemer: instructor1,
          validUntil: now + 86400,
          expectSuccessWith: "CourseCreated",
        });

        // Step 2: buyer1 purchases course
        await buyCourseHelper({
          courseId: course1.courseId,
          tokenAddress: MKT1.target,
          coursePrice: ethers.parseEther("10"),
          courseReceiver: person1.address,
          redeemer: buyer1,
          validUntil: now + 86400,
          nativeMsgValue: 0,
          expectSuccessWith: "ContentPurchased",
        });

        // Step 3: fast forward time to pass refund window
        const refundWindowInDays = Number(await NewTreasury.refundWindow()) / 86400;
        await fastForwardTime({ days: refundWindowInDays + 1 });

        // Step 4: try withdraw with unauthorized redeemer (backend not in withdrawers list)
        const withdrawResult1 = await withdrawCoursePaymentsHelper({
          courseId: course1.courseId,
          fromIndex: 1,
          toIndex: 1,
          redeemer: backend,
          validUntil: now + 86400,
          expectRevertWith: "Not authorized withdrawer for this course",
          expectations: [PES],
        });

        // Step 5: try withdraw with unauthorized redeemer (instructor2 not in withdrawers list)
        const withdrawResult2 = await withdrawCoursePaymentsHelper({
          courseId: course1.courseId,
          fromIndex: 1,
          toIndex: 1,
          redeemer: instructor2,
          validUntil: now + 86400,
          expectRevertWith: "Not authorized withdrawer for this course",
          expectations: [PES],
        });

        // Expect: Reverts with "Not authorized withdrawer for this course" in both cases
      });

      it("should fail if attemptSingleWithdrawOrRevert is called externally by any person", async function () {
        // Step 1: instructor creates a course
        const course1 = await createCourseHelper({
          uri: "https://example.com/withdraw-external-attempt",
          withdrawers: [instructor1.address],
          redeemer: instructor1,
          validUntil: now + 86400,
          expectSuccessWith: "CourseCreated",
        });

        // Step 2: buyer purchases course
        const buy_course1 = await buyCourseHelper({
          courseId: course1.courseId,
          tokenAddress: MKT1.target,
          coursePrice: ethers.parseEther("10"),
          courseReceiver: person1.address,
          redeemer: buyer1,
          validUntil: now + 86400,
          nativeMsgValue: 0,
          expectSuccessWith: "ContentPurchased",
        });

        // Step 3: fast forward beyond refund window
        const refundWindowInDays = Number(await NewTreasury.refundWindow()) / 86400;
        await fastForwardTime({ days: refundWindowInDays + 1 });

        // Step 4: test direct call reverts from all actors
        const paymentId = buy_course1.paymentId;
        const actors = [instructor1, backend, foundation];

        for (const actor of actors) {
          await expect(
            NewTreasury.connect(actor).attemptSingleWithdrawOrRevert(paymentId, actor.address)
          ).to.be.revertedWith("Only callable internally");
        }
      });

      /////###End of Failure Cases###/////
    });
    /////###End of Withdrawals###/////
  });

  // 6. Settings
  describe("⚙️ SETTINGS", function () {
    describe("✅ Success Cases", function () {
      it("should allow grant backend role to a valid address when called by foundation", async () => {
        console.log("Foundation address:", foundation.address);
        console.log("Backend address:", backend.address);

        // Step 1: Grant backend role to person1 by foundation
        await expect(await NewTreasury.connect(foundation).grantBackendRole(person1.address))
          .to.emit(NewTreasury, "BackendRoleGranted")
          .withArgs(person1.address);
        // Expect: Emits "BackendRoleGranted" event with person1 address
        // Expect: person1 should now have backend role now.
        expect(await NewTreasury.hasBackendRole(person1.address)).to.be.true;
      });

      it("should allow revoke backend role by foundation if address has role", async () => {
        // Step 1: Grant backend role to person1
        await NewTreasury.connect(foundation).grantBackendRole(person1.address);
        expect(await NewTreasury.hasBackendRole(person1.address)).to.be.true;

        // Step 2: Revoke backend role from person1 by foundation
        await expect(await NewTreasury.connect(foundation).revokeBackendRole(person1.address))
          .to.emit(NewTreasury, "BackendRoleRevoked")
          .withArgs(person1.address);

        // Expect: person1 should no longer have backend role
        expect(await NewTreasury.hasBackendRole(person1.address)).to.be.false;
      });

      it("should allow foundation to update foundation address and transfer backend role", async () => {
        // Step 1: Call setFoundationAddress with person1
        await expect(NewTreasury.connect(foundation).setFoundationAddress(person1.address))
          .to.emit(NewTreasury, "FoundationAddressUpdated")
          .withArgs(person1.address, foundation.address);

        // Expect: new foundation is person1
        expect(await NewTreasury.foundationAddress()).to.equal(person1.address);

        // Expect: person1 has backend role
        expect(await NewTreasury.hasBackendRole(person1.address)).to.be.true;

        // Expect: old foundation (original) no longer has backend role
        expect(await NewTreasury.hasBackendRole(foundation.address)).to.be.false;
      });

      it("should allow backend to update the UDAO token address", async () => {
        // Step 1: Call setUdaoTokenAddress with a new address
        await expect(NewTreasury.connect(backend).setUdaoTokenAddress(MKT2.target))
          .to.emit(NewTreasury, "UdaoTokenAddressUpdated")
          .withArgs(MKT2.target, MKT1.target);

        // Expect: new udao token address is set
        expect(await NewTreasury.udaoTokenAddress()).to.equal(MKT2.target);
      });

      it("should allow backend to update the governance address", async () => {
        // Step 1: Call setGovernanceAddress with a new address
        await expect(NewTreasury.connect(backend).setGovernanceAddress(person2.address))
          .to.emit(NewTreasury, "GovernanceAddressUpdated")
          .withArgs(person2.address, NewGovDummy.target);

        // Expect: new governance address is set
        expect(await NewTreasury.governanceAddress()).to.equal(person2.address);
      });

      it("should allow backend to update max allowed withdrawers", async () => {
        // Step 1: Read current maxAllowedWithdrawers
        const existing = await NewTreasury.maxAllowedWithdrawers();

        // Step 2: Update maxAllowedWithdrawers to higher value
        const newMax = Number(existing) + 1;
        await expect(NewTreasury.connect(backend).setMaxAllowedWithdrawers(newMax))
          .to.emit(NewTreasury, "MaxAllowedWithdrawersUpdated")
          .withArgs(newMax, existing);

        // Expect: new value is set
        expect(await NewTreasury.maxAllowedWithdrawers()).to.equal(newMax);
      });

      it("should allow backend to update max batch withdraw size", async () => {
        // Step 1: Read current maxBatchWithdrawSize
        const existing = await NewTreasury.maxBatchWithdrawSize();

        // Step 2: Update maxBatchWithdrawSize to higher value
        const newValue = Number(existing) + 1;
        await expect(NewTreasury.connect(backend).setMaxBatchWithdrawSize(newValue))
          .to.emit(NewTreasury, "MaxBatchWithdrawSizeUpdated")
          .withArgs(newValue, existing);

        // Expect: new value is set
        expect(await NewTreasury.maxBatchWithdrawSize()).to.equal(newValue);
      });

      it("should allow backend to update refund window", async () => {
        // Step 1: Read current refundWindow
        const existing = await NewTreasury.refundWindow();

        // Step 2: Update refundWindow to a different value
        const newValue = Number(existing) + 86400; // +1 day
        await expect(NewTreasury.connect(backend).setRefundWindow(newValue))
          .to.emit(NewTreasury, "RefundWindowUpdated")
          .withArgs(newValue, existing);

        // Expect: new value is set
        expect(await NewTreasury.refundWindow()).to.equal(newValue);
      });

      it("should allow backend to update all course cuts", async () => {
        // Step 1: Read existing values
        const current = {
          atFound: await NewTreasury.atFoundCut(),
          atGover: await NewTreasury.atGoverCut(),
          utFound: await NewTreasury.utFoundCut(),
          utGover: await NewTreasury.utGoverCut(),
        };

        // Step 2: Define new values
        const updated = {
          atFound: Number(current.atFound) + 1000,
          atGover: Number(current.atGover) + 1000,
          utFound: Number(current.utFound) + 1000,
          utGover: Number(current.utGover) + 1000,
        };

        // Step 3: Update via setCourseCuts
        await expect(
          NewTreasury.connect(backend).setCourseCuts(updated.atFound, updated.atGover, updated.utFound, updated.utGover)
        ).to.emit(NewTreasury, "CourseCutsUpdated");

        // Step 4: Assert new values
        expect(await NewTreasury.atFoundCut()).to.equal(updated.atFound);
        expect(await NewTreasury.atGoverCut()).to.equal(updated.atGover);
        expect(await NewTreasury.utFoundCut()).to.equal(updated.utFound);
        expect(await NewTreasury.utGoverCut()).to.equal(updated.utGover);
      });
      /////###End of Success Cases###/////
    });
    describe("❌ Failure Cases", function () {
      it("should fail to deploy treasury if constructor foundation address is zero", async () => {
        // Step 1: Try to deploy NewTreasury with zero foundation address
        const TestTreasuryFactory = await ethers.getContractFactory(
          "contracts/newTreasury/NewTreasury.sol:NewTreasury"
        );
        await expect(
          TestTreasuryFactory.deploy(ethers.ZeroAddress, MKT1.target, NewGovDummy.target)
        ).to.be.revertedWithCustomError(TestTreasuryFactory, "ZeroAddressFoundation");
        // Expect deployment to revert with "ZeroAddressFoundation" custom error
      });

      it("should fail to deploy treasury if constructor udao token address is zero", async () => {
        // Step 1: Try to deploy NewTreasury with zero udao token address
        const TestTreasuryFactory = await ethers.getContractFactory(
          "contracts/newTreasury/NewTreasury.sol:NewTreasury"
        );
        await expect(
          TestTreasuryFactory.deploy(foundation.address, ethers.ZeroAddress, NewGovDummy.target)
        ).to.be.revertedWithCustomError(TestTreasuryFactory, "ZeroAddressUdaoToken");
        // Expect deployment to revert with "ZeroAddressUdaoToken" custom error
      });

      it("should fail to deploy treasury if constructor governance address is zero", async () => {
        // Step 1: Try to deploy NewTreasury with zero governance address
        const TestTreasuryFactory = await ethers.getContractFactory(
          "contracts/newTreasury/NewTreasury.sol:NewTreasury"
        );
        await expect(
          TestTreasuryFactory.deploy(foundation.address, MKT1.target, ethers.ZeroAddress)
        ).to.be.revertedWithCustomError(TestTreasuryFactory, "ZeroAddressGovernance");
        // Expect deployment to revert with "ZeroAddressGovernance" custom error
      });

      it("should fail to grant backend role if called by a non-foundation address", async () => {
        // Step 1: Try to grant backend role by a non-foundation address
        await expect(NewTreasury.connect(backend).grantBackendRole(person1.address)).to.be.revertedWithCustomError(
          NewTreasury,
          "onlyFoundationAuthorized()"
        );
        // Expect: Reverts with "onlyFoundationAuthorized" custom error
        // Expect: person1 should not have backend role
        expect(await NewTreasury.hasBackendRole(person1.address)).to.be.false;
      });

      it("should fail to grant backend role if desired address is zero", async () => {
        // Step 1: Try to grant backend role to zero address
        await expect(
          NewTreasury.connect(foundation).grantBackendRole(ethers.ZeroAddress)
        ).to.be.revertedWithCustomError(NewTreasury, "ZeroAddressBackend()");
        // Expect: Reverts with "ZeroAddressBackend" custom error
        // Expect: backend role should not be granted to zero address
        expect(await NewTreasury.hasBackendRole(ethers.ZeroAddress)).to.be.false;
      });

      it("should fail to grant backend role if desired address is already a backend", async () => {
        // Step 1: Try to grant backend role to an address that already has it
        await expect(NewTreasury.connect(foundation).grantBackendRole(backend.address)).to.be.revertedWithCustomError(
          NewTreasury,
          "alreadyHasBackendRole()"
        );
        // Step 2: Grant backend role to person1
        await NewTreasury.connect(foundation).grantBackendRole(person1.address);
        // Step 3: Try to grant backend role to person1 again
        await expect(NewTreasury.connect(foundation).grantBackendRole(person1.address)).to.be.revertedWithCustomError(
          NewTreasury,
          "alreadyHasBackendRole()"
        );
        // Expect: Reverts with "alreadyHasBackendRole" custom error in both cases
        // Expect: both backend and person1 should have backend role
        expect(await NewTreasury.hasBackendRole(backend.address)).to.be.true;
        expect(await NewTreasury.hasBackendRole(person1.address)).to.be.true;
      });

      it("should fail to revoke backend role if called by a non-foundation address", async () => {
        // Step 1: Grant backend role to person1
        await NewTreasury.connect(foundation).grantBackendRole(person1.address);

        // Step 2: Try to revoke by backend (not foundation)
        await expect(NewTreasury.connect(backend).revokeBackendRole(person1.address)).to.be.revertedWithCustomError(
          NewTreasury,
          "onlyFoundationAuthorized()"
        );

        // Expect: person1 should still have backend role
        expect(await NewTreasury.hasBackendRole(person1.address)).to.be.true;
      });

      it("s ould fail to revoke backend role if address is zero", async () => {
        // Step 1: Try to revoke zero address
        await expect(
          NewTreasury.connect(foundation).revokeBackendRole(ethers.ZeroAddress)
        ).to.be.revertedWithCustomError(NewTreasury, "ZeroAddressBackend()");

        // Expect: role still false
        expect(await NewTreasury.hasBackendRole(ethers.ZeroAddress)).to.be.false;
      });

      it("should fail to revoke backend role if address doesn't have role", async () => {
        // Step 1: Ensure person1 has no backend role
        expect(await NewTreasury.hasBackendRole(person1.address)).to.be.false;

        // Step 2: Try to revoke
        await expect(NewTreasury.connect(foundation).revokeBackendRole(person1.address)).to.be.revertedWithCustomError(
          NewTreasury,
          "alreadyHasNotBackendRole()"
        );

        // Expect: still false
        expect(await NewTreasury.hasBackendRole(person1.address)).to.be.false;
      });

      it("should fail to update foundation address if called by non-foundation", async () => {
        // Step 1: Try to update foundation address by backend
        await expect(NewTreasury.connect(backend).setFoundationAddress(person1.address)).to.be.revertedWithCustomError(
          NewTreasury,
          "onlyFoundationAuthorized()"
        );

        // Expect: foundation still unchanged
        expect(await NewTreasury.foundationAddress()).to.equal(foundation.address);
      });

      it("should fail to update foundation address if new address is zero", async () => {
        // Step 1: Try to update foundation address to zero address
        await expect(
          NewTreasury.connect(foundation).setFoundationAddress(ethers.ZeroAddress)
        ).to.be.revertedWithCustomError(NewTreasury, "ZeroAddressFoundation()");

        // Expect: foundation still unchanged
        expect(await NewTreasury.foundationAddress()).to.equal(foundation.address);
      });

      it("should fail to update foundation address if new address is same as current", async () => {
        // Step 1: Try to update foundation address to current address
        await expect(
          NewTreasury.connect(foundation).setFoundationAddress(foundation.address)
        ).to.be.revertedWithCustomError(NewTreasury, "NoChange()");

        // Expect: foundation still unchanged
        expect(await NewTreasury.foundationAddress()).to.equal(foundation.address);
      });

      it("should fail to update UDAO token address if called by non-backend", async () => {
        // Step 1: Try to update UDAO token address by person1 (not backend)
        await expect(NewTreasury.connect(person1).setUdaoTokenAddress(MKT2.target)).to.be.revertedWithCustomError(
          NewTreasury,
          "onlyBackendAuthorized()"
        );

        // Expect: address remains unchanged
        expect(await NewTreasury.udaoTokenAddress()).to.equal(MKT1.target);
      });

      it("should fail to update UDAO token address if new address is zero", async () => {
        // Step 1: Try to update UDAO token address to zero address
        await expect(
          NewTreasury.connect(backend).setUdaoTokenAddress(ethers.ZeroAddress)
        ).to.be.revertedWithCustomError(NewTreasury, "ZeroAddressUdaoToken()");

        // Expect: address remains unchanged
        expect(await NewTreasury.udaoTokenAddress()).to.equal(MKT1.target);
      });

      it("should fail to update UDAO token address if new address is same as current", async () => {
        // Step 1: Try to update UDAO token address to current address
        await expect(NewTreasury.connect(backend).setUdaoTokenAddress(MKT1.target)).to.be.revertedWithCustomError(
          NewTreasury,
          "NoChange()"
        );

        // Expect: address remains unchanged
        expect(await NewTreasury.udaoTokenAddress()).to.equal(MKT1.target);
      });

      it("should fail to update governance address if called by non-backend", async () => {
        // Step 1: Try to update governance address by outsider (not backend)
        await expect(NewTreasury.connect(person3).setGovernanceAddress(person1.address)).to.be.revertedWithCustomError(
          NewTreasury,
          "onlyBackendAuthorized()"
        );

        // Expect: address remains unchanged
        expect(await NewTreasury.governanceAddress()).to.equal(NewGovDummy.target);
      });

      it("should fail to update governance address if new address is zero", async () => {
        // Step 1: Try to update governance address to zero address
        await expect(
          NewTreasury.connect(backend).setGovernanceAddress(ethers.ZeroAddress)
        ).to.be.revertedWithCustomError(NewTreasury, "ZeroAddressGovernance()");

        // Expect: address remains unchanged
        expect(await NewTreasury.governanceAddress()).to.equal(NewGovDummy.target);
      });

      it("should fail to update governance address if new address is same as current", async () => {
        // Step 1: Try to update governance address to current address
        await expect(
          NewTreasury.connect(backend).setGovernanceAddress(NewGovDummy.target)
        ).to.be.revertedWithCustomError(NewTreasury, "NoChange()");

        // Expect: address remains unchanged
        expect(await NewTreasury.governanceAddress()).to.equal(NewGovDummy.target);
      });

      it("should fail to update max allowed withdrawers if called by non-backend", async () => {
        // Step 1: Read current maxAllowedWithdrawers
        const existing = await NewTreasury.maxAllowedWithdrawers();

        // Step 2: Try to update max allowed withdrawers by outsider (not backend)
        const newMax = Number(existing) + 1;
        await expect(NewTreasury.connect(person1).setMaxAllowedWithdrawers(newMax)).to.be.revertedWithCustomError(
          NewTreasury,
          "onlyBackendAuthorized()"
        );

        // Expect: value remains unchanged
        expect(await NewTreasury.maxAllowedWithdrawers()).to.equal(existing);
      });

      it("should fail to update max allowed withdrawers if value is 0", async () => {
        // Step 1: Read current maxAllowedWithdrawers
        const existing = await NewTreasury.maxAllowedWithdrawers();

        // Step 2: Try to update max allowed withdrawers to 0
        await expect(NewTreasury.connect(backend).setMaxAllowedWithdrawers(0)).to.be.revertedWithCustomError(
          NewTreasury,
          "ZeroValueNotAccepted()"
        );

        // Expect: value remains unchanged
        expect(await NewTreasury.maxAllowedWithdrawers()).to.equal(existing);
      });

      it("should fail to update max allowed withdrawers if new value is same", async () => {
        // Step 1: Read current maxAllowedWithdrawers
        const existing = await NewTreasury.maxAllowedWithdrawers();
        await expect(NewTreasury.connect(backend).setMaxAllowedWithdrawers(existing)).to.be.revertedWithCustomError(
          NewTreasury,
          "NoChange()"
        );

        // Expect: value remains unchanged
        expect(await NewTreasury.maxAllowedWithdrawers()).to.equal(existing);
      });

      it("should fail to update max batch withdraw size if called by non-backend", async () => {
        // Step 1: Read current maxBatchWithdrawSize
        const existing = await NewTreasury.maxBatchWithdrawSize();

        // Step 2: Try to update max batch withdraw size by outsider (not backend)
        const newValue = Number(existing) + 1;
        await expect(NewTreasury.connect(person1).setMaxBatchWithdrawSize(newValue)).to.be.revertedWithCustomError(
          NewTreasury,
          "onlyBackendAuthorized()"
        );

        // Expect: value remains unchanged
        expect(await NewTreasury.maxBatchWithdrawSize()).to.equal(existing);
      });

      it("should fail to update max batch withdraw size if value is 0", async () => {
        // Step 1: Read current maxBatchWithdrawSize
        const existing = await NewTreasury.maxBatchWithdrawSize();

        // Step 2: Try to update max batch withdraw size to 0
        await expect(NewTreasury.connect(backend).setMaxBatchWithdrawSize(0)).to.be.revertedWithCustomError(
          NewTreasury,
          "ZeroValueNotAccepted()"
        );

        // Expect: value remains unchanged
        expect(await NewTreasury.maxBatchWithdrawSize()).to.equal(existing);
      });

      it("should fail to update max batch withdraw size if new value is same", async () => {
        // Step 1: Read current maxBatchWithdrawSize
        const existing = await NewTreasury.maxBatchWithdrawSize();

        // Step 2: Try to update with same value
        await expect(NewTreasury.connect(backend).setMaxBatchWithdrawSize(existing)).to.be.revertedWithCustomError(
          NewTreasury,
          "NoChange()"
        );

        // Expect: value remains unchanged
        expect(await NewTreasury.maxBatchWithdrawSize()).to.equal(existing);
      });

      it("should fail to update refund window if called by non-backend", async () => {
        // Step 1: Read current refundWindow
        const existing = await NewTreasury.refundWindow();

        // Step 2: Try to update refundWindow from outsider
        const newValue = Number(existing) + 86400;
        await expect(NewTreasury.connect(person1).setRefundWindow(newValue)).to.be.revertedWithCustomError(
          NewTreasury,
          "onlyBackendAuthorized()"
        );

        // Expect: value remains unchanged
        expect(await NewTreasury.refundWindow()).to.equal(existing);
      });

      it("should fail to update refund window if new value is same", async () => {
        // Step 1: Read current refundWindow
        const existing = await NewTreasury.refundWindow();

        // Step 2: Try to update with same value
        await expect(NewTreasury.connect(backend).setRefundWindow(existing)).to.be.revertedWithCustomError(
          NewTreasury,
          "NoChange()"
        );

        // Expect: value remains unchanged
        expect(await NewTreasury.refundWindow()).to.equal(existing);
      });

      it("should fail if called by non-backend", async () => {
        // Step 1: Try to update cuts from outsider
        await expect(NewTreasury.connect(person1).setCourseCuts(100, 100, 100, 100)).to.be.revertedWithCustomError(
          NewTreasury,
          "onlyBackendAuthorized()"
        );
        // Expect: Reverts with "onlyBackendAuthorized" custom error
      });

      it("should fail if non-udao cuts exceed 100%", async () => {
        // Step 1: Set non-udao cuts over 100%
        await expect(
          NewTreasury.connect(backend).setCourseCuts(90_000, 20_000, 4000, 500)
        ).to.be.revertedWithCustomError(NewTreasury, "NonUdaoCutsCantExceed100Percent()");
        // Expect: Reverts with "NonUdaoCutsCantExceed100Percent" custom error
      });

      it("should fail if udao cuts exceed 100%", async () => {
        // Step 1: Set udao cuts over 100%
        await expect(
          NewTreasury.connect(backend).setCourseCuts(6000, 1000, 80_000, 30_000)
        ).to.be.revertedWithCustomError(NewTreasury, "UdaoCutsCantExceed100Percent()");
        // Expect: Reverts with "UdaoCutsCantExceed100Percent" custom error
      });

      it("should fail if all values are same", async () => {
        // Step 1: Read current values
        const current = {
          atFound: await NewTreasury.atFoundCut(),
          atGover: await NewTreasury.atGoverCut(),
          utFound: await NewTreasury.utFoundCut(),
          utGover: await NewTreasury.utGoverCut(),
        };

        // Step 2: Try to set with same values
        await expect(
          NewTreasury.connect(backend).setCourseCuts(current.atFound, current.atGover, current.utFound, current.utGover)
        ).to.be.revertedWithCustomError(NewTreasury, "NoChange()");
        // Expect: Reverts with "NoChange" custom error
      });
      /////###End of Failure Cases###/////
    });
    /////###End of Settings###/////
  });
  // End of tests
});

/*

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

*/

/*
Erequire(_redeemer == msg.sender, "Only redeemer can use this voucher");
token.transferFrom başarısız (örnek: approval yoksa)
1. createCourse && updateCourse: withdrawers.length > 4 denenir olmaz arttırılır denenir olur.
5. withdrawCoursePayments
Satış refund edilmiş
Satış refund window içinde
attemptSingleWithdrawOrRevert çağrısı revert ederse (örneğin: governanceContract fonksiyonu revert ederse)

*/

//Başarısız satış:
//paymentCounter // artmaz, ama talep edilen yerlerde gelecek için kontrol edersin.
//payments[newPaymentId] // boş payment struct
//saleCounterPerCourse[_courseId] // artmaz
//courseSaleRecords[_courseId][-coursun satış sayısı-] // 0

//courseOwnerToPayment[_courseReceiver][_courseId] // 0
//ownedCourses[_courseReceiver] //değişmez
//ownedCourseIndex[_courseReceiver][_courseId] // 0
//hasOwnedCourse

//Başarılı satış ve iade:
//paymentCounter // +1 --> azaltılamaz
//payments[newPaymentId] // new payment sctruct --> .refunded
//saleCounterPerCourse[_courseId] // +1, bu kursun satış sayısı --> azaltılamaz
//courseSaleRecords[_courseId][-coursun satış sayısı-] //yeni paymentId'yi tutuyor --> record silinmedi kalıcak

//courseOwnerToPayment[_courseReceiver][_courseId] // paymentId tutuyor --> silindi onlyRefund diğer durumlarda stable değil
//ownedCourses[_courseReceiver] //courseId array'e eklendi [0,1] olmalı. --> sonuncuyla yerdeğişti silindi
//ownedCourseIndex[_courseReceiver][_courseId] // kaçıncı indiste gerçek değer, --> silindi
//hasOwnedCourse --> false

//////////////////////////////////////////////////////////////////////////////////////////////////////

//Başarılı satış ve iade:
//paymentCounter // +1 --> azaltılamaz
//saleCounterPerCourse[_courseId] // +1, bu kursun satış sayısı --> azaltılamaz
//courseSaleRecords[_courseId][-coursun satış sayısı-] //yeni paymentId'yi tutuyor --> record silinmedi kalıcak

//courseOwnerToPayment[_courseReceiver][_courseId] // paymentId tutuyor --> silindi onlyRefund diğer durumlarda stable değil
//ownedCourses[_courseReceiver] //courseId array'e eklendi [0,1] olmalı. --> sonuncuyla yerdeğişti silindi
//ownedCourseIndex[_courseReceiver][_courseId] // kaçıncı indiste gerçek değer, --> silindi
//hasOwnedCourse --> false
//payments[newPaymentId] // new payment sctruct --> .refunded

//Başarılı satış baraşırız iade:
//paymentCounter // +1 --> azaltılamaz
//saleCounterPerCourse[_courseId] // +1, bu kursun satış sayısı --> azaltılamaz
//courseSaleRecords[_courseId][-coursun satış sayısı-] //yeni paymentId'yi tutuyor --> değişmez

//courseOwnerToPayment[_courseReceiver][_courseId] // paymentId tutuyor --> değişmez
//ownedCourses[_courseReceiver] //courseId array'e eklendi [0,1] olmalı. --> değişmez
//ownedCourseIndex[_courseReceiver][_courseId] // kaçıncı indiste gerçek değer, --> değişmez
//hasOwnedCourse --> değişmez
//payments[newPaymentId] // new payment sctruct --> değişmez
