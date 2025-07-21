const { ethers } = require("hardhat");

// Initializes the test environment: assigns global wallets and contract placeholders
async function initTestEnv({ walletNames = [], contractNames = [] }) {
  // Get all available signers from Hardhat
  const signers = await ethers.getSigners();
  // Ensure "backend" is always the first wallet
  const finalWalletLabels = walletNames.includes("backend") ? walletNames : ["backend", ...walletNames];
  // Map each wallet label to its signer and assign to global scope (e.g., globalThis.instructor1)
  finalWalletLabels.forEach((label, index) => {
    // There should be enough signers for the labels
    if (!signers[index]) {
      throw new Error(`Signer "${label}" is not available at index ${index}`);
    }
    // Expose signer globally (e.g., backend, instructor1, etc.)
    globalThis[label] = signers[index];
  });

  // For each contract label, prepare global getter/setter (lazy assignment via assignContracts)
  contractNames.forEach((name) => {
    let internal = null; // internal value holder
    Object.defineProperty(global, name, {
      get: () => internal, // when accessed, return current value
      set: (val) => {
        internal = val;
      }, // when assigned, update internal value
      configurable: true, // allow future redefinition if needed
    });
  });
}

// Registers deployed contract instances to global scope using dynamic accessors
function assignContracts(contractMap) {
  Object.entries(contractMap).forEach(([name, instance]) => {
    global[name] = instance; // triggers global setter, updates internal value
  });
}

// Transfers tokens to a list of users and optionally sets approval to a spender
async function batchDistributeTokens({
  token,
  amount,
  from = backend, // default sender is 'backend'
  skip = [], // addresses to exclude from transfer
  spenderAddress = "", // optional: approve this address after transfer
  walletList = [], // list of wallet labels to iterate
}) {
  const parsedAmount = ethers.parseEther(amount);
  for (const label of walletList) {
    // get wallet by label from global scope
    const user = globalThis[label];
    // Skip sender or any address in skip list
    if (user.address === from.address || skip.includes(user.address)) continue;
    // Transfer tokens from sender to current wallet
    await token.connect(from).transfer(user.address, parsedAmount);
    // Optionally approve spender for this wallet
    if (spenderAddress) {
      await token.connect(user).approve(spenderAddress, parsedAmount);
    }
  }
  // Optionally approve spender for the sender as well
  if (spenderAddress && !skip.includes(from.address)) {
    await token.connect(from).approve(spenderAddress, parsedAmount);
  }
}

// Allows a group of users to approve a spender for a given token
async function batchApproveSpender({ token, spenderAddress, amount, skip = [], walletList = [] }) {
  const parsedAmount = ethers.parseEther(amount);
  for (const label of walletList) {
    const user = globalThis[label];
    if (skip.includes(user.address)) continue;
    // Approve spender to spend `amount` on behalf of this wallet
    await token.connect(user).approve(spenderAddress, parsedAmount);
  }
}

module.exports = {
  initTestEnv,
  assignContracts,
  batchDistributeTokens,
  batchApproveSpender,
};
