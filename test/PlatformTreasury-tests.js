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
async function checkAccountUDAOVpBalanceAndDelegate(contractUDAOVp, account) {
  const accountBalance = await contractUDAOVp.balanceOf(account.address);
  await expect(accountBalance).to.equal(ethers.utils.parseEther("300"));
  await contractUDAOVp.connect(account).delegate(account.address);
  const accountVotes = await contractUDAOVp.getVotes(account.address);
  await expect(accountVotes).to.equal(ethers.utils.parseEther("300"));
}
async function runValidation(contractValidationManager, backend, validator1, validator2, validator3, validator4, validator5, contentCreator) {
  await expect(
    contractValidationManager.connect(backend).createValidation(0, 50)
  )
    .to.emit(contractValidationManager, "ValidationCreated")
    .withArgs(ethers.BigNumber.from(0), ethers.BigNumber.from(1));
  await expect(
    contractValidationManager.connect(validator1).assignValidation(1)
  )
    .to.emit(contractValidationManager, "ValidationAssigned")
    .withArgs(
      ethers.BigNumber.from(0),
      ethers.BigNumber.from(1),
      validator1.address
    );
  await expect(
    contractValidationManager.connect(validator2).assignValidation(1)
  )
    .to.emit(contractValidationManager, "ValidationAssigned")
    .withArgs(
      ethers.BigNumber.from(0),
      ethers.BigNumber.from(1),
      validator2.address
    );
  await expect(
    contractValidationManager.connect(validator3).assignValidation(1)
  )
    .to.emit(contractValidationManager, "ValidationAssigned")
    .withArgs(
      ethers.BigNumber.from(0),
      ethers.BigNumber.from(1),
      validator3.address
    );
  await expect(
    contractValidationManager.connect(validator4).assignValidation(1)
  )
    .to.emit(contractValidationManager, "ValidationAssigned")
    .withArgs(
      ethers.BigNumber.from(0),
      ethers.BigNumber.from(1),
      validator4.address
    );
  await expect(
    contractValidationManager.connect(validator5).assignValidation(1)
  )
    .to.emit(contractValidationManager, "ValidationAssigned")
    .withArgs(
      ethers.BigNumber.from(0),
      ethers.BigNumber.from(1),
      validator5.address
    );

  await expect(
    contractValidationManager.connect(validator1).sendValidation(1, true)
  )
    .to.emit(contractValidationManager, "ValidationResultSent")
    .withArgs(
      ethers.BigNumber.from(0),
      ethers.BigNumber.from(1),
      validator1.address,
      true
    );
  await expect(
    contractValidationManager.connect(validator2).sendValidation(1, true)
  )
    .to.emit(contractValidationManager, "ValidationResultSent")
    .withArgs(
      ethers.BigNumber.from(0),
      ethers.BigNumber.from(1),
      validator2.address,
      true
    );
  await expect(
    contractValidationManager.connect(validator3).sendValidation(1, true)
  )
    .to.emit(contractValidationManager, "ValidationResultSent")
    .withArgs(
      ethers.BigNumber.from(0),
      ethers.BigNumber.from(1),
      validator3.address,
      true
    );
  await expect(
    contractValidationManager.connect(validator4).sendValidation(1, true)
  )
    .to.emit(contractValidationManager, "ValidationResultSent")
    .withArgs(
      ethers.BigNumber.from(0),
      ethers.BigNumber.from(1),
      validator4.address,
      true
    );
  await expect(
    contractValidationManager.connect(validator5).sendValidation(1, false)
  )
    .to.emit(contractValidationManager, "ValidationResultSent")
    .withArgs(
      ethers.BigNumber.from(0),
      ethers.BigNumber.from(1),
      validator5.address,
      false
    );
  await expect(
    contractValidationManager.connect(contentCreator).finalizeValidation(1)
  )
    .to.emit(contractValidationManager, "ValidationEnded")
    .withArgs(ethers.BigNumber.from(0), ethers.BigNumber.from(1), true);
}

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
async function createContent(contractRoleManager, contractUDAOContent, contentCreator, contractValidationManager, backend, validator1, validator2, validator3, validator4, validator5, contentCreator){
  /// Set KYC 
  await contractRoleManager.setKYC(contentCreator.address, true);
  /// Redeem content
  await expect(
    contractUDAOContent.connect(contentCreator).redeem([ethers.utils.parseEther("1"), ethers.utils.parseEther("1")],
      "udao",
      "ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi",
      contentCreator.address,
      ethers.utils.parseEther("2"),
      "udao",
      true,
      true,)
  )
    .to.emit(contractUDAOContent, "Transfer") // transfer from null address to minter
    .withArgs(
      "0x0000000000000000000000000000000000000000",
      contentCreator.address,
      0
    );

  /// Start validation and finalize it
  await runValidation(contractValidationManager, backend, validator1, validator2, validator3, validator4, validator5, contentCreator);

}
async function makeContentPurchase(contractPlatformTreasury, contentBuyer, contractRoleManager, contractUDAO) {
  /// Set KYC
  await contractRoleManager.setKYC(contentBuyer.address, true);

  

  
  /// Send UDAO to the buyer's wallet
  await contractUDAO.transfer(
    contentBuyer.address,
    ethers.utils.parseEther("100.0")
  );
  /// Content buyer needs to give approval to the platformtreasury
  await contractUDAO
    .connect(contentBuyer)
    .approve(
      contractPlatformTreasury.address,
      ethers.utils.parseEther("999999999999.0")
    );

  await contractPlatformTreasury
    .connect(contentBuyer)
    .buyContent(0, true, [1], ethers.constants.AddressZero);
  const result = await contractPlatformTreasury
    .connect(contentBuyer)
    .getOwnedContent(contentBuyer.address);

  const numArray = result.map((x) => x.map((y) => y.toNumber()));
  expect(numArray).to.eql([[0, 0]]);
}
async function deploy() {
  helpers.reset(
    "https://polygon-mainnet.g.alchemy.com/v2/OsNaN43nxvV85Kk1JpU-a5qduFwjcIGJ",
    40691400
  );
  const [
    backend,
    contentCreator,
    contentBuyer1,
    contentBuyer2,
    contentBuyer3,
    validatorCandidate,
    validator1,
    validator2,
    validator3,
    validator4,
    validator5,
    superValidatorCandidate,
    superValidator,
    foundation,
    governanceCandidate,
    governanceMember,
    jurorCandidate,
    jurorMember1,
    jurorMember2,
    jurorMember3
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
  const contractRoleManager = await factoryRoleManager.deploy();
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

  const EXECUTOR_ROLE = ethers.utils.keccak256(
    ethers.utils.toUtf8Bytes("EXECUTOR_ROLE")
  );
  const JUROR_ROLE = ethers.utils.keccak256(
    ethers.utils.toUtf8Bytes("JUROR_ROLE")
  );
  await contractRoleManager.grantRole(
    JUROR_ROLE,
    jurorMember1.address
  );
  await contractRoleManager.grantRole(
    JUROR_ROLE,
    jurorMember2.address
  );
  await contractRoleManager.grantRole(
    JUROR_ROLE,
    jurorMember3.address
  );
  // @dev Setting the zero address as the executor role will allow anyone to execute the proposal
  await contractUDAOTimelockController.grantRole(
    EXECUTOR_ROLE,
    // zero address
    "0x0000000000000000000000000000000000000000"
  );

  // grant roles
  const TREASURY_CONTRACT = ethers.utils.keccak256(
    ethers.utils.toUtf8Bytes("TREASURY_CONTRACT")
  );
  await contractRoleManager.grantRole(TREASURY_CONTRACT, contractPlatformTreasury.address);
  const BACKEND_ROLE = ethers.utils.keccak256(
    ethers.utils.toUtf8Bytes("BACKEND_ROLE")
  );
  await contractRoleManager.grantRole(BACKEND_ROLE, backend.address);
  // approve udao tokens to timelock controller
  // Create signer for contractPlatformTreasury
  await helpers.setBalance(contractPlatformTreasury.address, hre.ethers.utils.parseEther("1"));
  const signerPlatformTreasury = await ethers.getImpersonatedSigner(contractPlatformTreasury.address);
  await contractUDAO
    .connect(signerPlatformTreasury)
    .approve(
      contractUDAOTimelockController.address,
      ethers.utils.parseEther("999999999999999999999999999999999999999999999999999999999.0")
    );
  //await contractUDAO.connect(backend).setApprovalForTimeLockController(contractUDAOTimelockController.address);
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
  await contractRoleManager.grantRole(
    GOVERNANCE_ROLE,
    contractUDAOTimelockController.address
  );
  const GOVERNANCE_CONTRACT = ethers.utils.keccak256(
    ethers.utils.toUtf8Bytes("GOVERNANCE_CONTRACT")
  );
  // TODO IS THIS NECESSARY?
  await contractRoleManager.grantRole(
    GOVERNANCE_CONTRACT,
    contractUDAOGovernor.address
  );
  const VALIDATOR_ROLE = ethers.utils.keccak256(
    ethers.utils.toUtf8Bytes("VALIDATOR_ROLE")
  );
  await contractRoleManager.grantRole(VALIDATOR_ROLE, validator1.address);
  await contractRoleManager.grantRole(VALIDATOR_ROLE, validator2.address);
  await contractRoleManager.grantRole(VALIDATOR_ROLE, validator3.address);
  await contractRoleManager.grantRole(VALIDATOR_ROLE, validator4.address);
  await contractRoleManager.grantRole(VALIDATOR_ROLE, validator5.address);


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
    contentBuyer1,
    contentBuyer2,
    contentBuyer3,
    validatorCandidate,
    validator1,
    validator2,
    validator3,
    validator4,
    validator5,
    superValidatorCandidate,
    superValidator,
    foundation,
    governanceCandidate,
    governanceMember,
    jurorCandidate,
    jurorMember1,
    jurorMember2,
    jurorMember3,
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
    contractJurorManager,
    contractContractManager
  };
}


