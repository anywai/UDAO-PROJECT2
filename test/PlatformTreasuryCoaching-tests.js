const { expect } = require("chai");
const hardhat = require("hardhat");
const { ethers } = hardhat;
const chai = require("chai");
const BN = require("bn.js");
const { LazyCoaching } = require("../lib/LazyCoaching");
const helpers = require("@nomicfoundation/hardhat-network-helpers");
const { deploy } = require("../lib/deployments");

const {
  WMATIC_ABI,
  NonFunbiblePositionABI,
  NonFunbiblePositionAddress,
  WMATICAddress,
} = require("../lib/abis");

// Enable and inject BN dependency
chai.use(require("chai-bn")(BN));

async function runValidation(
  contractValidationManager,
  backend,
  validator1,
  validator2,
  validator3,
  validator4,
  validator5,
  contentCreator
) {
  await expect(
    contractValidationManager.connect(contentCreator).createValidation(0, 50)
  )
    .to.emit(contractValidationManager, "ValidationCreated")
    .withArgs(ethers.BigNumber.from(0), ethers.BigNumber.from(1));
  await expect(
    contractValidationManager.connect(validator1).assignValidation(1)
  )
    .to.emit(contractValidationManager, "ValidationAssigned")
    .withArgs(
      ethers.BigNumber.from(0),
      ethers.BigNumber.from(1),
      validator1.address
    );
  await expect(
    contractValidationManager.connect(validator2).assignValidation(1)
  )
    .to.emit(contractValidationManager, "ValidationAssigned")
    .withArgs(
      ethers.BigNumber.from(0),
      ethers.BigNumber.from(1),
      validator2.address
    );
  await expect(
    contractValidationManager.connect(validator3).assignValidation(1)
  )
    .to.emit(contractValidationManager, "ValidationAssigned")
    .withArgs(
      ethers.BigNumber.from(0),
      ethers.BigNumber.from(1),
      validator3.address
    );
  await expect(
    contractValidationManager.connect(validator4).assignValidation(1)
  )
    .to.emit(contractValidationManager, "ValidationAssigned")
    .withArgs(
      ethers.BigNumber.from(0),
      ethers.BigNumber.from(1),
      validator4.address
    );
  await expect(
    contractValidationManager.connect(validator5).assignValidation(1)
  )
    .to.emit(contractValidationManager, "ValidationAssigned")
    .withArgs(
      ethers.BigNumber.from(0),
      ethers.BigNumber.from(1),
      validator5.address
    );

  await expect(
    contractValidationManager.connect(validator1).sendValidation(1, true)
  )
    .to.emit(contractValidationManager, "ValidationResultSent")
    .withArgs(
      ethers.BigNumber.from(0),
      ethers.BigNumber.from(1),
      validator1.address,
      true
    );
  await expect(
    contractValidationManager.connect(validator2).sendValidation(1, true)
  )
    .to.emit(contractValidationManager, "ValidationResultSent")
    .withArgs(
      ethers.BigNumber.from(0),
      ethers.BigNumber.from(1),
      validator2.address,
      true
    );
  await expect(
    contractValidationManager.connect(validator3).sendValidation(1, true)
  )
    .to.emit(contractValidationManager, "ValidationResultSent")
    .withArgs(
      ethers.BigNumber.from(0),
      ethers.BigNumber.from(1),
      validator3.address,
      true
    );
  await expect(
    contractValidationManager.connect(validator4).sendValidation(1, true)
  )
    .to.emit(contractValidationManager, "ValidationResultSent")
    .withArgs(
      ethers.BigNumber.from(0),
      ethers.BigNumber.from(1),
      validator4.address,
      true
    );
  await expect(
    contractValidationManager.connect(validator5).sendValidation(1, false)
  )
    .to.emit(contractValidationManager, "ValidationResultSent")
    .withArgs(
      ethers.BigNumber.from(0),
      ethers.BigNumber.from(1),
      validator5.address,
      false
    );
  await expect(
    contractValidationManager.connect(contentCreator).finalizeValidation(1)
  )
    .to.emit(contractValidationManager, "ValidationEnded")
    .withArgs(ethers.BigNumber.from(0), ethers.BigNumber.from(1), true);
}

