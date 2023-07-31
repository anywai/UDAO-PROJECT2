const { expect } = require("chai");
const hardhat = require("hardhat");
const { ethers } = hardhat;
const chai = require("chai");
const BN = require("bn.js");
const { LazyRole } = require("../lib/LazyRole");
const helpers = require("@nomicfoundation/hardhat-network-helpers");
const { deploy } = require("../lib/deployments");

const {
  WMATIC_ABI,
  NonFunbiblePositionABI,
  NonFunbiblePositionAddress,
  WMATICAddress,
} = require("../lib/abis");

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
  const VALIDATOR_ROLE = ethers.utils.keccak256(
    ethers.utils.toUtf8Bytes("VALIDATOR_ROLE")
  );
  const JUROR_ROLE = ethers.utils.keccak256(
    ethers.utils.toUtf8Bytes("JUROR_ROLE")
  );
  if (reApplyRolesViaVoucher) {
    for (let i = 0; i < reApplyValidatorRoles.length; i++) {
      await contractRoleManager.revokeRole(
        VALIDATOR_ROLE,
        reApplyValidatorRoles[i].address
      );
    }
    for (let i = 0; i < reApplyJurorRoles.length; i++) {
      await contractRoleManager.revokeRole(
        JUROR_ROLE,
        reApplyJurorRoles[i].address
      );
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
      await grantJurorRole(
        reApplyJurorRoles[i],
        contractRoleManager,
        contractUDAO,
        contractUDAOStaker,
        backend
      );
    }
  }
}
async function grantValidatorRole(
  account,
  contractRoleManager,
  contractUDAO,
  contractUDAOStaker,
  backend
) {
  await contractRoleManager.setKYC(account.address, true);
  await contractUDAO.transfer(
    account.address,
    ethers.utils.parseEther("100.0")
  );
  await contractUDAO
    .connect(account)
    .approve(
      contractUDAOStaker.address,
      ethers.utils.parseEther("999999999999.0")
    );

  // Staking
  await contractUDAOStaker
    .connect(account)
    .stakeForGovernance(ethers.utils.parseEther("10"), 30);
  await contractUDAOStaker.connect(account).applyForValidator();
  const lazyRole = new LazyRole({
    contract: contractUDAOStaker,
    signer: backend,
  });
  const role_voucher = await lazyRole.createVoucher(
    account.address,
    Date.now() + 999999999,
    0
  );
  await contractUDAOStaker.connect(account).getApproved(role_voucher);
}

async function grantJurorRole(
  account,
  contractRoleManager,
  contractUDAO,
  contractUDAOStaker,
  backend
) {
  await contractRoleManager.setKYC(account.address, true);
  await contractUDAO.transfer(
    account.address,
    ethers.utils.parseEther("100.0")
  );

  await contractUDAO
    .connect(account)
    .approve(
      contractUDAOStaker.address,
      ethers.utils.parseEther("999999999999.0")
    );

  // Staking

  await contractUDAOStaker
    .connect(account)
    .stakeForGovernance(ethers.utils.parseEther("10"), 30);
  await contractUDAOStaker.connect(account).applyForJuror();
  const lazyRole = new LazyRole({
    contract: contractUDAOStaker,
    signer: backend,
  });
  const role_voucher = await lazyRole.createVoucher(
    account.address,
    Date.now() + 999999999,
    1
  );
  await contractUDAOStaker.connect(account).getApproved(role_voucher);
}
async function setupGovernanceMember(
  contractRoleManager,
  contractUDAO,
  contractUDAOStaker,
  governanceCandidate
) {
  /// set KYC for governanceCandidate
  await contractRoleManager.setKYC(governanceCandidate.address, true);
  /// transfer UDAO to governanceCandidate
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
  /// any account must stake for governance to be Validator-Juror-GovernanceMember
  await expect(
    contractUDAOStaker
      .connect(governanceCandidate)
      .stakeForGovernance(ethers.utils.parseEther("10"), 30)
  )
    .to.emit(contractUDAOStaker, "GovernanceStake") // transfer from null address to minter
    .withArgs(
      governanceCandidate.address,
      ethers.utils.parseEther("10"),
      ethers.utils.parseEther("300")
    );
}

