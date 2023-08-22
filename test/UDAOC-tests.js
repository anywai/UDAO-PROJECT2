const { expect } = require("chai");
const hardhat = require("hardhat");
const { ethers } = hardhat;
const chai = require("chai");
const BN = require("bn.js");
const helpers = require("@nomicfoundation/hardhat-network-helpers");
const { LazyRole } = require("../lib/LazyRole");
const { deploy } = require("../lib/deployments");
const { Redeem } = require("../lib/Redeem");

const {
  WMATIC_ABI,
  NonFunbiblePositionABI,
  NonFunbiblePositionAddress,
  WMATICAddress,
} = require("../lib/abis");
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
  const reApplyValidatorRoles = [
    validator,
    validator1,
    validator2,
    validator3,
    validator4,
    validator5,
  ];
  const reApplyJurorRoles = [
    jurorMember,
    jurorMember1,
    jurorMember2,
    jurorMember3,
    jurorMember4,
  ];
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

// Enable and inject BN dependency
chai.use(require("chai-bn")(BN));

describe("UDAOC Contract", function () {
  it("Should deploy", async function () {
    await reDeploy();
  });

  it("Should KYC Content Creator", async function () {
    await reDeploy();
    await expect(contractRoleManager.setKYC(contentCreator.address, true))
      .to.emit(contractRoleManager, "SetKYC") // transfer from null address to minter
      .withArgs(contentCreator.address, true);
    await expect(contractRoleManager.setKYC(contentCreator.address, false))
      .to.emit(contractRoleManager, "SetKYC") // transfer from null address to minter
      .withArgs(contentCreator.address, false);
    await expect(contractRoleManager.setBan(contentCreator.address, true))
      .to.emit(contractRoleManager, "SetBan") // transfer from null address to minter
      .withArgs(contentCreator.address, true);
    await expect(contractRoleManager.setBan(contentCreator.address, true))
      .to.emit(contractRoleManager, "SetBan") // transfer from null address to minter
      .withArgs(contentCreator.address, true);
  });

  it("Should create Content", async function () {
    await reDeploy();
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
  });

  it("Should fail to create Content if wrong redeemer", async function () {
    await reDeploy();
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
    await expect(
      contractUDAOContent
        .connect(contentBuyer)
        .createContent(createContentVoucherSample)
    ).to.revertedWith("You are not the redeemer");
  });

  // it("Should fail to create Content if wrong signer", async function () {
  //   const {
  //     backend,
  //     contentCreator,
  //     contentBuyer,
  //     validatorCandidate,
  //     validator,
  //     superValidatorCandidate,
  //     superValidator,
  //     foundation,
  //     governanceCandidate,
  //     governanceMember,
  //     jurorCandidate,
  //     jurorMember,
  //     contractUDAO,
  //     contractRoleManager,
  //     contractUDAOCertificate,
  //     contractUDAOContent,
  //     contractSupervision,
  //     contractPlatformTreasury,
  //     contractUDAOVp,
  //     contractUDAOStaker,
  //     contractUDAOTimelockController,
  //     contractUDAOGovernor,
  //   } = await deploy();
  //   await contractRoleManager.setKYC(contentCreator.address, true);

  //   const tx = await contractUDAOContent.getChainID();
  //   const lazyMinter = new LazyMinter({
  //     contract: contractUDAOContent,
  //     signer: foundation,
  //   });
  //   const voucher = await lazyMinter.createVoucher(
  //     1,
  //     "ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi",
  //     contentCreator.address,
  //     true,
  //     "Content Name",
  //     "Content Description"
  //   );
  //   await expect(
  //     contractUDAOContent.connect(contentCreator).createContent(voucher)
  //   ).to.revertedWith("Signature invalid or unauthorized");
  // });

  it("Should get token URI of the Content", async function () {
    await reDeploy();
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
    expect(await contractUDAOContent.tokenURI(0)).to.eql(
      "ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi"
    );
  });

  it("Should transfer token", async function () {
    await reDeploy();
    await contractRoleManager.setKYC(contentCreator.address, true);
    await contractRoleManager.setKYC(contentBuyer.address, true);

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
    await expect(
      contractUDAOContent
        .connect(contentCreator)
        .transferFrom(contentCreator.address, contentBuyer.address, 0)
    )
      .to.emit(contractUDAOContent, "Transfer") // transfer from null address to minter
      .withArgs(contentCreator.address, contentBuyer.address, 0);
  });

  it("Should fail to transfer token if sender is not KYCed", async function () {
    await reDeploy();
    await contractRoleManager.setKYC(contentCreator.address, true);
    await contractRoleManager.setKYC(contentBuyer.address, true);

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
    await contractRoleManager.setKYC(contentCreator.address, false);

    await expect(
      contractUDAOContent
        .connect(contentCreator)
        .transferFrom(contentCreator.address, contentBuyer.address, 0)
    ).to.revertedWith("Sender is not KYCed!");
  });

  it("Should fail to transfer token if sender is banned", async function () {
    await reDeploy();
    await contractRoleManager.setKYC(contentCreator.address, true);
    await contractRoleManager.setKYC(contentBuyer.address, true);

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

    await contractRoleManager.setBan(contentCreator.address, true);
    await expect(
      contractUDAOContent
        .connect(contentCreator)
        .transferFrom(contentCreator.address, contentBuyer.address, 0)
    ).to.revertedWith("Sender is banned!");
  });

  it("Should fail to transfer token if receiver is banned", async function () {
    await reDeploy();
    await contractRoleManager.setKYC(contentCreator.address, true);
    await contractRoleManager.setKYC(contentBuyer.address, true);
    await contractRoleManager.setBan(contentBuyer.address, true);

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
    await expect(
      contractUDAOContent
        .connect(contentCreator)
        .transferFrom(contentCreator.address, contentBuyer.address, 0)
    ).to.revertedWith("Receiver is banned!");
  });

  it("Should fail to transfer token if sender is not KYCed", async function () {
    await reDeploy();
    await contractRoleManager.setKYC(contentCreator.address, true);
    await contractRoleManager.setKYC(contentBuyer.address, true);

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
    await contractRoleManager.setKYC(contentCreator.address, false);

    await expect(
      contractUDAOContent
        .connect(contentCreator)
        .transferFrom(contentCreator.address, contentBuyer.address, 0)
    ).to.revertedWith("Sender is not KYCed!");
  });

  it("Should burn token if token owner", async function () {
    await reDeploy();
    await contractRoleManager.setKYC(contentCreator.address, true);
    await contractRoleManager.setKYC(contentBuyer.address, true);

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
    await expect(contractUDAOContent.connect(contentCreator).burn(0))
      .to.emit(contractUDAOContent, "Transfer") // transfer from null address to minter
      .withArgs(
        contentCreator.address,
        "0x0000000000000000000000000000000000000000",
        0
      );
  });

  it("Should fail to burn token if not token owner", async function () {
    await reDeploy();
    await contractRoleManager.setKYC(contentCreator.address, true);
    await contractRoleManager.setKYC(contentBuyer.address, true);

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

    await expect(
      contractUDAOContent.connect(contentBuyer).burn(0)
    ).to.revertedWith("You are not the owner of token");
  });

  it("Should return true if supports ERC721 interface", async function () {
    await reDeploy();
    await contractRoleManager.setKYC(contentCreator.address, true);
    await contractRoleManager.setKYC(contentBuyer.address, true);

    expect(await contractUDAOContent.supportsInterface("0x80ac58cd")).to.eql(
      true
    );
  });

  it("Should enable coaching for content", async function () {
    await reDeploy();
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
      partPricesArray,
      false,
      false
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
    await contractUDAOContent.connect(contentCreator).enableCoaching(0);
    expect(await contractUDAOContent.isCoachingEnabled(0)).to.be.eql(true);
  });

  it("Should disable coaching for content", async function () {
    await reDeploy();
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
    await contractUDAOContent.connect(contentCreator).disableCoaching(0);
    expect(await contractUDAOContent.isCoachingEnabled(0)).to.be.eql(false);
  });

  it("Should fail to enable coaching for content if not owner", async function () {
    await reDeploy();
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
      partPricesArray,
      false,
      false
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
    await expect(
      contractUDAOContent.connect(contentBuyer).enableCoaching(0)
    ).to.revertedWith("You are not the owner of token");
  });

  it("Should fail to disable coaching for content if not owner", async function () {
    await reDeploy();
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
    await expect(
      contractUDAOContent.connect(contentBuyer).disableCoaching(0)
    ).to.revertedWith("You are not the owner of token");
  });

  it("Should allow content owner to add a new part to content, in between existing parts", async function () {
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
    } = await deploy(true);
    await contractRoleManager.setKYC(contentCreator.address, true);

    /// part prices must be determined before creating content
    const partPricesArray = [
      ethers.utils.parseEther("1"),
      ethers.utils.parseEther("2"),
      ethers.utils.parseEther("3"),
    ];

    /// Create Voucher from redeem.js and use it for creating content
    const createContentVoucherSample = await createContentVoucher(
      contractUDAOContent,
      backend,
      contentCreator,
      partPricesArray,
      false,
      false
    );

    await expect(
      contractUDAOContent
        .connect(contentCreator)
        .createContent(createContentVoucherSample)
    )
      .to.emit(contractUDAOContent, "Transfer") // transfer from null address to min
      .withArgs(
        "0x0000000000000000000000000000000000000000",
        contentCreator.address,
        0
      );

    // new part information
    const tokenId = 0;
    const newPartId = 2;
    const _contentPrice = [
      ethers.utils.parseEther("1"),
      ethers.utils.parseEther("2"),
      ethers.utils.parseEther("4"),
      ethers.utils.parseEther("3"),
    ];

    /// Create Voucher from redeem.js and use it for creating content
    const createModifyVoucherSample = await createContentVoucher(
      contractUDAOContent,
      backend,
      contentCreator,
      _contentPrice,
      false,
      false,
      2
    );

    // add new part and expect newPartAdded event to emit
    await expect(
      contractUDAOContent
        .connect(contentCreator)
        .modifyContent(createModifyVoucherSample)
    );

    // wait for 1 second
    //await new Promise((resolve) => setTimeout(resolve, 1000));

    /// TODO: remove comment sections below
    /*
    //console.log(createModifyVoucherSample);
    // wait for 1 block
    // await ethers.provider.send("evm_mine", []);
    // expect new part price to be 4
    const returnedPartPriceX =
      await contractUDAOContent.getContentPriceAndCurrency(tokenId, newPartId);
    //expect(returnedPartPrice[0]).to.equal(ethers.utils.parseEther("4"));
    console.log(returnedPartPriceX);
    */

    // epxpect previous parts to be shifted
    const returnedPartPrice0 =
      await contractUDAOContent.getContentPriceAndCurrency(tokenId, 0);
    const returnedPartPrice1 =
      await contractUDAOContent.getContentPriceAndCurrency(tokenId, 1);
    const returnedPartPrice2 =
      await contractUDAOContent.getContentPriceAndCurrency(tokenId, 2);
    const returnedPartPrice3 =
      await contractUDAOContent.getContentPriceAndCurrency(tokenId, 3);

    //console.log(returnedPartPrice0);
    //console.log(returnedPartPrice1);
    //console.log(returnedPartPrice2);
    //console.log(returnedPartPrice3);

    expect(returnedPartPrice0.value).to.equal(
      ethers.utils.parseEther("1").BigNumber
    );
    expect(returnedPartPrice1.value).to.equal(
      ethers.utils.parseEther("2").BigNumber
    );
    expect(returnedPartPrice2.value).to.equal(
      ethers.utils.parseEther("4").BigNumber
    );
    expect(returnedPartPrice3.value).to.equal(
      ethers.utils.parseEther("3").BigNumber
    );
  });

  it("Should allow content owner to add a new part to content, at the end of existing parts", async function () {
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
    } = await deploy(true);
    await contractRoleManager.setKYC(contentCreator.address, true);
    /// part prices must be determined before creating content
    const partPricesArray = [
      ethers.utils.parseEther("1"),
      ethers.utils.parseEther("2"),
      ethers.utils.parseEther("3"),
    ];

    /// Create Voucher from redeem.js and use it for creating content
    const createContentVoucherSample = await createContentVoucher(
      contractUDAOContent,
      backend,
      contentCreator,
      partPricesArray,
      false,
      false
    );

    await expect(
      contractUDAOContent
        .connect(contentCreator)
        .createContent(createContentVoucherSample)
    )
      .to.emit(contractUDAOContent, "Transfer") // transfer from null address to
      .withArgs(
        "0x0000000000000000000000000000000000000000",
        contentCreator.address,
        0
      );

    // new part information
    const tokenId = 0;
    const newPartId = 3;
    const newPartPrice = ethers.utils.parseEther("20");
    const newPartCurrency = "udao";
    // add new part and expect newPartAdded event to emit
    await expect(
      contractUDAOContent
        .connect(contentCreator)
        .addNewPart(tokenId, newPartId, newPartPrice, newPartCurrency)
    )
      .to.emit(contractUDAOContent, "newPartAdded")
      .withArgs(tokenId, newPartId, ethers.utils.parseEther("20"));

    // expect new part price to be 20
    const returnedPartPrice =
      await contractUDAOContent.getContentPriceAndCurrency(tokenId, newPartId);
    expect(returnedPartPrice[0]).to.equal(ethers.utils.parseEther("20"));

    // epxpect previous parts to stay as is
    const returnedPartPrice1 =
      await contractUDAOContent.getContentPriceAndCurrency(tokenId, 0);
    expect(returnedPartPrice1[0]).to.equal(ethers.utils.parseEther("1"));
    const returnedPartPrice2 =
      await contractUDAOContent.getContentPriceAndCurrency(tokenId, 1);
    expect(returnedPartPrice2[0]).to.equal(ethers.utils.parseEther("2"));
    const returnedPartPrice3 =
      await contractUDAOContent.getContentPriceAndCurrency(tokenId, 2);
    expect(returnedPartPrice3[0]).to.equal(ethers.utils.parseEther("3"));
  });

  it("Should allow content owner to add a new part to content, at the beginning of existing parts", async function () {
    /// @dev Please note that the first indice of the price array is the price of the whole content and parts start from 1
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
    } = await deploy(true);
    await contractRoleManager.setKYC(contentCreator.address, true);
    /// part prices must be determined before creating content
    const partPricesArray = [
      ethers.utils.parseEther("1"),
      ethers.utils.parseEther("2"),
      ethers.utils.parseEther("3"),
    ];

    /// Create Voucher from redeem.js and use it for creating content
    const createContentVoucherSample = await createContentVoucher(
      contractUDAOContent,
      backend,
      contentCreator,
      partPricesArray,
      false,
      false
    );

    await expect(
      contractUDAOContent
        .connect(contentCreator)
        .createContent(createContentVoucherSample)
    )
      .to.emit(contractUDAOContent, "Transfer") // transfer from null address to
      .withArgs(
        "0x0000000000000000000000000000000000000000",
        contentCreator.address,
        0
      );

    // new part information
    const tokenId = 0;
    const newPartId = 1;
    const newPartPrice = ethers.utils.parseEther("20");
    const newPartCurrency = "udao";
    // add new part and expect newPartAdded event to emit
    await expect(
      contractUDAOContent
        .connect(contentCreator)
        .addNewPart(tokenId, newPartId, newPartPrice, newPartCurrency)
    )
      .to.emit(contractUDAOContent, "newPartAdded")
      .withArgs(tokenId, newPartId, ethers.utils.parseEther("20"));

    // expect new part price to be 20
    const returnedPartPrice =
      await contractUDAOContent.getContentPriceAndCurrency(tokenId, newPartId);
    expect(returnedPartPrice[0]).to.equal(ethers.utils.parseEther("20"));

    // epxpect previous part to stay as is
    const returnedPartPrice1 =
      await contractUDAOContent.getContentPriceAndCurrency(tokenId, 0);
    expect(returnedPartPrice1[0]).to.equal(ethers.utils.parseEther("1"));
    const returnedPartPrice2 =
      await contractUDAOContent.getContentPriceAndCurrency(tokenId, 2);
    expect(returnedPartPrice2[0]).to.equal(ethers.utils.parseEther("2"));
    const returnedPartPrice3 =
      await contractUDAOContent.getContentPriceAndCurrency(tokenId, 3);
    expect(returnedPartPrice3[0]).to.equal(ethers.utils.parseEther("3"));
  });

  it("Should revert if content owner tries to add a new part at 0 index", async function () {
    /// @dev Please note that the first indice of the price array is the price of the whole content and parts start from 1
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
    } = await deploy(true);
    await contractRoleManager.setKYC(contentCreator.address, true);
    /// part prices must be determined before creating content
    const partPricesArray = [
      ethers.utils.parseEther("1"),
      ethers.utils.parseEther("2"),
      ethers.utils.parseEther("3"),
    ];

    /// Create Voucher from redeem.js and use it for creating content
    const createContentVoucherSample = await createContentVoucher(
      contractUDAOContent,
      backend,
      contentCreator,
      partPricesArray,
      false,
      false
    );
    await expect(
      contractUDAOContent
        .connect(contentCreator)
        .createContent(createContentVoucherSample)
    )
      .to.emit(contractUDAOContent, "Transfer") // transfer from null address to
      .withArgs(
        "0x0000000000000000000000000000000000000000",
        contentCreator.address,
        0
      );

    // new part information
    const tokenId = 0;
    const newPartId = 0;
    const newPartPrice = ethers.utils.parseEther("20");
    const newPartCurrency = "udao";
    // add new part and expect it to revert
    await expect(
      contractUDAOContent
        .connect(contentCreator)
        .addNewPart(tokenId, newPartId, newPartPrice, newPartCurrency)
    ).to.be.revertedWith("0 sent as new part id, parts starts from 1");
  });

  it("Should revert if  someone other then the owner of the token tries to add a new part", async function () {
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
    } = await deploy(true);
    await contractRoleManager.setKYC(contentCreator.address, true);
    /// part prices must be determined before creating content
    const partPricesArray = [
      ethers.utils.parseEther("1"),
      ethers.utils.parseEther("2"),
      ethers.utils.parseEther("3"),
    ];

    /// Create Voucher from redeem.js and use it for creating content
    const createContentVoucherSample = await createContentVoucher(
      contractUDAOContent,
      backend,
      contentCreator,
      partPricesArray,
      false,
      false
    );
    await expect(
      contractUDAOContent
        .connect(contentCreator)
        .createContent(createContentVoucherSample)
    )
      .to.emit(contractUDAOContent, "Transfer") // transfer from null address to
      .withArgs(
        "0x0000000000000000000000000000000000000000",
        contentCreator.address,
        0
      );

    // new part information
    const tokenId = 0;
    const newPartId = 1;
    const newPartPrice = ethers.utils.parseEther("20");
    const newPartCurrency = "udao";
    // add new part and expect it to revert
    await expect(
      contractUDAOContent
        .connect(contentBuyer)
        .addNewPart(tokenId, newPartId, newPartPrice, newPartCurrency)
    ).to.be.revertedWith("You are not the owner of token");
  });

  it("Should revert if add new part caller is not kyced", async function () {
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
    } = await deploy(true);
    await contractRoleManager.setKYC(contentCreator.address, true);
    /// part prices must be determined before creating content
    const partPricesArray = [
      ethers.utils.parseEther("1"),
      ethers.utils.parseEther("2"),
      ethers.utils.parseEther("3"),
    ];

    /// Create Voucher from redeem.js and use it for creating content
    const createContentVoucherSample = await createContentVoucher(
      contractUDAOContent,
      backend,
      contentCreator,
      partPricesArray,
      false,
      false
    );
    await expect(
      contractUDAOContent
        .connect(contentCreator)
        .createContent(createContentVoucherSample)
    )
      .to.emit(contractUDAOContent, "Transfer") // transfer from null address to
      .withArgs(
        "0x0000000000000000000000000000000000000000",
        contentCreator.address,
        0
      );

    // UnKYC content creator
    await contractRoleManager.setKYC(contentCreator.address, false);
    // Add KYC requirement and expect it to emit KYCRequirementForCreateContentChanged
    await expect(
      contractUDAOContent.connect(backend).setKYCRequirementForCreateContent(true)
    )
      .to.emit(contractUDAOContent, "KYCRequirementForCreateContentChanged")
      .withArgs(true);
    // new part information
    const tokenId = 0;
    const newPartId = 1;
    const newPartPrice = ethers.utils.parseEther("20");
    const newPartCurrency = "udao";
    // add new part and expect it to revert
    await expect(
      contractUDAOContent
        .connect(contentCreator)
        .addNewPart(tokenId, newPartId, newPartPrice, newPartCurrency)
    ).to.be.revertedWith("You are not KYCed");
  });

  it("Should revert add new part if content creator gets banned", async function () {
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
    } = await deploy(true);
    await contractRoleManager.setKYC(contentCreator.address, true);

    /// part prices must be determined before creating content
    const partPricesArray = [
      ethers.utils.parseEther("1"),
      ethers.utils.parseEther("2"),
      ethers.utils.parseEther("3"),
    ];

    /// Create Voucher from redeem.js and use it for creating content
    const createContentVoucherSample = await createContentVoucher(
      contractUDAOContent,
      backend,
      contentCreator,
      partPricesArray,
      false,
      false
    );

    await expect(
      contractUDAOContent
        .connect(contentCreator)
        .createContent(createContentVoucherSample)
    )
      .to.emit(contractUDAOContent, "Transfer") // transfer from null address
      .withArgs(
        "0x0000000000000000000000000000000000000000",
        contentCreator.address,
        0
      );

    // Ban content creator
    await contractRoleManager.setBan(contentCreator.address, true);
    // new part information
    const tokenId = 0;
    const newPartId = 1;
    const newPartPrice = ethers.utils.parseEther("20");
    const newPartCurrency = "udao";
    // add new part and expect it to revert
    await expect(
      contractUDAOContent
        .connect(contentCreator)
        .addNewPart(tokenId, newPartId, newPartPrice, newPartCurrency)
    ).to.be.revertedWith("You are banned");
  });

  it("Should revert if the content's original currency is not same as the new part's currency", async function () {
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
    } = await deploy(true);
    await contractRoleManager.setKYC(contentCreator.address, true);
    /// part prices must be determined before creating content
    const partPricesArray = [
      ethers.utils.parseEther("1"),
      ethers.utils.parseEther("2"),
      ethers.utils.parseEther("3"),
    ];

    /// Create Voucher from redeem.js and use it for creating content
    const createContentVoucherSample = await createContentVoucher(
      contractUDAOContent,
      backend,
      contentCreator,
      partPricesArray,
      false,
      false
    );
    await expect(
      contractUDAOContent
        .connect(contentCreator)
        .createContent(createContentVoucherSample)
    )
      .to.emit(contractUDAOContent, "Transfer") // transfer from null address
      .withArgs(
        "0x0000000000000000000000000000000000000000",
        contentCreator.address,
        0
      );

    // new part information
    const tokenId = 0;
    const newPartId = 1;
    const newPartPrice = ethers.utils.parseEther("20");
    const newPartCurrency = "usd";
    // add new part and expect it to revert
    await expect(
      contractUDAOContent
        .connect(contentCreator)
        .addNewPart(tokenId, newPartId, newPartPrice, newPartCurrency)
    ).to.be.revertedWith(
      "Original currency name is not the same as the new currency name"
    );
  });

  it("Should revert if the given part id is bigger than the total parts", async function () {
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
    } = await deploy(true);

    await contractRoleManager.setKYC(contentCreator.address, true);
    /// part prices must be determined before creating content
    const partPricesArray = [
      ethers.utils.parseEther("1"),
      ethers.utils.parseEther("2"),
      ethers.utils.parseEther("3"),
    ];

    /// Create Voucher from redeem.js and use it for creating content
    const createContentVoucherSample = await createContentVoucher(
      contractUDAOContent,
      backend,
      contentCreator,
      partPricesArray,
      false,
      false
    );
    await expect(
      contractUDAOContent
        .connect(contentCreator)
        .createContent(createContentVoucherSample)
    )
      .to.emit(contractUDAOContent, "Transfer") // transfer from null address
      .withArgs(
        "0x0000000000000000000000000000000000000000",
        contentCreator.address,
        0
      );

    // new part information
    const tokenId = 0;
    const newPartId = 4;
    const newPartPrice = ethers.utils.parseEther("20");
    const newPartCurrency = "udao";
    // add new part and expect it to revert
    await expect(
      contractUDAOContent
        .connect(contentCreator)
        .addNewPart(tokenId, newPartId, newPartPrice, newPartCurrency)
    ).to.be.revertedWith("Part id is bigger than the total number of parts");
  });
});
