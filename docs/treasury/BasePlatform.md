# Solidity API

## BasePlatform

### BACKEND_ROLE

```solidity
bytes32 BACKEND_ROLE
```

_Role definitions are here to reduce the size of the contract._

### FOUNDATION_ROLE

```solidity
bytes32 FOUNDATION_ROLE
```

### GOVERNANCE_ROLE

```solidity
bytes32 GOVERNANCE_ROLE
```

### CONTRACT_MANAGER

```solidity
bytes32 CONTRACT_MANAGER
```

### roleManager

```solidity
contract IRoleManager roleManager
```

Role manager contract address

### udao

```solidity
contract IERC20 udao
```

UDAO (ERC20) Token is main token of the platform and used for payments

### udaoc

```solidity
contract IUDAOC udaoc
```

UDAOC (ERC721) Token is defines contents and used for content ownership

### voucherVerifier

```solidity
contract IVoucherVerifier voucherVerifier
```

VoucherVerifier contract is defines the vouchers of PlatformTreasury and used to verify vouchers

### governanceTreasury

```solidity
contract IGovernanceTreasury governanceTreasury
```

GovernanceTreasury contract is platforms governance related funds treasury contract

### foundationWallet

```solidity
address foundationWallet
```

Address of foundation wallet is used for sending funds to foundation

### refundWindow

```solidity
uint256 refundWindow
```

during refund windows all payments locked on contract and users can request refund

_it initiated as 20 days and locked balance/pool array's size (61) defines the maximum setable refund window._

### instBalance

```solidity
mapping(address => uint256) instBalance
```

instructor address => instructor's balance

### instLockedBalance

```solidity
mapping(address => uint256[61]) instLockedBalance
```

instructor address => instructor's locked balances

### contentCutPool

```solidity
uint256 contentCutPool
```

content cut pool for content sales

### contentCutLockedPool

```solidity
uint256[61] contentCutLockedPool
```

content cut locked pool for content sales (locked revenues during refund window)

### coachingCutPool

```solidity
uint256 coachingCutPool
```

coaching cut pool for coaching sales

### coachingCutLockedPool

```solidity
uint256[61] coachingCutLockedPool
```

coaching cut locked pool for coaching sales (locked revenues during refund window)

### foundationBalance

```solidity
uint256 foundationBalance
```

foundation balance

### governanceBalance

```solidity
uint256 governanceBalance
```

governance pool balance

### jurorBalance

```solidity
uint256 jurorBalance
```

juror pool balance

### validatorsBalance

```solidity
uint256 validatorsBalance
```

validator pool balance

### instLockTime

```solidity
mapping(address => uint256) instLockTime
```

instructor address => the date of the oldest locked payment of instructor.

### platformLockTime

```solidity
uint256 platformLockTime
```

the date of the oldest locked payment in content/coaching CutLockedPool

_platformLockTime initialized with deployment time_

### instRefundedBalance

```solidity
mapping(address => uint256) instRefundedBalance
```

instructor address => instructor's refunded balance to users

### contentCutRefundedBalance

```solidity
uint256 contentCutRefundedBalance
```

content cut pool's refunded cuts to users

### coachingCutRefundedBalance

```solidity
uint256 coachingCutRefundedBalance
```

coaching cut pool's refunded cuts to users

### prevInstRefundWindow

```solidity
mapping(address => uint256) prevInstRefundWindow
```

instructor address => instructor's previous refund window for last sale

### contentFoundCut

```solidity
uint256 contentFoundCut
```

The allocated cut for foundation from content sales

_initiated as (4000/100000 = 4%)_

### contentGoverCut

```solidity
uint256 contentGoverCut
```

The allocated cut for governance pool from content sales

_initiated as 0% and planned to be (700/100000 = 0.7%) after governance release_

### contentJurorCut

```solidity
uint256 contentJurorCut
```

The allocated cut for juror pool from content sales

_initiated as 0% and planned to be (100/100000 = 0.1%) after governance release_

### contentValidCut

```solidity
uint256 contentValidCut
```

The allocated cut for validator pool from content sales

_initiated as 0% and planned to be (200/100000 = 0.2%) after governance release_

### coachFoundCut

```solidity
uint256 coachFoundCut
```

The allocated cut for foundation from coaching sales

_initiated as (4000/100000 = 4%)_

### coachGoverCut

```solidity
uint256 coachGoverCut
```

The allocated cut for governance pool from coaching sales

_initiated as 0% and planned to be (700/100000 = 0.7%) after governance release_

### coachJurorCut

```solidity
uint256 coachJurorCut
```

The allocated cut for juror pool from coaching sales

_initiated as 0% and planned to be (100/100000 = 0.1%) after governance release_

### coachValidCut

```solidity
uint256 coachValidCut
```

The allocated cut for validator pool from coaching sales

_initiated as 0% and there is no use case_

### contentTotalCut

```solidity
uint256 contentTotalCut
```

allocated total cut for foundation, governance, juror and validator from content sales

### coachTotalCut

```solidity
uint256 coachTotalCut
```

allocated total cut for foundation, governance, juror and validator from coaching sales

### isGovernanceTreasuryOnline

```solidity
bool isGovernanceTreasuryOnline
```

is governance part of platform released

### constructor

```solidity
constructor(address roleManagerAddress, address udaoAddress, address udaocAddress, address governanceTreasuryAddress, address voucherVerifierAddress) internal
```

