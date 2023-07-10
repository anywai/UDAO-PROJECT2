const { expect } = require("chai");
const hardhat = require("hardhat");
const { ethers } = hardhat;
const chai = require("chai");
const BN = require("bn.js");
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

describe("UDAOC Contract", function () {
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

  it("Should KYC Content Creator", async function () {
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

    await expect(
      contractUDAOContent
        .connect(contentCreator)
        .redeem(
          [ethers.utils.parseEther("1"), ethers.utils.parseEther("1")],
          "udao",
          "ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi",
          contentCreator.address,
          ethers.utils.parseEther("2"),
          "udao",
          true,
          true
        )
    )
      .to.emit(contractUDAOContent, "Transfer") // transfer from null address to minter
      .withArgs(
        "0x0000000000000000000000000000000000000000",
        contentCreator.address,
        0
      );
  });

  it("Should fail to create Content if wrong redeemer", async function () {
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

    await expect(
      contractUDAOContent
        .connect(contentBuyer)
        .redeem(
          [ethers.utils.parseEther("1"), ethers.utils.parseEther("1")],
          "udao",
          "ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi",
          contentCreator.address,
          ethers.utils.parseEther("2"),
          "udao",
          true,
          true
        )
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
  //     contractUDAOContent.connect(contentCreator).redeem(voucher)
  //   ).to.revertedWith("Signature invalid or unauthorized");
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
    await contractRoleManager.setKYC(contentCreator.address, true);

    await expect(
      contractUDAOContent
        .connect(contentCreator)
        .redeem(
          [ethers.utils.parseEther("1"), ethers.utils.parseEther("1")],
          "udao",
          "ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi",
          contentCreator.address,
          ethers.utils.parseEther("2"),
          "udao",
          true,
          true
        )
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

    await expect(
      contractUDAOContent
        .connect(contentCreator)
        .redeem(
          [ethers.utils.parseEther("1"), ethers.utils.parseEther("1")],
          "udao",
          "ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi",
          contentCreator.address,
          ethers.utils.parseEther("2"),
          "udao",
          true,
          true
        )
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

    await expect(
      contractUDAOContent
        .connect(contentCreator)
        .redeem(
          [ethers.utils.parseEther("1"), ethers.utils.parseEther("1")],
          "udao",
          "ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi",
          contentCreator.address,
          ethers.utils.parseEther("2"),
          "udao",
          true,
          true
        )
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

    await expect(
      contractUDAOContent
        .connect(contentCreator)
        .redeem(
          [ethers.utils.parseEther("1"), ethers.utils.parseEther("1")],
          "udao",
          "ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi",
          contentCreator.address,
          ethers.utils.parseEther("2"),
          "udao",
          true,
          true
        )
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
    await contractRoleManager.setBan(contentBuyer.address, true);

    await expect(
      contractUDAOContent
        .connect(contentCreator)
        .redeem(
          [ethers.utils.parseEther("1"), ethers.utils.parseEther("1")],
          "udao",
          "ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi",
          contentCreator.address,
          ethers.utils.parseEther("2"),
          "udao",
          true,
          true
        )
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

    await expect(
      contractUDAOContent
        .connect(contentCreator)
        .redeem(
          [ethers.utils.parseEther("1"), ethers.utils.parseEther("1")],
          "udao",
          "ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi",
          contentCreator.address,
          ethers.utils.parseEther("2"),
          "udao",
          true,
          true
        )
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

    await expect(
      contractUDAOContent
        .connect(contentCreator)
        .redeem(
          [ethers.utils.parseEther("1"), ethers.utils.parseEther("1")],
          "udao",
          "ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi",
          contentCreator.address,
          ethers.utils.parseEther("2"),
          "udao",
          true,
          true
        )
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

    await expect(
      contractUDAOContent
        .connect(contentCreator)
        .redeem(
          [ethers.utils.parseEther("1"), ethers.utils.parseEther("1")],
          "udao",
          "ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi",
          contentCreator.address,
          ethers.utils.parseEther("2"),
          "udao",
          true,
          true
        )
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

    expect(await contractUDAOContent.supportsInterface("0x80ac58cd")).to.eql(
      true
    );
  });

  it("Should enable coaching for content", async function () {
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

    await expect(
      contractUDAOContent
        .connect(contentCreator)
        .redeem(
          [ethers.utils.parseEther("1"), ethers.utils.parseEther("1")],
          "udao",
          "ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi",
          contentCreator.address,
          ethers.utils.parseEther("2"),
          "udao",
          false,
          false
        )
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

    await expect(
      contractUDAOContent
        .connect(contentCreator)
        .redeem(
          [ethers.utils.parseEther("1"), ethers.utils.parseEther("1")],
          "udao",
          "ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi",
          contentCreator.address,
          ethers.utils.parseEther("2"),
          "udao",
          true,
          true
        )
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

    await expect(
      contractUDAOContent
        .connect(contentCreator)
        .redeem(
          [ethers.utils.parseEther("1"), ethers.utils.parseEther("1")],
          "udao",
          "ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi",
          contentCreator.address,
          ethers.utils.parseEther("2"),
          "udao",
          false,
          false
        )
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

    await expect(
      contractUDAOContent
        .connect(contentCreator)
        .redeem(
          [ethers.utils.parseEther("1"), ethers.utils.parseEther("1")],
          "udao",
          "ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi",
          contentCreator.address,
          ethers.utils.parseEther("2"),
          "udao",
          true,
          true
        )
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

    await expect(
      contractUDAOContent
        .connect(contentCreator)
        .redeem(
          [
            ethers.utils.parseEther("1"),
            ethers.utils.parseEther("2"),
            ethers.utils.parseEther("3"),
          ],
          "udao",
          "ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi",
          contentCreator.address,
          ethers.utils.parseEther("2"),
          "udao",
          false,
          false
        )
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
    const _currencyName = "udao";
    const _uri =
      "ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi";
    // add new part and expect newPartAdded event to emit
    await expect(
      contractUDAOContent
        .connect(contentCreator)
        .modifyContent(tokenId, _contentPrice, _currencyName, _uri)
    );

    // expect new part price to be 4
    const returnedPartPrice =
      await contractUDAOContent.getContentPriceAndCurrency(tokenId, newPartId);
    expect(returnedPartPrice[0]).to.equal(ethers.utils.parseEther("4"));

    // epxpect previous parts to be shifted
    const returnedPartPrice1 =
      await contractUDAOContent.getContentPriceAndCurrency(tokenId, 0);
    expect(returnedPartPrice1[0]).to.equal(ethers.utils.parseEther("1"));
    const returnedPartPrice2 =
      await contractUDAOContent.getContentPriceAndCurrency(tokenId, 1);
    expect(returnedPartPrice2[0]).to.equal(ethers.utils.parseEther("2"));
    const returnedPartPrice3 =
      await contractUDAOContent.getContentPriceAndCurrency(tokenId, 3);
    expect(returnedPartPrice3[0]).to.equal(ethers.utils.parseEther("3"));
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

    await expect(
      contractUDAOContent
        .connect(contentCreator)
        .redeem(
          [
            ethers.utils.parseEther("1"),
            ethers.utils.parseEther("2"),
            ethers.utils.parseEther("3"),
          ],
          "udao",
          "ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi",
          contentCreator.address,
          ethers.utils.parseEther("2"),
          "udao",
          false,
          false
        )
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

    await expect(
      contractUDAOContent
        .connect(contentCreator)
        .redeem(
          [
            ethers.utils.parseEther("1"),
            ethers.utils.parseEther("2"),
            ethers.utils.parseEther("3"),
          ],
          "udao",
          "ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi",
          contentCreator.address,
          ethers.utils.parseEther("2"),
          "udao",
          false,
          false
        )
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

    await expect(
      contractUDAOContent
        .connect(contentCreator)
        .redeem(
          [
            ethers.utils.parseEther("1"),
            ethers.utils.parseEther("2"),
            ethers.utils.parseEther("3"),
          ],
          "udao",
          "ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi",
          contentCreator.address,
          ethers.utils.parseEther("2"),
          "udao",
          false,
          false
        )
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

    await expect(
      contractUDAOContent
        .connect(contentCreator)
        .redeem(
          [
            ethers.utils.parseEther("1"),
            ethers.utils.parseEther("2"),
            ethers.utils.parseEther("3"),
          ],
          "udao",
          "ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi",
          contentCreator.address,
          ethers.utils.parseEther("2"),
          "udao",
          false,
          false
        )
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

    await expect(
      contractUDAOContent
        .connect(contentCreator)
        .redeem(
          [
            ethers.utils.parseEther("1"),
            ethers.utils.parseEther("2"),
            ethers.utils.parseEther("3"),
          ],
          "udao",
          "ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi",
          contentCreator.address,
          ethers.utils.parseEther("2"),
          "udao",
          false,
          false
        )
    )
      .to.emit(contractUDAOContent, "Transfer") // transfer from null address to
      .withArgs(
        "0x0000000000000000000000000000000000000000",
        contentCreator.address,
        0
      );

    // UnKYC content creator
    await contractRoleManager.setKYC(contentCreator.address, false);
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

    await expect(
      contractUDAOContent
        .connect(contentCreator)
        .redeem(
          [
            ethers.utils.parseEther("1"),
            ethers.utils.parseEther("2"),
            ethers.utils.parseEther("3"),
          ],
          "udao",
          "ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi",
          contentCreator.address,
          ethers.utils.parseEther("2"),
          "udao",
          false,
          false
        )
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

    await expect(
      contractUDAOContent
        .connect(contentCreator)
        .redeem(
          [
            ethers.utils.parseEther("1"),
            ethers.utils.parseEther("2"),
            ethers.utils.parseEther("3"),
          ],
          "udao",
          "ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi",
          contentCreator.address,
          ethers.utils.parseEther("2"),
          "udao",
          false,
          false
        )
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

    await expect(
      contractUDAOContent
        .connect(contentCreator)
        .redeem(
          [
            ethers.utils.parseEther("1"),
            ethers.utils.parseEther("2"),
            ethers.utils.parseEther("3"),
          ],
          "udao",
          "ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi",
          contentCreator.address,
          ethers.utils.parseEther("2"),
          "udao",
          false,
          false
        )
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
