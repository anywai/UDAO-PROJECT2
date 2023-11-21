const { expect } = require("chai");
const hardhat = require("hardhat");
const { ethers } = hardhat;
const chai = require("chai");
const BN = require("bn.js");
const { LazyCoaching } = require("../lib/LazyCoaching");
const { DiscountedPurchase } = require("../lib/DiscountedPurchase");
const helpers = require("@nomicfoundation/hardhat-network-helpers");
const { Redeem } = require("../lib/Redeem");
const { deploy } = require("../lib/deployments");
const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");

// Enable and inject BN dependency
chai.use(require("chai-bn")(BN));
require("dotenv").config();

// @dev Proposal states
/*
 enum ProposalState {
        Pending,
        Active,
        Canceled,
        Defeated,
        Succeeded,
        Queued,
        Expired,
        Executed
    }
*/
/// HELPERS---------------------------------------------------------------------
/// @dev Deploy contracts and assign them
async function reDeploy(reApplyRolesViaVoucher = true, isDexRequired = false) {
  const replace = await deploy(isDexRequired);
  backend = replace.backend;
  contentCreator = replace.contentCreator;
  contentBuyer = replace.contentBuyer;
  contentBuyer1 = replace.contentBuyer1;
  contentBuyer2 = replace.contentBuyer2;
  contentBuyer3 = replace.contentBuyer3;
  validatorCandidate = replace.validatorCandidate;
  validator = replace.validator;
  validator1 = replace.validator1;
  validator2 = replace.validator2;
  validator3 = replace.validator3;
  validator4 = replace.validator4;
  validator5 = replace.validator5;
  superValidatorCandidate = replace.superValidatorCandidate;
  superValidator = replace.superValidator;
  foundation = replace.foundation;
  governanceCandidate = replace.governanceCandidate;
  governanceMember = replace.governanceMember;
  jurorCandidate = replace.jurorCandidate;
  jurorMember = replace.jurorMember;
  jurorMember1 = replace.jurorMember1;
  jurorMember2 = replace.jurorMember2;
  jurorMember3 = replace.jurorMember3;
  jurorMember4 = replace.jurorMember4;
  corporation = replace.corporation;
  contractUDAO = replace.contractUDAO;
  contractRoleManager = replace.contractRoleManager;
  contractUDAOCertificate = replace.contractUDAOCertificate;
  contractUDAOContent = replace.contractUDAOContent;
  contractSupervision = replace.contractSupervision;
  contractSupervision = replace.contractSupervision;
  contractPlatformTreasury = replace.contractPlatformTreasury;
  contractUDAOVp = replace.contractUDAOVp;
  contractUDAOStaker = replace.contractUDAOStaker;
  contractUDAOTimelockController = replace.contractUDAOTimelockController;
  contractUDAOGovernor = replace.contractUDAOGovernor;
  contractSupervision = replace.contractSupervision;
  contractVoucherVerifier = replace.contractVoucherVerifier;
  contractVesting = replace.contractVesting;
  GOVERNANCE_ROLE = replace.GOVERNANCE_ROLE;
  BACKEND_ROLE = replace.BACKEND_ROLE;
  contractContractManager = replace.contractContractManager;
  account1 = replace.account1;
  account2 = replace.account2;
  account3 = replace.account3;
  contractPriceGetter = replace.contractPriceGetter;
  const reApplyValidatorRoles = [validator, validator1, validator2, validator3, validator4, validator5];
  const reApplyJurorRoles = [jurorMember, jurorMember1, jurorMember2, jurorMember3, jurorMember4];
  const VALIDATOR_ROLE = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("VALIDATOR_ROLE"));
  const JUROR_ROLE = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("JUROR_ROLE"));
}

