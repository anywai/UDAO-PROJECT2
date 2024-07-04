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
  const futureBlockBigNumber = BigInt(futureBlock);
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
  it("Should increase the balance of content creator", async function () {
    await reDeploy();
    await contractRoleManager.setKYC(contentCreator.address, true);

    /// part prices must be determined before creating content
    const partPricesArray = [ethers.parseEther("1"), ethers.parseEther("1")];
    const contentPrice = ethers.parseEther("2");
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
    // Check balance of content creator
    const balance = await contractUDAOContent.balanceOf(contentCreator.address);
    expect(balance).to.eql(BigInt(1));
  });
  it("Should increase the balance of content creator to 2 if content is created twice", async function () {
    await reDeploy();
    await contractRoleManager.setKYC(contentCreator.address, true);

    /// part prices must be determined before creating content
    const partPricesArray = [ethers.parseEther("1"), ethers.parseEther("1")];
    const contentPrice = ethers.parseEther("2");
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
    // Check balance of content creator
    let balance = await contractUDAOContent.balanceOf(contentCreator.address);
    expect(balance).to.eql(BigInt(1));

    // Create content
    const contentParts1 = [0, 1];
    const createContentVoucherSample1 = await createContentVoucher(
      contractUDAOContent,
      backend,
      contentCreator,
      redeemer,
      contentParts1,
      (redeemType = 1),
      (validationScore = 0)
    );
    await expect(contractUDAOContent.connect(contentCreator).createContent(createContentVoucherSample1))
      .to.emit(contractUDAOContent, "Transfer") // transfer from null address to minter
      .withArgs("0x0000000000000000000000000000000000000000", contentCreator.address, 2);
    // Check balance of content creator
    balance = await contractUDAOContent.balanceOf(contentCreator.address);
    expect(balance).to.eql(BigInt(2));
  });

  it("Should return the NAME of the ERC721 token as UDAO Content", async function () {
    await reDeploy();
    const name = await contractUDAOContent.name();
    expect(name).to.eql("UDAO Content");
  });

  it("Should return the SYMBOL of the ERC721 token as UDAOC", async function () {
    await reDeploy();
    const symbol = await contractUDAOContent.symbol();
    expect(symbol).to.eql("UDAOC");
  });
  it("Should return tokenURI of the ERC721 token as ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi", async function () {
    await reDeploy();
    // KYC content creator
    await contractRoleManager.setKYC(contentCreator.address, true);
    //Create content
    const contentParts = [0, 1];
    const createContentVoucherSample = await createContentVoucher(
      contractUDAOContent,
      backend,
      contentCreator,
      contentCreator,
      contentParts,
      (redeemType = 1),
      (validationScore = 0)
    );
    await contractUDAOContent.connect(contentCreator).createContent(createContentVoucherSample);
    // Check tokenURI
    const tokenURI = await contractUDAOContent.tokenURI(1);
    expect(tokenURI).to.eql("ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi");
  });
  it("Should revert to return tokenURI if tokenId does not exist", async function () {
    await reDeploy();
    await expect(contractUDAOContent.tokenURI(1)).to.be.revertedWith("ERC721Locked: invalid token ID");
  });
  it("Should revert to approve", async function () {
    await reDeploy();
    await expect(contractUDAOContent.approve(backend.address, 1)).to.be.revertedWith("ERC721Locked: not approvable");
  });
  it("Should revert to setApprovalForAll", async function () {
    await reDeploy();
    await expect(contractUDAOContent.setApprovalForAll(backend.address, true)).to.be.revertedWith(
      "ERC721Locked: not approvable"
    );
  });
  it("Should return zero address to getApproved", async function () {
    await reDeploy();
    // KYC content creator
    await contractRoleManager.setKYC(contentCreator.address, true);
    //Create content
    const contentParts = [0, 1];
    const createContentVoucherSample = await createContentVoucher(
      contractUDAOContent,
      backend,
      contentCreator,
      contentCreator,
      contentParts,
      (redeemType = 1),
      (validationScore = 0)
    );
    await contractUDAOContent.connect(contentCreator).createContent(createContentVoucherSample);
    // Check getApproved
    const getApproved = await contractUDAOContent.getApproved(1);
    expect(getApproved).to.eql(ethers.constants.AddressZero);
  });
  it("Should return false to isApprovedForAll", async function () {
    await reDeploy();
    const isApprovedForAll = await contractUDAOContent.isApprovedForAll(contentCreator.address, backend.address);
    expect(isApprovedForAll).to.eql(false);
  });
  it("Should revert to safeTransferFrom", async function () {
    await reDeploy();
    //await contract['safeTransferFrom(address,address,uint256)'](accountUser, newOwner, idNFT)
    await expect(
      contractUDAOContent["safeTransferFrom(address,address,uint256)"](contentCreator.address, backend.address, 1)
    ).to.be.revertedWith("ERC721Locked: not transferable");
  });
  it("Should revert to safeTransferFrom with data", async function () {
    await reDeploy();
    //await contract['safeTransferFrom(address,address,uint256, bytes memory)'](accountUser, newOwner, idNFT, data)
    await expect(
      contractUDAOContent["safeTransferFrom(address,address,uint256,bytes)"](
        contentCreator.address,
        backend.address,
        1,
        "0x"
      )
    ).to.be.revertedWith("ERC721Locked: not transferable");
  });
  it("Should return true to locked for a content", async function () {
    await reDeploy();
    // KYC content creator
    await contractRoleManager.setKYC(contentCreator.address, true);
    //Create content
    const contentParts = [0, 1];
    const createContentVoucherSample = await createContentVoucher(
      contractUDAOContent,
      backend,
      contentCreator,
      contentCreator,
      contentParts,
      (redeemType = 1),
      (validationScore = 0)
    );
    await contractUDAOContent.connect(contentCreator).createContent(createContentVoucherSample);
    const locked = await contractUDAOContent.locked(1);
    expect(locked).to.eql(true);
  });
  it("Should return true to defaultLocked", async function () {
    await reDeploy();
    const defaultLocked = await contractUDAOContent.defaultLocked();
    expect(defaultLocked).to.eql(true);
  });
});
