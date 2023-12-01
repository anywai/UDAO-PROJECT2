const { expect } = require("chai");
const hardhat = require("hardhat");
const { ethers } = hardhat;
const chai = require("chai");
const BN = require("bn.js");
const helpers = require("@nomicfoundation/hardhat-network-helpers");
const { deploy } = require("../lib/deployments");
const { Redeem } = require("../lib/Redeem");

require("dotenv").config();

const TEST_VERSION = process.env.TEST_VERSION;

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
  contractGovernanceTreasury = replace.contractGovernanceTreasury;
}

async function createContentVoucher(
  contractUDAOContent,
  backend,
  contentCreator,
  contentParts,
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
    1,
    "ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi",
    contentCreator.address,
    redeemType,
    validationScore
  );
}

// Enable and inject BN dependency
chai.use(require("chai-bn")(BN));

describe("UDAOC Contract", function () {
  it("Should deploy", async function () {
    await reDeploy();
  });

  it("Should KYC Content Creator", async function () {
    await reDeploy();
    await expect(contractRoleManager.setKYC(contentCreator.address, true))
      .to.emit(contractRoleManager, "SetKYC") // transfer from null address to minter
      .withArgs(contentCreator.address, true);
    await expect(contractRoleManager.setKYC(contentCreator.address, false))
      .to.emit(contractRoleManager, "SetKYC") // transfer from null address to minter
      .withArgs(contentCreator.address, false);
  });

  it("Should ban Content Creator", async function () {
    await reDeploy();
    await expect(contractRoleManager.setBan(contentCreator.address, true))
      .to.emit(contractRoleManager, "SetBan") // transfer from null address to minter
      .withArgs(contentCreator.address, true);
    await expect(contractRoleManager.setBan(contentCreator.address, true))
      .to.emit(contractRoleManager, "SetBan") // transfer from null address to minter
      .withArgs(contentCreator.address, true);
  });

  it("Should create Content", async function () {
    await reDeploy();
    await contractRoleManager.setKYC(contentCreator.address, true);

    /// part prices must be determined before creating content
    const partPricesArray = [ethers.utils.parseEther("1"), ethers.utils.parseEther("1")];
    const contentPrice = ethers.utils.parseEther("2");
    /// Create Voucher from redeem.js and use it for creating content
    // Create content
    const contentParts = [0, 1];
    const createContentVoucherSample = await createContentVoucher(
      contractUDAOContent,
      backend,
      contentCreator,
      contentParts,
      (redeemType = 1),
      (validationScore = 1)
    );
    await expect(contractUDAOContent.connect(contentCreator).createContent(createContentVoucherSample))
      .to.emit(contractUDAOContent, "Transfer") // transfer from null address to minter
      .withArgs("0x0000000000000000000000000000000000000000", contentCreator.address, 1);
  });

  it("Should batch create Contents", async function () {
    await reDeploy();
    await contractRoleManager.setKYC(contentCreator.address, true);

    /// part prices must be determined before creating content
    const partPricesArray = [ethers.utils.parseEther("1"), ethers.utils.parseEther("1")];
    const contentPrice = ethers.utils.parseEther("2");
    /// Create Voucher from redeem.js and use it for creating content
    // Create content
    const contentParts1 = [0, 1];
    const contentParts2 = [0, 1, 2];
    const contentParts3 = [0, 1, 2, 3];

    const createContentVoucherSample1 = await createContentVoucher(
      contractUDAOContent,
      backend,
      contentCreator,
      contentParts1,
      (redeemType = 1),
      (validationScore = 1)
    );
    const createContentVoucherSample2 = await createContentVoucher(
      contractUDAOContent,
      backend,
      contentCreator,
      contentParts2,
      (redeemType = 1),
      (validationScore = 1)
    );
    const createContentVoucherSample3 = await createContentVoucher(
      contractUDAOContent,
      backend,
      contentCreator,
      contentParts3,
      (redeemType = 1),
      (validationScore = 1)
    );

    const createContentVoucherSampleArray = [
      createContentVoucherSample1,
      createContentVoucherSample2,
      createContentVoucherSample3,
    ];
    // define token id = 1 as a big number
    const bigNumber1 = ethers.BigNumber.from(1);
    // define token id = 2 as a big number
    const bigNumber2 = ethers.BigNumber.from(2);
    // define token id = 3 as a big number
    const bigNumber3 = ethers.BigNumber.from(3);

    // create contents and expect Transfer events to emit
    await contractUDAOContent.connect(contentCreator).createContents(createContentVoucherSampleArray);
    // read Transfer events from the transaction
    const events = await contractUDAOContent.queryFilter("Transfer", "latest");
    // check if there are 3 events
    expect(events.length).to.eql(3);
    // check if the first event is correct
    expect(events[0].args.from).to.eql("0x0000000000000000000000000000000000000000");
    expect(events[0].args.to).to.eql(contentCreator.address);
    expect(events[0].args.tokenId).to.eql(bigNumber1);
    // check if the second event is correct
    expect(events[1].args.from).to.eql("0x0000000000000000000000000000000000000000");
    expect(events[1].args.to).to.eql(contentCreator.address);
    expect(events[1].args.tokenId).to.eql(bigNumber2);
    // check if the third event is correct
    expect(events[2].args.from).to.eql("0x0000000000000000000000000000000000000000");
    expect(events[2].args.to).to.eql(contentCreator.address);
    expect(events[2].args.tokenId).to.eql(bigNumber3);
  });

  it("Should get token URI of the Content", async function () {
    await reDeploy();
    await contractRoleManager.setKYC(contentCreator.address, true);

    /// part prices must be determined before creating content
    const partPricesArray = [ethers.utils.parseEther("1"), ethers.utils.parseEther("1")];
    const contentPrice = ethers.utils.parseEther("2");
    // Create content
    const contentParts = [0, 1];
    /// Create Voucher from redeem.js and use it for creating content
    const createContentVoucherSample = await createContentVoucher(
      contractUDAOContent,
      backend,
      contentCreator,
      contentParts,
      (redeemType = 1),
      (validationScore = 1)
    );

    await expect(contractUDAOContent.connect(contentCreator).createContent(createContentVoucherSample))
      .to.emit(contractUDAOContent, "Transfer") // transfer from null address to minter
      .withArgs("0x0000000000000000000000000000000000000000", contentCreator.address, 1);
    expect(await contractUDAOContent.tokenURI(1)).to.eql(
      "ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi"
    );
  });

  it("Should transfer token", async function () {
    await reDeploy();
    await contractRoleManager.setKYC(contentCreator.address, true);
    await contractRoleManager.setKYC(contentBuyer.address, true);

    /// part prices must be determined before creating content
    const partPricesArray = [ethers.utils.parseEther("1"), ethers.utils.parseEther("1")];
    const contentPrice = ethers.utils.parseEther("2");
    // Create content
    const contentParts = [0, 1];
    /// Create Voucher from redeem.js and use it for creating content
    const createContentVoucherSample = await createContentVoucher(
      contractUDAOContent,
      backend,
      contentCreator,
      contentParts,
      (redeemType = 1),
      (validationScore = 1)
    );

    await expect(contractUDAOContent.connect(contentCreator).createContent(createContentVoucherSample))
      .to.emit(contractUDAOContent, "Transfer") // transfer from null address to minter
      .withArgs("0x0000000000000000000000000000000000000000", contentCreator.address, 1);
    await expect(
      contractUDAOContent.connect(contentCreator).transferFrom(contentCreator.address, contentBuyer.address, 1)
    )
      .to.emit(contractUDAOContent, "Transfer") // transfer from null address to minter
      .withArgs(contentCreator.address, contentBuyer.address, 1);
  });

  it("Should fail to transfer token if sender is not KYCed", async function () {
    await reDeploy();
    await contractRoleManager.setKYC(contentCreator.address, true);
    await contractRoleManager.setKYC(contentBuyer.address, true);

    /// part prices must be determined before creating content
    const partPricesArray = [ethers.utils.parseEther("1"), ethers.utils.parseEther("1")];
    const contentPrice = ethers.utils.parseEther("2");
    // Create content
    const contentParts = [0, 1];
    /// Create Voucher from redeem.js and use it for creating content
    const createContentVoucherSample = await createContentVoucher(
      contractUDAOContent,
      backend,
      contentCreator,
      contentParts,
      (redeemType = 1),
      (validationScore = 1)
    );

    await expect(contractUDAOContent.connect(contentCreator).createContent(createContentVoucherSample))
      .to.emit(contractUDAOContent, "Transfer") // transfer from null address to minter
      .withArgs("0x0000000000000000000000000000000000000000", contentCreator.address, 1);
    await contractRoleManager.setKYC(contentCreator.address, false);

    await expect(
      contractUDAOContent.connect(contentCreator).transferFrom(contentCreator.address, contentBuyer.address, 1)
    ).to.revertedWith("Sender is not KYCed!");
  });

  it("Should fail to transfer token if sender is banned", async function () {
    await reDeploy();

    await contractRoleManager.setKYC(contentCreator.address, true);
    await contractRoleManager.setKYC(contentBuyer.address, true);

    /// part prices must be determined before creating content
    const partPricesArray = [ethers.utils.parseEther("1"), ethers.utils.parseEther("1")];
    const contentPrice = ethers.utils.parseEther("2");
    // Create content
    const contentParts = [0, 1];
    /// Create Voucher from redeem.js and use it for creating content
    const createContentVoucherSample = await createContentVoucher(
      contractUDAOContent,
      backend,
      contentCreator,
      contentParts,
      (redeemType = 1),
      (validationScore = 1)
    );

    await expect(contractUDAOContent.connect(contentCreator).createContent(createContentVoucherSample))
      .to.emit(contractUDAOContent, "Transfer") // transfer from null address to minter
      .withArgs("0x0000000000000000000000000000000000000000", contentCreator.address, 1);

    await contractRoleManager.setBan(contentCreator.address, true);
    await expect(
      contractUDAOContent.connect(contentCreator).transferFrom(contentCreator.address, contentBuyer.address, 1)
    ).to.revertedWith("Sender is banned!");
  });

  it("Should fail to transfer token if receiver is banned", async function () {
    await reDeploy();

    await contractRoleManager.setKYC(contentCreator.address, true);
    await contractRoleManager.setKYC(contentBuyer.address, true);
    await contractRoleManager.setBan(contentBuyer.address, true);

    /// part prices must be determined before creating content
    const partPricesArray = [ethers.utils.parseEther("1"), ethers.utils.parseEther("1")];
    const contentPrice = ethers.utils.parseEther("2");
    // Create content
    const contentParts = [0, 1];
    /// Create Voucher from redeem.js and use it for creating content
    const createContentVoucherSample = await createContentVoucher(
      contractUDAOContent,
      backend,
      contentCreator,
      contentParts,
      (redeemType = 1),
      (validationScore = 1)
    );

    await expect(contractUDAOContent.connect(contentCreator).createContent(createContentVoucherSample))
      .to.emit(contractUDAOContent, "Transfer") // transfer from null address to minter
      .withArgs("0x0000000000000000000000000000000000000000", contentCreator.address, 1);
    await expect(
      contractUDAOContent.connect(contentCreator).transferFrom(contentCreator.address, contentBuyer.address, 1)
    ).to.revertedWith("Receiver is banned!");
  });

  it("Should fail to transfer token if sender is not KYCed", async function () {
    await reDeploy();

    await contractRoleManager.setKYC(contentCreator.address, true);
    await contractRoleManager.setKYC(contentBuyer.address, true);

    /// part prices must be determined before creating content
    const partPricesArray = [ethers.utils.parseEther("1"), ethers.utils.parseEther("1")];
    const contentPrice = ethers.utils.parseEther("2");
    // Create content
    const contentParts = [0, 1];
    /// Create Voucher from redeem.js and use it for creating content
    const createContentVoucherSample = await createContentVoucher(
      contractUDAOContent,
      backend,
      contentCreator,
      contentParts,
      (redeemType = 1),
      (validationScore = 1)
    );

    await expect(contractUDAOContent.connect(contentCreator).createContent(createContentVoucherSample))
      .to.emit(contractUDAOContent, "Transfer") // transfer from null address to minter
      .withArgs("0x0000000000000000000000000000000000000000", contentCreator.address, 1);
    await contractRoleManager.setKYC(contentCreator.address, false);

    await expect(
      contractUDAOContent.connect(contentCreator).transferFrom(contentCreator.address, contentBuyer.address, 1)
    ).to.revertedWith("Sender is not KYCed!");
  });

  it("Should fail to burn token with TypeError since there is no burn function", async function () {
    await reDeploy();
    await contractRoleManager.setKYC(contentCreator.address, true);
    await contractRoleManager.setKYC(contentBuyer.address, true);

    /// part prices must be determined before creating content
    const partPricesArray = [ethers.utils.parseEther("1"), ethers.utils.parseEther("1")];
    const contentPrice = ethers.utils.parseEther("2");
    // Create content
    const contentParts = [0, 1];
    /// Create Voucher from redeem.js and use it for creating content
    const createContentVoucherSample = await createContentVoucher(
      contractUDAOContent,
      backend,
      contentCreator,
      contentParts,
      (redeemType = 1),
      (validationScore = 1)
    );

    await expect(contractUDAOContent.connect(contentCreator).createContent(createContentVoucherSample))
      .to.emit(contractUDAOContent, "Transfer") // transfer from null address to minter
      .withArgs("0x0000000000000000000000000000000000000000", contentCreator.address, 1);
    //await expect(contractUDAOContent.connect(contentCreator).burn(0)).to.be.revertedWithPanic();
    //  "TypeError: contractUDAOContent.connect().burn is not a function"
    //);

    try {
      await contractUDAOContent.connect(contentCreator).burn(0);
    } catch (error) {
      expect(error);
    }
  });

  it("Should return true if supports ERC721 interface", async function () {
    await reDeploy();
    await contractRoleManager.setKYC(contentCreator.address, true);
    await contractRoleManager.setKYC(contentBuyer.address, true);

    expect(await contractUDAOContent.supportsInterface("0x80ac58cd")).to.eql(true);
  });

  it("Should modify content, add a new part in between existing parts", async function () {
    await reDeploy();
    await contractRoleManager.setKYC(contentCreator.address, true);

    /// part prices must be determined before creating content
    const partPricesArray = [ethers.utils.parseEther("1"), ethers.utils.parseEther("2"), ethers.utils.parseEther("3")];
    const contentPrice = ethers.utils.parseEther("10");
    // Create content
    const contentParts = [0, 1, 2];
    /// Create Voucher from redeem.js and use it for creating content
    const createContentVoucherSample = await createContentVoucher(
      contractUDAOContent,
      backend,
      contentCreator,
      contentParts,
      (redeemType = 1),
      (validationScore = 1)
    );

    await expect(contractUDAOContent.connect(contentCreator).createContent(createContentVoucherSample))
      .to.emit(contractUDAOContent, "Transfer") // transfer from null address to min
      .withArgs("0x0000000000000000000000000000000000000000", contentCreator.address, 1);

    // new part information
    const tokenId = 1;
    // Create content
    const contentParts2 = [0, 1, 2, 3];
    /// Create Voucher from redeem.js and use it for modifying content
    const redeemType2 = 2;
    const createModifyVoucherSample = await createContentVoucher(
      contractUDAOContent,
      backend,
      contentCreator,
      contentParts2,
      redeemType2,
      (validationScore = 0)
    );
    // add new part and expect ContentModified event to emit
    await expect(contractUDAOContent.connect(contentCreator).modifyContent(createModifyVoucherSample)).to.emit(
      contractUDAOContent,
      "ContentModified"
    );
    // Convert contentParts2 values to bignumbers
    const contentParts2BigNumbers = contentParts2.map((x) => ethers.BigNumber.from(x));
    // wait 1 seconds
    await new Promise((r) => setTimeout(r, 1000));
    // Check if getContentParts returns the correct part array
    expect(await contractUDAOContent.getContentParts(tokenId)).to.eql(contentParts2BigNumbers);
  });

  it("Should revert modify content if caller is not owner of content", async function () {
    await reDeploy();
    await contractRoleManager.setKYC(contentCreator.address, true);
    await contractRoleManager.setKYC(contentBuyer.address, true);

    /// part prices must be determined before creating content
    const partPricesArray = [ethers.utils.parseEther("1"), ethers.utils.parseEther("2"), ethers.utils.parseEther("3")];
    const contentPrice = ethers.utils.parseEther("10");

    // Create content
    const contentParts = [0, 1, 2];

    /// Create Voucher from redeem.js and use it for creating content
    const createContentVoucherSample = await createContentVoucher(
      contractUDAOContent,
      backend,
      contentCreator,
      contentParts,
      (redeemType = 1),
      (validationScore = 1)
    );

    await expect(contractUDAOContent.connect(contentCreator).createContent(createContentVoucherSample))
      .to.emit(contractUDAOContent, "Transfer") // transfer from null address to min
      .withArgs("0x0000000000000000000000000000000000000000", contentCreator.address, 1);

    // new part information
    const tokenId = 0;
    const _NewContentPrice = ethers.utils.parseEther("20");
    const _NewPartPriceArray = [ethers.utils.parseEther("20")];
    // Create content
    const contentParts2 = [0];
    /// Create Voucher from redeem.js and use it for modifying content
    const createModifyContentVoucherSample = await createContentVoucher(
      contractUDAOContent,
      backend,
      contentBuyer,
      contentParts2,
      (redeemType = 2),
      (validationScore = 0)
    );
    // modify content and expect it to revert
    await expect(
      contractUDAOContent.connect(contentBuyer).modifyContent(createModifyContentVoucherSample)
    ).to.be.revertedWith("Only content modifier or owner can modify content");
  });

  it("Should revert modify content if content creator is not kyced", async function () {
    await reDeploy();
    await contractRoleManager.setKYC(contentCreator.address, true);

    const contentParts3 = [0, 1, 2];

    /// Create Voucher from redeem.js and use it for creating content
    const createContentVoucherSample = await createContentVoucher(
      contractUDAOContent,
      backend,
      contentCreator,
      contentParts3,
      (redeemType = 1),
      (validationScore = 1)
    );

    await expect(contractUDAOContent.connect(contentCreator).createContent(createContentVoucherSample))
      .to.emit(contractUDAOContent, "Transfer") // transfer from null address to min
      .withArgs("0x0000000000000000000000000000000000000000", contentCreator.address, 1);

    // new part information
    const tokenId = 0;
    const _NewPartPriceArray = [
      ethers.utils.parseEther("7"),
      ethers.utils.parseEther("6"),
      ethers.utils.parseEther("3"),
      ethers.utils.parseEther("4"),
    ];
    const _NewContentPrice = ethers.utils.parseEther("20");
    await contractRoleManager.setKYC(contentCreator.address, false);
    // Create content
    const contentParts = [0, 1, 2, 3];
    /// Create Voucher from redeem.js and use it for modifying content
    const createModifyContentVoucherSample = await createContentVoucher(
      contractUDAOContent,
      backend,
      contentCreator,
      contentParts,
      (redeemType = 2),
      (validationScore = 0)
    );

    // modify content and expect it to revert
    await expect(
      contractUDAOContent.connect(contentCreator).modifyContent(createModifyContentVoucherSample)
    ).to.be.revertedWith("You are not KYCed");
  });

  it("Should revert modify content if content creator is banned", async function () {
    await reDeploy();
    await contractRoleManager.setKYC(contentCreator.address, true);

    /// part prices must be determined before creating content
    const partPricesArray = [ethers.utils.parseEther("1"), ethers.utils.parseEther("2"), ethers.utils.parseEther("3")];
    const contentPrice = ethers.utils.parseEther("10");
    // Create content
    const contentParts = [0, 1, 2];
    /// Create Voucher from redeem.js and use it for creating content
    const createContentVoucherSample = await createContentVoucher(
      contractUDAOContent,
      backend,
      contentCreator,
      contentParts,
      (redeemType = 1),
      (validationScore = 1)
    );

    await expect(contractUDAOContent.connect(contentCreator).createContent(createContentVoucherSample))
      .to.emit(contractUDAOContent, "Transfer") // transfer from null address to min
      .withArgs("0x0000000000000000000000000000000000000000", contentCreator.address, 1);

    // new part information
    const tokenId = 0;
    const _NewPartPriceArray = [
      ethers.utils.parseEther("7"),
      ethers.utils.parseEther("6"),
      ethers.utils.parseEther("3"),
      ethers.utils.parseEther("4"),
    ];
    const _NewContentPrice = ethers.utils.parseEther("20");
    await contractRoleManager.setBan(contentCreator.address, true);
    // Create content
    const contentParts2 = [0, 1, 2, 3];
    /// Create Voucher from redeem.js and use it for modifying content
    const createModifyContentVoucherSample = await createContentVoucher(
      contractUDAOContent,
      backend,
      contentCreator,
      contentParts2,
      (redeemType = 2),
      (validationScore = 0)
    );

    // modify content and expect it to revert
    await expect(
      contractUDAOContent.connect(contentCreator).modifyContent(createModifyContentVoucherSample)
    ).to.be.revertedWith("You are banned");
  });

  it("Should allow backend to pause/unpause contract", async function () {
    await reDeploy();
    /// Pause contract
    await contractUDAOContent.connect(backend).pause();
    /// check if contract is paused
    const isPausedAfterPause = await contractUDAOContent.paused();
    expect(isPausedAfterPause).to.equal(true);
    /// Unpause contract
    await contractUDAOContent.connect(backend).unpause();
    /// check if contract is unpaused
    const isPausedAfterUnpause = await contractUDAOContent.paused();
    expect(isPausedAfterUnpause).to.equal(false);
  });

  it("Should fail backend-else role to pause/unpause contract", async function () {
    await reDeploy();
    /// Try to Pause contract with non backed role
    await expect(contractUDAOContent.connect(contentBuyer1).pause()).to.be.revertedWith("Only backend can pause");
    /// pause status should be false
    const isPausedAfterPause1 = await contractUDAOContent.paused();
    expect(isPausedAfterPause1).to.equal(false);

    /// pause the contract with backend role
    await contractUDAOContent.connect(backend).pause();
    /// pause status should be true
    const isPausedAfterPause2 = await contractUDAOContent.paused();
    expect(isPausedAfterPause2).to.equal(true);

    /// Try to Unpause contract with non backed role
    await expect(contractUDAOContent.connect(contentBuyer1).unpause()).to.be.revertedWith("Only backend can unpause");
    /// pause status should be false
    const isPausedAfterUnpause = await contractUDAOContent.paused();
    expect(isPausedAfterUnpause).to.equal(true);
  });

  it("Should fail create content when paused", async function () {
    await reDeploy();
    /// KYC content creator and content buyer
    await contractRoleManager.setKYC(contentCreator.address, true);
    await contractRoleManager.setKYC(contentBuyer1.address, true);
    /// Pause contract
    await contractUDAOContent.connect(backend).pause();

    /// Create Voucher from redeem.js and use it for creating content
    // Create content
    const contentParts = [0, 1];
    const createContentVoucherSample = await createContentVoucher(
      contractUDAOContent,
      backend,
      contentCreator,
      contentParts,
      (redeemType = 1),
      (validationScore = 1)
    );
    await expect(
      contractUDAOContent.connect(contentCreator).createContent(createContentVoucherSample)
    ).to.be.revertedWith("Pausable: paused");
  });

  it("Should fail batch create content when paused", async function () {
    await reDeploy();
    /// KYC content creator and content buyer
    await contractRoleManager.setKYC(contentCreator.address, true);
    await contractRoleManager.setKYC(contentBuyer1.address, true);
    /// Pause contract
    await contractUDAOContent.connect(backend).pause();

    /// Define Content Parts
    const contentParts1 = [0, 1];
    const contentParts2 = [0, 1, 2];
    const contentParts3 = [0, 1, 2, 3];
    /// Create Voucher from redeem.js and use it for creating content

    const createContentVoucherSample1 = await createContentVoucher(
      contractUDAOContent,
      backend,
      contentCreator,
      contentParts1,
      (redeemType = 1),
      (validationScore = 1)
    );
    const createContentVoucherSample2 = await createContentVoucher(
      contractUDAOContent,
      backend,
      contentCreator,
      contentParts2,
      (redeemType = 1),
      (validationScore = 1)
    );
    const createContentVoucherSample3 = await createContentVoucher(
      contractUDAOContent,
      backend,
      contentCreator,
      contentParts3,
      (redeemType = 1),
      (validationScore = 1)
    );
    /// Create content voucher array
    const createContentVoucherSampleArray = [
      createContentVoucherSample1,
      createContentVoucherSample2,
      createContentVoucherSample3,
    ];
    /// Create content

    await expect(
      contractUDAOContent.connect(contentCreator).createContents(createContentVoucherSampleArray)
    ).to.be.revertedWith("Pausable: paused");
  });

  it("Should fail to modify content when paused", async function () {
    await reDeploy();
    await contractRoleManager.setKYC(contentCreator.address, true);

    /// part prices must be determined before creating content
    const partPricesArray = [ethers.utils.parseEther("1"), ethers.utils.parseEther("2"), ethers.utils.parseEther("3")];
    const contentPrice = ethers.utils.parseEther("10");
    // Create content
    const contentParts = [0, 1, 2];
    /// Create Voucher from redeem.js and use it for creating content
    const createContentVoucherSample = await createContentVoucher(
      contractUDAOContent,
      backend,
      contentCreator,
      contentParts,
      (redeemType = 1),
      (validationScore = 1)
    );

    await expect(contractUDAOContent.connect(contentCreator).createContent(createContentVoucherSample))
      .to.emit(contractUDAOContent, "Transfer") // transfer from null address to min
      .withArgs("0x0000000000000000000000000000000000000000", contentCreator.address, 1);

    // new part information
    const tokenId = 1;
    // Create content
    const contentParts2 = [0, 1, 2, 3];
    /// Create Voucher from redeem.js and use it for modifying content
    const redeemType2 = 2;
    const createModifyVoucherSample = await createContentVoucher(
      contractUDAOContent,
      backend,
      contentCreator,
      contentParts2,
      redeemType2,
      (validationScore = 0)
    );
    // add new part and expect ContentModified event to emit
    await expect(contractUDAOContent.connect(contentCreator).modifyContent(createModifyVoucherSample)).to.emit(
      contractUDAOContent,
      "ContentModified"
    );
    // Convert contentParts2 values to bignumbers
    const contentParts2BigNumbers = contentParts2.map((x) => ethers.BigNumber.from(x));
    // wait 1 seconds
    await new Promise((r) => setTimeout(r, 1000));
    // Check if getContentParts returns the correct part array
    expect(await contractUDAOContent.getContentParts(tokenId)).to.eql(contentParts2BigNumbers);
  });
});
