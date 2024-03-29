const hardhat = require("hardhat");
const { ethers } = hardhat;
const helpers = require("@nomicfoundation/hardhat-network-helpers");
const { LazyRole } = require("../lib/LazyRole");

const { WMATIC_ABI, NonFunbiblePositionABI, NonFunbiblePositionAddress, WMATICAddress } = require("../lib/abis");

async function grantValidatorRole(account, contractRoleManager, contractUDAO, contractUDAOStaker, backend) {
  await contractRoleManager.setKYC(account.address, true);
  await contractUDAO.transfer(account.address, ethers.utils.parseEther("100.0"));
  await contractUDAO.connect(account).approve(contractUDAOStaker.address, ethers.utils.parseEther("999999999999.0"));

  // Staking
  await contractUDAOStaker.connect(account).stakeForGovernance(ethers.utils.parseEther("10"), 30);
  await contractUDAOStaker.connect(account).applyForValidator();
  const lazyRole = new LazyRole({
    contract: contractUDAOStaker,
    signer: backend,
  });
  const role_voucher = await lazyRole.createVoucher(account.address, Date.now() + 999999999, 0);
  await contractUDAOStaker.connect(account).getApproved(role_voucher);
}

async function grantJurorRole(account, contractRoleManager, contractUDAO, contractUDAOStaker, backend) {
  await contractRoleManager.setKYC(account.address, true);
  await contractUDAO.transfer(account.address, ethers.utils.parseEther("100.0"));

  await contractUDAO.connect(account).approve(contractUDAOStaker.address, ethers.utils.parseEther("999999999999.0"));

  // Staking

  await contractUDAOStaker.connect(account).stakeForGovernance(ethers.utils.parseEther("10"), 30);
  await contractUDAOStaker.connect(account).applyForJuror();
  const lazyRole = new LazyRole({
    contract: contractUDAOStaker,
    signer: backend,
  });
  const role_voucher = await lazyRole.createVoucher(account.address, Date.now() + 999999999, 1);
  await contractUDAOStaker.connect(account).getApproved(role_voucher);
}

