// SPDX-License-Identifier: MIT
/// @title UDAO token is an ERC20 token.
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "../interfaces/ITokenSeller.sol";

contract UDAO is ERC20 {
    ITokenSeller public tokenSeller;
    constructor(address _ITS) ERC20("UDAO", "UDAO") {
        _mint(msg.sender, 100000000 * 10**decimals());
        tokenSeller = ITokenSeller(_ITS);
    }

    /// @notice Allows users to withdraw their tokens from the token seller contract
    function withdraw() external {
        uint256 balance = tokenSeller.getBalance(msg.sender);
        tokenSeller.resetBalance(msg.sender);
        //_mint(msg.sender, balance);
        transfer(msg.sender, balance); // if minted tokens are in this contract, use this line
    }
   
}
