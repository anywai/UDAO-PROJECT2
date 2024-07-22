// Contract verifier for mumbai testnet after deployment
const hardhat = require("hardhat");
const { ethers } = hardhat;

/*
contractUDAO:  0x86543A8790119aEC79e57c0a2C9bFE0DCb00c25C
contractRoleManager:  0x09681198d6789Cab278d661ef8cc91E6E8dE2098
contractGovernanceTreasury:  0xE4002b039a413D1E59840e55D92FAc9eb49B1D50
contractUDAOContent:  0x0400E6B8DA977A81ebf42041f8A2B44155d4cBe5
contractUDAOCertificate:  0x22ab5Dbe738b83Fe3cFaBF50099Ee228A24eC208
contractVoucherVerifier:  0x2B100a764c5FCeD585b69d8cBf7b951A4e59dED2
contractPlatformTreasury:  0x52fD729588cC28978F64d51D89e04d2C18a8Bb13
contractContractManager:  0x28E425D50612f7628b3f54A1563Ee12d6116A542
contractSupervision:  0x41944ddBB3C2268B6f5eC08d61C6618bA2452471
contractVesting:  0x385812E9574019DDD122788C4fa9a4327686E845
*/

contractUDAOaddress = "0x86543A8790119aEC79e57c0a2C9bFE0DCb00c25C";
contractRoleManageraddress = "0x09681198d6789Cab278d661ef8cc91E6E8dE2098";
contractGovernanceTreasuryaddress = "0xE4002b039a413D1E59840e55D92FAc9eb49B1D50";
contractUDAOContentaddress = "0x0400E6B8DA977A81ebf42041f8A2B44155d4cBe5";
contractUDAOCertificateaddress = "0x22ab5Dbe738b83Fe3cFaBF50099Ee228A24eC208";
contractVoucherVerifieraddress = "0x2B100a764c5FCeD585b69d8cBf7b951A4e59dED2";
contractPlatformTreasuryaddress = "0x52fD729588cC28978F64d51D89e04d2C18a8Bb13";
contractContractManageraddress = "0x28E425D50612f7628b3f54A1563Ee12d6116A542";
contractSupervisionaddress = "0x41944ddBB3C2268B6f5eC08d61C6618bA2452471";
contractVestingaddress = "0x385812E9574019DDD122788C4fa9a4327686E845";

async function main() {
  const contractUDAO = await ethers.getContractAt("UDAO", contractUDAOaddress);
  try {
    console.log("Verifying contract: UDAO");
    await hre.run(`verify:verify`, {
      address: contractUDAO.address,
      contract: "contracts/tokens/UDAO.sol:UDAO",
      constructorArguments: [],
    });
  } catch (e) {
    if (e.message.includes("Contract source code already verified") || e.message.includes("Reason: Already Verified")) {
      // do nothing
    } else {
      throw e;
    }
  }
  console.log("Contract UDAO verified");

  const contractRoleManager = await ethers.getContractAt("RoleManager", contractRoleManageraddress);
  try {
    await hre.run(`verify:verify`, {
      address: contractRoleManager.address,
      contract: "contracts/RoleManager.sol:RoleManager",
      constructorArguments: [],
    });
  } catch (e) {
    if (e.message.includes("Contract source code already verified") || e.message.includes("Reason: Already Verified")) {
      // do nothing
    } else {
      throw e;
    }
  }
  console.log("Contract RoleManager verified");

  const contractGovernanceTreasury = await ethers.getContractAt(
    "GovernanceTreasury",
    contractGovernanceTreasuryaddress
  );
  try {
    await hre.run(`verify:verify`, {
      address: contractGovernanceTreasury.address,
      contract: "contracts/treasury/GovernanceTreasury.sol:GovernanceTreasury",
      constructorArguments: [contractUDAO.address],
    });
  } catch (e) {
    if (e.message.includes("Contract source code already verified") || e.message.includes("Reason: Already Verified")) {
      // do nothing
    } else {
      throw e;
    }
  }
  console.log("Contract GovernanceTreasury verified");

  const contractUDAOContent = await ethers.getContractAt("UDAOContent", contractUDAOContentaddress);
  try {
    await hre.run(`verify:verify`, {
      address: contractUDAOContent.address,
      contract: "contracts/tokens/UDAOC.sol:UDAOContent",
      constructorArguments: [contractRoleManager.address],
    });
  } catch (e) {
    if (e.message.includes("Contract source code already verified") || e.message.includes("Reason: Already Verified")) {
      // do nothing
    } else {
      throw e;
    }
  }
  console.log("Contract UDAOContent verified");

  const contractUDAOCertificate = await ethers.getContractAt("UDAOCertificate", contractUDAOCertificateaddress);
  try {
    await hre.run(`verify:verify`, {
      address: contractUDAOCertificate.address,
      contract: "contracts/tokens/UDAO-Cert.sol:UDAOCertificate",
      constructorArguments: [contractRoleManager.address],
    });
  } catch (e) {
    if (e.message.includes("Contract source code already verified") || e.message.includes("Reason: Already Verified")) {
      // do nothing
    } else {
      throw e;
    }
  }
  console.log("Contract UDAOCertificate verified");

  const contractVoucherVerifier = await ethers.getContractAt("VoucherVerifier", contractVoucherVerifieraddress);
  try {
    await hre.run(`verify:verify`, {
      address: contractVoucherVerifier.address,
      contract: "contracts/treasury/VoucherVerifier.sol:VoucherVerifier",
      constructorArguments: [contractRoleManager.address],
    });
  } catch (e) {
    if (e.message.includes("Contract source code already verified") || e.message.includes("Reason: Already Verified")) {
      // do nothing
    } else {
      throw e;
    }
  }
  console.log("Contract VoucherVerifier verified");

  const contractPlatformTreasury = await ethers.getContractAt("PlatformTreasury", contractPlatformTreasuryaddress);
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
    if (e.message.includes("Contract source code already verified") || e.message.includes("Reason: Already Verified")) {
      // do nothing
    } else {
      throw e;
    }
  }
  console.log("Contract PlatformTreasury verified");

  const contractContractManager = await ethers.getContractAt("ContractManager", contractContractManageraddress);
  try {
    await hre.run(`verify:verify`, {
      address: contractContractManager.address,
      contract: "contracts/ContractManager.sol:ContractManager",
      constructorArguments: [contractRoleManager.address],
    });
  } catch (e) {
    if (e.message.includes("Contract source code already verified") || e.message.includes("Reason: Already Verified")) {
      // do nothing
    } else {
      throw e;
    }
  }
  console.log("Contract ContractManager verified");

  const contractSupervision = await ethers.getContractAt("DummySupervision", contractSupervisionaddress);
  try {
    await hre.run(`verify:verify`, {
      address: contractSupervision.address,
      contract: "contracts/governance/DummySupervision.sol:DummySupervision",
      constructorArguments: [],
    });
  } catch (e) {
    if (e.message.includes("Contract source code already verified") || e.message.includes("Reason: Already Verified")) {
      // do nothing
    } else {
      throw e;
    }
  }
  console.log("Contract Supervision verified");

  const contractVesting = await ethers.getContractAt("Vesting", contractVestingaddress);
  try {
    await hre.run(`verify:verify`, {
      address: contractVesting.address,
      contract: "contracts/Vesting.sol:Vesting",
      constructorArguments: [contractUDAO.address],
    });
  } catch (e) {
    if (e.message.includes("Contract source code already verified") || e.message.includes("Reason: Already Verified")) {
      // do nothing
    } else {
      throw e;
    }
  }
  console.log("Contract Vesting verified");

  console.log("All contracts verified");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
