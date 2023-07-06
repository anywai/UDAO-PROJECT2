# Solidity API

## IUDAOStaker

### addVoteRewards

```solidity
function addVoteRewards(address voter) external
```

## UDAOGovernor

### stakingContract

```solidity
contract IUDAOStaker stakingContract
```

### constructor

```solidity
constructor(contract IVotes _token, contract TimelockController _timelock, address stakingContractAddress, address rmAddress) public
```

### _quorum

```solidity
uint256 _quorum
```

### setQuorum

```solidity
function setQuorum(uint256 newQuorum) external
```

### setStakingContract

```solidity
function setStakingContract(address stakingContractAddress) external
```

Allows backend to set the staking contract address.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| stakingContractAddress | address | Address to set to |

### _castVote

```solidity
function _castVote(uint256 proposalId, address account, uint8 support, string reason) internal returns (uint256)
```

_Internal vote casting mechanism: Check that the vote is pending, that it has not been cast yet, retrieve
voting weight using {IGovernor-getVotes} and call the {_countVote} internal function. Uses the _defaultParams().

Emits a {IGovernor-VoteCast} event._

### votingDelay

```solidity
function votingDelay() public view returns (uint256)
```

### votingPeriod

```solidity
function votingPeriod() public view returns (uint256)
```

### quorum

```solidity
function quorum(uint256 blockNumber) public view returns (uint256)
```

module:user-config

_Minimum number of cast voted required for a proposal to be successful.

Note: The `blockNumber` parameter corresponds to the snapshot used for counting vote. This allows to scale the
quorum depending on values such as the totalSupply of a token at this block (see {ERC20Votes})._

### state

```solidity
function state(uint256 proposalId) public view returns (enum IGovernor.ProposalState)
```

### proposalThreshold

```solidity
function proposalThreshold() public view returns (uint256)
```

### _execute

```solidity
function _execute(uint256 proposalId, address[] targets, uint256[] values, bytes[] calldatas, bytes32 descriptionHash) internal
```

### _cancel

```solidity
function _cancel(address[] targets, uint256[] values, bytes[] calldatas, bytes32 descriptionHash) internal returns (uint256)
```

### _executor

```solidity
function _executor() internal view returns (address)
```

### supportsInterface

```solidity
function supportsInterface(bytes4 interfaceId) public view returns (bool)
```

