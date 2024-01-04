const hardhat = require("hardhat");
const { ethers } = hardhat;
const helpers = require("@nomicfoundation/hardhat-network-helpers");
//version 2 required libraries
const { LazyRole } = require("../lib/LazyRole");
const { WMATIC_ABI, NonFunbiblePositionABI, NonFunbiblePositionAddress, WMATICAddress } = require("../lib/abis");
const { Contract } = require("ethers");

async function deploy(isGovernanceContractsReplaced = false) {
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

  /// VERSION 1 DEPLOYMENTS ---------------------------------------------------------------------------------------------
  /// (UDAO, UDAO CERT., UDAO CONT., VOUCHER VR., PLATFORM TRE., VESTING, ROLE MN., CONTRACT MN,
  /// (dummySUPERVISON, dummyGOVERNANCETREASURY)

  // CREATE CONTRACT FACTORIES
  let factoryUDAO = await ethers.getContractFactory("UDAO");
  let factoryRoleManager = await ethers.getContractFactory("RoleManager");
  let factoryGovernanceTreasury = await ethers.getContractFactory("DummyGovernanceTreasury");
  let factoryUDAOContent = await ethers.getContractFactory("UDAOContent");
  let factoryUDAOCertificate = await ethers.getContractFactory("UDAOCertificate");
  let factoryVoucherVerifier = await ethers.getContractFactory("VoucherVerifier");
  let factoryPlatformTreasury = await ethers.getContractFactory("PlatformTreasury");
  let factoryContractManager = await ethers.getContractFactory("ContractManager");
  let factorySupervision = await ethers.getContractFactory("DummySupervision");
  let factoryVesting = await ethers.getContractFactory("Vesting");

  // DEPLOY CONTRACTS FROM FACTORIES
  const contractUDAO = await factoryUDAO.deploy();
  const contractRoleManager = await factoryRoleManager.deploy();
  let contractGovernanceTreasury = await factoryGovernanceTreasury.deploy(contractUDAO.address);
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
  let contractSupervision = await factorySupervision.deploy(contractRoleManager.address, contractUDAOContent.address);
  const contractVesting = await factoryVesting.deploy(contractUDAO.address);

  // DEFINE ROLES
  const BACKEND_ROLE = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("BACKEND_ROLE"));
  const DEFAULT_ADMIN_ROLE = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("DEFAULT_ADMIN_ROLE"));
  const CONTENT_PUBLISHER = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("CONTENT_PUBLISHER"));
  const VOUCHER_VERIFIER = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("VOUCHER_VERIFIER"));
  const SALE_CONTROLLER = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("SALE_CONTROLLER"));
  const FOUNDATION_ROLE = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("FOUNDATION_ROLE"));

  const CONTRACT_MANAGER = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("CONTRACT_MANAGER"));
  const STAKING_CONTRACT = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("STAKING_CONTRACT"));
  const TREASURY_CONTRACT = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("TREASURY_CONTRACT"));
  const GOVERNANCE_CONTRACT = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("GOVERNANCE_CONTRACT"));
  const SUPERVISION_CONTRACT = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("SUPERVISION_CONTRACT"));
  const UDAOC_CONTRACT = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("UDAOC_CONTRACT"));

  const GOVERNANCE_ROLE = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("GOVERNANCE_ROLE"));
  const VALIDATOR_ROLE = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("VALIDATOR_ROLE"));
  const JUROR_ROLE = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("JUROR_ROLE"));

  // GRANT ROLES
  await contractRoleManager.grantRole(BACKEND_ROLE, backend.address);
  await contractRoleManager.grantRole(CONTENT_PUBLISHER, backend.address);
  await contractRoleManager.grantRole(VOUCHER_VERIFIER, backend.address);
  await contractRoleManager.grantRole(SALE_CONTROLLER, backend.address);
  await contractRoleManager.grantRole(FOUNDATION_ROLE, foundation.address);
  await contractRoleManager.grantRole(DEFAULT_ADMIN_ROLE, foundation.address);
  await contractRoleManager.grantRole(GOVERNANCE_ROLE, governanceMember.address);

  await contractRoleManager.grantRole(CONTRACT_MANAGER, contractContractManager.address);
  await contractRoleManager.grantRole(TREASURY_CONTRACT, contractPlatformTreasury.address);
  await contractRoleManager.grantRole(UDAOC_CONTRACT, contractUDAOContent.address);
  await contractRoleManager.grantRole(SUPERVISION_CONTRACT, contractSupervision.address);

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

  // SET FOUNDATION ADDRESS IN CONTRACTS
  await contractPlatformTreasury.connect(backend).setFoundationAddress(foundation.address);
  await contractUDAOCertificate.connect(backend).setFoundationAddress(foundation.address);
  await contractVoucherVerifier.connect(backend).setFoundationAddress(foundation.address);
  await contractUDAOContent.connect(backend).setFoundationAddress(foundation.address);
  //await contractContractManager.connect(backend).setFoundationAddress(foundation.address);

  /// VERSION 2 DEPLOYMENTS ---------------------------------------------------------------------------------------------
  /// (GOVERNANCE TRE., SUPERVISION, UDAO VP, UDAO STAKER, UDAO TIMEL. CONT., UDAO GOVERNOR)

  // DEFINE CONTRACTS
  // @note: define empty contracts even governance update disabled due to they used as return values
  let contractUDAOVp;
  let contractUDAOStaker;
  let contractUDAOTimelockController;
  let contractUDAOGovernor;

  if (isGovernanceContractsReplaced) {
    // CREATE CONTRACT FACTORIES
    factoryGovernanceTreasury = await ethers.getContractFactory("GovernanceTreasury");
    factorySupervision = await ethers.getContractFactory("Supervision");
    let factoryUDAOVp = await ethers.getContractFactory("UDAOVp");
    let factoryUDAOStaker = await ethers.getContractFactory("UDAOStaker");
    let factoryUDAOTimelockController = await ethers.getContractFactory("UDAOTimelockController");
    let factoryUDAOGovernor = await ethers.getContractFactory("UDAOGovernor");

    // DEPLOY CONTRACTS FROM FACTORIES
    contractGovernanceTreasury = await factoryGovernanceTreasury.deploy(contractUDAO.address);
    contractSupervision = await factorySupervision.deploy(contractRoleManager.address, contractUDAOContent.address);
    contractUDAOVp = await factoryUDAOVp.deploy(contractRoleManager.address);
    contractUDAOStaker = await factoryUDAOStaker.deploy(
      contractRoleManager.address,
      contractUDAO.address,
      contractPlatformTreasury.address,
      contractUDAOVp.address
    );
    contractUDAOTimelockController = await factoryUDAOTimelockController.deploy(1, [], [foundation.address]);
    contractUDAOGovernor = await factoryUDAOGovernor.deploy(
      contractUDAOVp.address,
      contractUDAOTimelockController.address,
      contractUDAOStaker.address,
      contractRoleManager.address
    );

    // DEFINE ROLES
    const CANCELLER_ROLE = await contractUDAOTimelockController.CANCELLER_ROLE();
    const PROPOSER_ROLE = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("PROPOSER_ROLE"));
    const EXECUTOR_ROLE = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("EXECUTOR_ROLE"));

    // GRANT ROLES
    await contractUDAOTimelockController.grantRole(CANCELLER_ROLE, foundation.address);
    await contractUDAOTimelockController.grantRole(PROPOSER_ROLE, contractUDAOGovernor.address);
    // @note: Setting the zero address as the executor role will allow anyone to execute the proposal
    await contractUDAOTimelockController.grantRole(EXECUTOR_ROLE, ethers.constants.AddressZero);
    await contractRoleManager.grantRole(STAKING_CONTRACT, contractUDAOStaker.address);
    // @todo: who will have the governance role? is that TimelockController or somebody that have governance stake?
    await contractRoleManager.grantRole(GOVERNANCE_ROLE, contractUDAOTimelockController.address);
    await contractRoleManager.grantRole(GOVERNANCE_ROLE, governanceMember.address);
    await contractRoleManager.grantRole(GOVERNANCE_CONTRACT, contractUDAOGovernor.address);
    await contractRoleManager.grantRole(DEFAULT_ADMIN_ROLE, contractUDAOTimelockController.address);
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

    // UPDATE ADDRESSES IN CONTRACTS
    await contractContractManager
      .connect(backend)
      .setAddresesCommonInVersion1and2(contractGovernanceTreasury.address, contractSupervision.address);
    await contractContractManager
      .connect(backend)
      .setAddresesVersion2GovernanceContracts(
        contractUDAOVp.address,
        contractUDAOStaker.address,
        contractUDAOGovernor.address
      );
    await contractContractManager.connect(backend).syncVersion1ContractAddresses();
    await contractContractManager.connect(backend).syncVersion2ContractAddresses();
    await contractSupervision.connect(backend).setAddressStaking(contractUDAOStaker.address);
    await contractSupervision.connect(backend).setPlatformTreasury(contractPlatformTreasury.address);

    // SET FOUNDATION ADDRESS IN CONTRACTS
    await contractSupervision.connect(backend).setFoundationAddress(foundation.address);
    await contractUDAOVp.connect(backend).setFoundationAddress(foundation.address);
    await contractUDAOStaker.connect(backend).setFoundationAddress(foundation.address);
    await contractUDAOGovernor.connect(backend).setFoundationAddress(foundation.address);
  }

  // Backend shoul set setActiveKYCFunctions to true from 1 to 100
  for (let i = 1; i <= 100; i++) {
    await contractRoleManager.setActiveKYCFunctions(i, true);
  }
  // Backend shoul set setActiveBanFunctions to true from 1 to 100
  for (let i = 1; i <= 100; i++) {
    await contractRoleManager.setActiveBanFunctions(i, true);
  }

  // Return ownership of contractRoleManager to foundation from backend after deployment
  await contractRoleManager.connect(backend).grantRole(ethers.constants.HashZero, foundation.address);
  await contractRoleManager.connect(foundation).revokeRole(ethers.constants.HashZero, backend.address);

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
    contractUDAOStaker,
    contractUDAOTimelockController,
    contractUDAOGovernor,
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
