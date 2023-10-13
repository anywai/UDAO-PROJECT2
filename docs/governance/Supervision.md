# Solidity API

## IStakingContract

### checkExpireDateValidator

```solidity
function checkExpireDateValidator(address _user) external view returns (uint256 expireDate)
```

### checkExpireDateJuror

```solidity
function checkExpireDateJuror(address _user) external view returns (uint256 expireDate)
```

## Supervision

### udaoc

```solidity
contract IUDAOC udaoc
```

### PT

```solidity
contract IPlatformTreasury PT
```

### staker

```solidity
contract IStakingContract staker
```

### roleManager

```solidity
contract IRoleManager roleManager
```

### contractManager

```solidity
contract ContractManager contractManager
```

### EndDispute

```solidity
event EndDispute(uint256 caseId, address[] jurors, uint256 totalJurorScore)
```

_Events_

### NextRound

```solidity
event NextRound(uint256 newRoundId)
```

### DisputeCreated

```solidity
event DisputeCreated(uint256 caseId, uint256 caseScope, string question)
```

### DisputeAssigned

```solidity
event DisputeAssigned(uint256 caseId, address juror)
```

### DisputeResultSent

```solidity
event DisputeResultSent(uint256 caseId, bool result, address juror)
```

### DisputeEnded

```solidity
event DisputeEnded(uint256 caseId, bool verdict)
```

### LateJurorScoreRecorded

```solidity
event LateJurorScoreRecorded(uint256 caseId, address juror)
```

### AddressesUpdated

```solidity
event AddressesUpdated(address IRMAddress, address PTAddress)
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

### ValidatorRemovedFromValidation

```solidity
event ValidatorRemovedFromValidation(uint256 tokenId, address validator, uint256 validationId)
```

### JurorRemovedFromDispute

```solidity
event JurorRemovedFromDispute(uint256 caseId, address juror, uint256 disputeId)
```

### ValidationEnded

```solidity
event ValidationEnded(uint256 tokenId, uint256 validationId, bool result)
```

### jurorScorePerRound

```solidity
mapping(address => mapping(uint256 => uint256)) jurorScorePerRound
```

_MAPPINGS_

### activeDispute

```solidity
mapping(address => uint256) activeDispute
```

### successfulDispute

```solidity
mapping(address => uint256) successfulDispute
```

### unsuccessfulDispute

```solidity
mapping(address => uint256) unsuccessfulDispute
```

### isValidated

```solidity
mapping(uint256 => uint256) isValidated
```

### latestValidationOfToken

```solidity
mapping(uint256 => uint256) latestValidationOfToken
```

### validatorScorePerRound

```solidity
mapping(address => mapping(uint256 => uint256)) validatorScorePerRound
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

### objectionCount

```solidity
mapping(uint256 => uint256) objectionCount
```

### Dispute

```solidity
struct Dispute {
  uint256 caseId;
  uint128 caseScope;
  uint128 voteCount;
  uint128 acceptVoteCount;
  uint128 rejectVoteCount;
  address[] jurors;
  string question;
  mapping(address => bool) vote;
  mapping(address => bool) isVoted;
  bool verdict;
  bool isTokenRelated;
  uint256 tokenId;
  uint256 coachingId;
  bool isFinalized;
  uint256 resultDate;
  address targetContract;
  bytes data;
}
```

### disputes

```solidity
struct Supervision.Dispute[] disputes
```

### Validation

```solidity
struct Validation {
  uint256 id;
  uint256 tokenId;
  uint8 validationCount;
  address[] validators;
  uint256 acceptVoteCount;
  uint256 rejectVoteCount;
  bool finalValidationResult;
  mapping(address => bool) vote;
  mapping(address => bool) isVoted;
  uint256 resultDate;
  uint256 validationScore;
  uint256 validatorScore;
  bool isFinalized;
}
```

### validations

```solidity
struct Supervision.Validation[] validations
```

### distributionRound

```solidity
uint256 distributionRound
```

_Variables_

### totalCaseScore

```solidity
uint256 totalCaseScore
```

### requiredJurors

```solidity
uint128 requiredJurors
```

### minMajortyVote

```solidity
uint128 minMajortyVote
```

### totalJurorScore

```solidity
uint256 totalJurorScore
```

### requiredValidators

```solidity
uint128 requiredValidators
```

### minAcceptVoteValidation

```solidity
uint128 minAcceptVoteValidation
```

### totalValidationScore

```solidity
uint256 totalValidationScore
```

_is used during the calculation of a validator score_

### maxObjection

```solidity
uint256 maxObjection
```

### constructor

```solidity
constructor(address rmAddress, address udaocAddress) public
```

_Constructor_

### setContractManager

```solidity
function setContractManager(address _contractManager) external
```

_Setters_

### setPlatformTreasury

```solidity
function setPlatformTreasury(address _platformTreasury) external
```

### checkApplicationN

```solidity
function checkApplicationN(address _user) public view returns (uint256)
```

### setRequiredJurors

```solidity
function setRequiredJurors(uint128 _requiredJurors) external
```

TODO Wth is this function.
sets required juror count per dispute

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _requiredJurors | uint128 | new required juror count |

