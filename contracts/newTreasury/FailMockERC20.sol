// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract FailMockERC20 is ERC20 {
    mapping(address => bool) public blocked;

    constructor(
        string memory name,
        string memory symbol,
        uint256 initialSupply
    ) ERC20(name, symbol) {
        _mint(msg.sender, initialSupply);
    }

    function blockAddress(address user, bool blockedStatus) external {
        blocked[user] = blockedStatus;
    }

    function transfer(
        address to,
        uint256 amount
    ) public override returns (bool) {
        require(!blocked[to], "Recipient blocked");
        return super.transfer(to, amount);
    }

    function transferFrom(
        address from,
        address to,
        uint256 amount
    ) public override returns (bool) {
        require(!blocked[to], "Recipient blocked from");
        return super.transferFrom(from, to, amount);
    }
}
