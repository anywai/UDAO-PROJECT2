const { expect } = require("chai");
const hardhat = require("hardhat");
const { ethers } = hardhat;
const chai = require("chai");
const BN = require("bn.js");
const helpers = require("@nomicfoundation/hardhat-network-helpers");

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
    contractValidationManager.connect(backend).createValidation(0, 50)
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

async function deploy() {
  helpers.reset(
    "https://polygon-mainnet.g.alchemy.com/v2/OsNaN43nxvV85Kk1JpU-a5qduFwjcIGJ",
    40691400
  );
  const [
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
  ] = await ethers.getSigners();

  // FACTORIES
  let factoryRoleManager = await ethers.getContractFactory("RoleManager");
  let factoryUDAOVp = await ethers.getContractFactory("UDAOVp");
  let factoryUDAOTimelockController = await ethers.getContractFactory(
    "UDAOTimelockController"
  );
  let factoryUDAOCertificate = await ethers.getContractFactory(
    "UDAOCertificate"
  );
  let factoryUDAO = await ethers.getContractFactory("UDAO");
  let factoryUDAOStaker = await ethers.getContractFactory("UDAOStaker");
  let factoryValidationManager = await ethers.getContractFactory(
    "ValidationManager"
  );
  let factoryJurorManager = await ethers.getContractFactory("JurorManager");
  let factoryUDAOContent = await ethers.getContractFactory("UDAOContent");
  let factoryPlatformTreasury = await ethers.getContractFactory(
    "PlatformTreasury"
  );
  let factoryUDAOGovernor = await ethers.getContractFactory("UDAOGovernor");
  let factoryContractManager = await ethers.getContractFactory(
    "ContractManager"
  );

  //DEPLOYMENTS
  const contractUDAO = await factoryUDAO.deploy();

  // Deploys PriceGetter

  const positionManager = await ethers.getContractAt(
    NonFunbiblePositionABI,
    "0xC36442b4a4522E871399CD717aBDD847Ab11FE88"
  );

  const WMATIC = await ethers.getContractAt(WMATIC_ABI, WMATICAddress);
  await WMATIC.connect(backend).deposit({
    value: ethers.utils.parseEther("1000.0"),
  });

  // call approve for tokens before adding a new pool
  await WMATIC.connect(backend).approve(
    positionManager.address,
    ethers.utils.parseEther("99999999.0")
  );

  await contractUDAO
    .connect(backend)
    .approve(positionManager.address, ethers.utils.parseEther("9999999.0"));

  const tx = await positionManager
    .connect(backend)
    .createAndInitializePoolIfNecessary(
      WMATIC.address,
      contractUDAO.address,
      "3000",
      "250541420775534450580036817218"
    );
  const result = await tx.wait();
  const tx_2 = await positionManager
    .connect(backend)
    .mint([
      WMATIC.address,
      contractUDAO.address,
      "3000",
      "0",
      "23040",
      "950252822518485471",
      "9999999999999999991268",
      "0",
      "9963392298778452810744",
      backend.address,
      "1678352028999",
    ]);
  const result_2 = await tx_2.wait();

  let factoryPriceGetter = await ethers.getContractFactory("PriceGetter");

  // Price Getter End
  const contractRoleManager = await factoryRoleManager.deploy();
  const contractPriceGetter = await factoryPriceGetter.deploy(
    "0x1F98431c8aD98523631AE4a59f267346ea31F984",
    contractUDAO.address,
    "0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270",
    3000,
    contractRoleManager.address
  );
  const contractUDAOCertificate = await factoryUDAOCertificate.deploy(
    contractRoleManager.address
  );
  const contractUDAOContent = await factoryUDAOContent.deploy(
    contractRoleManager.address
  );
  const contractValidationManager = await factoryValidationManager.deploy(
    contractUDAOContent.address,
    contractRoleManager.address
  );
  const contractJurorManager = await factoryJurorManager.deploy(
    contractRoleManager.address,
    contractUDAOContent.address,
    contractValidationManager.address
  );

  const contractContractManager = await factoryContractManager.deploy(
    contractValidationManager.address,
    contractJurorManager.address,
    contractUDAO.address,
    contractUDAOContent.address,
    contractRoleManager.address
  );

  const contractUDAOVp = await factoryUDAOVp.deploy(
    contractRoleManager.address,
    contractContractManager.address
  );
  const contractPlatformTreasury = await factoryPlatformTreasury.deploy(
    contractContractManager.address,
    contractRoleManager.address,
    contractPriceGetter.address
  );

  const contractUDAOStaker = await factoryUDAOStaker.deploy(
    contractPlatformTreasury.address,
    contractRoleManager.address,
    contractUDAOVp.address,
    contractContractManager.address
  );

  const contractUDAOTimelockController =
    await factoryUDAOTimelockController.deploy(1, [], [foundation.address]);
  const contractUDAOGovernor = await factoryUDAOGovernor.deploy(
    contractUDAOVp.address,
    contractUDAOTimelockController.address,
    contractUDAOStaker.address,
    contractRoleManager.address
  );
  //POST DEPLOYMENT
  // add proposer
  const PROPOSER_ROLE = ethers.utils.keccak256(
    ethers.utils.toUtf8Bytes("PROPOSER_ROLE")
  );
  await contractUDAOTimelockController.grantRole(
    PROPOSER_ROLE,
    contractUDAOGovernor.address
  );

  const EXECUTOR_ROLE = ethers.utils.keccak256(
    ethers.utils.toUtf8Bytes("EXECUTOR_ROLE")
  );
  // @dev Setting the zero address as the executor role will allow anyone to execute the proposal
  await contractUDAOTimelockController.grantRole(
    EXECUTOR_ROLE,
    // zero address
    "0x0000000000000000000000000000000000000000"
  );

  // grant roles
  const BACKEND_ROLE = ethers.utils.keccak256(
    ethers.utils.toUtf8Bytes("BACKEND_ROLE")
  );
  await contractRoleManager.grantRole(BACKEND_ROLE, backend.address);
  const FOUNDATION_ROLE = ethers.utils.keccak256(
    ethers.utils.toUtf8Bytes("FOUNDATION_ROLE")
  );

  await contractRoleManager.grantRole(FOUNDATION_ROLE, foundation.address);
  const STAKING_CONTRACT = ethers.utils.keccak256(
    ethers.utils.toUtf8Bytes("STAKING_CONTRACT")
  );
  await contractRoleManager.grantRole(
    STAKING_CONTRACT,
    contractUDAOStaker.address
  );
  const TREASURY_CONTRACT = ethers.utils.keccak256(
    ethers.utils.toUtf8Bytes("TREASURY_CONTRACT")
  );
  await contractRoleManager.grantRole(
    TREASURY_CONTRACT,
    contractPlatformTreasury.address
  );
  const GOVERNANCE_ROLE = ethers.utils.keccak256(
    ethers.utils.toUtf8Bytes("GOVERNANCE_ROLE")
  );
  const GOVERNANCE_CONTRACT = ethers.utils.keccak256(
    ethers.utils.toUtf8Bytes("GOVERNANCE_CONTRACT")
  );
  await contractRoleManager.grantRole(
    GOVERNANCE_ROLE,
    contractUDAOTimelockController.address
  );
  await contractRoleManager.grantRole(
    GOVERNANCE_ROLE,
    governanceMember.address
  );

  // TODO IS THIS NECESSARY?
  await contractRoleManager.grantRole(
    GOVERNANCE_CONTRACT,
    contractUDAOGovernor.address
  );

  const VALIDATION_MANAGER = ethers.utils.keccak256(
    ethers.utils.toUtf8Bytes("VALIDATION_MANAGER")
  );
  await contractRoleManager.grantRole(
    VALIDATION_MANAGER,
    contractValidationManager.address
  );

  const VALIDATOR_ROLE = ethers.utils.keccak256(
    ethers.utils.toUtf8Bytes("VALIDATOR_ROLE")
  );
  await contractRoleManager.grantRole(VALIDATOR_ROLE, validator1.address);
  await contractRoleManager.grantRole(VALIDATOR_ROLE, validator2.address);
  await contractRoleManager.grantRole(VALIDATOR_ROLE, validator3.address);
  await contractRoleManager.grantRole(VALIDATOR_ROLE, validator4.address);
  await contractRoleManager.grantRole(VALIDATOR_ROLE, validator5.address);

  const DEFAULT_ADMIN_ROLE = ethers.utils.keccak256(
    ethers.utils.toUtf8Bytes("DEFAULT_ADMIN_ROLE")
  );
  await contractRoleManager.grantRole(DEFAULT_ADMIN_ROLE, foundation.address);
  await contractRoleManager.grantRole(
    DEFAULT_ADMIN_ROLE,
    contractUDAOTimelockController.address
  );

  const JUROR_ROLE = ethers.utils.keccak256(
    ethers.utils.toUtf8Bytes("JUROR_ROLE")
  );
  await contractRoleManager.grantRole(JUROR_ROLE, jurorMember1.address);
  await contractRoleManager.grantRole(JUROR_ROLE, jurorMember2.address);
  await contractRoleManager.grantRole(JUROR_ROLE, jurorMember3.address);
  await contractRoleManager.grantRole(JUROR_ROLE, jurorMember4.address);
  // add missing contract addresses to the contract manager
  await contractContractManager
    .connect(backend)
    .setAddressStaking(contractUDAOStaker.address);
  await contractContractManager
    .connect(backend)
    .setPlatformTreasuryAddress(contractPlatformTreasury.address);
  await contractContractManager
    .connect(backend)
    .setAddressUdaoVp(contractUDAOVp.address);
  // add staking contract to udao-vp
  await contractUDAOVp.connect(backend).updateAddresses();

  return {
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
    GOVERNANCE_ROLE,
    BACKEND_ROLE,
  };
}

