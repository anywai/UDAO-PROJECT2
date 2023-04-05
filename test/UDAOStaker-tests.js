const { expect } = require("chai");
const hardhat = require("hardhat");
const { ethers } = hardhat;
const chai = require("chai");
const BN = require("bn.js");
const { LazyRole } = require("../lib/LazyRole");
const helpers = require("@nomicfoundation/hardhat-network-helpers");

const {
  WMATIC_ABI,
  NonFunbiblePositionABI,
  NonFunbiblePositionAddress,
  WMATICAddress,
} = require("../lib/abis");

// Enable and inject BN dependency
chai.use(require("chai-bn")(BN));

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
    validator,
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

  let factoryPriceGetter = await ethers.getContractFactory("PriceGetter");
  

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

  let factoryJurorManager = await ethers.getContractFactory("JurorManager");
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
  await contractRoleManager.grantRole(
    VALIDATION_MANAGER,
    contractValidationManager.address
  );
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
    validator,
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

describe("UDAOStaker Contract", function () {
  it("Should deploy", async function () {
    const {
      backend,
      validatorCandidate,
      validator,
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

  it("Should set super validator lock amount", async function () {
    const {
      backend,
      validatorCandidate,
      validator,
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

    await expect(
      contractUDAOStaker.connect(foundation).setValidatorLockAmount("100")
    )
      .to.emit(contractUDAOStaker, "SetValidatorLockAmount") // transfer from null address to minter
      .withArgs("100");

    expect(await contractUDAOStaker.validatorLockAmount()).to.eql(
      ethers.BigNumber.from("100")
    );
  });

  it("Should set super vote reward amount", async function () {
    const {
      backend,
      validatorCandidate,
      validator,
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

    await expect(contractUDAOStaker.connect(foundation).setVoteReward("100"))
      .to.emit(contractUDAOStaker, "SetVoteReward") // transfer from null address to minter
      .withArgs("100");

    expect(await contractUDAOStaker.voteReward()).to.eql(
      ethers.BigNumber.from("100")
    );
  });

  it("Should set a new platform treasury address", async function () {
    const {
      backend,
      validatorCandidate,
      validator,
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

    await expect(
      contractUDAOStaker
        .connect(foundation)
        .setPlatformTreasuryAddress(foundation.address)
    )
      .to.emit(contractUDAOStaker, "SetPlatformTreasuryAddress") // transfer from null address to minter
      .withArgs(foundation.address);

    expect(await contractUDAOStaker.platformTreasuryAddress()).to.eql(
      foundation.address
    );
  });

  it("Should stake to be a governance member", async function () {
    const {
      backend,
      validatorCandidate,
      validator,
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

    await contractRoleManager.setKYC(governanceCandidate.address, true);

    await contractUDAO.transfer(
      governanceCandidate.address,
      ethers.utils.parseEther("100.0")
    );

    await contractUDAO
      .connect(governanceCandidate)
      .approve(
        contractUDAOStaker.address,
        ethers.utils.parseEther("999999999999.0")
      );

    // Generate governance stake voucher
    const staking_voucher = [
      validatorCandidate.address,
      ethers.utils.parseEther("10"),
      30,
    ];

    await expect(
      contractUDAOStaker
        .connect(governanceCandidate)
        .stakeForGovernance(staking_voucher)
    )
      .to.emit(contractUDAOStaker, "GovernanceStake") // transfer from null address to minter
      .withArgs(
        governanceCandidate.address,
        ethers.utils.parseEther("10"),
        ethers.utils.parseEther("300")
      );
  });

  it("Should apply for validator", async function () {
    const {
      backend,
      validatorCandidate,
      validator,
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
    await contractRoleManager.setKYC(validatorCandidate.address, true);

    await contractUDAO.transfer(
      validatorCandidate.address,
      ethers.utils.parseEther("10000.0")
    );

    await contractUDAO
      .connect(validatorCandidate)
      .approve(
        contractUDAOStaker.address,
        ethers.utils.parseEther("999999999999.0")
      );

    // Generate governance stake voucher
    const staking_voucher = [
      validatorCandidate.address,
      ethers.utils.parseEther("10"),
      30,
    ];

    await expect(
      contractUDAOStaker
        .connect(validatorCandidate)
        .stakeForGovernance(staking_voucher)
    )
      .to.emit(contractUDAOStaker, "GovernanceStake") // transfer from null address to minter
      .withArgs(
        validatorCandidate.address,
        ethers.utils.parseEther("10"),
        ethers.utils.parseEther("300")
      );
    await expect(
      contractUDAOStaker.connect(validatorCandidate).applyForValidator()
    )
      .to.emit(contractUDAOStaker, "RoleApplied") // transfer from null address to minter
      .withArgs(0, validatorCandidate.address, ethers.utils.parseEther("150"));
  });

  it("Should accept for validator", async function () {
    const {
      backend,
      validatorCandidate,
      validator,
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
    await contractRoleManager.setKYC(validatorCandidate.address, true);

    await contractUDAO.transfer(
      validatorCandidate.address,
      ethers.utils.parseEther("10000.0")
    );

    await contractUDAO
      .connect(validatorCandidate)
      .approve(
        contractUDAOStaker.address,
        ethers.utils.parseEther("999999999999.0")
      );

    // Generate governance stake voucher
    const staking_voucher = [
      validatorCandidate.address,
      ethers.utils.parseEther("10"),
      30,
    ];

    // Staking
    await expect(
      contractUDAOStaker
        .connect(validatorCandidate)
        .stakeForGovernance(staking_voucher)
    )
      .to.emit(contractUDAOStaker, "GovernanceStake") // transfer from null address to minter
      .withArgs(
        validatorCandidate.address,
        ethers.utils.parseEther("10"),
        ethers.utils.parseEther("300")
      );
    await expect(
      contractUDAOStaker.connect(validatorCandidate).applyForValidator()
    )
      .to.emit(contractUDAOStaker, "RoleApplied") // transfer from null address to minter
      .withArgs(0, validatorCandidate.address, ethers.utils.parseEther("150"));
    const lazyRole = new LazyRole({
      contract: contractUDAOStaker,
      signer: backend,
    });
    const role_voucher = await lazyRole.createVoucher(
      validatorCandidate.address,
      Date.now() + 999999999,
      0
    );
    await expect(
      contractUDAOStaker.connect(validatorCandidate).getApproved(role_voucher)
    )
      .to.emit(contractUDAOStaker, "RoleApproved") // transfer from null address to minter
      .withArgs(0, validatorCandidate.address);
  });

  it("Should fail to apply for validator if not governance member", async function () {
    const {
      backend,
      validatorCandidate,
      validator,
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
    await contractRoleManager.setKYC(validatorCandidate.address, true);

    await contractUDAO.transfer(
      validatorCandidate.address,
      ethers.utils.parseEther("10000.0")
    );

    await contractUDAO
      .connect(validatorCandidate)
      .approve(
        contractUDAOStaker.address,
        ethers.utils.parseEther("999999999999.0")
      );

    await expect(
      contractUDAOStaker.connect(validatorCandidate).applyForValidator()
    ).to.revertedWith("You have to be governance member to apply");
  });

  it("Should fail to apply for validator if already validator", async function () {
    const {
      backend,
      validatorCandidate,
      validator,
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
    await contractRoleManager.setKYC(validatorCandidate.address, true);

    await contractUDAO.transfer(
      validatorCandidate.address,
      ethers.utils.parseEther("10000.0")
    );

    await contractUDAO
      .connect(validatorCandidate)
      .approve(
        contractUDAOStaker.address,
        ethers.utils.parseEther("999999999999.0")
      );

    // Generate governance stake voucher
    const staking_voucher = [
      validatorCandidate.address,
      ethers.utils.parseEther("10"),
      30,
    ];

    // Staking
    await expect(
      contractUDAOStaker
        .connect(validatorCandidate)
        .stakeForGovernance(staking_voucher)
    )
      .to.emit(contractUDAOStaker, "GovernanceStake") // transfer from null address to minter
      .withArgs(
        validatorCandidate.address,
        ethers.utils.parseEther("10"),
        ethers.utils.parseEther("300")
      );
    await expect(
      contractUDAOStaker.connect(validatorCandidate).applyForValidator()
    )
      .to.emit(contractUDAOStaker, "RoleApplied") // transfer from null address to minter
      .withArgs(0, validatorCandidate.address, ethers.utils.parseEther("150"));
    const lazyRole = new LazyRole({
      contract: contractUDAOStaker,
      signer: backend,
    });
    const role_voucher = await lazyRole.createVoucher(
      validatorCandidate.address,
      Date.now() + 999999999,
      0
    );
    await expect(
      contractUDAOStaker.connect(validatorCandidate).getApproved(role_voucher)
    )
      .to.emit(contractUDAOStaker, "RoleApproved") // transfer from null address to minter
      .withArgs(0, validatorCandidate.address);
    await expect(
      contractUDAOStaker.connect(validatorCandidate).applyForValidator()
    ).to.revertedWith("Address is already a Validator");
  });
});
