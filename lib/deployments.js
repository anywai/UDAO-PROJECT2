const hardhat = require("hardhat");
const { ethers } = hardhat;
const helpers = require("@nomicfoundation/hardhat-network-helpers");

async function deploy(isDexRequired = false) {
  /// @dev define some users and get (wallet) signers for them
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
  let factoryUDAO = await ethers.getContractFactory("UDAO");
  let factoryRoleManager = await ethers.getContractFactory("RoleManager");
  let factoryGovernanceTreasury = await ethers.getContractFactory("GovernanceTreasury");
  let factoryUDAOContent = await ethers.getContractFactory("UDAOContent");
  let factoryUDAOCertificate = await ethers.getContractFactory("UDAOCertificate");
  let factoryVoucherVerifier = await ethers.getContractFactory("VoucherVerifier");
  let factoryPlatformTreasury = await ethers.getContractFactory("PlatformTreasury");
  let factoryContractManager = await ethers.getContractFactory("ContractManager");
  let factorySupervision = await ethers.getContractFactory("DummySupervision");

  // DEPLOYMENTS
  const contractUDAO = await factoryUDAO.deploy();
  const contractRoleManager = await factoryRoleManager.deploy();
  const contractGovernanceTreasury = await factoryGovernanceTreasury.deploy(contractUDAO.address);
  // TODO SUPERVISON UDAO TOKEN DEPLOYMENT CONTAINS DUMMY ADDRESS!!!!!!!!!!!!!!!!!!!!!
  const contractUDAOContent = await factoryUDAOContent.deploy(contractRoleManager.address);
  const contractUDAOCertificate = await factoryUDAOCertificate.deploy(contractRoleManager.address);
  const contractVoucherVerifier = await factoryVoucherVerifier.deploy(contractRoleManager.address);
  const contractPlatformTreasury = await factoryPlatformTreasury.deploy(
    contractRoleManager.address,
    contractUDAO.address,
    contractUDAOContent.address,
    contractGovernanceTreasury.address,
    contractVoucherVerifier.address
  );

  const contractContractManager = await factoryContractManager.deploy(contractRoleManager.address);
  //const contractSupervision = await factorySupervision.deploy(contractRoleManager.address, contractUDAOContent.address);
  const contractSupervision = await factorySupervision.deploy();

  // POST DEPLOYMENT

  // DEFINE ROLES
  const BACKEND_ROLE = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("BACKEND_ROLE"));
  const CONTRACT_MANAGER = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("CONTRACT_MANAGER"));
  const VOUCHER_VERIFIER = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("VOUCHER_VERIFIER"));
  const SALE_CONTROLLER = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("SALE_CONTROLLER"));
  const FOUNDATION_ROLE = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("FOUNDATION_ROLE"));
  const STAKING_CONTRACT = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("STAKING_CONTRACT"));
  const TREASURY_CONTRACT = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("TREASURY_CONTRACT"));
  const GOVERNANCE_ROLE = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("GOVERNANCE_ROLE"));
  const GOVERNANCE_CONTRACT = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("GOVERNANCE_CONTRACT"));
  const VALIDATOR_ROLE = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("VALIDATOR_ROLE"));
  const DEFAULT_ADMIN_ROLE = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("DEFAULT_ADMIN_ROLE"));
  const JUROR_ROLE = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("JUROR_ROLE"));
  const SUPERVISION_CONTRACT = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("SUPERVISION_CONTRACT"));
  const UDAOC_CONTRACT = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("UDAOC_CONTRACT"));
  const CONTENT_PUBLISHER = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("CONTENT_PUBLISHER"));

  // GRANT ROLES
  await contractRoleManager.grantRole(BACKEND_ROLE, backend.address);
  await contractRoleManager.grantRole(CONTENT_PUBLISHER, backend.address);
  await contractRoleManager.grantRole(CONTRACT_MANAGER, contractContractManager.address);
  await contractRoleManager.grantRole(VOUCHER_VERIFIER, backend.address);
  await contractRoleManager.grantRole(SALE_CONTROLLER, backend.address);
  await contractRoleManager.grantRole(FOUNDATION_ROLE, foundation.address);
  await contractRoleManager.grantRole(TREASURY_CONTRACT, contractPlatformTreasury.address);

  await contractRoleManager.grantRole(GOVERNANCE_ROLE, governanceMember.address);
  // TODO IS THIS NECESSARY?
  await contractRoleManager.grantRole(DEFAULT_ADMIN_ROLE, foundation.address);
  await contractRoleManager.grantRole(SUPERVISION_CONTRACT, contractSupervision.address);
  await contractRoleManager.grantRole(UDAOC_CONTRACT, contractUDAOContent.address);

  // UPDATE ADDRESSES IN CONTRACTS
  await contractContractManager
    .connect(backend)
    .setAddresesVersion1Contracts(
      contractUDAO.address,
      contractRoleManager.address,
      contractUDAOContent.address,
      contractUDAOCertificate.address,
      contractVoucherVerifier.address,
      contractPlatformTreasury.address
    );
  await contractContractManager
    .connect(backend)
    .setAddresesCommonInVersion1and2(contractGovernanceTreasury.address, contractSupervision.address);
  await contractContractManager.connect(backend).syncVersion1ContractAddresses();

  // Set foundation address in platform treasury
  await contractPlatformTreasury.connect(backend).setFoundationAddress(foundation.address);

  // ASSIGN VALIDATOR ROLES TO VALIDATORS ACCOUNTS
  await contractRoleManager.grantRole(VALIDATOR_ROLE, validator.address);
  await contractRoleManager.grantRole(VALIDATOR_ROLE, validator1.address);
  await contractRoleManager.grantRole(VALIDATOR_ROLE, validator2.address);
  await contractRoleManager.grantRole(VALIDATOR_ROLE, validator3.address);
  await contractRoleManager.grantRole(VALIDATOR_ROLE, validator4.address);
  await contractRoleManager.grantRole(VALIDATOR_ROLE, validator5.address);
  // ASSIGN JUROR ROLES TO JURORS ACCOUNTS
  await contractRoleManager.grantRole(JUROR_ROLE, jurorMember.address);
  await contractRoleManager.grantRole(JUROR_ROLE, jurorMember1.address);
  await contractRoleManager.grantRole(JUROR_ROLE, jurorMember2.address);
  await contractRoleManager.grantRole(JUROR_ROLE, jurorMember3.address);
  await contractRoleManager.grantRole(JUROR_ROLE, jurorMember4.address);

  // Backend shoul set setActiveKYCFunctions to true from 1 to 100
  for (let i = 1; i <= 100; i++) {
    await contractRoleManager.setActiveKYCFunctions(i, true);
  }
  // Backend shoul set setActiveBanFunctions to true from 1 to 100
  for (let i = 1; i <= 100; i++) {
    await contractRoleManager.setActiveBanFunctions(i, true);
  }
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
    GOVERNANCE_ROLE,
    BACKEND_ROLE,
    contractContractManager,
    account1,
    account2,
    account3,
    contractGovernanceTreasury,
  };
}

module.exports = {
  deploy,
};
