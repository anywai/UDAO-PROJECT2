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

/// DEPLOYMENTS------------------------------------------------------------------
// PEOPLE
var backend;
var contentCreator;
var contentBuyer, contentBuyer1, contentBuyer2, contentBuyer3;
var validator1, validator2, validator3, validator4, validator5;
var jurorMember1, jurorMember2, jurorMember3, jurorMember4;
var account1, account2, account3;

var validatorCandidate, validator;
var jurorCandidate, jurorMember;
var governanceCandidate, governanceMember;
var foundation, corporation;
var superValidatorCandidate, superValidator;
// CONTRACTS & ROLES
var contractUDAO, contractUDAOVp, contractUDAOCertificate, contractUDAOContent;

var contractJurorManager, contractValidationManager, contractSupervision;
var contractUDAOStaker, contractUDAOTimelockController, contractUDAOGovernor;

var contractRoleManager, contractContractManagervar;
var contractPlatformTreasury;
var contractPriceGetter;
var GOVERNANCE_ROLE, BACKEND_ROLE;

/// HELPERS---------------------------------------------------------------------
async function reDeploy() {
  const replace = await deploy();
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
  contractValidationManager = replace.contractValidationManager;
  contractSupervision = replace.contractSupervision;
  contractPlatformTreasury = replace.contractPlatformTreasury;
  contractUDAOVp = replace.contractUDAOVp;
  contractUDAOStaker = replace.contractUDAOStaker;
  contractUDAOTimelockController = replace.contractUDAOTimelockController;
  contractUDAOGovernor = replace.contractUDAOGovernor;
  contractJurorManager = replace.contractJurorManager;
  GOVERNANCE_ROLE = replace.GOVERNANCE_ROLE;
  BACKEND_ROLE = replace.BACKEND_ROLE;
  contractContractManager = replace.contractContractManager;
  account1 = replace.account1;
  account2 = replace.account2;
  account3 = replace.account3;
  contractPriceGetter = replace.contractPriceGetter;
}

