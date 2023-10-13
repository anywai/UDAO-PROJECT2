# Solidity API

## PlatformTreasury

### SIGNING_DOMAIN

```solidity
string SIGNING_DOMAIN
```

### SIGNATURE_VERSION

```solidity
string SIGNATURE_VERSION
```

### GovernanceWithdrawn

```solidity
event GovernanceWithdrawn(uint256 amount)
```

this event gets triggered when governance withdraw tokens

### FoundationWithdrawn

```solidity
event FoundationWithdrawn(uint256 amount)
```

this event gets triggered when founcation withdraw tokens

### ValidatorWithdrawn

```solidity
event ValidatorWithdrawn(address validator, uint256 amount)
```

this event gets triggered when a validator withdraw tokens

### JurorWithdrawn

```solidity
event JurorWithdrawn(address juror, uint256 amount)
```

this event gets triggered when a juror withdraw tokens

### InstructorWithdrawn

```solidity
event InstructorWithdrawn(address instructor, uint256 amount, uint256 debt)
```

this event gets triggered when a instructor withdraw tokens

### constructor

```solidity
constructor(address _contractManagerAddress, address _rmAddress, address _iGovernanceTreasuryAddress, address voucherVerifierAddress) public
```

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _contractManagerAddress | address | The address of the deployed role manager |
| _rmAddress | address | The address of the deployed role manager |
| _iGovernanceTreasuryAddress | address |  |
| voucherVerifierAddress | address |  |

### withdrawFoundation

```solidity
function withdrawFoundation() external
```

withdraws foundation balance to foundation wallet

### withdrawInstructor

```solidity
function withdrawInstructor() external
```

Allows instructers to withdraw individually.

### getWithdrawableBalanceInstructor

```solidity
function getWithdrawableBalanceInstructor(address _inst) public view returns (uint256)
```

returns the withdrawable balance of the instructor

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _inst | address | The address of the instructor |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | withdrawableBalance The withdrawable balance of the given instructor |

