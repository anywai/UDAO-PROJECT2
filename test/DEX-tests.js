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

async function deploy(isDexRequired = false) {
  if (isDexRequired) {
    helpers.reset(
      "https://polygon-mainnet.g.alchemy.com/v2/OsNaN43nxvV85Kk1JpU-a5qduFwjcIGJ",
      40691400
    );
  }

  const [backend, account1, account2, account3] = await ethers.getSigners();

  let factoryUDAO = await ethers.getContractFactory("UDAO");
  //DEPLOYMENTS
  const contractUDAO = await factoryUDAO.deploy();

  // Deploys PriceGetter
  if (isDexRequired) {
    const positionManager = await ethers.getContractAt(
      NonFunbiblePositionABI,
      "0xC36442b4a4522E871399CD717aBDD847Ab11FE88"
    );
    await helpers.setBalance(
      backend.address,
      ethers.utils.parseEther("1000000.0")
    );
    const WMATIC = await ethers.getContractAt(WMATIC_ABI, WMATICAddress);
    await WMATIC.connect(backend).deposit({
      value: ethers.utils.parseEther("1000.0"),
    });

    // call approve for tokens before adding a new pool

    await WMATIC.connect(backend).approve(
      positionManager.address,
      ethers.utils.parseEther("99999999.0")
    );

    await contractUDAO
      .connect(backend)
      .approve(positionManager.address, ethers.utils.parseEther("9999999.0"));

    const tx = await positionManager
      .connect(backend)
      .createAndInitializePoolIfNecessary(
        WMATIC.address,
        contractUDAO.address,
        "3000",
        "250541420775534450580036817218"
      );
    const result = await tx.wait();
    const tx_2 = await positionManager
      .connect(backend)
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
        backend.address,
        "1678352028999",
      ]);
    const result_2 = await tx_2.wait();

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

    // Price Getter End
  }

  let factoryRoleManager = await ethers.getContractFactory("RoleManager");
  let factoryPriceGetter = await ethers.getContractFactory("PriceGetter");

  const contractRoleManager = await factoryRoleManager.deploy();
  let contractPriceGetter;
  if (isDexRequired) {
    contractPriceGetter = await factoryPriceGetter.deploy(
      "0x1F98431c8aD98523631AE4a59f267346ea31F984",
      contractUDAO.address,
      "0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270",
      3000,
      contractRoleManager.address
    );
  } else {
    contractPriceGetter = { address: ethers.constants.AddressZero };
  }

  return {
    backend,
    account1,
    account2,
    account3,
    contractUDAO,
    contractPriceGetter,
  };
}

describe("Uniswap DEX Tests", function () {
  it("Should deploy, create and fund a pool", async function () {
    const { backend, account1, account2, contractUDAO, whale } = await deploy(
      true
    );
  });

  it("Should create a pool", async function () {
    const {
      backend,
      account1,
      account2,
      account3,
      contractUDAO,
      whale,
      weth,
      nonfungiblePositionManager,
      contractPriceGetter,
    } = await deploy(true);

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
      ethers.utils.keccak256(ethers.utils.toUtf8Bytes("eur"))
    );
    // console.log("Out is ", out);
  });
});
