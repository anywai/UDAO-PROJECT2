# Solidity API

## GovernanceTreasury

### udao

```solidity
contract IERC20 udao
```

### jurorBalance

```solidity
uint256 jurorBalance
```

Balance of jurors, its a pool for jurors transferred from platform treasury.

### validatorBalance

```solidity
uint256 validatorBalance
```

Balance of validators, its a pool for validators transferred from platform treasury.

### governanceBalance

```solidity
uint256 governanceBalance
```

Balance of governance, its a pool for governance transferred from platform treasury.

### ownerOfDummy

```solidity
address ownerOfDummy
```

Address of the deployer of this dummy contract

### constructor

```solidity
constructor(address udaoAddress) public
```

Constructor function of governance treasury contract.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| udaoAddress | address | Address of the UDAO token contract. |

### jurorBalanceUpdate

```solidity
function jurorBalanceUpdate(uint256 _balance) external
```

Updates the jurors balance in this treasury.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _balance | uint256 | The balance to update. |

### validatorBalanceUpdate

```solidity
function validatorBalanceUpdate(uint256 _balance) external
```

Updates the validators balance in this treasury.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _balance | uint256 | The balance to update. |

### governanceBalanceUpdate

```solidity
function governanceBalanceUpdate(uint256 _balance) external
```

Updates the governance balance in this treasury.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _balance | uint256 | The balance to update. |

### emergencyWithdraw

```solidity
function emergencyWithdraw() external
```

Withdraws the balance of the treasury.

_this dummy contract should not accumulate any balance, if any at all it an unwanted behaviour and deployer can save the funds._

