# Solidity API

## IUDAOVP

### mint

```solidity
function mint(address to, uint256 amount) external
```

### burnFrom

```solidity
function burnFrom(address account, uint256 amount) external
```

## UDAOStaker

### SIGNING_DOMAIN

```solidity
string SIGNING_DOMAIN
```

### SIGNATURE_VERSION

```solidity
string SIGNATURE_VERSION
```

### udao

```solidity
contract IERC20 udao
```

### udaovp

```solidity
contract IUDAOVP udaovp
```

### platformTreasury

```solidity
contract IPlatformTreasury platformTreasury
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

### applicationLockTime

```solidity
uint256 applicationLockTime
```

the lock duration for applications

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

### minimum_stake_days

```solidity
uint256 minimum_stake_days
```

the minimum duration for governance stake

### maximum_stake_days

```solidity
uint256 maximum_stake_days
```

the maximum duration for governance stake

### SetValidatorLockAmount

```solidity
event SetValidatorLockAmount(uint256 _newAmount)
```

Triggered when validator lock amount is updated

### SetJurorLockAmount

```solidity
event SetJurorLockAmount(uint256 _newAmount)
```

Triggered when juror lock amount is updated

### SetValidatorLockTime

```solidity
event SetValidatorLockTime(uint256 _newLockTime)
```

Triggered when validator lock time is updated

### SetJurorLockTime

```solidity
event SetJurorLockTime(uint256 _newLockTime)
```

Triggered when juror lock time is updated

### SetApplicationLockTime

```solidity
event SetApplicationLockTime(uint256 _newLockTime)
```

Triggered when application lock time is updated

### SetVoteReward

```solidity
event SetVoteReward(uint256 _newAmount)
```

Triggered when vote reward is updated

### SetPlatformTreasuryAddress

```solidity
event SetPlatformTreasuryAddress(address _newAddress)
```

Triggered when platform treasury address is updated

### RoleApplied

```solidity
event RoleApplied(uint256 _roleId, address _user, uint256 _lockAmount)
```

Triggered when any role is applied, roleId: 0 validator, 1 juror

### RoleApproved

```solidity
event RoleApproved(uint256 _roleId, address _user)
```

Triggered when any role is approved, roleId: 0 validator, 1 juror

### RoleRejected

```solidity
event RoleRejected(uint256 _roleId, address _user)
```

Triggered when any role is rejected, roleId: 0 validator, 1 juror

### ValidatorStakeWithdrawn

```solidity
event ValidatorStakeWithdrawn(address _validator, uint256 _amount)
```

Triggered when validator stake is withdrawn

### JurorStakeWithdrawn

```solidity
event JurorStakeWithdrawn(address _juror, uint256 _amount)
```

Triggered when juror stake is withdrawn

### GovernanceStake

```solidity
event GovernanceStake(address _member, uint256 _stakeAmount, uint256 _vpAmount)
```

Triggered when governance stake is added

### GovernanceStakeWithdraw

```solidity
event GovernanceStakeWithdraw(address _member, uint256 _unstakeAmount, uint256 _vpAmount)
```

Triggered when governance stake is withdrawn

### VoteRewardAdded

```solidity
event VoteRewardAdded(address _rewardee, uint256 _amount)
```

Triggered when vote reward is added to voters reward balance

### VoteRewardsWithdrawn

```solidity
event VoteRewardsWithdrawn(address _rewardee, uint256 _amount)
```

Triggered when vote reward is withdrawn

### SetMaximumStakeDays

```solidity
event SetMaximumStakeDays(uint256 _newAmount)
```

Triggered when governance maximum stake days is updated

### SetMinimumStakeDays

```solidity
event SetMinimumStakeDays(uint256 _newAmount)
```

Triggered when governance minimum stake days is updated

### validatorBalanceOf

```solidity
mapping(address => uint256) validatorBalanceOf
```

the balance of the validator

### jurorBalanceOf

```solidity
mapping(address => uint256) jurorBalanceOf
```

the balance of the juror

### activeApplicationForValidator

```solidity
mapping(address => bool) activeApplicationForValidator
```

if user has an active application for validator role

### activeApplicationForJuror

```solidity
mapping(address => bool) activeApplicationForJuror
```

if user has an active application for juror role

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

Governance lock array for each governance member

### rewardBalanceOf

```solidity
mapping(address => uint256) rewardBalanceOf
```

Reward balance of each governance member

### lastRewardBlock

```solidity
mapping(address => uint256) lastRewardBlock
```

Last reward block of each governance member TODO This is not used??

### voteReward

```solidity
uint256 voteReward
```

Reward given to each voter for each vote with respect to their voting power

### ValidatiorApplication

```solidity
struct ValidatiorApplication {
  address applicant;
  bool isFinished;
  uint256 expire;
}
```

### validatorApplications

```solidity
struct UDAOStaker.ValidatiorApplication[] validatorApplications
```

Array of validator applications

### validatiorApplicationIndex

```solidity
uint256 validatiorApplicationIndex
```

Validator application index, a simple counter

### validatorApplicationId

```solidity
mapping(address => uint256) validatorApplicationId
```

Validator application id for each validator

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

Array of juror applications

### jurorApplicationId

```solidity
mapping(address => uint256) jurorApplicationId
```

Juror application id for each juror

### caseApplicationIndex

```solidity
uint256 caseApplicationIndex
```

Juror application index, a simple counter

### totalVotingPower

```solidity
uint256 totalVotingPower
```

The total voting power of all governance members

### constructor

```solidity
constructor(address roleManagerAddress, address udaoAddress, address platformTreasuryAddress, address udaoVpAddress) public
```

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| roleManagerAddress | address | address of the role manager contract |
| udaoAddress | address | address of the udao token contract |
| platformTreasuryAddress | address | address of the platform treasury contract |
| udaoVpAddress | address | address of the udao voting power token contract |

### AddressesUpdated

```solidity
event AddressesUpdated(address RoleManagerAddress, address UdaoAddress, address PlatformTreasuryAddress, address UdaoVpAddress)
```

### updateAddresses

```solidity
function updateAddresses(address roleManagerAddress, address udaoAddress, address platformTreasuryAddress, address udaoVpAddress) external
```

Get the updated addresses from contract manager

### setValidatorLockAmount

```solidity
function setValidatorLockAmount(uint256 _amount) external
```

Allows admins to set validator lock amount

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _amount | uint256 | new amount that requried to be locked |

### setJurorLockAmount

```solidity
function setJurorLockAmount(uint256 _amount) external
```

Allows admins to set juror lock amount

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _amount | uint256 | new amount that requried to be locked |

### setValidatorLockTime

```solidity
function setValidatorLockTime(uint256 _lockTime) external
```

Allows admins to set validator lock time

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _lockTime | uint256 | is new lock time for validators |

### setJurorLockTime

```solidity
function setJurorLockTime(uint256 _lockTime) external
```

Allows admins to set juror lock time

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _lockTime | uint256 | is new lock time for jurors |

### setApplicationLockTime

```solidity
function setApplicationLockTime(uint256 _lockTime) external
```

Allows admins to set application lock time for role applications

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _lockTime | uint256 | is new lock time for role applications |

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
function setPlatformTreasuryAddress(address platformTreasuryAddress) external
```

