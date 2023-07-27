const { expect } = require("chai");
const hardhat = require("hardhat");
const { ethers } = hardhat;
const chai = require("chai");
const BN = require("bn.js");
const { DiscountedPurchase } = require("../lib/DiscountedPurchase");
const { Redeem } = require("../lib/Redeem");
const helpers = require("@nomicfoundation/hardhat-network-helpers");
const { deploy } = require("../lib/deployments");
const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");

const {
  WMATIC_ABI,
  NonFunbiblePositionABI,
  NonFunbiblePositionAddress,
  WMATICAddress,
} = require("../lib/abis");

// Enable and inject BN dependency
chai.use(require("chai-bn")(BN));
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
    .withArgs(
      ethers.BigNumber.from(0),
      ethers.BigNumber.from(1),
      validator1.address
    );
  await expect(contractSupervision.connect(validator2).assignValidation(1))
    .to.emit(contractSupervision, "ValidationAssigned")
    .withArgs(
      ethers.BigNumber.from(0),
      ethers.BigNumber.from(1),
      validator2.address
    );
  await expect(contractSupervision.connect(validator3).assignValidation(1))
    .to.emit(contractSupervision, "ValidationAssigned")
    .withArgs(
      ethers.BigNumber.from(0),
      ethers.BigNumber.from(1),
      validator3.address
    );
  await expect(contractSupervision.connect(validator4).assignValidation(1))
    .to.emit(contractSupervision, "ValidationAssigned")
    .withArgs(
      ethers.BigNumber.from(0),
      ethers.BigNumber.from(1),
      validator4.address
    );
  await expect(contractSupervision.connect(validator5).assignValidation(1))
    .to.emit(contractSupervision, "ValidationAssigned")
    .withArgs(
      ethers.BigNumber.from(0),
      ethers.BigNumber.from(1),
      validator5.address
    );

  await expect(contractSupervision.connect(validator1).sendValidation(1, true))
    .to.emit(contractSupervision, "ValidationResultSent")
    .withArgs(
      ethers.BigNumber.from(0),
      ethers.BigNumber.from(1),
      validator1.address,
      true
    );
  await expect(contractSupervision.connect(validator2).sendValidation(1, true))
    .to.emit(contractSupervision, "ValidationResultSent")
    .withArgs(
      ethers.BigNumber.from(0),
      ethers.BigNumber.from(1),
      validator2.address,
      true
    );
  await expect(contractSupervision.connect(validator3).sendValidation(1, true))
    .to.emit(contractSupervision, "ValidationResultSent")
    .withArgs(
      ethers.BigNumber.from(0),
      ethers.BigNumber.from(1),
      validator3.address,
      true
    );
  await expect(contractSupervision.connect(validator4).sendValidation(1, true))
    .to.emit(contractSupervision, "ValidationResultSent")
    .withArgs(
      ethers.BigNumber.from(0),
      ethers.BigNumber.from(1),
      validator4.address,
      true
    );
  await expect(contractSupervision.connect(validator5).sendValidation(1, false))
    .to.emit(contractSupervision, "ValidationResultSent")
    .withArgs(
      ethers.BigNumber.from(0),
      ethers.BigNumber.from(1),
      validator5.address,
      false
    );
  await expect(
    contractSupervision.connect(contentCreator).finalizeValidation(1)
  )
    .to.emit(contractSupervision, "ValidationEnded")
    .withArgs(ethers.BigNumber.from(0), ethers.BigNumber.from(1), true);
}

async function createContentVoucher(
  contractUDAOContent,
  backend,
  contentCreator,
  partPrices
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
    partPrices,
    0,
    "udao",
    "ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi",
    contentCreator.address,
    ethers.utils.parseEther("1"),
    "udao",
    true,
    true,
    1,
    0
  );
}

