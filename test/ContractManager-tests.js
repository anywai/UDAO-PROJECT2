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
  contractVoucherVerifier = replace.contractVoucherVerifier;
  contractGovernanceTreasury = replace.contractGovernanceTreasury;
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
    await contractContractManager.connect(backend).setAddressUDAOGovernorContract(dummyAddress);
    expect(await contractContractManager.udaoGovernorAddress()).to.equal(dummyAddress);
  });

  it("Should fail backend-else role to set any contract address", async function () {
    await reDeploy();
    // @dev Dummy contract address
    const testAddressUdao = "0x7D1AfA7B718fb893dB30A3aBc0Cfc608AaCfeBB0";
    const testAddressRoleManager = "0x7D1AfA7B718fb893dB30A3aBc0Cfc608AaCfeBB0";
    const testAddressUdaoc = "0x7D1AfA7B718fb893dB30A3aBc0Cfc608AaCfeBB0";
    const testAddressUdaoCert = "0x7D1AfA7B718fb893dB30A3aBc0Cfc608AaCfeBB0";
    const testAddressVoucherVerifier = "0x7D1AfA7B718fb893dB30A3aBc0Cfc608AaCfeBB0";
    const testAddressPlatformTreasury = "0x7D1AfA7B718fb893dB30A3aBc0Cfc608AaCfeBB0";
    // @dev Dummy contract address
    const testAddressGovernanceTreasury = "0x7D1AfA7B718fb893dB30A3aBc0Cfc608AaCfeBB0";
    const testAddressSupervision = "0x7D1AfA7B718fb893dB30A3aBc0Cfc608AaCfeBB0";
    // @dev Dummy contract address
    const testAddressUdaoVp = "0x7D1AfA7B718fb893dB30A3aBc0Cfc608AaCfeBB0";
    const testAddressUdaoStaker = "0x7D1AfA7B718fb893dB30A3aBc0Cfc608AaCfeBB0";
    const testAddressUdaoGovernor = "0x7D1AfA7B718fb893dB30A3aBc0Cfc608AaCfeBB0";
    //setAddressUDAOContract should be reverted
    await expect(
      contractContractManager.connect(contentBuyer1).setAddressUDAOContract(testAddressUdao)
    ).to.revertedWith("Only backend can set Udao address");
    //setAddressRoleManagerContract should be reverted
    await expect(
      contractContractManager.connect(contentBuyer1).setAddressRoleManagerContract(testAddressRoleManager)
    ).to.revertedWith("Only backend can set RoleManager address");
    //setAddressUDAOCContract should be reverted
    await expect(
      contractContractManager.connect(contentBuyer1).setAddressUDAOCContract(testAddressUdaoc)
    ).to.revertedWith("Only backend can set Udaoc address");
    //setAddressUDAOCertContract should be reverted
    await expect(
      contractContractManager.connect(contentBuyer1).setAddressUDAOCertContract(testAddressUdaoCert)
    ).to.revertedWith("Only backend can set UdaoCert address");
    //setAddressVoucherVerifierContract should be reverted
    await expect(
      contractContractManager.connect(contentBuyer1).setAddressVoucherVerifierContract(testAddressVoucherVerifier)
    ).to.revertedWith("Only backend can set VoucherVerifier address");
    //setAddressPlatformTreasuryContract should be reverted
    await expect(
      contractContractManager.connect(contentBuyer1).setAddressPlatformTreasuryContract(testAddressPlatformTreasury)
    ).to.revertedWith("Only backend can set PlatformTreasury address");
    //setAddressGovernanceTreasuryContract should be reverted
    await expect(
      contractContractManager.connect(contentBuyer1).setAddressGovernanceTreasuryContract(testAddressGovernanceTreasury)
    ).to.revertedWith("Only backend can set GovernanceTreasury address");
    //setAddressSupervisionContract should be reverted
    await expect(
      contractContractManager.connect(contentBuyer1).setAddressSupervisionContract(testAddressSupervision)
    ).to.revertedWith("Only backend can set Supervision address");
    //setAddressUDAOvpContract should be reverted
    await expect(
      contractContractManager.connect(contentBuyer1).setAddressUDAOvpContract(testAddressUdaoVp)
    ).to.revertedWith("Only backend can set UdaoVp address");
    //setAddressUDAOStakerContract should be reverted
    await expect(
      contractContractManager.connect(contentBuyer1).setAddressUDAOStakerContract(testAddressUdaoStaker)
    ).to.revertedWith("Only backend can set UdaoStaker address");
    //setAddressUDAOGovernorContract should be reverted
    await expect(
      contractContractManager.connect(contentBuyer1).setAddressUDAOGovernorContract(testAddressUdaoGovernor)
    ).to.revertedWith("Only backend can set UdaoGovernor address");
    // bulk set version 1 should be reverted
    await expect(
      contractContractManager
        .connect(contentBuyer1)
        .setAddresesVersion1Contracts(
          testAddressUdao,
          testAddressRoleManager,
          testAddressUdaoc,
          testAddressUdaoCert,
          testAddressVoucherVerifier,
          testAddressPlatformTreasury
        )
    ).to.revertedWith("Only backend can bulk set addresses");
    // bulk set common should be reverted
    await expect(
      contractContractManager
        .connect(contentBuyer1)
        .setAddresesCommonInVersion1and2(testAddressGovernanceTreasury, testAddressSupervision)
    ).to.revertedWith("Only backend can bulk set addresses");
    // bulk set version 2 should be reverted
    await expect(
      contractContractManager
        .connect(contentBuyer1)
        .setAddresesVersion2GovernanceContracts(testAddressUdaoVp, testAddressUdaoStaker, testAddressUdaoGovernor)
    ).to.revertedWith("Only backend can bulk set addresses");
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

  it("Should allow backend to bulk set address and sync after deployment of UDAO Version 1.0", async function () {
    await reDeploy();
    // @dev Dummy contract address
    const testAddressUdao = contractUDAO.address;
    const testAddressRoleManager = contractRoleManager.address;
    const testAddressUdaoc = contractUDAOContent.address;
    const testAddressUdaoCert = contractUDAOCertificate.address;
    const testAddressVoucherVerifier = contractVoucherVerifier.address;
    const testAddressPlatformTreasury = contractPlatformTreasury.address;

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

    await reDeploy();
    // @dev Dummy contract address
    const testAddressGovernanceTreasury = contractGovernanceTreasury.address;
    const testAddressSupervision = contractSupervision.address;
    await contractContractManager
      .connect(backend)
      .setAddresesCommonInVersion1and2(testAddressGovernanceTreasury, testAddressSupervision);
    expect(await contractContractManager.governanceTreasuryAddress()).to.equal(testAddressGovernanceTreasury);
    expect(await contractContractManager.supervisionAddress()).to.equal(testAddressSupervision);

    // should backend sync version 1 contracts addresses in udao ecosystem
    await contractContractManager.connect(backend).syncVersion1ContractAddresses();
  });

  it("Should fail backend-else role to use sync function after deployment of UDAO Version 1.0", async function () {
    await reDeploy();
    // @dev Dummy contract address
    const testAddressUdao = contractUDAO.address;
    const testAddressRoleManager = contractRoleManager.address;
    const testAddressUdaoc = contractUDAOContent.address;
    const testAddressUdaoCert = contractUDAOCertificate.address;
    const testAddressVoucherVerifier = contractVoucherVerifier.address;
    const testAddressPlatformTreasury = contractPlatformTreasury.address;

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

    await reDeploy();
    // @dev Dummy contract address
    const testAddressGovernanceTreasury = contractGovernanceTreasury.address;
    const testAddressSupervision = contractSupervision.address;
    await contractContractManager
      .connect(backend)
      .setAddresesCommonInVersion1and2(testAddressGovernanceTreasury, testAddressSupervision);
    expect(await contractContractManager.governanceTreasuryAddress()).to.equal(testAddressGovernanceTreasury);
    expect(await contractContractManager.supervisionAddress()).to.equal(testAddressSupervision);

    // should backend sync version 1 contracts addresses in udao ecosystem
    await expect(contractContractManager.connect(contentBuyer1).syncVersion1ContractAddresses()).to.revertedWith(
      "Only backend can bulk set addresses"
    );
  });

  it("Should allow backend-deployer to set foundation wallet address for contract manager contract", async function () {
    await reDeploy();
    await expect(contractContractManager.connect(backend).setFoundationAddress(contentBuyer1.address))
      .to.emit(contractContractManager, "FoundationWalletUpdated")
      .withArgs(contentBuyer1.address);
  });

  it("Should fail backend-deployer to set foundation wallet address if foundation wallet address already changed", async function () {
    await reDeploy();
    await contractContractManager.connect(backend).setFoundationAddress(contentBuyer1.address);

    await expect(contractContractManager.connect(backend).setFoundationAddress(contentBuyer1.address)).to.revertedWith(
      "Only foundation can set foundation wallet address"
    );
  });
});
