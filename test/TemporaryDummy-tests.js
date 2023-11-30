const { expect } = require("chai");
const hardhat = require("hardhat");
const { ethers } = hardhat;
const chai = require("chai");
const BN = require("bn.js");
const helpers = require("@nomicfoundation/hardhat-network-helpers");
const { deploy } = require("../lib/deployments");

// Enable and inject BN dependency
chai.use(require("chai-bn")(BN));

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

describe("Temporary Dummy", function () {
  it("Should DummySupervision getIsValidated function return always 1", async function () {
    await reDeploy();
    for (let i = 0; i < 3; i++) {
      expect(await contractSupervision.getIsValidated(i)).to.be.equal(1);
    }
  });

  it("Should DummyGovernanceTreasury emergencyWithdraw function can call only by deployer", async function () {
    await reDeploy();
    await expect(contractGovernanceTreasury.connect(contentBuyer1).emergencyWithdraw()).to.be.revertedWith(
      "you are not owner of dummy contract"
    );
  });

  it("Should DummyGovernanceTreasury emergencyWithdraw function can transfer all udao tokens to caller", async function () {
    await reDeploy();
    // send udao tokens to governance treasury and backend
    await contractUDAO.transfer(contractGovernanceTreasury.address, 100);
    await contractUDAO.transfer(backend.address, 100);
    // check balance of governance treasury and backend
    const balanceInGovernance = await contractUDAO.balanceOf(contractGovernanceTreasury.address);
    // check balance of backend
    const balanceInBackend = await contractUDAO.balanceOf(backend.address);
    // call emergency withdraw by backend
    await contractGovernanceTreasury.connect(backend).emergencyWithdraw();
    // check balance of governance treasury and backend
    expect(await contractUDAO.balanceOf(contractGovernanceTreasury.address)).to.be.equal(0);
    expect(await contractUDAO.balanceOf(backend.address)).to.be.equal(balanceInGovernance.add(balanceInBackend));
  });
});
