# Solidity API

## IUDAOVP

### mint

```solidity
function mint(address to, uint256 amount) external
```

## UDAOStaker

### udao

```solidity
contract IERC20 udao
```

### udaovp

```solidity
contract IUDAOVP udaovp
```

### contractManager

```solidity
contract ContractManager contractManager
```

### platformTreasuryAddress

```solidity
address platformTreasuryAddress
```

### jurorLockTime

```solidity
uint256 jurorLockTime
```

the required duration to be a validator

### validatorLockTime

```solidity
uint256 validatorLockTime
```

the required duration to be a validator

### validatorLockAmount

```solidity
uint256 validatorLockAmount
```

Amount to deduct from validator application

### jurorLockAmount

```solidity
uint256 jurorLockAmount
```

Amount to deduct from juror application

### SetValidatorLockAmount

```solidity
event SetValidatorLockAmount(uint256 _newAmount)
```

### SetVoteReward

```solidity
event SetVoteReward(uint256 _newAmount)
```

### SetPlatformTreasuryAddress

```solidity
event SetPlatformTreasuryAddress(address _newAddress)
```

### RoleApplied

```solidity
event RoleApplied(uint256 _roleId, address _user, uint256 _jobAmount)
```

### RoleApproved

```solidity
event RoleApproved(uint256 _roleId, address _user)
```

### RoleRejected

```solidity
event RoleRejected(uint256 _roleId, address _user)
```

### ValidationAdded

```solidity
event ValidationAdded(uint256 _amount)
```

### CaseAdded

```solidity
event CaseAdded(uint256 _amount)
```

### ValidationRegistered

```solidity
event ValidationRegistered(address _validator, uint256 _validationId)
```

### CaseRegistered

```solidity
event CaseRegistered(address _juror, uint256 _caseId)
```

### ValidatorStakeWithdrawn

```solidity
event ValidatorStakeWithdrawn(address _validator, uint256 _amount)
```

### JobListingRegistered

```solidity
event JobListingRegistered(address corporate, uint256 amountPerListing)
```

### JobListingUnregistered

```solidity
event JobListingUnregistered(address corporate, uint256 listingId, uint256 amount)
```

### JurorStakeWithdrawn

```solidity
event JurorStakeWithdrawn(address _juror, uint256 _amount)
```

### GovernanceStake

```solidity
event GovernanceStake(address _member, uint256 _stakeAmount, uint256 _vpAmount)
```

### GovernanceStakeWithdraw

```solidity
event GovernanceStakeWithdraw(address _member, uint256 _unstakeAmount, uint256 _vpAmount)
```

### VoteRewardAdded

```solidity
event VoteRewardAdded(address _rewardee, uint256 _amount)
```

### VoteRewardsWithdrawn

```solidity
event VoteRewardsWithdrawn(address _rewardee, uint256 _amount)
```

### StakeForJobListing

```solidity
event StakeForJobListing(address corporateAddress, uint256 amount)
```

### UnstakeForJobListing

```solidity
event UnstakeForJobListing(address corporateAddress, uint256 amount)
```

### validationBalanceOf

```solidity
mapping(address => uint256) validationBalanceOf
```

### jurorBalanceOf

```solidity
mapping(address => uint256) jurorBalanceOf
```

### latestValidatorStakeId

```solidity
mapping(address => uint256) latestValidatorStakeId
```

### latestJurorStakeId

```solidity
mapping(address => uint256) latestJurorStakeId
```

### latestValidationLockId

```solidity
mapping(address => uint256) latestValidationLockId
```

### corporateStakePerListing

```solidity
uint256 corporateStakePerListing
```

### corporateStakedUDAO

```solidity
mapping(address => uint256) corporateStakedUDAO
```

### corporateLockedUDAO

```solidity
mapping(address => uint256) corporateLockedUDAO
```

### corporateActiveListingAmount

```solidity
mapping(address => uint256) corporateActiveListingAmount
```

### GovernanceLock

```solidity
struct GovernanceLock {
  uint256 expire;
  uint256 amount;
  uint256 vpamount;
}
```

### governanceStakes

```solidity
mapping(address => struct UDAOStaker.GovernanceLock[]) governanceStakes
```

### rewardBalanceOf

```solidity
mapping(address => uint256) rewardBalanceOf
```

### lastRewardBlock

```solidity
mapping(address => uint256) lastRewardBlock
```

### voteReward

```solidity
uint256 voteReward
```

### ValidationApplication

```solidity
struct ValidationApplication {
  address applicant;
  bool isSuper;
  bool isFinished;
  uint256 expire;
}
```

### validatorApplications

```solidity
struct UDAOStaker.ValidationApplication[] validatorApplications
```

### validatorApplicationId

```solidity
mapping(address => uint256) validatorApplicationId
```

### JurorApplication

```solidity
struct JurorApplication {
  address applicant;
  bool isFinished;
  uint256 expire;
}
```

### jurorApplications

```solidity
struct UDAOStaker.JurorApplication[] jurorApplications
```

### jurorApplicationId

```solidity
mapping(address => uint256) jurorApplicationId
```

### totalVotingPower

```solidity
uint256 totalVotingPower
```

### constructor