/// TESTS-----------------------------------------------------------------------
describe("Supervision Contract", function () {
  it("Should create content validation", async function () {
    await reDeploy();
    /// set kyc for content creator
    await contractRoleManager.setKYC(contentCreator.address, true);
    /// create content
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
    /// create validation
    await expect(
      contractSupervision.connect(contentCreator).createValidation(0, 50)
    )
      .to.emit(contractSupervision, "ValidationCreated")
      .withArgs(ethers.BigNumber.from(0), ethers.BigNumber.from(1));
  });

  it("Should assign content validation", async function () {
    await reDeploy();
    /// set kyc for content creator
    await contractRoleManager.setKYC(contentCreator.address, true);
    /// create content
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
    /// create validation
    await expect(
      contractSupervision.connect(contentCreator).createValidation(0, 50)
    )
      .to.emit(contractSupervision, "ValidationCreated")
      .withArgs(ethers.BigNumber.from(0), ethers.BigNumber.from(1));
    /// assign validation with validator1
    await expect(contractSupervision.connect(validator1).assignValidation(1))
      .to.emit(contractSupervision, "ValidationAssigned")
      .withArgs(
        ethers.BigNumber.from(0),
        ethers.BigNumber.from(1),
        validator1.address
      );
  });

  it("Should send validation result of validator", async function () {
    await reDeploy();
    /// set kyc for content creator
    await contractRoleManager.setKYC(contentCreator.address, true);
    /// create content
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
    /// create validation
    await expect(
      contractSupervision.connect(contentCreator).createValidation(0, 50)
    )
      .to.emit(contractSupervision, "ValidationCreated")
      .withArgs(ethers.BigNumber.from(0), ethers.BigNumber.from(1));
    /// assign validation with validator1
    await expect(contractSupervision.connect(validator1).assignValidation(1))
      .to.emit(contractSupervision, "ValidationAssigned")
      .withArgs(
        ethers.BigNumber.from(0),
        ethers.BigNumber.from(1),
        validator1.address
      );
    /// assign validation with validator2
    await expect(contractSupervision.connect(validator2).assignValidation(1))
      .to.emit(contractSupervision, "ValidationAssigned")
      .withArgs(
        ethers.BigNumber.from(0),
        ethers.BigNumber.from(1),
        validator2.address
      );
    /// assign validation with validator3
    await expect(contractSupervision.connect(validator3).assignValidation(1))
      .to.emit(contractSupervision, "ValidationAssigned")
      .withArgs(
        ethers.BigNumber.from(0),
        ethers.BigNumber.from(1),
        validator3.address
      );
    /// assign validation with validator4
    await expect(contractSupervision.connect(validator4).assignValidation(1))
      .to.emit(contractSupervision, "ValidationAssigned")
      .withArgs(
        ethers.BigNumber.from(0),
        ethers.BigNumber.from(1),
        validator4.address
      );
    /// assign validation with validator5
    await expect(contractSupervision.connect(validator5).assignValidation(1))
      .to.emit(contractSupervision, "ValidationAssigned")
      .withArgs(
        ethers.BigNumber.from(0),
        ethers.BigNumber.from(1),
        validator5.address
      );
    /// send validation result with validator1
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
    /// send validation result with validator2
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
    /// send validation result with validator3
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
    /// send validation result with validator4
    await expect(
      contractSupervision.connect(validator4).sendValidation(1, true)
    )
      .to.emit(contractSupervision, "ValidationResultSent")
      .withArgs(
        ethers.BigNumber.from(0),
        ethers.BigNumber.from(1),
        validator4.address,
        true
      );
    /// send validation result with validator5
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
  });

  it("Should validate content", async function () {
    await reDeploy();
    /// set KYC for content creator
    await contractRoleManager.setKYC(contentCreator.address, true);
    /// create content
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
    /// create validation
    await expect(
      contractSupervision.connect(contentCreator).createValidation(0, 50)
    )
      .to.emit(contractSupervision, "ValidationCreated")
      .withArgs(ethers.BigNumber.from(0), ethers.BigNumber.from(1));
    /// assign validation with validator1
    await expect(contractSupervision.connect(validator1).assignValidation(1))
      .to.emit(contractSupervision, "ValidationAssigned")
      .withArgs(
        ethers.BigNumber.from(0),
        ethers.BigNumber.from(1),
        validator1.address
      );
    /// assign validation with validator2
    await expect(contractSupervision.connect(validator2).assignValidation(1))
      .to.emit(contractSupervision, "ValidationAssigned")
      .withArgs(
        ethers.BigNumber.from(0),
        ethers.BigNumber.from(1),
        validator2.address
      );
    /// assign validation with validator3
    await expect(contractSupervision.connect(validator3).assignValidation(1))
      .to.emit(contractSupervision, "ValidationAssigned")
      .withArgs(
        ethers.BigNumber.from(0),
        ethers.BigNumber.from(1),
        validator3.address
      );
    /// assign validation with validator4
    await expect(contractSupervision.connect(validator4).assignValidation(1))
      .to.emit(contractSupervision, "ValidationAssigned")
      .withArgs(
        ethers.BigNumber.from(0),
        ethers.BigNumber.from(1),
        validator4.address
      );
    /// assign validation with validator5
    await expect(contractSupervision.connect(validator5).assignValidation(1))
      .to.emit(contractSupervision, "ValidationAssigned")
      .withArgs(
        ethers.BigNumber.from(0),
        ethers.BigNumber.from(1),
        validator5.address
      );
    /// send validation result with validator1
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
    /// send validation result with validator2
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
    /// send validation result with validator3
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
    /// send validation result with validator4
    await expect(
      contractSupervision.connect(validator4).sendValidation(1, true)
    )
      .to.emit(contractSupervision, "ValidationResultSent")
      .withArgs(
        ethers.BigNumber.from(0),
        ethers.BigNumber.from(1),
        validator4.address,
        true
      );
    /// send validation result with validator5
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
    /// finalize validation
    await expect(
      contractSupervision.connect(contentCreator).finalizeValidation(1)
    )
      .to.emit(contractSupervision, "ValidationEnded")
      .withArgs(ethers.BigNumber.from(0), ethers.BigNumber.from(1), true);
  });

  it("Should return validator's score", async function () {
    await reDeploy();
    /// set KYC for content creator
    await contractRoleManager.setKYC(contentCreator.address, true);
    /// create content
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
    /// create validation
    await expect(
      contractSupervision.connect(contentCreator).createValidation(0, 50)
    )
      .to.emit(contractSupervision, "ValidationCreated")
      .withArgs(ethers.BigNumber.from(0), ethers.BigNumber.from(1));
    /// assign validation with validator1
    await expect(contractSupervision.connect(validator1).assignValidation(1))
      .to.emit(contractSupervision, "ValidationAssigned")
      .withArgs(
        ethers.BigNumber.from(0),
        ethers.BigNumber.from(1),
        validator1.address
      );
    /// assign validation with validator2
    await expect(contractSupervision.connect(validator2).assignValidation(1))
      .to.emit(contractSupervision, "ValidationAssigned")
      .withArgs(
        ethers.BigNumber.from(0),
        ethers.BigNumber.from(1),
        validator2.address
      );
    /// assign validation with validator3
    await expect(contractSupervision.connect(validator3).assignValidation(1))
      .to.emit(contractSupervision, "ValidationAssigned")
      .withArgs(
        ethers.BigNumber.from(0),
        ethers.BigNumber.from(1),
        validator3.address
      );
    /// assign validation with validator4
    await expect(contractSupervision.connect(validator4).assignValidation(1))
      .to.emit(contractSupervision, "ValidationAssigned")
      .withArgs(
        ethers.BigNumber.from(0),
        ethers.BigNumber.from(1),
        validator4.address
      );
    /// assign validation with validator5
    await expect(contractSupervision.connect(validator5).assignValidation(1))
      .to.emit(contractSupervision, "ValidationAssigned")
      .withArgs(
        ethers.BigNumber.from(0),
        ethers.BigNumber.from(1),
        validator5.address
      );
    /// send validation result with validator1
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
    /// send validation result with validator2
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
    /// send validation result with validator3
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
    /// send validation result with validator4
    await expect(
      contractSupervision.connect(validator4).sendValidation(1, true)
    )
      .to.emit(contractSupervision, "ValidationResultSent")
      .withArgs(
        ethers.BigNumber.from(0),
        ethers.BigNumber.from(1),
        validator4.address,
        true
      );
    /// send validation result with validator5
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
    /// finalize validation
    await expect(
      contractSupervision.connect(contentCreator).finalizeValidation(1)
    )
      .to.emit(contractSupervision, "ValidationEnded")
      .withArgs(ethers.BigNumber.from(0), ethers.BigNumber.from(1), true);
    /// check validation score of validator1
    expect(
      await contractSupervision.getValidatorScore(validator1.address, 0)
    ).to.eql(ethers.BigNumber.from(50));
  });

  it("Should return total validation score", async function () {
    await reDeploy();
    /// set KYC for content creator
    await contractRoleManager.setKYC(contentCreator.address, true);
    /// create content
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
    /// create validation
    await expect(
      contractSupervision.connect(contentCreator).createValidation(0, 50)
    )
      .to.emit(contractSupervision, "ValidationCreated")
      .withArgs(ethers.BigNumber.from(0), ethers.BigNumber.from(1));
    /// assign validation with validator1
    await expect(contractSupervision.connect(validator1).assignValidation(1))
      .to.emit(contractSupervision, "ValidationAssigned")
      .withArgs(
        ethers.BigNumber.from(0),
        ethers.BigNumber.from(1),
        validator1.address
      );
    /// assign validation with validator2
    await expect(contractSupervision.connect(validator2).assignValidation(1))
      .to.emit(contractSupervision, "ValidationAssigned")
      .withArgs(
        ethers.BigNumber.from(0),
        ethers.BigNumber.from(1),
        validator2.address
      );
    /// assign validation with validator3
    await expect(contractSupervision.connect(validator3).assignValidation(1))
      .to.emit(contractSupervision, "ValidationAssigned")
      .withArgs(
        ethers.BigNumber.from(0),
        ethers.BigNumber.from(1),
        validator3.address
      );
    /// assign validation with validator4
    await expect(contractSupervision.connect(validator4).assignValidation(1))
      .to.emit(contractSupervision, "ValidationAssigned")
      .withArgs(
        ethers.BigNumber.from(0),
        ethers.BigNumber.from(1),
        validator4.address
      );
    /// assign validation with validator5
    await expect(contractSupervision.connect(validator5).assignValidation(1))
      .to.emit(contractSupervision, "ValidationAssigned")
      .withArgs(
        ethers.BigNumber.from(0),
        ethers.BigNumber.from(1),
        validator5.address
      );
    /// send validation result with validator1
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
    /// send validation result with validator2
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
    /// send validation result with validator3
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
    /// send validation result with validator4
    await expect(
      contractSupervision.connect(validator4).sendValidation(1, true)
    )
      .to.emit(contractSupervision, "ValidationResultSent")
      .withArgs(
        ethers.BigNumber.from(0),
        ethers.BigNumber.from(1),
        validator4.address,
        true
      );
    /// send validation result with validator5
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
    /// finalize validation
    await expect(
      contractSupervision.connect(contentCreator).finalizeValidation(1)
    )
      .to.emit(contractSupervision, "ValidationEnded")
      .withArgs(ethers.BigNumber.from(0), ethers.BigNumber.from(1), true);
    /// get total validation score
    expect(await contractSupervision.getTotalValidationScore()).to.eql(
      ethers.BigNumber.from(200)
    );
  });

  it("Should not create validation if content does not exist", async function () {
    await reDeploy();
    /// set KYC for content creator
    await contractRoleManager.setKYC(contentCreator.address, true);
    /// create validation
    await expect(
      contractSupervision.connect(contentCreator).createValidation(0, 50)
    ).to.revertedWith("ERC721: invalid token ID");
  });

  it("Should fail to create content validation when Token owner isn't KYCed", async function () {
    await reDeploy();
    /// Set KYC to true for content creator
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

    /// Set KYC to false for content creator
    await contractRoleManager.setKYC(contentCreator.address, false);

    /// Create validation
    await expect(
      contractSupervision.connect(contentCreator).createValidation(0, 50)
    ).to.revertedWith("Token owner is not KYCed");
  });

  it("Should fail to create content validation when Token owner is banned", async function () {
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
      contractValidationManager,
      contractSupervision,
      contractPlatformTreasury,
      contractUDAOVp,
      contractUDAOStaker,
      contractUDAOTimelockController,
      contractUDAOGovernor,
      contractJurorManager,
      GOVERNANCE_ROLE,
      BACKEND_ROLE,
      contractContractManager,
      account1,
      account2,
      account3,
      contractPriceGetter,
    } = await deploy();
    /// Set KYC to true for content creator
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

    /// Ban the content creator
    await contractRoleManager.setBan(contentCreator.address, true);

    /// Create validation
    await expect(
      contractSupervision.connect(contentCreator).createValidation(0, 50)
    ).to.revertedWith("Token owner is banned");
  });
});