sets the platform treasury address

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| platformTreasuryAddress | address | the address of the new platform treasury TODO remove this function and use updateAddresses instead |

### setMaximumStakeDays

```solidity
function setMaximumStakeDays(uint256 _maximum_stake_days) external
```

sets the maximum stake days for governance members

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _maximum_stake_days | uint256 | the new maximum stake days |

### setMinimumStakeDays

```solidity
function setMinimumStakeDays(uint256 _minimum_stake_days) external
```

sets the minimum stake days for governance members

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _minimum_stake_days | uint256 | the new minimum stake days |

### RoleVoucher

```solidity
struct RoleVoucher {
  address redeemer;
  uint256 validUntil;
  uint256 roleId;
  bytes signature;
}
```

### applyForValidator

```solidity
function applyForValidator() external
```

allows users to apply for validator role

### applyForJuror

```solidity
function applyForJuror() external
```

allows users to apply for juror role

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

### checkExpireDateValidator

```solidity
function checkExpireDateValidator(address _user) external view returns (uint256 expireDate)
```

Returns expire dates for validator

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _user | address | address of the user |

### checkExpireDateJuror

```solidity
function checkExpireDateJuror(address _user) external view returns (uint256 expireDate)
```

Returns expire dates for juror

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _user | address | address of the user |

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
function stakeForGovernance(uint256 _amount, uint256 _days) public
```

staking function to become a governance member

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _amount | uint256 | amount of UDAO token that will be staked |
| _days | uint256 | amount of days UDAO token that will be staked for |

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

### pause

```solidity
function pause() external
```

### unpause

```solidity
function unpause() external
```

