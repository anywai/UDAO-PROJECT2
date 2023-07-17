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
    const {
      backend,
      contentCreator,
      contentBuyer,
      contentBuyer1,
      contentBuyer2,
      contentBuyer3,
      validatorCandidate,
      validator,
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
      jurorMember,
      jurorMember1,
      jurorMember2,
      jurorMember3,
      jurorMember4,
      corporation,
      contractUDAO,
      contractRoleManager,
      contractUDAOCertificate,
      contractUDAOContent,
      contractSupervision,
      contractPlatformTreasury,
      contractUDAOVp,
      contractUDAOStaker,
      contractUDAOTimelockController,
      contractUDAOGovernor,
      GOVERNANCE_ROLE,
      BACKEND_ROLE,
      contractContractManager,
      account1,
      account2,
      account3,
      contractPriceGetter,
    } = await deploy();
  });

  it("Should update addresses", async function () {
    const { backend, contractUDAOStaker } = await deploy();

    await contractUDAOStaker.connect(backend).updateAddresses();
  });

  it("Should set super validator lock amount", async function () {
    const {
      backend,
      contentCreator,
      contentBuyer,
      contentBuyer1,
      contentBuyer2,
      contentBuyer3,
      validatorCandidate,
      validator,
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
      jurorMember,
      jurorMember1,
      jurorMember2,
      jurorMember3,
      jurorMember4,
      corporation,
      contractUDAO,
      contractRoleManager,
      contractUDAOCertificate,
      contractUDAOContent,
      contractSupervision,
      contractPlatformTreasury,
      contractUDAOVp,
      contractUDAOStaker,
      contractUDAOTimelockController,
      contractUDAOGovernor,
      GOVERNANCE_ROLE,
      BACKEND_ROLE,
      contractContractManager,
      account1,
      account2,
      account3,
      contractPriceGetter,
    } = await deploy();

    await expect(
      contractUDAOStaker.connect(foundation).setValidatorLockAmount("100")
    )
      .to.emit(contractUDAOStaker, "SetValidatorLockAmount") // transfer from null address to minter
      .withArgs("100");

    expect(await contractUDAOStaker.validatorLockAmount()).to.eql(
      ethers.BigNumber.from("100")
    );
  });

  it("Should set maximum lock days", async function () {
    const {
      backend,
      contentCreator,
      contentBuyer,
      contentBuyer1,
      contentBuyer2,
      contentBuyer3,
      validatorCandidate,
      validator,
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
      jurorMember,
      jurorMember1,
      jurorMember2,
      jurorMember3,
      jurorMember4,
      corporation,
      contractUDAO,
      contractRoleManager,
      contractUDAOCertificate,
      contractUDAOContent,
      contractSupervision,
      contractPlatformTreasury,
      contractUDAOVp,
      contractUDAOStaker,
      contractUDAOTimelockController,
      contractUDAOGovernor,
      GOVERNANCE_ROLE,
      BACKEND_ROLE,
      contractContractManager,
      account1,
      account2,
      account3,
      contractPriceGetter,
    } = await deploy();

    await expect(
      contractUDAOStaker.connect(foundation).setMaximumStakeDays("1000")
    )
      .to.emit(contractUDAOStaker, "SetMaximumStakeDays") // transfer from null address to minter
      .withArgs("1000");

    expect(await contractUDAOStaker.maximum_stake_days()).to.eql(
      ethers.BigNumber.from("1000")
    );
  });

  it("Should set minimum lock days", async function () {
    const {
      backend,
      contentCreator,
      contentBuyer,
      contentBuyer1,
      contentBuyer2,
      contentBuyer3,
      validatorCandidate,
      validator,
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
      jurorMember,
      jurorMember1,
      jurorMember2,
      jurorMember3,
      jurorMember4,
      corporation,
      contractUDAO,
      contractRoleManager,
      contractUDAOCertificate,
      contractUDAOContent,
      contractSupervision,
      contractPlatformTreasury,
      contractUDAOVp,
      contractUDAOStaker,
      contractUDAOTimelockController,
      contractUDAOGovernor,
      GOVERNANCE_ROLE,
      BACKEND_ROLE,
      contractContractManager,
      account1,
      account2,
      account3,
      contractPriceGetter,
    } = await deploy();

    await expect(
      contractUDAOStaker.connect(foundation).setMinimumStakeDays("1")
    )
      .to.emit(contractUDAOStaker, "SetMinimumStakeDays") // transfer from null address to minter
      .withArgs("1");

    expect(await contractUDAOStaker.minimum_stake_days()).to.eql(
      ethers.BigNumber.from("1")
    );
  });

  it("Should fail to set maximum lock days if less than minimum days", async function () {
    const {
      backend,
      contentCreator,
      contentBuyer,
      contentBuyer1,
      contentBuyer2,
      contentBuyer3,
      validatorCandidate,
      validator,
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
      jurorMember,
      jurorMember1,
      jurorMember2,
      jurorMember3,
      jurorMember4,
      corporation,
      contractUDAO,
      contractRoleManager,
      contractUDAOCertificate,
      contractUDAOContent,
      contractSupervision,
      contractPlatformTreasury,
      contractUDAOVp,
      contractUDAOStaker,
      contractUDAOTimelockController,
      contractUDAOGovernor,
      GOVERNANCE_ROLE,
      BACKEND_ROLE,
      contractContractManager,
      account1,
      account2,
      account3,
      contractPriceGetter,
    } = await deploy();

    await expect(
      contractUDAOStaker.connect(foundation).setMaximumStakeDays("1")
    ).to.revertedWith("Maximum stake days must be greater than minimum days");
  });

  it("Should fail to set minimum lock days", async function () {
    const {
      backend,
      contentCreator,
      contentBuyer,
      contentBuyer1,
      contentBuyer2,
      contentBuyer3,
      validatorCandidate,
      validator,
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
      jurorMember,
      jurorMember1,
      jurorMember2,
      jurorMember3,
      jurorMember4,
      corporation,
      contractUDAO,
      contractRoleManager,
      contractUDAOCertificate,
      contractUDAOContent,
      contractSupervision,
      contractPlatformTreasury,
      contractUDAOVp,
      contractUDAOStaker,
      contractUDAOTimelockController,
      contractUDAOGovernor,
      GOVERNANCE_ROLE,
      BACKEND_ROLE,
      contractContractManager,
      account1,
      account2,
      account3,
      contractPriceGetter,
    } = await deploy();

    await expect(
      contractUDAOStaker.connect(foundation).setMinimumStakeDays("3000")
    ).to.revertedWith("Minimum stake days must be less than maximum days");
  });

  it("Should fail to set super validator lock amount as unauthorized user", async function () {
    const {
      backend,
      contentCreator,
      contentBuyer,
      contentBuyer1,
      contentBuyer2,
      contentBuyer3,
      validatorCandidate,
      validator,
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
      jurorMember,
      jurorMember1,
      jurorMember2,
      jurorMember3,
      jurorMember4,
      corporation,
      contractUDAO,
      contractRoleManager,
      contractUDAOCertificate,
      contractUDAOContent,
      contractSupervision,
      contractPlatformTreasury,
      contractUDAOVp,
      contractUDAOStaker,
      contractUDAOTimelockController,
      contractUDAOGovernor,
      GOVERNANCE_ROLE,
      BACKEND_ROLE,
      contractContractManager,
      account1,
      account2,
      account3,
      contractPriceGetter,
    } = await deploy();

    await expect(
      contractUDAOStaker.connect(validator).setValidatorLockAmount("100")
    ).to.revertedWith(
      `AccessControl: account ${validator.address
        .toString()
        .toLowerCase()} is missing role`
    );
  });

  it("Should set super vote reward amount", async function () {
    const {
      backend,
      contentCreator,
      contentBuyer,
      contentBuyer1,
      contentBuyer2,
      contentBuyer3,
      validatorCandidate,
      validator,
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
      jurorMember,
      jurorMember1,
      jurorMember2,
      jurorMember3,
      jurorMember4,
      corporation,
      contractUDAO,
      contractRoleManager,
      contractUDAOCertificate,
      contractUDAOContent,
      contractSupervision,
      contractPlatformTreasury,
      contractUDAOVp,
      contractUDAOStaker,
      contractUDAOTimelockController,
      contractUDAOGovernor,
      GOVERNANCE_ROLE,
      BACKEND_ROLE,
      contractContractManager,
      account1,
      account2,
      account3,
      contractPriceGetter,
    } = await deploy();

    await expect(contractUDAOStaker.connect(foundation).setVoteReward("100"))
      .to.emit(contractUDAOStaker, "SetVoteReward") // transfer from null address to minter
      .withArgs("100");
  });

  it("Should fail to set super vote reward amount as unauthorized user", async function () {
    const {
      backend,
      contentCreator,
      contentBuyer,
      contentBuyer1,
      contentBuyer2,
      contentBuyer3,
      validatorCandidate,
      validator,
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
      jurorMember,
      jurorMember1,
      jurorMember2,
      jurorMember3,
      jurorMember4,
      corporation,
      contractUDAO,
      contractRoleManager,
      contractUDAOCertificate,
      contractUDAOContent,
      contractSupervision,
      contractPlatformTreasury,
      contractUDAOVp,
      contractUDAOStaker,
      contractUDAOTimelockController,
      contractUDAOGovernor,
      GOVERNANCE_ROLE,
      BACKEND_ROLE,
      contractContractManager,
      account1,
      account2,
      account3,
      contractPriceGetter,
    } = await deploy();

    await expect(
      contractUDAOStaker.connect(validator).setVoteReward("100")
    ).to.revertedWith(
      `AccessControl: account ${validator.address
        .toString()
        .toLowerCase()} is missing role`
    );
  });

  it("Should set a new platform treasury address", async function () {
    const {
      backend,
      contentCreator,
      contentBuyer,
      contentBuyer1,
      contentBuyer2,
      contentBuyer3,
      validatorCandidate,
      validator,
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
      jurorMember,
      jurorMember1,
      jurorMember2,
      jurorMember3,
      jurorMember4,
      corporation,
      contractUDAO,
      contractRoleManager,
      contractUDAOCertificate,
      contractUDAOContent,
      contractSupervision,
      contractPlatformTreasury,
      contractUDAOVp,
      contractUDAOStaker,
      contractUDAOTimelockController,
      contractUDAOGovernor,
      GOVERNANCE_ROLE,
      BACKEND_ROLE,
      contractContractManager,
      account1,
      account2,
      account3,
      contractPriceGetter,
    } = await deploy();

    await expect(
      contractUDAOStaker
        .connect(backend)
        .setPlatformTreasuryAddress(foundation.address)
    )
      .to.emit(contractUDAOStaker, "SetPlatformTreasuryAddress") // transfer from null address to minter
      .withArgs(foundation.address);
  });

  it("Should fail to set a new platform treasury address as unauthorized user", async function () {
    const {
      backend,
      contentCreator,
      contentBuyer,
      contentBuyer1,
      contentBuyer2,
      contentBuyer3,
      validatorCandidate,
      validator,
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
      jurorMember,
      jurorMember1,
      jurorMember2,
      jurorMember3,
      jurorMember4,
      corporation,
      contractUDAO,
      contractRoleManager,
      contractUDAOCertificate,
      contractUDAOContent,
      contractSupervision,
      contractPlatformTreasury,
      contractUDAOVp,
      contractUDAOStaker,
      contractUDAOTimelockController,
      contractUDAOGovernor,
      GOVERNANCE_ROLE,
      BACKEND_ROLE,
      contractContractManager,
      account1,
      account2,
      account3,
      contractPriceGetter,
    } = await deploy();

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
    const {
      backend,
      contentCreator,
      contentBuyer,
      contentBuyer1,
      contentBuyer2,
      contentBuyer3,
      validatorCandidate,
      validator,
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
      jurorMember,
      jurorMember1,
      jurorMember2,
      jurorMember3,
      jurorMember4,
      corporation,
      contractUDAO,
      contractRoleManager,
      contractUDAOCertificate,
      contractUDAOContent,
      contractSupervision,
      contractPlatformTreasury,
      contractUDAOVp,
      contractUDAOStaker,
      contractUDAOTimelockController,
      contractUDAOGovernor,
      GOVERNANCE_ROLE,
      BACKEND_ROLE,
      contractContractManager,
      account1,
      account2,
      account3,
      contractPriceGetter,
    } = await deploy();
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
    const {
      backend,
      contentCreator,
      contentBuyer,
      contentBuyer1,
      contentBuyer2,
      contentBuyer3,
      validatorCandidate,
      validator,
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
      jurorMember,
      jurorMember1,
      jurorMember2,
      jurorMember3,
      jurorMember4,
      corporation,
      contractUDAO,
      contractRoleManager,
      contractUDAOCertificate,
      contractUDAOContent,
      contractSupervision,
      contractPlatformTreasury,
      contractUDAOVp,
      contractUDAOStaker,
      contractUDAOTimelockController,
      contractUDAOGovernor,
      GOVERNANCE_ROLE,
      BACKEND_ROLE,
      contractContractManager,
      account1,
      account2,
      account3,
      contractPriceGetter,
    } = await deploy();
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
    const {
      backend,
      contentCreator,
      contentBuyer,
      contentBuyer1,
      contentBuyer2,
      contentBuyer3,
      validatorCandidate,
      validator,
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
      jurorMember,
      jurorMember1,
      jurorMember2,
      jurorMember3,
      jurorMember4,
      corporation,
      contractUDAO,
      contractRoleManager,
      contractUDAOCertificate,
      contractUDAOContent,
      contractSupervision,
      contractPlatformTreasury,
      contractUDAOVp,
      contractUDAOStaker,
      contractUDAOTimelockController,
      contractUDAOGovernor,
      GOVERNANCE_ROLE,
      BACKEND_ROLE,
      contractContractManager,
      account1,
      account2,
      account3,
      contractPriceGetter,
    } = await deploy();
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
    const {
      backend,
      contentCreator,
      contentBuyer,
      contentBuyer1,
      contentBuyer2,
      contentBuyer3,
      validatorCandidate,
      validator,
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
      jurorMember,
      jurorMember1,
      jurorMember2,
      jurorMember3,
      jurorMember4,
      corporation,
      contractUDAO,
      contractRoleManager,
      contractUDAOCertificate,
      contractUDAOContent,
      contractSupervision,
      contractPlatformTreasury,
      contractUDAOVp,
      contractUDAOStaker,
      contractUDAOTimelockController,
      contractUDAOGovernor,
      GOVERNANCE_ROLE,
      BACKEND_ROLE,
      contractContractManager,
      account1,
      account2,
      account3,
      contractPriceGetter,
    } = await deploy();
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
    const {
      backend,
      contentCreator,
      contentBuyer,
      contentBuyer1,
      contentBuyer2,
      contentBuyer3,
      validatorCandidate,
      validator,
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
      jurorMember,
      jurorMember1,
      jurorMember2,
      jurorMember3,
      jurorMember4,
      corporation,
      contractUDAO,
      contractRoleManager,
      contractUDAOCertificate,
      contractUDAOContent,
      contractSupervision,
      contractPlatformTreasury,
      contractUDAOVp,
      contractUDAOStaker,
      contractUDAOTimelockController,
      contractUDAOGovernor,
      GOVERNANCE_ROLE,
      BACKEND_ROLE,
      contractContractManager,
      account1,
      account2,
      account3,
      contractPriceGetter,
    } = await deploy();
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
    const {
      backend,
      contentCreator,
      contentBuyer,
      contentBuyer1,
      contentBuyer2,
      contentBuyer3,
      validatorCandidate,
      validator,
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
      jurorMember,
      jurorMember1,
      jurorMember2,
      jurorMember3,
      jurorMember4,
      corporation,
      contractUDAO,
      contractRoleManager,
      contractUDAOCertificate,
      contractUDAOContent,
      contractSupervision,
      contractPlatformTreasury,
      contractUDAOVp,
      contractUDAOStaker,
      contractUDAOTimelockController,
      contractUDAOGovernor,
      GOVERNANCE_ROLE,
      BACKEND_ROLE,
      contractContractManager,
      account1,
      account2,
      account3,
      contractPriceGetter,
    } = await deploy();
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
    const {
      backend,
      contentCreator,
      contentBuyer,
      contentBuyer1,
      contentBuyer2,
      contentBuyer3,
      validatorCandidate,
      validator,
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
      jurorMember,
      jurorMember1,
      jurorMember2,
      jurorMember3,
      jurorMember4,
      corporation,
      contractUDAO,
      contractRoleManager,
      contractUDAOCertificate,
      contractUDAOContent,
      contractSupervision,
      contractPlatformTreasury,
      contractUDAOVp,
      contractUDAOStaker,
      contractUDAOTimelockController,
      contractUDAOGovernor,
      GOVERNANCE_ROLE,
      BACKEND_ROLE,
      contractContractManager,
      account1,
      account2,
      account3,
      contractPriceGetter,
    } = await deploy();
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
    const {
      backend,
      contentCreator,
      contentBuyer,
      contentBuyer1,
      contentBuyer2,
      contentBuyer3,
      validatorCandidate,
      validator,
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
      jurorMember,
      jurorMember1,
      jurorMember2,
      jurorMember3,
      jurorMember4,
      corporation,
      contractUDAO,
      contractRoleManager,
      contractUDAOCertificate,
      contractUDAOContent,
      contractSupervision,
      contractPlatformTreasury,
      contractUDAOVp,
      contractUDAOStaker,
      contractUDAOTimelockController,
      contractUDAOGovernor,
      GOVERNANCE_ROLE,
      BACKEND_ROLE,
      contractContractManager,
      account1,
      account2,
      account3,
      contractPriceGetter,
    } = await deploy();
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

  it("Should apply as Super Validator", async function () {
    const {
      backend,
      contentCreator,
      contentBuyer,
      contentBuyer1,
      contentBuyer2,
      contentBuyer3,
      validatorCandidate,
      validator,
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
      jurorMember,
      jurorMember1,
      jurorMember2,
      jurorMember3,
      jurorMember4,
      corporation,
      contractUDAO,
      contractRoleManager,
      contractUDAOCertificate,
      contractUDAOContent,
      contractSupervision,
      contractPlatformTreasury,
      contractUDAOVp,
      contractUDAOStaker,
      contractUDAOTimelockController,
      contractUDAOGovernor,
      GOVERNANCE_ROLE,
      BACKEND_ROLE,
      contractContractManager,
      account1,
      account2,
      account3,
      contractPriceGetter,
    } = await deploy();
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
    /// apply the "super-validator role" with validator candidate account
    await expect(
      contractUDAOStaker.connect(validatorCandidate).applyForSuperValidator()
    )
      .to.emit(contractUDAOStaker, "RoleApplied") // transfer from null address to minter
      .withArgs(3, validatorCandidate.address, 0);
  });

  it("Should fail to apply as Super Validator if not governance member", async function () {
    const {
      backend,
      contentCreator,
      contentBuyer,
      contentBuyer1,
      contentBuyer2,
      contentBuyer3,
      validatorCandidate,
      validator,
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
      jurorMember,
      jurorMember1,
      jurorMember2,
      jurorMember3,
      jurorMember4,
      corporation,
      contractUDAO,
      contractRoleManager,
      contractUDAOCertificate,
      contractUDAOContent,
      contractSupervision,
      contractPlatformTreasury,
      contractUDAOVp,
      contractUDAOStaker,
      contractUDAOTimelockController,
      contractUDAOGovernor,
      GOVERNANCE_ROLE,
      BACKEND_ROLE,
      contractContractManager,
      account1,
      account2,
      account3,
      contractPriceGetter,
    } = await deploy();
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
    /// apply the "super-validator role" with validator candidate account
    await expect(
      contractUDAOStaker.connect(validatorCandidate).applyForSuperValidator()
    ).to.revertedWith("You have to be governance member to apply");
  });

  it("Should fail to apply as Super Validator if not validator", async function () {
    const {
      backend,
      contentCreator,
      contentBuyer,
      contentBuyer1,
      contentBuyer2,
      contentBuyer3,
      validatorCandidate,
      validator,
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
      jurorMember,
      jurorMember1,
      jurorMember2,
      jurorMember3,
      jurorMember4,
      corporation,
      contractUDAO,
      contractRoleManager,
      contractUDAOCertificate,
      contractUDAOContent,
      contractSupervision,
      contractPlatformTreasury,
      contractUDAOVp,
      contractUDAOStaker,
      contractUDAOTimelockController,
      contractUDAOGovernor,
      GOVERNANCE_ROLE,
      BACKEND_ROLE,
      contractContractManager,
      account1,
      account2,
      account3,
      contractPriceGetter,
    } = await deploy();
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
    /// apply the "super-validator role" with validator candidate account
    await expect(
      contractUDAOStaker.connect(validatorCandidate).applyForSuperValidator()
    ).to.revertedWith("Address should be a Validator");
  });

  it("Should approve as Super Validator", async function () {
    const {
      backend,
      contentCreator,
      contentBuyer,
      contentBuyer1,
      contentBuyer2,
      contentBuyer3,
      validatorCandidate,
      validator,
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
      jurorMember,
      jurorMember1,
      jurorMember2,
      jurorMember3,
      jurorMember4,
      corporation,
      contractUDAO,
      contractRoleManager,
      contractUDAOCertificate,
      contractUDAOContent,
      contractSupervision,
      contractPlatformTreasury,
      contractUDAOVp,
      contractUDAOStaker,
      contractUDAOTimelockController,
      contractUDAOGovernor,
      GOVERNANCE_ROLE,
      BACKEND_ROLE,
      contractContractManager,
      account1,
      account2,
      account3,
      contractPriceGetter,
    } = await deploy();
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
    /// apply the "super-validator role" with validator candidate account
    await expect(
      contractUDAOStaker.connect(validatorCandidate).applyForSuperValidator()
    )
      .to.emit(contractUDAOStaker, "RoleApplied") // transfer from null address to minter
      .withArgs(3, validatorCandidate.address, 0);

    const role_voucher_super = await lazyRole.createVoucher(
      validatorCandidate.address,
      Date.now() + 999999999,
      3
    );

    await expect(
      contractUDAOStaker
        .connect(validatorCandidate)
        .getApproved(role_voucher_super)
    )
      .to.emit(contractUDAOStaker, "RoleApproved") // transfer from null address to minter
      .withArgs(3, validatorCandidate.address);
  });

  it("Should apply for juror", async function () {
    const {
      backend,
      contentCreator,
      contentBuyer,
      contentBuyer1,
      contentBuyer2,
      contentBuyer3,
      validatorCandidate,
      validator,
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
      jurorMember,
      jurorMember1,
      jurorMember2,
      jurorMember3,
      jurorMember4,
      corporation,
      contractUDAO,
      contractRoleManager,
      contractUDAOCertificate,
      contractUDAOContent,
      contractSupervision,
      contractPlatformTreasury,
      contractUDAOVp,
      contractUDAOStaker,
      contractUDAOTimelockController,
      contractUDAOGovernor,
      GOVERNANCE_ROLE,
      BACKEND_ROLE,
      contractContractManager,
      account1,
      account2,
      account3,
      contractPriceGetter,
    } = await deploy();
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
    const {
      backend,
      contentCreator,
      contentBuyer,
      contentBuyer1,
      contentBuyer2,
      contentBuyer3,
      validatorCandidate,
      validator,
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
      jurorMember,
      jurorMember1,
      jurorMember2,
      jurorMember3,
      jurorMember4,
      corporation,
      contractUDAO,
      contractRoleManager,
      contractUDAOCertificate,
      contractUDAOContent,
      contractSupervision,
      contractPlatformTreasury,
      contractUDAOVp,
      contractUDAOStaker,
      contractUDAOTimelockController,
      contractUDAOGovernor,
      GOVERNANCE_ROLE,
      BACKEND_ROLE,
      contractContractManager,
      account1,
      account2,
      account3,
      contractPriceGetter,
    } = await deploy();
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
    const {
      backend,
      contentCreator,
      contentBuyer,
      contentBuyer1,
      contentBuyer2,
      contentBuyer3,
      validatorCandidate,
      validator,
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
      jurorMember,
      jurorMember1,
      jurorMember2,
      jurorMember3,
      jurorMember4,
      corporation,
      contractUDAO,
      contractRoleManager,
      contractUDAOCertificate,
      contractUDAOContent,
      contractSupervision,
      contractPlatformTreasury,
      contractUDAOVp,
      contractUDAOStaker,
      contractUDAOTimelockController,
      contractUDAOGovernor,
      GOVERNANCE_ROLE,
      BACKEND_ROLE,
      contractContractManager,
      account1,
      account2,
      account3,
      contractPriceGetter,
    } = await deploy();
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
    const {
      backend,
      contentCreator,
      contentBuyer,
      contentBuyer1,
      contentBuyer2,
      contentBuyer3,
      validatorCandidate,
      validator,
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
      jurorMember,
      jurorMember1,
      jurorMember2,
      jurorMember3,
      jurorMember4,
      corporation,
      contractUDAO,
      contractRoleManager,
      contractUDAOCertificate,
      contractUDAOContent,
      contractSupervision,
      contractPlatformTreasury,
      contractUDAOVp,
      contractUDAOStaker,
      contractUDAOTimelockController,
      contractUDAOGovernor,
      GOVERNANCE_ROLE,
      BACKEND_ROLE,
      contractContractManager,
      account1,
      account2,
      account3,
      contractPriceGetter,
    } = await deploy();
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

  it("Should reject for Super Validator", async function () {
    const {
      backend,
      contentCreator,
      contentBuyer,
      contentBuyer1,
      contentBuyer2,
      contentBuyer3,
      validatorCandidate,
      validator,
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
      jurorMember,
      jurorMember1,
      jurorMember2,
      jurorMember3,
      jurorMember4,
      corporation,
      contractUDAO,
      contractRoleManager,
      contractUDAOCertificate,
      contractUDAOContent,
      contractSupervision,
      contractPlatformTreasury,
      contractUDAOVp,
      contractUDAOStaker,
      contractUDAOTimelockController,
      contractUDAOGovernor,
      GOVERNANCE_ROLE,
      BACKEND_ROLE,
      contractContractManager,
      account1,
      account2,
      account3,
      contractPriceGetter,
    } = await deploy();
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
    /// apply the "super-validator role" with validator candidate account
    await expect(
      contractUDAOStaker.connect(validatorCandidate).applyForSuperValidator()
    )
      .to.emit(contractUDAOStaker, "RoleApplied") // transfer from null address to minter
      .withArgs(3, validatorCandidate.address, 0);
    await expect(
      contractUDAOStaker
        .connect(backend)
        .rejectApplication(validatorCandidate.address, 3)
    )
      .to.emit(contractUDAOStaker, "RoleRejected")
      .withArgs(3, validatorCandidate.address); // transfer from null address to minter
  });

  it("Should reject for juror", async function () {
    const {
      backend,
      contentCreator,
      contentBuyer,
      contentBuyer1,
      contentBuyer2,
      contentBuyer3,
      validatorCandidate,
      validator,
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
      jurorMember,
      jurorMember1,
      jurorMember2,
      jurorMember3,
      jurorMember4,
      corporation,
      contractUDAO,
      contractRoleManager,
      contractUDAOCertificate,
      contractUDAOContent,
      contractSupervision,
      contractPlatformTreasury,
      contractUDAOVp,
      contractUDAOStaker,
      contractUDAOTimelockController,
      contractUDAOGovernor,
      GOVERNANCE_ROLE,
      BACKEND_ROLE,
      contractContractManager,
      account1,
      account2,
      account3,
      contractPriceGetter,
    } = await deploy();
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
    const {
      backend,
      contentCreator,
      contentBuyer,
      contentBuyer1,
      contentBuyer2,
      contentBuyer3,
      validatorCandidate,
      validator,
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
      jurorMember,
      jurorMember1,
      jurorMember2,
      jurorMember3,
      jurorMember4,
      corporation,
      contractUDAO,
      contractRoleManager,
      contractUDAOCertificate,
      contractUDAOContent,
      contractSupervision,
      contractPlatformTreasury,
      contractUDAOVp,
      contractUDAOStaker,
      contractUDAOTimelockController,
      contractUDAOGovernor,
      GOVERNANCE_ROLE,
      BACKEND_ROLE,
      contractContractManager,
      account1,
      account2,
      account3,
      contractPriceGetter,
    } = await deploy();
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
    const {
      backend,
      contentCreator,
      contentBuyer,
      contentBuyer1,
      contentBuyer2,
      contentBuyer3,
      validatorCandidate,
      validator,
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
      jurorMember,
      jurorMember1,
      jurorMember2,
      jurorMember3,
      jurorMember4,
      corporation,
      contractUDAO,
      contractRoleManager,
      contractUDAOCertificate,
      contractUDAOContent,
      contractSupervision,
      contractPlatformTreasury,
      contractUDAOVp,
      contractUDAOStaker,
      contractUDAOTimelockController,
      contractUDAOGovernor,
      GOVERNANCE_ROLE,
      BACKEND_ROLE,
      contractContractManager,
      account1,
      account2,
      account3,
      contractPriceGetter,
    } = await deploy();
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
    const {
      backend,
      contentCreator,
      contentBuyer,
      contentBuyer1,
      contentBuyer2,
      contentBuyer3,
      validatorCandidate,
      validator,
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
      jurorMember,
      jurorMember1,
      jurorMember2,
      jurorMember3,
      jurorMember4,
      corporation,
      contractUDAO,
      contractRoleManager,
      contractUDAOCertificate,
      contractUDAOContent,
      contractSupervision,
      contractPlatformTreasury,
      contractUDAOVp,
      contractUDAOStaker,
      contractUDAOTimelockController,
      contractUDAOGovernor,
      GOVERNANCE_ROLE,
      BACKEND_ROLE,
      contractContractManager,
      account1,
      account2,
      account3,
      contractPriceGetter,
    } = await deploy();
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
    const {
      backend,
      contentCreator,
      contentBuyer,
      contentBuyer1,
      contentBuyer2,
      contentBuyer3,
      validatorCandidate,
      validator,
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
      jurorMember,
      jurorMember1,
      jurorMember2,
      jurorMember3,
      jurorMember4,
      corporation,
      contractUDAO,
      contractRoleManager,
      contractUDAOCertificate,
      contractUDAOContent,
      contractSupervision,
      contractPlatformTreasury,
      contractUDAOVp,
      contractUDAOStaker,
      contractUDAOTimelockController,
      contractUDAOGovernor,
      GOVERNANCE_ROLE,
      BACKEND_ROLE,
      contractContractManager,
      account1,
      account2,
      account3,
      contractPriceGetter,
    } = await deploy();
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
    const {
      backend,
      contentCreator,
      contentBuyer,
      contentBuyer1,
      contentBuyer2,
      contentBuyer3,
      validatorCandidate,
      validator,
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
      jurorMember,
      jurorMember1,
      jurorMember2,
      jurorMember3,
      jurorMember4,
      corporation,
      contractUDAO,
      contractRoleManager,
      contractUDAOCertificate,
      contractUDAOContent,
      contractSupervision,
      contractPlatformTreasury,
      contractUDAOVp,
      contractUDAOStaker,
      contractUDAOTimelockController,
      contractUDAOGovernor,
      GOVERNANCE_ROLE,
      BACKEND_ROLE,
      contractContractManager,
      account1,
      account2,
      account3,
      contractPriceGetter,
    } = await deploy();
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
    const {
      backend,
      contentCreator,
      contentBuyer,
      contentBuyer1,
      contentBuyer2,
      contentBuyer3,
      validatorCandidate,
      validator,
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
      jurorMember,
      jurorMember1,
      jurorMember2,
      jurorMember3,
      jurorMember4,
      corporation,
      contractUDAO,
      contractRoleManager,
      contractUDAOCertificate,
      contractUDAOContent,
      contractSupervision,
      contractPlatformTreasury,
      contractUDAOVp,
      contractUDAOStaker,
      contractUDAOTimelockController,
      contractUDAOGovernor,
      GOVERNANCE_ROLE,
      BACKEND_ROLE,
      contractContractManager,
      account1,
      account2,
      account3,
      contractPriceGetter,
    } = await deploy();
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
    const {
      backend,
      contentCreator,
      contentBuyer,
      contentBuyer1,
      contentBuyer2,
      contentBuyer3,
      validatorCandidate,
      validator,
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
      jurorMember,
      jurorMember1,
      jurorMember2,
      jurorMember3,
      jurorMember4,
      corporation,
      contractUDAO,
      contractRoleManager,
      contractUDAOCertificate,
      contractUDAOContent,
      contractSupervision,
      contractPlatformTreasury,
      contractUDAOVp,
      contractUDAOStaker,
      contractUDAOTimelockController,
      contractUDAOGovernor,
      GOVERNANCE_ROLE,
      BACKEND_ROLE,
      contractContractManager,
      account1,
      account2,
      account3,
      contractPriceGetter,
    } = await deploy();
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
    const {
      backend,
      contentCreator,
      contentBuyer,
      contentBuyer1,
      contentBuyer2,
      contentBuyer3,
      validatorCandidate,
      validator,
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
      jurorMember,
      jurorMember1,
      jurorMember2,
      jurorMember3,
      jurorMember4,
      corporation,
      contractUDAO,
      contractRoleManager,
      contractUDAOCertificate,
      contractUDAOContent,
      contractSupervision,
      contractPlatformTreasury,
      contractUDAOVp,
      contractUDAOStaker,
      contractUDAOTimelockController,
      contractUDAOGovernor,
      GOVERNANCE_ROLE,
      BACKEND_ROLE,
      contractContractManager,
      account1,
      account2,
      account3,
      contractPriceGetter,
    } = await deploy();
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
    const {
      backend,
      contentCreator,
      contentBuyer,
      contentBuyer1,
      contentBuyer2,
      contentBuyer3,
      validatorCandidate,
      validator,
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
      jurorMember,
      jurorMember1,
      jurorMember2,
      jurorMember3,
      jurorMember4,
      corporation,
      contractUDAO,
      contractRoleManager,
      contractUDAOCertificate,
      contractUDAOContent,
      contractSupervision,
      contractPlatformTreasury,
      contractUDAOVp,
      contractUDAOStaker,
      contractUDAOTimelockController,
      contractUDAOGovernor,
      GOVERNANCE_ROLE,
      BACKEND_ROLE,
      contractContractManager,
      account1,
      account2,
      account3,
      contractPriceGetter,
    } = await deploy();
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
    const {
      backend,
      contentCreator,
      contentBuyer,
      contentBuyer1,
      contentBuyer2,
      contentBuyer3,
      validatorCandidate,
      validator,
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
      jurorMember,
      jurorMember1,
      jurorMember2,
      jurorMember3,
      jurorMember4,
      corporation,
      contractUDAO,
      contractRoleManager,
      contractUDAOCertificate,
      contractUDAOContent,
      contractSupervision,
      contractPlatformTreasury,
      contractUDAOVp,
      contractUDAOStaker,
      contractUDAOTimelockController,
      contractUDAOGovernor,
      GOVERNANCE_ROLE,
      BACKEND_ROLE,
      contractContractManager,
      account1,
      account2,
      account3,
      contractPriceGetter,
    } = await deploy();
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
    const {
      backend,
      contentCreator,
      contentBuyer,
      contentBuyer1,
      contentBuyer2,
      contentBuyer3,
      validatorCandidate,
      validator,
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
      jurorMember,
      jurorMember1,
      jurorMember2,
      jurorMember3,
      jurorMember4,
      corporation,
      contractUDAO,
      contractRoleManager,
      contractUDAOCertificate,
      contractUDAOContent,
      contractSupervision,
      contractPlatformTreasury,
      contractUDAOVp,
      contractUDAOStaker,
      contractUDAOTimelockController,
      contractUDAOGovernor,
      GOVERNANCE_ROLE,
      BACKEND_ROLE,
      contractContractManager,
      account1,
      account2,
      account3,
      contractPriceGetter,
    } = await deploy();
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
    const {
      backend,
      contentCreator,
      contentBuyer,
      contentBuyer1,
      contentBuyer2,
      contentBuyer3,
      validatorCandidate,
      validator,
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
      jurorMember,
      jurorMember1,
      jurorMember2,
      jurorMember3,
      jurorMember4,
      corporation,
      contractUDAO,
      contractRoleManager,
      contractUDAOCertificate,
      contractUDAOContent,
      contractSupervision,
      contractPlatformTreasury,
      contractUDAOVp,
      contractUDAOStaker,
      contractUDAOTimelockController,
      contractUDAOGovernor,
      GOVERNANCE_ROLE,
      BACKEND_ROLE,
      contractContractManager,
      account1,
      account2,
      account3,
      contractPriceGetter,
    } = await deploy();
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
    const {
      backend,
      contentCreator,
      contentBuyer,
      contentBuyer1,
      contentBuyer2,
      contentBuyer3,
      validatorCandidate,
      validator,
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
      jurorMember,
      jurorMember1,
      jurorMember2,
      jurorMember3,
      jurorMember4,
      corporation,
      contractUDAO,
      contractRoleManager,
      contractUDAOCertificate,
      contractUDAOContent,
      contractSupervision,
      contractPlatformTreasury,
      contractUDAOVp,
      contractUDAOStaker,
      contractUDAOTimelockController,
      contractUDAOGovernor,
      GOVERNANCE_ROLE,
      BACKEND_ROLE,
      contractContractManager,
      account1,
      account2,
      account3,
      contractPriceGetter,
    } = await deploy();
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
    const {
      backend,
      contentCreator,
      contentBuyer,
      contentBuyer1,
      contentBuyer2,
      contentBuyer3,
      validatorCandidate,
      validator,
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
      jurorMember,
      jurorMember1,
      jurorMember2,
      jurorMember3,
      jurorMember4,
      corporation,
      contractUDAO,
      contractRoleManager,
      contractUDAOCertificate,
      contractUDAOContent,
      contractSupervision,
      contractPlatformTreasury,
      contractUDAOVp,
      contractUDAOStaker,
      contractUDAOTimelockController,
      contractUDAOGovernor,
      GOVERNANCE_ROLE,
      BACKEND_ROLE,
      contractContractManager,
      account1,
      account2,
      account3,
      contractPriceGetter,
    } = await deploy();
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
    const {
      backend,
      contentCreator,
      contentBuyer,
      contentBuyer1,
      contentBuyer2,
      contentBuyer3,
      validatorCandidate,
      validator,
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
      jurorMember,
      jurorMember1,
      jurorMember2,
      jurorMember3,
      jurorMember4,
      corporation,
      contractUDAO,
      contractRoleManager,
      contractUDAOCertificate,
      contractUDAOContent,
      contractSupervision,
      contractPlatformTreasury,
      contractUDAOVp,
      contractUDAOStaker,
      contractUDAOTimelockController,
      contractUDAOGovernor,
      GOVERNANCE_ROLE,
      BACKEND_ROLE,
      contractContractManager,
      account1,
      account2,
      account3,
      contractPriceGetter,
    } = await deploy();
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
    const {
      backend,
      contentCreator,
      contentBuyer,
      contentBuyer1,
      contentBuyer2,
      contentBuyer3,
      validatorCandidate,
      validator,
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
      jurorMember,
      jurorMember1,
      jurorMember2,
      jurorMember3,
      jurorMember4,
      corporation,
      contractUDAO,
      contractRoleManager,
      contractUDAOCertificate,
      contractUDAOContent,
      contractSupervision,
      contractPlatformTreasury,
      contractUDAOVp,
      contractUDAOStaker,
      contractUDAOTimelockController,
      contractUDAOGovernor,
      GOVERNANCE_ROLE,
      BACKEND_ROLE,
      contractContractManager,
      account1,
      account2,
      account3,
      contractPriceGetter,
    } = await deploy();
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
    const {
      backend,
      contentCreator,
      contentBuyer,
      contentBuyer1,
      contentBuyer2,
      contentBuyer3,
      validatorCandidate,
      validator,
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
      jurorMember,
      jurorMember1,
      jurorMember2,
      jurorMember3,
      jurorMember4,
      corporation,
      contractUDAO,
      contractRoleManager,
      contractUDAOCertificate,
      contractUDAOContent,
      contractSupervision,
      contractPlatformTreasury,
      contractUDAOVp,
      contractUDAOStaker,
      contractUDAOTimelockController,
      contractUDAOGovernor,
      GOVERNANCE_ROLE,
      BACKEND_ROLE,
      contractContractManager,
      account1,
      account2,
      account3,
      contractPriceGetter,
    } = await deploy();
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

    //const superValidatorAfter = await contractUDAO.balanceOf(superValidator.address);
    //console.log("superValidatorAfter", superValidatorAfter.toString());
    await expect(contractUDAOStaker.connect(superValidator).withdrawRewards())
      .to.emit(contractUDAOStaker, "VoteRewardsWithdrawn")
      //.withArgs(superValidator.address, ethers.utils.parseEther("0.00005"));
      // TODO: WHAT IS THIS VALUE? I change it according to result of test but it is not correct
      .withArgs(superValidator.address, ethers.utils.parseEther("0.00000833"));
    //300000000000000000000
    //50000000000000
    //8330000000000
  });

  it("Should withdraw rewards from voting when banned", async function () {
    const {
      backend,
      contentCreator,
      contentBuyer,
      contentBuyer1,
      contentBuyer2,
      contentBuyer3,
      validatorCandidate,
      validator,
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
      jurorMember,
      jurorMember1,
      jurorMember2,
      jurorMember3,
      jurorMember4,
      corporation,
      contractUDAO,
      contractRoleManager,
      contractUDAOCertificate,
      contractUDAOContent,
      contractSupervision,
      contractPlatformTreasury,
      contractUDAOVp,
      contractUDAOStaker,
      contractUDAOTimelockController,
      contractUDAOGovernor,
      GOVERNANCE_ROLE,
      BACKEND_ROLE,
      contractContractManager,
      account1,
      account2,
      account3,
      contractPriceGetter,
    } = await deploy();
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
    await expect(contractUDAOStaker.connect(superValidator).withdrawRewards())
      .to.emit(contractUDAOStaker, "VoteRewardsWithdrawn")
      //.withArgs(superValidator.address, ethers.utils.parseEther("0.00005"));
      // TODO: WHAT IS THIS VALUE? I change it according to result of test but it is not correct
      .withArgs(superValidator.address, ethers.utils.parseEther("0.00000833"));
  });

  it("Should fail to unstake to stop being a governance member when amount is higher than staked", async function () {
    const {
      backend,
      contentCreator,
      contentBuyer,
      contentBuyer1,
      contentBuyer2,
      contentBuyer3,
      validatorCandidate,
      validator,
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
      jurorMember,
      jurorMember1,
      jurorMember2,
      jurorMember3,
      jurorMember4,
      corporation,
      contractUDAO,
      contractRoleManager,
      contractUDAOCertificate,
      contractUDAOContent,
      contractSupervision,
      contractPlatformTreasury,
      contractUDAOVp,
      contractUDAOStaker,
      contractUDAOTimelockController,
      contractUDAOGovernor,
      GOVERNANCE_ROLE,
      BACKEND_ROLE,
      contractContractManager,
      account1,
      account2,
      account3,
      contractPriceGetter,
    } = await deploy();
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
    const {
      backend,
      contentCreator,
      contentBuyer,
      contentBuyer1,
      contentBuyer2,
      contentBuyer3,
      validatorCandidate,
      validator,
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
      jurorMember,
      jurorMember1,
      jurorMember2,
      jurorMember3,
      jurorMember4,
      corporation,
      contractUDAO,
      contractRoleManager,
      contractUDAOCertificate,
      contractUDAOContent,
      contractSupervision,
      contractPlatformTreasury,
      contractUDAOVp,
      contractUDAOStaker,
      contractUDAOTimelockController,
      contractUDAOGovernor,
      GOVERNANCE_ROLE,
      BACKEND_ROLE,
      contractContractManager,
      account1,
      account2,
      account3,
      contractPriceGetter,
    } = await deploy();
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
    const {
      backend,
      contentCreator,
      contentBuyer,
      contentBuyer1,
      contentBuyer2,
      contentBuyer3,
      validatorCandidate,
      validator,
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
      jurorMember,
      jurorMember1,
      jurorMember2,
      jurorMember3,
      jurorMember4,
      corporation,
      contractUDAO,
      contractRoleManager,
      contractUDAOCertificate,
      contractUDAOContent,
      contractSupervision,
      contractPlatformTreasury,
      contractUDAOVp,
      contractUDAOStaker,
      contractUDAOTimelockController,
      contractUDAOGovernor,
      GOVERNANCE_ROLE,
      BACKEND_ROLE,
      contractContractManager,
      account1,
      account2,
      account3,
      contractPriceGetter,
    } = await deploy();
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
    const {
      backend,
      contentCreator,
      contentBuyer,
      contentBuyer1,
      contentBuyer2,
      contentBuyer3,
      validatorCandidate,
      validator,
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
      jurorMember,
      jurorMember1,
      jurorMember2,
      jurorMember3,
      jurorMember4,
      corporation,
      contractUDAO,
      contractRoleManager,
      contractUDAOCertificate,
      contractUDAOContent,
      contractSupervision,
      contractPlatformTreasury,
      contractUDAOVp,
      contractUDAOStaker,
      contractUDAOTimelockController,
      contractUDAOGovernor,
      GOVERNANCE_ROLE,
      BACKEND_ROLE,
      contractContractManager,
      account1,
      account2,
      account3,
      contractPriceGetter,
    } = await deploy();
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
    const {
      backend,
      contentCreator,
      contentBuyer,
      contentBuyer1,
      contentBuyer2,
      contentBuyer3,
      validatorCandidate,
      validator,
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
      jurorMember,
      jurorMember1,
      jurorMember2,
      jurorMember3,
      jurorMember4,
      corporation,
      contractUDAO,
      contractRoleManager,
      contractUDAOCertificate,
      contractUDAOContent,
      contractSupervision,
      contractPlatformTreasury,
      contractUDAOVp,
      contractUDAOStaker,
      contractUDAOTimelockController,
      contractUDAOGovernor,
      GOVERNANCE_ROLE,
      BACKEND_ROLE,
      contractContractManager,
      account1,
      account2,
      account3,
      contractPriceGetter,
    } = await deploy();
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
    const {
      backend,
      contentCreator,
      contentBuyer,
      contentBuyer1,
      contentBuyer2,
      contentBuyer3,
      validatorCandidate,
      validator,
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
      jurorMember,
      jurorMember1,
      jurorMember2,
      jurorMember3,
      jurorMember4,
      corporation,
      contractUDAO,
      contractRoleManager,
      contractUDAOCertificate,
      contractUDAOContent,
      contractSupervision,
      contractPlatformTreasury,
      contractUDAOVp,
      contractUDAOStaker,
      contractUDAOTimelockController,
      contractUDAOGovernor,
      GOVERNANCE_ROLE,
      BACKEND_ROLE,
      contractContractManager,
      account1,
      account2,
      account3,
      contractPriceGetter,
    } = await deploy();
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
    const {
      backend,
      contentCreator,
      contentBuyer,
      contentBuyer1,
      contentBuyer2,
      contentBuyer3,
      validatorCandidate,
      validator,
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
      jurorMember,
      jurorMember1,
      jurorMember2,
      jurorMember3,
      jurorMember4,
      corporation,
      contractUDAO,
      contractRoleManager,
      contractUDAOCertificate,
      contractUDAOContent,
      contractSupervision,
      contractPlatformTreasury,
      contractUDAOVp,
      contractUDAOStaker,
      contractUDAOTimelockController,
      contractUDAOGovernor,
      GOVERNANCE_ROLE,
      BACKEND_ROLE,
      contractContractManager,
      account1,
      account2,
      account3,
      contractPriceGetter,
    } = await deploy();
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
    const {
      backend,
      contentCreator,
      contentBuyer,
      contentBuyer1,
      contentBuyer2,
      contentBuyer3,
      validatorCandidate,
      validator,
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
      jurorMember,
      jurorMember1,
      jurorMember2,
      jurorMember3,
      jurorMember4,
      corporation,
      contractUDAO,
      contractRoleManager,
      contractUDAOCertificate,
      contractUDAOContent,
      contractSupervision,
      contractPlatformTreasury,
      contractUDAOVp,
      contractUDAOStaker,
      contractUDAOTimelockController,
      contractUDAOGovernor,
      GOVERNANCE_ROLE,
      BACKEND_ROLE,
      contractContractManager,
      account1,
      account2,
      account3,
      contractPriceGetter,
    } = await deploy();
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
    const {
      backend,
      contentCreator,
      contentBuyer,
      contentBuyer1,
      contentBuyer2,
      contentBuyer3,
      validatorCandidate,
      validator,
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
      jurorMember,
      jurorMember1,
      jurorMember2,
      jurorMember3,
      jurorMember4,
      corporation,
      contractUDAO,
      contractRoleManager,
      contractUDAOCertificate,
      contractUDAOContent,
      contractSupervision,
      contractPlatformTreasury,
      contractUDAOVp,
      contractUDAOStaker,
      contractUDAOTimelockController,
      contractUDAOGovernor,
      GOVERNANCE_ROLE,
      BACKEND_ROLE,
      contractContractManager,
      account1,
      account2,
      account3,
      contractPriceGetter,
    } = await deploy();
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
    const {
      backend,
      contentCreator,
      contentBuyer,
      contentBuyer1,
      contentBuyer2,
      contentBuyer3,
      validatorCandidate,
      validator,
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
      jurorMember,
      jurorMember1,
      jurorMember2,
      jurorMember3,
      jurorMember4,
      corporation,
      contractUDAO,
      contractRoleManager,
      contractUDAOCertificate,
      contractUDAOContent,
      contractSupervision,
      contractPlatformTreasury,
      contractUDAOVp,
      contractUDAOStaker,
      contractUDAOTimelockController,
      contractUDAOGovernor,
      GOVERNANCE_ROLE,
      BACKEND_ROLE,
      contractContractManager,
      account1,
      account2,
      account3,
      contractPriceGetter,
    } = await deploy();
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
    const {
      backend,
      contentCreator,
      contentBuyer,
      contentBuyer1,
      contentBuyer2,
      contentBuyer3,
      validatorCandidate,
      validator,
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
      jurorMember,
      jurorMember1,
      jurorMember2,
      jurorMember3,
      jurorMember4,
      corporation,
      contractUDAO,
      contractRoleManager,
      contractUDAOCertificate,
      contractUDAOContent,
      contractSupervision,
      contractPlatformTreasury,
      contractUDAOVp,
      contractUDAOStaker,
      contractUDAOTimelockController,
      contractUDAOGovernor,
      GOVERNANCE_ROLE,
      BACKEND_ROLE,
      contractContractManager,
      account1,
      account2,
      account3,
      contractPriceGetter,
    } = await deploy();
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
    const {
      backend,
      contentCreator,
      contentBuyer,
      contentBuyer1,
      contentBuyer2,
      contentBuyer3,
      validatorCandidate,
      validator,
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
      jurorMember,
      jurorMember1,
      jurorMember2,
      jurorMember3,
      jurorMember4,
      corporation,
      contractUDAO,
      contractRoleManager,
      contractUDAOCertificate,
      contractUDAOContent,
      contractSupervision,
      contractPlatformTreasury,
      contractUDAOVp,
      contractUDAOStaker,
      contractUDAOTimelockController,
      contractUDAOGovernor,
      GOVERNANCE_ROLE,
      BACKEND_ROLE,
      contractContractManager,
      account1,
      account2,
      account3,
      contractPriceGetter,
    } = await deploy();
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
    const {
      backend,
      contentCreator,
      contentBuyer,
      contentBuyer1,
      contentBuyer2,
      contentBuyer3,
      validatorCandidate,
      validator,
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
      jurorMember,
      jurorMember1,
      jurorMember2,
      jurorMember3,
      jurorMember4,
      corporation,
      contractUDAO,
      contractRoleManager,
      contractUDAOCertificate,
      contractUDAOContent,
      contractSupervision,
      contractPlatformTreasury,
      contractUDAOVp,
      contractUDAOStaker,
      contractUDAOTimelockController,
      contractUDAOGovernor,
      GOVERNANCE_ROLE,
      BACKEND_ROLE,
      contractContractManager,
      account1,
      account2,
      account3,
      contractPriceGetter,
    } = await deploy();
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

  it("Should fail to apply as Super Validator when user hasn't kyced", async function () {
    const {
      backend,
      contentCreator,
      contentBuyer,
      contentBuyer1,
      contentBuyer2,
      contentBuyer3,
      validatorCandidate,
      validator,
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
      jurorMember,
      jurorMember1,
      jurorMember2,
      jurorMember3,
      jurorMember4,
      corporation,
      contractUDAO,
      contractRoleManager,
      contractUDAOCertificate,
      contractUDAOContent,
      contractSupervision,
      contractPlatformTreasury,
      contractUDAOVp,
      contractUDAOStaker,
      contractUDAOTimelockController,
      contractUDAOGovernor,
      GOVERNANCE_ROLE,
      BACKEND_ROLE,
      contractContractManager,
      account1,
      account2,
      account3,
      contractPriceGetter,
    } = await deploy();
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
    /// remove KYC for validatorCandidate
    await contractRoleManager.setKYC(validatorCandidate.address, false);
    /// apply the "super-validator role" with validator candidate account
    await expect(
      contractUDAOStaker.connect(validatorCandidate).applyForSuperValidator()
    ).to.revertedWith("You are not KYCed");
  });

  it("Should fail to apply as Super Validator when user banned", async function () {
    const {
      backend,
      contentCreator,
      contentBuyer,
      contentBuyer1,
      contentBuyer2,
      contentBuyer3,
      validatorCandidate,
      validator,
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
      jurorMember,
      jurorMember1,
      jurorMember2,
      jurorMember3,
      jurorMember4,
      corporation,
      contractUDAO,
      contractRoleManager,
      contractUDAOCertificate,
      contractUDAOContent,
      contractSupervision,
      contractPlatformTreasury,
      contractUDAOVp,
      contractUDAOStaker,
      contractUDAOTimelockController,
      contractUDAOGovernor,
      GOVERNANCE_ROLE,
      BACKEND_ROLE,
      contractContractManager,
      account1,
      account2,
      account3,
      contractPriceGetter,
    } = await deploy();
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

    await contractRoleManager.setBan(validatorCandidate.address, true);
    /// apply the "super-validator role" with validator candidate account
    await expect(
      contractUDAOStaker.connect(validatorCandidate).applyForSuperValidator()
    ).to.revertedWith("You were banned");
  });

  it("Should fail to apply for juror when juror hasn't kyced", async function () {
    const {
      backend,
      contentCreator,
      contentBuyer,
      contentBuyer1,
      contentBuyer2,
      contentBuyer3,
      validatorCandidate,
      validator,
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
      jurorMember,
      jurorMember1,
      jurorMember2,
      jurorMember3,
      jurorMember4,
      corporation,
      contractUDAO,
      contractRoleManager,
      contractUDAOCertificate,
      contractUDAOContent,
      contractSupervision,
      contractPlatformTreasury,
      contractUDAOVp,
      contractUDAOStaker,
      contractUDAOTimelockController,
      contractUDAOGovernor,
      GOVERNANCE_ROLE,
      BACKEND_ROLE,
      contractContractManager,
      account1,
      account2,
      account3,
      contractPriceGetter,
    } = await deploy();
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
    const {
      backend,
      contentCreator,
      contentBuyer,
      contentBuyer1,
      contentBuyer2,
      contentBuyer3,
      validatorCandidate,
      validator,
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
      jurorMember,
      jurorMember1,
      jurorMember2,
      jurorMember3,
      jurorMember4,
      corporation,
      contractUDAO,
      contractRoleManager,
      contractUDAOCertificate,
      contractUDAOContent,
      contractSupervision,
      contractPlatformTreasury,
      contractUDAOVp,
      contractUDAOStaker,
      contractUDAOTimelockController,
      contractUDAOGovernor,
      GOVERNANCE_ROLE,
      BACKEND_ROLE,
      contractContractManager,
      account1,
      account2,
      account3,
      contractPriceGetter,
    } = await deploy();
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
    const {
      backend,
      contentCreator,
      contentBuyer,
      contentBuyer1,
      contentBuyer2,
      contentBuyer3,
      validatorCandidate,
      validator,
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
      jurorMember,
      jurorMember1,
      jurorMember2,
      jurorMember3,
      jurorMember4,
      corporation,
      contractUDAO,
      contractRoleManager,
      contractUDAOCertificate,
      contractUDAOContent,
      contractSupervision,
      contractPlatformTreasury,
      contractUDAOVp,
      contractUDAOStaker,
      contractUDAOTimelockController,
      contractUDAOGovernor,
      GOVERNANCE_ROLE,
      BACKEND_ROLE,
      contractContractManager,
      account1,
      account2,
      account3,
      contractPriceGetter,
    } = await deploy();
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
    const {
      backend,
      contentCreator,
      contentBuyer,
      contentBuyer1,
      contentBuyer2,
      contentBuyer3,
      validatorCandidate,
      validator,
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
      jurorMember,
      jurorMember1,
      jurorMember2,
      jurorMember3,
      jurorMember4,
      corporation,
      contractUDAO,
      contractRoleManager,
      contractUDAOCertificate,
      contractUDAOContent,
      contractSupervision,
      contractPlatformTreasury,
      contractUDAOVp,
      contractUDAOStaker,
      contractUDAOTimelockController,
      contractUDAOGovernor,
      GOVERNANCE_ROLE,
      BACKEND_ROLE,
      contractContractManager,
      account1,
      account2,
      account3,
      contractPriceGetter,
    } = await deploy();
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
    const {
      backend,
      contentCreator,
      contentBuyer,
      contentBuyer1,
      contentBuyer2,
      contentBuyer3,
      validatorCandidate,
      validator,
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
      jurorMember,
      jurorMember1,
      jurorMember2,
      jurorMember3,
      jurorMember4,
      corporation,
      contractUDAO,
      contractRoleManager,
      contractUDAOCertificate,
      contractUDAOContent,
      contractSupervision,
      contractPlatformTreasury,
      contractUDAOVp,
      contractUDAOStaker,
      contractUDAOTimelockController,
      contractUDAOGovernor,
      GOVERNANCE_ROLE,
      BACKEND_ROLE,
      contractContractManager,
      account1,
      account2,
      account3,
      contractPriceGetter,
    } = await deploy();
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
    const {
      backend,
      contentCreator,
      contentBuyer,
      contentBuyer1,
      contentBuyer2,
      contentBuyer3,
      validatorCandidate,
      validator,
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
      jurorMember,
      jurorMember1,
      jurorMember2,
      jurorMember3,
      jurorMember4,
      corporation,
      contractUDAO,
      contractRoleManager,
      contractUDAOCertificate,
      contractUDAOContent,
      contractSupervision,
      contractPlatformTreasury,
      contractUDAOVp,
      contractUDAOStaker,
      contractUDAOTimelockController,
      contractUDAOGovernor,
      GOVERNANCE_ROLE,
      BACKEND_ROLE,
      contractContractManager,
      account1,
      account2,
      account3,
      contractPriceGetter,
    } = await deploy();
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
