// SPDX-License-Identifier: MIT

pragma solidity ^0.8.4;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

// contract Wallets is Ownable(msg.sender) {

contract Wallets is Ownable, AccessControl {
    bytes32 public constant ROLE_SELLER = keccak256("ROLE_SELLER");
    bytes32 public constant SERVICE_PAY = keccak256("SERVICE_PAY");

    string public message;
    address public roleSeller;
    constructor(string memory _message, address _roleSeller) {
        _grantRole(ROLE_SELLER, _roleSeller);
        _grantRole(SERVICE_PAY, _roleSeller);
        roleSeller = _roleSeller;
        message = _message;
    }

    event Withdrawn(address indexed owner, uint256 balance);
    event Deposit(address indexed owner, uint256 balance);
    function withdraw() external onlyOwner {
        // Call autoRevoke function in RoleSeller contract
        RoleSeller(roleSeller).autoRevoke(msg.sender);
        payable(msg.sender).transfer(address(this).balance);
        emit Withdrawn(msg.sender, address(this).balance);
    }

    function deposit() external payable {
        // nothing to do
        emit Deposit(msg.sender, msg.value);
    }

    function checkBalance() public view returns (uint256) {
        return address(this).balance;
    }

    function payForRole() public onlyRole(ROLE_SELLER) {
        require(hasRole(ROLE_SELLER, msg.sender), "Caller is not a seller");
        payable(msg.sender).transfer(1);
    }

    function payForService() public {
        require(hasRole(SERVICE_PAY, msg.sender), "Caller is not a seller");
        payable(msg.sender).transfer(1);
    }
}

contract DeployWallets {
    address public roleSeller;
    constructor(address _roleSeller) {
        roleSeller = _roleSeller;
    }
    mapping(address => address) public userToContract;

    function Deploy(string memory message) public payable {
        //require(msg.value == 0.005 ether);
        //Wallets newWallet = new Wallets{value: msg.value}(message);
        Wallets newWallet = new Wallets(message, roleSeller);
        address contractAddress = address(newWallet);
        userToContract[msg.sender] = contractAddress;
        newWallet.transferOwnership(msg.sender);
    }

    function getUserWallet(address user) public view returns (address) {
        address userWalletAddress;

        userWalletAddress = userToContract[user];
        return (userWalletAddress);
    }
}

/// This contract
contract RoleSeller is AccessControl {
    bytes32 public constant JUROR_ROLE = keccak256("JUROR_ROLE");
    bytes32 public constant UDAO_WALLET = keccak256("UDAO_WALLET");
    address public deployWallets;

    function setDeployWallets(address _newAddress) public {
        deployWallets = _newAddress;
    }
    // This function allows users to buy the role of a juror by calling the payForRole function
    function buyRole() public {
        // Get the contract address of the wallet from DeployWallets
        address walletAddress = DeployWallets(deployWallets).getUserWallet(
            msg.sender
        );
        // Call the payForRole function in the Wallets contract
        Wallets(walletAddress).payForRole();
        //Grant the wallet the UDAO_WALLET role
        grantRole(UDAO_WALLET, walletAddress);
        //Grant the user the role of a juror
        grantRole(JUROR_ROLE, msg.sender);
    }

    function _checkRole(address account) public view returns (bool) {
        return hasRole(JUROR_ROLE, account);
    }

    function checkBalance() public view returns (uint256) {
        return address(this).balance;
    }

    function autoRevoke(address account) public onlyRole(UDAO_WALLET) {
        revokeRole(JUROR_ROLE, account);
    }
}
