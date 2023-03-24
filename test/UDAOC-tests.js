const { expect } = require("chai");
const hardhat = require("hardhat");
const { ethers } = hardhat;
const chai = require("chai");
const BN = require("bn.js");
const helpers = require("@nomicfoundation/hardhat-network-helpers");

const {
  WMATIC_ABI,
  NonFunbiblePositionABI,
  NonFunbiblePositionAddress,
  WMATICAddress,
} = require("../lib/abis");

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
  let factoryJurorManager = await ethers.getContractFactory("JurorManager");
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

  // Deploys PriceGetter

  const positionManager = await ethers.getContractAt(
    NonFunbiblePositionABI,
    "0xC36442b4a4522E871399CD717aBDD847Ab11FE88"
  );

  const WMATIC = await ethers.getContractAt(WMATIC_ABI, WMATICAddress);
  await WMATIC.connect(backend).deposit({
    value: ethers.utils.parseEther("1000.0"),
  });

  // call approve for tokens before adding a new pool
  await WMATIC.connect(backend).approve(
    positionManager.address,
    ethers.utils.parseEther("99999999.0")
  );

  await contractUDAO
    .connect(backend)
    .approve(positionManager.address, ethers.utils.parseEther("9999999.0"));

  const tx = await positionManager
    .connect(backend)
    .createAndInitializePoolIfNecessary(
      WMATIC.address,
      contractUDAO.address,
      "3000",
      "250541420775534450580036817218"
    );
  const result = await tx.wait();
  const tx_2 = await positionManager
    .connect(backend)
    .mint([
      WMATIC.address,
      contractUDAO.address,
      "3000",
      "0",
      "23040",
      "950252822518485471",
      "9999999999999999991268",
      "0",
      "9963392298778452810744",
      backend.address,
      "1678352028999",
    ]);
  const result_2 = await tx_2.wait();

  let factoryPriceGetter = await ethers.getContractFactory("PriceGetter");
  const contractPriceGetter = await factoryPriceGetter.deploy(
    "0x1F98431c8aD98523631AE4a59f267346ea31F984",
    contractUDAO.address,
    "0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270",
    3000
  );

  await helpers.time.increase(2);
  await helpers.time.increase(2);
  await helpers.time.increase(2);
  await helpers.time.increase(2);
  await helpers.time.increase(2);
  await helpers.time.increase(2);
  await helpers.time.increase(2);
  await helpers.time.increase(2);
  await helpers.time.increase(2);
  await helpers.time.increase(2);
  await helpers.time.increase(2);
  await helpers.time.increase(2);
  await helpers.time.increase(2);
  await helpers.time.increase(2);
  await helpers.time.increase(2);

  const out = await contractPriceGetter.getUdaoOut(
    WMATIC.address,
    ethers.utils.parseEther("1.0")
  );

  // Price Getter End
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
    contractRoleManager.address,
    contractPriceGetter.address
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
  const DEFAULT_ADMIN_ROLE = ethers.utils.keccak256(
    ethers.utils.toUtf8Bytes("DEFAULT_ADMIN_ROLE")
  );
  await contractRoleManager.grantRole(DEFAULT_ADMIN_ROLE, foundation.address);
  await contractRoleManager.grantRole(
    DEFAULT_ADMIN_ROLE,
    contractUDAOTimelockController.address
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

    const udaoc_voucher = [
      1,
      [ethers.utils.parseEther("1"), ethers.utils.parseEther("1")],
      "ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi",
      contentCreator.address,
      true,
      "Content Name",
      "Content Description",
    ];

    await expect(
      contractUDAOContent.connect(contentCreator).redeem(udaoc_voucher)
    )
      .to.emit(contractUDAOContent, "Transfer") // transfer from null address to minter
      .withArgs(
        "0x0000000000000000000000000000000000000000",
        contentCreator.address,
        udaoc_voucher[0]
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

    const udaoc_voucher = [
      1,
      [ethers.utils.parseEther("1"), ethers.utils.parseEther("1")],
      "ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi",
      contentCreator.address,
      true,
      "Content Name",
      "Content Description",
    ];

    await expect(
      contractUDAOContent.connect(contentBuyer).redeem(udaoc_voucher)
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
  //     contractValidationManager,
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

    const udaoc_voucher = [
      1,
      [ethers.utils.parseEther("1"), ethers.utils.parseEther("1")],
      "ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi",
      contentCreator.address,
      true,
      "Content Name",
      "Content Description",
    ];

    await expect(
      contractUDAOContent.connect(contentCreator).redeem(udaoc_voucher)
    )
      .to.emit(contractUDAOContent, "Transfer") // transfer from null address to minter
      .withArgs(
        "0x0000000000000000000000000000000000000000",
        contentCreator.address,
        udaoc_voucher[0]
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

    const udaoc_voucher = [
      1,
      [ethers.utils.parseEther("1"), ethers.utils.parseEther("1")],
      "ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi",
      contentCreator.address,
      true,
      "Content Name",
      "Content Description",
    ];

    await expect(
      contractUDAOContent.connect(contentCreator).redeem(udaoc_voucher)
    )
      .to.emit(contractUDAOContent, "Transfer") // transfer from null address to minter
      .withArgs(
        "0x0000000000000000000000000000000000000000",
        contentCreator.address,
        udaoc_voucher[0]
      );
    await expect(
      contractUDAOContent
        .connect(contentCreator)
        .transferFrom(contentCreator.address, contentBuyer.address, 1)
    )
      .to.emit(contractUDAOContent, "Transfer") // transfer from null address to minter
      .withArgs(contentCreator.address, contentBuyer.address, 1);
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

    const udaoc_voucher = [
      1,
      [ethers.utils.parseEther("1"), ethers.utils.parseEther("1")],
      "ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi",
      contentCreator.address,
      true,
      "Content Name",
      "Content Description",
    ];

    await expect(
      contractUDAOContent.connect(contentCreator).redeem(udaoc_voucher)
    )
      .to.emit(contractUDAOContent, "Transfer") // transfer from null address to minter
      .withArgs(
        "0x0000000000000000000000000000000000000000",
        contentCreator.address,
        udaoc_voucher[0]
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

    const udaoc_voucher = [
      1,
      [ethers.utils.parseEther("1"), ethers.utils.parseEther("1")],
      "ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi",
      contentCreator.address,
      true,
      "Content Name",
      "Content Description",
    ];

    await expect(
      contractUDAOContent.connect(contentCreator).redeem(udaoc_voucher)
    )
      .to.emit(contractUDAOContent, "Transfer") // transfer from null address to minter
      .withArgs(
        "0x0000000000000000000000000000000000000000",
        contentCreator.address,
        udaoc_voucher[0]
      );

    await contractRoleManager.setBan(contentCreator.address, true);
    await expect(
      contractUDAOContent
        .connect(contentCreator)
        .transferFrom(contentCreator.address, contentBuyer.address, 1)
    ).to.revertedWith("Sender is banned!");
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

    const udaoc_voucher = [
      1,
      [ethers.utils.parseEther("1"), ethers.utils.parseEther("1")],
      "ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi",
      contentCreator.address,
      true,
      "Content Name",
      "Content Description",
    ];

    await expect(
      contractUDAOContent.connect(contentCreator).redeem(udaoc_voucher)
    )
      .to.emit(contractUDAOContent, "Transfer") // transfer from null address to minter
      .withArgs(
        "0x0000000000000000000000000000000000000000",
        contentCreator.address,
        udaoc_voucher[0]
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

    const udaoc_voucher = [
      1,
      [ethers.utils.parseEther("1"), ethers.utils.parseEther("1")],
      "ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi",
      contentCreator.address,
      true,
      "Content Name",
      "Content Description",
    ];

    await expect(
      contractUDAOContent.connect(contentCreator).redeem(udaoc_voucher)
    )
      .to.emit(contractUDAOContent, "Transfer") // transfer from null address to minter
      .withArgs(
        "0x0000000000000000000000000000000000000000",
        contentCreator.address,
        udaoc_voucher[0]
      );
    await contractRoleManager.setKYC(contentCreator.address, false);

    await expect(
      contractUDAOContent
        .connect(contentCreator)
        .transferFrom(contentCreator.address, contentBuyer.address, 1)
    ).to.revertedWith("Sender is not KYCed!");
  });

  it("Should burn token if token owner", async function () {
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

    const udaoc_voucher = [
      1,
      [ethers.utils.parseEther("1"), ethers.utils.parseEther("1")],
      "ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi",
      contentCreator.address,
      true,
      "Content Name",
      "Content Description",
    ];

    await expect(
      contractUDAOContent.connect(contentCreator).redeem(udaoc_voucher)
    )
      .to.emit(contractUDAOContent, "Transfer") // transfer from null address to minter
      .withArgs(
        "0x0000000000000000000000000000000000000000",
        contentCreator.address,
        udaoc_voucher[0]
      );
    await expect(contractUDAOContent.connect(contentCreator).burn(1))
      .to.emit(contractUDAOContent, "Transfer") // transfer from null address to minter
      .withArgs(
        contentCreator.address,
        "0x0000000000000000000000000000000000000000",
        udaoc_voucher[0]
      );
  });

  it("Should fail to burn token if not token owner", async function () {
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

    const udaoc_voucher = [
      1,
      [ethers.utils.parseEther("1"), ethers.utils.parseEther("1")],
      "ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi",
      contentCreator.address,
      true,
      "Content Name",
      "Content Description",
    ];

    await expect(
      contractUDAOContent.connect(contentCreator).redeem(udaoc_voucher)
    )
      .to.emit(contractUDAOContent, "Transfer") // transfer from null address to minter
      .withArgs(
        "0x0000000000000000000000000000000000000000",
        contentCreator.address,
        udaoc_voucher[0]
      );

    await expect(
      contractUDAOContent.connect(contentBuyer).burn(1)
    ).to.revertedWith("You are not the owner of token");
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

  it("Should enable coaching for content", async function () {
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

    const udaoc_voucher = [
      1,
      [ethers.utils.parseEther("1"), ethers.utils.parseEther("1")],
      "ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi",
      contentCreator.address,
      false,
      "Content Name",
      "Content Description",
    ];

    await expect(
      contractUDAOContent.connect(contentCreator).redeem(udaoc_voucher)
    )
      .to.emit(contractUDAOContent, "Transfer") // transfer from null address to minter
      .withArgs(
        "0x0000000000000000000000000000000000000000",
        contentCreator.address,
        udaoc_voucher[0]
      );
    await contractUDAOContent.connect(contentCreator).enableCoaching(1);
    expect(await contractUDAOContent.isCoachingEnabled(1)).to.be.eql(true);
  });

  it("Should disable coaching for content", async function () {
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

    const udaoc_voucher = [
      1,
      [ethers.utils.parseEther("1"), ethers.utils.parseEther("1")],
      "ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi",
      contentCreator.address,
      true,
      "Content Name",
      "Content Description",
    ];

    await expect(
      contractUDAOContent.connect(contentCreator).redeem(udaoc_voucher)
    )
      .to.emit(contractUDAOContent, "Transfer") // transfer from null address to minter
      .withArgs(
        "0x0000000000000000000000000000000000000000",
        contentCreator.address,
        udaoc_voucher[0]
      );
    await contractUDAOContent.connect(contentCreator).disableCoaching(1);
    expect(await contractUDAOContent.isCoachingEnabled(1)).to.be.eql(false);
  });

  it("Should fail to enable coaching for content if not owner", async function () {
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

    const udaoc_voucher = [
      1,
      [ethers.utils.parseEther("1"), ethers.utils.parseEther("1")],
      "ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi",
      contentCreator.address,
      false,
      "Content Name",
      "Content Description",
    ];

    await expect(
      contractUDAOContent.connect(contentCreator).redeem(udaoc_voucher)
    )
      .to.emit(contractUDAOContent, "Transfer") // transfer from null address to minter
      .withArgs(
        "0x0000000000000000000000000000000000000000",
        contentCreator.address,
        udaoc_voucher[0]
      );
    await expect(
      contractUDAOContent.connect(contentBuyer).enableCoaching(1)
    ).to.revertedWith("You are not the owner of token");
  });

  it("Should fail to disable coaching for content if not owner", async function () {
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

    const udaoc_voucher = [
      1,
      [ethers.utils.parseEther("1"), ethers.utils.parseEther("1")],
      "ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi",
      contentCreator.address,
      true,
      "Content Name",
      "Content Description",
    ];

    await expect(
      contractUDAOContent.connect(contentCreator).redeem(udaoc_voucher)
    )
      .to.emit(contractUDAOContent, "Transfer") // transfer from null address to minter
      .withArgs(
        "0x0000000000000000000000000000000000000000",
        contentCreator.address,
        udaoc_voucher[0]
      );
    await expect(
      contractUDAOContent.connect(contentBuyer).disableCoaching(1)
    ).to.revertedWith("You are not the owner of token");
  });
});