constructor of BasePlatform

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| roleManagerAddress | address | is address of RoleManager contract |
| udaoAddress | address | is address of UDAO token contract |
| udaocAddress | address | is address of UDAOC token contract |
| governanceTreasuryAddress | address | is address of GovernanceTreasury contract |
| voucherVerifierAddress | address | is address of VoucherVerifier contract |

### FoundationWalletUpdated

```solidity
event FoundationWalletUpdated(address newAddress)
```

This event is triggered if the foundation wallet address is updated.

### AddressesUpdated

```solidity
event AddressesUpdated(address UDAOAddress, address UDAOCAddress, address RoleManagerAddress, address GovernanceTreasuryAddress, address VoucherVerifierAddress)
```

This event is triggered if the contract manager updates the addresses.

### PlatformCutsUpdated

```solidity
event PlatformCutsUpdated(uint256 _contentFoundCut, uint256 _contentGoverCut, uint256 _contentJurorCut, uint256 _contentValidCut, uint256 _contentTotalCut, uint256 _coachFoundCut, uint256 _coachGoverCut, uint256 _coachJurorCut, uint256 _coachValidCut, uint256 _coachTotalCut)
```

This event is triggered if a cut is updated.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _contentFoundCut | uint256 | is the new cut for foundation |
| _contentGoverCut | uint256 | is the new cut for governance |
| _contentJurorCut | uint256 | is the new cut for juror pool |
| _contentValidCut | uint256 | is the new cut for validator pool |
| _contentTotalCut | uint256 | is the new total cut for foundation, governance, juror and validator |
| _coachFoundCut | uint256 | is the new cut for foundation |
| _coachGoverCut | uint256 | is the new cut for governance |
| _coachJurorCut | uint256 | is the new cut for juror pool |
| _coachValidCut | uint256 | is the new cut for validator pool |
| _coachTotalCut | uint256 | is the new total cut for foundation, governance, juror and validator |

### setFoundationAddress

```solidity
function setFoundationAddress(address _newAddress) external
```

sets foundation wallet addresses

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _newAddress | address | new address of the contract |

### updateAddresses

```solidity
function updateAddresses(address udaoAddress, address udaocAddress, address roleManagerAddress, address governanceTreasuryAddress, address voucherVerifierAddress) external
```

Get the updated addresses from contract manager

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| udaoAddress | address | The address of the UDAO token contract |
| udaocAddress | address | The address of the UDAOC token contract |
| roleManagerAddress | address | The address of the role manager contract |
| governanceTreasuryAddress | address | The address of the governance treasury contract |
| voucherVerifierAddress | address | The address of the voucher verifier contract |

### hasRole

```solidity
function hasRole(bytes32 _role, address _account) internal view returns (bool)
```

Checks if the user has the given role

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _role | bytes32 | is the role to be checked |
| _account | address | is the address to be checked |

### isNotBanned

```solidity
function isNotBanned(address _userAddress, uint256 _functionID) internal view returns (bool)
```

Checks if the user is banned

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _userAddress | address | is the address to be checked |
| _functionID | uint256 | is the function id to be checked |

### isKYCed

```solidity
function isKYCed(address _userAddress, uint256 _functionID) internal view returns (bool)
```

Checks if the user is KYCed

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _userAddress | address | is the address to be checked |
| _functionID | uint256 | is the function id to be checked |

### activateGovernanceTreasury

```solidity
function activateGovernanceTreasury(bool _boolean) external
```

Allows the backend to activate the governance treasury

_Tokens flows to governance treasury after if this function is called with true_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _boolean | bool | is the boolean value to be set |

### _distributeContentCutShares

```solidity
function _distributeContentCutShares(uint256 _revenue) internal
```

distribute the shares of foundation and governance/juror/validator pools from a platform's content sale revenue

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _revenue | uint256 | is the content sale revenue to be shared |

### _distributeCoachingCutShares

```solidity
function _distributeCoachingCutShares(uint256 _revenue) internal
```

distribute the shares of foundation and governance/juror/validator pools from a platform's coaching sale revenue

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _revenue | uint256 | is the coaching sale revenue to be shared |

### calculateContentSaleTotalCut

```solidity
function calculateContentSaleTotalCut(uint256 _priceOf) public view returns (uint256)
```

calculates the total cut to be applied by the platform in a content purchase.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _priceOf | uint256 | is the price of the content |

### calculateCoachingSaleTotalCut

```solidity
function calculateCoachingSaleTotalCut(uint256 _priceOf) public view returns (uint256)
```

calculates the total cut to be applied by the platform in a coaching purchase.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _priceOf | uint256 | is the price of the coaching |

### setCoachCuts

```solidity
function setCoachCuts(uint256 _coachFoundCut, uint256 _coachGoverCut, uint256 _coachJurorCut, uint256 _coachValidCut) external
```

sets the cut for foundation/governance/juror/validator for a coaching sale

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _coachFoundCut | uint256 | new cut for foundation |
| _coachGoverCut | uint256 | new cut for governance |
| _coachJurorCut | uint256 | new cut for juror pool |
| _coachValidCut | uint256 | new cut for validator pool |

### setContentCuts

```solidity
function setContentCuts(uint256 _contentFoundCut, uint256 _contentGoverCut, uint256 _contentJurorCut, uint256 _contentValidCut) external
```

sets the cut for foundation/governance/juror/validator for a content sale

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _contentFoundCut | uint256 | new cut for foundation |
| _contentGoverCut | uint256 | new cut for governance |
| _contentJurorCut | uint256 | new cut for juror pool |
| _contentValidCut | uint256 | new cut for validator pool |

