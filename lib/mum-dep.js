const hardhat = require("hardhat");
const { ethers } = hardhat;
const { expect } = require("chai");

async function main() {
  /// @dev define some users and get (wallet) signers for them
  const [
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

  console.log("Deploying to mumbai testnet");
  backend = new ethers.Wallet("0ecbb4aa5a7ab07b88076b9a92b809b54fb82f664599965616a0ebb399584b24", ethers.provider);
  foundation = new ethers.Wallet("c65a58d97cfc1a35f67fba197655b9df253ffddbdf31d9cc18ec1447cb454818", ethers.provider);
  console.log("backend address: ", backend.address);
  console.log("foundation address: ", foundation.address);
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
  const WAIT_BLOCK_CONFIRMATIONS = 6;
  const contractUDAO = await factoryUDAO.deploy();
  await contractUDAO.deployed();
  //await contractUDAO.deployTransaction.wait(WAIT_BLOCK_CONFIRMATIONS);
  console.log("contractUDAO deployed at: ", contractUDAO.address);
  console.log(`Verifying contractUDAO on Polygonscan...`);
  try {
    await hre.run(`verify:verify`, {
      address: contractUDAO.address,
      contract: "contracts/tokens/UDAO.sol:UDAO",
      constructorArguments: [],
    });
  } catch (e) {
    if (e.message.includes("Reason: Already Verified")) {
      // do nothing
    } else {
      throw e;
    }
  }
  const contractRoleManager = await factoryRoleManager.deploy();
  await contractRoleManager.deployed();
  //await contractRoleManager.deployTransaction.wait(WAIT_BLOCK_CONFIRMATIONS);
  console.log("contractRoleManager deployed at: ", contractRoleManager.address);
  console.log(`Verifying contractRoleManager on Polygonscan...`);

  try {
    await hre.run(`verify:verify`, {
      address: contractRoleManager.address,
      contract: "contracts/RoleManager.sol:RoleManager",
      constructorArguments: [],
    });
  } catch (e) {
    if (e.message.includes("Reason: Already Verified")) {
      // do nothing
    } else {
      throw e;
    }
  }
  const contractGovernanceTreasury = await factoryGovernanceTreasury.deploy(contractUDAO.address);
  await contractGovernanceTreasury.deployed();
  //await contractGovernanceTreasury.deployTransaction.wait(WAIT_BLOCK_CONFIRMATIONS);
  console.log("contractGovernanceTreasury deployed at: ", contractGovernanceTreasury.address);
  console.log(`Verifying contractGovernanceTreasury on Polygonscan...`);
  try {
    await hre.run(`verify:verify`, {
      address: contractGovernanceTreasury.address,
      contract: "contracts/treasury/GovernanceTreasury.sol:GovernanceTreasury",
      constructorArguments: [contractUDAO.address],
    });
  } catch (e) {
    if (e.message.includes("Reason: Already Verified")) {
      // do nothing
    } else {
      throw e;
    }
  }
  // TODO SUPERVISON UDAO TOKEN DEPLOYMENT CONTAINS DUMMY ADDRESS!!!!!!!!!!!!!!!!!!!!!
  const contractUDAOContent = await factoryUDAOContent.deploy(contractRoleManager.address);
  await contractUDAOContent.deployed();
  //await contractUDAOContent.deployTransaction.wait(WAIT_BLOCK_CONFIRMATIONS);
  console.log("contractUDAOContent deployed at: ", contractUDAOContent.address);
  console.log(`Verifying contractUDAOContent on Polygonscan...`);
  try {
    await hre.run(`verify:verify`, {
      address: contractUDAOContent.address,
      contract: "contracts/tokens/UDAOC.sol:UDAOContent",
      constructorArguments: [contractRoleManager.address],
    });
  } catch (e) {
    if (e.message.includes("Reason: Already Verified")) {
      // do nothing
    } else {
      throw e;
    }
  }
  const contractUDAOCertificate = await factoryUDAOCertificate.deploy(contractRoleManager.address);
  await contractUDAOCertificate.deployed();
  //await contractUDAOCertificate.deployTransaction.wait(WAIT_BLOCK_CONFIRMATIONS);
  console.log("contractUDAOCertificate deployed at: ", contractUDAOCertificate.address);
  console.log(`Verifying contractUDAOCertificate on Polygonscan...`);
  try {
    await hre.run(`verify:verify`, {
      address: contractUDAOCertificate.address,
      contract: "contracts/tokens/UDAO-Cert.sol:UDAOCertificate",
      constructorArguments: [contractRoleManager.address],
    });
  } catch (e) {
    if (e.message.includes("Reason: Already Verified")) {
      // do nothing
    } else {
      throw e;
    }
  }
  const contractVoucherVerifier = await factoryVoucherVerifier.deploy(contractRoleManager.address);
  await contractVoucherVerifier.deployed();
  //await contractVoucherVerifier.deployTransaction.wait(WAIT_BLOCK_CONFIRMATIONS);
  console.log("contractVoucherVerifier deployed at: ", contractVoucherVerifier.address);
  console.log(`Verifying contractVoucherVerifier on Polygonscan...`);
  try {
    await hre.run(`verify:verify`, {
      address: contractVoucherVerifier.address,
      contract: "contracts/treasury/VoucherVerifier.sol:VoucherVerifier",
      constructorArguments: [contractRoleManager.address],
    });
  } catch (e) {
    if (e.message.includes("Reason: Already Verified")) {
      // do nothing
    } else {
      throw e;
    }
  }

  const contractPlatformTreasury = await factoryPlatformTreasury.deploy(
    contractRoleManager.address,
    contractUDAO.address,
    contractUDAOContent.address,
    contractGovernanceTreasury.address,
    contractVoucherVerifier.address
  );
  await contractPlatformTreasury.deployed();
  //await contractPlatformTreasury.deployTransaction.wait(WAIT_BLOCK_CONFIRMATIONS);
  console.log("contractPlatformTreasury deployed at: ", contractPlatformTreasury.address);
  console.log(`Verifying contractPlatformTreasury on Polygonscan...`);
  try {
    await hre.run(`verify:verify`, {
      address: contractPlatformTreasury.address,
      contract: "contracts/treasury/PlatformTreasury.sol:PlatformTreasury",
      constructorArguments: [
        contractRoleManager.address,
        contractUDAO.address,
        contractUDAOContent.address,
        contractGovernanceTreasury.address,
        contractVoucherVerifier.address,
      ],
    });
  } catch (e) {
    if (e.message.includes("Reason: Already Verified")) {
      // do nothing
    } else {
      throw e;
    }
  }

  const contractContractManager = await factoryContractManager.deploy(contractRoleManager.address);
  await contractContractManager.deployed();
  //await contractContractManager.deployTransaction.wait(WAIT_BLOCK_CONFIRMATIONS);
  console.log("contractContractManager deployed at: ", contractContractManager.address);
  console.log(`Verifying contractContractManager on Polygonscan...`);
  try {
    await hre.run(`verify:verify`, {
      address: contractContractManager.address,
      contract: "contracts/ContractManager.sol:ContractManager",
      constructorArguments: [contractRoleManager.address],
    });
  } catch (e) {
    if (e.message.includes("Reason: Already Verified")) {
      // do nothing
    } else {
      throw e;
    }
  }
  const contractSupervision = await factorySupervision.deploy();
  await contractSupervision.deployed();
  //await contractSupervision.deployTransaction.wait(WAIT_BLOCK_CONFIRMATIONS);
  console.log("contractSupervision deployed at: ", contractSupervision.address);
  console.log(`Verifying contractSupervision on Polygonscan...`);
  try {
    await hre.run(`verify:verify`, {
      address: contractSupervision.address,
      contract: "contracts/governance/DummySupervision.sol:DummySupervision",
      constructorArguments: [],
    });
  } catch (e) {
    if (e.message.includes("Reason: Already Verified")) {
      // do nothing
    } else {
      throw e;
    }
  }
  const contractVesting = await factoryVesting.deploy(contractUDAO.address);
  await contractVesting.deployed();
  //await contractVesting.deployTransaction.wait(WAIT_BLOCK_CONFIRMATIONS);
  console.log("contractVesting deployed at: ", contractVesting.address);
  console.log(`Verifying contractVesting on Polygonscan...`);
  try {
    await hre.run(`verify:verify`, {
      address: contractVesting.address,
      contract: "contracts/Vesting.sol:Vesting",
      constructorArguments: [contractUDAO.address],
    });
  } catch (e) {
    if (e.message.includes("Reason: Already Verified")) {
      // do nothing
    } else {
      throw e;
    }
  }

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
  console.log("Granting roles to contracts and users");
  // Grant BACKEND_ROLE to backend and Listen the RoleGranted event
  await expect(contractRoleManager.grantRole(BACKEND_ROLE, backend.address)).to.emit(
    contractRoleManager,
    "RoleGranted"
  );
  console.log("Backend role granted to backend");
  //tx = await contractRoleManager.grantRole(CONTENT_PUBLISHER, backend.address);
  await expect(contractRoleManager.grantRole(CONTENT_PUBLISHER, backend.address)).to.emit(
    contractRoleManager,
    "RoleGranted"
  );
  console.log("Content publisher role granted to backend");
  //tx = await contractRoleManager.grantRole(CONTRACT_MANAGER, contractContractManager.address);
  await expect(contractRoleManager.grantRole(CONTRACT_MANAGER, contractContractManager.address)).to.emit(
    contractRoleManager,
    "RoleGranted"
  );
  console.log("Contract manager role granted to contractContractManager");
  //tx = await contractRoleManager.grantRole(VOUCHER_VERIFIER, backend.address);
  await expect(contractRoleManager.grantRole(VOUCHER_VERIFIER, backend.address)).to.emit(
    contractRoleManager,
    "RoleGranted"
  );
  console.log("Voucher verifier role granted to backend");
  //tx = await contractRoleManager.grantRole(SALE_CONTROLLER, backend.address);
  await expect(contractRoleManager.grantRole(SALE_CONTROLLER, backend.address)).to.emit(
    contractRoleManager,
    "RoleGranted"
  );
  console.log("Sale controller role granted to backend");
  //tx = await contractRoleManager.grantRole(FOUNDATION_ROLE, foundation.address);
  await expect(contractRoleManager.grantRole(FOUNDATION_ROLE, foundation.address)).to.emit(
    contractRoleManager,
    "RoleGranted"
  );
  console.log("Foundation role granted to foundation");
  //tx = await contractRoleManager.grantRole(TREASURY_CONTRACT, contractPlatformTreasury.address);
  await expect(contractRoleManager.grantRole(TREASURY_CONTRACT, contractPlatformTreasury.address)).to.emit(
    contractRoleManager,
    "RoleGranted"
  );
  console.log("Treasury contract role granted to contractPlatformTreasury");
  /*
    TODO Deactivated for easy integration
    tx = await contractRoleManager.grantRole(GOVERNANCE_ROLE, governanceMember.address);
    await tx.wait();
    */
  //tx = await contractRoleManager.grantRole(DEFAULT_ADMIN_ROLE, foundation.address);
  await expect(contractRoleManager.grantRole(DEFAULT_ADMIN_ROLE, foundation.address)).to.emit(
    contractRoleManager,
    "RoleGranted"
  );
  console.log("Default admin role granted to foundation");
  //tx = await contractRoleManager.grantRole(SUPERVISION_CONTRACT, contractSupervision.address);
  await expect(contractRoleManager.grantRole(SUPERVISION_CONTRACT, contractSupervision.address)).to.emit(
    contractRoleManager,
    "RoleGranted"
  );
  console.log("Supervision contract role granted to contractSupervision");
  //tx = await contractRoleManager.grantRole(UDAOC_CONTRACT, contractUDAOContent.address);
  await expect(contractRoleManager.grantRole(UDAOC_CONTRACT, contractUDAOContent.address)).to.emit(
    contractRoleManager,
    "RoleGranted"
  );
  console.log("UDAOC contract role granted to contractUDAOContent");

  // UPDATE ADDRESSES IN CONTRACTS
  tx = await contractContractManager
    .connect(backend)
    .setAddresesVersion1Contracts(
      contractUDAO.address,
      contractRoleManager.address,
      contractUDAOContent.address,
      contractUDAOCertificate.address,
      contractVoucherVerifier.address,
      contractPlatformTreasury.address
    );
  await tx.wait();
  console.log("Version 1 contracts addresses set in contractContractManager");
  tx = await contractContractManager
    .connect(backend)
    .setAddresesCommonInVersion1and2(contractGovernanceTreasury.address, contractSupervision.address);
  await tx.wait();
  console.log("Common addresses set in contractContractManager");
  await contractContractManager.connect(backend).syncVersion1ContractAddresses();
  console.log("Version 1 contracts addresses synced with contractContractManager on all contracts");
  // Set foundation address in platform treasury
  tx = await contractPlatformTreasury.connect(backend).setFoundationAddress(foundation.address);
  await tx.wait();
  console.log("Foundation address set in contractPlatformTreasury");
  // Set foundation address in udaocertificate contract
  tx = await contractUDAOCertificate.connect(backend).setFoundationAddress(foundation.address);
  await tx.wait();
  console.log("Foundation address set in contractUDAOCertificate");
  // Set foundation address in voucherverifier contract
  tx = await contractVoucherVerifier.connect(backend).setFoundationAddress(foundation.address);
  await tx.wait();
  console.log("Foundation address set in contractVoucherVerifier");

  // ASSIGN VALIDATOR ROLES TO VALIDATORS ACCOUNTS
  /*
    TODO Deactivated for easy integration
    tx = await contractRoleManager.grantRole(VALIDATOR_ROLE, validator.address);
    await tx.wait();
    tx = await contractRoleManager.grantRole(VALIDATOR_ROLE, validator1.address);
    await tx.wait();
    tx = await contractRoleManager.grantRole(VALIDATOR_ROLE, validator2.address);
    await tx.wait();
    tx = await contractRoleManager.grantRole(VALIDATOR_ROLE, validator3.address);
    await tx.wait();
    tx = await contractRoleManager.grantRole(VALIDATOR_ROLE, validator4.address);
    await tx.wait();
    tx = await contractRoleManager.grantRole(VALIDATOR_ROLE, validator5.address);
    await tx.wait();
    // ASSIGN JUROR ROLES TO JURORS ACCOUNTS
    tx = await contractRoleManager.grantRole(JUROR_ROLE, jurorMember.address);
    await tx.wait();
    tx = await contractRoleManager.grantRole(JUROR_ROLE, jurorMember1.address);
    await tx.wait();
    tx = await contractRoleManager.grantRole(JUROR_ROLE, jurorMember2.address);
    await tx.wait();
    tx = await contractRoleManager.grantRole(JUROR_ROLE, jurorMember3.address);
    await tx.wait();
    tx = await contractRoleManager.grantRole(JUROR_ROLE, jurorMember4.address);
    await tx.wait();
    */

  // Backend shoul set setActiveKYCFunctions to true from 1 to 100
  console.log("KYC and BAN is deactivated for easy integration");
  /*
    for (let i = 1; i <= 100; i++) {
      tx = await contractRoleManager.setActiveKYCFunctions(i, true);
      await tx.wait();
    }
    // Backend shoul set setActiveBanFunctions to true from 1 to 100
    for (let i = 1; i <= 100; i++) {
      tx = await contractRoleManager.setActiveBanFunctions(i, true);
      await tx.wait();
    }
    */

  // Return ownership of contractRoleManager to foundation from backend after deployment
  tx = await contractRoleManager.connect(backend).grantRole(ethers.constants.HashZero, foundation.address);
  await tx.wait();
  console.log("Ownership of contractRoleManager returned to foundation");
  tx = await contractRoleManager.connect(foundation).revokeRole(ethers.constants.HashZero, backend.address);
  await tx.wait();
  console.log("Ownership of contractRoleManager revoked from backend");

  // Console log all the contracts addressess
  console.log("contractUDAO: ", contractUDAO.address);
  console.log("contractRoleManager: ", contractRoleManager.address);
  console.log("contractGovernanceTreasury: ", contractGovernanceTreasury.address);
  console.log("contractUDAOContent: ", contractUDAOContent.address);
  console.log("contractUDAOCertificate: ", contractUDAOCertificate.address);
  console.log("contractVoucherVerifier: ", contractVoucherVerifier.address);
  console.log("contractPlatformTreasury: ", contractPlatformTreasury.address);
  console.log("contractContractManager: ", contractContractManager.address);
  console.log("contractSupervision: ", contractSupervision.address);
  console.log("contractVesting: ", contractVesting.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