### setUDAOC

```solidity
function setUDAOC(address udaocAddress) external
```

### setAddressStaking

```solidity
function setAddressStaking(address stakerAddress) external
```

creates a validation for a token

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| stakerAddress | address | address of staking contract |

### setRequiredValidators

```solidity
function setRequiredValidators(uint128 _requiredValidators) external
```

sets required validator vote count per content

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _requiredValidators | uint128 | new required vote count |

### setMaxObjectionCount

```solidity
function setMaxObjectionCount(uint256 _maxObjection) external
```

sets maximum objection count per latest validation

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _maxObjection | uint256 | new objection count |

### getCaseResults

```solidity
function getCaseResults(address account) external view returns (uint256[2] results)
```

returns successful and unsuccessful case count of the account

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| account | address | wallet address of the account that wanted to be checked |

### getJurorScore

```solidity
function getJurorScore(address _juror, uint256 _round) external view returns (uint256)
```

Returns the score of a juror for a speficied round

### getTotalJurorScore

```solidity
function getTotalJurorScore() external view returns (uint256)
```

returns total juror scores

### getValidatorsOfVal

```solidity
function getValidatorsOfVal(uint256 validationId) public view returns (address[])
```

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

### getIsValidated

```solidity
function getIsValidated(uint256 tokenId) external view returns (uint256)
```

Returns the validation result of a token

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| tokenId | uint256 | The ID of a token |

### getLatestValidationIdOfToken

```solidity
function getLatestValidationIdOfToken(uint256 tokenId) public view returns (uint256)
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

### createDispute

```solidity
function createDispute(uint128 caseScope, string question, bool isTokenRelated, uint256 tokenId, bytes _data, address _targetContract) external
```

starts new dispute case

### assignDispute

```solidity
function assignDispute(uint256 caseId) external
```

assign a dispute to self

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| caseId | uint256 | id of the dispute |

### _wasntTheValidator

```solidity
function _wasntTheValidator(uint256 caseId, address juror) internal view returns (bool)
```

_Checks if a juror was also validator of the content_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| caseId | uint256 | id of the dispute |
| juror | address | address of the juror |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bool | true if the juror was not the validator of the content, false otherwise |

### _wasntTheOwner

```solidity
function _wasntTheOwner(uint256 caseId, address juror) internal view returns (bool)
```

_Checks if a juror is the owner of the content_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| caseId | uint256 | id of the dispute |
| juror | address | address of the juror |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bool | true if the juror was not the owner of the content, false otherwise |

### sendDisputeResult

```solidity
function sendDisputeResult(uint256 caseId, bool result) external
```

Allows jurors to send dipsute result

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| caseId | uint256 | id of the dispute |
| result | bool | result of dispute |

### _finalizeDispute

```solidity
function _finalizeDispute(uint256 caseId) internal
```

finalizes dispute if last dispute result is sent

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| caseId | uint256 | id of the dispute |

### _recordJurorScores

```solidity
function _recordJurorScores(uint256 caseId) internal
```

record juror score

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| caseId | uint256 | id of the dispute |

### _recordLateJurorScore

```solidity
function _recordLateJurorScore(uint256 caseId, address juror) internal
```

record late coming juror score

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| caseId | uint256 | id of the dispute |
| juror | address | address of the juror |

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

finalizes validation if enough validation is sent

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| validationId | uint256 | id of the validation |

### dismissValidation

```solidity
function dismissValidation(address demissionAddress) external
```

allows validators to be fired or resigned

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| demissionAddress | address | is the address that will be revoked from validator role |

### removeValidatorFromValidation

```solidity
function removeValidatorFromValidation(address demissionAddress) internal
```

allows validators to dismiss a validation assignment

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| demissionAddress | address | id of the content that will be dismissed |

### dismissDispute

```solidity
function dismissDispute(address demissionAddress) external
```

allows validators to dismiss a validation assignment

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| demissionAddress | address | id of the content that will be dismissed |

### removeJurorFromDispute

```solidity
function removeJurorFromDispute(address demissionAddress) internal
```

allows validators to dismiss a validation assignment

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| demissionAddress | address | id of the content that will be dismissed |

### createValidation

```solidity
function createValidation(uint256 tokenId, uint256 score) external
```

starts new validation for content

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| tokenId | uint256 | id of the content that will be validated |
| score | uint256 | validation score of the content |

### objectToLatestValidation

```solidity
function objectToLatestValidation(uint256 tokenId) external
```

re-creates validation for unchanged content if it is invalidated for no valid reason

### assignValidation

```solidity
function assignValidation(uint256 validationId) external
```

assign validation to self

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| validationId | uint256 | id of the validation |

### setValidationStatus

```solidity
function setValidationStatus(uint256 tokenId, uint256 status) external
```

### nextRound

```solidity
function nextRound() external
```

Starts the new reward round

_Common functions_

### updateAddresses

```solidity
function updateAddresses() external
```

Get the updated addresses from contract manager
TODO is this correct?

### pause

```solidity
function pause() external
```

### unpause

```solidity
function unpause() external
```

