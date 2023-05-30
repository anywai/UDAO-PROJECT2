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

async function deploy(isDexRequired = false) {
  if (isDexRequired) {
    helpers.reset(
      "https://polygon-mainnet.g.alchemy.com/v2/OsNaN43nxvV85Kk1JpU-a5qduFwjcIGJ",
      40691400
    );
  }

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
    jurorMember,
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
  if (isDexRequired) {
    const positionManager = await ethers.getContractAt(
      NonFunbiblePositionABI,
      "0xC36442b4a4522E871399CD717aBDD847Ab11FE88"
    );
    await helpers.setBalance(
      backend.address,
      ethers.utils.parseEther("1000000.0")
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

    await helpers.time.increase(2);
    await helpers.time.increase(2);
    await helpers.time.increase(2);
    await helpers.time.increase(2);
    await helpers.time.increase(2);
    await helpers.time.increase(2);
    await helpers.time.increase(2);
    await helpers.time.increase(2);
    await helpers.time.increase(2);
    await helpers.time.increase(2);
    await helpers.time.increase(2);
    await helpers.time.increase(2);
    await helpers.time.increase(2);
    await helpers.time.increase(2);
    await helpers.time.increase(2);

    // Price Getter End
  }
  let factoryPriceGetter = await ethers.getContractFactory("PriceGetter");
  const contractRoleManager = await factoryRoleManager.deploy();
  let contractPriceGetter;
  if (isDexRequired) {
    contractPriceGetter = await factoryPriceGetter.deploy(
      "0x1F98431c8aD98523631AE4a59f267346ea31F984",
      contractUDAO.address,
      "0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270",
      3000,
      contractRoleManager.address
    );
  } else {
    contractPriceGetter = { address: ethers.constants.AddressZero };
  }

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
  const GOVERNANCE_ROLE = ethers.utils.keccak256(
    ethers.utils.toUtf8Bytes("GOVERNANCE_ROLE")
  );
  await contractRoleManager.grantRole(
    GOVERNANCE_ROLE,
    contractUDAOTimelockController.address
  );
  const VALIDATION_MANAGER = ethers.utils.keccak256(
    ethers.utils.toUtf8Bytes("VALIDATION_MANAGER")
  );

  const VALIDATOR_ROLE = ethers.utils.keccak256(
    ethers.utils.toUtf8Bytes("VALIDATOR_ROLE")
  );
  await contractRoleManager.grantRole(
    VALIDATION_MANAGER,
    contractValidationManager.address
  );
  await contractRoleManager.grantRole(VALIDATOR_ROLE, validator1.address);
  await contractRoleManager.grantRole(VALIDATOR_ROLE, validator2.address);
  await contractRoleManager.grantRole(VALIDATOR_ROLE, validator3.address);
  await contractRoleManager.grantRole(VALIDATOR_ROLE, validator4.address);
  await contractRoleManager.grantRole(VALIDATOR_ROLE, validator5.address);

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

  await contractValidationManager
    .connect(backend)
    .setStaker(contractUDAOStaker.address);
  await contractJurorManager
    .connect(backend)
    .setContractManager(contractContractManager.address);
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
  };
}
describe("Validation Manageer Contract", function () {
  it("Should deploy", async function () {
    const {
      backend,
      validatorCandidate,
      validator1,
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
  });

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
      contractValidationManager.connect(backend).createValidation(0, 50)
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
      contractValidationManager.connect(backend).createValidation(0, 50)
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
      contractValidationManager.connect(backend).createValidation(0, 50)
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
      contractValidationManager.connect(backend).createValidation(0, 50)
    ).to.revertedWith("Token owner is banned");
  });
});
