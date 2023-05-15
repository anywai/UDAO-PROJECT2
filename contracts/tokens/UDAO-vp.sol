// SPDX-License-Identifier: MIT
/// @title UDAO voting power token
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/draft-ERC20Permit.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Votes.sol";
import "../RoleController.sol";
import "../ContractManager.sol";

contract UDAOVp is
    ERC20,
    ERC20Burnable,
    RoleController,
    ERC20Permit,
    ERC20Votes
{
    address stakingContractAddress;
    ContractManager public contractManager;

    /// @param rmAddress The address of the deployed role manager
    constructor(
        address rmAddress,
        address _contractManager
    )
        ERC20("UDAO-vp", "UDAOVP")
        ERC20Permit("UDAO-vp")
        RoleController(rmAddress)
    {
        contractManager = ContractManager(_contractManager);
    }

    /// @notice Get the updated addresses from contract manager
    function updateAddresses() external onlyRole(BACKEND_ROLE) {
        stakingContractAddress = contractManager.StakingContractAddress();
    }

    /// @notice Allows staking contract to mint vp token "to" an address
    /// @param to The address of the vp token recipient
    /// @param amount of the vp token
    function mint(
        address to,
        uint256 amount
    ) public whenNotPaused onlyRole(STAKING_CONTRACT) {
        _mint(to, amount);
        /// @dev Staking contract requires allowence when user wants to unstake
        _approve(to, stakingContractAddress, 2 ** 256 - 1);
    }

    /// @notice returns allowance of an account for another account
    /// @param owner Owner of the tokens
    /// @param spender Address of the user with allownece rights
    function allowance(
        address owner,
        address spender
    ) public view virtual override(ERC20) whenNotPaused returns (uint256) {
        /// @dev staking contract will have infinite allowance
        if (spender == stakingContractAddress) {
            return 2 ** 256 - 1;
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

    function _mint(
        address to,
        uint256 amount
    ) internal override(ERC20, ERC20Votes) {
        super._mint(to, amount);
    }

    function _burn(
        address account,
        uint256 amount
    ) internal override(ERC20, ERC20Votes) {
        super._burn(account, amount);
    }
}
