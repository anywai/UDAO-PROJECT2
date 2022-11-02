const { expect } = require("chai");
const hardhat = require("hardhat");
const { ethers } = hardhat;
const chai = require('chai');
const BN = require('bn.js');

// Enable and inject BN dependency
chai.use(require('chai-bn')(BN));

async function deploy() {
  const [backend, validatorCandidate, validator, superValidatorCandidate, 
    superValidator, foundation, governanceCandidate, governanceMember, 
    jurorCandidate, jurorMember] = await ethers.getSigners()

  let factoryRoleManager = await ethers.getContractFactory("RoleManager")
  let factoryUDAOVp = await ethers.getContractFactory("UDAOVp")
  let factoryUDAOTimelockController = await ethers.getContractFactory("UDAOTimelockController")
  let factoryUDAOCertificate = await ethers.getContractFactory("UDAOCertificate")
  let factoryUDAO = await ethers.getContractFactory("UDAO")
  let factoryUDAOStaker = await ethers.getContractFactory("UDAOStaker")
  let factoryValidationManager = await ethers.getContractFactory("ValidationManager")
  let factoryUDAOContent = await ethers.getContractFactory("UDAOContent")
  let factoryPlatformTreasury = await ethers.getContractFactory("PlatformTreasury")
  let factoryUDAOGovernor = await ethers.getContractFactory("UDAOGovernor")


  const contractRoleManager = await factoryRoleManager.deploy()
  const contractUDAOVp = await factoryUDAOVp.deploy(contractRoleManager.address)
  const contractUDAOCertificate = await factoryUDAOCertificate.deploy(contractRoleManager.address)
  const contractUDAO = await factoryUDAO.deploy()
  const contractUDAOStaker = await factoryUDAOStaker.deploy(contractUDAOVp.address, contractUDAO.address,)
  const contractUDAOContent = await factoryUDAOContent.deploy(contractRoleManager.address)
  const contractValidationManager = await factoryValidationManager.deploy(contractUDAOContent.address, 
    contractRoleManager.address, 
    contractUDAOStaker.address)
  const contractPlatformTreasury = await factoryPlatformTreasury.deploy(contractUDAO.address, 
    contractUDAOContent.address, 
    contractRoleManager.address, 
    contractValidationManager.address)
  // @dev proposer needs to be added to the timelockcontroller (2nd parameter)
  const contractUDAOTimelockController = await factoryUDAOTimelockController.deploy(1, [], [foundation.address])
  const contractUDAOGovernor = await factoryUDAOGovernor.deploy(contractUDAO.address, 
    contractUDAOTimelockController.address, 
    contractUDAOStaker.address, 
    ethers.utils.parseEther("0.3"), 
    contractRoleManager.address)




  //grant minter role to the minter. Currently he is only an admin
  //keccak256(MINTER_ROLE) = 0x9f2df0fed2c77648de5860a4cc508cd0818c85b8b8a1ab4ceeef8d981c8956a6
  await contract.grantRole("0x9f2df0fed2c77648de5860a4cc508cd0818c85b8b8a1ab4ceeef8d981c8956a6", minter.address)

  // the redeemerContract is an instance of the contract that's wired up to the redeemer's signing key
  const redeemerFactory = factory.connect(redeemer)
  const redeemerContract = redeemerFactory.attach(contract.address)

  const royaltyReceiverFactory = factory.connect(royaltyReceiver)
  const royaltyReceiverContract = royaltyReceiverFactory.attach(contract.address)

  const doneeFactory = factory.connect(donee)
  const doneeContract = doneeFactory.attach(contract.address)

  return {
    minter,
    redeemer,
    royaltyReceiver,
    donee,
    contract,
    redeemerContract,
    royaltyReceiverContract,
    doneeContract
  }
}

