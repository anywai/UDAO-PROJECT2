require("solidity-docgen");
require("@nomiclabs/hardhat-waffle");
require("hardhat-contract-sizer");
require("solidity-coverage");
require("hardhat-gas-reporter");
require("dotenv").config();
require("@nomiclabs/hardhat-ethers");
require("@nomiclabs/hardhat-etherscan");
require("hardhat-contract-sizer");

const { POLYGON_MUMBAI_RPC_PROVIDER, PRIVATE_KEY, POLYGON_RPC_PROVIDER, POLYGONSCAN_API_KEY } = process.env;

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
    mumbai: {
      url: POLYGON_MUMBAI_RPC_PROVIDER,
      accounts: [`0x${PRIVATE_KEY}`],
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
  etherscan: { apiKey: POLYGONSCAN_API_KEY },
};
