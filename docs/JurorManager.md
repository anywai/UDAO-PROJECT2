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
event DisputeResultSent(uint256 caseId, address juror, bool result)
```

### DisputeEnded

```solidity
event DisputeEnded(uint256 caseId, bool verdict)
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

### updateAddresses

```solidity
function updateAddresses() external
```

Get the updated addresses from contract manager

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

### setRequiredValidators

```solidity
function setRequiredValidators(uint128 _requiredJurors) external
```

sets required juror count per dispute

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _requiredJurors | uint128 | new required juror count |

### createDispute

```solidity
function createDispute(uint128 caseScope, string question, bool isTokenRelated, uint256 tokenId) external
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

### sendDisputeResult

```solidity
function sendDisputeResult(uint256 caseId, bool result) external
```

Allows jurors to send dipsute result

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| caseId | uint256 | id of the dispute |
| result | bool | result of validation |

### finalizeDispute

```solidity
function finalizeDispute(uint256 caseId) external
```

finalizes dispute if enough juror vote is sent

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| caseId | uint256 | id of the dispute |

### _checkJuror

```solidity
function _checkJuror(address[] _jurors) internal view
```

Makes sure if the end dispute caller is a juror participated in a certain case.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _jurors | address[] | list of jurors contained in voucher |

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

