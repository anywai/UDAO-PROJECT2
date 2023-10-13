# Solidity API

## TokenSeller

### RECORDER_ROLE

```solidity
bytes32 RECORDER_ROLE
```

### udaoToken

```solidity
contract IERC20 udaoToken
```

### tokenRelased

```solidity
bool tokenRelased
```

### TokensWithdrawn

```solidity
event TokensWithdrawn(address user, uint256 amount)
```

### TokensReleased

```solidity
event TokensReleased(bool tokenRelased)
```

### BalanceAdded

```solidity
event BalanceAdded(address user, uint256 amount)
```

### BatchBalanceAdded

```solidity
event BatchBalanceAdded(address[] users, uint256[] amounts)
```

### BalanceReset

```solidity
event BalanceReset(address user)
```

### UDAOSet

```solidity
event UDAOSet(address udaoToken)
```

### KYCStatusChanged

```solidity
event KYCStatusChanged(address user, bool status)
```

### constructor

```solidity
constructor() public
```

### balances

```solidity
mapping(address => uint256) balances
```

### KYCList

```solidity
mapping(address => bool) KYCList
```

### setUDAO

```solidity
function setUDAO(address _udaoTokenAddress) external
```

DEFAULT_ADMIN_ROLE sets the UDAO token address

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _udaoTokenAddress | address | The address of the UDAO token |

### grantRecorderRole

```solidity
function grantRecorderRole(address _user) external
```

DEFAULT_ADMIN_ROLE resets the balance of the user

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _user | address | The address of the user |

### releaseTokens

```solidity
function releaseTokens() external
```

DEFAULT_ADMIN_ROLE releases the tokens

### changeKYCStatus

```solidity
function changeKYCStatus(address _user, bool _status) public
```

RECORDER_ROLE sets the KYC status of the user

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _user | address | The address of the user |
| _status | bool | The KYC status of the user |

### addBalance

```solidity
function addBalance(address _user, uint256 _amount) external
```

RECORDER_ROLE creates records of the balances of the users

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _user | address | The address of the user |
| _amount | uint256 | The amount of tokens to be added to the user's balance |

### batchAddBalance

```solidity
function batchAddBalance(address[] _users, uint256[] _amounts) external
```

RECORDER_ROLE creates batch records of the balances of the users

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _users | address[] | The addresses of the users |
| _amounts | uint256[] | The amounts of tokens to be added to the user's balance |

### getBalance

```solidity
function getBalance(address _user) external view returns (uint256)
```

Returns the balance of the user

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _user | address | The address of the user |

### withdraw

```solidity
function withdraw() external
```

Allows users to withdraw their tokens from the token seller contract

