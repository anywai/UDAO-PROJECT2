// SPDX-License-Identifier: MIT
/// @title ADD TITLE

pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

contract Vesting is AccessControl {
    IERC20 token;

    struct LockBoxStruct {
        address beneficiary;
        uint balance;
        uint releaseTime;
    }

    LockBoxStruct[] public lockBoxStructs; // This could be a mapping by address, but these numbered lockBoxes support possibility of multiple tranches per address

    event LogLockBoxDeposit(address sender, uint amount, uint releaseTime);   
    event LogLockBoxWithdrawal(address receiver, uint amount);

    bytes32 public constant DEPOSITOR_ROLE = keccak256("DEPOSITOR_ROLE");

    constructor(address tokenContract) {
        token = IERC20(tokenContract);
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(DEPOSITOR_ROLE, msg.sender);
    }

    /// @notice Allows admin to grant depositer role to a new address
    /// @param _newAddress The address to grant the role to
    function grantDepositerRole(address _newAddress) external {
        require(hasRole(DEFAULT_ADMIN_ROLE, msg.sender), "Only admin can grant deposit role");
        _grantRole(DEPOSITOR_ROLE, _newAddress);
    }

    /// @notice Allows admin to revoke depositer role from an address
    /// @param _oldAddress The address to revoke the role from
    function revokeDepositerRole(address _oldAddress) external {
        require(hasRole(DEFAULT_ADMIN_ROLE, msg.sender), "Only admin can revoke deposit role");
        _revokeRole(DEPOSITOR_ROLE, _oldAddress);
    }

    /// @notice Allows DEPOSITOR_ROLE to deposit tokens for a beneficiary
    /// @param beneficiary The address to lock tokens for
    /// @param amount The amount of tokens to lock
    /// @param releaseTime The time when the tokens can be withdrawn
    function deposit(address beneficiary, uint amount, uint releaseTime) external onlyRole(DEPOSITOR_ROLE) returns(bool success) {
        require(token.transferFrom(msg.sender, address(this), amount));
        LockBoxStruct memory l;
        l.beneficiary = beneficiary;
        l.balance = amount;
        l.releaseTime = releaseTime;
        lockBoxStructs.push(l);
        emit LogLockBoxDeposit(msg.sender, amount, releaseTime);
        return true;
    }

    /// @notice Allows DEPOSITOR_ROLE to deposit tokens for multiple beneficiaries
    /// @param beneficiaries The addresses to lock tokens for
    /// @param amounts The amounts of tokens to lock
    /// @param releaseTimes The times when the tokens can be withdrawn
    function depositInBatch(address[] calldata beneficiaries, uint[] calldata amounts, uint[] calldata releaseTimes) external onlyRole(DEPOSITOR_ROLE) returns(bool success) {
        require(beneficiaries.length == amounts.length && beneficiaries.length == releaseTimes.length);
        for (uint i = 0; i < beneficiaries.length; i++) {
            require(token.transferFrom(msg.sender, address(this), amounts[i]));
            LockBoxStruct memory l;
            l.beneficiary = beneficiaries[i];
            l.balance = amounts[i];
            l.releaseTime = releaseTimes[i];
            lockBoxStructs.push(l);
            emit LogLockBoxDeposit(msg.sender, amounts[i], releaseTimes[i]);
        }
        return true;
    }

    /// @notice Allows DEPOSITOR_ROLE to lock tokens for a beneficiary
    /// @param beneficiary The address to lock tokens for
    /// @param amount The amount of tokens to lock
    /// @param releaseTime The time when the tokens can be withdrawn
    /// @dev This function allows locking without token sending. Assuming tokens were sent in advance.
    function onlyLock(address beneficiary, uint amount, uint releaseTime) external onlyRole(DEPOSITOR_ROLE) returns(bool success) {
        LockBoxStruct memory l;
        l.beneficiary = beneficiary;
        l.balance = amount;
        l.releaseTime = releaseTime;
        lockBoxStructs.push(l);
        emit LogLockBoxDeposit(msg.sender, amount, releaseTime);
        return true;
    }

    /// @notice Allows beneficiary to withdraw tokens
    /// @param lockBoxNumber The index of the lockbox to withdraw from
    function withdraw(uint lockBoxNumber) public returns(bool success) {
        LockBoxStruct storage l = lockBoxStructs[lockBoxNumber];
        require(l.beneficiary == msg.sender);
        require(l.releaseTime <= block.timestamp);
        uint amount = l.balance;
        l.balance = 0;
        emit LogLockBoxWithdrawal(msg.sender, amount);
        require(token.transfer(msg.sender, amount));
        return true;
    }    

}