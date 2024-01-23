// SPDX-License-Identifier: MIT
/// @title UDAO-vp (UDAOVp) interface.
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/governance/utils/IVotes.sol";

interface IUDAOVP is IVotes, IERC20 {
    function mint(address to, uint256 amount) external;

    function burnFrom(address account, uint256 amount) external;
}
