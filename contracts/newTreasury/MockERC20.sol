// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title MockERC20 - A simple mock ERC20 token for testing purposes

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MockERC20 is ERC20 {
    constructor(
        string memory name,
        string memory symbol,
        uint256 initialSupply
    ) ERC20(name, symbol) {
        _mint(msg.sender, initialSupply);
    }
}
