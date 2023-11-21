const { expect } = require("chai");
const hardhat = require("hardhat");
const { ethers } = hardhat;
const chai = require("chai");
const BN = require("bn.js");
const helpers = require("@nomicfoundation/hardhat-network-helpers");
const { deploy } = require("../lib/deployments");
const { ADDRESS_ZERO } = require("@uniswap/v3-sdk");

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

describe("Role Manager", function () {
  it("Should deploy", async function () {
    await reDeploy();
  });

  it("Should allow foundation to grant a role", async function () {
    // grant backend role to contentbuyer1
    await contractRoleManager.connect(foundation).grantRole(BACKEND_ROLE, contentBuyer1.address);
    // check if contentbuyer1 has backend role
    expect(await contractRoleManager.hasRole(BACKEND_ROLE, contentBuyer1.address)).to.equal(true);
  });

  it("Should allow to foundation to revoke a role", async function () {
    // grant backend role to contentbuyer1
    await contractRoleManager.connect(foundation).grantRole(BACKEND_ROLE, contentBuyer1.address);
    // check if contentbuyer1 has backend role
    expect(await contractRoleManager.hasRole(BACKEND_ROLE, contentBuyer1.address)).to.equal(true);
    // revoke backend role from contentbuyer1
    await contractRoleManager.connect(foundation).revokeRole(BACKEND_ROLE, contentBuyer1.address);
    // check if contentbuyer1 has backend role
    expect(await contractRoleManager.hasRole(BACKEND_ROLE, contentBuyer1.address)).to.equal(false);
  });

  it("Should allow foundation to hand over the ownership of rolemanager contract", async function () {
    await reDeploy();
    // foundation wallet can grant DEFAULT_ADMIN_ROLE to contentbuyer1
    await contractRoleManager.connect(foundation).grantRole(ethers.constants.HashZero, contentBuyer1.address);
    // and now new DEFAULT_ADMIN_ROLE is contentbuyer1 and it can revoke DEFAULT_ADMIN_ROLE from foundation
    await contractRoleManager.connect(contentBuyer1).revokeRole(ethers.constants.HashZero, foundation.address);
    // foundation can not grant role to anyone after it has been revoked from DEFAULT_ADMIN_ROLE
    await expect(
      contractRoleManager.connect(foundation).grantRole(BACKEND_ROLE, contentBuyer1.address)
    ).to.be.revertedWith(
      "AccessControl: account " + foundation.address.toLowerCase() + " is missing role " + ADDRESS_ZERO
    );
    // contentBuyer1 has the role DEFAULT_ADMIN_ROLE
    expect(await contractRoleManager.hasRole(ethers.constants.HashZero, contentBuyer1.address)).to.equal(true);
  });
});
