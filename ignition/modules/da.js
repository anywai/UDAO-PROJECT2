//const { buildModule } = require("@nomicfoundation/hardhat-ignition-ethers");
const { buildModule } = require("@nomicfoundation/hardhat-ignition/modules");

const { ethers } = require("ethers");

module.exports = buildModule("DeployAmoyContracts", (m) => {
  const backendPK = "0ecbb4aa5a7ab07b88076b9a92b809b54fb82f664599965616a0ebb399584b24";
  const backend = new ethers.Wallet(backendPK, ethers.provider);
  const foundationPK = "106c89731b42c90935018001a2a550767d406c3847966e36b440bbc12cf00f54";
  const foundation = new ethers.Wallet(foundationPK, ethers.provider);

  // UDAO Contract
  console.log("sa 1.0");
  
  const contractUDAO = m.contract("UDAO");
  console.log("sa 2.0");
  // RoleManager Contract
  const contractRoleManager = m.contract("RoleManager");
  console.log("sa 3.0");

  // GovernanceTreasury Contract
  const contractGovernanceTreasury = m.contract("GovernanceTreasury", [contractUDAO]);
  console.log("sa 4.0");

  // UDAOContent Contract
  const contractUDAOContent = m.contract("UDAOContent", [contractRoleManager]);
  console.log("sa 5.0");

  // UDAOCertificate Contract
  const contractUDAOCertificate = m.contract("UDAOCertificate", [contractRoleManager]);
  console.log("sa 6.0");

  // VoucherVerifier Contract
  const contractVoucherVerifier = m.contract("VoucherVerifier", [contractRoleManager]);
  console.log("sa 7.0");

  // PlatformTreasury Contract
  const contractPlatformTreasury = m.contract("PlatformTreasury", [
    contractRoleManager,
    contractUDAO,
    contractUDAOContent,
    contractGovernanceTreasury,
    contractVoucherVerifier,
  ]);
  console.log("sa 8.0");

  // ContractManager Contract
  const contractContractManager = m.contract("ContractManager", [contractRoleManager]);
  console.log("sa 9.0");

  // DummySupervision Contract
  const contractSupervision = m.contract("DummySupervision");
  console.log("sa 10.0");

  // Vesting Contract
  const contractVesting = m.contract("Vesting", [contractUDAO]);
  console.log("sa 11.0");

  // Additional post-deployment logic
  m.call(contractRoleManager, "grantRole", [ethers.keccak256(ethers.toUtf8Bytes("BACKEND_ROLE")), backend.address], {
    id: "grantBackendRole",
  });
  console.log("sa 12.0");

  m.call(
    contractRoleManager,
    "grantRole",
    [ethers.keccak256(ethers.toUtf8Bytes("CONTENT_PUBLISHER")), backend.address],
    { id: "grantContentPublisherRole" }
  );
  console.log("sa 13.0");

  m.call(
    contractRoleManager,
    "grantRole",
    [ethers.keccak256(ethers.toUtf8Bytes("CONTRACT_MANAGER")), contractContractManager],
    { id: "grantContractManagerRole" }
  );
  console.log("sa 14.0");

  m.call(
    contractRoleManager,
    "grantRole",
    [ethers.keccak256(ethers.toUtf8Bytes("VOUCHER_VERIFIER")), backend.address],
    { id: "grantVoucherVerifierRole" }
  );
  console.log("sa 15.0");

  m.call(contractRoleManager, "grantRole", [ethers.keccak256(ethers.toUtf8Bytes("SALE_CONTROLLER")), backend.address], {
    id: "grantSaleControllerRole",
  });
  console.log("sa 16.0");

  m.call(
    contractRoleManager,
    "grantRole",
    [ethers.keccak256(ethers.toUtf8Bytes("FOUNDATION_ROLE")), foundation.address],
    { id: "grantFoundationRole" }
  );
  console.log("sa 17.0");

  m.call(
    contractRoleManager,
    "grantRole",
    [ethers.keccak256(ethers.toUtf8Bytes("TREASURY_CONTRACT")), contractPlatformTreasury],
    { id: "grantTreasuryContractRole" }
  );
  console.log("sa 18.0");

  m.call(
    contractRoleManager,
    "grantRole",
    [ethers.keccak256(ethers.toUtf8Bytes("DEFAULT_ADMIN_ROLE")), foundation.address],
    { id: "grantDefaultAdminRole" }
  );
  console.log("sa 19.0");

  m.call(
    contractRoleManager,
    "grantRole",
    [ethers.keccak256(ethers.toUtf8Bytes("SUPERVISION_CONTRACT")), contractSupervision],
    { id: "grantSupervisionContractRole" }
  );
  console.log("sa 20.0");

  m.call(
    contractRoleManager,
    "grantRole",
    [ethers.keccak256(ethers.toUtf8Bytes("UDAOC_CONTRACT")), contractUDAOContent],
    { id: "grantUDAOCContractRole" }
  );
  console.log("sa 21.0");
  const zero = "0x0000000000000000000000000000000000000000000000000000000000000000";

  /*
  // Return ownership of contractRoleManager to foundation from backend after deployment
  const deneme1 = m.call(contractRoleManager, "grantRole", [zero, foundation.address], {
    id: "grantAdminRoleToFoundation",
    from: backend.address,
  });
  console.log("sa 22.0");

  m.call(contractRoleManager, "revokeRole", [zero, backend.address], {
    id: "revokeAdminRoleFromBackend",
    from: foundation.address,
    after: [deneme1]
  });
  console.log("sa 23.0");
  */
  
});