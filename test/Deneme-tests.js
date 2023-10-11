const hardhat = require("hardhat");
const { ethers } = hardhat;
const helpers = require("@nomicfoundation/hardhat-network-helpers");
const { LazyRole } = require("../lib/LazyRole");
const { WMATIC_ABI, NonFunbiblePositionABI, NonFunbiblePositionAddress, WMATICAddress } = require("../lib/abis");
const { expect } = require("chai");
const chai = require("chai");
const BN = require("bn.js");

async function deploy() {
  const [
    backend,
    account1,
    account2,
    account3,
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
  ] = await ethers.getSigners();

  let denemeFactory = await ethers.getContractFactory("Deneme");
  const denemeContract = await denemeFactory.deploy();

  return {
    backend,
    account1,
    account2,
    account3,
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
    denemeContract,
  };
}

describe("Deneme Manager", function () {
  it("Should deploy", async function () {
    await deploy();
  });

  it("Should setOwnedContents", async function () {
    const {
      backend,
      account1,
      account2,
      account3,
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
      denemeContract,
    } = await deploy();
    await denemeContract.setOwnedContents(backend.address, 1, [1, 2]);

    // check if recorded correctly
    const ownedContents = await denemeContract.getOwnedContents(backend.address, 1);
    expect(ownedContents[0]).to.equal(1);
    expect(ownedContents[1]).to.equal(2);
  });

  it("Should setOwnedContents and delete some of them", async function () {
    const {
      backend,
      account1,
      account2,
      account3,
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
      denemeContract,
    } = await deploy();
    await denemeContract.setOwnedContents(backend.address, 1, [1, 2, 3, 4, 6, 7]);
    // console log all owned contents
    const ownedContents = await denemeContract.getOwnedContents(backend.address, 1);
    console.log(ownedContents);

    // delete [3,4,6], should remain [1,2,7]
    await denemeContract.newRefund(backend.address, 1, [1, 2, 7]);
    const ownedContentsAfterDelete = await denemeContract.getOwnedContents(backend.address, 1);
    console.log(ownedContentsAfterDelete);
  });

  it("Should setOwnedContents and delete all of them", async function () {
    const {
      backend,
      account1,
      account2,
      account3,
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
      denemeContract,
    } = await deploy();
    await denemeContract.setOwnedContents(backend.address, 1, [1, 2, 3, 4, 6, 7]);
    // console log all owned contents
    const ownedContents = await denemeContract.getOwnedContents(backend.address, 1);
    console.log(ownedContents);

    // delete [1, 2, 3, 4, 6, 7]
    await denemeContract.newRefund(backend.address, 1, []);
    const ownedContentsAfterDelete = await denemeContract.getOwnedContents(backend.address, 1);
    console.log(ownedContentsAfterDelete);
  });
});
