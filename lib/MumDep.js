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

async function main(isDexRequired = false) {
  
  const [
    deneme,
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
    dadada,
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

    
  let foundation;
  let backend;
  
  // Check if --network environment variable is set to localhost or hardhat
  if (process.env.network == "localhost" && process.env.network  == "hardhat") {
    console.log("Deploying to local/hardhat test network")
    backend = new ethers.Wallet("0ecbb4aa5a7ab07b88076b9a92b809b54fb82f664599965616a0ebb399584b24", ethers.provider);
    foundation = new ethers.Wallet("c65a58d97cfc1a35f67fba197655b9df253ffddbdf31d9cc18ec1447cb454818", ethers.provider);
    // Send 1000 ETH to backend wallet
    await helpers.setBalance(backend.address, ethers.utils.parseEther("1000.0"));
    // Send 1000 ETH to foundation wallet
    await helpers.setBalance(foundation.address, ethers.utils.parseEther("1000.0"));
    console.log("backend.address: ", backend.address);
    console.log("foundation.address: ", foundation.address);

  }else{
    console.log("Deploying to mumbai testnet")
    backend = new ethers.Wallet("0ecbb4aa5a7ab07b88076b9a92b809b54fb82f664599965616a0ebb399584b24", ethers.provider);
    foundation = new ethers.Wallet("c65a58d97cfc1a35f67fba197655b9df253ffddbdf31d9cc18ec1447cb454818", ethers.provider);
  }


  
  // Private key of backend wallet: 0ecbb4aa5a7ab07b88076b9a92b809b54fb82f664599965616a0ebb399584b24
  // Replace backend wallet with the one you want to use
  
  //console.log(backend)
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
  let factoryVoucherVerifier = await ethers.getContractFactory("VoucherVerifier");
  let factoryGovernanceTreasury = await ethers.getContractFactory("GovernanceTreasury");

  //DEPLOYMENTS
  // TODO UDAO TOKEN DEPLOYMENT CONTAINS DUMMY ADDRESS!!!!!!!!!!!!!!!!!!!!!
  const contractUDAO = await factoryUDAO.deploy();
  // wait for the contract to be deployed
  await contractUDAO.deployed();
  console.log("contractUDAO.address: ", contractUDAO.address);
  const contractRoleManager = await factoryRoleManager.deploy();
  // wait for the contract to be deployed
  await contractRoleManager.deployed();
  console.log("contractRoleManager.address: ", contractRoleManager.address);

  //await helpers.setBalance(backend.address, ethers.utils.parseEther("1000000.0"));

  const contractUDAOCertificate = await factoryUDAOCertificate.deploy(contractRoleManager.address);
  // wait for the contract to be deployed
  await contractUDAOCertificate.deployed();
  console.log("contractUDAOCertificate.address: ", contractUDAOCertificate.address);
  const contractUDAOContent = await factoryUDAOContent.deploy(contractRoleManager.address);
  // wait for the contract to be deployed
  await contractUDAOContent.deployed();
  console.log("contractUDAOContent.address: ", contractUDAOContent.address);
  const contractSupervision = await factorySupervision.deploy(contractRoleManager.address, contractUDAOContent.address);
  // wait for the contract to be deployed
  await contractSupervision.deployed();
  console.log("contractSupervision.address: ", contractSupervision.address);

  const contractContractManager = await factoryContractManager.deploy(
    contractSupervision.address,
    contractUDAO.address,
    contractUDAOContent.address,
    contractRoleManager.address
  );
  // wait for the contract to be deployed
  await contractContractManager.deployed();
  console.log("contractContractManager.address: ", contractContractManager.address);

  const contractUDAOVp = await factoryUDAOVp.deploy(contractRoleManager.address, contractContractManager.address);
  // wait for the contract to be deployed
  await contractUDAOVp.deployed();
  console.log("contractUDAOVp.address: ", contractUDAOVp.address);
  const contractVoucherVerifier = await factoryVoucherVerifier.deploy(
    contractRoleManager.address,
    contractRoleManager.address
  );
  // wait for the contract to be deployed
  await contractVoucherVerifier.deployed();
  console.log("contractVoucherVerifier.address: ", contractVoucherVerifier.address);
  const contractGovernanceTreasury = await factoryGovernanceTreasury.deploy();
  // wait for the contract to be deployed
  await contractGovernanceTreasury.deployed();
  console.log("contractGovernanceTreasury.address: ", contractGovernanceTreasury.address);

  const contractPlatformTreasury = await factoryPlatformTreasury.deploy(
    contractRoleManager.address,
    contractUDAO.address,
    contractUDAOContent.address,
    contractGovernanceTreasury.address,
    contractVoucherVerifier.address
  );
  // wait for the contract to be deployed
  await contractPlatformTreasury.deployed();
  console.log("contractPlatformTreasury.address: ", contractPlatformTreasury.address);
  /*
  const contractUDAOStaker = await factoryUDAOStaker.deploy(
    contractPlatformTreasury.address,
    contractRoleManager.address,
    contractUDAOVp.address,
    contractContractManager.address
  );
  // wait for the contract to be deployed
  await contractUDAOStaker.deployed();
  console.log("contractUDAOStaker.address: ", contractUDAOStaker.address);

  const contractUDAOTimelockController = await factoryUDAOTimelockController.deploy(1, [], [foundation.address]);
  // wait for the contract to be deployed
  await contractUDAOTimelockController.deployed();
  console.log("contractUDAOTimelockController.address: ", contractUDAOTimelockController.address);
  const contractUDAOGovernor = await factoryUDAOGovernor.deploy(
    contractUDAOVp.address,
    contractUDAOTimelockController.address,
    contractUDAOStaker.address,
    contractRoleManager.address
  );
  // wait for the contract to be deployed
  await contractUDAOGovernor.deployed();
  console.log("contractUDAOGovernor.address: ", contractUDAOGovernor.address);

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
    */
  // grant roles
  const BACKEND_ROLE = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("BACKEND_ROLE"));
  const VOUCHER_VERIFIER = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("VOUCHER_VERIFIER"));
  const SALE_CONTROLLER = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("SALE_CONTROLLER"));

  //await contractRoleManager.grantRole(RO_ROLE, contractRoleManager.address);
  console.log("Granting BACKEND_ROLE to backend.address: ", backend.address)
  tx = await contractRoleManager.grantRole(BACKEND_ROLE, backend.address);
  // wait for transaction to be mined
  await tx.wait();
  console.log("Granting VOUCHER_VERIFIER to backend.address: ", backend.address)
  tx = await contractRoleManager.grantRole(VOUCHER_VERIFIER, backend.address);
  await tx.wait();
  console.log("Granting SALE_CONTROLLER to backend.address: ", backend.address)
  tx = await contractRoleManager.grantRole(SALE_CONTROLLER, backend.address);
  await tx.wait();
  const FOUNDATION_ROLE = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("FOUNDATION_ROLE"));
  console.log("Granting FOUNDATION_ROLE to foundation.address: ", foundation.address)
  tx = await contractRoleManager.grantRole(FOUNDATION_ROLE, foundation.address);
  await tx.wait();
  const STAKING_CONTRACT = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("STAKING_CONTRACT"));
  //await contractRoleManager.grantRole(STAKING_CONTRACT, contractUDAOStaker.address);
  const TREASURY_CONTRACT = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("TREASURY_CONTRACT"));
  console.log("Granting TREASURY_CONTRACT to contractPlatformTreasury.address: ", contractPlatformTreasury.address)
  tx = await contractRoleManager.grantRole(TREASURY_CONTRACT, contractPlatformTreasury.address);
  const GOVERNANCE_ROLE = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("GOVERNANCE_ROLE"));
  await tx.wait();
  const GOVERNANCE_CONTRACT = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("GOVERNANCE_CONTRACT"));
  //await contractRoleManager.grantRole(GOVERNANCE_ROLE, contractUDAOTimelockController.address);
  //await contractRoleManager.grantRole(GOVERNANCE_ROLE, governanceMember.address);

  // TODO IS THIS NECESSARY?
  //await contractRoleManager.grantRole(GOVERNANCE_CONTRACT, contractUDAOGovernor.address);

  const VALIDATOR_ROLE = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("VALIDATOR_ROLE"));

  const DEFAULT_ADMIN_ROLE = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("DEFAULT_ADMIN_ROLE"));
  console.log("Granting DEFAULT_ADMIN_ROLE in role manager to foundation.address: ", foundation.address)
  tx = await contractRoleManager.grantRole(DEFAULT_ADMIN_ROLE, foundation.address);
  await tx.wait();
  //await contractRoleManager.grantRole(DEFAULT_ADMIN_ROLE, contractUDAOTimelockController.address);

  const JUROR_ROLE = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("JUROR_ROLE"));

  const SUPERVISION_CONTRACT = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("SUPERVISION_CONTRACT"));
  console.log("Granting SUPERVISION_CONTRACT to contractSupervision.address: ", contractSupervision.address)
  tx = await contractRoleManager.grantRole(SUPERVISION_CONTRACT, contractSupervision.address);
  await tx.wait();

  const UDAOC_CONTRACT = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("UDAOC_CONTRACT"));
  console.log("Granting UDAOC_CONTRACT to contractUDAOContent.address: ", contractUDAOContent.address)
  tx = await contractRoleManager.grantRole(UDAOC_CONTRACT, contractUDAOContent.address);
  await tx.wait();

  // add missing contract addresses to the contract manager
  //await contractContractManager.connect(backend).setAddressStaking(contractUDAOStaker.address);
  tx = await contractContractManager.connect(backend).setPlatformTreasuryAddress(contractPlatformTreasury.address);
  await tx.wait();
  tx = await contractContractManager.connect(backend).setAddressUdaoVp(contractUDAOVp.address);
  await tx.wait();
  //await contractSupervision.connect(backend).setAddressStaking(contractUDAOStaker.address);

  tx = await contractSupervision.connect(backend).setPlatformTreasury(contractPlatformTreasury.address);
  await tx.wait();
  tx = await contractSupervision.connect(backend).setContractManager(contractContractManager.address);
  await tx.wait();
  tx = await contractUDAOContent.connect(backend).setContractManager(contractContractManager.address);
  await tx.wait();
  tx = await contractRoleManager.connect(backend).setContractManager(contractContractManager.address);
  await tx.wait();
  // add staking contract to udao-vp
  tx = await contractUDAOVp.connect(backend).updateAddresses();
  await tx.wait();
  tx = await contractUDAOContent.connect(backend).updateAddresses();
  await tx.wait();
  tx = await contractRoleManager.connect(backend).updateAddresses();
  await tx.wait();
  
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
  

  /*
  Deploy Order:
  //MVP:         DummySupervision.sol
//             GovernanceTreasury.sol
//             RoleManager.sol
//             UDAO.sol
//             UDAOC.sol
//             UDAO-Cert.sol
//             VoucherVerifier.sol
//             BasePlatform.sol - ContentManager.sol - PlatformTreasury.sol
//             ContractManager.sol
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
    contractVoucherVerifier,
    contractPlatformTreasury,
    contractUDAOVp,
    //contractUDAOStaker,
    //contractUDAOTimelockController,
    //contractUDAOGovernor,
    GOVERNANCE_ROLE,
    BACKEND_ROLE,
    contractContractManager,
    account1,
    account2,
    account3,
  };
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
});




