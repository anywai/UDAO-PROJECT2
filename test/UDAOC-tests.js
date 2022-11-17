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

  // add staking contract to validation manager
  await contractValidationManager
    .connect(foundation)
    .setStaker(contractUDAOStaker.address);
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

describe("UDAOC Contract", function () {
  it("Should deploy", async function () {
    const {
      backend,
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
  });

  it("Should KYC Content Creator", async function () {
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
    await contractRoleManager.setKYC(contentCreator.address, true);

    const tx = await contractUDAOContent.getChainID();
    const lazyMinter = new LazyMinter({
      contract: contractUDAOContent,
      signer: backend,
    });
    const voucher = await lazyMinter.createVoucher(
      1,
      [ethers.utils.parseEther("1.0"), ethers.utils.parseEther("2.0")],
      "ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi",
      contentCreator.address,
      "Content Name",
      "Content Description"
    );
    await expect(contractUDAOContent.connect(contentCreator).redeem(voucher))
      .to.emit(contractUDAOContent, "Transfer") // transfer from null address to minter
      .withArgs(
        "0x0000000000000000000000000000000000000000",
        contentCreator.address,
        voucher.tokenId
      );
  });

  it("Should fail to create Content if wrong redeemer", async function () {
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
    await contractRoleManager.setKYC(contentCreator.address, true);

    const tx = await contractUDAOContent.getChainID();
    const lazyMinter = new LazyMinter({
      contract: contractUDAOContent,
      signer: backend,
    });
    const voucher = await lazyMinter.createVoucher(
      1,
      [ethers.utils.parseEther("1.0"), ethers.utils.parseEther("2.0")],
      "ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi",
      contentCreator.address,
      "Content Name",
      "Content Description"
    );
    await expect(
      contractUDAOContent.connect(contentBuyer).redeem(voucher)
    ).to.revertedWith("You are not the redeemer");
  });

  it("Should fail to create Content if wrong signer", async function () {
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
    await contractRoleManager.setKYC(contentCreator.address, true);

    const tx = await contractUDAOContent.getChainID();
    const lazyMinter = new LazyMinter({
      contract: contractUDAOContent,
      signer: foundation,
    });
    const voucher = await lazyMinter.createVoucher(
      1,
      [ethers.utils.parseEther("1.0"), ethers.utils.parseEther("2.0")],
      "ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi",
      contentCreator.address,
      "Content Name",
      "Content Description"
    );
    await expect(
      contractUDAOContent.connect(contentCreator).redeem(voucher)
    ).to.revertedWith("Signature invalid or unauthorized");
  });

  it("Should get the price of the content", async function () {
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
    await contractRoleManager.setKYC(contentCreator.address, true);

    const tx = await contractUDAOContent.getChainID();
    const lazyMinter = new LazyMinter({
      contract: contractUDAOContent,
      signer: backend,
    });
    const voucher = await lazyMinter.createVoucher(
      1,
      [ethers.utils.parseEther("1.0"), ethers.utils.parseEther("2.0")],
      "ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi",
      contentCreator.address,
      "Content Name",
      "Content Description"
    );
    await expect(contractUDAOContent.connect(contentCreator).redeem(voucher))
      .to.emit(contractUDAOContent, "Transfer") // transfer from null address to minter
      .withArgs(
        "0x0000000000000000000000000000000000000000",
        contentCreator.address,
        voucher.tokenId
      );
    expect(await contractUDAOContent.getPriceContent(1, 0)).to.eql(
      ethers.utils.parseEther("1.0")
    );
  });

  it("Should set the price of the whole content", async function () {
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
    await contractRoleManager.setKYC(contentCreator.address, true);

    const tx = await contractUDAOContent.getChainID();
    const lazyMinter = new LazyMinter({
      contract: contractUDAOContent,
      signer: backend,
    });
    const voucher = await lazyMinter.createVoucher(
      1,
      [ethers.utils.parseEther("1.0"), ethers.utils.parseEther("2.0")],
      "ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi",
      contentCreator.address,
      "Content Name",
      "Content Description"
    );
    await expect(contractUDAOContent.connect(contentCreator).redeem(voucher))
      .to.emit(contractUDAOContent, "Transfer") // transfer from null address to minter
      .withArgs(
        "0x0000000000000000000000000000000000000000",
        contentCreator.address,
        voucher.tokenId
      );
    await contractUDAOContent
      .connect(contentCreator)
      .setPriceContent(1, ethers.utils.parseEther("2.0"));
    expect(await contractUDAOContent.getPriceContent(1, 0)).to.eql(
      ethers.utils.parseEther("2.0")
    );
  });

  it("Should set the price of the single part of the content", async function () {
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
    await contractRoleManager.setKYC(contentCreator.address, true);

    const tx = await contractUDAOContent.getChainID();
    const lazyMinter = new LazyMinter({
      contract: contractUDAOContent,
      signer: backend,
    });
    const voucher = await lazyMinter.createVoucher(
      1,
      [ethers.utils.parseEther("1.0"), ethers.utils.parseEther("2.0")],
      "ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi",
      contentCreator.address,
      "Content Name",
      "Content Description"
    );
    await expect(contractUDAOContent.connect(contentCreator).redeem(voucher))
      .to.emit(contractUDAOContent, "Transfer") // transfer from null address to minter
      .withArgs(
        "0x0000000000000000000000000000000000000000",
        contentCreator.address,
        voucher.tokenId
      );
    await contractUDAOContent
      .connect(contentCreator)
      .setPartialContent(1, 1, ethers.utils.parseEther("2.0"));
    expect(await contractUDAOContent.getPriceContent(1, 1)).to.eql(
      ethers.utils.parseEther("2.0")
    );
  });

  it("Should set the price of the multiple parts of the content", async function () {
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
    await contractRoleManager.setKYC(contentCreator.address, true);

    const tx = await contractUDAOContent.getChainID();
    const lazyMinter = new LazyMinter({
      contract: contractUDAOContent,
      signer: backend,
    });
    const voucher = await lazyMinter.createVoucher(
      1,
      [ethers.utils.parseEther("1.0"), ethers.utils.parseEther("2.0")],
      "ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi",
      contentCreator.address,
      "Content Name",
      "Content Description"
    );
    await expect(contractUDAOContent.connect(contentCreator).redeem(voucher))
      .to.emit(contractUDAOContent, "Transfer") // transfer from null address to minter
      .withArgs(
        "0x0000000000000000000000000000000000000000",
        contentCreator.address,
        voucher.tokenId
      );
    await contractUDAOContent
      .connect(contentCreator)
      .setBatchPartialContent(
        1,
        [0, 1],
        [ethers.utils.parseEther("3.0"), ethers.utils.parseEther("1.0")]
      );
    expect(await contractUDAOContent.getPriceContent(1, 0)).to.eql(
      ethers.utils.parseEther("3.0")
    );
    expect(await contractUDAOContent.getPriceContent(1, 1)).to.eql(
      ethers.utils.parseEther("1.0")
    );
  });

  it("Should fail setting the price of the whole content if not owner", async function () {
    const {
      backend,
      contentCreator,
      contentBuyer,
      contractRoleManager,
      contractUDAOContent,
    } = await deploy();
    await contractRoleManager.setKYC(contentCreator.address, true);

    const tx = await contractUDAOContent.getChainID();
    const lazyMinter = new LazyMinter({
      contract: contractUDAOContent,
      signer: backend,
    });
    const voucher = await lazyMinter.createVoucher(
      1,
      [ethers.utils.parseEther("1.0"), ethers.utils.parseEther("2.0")],
      "ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi",
      contentCreator.address,
      "Content Name",
      "Content Description"
    );
    await expect(contractUDAOContent.connect(contentCreator).redeem(voucher))
      .to.emit(contractUDAOContent, "Transfer") // transfer from null address to minter
      .withArgs(
        "0x0000000000000000000000000000000000000000",
        contentCreator.address,
        voucher.tokenId
      );
    await expect(
      contractUDAOContent
        .connect(contentBuyer)
        .setPriceContent(1, ethers.utils.parseEther("2.0"))
    ).to.revertedWith("You are not the owner");
  });

  it("Should fail setting the price of a single part of the content if not owner", async function () {
    const {
      backend,
      contentCreator,
      contentBuyer,
      contractRoleManager,
      contractUDAOContent,
    } = await deploy();
    await contractRoleManager.setKYC(contentCreator.address, true);

    const tx = await contractUDAOContent.getChainID();
    const lazyMinter = new LazyMinter({
      contract: contractUDAOContent,
      signer: backend,
    });
    const voucher = await lazyMinter.createVoucher(
      1,
      [ethers.utils.parseEther("1.0"), ethers.utils.parseEther("2.0")],
      "ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi",
      contentCreator.address,
      "Content Name",
      "Content Description"
    );
    await expect(contractUDAOContent.connect(contentCreator).redeem(voucher))
      .to.emit(contractUDAOContent, "Transfer") // transfer from null address to minter
      .withArgs(
        "0x0000000000000000000000000000000000000000",
        contentCreator.address,
        voucher.tokenId
      );
    await expect(
      contractUDAOContent
        .connect(contentBuyer)
        .setPartialContent(1, 1, ethers.utils.parseEther("2.0"))
    ).to.revertedWith("You are not the owner");
  });

  it("Should fail setting the price of the multiple parts of the content if not owner", async function () {
    const {
      backend,
      contentCreator,
      contentBuyer,
      contractRoleManager,
      contractUDAOContent,
    } = await deploy();
    await contractRoleManager.setKYC(contentCreator.address, true);

    const tx = await contractUDAOContent.getChainID();
    const lazyMinter = new LazyMinter({
      contract: contractUDAOContent,
      signer: backend,
    });
    const voucher = await lazyMinter.createVoucher(
      1,
      [ethers.utils.parseEther("1.0"), ethers.utils.parseEther("2.0")],
      "ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi",
      contentCreator.address,
      "Content Name",
      "Content Description"
    );
    await expect(contractUDAOContent.connect(contentCreator).redeem(voucher))
      .to.emit(contractUDAOContent, "Transfer") // transfer from null address to minter
      .withArgs(
        "0x0000000000000000000000000000000000000000",
        contentCreator.address,
        voucher.tokenId
      );
    await expect(
      contractUDAOContent
        .connect(contentBuyer)
        .setBatchPartialContent(
          1,
          [0, 1],
          [ethers.utils.parseEther("3.0"), ethers.utils.parseEther("1.0")]
        )
    ).to.revertedWith("You are not the owner");
  });

  it("Should get token URI of the Content", async function () {
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
    await contractRoleManager.setKYC(contentCreator.address, true);

    const tx = await contractUDAOContent.getChainID();
    const lazyMinter = new LazyMinter({
      contract: contractUDAOContent,
      signer: backend,
    });
    const voucher = await lazyMinter.createVoucher(
      1,
      [ethers.utils.parseEther("1.0"), ethers.utils.parseEther("2.0")],
      "ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi",
      contentCreator.address,
      "Content Name",
      "Content Description"
    );
    await expect(contractUDAOContent.connect(contentCreator).redeem(voucher))
      .to.emit(contractUDAOContent, "Transfer") // transfer from null address to minter
      .withArgs(
        "0x0000000000000000000000000000000000000000",
        contentCreator.address,
        voucher.tokenId
      );
    expect(await contractUDAOContent.tokenURI(1)).to.eql(
      "ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi"
    );
  });

  it("Should transfer token", async function () {
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
    await contractRoleManager.setKYC(contentCreator.address, true);
    await contractRoleManager.setKYC(contentBuyer.address, true);

    const tx = await contractUDAOContent.getChainID();
    const lazyMinter = new LazyMinter({
      contract: contractUDAOContent,
      signer: backend,
    });
    const voucher = await lazyMinter.createVoucher(
      1,
      [ethers.utils.parseEther("1.0"), ethers.utils.parseEther("2.0")],
      "ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi",
      contentCreator.address,
      "Content Name",
      "Content Description"
    );
    await expect(contractUDAOContent.connect(contentCreator).redeem(voucher))
      .to.emit(contractUDAOContent, "Transfer") // transfer from null address to minter
      .withArgs(
        "0x0000000000000000000000000000000000000000",
        contentCreator.address,
        voucher.tokenId
      );
    await expect(
      contractUDAOContent
        .connect(contentCreator)
        .transferFrom(contentCreator.address, contentBuyer.address, 1)
    )
      .to.emit(contractUDAOContent, "Transfer") // transfer from null address to minter
      .withArgs(contentCreator.address, contentBuyer.address, 1);
  });

  it("Should fail to transfer token if receiver is not KYCed", async function () {
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
    await contractRoleManager.setKYC(contentCreator.address, true);

    const tx = await contractUDAOContent.getChainID();
    const lazyMinter = new LazyMinter({
      contract: contractUDAOContent,
      signer: backend,
    });
    const voucher = await lazyMinter.createVoucher(
      1,
      [ethers.utils.parseEther("1.0"), ethers.utils.parseEther("2.0")],
      "ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi",
      contentCreator.address,
      "Content Name",
      "Content Description"
    );
    await expect(contractUDAOContent.connect(contentCreator).redeem(voucher))
      .to.emit(contractUDAOContent, "Transfer") // transfer from null address to minter
      .withArgs(
        "0x0000000000000000000000000000000000000000",
        contentCreator.address,
        voucher.tokenId
      );
    await expect(
      contractUDAOContent
        .connect(contentCreator)
        .transferFrom(contentCreator.address, contentBuyer.address, 1)
    ).to.revertedWith("Receiver is not KYCed!");
  });

  it("Should fail to transfer token if receiver is banned", async function () {
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
    await contractRoleManager.setKYC(contentCreator.address, true);
    await contractRoleManager.setKYC(contentBuyer.address, true);
    await contractRoleManager.setBan(contentBuyer.address, true);

    const tx = await contractUDAOContent.getChainID();
    const lazyMinter = new LazyMinter({
      contract: contractUDAOContent,
      signer: backend,
    });
    const voucher = await lazyMinter.createVoucher(
      1,
      [ethers.utils.parseEther("1.0"), ethers.utils.parseEther("2.0")],
      "ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi",
      contentCreator.address,
      "Content Name",
      "Content Description"
    );
    await expect(contractUDAOContent.connect(contentCreator).redeem(voucher))
      .to.emit(contractUDAOContent, "Transfer") // transfer from null address to minter
      .withArgs(
        "0x0000000000000000000000000000000000000000",
        contentCreator.address,
        voucher.tokenId
      );
    await expect(
      contractUDAOContent
        .connect(contentCreator)
        .transferFrom(contentCreator.address, contentBuyer.address, 1)
    ).to.revertedWith("Receiver is banned!");
  });
  it("Should fail to transfer token if sender is not KYCed", async function () {
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
    await contractRoleManager.setKYC(contentCreator.address, true);
    await contractRoleManager.setKYC(contentBuyer.address, true);

    const tx = await contractUDAOContent.getChainID();
    const lazyMinter = new LazyMinter({
      contract: contractUDAOContent,
      signer: backend,
    });
    const voucher = await lazyMinter.createVoucher(
      1,
      [ethers.utils.parseEther("1.0"), ethers.utils.parseEther("2.0")],
      "ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi",
      contentCreator.address,
      "Content Name",
      "Content Description"
    );
    await expect(contractUDAOContent.connect(contentCreator).redeem(voucher))
      .to.emit(contractUDAOContent, "Transfer") // transfer from null address to minter
      .withArgs(
        "0x0000000000000000000000000000000000000000",
        contentCreator.address,
        voucher.tokenId
      );
    await contractRoleManager.setKYC(contentCreator.address, false);

    await expect(
      contractUDAOContent
        .connect(contentCreator)
        .transferFrom(contentCreator.address, contentBuyer.address, 1)
    ).to.revertedWith("Sender is not KYCed!");
  });

  it("Should fail to transfer token if sender is banned", async function () {
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
    await contractRoleManager.setKYC(contentCreator.address, true);
    await contractRoleManager.setKYC(contentBuyer.address, true);

    const tx = await contractUDAOContent.getChainID();
    const lazyMinter = new LazyMinter({
      contract: contractUDAOContent,
      signer: backend,
    });
    const voucher = await lazyMinter.createVoucher(
      1,
      [ethers.utils.parseEther("1.0"), ethers.utils.parseEther("2.0")],
      "ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi",
      contentCreator.address,
      "Content Name",
      "Content Description"
    );

    await expect(contractUDAOContent.connect(contentCreator).redeem(voucher))
      .to.emit(contractUDAOContent, "Transfer") // transfer from null address to minter
      .withArgs(
        "0x0000000000000000000000000000000000000000",
        contentCreator.address,
        voucher.tokenId
      );

    await contractRoleManager.setBan(contentCreator.address, true);
    await expect(
      contractUDAOContent
        .connect(contentCreator)
        .transferFrom(contentCreator.address, contentBuyer.address, 1)
    ).to.revertedWith("Sender is banned!");
  });

  it("Should burn token if administrator role", async function () {
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
    await contractRoleManager.setKYC(contentCreator.address, true);
    await contractRoleManager.setKYC(contentBuyer.address, true);

    const tx = await contractUDAOContent.getChainID();
    const lazyMinter = new LazyMinter({
      contract: contractUDAOContent,
      signer: backend,
    });
    const voucher = await lazyMinter.createVoucher(
      1,
      [ethers.utils.parseEther("1.0"), ethers.utils.parseEther("2.0")],
      "ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi",
      contentCreator.address,
      "Content Name",
      "Content Description"
    );

    await expect(contractUDAOContent.connect(contentCreator).redeem(voucher))
      .to.emit(contractUDAOContent, "Transfer") // transfer from null address to minter
      .withArgs(
        "0x0000000000000000000000000000000000000000",
        contentCreator.address,
        voucher.tokenId
      );

    await expect(contractUDAOContent.connect(foundation).burn(1))
      .to.emit(contractUDAOContent, "Transfer") // transfer from null address to minter
      .withArgs(
        contentCreator.address,
        "0x0000000000000000000000000000000000000000",
        voucher.tokenId
      );
  });

  it("Should fail to burn token if not administrator role", async function () {
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
    await contractRoleManager.setKYC(contentCreator.address, true);
    await contractRoleManager.setKYC(contentBuyer.address, true);

    const tx = await contractUDAOContent.getChainID();
    const lazyMinter = new LazyMinter({
      contract: contractUDAOContent,
      signer: backend,
    });
    const voucher = await lazyMinter.createVoucher(
      1,
      [ethers.utils.parseEther("1.0"), ethers.utils.parseEther("2.0")],
      "ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi",
      contentCreator.address,
      "Content Name",
      "Content Description"
    );

    await expect(contractUDAOContent.connect(contentCreator).redeem(voucher))
      .to.emit(contractUDAOContent, "Transfer") // transfer from null address to minter
      .withArgs(
        "0x0000000000000000000000000000000000000000",
        contentCreator.address,
        voucher.tokenId
      );

    await expect(
      contractUDAOContent.connect(contentBuyer).burn(1)
    ).to.revertedWith(
      "AccessControl: account " +
        contentBuyer.address.toLowerCase() +
        " is missing role"
    );
  });

  it("Should return true if supports ERC721 interface", async function () {
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
    await contractRoleManager.setKYC(contentCreator.address, true);
    await contractRoleManager.setKYC(contentBuyer.address, true);

    expect(await contractUDAOContent.supportsInterface("0x80ac58cd")).to.eql(
      true
    );
  });
});
