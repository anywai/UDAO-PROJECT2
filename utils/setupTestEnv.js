const { ethers } = require("hardhat");

// Initializes the test environment: assigns global wallets and contract placeholders
async function initTestEnv({ walletNames = [], contractNames = [] }) {
  // Retrieve available signers provided by Hardhat
  const signers = await ethers.getSigners();
  // Create empty user and contract containers
  const users = {};
  const contracts = {};

  // Ensure "backend" is always included as the first wallet
  const finalWalletLabels = walletNames.includes("backend") ? walletNames : ["backend", ...walletNames];

  // Map each label to a signer and populate the users object
  finalWalletLabels.forEach((label, index) => {
    // Ensure there's a signer available for this label
    if (!signers[index]) {
      throw new Error(`Signer "${label}" is not available at index ${index}`);
    }
    users[label] = signers[index];
  });

  // Expose users globally: accessible via globalThis.users and globalThis.<label>
  globalThis.users = users;
  Object.entries(users).forEach(([label, signer]) => {
    globalThis[label] = signer;
  });

  // Initialize contracts object and expose it globally
  contractNames.forEach((name) => (contracts[name] = null));
  globalThis.contracts = contracts;
}

// Registers deployed contract instances to global scope and `contracts` object
function assignContracts(contractMap) {
  // Assign each contract instance to globalThis and contracts object
  Object.entries(contractMap).forEach(([name, instance]) => {
    contracts[name] = instance;
    globalThis.contracts[name] = instance; // ✔ contracts.x erişimi
    globalThis[name] = instance; // ✔ global.x erişimi
  });
}

// Transfers tokens to a list of users and optionally sets approval to a spender
async function batchDistributeTokens({ token, users, amount, from = users.backend, skip = [], spenderAddress = "" }) {
  const parsedAmount = ethers.parseEther(amount);
  const userList = Object.values(users);

  // Iterate through each user
  for (const user of userList) {
    // Skip the sender's own wallet
    if (user.address === from.address) continue;
    // Skip if user address is in the exclusion list
    if (skip.includes(user.address)) continue;
    // Transfer tokens from sender to user
    await token.connect(from).transfer(user.address, parsedAmount);
    // If spender is provided, set approval for the spender on behalf of user
    if (spenderAddress) {
      await token.connect(user).approve(spenderAddress, parsedAmount);
    }
  }
}

// Allows a group of users to approve a spender for a given token
async function batchApproveSpender({ token, users, spenderAddress, amount, skip = [] }) {
  const parsedAmount = ethers.parseEther(amount);
  const userList = Object.values(users);

  // Iterate through each user
  for (const user of userList) {
    // Skip if user is in the exclusion list
    if (skip.includes(user.address)) continue;
    // Approve the spender to spend the specified amount
    await token.connect(user).approve(spenderAddress, parsedAmount);
  }
}

module.exports = {
  initTestEnv,
  assignContracts,
  batchDistributeTokens,
  batchApproveSpender,
};