describe("Vesting Contract", function () {
    it("Should be able to deploy vesting contract", async function () {
        await reDeploy();
        expect(contractVesting.address).to.not.equal(0);
    });
    
    it("Should assign DEFAULT_ADMIN_ROLE to backend during deployment", async function () {
        await reDeploy();
        expect(await contractVesting.hasRole(ethers.constants.HashZero, backend.address)).to.equal(true);
    }
    );
    
    it("Should assign DEPOSITOR_ROLE to backend during deployment", async function () {
        await reDeploy();
        /// Hash DEPOSITOR_ROLE
        const DEPOSITOR_ROLE = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("DEPOSITOR_ROLE"));
        expect(await contractVesting.hasRole(DEPOSITOR_ROLE, backend.address)).to.equal(true);
    }
    );
    it("Should allow backend to set new DEPOSITOR_ROLE to some other address", async function () {
        await reDeploy();
        /// Hash DEPOSITOR_ROLE
        const DEPOSITOR_ROLE = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("DEPOSITOR_ROLE"));
        const newDepositor = account1.address;
        await contractVesting.connect(backend).grantDepositerRole(newDepositor);
        expect(await contractVesting.hasRole(DEPOSITOR_ROLE, newDepositor)).to.equal(true);
    }
    );
    it("Should allow backend to revoke DEPOSITOR_ROLE from some other address", async function () {
        await reDeploy();
        /// Hash DEPOSITOR_ROLE
        const DEPOSITOR_ROLE = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("DEPOSITOR_ROLE"));
        const newDepositor = account1.address;
        await contractVesting.connect(backend).grantDepositerRole(newDepositor);
        expect(await contractVesting.hasRole(DEPOSITOR_ROLE, newDepositor)).to.equal(true);
        await contractVesting.connect(backend).revokeDepositerRole(newDepositor);
        expect(await contractVesting.hasRole(DEPOSITOR_ROLE, newDepositor)).to.equal(false);
    }
    );
    it("Should not allow non-backend to set new DEPOSITOR_ROLE to some other address", async function () {
        await reDeploy();
        /// Hash DEPOSITOR_ROLE
        const DEPOSITOR_ROLE = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("DEPOSITOR_ROLE"));
        const newDepositor = account1.address;
        await expect(contractVesting.connect(account1).grantDepositerRole(newDepositor)).to.be.revertedWith("Only admin can grant deposit role");
    }
    );
    it("Should not allow non-backend to revoke DEPOSITOR_ROLE from some other address", async function () {
        await reDeploy();
        /// Hash DEPOSITOR_ROLE
        const DEPOSITOR_ROLE = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("DEPOSITOR_ROLE"));
        const newDepositor = account1.address;
        await contractVesting.connect(backend).grantDepositerRole(newDepositor);
        expect(await contractVesting.hasRole(DEPOSITOR_ROLE, newDepositor)).to.equal(true);
        await expect(contractVesting.connect(account1).revokeDepositerRole(newDepositor)).to.be.revertedWith("Only admin can revoke deposit role");
    }
    );
    it("Should allow DEPOSITOR_ROLE to create new deposit for some other address", async function () {
        await reDeploy();
        const currentBalanceOfBackend = await contractUDAO.balanceOf(backend.address);
        const currentVestingIndex = 0;
        const beneficiary = account1.address;
        const amount = ethers.utils.parseEther("1000");
        /// Backend should give allowance to contractVesting
        await contractUDAO.connect(backend).approve(contractVesting.address, amount);
        /// @dev Get the current block number
        const currentBlockNumber = await hre.ethers.provider.getBlockNumber();
        /// @dev releaseTime is 1 day from now. 
        const releaseTime = (await hre.ethers.provider.getBlock(currentBlockNumber)).timestamp + 86400;
        expect(await contractVesting.connect(backend).deposit(beneficiary, amount, releaseTime)).to.emit(contractVesting, "VestingDeposit").withArgs(backend.address, beneficiary,currentVestingIndex ,amount, releaseTime);
        // Check balance of backend
        expect(await contractUDAO.balanceOf(backend.address)).to.be.equal(currentBalanceOfBackend.sub(amount));
        // Check balance of contractVesting
        expect(await contractUDAO.balanceOf(contractVesting.address)).to.be.equal(amount);
    }
    );
    it("Should not allow non-DEPOSITOR_ROLE to create new deposit for some other address", async function () {
        await reDeploy();
        // Hash DEPOSITOR_ROLE
        const DEPOSITOR_ROLE = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("DEPOSITOR_ROLE"));
        const beneficiary = account1.address;
        const amount = ethers.utils.parseEther("1000");
        /// Backend should give allowance to contractVesting
        await contractUDAO.connect(backend).approve(contractVesting.address, amount);
        /// @dev Get the current block number
        const currentBlockNumber = await hre.ethers.provider.getBlockNumber();
        /// @dev releaseTime is 1 day from now. 
        const releaseTime = (await hre.ethers.provider.getBlock(currentBlockNumber)).timestamp + 86400;
        await expect(contractVesting.connect(account1).deposit(beneficiary, amount, releaseTime)).to.be.revertedWith("AccessControl: account " + account1.address.toLowerCase() + " is missing role " + DEPOSITOR_ROLE);
    }
    );
    it("Should allow DEPOSITOR_ROLE to create new deposits in batch for some other addresses", async function () {
        await reDeploy();
        const currentBalanceOfBackend = await contractUDAO.balanceOf(backend.address);
        const currentVestingIndex = 0;
        const beneficiary1 = account1.address;
        const beneficiary2 = account2.address;
        const beneficiary3 = account3.address;
        const amounts = [ethers.utils.parseEther("1000"), ethers.utils.parseEther("2000"), ethers.utils.parseEther("3000")];
        /// Backend should give allowance to contractVesting
        await contractUDAO.connect(backend).approve(contractVesting.address, amounts[0].add(amounts[1]).add(amounts[2]));
        /// @dev Get the current block number
        const currentBlockNumber = await hre.ethers.provider.getBlockNumber();
        /// @dev releaseTime is 1 day from now. 
        const releaseTime = (await hre.ethers.provider.getBlock(currentBlockNumber)).timestamp + 86400;
        const releaseTimes = [releaseTime, releaseTime, releaseTime];
        // Depositor should be able depositInBatch and listen 3 VestingDeposit event
        const tx = contractVesting.connect(backend).depositInBatch([beneficiary1, beneficiary2, beneficiary3], amounts, releaseTimes);
        await Promise.all([
            expect(tx).to.emit(contractVesting, "VestingDeposit").withArgs(backend.address, beneficiary1, currentVestingIndex, amounts[0], releaseTimes[0]),
            expect(tx).to.emit(contractVesting, "VestingDeposit").withArgs(backend.address, beneficiary2, currentVestingIndex + 1, amounts[1], releaseTimes[1]),
            expect(tx).to.emit(contractVesting, "VestingDeposit").withArgs(backend.address, beneficiary3, currentVestingIndex + 2, amounts[2], releaseTimes[2])
        ]);
        // Check balance of backend
        expect(await contractUDAO.balanceOf(backend.address)).to.be.equal(currentBalanceOfBackend.sub(amounts[0]).sub(amounts[1]).sub(amounts[2]));
        // Check balance of contractVesting
        expect(await contractUDAO.balanceOf(contractVesting.address)).to.be.equal(amounts[0].add(amounts[1]).add(amounts[2]));
    }
    );
    it("Should not allow non-DEPOSITOR_ROLE to create new deposits in batch for some other addresses", async function () {
        await reDeploy();
        // Hash DEPOSITOR_ROLE
        const DEPOSITOR_ROLE = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("DEPOSITOR_ROLE"));
        const beneficiary1 = account1.address;
        const beneficiary2 = account2.address;
        const beneficiary3 = account3.address;
        const amounts = [ethers.utils.parseEther("1000"), ethers.utils.parseEther("2000"), ethers.utils.parseEther("3000")];
        /// Backend should give allowance to contractVesting
        await contractUDAO.connect(backend).approve(contractVesting.address, amounts[0].add(amounts[1]).add(amounts[2]));
        /// @dev Get the current block number
        const currentBlockNumber = await hre.ethers.provider.getBlockNumber();
        /// @dev releaseTime is 1 day from now. 
        const releaseTime = (await hre.ethers.provider.getBlock(currentBlockNumber)).timestamp + 86400;
        const releaseTimes = [releaseTime, releaseTime, releaseTime];
        await expect(contractVesting.connect(account1).depositInBatch([beneficiary1, beneficiary2, beneficiary3], amounts, releaseTimes)).to.be.revertedWith("AccessControl: account " + account1.address.toLowerCase() + " is missing role " + DEPOSITOR_ROLE);
    }
    );
    it("Should not allow DEPOSITOR_ROLE to create new deposits in batch for some other addresses if length of beneficiaries and amounts are not equal", async function () {
        await reDeploy();
        const beneficiary1 = account1.address;
        const beneficiary2 = account2.address;
        const beneficiary3 = account3.address;
        const amounts = [ethers.utils.parseEther("1000"), ethers.utils.parseEther("2000"), ethers.utils.parseEther("3000")];
        /// Backend should give allowance to contractVesting
        await contractUDAO.connect(backend).approve(contractVesting.address, amounts[0].add(amounts[1]).add(amounts[2]));
        /// @dev releaseTime is 1 day from now and missing 1 releaseTime
        /// @dev Get the current block number
        const currentBlockNumber = await hre.ethers.provider.getBlockNumber();
        const releaseTime = (await hre.ethers.provider.getBlock(currentBlockNumber)).timestamp + 86400;
        const releaseTimes = [releaseTime, releaseTime];
        await expect(contractVesting.connect(backend).depositInBatch([beneficiary1, beneficiary2, beneficiary3], amounts, releaseTimes)).to.be.revertedWith("Beneficiaries, amounts and releaseTimes length mismatch");
    }
    );
    it("Should allow a beneficiary to withdraw his vested amount if vesting period is over", async function () {
        await reDeploy();
        const currentBalanceOfBackend = await contractUDAO.balanceOf(backend.address);
        const currentVestingIndex = 0;
        const beneficiary = account1.address;
        const amount = ethers.utils.parseEther("1000");
        /// Backend should give allowance to contractVesting
        await contractUDAO.connect(backend).approve(contractVesting.address, amount);
        /// @dev Get the current block number
        const currentBlockNumber = await hre.ethers.provider.getBlockNumber();
        /// @dev releaseTime is 1 day from now
        const releaseTime = (await hre.ethers.provider.getBlock(currentBlockNumber)).timestamp + 86400;
        await contractVesting.connect(backend).deposit(beneficiary, amount, releaseTime);
        // Check balance of backend
        expect(await contractUDAO.balanceOf(backend.address)).to.be.equal(currentBalanceOfBackend.sub(amount));
        // Check balance of contractVesting
        expect(await contractUDAO.balanceOf(contractVesting.address)).to.be.equal(amount);
        // Check balance of beneficiary before withdraw
        expect(await contractUDAO.balanceOf(beneficiary)).to.be.equal(0);
        // Wait for 1 day
        await hre.ethers.provider.send('evm_increaseTime', [1 * 24 * 60 * 60]);
        // Beneficiary should be able to withdraw
        await expect(contractVesting.connect(account1).withdraw(currentVestingIndex)).to.emit(contractVesting, "VestingWithdrawal").withArgs(beneficiary, currentVestingIndex, amount);
        // Check balance of beneficiary after withdraw
        expect(await contractUDAO.balanceOf(account1.address)).to.be.equal(amount);
    }
    );
    it("Should not allow a beneficiary to withdraw his vested amount if vesting period is not over", async function () {
        await reDeploy();
        const currentBalanceOfBackend = await contractUDAO.balanceOf(backend.address);
        const currentVestingIndex = 0;
        const beneficiary = account1.address;
        const amount = ethers.utils.parseEther("1000");
        /// Backend should give allowance to contractVesting
        await contractUDAO.connect(backend).approve(contractVesting.address, amount);
        /// @dev Get the current block number
        const currentBlockNumber = await hre.ethers.provider.getBlockNumber();
        /// @dev releaseTime is 1 day from now. Mine 1 days worth of blocks
        const releaseTime = (await hre.ethers.provider.getBlock(currentBlockNumber)).timestamp + 86400;
        await contractVesting.connect(backend).deposit(beneficiary, amount, releaseTime);
        // Check balance of backend
        expect(await contractUDAO.balanceOf(backend.address)).to.be.equal(currentBalanceOfBackend.sub(amount));
        // Check balance of contractVesting
        expect(await contractUDAO.balanceOf(contractVesting.address)).to.be.equal(amount);
        // Check balance of beneficiary before withdraw
        expect(await contractUDAO.balanceOf(beneficiary)).to.be.equal(0);
        // Beneficiary should not be able to withdraw
        await expect(contractVesting.connect(account1).withdraw(currentVestingIndex)).to.be.revertedWith("Your vesting period is not over yet");
        // Check balance of beneficiary after withdraw
        expect(await contractUDAO.balanceOf(account1.address)).to.be.equal(0);
    }
    );
    it("Should not allow a beneficiary to withdraw his vested amount if vesting period is over but he has already withdrawn", async function () {
        await reDeploy();
        const currentBalanceOfBackend = await contractUDAO.balanceOf(backend.address);
        const currentVestingIndex = 0;
        const beneficiary = account1.address;
        const amount = ethers.utils.parseEther("1000");
        /// Backend should give allowance to contractVesting
        await contractUDAO.connect(backend).approve(contractVesting.address, amount);
        /// @dev Get the current block number
        const currentBlockNumber = await hre.ethers.provider.getBlockNumber();
        /// @dev releaseTime is 1 day from now
        const releaseTime = (await hre.ethers.provider.getBlock(currentBlockNumber)).timestamp + 86400;
        await contractVesting.connect(backend).deposit(beneficiary, amount, releaseTime);
        // Check balance of backend
        expect(await contractUDAO.balanceOf(backend.address)).to.be.equal(currentBalanceOfBackend.sub(amount));
        // Check balance of contractVesting
        expect(await contractUDAO.balanceOf(contractVesting.address)).to.be.equal(amount);
        // Check balance of beneficiary before withdraw
        expect(await contractUDAO.balanceOf(beneficiary)).to.be.equal(0);
        // Wait for 1 day
        await hre.ethers.provider.send('evm_increaseTime', [1 * 24 * 60 * 60]);
        // Beneficiary should be able to withdraw
        await expect(contractVesting.connect(account1).withdraw(currentVestingIndex)).to.emit(contractVesting, "VestingWithdrawal").withArgs(beneficiary, currentVestingIndex, amount);
        // Check balance of beneficiary after withdraw
        expect(await contractUDAO.balanceOf(account1.address)).to.be.equal(amount);
        // Beneficiary should not be able to withdraw again
        await expect(contractVesting.connect(account1).withdraw(currentVestingIndex)).to.be.revertedWith("You have already withdrawn your vesting for this index");
    }
    );
    it("Should allow a beneficiary to withdraw his vested amount if vesting period is over and he has multiple vesting deposits", async function () {
        await reDeploy();
        const currentBalanceOfBackend = await contractUDAO.balanceOf(backend.address);
        const currentVestingIndex = 0;
        const beneficiary = account1.address;
        const amount1 = ethers.utils.parseEther("1000");
        const amount2 = ethers.utils.parseEther("2000");
        const amount3 = ethers.utils.parseEther("3000");
        /// Backend should give allowance to contractVesting
        await contractUDAO.connect(backend).approve(contractVesting.address, amount1.add(amount2).add(amount3));
        /// @dev releaseTime is 1 day from now
        /// @dev Get the current block number
        const currentBlockNumber = await hre.ethers.provider.getBlockNumber();
        /// @dev releaseTime is 1 day from now
        const releaseTime1 = (await hre.ethers.provider.getBlock(currentBlockNumber)).timestamp + 86400;
        const releaseTime2 = (await hre.ethers.provider.getBlock(currentBlockNumber)).timestamp + 86400 * 2;
        const releaseTime3 = (await hre.ethers.provider.getBlock(currentBlockNumber)).timestamp + 86400 * 3;
        await contractVesting.connect(backend).deposit(beneficiary, amount1, releaseTime1);
        await contractVesting.connect(backend).deposit(beneficiary, amount2, releaseTime2);
        await contractVesting.connect(backend).deposit(beneficiary, amount3, releaseTime3);
        // Check balance of backend
        expect(await contractUDAO.balanceOf(backend.address)).to.be.equal(currentBalanceOfBackend.sub(amount1).sub(amount2).sub(amount3));
        // Check balance of contractVesting
        expect(await contractUDAO.balanceOf(contractVesting.address)).to.be.equal(amount1.add(amount2).add(amount3));
        // Check balance of beneficiary before withdraw
        expect(await contractUDAO.balanceOf(beneficiary)).to.be.equal(0);
        // Wait for 3 days
        await hre.ethers.provider.send('evm_increaseTime', [3 * 24 * 60 * 60]);
        // Beneficiary should be able to withdraw amount1
        await expect(contractVesting.connect(account1).withdraw(currentVestingIndex)).to.emit(contractVesting, "VestingWithdrawal").withArgs(beneficiary, currentVestingIndex, amount1);
        // Check balance of beneficiary after withdraw
        expect(await contractUDAO.balanceOf(account1.address)).to.be.equal(amount1);
        // Beneficiary should be able to withdraw amount2
        await expect(contractVesting.connect(account1).withdraw(currentVestingIndex + 1)).to.emit(contractVesting, "VestingWithdrawal").withArgs(beneficiary, currentVestingIndex + 1, amount2);
        // Check balance of beneficiary after withdraw
        expect(await contractUDAO.balanceOf(account1.address)).to.be.equal(amount1.add(amount2));
        // Beneficiary should be able to withdraw amount3
        await expect(contractVesting.connect(account1).withdraw(currentVestingIndex + 2)).to.emit(contractVesting, "VestingWithdrawal").withArgs(beneficiary, currentVestingIndex + 2, amount3);
        // Check balance of beneficiary after withdraw
        expect(await contractUDAO.balanceOf(account1.address)).to.be.equal(amount1.add(amount2).add(amount3));
    }
    );
    it("Should allow a beneficiary to withdraw his vesting that vested period is over and not allow to withdraw his vesting that vested period is not over", async function () {
        await reDeploy();
        const currentBalanceOfBackend = await contractUDAO.balanceOf(backend.address);
        const currentVestingIndex = 0;
        const beneficiary = account1.address;
        const amount1 = ethers.utils.parseEther("1000");
        const amount2 = ethers.utils.parseEther("2000");
        const amount3 = ethers.utils.parseEther("3000");
        /// Backend should give allowance to contractVesting
        await contractUDAO.connect(backend).approve(contractVesting.address, amount1.add(amount2).add(amount3));
        /// @dev releaseTime is 1 day from now
        /// @dev Get the current block number
        const currentBlockNumber = await hre.ethers.provider.getBlockNumber();
        /// @dev releaseTime is 1 day from now. Mine 1 days worth of blocks
        const releaseTime1 = (await hre.ethers.provider.getBlock(currentBlockNumber)).timestamp + 86400;
        const releaseTime2 = (await hre.ethers.provider.getBlock(currentBlockNumber)).timestamp + 86400 * 2;
        const releaseTime3 = (await hre.ethers.provider.getBlock(currentBlockNumber)).timestamp + 86400 * 3;
        await contractVesting.connect(backend).deposit(beneficiary, amount1, releaseTime1);
        await contractVesting.connect(backend).deposit(beneficiary, amount2, releaseTime2);
        await contractVesting.connect(backend).deposit(beneficiary, amount3, releaseTime3);
        // Check balance of backend
        expect(await contractUDAO.balanceOf(backend.address)).to.be.equal(currentBalanceOfBackend.sub(amount1).sub(amount2).sub(amount3));
        // Check balance of contractVesting
        expect(await contractUDAO.balanceOf(contractVesting.address)).to.be.equal(amount1.add(amount2).add(amount3));
        // Check balance of beneficiary before withdraw
        expect(await contractUDAO.balanceOf(beneficiary)).to.be.equal(0);
        // Wait for 1 day
        await hre.ethers.provider.send('evm_increaseTime', [1 * 24 * 60 * 60]);
        // Beneficiary should be able to withdraw amount1
        await expect(contractVesting.connect(account1).withdraw(currentVestingIndex)).to.emit(contractVesting, "VestingWithdrawal").withArgs(beneficiary, currentVestingIndex, amount1);
        // Check balance of beneficiary after withdraw
        expect(await contractUDAO.balanceOf(account1.address)).to.be.equal(amount1);
        // Beneficiary should not be able to withdraw amount2
        await expect(contractVesting.connect(account1).withdraw(currentVestingIndex + 1)).to.be.revertedWith("Your vesting period is not over yet");
        // Check balance of beneficiary after withdraw
        expect(await contractUDAO.balanceOf(account1.address)).to.be.equal(amount1);
        // Beneficiary should not be able to withdraw amount3
        await expect(contractVesting.connect(account1).withdraw(currentVestingIndex + 2)).to.be.revertedWith("Your vesting period is not over yet");
        // Check balance of beneficiary after withdraw
        expect(await contractUDAO.balanceOf(account1.address)).to.be.equal(amount1);
        // Wait for 2 more days
        await hre.ethers.provider.send('evm_increaseTime', [2 * 24 * 60 * 60]);
        // Beneficiary should be able to withdraw amount2
        await expect(contractVesting.connect(account1).withdraw(currentVestingIndex + 1)).to.emit(contractVesting, "VestingWithdrawal").withArgs(beneficiary, currentVestingIndex + 1, amount2);
        // Check balance of beneficiary after withdraw
        expect(await contractUDAO.balanceOf(account1.address)).to.be.equal(amount1.add(amount2));
        // Beneficiary should be able to withdraw amount3
        await expect(contractVesting.connect(account1).withdraw(currentVestingIndex + 2)).to.emit(contractVesting, "VestingWithdrawal").withArgs(beneficiary, currentVestingIndex + 2, amount3);
        // Check balance of beneficiary after withdraw
        expect(await contractUDAO.balanceOf(account1.address)).to.be.equal(amount1.add(amount2).add(amount3));
    }
    );
    it("Should not allow a user to use an existing vesting index to withdraw someone else's vesting", async function () {
        await reDeploy();
        const currentBalanceOfBackend = await contractUDAO.balanceOf(backend.address);
        const currentVestingIndex = 0;
        const beneficiary1 = account1.address;
        const beneficiary2 = account2.address;
        const amount1 = ethers.utils.parseEther("1000");
        const amount2 = ethers.utils.parseEther("2000");
        /// Backend should give allowance to contractVesting
        await contractUDAO.connect(backend).approve(contractVesting.address, amount1.add(amount2));
        /// @dev Get the current block number
        const currentBlockNumber = await hre.ethers.provider.getBlockNumber();
        /// @dev releaseTime is 1 day from now
        const releaseTime1 = (await hre.ethers.provider.getBlock(currentBlockNumber)).timestamp + 86400;
        const releaseTime2 = (await hre.ethers.provider.getBlock(currentBlockNumber)).timestamp + 86400 * 2;
        await contractVesting.connect(backend).deposit(beneficiary1, amount1, releaseTime1);
        await contractVesting.connect(backend).deposit(beneficiary2, amount2, releaseTime2);
        // Check balance of backend
        expect(await contractUDAO.balanceOf(backend.address)).to.be.equal(currentBalanceOfBackend.sub(amount1).sub(amount2));
        // Check balance of contractVesting
        expect(await contractUDAO.balanceOf(contractVesting.address)).to.be.equal(amount1.add(amount2));
        // Check balance of beneficiary1 before withdraw
        expect(await contractUDAO.balanceOf(beneficiary1)).to.be.equal(0);
        // Check balance of beneficiary2 before withdraw
        expect(await contractUDAO.balanceOf(beneficiary2)).to.be.equal(0);
        // Wait for 2 days
        await hre.ethers.provider.send('evm_increaseTime', [2 * 24 * 60 * 60]);
        // Beneficiary1 should'nt be able to withdraw beneficiary2's vesting
        await expect(contractVesting.connect(account1).withdraw(currentVestingIndex + 1)).to.be.revertedWith("You are not the beneficiary of this vesting lock");
        // Check balance of beneficiary1 after withdraw
        expect(await contractUDAO.balanceOf(account1.address)).to.be.equal(0);
        // Beneficiary2 should be able to withdraw his vesting
        await expect(contractVesting.connect(account2).withdraw(currentVestingIndex + 1)).to.emit(contractVesting, "VestingWithdrawal").withArgs(beneficiary2, currentVestingIndex + 1, amount2);
        // Check balance of beneficiary2 after withdraw
        expect(await contractUDAO.balanceOf(account2.address)).to.be.equal(amount2);
    }
    );
    it("Should not allow to deposit if DEPOSITOR_ROLE doesn't have enough tokens", async function () {
        await reDeploy();
        const currentBalanceOfBackend = await contractUDAO.balanceOf(backend.address);
        const beneficiary = account1.address;
        // Amount is more than backend's balance
        const amount = currentBalanceOfBackend.add(1);
        /// Backend should give allowance to contractVesting
        await contractUDAO.connect(backend).approve(contractVesting.address, amount);
        /// @dev Get the current block number
        const currentBlockNumber = await hre.ethers.provider.getBlockNumber();
        /// @dev releaseTime is 1 day from now
        const releaseTime = (await hre.ethers.provider.getBlock(currentBlockNumber)).timestamp + 86400;
        await expect(contractVesting.connect(backend).deposit(beneficiary, amount, releaseTime)).to.be.revertedWith("ERC20: transfer amount exceeds balance");
    }
    );
    it("Should not allow to deposit in batch if DEPOSITOR_ROLE doesn't have enough tokens", async function () {
        await reDeploy();
        const currentBalanceOfBackend = await contractUDAO.balanceOf(backend.address);
        const beneficiary1 = account1.address;
        const beneficiary2 = account2.address;
        const beneficiary3 = account3.address;
        // Amount is more than backend's balance
        const amount = currentBalanceOfBackend.add(1);
        /// Backend should give allowance to contractVesting
        await contractUDAO.connect(backend).approve(contractVesting.address, amount);
        /// @dev releaseTime is 1 day from now
        /// @dev Get the current block number
        const currentBlockNumber = await hre.ethers.provider.getBlockNumber();
        const releaseTime = (await hre.ethers.provider.getBlock(currentBlockNumber)).timestamp + 86400;
        await expect(contractVesting.connect(backend).depositInBatch([beneficiary1, beneficiary2, beneficiary3], [amount, amount, amount], [releaseTime, releaseTime, releaseTime])).to.be.revertedWith("ERC20: transfer amount exceeds balance");
    }
    );
});