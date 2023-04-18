const { expect } = require("chai");
const hardhat = require("hardhat");
const { ethers } = hardhat;
const chai = require("chai");
const BN = require("bn.js");
const helpers = require("@nomicfoundation/hardhat-network-helpers");

const {
  WMATIC_ABI,
  NonFunbiblePositionABI,
  NonFunbiblePositionAddress,
  WMATICAddress,
} = require("../lib/abis");

// Enable and inject BN dependency
chai.use(require("chai-bn")(BN));


async function setupGovernanceMember(contractRoleManager, contractUDAO, contractUDAOStaker, governanceCandidate) {
  await contractRoleManager.setKYC(governanceCandidate.address, true);
  await contractUDAO.transfer(
    governanceCandidate.address,
    ethers.utils.parseEther("100.0")
  );
  await contractUDAO
    .connect(governanceCandidate)
    .approve(
      contractUDAOStaker.address,
      ethers.utils.parseEther("999999999999.0")
    );
  await expect(
    contractUDAOStaker
      .connect(governanceCandidate)
      .stakeForGovernance(ethers.utils.parseEther("10"),
      30)
  )
    .to.emit(contractUDAOStaker, "GovernanceStake") // transfer from null address to minter
    .withArgs(
      governanceCandidate.address,
      ethers.utils.parseEther("10"),
      ethers.utils.parseEther("300")
    );
}

