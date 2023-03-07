const { expect } = require("chai");
const hardhat = require("hardhat");
const { ethers } = hardhat;
const chai = require("chai");
const BN = require("bn.js");
const { LazyMinter } = require("../lib/LazyMinter");
const { LazyRole } = require("../lib/LazyRole");
const { LazyValidation } = require("../lib/LazyValidation");
const { LazyUDAOCertMinter } = require("../lib/LazyUDAOCertMinter");
const { LazyPurchase } = require("../lib/LazyPurchase");

// Enable and inject BN dependency
chai.use(require("chai-bn")(BN));

async function deploy() {
  const [
    backend,
    contentCreator,
    contentBuyer,
    validatorCandidate,
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
  const VALIDATOR_ROLE = ethers.utils.keccak256(
    ethers.utils.toUtf8Bytes("VALIDATOR_ROLE")
  );
  await contractRoleManager.grantRole(
    VALIDATION_MANAGER,
    contractValidationManager.address
  );
  await contractRoleManager.grantRole(VALIDATOR_ROLE, validator1.address);
  await contractRoleManager.grantRole(VALIDATOR_ROLE, validator2.address);
  await contractRoleManager.grantRole(VALIDATOR_ROLE, validator3.address);
  await contractRoleManager.grantRole(VALIDATOR_ROLE, validator4.address);
  await contractRoleManager.grantRole(VALIDATOR_ROLE, validator5.address);
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

  await contractValidationManager
    .connect(foundation)
    .setStaker(contractUDAOStaker.address);
  // add staking contract to udao-vp
  await contractUDAOVp.connect(backend).updateAddresses();

  return {
    backend,
    contentCreator,
    contentBuyer,
    validatorCandidate,
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
    contractContractManager,
  };
}

describe("Platform Treasury Contract - Content", function () {
  it("Should deploy", async function () {
    const {
      backend,
      contentCreator,
      contentBuyer,
      validatorCandidate,
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
      contractContractManager,
    } = await deploy();
  });

  it("Should get updated address of the validation manager", async function () {
    const {
      backend,
      contentCreator,
      contentBuyer,
      validatorCandidate,
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
      contractContractManager,
    } = await deploy();
    const originalVMAdress = await contractPlatformTreasury.IVM.call();
    await contractContractManager
      .connect(backend)
      .setAddressIVM("0x5B38Da6a701c568545dCfcB03FcB875f56beddC4");
    // Get updated address
    await contractPlatformTreasury.connect(backend).updateAddresses();
    expect(await contractPlatformTreasury.IVM.call()).to.eql(
      "0x5B38Da6a701c568545dCfcB03FcB875f56beddC4"
    );
    await contractContractManager
      .connect(backend)
      .setAddressIVM(originalVMAdress);
    // Get updated address
    await contractPlatformTreasury.connect(backend).updateAddresses();
    expect(await contractPlatformTreasury.IVM.call()).to.eql(originalVMAdress);
  });

  it("Should fail to set validation manager if not FOUNDATION", async function () {
    const {
      backend,
      contentCreator,
      contentBuyer,
      validatorCandidate,
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
      contractContractManager,
    } = await deploy();
    const originalVMAdress = await contractPlatformTreasury.IVM.call();

    await expect(
      contractPlatformTreasury.connect(foundation).updateAddresses()
    ).to.revertedWith(
      "AccessControl: account " +
        foundation.address.toLowerCase() +
        " is missing role 0x25cf2b509f2a7f322675b2a5322b182f44ad2c03ac941a0af17c9b178f5d5d5f"
    );
  });

  it("Should a user able to buy the full content", async function () {
    const {
      backend,
      contentCreator,
      contentBuyer,
      validatorCandidate,
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
      contractContractManager,
    } = await deploy();

    /// Set KYC
    await contractRoleManager.setKYC(contentCreator.address, true);
    await contractRoleManager.setKYC(contentBuyer.address, true);

    /// Mint content with voucher
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
      contractValidationManager.connect(backend).createValidation(1, 50)
    )
      .to.emit(contractValidationManager, "ValidationCreated")
      .withArgs(ethers.BigNumber.from(1), ethers.BigNumber.from(1));
    await expect(
      contractValidationManager.connect(validator1).assignValidation(1)
    )
      .to.emit(contractValidationManager, "ValidationAssigned")
      .withArgs(
        ethers.BigNumber.from(1),
        ethers.BigNumber.from(1),
        validator1.address
      );
    await expect(
      contractValidationManager.connect(validator2).assignValidation(1)
    )
      .to.emit(contractValidationManager, "ValidationAssigned")
      .withArgs(
        ethers.BigNumber.from(1),
        ethers.BigNumber.from(1),
        validator2.address
      );
    await expect(
      contractValidationManager.connect(validator3).assignValidation(1)
    )
      .to.emit(contractValidationManager, "ValidationAssigned")
      .withArgs(
        ethers.BigNumber.from(1),
        ethers.BigNumber.from(1),
        validator3.address
      );
    await expect(
      contractValidationManager.connect(validator4).assignValidation(1)
    )
      .to.emit(contractValidationManager, "ValidationAssigned")
      .withArgs(
        ethers.BigNumber.from(1),
        ethers.BigNumber.from(1),
        validator4.address
      );
    await expect(
      contractValidationManager.connect(validator5).assignValidation(1)
    )
      .to.emit(contractValidationManager, "ValidationAssigned")
      .withArgs(
        ethers.BigNumber.from(1),
        ethers.BigNumber.from(1),
        validator5.address
      );

    await expect(
      contractValidationManager.connect(validator1).sendValidation(1, true)
    )
      .to.emit(contractValidationManager, "ValidationResultSent")
      .withArgs(
        ethers.BigNumber.from(1),
        ethers.BigNumber.from(1),
        validator1.address,
        true
      );
    await expect(
      contractValidationManager.connect(validator2).sendValidation(1, true)
    )
      .to.emit(contractValidationManager, "ValidationResultSent")
      .withArgs(
        ethers.BigNumber.from(1),
        ethers.BigNumber.from(1),
        validator2.address,
        true
      );
    await expect(
      contractValidationManager.connect(validator3).sendValidation(1, true)
    )
      .to.emit(contractValidationManager, "ValidationResultSent")
      .withArgs(
        ethers.BigNumber.from(1),
        ethers.BigNumber.from(1),
        validator3.address,
        true
      );
    await expect(
      contractValidationManager.connect(validator4).sendValidation(1, true)
    )
      .to.emit(contractValidationManager, "ValidationResultSent")
      .withArgs(
        ethers.BigNumber.from(1),
        ethers.BigNumber.from(1),
        validator4.address,
        true
      );
    await expect(
      contractValidationManager.connect(validator5).sendValidation(1, false)
    )
      .to.emit(contractValidationManager, "ValidationResultSent")
      .withArgs(
        ethers.BigNumber.from(1),
        ethers.BigNumber.from(1),
        validator5.address,
        false
      );
    await expect(
      contractValidationManager.connect(contentCreator).finalizeValidation(1)
    )
      .to.emit(contractValidationManager, "ValidationEnded")
      .withArgs(ethers.BigNumber.from(1), ethers.BigNumber.from(1), true);

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

    const purchase_udaoc_voucher = [1, true, [1], contentBuyer.address, ethers.constants.AddressZero];

    await contractPlatformTreasury
      .connect(contentBuyer)
      .buyContent(purchase_udaoc_voucher);
    const result = await contractPlatformTreasury
      .connect(contentBuyer)
      .getOwnedContent(contentBuyer.address);

    const numArray = result.map((x) => x.map((y) => y.toNumber()));
    expect(numArray).to.eql([[1, 0]]);
  });

  // it("Should a user able to buy multiple contents", async function () {
  //   const {
  //     backend,
  //   contentCreator,
  //   contentBuyer,
  //   validatorCandidate,
  //   validator,
  //   superValidatorCandidate,
  //   superValidator,
  //   foundation,
  //   governanceCandidate,
  //   governanceMember,
  //   jurorCandidate,
  //   jurorMember,
  //   contractUDAO,
  //   contractRoleManager,
  //   contractUDAOCertificate,
  //   contractUDAOContent,
  //   contractValidationManager,
  //   contractPlatformTreasury,
  //   contractUDAOVp,
  //   contractUDAOStaker,
  //   contractUDAOTimelockController,
  //   contractUDAOGovernor,
  //   contractContractManager
  //   } = await deploy();

  //   /// Set KYC
  //   await contractRoleManager.setKYC(contentCreator.address, true);
  //   await contractRoleManager.setKYC(contentBuyer.address, true);

  //   /// Mint content with voucher
  //   const lazyMinter = new LazyMinter({
  //     contract: contractUDAOContent,
  //     signer: backend,
  //   });
  //   const udaoc_voucher = await lazyMinter.createVoucher(
  //     1,
  //     "ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi",
  //     contentCreator.address,
  //     true,
  //     "Content Name",
  //     "Content Description"
  //   );
  //   const udaoc_voucher2 = await lazyMinter.createVoucher(
  //     2,
  //     "ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi",
  //     contentCreator.address,
  //     true,
  //     "Content Name",
  //     "Content Description"
  //   );
  //   await expect(
  //     contractUDAOContent.connect(contentCreator).redeem(udaoc_voucher)
  //   )
  //     .to.emit(contractUDAOContent, "Transfer") // transfer from null address to minter
  //     .withArgs(
  //       "0x0000000000000000000000000000000000000000",
  //       contentCreator.address,
  //       udaoc_voucher.tokenId
  //     );
  //   await expect(
  //     contractUDAOContent.connect(contentCreator).redeem(udaoc_voucher2)
  //   )
  //     .to.emit(contractUDAOContent, "Transfer") // transfer from null address to minter
  //     .withArgs(
  //       "0x0000000000000000000000000000000000000000",
  //       contentCreator.address,
  //       udaoc_voucher2.tokenId
  //     );

  //   /// Validate content with voucher
  //   const lazyValidation = new LazyValidation({
  //     contract: contractValidationManager,
  //     signer: backend,
  //   });
  //   const voucher = await lazyValidation.createVoucher(
  //     1,
  //     Date.now() + 999999999,
  //     [validator.address],
  //     [10],
  //     true
  //   );
  //   const voucher2 = await lazyValidation.createVoucher(
  //     2,
  //     Date.now() + 999999999,
  //     [validator.address],
  //     [10],
  //     true
  //   );
  //   await expect(
  //     contractValidationManager.connect(contentCreator).setAsValidated(voucher)
  //   )
  //     .to.emit(contractValidationManager, "ValidationEnded")
  //     .withArgs(voucher.tokenId, true);
  //   await expect(
  //     contractValidationManager.connect(contentCreator).setAsValidated(voucher2)
  //   )
  //     .to.emit(contractValidationManager, "ValidationEnded")
  //     .withArgs(voucher2.tokenId, true);

  //   /// Send UDAO to the buyer's wallet
  //   await contractUDAO.transfer(
  //     contentBuyer.address,
  //     ethers.utils.parseEther("100.0")
  //   );
  //   /// Content buyer needs to give approval to the platformtreasury
  //   await contractUDAO
  //     .connect(contentBuyer)
  //     .approve(
  //       contractPlatformTreasury.address,
  //       ethers.utils.parseEther("999999999999.0")
  //     );
  //   const lazyPurchase = new LazyPurchase({
  //     contract: contractPlatformTreasury,
  //     signer: backend,
  //   });
  //   const purchase_udaoc_voucher = await lazyPurchase.createVoucher(
  //     1,
  //     [0],
  //     ethers.utils.parseEther("2"),
  //     Date.now() + 999999999,
  //     contentBuyer.address
  //   );
  //   const purchase_udaoc_voucher2 = await lazyPurchase.createVoucher(
  //     2,
  //     [0],
  //     ethers.utils.parseEther("2"),
  //     Date.now() + 999999999,
  //     contentBuyer.address
  //   );
  //   await contractPlatformTreasury
  //     .connect(contentBuyer)
  //     .buyContent([purchase_udaoc_voucher, purchase_udaoc_voucher2]);
  //   const result = await contractPlatformTreasury
  //     .connect(contentBuyer)
  //     .getOwnedContent(contentBuyer.address);
  //   const numArray = result.map((x) => x.map((y) => y.toNumber()));
  //   expect(numArray).to.eql([
  //     [1, 0],
  //     [2, 0],
  //   ]);
  // });

  it("Should a user able to buy parts of a content", async function () {
    const {
      backend,
      contentCreator,
      contentBuyer,
      validatorCandidate,
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
      contractContractManager,
    } = await deploy();

    /// Set KYC
    await contractRoleManager.setKYC(contentCreator.address, true);
    await contractRoleManager.setKYC(contentBuyer.address, true);

    /// Mint content with voucher
    const udaoc_voucher = [
      1,
      [
        ethers.utils.parseEther("1"),
        ethers.utils.parseEther("1"),
        ethers.utils.parseEther("1"),
        ethers.utils.parseEther("1"),
      ],
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
      contractValidationManager.connect(backend).createValidation(1, 50)
    )
      .to.emit(contractValidationManager, "ValidationCreated")
      .withArgs(ethers.BigNumber.from(1), ethers.BigNumber.from(1));
    await expect(
      contractValidationManager.connect(validator1).assignValidation(1)
    )
      .to.emit(contractValidationManager, "ValidationAssigned")
      .withArgs(
        ethers.BigNumber.from(1),
        ethers.BigNumber.from(1),
        validator1.address
      );
    await expect(
      contractValidationManager.connect(validator2).assignValidation(1)
    )
      .to.emit(contractValidationManager, "ValidationAssigned")
      .withArgs(
        ethers.BigNumber.from(1),
        ethers.BigNumber.from(1),
        validator2.address
      );
    await expect(
      contractValidationManager.connect(validator3).assignValidation(1)
    )
      .to.emit(contractValidationManager, "ValidationAssigned")
      .withArgs(
        ethers.BigNumber.from(1),
        ethers.BigNumber.from(1),
        validator3.address
      );
    await expect(
      contractValidationManager.connect(validator4).assignValidation(1)
    )
      .to.emit(contractValidationManager, "ValidationAssigned")
      .withArgs(
        ethers.BigNumber.from(1),
        ethers.BigNumber.from(1),
        validator4.address
      );
    await expect(
      contractValidationManager.connect(validator5).assignValidation(1)
    )
      .to.emit(contractValidationManager, "ValidationAssigned")
      .withArgs(
        ethers.BigNumber.from(1),
        ethers.BigNumber.from(1),
        validator5.address
      );

    await expect(
      contractValidationManager.connect(validator1).sendValidation(1, true)
    )
      .to.emit(contractValidationManager, "ValidationResultSent")
      .withArgs(
        ethers.BigNumber.from(1),
        ethers.BigNumber.from(1),
        validator1.address,
        true
      );
    await expect(
      contractValidationManager.connect(validator2).sendValidation(1, true)
    )
      .to.emit(contractValidationManager, "ValidationResultSent")
      .withArgs(
        ethers.BigNumber.from(1),
        ethers.BigNumber.from(1),
        validator2.address,
        true
      );
    await expect(
      contractValidationManager.connect(validator3).sendValidation(1, true)
    )
      .to.emit(contractValidationManager, "ValidationResultSent")
      .withArgs(
        ethers.BigNumber.from(1),
        ethers.BigNumber.from(1),
        validator3.address,
        true
      );
    await expect(
      contractValidationManager.connect(validator4).sendValidation(1, true)
    )
      .to.emit(contractValidationManager, "ValidationResultSent")
      .withArgs(
        ethers.BigNumber.from(1),
        ethers.BigNumber.from(1),
        validator4.address,
        true
      );
    await expect(
      contractValidationManager.connect(validator5).sendValidation(1, false)
    )
      .to.emit(contractValidationManager, "ValidationResultSent")
      .withArgs(
        ethers.BigNumber.from(1),
        ethers.BigNumber.from(1),
        validator5.address,
        false
      );
    await expect(
      contractValidationManager.connect(contentCreator).finalizeValidation(1)
    )
      .to.emit(contractValidationManager, "ValidationEnded")
      .withArgs(ethers.BigNumber.from(1), ethers.BigNumber.from(1), true);

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

    const purchase_udaoc_voucher = [1, false, [1, 2, 3], contentBuyer.address,  ethers.constants.AddressZero];

    await contractPlatformTreasury
      .connect(contentBuyer)
      .buyContent(purchase_udaoc_voucher);
    const result = await contractPlatformTreasury
      .connect(contentBuyer)
      .getOwnedContent(contentBuyer.address);
    const numArray = result.map((x) => x.map((y) => y.toNumber()));
    expect(numArray).to.eql([
      [1, 1],
      [1, 2],
      [1, 3],
    ]);
  });

  it("Should fail to buy a content part if content part already purchased", async function () {
    const {
      backend,
      contentCreator,
      contentBuyer,
      validatorCandidate,
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
      contractContractManager,
    } = await deploy();

    /// Set KYC
    await contractRoleManager.setKYC(contentCreator.address, true);
    await contractRoleManager.setKYC(contentBuyer.address, true);

    /// Mint content with voucher
    const udaoc_voucher = [
      1,
      [
        ethers.utils.parseEther("1"),
        ethers.utils.parseEther("1"),
        ethers.utils.parseEther("1"),
        ethers.utils.parseEther("1"),
      ],
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
      contractValidationManager.connect(backend).createValidation(1, 50)
    )
      .to.emit(contractValidationManager, "ValidationCreated")
      .withArgs(ethers.BigNumber.from(1), ethers.BigNumber.from(1));
    await expect(
      contractValidationManager.connect(validator1).assignValidation(1)
    )
      .to.emit(contractValidationManager, "ValidationAssigned")
      .withArgs(
        ethers.BigNumber.from(1),
        ethers.BigNumber.from(1),
        validator1.address
      );
    await expect(
      contractValidationManager.connect(validator2).assignValidation(1)
    )
      .to.emit(contractValidationManager, "ValidationAssigned")
      .withArgs(
        ethers.BigNumber.from(1),
        ethers.BigNumber.from(1),
        validator2.address
      );
    await expect(
      contractValidationManager.connect(validator3).assignValidation(1)
    )
      .to.emit(contractValidationManager, "ValidationAssigned")
      .withArgs(
        ethers.BigNumber.from(1),
        ethers.BigNumber.from(1),
        validator3.address
      );
    await expect(
      contractValidationManager.connect(validator4).assignValidation(1)
    )
      .to.emit(contractValidationManager, "ValidationAssigned")
      .withArgs(
        ethers.BigNumber.from(1),
        ethers.BigNumber.from(1),
        validator4.address
      );
    await expect(
      contractValidationManager.connect(validator5).assignValidation(1)
    )
      .to.emit(contractValidationManager, "ValidationAssigned")
      .withArgs(
        ethers.BigNumber.from(1),
        ethers.BigNumber.from(1),
        validator5.address
      );

    await expect(
      contractValidationManager.connect(validator1).sendValidation(1, true)
    )
      .to.emit(contractValidationManager, "ValidationResultSent")
      .withArgs(
        ethers.BigNumber.from(1),
        ethers.BigNumber.from(1),
        validator1.address,
        true
      );
    await expect(
      contractValidationManager.connect(validator2).sendValidation(1, true)
    )
      .to.emit(contractValidationManager, "ValidationResultSent")
      .withArgs(
        ethers.BigNumber.from(1),
        ethers.BigNumber.from(1),
        validator2.address,
        true
      );
    await expect(
      contractValidationManager.connect(validator3).sendValidation(1, true)
    )
      .to.emit(contractValidationManager, "ValidationResultSent")
      .withArgs(
        ethers.BigNumber.from(1),
        ethers.BigNumber.from(1),
        validator3.address,
        true
      );
    await expect(
      contractValidationManager.connect(validator4).sendValidation(1, true)
    )
      .to.emit(contractValidationManager, "ValidationResultSent")
      .withArgs(
        ethers.BigNumber.from(1),
        ethers.BigNumber.from(1),
        validator4.address,
        true
      );
    await expect(
      contractValidationManager.connect(validator5).sendValidation(1, false)
    )
      .to.emit(contractValidationManager, "ValidationResultSent")
      .withArgs(
        ethers.BigNumber.from(1),
        ethers.BigNumber.from(1),
        validator5.address,
        false
      );
    await expect(
      contractValidationManager.connect(contentCreator).finalizeValidation(1)
    )
      .to.emit(contractValidationManager, "ValidationEnded")
      .withArgs(ethers.BigNumber.from(1), ethers.BigNumber.from(1), true);

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
    const purchase_udaoc_voucher = [1, false, [2], contentBuyer.address, ethers.constants.AddressZero];

    await contractPlatformTreasury
      .connect(contentBuyer)
      .buyContent(purchase_udaoc_voucher);

    const purchase_udaoc_voucher2 = [1, false, [2], contentBuyer.address,  ethers.constants.AddressZero];

    await expect(
      contractPlatformTreasury
        .connect(contentBuyer)
        .buyContent(purchase_udaoc_voucher2)
    ).to.revertedWith("Content part is already bought");
  });

  it("Should fail to buy a content if content does not exists", async function () {
    const {
      backend,
      contentCreator,
      contentBuyer,
      validatorCandidate,
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
      contractContractManager,
    } = await deploy();

    /// Set KYC
    await contractRoleManager.setKYC(contentCreator.address, true);
    await contractRoleManager.setKYC(contentBuyer.address, true);

    /// Content buyer needs to give approval to the platformtreasury
    await contractUDAO
      .connect(contentBuyer)
      .approve(
        contractPlatformTreasury.address,
        ethers.utils.parseEther("999999999999.0")
      );
    const purchase_udaoc_voucher = [1, true, [1], contentBuyer.address, ethers.constants.AddressZero];

    await expect(
      contractPlatformTreasury
        .connect(contentBuyer)
        .buyContent(purchase_udaoc_voucher)
    ).to.revertedWith("Content does not exist!");
  });

  // TODO Activate below after validation implementation is done!
  // it("Should fail to buy content if not validated yet", async function () {
  //   const {
  //     backend,
  //   contentCreator,
  //   contentBuyer,
  //   validatorCandidate,
  //   validator,
  //   superValidatorCandidate,
  //   superValidator,
  //   foundation,
  //   governanceCandidate,
  //   governanceMember,
  //   jurorCandidate,
  //   jurorMember,
  //   contractUDAO,
  //   contractRoleManager,
  //   contractUDAOCertificate,
  //   contractUDAOContent,
  //   contractValidationManager,
  //   contractPlatformTreasury,
  //   contractUDAOVp,
  //   contractUDAOStaker,
  //   contractUDAOTimelockController,
  //   contractUDAOGovernor,
  //   contractContractManager
  //   } = await deploy();

  //   /// Set KYC
  //   await contractRoleManager.setKYC(contentCreator.address, true);
  //   await contractRoleManager.setKYC(contentBuyer.address, true);

  //   /// Mint content with voucher
  //   const udaoc_voucher = [1, [ethers.utils.parseEther("1"),ethers.utils.parseEther("1")], "ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi", contentCreator.address, true, "Content Name", "Content Description"]

  //   await expect(
  //     contractUDAOContent.connect(contentCreator).redeem(udaoc_voucher)
  //   )
  //     .to.emit(contractUDAOContent, "Transfer") // transfer from null address to minter
  //     .withArgs(
  //       "0x0000000000000000000000000000000000000000",
  //       contentCreator.address,
  //       udaoc_voucher[0]
  //     );

  //   /// Send UDAO to the buyer's wallet
  //   await contractUDAO.transfer(
  //     contentBuyer.address,
  //     ethers.utils.parseEther("100.0")
  //   );
  //   /// Content buyer needs to give approval to the platformtreasury
  //   await contractUDAO
  //     .connect(contentBuyer)
  //     .approve(
  //       contractPlatformTreasury.address,
  //       ethers.utils.parseEther("999999999999.0")
  //     );
  //     const purchase_udaoc_voucher = [1, true, [1], contentBuyer.address, ethers.constants.AddressZero];

  //   await expect(
  //     contractPlatformTreasury
  //       .connect(contentBuyer)
  //       .buyContent(purchase_udaoc_voucher)
  //   ).to.revertedWith("Content is not validated yet");
  // });

  it("Should fail to buy content if buyer is banned", async function () {
    const {
      backend,
      contentCreator,
      contentBuyer,
      validatorCandidate,
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
      contractContractManager,
    } = await deploy();

    /// Set KYC
    await contractRoleManager.setKYC(contentCreator.address, true);
    await contractRoleManager.setKYC(contentBuyer.address, true);

    /// Set BAN
    await contractRoleManager.setBan(contentBuyer.address, true);

    /// Mint content with voucher
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
      contractValidationManager.connect(backend).createValidation(1, 50)
    )
      .to.emit(contractValidationManager, "ValidationCreated")
      .withArgs(ethers.BigNumber.from(1), ethers.BigNumber.from(1));
    await expect(
      contractValidationManager.connect(validator1).assignValidation(1)
    )
      .to.emit(contractValidationManager, "ValidationAssigned")
      .withArgs(
        ethers.BigNumber.from(1),
        ethers.BigNumber.from(1),
        validator1.address
      );
    await expect(
      contractValidationManager.connect(validator2).assignValidation(1)
    )
      .to.emit(contractValidationManager, "ValidationAssigned")
      .withArgs(
        ethers.BigNumber.from(1),
        ethers.BigNumber.from(1),
        validator2.address
      );
    await expect(
      contractValidationManager.connect(validator3).assignValidation(1)
    )
      .to.emit(contractValidationManager, "ValidationAssigned")
      .withArgs(
        ethers.BigNumber.from(1),
        ethers.BigNumber.from(1),
        validator3.address
      );
    await expect(
      contractValidationManager.connect(validator4).assignValidation(1)
    )
      .to.emit(contractValidationManager, "ValidationAssigned")
      .withArgs(
        ethers.BigNumber.from(1),
        ethers.BigNumber.from(1),
        validator4.address
      );
    await expect(
      contractValidationManager.connect(validator5).assignValidation(1)
    )
      .to.emit(contractValidationManager, "ValidationAssigned")
      .withArgs(
        ethers.BigNumber.from(1),
        ethers.BigNumber.from(1),
        validator5.address
      );

    await expect(
      contractValidationManager.connect(validator1).sendValidation(1, true)
    )
      .to.emit(contractValidationManager, "ValidationResultSent")
      .withArgs(
        ethers.BigNumber.from(1),
        ethers.BigNumber.from(1),
        validator1.address,
        true
      );
    await expect(
      contractValidationManager.connect(validator2).sendValidation(1, true)
    )
      .to.emit(contractValidationManager, "ValidationResultSent")
      .withArgs(
        ethers.BigNumber.from(1),
        ethers.BigNumber.from(1),
        validator2.address,
        true
      );
    await expect(
      contractValidationManager.connect(validator3).sendValidation(1, true)
    )
      .to.emit(contractValidationManager, "ValidationResultSent")
      .withArgs(
        ethers.BigNumber.from(1),
        ethers.BigNumber.from(1),
        validator3.address,
        true
      );
    await expect(
      contractValidationManager.connect(validator4).sendValidation(1, true)
    )
      .to.emit(contractValidationManager, "ValidationResultSent")
      .withArgs(
        ethers.BigNumber.from(1),
        ethers.BigNumber.from(1),
        validator4.address,
        true
      );
    await expect(
      contractValidationManager.connect(validator5).sendValidation(1, false)
    )
      .to.emit(contractValidationManager, "ValidationResultSent")
      .withArgs(
        ethers.BigNumber.from(1),
        ethers.BigNumber.from(1),
        validator5.address,
        false
      );
    await expect(
      contractValidationManager.connect(contentCreator).finalizeValidation(1)
    )
      .to.emit(contractValidationManager, "ValidationEnded")
      .withArgs(ethers.BigNumber.from(1), ethers.BigNumber.from(1), true);

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
    const purchase_udaoc_voucher = [1, true, [1], contentBuyer.address, ethers.constants.AddressZero];

    await expect(
      contractPlatformTreasury
        .connect(contentBuyer)
        .buyContent(purchase_udaoc_voucher)
    ).to.revertedWith("You are banned");
  });

  it("Should fail to buy content if instructer is banned", async function () {
    const {
      backend,
      contentCreator,
      contentBuyer,
      validatorCandidate,
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
      contractContractManager,
    } = await deploy();

    /// Set KYC
    await contractRoleManager.setKYC(contentCreator.address, true);
    await contractRoleManager.setKYC(contentBuyer.address, true);

    /// Mint content with voucher
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
      contractValidationManager.connect(backend).createValidation(1, 50)
    )
      .to.emit(contractValidationManager, "ValidationCreated")
      .withArgs(ethers.BigNumber.from(1), ethers.BigNumber.from(1));
    await expect(
      contractValidationManager.connect(validator1).assignValidation(1)
    )
      .to.emit(contractValidationManager, "ValidationAssigned")
      .withArgs(
        ethers.BigNumber.from(1),
        ethers.BigNumber.from(1),
        validator1.address
      );
    await expect(
      contractValidationManager.connect(validator2).assignValidation(1)
    )
      .to.emit(contractValidationManager, "ValidationAssigned")
      .withArgs(
        ethers.BigNumber.from(1),
        ethers.BigNumber.from(1),
        validator2.address
      );
    await expect(
      contractValidationManager.connect(validator3).assignValidation(1)
    )
      .to.emit(contractValidationManager, "ValidationAssigned")
      .withArgs(
        ethers.BigNumber.from(1),
        ethers.BigNumber.from(1),
        validator3.address
      );
    await expect(
      contractValidationManager.connect(validator4).assignValidation(1)
    )
      .to.emit(contractValidationManager, "ValidationAssigned")
      .withArgs(
        ethers.BigNumber.from(1),
        ethers.BigNumber.from(1),
        validator4.address
      );
    await expect(
      contractValidationManager.connect(validator5).assignValidation(1)
    )
      .to.emit(contractValidationManager, "ValidationAssigned")
      .withArgs(
        ethers.BigNumber.from(1),
        ethers.BigNumber.from(1),
        validator5.address
      );

    await expect(
      contractValidationManager.connect(validator1).sendValidation(1, true)
    )
      .to.emit(contractValidationManager, "ValidationResultSent")
      .withArgs(
        ethers.BigNumber.from(1),
        ethers.BigNumber.from(1),
        validator1.address,
        true
      );
    await expect(
      contractValidationManager.connect(validator2).sendValidation(1, true)
    )
      .to.emit(contractValidationManager, "ValidationResultSent")
      .withArgs(
        ethers.BigNumber.from(1),
        ethers.BigNumber.from(1),
        validator2.address,
        true
      );
    await expect(
      contractValidationManager.connect(validator3).sendValidation(1, true)
    )
      .to.emit(contractValidationManager, "ValidationResultSent")
      .withArgs(
        ethers.BigNumber.from(1),
        ethers.BigNumber.from(1),
        validator3.address,
        true
      );
    await expect(
      contractValidationManager.connect(validator4).sendValidation(1, true)
    )
      .to.emit(contractValidationManager, "ValidationResultSent")
      .withArgs(
        ethers.BigNumber.from(1),
        ethers.BigNumber.from(1),
        validator4.address,
        true
      );
    await expect(
      contractValidationManager.connect(validator5).sendValidation(1, false)
    )
      .to.emit(contractValidationManager, "ValidationResultSent")
      .withArgs(
        ethers.BigNumber.from(1),
        ethers.BigNumber.from(1),
        validator5.address,
        false
      );
    await expect(
      contractValidationManager.connect(contentCreator).finalizeValidation(1)
    )
      .to.emit(contractValidationManager, "ValidationEnded")
      .withArgs(ethers.BigNumber.from(1), ethers.BigNumber.from(1), true);

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

    const purchase_udaoc_voucher = [1, true, [1], contentBuyer.address, ethers.constants.AddressZero];

    await expect(
      contractPlatformTreasury
        .connect(contentBuyer)
        .buyContent(purchase_udaoc_voucher)
    ).to.revertedWith("Instructor is banned");
  });

  it("Should fail to buy content if instructer is not KYCed", async function () {
    const {
      backend,
      contentCreator,
      contentBuyer,
      validatorCandidate,
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
      contractValidationManager.connect(backend).createValidation(1, 50)
    )
      .to.emit(contractValidationManager, "ValidationCreated")
      .withArgs(ethers.BigNumber.from(1), ethers.BigNumber.from(1));
    await expect(
      contractValidationManager.connect(validator1).assignValidation(1)
    )
      .to.emit(contractValidationManager, "ValidationAssigned")
      .withArgs(
        ethers.BigNumber.from(1),
        ethers.BigNumber.from(1),
        validator1.address
      );
    await expect(
      contractValidationManager.connect(validator2).assignValidation(1)
    )
      .to.emit(contractValidationManager, "ValidationAssigned")
      .withArgs(
        ethers.BigNumber.from(1),
        ethers.BigNumber.from(1),
        validator2.address
      );
    await expect(
      contractValidationManager.connect(validator3).assignValidation(1)
    )
      .to.emit(contractValidationManager, "ValidationAssigned")
      .withArgs(
        ethers.BigNumber.from(1),
        ethers.BigNumber.from(1),
        validator3.address
      );
    await expect(
      contractValidationManager.connect(validator4).assignValidation(1)
    )
      .to.emit(contractValidationManager, "ValidationAssigned")
      .withArgs(
        ethers.BigNumber.from(1),
        ethers.BigNumber.from(1),
        validator4.address
      );
    await expect(
      contractValidationManager.connect(validator5).assignValidation(1)
    )
      .to.emit(contractValidationManager, "ValidationAssigned")
      .withArgs(
        ethers.BigNumber.from(1),
        ethers.BigNumber.from(1),
        validator5.address
      );

    await expect(
      contractValidationManager.connect(validator1).sendValidation(1, true)
    )
      .to.emit(contractValidationManager, "ValidationResultSent")
      .withArgs(
        ethers.BigNumber.from(1),
        ethers.BigNumber.from(1),
        validator1.address,
        true
      );
    await expect(
      contractValidationManager.connect(validator2).sendValidation(1, true)
    )
      .to.emit(contractValidationManager, "ValidationResultSent")
      .withArgs(
        ethers.BigNumber.from(1),
        ethers.BigNumber.from(1),
        validator2.address,
        true
      );
    await expect(
      contractValidationManager.connect(validator3).sendValidation(1, true)
    )
      .to.emit(contractValidationManager, "ValidationResultSent")
      .withArgs(
        ethers.BigNumber.from(1),
        ethers.BigNumber.from(1),
        validator3.address,
        true
      );
    await expect(
      contractValidationManager.connect(validator4).sendValidation(1, true)
    )
      .to.emit(contractValidationManager, "ValidationResultSent")
      .withArgs(
        ethers.BigNumber.from(1),
        ethers.BigNumber.from(1),
        validator4.address,
        true
      );
    await expect(
      contractValidationManager.connect(validator5).sendValidation(1, false)
    )
      .to.emit(contractValidationManager, "ValidationResultSent")
      .withArgs(
        ethers.BigNumber.from(1),
        ethers.BigNumber.from(1),
        validator5.address,
        false
      );
    await expect(
      contractValidationManager.connect(contentCreator).finalizeValidation(1)
    )
      .to.emit(contractValidationManager, "ValidationEnded")
      .withArgs(ethers.BigNumber.from(1), ethers.BigNumber.from(1), true);

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

    const purchase_udaoc_voucher = [1, true, [1], contentBuyer.address, ethers.constants.AddressZero];

    await expect(
      contractPlatformTreasury
        .connect(contentBuyer)
        .buyContent(purchase_udaoc_voucher)
    ).to.revertedWith("Instructor is not KYCed");
  });

  it("Should fail to buy content if buyer is not KYCed", async function () {
    const {
      backend,
      contentCreator,
      contentBuyer,
      validatorCandidate,
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
      contractValidationManager.connect(backend).createValidation(1, 50)
    )
      .to.emit(contractValidationManager, "ValidationCreated")
      .withArgs(ethers.BigNumber.from(1), ethers.BigNumber.from(1));
    await expect(
      contractValidationManager.connect(validator1).assignValidation(1)
    )
      .to.emit(contractValidationManager, "ValidationAssigned")
      .withArgs(
        ethers.BigNumber.from(1),
        ethers.BigNumber.from(1),
        validator1.address
      );
    await expect(
      contractValidationManager.connect(validator2).assignValidation(1)
    )
      .to.emit(contractValidationManager, "ValidationAssigned")
      .withArgs(
        ethers.BigNumber.from(1),
        ethers.BigNumber.from(1),
        validator2.address
      );
    await expect(
      contractValidationManager.connect(validator3).assignValidation(1)
    )
      .to.emit(contractValidationManager, "ValidationAssigned")
      .withArgs(
        ethers.BigNumber.from(1),
        ethers.BigNumber.from(1),
        validator3.address
      );
    await expect(
      contractValidationManager.connect(validator4).assignValidation(1)
    )
      .to.emit(contractValidationManager, "ValidationAssigned")
      .withArgs(
        ethers.BigNumber.from(1),
        ethers.BigNumber.from(1),
        validator4.address
      );
    await expect(
      contractValidationManager.connect(validator5).assignValidation(1)
    )
      .to.emit(contractValidationManager, "ValidationAssigned")
      .withArgs(
        ethers.BigNumber.from(1),
        ethers.BigNumber.from(1),
        validator5.address
      );

    await expect(
      contractValidationManager.connect(validator1).sendValidation(1, true)
    )
      .to.emit(contractValidationManager, "ValidationResultSent")
      .withArgs(
        ethers.BigNumber.from(1),
        ethers.BigNumber.from(1),
        validator1.address,
        true
      );
    await expect(
      contractValidationManager.connect(validator2).sendValidation(1, true)
    )
      .to.emit(contractValidationManager, "ValidationResultSent")
      .withArgs(
        ethers.BigNumber.from(1),
        ethers.BigNumber.from(1),
        validator2.address,
        true
      );
    await expect(
      contractValidationManager.connect(validator3).sendValidation(1, true)
    )
      .to.emit(contractValidationManager, "ValidationResultSent")
      .withArgs(
        ethers.BigNumber.from(1),
        ethers.BigNumber.from(1),
        validator3.address,
        true
      );
    await expect(
      contractValidationManager.connect(validator4).sendValidation(1, true)
    )
      .to.emit(contractValidationManager, "ValidationResultSent")
      .withArgs(
        ethers.BigNumber.from(1),
        ethers.BigNumber.from(1),
        validator4.address,
        true
      );
    await expect(
      contractValidationManager.connect(validator5).sendValidation(1, false)
    )
      .to.emit(contractValidationManager, "ValidationResultSent")
      .withArgs(
        ethers.BigNumber.from(1),
        ethers.BigNumber.from(1),
        validator5.address,
        false
      );
    await expect(
      contractValidationManager.connect(contentCreator).finalizeValidation(1)
    )
      .to.emit(contractValidationManager, "ValidationEnded")
      .withArgs(ethers.BigNumber.from(1), ethers.BigNumber.from(1), true);

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

    const purchase_udaoc_voucher = [1, true, [1], contentBuyer.address, ethers.constants.AddressZero];

    await expect(
      contractPlatformTreasury
        .connect(contentBuyer)
        .buyContent(purchase_udaoc_voucher)
    ).to.revertedWith("You are not KYCed");
  });

  it("Should fail to buy a content part if full content is already purchased", async function () {
    const {
      backend,
      contentCreator,
      contentBuyer,
      validatorCandidate,
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
      contractContractManager,
    } = await deploy();

    /// Set KYC
    await contractRoleManager.setKYC(contentCreator.address, true);
    await contractRoleManager.setKYC(contentBuyer.address, true);

    /// Mint content with voucher
    const udaoc_voucher = [
      1,
      [
        ethers.utils.parseEther("1"),
        ethers.utils.parseEther("1"),
        ethers.utils.parseEther("1"),
        ethers.utils.parseEther("1"),
      ],
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
      contractValidationManager.connect(backend).createValidation(1, 50)
    )
      .to.emit(contractValidationManager, "ValidationCreated")
      .withArgs(ethers.BigNumber.from(1), ethers.BigNumber.from(1));
    await expect(
      contractValidationManager.connect(validator1).assignValidation(1)
    )
      .to.emit(contractValidationManager, "ValidationAssigned")
      .withArgs(
        ethers.BigNumber.from(1),
        ethers.BigNumber.from(1),
        validator1.address
      );
    await expect(
      contractValidationManager.connect(validator2).assignValidation(1)
    )
      .to.emit(contractValidationManager, "ValidationAssigned")
      .withArgs(
        ethers.BigNumber.from(1),
        ethers.BigNumber.from(1),
        validator2.address
      );
    await expect(
      contractValidationManager.connect(validator3).assignValidation(1)
    )
      .to.emit(contractValidationManager, "ValidationAssigned")
      .withArgs(
        ethers.BigNumber.from(1),
        ethers.BigNumber.from(1),
        validator3.address
      );
    await expect(
      contractValidationManager.connect(validator4).assignValidation(1)
    )
      .to.emit(contractValidationManager, "ValidationAssigned")
      .withArgs(
        ethers.BigNumber.from(1),
        ethers.BigNumber.from(1),
        validator4.address
      );
    await expect(
      contractValidationManager.connect(validator5).assignValidation(1)
    )
      .to.emit(contractValidationManager, "ValidationAssigned")
      .withArgs(
        ethers.BigNumber.from(1),
        ethers.BigNumber.from(1),
        validator5.address
      );

    await expect(
      contractValidationManager.connect(validator1).sendValidation(1, true)
    )
      .to.emit(contractValidationManager, "ValidationResultSent")
      .withArgs(
        ethers.BigNumber.from(1),
        ethers.BigNumber.from(1),
        validator1.address,
        true
      );
    await expect(
      contractValidationManager.connect(validator2).sendValidation(1, true)
    )
      .to.emit(contractValidationManager, "ValidationResultSent")
      .withArgs(
        ethers.BigNumber.from(1),
        ethers.BigNumber.from(1),
        validator2.address,
        true
      );
    await expect(
      contractValidationManager.connect(validator3).sendValidation(1, true)
    )
      .to.emit(contractValidationManager, "ValidationResultSent")
      .withArgs(
        ethers.BigNumber.from(1),
        ethers.BigNumber.from(1),
        validator3.address,
        true
      );
    await expect(
      contractValidationManager.connect(validator4).sendValidation(1, true)
    )
      .to.emit(contractValidationManager, "ValidationResultSent")
      .withArgs(
        ethers.BigNumber.from(1),
        ethers.BigNumber.from(1),
        validator4.address,
        true
      );
    await expect(
      contractValidationManager.connect(validator5).sendValidation(1, false)
    )
      .to.emit(contractValidationManager, "ValidationResultSent")
      .withArgs(
        ethers.BigNumber.from(1),
        ethers.BigNumber.from(1),
        validator5.address,
        false
      );
    await expect(
      contractValidationManager.connect(contentCreator).finalizeValidation(1)
    )
      .to.emit(contractValidationManager, "ValidationEnded")
      .withArgs(ethers.BigNumber.from(1), ethers.BigNumber.from(1), true);

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
    const purchase_udaoc_voucher = [1, true, [1], contentBuyer.address, ethers.constants.AddressZero];

    await contractPlatformTreasury
      .connect(contentBuyer)
      .buyContent(purchase_udaoc_voucher);

    const purchase_udaoc_voucher2 = [1, false, [3], contentBuyer.address,  ethers.constants.AddressZero];

    await expect(
      contractPlatformTreasury
        .connect(contentBuyer)
        .buyContent(purchase_udaoc_voucher2)
    ).to.revertedWith("Full content is already bought");
  });
});
