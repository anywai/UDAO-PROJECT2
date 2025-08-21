const { expect } = require("chai");
const { ethers } = require("hardhat");
require("dotenv").config();
const util = require("util");

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

let snapshotId;

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
let falseRedeemer;

/////### TEST HELPERS ###/////
const decideSuccess = (expectSuccessWith, expectRevertWith) => {
  const s = typeof expectSuccessWith === "string" && expectSuccessWith.length > 0;
  const r = typeof expectRevertWith === "string" && expectRevertWith.length > 0;
  if (s === r) throw new Error("Exactly one of expectSuccessWith or expectRevertWith must be defined.");
  return s; // true => success, false => revert
};

async function createCourseBatchHelper({
  uries,
  withdrawersArrays,
  redeemers,
  validUntils,
  createBatchTxCaller,
  expectRevertWith,
  expectSuccessWith,
}) {
  const n = uries.length;
  // 0) Parametre uzunluklarını doğrula
  if (withdrawersArrays.length !== n || redeemers.length !== n || validUntils.length !== n) {
    throw new Error("Input arrays must have the same length");
  }
  // 1) Ensure exactly one is expectation provided; expectSuccess=true, expectRevertWith=false.
  const waitSuccess = decideSuccess(expectSuccessWith, expectRevertWith);
  // 2) Vouchers'ları imzala
  const vouchers = [];
  for (let i = 0; i < n; i++) {
    const createVoucher = await createVH.signVoucher({
      uri: uries[i],
      withdrawers: withdrawersArrays[i],
      redeemer: falseRedeemer == null ? redeemers[i] : falseRedeemer, // falseRedeemer ?? redeemers[i], same
      validUntil: validUntils[i],
    });
    vouchers.push(createVoucher);
  }

  // predict expected outcomes of create before tx
  const currentCourseCounter = await NewTreasury.courseCounter();
  const expectedOutcome = await _prepareExpectedCreateBatchStates(vouchers, waitSuccess);

  // 4) Tx gönderimi ve kontrol
  let tx = null;
  if (!waitSuccess) {
    await expect(NewTreasury.connect(createBatchTxCaller).createCourseBatch(vouchers)).to.be.revertedWithCustomError(
      NewTreasury,
      expectRevertWith
    );
  } else if (waitSuccess) {
    tx = await NewTreasury.connect(createBatchTxCaller).createCourseBatch(vouchers);
    const receipt = await tx.wait();
    const gasUsed = receipt.gasUsed;
    //console.log("Create Gas used: ", gasUsed);

    // 5) Event parsing ve doğrulama
    const parsedEvents = receipt.logs
      .map((log) => {
        try {
          return NewTreasury.interface.parseLog(log);
        } catch {
          return null;
        }
      })
      .filter((parsed) => parsed && parsed.name === "CourseCreated");

    // a) tam sayıda event basılmış mı?
    expect(parsedEvents.length, "CourseCreated event count not match with the expected").to.equal(n);
    // b) sırayla decode edip courseId & uri karşılaştır
    for (let i = 0; i < n; i++) {
      const ev = parsedEvents[i].args;
      expect(ev.courseId).to.equal(currentCourseCounter + BigInt(i + 1));
      expect(ev.uriHash).to.equal(ethers.keccak256(ethers.toUtf8Bytes(uries[i])));
      expect(ev.createdBy).to.equal(createBatchTxCaller.address);
    }
  }

  // Expected outcomes should be satisfied
  await _expectCreateBatch(expectedOutcome);

  // return course id
  return {
    courseIds: waitSuccess ? Array.from({ length: n }, (_, i) => currentCourseCounter + BigInt(i + 1)) : [],
    expectedOutcome,
  };
}

async function _prepareExpectedCreateBatchStates(vouchers, waitSuccess) {
  const currentCourseCounter = await NewTreasury.courseCounter();

  const expected = {
    expectedCourseCounter: waitSuccess ? currentCourseCounter + BigInt(vouchers.length) : currentCourseCounter,
    expectedCourses: [], // { courseId, uri, sellable }
    expectedUriToCourseId: [], // { uriHash, courseId }
    expectedAuthorizedWithdrawers: [], // { courseId, withdrawers: address[] }
    expectedIsAuthorizedWithdrawer: [], // { courseId, isWithdrawer: { address: true/false } }
  };

  // hold next courseId for iteration
  for (let i = 0; i < vouchers.length; i++) {
    const { uri, withdrawers } = vouchers[i];
    const uriHash = ethers.keccak256(ethers.toUtf8Bytes(uri));
    const courseId = currentCourseCounter + BigInt(i + 1);

    // isWithdrawer mapping: true for each if waitSuccess=true, otherwise false
    const isWithdrawer = Object.fromEntries(withdrawers.map((w) => [w, waitSuccess]));
    // expected course object
    expected.expectedCourses.push({
      courseId,
      uri: waitSuccess ? uri : "",
      sellable: waitSuccess,
    });
    // expected uri to courseId mapping
    const existingCourseId = waitSuccess ? null : await NewTreasury.uriToCourseId(uriHash); // if not exists, returns 0n
    expected.expectedUriToCourseId.push({
      uri,
      uriHash,
      courseId: waitSuccess ? courseId : existingCourseId,
    });
    // expected authorized withdrawers
    expected.expectedAuthorizedWithdrawers.push({ courseId, withdrawers: waitSuccess ? withdrawers : [] });
    // expected isAuthorizedWithdrawer mapping
    expected.expectedIsAuthorizedWithdrawer.push({ courseId, isWithdrawer });
  }
  return expected;
}

async function _expectCreateBatch(expected) {
  // 1) courseCounter kontrolü
  const actualCounter = await NewTreasury.courseCounter();
  expect(actualCounter).to.equal(expected.expectedCourseCounter);

  // 2) Courses: uri & sellable
  for (const { courseId, uri, sellable } of expected.expectedCourses) {
    const course = await NewTreasury.courses(courseId);
    expect(course.uri).to.equal(uri);
    expect(course.sellable).to.equal(sellable);
  }

  // 3) uriToCourseId eşleşmesi
  for (const { uri, uriHash, courseId } of expected.expectedUriToCourseId) {
    const calculatedUriHash = ethers.keccak256(ethers.toUtf8Bytes(uri));
    expect(calculatedUriHash).to.equal(uriHash);
    const actual = await NewTreasury.uriToCourseId(calculatedUriHash);
    expect(actual).to.equal(courseId);
  }

  // 4) authorizedWithdrawers listesi
  for (const { courseId, withdrawers } of expected.expectedAuthorizedWithdrawers) {
    const actual = await NewTreasury.getAuthorizedWithdrawers(courseId);
    expect(actual).to.deep.equal(withdrawers);
  }

  // 5) isAuthorizedWithdrawer doğrulaması
  for (const { courseId, isWithdrawer } of expected.expectedIsAuthorizedWithdrawer) {
    for (const [addr, expectedBool] of Object.entries(isWithdrawer)) {
      const actual = await NewTreasury.isAuthorizedWithdrawer(addr, courseId);
      expect(actual).to.equal(expectedBool);
    }
  }
}

async function quickCreateACourse({
  uri = "https://example.com/course/1",
  w = [instructor1.address],
  redeemer = instructor1,
  validUntil = now + 86400,
  caller = instructor1,
  expectSuccessWith = "CourseCreated",
} = {}) {
  const oneCourse = await createCourseBatchHelper({
    uries: [uri],
    withdrawersArrays: [w],
    redeemers: [redeemer.address],
    validUntils: [validUntil],
    createBatchTxCaller: caller,
    expectSuccessWith,
  });

  return oneCourse.courseIds[0];
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
}) {
  // 1) Ensure exactly one is expectation provided; expectSuccess=true, expectRevertWith=false.
  const waitSuccess = decideSuccess(expectSuccessWith, expectRevertWith);

  // Create voucher for updateCourse
  const voucher = await updateVH.signVoucher({
    courseId,
    uri,
    sellable,
    withdrawers,
    redeemer: falseRedeemer == null ? redeemer.address : falseRedeemer,
    validUntil,
  });

  // Prepare expected state before update
  const expectedOutcome = await _prepareExpectedUpdateState(voucher, waitSuccess);
  //console.log("expectedOutcome", util.inspect(expectedOutcome, { depth: null, colors: true }));

  let tx;
  if (expectRevertWith) {
    await expect(NewTreasury.connect(redeemer).updateCourse(voucher)).to.be.revertedWithCustomError(
      NewTreasury,
      expectRevertWith
    );
  } else if (expectSuccessWith) {
    const oldUri = (await NewTreasury.courses(courseId)).uri;
    tx = await NewTreasury.connect(redeemer).updateCourse(voucher);
    //receipt
    const receipt = await tx.wait();
    //console.log("Update Gas used: ", receipt.gasUsed);
    const emptyUriHash = ethers.keccak256(ethers.toUtf8Bytes(""));
    const oldUriHash = ethers.keccak256(ethers.toUtf8Bytes(oldUri));
    const newUriHash = ethers.keccak256(ethers.toUtf8Bytes(uri));
    const isUriChanged = newUriHash !== oldUriHash && newUriHash !== emptyUriHash;
    if (isUriChanged) {
      await expect(tx).to.emit(NewTreasury, "CourseUriUpdated").withArgs(courseId, newUriHash, oldUriHash);
    }
    await expect(tx)
      .to.emit(NewTreasury, expectSuccessWith)
      .withArgs(courseId, sellable, isUriChanged, redeemer.address);
  } else {
    throw new Error("What you expect? No success or revert condition provided. --updateCourseHelper--");
  }

  // verify expected state after update
  await _expectUpdate(expectedOutcome);

  return {
    courseId: courseId,
    uri: uri,
    sellable: sellable,
    withdrawers: withdrawers,
    tx,
  };
}

async function _prepareExpectedUpdateState(voucher, waitSuccess) {
  const { courseId, uri, sellable, withdrawers } = voucher;
  // get existing states from contract
  const [courseCounter, prevCourse, prevWithdrawers] = await Promise.all([
    NewTreasury.courseCounter(),
    NewTreasury.courses(courseId), //{ uri, sellable } if invalid courseId retuns "", false
    NewTreasury.getAuthorizedWithdrawers(courseId), // if invalid courseId returns []
  ]);
  // if withdrawers is empty, use previous withdrawers
  const effectiveWithdrawers = withdrawers.length === 0 ? prevWithdrawers : withdrawers;

  const oldUriHash = ethers.keccak256(ethers.toUtf8Bytes(prevCourse.uri));
  const newUriHash = ethers.keccak256(ethers.toUtf8Bytes(uri));
  const [oldUriHashToId, newUriHashToId] = await Promise.all([
    NewTreasury.uriToCourseId(oldUriHash),
    NewTreasury.uriToCourseId(newUriHash),
  ]);

  const hasEmptyUri = uri.length === 0;
  const uriUnchanged = hasEmptyUri || newUriHash === oldUriHash;
  // ---- expected course fields ----
  const expectedUri = waitSuccess ? (uriUnchanged ? prevCourse.uri : uri) : prevCourse.uri;
  const expectedSellable = waitSuccess ? sellable : prevCourse.sellable;
  // ---- expected withdrawers ----
  const expectedWithdrawers = waitSuccess ? effectiveWithdrawers : prevWithdrawers;
  // union set → isAuthorized map
  const addrSet = new Set([...prevWithdrawers, ...effectiveWithdrawers]);
  const expectedIsAuthorized = Object.fromEntries([...addrSet].map((a) => [a, expectedWithdrawers.includes(a)]));
  // expected uriToCourseId entries
  const expectedUriToCourseId = [
    {
      uri: prevCourse.uri,
      uriHash: oldUriHash,
      courseId: waitSuccess ? (uriUnchanged ? courseId : 0n) : oldUriHashToId,
    },
    {
      uri,
      uriHash: newUriHash,
      courseId: waitSuccess ? (hasEmptyUri ? newUriHashToId : courseId) : newUriHashToId,
    },
  ];
  // ---- return expected object ----
  return {
    courseId,
    expectedCourseCounter: courseCounter,
    expectedCourse: {
      uri: expectedUri,
      sellable: expectedSellable,
    },
    expectedAuthorizedWithdrawers: {
      courseId,
      withdrawers: expectedWithdrawers,
    },
    expectedIsAuthorizedWithdrawer: {
      courseId,
      isWithdrawer: expectedIsAuthorized, // { address: boolean }
    },
    expectedUriToCourseId, // [{ uri, uriHash, courseId }]
  };
}

async function _expectUpdate(expected) {
  const {
    courseId,
    expectedCourseCounter,
    expectedCourse, // { uri, sellable }
    expectedAuthorizedWithdrawers, // { courseId, withdrawers }
    expectedIsAuthorizedWithdrawer, // { courseId, isWithdrawer: { addr: bool } }
    expectedUriToCourseId, // [{ uri, uriHash, courseId }]
  } = expected;

  // 1) courseCounter değişmedi
  const actualCounter = await NewTreasury.courseCounter();
  expect(actualCounter).to.equal(expectedCourseCounter);
  // 2) Course (uri & sellable)
  const course = await NewTreasury.courses(courseId);
  expect(course.uri).to.equal(expectedCourse.uri);
  expect(course.sellable).to.equal(expectedCourse.sellable);
  // 3) authorizedWithdrawers listesi (sıra önemliyse expected oluşturulurken aynısını kullan)
  const actualWithdrawers = await NewTreasury.getAuthorizedWithdrawers(courseId);
  expect(actualWithdrawers).to.deep.equal(expectedAuthorizedWithdrawers.withdrawers);
  // 4) isAuthorizedWithdrawer bayrakları (union set üzerinden)
  const entries = Object.entries(expectedIsAuthorizedWithdrawer.isWithdrawer || {});
  for (const [addr, expBool] of entries) {
    const isAuth = await NewTreasury.isAuthorizedWithdrawer(addr, courseId);
    expect(isAuth).to.equal(expBool);
  }
  // 5) uriToCourseId mapping kontrolleri (eski + yeni hash’ler)
  for (const item of expectedUriToCourseId) {
    const { uri, uriHash, courseId: expId } = item;
    const calcHash = ethers.keccak256(ethers.toUtf8Bytes(uri));
    expect(calcHash).to.equal(uriHash);
    const onchainId = await NewTreasury.uriToCourseId(uriHash);
    expect(onchainId).to.equal(expId);
  }
}

async function buyCourseBatchHelper({
  courseIds,
  tokenAddresses,
  coursePrices,
  courseReceivers,
  redeemers,
  validUntils,
  nativeMsgValue, // total native balance to sended to contract
  buyBatchTxCaller,
  expectRevertWith,
  expectSuccessWith,
}) {
  // 0) Basit doğrulamalar
  const n = courseIds.length;
  if (
    tokenAddresses.length !== n ||
    coursePrices.length !== n ||
    courseReceivers.length !== n ||
    redeemers.length !== n ||
    validUntils.length !== n
  ) {
    throw new Error("Array parametrelerinin uzunlukları eşit olmalı.");
  }

  // 1) Ensure exactly one is expectation provided; expectSuccess=true, expectRevertWith=false.
  const waitSuccess = decideSuccess(expectSuccessWith, expectRevertWith);

  // 1) Voucher'ları imzala
  const vouchers = [];
  for (let i = 0; i < n; i++) {
    const buyVoucher = await buyVH.signVoucher({
      courseId: courseIds[i],
      tokenAddress: tokenAddresses[i],
      coursePrice: coursePrices[i],
      courseReceiver: courseReceivers[i],
      redeemer: falseRedeemer == null ? redeemers[i].address : falseRedeemer,
      validUntil: validUntils[i],
    });
    vouchers.push(buyVoucher);
  }
  // predict expected outcomes of buy before tx
  const expectedOutcome = await _prepareExpectedBuyBatchStates(vouchers, buyBatchTxCaller.address, waitSuccess);

  const currentPaymentCounter = await NewTreasury.paymentCounter();
  let tx = null;
  let gasCost = 0n;
  if (!waitSuccess) {
    if (expectRevertWith === "Recipient blocked from") {
      // its a bad design, ı write it to pass only one test
      await expect(
        NewTreasury.connect(buyBatchTxCaller).buyCourseBatch(vouchers, {
          value: nativeMsgValue,
        })
      ).to.be.revertedWith(expectRevertWith);
    } else {
      await expect(
        NewTreasury.connect(buyBatchTxCaller).buyCourseBatch(vouchers, {
          value: nativeMsgValue,
        })
      ).to.be.revertedWithCustomError(NewTreasury, expectRevertWith);
    }
    // not possible to catch gas cost on revert
  } else if (waitSuccess) {
    // send tx
    tx = await NewTreasury.connect(buyBatchTxCaller).buyCourseBatch(vouchers, {
      value: nativeMsgValue,
    });
    const receipt = await tx.wait();
    //console.log("Buy Gas used: ", receipt.gasUsed);
    // eventleri kontrol et:
    const parsed = receipt.logs
      .map((l) => {
        try {
          return NewTreasury.interface.parseLog(l);
        } catch {
          return null;
        }
      })
      .filter((p) => p && p.name === "ContentPurchased");

    // a) tam sayıda event basılmış mı?
    expect(parsed.length, "ContentPurchased event sayısı beklenenle eşleşmiyor").to.equal(n);
    // b) sırayla decode edip courseId & courseReceiver karşılaştır
    for (let i = 0; i < n; i++) {
      const ev = parsed[i].args;
      const { paymentId, courseId, contentReceiver, payer, tokenAddress, receivedCoursePrice } = ev;
      // paymentId > 0
      expect(paymentId, `paymentId[${i}] > 0 olmalı`).to.equal(currentPaymentCounter + BigInt(i + 1));
      // courseId eşleşmeli
      expect(courseId, `courseId mismatch at [${i}]`).to.equal(BigInt(courseIds[i]));
      // receiver eşleşmeli
      expect(contentReceiver.toLowerCase(), `courseReceiver mismatch at [${i}]`).to.equal(
        courseReceivers[i].toLowerCase()
      );
      // payer eşleşmeli
      expect(payer.toLowerCase(), `payer mismatch at [${i}]`).to.equal(buyBatchTxCaller.address.toLowerCase());
      // token address eşleşmeli
      expect(tokenAddress.toLowerCase(), `tokenAddress mismatch at [${i}]`).to.equal(tokenAddresses[i].toLowerCase());
      // receivedCoursePrice eşleşmeli
      expect(receivedCoursePrice, `receivedCoursePrice mismatch at [${i}]`).to.equal(coursePrices[i]);
    }
    // c) gaz maliyetini hesapla
    const effectiveGasPrice = receipt.effectiveGasPrice ?? receipt.gasPrice ?? 0n;
    gasCost = receipt.gasUsed * effectiveGasPrice;
  }

  // Expected outcomes should be satisfied
  await _expectBuyBatch(nativeMsgValue, expectedOutcome, gasCost, buyBatchTxCaller.address, waitSuccess);

  if (waitSuccess) {
    const paymentIds = Array.from({ length: n }, (_, i) => currentPaymentCounter + BigInt(i + 1));
    return paymentIds;
  } else {
    return []; // revert durumunda paymentId oluşmaz
  }
}

async function _prepareExpectedBuyBatchStates(vouchers, buyBatchTxCaller, waitSuccess, executor = null) {
  // 0) Normalize + indeksleme tek geçiş
  const normVouchers = [];
  const courseSet = new Set();
  const recvSet = new Set();
  const pairSet = new Set();
  const tokenSet = new Set([ethers.ZeroAddress.toLowerCase()]);
  const tokenTotals = new Map(); // token(lower) -> BigInt
  //const occByCourse = new Map(); // courseId(BigInt) -> count

  for (const v of vouchers) {
    const nv = {
      courseId: BigInt(v.courseId),
      tokenAddress: v.tokenAddress ?? ethers.ZeroAddress,
      coursePrice: BigInt(v.coursePrice),
      courseReceiver: v.courseReceiver.toLowerCase(),
    };
    normVouchers.push(nv);

    courseSet.add(nv.courseId);
    recvSet.add(nv.courseReceiver);
    pairSet.add(`${nv.courseReceiver}::${nv.courseId}`);

    const tKey = nv.tokenAddress.toLowerCase();
    tokenSet.add(tKey);
    tokenTotals.set(tKey, (tokenTotals.get(tKey) ?? 0n) + (waitSuccess ? nv.coursePrice : 0n));

    //occByCourse.set(nv.courseId, (occByCourse.get(nv.courseId) ?? 0) + 1);
  }

  const uniqueCourseIds = [...courseSet];
  const uniqueReceivers = [...recvSet];
  const uniquePairs = [...pairSet];

  // 1) Before-state toplu
  const [paymentCounter, udaoTokenAddress, refundWindow, utFoundCut, utGoverCut, atFoundCut, atGoverCut] =
    await Promise.all([
      NewTreasury.paymentCounter(),
      NewTreasury.udaoTokenAddress(),
      NewTreasury.refundWindow(),
      NewTreasury.utFoundCut(),
      NewTreasury.utGoverCut(),
      NewTreasury.atFoundCut(),
      NewTreasury.atGoverCut(),
    ]);

  const beforeSaleCounterByCourse = new Map(
    await Promise.all(uniqueCourseIds.map(async (cid) => [cid, await NewTreasury.saleCounterPerCourse(cid)]))
  );

  const beforeOwnedCoursesByReceiver = new Map(
    await Promise.all(uniqueReceivers.map(async (r) => [r, [...(await NewTreasury.getOwnedCourses(r))]]))
  );

  const pairBefore = new Map(
    await Promise.all(
      uniquePairs.map(async (key) => {
        const [recv, cidStr] = key.split("::");
        const cid = BigInt(cidStr);
        const [has, pid, idx] = await Promise.all([
          NewTreasury.hasOwnedCourse(recv, cid),
          NewTreasury.courseOwnerToPayment(recv, cid),
          NewTreasury.ownedCourseIndex(recv, cid),
        ]);
        return [key, { hasOwned: Boolean(has), existingPid: pid, existingIdx: idx }];
      })
    )
  );

  // 2) Ortak yardımcılar
  const payer = buyBatchTxCaller;
  const endOfRefundWindow = BigInt(now) + refundWindow;
  const udaoLower = udaoTokenAddress.toLowerCase();

  // 3) Çıktılar + sayaçlar
  const expectedPaymentCounter = waitSuccess ? paymentCounter + BigInt(normVouchers.length) : paymentCounter;
  const expectedHasOwnedPairs = [];
  const expectedCourseSaleRecords = [];
  const expectedCourseOwnerToPayment = [];
  const expectedPaymentsById = [];
  const expectedOwnedCourseIndexPairs = [];
  const expectedOwnedCoursesByReceiver = new Map(
    uniqueReceivers.map((r) => [r, [...(beforeOwnedCoursesByReceiver.get(r) ?? [])]])
  );

  const nextSaleIndexByCourse = new Map(uniqueCourseIds.map((cid) => [cid, beforeSaleCounterByCourse.get(cid) ?? 0n]));
  let nextPaymentId = paymentCounter + 1n;

  // 4) Tek geçiş: tüm beklentiler
  for (const v of normVouchers) {
    const key = `${v.courseReceiver}::${v.courseId}`;
    const beforePair = pairBefore.get(key) ?? { hasOwned: false, existingPid: 0n, existingIdx: 0n };

    // hasOwned
    expectedHasOwnedPairs.push({
      courseId: v.courseId,
      courseReceiver: v.courseReceiver,
      expected: waitSuccess ? true : beforePair.hasOwned,
    });

    // courseSaleRecords
    const nextIdx = (nextSaleIndexByCourse.get(v.courseId) ?? 0n) + 1n;
    nextSaleIndexByCourse.set(v.courseId, nextIdx);
    expectedCourseSaleRecords.push({
      courseId: v.courseId,
      saleIndex: nextIdx,
      expectedPaymentId: waitSuccess ? nextPaymentId : 0n,
    });

    // courseOwnerToPayment
    const expectedPid = waitSuccess ? nextPaymentId : beforePair.hasOwned ? beforePair.existingPid : 0n;
    expectedCourseOwnerToPayment.push({
      courseReceiver: v.courseReceiver,
      courseId: v.courseId,
      expectedPaymentId: expectedPid,
    });

    // ownedCourses & ownedCourseIndex
    if (!waitSuccess) {
      expectedOwnedCourseIndexPairs.push({
        courseReceiver: v.courseReceiver,
        courseId: v.courseId,
        expectedIndex: beforePair.hasOwned ? beforePair.existingIdx : 0n,
      });
    } else {
      const arr = expectedOwnedCoursesByReceiver.get(v.courseReceiver) ?? [];
      if (arr.length === 0) arr.push(0n); // kontrat davranışı
      let idx = arr.indexOf(v.courseId);
      if (idx === -1) {
        idx = arr.length;
        arr.push(v.courseId);
        expectedOwnedCoursesByReceiver.set(v.courseReceiver, arr);
      }
      expectedOwnedCourseIndexPairs.push({
        courseReceiver: v.courseReceiver,
        courseId: v.courseId,
        expectedIndex: BigInt(idx),
      });
    }

    // payments
    if (!waitSuccess) {
      expectedPaymentsById.push({
        paymentId: nextPaymentId,
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
      });
    } else {
      const isUdao = v.tokenAddress !== ethers.ZeroAddress && v.tokenAddress.toLowerCase() === udaoLower;
      const foundCut = isUdao ? utFoundCut : atFoundCut;
      const goverCut = isUdao ? utGoverCut : atGoverCut;
      const foundationShare = (v.coursePrice * foundCut) / 100000n;
      const governanceShare = (v.coursePrice * goverCut) / 100000n;
      const instructorShare = v.coursePrice - foundationShare - governanceShare;

      expectedPaymentsById.push({
        paymentId: nextPaymentId,
        payment: {
          courseId: v.courseId,
          payer: payer,
          courseReceiver: v.courseReceiver,
          tokenAddress: v.tokenAddress,
          totalAmount: v.coursePrice,
          instructorShare,
          foundationShare,
          governanceShare,
          endOfRefundWindow,
          isRefunded: false,
          isWithdrawn: false,
        },
      });
    }

    if (waitSuccess) nextPaymentId += 1n;
  }

  // 5) saleCounter finalize
  const expectedSaleCounterByCourse = new Map();
  for (const cid of uniqueCourseIds) {
    expectedSaleCounterByCourse.set(
      cid,
      waitSuccess ? nextSaleIndexByCourse.get(cid) ?? 0n : beforeSaleCounterByCourse.get(cid) ?? 0n
    );
  }

  // 6) beforeTxBalances (+ expectedTokenTransferAmount) — tek yerde
  const treasury = NewTreasury.target;

  const erc20Cache = new Map();
  const getErc20 = async (addr) => {
    if (!erc20Cache.has(addr)) erc20Cache.set(addr, await ethers.getContractAt("IERC20", addr));
    return erc20Cache.get(addr);
  };
  const getTokenBalance = async (tokenLower, addr) => {
    if (!addr) return null;
    if (tokenLower === ethers.ZeroAddress.toLowerCase()) return ethers.provider.getBalance(addr);
    const c = await getErc20(tokenLower);
    return c.balanceOf(addr);
  };

  const beforeTxBalances = [];
  for (const tokenLower of tokenSet) {
    // tokenSet zaten lower-case & 0x0 içerir
    const [callerBal, contractBal, executorBal] = await Promise.all([
      getTokenBalance(tokenLower, payer),
      getTokenBalance(tokenLower, treasury),
      getTokenBalance(tokenLower, executor),
    ]);

    const rec = {
      tokenAddress: tokenLower === ethers.ZeroAddress.toLowerCase() ? ethers.ZeroAddress : tokenLower,
      callerBalance: callerBal,
      contractBalance: contractBal,
      expectedTokenTransferAmount: tokenTotals.get(tokenLower) ?? 0n,
    };
    if (executorBal !== null) rec.executorBalance = executorBal; // sadece executor verilmişse eklenir

    beforeTxBalances.push(rec);
  }

  return {
    expectedPaymentCounter,
    expectedHasOwnedPairs,
    expectedSaleCounterByCourse,
    expectedCourseSaleRecords,
    expectedCourseOwnerToPayment,
    expectedOwnedCoursesByReceiver,
    expectedOwnedCourseIndexPairs,
    expectedPaymentsById,
    beforeTxBalances, // (expectedTokenTransferAmount içerir)
  };
}

async function _expectBuyBatch(
  nativeMsgValue,
  expectedOutcome, // _prepareExpectedBuyBatchStates(...) çıktısı
  gasCost, // only in success path (revert'te 0n geçirilebilir ya da çağrılmaz)
  buyBatchTxCaller,
  waitSuccess,
  executor = null
) {
  // 1) paymentCounter
  const actualPaymentCounter = await NewTreasury.paymentCounter();
  expect(actualPaymentCounter).to.equal(expectedOutcome.expectedPaymentCounter);

  // 2) payments[paymentId]
  for (const { paymentId, payment } of expectedOutcome.expectedPaymentsById) {
    const p = await NewTreasury.payments(paymentId);

    expect(p.courseId).to.equal(payment.courseId);
    expect(p.payer).to.equal(payment.payer);
    expect(p.courseReceiver.toLowerCase()).to.equal(payment.courseReceiver.toLowerCase());
    expect(p.tokenAddress.toLowerCase()).to.equal(payment.tokenAddress.toLowerCase());
    expect(p.totalAmount).to.equal(payment.totalAmount);
    expect(p.instructorShare).to.equal(payment.instructorShare);
    expect(p.foundationShare).to.equal(payment.foundationShare);
    expect(p.governanceShare).to.equal(payment.governanceShare);
    expect(p.isRefunded).to.equal(payment.isRefunded);
    expect(p.isWithdrawn).to.equal(payment.isWithdrawn);

    // endOfRefundWindow toleransı (±120 sn)
    const diff = BigInt(p.endOfRefundWindow) - BigInt(payment.endOfRefundWindow);
    const adiff = diff < 0n ? -diff : diff;
    expect(adiff <= 120n).to.equal(true);
  }

  // 3) saleCounterPerCourse
  for (const [cid, exp] of expectedOutcome.expectedSaleCounterByCourse.entries()) {
    const actual = await NewTreasury.saleCounterPerCourse(cid);
    expect(actual).to.equal(exp);
  }

  // 4) courseSaleRecords(cid, saleIndex) -> paymentId
  for (const rec of expectedOutcome.expectedCourseSaleRecords) {
    const got = await NewTreasury.courseSaleRecords(rec.courseId, rec.saleIndex);
    expect(got).to.equal(rec.expectedPaymentId);
  }

  // 5) courseOwnerToPayment(receiver, courseId)
  for (const it of expectedOutcome.expectedCourseOwnerToPayment) {
    const got = await NewTreasury.courseOwnerToPayment(it.courseReceiver, it.courseId);
    expect(got).to.equal(it.expectedPaymentId);
  }

  // 6) ownedCourses[receiver]
  for (const [recv, expArr] of expectedOutcome.expectedOwnedCoursesByReceiver.entries()) {
    const actualArr = await NewTreasury.getOwnedCourses(recv);
    // BigInt[] karşılaştırma (sayısal olarak)
    expect(actualArr.map(Number)).to.deep.equal(expArr.map(Number));
  }

  // 7) ownedCourseIndex[receiver][courseId]
  for (const it of expectedOutcome.expectedOwnedCourseIndexPairs) {
    const idx = await NewTreasury.ownedCourseIndex(it.courseReceiver, it.courseId);
    expect(idx).to.equal(it.expectedIndex);
  }

  // 8) hasOwnedCourse(receiver, courseId)
  for (const it of expectedOutcome.expectedHasOwnedPairs) {
    const has = await NewTreasury.hasOwnedCourse(it.courseReceiver, it.courseId);
    expect(Boolean(has)).to.equal(Boolean(it.expected));
  }

  // 9) Bakiye kontrolleri (yalnızca success yolunda anlamlı; revert'te zaten tx yok)

  const payer = buyBatchTxCaller;
  const treasury = NewTreasury.target;

  for (const b of expectedOutcome.beforeTxBalances) {
    const token = b.tokenAddress.toLowerCase();

    if (token === ethers.ZeroAddress.toLowerCase()) {
      // --- NATIVE ---
      // Öncesi: b.callerBalance (payer), b.contractBalance (treasury), b.executorBalance? (executor)
      const [afterPayer, afterTreasury, afterExec] = await Promise.all([
        ethers.provider.getBalance(payer),
        ethers.provider.getBalance(treasury),
        b.executorBalance != null && executor ? ethers.provider.getBalance(executor) : Promise.resolve(null),
      ]);

      const transfer = b.expectedTokenTransferAmount ?? 0n;

      if (waitSuccess) {
        // Treasury her zaman transfer kadar artmalı
        expect(afterTreasury - b.contractBalance).to.equal(transfer);
        // ayrıca nativeMsgValue transfer amount'a eşit olmalı
        expect(nativeMsgValue).to.equal(transfer);

        if (afterExec !== null) {
          // Gazı executor öder, transferi de executor yapar
          const execDelta = b.executorBalance - afterExec; // ↓

          expect(b.callerBalance).to.equal(afterPayer);
          expect(execDelta).to.equal(transfer + (gasCost ?? 0n));
        } else {
          // Executor yok: hem transfer hem gas payer’dan düşer
          const callerDelta = b.callerBalance - afterPayer; // ↓
          expect(callerDelta).to.equal(transfer + (gasCost ?? 0n));
        }
      } else {
        // REVERT: transfer yok
        expect(afterTreasury).to.equal(b.contractBalance);

        if (afterExec !== null) {
          // Gazı executor öder; payer değişmemeli
          expect(afterPayer).to.equal(b.callerBalance);
          const execDelta = b.executorBalance - afterExec; // ↓
          expect(execDelta > 0n).to.equal(true); // tam miktar node'a göre değişebilir
        } else {
          // Executor yok: gazı payer öder
          expect(afterPayer < b.callerBalance).to.equal(true);
        }
      }
    } else {
      // --- ERC20 ---
      const erc20 = await ethers.getContractAt("IERC20", token);
      const [afterPayer, afterTreasury, afterExec] = await Promise.all([
        erc20.balanceOf(payer),
        erc20.balanceOf(treasury),
        b.executorBalance != null && executor ? erc20.balanceOf(executor) : Promise.resolve(null),
      ]);

      const transfer = b.expectedTokenTransferAmount ?? 0n;

      if (waitSuccess) {
        // ERC20'de gas native'ten olur; burada sadece transfer kontrolü
        const payerDelta = b.callerBalance - afterPayer; // ↓
        const treasuryDelta = afterTreasury - b.contractBalance; // ↑
        expect(payerDelta).to.equal(transfer);
        expect(treasuryDelta).to.equal(transfer);

        // executor varsa ERC20 bakiyesi değişmemeli
        if (afterExec !== null) expect(afterExec).to.equal(b.executorBalance);
      } else {
        // REVERT: ERC20 değişmez (hem payer hem treasury hem varsa executor)
        expect(afterPayer).to.equal(b.callerBalance);
        expect(afterTreasury).to.equal(b.contractBalance);
        if (afterExec !== null) expect(afterExec).to.equal(b.executorBalance);
      }
    }
  }
}

