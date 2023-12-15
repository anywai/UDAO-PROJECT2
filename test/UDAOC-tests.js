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
  redeemer,
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
    redeemer.address,
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

  it("Should allow backend to set update addresses", async function () {
    await reDeploy();
    const newRoleManagerAddress = contractRoleManager.address;
    const newSupervisionAddress = contractSupervision.address;

    await expect(contractUDAOContent.connect(backend).updateAddresses(newRoleManagerAddress, newSupervisionAddress))
      .to.emit(contractUDAOContent, "AddressesUpdated")
      .withArgs(newRoleManagerAddress, newSupervisionAddress);
  });

  it("Should allow foundation to update addresses after ownership of contract transfered", async function () {
    await reDeploy();
    const newRoleManagerAddress = contractRoleManager.address;
    const newSupervisionAddress = contractSupervision.address;

    await expect(contractUDAOContent.connect(foundation).updateAddresses(newRoleManagerAddress, newSupervisionAddress))
      .to.emit(contractUDAOContent, "AddressesUpdated")
      .withArgs(newRoleManagerAddress, newSupervisionAddress);
  });

  it("Should fail foundation-else or backend-else role to update addresses", async function () {
    await reDeploy();
    const newRoleManagerAddress = contractRoleManager.address;
    const newSupervisionAddress = contractSupervision.address;

    await expect(
      contractUDAOContent.connect(contentBuyer1).updateAddresses(newRoleManagerAddress, newSupervisionAddress)
    ).to.be.revertedWith("Only backend and contract manager can update addresses");
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
    const redeemer = contentCreator;

    /// Create Voucher from redeem.js and use it for creating content
    // Create content
    const contentParts = [0, 1];
    const createContentVoucherSample = await createContentVoucher(
      contractUDAOContent,
      backend,
      contentCreator,
      redeemer,
      contentParts,
      (redeemType = 1),
      (validationScore = 0)
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
    const redeemer = contentCreator;
    /// Create Voucher from redeem.js and use it for creating content
    // Create content
    const contentParts1 = [0, 1];
    const contentParts2 = [0, 1, 2];
    const contentParts3 = [0, 1, 2, 3];

    const createContentVoucherSample1 = await createContentVoucher(
      contractUDAOContent,
      backend,
      contentCreator,
      redeemer,
      contentParts1,
      (redeemType = 1),
      (validationScore = 0)
    );
    const createContentVoucherSample2 = await createContentVoucher(
      contractUDAOContent,
      backend,
      contentCreator,
      redeemer,
      contentParts2,
      (redeemType = 1),
      (validationScore = 0)
    );
    const createContentVoucherSample3 = await createContentVoucher(
      contractUDAOContent,
      backend,
      contentCreator,
      redeemer,
      contentParts3,
      (redeemType = 1),
      (validationScore = 0)
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
    await contractUDAOContent.connect(contentCreator).batchCreateContents(createContentVoucherSampleArray);
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

  it("Should exist and batch exist functions return true if a content created for given tokenid", async function () {
    await reDeploy();
    await contractRoleManager.setKYC(contentCreator.address, true);

    // check token id 1,2,3 is not exist by using exist function
    expect(await contractUDAOContent.connect(contentBuyer1).exists(1)).to.eql(false);
    expect(await contractUDAOContent.connect(contentBuyer1).exists(2)).to.eql(false);
    expect(await contractUDAOContent.connect(contentBuyer1).exists(3)).to.eql(false);
    // check token id 1,2,3 is not exist by using batch exist function
    const batchExistArray = await contractUDAOContent.connect(contentBuyer1).existsBatch([1, 2, 3]);
    expect(batchExistArray).to.eql([false, false, false]);

    /// part prices must be determined before creating content
    const partPricesArray = [ethers.utils.parseEther("1"), ethers.utils.parseEther("1")];
    const contentPrice = ethers.utils.parseEther("2");
    const redeemer = contentCreator;
    /// Create Voucher from redeem.js and use it for creating content
    // Create content
    const contentParts1 = [0, 1];
    const contentParts2 = [0, 1, 2];
    const contentParts3 = [0, 1, 2, 3];

    const createContentVoucherSample1 = await createContentVoucher(
      contractUDAOContent,
      backend,
      contentCreator,
      redeemer,
      contentParts1,
      (redeemType = 1),
      (validationScore = 1)
    );
    const createContentVoucherSample2 = await createContentVoucher(
      contractUDAOContent,
      backend,
      contentCreator,
      redeemer,
      contentParts2,
      (redeemType = 1),
      (validationScore = 1)
    );
    const createContentVoucherSample3 = await createContentVoucher(
      contractUDAOContent,
      backend,
      contentCreator,
      redeemer,
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
    await contractUDAOContent.connect(backend).batchCreateContents(createContentVoucherSampleArray);
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

    // check token id 1,2,3 is exist by using exist function after content creation
    expect(await contractUDAOContent.connect(contentBuyer1).exists(1)).to.eql(true);
    expect(await contractUDAOContent.connect(contentBuyer1).exists(2)).to.eql(true);
    expect(await contractUDAOContent.connect(contentBuyer1).exists(3)).to.eql(true);
    // check token id 1,2,3 is exist by using batch exist function after content creation
    const batchExistArray2 = await contractUDAOContent.connect(contentBuyer1).existsBatch([1, 2, 3]);
    expect(batchExistArray2).to.eql([true, true, true]);
  });

  it("Should get token URI of the Content", async function () {
    await reDeploy();
    await contractRoleManager.setKYC(contentCreator.address, true);

    /// part prices must be determined before creating content
    const partPricesArray = [ethers.utils.parseEther("1"), ethers.utils.parseEther("1")];
    const contentPrice = ethers.utils.parseEther("2");
    const redeemer = contentCreator;
    // Create content
    const contentParts = [0, 1];
    /// Create Voucher from redeem.js and use it for creating content
    const createContentVoucherSample = await createContentVoucher(
      contractUDAOContent,
      backend,
      contentCreator,
      redeemer,
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
    const redeemer = contentCreator;
    // Create content
    const contentParts = [0, 1];
    /// Create Voucher from redeem.js and use it for creating content
    const createContentVoucherSample = await createContentVoucher(
      contractUDAOContent,
      backend,
      contentCreator,
      redeemer,
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
    const redeemer = contentCreator;
    // Create content
    const contentParts = [0, 1];
    /// Create Voucher from redeem.js and use it for creating content
    const createContentVoucherSample = await createContentVoucher(
      contractUDAOContent,
      backend,
      contentCreator,
      redeemer,
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
    const redeemer = contentCreator;
    // Create content
    const contentParts = [0, 1];
    /// Create Voucher from redeem.js and use it for creating content
    const createContentVoucherSample = await createContentVoucher(
      contractUDAOContent,
      backend,
      contentCreator,
      redeemer,
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
    const redeemer = contentCreator;
    // Create content
    const contentParts = [0, 1];
    /// Create Voucher from redeem.js and use it for creating content
    const createContentVoucherSample = await createContentVoucher(
      contractUDAOContent,
      backend,
      contentCreator,
      redeemer,
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

  it("Should fail to transfer token if receiver is not KYCed", async function () {
    await reDeploy();

    await contractRoleManager.setKYC(contentCreator.address, true);
    await contractRoleManager.setKYC(contentBuyer.address, false);

    /// part prices must be determined before creating content
    const partPricesArray = [ethers.utils.parseEther("1"), ethers.utils.parseEther("1")];
    const contentPrice = ethers.utils.parseEther("2");
    const redeemer = contentCreator;
    // Create content
    const contentParts = [0, 1];
    /// Create Voucher from redeem.js and use it for creating content
    const createContentVoucherSample = await createContentVoucher(
      contractUDAOContent,
      backend,
      contentCreator,
      redeemer,
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
    ).to.revertedWith("Receiver is not KYCed!");
  });

  it("Should backend burn a token if burn allowed", async function () {
    await reDeploy();
    await contractRoleManager.setKYC(contentCreator.address, true);

    /// part prices must be determined before creating content
    const partPricesArray = [ethers.utils.parseEther("1"), ethers.utils.parseEther("1")];
    const contentPrice = ethers.utils.parseEther("2");
    const redeemer = contentCreator;

    /// Create Voucher from redeem.js and use it for creating content
    // Create content
    const contentParts = [0, 1];
    const createContentVoucherSample = await createContentVoucher(
      contractUDAOContent,
      backend,
      contentCreator,
      redeemer,
      contentParts,
      (redeemType = 1),
      (validationScore = 1)
    );
    await expect(contractUDAOContent.connect(contentCreator).createContent(createContentVoucherSample))
      .to.emit(contractUDAOContent, "Transfer") // transfer from null address to minter
      .withArgs("0x0000000000000000000000000000000000000000", contentCreator.address, 1);
    // check if token id 1 is exist
    expect(await contractUDAOContent.connect(contentCreator).exists(1)).to.eql(true);

    // allow burn by governance_role
    await contractRoleManager.connect(foundation).grantRole(GOVERNANCE_ROLE, contentBuyer1.address);
    await contractUDAOContent.connect(contentBuyer1).setIsAllowedToBurn(true);

    // burn token and expect Transfer event to emit
    await expect(contractUDAOContent.connect(backend).burn(1))
      .to.emit(contractUDAOContent, "Transfer")
      .withArgs(contentCreator.address, "0x0000000000000000000000000000000000000000", 1);

    // check if token id 1 is not exist
    expect(await contractUDAOContent.connect(contentCreator).exists(1)).to.eql(false);
  });

  it("Should fail backend to burn a token if burn not allowed by governance", async function () {
    await reDeploy();
    await contractRoleManager.setKYC(contentCreator.address, true);

    /// part prices must be determined before creating content
    const partPricesArray = [ethers.utils.parseEther("1"), ethers.utils.parseEther("1")];
    const contentPrice = ethers.utils.parseEther("2");
    const redeemer = contentCreator;

    /// Create Voucher from redeem.js and use it for creating content
    // Create content
    const contentParts = [0, 1];
    const createContentVoucherSample = await createContentVoucher(
      contractUDAOContent,
      backend,
      contentCreator,
      redeemer,
      contentParts,
      (redeemType = 1),
      (validationScore = 1)
    );
    await expect(contractUDAOContent.connect(contentCreator).createContent(createContentVoucherSample))
      .to.emit(contractUDAOContent, "Transfer") // transfer from null address to minter
      .withArgs("0x0000000000000000000000000000000000000000", contentCreator.address, 1);
    // check if token id 1 is exist
    expect(await contractUDAOContent.connect(contentCreator).exists(1)).to.eql(true);

    // burn token and expect Transfer event to emit
    await expect(contractUDAOContent.connect(backend).burn(1)).to.revertedWith("Burning is not allowed by governance");

    // check if token id 1 is not exist
    expect(await contractUDAOContent.connect(contentCreator).exists(1)).to.eql(true);
  });

  it("Should fail burn a token if caller isnt backend", async function () {
    await reDeploy();
    await contractRoleManager.setKYC(contentCreator.address, true);

    /// part prices must be determined before creating content
    const partPricesArray = [ethers.utils.parseEther("1"), ethers.utils.parseEther("1")];
    const contentPrice = ethers.utils.parseEther("2");
    const redeemer = contentCreator;

    /// Create Voucher from redeem.js and use it for creating content
    // Create content
    const contentParts = [0, 1];
    const createContentVoucherSample = await createContentVoucher(
      contractUDAOContent,
      backend,
      contentCreator,
      redeemer,
      contentParts,
      (redeemType = 1),
      (validationScore = 1)
    );
    await expect(contractUDAOContent.connect(contentCreator).createContent(createContentVoucherSample))
      .to.emit(contractUDAOContent, "Transfer") // transfer from null address to minter
      .withArgs("0x0000000000000000000000000000000000000000", contentCreator.address, 1);
    // check if token id 1 is exist
    expect(await contractUDAOContent.connect(contentCreator).exists(1)).to.eql(true);

    // allow burn by governance_role
    await contractRoleManager.connect(foundation).grantRole(GOVERNANCE_ROLE, contentBuyer1.address);
    await contractUDAOContent.connect(contentBuyer1).setIsAllowedToBurn(true);

    // burn token and expect Transfer event to emit
    await expect(contractUDAOContent.connect(contentCreator).burn(1)).to.revertedWith(
      "Only backend can burn a content"
    );

    // check if token id 1 is exist
    expect(await contractUDAOContent.connect(contentCreator).exists(1)).to.eql(true);
  });

  it("Should fail governance else role to allow to burn a token", async function () {
    await reDeploy();
    await contractRoleManager.setKYC(contentCreator.address, true);

    /// part prices must be determined before creating content
    const partPricesArray = [ethers.utils.parseEther("1"), ethers.utils.parseEther("1")];
    const contentPrice = ethers.utils.parseEther("2");
    const redeemer = contentCreator;

    /// Create Voucher from redeem.js and use it for creating content
    // Create content
    const contentParts = [0, 1];
    const createContentVoucherSample = await createContentVoucher(
      contractUDAOContent,
      backend,
      contentCreator,
      redeemer,
      contentParts,
      (redeemType = 1),
      (validationScore = 1)
    );
    await expect(contractUDAOContent.connect(contentCreator).createContent(createContentVoucherSample))
      .to.emit(contractUDAOContent, "Transfer") // transfer from null address to minter
      .withArgs("0x0000000000000000000000000000000000000000", contentCreator.address, 1);
    // check if token id 1 is exist
    expect(await contractUDAOContent.connect(contentCreator).exists(1)).to.eql(true);

    // try to allow burn rights by governance else role
    await expect(contractUDAOContent.connect(contentCreator).setIsAllowedToBurn(true)).to.be.revertedWith(
      "Only governance can allow to burning"
    );

    // allow burn by governance_role
    await contractRoleManager.connect(foundation).grantRole(GOVERNANCE_ROLE, contentBuyer1.address);
    await contractUDAOContent.connect(contentBuyer1).setIsAllowedToBurn(true);

    // burn token and expect Transfer event to emit
    await expect(contractUDAOContent.connect(backend).burn(1))
      .to.emit(contractUDAOContent, "Transfer")
      .withArgs(contentCreator.address, "0x0000000000000000000000000000000000000000", 1);

    // check if token id 1 is not exist
    expect(await contractUDAOContent.connect(contentCreator).exists(1)).to.eql(false);
  });

  it("Should fail to burn token with TypeError since there is no burn function", async function () {
    await reDeploy();
    await contractRoleManager.setKYC(contentCreator.address, true);
    await contractRoleManager.setKYC(contentBuyer.address, true);

    /// part prices must be determined before creating content
    const partPricesArray = [ethers.utils.parseEther("1"), ethers.utils.parseEther("1")];
    const contentPrice = ethers.utils.parseEther("2");
    const redeemer = contentCreator;
    // Create content
    const contentParts = [0, 1];
    /// Create Voucher from redeem.js and use it for creating content
    const createContentVoucherSample = await createContentVoucher(
      contractUDAOContent,
      backend,
      contentCreator,
      redeemer,
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

  it("Should fail to change sellable status if caller is not backed", async function () {
    await reDeploy();
    await contractRoleManager.setKYC(contentCreator.address, true);

    /// part prices must be determined before creating content
    const partPricesArray = [ethers.utils.parseEther("1"), ethers.utils.parseEther("1")];
    const contentPrice = ethers.utils.parseEther("2");
    const redeemer = contentCreator;

    /// Create Voucher from redeem.js and use it for creating content
    // Create content
    const contentParts = [0, 1];
    const createContentVoucherSample = await createContentVoucher(
      contractUDAOContent,
      backend,
      contentCreator,
      redeemer,
      contentParts,
      (redeemType = 1),
      (validationScore = 1)
    );
    await expect(contractUDAOContent.connect(contentCreator).createContent(createContentVoucherSample))
      .to.emit(contractUDAOContent, "Transfer") // transfer from null address to minter
      .withArgs("0x0000000000000000000000000000000000000000", contentCreator.address, 1);

    // try to change sellable status and expect it to revert
    await expect(contractUDAOContent.connect(contentBuyer1).setSellable(1, false)).to.be.revertedWith(
      "Only sale controller can set sellable"
    );
    const isSellable = await contractUDAOContent.isSellable(1);
    expect(isSellable).to.eql(true);
    // try to change sellable status with backend(Sale_Controller) account and expect a status change
    await contractUDAOContent.connect(backend).setSellable(1, false);
    expect(await contractUDAOContent.isSellable(1)).to.eql(false);
  });

  it("Should modify content, add a new part in between existing parts", async function () {
    await reDeploy();
    await contractRoleManager.setKYC(contentCreator.address, true);

    /// part prices must be determined before creating content
    const partPricesArray = [ethers.utils.parseEther("1"), ethers.utils.parseEther("2"), ethers.utils.parseEther("3")];
    const contentPrice = ethers.utils.parseEther("10");
    const redeemer = contentCreator;
    // Create content
    const contentParts = [0, 1, 2];
    /// Create Voucher from redeem.js and use it for creating content
    const createContentVoucherSample = await createContentVoucher(
      contractUDAOContent,
      backend,
      contentCreator,
      redeemer,
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
      redeemer,
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

  it("Should revert modify content if caller is not redeemer", async function () {
    await reDeploy();
    await contractRoleManager.setKYC(contentCreator.address, true);
    await contractRoleManager.setKYC(contentBuyer.address, true);

    /// part prices must be determined before creating content
    const partPricesArray = [ethers.utils.parseEther("1"), ethers.utils.parseEther("2"), ethers.utils.parseEther("3")];
    const contentPrice = ethers.utils.parseEther("10");
    const redeemer = contentCreator;

    // Create content
    const contentParts = [0, 1, 2];

    /// Create Voucher from redeem.js and use it for creating content
    const createContentVoucherSample = await createContentVoucher(
      contractUDAOContent,
      backend,
      contentCreator,
      redeemer,
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
      redeemer,
      contentParts2,
      (redeemType = 2),
      (validationScore = 0)
    );
    // modify content and expect it to revert
    await expect(
      contractUDAOContent.connect(contentBuyer).modifyContent(createModifyContentVoucherSample)
    ).to.be.revertedWith("Only content publisher or content owner can modify content");
  });

  it("Should revert modify content if content creator is not kyced", async function () {
    await reDeploy();
    await contractRoleManager.setKYC(contentCreator.address, true);

    const contentParts3 = [0, 1, 2];
    const redeemer = contentCreator;
    /// Create Voucher from redeem.js and use it for creating content
    const createContentVoucherSample = await createContentVoucher(
      contractUDAOContent,
      backend,
      contentCreator,
      redeemer,
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
      redeemer,
      contentParts,
      (redeemType = 2),
      (validationScore = 0)
    );

    // modify content and expect it to revert
    await expect(
      contractUDAOContent.connect(contentCreator).modifyContent(createModifyContentVoucherSample)
    ).to.be.revertedWith("Content creator isnt KYCed");
  });

  it("Should revert modify content if content creator is banned", async function () {
    await reDeploy();
    await contractRoleManager.setKYC(contentCreator.address, true);

    /// part prices must be determined before creating content
    const partPricesArray = [ethers.utils.parseEther("1"), ethers.utils.parseEther("2"), ethers.utils.parseEther("3")];
    const contentPrice = ethers.utils.parseEther("10");
    const redeemer = contentCreator;
    // Create content
    const contentParts = [0, 1, 2];
    /// Create Voucher from redeem.js and use it for creating content
    const createContentVoucherSample = await createContentVoucher(
      contractUDAOContent,
      backend,
      contentCreator,
      redeemer,
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
      redeemer,
      contentParts2,
      (redeemType = 2),
      (validationScore = 0)
    );

    // modify content and expect it to revert
    await expect(
      contractUDAOContent.connect(contentCreator).modifyContent(createModifyContentVoucherSample)
    ).to.be.revertedWith("Content creator is banned");
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
    const redeemer = contentCreator;
    const createContentVoucherSample = await createContentVoucher(
      contractUDAOContent,
      backend,
      contentCreator,
      redeemer,
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
    const redeemer = contentCreator;
    /// Create Voucher from redeem.js and use it for creating content

    const createContentVoucherSample1 = await createContentVoucher(
      contractUDAOContent,
      backend,
      contentCreator,
      redeemer,
      contentParts1,
      (redeemType = 1),
      (validationScore = 1)
    );
    const createContentVoucherSample2 = await createContentVoucher(
      contractUDAOContent,
      backend,
      contentCreator,
      redeemer,
      contentParts2,
      (redeemType = 1),
      (validationScore = 1)
    );
    const createContentVoucherSample3 = await createContentVoucher(
      contractUDAOContent,
      backend,
      contentCreator,
      redeemer,
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
      contractUDAOContent.connect(contentCreator).batchCreateContents(createContentVoucherSampleArray)
    ).to.be.revertedWith("Pausable: paused");
  });

  it("Should fail to modify content when paused", async function () {
    await reDeploy();
    await contractRoleManager.setKYC(contentCreator.address, true);

    /// part prices must be determined before creating content
    const partPricesArray = [ethers.utils.parseEther("1"), ethers.utils.parseEther("2"), ethers.utils.parseEther("3")];
    const contentPrice = ethers.utils.parseEther("10");
    const redeemer = contentCreator;
    // Create content
    const contentParts = [0, 1, 2];
    /// Create Voucher from redeem.js and use it for creating content
    const createContentVoucherSample = await createContentVoucher(
      contractUDAOContent,
      backend,
      contentCreator,
      redeemer,
      contentParts,
      (redeemType = 1),
      (validationScore = 1)
    );

    await expect(contractUDAOContent.connect(contentCreator).createContent(createContentVoucherSample))
      .to.emit(contractUDAOContent, "Transfer") // transfer from null address to min
      .withArgs("0x0000000000000000000000000000000000000000", contentCreator.address, 1);

    // Create modify content voucher
    // Get the current block timestamp
    const block = await ethers.provider.getBlock("latest");
    // add some minutes to it and convert it to a BigNumber
    const futureBlock = block.timestamp + 1000;
    // convert it to a BigNumber
    const futureBlockBigNumber = ethers.BigNumber.from(futureBlock);
    const modifyContentVoucherSample = await new Redeem({
      contract: contractUDAOContent,
      signer: backend,
    }).createVoucher(
      futureBlockBigNumber,
      contentParts,
      1,
      "ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi",
      contentCreator.address,
      redeemer.address,
      (redeemType = 2),
      (validationScore = 2)
    );
    /// Pause contract
    await contractUDAOContent.connect(backend).pause();

    await expect(contractUDAOContent.connect(backend).modifyContent(modifyContentVoucherSample)).to.revertedWith(
      "Pausable: paused"
    );
  });

  it("Should fail create Content and batch create if signature invalid", async function () {
    await reDeploy();
    await contractRoleManager.setKYC(contentCreator.address, true);

    /// part prices must be determined before creating content
    const partPricesArray = [ethers.utils.parseEther("1"), ethers.utils.parseEther("1")];
    const contentPrice = ethers.utils.parseEther("2");
    const redeemer = contentCreator;

    /// Create Voucher from redeem.js and use it for creating content
    // Create content
    const contentParts = [0, 1];
    // Get the current block timestamp
    const block = await ethers.provider.getBlock("latest");
    // add some minutes to it and convert it to a BigNumber
    const futureBlock = block.timestamp + 1000;
    // convert it to a BigNumber
    const futureBlockBigNumber = ethers.BigNumber.from(futureBlock);
    const createContentVoucherSample = await new Redeem({
      contract: contractUDAOContent,
      signer: contentBuyer1,
    }).createVoucher(
      futureBlockBigNumber,
      contentParts,
      1,
      "ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi",
      contentCreator.address,
      redeemer.address,
      (redeemType = 1),
      (validationScore = 1)
    );

    await expect(contractUDAOContent.connect(contentCreator).createContent(createContentVoucherSample)).to.revertedWith(
      "Signature invalid or unauthorized"
    );

    const createContentVoucherArray = [createContentVoucherSample];

    await expect(
      contractUDAOContent.connect(contentCreator).batchCreateContents(createContentVoucherArray)
    ).to.revertedWith("Signature invalid or unauthorized");
  });

  it("Should fail modify Content if signature invalid", async function () {
    await reDeploy();
    await contractRoleManager.setKYC(contentCreator.address, true);

    /// part prices must be determined before creating content
    const partPricesArray = [ethers.utils.parseEther("1"), ethers.utils.parseEther("1")];
    const contentPrice = ethers.utils.parseEther("2");
    const redeemer = contentCreator;

    /// Create Voucher from redeem.js and use it for creating content
    // Create content
    const contentParts = [0, 1];
    // Get the current block timestamp
    const block = await ethers.provider.getBlock("latest");
    // add some minutes to it and convert it to a BigNumber
    const futureBlock = block.timestamp + 1000;
    // convert it to a BigNumber
    const futureBlockBigNumber = ethers.BigNumber.from(futureBlock);
    const createContentVoucherSample = await new Redeem({
      contract: contractUDAOContent,
      signer: backend,
    }).createVoucher(
      futureBlockBigNumber,
      contentParts,
      1,
      "ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi",
      contentCreator.address,
      redeemer.address,
      (redeemType = 1),
      (validationScore = 1)
    );

    await expect(contractUDAOContent.connect(contentCreator).createContent(createContentVoucherSample))
      .to.emit(contractUDAOContent, "Transfer") // transfer from null address to min
      .withArgs("0x0000000000000000000000000000000000000000", contentCreator.address, 1);

    // modify content voucher created by not the content publisher
    const modifyContentVoucherSample = await new Redeem({
      contract: contractUDAOContent,
      signer: contentBuyer1,
    }).createVoucher(
      futureBlockBigNumber,
      contentParts,
      1,
      "ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi",
      contentCreator.address,
      redeemer.address,
      (redeemType = 2),
      (validationScore = 0)
    );

    await expect(contractUDAOContent.connect(contentCreator).modifyContent(modifyContentVoucherSample)).to.revertedWith(
      "Signature invalid or unauthorized"
    );
  });
  //BATU
  it("Should fail create content and batch create if caller is not redeemer", async function () {
    await reDeploy();
    await contractRoleManager.setKYC(contentCreator.address, true);

    /// part prices must be determined before creating content
    const partPricesArray = [ethers.utils.parseEther("1"), ethers.utils.parseEther("1")];
    const contentPrice = ethers.utils.parseEther("2");
    const redeemer = contentBuyer1;

    /// Create Voucher from redeem.js and use it for creating content
    // Create content
    const contentParts = [0, 1];
    const createContentVoucherSample = await createContentVoucher(
      contractUDAOContent,
      backend,
      contentCreator,
      redeemer,
      contentParts,
      (redeemType = 1),
      (validationScore = 1)
    );
    await expect(contractUDAOContent.connect(contentCreator).createContent(createContentVoucherSample)).to.revertedWith(
      "Only content publisher or redeemer can create content"
    );

    const createContentVoucherSampleArray = [createContentVoucherSample];
    await expect(
      contractUDAOContent.connect(contentCreator).batchCreateContents(createContentVoucherSampleArray)
    ).to.revertedWith("Only content publisher or redeemer can create content");
  });

  it("Should fail modify content if caller is not redeemer", async function () {
    await reDeploy();
    await contractRoleManager.setKYC(contentCreator.address, true);

    /// part prices must be determined before creating content
    const partPricesArray = [ethers.utils.parseEther("1"), ethers.utils.parseEther("1")];
    const contentPrice = ethers.utils.parseEther("2");
    const redeemer = contentBuyer1;

    /// Create Voucher from redeem.js and use it for creating content
    // Create content
    const contentParts = [0, 1];
    const createContentVoucherSample = await createContentVoucher(
      contractUDAOContent,
      backend,
      contentCreator,
      redeemer,
      contentParts,
      (redeemType = 1),
      (validationScore = 1)
    );
    await expect(contractUDAOContent.connect(backend).createContent(createContentVoucherSample))
      .to.emit(contractUDAOContent, "Transfer") // transfer from null address to minter
      .withArgs("0x0000000000000000000000000000000000000000", contentCreator.address, 1);

    //modify content

    const modifyContentVoucherSample = await createContentVoucher(
      contractUDAOContent,
      backend,
      contentCreator,
      redeemer,
      contentParts,
      (redeemType = 2),
      (validationScore = 1)
    );
    await expect(contractUDAOContent.connect(contentBuyer1).modifyContent(modifyContentVoucherSample)).to.revertedWith(
      "Only content publisher or content owner can modify content"
    );
  });

  it("Should fail create content and batch create if redeemer(caller) is not kyced", async function () {
    await reDeploy();
    await contractRoleManager.setKYC(contentCreator.address, false);

    /// part prices must be determined before creating content
    const partPricesArray = [ethers.utils.parseEther("1"), ethers.utils.parseEther("1")];
    const contentPrice = ethers.utils.parseEther("2");
    const redeemer = contentCreator;

    /// Create Voucher from redeem.js and use it for creating content
    // Create content
    const contentParts = [0, 1];
    const createContentVoucherSample = await createContentVoucher(
      contractUDAOContent,
      backend,
      contentCreator,
      redeemer,
      contentParts,
      (redeemType = 1),
      (validationScore = 1)
    );
    await expect(contractUDAOContent.connect(contentCreator).createContent(createContentVoucherSample)).to.revertedWith(
      "Redeemer isnt KYCed"
    );

    const createContentVoucherSampleArray = [createContentVoucherSample];
    await expect(
      contractUDAOContent.connect(contentCreator).batchCreateContents(createContentVoucherSampleArray)
    ).to.revertedWith("Redeemer isnt KYCed");
  });

  it("Should fail create content and batch create if redeemer(caller) is banned", async function () {
    await reDeploy();
    await contractRoleManager.setKYC(contentCreator.address, true);
    await contractRoleManager.setBan(contentCreator.address, true);

    /// part prices must be determined before creating content
    const partPricesArray = [ethers.utils.parseEther("1"), ethers.utils.parseEther("1")];
    const contentPrice = ethers.utils.parseEther("2");
    const redeemer = contentCreator;

    /// Create Voucher from redeem.js and use it for creating content
    // Create content
    const contentParts = [0, 1];
    const createContentVoucherSample = await createContentVoucher(
      contractUDAOContent,
      backend,
      contentCreator,
      redeemer,
      contentParts,
      (redeemType = 1),
      (validationScore = 1)
    );
    await expect(contractUDAOContent.connect(contentCreator).createContent(createContentVoucherSample)).to.revertedWith(
      "Redeemer is banned"
    );

    const createContentVoucherSampleArray = [createContentVoucherSample];
    await expect(
      contractUDAOContent.connect(contentCreator).batchCreateContents(createContentVoucherSampleArray)
    ).to.revertedWith("Redeemer is banned");
  });

  it("Should fail create content and batch create if content creator is not kyced", async function () {
    await reDeploy();
    await contractRoleManager.setKYC(contentCreator.address, false);
    await contractRoleManager.setKYC(backend.address, true);

    /// part prices must be determined before creating content
    const partPricesArray = [ethers.utils.parseEther("1"), ethers.utils.parseEther("1")];
    const contentPrice = ethers.utils.parseEther("2");
    const redeemer = backend;

    /// Create Voucher from redeem.js and use it for creating content
    // Create content
    const contentParts = [0, 1];
    const createContentVoucherSample = await createContentVoucher(
      contractUDAOContent,
      backend,
      contentCreator,
      redeemer,
      contentParts,
      (redeemType = 1),
      (validationScore = 1)
    );
    await expect(contractUDAOContent.connect(backend).createContent(createContentVoucherSample)).to.revertedWith(
      "Content creator isnt KYCed"
    );

    const createContentVoucherSampleArray = [createContentVoucherSample];
    await expect(
      contractUDAOContent.connect(backend).batchCreateContents(createContentVoucherSampleArray)
    ).to.revertedWith("Content creator isnt KYCed");
  });

  it("Should fail modify content if content creator is not kyced", async function () {
    await reDeploy();
    await contractRoleManager.setKYC(contentCreator.address, true);

    /// part prices must be determined before creating content
    const partPricesArray = [ethers.utils.parseEther("1"), ethers.utils.parseEther("1")];
    const contentPrice = ethers.utils.parseEther("2");
    const redeemer = contentCreator;

    /// Create Voucher from redeem.js and use it for creating content
    // Create content
    const contentParts = [0, 1];
    const createContentVoucherSample = await createContentVoucher(
      contractUDAOContent,
      backend,
      contentCreator,
      redeemer,
      contentParts,
      (redeemType = 1),
      (validationScore = 1)
    );
    await expect(contractUDAOContent.connect(backend).createContent(createContentVoucherSample))
      .to.emit(contractUDAOContent, "Transfer") // transfer from null address to minter
      .withArgs("0x0000000000000000000000000000000000000000", contentCreator.address, 1);

    //modify content
    await contractRoleManager.setKYC(contentCreator.address, false);

    const modifyContentVoucherSample = await createContentVoucher(
      contractUDAOContent,
      backend,
      contentCreator,
      redeemer,
      contentParts,
      (redeemType = 2),
      (validationScore = 1)
    );

    await expect(contractUDAOContent.connect(contentCreator).modifyContent(modifyContentVoucherSample)).to.revertedWith(
      "Content creator isnt KYCed"
    );
  });

  it("Should fail create content and batch create if content creator is banned", async function () {
    await reDeploy();
    await contractRoleManager.setKYC(contentCreator.address, true);
    await contractRoleManager.setBan(contentCreator.address, true);
    await contractRoleManager.setKYC(backend.address, true);

    /// part prices must be determined before creating content
    const partPricesArray = [ethers.utils.parseEther("1"), ethers.utils.parseEther("1")];
    const contentPrice = ethers.utils.parseEther("2");
    const redeemer = backend;

    /// Create Voucher from redeem.js and use it for creating content
    // Create content
    const contentParts = [0, 1];
    const createContentVoucherSample = await createContentVoucher(
      contractUDAOContent,
      backend,
      contentCreator,
      redeemer,
      contentParts,
      (redeemType = 1),
      (validationScore = 1)
    );
    await expect(contractUDAOContent.connect(backend).createContent(createContentVoucherSample)).to.revertedWith(
      "Content creator is banned"
    );

    const createContentVoucherSampleArray = [createContentVoucherSample];
    await expect(
      contractUDAOContent.connect(backend).batchCreateContents(createContentVoucherSampleArray)
    ).to.revertedWith("Content creator is banned");
  });

  it("Should fail modify content if content creator is banned", async function () {
    await reDeploy();
    await contractRoleManager.setKYC(contentCreator.address, true);

    /// part prices must be determined before creating content
    const partPricesArray = [ethers.utils.parseEther("1"), ethers.utils.parseEther("1")];
    const contentPrice = ethers.utils.parseEther("2");
    const redeemer = contentCreator;

    /// Create Voucher from redeem.js and use it for creating content
    // Create content
    const contentParts = [0, 1];
    const createContentVoucherSample = await createContentVoucher(
      contractUDAOContent,
      backend,
      contentCreator,
      redeemer,
      contentParts,
      (redeemType = 1),
      (validationScore = 1)
    );
    await expect(contractUDAOContent.connect(backend).createContent(createContentVoucherSample))
      .to.emit(contractUDAOContent, "Transfer") // transfer from null address to minter
      .withArgs("0x0000000000000000000000000000000000000000", contentCreator.address, 1);

    //modify content
    await contractRoleManager.setKYC(contentCreator.address, true);
    await contractRoleManager.setBan(contentCreator.address, true);

    const modifyContentVoucherSample = await createContentVoucher(
      contractUDAOContent,
      backend,
      contentCreator,
      redeemer,
      contentParts,
      (redeemType = 2),
      (validationScore = 1)
    );

    await expect(contractUDAOContent.connect(contentCreator).modifyContent(modifyContentVoucherSample)).to.revertedWith(
      "Content creator is banned"
    );
  });

  it("Should fail create Content and batch create if voucher expired", async function () {
    await reDeploy();
    await contractRoleManager.setKYC(contentCreator.address, true);

    /// part prices must be determined before creating content
    const partPricesArray = [ethers.utils.parseEther("1"), ethers.utils.parseEther("1")];
    const contentPrice = ethers.utils.parseEther("2");
    const redeemer = contentCreator;

    /// Create Voucher from redeem.js and use it for creating content
    // Create content
    const contentParts = [0, 1];
    // Get the current block timestamp
    const block = await ethers.provider.getBlock("latest");
    // add some minutes to it and convert it to a BigNumber
    const futureBlock = block.timestamp - 1;
    // convert it to a BigNumber
    const futureBlockBigNumber = ethers.BigNumber.from(futureBlock);
    const createContentVoucherSample = await new Redeem({
      contract: contractUDAOContent,
      signer: backend,
    }).createVoucher(
      futureBlockBigNumber,
      contentParts,
      1,
      "ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi",
      contentCreator.address,
      redeemer.address,
      (redeemType = 1),
      (validationScore = 1)
    );

    await expect(contractUDAOContent.connect(contentCreator).createContent(createContentVoucherSample)).to.revertedWith(
      "Voucher has expired"
    );

    const createContentVoucherArray = [createContentVoucherSample];

    await expect(
      contractUDAOContent.connect(contentCreator).batchCreateContents(createContentVoucherArray)
    ).to.revertedWith("Voucher has expired");
  });

  it("Should fail modify content if voucher expired", async function () {
    await reDeploy();
    await contractRoleManager.setKYC(contentCreator.address, true);

    /// part prices must be determined before creating content
    const partPricesArray = [ethers.utils.parseEther("1"), ethers.utils.parseEther("1")];
    const contentPrice = ethers.utils.parseEther("2");
    const redeemer = contentCreator;

    /// Create Voucher from redeem.js and use it for creating content
    // Create content
    const contentParts = [0, 1];
    // Get the current block timestamp
    const block = await ethers.provider.getBlock("latest");
    // add some minutes to it and convert it to a BigNumber
    const futureBlock = block.timestamp + 1000;
    // convert it to a BigNumber
    const futureBlockBigNumber = ethers.BigNumber.from(futureBlock);
    const createContentVoucherSample = await new Redeem({
      contract: contractUDAOContent,
      signer: backend,
    }).createVoucher(
      futureBlockBigNumber,
      contentParts,
      1,
      "ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi",
      contentCreator.address,
      redeemer.address,
      (redeemType = 1),
      (validationScore = 1)
    );

    await expect(contractUDAOContent.connect(backend).createContent(createContentVoucherSample))
      .to.emit(contractUDAOContent, "Transfer") // transfer from null address to minter
      .withArgs("0x0000000000000000000000000000000000000000", contentCreator.address, 1);

    //modify content

    const modifyContentVoucherSample = await new Redeem({
      contract: contractUDAOContent,
      signer: backend,
    }).createVoucher(
      futureBlockBigNumber - 1000,
      contentParts,
      1,
      "ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi",
      contentCreator.address,
      redeemer.address,
      (redeemType = 1),
      (validationScore = 1)
    );

    await expect(contractUDAOContent.connect(contentCreator).modifyContent(modifyContentVoucherSample)).to.revertedWith(
      "Voucher has expired"
    );
  });

  it("Should fail create Content and batch create if redeem type is not new content", async function () {
    await reDeploy();
    await contractRoleManager.setKYC(contentCreator.address, true);

    /// part prices must be determined before creating content
    const partPricesArray = [ethers.utils.parseEther("1"), ethers.utils.parseEther("1")];
    const contentPrice = ethers.utils.parseEther("2");
    const redeemer = contentCreator;

    /// Create Voucher from redeem.js and use it for creating content
    // Create content
    const contentParts = [0, 1];
    // Get the current block timestamp
    const block = await ethers.provider.getBlock("latest");
    // add some minutes to it and convert it to a BigNumber
    const futureBlock = block.timestamp + 1000;
    // convert it to a BigNumber
    const futureBlockBigNumber = ethers.BigNumber.from(futureBlock);
    const createContentVoucherSample = await new Redeem({
      contract: contractUDAOContent,
      signer: backend,
    }).createVoucher(
      futureBlockBigNumber,
      contentParts,
      1,
      "ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi",
      contentCreator.address,
      redeemer.address,
      (redeemType = 0),
      (validationScore = 1)
    );

    await expect(contractUDAOContent.connect(contentCreator).createContent(createContentVoucherSample)).to.revertedWith(
      "Redeem type is not new content"
    );

    const createContentVoucherArray = [createContentVoucherSample];

    await expect(
      contractUDAOContent.connect(contentCreator).batchCreateContents(createContentVoucherArray)
    ).to.revertedWith("Redeem type is not new content");
  });

  it("Should fail modify content if redeem type is not modify content", async function () {
    await reDeploy();
    await contractRoleManager.setKYC(contentCreator.address, true);

    /// part prices must be determined before creating content
    const partPricesArray = [ethers.utils.parseEther("1"), ethers.utils.parseEther("1")];
    const contentPrice = ethers.utils.parseEther("2");
    const redeemer = contentCreator;

    /// Create Voucher from redeem.js and use it for creating content
    // Create content
    const contentParts = [0, 1];
    // Get the current block timestamp
    const block = await ethers.provider.getBlock("latest");
    // add some minutes to it and convert it to a BigNumber
    const futureBlock = block.timestamp + 1000;
    // convert it to a BigNumber
    const futureBlockBigNumber = ethers.BigNumber.from(futureBlock);
    const createContentVoucherSample = await new Redeem({
      contract: contractUDAOContent,
      signer: backend,
    }).createVoucher(
      futureBlockBigNumber,
      contentParts,
      1,
      "ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi",
      contentCreator.address,
      redeemer.address,
      (redeemType = 1),
      (validationScore = 1)
    );

    await expect(contractUDAOContent.connect(backend).createContent(createContentVoucherSample))
      .to.emit(contractUDAOContent, "Transfer") // transfer from null address to minter
      .withArgs("0x0000000000000000000000000000000000000000", contentCreator.address, 1);

    //modify content

    const modifyContentVoucherSample = await new Redeem({
      contract: contractUDAOContent,
      signer: backend,
    }).createVoucher(
      futureBlockBigNumber,
      contentParts,
      1,
      "ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi",
      contentCreator.address,
      redeemer.address,
      (redeemType = 1),
      (validationScore = 1)
    );

    await expect(contractUDAOContent.connect(contentCreator).modifyContent(modifyContentVoucherSample)).to.revertedWith(
      "Redeem type is not modification"
    );
  });

  it("Should fail create Content and batch create if content uri is empty", async function () {
    await reDeploy();
    await contractRoleManager.setKYC(contentCreator.address, true);

    /// part prices must be determined before creating content
    const partPricesArray = [ethers.utils.parseEther("1"), ethers.utils.parseEther("1")];
    const contentPrice = ethers.utils.parseEther("2");
    const redeemer = contentCreator;

    /// Create Voucher from redeem.js and use it for creating content
    // Create content
    const contentParts = [0, 1];
    // Get the current block timestamp
    const block = await ethers.provider.getBlock("latest");
    // add some minutes to it and convert it to a BigNumber
    const futureBlock = block.timestamp + 1000;
    // convert it to a BigNumber
    const futureBlockBigNumber = ethers.BigNumber.from(futureBlock);
    const createContentVoucherSample = await new Redeem({
      contract: contractUDAOContent,
      signer: backend,
    }).createVoucher(
      futureBlockBigNumber,
      contentParts,
      1,
      "",
      contentCreator.address,
      redeemer.address,
      (redeemType = 1),
      (validationScore = 1)
    );

    await expect(contractUDAOContent.connect(contentCreator).createContent(createContentVoucherSample)).to.revertedWith(
      "Content URI cannot be empty"
    );

    const createContentVoucherArray = [createContentVoucherSample];

    await expect(
      contractUDAOContent.connect(contentCreator).batchCreateContents(createContentVoucherArray)
    ).to.revertedWith("Content URI cannot be empty");
  });

  it("Should fail modify content if content uri is empty", async function () {
    await reDeploy();
    await contractRoleManager.setKYC(contentCreator.address, true);

    /// part prices must be determined before creating content
    const partPricesArray = [ethers.utils.parseEther("1"), ethers.utils.parseEther("1")];
    const contentPrice = ethers.utils.parseEther("2");
    const redeemer = contentCreator;

    /// Create Voucher from redeem.js and use it for creating content
    // Create content
    const contentParts = [0, 1];
    // Get the current block timestamp
    const block = await ethers.provider.getBlock("latest");
    // add some minutes to it and convert it to a BigNumber
    const futureBlock = block.timestamp + 1000;
    // convert it to a BigNumber
    const futureBlockBigNumber = ethers.BigNumber.from(futureBlock);
    const createContentVoucherSample = await new Redeem({
      contract: contractUDAOContent,
      signer: backend,
    }).createVoucher(
      futureBlockBigNumber,
      contentParts,
      1,
      "ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi",
      contentCreator.address,
      redeemer.address,
      (redeemType = 1),
      (validationScore = 1)
    );

    await expect(contractUDAOContent.connect(backend).createContent(createContentVoucherSample))
      .to.emit(contractUDAOContent, "Transfer") // transfer from null address to minter
      .withArgs("0x0000000000000000000000000000000000000000", contentCreator.address, 1);

    //modify content

    const modifyContentVoucherSample = await new Redeem({
      contract: contractUDAOContent,
      signer: backend,
    }).createVoucher(
      futureBlockBigNumber,
      contentParts,
      1,
      "",
      contentCreator.address,
      redeemer.address,
      (redeemType = 2),
      (validationScore = 1)
    );

    await expect(contractUDAOContent.connect(contentCreator).modifyContent(modifyContentVoucherSample)).to.revertedWith(
      "Content URI cannot be empty"
    );
  });

  it("Should create Content and batch create trigger create validation if validation score is not zero", async function () {
    await reDeploy();
    await contractRoleManager.setKYC(contentCreator.address, true);

    /// part prices must be determined before creating content
    const partPricesArray = [ethers.utils.parseEther("1"), ethers.utils.parseEther("1")];
    const contentPrice = ethers.utils.parseEther("2");
    const redeemer = contentCreator;

    /// Create Voucher from redeem.js and use it for creating content
    // Create content
    const contentParts = [0, 1];
    const createContentVoucherSample = await createContentVoucher(
      contractUDAOContent,
      backend,
      contentCreator,
      redeemer,
      contentParts,
      (redeemType = 1),
      (validationScore = 1)
    );
    await expect(contractUDAOContent.connect(contentCreator).createContent(createContentVoucherSample))
      .to.emit(contractUDAOContent, "Transfer") // transfer from null address to minter
      .withArgs("0x0000000000000000000000000000000000000000", contentCreator.address, 1);

    // listen event on supervision contract
    const eventFilter = await contractSupervision.filters.ValidationCreated();

    // check ValidationCreated event emitted with correct parameters
    const events = await contractSupervision.queryFilter(eventFilter);
    //convert number to bignumber
    const tokenIdBigNumber = ethers.BigNumber.from(1);
    const validationScoreBigNumber = ethers.BigNumber.from(1);

    //check if event emitted with correct parameters
    expect(events[0].args.tokenId).to.equal(tokenIdBigNumber);
    expect(events[0].args.score).to.equal(validationScoreBigNumber);

    // Create content voucher for batch create
    // Get the current block timestamp
    const block = await ethers.provider.getBlock("latest");
    // add some minutes to it and convert it to a BigNumber
    const futureBlock = block.timestamp + 1000;
    // convert it to a BigNumber
    const futureBlockBigNumber = ethers.BigNumber.from(futureBlock);
    const createContentVoucherSample2 = await new Redeem({
      contract: contractUDAOContent,
      signer: backend,
    }).createVoucher(
      futureBlockBigNumber,
      contentParts,
      2,
      "bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi",
      contentCreator.address,
      redeemer.address,
      (redeemType = 1),
      (validationScore = 2)
    );
    const createContentVoucherArray = [createContentVoucherSample2];

    await expect(contractUDAOContent.connect(contentCreator).batchCreateContents(createContentVoucherArray))
      .to.emit(contractUDAOContent, "Transfer") // transfer from null address to minter
      .withArgs("0x0000000000000000000000000000000000000000", contentCreator.address, 2);

    // listen event on supervision contract
    const eventFilter2 = await contractSupervision.filters.ValidationCreated();
    // check ValidationCreated event emitted with correct parameters
    const events2 = await contractSupervision.queryFilter(eventFilter2);

    //convert number to bignumber
    const tokenIdBigNumber2 = ethers.BigNumber.from(1);
    const validationScoreBigNumber2 = ethers.BigNumber.from(1);
    //check if event emitted with correct parameters
    expect(events2[0].args.tokenId).to.equal(tokenIdBigNumber2);
    expect(events2[0].args.score).to.equal(validationScoreBigNumber2);
  });

  it("Should modify content trigger create validation if validation score is not zero and not in validation", async function () {
    await reDeploy();
    await contractRoleManager.setKYC(contentCreator.address, true);

    /// part prices must be determined before creating content
    const partPricesArray = [ethers.utils.parseEther("1"), ethers.utils.parseEther("1")];
    const contentPrice = ethers.utils.parseEther("2");
    const redeemer = contentCreator;

    /// Create Voucher from redeem.js and use it for creating content
    // Create content
    const contentParts = [0, 1];
    const createContentVoucherSample = await createContentVoucher(
      contractUDAOContent,
      backend,
      contentCreator,
      redeemer,
      contentParts,
      (redeemType = 1),
      (validationScore = 0)
    );
    await expect(contractUDAOContent.connect(contentCreator).createContent(createContentVoucherSample))
      .to.emit(contractUDAOContent, "Transfer") // transfer from null address to minter
      .withArgs("0x0000000000000000000000000000000000000000", contentCreator.address, 1);

    // Create modify content voucher
    // Get the current block timestamp
    const block = await ethers.provider.getBlock("latest");
    // add some minutes to it and convert it to a BigNumber
    const futureBlock = block.timestamp + 1000;
    // convert it to a BigNumber
    const futureBlockBigNumber = ethers.BigNumber.from(futureBlock);
    const modifyContentVoucherSample = await new Redeem({
      contract: contractUDAOContent,
      signer: backend,
    }).createVoucher(
      futureBlockBigNumber,
      contentParts,
      1,
      "ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi",
      contentCreator.address,
      redeemer.address,
      (redeemType = 2),
      (validationScore = 2)
    );

    await contractUDAOContent.connect(backend).modifyContent(modifyContentVoucherSample);

    // listen event on supervision contract
    const eventFilter = await contractSupervision.filters.ValidationCreated();
    // check ValidationCreated event emitted with correct parameters
    const events = await contractSupervision.queryFilter(eventFilter);

    //convert number to bignumber
    const tokenIdBigNumber = ethers.BigNumber.from(1);
    const validationScoreBigNumber = ethers.BigNumber.from(2);
    //check if event emitted with correct parameters
    expect(events[0].args.tokenId).to.equal(tokenIdBigNumber);
    expect(events[0].args.score).to.equal(validationScoreBigNumber);
  });
});
