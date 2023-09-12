const { expect } = require("chai");
const hardhat = require("hardhat");
const { ethers } = hardhat;
const chai = require("chai");
const BN = require("bn.js");
const { LazyRole } = require("../lib/LazyRole");
const { Redeem } = require("../lib/Redeem");
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

/// DEPLOYMENTS------------------------------------------------------------------
// PEOPLE
var backend;
var contentCreator;
var contentBuyer, contentBuyer1, contentBuyer2, contentBuyer3;
var validator1, validator2, validator3, validator4, validator5;
var jurorMember1, jurorMember2, jurorMember3, jurorMember4;
var account1, account2, account3;

var validatorCandidate, validator;
var jurorCandidate, jurorMember;
var governanceCandidate, governanceMember;
var foundation, corporation;
var superValidatorCandidate, superValidator;
// CONTRACTS & ROLES
var contractUDAO, contractUDAOVp, contractUDAOCertificate, contractUDAOContent;

var contractSupervision, contractSupervision, contractSupervision;
var contractUDAOStaker, contractUDAOTimelockController, contractUDAOGovernor;

var contractRoleManager, contractContractManagervar;
var contractPlatformTreasury;
var contractPriceGetter;
var GOVERNANCE_ROLE, BACKEND_ROLE;

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
/// @dev Run validation and finalize it
async function runValidation(
  contentCreator,
  contractSupervision,
  backend,
  validator1,
  validator2,
  validator3,
  validator4,
  validator5
) {
  await expect(contractSupervision.connect(validator1).assignValidation(1))
    .to.emit(contractSupervision, "ValidationAssigned")
    .withArgs(
      ethers.BigNumber.from(0),
      ethers.BigNumber.from(1),
      validator1.address
    );
  await expect(contractSupervision.connect(validator2).assignValidation(1))
    .to.emit(contractSupervision, "ValidationAssigned")
    .withArgs(
      ethers.BigNumber.from(0),
      ethers.BigNumber.from(1),
      validator2.address
    );
  await expect(contractSupervision.connect(validator3).assignValidation(1))
    .to.emit(contractSupervision, "ValidationAssigned")
    .withArgs(
      ethers.BigNumber.from(0),
      ethers.BigNumber.from(1),
      validator3.address
    );
  await expect(contractSupervision.connect(validator4).assignValidation(1))
    .to.emit(contractSupervision, "ValidationAssigned")
    .withArgs(
      ethers.BigNumber.from(0),
      ethers.BigNumber.from(1),
      validator4.address
    );
  await expect(contractSupervision.connect(validator5).assignValidation(1))
    .to.emit(contractSupervision, "ValidationAssigned")
    .withArgs(
      ethers.BigNumber.from(0),
      ethers.BigNumber.from(1),
      validator5.address
    );

  await expect(contractSupervision.connect(validator1).sendValidation(1, true))
    .to.emit(contractSupervision, "ValidationResultSent")
    .withArgs(
      ethers.BigNumber.from(0),
      ethers.BigNumber.from(1),
      validator1.address,
      true
    );
  await expect(contractSupervision.connect(validator2).sendValidation(1, true))
    .to.emit(contractSupervision, "ValidationResultSent")
    .withArgs(
      ethers.BigNumber.from(0),
      ethers.BigNumber.from(1),
      validator2.address,
      true
    );
  await expect(contractSupervision.connect(validator3).sendValidation(1, true))
    .to.emit(contractSupervision, "ValidationResultSent")
    .withArgs(
      ethers.BigNumber.from(0),
      ethers.BigNumber.from(1),
      validator3.address,
      true
    );
  await expect(contractSupervision.connect(validator4).sendValidation(1, true))
    .to.emit(contractSupervision, "ValidationResultSent")
    .withArgs(
      ethers.BigNumber.from(0),
      ethers.BigNumber.from(1),
      validator4.address,
      true
    );
  await expect(contractSupervision.connect(validator5).sendValidation(1, false))
    .to.emit(contractSupervision, "ValidationResultSent")
    .withArgs(
      ethers.BigNumber.from(0),
      ethers.BigNumber.from(1),
      validator5.address,
      false
    );
  await expect(
    contractSupervision.connect(contentCreator).finalizeValidation(1)
  )
    .to.emit(contractSupervision, "ValidationEnded")
    .withArgs(ethers.BigNumber.from(0), ethers.BigNumber.from(1), true);
}

