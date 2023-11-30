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
  STAKING_CONTRACT = replace.STAKING_CONTRACT;
  SUPERVISION_CONTRACT = replace.SUPERVISION_CONTRACT;
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

  it("Should allow foundation to grant backend role by using dedicated function", async function () {
    await reDeploy();
    // grant backend role to contentbuyer1
    await contractRoleManager.connect(foundation).grantBackend(contentBuyer1.address);
    // check if contentbuyer1 has backend role
    expect(await contractRoleManager.hasRole(BACKEND_ROLE, contentBuyer1.address)).to.equal(true);
  });

  it("Should allow to foundation to revoke backend role by using dedicated function", async function () {
    await reDeploy();
    // grant backend role to contentbuyer1
    await contractRoleManager.connect(foundation).grantBackend(contentBuyer1.address);
    // check if contentbuyer1 has backend role
    expect(await contractRoleManager.hasRole(BACKEND_ROLE, contentBuyer1.address)).to.equal(true);
    // revoke backend role from contentbuyer1
    await contractRoleManager.connect(foundation).revokeBackend(contentBuyer1.address);
    // check if contentbuyer1 has backend role
    expect(await contractRoleManager.hasRole(BACKEND_ROLE, contentBuyer1.address)).to.equal(false);
  });

  it("Should fail grant backend role if caller is not the foundation", async function () {
    await reDeploy();
    // try to grant backend role to contentbuyer1 by contentbuyer2
    await expect(contractRoleManager.connect(contentBuyer2).grantBackend(contentBuyer1.address)).to.revertedWith(
      "Only foundation can grant backend"
    );
    // check if contentbuyer1 has backend role
    expect(await contractRoleManager.hasRole(BACKEND_ROLE, contentBuyer1.address)).to.equal(false);
  });

  it("Should fail revoke backend role if caller is not the foundation", async function () {
    await reDeploy();
    // try to revoke backend role from backend by contentbuyer2
    await expect(contractRoleManager.connect(contentBuyer2).revokeBackend(backend.address)).to.revertedWith(
      "Only foundation can revoke backend"
    );
    // check if backen has still backend role
    expect(await contractRoleManager.hasRole(BACKEND_ROLE, backend.address)).to.equal(true);
  });

  it("Should allow STAKING_CONTRACT grant roles to users", async function () {
    await reDeploy();
    // grant STAKING_CONTRACT role to contentbuyer1 to pretend like a staking contract
    await contractRoleManager.connect(foundation).grantRole(STAKING_CONTRACT, contentBuyer1.address);
    expect(await contractRoleManager.hasRole(STAKING_CONTRACT, contentBuyer1.address)).to.equal(true);

    // grant GOVERNANCE_ROLE to contentbuyer2 by using grantRoleStaker function
    await contractRoleManager.connect(contentBuyer1).grantRoleStaker(GOVERNANCE_ROLE, contentBuyer2.address);
    // check if contentbuyer2 has GOVERNANCE_ROLE
    expect(await contractRoleManager.hasRole(GOVERNANCE_ROLE, contentBuyer2.address)).to.equal(true);
  });

  it("Should allow STAKING_CONTRACT revoke roles from users", async function () {
    await reDeploy();
    // grant STAKING_CONTRACT role to contentbuyer1 to pretend like a staking contract
    await contractRoleManager.connect(foundation).grantRole(STAKING_CONTRACT, contentBuyer1.address);
    expect(await contractRoleManager.hasRole(STAKING_CONTRACT, contentBuyer1.address)).to.equal(true);

    // grant GOVERNANCE_ROLE to contentbuyer2 by using grantRoleStaker function
    await contractRoleManager.connect(contentBuyer1).grantRoleStaker(GOVERNANCE_ROLE, contentBuyer2.address);
    // check if contentbuyer2 has GOVERNANCE_ROLE
    expect(await contractRoleManager.hasRole(GOVERNANCE_ROLE, contentBuyer2.address)).to.equal(true);

    // revoke GOVERNANCE_ROLE from contentbuyer2 by using revokeRoleStaker function
    await contractRoleManager.connect(contentBuyer1).revokeRoleStaker(GOVERNANCE_ROLE, contentBuyer2.address);
    // check if contentbuyer2 has GOVERNANCE_ROLE
    expect(await contractRoleManager.hasRole(GOVERNANCE_ROLE, contentBuyer2.address)).to.equal(false);
  });

  it("Should fail grant and revoke role if the caller is not STAKING_CONTRACT", async function () {
    await reDeploy();

    // try to grant GOVERNANCE_ROLE to backed by using grantRoleStaker function when caller contentbuyer1 is not STAKING_CONTRACT
    await expect(
      contractRoleManager.connect(contentBuyer1).grantRoleStaker(GOVERNANCE_ROLE, backend.address)
    ).to.revertedWith("Only staking contract can grant roles");

    // try to revoke BACKEND_ROLE from backend by using revokeRoleStaker function when caller contentbuyer1 is not STAKING_CONTRACT
    await expect(
      contractRoleManager.connect(contentBuyer1).revokeRoleStaker(BACKEND_ROLE, backend.address)
    ).to.revertedWith("Only staking contract can revoke roles");
  });

  it("Should allow backend to set update addresses", async function () {
    await reDeploy();
    const newSupervisionAddress = contractSupervision.address;

    await expect(contractRoleManager.connect(backend).updateAddresses(newSupervisionAddress))
      .to.emit(contractRoleManager, "AddressesUpdated")
      .withArgs(newSupervisionAddress);
  });

  it("Should fail backend-else role to update addresses", async function () {
    await reDeploy();
    const newSupervisionAddress = contractSupervision.address;

    await expect(contractRoleManager.connect(contentBuyer1).updateAddresses(newSupervisionAddress)).to.be.revertedWith(
      "Only backend can update addresses"
    );
  });

  it("Should has role function return verification for roles", async function () {
    await reDeploy();

    // convert string to bytes 32
    const kec256_backend = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("BACKEND_ROLE"));
    const kec256_staking = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("STAKING_CONTRACT"));
    const kec256_governance = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("GOVERNANCE_ROLE"));
    const kec_array = [kec256_backend, kec256_staking, kec256_governance];

    // check if contentbuyer1 has skating role
    expect(await contractRoleManager.hasRoles(kec_array, contentBuyer1.address)).to.equal(false);

    // grant STAKING_CONTRACT role to contentbuyer1 to pretend like a staking contract
    await contractRoleManager.connect(foundation).grantRole(STAKING_CONTRACT, contentBuyer1.address);
    // check if contentbuyer1 has skating role
    expect(await contractRoleManager.hasRoles(kec_array, contentBuyer1.address)).to.equal(true);
  });

  it("Should fail backend-else role to set KYC", async function () {
    await reDeploy();
    // set kyc for contentbuyer2
    await expect(contractRoleManager.connect(contentBuyer1).setKYC(contentBuyer2.address, true)).to.be.revertedWith(
      "Only backend can set KYC"
    );
  });

  it("Should fail backend-else or role to set ban if caller isnt the supervision contract", async function () {
    await reDeploy();
    // set ban for contentbuyer2
    await expect(contractRoleManager.connect(contentBuyer1).setBan(contentBuyer2.address, true)).to.be.revertedWith(
      "Only backend or supervision contract can set ban"
    );
    // grant supervision role to contentbuyer1 to pretend like a supervision contract
    await contractRoleManager.connect(foundation).grantRole(SUPERVISION_CONTRACT, contentBuyer1.address);
    // set ban for contentbuyer2
    await contractRoleManager.connect(contentBuyer1).setBan(contentBuyer2.address, true);
    // check if contentbuyer2 is banned
    expect(await contractRoleManager.isBanned(contentBuyer2.address, 1)).to.equal(true);
    // set ban for contentbuyer2 to false
    await contractRoleManager.connect(contentBuyer1).setBan(contentBuyer2.address, false);
    // check if contentbuyer2 is banned
    expect(await contractRoleManager.isBanned(contentBuyer2.address, 1)).to.equal(false);
  });

  it("Should fail ban the person who have backend or foundation role", async function () {
    await reDeploy();
    // grant supervision role to contentbuyer1 to pretend like a supervision contract
    await contractRoleManager.connect(foundation).grantRole(SUPERVISION_CONTRACT, contentBuyer1.address);
    // try to ban backend by contentbuyer1
    await expect(contractRoleManager.connect(contentBuyer1).setBan(backend.address, true)).to.be.revertedWith(
      "Backend cannot be banned"
    );
    // try to ban foundation by contentbuyer1
    await expect(contractRoleManager.connect(contentBuyer1).setBan(foundation.address, true)).to.be.revertedWith(
      "Foundation cannot be banned"
    );
  });

  it("Should fail backend-else role activate or deactivate to ban or kyc check for functions", async function () {
    await reDeploy();
    // try to activate kyc for function 20 with backend-else role
    await expect(contractRoleManager.connect(contentBuyer1).setActiveKYCFunctions(20, true)).to.be.revertedWith(
      "Only backend can set activeKYCFunctions"
    );
    // try to activate ban for function 20 with backend-else role
    await expect(contractRoleManager.connect(contentBuyer1).setActiveBanFunctions(20, true)).to.be.revertedWith(
      "Only backend can set activeBanFunctions"
    );
  });
});
