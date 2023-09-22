// SPDX-License-Identifier: MIT
/// @title UDAO token is an ERC20 token.
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract UDAO is ERC20 {
    constructor() ERC20("UDAO", "UDAO") {
        _mint(msg.sender, 200000000 * 10 ** decimals());
    }
}
