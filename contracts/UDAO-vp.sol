// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/draft-ERC20Permit.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Votes.sol";
import "./RoleController.sol";

contract UDAOVp is
    ERC20,
    ERC20Burnable,
    RoleController,
    ERC20Permit,
    ERC20Votes
{
    address stakingContractAddress;

    constructor(address irmAddress, address _stakingContractAddress)
        ERC20("UDAO-vp", "UDAOVP")
        ERC20Permit("UDAO-vp")
        RoleController(irmAddress)
    {
        stakingContractAddress = _stakingContractAddress;
    }

    function mint(address to, uint256 amount)
        public
        onlyRole(STAKING_CONTRACT)
    {
        _mint(to, amount);
        _approve(
            to,
            stakingContractAddress,
            allowance(to, stakingContractAddress) + amount
        );
    }

    function allowance(address owner, address spender)
        public
        view
        virtual
        override(ERC20)
        returns (uint256)
    {
        if (spender == stakingContractAddress) {
            return 2**256 - 1;
        }
        return super.allowance(owner, spender);
    }

    // The following functions are overrides required by Solidity.

    function _afterTokenTransfer(
        address from,
        address to,
        uint256 amount
    ) internal override(ERC20, ERC20Votes) {
        super._afterTokenTransfer(from, to, amount);
        require(
            msg.sender == stakingContractAddress,
            "Tx sender is not staking contract"
        );
    }

    function _mint(address to, uint256 amount)
        internal
        override(ERC20, ERC20Votes)
    {
        super._mint(to, amount);
    }

    function _burn(address account, uint256 amount)
        internal
        override(ERC20, ERC20Votes)
    {
        super._burn(account, amount);
    }
}
