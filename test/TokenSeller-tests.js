// Tests for token seller contract

const { expect } = require("chai");
const hardhat = require("hardhat");
const { ethers } = hardhat;
const chai = require("chai");
const BN = require("bn.js");
const { LazyRole } = require("../lib/LazyRole");
const helpers = require("@nomicfoundation/hardhat-network-helpers");
const { deploy } = require("../lib/deployments");
// Enable and inject BN dependency
chai.use(require("chai-bn")(BN));

async function Deploy() {
  // Deploy contracts with factory
  let tokenSellerFactory = await ethers.getContractFactory("TokenSeller");
  const tokenSellerContract = await tokenSellerFactory.deploy();
  let udaoFactory = await ethers.getContractFactory("UDAO");
  const udaoContract = await udaoFactory.deploy();
  return [tokenSellerContract, udaoContract];
}

describe("TokenSeller", function () {
  this.beforeEach(async function () {
    // Deploy contracts and assign them
    [tokenSellerContract, udaoContract] = await Deploy();
    // Get signers
    [owner, user1, user2, user3, user4, user5, user6, user7, user8, user9, ethersProvider] = await ethers.getSigners();
  });
  /*
  it("Owner should deploy", async function () {
    expect(await tokenSellerContract.address).to.not.equal(ethers.constants.AddressZero);
  });
  it("Should granted the default admin role to owner", async function () {
    expect(await tokenSellerContract.hasRole(await tokenSellerContract.DEFAULT_ADMIN_ROLE(), owner.address)).to.equal(
      true
    );
  });
  it("Should granted the recorder role to owner", async function () {
    expect(await tokenSellerContract.hasRole(await tokenSellerContract.RECORDER_ROLE(), owner.address)).to.equal(true);
  });
  it("Should granted the recorder role to user1", async function () {
    await tokenSellerContract.grantRole(await tokenSellerContract.RECORDER_ROLE(), user1.address);
    expect(await tokenSellerContract.hasRole(await tokenSellerContract.RECORDER_ROLE(), user1.address)).to.equal(true);
  });
  it("Should allow owner to grant recorder role to user1 with grantRecorderRole", async function () {
    await tokenSellerContract.grantRecorderRole(user1.address);
    expect(await tokenSellerContract.hasRole(await tokenSellerContract.RECORDER_ROLE(), user1.address)).to.equal(true);
  });
  it("Should revert when non-owner grant recorder role to user1 with grantRecorderRole", async function () {
    await expect(tokenSellerContract.connect(user1).grantRecorderRole(user1.address)).to.be.revertedWith(
      "AccessControl: account " +
        user1.address.toLowerCase() +
        " is missing role " +
        (await tokenSellerContract.DEFAULT_ADMIN_ROLE())
    );
  });
  it("Should emit RoleGranted event when owner grant recorder role to user1", async function () {
    await expect(tokenSellerContract.grantRole(await tokenSellerContract.RECORDER_ROLE(), user1.address))
      .to.emit(tokenSellerContract, "RoleGranted")
      .withArgs(await tokenSellerContract.RECORDER_ROLE(), user1.address, owner.address);
  });
  it("Should revert when non-owner grant recorder role to user1", async function () {
    await expect(
      tokenSellerContract.connect(user1).grantRole(await tokenSellerContract.RECORDER_ROLE(), user1.address)
    ).to.be.revertedWith(
      "AccessControl: account " +
        user1.address.toLowerCase() +
        " is missing role " +
        (await tokenSellerContract.DEFAULT_ADMIN_ROLE())
    );
  });
  it("Should allow owner to set UDAO contract", async function () {
    await tokenSellerContract.setUDAO(udaoContract.address);
    expect(await tokenSellerContract.udaoToken()).to.equal(udaoContract.address);
  });
  it("Should emit UDAOSet event when owner set UDAO contract", async function () {
    await expect(tokenSellerContract.setUDAO(udaoContract.address))
      .to.emit(tokenSellerContract, "UDAOSet")
      .withArgs(udaoContract.address);
  });
  it("Should revert when non-owner set UDAO contract", async function () {
    await expect(tokenSellerContract.connect(user1).setUDAO(udaoContract.address)).to.be.revertedWith(
      "AccessControl: account " +
        user1.address.toLowerCase() +
        " is missing role " +
        (await tokenSellerContract.DEFAULT_ADMIN_ROLE())
    );
  });
  it("Should allow owner to release UDAO tokens", async function () {
    await tokenSellerContract.setUDAO(udaoContract.address);
    await udaoContract.transfer(tokenSellerContract.address, 1000);
    await tokenSellerContract.releaseTokens();
    expect(await tokenSellerContract.tokenRelased()).to.equal(true);
  });
  it("Should emit TokensReleased event when owner release UDAO tokens", async function () {
    await tokenSellerContract.setUDAO(udaoContract.address);
    await udaoContract.transfer(tokenSellerContract.address, 1000);
    await expect(tokenSellerContract.releaseTokens()).to.emit(tokenSellerContract, "TokensReleased").withArgs(true);
  });
  it("Should revert when non-owner release UDAO tokens", async function () {
    await tokenSellerContract.setUDAO(udaoContract.address);
    await udaoContract.transfer(tokenSellerContract.address, 1000);
    await expect(tokenSellerContract.connect(user1).releaseTokens()).to.be.revertedWith(
      "AccessControl: account " +
        user1.address.toLowerCase() +
        " is missing role " +
        (await tokenSellerContract.DEFAULT_ADMIN_ROLE())
    );
  });
  it("Should return false for tokenRelased before release", async function () {
    expect(await tokenSellerContract.tokenRelased()).to.equal(false);
  });
  it("Should allow owner to add token balance for a single user", async function () {
    await tokenSellerContract.setUDAO(udaoContract.address);
    await udaoContract.transfer(tokenSellerContract.address, 1000);
    await tokenSellerContract.releaseTokens();
    await tokenSellerContract.addBalance(user1.address, 100);
    expect(await tokenSellerContract.getBalance(user1.address)).to.equal(100);
  });
  it("Should emit BalanceAdded event when owner add token balance for a single user", async function () {
    await tokenSellerContract.setUDAO(udaoContract.address);
    await udaoContract.transfer(tokenSellerContract.address, 1000);
    await tokenSellerContract.releaseTokens();
    await expect(tokenSellerContract.addBalance(user1.address, 100))
      .to.emit(tokenSellerContract, "BalanceAdded")
      .withArgs(user1.address, 100);
  });
  it("Should revert when non-owner add token balance for a single user", async function () {
    await tokenSellerContract.setUDAO(udaoContract.address);
    await udaoContract.transfer(tokenSellerContract.address, 1000);
    await tokenSellerContract.releaseTokens();
    await expect(tokenSellerContract.connect(user1).addBalance(user1.address, 100)).to.be.revertedWith(
      "AccessControl: account " +
        user1.address.toLowerCase() +
        " is missing role " +
        (await tokenSellerContract.RECORDER_ROLE())
    );
  });
  it("Should revert when amount is zero for addBalance", async function () {
    await expect(tokenSellerContract.addBalance(user1.address, 0)).to.be.revertedWith("Amount must be greater than 0!");
  });
  it("Should allow owner to add token balance for multiple users with batchAddBalance", async function () {
    await tokenSellerContract.setUDAO(udaoContract.address);
    await udaoContract.transfer(tokenSellerContract.address, 1000);
    await tokenSellerContract.releaseTokens();
    await tokenSellerContract.batchAddBalance([user1.address, user2.address, user3.address], [100, 200, 300]);
    expect(await tokenSellerContract.getBalance(user1.address)).to.equal(100);
    expect(await tokenSellerContract.getBalance(user2.address)).to.equal(200);
    expect(await tokenSellerContract.getBalance(user3.address)).to.equal(300);
  });
  it("Should emit BatchBalanceAdded event when owner add token balance for multiple users with batchAddBalance", async function () {
    await tokenSellerContract.setUDAO(udaoContract.address);
    await udaoContract.transfer(tokenSellerContract.address, 1000);
    await tokenSellerContract.releaseTokens();
    await expect(tokenSellerContract.batchAddBalance([user1.address, user2.address, user3.address], [100, 200, 300]))
      .to.emit(tokenSellerContract, "BatchBalanceAdded")
      .withArgs([user1.address, user2.address, user3.address], [100, 200, 300]);
  });
  it("Should revert when non-owner add token balance for multiple users with batchAddBalance", async function () {
    await expect(
      tokenSellerContract.connect(user1).batchAddBalance([user1.address, user2.address, user3.address], [100, 200, 300])
    ).to.be.revertedWith(
      "AccessControl: account " +
        user1.address.toLowerCase() +
        " is missing role " +
        (await tokenSellerContract.RECORDER_ROLE())
    );
  });
  it("Should revert when size of addresses and amounts are not equal for batchAddBalance", async function () {
    await expect(
      tokenSellerContract.batchAddBalance([user1.address, user2.address, user3.address], [100, 200])
    ).to.be.revertedWith("Arrays must be the same length!");
  });
  it("Should allow a user to withdraw tokens", async function () {
    await tokenSellerContract.setUDAO(udaoContract.address);
    await udaoContract.transfer(tokenSellerContract.address, 1000);
    await tokenSellerContract.releaseTokens();
    await tokenSellerContract.addBalance(user1.address, 100);
    await tokenSellerContract.connect(user1).withdraw();
    expect(await tokenSellerContract.getBalance(user1.address)).to.equal(0);
  });
  it("Should emit TokensWithdrawn event when a user withdraw tokens", async function () {
    await tokenSellerContract.setUDAO(udaoContract.address);
    await udaoContract.transfer(tokenSellerContract.address, 1000);
    await tokenSellerContract.releaseTokens();
    await tokenSellerContract.addBalance(user1.address, 100);
    await expect(tokenSellerContract.connect(user1).withdraw())
      .to.emit(tokenSellerContract, "TokensWithdrawn")
      .withArgs(user1.address, 100);
  });
  it("Should revert when a user withdraw tokens before release", async function () {
    await tokenSellerContract.setUDAO(udaoContract.address);
    await expect(tokenSellerContract.connect(user1).withdraw()).to.be.revertedWith("Tokens are not released yet!");
  });
  it("Should allow recorder to change KYC status for a user", async function () {
    await tokenSellerContract.grantRole(await tokenSellerContract.RECORDER_ROLE(), user1.address);
    await tokenSellerContract.changeKYCStatus(user1.address, true);
    expect(await tokenSellerContract.KYCList(user1.address)).to.equal(true);
  });
  it("Should emit KYCStatusChanged event when recorder change KYC status for a user", async function () {
    await tokenSellerContract.grantRole(await tokenSellerContract.RECORDER_ROLE(), user1.address);
    await expect(tokenSellerContract.changeKYCStatus(user1.address, true))
      .to.emit(tokenSellerContract, "KYCStatusChanged")
      .withArgs(user1.address, true);
  });
  it("Should revert when non-recorder change KYC status for a user", async function () {
    await expect(tokenSellerContract.connect(user1).changeKYCStatus(user1.address, true)).to.be.revertedWith(
      "AccessControl: account " +
        user1.address.toLowerCase() +
        " is missing role " +
        (await tokenSellerContract.RECORDER_ROLE())
    );
  });
  it("Should revert when a user withdraw tokens before balance is added", async function () {
    await tokenSellerContract.setUDAO(udaoContract.address);
    await tokenSellerContract.releaseTokens();
    await tokenSellerContract.changeKYCStatus(user1.address, true);
    await expect(tokenSellerContract.connect(user1).withdraw()).to.be.revertedWith("You have no tokens to withdraw!");
  });
  it("Should revert when a user withdraw tokens before KYC is approved", async function () {
    await tokenSellerContract.setUDAO(udaoContract.address);
    await tokenSellerContract.releaseTokens();
    await tokenSellerContract.addBalance(user1.address, 100);
    await tokenSellerContract.changeKYCStatus(user1.address, false);
    await expect(tokenSellerContract.connect(user1).withdraw()).to.be.revertedWith("You are not KYCed!");
  });
  */
  /*
    //-------------------EXHAUSTIVE TESTS-------------------
    it("Should allow owner to add token balance for 250 users with addBalance and allow users to withdraw tokens", async function () {
        // Console log the amount of users
        console.log("-------------------EXHAUSTIVE TEST FOR 250 USERS-------------------");
        // Set UDAO contract
        await tokenSellerContract.setUDAO(udaoContract.address);
        // Transfer 1000 UDAO tokens to TokenSeller contract
        await udaoContract.transfer(tokenSellerContract.address, 10000 * 250);
        // Release tokens
        await tokenSellerContract.releaseTokens();
        // Generate 250 users
        let users = [];
        for( let i=0; i < 250; i++){
            // Get a new wallet
            wallet = ethers.Wallet.createRandom();
            // add the provider from Hardhat
            wallet =  wallet.connect(ethers.provider);
            // send ETH to the new wallet so it can perform a tx
            await ethersProvider.sendTransaction({to: wallet.address, value: ethers.utils.parseEther("1")});
            // Add the wallet to the users array
            users.push(wallet);
        }
        // Add 100 UDAO tokens for each of 250 users
        for (let i = 0; i < 250; i++) {
            await tokenSellerContract.addBalance(users[i].address, 100);
        }
        // Withdraw tokens for each of 250 users
        for (let i = 0; i < 250; i++) {
            await tokenSellerContract.connect(users[i]).withdraw();
        }
        // Check if all balances are zero
        for (let i = 0; i < 250; i++) {
            expect(await tokenSellerContract.getBalance(users[i].address)).to.equal(0);
        }
    }
    );
    it("Should allow owner to add token balance for 250 users with batchAddBalance and allow users to withdraw tokens", async function () {
        // Console log the amount of users
        console.log("-------------------EXHAUSTIVE TEST FOR 250 USERS-------------------");
        // Set UDAO contract
        await tokenSellerContract.setUDAO(udaoContract.address);
        // Transfer 1000 UDAO tokens to TokenSeller contract
        await udaoContract.transfer(tokenSellerContract.address, 10000 * 250);
        // Release tokens
        await tokenSellerContract.releaseTokens();
        // Generate 250 users
        let users = [];
        for( let i=0; i < 250; i++){
            // Get a new wallet
            wallet = ethers.Wallet.createRandom();
            // add the provider from Hardhat
            wallet =  wallet.connect(ethers.provider);
            // send ETH to the new wallet so it can perform a tx
            await ethersProvider.sendTransaction({to: wallet.address, value: ethers.utils.parseEther("1")});
            // Add the wallet to the users array
            users.push(wallet);
        }
        // Add 100 UDAO tokens for each of 250 users
        await tokenSellerContract.batchAddBalance(users.map(user => user.address), Array(250).fill(100));
        // Withdraw tokens for each of 250 users
        for (let i = 0; i < 250; i++) {
            await tokenSellerContract.connect(users[i]).withdraw();
        }
        // Check if all balances are zero
        for (let i = 0; i < 250; i++) {
            expect(await tokenSellerContract.getBalance(users[i].address)).to.equal(0);
        }
    }
    );
    */
});
