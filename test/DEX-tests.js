const { expect } = require("chai");
const hardhat = require("hardhat");
const { ethers } = hardhat;
const chai = require("chai");
const BN = require("bn.js");
const bn = require("bignumber.js");
const helpers = require("@nomicfoundation/hardhat-network-helpers");
const { deploy } = require("../lib/deployments");

require("dotenv").config();
const {
  WMATIC_ABI,
  NonFunbiblePositionABI,
  NonFunbiblePositionAddress,
  WMATICAddress,
} = require("../lib/abis");

bn.config({ EXPONENTIAL_AT: 999999, DECIMAL_PLACES: 40 });

// Enable and inject BN dependency
chai.use(require("chai-bn")(BN));
async function runValidation(
  contractValidationManager,
  backend,
  validator1,
  validator2,
  validator3,
  validator4,
  validator5,
  contentCreator
) {
  await expect(
    contractValidationManager.connect(backend).createValidation(0, 50)
  )
    .to.emit(contractValidationManager, "ValidationCreated")
    .withArgs(ethers.BigNumber.from(0), ethers.BigNumber.from(1));
  await expect(
    contractValidationManager.connect(validator1).assignValidation(1)
  )
    .to.emit(contractValidationManager, "ValidationAssigned")
    .withArgs(
      ethers.BigNumber.from(0),
      ethers.BigNumber.from(1),
      validator1.address
    );
  await expect(
    contractValidationManager.connect(validator2).assignValidation(1)
  )
    .to.emit(contractValidationManager, "ValidationAssigned")
    .withArgs(
      ethers.BigNumber.from(0),
      ethers.BigNumber.from(1),
      validator2.address
    );
  await expect(
    contractValidationManager.connect(validator3).assignValidation(1)
  )
    .to.emit(contractValidationManager, "ValidationAssigned")
    .withArgs(
      ethers.BigNumber.from(0),
      ethers.BigNumber.from(1),
      validator3.address
    );
  await expect(
    contractValidationManager.connect(validator4).assignValidation(1)
  )
    .to.emit(contractValidationManager, "ValidationAssigned")
    .withArgs(
      ethers.BigNumber.from(0),
      ethers.BigNumber.from(1),
      validator4.address
    );
  await expect(
    contractValidationManager.connect(validator5).assignValidation(1)
  )
    .to.emit(contractValidationManager, "ValidationAssigned")
    .withArgs(
      ethers.BigNumber.from(0),
      ethers.BigNumber.from(1),
      validator5.address
    );

  await expect(
    contractValidationManager.connect(validator1).sendValidation(1, true)
  )
    .to.emit(contractValidationManager, "ValidationResultSent")
    .withArgs(
      ethers.BigNumber.from(0),
      ethers.BigNumber.from(1),
      validator1.address,
      true
    );
  await expect(
    contractValidationManager.connect(validator2).sendValidation(1, true)
  )
    .to.emit(contractValidationManager, "ValidationResultSent")
    .withArgs(
      ethers.BigNumber.from(0),
      ethers.BigNumber.from(1),
      validator2.address,
      true
    );
  await expect(
    contractValidationManager.connect(validator3).sendValidation(1, true)
  )
    .to.emit(contractValidationManager, "ValidationResultSent")
    .withArgs(
      ethers.BigNumber.from(0),
      ethers.BigNumber.from(1),
      validator3.address,
      true
    );
  await expect(
    contractValidationManager.connect(validator4).sendValidation(1, true)
  )
    .to.emit(contractValidationManager, "ValidationResultSent")
    .withArgs(
      ethers.BigNumber.from(0),
      ethers.BigNumber.from(1),
      validator4.address,
      true
    );
  await expect(
    contractValidationManager.connect(validator5).sendValidation(1, false)
  )
    .to.emit(contractValidationManager, "ValidationResultSent")
    .withArgs(
      ethers.BigNumber.from(0),
      ethers.BigNumber.from(1),
      validator5.address,
      false
    );
  await expect(
    contractValidationManager.connect(contentCreator).finalizeValidation(1)
  )
    .to.emit(contractValidationManager, "ValidationEnded")
    .withArgs(ethers.BigNumber.from(0), ethers.BigNumber.from(1), true);
}

