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

## ContentManager

### ForcedPayment

```solidity
event ForcedPayment(uint256 _coachingId, address forcedBy)
```

triggered if coaching service payment to the instructor is forced

### Refund

```solidity
event Refund(uint256 _coachingId, address forcedBy, uint256 totalPaymentAmount)
```

triggered when any kind of refund is done

### CoachingBought

```solidity
event CoachingBought(address learner, uint256 tokenId, uint256 coachingId)
```

triggered when coaching bought

### CoachingFinalized

```solidity
event CoachingFinalized(uint256 coachingId, address coach, address learner)
```

triggered when coaching finalized

### DeadlineDelayed

```solidity
event DeadlineDelayed(uint256 coachingId, uint256 newDeadline)
```

triggered when coaching deadline delayed

### ContentBought

```solidity
event ContentBought(uint256 tokenId, uint256[] parts, uint256 pricePaid, address buyer)
```

triggered when content bought

### ContentPurchaseVoucher

```solidity
struct ContentPurchaseVoucher {
  uint256 tokenId;
  bool fullContentPurchase;
  uint256[] purchasedParts;
  address redeemer;
  address giftReceiver;
}
```

### ContentDiscountVoucher

```solidity
struct ContentDiscountVoucher {
  uint256 tokenId;
  bool fullContentPurchase;
  uint256[] purchasedParts;
  uint256 priceToPay;
  uint256 validUntil;
  address redeemer;
  address giftReceiver;
  bytes signature;
}
```

### CoachingPurchaseVoucher

```solidity
struct CoachingPurchaseVoucher {
  uint256 tokenId;
  uint256 priceToPay;
  bool isRefundable;
  address redeemer;
}
```

### ownedContents

```solidity
mapping(address => uint256[][]) ownedContents
```

### studentList

```solidity
mapping(uint256 => address[]) studentList
```

### CoachingStruct

```solidity
struct CoachingStruct {
  address coach;
  address learner;
  uint256 moneyLockDeadline;
  uint256 coachingPaymentAmount;
  uint8 isDone;
  uint256 totalPaymentAmount;
  bool isRefundable;
}
```

### coachingIdsOfToken

```solidity
mapping(uint256 => uint256[]) coachingIdsOfToken
```

### coachingStructs

```solidity
mapping(uint256 => struct ContentManager.CoachingStruct) coachingStructs
```

### constructor

```solidity
constructor() internal
```

### buyContent

```solidity
function buyContent(struct ContentManager.ContentPurchaseVoucher voucher) external
```

allows users to purchase a content

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| voucher | struct ContentManager.ContentPurchaseVoucher | voucher for the content purchase |

### buyDiscountedContent

```solidity
function buyDiscountedContent(struct ContentManager.ContentDiscountVoucher voucher) external
```

allows users to purchase a content

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| voucher | struct ContentManager.ContentDiscountVoucher | voucher for the content purchase |

### _updateOwned

```solidity
function _updateOwned(uint256 tokenId, uint256 purchasedPart, address contentReceiver) internal
```

an internal function to update owned contents of the user

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| tokenId | uint256 | id of the token that bought (completely of partially) |
| purchasedPart | uint256 | purchased part of the content (all of the content if 0) |
| contentReceiver | address | content receiver |

### buyCoaching

```solidity
function buyCoaching(struct ContentManager.CoachingPurchaseVoucher voucher) external
```

Allows users to buy coaching service.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| voucher | struct ContentManager.CoachingPurchaseVoucher | voucher for the coaching purchase |

### finalizeCoaching

```solidity
function finalizeCoaching(uint256 _coachingId) external
```

Allows both parties to finalize coaching service.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _coachingId | uint256 | The ID of the coaching service |

### delayDeadline

```solidity
function delayDeadline(uint256 _coachingId) external
```

@notice The learner or the coach could delay the service payment
 deadline in the last 3 days of the deadline
 @param _coachingId id of the coaching service

