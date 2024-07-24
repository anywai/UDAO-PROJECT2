require("solidity-docgen");
//require("@nomiclabs/hardhat-waffle");
require("hardhat-contract-sizer");
//require("solidity-coverage");
//require("hardhat-gas-reporter");
require("dotenv").config();
//require("@nomiclabs/hardhat-ethers");
//require("@nomiclabs/hardhat-etherscan");
require("hardhat-contract-sizer");
//require("@nomicfoundation/hardhat-ignition-ethers");
//require("@nomicfoundation/hardhat-chai-matchers");
require("@nomicfoundation/hardhat-toolbox");

const {
  POLYGON_TEST_RPC_PROVIDER,
  TEST_PRIVATE_KEY,
  TEST_FOUND_PRIVATE_KEY,
  MAINNET_PRIVATE_KEY,
  MAINNET_FOUND_PRIVATE_KEY,
  POLYGON_RPC_PROVIDER,
  POLYGONSCAN_API_KEY,
} = process.env;

// This is a sample Hardhat task. To learn how to create your own go to
// https://hardhat.org/guides/create-task.html
task("accounts", "Prints the list of accounts", async (taskArgs, hre) => {
  const accounts = await hre.ethers.getSigners();

  for (const account of accounts) {
    console.log(account.address);
  }
});

// You need to export an object to set up your config
// Go to https://hardhat.org/config/ to learn more

/**
 * @type import('hardhat/config').HardhatUserConfig
 */

module.exports = {
  docgen: { pages: "files" },
  networks: {
    hardhat: {
      live: false,
      chainId: 31337,
      allowUnlimitedContractSize: true,
      accounts: {
        count: 50,
      },
    },
    localhost: {
      allowUnlimitedContractSize: true,
    },
    amoy: {
      url: POLYGON_TEST_RPC_PROVIDER,
      accounts: [`0x${TEST_PRIVATE_KEY}`, `0x${TEST_FOUND_PRIVATE_KEY}`],
      gasPrice: 50000000000,
    },
    polygon: {
      url: POLYGON_RPC_PROVIDER,
      accounts: [`0x${MAINNET_PRIVATE_KEY}`, `0x${MAINNET_FOUND_PRIVATE_KEY}`],
    },
  },
  ignition: {
    blockPollingInterval: 1_000,
    timeBeforeBumpingFees: 3 * 60 * 1_000,
    maxFeePerGasLimit: 50_000_000_000n, // 50 gwei
    maxPriorityFeePerGas: 2_000_000_000n, // 2 gwei
    maxFeeBumps: 4,
    requiredConfirmations: 5,
    modules: {
      // Modüllerinizi buraya ekleyebilirsiniz
    },
  },
  gasReporter: {
    enabled: false,
    currency: "EUR",
    coinmarketcap: "9b067bab-555e-4a2e-8b46-3ddbf5254166",
    token: "MATIC",
    gasPriceApi: "https://api.polygonscan.com/api?module=proxy&action=eth_gasPrice",
  },
  solidity: {
    version: "0.8.17",
    settings: {
      optimizer: {
        enabled: true,
        runs: 20,
        details: {
          yul: true,
        },
      },
    },
  },
  etherscan: {
    apiKey: {
      amoy: POLYGONSCAN_API_KEY,
    },
    sourcify: {
      // Disabled by default
      // Doesn't need an API key
      // Should be true to verify contracts
      enabled: true,
    },
    customChains: [
      {
        network: "amoy",
        chainId: 80002,
        urls: {
          apiURL: "https://api-amoy.polygonscan.com/api",
          browserURL: "https://amoy.polygonscan.com/",
        },
      },
    ],
  },
};