/// @dev Create content and run validation
async function createContent(
  contentCreator,
  contractSupervision,
  contractRoleManager,
  contractUDAOContent,
  backend,
  validator1,
  validator2,
  validator3,
  validator4,
  validator5
) {
  /// Set KYC
  await contractRoleManager.setKYC(contentCreator.address, true);
  /// part prices must be determined before creating content
  const partPricesArray = [ethers.utils.parseEther("1")];

  /// Create Voucher from redeem.js and use it for creating content
  const createContentVoucherSample = await createContentVoucher(
    contractUDAOContent,
    backend,
    contentCreator,
    partPricesArray,
    coachingEnabled = true,
    coachingRefundable = true,
    redeemType = 1,
    validationScore = 1
  );
  await expect(
    contractUDAOContent
      .connect(contentCreator)
      .createContent(createContentVoucherSample)
  )
    .to.emit(contractUDAOContent, "Transfer") // transfer from null address to minter
    .withArgs(
      "0x0000000000000000000000000000000000000000",
      contentCreator.address,
      0
    );

  /// Start validation and finalize it
  await runValidation(
    contentCreator,
    contractSupervision,
    backend,
    validator1,
    validator2,
    validator3,
    validator4,
    validator5
  );
}
async function createContentVoucher(
  contractUDAOContent,
  backend,
  contentCreator,
  partPrices,
  coachingEnabled = true,
  coachingRefundable = true,
  redeemType = 1,
  validationScore = 1
) {
  // Get the current block timestamp
  const block = await ethers.provider.getBlock("latest");
  // add some minutes to it and convert it to a BigNumber
  const futureBlock = block.timestamp + 1000;
  // convert it to a BigNumber
  const futureBlockBigNumber = ethers.BigNumber.from(futureBlock);

  return await new Redeem({
    contract: contractUDAOContent,
    signer: backend,
  }).createVoucher(
    futureBlockBigNumber,
    partPrices,
    0,
    "udao",
    "ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi",
    contentCreator.address,
    ethers.utils.parseEther("1"),
    "udao",
    coachingEnabled,
    coachingRefundable,
    redeemType,
    validationScore
  );
}
/// TESTS-----------------------------------------------------------------------
describe("Supervision Contract", function () {
  /// VALIDATOR TESTS
  it("Should create content validation", async function () {
    await reDeploy();
    /// part prices must be determined before creating content
    const partPricesArray = [ethers.utils.parseEther("1")];

    /// Create Voucher from redeem.js and use it for creating content
    const createContentVoucherSample = await createContentVoucher(
      contractUDAOContent,
      backend,
      contentCreator,
      partPricesArray
    );
    /// set kyc for content creator
    await contractRoleManager.setKYC(contentCreator.address, true);
    /// create content
    await expect(
      contractUDAOContent
        .connect(contentCreator)
        .createContent(createContentVoucherSample)
    )
      .to.emit(contractSupervision, "ValidationCreated")
      .withArgs(ethers.BigNumber.from(0), ethers.BigNumber.from(1));
  });

  it("Should assign content validation", async function () {
    await reDeploy();
    /// part prices must be determined before creating content
    const partPricesArray = [ethers.utils.parseEther("1")];

    /// Create Voucher from redeem.js and use it for creating content
    const createContentVoucherSample = await createContentVoucher(
      contractUDAOContent,
      backend,
      contentCreator,
      partPricesArray
    );
    /// set kyc for content creator
    await contractRoleManager.setKYC(contentCreator.address, true);
    /// create content
    await expect(
      contractUDAOContent
        .connect(contentCreator)
        .createContent(createContentVoucherSample)
    )
      .to.emit(contractUDAOContent, "Transfer") // transfer from null address to minter
      .withArgs(
        "0x0000000000000000000000000000000000000000",
        contentCreator.address,
        0
      );
    /// assign validation with validator1
    await expect(contractSupervision.connect(validator1).assignValidation(1))
      .to.emit(contractSupervision, "ValidationAssigned")
      .withArgs(
        ethers.BigNumber.from(0),
        ethers.BigNumber.from(1),
        validator1.address
      );
  });

  it("Should send validation result of validator", async function () {
    await reDeploy();
    /// part prices must be determined before creating content
    const partPricesArray = [ethers.utils.parseEther("1")];

    /// Create Voucher from redeem.js and use it for creating content
    const createContentVoucherSample = await createContentVoucher(
      contractUDAOContent,
      backend,
      contentCreator,
      partPricesArray
    );
    /// set kyc for content creator
    await contractRoleManager.setKYC(contentCreator.address, true);
    /// create content
    await expect(
      contractUDAOContent
        .connect(contentCreator)
        .createContent(createContentVoucherSample)
    )
      .to.emit(contractUDAOContent, "Transfer") // transfer from null address to minter
      .withArgs(
        "0x0000000000000000000000000000000000000000",
        contentCreator.address,
        0
      );
    /// assign validation with validator1
    await expect(contractSupervision.connect(validator1).assignValidation(1))
      .to.emit(contractSupervision, "ValidationAssigned")
      .withArgs(
        ethers.BigNumber.from(0),
        ethers.BigNumber.from(1),
        validator1.address
      );
    /// assign validation with validator2
    await expect(contractSupervision.connect(validator2).assignValidation(1))
      .to.emit(contractSupervision, "ValidationAssigned")
      .withArgs(
        ethers.BigNumber.from(0),
        ethers.BigNumber.from(1),
        validator2.address
      );
    /// assign validation with validator3
    await expect(contractSupervision.connect(validator3).assignValidation(1))
      .to.emit(contractSupervision, "ValidationAssigned")
      .withArgs(
        ethers.BigNumber.from(0),
        ethers.BigNumber.from(1),
        validator3.address
      );
    /// assign validation with validator4
    await expect(contractSupervision.connect(validator4).assignValidation(1))
      .to.emit(contractSupervision, "ValidationAssigned")
      .withArgs(
        ethers.BigNumber.from(0),
        ethers.BigNumber.from(1),
        validator4.address
      );
    /// assign validation with validator5
    await expect(contractSupervision.connect(validator5).assignValidation(1))
      .to.emit(contractSupervision, "ValidationAssigned")
      .withArgs(
        ethers.BigNumber.from(0),
        ethers.BigNumber.from(1),
        validator5.address
      );
    /// send validation result with validator1
    await expect(
      contractSupervision.connect(validator1).sendValidation(1, true)
    )
      .to.emit(contractSupervision, "ValidationResultSent")
      .withArgs(
        ethers.BigNumber.from(0),
        ethers.BigNumber.from(1),
        validator1.address,
        true
      );
    /// send validation result with validator2
    await expect(
      contractSupervision.connect(validator2).sendValidation(1, true)
    )
      .to.emit(contractSupervision, "ValidationResultSent")
      .withArgs(
        ethers.BigNumber.from(0),
        ethers.BigNumber.from(1),
        validator2.address,
        true
      );
    /// send validation result with validator3
    await expect(
      contractSupervision.connect(validator3).sendValidation(1, true)
    )
      .to.emit(contractSupervision, "ValidationResultSent")
      .withArgs(
        ethers.BigNumber.from(0),
        ethers.BigNumber.from(1),
        validator3.address,
        true
      );
    /// send validation result with validator4
    await expect(
      contractSupervision.connect(validator4).sendValidation(1, true)
    )
      .to.emit(contractSupervision, "ValidationResultSent")
      .withArgs(
        ethers.BigNumber.from(0),
        ethers.BigNumber.from(1),
        validator4.address,
        true
      );
    /// send validation result with validator5
    await expect(
      contractSupervision.connect(validator5).sendValidation(1, false)
    )
      .to.emit(contractSupervision, "ValidationResultSent")
      .withArgs(
        ethers.BigNumber.from(0),
        ethers.BigNumber.from(1),
        validator5.address,
        false
      );
  });

  it("Should validate content", async function () {
    await reDeploy();
    /// part prices must be determined before creating content
    const partPricesArray = [ethers.utils.parseEther("1")];

    /// Create Voucher from redeem.js and use it for creating content
    const createContentVoucherSample = await createContentVoucher(
      contractUDAOContent,
      backend,
      contentCreator,
      partPricesArray
    );
    /// set kyc for content creator
    await contractRoleManager.setKYC(contentCreator.address, true);
    /// create content
    await expect(
      contractUDAOContent
        .connect(contentCreator)
        .createContent(createContentVoucherSample)
    )
      .to.emit(contractUDAOContent, "Transfer") // transfer from null address to minter
      .withArgs(
        "0x0000000000000000000000000000000000000000",
        contentCreator.address,
        0
      );
    /// assign validation with validator1
    await expect(contractSupervision.connect(validator1).assignValidation(1))
      .to.emit(contractSupervision, "ValidationAssigned")
      .withArgs(
        ethers.BigNumber.from(0),
        ethers.BigNumber.from(1),
        validator1.address
      );
    /// assign validation with validator2
    await expect(contractSupervision.connect(validator2).assignValidation(1))
      .to.emit(contractSupervision, "ValidationAssigned")
      .withArgs(
        ethers.BigNumber.from(0),
        ethers.BigNumber.from(1),
        validator2.address
      );
    /// assign validation with validator3
    await expect(contractSupervision.connect(validator3).assignValidation(1))
      .to.emit(contractSupervision, "ValidationAssigned")
      .withArgs(
        ethers.BigNumber.from(0),
        ethers.BigNumber.from(1),
        validator3.address
      );
    /// assign validation with validator4
    await expect(contractSupervision.connect(validator4).assignValidation(1))
      .to.emit(contractSupervision, "ValidationAssigned")
      .withArgs(
        ethers.BigNumber.from(0),
        ethers.BigNumber.from(1),
        validator4.address
      );
    /// assign validation with validator5
    await expect(contractSupervision.connect(validator5).assignValidation(1))
      .to.emit(contractSupervision, "ValidationAssigned")
      .withArgs(
        ethers.BigNumber.from(0),
        ethers.BigNumber.from(1),
        validator5.address
      );
    /// send validation result with validator1
    await expect(
      contractSupervision.connect(validator1).sendValidation(1, true)
    )
      .to.emit(contractSupervision, "ValidationResultSent")
      .withArgs(
        ethers.BigNumber.from(0),
        ethers.BigNumber.from(1),
        validator1.address,
        true
      );
    /// send validation result with validator2
    await expect(
      contractSupervision.connect(validator2).sendValidation(1, true)
    )
      .to.emit(contractSupervision, "ValidationResultSent")
      .withArgs(
        ethers.BigNumber.from(0),
        ethers.BigNumber.from(1),
        validator2.address,
        true
      );
    /// send validation result with validator3
    await expect(
      contractSupervision.connect(validator3).sendValidation(1, true)
    )
      .to.emit(contractSupervision, "ValidationResultSent")
      .withArgs(
        ethers.BigNumber.from(0),
        ethers.BigNumber.from(1),
        validator3.address,
        true
      );
    /// send validation result with validator4
    await expect(
      contractSupervision.connect(validator4).sendValidation(1, true)
    )
      .to.emit(contractSupervision, "ValidationResultSent")
      .withArgs(
        ethers.BigNumber.from(0),
        ethers.BigNumber.from(1),
        validator4.address,
        true
      );
    /// send validation result with validator5
    await expect(
      contractSupervision.connect(validator5).sendValidation(1, false)
    )
      .to.emit(contractSupervision, "ValidationResultSent")
      .withArgs(
        ethers.BigNumber.from(0),
        ethers.BigNumber.from(1),
        validator5.address,
        false
      );
    /// finalize validation
    await expect(
      contractSupervision.connect(contentCreator).finalizeValidation(1)
    )
      .to.emit(contractSupervision, "ValidationEnded")
      .withArgs(ethers.BigNumber.from(0), ethers.BigNumber.from(1), true);
  });

  it("Should return validator's score", async function () {
    await reDeploy();
    /// part prices must be determined before creating content
    const partPricesArray = [ethers.utils.parseEther("1")];

    /// Create Voucher from redeem.js and use it for creating content
    const createContentVoucherSample = await createContentVoucher(
      contractUDAOContent,
      backend,
      contentCreator,
      partPricesArray,
      coachingEnabled = true,
      coachingRefundable = true,
      redeemType = 1,
      validationScore = 50
    );
    /// set kyc for content creator
    await contractRoleManager.setKYC(contentCreator.address, true);
    /// create content
    await expect(
      contractUDAOContent
        .connect(contentCreator)
        .createContent(createContentVoucherSample)
    )
      .to.emit(contractUDAOContent, "Transfer") // transfer from null address to minter
      .withArgs(
        "0x0000000000000000000000000000000000000000",
        contentCreator.address,
        0
      );
    /// assign validation with validator1
    await expect(contractSupervision.connect(validator1).assignValidation(1))
      .to.emit(contractSupervision, "ValidationAssigned")
      .withArgs(
        ethers.BigNumber.from(0),
        ethers.BigNumber.from(1),
        validator1.address
      );
    /// assign validation with validator2
    await expect(contractSupervision.connect(validator2).assignValidation(1))
      .to.emit(contractSupervision, "ValidationAssigned")
      .withArgs(
        ethers.BigNumber.from(0),
        ethers.BigNumber.from(1),
        validator2.address
      );
    /// assign validation with validator3
    await expect(contractSupervision.connect(validator3).assignValidation(1))
      .to.emit(contractSupervision, "ValidationAssigned")
      .withArgs(
        ethers.BigNumber.from(0),
        ethers.BigNumber.from(1),
        validator3.address
      );
    /// assign validation with validator4
    await expect(contractSupervision.connect(validator4).assignValidation(1))
      .to.emit(contractSupervision, "ValidationAssigned")
      .withArgs(
        ethers.BigNumber.from(0),
        ethers.BigNumber.from(1),
        validator4.address
      );
    /// assign validation with validator5
    await expect(contractSupervision.connect(validator5).assignValidation(1))
      .to.emit(contractSupervision, "ValidationAssigned")
      .withArgs(
        ethers.BigNumber.from(0),
        ethers.BigNumber.from(1),
        validator5.address
      );
    /// send validation result with validator1
    await expect(
      contractSupervision.connect(validator1).sendValidation(1, true)
    )
      .to.emit(contractSupervision, "ValidationResultSent")
      .withArgs(
        ethers.BigNumber.from(0),
        ethers.BigNumber.from(1),
        validator1.address,
        true
      );
    /// send validation result with validator2
    await expect(
      contractSupervision.connect(validator2).sendValidation(1, true)
    )
      .to.emit(contractSupervision, "ValidationResultSent")
      .withArgs(
        ethers.BigNumber.from(0),
        ethers.BigNumber.from(1),
        validator2.address,
        true
      );
    /// send validation result with validator3
    await expect(
      contractSupervision.connect(validator3).sendValidation(1, true)
    )
      .to.emit(contractSupervision, "ValidationResultSent")
      .withArgs(
        ethers.BigNumber.from(0),
        ethers.BigNumber.from(1),
        validator3.address,
        true
      );
    /// send validation result with validator4
    await expect(
      contractSupervision.connect(validator4).sendValidation(1, true)
    )
      .to.emit(contractSupervision, "ValidationResultSent")
      .withArgs(
        ethers.BigNumber.from(0),
        ethers.BigNumber.from(1),
        validator4.address,
        true
      );
    /// send validation result with validator5
    await expect(
      contractSupervision.connect(validator5).sendValidation(1, false)
    )
      .to.emit(contractSupervision, "ValidationResultSent")
      .withArgs(
        ethers.BigNumber.from(0),
        ethers.BigNumber.from(1),
        validator5.address,
        false
      );
    /// finalize validation
    await expect(
      contractSupervision.connect(contentCreator).finalizeValidation(1)
    )
      .to.emit(contractSupervision, "ValidationEnded")
      .withArgs(ethers.BigNumber.from(0), ethers.BigNumber.from(1), true);
    /// check validation score of validator1
    expect(
      await contractSupervision.getValidatorScore(validator1.address, 0)
    ).to.eql(ethers.BigNumber.from(50));
  });

  it("Should return total validation score", async function () {
    await reDeploy();
    /// part prices must be determined before creating content
    const partPricesArray = [ethers.utils.parseEther("1")];

    /// Create Voucher from redeem.js and use it for creating content
    const createContentVoucherSample = await createContentVoucher(
      contractUDAOContent,
      backend,
      contentCreator,
      partPricesArray,
      coachingEnabled = true,
      coachingRefundable = true,
      redeemType = 1,
      validationScore = 50
    );
    /// set kyc for content creator
    await contractRoleManager.setKYC(contentCreator.address, true);
    /// create content
    await expect(
      contractUDAOContent
        .connect(contentCreator)
        .createContent(createContentVoucherSample)
    )
      .to.emit(contractUDAOContent, "Transfer") // transfer from null address to minter
      .withArgs(
        "0x0000000000000000000000000000000000000000",
        contentCreator.address,
        0
      );
    /// assign validation with validator1
    await expect(contractSupervision.connect(validator1).assignValidation(1))
      .to.emit(contractSupervision, "ValidationAssigned")
      .withArgs(
        ethers.BigNumber.from(0),
        ethers.BigNumber.from(1),
        validator1.address
      );
    /// assign validation with validator2
    await expect(contractSupervision.connect(validator2).assignValidation(1))
      .to.emit(contractSupervision, "ValidationAssigned")
      .withArgs(
        ethers.BigNumber.from(0),
        ethers.BigNumber.from(1),
        validator2.address
      );
    /// assign validation with validator3
    await expect(contractSupervision.connect(validator3).assignValidation(1))
      .to.emit(contractSupervision, "ValidationAssigned")
      .withArgs(
        ethers.BigNumber.from(0),
        ethers.BigNumber.from(1),
        validator3.address
      );
    /// assign validation with validator4
    await expect(contractSupervision.connect(validator4).assignValidation(1))
      .to.emit(contractSupervision, "ValidationAssigned")
      .withArgs(
        ethers.BigNumber.from(0),
        ethers.BigNumber.from(1),
        validator4.address
      );
    /// assign validation with validator5
    await expect(contractSupervision.connect(validator5).assignValidation(1))
      .to.emit(contractSupervision, "ValidationAssigned")
      .withArgs(
        ethers.BigNumber.from(0),
        ethers.BigNumber.from(1),
        validator5.address
      );
    /// send validation result with validator1
    await expect(
      contractSupervision.connect(validator1).sendValidation(1, true)
    )
      .to.emit(contractSupervision, "ValidationResultSent")
      .withArgs(
        ethers.BigNumber.from(0),
        ethers.BigNumber.from(1),
        validator1.address,
        true
      );
    /// send validation result with validator2
    await expect(
      contractSupervision.connect(validator2).sendValidation(1, true)
    )
      .to.emit(contractSupervision, "ValidationResultSent")
      .withArgs(
        ethers.BigNumber.from(0),
        ethers.BigNumber.from(1),
        validator2.address,
        true
      );
    /// send validation result with validator3
    await expect(
      contractSupervision.connect(validator3).sendValidation(1, true)
    )
      .to.emit(contractSupervision, "ValidationResultSent")
      .withArgs(
        ethers.BigNumber.from(0),
        ethers.BigNumber.from(1),
        validator3.address,
        true
      );
    /// send validation result with validator4
    await expect(
      contractSupervision.connect(validator4).sendValidation(1, true)
    )
      .to.emit(contractSupervision, "ValidationResultSent")
      .withArgs(
        ethers.BigNumber.from(0),
        ethers.BigNumber.from(1),
        validator4.address,
        true
      );
    /// send validation result with validator5
    await expect(
      contractSupervision.connect(validator5).sendValidation(1, false)
    )
      .to.emit(contractSupervision, "ValidationResultSent")
      .withArgs(
        ethers.BigNumber.from(0),
        ethers.BigNumber.from(1),
        validator5.address,
        false
      );
    /// finalize validation
    await expect(
      contractSupervision.connect(contentCreator).finalizeValidation(1)
    )
      .to.emit(contractSupervision, "ValidationEnded")
      .withArgs(ethers.BigNumber.from(0), ethers.BigNumber.from(1), true);
    /// get total validation score
    expect(await contractSupervision.getTotalValidationScore()).to.eql(
      ethers.BigNumber.from(200)
    );
  });
  /*
  it("Should not create validation if content does not exist", async function () {
    await reDeploy();
    /// set KYC for content creator
    await contractRoleManager.setKYC(contentCreator.address, true);
    /// create validation
    await expect(
      contractSupervision.connect(contentCreator).createValidation(0, 50)
    ).to.revertedWith("ERC721: invalid token ID");
  });

  it("Should fail to create content validation when Token owner isn't KYCed", async function () {
    await reDeploy();
    /// Set KYC to true for content creator
    await contractRoleManager.setKYC(contentCreator.address, true);
    /// part prices must be determined before creating content
    const partPricesArray = [
      ethers.utils.parseEther("1"),
      ethers.utils.parseEther("1"),
    ];

    /// Create Voucher from redeem.js and use it for creating content
    const createContentVoucherSample = await createContentVoucher(
      contractUDAOContent,
      backend,
      contentCreator,
      partPricesArray
    );
    /// Create content
    await expect(
      contractUDAOContent
        .connect(contentCreator)
        .createContent(createContentVoucherSample)
    )
      .to.emit(contractUDAOContent, "Transfer") // transfer from null address to minter
      .withArgs(
        "0x0000000000000000000000000000000000000000",
        contentCreator.address,
        0
      );

    /// Set KYC to false for content creator
    await contractRoleManager.setKYC(contentCreator.address, false);

    /// Create validation
    await expect(
      contractSupervision.connect(contentCreator).createValidation(0, 50)
    ).to.revertedWith("Token owner is not KYCed");
  });

  it("Should fail to create content validation when Token owner is banned", async function () {
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
    /// Set KYC to true for content creator
    await contractRoleManager.setKYC(contentCreator.address, true);
    /// part prices must be determined before creating content
    const partPricesArray = [
      ethers.utils.parseEther("1"),
      ethers.utils.parseEther("1"),
    ];

    /// Create Voucher from redeem.js and use it for creating content
    const createContentVoucherSample = await createContentVoucher(
      contractUDAOContent,
      backend,
      contentCreator,
      partPricesArray
    );
    /// Create content
    await expect(
      contractUDAOContent
        .connect(contentCreator)
        .createContent(createContentVoucherSample)
    )
      .to.emit(contractUDAOContent, "Transfer") // transfer from null address to minter
      .withArgs(
        "0x0000000000000000000000000000000000000000",
        contentCreator.address,
        0
      );

    /// Ban the content creator
    await contractRoleManager.setBan(contentCreator.address, true);

    /// Create validation
    await expect(
      contractSupervision.connect(contentCreator).createValidation(0, 50)
    ).to.revertedWith("Token owner is banned");
  });
  */
  /// JUROR TESTS
  it("Should create new dispute asd", async function () {
    await reDeploy();

    /// @dev Case settings
    const caseScope = 1;
    const caseQuestion = "Should we remove this content?";
    const caseTokenRelated = true;
    const caseTokenId = 0;
    // bytes empty data
    const emptyData = "0x";
    // random address
    const randomAddress = ethers.constants.AddressZero;
    /// @dev Create dispute
    await expect(
      contractSupervision
        .connect(backend)
        .createDispute(
          caseScope,
          caseQuestion,
          caseTokenRelated,
          caseTokenId,
          emptyData,
          randomAddress
        )
    )
      .to.emit(contractSupervision, "DisputeCreated")
      .withArgs(1, caseScope, caseQuestion);
  });

  it("Should a juror be able to assign a dispute to himself", async function () {
    await reDeploy();
    /// Set KYC
    await contractRoleManager.setKYC(jurorMember1.address, true);

    /// @dev Dispute settings
    const caseScope = 1;
    const caseQuestion = "Should we remove this content?";
    const caseTokenRelated = true;
    const caseTokenId = 0;
    const emptyData = "0x";
    const randomAddress = ethers.constants.AddressZero;
    /// @dev Create content
    await createContent(
      contentCreator,
      contractSupervision,
      contractRoleManager,
      contractUDAOContent,
      backend,
      validator1,
      validator2,
      validator3,
      validator4,
      validator5
    );
    /// @dev Create dispute
    await contractSupervision
      .connect(backend)
      .createDispute(
        caseScope,
        caseQuestion,
        caseTokenRelated,
        caseTokenId,
        emptyData,
        randomAddress
      );
    /// @dev Assign dispute to juror
    const disputeId = 1;
    await expect(
      contractSupervision.connect(jurorMember1).assignDispute(disputeId)
    )
      .to.emit(contractSupervision, "DisputeAssigned")
      .withArgs(disputeId, jurorMember1.address);
  });

  it("Should allow jurors to assign the dispute only once", async function () {
    await reDeploy();
    /// Set KYC
    await contractRoleManager.setKYC(jurorMember1.address, true);

    /// @dev Dispute settings
    const caseScope = 1;
    const caseQuestion = "Should we remove this content?";
    const caseTokenRelated = true;
    const caseTokenId = 0;
    const emptyData = "0x";
    const randomAddress = ethers.constants.AddressZero;

    /// @dev Create content
    await createContent(
      contentCreator,
      contractSupervision,
      contractRoleManager,
      contractUDAOContent,
      backend,
      validator1,
      validator2,
      validator3,
      validator4,
      validator5
    );
    /// @dev Create dispute
    await contractSupervision
      .connect(backend)
      .createDispute(
        caseScope,
        caseQuestion,
        caseTokenRelated,
        caseTokenId,
        emptyData,
        randomAddress
      );
    /// @dev Assign dispute to juror
    const disputeId = 1;
    await contractSupervision.connect(jurorMember1).assignDispute(disputeId);
    /// @dev Assign dispute to juror again
    await expect(
      contractSupervision.connect(jurorMember1).assignDispute(disputeId)
    ).to.be.revertedWith("You already have an assigned dispute");
  });

  it("Should not allow a juror to assign the dispute to himself if he was also the validator of the content", async function () {
    await reDeploy();
    /// Set KYC
    await contractRoleManager.setKYC(jurorMember1.address, true);

    /// @dev Dispute settings
    const caseScope = 1;
    const caseQuestion = "Should we remove this content?";
    const caseTokenRelated = true;
    const caseTokenId = 0;
    const emptyData = "0x";
    const randomAddress = ethers.constants.AddressZero;
    /// @dev Give validator role to jurorMember1
    const VALIDATOR_ROLE = ethers.utils.keccak256(
      ethers.utils.toUtf8Bytes("VALIDATOR_ROLE")
    );
    await contractRoleManager.grantRole(VALIDATOR_ROLE, jurorMember1.address);
    /// @dev Create content, here jurorMember1 is also the validator
    await createContent(
      contentCreator,
      contractSupervision,
      contractRoleManager,
      contractUDAOContent,
      backend,
      jurorMember1,
      validator2,
      validator3,
      validator4,
      validator5
    );
    /// @dev Create dispute
    await contractSupervision
      .connect(backend)
      .createDispute(
        caseScope,
        caseQuestion,
        caseTokenRelated,
        caseTokenId,
        emptyData,
        randomAddress
      );
    /// @dev Assign dispute to juror and fail
    const disputeId = 1;
    await expect(
      contractSupervision.connect(jurorMember1).assignDispute(disputeId)
    ).to.be.revertedWith("You can't assign content you validated!");
  });

  it("Should not allow non-jurors to assign the dispute to themselves", async function () {
    await reDeploy();

    /// @dev Dispute settings
    const caseScope = 1;
    const caseQuestion = "Should we remove this content?";
    const caseTokenRelated = true;
    const caseTokenId = 0;
    const emptyData = "0x";
    const randomAddress = ethers.constants.AddressZero;

    /// @dev Create content
    await createContent(
      contentCreator,
      contractSupervision,
      contractRoleManager,
      contractUDAOContent,
      backend,
      validator1,
      validator2,
      validator3,
      validator4,
      validator5
    );
    /// @dev Create dispute
    await contractSupervision
      .connect(backend)
      .createDispute(
        caseScope,
        caseQuestion,
        caseTokenRelated,
        caseTokenId,
        emptyData,
        randomAddress
      );
    /// @dev Assign dispute to juror
    const hashedJUROR_ROLE =
      "0x2ea44624af573c71d23003c0751808a79f405c6b5fddb794897688d59c07918b";
    const disputeId = 1;
    await expect(
      contractSupervision.connect(backend).assignDispute(disputeId)
    ).to.be.revertedWith(
      "Only jurors can assign dispute"
    );
  });

  it("Should allow jurors to send dispute result", async function () {
    await reDeploy();
    /// Set KYC
    await contractRoleManager.setKYC(jurorMember1.address, true);

    /// @dev Dispute settings
    const caseScope = 1;
    const caseQuestion = "Should we remove this content?";
    const caseTokenRelated = true;
    const caseTokenId = 0;
    const emptyData = "0x";
    const randomAddress = ethers.constants.AddressZero;

    /// @dev Create content
    await createContent(
      contentCreator,
      contractSupervision,
      contractRoleManager,
      contractUDAOContent,
      backend,
      validator1,
      validator2,
      validator3,
      validator4,
      validator5
    );
    /// @dev Create dispute
    await contractSupervision
      .connect(backend)
      .createDispute(
        caseScope,
        caseQuestion,
        caseTokenRelated,
        caseTokenId,
        emptyData,
        randomAddress
      );
    /// @dev Assign dispute to juror
    const disputeId = 1;
    await contractSupervision.connect(jurorMember1).assignDispute(disputeId);
    /// @dev Send dispute result
    const disputeResultOfJurorMember1 = 1;
    await expect(
      contractSupervision
        .connect(jurorMember1)
        .sendDisputeResult(disputeId, disputeResultOfJurorMember1)
    )
      .to.emit(contractSupervision, "DisputeResultSent")
      .withArgs(disputeId, true, jurorMember1.address);
  });

  it("Should allow jurors to send dispute result only once", async function () {
    await reDeploy();
    /// Set KYC
    await contractRoleManager.setKYC(jurorMember1.address, true);

    /// @dev Dispute settings
    const caseScope = 1;
    const caseQuestion = "Should we remove this content?";
    const caseTokenRelated = true;
    const caseTokenId = 0;
    const emptyData = "0x";
    const randomAddress = ethers.constants.AddressZero;

    /// @dev Create content
    await createContent(
      contentCreator,
      contractSupervision,
      contractRoleManager,
      contractUDAOContent,
      backend,
      validator1,
      validator2,
      validator3,
      validator4,
      validator5
    );
    /// @dev Create dispute
    await contractSupervision
      .connect(backend)
      .createDispute(
        caseScope,
        caseQuestion,
        caseTokenRelated,
        caseTokenId,
        emptyData,
        randomAddress
      );
    /// @dev Assign dispute to juror
    const disputeId = 1;
    await contractSupervision.connect(jurorMember1).assignDispute(disputeId);
    /// @dev Send dispute result
    const disputeResultOfJurorMember1 = 1;
    await contractSupervision
      .connect(jurorMember1)
      .sendDisputeResult(disputeId, disputeResultOfJurorMember1);
    /// @dev Send dispute result again
    await expect(
      contractSupervision
        .connect(jurorMember1)
        .sendDisputeResult(disputeId, disputeResultOfJurorMember1)
    ).to.be.revertedWith("This dispute is not assigned to this wallet");
  });

  it("Should allow multiple jurors to assing and send dispute results and allow anyone to finalize", async function () {
    await reDeploy();
    /// Set KYC
    await contractRoleManager.setKYC(jurorMember1.address, true);
    await contractRoleManager.setKYC(jurorMember2.address, true);
    await contractRoleManager.setKYC(jurorMember3.address, true);
    /// @dev Dispute settings
    const caseScope = 1;
    const caseQuestion = "Should we remove this content?";
    const caseTokenRelated = true;
    const caseTokenId = 0;
    const emptyData = "0x";
    // zero address
    const randomAddress = ethers.constants.AddressZero;

    /// @dev Create content
    await createContent(
      contentCreator,
      contractSupervision,
      contractRoleManager,
      contractUDAOContent,
      backend,
      validator1,
      validator2,
      validator3,
      validator4,
      validator5
    );
    /// @dev Create dispute
    await contractSupervision
      .connect(backend)
      .createDispute(
        caseScope,
        caseQuestion,
        caseTokenRelated,
        caseTokenId,
        emptyData,
        randomAddress
      );
    /// @dev Assign dispute to juror
    const disputeId = 1;
    await contractSupervision.connect(jurorMember1).assignDispute(disputeId);
    await contractSupervision.connect(jurorMember2).assignDispute(disputeId);
    await contractSupervision.connect(jurorMember3).assignDispute(disputeId);
    /// @dev Send dispute result
    const disputeResultOfJurorMember1 = 1;
    const disputeResultOfJurorMember2 = 1;
    const disputeResultOfJurorMember3 = 1;
    const disputeVerdict = true;
    await contractSupervision
      .connect(jurorMember1)
      .sendDisputeResult(disputeId, disputeResultOfJurorMember1);
    await expect(
      contractSupervision
        .connect(jurorMember2)
        .sendDisputeResult(disputeId, disputeResultOfJurorMember2)
    )
      .to.emit(contractSupervision, "DisputeEnded")
      .withArgs(disputeId, disputeVerdict);
    await expect(
      contractSupervision
        .connect(jurorMember3)
        .sendDisputeResult(disputeId, disputeResultOfJurorMember3)
    )
      .to.emit(contractSupervision, "LateJurorScoreRecorded")
      .withArgs(disputeId, jurorMember3.address);
  });

  it("Should the final verdict return false if 2 out of 3 jurors vote against the dispute question", async function () {
    await reDeploy();
    /// Set KYC
    await contractRoleManager.setKYC(jurorMember1.address, true);
    await contractRoleManager.setKYC(jurorMember2.address, true);
    await contractRoleManager.setKYC(jurorMember3.address, true);
    /// @dev Dispute settings
    const caseScope = 1;
    const caseQuestion = "Should we remove this content?";
    const caseTokenRelated = true;
    const caseTokenId = 0;
    const emptyData = "0x";
    const randomAddress = ethers.constants.AddressZero;

    /// @dev Create content
    await createContent(
      contentCreator,
      contractSupervision,
      contractRoleManager,
      contractUDAOContent,
      backend,
      validator1,
      validator2,
      validator3,
      validator4,
      validator5
    );
    /// @dev Create dispute
    await contractSupervision
      .connect(backend)
      .createDispute(
        caseScope,
        caseQuestion,
        caseTokenRelated,
        caseTokenId,
        emptyData,
        randomAddress
      );
    /// @dev Assign dispute to juror
    const disputeId = 1;
    await contractSupervision.connect(jurorMember1).assignDispute(disputeId);
    await contractSupervision.connect(jurorMember2).assignDispute(disputeId);
    await contractSupervision.connect(jurorMember3).assignDispute(disputeId);
    /// @dev Send dispute result
    const disputeResultOfJurorMember1 = 1;
    const disputeResultOfJurorMember2 = 0;
    const disputeResultOfJurorMember3 = 0;
    const disputeVerdict = false;
    await contractSupervision
      .connect(jurorMember1)
      .sendDisputeResult(disputeId, disputeResultOfJurorMember1);
    await contractSupervision
      .connect(jurorMember2)
      .sendDisputeResult(disputeId, disputeResultOfJurorMember2);
    await expect(
      contractSupervision
        .connect(jurorMember3)
        .sendDisputeResult(disputeId, disputeResultOfJurorMember3)
    )
      .to.emit(contractSupervision, "DisputeEnded")
      .withArgs(disputeId, disputeVerdict);
  });

  it("Should the final verdict return true if 2 out of 3 jurors vote for the dispute question", async function () {
    await reDeploy();
    /// Set KYC
    await contractRoleManager.setKYC(jurorMember1.address, true);
    await contractRoleManager.setKYC(jurorMember2.address, true);
    await contractRoleManager.setKYC(jurorMember3.address, true);
    /// @dev Dispute settings
    const caseScope = 1;
    const caseQuestion = "Should we remove this content?";
    const caseTokenRelated = true;
    const caseTokenId = 0;
    const emptyData = "0x";
    const randomAddress = ethers.constants.AddressZero;

    /// @dev Create content
    await createContent(
      contentCreator,
      contractSupervision,
      contractRoleManager,
      contractUDAOContent,
      backend,
      validator1,
      validator2,
      validator3,
      validator4,
      validator5
    );
    /// @dev Create dispute
    await contractSupervision
      .connect(backend)
      .createDispute(
        caseScope,
        caseQuestion,
        caseTokenRelated,
        caseTokenId,
        emptyData,
        randomAddress
      );
    /// @dev Assign dispute to juror
    const disputeId = 1;
    await contractSupervision.connect(jurorMember1).assignDispute(disputeId);
    await contractSupervision.connect(jurorMember2).assignDispute(disputeId);
    await contractSupervision.connect(jurorMember3).assignDispute(disputeId);
    /// @dev Send dispute result
    const disputeResultOfJurorMember1 = 1;
    const disputeResultOfJurorMember2 = 1;
    const disputeResultOfJurorMember3 = 0;
    const disputeVerdict = true;
    await contractSupervision
      .connect(jurorMember1)
      .sendDisputeResult(disputeId, disputeResultOfJurorMember1);
    await expect(
      contractSupervision
        .connect(jurorMember2)
        .sendDisputeResult(disputeId, disputeResultOfJurorMember2)
    )
      .to.emit(contractSupervision, "DisputeEnded")
      .withArgs(disputeId, disputeVerdict);
    await expect(
      contractSupervision
        .connect(jurorMember3)
        .sendDisputeResult(disputeId, disputeResultOfJurorMember3)
    )
      .to.emit(contractSupervision, "LateJurorScoreRecorded")
      .withArgs(disputeId, jurorMember3.address);
  });

  it("Should return successful and unsuccessful dispute results of jurors correctly", async function () {
    await reDeploy();
    /// Set KYC
    await contractRoleManager.setKYC(jurorMember1.address, true);
    await contractRoleManager.setKYC(jurorMember2.address, true);
    await contractRoleManager.setKYC(jurorMember3.address, true);
    /// @dev Dispute settings
    const caseScope = 1;
    const caseQuestion = "Should we remove this content?";
    const caseTokenRelated = true;
    const caseTokenId = 0;
    const emptyData = "0x";
    const randomAddress = ethers.constants.AddressZero;

    /// @dev Create content
    await createContent(
      contentCreator,
      contractSupervision,
      contractRoleManager,
      contractUDAOContent,
      backend,
      validator1,
      validator2,
      validator3,
      validator4,
      validator5
    );
    /// @dev Create dispute
    await contractSupervision
      .connect(backend)
      .createDispute(
        caseScope,
        caseQuestion,
        caseTokenRelated,
        caseTokenId,
        emptyData,
        randomAddress
      );
    /// @dev Assign dispute to juror
    const disputeId = 1;
    await contractSupervision.connect(jurorMember1).assignDispute(disputeId);
    await contractSupervision.connect(jurorMember2).assignDispute(disputeId);
    await contractSupervision.connect(jurorMember3).assignDispute(disputeId);
    /// @dev Send dispute result
    const disputeResultOfJurorMember1 = 1;
    const disputeResultOfJurorMember2 = 0;
    const disputeResultOfJurorMember3 = 0;
    const disputeVerdict = false;
    await contractSupervision
      .connect(jurorMember1)
      .sendDisputeResult(disputeId, disputeResultOfJurorMember1);
    await contractSupervision
      .connect(jurorMember2)
      .sendDisputeResult(disputeId, disputeResultOfJurorMember2);
    await expect(
      contractSupervision
        .connect(jurorMember3)
        .sendDisputeResult(disputeId, disputeResultOfJurorMember3)
    )
      .to.emit(contractSupervision, "DisputeEnded")
      .withArgs(disputeId, disputeVerdict);

    /// @dev Check number of successful and unsuccessful dispute results of jurors
    const disputeResultsOfJuror1 = await contractSupervision.getCaseResults(
      jurorMember1.address
    );
    const disputeResultsOfJuror2 = await contractSupervision.getCaseResults(
      jurorMember2.address
    );
    const disputeResultsOfJuror3 = await contractSupervision.getCaseResults(
      jurorMember3.address
    );
    const successfulIndex = 0;
    const unsuccessfulIndex = 1;
    expect(disputeResultsOfJuror1[successfulIndex]).to.equal(0);
    expect(disputeResultsOfJuror1[unsuccessfulIndex]).to.equal(1);
    expect(disputeResultsOfJuror2[successfulIndex]).to.equal(1);
    expect(disputeResultsOfJuror2[unsuccessfulIndex]).to.equal(0);
    expect(disputeResultsOfJuror3[successfulIndex]).to.equal(1);
    expect(disputeResultsOfJuror3[unsuccessfulIndex]).to.equal(0);
  });

  it("Should return the scores of jurors correctly", async function () {
    await reDeploy();
    /// Set KYC
    await contractRoleManager.setKYC(jurorMember1.address, true);
    await contractRoleManager.setKYC(jurorMember2.address, true);
    await contractRoleManager.setKYC(jurorMember3.address, true);
    /// @dev Dispute settings
    const caseScope = 1;
    const caseQuestion = "Should we remove this content?";
    const caseTokenRelated = true;
    const caseTokenId = 0;
    const emptyData = "0x";
    const randomAddress = ethers.constants.AddressZero;

    /// @dev Create content
    await createContent(
      contentCreator,
      contractSupervision,
      contractRoleManager,
      contractUDAOContent,
      backend,
      validator1,
      validator2,
      validator3,
      validator4,
      validator5
    );
    /// @dev Create dispute
    await contractSupervision
      .connect(backend)
      .createDispute(
        caseScope,
        caseQuestion,
        caseTokenRelated,
        caseTokenId,
        emptyData,
        randomAddress
      );
    /// @dev Assign dispute to juror
    const disputeId = 1;
    await contractSupervision.connect(jurorMember1).assignDispute(disputeId);
    await contractSupervision.connect(jurorMember2).assignDispute(disputeId);
    await contractSupervision.connect(jurorMember3).assignDispute(disputeId);
    /// @dev Send dispute result
    const disputeResultOfJurorMember1 = 1;
    const disputeResultOfJurorMember2 = 0;
    const disputeResultOfJurorMember3 = 0;
    const disputeVerdict = false;
    await contractSupervision
      .connect(jurorMember1)
      .sendDisputeResult(disputeId, disputeResultOfJurorMember1);
    await contractSupervision
      .connect(jurorMember2)
      .sendDisputeResult(disputeId, disputeResultOfJurorMember2);
    await expect(
      contractSupervision
        .connect(jurorMember3)
        .sendDisputeResult(disputeId, disputeResultOfJurorMember3)
    )
      .to.emit(contractSupervision, "DisputeEnded")
      .withArgs(disputeId, disputeVerdict);

    /// @dev Check scores of jurors in this round
    const currentDistributionRound =
      await contractSupervision.distributionRound();
    const scoreOfJuror1 = await contractSupervision.getJurorScore(
      jurorMember1.address,
      currentDistributionRound
    );
    const scoreOfJuror2 = await contractSupervision.getJurorScore(
      jurorMember2.address,
      currentDistributionRound
    );
    const scoreOfJuror3 = await contractSupervision.getJurorScore(
      jurorMember3.address,
      currentDistributionRound
    );
    expect(scoreOfJuror1).to.equal(0);
    expect(scoreOfJuror2).to.equal(1);
    expect(scoreOfJuror3).to.equal(1);
  });

  it("Should return the scores of jurors correctly after multiple rounds", async function () {
    await reDeploy();
    /// Set KYC
    await contractRoleManager.setKYC(jurorMember1.address, true);
    await contractRoleManager.setKYC(jurorMember2.address, true);
    await contractRoleManager.setKYC(jurorMember3.address, true);
    /// @dev Dispute settings
    const caseScope = 1;
    const caseQuestion = "Should we remove this content?";
    const caseTokenRelated = true;
    const caseTokenId = 0;
    const emptyData = "0x";
    const randomAddress = ethers.constants.AddressZero;

    /// @dev Create content
    await createContent(
      contentCreator,
      contractSupervision,
      contractRoleManager,
      contractUDAOContent,
      backend,
      validator1,
      validator2,
      validator3,
      validator4,
      validator5
    );
    /// @dev Create dispute
    await contractSupervision
      .connect(backend)
      .createDispute(
        caseScope,
        caseQuestion,
        caseTokenRelated,
        caseTokenId,
        emptyData,
        randomAddress
      );
    /// @dev Assign dispute to juror
    const disputeId = 1;
    await contractSupervision.connect(jurorMember1).assignDispute(disputeId);
    await contractSupervision.connect(jurorMember2).assignDispute(disputeId);
    await contractSupervision.connect(jurorMember3).assignDispute(disputeId);
    /// @dev Send dispute result
    const disputeResultOfJurorMember1 = 1;
    const disputeResultOfJurorMember2 = 0;
    const disputeResultOfJurorMember3 = 0;
    const disputeVerdict = false;
    await contractSupervision
      .connect(jurorMember1)
      .sendDisputeResult(disputeId, disputeResultOfJurorMember1);
    await contractSupervision
      .connect(jurorMember2)
      .sendDisputeResult(disputeId, disputeResultOfJurorMember2);
    await expect(
      contractSupervision
        .connect(jurorMember3)
        .sendDisputeResult(disputeId, disputeResultOfJurorMember3)
    )
      .to.emit(contractSupervision, "DisputeEnded")
      .withArgs(disputeId, disputeVerdict);

    /// @dev Check scores of jurors in this round
    const currentDistributionRound =
      await contractSupervision.distributionRound();
    const scoreOfJuror1 = await contractSupervision.getJurorScore(
      jurorMember1.address,
      currentDistributionRound
    );
    const scoreOfJuror2 = await contractSupervision.getJurorScore(
      jurorMember2.address,
      currentDistributionRound
    );
    const scoreOfJuror3 = await contractSupervision.getJurorScore(
      jurorMember3.address,
      currentDistributionRound
    );
    expect(scoreOfJuror1).to.equal(0);
    expect(scoreOfJuror2).to.equal(1);
    expect(scoreOfJuror3).to.equal(1);

    /// @dev Create dispute
    await contractSupervision
      .connect(backend)
      .createDispute(
        caseScope,
        caseQuestion,
        caseTokenRelated,
        caseTokenId,
        emptyData,
        randomAddress
      );
    /// @dev Assign dispute to juror
    const disputeId2 = 2;
    await contractSupervision.connect(jurorMember1).assignDispute(disputeId2);
    await contractSupervision.connect(jurorMember2).assignDispute(disputeId2);
    await contractSupervision.connect(jurorMember3).assignDispute(disputeId2);
    /// @dev Send dispute result
    const disputeResultOfJurorMember1_2 = 1;
    const disputeResultOfJurorMember2_2 = 0;
    const disputeResultOfJurorMember3_2 = 0;
    const disputeVerdict2 = false;
    await contractSupervision
      .connect(jurorMember1)
      .sendDisputeResult(disputeId2, disputeResultOfJurorMember1_2);
    await contractSupervision
      .connect(jurorMember2)
      .sendDisputeResult(disputeId2, disputeResultOfJurorMember2_2);
    await expect(
      contractSupervision
        .connect(jurorMember3)
        .sendDisputeResult(disputeId2, disputeResultOfJurorMember3_2)
    )
      .to.emit(contractSupervision, "DisputeEnded")
      .withArgs(disputeId2, disputeVerdict2);

    /// @dev Check scores of jurors in this round
    const currentDistributionRound2 =
      await contractSupervision.distributionRound();
    const scoreOfJuror1_2 = await contractSupervision.getJurorScore(
      jurorMember1.address,
      currentDistributionRound2
    );
    const scoreOfJuror2_2 = await contractSupervision.getJurorScore(
      jurorMember2.address,
      currentDistributionRound2
    );
    const scoreOfJuror3_2 = await contractSupervision.getJurorScore(
      jurorMember3.address,
      currentDistributionRound2
    );
    expect(scoreOfJuror1_2).to.equal(0);
    expect(scoreOfJuror2_2).to.equal(2);
    expect(scoreOfJuror3_2).to.equal(2);
  });

  it("Should return the total juror score correctly", async function () {
    await reDeploy();
    /// Set KYC
    await contractRoleManager.setKYC(jurorMember1.address, true);
    await contractRoleManager.setKYC(jurorMember2.address, true);
    await contractRoleManager.setKYC(jurorMember3.address, true);
    /// @dev Dispute settings
    const caseScope = 1;
    const caseQuestion = "Should we remove this content?";
    const caseTokenRelated = true;
    const caseTokenId = 0;
    const emptyData = "0x";
    const randomAddress = ethers.constants.AddressZero;

    /// @dev Create content
    await createContent(
      contentCreator,
      contractSupervision,
      contractRoleManager,
      contractUDAOContent,
      backend,
      validator1,
      validator2,
      validator3,
      validator4,
      validator5
    );
    /// @dev Create dispute
    await contractSupervision
      .connect(backend)
      .createDispute(
        caseScope,
        caseQuestion,
        caseTokenRelated,
        caseTokenId,
        emptyData,
        randomAddress
      );
    /// @dev Assign dispute to juror
    const disputeId = 1;
    await contractSupervision.connect(jurorMember1).assignDispute(disputeId);
    await contractSupervision.connect(jurorMember2).assignDispute(disputeId);
    await contractSupervision.connect(jurorMember3).assignDispute(disputeId);
    /// @dev Send dispute result
    const disputeResultOfJurorMember1 = 1;
    const disputeResultOfJurorMember2 = 0;
    const disputeResultOfJurorMember3 = 0;
    const disputeVerdict = false;
    await contractSupervision
      .connect(jurorMember1)
      .sendDisputeResult(disputeId, disputeResultOfJurorMember1);
    await contractSupervision
      .connect(jurorMember2)
      .sendDisputeResult(disputeId, disputeResultOfJurorMember2);
    await expect(
      contractSupervision
        .connect(jurorMember3)
        .sendDisputeResult(disputeId, disputeResultOfJurorMember3)
    )
      .to.emit(contractSupervision, "DisputeEnded")
      .withArgs(disputeId, disputeVerdict);

    /// @dev Check scores of jurors in this round
    const currentDistributionRound =
      await contractSupervision.distributionRound();
    const scoreOfJuror1 = await contractSupervision.getJurorScore(
      jurorMember1.address,
      currentDistributionRound
    );
    const scoreOfJuror2 = await contractSupervision.getJurorScore(
      jurorMember2.address,
      currentDistributionRound
    );
    const scoreOfJuror3 = await contractSupervision.getJurorScore(
      jurorMember3.address,
      currentDistributionRound
    );
    expect(scoreOfJuror1).to.equal(0);
    expect(scoreOfJuror2).to.equal(1);
    expect(scoreOfJuror3).to.equal(1);

    /// @dev Get total juror score
    const totalJurorScore = await contractSupervision.getTotalJurorScore();
    expect(totalJurorScore).to.equal(2);
  });

  it("Should a use with GOVERNANCE_MEMBER role be able to change the number of required jurors", async function () {
    await reDeploy();

    /// @dev Change the number of required jurors
    const newRequiredJurors = 5;
    await contractSupervision
      .connect(governanceMember)
      .setRequiredJurors(newRequiredJurors);
    const requiredJurors = await contractSupervision.requiredJurors();
    expect(requiredJurors).to.equal(newRequiredJurors);
  });

  it("Should fail to a use without BACKEND_ROLE role be able to create new dispute", async function () {
    await reDeploy();

    /// @dev Case settings
    const caseScope = 1;
    const caseQuestion = "Should we remove this content?";
    const caseTokenRelated = true;
    const caseTokenId = 0;
    const emptyData = "0x";
    const randomAddress = ethers.constants.AddressZero;

    /// @dev Create dispute
    await expect(
      contractSupervision
        .connect(jurorMember1)
        .createDispute(
          caseScope,
          caseQuestion,
          caseTokenRelated,
          caseTokenId,
          emptyData,
          randomAddress
        )
    ).to.revertedWith(
      "Only backend can create dispute"
    );
  });

  it("Should fail to a use without GOVERNANCE_MEMBER role be able to change the number of required jurors", async function () {
    await reDeploy();

    /// @dev Change the number of required jurors
    const newRequiredJurors = 5;
    await expect(
      contractSupervision
        .connect(jurorMember1)
        .setRequiredJurors(newRequiredJurors)
    ).to.revertedWith(
      "Only governance can set required juror count"
    );
  });

  it("Should fail for too many juror assigned, a juror be unable to assign a dispute to himself", async function () {
    await reDeploy();
    /// Set KYC
    await contractRoleManager.setKYC(jurorMember1.address, true);
    await contractRoleManager.setKYC(jurorMember2.address, true);
    await contractRoleManager.setKYC(jurorMember3.address, true);
    await contractRoleManager.setKYC(jurorMember4.address, true);
    /// @dev Dispute settings
    const caseScope = 1;
    const caseQuestion = "Should we remove this content?";
    const caseTokenRelated = true;
    const caseTokenId = 0;
    const emptyData = "0x";
    const randomAddress = ethers.constants.AddressZero;

    /// @dev Create content
    await createContent(
      contentCreator,
      contractSupervision,
      contractRoleManager,
      contractUDAOContent,
      backend,
      validator1,
      validator2,
      validator3,
      validator4,
      validator5
    );
    /// @dev Create dispute
    await contractSupervision
      .connect(backend)
      .createDispute(
        caseScope,
        caseQuestion,
        caseTokenRelated,
        caseTokenId,
        emptyData,
        randomAddress
      );
    /// @dev Assign dispute to juror
    const disputeId = 1;
    await expect(
      contractSupervision.connect(jurorMember1).assignDispute(disputeId)
    );
    await expect(
      contractSupervision.connect(jurorMember2).assignDispute(disputeId)
    );
    await expect(
      contractSupervision.connect(jurorMember3).assignDispute(disputeId)
    );
    await expect(
      contractSupervision.connect(jurorMember4).assignDispute(disputeId)
    ).to.revertedWith("Dispute already have enough jurors!");
  });

  it("Should fail juror have already assigned dispute, a juror be unable to assign a dispute to himself", async function () {
    await reDeploy();
    /// Set KYC
    await contractRoleManager.setKYC(jurorMember1.address, true);
    /// @dev Dispute settings for 1st dispute
    const caseScope = 1;
    const caseQuestion = "Should we remove this content?";
    const caseTokenRelated = true;
    var caseTokenId = 0;
    const emptyData = "0x";
    const randomAddress = ethers.constants.AddressZero;

    /// @dev Create content for 1st dispute
    await createContent(
      contentCreator,
      contractSupervision,
      contractRoleManager,
      contractUDAOContent,
      backend,
      validator1,
      validator2,
      validator3,
      validator4,
      validator5
    );
    /// @dev Create dispute for 1st dispute
    await contractSupervision
      .connect(backend)
      .createDispute(
        caseScope,
        caseQuestion,
        caseTokenRelated,
        caseTokenId,
        emptyData,
        randomAddress
      );

    /// @dev arrange Dispute settings for 2nd dispute
    caseTokenId = 1;

    /// @dev Create dispute for 2nd dispute
    await contractSupervision
      .connect(backend)
      .createDispute(
        caseScope,
        caseQuestion,
        caseTokenRelated,
        caseTokenId,
        emptyData,
        randomAddress
      );

    /// @dev Assign dispute to juror
    var disputeId = 1;
    await expect(
      contractSupervision.connect(jurorMember1).assignDispute(disputeId)
    );

    disputeId = 2;
    await expect(
      contractSupervision.connect(jurorMember1).assignDispute(disputeId)
    ).to.revertedWith("You already have an assigned dispute");
  });

  it("Should fail for unexisting case id, a juror be unable to assign a dispute to himself", async function () {
    await reDeploy();
    /// Set KYC
    await contractRoleManager.setKYC(jurorMember1.address, true);
    /// @dev Dispute settings
    const caseScope = 1;
    const caseQuestion = "Should we remove this content";
    const caseTokenRelated = true;
    const caseTokenId = 0;
    const emptyData = "0x";
    const randomAddress = ethers.constants.AddressZero;

    /// @dev Create content
    await createContent(
      contentCreator,
      contractSupervision,
      contractRoleManager,
      contractUDAOContent,
      backend,
      validator1,
      validator2,
      validator3,
      validator4,
      validator5
    );
    /// @dev Create dispute
    await contractSupervision
      .connect(backend)
      .createDispute(
        caseScope,
        caseQuestion,
        caseTokenRelated,
        caseTokenId,
        emptyData,
        randomAddress
      );
    /// @dev Assign dispute to juror
    const disputeId = 2;
    await expect(
      contractSupervision.connect(jurorMember1).assignDispute(disputeId)
    ).to.revertedWith("Dispute does not exist");
  });

  it("Should fail allow to juror-else role to send dispute result", async function () {
    await reDeploy();
    /// Set KYC
    await contractRoleManager.setKYC(jurorMember1.address, true);

    /// @dev Dispute settings
    const caseScope = 1;
    const caseQuestion = "Should we remove this content?";
    const caseTokenRelated = true;
    const caseTokenId = 0;
    const emptyData = "0x";
    const randomAddress = ethers.constants.AddressZero;

    /// @dev Create content
    await createContent(
      contentCreator,
      contractSupervision,
      contractRoleManager,
      contractUDAOContent,
      backend,
      validator1,
      validator2,
      validator3,
      validator4,
      validator5
    );
    /// @dev Create dispute
    await contractSupervision
      .connect(backend)
      .createDispute(
        caseScope,
        caseQuestion,
        caseTokenRelated,
        caseTokenId,
        emptyData,
        randomAddress
      );
    /// @dev Assign dispute to juror
    const hashedJUROR_ROLE =
      "0x2ea44624af573c71d23003c0751808a79f405c6b5fddb794897688d59c07918b";
    const disputeId = 1;
    await contractSupervision.connect(jurorMember1).assignDispute(disputeId);
    /// @dev Send dispute result
    const disputeResultOfJurorMember1 = 1;
    await expect(
      contractSupervision
        .connect(contentCreator)
        .sendDisputeResult(disputeId, disputeResultOfJurorMember1)
    ).to.revertedWith(
      "Only jurors can send dispute result"
    );
  });

  it("Should fail allow to without treasury contract to switch to the next round", async function () {
    await reDeploy();
    // send some eth to the contractPlatformTreasury and impersonate it
    await helpers.setBalance(
      contractPlatformTreasury.address,
      hre.ethers.utils.parseEther("1")
    );
    const hashedTREASURY_CONTRACT =
      "0xa34ea2ceed6e9b6dd50292aa3f34b931d342b9667303c6f313c588454bca7e8a";
    // get the current distribution round
    const currentDistributionRound =
      await contractSupervision.distributionRound();
    expect(currentDistributionRound).to.equal(0);
    // call the next round from contractSupervision
    const nextDistributionRound = currentDistributionRound + 1;
    await expect(
      contractSupervision.connect(contentCreator).nextRound()
    ).to.revertedWith(
      "Only treasury contract can start new round"
    );
  });

  it("Should fail a juror be unable to assign a dispute to himself if the instructor of course", async function () {
    await reDeploy();

    /// @dev Dispute settings
    const caseScope = 1;
    const caseQuestion = "Should we remove this content?";
    const caseTokenRelated = true;
    const caseTokenId = 0;
    const emptyData = "0x";
    const randomAddress = ethers.constants.AddressZero;

    /// @dev Create content
    await createContent(
      jurorMember1,
      contractSupervision,
      contractRoleManager,
      contractUDAOContent,
      backend,
      validator1,
      validator2,
      validator3,
      validator4,
      validator5
    );
    /// @dev Create dispute
    await contractSupervision
      .connect(backend)
      .createDispute(
        caseScope,
        caseQuestion,
        caseTokenRelated,
        caseTokenId,
        emptyData,
        randomAddress
      );
    /// @dev Assign dispute to juror
    const disputeId = 1;
    await expect(
      contractSupervision.connect(jurorMember1).assignDispute(disputeId)
    ).to.revertedWith("You are the instructor of this course.");
  });

  it("Should create new dispute that is not token related", async function () {
    await reDeploy();

    /// @dev Case settings
    const caseScope = 1;
    const caseQuestion = "Should we remove this content?";
    const caseTokenRelated = false;
    const caseTokenId = 5;
    const emptyData = "0x";
    const randomAddress = ethers.constants.AddressZero;

    /// @dev Create dispute
    await expect(
      contractSupervision
        .connect(backend)
        .createDispute(
          caseScope,
          caseQuestion,
          caseTokenRelated,
          caseTokenId,
          emptyData,
          randomAddress
        )
    )
      .to.emit(contractSupervision, "DisputeCreated")
      .withArgs(1, caseScope, caseQuestion);

    /// Check dispute settings
    const dispute = await contractSupervision.disputes(1);
    expect(dispute.caseScope).to.equal(caseScope);
    expect(dispute.question).to.equal(caseQuestion);
    expect(dispute.isTokenRelated).to.equal(caseTokenRelated);
    expect(dispute.tokenId).to.equal(0);
  });

  it("Should create new dispute that is token related", async function () {
    await reDeploy();

    /// @dev Case settings
    const caseScope = 1;
    const caseQuestion = "Should we remove this content?";
    const caseTokenRelated = true;
    const caseTokenId = 5;
    const emptyData = "0x";
    const randomAddress = ethers.constants.AddressZero;

    /// @dev Create dispute
    await expect(
      contractSupervision
        .connect(backend)
        .createDispute(
          caseScope,
          caseQuestion,
          caseTokenRelated,
          caseTokenId,
          emptyData,
          randomAddress
        )
    )
      .to.emit(contractSupervision, "DisputeCreated")
      .withArgs(1, caseScope, caseQuestion);

    /// Check dispute settings
    const dispute = await contractSupervision.disputes(1);
    expect(dispute.caseScope).to.equal(caseScope);
    expect(dispute.question).to.equal(caseQuestion);
    expect(dispute.isTokenRelated).to.equal(caseTokenRelated);
    expect(dispute.tokenId).to.equal(caseTokenId);
  });
  it("Should allow backend to call updateAddresses in contractSupervision", async function () {
    await reDeploy();

    // Dummy contract address
    const dummyAddress = "0x7D1AfA7B718fb893dB30A3aBc0Cfc608AaCfeBB0";
    await contractContractManager
      .connect(backend)
      .setAddressIrmAddress(dummyAddress);
    // Check the current IRM address
    const currentIrmAddress = await contractContractManager.RmAddress();
    expect(currentIrmAddress).to.equal(dummyAddress);
    // Update addresses
    await expect(contractSupervision.connect(backend).updateAddresses())
      .to.emit(contractSupervision, "AddressesUpdated")
      .withArgs(dummyAddress, contractPlatformTreasury.address);
  });

  it("Should fail to assign dispute to a juror when juror hasn't kyced", async function () {
    await reDeploy();
    /// Set KYC
    await contractRoleManager.setKYC(jurorMember1.address, false);

    /// @dev Dispute settings
    const caseScope = 1;
    const caseQuestion = "Should we remove this content?";
    const caseTokenRelated = true;
    const caseTokenId = 0;
    const emptyData = "0x";
    const randomAddress = ethers.constants.AddressZero;

    /// @dev Create content
    await createContent(
      contentCreator,
      contractSupervision,
      contractRoleManager,
      contractUDAOContent,
      backend,
      validator1,
      validator2,
      validator3,
      validator4,
      validator5
    );
    /// @dev Create dispute
    await contractSupervision
      .connect(backend)
      .createDispute(
        caseScope,
        caseQuestion,
        caseTokenRelated,
        caseTokenId,
        emptyData,
        randomAddress
      );
    /// @dev Assign dispute to juror
    const disputeId = 1;
    await expect(
      contractSupervision.connect(jurorMember1).assignDispute(disputeId)
    ).to.revertedWith("You are not KYCed");
  });

  it("Should fail to assign dispute to a juror when juror already banned", async function () {
    await reDeploy();
    /// Set KYC
    await contractRoleManager.setKYC(jurorMember1.address, true);

    /// Ban the juror
    await contractRoleManager.setBan(jurorMember1.address, true);

    /// @dev Dispute settings
    const caseScope = 1;
    const caseQuestion = "Should we remove this content?";
    const caseTokenRelated = true;
    const caseTokenId = 0;
    const emptyData = "0x";
    const randomAddress = ethers.constants.AddressZero;

    /// @dev Create content
    await createContent(
      contentCreator,
      contractSupervision,
      contractRoleManager,
      contractUDAOContent,
      backend,
      validator1,
      validator2,
      validator3,
      validator4,
      validator5
    );
    /// @dev Create dispute
    await contractSupervision
      .connect(backend)
      .createDispute(
        caseScope,
        caseQuestion,
        caseTokenRelated,
        caseTokenId,
        emptyData,
        randomAddress
      );
    /// @dev Assign dispute to juror
    const disputeId = 1;
    await expect(
      contractSupervision.connect(jurorMember1).assignDispute(disputeId)
    ).to.revertedWith("You were banned");
  });

  it("Should get the role expire dates from staking contract", async function () {
    await reDeploy();
    await contractRoleManager.setKYC(jurorCandidate.address, true);

    await contractUDAO.transfer(
      jurorCandidate.address,
      ethers.utils.parseEther("10000.0")
    );

    await contractUDAO
      .connect(jurorCandidate)
      .approve(
        contractUDAOStaker.address,
        ethers.utils.parseEther("999999999999.0")
      );

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
    const jurorLockAmount = await contractUDAOStaker.jurorLockAmount;
    await expect(contractUDAOStaker.connect(jurorCandidate).applyForJuror())
      .to.emit(contractUDAOStaker, "RoleApplied") // transfer from null address to minter
      .withArgs(1, jurorCandidate.address, jurorLockAmount);

    const lazyRole = new LazyRole({
      contract: contractUDAOStaker,
      signer: backend,
    });
    const role_voucher = await lazyRole.createVoucher(
      jurorCandidate.address,
      Date.now() + 999999999,
      1
    );
    await expect(
      contractUDAOStaker.connect(jurorCandidate).getApproved(role_voucher)
    )
      .to.emit(contractUDAOStaker, "RoleApproved") // transfer from null address to minter
      .withArgs(1, jurorCandidate.address);

    /// @dev Get the expire date
    const expireDate = await contractSupervision.checkApplicationN(
      jurorCandidate.address
    );
  });
});