### forcedPayment

```solidity
function forcedPayment(uint256 _coachingId) external
```

Payment and coaching service can be forcefully done by administrator_roles

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _coachingId | uint256 | id of the coaching service |

### forcedPaymentJuror

```solidity
function forcedPaymentJuror(uint256 _coachingId) external
```

Payment and coaching service can be forcefully done by jurors

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _coachingId | uint256 | id of the coaching service |

### refund

```solidity
function refund(uint256 _coachingId) external
```

refunds the coaching service callable by coach

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _coachingId | uint256 | id of the coaching service |

### forcedRefundAdmin

```solidity
function forcedRefundAdmin(uint256 _coachingId) external
```

forces refund of coaching service only be callable by administrator_role (FOUNDATION_ROLE, GOVERNANCE_ROLE)

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _coachingId | uint256 | id of the coaching service |

### forcedRefundJuror

```solidity
function forcedRefundJuror(uint256 _coachingId) external
```

Jurors can force refund of a coaching service

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _coachingId | uint256 | The ID of the coaching service |

### getCoachings

```solidity
function getCoachings(uint256 _tokenId) external view returns (uint256[])
```

returns coaching informations of token

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _tokenId | uint256 | id of token that coaching will be returned |

### getOwnedContent

```solidity
function getOwnedContent(address _owner) public view returns (uint256[][])
```

returns owned contents of the _owner

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _owner | address | address of the user that will owned contents be returned |

### getStudentListOfToken

```solidity
function getStudentListOfToken(uint256 tokenId) public view returns (address[])
```

Returns the buyers of a coaching service for a token

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| tokenId | uint256 | The token ID of a course of a coaching service |

### getChainID

```solidity
function getChainID() external view returns (uint256)
```

Returns the chain id of the current blockchain.

_This is used to workaround an issue with ganache returning different values from the on-chain chainid() function and
 the eth_chainId RPC method. See https://github.com/protocol/nft-website/issues/121 for context._

### _hash

```solidity
function _hash(struct ContentManager.ContentDiscountVoucher voucher) internal view returns (bytes32)
```

Returns a hash of the given ContentDiscountVoucher, prepared using EIP712 typed data hashing rules.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| voucher | struct ContentManager.ContentDiscountVoucher | A ContentDiscountVoucher to hash. |

### _verify

```solidity
function _verify(struct ContentManager.ContentDiscountVoucher voucher) internal view returns (address)
```

Verifies the signature for a given ContentDiscountVoucher, returning the address of the signer.

_Will revert if the signature is invalid._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| voucher | struct ContentManager.ContentDiscountVoucher | A ContentDiscountVoucher describing a content access rights. |

## ContractManager

### StakingContractAddress

```solidity
address StakingContractAddress
```

_Below should be set after the deployment_

### PlatformTreasuryAddress

```solidity
address PlatformTreasuryAddress
```

### UdaoVpAddress

```solidity
address UdaoVpAddress
```

### IVMAddress

```solidity
address IVMAddress
```

_Below needs to be set during deployment_

### IJMAddress

```solidity
address IJMAddress
```

### UdaoAddress

```solidity
address UdaoAddress
```

### UdaocAddress

```solidity
address UdaocAddress
```

### IrmAddress

```solidity
address IrmAddress
```

### constructor

```solidity
constructor(address _vmAddress, address _jmAddress, address _udaoAddress, address _udaocAddress, address _irmAddress) public
```

### setPlatformTreasuryAddress

```solidity
function setPlatformTreasuryAddress(address _platformTreasuryAddress) external
```

### setAddressIVM

```solidity
function setAddressIVM(address _vmAddress) external
```

### setAddressStaking

```solidity
function setAddressStaking(address _stakingAddress) external
```

### setAddressUdaoVp

```solidity
function setAddressUdaoVp(address _udaoVpAddress) external
```

