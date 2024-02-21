const hardhat = require("hardhat");
const { ethers } = hardhat;
const helpers = require("@nomicfoundation/hardhat-network-helpers");
// Get MAINNET_KEY from .env
require("dotenv").config();

const MAINNET_KEY = process.env.MAINNET_KEY;
const FOUNDATION_KEY = process.env.FOUNDATION_KEY;

async function main() {
  console.log();
  console.log("Deploying on Polygon Mainnet");
  console.log("Retrieving accounts");

  backend = new ethers.Wallet(MAINNET_KEY, ethers.provider);
  foundation = new ethers.Wallet(FOUNDATION_KEY, ethers.provider);

  console.log("Backend public address: ", backend.address);
  console.log("Foundation public address: ", foundation.address);
  console.log("Generating contract factories...");

  /// FACTORIES
  // governance
  let factorySupervision = await ethers.getContractFactory("DummySupervision");
  // tokens
  let factoryUDAOCertificate = await ethers.getContractFactory(
    "UDAOCertificate"
  );
  let factoryUDAO = await ethers.getContractFactory("UDAO");
  let factoryUDAOContent = await ethers.getContractFactory("UDAOContent");
  // treasury
  let factoryGovernanceTreasury = await ethers.getContractFactory(
    "GovernanceTreasury"
  );
  let factoryPlatformTreasury = await ethers.getContractFactory(
    "PlatformTreasury"
  );
  let factoryVoucherVerifier = await ethers.getContractFactory(
    "VoucherVerifier"
  );
  // general
  let factoryContractManager = await ethers.getContractFactory(
    "ContractManager"
  );
  let factoryRoleManager = await ethers.getContractFactory("RoleManager");
  let factoryVesting = await ethers.getContractFactory("Vesting");

  console.log("Contract factories generated");
  console.log("Deploying contracts...");

  // DEPLOYMENTS
  const WAIT_BLOCK_CONFIRMATIONS = 6;
  console.log(
    "Every deployment will wait for " +
      WAIT_BLOCK_CONFIRMATIONS +
      " confirmations."
  );
  console.log(
    "Deployment order is: UDAO, RoleManager, GovernanceTreasury, UDAOContent, UDAOCertificate, VoucherVerifier, PlatformTreasury, ContractManager, Supervision, Vesting"
  );
  console.log();
  console.log("Deploying contract UDAO...");
  const contractUDAO = await factoryUDAO.deploy();
  await contractUDAO.deployTransaction.wait(WAIT_BLOCK_CONFIRMATIONS);
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
  console.log();
  console.log("Deploying contract RoleManager...");
  const contractRoleManager = await factoryRoleManager.deploy();
  await contractRoleManager.deployTransaction.wait(WAIT_BLOCK_CONFIRMATIONS);
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
  console.log();
  console.log("Deploying contract GovernanceTreasury...");
  const contractGovernanceTreasury = await factoryGovernanceTreasury.deploy(
    contractUDAO.address
  );
  await contractGovernanceTreasury.deployTransaction.wait(
    WAIT_BLOCK_CONFIRMATIONS
  );
  console.log(
    "contractGovernanceTreasury deployed at: ",
    contractGovernanceTreasury.address
  );
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
  console.log();
  console.log("Deploying contract UDAOContent...");
  const contractUDAOContent = await factoryUDAOContent.deploy(
    contractRoleManager.address
  );
  await contractUDAOContent.deployTransaction.wait(WAIT_BLOCK_CONFIRMATIONS);
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
  console.log();
  console.log("Deploying contract UDAOCertificate...");
  const contractUDAOCertificate = await factoryUDAOCertificate.deploy(
    contractRoleManager.address
  );
  await contractUDAOCertificate.deployTransaction.wait(
    WAIT_BLOCK_CONFIRMATIONS
  );
  console.log(
    "contractUDAOCertificate deployed at: ",
    contractUDAOCertificate.address
  );
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
  console.log();
  console.log("Deploying contract VoucherVerifier...");
  const contractVoucherVerifier = await factoryVoucherVerifier.deploy(
    contractRoleManager.address
  );
  await contractVoucherVerifier.deployTransaction.wait(
    WAIT_BLOCK_CONFIRMATIONS
  );
  console.log(
    "contractVoucherVerifier deployed at: ",
    contractVoucherVerifier.address
  );
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
  console.log();
  console.log("Deploying contract PlatformTreasury...");
  const contractPlatformTreasury = await factoryPlatformTreasury.deploy(
    contractRoleManager.address,
    contractUDAO.address,
    contractUDAOContent.address,
    contractGovernanceTreasury.address,
    contractVoucherVerifier.address
  );
  await contractPlatformTreasury.deployTransaction.wait(
    WAIT_BLOCK_CONFIRMATIONS
  );
  console.log(
    "contractPlatformTreasury deployed at: ",
    contractPlatformTreasury.address
  );
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
  console.log();
  console.log("Deploying contract ContractManager...");
  const contractContractManager = await factoryContractManager.deploy(
    contractRoleManager.address
  );
  await contractContractManager.deployTransaction.wait(
    WAIT_BLOCK_CONFIRMATIONS
  );
  console.log(
    "contractContractManager deployed at: ",
    contractContractManager.address
  );
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
  console.log();
  console.log("Deploying contract Supervision...");
  const contractSupervision = await factorySupervision.deploy();
  await contractSupervision.deployTransaction.wait(WAIT_BLOCK_CONFIRMATIONS);
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
  console.log();
  console.log("Deploying contract Vesting...");
  const contractVesting = await factoryVesting.deploy(contractUDAO.address);
  await contractVesting.deployTransaction.wait(WAIT_BLOCK_CONFIRMATIONS);
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
  console.log("ALL CONTRACTS DEPLOYED");
  console.log("Starting post deployment tasks...");
  // POST DEPLOYMENT

  // DEFINE ROLES
  const BACKEND_ROLE = ethers.utils.keccak256(
    ethers.utils.toUtf8Bytes("BACKEND_ROLE")
  );
  const CONTRACT_MANAGER = ethers.utils.keccak256(
    ethers.utils.toUtf8Bytes("CONTRACT_MANAGER")
  );
  const VOUCHER_VERIFIER = ethers.utils.keccak256(
    ethers.utils.toUtf8Bytes("VOUCHER_VERIFIER")
  );
  const SALE_CONTROLLER = ethers.utils.keccak256(
    ethers.utils.toUtf8Bytes("SALE_CONTROLLER")
  );
  const FOUNDATION_ROLE = ethers.utils.keccak256(
    ethers.utils.toUtf8Bytes("FOUNDATION_ROLE")
  );
  const STAKING_CONTRACT = ethers.utils.keccak256(
    ethers.utils.toUtf8Bytes("STAKING_CONTRACT")
  );
  const TREASURY_CONTRACT = ethers.utils.keccak256(
    ethers.utils.toUtf8Bytes("TREASURY_CONTRACT")
  );
  const GOVERNANCE_ROLE = ethers.utils.keccak256(
    ethers.utils.toUtf8Bytes("GOVERNANCE_ROLE")
  );
  const GOVERNANCE_CONTRACT = ethers.utils.keccak256(
    ethers.utils.toUtf8Bytes("GOVERNANCE_CONTRACT")
  );
  const VALIDATOR_ROLE = ethers.utils.keccak256(
    ethers.utils.toUtf8Bytes("VALIDATOR_ROLE")
  );
  const DEFAULT_ADMIN_ROLE = ethers.utils.keccak256(
    ethers.utils.toUtf8Bytes("DEFAULT_ADMIN_ROLE")
  );
  const JUROR_ROLE = ethers.utils.keccak256(
    ethers.utils.toUtf8Bytes("JUROR_ROLE")
  );
  const SUPERVISION_CONTRACT = ethers.utils.keccak256(
    ethers.utils.toUtf8Bytes("SUPERVISION_CONTRACT")
  );
  const UDAOC_CONTRACT = ethers.utils.keccak256(
    ethers.utils.toUtf8Bytes("UDAOC_CONTRACT")
  );
  const CONTENT_PUBLISHER = ethers.utils.keccak256(
    ethers.utils.toUtf8Bytes("CONTENT_PUBLISHER")
  );

  // GRANT ROLES
  console.log("Granting roles to contracts...");
  tx = await contractRoleManager.grantRole(BACKEND_ROLE, backend.address);
  await tx.wait();
  console.log("BACKEND_ROLE granted to backend address");
  tx = await contractRoleManager.grantRole(CONTENT_PUBLISHER, backend.address);
  await tx.wait();
  console.log("CONTENT_PUBLISHER granted to backend address");
  tx = await contractRoleManager.grantRole(
    CONTRACT_MANAGER,
    contractContractManager.address
  );
  await tx.wait();
  console.log("CONTRACT_MANAGER granted to contractContractManager address");
  tx = await contractRoleManager.grantRole(VOUCHER_VERIFIER, backend.address);
  await tx.wait();
  console.log("VOUCHER_VERIFIER granted to backend address");
  tx = await contractRoleManager.grantRole(SALE_CONTROLLER, backend.address);
  await tx.wait();
  console.log("SALE_CONTROLLER granted to backend address");
  tx = await contractRoleManager.grantRole(FOUNDATION_ROLE, foundation.address);
  await tx.wait();
  console.log("FOUNDATION_ROLE granted to foundation address");
  tx = await contractRoleManager.grantRole(
    TREASURY_CONTRACT,
    contractPlatformTreasury.address
  );
  await tx.wait();
  console.log("TREASURY_CONTRACT granted to contractPlatformTreasury address");
  /*
    TODO Deactivated for easy integration
    tx = await contractRoleManager.grantRole(GOVERNANCE_ROLE, governanceMember.address);
    await tx.wait();
    */
  tx = await contractRoleManager.grantRole(
    DEFAULT_ADMIN_ROLE,
    foundation.address
  );
  await tx.wait();
  console.log(
    "DEFAULT_ADMIN_ROLE of contractRoleManager granted to foundation address"
  );
  tx = await contractRoleManager.grantRole(
    SUPERVISION_CONTRACT,
    contractSupervision.address
  );
  await tx.wait();
  console.log("SUPERVISION_CONTRACT granted to contractSupervision address");
  tx = await contractRoleManager.grantRole(
    UDAOC_CONTRACT,
    contractUDAOContent.address
  );
  await tx.wait();
  console.log("UDAOC_CONTRACT granted to contractUDAOContent address");
  console.log("ALL ROLES GRANTED");
  // UPDATE ADDRESSES IN CONTRACTS
  console.log("Updating addresses in contracts...");
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
  tx = await contractContractManager
    .connect(backend)
    .setAddresesCommonInVersion1and2(
      contractGovernanceTreasury.address,
      contractSupervision.address
    );
  await tx.wait();
  await contractContractManager
    .connect(backend)
    .syncVersion1ContractAddresses();

  // Set foundation address in platform treasury
  console.log("Setting foundation address in PlatformTreasury...");
  // @dev This function is only callable by the foundation but during deployment this address is set as the backend
  tx = await contractPlatformTreasury
    .connect(backend)
    .setFoundationAddress(foundation.address);
  await tx.wait();
  console.log("Foundation address set as ", foundation.address);
  // Set foundation address in udaocertificate contract
  console.log("Setting foundation address in UDAOCertificate...");
  tx = await contractUDAOCertificate
    .connect(backend)
    .setFoundationAddress(foundation.address);
  await tx.wait();
  console.log("Foundation address set as ", foundation.address);
  // Set foundation address in voucherverifier contract
  console.log("Setting foundation address in VoucherVerifier...");
  tx = await contractVoucherVerifier
    .connect(backend)
    .setFoundationAddress(foundation.address);
  await tx.wait();
  console.log("Foundation address set as ", foundation.address);

  // Backend should set setActiveKYCFunctions to true from 1 to 100
  console.log("KYC and BAN is deactivated! These can be activated later.");
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
  console.log("Granting admin role of contractRoleManager to foundation...");
  tx = await contractRoleManager
    .connect(backend)
    .grantRole(ethers.constants.HashZero, foundation.address);
  await tx.wait();
  console.log("Revoking admin role of contractRoleManager from backend...");
  tx = await contractRoleManager
    .connect(foundation)
    .revokeRole(ethers.constants.HashZero, backend.address);
  await tx.wait();

  // Console log all the contracts addressess
  console.log("contractUDAO: ", contractUDAO.address);
  console.log("contractRoleManager: ", contractRoleManager.address);
  console.log(
    "contractGovernanceTreasury: ",
    contractGovernanceTreasury.address
  );
  console.log("contractUDAOContent: ", contractUDAOContent.address);
  console.log("contractUDAOCertificate: ", contractUDAOCertificate.address);
  console.log("contractVoucherVerifier: ", contractVoucherVerifier.address);
  console.log("contractPlatformTreasury: ", contractPlatformTreasury.address);
  console.log("contractContractManager: ", contractContractManager.address);
  console.log("contractSupervision: ", contractSupervision.address);
  console.log("contractVesting: ", contractVesting.address);
  console.log("Deployment completed!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
