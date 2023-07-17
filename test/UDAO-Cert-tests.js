const { expect } = require("chai");
const hardhat = require("hardhat");
const { ethers } = hardhat;
const chai = require("chai");
const BN = require("bn.js");
const { LazyUDAOCertMinter } = require("../lib/LazyUDAOCertMinter");
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

describe("UDAO Cert Contract", function () {
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

  it("Should create certificate", async function () {
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
  //     contractSupervision,
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

  it("Should fail to create certificate when the user hasn't kyced", async function () {
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
    await contractRoleManager.setKYC(contentBuyer.address, false);

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
      contractUDAOCertificate.connect(contentBuyer).redeem(voucher)
    ).to.revertedWith("You are not KYCed");
  });

  it("Should fail to create certificate when paused", async function () {
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
    await contractRoleManager.setKYC(contentBuyer.address, false);

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

    await expect(contractUDAOCertificate.pause());

    await expect(
      contractUDAOCertificate.connect(contentBuyer).redeem(voucher)
    ).to.revertedWith("Pausable: paused");
  });
});
