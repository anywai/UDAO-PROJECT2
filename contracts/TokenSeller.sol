// SPDX-License-Identifier: MIT
/// @title UDAO smart contract's role definitions.
pragma solidity ^0.8.4;
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract TokenSeller is AccessControl {
    IERC20 public udaoToken;
    bool tokenRelased = false;

    // Events
    event TokensWithdrawn(address indexed user, uint256 amount);
    event TokensReleased(bool indexed tokenRelased);
    event BalanceAdded(address indexed user, uint256 amount);
    event BatchBalanceAdded(address[] indexed users, uint256[] amounts);
    event BalanceReset(address indexed user);
    event UDAOSet(address indexed udaoToken);

    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }
    // user_address => balance
    mapping(address => uint256) public balances;

    /// @notice DEFAULT_ADMIN_ROLE sets the UDAO token address
    /// @param _udaoTokenAddress The address of the UDAO token
    function setUDAO(
        address _udaoTokenAddress
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        udaoToken = IERC20(_udaoTokenAddress);
        emit UDAOSet(_udaoTokenAddress);
    }

    /// @notice DEFAULT_ADMIN_ROLE releases the tokens
    function releaseTokens() external onlyRole(DEFAULT_ADMIN_ROLE) {
        tokenRelased = true;
        emit TokensReleased(tokenRelased);
    }

    /// @notice DEFAULT_ADMIN_ROLE creates records of the balances of the users
    /// @param _user The address of the user
    /// @param _amount The amount of tokens to be added to the user's balance
    function addBalance(
        address _user,
        uint256 _amount
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(_amount > 0, "Amount must be greater than 0!");
        balances[_user] += _amount;
        emit BalanceAdded(_user, _amount);
    }

    /// @notice DEFAULT_ADMIN_ROLE creates batch records of the balances of the users
    /// @param _users The addresses of the users
    /// @param _amounts The amounts of tokens to be added to the user's balance
    function batchAddBalance(
        address[] calldata _users,
        uint256[] calldata _amounts
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(_users.length == _amounts.length, "Arrays must be the same length!");
        for (uint256 i = 0; i < _users.length; i++) {
            balances[_users[i]] += _amounts[i];
        }
        emit BatchBalanceAdded(_users, _amounts);
    }

    /// @notice Returns the balance of the user
    /// @param _user The address of the user
    function getBalance(address _user) external view returns (uint256) {
        return balances[_user];
    }

    /// @notice Allows users to withdraw their tokens from the token seller contract
    function withdraw() external {
        require(tokenRelased, "Tokens are not released yet!");
        uint256 balance = balances[msg.sender];
        require(balance > 0, "You have no tokens to withdraw!");
        balances[msg.sender] = 0;
        udaoToken.transfer(msg.sender, balance);
        emit TokensWithdrawn(msg.sender, balance);
    }
}
