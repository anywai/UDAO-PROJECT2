# Solidity API

## IStakingContract

### registerValidation

```solidity
function registerValidation(uint256 validationId) external
```

## ValidationManager

### udaoc

```solidity
contract IUDAOC udaoc
```

### staker

```solidity
contract IStakingContract staker
```

### constructor

```solidity
constructor(address udaocAddress, address irmAddress) public
```

### ValidationCreated

```solidity
event ValidationCreated(uint256 tokenId, uint256 validationId)
```

### ValidationAssigned

```solidity
event ValidationAssigned(uint256 tokenId, uint256 validationId, address validator)
```

### ValidationResultSent

```solidity
event ValidationResultSent(uint256 tokenId, uint256 validationId, address validator, bool result)
```

### ValidationEnded

```solidity
event ValidationEnded(uint256 tokenId, uint256 validationId, bool result)
```

### NextRound

```solidity
event NextRound(uint256 newRoundId)
```

### isValidated

```solidity
mapping(uint256 => bool) isValidated
```

### latestValidationOfToken

```solidity
mapping(uint256 => uint256) latestValidationOfToken
```

### Validation

```solidity
struct Validation {
  uint256 id;
  uint256 tokenId;
  uint8 validationCount;
  address[] validators;
  uint256 acceptVoteCount;
  bool finalValidationResult;
  mapping(address => bool) vote;
  mapping(address => bool) isVoted;
  uint256 resultDate;
  uint256 validationScore;
  uint256 validatorScore;
}
```

### requiredValidators

```solidity
uint128 requiredValidators
```

### minRequiredAcceptVote

```solidity
uint128 minRequiredAcceptVote
```

### validatorScorePerRound

```solidity
mapping(address => mapping(uint256 => uint256)) validatorScorePerRound
```

### validations

```solidity
struct ValidationManager.Validation[] validations
```

### getValidatorsOfVal

```solidity
function getValidatorsOfVal(uint256 validationId) external view returns (address[])
```

### validationCount

```solidity
mapping(address => uint256) validationCount
```

### activeValidation

```solidity
mapping(address => uint256) activeValidation
```

### isInDispute

```solidity
mapping(address => bool) isInDispute
```

### successfulValidation

```solidity
mapping(address => uint256) successfulValidation
```

### unsuccessfulValidation

```solidity
mapping(address => uint256) unsuccessfulValidation
```

### distributionRound

```solidity
uint256 distributionRound
```

### totalValidationScore

```solidity
uint256 totalValidationScore
```

_is used during the calculation of a validator score_

### setUDAOC

```solidity
function setUDAOC(address udaocAddress) external
```

### setStaker

```solidity
function setStaker(address stakerAddress) external
```

creates a validation for a token

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| stakerAddress | address | address of staking contract |

### sendValidation

```solidity
function sendValidation(uint256 validationId, bool result) external
```

Sends validation result of validator to blockchain

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| validationId | uint256 | id of validation |
| result | bool | result of validation |

### finalizeValidation

```solidity
function finalizeValidation(uint256 validationId) external
```

### dismissValidation

```solidity
function dismissValidation(uint256 validationId) external
```

### setRequiredValidators

```solidity
function setRequiredValidators(uint128 _requiredValidators) external
```

sets required validator vote count per content

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _requiredValidators | uint128 | new required vote count |

### createValidation

```solidity
function createValidation(uint256 tokenId, uint256 score) external
```

starts new validation for content

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| tokenId | uint256 | id of the content that will be validated TODO 1 token aynı anda sadece 1 validasyonda olabilir TODO kontent sahibine eğer validasyon başlamadıysa önceki validasyonu iptal etme hakkı verilebilir TODO voucher eklendikten sonra score silinmeli buradan |
| score | uint256 |  |

### getValidationResults

```solidity
function getValidationResults(address account) external view returns (uint256[2] results)
```

returns successful and unsuccessful validation count of the account

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| account | address | wallet address of the account that wanted to be checked |

### getTotalValidationScore

```solidity
function getTotalValidationScore() external view returns (uint256)
```

returns total successful validation count

### openDispute

```solidity
function openDispute(uint256 validationId) external
```

Only foundation can open a dispute after enough off-chain dispute reports gathered from users.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| validationId | uint256 | id of the validation |

### endDispute

```solidity
function endDispute(uint256 validationId, bool result) external
```

ends dispute

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| validationId | uint256 | id of the validation |
| result | bool | result of the dispute |

### assignValidation

```solidity
function assignValidation(uint256 validationId) external
```

assign validation to self

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| validationId | uint256 | id of the validation |

### getIsValidated

```solidity
function getIsValidated(uint256 tokenId) external view returns (bool)
```

Returns the validation result of a token

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| tokenId | uint256 | The ID of a token |

### getLatestValidationIdOfToken

```solidity
function getLatestValidationIdOfToken(uint256 tokenId) external view returns (uint256)
```

Returns the validation result of a token

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| tokenId | uint256 | The ID of a token |

### getValidatorScore

```solidity
function getValidatorScore(address _validator, uint256 _round) external view returns (uint256)
```

Returns the score of a validator for a specific round

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _validator | address | The address of the validator |
| _round | uint256 | Reward round ID |

### nextRound

```solidity
function nextRound() external
```

Starts the new reward round