```solidity
constructor(address _platformTreasuryAddress, address rmAddress, address udaoVpAddress, address _contractManager) public
```

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _platformTreasuryAddress | address | address of the platform treasury contract |
| rmAddress | address | address of the role manager contract |
| udaoVpAddress | address |  |
| _contractManager | address | address of the contract manager |

### updateAddresses

```solidity
function updateAddresses() external
```

Get the updated addresses from contract manager

### setValidatorLockAmount

```solidity
function setValidatorLockAmount(uint256 _amount) external
```

set the required lock amount for validators

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _amount | uint256 | new amount that requried to be locked |

### setVoteReward

```solidity
function setVoteReward(uint256 _reward) external
```

sets the vote reward given when governance member votes

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _reward | uint256 | new amount of reward |

### setPlatformTreasuryAddress

```solidity
function setPlatformTreasuryAddress(address _platformTreasuryAddress) external
```

sets the platform treasury address

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _platformTreasuryAddress | address | the address of the new platform treasury |

### RoleVoucher

```solidity
struct RoleVoucher {
  address redeemer;
  uint256 validUntil;
  uint256 roleId;
  bytes signature;
}
```

### CorporateWithdrawVoucher

```solidity
struct CorporateWithdrawVoucher {
  address redeemer;
  uint256 amount;
}
```

### GovernanceStakeVoucher

```solidity
struct GovernanceStakeVoucher {
  address staker;
  uint256 amount;
  uint256 _days;
}
```

### applyForValidator

```solidity
function applyForValidator() external
```

allows users to apply for validator role

### applyForSuperValidator

```solidity
function applyForSuperValidator() external
```

Allows validators to apply for super validator role

### applyForJuror

```solidity
function applyForJuror(uint256 caseAmount) external
```

allows users to apply for juror role

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| caseAmount | uint256 | The amount of cases that a juror wants to do |

### getApproved

```solidity
function getApproved(struct UDAOStaker.RoleVoucher voucher) external
```

Users can use this function and assign validator or juror roles to themselves

### rejectApplication

```solidity
function rejectApplication(address _applicant, uint256 roleId) external
```

Allows backend to reject role assignment application

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _applicant | address | The address of the applicant |
| roleId | uint256 |  |

### withdrawValidatorStake

```solidity
function withdrawValidatorStake() public
```

allows validators to withdraw their staked tokens

### _withdrawValidator

```solidity
function _withdrawValidator(address to, uint256 withdrawableBalance) internal
```

Withdraws desired amounts of tokens to "to" address

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| to | address | address of the redeemer of the tokens |
| withdrawableBalance | uint256 | amount of tokens that will be withdrawn |

### withdrawJurorStake

```solidity
function withdrawJurorStake() public
```

allows jurors to withdraw their staked tokens

### _withdrawJuror

```solidity
function _withdrawJuror(address to, uint256 withdrawableBalance) internal
```

Withdraws desired amounts of tokens to "to" address

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| to | address | address of the redeemer of the tokens |
| withdrawableBalance | uint256 | amount of tokens that will be withdrawn |

### withdrawableValidatorStake

```solidity
function withdrawableValidatorStake() public view returns (uint256)
```

Returns the amount of token a validator could withdraw

### stakeForGovernance

```solidity
function stakeForGovernance(struct UDAOStaker.GovernanceStakeVoucher voucher) public
```

staking function to become a governance member

### withdrawGovernanceStake

```solidity
function withdrawGovernanceStake(uint256 _amount) public
```

withdraw function for released UDAO tokens

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _amount | uint256 | amount of UDAO token that will be unstaked |

### addVoteRewards

```solidity
function addVoteRewards(address voter) external
```

add vote reward to voters reward count

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| voter | address | address of the voter |

### withdrawRewards

```solidity
function withdrawRewards() external
```

withdraws reward earned from voting

### stakeForJobListing

```solidity
function stakeForJobListing(uint256 amount) external
```

Allows corporate accounts to stake. Staker and staked amount returned with event.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| amount | uint256 | The amount of stake |

### corporateListingId

```solidity
mapping(address => mapping(uint256 => uint256)) corporateListingId
```

### corporateLatestListingId

```solidity
mapping(address => uint256) corporateLatestListingId
```

### registerJobListing

```solidity
function registerJobListing(uint256 jobListingCount) external
```

### unregisterJobListing

```solidity
function unregisterJobListing(uint256 listingId) external
```

### _hashRole

```solidity
function _hashRole(struct UDAOStaker.RoleVoucher voucher) internal view returns (bytes32)
```

Returns a hash of the given ContentVoucher, prepared using EIP712 typed data hashing rules.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| voucher | struct UDAOStaker.RoleVoucher | A ContentVoucher to hash. |

### getChainID

```solidity
function getChainID() external view returns (uint256)
```

Returns the chain id of the current blockchain.

_This is used to workaround an issue with ganache returning different values from the on-chain chainid() function and
 the eth_chainId RPC method. See https://github.com/protocol/nft-website/issues/121 for context._

### _verifyRole

```solidity
function _verifyRole(struct UDAOStaker.RoleVoucher voucher) internal view returns (address)
```

Verifies the signature for a given ContentVoucher, returning the address of the signer.

_Will revert if the signature is invalid. Does not verify that the signer is authorized to mint NFTs._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| voucher | struct UDAOStaker.RoleVoucher | A ContentVoucher describing an unminted NFT. |

