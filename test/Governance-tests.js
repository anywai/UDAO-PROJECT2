const { expect } = require("chai");
const hardhat = require("hardhat");
const { ethers } = hardhat;
const chai = require("chai");
const BN = require("bn.js");
const { LazyRole } = require("../lib/LazyRole");
const helpers = require("@nomicfoundation/hardhat-network-helpers");
const { deploy } = require("../lib/deployments");

const { WMATIC_ABI, NonFunbiblePositionABI, NonFunbiblePositionAddress, WMATICAddress } = require("../lib/abis");
const { parseEther } = require("ethers/lib/utils");
const { latestBlock } = require("@nomicfoundation/hardhat-network-helpers/dist/src/helpers/time");

// Enable and inject BN dependency
chai.use(require("chai-bn")(BN));

// @dev Proposal states
/*
States starts from 0
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
  if (reApplyRolesViaVoucher) {
    for (let i = 0; i < reApplyValidatorRoles.length; i++) {
      await contractRoleManager.revokeRole(VALIDATOR_ROLE, reApplyValidatorRoles[i].address);
    }
    for (let i = 0; i < reApplyJurorRoles.length; i++) {
      await contractRoleManager.revokeRole(JUROR_ROLE, reApplyJurorRoles[i].address);
    }
    for (let i = 0; i < reApplyValidatorRoles.length; i++) {
      await grantValidatorRole(
        reApplyValidatorRoles[i],
        contractRoleManager,
        contractUDAO,
        contractUDAOStaker,
        backend
      );
    }
    for (let i = 0; i < reApplyJurorRoles.length; i++) {
      await grantJurorRole(reApplyJurorRoles[i], contractRoleManager, contractUDAO, contractUDAOStaker, backend);
    }
  }
}
async function grantValidatorRole(account, contractRoleManager, contractUDAO, contractUDAOStaker, backend) {
  await contractRoleManager.setKYC(account.address, true);
  await contractUDAO.transfer(account.address, ethers.utils.parseEther("100.0"));
  await contractUDAO.connect(account).approve(contractUDAOStaker.address, ethers.utils.parseEther("999999999999.0"));

  // Staking
  await contractUDAOStaker.connect(account).stakeForGovernance(ethers.utils.parseEther("10"), 30);
  await contractUDAOStaker.connect(account).applyForValidator();
  const lazyRole = new LazyRole({
    contract: contractUDAOStaker,
    signer: backend,
  });
  const role_voucher = await lazyRole.createVoucher(account.address, Date.now() + 999999999, 0);
  await contractUDAOStaker.connect(account).getApproved(role_voucher);
}

async function grantJurorRole(account, contractRoleManager, contractUDAO, contractUDAOStaker, backend) {
  await contractRoleManager.setKYC(account.address, true);
  await contractUDAO.transfer(account.address, ethers.utils.parseEther("100.0"));

  await contractUDAO.connect(account).approve(contractUDAOStaker.address, ethers.utils.parseEther("999999999999.0"));

  // Staking

  await contractUDAOStaker.connect(account).stakeForGovernance(ethers.utils.parseEther("10"), 30);
  await contractUDAOStaker.connect(account).applyForJuror();
  const lazyRole = new LazyRole({
    contract: contractUDAOStaker,
    signer: backend,
  });
  const role_voucher = await lazyRole.createVoucher(account.address, Date.now() + 999999999, 1);
  await contractUDAOStaker.connect(account).getApproved(role_voucher);
}
async function checkAccountUDAOVpBalanceAndDelegate(contractUDAOVp, account) {
  const accountBalance = await contractUDAOVp.balanceOf(account.address);
  await expect(accountBalance).to.equal(ethers.utils.parseEther("300"));
  await contractUDAOVp.connect(account).delegate(account.address);
  const accountVotes = await contractUDAOVp.getVotes(account.address);
  await expect(accountVotes).to.equal(ethers.utils.parseEther("300"));
}

async function setupGovernanceMember(contractRoleManager, contractUDAO, contractUDAOStaker, memberToSetup) {
  await contractRoleManager.setKYC(memberToSetup.address, true);
  await contractUDAO.transfer(memberToSetup.address, ethers.utils.parseEther("100.0"));
  await contractUDAO
    .connect(memberToSetup)
    .approve(contractUDAOStaker.address, ethers.utils.parseEther("999999999999.0"));
  await expect(contractUDAOStaker.connect(memberToSetup).stakeForGovernance(ethers.utils.parseEther("10"), 30))
    .to.emit(contractUDAOStaker, "GovernanceStake") // transfer from null address to minter
    .withArgs(memberToSetup.address, ethers.utils.parseEther("10"), ethers.utils.parseEther("300"));
}

describe("Governance Contract", function () {
  it("Should deploy", async function () {
    await reDeploy();
  });

  it("Timelock should set coaching foundation cut to 10%", async function () {
    await reDeploy();

    // send some eth to the contractPlatformTreasury and impersonate it
    await helpers.setBalance(contractUDAOTimelockController.address, hre.ethers.utils.parseEther("1"));
    const signerTimelockController = await ethers.getImpersonatedSigner(contractUDAOTimelockController.address);

    // set coaching foundation cut
    const coachFoundCut = await contractPlatformTreasury.coachFoundCut();
    const coachGoverCut = await contractPlatformTreasury.coachGoverCut();
    const coachJurorCut = await contractPlatformTreasury.coachJurorCut();
    const coachValidCut = await contractPlatformTreasury.coachValidCut();
    await contractPlatformTreasury
      .connect(signerTimelockController)
      .setCoachCuts(10000, coachGoverCut, coachJurorCut, coachValidCut);
    expect(await contractPlatformTreasury.coachFoundCut()).to.equal(10000);
  });

  it("TimeLock should fail to set coaching foundation cut to more than 100%", async function () {
    await reDeploy();
    // send some eth to the contractPlatformTreasury and impersonate it
    await helpers.setBalance(contractUDAOTimelockController.address, hre.ethers.utils.parseEther("1"));
    const signerTimelockController = await ethers.getImpersonatedSigner(contractUDAOTimelockController.address);
    // set coaching foundation cut
    const coachFoundCut = await contractPlatformTreasury.coachFoundCut();
    const coachGoverCut = await contractPlatformTreasury.coachGoverCut();
    const coachJurorCut = await contractPlatformTreasury.coachJurorCut();
    const coachValidCut = await contractPlatformTreasury.coachValidCut();
    await expect(
      contractPlatformTreasury
        .connect(signerTimelockController)
        .setCoachCuts(100001, coachGoverCut, coachJurorCut, coachValidCut)
    ).to.be.revertedWith("Cuts cant be higher than %100");
  });

  it("Should allow governance members to create a proposal", async function () {
    await reDeploy();
    /// @dev Setup governance member
    await setupGovernanceMember(contractRoleManager, contractUDAO, contractUDAOStaker, governanceCandidate);

    /// @dev Check if the governance candidate has the correct amount of UDAO-vp tokens
    const governanceCandidateBalance = await contractUDAOVp.balanceOf(governanceCandidate.address);
    await expect(governanceCandidateBalance).to.equal(ethers.utils.parseEther("300"));
    /// @dev delegate governance candidate's UDAO-vp tokens to himself
    await contractUDAOVp.connect(governanceCandidate).delegate(governanceCandidate.address);
    /// @dev Check votes for governance candidate on latest block
    const governanceCandidateVotes = await contractUDAOVp.getVotes(governanceCandidate.address);
    await expect(governanceCandidateVotes).to.equal(ethers.utils.parseEther("300"));

    /// @dev Proposal settings
    const tokenAddress = contractUDAO.address;
    const token = await ethers.getContractAt("ERC20", tokenAddress);
    const teamAddress = foundation.address;
    const grantAmount = ethers.utils.parseEther("1");
    const transferCalldata = token.interface.encodeFunctionData("transfer", [teamAddress, grantAmount]);
    /// @dev Propose a new proposal
    const proposeTx = await contractUDAOGovernor
      .connect(governanceCandidate)
      .propose([tokenAddress], [0], [transferCalldata], "Proposal #1: Give grant to team");
    /// @dev Wait for the transaction to be mined
    const tx = await proposeTx.wait();

    const proposerAddress = tx.events.find((e) => e.event == "ProposalCreated").args.proposer;
    const targetInfo = tx.events.find((e) => e.event == "ProposalCreated").args.targets;
    const returnedCallData = tx.events.find((e) => e.event == "ProposalCreated").args.calldatas;

    await expect(proposerAddress).to.equal(governanceCandidate.address);
    await expect(targetInfo).to.deep.equal([tokenAddress]);
    await expect(returnedCallData).to.deep.equal([transferCalldata]);
  });

  it("Should allow governance members to vote on created proposal", async function () {
    await reDeploy();
    /// @dev Setup governance member
    await setupGovernanceMember(contractRoleManager, contractUDAO, contractUDAOStaker, governanceCandidate);
    await setupGovernanceMember(contractRoleManager, contractUDAO, contractUDAOStaker, superValidator);
    /// @dev Check if the governance candidate has the correct amount of UDAO-vp tokens
    const governanceCandidateBalance = await contractUDAOVp.balanceOf(governanceCandidate.address);
    await expect(governanceCandidateBalance).to.equal(ethers.utils.parseEther("300"));
    /// @dev delegate superValidator UDAO-vp tokens to himself
    await contractUDAOVp.connect(governanceCandidate).delegate(governanceCandidate.address);
    /// @dev Check votes for governance candidate on latest block
    const governanceCandidateVotes = await contractUDAOVp.getVotes(governanceCandidate.address);
    await expect(governanceCandidateVotes).to.equal(ethers.utils.parseEther("300"));

    /// @dev Check if the superValidator has the correct amount of UDAO-vp tokens
    const superValidatorBalance = await contractUDAOVp.balanceOf(superValidator.address);
    await expect(superValidatorBalance).to.equal(ethers.utils.parseEther("300"));
    /// @dev delegate superValidator UDAO-vp tokens to himself
    await contractUDAOVp.connect(superValidator).delegate(superValidator.address);
    /// @dev Check votes for superValidator on latest block
    const superValidatorVotes = await contractUDAOVp.getVotes(superValidator.address);
    await expect(superValidatorVotes).to.equal(ethers.utils.parseEther("300"));

    /// @dev Proposal settings
    const tokenAddress = contractUDAO.address;
    const token = await ethers.getContractAt("ERC20", tokenAddress);
    const teamAddress = foundation.address;
    const grantAmount = ethers.utils.parseEther("1");
    const transferCalldata = token.interface.encodeFunctionData("transfer", [teamAddress, grantAmount]);
    /// @dev Propose a new proposal
    const proposeTx = await contractUDAOGovernor
      .connect(governanceCandidate)
      .propose([tokenAddress], [0], [transferCalldata], "Proposal #1: Give grant to team");
    /// @dev Wait for the transaction to be mined
    const tx = await proposeTx.wait();
    const proposalId = tx.events.find((e) => e.event == "ProposalCreated").args.proposalId;

    // @dev (7 * 24 * 60 * 60) calculates the total number of seconds in 7 days.
    // @dev 2 is the number of seconds per block
    // @dev We divide the total number of seconds in 7 days by the number of seconds per block
    // @dev We then round up to the nearest whole number
    // @dev This is the number of blocks we need to mine to get to the start of the voting period
    const numBlocksToMine = Math.ceil((7 * 24 * 60 * 60) / 2);
    await hre.network.provider.send("hardhat_mine", [`0x${numBlocksToMine.toString(16)}`, "0x2"]);
    /// @dev Vote on the proposal
    await contractUDAOGovernor.connect(superValidator).castVote(proposalId, 1);
    /// @dev Check if the vote was casted
    const proposalState = await contractUDAOGovernor.state(proposalId);
    await expect(proposalState).to.equal(1);
  });

  it("Should allow anyone to execute a successful proposal (setRequiredValidators)", async function () {
    await reDeploy();
    /// @dev Setup governance member
    await setupGovernanceMember(contractRoleManager, contractUDAO, contractUDAOStaker, governanceCandidate);
    await setupGovernanceMember(contractRoleManager, contractUDAO, contractUDAOStaker, superValidator);
    await setupGovernanceMember(contractRoleManager, contractUDAO, contractUDAOStaker, superValidatorCandidate);
    await setupGovernanceMember(contractRoleManager, contractUDAO, contractUDAOStaker, validatorCandidate);

    /// @dev Check account UDAO-vp balance and delegate to themselves
    await checkAccountUDAOVpBalanceAndDelegate(contractUDAOVp, governanceCandidate);
    await checkAccountUDAOVpBalanceAndDelegate(contractUDAOVp, superValidator);
    await checkAccountUDAOVpBalanceAndDelegate(contractUDAOVp, validator);
    await checkAccountUDAOVpBalanceAndDelegate(contractUDAOVp, validatorCandidate);

    /// @dev Proposal settings
    const contractAddress = contractSupervision.address;
    const contractData = await ethers.getContractAt("Supervision", contractAddress);
    // _requiredValidators is a uint128 integer and is 2
    const _requiredValidators = ethers.utils.defaultAbiCoder.encode(["uint128"], [2]);
    const transferCalldata = contractData.interface.encodeFunctionData("setRequiredValidators", [_requiredValidators]);
    /// @dev Propose a new proposal
    const proposeTx = await contractUDAOGovernor
      .connect(governanceCandidate)
      .propose([contractAddress], [0], [transferCalldata], "Proposal #1: Set required validators to 2");
    /// @dev Wait for the transaction to be mined
    const tx = await proposeTx.wait();
    const proposalId = tx.events.find((e) => e.event == "ProposalCreated").args.proposalId;

    // @dev (7 * 24 * 60 * 60) calculates the total number of seconds in 7 days.
    // @dev 2 is the number of seconds per block
    // @dev We divide the total number of seconds in 7 days by the number of seconds per block
    // @dev We then round up to the nearest whole number
    // @dev This is the number of blocks we need to mine to get to the start of the voting period
    const numBlocksToMine = Math.ceil((7 * 24 * 60 * 60) / 2);
    await hre.network.provider.send("hardhat_mine", [`0x${numBlocksToMine.toString(16)}`, "0x2"]);
    /// @dev Vote on the proposal
    await contractUDAOGovernor.connect(superValidator).castVote(proposalId, 1);
    await contractUDAOGovernor.connect(superValidatorCandidate).castVote(proposalId, 1);
    await contractUDAOGovernor.connect(validator).castVote(proposalId, 1);
    await contractUDAOGovernor.connect(validatorCandidate).castVote(proposalId, 1);

    /// @dev Check if the vote was casted
    const proposalState = await contractUDAOGovernor.state(proposalId);
    await expect(proposalState).to.equal(1);

    /// @dev Skip to the end of the voting period
    const numBlocksToMineToEnd = Math.ceil((7 * 24 * 60 * 60) / 2);
    await hre.network.provider.send("hardhat_mine", [`0x${numBlocksToMineToEnd.toString(16)}`, "0x2"]);
    /// @dev Check if the proposal was successful
    const proposalStateAtStart = await contractUDAOGovernor.state(proposalId);
    await expect(proposalStateAtStart).to.equal(4);
    /// @dev Queue the proposal and Check the ProposalQueued event
    const queueTx = await contractUDAOGovernor
      .connect(governanceCandidate)
      .queue([contractAddress], [0], [transferCalldata], ethers.utils.id("Proposal #1: Set required validators to 2"));
    const queueTxReceipt = await queueTx.wait();
    const queueTxEvent = queueTxReceipt.events.find((e) => e.event == "ProposalQueued");
    await expect(queueTxEvent.args.proposalId).to.equal(proposalId);
    //await expect(queueTxEvent.args.eta).to.equal(0);
    /// @dev Check if the proposal was queued
    const proposalStateAfterQueue = await contractUDAOGovernor.state(proposalId);
    await expect(proposalStateAfterQueue).to.equal(5);
    /// @dev Execute the proposal
    const executeTx = await contractUDAOGovernor
      .connect(governanceCandidate)
      .execute(
        [contractAddress],
        [0],
        [transferCalldata],
        ethers.utils.id("Proposal #1: Set required validators to 2")
      );

    const executeTxReceipt = await executeTx.wait();
    const executeTxEvent = executeTxReceipt.events.find((e) => e.event == "ProposalExecuted");
    await expect(executeTxEvent.args.proposalId).to.equal(proposalId);
    /// @dev Check if the proposal was executed
    const proposalStateAfterExecution = await contractUDAOGovernor.state(proposalId);
    await expect(proposalStateAfterExecution).to.equal(7);
    /// @dev Check if the required validators was set to 2
    const requiredValidators = await contractSupervision.requiredValidators();
    await expect(requiredValidators).to.equal(2);
  });

  it("Should set required jurors to 10", async function () {
    await reDeploy();
    /// @dev Setup governance member
    await setupGovernanceMember(contractRoleManager, contractUDAO, contractUDAOStaker, governanceCandidate);
    await setupGovernanceMember(contractRoleManager, contractUDAO, contractUDAOStaker, superValidator);
    await setupGovernanceMember(contractRoleManager, contractUDAO, contractUDAOStaker, superValidatorCandidate);
    await setupGovernanceMember(contractRoleManager, contractUDAO, contractUDAOStaker, validatorCandidate);

    /// @dev Check account UDAO-vp balance and delegate to themselves
    await checkAccountUDAOVpBalanceAndDelegate(contractUDAOVp, governanceCandidate);
    await checkAccountUDAOVpBalanceAndDelegate(contractUDAOVp, superValidator);
    await checkAccountUDAOVpBalanceAndDelegate(contractUDAOVp, validator);
    await checkAccountUDAOVpBalanceAndDelegate(contractUDAOVp, validatorCandidate);

    /// @dev Proposal settings
    const contractAddress = contractSupervision.address;
    const contractData = await ethers.getContractAt("Supervision", contractAddress);
    // requiredJurors is a uint128 integer and is set to 10
    const _requiredJurors = ethers.utils.defaultAbiCoder.encode(["uint128"], [10]);
    const transferCalldata = contractData.interface.encodeFunctionData("setRequiredJurors", [_requiredJurors]);
    /// @dev Propose a new proposal
    const proposeTx = await contractUDAOGovernor
      .connect(governanceCandidate)
      .propose([contractAddress], [0], [transferCalldata], "Proposal #1: Set required jurors to 10");
    /// @dev Wait for the transaction to be mined
    const tx = await proposeTx.wait();
    const proposalId = tx.events.find((e) => e.event == "ProposalCreated").args.proposalId;

    const numBlocksToMine = Math.ceil((7 * 24 * 60 * 60) / 2);
    await hre.network.provider.send("hardhat_mine", [`0x${numBlocksToMine.toString(16)}`, "0x2"]);
    /// @dev Vote on the proposal
    await contractUDAOGovernor.connect(superValidator).castVote(proposalId, 1);
    await contractUDAOGovernor.connect(superValidatorCandidate).castVote(proposalId, 1);
    await contractUDAOGovernor.connect(validator).castVote(proposalId, 1);
    await contractUDAOGovernor.connect(validatorCandidate).castVote(proposalId, 1);

    /// @dev Check if the vote was casted
    const proposalState = await contractUDAOGovernor.state(proposalId);
    await expect(proposalState).to.equal(1);

    /// @dev Skip to the end of the voting period
    const numBlocksToMineToEnd = Math.ceil((7 * 24 * 60 * 60) / 2);
    await hre.network.provider.send("hardhat_mine", [`0x${numBlocksToMineToEnd.toString(16)}`, "0x2"]);
    /// @dev Check if the proposal was successful
    const proposalStateAtStart = await contractUDAOGovernor.state(proposalId);
    await expect(proposalStateAtStart).to.equal(4);
    /// @dev Queue the proposal and Check the ProposalQueued event
    const queueTx = await contractUDAOGovernor
      .connect(governanceCandidate)
      .queue([contractAddress], [0], [transferCalldata], ethers.utils.id("Proposal #1: Set required jurors to 10"));
    const queueTxReceipt = await queueTx.wait();
    const queueTxEvent = queueTxReceipt.events.find((e) => e.event == "ProposalQueued");
    await expect(queueTxEvent.args.proposalId).to.equal(proposalId);
    //await expect(queueTxEvent.args.eta).to.equal(0);
    /// @dev Check if the proposal was queued
    const proposalStateAfterQueue = await contractUDAOGovernor.state(proposalId);
    await expect(proposalStateAfterQueue).to.equal(5);
    /// @dev Execute the proposal
    const executeTx = await contractUDAOGovernor
      .connect(governanceCandidate)
      .execute([contractAddress], [0], [transferCalldata], ethers.utils.id("Proposal #1: Set required jurors to 10"));

    const executeTxReceipt = await executeTx.wait();
    const executeTxEvent = executeTxReceipt.events.find((e) => e.event == "ProposalExecuted");
    await expect(executeTxEvent.args.proposalId).to.equal(proposalId);
    /// @dev Check if the proposal was executed
    const proposalStateAfterExecution = await contractUDAOGovernor.state(proposalId);
    await expect(proposalStateAfterExecution).to.equal(7);
    /// @dev Check if the required validators was set to 2
    const requiredJurors = await contractSupervision.requiredJurors();
    await expect(requiredJurors).to.equal(10);
  });

  it("Should setCoachingFoundationCut to 1% with proposal execution", async function () {
    await reDeploy();
    /// @dev Setup governance member
    await setupGovernanceMember(contractRoleManager, contractUDAO, contractUDAOStaker, governanceCandidate);
    await setupGovernanceMember(contractRoleManager, contractUDAO, contractUDAOStaker, superValidator);
    await setupGovernanceMember(contractRoleManager, contractUDAO, contractUDAOStaker, superValidatorCandidate);
    await setupGovernanceMember(contractRoleManager, contractUDAO, contractUDAOStaker, validatorCandidate);

    /// @dev Check account UDAO-vp balance and delegate to themselves
    await checkAccountUDAOVpBalanceAndDelegate(contractUDAOVp, governanceCandidate);
    await checkAccountUDAOVpBalanceAndDelegate(contractUDAOVp, superValidator);
    await checkAccountUDAOVpBalanceAndDelegate(contractUDAOVp, validator);
    await checkAccountUDAOVpBalanceAndDelegate(contractUDAOVp, validatorCandidate);

    /// @dev Proposal settings
    const contractAddress = contractPlatformTreasury.address;
    const contractData = await ethers.getContractAt("PlatformTreasury", contractAddress);

    const coachFoundCut = await contractPlatformTreasury.coachFoundCut();
    const coachGoverCut = await contractPlatformTreasury.coachGoverCut();
    const coachJurorCut = await contractPlatformTreasury.coachJurorCut();
    const coachValidCut = await contractPlatformTreasury.coachValidCut();
    const _cut = ethers.utils.defaultAbiCoder.encode(["uint256"], [1000]);
    const transferCalldata = contractData.interface.encodeFunctionData("setCoachCuts", [
      _cut,
      coachGoverCut,
      coachJurorCut,
      coachValidCut,
    ]);
    /// @dev Propose a new proposal
    const proposeTx = await contractUDAOGovernor
      .connect(governanceCandidate)
      .propose([contractAddress], [0], [transferCalldata], "Proposal #1: Set coaching foundation cut to %1");
    /// @dev Wait for the transaction to be mined
    const tx = await proposeTx.wait();
    const proposalId = tx.events.find((e) => e.event == "ProposalCreated").args.proposalId;

    // @dev (7 * 24 * 60 * 60) calculates the total number of seconds in 7 days.
    // @dev 2 is the number of seconds per block
    // @dev We divide the total number of seconds in 7 days by the number of seconds per block
    // @dev We then round up to the nearest whole number
    // @dev This is the number of blocks we need to mine to get to the start of the voting period
    const numBlocksToMine = Math.ceil((7 * 24 * 60 * 60) / 2);
    await hre.network.provider.send("hardhat_mine", [`0x${numBlocksToMine.toString(16)}`, "0x2"]);

    /// @dev Vote on the proposal
    await contractUDAOGovernor.connect(superValidator).castVote(proposalId, 1);
    await contractUDAOGovernor.connect(superValidatorCandidate).castVote(proposalId, 1);
    await contractUDAOGovernor.connect(validator).castVote(proposalId, 1);
    await contractUDAOGovernor.connect(validatorCandidate).castVote(proposalId, 1);

    /// @dev Check if the vote was casted
    const proposalState = await contractUDAOGovernor.state(proposalId);
    await expect(proposalState).to.equal(1);

    /// @dev Skip to the end of the voting period
    const numBlocksToMineToEnd = Math.ceil((7 * 24 * 60 * 60) / 2);
    await hre.network.provider.send("hardhat_mine", [`0x${numBlocksToMineToEnd.toString(16)}`, "0x2"]);
    /// @dev Check if the proposal was successful
    const proposalStateAtStart = await contractUDAOGovernor.state(proposalId);
    await expect(proposalStateAtStart).to.equal(4);
    /// @dev Queue the proposal and Check the ProposalQueued event
    const queueTx = await contractUDAOGovernor
      .connect(governanceCandidate)
      .queue(
        [contractAddress],
        [0],
        [transferCalldata],
        ethers.utils.id("Proposal #1: Set coaching foundation cut to %1")
      );
    const queueTxReceipt = await queueTx.wait();
    const queueTxEvent = queueTxReceipt.events.find((e) => e.event == "ProposalQueued");
    await expect(queueTxEvent.args.proposalId).to.equal(proposalId);
    //await expect(queueTxEvent.args.eta).to.equal(0);
    /// @dev Check if the proposal was queued
    const proposalStateAfterQueue = await contractUDAOGovernor.state(proposalId);
    await expect(proposalStateAfterQueue).to.equal(5);
    /// @dev Execute the proposal
    const executeTx = await contractUDAOGovernor
      .connect(governanceCandidate)
      .execute(
        [contractAddress],
        [0],
        [transferCalldata],
        ethers.utils.id("Proposal #1: Set coaching foundation cut to %1")
      );

    const executeTxReceipt = await executeTx.wait();
    const executeTxEvent = executeTxReceipt.events.find((e) => e.event == "ProposalExecuted");
    await expect(executeTxEvent.args.proposalId).to.equal(proposalId);
    /// @dev Check if the proposal was executed
    const proposalStateAfterExecution = await contractUDAOGovernor.state(proposalId);
    await expect(proposalStateAfterExecution).to.equal(7);
    /// @dev Check if the coachFoundCut was set to 1%
    const _newCut = await contractPlatformTreasury.coachFoundCut();
    await expect(_newCut).to.equal(1000);
  });
  it("Should setCoachingGovernanceCut to 1% with proposal execution", async function () {
    await reDeploy();
    /// @dev Setup governance member
    await setupGovernanceMember(contractRoleManager, contractUDAO, contractUDAOStaker, governanceCandidate);
    await setupGovernanceMember(contractRoleManager, contractUDAO, contractUDAOStaker, superValidator);
    await setupGovernanceMember(contractRoleManager, contractUDAO, contractUDAOStaker, superValidatorCandidate);
    await setupGovernanceMember(contractRoleManager, contractUDAO, contractUDAOStaker, validatorCandidate);

    /// @dev Check account UDAO-vp balance and delegate to themselves
    await checkAccountUDAOVpBalanceAndDelegate(contractUDAOVp, governanceCandidate);
    await checkAccountUDAOVpBalanceAndDelegate(contractUDAOVp, superValidator);
    await checkAccountUDAOVpBalanceAndDelegate(contractUDAOVp, validator);
    await checkAccountUDAOVpBalanceAndDelegate(contractUDAOVp, validatorCandidate);

    /// @dev Proposal settings
    const contractAddress = contractPlatformTreasury.address;
    const contractData = await ethers.getContractAt("PlatformTreasury", contractAddress);

    const coachFoundCut = await contractPlatformTreasury.coachFoundCut();
    const coachGoverCut = await contractPlatformTreasury.coachGoverCut();
    const coachJurorCut = await contractPlatformTreasury.coachJurorCut();
    const coachValidCut = await contractPlatformTreasury.coachValidCut();
    const _cut = ethers.utils.defaultAbiCoder.encode(["uint256"], [1000]);
    const transferCalldata = contractData.interface.encodeFunctionData("setCoachCuts", [
      coachFoundCut,
      _cut,
      coachJurorCut,
      coachValidCut,
    ]);
    /// @dev Propose a new proposal
    const proposeTx = await contractUDAOGovernor
      .connect(governanceCandidate)
      .propose([contractAddress], [0], [transferCalldata], "Proposal #1: Set coaching governance cut to %1");
    /// @dev Wait for the transaction to be mined
    const tx = await proposeTx.wait();
    const proposalId = tx.events.find((e) => e.event == "ProposalCreated").args.proposalId;

    /// @dev Get to start of the voting period
    const numBlocksToMine = Math.ceil((7 * 24 * 60 * 60) / 2);
    await hre.network.provider.send("hardhat_mine", [`0x${numBlocksToMine.toString(16)}`, "0x2"]);

    /// @dev Vote on the proposal
    await contractUDAOGovernor.connect(superValidator).castVote(proposalId, 1);
    await contractUDAOGovernor.connect(superValidatorCandidate).castVote(proposalId, 1);
    await contractUDAOGovernor.connect(validator).castVote(proposalId, 1);
    await contractUDAOGovernor.connect(validatorCandidate).castVote(proposalId, 1);

    /// @dev Check if the vote was casted
    const proposalState = await contractUDAOGovernor.state(proposalId);
    await expect(proposalState).to.equal(1);

    /// @dev Skip to the end of the voting period
    const numBlocksToMineToEnd = Math.ceil((7 * 24 * 60 * 60) / 2);
    await hre.network.provider.send("hardhat_mine", [`0x${numBlocksToMineToEnd.toString(16)}`, "0x2"]);
    /// @dev Check if the proposal was successful
    const proposalStateAtStart = await contractUDAOGovernor.state(proposalId);
    await expect(proposalStateAtStart).to.equal(4);
    /// @dev Queue the proposal and Check the ProposalQueued event
    const queueTx = await contractUDAOGovernor
      .connect(governanceCandidate)
      .queue(
        [contractAddress],
        [0],
        [transferCalldata],
        ethers.utils.id("Proposal #1: Set coaching governance cut to %1")
      );
    const queueTxReceipt = await queueTx.wait();
    const queueTxEvent = queueTxReceipt.events.find((e) => e.event == "ProposalQueued");
    await expect(queueTxEvent.args.proposalId).to.equal(proposalId);
    //await expect(queueTxEvent.args.eta).to.equal(0);
    /// @dev Check if the proposal was queued
    const proposalStateAfterQueue = await contractUDAOGovernor.state(proposalId);
    await expect(proposalStateAfterQueue).to.equal(5);
    /// @dev Execute the proposal
    const executeTx = await contractUDAOGovernor
      .connect(governanceCandidate)
      .execute(
        [contractAddress],
        [0],
        [transferCalldata],
        ethers.utils.id("Proposal #1: Set coaching governance cut to %1")
      );

    const executeTxReceipt = await executeTx.wait();
    const executeTxEvent = executeTxReceipt.events.find((e) => e.event == "ProposalExecuted");
    await expect(executeTxEvent.args.proposalId).to.equal(proposalId);
    /// @dev Check if the proposal was executed
    const proposalStateAfterExecution = await contractUDAOGovernor.state(proposalId);
    await expect(proposalStateAfterExecution).to.equal(7);
    /// @dev Check if the coachGoverCut was set to 1%
    const _newCut = await contractPlatformTreasury.coachGoverCut();
    await expect(_newCut).to.equal(1000);
  });

  it("Should setContentFoundationCut to 1% with proposal execution", async function () {
    await reDeploy();
    /// @dev Setup governance member
    await setupGovernanceMember(contractRoleManager, contractUDAO, contractUDAOStaker, governanceCandidate);
    await setupGovernanceMember(contractRoleManager, contractUDAO, contractUDAOStaker, superValidator);
    await setupGovernanceMember(contractRoleManager, contractUDAO, contractUDAOStaker, superValidatorCandidate);
    await setupGovernanceMember(contractRoleManager, contractUDAO, contractUDAOStaker, validatorCandidate);

    /// @dev Check account UDAO-vp balance and delegate to themselves
    await checkAccountUDAOVpBalanceAndDelegate(contractUDAOVp, governanceCandidate);
    await checkAccountUDAOVpBalanceAndDelegate(contractUDAOVp, superValidator);
    await checkAccountUDAOVpBalanceAndDelegate(contractUDAOVp, validator);
    await checkAccountUDAOVpBalanceAndDelegate(contractUDAOVp, validatorCandidate);

    /// @dev Proposal settings
    const contractAddress = contractPlatformTreasury.address;
    const contractData = await ethers.getContractAt("PlatformTreasury", contractAddress);

    const contentFoundCut = await contractPlatformTreasury.contentFoundCut();
    const contentGoverCut = await contractPlatformTreasury.contentGoverCut();
    const contentJurorCut = await contractPlatformTreasury.contentJurorCut();
    const contentValidCut = await contractPlatformTreasury.contentValidCut();
    const _cut = ethers.utils.defaultAbiCoder.encode(["uint256"], [1000]);
    const transferCalldata = contractData.interface.encodeFunctionData("setContentCuts", [
      _cut,
      contentGoverCut,
      contentJurorCut,
      contentValidCut,
    ]);
    /// @dev Propose a new proposal
    const proposeTx = await contractUDAOGovernor
      .connect(governanceCandidate)
      .propose([contractAddress], [0], [transferCalldata], "Proposal #1: Set content foundation cut to %1");
    /// @dev Wait for the transaction to be mined
    const tx = await proposeTx.wait();
    const proposalId = tx.events.find((e) => e.event == "ProposalCreated").args.proposalId;

    /// @dev Get to start of the voting period
    const numBlocksToMine = Math.ceil((7 * 24 * 60 * 60) / 2);
    await hre.network.provider.send("hardhat_mine", [`0x${numBlocksToMine.toString(16)}`, "0x2"]);

    /// @dev Vote on the proposal
    await contractUDAOGovernor.connect(superValidator).castVote(proposalId, 1);
    await contractUDAOGovernor.connect(superValidatorCandidate).castVote(proposalId, 1);
    await contractUDAOGovernor.connect(validator).castVote(proposalId, 1);
    await contractUDAOGovernor.connect(validatorCandidate).castVote(proposalId, 1);

    /// @dev Check if the vote was casted
    const proposalState = await contractUDAOGovernor.state(proposalId);
    await expect(proposalState).to.equal(1);

    /// @dev Skip to the end of the voting period
    const numBlocksToMineToEnd = Math.ceil((7 * 24 * 60 * 60) / 2);
    await hre.network.provider.send("hardhat_mine", [`0x${numBlocksToMineToEnd.toString(16)}`, "0x2"]);
    /// @dev Check if the proposal was successful
    const proposalStateAtStart = await contractUDAOGovernor.state(proposalId);
    await expect(proposalStateAtStart).to.equal(4);
    /// @dev Queue the proposal and Check the ProposalQueued event
    const queueTx = await contractUDAOGovernor
      .connect(governanceCandidate)
      .queue(
        [contractAddress],
        [0],
        [transferCalldata],
        ethers.utils.id("Proposal #1: Set content foundation cut to %1")
      );
    const queueTxReceipt = await queueTx.wait();
    const queueTxEvent = queueTxReceipt.events.find((e) => e.event == "ProposalQueued");
    await expect(queueTxEvent.args.proposalId).to.equal(proposalId);
    //await expect(queueTxEvent.args.eta).to.equal(0);
    /// @dev Check if the proposal was queued
    const proposalStateAfterQueue = await contractUDAOGovernor.state(proposalId);
    await expect(proposalStateAfterQueue).to.equal(5);
    /// @dev Execute the proposal
    const executeTx = await contractUDAOGovernor
      .connect(governanceCandidate)
      .execute(
        [contractAddress],
        [0],
        [transferCalldata],
        ethers.utils.id("Proposal #1: Set content foundation cut to %1")
      );

    const executeTxReceipt = await executeTx.wait();
    const executeTxEvent = executeTxReceipt.events.find((e) => e.event == "ProposalExecuted");
    await expect(executeTxEvent.args.proposalId).to.equal(proposalId);
    /// @dev Check if the proposal was executed
    const proposalStateAfterExecution = await contractUDAOGovernor.state(proposalId);
    await expect(proposalStateAfterExecution).to.equal(7);
    /// @dev Check if the contentFoundCut was set to 1%
    const _newCut = await contractPlatformTreasury.contentFoundCut();
    await expect(_newCut).to.equal(1000);
  });

  it("Should setContentGovernanceCut to 1% with proposal execution", async function () {
    await reDeploy();
    /// @dev Setup governance member
    await setupGovernanceMember(contractRoleManager, contractUDAO, contractUDAOStaker, governanceCandidate);
    await setupGovernanceMember(contractRoleManager, contractUDAO, contractUDAOStaker, superValidator);
    await setupGovernanceMember(contractRoleManager, contractUDAO, contractUDAOStaker, superValidatorCandidate);
    await setupGovernanceMember(contractRoleManager, contractUDAO, contractUDAOStaker, validatorCandidate);

    /// @dev Check account UDAO-vp balance and delegate to themselves
    await checkAccountUDAOVpBalanceAndDelegate(contractUDAOVp, governanceCandidate);
    await checkAccountUDAOVpBalanceAndDelegate(contractUDAOVp, superValidator);
    await checkAccountUDAOVpBalanceAndDelegate(contractUDAOVp, validator);
    await checkAccountUDAOVpBalanceAndDelegate(contractUDAOVp, validatorCandidate);

    /// @dev Proposal settings
    const contractAddress = contractPlatformTreasury.address;
    const contractData = await ethers.getContractAt("PlatformTreasury", contractAddress);
    const contentFoundCut = await contractPlatformTreasury.contentFoundCut();
    const contentGoverCut = await contractPlatformTreasury.contentGoverCut();
    const contentJurorCut = await contractPlatformTreasury.contentJurorCut();
    const contentValidCut = await contractPlatformTreasury.contentValidCut();
    const _cut = ethers.utils.defaultAbiCoder.encode(["uint256"], [1000]);
    const transferCalldata = contractData.interface.encodeFunctionData("setContentCuts", [
      contentFoundCut,
      _cut,
      contentJurorCut,
      contentValidCut,
    ]);
    /// @dev Propose a new proposal
    const proposeTx = await contractUDAOGovernor
      .connect(governanceCandidate)
      .propose([contractAddress], [0], [transferCalldata], "Proposal #1: Set content governance cut to %1");
    /// @dev Wait for the transaction to be mined
    const tx = await proposeTx.wait();
    const proposalId = tx.events.find((e) => e.event == "ProposalCreated").args.proposalId;

    /// @dev Get to start of the voting period
    const numBlocksToMine = Math.ceil((7 * 24 * 60 * 60) / 2);
    await hre.network.provider.send("hardhat_mine", [`0x${numBlocksToMine.toString(16)}`, "0x2"]);

    /// @dev Vote on the proposal
    await contractUDAOGovernor.connect(superValidator).castVote(proposalId, 1);
    await contractUDAOGovernor.connect(superValidatorCandidate).castVote(proposalId, 1);
    await contractUDAOGovernor.connect(validator).castVote(proposalId, 1);
    await contractUDAOGovernor.connect(validatorCandidate).castVote(proposalId, 1);

    /// @dev Check if the vote was casted
    const proposalState = await contractUDAOGovernor.state(proposalId);
    await expect(proposalState).to.equal(1);

    /// @dev Skip to the end of the voting period
    const numBlocksToMineToEnd = Math.ceil((7 * 24 * 60 * 60) / 2);
    await hre.network.provider.send("hardhat_mine", [`0x${numBlocksToMineToEnd.toString(16)}`, "0x2"]);
    /// @dev Check if the proposal was successful
    const proposalStateAtStart = await contractUDAOGovernor.state(proposalId);
    await expect(proposalStateAtStart).to.equal(4);
    /// @dev Queue the proposal and Check the ProposalQueued event
    const queueTx = await contractUDAOGovernor
      .connect(governanceCandidate)
      .queue(
        [contractAddress],
        [0],
        [transferCalldata],
        ethers.utils.id("Proposal #1: Set content governance cut to %1")
      );
    const queueTxReceipt = await queueTx.wait();
    const queueTxEvent = queueTxReceipt.events.find((e) => e.event == "ProposalQueued");
    await expect(queueTxEvent.args.proposalId).to.equal(proposalId);
    //await expect(queueTxEvent.args.eta).to.equal(0);
    /// @dev Check if the proposal was queued
    const proposalStateAfterQueue = await contractUDAOGovernor.state(proposalId);
    await expect(proposalStateAfterQueue).to.equal(5);
    /// @dev Execute the proposal
    const executeTx = await contractUDAOGovernor
      .connect(governanceCandidate)
      .execute(
        [contractAddress],
        [0],
        [transferCalldata],
        ethers.utils.id("Proposal #1: Set content governance cut to %1")
      );

    const executeTxReceipt = await executeTx.wait();
    const executeTxEvent = executeTxReceipt.events.find((e) => e.event == "ProposalExecuted");
    await expect(executeTxEvent.args.proposalId).to.equal(proposalId);
    /// @dev Check if the proposal was executed
    const proposalStateAfterExecution = await contractUDAOGovernor.state(proposalId);
    await expect(proposalStateAfterExecution).to.equal(7);
    /// @dev Check if the contentGoverCut was set to 1%
    const _newCut = await contractPlatformTreasury.contentGoverCut();
    await expect(_newCut).to.equal(1000);
  });

  it("Should setContentJurorCut to 1% with proposal execution", async function () {
    await reDeploy();
    /// @dev Setup governance member
    await setupGovernanceMember(contractRoleManager, contractUDAO, contractUDAOStaker, governanceCandidate);
    await setupGovernanceMember(contractRoleManager, contractUDAO, contractUDAOStaker, superValidator);
    await setupGovernanceMember(contractRoleManager, contractUDAO, contractUDAOStaker, superValidatorCandidate);
    await setupGovernanceMember(contractRoleManager, contractUDAO, contractUDAOStaker, validatorCandidate);

    /// @dev Check account UDAO-vp balance and delegate to themselves
    await checkAccountUDAOVpBalanceAndDelegate(contractUDAOVp, governanceCandidate);
    await checkAccountUDAOVpBalanceAndDelegate(contractUDAOVp, superValidator);
    await checkAccountUDAOVpBalanceAndDelegate(contractUDAOVp, validator);
    await checkAccountUDAOVpBalanceAndDelegate(contractUDAOVp, validatorCandidate);

    /// @dev Proposal settings
    const contractAddress = contractPlatformTreasury.address;
    const contractData = await ethers.getContractAt("PlatformTreasury", contractAddress);
    const contentFoundCut = await contractPlatformTreasury.contentFoundCut();
    const contentGoverCut = await contractPlatformTreasury.contentGoverCut();
    const contentJurorCut = await contractPlatformTreasury.contentJurorCut();
    const contentValidCut = await contractPlatformTreasury.contentValidCut();
    const _cut = ethers.utils.defaultAbiCoder.encode(["uint256"], [1000]);
    const transferCalldata = contractData.interface.encodeFunctionData("setContentCuts", [
      contentFoundCut,
      contentGoverCut,
      _cut,
      contentValidCut,
    ]);
    /// @dev Propose a new proposal
    const proposeTx = await contractUDAOGovernor
      .connect(governanceCandidate)
      .propose([contractAddress], [0], [transferCalldata], "Proposal #1: Set content juror cut to %1");
    /// @dev Wait for the transaction to be mined
    const tx = await proposeTx.wait();
    const proposalId = tx.events.find((e) => e.event == "ProposalCreated").args.proposalId;

    /// @dev Get to start of the voting period
    const numBlocksToMine = Math.ceil((7 * 24 * 60 * 60) / 2);
    await hre.network.provider.send("hardhat_mine", [`0x${numBlocksToMine.toString(16)}`, "0x2"]);

    /// @dev Vote on the proposal
    await contractUDAOGovernor.connect(superValidator).castVote(proposalId, 1);
    await contractUDAOGovernor.connect(superValidatorCandidate).castVote(proposalId, 1);
    await contractUDAOGovernor.connect(validator).castVote(proposalId, 1);
    await contractUDAOGovernor.connect(validatorCandidate).castVote(proposalId, 1);

    /// @dev Check if the vote was casted
    const proposalState = await contractUDAOGovernor.state(proposalId);
    await expect(proposalState).to.equal(1);

    /// @dev Skip to the end of the voting period
    const numBlocksToMineToEnd = Math.ceil((7 * 24 * 60 * 60) / 2);
    await hre.network.provider.send("hardhat_mine", [`0x${numBlocksToMineToEnd.toString(16)}`, "0x2"]);
    /// @dev Check if the proposal was successful
    const proposalStateAtStart = await contractUDAOGovernor.state(proposalId);
    await expect(proposalStateAtStart).to.equal(4);
    /// @dev Queue the proposal and Check the ProposalQueued event
    const queueTx = await contractUDAOGovernor
      .connect(governanceCandidate)
      .queue([contractAddress], [0], [transferCalldata], ethers.utils.id("Proposal #1: Set content juror cut to %1"));
    const queueTxReceipt = await queueTx.wait();
    const queueTxEvent = queueTxReceipt.events.find((e) => e.event == "ProposalQueued");
    await expect(queueTxEvent.args.proposalId).to.equal(proposalId);
    //await expect(queueTxEvent.args.eta).to.equal(0);
    /// @dev Check if the proposal was queued
    const proposalStateAfterQueue = await contractUDAOGovernor.state(proposalId);
    await expect(proposalStateAfterQueue).to.equal(5);
    /// @dev Execute the proposal
    const executeTx = await contractUDAOGovernor
      .connect(governanceCandidate)
      .execute([contractAddress], [0], [transferCalldata], ethers.utils.id("Proposal #1: Set content juror cut to %1"));

    const executeTxReceipt = await executeTx.wait();
    const executeTxEvent = executeTxReceipt.events.find((e) => e.event == "ProposalExecuted");
    await expect(executeTxEvent.args.proposalId).to.equal(proposalId);
    /// @dev Check if the proposal was executed
    const proposalStateAfterExecution = await contractUDAOGovernor.state(proposalId);
    await expect(proposalStateAfterExecution).to.equal(7);
    /// @dev Check if the contentJurorCut was set to 1%
    const _newCut = await contractPlatformTreasury.contentJurorCut();
    await expect(_newCut).to.equal(1000);
  });

  it("Should setContentValidatorCut to 1% with proposal execution", async function () {
    await reDeploy();
    /// @dev Setup governance member
    await setupGovernanceMember(contractRoleManager, contractUDAO, contractUDAOStaker, governanceCandidate);
    await setupGovernanceMember(contractRoleManager, contractUDAO, contractUDAOStaker, superValidator);
    await setupGovernanceMember(contractRoleManager, contractUDAO, contractUDAOStaker, superValidatorCandidate);
    await setupGovernanceMember(contractRoleManager, contractUDAO, contractUDAOStaker, validatorCandidate);

    /// @dev Check account UDAO-vp balance and delegate to themselves
    await checkAccountUDAOVpBalanceAndDelegate(contractUDAOVp, governanceCandidate);
    await checkAccountUDAOVpBalanceAndDelegate(contractUDAOVp, superValidator);
    await checkAccountUDAOVpBalanceAndDelegate(contractUDAOVp, validator);
    await checkAccountUDAOVpBalanceAndDelegate(contractUDAOVp, validatorCandidate);

    /// @dev Proposal settings
    const contractAddress = contractPlatformTreasury.address;
    const contractData = await ethers.getContractAt("PlatformTreasury", contractAddress);
    const contentFoundCut = await contractPlatformTreasury.contentFoundCut();
    const contentGoverCut = await contractPlatformTreasury.contentGoverCut();
    const contentJurorCut = await contractPlatformTreasury.contentJurorCut();
    const contentValidCut = await contractPlatformTreasury.contentValidCut();
    const _cut = ethers.utils.defaultAbiCoder.encode(["uint256"], [1000]);
    const transferCalldata = contractData.interface.encodeFunctionData("setContentCuts", [
      contentFoundCut,
      contentGoverCut,
      contentJurorCut,
      _cut,
    ]);
    /// @dev Propose a new proposal
    const proposeTx = await contractUDAOGovernor
      .connect(governanceCandidate)
      .propose([contractAddress], [0], [transferCalldata], "Proposal #1: Set content validator cut to %1");
    /// @dev Wait for the transaction to be mined
    const tx = await proposeTx.wait();
    const proposalId = tx.events.find((e) => e.event == "ProposalCreated").args.proposalId;

    /// @dev Get to start of the voting period
    const numBlocksToMine = Math.ceil((7 * 24 * 60 * 60) / 2);
    await hre.network.provider.send("hardhat_mine", [`0x${numBlocksToMine.toString(16)}`, "0x2"]);

    /// @dev Vote on the proposal
    await contractUDAOGovernor.connect(superValidator).castVote(proposalId, 1);
    await contractUDAOGovernor.connect(superValidatorCandidate).castVote(proposalId, 1);
    await contractUDAOGovernor.connect(validator).castVote(proposalId, 1);
    await contractUDAOGovernor.connect(validatorCandidate).castVote(proposalId, 1);

    /// @dev Check if the vote was casted
    const proposalState = await contractUDAOGovernor.state(proposalId);
    await expect(proposalState).to.equal(1);

    /// @dev Skip to the end of the voting period
    const numBlocksToMineToEnd = Math.ceil((7 * 24 * 60 * 60) / 2);
    await hre.network.provider.send("hardhat_mine", [`0x${numBlocksToMineToEnd.toString(16)}`, "0x2"]);
    /// @dev Check if the proposal was successful
    const proposalStateAtStart = await contractUDAOGovernor.state(proposalId);
    await expect(proposalStateAtStart).to.equal(4);
    /// @dev Queue the proposal and Check the ProposalQueued event
    const queueTx = await contractUDAOGovernor
      .connect(governanceCandidate)
      .queue(
        [contractAddress],
        [0],
        [transferCalldata],
        ethers.utils.id("Proposal #1: Set content validator cut to %1")
      );
    const queueTxReceipt = await queueTx.wait();
    const queueTxEvent = queueTxReceipt.events.find((e) => e.event == "ProposalQueued");
    await expect(queueTxEvent.args.proposalId).to.equal(proposalId);
    //await expect(queueTxEvent.args.eta).to.equal(0);
    /// @dev Check if the proposal was queued
    const proposalStateAfterQueue = await contractUDAOGovernor.state(proposalId);
    await expect(proposalStateAfterQueue).to.equal(5);
    /// @dev Execute the proposal
    const executeTx = await contractUDAOGovernor
      .connect(governanceCandidate)
      .execute(
        [contractAddress],
        [0],
        [transferCalldata],
        ethers.utils.id("Proposal #1: Set content validator cut to %1")
      );

    const executeTxReceipt = await executeTx.wait();
    const executeTxEvent = executeTxReceipt.events.find((e) => e.event == "ProposalExecuted");
    await expect(executeTxEvent.args.proposalId).to.equal(proposalId);
    /// @dev Check if the proposal was executed
    const proposalStateAfterExecution = await contractUDAOGovernor.state(proposalId);
    await expect(proposalStateAfterExecution).to.equal(7);
    /// @dev Check if the contentValidCut was set to 1%
    const _newCut = await contractPlatformTreasury.contentValidCut();
    await expect(_newCut).to.equal(1000);
  });
  it("Should allow foundation to cancel a proposal during it is at pending state", async function () {
    await reDeploy();
    /// @dev Setup governance member
    await setupGovernanceMember(contractRoleManager, contractUDAO, contractUDAOStaker, governanceCandidate);
    await setupGovernanceMember(contractRoleManager, contractUDAO, contractUDAOStaker, superValidator);
    await setupGovernanceMember(contractRoleManager, contractUDAO, contractUDAOStaker, superValidatorCandidate);
    await setupGovernanceMember(contractRoleManager, contractUDAO, contractUDAOStaker, validatorCandidate);

    /// @dev Check account UDAO-vp balance and delegate to themselves
    await checkAccountUDAOVpBalanceAndDelegate(contractUDAOVp, governanceCandidate);
    await checkAccountUDAOVpBalanceAndDelegate(contractUDAOVp, superValidator);
    await checkAccountUDAOVpBalanceAndDelegate(contractUDAOVp, validator);
    await checkAccountUDAOVpBalanceAndDelegate(contractUDAOVp, validatorCandidate);

    /// @dev Proposal settings
    const contractAddress = contractPlatformTreasury.address;
    const contractData = await ethers.getContractAt("PlatformTreasury", contractAddress);

    const contentFoundCut = await contractPlatformTreasury.contentFoundCut();
    const contentGoverCut = await contractPlatformTreasury.contentGoverCut();
    const contentJurorCut = await contractPlatformTreasury.contentJurorCut();
    const contentValidCut = await contractPlatformTreasury.contentValidCut();
    const _cut = ethers.utils.defaultAbiCoder.encode(["uint256"], [1000]);
    const transferCalldata = contractData.interface.encodeFunctionData("setContentCuts", [
      contentFoundCut,
      contentGoverCut,
      contentJurorCut,
      _cut,
    ]);
    /// @dev Propose a new proposal
    const proposeTx = await contractUDAOGovernor
      .connect(governanceCandidate)
      .propose([contractAddress], [0], [transferCalldata], "Proposal #1: Set content validator cut to %1");
    /// @dev Wait for the transaction to be mined
    const tx = await proposeTx.wait();
    const proposalId = tx.events.find((e) => e.event == "ProposalCreated").args.proposalId;
    /// @dev Get to start of the voting period
    const numBlocksToMine = Math.ceil((7 * 24 * 60 * 60) / 2);
    await hre.network.provider.send("hardhat_mine", [`0x${numBlocksToMine.toString(16)}`, "0x2"]);
    /// @dev Vote on the proposal
    await contractUDAOGovernor.connect(superValidator).castVote(proposalId, 1);
    await contractUDAOGovernor.connect(superValidatorCandidate).castVote(proposalId, 1);
    await contractUDAOGovernor.connect(validator).castVote(proposalId, 1);
    await contractUDAOGovernor.connect(validatorCandidate).castVote(proposalId, 1);
    /// @dev Check if the vote was casted
    const proposalState = await contractUDAOGovernor.state(proposalId);
    await expect(proposalState).to.equal(1);

    /// @dev Skip to the end of the voting period
    const numBlocksToMineToEnd = Math.ceil((7 * 24 * 60 * 60) / 2);
    await hre.network.provider.send("hardhat_mine", [`0x${numBlocksToMineToEnd.toString(16)}`, "0x2"]);
    /// @dev Check if the proposal was successful
    const proposalStateAtStart = await contractUDAOGovernor.state(proposalId);
    await expect(proposalStateAtStart).to.equal(4);
    /// @dev Queue the proposal and Check the ProposalQueued event

    const queueTx = await contractUDAOGovernor
      .connect(governanceCandidate)
      .queue(
        [contractAddress],
        [0],
        [transferCalldata],
        ethers.utils.id("Proposal #1: Set content validator cut to %1")
      );
    const queueTxReceipt = await queueTx.wait();
    const queueTxEvent = queueTxReceipt.events.find((e) => e.event == "ProposalQueued");

    await expect(queueTxEvent.args.proposalId).to.equal(proposalId);
    // await expect(queueTxEvent.args.eta).to.equal(0);
    /// @dev Check if the proposal was queued
    const proposalStateAfterQueue = await contractUDAOGovernor.state(proposalId);
    await expect(proposalStateAfterQueue).to.equal(5);

    const timelockId = contractUDAOTimelockController.hashOperationBatch(
      [contractAddress],
      ["0"],
      [transferCalldata],
      ethers.constants.HashZero,
      ethers.utils.id("Proposal #1: Set content validator cut to %1")
    );

    /// @dev cancel the proposal
    const cancelTx = await contractUDAOTimelockController.connect(foundation).cancel(timelockId);

    const cancelState = await contractUDAOGovernor.state(proposalId);
    await expect(cancelState).to.equal(2);
  });
  it("Should allow change of quorum with a proposal", async function () {
    await reDeploy();
    /// @dev Setup governance member
    await setupGovernanceMember(contractRoleManager, contractUDAO, contractUDAOStaker, governanceCandidate);
    await setupGovernanceMember(contractRoleManager, contractUDAO, contractUDAOStaker, superValidator);
    await setupGovernanceMember(contractRoleManager, contractUDAO, contractUDAOStaker, superValidatorCandidate);
    await setupGovernanceMember(contractRoleManager, contractUDAO, contractUDAOStaker, validatorCandidate);

    /// @dev Check account UDAO-vp balance and delegate to themselves
    await checkAccountUDAOVpBalanceAndDelegate(contractUDAOVp, governanceCandidate);
    await checkAccountUDAOVpBalanceAndDelegate(contractUDAOVp, superValidator);
    await checkAccountUDAOVpBalanceAndDelegate(contractUDAOVp, validator);
    await checkAccountUDAOVpBalanceAndDelegate(contractUDAOVp, validatorCandidate);
    /// @dev Proposal settings
    const contractAddress = contractUDAOGovernor.address;
    const contractData = await ethers.getContractAt("UDAOGovernor", contractAddress);
    /// @dev 50 means 50% quorum
    const _newQuorum = ethers.utils.defaultAbiCoder.encode(["uint256"], [ethers.utils.parseEther("50")]);
    const transferCalldata = contractData.interface.encodeFunctionData("setQuorum", [_newQuorum]);
    /// @dev Propose a new proposal
    const proposeTx = await contractUDAOGovernor
      .connect(governanceCandidate)
      .propose([contractAddress], [0], [transferCalldata], "Proposal #1: Set quorum to 50 UDAO-vp");
    /// @dev Wait for the transaction to be mined
    const tx = await proposeTx.wait();
    const proposalId = tx.events.find((e) => e.event == "ProposalCreated").args.proposalId;

    /// @dev Get to start of the voting period
    const numBlocksToMine = Math.ceil((7 * 24 * 60 * 60) / 2);
    await hre.network.provider.send("hardhat_mine", [`0x${numBlocksToMine.toString(16)}`, "0x2"]);

    /// @dev Vote on the proposal
    await contractUDAOGovernor.connect(superValidator).castVote(proposalId, 1);
    await contractUDAOGovernor.connect(superValidatorCandidate).castVote(proposalId, 1);
    await contractUDAOGovernor.connect(validator).castVote(proposalId, 1);
    await contractUDAOGovernor.connect(validatorCandidate).castVote(proposalId, 1);

    /// @dev Check if the vote was casted
    const proposalState = await contractUDAOGovernor.state(proposalId);
    await expect(proposalState).to.equal(1);

    /// @dev Skip to the end of the voting period
    const numBlocksToMineToEnd = Math.ceil((7 * 24 * 60 * 60) / 2);
    await hre.network.provider.send("hardhat_mine", [`0x${numBlocksToMineToEnd.toString(16)}`, "0x2"]);
    /// @dev Check if the proposal was successful
    const proposalStateAtStart = await contractUDAOGovernor.state(proposalId);
    await expect(proposalStateAtStart).to.equal(4);
    /// @dev Queue the proposal and Check the ProposalQueued event

    const queueTx = await contractUDAOGovernor
      .connect(governanceCandidate)
      .queue([contractAddress], [0], [transferCalldata], ethers.utils.id("Proposal #1: Set quorum to 50 UDAO-vp"));
    const queueTxReceipt = await queueTx.wait();
    const queueTxEvent = queueTxReceipt.events.find((e) => e.event == "ProposalQueued");

    await expect(queueTxEvent.args.proposalId).to.equal(proposalId);
    /// @dev Check if the proposal was queued
    const proposalStateAfterQueue = await contractUDAOGovernor.state(proposalId);
    await expect(proposalStateAfterQueue).to.equal(5);
    /// @dev Execute the proposal
    const executeTx = await contractUDAOGovernor
      .connect(governanceCandidate)
      .execute([contractAddress], [0], [transferCalldata], ethers.utils.id("Proposal #1: Set quorum to 50 UDAO-vp"));
    const executeTxReceipt = await executeTx.wait();
    const executeTxEvent = executeTxReceipt.events.find((e) => e.event == "ProposalExecuted");

    await expect(executeTxEvent.args.proposalId).to.equal(proposalId);
    /// @dev Check if the proposal was executed
    const proposalStateAfterExecute = await contractUDAOGovernor.state(proposalId);
    await expect(proposalStateAfterExecute).to.equal(7);
    /// @dev Check if the quorum was changed

    // Expect oldQuorumNumerator to equal to oldQuorum
    expect(await contractUDAOGovernor.quorum(1)).to.equal(ethers.utils.parseEther("50"));
  });

  it("Should fail to execute if quorum is not met", async function () {
    await reDeploy();
    /// @dev Current quorum is 4%. Increase this in order to easy testing
    /// @dev Setup governance member
    await setupGovernanceMember(contractRoleManager, contractUDAO, contractUDAOStaker, governanceCandidate);
    await setupGovernanceMember(contractRoleManager, contractUDAO, contractUDAOStaker, superValidator);
    await setupGovernanceMember(contractRoleManager, contractUDAO, contractUDAOStaker, superValidatorCandidate);
    await setupGovernanceMember(contractRoleManager, contractUDAO, contractUDAOStaker, validatorCandidate);

    /// @dev Check account UDAO-vp balance and delegate to themselves
    await checkAccountUDAOVpBalanceAndDelegate(contractUDAOVp, governanceCandidate);
    await checkAccountUDAOVpBalanceAndDelegate(contractUDAOVp, superValidator);
    await checkAccountUDAOVpBalanceAndDelegate(contractUDAOVp, validator);
    await checkAccountUDAOVpBalanceAndDelegate(contractUDAOVp, validatorCandidate);
    /// @dev Proposal settings
    const contractAddress = contractUDAOGovernor.address;
    const contractData = await ethers.getContractAt("UDAOGovernor", contractAddress);
    /// @dev 50 means 50% quorum
    const _newQuorum = ethers.utils.defaultAbiCoder.encode(["uint256"], [ethers.utils.parseEther("7500000000000")]);
    const transferCalldata = contractData.interface.encodeFunctionData("setQuorum", [_newQuorum]);
    /// @dev Propose a new proposal
    const proposeTx = await contractUDAOGovernor
      .connect(governanceCandidate)
      .propose([contractAddress], [0], [transferCalldata], "Proposal #1: Set quorum to 7500000000000 UDAO-vp");
    /// @dev Wait for the transaction to be mined
    const tx = await proposeTx.wait();
    const proposalId = tx.events.find((e) => e.event == "ProposalCreated").args.proposalId;

    /// @dev Get to start of the voting period
    const numBlocksToMine = Math.ceil((7 * 24 * 60 * 60) / 2);
    await hre.network.provider.send("hardhat_mine", [`0x${numBlocksToMine.toString(16)}`, "0x2"]);

    /// @dev Vote on the proposal
    await contractUDAOGovernor.connect(superValidator).castVote(proposalId, 1);
    await contractUDAOGovernor.connect(superValidatorCandidate).castVote(proposalId, 1);
    await contractUDAOGovernor.connect(validator).castVote(proposalId, 1);
    await contractUDAOGovernor.connect(validatorCandidate).castVote(proposalId, 1);

    /// @dev Check if the vote was casted
    const proposalState = await contractUDAOGovernor.state(proposalId);
    await expect(proposalState).to.equal(1);

    /// @dev Skip to the end of the voting period
    const numBlocksToMineToEnd = Math.ceil((7 * 24 * 60 * 60) / 2);
    await hre.network.provider.send("hardhat_mine", [`0x${numBlocksToMineToEnd.toString(16)}`, "0x2"]);
    /// @dev Check if the proposal was successful
    const proposalStateAtStart = await contractUDAOGovernor.state(proposalId);
    await expect(proposalStateAtStart).to.equal(4);
    /// @dev Queue the proposal and Check the ProposalQueued event
    await contractUDAOGovernor
      .connect(governanceCandidate)
      .queue(
        [contractAddress],
        [0],
        [transferCalldata],
        ethers.utils.id("Proposal #1: Set quorum to 7500000000000 UDAO-vp")
      );

    /// @dev Check if the proposal was queued
    const proposalStateAfterQueue = await contractUDAOGovernor.state(proposalId);
    await expect(proposalStateAfterQueue).to.equal(5);
    /// @dev Execute the proposal
    await contractUDAOGovernor
      .connect(governanceCandidate)
      .execute(
        [contractAddress],
        [0],
        [transferCalldata],
        ethers.utils.id("Proposal #1: Set quorum to 7500000000000 UDAO-vp")
      );

    /// @dev Check if the proposal was executed
    const proposalStateAfterExecute = await contractUDAOGovernor.state(proposalId);
    await expect(proposalStateAfterExecute).to.equal(7);

    /// @dev Create new proposal, vote and expect it to fail
    const _newQuorum2 = ethers.utils.defaultAbiCoder.encode(["uint256"], [ethers.utils.parseEther("25")]);
    const transferCalldata2 = contractData.interface.encodeFunctionData("setQuorum", [_newQuorum2]);

    const proposeTx2 = await contractUDAOGovernor
      .connect(governanceCandidate)
      .propose([contractAddress], [0], [transferCalldata2], "Proposal #2: Set quorum to 25 UDAO-vp");
    /// @dev Wait for the transaction to be mined
    const tx2 = await proposeTx2.wait();
    const proposalId2 = tx2.events.find((e) => e.event == "ProposalCreated").args.proposalId;

    /// @dev Get to start of the voting period
    const numBlocksToMine2 = Math.ceil((7 * 24 * 60 * 60) / 2);
    await hre.network.provider.send("hardhat_mine", [`0x${numBlocksToMine2.toString(16)}`, "0x2"]);

    /// @dev Vote on the proposal, note that only 2 people voted, below 75% quorum
    await contractUDAOGovernor.connect(superValidator).castVote(proposalId2, 1);
    await contractUDAOGovernor.connect(superValidatorCandidate).castVote(proposalId2, 1);
    /// @dev Check if the vote was casted
    const proposalState2 = await contractUDAOGovernor.state(proposalId2);
    await expect(proposalState2).to.equal(1);

    /// @dev Skip to the end of the voting period
    const numBlocksToMineToEnd2 = Math.ceil((7 * 24 * 60 * 60) / 2);
    await hre.network.provider.send("hardhat_mine", [`0x${numBlocksToMineToEnd2.toString(16)}`, "0x2"]);
    /// @dev Check if the proposal was Defeated
    const proposalStateAtStart2 = await contractUDAOGovernor.state(proposalId2);
    await expect(proposalStateAtStart2).to.equal(3);
  });
  it("Should successfully to execute if quorum is met", async function () {
    await reDeploy();
    /// @dev Current quorum is 4%. Increase this in order to easy testing
    /// @dev Setup governance member
    await setupGovernanceMember(contractRoleManager, contractUDAO, contractUDAOStaker, governanceCandidate);
    await setupGovernanceMember(contractRoleManager, contractUDAO, contractUDAOStaker, superValidator);
    await setupGovernanceMember(contractRoleManager, contractUDAO, contractUDAOStaker, superValidatorCandidate);
    await setupGovernanceMember(contractRoleManager, contractUDAO, contractUDAOStaker, validatorCandidate);

    /// @dev Check account UDAO-vp balance and delegate to themselves
    await checkAccountUDAOVpBalanceAndDelegate(contractUDAOVp, governanceCandidate);
    await checkAccountUDAOVpBalanceAndDelegate(contractUDAOVp, superValidatorCandidate);
    await checkAccountUDAOVpBalanceAndDelegate(contractUDAOVp, superValidator);
    await checkAccountUDAOVpBalanceAndDelegate(contractUDAOVp, validator);
    await checkAccountUDAOVpBalanceAndDelegate(contractUDAOVp, validatorCandidate);
    /// @dev Proposal settings
    const contractAddress = contractUDAOGovernor.address;
    const contractData = await ethers.getContractAt("UDAOGovernor", contractAddress);
    /// @dev 75 means 75% quorum
    const _newQuorum = ethers.utils.defaultAbiCoder.encode(["uint256"], [ethers.utils.parseEther("75")]);
    const transferCalldata = contractData.interface.encodeFunctionData("setQuorum", [_newQuorum]);
    /// @dev Propose a new proposal
    const proposeTx = await contractUDAOGovernor
      .connect(governanceCandidate)
      .propose([contractAddress], [0], [transferCalldata], "Proposal #1: Set quorum to 75 UDAO-vp");
    /// @dev Wait for the transaction to be mined
    const tx = await proposeTx.wait();
    const proposalId = tx.events.find((e) => e.event == "ProposalCreated").args.proposalId;

    /// @dev Get to start of the voting period
    const numBlocksToMine = Math.ceil((7 * 24 * 60 * 60) / 2);
    await hre.network.provider.send("hardhat_mine", [`0x${numBlocksToMine.toString(16)}`, "0x2"]);

    /// @dev Vote on the proposal
    await contractUDAOGovernor.connect(superValidator).castVote(proposalId, 1);
    await contractUDAOGovernor.connect(superValidatorCandidate).castVote(proposalId, 1);
    await contractUDAOGovernor.connect(validator).castVote(proposalId, 1);
    await contractUDAOGovernor.connect(validatorCandidate).castVote(proposalId, 1);

    /// @dev Check if the vote was casted
    const proposalState = await contractUDAOGovernor.state(proposalId);
    await expect(proposalState).to.equal(1);

    /// @dev Skip to the end of the voting period
    const numBlocksToMineToEnd = Math.ceil((7 * 24 * 60 * 60) / 2);
    await hre.network.provider.send("hardhat_mine", [`0x${numBlocksToMineToEnd.toString(16)}`, "0x2"]);
    /// @dev Check if the proposal was successful
    const proposalStateAtStart = await contractUDAOGovernor.state(proposalId);
    await expect(proposalStateAtStart).to.equal(4);
    /// @dev Queue the proposal and Check the ProposalQueued event
    await contractUDAOGovernor
      .connect(governanceCandidate)
      .queue([contractAddress], [0], [transferCalldata], ethers.utils.id("Proposal #1: Set quorum to 75 UDAO-vp"));

    /// @dev Check if the proposal was queued
    const proposalStateAfterQueue = await contractUDAOGovernor.state(proposalId);
    await expect(proposalStateAfterQueue).to.equal(5);
    /// @dev Execute the proposal
    await contractUDAOGovernor
      .connect(governanceCandidate)
      .execute([contractAddress], [0], [transferCalldata], ethers.utils.id("Proposal #1: Set quorum to 75 UDAO-vp"));

    /// @dev Check if the proposal was executed
    const proposalStateAfterExecute = await contractUDAOGovernor.state(proposalId);
    await expect(proposalStateAfterExecute).to.equal(7);
    await hre.network.provider.send("hardhat_mine");
    /// @dev Create new proposal, vote and expect it to fail
    const _newQuorum2 = ethers.utils.defaultAbiCoder.encode(["uint256"], [ethers.utils.parseEther("25")]);
    const transferCalldata2 = contractData.interface.encodeFunctionData("setQuorum", [_newQuorum2]);

    const proposeTx2 = await contractUDAOGovernor
      .connect(governanceCandidate)
      .propose([contractAddress], [0], [transferCalldata2], "Proposal #2: Set quorum to 25 UDAO-vp");
    /// @dev Wait for the transaction to be mined
    const tx2 = await proposeTx2.wait();
    await hre.network.provider.send("hardhat_mine");
    const proposalId2 = tx2.events.find((e) => e.event == "ProposalCreated").args.proposalId;

    /// @dev Get to start of the voting period
    const numBlocksToMine2 = Math.ceil((7 * 24 * 60 * 60) / 2);
    await hre.network.provider.send("hardhat_mine", [`0x${numBlocksToMine2.toString(16)}`, "0x2"]);

    /// @dev Vote on the proposal, note that everyone has voted, above 75% quorum
    await contractUDAOGovernor.connect(governanceCandidate).castVote(proposalId2, 1);
    await contractUDAOGovernor.connect(superValidator).castVote(proposalId2, 1);
    await contractUDAOGovernor.connect(superValidatorCandidate).castVote(proposalId2, 1);
    await contractUDAOGovernor.connect(validator).castVote(proposalId2, 1);
    await contractUDAOGovernor.connect(validatorCandidate).castVote(proposalId2, 1);
    /// @dev Check if the vote was casted
    const proposalState2 = await contractUDAOGovernor.state(proposalId2);
    await expect(proposalState2).to.equal(1);

    /// @dev Skip to the end of the voting period
    const numBlocksToMineToEnd2 = Math.ceil((8 * 24 * 60 * 60) / 2);
    await hre.network.provider.send("hardhat_mine", [`0x${numBlocksToMineToEnd2.toString(16)}`, "0x2"]);

    /// @dev Check if the proposal was Succeeded
    const proposalStateAtStart2 = await contractUDAOGovernor.state(proposalId2);
    await expect(proposalStateAtStart2).to.equal(4);
  });

  it("TimeLock transfer token to another address", async function () {
    await reDeploy();
    /// @dev Setup governance member
    await setupGovernanceMember(contractRoleManager, contractUDAO, contractUDAOStaker, governanceCandidate);
    await setupGovernanceMember(contractRoleManager, contractUDAO, contractUDAOStaker, superValidator);
    await setupGovernanceMember(contractRoleManager, contractUDAO, contractUDAOStaker, superValidatorCandidate);
    await setupGovernanceMember(contractRoleManager, contractUDAO, contractUDAOStaker, validatorCandidate);

    /// @dev Check account UDAO-vp balance and delegate to themselves
    await checkAccountUDAOVpBalanceAndDelegate(contractUDAOVp, governanceCandidate);
    await checkAccountUDAOVpBalanceAndDelegate(contractUDAOVp, superValidatorCandidate);
    await checkAccountUDAOVpBalanceAndDelegate(contractUDAOVp, superValidator);
    await checkAccountUDAOVpBalanceAndDelegate(contractUDAOVp, validator);
    await checkAccountUDAOVpBalanceAndDelegate(contractUDAOVp, validatorCandidate);

    // send some eth to the contractPlatformTreasury and impersonate it
    await helpers.setBalance(contractUDAOTimelockController.address, hre.ethers.utils.parseEther("1"));
    await contractUDAO.transfer(contractUDAOTimelockController.address, ethers.utils.parseEther("100.0"));
    // check balance of contractPlatformTreasury
    const balanceContractPlatformTreasury = await contractUDAO.balanceOf(contractPlatformTreasury.address);
    const balanceContractTimeLockController = await contractUDAO.balanceOf(contractUDAOTimelockController.address);

    // Create a proposal and send eth to the contractPlatformTreasury
    const transferCalldata = contractUDAO.interface.encodeFunctionData("transfer", [
      contractPlatformTreasury.address,
      hre.ethers.utils.parseEther("1"),
    ]);
    const proposeTx = await contractUDAOGovernor
      .connect(governanceCandidate)
      .propose(
        [contractUDAO.address],
        [0],
        [transferCalldata],
        "Proposal #1: Send 1 eth to the contractPlatformTreasury"
      );
    // Wait for the transaction to be mined
    const tx = await proposeTx.wait();
    // Get the proposal id
    const proposalId = tx.events.find((e) => e.event == "ProposalCreated").args.proposalId;
    // Get to start of the voting period
    const numBlocksToMine = Math.ceil((7 * 24 * 60 * 60) / 2);
    await hre.network.provider.send("hardhat_mine", [`0x${numBlocksToMine.toString(16)}`, "0x2"]);
    // Vote on the proposal, note that everyone has voted, above 75% quorum
    /// @dev Vote on the proposal
    await contractUDAOGovernor.connect(superValidator).castVote(proposalId, 1);
    await contractUDAOGovernor.connect(superValidatorCandidate).castVote(proposalId, 1);
    await contractUDAOGovernor.connect(validator).castVote(proposalId, 1);
    await contractUDAOGovernor.connect(validatorCandidate).castVote(proposalId, 1);
    /// @dev Check if the vote was casted
    const proposalState = await contractUDAOGovernor.state(proposalId);
    await expect(proposalState).to.equal(1);

    /// @dev Skip to the end of the voting period
    const numBlocksToMineToEnd = Math.ceil((7 * 24 * 60 * 60) / 2);
    await hre.network.provider.send("hardhat_mine", [`0x${numBlocksToMineToEnd.toString(16)}`, "0x2"]);
    // Check if the proposal was successful
    const proposalStateAtStart = await contractUDAOGovernor.state(proposalId);
    await expect(proposalStateAtStart).to.equal(4);
    // Queue the proposal and Check the ProposalQueued event
    await contractUDAOGovernor
      .connect(governanceCandidate)
      .queue(
        [contractUDAO.address],
        [0],
        [transferCalldata],
        ethers.utils.id("Proposal #1: Send 1 eth to the contractPlatformTreasury")
      );
    // Check if the proposal was queued
    const proposalStateAfterQueue = await contractUDAOGovernor.state(proposalId);
    await expect(proposalStateAfterQueue).to.equal(5);
    // Execute the proposal
    await contractUDAOGovernor
      .connect(governanceCandidate)
      .execute(
        [contractUDAO.address],
        [0],
        [transferCalldata],
        ethers.utils.id("Proposal #1: Send 1 eth to the contractPlatformTreasury")
      );
    // Check if the proposal was executed
    const proposalStateAfterExecute = await contractUDAOGovernor.state(proposalId);
    await expect(proposalStateAfterExecute).to.equal(7);
    await hre.network.provider.send("hardhat_mine");

    // check balance of contractPlatformTreasury
    const balanceAfterContractPlatformTreasury = await contractUDAO.balanceOf(contractPlatformTreasury.address);
    const balanceAfterContractTimeLockController = await contractUDAO.balanceOf(contractUDAOTimelockController.address);
    expect(balanceAfterContractPlatformTreasury).to.equal(
      balanceContractPlatformTreasury.add(hre.ethers.utils.parseEther("1"))
    );
    expect(balanceAfterContractTimeLockController).to.equal(
      balanceContractTimeLockController.sub(hre.ethers.utils.parseEther("1"))
    );
  });

  it("TimeLock transfer ether to another address", async function () {
    await reDeploy();
    /// @dev Setup governance member
    await setupGovernanceMember(contractRoleManager, contractUDAO, contractUDAOStaker, governanceCandidate);
    await setupGovernanceMember(contractRoleManager, contractUDAO, contractUDAOStaker, superValidator);
    await setupGovernanceMember(contractRoleManager, contractUDAO, contractUDAOStaker, superValidatorCandidate);
    await setupGovernanceMember(contractRoleManager, contractUDAO, contractUDAOStaker, validatorCandidate);

    /// @dev Check account UDAO-vp balance and delegate to themselves
    await checkAccountUDAOVpBalanceAndDelegate(contractUDAOVp, governanceCandidate);
    await checkAccountUDAOVpBalanceAndDelegate(contractUDAOVp, superValidatorCandidate);
    await checkAccountUDAOVpBalanceAndDelegate(contractUDAOVp, superValidator);
    await checkAccountUDAOVpBalanceAndDelegate(contractUDAOVp, validator);
    await checkAccountUDAOVpBalanceAndDelegate(contractUDAOVp, validatorCandidate);

    const randomWallet = await ethers.Wallet.createRandom();

    // send some eth to the contractPlatformTreasury and impersonate it
    await helpers.setBalance(contractUDAOTimelockController.address, hre.ethers.utils.parseEther("10"));
    // check balance of contractPlatformTreasury
    const provider = waffle.provider;

    const balanceRandomWallet = await provider.getBalance(randomWallet.address);
    const balanceContractTimeLockController = await provider.getBalance(contractUDAOTimelockController.address);

    // Create a proposal and send eth to the contractPlatformTreasury
    const proposeTx = await contractUDAOGovernor
      .connect(governanceCandidate)
      .propose(
        [randomWallet.address],
        [ethers.utils.parseEther("1.0")],
        ["0x"],
        "Proposal #1: Send 1 eth to the contractPlatformTreasury"
      );
    // Wait for the transaction to be mined
    const tx = await proposeTx.wait();
    // Get the proposal id
    const proposalId = tx.events.find((e) => e.event == "ProposalCreated").args.proposalId;
    // Get to start of the voting period
    const numBlocksToMine = Math.ceil((7 * 24 * 60 * 60) / 2);
    await hre.network.provider.send("hardhat_mine", [`0x${numBlocksToMine.toString(16)}`, "0x2"]);
    // Vote on the proposal, note that everyone has voted, above 75% quorum
    /// @dev Vote on the proposal
    await contractUDAOGovernor.connect(superValidator).castVote(proposalId, 1);
    await contractUDAOGovernor.connect(superValidatorCandidate).castVote(proposalId, 1);
    await contractUDAOGovernor.connect(validator).castVote(proposalId, 1);
    await contractUDAOGovernor.connect(validatorCandidate).castVote(proposalId, 1);
    /// @dev Check if the vote was casted
    const proposalState = await contractUDAOGovernor.state(proposalId);
    await expect(proposalState).to.equal(1);

    /// @dev Skip to the end of the voting period
    const numBlocksToMineToEnd = Math.ceil((7 * 24 * 60 * 60) / 2);
    await hre.network.provider.send("hardhat_mine", [`0x${numBlocksToMineToEnd.toString(16)}`, "0x2"]);
    // Check if the proposal was successful
    const proposalStateAtStart = await contractUDAOGovernor.state(proposalId);
    await expect(proposalStateAtStart).to.equal(4);
    // Queue the proposal and Check the ProposalQueued event
    await contractUDAOGovernor
      .connect(governanceCandidate)
      .queue(
        [randomWallet.address],
        [ethers.utils.parseEther("1.0")],
        ["0x"],
        ethers.utils.id("Proposal #1: Send 1 eth to the contractPlatformTreasury")
      );
    // Check if the proposal was queued
    const proposalStateAfterQueue = await contractUDAOGovernor.state(proposalId);
    await expect(proposalStateAfterQueue).to.equal(5);
    // Execute the proposal
    await contractUDAOGovernor
      .connect(governanceCandidate)
      .execute(
        [randomWallet.address],
        [ethers.utils.parseEther("1.0")],
        ["0x"],
        ethers.utils.id("Proposal #1: Send 1 eth to the contractPlatformTreasury")
      );
    // Check if the proposal was executed
    const proposalStateAfterExecute = await contractUDAOGovernor.state(proposalId);
    await expect(proposalStateAfterExecute).to.equal(7);
    await hre.network.provider.send("hardhat_mine");

    // check balance of contractPlatformTreasury
    const balanceAfterRandomWallet = await provider.getBalance(randomWallet.address);
    const balanceAfterContractTimeLockController = await provider.getBalance(contractUDAOTimelockController.address);
    expect(balanceAfterRandomWallet).to.equal(balanceRandomWallet.add(ethers.utils.parseEther("1.0")));
    expect(balanceAfterContractTimeLockController).to.equal(
      balanceContractTimeLockController.sub(ethers.utils.parseEther("1.0"))
    );
  });
});
