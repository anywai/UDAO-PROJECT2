const { expect } = require("chai");
const hardhat = require("hardhat");
const { ethers } = hardhat;
const chai = require("chai");
const BN = require("bn.js");
const { LazyMinter } = require("../lib/LazyMinter");
const { LazyRole } = require("../lib/LazyRole");
const { LazyScore } = require("../lib/LazyScore");
const { LazyValidation } = require("../lib/LazyValidation");
const { LazyUDAOCertMinter } = require("../lib/LazyUDAOCertMinter");
const { LazyPurchase } = require("../lib/LazyPurchase");
const { LazyCoaching } = require("../lib/LazyCoaching");
const { utils } = require("ethers");

// Enable and inject BN dependency
chai.use(require("chai-bn")(BN));

async function deploy() {
  const [
    backend,
    contentCreator,
    contentBuyer,
    validatorCandidate,
    validator,
    superValidatorCandidate,
    superValidator,
    foundation,
    governanceCandidate,
    governanceMember,
    jurorCandidate,
    jurorMember,
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
  let factoryUDAOContent = await ethers.getContractFactory("UDAOContent");
  let factoryPlatformTreasury = await ethers.getContractFactory(
    "PlatformTreasury"
  );
  let factoryUDAOGovernor = await ethers.getContractFactory("UDAOGovernor");

  //DEPLOYMENTS
  const contractUDAO = await factoryUDAO.deploy();
  const contractRoleManager = await factoryRoleManager.deploy();
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
  const contractPlatformTreasury = await factoryPlatformTreasury.deploy(
    contractUDAO.address,
    contractUDAOContent.address,
    contractRoleManager.address,
    contractValidationManager.address
  );
  const contractUDAOVp = await factoryUDAOVp.deploy(
    contractRoleManager.address
  );
  const contractUDAOStaker = await factoryUDAOStaker.deploy(
    contractUDAOVp.address,
    contractUDAO.address,
    contractPlatformTreasury.address,
    contractRoleManager.address
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

  // grant roles
  const BACKEND_ROLE = ethers.utils.keccak256(
    ethers.utils.toUtf8Bytes("BACKEND_ROLE")
  );
  await contractRoleManager.grantRole(BACKEND_ROLE, backend.address);
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
  const VALIDATION_MANAGER = ethers.utils.keccak256(
    ethers.utils.toUtf8Bytes("VALIDATION_MANAGER")
  );
  await contractRoleManager.grantRole(
    VALIDATION_MANAGER,
    contractValidationManager.address
  );

  // add staking contract to udao-vp
  await contractUDAOVp
    .connect(foundation)
    .setStakingContract(contractUDAOStaker.address);

  return {
    backend,
    contentCreator,
    contentBuyer,
    validatorCandidate,
    validator,
    superValidatorCandidate,
    superValidator,
    foundation,
    governanceCandidate,
    governanceMember,
    jurorCandidate,
    jurorMember,
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
  };
}

describe("Platform Treasury Contract - Coaching", function () {
  it("Should a user able to buy a coaching", async function () {
    const {
      backend,
      contentCreator,
      contentBuyer,
      validatorCandidate,
      validator,
      superValidatorCandidate,
      superValidator,
      foundation,
      governanceCandidate,
      governanceMember,
      jurorCandidate,
      jurorMember,
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
    } = await deploy();

    /// Set KYC
    await contractRoleManager.setKYC(contentCreator.address, true);
    await contractRoleManager.setKYC(contentBuyer.address, true);

    /// Mint content with voucher
    const lazyMinter = new LazyMinter({
      contract: contractUDAOContent,
      signer: backend,
    });
    const udaoc_voucher = await lazyMinter.createVoucher(
      1,
      "ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi",
      contentCreator.address,
      true,
      "Content Name",
      "Content Description"
    );
    await expect(
      contractUDAOContent.connect(contentCreator).redeem(udaoc_voucher)
    )
      .to.emit(contractUDAOContent, "Transfer") // transfer from null address to minter
      .withArgs(
        "0x0000000000000000000000000000000000000000",
        contentCreator.address,
        udaoc_voucher.tokenId
      );

    /// Validate content with voucher
    const lazyValidation = new LazyValidation({
      contract: contractValidationManager,
      signer: backend,
    });
    const voucher = await lazyValidation.createVoucher(
      1,
      [validator.address],
      [10],
      true
    );

    await expect(
      contractValidationManager.connect(contentCreator).setAsValidated(voucher)
    )
      .to.emit(contractValidationManager, "ValidationEnded")
      .withArgs(voucher.tokenId, true);

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
    const lazyCoaching = new LazyCoaching({
      contract: contractPlatformTreasury,
      signer: backend,
    });
    const coaching_voucher = await lazyCoaching.createVoucher(
      1,
      ethers.utils.parseEther("2"),
      Date.now() + 999999999,
      true,
      contentBuyer.address
    );
    await contractPlatformTreasury
      .connect(contentBuyer)
      .buyCoaching(coaching_voucher);
    expect(await contractPlatformTreasury.getStudentListOfToken(1)).to.be.eql([
      contentBuyer.address,
    ]);
  });

  it("Should fail to buy a coaching if coaching is not enabled", async function () {
    const {
      backend,
      contentCreator,
      contentBuyer,
      validatorCandidate,
      validator,
      superValidatorCandidate,
      superValidator,
      foundation,
      governanceCandidate,
      governanceMember,
      jurorCandidate,
      jurorMember,
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
    } = await deploy();

    /// Set KYC
    await contractRoleManager.setKYC(contentCreator.address, true);
    await contractRoleManager.setKYC(contentBuyer.address, true);

    /// Mint content with voucher
    const lazyMinter = new LazyMinter({
      contract: contractUDAOContent,
      signer: backend,
    });
    const udaoc_voucher = await lazyMinter.createVoucher(
      1,
      "ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi",
      contentCreator.address,
      false,
      "Content Name",
      "Content Description"
    );
    await expect(
      contractUDAOContent.connect(contentCreator).redeem(udaoc_voucher)
    )
      .to.emit(contractUDAOContent, "Transfer") // transfer from null address to minter
      .withArgs(
        "0x0000000000000000000000000000000000000000",
        contentCreator.address,
        udaoc_voucher.tokenId
      );

    /// Validate content with voucher
    const lazyValidation = new LazyValidation({
      contract: contractValidationManager,
      signer: backend,
    });
    const voucher = await lazyValidation.createVoucher(
      1,
      [validator.address],
      [10],
      true
    );
    await expect(
      contractValidationManager.connect(contentCreator).setAsValidated(voucher)
    )
      .to.emit(contractValidationManager, "ValidationEnded")
      .withArgs(voucher.tokenId, true);

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
    const lazyCoaching = new LazyCoaching({
      contract: contractPlatformTreasury,
      signer: backend,
    });
    const coaching_voucher = await lazyCoaching.createVoucher(
      1,
      ethers.utils.parseEther("2"),
      Date.now() + 999999999,
      false,
      contentBuyer.address
    );
    await expect(
      contractPlatformTreasury
        .connect(contentBuyer)
        .buyCoaching(coaching_voucher)
    ).to.revertedWith("Coaching is not enabled for this content");
  });

  it("Should fail to buy a coaching if signature invalid", async function () {
    const {
      backend,
      contentCreator,
      contentBuyer,
      validatorCandidate,
      validator,
      superValidatorCandidate,
      superValidator,
      foundation,
      governanceCandidate,
      governanceMember,
      jurorCandidate,
      jurorMember,
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
    } = await deploy();

    /// Set KYC
    await contractRoleManager.setKYC(contentCreator.address, true);
    await contractRoleManager.setKYC(contentBuyer.address, true);

    /// Mint content with voucher
    const lazyMinter = new LazyMinter({
      contract: contractUDAOContent,
      signer: backend,
    });
    const voucher_udaoc = await lazyMinter.createVoucher(
      1,
      "ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi",
      contentCreator.address,
      true,
      "Content Name",
      "Content Description"
    );
    await expect(
      contractUDAOContent.connect(contentCreator).redeem(voucher_udaoc)
    )
      .to.emit(contractUDAOContent, "Transfer") // transfer from null address to minter
      .withArgs(
        "0x0000000000000000000000000000000000000000",
        contentCreator.address,
        voucher_udaoc.tokenId
      );

    /// Validate content with voucher
    const lazyValidation = new LazyValidation({
      contract: contractValidationManager,
      signer: backend,
    });
    const voucher = await lazyValidation.createVoucher(
      1,
      [validator.address],
      [10],
      true
    );
    await expect(
      contractValidationManager.connect(contentCreator).setAsValidated(voucher)
    )
      .to.emit(contractValidationManager, "ValidationEnded")
      .withArgs(voucher.tokenId, true);

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
    const lazyCoaching = new LazyCoaching({
      contract: contractPlatformTreasury,
      signer: foundation,
    });

    const coaching_voucher = await lazyCoaching.createVoucher(
      1,
      ethers.utils.parseEther("2"),
      Date.now() + 999999999,
      true,
      contentBuyer.address
    );
    await expect(
      contractPlatformTreasury
        .connect(contentBuyer)
        .buyCoaching(coaching_voucher)
    ).to.revertedWith("Signature invalid or unauthorized");
  });

  it("Should fail to buy a couaching if voucher expired", async function () {
    const {
      backend,
      contentCreator,
      contentBuyer,
      validatorCandidate,
      validator,
      superValidatorCandidate,
      superValidator,
      foundation,
      governanceCandidate,
      governanceMember,
      jurorCandidate,
      jurorMember,
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
    } = await deploy();

    /// Set KYC
    await contractRoleManager.setKYC(contentCreator.address, true);
    await contractRoleManager.setKYC(contentBuyer.address, true);

    /// Mint content with voucher
    const lazyMinter = new LazyMinter({
      contract: contractUDAOContent,
      signer: backend,
    });
    const voucher_udaoc = await lazyMinter.createVoucher(
      1,
      "ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi",
      contentCreator.address,
      true,
      "Content Name",
      "Content Description"
    );
    await expect(
      contractUDAOContent.connect(contentCreator).redeem(voucher_udaoc)
    )
      .to.emit(contractUDAOContent, "Transfer") // transfer from null address to minter
      .withArgs(
        "0x0000000000000000000000000000000000000000",
        contentCreator.address,
        voucher_udaoc.tokenId
      );

    /// Validate content with voucher
    const lazyValidation = new LazyValidation({
      contract: contractValidationManager,
      signer: backend,
    });
    const voucher = await lazyValidation.createVoucher(
      1,
      [validator.address],
      [10],
      true
    );
    await expect(
      contractValidationManager.connect(contentCreator).setAsValidated(voucher)
    )
      .to.emit(contractValidationManager, "ValidationEnded")
      .withArgs(voucher.tokenId, true);

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

    const lazyCoaching = new LazyCoaching({
      contract: contractPlatformTreasury,
      signer: backend,
    });
    const coaching_voucher = await lazyCoaching.createVoucher(
      1,
      ethers.utils.parseEther("2"),
      0,
      true,
      contentBuyer.address
    );
    await expect(
      contractPlatformTreasury
        .connect(contentBuyer)
        .buyCoaching(coaching_voucher)
    ).to.revertedWith("Voucher has expired.");
  });

  it("Should fail to buy coaching if content does not exists", async function () {
    const {
      backend,
      contentCreator,
      contentBuyer,
      validatorCandidate,
      validator,
      superValidatorCandidate,
      superValidator,
      foundation,
      governanceCandidate,
      governanceMember,
      jurorCandidate,
      jurorMember,
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
    } = await deploy();

    /// Set KYC
    await contractRoleManager.setKYC(contentCreator.address, true);
    await contractRoleManager.setKYC(contentBuyer.address, true);

    /// Mint content with voucher
    const lazyMinter = new LazyMinter({
      contract: contractUDAOContent,
      signer: backend,
    });
    const voucher_udaoc = await lazyMinter.createVoucher(
      1,
      "ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi",
      contentCreator.address,
      true,
      "Content Name",
      "Content Description"
    );
    await expect(
      contractUDAOContent.connect(contentCreator).redeem(voucher_udaoc)
    )
      .to.emit(contractUDAOContent, "Transfer") // transfer from null address to minter
      .withArgs(
        "0x0000000000000000000000000000000000000000",
        contentCreator.address,
        voucher_udaoc.tokenId
      );

    /// Validate content with voucher
    const lazyValidation = new LazyValidation({
      contract: contractValidationManager,
      signer: backend,
    });
    const voucher = await lazyValidation.createVoucher(
      1,
      [validator.address],
      [10],
      true
    );
    await expect(
      contractValidationManager.connect(contentCreator).setAsValidated(voucher)
    )
      .to.emit(contractValidationManager, "ValidationEnded")
      .withArgs(voucher.tokenId, true);

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
    const lazyCoaching = new LazyCoaching({
      contract: contractPlatformTreasury,
      signer: backend,
    });
    const coaching_voucher = await lazyCoaching.createVoucher(
      3,
      ethers.utils.parseEther("2"),
      Date.now() + 999999999,
      true,
      contentBuyer.address
    );
    await expect(
      contractPlatformTreasury
        .connect(contentBuyer)
        .buyCoaching(coaching_voucher)
    ).to.revertedWith("Content does not exist!");
  });

  it("Should fail to buy coaching if content is not validated yet", async function () {
    const {
      backend,
      contentCreator,
      contentBuyer,
      validatorCandidate,
      validator,
      superValidatorCandidate,
      superValidator,
      foundation,
      governanceCandidate,
      governanceMember,
      jurorCandidate,
      jurorMember,
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
    } = await deploy();

    /// Set KYC
    await contractRoleManager.setKYC(contentCreator.address, true);
    await contractRoleManager.setKYC(contentBuyer.address, true);

    /// Mint content with voucher
    const lazyMinter = new LazyMinter({
      contract: contractUDAOContent,
      signer: backend,
    });
    const voucher_udaoc = await lazyMinter.createVoucher(
      1,
      "ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi",
      contentCreator.address,
      true,
      "Content Name",
      "Content Description"
    );
    await expect(
      contractUDAOContent.connect(contentCreator).redeem(voucher_udaoc)
    )
      .to.emit(contractUDAOContent, "Transfer") // transfer from null address to minter
      .withArgs(
        "0x0000000000000000000000000000000000000000",
        contentCreator.address,
        voucher_udaoc.tokenId
      );

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
    const lazyCoaching = new LazyCoaching({
      contract: contractPlatformTreasury,
      signer: backend,
    });
    const coaching_voucher = await lazyCoaching.createVoucher(
      1,
      ethers.utils.parseEther("2"),
      Date.now() + 999999999,
      true,
      contentBuyer.address
    );
    await expect(
      contractPlatformTreasury
        .connect(contentBuyer)
        .buyCoaching(coaching_voucher)
    ).to.revertedWith("Content is not validated yet");
  });

  it("Should fail to buy coaching if buyer is banned", async function () {
    const {
      backend,
      contentCreator,
      contentBuyer,
      validatorCandidate,
      validator,
      superValidatorCandidate,
      superValidator,
      foundation,
      governanceCandidate,
      governanceMember,
      jurorCandidate,
      jurorMember,
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
    } = await deploy();

    /// Set KYC
    await contractRoleManager.setKYC(contentCreator.address, true);
    await contractRoleManager.setKYC(contentBuyer.address, true);

    /// Mint content with voucher
    const lazyMinter = new LazyMinter({
      contract: contractUDAOContent,
      signer: backend,
    });
    const voucher_udaoc = await lazyMinter.createVoucher(
      1,
      "ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi",
      contentCreator.address,
      true,
      "Content Name",
      "Content Description"
    );
    await expect(
      contractUDAOContent.connect(contentCreator).redeem(voucher_udaoc)
    )
      .to.emit(contractUDAOContent, "Transfer") // transfer from null address to minter
      .withArgs(
        "0x0000000000000000000000000000000000000000",
        contentCreator.address,
        voucher_udaoc.tokenId
      );

    /// Validate content with voucher
    const lazyValidation = new LazyValidation({
      contract: contractValidationManager,
      signer: backend,
    });
    const voucher = await lazyValidation.createVoucher(
      1,
      [validator.address],
      [10],
      true
    );
    await expect(
      contractValidationManager.connect(contentCreator).setAsValidated(voucher)
    )
      .to.emit(contractValidationManager, "ValidationEnded")
      .withArgs(voucher.tokenId, true);

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

    /// Set BAN
    await contractRoleManager.setBan(contentBuyer.address, true);
    const lazyCoaching = new LazyCoaching({
      contract: contractPlatformTreasury,
      signer: backend,
    });
    const coaching_voucher = await lazyCoaching.createVoucher(
      1,
      ethers.utils.parseEther("2"),
      Date.now() + 999999999,
      true,
      contentBuyer.address
    );
    await expect(
      contractPlatformTreasury
        .connect(contentBuyer)
        .buyCoaching(coaching_voucher)
    ).to.revertedWith("You are banned");
  });

  it("Should fail to buy coaching if instructer is banned", async function () {
    const {
      backend,
      contentCreator,
      contentBuyer,
      validatorCandidate,
      validator,
      superValidatorCandidate,
      superValidator,
      foundation,
      governanceCandidate,
      governanceMember,
      jurorCandidate,
      jurorMember,
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
    } = await deploy();

    /// Set KYC
    await contractRoleManager.setKYC(contentCreator.address, true);
    await contractRoleManager.setKYC(contentBuyer.address, true);

    /// Mint content with voucher
    const lazyMinter = new LazyMinter({
      contract: contractUDAOContent,
      signer: backend,
    });
    const voucher_udaoc = await lazyMinter.createVoucher(
      1,
      "ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi",
      contentCreator.address,
      true,
      "Content Name",
      "Content Description"
    );
    await expect(
      contractUDAOContent.connect(contentCreator).redeem(voucher_udaoc)
    )
      .to.emit(contractUDAOContent, "Transfer") // transfer from null address to minter
      .withArgs(
        "0x0000000000000000000000000000000000000000",
        contentCreator.address,
        voucher_udaoc.tokenId
      );

    /// Validate content with voucher
    const lazyValidation = new LazyValidation({
      contract: contractValidationManager,
      signer: backend,
    });
    const voucher = await lazyValidation.createVoucher(
      1,
      [validator.address],
      [10],
      true
    );
    await expect(
      contractValidationManager.connect(contentCreator).setAsValidated(voucher)
    )
      .to.emit(contractValidationManager, "ValidationEnded")
      .withArgs(voucher.tokenId, true);

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

    /// Set BAN
    await contractRoleManager.setBan(contentCreator.address, true);

    const lazyCoaching = new LazyCoaching({
      contract: contractPlatformTreasury,
      signer: backend,
    });
    const coaching_voucher = await lazyCoaching.createVoucher(
      1,
      ethers.utils.parseEther("2"),
      Date.now() + 999999999,
      true,
      contentBuyer.address
    );
    await expect(
      contractPlatformTreasury
        .connect(contentBuyer)
        .buyCoaching(coaching_voucher)
    ).to.revertedWith("Instructor is banned");
  });

  it("Should fail to buy coaching if instructer is not KYCed", async function () {
    const {
      backend,
      contentCreator,
      contentBuyer,
      validatorCandidate,
      validator,
      superValidatorCandidate,
      superValidator,
      foundation,
      governanceCandidate,
      governanceMember,
      jurorCandidate,
      jurorMember,
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
    } = await deploy();

    /// Set KYC
    await contractRoleManager.setKYC(contentCreator.address, true);
    await contractRoleManager.setKYC(contentBuyer.address, true);

    /// Mint content with voucher
    const lazyMinter = new LazyMinter({
      contract: contractUDAOContent,
      signer: backend,
    });
    const voucher_udaoc = await lazyMinter.createVoucher(
      1,
      "ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi",
      contentCreator.address,
      true,
      "Content Name",
      "Content Description"
    );
    await expect(
      contractUDAOContent.connect(contentCreator).redeem(voucher_udaoc)
    )
      .to.emit(contractUDAOContent, "Transfer") // transfer from null address to minter
      .withArgs(
        "0x0000000000000000000000000000000000000000",
        contentCreator.address,
        voucher_udaoc.tokenId
      );

    /// Validate content with voucher
    const lazyValidation = new LazyValidation({
      contract: contractValidationManager,
      signer: backend,
    });
    const voucher = await lazyValidation.createVoucher(
      1,
      [validator.address],
      [10],
      true
    );
    await expect(
      contractValidationManager.connect(contentCreator).setAsValidated(voucher)
    )
      .to.emit(contractValidationManager, "ValidationEnded")
      .withArgs(voucher.tokenId, true);

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

    /// Set KYC to false
    await contractRoleManager.setKYC(contentCreator.address, false);

    const lazyCoaching = new LazyCoaching({
      contract: contractPlatformTreasury,
      signer: backend,
    });
    const coaching_voucher = await lazyCoaching.createVoucher(
      1,
      ethers.utils.parseEther("2"),
      Date.now() + 999999999,
      true,
      contentBuyer.address
    );
    await expect(
      contractPlatformTreasury
        .connect(contentBuyer)
        .buyCoaching(coaching_voucher)
    ).to.revertedWith("Instructor is not KYCed");
  });

  it("Should fail to buy coaching if buyer is not KYCed", async function () {
    const {
      backend,
      contentCreator,
      contentBuyer,
      validatorCandidate,
      validator,
      superValidatorCandidate,
      superValidator,
      foundation,
      governanceCandidate,
      governanceMember,
      jurorCandidate,
      jurorMember,
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
    } = await deploy();

    /// Set KYC
    await contractRoleManager.setKYC(contentCreator.address, true);
    await contractRoleManager.setKYC(contentBuyer.address, true);

    /// Set BAN
    /// Mint content with voucher
    const lazyMinter = new LazyMinter({
      contract: contractUDAOContent,
      signer: backend,
    });
    const voucher_udaoc = await lazyMinter.createVoucher(
      1,
      "ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi",
      contentCreator.address,
      true,
      "Content Name",
      "Content Description"
    );
    await expect(
      contractUDAOContent.connect(contentCreator).redeem(voucher_udaoc)
    )
      .to.emit(contractUDAOContent, "Transfer") // transfer from null address to minter
      .withArgs(
        "0x0000000000000000000000000000000000000000",
        contentCreator.address,
        voucher_udaoc.tokenId
      );

    /// Validate content with voucher
    const lazyValidation = new LazyValidation({
      contract: contractValidationManager,
      signer: backend,
    });
    const voucher = await lazyValidation.createVoucher(
      1,
      [validator.address],
      [10],
      true
    );
    await expect(
      contractValidationManager.connect(contentCreator).setAsValidated(voucher)
    )
      .to.emit(contractValidationManager, "ValidationEnded")
      .withArgs(voucher.tokenId, true);

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

    await contractRoleManager.setKYC(contentBuyer.address, false);

    const lazyCoaching = new LazyCoaching({
      contract: contractPlatformTreasury,
      signer: backend,
    });
    const coaching_voucher = await lazyCoaching.createVoucher(
      1,
      ethers.utils.parseEther("2"),
      Date.now() + 999999999,
      true,
      contentBuyer.address
    );
    await expect(
      contractPlatformTreasury
        .connect(contentBuyer)
        .buyCoaching(coaching_voucher)
    ).to.revertedWith("You are not KYCed");
  });

  it("Should finalize coaching as learner", async function () {
    const {
      backend,
      contentCreator,
      contentBuyer,
      validatorCandidate,
      validator,
      superValidatorCandidate,
      superValidator,
      foundation,
      governanceCandidate,
      governanceMember,
      jurorCandidate,
      jurorMember,
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
    } = await deploy();

    /// Set KYC
    await contractRoleManager.setKYC(contentCreator.address, true);
    await contractRoleManager.setKYC(contentBuyer.address, true);

    /// Mint content with voucher
    const lazyMinter = new LazyMinter({
      contract: contractUDAOContent,
      signer: backend,
    });
    const udaoc_voucher = await lazyMinter.createVoucher(
      1,
      "ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi",
      contentCreator.address,
      true,
      "Content Name",
      "Content Description"
    );
    await expect(
      contractUDAOContent.connect(contentCreator).redeem(udaoc_voucher)
    )
      .to.emit(contractUDAOContent, "Transfer") // transfer from null address to minter
      .withArgs(
        "0x0000000000000000000000000000000000000000",
        contentCreator.address,
        udaoc_voucher.tokenId
      );

    /// Validate content with voucher
    const lazyValidation = new LazyValidation({
      contract: contractValidationManager,
      signer: backend,
    });
    const voucher = await lazyValidation.createVoucher(
      1,
      [validator.address],
      [10],
      true
    );
    await expect(
      contractValidationManager.connect(contentCreator).setAsValidated(voucher)
    )
      .to.emit(contractValidationManager, "ValidationEnded")
      .withArgs(voucher.tokenId, true);

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
    const lazyCoaching = new LazyCoaching({
      contract: contractPlatformTreasury,
      signer: backend,
    });
    const coaching_voucher = await lazyCoaching.createVoucher(
      1,
      ethers.utils.parseEther("2"),
      Date.now() + 999999999,
      true,
      contentBuyer.address
    );
    await contractPlatformTreasury
      .connect(contentBuyer)
      .buyCoaching(coaching_voucher);
    expect(await contractPlatformTreasury.getStudentListOfToken(1)).to.be.eql([
      contentBuyer.address,
    ]);

    await contractPlatformTreasury.connect(contentBuyer).finalizeCoaching(0);
    expect(
      await contractPlatformTreasury.instructorBalance(contentCreator.address)
    ).to.be.eql(ethers.utils.parseEther("1.906"));
  });

  it("Should finalize coaching as instructor when deadline met", async function () {
    const {
      backend,
      contentCreator,
      contentBuyer,
      validatorCandidate,
      validator,
      superValidatorCandidate,
      superValidator,
      foundation,
      governanceCandidate,
      governanceMember,
      jurorCandidate,
      jurorMember,
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
    } = await deploy();

    /// Set KYC
    await contractRoleManager.setKYC(contentCreator.address, true);
    await contractRoleManager.setKYC(contentBuyer.address, true);

    /// Mint content with voucher
    const lazyMinter = new LazyMinter({
      contract: contractUDAOContent,
      signer: backend,
    });
    const udaoc_voucher = await lazyMinter.createVoucher(
      1,
      "ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi",
      contentCreator.address,
      true,
      "Content Name",
      "Content Description"
    );
    await expect(
      contractUDAOContent.connect(contentCreator).redeem(udaoc_voucher)
    )
      .to.emit(contractUDAOContent, "Transfer") // transfer from null address to minter
      .withArgs(
        "0x0000000000000000000000000000000000000000",
        contentCreator.address,
        udaoc_voucher.tokenId
      );

    /// Validate content with voucher
    const lazyValidation = new LazyValidation({
      contract: contractValidationManager,
      signer: backend,
    });
    const voucher = await lazyValidation.createVoucher(
      1,
      [validator.address],
      [10],
      true
    );
    await expect(
      contractValidationManager.connect(contentCreator).setAsValidated(voucher)
    )
      .to.emit(contractValidationManager, "ValidationEnded")
      .withArgs(voucher.tokenId, true);

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
    const lazyCoaching = new LazyCoaching({
      contract: contractPlatformTreasury,
      signer: backend,
    });
    const coaching_voucher = await lazyCoaching.createVoucher(
      1,
      ethers.utils.parseEther("2"),
      Date.now() + 999999999,
      true,
      contentBuyer.address
    );
    await contractPlatformTreasury
      .connect(contentBuyer)
      .buyCoaching(coaching_voucher);
    expect(await contractPlatformTreasury.getStudentListOfToken(1)).to.be.eql([
      contentBuyer.address,
    ]);
    await network.provider.send("evm_increaseTime", [999999999]);
    await network.provider.send("evm_mine");
    await contractPlatformTreasury.connect(contentCreator).finalizeCoaching(0);
    expect(
      await contractPlatformTreasury.instructorBalance(contentCreator.address)
    ).to.be.eql(ethers.utils.parseEther("1.906"));
  });

  it("Should fail coaching as instructor if deadline is not met", async function () {
    const {
      backend,
      contentCreator,
      contentBuyer,
      validatorCandidate,
      validator,
      superValidatorCandidate,
      superValidator,
      foundation,
      governanceCandidate,
      governanceMember,
      jurorCandidate,
      jurorMember,
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
    } = await deploy();

    /// Set KYC
    await contractRoleManager.setKYC(contentCreator.address, true);
    await contractRoleManager.setKYC(contentBuyer.address, true);

    /// Mint content with voucher
    const lazyMinter = new LazyMinter({
      contract: contractUDAOContent,
      signer: backend,
    });
    const udaoc_voucher = await lazyMinter.createVoucher(
      1,
      "ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi",
      contentCreator.address,
      true,
      "Content Name",
      "Content Description"
    );
    await expect(
      contractUDAOContent.connect(contentCreator).redeem(udaoc_voucher)
    )
      .to.emit(contractUDAOContent, "Transfer") // transfer from null address to minter
      .withArgs(
        "0x0000000000000000000000000000000000000000",
        contentCreator.address,
        udaoc_voucher.tokenId
      );

    /// Validate content with voucher
    const lazyValidation = new LazyValidation({
      contract: contractValidationManager,
      signer: backend,
    });
    const voucher = await lazyValidation.createVoucher(
      1,
      [validator.address],
      [10],
      true
    );
    await expect(
      contractValidationManager.connect(contentCreator).setAsValidated(voucher)
    )
      .to.emit(contractValidationManager, "ValidationEnded")
      .withArgs(voucher.tokenId, true);

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
    const lazyCoaching = new LazyCoaching({
      contract: contractPlatformTreasury,
      signer: backend,
    });
    const coaching_voucher = await lazyCoaching.createVoucher(
      1,
      ethers.utils.parseEther("2"),
      Date.now() + 999999999,
      true,
      contentBuyer.address
    );
    await contractPlatformTreasury
      .connect(contentBuyer)
      .buyCoaching(coaching_voucher);
    expect(await contractPlatformTreasury.getStudentListOfToken(1)).to.be.eql([
      contentBuyer.address,
    ]);

    await expect(
      contractPlatformTreasury.connect(contentCreator).finalizeCoaching(0)
    ).to.revertedWith("Deadline is not met yet");
  });

  it("Should fail to finalize coaching if neither learner or instructor", async function () {
    const {
      backend,
      contentCreator,
      contentBuyer,
      validatorCandidate,
      validator,
      superValidatorCandidate,
      superValidator,
      foundation,
      governanceCandidate,
      governanceMember,
      jurorCandidate,
      jurorMember,
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
    } = await deploy();

    /// Set KYC
    await contractRoleManager.setKYC(contentCreator.address, true);
    await contractRoleManager.setKYC(contentBuyer.address, true);

    /// Mint content with voucher
    const lazyMinter = new LazyMinter({
      contract: contractUDAOContent,
      signer: backend,
    });
    const udaoc_voucher = await lazyMinter.createVoucher(
      1,
      "ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi",
      contentCreator.address,
      true,
      "Content Name",
      "Content Description"
    );
    await expect(
      contractUDAOContent.connect(contentCreator).redeem(udaoc_voucher)
    )
      .to.emit(contractUDAOContent, "Transfer") // transfer from null address to minter
      .withArgs(
        "0x0000000000000000000000000000000000000000",
        contentCreator.address,
        udaoc_voucher.tokenId
      );

    /// Validate content with voucher
    const lazyValidation = new LazyValidation({
      contract: contractValidationManager,
      signer: backend,
    });
    const voucher = await lazyValidation.createVoucher(
      1,
      [validator.address],
      [10],
      true
    );
    await expect(
      contractValidationManager.connect(contentCreator).setAsValidated(voucher)
    )
      .to.emit(contractValidationManager, "ValidationEnded")
      .withArgs(voucher.tokenId, true);

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
    const lazyCoaching = new LazyCoaching({
      contract: contractPlatformTreasury,
      signer: backend,
    });
    const coaching_voucher = await lazyCoaching.createVoucher(
      1,
      ethers.utils.parseEther("2"),
      Date.now() + 999999999,
      true,
      contentBuyer.address
    );
    await contractPlatformTreasury
      .connect(contentBuyer)
      .buyCoaching(coaching_voucher);
    expect(await contractPlatformTreasury.getStudentListOfToken(1)).to.be.eql([
      contentBuyer.address,
    ]);

    await expect(
      contractPlatformTreasury.connect(foundation).finalizeCoaching(0)
    ).to.be.revertedWith("You are not learner neither coach");
  });

  it("Should fail to finalize coaching if coaching does not exist", async function () {
    const {
      backend,
      contentCreator,
      contentBuyer,
      validatorCandidate,
      validator,
      superValidatorCandidate,
      superValidator,
      foundation,
      governanceCandidate,
      governanceMember,
      jurorCandidate,
      jurorMember,
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
    } = await deploy();

    /// Set KYC
    await contractRoleManager.setKYC(contentCreator.address, true);
    await contractRoleManager.setKYC(contentBuyer.address, true);

    /// Mint content with voucher
    const lazyMinter = new LazyMinter({
      contract: contractUDAOContent,
      signer: backend,
    });
    const udaoc_voucher = await lazyMinter.createVoucher(
      1,
      "ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi",
      contentCreator.address,
      true,
      "Content Name",
      "Content Description"
    );
    await expect(
      contractUDAOContent.connect(contentCreator).redeem(udaoc_voucher)
    )
      .to.emit(contractUDAOContent, "Transfer") // transfer from null address to minter
      .withArgs(
        "0x0000000000000000000000000000000000000000",
        contentCreator.address,
        udaoc_voucher.tokenId
      );

    /// Validate content with voucher
    const lazyValidation = new LazyValidation({
      contract: contractValidationManager,
      signer: backend,
    });
    const voucher = await lazyValidation.createVoucher(
      1,
      [validator.address],
      [10],
      true
    );
    await expect(
      contractValidationManager.connect(contentCreator).setAsValidated(voucher)
    )
      .to.emit(contractValidationManager, "ValidationEnded")
      .withArgs(voucher.tokenId, true);

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
    const lazyCoaching = new LazyCoaching({
      contract: contractPlatformTreasury,
      signer: backend,
    });
    const coaching_voucher = await lazyCoaching.createVoucher(
      1,
      ethers.utils.parseEther("2"),
      Date.now() + 999999999,
      true,
      contentBuyer.address
    );
    await contractPlatformTreasury
      .connect(contentBuyer)
      .buyCoaching(coaching_voucher);
    expect(await contractPlatformTreasury.getStudentListOfToken(1)).to.be.eql([
      contentBuyer.address,
    ]);

    await expect(
      contractPlatformTreasury.connect(contentBuyer).finalizeCoaching(1)
    ).to.be.revertedWith("Coaching id doesn't exist");
  });
});