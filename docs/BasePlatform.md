# Solidity API

## BasePlatform

### contractManager

```solidity
contract ContractManager contractManager
```

### instructorBalance

```solidity
mapping(address => uint256) instructorBalance
```

### instructorDebt

```solidity
mapping(address => uint256) instructorDebt
```

### isTokenBought

```solidity
mapping(address => mapping(uint256 => mapping(uint256 => bool))) isTokenBought
```

### foundationBalance

```solidity
uint256 foundationBalance
```

### governanceBalance

```solidity
uint256 governanceBalance
```

### stakingBalance

```solidity
uint256 stakingBalance
```

### jurorBalance

```solidity
uint256 jurorBalance
```

### jurorBalanceForRound

```solidity
uint256 jurorBalanceForRound
```

### validatorBalance

```solidity
uint256 validatorBalance
```

### validatorBalanceForRound

```solidity
uint256 validatorBalanceForRound
```

### distributionRound

```solidity
uint256 distributionRound
```

### payPerValidationScore

```solidity
mapping(uint256 => uint256) payPerValidationScore
```

### payPerJuror

```solidity
mapping(uint256 => uint256) payPerJuror
```

### lastValidatorClaim

```solidity
mapping(address => uint256) lastValidatorClaim
```

### lastJurorClaim

```solidity
mapping(address => uint256) lastJurorClaim
```

### udao

```solidity
contract IERC20 udao
```

### udaoc

```solidity
contract IUDAOC udaoc
```

### coachingFoundationCut

```solidity
uint256 coachingFoundationCut
```

### coachingGovernancenCut

```solidity
uint256 coachingGovernancenCut
```

### contentFoundationCut

```solidity
uint256 contentFoundationCut
```

### contentGovernancenCut

```solidity
uint256 contentGovernancenCut
```

### contentJurorCut

```solidity
uint256 contentJurorCut
```

### contentValidatorCut

```solidity
uint256 contentValidatorCut
```

### governanceTreasury

```solidity
address governanceTreasury
```

### foundationWallet

```solidity
address foundationWallet
```

### IVM

```solidity
contract IValidationManager IVM
```

### IJM

```solidity
contract IJurorManager IJM
```

### checkCoachingCuts

```solidity
modifier checkCoachingCuts()
```

Ensures the cut won't exceed %100

### checkContentCuts

```solidity
modifier checkContentCuts()
```

Ensures the cut won't exceed %100

### RewardsDistributed

```solidity
event RewardsDistributed(uint256 payPerValidationScore, uint256 payPerJurorPoint, uint256 newRoundId)
```

Triggered after every round is finalized and rewards are distributed

### CutsUpdated

```solidity
event CutsUpdated(uint256 coachFnd, uint256 coachGov, uint256 contentFnd, uint256 contentGov, uint256 contentJuror, uint256 contentValid)
```

This event is triggered if a cut is updated.

### constructor

```solidity
constructor(address _contractManager, address _rmAddress) internal
```

### setContractManagerAddress

```solidity
function setContractManagerAddress(address _newAddress) external
```

Sets the address of the contract manager

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _newAddress | address | New address of the contract manager |

### updateAddresses

```solidity
function updateAddresses() external
```

Get the updated addresses from contract manager

### setCoachingFoundationCut

```solidity
function setCoachingFoundationCut(uint256 _cut) external
```

changes cut from coaching for foundation

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _cut | uint256 | new cut (100000 -> 100% | 5000 -> 5%) |

### setCoachingGovernanceCut

```solidity
function setCoachingGovernanceCut(uint256 _cut) external
```

changes cut from coaching for governance

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _cut | uint256 | new cut (100000 -> 100% | 5000 -> 5%) |

### setContentFoundationCut

```solidity
function setContentFoundationCut(uint256 _cut) external
```

changes cut from content for foundation

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _cut | uint256 | new cut (100000 -> 100% | 5000 -> 5%) |

### setContentGovernanceCut

```solidity
function setContentGovernanceCut(uint256 _cut) external
```

changes cut from content for governance

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _cut | uint256 | new cut (100000 -> 100% | 5000 -> 5%) |

### setContentJurorCut

```solidity
function setContentJurorCut(uint256 _cut) external
```

changes cut from content for juror pool

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _cut | uint256 | new cut (100000 -> 100% | 5000 -> 5%) |

### setContentValidatorCut

```solidity
function setContentValidatorCut(uint256 _cut) external
```

changes cut from content for validator pool

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _cut | uint256 | new cut (100000 -> 100% | 5000 -> 5%) |

### distributeRewards

```solidity
function distributeRewards() external
```

distributes rewards for round
Gets balance accumulated this round and distributes it per point
for validators to claim it later.

