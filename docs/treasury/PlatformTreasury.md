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
event InstructorWithdrawn(address instructor, uint256 amount)
```

this event gets triggered when a instructor withdraw tokens

### InstructorWithdrawnWithDebt

```solidity
event InstructorWithdrawnWithDebt(address instructor, uint256 amount, uint256 debtAmount)
```

this event gets triggered when a instructor withdraw tokens and if has debt

### constructor

```solidity
constructor(address _contractManagerAddress, address _rmAddress, address priceGetterAddress) public
```

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _contractManagerAddress | address | The address of the deployed role manager |
| _rmAddress | address | The address of the deployed role manager |
| priceGetterAddress | address |  |

### withdrawGovernance

```solidity
function withdrawGovernance() external
```

withdraws governance balance to governance treasury

### withdrawFoundation

```solidity
function withdrawFoundation() external
```

withdraws foundation balance to foundation wallet

### withdrawValidator

```solidity
function withdrawValidator() external
```

calculates validator earnings and withdraws calculated earning to validator's wallet

### withdrawJuror

```solidity
function withdrawJuror() external
```

calculates juror earnings and withdraws calculated earning to juror's wallet

### withdrawInstructor

```solidity
function withdrawInstructor() external
```

Allows instructers to withdraw individually.

### transferGovernanceRewards

```solidity
function transferGovernanceRewards(address _to, uint256 _amount) external
```

