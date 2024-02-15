# Solidity API

## Vesting

### token

```solidity
contract IERC20 token
```

_The token being held in this contract._

### VestingLock

```solidity
struct VestingLock {
  address beneficiary;
  uint256 balance;
  uint256 releaseTime;
}
```

### vestingLocks

```solidity
struct Vesting.VestingLock[] vestingLocks
```

_Array of VestingLocks_

### VestingDeposit

```solidity
event VestingDeposit(address sender, address beneficiary, uint256 vestingIndex, uint256 amount, uint256 releaseTime)
```

_This event is triggered when tokens are deposited into the contract and lock created._

### VestingWithdrawal

```solidity
event VestingWithdrawal(address receiver, uint256 vestingIndex, uint256 amount)
```

_This event is triggered when tokens are withdrawn from the contract._

### VestingsWithdrawal

```solidity
event VestingsWithdrawal(address receiver, uint256[] vestingIndeces, uint256 amount)
```

### DEPOSITOR_ROLE

```solidity
bytes32 DEPOSITOR_ROLE
```

_This role is used to grant access to deposit tokens and create locks._

### constructor

```solidity
constructor(address tokenContract) public
```

### grantDepositerRole

```solidity
function grantDepositerRole(address _newAddress) external
```

Allows admin to grant depositer role to a new address

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _newAddress | address | The address to grant the role to |

### revokeDepositerRole

```solidity
function revokeDepositerRole(address _oldAddress) external
```

Allows admin to revoke depositer role from an address

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _oldAddress | address | The address to revoke the role from |

### deposit

```solidity
function deposit(address beneficiary, uint256 amount, uint256 releaseTime) external returns (bool success)
```

Allows DEPOSITOR_ROLE to deposit tokens for a beneficiary

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| beneficiary | address | The address to lock tokens for |
| amount | uint256 | The amount of tokens to lock |
| releaseTime | uint256 | The time when the tokens can be withdrawn |

### depositInBatch

```solidity
function depositInBatch(address[] beneficiaries, uint256[] amounts, uint256[] releaseTimes) external returns (bool success)
```

Allows DEPOSITOR_ROLE to deposit tokens for multiple beneficiaries

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| beneficiaries | address[] | The addresses to lock tokens for |
| amounts | uint256[] | The amounts of tokens to lock |
| releaseTimes | uint256[] | The times when the tokens can be withdrawn |

### withdraw

```solidity
function withdraw(uint256 vestingIndex) public returns (bool success)
```

Allows beneficiary to withdraw tokens

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| vestingIndex | uint256 | The index of the vesting lock to withdraw from |

### withdrawFromBatch

```solidity
function withdrawFromBatch(uint256[] vestingIndices) external returns (bool success)
```

Allows beneficiary to withdraw tokens from multiple vesting locks

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| vestingIndices | uint256[] | The indices of the vesting locks to withdraw from |

