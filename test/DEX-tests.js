const { expect } = require("chai");
const hardhat = require("hardhat");
const { ethers } = hardhat;
const chai = require("chai");
const BN = require("bn.js");
const bn = require("bignumber.js");
const helpers = require("@nomicfoundation/hardhat-network-helpers");
require("dotenv").config();

bn.config({ EXPONENTIAL_AT: 999999, DECIMAL_PLACES: 40 });
const {
  Pool,
  Position,
  nearestUsableTick,
  TickMath,
} = require("@uniswap/v3-sdk");

function encodePriceSqrt(reserve1, reserve0) {
  return ethers.BigNumber.from(
    new bn(reserve1.toString())
      .div(reserve0.toString())
      .sqrt()
      .multipliedBy(new bn(2).pow(96))
      .integerValue(3)
      .toString()
  );
}

async function getPoolData(poolContract) {
  const [tickSpacing, fee, liquidity, slot0] = await Promise.all([
    poolContract.tickSpacing(),
    poolContract.fee(),
    poolContract.liquidity(),
    poolContract.slot0(),
  ]);

  return {
    tickSpacing: tickSpacing,
    fee: fee,
    liquidity: liquidity,
    sqrtPriceX96: slot0[0],
    tick: slot0[1],
  };
}

// Enable and inject BN dependency
chai.use(require("chai-bn")(BN));

async function deploy() {
  const provider = new ethers.providers.AlchemyProvider(
    "homestead",
    process.env.ALCHEMY_API_KEY
  );
  const [owner, account1, account2, account3] = await ethers.getSigners();

  await helpers.takeSnapshot();

  let factoryUDAO = await ethers.getContractFactory("UDAO");
  //DEPLOYMENTS
  const contractUDAO = await factoryUDAO.deploy();

  const address = "0x907f2e1F4A477319A700fC9a28374BA47527050e";
  await helpers.impersonateAccount(address);
  const impersonatedSigner = await ethers.getSigner(address);

  await impersonatedSigner.sendTransaction({
    to: owner.address,
    value: ethers.utils.parseEther("1000000.0"), // Sends exactly 1000000.0 ether
  });

  return {
    owner,
    account1,
    account2,
    account3,
    contractUDAO,
  };
}