describe("Uniswap DEX Tests", function () {
  it("Should create a pool", async function () {
    const {
      backend,
      account1,
      account2,
      account3,
      contractUDAO,
      whale,
      weth,
      nonfungiblePositionManager,
      contractPriceGetter,
    } = await deploy(true);

    // console.log("Deployed price getter");

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
      ethers.utils.parseEther("1.0"),
      ethers.utils.keccak256(ethers.utils.toUtf8Bytes("eur"))
    );
    //console.log("Out is ", out);
  });

  it("Should buy the full content for someone else with USD", async function () {
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
    } = await deploy(true);

    /// Set KYC
    await contractRoleManager.setKYC(contentCreator.address, true);
    await contractRoleManager.setKYC(contentBuyer.address, true);
    await contractRoleManager.setKYC(validator1.address, true);

    await expect(
      contractUDAOContent.connect(contentCreator).redeem(
        //[ethers.utils.parseEther("1")],
        [10],
        "usd",
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
    /// Start validation and finalize it
    await runValidation(
      contractValidationManager,
      backend,
      validator1,
      validator2,
      validator3,
      validator4,
      validator5,
      contentCreator
    );
    const contentBuyerBalance = await contractUDAO.balanceOf(
      contentBuyer.address
    );
    //Balance of contentBuyer
    //console.log(
    //  "Balance of contentBuyer is     %lf",
    //  contentBuyerBalance.toString()
    //);
    /// Send UDAO to the buyer's wallet
    await contractUDAO.transfer(
      contentBuyer.address,
      ethers.utils.parseEther("3.0")
    );

    //New Balance of contentBuyer
    const contentBuyerNewBalance = await contractUDAO.balanceOf(
      contentBuyer.address
    );
    //console.log("New Balance of contentBuyer is: ", contentBuyerNewBalance.toString());

    /// Content buyer needs to give approval to the platformtreasury
    await contractUDAO
      .connect(contentBuyer)
      .approve(
        contractPlatformTreasury.address,
        ethers.utils.parseEther("3.0")
      );

    await expect(
      contractPlatformTreasury
        .connect(contentBuyer)
        .buyContent(0, true, [1], validator1.address)
    )
      .to.emit(contractPlatformTreasury, "ContentBought")
      .withArgs(0, [1], "886525018013279181", contentBuyer.address); // Content bought event

    const result = await contractPlatformTreasury
      .connect(contentBuyer)
      .getOwnedContent(validator1.address);

    //After Sale Balance of contentBuyer
    const contentBuyerAfterSaleBalance = await contractUDAO.balanceOf(
      contentBuyer.address
    );
    //console.log("After Sale Balance of contentBuyer is: ", contentBuyerAfterSaleBalance.toString());

    const spentUser = contentBuyerNewBalance.sub(contentBuyerAfterSaleBalance);
    //console.log("User how much spent: " + spentUser.toString());

    const numArray = result.map((x) => x.map((y) => y.toNumber()));
    expect(numArray).to.eql([[0, 0]]);

    //Calculated coaching price in UDAO for given BlockNumber and 10USD
    const calculatedCoachingPrice = 886525018013279181n;

    await expect(spentUser).to.equal(calculatedCoachingPrice);
  });

  it("Should a user able to buy a coaching with USD", async function () {
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
    } = await deploy(true);
    /// Set KYC
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
          [10],
          "usd",
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

    /// Start validation and finalize it
    await runValidation(
      contractValidationManager,
      backend,
      validator1,
      validator2,
      validator3,
      validator4,
      validator5,
      contentCreator
    );

    /// Send UDAO to the buyer's wallet
    await contractUDAO.transfer(
      contentBuyer.address,
      ethers.utils.parseEther("3.0")
    );

    //New Balance of contentBuyer
    const contentBuyerNewBalance = await contractUDAO.balanceOf(
      contentBuyer.address
    );
    //console.log("New Balance of contentBuyer is: ", contentBuyerNewBalance.toString());

    /// Content buyer needs to give approval to the platformtreasury
    await contractUDAO
      .connect(contentBuyer)
      .approve(
        contractPlatformTreasury.address,
        ethers.utils.parseEther("3.0")
      );

    // Buy coaching
    const purchaseTx = await contractPlatformTreasury
      .connect(contentBuyer)
      .buyCoaching(0);
    const queueTxReceipt = await purchaseTx.wait();
    const queueTxEvent = queueTxReceipt.events.find(
      (e) => e.event == "CoachingBought"
    );

    //// Buy coaching
    //// await expect(
    ////   contractPlatformTreasury.connect(contentBuyer).buyCoaching(0) //, true, [1], validator1.address)
    //// )
    ////   .to.emit(contractPlatformTreasury, "ContentBought")
    ////   .withArgs(contentBuyer.address, 0, 1); // Content bought event

    const coachingId = queueTxEvent.args[2];
    // Get coaching struct
    const coachingStruct = await contractPlatformTreasury.coachingStructs(
      coachingId
    );
    // Check if returned learner address is the same as the buyer address
    expect(coachingStruct.learner).to.equal(contentBuyer.address);

    //After Sale Balance of contentBuyer
    const contentBuyerAfterSaleBalance = await contractUDAO.balanceOf(
      contentBuyer.address
    );
    //console.log("After Sale Balance of contentBuyer is: ", contentBuyerAfterSaleBalance.toString());

    const spentUser = contentBuyerNewBalance.sub(contentBuyerAfterSaleBalance);
    //console.log("User how much spent: " + spentUser.toString());

    //Calculated coaching price in UDAO for given BlockNumber and 10USD
    const calculatedCoachingPrice = 886525018013279181n;

    await expect(spentUser).to.equal(calculatedCoachingPrice);
  });
});
