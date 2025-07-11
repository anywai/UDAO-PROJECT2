const { expect } = require("chai");
const { ethers } = require("hardhat");
require("dotenv").config();

describe("NewTreasury Contract Tests", function () {
  let NewTreasury,
    NewGovDummy,
    MTK1,
    MTK2,
    backend,
    foundation,
    instructor1,
    instructor2,
    instructor3,
    instructor4,
    instructor5,
    buyer1,
    buyer2,
    buyer3,
    buyer4,
    buyer5,
    person1,
    person2,
    person3,
    person4,
    person5;

  before(async function () {
    // Get signers for main users.
    [
      backend,
      foundation,
      instructor1,
      instructor2,
      instructor3,
      instructor4,
      instructor5,
      buyer1,
      buyer2,
      buyer3,
      buyer4,
      buyer5,
      person1,
      person2,
      person3,
      person4,
      person5,
    ] = await ethers.getSigners();

    // Create a MockERC20 contract factory
    const MockERC20Factory = await ethers.getContractFactory("contracts/newTreasury/MockERC20.sol:MockERC20");

    // MTK1 and MTK2 are mock ERC20 tokens used in the tests, to simulate different erc20 tokens.
    MKT1 = await MockERC20Factory.connect(backend).deploy("MockToken1", "MTK1", ethers.parseEther("100000"));
    await MKT1.waitForDeployment();
    MKT2 = await MockERC20Factory.connect(backend).deploy("MockToken2", "MTK2", ethers.parseEther("1000000"));
    await MKT2.waitForDeployment();

    // Set up the initial balances for the mock tokens
    await MKT1.connect(backend).transfer(foundation.address, ethers.parseEther("1000"));
    await MKT1.connect(backend).transfer(instructor1.address, ethers.parseEther("1000"));
    await MKT1.connect(backend).transfer(instructor2.address, ethers.parseEther("1000"));
    await MKT1.connect(backend).transfer(instructor3.address, ethers.parseEther("1000"));
    await MKT1.connect(backend).transfer(instructor4.address, ethers.parseEther("1000"));
    await MKT1.connect(backend).transfer(instructor5.address, ethers.parseEther("1000"));
    await MKT1.connect(backend).transfer(buyer1.address, ethers.parseEther("1000"));
    await MKT1.connect(backend).transfer(buyer2.address, ethers.parseEther("1000"));
    await MKT1.connect(backend).transfer(buyer3.address, ethers.parseEther("1000"));
    await MKT1.connect(backend).transfer(buyer4.address, ethers.parseEther("1000"));
    await MKT1.connect(backend).transfer(buyer5.address, ethers.parseEther("1000"));
    await MKT1.connect(backend).transfer(person1.address, ethers.parseEther("1000"));
    await MKT1.connect(backend).transfer(person2.address, ethers.parseEther("1000"));
    await MKT1.connect(backend).transfer(person3.address, ethers.parseEther("1000"));
    await MKT1.connect(backend).transfer(person4.address, ethers.parseEther("1000"));
    await MKT1.connect(backend).transfer(person5.address, ethers.parseEther("1000"));

    await MKT2.connect(backend).transfer(foundation.address, ethers.parseEther("1000"));
    await MKT2.connect(backend).transfer(instructor1.address, ethers.parseEther("1000"));
    await MKT2.connect(backend).transfer(instructor2.address, ethers.parseEther("1000"));
    await MKT2.connect(backend).transfer(instructor3.address, ethers.parseEther("1000"));
    await MKT2.connect(backend).transfer(instructor4.address, ethers.parseEther("1000"));
    await MKT2.connect(backend).transfer(instructor5.address, ethers.parseEther("1000"));
    await MKT2.connect(backend).transfer(buyer1.address, ethers.parseEther("1000"));
    await MKT2.connect(backend).transfer(buyer2.address, ethers.parseEther("1000"));
    await MKT2.connect(backend).transfer(buyer3.address, ethers.parseEther("1000"));
    await MKT2.connect(backend).transfer(buyer4.address, ethers.parseEther("1000"));
    await MKT2.connect(backend).transfer(buyer5.address, ethers.parseEther("1000"));
    await MKT2.connect(backend).transfer(person1.address, ethers.parseEther("1000"));
    await MKT2.connect(backend).transfer(person2.address, ethers.parseEther("1000"));
    await MKT2.connect(backend).transfer(person3.address, ethers.parseEther("1000"));
    await MKT2.connect(backend).transfer(person4.address, ethers.parseEther("1000"));
    await MKT2.connect(backend).transfer(person5.address, ethers.parseEther("1000"));

    // Create a NewGovernanceDummy contract factory and deploy it
    const NewGovernanceDummyFactory = await ethers.getContractFactory(
      "contracts/newTreasury/NewGovernanceTreasuryDummy.sol:NewGovernanceTreasuryDummy"
    );
    NewGovDummy = await NewGovernanceDummyFactory.connect(backend).deploy();
    await NewGovDummy.waitForDeployment();

    // Deploy NewTreasury contract
    const NewTreasuryFactory = await ethers.getContractFactory("contracts/newTreasury/NewTreasury.sol:NewTreasury");
    //address _foundationWallet,
    //address _udaoTokenAddress,
    //address _governanceContract
    NewTreasury = await NewTreasuryFactory.connect(backend).deploy(foundation.address, MKT1.target, NewGovDummy.target); // constructor parameters can be added here if needed
    await NewTreasury.waitForDeployment();

    // Approve the NewTreasury contract to spend tokens on behalf of the users
    await MKT1.connect(backend).approve(NewTreasury.target, ethers.parseEther("1000"));
    await MKT2.connect(backend).approve(NewTreasury.target, ethers.parseEther("1000"));

    await MKT1.connect(foundation).approve(NewTreasury.target, ethers.parseEther("1000"));
    await MKT1.connect(instructor1).approve(NewTreasury.target, ethers.parseEther("1000"));
    await MKT1.connect(instructor2).approve(NewTreasury.target, ethers.parseEther("1000"));
    await MKT1.connect(instructor3).approve(NewTreasury.target, ethers.parseEther("1000"));
    await MKT1.connect(instructor4).approve(NewTreasury.target, ethers.parseEther("1000"));
    await MKT1.connect(instructor5).approve(NewTreasury.target, ethers.parseEther("1000"));
    await MKT1.connect(buyer1).approve(NewTreasury.target, ethers.parseEther("1000"));
    await MKT1.connect(buyer2).approve(NewTreasury.target, ethers.parseEther("1000"));
    await MKT1.connect(buyer3).approve(NewTreasury.target, ethers.parseEther("1000"));
    await MKT1.connect(buyer4).approve(NewTreasury.target, ethers.parseEther("1000"));
    await MKT1.connect(buyer5).approve(NewTreasury.target, ethers.parseEther("1000"));
    await MKT1.connect(person1).approve(NewTreasury.target, ethers.parseEther("1000"));
    await MKT1.connect(person2).approve(NewTreasury.target, ethers.parseEther("1000"));
    await MKT1.connect(person3).approve(NewTreasury.target, ethers.parseEther("1000"));
    await MKT1.connect(person4).approve(NewTreasury.target, ethers.parseEther("1000"));
    await MKT1.connect(person5).approve(NewTreasury.target, ethers.parseEther("1000"));

    await MKT2.connect(foundation).approve(NewTreasury.target, ethers.parseEther("1000"));
    await MKT2.connect(instructor1).approve(NewTreasury.target, ethers.parseEther("1000"));
    await MKT2.connect(instructor2).approve(NewTreasury.target, ethers.parseEther("1000"));
    await MKT2.connect(instructor3).approve(NewTreasury.target, ethers.parseEther("1000"));
    await MKT2.connect(instructor4).approve(NewTreasury.target, ethers.parseEther("1000"));
    await MKT2.connect(instructor5).approve(NewTreasury.target, ethers.parseEther("1000"));
    await MKT2.connect(buyer1).approve(NewTreasury.target, ethers.parseEther("1000"));
    await MKT2.connect(buyer2).approve(NewTreasury.target, ethers.parseEther("1000"));
    await MKT2.connect(buyer3).approve(NewTreasury.target, ethers.parseEther("1000"));
    await MKT2.connect(buyer4).approve(NewTreasury.target, ethers.parseEther("1000"));
    await MKT2.connect(buyer5).approve(NewTreasury.target, ethers.parseEther("1000"));
    await MKT2.connect(person1).approve(NewTreasury.target, ethers.parseEther("1000"));
    await MKT2.connect(person2).approve(NewTreasury.target, ethers.parseEther("1000"));
    await MKT2.connect(person3).approve(NewTreasury.target, ethers.parseEther("1000"));
    await MKT2.connect(person4).approve(NewTreasury.target, ethers.parseEther("1000"));
    await MKT2.connect(person5).approve(NewTreasury.target, ethers.parseEther("1000"));

    //important note: Check `.target` for ethers v6
    //target usage: Ethers v6 uses .target instead of .address for deployed contract instances.
    //However, if the instance isn't assigned correctly, accessing .target will result in a null or undefined value.

    //add new interactions here if needed
  });

  // Create Course Tests
  it("should create a course successfully", async function () {
    //const courseName = "Test Course";
    //const courseDescription = "This is a test course.";
    //const coursePrice = ethers.parseEther("1");
    //
    //// Call the createCourse function
    //const tx = await NewTreasury.connect(backend).createCourse(courseName, courseDescription, MKT1.target, coursePrice);
    //await tx.wait();
    //
    //// Check if the course was created successfully
    //const course = await NewTreasury.getCourse(0);
    //expect(course.name).to.equal(courseName);
    //expect(course.description).to.equal(courseDescription);
    //expect(course.price).to.equal(coursePrice);
  });

  // End of tests
});