### setAddressIJMAddress

```solidity
function setAddressIJMAddress(address _jmAddress) external
```

### setAddressUdaoAddress

```solidity
function setAddressUdaoAddress(address _udaoAddress) external
```

### setAddressUdaocAddress

```solidity
function setAddressUdaocAddress(address _udaocAddress) external
```

### setAddressIrmAddress

```solidity
function setAddressIrmAddress(address _irmAddress) external
```

## IJurorManager

### getJurorScore

```solidity
function getJurorScore(address _juror, uint256 _round) external view returns (uint256)
```

### getTotalJurorScore

```solidity
function getTotalJurorScore() external view returns (uint256)
```

### nextRound

```solidity
function nextRound() external
```

## IRoleManager

### checkRole

```solidity
function checkRole(bytes32 roles, address account) external view
```

### checkRoles

```solidity
function checkRoles(bytes32[] roles, address account) external view
```

### isKYCed

```solidity
function isKYCed(address _address) external view returns (bool)
```

### isBanned

```solidity
function isBanned(address _address) external view returns (bool)
```

### grantRoleStaker

```solidity
function grantRoleStaker(bytes32 role, address user) external
```

### revokeRoleStaker

```solidity
function revokeRoleStaker(bytes32 role, address user) external
```

## IUDAOC

### hasRole

```solidity
function hasRole(bytes32 role, address account) external view returns (bool)
```

### getValidationResults

```solidity
function getValidationResults(address account) external view returns (uint256[2] results)
```

### getTotalValidation

```solidity
function getTotalValidation() external view returns (uint256)
```

### exists

```solidity
function exists(uint256 tokenId) external view returns (bool)
```

### isCoachingEnabled

```solidity
function isCoachingEnabled(uint256 tokenId) external view returns (bool)
```

### getPriceContent

```solidity
function getPriceContent(uint256 tokenId, uint256 partId) external view returns (uint256)
```

### getPartNumberOfContent

```solidity
function getPartNumberOfContent(uint256 tokenId) external view returns (uint256)
```

## IValidationManager

### getIsValidated

```solidity
function getIsValidated(uint256 tokenId) external view returns (bool)
```

### getValidatorScore

```solidity
function getValidatorScore(address _validator, uint256 _round) external view returns (uint256)
```

### getTotalValidationScore

```solidity
function getTotalValidationScore() external view returns (uint256)
```

### nextRound

```solidity
function nextRound() external
```

### getValidatorsOfVal

```solidity
function getValidatorsOfVal(uint256 validationId) external view returns (address[])
```

### getLatestValidationIdOfToken

```solidity
function getLatestValidationIdOfToken(uint256 tokenId) external view returns (uint256)
```

