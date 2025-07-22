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
  const isMaxWithdrawersExceeded = input.withdrawers.length > (await NewTreasury.maxWithdrawer());
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
  const isMaxWithdrawersExceeded = input.withdrawers.length > (await NewTreasury.maxWithdrawer());
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

describe("NewTreasury Contract Tests", function () {
  // ethers v6 uses `.target` instead of `.address` for deployed contracts
  beforeEach(async function () {
    // Revert to snapshot and take a new one for next test
    await network.provider.send("evm_revert", [snapshotId]);
    snapshotId = await network.provider.send("evm_snapshot");
    // Repeted setup for every test
    ({ createVH, updateVH, buyVH, refundVH, refundByOwnerVH, withdrawVH } = getVoucherHelpers());
    await updatenow();
    // TODO: uriToCourseId expect ekle.
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
        // Step 1: Read maxWithdrawer from contract and convert to Number
        const max = Number(await NewTreasury.maxWithdrawer());

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

        // Step 2: Read maxWithdrawer from contract and convert to Number
        const max = Number(await NewTreasury.maxWithdrawer());

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
      /////###End of Failure Cases###/////
    });
    /////###End of Refunds: byOwner and courseId###/////
  });

  // 5. Withdrawals
  describe("🏦 WITHDRAWALS", function () {
    describe("✅ Success Cases", function () {
      it("should allow instructor1 to withdraw payments for sales 1 to 3", async function () {
        // 1. instructor1 course oluşturur
        const course1 = await createCourseHelper({
          uri: "https://example.com/withdraw-course/1",
          withdrawers: [instructor1.address],
          redeemer: instructor1,
          validUntil: now + 86400,
          expectSuccessWith: "CourseCreated",
        });

        const price = [10, 10, 10, 10, 10];
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

        // 2. Zamanı ileri al: refund window sonlansın
        await fastForwardTime({ days: 25 }); // 25 gün ileri al
        const withdrawDValidUntil = now + 86400;

        // 3. Balance öncesi
        const instructorBalBefore = await MKT1.balanceOf(instructor1.address);
        const contractBalBefore = await MKT1.balanceOf(NewTreasury.target);

        // 4. Withdraw işlemi
        const withdrawVoucher = await withdrawVH.signVoucher({
          courseId: course1.courseId,
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
        expect(decoded.courseId).to.equal(course1.courseId);
        expect(decoded.fromIndex).to.equal(1n);
        expect(decoded.toIndex).to.equal(3n);
        expect(decoded.withdrawer).to.equal(instructor1.address);
        expect(decoded.withdrawnCompleted).to.equal(3n);

        // 5. Flag kontrolü
        for (let j = 1; j <= 3; j++) {
          const paymentId = await NewTreasury.courseSaleRecords(course1.courseId, j);
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
        const [refunded, withdrawn, inWindow, ready] = await NewTreasury.checkWithdrawStatus(course1.courseId, 1, 3);

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
      /////###End of Success Cases###/////
    });

    describe("❌ Failure Cases", function () {
      it("should fail to withdraw...", async function () {
        // Test logic for withdrawal failure
      });
      /////###End of Failure Cases###/////
    });
    /////###End of Withdrawals###/////
  });

  // End of tests
});
/*
Erequire(_redeemer == msg.sender, "Only redeemer can use this voucher");
require(!payment.isWithdrawn, "Already withdrawn"); cannot refund

1. createCourse && updateCourse
withdrawers.length > 4 denenir olmaz arttırılır denenir olur.

2. buyCourse another
❌ Failure Test Cases
Invalid courseId (0 or > courseCounter)
→ require(_courseId > 0 && _courseId <= courseCounter)

Course is not sellable
→ require(courses[_courseId].sellable)

User already owns the course
→ require(!hasOwnedCourse[_courseReceiver][_courseId])

Price is 0
→ require(_coursePrice > 0)

Native payment with incorrect msg.value
→ require(msg.value == _coursePrice)

ERC20 payment but msg.value > 0
→ require(msg.value == 0)

ERC20 transfer fails
→ (bu opsiyonel; test kontratında ERC20'ye özel fail mekanizması kurarsan testlenebilir)

3. buyCourse
Kurs sellable == false → revert "Course is not sellable"

Kurs daha önce alınmış → revert "Content receiver already owns this course"

Yanlış ETH miktarı gönderilirse → revert "Incorrect amount sent"

Native gönderilirken tokenAddress != 0x0

token.transferFrom başarısız (örnek: approval yoksa)

4. refundCourse
Süresi geçmiş (validUntil < now) → revert "Voucher expired"

Zaten refund edilmiş payment

Refund window geçmiş

paymentId geçersiz

5. withdrawCoursePayments
Yetkisiz kişi → revert "Not authorized withdrawer for this course"

Aralık geçersiz (from > to veya toIndex > saleCounter)

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
