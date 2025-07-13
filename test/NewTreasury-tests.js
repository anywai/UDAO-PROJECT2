const { expect } = require("chai");
const { ethers } = require("hardhat");
//import { CreateCourseVoucherHelper } from "../lib/newTreasuryVoucher.js"; // kendi path'ine göre güncelle
//const { Redeem } = require("../lib/Redeem");
const {
  CreateCourseVoucherHelper,
  UpdateCourseVoucherHelper,
  BuyCourseVoucherHelper,
  RefundCourseVoucherHelper,
  RefundCourseByOwnerAndCourseIdVoucherHelper,
  WithdrawVoucherHelper,
} = require("../lib/newTreasuryVoucher");

require("dotenv").config();

describe("NewTreasury Contract Tests", function () {
  let NewTreasury,
    NewGovDummy,
    MTK1,
    MTK2,
    backend,
    foundation,
    instructor1,
    instructor2,
    instructor3,
    instructor4,
    instructor5,
    buyer1,
    buyer2,
    buyer3,
    buyer4,
    buyer5,
    person1,
    person2,
    person3,
    person4,
    person5;

  beforeEach(async function () {
    // Get signers for main users.
    [
      backend,
      foundation,
      instructor1,
      instructor2,
      instructor3,
      instructor4,
      instructor5,
      buyer1,
      buyer2,
      buyer3,
      buyer4,
      buyer5,
      person1,
      person2,
      person3,
      person4,
      person5,
    ] = await ethers.getSigners();

    // Create a MockERC20 contract factory
    const MockERC20Factory = await ethers.getContractFactory("contracts/newTreasury/MockERC20.sol:MockERC20");

    // MTK1 and MTK2 are mock ERC20 tokens used in the tests, to simulate different erc20 tokens.
    MKT1 = await MockERC20Factory.connect(backend).deploy("MockToken1", "MTK1", ethers.parseEther("100000"));
    await MKT1.waitForDeployment();
    MKT2 = await MockERC20Factory.connect(backend).deploy("MockToken2", "MTK2", ethers.parseEther("1000000"));
    await MKT2.waitForDeployment();

    // Set up the initial balances for the mock tokens
    await MKT1.connect(backend).transfer(foundation.address, ethers.parseEther("1000"));
    await MKT1.connect(backend).transfer(instructor1.address, ethers.parseEther("1000"));
    await MKT1.connect(backend).transfer(instructor2.address, ethers.parseEther("1000"));
    await MKT1.connect(backend).transfer(instructor3.address, ethers.parseEther("1000"));
    await MKT1.connect(backend).transfer(instructor4.address, ethers.parseEther("1000"));
    await MKT1.connect(backend).transfer(instructor5.address, ethers.parseEther("1000"));
    await MKT1.connect(backend).transfer(buyer1.address, ethers.parseEther("1000"));
    await MKT1.connect(backend).transfer(buyer2.address, ethers.parseEther("1000"));
    await MKT1.connect(backend).transfer(buyer3.address, ethers.parseEther("1000"));
    await MKT1.connect(backend).transfer(buyer4.address, ethers.parseEther("1000"));
    await MKT1.connect(backend).transfer(buyer5.address, ethers.parseEther("1000"));
    await MKT1.connect(backend).transfer(person1.address, ethers.parseEther("1000"));
    await MKT1.connect(backend).transfer(person2.address, ethers.parseEther("1000"));
    await MKT1.connect(backend).transfer(person3.address, ethers.parseEther("1000"));
    await MKT1.connect(backend).transfer(person4.address, ethers.parseEther("1000"));
    await MKT1.connect(backend).transfer(person5.address, ethers.parseEther("1000"));

    await MKT2.connect(backend).transfer(foundation.address, ethers.parseEther("1000"));
    await MKT2.connect(backend).transfer(instructor1.address, ethers.parseEther("1000"));
    await MKT2.connect(backend).transfer(instructor2.address, ethers.parseEther("1000"));
    await MKT2.connect(backend).transfer(instructor3.address, ethers.parseEther("1000"));
    await MKT2.connect(backend).transfer(instructor4.address, ethers.parseEther("1000"));
    await MKT2.connect(backend).transfer(instructor5.address, ethers.parseEther("1000"));
    await MKT2.connect(backend).transfer(buyer1.address, ethers.parseEther("1000"));
    await MKT2.connect(backend).transfer(buyer2.address, ethers.parseEther("1000"));
    await MKT2.connect(backend).transfer(buyer3.address, ethers.parseEther("1000"));
    await MKT2.connect(backend).transfer(buyer4.address, ethers.parseEther("1000"));
    await MKT2.connect(backend).transfer(buyer5.address, ethers.parseEther("1000"));
    await MKT2.connect(backend).transfer(person1.address, ethers.parseEther("1000"));
    await MKT2.connect(backend).transfer(person2.address, ethers.parseEther("1000"));
    await MKT2.connect(backend).transfer(person3.address, ethers.parseEther("1000"));
    await MKT2.connect(backend).transfer(person4.address, ethers.parseEther("1000"));
    await MKT2.connect(backend).transfer(person5.address, ethers.parseEther("1000"));

    // Create a NewGovernanceDummy contract factory and deploy it
    const NewGovernanceDummyFactory = await ethers.getContractFactory(
      "contracts/newTreasury/NewGovernanceTreasuryDummy.sol:NewGovernanceTreasuryDummy"
    );
    NewGovDummy = await NewGovernanceDummyFactory.connect(backend).deploy();
    await NewGovDummy.waitForDeployment();

    // Deploy NewTreasury contract
    const NewTreasuryFactory = await ethers.getContractFactory("contracts/newTreasury/NewTreasury.sol:NewTreasury");
    //address _foundationWallet,
    //address _udaoTokenAddress,
    //address _governanceContract
    NewTreasury = await NewTreasuryFactory.connect(backend).deploy(foundation.address, MKT1.target, NewGovDummy.target); // constructor parameters can be added here if needed
    await NewTreasury.waitForDeployment();

    // Approve the NewTreasury contract to spend tokens on behalf of the users
    await MKT1.connect(backend).approve(NewTreasury.target, ethers.parseEther("1000"));
    await MKT2.connect(backend).approve(NewTreasury.target, ethers.parseEther("1000"));

    await MKT1.connect(foundation).approve(NewTreasury.target, ethers.parseEther("1000"));
    await MKT1.connect(instructor1).approve(NewTreasury.target, ethers.parseEther("1000"));
    await MKT1.connect(instructor2).approve(NewTreasury.target, ethers.parseEther("1000"));
    await MKT1.connect(instructor3).approve(NewTreasury.target, ethers.parseEther("1000"));
    await MKT1.connect(instructor4).approve(NewTreasury.target, ethers.parseEther("1000"));
    await MKT1.connect(instructor5).approve(NewTreasury.target, ethers.parseEther("1000"));
    await MKT1.connect(buyer1).approve(NewTreasury.target, ethers.parseEther("1000"));
    await MKT1.connect(buyer2).approve(NewTreasury.target, ethers.parseEther("1000"));
    await MKT1.connect(buyer3).approve(NewTreasury.target, ethers.parseEther("1000"));
    await MKT1.connect(buyer4).approve(NewTreasury.target, ethers.parseEther("1000"));
    await MKT1.connect(buyer5).approve(NewTreasury.target, ethers.parseEther("1000"));
    await MKT1.connect(person1).approve(NewTreasury.target, ethers.parseEther("1000"));
    await MKT1.connect(person2).approve(NewTreasury.target, ethers.parseEther("1000"));
    await MKT1.connect(person3).approve(NewTreasury.target, ethers.parseEther("1000"));
    await MKT1.connect(person4).approve(NewTreasury.target, ethers.parseEther("1000"));
    await MKT1.connect(person5).approve(NewTreasury.target, ethers.parseEther("1000"));

    await MKT2.connect(foundation).approve(NewTreasury.target, ethers.parseEther("1000"));
    await MKT2.connect(instructor1).approve(NewTreasury.target, ethers.parseEther("1000"));
    await MKT2.connect(instructor2).approve(NewTreasury.target, ethers.parseEther("1000"));
    await MKT2.connect(instructor3).approve(NewTreasury.target, ethers.parseEther("1000"));
    await MKT2.connect(instructor4).approve(NewTreasury.target, ethers.parseEther("1000"));
    await MKT2.connect(instructor5).approve(NewTreasury.target, ethers.parseEther("1000"));
    await MKT2.connect(buyer1).approve(NewTreasury.target, ethers.parseEther("1000"));
    await MKT2.connect(buyer2).approve(NewTreasury.target, ethers.parseEther("1000"));
    await MKT2.connect(buyer3).approve(NewTreasury.target, ethers.parseEther("1000"));
    await MKT2.connect(buyer4).approve(NewTreasury.target, ethers.parseEther("1000"));
    await MKT2.connect(buyer5).approve(NewTreasury.target, ethers.parseEther("1000"));
    await MKT2.connect(person1).approve(NewTreasury.target, ethers.parseEther("1000"));
    await MKT2.connect(person2).approve(NewTreasury.target, ethers.parseEther("1000"));
    await MKT2.connect(person3).approve(NewTreasury.target, ethers.parseEther("1000"));
    await MKT2.connect(person4).approve(NewTreasury.target, ethers.parseEther("1000"));
    await MKT2.connect(person5).approve(NewTreasury.target, ethers.parseEther("1000"));

    //important note: Check `.target` for ethers v6
    //target usage: Ethers v6 uses .target instead of .address for deployed contract instances.
    //However, if the instance isn't assigned correctly, accessing .target will result in a null or undefined value.

    //add new interactions here if needed
    await NewTreasury.connect(backend).setRefundWindow(19); // 1 gün
  });

  // Create Course Tests
  it("should create a course successfully", async function () {
    const voucherHelper = new CreateCourseVoucherHelper({
      contractAddress: NewTreasury.target,
      signer: backend,
    });

    const latestBlock = await ethers.provider.getBlock("latest");
    const now = Number(latestBlock.timestamp);

    const uri = "https://example.com/course/1";
    const withdrawers = [instructor1.address, instructor2.address];
    const redeemer = instructor1.address;
    const validUntil = now + 24 * 60 * 60; // 1 days from now

    const voucher = await voucherHelper.signVoucher({
      uri,
      withdrawers,
      redeemer,
      validUntil,
    });

    //expect(voucher).to.have.property("uri", uri);
    //expect(voucher.withdrawers).to.deep.equal(withdrawers.map((addr) => ethers.getAddress(addr)));
    //expect(voucher.redeemer).to.equal(ethers.getAddress(redeemer));
    //expect(voucher.validUntil).to.be.greaterThan(Math.floor(Date.now() / 1000));
    //expect(voucher).to.have.property("signature");

    // Verify the voucher
    //const verifiedSigner = await voucherHelper.verifyVoucher(voucher, backend.address);
    //expect(verifiedSigner).to.equal(ethers.getAddress(backend.address));

    const tx = await NewTreasury.connect(instructor1).createCourse(voucher);
    const receipt = await tx.wait();

    // Check event
    const courseCreatedEvent = receipt.logs.find((log) => log.fragment.name === "CourseCreated");
    expect(courseCreatedEvent).to.exist;

    // Check courseCounter
    const courseCounter = await NewTreasury.courseCounter();
    expect(courseCounter).to.equal(1);

    // Check URI
    const course = await NewTreasury.courses(1);
    expect(course.uri).to.equal(uri);

    // Check authorized withdrawers
    const auth1 = await NewTreasury.isAuthorizedWithdrawer(instructor1.address, 1);
    const auth2 = await NewTreasury.isAuthorizedWithdrawer(instructor2.address, 1);
    expect(auth1).to.equal(true);
    expect(auth2).to.equal(true);
  });

  it("should update a course successfully using a valid voucher", async function () {
    const createVoucherHelper = new CreateCourseVoucherHelper({
      contractAddress: NewTreasury.target,
      signer: backend,
    });

    const updateVoucherHelper = new UpdateCourseVoucherHelper({
      contractAddress: NewTreasury.target,
      signer: backend,
    });

    const latestBlock = await ethers.provider.getBlock("latest");
    const now = Number(latestBlock.timestamp);

    // Step 1: Instructor1 creates a course via CreateCourseVoucher
    const initialVoucher = await createVoucherHelper.signVoucher({
      uri: "https://example.com/course/1",
      withdrawers: [instructor1.address, instructor2.address],
      redeemer: instructor1.address,
      validUntil: now + 86400,
    });

    const createTx = await NewTreasury.connect(instructor1).createCourse(initialVoucher);
    await createTx.wait();

    // Step 2: Instructor1 updates course via UpdateCourseVoucher
    const updateVoucher = await updateVoucherHelper.signVoucher({
      courseId: 1,
      sellable: true,
      uri: "https://example.com/course/1New",
      withdrawers: [instructor1.address, instructor3.address],
      redeemer: instructor1.address,
      validUntil: now + 86400,
    });

    const updateTx = await NewTreasury.connect(instructor1).updateCourse(updateVoucher);
    const receipt = await updateTx.wait();

    const updateEvent = receipt.logs.find((log) => log.fragment.name === "CourseUpdated");
    expect(updateEvent).to.exist;

    // Check updated URI
    const updatedCourse = await NewTreasury.courses(1);
    expect(updatedCourse.uri).to.equal("https://example.com/course/1New");

    // Check updated withdrawers
    const auth1 = await NewTreasury.isAuthorizedWithdrawer(instructor1.address, 1);
    const auth3 = await NewTreasury.isAuthorizedWithdrawer(instructor3.address, 1);
    const auth2 = await NewTreasury.isAuthorizedWithdrawer(instructor2.address, 1);

    expect(auth1).to.equal(true);
    expect(auth3).to.equal(true);
    expect(auth2).to.equal(false); // instructor2 artık yetkili olmamalı
  });

  it("should allow a user to buy a course using a valid BuyCourseVoucher", async function () {
    const createVoucherHelper = new CreateCourseVoucherHelper({
      contractAddress: NewTreasury.target,
      signer: backend,
    });

    const buyVoucherHelper = new BuyCourseVoucherHelper({
      contractAddress: NewTreasury.target,
      signer: backend,
    });

    const latestBlock = await ethers.provider.getBlock("latest");
    const now = Number(latestBlock.timestamp);

    // Step 1: Create course via instructor1
    const createVoucher = await createVoucherHelper.signVoucher({
      uri: "https://example.com/course/1",
      withdrawers: [instructor1.address, instructor2.address],
      redeemer: instructor1.address,
      validUntil: now + 86400,
    });

    await NewTreasury.connect(instructor1).createCourse(createVoucher);

    // Step 2: buyer1 buys the course for person1 using voucher
    const courseId = 1;
    const coursePrice = ethers.parseEther("10");

    const buyVoucher = await buyVoucherHelper.signVoucher({
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
    const createHelper = new CreateCourseVoucherHelper({
      contractAddress: NewTreasury.target,
      signer: backend,
    });

    const buyHelper = new BuyCourseVoucherHelper({
      contractAddress: NewTreasury.target,
      signer: backend,
    });

    const refundHelper = new RefundCourseVoucherHelper({
      contractAddress: NewTreasury.target,
      signer: backend,
    });

    const latestBlock = await ethers.provider.getBlock("latest");
    const now = Number(latestBlock.timestamp);

    // Step 1: instructor1 creates a course
    const createVoucher = await createHelper.signVoucher({
      uri: "https://example.com/course/1",
      withdrawers: [instructor1.address, instructor2.address],
      redeemer: instructor1.address,
      validUntil: now + 86400,
    });

    await NewTreasury.connect(instructor1).createCourse(createVoucher);

    // Step 2: buyer1 buys course 1 for person1
    const courseId = 1;
    const coursePrice = ethers.parseEther("10");

    const buyVoucher = await buyHelper.signVoucher({
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

    const refundVoucher = await refundHelper.signVoucher({
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
    const createHelper = new CreateCourseVoucherHelper({
      contractAddress: NewTreasury.target,
      signer: backend,
    });

    const buyHelper = new BuyCourseVoucherHelper({
      contractAddress: NewTreasury.target,
      signer: backend,
    });

    const refundByOwnerHelper = new RefundCourseByOwnerAndCourseIdVoucherHelper({
      contractAddress: NewTreasury.target,
      signer: backend,
    });

    const latestBlock = await ethers.provider.getBlock("latest");
    const now = Number(latestBlock.timestamp);

    // Step 1: instructor1 creates a course
    const createVoucher = await createHelper.signVoucher({
      uri: "https://example.com/course/1",
      withdrawers: [instructor1.address],
      redeemer: instructor1.address,
      validUntil: now + 86400,
    });

    await NewTreasury.connect(instructor1).createCourse(createVoucher);

    // Step 2: buyer1 buys course for person1
    const courseId = 1;
    const coursePrice = ethers.parseEther("10");

    const buyVoucher = await buyHelper.signVoucher({
      courseId,
      tokenAddress: MKT1.target,
      coursePrice,
      courseReceiver: person1.address,
      redeemer: buyer1.address,
      validUntil: now + 86400,
    });

    await NewTreasury.connect(buyer1).buyCourse(buyVoucher);

    // Step 3: instructor5 initiates refund using courseOwner + courseId
    const refundVoucher = await refundByOwnerHelper.signVoucher({
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

    const createHelper = new CreateCourseVoucherHelper({
      contractAddress: NewTreasury.target,
      signer: backend,
    });

    const buyHelper = new BuyCourseVoucherHelper({
      contractAddress: NewTreasury.target,
      signer: backend,
    });

    const withdrawHelper = new WithdrawVoucherHelper({
      contractAddress: NewTreasury.target,
      signer: backend,
    });

    // 1. instructor1 course oluşturur
    const createVoucher = await createHelper.signVoucher({
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
      const buyVoucher = await buyHelper.signVoucher({
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
    await ethers.provider.send("evm_increaseTime", [86400 * 25]); // 25 gün ileri
    await ethers.provider.send("evm_mine");
    const withdrawDValidUntil = validUntil + 86400 * 25;

    // 3. Balance öncesi
    const instructorBalBefore = await MKT1.balanceOf(instructor1.address);
    const contractBalBefore = await MKT1.balanceOf(NewTreasury.target);

    // 4. Withdraw işlemi
    const withdrawVoucher = await withdrawHelper.signVoucher({
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

  it("should allow instructor1 to withdraw payments from mixed tokens (MTK1, MTK2, ETH)", async function () {
    const latestBlock = await ethers.provider.getBlock("latest");
    const now = Number(latestBlock.timestamp);

    const createHelper = new CreateCourseVoucherHelper({
      contractAddress: NewTreasury.target,
      signer: backend,
    });

    const buyHelper = new BuyCourseVoucherHelper({
      contractAddress: NewTreasury.target,
      signer: backend,
    });

    const withdrawHelper = new WithdrawVoucherHelper({
      contractAddress: NewTreasury.target,
      signer: backend,
    });

    // 1. instructor1 creates a course
    const createVoucher = await createHelper.signVoucher({
      uri: "https://example.com/mixed-course/1",
      withdrawers: [instructor1.address],
      redeemer: instructor1.address,
      validUntil: now + 86400,
    });

    await NewTreasury.connect(instructor1).createCourse(createVoucher);

    const courseId = 1;
    const validUntil = now + 86400;

    // === Sales ===
    // Buyer1 buys for person1 with 10 MTK1
    const buyVoucher1 = await buyHelper.signVoucher({
      courseId,
      tokenAddress: MKT1.target,
      coursePrice: ethers.parseEther("10"),
      courseReceiver: person1.address,
      redeemer: buyer1.address,
      validUntil,
    });
    await NewTreasury.connect(buyer1).buyCourse(buyVoucher1);

    // Buyer2 buys for person2 with 5 MTK2
    const buyVoucher2 = await buyHelper.signVoucher({
      courseId,
      tokenAddress: MKT2.target,
      coursePrice: ethers.parseEther("5"),
      courseReceiver: person2.address,
      redeemer: buyer2.address,
      validUntil,
    });
    await NewTreasury.connect(buyer2).buyCourse(buyVoucher2);

    // Buyer3 buys for person3 with 10 ETH
    const buyVoucher3 = await buyHelper.signVoucher({
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

    // Buyer4 buys for person4 with 10 ETH
    const buyVoucher4 = await buyHelper.signVoucher({
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

    // Buyer5 buys for person5 with 10 ETH
    const buyVoucher5 = await buyHelper.signVoucher({
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
    await ethers.provider.send("evm_increaseTime", [86400 * 25]); // 25 gün
    await ethers.provider.send("evm_mine");

    // 3. Balances before
    const mtk1Before = await MKT1.balanceOf(instructor1.address);
    const mtk2Before = await MKT2.balanceOf(instructor1.address);
    const ethBefore = await ethers.provider.getBalance(instructor1.address);

    // 4. Withdraw 1 → 5
    const withdrawVoucher = await withdrawHelper.signVoucher({
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
    const mtk1After = await MKT1.balanceOf(instructor1.address);
    const mtk2After = await MKT2.balanceOf(instructor1.address);
    const ethAfter = await ethers.provider.getBalance(instructor1.address);

    expect(mtk1After).to.be.gt(mtk1Before);
    expect(mtk2After).to.be.gt(mtk2Before);
    expect(ethAfter).to.be.gt(ethBefore); // withdraw sonrası eth arttı
  });

  // End of tests
});
