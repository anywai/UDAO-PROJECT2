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

// @dev Proposal states
/*
 enum ProposalState {
        Pending,
        Active,
        Canceled,
        Defeated,
        Succeeded,
        Queued,
        Expired,
        Executed
    }
*/

/// @dev Run validation and finalize it
async function runValidation(
  contentCreator,
  contractValidationManager,
  backend,
  validator1,
  validator2,
  validator3,
  validator4,
  validator5
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

/// @dev Create content and run validation
async function createContent(
  contentCreator,
  contractValidationManager,
  contractRoleManager,
  contractUDAOContent,
  backend,
  validator1,
  validator2,
  validator3,
  validator4,
  validator5
) {
  /// Set KYC
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

  /// Start validation and finalize it
  await runValidation(
    contentCreator,
    contractValidationManager,
    backend,
    validator1,
    validator2,
    validator3,
    validator4,
    validator5
  );
}

describe("Juror Manager", function () {
  it("Should create new dispute", async function () {
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
      jurorMember1,
      jurorMember2,
      jurorMember3,
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
      contractJurorManager,
    } = await deploy();

    /// @dev Case settings
    const caseScope = 1;
    const caseQuestion = "Should we remove this content?";
    const caseTokenRelated = true;
    const caseTokenId = 0;

    /// @dev Create dispute
    await expect(
      contractJurorManager
        .connect(backend)
        .createDispute(caseScope, caseQuestion, caseTokenRelated, caseTokenId)
    )
      .to.emit(contractJurorManager, "DisputeCreated")
      .withArgs(1, caseScope, caseQuestion);
  });

  it("Should a juror be able to assign a dispute to himself", async function () {
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
      jurorMember1,
      jurorMember2,
      jurorMember3,
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
      contractJurorManager,
    } = await deploy(false, true, true);
    /// Set KYC
    await contractRoleManager.setKYC(jurorMember1.address, true);

    /// @dev Dispute settings
    const caseScope = 1;
    const caseQuestion = "Should we remove this content?";
    const caseTokenRelated = true;
    const caseTokenId = 0;

    /// @dev Create content
    await createContent(
      contentCreator,
      contractValidationManager,
      contractRoleManager,
      contractUDAOContent,
      backend,
      validator1,
      validator2,
      validator3,
      validator4,
      validator5
    );
    /// @dev Create dispute
    await contractJurorManager
      .connect(backend)
      .createDispute(caseScope, caseQuestion, caseTokenRelated, caseTokenId);
    /// @dev Assign dispute to juror
    const disputeId = 1;
    await expect(
      contractJurorManager.connect(jurorMember1).assignDispute(disputeId)
    )
      .to.emit(contractJurorManager, "DisputeAssigned")
      .withArgs(disputeId, jurorMember1.address);
  });

  it("Should allow jurors to assign the dispute only once", async function () {
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
      jurorMember1,
      jurorMember2,
      jurorMember3,
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
      contractJurorManager,
    } = await deploy(false, true, true);
    /// Set KYC
    await contractRoleManager.setKYC(jurorMember1.address, true);

    /// @dev Dispute settings
    const caseScope = 1;
    const caseQuestion = "Should we remove this content?";
    const caseTokenRelated = true;
    const caseTokenId = 0;

    /// @dev Create content
    await createContent(
      contentCreator,
      contractValidationManager,
      contractRoleManager,
      contractUDAOContent,
      backend,
      validator1,
      validator2,
      validator3,
      validator4,
      validator5
    );
    /// @dev Create dispute
    await contractJurorManager
      .connect(backend)
      .createDispute(caseScope, caseQuestion, caseTokenRelated, caseTokenId);
    /// @dev Assign dispute to juror
    const disputeId = 1;
    await contractJurorManager.connect(jurorMember1).assignDispute(disputeId);
    /// @dev Assign dispute to juror again
    await expect(
      contractJurorManager.connect(jurorMember1).assignDispute(disputeId)
    ).to.be.revertedWith("You already have an assigned dispute");
  });
  it("Should not allow a juror to assign the dispute to himself if he was also the validator of the content", async function () {
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
      jurorMember1,
      jurorMember2,
      jurorMember3,
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
      contractJurorManager,
    } = await deploy(false, true, true);
    /// Set KYC
    await contractRoleManager.setKYC(jurorMember1.address, true);

    /// @dev Dispute settings
    const caseScope = 1;
    const caseQuestion = "Should we remove this content?";
    const caseTokenRelated = true;
    const caseTokenId = 0;
    /// @dev Give validator role to jurorMember1
    const VALIDATOR_ROLE = ethers.utils.keccak256(
      ethers.utils.toUtf8Bytes("VALIDATOR_ROLE")
    );
    await contractRoleManager.grantRole(VALIDATOR_ROLE, jurorMember1.address);
    /// @dev Create content, here jurorMember1 is also the validator
    await createContent(
      contentCreator,
      contractValidationManager,
      contractRoleManager,
      contractUDAOContent,
      backend,
      jurorMember1,
      validator2,
      validator3,
      validator4,
      validator5
    );
    /// @dev Create dispute
    await contractJurorManager
      .connect(backend)
      .createDispute(caseScope, caseQuestion, caseTokenRelated, caseTokenId);
    /// @dev Assign dispute to juror and fail
    const disputeId = 1;
    await expect(
      contractJurorManager.connect(jurorMember1).assignDispute(disputeId)
    ).to.be.revertedWith("You can't assign content you validated!");
  });

  it("Should not allow non-jurors to assign the dispute to themselves", async function () {
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
      jurorMember1,
      jurorMember2,
      jurorMember3,
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
      contractJurorManager,
    } = await deploy(false, true, true);

    /// @dev Dispute settings
    const caseScope = 1;
    const caseQuestion = "Should we remove this content?";
    const caseTokenRelated = true;
    const caseTokenId = 0;

    /// @dev Create content
    await createContent(
      contentCreator,
      contractValidationManager,
      contractRoleManager,
      contractUDAOContent,
      backend,
      validator1,
      validator2,
      validator3,
      validator4,
      validator5
    );
    /// @dev Create dispute
    await contractJurorManager
      .connect(backend)
      .createDispute(caseScope, caseQuestion, caseTokenRelated, caseTokenId);
    /// @dev Assign dispute to juror
    const hashedJUROR_ROLE =
      "0x2ea44624af573c71d23003c0751808a79f405c6b5fddb794897688d59c07918b";
    const disputeId = 1;
    await expect(
      contractJurorManager.connect(backend).assignDispute(disputeId)
    ).to.be.revertedWith(
      "AccessControl: account " +
        backend.address.toLowerCase() +
        " is missing role " +
        hashedJUROR_ROLE
    );
  });

  it("Should allow jurors to send dispute result", async function () {
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
      jurorMember1,
      jurorMember2,
      jurorMember3,
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
      contractJurorManager,
    } = await deploy(false, true, true);
    /// Set KYC
    await contractRoleManager.setKYC(jurorMember1.address, true);

    /// @dev Dispute settings
    const caseScope = 1;
    const caseQuestion = "Should we remove this content?";
    const caseTokenRelated = true;
    const caseTokenId = 0;

    /// @dev Create content
    await createContent(
      contentCreator,
      contractValidationManager,
      contractRoleManager,
      contractUDAOContent,
      backend,
      validator1,
      validator2,
      validator3,
      validator4,
      validator5
    );
    /// @dev Create dispute
    await contractJurorManager
      .connect(backend)
      .createDispute(caseScope, caseQuestion, caseTokenRelated, caseTokenId);
    /// @dev Assign dispute to juror
    const disputeId = 1;
    await contractJurorManager.connect(jurorMember1).assignDispute(disputeId);
    /// @dev Send dispute result
    const disputeResultOfJurorMember1 = 1;
    await expect(
      contractJurorManager
        .connect(jurorMember1)
        .sendDisputeResult(disputeId, disputeResultOfJurorMember1)
    )
      .to.emit(contractJurorManager, "DisputeResultSent")
      .withArgs(disputeId, true, jurorMember1.address);
  });

  it("Should allow jurors to send dispute result only once", async function () {
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
      jurorMember1,
      jurorMember2,
      jurorMember3,
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
      contractJurorManager,
    } = await deploy(false, true, true);
    /// Set KYC
    await contractRoleManager.setKYC(jurorMember1.address, true);

    /// @dev Dispute settings
    const caseScope = 1;
    const caseQuestion = "Should we remove this content?";
    const caseTokenRelated = true;
    const caseTokenId = 0;

    /// @dev Create content
    await createContent(
      contentCreator,
      contractValidationManager,
      contractRoleManager,
      contractUDAOContent,
      backend,
      validator1,
      validator2,
      validator3,
      validator4,
      validator5
    );
    /// @dev Create dispute
    await contractJurorManager
      .connect(backend)
      .createDispute(caseScope, caseQuestion, caseTokenRelated, caseTokenId);
    /// @dev Assign dispute to juror
    const disputeId = 1;
    await contractJurorManager.connect(jurorMember1).assignDispute(disputeId);
    /// @dev Send dispute result
    const disputeResultOfJurorMember1 = 1;
    await contractJurorManager
      .connect(jurorMember1)
      .sendDisputeResult(disputeId, disputeResultOfJurorMember1);
    /// @dev Send dispute result again
    await expect(
      contractJurorManager
        .connect(jurorMember1)
        .sendDisputeResult(disputeId, disputeResultOfJurorMember1)
    ).to.be.revertedWith("This dispute is not assigned to this wallet");
  });

  it("Should allow multiple jurors to assing and send dispute results and allow anyone to finalize", async function () {
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
      jurorMember1,
      jurorMember2,
      jurorMember3,
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
      contractJurorManager,
    } = await deploy(false, true, true);
    /// Set KYC
    await contractRoleManager.setKYC(jurorMember1.address, true);
    await contractRoleManager.setKYC(jurorMember2.address, true);
    await contractRoleManager.setKYC(jurorMember3.address, true);
    /// @dev Dispute settings
    const caseScope = 1;
    const caseQuestion = "Should we remove this content?";
    const caseTokenRelated = true;
    const caseTokenId = 0;

    /// @dev Create content
    await createContent(
      contentCreator,
      contractValidationManager,
      contractRoleManager,
      contractUDAOContent,
      backend,
      validator1,
      validator2,
      validator3,
      validator4,
      validator5
    );
    /// @dev Create dispute
    await contractJurorManager
      .connect(backend)
      .createDispute(caseScope, caseQuestion, caseTokenRelated, caseTokenId);
    /// @dev Assign dispute to juror
    const disputeId = 1;
    await contractJurorManager.connect(jurorMember1).assignDispute(disputeId);
    await contractJurorManager.connect(jurorMember2).assignDispute(disputeId);
    await contractJurorManager.connect(jurorMember3).assignDispute(disputeId);
    /// @dev Send dispute result
    const disputeResultOfJurorMember1 = 1;
    const disputeResultOfJurorMember2 = 1;
    const disputeResultOfJurorMember3 = 1;
    const disputeVerdict = true;
    await contractJurorManager
      .connect(jurorMember1)
      .sendDisputeResult(disputeId, disputeResultOfJurorMember1);
    await contractJurorManager
      .connect(jurorMember2)
      .sendDisputeResult(disputeId, disputeResultOfJurorMember2);
    await expect(
      contractJurorManager
        .connect(jurorMember3)
        .sendDisputeResult(disputeId, disputeResultOfJurorMember3)
    )
      .to.emit(contractJurorManager, "DisputeEnded")
      .withArgs(disputeId, disputeVerdict);
  });

  it("Should the final verdict return false if 2 out of 3 jurors vote against the dispute question", async function () {
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
      jurorMember1,
      jurorMember2,
      jurorMember3,
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
      contractJurorManager,
    } = await deploy(false, true, true);
    /// Set KYC
    await contractRoleManager.setKYC(jurorMember1.address, true);
    await contractRoleManager.setKYC(jurorMember2.address, true);
    await contractRoleManager.setKYC(jurorMember3.address, true);
    /// @dev Dispute settings
    const caseScope = 1;
    const caseQuestion = "Should we remove this content?";
    const caseTokenRelated = true;
    const caseTokenId = 0;

    /// @dev Create content
    await createContent(
      contentCreator,
      contractValidationManager,
      contractRoleManager,
      contractUDAOContent,
      backend,
      validator1,
      validator2,
      validator3,
      validator4,
      validator5
    );
    /// @dev Create dispute
    await contractJurorManager
      .connect(backend)
      .createDispute(caseScope, caseQuestion, caseTokenRelated, caseTokenId);
    /// @dev Assign dispute to juror
    const disputeId = 1;
    await contractJurorManager.connect(jurorMember1).assignDispute(disputeId);
    await contractJurorManager.connect(jurorMember2).assignDispute(disputeId);
    await contractJurorManager.connect(jurorMember3).assignDispute(disputeId);
    /// @dev Send dispute result
    const disputeResultOfJurorMember1 = 1;
    const disputeResultOfJurorMember2 = 0;
    const disputeResultOfJurorMember3 = 0;
    const disputeVerdict = false;
    await contractJurorManager
      .connect(jurorMember1)
      .sendDisputeResult(disputeId, disputeResultOfJurorMember1);
    await contractJurorManager
      .connect(jurorMember2)
      .sendDisputeResult(disputeId, disputeResultOfJurorMember2);
    await expect(
      contractJurorManager
        .connect(jurorMember3)
        .sendDisputeResult(disputeId, disputeResultOfJurorMember3)
    )
      .to.emit(contractJurorManager, "DisputeEnded")
      .withArgs(disputeId, disputeVerdict);
  });

  it("Should the final verdict return true if 2 out of 3 jurors vote for the dispute question", async function () {
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
      jurorMember1,
      jurorMember2,
      jurorMember3,
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
      contractJurorManager,
    } = await deploy(false, true, true);
    /// Set KYC
    await contractRoleManager.setKYC(jurorMember1.address, true);
    await contractRoleManager.setKYC(jurorMember2.address, true);
    await contractRoleManager.setKYC(jurorMember3.address, true);
    /// @dev Dispute settings
    const caseScope = 1;
    const caseQuestion = "Should we remove this content?";
    const caseTokenRelated = true;
    const caseTokenId = 0;

    /// @dev Create content
    await createContent(
      contentCreator,
      contractValidationManager,
      contractRoleManager,
      contractUDAOContent,
      backend,
      validator1,
      validator2,
      validator3,
      validator4,
      validator5
    );
    /// @dev Create dispute
    await contractJurorManager
      .connect(backend)
      .createDispute(caseScope, caseQuestion, caseTokenRelated, caseTokenId);
    /// @dev Assign dispute to juror
    const disputeId = 1;
    await contractJurorManager.connect(jurorMember1).assignDispute(disputeId);
    await contractJurorManager.connect(jurorMember2).assignDispute(disputeId);
    await contractJurorManager.connect(jurorMember3).assignDispute(disputeId);
    /// @dev Send dispute result
    const disputeResultOfJurorMember1 = 1;
    const disputeResultOfJurorMember2 = 1;
    const disputeResultOfJurorMember3 = 0;
    const disputeVerdict = true;
    await contractJurorManager
      .connect(jurorMember1)
      .sendDisputeResult(disputeId, disputeResultOfJurorMember1);
    await contractJurorManager
      .connect(jurorMember2)
      .sendDisputeResult(disputeId, disputeResultOfJurorMember2);
    await expect(
      contractJurorManager
        .connect(jurorMember3)
        .sendDisputeResult(disputeId, disputeResultOfJurorMember3)
    )
      .to.emit(contractJurorManager, "DisputeEnded")
      .withArgs(disputeId, disputeVerdict);
  });

  it("Should allow treasury contract to switch to the next round", async function () {
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
      jurorMember1,
      jurorMember2,
      jurorMember3,
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
      contractJurorManager,
    } = await deploy();
    // send some eth to the contractPlatformTreasury and impersonate it
    await helpers.setBalance(
      contractPlatformTreasury.address,
      hre.ethers.utils.parseEther("1")
    );
    const signerTreasuryContract = await ethers.getImpersonatedSigner(
      contractPlatformTreasury.address
    );
    // get the current distribution round
    const currentDistributionRound =
      await contractJurorManager.distributionRound();
    expect(currentDistributionRound).to.equal(0);
    // call the next round from contractJurorManager
    const nextDistributionRound = currentDistributionRound + 1;
    await expect(
      contractJurorManager.connect(signerTreasuryContract).nextRound()
    )
      .to.emit(contractJurorManager, "NextRound")
      .withArgs(nextDistributionRound);
  });

  it("Should return successful and unsuccessful dispute results of jurors correctly", async function () {
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
      jurorMember1,
      jurorMember2,
      jurorMember3,
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
      contractJurorManager,
    } = await deploy(false, true, true);
    /// Set KYC
    await contractRoleManager.setKYC(jurorMember1.address, true);
    await contractRoleManager.setKYC(jurorMember2.address, true);
    await contractRoleManager.setKYC(jurorMember3.address, true);
    /// @dev Dispute settings
    const caseScope = 1;
    const caseQuestion = "Should we remove this content?";
    const caseTokenRelated = true;
    const caseTokenId = 0;

    /// @dev Create content
    await createContent(
      contentCreator,
      contractValidationManager,
      contractRoleManager,
      contractUDAOContent,
      backend,
      validator1,
      validator2,
      validator3,
      validator4,
      validator5
    );
    /// @dev Create dispute
    await contractJurorManager
      .connect(backend)
      .createDispute(caseScope, caseQuestion, caseTokenRelated, caseTokenId);
    /// @dev Assign dispute to juror
    const disputeId = 1;
    await contractJurorManager.connect(jurorMember1).assignDispute(disputeId);
    await contractJurorManager.connect(jurorMember2).assignDispute(disputeId);
    await contractJurorManager.connect(jurorMember3).assignDispute(disputeId);
    /// @dev Send dispute result
    const disputeResultOfJurorMember1 = 1;
    const disputeResultOfJurorMember2 = 0;
    const disputeResultOfJurorMember3 = 0;
    const disputeVerdict = false;
    await contractJurorManager
      .connect(jurorMember1)
      .sendDisputeResult(disputeId, disputeResultOfJurorMember1);
    await contractJurorManager
      .connect(jurorMember2)
      .sendDisputeResult(disputeId, disputeResultOfJurorMember2);
    await expect(
      contractJurorManager
        .connect(jurorMember3)
        .sendDisputeResult(disputeId, disputeResultOfJurorMember3)
    )
      .to.emit(contractJurorManager, "DisputeEnded")
      .withArgs(disputeId, disputeVerdict);

    /// @dev Check number of successful and unsuccessful dispute results of jurors
    const disputeResultsOfJuror1 = await contractJurorManager.getCaseResults(
      jurorMember1.address
    );
    const disputeResultsOfJuror2 = await contractJurorManager.getCaseResults(
      jurorMember2.address
    );
    const disputeResultsOfJuror3 = await contractJurorManager.getCaseResults(
      jurorMember3.address
    );
    const successfulIndex = 0;
    const unsuccessfulIndex = 1;
    expect(disputeResultsOfJuror1[successfulIndex]).to.equal(0);
    expect(disputeResultsOfJuror1[unsuccessfulIndex]).to.equal(1);
    expect(disputeResultsOfJuror2[successfulIndex]).to.equal(1);
    expect(disputeResultsOfJuror2[unsuccessfulIndex]).to.equal(0);
    expect(disputeResultsOfJuror3[successfulIndex]).to.equal(1);
    expect(disputeResultsOfJuror3[unsuccessfulIndex]).to.equal(0);
  });

  it("Should return the scores of jurors correctly", async function () {
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
      jurorMember1,
      jurorMember2,
      jurorMember3,
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
      contractJurorManager,
    } = await deploy(false, true, true);
    /// Set KYC
    await contractRoleManager.setKYC(jurorMember1.address, true);
    await contractRoleManager.setKYC(jurorMember2.address, true);
    await contractRoleManager.setKYC(jurorMember3.address, true);
    /// @dev Dispute settings
    const caseScope = 1;
    const caseQuestion = "Should we remove this content?";
    const caseTokenRelated = true;
    const caseTokenId = 0;

    /// @dev Create content
    await createContent(
      contentCreator,
      contractValidationManager,
      contractRoleManager,
      contractUDAOContent,
      backend,
      validator1,
      validator2,
      validator3,
      validator4,
      validator5
    );
    /// @dev Create dispute
    await contractJurorManager
      .connect(backend)
      .createDispute(caseScope, caseQuestion, caseTokenRelated, caseTokenId);
    /// @dev Assign dispute to juror
    const disputeId = 1;
    await contractJurorManager.connect(jurorMember1).assignDispute(disputeId);
    await contractJurorManager.connect(jurorMember2).assignDispute(disputeId);
    await contractJurorManager.connect(jurorMember3).assignDispute(disputeId);
    /// @dev Send dispute result
    const disputeResultOfJurorMember1 = 1;
    const disputeResultOfJurorMember2 = 0;
    const disputeResultOfJurorMember3 = 0;
    const disputeVerdict = false;
    await contractJurorManager
      .connect(jurorMember1)
      .sendDisputeResult(disputeId, disputeResultOfJurorMember1);
    await contractJurorManager
      .connect(jurorMember2)
      .sendDisputeResult(disputeId, disputeResultOfJurorMember2);
    await expect(
      contractJurorManager
        .connect(jurorMember3)
        .sendDisputeResult(disputeId, disputeResultOfJurorMember3)
    )
      .to.emit(contractJurorManager, "DisputeEnded")
      .withArgs(disputeId, disputeVerdict);

    /// @dev Check scores of jurors in this round
    const currentDistributionRound =
      await contractJurorManager.distributionRound();
    const scoreOfJuror1 = await contractJurorManager.getJurorScore(
      jurorMember1.address,
      currentDistributionRound
    );
    const scoreOfJuror2 = await contractJurorManager.getJurorScore(
      jurorMember2.address,
      currentDistributionRound
    );
    const scoreOfJuror3 = await contractJurorManager.getJurorScore(
      jurorMember3.address,
      currentDistributionRound
    );
    expect(scoreOfJuror1).to.equal(0);
    expect(scoreOfJuror2).to.equal(1);
    expect(scoreOfJuror3).to.equal(1);
  });

  it("Should return the scores of jurors correctly after multiple rounds", async function () {
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
      jurorMember1,
      jurorMember2,
      jurorMember3,
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
      contractJurorManager,
    } = await deploy(false, true, true);
    /// Set KYC
    await contractRoleManager.setKYC(jurorMember1.address, true);
    await contractRoleManager.setKYC(jurorMember2.address, true);
    await contractRoleManager.setKYC(jurorMember3.address, true);
    /// @dev Dispute settings
    const caseScope = 1;
    const caseQuestion = "Should we remove this content?";
    const caseTokenRelated = true;
    const caseTokenId = 0;

    /// @dev Create content
    await createContent(
      contentCreator,
      contractValidationManager,
      contractRoleManager,
      contractUDAOContent,
      backend,
      validator1,
      validator2,
      validator3,
      validator4,
      validator5
    );
    /// @dev Create dispute
    await contractJurorManager
      .connect(backend)
      .createDispute(caseScope, caseQuestion, caseTokenRelated, caseTokenId);
    /// @dev Assign dispute to juror
    const disputeId = 1;
    await contractJurorManager.connect(jurorMember1).assignDispute(disputeId);
    await contractJurorManager.connect(jurorMember2).assignDispute(disputeId);
    await contractJurorManager.connect(jurorMember3).assignDispute(disputeId);
    /// @dev Send dispute result
    const disputeResultOfJurorMember1 = 1;
    const disputeResultOfJurorMember2 = 0;
    const disputeResultOfJurorMember3 = 0;
    const disputeVerdict = false;
    await contractJurorManager
      .connect(jurorMember1)
      .sendDisputeResult(disputeId, disputeResultOfJurorMember1);
    await contractJurorManager
      .connect(jurorMember2)
      .sendDisputeResult(disputeId, disputeResultOfJurorMember2);
    await expect(
      contractJurorManager
        .connect(jurorMember3)
        .sendDisputeResult(disputeId, disputeResultOfJurorMember3)
    )
      .to.emit(contractJurorManager, "DisputeEnded")
      .withArgs(disputeId, disputeVerdict);

    /// @dev Check scores of jurors in this round
    const currentDistributionRound =
      await contractJurorManager.distributionRound();
    const scoreOfJuror1 = await contractJurorManager.getJurorScore(
      jurorMember1.address,
      currentDistributionRound
    );
    const scoreOfJuror2 = await contractJurorManager.getJurorScore(
      jurorMember2.address,
      currentDistributionRound
    );
    const scoreOfJuror3 = await contractJurorManager.getJurorScore(
      jurorMember3.address,
      currentDistributionRound
    );
    expect(scoreOfJuror1).to.equal(0);
    expect(scoreOfJuror2).to.equal(1);
    expect(scoreOfJuror3).to.equal(1);

    /// @dev Create dispute
    await contractJurorManager
      .connect(backend)
      .createDispute(caseScope, caseQuestion, caseTokenRelated, caseTokenId);
    /// @dev Assign dispute to juror
    const disputeId2 = 2;
    await contractJurorManager.connect(jurorMember1).assignDispute(disputeId2);
    await contractJurorManager.connect(jurorMember2).assignDispute(disputeId2);
    await contractJurorManager.connect(jurorMember3).assignDispute(disputeId2);
    /// @dev Send dispute result
    const disputeResultOfJurorMember1_2 = 1;
    const disputeResultOfJurorMember2_2 = 0;
    const disputeResultOfJurorMember3_2 = 0;
    const disputeVerdict2 = false;
    await contractJurorManager
      .connect(jurorMember1)
      .sendDisputeResult(disputeId2, disputeResultOfJurorMember1_2);
    await contractJurorManager
      .connect(jurorMember2)
      .sendDisputeResult(disputeId2, disputeResultOfJurorMember2_2);
    await expect(
      contractJurorManager
        .connect(jurorMember3)
        .sendDisputeResult(disputeId2, disputeResultOfJurorMember3_2)
    )
      .to.emit(contractJurorManager, "DisputeEnded")
      .withArgs(disputeId2, disputeVerdict2);

    /// @dev Check scores of jurors in this round
    const currentDistributionRound2 =
      await contractJurorManager.distributionRound();
    const scoreOfJuror1_2 = await contractJurorManager.getJurorScore(
      jurorMember1.address,
      currentDistributionRound2
    );
    const scoreOfJuror2_2 = await contractJurorManager.getJurorScore(
      jurorMember2.address,
      currentDistributionRound2
    );
    const scoreOfJuror3_2 = await contractJurorManager.getJurorScore(
      jurorMember3.address,
      currentDistributionRound2
    );
    expect(scoreOfJuror1_2).to.equal(0);
    expect(scoreOfJuror2_2).to.equal(2);
    expect(scoreOfJuror3_2).to.equal(2);
  });

  it("Should return the total juror score correctly", async function () {
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
      jurorMember1,
      jurorMember2,
      jurorMember3,
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
      contractJurorManager,
    } = await deploy(false, true, true);
    /// Set KYC
    await contractRoleManager.setKYC(jurorMember1.address, true);
    await contractRoleManager.setKYC(jurorMember2.address, true);
    await contractRoleManager.setKYC(jurorMember3.address, true);
    /// @dev Dispute settings
    const caseScope = 1;
    const caseQuestion = "Should we remove this content?";
    const caseTokenRelated = true;
    const caseTokenId = 0;

    /// @dev Create content
    await createContent(
      contentCreator,
      contractValidationManager,
      contractRoleManager,
      contractUDAOContent,
      backend,
      validator1,
      validator2,
      validator3,
      validator4,
      validator5
    );
    /// @dev Create dispute
    await contractJurorManager
      .connect(backend)
      .createDispute(caseScope, caseQuestion, caseTokenRelated, caseTokenId);
    /// @dev Assign dispute to juror
    const disputeId = 1;
    await contractJurorManager.connect(jurorMember1).assignDispute(disputeId);
    await contractJurorManager.connect(jurorMember2).assignDispute(disputeId);
    await contractJurorManager.connect(jurorMember3).assignDispute(disputeId);
    /// @dev Send dispute result
    const disputeResultOfJurorMember1 = 1;
    const disputeResultOfJurorMember2 = 0;
    const disputeResultOfJurorMember3 = 0;
    const disputeVerdict = false;
    await contractJurorManager
      .connect(jurorMember1)
      .sendDisputeResult(disputeId, disputeResultOfJurorMember1);
    await contractJurorManager
      .connect(jurorMember2)
      .sendDisputeResult(disputeId, disputeResultOfJurorMember2);
    await expect(
      contractJurorManager
        .connect(jurorMember3)
        .sendDisputeResult(disputeId, disputeResultOfJurorMember3)
    )
      .to.emit(contractJurorManager, "DisputeEnded")
      .withArgs(disputeId, disputeVerdict);

    /// @dev Check scores of jurors in this round
    const currentDistributionRound =
      await contractJurorManager.distributionRound();
    const scoreOfJuror1 = await contractJurorManager.getJurorScore(
      jurorMember1.address,
      currentDistributionRound
    );
    const scoreOfJuror2 = await contractJurorManager.getJurorScore(
      jurorMember2.address,
      currentDistributionRound
    );
    const scoreOfJuror3 = await contractJurorManager.getJurorScore(
      jurorMember3.address,
      currentDistributionRound
    );
    expect(scoreOfJuror1).to.equal(0);
    expect(scoreOfJuror2).to.equal(1);
    expect(scoreOfJuror3).to.equal(1);

    /// @dev Get total juror score
    const totalJurorScore = await contractJurorManager.getTotalJurorScore();
    expect(totalJurorScore).to.equal(2);
  });

  it("Should a use with GOVERNANCE_MEMBER role be able to change the number of required jurors", async function () {
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
      jurorMember1,
      jurorMember2,
      jurorMember3,
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
      contractJurorManager,
    } = await deploy();

    /// @dev Change the number of required jurors
    const newRequiredJurors = 5;
    await contractJurorManager
      .connect(governanceMember)
      .setRequiredJurors(newRequiredJurors);
    const requiredJurors = await contractJurorManager.requiredJurors();
    expect(requiredJurors).to.equal(newRequiredJurors);
  });

  it("Should fail to a use without BACKEND_ROLE role be able to create new dispute", async function () {
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
      jurorMember1,
      jurorMember2,
      jurorMember3,
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
      contractJurorManager,
      BACKEND_ROLE,
    } = await deploy();

    /// @dev Case settings
    const caseScope = 1;
    const caseQuestion = "Should we remove this content?";
    const caseTokenRelated = true;
    const caseTokenId = 0;

    /// @dev Create dispute
    await expect(
      contractJurorManager
        .connect(jurorMember1)
        .createDispute(caseScope, caseQuestion, caseTokenRelated, caseTokenId)
    ).to.revertedWith(
      `'AccessControl: account ${jurorMember1.address.toLowerCase()} is missing role ${BACKEND_ROLE}'`
    );
  });

  it("Should fail to a use without GOVERNANCE_MEMBER role be able to change the number of required jurors", async function () {
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
      jurorMember1,
      jurorMember2,
      jurorMember3,
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
      contractJurorManager,
      GOVERNANCE_ROLE,
    } = await deploy();

    /// @dev Change the number of required jurors
    const newRequiredJurors = 5;
    await expect(
      contractJurorManager
        .connect(jurorMember1)
        .setRequiredJurors(newRequiredJurors)
    ).to.revertedWith(
      `AccessControl: account ${jurorMember1.address.toLowerCase()} is missing role ${GOVERNANCE_ROLE}`
    );
  });

  it("Should fail for too many juror assigned, a juror be unable to assign a dispute to himself", async function () {
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
      jurorMember1,
      jurorMember2,
      jurorMember3,
      jurorMember4,
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
      contractJurorManager,
    } = await deploy(false, true, true);
    /// Set KYC
    await contractRoleManager.setKYC(jurorMember1.address, true);
    await contractRoleManager.setKYC(jurorMember2.address, true);
    await contractRoleManager.setKYC(jurorMember3.address, true);
    await contractRoleManager.setKYC(jurorMember4.address, true);
    /// @dev Dispute settings
    const caseScope = 1;
    const caseQuestion = "Should we remove this content?";
    const caseTokenRelated = true;
    const caseTokenId = 0;

    /// @dev Create content
    await createContent(
      contentCreator,
      contractValidationManager,
      contractRoleManager,
      contractUDAOContent,
      backend,
      validator1,
      validator2,
      validator3,
      validator4,
      validator5
    );
    /// @dev Create dispute
    await contractJurorManager
      .connect(backend)
      .createDispute(caseScope, caseQuestion, caseTokenRelated, caseTokenId);
    /// @dev Assign dispute to juror
    const disputeId = 1;
    await expect(
      contractJurorManager.connect(jurorMember1).assignDispute(disputeId)
    );
    await expect(
      contractJurorManager.connect(jurorMember2).assignDispute(disputeId)
    );
    await expect(
      contractJurorManager.connect(jurorMember3).assignDispute(disputeId)
    );
    await expect(
      contractJurorManager.connect(jurorMember4).assignDispute(disputeId)
    ).to.revertedWith("Dispute already have enough jurors!");
  });

  it("Should fail juror have already assigned dispute, a juror be unable to assign a dispute to himself", async function () {
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
      jurorMember1,
      jurorMember2,
      jurorMember3,
      jurorMember4,
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
      contractJurorManager,
    } = await deploy(false, true, true);
    /// Set KYC
    await contractRoleManager.setKYC(jurorMember1.address, true);
    /// @dev Dispute settings for 1st dispute
    const caseScope = 1;
    const caseQuestion = "Should we remove this content?";
    const caseTokenRelated = true;
    var caseTokenId = 0;

    /// @dev Create content for 1st dispute
    await createContent(
      contentCreator,
      contractValidationManager,
      contractRoleManager,
      contractUDAOContent,
      backend,
      validator1,
      validator2,
      validator3,
      validator4,
      validator5
    );
    /// @dev Create dispute for 1st dispute
    await contractJurorManager
      .connect(backend)
      .createDispute(caseScope, caseQuestion, caseTokenRelated, caseTokenId);

    /// @dev arrange Dispute settings for 2nd dispute
    caseTokenId = 1;

    /// @dev Create dispute for 2nd dispute
    await contractJurorManager
      .connect(backend)
      .createDispute(caseScope, caseQuestion, caseTokenRelated, caseTokenId);

    /// @dev Assign dispute to juror
    var disputeId = 1;
    await expect(
      contractJurorManager.connect(jurorMember1).assignDispute(disputeId)
    );

    disputeId = 2;
    await expect(
      contractJurorManager.connect(jurorMember1).assignDispute(disputeId)
    ).to.revertedWith("You already have an assigned dispute");
  });

  it("Should fail for unexisting case id, a juror be unable to assign a dispute to himself", async function () {
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
      jurorMember1,
      jurorMember2,
      jurorMember3,
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
      contractJurorManager,
    } = await deploy(false, true, true);
    /// Set KYC
    await contractRoleManager.setKYC(jurorMember1.address, true);
    /// @dev Dispute settings
    const caseScope = 1;
    const caseQuestion = "Should we remove this content";
    const caseTokenRelated = true;
    const caseTokenId = 0;

    /// @dev Create content
    await createContent(
      contentCreator,
      contractValidationManager,
      contractRoleManager,
      contractUDAOContent,
      backend,
      validator1,
      validator2,
      validator3,
      validator4,
      validator5
    );
    /// @dev Create dispute
    await contractJurorManager
      .connect(backend)
      .createDispute(caseScope, caseQuestion, caseTokenRelated, caseTokenId);
    /// @dev Assign dispute to juror
    const disputeId = 2;
    await expect(
      contractJurorManager.connect(jurorMember1).assignDispute(disputeId)
    ).to.revertedWith("Dispute does not exist");
  });

  it("Should fail allow to juror-else role to send dispute result", async function () {
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
      jurorMember1,
      jurorMember2,
      jurorMember3,
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
      contractJurorManager,
      JUROR_ROLE,
    } = await deploy(false, true, true);
    /// Set KYC
    await contractRoleManager.setKYC(jurorMember1.address, true);

    /// @dev Dispute settings
    const caseScope = 1;
    const caseQuestion = "Should we remove this content?";
    const caseTokenRelated = true;
    const caseTokenId = 0;

    /// @dev Create content
    await createContent(
      contentCreator,
      contractValidationManager,
      contractRoleManager,
      contractUDAOContent,
      backend,
      validator1,
      validator2,
      validator3,
      validator4,
      validator5
    );
    /// @dev Create dispute
    await contractJurorManager
      .connect(backend)
      .createDispute(caseScope, caseQuestion, caseTokenRelated, caseTokenId);
    /// @dev Assign dispute to juror
    const hashedJUROR_ROLE =
      "0x2ea44624af573c71d23003c0751808a79f405c6b5fddb794897688d59c07918b";
    const disputeId = 1;
    await contractJurorManager.connect(jurorMember1).assignDispute(disputeId);
    /// @dev Send dispute result
    const disputeResultOfJurorMember1 = 1;
    await expect(
      contractJurorManager
        .connect(contentCreator)
        .sendDisputeResult(disputeId, disputeResultOfJurorMember1)
    ).to.revertedWith(
      `'AccessControl: account ${contentCreator.address.toLowerCase()} is missing role ${hashedJUROR_ROLE}'`
    );
  });

  it("Should fail allow to finalize without not enough juror send dispute results", async function () {
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
      jurorMember1,
      jurorMember2,
      jurorMember3,
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
      contractJurorManager,
    } = await deploy(false, true, true);
    /// Set KYC
    await contractRoleManager.setKYC(jurorMember1.address, true);
    await contractRoleManager.setKYC(jurorMember2.address, true);
    /// @dev Dispute settings
    const caseScope = 1;
    const caseQuestion = "Should we remove this content?";
    const caseTokenRelated = true;
    const caseTokenId = 0;

    /// @dev Create content
    await createContent(
      contentCreator,
      contractValidationManager,
      contractRoleManager,
      contractUDAOContent,
      backend,
      validator1,
      validator2,
      validator3,
      validator4,
      validator5
    );
    /// @dev Create dispute
    await contractJurorManager
      .connect(backend)
      .createDispute(caseScope, caseQuestion, caseTokenRelated, caseTokenId);
    /// @dev Assign dispute to juror
    const disputeId = 1;
    await contractJurorManager.connect(jurorMember1).assignDispute(disputeId);
    await contractJurorManager.connect(jurorMember2).assignDispute(disputeId);
    //await contractJurorManager.connect(jurorMember3).assignDispute(disputeId);
    /// @dev Send dispute result
    const disputeResultOfJurorMember1 = 1;
    const disputeResultOfJurorMember2 = 1;

    await contractJurorManager
      .connect(jurorMember1)
      .sendDisputeResult(disputeId, disputeResultOfJurorMember1);
    await contractJurorManager
      .connect(jurorMember2)
      .sendDisputeResult(disputeId, disputeResultOfJurorMember2);
    /// @dev Finalize dispute
    const disputeVerdict = true;
    await expect(
      contractJurorManager.connect(backend).finalizeDispute(1)
    ).to.revertedWith("Not enough juror votes to finalize the case");
  });

  it("Should fail allow to without treasury contract to switch to the next round", async function () {
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
      jurorMember1,
      jurorMember2,
      jurorMember3,
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
      contractJurorManager,
    } = await deploy();
    // send some eth to the contractPlatformTreasury and impersonate it
    await helpers.setBalance(
      contractPlatformTreasury.address,
      hre.ethers.utils.parseEther("1")
    );
    const signerTreasuryContract = await ethers.getImpersonatedSigner(
      contractPlatformTreasury.address
    );
    const hashedTREASURY_CONTRACT =
      "0xa34ea2ceed6e9b6dd50292aa3f34b931d342b9667303c6f313c588454bca7e8a";
    // get the current distribution round
    const currentDistributionRound =
      await contractJurorManager.distributionRound();
    expect(currentDistributionRound).to.equal(0);
    // call the next round from contractJurorManager
    const nextDistributionRound = currentDistributionRound + 1;
    await expect(
      contractJurorManager.connect(contentCreator).nextRound()
    ).to.revertedWith(
      `'AccessControl: account ${contentCreator.address.toLowerCase()} is missing role ${hashedTREASURY_CONTRACT}'`
    );
  });

  it("Should fail a juror be unable to assign a dispute to himself if the instructor of course", async function () {
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
      jurorMember1,
      jurorMember2,
      jurorMember3,
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
      contractJurorManager,
    } = await deploy(false, true, true);

    /// @dev Dispute settings
    const caseScope = 1;
    const caseQuestion = "Should we remove this content?";
    const caseTokenRelated = true;
    const caseTokenId = 0;

    /// @dev Create content
    await createContent(
      jurorMember1,
      contractValidationManager,
      contractRoleManager,
      contractUDAOContent,
      backend,
      validator1,
      validator2,
      validator3,
      validator4,
      validator5
    );
    /// @dev Create dispute
    await contractJurorManager
      .connect(backend)
      .createDispute(caseScope, caseQuestion, caseTokenRelated, caseTokenId);
    /// @dev Assign dispute to juror
    const disputeId = 1;
    await expect(
      contractJurorManager.connect(jurorMember1).assignDispute(disputeId)
    ).to.revertedWith("You are the instructor of this course.");
  });

  it("Should fail when paused, allow treasury contract to switch to the next round", async function () {
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
      jurorMember1,
      jurorMember2,
      jurorMember3,
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
      contractJurorManager,
    } = await deploy();
    // send some eth to the contractPlatformTreasury and impersonate it
    await helpers.setBalance(
      contractPlatformTreasury.address,
      hre.ethers.utils.parseEther("1")
    );
    const signerTreasuryContract = await ethers.getImpersonatedSigner(
      contractPlatformTreasury.address
    );
    // get the current distribution round
    const currentDistributionRound =
      await contractJurorManager.distributionRound();
    expect(currentDistributionRound).to.equal(0);
    // call the next round from contractJurorManager
    const nextDistributionRound = currentDistributionRound + 1;
    await expect(contractJurorManager.pause());
    await expect(
      contractJurorManager.connect(signerTreasuryContract).nextRound()
    ).to.revertedWith("Pausable: paused");
  });

  it("Should create new dispute that is not token related", async function () {
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
      jurorMember1,
      jurorMember2,
      jurorMember3,
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
      contractJurorManager,
    } = await deploy();

    /// @dev Case settings
    const caseScope = 1;
    const caseQuestion = "Should we remove this content?";
    const caseTokenRelated = false;
    const caseTokenId = 5;

    /// @dev Create dispute
    await expect(
      contractJurorManager
        .connect(backend)
        .createDispute(caseScope, caseQuestion, caseTokenRelated, caseTokenId)
    )
      .to.emit(contractJurorManager, "DisputeCreated")
      .withArgs(1, caseScope, caseQuestion);

    /// Check dispute settings
    const dispute = await contractJurorManager.disputes(1);
    expect(dispute.caseScope).to.equal(caseScope);
    expect(dispute.question).to.equal(caseQuestion);
    expect(dispute.isTokenRelated).to.equal(caseTokenRelated);
    expect(dispute.tokenId).to.equal(0);
  });

  it("Should create new dispute that is token related", async function () {
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
      jurorMember1,
      jurorMember2,
      jurorMember3,
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
      contractJurorManager,
    } = await deploy();

    /// @dev Case settings
    const caseScope = 1;
    const caseQuestion = "Should we remove this content?";
    const caseTokenRelated = true;
    const caseTokenId = 5;

    /// @dev Create dispute
    await expect(
      contractJurorManager
        .connect(backend)
        .createDispute(caseScope, caseQuestion, caseTokenRelated, caseTokenId)
    )
      .to.emit(contractJurorManager, "DisputeCreated")
      .withArgs(1, caseScope, caseQuestion);

    /// Check dispute settings
    const dispute = await contractJurorManager.disputes(1);
    expect(dispute.caseScope).to.equal(caseScope);
    expect(dispute.question).to.equal(caseQuestion);
    expect(dispute.isTokenRelated).to.equal(caseTokenRelated);
    expect(dispute.tokenId).to.equal(caseTokenId);
  });
  it("Should allow backend to call updateAddresses in contractJurorManager", async function () {
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
      jurorMember1,
      jurorMember2,
      jurorMember3,
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
      contractJurorManager,
      contractContractManager,
    } = await deploy();

    // Dummy contract address
    const dummyAddress = "0x7D1AfA7B718fb893dB30A3aBc0Cfc608AaCfeBB0";
    await contractContractManager
      .connect(backend)
      .setAddressIrmAddress(dummyAddress);
    // Check the current IRM address
    const currentIrmAddress = await contractContractManager.IrmAddress();
    expect(currentIrmAddress).to.equal(dummyAddress);
    // Update addresses
    await expect(contractJurorManager.connect(backend).updateAddresses())
      .to.emit(contractJurorManager, "AddressesUpdated")
      .withArgs(dummyAddress);
  });

  it("Should fail to assign dispute to a juror when juror hasn't kyced", async function () {
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
      jurorMember1,
      jurorMember2,
      jurorMember3,
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
      contractJurorManager,
    } = await deploy();
    /// Set KYC
    await contractRoleManager.setKYC(jurorMember1.address, false);

    /// @dev Dispute settings
    const caseScope = 1;
    const caseQuestion = "Should we remove this content?";
    const caseTokenRelated = true;
    const caseTokenId = 0;

    /// @dev Create content
    await createContent(
      contentCreator,
      contractValidationManager,
      contractRoleManager,
      contractUDAOContent,
      backend,
      validator1,
      validator2,
      validator3,
      validator4,
      validator5
    );
    /// @dev Create dispute
    await contractJurorManager
      .connect(backend)
      .createDispute(caseScope, caseQuestion, caseTokenRelated, caseTokenId);
    /// @dev Assign dispute to juror
    const disputeId = 1;
    await expect(
      contractJurorManager.connect(jurorMember1).assignDispute(disputeId)
    ).to.revertedWith("You are not KYCed");
  });

  it("Should fail to assign dispute to a juror when juror already banned", async function () {
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
      jurorMember1,
      jurorMember2,
      jurorMember3,
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
      contractJurorManager,
    } = await deploy();
    /// Set KYC
    await contractRoleManager.setKYC(jurorMember1.address, true);

    /// Ban the juror
    await contractRoleManager.setBan(jurorMember1.address, true);

    /// @dev Dispute settings
    const caseScope = 1;
    const caseQuestion = "Should we remove this content?";
    const caseTokenRelated = true;
    const caseTokenId = 0;

    /// @dev Create content
    await createContent(
      contentCreator,
      contractValidationManager,
      contractRoleManager,
      contractUDAOContent,
      backend,
      validator1,
      validator2,
      validator3,
      validator4,
      validator5
    );
    /// @dev Create dispute
    await contractJurorManager
      .connect(backend)
      .createDispute(caseScope, caseQuestion, caseTokenRelated, caseTokenId);
    /// @dev Assign dispute to juror
    const disputeId = 1;
    await expect(
      contractJurorManager.connect(jurorMember1).assignDispute(disputeId)
    ).to.revertedWith("You were banned");
  });
});
