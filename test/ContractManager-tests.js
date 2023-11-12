const { expect } = require("chai");
const hardhat = require("hardhat");
const { ethers } = hardhat;
const chai = require("chai");
const BN = require("bn.js");
const helpers = require("@nomicfoundation/hardhat-network-helpers");
const { deploy } = require("../lib/deployments");

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
  contractPlatformTreasury = replace.contractPlatformTreasury;
  contractSupervision = replace.contractSupervision;
  GOVERNANCE_ROLE = replace.GOVERNANCE_ROLE;
  BACKEND_ROLE = replace.BACKEND_ROLE;
  contractContractManager = replace.contractContractManager;
  account1 = replace.account1;
  account2 = replace.account2;
  account3 = replace.account3;
  const reApplyValidatorRoles = [validator, validator1, validator2, validator3, validator4, validator5];
  const reApplyJurorRoles = [jurorMember, jurorMember1, jurorMember2, jurorMember3, jurorMember4];
  const VALIDATOR_ROLE = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("VALIDATOR_ROLE"));
  const JUROR_ROLE = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("JUROR_ROLE"));
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

async function setupGovernanceMember(contractRoleManager, contractUDAO, contractUDAOStaker, governanceCandidate) {
  await contractRoleManager.setKYC(governanceCandidate.address, true);
  await contractUDAO.transfer(governanceCandidate.address, ethers.utils.parseEther("100.0"));
  await contractUDAO
    .connect(governanceCandidate)
    .approve(contractUDAOStaker.address, ethers.utils.parseEther("999999999999.0"));
  await expect(contractUDAOStaker.connect(governanceCandidate).stakeForGovernance(ethers.utils.parseEther("10"), 30))
    .to.emit(contractUDAOStaker, "GovernanceStake") // transfer from null address to minter
    .withArgs(governanceCandidate.address, ethers.utils.parseEther("10"), ethers.utils.parseEther("300"));
}