describe("Platform Treasury General", function () {
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
      jurorMember1,
      jurorMember2,
      jurorMember3,
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
      contractJurorManager,
      contractContractManager
    } = await deploy();
  });
  it("Should allow backend to set new governance treasury address", async function () {
    const {
      backend,
      contentCreator,
      contentBuyer1,
      contentBuyer2,
      contentBuyer3,
      validatorCandidate,
      validator1,
      validator2,
      validator3,
      validator4,
      validator5,
      superValidatorCandidate,
      superValidator,
      foundation,
      governanceCandidate,
      governanceMember,
      jurorCandidate,
      jurorMember1,
      jurorMember2,
      jurorMember3,
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
      contractJurorManager,
      contractContractManager
    } = await deploy();

    // new dummy governance treasury address
    const newGovernanceTreasur = await ethers.Wallet.createRandom();
    // set new governance treasury address
    await contractPlatformTreasury.connect(backend).setGovernanceTreasuryAddress(newGovernanceTreasur.address);
    const governanceTreasuryAddress = await contractPlatformTreasury.governanceTreasury();
    expect(governanceTreasuryAddress).to.equal(newGovernanceTreasur.address);
  });
  it("Should allow backend to set new foundation wallet address", async function () {
    const {
      backend,
    contentCreator,
    contentBuyer1,
    contentBuyer2,
    contentBuyer3,
    validatorCandidate,
    validator1,
    validator2,
    validator3,
    validator4,
    validator5,
    superValidatorCandidate,
    superValidator,
    foundation,
    governanceCandidate,
    governanceMember,
    jurorCandidate,
    jurorMember1,
    jurorMember2,
    jurorMember3,
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
    contractJurorManager,
    contractContractManager
    } = await deploy();

    // new dummy foundation address
    const newFoundation = await ethers.Wallet.createRandom();
    // set new foundation address
    await contractPlatformTreasury.connect(backend).setFoundationWalletAddress(newFoundation.address);
    const foundationAddress = await contractPlatformTreasury.foundationWallet();
    expect(foundationAddress).to.equal(newFoundation.address);
  });
  it("Should allow governance to withdraw funds from the treasury after a content purchase", async function () {
    const {
      backend,
    contentCreator,
    contentBuyer1,
    contentBuyer2,
    contentBuyer3,
    validatorCandidate,
    validator1,
    validator2,
    validator3,
    validator4,
    validator5,
    superValidatorCandidate,
    superValidator,
    foundation,
    governanceCandidate,
    governanceMember,
    jurorCandidate,
    jurorMember1,
    jurorMember2,
    jurorMember3,
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
    contractJurorManager,
    contractContractManager
    } = await deploy();
    /// @dev Setup governance member
    await setupGovernanceMember(contractRoleManager, contractUDAO, contractUDAOStaker, governanceCandidate);
    await setupGovernanceMember(contractRoleManager, contractUDAO, contractUDAOStaker, superValidator);
    await setupGovernanceMember(contractRoleManager, contractUDAO, contractUDAOStaker, superValidatorCandidate);
    await setupGovernanceMember(contractRoleManager, contractUDAO, contractUDAOStaker, validatorCandidate);
    await setupGovernanceMember(contractRoleManager, contractUDAO, contractUDAOStaker, validator1);

    /// @dev Check account UDAO-vp balance and delegate to themselves
    await checkAccountUDAOVpBalanceAndDelegate(contractUDAOVp, governanceCandidate);
    await checkAccountUDAOVpBalanceAndDelegate(contractUDAOVp, superValidator);
    await checkAccountUDAOVpBalanceAndDelegate(contractUDAOVp, validator1);
    await checkAccountUDAOVpBalanceAndDelegate(contractUDAOVp, validatorCandidate);
 // Create content
 await createContent(contractRoleManager, contractUDAOContent, contentCreator, contractValidationManager, backend, validator1, validator2, validator3, validator4, validator5, contentCreator);
    // Make a content purchase to gather funds for governance
    await makeContentPurchase(contractPlatformTreasury, contentBuyer1, contractRoleManager, contractUDAO);

    // new dummy governance treasury address
    const newGovernanceTreasur = await ethers.Wallet.createRandom();

    // set new governance treasury address
    await contractPlatformTreasury.connect(backend).setGovernanceTreasuryAddress(newGovernanceTreasur.address);
    const governanceTreasuryAddress = await contractPlatformTreasury.governanceTreasury();
    expect(governanceTreasuryAddress).to.equal(newGovernanceTreasur.address);

    /// @dev Check if the governance candidate has the correct amount of UDAO-vp tokens
    const governanceCandidateBalance = await contractUDAOVp.balanceOf(governanceCandidate.address);
    await expect(governanceCandidateBalance).to.equal(ethers.utils.parseEther("300"));

    /// @dev delegate governance candidate's UDAO-vp tokens to himself
    await contractUDAOVp.connect(governanceCandidate).delegate(governanceCandidate.address);

    /// @dev Check votes for governance candidate on latest block
    const governanceCandidateVotes = await contractUDAOVp.getVotes(governanceCandidate.address);
    await expect(governanceCandidateVotes).to.equal(ethers.utils.parseEther("300"));

    // Create proposal settings to withdraw funds from the treasury
    const targetContractAddress = contractPlatformTreasury.address;
    const targetContract = await ethers.getContractAt("PlatformTreasury", contractPlatformTreasury.address);
    const proposalValues = 0;
    const proposalCalldata = targetContract.interface.encodeFunctionData("withdrawGovernance");
    const proposalDescription = "Withdraw funds from the treasury";

    // propose
    const proposeTx = await contractUDAOGovernor.connect(governanceCandidate).propose([targetContractAddress], [proposalValues], [proposalCalldata], proposalDescription);

    /// @dev Wait for the transaction to be mined
    const tx = await proposeTx.wait();
    const proposalId = tx.events.find((e) => e.event == 'ProposalCreated').args.proposalId;

    /// @dev Check if the proposal was created propoerly
    const proposerAddress = tx.events.find((e) => e.event == 'ProposalCreated').args.proposer;
    const targetInfo = tx.events.find((e) => e.event == 'ProposalCreated').args.targets;
    const returnedCallData = tx.events.find((e) => e.event == 'ProposalCreated').args.calldatas;
    await expect(proposerAddress).to.equal(governanceCandidate.address);
    await expect(targetInfo).to.deep.equal([targetContractAddress]);
    await expect(returnedCallData).to.deep.equal([proposalCalldata]);

    /// @dev get to the start of the voting period
    const numBlocksToMine = Math.ceil((7 * 24 * 60 * 60) / 2);
    await hre.network.provider.send("hardhat_mine", [`0x${numBlocksToMine.toString(16)}`, "0x2"]);

    /// @dev Vote on the proposal
    await contractUDAOGovernor.connect(superValidator).castVote(proposalId, 1);
    await contractUDAOGovernor.connect(superValidatorCandidate).castVote(proposalId, 1);
    await contractUDAOGovernor.connect(validator1).castVote(proposalId, 1);
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
    const queueTx = await contractUDAOGovernor.connect(governanceCandidate).queue([targetContractAddress],
      [proposalValues],
      [proposalCalldata],
      ethers.utils.id(proposalDescription));
    const queueTxReceipt = await queueTx.wait();
    const queueTxEvent = queueTxReceipt.events.find((e) => e.event == 'ProposalQueued');
    await expect(queueTxEvent.args.proposalId).to.equal(proposalId);
    //await expect(queueTxEvent.args.eta).to.equal(0);
    /// @dev Check if the proposal was queued
    const proposalStateAfterQueue = await contractUDAOGovernor.state(proposalId);
    await expect(proposalStateAfterQueue).to.equal(5);
    /// @dev Execute the proposal
    const executeTx = await contractUDAOGovernor.connect(governanceCandidate).execute([targetContractAddress],
      [proposalValues],
      [proposalCalldata],
      ethers.utils.id(proposalDescription));
    const executeTxReceipt = await executeTx.wait();
    const executeTxEvent = executeTxReceipt.events.find((e) => e.event == 'ProposalExecuted');
    await expect(executeTxEvent.args.proposalId).to.equal(proposalId);

    /// @dev Check if the proposal was executed
    const proposalStateAfterExecution = await contractUDAOGovernor.state(proposalId);
    await expect(proposalStateAfterExecution).to.equal(7);

    /// @dev Get the current percent cut of the governance treasury 
    const currentGovernanceTreasuryCut = await contractPlatformTreasury.contentGovernanceCut();

    /// Get the current governance treasury balance
    const currentGovernanceTreasuryBalance = await contractUDAO.balanceOf(governanceTreasuryAddress);
    /// Get the content price of token Id 0 from UDAOC (first 0 is token ID, second 0 is full price of content)
    const contentPrice = await contractUDAOContent.contentPrice(0, 0);
    /// Multiply the content price with the current governance treasury cut and divide by 100000 to get the expected governance treasury balance
    const expectedGovernanceTreasuryBalanceBeforePercentage = contentPrice.mul(currentGovernanceTreasuryCut);
    const expectedGovernanceTreasuryBalance = expectedGovernanceTreasuryBalanceBeforePercentage.div(100000);

    /// Check if the governance treasury balance is equal to the expected governance treasury balance
    await expect(currentGovernanceTreasuryBalance).to.equal(expectedGovernanceTreasuryBalance);
  });
  it("Should allow governance to withdraw funds from the treasury after multiple content purchases", async function () {
    const {
      backend,
    contentCreator,
    contentBuyer1,
    contentBuyer2,
    contentBuyer3,
    validatorCandidate,
    validator1,
    validator2,
    validator3,
    validator4,
    validator5,
    superValidatorCandidate,
    superValidator,
    foundation,
    governanceCandidate,
    governanceMember,
    jurorCandidate,
    jurorMember1,
    jurorMember2,
    jurorMember3,
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
    contractJurorManager,
    contractContractManager
    } = await deploy();
    /// @dev Setup governance member
    await setupGovernanceMember(contractRoleManager, contractUDAO, contractUDAOStaker, governanceCandidate);
    await setupGovernanceMember(contractRoleManager, contractUDAO, contractUDAOStaker, superValidator);
    await setupGovernanceMember(contractRoleManager, contractUDAO, contractUDAOStaker, superValidatorCandidate);
    await setupGovernanceMember(contractRoleManager, contractUDAO, contractUDAOStaker, validatorCandidate);
    await setupGovernanceMember(contractRoleManager, contractUDAO, contractUDAOStaker, validator1);

    /// @dev Check account UDAO-vp balance and delegate to themselves
    await checkAccountUDAOVpBalanceAndDelegate(contractUDAOVp, governanceCandidate);
    await checkAccountUDAOVpBalanceAndDelegate(contractUDAOVp, superValidator);
    await checkAccountUDAOVpBalanceAndDelegate(contractUDAOVp, validator1);
    await checkAccountUDAOVpBalanceAndDelegate(contractUDAOVp, validatorCandidate);
 // Create content
 await createContent(contractRoleManager, contractUDAOContent, contentCreator, contractValidationManager, backend, validator1, validator2, validator3, validator4, validator5, contentCreator);
    // Make a content purchase to gather funds for governance
    await makeContentPurchase(contractPlatformTreasury, contentBuyer1, contractRoleManager, contractUDAO);
    await makeContentPurchase(contractPlatformTreasury, contentBuyer2, contractRoleManager, contractUDAO);
    await makeContentPurchase(contractPlatformTreasury, contentBuyer3, contractRoleManager, contractUDAO);

    // new dummy governance treasury address
    const newGovernanceTreasur = await ethers.Wallet.createRandom();

    // set new governance treasury address
    await contractPlatformTreasury.connect(backend).setGovernanceTreasuryAddress(newGovernanceTreasur.address);
    const governanceTreasuryAddress = await contractPlatformTreasury.governanceTreasury();
    expect(governanceTreasuryAddress).to.equal(newGovernanceTreasur.address);

    /// @dev Check if the governance candidate has the correct amount of UDAO-vp tokens
    const governanceCandidateBalance = await contractUDAOVp.balanceOf(governanceCandidate.address);
    await expect(governanceCandidateBalance).to.equal(ethers.utils.parseEther("300"));

    /// @dev delegate governance candidate's UDAO-vp tokens to himself
    await contractUDAOVp.connect(governanceCandidate).delegate(governanceCandidate.address);

    /// @dev Check votes for governance candidate on latest block
    const governanceCandidateVotes = await contractUDAOVp.getVotes(governanceCandidate.address);
    await expect(governanceCandidateVotes).to.equal(ethers.utils.parseEther("300"));

    // Create proposal settings to withdraw funds from the treasury
    const targetContractAddress = contractPlatformTreasury.address;
    const targetContract = await ethers.getContractAt("PlatformTreasury", contractPlatformTreasury.address);
    const proposalValues = 0;
    const proposalCalldata = targetContract.interface.encodeFunctionData("withdrawGovernance");
    const proposalDescription = "Withdraw funds from the treasury";

    // propose
    const proposeTx = await contractUDAOGovernor.connect(governanceCandidate).propose([targetContractAddress], [proposalValues], [proposalCalldata], proposalDescription);

    /// @dev Wait for the transaction to be mined
    const tx = await proposeTx.wait();
    const proposalId = tx.events.find((e) => e.event == 'ProposalCreated').args.proposalId;

    /// @dev Check if the proposal was created propoerly
    const proposerAddress = tx.events.find((e) => e.event == 'ProposalCreated').args.proposer;
    const targetInfo = tx.events.find((e) => e.event == 'ProposalCreated').args.targets;
    const returnedCallData = tx.events.find((e) => e.event == 'ProposalCreated').args.calldatas;
    await expect(proposerAddress).to.equal(governanceCandidate.address);
    await expect(targetInfo).to.deep.equal([targetContractAddress]);
    await expect(returnedCallData).to.deep.equal([proposalCalldata]);

    /// @dev get to the start of the voting period
    const numBlocksToMine = Math.ceil((7 * 24 * 60 * 60) / 2);
    await hre.network.provider.send("hardhat_mine", [`0x${numBlocksToMine.toString(16)}`, "0x2"]);

    /// @dev Vote on the proposal
    await contractUDAOGovernor.connect(superValidator).castVote(proposalId, 1);
    await contractUDAOGovernor.connect(superValidatorCandidate).castVote(proposalId, 1);
    await contractUDAOGovernor.connect(validator1).castVote(proposalId, 1);
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
    const queueTx = await contractUDAOGovernor.connect(governanceCandidate).queue([targetContractAddress],
      [proposalValues],
      [proposalCalldata],
      ethers.utils.id(proposalDescription));
    const queueTxReceipt = await queueTx.wait();
    const queueTxEvent = queueTxReceipt.events.find((e) => e.event == 'ProposalQueued');
    await expect(queueTxEvent.args.proposalId).to.equal(proposalId);
    //await expect(queueTxEvent.args.eta).to.equal(0);
    /// @dev Check if the proposal was queued
    const proposalStateAfterQueue = await contractUDAOGovernor.state(proposalId);
    await expect(proposalStateAfterQueue).to.equal(5);
    /// @dev Execute the proposal
    const executeTx = await contractUDAOGovernor.connect(governanceCandidate).execute([targetContractAddress],
      [proposalValues],
      [proposalCalldata],
      ethers.utils.id(proposalDescription));
    const executeTxReceipt = await executeTx.wait();
    const executeTxEvent = executeTxReceipt.events.find((e) => e.event == 'ProposalExecuted');
    await expect(executeTxEvent.args.proposalId).to.equal(proposalId);

    /// @dev Check if the proposal was executed
    const proposalStateAfterExecution = await contractUDAOGovernor.state(proposalId);
    await expect(proposalStateAfterExecution).to.equal(7);

    /// @dev Get the current percent cut of the governance treasury 
    const currentGovernanceTreasuryCut = await contractPlatformTreasury.contentGovernanceCut();

    /// Get the current governance treasury balance
    const currentGovernanceTreasuryBalance = await contractUDAO.balanceOf(governanceTreasuryAddress);
    /// Get the content price of token Id 0 from UDAOC (first 0 is token ID, second 0 is full price of content)
    const contentPrice = await contractUDAOContent.contentPrice(0, 0);
    /// Multiply contentPrice with 3 since we have 3 content buyers 
    const contentPriceWithThreeBuyers = contentPrice.mul(3);
    /// Multiply the content price with the current governance treasury cut and divide by 100000 to get the expected governance treasury balance
    const expectedGovernanceTreasuryBalanceBeforePercentage = contentPriceWithThreeBuyers.mul(currentGovernanceTreasuryCut);
    const expectedGovernanceTreasuryBalance = expectedGovernanceTreasuryBalanceBeforePercentage.div(100000);

    /// Check if the governance treasury balance is equal to the expected governance treasury balance
    await expect(currentGovernanceTreasuryBalance).to.equal(expectedGovernanceTreasuryBalance);
  });
  it("Should allow foundation to withdraw funds from the treasury after a content purchase", async function () {
    const {
      backend,
    contentCreator,
    contentBuyer1,
    contentBuyer2,
    contentBuyer3,
    validatorCandidate,
    validator1,
    validator2,
    validator3,
    validator4,
    validator5,
    superValidatorCandidate,
    superValidator,
    foundation,
    governanceCandidate,
    governanceMember,
    jurorCandidate,
    jurorMember1,
    jurorMember2,
    jurorMember3,
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
    contractJurorManager,
    contractContractManager
    } = await deploy();
 // Create content
 await createContent(contractRoleManager, contractUDAOContent, contentCreator, contractValidationManager, backend, validator1, validator2, validator3, validator4, validator5, contentCreator);
    // Make a content purchase to gather funds for governance
    await makeContentPurchase(contractPlatformTreasury, contentBuyer1, contractRoleManager, contractUDAO);

    // new dummy governance treasury address
    const newGovernanceTreasur = await ethers.Wallet.createRandom();

    // set new governance treasury address
    await contractPlatformTreasury.connect(backend).setGovernanceTreasuryAddress(newGovernanceTreasur.address);
    const governanceTreasuryAddress = await contractPlatformTreasury.governanceTreasury();
    expect(governanceTreasuryAddress).to.equal(newGovernanceTreasur.address);
    // set foundation wallet address
    await contractPlatformTreasury.connect(backend).setFoundationWalletAddress(foundation.address);
    const foundationWalletAddress = await contractPlatformTreasury.foundationWallet();
    expect(foundationWalletAddress).to.equal(foundation.address);

    /// @dev Withdraw foundation funds from the treasury
    await contractPlatformTreasury.connect(foundation).withdrawFoundation();

    /// @dev Get the current percent cut of the foundation 
    const currentFoundationCut = await contractPlatformTreasury.contentFoundationCut();

    /// Get the current foundation balance
    const currentFoundationBalance = await contractUDAO.balanceOf(foundation.address);
    /// Get the content price of token Id 0 from UDAOC (first 0 is token ID, second 0 is full price of content)
    const contentPrice = await contractUDAOContent.contentPrice(0, 0);
    /// Multiply the content price with the current foundation cut and divide by 100000 to get the expected foundation balance
    const expectedFoundationBalanceBeforePercentage = contentPrice.mul(currentFoundationCut);
    const expectedFoundationBalance = expectedFoundationBalanceBeforePercentage.div(100000);

    /// Check if the governance treasury balance is equal to the expected governance treasury balance
    await expect(currentFoundationBalance).to.equal(expectedFoundationBalance);
  });

  it("Should allow foundation to withdraw funds from the treasury after multiple content purchases", async function () {
    const {
      backend,
    contentCreator,
    contentBuyer1,
    contentBuyer2,
    contentBuyer3,
    validatorCandidate,
    validator1,
    validator2,
    validator3,
    validator4,
    validator5,
    superValidatorCandidate,
    superValidator,
    foundation,
    governanceCandidate,
    governanceMember,
    jurorCandidate,
    jurorMember1,
    jurorMember2,
    jurorMember3,
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
    contractJurorManager,
    contractContractManager
    } = await deploy();
    // Create content
    await createContent(contractRoleManager, contractUDAOContent, contentCreator, contractValidationManager, backend, validator1, validator2, validator3, validator4, validator5, contentCreator);
    // Make a content purchase to gather funds for governance
    await makeContentPurchase(contractPlatformTreasury, contentBuyer1, contractRoleManager, contractUDAO);
    await makeContentPurchase(contractPlatformTreasury, contentBuyer2, contractRoleManager, contractUDAO);
    await makeContentPurchase(contractPlatformTreasury, contentBuyer3, contractRoleManager, contractUDAO);


    // new dummy governance treasury address
    const newGovernanceTreasur = await ethers.Wallet.createRandom();

    // set new governance treasury address
    await contractPlatformTreasury.connect(backend).setGovernanceTreasuryAddress(newGovernanceTreasur.address);
    const governanceTreasuryAddress = await contractPlatformTreasury.governanceTreasury();
    expect(governanceTreasuryAddress).to.equal(newGovernanceTreasur.address);
    // set foundation wallet address
    await contractPlatformTreasury.connect(backend).setFoundationWalletAddress(foundation.address);
    const foundationWalletAddress = await contractPlatformTreasury.foundationWallet();
    expect(foundationWalletAddress).to.equal(foundation.address);

    /// @dev Withdraw foundation funds from the treasury
    await contractPlatformTreasury.connect(foundation).withdrawFoundation();

    /// @dev Get the current percent cut of the foundation 
    const currentFoundationCut = await contractPlatformTreasury.contentFoundationCut();

    /// Get the current foundation balance
    const currentFoundationBalance = await contractUDAO.balanceOf(foundation.address);
    /// Get the content price of token Id 0 from UDAOC (first 0 is token ID, second 0 is full price of content)
    const contentPrice = await contractUDAOContent.contentPrice(0, 0);
    /// Multiply content price with 3 since 3 content purchases were made
    const contentPriceTimesThree = contentPrice.mul(3);
    /// Multiply the content price with the current foundation cut and divide by 100000 to get the expected foundation balance
    const expectedFoundationBalanceBeforePercentage = contentPriceTimesThree.mul(currentFoundationCut);
    const expectedFoundationBalance = expectedFoundationBalanceBeforePercentage.div(100000);

    /// Check if the governance treasury balance is equal to the expected governance treasury balance
    await expect(currentFoundationBalance).to.equal(expectedFoundationBalance);
  });

  it("Should allow validator to withdraw funds from the treasury after a content purchase", async function () {
    const {
      backend,
    contentCreator,
    contentBuyer1,
    contentBuyer2,
    contentBuyer3,
    validatorCandidate,
    validator1,
    validator2,
    validator3,
    validator4,
    validator5,
    superValidatorCandidate,
    superValidator,
    foundation,
    governanceCandidate,
    governanceMember,
    jurorCandidate,
    jurorMember1,
    jurorMember2,
    jurorMember3,
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
    contractJurorManager,
    contractContractManager
    } = await deploy();
 // Create content
 await createContent(contractRoleManager, contractUDAOContent, contentCreator, contractValidationManager, backend, validator1, validator2, validator3, validator4, validator5, contentCreator);
    // Make a content purchase to gather funds for governance
    await makeContentPurchase(contractPlatformTreasury, contentBuyer1, contractRoleManager, contractUDAO);

    // Check account balances of validators before withdrawal
    const validator1BalanceBefore = await contractUDAO.balanceOf(validator1.address);
    const validator2BalanceBefore = await contractUDAO.balanceOf(validator2.address);
    const validator3BalanceBefore = await contractUDAO.balanceOf(validator3.address);
    const validator4BalanceBefore = await contractUDAO.balanceOf(validator4.address);
    const validator5BalanceBefore = await contractUDAO.balanceOf(validator5.address);
    // expect balances to be equal to zero
    await expect(validator1BalanceBefore).to.equal(0);
    await expect(validator2BalanceBefore).to.equal(0);
    await expect(validator3BalanceBefore).to.equal(0);
    await expect(validator4BalanceBefore).to.equal(0);
    await expect(validator5BalanceBefore).to.equal(0);

    // Get the ID of the current distribution round
    const currentDistributionRound = await contractValidationManager.distributionRound();
    // Foundation should call distributeRewards to distribute rewards to validators
    await contractPlatformTreasury.connect(foundation).distributeRewards();

    // Call withdrawValidator from platformtreasury contract for each validator
    await contractPlatformTreasury.connect(validator1).withdrawValidator();
    await contractPlatformTreasury.connect(validator2).withdrawValidator();
    await contractPlatformTreasury.connect(validator3).withdrawValidator();
    await contractPlatformTreasury.connect(validator4).withdrawValidator();
    await contractPlatformTreasury.connect(validator5).withdrawValidator();

    // Check account balances of validators after withdrawal
    const validator1BalanceAfter = await contractUDAO.balanceOf(validator1.address);
    const validator2BalanceAfter = await contractUDAO.balanceOf(validator2.address);
    const validator3BalanceAfter = await contractUDAO.balanceOf(validator3.address);
    const validator4BalanceAfter = await contractUDAO.balanceOf(validator4.address);
    const validator5BalanceAfter = await contractUDAO.balanceOf(validator5.address);

    /// @dev Calculate how much each validator should receive
    // Get the current validator cut
    const currentValidatorCut = await contractPlatformTreasury.contentValidatorCut();
    // Get the content price of token Id 0 from UDAOC (first 0 is token ID, second 0 is full price of content)
    const contentPrice = await contractUDAOContent.contentPrice(0, 0);
    // Get the total validation score
    const totalValidationScore = await contractValidationManager.totalValidationScore();
    // Get the validator scores of validators
    const validator1Score = await contractValidationManager.getValidatorScore(validator1.address, currentDistributionRound);
    const validator2Score = await contractValidationManager.getValidatorScore(validator2.address, currentDistributionRound);
    const validator3Score = await contractValidationManager.getValidatorScore(validator3.address, currentDistributionRound);
    const validator4Score = await contractValidationManager.getValidatorScore(validator4.address, currentDistributionRound);
    const validator5Score = await contractValidationManager.getValidatorScore(validator5.address, currentDistributionRound);
    // Calculate the expected validators cut
    const expectedValidator1Cut = contentPrice.mul(currentValidatorCut).mul(validator1Score).div(totalValidationScore).div(100000);
    const expectedValidator2Cut = contentPrice.mul(currentValidatorCut).mul(validator2Score).div(totalValidationScore).div(100000);
    const expectedValidator3Cut = contentPrice.mul(currentValidatorCut).mul(validator3Score).div(totalValidationScore).div(100000);
    const expectedValidator4Cut = contentPrice.mul(currentValidatorCut).mul(validator4Score).div(totalValidationScore).div(100000);
    const expectedValidator5Cut = contentPrice.mul(currentValidatorCut).mul(validator5Score).div(totalValidationScore).div(100000);

    /// @dev Check if the validator balances are equal to the expected validator balances
    await expect(validator1BalanceAfter).to.equal(expectedValidator1Cut);
    await expect(validator2BalanceAfter).to.equal(expectedValidator2Cut);
    await expect(validator3BalanceAfter).to.equal(expectedValidator3Cut);
    await expect(validator4BalanceAfter).to.equal(expectedValidator4Cut);
    await expect(validator5BalanceAfter).to.equal(expectedValidator5Cut);

    
  });
  it("Should allow validator to withdraw funds from the treasury after multiple content purchases", async function () {
    const {
      backend,
    contentCreator,
    contentBuyer1,
    contentBuyer2,
    contentBuyer3,
    validatorCandidate,
    validator1,
    validator2,
    validator3,
    validator4,
    validator5,
    superValidatorCandidate,
    superValidator,
    foundation,
    governanceCandidate,
    governanceMember,
    jurorCandidate,
    jurorMember1,
    jurorMember2,
    jurorMember3,
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
    contractJurorManager,
    contractContractManager
    } = await deploy();
    // Create content
    await createContent(contractRoleManager, contractUDAOContent, contentCreator, contractValidationManager, backend, validator1, validator2, validator3, validator4, validator5, contentCreator);
    // Make a content purchase to gather funds for governance
    await makeContentPurchase(contractPlatformTreasury, contentBuyer1, contractRoleManager, contractUDAO);
    await makeContentPurchase(contractPlatformTreasury, contentBuyer2, contractRoleManager, contractUDAO);
    await makeContentPurchase(contractPlatformTreasury, contentBuyer3, contractRoleManager, contractUDAO);

    // Check account balances of validators before withdrawal
    const validator1BalanceBefore = await contractUDAO.balanceOf(validator1.address);
    const validator2BalanceBefore = await contractUDAO.balanceOf(validator2.address);
    const validator3BalanceBefore = await contractUDAO.balanceOf(validator3.address);
    const validator4BalanceBefore = await contractUDAO.balanceOf(validator4.address);
    const validator5BalanceBefore = await contractUDAO.balanceOf(validator5.address);
    // expect balances to be equal to zero
    await expect(validator1BalanceBefore).to.equal(0);
    await expect(validator2BalanceBefore).to.equal(0);
    await expect(validator3BalanceBefore).to.equal(0);
    await expect(validator4BalanceBefore).to.equal(0);
    await expect(validator5BalanceBefore).to.equal(0);

    // Get the ID of the current distribution round
    const currentDistributionRound = await contractValidationManager.distributionRound();
    // Foundation should call distributeRewards to distribute rewards to validators
    await contractPlatformTreasury.connect(foundation).distributeRewards();

    // Call withdrawValidator from platformtreasury contract for each validator
    await contractPlatformTreasury.connect(validator1).withdrawValidator();
    await contractPlatformTreasury.connect(validator2).withdrawValidator();
    await contractPlatformTreasury.connect(validator3).withdrawValidator();
    await contractPlatformTreasury.connect(validator4).withdrawValidator();
    await contractPlatformTreasury.connect(validator5).withdrawValidator();

    // Check account balances of validators after withdrawal
    const validator1BalanceAfter = await contractUDAO.balanceOf(validator1.address);
    const validator2BalanceAfter = await contractUDAO.balanceOf(validator2.address);
    const validator3BalanceAfter = await contractUDAO.balanceOf(validator3.address);
    const validator4BalanceAfter = await contractUDAO.balanceOf(validator4.address);
    const validator5BalanceAfter = await contractUDAO.balanceOf(validator5.address);

    /// @dev Calculate how much each validator should receive
    // Get the current validator cut
    const currentValidatorCut = await contractPlatformTreasury.contentValidatorCut();
    // Get the content price of token Id 0 from UDAOC (first 0 is token ID, second 0 is full price of content)
    const contentPrice = await contractUDAOContent.contentPrice(0, 0);
    // Multiply content price with 3 since there are 3 content purchases
    const totalContentPrice = contentPrice.mul(3);
    // Get the total validation score
    const totalValidationScore = await contractValidationManager.totalValidationScore();
    // Get the validator scores of validators
    const validator1Score = await contractValidationManager.getValidatorScore(validator1.address, currentDistributionRound);
    const validator2Score = await contractValidationManager.getValidatorScore(validator2.address, currentDistributionRound);
    const validator3Score = await contractValidationManager.getValidatorScore(validator3.address, currentDistributionRound);
    const validator4Score = await contractValidationManager.getValidatorScore(validator4.address, currentDistributionRound);
    const validator5Score = await contractValidationManager.getValidatorScore(validator5.address, currentDistributionRound);
    // Calculate the expected validators cut
    const expectedValidator1Cut = totalContentPrice.mul(currentValidatorCut).mul(validator1Score).div(totalValidationScore).div(100000);
    const expectedValidator2Cut = totalContentPrice.mul(currentValidatorCut).mul(validator2Score).div(totalValidationScore).div(100000);
    const expectedValidator3Cut = totalContentPrice.mul(currentValidatorCut).mul(validator3Score).div(totalValidationScore).div(100000);
    const expectedValidator4Cut = totalContentPrice.mul(currentValidatorCut).mul(validator4Score).div(totalValidationScore).div(100000);
    const expectedValidator5Cut = totalContentPrice.mul(currentValidatorCut).mul(validator5Score).div(totalValidationScore).div(100000);

    /// @dev Check if the validator balances are equal to the expected validator balances
    await expect(validator1BalanceAfter).to.equal(expectedValidator1Cut);
    await expect(validator2BalanceAfter).to.equal(expectedValidator2Cut);
    await expect(validator3BalanceAfter).to.equal(expectedValidator3Cut);
    await expect(validator4BalanceAfter).to.equal(expectedValidator4Cut);
    await expect(validator5BalanceAfter).to.equal(expectedValidator5Cut);

    
  });

  it("Should allow jurors to withdraw funds from the treasury after a dispute is resolved", async function () {
    const {
      backend,
    contentCreator,
    contentBuyer1,
    contentBuyer2,
    contentBuyer3,
    validatorCandidate,
    validator1,
    validator2,
    validator3,
    validator4,
    validator5,
    superValidatorCandidate,
    superValidator,
    foundation,
    governanceCandidate,
    governanceMember,
    jurorCandidate,
    jurorMember1,
    jurorMember2,
    jurorMember3,
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
    contractJurorManager,
    contractContractManager
    } = await deploy();

    /// @dev Dispute settings
    const caseScope = 1;
    const caseQuestion = "Should we remove this content?";
    const caseTokenRelated = true;
    const caseTokenId = 0;
     // Create content
     await createContent(contractRoleManager, contractUDAOContent, contentCreator, contractValidationManager, backend, validator1, validator2, validator3, validator4, validator5, contentCreator);
    // Make a content purchase to gather funds for governance
    await makeContentPurchase(contractPlatformTreasury, contentBuyer1, contractRoleManager, contractUDAO);

    /// @dev Create dispute
    await contractJurorManager.connect(backend).createDispute(caseScope, caseQuestion, caseTokenRelated, caseTokenId);
    /// @dev Assign dispute to juror
    const disputeId = 1;
    await contractJurorManager.connect(jurorMember1).assignDispute(disputeId);
    await contractJurorManager.connect(jurorMember2).assignDispute(disputeId);
    await contractJurorManager.connect(jurorMember3).assignDispute(disputeId);
    /// @dev Send dispute result
    const disputeResultOfJurorMember1 = 1;
    const disputeResultOfJurorMember2 = 0;
    const disputeResultOfJurorMember3 = 0;
    await contractJurorManager.connect(jurorMember1).sendDisputeResult(disputeId, disputeResultOfJurorMember1);
    await contractJurorManager.connect(jurorMember2).sendDisputeResult(disputeId, disputeResultOfJurorMember2);
    await contractJurorManager.connect(jurorMember3).sendDisputeResult(disputeId, disputeResultOfJurorMember3);
    /// @dev Finalize dispute
    const disputeVerdict = false;
    await expect(contractJurorManager.connect(backend).finalizeDispute(disputeId)).to.emit(contractJurorManager, "DisputeEnded").withArgs(disputeId, disputeVerdict);

    // Get the ID of the current distribution round
    const currentDistributionRound = await contractValidationManager.distributionRound();

    /// @dev Check scores of jurors in this round
    const scoreOfJuror1 = await contractJurorManager.getJurorScore(jurorMember1.address, currentDistributionRound);
    const scoreOfJuror2 = await contractJurorManager.getJurorScore(jurorMember2.address, currentDistributionRound);
    const scoreOfJuror3 = await contractJurorManager.getJurorScore(jurorMember3.address, currentDistributionRound);
    expect(scoreOfJuror1).to.equal(0);
    expect(scoreOfJuror2).to.equal(1);
    expect(scoreOfJuror3).to.equal(1);

    /// @dev Check account balances of jurors before withdrawal
    const jurorMember1BalanceBefore = await contractUDAO.balanceOf(jurorMember1.address);
    const jurorMember2BalanceBefore = await contractUDAO.balanceOf(jurorMember2.address);
    const jurorMember3BalanceBefore = await contractUDAO.balanceOf(jurorMember3.address);
    /// @dev Expect that the account balances of jurors are 0 before withdrawal
    await expect(jurorMember1BalanceBefore).to.equal(0);
    await expect(jurorMember2BalanceBefore).to.equal(0);
    await expect(jurorMember3BalanceBefore).to.equal(0);

    // Get the current juror balance for a round (calculated in content manager)
    const jurorBalanceForRound = await contractPlatformTreasury.jurorBalanceForRound();
    // Foundation should call distributeRewards to distribute rewards to jurors
    await contractPlatformTreasury.connect(foundation).distributeRewards();
 

    // Call withdrawJuror from platformtreasury contract for each juror
    await contractPlatformTreasury.connect(jurorMember1).withdrawJuror();
    await contractPlatformTreasury.connect(jurorMember2).withdrawJuror();
    await contractPlatformTreasury.connect(jurorMember3).withdrawJuror();

    /// @dev Check account balances of jurors after withdrawal
    const jurorMember1BalanceAfter = await contractUDAO.balanceOf(jurorMember1.address);
    const jurorMember2BalanceAfter = await contractUDAO.balanceOf(jurorMember2.address);
    const jurorMember3BalanceAfter = await contractUDAO.balanceOf(jurorMember3.address);
    /// @dev Calculate how much each juror should receive
    // Get the juror cut
    const jurorCut = await contractPlatformTreasury.contentJurorCut();
    // Get the content price of token Id 0 from UDAOC (first 0 is token ID, second 0 is full price of content)
    const contentPrice = await contractUDAOContent.contentPrice(0, 0);
    // Get the total juror score
    const totalJurorScore = scoreOfJuror1.add(scoreOfJuror2).add(scoreOfJuror3);
    // Check if this matches with getTotalJurorScore result
    const getCumulativeJurorScore = await contractJurorManager.getTotalJurorScore();
    expect(getCumulativeJurorScore).to.equal(totalJurorScore);
    // Expect calculated juror balance for round to be equal to content price * juror cut / 100000
    expect(jurorBalanceForRound).to.equal(contentPrice.mul(jurorCut).div(100000));
    // Calculate payPerJuror
    const calculatedPayPerJuror = jurorBalanceForRound.div(totalJurorScore);
    // Get payPerJuror from contract
    const payPerJuror = await contractPlatformTreasury.payPerJuror(currentDistributionRound);
    // Check if calculated payPerJuror matches with payPerJuror from contract
    expect(calculatedPayPerJuror).to.equal(payPerJuror);
    // Calculate the expected juror balances
    const expectedJurorMember1Balance = payPerJuror.mul(scoreOfJuror1);
    const expectedJurorMember2Balance = payPerJuror.mul(scoreOfJuror2);
    const expectedJurorMember3Balance = payPerJuror.mul(scoreOfJuror3);
    // Expect that the account balances of jurors are equal to the expected balances
    await expect(jurorMember1BalanceAfter).to.equal(expectedJurorMember1Balance);
    await expect(jurorMember2BalanceAfter).to.equal(expectedJurorMember2Balance);
    await expect(jurorMember3BalanceAfter).to.equal(expectedJurorMember3Balance);
  });

  /// TODO
  it("Should distribute rewards to jurors when there are multiple disputes", async function () {});
  it("Should allow instructers to withdraw their rewards", async function () {
    const {
      backend,
    contentCreator,
    contentBuyer1,
    contentBuyer2,
    contentBuyer3,
    validatorCandidate,
    validator1,
    validator2,
    validator3,
    validator4,
    validator5,
    superValidatorCandidate,
    superValidator,
    foundation,
    governanceCandidate,
    governanceMember,
    jurorCandidate,
    jurorMember1,
    jurorMember2,
    jurorMember3,
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
    contractJurorManager,
    contractContractManager
    } = await deploy();
    // Create content
    await createContent(contractRoleManager, contractUDAOContent, contentCreator, contractValidationManager, backend, validator1, validator2, validator3, validator4, validator5, contentCreator);
    // Make a content purchase 
    await makeContentPurchase(contractPlatformTreasury, contentBuyer1, contractRoleManager, contractUDAO);
    
    // Get the instructer balance before withdrawal
    const instructerBalanceBefore = await contractUDAO.balanceOf(contentCreator.address);
    // Expect that the instructer balance is 0 before withdrawal
    await expect(instructerBalanceBefore).to.equal(0);
    // Instructer should call withdrawInstructor from platformtreasury contract
    await contractPlatformTreasury.connect(contentCreator).withdrawInstructor();
    // Get the instructer balance after withdrawal
    const instructerBalanceAfter = await contractUDAO.balanceOf(contentCreator.address);
    // Expect that the instructer balance is not 0 after withdrawal
    await expect(instructerBalanceAfter).to.not.equal(0);

    /// @dev Calculate how much the instructer should receive
    const contentPrice = await contractUDAOContent.contentPrice(0, 0);
    // Calculate the foundation cut    
    const currentFoundationCut = await contractPlatformTreasury.contentFoundationCut();
    const expectedFoundationBalanceBeforePercentage = contentPrice.mul(currentFoundationCut);
    const expectedFoundationBalance = expectedFoundationBalanceBeforePercentage.div(100000);
    // Calculate the governance cut
    const currentGovernanceTreasuryCut = await contractPlatformTreasury.contentGovernanceCut();
    const expectedGovernanceTreasuryBalanceBeforePercentage = contentPrice.mul(currentGovernanceTreasuryCut);
    const expectedGovernanceTreasuryBalance = expectedGovernanceTreasuryBalanceBeforePercentage.div(100000);
    // Calculate the validator cut
    const validatorBalanceForRound = await contractPlatformTreasury.validatorBalanceForRound();
    // Calculate the juror cut
    const jurorBalanceForRound = await contractPlatformTreasury.jurorBalanceForRound();
    // Expect instructerBalance to be equal to priceToPay minus the sum of all cuts
    await expect(instructerBalanceAfter).to.equal(contentPrice.sub(expectedFoundationBalance).sub(expectedGovernanceTreasuryBalance).sub(validatorBalanceForRound).sub(jurorBalanceForRound));
    
  });
});