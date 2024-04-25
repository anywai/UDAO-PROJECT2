const hardhat = require("hardhat");
const { ethers } = hardhat;
const helpers = require("@nomicfoundation/hardhat-network-helpers");
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
  const addressRoleManager = "0x0650576D5D0e92d2C191767A51B9b462681cFfE5";
  let factoryUDAOContent = await ethers.getContractFactory("UDAOContent");
  
  const contractUDAOContent = await factoryUDAOContent.deploy(addressRoleManager);
  await contractUDAOContent.deployed();
  //await contractUDAOContent.deployTransaction.wait(WAIT_BLOCK_CONFIRMATIONS);
  console.log("contractUDAOContent deployed at: ", contractUDAOContent.address);
  console.log(`Verifying contractUDAOContent on Polygonscan...`);
  try {
    await hre.run(`verify:verify`, {
      address: contractUDAOContent.address,
      contract: "contracts/tokens/UDAOC.sol:UDAOContent",
      constructorArguments: [addressRoleManager],
    });
  } catch (e) {
    if (e.message.includes("Reason: Already Verified")) {
      // do nothing
    } else {
      throw e;
    }
  }
}
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
