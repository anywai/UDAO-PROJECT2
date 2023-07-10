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

### coachingGovernanceCut

```solidity
uint256 coachingGovernanceCut
```

### contentFoundationCut

```solidity
uint256 contentFoundationCut
```

### contentGovernanceCut

```solidity
uint256 contentGovernanceCut
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

### GovernanceTreasuryUpdated

```solidity
event GovernanceTreasuryUpdated(address newAddress)
```

This event is triggered if the governance treasury address is updated.

### FoundationWalletUpdated

```solidity
event FoundationWalletUpdated(address newAddress)
```

This event is triggered if the foundation wallet address is updated.

### ContractManagerUpdated

```solidity
event ContractManagerUpdated(address newAddress)
```

This event is triggered if the contract manager address is updated.

### AddressesUpdated

```solidity
event AddressesUpdated(address udao, address udaoc, address ivm, address ijm, address irm)
```

This event is triggered if the contract manager updates the addresses.

### constructor

```solidity
constructor(address _contractManager, address _rmAddress) internal
```

### setGovernanceTreasuryAddress

```solidity
function setGovernanceTreasuryAddress(address _newAddress) external
```

Sets the address of the governance treasury

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _newAddress | address | New address of the governance treasury |

### setFoundationWalletAddress

```solidity
function setFoundationWalletAddress(address _newAddress) external
```

Sets the address of the foundation wallet

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _newAddress | address | New address of the foundation wallet |

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
TODO Automate this process with sentinels?

