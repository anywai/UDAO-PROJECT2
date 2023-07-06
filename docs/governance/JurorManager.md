# Solidity API

## JurorManager

### udaoc

```solidity
contract IUDAOC udaoc
```

### IVM

```solidity
contract IValidationManager IVM
```

### PT

```solidity
contract IPlatformTreasury PT
```

### contractManager

```solidity
contract ContractManager contractManager
```

### EndDispute

```solidity
event EndDispute(uint256 caseId, address[] jurors, uint256 totalJurorScore)
```

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

### AddressesUpdated

```solidity
event AddressesUpdated(address IRMAddress, address PTAddress)
```

### jurorScorePerRound

```solidity
mapping(address => mapping(uint256 => uint256)) jurorScorePerRound
```

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

### distributionRound

```solidity
uint256 distributionRound
```

### totalCaseScore

```solidity
uint256 totalCaseScore
```

### requiredJurors

```solidity
uint128 requiredJurors
```

### minRequiredAcceptVote

```solidity
uint128 minRequiredAcceptVote
```

### constructor

```solidity
constructor(address rmAddress, address udaocAddress, address ivmAddress) public
```

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| rmAddress | address | address of the role manager contract |
| udaocAddress | address |  |
| ivmAddress | address |  |

### setContractManager

```solidity
function setContractManager(address _contractManager) external
```

### setPlatformTreasury

```solidity
function setPlatformTreasury(address _platformTreasury) external
```

### updateAddresses

```solidity
function updateAddresses() external
```

Get the updated addresses from contract manager
TODO is this correct?

### Dispute

```solidity
struct Dispute {
  uint256 caseId;
  uint128 caseScope;
  uint128 voteCount;
  uint128 acceptVoteCount;
  address[] jurors;
  string question;
  mapping(address => bool) vote;
  mapping(address => bool) isVoted;
  bool verdict;
  bool isTokenRelated;
  uint256 tokenId;
  bool isRefundDispute;
  uint256 coachingId;
  bool isFinalized;
  uint256 resultDate;
  bytes _data;
}
```

### disputes

```solidity
struct JurorManager.Dispute[] disputes
```

### totalJurorScore

```solidity
uint256 totalJurorScore
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

### createDispute

```solidity
function createDispute(uint128 caseScope, string question, bool isTokenRelated, uint256 tokenId, bool isRefundDispute, uint256 coachingId) external
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

### _canAssignDispute

```solidity
function _canAssignDispute(uint256 caseId) internal view returns (bool)
```

_Checks if a juror was also validator of the content_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| caseId | uint256 | id of the dispute |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bool | true if the juror has not validated the content, false otherwise |

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

### finalizeDispute

```solidity
function finalizeDispute(uint256 caseId) external
```

finalizes dispute if enough juror vote is sent

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| caseId | uint256 | id of the dispute |

### nextRound

```solidity
function nextRound() external
```

Starts the new reward round

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