describe("Uniswap DEX Tests", function () {
  it("Should deploy, create and fund a pool", async function () {
    const { owner, account1, account2, contractUDAO, whale } = await deploy();
    await helpers.takeSnapshot.SnapshotRestorer();
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
    } = await deploy();

    console.log("Read ABIs");

    const NonFunbiblePositionABI = [
      {
        inputs: [
          { internalType: "address", name: "_factory", type: "address" },
          { internalType: "address", name: "_WETH9", type: "address" },
          {
            internalType: "address",
            name: "_tokenDescriptor_",
            type: "address",
          },
        ],
        stateMutability: "nonpayable",
        type: "constructor",
      },
      {
        anonymous: false,
        inputs: [
          {
            indexed: true,
            internalType: "address",
            name: "owner",
            type: "address",
          },
          {
            indexed: true,
            internalType: "address",
            name: "approved",
            type: "address",
          },
          {
            indexed: true,
            internalType: "uint256",
            name: "tokenId",
            type: "uint256",
          },
        ],
        name: "Approval",
        type: "event",
      },
      {
        anonymous: false,
        inputs: [
          {
            indexed: true,
            internalType: "address",
            name: "owner",
            type: "address",
          },
          {
            indexed: true,
            internalType: "address",
            name: "operator",
            type: "address",
          },
          {
            indexed: false,
            internalType: "bool",
            name: "approved",
            type: "bool",
          },
        ],
        name: "ApprovalForAll",
        type: "event",
      },
      {
        anonymous: false,
        inputs: [
          {
            indexed: true,
            internalType: "uint256",
            name: "tokenId",
            type: "uint256",
          },
          {
            indexed: false,
            internalType: "address",
            name: "recipient",
            type: "address",
          },
          {
            indexed: false,
            internalType: "uint256",
            name: "amount0",
            type: "uint256",
          },
          {
            indexed: false,
            internalType: "uint256",
            name: "amount1",
            type: "uint256",
          },
        ],
        name: "Collect",
        type: "event",
      },
      {
        anonymous: false,
        inputs: [
          {
            indexed: true,
            internalType: "uint256",
            name: "tokenId",
            type: "uint256",
          },
          {
            indexed: false,
            internalType: "uint128",
            name: "liquidity",
            type: "uint128",
          },
          {
            indexed: false,
            internalType: "uint256",
            name: "amount0",
            type: "uint256",
          },
          {
            indexed: false,
            internalType: "uint256",
            name: "amount1",
            type: "uint256",
          },
        ],
        name: "DecreaseLiquidity",
        type: "event",
      },
      {
        anonymous: false,
        inputs: [
          {
            indexed: true,
            internalType: "uint256",
            name: "tokenId",
            type: "uint256",
          },
          {
            indexed: false,
            internalType: "uint128",
            name: "liquidity",
            type: "uint128",
          },
          {
            indexed: false,
            internalType: "uint256",
            name: "amount0",
            type: "uint256",
          },
          {
            indexed: false,
            internalType: "uint256",
            name: "amount1",
            type: "uint256",
          },
        ],
        name: "IncreaseLiquidity",
        type: "event",
      },
      {
        anonymous: false,
        inputs: [
          {
            indexed: true,
            internalType: "address",
            name: "from",
            type: "address",
          },
          {
            indexed: true,
            internalType: "address",
            name: "to",
            type: "address",
          },
          {
            indexed: true,
            internalType: "uint256",
            name: "tokenId",
            type: "uint256",
          },
        ],
        name: "Transfer",
        type: "event",
      },
      {
        inputs: [],
        name: "DOMAIN_SEPARATOR",
        outputs: [{ internalType: "bytes32", name: "", type: "bytes32" }],
        stateMutability: "view",
        type: "function",
      },
      {
        inputs: [],
        name: "PERMIT_TYPEHASH",
        outputs: [{ internalType: "bytes32", name: "", type: "bytes32" }],
        stateMutability: "view",
        type: "function",
      },
      {
        inputs: [],
        name: "WETH9",
        outputs: [{ internalType: "address", name: "", type: "address" }],
        stateMutability: "view",
        type: "function",
      },
      {
        inputs: [
          { internalType: "address", name: "to", type: "address" },
          { internalType: "uint256", name: "tokenId", type: "uint256" },
        ],
        name: "approve",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function",
      },
      {
        inputs: [{ internalType: "address", name: "owner", type: "address" }],
        name: "balanceOf",
        outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
        stateMutability: "view",
        type: "function",
      },
      {
        inputs: [],
        name: "baseURI",
        outputs: [{ internalType: "string", name: "", type: "string" }],
        stateMutability: "pure",
        type: "function",
      },
      {
        inputs: [{ internalType: "uint256", name: "tokenId", type: "uint256" }],
        name: "burn",
        outputs: [],
        stateMutability: "payable",
        type: "function",
      },
      {
        inputs: [
          {
            components: [
              { internalType: "uint256", name: "tokenId", type: "uint256" },
              { internalType: "address", name: "recipient", type: "address" },
              { internalType: "uint128", name: "amount0Max", type: "uint128" },
              { internalType: "uint128", name: "amount1Max", type: "uint128" },
            ],
            internalType: "struct INonfungiblePositionManager.CollectParams",
            name: "params",
            type: "tuple",
          },
        ],
        name: "collect",
        outputs: [
          { internalType: "uint256", name: "amount0", type: "uint256" },
          { internalType: "uint256", name: "amount1", type: "uint256" },
        ],
        stateMutability: "payable",
        type: "function",
      },
      {
        inputs: [
          { internalType: "address", name: "token0", type: "address" },
          { internalType: "address", name: "token1", type: "address" },
          { internalType: "uint24", name: "fee", type: "uint24" },
          { internalType: "uint160", name: "sqrtPriceX96", type: "uint160" },
        ],
        name: "createAndInitializePoolIfNecessary",
        outputs: [{ internalType: "address", name: "pool", type: "address" }],
        stateMutability: "payable",
        type: "function",
      },
      {
        inputs: [
          {
            components: [
              { internalType: "uint256", name: "tokenId", type: "uint256" },
              { internalType: "uint128", name: "liquidity", type: "uint128" },
              { internalType: "uint256", name: "amount0Min", type: "uint256" },
              { internalType: "uint256", name: "amount1Min", type: "uint256" },
              { internalType: "uint256", name: "deadline", type: "uint256" },
            ],
            internalType:
              "struct INonfungiblePositionManager.DecreaseLiquidityParams",
            name: "params",
            type: "tuple",
          },
        ],
        name: "decreaseLiquidity",
        outputs: [
          { internalType: "uint256", name: "amount0", type: "uint256" },
          { internalType: "uint256", name: "amount1", type: "uint256" },
        ],
        stateMutability: "payable",
        type: "function",
      },
      {
        inputs: [],
        name: "factory",
        outputs: [{ internalType: "address", name: "", type: "address" }],
        stateMutability: "view",
        type: "function",
      },
      {
        inputs: [{ internalType: "uint256", name: "tokenId", type: "uint256" }],
        name: "getApproved",
        outputs: [{ internalType: "address", name: "", type: "address" }],
        stateMutability: "view",
        type: "function",
      },
      {
        inputs: [
          {
            components: [
              { internalType: "uint256", name: "tokenId", type: "uint256" },
              {
                internalType: "uint256",
                name: "amount0Desired",
                type: "uint256",
              },
              {
                internalType: "uint256",
                name: "amount1Desired",
                type: "uint256",
              },
              { internalType: "uint256", name: "amount0Min", type: "uint256" },
              { internalType: "uint256", name: "amount1Min", type: "uint256" },
              { internalType: "uint256", name: "deadline", type: "uint256" },
            ],
            internalType:
              "struct INonfungiblePositionManager.IncreaseLiquidityParams",
            name: "params",
            type: "tuple",
          },
        ],
        name: "increaseLiquidity",
        outputs: [
          { internalType: "uint128", name: "liquidity", type: "uint128" },
          { internalType: "uint256", name: "amount0", type: "uint256" },
          { internalType: "uint256", name: "amount1", type: "uint256" },
        ],
        stateMutability: "payable",
        type: "function",
      },
      {
        inputs: [
          { internalType: "address", name: "owner", type: "address" },
          { internalType: "address", name: "operator", type: "address" },
        ],
        name: "isApprovedForAll",
        outputs: [{ internalType: "bool", name: "", type: "bool" }],
        stateMutability: "view",
        type: "function",
      },
      {
        inputs: [
          {
            components: [
              { internalType: "address", name: "token0", type: "address" },
              { internalType: "address", name: "token1", type: "address" },
              { internalType: "uint24", name: "fee", type: "uint24" },
              { internalType: "int24", name: "tickLower", type: "int24" },
              { internalType: "int24", name: "tickUpper", type: "int24" },
              {
                internalType: "uint256",
                name: "amount0Desired",
                type: "uint256",
              },
              {
                internalType: "uint256",
                name: "amount1Desired",
                type: "uint256",
              },
              { internalType: "uint256", name: "amount0Min", type: "uint256" },
              { internalType: "uint256", name: "amount1Min", type: "uint256" },
              { internalType: "address", name: "recipient", type: "address" },
              { internalType: "uint256", name: "deadline", type: "uint256" },
            ],
            internalType: "struct INonfungiblePositionManager.MintParams",
            name: "params",
            type: "tuple",
          },
        ],
        name: "mint",
        outputs: [
          { internalType: "uint256", name: "tokenId", type: "uint256" },
          { internalType: "uint128", name: "liquidity", type: "uint128" },
          { internalType: "uint256", name: "amount0", type: "uint256" },
          { internalType: "uint256", name: "amount1", type: "uint256" },
        ],
        stateMutability: "payable",
        type: "function",
      },
      {
        inputs: [{ internalType: "bytes[]", name: "data", type: "bytes[]" }],
        name: "multicall",
        outputs: [
          { internalType: "bytes[]", name: "results", type: "bytes[]" },
        ],
        stateMutability: "payable",
        type: "function",
      },
      {
        inputs: [],
        name: "name",
        outputs: [{ internalType: "string", name: "", type: "string" }],
        stateMutability: "view",
        type: "function",
      },
      {
        inputs: [{ internalType: "uint256", name: "tokenId", type: "uint256" }],
        name: "ownerOf",
        outputs: [{ internalType: "address", name: "", type: "address" }],
        stateMutability: "view",
        type: "function",
      },
      {
        inputs: [
          { internalType: "address", name: "spender", type: "address" },
          { internalType: "uint256", name: "tokenId", type: "uint256" },
          { internalType: "uint256", name: "deadline", type: "uint256" },
          { internalType: "uint8", name: "v", type: "uint8" },
          { internalType: "bytes32", name: "r", type: "bytes32" },
          { internalType: "bytes32", name: "s", type: "bytes32" },
        ],
        name: "permit",
        outputs: [],
        stateMutability: "payable",
        type: "function",
      },
      {
        inputs: [{ internalType: "uint256", name: "tokenId", type: "uint256" }],
        name: "positions",
        outputs: [
          { internalType: "uint96", name: "nonce", type: "uint96" },
          { internalType: "address", name: "operator", type: "address" },
          { internalType: "address", name: "token0", type: "address" },
          { internalType: "address", name: "token1", type: "address" },
          { internalType: "uint24", name: "fee", type: "uint24" },
          { internalType: "int24", name: "tickLower", type: "int24" },
          { internalType: "int24", name: "tickUpper", type: "int24" },
          { internalType: "uint128", name: "liquidity", type: "uint128" },
          {
            internalType: "uint256",
            name: "feeGrowthInside0LastX128",
            type: "uint256",
          },
          {
            internalType: "uint256",
            name: "feeGrowthInside1LastX128",
            type: "uint256",
          },
          { internalType: "uint128", name: "tokensOwed0", type: "uint128" },
          { internalType: "uint128", name: "tokensOwed1", type: "uint128" },
        ],
        stateMutability: "view",
        type: "function",
      },
      {
        inputs: [],
        name: "refundETH",
        outputs: [],
        stateMutability: "payable",
        type: "function",
      },
      {
        inputs: [
          { internalType: "address", name: "from", type: "address" },
          { internalType: "address", name: "to", type: "address" },
          { internalType: "uint256", name: "tokenId", type: "uint256" },
        ],
        name: "safeTransferFrom",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function",
      },
      {
        inputs: [
          { internalType: "address", name: "from", type: "address" },
          { internalType: "address", name: "to", type: "address" },
          { internalType: "uint256", name: "tokenId", type: "uint256" },
          { internalType: "bytes", name: "_data", type: "bytes" },
        ],
        name: "safeTransferFrom",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function",
      },
      {
        inputs: [
          { internalType: "address", name: "token", type: "address" },
          { internalType: "uint256", name: "value", type: "uint256" },
          { internalType: "uint256", name: "deadline", type: "uint256" },
          { internalType: "uint8", name: "v", type: "uint8" },
          { internalType: "bytes32", name: "r", type: "bytes32" },
          { internalType: "bytes32", name: "s", type: "bytes32" },
        ],
        name: "selfPermit",
        outputs: [],
        stateMutability: "payable",
        type: "function",
      },
      {
        inputs: [
          { internalType: "address", name: "token", type: "address" },
          { internalType: "uint256", name: "nonce", type: "uint256" },
          { internalType: "uint256", name: "expiry", type: "uint256" },
          { internalType: "uint8", name: "v", type: "uint8" },
          { internalType: "bytes32", name: "r", type: "bytes32" },
          { internalType: "bytes32", name: "s", type: "bytes32" },
        ],
        name: "selfPermitAllowed",
        outputs: [],
        stateMutability: "payable",
        type: "function",
      },
      {
        inputs: [
          { internalType: "address", name: "token", type: "address" },
          { internalType: "uint256", name: "nonce", type: "uint256" },
          { internalType: "uint256", name: "expiry", type: "uint256" },
          { internalType: "uint8", name: "v", type: "uint8" },
          { internalType: "bytes32", name: "r", type: "bytes32" },
          { internalType: "bytes32", name: "s", type: "bytes32" },
        ],
        name: "selfPermitAllowedIfNecessary",
        outputs: [],
        stateMutability: "payable",
        type: "function",
      },
      {
        inputs: [
          { internalType: "address", name: "token", type: "address" },
          { internalType: "uint256", name: "value", type: "uint256" },
          { internalType: "uint256", name: "deadline", type: "uint256" },
          { internalType: "uint8", name: "v", type: "uint8" },
          { internalType: "bytes32", name: "r", type: "bytes32" },
          { internalType: "bytes32", name: "s", type: "bytes32" },
        ],
        name: "selfPermitIfNecessary",
        outputs: [],
        stateMutability: "payable",
        type: "function",
      },
      {
        inputs: [
          { internalType: "address", name: "operator", type: "address" },
          { internalType: "bool", name: "approved", type: "bool" },
        ],
        name: "setApprovalForAll",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function",
      },
      {
        inputs: [
          { internalType: "bytes4", name: "interfaceId", type: "bytes4" },
        ],
        name: "supportsInterface",
        outputs: [{ internalType: "bool", name: "", type: "bool" }],
        stateMutability: "view",
        type: "function",
      },
      {
        inputs: [
          { internalType: "address", name: "token", type: "address" },
          { internalType: "uint256", name: "amountMinimum", type: "uint256" },
          { internalType: "address", name: "recipient", type: "address" },
        ],
        name: "sweepToken",
        outputs: [],
        stateMutability: "payable",
        type: "function",
      },
      {
        inputs: [],
        name: "symbol",
        outputs: [{ internalType: "string", name: "", type: "string" }],
        stateMutability: "view",
        type: "function",
      },
      {
        inputs: [{ internalType: "uint256", name: "index", type: "uint256" }],
        name: "tokenByIndex",
        outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
        stateMutability: "view",
        type: "function",
      },
      {
        inputs: [
          { internalType: "address", name: "owner", type: "address" },
          { internalType: "uint256", name: "index", type: "uint256" },
        ],
        name: "tokenOfOwnerByIndex",
        outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
        stateMutability: "view",
        type: "function",
      },
      {
        inputs: [{ internalType: "uint256", name: "tokenId", type: "uint256" }],
        name: "tokenURI",
        outputs: [{ internalType: "string", name: "", type: "string" }],
        stateMutability: "view",
        type: "function",
      },
      {
        inputs: [],
        name: "totalSupply",
        outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
        stateMutability: "view",
        type: "function",
      },
      {
        inputs: [
          { internalType: "address", name: "from", type: "address" },
          { internalType: "address", name: "to", type: "address" },
          { internalType: "uint256", name: "tokenId", type: "uint256" },
        ],
        name: "transferFrom",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function",
      },
      {
        inputs: [
          { internalType: "uint256", name: "amount0Owed", type: "uint256" },
          { internalType: "uint256", name: "amount1Owed", type: "uint256" },
          { internalType: "bytes", name: "data", type: "bytes" },
        ],
        name: "uniswapV3MintCallback",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function",
      },
      {
        inputs: [
          { internalType: "uint256", name: "amountMinimum", type: "uint256" },
          { internalType: "address", name: "recipient", type: "address" },
        ],
        name: "unwrapWETH9",
        outputs: [],
        stateMutability: "payable",
        type: "function",
      },
      { stateMutability: "payable", type: "receive" },
    ];
    const IWMATIC_ABI = [
      {
        constant: true,
        inputs: [],
        name: "name",
        outputs: [{ name: "", type: "string" }],
        payable: false,
        stateMutability: "view",
        type: "function",
      },
      {
        constant: false,
        inputs: [
          { name: "guy", type: "address" },
          { name: "wad", type: "uint256" },
        ],
        name: "approve",
        outputs: [{ name: "", type: "bool" }],
        payable: false,
        stateMutability: "nonpayable",
        type: "function",
      },
      {
        constant: true,
        inputs: [],
        name: "totalSupply",
        outputs: [{ name: "", type: "uint256" }],
        payable: false,
        stateMutability: "view",
        type: "function",
      },
      {
        constant: false,
        inputs: [
          { name: "src", type: "address" },
          { name: "dst", type: "address" },
          { name: "wad", type: "uint256" },
        ],
        name: "transferFrom",
        outputs: [{ name: "", type: "bool" }],
        payable: false,
        stateMutability: "nonpayable",
        type: "function",
      },
      {
        constant: false,
        inputs: [{ name: "wad", type: "uint256" }],
        name: "withdraw",
        outputs: [],
        payable: false,
        stateMutability: "nonpayable",
        type: "function",
      },
      {
        constant: true,
        inputs: [],
        name: "decimals",
        outputs: [{ name: "", type: "uint8" }],
        payable: false,
        stateMutability: "view",
        type: "function",
      },
      {
        constant: true,
        inputs: [{ name: "", type: "address" }],
        name: "balanceOf",
        outputs: [{ name: "", type: "uint256" }],
        payable: false,
        stateMutability: "view",
        type: "function",
      },
      {
        constant: true,
        inputs: [],
        name: "symbol",
        outputs: [{ name: "", type: "string" }],
        payable: false,
        stateMutability: "view",
        type: "function",
      },
      {
        constant: false,
        inputs: [
          { name: "dst", type: "address" },
          { name: "wad", type: "uint256" },
        ],
        name: "transfer",
        outputs: [{ name: "", type: "bool" }],
        payable: false,
        stateMutability: "nonpayable",
        type: "function",
      },
      {
        constant: false,
        inputs: [],
        name: "deposit",
        outputs: [],
        payable: true,
        stateMutability: "payable",
        type: "function",
      },
      {
        constant: true,
        inputs: [
          { name: "", type: "address" },
          { name: "", type: "address" },
        ],
        name: "allowance",
        outputs: [{ name: "", type: "uint256" }],
        payable: false,
        stateMutability: "view",
        type: "function",
      },
      { payable: true, stateMutability: "payable", type: "fallback" },
      {
        anonymous: false,
        inputs: [
          { indexed: true, name: "src", type: "address" },
          { indexed: true, name: "guy", type: "address" },
          { indexed: false, name: "wad", type: "uint256" },
        ],
        name: "Approval",
        type: "event",
      },
      {
        anonymous: false,
        inputs: [
          { indexed: true, name: "src", type: "address" },
          { indexed: true, name: "dst", type: "address" },
          { indexed: false, name: "wad", type: "uint256" },
        ],
        name: "Transfer",
        type: "event",
      },
      {
        anonymous: false,
        inputs: [
          { indexed: true, name: "dst", type: "address" },
          { indexed: false, name: "wad", type: "uint256" },
        ],
        name: "Deposit",
        type: "event",
      },
      {
        anonymous: false,
        inputs: [
          { indexed: true, name: "src", type: "address" },
          { indexed: false, name: "wad", type: "uint256" },
        ],
        name: "Withdrawal",
        type: "event",
      },
    ];

    console.log("Find Positin Manager");

    const positionManager = await ethers.getContractAt(
      NonFunbiblePositionABI,
      "0xC36442b4a4522E871399CD717aBDD847Ab11FE88"
    );

    console.log("Find WMATIC");

    const WMATIC = await ethers.getContractAt(
      IWMATIC_ABI,
      "0x9c3C9283D3e44854697Cd22D3Faa240Cfb032889"
    );
    console.log("Deposit MATIC for WMATIC");
    await WMATIC.connect(owner).deposit({
      value: ethers.utils.parseEther("1000.0"),
    });

    console.log("Approve WMATIC");

    // call approve for tokens before adding a new pool
    await WMATIC.connect(owner).approve(
      positionManager.address,
      ethers.utils.parseEther("99999999.0")
    );

    console.log("Approve UDAO");

    await contractUDAO
      .connect(owner)
      .approve(positionManager.address, ethers.utils.parseEther("9999999.0"));

    console.log("Creating Pool");

    const tx = await positionManager
      .connect(owner)
      .createAndInitializePoolIfNecessary(
        WMATIC.address,
        contractUDAO.address,
        "3000",
        "250541420775534450580036817218"
      );

    const result = await tx.wait();
    console.log("Result is", result);
    console.log("Created pool");
    console.log("Minting position");
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
    const result_2 = await tx_2.wait();
    console.log("Result 2 is", result_2);
    console.log("Minted position");

    console.log("Deploying price getter");

    let factoryPriceGetter = await ethers.getContractFactory("PriceGetter");
    const contractPriceGetter = await factoryPriceGetter.deploy(
      "0x1F98431c8aD98523631AE4a59f267346ea31F984",
      contractUDAO.address,
      "0x9c3C9283D3e44854697Cd22D3Faa240Cfb032889",
      3000
    );
    console.log("Deployed price getter");

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
      WMATIC.address,
      ethers.utils.parseEther("1.0")
    );
    console.log("Out is ", out);
    await helpers.takeSnapshot.SnapshotRestorer();
  });
});