describe("Platform Treasury Contract - Content", function () {
  it("Should get updated address of the validation manager", async function () {
    const {
      backend,
      contentCreator,
      contentBuyer,
      contentBuyer1,
      contentBuyer2,
      contentBuyer3,
      validatorCandidate,
      validator,
      validator1,
      validator2,
      validator3,
      validator4,
      validator5,
      superValidatorCandidate,
      superValidator,
      foundation,
      governanceCandidate,
      governanceMember,
      jurorCandidate,
      jurorMember,
      jurorMember1,
      jurorMember2,
      jurorMember3,
      jurorMember4,
      corporation,
      contractUDAO,
      contractRoleManager,
      contractUDAOCertificate,
      contractUDAOContent,
      contractSupervision,
      contractPlatformTreasury,
      contractUDAOVp,
      contractUDAOStaker,
      contractUDAOTimelockController,
      contractUDAOGovernor,
      GOVERNANCE_ROLE,
      BACKEND_ROLE,
      contractContractManager,
      account1,
      account2,
      account3,
      contractPriceGetter,
    } = await deploy();
    await contractContractManager
      .connect(backend)
      .setAddressISupVisAddress("0x5B38Da6a701c568545dCfcB03FcB875f56beddC4");
    // Get updated address
    await expect(contractPlatformTreasury.connect(backend).updateAddresses())
      .to.emit(contractPlatformTreasury, "AddressesUpdated")
      .withArgs(
        anyValue,
        anyValue,
        "0x5B38Da6a701c568545dCfcB03FcB875f56beddC4",
        anyValue
      );
    await contractContractManager
      .connect(backend)
      .setAddressISupVisAddress(contractSupervision.address);
    // Get updated address
    await expect(contractPlatformTreasury.connect(backend).updateAddresses())
      .to.emit(contractPlatformTreasury, "AddressesUpdated")
      .withArgs(anyValue, anyValue, contractSupervision.address, anyValue);
  });

  it("Should fail to set validation manager if not FOUNDATION", async function () {
    const {
      backend,
      contentCreator,
      contentBuyer,
      contentBuyer1,
      contentBuyer2,
      contentBuyer3,
      validatorCandidate,
      validator,
      validator1,
      validator2,
      validator3,
      validator4,
      validator5,
      superValidatorCandidate,
      superValidator,
      foundation,
      governanceCandidate,
      governanceMember,
      jurorCandidate,
      jurorMember,
      jurorMember1,
      jurorMember2,
      jurorMember3,
      jurorMember4,
      corporation,
      contractUDAO,
      contractRoleManager,
      contractUDAOCertificate,
      contractUDAOContent,
      contractSupervision,
      contractPlatformTreasury,
      contractUDAOVp,
      contractUDAOStaker,
      contractUDAOTimelockController,
      contractUDAOGovernor,
      GOVERNANCE_ROLE,
      BACKEND_ROLE,
      contractContractManager,
      account1,
      account2,
      account3,
      contractPriceGetter,
    } = await deploy();

    await expect(
      contractPlatformTreasury.connect(foundation).updateAddresses()
    ).to.revertedWith(
      "AccessControl: account " +
        foundation.address.toLowerCase() +
        " is missing role 0x25cf2b509f2a7f322675b2a5322b182f44ad2c03ac941a0af17c9b178f5d5d5f"
    );
  });
  //!!Bu dünkü test
  it("Should a user able to buy the full content", async function () {
    const {
      backend,
      contentCreator,
      contentBuyer,
      contentBuyer1,
      contentBuyer2,
      contentBuyer3,
      validatorCandidate,
      validator,
      validator1,
      validator2,
      validator3,
      validator4,
      validator5,
      superValidatorCandidate,
      superValidator,
      foundation,
      governanceCandidate,
      governanceMember,
      jurorCandidate,
      jurorMember,
      jurorMember1,
      jurorMember2,
      jurorMember3,
      jurorMember4,
      corporation,
      contractUDAO,
      contractRoleManager,
      contractUDAOCertificate,
      contractUDAOContent,
      contractSupervision,
      contractPlatformTreasury,
      contractUDAOVp,
      contractUDAOStaker,
      contractUDAOTimelockController,
      contractUDAOGovernor,
      GOVERNANCE_ROLE,
      BACKEND_ROLE,
      contractContractManager,
      account1,
      account2,
      account3,
      contractPriceGetter,
    } = await deploy();

    /// Set KYC
    await contractRoleManager.setKYC(contentCreator.address, true);
    await contractRoleManager.setKYC(contentBuyer.address, true);

    /// part prices must be determined before creating content
    const partPricesArray = [
      ethers.utils.parseEther("1"),
      ethers.utils.parseEther("1"),
    ];

    /// Create Voucher from redeem.js and use it for creating content
    const createContentVoucherSample = await createContentVoucher(
      contractUDAOContent,
      backend,
      contentCreator,
      partPricesArray
    );

    /// Create content
    await expect(
      contractUDAOContent
        .connect(contentCreator)
        .createContent(createContentVoucherSample)
    )
      .to.emit(contractUDAOContent, "Transfer") // transfer from null address to minter
      .withArgs(
        "0x0000000000000000000000000000000000000000",
        contentCreator.address,
        0
      );

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

    /// Send UDAO to the buyer's wallet
    await contractUDAO.transfer(
      contentBuyer.address,
      ethers.utils.parseEther("100.0")
    );
    /// Content buyer needs to give approval to the platformtreasury
    await contractUDAO
      .connect(contentBuyer)
      .approve(
        contractPlatformTreasury.address,
        ethers.utils.parseEther("999999999999.0")
      );

    await contractPlatformTreasury
      .connect(contentBuyer)
      .buyContent(0, true, [1], ethers.constants.AddressZero);
    const result = await contractPlatformTreasury
      .connect(contentBuyer)
      .getOwnedContent(contentBuyer.address);

    const numArray = result.map((x) => x.map((y) => y.toNumber()));
    expect(numArray).to.eql([[0, 0]]);
  });

  it("Should a user able to buy parts of a content", async function () {
    const {
      backend,
      contentCreator,
      contentBuyer,
      contentBuyer1,
      contentBuyer2,
      contentBuyer3,
      validatorCandidate,
      validator,
      validator1,
      validator2,
      validator3,
      validator4,
      validator5,
      superValidatorCandidate,
      superValidator,
      foundation,
      governanceCandidate,
      governanceMember,
      jurorCandidate,
      jurorMember,
      jurorMember1,
      jurorMember2,
      jurorMember3,
      jurorMember4,
      corporation,
      contractUDAO,
      contractRoleManager,
      contractUDAOCertificate,
      contractUDAOContent,
      contractSupervision,
      contractPlatformTreasury,
      contractUDAOVp,
      contractUDAOStaker,
      contractUDAOTimelockController,
      contractUDAOGovernor,
      GOVERNANCE_ROLE,
      BACKEND_ROLE,
      contractContractManager,
      account1,
      account2,
      account3,
      contractPriceGetter,
    } = await deploy();

    /// Set KYC
    await contractRoleManager.setKYC(contentCreator.address, true);
    await contractRoleManager.setKYC(contentBuyer.address, true);

    /// part prices must be determined before creating content
    const partPricesArray = [
      ethers.utils.parseEther("1"),
      ethers.utils.parseEther("1"),
      ethers.utils.parseEther("1"),
      ethers.utils.parseEther("1"),
    ];

    /// Create Voucher from redeem.js and use it for creating content
    const createContentVoucherSample = await createContentVoucher(
      contractUDAOContent,
      backend,
      contentCreator,
      partPricesArray
    );

    /// Create content
    await expect(
      contractUDAOContent
        .connect(contentCreator)
        .createContent(createContentVoucherSample)
    )
      .to.emit(contractUDAOContent, "Transfer") // transfer from null address to minter
      .withArgs(
        "0x0000000000000000000000000000000000000000",
        contentCreator.address,
        0
      );
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

    /// Send UDAO to the buyer's wallet
    await contractUDAO.transfer(
      contentBuyer.address,
      ethers.utils.parseEther("100.0")
    );
    /// Content buyer needs to give approval to the platformtreasury
    await contractUDAO
      .connect(contentBuyer)
      .approve(
        contractPlatformTreasury.address,
        ethers.utils.parseEther("999999999999.0")
      );

    await contractPlatformTreasury
      .connect(contentBuyer)
      .buyContent(0, false, [1, 2, 3], contentBuyer.address);
    const result = await contractPlatformTreasury
      .connect(contentBuyer)
      .getOwnedContent(contentBuyer.address);
    const numArray = result.map((x) => x.map((y) => y.toNumber()));
    expect(numArray).to.eql([
      [0, 1],
      [0, 2],
      [0, 3],
    ]);
  });
  //İkinci
  it("Should fail to buy a content part if content part already purchased", async function () {
    const {
      backend,
      contentCreator,
      contentBuyer,
      contentBuyer1,
      contentBuyer2,
      contentBuyer3,
      validatorCandidate,
      validator,
      validator1,
      validator2,
      validator3,
      validator4,
      validator5,
      superValidatorCandidate,
      superValidator,
      foundation,
      governanceCandidate,
      governanceMember,
      jurorCandidate,
      jurorMember,
      jurorMember1,
      jurorMember2,
      jurorMember3,
      jurorMember4,
      corporation,
      contractUDAO,
      contractRoleManager,
      contractUDAOCertificate,
      contractUDAOContent,
      contractSupervision,
      contractPlatformTreasury,
      contractUDAOVp,
      contractUDAOStaker,
      contractUDAOTimelockController,
      contractUDAOGovernor,
      GOVERNANCE_ROLE,
      BACKEND_ROLE,
      contractContractManager,
      account1,
      account2,
      account3,
      contractPriceGetter,
    } = await deploy();

    /// Set KYC
    await contractRoleManager.setKYC(contentCreator.address, true);
    await contractRoleManager.setKYC(contentBuyer.address, true);

    /// part prices must be determined before creating content
    const partPricesArray = [
      ethers.utils.parseEther("1"),
      ethers.utils.parseEther("1"),
      ethers.utils.parseEther("1"),
      ethers.utils.parseEther("1"),
    ];

    /// Create Voucher from redeem.js and use it for creating content
    const createContentVoucherSample = await createContentVoucher(
      contractUDAOContent,
      backend,
      contentCreator,
      partPricesArray
    );

    /// create content
    await expect(
      contractUDAOContent
        .connect(contentCreator)
        .createContent(createContentVoucherSample)
    )
      .to.emit(contractUDAOContent, "Transfer") // transfer from null address to minter
      .withArgs(
        "0x0000000000000000000000000000000000000000",
        contentCreator.address,
        0
      );
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

    /// Send UDAO to the buyer's wallet
    await contractUDAO.transfer(
      contentBuyer.address,
      ethers.utils.parseEther("100.0")
    );
    /// Content buyer needs to give approval to the platformtreasury
    await contractUDAO
      .connect(contentBuyer)
      .approve(
        contractPlatformTreasury.address,
        ethers.utils.parseEther("999999999999.0")
      );

    await contractPlatformTreasury
      .connect(contentBuyer)
      .buyContent(0, false, [2], contentBuyer.address);

    await expect(
      contractPlatformTreasury
        .connect(contentBuyer)
        .buyContent(0, false, [2], contentBuyer.address)
    ).to.revertedWith("Content part is already bought");
  });

  it("Should fail to buy a content if content does not exists", async function () {
    const {
      backend,
      contentCreator,
      contentBuyer,
      contentBuyer1,
      contentBuyer2,
      contentBuyer3,
      validatorCandidate,
      validator,
      validator1,
      validator2,
      validator3,
      validator4,
      validator5,
      superValidatorCandidate,
      superValidator,
      foundation,
      governanceCandidate,
      governanceMember,
      jurorCandidate,
      jurorMember,
      jurorMember1,
      jurorMember2,
      jurorMember3,
      jurorMember4,
      corporation,
      contractUDAO,
      contractRoleManager,
      contractUDAOCertificate,
      contractUDAOContent,
      contractSupervision,
      contractPlatformTreasury,
      contractUDAOVp,
      contractUDAOStaker,
      contractUDAOTimelockController,
      contractUDAOGovernor,
      GOVERNANCE_ROLE,
      BACKEND_ROLE,
      contractContractManager,
      account1,
      account2,
      account3,
      contractPriceGetter,
    } = await deploy();

    /// Set KYC
    await contractRoleManager.setKYC(contentCreator.address, true);
    await contractRoleManager.setKYC(contentBuyer.address, true);

    /// Content buyer needs to give approval to the platformtreasury
    await contractUDAO
      .connect(contentBuyer)
      .approve(
        contractPlatformTreasury.address,
        ethers.utils.parseEther("999999999999.0")
      );

    await expect(
      contractPlatformTreasury
        .connect(contentBuyer)
        .buyContent(0, true, [1], ethers.constants.AddressZero)
    ).to.revertedWith("Content does not exist!");
  });

  it("Should fail to buy content if buyer is banned", async function () {
    const {
      backend,
      contentCreator,
      contentBuyer,
      contentBuyer1,
      contentBuyer2,
      contentBuyer3,
      validatorCandidate,
      validator,
      validator1,
      validator2,
      validator3,
      validator4,
      validator5,
      superValidatorCandidate,
      superValidator,
      foundation,
      governanceCandidate,
      governanceMember,
      jurorCandidate,
      jurorMember,
      jurorMember1,
      jurorMember2,
      jurorMember3,
      jurorMember4,
      corporation,
      contractUDAO,
      contractRoleManager,
      contractUDAOCertificate,
      contractUDAOContent,
      contractSupervision,
      contractPlatformTreasury,
      contractUDAOVp,
      contractUDAOStaker,
      contractUDAOTimelockController,
      contractUDAOGovernor,
      GOVERNANCE_ROLE,
      BACKEND_ROLE,
      contractContractManager,
      account1,
      account2,
      account3,
      contractPriceGetter,
    } = await deploy();

    /// Set KYC
    await contractRoleManager.setKYC(contentCreator.address, true);
    await contractRoleManager.setKYC(contentBuyer.address, true);

    /// Set BAN
    await contractRoleManager.setBan(contentBuyer.address, true);

    /// part prices must be determined before creating content
    const partPricesArray = [
      ethers.utils.parseEther("1"),
      ethers.utils.parseEther("1"),
    ];

    /// Create voucher from redeem.js and use it for creating content
    const createContentVoucherSample = await createContentVoucher(
      contractUDAOContent,
      backend,
      contentCreator,
      partPricesArray
    );

    /// Create content
    await expect(
      contractUDAOContent
        .connect(contentCreator)
        .createContent(createContentVoucherSample)
    )
      .to.emit(contractUDAOContent, "Transfer") // transfer from null address to minter
      .withArgs(
        "0x0000000000000000000000000000000000000000",
        contentCreator.address,
        0
      );
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

    /// Send UDAO to the buyer's wallet
    await contractUDAO.transfer(
      contentBuyer.address,
      ethers.utils.parseEther("100.0")
    );
    /// Content buyer needs to give approval to the platformtreasury
    await contractUDAO
      .connect(contentBuyer)
      .approve(
        contractPlatformTreasury.address,
        ethers.utils.parseEther("999999999999.0")
      );

    await expect(
      contractPlatformTreasury
        .connect(contentBuyer)
        .buyContent(0, true, [1], ethers.constants.AddressZero)
    ).to.revertedWith("You are banned");
  });

  it("Should fail to buy content if instructer is banned", async function () {
    const {
      backend,
      contentCreator,
      contentBuyer,
      contentBuyer1,
      contentBuyer2,
      contentBuyer3,
      validatorCandidate,
      validator,
      validator1,
      validator2,
      validator3,
      validator4,
      validator5,
      superValidatorCandidate,
      superValidator,
      foundation,
      governanceCandidate,
      governanceMember,
      jurorCandidate,
      jurorMember,
      jurorMember1,
      jurorMember2,
      jurorMember3,
      jurorMember4,
      corporation,
      contractUDAO,
      contractRoleManager,
      contractUDAOCertificate,
      contractUDAOContent,
      contractSupervision,
      contractPlatformTreasury,
      contractUDAOVp,
      contractUDAOStaker,
      contractUDAOTimelockController,
      contractUDAOGovernor,
      GOVERNANCE_ROLE,
      BACKEND_ROLE,
      contractContractManager,
      account1,
      account2,
      account3,
      contractPriceGetter,
    } = await deploy();

    /// Set KYC
    await contractRoleManager.setKYC(contentCreator.address, true);
    await contractRoleManager.setKYC(contentBuyer.address, true);

    /// part prices must be determined before creating content
    const partPricesArray = [
      ethers.utils.parseEther("1"),
      ethers.utils.parseEther("1"),
    ];

    /// Create voucher from redeem.js and use it for creating content
    const createContentVoucherSample = await createContentVoucher(
      contractUDAOContent,
      backend,
      contentCreator,
      partPricesArray
    );

    /// Create content
    await expect(
      contractUDAOContent
        .connect(contentCreator)
        .createContent(createContentVoucherSample)
    )
      .to.emit(contractUDAOContent, "Transfer") // transfer from null address to minter
      .withArgs(
        "0x0000000000000000000000000000000000000000",
        contentCreator.address,
        0
      );
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

    /// Send UDAO to the buyer's wallet
    await contractUDAO.transfer(
      contentBuyer.address,
      ethers.utils.parseEther("100.0")
    );
    /// Content buyer needs to give approval to the platformtreasury
    await contractUDAO
      .connect(contentBuyer)
      .approve(
        contractPlatformTreasury.address,
        ethers.utils.parseEther("999999999999.0")
      );

    /// Set BAN
    await contractRoleManager.setBan(contentCreator.address, true);

    await expect(
      contractPlatformTreasury
        .connect(contentBuyer)
        .buyContent(0, true, [1], ethers.constants.AddressZero)
    ).to.revertedWith("Instructor is banned");
  });

  it("Should fail to buy content if instructer is not KYCed", async function () {
    const {
      backend,
      contentCreator,
      contentBuyer,
      contentBuyer1,
      contentBuyer2,
      contentBuyer3,
      validatorCandidate,
      validator,
      validator1,
      validator2,
      validator3,
      validator4,
      validator5,
      superValidatorCandidate,
      superValidator,
      foundation,
      governanceCandidate,
      governanceMember,
      jurorCandidate,
      jurorMember,
      jurorMember1,
      jurorMember2,
      jurorMember3,
      jurorMember4,
      corporation,
      contractUDAO,
      contractRoleManager,
      contractUDAOCertificate,
      contractUDAOContent,
      contractSupervision,
      contractPlatformTreasury,
      contractUDAOVp,
      contractUDAOStaker,
      contractUDAOTimelockController,
      contractUDAOGovernor,
      GOVERNANCE_ROLE,
      BACKEND_ROLE,
      contractContractManager,
      account1,
      account2,
      account3,
      contractPriceGetter,
    } = await deploy();

    /// Set KYC
    await contractRoleManager.setKYC(contentCreator.address, true);
    await contractRoleManager.setKYC(contentBuyer.address, true);

    /// part prices must be determined before creating content
    const partPricesArray = [
      ethers.utils.parseEther("1"),
      ethers.utils.parseEther("1"),
    ];

    ///Create Voucher from redeem.js and use it for creating content
    const createContentVoucherSample = await createContentVoucher(
      contractUDAOContent,
      backend,
      contentCreator,
      partPricesArray
    );

    /// Create content
    await expect(
      contractUDAOContent
        .connect(contentCreator)
        .createContent(createContentVoucherSample)
    )
      .to.emit(contractUDAOContent, "Transfer") // transfer from null address to minter
      .withArgs(
        "0x0000000000000000000000000000000000000000",
        contentCreator.address,
        0
      );
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

    /// Send UDAO to the buyer's wallet
    await contractUDAO.transfer(
      contentBuyer.address,
      ethers.utils.parseEther("100.0")
    );
    /// Content buyer needs to give approval to the platformtreasury
    await contractUDAO
      .connect(contentBuyer)
      .approve(
        contractPlatformTreasury.address,
        ethers.utils.parseEther("999999999999.0")
      );

    /// Set KYC to false
    await contractRoleManager.setKYC(contentCreator.address, false);

    await expect(
      contractPlatformTreasury
        .connect(contentBuyer)
        .buyContent(0, true, [1], ethers.constants.AddressZero)
    ).to.revertedWith("Instructor is not KYCed");
  });

  it("Should fail to buy content if buyer is not KYCed", async function () {
    const {
      backend,
      contentCreator,
      contentBuyer,
      contentBuyer1,
      contentBuyer2,
      contentBuyer3,
      validatorCandidate,
      validator,
      validator1,
      validator2,
      validator3,
      validator4,
      validator5,
      superValidatorCandidate,
      superValidator,
      foundation,
      governanceCandidate,
      governanceMember,
      jurorCandidate,
      jurorMember,
      jurorMember1,
      jurorMember2,
      jurorMember3,
      jurorMember4,
      corporation,
      contractUDAO,
      contractRoleManager,
      contractUDAOCertificate,
      contractUDAOContent,
      contractSupervision,
      contractPlatformTreasury,
      contractUDAOVp,
      contractUDAOStaker,
      contractUDAOTimelockController,
      contractUDAOGovernor,
      GOVERNANCE_ROLE,
      BACKEND_ROLE,
      contractContractManager,
      account1,
      account2,
      account3,
      contractPriceGetter,
    } = await deploy();

    /// Set KYC
    await contractRoleManager.setKYC(contentCreator.address, true);
    await contractRoleManager.setKYC(contentBuyer.address, true);

    /// part prices must be determined before creating content
    const partPricesArray = [
      ethers.utils.parseEther("1"),
      ethers.utils.parseEther("1"),
    ];

    ///Create Voucher from redeem.js and use it for creating content
    const createContentVoucherSample = await createContentVoucher(
      contractUDAOContent,
      backend,
      contentCreator,
      partPricesArray
    );

    /// Create content
    await expect(
      contractUDAOContent
        .connect(contentCreator)
        .createContent(createContentVoucherSample)
    )
      .to.emit(contractUDAOContent, "Transfer") // transfer from null address to minter
      .withArgs(
        "0x0000000000000000000000000000000000000000",
        contentCreator.address,
        0
      );
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

    /// Send UDAO to the buyer's wallet
    await contractUDAO.transfer(
      contentBuyer.address,
      ethers.utils.parseEther("100.0")
    );
    /// Content buyer needs to give approval to the platformtreasury
    await contractUDAO
      .connect(contentBuyer)
      .approve(
        contractPlatformTreasury.address,
        ethers.utils.parseEther("999999999999.0")
      );

    await contractRoleManager.setKYC(contentBuyer.address, false);

    await expect(
      contractPlatformTreasury
        .connect(contentBuyer)
        .buyContent(0, true, [1], ethers.constants.AddressZero)
    ).to.revertedWith("You are not KYCed");
  });

  it("Should fail to buy a content part if full content is already purchased", async function () {
    const {
      backend,
      contentCreator,
      contentBuyer,
      contentBuyer1,
      contentBuyer2,
      contentBuyer3,
      validatorCandidate,
      validator,
      validator1,
      validator2,
      validator3,
      validator4,
      validator5,
      superValidatorCandidate,
      superValidator,
      foundation,
      governanceCandidate,
      governanceMember,
      jurorCandidate,
      jurorMember,
      jurorMember1,
      jurorMember2,
      jurorMember3,
      jurorMember4,
      corporation,
      contractUDAO,
      contractRoleManager,
      contractUDAOCertificate,
      contractUDAOContent,
      contractSupervision,
      contractPlatformTreasury,
      contractUDAOVp,
      contractUDAOStaker,
      contractUDAOTimelockController,
      contractUDAOGovernor,
      GOVERNANCE_ROLE,
      BACKEND_ROLE,
      contractContractManager,
      account1,
      account2,
      account3,
      contractPriceGetter,
    } = await deploy();

    /// Set KYC
    await contractRoleManager.setKYC(contentCreator.address, true);
    await contractRoleManager.setKYC(contentBuyer.address, true);

    /// part prices must be determined before creating content
    const partPricesArray = [
      ethers.utils.parseEther("1"),
      ethers.utils.parseEther("1"),
      ethers.utils.parseEther("1"),
      ethers.utils.parseEther("1"),
    ];

    ///Create Voucher from redeem.js and use it for creating content
    const createContentVoucherSample = await createContentVoucher(
      contractUDAOContent,
      backend,
      contentCreator,
      partPricesArray
    );

    /// Create content
    await expect(
      contractUDAOContent
        .connect(contentCreator)
        .createContent(createContentVoucherSample)
    )
      .to.emit(contractUDAOContent, "Transfer") // transfer from null address to minter
      .withArgs(
        "0x0000000000000000000000000000000000000000",
        contentCreator.address,
        0
      );
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

    /// Send UDAO to the buyer's wallet
    await contractUDAO.transfer(
      contentBuyer.address,
      ethers.utils.parseEther("100.0")
    );
    /// Content buyer needs to give approval to the platformtreasury
    await contractUDAO
      .connect(contentBuyer)
      .approve(
        contractPlatformTreasury.address,
        ethers.utils.parseEther("999999999999.0")
      );

    await contractPlatformTreasury
      .connect(contentBuyer)
      .buyContent(0, true, [1], ethers.constants.AddressZero);

    await expect(
      contractPlatformTreasury
        .connect(contentBuyer)
        .buyContent(0, false, [3], contentBuyer.address)
    ).to.revertedWith("Full content is already bought");
  });

  it("Should fail to buy a full content if fullContentPurchase is false", async function () {
    const {
      backend,
      contentCreator,
      contentBuyer,
      contentBuyer1,
      contentBuyer2,
      contentBuyer3,
      validatorCandidate,
      validator,
      validator1,
      validator2,
      validator3,
      validator4,
      validator5,
      superValidatorCandidate,
      superValidator,
      foundation,
      governanceCandidate,
      governanceMember,
      jurorCandidate,
      jurorMember,
      jurorMember1,
      jurorMember2,
      jurorMember3,
      jurorMember4,
      corporation,
      contractUDAO,
      contractRoleManager,
      contractUDAOCertificate,
      contractUDAOContent,
      contractSupervision,
      contractPlatformTreasury,
      contractUDAOVp,
      contractUDAOStaker,
      contractUDAOTimelockController,
      contractUDAOGovernor,
      GOVERNANCE_ROLE,
      BACKEND_ROLE,
      contractContractManager,
      account1,
      account2,
      account3,
      contractPriceGetter,
    } = await deploy();

    /// Set KYC
    await contractRoleManager.setKYC(contentCreator.address, true);
    await contractRoleManager.setKYC(contentBuyer.address, true);

    /// part prices must be determined before creating content
    const partPricesArray = [
      ethers.utils.parseEther("1"),
      ethers.utils.parseEther("1"),
      ethers.utils.parseEther("1"),
      ethers.utils.parseEther("1"),
    ];

    ///Create Voucher from redeem.js and use it for creating content
    const createContentVoucherSample = await createContentVoucher(
      contractUDAOContent,
      backend,
      contentCreator,
      partPricesArray
    );

    /// Create content
    await expect(
      contractUDAOContent
        .connect(contentCreator)
        .createContent(createContentVoucherSample)
    )
      .to.emit(contractUDAOContent, "Transfer") // transfer from null address to minter
      .withArgs(
        "0x0000000000000000000000000000000000000000",
        contentCreator.address,
        0
      );
    await expect(contractSupervision.connect(validator1).assignValidation(1))
      .to.emit(contractSupervision, "ValidationAssigned")
      .withArgs(
        ethers.BigNumber.from(0),
        ethers.BigNumber.from(1),
        validator1.address
      );
    await expect(contractSupervision.connect(validator2).assignValidation(1))
      .to.emit(contractSupervision, "ValidationAssigned")
      .withArgs(
        ethers.BigNumber.from(0),
        ethers.BigNumber.from(1),
        validator2.address
      );
    await expect(contractSupervision.connect(validator3).assignValidation(1))
      .to.emit(contractSupervision, "ValidationAssigned")
      .withArgs(
        ethers.BigNumber.from(0),
        ethers.BigNumber.from(1),
        validator3.address
      );
    await expect(contractSupervision.connect(validator4).assignValidation(1))
      .to.emit(contractSupervision, "ValidationAssigned")
      .withArgs(
        ethers.BigNumber.from(0),
        ethers.BigNumber.from(1),
        validator4.address
      );
    await expect(contractSupervision.connect(validator5).assignValidation(1))
      .to.emit(contractSupervision, "ValidationAssigned")
      .withArgs(
        ethers.BigNumber.from(0),
        ethers.BigNumber.from(1),
        validator5.address
      );

    await expect(
      contractSupervision.connect(validator1).sendValidation(1, true)
    )
      .to.emit(contractSupervision, "ValidationResultSent")
      .withArgs(
        ethers.BigNumber.from(0),
        ethers.BigNumber.from(1),
        validator1.address,
        true
      );
    await expect(
      contractSupervision.connect(validator2).sendValidation(1, true)
    )
      .to.emit(contractSupervision, "ValidationResultSent")
      .withArgs(
        ethers.BigNumber.from(0),
        ethers.BigNumber.from(1),
        validator2.address,
        true
      );
    await expect(
      contractSupervision.connect(validator3).sendValidation(1, true)
    )
      .to.emit(contractSupervision, "ValidationResultSent")
      .withArgs(
        ethers.BigNumber.from(0),
        ethers.BigNumber.from(1),
        validator3.address,
        true
      );
    await expect(
      contractSupervision.connect(validator4).sendValidation(1, false)
    )
      .to.emit(contractSupervision, "ValidationResultSent")
      .withArgs(
        ethers.BigNumber.from(0),
        ethers.BigNumber.from(1),
        validator4.address,
        false
      );
    await expect(
      contractSupervision.connect(validator5).sendValidation(1, false)
    )
      .to.emit(contractSupervision, "ValidationResultSent")
      .withArgs(
        ethers.BigNumber.from(0),
        ethers.BigNumber.from(1),
        validator5.address,
        false
      );
    await expect(
      contractSupervision.connect(contentCreator).finalizeValidation(1)
    )
      .to.emit(contractSupervision, "ValidationEnded")
      .withArgs(ethers.BigNumber.from(0), ethers.BigNumber.from(1), true);

    /// Send UDAO to the buyer's wallet
    await contractUDAO.transfer(
      contentBuyer.address,
      ethers.utils.parseEther("100.0")
    );
    /// Content buyer needs to give approval to the platformtreasury
    await contractUDAO
      .connect(contentBuyer)
      .approve(
        contractPlatformTreasury.address,
        ethers.utils.parseEther("999999999999.0")
      );

    await expect(
      contractPlatformTreasury
        .connect(contentBuyer)
        .buyContent(0, false, [0], ethers.constants.AddressZero)
    ).to.revertedWith(
      "Purchased parts says 0, but fullContentPurchase is false!"
    );
  });

  it("Should fail to buy a content part if the part does not exist", async function () {
    const {
      backend,
      contentCreator,
      contentBuyer,
      contentBuyer1,
      contentBuyer2,
      contentBuyer3,
      validatorCandidate,
      validator,
      validator1,
      validator2,
      validator3,
      validator4,
      validator5,
      superValidatorCandidate,
      superValidator,
      foundation,
      governanceCandidate,
      governanceMember,
      jurorCandidate,
      jurorMember,
      jurorMember1,
      jurorMember2,
      jurorMember3,
      jurorMember4,
      corporation,
      contractUDAO,
      contractRoleManager,
      contractUDAOCertificate,
      contractUDAOContent,
      contractSupervision,
      contractPlatformTreasury,
      contractUDAOVp,
      contractUDAOStaker,
      contractUDAOTimelockController,
      contractUDAOGovernor,
      GOVERNANCE_ROLE,
      BACKEND_ROLE,
      contractContractManager,
      account1,
      account2,
      account3,
      contractPriceGetter,
    } = await deploy();

    /// Set KYC
    await contractRoleManager.setKYC(contentCreator.address, true);
    await contractRoleManager.setKYC(contentBuyer.address, true);

    /// part prices must be determined before creating content
    const partPricesArray = [
      ethers.utils.parseEther("1"),
      ethers.utils.parseEther("1"),
      ethers.utils.parseEther("1"),
      ethers.utils.parseEther("1"),
    ];

    ///Create Voucher from redeem.js and use it for creating content
    const createContentVoucherSample = await createContentVoucher(
      contractUDAOContent,
      backend,
      contentCreator,
      partPricesArray
    );

    /// Create content
    await expect(
      contractUDAOContent
        .connect(contentCreator)
        .createContent(createContentVoucherSample)
    )
      .to.emit(contractUDAOContent, "Transfer") // transfer from null address to minter
      .withArgs(
        "0x0000000000000000000000000000000000000000",
        contentCreator.address,
        0
      );
    await expect(contractSupervision.connect(validator1).assignValidation(1))
      .to.emit(contractSupervision, "ValidationAssigned")
      .withArgs(
        ethers.BigNumber.from(0),
        ethers.BigNumber.from(1),
        validator1.address
      );
    await expect(contractSupervision.connect(validator2).assignValidation(1))
      .to.emit(contractSupervision, "ValidationAssigned")
      .withArgs(
        ethers.BigNumber.from(0),
        ethers.BigNumber.from(1),
        validator2.address
      );
    await expect(contractSupervision.connect(validator3).assignValidation(1))
      .to.emit(contractSupervision, "ValidationAssigned")
      .withArgs(
        ethers.BigNumber.from(0),
        ethers.BigNumber.from(1),
        validator3.address
      );
    await expect(contractSupervision.connect(validator4).assignValidation(1))
      .to.emit(contractSupervision, "ValidationAssigned")
      .withArgs(
        ethers.BigNumber.from(0),
        ethers.BigNumber.from(1),
        validator4.address
      );
    await expect(contractSupervision.connect(validator5).assignValidation(1))
      .to.emit(contractSupervision, "ValidationAssigned")
      .withArgs(
        ethers.BigNumber.from(0),
        ethers.BigNumber.from(1),
        validator5.address
      );

    await expect(
      contractSupervision.connect(validator1).sendValidation(1, true)
    )
      .to.emit(contractSupervision, "ValidationResultSent")
      .withArgs(
        ethers.BigNumber.from(0),
        ethers.BigNumber.from(1),
        validator1.address,
        true
      );
    await expect(
      contractSupervision.connect(validator2).sendValidation(1, true)
    )
      .to.emit(contractSupervision, "ValidationResultSent")
      .withArgs(
        ethers.BigNumber.from(0),
        ethers.BigNumber.from(1),
        validator2.address,
        true
      );
    await expect(
      contractSupervision.connect(validator3).sendValidation(1, true)
    )
      .to.emit(contractSupervision, "ValidationResultSent")
      .withArgs(
        ethers.BigNumber.from(0),
        ethers.BigNumber.from(1),
        validator3.address,
        true
      );
    await expect(
      contractSupervision.connect(validator4).sendValidation(1, false)
    )
      .to.emit(contractSupervision, "ValidationResultSent")
      .withArgs(
        ethers.BigNumber.from(0),
        ethers.BigNumber.from(1),
        validator4.address,
        false
      );
    await expect(
      contractSupervision.connect(validator5).sendValidation(1, false)
    )
      .to.emit(contractSupervision, "ValidationResultSent")
      .withArgs(
        ethers.BigNumber.from(0),
        ethers.BigNumber.from(1),
        validator5.address,
        false
      );
    await expect(
      contractSupervision.connect(contentCreator).finalizeValidation(1)
    )
      .to.emit(contractSupervision, "ValidationEnded")
      .withArgs(ethers.BigNumber.from(0), ethers.BigNumber.from(1), true);

    /// Send UDAO to the buyer's wallet
    await contractUDAO.transfer(
      contentBuyer.address,
      ethers.utils.parseEther("100.0")
    );
    /// Content buyer needs to give approval to the platformtreasury
    await contractUDAO
      .connect(contentBuyer)
      .approve(
        contractPlatformTreasury.address,
        ethers.utils.parseEther("999999999999.0")
      );

    await expect(
      contractPlatformTreasury
        .connect(contentBuyer)
        .buyContent(0, false, [20], ethers.constants.AddressZero)
    ).to.revertedWith("Part does not exist!");
  });

  it("Should buy the full content for someone else", async function () {
    const {
      backend,
      contentCreator,
      contentBuyer,
      contentBuyer1,
      contentBuyer2,
      contentBuyer3,
      validatorCandidate,
      validator,
      validator1,
      validator2,
      validator3,
      validator4,
      validator5,
      superValidatorCandidate,
      superValidator,
      foundation,
      governanceCandidate,
      governanceMember,
      jurorCandidate,
      jurorMember,
      jurorMember1,
      jurorMember2,
      jurorMember3,
      jurorMember4,
      corporation,
      contractUDAO,
      contractRoleManager,
      contractUDAOCertificate,
      contractUDAOContent,
      contractSupervision,
      contractPlatformTreasury,
      contractUDAOVp,
      contractUDAOStaker,
      contractUDAOTimelockController,
      contractUDAOGovernor,
      GOVERNANCE_ROLE,
      BACKEND_ROLE,
      contractContractManager,
      account1,
      account2,
      account3,
      contractPriceGetter,
    } = await deploy();

    /// Set KYC
    await contractRoleManager.setKYC(contentCreator.address, true);
    await contractRoleManager.setKYC(contentBuyer.address, true);
    await contractRoleManager.setKYC(validator1.address, true);

    /// part prices must be determined before creating content
    const partPricesArray = [
      ethers.utils.parseEther("1"),
      ethers.utils.parseEther("1"),
    ];

    ///Create Voucher from redeem.js and use it for creating content
    const createContentVoucherSample = await createContentVoucher(
      contractUDAOContent,
      backend,
      contentCreator,
      partPricesArray
    );

    /// Create content
    await expect(
      contractUDAOContent
        .connect(contentCreator)
        .createContent(createContentVoucherSample)
    )
      .to.emit(contractUDAOContent, "Transfer") // transfer from null address to minter
      .withArgs(
        "0x0000000000000000000000000000000000000000",
        contentCreator.address,
        0
      );
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

    /// Send UDAO to the buyer's wallet
    await contractUDAO.transfer(
      contentBuyer.address,
      ethers.utils.parseEther("100.0")
    );
    /// Content buyer needs to give approval to the platformtreasury
    await contractUDAO
      .connect(contentBuyer)
      .approve(
        contractPlatformTreasury.address,
        ethers.utils.parseEther("999999999999.0")
      );

    await contractPlatformTreasury
      .connect(contentBuyer)
      .buyContent(0, true, [1], validator1.address);
    const result = await contractPlatformTreasury
      .connect(contentBuyer)
      .getOwnedContent(validator1.address);

    const numArray = result.map((x) => x.map((y) => y.toNumber()));
    expect(numArray).to.eql([[0, 0]]);
  });

  it("Should buy the part of the content for someone else", async function () {
    const {
      backend,
      contentCreator,
      contentBuyer,
      contentBuyer1,
      contentBuyer2,
      contentBuyer3,
      validatorCandidate,
      validator,
      validator1,
      validator2,
      validator3,
      validator4,
      validator5,
      superValidatorCandidate,
      superValidator,
      foundation,
      governanceCandidate,
      governanceMember,
      jurorCandidate,
      jurorMember,
      jurorMember1,
      jurorMember2,
      jurorMember3,
      jurorMember4,
      corporation,
      contractUDAO,
      contractRoleManager,
      contractUDAOCertificate,
      contractUDAOContent,
      contractSupervision,
      contractPlatformTreasury,
      contractUDAOVp,
      contractUDAOStaker,
      contractUDAOTimelockController,
      contractUDAOGovernor,
      GOVERNANCE_ROLE,
      BACKEND_ROLE,
      contractContractManager,
      account1,
      account2,
      account3,
      contractPriceGetter,
    } = await deploy();

    /// Set KYC
    await contractRoleManager.setKYC(contentCreator.address, true);
    await contractRoleManager.setKYC(contentBuyer.address, true);
    await contractRoleManager.setKYC(validator1.address, true);

    /// part prices must be determined before creating content
    const partPricesArray = [
      ethers.utils.parseEther("1"),
      ethers.utils.parseEther("1"),
      ethers.utils.parseEther("1"),
    ];

    ///Create Voucher from redeem.js and use it for creating content
    const createContentVoucherSample = await createContentVoucher(
      contractUDAOContent,
      backend,
      contentCreator,
      partPricesArray
    );

    /// Create content
    await expect(
      contractUDAOContent
        .connect(contentCreator)
        .createContent(createContentVoucherSample)
    )
      .to.emit(contractUDAOContent, "Transfer") // transfer from null address to minter
      .withArgs(
        "0x0000000000000000000000000000000000000000",
        contentCreator.address,
        0
      );
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

    /// Send UDAO to the buyer's wallet
    await contractUDAO.transfer(
      contentBuyer.address,
      ethers.utils.parseEther("100.0")
    );
    /// Content buyer needs to give approval to the platformtreasury
    await contractUDAO
      .connect(contentBuyer)
      .approve(
        contractPlatformTreasury.address,
        ethers.utils.parseEther("999999999999.0")
      );

    await contractPlatformTreasury
      .connect(contentBuyer)
      .buyContent(0, false, [1, 2], validator1.address);
    const result = await contractPlatformTreasury
      .connect(contentBuyer)
      .getOwnedContent(validator1.address);

    const numArray = result.map((x) => x.map((y) => y.toNumber()));
    expect(numArray).to.eql([
      [0, 1],
      [0, 2],
    ]);
  });

  it("Should fail to buy the full content for someone else if other account is not KYCed", async function () {
    const {
      backend,
      contentCreator,
      contentBuyer,
      contentBuyer1,
      contentBuyer2,
      contentBuyer3,
      validatorCandidate,
      validator,
      validator1,
      validator2,
      validator3,
      validator4,
      validator5,
      superValidatorCandidate,
      superValidator,
      foundation,
      governanceCandidate,
      governanceMember,
      jurorCandidate,
      jurorMember,
      jurorMember1,
      jurorMember2,
      jurorMember3,
      jurorMember4,
      corporation,
      contractUDAO,
      contractRoleManager,
      contractUDAOCertificate,
      contractUDAOContent,
      contractSupervision,
      contractPlatformTreasury,
      contractUDAOVp,
      contractUDAOStaker,
      contractUDAOTimelockController,
      contractUDAOGovernor,
      GOVERNANCE_ROLE,
      BACKEND_ROLE,
      contractContractManager,
      account1,
      account2,
      account3,
      contractPriceGetter,
    } = await deploy();

    /// Set KYC
    await contractRoleManager.setKYC(contentCreator.address, true);
    await contractRoleManager.setKYC(contentBuyer.address, true);

    /// part prices must be determined before creating content
    const partPricesArray = [
      ethers.utils.parseEther("1"),
      ethers.utils.parseEther("1"),
    ];

    ///Create Voucher from redeem.js and use it for creating content
    const createContentVoucherSample = await createContentVoucher(
      contractUDAOContent,
      backend,
      contentCreator,
      partPricesArray
    );

    /// Create content
    await expect(
      contractUDAOContent
        .connect(contentCreator)
        .createContent(createContentVoucherSample)
    )
      .to.emit(contractUDAOContent, "Transfer") // transfer from null address to minter
      .withArgs(
        "0x0000000000000000000000000000000000000000",
        contentCreator.address,
        0
      );
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

    /// Send UDAO to the buyer's wallet
    await contractUDAO.transfer(
      contentBuyer.address,
      ethers.utils.parseEther("100.0")
    );
    /// Content buyer needs to give approval to the platformtreasury
    await contractUDAO
      .connect(contentBuyer)
      .approve(
        contractPlatformTreasury.address,
        ethers.utils.parseEther("999999999999.0")
      );

    // Set kyc of validator1
    await contractRoleManager.setKYC(validator1.address, false);

    await expect(
      contractPlatformTreasury
        .connect(contentBuyer)
        .buyContent(0, true, [1], validator1.address)
    ).to.revertedWith("Gift receiver is not KYCed");
  });

  it("Should fail to buy the full content for someone else if other account is banned", async function () {
    const {
      backend,
      contentCreator,
      contentBuyer,
      contentBuyer1,
      contentBuyer2,
      contentBuyer3,
      validatorCandidate,
      validator,
      validator1,
      validator2,
      validator3,
      validator4,
      validator5,
      superValidatorCandidate,
      superValidator,
      foundation,
      governanceCandidate,
      governanceMember,
      jurorCandidate,
      jurorMember,
      jurorMember1,
      jurorMember2,
      jurorMember3,
      jurorMember4,
      corporation,
      contractUDAO,
      contractRoleManager,
      contractUDAOCertificate,
      contractUDAOContent,
      contractSupervision,
      contractPlatformTreasury,
      contractUDAOVp,
      contractUDAOStaker,
      contractUDAOTimelockController,
      contractUDAOGovernor,
      GOVERNANCE_ROLE,
      BACKEND_ROLE,
      contractContractManager,
      account1,
      account2,
      account3,
      contractPriceGetter,
    } = await deploy();

    /// Set KYC
    await contractRoleManager.setKYC(contentCreator.address, true);
    await contractRoleManager.setKYC(contentBuyer.address, true);
    await contractRoleManager.setBan(validator1.address, true);

    /// part prices must be determined before creating content
    const partPricesArray = [
      ethers.utils.parseEther("1"),
      ethers.utils.parseEther("1"),
    ];

    ///Create Voucher from redeem.js and use it for creating content
    const createContentVoucherSample = await createContentVoucher(
      contractUDAOContent,
      backend,
      contentCreator,
      partPricesArray
    );

    /// Create content
    await expect(
      contractUDAOContent
        .connect(contentCreator)
        .createContent(createContentVoucherSample)
    )
      .to.emit(contractUDAOContent, "Transfer") // transfer from null address to minter
      .withArgs(
        "0x0000000000000000000000000000000000000000",
        contentCreator.address,
        0
      );
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

    /// Send UDAO to the buyer's wallet
    await contractUDAO.transfer(
      contentBuyer.address,
      ethers.utils.parseEther("100.0")
    );
    /// Content buyer needs to give approval to the platformtreasury
    await contractUDAO
      .connect(contentBuyer)
      .approve(
        contractPlatformTreasury.address,
        ethers.utils.parseEther("999999999999.0")
      );

    await expect(
      contractPlatformTreasury
        .connect(contentBuyer)
        .buyContent(0, true, [1], validator1.address)
    ).to.revertedWith("Gift receiver is banned");
  });

  it("Should a user able to buy the full content with discount", async function () {
    const {
      backend,
      contentCreator,
      contentBuyer,
      contentBuyer1,
      contentBuyer2,
      contentBuyer3,
      validatorCandidate,
      validator,
      validator1,
      validator2,
      validator3,
      validator4,
      validator5,
      superValidatorCandidate,
      superValidator,
      foundation,
      governanceCandidate,
      governanceMember,
      jurorCandidate,
      jurorMember,
      jurorMember1,
      jurorMember2,
      jurorMember3,
      jurorMember4,
      corporation,
      contractUDAO,
      contractRoleManager,
      contractUDAOCertificate,
      contractUDAOContent,
      contractSupervision,
      contractPlatformTreasury,
      contractUDAOVp,
      contractUDAOStaker,
      contractUDAOTimelockController,
      contractUDAOGovernor,
      GOVERNANCE_ROLE,
      BACKEND_ROLE,
      contractContractManager,
      account1,
      account2,
      account3,
      contractPriceGetter,
    } = await deploy();

    /// Set KYC
    await contractRoleManager.setKYC(contentCreator.address, true);
    await contractRoleManager.setKYC(contentBuyer.address, true);

    /// part prices must be determined before creating content
    const partPricesArray = [
      ethers.utils.parseEther("1"),
      ethers.utils.parseEther("1"),
    ];

    ///Create Voucher from redeem.js and use it for creating content
    const createContentVoucherSample = await createContentVoucher(
      contractUDAOContent,
      backend,
      contentCreator,
      partPricesArray
    );

    /// Create content
    await expect(
      contractUDAOContent
        .connect(contentCreator)
        .createContent(createContentVoucherSample)
    )
      .to.emit(contractUDAOContent, "Transfer") // transfer from null address to minter
      .withArgs(
        "0x0000000000000000000000000000000000000000",
        contentCreator.address,
        0
      );
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

    /// Send UDAO to the buyer's wallet
    await contractUDAO.transfer(
      contentBuyer.address,
      ethers.utils.parseEther("100.0")
    );
    /// Content buyer needs to give approval to the platformtreasury
    await contractUDAO
      .connect(contentBuyer)
      .approve(
        contractPlatformTreasury.address,
        ethers.utils.parseEther("999999999999.0")
      );

    const discountedPurchase = new DiscountedPurchase({
      contract: contractPlatformTreasury,
      signer: backend,
    });
    const coaching_voucher = await discountedPurchase.createVoucher(
      0,
      true,
      [0],
      ethers.utils.parseEther("0.5"),
      Date.now() + 999999999,
      contentBuyer.address,
      ethers.constants.AddressZero
    );

    await contractPlatformTreasury
      .connect(contentBuyer)
      .buyDiscountedContent(coaching_voucher);
    const result = await contractPlatformTreasury
      .connect(contentBuyer)
      .getOwnedContent(contentBuyer.address);

    const numArray = result.map((x) => x.map((y) => y.toNumber()));
    expect(numArray).to.eql([[0, 0]]);
  });
});