describe("Platform Treasury Contract - Coaching", function () {
  it("Should a user able to buy a coaching", async function () {
    const {
      backend,
      contentCreator,
      contentBuyer,
      validatorCandidate,
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
      contractUDAO,
      contractRoleManager,
      contractUDAOCertificate,
      contractUDAOContent,
      contractValidationManager,
      contractPlatformTreasury,
      contractUDAOVp,
      contractUDAOStaker,
      contractUDAOTimelockController,
      contractUDAOGovernor,
    } = await deploy(false, true);
    /// Set KYC
    await contractRoleManager.setKYC(contentCreator.address, true);
    await contractRoleManager.setKYC(contentBuyer.address, true);

    await expect(
      contractUDAOContent
        .connect(contentCreator)
        .redeem(
          [ethers.utils.parseEther("1"), ethers.utils.parseEther("1")],
          "udao",
          "ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi",
          contentCreator.address,
          ethers.utils.parseEther("2"),
          "udao",
          true,
          true
        )
    )
      .to.emit(contractUDAOContent, "Transfer") // transfer from null address to minter
      .withArgs(
        "0x0000000000000000000000000000000000000000",
        contentCreator.address,
        0
      );

    /// Start validation and finalize it
    await runValidation(
      contractValidationManager,
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

    // Buy coaching
    const purchaseTx = await contractPlatformTreasury
      .connect(contentBuyer)
      .buyCoaching(0);
    const queueTxReceipt = await purchaseTx.wait();
    const queueTxEvent = queueTxReceipt.events.find(
      (e) => e.event == "CoachingBought"
    );
    const coachingId = queueTxEvent.args[2];
    // Get coaching struct
    const coachingStruct = await contractPlatformTreasury.coachingStructs(
      coachingId
    );
    // Check if returned learner address is the same as the buyer address
    expect(coachingStruct.learner).to.equal(contentBuyer.address);
  });

  it("Should return coaching list of token", async function () {
    const {
      backend,
      contentCreator,
      contentBuyer,
      validatorCandidate,
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
      contractUDAO,
      contractRoleManager,
      contractUDAOCertificate,
      contractUDAOContent,
      contractValidationManager,
      contractPlatformTreasury,
      contractUDAOVp,
      contractUDAOStaker,
      contractUDAOTimelockController,
      contractUDAOGovernor,
    } = await deploy(false, true);

    /// Set KYC
    await contractRoleManager.setKYC(contentCreator.address, true);
    await contractRoleManager.setKYC(contentBuyer.address, true);

    await expect(
      contractUDAOContent
        .connect(contentCreator)
        .redeem(
          [ethers.utils.parseEther("1")],
          "udao",
          "ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi",
          contentCreator.address,
          ethers.utils.parseEther("2"),
          "udao",
          true,
          true
        )
    )
      .to.emit(contractUDAOContent, "Transfer") // transfer from null address to minter
      .withArgs(
        "0x0000000000000000000000000000000000000000",
        contentCreator.address,
        0
      );
    /// Start validation and finalize it
    await runValidation(
      contractValidationManager,
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

    await contractPlatformTreasury.connect(contentBuyer).buyCoaching(0);
    await contractPlatformTreasury.connect(contentBuyer).buyCoaching(0);
    expect(await contractPlatformTreasury.getStudentListOfToken(0)).to.be.eql([
      contentBuyer.address,
      contentBuyer.address,
    ]);
    expect(
      (await contractPlatformTreasury.getCoachings(0)).toString()
    ).to.be.eql("0,1");
  });

  it("Should fail to buy a coaching if coaching is not enabled", async function () {
    const {
      backend,
      contentCreator,
      contentBuyer,
      validatorCandidate,
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
      contractUDAO,
      contractRoleManager,
      contractUDAOCertificate,
      contractUDAOContent,
      contractValidationManager,
      contractPlatformTreasury,
      contractUDAOVp,
      contractUDAOStaker,
      contractUDAOTimelockController,
      contractUDAOGovernor,
    } = await deploy(false, true);

    /// Set KYC
    await contractRoleManager.setKYC(contentCreator.address, true);
    await contractRoleManager.setKYC(contentBuyer.address, true);

    await expect(
      contractUDAOContent
        .connect(contentCreator)
        .redeem(
          [ethers.utils.parseEther("1")],
          "udao",
          "ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi",
          contentCreator.address,
          ethers.utils.parseEther("2"),
          "udao",
          false,
          false
        )
    )
      .to.emit(contractUDAOContent, "Transfer") // transfer from null address to minter
      .withArgs(
        "0x0000000000000000000000000000000000000000",
        contentCreator.address,
        0
      );
    /// Start validation and finalize it
    await runValidation(
      contractValidationManager,
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
      contractPlatformTreasury.connect(contentBuyer).buyCoaching(0)
    ).to.revertedWith("Coaching is not enabled for this content");
  });

  it("Should fail to buy coaching if content does not exists", async function () {
    const {
      backend,
      contentCreator,
      contentBuyer,
      validatorCandidate,
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
      contractUDAO,
      contractRoleManager,
      contractUDAOCertificate,
      contractUDAOContent,
      contractValidationManager,
      contractPlatformTreasury,
      contractUDAOVp,
      contractUDAOStaker,
      contractUDAOTimelockController,
      contractUDAOGovernor,
    } = await deploy();

    /// Set KYC
    await contractRoleManager.setKYC(contentCreator.address, true);
    await contractRoleManager.setKYC(contentBuyer.address, true);

    await expect(
      contractPlatformTreasury.connect(contentBuyer).buyCoaching(0)
    ).to.revertedWith("Content does not exist!");
  });

  it("Should fail to buy coaching if content is not validated yet", async function () {
    const {
      backend,
      contentCreator,
      contentBuyer,
      validatorCandidate,
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
      contractUDAO,
      contractRoleManager,
      contractUDAOCertificate,
      contractUDAOContent,
      contractValidationManager,
      contractPlatformTreasury,
      contractUDAOVp,
      contractUDAOStaker,
      contractUDAOTimelockController,
      contractUDAOGovernor,
    } = await deploy();

    /// Set KYC
    await contractRoleManager.setKYC(contentCreator.address, true);
    await contractRoleManager.setKYC(contentBuyer.address, true);

    await expect(
      contractUDAOContent
        .connect(contentCreator)
        .redeem(
          [ethers.utils.parseEther("1")],
          "udao",
          "ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi",
          contentCreator.address,
          ethers.utils.parseEther("2"),
          "udao",
          true,
          true
        )
    )
      .to.emit(contractUDAOContent, "Transfer") // transfer from null address to minter
      .withArgs(
        "0x0000000000000000000000000000000000000000",
        contentCreator.address,
        0
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
      contractPlatformTreasury.connect(contentBuyer).buyCoaching(0)
    ).to.revertedWith("Content is not validated yet");
  });

  it("Should fail to buy coaching if buyer is banned", async function () {
    const {
      backend,
      contentCreator,
      contentBuyer,
      validatorCandidate,
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
      contractUDAO,
      contractRoleManager,
      contractUDAOCertificate,
      contractUDAOContent,
      contractValidationManager,
      contractPlatformTreasury,
      contractUDAOVp,
      contractUDAOStaker,
      contractUDAOTimelockController,
      contractUDAOGovernor,
    } = await deploy(false, true);

    /// Set KYC
    await contractRoleManager.setKYC(contentCreator.address, true);
    await contractRoleManager.setKYC(contentBuyer.address, true);

    await expect(
      contractUDAOContent
        .connect(contentCreator)
        .redeem(
          [ethers.utils.parseEther("1")],
          "udao",
          "ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi",
          contentCreator.address,
          ethers.utils.parseEther("2"),
          "udao",
          true,
          true
        )
    )
      .to.emit(contractUDAOContent, "Transfer") // transfer from null address to minter
      .withArgs(
        "0x0000000000000000000000000000000000000000",
        contentCreator.address,
        0
      );
    /// Start validation and finalize it
    await runValidation(
      contractValidationManager,
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
    await contractRoleManager.setBan(contentBuyer.address, true);

    await expect(
      contractPlatformTreasury.connect(contentBuyer).buyCoaching(0)
    ).to.revertedWith("You are banned");
  });

  it("Should fail to buy coaching if instructer is banned", async function () {
    const {
      backend,
      contentCreator,
      contentBuyer,
      validatorCandidate,
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
      contractUDAO,
      contractRoleManager,
      contractUDAOCertificate,
      contractUDAOContent,
      contractValidationManager,
      contractPlatformTreasury,
      contractUDAOVp,
      contractUDAOStaker,
      contractUDAOTimelockController,
      contractUDAOGovernor,
    } = await deploy(false, true);

    /// Set KYC
    await contractRoleManager.setKYC(contentCreator.address, true);
    await contractRoleManager.setKYC(contentBuyer.address, true);

    await expect(
      contractUDAOContent
        .connect(contentCreator)
        .redeem(
          [ethers.utils.parseEther("1")],
          "udao",
          "ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi",
          contentCreator.address,
          ethers.utils.parseEther("2"),
          "udao",
          true,
          true
        )
    )
      .to.emit(contractUDAOContent, "Transfer") // transfer from null address to minter
      .withArgs(
        "0x0000000000000000000000000000000000000000",
        contentCreator.address,
        0
      );
    /// Start validation and finalize it
    await runValidation(
      contractValidationManager,
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
      contractPlatformTreasury.connect(contentBuyer).buyCoaching(0)
    ).to.revertedWith("Instructor is banned");
  });

  it("Should fail to buy coaching if instructer is not KYCed", async function () {
    const {
      backend,
      contentCreator,
      contentBuyer,
      validatorCandidate,
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
      contractUDAO,
      contractRoleManager,
      contractUDAOCertificate,
      contractUDAOContent,
      contractValidationManager,
      contractPlatformTreasury,
      contractUDAOVp,
      contractUDAOStaker,
      contractUDAOTimelockController,
      contractUDAOGovernor,
    } = await deploy(false, true);

    /// Set KYC
    await contractRoleManager.setKYC(contentCreator.address, true);
    await contractRoleManager.setKYC(contentBuyer.address, true);

    await expect(
      contractUDAOContent
        .connect(contentCreator)
        .redeem(
          [ethers.utils.parseEther("1")],
          "udao",
          "ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi",
          contentCreator.address,
          ethers.utils.parseEther("2"),
          "udao",
          true,
          true
        )
    )
      .to.emit(contractUDAOContent, "Transfer") // transfer from null address to minter
      .withArgs(
        "0x0000000000000000000000000000000000000000",
        contentCreator.address,
        0
      );
    /// Start validation and finalize it
    await runValidation(
      contractValidationManager,
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
      contractPlatformTreasury.connect(contentBuyer).buyCoaching(0)
    ).to.revertedWith("Instructor is not KYCed");
  });

  it("Should fail to buy coaching if buyer is not KYCed", async function () {
    const {
      backend,
      contentCreator,
      contentBuyer,
      validatorCandidate,
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
      contractUDAO,
      contractRoleManager,
      contractUDAOCertificate,
      contractUDAOContent,
      contractValidationManager,
      contractPlatformTreasury,
      contractUDAOVp,
      contractUDAOStaker,
      contractUDAOTimelockController,
      contractUDAOGovernor,
    } = await deploy(false, true);

    /// Set KYC
    await contractRoleManager.setKYC(contentCreator.address, true);
    await contractRoleManager.setKYC(contentBuyer.address, true);

    await expect(
      contractUDAOContent
        .connect(contentCreator)
        .redeem(
          [ethers.utils.parseEther("1")],
          "udao",
          "ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi",
          contentCreator.address,
          ethers.utils.parseEther("2"),
          "udao",
          true,
          true
        )
    )
      .to.emit(contractUDAOContent, "Transfer") // transfer from null address to minter
      .withArgs(
        "0x0000000000000000000000000000000000000000",
        contentCreator.address,
        0
      );
    /// Start validation and finalize it
    await runValidation(
      contractValidationManager,
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
      contractPlatformTreasury.connect(contentBuyer).buyCoaching(0)
    ).to.revertedWith("You are not KYCed");
  });

  it("Should finalize coaching as learner", async function () {
    const {
      backend,
      contentCreator,
      contentBuyer,
      validatorCandidate,
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
      contractUDAO,
      contractRoleManager,
      contractUDAOCertificate,
      contractUDAOContent,
      contractValidationManager,
      contractPlatformTreasury,
      contractUDAOVp,
      contractUDAOStaker,
      contractUDAOTimelockController,
      contractUDAOGovernor,
    } = await deploy(false, true);

    /// Set KYC
    await contractRoleManager.setKYC(contentCreator.address, true);
    await contractRoleManager.setKYC(contentBuyer.address, true);

    await expect(
      contractUDAOContent
        .connect(contentCreator)
        .redeem(
          [ethers.utils.parseEther("1")],
          "udao",
          "ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi",
          contentCreator.address,
          ethers.utils.parseEther("2"),
          "udao",
          true,
          true
        )
    )
      .to.emit(contractUDAOContent, "Transfer") // transfer from null address to minter
      .withArgs(
        "0x0000000000000000000000000000000000000000",
        contentCreator.address,
        0
      );

    /// Start validation and finalize it
    await runValidation(
      contractValidationManager,
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

    // Buy coaching
    const purchaseTx = await contractPlatformTreasury
      .connect(contentBuyer)
      .buyCoaching(0);
    const queueTxReceipt = await purchaseTx.wait();
    const queueTxEvent = queueTxReceipt.events.find(
      (e) => e.event == "CoachingBought"
    );
    const coachingId = queueTxEvent.args[2];
    // Get coaching struct
    const coachingStruct = await contractPlatformTreasury.coachingStructs(
      coachingId
    );
    // Check if returned learner address is the same as the buyer address
    expect(coachingStruct.learner).to.equal(contentBuyer.address);

    await contractPlatformTreasury.connect(contentBuyer).finalizeCoaching(0);
    expect(
      await contractPlatformTreasury.instructorBalance(contentCreator.address)
    ).to.be.eql(ethers.utils.parseEther("1.906"));
  });

  it("Should finalize coaching as instructor when deadline met", async function () {
    const {
      backend,
      contentCreator,
      contentBuyer,
      validatorCandidate,
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
      contractUDAO,
      contractRoleManager,
      contractUDAOCertificate,
      contractUDAOContent,
      contractValidationManager,
      contractPlatformTreasury,
      contractUDAOVp,
      contractUDAOStaker,
      contractUDAOTimelockController,
      contractUDAOGovernor,
    } = await deploy(false, true);

    /// Set KYC
    await contractRoleManager.setKYC(contentCreator.address, true);
    await contractRoleManager.setKYC(contentBuyer.address, true);

    await expect(
      contractUDAOContent
        .connect(contentCreator)
        .redeem(
          [ethers.utils.parseEther("1")],
          "udao",
          "ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi",
          contentCreator.address,
          ethers.utils.parseEther("2"),
          "udao",
          true,
          true
        )
    )
      .to.emit(contractUDAOContent, "Transfer") // transfer from null address to minter
      .withArgs(
        "0x0000000000000000000000000000000000000000",
        contentCreator.address,
        0
      );
    /// Start validation and finalize it
    await runValidation(
      contractValidationManager,
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

    // Buy coaching
    const purchaseTx = await contractPlatformTreasury
      .connect(contentBuyer)
      .buyCoaching(0);
    const queueTxReceipt = await purchaseTx.wait();
    const queueTxEvent = queueTxReceipt.events.find(
      (e) => e.event == "CoachingBought"
    );
    const coachingId = queueTxEvent.args[2];
    // Get coaching struct
    const coachingStruct = await contractPlatformTreasury.coachingStructs(
      coachingId
    );
    // Check if returned learner address is the same as the buyer address
    expect(coachingStruct.learner).to.equal(contentBuyer.address);

    await network.provider.send("evm_increaseTime", [999999999]);
    await network.provider.send("evm_mine");
    await contractPlatformTreasury.connect(contentCreator).finalizeCoaching(0);
    expect(
      await contractPlatformTreasury.instructorBalance(contentCreator.address)
    ).to.be.eql(ethers.utils.parseEther("1.906"));
  });

  it("Should fail coaching as instructor if deadline is not met", async function () {
    const {
      backend,
      contentCreator,
      contentBuyer,
      validatorCandidate,
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
      contractUDAO,
      contractRoleManager,
      contractUDAOCertificate,
      contractUDAOContent,
      contractValidationManager,
      contractPlatformTreasury,
      contractUDAOVp,
      contractUDAOStaker,
      contractUDAOTimelockController,
      contractUDAOGovernor,
    } = await deploy(false, true);

    /// Set KYC
    await contractRoleManager.setKYC(contentCreator.address, true);
    await contractRoleManager.setKYC(contentBuyer.address, true);

    await expect(
      contractUDAOContent
        .connect(contentCreator)
        .redeem(
          [ethers.utils.parseEther("1")],
          "udao",
          "ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi",
          contentCreator.address,
          ethers.utils.parseEther("2"),
          "udao",
          true,
          true
        )
    )
      .to.emit(contractUDAOContent, "Transfer") // transfer from null address to minter
      .withArgs(
        "0x0000000000000000000000000000000000000000",
        contentCreator.address,
        0
      );
    /// Start validation and finalize it
    await runValidation(
      contractValidationManager,
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

    // Buy coaching
    const purchaseTx = await contractPlatformTreasury
      .connect(contentBuyer)
      .buyCoaching(0);
    const queueTxReceipt = await purchaseTx.wait();
    const queueTxEvent = queueTxReceipt.events.find(
      (e) => e.event == "CoachingBought"
    );
    const coachingId = queueTxEvent.args[2];
    // Get coaching struct
    const coachingStruct = await contractPlatformTreasury.coachingStructs(
      coachingId
    );
    // Check if returned learner address is the same as the buyer address
    expect(coachingStruct.learner).to.equal(contentBuyer.address);

    await expect(
      contractPlatformTreasury.connect(contentCreator).finalizeCoaching(0)
    ).to.revertedWith("Deadline is not met yet");
  });

  it("Should fail to finalize coaching if neither learner or instructor", async function () {
    const {
      backend,
      contentCreator,
      contentBuyer,
      validatorCandidate,
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
      contractUDAO,
      contractRoleManager,
      contractUDAOCertificate,
      contractUDAOContent,
      contractValidationManager,
      contractPlatformTreasury,
      contractUDAOVp,
      contractUDAOStaker,
      contractUDAOTimelockController,
      contractUDAOGovernor,
    } = await deploy(false, true);

    /// Set KYC
    await contractRoleManager.setKYC(contentCreator.address, true);
    await contractRoleManager.setKYC(contentBuyer.address, true);

    await expect(
      contractUDAOContent
        .connect(contentCreator)
        .redeem(
          [ethers.utils.parseEther("1")],
          "udao",
          "ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi",
          contentCreator.address,
          ethers.utils.parseEther("2"),
          "udao",
          true,
          true
        )
    )
      .to.emit(contractUDAOContent, "Transfer") // transfer from null address to minter
      .withArgs(
        "0x0000000000000000000000000000000000000000",
        contentCreator.address,
        0
      );
    /// Start validation and finalize it
    await runValidation(
      contractValidationManager,
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
    const lazyCoaching = new LazyCoaching({
      contract: contractPlatformTreasury,
      signer: backend,
    });

    // Buy coaching
    const purchaseTx = await contractPlatformTreasury
      .connect(contentBuyer)
      .buyCoaching(0);
    const queueTxReceipt = await purchaseTx.wait();
    const queueTxEvent = queueTxReceipt.events.find(
      (e) => e.event == "CoachingBought"
    );
    const coachingId = queueTxEvent.args[2];
    // Get coaching struct
    const coachingStruct = await contractPlatformTreasury.coachingStructs(
      coachingId
    );
    // Check if returned learner address is the same as the buyer address
    expect(coachingStruct.learner).to.equal(contentBuyer.address);

    await expect(
      contractPlatformTreasury.connect(foundation).finalizeCoaching(0)
    ).to.be.revertedWith("You are not learner neither coach");
  });

  it("Should fail to finalize coaching if coaching does not exist", async function () {
    const {
      backend,
      contentCreator,
      contentBuyer,
      validatorCandidate,
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
      contractUDAO,
      contractRoleManager,
      contractUDAOCertificate,
      contractUDAOContent,
      contractValidationManager,
      contractPlatformTreasury,
      contractUDAOVp,
      contractUDAOStaker,
      contractUDAOTimelockController,
      contractUDAOGovernor,
    } = await deploy(false, true);

    /// Set KYC
    await contractRoleManager.setKYC(contentCreator.address, true);
    await contractRoleManager.setKYC(contentBuyer.address, true);

    await expect(
      contractUDAOContent
        .connect(contentCreator)
        .redeem(
          [ethers.utils.parseEther("1")],
          "udao",
          "ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi",
          contentCreator.address,
          ethers.utils.parseEther("2"),
          "udao",
          true,
          true
        )
    )
      .to.emit(contractUDAOContent, "Transfer") // transfer from null address to minter
      .withArgs(
        "0x0000000000000000000000000000000000000000",
        contentCreator.address,
        0
      );
    /// Start validation and finalize it
    await runValidation(
      contractValidationManager,
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
    const lazyCoaching = new LazyCoaching({
      contract: contractPlatformTreasury,
      signer: backend,
    });

    // Buy coaching
    const purchaseTx = await contractPlatformTreasury
      .connect(contentBuyer)
      .buyCoaching(0);
    const queueTxReceipt = await purchaseTx.wait();
    const queueTxEvent = queueTxReceipt.events.find(
      (e) => e.event == "CoachingBought"
    );
    const coachingId = queueTxEvent.args[2];
    // Get coaching struct
    const coachingStruct = await contractPlatformTreasury.coachingStructs(
      coachingId
    );
    // Check if returned learner address is the same as the buyer address
    expect(coachingStruct.learner).to.equal(contentBuyer.address);

    await expect(
      contractPlatformTreasury.connect(contentBuyer).finalizeCoaching(1)
    ).to.be.revertedWith("Coaching id doesn't exist");
  });

  it("Should delay coaching deadline if learner", async function () {
    const {
      backend,
      contentCreator,
      contentBuyer,
      validatorCandidate,
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
      contractUDAO,
      contractRoleManager,
      contractUDAOCertificate,
      contractUDAOContent,
      contractValidationManager,
      contractPlatformTreasury,
      contractUDAOVp,
      contractUDAOStaker,
      contractUDAOTimelockController,
      contractUDAOGovernor,
    } = await deploy(false, true);

    /// Set KYC
    await contractRoleManager.setKYC(contentCreator.address, true);
    await contractRoleManager.setKYC(contentBuyer.address, true);

    await expect(
      contractUDAOContent
        .connect(contentCreator)
        .redeem(
          [ethers.utils.parseEther("1")],
          "udao",
          "ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi",
          contentCreator.address,
          ethers.utils.parseEther("2"),
          "udao",
          true,
          true
        )
    )
      .to.emit(contractUDAOContent, "Transfer") // transfer from null address to minter
      .withArgs(
        "0x0000000000000000000000000000000000000000",
        contentCreator.address,
        0
      );
    /// Start validation and finalize it
    await runValidation(
      contractValidationManager,
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

    const tx = await contractPlatformTreasury
      .connect(contentBuyer)
      .buyCoaching(0);
    const result = await tx.wait();
    const timestamp = (
      await ethers.provider.getBlock(result.logs[0].blockNumber)
    ).timestamp;
    const resultTxEvent = result.events.find(
      (e) => e.event == "CoachingBought"
    );
    const coachingId = resultTxEvent.args[2];
    // Get coaching struct
    const coachingStruct = await contractPlatformTreasury.coachingStructs(
      coachingId
    );
    // Check if returned learner address is the same as the buyer address
    expect(coachingStruct.learner).to.equal(contentBuyer.address);

    await network.provider.send("evm_increaseTime", [60 * 60 * 24 * 29]);
    await network.provider.send("evm_mine"); //
    await expect(
      contractPlatformTreasury.connect(contentBuyer).delayDeadline(0)
    )
      .to.emit(contractPlatformTreasury, "DeadlineDelayed")
      .withArgs(0, parseInt(timestamp) + 37 * 24 * 60 * 60);
  });

  it("Should delay coaching deadline if coach", async function () {
    const {
      backend,
      contentCreator,
      contentBuyer,
      validatorCandidate,
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
      contractUDAO,
      contractRoleManager,
      contractUDAOCertificate,
      contractUDAOContent,
      contractValidationManager,
      contractPlatformTreasury,
      contractUDAOVp,
      contractUDAOStaker,
      contractUDAOTimelockController,
      contractUDAOGovernor,
    } = await deploy(false, true);

    /// Set KYC
    await contractRoleManager.setKYC(contentCreator.address, true);
    await contractRoleManager.setKYC(contentBuyer.address, true);

    await expect(
      contractUDAOContent
        .connect(contentCreator)
        .redeem(
          [ethers.utils.parseEther("1")],
          "udao",
          "ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi",
          contentCreator.address,
          ethers.utils.parseEther("2"),
          "udao",
          true,
          true
        )
    )
      .to.emit(contractUDAOContent, "Transfer") // transfer from null address to minter
      .withArgs(
        "0x0000000000000000000000000000000000000000",
        contentCreator.address,
        0
      );
    /// Start validation and finalize it
    await runValidation(
      contractValidationManager,
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

    const tx = await contractPlatformTreasury
      .connect(contentBuyer)
      .buyCoaching(0);
    const result = await tx.wait();
    const timestamp = (
      await ethers.provider.getBlock(result.logs[0].blockNumber)
    ).timestamp;
    const resultTxEvent = result.events.find(
      (e) => e.event == "CoachingBought"
    );
    const coachingId = resultTxEvent.args[2];
    // Get coaching struct
    const coachingStruct = await contractPlatformTreasury.coachingStructs(
      coachingId
    );
    // Check if returned learner address is the same as the buyer address
    expect(coachingStruct.learner).to.equal(contentBuyer.address);
    await network.provider.send("evm_increaseTime", [60 * 60 * 24 * 29]);
    await network.provider.send("evm_mine"); //
    await expect(
      contractPlatformTreasury.connect(contentCreator).delayDeadline(0)
    )
      .to.emit(contractPlatformTreasury, "DeadlineDelayed")
      .withArgs(0, parseInt(timestamp) + 37 * 24 * 60 * 60);
  });

  it("Should fail to delay coaching deadline if not last 3 days", async function () {
    const {
      backend,
      contentCreator,
      contentBuyer,
      validatorCandidate,
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
      contractUDAO,
      contractRoleManager,
      contractUDAOCertificate,
      contractUDAOContent,
      contractValidationManager,
      contractPlatformTreasury,
      contractUDAOVp,
      contractUDAOStaker,
      contractUDAOTimelockController,
      contractUDAOGovernor,
    } = await deploy(false, true);

    /// Set KYC
    await contractRoleManager.setKYC(contentCreator.address, true);
    await contractRoleManager.setKYC(contentBuyer.address, true);

    await expect(
      contractUDAOContent
        .connect(contentCreator)
        .redeem(
          [ethers.utils.parseEther("1")],
          "udao",
          "ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi",
          contentCreator.address,
          ethers.utils.parseEther("2"),
          "udao",
          true,
          true
        )
    )
      .to.emit(contractUDAOContent, "Transfer") // transfer from null address to minter
      .withArgs(
        "0x0000000000000000000000000000000000000000",
        contentCreator.address,
        0
      );
    /// Start validation and finalize it
    await runValidation(
      contractValidationManager,
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

    const tx = await contractPlatformTreasury
      .connect(contentBuyer)
      .buyCoaching(0);
    const result = await tx.wait();
    const timestamp = (
      await ethers.provider.getBlock(result.logs[0].blockNumber)
    ).timestamp;
    const resultTxEvent = result.events.find(
      (e) => e.event == "CoachingBought"
    );
    const coachingId = resultTxEvent.args[2];
    // Get coaching struct
    const coachingStruct = await contractPlatformTreasury.coachingStructs(
      coachingId
    );
    // Check if returned learner address is the same as the buyer address
    expect(coachingStruct.learner).to.equal(contentBuyer.address);
    await expect(
      contractPlatformTreasury.connect(contentCreator).delayDeadline(0)
    ).to.revertedWith("Only can be delayed in last 3 days");
  });

  it("Should fail to delay coaching deadline if sender is neither coach nor learner", async function () {
    const {
      backend,
      contentCreator,
      contentBuyer,
      validatorCandidate,
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
      contractUDAO,
      contractRoleManager,
      contractUDAOCertificate,
      contractUDAOContent,
      contractValidationManager,
      contractPlatformTreasury,
      contractUDAOVp,
      contractUDAOStaker,
      contractUDAOTimelockController,
      contractUDAOGovernor,
    } = await deploy(false, true);

    /// Set KYC
    await contractRoleManager.setKYC(contentCreator.address, true);
    await contractRoleManager.setKYC(contentBuyer.address, true);

    await expect(
      contractUDAOContent
        .connect(contentCreator)
        .redeem(
          [ethers.utils.parseEther("1")],
          "udao",
          "ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi",
          contentCreator.address,
          ethers.utils.parseEther("2"),
          "udao",
          true,
          true
        )
    )
      .to.emit(contractUDAOContent, "Transfer") // transfer from null address to minter
      .withArgs(
        "0x0000000000000000000000000000000000000000",
        contentCreator.address,
        0
      );
    /// Start validation and finalize it
    await runValidation(
      contractValidationManager,
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

    const tx = await contractPlatformTreasury
      .connect(contentBuyer)
      .buyCoaching(0);
    const result = await tx.wait();
    const timestamp = (
      await ethers.provider.getBlock(result.logs[0].blockNumber)
    ).timestamp;
    const resultTxEvent = result.events.find(
      (e) => e.event == "CoachingBought"
    );
    const coachingId = resultTxEvent.args[2];
    // Get coaching struct
    const coachingStruct = await contractPlatformTreasury.coachingStructs(
      coachingId
    );
    // Check if returned learner address is the same as the buyer address
    expect(coachingStruct.learner).to.equal(contentBuyer.address);
    await expect(
      contractPlatformTreasury.connect(jurorMember).delayDeadline(0)
    ).to.revertedWith("You are neither coach nor learner");
  });

  it("Should force payment for coaching", async function () {
    const {
      backend,
      contentCreator,
      contentBuyer,
      validatorCandidate,
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
      contractUDAO,
      contractRoleManager,
      contractUDAOCertificate,
      contractUDAOContent,
      contractValidationManager,
      contractPlatformTreasury,
      contractUDAOVp,
      contractUDAOStaker,
      contractUDAOTimelockController,
      contractUDAOGovernor,
    } = await deploy(false, true);

    /// Set KYC
    await contractRoleManager.setKYC(contentCreator.address, true);
    await contractRoleManager.setKYC(contentBuyer.address, true);

    await expect(
      contractUDAOContent
        .connect(contentCreator)
        .redeem(
          [ethers.utils.parseEther("1")],
          "udao",
          "ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi",
          contentCreator.address,
          ethers.utils.parseEther("2"),
          "udao",
          true,
          true
        )
    )
      .to.emit(contractUDAOContent, "Transfer") // transfer from null address to minter
      .withArgs(
        "0x0000000000000000000000000000000000000000",
        contentCreator.address,
        0
      );
    /// Start validation and finalize it
    await runValidation(
      contractValidationManager,
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

    const tx = await contractPlatformTreasury
      .connect(contentBuyer)
      .buyCoaching(0);
    const result = await tx.wait();
    const timestamp = (
      await ethers.provider.getBlock(result.logs[0].blockNumber)
    ).timestamp;
    const resultTxEvent = result.events.find(
      (e) => e.event == "CoachingBought"
    );
    const coachingId = resultTxEvent.args[2];
    // Get coaching struct
    const coachingStruct = await contractPlatformTreasury.coachingStructs(
      coachingId
    );
    // Check if returned learner address is the same as the buyer address
    expect(coachingStruct.learner).to.equal(contentBuyer.address);
    await expect(contractPlatformTreasury.connect(foundation).forcedPayment(0))
      .to.emit(contractPlatformTreasury, "ForcedPayment")
      .withArgs(0, contentCreator.address);
  });

  it("Should fail force payment for coaching if not admin role", async function () {
    const {
      backend,
      contentCreator,
      contentBuyer,
      validatorCandidate,
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
      contractUDAO,
      contractRoleManager,
      contractUDAOCertificate,
      contractUDAOContent,
      contractValidationManager,
      contractPlatformTreasury,
      contractUDAOVp,
      contractUDAOStaker,
      contractUDAOTimelockController,
      contractUDAOGovernor,
    } = await deploy(false, true);

    /// Set KYC
    await contractRoleManager.setKYC(contentCreator.address, true);
    await contractRoleManager.setKYC(contentBuyer.address, true);

    await expect(
      contractUDAOContent
        .connect(contentCreator)
        .redeem(
          [ethers.utils.parseEther("1")],
          "udao",
          "ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi",
          contentCreator.address,
          ethers.utils.parseEther("2"),
          "udao",
          true,
          true
        )
    )
      .to.emit(contractUDAOContent, "Transfer") // transfer from null address to minter
      .withArgs(
        "0x0000000000000000000000000000000000000000",
        contentCreator.address,
        0
      );
    /// Start validation and finalize it
    await runValidation(
      contractValidationManager,
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

    const tx = await contractPlatformTreasury
      .connect(contentBuyer)
      .buyCoaching(0);
    const result = await tx.wait();
    const timestamp = (
      await ethers.provider.getBlock(result.logs[0].blockNumber)
    ).timestamp;
    const resultTxEvent = result.events.find(
      (e) => e.event == "CoachingBought"
    );
    const coachingId = resultTxEvent.args[2];
    // Get coaching struct
    const coachingStruct = await contractPlatformTreasury.coachingStructs(
      coachingId
    );
    // Check if returned learner address is the same as the buyer address
    expect(coachingStruct.learner).to.equal(contentBuyer.address);
    await expect(
      contractPlatformTreasury.connect(validator1).forcedPayment(0)
    ).to.revertedWith(
      "AccessControl: account " +
        validator1.address.toLowerCase() +
        " is missing role"
    );
  });

  it("Should refund payment for coaching", async function () {
    const {
      backend,
      contentCreator,
      contentBuyer,
      validatorCandidate,
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
      contractUDAO,
      contractRoleManager,
      contractUDAOCertificate,
      contractUDAOContent,
      contractValidationManager,
      contractPlatformTreasury,
      contractUDAOVp,
      contractUDAOStaker,
      contractUDAOTimelockController,
      contractUDAOGovernor,
    } = await deploy(false, true);

    /// Set KYC
    await contractRoleManager.setKYC(contentCreator.address, true);
    await contractRoleManager.setKYC(contentBuyer.address, true);

    await expect(
      contractUDAOContent
        .connect(contentCreator)
        .redeem(
          [ethers.utils.parseEther("1")],
          "udao",
          "ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi",
          contentCreator.address,
          ethers.utils.parseEther("2"),
          "udao",
          true,
          true
        )
    )
      .to.emit(contractUDAOContent, "Transfer") // transfer from null address to minter
      .withArgs(
        "0x0000000000000000000000000000000000000000",
        contentCreator.address,
        0
      );
    /// Start validation and finalize it
    await runValidation(
      contractValidationManager,
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

    const tx = await contractPlatformTreasury
      .connect(contentBuyer)
      .buyCoaching(0);
    const result = await tx.wait();
    const timestamp = (
      await ethers.provider.getBlock(result.logs[0].blockNumber)
    ).timestamp;
    const resultTxEvent = result.events.find(
      (e) => e.event == "CoachingBought"
    );
    const coachingId = resultTxEvent.args[2];
    // Get coaching struct
    const coachingStruct = await contractPlatformTreasury.coachingStructs(
      coachingId
    );
    // Check if returned learner address is the same as the buyer address
    expect(coachingStruct.learner).to.equal(contentBuyer.address);
    await expect(contractPlatformTreasury.connect(contentCreator).refund(0))
      .to.emit(contractPlatformTreasury, "Refund")
      .withArgs(0, contentBuyer.address, ethers.utils.parseEther("2"));
  });

  it("Should fail to refund payment for coaching if not coach", async function () {
    const {
      backend,
      contentCreator,
      contentBuyer,
      validatorCandidate,
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
      contractUDAO,
      contractRoleManager,
      contractUDAOCertificate,
      contractUDAOContent,
      contractValidationManager,
      contractPlatformTreasury,
      contractUDAOVp,
      contractUDAOStaker,
      contractUDAOTimelockController,
      contractUDAOGovernor,
    } = await deploy(false, true);

    /// Set KYC
    await contractRoleManager.setKYC(contentCreator.address, true);
    await contractRoleManager.setKYC(contentBuyer.address, true);

    await expect(
      contractUDAOContent
        .connect(contentCreator)
        .redeem(
          [ethers.utils.parseEther("1")],
          "udao",
          "ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi",
          contentCreator.address,
          ethers.utils.parseEther("2"),
          "udao",
          true,
          true
        )
    )
      .to.emit(contractUDAOContent, "Transfer") // transfer from null address to minter
      .withArgs(
        "0x0000000000000000000000000000000000000000",
        contentCreator.address,
        0
      );
    /// Start validation and finalize it
    await runValidation(
      contractValidationManager,
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

    const tx = await contractPlatformTreasury
      .connect(contentBuyer)
      .buyCoaching(0);
    const result = await tx.wait();
    const timestamp = (
      await ethers.provider.getBlock(result.logs[0].blockNumber)
    ).timestamp;
    const resultTxEvent = result.events.find(
      (e) => e.event == "CoachingBought"
    );
    const coachingId = resultTxEvent.args[2];
    // Get coaching struct
    const coachingStruct = await contractPlatformTreasury.coachingStructs(
      coachingId
    );
    // Check if returned learner address is the same as the buyer address
    expect(coachingStruct.learner).to.equal(contentBuyer.address);
    await expect(
      contractPlatformTreasury.connect(contentBuyer).refund(0)
    ).to.revertedWith("Your are not the coach");
  });

  it("Should refund payment for coaching as admin", async function () {
    const {
      backend,
      contentCreator,
      contentBuyer,
      validatorCandidate,
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
      contractUDAO,
      contractRoleManager,
      contractUDAOCertificate,
      contractUDAOContent,
      contractValidationManager,
      contractPlatformTreasury,
      contractUDAOVp,
      contractUDAOStaker,
      contractUDAOTimelockController,
      contractUDAOGovernor,
    } = await deploy(false, true);

    /// Set KYC
    await contractRoleManager.setKYC(contentCreator.address, true);
    await contractRoleManager.setKYC(contentBuyer.address, true);

    await expect(
      contractUDAOContent
        .connect(contentCreator)
        .redeem(
          [ethers.utils.parseEther("1")],
          "udao",
          "ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi",
          contentCreator.address,
          ethers.utils.parseEther("2"),
          "udao",
          true,
          true
        )
    )
      .to.emit(contractUDAOContent, "Transfer") // transfer from null address to minter
      .withArgs(
        "0x0000000000000000000000000000000000000000",
        contentCreator.address,
        0
      );
    /// Start validation and finalize it
    await runValidation(
      contractValidationManager,
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

    const tx = await contractPlatformTreasury
      .connect(contentBuyer)
      .buyCoaching(0);
    const result = await tx.wait();
    const timestamp = (
      await ethers.provider.getBlock(result.logs[0].blockNumber)
    ).timestamp;
    const resultTxEvent = result.events.find(
      (e) => e.event == "CoachingBought"
    );
    const coachingId = resultTxEvent.args[2];
    // Get coaching struct
    const coachingStruct = await contractPlatformTreasury.coachingStructs(
      coachingId
    );
    // Check if returned learner address is the same as the buyer address
    expect(coachingStruct.learner).to.equal(contentBuyer.address);
    await expect(
      contractPlatformTreasury.connect(foundation).forcedRefundAdmin(0)
    )
      .to.emit(contractPlatformTreasury, "Refund")
      .withArgs(0, contentBuyer.address, ethers.utils.parseEther("2"));
  });

  it("Should fail refund payment for coaching as admin if not admin", async function () {
    const {
      backend,
      contentCreator,
      contentBuyer,
      validatorCandidate,
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
      contractUDAO,
      contractRoleManager,
      contractUDAOCertificate,
      contractUDAOContent,
      contractValidationManager,
      contractPlatformTreasury,
      contractUDAOVp,
      contractUDAOStaker,
      contractUDAOTimelockController,
      contractUDAOGovernor,
    } = await deploy(false, true);

    /// Set KYC
    await contractRoleManager.setKYC(contentCreator.address, true);
    await contractRoleManager.setKYC(contentBuyer.address, true);

    await expect(
      contractUDAOContent
        .connect(contentCreator)
        .redeem(
          [ethers.utils.parseEther("1")],
          "udao",
          "ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi",
          contentCreator.address,
          ethers.utils.parseEther("2"),
          "udao",
          true,
          true
        )
    )
      .to.emit(contractUDAOContent, "Transfer") // transfer from null address to minter
      .withArgs(
        "0x0000000000000000000000000000000000000000",
        contentCreator.address,
        0
      );
    /// Start validation and finalize it
    await runValidation(
      contractValidationManager,
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

    const tx = await contractPlatformTreasury
      .connect(contentBuyer)
      .buyCoaching(0);
    const result = await tx.wait();
    const timestamp = (
      await ethers.provider.getBlock(result.logs[0].blockNumber)
    ).timestamp;
    const resultTxEvent = result.events.find(
      (e) => e.event == "CoachingBought"
    );
    const coachingId = resultTxEvent.args[2];
    // Get coaching struct
    const coachingStruct = await contractPlatformTreasury.coachingStructs(
      coachingId
    );
    // Check if returned learner address is the same as the buyer address
    expect(coachingStruct.learner).to.equal(contentBuyer.address);
    await expect(
      contractPlatformTreasury.connect(validator1).forcedRefundAdmin(0)
    ).to.revertedWith(
      "AccessControl: account " +
        validator1.address.toLowerCase() +
        " is missing role"
    );
  });

  it("Should fail refund payment for coaching as admin if not refundable", async function () {
    const {
      backend,
      contentCreator,
      contentBuyer,
      validatorCandidate,
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
      contractUDAO,
      contractRoleManager,
      contractUDAOCertificate,
      contractUDAOContent,
      contractValidationManager,
      contractPlatformTreasury,
      contractUDAOVp,
      contractUDAOStaker,
      contractUDAOTimelockController,
      contractUDAOGovernor,
    } = await deploy(false, true);

    /// Set KYC
    await contractRoleManager.setKYC(contentCreator.address, true);
    await contractRoleManager.setKYC(contentBuyer.address, true);

    await expect(
      contractUDAOContent
        .connect(contentCreator)
        .redeem(
          [ethers.utils.parseEther("1")],
          "udao",
          "ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi",
          contentCreator.address,
          ethers.utils.parseEther("2"),
          "udao",
          true,
          false
        )
    )
      .to.emit(contractUDAOContent, "Transfer") // transfer from null address to minter
      .withArgs(
        "0x0000000000000000000000000000000000000000",
        contentCreator.address,
        0
      );
    /// Start validation and finalize it
    await runValidation(
      contractValidationManager,
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

    const tx = await contractPlatformTreasury
      .connect(contentBuyer)
      .buyCoaching(0);
    const result = await tx.wait();
    const timestamp = (
      await ethers.provider.getBlock(result.logs[0].blockNumber)
    ).timestamp;
    const resultTxEvent = result.events.find(
      (e) => e.event == "CoachingBought"
    );
    const coachingId = resultTxEvent.args[2];
    // Get coaching struct
    const coachingStruct = await contractPlatformTreasury.coachingStructs(
      coachingId
    );
    // Check if returned learner address is the same as the buyer address
    expect(coachingStruct.learner).to.equal(contentBuyer.address);
    await expect(
      contractPlatformTreasury.connect(foundation).forcedRefundAdmin(0)
    ).to.revertedWith("Coaching is not refundable");
  });
});
