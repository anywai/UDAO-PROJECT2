const { expect } = require("chai");
const hardhat = require("hardhat");
const { ethers } = hardhat;
const chai = require("chai");
const BN = require("bn.js");
const { LazyMinter } = require("../lib/LazyMinter");
const { LazyRole } = require("../lib/LazyRole");
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
  let factoryContractManager = await ethers.getContractFactory(
    "ContractManager"
  );

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

  let factoryJurorManager = await ethers.getContractFactory("JurorManager");
  const contractJurorManager = await factoryJurorManager.deploy(
    contractRoleManager.address,
    contractUDAOContent.address,
    contractValidationManager.address
  );
  const contractContractManager = await factoryContractManager.deploy(
    contractValidationManager.address,
    contractJurorManager.address,
    contractUDAO.address,
    contractUDAOContent.address,
    contractRoleManager.address
  );

  const contractUDAOVp = await factoryUDAOVp.deploy(
    contractRoleManager.address,
    contractContractManager.address
  );
  const contractPlatformTreasury = await factoryPlatformTreasury.deploy(
    contractContractManager.address,
    contractRoleManager.address
  );

  const contractUDAOStaker = await factoryUDAOStaker.deploy(
    contractPlatformTreasury.address,
    contractRoleManager.address,
    contractUDAOVp.address,
    contractContractManager.address
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
  // add missing contract addresses to the contract manager
  await contractContractManager
    .connect(backend)
    .setAddressStaking(contractUDAOStaker.address);
  await contractContractManager
    .connect(backend)
    .setPlatformTreasuryAddress(contractPlatformTreasury.address);
  await contractContractManager
    .connect(backend)
    .setAddressUdaoVp(contractUDAOVp.address);
  // add staking contract to udao-vp
  await contractUDAOVp.connect(backend).updateAddresses();

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

describe("UDAO Cert Contract", function () {
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

  it("Should create certificate", async function () {
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
    await contractRoleManager.setKYC(contentBuyer.address, true);

    const tx = await contractUDAOCertificate.getChainID();
    const lazyMinter = new LazyUDAOCertMinter({
      contract: contractUDAOCertificate,
      signer: backend,
    });
    const voucher = await lazyMinter.createVoucher(
      1,
      "ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi",
      contentBuyer.address,
      "Content Name",
      "Content Description"
    );
    await expect(contractUDAOCertificate.connect(contentBuyer).redeem(voucher))
      .to.emit(contractUDAOCertificate, "Transfer") // transfer from null address to minter
      .withArgs(
        "0x0000000000000000000000000000000000000000",
        contentBuyer.address,
        voucher.tokenId
      );
  });

  it("Should fail to create certificate if wrong redeemer", async function () {
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

    const tx = await contractUDAOCertificate.getChainID();
    const lazyMinter = new LazyUDAOCertMinter({
      contract: contractUDAOCertificate,
      signer: backend,
    });
    const voucher = await lazyMinter.createVoucher(
      1,
      "ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi",
      contentBuyer.address,
      "Content Name",
      "Content Description"
    );
    await expect(
      contractUDAOCertificate.connect(contentCreator).redeem(voucher)
    ).to.revertedWith("You are not the redeemer");
  });

  it("Should fail to create certificate if wrong signer", async function () {
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
    await contractRoleManager.setKYC(contentBuyer.address, true);

    const tx = await contractUDAOCertificate.getChainID();
    const lazyMinter = new LazyUDAOCertMinter({
      contract: contractUDAOCertificate,
      signer: foundation,
    });
    const voucher = await lazyMinter.createVoucher(
      1,
      "ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi",
      contentBuyer.address,
      "Content Name",
      "Content Description"
    );
    await expect(
      contractUDAOCertificate.connect(contentBuyer).redeem(voucher)
    ).to.revertedWith("Signature invalid or unauthorized");
  });

  // it("Should fail to create certificate if not KYCed", async function () {
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
  //     contractValidationManager,
  //     contractPlatformTreasury,
  //     contractUDAOVp,
  //     contractUDAOStaker,
  //     contractUDAOTimelockController,
  //     contractUDAOGovernor,
  //   } = await deploy();
  //   await contractRoleManager.setKYC(contentBuyer.address, false);

  //   const tx = await contractUDAOCertificate.getChainID();
  //   const lazyMinter = new LazyUDAOCertMinter({
  //     contract: contractUDAOCertificate,
  //     signer: foundation,
  //   });
  //   const voucher = await lazyMinter.createVoucher(
  //     1,
  //     "ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi",
  //     contentBuyer.address,
  //     "Content Name",
  //     "Content Description"
  //   );
  //   await expect(
  //     contractUDAOCertificate.connect(contentBuyer).redeem(voucher)
  //   ).to.revertedWith("You are not KYCed");
  // });

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
    await contractRoleManager.setKYC(contentBuyer.address, true);

    const tx = await contractUDAOCertificate.getChainID();
    const lazyMinter = new LazyUDAOCertMinter({
      contract: contractUDAOCertificate,
      signer: backend,
    });
    const voucher = await lazyMinter.createVoucher(
      1,
      "ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi",
      contentBuyer.address,
      "Content Name",
      "Content Description"
    );
    await expect(contractUDAOCertificate.connect(contentBuyer).redeem(voucher))
      .to.emit(contractUDAOCertificate, "Transfer") // transfer from null address to minter
      .withArgs(
        "0x0000000000000000000000000000000000000000",
        contentBuyer.address,
        voucher.tokenId
      );
    expect(await contractUDAOCertificate.tokenURI(1)).to.eql(
      "ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi"
    );
  });

  it("Should emergency transfer certificate if backend", async function () {
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

    const tx = await contractUDAOCertificate.getChainID();
    const lazyMinter = new LazyUDAOCertMinter({
      contract: contractUDAOCertificate,
      signer: backend,
    });
    const voucher = await lazyMinter.createVoucher(
      1,
      "ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi",
      contentCreator.address,
      "Content Name",
      "Content Description"
    );
    await expect(
      contractUDAOCertificate.connect(contentCreator).redeem(voucher)
    )
      .to.emit(contractUDAOCertificate, "Transfer") // transfer from null address to minter
      .withArgs(
        "0x0000000000000000000000000000000000000000",
        contentCreator.address,
        voucher.tokenId
      );
    await expect(
      contractUDAOCertificate
        .connect(backend)
        .emergencyTransfer(contentCreator.address, contentBuyer.address, 1)
    )
      .to.emit(contractUDAOCertificate, "Transfer") // transfer from null address to minter
      .withArgs(contentCreator.address, contentBuyer.address, voucher.tokenId);
  });

  it("Should fail emergency transfer certificate if not backend", async function () {
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

    const tx = await contractUDAOCertificate.getChainID();
    const lazyMinter = new LazyUDAOCertMinter({
      contract: contractUDAOCertificate,
      signer: backend,
    });
    const voucher = await lazyMinter.createVoucher(
      1,
      "ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi",
      contentCreator.address,
      "Content Name",
      "Content Description"
    );
    await expect(
      contractUDAOCertificate.connect(contentCreator).redeem(voucher)
    )
      .to.emit(contractUDAOCertificate, "Transfer") // transfer from null address to minter
      .withArgs(
        "0x0000000000000000000000000000000000000000",
        contentCreator.address,
        voucher.tokenId
      );
    await expect(
      contractUDAOCertificate
        .connect(foundation)
        .emergencyTransfer(contentCreator.address, contentBuyer.address, 1)
    ).to.revertedWith(
      "AccessControl: account " +
        foundation.address.toLowerCase() +
        " is missing role 0x25cf2b509f2a7f322675b2a5322b182f44ad2c03ac941a0af17c9b178f5d5d5f"
    );
  });

  it("Should fail transfer certificate if not backend", async function () {
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

    const tx = await contractUDAOCertificate.getChainID();
    const lazyMinter = new LazyUDAOCertMinter({
      contract: contractUDAOCertificate,
      signer: backend,
    });
    const voucher = await lazyMinter.createVoucher(
      1,
      "ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi",
      contentCreator.address,
      "Content Name",
      "Content Description"
    );
    await expect(
      contractUDAOCertificate.connect(contentCreator).redeem(voucher)
    )
      .to.emit(contractUDAOCertificate, "Transfer") // transfer from null address to minter
      .withArgs(
        "0x0000000000000000000000000000000000000000",
        contentCreator.address,
        voucher.tokenId
      );
    await expect(
      contractUDAOCertificate
        .connect(contentCreator)
        .transferFrom(contentCreator.address, contentBuyer.address, 1)
    ).to.revertedWith("You don't have right to transfer token");
  });

  it("Should burn certificate if owner", async function () {
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

    const tx = await contractUDAOCertificate.getChainID();
    const lazyMinter = new LazyUDAOCertMinter({
      contract: contractUDAOCertificate,
      signer: backend,
    });
    const voucher = await lazyMinter.createVoucher(
      1,
      "ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi",
      contentCreator.address,
      "Content Name",
      "Content Description"
    );
    await expect(
      contractUDAOCertificate.connect(contentCreator).redeem(voucher)
    )
      .to.emit(contractUDAOCertificate, "Transfer") // transfer from null address to minter
      .withArgs(
        "0x0000000000000000000000000000000000000000",
        contentCreator.address,
        voucher.tokenId
      );
    await expect(contractUDAOCertificate.connect(contentCreator).burn(1))
      .to.emit(contractUDAOCertificate, "Transfer") // transfer from null address to minter
      .withArgs(
        contentCreator.address,
        "0x0000000000000000000000000000000000000000",
        voucher.tokenId
      );
  });

  it("Should fail burning certificate if not owner", async function () {
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

    const tx = await contractUDAOCertificate.getChainID();
    const lazyMinter = new LazyUDAOCertMinter({
      contract: contractUDAOCertificate,
      signer: backend,
    });
    const voucher = await lazyMinter.createVoucher(
      1,
      "ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi",
      contentCreator.address,
      "Content Name",
      "Content Description"
    );
    await expect(
      contractUDAOCertificate.connect(contentCreator).redeem(voucher)
    )
      .to.emit(contractUDAOCertificate, "Transfer") // transfer from null address to minter
      .withArgs(
        "0x0000000000000000000000000000000000000000",
        contentCreator.address,
        voucher.tokenId
      );
    await expect(
      contractUDAOCertificate.connect(contentBuyer).burn(1)
    ).to.revertedWith("You are not the owner of the token");
  });
});
