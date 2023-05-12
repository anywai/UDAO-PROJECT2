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
async function checkAccountUDAOVpBalanceAndDelegate(contractUDAOVp, account) {
  const accountBalance = await contractUDAOVp.balanceOf(account.address);
  await expect(accountBalance).to.equal(ethers.utils.parseEther("300"));
  await contractUDAOVp.connect(account).delegate(account.address);
  const accountVotes = await contractUDAOVp.getVotes(account.address);
  await expect(accountVotes).to.equal(ethers.utils.parseEther("300"));
}

async function setupGovernanceMember(contractRoleManager, contractUDAO, contractUDAOStaker, governanceCandidate) {
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
  await expect(
    contractUDAOStaker
      .connect(governanceCandidate)
      .stakeForGovernance(ethers.utils.parseEther("10"),
        30)
  )
    .to.emit(contractUDAOStaker, "GovernanceStake") // transfer from null address to minter
    .withArgs(
      governanceCandidate.address,
      ethers.utils.parseEther("10"),
      ethers.utils.parseEther("300")
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
  const DEFAULT_ADMIN_ROLE = ethers.utils.keccak256(
    ethers.utils.toUtf8Bytes("DEFAULT_ADMIN_ROLE")
  );
  await contractRoleManager.grantRole(DEFAULT_ADMIN_ROLE, foundation.address);
  await contractRoleManager.grantRole(
    DEFAULT_ADMIN_ROLE,
    contractUDAOTimelockController.address
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
    contractJurorManager,
    contractContractManager
  };
}

describe("Contract Manager", function () {
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
        contractJurorManager,
        contractContractManager
      } = await deploy();
    });
    
    it("Should allow backend to set the platform treasury address", async function () {
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
        contractJurorManager,
        contractContractManager
      } = await deploy();
      // @dev Dummy contract address
      const dummyAddress = "0x7D1AfA7B718fb893dB30A3aBc0Cfc608AaCfeBB0";
      await contractContractManager
        .connect(backend)
        .setPlatformTreasuryAddress(dummyAddress);
      expect(
        await contractContractManager.PlatformTreasuryAddress()
      ).to.equal(dummyAddress);
    });
    it("Should allow backend to set the IVM address", async function () {
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
            contractJurorManager,
            contractContractManager
        } = await deploy();
        // @dev Dummy contract address
        const dummyAddress = "0x7D1AfA7B718fb893dB30A3aBc0Cfc608AaCfeBB0";
        await contractContractManager.connect(backend).setAddressIVM(dummyAddress);
        expect(await contractContractManager.IVMAddress()).to.equal(dummyAddress);
    });
    it("Should allow backend to set the staking address", async function () {
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
            contractJurorManager,
            contractContractManager
        } = await deploy();
        // @dev Dummy contract address
        const dummyAddress = "0x7D1AfA7B718fb893dB30A3aBc0Cfc608AaCfeBB0";
        await contractContractManager.connect(backend).setAddressStaking(dummyAddress);
        expect(await contractContractManager.StakingContractAddress()).to.equal(dummyAddress);
    });
    it("Should allow backend to set the UDAO-VP address", async function () {
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
            contractJurorManager,
            contractContractManager
        } = await deploy();
        // @dev Dummy contract address
        const dummyAddress = "0x7D1AfA7B718fb893dB30A3aBc0Cfc608AaCfeBB0";
        await contractContractManager.connect(backend).setAddressUdaoVp(dummyAddress);
        expect(await contractContractManager.UdaoVpAddress()).to.equal(dummyAddress);
    });
    it("Should allow backend to set the IJM address", async function () {
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
            contractJurorManager,
            contractContractManager
        } = await deploy();
        // @dev Dummy contract address
        const dummyAddress = "0x7D1AfA7B718fb893dB30A3aBc0Cfc608AaCfeBB0";
        await contractContractManager.connect(backend).setAddressIJMAddress(dummyAddress);
        expect(await contractContractManager.IJMAddress()).to.equal(dummyAddress);
    });
    it("Should allow backend to set the UDAO address", async function () {
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
            contractJurorManager,
            contractContractManager
        } = await deploy();
        // @dev Dummy contract address
        const dummyAddress = "0x7D1AfA7B718fb893dB30A3aBc0Cfc608AaCfeBB0";
        await contractContractManager.connect(backend).setAddressUdaoAddress(dummyAddress);
        expect(await contractContractManager.UdaoAddress()).to.equal(dummyAddress);
    });
    it("Should allow backend to set the UDAOC address", async function () {
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
            contractJurorManager,
            contractContractManager
        } = await deploy();
        // @dev Dummy contract address
        const dummyAddress = "0x7D1AfA7B718fb893dB30A3aBc0Cfc608AaCfeBB0";
        await contractContractManager.connect(backend).setAddressUdaocAddress(dummyAddress);
        expect(await contractContractManager.UdaocAddress()).to.equal(dummyAddress);
    });
    it("Should allow backend to set the IRM address", async function () {
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
            contractJurorManager,
            contractContractManager
        } = await deploy();
        // @dev Dummy contract address
        const dummyAddress = "0x7D1AfA7B718fb893dB30A3aBc0Cfc608AaCfeBB0";
        await contractContractManager.connect(backend).setAddressIrmAddress(dummyAddress);
        expect(await contractContractManager.IrmAddress()).to.equal(dummyAddress);
    });
    });