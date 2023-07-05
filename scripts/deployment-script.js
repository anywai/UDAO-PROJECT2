// BU DEĞİLLLLL BUU DEĞĞĞĞİİİİİLL!!!
// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
const hre = require("hardhat");

async function main() {
  const provider = new ethers.providers.JsonRpcProvider(
    "https://polygon-mumbai.g.alchemy.com/v2/1BycgOPoADnDIDznoNrztaStwyViMeTk"
  );
  const default_admin = new ethers.Wallet(
    "6e76cd5f8b74f43aeab401e5f9471a72837d9c1d4b5daa7791b8b9c9d6c02a35",
    provider
  );
  const backend = new ethers.Wallet(
    "f37a4b00a9746b70110cba102fe6bf5ff2a93d47dc62231ae37ef3d6c37e9742",
    provider
  );
  const foundation = new ethers.Wallet(
    "705ba5cca796c3399c0674faed80b7c7e14b633ea1d6c2dd255f61061b4dfcc0",
    provider
  );
  const governance = new ethers.Wallet(
    "dba721770f9c062611da572fc046107ac05867015c2a73f25dec0b5cbd2a9669",
    provider
  );
  const validator1 = new ethers.Wallet(
    "f3ebe6405b23f281b1127fa7ae5536b5ea7edd1e938952687258be10e56c3d16",
    provider
  );
  const validator2 = new ethers.Wallet(
    "f6b8b701f62fbcff4b96ccd4ae7e67942e8e1ed918fd9fdd5ed57086989d6ab4",
    provider
  );
  const validator3 = new ethers.Wallet(
    "69135b6d35f4a34fa5c4c3380d1c4699c84d9761e76d420489257b201c3f4a69",
    provider
  );
  const validator4 = new ethers.Wallet(
    "0e83b10fb1ce964a85f4b5904b6ce8f1ec43c23c887812c7f786e75b8df6bb09",
    provider
  );
  const validator5 = new ethers.Wallet(
    "1b3425c643651d43e23f43aa07fa2af1ba3231d659f0c8e5b24b65d51f6b0a54",
    provider
  );
  const contentCreator = new ethers.Wallet(
    "183460de301f4cf1606dcecad92dc2f790a41668d99fe9bfa828592f0a60b33a",
    provider
  );
  const contentBuyer = new ethers.Wallet(
    "0b62f9eaa4c90a42fec439f3d94b7b8c5cbc782d7f666f5bb9b16641f6e1d301",
    provider
  );
  const juror1 = new ethers.Wallet(
    "f83d0abbaecd4b0b1f7cfabff023ba94181755e666be7a2f0b415bccda3b0cfe",
    provider
  );
  const juror2 = new ethers.Wallet(
    "e59c761f632b2028dbf8f2c6b2319401fab14326580ab62fbaca57328b426d43",
    provider
  );
  const juror3 = new ethers.Wallet(
    "898d9011ca142b4b878e9b89ae5c071b53adb7137e9ec13a331336f96c18dbe2",
    provider
  );
  /*
  console.log(provider.address);
  console.log(default_admin.address);
  console.log(backend.address);
  console.log(foundation.address);
  console.log(governance.address);
  console.log(validator1.address);
  console.log(validator2.address);
  console.log(validator3.address);
  console.log(validator4.address);
  console.log(validator5.address);
  console.log(contentCreator.address);
  console.log(contentBuyer.address);
  console.log(juror1.address);
  console.log(juror2.address);
  console.log(juror3.address);
  */
  // FACTORIES
  let factoryRoleManager = await ethers.getContractFactory("RoleManager");
  let factoryUDAOVp = await ethers.getContractFactory("UDAOVp");
  let factoryUDAOTimelockController = await ethers.getContractFactory(
    "UDAOTimelockController"
  );
  let factoryUDAOCertificate = await ethers.getContractFactory(
    "UDAOCertificate"
  );
  let factoryUDAO = await ethers.getContractFactory("UDAO");
  let factoryUDAOStaker = await ethers.getContractFactory("UDAOStaker");
  let factoryValidationManager = await ethers.getContractFactory(
    "ValidationManager"
  );
  let factoryJurorManager = await ethers.getContractFactory("JurorManager");
  let factoryUDAOContent = await ethers.getContractFactory("UDAOContent");
  let factoryPlatformTreasury = await ethers.getContractFactory(
    "PlatformTreasury"
  );
  let factoryUDAOGovernor = await ethers.getContractFactory("UDAOGovernor");
  let factoryContractManager = await ethers.getContractFactory(
    "ContractManager"
  );

  //DEPLOYMENTS
  const contractUDAO = await factoryUDAO.deploy();
  await contractUDAO.deployed();
  console.log(`Deployed contractUDAO to ${contractUDAO.address}`);
  // await hre.run("verify:verify", {
  //   address: contractUDAO.address,
  //   constructorArguments: [
  //   ],
  // });
  // console.log(`npx hardhat verify --network mumbai ${contractUDAO.address}`);
  const contractRoleManager = await factoryRoleManager.deploy();
  await contractRoleManager.deployed();
  console.log(`Deployed contractRoleManager to ${contractRoleManager.address}`);

  // await hre.run("verify:verify", {
  //   address: contractRoleManager.address,
  //   constructorArguments: [],
  // });
  // console.log(
  //   `npx hardhat verify --network mumbai ${contractRoleManager.address}`
  // );
  const contractUDAOCertificate = await factoryUDAOCertificate.deploy(
    contractRoleManager.address
  );
  await contractUDAOCertificate.deployed();
  console.log(
    `Deployed contractUDAOCertificate to ${contractUDAOCertificate.address}`
  );

  // await hre.run("verify:verify", {
  //   address: contractUDAOCertificate.address,
  //   constructorArguments: [contractRoleManager.address],
  // });

  // console.log(
  //   `npx hardhat verify --network mumbai ${contractUDAOCertificate.address} ${contractRoleManager.address}`
  // );
  const contractUDAOContent = await factoryUDAOContent.deploy(
    contractRoleManager.address
  );
  await contractUDAOContent.deployed();
  console.log(`Deployed contractUDAOContent to ${contractUDAOContent.address}`);

  // await hre.run("verify:verify", {
  //   address: contractUDAOContent.address,
  //   constructorArguments: [contractRoleManager.address],
  // });

  // console.log(
  //   `npx hardhat verify --network mumbai ${contractUDAOContent.address} ${contractRoleManager.address}`
  // );
  const contractValidationManager = await factoryValidationManager.deploy(
    contractUDAOContent.address,
    contractRoleManager.address
  );
  await contractValidationManager.deployed();
  console.log(
    `Deployed contractValidationManager to ${contractValidationManager.address}`
  );

  // await hre.run("verify:verify", {
  //   address: contractValidationManager.address,
  //   constructorArguments: [
  //     contractUDAOContent.address,
  //     contractRoleManager.address,
  //   ],
  // });

  // console.log(
  //   `npx hardhat verify --network mumbai ${contractValidationManager.address} ${contractUDAOContent.address} ${contractRoleManager.address}`
  // );
  const contractJurorManager = await factoryJurorManager.deploy(
    contractRoleManager.address,
    contractUDAOContent.address,
    contractValidationManager.address
  );
  await contractJurorManager.deployed();
  console.log(
    `Deployed contractJurorManager to ${contractJurorManager.address}`
  );

  // await hre.run("verify:verify", {
  //   address: contractJurorManager.address,
  //   constructorArguments: [
  //     contractRoleManager.address,
  //     contractUDAOContent.address,
  //     contractValidationManager.address,
  //   ],
  // });

  // console.log(
  //   `npx hardhat verify --network mumbai ${contractJurorManager.address} ${contractRoleManager.address} ${contractUDAOContent.address} ${contractRoleManager.address}`
  // );
  const contractContractManager = await factoryContractManager.deploy(
    contractValidationManager.address,
    contractJurorManager.address,
    contractUDAO.address,
    contractUDAOContent.address,
    contractRoleManager.address
  );
  await contractContractManager.deployed();
  console.log(
    `Deployed contractContractManager to ${contractContractManager.address}`
  );

  // await hre.run("verify:verify", {
  //   address: contractContractManager.address,
  //   constructorArguments: [
  //     contractValidationManager.address,
  //     contractJurorManager.address,
  //     contractUDAO.address,
  //     contractUDAOContent.address,
  //     contractRoleManager.address,
  //   ],
  // });

  // console.log(
  //   `npx hardhat verify --network mumbai ${contractContractManager.address} ${contractValidationManager.address}
  //     ${contractJurorManager.address}
  //     ${contractUDAO.address}
  //     ${contractUDAOContent.address}
  //     ${contractRoleManager.address}
  //   `
  // );
  const contractUDAOVp = await factoryUDAOVp.deploy(
    contractRoleManager.address,
    contractContractManager.address
  );
  await contractUDAOVp.deployed();
  console.log(`Deployed contractUDAOVp to ${contractUDAOVp.address}`);

  // await hre.run("verify:verify", {
  //   address: factoryUDAOVp.address,
  //   constructorArguments: [
  //     contractRoleManager.address,
  //     contractContractManager.address,
  //   ],
  // });

  // console.log(
  //   `npx hardhat verify --network mumbai ${contractUDAOVp.address} ${contractRoleManager.address} ${contractContractManager.address}`
  // );
  const contractPlatformTreasury = await factoryPlatformTreasury.deploy(
    contractContractManager.address,
    contractRoleManager.address
  );
  await contractPlatformTreasury.deployed();
  console.log(
    `Deployed contractPlatformTreasury to ${contractPlatformTreasury.address}`
  );

  // await hre.run("verify:verify", {
  //   address: contractPlatformTreasury.address,
  //   constructorArguments: [
  //     contractContractManager.address,
  //     contractRoleManager.address,
  //   ],
  // });

  // console.log(
  //   `npx hardhat verify --network mumbai ${contractPlatformTreasury.address} ${contractContractManager.address} ${contractRoleManager.address}`
  // );
  const contractUDAOStaker = await factoryUDAOStaker.deploy(
    contractPlatformTreasury.address,
    contractRoleManager.address,
    contractUDAOVp.address,
    contractContractManager.address
  );
  await contractUDAOStaker.deployed();
  console.log(`Deployed contractUDAOStaker to ${contractUDAOStaker.address}`);

  // await hre.run("verify:verify", {
  //   address: contractUDAOStaker.address,
  //   constructorArguments: [
  //     contractPlatformTreasury.address,
  //     contractRoleManager.address,
  //     contractUDAOVp.address,
  //     contractContractManager.address,
  //   ],
  // });
  // console.log(
  //   `npx hardhat verify --network mumbai ${contractUDAOStaker.address} ${contractPlatformTreasury.address} ${contractRoleManager.address} ${contractUDAOVp.address}`
  // );
  const contractUDAOTimelockController =
    await factoryUDAOTimelockController.deploy(1, [], [foundation.address]);
  await contractUDAOTimelockController.deployed();
  console.log(
    `Deployed contractUDAOTimelockController to ${contractUDAOTimelockController.address}`
  );

  // await hre.run("verify:verify", {
  //   address: factoryUDAOTimelockController.address,
  //   constructorArguments: [1, [], [foundation.address]],
  // });
  // console.log(
  //   `npx hardhat verify --network mumbai ${contractUDAOTimelockController.address}`
  // );
  const contractUDAOGovernor = await factoryUDAOGovernor.deploy(
    contractUDAOVp.address,
    contractUDAOTimelockController.address,
    contractUDAOStaker.address,
    contractRoleManager.address
  );
  await contractUDAOGovernor.deployed();
  console.log(
    `Deployed contractUDAOGovernor to ${contractUDAOGovernor.address}`
  );

  // await hre.run("verify:verify", {
  //   address: contractUDAOTimelockController.address,
  //   constructorArguments: [
  //     contractUDAOVp.address,
  //     contractUDAOTimelockController.address,
  //     contractUDAOStaker.address,
  //     contractRoleManager.address,
  //   ],
  // });

  //POST DEPLOYMENT
  // add proposer
  const PROPOSER_ROLE = ethers.utils.keccak256(
    ethers.utils.toUtf8Bytes("PROPOSER_ROLE")
  );
  await contractUDAOTimelockController.grantRole(
    PROPOSER_ROLE,
    contractUDAOGovernor.address
  );
  console.log(`Added PROPOSER_ROLE to ${contractUDAOGovernor.address}`);

  // grant roles
  const BACKEND_ROLE = ethers.utils.keccak256(
    ethers.utils.toUtf8Bytes("BACKEND_ROLE")
  );
  await contractRoleManager.grantRole(BACKEND_ROLE, backend.address);
  console.log(`Added BACKEND_ROLE to ${backend.address}`);

  const FOUNDATION_ROLE = ethers.utils.keccak256(
    ethers.utils.toUtf8Bytes("FOUNDATION_ROLE")
  );

  await contractRoleManager.grantRole(FOUNDATION_ROLE, foundation.address);
  console.log(`Added FOUNDATION_ROLE to ${foundation.address}`);

  const STAKING_CONTRACT = ethers.utils.keccak256(
    ethers.utils.toUtf8Bytes("STAKING_CONTRACT")
  );
  await contractRoleManager.grantRole(
    STAKING_CONTRACT,
    contractUDAOStaker.address
  );
  console.log(`Added STAKING_CONTRACT to ${contractUDAOStaker.address}`);

  const GOVERNANCE_ROLE = ethers.utils.keccak256(
    ethers.utils.toUtf8Bytes("GOVERNANCE_ROLE")
  );

  await contractRoleManager.grantRole(
    GOVERNANCE_ROLE,
    contractUDAOTimelockController.address
  );
  console.log(
    `Added GOVERNANCE_ROLE to ${contractUDAOTimelockController.address}`
  );

  const VALIDATION_MANAGER = ethers.utils.keccak256(
    ethers.utils.toUtf8Bytes("VALIDATION_MANAGER")
  );

  const VALIDATOR_ROLE = ethers.utils.keccak256(
    ethers.utils.toUtf8Bytes("VALIDATOR_ROLE")
  );
  await contractRoleManager.grantRole(
    VALIDATION_MANAGER,
    contractValidationManager.address
  );
  console.log(
    `Added VALIDATION_MANAGER to ${contractValidationManager.address}`
  );
  await contractRoleManager.grantRole(VALIDATOR_ROLE, validator1.address);
  console.log(`Added VALIDATOR_ROLE to ${validator1.address}`);
  await contractRoleManager.grantRole(VALIDATOR_ROLE, validator2.address);
  console.log(`Added VALIDATOR_ROLE to ${validator2.address}`);
  await contractRoleManager.grantRole(VALIDATOR_ROLE, validator3.address);
  console.log(`Added VALIDATOR_ROLE to ${validator3.address}`);
  await contractRoleManager.grantRole(VALIDATOR_ROLE, validator4.address);
  console.log(`Added VALIDATOR_ROLE to ${validator4.address}`);
  await contractRoleManager.grantRole(VALIDATOR_ROLE, validator5.address);
  console.log(`Added VALIDATOR_ROLE to ${validator4.address}`);

  // add missing contract addresses to the contract manager
  await contractContractManager
    .connect(backend)
    .setAddressStaking(contractUDAOStaker.address);
  console.log(`Staking address is set to ${contractUDAOStaker.address}`);

  await contractContractManager
    .connect(backend)
    .setPlatformTreasuryAddress(contractPlatformTreasury.address);
  console.log(
    `Platform Treasury address is set to ${contractPlatformTreasury.address}`
  );

  await contractContractManager
    .connect(backend)
    .setAddressUdaoVp(contractUDAOVp.address);
  console.log(`UDAO-vp address is set to ${contractUDAOVp.address}`);

  await contractValidationManager
    .connect(foundation)
    .setStaker(contractUDAOStaker.address);
  console.log(`Staking address is set to ${contractUDAOStaker.address}`);

  // add staking contract to udao-vp
  await contractUDAOVp.connect(backend).updateAddresses();
  console.log("Addresses are updated");
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