describe("UDAOStaker Contract", function () {
  it("Should deploy", async function () {
    await reDeploy();
  });

  it("Should update addresses", async function () {
    const { backend, contractUDAOStaker } = await deploy();

    await contractUDAOStaker.connect(backend).updateAddresses();
  });

  it("Should set validator lock amount", async function () {
    await reDeploy();
    // set validator lock amount to 100
    await expect(
      contractUDAOStaker.connect(foundation).setValidatorLockAmount("100")
    )
      .to.emit(contractUDAOStaker, "SetValidatorLockAmount") // transfer from null address to minter
      .withArgs("100");
    // check validator lock amount variable from contract
    expect(await contractUDAOStaker.validatorLockAmount()).to.eql(
      ethers.BigNumber.from("100")
    );
  });

  it("Should fail to set validator lock amount as unauthorized user", async function () {
    await reDeploy();
    // set validator lock amount with-out admin role
    await expect(
      contractUDAOStaker.connect(validator).setValidatorLockAmount("100")
    ).to.revertedWith(
      `AccessControl: account ${validator.address
        .toString()
        .toLowerCase()} is missing role`
    );
  });

  it("Should set juror lock amount", async function () {
    await reDeploy();
    // set juror lock amount to 100
    await expect(
      contractUDAOStaker.connect(foundation).setJurorLockAmount("100")
    )
      .to.emit(contractUDAOStaker, "SetJurorLockAmount") // transfer from null address to minter
      .withArgs("100");
    // check juror lock amount variable from contract
    expect(await contractUDAOStaker.jurorLockAmount()).to.eql(
      ethers.BigNumber.from("100")
    );
  });

  it("Should fail to set juror lock amount as unauthorized user", async function () {
    await reDeploy();
    // set juror lock amount with-out admin role
    await expect(
      contractUDAOStaker.connect(validator).setJurorLockAmount("100")
    ).to.revertedWith(
      `AccessControl: account ${validator.address
        .toString()
        .toLowerCase()} is missing role`
    );
  });

  it("Should set validator lock time", async function () {
    await reDeploy();
    // 1 day equal to 86400 seconds in Unix time
    const unixOneDay = 86400;
    // set validator lock time to 13 day
    await expect(
      contractUDAOStaker.connect(foundation).setValidatorLockTime("13")
    )
      .to.emit(contractUDAOStaker, "SetValidatorLockTime") // transfer from null address to minter
      .withArgs((unixOneDay * 13).toString());
    // check validator lock time variable from contract
    expect(await contractUDAOStaker.validatorLockTime()).to.eql(
      ethers.BigNumber.from((unixOneDay * 13).toString())
    );
  });

  it("Should fail to set validator lock time as unauthorized user", async function () {
    await reDeploy();
    // set validator lock time with-out admin role
    await expect(
      contractUDAOStaker.connect(validator).setValidatorLockTime("13")
    ).to.revertedWith(
      `AccessControl: account ${validator.address
        .toString()
        .toLowerCase()} is missing role`
    );
  });

  it("Should set juror lock time", async function () {
    await reDeploy();
    // 1 day equal to 86400 seconds in Unix time
    const unixOneDay = 86400;
    // set juror lock time to 13 day
    await expect(contractUDAOStaker.connect(foundation).setJurorLockTime("13"))
      .to.emit(contractUDAOStaker, "SetJurorLockTime") // transfer from null address to minter
      .withArgs((unixOneDay * 13).toString());
    // check juror lock time variable from contract
    expect(await contractUDAOStaker.jurorLockTime()).to.eql(
      ethers.BigNumber.from((unixOneDay * 13).toString())
    );
  });

  it("Should fail to set juror lock time as unauthorized user", async function () {
    await reDeploy();
    // set juror lock time with-out admin role
    await expect(
      contractUDAOStaker.connect(validator).setJurorLockTime("13")
    ).to.revertedWith(
      `AccessControl: account ${validator.address
        .toString()
        .toLowerCase()} is missing role`
    );
  });

  it("Should set application lock time", async function () {
    await reDeploy();
    // 1 day equal to 86400 seconds in Unix time
    const unixOneDay = 86400;
    // set application lock time to 13 day
    await expect(
      contractUDAOStaker.connect(foundation).setApplicationLockTime("13")
    )
      .to.emit(contractUDAOStaker, "SetApplicationLockTime") // transfer from null address to minter
      .withArgs((unixOneDay * 13).toString());
    // check application lock time variable from contract
    expect(await contractUDAOStaker.applicationLockTime()).to.eql(
      ethers.BigNumber.from((unixOneDay * 13).toString())
    );
  });

  it("Should fail to set application lock time as unauthorized user", async function () {
    await reDeploy();
    // set application lock time with-out admin role
    await expect(
      contractUDAOStaker.connect(validator).setApplicationLockTime("13")
    ).to.revertedWith(
      `AccessControl: account ${validator.address
        .toString()
        .toLowerCase()} is missing role`
    );
  });

  it("Should set maximum lock days", async function () {
    await reDeploy();
    // 1 day equal to 86400 seconds in Unix time
    const unixOneDay = 86400;
    // set maximum lock days to 1000 days
    await expect(
      contractUDAOStaker.connect(foundation).setMaximumStakeDays("1000")
    )
      .to.emit(contractUDAOStaker, "SetMaximumStakeDays") // transfer from null address to minter
      .withArgs((1000 * unixOneDay).toString());
    // check maximum lock days variable in contract
    expect(await contractUDAOStaker.maximum_stake_days()).to.eql(
      ethers.BigNumber.from((1000 * unixOneDay).toString())
    );
  });

  it("Should set minimum lock days", async function () {
    await reDeploy();
    // 1 day equal to 86400 seconds in Unix time
    const unixOneDay = 86400;
    // set minimum lock days to 1 day
    await expect(
      contractUDAOStaker.connect(foundation).setMinimumStakeDays("1")
    )
      .to.emit(contractUDAOStaker, "SetMinimumStakeDays") // transfer from null address to minter
      .withArgs((1 * unixOneDay).toString());
    // check minimum lock days variable in contract
    expect(await contractUDAOStaker.minimum_stake_days()).to.eql(
      ethers.BigNumber.from((1 * unixOneDay).toString())
    );
  });

  it("Should fail to set maximum lock days if less than minimum days", async function () {
    await reDeploy();
    // set maximum lock days to 1 days while minimum lock days is [7] day
    await expect(
      contractUDAOStaker.connect(foundation).setMaximumStakeDays("1")
    ).to.revertedWith("Maximum stake days must be greater than minimum days");
  });

  it("Should fail to set minimum lock days if more than maximum days", async function () {
    await reDeploy();
    // set minimum lock days to 3000 days while minimum lock days is [1460] day
    await expect(
      contractUDAOStaker.connect(foundation).setMinimumStakeDays("3000")
    ).to.revertedWith("Minimum stake days must be less than maximum days");
  });

  it("Should set super vote reward amount", async function () {
    await reDeploy();
    // set vote reward amount to 100
    await expect(contractUDAOStaker.connect(foundation).setVoteReward("100"))
      .to.emit(contractUDAOStaker, "SetVoteReward") // transfer from null address to minter
      .withArgs("100");
  });

  it("Should fail to set super vote reward amount as unauthorized user", async function () {
    await reDeploy();
    // set vote reward amount with-out admin role
    await expect(
      contractUDAOStaker.connect(validator).setVoteReward("100")
    ).to.revertedWith(
      `AccessControl: account ${validator.address
        .toString()
        .toLowerCase()} is missing role`
    );
  });

  it("Should set a new platform treasury address", async function () {
    await reDeploy();

    await expect(
      contractUDAOStaker
        .connect(backend)
        .setPlatformTreasuryAddress(foundation.address)
    )
      .to.emit(contractUDAOStaker, "SetPlatformTreasuryAddress") // transfer from null address to minter
      .withArgs(foundation.address);
  });

  it("Should fail to set a new platform treasury address as unauthorized user", async function () {
    await reDeploy();

    await expect(
      contractUDAOStaker
        .connect(validator)
        .setPlatformTreasuryAddress(foundation.address)
    ).to.revertedWith(
      `AccessControl: account ${validator.address
        .toString()
        .toLowerCase()} is missing role`
    );
  });

  it("Should stake to be a governance member", async function () {
    await reDeploy();
    /// set KYC for governanceCandidate
    await contractRoleManager.setKYC(governanceCandidate.address, true);
    /// transfer UDAO to governanceCandidate
    await contractUDAO.transfer(
      governanceCandidate.address,
      ethers.utils.parseEther("100.0")
    );
    /// approve UDAOStaker contract with governanceCandidate to spend UDAO
    await contractUDAO
      .connect(governanceCandidate)
      .approve(
        contractUDAOStaker.address,
        ethers.utils.parseEther("999999999999.0")
      );
    /// any account must stake for governance to be Validator-Juror-GovernanceMember
    await expect(
      contractUDAOStaker
        .connect(governanceCandidate)
        .stakeForGovernance(ethers.utils.parseEther("10"), 30)
    )
      .to.emit(contractUDAOStaker, "GovernanceStake") // transfer from null address to minter
      .withArgs(
        governanceCandidate.address,
        ethers.utils.parseEther("10"),
        ethers.utils.parseEther("300")
      );
  });

  it("Should fail to stake to be a governance member if more than maximum days", async function () {
    await reDeploy();
    /// set KYC for governanceCandidate
    await contractRoleManager.setKYC(governanceCandidate.address, true);
    /// transfer UDAO to governanceCandidate
    await contractUDAO.transfer(
      governanceCandidate.address,
      ethers.utils.parseEther("100.0")
    );
    /// approve UDAOStaker contract with governanceCandidate to spend UDAO
    await contractUDAO
      .connect(governanceCandidate)
      .approve(
        contractUDAOStaker.address,
        ethers.utils.parseEther("999999999999.0")
      );
    /// any account must stake for governance to be Validator-Juror-GovernanceMember
    await expect(
      contractUDAOStaker
        .connect(governanceCandidate)
        .stakeForGovernance(ethers.utils.parseEther("10"), 3000)
    ).to.revertedWith("Can't stake more than maximum_stake_days");
  });

  it("Should fail to stake to be a governance member if less than maximum days", async function () {
    await reDeploy();
    /// set KYC for governanceCandidate
    await contractRoleManager.setKYC(governanceCandidate.address, true);
    /// transfer UDAO to governanceCandidate
    await contractUDAO.transfer(
      governanceCandidate.address,
      ethers.utils.parseEther("100.0")
    );
    /// approve UDAOStaker contract with governanceCandidate to spend UDAO
    await contractUDAO
      .connect(governanceCandidate)
      .approve(
        contractUDAOStaker.address,
        ethers.utils.parseEther("999999999999.0")
      );
    /// any account must stake for governance to be Validator-Juror-GovernanceMember
    await expect(
      contractUDAOStaker
        .connect(governanceCandidate)
        .stakeForGovernance(ethers.utils.parseEther("10"), 3)
    ).to.revertedWith("Can't stake less than minimum_stake_days");
  });

  it("Should apply for validator", async function () {
    await reDeploy();
    /// set KYC for validatorCandidate
    await contractRoleManager.setKYC(validatorCandidate.address, true);
    /// transfer UDAO to validatorCandidate
    await contractUDAO.transfer(
      validatorCandidate.address,
      ethers.utils.parseEther("10000.0")
    );
    /// approve UDAOStaker contract with validatorCandidate to spend UDAO
    await contractUDAO
      .connect(validatorCandidate)
      .approve(
        contractUDAOStaker.address,
        ethers.utils.parseEther("999999999999.0")
      );
    /// any account must stake for governance to be Validator-Juror-GovernanceMember
    await expect(
      contractUDAOStaker
        .connect(validatorCandidate)
        .stakeForGovernance(ethers.utils.parseEther("10"), 30)
    )
      .to.emit(contractUDAOStaker, "GovernanceStake") // transfer from null address to minter
      .withArgs(
        validatorCandidate.address,
        ethers.utils.parseEther("10"),
        ethers.utils.parseEther("300")
      );
    /// get validator lock amount from UDAOStaker contract
    const validatorLockAmount = await contractUDAOStaker.validatorLockAmount();
    /// apply the "validator role" with validatorCandidate account
    await expect(
      contractUDAOStaker.connect(validatorCandidate).applyForValidator()
    )
      .to.emit(contractUDAOStaker, "RoleApplied") // transfer from null address to minter
      .withArgs(0, validatorCandidate.address, validatorLockAmount);
  });

  it("Should fail to apply for validator when paused", async function () {
    await reDeploy();
    /// set KYC for validatorCandidate
    await contractRoleManager.setKYC(validatorCandidate.address, true);
    /// transfer UDAO to validatorCandidate
    await contractUDAO.transfer(
      validatorCandidate.address,
      ethers.utils.parseEther("10000.0")
    );
    /// approve UDAOStaker contract with validatorCandidate to spend UDAO
    await contractUDAO
      .connect(validatorCandidate)
      .approve(
        contractUDAOStaker.address,
        ethers.utils.parseEther("999999999999.0")
      );
    /// any account must stake for governance to be Validator-Juror-GovernanceMember
    await expect(
      contractUDAOStaker
        .connect(validatorCandidate)
        .stakeForGovernance(ethers.utils.parseEther("10"), 30)
    )
      .to.emit(contractUDAOStaker, "GovernanceStake") // transfer from null address to minter
      .withArgs(
        validatorCandidate.address,
        ethers.utils.parseEther("10"),
        ethers.utils.parseEther("300")
      );
    /// pause to contract
    await contractUDAOStaker.pause();
    /// apply the "validator role" with validatorCandidate account
    await expect(
      contractUDAOStaker.connect(validatorCandidate).applyForValidator()
    ).to.revertedWith("Pausable: paused");
  });

  it("Should approve for validator", async function () {
    await reDeploy();
    /// set KYC for validatorCandidate
    await contractRoleManager.setKYC(validatorCandidate.address, true);
    /// transfer UDAO to validatorCandidate
    await contractUDAO.transfer(
      validatorCandidate.address,
      ethers.utils.parseEther("10000.0")
    );
    /// approve UDAOStaker contract with validatorCandidate to spend UDAO
    await contractUDAO
      .connect(validatorCandidate)
      .approve(
        contractUDAOStaker.address,
        ethers.utils.parseEther("999999999999.0")
      );
    /// any account must stake for governance to be able to Validator-Juror-GovernanceMember
    await expect(
      contractUDAOStaker
        .connect(validatorCandidate)
        .stakeForGovernance(ethers.utils.parseEther("10"), 30)
    )
      .to.emit(contractUDAOStaker, "GovernanceStake") // transfer from null address to minter
      .withArgs(
        validatorCandidate.address,
        ethers.utils.parseEther("10"),
        ethers.utils.parseEther("300")
      );
    /// get validatorLockAmount from UDAOStaker contract
    const validatorLockAmount = await contractUDAOStaker.validatorLockAmount();
    /// apply the "validator role" with validatorCandidate account
    await expect(
      contractUDAOStaker.connect(validatorCandidate).applyForValidator()
    )
      .to.emit(contractUDAOStaker, "RoleApplied") // transfer from null address to minter
      .withArgs(0, validatorCandidate.address, validatorLockAmount);
    /// get lazy role and role voucher
    const lazyRole = new LazyRole({
      contract: contractUDAOStaker,
      signer: backend,
    });
    const role_voucher = await lazyRole.createVoucher(
      validatorCandidate.address,
      Date.now() + 999999999,
      0
    );
    /// approve the "validator role" with validatorCandidate account
    await expect(
      contractUDAOStaker.connect(validatorCandidate).getApproved(role_voucher)
    )
      .to.emit(contractUDAOStaker, "RoleApproved") // transfer from null address to minter
      .withArgs(0, validatorCandidate.address);
  });

  it("Should fail to apply for validator if not governance member", async function () {
    await reDeploy();
    /// set KYC for validatorCandidate
    await contractRoleManager.setKYC(validatorCandidate.address, true);
    /// transfer UDAO to validatorCandidate
    await contractUDAO.transfer(
      validatorCandidate.address,
      ethers.utils.parseEther("10000.0")
    );
    /// approve UDAOStaker contract with validatorCandidate to spend UDAO
    await contractUDAO
      .connect(validatorCandidate)
      .approve(
        contractUDAOStaker.address,
        ethers.utils.parseEther("999999999999.0")
      );
    /// apply the "validator role" with validatorCandidate account
    await expect(
      contractUDAOStaker.connect(validatorCandidate).applyForValidator()
    ).to.revertedWith("You have to be governance member to apply");
  });

  it("Should fail to apply for validator if already validator", async function () {
    await reDeploy();
    /// set KYC for validatorCandidate
    await contractRoleManager.setKYC(validatorCandidate.address, true);
    /// transfer UDAO to validatorCandidate
    await contractUDAO.transfer(
      validatorCandidate.address,
      ethers.utils.parseEther("10000.0")
    );
    /// approve UDAOStaker contract with validatorCandidate to spend UDAO
    await contractUDAO
      .connect(validatorCandidate)
      .approve(
        contractUDAOStaker.address,
        ethers.utils.parseEther("999999999999.0")
      );
    /// any account must stake for governance to be able to Validator-Juror-GovernanceMember
    await expect(
      contractUDAOStaker
        .connect(validatorCandidate)
        .stakeForGovernance(ethers.utils.parseEther("10"), 30)
    )
      .to.emit(contractUDAOStaker, "GovernanceStake") // transfer from null address to minter
      .withArgs(
        validatorCandidate.address,
        ethers.utils.parseEther("10"),
        ethers.utils.parseEther("300")
      );
    /// get validatorLockAmount from UDAOStaker contract
    const validatorLockAmount = await contractUDAOStaker.validatorLockAmount();
    /// apply the "validator role" with validatorCandidate account
    await expect(
      contractUDAOStaker.connect(validatorCandidate).applyForValidator()
    )
      .to.emit(contractUDAOStaker, "RoleApplied") // transfer from null address to minter
      .withArgs(0, validatorCandidate.address, validatorLockAmount);
    /// get lazy role and role voucher
    const lazyRole = new LazyRole({
      contract: contractUDAOStaker,
      signer: backend,
    });
    const role_voucher = await lazyRole.createVoucher(
      validatorCandidate.address,
      Date.now() + 999999999,
      0
    );
    /// approve the "validator role" with validatorCandidate account
    await expect(
      contractUDAOStaker.connect(validatorCandidate).getApproved(role_voucher)
    )
      .to.emit(contractUDAOStaker, "RoleApproved") // transfer from null address to minter
      .withArgs(0, validatorCandidate.address);
    /// apply the "validator role" with validatorCandidate account
    await expect(
      contractUDAOStaker.connect(validatorCandidate).applyForValidator()
    ).to.revertedWith("Address is already a Validator");
  });

  it("Should apply for juror", async function () {
    await reDeploy();
    /// set KYC for jurorCandidate
    await contractRoleManager.setKYC(jurorCandidate.address, true);
    /// transfer UDAO to jurorCandidate
    await contractUDAO.transfer(
      jurorCandidate.address,
      ethers.utils.parseEther("10000.0")
    );
    /// approve UDAOStaker contract with jurorCandidate to spend UDAO
    await contractUDAO
      .connect(jurorCandidate)
      .approve(
        contractUDAOStaker.address,
        ethers.utils.parseEther("999999999999.0")
      );
    /// any account must stake for governance to be Validator-Juror-GovernanceMember
    await expect(
      contractUDAOStaker
        .connect(jurorCandidate)
        .stakeForGovernance(ethers.utils.parseEther("10"), 30)
    )
      .to.emit(contractUDAOStaker, "GovernanceStake") // transfer from null address to minter
      .withArgs(
        jurorCandidate.address,
        ethers.utils.parseEther("10"),
        ethers.utils.parseEther("300")
      );
    /// get juror lock amount from UDAOStaker contract
    const jurorLockAmount = await contractUDAOStaker.jurorLockAmount();
    /// apply the "juror role" with jurorCandidate account
    await expect(contractUDAOStaker.connect(jurorCandidate).applyForJuror())
      .to.emit(contractUDAOStaker, "RoleApplied") // transfer from null address to minter
      .withArgs(1, jurorCandidate.address, jurorLockAmount);
  });

  it("Should approve for juror", async function () {
    await reDeploy();
    /// set KYC for jurorCandidate
    await contractRoleManager.setKYC(jurorCandidate.address, true);
    /// transfer UDAO to jurorCandidate
    await contractUDAO.transfer(
      jurorCandidate.address,
      ethers.utils.parseEther("10000.0")
    );
    /// approve UDAOStaker contract with jurorCandidate to spend UDAO
    await contractUDAO
      .connect(jurorCandidate)
      .approve(
        contractUDAOStaker.address,
        ethers.utils.parseEther("999999999999.0")
      );
    /// any account must stake for governance to be Validator-Juror-GovernanceMember
    await expect(
      contractUDAOStaker
        .connect(jurorCandidate)
        .stakeForGovernance(ethers.utils.parseEther("10"), 30)
    )
      .to.emit(contractUDAOStaker, "GovernanceStake") // transfer from null address to minter
      .withArgs(
        jurorCandidate.address,
        ethers.utils.parseEther("10"),
        ethers.utils.parseEther("300")
      );
    /// get juror lock amount from UDAOStaker contract
    const jurorLockAmount = await contractUDAOStaker.jurorLockAmount();
    /// apply the "juror role" with jurorCandidate account
    await expect(contractUDAOStaker.connect(jurorCandidate).applyForJuror())
      .to.emit(contractUDAOStaker, "RoleApplied") // transfer from null address to minter
      .withArgs(1, jurorCandidate.address, jurorLockAmount);
    /// get lazy role and role voucher
    const lazyRole = new LazyRole({
      contract: contractUDAOStaker,
      signer: backend,
    });
    const role_voucher = await lazyRole.createVoucher(
      jurorCandidate.address,
      Date.now() + 999999999,
      1
    );
    /// approve the "juror role" with jurorCandidate account
    await expect(
      contractUDAOStaker.connect(jurorCandidate).getApproved(role_voucher)
    )
      .to.emit(contractUDAOStaker, "RoleApproved") // transfer from null address to minter
      .withArgs(1, jurorCandidate.address);
  });

  it("Should fail to approve if role id is undefined", async function () {
    await reDeploy();
    /// set KYC for jurorCandidate
    await contractRoleManager.setKYC(jurorCandidate.address, true);
    /// transfer UDAO to jurorCandidate
    await contractUDAO.transfer(
      jurorCandidate.address,
      ethers.utils.parseEther("10000.0")
    );
    /// approve UDAOStaker contract with jurorCandidate to spend UDAO
    await contractUDAO
      .connect(jurorCandidate)
      .approve(
        contractUDAOStaker.address,
        ethers.utils.parseEther("999999999999.0")
      );
    /// any account must stake for governance to be Validator-Juror-GovernanceMember
    await expect(
      contractUDAOStaker
        .connect(jurorCandidate)
        .stakeForGovernance(ethers.utils.parseEther("10"), 30)
    )
      .to.emit(contractUDAOStaker, "GovernanceStake") // transfer from null address to minter
      .withArgs(
        jurorCandidate.address,
        ethers.utils.parseEther("10"),
        ethers.utils.parseEther("300")
      );
    /// get juror lock amount from UDAOStaker contract
    const jurorLockAmount = await contractUDAOStaker.jurorLockAmount();
    /// apply the "juror role" with jurorCandidate account
    await expect(contractUDAOStaker.connect(jurorCandidate).applyForJuror())
      .to.emit(contractUDAOStaker, "RoleApplied") // transfer from null address to minter
      .withArgs(1, jurorCandidate.address, jurorLockAmount);
    /// get lazy role and role voucher
    const lazyRole = new LazyRole({
      contract: contractUDAOStaker,
      signer: backend,
    });
    const role_voucher = await lazyRole.createVoucher(
      jurorCandidate.address,
      Date.now() + 999999999,
      4
    );
    /// approve the "juror role" with jurorCandidate account
    await expect(
      contractUDAOStaker.connect(jurorCandidate).getApproved(role_voucher)
    ).to.revertedWith("Undefined role ID!");
  });

  it("Should reject for validator", async function () {
    await reDeploy();
    /// set KYC for validatorCandidate
    await contractRoleManager.setKYC(validatorCandidate.address, true);
    /// transfer UDAO to validatorCandidate
    await contractUDAO.transfer(
      validatorCandidate.address,
      ethers.utils.parseEther("10000.0")
    );
    /// approve UDAOStaker contract with validatorCandidate to spend UDAO
    await contractUDAO
      .connect(validatorCandidate)
      .approve(
        contractUDAOStaker.address,
        ethers.utils.parseEther("999999999999.0")
      );
    /// any account must stake for governance to be Validator-Juror-GovernanceMember
    await expect(
      contractUDAOStaker
        .connect(validatorCandidate)
        .stakeForGovernance(ethers.utils.parseEther("10"), 30)
    )
      .to.emit(contractUDAOStaker, "GovernanceStake") // transfer from null address to minter
      .withArgs(
        validatorCandidate.address,
        ethers.utils.parseEther("10"),
        ethers.utils.parseEther("300")
      );
    /// get validator lock amount from UDAOStaker contract
    const validatorLockAmount = await contractUDAOStaker.validatorLockAmount();
    /// apply the "validator role" with validatorCandidate account
    await expect(
      contractUDAOStaker.connect(validatorCandidate).applyForValidator()
    )
      .to.emit(contractUDAOStaker, "RoleApplied") // transfer from null address to minter
      .withArgs(0, validatorCandidate.address, validatorLockAmount);
    await expect(
      contractUDAOStaker
        .connect(backend)
        .rejectApplication(validatorCandidate.address, 0)
    )
      .to.emit(contractUDAOStaker, "RoleRejected")
      .withArgs(0, validatorCandidate.address); // transfer from null address to minter
  });

  it("Should reject for juror", async function () {
    await reDeploy();
    /// set KYC for jurorCandidate
    await contractRoleManager.setKYC(jurorCandidate.address, true);
    /// transfer UDAO to jurorCandidate
    await contractUDAO.transfer(
      jurorCandidate.address,
      ethers.utils.parseEther("10000.0")
    );
    /// approve UDAOStaker contract with jurorCandidate to spend UDAO
    await contractUDAO
      .connect(jurorCandidate)
      .approve(
        contractUDAOStaker.address,
        ethers.utils.parseEther("999999999999.0")
      );
    /// any account must stake for governance to be Validator-Juror-GovernanceMember
    await expect(
      contractUDAOStaker
        .connect(jurorCandidate)
        .stakeForGovernance(ethers.utils.parseEther("10"), 30)
    )
      .to.emit(contractUDAOStaker, "GovernanceStake") // transfer from null address to minter
      .withArgs(
        jurorCandidate.address,
        ethers.utils.parseEther("10"),
        ethers.utils.parseEther("300")
      );
    /// get juror lock amount from UDAOStaker contract
    const jurorLockAmount = await contractUDAOStaker.jurorLockAmount();
    /// apply the "juror role" with jurorCandidate account
    await expect(contractUDAOStaker.connect(jurorCandidate).applyForJuror())
      .to.emit(contractUDAOStaker, "RoleApplied") // transfer from null address to minter
      .withArgs(1, jurorCandidate.address, jurorLockAmount);
    await expect(
      contractUDAOStaker
        .connect(backend)
        .rejectApplication(jurorCandidate.address, 1)
    )
      .to.emit(contractUDAOStaker, "RoleRejected")
      .withArgs(1, jurorCandidate.address); // transfer from null address to minter
  });

  it("Should fail rejecting if role id does not exist", async function () {
    await reDeploy();
    /// set KYC for jurorCandidate
    await contractRoleManager.setKYC(jurorCandidate.address, true);
    /// transfer UDAO to jurorCandidate
    await contractUDAO.transfer(
      jurorCandidate.address,
      ethers.utils.parseEther("10000.0")
    );
    /// approve UDAOStaker contract with jurorCandidate to spend UDAO
    await contractUDAO
      .connect(jurorCandidate)
      .approve(
        contractUDAOStaker.address,
        ethers.utils.parseEther("999999999999.0")
      );
    /// any account must stake for governance to be Validator-Juror-GovernanceMember
    await expect(
      contractUDAOStaker
        .connect(jurorCandidate)
        .stakeForGovernance(ethers.utils.parseEther("10"), 30)
    )
      .to.emit(contractUDAOStaker, "GovernanceStake") // transfer from null address to minter
      .withArgs(
        jurorCandidate.address,
        ethers.utils.parseEther("10"),
        ethers.utils.parseEther("300")
      );
    /// get juror lock amount from UDAOStaker contract
    const jurorLockAmount = await contractUDAOStaker.jurorLockAmount();
    /// apply the "juror role" with jurorCandidate account
    await expect(contractUDAOStaker.connect(jurorCandidate).applyForJuror())
      .to.emit(contractUDAOStaker, "RoleApplied") // transfer from null address to minter
      .withArgs(1, jurorCandidate.address, jurorLockAmount);
    await expect(
      contractUDAOStaker
        .connect(backend)
        .rejectApplication(jurorCandidate.address, 4)
    ).to.revertedWith("Role Id does not exist!");
  });

  it("Should fail rejecting if sender is not backend", async function () {
    await reDeploy();
    /// set KYC for jurorCandidate
    await contractRoleManager.setKYC(jurorCandidate.address, true);
    /// transfer UDAO to jurorCandidate
    await contractUDAO.transfer(
      jurorCandidate.address,
      ethers.utils.parseEther("10000.0")
    );
    /// approve UDAOStaker contract with jurorCandidate to spend UDAO
    await contractUDAO
      .connect(jurorCandidate)
      .approve(
        contractUDAOStaker.address,
        ethers.utils.parseEther("999999999999.0")
      );
    /// any account must stake for governance to be Validator-Juror-GovernanceMember
    await expect(
      contractUDAOStaker
        .connect(jurorCandidate)
        .stakeForGovernance(ethers.utils.parseEther("10"), 30)
    )
      .to.emit(contractUDAOStaker, "GovernanceStake") // transfer from null address to minter
      .withArgs(
        jurorCandidate.address,
        ethers.utils.parseEther("10"),
        ethers.utils.parseEther("300")
      );
    /// get juror lock amount from UDAOStaker contract
    const jurorLockAmount = await contractUDAOStaker.jurorLockAmount();
    /// apply the "juror role" with jurorCandidate account
    await expect(contractUDAOStaker.connect(jurorCandidate).applyForJuror())
      .to.emit(contractUDAOStaker, "RoleApplied") // transfer from null address to minter
      .withArgs(1, jurorCandidate.address, jurorLockAmount);
    await expect(
      contractUDAOStaker
        .connect(jurorCandidate)
        .rejectApplication(jurorCandidate.address, 1)
    ).to.revertedWith(
      `AccessControl: account ${jurorCandidate.address.toLowerCase()} is missing role ${BACKEND_ROLE}`
    );
  });

  it("Should withdraw validator stake when approved", async function () {
    await reDeploy();
    /// set KYC for validatorCandidate
    await contractRoleManager.setKYC(validatorCandidate.address, true);
    /// transfer UDAO to validatorCandidate
    await contractUDAO.transfer(
      validatorCandidate.address,
      ethers.utils.parseEther("10000.0")
    );
    /// approve UDAOStaker contract with validatorCandidate to spend UDAO
    await contractUDAO
      .connect(validatorCandidate)
      .approve(
        contractUDAOStaker.address,
        ethers.utils.parseEther("999999999999.0")
      );
    /// any account must stake for governance to be Validator-Juror-GovernanceMember
    await expect(
      contractUDAOStaker
        .connect(validatorCandidate)
        .stakeForGovernance(ethers.utils.parseEther("10"), 30)
    )
      .to.emit(contractUDAOStaker, "GovernanceStake") // transfer from null address to minter
      .withArgs(
        validatorCandidate.address,
        ethers.utils.parseEther("10"),
        ethers.utils.parseEther("300")
      );
    /// get validator lock amount from UDAOStaker contract
    const validatorLockAmount = await contractUDAOStaker.validatorLockAmount();
    /// apply the "validator role" with validatorCandidate account
    await expect(
      contractUDAOStaker.connect(validatorCandidate).applyForValidator()
    )
      .to.emit(contractUDAOStaker, "RoleApplied") // transfer from null address to minter
      .withArgs(0, validatorCandidate.address, validatorLockAmount);
    /// get lazy role and role voucher
    const lazyRole = new LazyRole({
      contract: contractUDAOStaker,
      signer: backend,
    });
    const role_voucher = await lazyRole.createVoucher(
      validatorCandidate.address,
      Date.now() + 999999999,
      0
    );
    /// approve the "validator role" with validatorCandidate account
    await expect(
      contractUDAOStaker.connect(validatorCandidate).getApproved(role_voucher)
    )
      .to.emit(contractUDAOStaker, "RoleApproved") // transfer from null address to minter
      .withArgs(0, validatorCandidate.address);

    await helpers.time.increase(259200200);
    await expect(
      contractUDAOStaker.connect(validatorCandidate).withdrawValidatorStake()
    )
      .to.emit(contractUDAOStaker, "ValidatorStakeWithdrawn")
      .withArgs(validatorCandidate.address, validatorLockAmount);
  });

  it("Should withdraw validator stake when approved and banned", async function () {
    await reDeploy();
    /// set KYC for validatorCandidate
    await contractRoleManager.setKYC(validatorCandidate.address, true);
    /// transfer UDAO to validatorCandidate
    await contractUDAO.transfer(
      validatorCandidate.address,
      ethers.utils.parseEther("10000.0")
    );
    /// approve UDAOStaker contract with validatorCandidate to spend UDAO
    await contractUDAO
      .connect(validatorCandidate)
      .approve(
        contractUDAOStaker.address,
        ethers.utils.parseEther("999999999999.0")
      );
    /// any account must stake for governance to be Validator-Juror-GovernanceMember
    await expect(
      contractUDAOStaker
        .connect(validatorCandidate)
        .stakeForGovernance(ethers.utils.parseEther("10"), 30)
    )
      .to.emit(contractUDAOStaker, "GovernanceStake") // transfer from null address to minter
      .withArgs(
        validatorCandidate.address,
        ethers.utils.parseEther("10"),
        ethers.utils.parseEther("300")
      );
    /// get validator lock amount from UDAOStaker contract
    const validatorLockAmount = await contractUDAOStaker.validatorLockAmount();
    /// apply the "validator role" with validatorCandidate account
    await expect(
      contractUDAOStaker.connect(validatorCandidate).applyForValidator()
    )
      .to.emit(contractUDAOStaker, "RoleApplied") // transfer from null address to minter
      .withArgs(0, validatorCandidate.address, validatorLockAmount);
    /// get lazy role and role voucher
    const lazyRole = new LazyRole({
      contract: contractUDAOStaker,
      signer: backend,
    });
    const role_voucher = await lazyRole.createVoucher(
      validatorCandidate.address,
      Date.now() + 999999999,
      0
    );
    /// approve the "validator role" with validatorCandidate account
    await expect(
      contractUDAOStaker.connect(validatorCandidate).getApproved(role_voucher)
    )
      .to.emit(contractUDAOStaker, "RoleApproved") // transfer from null address to minter
      .withArgs(0, validatorCandidate.address);

    await helpers.time.increase(259200200);
    //Ban the user
    await contractRoleManager.setBan(validatorCandidate.address, true);
    await expect(
      contractUDAOStaker.connect(validatorCandidate).withdrawValidatorStake()
    )
      .to.emit(contractUDAOStaker, "ValidatorStakeWithdrawn")
      .withArgs(validatorCandidate.address, validatorLockAmount);
  });

  it("Should withdraw validator stake when rejected", async function () {
    await reDeploy();
    /// set KYC for validatorCandidate
    await contractRoleManager.setKYC(validatorCandidate.address, true);
    /// transfer UDAO to validatorCandidate
    await contractUDAO.transfer(
      validatorCandidate.address,
      ethers.utils.parseEther("10000.0")
    );
    /// approve UDAOStaker contract with validatorCandidate to spend UDAO
    await contractUDAO
      .connect(validatorCandidate)
      .approve(
        contractUDAOStaker.address,
        ethers.utils.parseEther("999999999999.0")
      );
    /// any account must stake for governance to be Validator-Juror-GovernanceMember
    await expect(
      contractUDAOStaker
        .connect(validatorCandidate)
        .stakeForGovernance(ethers.utils.parseEther("10"), 30)
    )
      .to.emit(contractUDAOStaker, "GovernanceStake") // transfer from null address to minter
      .withArgs(
        validatorCandidate.address,
        ethers.utils.parseEther("10"),
        ethers.utils.parseEther("300")
      );
    /// get validator lock amount from UDAOStaker contract
    const validatorLockAmount = await contractUDAOStaker.validatorLockAmount();
    /// apply the "validator role" with validatorCandidate account
    await expect(
      contractUDAOStaker.connect(validatorCandidate).applyForValidator()
    )
      .to.emit(contractUDAOStaker, "RoleApplied") // transfer from null address to minter
      .withArgs(0, validatorCandidate.address, validatorLockAmount);
    await expect(
      contractUDAOStaker
        .connect(backend)
        .rejectApplication(validatorCandidate.address, 0)
    )
      .to.emit(contractUDAOStaker, "RoleRejected")
      .withArgs(0, validatorCandidate.address); // transfer from null address to minter
    await expect(
      contractUDAOStaker.connect(validatorCandidate).withdrawValidatorStake()
    )
      .to.emit(contractUDAOStaker, "ValidatorStakeWithdrawn")
      .withArgs(validatorCandidate.address, validatorLockAmount);
  });

  it("Should withdraw validator stake when rejected and banned", async function () {
    await reDeploy();
    /// set KYC for validatorCandidate
    await contractRoleManager.setKYC(validatorCandidate.address, true);
    /// transfer UDAO to validatorCandidate
    await contractUDAO.transfer(
      validatorCandidate.address,
      ethers.utils.parseEther("10000.0")
    );
    /// approve UDAOStaker contract with validatorCandidate to spend UDAO
    await contractUDAO
      .connect(validatorCandidate)
      .approve(
        contractUDAOStaker.address,
        ethers.utils.parseEther("999999999999.0")
      );
    /// any account must stake for governance to be Validator-Juror-GovernanceMember
    await expect(
      contractUDAOStaker
        .connect(validatorCandidate)
        .stakeForGovernance(ethers.utils.parseEther("10"), 30)
    )
      .to.emit(contractUDAOStaker, "GovernanceStake") // transfer from null address to minter
      .withArgs(
        validatorCandidate.address,
        ethers.utils.parseEther("10"),
        ethers.utils.parseEther("300")
      );
    /// get validator lock amount from UDAOStaker contract
    const validatorLockAmount = await contractUDAOStaker.validatorLockAmount();
    /// apply the "validator role" with validatorCandidate account
    await expect(
      contractUDAOStaker.connect(validatorCandidate).applyForValidator()
    )
      .to.emit(contractUDAOStaker, "RoleApplied") // transfer from null address to minter
      .withArgs(0, validatorCandidate.address, validatorLockAmount);
    await expect(
      contractUDAOStaker
        .connect(backend)
        .rejectApplication(validatorCandidate.address, 0)
    )
      .to.emit(contractUDAOStaker, "RoleRejected")
      .withArgs(0, validatorCandidate.address); // transfer from null address to minter
    //Ban the user
    await contractRoleManager.setBan(validatorCandidate.address, true);
    await expect(
      contractUDAOStaker.connect(validatorCandidate).withdrawValidatorStake()
    )
      .to.emit(contractUDAOStaker, "ValidatorStakeWithdrawn")
      .withArgs(validatorCandidate.address, validatorLockAmount);
  });

  it("Should withdraw juror stake when approved", async function () {
    await reDeploy();
    /// set KYC for jurorCandidate
    await contractRoleManager.setKYC(jurorCandidate.address, true);
    /// transfer UDAO to jurorCandidate
    await contractUDAO.transfer(
      jurorCandidate.address,
      ethers.utils.parseEther("10000.0")
    );
    /// approve UDAOStaker contract with jurorCandidate to spend UDAO
    await contractUDAO
      .connect(jurorCandidate)
      .approve(
        contractUDAOStaker.address,
        ethers.utils.parseEther("999999999999.0")
      );
    /// any account must stake for governance to be Validator-Juror-GovernanceMember
    await expect(
      contractUDAOStaker
        .connect(jurorCandidate)
        .stakeForGovernance(ethers.utils.parseEther("10"), 30)
    )
      .to.emit(contractUDAOStaker, "GovernanceStake") // transfer from null address to minter
      .withArgs(
        jurorCandidate.address,
        ethers.utils.parseEther("10"),
        ethers.utils.parseEther("300")
      );
    /// get juror lock amount from UDAOStaker contract
    const jurorLockAmount = await contractUDAOStaker.jurorLockAmount();
    /// apply the "juror role" with jurorCandidate account
    await expect(contractUDAOStaker.connect(jurorCandidate).applyForJuror())
      .to.emit(contractUDAOStaker, "RoleApplied") // transfer from null address to minter
      .withArgs(1, jurorCandidate.address, jurorLockAmount);
    /// get lazy role and role voucher
    const lazyRole = new LazyRole({
      contract: contractUDAOStaker,
      signer: backend,
    });
    const role_voucher = await lazyRole.createVoucher(
      jurorCandidate.address,
      Date.now() + 999999999,
      1
    );
    /// approve the "juror role" with jurorCandidate account
    await expect(
      contractUDAOStaker.connect(jurorCandidate).getApproved(role_voucher)
    )
      .to.emit(contractUDAOStaker, "RoleApproved") // transfer from null address to minter
      .withArgs(1, jurorCandidate.address);

    await helpers.time.increase(259200200);
    await expect(
      contractUDAOStaker.connect(jurorCandidate).withdrawJurorStake()
    )
      .to.emit(contractUDAOStaker, "JurorStakeWithdrawn")
      .withArgs(jurorCandidate.address, jurorLockAmount);
  });

  it("Should withdraw juror stake when approved and banned", async function () {
    await reDeploy();
    /// set KYC for jurorCandidate
    await contractRoleManager.setKYC(jurorCandidate.address, true);
    /// transfer UDAO to jurorCandidate
    await contractUDAO.transfer(
      jurorCandidate.address,
      ethers.utils.parseEther("10000.0")
    );
    /// approve UDAOStaker contract with jurorCandidate to spend UDAO
    await contractUDAO
      .connect(jurorCandidate)
      .approve(
        contractUDAOStaker.address,
        ethers.utils.parseEther("999999999999.0")
      );
    /// any account must stake for governance to be Validator-Juror-GovernanceMember
    await expect(
      contractUDAOStaker
        .connect(jurorCandidate)
        .stakeForGovernance(ethers.utils.parseEther("10"), 30)
    )
      .to.emit(contractUDAOStaker, "GovernanceStake") // transfer from null address to minter
      .withArgs(
        jurorCandidate.address,
        ethers.utils.parseEther("10"),
        ethers.utils.parseEther("300")
      );
    /// get juror lock amount from UDAOStaker contract
    const jurorLockAmount = await contractUDAOStaker.jurorLockAmount();
    /// apply the "juror role" with jurorCandidate account
    await expect(contractUDAOStaker.connect(jurorCandidate).applyForJuror())
      .to.emit(contractUDAOStaker, "RoleApplied") // transfer from null address to minter
      .withArgs(1, jurorCandidate.address, jurorLockAmount);
    /// get lazy role and role voucher
    const lazyRole = new LazyRole({
      contract: contractUDAOStaker,
      signer: backend,
    });
    const role_voucher = await lazyRole.createVoucher(
      jurorCandidate.address,
      Date.now() + 999999999,
      1
    );
    /// approve the "juror role" with jurorCandidate account
    await expect(
      contractUDAOStaker.connect(jurorCandidate).getApproved(role_voucher)
    )
      .to.emit(contractUDAOStaker, "RoleApproved") // transfer from null address to minter
      .withArgs(1, jurorCandidate.address);

    await helpers.time.increase(259200200);
    //Ban the juror
    await contractRoleManager.setBan(jurorCandidate.address, true);
    await expect(
      contractUDAOStaker.connect(jurorCandidate).withdrawJurorStake()
    )
      .to.emit(contractUDAOStaker, "JurorStakeWithdrawn")
      .withArgs(jurorCandidate.address, jurorLockAmount);
  });

  it("Should withdraw juror stake when rejected", async function () {
    await reDeploy();
    /// set KYC for jurorCandidate
    await contractRoleManager.setKYC(jurorCandidate.address, true);
    /// transfer UDAO to jurorCandidate
    await contractUDAO.transfer(
      jurorCandidate.address,
      ethers.utils.parseEther("10000.0")
    );
    /// approve UDAOStaker contract with jurorCandidate to spend UDAO
    await contractUDAO
      .connect(jurorCandidate)
      .approve(
        contractUDAOStaker.address,
        ethers.utils.parseEther("999999999999.0")
      );
    /// any account must stake for governance to be Validator-Juror-GovernanceMember
    await expect(
      contractUDAOStaker
        .connect(jurorCandidate)
        .stakeForGovernance(ethers.utils.parseEther("10"), 30)
    )
      .to.emit(contractUDAOStaker, "GovernanceStake") // transfer from null address to minter
      .withArgs(
        jurorCandidate.address,
        ethers.utils.parseEther("10"),
        ethers.utils.parseEther("300")
      );
    /// get juror lock amount from UDAOStaker contract
    const jurorLockAmount = await contractUDAOStaker.jurorLockAmount();
    /// apply the "juror role" with jurorCandidate account
    await expect(contractUDAOStaker.connect(jurorCandidate).applyForJuror())
      .to.emit(contractUDAOStaker, "RoleApplied") // transfer from null address to minter
      .withArgs(1, jurorCandidate.address, jurorLockAmount);
    await expect(
      contractUDAOStaker
        .connect(backend)
        .rejectApplication(jurorCandidate.address, 1)
    )
      .to.emit(contractUDAOStaker, "RoleRejected")
      .withArgs(1, jurorCandidate.address); // transfer from null address to minter

    await expect(
      contractUDAOStaker.connect(jurorCandidate).withdrawJurorStake()
    )
      .to.emit(contractUDAOStaker, "JurorStakeWithdrawn")
      .withArgs(jurorCandidate.address, jurorLockAmount);
  });

  it("Should withdraw juror stake when rejected and banned", async function () {
    await reDeploy();
    /// set KYC for jurorCandidate
    await contractRoleManager.setKYC(jurorCandidate.address, true);
    /// transfer UDAO to jurorCandidate
    await contractUDAO.transfer(
      jurorCandidate.address,
      ethers.utils.parseEther("10000.0")
    );
    /// approve UDAOStaker contract with jurorCandidate to spend UDAO
    await contractUDAO
      .connect(jurorCandidate)
      .approve(
        contractUDAOStaker.address,
        ethers.utils.parseEther("999999999999.0")
      );
    /// any account must stake for governance to be Validator-Juror-GovernanceMember
    await expect(
      contractUDAOStaker
        .connect(jurorCandidate)
        .stakeForGovernance(ethers.utils.parseEther("10"), 30)
    )
      .to.emit(contractUDAOStaker, "GovernanceStake") // transfer from null address to minter
      .withArgs(
        jurorCandidate.address,
        ethers.utils.parseEther("10"),
        ethers.utils.parseEther("300")
      );
    /// get juror lock amount from UDAOStaker contract
    const jurorLockAmount = await contractUDAOStaker.jurorLockAmount();
    /// apply the "juror role" with jurorCandidate account
    await expect(contractUDAOStaker.connect(jurorCandidate).applyForJuror())
      .to.emit(contractUDAOStaker, "RoleApplied") // transfer from null address to minter
      .withArgs(1, jurorCandidate.address, jurorLockAmount);
    await expect(
      contractUDAOStaker
        .connect(backend)
        .rejectApplication(jurorCandidate.address, 1)
    )
      .to.emit(contractUDAOStaker, "RoleRejected")
      .withArgs(1, jurorCandidate.address); // transfer from null address to minter
    //Ban the juror
    await contractRoleManager.setBan(jurorCandidate.address, true);
    await expect(
      contractUDAOStaker.connect(jurorCandidate).withdrawJurorStake()
    )
      .to.emit(contractUDAOStaker, "JurorStakeWithdrawn")
      .withArgs(jurorCandidate.address, jurorLockAmount);
  });

  it("Should return withdrawable validator stake when approved", async function () {
    await reDeploy();
    /// set KYC for validatorCandidate
    await contractRoleManager.setKYC(validatorCandidate.address, true);
    /// transfer UDAO to validatorCandidate
    await contractUDAO.transfer(
      validatorCandidate.address,
      ethers.utils.parseEther("10000.0")
    );
    /// approve UDAOStaker contract with validatorCandidate to spend UDAO
    await contractUDAO
      .connect(validatorCandidate)
      .approve(
        contractUDAOStaker.address,
        ethers.utils.parseEther("999999999999.0")
      );
    /// any account must stake for governance to be Validator-Juror-GovernanceMember
    await expect(
      contractUDAOStaker
        .connect(validatorCandidate)
        .stakeForGovernance(ethers.utils.parseEther("10"), 30)
    )
      .to.emit(contractUDAOStaker, "GovernanceStake") // transfer from null address to minter
      .withArgs(
        validatorCandidate.address,
        ethers.utils.parseEther("10"),
        ethers.utils.parseEther("300")
      );
    /// get validator lock amount from UDAOStaker contract
    const validatorLockAmount = await contractUDAOStaker.validatorLockAmount();
    /// apply the "validator role" with validatorCandidate account
    await expect(
      contractUDAOStaker.connect(validatorCandidate).applyForValidator()
    )
      .to.emit(contractUDAOStaker, "RoleApplied") // transfer from null address to minter
      .withArgs(0, validatorCandidate.address, validatorLockAmount);
    /// get lazy role and role voucher
    const lazyRole = new LazyRole({
      contract: contractUDAOStaker,
      signer: backend,
    });
    const role_voucher = await lazyRole.createVoucher(
      validatorCandidate.address,
      Date.now() + 999999999,
      0
    );
    /// approve the "validator role" with validatorCandidate account
    await expect(
      contractUDAOStaker.connect(validatorCandidate).getApproved(role_voucher)
    )
      .to.emit(contractUDAOStaker, "RoleApproved") // transfer from null address to minter
      .withArgs(0, validatorCandidate.address);

    await helpers.time.increase(259200200);
    expect(
      await contractUDAOStaker
        .connect(validatorCandidate)
        .withdrawableValidatorStake()
    ).to.equal(validatorLockAmount);
  });

  it("Should return withdrawable validator stake when rejected", async function () {
    await reDeploy();
    /// set KYC for validatorCandidate
    await contractRoleManager.setKYC(validatorCandidate.address, true);
    /// transfer UDAO to validatorCandidate
    await contractUDAO.transfer(
      validatorCandidate.address,
      ethers.utils.parseEther("10000.0")
    );
    /// approve UDAOStaker contract with validatorCandidate to spend UDAO
    await contractUDAO
      .connect(validatorCandidate)
      .approve(
        contractUDAOStaker.address,
        ethers.utils.parseEther("999999999999.0")
      );
    /// any account must stake for governance to be Validator-Juror-GovernanceMember
    await expect(
      contractUDAOStaker
        .connect(validatorCandidate)
        .stakeForGovernance(ethers.utils.parseEther("10"), 30)
    )
      .to.emit(contractUDAOStaker, "GovernanceStake") // transfer from null address to minter
      .withArgs(
        validatorCandidate.address,
        ethers.utils.parseEther("10"),
        ethers.utils.parseEther("300")
      );
    /// get validator lock amount from UDAOStaker contract
    const validatorLockAmount = await contractUDAOStaker.validatorLockAmount();
    /// apply the "validator role" with validatorCandidate account
    await expect(
      contractUDAOStaker.connect(validatorCandidate).applyForValidator()
    )
      .to.emit(contractUDAOStaker, "RoleApplied") // transfer from null address to minter
      .withArgs(0, validatorCandidate.address, validatorLockAmount);
    await expect(
      contractUDAOStaker
        .connect(backend)
        .rejectApplication(validatorCandidate.address, 0)
    )
      .to.emit(contractUDAOStaker, "RoleRejected")
      .withArgs(0, validatorCandidate.address); // transfer from null address to minter
    expect(
      await contractUDAOStaker
        .connect(validatorCandidate)
        .withdrawableValidatorStake()
    ).to.equal(validatorLockAmount);
  });

  it("Should unstake to stop being a governance member (full withdraw)", async function () {
    await reDeploy();
    /// set KYC for governanceCandidate
    await contractRoleManager.setKYC(governanceCandidate.address, true);
    /// transfer UDAO to governanceCandidate
    await contractUDAO.transfer(
      governanceCandidate.address,
      ethers.utils.parseEther("100.0")
    );
    /// approve UDAOStaker contract with governanceCandidate to spend UDAO
    await contractUDAO
      .connect(governanceCandidate)
      .approve(
        contractUDAOStaker.address,
        ethers.utils.parseEther("999999999999.0")
      );
    /// any account must stake for governance to be Validator-Juror-GovernanceMember
    await expect(
      contractUDAOStaker
        .connect(governanceCandidate)
        .stakeForGovernance(ethers.utils.parseEther("10"), 30)
    )
      .to.emit(contractUDAOStaker, "GovernanceStake") // transfer from null address to minter
      .withArgs(
        governanceCandidate.address,
        ethers.utils.parseEther("10"),
        ethers.utils.parseEther("300")
      );
    await helpers.time.increase(2592002);
    await expect(
      contractUDAOStaker
        .connect(governanceCandidate)
        .withdrawGovernanceStake(ethers.utils.parseEther("10"))
    )
      .to.emit(contractUDAOStaker, "GovernanceStakeWithdraw") // transfer from null address to minter
      .withArgs(
        governanceCandidate.address,
        ethers.utils.parseEther("10"),
        ethers.utils.parseEther("300")
      );
  });

  it("Should unstake to stop being a governance member (full withdraw) when banned", async function () {
    await reDeploy();
    /// set KYC for governanceCandidate
    await contractRoleManager.setKYC(governanceCandidate.address, true);
    /// transfer UDAO to governanceCandidate
    await contractUDAO.transfer(
      governanceCandidate.address,
      ethers.utils.parseEther("100.0")
    );
    /// approve UDAOStaker contract with governanceCandidate to spend UDAO
    await contractUDAO
      .connect(governanceCandidate)
      .approve(
        contractUDAOStaker.address,
        ethers.utils.parseEther("999999999999.0")
      );
    /// any account must stake for governance to be Validator-Juror-GovernanceMember
    await expect(
      contractUDAOStaker
        .connect(governanceCandidate)
        .stakeForGovernance(ethers.utils.parseEther("10"), 30)
    )
      .to.emit(contractUDAOStaker, "GovernanceStake") // transfer from null address to minter
      .withArgs(
        governanceCandidate.address,
        ethers.utils.parseEther("10"),
        ethers.utils.parseEther("300")
      );
    await helpers.time.increase(2592002);
    //Ban the governance member
    await contractRoleManager.setBan(governanceCandidate.address, true);
    await expect(
      contractUDAOStaker
        .connect(governanceCandidate)
        .withdrawGovernanceStake(ethers.utils.parseEther("10"))
    )
      .to.emit(contractUDAOStaker, "GovernanceStakeWithdraw") // transfer from null address to minter
      .withArgs(
        governanceCandidate.address,
        ethers.utils.parseEther("10"),
        ethers.utils.parseEther("300")
      );
  });

  it("Should unstake to stop being a governance member (partial withdraw)", async function () {
    await reDeploy();
    /// set KYC for governanceCandidate
    await contractRoleManager.setKYC(governanceCandidate.address, true);
    /// transfer UDAO to governanceCandidate
    await contractUDAO.transfer(
      governanceCandidate.address,
      ethers.utils.parseEther("100.0")
    );
    /// approve UDAOStaker contract with governanceCandidate to spend UDAO
    await contractUDAO
      .connect(governanceCandidate)
      .approve(
        contractUDAOStaker.address,
        ethers.utils.parseEther("999999999999.0")
      );
    /// any account must stake for governance to be Validator-Juror-GovernanceMember
    await expect(
      contractUDAOStaker
        .connect(governanceCandidate)
        .stakeForGovernance(ethers.utils.parseEther("10"), 30)
    )
      .to.emit(contractUDAOStaker, "GovernanceStake") // transfer from null address to minter
      .withArgs(
        governanceCandidate.address,
        ethers.utils.parseEther("10"),
        ethers.utils.parseEther("300")
      );
    await helpers.time.increase(2592002);
    await expect(
      contractUDAOStaker
        .connect(governanceCandidate)
        .withdrawGovernanceStake(ethers.utils.parseEther("5"))
    )
      .to.emit(contractUDAOStaker, "GovernanceStakeWithdraw") // transfer from null address to minter
      .withArgs(
        governanceCandidate.address,
        ethers.utils.parseEther("5"),
        ethers.utils.parseEther("150")
      );
  });

  it("Should unstake to stop being a governance member (partial withdraw) when banned", async function () {
    await reDeploy();
    /// set KYC for governanceCandidate
    await contractRoleManager.setKYC(governanceCandidate.address, true);
    /// transfer UDAO to governanceCandidate
    await contractUDAO.transfer(
      governanceCandidate.address,
      ethers.utils.parseEther("100.0")
    );
    /// approve UDAOStaker contract with governanceCandidate to spend UDAO
    await contractUDAO
      .connect(governanceCandidate)
      .approve(
        contractUDAOStaker.address,
        ethers.utils.parseEther("999999999999.0")
      );
    /// any account must stake for governance to be Validator-Juror-GovernanceMember
    await expect(
      contractUDAOStaker
        .connect(governanceCandidate)
        .stakeForGovernance(ethers.utils.parseEther("10"), 30)
    )
      .to.emit(contractUDAOStaker, "GovernanceStake") // transfer from null address to minter
      .withArgs(
        governanceCandidate.address,
        ethers.utils.parseEther("10"),
        ethers.utils.parseEther("300")
      );
    await helpers.time.increase(2592002);
    //Ban the governance member
    await contractRoleManager.setBan(governanceCandidate.address, true);
    await expect(
      contractUDAOStaker
        .connect(governanceCandidate)
        .withdrawGovernanceStake(ethers.utils.parseEther("5"))
    )
      .to.emit(contractUDAOStaker, "GovernanceStakeWithdraw") // transfer from null address to minter
      .withArgs(
        governanceCandidate.address,
        ethers.utils.parseEther("5"),
        ethers.utils.parseEther("150")
      );
  });

  it("Should withdraw rewards from voting", async function () {
    await reDeploy(reApplyRolesViaVoucher= false);
    /// transfer UDAO to contractPlatformTreasury
    await contractUDAO.transfer(
      contractPlatformTreasury.address,
      ethers.utils.parseEther("1000.0")
    );

    /// @dev Setup governance member
    await setupGovernanceMember(
      contractRoleManager,
      contractUDAO,
      contractUDAOStaker,
      governanceCandidate
    );
    await setupGovernanceMember(
      contractRoleManager,
      contractUDAO,
      contractUDAOStaker,
      superValidator
    );

    //const superValidatorBefore = await contractUDAO.balanceOf(superValidator.address);
    //console.log("superValidatorBefore", superValidatorBefore.toString());

    /// @dev Check if the governance candidate has the correct amount of UDAO-vp tokens
    const governanceCandidateBalance = await contractUDAOVp.balanceOf(
      governanceCandidate.address
    );
    //console.log("govCandidateBalance", governanceCandidateBalance.toString());
    await expect(governanceCandidateBalance).to.equal(
      ethers.utils.parseEther("300")
    );
    /// @dev delegate superValidator UDAO-vp tokens to himself
    await contractUDAOVp
      .connect(governanceCandidate)
      .delegate(governanceCandidate.address);
    /// @dev Check votes for governance candidate on latest block
    const governanceCandidateVotes = await contractUDAOVp.getVotes(
      governanceCandidate.address
    );
    await expect(governanceCandidateVotes).to.equal(
      ethers.utils.parseEther("300")
    );
    //console.log("govCandidateVotes", governanceCandidateVotes.toString());

    /// @dev Check if the superValidator has the correct amount of UDAO-vp tokens
    const superValidatorBalance = await contractUDAOVp.balanceOf(
      superValidator.address
    );
    //console.log("superValidBalance", superValidatorBalance.toString());
    await expect(superValidatorBalance).to.equal(
      ethers.utils.parseEther("300")
    );
    /// @dev delegate superValidator UDAO-vp tokens to himself
    await contractUDAOVp
      .connect(superValidator)
      .delegate(superValidator.address);
    /// @dev Check votes for superValidator on latest block
    const superValidatorVotes = await contractUDAOVp.getVotes(
      superValidator.address
    );
    await expect(superValidatorVotes).to.equal(ethers.utils.parseEther("300"));

    /// @dev Proposal settings
    const tokenAddress = contractUDAO.address;
    const token = await ethers.getContractAt("ERC20", tokenAddress);
    const teamAddress = foundation.address;
    const grantAmount = ethers.utils.parseEther("1");
    const transferCalldata = token.interface.encodeFunctionData("transfer", [
      teamAddress,
      grantAmount,
    ]);
    /// @dev Propose a new proposal
    const proposeTx = await contractUDAOGovernor
      .connect(governanceCandidate)
      .propose(
        [tokenAddress],
        [0],
        [transferCalldata],
        "Proposal #1: Give grant to team"
      );
    /// @dev Wait for the transaction to be mined
    const tx = await proposeTx.wait();
    const proposalId = tx.events.find((e) => e.event == "ProposalCreated").args
      .proposalId;

    // @dev (7 * 24 * 60 * 60) calculates the total number of seconds in 7 days.
    // @dev 2 is the number of seconds per block
    // @dev We divide the total number of seconds in 7 days by the number of seconds per block
    // @dev We then round up to the nearest whole number
    // @dev This is the number of blocks we need to mine to get to the start of the voting period
    const numBlocksToMine = Math.ceil((7 * 24 * 60 * 60) / 2);
    await hre.network.provider.send("hardhat_mine", [
      `0x${numBlocksToMine.toString(16)}`,
      "0x2",
    ]);
    /// @dev Vote on the proposal
    await contractUDAOGovernor.connect(superValidator).castVote(proposalId, 1);
    /// @dev Check if the vote was casted
    const proposalState = await contractUDAOGovernor.state(proposalId);
    await expect(proposalState).to.equal(1);
    /// @dev Caluclate the reward
    // Get the voteReward from UDAOStaker
    const voteReward = await contractUDAOStaker.voteReward();
    // Get the voting power ratio of the superValidator
    //votingPowerRatio = (udaovp.balanceOf(voter) * 10000) / totalVotingPower;
    // totalVotingPower = staked amount * days staked (10 ether * 30 days), 2 stakers
    // votingPowerRatio = (300 * 10000) / (10 * 30 * 2) = 5000
    //rewardBalanceOf[voter] += (votingPowerRatio * voteReward) / 10000;
    const totalVotingPower = (ethers.utils.parseEther("10") * 30 * 2);
    //console.log(totalVotingPower.toString());
    const vpBalanceOfSuperValidator = await contractUDAOVp.balanceOf(superValidator.address);
    //console.log(vpBalanceOfSuperValidator);
    const votingPowerRatio = (vpBalanceOfSuperValidator * 10000) / (totalVotingPower);
    //console.log(votingPowerRatio.toString());
    const reward = (votingPowerRatio * voteReward) / 10000;
    //const superValidatorAfter = await contractUDAO.balanceOf(superValidator.address);
    //console.log("superValidatorAfter", superValidatorAfter.toString());
    await expect(contractUDAOStaker.connect(superValidator).withdrawRewards())
      .to.emit(contractUDAOStaker, "VoteRewardsWithdrawn")
      .withArgs(superValidator.address, ethers.utils.parseEther(ethers.utils.formatEther(reward)));
  });

  it("Should withdraw rewards from voting when banned", async function () {
    await reDeploy(reApplyRolesViaVoucher = false);
    /// transfer UDAO to contractPlatformTreasury
    await contractUDAO.transfer(
      contractPlatformTreasury.address,
      ethers.utils.parseEther("1000.0")
    );

    /// @dev Setup governance member
    await setupGovernanceMember(
      contractRoleManager,
      contractUDAO,
      contractUDAOStaker,
      governanceCandidate
    );
    await setupGovernanceMember(
      contractRoleManager,
      contractUDAO,
      contractUDAOStaker,
      superValidator
    );
    /// @dev Check if the governance candidate has the correct amount of UDAO-vp tokens
    const governanceCandidateBalance = await contractUDAOVp.balanceOf(
      governanceCandidate.address
    );
    await expect(governanceCandidateBalance).to.equal(
      ethers.utils.parseEther("300")
    );
    /// @dev delegate superValidator UDAO-vp tokens to himself
    await contractUDAOVp
      .connect(governanceCandidate)
      .delegate(governanceCandidate.address);
    /// @dev Check votes for governance candidate on latest block
    const governanceCandidateVotes = await contractUDAOVp.getVotes(
      governanceCandidate.address
    );
    await expect(governanceCandidateVotes).to.equal(
      ethers.utils.parseEther("300")
    );

    /// @dev Check if the superValidator has the correct amount of UDAO-vp tokens
    const superValidatorBalance = await contractUDAOVp.balanceOf(
      superValidator.address
    );
    await expect(superValidatorBalance).to.equal(
      ethers.utils.parseEther("300")
    );
    /// @dev delegate superValidator UDAO-vp tokens to himself
    await contractUDAOVp
      .connect(superValidator)
      .delegate(superValidator.address);
    /// @dev Check votes for superValidator on latest block
    const superValidatorVotes = await contractUDAOVp.getVotes(
      superValidator.address
    );
    await expect(superValidatorVotes).to.equal(ethers.utils.parseEther("300"));

    /// @dev Proposal settings
    const tokenAddress = contractUDAO.address;
    const token = await ethers.getContractAt("ERC20", tokenAddress);
    const teamAddress = foundation.address;
    const grantAmount = ethers.utils.parseEther("1");
    const transferCalldata = token.interface.encodeFunctionData("transfer", [
      teamAddress,
      grantAmount,
    ]);
    /// @dev Propose a new proposal
    const proposeTx = await contractUDAOGovernor
      .connect(governanceCandidate)
      .propose(
        [tokenAddress],
        [0],
        [transferCalldata],
        "Proposal #1: Give grant to team"
      );
    /// @dev Wait for the transaction to be mined
    const tx = await proposeTx.wait();
    const proposalId = tx.events.find((e) => e.event == "ProposalCreated").args
      .proposalId;

    // @dev (7 * 24 * 60 * 60) calculates the total number of seconds in 7 days.
    // @dev 2 is the number of seconds per block
    // @dev We divide the total number of seconds in 7 days by the number of seconds per block
    // @dev We then round up to the nearest whole number
    // @dev This is the number of blocks we need to mine to get to the start of the voting period
    const numBlocksToMine = Math.ceil((7 * 24 * 60 * 60) / 2);
    await hre.network.provider.send("hardhat_mine", [
      `0x${numBlocksToMine.toString(16)}`,
      "0x2",
    ]);
    /// @dev Vote on the proposal
    await contractUDAOGovernor.connect(superValidator).castVote(proposalId, 1);
    /// @dev Check if the vote was casted
    const proposalState = await contractUDAOGovernor.state(proposalId);
    await expect(proposalState).to.equal(1);

    //Ban the governance member
    await contractRoleManager.setBan(superValidator.address, true);
    /// @dev Caluclate the reward
    // Get the voteReward from UDAOStaker
    const voteReward = await contractUDAOStaker.voteReward();
    // Get the voting power ratio of the superValidator
    //votingPowerRatio = (udaovp.balanceOf(voter) * 10000) / totalVotingPower;
    // totalVotingPower = staked amount * days staked (10 ether * 30 days), 2 stakers
    // votingPowerRatio = (300 * 10000) / (10 * 30 * 2) = 5000
    //rewardBalanceOf[voter] += (votingPowerRatio * voteReward) / 10000;
    const totalVotingPower = (ethers.utils.parseEther("10") * 30 * 2);
    //console.log(totalVotingPower.toString());
    const vpBalanceOfSuperValidator = await contractUDAOVp.balanceOf(superValidator.address);
    //console.log(vpBalanceOfSuperValidator);
    const votingPowerRatio = (vpBalanceOfSuperValidator * 10000) / (totalVotingPower);
    //console.log(votingPowerRatio.toString());
    const reward = (votingPowerRatio * voteReward) / 10000;
    await expect(contractUDAOStaker.connect(superValidator).withdrawRewards())
      .to.emit(contractUDAOStaker, "VoteRewardsWithdrawn")
      .withArgs(superValidator.address, ethers.utils.parseEther(ethers.utils.formatEther(reward)));
  });

  it("Should fail to unstake to stop being a governance member when amount is higher than staked", async function () {
    await reDeploy();
    /// set KYC for governanceCandidate
    await contractRoleManager.setKYC(governanceCandidate.address, true);
    /// transfer UDAO to governanceCandidate
    await contractUDAO.transfer(
      governanceCandidate.address,
      ethers.utils.parseEther("100.0")
    );
    /// approve UDAOStaker contract with governanceCandidate to spend UDAO
    await contractUDAO
      .connect(governanceCandidate)
      .approve(
        contractUDAOStaker.address,
        ethers.utils.parseEther("999999999999.0")
      );
    /// any account must stake for governance to be Validator-Juror-GovernanceMember
    await expect(
      contractUDAOStaker
        .connect(governanceCandidate)
        .stakeForGovernance(ethers.utils.parseEther("10"), 30)
    )
      .to.emit(contractUDAOStaker, "GovernanceStake") // transfer from null address to minter
      .withArgs(
        governanceCandidate.address,
        ethers.utils.parseEther("10"),
        ethers.utils.parseEther("300")
      );
    await helpers.time.increase(2592002);
    await expect(
      contractUDAOStaker
        .connect(governanceCandidate)
        .withdrawGovernanceStake(ethers.utils.parseEther("15"))
    ).to.revertedWith("You don't have enough withdrawable balance");
  });

  it("Should approve for corporation account", async function () {
    await reDeploy();
    /// set KYC for corporation
    await contractRoleManager.setKYC(corporation.address, true);
    /// transfer UDAO to corporation
    await contractUDAO.transfer(
      corporation.address,
      ethers.utils.parseEther("10000.0")
    );
    /// approve UDAOStaker contract with jurorCandidate to spend UDAO
    await contractUDAO
      .connect(jurorCandidate)
      .approve(corporation.address, ethers.utils.parseEther("999999999999.0"));
    /// get lazy role and role voucher
    const lazyRole = new LazyRole({
      contract: contractUDAOStaker,
      signer: backend,
    });
    const role_voucher = await lazyRole.createVoucher(
      corporation.address,
      Date.now() + 999999999,
      2
    );
    /// approve the "corporation role" with corporation account
    await expect(
      contractUDAOStaker.connect(corporation).getApproved(role_voucher)
    )
      .to.emit(contractUDAOStaker, "RoleApproved") // transfer from null address to minter
      .withArgs(2, corporation.address);
  });

  it("Should register job listing", async function () {
    await reDeploy();
    /// set KYC for corporation
    await contractRoleManager.setKYC(corporation.address, true);
    /// transfer UDAO to corporation
    await contractUDAO.transfer(
      corporation.address,
      ethers.utils.parseEther("10000.0")
    );
    /// approve UDAOStaker contract with corporation to spend UDAO
    await contractUDAO
      .connect(corporation)
      .approve(
        contractUDAOStaker.address,
        ethers.utils.parseEther("999999999999.0")
      );
    /// get lazy role and role voucher
    const lazyRole = new LazyRole({
      contract: contractUDAOStaker,
      signer: backend,
    });
    const role_voucher = await lazyRole.createVoucher(
      corporation.address,
      Date.now() + 999999999,
      2
    );
    /// approve the "corporation role" with corporation account
    await expect(
      contractUDAOStaker.connect(corporation).getApproved(role_voucher)
    )
      .to.emit(contractUDAOStaker, "RoleApproved") // transfer from null address to minter
      .withArgs(2, corporation.address);
    await expect(contractUDAOStaker.connect(corporation).registerJobListing(5))
      .to.emit(contractUDAOStaker, "JobListingRegistered")
      .withArgs(
        corporation.address,
        ethers.utils.parseEther((5 * 500).toString())
      );
  });

  it("Should fail to register job listing if sender is not kyced", async function () {
    await reDeploy();
    /// set KYC for corporation
    await contractRoleManager.setKYC(corporation.address, true);
    /// transfer UDAO to corporation
    await contractUDAO.transfer(
      corporation.address,
      ethers.utils.parseEther("10000.0")
    );
    /// approve UDAOStaker contract with corporation to spend UDAO
    await contractUDAO
      .connect(corporation)
      .approve(
        contractUDAOStaker.address,
        ethers.utils.parseEther("999999999999.0")
      );
    /// get lazy role and role voucher
    const lazyRole = new LazyRole({
      contract: contractUDAOStaker,
      signer: backend,
    });
    const role_voucher = await lazyRole.createVoucher(
      corporation.address,
      Date.now() + 999999999,
      2
    );
    /// approve the "corporation role" with corporation account
    await expect(
      contractUDAOStaker.connect(corporation).getApproved(role_voucher)
    )
      .to.emit(contractUDAOStaker, "RoleApproved") // transfer from null address to minter
      .withArgs(2, corporation.address);
    /// remove KYC for corporation
    await contractRoleManager.setKYC(corporation.address, false);
    await expect(
      contractUDAOStaker.connect(corporation).registerJobListing(5)
    ).to.revertedWith("You are not KYCed");
  });

  it("Should fail to register job listing if sender is banned", async function () {
    await reDeploy();
    /// set KYC for corporation
    await contractRoleManager.setKYC(corporation.address, true);
    /// transfer UDAO to corporation
    await contractUDAO.transfer(
      corporation.address,
      ethers.utils.parseEther("10000.0")
    );
    /// approve UDAOStaker contract with corporation to spend UDAO
    await contractUDAO
      .connect(corporation)
      .approve(
        contractUDAOStaker.address,
        ethers.utils.parseEther("999999999999.0")
      );
    /// get lazy role and role voucher
    const lazyRole = new LazyRole({
      contract: contractUDAOStaker,
      signer: backend,
    });
    const role_voucher = await lazyRole.createVoucher(
      corporation.address,
      Date.now() + 999999999,
      2
    );
    /// approve the "corporation role" with corporation account
    await expect(
      contractUDAOStaker.connect(corporation).getApproved(role_voucher)
    )
      .to.emit(contractUDAOStaker, "RoleApproved") // transfer from null address to minter
      .withArgs(2, corporation.address);

    await contractRoleManager.setBan(corporation.address, true);
    await expect(
      contractUDAOStaker.connect(corporation).registerJobListing(5)
    ).to.revertedWith("You were banned");
  });

  it("Should fail to register job listing if sender doesn't have corporate role", async function () {
    await reDeploy();
    /// set KYC for jurorMember
    await contractRoleManager.setKYC(jurorMember.address, true);
    const CORPORATE_ROLE = ethers.utils.keccak256(
      ethers.utils.toUtf8Bytes("CORPORATE_ROLE")
    );
    await expect(
      contractUDAOStaker.connect(jurorMember).registerJobListing(5)
    ).to.revertedWith(
      `'AccessControl: account ${jurorMember.address.toLowerCase()} is missing role ${CORPORATE_ROLE}'`
    );
  });

  it("Should fail to register job listing if zero amount is sent", async function () {
    await reDeploy();
    /// set KYC for corporation
    await contractRoleManager.setKYC(corporation.address, true);
    /// transfer UDAO to corporation
    await contractUDAO.transfer(
      corporation.address,
      ethers.utils.parseEther("10000.0")
    );
    /// approve UDAOStaker contract with corporation to spend UDAO
    await contractUDAO
      .connect(corporation)
      .approve(
        contractUDAOStaker.address,
        ethers.utils.parseEther("999999999999.0")
      );
    /// get lazy role and role voucher
    const lazyRole = new LazyRole({
      contract: contractUDAOStaker,
      signer: backend,
    });
    const role_voucher = await lazyRole.createVoucher(
      corporation.address,
      Date.now() + 999999999,
      2
    );
    /// approve the "corporation role" with corporation account
    await expect(
      contractUDAOStaker.connect(corporation).getApproved(role_voucher)
    )
      .to.emit(contractUDAOStaker, "RoleApproved") // transfer from null address to minter
      .withArgs(2, corporation.address);
    await expect(
      contractUDAOStaker.connect(corporation).registerJobListing(0)
    ).to.revertedWith("Zero job listing count is not allowed");
  });

  it("Should unregister job listing (single)", async function () {
    await reDeploy();
    /// set KYC for corporation
    await contractRoleManager.setKYC(corporation.address, true);
    /// transfer UDAO to corporation
    await contractUDAO.transfer(
      corporation.address,
      ethers.utils.parseEther("10000.0")
    );
    /// approve UDAOStaker contract with corporation to spend UDAO
    await contractUDAO
      .connect(corporation)
      .approve(
        contractUDAOStaker.address,
        ethers.utils.parseEther("999999999999.0")
      );
    /// get lazy role and role voucher
    const lazyRole = new LazyRole({
      contract: contractUDAOStaker,
      signer: backend,
    });
    const role_voucher = await lazyRole.createVoucher(
      corporation.address,
      Date.now() + 999999999,
      2
    );
    /// approve the "corporation role" with corporation account
    await expect(
      contractUDAOStaker.connect(corporation).getApproved(role_voucher)
    )
      .to.emit(contractUDAOStaker, "RoleApproved") // transfer from null address to minter
      .withArgs(2, corporation.address);
    await expect(contractUDAOStaker.connect(corporation).registerJobListing(5))
      .to.emit(contractUDAOStaker, "JobListingRegistered")
      .withArgs(
        corporation.address,
        ethers.utils.parseEther((5 * 500).toString())
      );
    await expect(
      contractUDAOStaker.connect(corporation).unregisterJobListing([0])
    )
      .to.emit(contractUDAOStaker, "JobListingUnregistered")
      .withArgs(corporation.address, [0], ethers.utils.parseEther("500"));
  });

  it("Should fail to unregister job listing if sender doesn't have corporate role", async function () {
    await reDeploy();
    /// set KYC for jurorMember
    await contractRoleManager.setKYC(jurorMember.address, true);
    const CORPORATE_ROLE = ethers.utils.keccak256(
      ethers.utils.toUtf8Bytes("CORPORATE_ROLE")
    );
    await expect(
      contractUDAOStaker.connect(jurorMember).unregisterJobListing([0])
    ).to.revertedWith(
      `'AccessControl: account ${jurorMember.address.toLowerCase()} is missing role ${CORPORATE_ROLE}'`
    );
  });

  it("Should fail to unregister job listing if there is nothing to unstake", async function () {
    await reDeploy();
    /// set KYC for corporation
    await contractRoleManager.setKYC(corporation.address, true);
    /// transfer UDAO to corporation
    await contractUDAO.transfer(
      corporation.address,
      ethers.utils.parseEther("10000.0")
    );
    /// approve UDAOStaker contract with corporation to spend UDAO
    await contractUDAO
      .connect(corporation)
      .approve(
        contractUDAOStaker.address,
        ethers.utils.parseEther("999999999999.0")
      );
    /// get lazy role and role voucher
    const lazyRole = new LazyRole({
      contract: contractUDAOStaker,
      signer: backend,
    });
    const role_voucher = await lazyRole.createVoucher(
      corporation.address,
      Date.now() + 999999999,
      2
    );
    /// approve the "corporation role" with corporation account
    await expect(
      contractUDAOStaker.connect(corporation).getApproved(role_voucher)
    )
      .to.emit(contractUDAOStaker, "RoleApproved") // transfer from null address to minter
      .withArgs(2, corporation.address);
    await expect(contractUDAOStaker.connect(corporation).registerJobListing(5))
      .to.emit(contractUDAOStaker, "JobListingRegistered")
      .withArgs(
        corporation.address,
        ethers.utils.parseEther((5 * 500).toString())
      );
    await expect(
      contractUDAOStaker.connect(corporation).unregisterJobListing([0])
    )
      .to.emit(contractUDAOStaker, "JobListingUnregistered")
      .withArgs(corporation.address, [0], ethers.utils.parseEther("500"));
    await expect(
      contractUDAOStaker.connect(corporation).unregisterJobListing([0])
    ).to.revertedWith("Cannot unstake zero tokens");
  });

  it("Should unregister job listing (multiple)", async function () {
    await reDeploy();
    /// set KYC for corporation
    await contractRoleManager.setKYC(corporation.address, true);
    /// transfer UDAO to corporation
    await contractUDAO.transfer(
      corporation.address,
      ethers.utils.parseEther("10000.0")
    );
    /// approve UDAOStaker contract with corporation to spend UDAO
    await contractUDAO
      .connect(corporation)
      .approve(
        contractUDAOStaker.address,
        ethers.utils.parseEther("999999999999.0")
      );
    /// get lazy role and role voucher
    const lazyRole = new LazyRole({
      contract: contractUDAOStaker,
      signer: backend,
    });
    const role_voucher = await lazyRole.createVoucher(
      corporation.address,
      Date.now() + 999999999,
      2
    );
    /// approve the "corporation role" with corporation account
    await expect(
      contractUDAOStaker.connect(corporation).getApproved(role_voucher)
    )
      .to.emit(contractUDAOStaker, "RoleApproved") // transfer from null address to minter
      .withArgs(2, corporation.address);
    await expect(contractUDAOStaker.connect(corporation).registerJobListing(5))
      .to.emit(contractUDAOStaker, "JobListingRegistered")
      .withArgs(
        corporation.address,
        ethers.utils.parseEther((5 * 500).toString())
      );
    await expect(
      contractUDAOStaker
        .connect(corporation)
        .unregisterJobListing([0, 1, 2, 3, 4])
    )
      .to.emit(contractUDAOStaker, "JobListingUnregistered")
      .withArgs(
        corporation.address,
        [0, 1, 2, 3, 4],
        ethers.utils.parseEther("2500")
      );
  });

  it("Should fail to apply for validator when the user hasn't kyced", async function () {
    await reDeploy();
    /// set KYC for validatorCandidate
    await contractRoleManager.setKYC(validatorCandidate.address, true);
    /// transfer UDAO to validatorCandidate
    await contractUDAO.transfer(
      validatorCandidate.address,
      ethers.utils.parseEther("10000.0")
    );
    /// approve UDAOStaker contract with validatorCandidate to spend UDAO
    await contractUDAO
      .connect(validatorCandidate)
      .approve(
        contractUDAOStaker.address,
        ethers.utils.parseEther("999999999999.0")
      );
    /// any account must stake for governance to be Validator-Juror-GovernanceMember
    await expect(
      contractUDAOStaker
        .connect(validatorCandidate)
        .stakeForGovernance(ethers.utils.parseEther("10"), 30)
    )
      .to.emit(contractUDAOStaker, "GovernanceStake") // transfer from null address to minter
      .withArgs(
        validatorCandidate.address,
        ethers.utils.parseEther("10"),
        ethers.utils.parseEther("300")
      );
    /// remove KYC for validatorCandidate
    await contractRoleManager.setKYC(validatorCandidate.address, false);
    /// apply the "validator role" with validatorCandidate account
    await expect(
      contractUDAOStaker.connect(validatorCandidate).applyForValidator()
    ).to.revertedWith("You are not KYCed");
  });

  it("Should fail to apply for validator if the user banned", async function () {
    await reDeploy();
    /// set KYC for validatorCandidate
    await contractRoleManager.setKYC(validatorCandidate.address, true);
    /// transfer UDAO to validatorCandidate
    await contractUDAO.transfer(
      validatorCandidate.address,
      ethers.utils.parseEther("10000.0")
    );
    /// approve UDAOStaker contract with validatorCandidate to spend UDAO
    await contractUDAO
      .connect(validatorCandidate)
      .approve(
        contractUDAOStaker.address,
        ethers.utils.parseEther("999999999999.0")
      );
    /// any account must stake for governance to be Validator-Juror-GovernanceMember
    await expect(
      contractUDAOStaker
        .connect(validatorCandidate)
        .stakeForGovernance(ethers.utils.parseEther("10"), 30)
    )
      .to.emit(contractUDAOStaker, "GovernanceStake") // transfer from null address to minter
      .withArgs(
        validatorCandidate.address,
        ethers.utils.parseEther("10"),
        ethers.utils.parseEther("300")
      );

    await contractRoleManager.setBan(validatorCandidate.address, true);
    /// apply the "validator role" with validatorCandidate account
    await expect(
      contractUDAOStaker.connect(validatorCandidate).applyForValidator()
    ).to.revertedWith("You were banned");
  });

  it("Should fail to apply for juror when juror hasn't kyced", async function () {
    await reDeploy();
    /// set KYC for jurorCandidate
    await contractRoleManager.setKYC(jurorCandidate.address, true);
    /// transfer UDAO to jurorCandidate
    await contractUDAO.transfer(
      jurorCandidate.address,
      ethers.utils.parseEther("10000.0")
    );
    /// approve UDAOStaker contract with jurorCandidate to spend UDAO
    await contractUDAO
      .connect(jurorCandidate)
      .approve(
        contractUDAOStaker.address,
        ethers.utils.parseEther("999999999999.0")
      );
    /// any account must stake for governance to be Validator-Juror-GovernanceMember
    await expect(
      contractUDAOStaker
        .connect(jurorCandidate)
        .stakeForGovernance(ethers.utils.parseEther("10"), 30)
    )
      .to.emit(contractUDAOStaker, "GovernanceStake") // transfer from null address to minter
      .withArgs(
        jurorCandidate.address,
        ethers.utils.parseEther("10"),
        ethers.utils.parseEther("300")
      );
    /// remove KYC for jurorCandidate
    await contractRoleManager.setKYC(jurorCandidate.address, false);
    /// apply the "juror role" with jurorCandidate account
    await expect(
      contractUDAOStaker.connect(jurorCandidate).applyForJuror()
    ).to.revertedWith("You are not KYCed");
  });

  it("Should fail to apply for juror when juror banned", async function () {
    await reDeploy();
    /// set KYC for jurorCandidate
    await contractRoleManager.setKYC(jurorCandidate.address, true);
    /// transfer UDAO to jurorCandidate
    await contractUDAO.transfer(
      jurorCandidate.address,
      ethers.utils.parseEther("10000.0")
    );
    /// approve UDAOStaker contract with jurorCandidate to spend UDAO
    await contractUDAO
      .connect(jurorCandidate)
      .approve(
        contractUDAOStaker.address,
        ethers.utils.parseEther("999999999999.0")
      );
    /// any account must stake for governance to be Validator-Juror-GovernanceMember
    await expect(
      contractUDAOStaker
        .connect(jurorCandidate)
        .stakeForGovernance(ethers.utils.parseEther("10"), 30)
    )
      .to.emit(contractUDAOStaker, "GovernanceStake") // transfer from null address to minter
      .withArgs(
        jurorCandidate.address,
        ethers.utils.parseEther("10"),
        ethers.utils.parseEther("300")
      );

    await contractRoleManager.setBan(jurorCandidate.address, true);
    /// apply the "juror role" with jurorCandidate account
    await expect(
      contractUDAOStaker.connect(jurorCandidate).applyForJuror()
    ).to.revertedWith("You were banned");
  });

  it("Should fail to approve for validator when validator hasn't kyced", async function () {
    await reDeploy();
    /// set KYC for validatorCandidate
    await contractRoleManager.setKYC(validatorCandidate.address, true);
    /// transfer UDAO to validatorCandidate
    await contractUDAO.transfer(
      validatorCandidate.address,
      ethers.utils.parseEther("10000.0")
    );
    /// approve UDAOStaker contract with validatorCandidate to spend UDAO
    await contractUDAO
      .connect(validatorCandidate)
      .approve(
        contractUDAOStaker.address,
        ethers.utils.parseEther("999999999999.0")
      );
    /// any account must stake for governance to be Validator-Juror-GovernanceMember
    await expect(
      contractUDAOStaker
        .connect(validatorCandidate)
        .stakeForGovernance(ethers.utils.parseEther("10"), 30)
    )
      .to.emit(contractUDAOStaker, "GovernanceStake") // transfer from null address to minter
      .withArgs(
        validatorCandidate.address,
        ethers.utils.parseEther("10"),
        ethers.utils.parseEther("300")
      );
    /// get validator lock amount from UDAOStaker contract
    const validatorLockAmount = await contractUDAOStaker.validatorLockAmount();
    /// apply the "validator role" with validatorCandidate account
    await expect(
      contractUDAOStaker.connect(validatorCandidate).applyForValidator()
    )
      .to.emit(contractUDAOStaker, "RoleApplied") // transfer from null address to minter
      .withArgs(0, validatorCandidate.address, validatorLockAmount);
    /// get lazy role and role voucher
    const lazyRole = new LazyRole({
      contract: contractUDAOStaker,
      signer: backend,
    });

    const role_voucher = await lazyRole.createVoucher(
      validatorCandidate.address,
      Date.now() + 999999999,
      0
    );
    /// remove KYC for validatorCandidate
    await contractRoleManager.setKYC(validatorCandidate.address, false);
    /// approve the "validator role" with validatorCandidate account
    await expect(
      contractUDAOStaker.connect(validatorCandidate).getApproved(role_voucher)
    ).to.revertedWith("You are not KYCed");
  });

  it("Should fail to approve for validator when validator banned", async function () {
    await reDeploy();
    /// set KYC for validatorCandidate
    await contractRoleManager.setKYC(validatorCandidate.address, true);
    /// transfer UDAO to validatorCandidate
    await contractUDAO.transfer(
      validatorCandidate.address,
      ethers.utils.parseEther("10000.0")
    );
    /// approve UDAOStaker contract with validatorCandidate to spend UDAO
    await contractUDAO
      .connect(validatorCandidate)
      .approve(
        contractUDAOStaker.address,
        ethers.utils.parseEther("999999999999.0")
      );
    /// any account must stake for governance to be Validator-Juror-GovernanceMember
    await expect(
      contractUDAOStaker
        .connect(validatorCandidate)
        .stakeForGovernance(ethers.utils.parseEther("10"), 30)
    )
      .to.emit(contractUDAOStaker, "GovernanceStake") // transfer from null address to minter
      .withArgs(
        validatorCandidate.address,
        ethers.utils.parseEther("10"),
        ethers.utils.parseEther("300")
      );
    /// get validator lock amount from UDAOStaker contract
    const validatorLockAmount = await contractUDAOStaker.validatorLockAmount();
    /// apply the "validator role" with validatorCandidate account
    await expect(
      contractUDAOStaker.connect(validatorCandidate).applyForValidator()
    )
      .to.emit(contractUDAOStaker, "RoleApplied") // transfer from null address to minter
      .withArgs(0, validatorCandidate.address, validatorLockAmount);
    /// get lazy role and role voucher
    const lazyRole = new LazyRole({
      contract: contractUDAOStaker,
      signer: backend,
    });

    const role_voucher = await lazyRole.createVoucher(
      validatorCandidate.address,
      Date.now() + 999999999,
      0
    );

    await contractRoleManager.setBan(validatorCandidate.address, true);
    /// approve the "validator role" with validatorCandidate account
    await expect(
      contractUDAOStaker.connect(validatorCandidate).getApproved(role_voucher)
    ).to.revertedWith("You were banned");
  });

  it("Should fail to register job listing when user hasn't kyced", async function () {
    await reDeploy();
    /// set KYC for corporation
    await contractRoleManager.setKYC(corporation.address, true);
    /// transfer UDAO to corporation
    await contractUDAO.transfer(
      corporation.address,
      ethers.utils.parseEther("10000.0")
    );
    /// approve UDAOStaker contract with corporation to spend UDAO
    await contractUDAO
      .connect(corporation)
      .approve(
        contractUDAOStaker.address,
        ethers.utils.parseEther("999999999999.0")
      );
    /// get lazy role and role voucher
    const lazyRole = new LazyRole({
      contract: contractUDAOStaker,
      signer: backend,
    });

    const role_voucher = await lazyRole.createVoucher(
      corporation.address,
      Date.now() + 999999999,
      2
    );
    /// approve the "corporation role" with corporation account
    await expect(
      contractUDAOStaker.connect(corporation).getApproved(role_voucher)
    )
      .to.emit(contractUDAOStaker, "RoleApproved") // transfer from null address to minter
      .withArgs(2, corporation.address);
    ///remove KYC for corporation
    await contractRoleManager.setKYC(corporation.address, false);

    await expect(
      contractUDAOStaker.connect(corporation).registerJobListing(5)
    ).to.revertedWith("You are not KYCed");
  });

  it("Should fail to register job listing when user banned", async function () {
    await reDeploy();
    /// set KYC for corporation
    await contractRoleManager.setKYC(corporation.address, true);
    /// transfer UDAO to corporation
    await contractUDAO.transfer(
      corporation.address,
      ethers.utils.parseEther("10000.0")
    );
    /// approve UDAOStaker contract with corporation to spend UDAO
    await contractUDAO
      .connect(corporation)
      .approve(
        contractUDAOStaker.address,
        ethers.utils.parseEther("999999999999.0")
      );
    /// get lazy role and role voucher
    const lazyRole = new LazyRole({
      contract: contractUDAOStaker,
      signer: backend,
    });

    const role_voucher = await lazyRole.createVoucher(
      corporation.address,
      Date.now() + 999999999,
      2
    );
    /// approve the "corporation role" with corporation account
    await expect(
      contractUDAOStaker.connect(corporation).getApproved(role_voucher)
    )
      .to.emit(contractUDAOStaker, "RoleApproved") // transfer from null address to minter
      .withArgs(2, corporation.address);

    await contractRoleManager.setBan(corporation.address, true);

    await expect(
      contractUDAOStaker.connect(corporation).registerJobListing(5)
    ).to.revertedWith("You were banned");
  });
});
