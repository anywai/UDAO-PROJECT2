// SPDX-License-Identifier: MIT
/// @title UDAO smart contract's role definitions.
pragma solidity ^0.8.4;
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract TokenSeller is AccessControl {
    bytes32 public constant RECORDER_ROLE = keccak256("RECORDER_ROLE");
    IERC20 public udaoToken;
    bool public tokenRelased = false;

    // Events
    event TokensWithdrawn(address user, uint256 amount);
    event TokensReleased(bool tokenRelased);
    event BalanceAdded(address user, uint256 amount);
    event BatchBalanceAdded(address[] users, uint256[] amounts);
    event BalanceReset(address user);
    event UDAOSet(address udaoToken);
    event KYCStatusChanged(address user, bool status);

    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(RECORDER_ROLE, msg.sender);
    }

    // user_address => balance
    mapping(address => uint256) public balances;
    mapping(address => bool) public KYCList;

    /// @notice DEFAULT_ADMIN_ROLE sets the UDAO token address
    /// @param _udaoTokenAddress The address of the UDAO token
    function setUDAO(
        address _udaoTokenAddress
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        udaoToken = IERC20(_udaoTokenAddress);
        emit UDAOSet(_udaoTokenAddress);
    }

    /// @notice DEFAULT_ADMIN_ROLE resets the balance of the user
    /// @param _user The address of the user
    function grantRecorderRole(
        address _user
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _grantRole(RECORDER_ROLE, _user);
    }

    /// @notice DEFAULT_ADMIN_ROLE releases the tokens
    function releaseTokens() external onlyRole(DEFAULT_ADMIN_ROLE) {
        tokenRelased = true;
        emit TokensReleased(tokenRelased);
    }

    /// @notice RECORDER_ROLE sets the KYC status of the user
    /// @param _user The address of the user
    /// @param _status The KYC status of the user
    function changeKYCStatus(
        address _user,
        bool _status
    ) public onlyRole(RECORDER_ROLE) {
        KYCList[_user] = _status;
        emit KYCStatusChanged(_user, _status);
    }

    /// @notice RECORDER_ROLE creates records of the balances of the users
    /// @param _user The address of the user
    /// @param _amount The amount of tokens to be added to the user's balance
    function addBalance(
        address _user,
        uint256 _amount
    ) external onlyRole(RECORDER_ROLE) {
        require(_amount > 0, "Amount must be greater than 0!");
        balances[_user] += _amount;
        changeKYCStatus(_user, true);
        emit BalanceAdded(_user, _amount);
    }

    /// @notice RECORDER_ROLE creates batch records of the balances of the users
    /// @param _users The addresses of the users
    /// @param _amounts The amounts of tokens to be added to the user's balance
    function batchAddBalance(
        address[] calldata _users,
        uint256[] calldata _amounts
    ) external onlyRole(RECORDER_ROLE) {
        require(
            _users.length == _amounts.length,
            "Arrays must be the same length!"
        );
        for (uint256 i = 0; i < _users.length; i++) {
            balances[_users[i]] += _amounts[i];
            changeKYCStatus(_users[i], true);
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
        require(KYCList[msg.sender], "You are not KYCed!");
        uint256 balance = balances[msg.sender];
        require(balance > 0, "You have no tokens to withdraw!");
        balances[msg.sender] = 0;
        udaoToken.transfer(msg.sender, balance);
        emit TokensWithdrawn(msg.sender, balance);
    }
}