async function refundCourseHelper({ paymentId, redeemer, validUntil, expectRevertWith, expectSuccessWith }) {
  // Prepare input, desired refund payment, current contract state,
  const payment = await NewTreasury.payments(paymentId);
  // 1) Ensure exactly one is expectation provided; expectSuccess=true, expectRevertWith=false.
  const waitSuccess = decideSuccess(expectSuccessWith, expectRevertWith);
  // push paymentId to common helper to get expected values
  const expectedOutcome = await _prepareExpectedRefundStates(paymentId, waitSuccess);
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
    redeemer: falseRedeemer == null ? redeemer.address : falseRedeemer,
    validUntil,
  });

  let tx = null;
  let gasCost = 0n;
  let gasUsed = null;

  if (!waitSuccess) {
    if (expectRevertWith === "Recipient blocked") {
      // its a bad design, ı write it to pass only one test
      await expect(NewTreasury.connect(redeemer).refundCourse(refundVoucher)).to.be.revertedWith(expectRevertWith);
    } else {
      await expect(NewTreasury.connect(redeemer).refundCourse(refundVoucher)).to.be.revertedWithCustomError(
        NewTreasury,
        expectRevertWith
      );
    }
  } else if (waitSuccess) {
    tx = await NewTreasury.connect(redeemer).refundCourse(refundVoucher);
    await expect(tx)
      .to.emit(NewTreasury, expectSuccessWith)
      .withArgs(
        paymentId,
        payment.courseId,
        payment.courseReceiver,
        payment.payer,
        payment.tokenAddress,
        payment.totalAmount
      );

    const receipt = await tx.wait();
    gasUsed = receipt.gasUsed;
    //console.log("RefundPId Gas used: ", gasUsed);
    const effectiveGasPrice = receipt.effectiveGasPrice ?? receipt.gasPrice ?? 0n;
    gasCost = receipt.gasUsed * effectiveGasPrice;
  } else if (waitSuccess) {
    throw new Error("No expectRevertWith or expectSuccessWith provided --refundCourseHelper--");
  }

  await _expectRefund(paymentId, expectedOutcome);

  // check balances after transaction
  await checkBalancesAfterRefund({
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
    tx: tx,
    gasUsed: gasUsed,
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
  const payment = await NewTreasury.payments(paymentId);
  // 1) Ensure exactly one is expectation provided; expectSuccess=true, expectRevertWith=false.
  const waitSuccess = decideSuccess(expectSuccessWith, expectRevertWith);
  // push paymentId to common helper to get expected values
  const expectedOutcome = await _prepareExpectedRefundStates(paymentId, waitSuccess);
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
    redeemer: falseRedeemer == null ? redeemer.address : falseRedeemer,
    validUntil,
  });
  //const tx = await NewTreasury.connect(redeemer).refundCourseByOwnerAndCourseId(refundVoucher);
  let tx;
  let gasCost = 0n;
  let gasUsed = null;

  if (!waitSuccess) {
    if (expectRevertWith === "Recipient blocked") {
      // its a bad design, ı write it to pass only one test
      await expect(NewTreasury.connect(redeemer).refundCourseByOwnerAndCourseId(refundVoucher)).to.be.revertedWith(
        expectRevertWith
      );
    } else {
      await expect(
        NewTreasury.connect(redeemer).refundCourseByOwnerAndCourseId(refundVoucher)
      ).to.be.revertedWithCustomError(NewTreasury, expectRevertWith);
    }
  } else if (waitSuccess) {
    tx = await NewTreasury.connect(redeemer).refundCourseByOwnerAndCourseId(refundVoucher);
    await expect(tx)
      .to.emit(NewTreasury, expectSuccessWith)
      .withArgs(
        paymentId,
        payment.courseId,
        payment.courseReceiver,
        payment.payer,
        payment.tokenAddress,
        payment.totalAmount
      );

    const receipt = await tx.wait();
    gasUsed = receipt.gasUsed;
    //console.log("RefundBy Gas used: ", gasUsed);
    const effectiveGasPrice = receipt.effectiveGasPrice ?? receipt.gasPrice ?? 0n;
    gasCost = receipt.gasUsed * effectiveGasPrice;
  } else {
    throw new Error("No expectRevertWith or expectSuccessWith provided --refundCourseByOwnerHelper--");
  }

  await _expectRefund(paymentId, expectedOutcome);
  // check balances after transaction
  await checkBalancesAfterRefund({
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
    tx: tx,
    gasUsed: gasUsed,
  };
}

