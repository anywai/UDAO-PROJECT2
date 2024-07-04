const hardhat = require("hardhat");
const { ethers } = hardhat;
const helpers = require("@nomicfoundation/hardhat-toolbox/network-helpers");

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
  let factoryVesting = await ethers.getContractFactory("Vesting");

  // DEPLOYMENTS
  const contractUDAO = await factoryUDAO.deploy();
  const contractRoleManager = await factoryRoleManager.deploy();
  const contractGovernanceTreasury = await factoryGovernanceTreasury.deploy(contractUDAO);
  // TODO SUPERVISON UDAO TOKEN DEPLOYMENT CONTAINS DUMMY ADDRESS!!!!!!!!!!!!!!!!!!!!!
  const contractUDAOContent = await factoryUDAOContent.deploy(contractRoleManager);
  const contractUDAOCertificate = await factoryUDAOCertificate.deploy(contractRoleManager);
  const contractVoucherVerifier = await factoryVoucherVerifier.deploy(contractRoleManager);
  const contractPlatformTreasury = await factoryPlatformTreasury.deploy(
    contractRoleManager,
    contractUDAO,
    contractUDAOContent,
    contractGovernanceTreasury,
    contractVoucherVerifier
  );
  const contractContractManager = await factoryContractManager.deploy(contractRoleManager);
  //const contractSupervision = await factorySupervision.deploy(contractRoleManager.address, contractUDAOContent.address);
  const contractSupervision = await factorySupervision.deploy();
  const contractVesting = await factoryVesting.deploy(contractUDAO);

  // POST DEPLOYMENT

  // DEFINE ROLES
  const BACKEND_ROLE = ethers.keccak256(ethers.toUtf8Bytes("BACKEND_ROLE"));
  const CONTRACT_MANAGER = ethers.keccak256(ethers.toUtf8Bytes("CONTRACT_MANAGER"));
  const VOUCHER_VERIFIER = ethers.keccak256(ethers.toUtf8Bytes("VOUCHER_VERIFIER"));
  const SALE_CONTROLLER = ethers.keccak256(ethers.toUtf8Bytes("SALE_CONTROLLER"));
  const FOUNDATION_ROLE = ethers.keccak256(ethers.toUtf8Bytes("FOUNDATION_ROLE"));
  const STAKING_CONTRACT = ethers.keccak256(ethers.toUtf8Bytes("STAKING_CONTRACT"));
  const TREASURY_CONTRACT = ethers.keccak256(ethers.toUtf8Bytes("TREASURY_CONTRACT"));
  const GOVERNANCE_ROLE = ethers.keccak256(ethers.toUtf8Bytes("GOVERNANCE_ROLE"));
  const GOVERNANCE_CONTRACT = ethers.keccak256(ethers.toUtf8Bytes("GOVERNANCE_CONTRACT"));
  const VALIDATOR_ROLE = ethers.keccak256(ethers.toUtf8Bytes("VALIDATOR_ROLE"));
  const DEFAULT_ADMIN_ROLE = ethers.keccak256(ethers.toUtf8Bytes("DEFAULT_ADMIN_ROLE"));
  const JUROR_ROLE = ethers.keccak256(ethers.toUtf8Bytes("JUROR_ROLE"));
  const SUPERVISION_CONTRACT = ethers.keccak256(ethers.toUtf8Bytes("SUPERVISION_CONTRACT"));
  const UDAOC_CONTRACT = ethers.keccak256(ethers.toUtf8Bytes("UDAOC_CONTRACT"));
  const CONTENT_PUBLISHER = ethers.keccak256(ethers.toUtf8Bytes("CONTENT_PUBLISHER"));
  // GRANT ROLES
  await contractRoleManager.grantRole(BACKEND_ROLE, backend.address);
  await contractRoleManager.grantRole(CONTENT_PUBLISHER, backend.address);
  await contractRoleManager.grantRole(CONTRACT_MANAGER, contractContractManager);
  await contractRoleManager.grantRole(VOUCHER_VERIFIER, backend.address);
  await contractRoleManager.grantRole(SALE_CONTROLLER, backend.address);
  await contractRoleManager.grantRole(FOUNDATION_ROLE, foundation.address);
  await contractRoleManager.grantRole(TREASURY_CONTRACT, contractPlatformTreasury);

  await contractRoleManager.grantRole(GOVERNANCE_ROLE, governanceMember.address);
  // TODO IS THIS NECESSARY?
  await contractRoleManager.grantRole(DEFAULT_ADMIN_ROLE, foundation.address);
  await contractRoleManager.grantRole(SUPERVISION_CONTRACT, contractSupervision);
  await contractRoleManager.grantRole(UDAOC_CONTRACT, contractUDAOContent);

  // UPDATE ADDRESSES IN CONTRACTS
  await contractContractManager
    .connect(backend)
    .setAddresesVersion1Contracts(
      contractUDAO,
      contractRoleManager,
      contractUDAOContent,
      contractUDAOCertificate,
      contractVoucherVerifier,
      contractPlatformTreasury
    );
  await contractContractManager
    .connect(backend)
    .setAddresesCommonInVersion1and2(contractGovernanceTreasury, contractSupervision);
  await contractContractManager.connect(backend).syncVersion1ContractAddresses();

  // Set foundation address in platform treasury
  await contractPlatformTreasury.connect(backend).setFoundationAddress(foundation.address);
  // Set foundation address in udaocertificate contract
  await contractUDAOCertificate.connect(backend).setFoundationAddress(foundation.address);
  // Set foundation address in voucherverifier contract
  await contractVoucherVerifier.connect(backend).setFoundationAddress(foundation.address);
  // Set foundation address in udao content contract
  await contractUDAOContent.connect(backend).setFoundationAddress(foundation.address);

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

  // Return ownership of contractRoleManager to foundation from backend after deployment
  await contractRoleManager.connect(backend).grantRole(ethers.ZeroHash, foundation.address);
  await contractRoleManager.connect(foundation).revokeRole(ethers.ZeroHash, backend.address);

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
    STAKING_CONTRACT,
    SUPERVISION_CONTRACT,
    contractContractManager,
    account1,
    account2,
    account3,
    contractGovernanceTreasury,
    contractVesting,
  };
}

module.exports = {
  deploy,
};