async function deploy(isDexRequired = false) {
  if (isDexRequired) {
    console.log("Forking mainnet");
    helpers.reset("https://polygon-mainnet.g.alchemy.com/v2/OsNaN43nxvV85Kk1JpU-a5qduFwjcIGJ", 40691400);
  }

  const [
    backend,
    account1,
    account2,
    account3,
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
  ] = await ethers.getSigners();

  // FACTORIES
  let factoryRoleManager = await ethers.getContractFactory("RoleManager");

  let factoryUDAOVp = await ethers.getContractFactory("UDAOVp");

  let factoryUDAOTimelockController = await ethers.getContractFactory("UDAOTimelockController");

  let factoryUDAOCertificate = await ethers.getContractFactory("UDAOCertificate");

  let factoryUDAO = await ethers.getContractFactory("UDAO");

  let factoryUDAOStaker = await ethers.getContractFactory("UDAOStaker");

  let factorySupervision = await ethers.getContractFactory("Supervision");

  let factoryUDAOContent = await ethers.getContractFactory("UDAOContent");
  let factoryPlatformTreasury = await ethers.getContractFactory("PlatformTreasury");
  let factoryUDAOGovernor = await ethers.getContractFactory("UDAOGovernor");
  let factoryContractManager = await ethers.getContractFactory("ContractManager");

  //DEPLOYMENTS
  // TODO UDAO TOKEN DEPLOYMENT CONTAINS DUMMY ADDRESS!!!!!!!!!!!!!!!!!!!!!
  const contractUDAO = await factoryUDAO.deploy("0x1F98431c8aD98523631AE4a59f267346ea31F984");

  // Deploys PriceGetter
  if (isDexRequired) {
    const positionManager = await ethers.getContractAt(NonFunbiblePositionABI, "0xC36442b4a4522E871399CD717aBDD847Ab11FE88");
    await helpers.setBalance(backend.address, ethers.utils.parseEther("1000000.0"));
    const WMATIC = await ethers.getContractAt(WMATIC_ABI, WMATICAddress);
    await WMATIC.connect(backend).deposit({
      value: ethers.utils.parseEther("1000.0"),
    });

    // call approve for tokens before adding a new pool

    await WMATIC.connect(backend).approve(positionManager.address, ethers.utils.parseEther("99999999.0"));

    await contractUDAO.connect(backend).approve(positionManager.address, ethers.utils.parseEther("9999999.0"));

    const tx = await positionManager
      .connect(backend)
      .createAndInitializePoolIfNecessary(WMATIC.address, contractUDAO.address, "3000", "250541420775534450580036817218");
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

  const contractUDAOCertificate = await factoryUDAOCertificate.deploy(contractRoleManager.address);
  const contractUDAOContent = await factoryUDAOContent.deploy(contractRoleManager.address);
  const contractSupervision = await factorySupervision.deploy(contractRoleManager.address, contractUDAOContent.address);

  const contractContractManager = await factoryContractManager.deploy(
    contractSupervision.address,
    contractUDAO.address,
    contractUDAOContent.address,
    contractRoleManager.address
  );

  const contractUDAOVp = await factoryUDAOVp.deploy(contractRoleManager.address, contractContractManager.address);
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

  const contractUDAOTimelockController = await factoryUDAOTimelockController.deploy(1, [], [foundation.address]);
  const contractUDAOGovernor = await factoryUDAOGovernor.deploy(
    contractUDAOVp.address,
    contractUDAOTimelockController.address,
    contractUDAOStaker.address,
    contractRoleManager.address
  );

  const CANCELLER_ROLE = await contractUDAOTimelockController.CANCELLER_ROLE();
  await contractUDAOTimelockController.grantRole(CANCELLER_ROLE, foundation.address);
  //POST DEPLOYMENT
  // add proposer
  const PROPOSER_ROLE = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("PROPOSER_ROLE"));
  await contractUDAOTimelockController.grantRole(PROPOSER_ROLE, contractUDAOGovernor.address);

  const EXECUTOR_ROLE = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("EXECUTOR_ROLE"));
  // @dev Setting the zero address as the executor role will allow anyone to execute the proposal
  await contractUDAOTimelockController.grantRole(
    EXECUTOR_ROLE,
    // zero address
    "0x0000000000000000000000000000000000000000"
  );

  // grant roles
  const BACKEND_ROLE = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("BACKEND_ROLE"));

  //await contractRoleManager.grantRole(RO_ROLE, contractRoleManager.address);

  await contractRoleManager.grantRole(BACKEND_ROLE, backend.address);
  const FOUNDATION_ROLE = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("FOUNDATION_ROLE"));

  await contractRoleManager.grantRole(FOUNDATION_ROLE, foundation.address);
  const STAKING_CONTRACT = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("STAKING_CONTRACT"));
  await contractRoleManager.grantRole(STAKING_CONTRACT, contractUDAOStaker.address);
  const TREASURY_CONTRACT = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("TREASURY_CONTRACT"));
  await contractRoleManager.grantRole(TREASURY_CONTRACT, contractPlatformTreasury.address);
  const GOVERNANCE_ROLE = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("GOVERNANCE_ROLE"));
  const GOVERNANCE_CONTRACT = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("GOVERNANCE_CONTRACT"));
  await contractRoleManager.grantRole(GOVERNANCE_ROLE, contractUDAOTimelockController.address);
  await contractRoleManager.grantRole(GOVERNANCE_ROLE, governanceMember.address);

  // TODO IS THIS NECESSARY?
  await contractRoleManager.grantRole(GOVERNANCE_CONTRACT, contractUDAOGovernor.address);

  const VALIDATOR_ROLE = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("VALIDATOR_ROLE"));

  const DEFAULT_ADMIN_ROLE = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("DEFAULT_ADMIN_ROLE"));
  await contractRoleManager.grantRole(DEFAULT_ADMIN_ROLE, foundation.address);
  await contractRoleManager.grantRole(DEFAULT_ADMIN_ROLE, contractUDAOTimelockController.address);

  const JUROR_ROLE = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("JUROR_ROLE"));

  const SUPERVISION_CONTRACT = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("SUPERVISION_CONTRACT"));
  await contractRoleManager.grantRole(SUPERVISION_CONTRACT, contractSupervision.address);

  const UDAOC_CONTRACT = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("UDAOC_CONTRACT"));
  await contractRoleManager.grantRole(UDAOC_CONTRACT, contractUDAOContent.address);

  // add missing contract addresses to the contract manager
  await contractContractManager.connect(backend).setAddressStaking(contractUDAOStaker.address);
  await contractContractManager.connect(backend).setPlatformTreasuryAddress(contractPlatformTreasury.address);
  await contractContractManager.connect(backend).setAddressUdaoVp(contractUDAOVp.address);
  await contractSupervision.connect(backend).setAddressStaking(contractUDAOStaker.address);

  await contractSupervision.connect(backend).setPlatformTreasury(contractPlatformTreasury.address);
  await contractSupervision.connect(backend).setContractManager(contractContractManager.address);
  await contractUDAOContent.connect(backend).setContractManager(contractContractManager.address);
  await contractRoleManager.connect(backend).setContractManager(contractContractManager.address);
  // add staking contract to udao-vp
  await contractUDAOVp.connect(backend).updateAddresses();
  await contractUDAOContent.connect(backend).updateAddresses();
  await contractRoleManager.connect(backend).updateAddresses();
  // Assign validator roles
  await contractRoleManager.grantRole(VALIDATOR_ROLE, validator.address);
  await contractRoleManager.grantRole(VALIDATOR_ROLE, validator1.address);
  await contractRoleManager.grantRole(VALIDATOR_ROLE, validator2.address);
  await contractRoleManager.grantRole(VALIDATOR_ROLE, validator3.address);
  await contractRoleManager.grantRole(VALIDATOR_ROLE, validator4.address);
  await contractRoleManager.grantRole(VALIDATOR_ROLE, validator5.address);
  // Assign Juror roles
  await contractRoleManager.grantRole(JUROR_ROLE, jurorMember.address);
  await contractRoleManager.grantRole(JUROR_ROLE, jurorMember1.address);
  await contractRoleManager.grantRole(JUROR_ROLE, jurorMember2.address);
  await contractRoleManager.grantRole(JUROR_ROLE, jurorMember3.address);
  await contractRoleManager.grantRole(JUROR_ROLE, jurorMember4.address);
  // Assign validator roles
  //await grantValidatorRole(
  //  validator,
  //  contractRoleManager,
  //  contractUDAO,
  //  contractUDAOStaker,
  //  backend
  //);
  /*
  await grantValidatorRole(
    validator1,
    contractRoleManager,
    contractUDAO,
    contractUDAOStaker,
    backend
  );
  await grantValidatorRole(
    validator2,
    contractRoleManager,
    contractUDAO,
    contractUDAOStaker,
    backend
  );
  await grantValidatorRole(
    validator3,
    contractRoleManager,
    contractUDAO,
    contractUDAOStaker,
    backend
  );
  await grantValidatorRole(
    validator4,
    contractRoleManager,
    contractUDAO,
    contractUDAOStaker,
    backend
  );
  await grantValidatorRole(
    validator5,
    contractRoleManager,
    contractUDAO,
    contractUDAOStaker,
    backend
  );

  // Assign Juror roles
  await grantJurorRole(
    jurorMember,
    contractRoleManager,
    contractUDAO,
    contractUDAOStaker,
    backend
  );
  await grantJurorRole(
    jurorMember1,
    contractRoleManager,
    contractUDAO,
    contractUDAOStaker,
    backend
  );
  await grantJurorRole(
    jurorMember2,
    contractRoleManager,
    contractUDAO,
    contractUDAOStaker,
    backend
  );
  await grantJurorRole(
    jurorMember3,
    contractRoleManager,
    contractUDAO,
    contractUDAOStaker,
    backend
  );
  await grantJurorRole(
    jurorMember4,
    contractRoleManager,
    contractUDAO,
    contractUDAOStaker,
    backend
  );
    */
  return {
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
  };
}

module.exports = {
  deploy,
};