async function _prepareExpectedRefundStates(paymentId, waitSuccess) {
  const payment = await NewTreasury.payments(paymentId);
  const current = {
    paymentCounter: await NewTreasury.paymentCounter(),
    courseOwnerToPayment: await NewTreasury.courseOwnerToPayment(payment.courseReceiver, payment.courseId),
    ownedCourses: await NewTreasury.getOwnedCourses(payment.courseReceiver),
    ownedCourseIndex: await NewTreasury.ownedCourseIndex(payment.courseReceiver, payment.courseId),
    hasOwnedCourse: await NewTreasury.hasOwnedCourse(payment.courseReceiver, payment.courseId),
  };

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

async function _expectRefund(paymentId, expected) {
  const { payment, courseOwnerToPayment, ownedCoursesArrayOfReceiver, ownedCourseIndex, hasOwnedCourse } = expected;
  // 1) compare payment struct states
  const actualPayment = await NewTreasury.payments(paymentId);
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

async function getBalances({ payer, courseReceiver, contract, tokenAddress, refundCaller }) {
  const isNative = tokenAddress === ethers.ZeroAddress;

  let payerToken = 0n;
  let receiverToken = 0n;
  let contractToken = 0n;
  let refundCallerToken = 0n;

  if (!isNative) {
    const ERC20 = await ethers.getContractAt("IERC20", tokenAddress);
    payerToken = await ERC20.balanceOf(payer);
    receiverToken = await ERC20.balanceOf(courseReceiver);
    contractToken = await ERC20.balanceOf(contract);
    refundCallerToken = await ERC20.balanceOf(refundCaller);
  }

  const payerNative = await ethers.provider.getBalance(payer);
  const receiverNative = await ethers.provider.getBalance(courseReceiver);
  const contractNative = await ethers.provider.getBalance(contract);
  const refundCallerNative = await ethers.provider.getBalance(refundCaller);

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

async function checkBalancesAfterRefund({ gasCost, beforeTxBalances, coursePrice, tokenAddress }) {
  const beforeTx = beforeTxBalances;
  const afterTx = await getBalances({
    payer: beforeTxBalances.payer.address,
    courseReceiver: beforeTxBalances.courseReceiver.address,
    contract: beforeTxBalances.contract.address,
    tokenAddress,
    refundCaller: beforeTxBalances.refundCaller.address,
  });

  const isNative = tokenAddress === ethers.ZeroAddress;
  const txSucceeded = gasCost > 0n;

  if (txSucceeded) {
    if (beforeTx.payer.address === beforeTx.refundCaller.address) {
      if (isNative) {
        // payer native ↑ (by coursePrice - by gasCost)
        const nativeDelta = afterTx.payer.nativeBalance - beforeTx.payer.nativeBalance;
        expect(nativeDelta).to.equal(coursePrice - gasCost);
        // contract native ↓ by coursePrice
        const contractNativeDelta = beforeTx.contract.nativeBalance - afterTx.contract.nativeBalance;
        expect(contractNativeDelta).to.equal(coursePrice);
      } else {
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
      if (isNative) {
        // refund caller native ↓ (by gasCost)
        const nativeDeltaRC = beforeTx.refundCaller.nativeBalance - afterTx.refundCaller.nativeBalance;
        expect(nativeDeltaRC).to.equal(gasCost);
        // payer native ↑ (by coursePrice)
        const nativeDelta = afterTx.payer.nativeBalance - beforeTx.payer.nativeBalance;
        expect(nativeDelta).to.equal(coursePrice);
        // contract native ↓ by coursePrice
        const contractNativeDelta = beforeTx.contract.nativeBalance - afterTx.contract.nativeBalance;
        expect(contractNativeDelta).to.equal(coursePrice);
      } else {
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

  if (!txSucceeded) {
    const isRefundCallerSameAsPayer = beforeTx.payer.address === beforeTx.refundCaller.address;
    if (isRefundCallerSameAsPayer) {
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
    } else {
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
      // receiver token is unchanged in all cases during erc20
      expect(afterTx.courseReceiver.tokenBalance).to.equal(beforeTx.courseReceiver.tokenBalance);
    }
  }
  // other operations can be added here
}
/////### END OF TEST HELPERS ###/////

const PaymentState = {
  WE: "WE", // Already Withdrawn, refund window Ended,
  RI: "RI", // Already Refunded, In refund window,
  RE: "RE", // Already Refunded, refund window Ended,
  PI: "PI", // Pending, In refund window,
  PEF: "PEF", // Pending, refund window Ended, expect Fail
  PES: "PES", // Pending, refund window Ended, expect Success
};

const { PES, PEF, PI, WE, RI, RE } = PaymentState;

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
  // check is there a invalid range
  const isInputError =
    fromIndex <= 0n || fromIndex > toIndex ? true : toIndex > (await NewTreasury.saleCounterPerCourse(courseId));
  // 1) Ensure exactly one is expectation provided; expectSuccess=true, expectRevertWith=false.
  const waitSuccess = decideSuccess(expectSuccessWith, expectRevertWith);

  const voucher = await withdrawVH.signVoucher({
    courseId,
    fromIndex,
    toIndex,
    redeemer: falseRedeemer == null ? redeemer.address : falseRedeemer,
    validUntil,
  });

  let tokenStats = null;
  if (!isInputError) {
    tokenStats = await _prepareExpectedWithdrawTokenState(voucher, expectations, redeemer.address);
  }

  let tx = null;
  let gasCost = 0n;
  if (!waitSuccess) {
    if (expectRevertWith === "??????") {
      // its a bad design, ı write it to pass only one test
      await expect(NewTreasury.connect(redeemer).withdrawCoursePayments(voucher)).to.be.revertedWith(expectRevertWith);
    } else {
      await expect(NewTreasury.connect(redeemer).withdrawCoursePayments(voucher)).to.be.revertedWithCustomError(
        NewTreasury,
        expectRevertWith
      );
    }
  } else if (waitSuccess) {
    const expectedWithdrawCount = expectations.filter((e) => e === PES).length;
    const expectedFailedCount = expectations.filter((e) => e === PEF).length;

    tx = await NewTreasury.connect(redeemer).withdrawCoursePayments(voucher);
    await expect(tx)
      .to.emit(NewTreasury, expectSuccessWith)
      .withArgs(courseId, fromIndex, toIndex, redeemer.address, expectedWithdrawCount, expectedFailedCount);

    const receipt = await tx.wait();
    //console.log("Withdraw GasUsed:", receipt.gasUsed);
    const effectiveGasPrice = receipt.effectiveGasPrice ?? receipt.gasPrice ?? 0n;
    gasCost = receipt.gasUsed * effectiveGasPrice;
  }

  if (!isInputError) {
    await _expectWithdraw(voucher, tokenStats, gasCost, expectations, waitSuccess, redeemer.address);
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

async function _prepareExpectedWithdrawTokenState(voucher, expectations, withdrawCaller = null) {
  const { courseId, fromIndex, toIndex, redeemer } = voucher;

  const expectedLength = toIndex - fromIndex + 1;
  if (expectations.length !== expectedLength) {
    throw new Error(
      `expectations.length (${expectations.length}) must equal toIndex - fromIndex + 1 (${expectedLength})`
    );
  }

  const isValidCourseId = courseId > 0 && courseId <= (await NewTreasury.courseCounter());

  const tokenStats = new Map(); // tokenAddress -> { price, instructor, foundation, governance }
  const treasury = NewTreasury.target;
  const foundation = await NewTreasury.foundationAddress();
  const governance = await NewTreasury.governanceAddress();
  const instructor = withdrawCaller ?? redeemer;

  // validate my allegations
  for (let i = fromIndex; i <= toIndex; i++) {
    const expected = expectations[i - fromIndex]; // match index

    const paymentId = await NewTreasury.courseSaleRecords(courseId, i);

    const rawPayment = await NewTreasury.payments(paymentId);
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
      actualState = PaymentState.WE;
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
  // add redemer initial native balance to tokenStats in all cases as a separate entry
  if (!tokenStats.has(ethers.ZeroAddress)) {
    // If there is no native token entry, add it
    tokenStats.set(ethers.ZeroAddress, {
      totalPrice: 0n,
      totalInstructor: 0n,
      totalFoundation: 0n,
      totalGovernance: 0n,
      initialBalances: {
        instructor: await ethers.provider.getBalance(instructor),
        foundation: await ethers.provider.getBalance(foundation),
        governance: await ethers.provider.getBalance(governance),
        treasury: await ethers.provider.getBalance(treasury),
      },
    });
  }

  if (isValidCourseId) {
    // On-chain withdraw status ile expectations karşılaştır
    const [refundedOnChain, withdrawnOnChain, inWindowOnChain, readyOnChain] = await NewTreasury.previewWithdrawStatus(
      courseId,
      fromIndex,
      toIndex
    );

    const refunded = [];
    const withdrawn = [];
    const inWindow = [];
    const ready = [];
    for (let i = fromIndex; i <= toIndex; i++) {
      const expected = expectations[i - fromIndex];

      if ([PaymentState.RI, PaymentState.RE].includes(expected)) refunded.push(i);
      else if ([PaymentState.WE].includes(expected)) withdrawn.push(i);
      else if (expected === PaymentState.PI) inWindow.push(i);
      else if ([PaymentState.PEF, PaymentState.PES].includes(expected)) ready.push(i);
    }

    expect(refundedOnChain.map((n) => Number(n))).to.have.members(refunded);
    expect(withdrawnOnChain.map((n) => Number(n))).to.have.members(withdrawn);
    expect(inWindowOnChain.map((n) => Number(n))).to.have.members(inWindow);
    expect(readyOnChain.map((n) => Number(n))).to.have.members(ready);
  }

  return tokenStats;
}

async function _expectWithdraw(voucher, tokenStats, gasCost, expectations, waitSuccess, withdrawCaller = null) {
  const { courseId, fromIndex, toIndex, redeemer } = voucher;

  const isValidCourseId = courseId > 0 && courseId <= (await NewTreasury.courseCounter());

  const treasury = NewTreasury.target;
  const instructor = withdrawCaller ?? redeemer;
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
    const redeemerInitialNativeBalance = tokenStats.get(ethers.ZeroAddress).initialBalances.instructor;
    const postNativeBalance = await ethers.provider.getBalance(instructor);
    if (waitSuccess) {
      expect(postNativeBalance).to.equal(
        redeemerInitialNativeBalance - gasCost,
        "Native balance should drop by gasCost even if token used was ERC20"
      );
    } else {
      expect(postNativeBalance).to.be.below(
        redeemerInitialNativeBalance,
        "Instructor native balance should decrease slightly due to revert gas cost"
      );
    }
  }

  // check contract state changes.
  for (let i = fromIndex; i <= toIndex; i++) {
    const expected = expectations[i - fromIndex];
    const paymentId = await NewTreasury.courseSaleRecords(courseId, i);
    const raw = await NewTreasury.payments(paymentId);

    const payment = {
      endOfRefundWindow: raw[8],
      isRefunded: raw[9],
      isWithdrawn: raw[10],
    };

    const isInRWindow = payment.endOfRefundWindow > BigInt(now);

    const expectedWithdrawn = {
      [WE]: true,
      [RI]: false,
      [RE]: false,
      [PI]: false,
      [PEF]: false,
      [PES]: waitSuccess, // true if waitSuccess==true, false if waitSuccess==false
    }[expected];

    const expectedRefunded = [RI, RE].includes(expected);
    const expectedInRWindow = [RI, PI].includes(expected);

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
    // Final check with previewWithdrawStatus
    const [refundedOnChain, withdrawnOnChain, inWindowOnChain, readyOnChain] = await NewTreasury.previewWithdrawStatus(
      courseId,
      fromIndex,
      toIndex
    );

    const refunded = [];
    const withdrawn = [];
    const inWindow = [];
    const ready = [];

    for (let i = fromIndex; i <= toIndex; i++) {
      const expected = expectations[i - fromIndex];

      if ([RI, RE].includes(expected)) refunded.push(i);
      else if ([WE].includes(expected) || (expected === PES && waitSuccess)) withdrawn.push(i);
      else if (expected === PI) inWindow.push(i);
      else if ([PEF, PES].includes(expected) && !(expected === PES && waitSuccess)) ready.push(i);
    }

    expect(refundedOnChain.map((n) => Number(n))).to.have.members(refunded);
    expect(withdrawnOnChain.map((n) => Number(n))).to.have.members(withdrawn);
    expect(inWindowOnChain.map((n) => Number(n))).to.have.members(inWindow);
    expect(readyOnChain.map((n) => Number(n))).to.have.members(ready);
  }
}

async function deployFailTransferContracts() {
  // Dep 1: Deploy native failing receiver contract
  const FailNativeReceiverFactory = await ethers.getContractFactory(
    "contracts/newTreasury/FailNativeReceiver.sol:FailNativeReceiver"
  );
  const failNativeWallet = await FailNativeReceiverFactory.connect(backend).deploy();
  await failNativeWallet.waitForDeployment();
  // Dep 2: Deploy FailTransfer MockERC20 token contract
  const FailMKTFactory = await ethers.getContractFactory("contracts/newTreasury/FailMockERC20.sol:FailMockERC20");
  const failMKT = await FailMKTFactory.connect(backend).deploy("FailMockToken", "FailMKT", ethers.parseEther("100000"));
  await failMKT.waitForDeployment();
  // Dep 3: Distribute failMKT tokens to users
  await batchDistributeTokens({
    token: failMKT,
    amount: "1000",
    spenderAddress: NewTreasury.target,
    walletList: walletNames,
  });
  // get current cuts
  const [utFoundCut, utGoverCut, atFoundCut, atGoverCut] = await Promise.all([
    NewTreasury.utFoundCut(),
    NewTreasury.utGoverCut(),
    NewTreasury.atFoundCut(),
    NewTreasury.atGoverCut(),
  ]);
  //if any one is zero
  if ([utFoundCut, utGoverCut, atFoundCut, atGoverCut].some((cut) => cut === 0n)) {
    const oldAtFoundCut = 6000; // %6 foundation cut (any token)
    const oldAtGoverCut = 1000; // %1 governance cut (any token)
    const oldUtFoundCut = 4000; // %4 foundation cut (udao)
    const oldUtGoverCut = 500;
    // Handle zero cut case
    await expect(
      NewTreasury.connect(backend).setCourseCuts(oldAtFoundCut, oldAtGoverCut, oldUtFoundCut, oldUtGoverCut)
    ).to.emit(NewTreasury, "CourseCutsUpdated");
  }

  return { failNativeWallet, failMKT };
}

describe("NewTreasury Contract Tests", function () {
  // ethers v6 uses `.target` instead of `.address` for deployed contracts
  beforeEach(async function () {
    // Revert to snapshot and take a new one for next test
    await network.provider.send("evm_revert", [snapshotId]);
    snapshotId = await network.provider.send("evm_snapshot");
    // Repeted setup for every test
    falseRedeemer = null;
    ({ createVH, updateVH, buyVH, refundVH, refundByOwnerVH, withdrawVH } = getVoucherHelpers());
    await updatenow();
  });

  // 1. Create Course
  describe("📘🆕 CREATE COURSE", function () {
    describe("✅ Success Cases", function () {
      it("should create a course with valid voucher", async function () {
        // Step 1: instructor1 creates a course via CreateCourseVoucher
        const course1 = await createCourseBatchHelper({
          uries: ["https://example.com/course/1", "https://example.com/course/2"],
          withdrawersArrays: [
            [instructor1.address, instructor2.address],
            [instructor1.address, instructor3.address],
          ],
          redeemers: [instructor1.address, instructor1.address],
          validUntils: [now + 86400, now + 86400],
          createBatchTxCaller: instructor1,
          expectSuccessWith: "CourseCreated",
        });
        // Expect: "CourseCreated" with expected success states
      });

      it("should allow course creation if redeemer is backend and not in withdrawers", async function () {
        // Step 1: backend creates a course for other withdrawers
        const course1 = await createCourseBatchHelper({
          uries: ["https://example.com/backend-not-in-withdrawers"],
          withdrawersArrays: [[instructor2.address, instructor3.address]],
          redeemers: [backend.address],
          validUntils: [now + 86400],
          createBatchTxCaller: backend,
          expectSuccessWith: "CourseCreated",
        });
        // Expect: "CourseCreated" with expected success states
      });

      it("should allow multiple course creations with unique URIs", async function () {
        // Step 1: Create course 1, 2, and 3 with unique URIs
        const courses = await createCourseBatchHelper({
          uries: ["https://example.com/multi/1", "https://example.com/multi/2", "https://example.com/multi/3"],
          withdrawersArrays: [
            [instructor1.address, instructor2.address],
            [instructor2.address, instructor1.address],
            [instructor2.address, instructor3.address, instructor1.address],
          ],
          redeemers: [instructor1.address, instructor1.address, instructor1.address],
          validUntils: [now + 86400, now + 86400, now + 86400],
          createBatchTxCaller: instructor1,
          expectSuccessWith: "CourseCreated",
        });
        // Expect: all 3 courses created successfully with unique URIs
      });

      it("should handle two 40 to 10 batches with backend and instructor1", async function () {
        const BATCH = 40;
        // 10 withdrawers per course
        const W = [
          instructor1.address,
          instructor2.address,
          instructor3.address,
          instructor4.address,
          instructor5.address,
          buyer1.address,
          buyer2.address,
          buyer3.address,
          buyer4.address,
          buyer5.address,
        ];
        await NewTreasury.connect(backend).setMaxAllowedWithdrawers(10);
        await NewTreasury.connect(backend).setMaxBatchCreateSize(BATCH);
        const makeUris = (pfx) => Array.from({ length: BATCH }, (_, i) => `https://example.com/${pfx}/${i + 1}`);
        const makeArray = (val) => Array.from({ length: BATCH }, () => val);
        const makeWithdrawersArrays = () => Array.from({ length: BATCH }, () => W.slice()); // clone per item
        // ---- Batch #1 called by backend ----
        await createCourseBatchHelper({
          uries: makeUris("batch1"),
          withdrawersArrays: makeWithdrawersArrays(),
          redeemers: makeArray(backend.address), // <-- .address (NOT signer)
          validUntils: makeArray(now + 86400),
          createBatchTxCaller: backend, // signer burada doğru
          expectSuccessWith: "CourseCreated",
        });
        // ---- Batch #2 called by instructor1 ----
        await createCourseBatchHelper({
          uries: makeUris("batch2"),
          withdrawersArrays: makeWithdrawersArrays(),
          redeemers: makeArray(instructor1.address), // <-- .address
          validUntils: makeArray(now + 86400),
          createBatchTxCaller: instructor1,
          expectSuccessWith: "CourseCreated",
        });
      });
      /////### End of CREATE Course Success Cases###/////
    });

    describe("❌ Failure Cases", function () {
      it("should fail to create a course with invalid signer", async function () {
        // Step 1: Override default createVH and get a new voucher with invalid signer
        createVH = getVoucherHelpers({ signer: instructor3 }).createVH;
        // Step 2: Try to create a course with invalid signer
        const course1 = await createCourseBatchHelper({
          uries: ["https://example.com/course/1", "https://example.com/course/2"],
          withdrawersArrays: [
            [instructor1.address, instructor2.address],
            [instructor1.address, instructor2.address],
          ],
          redeemers: [instructor1.address, instructor1.address],
          validUntils: [now + 86400, now + 86400],
          createBatchTxCaller: instructor1,
          expectRevertWith: "SignerIsNotBackend()",
        });
        // Expect: Reverts with "SignerIsNotBackend()"
      });

      it("should fail to create a course with invalid signature (SignatureIsInvalid)", async function () {
        // Step 1: Create a valid voucher
        const good = await createVH.signVoucher({
          uri: "https://example.com/course/invalid-sig",
          withdrawers: [instructor1.address],
          redeemer: instructor1.address, // msg.sender ile aynı
          validUntil: now + 86400,
        });
        // Step 2: Corrupt the voucher
        const bad = { ...good, uri: "https://example.com/course/invalid-sig-2" };
        bad.signature = "0x12"; // 65 byte değil -> tryRecover err != NoError
        // Expect: Reverts with "SignatureIsInvalid"
        await expect(NewTreasury.connect(instructor1).createCourseBatch([bad])).to.be.revertedWithCustomError(
          NewTreasury,
          "SignatureIsInvalid()"
        );
      });

      it("should fail to create a course with expired voucher", async function () {
        // Step 1: set up an expired timestamp for the voucher validUntil
        const expiredTimestamp = now - 60; // 1 dakika önce
        // Step 2: Try to create a course with an expired voucher
        const course1 = await createCourseBatchHelper({
          uries: ["https://example.com/expired-voucher"],
          withdrawersArrays: [[instructor1.address]],
          redeemers: [instructor1.address],
          validUntils: [expiredTimestamp],
          createBatchTxCaller: instructor1,
          expectRevertWith: "VoucherIsExpired()",
        });
        // Expect: Reverts with "VoucherIsExpired()"
      });

      it("should fail to create a course if msg.sender !== redeemer", async function () {
        // Step 1: Try to create course with mismatched msg.sender and voucher.redeemer
        const course1 = await createCourseBatchHelper({
          uries: ["https://example.com/fail-redeemer-check"],
          withdrawersArrays: [[instructor1.address]],
          redeemers: [person1.address], // gerçek redeemer backend
          validUntils: [now + 86400],
          createBatchTxCaller: backend, // tx'i atan kişi farklı: msg.sender !== voucher.redeemer
          expectRevertWith: "CallerIsNotVoucherRedeemer()",
        });
        // Expect: reverts with "CallerIsNotVoucherRedeemer()"
      });

      it("should fail to create a course with duplicate withdrawers", async function () {
        // Step 1: instructor1 creates a course with duplicate withdrawers
        const course1 = await createCourseBatchHelper({
          uries: ["https://example.com/duplicate-withdrawers"],
          withdrawersArrays: [[instructor1.address, instructor1.address, instructor1.address]],
          redeemers: [instructor1.address],
          validUntils: [now + 86400],
          createBatchTxCaller: instructor1,
          expectRevertWith: "WithdrawerArrayContainsDuplicates()",
        });
        // Expect: "CourseCreated" with expected success states
      });

      it("should fail to create a course with existing URI", async function () {
        // Step 1: instructor1 creates a course via CreateCourseVoucher
        const course1 = await createCourseBatchHelper({
          uries: ["https://example.com/course/duplicate"],
          withdrawersArrays: [[instructor1.address]],
          redeemers: [instructor1.address],
          validUntils: [now + 86400],
          createBatchTxCaller: instructor1,
          expectSuccessWith: "CourseCreated",
        });
        // Step 2: Try to create another course with the same URI and same voucher
        const course2 = await createCourseBatchHelper({
          uries: ["https://example.com/course/duplicate"],
          withdrawersArrays: [[instructor1.address]],
          redeemers: [instructor1.address],
          validUntils: [now + 86400],
          createBatchTxCaller: instructor1,
          expectRevertWith: "UriIsAlreadyUsedOrDuplicatedInBatch()",
        });
        // Expect: Reverts with "UriIsAlreadyUsedOrDuplicatedInBatch()", with failure states
      });

      it("should fail to create a course with duplicate URI", async function () {
        // Step 1: instructor1 creates a course via CreateCourseVoucher
        const course1 = await createCourseBatchHelper({
          uries: ["https://example.com/course/duplicate", "https://example.com/course/duplicate"],
          withdrawersArrays: [[instructor1.address], [instructor3.address]],
          redeemers: [backend.address, backend.address],
          validUntils: [now + 86400, now + 86400],
          createBatchTxCaller: backend,
          expectRevertWith: "UriIsAlreadyUsedOrDuplicatedInBatch()",
        });
        // Expect: Reverts with "UriIsAlreadyUsedOrDuplicatedInBatch()", with failure states
      });

      it("should fail to create a course with same URI but different withdrawers", async function () {
        // Step 1: instructor1 creates first course with URI
        await createCourseBatchHelper({
          uries: ["https://example.com/same-uri-different-withdrawers"],
          withdrawersArrays: [[instructor1.address]],
          redeemers: [instructor1.address],
          validUntils: [now + 86400],
          createBatchTxCaller: instructor1,
          expectSuccessWith: "CourseCreated",
        });
        // Step 2: Try to create another course with same URI but different withdrawers
        await createCourseBatchHelper({
          uries: ["https://example.com/same-uri-different-withdrawers"],
          withdrawersArrays: [[instructor2.address]],
          redeemers: [instructor2.address],
          validUntils: [now + 86400],
          createBatchTxCaller: instructor2,
          expectRevertWith: "UriIsAlreadyUsedOrDuplicatedInBatch()",
        });
        // Expect: Reverts with "UriIsAlreadyUsedOrDuplicatedInBatch()", with failure states
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
        const course1 = await createCourseBatchHelper({
          uries: ["https://example.com/exceed-withdrawers"],
          withdrawersArrays: [extraWithdrawers],
          redeemers: [instructor1.address],
          validUntils: [now + 86400],
          createBatchTxCaller: instructor1,
          expectRevertWith: "WithdrawerArrayExceedsLimit()",
        });
        // Expect: Reverts with "WithdrawerArrayExceedsLimit()"
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
        const course1 = await createCourseBatchHelper({
          uries: ["https://example.com/zero-address-withdrawer"],
          withdrawersArrays: [invalidWithdrawers],
          redeemers: [instructor1.address],
          validUntils: [now + 86400],
          createBatchTxCaller: instructor1,
          expectRevertWith: "WithdrawerAddressIsZero()",
        });
        // Expect: Reverts with "WithdrawerAddressIsZero()"
      });

      it("should fail to create a course with empty withdrawers array", async function () {
        // Step 1: Try to create course with empty withdrawers
        await createCourseBatchHelper({
          uries: ["https://example.com/empty-withdrawer"],
          withdrawersArrays: [[]],
          redeemers: [instructor1.address],
          validUntils: [now + 86400],
          createBatchTxCaller: instructor1,
          expectRevertWith: "WithdrawerArrayIsEmpty()",
        });
        // Expect: Reverts with "WithdrawerArrayIsEmpty()"
      });

      it("should fail to create courses when batch size exceeds maxBatchCreateSize", async function () {
        // Step 1: get maxBatchCreateSize
        const maxBatch = Number(await NewTreasury.maxBatchCreateSize());
        const numCourses = maxBatch + 1; // one more than max allowed
        // Step 2: prepare uries, withdrawersArrays, redeemers, validUntils
        const uries = Array.from({ length: numCourses }, (_, i) => `https://example.com/too-many/${i + 1}`);
        const withdrawersArrays = Array(numCourses).fill([instructor1.address]);
        const redeemers = Array(numCourses).fill(instructor1.address);
        const validUntils = Array(numCourses).fill(now + 86400);
        // Step 3: attempt to create more courses than allowed
        await createCourseBatchHelper({
          uries,
          withdrawersArrays,
          redeemers,
          validUntils,
          createBatchTxCaller: instructor1,
          expectRevertWith: "CreateBatchSizeExceedsLimit()", // kontrattaki revert mesajına göre ayarla
        });
        // Expect: Reverts with "CreateBatchSizeExceedsLimit()"
      });

      it("should fail to create a course if redeemer is not in withdrawers and not backend", async function () {
        // Step 1: Try to create a course where redeemer is not in withdrawers and not backend
        await createCourseBatchHelper({
          uries: ["https://example.com/redeemer-not-in-withdrawers"],
          withdrawersArrays: [[instructor2.address, instructor3.address]], // instructor1 yok
          redeemers: [instructor1.address],
          validUntils: [now + 86400],
          createBatchTxCaller: instructor1,
          expectRevertWith: "CallerIsNeitherWithdrawerNorBackend()",
        });
        // Expect: Reverts due to invalid role
      });

      it("should fail to create a course with empty URI", async function () {
        // Step 1: Try to create a course with empty URI
        await createCourseBatchHelper({
          uries: [""], // boş URI
          withdrawersArrays: [[instructor1.address]],
          redeemers: [instructor1.address],
          validUntils: [now + 86400],
          createBatchTxCaller: instructor1,
          expectRevertWith: "UriIsEmpty()",
        });
        // Expect: Reverts with "Course URI empty"
      });
      /////### End of CREATE Course Failure Cases###/////
    });
    /////### End of CREATE Course###/////
  });
  // 2. Update Course
  describe("📘✏️ UPDATE COURSE", function () {
    describe("✅ Success Cases", function () {
      it("should update an existing course with valid voucher", async function () {
        // Step 1: instructor1 creates a course via CreateCourseVoucher
        const course1 = await createCourseBatchHelper({
          uries: ["https://example.com/course/1"],
          withdrawersArrays: [[instructor1.address, instructor2.address, instructor4.address]],
          redeemers: [instructor1.address],
          validUntils: [now + 86400],
          createBatchTxCaller: instructor1,
          expectSuccessWith: "CourseCreated",
        });
        // Step 2: instructor1 updates course via UpdateCourseVoucher
        const update_course1 = await updateCourseHelper({
          courseId: course1.courseIds[0],
          uri: "https://example.com/course/1New",
          sellable: false,
          withdrawers: [instructor1.address, instructor3.address],
          redeemer: instructor1,
          validUntil: now + 86400,
          expectSuccessWith: "CourseUpdated",
        });
        // Expect: "CourseUpdated" with expected success states
      });

      it("should allow reusing a URI after course updates it to a new URI", async function () {
        // Step 1: instructor1 creates a course with URI_A
        const createA = await createCourseBatchHelper({
          uries: ["https://example.com/uri-a"],
          withdrawersArrays: [[instructor1.address]],
          redeemers: [instructor1.address],
          validUntils: [now + 86400],
          createBatchTxCaller: instructor1,
          expectSuccessWith: "CourseCreated",
        });
        // Step 2: instructor1 updates that course to URI_B
        const updateToB = await updateCourseHelper({
          courseId: createA.courseIds[0],
          uri: "https://example.com/uri-b",
          sellable: true,
          withdrawers: [instructor1.address],
          redeemer: instructor1,
          validUntil: now + 86400,
          expectSuccessWith: "CourseUpdated",
        });
        // Step 3: instructor1 creates a new course again using URI_A
        const createAgainA = await createCourseBatchHelper({
          uries: ["https://example.com/uri-a"],
          withdrawersArrays: [[instructor1.address]],
          redeemers: [instructor1.address],
          validUntils: [now + 86400],
          createBatchTxCaller: instructor1,
          expectSuccessWith: "CourseCreated",
        });
        // Expect: all 3 steps succeed, and URI_A is used again for the second course
      });

      it("should allow course update if redeemer is backend and not in withdrawers", async function () {
        // Step 1: instructor1 creates a valid course
        const course1 = await createCourseBatchHelper({
          uries: ["https://example.com/backend-update-course"],
          withdrawersArrays: [[instructor1.address]],
          redeemers: [instructor1.address],
          validUntils: [now + 86400],
          createBatchTxCaller: instructor1,
          expectSuccessWith: "CourseCreated",
        });
        // Step 2: backend updates the course (not in withdrawers)
        const update_course1 = await updateCourseHelper({
          courseId: course1.courseIds[0],
          uri: "https://example.com/backend-updated-uri",
          sellable: true,
          withdrawers: [instructor2.address, instructor3.address], // yeni withdrawer set
          redeemer: backend, // backend yetkili
          validUntil: now + 86400,
          expectSuccessWith: "CourseUpdated",
        });
        // Expect: update succeeds via backend signer
      });

      it("should allow course update if instructor is in new withdrawers list but not in previous", async function () {
        // Step 1: instructor1 creates a valid course
        const course1 = await createCourseBatchHelper({
          uries: ["https://example.com/backend-update-course"],
          withdrawersArrays: [[instructor1.address]],
          redeemers: [instructor1.address],
          validUntils: [now + 86400],
          createBatchTxCaller: instructor1,
          expectSuccessWith: "CourseCreated",
        });
        // Step 2: backend updates the course (not in withdrawers)
        const update_course1 = await updateCourseHelper({
          courseId: course1.courseIds[0],
          uri: "https://example.com/backend-updated-uri",
          sellable: true,
          withdrawers: [instructor2.address, instructor3.address], // yeni withdrawer set
          redeemer: instructor2, // backend yetkili
          validUntil: now + 86400,
          expectSuccessWith: "CourseUpdated",
        });
        // Expect: update succeeds via backend signer
      });

      it("should update course while keeping URI unchanged when empty URI is provided", async function () {
        // 1) önce geçerli bir kurs oluştur
        const course1 = await createCourseBatchHelper({
          uries: ["https://example.com/original-uri"],
          withdrawersArrays: [[instructor1.address]],
          redeemers: [instructor1.address],
          validUntils: [now + 86400],
          createBatchTxCaller: instructor1,
          expectSuccessWith: "CourseCreated",
        });
        // 2) boş URI ile update: URI no-op, yine de CourseUpdated bekliyoruz
        await updateCourseHelper({
          courseId: course1.courseIds[0],
          uri: "", // empty => no URI change
          sellable: true,
          withdrawers: [instructor1.address],
          redeemer: instructor1,
          validUntil: now + 86400,
          expectSuccessWith: "CourseUpdated",
        });
        // Expect: "CourseUpdated" with expected success states, URI remains unchanged
      });

      it("should allow isolated and combined updates of sellable, withdrawers, and URI", async function () {
        // Step 1: create course
        const course1 = await createCourseBatchHelper({
          uries: ["https://example.com/isolate/initial"],
          withdrawersArrays: [[instructor1.address]],
          redeemers: [instructor1.address],
          validUntils: [now + 86400],
          createBatchTxCaller: instructor1,
          expectSuccessWith: "CourseCreated",
        });
        // Step 2: update only sellable toggle
        const update1 = await updateCourseHelper({
          courseId: course1.courseIds[0],
          uri: "",
          sellable: false,
          withdrawers: [instructor1.address],
          redeemer: instructor1,
          validUntil: now + 86400,
          expectSuccessWith: "CourseUpdated",
        });
        // Step 3: update only withdrawers
        const update2 = await updateCourseHelper({
          courseId: course1.courseIds[0],
          uri: "https://example.com/isolate/initial",
          sellable: false,
          withdrawers: [instructor2.address],
          redeemer: instructor2,
          validUntil: now + 86400,
          expectSuccessWith: "CourseUpdated",
        });
        // Step 4: update only URI
        const update3 = await updateCourseHelper({
          courseId: course1.courseIds[0],
          uri: "https://example.com/isolate/only-uri",
          sellable: false,
          withdrawers: [], // same with =[instructor2.address] but cheaper
          redeemer: instructor2,
          validUntil: now + 86400,
          expectSuccessWith: "CourseUpdated",
        });
        // Step 5: update all fields at once
        const update4 = await updateCourseHelper({
          courseId: course1.courseIds[0],
          uri: "https://example.com/isolate/all-updated",
          sellable: true,
          withdrawers: [instructor2.address, instructor3.address],
          redeemer: instructor2,
          validUntil: now + 86400,
          expectSuccessWith: "CourseUpdated",
        });
        // Expect: all updates succeed, each isolated and combined update works as expected
      });

      it("should allow redundant updates with partial or full parameter repetition", async function () {
        // Step 1: create course
        const course1 = await createCourseBatchHelper({
          uries: ["https://example.com/redundant/start"],
          withdrawersArrays: [[instructor1.address]],
          redeemers: [instructor1.address],
          validUntils: [now + 86400],
          createBatchTxCaller: instructor1,
          expectSuccessWith: "CourseCreated",
        });
        // Step 2: sellable same (true), URI and withdrawers change
        const update1 = await updateCourseHelper({
          courseId: course1.courseIds[0],
          uri: "https://example.com/redundant/uri1",
          sellable: true,
          withdrawers: [instructor2.address],
          redeemer: instructor2,
          validUntil: now + 86400,
          expectSuccessWith: "CourseUpdated",
        });
        // Step 3: withdrawers same as step2, sellable and URI change
        const update2 = await updateCourseHelper({
          courseId: course1.courseIds[0],
          uri: "https://example.com/redundant/uri2-3",
          sellable: false,
          withdrawers: [instructor2.address],
          redeemer: instructor2,
          validUntil: now + 86400,
          expectSuccessWith: "CourseUpdated",
        });
        // Step 4: URI same as step3, sellable and withdrawers change
        const update3 = await updateCourseHelper({
          courseId: course1.courseIds[0],
          uri: "https://example.com/redundant/uri2-3",
          sellable: true,
          withdrawers: [instructor3.address],
          redeemer: instructor3,
          validUntil: now + 86400,
          expectSuccessWith: "CourseUpdated",
        });
        // Step 5: all params same as step3
        const update4 = await updateCourseHelper({
          courseId: course1.courseIds[0],
          uri: "https://example.com/redundant/uri2-3",
          sellable: true,
          withdrawers: [instructor3.address],
          redeemer: instructor3,
          validUntil: now + 86400,
          expectSuccessWith: "CourseUpdated",
        });
        // Expect: all updates succeed, selective redundancy is handled gracefully
      });

      it("should keep previous withdrawers when empty withdrawers array is provided", async function () {
        // Step 1: instructor1 creates a generic course with [instructor1]
        const courseId1 = await quickCreateACourse();
        const prevWithdrawers = await NewTreasury.getAuthorizedWithdrawers(courseId1);

        // Step 2: Update with empty withdrawers -> should KEEP previous set
        await updateCourseHelper({
          courseId: courseId1,
          uri: "https://example.com/emptied-uri",
          sellable: true,
          withdrawers: [], // <-- boş gönderiyoruz
          redeemer: instructor1,
          validUntil: now + 86400,
          expectSuccessWith: "CourseUpdated", // <-- artık success bekliyoruz
        });

        // Ek güvence: zincirden kontrol (opsiyonel)
        const wAfter = await NewTreasury.getAuthorizedWithdrawers(courseId1);
        expect(wAfter).to.deep.equal(prevWithdrawers);
      });
      /////### End of UPDATE Course Success Cases###/////
    });

    describe("❌ Failure Cases", function () {
      it("should fail to update a course with invalid signer", async function () {
        // Step 1: instructor1 creates a generic course with [instructor1] array
        const courseId1 = await quickCreateACourse();
        // Step 2: Override default updateVH and get a new voucher with invalid signer
        updateVH = getVoucherHelpers({ signer: instructor1 }).updateVH;
        // Step 3: Try to update course using invalid signer
        const updated = await updateCourseHelper({
          courseId: courseId1,
          uri: "https://example.com/course/1-updated",
          sellable: false,
          withdrawers: [instructor1.address],
          redeemer: instructor1,
          validUntil: now + 86400,
          expectRevertWith: "SignerIsNotBackend()",
        });
        // Expect: Reverts with "SignerIsNotBackend()"
      });

      it("should fail to update a course with invalid signature (SignatureIsInvalid)", async function () {
        // Step 1: Create a course
        const courseId1 = await quickCreateACourse();
        // Step 2: Build a valid voucher
        const good = await updateVH.signVoucher({
          courseId: courseId1,
          sellable: false,
          uri: "https://example.com/course/1-updated-invalidsig",
          withdrawers: [instructor1.address],
          redeemer: instructor1.address, // msg.sender ile aynı
          validUntil: now + 86400,
        });
        // Step 3: Corrupt signature
        const bad = { ...good };
        bad.signature = "0x12"; // 65 byte değil -> tryRecover err != NoError
        // Step 4: Expect revert
        await expect(NewTreasury.connect(instructor1).updateCourse(bad)).to.be.revertedWithCustomError(
          NewTreasury,
          "SignatureIsInvalid()"
        );
      });

      it("should fail to update a course with expired voucher", async function () {
        // Step 1: instructor1 creates a generic course with [instructor1] array
        const courseId1 = await quickCreateACourse();
        // Step 2: set up an expired validUntil timestamp
        const expiredTimestamp = now - 60; // 1 dakika önce
        // Step 3: try to update the course using an expired voucher
        const update1 = await updateCourseHelper({
          courseId: courseId1,
          uri: "https://example.com/expired-update",
          sellable: false,
          withdrawers: [instructor1.address],
          redeemer: instructor1,
          validUntil: expiredTimestamp,
          expectRevertWith: "VoucherIsExpired()",
        });
        // Expect: Reverts with "VoucherIsExpired()"
      });

      it("should fail to update a course if msg.sender !== redeemer", async function () {
        // Step 1: instructor1 creates a generic course with [instructor1] array
        const courseId1 = await quickCreateACourse();
        // Step 2: prepare mismatched redeemer (voucher will carry different redeemer)
        falseRedeemer = ethers.ZeroAddress;
        // Step 3: attempt update with mismatched msg.sender and voucher.redeemer
        await updateCourseHelper({
          courseId: courseId1,
          uri: "https://example.com/update-redeemer-mismatch/attempt",
          sellable: true,
          withdrawers: [instructor1.address],
          redeemer: instructor1, // msg.sender
          validUntil: now + 86400,
          expectRevertWith: "CallerIsNotVoucherRedeemer()",
        });
        // Expect: Reverts with "CallerIsNotVoucherRedeemer()"
      });

      it("should fail to update a course with duplicate withdrawers", async function () {
        // Step 1: instructor1 creates a generic course with [instructor1] array
        const courseId1 = await quickCreateACourse();
        // Step 2: instructor1 attempts to update the course with a duplicate withdrawer
        await updateCourseHelper({
          courseId: courseId1,
          uri: "https://example.com/update-duplicate-withdrawer",
          sellable: true,
          withdrawers: [instructor1.address, instructor2.address, instructor3.address, instructor1.address], // duplicate withdrawer
          redeemer: instructor1,
          validUntil: now + 86400,
          expectRevertWith: "WithdrawerArrayContainsDuplicates()",
        });
        // Expect: Reverts with "WithdrawerArrayContainsDuplicates()"
      });

      it("should fail to update course with a URI that is already used by another course", async function () {
        // Step 1: instructor1 creates first course with URI-A
        const courseA = await createCourseBatchHelper({
          uries: ["https://example.com/uri-a"],
          withdrawersArrays: [[instructor1.address]],
          redeemers: [instructor1.address],
          validUntils: [now + 86400],
          createBatchTxCaller: instructor1,
          expectSuccessWith: "CourseCreated",
        });
        // Step 2: instructor2 creates second course with URI-B
        const courseB = await createCourseBatchHelper({
          uries: ["https://example.com/uri-b"],
          withdrawersArrays: [[instructor2.address]],
          redeemers: [instructor2.address],
          validUntils: [now + 86400],
          createBatchTxCaller: instructor2,
          expectSuccessWith: "CourseCreated",
        });
        // Step 3: Try to update their course to use URI-A (which is already taken)
        const updateB = await updateCourseHelper({
          courseId: courseB.courseIds[0],
          uri: "https://example.com/uri-a", // trying to reuse uri-a
          sellable: true,
          withdrawers: [instructor2.address],
          redeemer: instructor2,
          validUntil: now + 86400,
          expectRevertWith: "UriIsAlreadyUsed()",
        });
        // Expect: Reverts with "UriIsAlreadyUsed()"
      });

      it("should fail to update a course with more than allowed withdrawers", async function () {
        // Step 1: instructor1 creates a generic course with [instructor1] array
        const courseId1 = await quickCreateACourse();
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
          courseId: courseId1,
          uri: "https://example.com/updated-uri-exceed",
          sellable: true,
          withdrawers: extraWithdrawers,
          redeemer: instructor1,
          validUntil: now + 86400,
          expectRevertWith: "WithdrawerArrayExceedsLimit()",
        });
        // Expect: Reverts with "WithdrawerArrayExceedsLimit()"
      });

      it("should fail to update a course if any withdrawer is address(0)", async function () {
        // Step 1: instructor1 creates a generic course with [instructor1] array
        const courseId1 = await quickCreateACourse();
        // Step 2: Set withdrawers with zero addresses in index 0
        const invalidWithdrawers = [instructor1.address, ethers.ZeroAddress];
        // Step 3: Try to update course
        const update = await updateCourseHelper({
          courseId: courseId1,
          uri: "https://example.com/update-with-zero",
          sellable: true,
          withdrawers: invalidWithdrawers,
          redeemer: instructor1,
          validUntil: now + 86400,
          expectRevertWith: "WithdrawerAddressIsZero()",
        });
        // Expect: Reverts with "Zero address not allowed"
      });

      it("should fail to update course if redeemer is not in withdrawers and not backend", async function () {
        // Step 1: instructor1 creates a generic course with [instructor1] array
        const courseId1 = await quickCreateACourse();
        // Step 2: instructor2 tries to update, but is not in withdrawers
        const update1_course1 = await updateCourseHelper({
          courseId: courseId1,
          uri: "https://example.com/invalid-update-attempt",
          sellable: false,
          withdrawers: [instructor3.address],
          redeemer: instructor2,
          validUntil: now + 86400,
          expectRevertWith: "CallerIsNeitherWithdrawerNorBackend()",
        });
        // Expect: revert due to unauthorized redeemer
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
          expectRevertWith: "CourseIdIsInvalid()",
        });
        // Expect: Reverts with "CourseIdIsInvalid()-update"
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
          expectRevertWith: "CourseIdIsInvalid()",
          previousWithdrawers: [], // course zaten yok
        });
        // Expect: Reverts with "CourseIdIsInvalid()-update"
        // Step 3: instructor1 creates a generic course with [instructor1] array to increase courseCounter
        const courseId1 = await quickCreateACourse();
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
          expectRevertWith: "CourseIdIsInvalid()",
        });
        // Expect: Reverts with "CourseIdIsInvalid()-update"
      });
      /////### End of UPDATE Course Failure Cases###/////
    });
    /////### End of UPDATE Course###/////
  });

  // 3. Course Purchase
  describe("💰💳 COURSE PURCHASE", function () {
    describe("✅ Success Cases", function () {
      it("should allow a user to buy a course using an ERC20 token and a valid voucher", async function () {
        // Step 1: instructor1 creates a generic course with [instructor1] array
        const courseId1 = await quickCreateACourse();
        // Step 2: buyer1 buys course for person1 via BATCH (ERC20, msg.value = 0)
        await buyCourseBatchHelper({
          courseIds: [courseId1, courseId1],
          tokenAddresses: [MKT1.target, MKT2.target],
          coursePrices: [ethers.parseEther("10"), ethers.parseEther("10")],
          courseReceivers: [person1.address, person2.address],
          redeemers: [buyer1, buyer1], // genelde hepsi aynı: tx'i buyer1 atıyor
          validUntils: [now + 86400, now + 86400],
          nativeMsgValue: 0, // sadece ERC20 olduğundan 0
          buyBatchTxCaller: buyer1, // tx gönderen signer
          expectSuccessWith: "ContentPurchased",
        });
        // Step 3: (Ek doğrulama istersen) son durumları kontrattan okuyup assert edebilirsin.
      });

      it("should allow a user to buy a course using native token and a valid voucher", async function () {
        // Step 1: instructor1 creates a generic course with [instructor1] array
        const courseId1 = await quickCreateACourse();
        // Step 2: buyer1 buys course for person1 with native token
        await buyCourseBatchHelper({
          courseIds: [courseId1],
          tokenAddresses: [ethers.ZeroAddress], // native token
          coursePrices: [ethers.parseEther("10")],
          courseReceivers: [person1.address],
          redeemers: [buyer1], // genelde hepsi aynı: tx'i buyer1 atıyor
          validUntils: [now + 86400],
          nativeMsgValue: ethers.parseEther("10"), // native token için msg.value
          buyBatchTxCaller: buyer1, // tx gönderen signer
          expectSuccessWith: "ContentPurchased",
        });
        // Step 3: Expect "ContentPurchased" event with expected success states
      });

      it("should allow a user to buy multiple different courses", async function () {
        // Step 1: instructors creates 3 different courses
        const courses = await createCourseBatchHelper({
          uries: ["https://example.com/course/1", "https://example.com/course/2", "https://example.com/course/3"],
          withdrawersArrays: [[instructor1.address], [instructor1.address], [instructor2.address]],
          redeemers: [backend.address, backend.address, backend.address],
          validUntils: [now + 86400, now + 86400, now + 86400],
          createBatchTxCaller: backend,
          expectSuccessWith: "CourseCreated",
        });
        // Step 2: buyers buys all 3 courses for person1
        await buyCourseBatchHelper({
          courseIds: [courses.courseIds[0], courses.courseIds[1], courses.courseIds[2]],
          tokenAddresses: [MKT1.target, ethers.ZeroAddress, MKT2.target],
          coursePrices: [
            ethers.parseEther("10"), // course1 price in MKT1
            ethers.parseEther("5"), // course2 price in native token
            ethers.parseEther("15"), // course3 price in MKT2
          ],
          courseReceivers: [person1.address, person1.address, person1.address],
          redeemers: [buyer1, buyer1, buyer1], // farklı redeemerlar
          validUntils: [now + 86400, now + 86400, now + 86400],
          nativeMsgValue: ethers.parseEther("5"), // sadece course2 için native msg.value
          buyBatchTxCaller: buyer1, // tx gönderen signer
          expectSuccessWith: "ContentPurchased",
        });
        // Step 3: Expect "ContentPurchased" event with expected success states
      });

      it("should allow a user to buy a course for themselves", async function () {
        // Step 1: instructor1 creates a generic course with [instructor1] array
        const courseId1 = await quickCreateACourse();
        // Step 2: buyer1 buys course for themselves
        await buyCourseBatchHelper({
          courseIds: [courseId1],
          tokenAddresses: [MKT1.target],
          coursePrices: [ethers.parseEther("10")],
          courseReceivers: [buyer1.address], // self-buy
          redeemers: [buyer1], // genelde hepsi aynı: tx'i buyer1 atıyor
          validUntils: [now + 86400],
          nativeMsgValue: 0, // sadece ERC20 olduğundan 0
          buyBatchTxCaller: buyer1, // tx gönderen signer
          expectSuccessWith: "ContentPurchased",
        });
        // Step 3: Expect "ContentPurchased" event with expected success states
      });

      it("should allow a course to be sold to multiple receivers using different tokens and prices", async function () {
        // Step 1: instructor1 creates a generic course with [instructor1] array
        const courseId1 = await quickCreateACourse();
        // Step 2: person1 buys for 10 mtk1
        await buyCourseBatchHelper({
          courseIds: [courseId1],
          tokenAddresses: [MKT1.target],
          coursePrices: [ethers.parseEther("10")],
          courseReceivers: [person1.address],
          redeemers: [backend],
          validUntils: [now + 86400],
          nativeMsgValue: 0,
          buyBatchTxCaller: backend,
          expectSuccessWith: "ContentPurchased",
        });
        // Step 3: person2 buys for 5 mtk1
        await buyCourseBatchHelper({
          courseIds: [courseId1],
          tokenAddresses: [MKT1.target],
          coursePrices: [ethers.parseEther("5")],
          courseReceivers: [person2.address],
          redeemers: [backend],
          validUntils: [now + 86400],
          nativeMsgValue: 0,
          buyBatchTxCaller: backend,
          expectSuccessWith: "ContentPurchased",
        });
        // Step 4: person3 buys for 15 mtk2
        await buyCourseBatchHelper({
          courseIds: [courseId1],
          tokenAddresses: [MKT2.target],
          coursePrices: [ethers.parseEther("15")],
          courseReceivers: [person3.address],
          redeemers: [buyer1],
          validUntils: [now + 86400],
          nativeMsgValue: 0,
          buyBatchTxCaller: buyer1,
          expectSuccessWith: "ContentPurchased",
        });
        // Step 5: person4 buys for 20 eth (native),
        await buyCourseBatchHelper({
          courseIds: [courseId1],
          tokenAddresses: [ethers.ZeroAddress], // native token
          coursePrices: [ethers.parseEther("20")],
          courseReceivers: [person4.address],
          redeemers: [buyer1],
          validUntils: [now + 86400],
          nativeMsgValue: ethers.parseEther("20"),
          buyBatchTxCaller: buyer1,
          expectSuccessWith: "ContentPurchased",
        });
        // Step 6: person5 buys for 25 eth (native)
        await buyCourseBatchHelper({
          courseIds: [courseId1],
          tokenAddresses: [ethers.ZeroAddress], // native token
          coursePrices: [ethers.parseEther("25")],
          courseReceivers: [person5.address],
          redeemers: [buyer1],
          validUntils: [now + 86400],
          nativeMsgValue: ethers.parseEther("25"),
          buyBatchTxCaller: buyer1,
          expectSuccessWith: "ContentPurchased",
        });
        // Expect: all purchases succeed with "ContentPurchased" event
      });
      /////###End of Success Cases###/////
    });

    describe("❌ Failure Cases", function () {
      it("should fail to buy a course with invalid signer", async function () {
        // Step 1: instructor1 creates a generic course with [instructor1] array
        const courseId1 = await quickCreateACourse();
        // Step 2: Override buyVH with invalid signer
        buyVH = getVoucherHelpers({ signer: instructor3 }).buyVH;
        // Step 3: Try to buy with invalid voucher signer
        await buyCourseBatchHelper({
          courseIds: [courseId1],
          tokenAddresses: [MKT1.target],
          coursePrices: [ethers.parseEther("10")],
          courseReceivers: [person1.address],
          redeemers: [buyer1], // genelde hepsi aynı: tx'i buyer1 atıyor
          validUntils: [now + 86400],
          nativeMsgValue: 0, // sadece ERC20 olduğundan 0
          buyBatchTxCaller: buyer1, // tx gönderen signer
          expectRevertWith: "SignerIsNotBackend()",
        });
        // Expect: Reverts with "SignerIsNotBackend()"
      });

      it("should fail to buy a course with invalid signature (SignatureIsInvalid)", async function () {
        // Step 1: instructor1 creates a generic course
        const courseId1 = await quickCreateACourse();
        // Step 2: Build a valid buy voucher
        const good = await buyVH.signVoucher({
          courseId: courseId1,
          tokenAddress: MKT1.target, // use ERC20 so msg.value = 0
          coursePrice: ethers.parseEther("10"),
          courseReceiver: person1.address,
          redeemer: buyer1.address, // must match msg.sender
          validUntil: now + 86400,
        });
        // Step 3: Corrupt signature
        const bad = { ...good };
        bad.signature = "0x12"; // invalid length -> tryRecover err != NoError
        // Step 4: Expect revert with SignatureIsInvalid
        await expect(NewTreasury.connect(buyer1).buyCourseBatch([bad], { value: 0 })).to.be.revertedWithCustomError(
          NewTreasury,
          "SignatureIsInvalid()"
        );
      });

      it("should fail to buy a course with expired voucher", async function () {
        // Step 1: instructor1 creates a generic course with [instructor1] array
        const courseId1 = await quickCreateACourse();
        // Step 2: Use expired timestamp
        const expired = now - 60;
        // Step 3: Try to buy with expired voucher
        await buyCourseBatchHelper({
          courseIds: [courseId1],
          tokenAddresses: [MKT1.target],
          coursePrices: [ethers.parseEther("10")],
          courseReceivers: [person1.address],
          redeemers: [buyer1], // genelde hepsi aynı: tx'i buyer1 atıyor
          validUntils: [expired],
          nativeMsgValue: 0, // sadece ERC20 olduğundan 0
          buyBatchTxCaller: buyer1, // tx gönderen signer
          expectRevertWith: "VoucherIsExpired()",
        });
        // Expect: Reverts with "VoucherIsExpired()"
      });

      it("should fail to buy a course if msg.sender !== redeemer", async function () {
        // Step 1: instructor1 creates a generic course with [instructor1] array
        const courseId1 = await quickCreateACourse();
        // Step 2: Use mismatched redeemer
        falseRedeemer = ethers.ZeroAddress;
        // Step 3: Attempt to buy with voucher.redeemer !== msg.sender
        await buyCourseBatchHelper({
          courseIds: [courseId1],
          tokenAddresses: [MKT1.target],
          coursePrices: [ethers.parseEther("10")],
          courseReceivers: [person1.address],
          redeemers: [buyer1], // genelde hepsi aynı: tx'i buyer1 atıyor
          validUntils: [now + 86400],
          nativeMsgValue: 0, // sadece ERC20 olduğundan 0
          buyBatchTxCaller: buyer1, // tx gönderen signer
          expectRevertWith: "CallerIsNotVoucherRedeemer()",
        });
        // Expect: Reverts with "CallerIsNotVoucherRedeemer()"
      });

      it("should fail to buy if duplicate courseId receiver pair exists in batch", async function () {
        // Step 1: instructor1 creates a generic course with [instructor1] array
        const courseId1 = await quickCreateACourse();
        // Step 2: buyer1 try to buy same course to same receiver twice
        await buyCourseBatchHelper({
          courseIds: [courseId1, courseId1],
          tokenAddresses: [MKT1.target, MKT2.target],
          coursePrices: [ethers.parseEther("10"), ethers.parseEther("10")],
          courseReceivers: [person1.address, person1.address],
          redeemers: [buyer1, buyer1], // genelde hepsi aynı: tx'i buyer1 atıyor
          validUntils: [now + 86400, now + 86400],
          nativeMsgValue: 0, // sadece ERC20 olduğundan 0
          buyBatchTxCaller: buyer1, // tx gönderen signer
          expectRevertWith: "CourseIsAlreadyOwnedByReceiverOrDuplicatedInBatch()",
        });
        // Step 3: Reverts with "CourseIsAlreadyOwnedByReceiverOrDuplicatedInBatch()"
      });

      it("should fail if the same course is purchased twice for the same receiver", async function () {
        // Step 1: instructor1 creates a generic course with [instructor1] array
        const courseId1 = await quickCreateACourse();
        // Step 2: buyer1 buys the course for person1
        await buyCourseBatchHelper({
          courseIds: [courseId1],
          tokenAddresses: [MKT1.target],
          coursePrices: [ethers.parseEther("10")],
          courseReceivers: [person1.address],
          redeemers: [buyer1], // genelde hepsi aynı: tx'i buyer1 atıyor
          validUntils: [now + 86400],
          nativeMsgValue: 0, // sadece ERC20 olduğundan 0
          buyBatchTxCaller: buyer1, // tx gönderen signer
          expectSuccessWith: "ContentPurchased",
        });
        // Step 3: Try to buy the same course again for the same person → should revert
        await buyCourseBatchHelper({
          courseIds: [courseId1],
          tokenAddresses: [MKT1.target],
          coursePrices: [ethers.parseEther("10")],
          courseReceivers: [person1.address],
          redeemers: [buyer2], // genelde hepsi aynı: tx'i buyer1 atıyor
          validUntils: [now + 86400],
          nativeMsgValue: 0, // sadece ERC20 olduğundan 0
          buyBatchTxCaller: buyer2, // tx gönderen signer
          expectRevertWith: "CourseIsAlreadyOwnedByReceiverOrDuplicatedInBatch()",
        });
        // Expect: Reverts with "CourseIsAlreadyOwnedByReceiverOrDuplicatedInBatch()"
      });

      it("should fail to buy a course with courseId zero", async function () {
        // Step 1: Try to buy a course with courseId = 0
        await buyCourseBatchHelper({
          courseIds: [0],
          tokenAddresses: [MKT1.target],
          coursePrices: [ethers.parseEther("10")],
          courseReceivers: [person1.address],
          redeemers: [buyer1], // genelde hepsi aynı: tx'i buyer1 atıyor
          validUntils: [now + 86400],
          nativeMsgValue: 0, // sadece ERC20 olduğundan 0
          buyBatchTxCaller: buyer1, // tx gönderen signer
          expectRevertWith: "CourseIdIsInvalid()",
        });
        // Expect: Reverts with "CourseIdIsInvalid()-buy"
        // Step 2: instructor1 creates a generic course with [instructor1] array to increase courseCounter
        const courseId1 = await quickCreateACourse();
        // Step 3: Try to buy with courseId = 0
        await buyCourseBatchHelper({
          courseIds: [0],
          tokenAddresses: [MKT1.target],
          coursePrices: [ethers.parseEther("10")],
          courseReceivers: [person1.address],
          redeemers: [buyer1], // genelde hepsi aynı: tx'i buyer1 atıyor
          validUntils: [now + 86400],
          nativeMsgValue: 0, // sadece ERC20 olduğundan 0
          buyBatchTxCaller: buyer1, // tx gönderen signer
          expectRevertWith: "CourseIdIsInvalid()",
        });
        // Expect: Reverts with "CourseIdIsInvalid()-buy"
      });

      it("should fail to buy a course with non-existent courseId", async function () {
        // Step 1: Get courseCounter from contract and increment by 1
        const invalidCourseId1 = (await NewTreasury.courseCounter()) + 1n;
        // Step 2: Try to buy a course with courseId = 0
        await buyCourseBatchHelper({
          courseIds: [invalidCourseId1],
          tokenAddresses: [MKT1.target],
          coursePrices: [ethers.parseEther("10")],
          courseReceivers: [person1.address],
          redeemers: [buyer1], // genelde hepsi aynı: tx'i buyer1 atıyor
          validUntils: [now + 86400],
          nativeMsgValue: 0, // sadece ERC20 olduğundan 0
          buyBatchTxCaller: buyer1, // tx gönderen signer
          expectRevertWith: "CourseIdIsInvalid()",
        });
        // Expect: Reverts with "CourseIdIsInvalid()-buy"
        // Step 3: instructor1 creates a generic course with [instructor1] array to increase courseCounter
        const courseId1 = await quickCreateACourse();
        // Step 4: Get again courseCounter from contract and increment by 1
        const invalidCourseId2 = (await NewTreasury.courseCounter()) + 1n;
        // Step 5: Try to buy with non-existent courseId
        await buyCourseBatchHelper({
          courseIds: [invalidCourseId2],
          tokenAddresses: [MKT1.target],
          coursePrices: [ethers.parseEther("10")],
          courseReceivers: [person1.address],
          redeemers: [buyer1], // genelde hepsi aynı: tx'i buyer1 atıyor
          validUntils: [now + 86400],
          nativeMsgValue: 0, // sadece ERC20 olduğundan 0
          buyBatchTxCaller: buyer1, // tx gönderen signer
          expectRevertWith: "CourseIdIsInvalid()",
        });
        // Expect: Reverts with "CourseIdIsInvalid()-buy"
      });

      it("should fail to buy a course that is not sellable", async function () {
        // Step 1: instructor1 creates a course
        const withdrawers = [instructor1.address, instructor2.address];
        const course1 = await createCourseBatchHelper({
          uries: ["https://example.com/course/1"],
          withdrawersArrays: [withdrawers],
          redeemers: [instructor1.address],
          validUntils: [now + 86400],
          createBatchTxCaller: instructor1,
          expectSuccessWith: "CourseCreated",
        });
        // Step 2: backend disables the course for sale
        const update1_course1 = await updateCourseHelper({
          courseId: course1.courseIds[0],
          uri: "https://example.com/course/not-sellable-updated",
          sellable: false, // set sellable to false
          withdrawers: withdrawers,
          redeemer: backend,
          validUntil: now + 86400,
          expectSuccessWith: "CourseUpdated",
        });
        // Step 3: buyer1 tries to buy the course
        await buyCourseBatchHelper({
          courseIds: [course1.courseIds[0]],
          tokenAddresses: [MKT1.target],
          coursePrices: [ethers.parseEther("10")],
          courseReceivers: [person1.address],
          redeemers: [buyer1], // genelde hepsi aynı: tx'i buyer1 atıyor
          validUntils: [now + 86400],
          nativeMsgValue: 0, // sadece ERC20 olduğundan 0
          buyBatchTxCaller: buyer1, // tx gönderen signer
          expectRevertWith: "CourseIsNotSellable()",
        });
        // Expect: Reverts with "CourseIsNotSellable()"
      });

      it("should fail to buy when batch size exceeds maxBatchBuySize", async function () {
        // Step 1: instructor1 creates a generic course
        const courseId1 = await quickCreateACourse();
        // Step 2: get maxBatchBuySize
        const maxBatch = Number(await NewTreasury.maxBatchBuySize());
        const numSales = maxBatch + 1; // one more than max allowed batch size
        // Step 3: attempt to buy more than allowed batch size in one tx
        const receivers = Array.from({ length: numSales }, () => ethers.Wallet.createRandom());
        await buyCourseBatchHelper({
          courseIds: Array(numSales).fill(courseId1),
          tokenAddresses: Array(numSales).fill(MKT1.target),
          coursePrices: Array(numSales).fill(ethers.parseEther("10")),
          courseReceivers: receivers.map((r) => r.address),
          redeemers: Array(numSales).fill(backend),
          validUntils: Array(numSales).fill(now + 86400),
          nativeMsgValue: 0,
          buyBatchTxCaller: backend,
          expectRevertWith: "BuyBatchSizeExceedsLimit()", // kontrattaki revert mesajına göre değiştir
        });
        // Expect: Reverts with "BuyBatchSizeExceedsLimit()"
      });

      it("should fail to buy a course with zero price", async function () {
        // Step 1: instructor1 creates a generic course with [instructor1] array
        const courseId1 = await quickCreateACourse();
        // Step 2: buyer1 tries to buy with zero price
        await buyCourseBatchHelper({
          courseIds: [courseId1],
          tokenAddresses: [MKT1.target],
          coursePrices: [0n], // zero price
          courseReceivers: [person1.address],
          redeemers: [buyer1], // genelde hepsi aynı: tx'i buyer1 atıyor
          validUntils: [now + 86400],
          nativeMsgValue: 0, // sadece ERC20 olduğundan 0
          buyBatchTxCaller: buyer1, // tx gönderen signer
          expectRevertWith: "CoursePriceIsZero()",
        });
        // Expect: Reverts with "CoursePriceIsZero()"
      });

      it("should fail to buy a course with zero price using native token", async function () {
        // Step 1: instructor1 creates a generic course with [instructor1] array
        const courseId1 = await quickCreateACourse();
        // Step 2: buyer1 tries to buy with zero price and native token
        await buyCourseBatchHelper({
          courseIds: [courseId1],
          tokenAddresses: [ethers.ZeroAddress], // native token
          coursePrices: [0n], // zero price
          courseReceivers: [person1.address],
          redeemers: [buyer1], // genelde hepsi aynı: tx'i buyer1 atıyor
          validUntils: [now + 86400],
          nativeMsgValue: 0, // native token için msg.value
          buyBatchTxCaller: buyer1, // tx gönderen signer
          expectRevertWith: "CoursePriceIsZero()",
        });
        // Expect: Reverts with "CoursePriceIsZero()"
      });

      it("should fail to buy a course with incorrect native token amount (less or more than price)", async function () {
        // Step 1: instructor1 creates a generic course with [instructor1] array
        const courseId1 = await quickCreateACourse();
        // Step 2: buyer1 tries to pay less than coursePrice in native token
        await buyCourseBatchHelper({
          courseIds: [courseId1],
          tokenAddresses: [ethers.ZeroAddress], // native token
          coursePrices: [ethers.parseEther("10")],
          courseReceivers: [person1.address],
          redeemers: [buyer1], // genelde hepsi aynı: tx'i buyer1 atıyor
          validUntils: [now + 86400],
          nativeMsgValue: ethers.parseEther("5"), // less than price
          buyBatchTxCaller: buyer1, // tx gönderen signer
          expectRevertWith: "NativeValueNotEqualToTotal()",
        });
        // Expect: Reverts with "NativeValueNotEqualToTotal()"
        // Step 3: buyer1 tries to pay more than coursePrice in native token
        await buyCourseBatchHelper({
          courseIds: [courseId1],
          tokenAddresses: [ethers.ZeroAddress], // native token
          coursePrices: [ethers.parseEther("10")],
          courseReceivers: [person1.address],
          redeemers: [buyer1], // genelde hepsi aynı: tx'i buyer1 atıyor
          validUntils: [now + 86400],
          nativeMsgValue: ethers.parseEther("15"), // more than price
          buyBatchTxCaller: buyer1, // tx gönderen signer
          expectRevertWith: "NativeValueNotEqualToTotal()",
        });
        // Expect: Reverts with "NativeValueNotEqualToTotal()"
      });

      it("should fail to buy a course with ERC20 token if any native token value is sent", async function () {
        // Step 1: instructor1 creates a generic course with [instructor1] array
        const courseId1 = await quickCreateACourse();
        // Step 2: buyer1 tries to buy the course with ERC20 but sends native token value
        await buyCourseBatchHelper({
          courseIds: [courseId1],
          tokenAddresses: [MKT1.target], // ERC20 token
          coursePrices: [ethers.parseEther("10")],
          courseReceivers: [person1.address],
          redeemers: [buyer1], // genelde hepsi aynı: tx'i buyer1 atıyor
          validUntils: [now + 86400],
          nativeMsgValue: ethers.parseEther("1"), // should be 0
          buyBatchTxCaller: buyer1, // tx gönderen signer
          expectRevertWith: "NativeValueNotEqualToTotal()",
        });
        // Expect: Reverts with "NativeValueNotEqualToTotal()"
      });

      it("should fail to buy a course when ERC20 token transfer to treasury fails", async function () {
        // Step 0: Deploy failTransfer contract and distribute tokens
        const { failNativeWallet, failMKT } = await deployFailTransferContracts();
        // Step 1: instructor1 creates a generic course with [instructor1] array
        const courseId1 = await quickCreateACourse();
        // Step 4: block failMTK transfer of treasury address
        await failMKT.connect(backend).blockAddress(NewTreasury.target, true);
        // Step 3: Try to buy with buyer1 using failMKT
        await buyCourseBatchHelper({
          courseIds: [courseId1],
          tokenAddresses: [failMKT.target], // failMKT token
          coursePrices: [ethers.parseEther("10")],
          courseReceivers: [person1.address],
          redeemers: [buyer1], // genelde hepsi aynı: tx'i buyer1 atıyor
          validUntils: [now + 86400],
          nativeMsgValue: 0, // sadece ERC20 olduğundan 0
          buyBatchTxCaller: buyer1, // tx gönderen signer
          expectRevertWith: "Recipient blocked from",
        });
        // Expect: Reverts with "Recipient blocked from"
      });
      /////###End of Failure Cases###/////
    });
    /////###End of Course Purchase###/////
  });

  // 4. Refunds: byPaymentId
  describe("🆔↩️ REFUNDS: refundCourseByPaymentId", function () {
    describe("✅ Success Cases", function () {
      it("should allow a course purchased with native token to be refunded", async function () {
        // Step 1: instructor1 creates a generic course with [instructor1] array
        const courseId1 = await quickCreateACourse();
        // Step 2: buyer1 buys course for person1 with native token
        const buy_course1 = await buyCourseBatchHelper({
          courseIds: [courseId1],
          tokenAddresses: [ethers.ZeroAddress],
          coursePrices: [ethers.parseEther("7")],
          courseReceivers: [person1.address],
          redeemers: [buyer1],
          validUntils: [now + 86400],
          nativeMsgValue: ethers.parseEther("7"),
          buyBatchTxCaller: buyer1,
          expectSuccessWith: "ContentPurchased",
        });
        // Step 3: buyer1 refunds the course
        const refund_course1 = await refundCourseHelper({
          paymentId: buy_course1[0],
          redeemer: buyer1,
          validUntil: now + 86400,
          expectSuccessWith: "CourseRefunded",
        });
        // Expect: "CourseRefunded" event with expected success states
      });

      it("should allow a course purchased with ERC20 token to be refunded", async function () {
        // Step 1: instructor1 creates a generic course with [instructor1] array
        const courseId1 = await quickCreateACourse();
        // Step 2: buyer1 buys course for person1 with ERC20 token
        const buy_course1 = await buyCourseBatchHelper({
          courseIds: [courseId1],
          tokenAddresses: [MKT1.target],
          coursePrices: [ethers.parseEther("5")],
          courseReceivers: [person1.address],
          redeemers: [buyer1],
          validUntils: [now + 86400],
          nativeMsgValue: 0, // ERC20 token, so no native msg.value
          buyBatchTxCaller: buyer1,
          expectSuccessWith: "ContentPurchased",
        });
        // Step 3: buyer1 refunds the course
        const refund_course1 = await refundCourseHelper({
          paymentId: buy_course1[0],
          redeemer: buyer1,
          validUntil: now + 86400,
          expectSuccessWith: "CourseRefunded",
        });
        // Expect: "CourseRefunded" event with expected success states
      });

      it("should allow multiple courses purchased with ERC20 token to be refunded", async function () {
        // Step 1: instructor1 creates multiple courses
        const courses = await createCourseBatchHelper({
          uries: [
            "https://example.com/course/erc20-multi-1",
            "https://example.com/course/erc20-multi-2",
            "https://example.com/course/erc20-multi-3",
          ],
          withdrawersArrays: [[instructor1.address], [instructor1.address], [instructor1.address, instructor3.address]],
          redeemers: [instructor1.address, instructor1.address, instructor1.address],
          validUntils: [now + 86400, now + 86400, now + 86400],
          createBatchTxCaller: instructor1,
          expectSuccessWith: "CourseCreated",
        });
        // Step 4: buyer1 buys all three courses for person1 with ERC20 token
        const buy_courses = await buyCourseBatchHelper({
          courseIds: [courses.courseIds[0], courses.courseIds[1], courses.courseIds[2]],
          tokenAddresses: [MKT1.target, MKT2.target, ethers.ZeroAddress],
          coursePrices: [
            ethers.parseEther("5"), // course1 price in MKT1
            ethers.parseEther("7"), // course2 price in MKT2
            ethers.parseEther("9"), // course3 price in MKT1
          ],
          courseReceivers: [person1.address, person1.address, person1.address],
          redeemers: [buyer1, buyer1, buyer1], // farklı redeemerlar
          validUntils: [now + 86400, now + 86400, now + 86400],
          nativeMsgValue: ethers.parseEther("9"), // sadece ERC20 olduğundan 0
          buyBatchTxCaller: buyer1, // tx gönderen signer
          expectSuccessWith: "ContentPurchased",
        });
        // Step 5: buyer1 refunds all three courses
        const refund1 = await refundCourseHelper({
          paymentId: buy_courses[0],
          redeemer: buyer1,
          validUntil: now + 86400,
          expectSuccessWith: "CourseRefunded",
        });
        const refund2 = await refundCourseHelper({
          paymentId: buy_courses[1],
          redeemer: buyer2,
          validUntil: now + 86400,
          expectSuccessWith: "CourseRefunded",
        });
        const refund3 = await refundCourseHelper({
          paymentId: buy_courses[2],
          redeemer: buyer1,
          validUntil: now + 86400,
          expectSuccessWith: "CourseRefunded",
        });
        // Expect: Each refund emits "CourseRefunded" event with expected success states
      });

      it("should allow a course to be refunded by a different redeemer than the original buyer", async function () {
        // Step 1: instructor1 creates a generic course with [instructor1] array
        const courseId1 = await quickCreateACourse();
        // Step 2: buyer1 buys course for person1 using ERC20
        const buy_course = await buyCourseBatchHelper({
          courseIds: [courseId1],
          tokenAddresses: [MKT1.target],
          coursePrices: [ethers.parseEther("12")],
          courseReceivers: [person1.address],
          redeemers: [buyer1], // genelde hepsi aynı: tx'i buyer1 atıyor
          validUntils: [now + 86400],
          nativeMsgValue: 0, // sadece ERC20 olduğundan 0
          buyBatchTxCaller: buyer1, // tx gönderen signer
          expectSuccessWith: "ContentPurchased",
        });
        // Step 3: buyer2 (a different redeemer) initiates refund
        const refund_course = await refundCourseHelper({
          paymentId: buy_course[0],
          redeemer: buyer2,
          validUntil: now + 86400,
          expectSuccessWith: "CourseRefunded",
        });
        // Expect: "CourseRefunded" event with expected success states
      });

      it("should allow a course to be bought, refunded with paymentId, and bought again by the same receiver", async function () {
        // Step 1: instructor1 creates a generic course with [instructor1] array
        const courseId1 = await quickCreateACourse();
        // Step 2: buyer1 buys course for person1
        const buy1 = await buyCourseBatchHelper({
          courseIds: [courseId1],
          tokenAddresses: [MKT1.target],
          coursePrices: [ethers.parseEther("9")],
          courseReceivers: [person1.address],
          redeemers: [buyer1], // genelde hepsi aynı: tx'i buyer1 atıyor
          validUntils: [now + 86400],
          nativeMsgValue: 0, // sadece ERC20 olduğundan 0
          buyBatchTxCaller: buyer1, // tx gönderen signer
          expectSuccessWith: "ContentPurchased",
        });
        // Step 3: refund the course
        const refund1 = await refundCourseHelper({
          paymentId: buy1[0],
          redeemer: buyer1,
          validUntil: now + 86400,
          expectSuccessWith: "CourseRefunded",
        });
        // Step 4: buy again
        const buy2 = await buyCourseBatchHelper({
          courseIds: [courseId1],
          tokenAddresses: [MKT1.target],
          coursePrices: [ethers.parseEther("9")],
          courseReceivers: [person1.address],
          redeemers: [buyer2], // genelde hepsi aynı: tx'i buyer1 atıyor
          validUntils: [now + 86400],
          nativeMsgValue: 0, // sadece ERC20 olduğundan 0
          buyBatchTxCaller: buyer2, // tx gönderen signer
          expectSuccessWith: "ContentPurchased",
        });
        // Expect: both purchases and refund succeed
      });

      it("should allow refund if original refund window is still valid despite later refundWindow shortened", async function () {
        // Step 1: instructor1 creates a generic course with [instructor1] array
        const courseId1 = await quickCreateACourse();
        // Step 2: buyer1 buys the course
        const buy_course = await buyCourseBatchHelper({
          courseIds: [courseId1],
          tokenAddresses: [MKT1.target],
          coursePrices: [ethers.parseEther("10")],
          courseReceivers: [person1.address],
          redeemers: [buyer1],
          validUntils: [now + 86400],
          nativeMsgValue: 0,
          buyBatchTxCaller: buyer1,
          expectSuccessWith: "ContentPurchased",
        });
        // Step 3: set refundWindow to 1 day
        await NewTreasury.connect(backend).setRefundWindow(1 * 86400);
        // Step 4: fast forward 3 days
        await fastForwardTime({ days: 3 });
        // Step 5: refund should succeed since original refund window was longer
        const refund = await refundCourseHelper({
          paymentId: buy_course[0],
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
        // Step 1: instructor1 creates a generic course with [instructor1] array
        const courseId1 = await quickCreateACourse();
        // Step 2: buyer1 buys course for person1
        const buy_course = await buyCourseBatchHelper({
          courseIds: [courseId1],
          tokenAddresses: [MKT1.target],
          coursePrices: [ethers.parseEther("10")],
          courseReceivers: [person1.address],
          redeemers: [buyer1], // genelde hepsi aynı: tx'i buyer1 atıyor
          validUntils: [now + 86400],
          nativeMsgValue: 0, // sadece ERC20 olduğundan 0
          buyBatchTxCaller: buyer1, // tx gönderen signer
          expectSuccessWith: "ContentPurchased",
        });
        // Step 3: Use wrong signer for the refund voucher
        refundVH = getVoucherHelpers({ signer: instructor2 }).refundVH;
        // Step 4: Attempt refund with invalid signer
        const refund_course = await refundCourseHelper({
          paymentId: buy_course[0],
          redeemer: buyer1,
          validUntil: now + 86400,
          expectRevertWith: "SignerIsNotBackend()",
        });
        // Expect: Reverts with "SignerIsNotBackend()"
      });

      it("should fail to refund with invalid signature (SignatureIsInvalid)", async function () {
        // Step 1: instructor1 creates a generic course
        const courseId1 = await quickCreateACourse();
        // Step 2: buyer1 buys the course for person1
        const [paymentId] = await buyCourseBatchHelper({
          courseIds: [courseId1],
          tokenAddresses: [MKT1.target],
          coursePrices: [ethers.parseEther("10")],
          courseReceivers: [person1.address],
          redeemers: [buyer1],
          validUntils: [now + 86400],
          nativeMsgValue: 0,
          buyBatchTxCaller: buyer1,
          expectSuccessWith: "ContentPurchased",
        });
        // Step 3: build a valid refund voucher, then corrupt its signature
        const good = await refundVH.signVoucher({
          paymentId,
          redeemer: buyer1.address, // must match msg.sender
          validUntil: now + 86400,
        });
        const bad = { ...good, signature: "0x12" }; // invalid length -> tryRecover err != NoError
        // Step 4: expect revert with SignatureIsInvalid
        await expect(NewTreasury.connect(buyer1).refundCourse(bad)).to.be.revertedWithCustomError(
          NewTreasury,
          "SignatureIsInvalid()"
        );
      });

      it("should fail to refund with expired voucher", async function () {
        // Step 1: instructor1 creates a generic course with [instructor1] array
        const courseId1 = await quickCreateACourse();
        // Step 2: buyer1 buys course for person1
        const buy_course = await buyCourseBatchHelper({
          courseIds: [courseId1],
          tokenAddresses: [MKT1.target],
          coursePrices: [ethers.parseEther("10")],
          courseReceivers: [person1.address],
          redeemers: [buyer1], // genelde hepsi aynı: tx'i buyer1 atıyor
          validUntils: [now + 86400],
          nativeMsgValue: 0, // sadece ERC20 olduğundan 0
          buyBatchTxCaller: buyer1, // tx gönderen signer
          expectSuccessWith: "ContentPurchased",
        });
        // Step 3: Attempt refund with expired voucher
        const refund_course = await refundCourseHelper({
          paymentId: buy_course[0],
          redeemer: buyer2,
          validUntil: now - 60, // expired
          expectRevertWith: "VoucherIsExpired()",
        });
        // Expect: Reverts with "VoucherIsExpired()"
      });

      it("should fail to refund if msg.sender !== redeemer", async function () {
        // Step 1: instructor1 creates a generic course with [instructor1] array
        const courseId1 = await quickCreateACourse();
        // Step 2: buyer1 buys course for person1
        const buy_course = await buyCourseBatchHelper({
          courseIds: [courseId1],
          tokenAddresses: [MKT1.target],
          coursePrices: [ethers.parseEther("10")],
          courseReceivers: [person1.address],
          redeemers: [buyer1], // genelde hepsi aynı: tx'i buyer1 atıyor
          validUntils: [now + 86400],
          nativeMsgValue: 0, // sadece ERC20 olduğundan 0
          buyBatchTxCaller: buyer1, // tx gönderen signer
          expectSuccessWith: "ContentPurchased",
        });
        // Step 3: attempt refund where voucher.redeemer !== msg.sender
        falseRedeemer = ethers.ZeroAddress;
        // Step 4: Attempt to refund with mismatched redeemer
        await refundCourseHelper({
          paymentId: buy_course[0],
          redeemer: buyer1, // actual msg.sender
          validUntil: now + 86400,
          expectRevertWith: "CallerIsNotVoucherRedeemer()",
        });
        // Expect: Reverts with "CallerIsNotVoucherRedeemer()"
      });

      it("should fail to refund twice for the same course", async function () {
        // Step 1: instructor1 creates a generic course with [instructor1] array
        const courseId1 = await quickCreateACourse();
        // Step 2: buyer1 buys course for person1
        const buy_course = await buyCourseBatchHelper({
          courseIds: [courseId1],
          tokenAddresses: [MKT1.target],
          coursePrices: [ethers.parseEther("10")],
          courseReceivers: [person1.address],
          redeemers: [buyer1], // genelde hepsi aynı: tx'i buyer1 atıyor
          validUntils: [now + 86400],
          nativeMsgValue: 0, // sadece ERC20 olduğundan 0
          buyBatchTxCaller: buyer1, // tx gönderen signer
          expectSuccessWith: "ContentPurchased",
        });
        // Step 3: First refund
        const refund1 = await refundCourseHelper({
          paymentId: buy_course[0],
          redeemer: buyer1,
          validUntil: now + 86400,
          expectSuccessWith: "CourseRefunded",
        });
        // Step 4: Attempt second refund → should fail
        const refund2 = await refundCourseHelper({
          paymentId: buy_course[0],
          redeemer: buyer1,
          validUntil: now + 86400,
          expectRevertWith: "PaymentIsAlreadyRefunded()",
        });
        // Expect: Reverts with "PaymentIsAlreadyRefunded()"
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
          expectRevertWith: "PaymentIdIsInvalid()",
        });
        // Step 3: instructor1 creates a generic course with [instructor1] array to increase courseCounter
        const courseId1 = await quickCreateACourse();
        // Step 4: buyer the course (just to advance payment counters)
        const buy_course1 = await buyCourseBatchHelper({
          courseIds: [courseId1],
          tokenAddresses: [MKT1.target],
          coursePrices: [ethers.parseEther("10")],
          courseReceivers: [person1.address],
          redeemers: [buyer1], // genelde hepsi aynı: tx'i buyer1 atıyor
          validUntils: [now + 86400],
          nativeMsgValue: 0, // sadece ERC20 olduğundan 0
          buyBatchTxCaller: buyer1, // tx gönderen signer
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
          expectRevertWith: "PaymentIdIsInvalid()",
        });
        // Expect: Reverts with "PaymentIdIsInvalid()-refund"
      });

      it("should fail to refund if paymentId is zero (before and after course purchase)", async function () {
        // Step 1: Try refunding with paymentId = 0 before any course exists
        await refundCourseHelper({
          paymentId: 0n,
          redeemer: buyer1,
          validUntil: now + 86400,
          expectRevertWith: "PaymentIdIsInvalid()",
        });
        // Step 2: instructor1 creates a generic course with [instructor1] array to increase courseCounter
        const courseId1 = await quickCreateACourse();
        // Step 3: buyer1 buys course
        const buy_course1 = await buyCourseBatchHelper({
          courseIds: [courseId1],
          tokenAddresses: [MKT1.target],
          coursePrices: [ethers.parseEther("10")],
          courseReceivers: [person1.address],
          redeemers: [buyer1],
          validUntils: [now + 86400],
          nativeMsgValue: 0,
          buyBatchTxCaller: buyer1,
          expectSuccessWith: "ContentPurchased",
        });
        // Step 4: Try refunding with paymentId = 0 again after purchase
        await refundCourseHelper({
          paymentId: 0n,
          redeemer: buyer1,
          validUntil: now + 86400,
          expectRevertWith: "PaymentIdIsInvalid()",
        });
        // Expect: Reverts with "PaymentIdIsInvalid()-refund"
      });

      it("should fail to refund if refund window has passed", async function () {
        // Step 1: Read refundWindow from contract
        const refundWindow = await NewTreasury.refundWindow();
        // Step 2: instructor1 creates a generic course with [instructor1] array
        const courseId1 = await quickCreateACourse();
        // Step 3: Buyer1 buys the course for person1
        const buy_course1 = await buyCourseBatchHelper({
          courseIds: [courseId1],
          tokenAddresses: [MKT1.target],
          coursePrices: [ethers.parseEther("10")],
          courseReceivers: [person1.address],
          redeemers: [buyer1],
          validUntils: [now + 86400],
          nativeMsgValue: 0,
          buyBatchTxCaller: buyer1,
          expectSuccessWith: "ContentPurchased",
        });
        // Step 4: Fast forward time by refundWindow + 1 second
        const refundWindowInSec = Number(refundWindow);
        await fastForwardTime({ seconds: refundWindowInSec + 1 });
        // Step 5: Try to refund and expect failure
        await refundCourseHelper({
          paymentId: buy_course1[0],
          redeemer: buyer1,
          validUntil: now + 86400,
          expectRevertWith: "RefundWindowHasPassed()",
        });
        // Expect: Reverts with "RefundWindowHasPassed()"
      });

      it("should fail refund if original refund window expired despite later refundWindow was extended", async function () {
        // Step 1: set refundWindow to 1 day
        await NewTreasury.connect(backend).setRefundWindow(1);
        // Step 2: instructor1 creates a generic course with [instructor1] array
        const courseId1 = await quickCreateACourse();
        // Step 3: buyer1 buys the course
        const buy_course = await buyCourseBatchHelper({
          courseIds: [courseId1],
          tokenAddresses: [MKT1.target],
          coursePrices: [ethers.parseEther("10")],
          courseReceivers: [person1.address],
          redeemers: [buyer1],
          validUntils: [now + 86400],
          nativeMsgValue: 0,
          buyBatchTxCaller: buyer1,
          expectSuccessWith: "ContentPurchased",
        });
        // Step 4: extend refundWindow to 10 days (simulates a global policy change)
        await NewTreasury.connect(backend).setRefundWindow(10 * 86400);
        // Step 5: fast forward 3 days (beyond original 1 day window)
        await fastForwardTime({ days: 3 });
        // Step 6: attempt refund → should fail since original refund window passed
        await refundCourseHelper({
          paymentId: buy_course[0],
          redeemer: buyer1,
          validUntil: now + 86400,
          expectRevertWith: "RefundWindowHasPassed()",
        });
        // Expect: Reverts even though current refundWindow is 10 days
      });

      it("should fail refund by paymentId if payment was already withdrawn", async function () {
        // Step 1: instructor1 creates a generic course with [instructor1] array
        const courseId1 = await quickCreateACourse();
        // Step 2: buyer1 purchases course for person1
        const buy = await buyCourseBatchHelper({
          courseIds: [courseId1],
          tokenAddresses: [MKT1.target],
          coursePrices: [ethers.parseEther("10")],
          courseReceivers: [person1.address],
          redeemers: [buyer1],
          validUntils: [now + 86400],
          nativeMsgValue: 0, // sadece ERC20 olduğundan 0
          buyBatchTxCaller: buyer1, // tx gönderen signer
          expectSuccessWith: "ContentPurchased",
        });
        // Step 3: fast forward time beyond refund window
        const refundWindowInDays = Number(await NewTreasury.refundWindow()) / 86400;
        await fastForwardTime({ days: refundWindowInDays + 1 });
        // Step 4: instructor withdraws the payment
        await withdrawCoursePaymentsHelper({
          courseId: courseId1,
          fromIndex: 1,
          toIndex: 1,
          redeemer: instructor1,
          validUntil: now + 86400,
          expectSuccessWith: "CoursePaymentsWithdrawn",
          expectations: [PES],
        });
        // Step 5: try to refund using paymentId (should fail due to already withdrawn)
        await refundCourseHelper({
          paymentId: buy[0],
          redeemer: buyer1,
          validUntil: now + 86400,
          expectRevertWith: "PaymentIsAlreadyWithdrawn()",
        });
        // Expectation: Refund fails because the payment was already withdrawn
      });

      it("should fail to refund when ERC20 token transfer to refunder fails", async function () {
        // Step 0: Deploy failTransfer contract and distribute tokens
        const { failNativeWallet, failMKT } = await deployFailTransferContracts();
        // Step 1: instructor1 creates a generic course with [instructor1] array
        const courseId1 = await quickCreateACourse();
        // Step 2: buyer1 buys course for person1
        const buy_course = await buyCourseBatchHelper({
          courseIds: [courseId1],
          tokenAddresses: [failMKT.target],
          coursePrices: [ethers.parseEther("10")],
          courseReceivers: [person1.address],
          redeemers: [buyer1], // genelde hepsi aynı: tx'i buyer1 atıyor
          validUntils: [now + 86400],
          nativeMsgValue: 0, // sadece ERC20 olduğundan 0
          buyBatchTxCaller: buyer1, // tx gönderen signer
          expectSuccessWith: "ContentPurchased",
        });
        // Step 4: block failMTK transfer of treasury address
        await failMKT.connect(backend).blockAddress(buyer1.address, true);
        // Step 4: Attempt refund with invalid signer
        const refund_course = await refundCourseHelper({
          paymentId: buy_course[0],
          redeemer: buyer3,
          validUntil: now + 86400,
          expectRevertWith: "Recipient blocked",
        });
        // Expect: Reverts with "Recipient blocked"
      });

      it("should fail to refund when native token transfer to refunder fails", async function () {
        // Step 0: Deploy failTransfer contract and distribute tokens
        const { failNativeWallet, failMKT } = await deployFailTransferContracts();
        // Step 1: instructor1 creates a generic course with [instructor1] array
        const courseId1 = await quickCreateACourse();
        // Step 2: backend triggers failNativeWallets buyTrigger to buy a course with contract
        const nativePrice = ethers.parseEther("10");
        const voucher = await buyVH.signVoucher({
          courseId: courseId1,
          tokenAddress: ethers.ZeroAddress, // native token
          coursePrice: nativePrice,
          courseReceiver: person1.address,
          redeemer: failNativeWallet.target, // payer (msg.sender NewTreasury'ye bu kontrat olacak)
          validUntil: now + 86400,
        });
        const vouchers = [voucher]; // tek voucher'ı batch gibi kullan
        const expectedOutcome = await _prepareExpectedBuyBatchStates(
          vouchers,
          failNativeWallet.target, // buyBatchTxCaller
          true, // waitSuccess
          backend.address // executer
        );
        const currentPaymentCounter = await NewTreasury.paymentCounter();
        const expPaymentId = Number(currentPaymentCounter) + 1; // paymentId'yi hesapla
        // Step 3: trigger buy inside failNativeWallet
        const tx = await failNativeWallet
          .connect(backend)
          .triggerBuy(NewTreasury.target, vouchers, { value: nativePrice });
        await expect(tx)
          .to.emit(NewTreasury, "ContentPurchased")
          .withArgs(
            expPaymentId,
            voucher.courseId,
            voucher.courseReceiver,
            failNativeWallet.target,
            ethers.ZeroAddress,
            nativePrice
          );
        const receipt = await tx.wait();
        const effectiveGasPrice = receipt.effectiveGasPrice ?? receipt.gasPrice ?? 0n;
        const gasCost = receipt.gasUsed * effectiveGasPrice;
        // Step 4: check balances and expected states after buy
        await _expectBuyBatch(nativePrice, expectedOutcome, gasCost, failNativeWallet.target, true, backend.address);
        // Step 5: block native token receive of failNativeWallet
        await failNativeWallet.connect(backend).setRejectPayments(true);
        // Step 6: Try to refund the course expect fail
        const refund_course = await refundCourseHelper({
          paymentId: expPaymentId,
          redeemer: buyer3,
          validUntil: now + 86400,
          expectRevertWith: "NativeRefundFailed()",
        });
        // Expect: Reverts with "NativeRefundFailed()"
      });
      /////###End of Failure Cases###/////
    });
    /////###End of Refunds: paymentId###/////
  });

  // 5. Refunds: byCourseOwner&Id
  describe("👤↩️ REFUNDS: refundCourseByCourseOwnerAndId", function () {
    describe("✅ Success Cases", function () {
      it("should allow refund using RefundCourseByOwnerAndCourseIdVoucher", async function () {
        // Step 1: instructor1 creates a generic course with [instructor1] array
        const courseId1 = await quickCreateACourse();
        // 2. buyer1 buys course for person1
        const buy_course = await buyCourseBatchHelper({
          courseIds: [courseId1],
          tokenAddresses: [MKT1.target],
          coursePrices: [ethers.parseEther("10")],
          courseReceivers: [person1.address],
          redeemers: [buyer1], // genelde hepsi aynı: tx'i buyer1 atıyor
          validUntils: [now + 86400],
          nativeMsgValue: 0, // sadece ERC20 olduğundan 0
          buyBatchTxCaller: buyer1, // tx gönderen signer
          expectSuccessWith: "ContentPurchased",
        });
        // 3. instructor5 initiates refund using courseOwner + courseId
        const refund_course = await refundCourseByOwnerHelper({
          courseOwner: person1.address,
          courseId: courseId1,
          redeemer: buyer1,
          validUntil: now + 86400,
          expectSuccessWith: "CourseRefunded",
        });
        // Expect: "CourseRefunded" event with expected success states
      });

      it("should allow a course purchased with native token to be refunded", async function () {
        // Step 1: instructor1 creates a generic course with [instructor1] array
        const courseId1 = await quickCreateACourse();
        // Step 2: buyer1 buys course for person1 with native token
        const buy_course1 = await buyCourseBatchHelper({
          courseIds: [courseId1],
          tokenAddresses: [ethers.ZeroAddress], // native token
          coursePrices: [ethers.parseEther("7")],
          courseReceivers: [person1.address],
          redeemers: [buyer1], // genelde hepsi aynı: tx'i buyer1 atıyor
          validUntils: [now + 86400],
          nativeMsgValue: ethers.parseEther("7"),
          buyBatchTxCaller: buyer1, // tx gönderen signer
          expectSuccessWith: "ContentPurchased",
        });
        // Step 3: buyer1 refunds the course
        const refund_course1 = await refundCourseByOwnerHelper({
          courseOwner: person1.address,
          courseId: courseId1,
          redeemer: buyer1,
          validUntil: now + 86400,
          expectSuccessWith: "CourseRefunded",
        });
        // Expect: "CourseRefunded" event with expected success states
      });

      it("should allow a course purchased with ERC20 token to be refunded using refundCourseByOwnerHelper", async function () {
        // Step 1: instructor1 creates a generic course with [instructor1] array
        const courseId1 = await quickCreateACourse();
        // Step 2: buyer1 buys course for person1 with ERC20 token
        const buy_course1 = await buyCourseBatchHelper({
          courseIds: [courseId1],
          tokenAddresses: [MKT1.target],
          coursePrices: [ethers.parseEther("5")],
          courseReceivers: [person1.address],
          redeemers: [buyer1], // genelde hepsi aynı: tx'i buyer1 atıyor
          validUntils: [now + 86400],
          nativeMsgValue: 0, // sadece ERC20 olduğundan 0
          buyBatchTxCaller: buyer1, // tx gönderen signer
          expectSuccessWith: "ContentPurchased",
        });
        // Step 3: buyer1 refunds the course
        const refund_course1 = await refundCourseByOwnerHelper({
          courseOwner: person1.address,
          courseId: courseId1,
          redeemer: buyer1,
          validUntil: now + 86400,
          expectSuccessWith: "CourseRefunded",
        });
        // Expect: "CourseRefunded" event with expected success states
      });

      it("should allow multiple courses purchased with ERC20 token to be refunded", async function () {
        // Step 1: instructor1 creates three courses
        const courses = await createCourseBatchHelper({
          uries: [
            "https://example.com/course/erc20-multi-1",
            "https://example.com/course/erc20-multi-2",
            "https://example.com/course/erc20-multi-3",
          ],
          withdrawersArrays: [[instructor1.address], [instructor1.address], [instructor1.address, instructor3.address]],
          redeemers: [instructor1.address, instructor1.address, instructor1.address],
          validUntils: [now + 86400, now + 86400, now + 86400],
          createBatchTxCaller: instructor1,
          expectSuccessWith: "CourseCreated",
        });
        // Step 4: buyer1 buys all three courses for person1 with ERC20 token
        const buy_courses = await buyCourseBatchHelper({
          courseIds: [courses.courseIds[0], courses.courseIds[1], courses.courseIds[2]],
          tokenAddresses: [MKT1.target, MKT2.target, ethers.ZeroAddress], // MKT1 for course1, MKT2 for course2, native token for course3
          coursePrices: [ethers.parseEther("5"), ethers.parseEther("7"), ethers.parseEther("9")],
          courseReceivers: [person1.address, person1.address, person1.address],
          redeemers: [buyer1, buyer1, buyer1], // genelde hepsi aynı: tx'i buyer1 atıyor
          validUntils: [now + 86400, now + 86400, now + 86400],
          nativeMsgValue: ethers.parseEther("9"), // only for native token
          buyBatchTxCaller: buyer1, // tx gönderen signer
          expectSuccessWith: "ContentPurchased",
        });
        // Step 5: buyer1 refunds all three courses
        const refund1 = await refundCourseByOwnerHelper({
          courseOwner: person1.address,
          courseId: courses.courseIds[0],
          redeemer: buyer1,
          validUntil: now + 86400,
          expectSuccessWith: "CourseRefunded",
        });
        const refund2 = await refundCourseByOwnerHelper({
          courseOwner: person1.address,
          courseId: courses.courseIds[1],
          redeemer: buyer2,
          validUntil: now + 86400,
          expectSuccessWith: "CourseRefunded",
        });
        const refund3 = await refundCourseByOwnerHelper({
          courseOwner: person1.address,
          courseId: courses.courseIds[2],
          redeemer: buyer1,
          validUntil: now + 86400,
          expectSuccessWith: "CourseRefunded",
        });
        // Expect: Each refund emits "CourseRefunded" event with expected success states
      });

      it("should allow a course to be refunded by a different redeemer than the original buyer", async function () {
        // Step 1: instructor1 creates a generic course with [instructor1] array
        const courseId1 = await quickCreateACourse();
        // Step 2: buyer1 buys course for person1 using ERC20
        const buy_course = await buyCourseBatchHelper({
          courseIds: [courseId1],
          tokenAddresses: [MKT1.target],
          coursePrices: [ethers.parseEther("12")],
          courseReceivers: [person1.address],
          redeemers: [buyer1], // genelde hepsi aynı: tx'i buyer1 atıyor
          validUntils: [now + 86400],
          nativeMsgValue: 0, // sadece ERC20 olduğundan 0
          buyBatchTxCaller: buyer1, // tx gönderen signer
          expectSuccessWith: "ContentPurchased",
        });
        // Step 3: buyer2 (a different redeemer) initiates refund
        const refund_course = await refundCourseByOwnerHelper({
          courseOwner: person1.address,
          courseId: courseId1,
          redeemer: buyer2,
          validUntil: now + 86400,
          expectSuccessWith: "CourseRefunded",
        });
        // Expect: "CourseRefunded" event with expected success states
      });

      it("should allow a course to be bought, refunded with byOwner, and bought again by the same receiver", async function () {
        // Step 1: instructor1 creates a generic course with [instructor1] array
        const courseId1 = await quickCreateACourse();
        // Step 2: buyer1 buys course for person1
        const buy1 = await buyCourseBatchHelper({
          courseIds: [courseId1],
          tokenAddresses: [MKT1.target],
          coursePrices: [ethers.parseEther("9")],
          courseReceivers: [person1.address],
          redeemers: [buyer1], // genelde hepsi aynı: tx'i buyer1 atıyor
          validUntils: [now + 86400],
          nativeMsgValue: 0, // sadece ERC20 olduğundan 0
          buyBatchTxCaller: buyer1, // tx gönderen signer
          expectSuccessWith: "ContentPurchased",
        });
        // Step 3: refund the course
        const refund1 = await refundCourseByOwnerHelper({
          courseOwner: person1.address,
          courseId: courseId1,
          redeemer: buyer1,
          validUntil: now + 86400,
          expectSuccessWith: "CourseRefunded",
        });
        // Step 4: buy again
        const buy2 = await buyCourseBatchHelper({
          courseIds: [courseId1],
          tokenAddresses: [MKT1.target],
          coursePrices: [ethers.parseEther("9")],
          courseReceivers: [person1.address],
          redeemers: [buyer2], // farklı bir redeemer
          validUntils: [now + 86400],
          nativeMsgValue: 0, // sadece ERC20 olduğundan 0
          buyBatchTxCaller: buyer2, // tx gönderen signer
          expectSuccessWith: "ContentPurchased",
        });
        // Expect: both purchases and refund succeed
        // Step 5: extra case refund by paymentId.
        const refund_course1 = await refundCourseHelper({
          paymentId: buy2[0],
          redeemer: buyer1,
          validUntil: now + 86400,
          expectSuccessWith: "CourseRefunded",
        });
        // Expect: "CourseRefunded" event with expected success states
      });

      it("should allow refund by owner if original refund window is still valid despite later refundWindow shortened", async function () {
        // Step 1: instructor1 creates a generic course with [instructor1] array
        const courseId1 = await quickCreateACourse();
        // Step 2: buyer1 buys the course for person1
        const buy_course = await buyCourseBatchHelper({
          courseIds: [courseId1],
          tokenAddresses: [MKT1.target],
          coursePrices: [ethers.parseEther("10")],
          courseReceivers: [person1.address],
          redeemers: [buyer1], // genelde hepsi aynı: tx'i buyer1 atıyor
          validUntils: [now + 86400],
          nativeMsgValue: 0, // sadece ERC20 olduğundan 0
          buyBatchTxCaller: buyer1, // tx gönderen signer
          expectSuccessWith: "ContentPurchased",
        });
        // Step 3: new refund window set to 1 day
        await NewTreasury.connect(backend).setRefundWindow(1 * 86400); // 1 gün
        // Step 4: fast forward 3 days
        await fastForwardTime({ days: 3 });
        // Step 5: instructor5 refunds the course by owner
        await refundCourseByOwnerHelper({
          courseOwner: person1.address,
          courseId: courseId1,
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
        // Step 1: instructor1 creates a generic course with [instructor1] array
        const courseId1 = await quickCreateACourse();
        // Step 2: buyer1 buys course for person1
        const buy_course = await buyCourseBatchHelper({
          courseIds: [courseId1],
          tokenAddresses: [MKT1.target],
          coursePrices: [ethers.parseEther("10")],
          courseReceivers: [person1.address],
          redeemers: [buyer1], // genelde hepsi aynı: tx'i buyer1 atıyor
          validUntils: [now + 86400],
          nativeMsgValue: 0, // sadece ERC20 olduğundan 0
          buyBatchTxCaller: buyer1, // tx gönderen signer
          expectSuccessWith: "ContentPurchased",
        });
        // Step 3: Use wrong signer for the refund voucher
        refundByOwnerVH = getVoucherHelpers({ signer: instructor2 }).refundByOwnerVH;
        // Step 4: Attempt refund with invalid signer
        const refund_course = await refundCourseByOwnerHelper({
          courseOwner: person1.address,
          courseId: courseId1,
          redeemer: buyer1,
          validUntil: now + 86400,
          expectRevertWith: "SignerIsNotBackend()",
        });
        // Expect: Reverts with "SignerIsNotBackend()"
      });

      it("should fail to refund (by owner+courseId) with invalid signature (SignatureIsInvalid)", async function () {
        // Step 1: instructor1 creates a generic course
        const courseId1 = await quickCreateACourse();
        // Step 2: buyer1 buys the course for person1 (sets courseOwnerToPayment)
        await buyCourseBatchHelper({
          courseIds: [courseId1],
          tokenAddresses: [MKT1.target],
          coursePrices: [ethers.parseEther("10")],
          courseReceivers: [person1.address],
          redeemers: [buyer1],
          validUntils: [now + 86400],
          nativeMsgValue: 0,
          buyBatchTxCaller: buyer1,
          expectSuccessWith: "ContentPurchased",
        });
        // Step 3: build a valid refundByOwner voucher, then corrupt its signature
        const good = await refundByOwnerVH.signVoucher({
          courseOwner: person1.address,
          courseId: courseId1,
          redeemer: buyer1.address, // must match msg.sender
          validUntil: now + 86400,
        });
        const bad = { ...good, signature: "0x12" }; // invalid length -> tryRecover err != NoError
        // Step 4: expect revert with SignatureIsInvalid
        await expect(NewTreasury.connect(buyer1).refundCourseByOwnerAndCourseId(bad)).to.be.revertedWithCustomError(
          NewTreasury,
          "SignatureIsInvalid()"
        );
      });

      it("should fail to refund with expired voucher", async function () {
        // Step 1: instructor1 creates a generic course with [instructor1] array
        const courseId1 = await quickCreateACourse();
        // Step 2: buyer1 buys course for person1
        const buy_course = await buyCourseBatchHelper({
          courseIds: [courseId1],
          tokenAddresses: [MKT1.target],
          coursePrices: [ethers.parseEther("10")],
          courseReceivers: [person1.address],
          redeemers: [buyer1], // genelde hepsi aynı: tx'i buyer1 atıyor
          validUntils: [now + 86400],
          nativeMsgValue: 0, // sadece ERC20 olduğundan 0
          buyBatchTxCaller: buyer1, // tx gönderen signer
          expectSuccessWith: "ContentPurchased",
        });
        // Step 3: Attempt refund with expired voucher
        const refund_course = await refundCourseByOwnerHelper({
          courseOwner: person1.address,
          courseId: courseId1,
          redeemer: buyer2,
          validUntil: now - 60, // expired
          expectRevertWith: "VoucherIsExpired()",
        });
        // Expect: Reverts with "VoucherIsExpired()"
      });

      it("should fail to refund by owner if msg.sender !== redeemer", async function () {
        // Step 1: instructor1 creates a generic course with [instructor1] array
        const courseId1 = await quickCreateACourse();
        // Step 2: buyer1 buys course for person1
        const buy_course = await buyCourseBatchHelper({
          courseIds: [courseId1],
          tokenAddresses: [MKT1.target],
          coursePrices: [ethers.parseEther("10")],
          courseReceivers: [person1.address],
          redeemers: [buyer1], // genelde hepsi aynı: tx'i buyer1 atıyor
          validUntils: [now + 86400],
          nativeMsgValue: 0, // sadece ERC20 olduğundan 0
          buyBatchTxCaller: buyer1, // tx gönderen signer
          expectSuccessWith: "ContentPurchased",
        });
        // Step 3: attempt refundByOwner with mismatched msg.sender and voucher.redeemer
        falseRedeemer = ethers.ZeroAddress;
        await refundCourseByOwnerHelper({
          courseOwner: person1.address,
          courseId: courseId1,
          redeemer: buyer1, // actual caller
          validUntil: now + 86400,
          expectRevertWith: "CallerIsNotVoucherRedeemer()",
        });
        // Expect: Reverts with "CallerIsNotVoucherRedeemer()"
      });

      it("should fail to refund twice for the same course", async function () {
        // Step 1: instructor1 creates a generic course with [instructor1] array
        const courseId1 = await quickCreateACourse();
        // Step 2: buyer1 buys course for person1
        const buy_course = await buyCourseBatchHelper({
          courseIds: [courseId1],
          tokenAddresses: [MKT1.target],
          coursePrices: [ethers.parseEther("10")],
          courseReceivers: [person1.address],
          redeemers: [buyer1], // genelde hepsi aynı: tx'i buyer1 atıyor
          validUntils: [now + 86400],
          nativeMsgValue: 0, // sadece ERC20 olduğundan 0
          buyBatchTxCaller: buyer1, // tx gönderen signer
          expectSuccessWith: "ContentPurchased",
        });
        // Step 3: First refund
        const refund1 = await refundCourseByOwnerHelper({
          courseOwner: person1.address,
          courseId: courseId1,
          redeemer: buyer1,
          validUntil: now + 86400,
          expectSuccessWith: "CourseRefunded",
        });
        // Step 4: Attempt second refund → should fail
        const refund2 = await refundCourseByOwnerHelper({
          courseOwner: person1.address,
          courseId: courseId1,
          redeemer: buyer1,
          validUntil: now + 86400,
          expectRevertWith: "PaymentNotFoundForOwnerAndCourse()",
        });
        // Expect: Reverts with "PaymentNotFoundForOwnerAndCourse()"
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
          expectRevertWith: "PaymentNotFoundForOwnerAndCourse()",
        });
        // Step 3: instructor1 creates a generic course with [instructor1] array to increase courseCounter
        const courseId1 = await quickCreateACourse();
        // Step 4: buyer the course (just to advance payment counters)
        const buy_course1 = await buyCourseBatchHelper({
          courseIds: [courseId1],
          tokenAddresses: [MKT1.target],
          coursePrices: [ethers.parseEther("10")],
          courseReceivers: [person1.address],
          redeemers: [buyer1], // genelde hepsi aynı: tx'i buyer1 atıyor
          validUntils: [now + 86400],
          nativeMsgValue: 0, // sadece ERC20 olduğundan 0
          buyBatchTxCaller: buyer1, // tx gönderen signer
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
          expectRevertWith: "PaymentNotFoundForOwnerAndCourse()",
        });
        // Expect: Reverts with "PaymentNotFoundForOwnerAndCourse()"
      });

      it("should fail to refund if paymentId is zero (before and after course purchase)", async function () {
        // Step 1: Try refunding with paymentId = 0 before any course exists
        await refundCourseByOwnerHelper({
          courseOwner: person1.address,
          courseId: 0n,
          redeemer: buyer1,
          validUntil: now + 86400,
          expectRevertWith: "PaymentNotFoundForOwnerAndCourse()",
        });
        // Step 2: instructor1 creates a generic course with [instructor1] array
        const courseId1 = await quickCreateACourse();
        // Step 3: buyer1 buys course
        const buy_course1 = await buyCourseBatchHelper({
          courseIds: [courseId1],
          tokenAddresses: [MKT1.target],
          coursePrices: [ethers.parseEther("10")],
          courseReceivers: [person1.address],
          redeemers: [buyer1], // genelde hepsi aynı: tx'i buyer1 atıyor
          validUntils: [now + 86400],
          nativeMsgValue: 0, // sadece ERC20 olduğundan 0
          buyBatchTxCaller: buyer1, // tx gönderen signer
          expectSuccessWith: "ContentPurchased",
        });
        // Step 4: Try refunding with paymentId = 0 again after purchase
        await refundCourseByOwnerHelper({
          courseOwner: person1.address,
          courseId: 0n,
          redeemer: buyer1,
          validUntil: now + 86400,
          expectRevertWith: "PaymentNotFoundForOwnerAndCourse()",
        });
        // Expect: Reverts with "PaymentNotFoundForOwnerAndCourse()-refund"
      });

      it("should fail to refund if refund window has passed", async function () {
        // Step 1: Read refundWindow from contract
        const refundWindow = await NewTreasury.refundWindow();
        // Step 2: instructor1 creates a generic course with [instructor1] array
        const courseId1 = await quickCreateACourse();
        // Step 3: Buyer1 buys the course for person1
        const buy_course1 = await buyCourseBatchHelper({
          courseIds: [courseId1],
          tokenAddresses: [MKT1.target],
          coursePrices: [ethers.parseEther("10")],
          courseReceivers: [person1.address],
          redeemers: [buyer1], // genelde hepsi aynı: tx'i buyer1 atıyor
          validUntils: [now + 86400],
          nativeMsgValue: 0, // sadece ERC20 olduğundan 0
          buyBatchTxCaller: buyer1, // tx gönderen signer
          expectSuccessWith: "ContentPurchased",
        });
        // Step 4: Fast forward time by refundWindow + 1 second
        const refundWindowInSec = Number(refundWindow);
        await fastForwardTime({ seconds: refundWindowInSec + 1 });
        // Step 5: Try to refund and expect failure
        await refundCourseByOwnerHelper({
          courseOwner: person1.address,
          courseId: courseId1,
          redeemer: buyer1,
          validUntil: now + 86400,
          expectRevertWith: "RefundWindowHasPassed()",
        });
        // Expect: Reverts with "RefundWindowHasPassed()"
      });

      it("should fail refund by owner if original refund window expired despite later refundWindow was extended", async function () {
        // Step 1: set refund window to a short duration (e.g. 1 day)
        await NewTreasury.connect(backend).setRefundWindow(1);
        // Step 2: instructor1 creates a generic course with [instructor1] array
        const courseId1 = await quickCreateACourse();
        // Step 3: buyer1 purchases course for person1
        const buy_course = await buyCourseBatchHelper({
          courseIds: [courseId1],
          tokenAddresses: [MKT1.target],
          coursePrices: [ethers.parseEther("10")],
          courseReceivers: [person1.address],
          redeemers: [buyer1], // genelde hepsi aynı: tx'i buyer1 atıyor
          validUntils: [now + 86400],
          nativeMsgValue: 0, // sadece ERC20 olduğundan 0
          buyBatchTxCaller: buyer1, // tx gönderen signer
          expectSuccessWith: "ContentPurchased",
        });
        // Step 4: extend refund window to 10 days (policy updated but shouldn't affect past purchases)
        await NewTreasury.connect(backend).setRefundWindow(10 * 86400);
        // Step 5: fast forward time by 3 days
        await fastForwardTime({ days: 3 });
        // Step 6: try to refund (original window was 1 day, now expired)
        await refundCourseByOwnerHelper({
          courseOwner: person1.address,
          courseId: courseId1,
          redeemer: buyer1,
          validUntil: now + 86400,
          expectRevertWith: "RefundWindowHasPassed()",
        });
        // Expectation: Refund fails because the refund window at the time of purchase already expired
      });

      it("should fail refund by owner if payment was already withdrawn", async function () {
        // Step 1: instructor1 creates a generic course with [instructor1] array
        const courseId1 = await quickCreateACourse();
        // Step 2: buyer1 purchases course for person1
        const buy = await buyCourseBatchHelper({
          courseIds: [courseId1],
          tokenAddresses: [MKT1.target],
          coursePrices: [ethers.parseEther("10")],
          courseReceivers: [person1.address],
          redeemers: [buyer1], // genelde hepsi aynı: tx'i buyer1 atıyor
          validUntils: [now + 86400],
          nativeMsgValue: 0, // sadece ERC20 olduğundan 0
          buyBatchTxCaller: buyer1, // tx gönderen signer
          expectSuccessWith: "ContentPurchased",
        });
        // Step 3: fast forward the refund window to allow withdrawal
        const refundWindowInDays = Number(await NewTreasury.refundWindow()) / 86400;
        await fastForwardTime({ days: refundWindowInDays + 1 });
        // Step 4: instructor withdraws the payment
        await withdrawCoursePaymentsHelper({
          courseId: courseId1,
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
          courseId: courseId1,
          redeemer: buyer1,
          validUntil: now + 86400,
          expectRevertWith: "PaymentIsAlreadyWithdrawn()",
        });
        // Expectation: Refund fails because funds were already withdrawn
      });

      it("should fail refund by owner when ERC20 token transfer to refunder fails", async function () {
        // Step 0: Deploy failTransfer contract and distribute tokens
        const { failNativeWallet, failMKT } = await deployFailTransferContracts();
        // Step 1: instructor1 creates a generic course with [instructor1] array
        const courseId1 = await quickCreateACourse();
        // Step 2: buyer1 buys course for person1
        const buy_course = await buyCourseBatchHelper({
          courseIds: [courseId1],
          tokenAddresses: [failMKT.target], // failMKT token
          coursePrices: [ethers.parseEther("10")],
          courseReceivers: [person1.address],
          redeemers: [buyer1], // genelde hepsi aynı: tx'i buyer1 atıyor
          validUntils: [now + 86400],
          nativeMsgValue: 0, // sadece ERC20 olduğundan 0
          buyBatchTxCaller: buyer1, // tx gönderen signer
          expectSuccessWith: "ContentPurchased",
        });
        // Step 4: block failMTK transfer of treasury address
        await failMKT.connect(backend).blockAddress(buyer1.address, true);
        // Step 4: Attempt refund with invalid signer
        const refund_course = await refundCourseByOwnerHelper({
          courseOwner: person1.address,
          courseId: courseId1,
          redeemer: buyer3,
          validUntil: now + 86400,
          expectRevertWith: "Recipient blocked",
        });
        // Expect: Reverts with "Recipient blocked"
      });

      it("should fail refund by owner when native token transfer to refunder fails", async function () {
        // Step 0: Deploy failTransfer contract and distribute tokens
        const { failNativeWallet, failMKT } = await deployFailTransferContracts();
        // Step 1: instructor1 creates a generic course with [instructor1] array
        const courseId1 = await quickCreateACourse();
        // Step 2: backend triggers failNativeWallets buyTrigger to buy a course with contract
        const nativePrice = ethers.parseEther("10");
        const voucher = await buyVH.signVoucher({
          courseId: courseId1,
          tokenAddress: ethers.ZeroAddress, // native token
          coursePrice: nativePrice,
          courseReceiver: person1.address,
          redeemer: failNativeWallet.target, // payer (msg.sender NewTreasury'ye bu kontrat olacak)
          validUntil: now + 86400,
        });
        const vouchers = [voucher]; // tek voucher'ı batch gibi kullan
        const expectedOutcome = await _prepareExpectedBuyBatchStates(
          vouchers,
          failNativeWallet.target, // buyBatchTxCaller
          true, // waitSuccess
          backend.address // executer
        );
        const currentPaymentCounter = await NewTreasury.paymentCounter();
        const expPaymentId = Number(currentPaymentCounter) + 1; // paymentId'yi hesapla
        // Step 3: trigger buy inside failNativeWallet
        const tx = await failNativeWallet
          .connect(backend)
          .triggerBuy(NewTreasury.target, vouchers, { value: nativePrice });
        await expect(tx)
          .to.emit(NewTreasury, "ContentPurchased")
          .withArgs(
            expPaymentId,
            voucher.courseId,
            voucher.courseReceiver,
            failNativeWallet.target,
            ethers.ZeroAddress,
            nativePrice
          );
        const receipt = await tx.wait();
        const effectiveGasPrice = receipt.effectiveGasPrice ?? receipt.gasPrice ?? 0n;
        const gasCost = receipt.gasUsed * effectiveGasPrice;
        // Step 4: check balances and expected states after buy
        await _expectBuyBatch(nativePrice, expectedOutcome, gasCost, failNativeWallet.target, true, backend.address);
        // Step 5: block native token receive of failNativeWallet
        await failNativeWallet.connect(backend).setRejectPayments(true);
        // Step 6: Try to refund the course expect fail
        const refund_course = await refundCourseByOwnerHelper({
          courseOwner: voucher.courseReceiver,
          courseId: voucher.courseId,
          redeemer: buyer3,
          validUntil: now + 86400,
          expectRevertWith: "NativeRefundFailed()",
        });
        // Expect: Reverts with "NativeRefundFailed()"
      });
      /////###End of Failure Cases###/////
    });
    /////###End of Refunds: byOwner and courseId###/////
  });

  // 6. Withdrawals
  describe("🏦💵 WITHDRAWALS", function () {
    describe("✅ Success Cases", function () {
      it("should allow instructor to withdraw payments for a subset of sales", async function () {
        // Step 1: instructor1 creates a generic course with [instructor1] array
        const courseId1 = await quickCreateACourse();
        // Step 2: 5 different sale occur for the course
        await buyCourseBatchHelper({
          courseIds: Array(5).fill(courseId1),
          tokenAddresses: [MKT1.target, MKT1.target, MKT1.target, MKT1.target, MKT1.target],
          coursePrices: [
            ethers.parseEther("5"),
            ethers.parseEther("10"),
            ethers.parseEther("15"),
            ethers.parseEther("20"),
            ethers.parseEther("25"),
          ],
          courseReceivers: [person1.address, person2.address, person3.address, person4.address, person5.address],
          redeemers: [backend, backend, backend, backend, backend], // genelde hepsi aynı: tx'i buyer1 atıyor
          validUntils: [now + 86400, now + 86400, now + 86400, now + 86400, now + 86400],
          nativeMsgValue: 0,
          buyBatchTxCaller: backend, // tx gönderen signer
          expectSuccessWith: "ContentPurchased",
        });
        // Step 3: Fast forward time after refund window
        const refundWindowInDays = Number(await NewTreasury.refundWindow()) / 86400;
        await fastForwardTime({ days: refundWindowInDays + 1 });
        // Step 4: Withdraw payments from sales 1 to 3
        const withdrawResult = await withdrawCoursePaymentsHelper({
          courseId: courseId1,
          fromIndex: 1,
          toIndex: 3,
          redeemer: instructor1,
          validUntil: now + 86400,
          expectSuccessWith: "CoursePaymentsWithdrawn",
          expectations: [PES, PES, PES],
        });
        // Expect: "CoursePaymentsWithdrawn" with expected success states
      });

      it("should allow instructor to withdraw from mixed-token sales (ERC20 and native)", async function () {
        // Step 1: instructor1 creates a generic course with [instructor1] array
        const courseId1 = await quickCreateACourse();
        // Step 2: make 6 sales, 2 with MTK1, 2 with MTK2, 2 with native
        await buyCourseBatchHelper({
          courseIds: Array(6).fill(courseId1), // 6 sales for the same course
          tokenAddresses: [MKT1.target, MKT1.target, MKT2.target, MKT2.target, ethers.ZeroAddress, ethers.ZeroAddress],
          coursePrices: [
            ethers.parseEther("5"),
            ethers.parseEther("10"),
            ethers.parseEther("15"),
            ethers.parseEther("20"),
            ethers.parseEther("25"),
            ethers.parseEther("30"),
          ],
          courseReceivers: [
            person1.address,
            person2.address,
            person3.address,
            person4.address,
            person5.address,
            buyer1.address,
          ],
          redeemers: [backend, backend, backend, backend, backend, backend], // genelde hepsi aynı: tx'i buyer1 atıyor
          validUntils: [now + 86400, now + 86400, now + 86400, now + 86400, now + 86400, now + 86400],
          nativeMsgValue: ethers.parseEther("55"), // sadece ERC20 olduğundan 0
          buyBatchTxCaller: backend, // tx gönderen signer
          expectSuccessWith: "ContentPurchased",
        });
        // Step 3: Fast forward time after refund window
        const refundWindowInDays = Number(await NewTreasury.refundWindow()) / 86400;
        await fastForwardTime({ days: refundWindowInDays + 1 });
        // Step 4: Withdraw payments for all 6 sales
        await withdrawCoursePaymentsHelper({
          courseId: courseId1,
          fromIndex: 1,
          toIndex: 6,
          redeemer: instructor1,
          validUntil: now + 86400,
          expectSuccessWith: "CoursePaymentsWithdrawn",
          expectations: [PES, PES, PES, PES, PES, PES],
        });
        // Expect: "CoursePaymentsWithdrawn" with expected success states
      });

      it("should allow instructor to withdraw if pre-sale refund window expired even post-sale refund window extended", async function () {
        // Step 1: set initial refundWindow to 1 days
        await NewTreasury.connect(backend).setRefundWindow(1 * 86400);
        // Step 2: instructor1 creates a generic course with [instructor1] array
        const courseId1 = await quickCreateACourse();
        // Step 3: buyer buys course
        await buyCourseBatchHelper({
          courseIds: [courseId1],
          tokenAddresses: [MKT1.target],
          coursePrices: [ethers.parseEther("10")],
          courseReceivers: [person1.address],
          redeemers: [buyer1], // genelde hepsi aynı: tx'i buyer1 atıyor
          validUntils: [now + 86400],
          nativeMsgValue: 0, // sadece ERC20 olduğundan 0
          buyBatchTxCaller: buyer1, // tx gönderen signer
          expectSuccessWith: "ContentPurchased",
        });
        // Step 4: shorten refundWindow to 10 day
        await NewTreasury.connect(backend).setRefundWindow(10 * 86400);
        // Step 5: fast forward 3 days (beyond original the old 1 day window)
        await fastForwardTime({ days: 3 });
        // Step 6: withdraw should succeed
        await withdrawCoursePaymentsHelper({
          courseId: courseId1,
          fromIndex: 1,
          toIndex: 1,
          redeemer: instructor1,
          validUntil: now + 86400,
          expectSuccessWith: "CoursePaymentsWithdrawn",
          expectations: [PES],
        });
      });

      it("should allow instructor to withdraw after governance contract is replaced with wallet", async function () {
        // Step 1: instructor1 creates a generic course with [instructor1] array
        const courseId1 = await quickCreateACourse();
        // Step 2: make 3 sales, MTK1, MTK2, native
        await buyCourseBatchHelper({
          courseIds: Array(3).fill(courseId1), // 3 sales for the same course
          tokenAddresses: [MKT1.target, MKT2.target, ethers.ZeroAddress],
          coursePrices: [ethers.parseEther("5"), ethers.parseEther("10"), ethers.parseEther("15")],
          courseReceivers: [person1.address, person2.address, person3.address],
          redeemers: [buyer1, buyer1, buyer1], // genelde hepsi aynı: tx'i buyer1 atıyor
          validUntils: [now + 86400, now + 86400, now + 86400],
          nativeMsgValue: ethers.parseEther("15"), // sadece ERC20 olduğundan 0
          buyBatchTxCaller: buyer1, // tx gönderen signer
          expectSuccessWith: "ContentPurchased",
        });
        // Step 3: Fast forward time after refund window
        const refundWindowInDays = Number(await NewTreasury.refundWindow()) / 86400;
        await fastForwardTime({ days: refundWindowInDays + 1 });
        // Step 4: Replace governance contract with a wallet
        await NewTreasury.connect(foundation).setGovernanceAddress(person5.address);
        // Step 5: Withdraw payments for all 3 sales
        await withdrawCoursePaymentsHelper({
          courseId: courseId1,
          fromIndex: 1,
          toIndex: 3,
          redeemer: instructor1,
          validUntil: now + 86400,
          expectSuccessWith: "CoursePaymentsWithdrawn",
          expectations: [PES, PES, PES],
        });
        // Expect: "CoursePaymentsWithdrawn" with expected success states
      });

      it("should allow instructor to withdraw payments when governance cuts zero", async function () {
        // Step 0: reduce cuts to zero
        const [utFoundCut, utGoverCut, atFoundCut, atGoverCut] = await Promise.all([
          NewTreasury.utFoundCut(),
          NewTreasury.utGoverCut(),
          NewTreasury.atFoundCut(),
          NewTreasury.atGoverCut(),
        ]);
        if (utGoverCut !== 0n || atGoverCut !== 0n) {
          const zeroAtGoverCut = 0; // %1 governance cut (any token)
          const zeroUtGoverCut = 0;
          // Handle zero cut case
          await expect(
            NewTreasury.connect(backend).setCourseCuts(atFoundCut, zeroAtGoverCut, utFoundCut, zeroUtGoverCut)
          ).to.emit(NewTreasury, "CourseCutsUpdated");
        }
        // Step 1: instructor1 creates a generic course with [instructor1] array
        const courseId1 = await quickCreateACourse();
        // Step 2: make 6 sales, 2 with MTK1, 2 with MTK2, 2 with native
        await buyCourseBatchHelper({
          courseIds: Array(6).fill(courseId1), // 6 sales for the same course
          tokenAddresses: [MKT1.target, MKT1.target, MKT2.target, MKT2.target, ethers.ZeroAddress, ethers.ZeroAddress],
          coursePrices: [
            ethers.parseEther("5"),
            ethers.parseEther("10"),
            ethers.parseEther("15"),
            ethers.parseEther("20"),
            ethers.parseEther("25"),
            ethers.parseEther("30"),
          ],
          courseReceivers: [
            person1.address,
            person2.address,
            person3.address,
            person4.address,
            person5.address,
            buyer1.address,
          ],
          redeemers: [backend, backend, backend, backend, backend, backend], // genelde hepsi aynı: tx'i buyer1 atıyor
          validUntils: [now + 86400, now + 86400, now + 86400, now + 86400, now + 86400, now + 86400],
          nativeMsgValue: ethers.parseEther("55"), // sadece ERC20 olduğundan 0
          buyBatchTxCaller: backend, // tx gönderen signer
          expectSuccessWith: "ContentPurchased",
        });
        // Step 3: Fast forward time after refund window
        const refundWindowInDays = Number(await NewTreasury.refundWindow()) / 86400;
        await fastForwardTime({ days: refundWindowInDays + 1 });
        // Step 4: Withdraw payments for all 6 sales
        await withdrawCoursePaymentsHelper({
          courseId: courseId1,
          fromIndex: 1,
          toIndex: 6,
          redeemer: instructor1,
          validUntil: now + 86400,
          expectSuccessWith: "CoursePaymentsWithdrawn",
          expectations: [PES, PES, PES, PES, PES, PES],
        });
        // Expect: "CoursePaymentsWithdrawn" with expected success states
      });

      it("should allow instructor to withdraw payments when foundation cuts zero", async function () {
        // Step 0: reduce cuts to zero
        const [utFoundCut, utGoverCut, atFoundCut, atGoverCut] = await Promise.all([
          NewTreasury.utFoundCut(),
          NewTreasury.utGoverCut(),
          NewTreasury.atFoundCut(),
          NewTreasury.atGoverCut(),
        ]);
        if (utFoundCut !== 0n || atFoundCut !== 0n) {
          const zeroAtFoundCut = 0;
          const zeroUtFoundCut = 0;
          // Handle zero cut case
          await expect(
            NewTreasury.connect(backend).setCourseCuts(zeroAtFoundCut, atGoverCut, zeroUtFoundCut, utGoverCut)
          ).to.emit(NewTreasury, "CourseCutsUpdated");
        }
        // Step 1: instructor1 creates a generic course with [instructor1] array
        const courseId1 = await quickCreateACourse();
        // Step 2: make 6 sales, 2 with MTK1, 2 with MTK2, 2 with native
        await buyCourseBatchHelper({
          courseIds: Array(6).fill(courseId1), // 6 sales for the same course
          tokenAddresses: [MKT1.target, MKT1.target, MKT2.target, MKT2.target, ethers.ZeroAddress, ethers.ZeroAddress],
          coursePrices: [
            ethers.parseEther("5"),
            ethers.parseEther("10"),
            ethers.parseEther("15"),
            ethers.parseEther("20"),
            ethers.parseEther("25"),
            ethers.parseEther("30"),
          ],
          courseReceivers: [
            person1.address,
            person2.address,
            person3.address,
            person4.address,
            person5.address,
            buyer1.address,
          ],
          redeemers: [backend, backend, backend, backend, backend, backend], // genelde hepsi aynı: tx'i buyer1 atıyor
          validUntils: [now + 86400, now + 86400, now + 86400, now + 86400, now + 86400, now + 86400],
          nativeMsgValue: ethers.parseEther("55"), // sadece ERC20 olduğundan 0
          buyBatchTxCaller: backend, // tx gönderen signer
          expectSuccessWith: "ContentPurchased",
        });
        // Step 3: Fast forward time after refund window
        const refundWindowInDays = Number(await NewTreasury.refundWindow()) / 86400;
        await fastForwardTime({ days: refundWindowInDays + 1 });
        // Step 4: Withdraw payments for all 6 sales
        await withdrawCoursePaymentsHelper({
          courseId: courseId1,
          fromIndex: 1,
          toIndex: 6,
          redeemer: instructor1,
          validUntil: now + 86400,
          expectSuccessWith: "CoursePaymentsWithdrawn",
          expectations: [PES, PES, PES, PES, PES, PES],
        });
        // Expect: "CoursePaymentsWithdrawn" with expected success states
      });

      it("should allow instructor to withdraw payments when foundation and governance cuts zero", async function () {
        // Step 0: reduce cuts to zero
        const [utFoundCut, utGoverCut, atFoundCut, atGoverCut] = await Promise.all([
          NewTreasury.utFoundCut(),
          NewTreasury.utGoverCut(),
          NewTreasury.atFoundCut(),
          NewTreasury.atGoverCut(),
        ]);
        if (utFoundCut !== 0n || atFoundCut !== 0n || utGoverCut !== 0n || atGoverCut !== 0n) {
          const zeroAtFoundCut = 0;
          const zeroAtGoverCut = 0;
          const zeroUtFoundCut = 0;
          const zeroUtGoverCut = 0;
          // Handle zero cut case
          await expect(
            NewTreasury.connect(backend).setCourseCuts(zeroAtFoundCut, zeroAtGoverCut, zeroUtFoundCut, zeroUtGoverCut)
          ).to.emit(NewTreasury, "CourseCutsUpdated");
        }
        // Step 1: instructor1 creates a generic course with [instructor1] array
        const courseId1 = await quickCreateACourse();
        // Step 2: make 6 sales, 2 with MTK1, 2 with MTK2, 2 with native
        await buyCourseBatchHelper({
          courseIds: Array(6).fill(courseId1), // 6 sales for the same course
          tokenAddresses: [MKT1.target, MKT1.target, MKT2.target, MKT2.target, ethers.ZeroAddress, ethers.ZeroAddress],
          coursePrices: [
            ethers.parseEther("5"),
            ethers.parseEther("10"),
            ethers.parseEther("15"),
            ethers.parseEther("20"),
            ethers.parseEther("25"),
            ethers.parseEther("30"),
          ],
          courseReceivers: [
            person1.address,
            person2.address,
            person3.address,
            person4.address,
            person5.address,
            buyer1.address,
          ],
          redeemers: [backend, backend, backend, backend, backend, backend], // genelde hepsi aynı: tx'i buyer1 atıyor
          validUntils: [now + 86400, now + 86400, now + 86400, now + 86400, now + 86400, now + 86400],
          nativeMsgValue: ethers.parseEther("55"), // sadece ERC20 olduğundan 0
          buyBatchTxCaller: backend, // tx gönderen signer
          expectSuccessWith: "ContentPurchased",
        });
        // Step 3: Fast forward time after refund window
        const refundWindowInDays = Number(await NewTreasury.refundWindow()) / 86400;
        await fastForwardTime({ days: refundWindowInDays + 1 });
        // Step 4: Withdraw payments for all 6 sales
        await withdrawCoursePaymentsHelper({
          courseId: courseId1,
          fromIndex: 1,
          toIndex: 6,
          redeemer: instructor1,
          validUntil: now + 86400,
          expectSuccessWith: "CoursePaymentsWithdrawn",
          expectations: [PES, PES, PES, PES, PES, PES],
        });
        // Expect: "CoursePaymentsWithdrawn" with expected success states
      });

      /* --DİSABLED, due to its imposible to have 100% cuts
      it("should allow instructor to withdraw payments when total cuts 100 percent", async function () {
        // Step 0: reduce cuts to zero
        const [utFoundCut, utGoverCut, atFoundCut, atGoverCut] = await Promise.all([
          NewTreasury.utFoundCut(),
          NewTreasury.utGoverCut(),
          NewTreasury.atFoundCut(),
          NewTreasury.atGoverCut(),
        ]);
        if (utFoundCut !== 50000n || atFoundCut !== 50000n || utGoverCut !== 50000n || atGoverCut !== 50000n) {
          const newAtFoundCut = 50000;
          const newAtGoverCut = 50000;
          const newUtFoundCut = 50000;
          const newUtGoverCut = 50000;
          // Handle new cut case
          await expect(
            NewTreasury.connect(backend).setCourseCuts(newAtFoundCut, newAtGoverCut, newUtFoundCut, newUtGoverCut)
          ).to.emit(NewTreasury, "CourseCutsUpdated");
        }
        // Step 1: instructor1 creates a generic course with [instructor1] array
        const courseId1 = await quickCreateACourse();
        // Step 2: make 6 sales, 2 with MTK1, 2 with MTK2, 2 with native
        await buyCourseBatchHelper({
          courseIds: Array(6).fill(courseId1), // 6 sales for the same course
          tokenAddresses: [MKT1.target, MKT1.target, MKT2.target, MKT2.target, ethers.ZeroAddress, ethers.ZeroAddress],
          coursePrices: [
            ethers.parseEther("5"),
            ethers.parseEther("10"),
            ethers.parseEther("15"),
            ethers.parseEther("20"),
            ethers.parseEther("25"),
            ethers.parseEther("30"),
          ],
          courseReceivers: [
            person1.address,
            person2.address,
            person3.address,
            person4.address,
            person5.address,
            buyer1.address,
          ],
          redeemers: [backend, backend, backend, backend, backend, backend], // genelde hepsi aynı: tx'i buyer1 atıyor
          validUntils: [now + 86400, now + 86400, now + 86400, now + 86400, now + 86400, now + 86400],
          nativeMsgValue: ethers.parseEther("55"), // sadece ERC20 olduğundan 0
          buyBatchTxCaller: backend, // tx gönderen signer
          expectSuccessWith: "ContentPurchased",
        });
        // Step 3: Fast forward time after refund window
        const refundWindowInDays = Number(await NewTreasury.refundWindow()) / 86400;
        await fastForwardTime({ days: refundWindowInDays + 1 });
        // Step 4: Withdraw payments for all 6 sales
        await withdrawCoursePaymentsHelper({
          courseId: courseId1,
          fromIndex: 1,
          toIndex: 6,
          redeemer: instructor1,
          validUntil: now + 86400,
          expectSuccessWith: "CoursePaymentsWithdrawn",
          expectations: [PES, PES, PES, PES, PES, PES],
        });
        // Expect: "CoursePaymentsWithdrawn" with expected success states
      });
      */
      /////###End of Success Cases###/////
    });

    describe("🔁 Partial Success Cases", function () {
      it("should skip withdraw when purchase is within pre-sale refund window despite post-sale refundWindow shortened", async function () {
        // Step 1: set initial refundWindow to 10 days
        await NewTreasury.connect(backend).setRefundWindow(10 * 86400);
        // Step 2: instructor1 creates a generic course with [instructor1] array
        const courseId1 = await quickCreateACourse();
        // Step 3: buyer buys course
        await buyCourseBatchHelper({
          courseIds: [courseId1],
          tokenAddresses: [MKT1.target],
          coursePrices: [ethers.parseEther("10")],
          courseReceivers: [person1.address],
          redeemers: [buyer1], // genelde hepsi aynı: tx'i buyer1 atıyor
          validUntils: [now + 86400],
          nativeMsgValue: 0, // sadece ERC20 olduğundan 0
          buyBatchTxCaller: buyer1, // tx gönderen signer
          expectSuccessWith: "ContentPurchased",
        });
        // Step 4: shorten refundWindow to 1 day (but purchase was made with 10-day window)
        await NewTreasury.connect(backend).setRefundWindow(1 * 86400);
        // Step 5: fast forward 3 days (refund window according to new policy is passed, but not the old one)
        await fastForwardTime({ days: 3 });
        // Step 6: withdraw attempt should emit event, but no tokens processed
        await withdrawCoursePaymentsHelper({
          courseId: courseId1,
          fromIndex: 1,
          toIndex: 1,
          redeemer: instructor1,
          validUntil: now + 86400,
          expectSuccessWith: "CoursePaymentsWithdrawn", // emit edilir
          expectations: [PI], // işlem yapılmaz
        });
        // Expect: "CoursePaymentsWithdrawn" with expected success states
      });

      it("should skip withdraw for refunded-withdrawed sales in complex multi-withdrawer, mixed-token, refund, and re-withdraw scenario", async function () {
        // Step 1: increase max batch size to 12
        await NewTreasury.connect(backend).setMaxBatchWithdrawSize(12);
        // Step 2: instructor1 & instructor2 authorized
        const courseA = await createCourseBatchHelper({
          uries: ["https://example.com/withdraw-complex-case"],
          withdrawersArrays: [[instructor1.address, instructor2.address]],
          redeemers: [instructor1.address],
          validUntils: [now + 86400],
          createBatchTxCaller: instructor1,
          expectSuccessWith: "CourseCreated",
        });
        // Step 3: make 9 mixed-token sales
        const tokenTypes = [
          MKT1.target,
          ethers.ZeroAddress,
          MKT2.target, // 1-2-3
          MKT1.target,
          ethers.ZeroAddress,
          MKT2.target, // 4-5-6
          MKT1.target,
          ethers.ZeroAddress,
          MKT2.target, // 7-8-9
        ];

        const tokenTypesOrd = [
          MKT1.target,
          MKT1.target,
          MKT1.target,
          ethers.ZeroAddress,
          ethers.ZeroAddress,
          ethers.ZeroAddress,
          MKT2.target, // 1-2-3
          MKT2.target, // 4-5-6
          MKT2.target, // 7-8-9
        ];

        const prices = ["5", "6", "7", "8", "9", "10", "11", "12", "13"];
        const receivers = [person1, person2, person3, person4, person5, buyer1, buyer2, buyer3, buyer4];
        const paymentIds = await buyCourseBatchHelper({
          courseIds: Array(9).fill(courseA.courseIds[0]),
          tokenAddresses: tokenTypes,
          coursePrices: prices.map((p) => ethers.parseEther(p)),
          courseReceivers: receivers.map((r) => r.address),
          redeemers: Array(9).fill(backend), // genelde hepsi aynı: tx'i backend atıyor
          validUntils: Array(9).fill(now + 86400),
          nativeMsgValue: ethers.parseEther("27"),
          buyBatchTxCaller: backend, // tx gönderen signer
          expectSuccessWith: "ContentPurchased",
        });
        // Step 4: refund sales 2, 5, 8
        const refundTargets = [6, 7, 8]; // zero-based index
        for (const i of refundTargets) {
          await refundCourseHelper({
            paymentId: paymentIds[i],
            redeemer: backend,
            validUntil: now + 86400,
            expectSuccessWith: "CourseRefunded",
          });
        }
        // Step 5: fast forward past refund window
        const refundWindowDays = Number(await NewTreasury.refundWindow()) / 86400;
        await fastForwardTime({ days: refundWindowDays + 1 });
        // Step 6: instructor1 withdraws sales 1, 2, 3 (index 1 to 3) — sale 2 was refunded, so skipped
        await withdrawCoursePaymentsHelper({
          courseId: courseA.courseIds[0],
          fromIndex: 1,
          toIndex: 3,
          redeemer: instructor1,
          validUntil: now + 86400,
          expectSuccessWith: "CoursePaymentsWithdrawn",
          expectations: [PES, PES, PES],
        });
        // Step 7: add 3 more sales (10–12)
        const tokenTypesNew = [MKT1.target, ethers.ZeroAddress, MKT2.target];
        const pricesNew = ["20", "21", "22"];
        const receiversNew = [buyer3, buyer4, buyer5];
        const secondSale = await buyCourseBatchHelper({
          courseIds: Array(3).fill(courseA.courseIds[0]),
          tokenAddresses: tokenTypesNew,
          coursePrices: pricesNew.map((p) => ethers.parseEther(p)),
          courseReceivers: receiversNew.map((r) => r.address),
          redeemers: Array(3).fill(backend), // genelde hepsi aynı: tx'i backend atıyor
          validUntils: Array(3).fill(now + 86400),
          nativeMsgValue: ethers.parseEther("21"), // sadece ERC20 olduğundan 0
          buyBatchTxCaller: backend, // tx gönderen signer
          expectSuccessWith: "ContentPurchased",
        });
        for (let i = 0; i < 3; i++) {
          paymentIds.push(secondSale[i]); // store paymentId[9], [10], [11]
        }
        // Step 8: refund paymentId[10] (sale 12)
        await refundCourseHelper({
          paymentId: paymentIds[10], //zero-based index
          redeemer: backend,
          validUntil: now + 86400,
          expectSuccessWith: "CourseRefunded",
        });
        // Step 9: instructor2 withdraws all 1–12
        await withdrawCoursePaymentsHelper({
          courseId: courseA.courseIds[0],
          fromIndex: 1,
          toIndex: 12,
          redeemer: instructor2,
          validUntil: now + 86400,
          expectSuccessWith: "CoursePaymentsWithdrawn",
          expectations: [WE, WE, WE, PES, PES, PES, RE, RE, RE, PI, RI, PI],
        });
        // Step Extra 1: buy course single course with batch helper
        await buyCourseBatchHelper({
          courseIds: [courseA.courseIds[0]],
          tokenAddresses: [MKT1.target],
          coursePrices: [ethers.parseEther("10")],
          courseReceivers: [backend.address],
          redeemers: [backend],
          validUntils: [now + 86400],
          nativeMsgValue: 0,
          buyBatchTxCaller: backend,
          expectSuccessWith: "ContentPurchased",
        });
        // Step Extra 2: fast forward refund window and withdraw last sale
        await fastForwardTime({ days: refundWindowDays + 1 });
        await withdrawCoursePaymentsHelper({
          courseId: courseA.courseIds[0],
          fromIndex: 13,
          toIndex: 13,
          redeemer: instructor2,
          validUntil: now + 86400,
          expectSuccessWith: "CoursePaymentsWithdrawn",
          expectations: [PES],
        });
      });

      it("should skip withdraw when ERC20 transfer to instructor fails", async () => {
        // Step 0: Deploy failTransfer contract and distribute tokens
        const { failNativeWallet, failMKT } = await deployFailTransferContracts();
        // Step 1: instructor1 creates a generic course with [instructor1, failNativeWallet] array
        const courseIdA = await quickCreateACourse({ w: [instructor1.address, failNativeWallet.target] });
        // Step 2: make 4 mixed-token sales, MTK1, native, failMKT, MTK2
        const tokenTypes = [MKT1.target, ethers.ZeroAddress, failMKT.target, MKT2.target];
        const prices = ["10", "20", "30", "40"];
        const receivers = [person1, person2, person3, person4];
        const expectSuccessWith = "ContentPurchased";
        const expectations = [PES, PES, PEF, PES];
        await buyCourseBatchHelper({
          courseIds: Array(4).fill(courseIdA),
          tokenAddresses: tokenTypes,
          coursePrices: prices.map((p) => ethers.parseEther(p)),
          courseReceivers: receivers.map((r) => r.address),
          redeemers: Array(4).fill(backend), // genelde hepsi aynı: tx'i backend atıyor
          validUntils: Array(4).fill(now + 86400),
          nativeMsgValue: ethers.parseEther("20"), // sadece ERC20 olduğundan 0
          buyBatchTxCaller: backend, // tx gönderen signer
          expectSuccessWith: expectSuccessWith,
        });
        // Step 3: fast forward past refund window
        const refundWindowDays = Number(await NewTreasury.refundWindow()) / 86400;
        await fastForwardTime({ days: refundWindowDays + 1 });
        // Step 4: block failMTK transfer of instructor1
        await failMKT.connect(backend).blockAddress(instructor1.address, true);
        // Step 5: Create a voucher for instructor1 to withdraw payments from sales 1 to 3 and get before token stats
        const voucher = await withdrawVH.signVoucher({
          courseId: courseIdA,
          fromIndex: 1,
          toIndex: 4,
          redeemer: instructor1.address,
          validUntil: now + 86400,
        });
        const beforeTokenStats = await _prepareExpectedWithdrawTokenState(voucher, expectations);
        // Step 6: Attempt to withdraw payments from sales 1 to 3
        tx = await NewTreasury.connect(instructor1).withdrawCoursePayments(voucher);
        await expect(tx)
          .to.emit(NewTreasury, "CoursePaymentsWithdrawn")
          .withArgs(voucher.courseId, voucher.fromIndex, voucher.toIndex, voucher.redeemer, 3, 1);
        const receipt = await tx.wait();
        const effectiveGasPrice = receipt.effectiveGasPrice ?? receipt.gasPrice ?? 0n;
        const gasCost = receipt.gasUsed * effectiveGasPrice;
        // Step 8: Validate token stats after withdrawal
        await _expectWithdraw(voucher, beforeTokenStats, gasCost, expectations, true);
      });

      it("should skip withdraw when native transfer to instructor fails", async () => {
        // Step 0: Deploy failTransfer contract and distribute tokens
        const { failNativeWallet, failMKT } = await deployFailTransferContracts();
        // Step 1: instructor1 creates a generic course with [instructor1, failNativeWallet] array
        const courseIdA = await quickCreateACourse({ w: [instructor1.address, failNativeWallet.target] });
        // Step 2: make 4 mixed-token sales, MTK1, native, failMKT, MTK2
        const tokenTypes = [MKT1.target, ethers.ZeroAddress, failMKT.target, MKT2.target];
        const prices = ["10", "20", "30", "40"];
        const receivers = [person1, person2, person3, person4];
        const expectSuccessWith = "ContentPurchased";
        const expectations = [PES, PEF, PES, PES];
        await buyCourseBatchHelper({
          courseIds: Array(4).fill(courseIdA),
          tokenAddresses: tokenTypes,
          coursePrices: prices.map((p) => ethers.parseEther(p)),
          courseReceivers: receivers.map((r) => r.address),
          redeemers: Array(4).fill(backend), // genelde hepsi aynı: tx'i backend atıyor
          validUntils: Array(4).fill(now + 86400),
          nativeMsgValue: ethers.parseEther("20"), // sadece ERC20 olduğundan 0
          buyBatchTxCaller: backend, // tx gönderen signer
          expectSuccessWith: expectSuccessWith,
        });
        // Step 3: fast forward past refund window
        const refundWindowDays = Number(await NewTreasury.refundWindow()) / 86400;
        await fastForwardTime({ days: refundWindowDays + 1 });
        // Step 4: block native token receive of failNativeWallet
        await failNativeWallet.connect(backend).setRejectPayments(true);
        // Step 5: validate before-withdraw balances
        const preTxNativeBalanceOfBackend = await ethers.provider.getBalance(backend.address);
        // Step 6: sign voucher for failNativeWallet, and get before token stats
        const voucher = await withdrawVH.signVoucher({
          courseId: courseIdA,
          fromIndex: 1,
          toIndex: 4,
          redeemer: failNativeWallet.target,
          validUntil: now + 86400,
        });
        const beforeTokenStats = await _prepareExpectedWithdrawTokenState(voucher, expectations);

        // Step 7: trigger withdraw from inside failNativeWallet
        const tx = await failNativeWallet.connect(backend).triggerWithdraw(NewTreasury.target, voucher);
        // Step 8: expect emit
        await expect(tx)
          .to.emit(NewTreasury, "CoursePaymentsWithdrawn")
          .withArgs(voucher.courseId, voucher.fromIndex, voucher.toIndex, failNativeWallet.target, 3, 1);
        // Step 9: compute gas cost
        const receipt = await tx.wait();
        const effectiveGasPrice = receipt.effectiveGasPrice ?? receipt.gasPrice ?? 0n;
        const gasCost = receipt.gasUsed * effectiveGasPrice;
        // Step 6: expect balances
        await _expectWithdraw(voucher, beforeTokenStats, 0n, expectations, true);
        const postTxNativeBalanceOfBackend = await ethers.provider.getBalance(backend.address);
        expect(postTxNativeBalanceOfBackend).to.equal(preTxNativeBalanceOfBackend - gasCost);
      });

      it("should skip withdraw when ERC20 transfer to foundation fails", async () => {
        // Step 0: Deploy failTransfer contract and distribute tokens
        const { failNativeWallet, failMKT } = await deployFailTransferContracts();
        // Step 1: instructor1 creates a generic course with [instructor1, failNativeWallet] array
        const courseIdA = await quickCreateACourse({ w: [instructor1.address, failNativeWallet.target] });
        // Step 2: make 4 mixed-token sales, MTK1, native, failMKT, MTK2
        const tokenTypes = [MKT1.target, ethers.ZeroAddress, failMKT.target, MKT2.target];
        const prices = ["10", "20", "30", "40"];
        const receivers = [person1, person2, person3, person4];
        const expectSuccessWith = "ContentPurchased";
        const expectations = [PES, PES, PEF, PES];
        await buyCourseBatchHelper({
          courseIds: Array(4).fill(courseIdA),
          tokenAddresses: tokenTypes,
          coursePrices: prices.map((p) => ethers.parseEther(p)),
          courseReceivers: receivers.map((r) => r.address),
          redeemers: Array(4).fill(backend), // genelde hepsi aynı: tx'i backend atıyor
          validUntils: Array(4).fill(now + 86400),
          nativeMsgValue: ethers.parseEther("20"), // sadece ERC20 olduğundan 0
          buyBatchTxCaller: backend, // tx gönderen signer
          expectSuccessWith: expectSuccessWith,
        });
        // Step 3: fast forward past refund window
        const refundWindowDays = Number(await NewTreasury.refundWindow()) / 86400;
        await fastForwardTime({ days: refundWindowDays + 1 });
        // Step 4: block failMKT transfer to foundation (failNativeWallet)
        await failMKT.connect(backend).blockAddress(foundation.address, true);
        // Step 5: sign withdraw voucher, and get before token stats
        const voucher = await withdrawVH.signVoucher({
          courseId: courseIdA,
          fromIndex: 1,
          toIndex: 4,
          redeemer: instructor1.address,
          validUntil: now + 86400,
        });
        const beforeTokenStats = await _prepareExpectedWithdrawTokenState(voucher, expectations);
        // Step 6: perform withdraw
        const tx = await NewTreasury.connect(instructor1).withdrawCoursePayments(voucher);
        // Step 7: expect CoursePaymentsWithdrawn with skipped = 1
        await expect(tx)
          .to.emit(NewTreasury, "CoursePaymentsWithdrawn")
          .withArgs(voucher.courseId, voucher.fromIndex, voucher.toIndex, voucher.redeemer, 3, 1);
        // Step 8: validate state after withdraw
        const receipt = await tx.wait();
        const effectiveGasPrice = receipt.effectiveGasPrice ?? receipt.gasPrice ?? 0n;
        const gasCost = receipt.gasUsed * effectiveGasPrice;
        await _expectWithdraw(voucher, beforeTokenStats, gasCost, expectations, true);
      });

      it("should skip withdraw when native transfer to foundation fails", async () => {
        // Step 0: Deploy failTransfer contract and distribute tokens
        const { failNativeWallet, failMKT } = await deployFailTransferContracts();
        // Step 1: instructor1 creates a generic course with [instructor1, failNativeWallet] array
        const courseIdA = await quickCreateACourse({ w: [instructor1.address, failNativeWallet.target] });
        // Step 2: make 4 mixed-token sales, MTK1, native, failMKT, MTK2
        const tokenTypes = [MKT1.target, ethers.ZeroAddress, failMKT.target, MKT2.target];
        const prices = ["10", "20", "30", "40"];
        const receivers = [person1, person2, person3, person4];
        const expectSuccessWith = "ContentPurchased";
        const expectations = [PES, PEF, PES, PES];
        await buyCourseBatchHelper({
          courseIds: Array(4).fill(courseIdA),
          tokenAddresses: tokenTypes,
          coursePrices: prices.map((p) => ethers.parseEther(p)),
          courseReceivers: receivers.map((r) => r.address),
          redeemers: Array(4).fill(backend), // genelde hepsi aynı: tx'i backend atıyor
          validUntils: Array(4).fill(now + 86400),
          nativeMsgValue: ethers.parseEther("20"), // sadece ERC20 olduğundan 0
          buyBatchTxCaller: backend, // tx gönderen signer
          expectSuccessWith: expectSuccessWith,
        });
        // Step 3: fast forward past refund window
        const refundWindowDays = Number(await NewTreasury.refundWindow()) / 86400;
        await fastForwardTime({ days: refundWindowDays + 1 });
        // Step 4: Set failNativeWallet as foundation
        await NewTreasury.connect(foundation).setFoundationAddress(failNativeWallet.target);
        // Step 5: block native receive on foundation (failNativeWallet)
        await failNativeWallet.connect(backend).setRejectPayments(true);
        // Step 6: sign withdraw voucher, and get before token stats
        const voucher = await withdrawVH.signVoucher({
          courseId: courseIdA,
          fromIndex: 1,
          toIndex: 4,
          redeemer: instructor1.address,
          validUntil: now + 86400,
        });
        const beforeTokenStats = await _prepareExpectedWithdrawTokenState(voucher, expectations);
        // Step 7: perform withdraw
        const tx = await NewTreasury.connect(instructor1).withdrawCoursePayments(voucher);
        // Step 8: expect CoursePaymentsWithdrawn with skipped = 1
        await expect(tx)
          .to.emit(NewTreasury, "CoursePaymentsWithdrawn")
          .withArgs(voucher.courseId, voucher.fromIndex, voucher.toIndex, voucher.redeemer, 3, 1);
        // Step 9: validate state after withdraw
        const receipt = await tx.wait();
        const effectiveGasPrice = receipt.effectiveGasPrice ?? receipt.gasPrice ?? 0n;
        const gasCost = receipt.gasUsed * effectiveGasPrice;
        await _expectWithdraw(voucher, beforeTokenStats, gasCost, expectations, true);
      });

      it("should skip withdraw when ERC20 transfer to governance contract fails", async () => {
        // Step 0: Deploy failTransfer contract and distribute tokens
        const { failNativeWallet, failMKT } = await deployFailTransferContracts();
        // Step 1: instructor1 creates a generic course with [instructor1, failNativeWallet] array
        const courseIdA = await quickCreateACourse({ w: [instructor1.address, failNativeWallet.target] });
        // Step 2: make 4 mixed-token sales, MTK1, native, failMKT, MTK2
        const tokenTypes = [MKT1.target, ethers.ZeroAddress, failMKT.target, MKT2.target];
        const prices = ["10", "20", "30", "40"];
        const receivers = [person1, person2, person3, person4];
        const expectSuccessWith = "ContentPurchased";
        const expectations = [PES, PES, PEF, PES];
        await buyCourseBatchHelper({
          courseIds: Array(4).fill(courseIdA),
          tokenAddresses: tokenTypes,
          coursePrices: prices.map((p) => ethers.parseEther(p)),
          courseReceivers: receivers.map((r) => r.address),
          redeemers: Array(4).fill(backend), // genelde hepsi aynı: tx'i backend atıyor
          validUntils: Array(4).fill(now + 86400),
          nativeMsgValue: ethers.parseEther("20"), // sadece ERC20 olduğundan 0
          buyBatchTxCaller: backend, // tx gönderen signer
          expectSuccessWith: expectSuccessWith,
        });
        // Step 3: fast forward past refund window
        const refundWindowDays = Number(await NewTreasury.refundWindow()) / 86400;
        await fastForwardTime({ days: refundWindowDays + 1 });
        // Step 4: block failMKT transfer to governance (failNativeWallet)
        await failMKT.connect(backend).blockAddress(NewGovDummy.target, true);
        // Step 5: sign withdraw voucher, and get before token stats
        const voucher = await withdrawVH.signVoucher({
          courseId: courseIdA,
          fromIndex: 1,
          toIndex: 4,
          redeemer: instructor1.address,
          validUntil: now + 86400,
        });
        const beforeTokenStats = await _prepareExpectedWithdrawTokenState(voucher, expectations);
        // Step 6: perform withdraw
        const tx = await NewTreasury.connect(instructor1).withdrawCoursePayments(voucher);
        // Step 7: expect CoursePaymentsWithdrawn with skipped = 1
        await expect(tx)
          .to.emit(NewTreasury, "CoursePaymentsWithdrawn")
          .withArgs(voucher.courseId, voucher.fromIndex, voucher.toIndex, voucher.redeemer, 3, 1);
        // Step 9: validate state after withdraw
        const receipt = await tx.wait();
        const effectiveGasPrice = receipt.effectiveGasPrice ?? receipt.gasPrice ?? 0n;
        const gasCost = receipt.gasUsed * effectiveGasPrice;
        await _expectWithdraw(voucher, beforeTokenStats, gasCost, expectations, true);
      });

      it("should skip withdraw when governance is replaced with wallet that fails ERC20 transfers", async () => {
        // Step 0: Deploy failTransfer contract and distribute tokens
        const { failNativeWallet, failMKT } = await deployFailTransferContracts();
        // Step 1: instructor1 creates a generic course with [instructor1, failNativeWallet] array
        const courseIdA = await quickCreateACourse({ w: [instructor1.address, failNativeWallet.target] });
        // Step 2: make 4 mixed-token sales, MTK1, native, failMKT, MTK2
        const tokenTypes = [MKT1.target, ethers.ZeroAddress, failMKT.target, MKT2.target];
        const prices = ["10", "20", "30", "40"];
        const receivers = [person1, person2, person3, person4];
        const expectSuccessWith = "ContentPurchased";
        const expectations = [PES, PES, PEF, PES];
        await buyCourseBatchHelper({
          courseIds: Array(4).fill(courseIdA),
          tokenAddresses: tokenTypes,
          coursePrices: prices.map((p) => ethers.parseEther(p)),
          courseReceivers: receivers.map((r) => r.address),
          redeemers: Array(4).fill(backend), // genelde hepsi aynı: tx'i backend atıyor
          validUntils: Array(4).fill(now + 86400),
          nativeMsgValue: ethers.parseEther("20"), // sadece ERC20 olduğundan 0
          buyBatchTxCaller: backend, // tx gönderen signer
          expectSuccessWith: expectSuccessWith,
        });
        // Step 3: fast forward past refund window
        const refundWindowDays = Number(await NewTreasury.refundWindow()) / 86400;
        await fastForwardTime({ days: refundWindowDays + 1 });
        // Step 4: replace governance with a wallet that fails on erc20 transfer
        await NewTreasury.connect(foundation).setGovernanceAddress(person5.address);
        await failMKT.connect(backend).blockAddress(person5.address, true);
        // Step 5: sign withdraw voucher, and get before token stats
        const voucher = await withdrawVH.signVoucher({
          courseId: courseIdA,
          fromIndex: 1,
          toIndex: 4,
          redeemer: instructor1.address,
          validUntil: now + 86400,
        });
        const beforeTokenStats = await _prepareExpectedWithdrawTokenState(voucher, expectations);
        // Step 6: perform withdraw
        const tx = await NewTreasury.connect(instructor1).withdrawCoursePayments(voucher);
        // Step 7: expect CoursePaymentsWithdrawn with skipped = 1
        await expect(tx)
          .to.emit(NewTreasury, "CoursePaymentsWithdrawn")
          .withArgs(voucher.courseId, voucher.fromIndex, voucher.toIndex, voucher.redeemer, 3, 1);
        // Step 8: validate state after withdraw
        const receipt = await tx.wait();
        const effectiveGasPrice = receipt.effectiveGasPrice ?? receipt.gasPrice ?? 0n;
        const gasCost = receipt.gasUsed * effectiveGasPrice;
        await _expectWithdraw(voucher, beforeTokenStats, gasCost, expectations, true);
      });

      it("should skip withdraw when governance contract rejects receive native token", async () => {
        // Step 0: Deploy failTransfer contract and distribute tokens
        const { failNativeWallet, failMKT } = await deployFailTransferContracts();
        // Step 1: instructor1 creates a generic course with [instructor1, failNativeWallet] array
        const courseIdA = await quickCreateACourse({ w: [instructor1.address, failNativeWallet.target] });
        // Step 2: make 4 mixed-token sales, MTK1, native, failMKT, MTK2
        const tokenTypes = [MKT1.target, ethers.ZeroAddress, failMKT.target, MKT2.target];
        const prices = ["10", "20", "30", "40"];
        const receivers = [person1, person2, person3, person4];
        const expectSuccessWith = "ContentPurchased";
        const expectations = [PES, PEF, PES, PES];
        await buyCourseBatchHelper({
          courseIds: Array(4).fill(courseIdA),
          tokenAddresses: tokenTypes,
          coursePrices: prices.map((p) => ethers.parseEther(p)),
          courseReceivers: receivers.map((r) => r.address),
          redeemers: Array(4).fill(backend), // genelde hepsi aynı: tx'i backend atıyor
          validUntils: Array(4).fill(now + 86400),
          nativeMsgValue: ethers.parseEther("20"), // sadece ERC20 olduğundan 0
          buyBatchTxCaller: backend, // tx gönderen signer
          expectSuccessWith: expectSuccessWith,
        });
        // Step 3: fast forward past refund window
        const refundWindowDays = Number(await NewTreasury.refundWindow()) / 86400;
        await fastForwardTime({ days: refundWindowDays + 1 });
        // Step 4: block native token receive on governance (failNativeWallet)
        await NewGovDummy.connect(backend).setTokenBan(ethers.ZeroAddress, true);
        // Step 6: sign withdraw voucher, and get before token stats
        const voucher = await withdrawVH.signVoucher({
          courseId: courseIdA,
          fromIndex: 1,
          toIndex: 4,
          redeemer: instructor1.address,
          validUntil: now + 86400,
        });
        const beforeTokenStats = await _prepareExpectedWithdrawTokenState(voucher, expectations);
        // Step 6: perform withdraw
        const tx = await NewTreasury.connect(instructor1).withdrawCoursePayments(voucher);
        // Step 7: expect CoursePaymentsWithdrawn with skipped = 1
        await expect(tx)
          .to.emit(NewTreasury, "CoursePaymentsWithdrawn")
          .withArgs(voucher.courseId, voucher.fromIndex, voucher.toIndex, voucher.redeemer, 3, 1);
        // Step 8: validate state after withdraw
        const receipt = await tx.wait();
        const effectiveGasPrice = receipt.effectiveGasPrice ?? receipt.gasPrice ?? 0n;
        const gasCost = receipt.gasUsed * effectiveGasPrice;
        await _expectWithdraw(voucher, beforeTokenStats, gasCost, expectations, true);
      });

      it("should skip withdraw when governance contract refuses to record ERC20", async () => {
        // Step 0: Deploy failTransfer contract and distribute tokens
        const { failNativeWallet, failMKT } = await deployFailTransferContracts();
        // Step 1: instructor1 creates a generic course with [instructor1, failNativeWallet] array
        const courseIdA = await quickCreateACourse({ w: [instructor1.address, failNativeWallet.target] });
        // Step 2: make 4 mixed-token sales, MTK1, native, failMKT, MTK2
        const tokenTypes = [MKT1.target, ethers.ZeroAddress, failMKT.target, MKT2.target];
        const prices = ["10", "20", "30", "40"];
        const receivers = [person1, person2, person3, person4];
        const expectSuccessWith = "ContentPurchased";
        const expectations = [PES, PES, PEF, PES];
        await buyCourseBatchHelper({
          courseIds: Array(4).fill(courseIdA),
          tokenAddresses: tokenTypes,
          coursePrices: prices.map((p) => ethers.parseEther(p)),
          courseReceivers: receivers.map((r) => r.address),
          redeemers: Array(4).fill(backend), // genelde hepsi aynı: tx'i backend atıyor
          validUntils: Array(4).fill(now + 86400),
          nativeMsgValue: ethers.parseEther("20"), // sadece ERC20 olduğundan 0
          buyBatchTxCaller: backend, // tx gönderen signer
          expectSuccessWith: expectSuccessWith,
        });
        // Step 3: fast forward past refund window
        const refundWindowDays = Number(await NewTreasury.refundWindow()) / 86400;
        await fastForwardTime({ days: refundWindowDays + 1 });
        // Step 4: reject recording of failMKT transfer
        await NewGovDummy.connect(backend).setTokenBan(failMKT.target, true);
        // Step 5: sign withdraw voucher, and get before token stats
        const voucher = await withdrawVH.signVoucher({
          courseId: courseIdA,
          fromIndex: 1,
          toIndex: 4,
          redeemer: instructor1.address,
          validUntil: now + 86400,
        });
        const beforeTokenStats = await _prepareExpectedWithdrawTokenState(voucher, expectations);
        // Step 6: perform withdraw
        const tx = await NewTreasury.connect(instructor1).withdrawCoursePayments(voucher);
        // Step 7: expect CoursePaymentsWithdrawn with skipped = 1
        await expect(tx)
          .to.emit(NewTreasury, "CoursePaymentsWithdrawn")
          .withArgs(voucher.courseId, voucher.fromIndex, voucher.toIndex, voucher.redeemer, 3, 1);
        // Step 8: validate state after withdraw
        const receipt = await tx.wait();
        const effectiveGasPrice = receipt.effectiveGasPrice ?? receipt.gasPrice ?? 0n;
        const gasCost = receipt.gasUsed * effectiveGasPrice;
        await _expectWithdraw(voucher, beforeTokenStats, gasCost, expectations, true);
      });

      it("should skip withdraw when governance contract lacks addGovernanceFunds function", async function () {
        // Step 0: Deploy failTransfer contract and distribute tokens
        const { failNativeWallet, failMKT } = await deployFailTransferContracts();
        // Step 1: instructor1 creates a generic course with [instructor1, failNativeWallet] array
        const courseIdA = await quickCreateACourse({ w: [instructor1.address, failNativeWallet.target] });
        // Step 2: make 4 mixed-token sales, MTK1, native, failMKT, MTK2
        const tokenTypes = [MKT1.target, ethers.ZeroAddress, failMKT.target, MKT2.target];
        const prices = ["10", "20", "30", "40"];
        const receivers = [person1, person2, person3, person4];
        const expectSuccessWith = "ContentPurchased";
        const expectations = [PEF, PEF, PEF, PEF];
        await buyCourseBatchHelper({
          courseIds: Array(4).fill(courseIdA),
          tokenAddresses: tokenTypes,
          coursePrices: prices.map((p) => ethers.parseEther(p)),
          courseReceivers: receivers.map((r) => r.address),
          redeemers: Array(4).fill(backend), // genelde hepsi aynı: tx'i backend atıyor
          validUntils: Array(4).fill(now + 86400),
          nativeMsgValue: ethers.parseEther("20"), // sadece ERC20 olduğundan 0
          buyBatchTxCaller: backend, // tx gönderen signer
          expectSuccessWith: expectSuccessWith,
        });
        // Step 3: fast forward past refund window
        const refundWindowDays = Number(await NewTreasury.refundWindow()) / 86400;
        await fastForwardTime({ days: refundWindowDays + 1 });
        // Step 4: Replace governance contract with an other contract that doesn't have addGovernanceFunds function
        await NewTreasury.connect(foundation).setGovernanceAddress(failNativeWallet.target);
        // Step 5: sign withdraw voucher and get before token stats
        const voucher = await withdrawVH.signVoucher({
          courseId: courseIdA,
          fromIndex: 1,
          toIndex: 4,
          redeemer: instructor1.address,
          validUntil: now + 86400,
        });
        const beforeTokenStats = await _prepareExpectedWithdrawTokenState(voucher, expectations);
        // Step 6: perform withdraw
        const tx = await NewTreasury.connect(instructor1).withdrawCoursePayments(voucher);
        // Step 7: expect CoursePaymentsWithdrawn with skipped = 1
        await expect(tx)
          .to.emit(NewTreasury, "CoursePaymentsWithdrawn")
          .withArgs(voucher.courseId, voucher.fromIndex, voucher.toIndex, voucher.redeemer, 0, 4);
        // Step 8: validate state after withdraw
        const receipt = await tx.wait();
        const effectiveGasPrice = receipt.effectiveGasPrice ?? receipt.gasPrice ?? 0n;
        const gasCost = receipt.gasUsed * effectiveGasPrice;
        await _expectWithdraw(voucher, beforeTokenStats, gasCost, expectations, true);
      });
      /////###End of Partial Success Cases###/////
    });

    describe("❌ Failure Cases", function () {
      it("should fail to withdraw with invalid signer", async function () {
        // Step 1: instructor1 creates a generic course with [instructor1] array
        const courseId1 = await quickCreateACourse();
        // Step 2: buyer1 purchases course for person1
        await buyCourseBatchHelper({
          courseIds: [courseId1],
          tokenAddresses: [MKT1.target],
          coursePrices: [ethers.parseEther("10")],
          courseReceivers: [person1.address],
          redeemers: [buyer1],
          validUntils: [now + 86400],
          nativeMsgValue: 0,
          buyBatchTxCaller: buyer1,
          expectSuccessWith: "ContentPurchased",
        });
        // Step 3: fast forward to after refund window
        const refundWindowInDays = Number(await NewTreasury.refundWindow()) / 86400;
        await fastForwardTime({ days: refundWindowInDays + 1 });
        // Step 4: switch to an invalid signer
        withdrawVH = getVoucherHelpers({ signer: instructor2 }).withdrawVH;
        // Step 5: attempt withdraw with wrong signer
        const withdrawResult = await withdrawCoursePaymentsHelper({
          courseId: courseId1,
          fromIndex: 1,
          toIndex: 1,
          redeemer: instructor1,
          validUntil: now + 86400,
          expectRevertWith: "SignerIsNotBackend()",
          expectations: [PES],
        });
        // Expect: Reverts with "SignerIsNotBackend()"
      });

      it("should fail to withdraw with invalid signature (SignatureIsInvalid)", async function () {
        // Step 1: instructor1 creates a generic course
        const courseId1 = await quickCreateACourse();
        // Step 2: buyer1 purchases the course for person1
        await buyCourseBatchHelper({
          courseIds: [courseId1],
          tokenAddresses: [MKT1.target],
          coursePrices: [ethers.parseEther("10")],
          courseReceivers: [person1.address],
          redeemers: [buyer1],
          validUntils: [now + 86400],
          nativeMsgValue: 0,
          buyBatchTxCaller: buyer1,
          expectSuccessWith: "ContentPurchased",
        });
        // Step 3: fast forward after refund window
        const refundWindowDays = Number(await NewTreasury.refundWindow()) / 86400;
        await fastForwardTime({ days: refundWindowDays + 1 });
        // Step 4: build a valid withdraw voucher, then corrupt its signature
        const good = await withdrawVH.signVoucher({
          courseId: courseId1,
          fromIndex: 1,
          toIndex: 1,
          redeemer: instructor1.address, // must match msg.sender
          validUntil: now + 86400,
        });
        const bad = { ...good, signature: "0x12" }; // invalid length -> tryRecover err != NoError
        // Step 5: expect revert with SignatureIsInvalid
        await expect(NewTreasury.connect(instructor1).withdrawCoursePayments(bad)).to.be.revertedWithCustomError(
          NewTreasury,
          "SignatureIsInvalid()"
        );
      });

      it("should fail to withdraw with expired voucher", async function () {
        // Step 1: instructor1 creates a generic course with [instructor1] array
        const courseId1 = await quickCreateACourse();
        // Step 2: buyer1 purchases course
        await buyCourseBatchHelper({
          courseIds: [courseId1],
          tokenAddresses: [MKT1.target],
          coursePrices: [ethers.parseEther("10")],
          courseReceivers: [person1.address],
          redeemers: [buyer1],
          validUntils: [now + 86400],
          nativeMsgValue: 0,
          buyBatchTxCaller: buyer1,
          expectSuccessWith: "ContentPurchased",
        });
        // Step 3: fast forward time to pass refund window
        const refundWindowInDays = Number(await NewTreasury.refundWindow()) / 86400;
        await fastForwardTime({ days: refundWindowInDays + 1 });
        // Step 4: expired voucher
        const withdrawResult = await withdrawCoursePaymentsHelper({
          courseId: courseId1,
          fromIndex: 1,
          toIndex: 1,
          redeemer: instructor1,
          validUntil: now - 60, // expired
          expectRevertWith: "VoucherIsExpired()",
          expectations: [PES],
        });
        // Expect: Reverts with "VoucherIsExpired()" with expected fail states
      });

      it("should fail to withdraw when msg.sender is not redeemer", async function () {
        // Step 1: instructor1 creates a generic course with [instructor1] array
        const courseId1 = await quickCreateACourse();
        // Step 2: buyer1 purchases course
        await buyCourseBatchHelper({
          courseIds: [courseId1],
          tokenAddresses: [MKT1.target],
          coursePrices: [ethers.parseEther("10")],
          courseReceivers: [person1.address],
          redeemers: [buyer1],
          validUntils: [now + 86400],
          nativeMsgValue: 0,
          buyBatchTxCaller: buyer1,
          expectSuccessWith: "ContentPurchased",
        });
        // Step 3: fast forward to after refund window
        const refundWindowInDays = Number(await NewTreasury.refundWindow()) / 86400;
        await fastForwardTime({ days: refundWindowInDays + 1 });
        // Step 4: set up voucher with mismatched redeemer
        falseRedeemer = ethers.ZeroAddress;
        // Step 5: try to withdraw with wrong redeemer inside voucher
        await withdrawCoursePaymentsHelper({
          courseId: courseId1,
          fromIndex: 1,
          toIndex: 1,
          redeemer: instructor1, // actual msg.sender
          validUntil: now + 86400,
          expectRevertWith: "CallerIsNotVoucherRedeemer()",
          expectations: [PES],
        });
        // Expect: reverts with "CallerIsNotVoucherRedeemer()"
      });

      it("should fail to withdraw with invalid courseId that is zero", async function () {
        // Step 1: Try withdraw without any course created for non-existing courseId = 0 expect fail
        const withdrawResult1 = await withdrawCoursePaymentsHelper({
          courseId: 0,
          fromIndex: 1,
          toIndex: 1,
          redeemer: instructor1,
          validUntil: now + 86400,
          expectRevertWith: "CourseIdIsInvalid()",
          expectations: [PES],
        });
        // Step 2: instructor1 creates a generic course with [instructor1] array to increase courseCounter
        const courseId1 = await quickCreateACourse();
        // Step 3: Try withdraw without any course created for non-existing courseId = 0 expect fail
        const withdrawResult2 = await withdrawCoursePaymentsHelper({
          courseId: 0,
          fromIndex: 1,
          toIndex: 1,
          redeemer: instructor1,
          validUntil: now + 86400,
          expectRevertWith: "CourseIdIsInvalid()",
          expectations: [PES],
        });
        // Expect: Reverts with "CourseIdIsInvalid()" in both cases
      });

      it("should fail to withdraw with invalid courseId that is greater than courseCounter", async function () {
        // Step 1: Use a courseId greater than current courseCounter
        const invalidCourseId1 = Number(await NewTreasury.courseCounter()) + 1;
        // Step 2: Try withdraw with invalid courseId
        const withdrawResult1 = await withdrawCoursePaymentsHelper({
          courseId: invalidCourseId1,
          fromIndex: 1,
          toIndex: 1,
          redeemer: instructor1,
          validUntil: now + 86400,
          expectRevertWith: "CourseIdIsInvalid()",
          expectations: [PES],
        });
        // Step 3: instructor1 creates a generic course with [instructor1] array to increase courseCounter
        const courseId1 = await quickCreateACourse();
        // Step 4: Use a courseId greater than current courseCounter
        const invalidCourseId2 = Number(await NewTreasury.courseCounter()) + 1;
        // Step 5: Try withdraw with invalid courseId
        const withdrawResult = await withdrawCoursePaymentsHelper({
          courseId: invalidCourseId2,
          fromIndex: 1,
          toIndex: 1,
          redeemer: instructor1,
          validUntil: now + 86400,
          expectRevertWith: "CourseIdIsInvalid()",
          expectations: [PES],
        });
        // Expect: Reverts with "CourseIdIsInvalid()" in both cases
      });

      it("should fail to withdraw when invalid index range (0, from > to, to > saleCount)", async function () {
        // Step 1: instructor1 creates a generic course with [instructor1] array
        const courseId1 = await quickCreateACourse();
        // Step 2: 5 different valid sales occur for the course
        const receivers = [person1, person2, person3, person4, person5];
        await buyCourseBatchHelper({
          courseIds: Array(5).fill(courseId1),
          tokenAddresses: Array(5).fill(MKT1.target),
          coursePrices: Array(5).fill(ethers.parseEther("10")),
          courseReceivers: receivers.map((r) => r.address),
          redeemers: Array(5).fill(backend), // genelde hepsi aynı: tx'i backend atıyor
          validUntils: Array(5).fill(now + 86400),
          nativeMsgValue: 0,
          buyBatchTxCaller: backend, // tx gönderen signer
          expectSuccessWith: "ContentPurchased",
        });
        // Step 3: fromIndex = 0
        await withdrawCoursePaymentsHelper({
          courseId: courseId1,
          fromIndex: 0,
          toIndex: 1,
          redeemer: instructor1,
          validUntil: now + 86400,
          expectRevertWith: "WithdrawIndexRangeIsInvalid()",
          expectations: [PES],
        });
        // Step 4: fromIndex > toIndex
        await withdrawCoursePaymentsHelper({
          courseId: courseId1,
          fromIndex: 3,
          toIndex: 2,
          redeemer: instructor1,
          validUntil: now + 86400,
          expectRevertWith: "WithdrawIndexRangeIsInvalid()",
          expectations: [PES],
        });
        // Step 5: toIndex > saleCounterPerCourse[courseId] (5 satış oldu, toIndex = 6)
        const invalidEnd = Number(await NewTreasury.saleCounterPerCourse(courseId1)) + 1;
        await withdrawCoursePaymentsHelper({
          courseId: courseId1,
          fromIndex: 4,
          toIndex: invalidEnd, //its 6, only five sales occured: "1-2-3-4-5"
          redeemer: instructor1,
          validUntil: now + 86400,
          expectRevertWith: "WithdrawIndexRangeIsInvalid()",
          expectations: [PES, PES, PES], // len doesn't matter here, skipped in helper
        });
        // Expect: Reverts with "WithdrawIndexRangeIsInvalid()" in all cases
      });

      it("should fail to withdraw when batch size exceeds maxBatchWithdrawSize", async function () {
        // Step 1: instructor1 creates a generic course with [instructor1] array
        const courseId1 = await quickCreateACourse();
        // Step 2: get maxBatchWithdrawSize
        const maxBatch = Number(await NewTreasury.maxBatchWithdrawSize());
        const numSales = maxBatch + 1; // one more than max allowed batch size
        // Step 3: increase maxBatchBuySize so it allows the desired number of purchases
        await NewTreasury.connect(backend).setMaxBatchBuySize(numSales);
        // Step 4: make sales more than max allowed batch size of withdraw
        const receivers = Array.from({ length: numSales }, () => ethers.Wallet.createRandom());
        await buyCourseBatchHelper({
          courseIds: Array(numSales).fill(courseId1),
          tokenAddresses: Array(numSales).fill(MKT1.target),
          coursePrices: Array(numSales).fill(ethers.parseEther("10")),
          courseReceivers: receivers.map((r) => r.address),
          redeemers: Array(numSales).fill(backend), // genelde hepsi aynı: tx'i backend atıyor
          validUntils: Array(numSales).fill(now + 86400),
          nativeMsgValue: 0,
          buyBatchTxCaller: backend, // tx gönderen signer
          expectSuccessWith: "ContentPurchased",
        });
        // Step 5: fast forward time after refund window
        const refundWindowInDays = Number(await NewTreasury.refundWindow()) / 86400;
        await fastForwardTime({ days: refundWindowInDays + 1 });
        // Step 6: attempt withdraw with a batch size exceeding the limit
        const fromIndex = 1; // first sale also minimum allowed index
        const toIndex = numSales; // bigger than maxBatchWithdrawSize also its last sale index
        const expectations = Array(toIndex - fromIndex + 1).fill(PES);
        const withdrawResult = await withdrawCoursePaymentsHelper({
          courseId: courseId1,
          fromIndex,
          toIndex,
          redeemer: instructor1,
          validUntil: now + 86400,
          expectRevertWith: "WithdrawBatchSizeExceedsLimit()",
          expectations,
        });
        // Expect: Reverts with "WithdrawBatchSizeExceedsLimit()"
      });

      it("should fail to withdraw when redeemer is not an authorized withdrawer", async function () {
        // Step 1: instructor1 creates a generic course with [instructor1] array
        const courseId1 = await quickCreateACourse();
        // Step 2: buyer1 purchases course
        await buyCourseBatchHelper({
          courseIds: [courseId1],
          tokenAddresses: [MKT1.target],
          coursePrices: [ethers.parseEther("10")],
          courseReceivers: [person1.address],
          redeemers: [buyer1],
          validUntils: [now + 86400],
          nativeMsgValue: 0,
          buyBatchTxCaller: buyer1,
          expectSuccessWith: "ContentPurchased",
        });
        // Step 3: fast forward time to pass refund window
        const refundWindowInDays = Number(await NewTreasury.refundWindow()) / 86400;
        await fastForwardTime({ days: refundWindowInDays + 1 });
        // Step 4: try withdraw with unauthorized redeemer (backend not in withdrawers list)
        const withdrawResult1 = await withdrawCoursePaymentsHelper({
          courseId: courseId1,
          fromIndex: 1,
          toIndex: 1,
          redeemer: backend,
          validUntil: now + 86400,
          expectRevertWith: "CallerIsNotAuthorizedWithdrawer()",
          expectations: [PES],
        });
        // Step 5: try withdraw with unauthorized redeemer (instructor2 not in withdrawers list)
        const withdrawResult2 = await withdrawCoursePaymentsHelper({
          courseId: courseId1,
          fromIndex: 1,
          toIndex: 1,
          redeemer: instructor2,
          validUntil: now + 86400,
          expectRevertWith: "CallerIsNotAuthorizedWithdrawer()",
          expectations: [PES],
        });
        // Expect: Reverts with "CallerIsNotAuthorizedWithdrawer()" in both cases
      });

      it("should fail to call attemptSingleWithdrawOrRevert externally by anyone except treasury contract", async function () {
        // Step 1: instructor1 creates a generic course with [instructor1] array
        const courseId1 = await quickCreateACourse();
        // Step 2: buyer purchases course
        const buy_course1 = await buyCourseBatchHelper({
          courseIds: [courseId1],
          tokenAddresses: [MKT1.target],
          coursePrices: [ethers.parseEther("10")],
          courseReceivers: [person1.address],
          redeemers: [buyer1],
          validUntils: [now + 86400],
          nativeMsgValue: 0,
          buyBatchTxCaller: buyer1, // tx gönderen signer
          expectSuccessWith: "ContentPurchased",
        });
        // Step 3: fast forward beyond refund window
        const refundWindowInDays = Number(await NewTreasury.refundWindow()) / 86400;
        await fastForwardTime({ days: refundWindowInDays + 1 });
        // Step 4: test direct call reverts from all actors
        const paymentId = buy_course1[0];
        const actors = [instructor1, backend, foundation];
        for (const actor of actors) {
          await expect(
            NewTreasury.connect(actor).attemptSingleWithdrawOrRevert(paymentId, actor.address)
          ).to.be.revertedWithCustomError(NewTreasury, "CallerIsNotThisContract()");
        }
        // Expect: Reverts with "CallerIsNotThisContract()" for all actors
      });

      it("should fail to call previewWithdrawStatus with invalid courseId or index range", async () => {
        // Step 1: instructor1 creates a generic course with [instructor1] array
        const courseId1 = await quickCreateACourse();
        // Step 2: make 3 sales
        await buyCourseBatchHelper({
          courseIds: Array(3).fill(courseId1),
          tokenAddresses: [MKT1.target, MKT1.target, MKT1.target],
          coursePrices: [ethers.parseEther("10"), ethers.parseEther("10"), ethers.parseEther("10")],
          courseReceivers: [person1.address, person2.address, person3.address],
          redeemers: [buyer1, buyer1, buyer1],
          validUntils: [now + 86400, now + 86400, now + 86400],
          nativeMsgValue: 0,
          buyBatchTxCaller: buyer1, // tx gönderen signer
          expectSuccessWith: "ContentPurchased",
        });
        // Step 3: invalid courseId = 0
        await expect(NewTreasury.connect(instructor1).previewWithdrawStatus(0, 1, 1)).to.be.revertedWithCustomError(
          NewTreasury,
          "CourseIdIsInvalid()"
        );
        // Step 4: invalid courseId = courseCounter + 1
        const invalidId = Number(await NewTreasury.courseCounter()) + 1;
        await expect(
          NewTreasury.connect(instructor1).previewWithdrawStatus(invalidId, 1, 1)
        ).to.be.revertedWithCustomError(NewTreasury, "CourseIdIsInvalid()");
        // Step 5: invalid fromIndex = 0
        await expect(
          NewTreasury.connect(instructor1).previewWithdrawStatus(courseId1, 0, 1)
        ).to.be.revertedWithCustomError(NewTreasury, "WithdrawIndexRangeIsInvalid()");
        // Step 6: fromIndex > toIndex
        await expect(
          NewTreasury.connect(instructor1).previewWithdrawStatus(courseId1, 3, 2)
        ).to.be.revertedWithCustomError(NewTreasury, "WithdrawIndexRangeIsInvalid()");
        // Step 7: toIndex > saleCounter
        const saleCount = await NewTreasury.saleCounterPerCourse(courseId1);
        await expect(
          NewTreasury.connect(instructor1).previewWithdrawStatus(courseId1, 1, Number(saleCount) + 1)
        ).to.be.revertedWithCustomError(NewTreasury, "WithdrawIndexRangeIsInvalid()");
      });
      /////###End of Failure Cases###/////
    });
    /////###End of Withdrawals###/////
  });

  // 7. Rescue Surplus
  describe("🛟🛟 RESCUE SURPLUS", function () {
    describe("✅ Success Cases", function () {
      it("should rescue stray native&erc20 when no locked funds", async function () {
        // Step 0: Try to rescue surplus
        await expect(NewTreasury.connect(buyer2).rescueSurplus(ethers.ZeroAddress));
        expect(await NewTreasury.locked(ethers.ZeroAddress)).to.equal(0);
        await expect(NewTreasury.connect(buyer3).rescueSurplus(MKT2.target));
        expect(await NewTreasury.locked(MKT2.target)).to.equal(0);
        // Step 1: Zero state variables, and be sure there is no surplus in contract
        const nativeSurplus = ethers.parseEther("1.2345");
        const ercSurplus = ethers.parseEther("7");
        const [foundNativeBalAt0, foundErcBalAt0] = await Promise.all([
          ethers.provider.getBalance(foundation.address),
          MKT2.balanceOf(foundation.address),
        ]);
        expect(await NewTreasury.getSurplusBalance(ethers.ZeroAddress)).to.equal(0);
        expect(await NewTreasury.getSurplusBalance(MKT2.target)).to.equal(0);
        // Step 2: Send Native&MTK2 surplus to contract, and check it
        await buyer1.sendTransaction({ to: NewTreasury.target, value: nativeSurplus });
        await MKT2.connect(buyer1).transfer(NewTreasury.target, ercSurplus);
        expect(await NewTreasury.getSurplusBalance(ethers.ZeroAddress)).to.equal(nativeSurplus);
        expect(await NewTreasury.getSurplusBalance(MKT2.target)).to.equal(ercSurplus);
        // Step 3: Native rescue and verify the surplus zeroed out
        await expect(NewTreasury.connect(buyer2).rescueSurplus(ethers.ZeroAddress))
          .to.emit(NewTreasury, "SurplusRescued")
          .withArgs(ethers.ZeroAddress, foundation.address, nativeSurplus, buyer2.address);
        expect(await NewTreasury.locked(ethers.ZeroAddress)).to.equal(0);
        // Step 4: MTK2 rescue, and verify the surplus zeroed out
        await expect(NewTreasury.connect(buyer3).rescueSurplus(MKT2.target))
          .to.emit(NewTreasury, "SurplusRescued")
          .withArgs(MKT2.target, foundation.address, ercSurplus, buyer3.address);
        expect(await NewTreasury.locked(MKT2.target)).to.equal(0);
        // Step 5: Check balances after rescue
        expect(await ethers.provider.getBalance(foundation.address)).to.equal(foundNativeBalAt0 + nativeSurplus);
        expect(await MKT2.balanceOf(foundation.address)).to.equal(foundErcBalAt0 + ercSurplus);
      });

      it("should rescue mixed native&erc20 surplus when a course is created between deposits", async function () {
        // Step 0: Zero state variables, and be sure there is no surplus in contract
        const nativeSurplus = ethers.parseEther("1.2345");
        const ercSurplus = ethers.parseEther("7");
        const [foundNativeBalAt0, foundErcBalAt0] = await Promise.all([
          ethers.provider.getBalance(foundation.address),
          MKT2.balanceOf(foundation.address),
        ]);
        expect(await NewTreasury.getSurplusBalance(ethers.ZeroAddress)).to.equal(0);
        expect(await NewTreasury.getSurplusBalance(MKT2.target)).to.equal(0);
        // Step 1: Send Native&MTK2 surplus to contract, and check it
        await buyer1.sendTransaction({ to: NewTreasury.target, value: nativeSurplus });
        await MKT2.connect(buyer1).transfer(NewTreasury.target, ercSurplus);
        expect(await NewTreasury.getSurplusBalance(ethers.ZeroAddress)).to.equal(nativeSurplus);
        expect(await NewTreasury.getSurplusBalance(MKT2.target)).to.equal(ercSurplus);
        // Step 2: instructor1 creates a generic course with [instructor1] array
        const courseId1 = await quickCreateACourse();
        expect(await NewTreasury.getSurplusBalance(ethers.ZeroAddress)).to.equal(nativeSurplus);
        expect(await NewTreasury.getSurplusBalance(MKT2.target)).to.equal(ercSurplus);
        // Step 3: Send Native&MTK2 surplus to contract 2nd time, and check it
        await buyer1.sendTransaction({ to: NewTreasury.target, value: nativeSurplus });
        await MKT2.connect(buyer1).transfer(NewTreasury.target, ercSurplus);
        expect(await NewTreasury.getSurplusBalance(ethers.ZeroAddress)).to.equal(nativeSurplus * 2n);
        expect(await NewTreasury.getSurplusBalance(MKT2.target)).to.equal(ercSurplus * 2n);
        // Step 4: Native rescue and verify the surplus zeroed out
        await expect(NewTreasury.connect(buyer2).rescueSurplus(ethers.ZeroAddress))
          .to.emit(NewTreasury, "SurplusRescued")
          .withArgs(ethers.ZeroAddress, foundation.address, nativeSurplus * 2n, buyer2.address);
        expect(await NewTreasury.locked(ethers.ZeroAddress)).to.equal(0);
        // Step 5: MTK2 rescue, and verify the surplus zeroed out
        await expect(NewTreasury.connect(buyer3).rescueSurplus(MKT2.target))
          .to.emit(NewTreasury, "SurplusRescued")
          .withArgs(MKT2.target, foundation.address, ercSurplus * 2n, buyer3.address);
        expect(await NewTreasury.locked(MKT2.target)).to.equal(0);
        // Step 6: Check balances after rescue
        expect(await ethers.provider.getBalance(foundation.address)).to.equal(foundNativeBalAt0 + nativeSurplus * 2n);
        expect(await MKT2.balanceOf(foundation.address)).to.equal(foundErcBalAt0 + ercSurplus * 2n);
      });

      it("should rescue surplus while preserving locked balances after interleaved native&erc20 purchases", async function () {
        // Step 0: Zero state variables, and be sure there is no surplus in contract
        const nativeSurplus = ethers.parseEther("1.2345");
        const ercSurplus = ethers.parseEther("7");
        const [foundNativeBalAt0, foundErcBalAt0] = await Promise.all([
          ethers.provider.getBalance(foundation.address),
          MKT2.balanceOf(foundation.address),
        ]);
        expect(await NewTreasury.getSurplusBalance(ethers.ZeroAddress)).to.equal(0);
        expect(await NewTreasury.getSurplusBalance(MKT2.target)).to.equal(0);
        // Step 1: Send Native&MTK2 surplus to contract, and check it
        await buyer1.sendTransaction({ to: NewTreasury.target, value: nativeSurplus });
        await MKT2.connect(buyer1).transfer(NewTreasury.target, ercSurplus);
        expect(await NewTreasury.getSurplusBalance(ethers.ZeroAddress)).to.equal(nativeSurplus);
        expect(await NewTreasury.getSurplusBalance(MKT2.target)).to.equal(ercSurplus);
        // Step 2: instructor1 creates a generic course with [instructor1] array and make 3 purchase
        const courseId1 = await quickCreateACourse();
        await buyCourseBatchHelper({
          courseIds: Array(3).fill(courseId1), // 3 sales for the same course
          tokenAddresses: [MKT1.target, MKT2.target, ethers.ZeroAddress],
          coursePrices: [ethers.parseEther("5"), ethers.parseEther("10"), ethers.parseEther("15")],
          courseReceivers: [person1.address, person2.address, person3.address],
          redeemers: [buyer1, buyer1, buyer1], // genelde hepsi aynı: tx'i buyer1 atıyor
          validUntils: [now + 86400, now + 86400, now + 86400],
          nativeMsgValue: ethers.parseEther("15"), // sadece ERC20 olduğundan 0
          buyBatchTxCaller: buyer1, // tx gönderen signer
          expectSuccessWith: "ContentPurchased",
        });
        expect(await NewTreasury.getSurplusBalance(ethers.ZeroAddress)).to.equal(nativeSurplus);
        expect(await NewTreasury.getSurplusBalance(MKT2.target)).to.equal(ercSurplus);
        // Step 3: Send Native&MTK2 surplus to contract 2nd time, and check it
        await buyer1.sendTransaction({ to: NewTreasury.target, value: nativeSurplus });
        await MKT2.connect(buyer2).transfer(NewTreasury.target, ercSurplus);
        expect(await NewTreasury.getSurplusBalance(ethers.ZeroAddress)).to.equal(nativeSurplus * 2n);
        expect(await NewTreasury.getSurplusBalance(MKT2.target)).to.equal(ercSurplus * 2n);
        // Step 4: Native rescue and verify the surplus zeroed out
        await expect(NewTreasury.connect(buyer2).rescueSurplus(ethers.ZeroAddress))
          .to.emit(NewTreasury, "SurplusRescued")
          .withArgs(ethers.ZeroAddress, foundation.address, nativeSurplus * 2n, buyer2.address);
        expect(await NewTreasury.locked(ethers.ZeroAddress)).to.equal(ethers.parseEther("15"));
        // Step 5: MTK2 rescue, and verify the surplus zeroed out
        await expect(NewTreasury.connect(buyer3).rescueSurplus(MKT2.target))
          .to.emit(NewTreasury, "SurplusRescued")
          .withArgs(MKT2.target, foundation.address, ercSurplus * 2n, buyer3.address);
        expect(await NewTreasury.locked(MKT2.target)).to.equal(ethers.parseEther("10"));
        // Step 6: Check balances after rescue
        expect(await ethers.provider.getBalance(foundation.address)).to.equal(foundNativeBalAt0 + nativeSurplus * 2n);
        expect(await MKT2.balanceOf(foundation.address)).to.equal(foundErcBalAt0 + ercSurplus * 2n);
      });

      it("should rescue surplus while preserving locked balances after interleaved native&erc20 refund", async function () {
        // Step 0: Ensure no surplus in contract and snapshot foundation balances
        const nativeSurplus = ethers.parseEther("1.2345");
        const ercSurplus = ethers.parseEther("7");
        const [foundNativeBalAt0, foundErcBalAt0] = await Promise.all([
          ethers.provider.getBalance(foundation.address),
          MKT2.balanceOf(foundation.address),
        ]);
        expect(await NewTreasury.getSurplusBalance(ethers.ZeroAddress)).to.equal(0);
        expect(await NewTreasury.getSurplusBalance(MKT2.target)).to.equal(0);
        // Step 1: Send stray native & MTK2 to contract; verify surplus reflects deposits
        await buyer1.sendTransaction({ to: NewTreasury.target, value: nativeSurplus });
        await MKT2.connect(buyer1).transfer(NewTreasury.target, ercSurplus);
        expect(await NewTreasury.getSurplusBalance(ethers.ZeroAddress)).to.equal(nativeSurplus);
        expect(await NewTreasury.getSurplusBalance(MKT2.target)).to.equal(ercSurplus);
        // Step 2: Instructor creates two courses (each with [instructor1] as withdrawer)
        const courses = await createCourseBatchHelper({
          uries: ["https://erc:MTK2-1", "https://native-2"],
          withdrawersArrays: [[instructor1.address], [instructor1.address]],
          redeemers: [instructor1.address, instructor1.address],
          validUntils: [now + 86400, now + 86400],
          createBatchTxCaller: instructor1,
          expectSuccessWith: "CourseCreated",
        });
        // Step 3: Buyer purchases 4 items (2× MTK2, 2× native) for person1 & person2
        const buy_courses = await buyCourseBatchHelper({
          courseIds: [courses.courseIds[0], courses.courseIds[1], courses.courseIds[0], courses.courseIds[1]],
          tokenAddresses: [MKT2.target, MKT2.target, ethers.ZeroAddress, ethers.ZeroAddress],
          coursePrices: [
            ethers.parseEther("5"), // course1 price in MKT1
            ethers.parseEther("7"), // course2 price in MKT2
            ethers.parseEther("9"), // course3 price in MKT1
            ethers.parseEther("11"), // course3 price in native
          ],
          courseReceivers: [person1.address, person1.address, person2.address, person2.address],
          redeemers: [buyer1, buyer1, buyer1, buyer1], // farklı redeemerlar
          validUntils: [now + 86400, now + 86400, now + 86400, now + 86400],
          nativeMsgValue: ethers.parseEther("20"), // sadece ERC20 olduğundan 0
          buyBatchTxCaller: buyer1, // tx gönderen signer
          expectSuccessWith: "ContentPurchased",
        });
        // Step 4: Send stray native & MTK2 again; verify surplus doubled and locked reflect buys
        await buyer1.sendTransaction({ to: NewTreasury.target, value: nativeSurplus });
        await MKT2.connect(buyer2).transfer(NewTreasury.target, ercSurplus);
        expect(await NewTreasury.getSurplusBalance(ethers.ZeroAddress)).to.equal(nativeSurplus * 2n);
        expect(await NewTreasury.getSurplusBalance(MKT2.target)).to.equal(ercSurplus * 2n);
        expect(await NewTreasury.locked(ethers.ZeroAddress)).to.equal(ethers.parseEther("20"));
        expect(await NewTreasury.locked(MKT2.target)).to.equal(ethers.parseEther("12"));
        // Step 5: Refund all four purchases; surplus unchanged, locked reduced to zero
        const refund1 = await refundCourseHelper({
          paymentId: buy_courses[0],
          redeemer: buyer1,
          validUntil: now + 86400,
          expectSuccessWith: "CourseRefunded",
        });
        const refund2 = await refundCourseHelper({
          paymentId: buy_courses[1],
          redeemer: buyer2,
          validUntil: now + 86400,
          expectSuccessWith: "CourseRefunded",
        });
        const refund3 = await refundCourseByOwnerHelper({
          courseOwner: person2.address,
          courseId: courses.courseIds[0],
          redeemer: buyer1,
          validUntil: now + 86400,
          expectSuccessWith: "CourseRefunded",
        });
        const refund4 = await refundCourseByOwnerHelper({
          courseOwner: person2.address,
          courseId: courses.courseIds[1],
          redeemer: buyer1,
          validUntil: now + 86400,
          expectSuccessWith: "CourseRefunded",
        });
        expect(await NewTreasury.getSurplusBalance(ethers.ZeroAddress)).to.equal(nativeSurplus * 2n);
        expect(await NewTreasury.getSurplusBalance(MKT2.target)).to.equal(ercSurplus * 2n);
        // Step 6: Send stray native & MTK2 a 3rd time; verify surplus tripled
        await buyer1.sendTransaction({ to: NewTreasury.target, value: nativeSurplus });
        await MKT2.connect(buyer2).transfer(NewTreasury.target, ercSurplus);
        expect(await NewTreasury.getSurplusBalance(ethers.ZeroAddress)).to.equal(nativeSurplus * 3n);
        expect(await NewTreasury.getSurplusBalance(MKT2.target)).to.equal(ercSurplus * 3n);
        // Step 7: Rescue native surplus; locked(native) remains zero
        await expect(NewTreasury.connect(buyer2).rescueSurplus(ethers.ZeroAddress))
          .to.emit(NewTreasury, "SurplusRescued")
          .withArgs(ethers.ZeroAddress, foundation.address, nativeSurplus * 3n, buyer2.address);
        expect(await NewTreasury.locked(ethers.ZeroAddress)).to.equal(ethers.parseEther("0"));
        // Step 8: Rescue MTK2 surplus; locked(MTK2) remains zero
        await expect(NewTreasury.connect(buyer3).rescueSurplus(MKT2.target))
          .to.emit(NewTreasury, "SurplusRescued")
          .withArgs(MKT2.target, foundation.address, ercSurplus * 3n, buyer3.address);
        expect(await NewTreasury.locked(MKT2.target)).to.equal(ethers.parseEther("0"));
        // Step 9: Verify foundation balances increased by rescued surplus
        expect(await ethers.provider.getBalance(foundation.address)).to.equal(foundNativeBalAt0 + nativeSurplus * 3n);
        expect(await MKT2.balanceOf(foundation.address)).to.equal(foundErcBalAt0 + ercSurplus * 3n);
      });

      it("should rescue surplus while preserving locked balances after interleaved native&erc20 withdraw", async function () {
        // Step 0: Ensure no surplus in contract and snapshot foundation balances
        const nativeSurplus = ethers.parseEther("1.2345");
        const ercSurplus = ethers.parseEther("2");
        const [foundNativeBalAt0, foundErcBalAt0] = await Promise.all([
          ethers.provider.getBalance(foundation.address),
          MKT1.balanceOf(foundation.address),
        ]);
        expect(await NewTreasury.getSurplusBalance(ethers.ZeroAddress)).to.equal(0);
        expect(await NewTreasury.getSurplusBalance(MKT1.target)).to.equal(0);
        // Step 1: Send stray native & MTK2 to contract; verify surplus reflects deposits
        await buyer1.sendTransaction({ to: NewTreasury.target, value: nativeSurplus });
        await MKT1.connect(buyer1).transfer(NewTreasury.target, ercSurplus);
        expect(await NewTreasury.getSurplusBalance(ethers.ZeroAddress)).to.equal(nativeSurplus);
        expect(await NewTreasury.getSurplusBalance(MKT1.target)).to.equal(ercSurplus);
        // Step 2: Instructor creates two generic courses (each with [instructor1] as withdrawer)
        const courses = await createCourseBatchHelper({
          uries: ["https://erc:MTK2-1", "https://native-2"],
          withdrawersArrays: [[instructor1.address], [instructor1.address]],
          redeemers: [instructor1.address, instructor1.address],
          validUntils: [now + 86400, now + 86400],
          createBatchTxCaller: instructor1,
          expectSuccessWith: "CourseCreated",
        });
        // Step 3: Buyer purchases 8 items (alternating MTK2/native) for person1–4; lock funds accordingly
        const courseReceivers = [person1, person2, person3, person4].flatMap((p) => [p.address, p.address]);
        const buy_courses = await buyCourseBatchHelper({
          courseIds: Array.from({ length: 8 }, (_, i) => courses.courseIds[i % 2]), //0,1,0,1...
          tokenAddresses: Array.from({ length: 8 }, (_, i) => (i % 4 < 2 ? MKT1.target : ethers.ZeroAddress)), // 2erc20, 2native...
          coursePrices: Array.from({ length: 8 }, (_, i) => ethers.parseEther(String(5 + 2 * i))), // [5,7,9,11,13,15,17,19] ETH
          courseReceivers: courseReceivers, //[person1, person2, person3, person4].flatMap((p) => [p.address, p.address]),
          redeemers: Array(8).fill(buyer1), // farklı redeemerlar
          validUntils: Array(8).fill(now + 86400),
          nativeMsgValue: ethers.parseEther("56"), // sadece ERC20 olduğundan 0
          buyBatchTxCaller: buyer1, // tx gönderen signer
          expectSuccessWith: "ContentPurchased",
        });
        // Step 4: Send stray native & MTK2 again; verify surplus doubled and locked balances reflect buys
        await buyer1.sendTransaction({ to: NewTreasury.target, value: nativeSurplus });
        await MKT1.connect(buyer2).transfer(NewTreasury.target, ercSurplus);
        expect(await NewTreasury.getSurplusBalance(ethers.ZeroAddress)).to.equal(nativeSurplus * 2n);
        expect(await NewTreasury.getSurplusBalance(MKT1.target)).to.equal(ercSurplus * 2n);
        expect(await NewTreasury.locked(ethers.ZeroAddress)).to.equal(ethers.parseEther("56"));
        expect(await NewTreasury.locked(MKT1.target)).to.equal(ethers.parseEther("40"));
        // Step 5: Refund 4 purchases (2 by paymentId, 2 by owner+courseId); verify locked decreases, surplus unchanged
        const refund1 = await refundCourseHelper({
          paymentId: buy_courses[0],
          redeemer: buyer1,
          validUntil: now + 86400,
          expectSuccessWith: "CourseRefunded",
        });
        const refund2 = await refundCourseHelper({
          paymentId: buy_courses[1],
          redeemer: buyer2,
          validUntil: now + 86400,
          expectSuccessWith: "CourseRefunded",
        });
        const refund3 = await refundCourseByOwnerHelper({
          courseOwner: person2.address,
          courseId: courses.courseIds[0],
          redeemer: buyer1,
          validUntil: now + 86400,
          expectSuccessWith: "CourseRefunded",
        });
        const refund4 = await refundCourseByOwnerHelper({
          courseOwner: person2.address,
          courseId: courses.courseIds[1],
          redeemer: buyer1,
          validUntil: now + 86400,
          expectSuccessWith: "CourseRefunded",
        });
        expect(await NewTreasury.getSurplusBalance(ethers.ZeroAddress)).to.equal(nativeSurplus * 2n);
        expect(await NewTreasury.getSurplusBalance(MKT1.target)).to.equal(ercSurplus * 2n);
        expect(await NewTreasury.locked(ethers.ZeroAddress)).to.equal(ethers.parseEther("36"));
        expect(await NewTreasury.locked(MKT1.target)).to.equal(ethers.parseEther("28"));
        // Step 6: Send stray native & MTK2 a 3rd time; verify surplus tripled
        await buyer1.sendTransaction({ to: NewTreasury.target, value: nativeSurplus });
        await MKT1.connect(buyer2).transfer(NewTreasury.target, ercSurplus);
        expect(await NewTreasury.getSurplusBalance(ethers.ZeroAddress)).to.equal(nativeSurplus * 3n);
        expect(await NewTreasury.getSurplusBalance(MKT1.target)).to.equal(ercSurplus * 3n);
        // Step 7: Advance past refund window; withdraw 2 sales for course[0]; verify ERC20 share calculation (amount=13)
        const refundWindowDays = Number(await NewTreasury.refundWindow()) / 86400;
        await fastForwardTime({ days: refundWindowDays + 1 });
        await withdrawCoursePaymentsHelper({
          courseId: courses.courseIds[0],
          fromIndex: 2,
          toIndex: 3, // 13 eth mtk2
          redeemer: instructor1,
          validUntil: now + 86400,
          expectSuccessWith: "CoursePaymentsWithdrawn",
          expectations: [RE, PES],
        });
        const [foundErcRevenue, goverErcRevenue, instErcRevenue] = await NewTreasury.connect(
          buyer1
        ).getCalculatedCourseCutShares(ethers.parseEther("13"), MKT1.target);
        const calulatedFoundShareERC = (ethers.parseEther("13") * (await NewTreasury.utFoundCut())) / 100000n;
        const calculatedGoverShareERC = (ethers.parseEther("13") * (await NewTreasury.utGoverCut())) / 100000n;
        const calculatedInstShareERC = ethers.parseEther("13") - calulatedFoundShareERC - calculatedGoverShareERC;
        expect(foundErcRevenue).to.equal(calulatedFoundShareERC);
        expect(goverErcRevenue).to.equal(calculatedGoverShareERC);
        expect(instErcRevenue).to.equal(calculatedInstShareERC);
        // Step 8: Send stray native & MTK2 a 4th time; verify surplus quadrupled and locked reflect prior withdraw
        await buyer1.sendTransaction({ to: NewTreasury.target, value: nativeSurplus });
        await MKT1.connect(buyer2).transfer(NewTreasury.target, ercSurplus);
        expect(await NewTreasury.getSurplusBalance(ethers.ZeroAddress)).to.equal(nativeSurplus * 4n);
        expect(await NewTreasury.getSurplusBalance(MKT1.target)).to.equal(ercSurplus * 4n);
        expect(await NewTreasury.locked(ethers.ZeroAddress)).to.equal(ethers.parseEther("36"));
        expect(await NewTreasury.locked(MKT1.target)).to.equal(ethers.parseEther("15"));
        // Step 9: Withdraw one sale for course[1] (index 4, native=19); verify native share calculation
        await withdrawCoursePaymentsHelper({
          courseId: courses.courseIds[1],
          fromIndex: 4,
          toIndex: 4, // 19 eth native
          redeemer: instructor1,
          validUntil: now + 86400,
          expectSuccessWith: "CoursePaymentsWithdrawn",
          expectations: [PES],
        });
        const [foundNativeRevenue, goverNativeRevenue, instNativeRevenue] = await NewTreasury.connect(
          backend
        ).getCalculatedCourseCutShares(ethers.parseEther("19"), ethers.ZeroAddress);
        const calulatedFoundShareNat = (ethers.parseEther("19") * (await NewTreasury.atFoundCut())) / 100000n;
        const calculatedGoverShareNat = (ethers.parseEther("19") * (await NewTreasury.atGoverCut())) / 100000n;
        const calculatedInstShareNat = ethers.parseEther("19") - calulatedFoundShareNat - calculatedGoverShareNat;
        expect(foundNativeRevenue).to.equal(calulatedFoundShareNat);
        expect(goverNativeRevenue).to.equal(calculatedGoverShareNat);
        expect(instNativeRevenue).to.equal(calculatedInstShareNat);
        // Step 10: Send stray native & MTK2 a 5th time; verify surplus quintupled and locked reflect last withdraw
        await buyer1.sendTransaction({ to: NewTreasury.target, value: nativeSurplus });
        await MKT1.connect(buyer2).transfer(NewTreasury.target, ercSurplus);
        expect(await NewTreasury.getSurplusBalance(ethers.ZeroAddress)).to.equal(nativeSurplus * 5n);
        expect(await NewTreasury.getSurplusBalance(MKT1.target)).to.equal(ercSurplus * 5n);
        expect(await NewTreasury.locked(ethers.ZeroAddress)).to.equal(ethers.parseEther("17"));
        expect(await NewTreasury.locked(MKT1.target)).to.equal(ethers.parseEther("15"));
        // Step 11: Rescue native surplus to foundation; locked(native) unchanged
        await expect(NewTreasury.connect(buyer2).rescueSurplus(ethers.ZeroAddress))
          .to.emit(NewTreasury, "SurplusRescued")
          .withArgs(ethers.ZeroAddress, foundation.address, nativeSurplus * 5n, buyer2.address);
        expect(await NewTreasury.locked(ethers.ZeroAddress)).to.equal(ethers.parseEther("17"));
        // Step 12: Rescue MTK2 surplus to foundation; locked(MTK2) unchanged
        await expect(NewTreasury.connect(buyer3).rescueSurplus(MKT1.target))
          .to.emit(NewTreasury, "SurplusRescued")
          .withArgs(MKT1.target, foundation.address, ercSurplus * 5n, buyer3.address);
        expect(await NewTreasury.locked(MKT1.target)).to.equal(ethers.parseEther("15"));
        // Step 13: Verify foundation balances increased by rescued surplus plus prior revenue shares
        expect(await ethers.provider.getBalance(foundation.address)).to.equal(
          foundNativeBalAt0 + nativeSurplus * 5n + foundNativeRevenue
        );
        expect(await MKT1.balanceOf(foundation.address)).to.equal(foundErcBalAt0 + ercSurplus * 5n + foundErcRevenue);
      });
      /////### Rescue Surplus Success Cases###/////
    });
    /////### Rescue Surplus Cases###/////
  });

  // 8. Settings
  describe("⚙️⤴️ SETTINGS", function () {
    describe("✅ Success Cases", function () {
      it("should allow grant backend role to a valid address when called by foundation", async () => {
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

      it("should allow foundation to call setFoundationAddress even after revoking its own backend role", async () => {
        // Step 1: foundation revokes its own backend role
        await expect(NewTreasury.connect(foundation).revokeBackendRole(foundation.address))
          .to.emit(NewTreasury, "BackendRoleRevoked")
          .withArgs(foundation.address);
        // Step 2: foundation calls setFoundationAddress to assign new foundation
        await expect(NewTreasury.connect(foundation).setFoundationAddress(person1.address))
          .to.emit(NewTreasury, "FoundationAddressUpdated")
          .withArgs(person1.address, foundation.address);
        // Step 3: Confirm new foundation and backend role transfer
        expect(await NewTreasury.foundationAddress()).to.equal(person1.address);
        expect(await NewTreasury.hasBackendRole(person1.address)).to.be.true;
        expect(await NewTreasury.hasBackendRole(foundation.address)).to.be.false;
      });

      it("should allow backend to update the UDAO token address", async () => {
        // Step 1: Call setUdaoTokenAddress with a new address
        await expect(NewTreasury.connect(backend).setUdaoTokenAddress(MKT2.target))
          .to.emit(NewTreasury, "UdaoTokenAddressUpdated")
          .withArgs(MKT2.target, MKT1.target, backend.address);
        // Expect: new udao token address is set
        expect(await NewTreasury.udaoTokenAddress()).to.equal(MKT2.target);
      });

      it("should allow foundation to update the governance address", async () => {
        // Step 1: Call setGovernanceAddress with a new address
        await expect(NewTreasury.connect(foundation).setGovernanceAddress(person2.address))
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
          .withArgs(newMax, existing, backend.address);
        // Expect: new value is set
        expect(await NewTreasury.maxAllowedWithdrawers()).to.equal(newMax);
      });

      it("should allow backend to update max batch create size", async () => {
        // Step 1: Read current maxBatchCreateSize
        const existing = await NewTreasury.maxBatchCreateSize();
        // Step 2: Update maxBatchCreateSize to higher value
        const newValue = Number(existing) + 1;
        await expect(NewTreasury.connect(backend).setMaxBatchCreateSize(newValue))
          .to.emit(NewTreasury, "MaxBatchCreateSizeUpdated")
          .withArgs(newValue, existing, backend.address);
        // Expect: new value is set
        expect(await NewTreasury.maxBatchCreateSize()).to.equal(newValue);
      });

      it("should allow backend to update max batch buy size", async () => {
        // Step 1: Read current maxBatchBuySize
        const existing = await NewTreasury.maxBatchBuySize();
        // Step 2: Update maxBatchBuySize to higher value
        const newValue = Number(existing) + 1;
        await expect(NewTreasury.connect(backend).setMaxBatchBuySize(newValue))
          .to.emit(NewTreasury, "MaxBatchBuySizeUpdated")
          .withArgs(newValue, existing, backend.address);
        // Expect: new value is set
        expect(await NewTreasury.maxBatchBuySize()).to.equal(newValue);
      });

      it("should allow backend to update max batch withdraw size", async () => {
        // Step 1: Read current maxBatchWithdrawSize
        const existing = await NewTreasury.maxBatchWithdrawSize();
        // Step 2: Update maxBatchWithdrawSize to higher value
        const newValue = Number(existing) + 1;
        await expect(NewTreasury.connect(backend).setMaxBatchWithdrawSize(newValue))
          .to.emit(NewTreasury, "MaxBatchWithdrawSizeUpdated")
          .withArgs(newValue, existing, backend.address);
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
          .withArgs(newValue, existing, backend.address);
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
        )
          .to.emit(NewTreasury, "CourseCutsUpdated")
          .withArgs(
            updated.atFound,
            updated.atGover,
            updated.utFound,
            updated.utGover,
            current.atFound,
            current.atGover,
            current.utFound,
            current.utGover,
            backend.address
          );
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
        ).to.be.revertedWithCustomError(TestTreasuryFactory, "FoundationAddressIsZero");
        // Expect deployment to revert with "FoundationAddressIsZero" custom error
      });

      it("should fail to deploy treasury if constructor udao token address is zero", async () => {
        // Step 1: Try to deploy NewTreasury with zero udao token address
        const TestTreasuryFactory = await ethers.getContractFactory(
          "contracts/newTreasury/NewTreasury.sol:NewTreasury"
        );
        await expect(
          TestTreasuryFactory.deploy(foundation.address, ethers.ZeroAddress, NewGovDummy.target)
        ).to.be.revertedWithCustomError(TestTreasuryFactory, "UdaoTokenAddressIsZero");
        // Expect deployment to revert with "UdaoTokenAddressIsZero" custom error
      });

      it("should fail to deploy treasury if constructor governance address is zero", async () => {
        // Step 1: Try to deploy NewTreasury with zero governance address
        const TestTreasuryFactory = await ethers.getContractFactory(
          "contracts/newTreasury/NewTreasury.sol:NewTreasury"
        );
        await expect(
          TestTreasuryFactory.deploy(foundation.address, MKT1.target, ethers.ZeroAddress)
        ).to.be.revertedWithCustomError(TestTreasuryFactory, "GovernanceAddressIsZero");
        // Expect deployment to revert with "GovernanceAddressIsZero" custom error
      });

      it("should fail to grant backend role if called by a non-foundation address", async () => {
        // Step 1: Try to grant backend role by a non-foundation address
        await expect(NewTreasury.connect(backend).grantBackendRole(person1.address)).to.be.revertedWithCustomError(
          NewTreasury,
          "CallerIsNotFoundation()"
        );
        // Expect: Reverts with "CallerIsNotFoundation" custom error
        // Expect: person1 should not have backend role
        expect(await NewTreasury.hasBackendRole(person1.address)).to.be.false;
      });

      it("should fail to grant backend role if desired address is zero", async () => {
        // Step 1: Try to grant backend role to zero address
        await expect(
          NewTreasury.connect(foundation).grantBackendRole(ethers.ZeroAddress)
        ).to.be.revertedWithCustomError(NewTreasury, "BackendAddressIsZero()");
        // Expect: Reverts with "BackendAddressIsZero" custom error
        // Expect: backend role should not be granted to zero address
        expect(await NewTreasury.hasBackendRole(ethers.ZeroAddress)).to.be.false;
      });

      it("should fail to grant backend role if desired address is already a backend", async () => {
        // Step 1: Try to grant backend role to an address that already has it
        await expect(NewTreasury.connect(foundation).grantBackendRole(backend.address)).to.be.revertedWithCustomError(
          NewTreasury,
          "BackendRoleAlreadyAssigned()"
        );
        // Step 2: Grant backend role to person1
        await NewTreasury.connect(foundation).grantBackendRole(person1.address);
        // Step 3: Try to grant backend role to person1 again
        await expect(NewTreasury.connect(foundation).grantBackendRole(person1.address)).to.be.revertedWithCustomError(
          NewTreasury,
          "BackendRoleAlreadyAssigned()"
        );
        // Expect: Reverts with "BackendRoleAlreadyAssigned" custom error in both cases
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
          "CallerIsNotFoundation()"
        );
        // Expect: person1 should still have backend role
        expect(await NewTreasury.hasBackendRole(person1.address)).to.be.true;
      });

      it("should fail to revoke backend role if address is zero", async () => {
        // Step 1: Try to revoke zero address
        await expect(
          NewTreasury.connect(foundation).revokeBackendRole(ethers.ZeroAddress)
        ).to.be.revertedWithCustomError(NewTreasury, "BackendAddressIsZero()");
        // Expect: role still false
        expect(await NewTreasury.hasBackendRole(ethers.ZeroAddress)).to.be.false;
      });

      it("should fail to revoke backend role if address doesn't have role", async () => {
        // Step 1: Ensure person1 has no backend role
        expect(await NewTreasury.hasBackendRole(person1.address)).to.be.false;
        // Step 2: Try to revoke
        await expect(NewTreasury.connect(foundation).revokeBackendRole(person1.address)).to.be.revertedWithCustomError(
          NewTreasury,
          "BackendRoleAlreadyAbsent()"
        );
        // Expect: still false
        expect(await NewTreasury.hasBackendRole(person1.address)).to.be.false;
      });

      it("should fail to update foundation address if called by non-foundation", async () => {
        // Step 1: Try to update foundation address by backend
        await expect(NewTreasury.connect(backend).setFoundationAddress(person1.address)).to.be.revertedWithCustomError(
          NewTreasury,
          "CallerIsNotFoundation()"
        );
        // Expect: foundation still unchanged
        expect(await NewTreasury.foundationAddress()).to.equal(foundation.address);
      });

      it("should fail to update foundation address if new address is zero", async () => {
        // Step 1: Try to update foundation address to zero address
        await expect(
          NewTreasury.connect(foundation).setFoundationAddress(ethers.ZeroAddress)
        ).to.be.revertedWithCustomError(NewTreasury, "FoundationAddressIsZero()");
        // Expect: foundation still unchanged
        expect(await NewTreasury.foundationAddress()).to.equal(foundation.address);
      });

      it("should fail to update foundation address if new address is same as current", async () => {
        // Step 1: Try to update foundation address to current address
        await expect(
          NewTreasury.connect(foundation).setFoundationAddress(foundation.address)
        ).to.be.revertedWithCustomError(NewTreasury, "ChangeHasNoEffect()");
        // Expect: foundation still unchanged
        expect(await NewTreasury.foundationAddress()).to.equal(foundation.address);
      });

      it("should fail to update UDAO token address if called by non-backend", async () => {
        // Step 1: Try to update UDAO token address by person1 (not backend)
        await expect(NewTreasury.connect(person1).setUdaoTokenAddress(MKT2.target)).to.be.revertedWithCustomError(
          NewTreasury,
          "CallerIsNotBackend()"
        );
        // Expect: address remains unchanged
        expect(await NewTreasury.udaoTokenAddress()).to.equal(MKT1.target);
      });

      it("should fail to update UDAO token address if new address is zero", async () => {
        // Step 1: Try to update UDAO token address to zero address
        await expect(
          NewTreasury.connect(backend).setUdaoTokenAddress(ethers.ZeroAddress)
        ).to.be.revertedWithCustomError(NewTreasury, "UdaoTokenAddressIsZero()");
        // Expect: address remains unchanged
        expect(await NewTreasury.udaoTokenAddress()).to.equal(MKT1.target);
      });

      it("should fail to update UDAO token address if new address is same as current", async () => {
        // Step 1: Try to update UDAO token address to current address
        await expect(NewTreasury.connect(backend).setUdaoTokenAddress(MKT1.target)).to.be.revertedWithCustomError(
          NewTreasury,
          "ChangeHasNoEffect()"
        );
        // Expect: address remains unchanged
        expect(await NewTreasury.udaoTokenAddress()).to.equal(MKT1.target);
      });

      it("should fail to update governance address if called by non-foundation", async () => {
        // Step 1: Try to update governance address by outsider (not foundation)
        await expect(NewTreasury.connect(person3).setGovernanceAddress(person1.address)).to.be.revertedWithCustomError(
          NewTreasury,
          "CallerIsNotFoundation()"
        );
        // Expect: address remains unchanged
        expect(await NewTreasury.governanceAddress()).to.equal(NewGovDummy.target);
      });

      it("should fail to update governance address if new address is zero", async () => {
        // Step 1: Try to update governance address to zero address
        await expect(
          NewTreasury.connect(foundation).setGovernanceAddress(ethers.ZeroAddress)
        ).to.be.revertedWithCustomError(NewTreasury, "GovernanceAddressIsZero()");
        // Expect: address remains unchanged
        expect(await NewTreasury.governanceAddress()).to.equal(NewGovDummy.target);
      });

      it("should fail to update governance address if new address is same as current", async () => {
        // Step 1: Try to update governance address to current address
        await expect(
          NewTreasury.connect(foundation).setGovernanceAddress(NewGovDummy.target)
        ).to.be.revertedWithCustomError(NewTreasury, "ChangeHasNoEffect()");
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
          "CallerIsNotBackend()"
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
          "ValueIsZero()"
        );
        // Expect: value remains unchanged
        expect(await NewTreasury.maxAllowedWithdrawers()).to.equal(existing);
      });

      it("should fail to update max allowed withdrawers if new value is same", async () => {
        // Step 1: Read current maxAllowedWithdrawers
        const existing = await NewTreasury.maxAllowedWithdrawers();
        await expect(NewTreasury.connect(backend).setMaxAllowedWithdrawers(existing)).to.be.revertedWithCustomError(
          NewTreasury,
          "ChangeHasNoEffect()"
        );
        // Expect: value remains unchanged
        expect(await NewTreasury.maxAllowedWithdrawers()).to.equal(existing);
      });

      it("should fail to update max batch create size if called by non-backend", async () => {
        // Step 1: Read current maxBatchCreateSize
        const existing = await NewTreasury.maxBatchCreateSize();
        // Step 2: Try to update max batch create size by outsider (not backend)
        const newValue = Number(existing) + 1;
        await expect(NewTreasury.connect(person1).setMaxBatchCreateSize(newValue)).to.be.revertedWithCustomError(
          NewTreasury,
          "CallerIsNotBackend()"
        );
        // Expect: value remains unchanged
        expect(await NewTreasury.maxBatchCreateSize()).to.equal(existing);
      });

      it("should fail to update max batch create size if value is 0", async () => {
        // Step 1: Read current maxBatchCreateSize
        const existing = await NewTreasury.maxBatchCreateSize();
        // Step 2: Try to update max batch create size to 0
        await expect(NewTreasury.connect(backend).setMaxBatchCreateSize(0)).to.be.revertedWithCustomError(
          NewTreasury,
          "ValueIsZero()"
        );
        // Expect: value remains unchanged
        expect(await NewTreasury.maxBatchCreateSize()).to.equal(existing);
      });

      it("should fail to update max batch create size if new value is same", async () => {
        // Step 1: Read current maxBatchCreateSize
        const existing = await NewTreasury.maxBatchCreateSize();
        // Step 2: Try to update with same value
        await expect(NewTreasury.connect(backend).setMaxBatchCreateSize(existing)).to.be.revertedWithCustomError(
          NewTreasury,
          "ChangeHasNoEffect()"
        );
        // Expect: value remains unchanged
        expect(await NewTreasury.maxBatchCreateSize()).to.equal(existing);
      });

      it("should fail to update max batch buy size if called by non-backend", async () => {
        // Step 1: Read current maxBatchBuySize
        const existing = await NewTreasury.maxBatchBuySize();
        // Step 2: Try to update max batch buy size by outsider (not backend)
        const newValue = Number(existing) + 1;
        await expect(NewTreasury.connect(person1).setMaxBatchBuySize(newValue)).to.be.revertedWithCustomError(
          NewTreasury,
          "CallerIsNotBackend()"
        );
        // Expect: value remains unchanged
        expect(await NewTreasury.maxBatchBuySize()).to.equal(existing);
      });

      it("should fail to update max batch buy size if value is 0", async () => {
        // Step 1: Read current maxBatchBuySize
        const existing = await NewTreasury.maxBatchBuySize();
        // Step 2: Try to update max batch buy size to 0
        await expect(NewTreasury.connect(backend).setMaxBatchBuySize(0)).to.be.revertedWithCustomError(
          NewTreasury,
          "ValueIsZero()"
        );
        // Expect: value remains unchanged
        expect(await NewTreasury.maxBatchBuySize()).to.equal(existing);
      });

      it("should fail to update max batch buy size if new value is same", async () => {
        // Step 1: Read current maxBatchBuySize
        const existing = await NewTreasury.maxBatchBuySize();
        // Step 2: Try to update with same value
        await expect(NewTreasury.connect(backend).setMaxBatchBuySize(existing)).to.be.revertedWithCustomError(
          NewTreasury,
          "ChangeHasNoEffect()"
        );
        // Expect: value remains unchanged
        expect(await NewTreasury.maxBatchBuySize()).to.equal(existing);
      });

      it("should fail to update max batch withdraw size if called by non-backend", async () => {
        // Step 1: Read current maxBatchWithdrawSize
        const existing = await NewTreasury.maxBatchWithdrawSize();
        // Step 2: Try to update max batch withdraw size by outsider (not backend)
        const newValue = Number(existing) + 1;
        await expect(NewTreasury.connect(person1).setMaxBatchWithdrawSize(newValue)).to.be.revertedWithCustomError(
          NewTreasury,
          "CallerIsNotBackend()"
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
          "ValueIsZero()"
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
          "ChangeHasNoEffect()"
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
          "CallerIsNotBackend()"
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
          "ChangeHasNoEffect()"
        );
        // Expect: value remains unchanged
        expect(await NewTreasury.refundWindow()).to.equal(existing);
      });

      it("should fail if called by non-backend", async () => {
        // Step 1: Try to update cuts from outsider
        await expect(NewTreasury.connect(person1).setCourseCuts(100, 100, 100, 100)).to.be.revertedWithCustomError(
          NewTreasury,
          "CallerIsNotBackend()"
        );
        // Expect: Reverts with "CallerIsNotBackend" custom error
      });

      it("should fail if non-udao cuts exceed 100%", async () => {
        // Step 1: Set non-udao cuts over 100%
        await expect(
          NewTreasury.connect(backend).setCourseCuts(90_000, 20_000, 4000, 500)
        ).to.be.revertedWithCustomError(NewTreasury, "NonUdaoCutsSumExceeds100Percent()");
        // Expect: Reverts with "NonUdaoCutsSumExceeds100Percent" custom error
      });

      it("should fail if udao cuts exceed 100%", async () => {
        // Step 1: Set udao cuts over 100%
        await expect(
          NewTreasury.connect(backend).setCourseCuts(6000, 1000, 80_000, 30_000)
        ).to.be.revertedWithCustomError(NewTreasury, "UdaoCutsSumExceeds100Percent()");
        // Expect: Reverts with "UdaoCutsSumExceeds100Percent" custom error
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
        ).to.be.revertedWithCustomError(NewTreasury, "ChangeHasNoEffect()");
        // Expect: Reverts with "ChangeHasNoEffect" custom error
      });
      /////###End of Failure Cases###/////
    });
    /////###End of Settings###/////
  });
  // End of tests
});
//TODO: Use fixtures instead of manual snapshots Bir ara bak buna!
