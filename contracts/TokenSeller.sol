// SPDX-License-Identifier: MIT
/// @title UDAO smart contract's role definitions.
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/access/AccessControl.sol";

contract TokenSeller is AccessControl{
    bytes32 public constant UDAO_CONTRACT = keccak256("UDAO_CONTRACT");

    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    mapping(address => uint256) public balances;

    /// @notice DEFAULT_ADMIN_ROLE creates records of the balances of the users
    /// @param _user The address of the user
    /// @param _amount The amount of tokens to be added to the user's balance
    function addBalance(address _user, uint256 _amount) external onlyRole(DEFAULT_ADMIN_ROLE) {
        balances[_user] += _amount;
    }

    /// @notice Returns the balance of the user
    /// @param _user The address of the user
    function getBalance(address _user) external view returns (uint256) {
        return balances[_user];
    }

    /// @notice Sets UDAO contract address
    /// @param _UDAOContract The address of the UDAO contract
    function setUDAOContract(address _UDAOContract) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _grantRole(UDAO_CONTRACT, _UDAOContract);
    }

    /// @notice UDAO Contract sets the balance of the user to 0
    /// @param _user The address of the user
    function resetBalance(address _user) external onlyRole(UDAO_CONTRACT) {
        balances[_user] = 0;
    }
}