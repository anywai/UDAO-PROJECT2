const { expect } = require("chai");
const hardhat = require("hardhat");
const { ethers } = hardhat;
const chai = require("chai");
const BN = require("bn.js");
const bn = require("bignumber.js");
const helpers = require("@nomicfoundation/hardhat-network-helpers");
require("dotenv").config();
const {
  WMATIC_ABI,
  NonFunbiblePositionABI,
  NonFunbiblePositionAddress,
  WMATICAddress,
} = require("../lib/abis");

bn.config({ EXPONENTIAL_AT: 999999, DECIMAL_PLACES: 40 });

// Enable and inject BN dependency
chai.use(require("chai-bn")(BN));

async function deploy() {
  helpers.reset(
    "https://polygon-mainnet.g.alchemy.com/v2/OsNaN43nxvV85Kk1JpU-a5qduFwjcIGJ",
    40691400
  );
  const [owner, account1, account2, account3] = await ethers.getSigners();

  let factoryUDAO = await ethers.getContractFactory("UDAO");
  //DEPLOYMENTS
  const contractUDAO = await factoryUDAO.deploy();

  const address = "0xe7804c37c13166ff0b37f5ae0bb07a3aebb6e245";
  await helpers.impersonateAccount(address);
  const impersonatedSigner = await ethers.getSigner(address);

  await impersonatedSigner.sendTransaction({
    to: owner.address,
    value: ethers.utils.parseEther("1000000.0"), // Sends exactly 1000000.0 ether
  });

  const positionManager = await ethers.getContractAt(
    NonFunbiblePositionABI,
    NonFunbiblePositionAddress
  );

  // console.log("Find WMATIC");

  const WMATIC = await ethers.getContractAt(WMATIC_ABI, WMATICAddress);
  // console.log("Deposit MATIC for WMATIC");
  await WMATIC.connect(owner).deposit({
    value: ethers.utils.parseEther("1000.0"),
  });

  // console.log("Approve WMATIC");

  // call approve for tokens before adding a new pool
  await WMATIC.connect(owner).approve(
    positionManager.address,
    ethers.utils.parseEther("99999999.0")
  );

  // console.log("Approve UDAO");

  await contractUDAO
    .connect(owner)
    .approve(positionManager.address, ethers.utils.parseEther("9999999.0"));

  // console.log("Creating Pool");

  const tx = await positionManager
    .connect(owner)
    .createAndInitializePoolIfNecessary(
      WMATIC.address,
      contractUDAO.address,
      "3000",
      "250541420775534450580036817218"
    );
  const tx_2 = await positionManager
    .connect(owner)
    .mint([
      WMATIC.address,
      contractUDAO.address,
      "3000",
      "0",
      "23040",
      "950252822518485471",
      "9999999999999999991268",
      "0",
      "9963392298778452810744",
      owner.address,
      "1678352028999",
    ]);

  const factoryPriceGetter = await ethers.getContractFactory("PriceGetter");
  const contractPriceGetter = await factoryPriceGetter.deploy(
    "0x1F98431c8aD98523631AE4a59f267346ea31F984",
    contractUDAO.address,
    WMATICAddress,
    3000
  );

  return {
    owner,
    account1,
    account2,
    account3,
    contractUDAO,
    contractPriceGetter,
  };
}

describe("Uniswap DEX Tests", function () {
  it("Should deploy, create and fund a pool", async function () {
    const { owner, account1, account2, contractUDAO, whale } = await deploy();
  });

  it("Should create a pool", async function () {
    const {
      owner,
      account1,
      account2,
      account3,
      contractUDAO,
      whale,
      weth,
      nonfungiblePositionManager,
      contractPriceGetter,
    } = await deploy();

    // console.log("Deployed price getter");

    await helpers.time.increase(2);
    await helpers.time.increase(2);
    await helpers.time.increase(2);
    await helpers.time.increase(2);
    await helpers.time.increase(2);
    await helpers.time.increase(2);
    await helpers.time.increase(2);
    await helpers.time.increase(2);
    await helpers.time.increase(2);
    await helpers.time.increase(2);
    await helpers.time.increase(2);
    await helpers.time.increase(2);
    await helpers.time.increase(2);
    await helpers.time.increase(2);
    await helpers.time.increase(2);

    const out = await contractPriceGetter.getUdaoOut(
      ethers.utils.parseEther("1.0"),
      ethers.utils.keccak256(
        ethers.utils.toUtf8Bytes("eur")
      )
    );
    // console.log("Out is ", out);
  });
});
