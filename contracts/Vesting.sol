// SPDX-License-Identifier: MIT
/// @title UDAO Token Vesting Contract

pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

contract Vesting is AccessControl {
    /// @dev The token being held in this contract.
    IERC20 token;

    /// @dev Represents a VestingLock that holds tokens for a beneficiary until a release time.
    struct VestingLock {
        address beneficiary;
        uint balance;
        uint releaseTime;
    }

    /// @dev Array of VestingLocks
    VestingLock[] public vestingLocks;
    /// @dev This event is triggered when tokens are deposited into the contract and lock created.
    event VestingDeposit(
        address indexed sender,
        address indexed beneficiary,
        uint vestingIndex,
        uint amount,
        uint releaseTime
    );
    /// @dev This event is triggered when tokens are withdrawn from the contract.
    event VestingWithdrawal(
        address indexed receiver,
        uint vestingIndex,
        uint amount
    );
    /// @dev This role is used to grant access to deposit tokens and create locks.
    bytes32 public constant DEPOSITOR_ROLE = keccak256("DEPOSITOR_ROLE");

    constructor(address tokenContract) {
        token = IERC20(tokenContract);
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(DEPOSITOR_ROLE, msg.sender);
    }

    /// @notice Allows admin to grant depositer role to a new address
    /// @param _newAddress The address to grant the role to
    function grantDepositerRole(address _newAddress) external {
        require(
            hasRole(DEFAULT_ADMIN_ROLE, msg.sender),
            "Only admin can grant deposit role"
        );
        _grantRole(DEPOSITOR_ROLE, _newAddress);
    }

    /// @notice Allows admin to revoke depositer role from an address
    /// @param _oldAddress The address to revoke the role from
    function revokeDepositerRole(address _oldAddress) external {
        require(
            hasRole(DEFAULT_ADMIN_ROLE, msg.sender),
            "Only admin can revoke deposit role"
        );
        _revokeRole(DEPOSITOR_ROLE, _oldAddress);
    }

    /// @notice Allows DEPOSITOR_ROLE to deposit tokens for a beneficiary
    /// @param beneficiary The address to lock tokens for
    /// @param amount The amount of tokens to lock
    /// @param releaseTime The time when the tokens can be withdrawn
    function deposit(
        address beneficiary,
        uint amount,
        uint releaseTime
    ) external onlyRole(DEPOSITOR_ROLE) returns (bool success) {
        require(token.transferFrom(msg.sender, address(this), amount));
        VestingLock memory currentVesting;
        currentVesting.beneficiary = beneficiary;
        currentVesting.balance = amount;
        currentVesting.releaseTime = releaseTime;
        vestingLocks.push(currentVesting);
        uint vestingIndex = vestingLocks.length - 1;
        emit VestingDeposit(
            msg.sender,
            beneficiary,
            vestingIndex,
            amount,
            releaseTime
        );
        return true;
    }

    /// @notice Allows DEPOSITOR_ROLE to deposit tokens for multiple beneficiaries
    /// @param beneficiaries The addresses to lock tokens for
    /// @param amounts The amounts of tokens to lock
    /// @param releaseTimes The times when the tokens can be withdrawn
    function depositInBatch(
        address[] calldata beneficiaries,
        uint[] calldata amounts,
        uint[] calldata releaseTimes
    ) external onlyRole(DEPOSITOR_ROLE) returns (bool success) {
        require(
            beneficiaries.length == amounts.length &&
                beneficiaries.length == releaseTimes.length,
            "Beneficiaries, amounts and releaseTimes length mismatch"
        );
        for (uint i = 0; i < beneficiaries.length; i++) {
            require(token.transferFrom(msg.sender, address(this), amounts[i]));
            VestingLock memory currentVesting;
            currentVesting.beneficiary = beneficiaries[i];
            currentVesting.balance = amounts[i];
            currentVesting.releaseTime = releaseTimes[i];
            vestingLocks.push(currentVesting);
            uint vestingIndex = vestingLocks.length - 1;
            emit VestingDeposit(
                msg.sender,
                beneficiaries[i],
                vestingIndex,
                amounts[i],
                releaseTimes[i]
            );
        }
        return true;
    }

    /// @notice Allows beneficiary to withdraw tokens
    /// @param vestingIndex The index of the vesting lock to withdraw from
    function withdraw(uint vestingIndex) public returns (bool success) {
        VestingLock storage currentVesting = vestingLocks[vestingIndex];
        require(
            currentVesting.beneficiary == msg.sender,
            "You are not the beneficiary of this vesting lock"
        );
        require(
            currentVesting.releaseTime <= block.timestamp,
            "Your vesting period is not over yet"
        );
        uint amount = currentVesting.balance;
        require(
            amount > 0,
            "You have already withdrawn your vesting for this index"
        );
        currentVesting.balance = 0;
        emit VestingWithdrawal(msg.sender, vestingIndex, amount);
        require(token.transfer(msg.sender, amount));
        return true;
    }
}
