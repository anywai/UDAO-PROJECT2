const { expect } = require("chai");
const hardhat = require("hardhat");
const { ethers } = hardhat;
const chai = require("chai");
const BN = require("bn.js");
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

describe("Validation Manageer Contract", function () {
  it("Should create content validation", async function () {
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
    await contractRoleManager.setKYC(contentCreator.address, true);

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
    await expect(
      contractValidationManager.connect(contentCreator).createValidation(0, 50)
    )
      .to.emit(contractValidationManager, "ValidationCreated")
      .withArgs(ethers.BigNumber.from(0), ethers.BigNumber.from(1));
  });

  it("Should assign content validation", async function () {
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
    await contractRoleManager.setKYC(contentCreator.address, true);

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
  });

  it("Should send validation result of validator", async function () {
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
    await contractRoleManager.setKYC(contentCreator.address, true);

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
  });

  it("Should validate content", async function () {
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
    await contractRoleManager.setKYC(contentCreator.address, true);

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
  });

  it("Should return validator's score", async function () {
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
    await contractRoleManager.setKYC(contentCreator.address, true);

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
    expect(
      await contractValidationManager.getValidatorScore(validator1.address, 0)
    ).to.eql(ethers.BigNumber.from(50));
  });

  it("Should return total validation score", async function () {
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
    await contractRoleManager.setKYC(contentCreator.address, true);

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
    expect(await contractValidationManager.getTotalValidationScore()).to.eql(
      ethers.BigNumber.from(200)
    );
  });

  it("Should not create validation if content does not exist", async function () {
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
    await contractRoleManager.setKYC(contentCreator.address, true);
    await expect(
      contractValidationManager.connect(contentCreator).createValidation(0, 50)
    ).to.revertedWith("ERC721: invalid token ID");
  });

  it("Should fail to create content validation when Token owner isn't KYCed", async function () {
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

    /// Set KYC to true
    await contractRoleManager.setKYC(contentCreator.address, true);

    /// Create content
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

    /// Set KYC to false
    await contractRoleManager.setKYC(contentCreator.address, false);

    /// Create validation
    await expect(
      contractValidationManager.connect(contentCreator).createValidation(0, 50)
    ).to.revertedWith("Token owner is not KYCed");
  });

  it("Should fail to create content validation when Token owner is banned", async function () {
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

    /// Set KYC to true
    await contractRoleManager.setKYC(contentCreator.address, true);

    /// Create content
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

    /// Ban the user
    await contractRoleManager.setBan(contentCreator.address, true);

    /// Create validation
    await expect(
      contractValidationManager.connect(contentCreator).createValidation(0, 50)
    ).to.revertedWith("Token owner is banned");
  });
});