describe("LazyNFT", function () {
  it("Should deploy", async function () {
    const signers = await ethers.getSigners();
    const minter = signers[0].address;

    const LazyNFT = await ethers.getContractFactory("LazyNFT");
    const lazynft = await LazyNFT.deploy();
    await lazynft.deployed();
  });

  it("Should redeem an NFT from a signed voucher", async function () {
    const { doneeContract, royaltyReceiverContract, contract, redeemerContract, donee, royaltyReceiver, redeemer, minter } = await deploy()

    //Because the signatures are bound to a specific contract instance, you need to provide the address of the deployed
    // contract and an ethers.js Signer (opens new window)for the NFT creator's private key:

    const lazyMinter = new LazyMinter({ contract, signer: minter })
    const voucher = await lazyMinter.createVoucher(1, "ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi", 0, 1000, royaltyReceiver.address)
    await expect(redeemerContract.redeem(redeemer.address, donee.address, voucher))
      .to.emit(contract, 'Transfer')  // transfer from null address to minter
      .withArgs('0x0000000000000000000000000000000000000000', minter.address, voucher.tokenId)
      .and.to.emit(contract, 'Transfer') // transfer from minter to redeemer
      .withArgs(minter.address, redeemer.address, voucher.tokenId);
  });

  it("Should confirm balance change of redeemer after redeem", async function () {
    const { doneeContract, royaltyReceiverContract, contract, donee, redeemerContract, royaltyReceiver, redeemer, minter } = await deploy()

    //Because the signatures are bound to a specific contract instance, you need to provide the address of the deployed
    // contract and an ethers.js Signer (opens new window)for the NFT creator's private key:

    const lazyMinter = new LazyMinter({ contract, signer: minter })
    const voucher = await lazyMinter.createVoucher(1, "ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi", 0, 1000, royaltyReceiver.address)

    const balance_before = await ethers.provider.getBalance(redeemer.address);
    await redeemerContract.redeem(redeemer.address, donee.address, voucher, { value: ethers.utils.parseEther("1.0") })
    const balance_after = await ethers.provider.getBalance(redeemer.address);

    expect(balance_after).to.be.below(balance_before)

  });



  it("Should have the royalty percentage", async function () {
    const { doneeContract, royaltyReceiverContract, contract, redeemerContract, donee, royaltyReceiver, redeemer, minter } = await deploy()

    //Because the signatures are bound to a specific contract instance, you need to provide the address of the deployed
    // contract and an ethers.js Signer (opens new window)for the NFT creator's private key:

    const lazyMinter = new LazyMinter({ contract, signer: minter })
    const voucher = await lazyMinter.createVoucher(1, "ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi", 0, 1000, royaltyReceiver.address)

    await expect(redeemerContract.redeem(redeemer.address, donee.address, voucher))
      .to.emit(contract, 'Transfer')  // transfer from null address to minter
      .withArgs('0x0000000000000000000000000000000000000000', minter.address, voucher.tokenId)
      .and.to.emit(contract, 'Transfer') // transfer from minter to redeemer
      .withArgs(minter.address, redeemer.address, voucher.tokenId);

    const returned = await contract.royaltyInfo(voucher.tokenId, 10000000);

    expect([returned[0], returned[1].toNumber()]).to.eql([royaltyReceiver.address, 1000000])
  });

  it("Should fail to redeem an NFT that's already been claimed", async function () {
    const { doneeContract, royaltyReceiverContract, contract, redeemerContract, donee, royaltyReceiver, redeemer, minter } = await deploy()

    const lazyMinter = new LazyMinter({ contract, signer: minter })
    const voucher = await lazyMinter.createVoucher(1, "ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi", 0, 1000, royaltyReceiver.address)


    await expect(redeemerContract.redeem(redeemer.address, donee.address, voucher))
      .to.emit(contract, 'Transfer')  // transfer from null address to minter
      .withArgs('0x0000000000000000000000000000000000000000', minter.address, voucher.tokenId)
      .and.to.emit(contract, 'Transfer') // transfer from minter to redeemer
      .withArgs(minter.address, redeemer.address, voucher.tokenId);

    await expect(redeemerContract.redeem(redeemer.address, donee.address, voucher))
      .to.be.revertedWith('ERC721: token already minted')
  });

  it("Should fail to redeem an NFT voucher that's signed by an unauthorized account", async function () {
    const { doneeContract, royaltyReceiverContract, contract, redeemerContract, donee, royaltyReceiver, redeemer, minter } = await deploy()

    const signers = await ethers.getSigners()
    const rando = signers[signers.length - 1];

    const lazyMinter = new LazyMinter({ contract, signer: rando })
    const voucher = await lazyMinter.createVoucher(1, "ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi", 0, 1000, royaltyReceiver.address)

    await expect(redeemerContract.redeem(redeemer.address, donee.address, voucher))
      .to.be.revertedWith('Signature invalid or unauthorized')
  });

  it("Should fail to redeem an NFT voucher that's been modified", async function () {
    const { doneeContract, royaltyReceiverContract, contract, redeemerContract, donee, royaltyReceiver, redeemer, minter } = await deploy()

    const signers = await ethers.getSigners()
    const rando = signers[signers.length - 1];

    const lazyMinter = new LazyMinter({ contract, signer: rando })
    const voucher = await lazyMinter.createVoucher(1, "ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi", 0, 1000, royaltyReceiver.address)
    voucher.tokenId = 2
    await expect(redeemerContract.redeem(redeemer.address, donee.address, voucher))
      .to.be.revertedWith('Signature invalid or unauthorized')
  });

  it("Should fail to redeem an NFT voucher with an invalid signature", async function () {
    const { doneeContract, royaltyReceiverContract, contract, redeemerContract, donee, royaltyReceiver, redeemer, minter } = await deploy()

    const signers = await ethers.getSigners()
    const rando = signers[signers.length - 1];

    const lazyMinter = new LazyMinter({ contract, signer: rando })
    const voucher = await lazyMinter.createVoucher(1, "ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi", 0, 1000, royaltyReceiver.address)

    const dummyData = ethers.utils.randomBytes(128)
    voucher.signature = await minter.signMessage(dummyData)

    await expect(redeemerContract.redeem(redeemer.address, donee.address, voucher))
      .to.be.revertedWith('Signature invalid or unauthorized')
  });

  it("Should redeem if payment is >= minPrice", async function () {
    const { doneeContract, royaltyReceiverContract, contract, redeemerContract, donee, royaltyReceiver, redeemer, minter } = await deploy()

    const lazyMinter = new LazyMinter({ contract, signer: minter })
    const minPrice = ethers.constants.WeiPerEther // charge 1 Eth
    const voucher = await lazyMinter.createVoucher(1, "ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi", minPrice, 1000, royaltyReceiver.address)

    await expect(redeemerContract.redeem(redeemer.address, donee.address, voucher, { value: minPrice }))
      .to.emit(contract, 'Transfer')  // transfer from null address to minter
      .withArgs('0x0000000000000000000000000000000000000000', minter.address, voucher.tokenId)
      .and.to.emit(contract, 'Transfer') // transfer from minter to redeemer
      .withArgs(minter.address, redeemer.address, voucher.tokenId)
  })

  it("Should fail to redeem if payment is < minPrice", async function () {
    const { doneeContract, royaltyReceiverContract, contract, redeemerContract, donee, royaltyReceiver, redeemer, minter } = await deploy()

    const lazyMinter = new LazyMinter({ contract, signer: minter })
    const minPrice = ethers.constants.WeiPerEther // charge 1 Eth
    const voucher = await lazyMinter.createVoucher(1, "ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi", minPrice, 1000, royaltyReceiver.address)

    const payment = minPrice.sub(10000)
    await expect(redeemerContract.redeem(redeemer.address, donee.address, voucher, { value: payment }))
      .to.be.revertedWith('Insufficient funds to redeem')
  })

  it("Should make payments available to minter for withdrawal", async function () {
    const { doneeContract, royaltyReceiverContract, contract, redeemerContract, donee, royaltyReceiver, redeemer, minter } = await deploy()

    const lazyMinter = new LazyMinter({ contract, signer: minter })
    const minPrice = ethers.constants.WeiPerEther // charge 1 Eth
    const royaltyPercent = 100
    const voucher = await lazyMinter.createVoucher(1, "ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi", minPrice, royaltyPercent, royaltyReceiver.address)

    // the payment should be sent from the redeemer's account to the contract address
    await expect(await redeemerContract.redeem(redeemer.address, donee.address, voucher, { value: minPrice }))
      .to.changeEtherBalances([redeemer, contract], [minPrice.mul(-1), minPrice])

    // minter should have funds available to withdraw
    expect(await contract.availableToWithdraw()).to.equal(minPrice.div(100))

    // withdrawal should increase minter's balance
    await expect(await contract.withdraw())
      .to.changeEtherBalance(minter, minPrice.div(100))

    // minter should now have zero available
    expect(await contract.availableToWithdraw()).to.equal(0)
  })

  it("Should make payments available to royalty receiver for withdrawal", async function () {
    const { doneeContract, royaltyReceiverContract, contract, redeemerContract, donee, royaltyReceiver, redeemer, minter } = await deploy()

    const lazyMinter = new LazyMinter({ contract, signer: minter })
    const minPrice = ethers.constants.WeiPerEther // charge 1 Eth
    const royaltyPercent = 100
    const voucher = await lazyMinter.createVoucher(1, "ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi", minPrice, royaltyPercent, royaltyReceiver.address)

    // the payment should be sent from the redeemer's account to the contract address
    await expect(await redeemerContract.redeem(redeemer.address, donee.address, voucher, { value: minPrice }))
      .to.changeEtherBalances([redeemer, redeemerContract], [minPrice.mul(-1), minPrice])

    // royalty receiver should have funds available to withdraw
    expect(await royaltyReceiverContract.availableToWithdraw()).to.equal((minPrice.sub(minPrice.div(royaltyPercent))).div(royaltyPercent))

    // withdrawal should increase royalty receiver's balance
    await expect(await royaltyReceiverContract.withdraw())
      .to.changeEtherBalance(royaltyReceiver, (minPrice.sub(minPrice.div(royaltyPercent))).div(royaltyPercent))

    // royalty receiver should now have zero available
    expect(await royaltyReceiverContract.availableToWithdraw()).to.equal(0)
  })

  it("Should make payments available to donee for withdrawal", async function () {
    const { doneeContract, royaltyReceiverContract, contract, redeemerContract, donee, royaltyReceiver, redeemer, minter } = await deploy()

    const lazyMinter = new LazyMinter({ contract, signer: minter })
    const minPrice = ethers.constants.WeiPerEther // charge 1 Eth
    const royaltyPercent = 100
    const voucher = await lazyMinter.createVoucher(1, "ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi", minPrice, royaltyPercent, royaltyReceiver.address)

    // the payment should be sent from the redeemer's account to the contract address
    await expect(await redeemerContract.redeem(redeemer.address, donee.address, voucher, { value: minPrice }))
      .to.changeEtherBalances([redeemer, redeemerContract], [minPrice.mul(-1), minPrice])

    // donee should have funds available to withdraw
    const royaltyCut = (minPrice.sub(minPrice.div(royaltyPercent))).div(royaltyPercent)
    const companyCut = minPrice.div(100)
    const totalCut = royaltyCut.add(companyCut)
    expect(await doneeContract.availableToWithdraw()).to.equal(minPrice.sub(totalCut))

    // withdrawal should increase donee's balance
    await expect(await doneeContract.withdraw())
      .to.changeEtherBalance(donee, minPrice.sub(totalCut))

    // royalty receiver should now have zero available
    expect(await doneeContract.availableToWithdraw()).to.equal(0)
  });

  it("Should emit royaltyReceived event", async function () {
    const { doneeContract, royaltyReceiverContract, contract, redeemerContract, donee, royaltyReceiver, redeemer, minter } = await deploy()

    //Because the signatures are bound to a specific contract instance, you need to provide the address of the deployed
    // contract and an ethers.js Signer (opens new window)for the NFT creator's private key:

    const lazyMinter = new LazyMinter({ contract, signer: minter })
    const minPrice = ethers.constants.WeiPerEther // charge 1 Eth
    const royaltyPercent = 100 // means 100 / 1000 = 1%
    const voucher = await lazyMinter.createVoucher(1, "ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi", minPrice, royaltyPercent, royaltyReceiver.address)
    await expect(redeemerContract.redeem(redeemer.address, donee.address, voucher, { value: minPrice }))
      .to.emit(contract, 'Transfer')  // transfer from null address to minter
      .withArgs('0x0000000000000000000000000000000000000000', minter.address, voucher.tokenId)
      .and.to.emit(contract, 'Transfer') // transfer from minter to redeemer
      .withArgs(minter.address, redeemer.address, voucher.tokenId)
      .and.to.emit(contract, 'RecievedRoyalties') // royalty received event
      .withArgs(royaltyReceiver.address, redeemer.address, (minPrice.sub(minPrice.div(royaltyPercent))).div(royaltyPercent));
  });
});