describe("Contract Manager", function () {
  it("Should deploy", async function () {
    await reDeploy();
  });

  it("Should allow backend to set the UDAO token address", async function () {
    await reDeploy();
    // @dev Dummy contract address
    const dummyAddress = "0x7D1AfA7B718fb893dB30A3aBc0Cfc608AaCfeBB0";
    await contractContractManager.connect(backend).setAddressUDAOContract(dummyAddress);
    expect(await contractContractManager.udaoAddress()).to.equal(dummyAddress);
  });

  it("Should allow backend to set the Role Manager contract address", async function () {
    await reDeploy();
    // @dev Dummy contract address
    const dummyAddress = "0x7D1AfA7B718fb893dB30A3aBc0Cfc608AaCfeBB0";
    await contractContractManager.connect(backend).setAddressRoleManagerContract(dummyAddress);
    expect(await contractContractManager.roleManagerAddress()).to.equal(dummyAddress);
  });

  it("Should allow backend to set the UDAOC token address", async function () {
    await reDeploy();
    // @dev Dummy contract address
    const dummyAddress = "0x7D1AfA7B718fb893dB30A3aBc0Cfc608AaCfeBB0";
    await contractContractManager.connect(backend).setAddressUDAOCContract(dummyAddress);
    expect(await contractContractManager.udaocAddress()).to.equal(dummyAddress);
  });

  it("Should allow backend to set the UDAO-Cert token address", async function () {
    await reDeploy();
    // @dev Dummy contract address
    const dummyAddress = "0x7D1AfA7B718fb893dB30A3aBc0Cfc608AaCfeBB0";
    await contractContractManager.connect(backend).setAddressUDAOCertContract(dummyAddress);
    expect(await contractContractManager.udaoCertAddress()).to.equal(dummyAddress);
  });

  it("Should allow backend to set the Voucher Verifier contract address", async function () {
    await reDeploy();
    // @dev Dummy contract address
    const dummyAddress = "0x7D1AfA7B718fb893dB30A3aBc0Cfc608AaCfeBB0";
    await contractContractManager.connect(backend).setAddressVoucherVerifierContract(dummyAddress);
    expect(await contractContractManager.voucherVerifierAddress()).to.equal(dummyAddress);
  });

  it("Should allow backend to set the Platform Treasury contract address", async function () {
    await reDeploy();
    // @dev Dummy contract address
    const dummyAddress = "0x7D1AfA7B718fb893dB30A3aBc0Cfc608AaCfeBB0";
    await contractContractManager.connect(backend).setAddressPlatformTreasuryContract(dummyAddress);
    expect(await contractContractManager.platformTreasuryAddress()).to.equal(dummyAddress);
  });

  it("Should allow backend to set the Governance Treasury contract address", async function () {
    await reDeploy();
    // @dev Dummy contract address
    const dummyAddress = "0x7D1AfA7B718fb893dB30A3aBc0Cfc608AaCfeBB0";
    await contractContractManager.connect(backend).setAddressGovernanceTreasuryContract(dummyAddress);
    expect(await contractContractManager.governanceTreasuryAddress()).to.equal(dummyAddress);
  });

  it("Should allow backend to set the Supervision address", async function () {
    await reDeploy();
    // @dev Dummy contract address
    const dummyAddress = "0x7D1AfA7B718fb893dB30A3aBc0Cfc608AaCfeBB0";
    await contractContractManager.connect(backend).setAddressSupervisionContract(dummyAddress);
    expect(await contractContractManager.supervisionAddress()).to.equal(dummyAddress);
  });

  it("Should allow backend to set the UDAO-VP token address", async function () {
    await reDeploy();
    // @dev Dummy contract address
    const dummyAddress = "0x7D1AfA7B718fb893dB30A3aBc0Cfc608AaCfeBB0";
    await contractContractManager.connect(backend).setAddressUDAOvpContract(dummyAddress);
    expect(await contractContractManager.udaoVpAddress()).to.equal(dummyAddress);
  });

  it("Should allow backend to set the Udao Staker contract address", async function () {
    await reDeploy();
    // @dev Dummy contract address
    const dummyAddress = "0x7D1AfA7B718fb893dB30A3aBc0Cfc608AaCfeBB0";
    await contractContractManager.connect(backend).setAddressUDAOStakerContract(dummyAddress);
    expect(await contractContractManager.udaoStakerAddress()).to.equal(dummyAddress);
  });

  it("Should allow backend to set the Udao Governor contract address", async function () {
    await reDeploy();
    // @dev Dummy contract address
    const dummyAddress = "0x7D1AfA7B718fb893dB30A3aBc0Cfc608AaCfeBB0";
    await contractContractManager.connect(backend).setAddressUDAOStakerContract(dummyAddress);
    expect(await contractContractManager.udaoStakerAddress()).to.equal(dummyAddress);
  });

  it("Should allow backend to bulk set address of UDAO Version 1.0 contracts", async function () {
    await reDeploy();
    // @dev Dummy contract address
    const testAddressUdao = "0x7D1AfA7B718fb893dB30A3aBc0Cfc608AaCfeBB0";
    const testAddressRoleManager = "0x7D1AfA7B718fb893dB30A3aBc0Cfc608AaCfeBB0";
    const testAddressUdaoc = "0x7D1AfA7B718fb893dB30A3aBc0Cfc608AaCfeBB0";
    const testAddressUdaoCert = "0x7D1AfA7B718fb893dB30A3aBc0Cfc608AaCfeBB0";
    const testAddressVoucherVerifier = "0x7D1AfA7B718fb893dB30A3aBc0Cfc608AaCfeBB0";
    const testAddressPlatformTreasury = "0x7D1AfA7B718fb893dB30A3aBc0Cfc608AaCfeBB0";

    await contractContractManager
      .connect(backend)
      .setAddresesVersion1Contracts(
        testAddressUdao,
        testAddressRoleManager,
        testAddressUdaoc,
        testAddressUdaoCert,
        testAddressVoucherVerifier,
        testAddressPlatformTreasury
      );
    expect(await contractContractManager.udaoAddress()).to.equal(testAddressUdao);
    expect(await contractContractManager.roleManagerAddress()).to.equal(testAddressRoleManager);
    expect(await contractContractManager.udaocAddress()).to.equal(testAddressUdaoc);
    expect(await contractContractManager.udaoCertAddress()).to.equal(testAddressUdaoCert);
    expect(await contractContractManager.voucherVerifierAddress()).to.equal(testAddressVoucherVerifier);
    expect(await contractContractManager.platformTreasuryAddress()).to.equal(testAddressPlatformTreasury);
  });

  it("Should allow backend to set common(dummy) address of UDAO Version 1.0 and 2.0 contracts", async function () {
    await reDeploy();
    // @dev Dummy contract address
    const testAddressGovernanceTreasury = "0x7D1AfA7B718fb893dB30A3aBc0Cfc608AaCfeBB0";
    const testAddressSupervision = "0x7D1AfA7B718fb893dB30A3aBc0Cfc608AaCfeBB0";
    await contractContractManager
      .connect(backend)
      .setAddresesCommonInVersion1and2(testAddressGovernanceTreasury, testAddressSupervision);
    expect(await contractContractManager.governanceTreasuryAddress()).to.equal(testAddressGovernanceTreasury);
    expect(await contractContractManager.supervisionAddress()).to.equal(testAddressSupervision);
  });

  it("Should allow backend to bulk set address of UDAO Version 2.0 contracts", async function () {
    await reDeploy();
    // @dev Dummy contract address
    const testAddressUdaoVp = "0x7D1AfA7B718fb893dB30A3aBc0Cfc608AaCfeBB0";
    const testAddressUdaoStaker = "0x7D1AfA7B718fb893dB30A3aBc0Cfc608AaCfeBB0";
    const testAddressUdaoGovernor = "0x7D1AfA7B718fb893dB30A3aBc0Cfc608AaCfeBB0";

    await contractContractManager
      .connect(backend)
      .setAddresesVersion2GovernanceContracts(testAddressUdaoVp, testAddressUdaoStaker, testAddressUdaoGovernor);
    expect(await contractContractManager.udaoVpAddress()).to.equal(testAddressUdaoVp);
    expect(await contractContractManager.udaoStakerAddress()).to.equal(testAddressUdaoStaker);
    expect(await contractContractManager.udaoGovernorAddress()).to.equal(testAddressUdaoGovernor);
  });
});