describe("Juror Manager", function () {
  it("Should deploy", async function () {
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
    } = await deploy();
  });

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
    } = await deploy();

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
    } = await deploy();

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
    } = await deploy();

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
    } = await deploy();

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
    } = await deploy();

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
    } = await deploy();

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
    } = await deploy();

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
    await contractJurorManager
      .connect(jurorMember1)
      .sendDisputeResult(disputeId, disputeResultOfJurorMember1);
    await contractJurorManager
      .connect(jurorMember2)
      .sendDisputeResult(disputeId, disputeResultOfJurorMember2);
    await contractJurorManager
      .connect(jurorMember3)
      .sendDisputeResult(disputeId, disputeResultOfJurorMember3);
    /// @dev Finalize dispute
    const disputeVerdict = true;
    await expect(contractJurorManager.connect(backend).finalizeDispute(1))
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
    } = await deploy();

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
    await contractJurorManager
      .connect(jurorMember1)
      .sendDisputeResult(disputeId, disputeResultOfJurorMember1);
    await contractJurorManager
      .connect(jurorMember2)
      .sendDisputeResult(disputeId, disputeResultOfJurorMember2);
    await contractJurorManager
      .connect(jurorMember3)
      .sendDisputeResult(disputeId, disputeResultOfJurorMember3);
    /// @dev Finalize dispute
    const disputeVerdict = false;
    await expect(
      contractJurorManager.connect(backend).finalizeDispute(disputeId)
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
    } = await deploy();

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
    await contractJurorManager
      .connect(jurorMember1)
      .sendDisputeResult(disputeId, disputeResultOfJurorMember1);
    await contractJurorManager
      .connect(jurorMember2)
      .sendDisputeResult(disputeId, disputeResultOfJurorMember2);
    await contractJurorManager
      .connect(jurorMember3)
      .sendDisputeResult(disputeId, disputeResultOfJurorMember3);
    /// @dev Finalize dispute
    const disputeVerdict = true;
    await expect(
      contractJurorManager.connect(backend).finalizeDispute(disputeId)
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
    } = await deploy();

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
    await contractJurorManager
      .connect(jurorMember1)
      .sendDisputeResult(disputeId, disputeResultOfJurorMember1);
    await contractJurorManager
      .connect(jurorMember2)
      .sendDisputeResult(disputeId, disputeResultOfJurorMember2);
    await contractJurorManager
      .connect(jurorMember3)
      .sendDisputeResult(disputeId, disputeResultOfJurorMember3);
    /// @dev Finalize dispute
    const disputeVerdict = false;
    await expect(
      contractJurorManager.connect(backend).finalizeDispute(disputeId)
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
    } = await deploy();

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
    await contractJurorManager
      .connect(jurorMember1)
      .sendDisputeResult(disputeId, disputeResultOfJurorMember1);
    await contractJurorManager
      .connect(jurorMember2)
      .sendDisputeResult(disputeId, disputeResultOfJurorMember2);
    await contractJurorManager
      .connect(jurorMember3)
      .sendDisputeResult(disputeId, disputeResultOfJurorMember3);
    /// @dev Finalize dispute
    const disputeVerdict = false;
    await expect(
      contractJurorManager.connect(backend).finalizeDispute(disputeId)
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
    } = await deploy();

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
    await contractJurorManager
      .connect(jurorMember1)
      .sendDisputeResult(disputeId, disputeResultOfJurorMember1);
    await contractJurorManager
      .connect(jurorMember2)
      .sendDisputeResult(disputeId, disputeResultOfJurorMember2);
    await contractJurorManager
      .connect(jurorMember3)
      .sendDisputeResult(disputeId, disputeResultOfJurorMember3);
    /// @dev Finalize dispute
    const disputeVerdict = false;
    await expect(
      contractJurorManager.connect(backend).finalizeDispute(disputeId)
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
    await contractJurorManager
      .connect(jurorMember1)
      .sendDisputeResult(disputeId2, disputeResultOfJurorMember1_2);
    await contractJurorManager
      .connect(jurorMember2)
      .sendDisputeResult(disputeId2, disputeResultOfJurorMember2_2);
    await contractJurorManager
      .connect(jurorMember3)
      .sendDisputeResult(disputeId2, disputeResultOfJurorMember3_2);
    /// @dev Finalize dispute
    const disputeVerdict2 = false;
    await expect(
      contractJurorManager.connect(backend).finalizeDispute(disputeId2)
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
    } = await deploy();

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
    await contractJurorManager
      .connect(jurorMember1)
      .sendDisputeResult(disputeId, disputeResultOfJurorMember1);
    await contractJurorManager
      .connect(jurorMember2)
      .sendDisputeResult(disputeId, disputeResultOfJurorMember2);
    await contractJurorManager
      .connect(jurorMember3)
      .sendDisputeResult(disputeId, disputeResultOfJurorMember3);
    /// @dev Finalize dispute
    const disputeVerdict = false;
    await expect(
      contractJurorManager.connect(backend).finalizeDispute(disputeId)
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
    } = await deploy();

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
});