async function deploy() {
  helpers.reset(
    "https://polygon-mainnet.g.alchemy.com/v2/OsNaN43nxvV85Kk1JpU-a5qduFwjcIGJ",
    40691400
  );
  const [
    backend,
    contentCreator,
    contentBuyer,
    validatorCandidate,
    validator,
    superValidatorCandidate,
    superValidator,
    foundation,
    governanceCandidate,
    governanceMember,
    jurorCandidate,
    jurorMember,
  ] = await ethers.getSigners();

  // FACTORIES
  let factoryRoleManager = await ethers.getContractFactory("RoleManager");
  let factoryUDAOVp = await ethers.getContractFactory("UDAOVp");
  let factoryUDAOTimelockController = await ethers.getContractFactory(
    "UDAOTimelockController"
  );
  let factoryUDAOCertificate = await ethers.getContractFactory(
    "UDAOCertificate"
  );
  let factoryUDAO = await ethers.getContractFactory("UDAO");
  let factoryUDAOStaker = await ethers.getContractFactory("UDAOStaker");
  let factoryValidationManager = await ethers.getContractFactory(
    "ValidationManager"
  );
  let factoryJurorManager = await ethers.getContractFactory("JurorManager");
  let factoryUDAOContent = await ethers.getContractFactory("UDAOContent");
  let factoryPlatformTreasury = await ethers.getContractFactory(
    "PlatformTreasury"
  );
  let factoryUDAOGovernor = await ethers.getContractFactory("UDAOGovernor");
  let factoryContractManager = await ethers.getContractFactory(
    "ContractManager"
  );

  //DEPLOYMENTS
  const contractUDAO = await factoryUDAO.deploy();

  // Deploys PriceGetter

  const positionManager = await ethers.getContractAt(
    NonFunbiblePositionABI,
    "0xC36442b4a4522E871399CD717aBDD847Ab11FE88"
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

  let factoryPriceGetter = await ethers.getContractFactory("PriceGetter");
  
  // Price Getter End
  const contractRoleManager = await factoryRoleManager.deploy();
  const contractPriceGetter = await factoryPriceGetter.deploy(
    "0x1F98431c8aD98523631AE4a59f267346ea31F984",
    contractUDAO.address,
    "0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270",
    3000,
    contractRoleManager.address
  );
  const contractUDAOCertificate = await factoryUDAOCertificate.deploy(
    contractRoleManager.address
  );
  const contractUDAOContent = await factoryUDAOContent.deploy(
    contractRoleManager.address
  );
  const contractValidationManager = await factoryValidationManager.deploy(
    contractUDAOContent.address,
    contractRoleManager.address
  );
  const contractJurorManager = await factoryJurorManager.deploy(
    contractRoleManager.address,
    contractUDAOContent.address,
    contractValidationManager.address
  );

  const contractContractManager = await factoryContractManager.deploy(
    contractValidationManager.address,
    contractJurorManager.address,
    contractUDAO.address,
    contractUDAOContent.address,
    contractRoleManager.address
  );

  const contractUDAOVp = await factoryUDAOVp.deploy(
    contractRoleManager.address,
    contractContractManager.address
  );
  const contractPlatformTreasury = await factoryPlatformTreasury.deploy(
    contractContractManager.address,
    contractRoleManager.address,
    contractPriceGetter.address
  );

  const contractUDAOStaker = await factoryUDAOStaker.deploy(
    contractPlatformTreasury.address,
    contractRoleManager.address,
    contractUDAOVp.address,
    contractContractManager.address
  );

  const contractUDAOTimelockController =
    await factoryUDAOTimelockController.deploy(1, [], [foundation.address]);
  const contractUDAOGovernor = await factoryUDAOGovernor.deploy(
    contractUDAOVp.address,
    contractUDAOTimelockController.address,
    contractUDAOStaker.address,
    contractRoleManager.address
  );
  //POST DEPLOYMENT
  // add proposer
  const PROPOSER_ROLE = ethers.utils.keccak256(
    ethers.utils.toUtf8Bytes("PROPOSER_ROLE")
  );
  await contractUDAOTimelockController.grantRole(
    PROPOSER_ROLE,
    contractUDAOGovernor.address
  );

  // grant roles
  const BACKEND_ROLE = ethers.utils.keccak256(
    ethers.utils.toUtf8Bytes("BACKEND_ROLE")
  );
  await contractRoleManager.grantRole(BACKEND_ROLE, backend.address);
  const FOUNDATION_ROLE = ethers.utils.keccak256(
    ethers.utils.toUtf8Bytes("FOUNDATION_ROLE")
  );

  await contractRoleManager.grantRole(FOUNDATION_ROLE, foundation.address);
  const STAKING_CONTRACT = ethers.utils.keccak256(
    ethers.utils.toUtf8Bytes("STAKING_CONTRACT")
  );
  await contractRoleManager.grantRole(
    STAKING_CONTRACT,
    contractUDAOStaker.address
  );
  const GOVERNANCE_ROLE = ethers.utils.keccak256(
    ethers.utils.toUtf8Bytes("GOVERNANCE_ROLE")
  );
  const GOVERNANCE_CONTRACT = ethers.utils.keccak256(
    ethers.utils.toUtf8Bytes("GOVERNANCE_CONTRACT")
  );
  await contractRoleManager.grantRole(
    GOVERNANCE_ROLE,
    contractUDAOTimelockController.address
  );
  
  // TODO IS THIS NECESSARY?
  await contractRoleManager.grantRole(
    GOVERNANCE_CONTRACT,
    contractUDAOGovernor.address
  );

  const VALIDATION_MANAGER = ethers.utils.keccak256(
    ethers.utils.toUtf8Bytes("VALIDATION_MANAGER")
  );
  await contractRoleManager.grantRole(
    VALIDATION_MANAGER,
    contractValidationManager.address
  );
  const DEFAULT_ADMIN_ROLE = ethers.utils.keccak256(
    ethers.utils.toUtf8Bytes("DEFAULT_ADMIN_ROLE")
  );
  await contractRoleManager.grantRole(DEFAULT_ADMIN_ROLE, foundation.address);
  await contractRoleManager.grantRole(
    DEFAULT_ADMIN_ROLE,
    contractUDAOTimelockController.address
  );
  // add missing contract addresses to the contract manager
  await contractContractManager
    .connect(backend)
    .setAddressStaking(contractUDAOStaker.address);
  await contractContractManager
    .connect(backend)
    .setPlatformTreasuryAddress(contractPlatformTreasury.address);
  await contractContractManager
    .connect(backend)
    .setAddressUdaoVp(contractUDAOVp.address);
  // add staking contract to udao-vp
  await contractUDAOVp.connect(backend).updateAddresses();

  return {
    backend,
    contentCreator,
    contentBuyer,
    validatorCandidate,
    validator,
    superValidatorCandidate,
    superValidator,
    foundation,
    governanceCandidate,
    governanceMember,
    jurorCandidate,
    jurorMember,
    contractUDAO,
    contractRoleManager,
    contractUDAOCertificate,
    contractUDAOContent,
    contractValidationManager,
    contractPlatformTreasury,
    contractUDAOVp,
    contractUDAOStaker,
    contractUDAOTimelockController,
    contractUDAOGovernor,
  };
}

describe("Governance Contract", function () {
  it("Should deploy", async function () {
    const {
      backend,
      validatorCandidate,
      validator,
      superValidatorCandidate,
      superValidator,
      foundation,
      governanceCandidate,
      governanceMember,
      jurorCandidate,
      jurorMember,
      contractUDAO,
      contractRoleManager,
      contractUDAOCertificate,
      contractUDAOContent,
      contractValidationManager,
      contractPlatformTreasury,
      contractUDAOVp,
      contractUDAOStaker,
      contractUDAOTimelockController,
      contractUDAOGovernor,
    } = await deploy();
  });

  it("Timelock should set coaching foundation cut to 10%", async function () {
    const {
      backend,
      validatorCandidate,
      validator,
      superValidatorCandidate,
      superValidator,
      foundation,
      governanceCandidate,
      governanceMember,
      jurorCandidate,
      jurorMember,
      contractUDAO,
      contractRoleManager,
      contractUDAOCertificate,
      contractUDAOContent,
      contractValidationManager,
      contractPlatformTreasury,
      contractUDAOVp,
      contractUDAOStaker,
      contractUDAOTimelockController,
      contractUDAOGovernor,
    } = await deploy();

    // impersonate a whale
    const address = "0xe7804c37c13166ff0b37f5ae0bb07a3aebb6e245";
    await helpers.impersonateAccount(address);
    const imporsonatedWhale = await ethers.getSigner(address);

    // imporsonate timelock controller
    await hre.network.provider.request({
      method: "hardhat_impersonateAccount",
      params: [contractUDAOTimelockController.address],
    });
    const signerTimelockController = await ethers.provider.getSigner(contractUDAOTimelockController.address);
    // send some funds to timelock controller
    await imporsonatedWhale.sendTransaction({to: contractUDAOTimelockController.address, value: ethers.utils.parseEther("1")})
    // set coaching foundation cut
    await contractPlatformTreasury.connect(signerTimelockController).setCoachingFoundationCut(10000);
    expect(await contractPlatformTreasury.coachingFoundationCut()).to.equal(10000);

  });

  it("TimeLock should fail to set coaching foundation cut to more than 100%", async function () {
    const {
      backend,
      validatorCandidate,
      validator,
      superValidatorCandidate,
      superValidator,
      foundation,
      governanceCandidate,
      governanceMember,
      jurorCandidate,
      jurorMember,
      contractUDAO,
      contractRoleManager,
      contractUDAOCertificate,
      contractUDAOContent,
      contractValidationManager,
      contractPlatformTreasury,
      contractUDAOVp,
      contractUDAOStaker,
      contractUDAOTimelockController,
      contractUDAOGovernor,
    } = await deploy();
    // impersonate a whale
    const address = "0xe7804c37c13166ff0b37f5ae0bb07a3aebb6e245";
    await helpers.impersonateAccount(address);
    const imporsonatedWhale = await ethers.getSigner(address);

    // imporsonate timelock controller
    await hre.network.provider.request({
      method: "hardhat_impersonateAccount",
      params: [contractUDAOTimelockController.address],
    });
    const signerTimelockController = await ethers.provider.getSigner(contractUDAOTimelockController.address);
    // send some funds to timelock controller
    await imporsonatedWhale.sendTransaction({to: contractUDAOTimelockController.address, value: ethers.utils.parseEther("1")})
    // set coaching foundation cut
    await expect(contractPlatformTreasury.connect(signerTimelockController).setCoachingFoundationCut(100001)).to.be.revertedWith("Cuts cant be higher than %100");
  });

  it("Should allow governance members to create a proposal", async function () {
    const {
      backend,
      validatorCandidate,
      validator,
      superValidatorCandidate,
      superValidator,
      foundation,
      governanceCandidate,
      governanceMember,
      jurorCandidate,
      jurorMember,
      contractUDAO,
      contractRoleManager,
      contractUDAOCertificate,
      contractUDAOContent,
      contractValidationManager,
      contractPlatformTreasury,
      contractUDAOVp,
      contractUDAOStaker,
      contractUDAOTimelockController,
      contractUDAOGovernor,
    } = await deploy();
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
    const grantAmount = ethers.utils.parseEther("1")
    const transferCalldata = token.interface.encodeFunctionData("transfer", [teamAddress, grantAmount]);
    /// @dev Propose a new proposal
    const proposeTx = await contractUDAOGovernor.connect(governanceCandidate).propose([tokenAddress],
        [0],
        [transferCalldata],
        "Proposal #1: Give grant to team",);
    /// @dev Wait for the transaction to be mined
    const tx = await proposeTx.wait();

    const proposerAddress = tx.events.find((e) => e.event == 'ProposalCreated').args.proposer;
    const targetInfo = tx.events.find((e) => e.event == 'ProposalCreated').args.targets;
    const returnedCallData = tx.events.find((e) => e.event == 'ProposalCreated').args.calldatas;
    
    await expect(proposerAddress).to.equal(governanceCandidate.address);
    await expect(targetInfo).to.deep.equal([tokenAddress]);
    await expect(returnedCallData).to.deep.equal([transferCalldata]);

  });
  
  it ("Should allow governance members to vote on created proposal", async function () {
    const {
      backend,
      validatorCandidate,
      validator,
      superValidatorCandidate,
      superValidator,
      foundation,
      governanceCandidate,
      governanceMember,
      jurorCandidate,
      jurorMember,
      contractUDAO,
      contractRoleManager,
      contractUDAOCertificate,
      contractUDAOContent,
      contractValidationManager,
      contractPlatformTreasury,
      contractUDAOVp,
      contractUDAOStaker,
      contractUDAOTimelockController,
      contractUDAOGovernor,
    } = await deploy();
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
    const grantAmount = ethers.utils.parseEther("1")
    const transferCalldata = token.interface.encodeFunctionData("transfer", [teamAddress, grantAmount]);
    /// @dev Propose a new proposal
    const proposeTx = await contractUDAOGovernor.connect(governanceCandidate).propose([tokenAddress],
        [0],
        [transferCalldata],
        "Proposal #1: Give grant to team",);
    /// @dev Wait for the transaction to be mined
    const tx = await proposeTx.wait();
    const proposalId = tx.events.find((e) => e.event == 'ProposalCreated').args.proposalId;
    
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

  /*
  it("Should allow governance members to execute a proposal", async function () {
    const {
      backend,
      validatorCandidate,
      validator,
      superValidatorCandidate,
      superValidator,
      foundation,
      governanceCandidate,
      governanceMember,
      jurorCandidate,
      jurorMember,
      contractUDAO,
      contractRoleManager,
      contractUDAOCertificate,
      contractUDAOContent,
      contractValidationManager,
      contractPlatformTreasury,
      contractUDAOVp,
      contractUDAOStaker,
      contractUDAOTimelockController,
      contractUDAOGovernor,
    } = await deploy();
    /// @dev Setup governance member
    await setupGovernanceMember(contractRoleManager, contractUDAO, contractUDAOStaker, governanceCandidate);
    await setupGovernanceMember(contractRoleManager, contractUDAO, contractUDAOStaker, superValidator);
    await setupGovernanceMember(contractRoleManager, contractUDAO, contractUDAOStaker, superValidatorCandidate);
    await setupGovernanceMember(contractRoleManager, contractUDAO, contractUDAOStaker, validatorCandidate);
    await setupGovernanceMember(contractRoleManager, contractUDAO, contractUDAOStaker, validator);
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

    /// @dev Check if the validator has the correct amount of UDAO-vp tokens
    const validatorBalance = await contractUDAOVp.balanceOf(validator.address);
    await expect(validatorBalance).to.equal(ethers.utils.parseEther("300"));
    /// @dev delegate validator UDAO-vp tokens to himself
    await contractUDAOVp.connect(validator).delegate(validator.address);
    /// @dev Check votes for validator on latest block
    const validatorVotes = await contractUDAOVp.getVotes(validator.address);
    await expect(validatorVotes).to.equal(ethers.utils.parseEther("300"));

    /// @dev Check if the validatorCandidate has the correct amount of UDAO-vp tokens
    const validatorCandidateBalance = await contractUDAOVp.balanceOf(validatorCandidate.address);
    await expect(validatorCandidateBalance).to.equal(ethers.utils.parseEther("300"));
    /// @dev delegate validatorCandidate UDAO-vp tokens to himself
    await contractUDAOVp.connect(validatorCandidate).delegate(validatorCandidate.address);
    /// @dev Check votes for validatorCandidate on latest block
    const validatorCandidateVotes = await contractUDAOVp.getVotes(validatorCandidate.address);
    await expect(validatorCandidateVotes).to.equal(ethers.utils.parseEther("300"));

    
    /// @dev Proposal settings
    const tokenAddress = contractUDAO.address;
    const token = await ethers.getContractAt("ERC20", tokenAddress);
    const teamAddress = foundation.address;
    const grantAmount = ethers.utils.parseEther("1")
    const transferCalldata = token.interface.encodeFunctionData("transfer", [teamAddress, grantAmount]);
    
    /// @dev Propose a new proposal
    const proposeTx = await contractUDAOGovernor.connect(governanceCandidate).propose([tokenAddress],
        [0],
        [transferCalldata],
        ethers.utils.id("Proposal #1: Give grant to team"));
    /// @dev Wait for the transaction to be mined
    const tx = await proposeTx.wait();
    const proposalId = tx.events.find((e) => e.event == 'ProposalCreated').args.proposalId;
    
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
    console.log("Proposal #1 was successful");
    /// @dev Execute the proposal
    console.log("step 1")
    const executeTx = await contractUDAOGovernor.connect(governanceCandidate).execute([tokenAddress],
      [0],
      [transferCalldata],
      ethers.utils.id("Proposal #1: Give grant to team"));
    console.log("step 2")
    const executeTxReceipt = await executeTx.wait();
    console.log("step 3")
    const executeTxEvent = executeTxReceipt.events.find((e) => e.event == 'ProposalExecuted');
    console.log("step 4")
    await expect(executeTxEvent.args.proposalId).to.equal(proposalId);
    console.log("step 5")
    console.log("Proposal #1 was executed");
    /// @dev Queue the proposal and Check the ProposalQueued event
    const queueTx = await contractUDAOGovernor.connect(governanceCandidate).queue([tokenAddress],
      [0],
      [transferCalldata],
      ethers.utils.id("Proposal #1: Give grant to team"));
    console.log("step 1")
    const queueTxReceipt = await queueTx.wait();
    console.log("step 2")
    const queueTxEvent = queueTxReceipt.events.find((e) => e.event == 'ProposalQueued');
    console.log("step 3")
    await expect(queueTxEvent.args.proposalId).to.equal(proposalId);
    console.log("step 4")
    await expect(queueTxEvent.args.eta).to.equal(0);
    console.log("step 5")
    console.log("Proposal #1 was queued");
    /// @dev Check the queue
    const queue = await contractUDAOGovernor.getActions(proposalId);
    await expect(queue[0].to).to.equal(tokenAddress);
    await expect(queue[0].value).to.equal(0);
    await expect(queue[0].data).to.equal(transferCalldata);
    console.log("Proposal #1 was queued correctly");
    /// @dev Check if the proposal was queued
    const proposalStateAtEnd = await contractUDAOGovernor.state(proposalId);
    await expect(proposalStateAtEnd).to.equal(2);





  });*/
  
});