## PlatformTreasury

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
constructor(address _contractManagerAddress, address _rmAddress) public
```

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _contractManagerAddress | address | The address of the deployed role manager |
| _rmAddress | address | The address of the deployed role manager |

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

## RoleController

### VALIDATOR_ROLE

```solidity
bytes32 VALIDATOR_ROLE
```

### SUPER_VALIDATOR_ROLE

```solidity
bytes32 SUPER_VALIDATOR_ROLE
```

### BACKEND_ROLE

```solidity
bytes32 BACKEND_ROLE
```

### FOUNDATION_ROLE

```solidity
bytes32 FOUNDATION_ROLE
```

### STAKING_CONTRACT

```solidity
bytes32 STAKING_CONTRACT
```

### GOVERNANCE_ROLE

```solidity
bytes32 GOVERNANCE_ROLE
```

### JUROR_ROLE

```solidity
bytes32 JUROR_ROLE
```

### JUROR_CONTRACT

```solidity
bytes32 JUROR_CONTRACT
```

### TREASURY_CONTRACT

```solidity
bytes32 TREASURY_CONTRACT
```

### VALIDATION_MANAGER

```solidity
bytes32 VALIDATION_MANAGER
```

### CORPORATE_ROLE

```solidity
bytes32 CORPORATE_ROLE
```

### validator_roles

```solidity
bytes32[] validator_roles
```

Role group for validators

### administrator_roles

```solidity
bytes32[] administrator_roles
```

Role group for administrator roles

### IRM

```solidity
contract IRoleManager IRM
```

### onlyRole

```solidity
modifier onlyRole(bytes32 role)
```

onlyRole is used to check if the msg.sender has the a role required to call that function

### onlyRoles

```solidity
modifier onlyRoles(bytes32[] roles)
```

onlyRole is used to check if the msg.sender has one of the roles required to call that function

### constructor

```solidity
constructor(address rmAddress) internal
```

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| rmAddress | address | The address of the deployed role manager |

### pause

```solidity
function pause() public
```

pauses function

### unpause

```solidity
function unpause() public
```

unpauses function

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

## RoleManager

### BACKEND_ROLE

```solidity
bytes32 BACKEND_ROLE
```

### STAKING_CONTRACT

```solidity
bytes32 STAKING_CONTRACT
```

### KYCList

```solidity
mapping(address => bool) KYCList
```

### BanList

```solidity
mapping(address => bool) BanList
```

### SetKYC

```solidity
event SetKYC(address user, bool result)
```

events fired when a KYC or Ban is set

### SetBan

```solidity
event SetBan(address user, bool result)
```

### constructor

```solidity
constructor() public
```

Deployer gets the admin role.

### checkRole

```solidity
function checkRole(bytes32 role, address account) external view
```

Used for checking if the given account has the asked role

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| role | bytes32 | The name of the role to check |
| account | address | The address of the account to check |

### checkRoles

```solidity
function checkRoles(bytes32[] roles, address account) external view
```

Used for checking if given account has given multiple roles

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| roles | bytes32[] | The name of the roles to check |
| account | address | The address of the account to check |

### _checkRoles

```solidity
function _checkRoles(bytes32[] roles, address account) internal view virtual
```

Modified AccessControl checkRoles for multiple role check

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| roles | bytes32[] | The name of the roles to check |
| account | address | The address of the account to check |

### setKYC

```solidity
function setKYC(address _address, bool _isKYCed) external
```

set KYC for an account address

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _address | address | address that will be KYCed |
| _isKYCed | bool | result of KYC |

### setBan

```solidity
function setBan(address _address, bool _isBanned) external
```

set ban for an account address

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _address | address | address that will be ban set |
| _isBanned | bool | ban set result |

### isKYCed

```solidity
function isKYCed(address _address) external view returns (bool)
```

gets KYC result of the address

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _address | address | wallet that KYC result will be sent |

### isBanned

```solidity
function isBanned(address _address) external view returns (bool)
```

gets ban result of the address

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _address | address | wallet that ban result will be sent |

### grantRoleStaker

```solidity
function grantRoleStaker(bytes32 role, address user) external
```

### revokeRoleStaker

```solidity
function revokeRoleStaker(bytes32 role, address user) external
```

## UDAOCertificate

### constructor

```solidity
constructor(address irmAdress) public
```

### CertificateVoucher

```solidity
struct CertificateVoucher {
  uint256 tokenId;
  string uri;
  address redeemer;
  string name;
  string description;
  bytes signature;
}
```

### redeem

```solidity
function redeem(struct UDAOCertificate.CertificateVoucher voucher) public
```

Redeems a CertificateVoucher for an actual NFT, creating it in the process.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| voucher | struct UDAOCertificate.CertificateVoucher | A signed CertificateVoucher that describes the NFT to be redeemed. |

### _hash

```solidity
function _hash(struct UDAOCertificate.CertificateVoucher voucher) internal view returns (bytes32)
```

Returns a hash of the given CertificateVoucher, prepared using EIP712 typed data hashing rules.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| voucher | struct UDAOCertificate.CertificateVoucher | A CertificateVoucher to hash. |

### getChainID

```solidity
function getChainID() external view returns (uint256)
```

Returns the chain id of the current blockchain.

_This is used to workaround an issue with ganache returning different values from the on-chain chainid() function and
 the eth_chainId RPC method. See https://github.com/protocol/nft-website/issues/121 for context._

### _verify

```solidity
function _verify(struct UDAOCertificate.CertificateVoucher voucher) internal view returns (address)
```

Verifies the signature for a given CertificateVoucher, returning the address of the signer.

_Will revert if the signature is invalid. Does not verify that the signer is authorized to mint NFTs._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| voucher | struct UDAOCertificate.CertificateVoucher | A CertificateVoucher describing an unminted NFT. |

### _beforeTokenTransfer

```solidity
function _beforeTokenTransfer(address from, address to, uint256 tokenId) internal virtual
```

Checks if token transfer is allowed. Reverts if not allowed.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| from | address | The current token owner |
| to | address | Token to send to |
| tokenId | uint256 | The id of the token to transfer |

### emergencyTransfer

```solidity
function emergencyTransfer(address from, address to, uint256 tokenId) external
```

transfer token in emergency

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| from | address | The current token owner |
| to | address | Token to send to |
| tokenId | uint256 | The id of the token to transfer |

### burn

```solidity
function burn(uint256 tokenId) external
```

burn tokens if owner does not want to have certificate any more

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| tokenId | uint256 | The id of the token to burn |

### _burn

```solidity
function _burn(uint256 tokenId) internal
```

### tokenURI

```solidity
function tokenURI(uint256 tokenId) public view returns (string)
```

## UDAOVp

### stakingContractAddress

```solidity
address stakingContractAddress
```

### contractManager

```solidity
contract ContractManager contractManager
```

### constructor

```solidity
constructor(address rmAddress, address _contractManager) public
```

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| rmAddress | address | The address of the deployed role manager |
| _contractManager | address |  |

### updateAddresses

```solidity
function updateAddresses() external
```

Get the updated addresses from contract manager

### mint

```solidity
function mint(address to, uint256 amount) public
```

Allows staking contract to mint vp token "to" an address

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| to | address | The address of the vp token recipient |
| amount | uint256 | of the vp token |

### allowance

```solidity
function allowance(address owner, address spender) public view virtual returns (uint256)
```

returns allowance of an account for another account

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| owner | address | Owner of the tokens |
| spender | address | Address of the user with allownece rights |

### _afterTokenTransfer

```solidity
function _afterTokenTransfer(address from, address to, uint256 amount) internal
```

### _mint

```solidity
function _mint(address to, uint256 amount) internal
```

### _burn

```solidity
function _burn(address account, uint256 amount) internal
```

## UDAOContent

### constructor

```solidity
constructor(address irmAdress) public
```

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| irmAdress | address | The address of the deployed role manager |

### contentPrice

```solidity
mapping(uint256 => mapping(uint256 => uint256)) contentPrice
```

### ContentVoucher

```solidity
struct ContentVoucher {
  uint256 tokenId;
  uint256[] contentPrice;
  string uri;
  address redeemer;
  bool isCoachingEnabled;
  string name;
  string description;
}
```

### coachingEnabled

```solidity
mapping(uint256 => bool) coachingEnabled
```

### redeem

```solidity
function redeem(struct UDAOContent.ContentVoucher voucher) public
```

Redeems a ContentVoucher for an actual NFT, creating it in the process.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| voucher | struct UDAOContent.ContentVoucher | A signed ContentVoucher that describes the NFT to be redeemed. |

### enableCoaching

```solidity
function enableCoaching(uint256 tokenId) external
```

Allows instructers' to enable coaching for a specific content

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| tokenId | uint256 | The content id |

### disableCoaching

```solidity
function disableCoaching(uint256 tokenId) external
```

Allows instructers' to disable coaching for a specific content

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| tokenId | uint256 | tokenId of the content that will be not coached |

### isCoachingEnabled

```solidity
function isCoachingEnabled(uint256 tokenId) external view returns (bool)
```

Returns if a coaching enabled for a token or not

### getPriceContent

```solidity
function getPriceContent(uint256 tokenId, uint256 partId) external view returns (uint256)
```

returns the price of a specific content

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| tokenId | uint256 | the content ID of the token |
| partId | uint256 | the part ID of the token (microlearning), full content price if 0 |

### setFullPriceContent

```solidity
function setFullPriceContent(uint256 tokenId, uint256 _contentPrice) external
```

allows content owners to set full content price

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| tokenId | uint256 | the content ID of the token |
| _contentPrice | uint256 | the price to set |

### setPartialContent

```solidity
function setPartialContent(uint256 tokenId, uint256 partId, uint256 _contentPrice) external
```

allows content owners to set price for a part in a content (microlearning)

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| tokenId | uint256 | the content ID of the token |
| partId | uint256 |  |
| _contentPrice | uint256 | the price to set |

### setBatchPartialContent

```solidity
function setBatchPartialContent(uint256 tokenId, uint256[] partId, uint256[] _contentPrice) external
```

allows content owners to set price for multiple parts in a content (microlearning)

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| tokenId | uint256 | the content ID of the token |
| partId | uint256[] |  |
| _contentPrice | uint256[] | the price to set |

### setBatchFullContent

```solidity
function setBatchFullContent(uint256 tokenId, uint256[] partId, uint256[] _contentPrice) external
```

allows content owners to set price for full content and multiple parts in a content

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| tokenId | uint256 | the content ID of the token |
| partId | uint256[] |  |
| _contentPrice | uint256[] | the price to set, first price is for full content price |

### _getPartNumberOfContent

```solidity
function _getPartNumberOfContent(uint256 tokenId) internal view returns (uint256)
```

Returns the part numbers that a content has

### getPartNumberOfContent

```solidity
function getPartNumberOfContent(uint256 tokenId) external view returns (uint256)
```

Returns the part numbers that a content has

### burn

```solidity
function burn(uint256 tokenId) external
```

A content can be completely removed by the owner

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| tokenId | uint256 | The token ID of a content |

### _burn

```solidity
function _burn(uint256 tokenId) internal
```

### _beforeTokenTransfer

```solidity
function _beforeTokenTransfer(address from, address to, uint256 tokenId) internal virtual
```

_Hook that is called before any token transfer. This includes minting
and burning.

Calling conditions:

- When `from` and `to` are both non-zero, ``from``'s `tokenId` will be
transferred to `to`.
- When `from` is zero, `tokenId` will be minted for `to`.
- When `to` is zero, ``from``'s `tokenId` will be burned.
- `from` and `to` are never both zero.

To learn more about hooks, head to xref:ROOT:extending-contracts.adoc#using-hooks[Using Hooks]._

### exists

```solidity
function exists(uint256 tokenId) external view returns (bool)
```

Allows off-chain check if a token(content) exists

### tokenURI

```solidity
function tokenURI(uint256 tokenId) public view returns (string)
```

### supportsInterface

```solidity
function supportsInterface(bytes4 interfaceId) public view returns (bool)
```

_See {IERC165-supportsInterface}._

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

### setStakingContract

```solidity
function setStakingContract(address stakingContractAddress) external
```

Allows administrator_roles to set the staking contract address.

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

### requiredValidator

```solidity
uint128 requiredValidator
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

### sendValidation

```solidity
function sendValidation(uint256 validationId, bool result) external
```

_this is possibly deprecated, moved to offchain?_

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
function setRequiredValidators(uint128 _requiredValidator) external
```

sets required validator vote count per content

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _requiredValidator | uint128 | new required vote count |

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

