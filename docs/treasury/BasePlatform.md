# Solidity API

## BasePlatform

### roleManager

```solidity
contract IRoleManager roleManager
```

### voucherVerifier

```solidity
contract IVoucherVerifier voucherVerifier
```

### contractManager

```solidity
contract ContractManager contractManager
```

### iGovernanceTreasury

```solidity
contract IGovernanceTreasury iGovernanceTreasury
```

### udao

```solidity
contract IERC20 udao
```

### udaoc

```solidity
contract IUDAOC udaoc
```

### governanceTreasury

```solidity
address governanceTreasury
```

### foundationWallet

```solidity
address foundationWallet
```

### isTokenBought

```solidity
mapping(address => mapping(uint256 => mapping(uint256 => bool))) isTokenBought
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

### constructor

```solidity
constructor(address _contractManager, address rmAddress, address _iGovernanceTreasuryAddress, address _voucherVerifierAddress) internal
```

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
event AddressesUpdated(address udao, address udaoc, address isupvis, address irm, address voucherVerifier)
```

This event is triggered if the contract manager updates the addresses.

### refundWindow

```solidity
uint256 refundWindow
```

### epochOneDay

```solidity
uint256 epochOneDay
```

### instBalance

```solidity
mapping(address => uint256) instBalance
```

### instLockedBalance

```solidity
mapping(address => uint256[61]) instLockedBalance
```

### contentCutPool

```solidity
uint256 contentCutPool
```

### contentCutLockedPool

```solidity
uint256[61] contentCutLockedPool
```

### coachingCutPool

```solidity
uint256 coachingCutPool
```

### coachingCutLockedPool

```solidity
uint256[61] coachingCutLockedPool
```

### foundationBalance

```solidity
uint256 foundationBalance
```

### governanceBalance

```solidity
uint256 governanceBalance
```

### jurorBalance

```solidity
uint256 jurorBalance
```

### validatorsBalance

```solidity
uint256 validatorsBalance
```

### instLockTime

```solidity
mapping(address => uint256) instLockTime
```

### contentLockTime

```solidity
uint256 contentLockTime
```

### coachingLockTime

```solidity
uint256 coachingLockTime
```

### instRefundedBalance

```solidity
mapping(address => uint256) instRefundedBalance
```

### contentCutRefundedBalance

```solidity
uint256 contentCutRefundedBalance
```

### coachingCutRefundedBalance

```solidity
uint256 coachingCutRefundedBalance
```

### coachFoundCut

```solidity
uint256 coachFoundCut
```

### coachGoverCut

```solidity
uint256 coachGoverCut
```

### coachJurorCut

```solidity
uint256 coachJurorCut
```

### coachValidCut

```solidity
uint256 coachValidCut
```

### contentFoundCut

```solidity
uint256 contentFoundCut
```

### contentGoverCut

```solidity
uint256 contentGoverCut
```

### contentJurorCut

```solidity
uint256 contentJurorCut
```

### contentValidCut

```solidity
uint256 contentValidCut
```

### contentTotalCut

```solidity
uint256 contentTotalCut
```

### coachTotalCut

```solidity
uint256 coachTotalCut
```

### isGovernanceTreasuryOnline

```solidity
bool isGovernanceTreasuryOnline
```

### PlatformCutsUpdated

```solidity
event PlatformCutsUpdated(uint256 coachFoundCut, uint256 coachGoverCut, uint256 coachJurorCut, uint256 coachValidCut, uint256 contentFoundCut, uint256 contentGoverCut, uint256 contentJurorCut, uint256 contentValidCut)
```

This event is triggered if a cut is updated.

### calculateContentCutShares

```solidity
function calculateContentCutShares(uint256 _revenue) public view returns (uint256 foundationShare, uint256 governanceShare, uint256 jurorShare, uint256 validatorShare)
```

### calculateContentSaleTotalCut

```solidity
function calculateContentSaleTotalCut(uint256 _priceOf) public view returns (uint256)
```

### calculateCoachingCutShares

```solidity
function calculateCoachingCutShares(uint256 _revenue) public view returns (uint256 foundationShare, uint256 governanceShare, uint256 jurorShare, uint256 validatorShare)
```

### calculateCoachingSaleTotalCut

```solidity
function calculateCoachingSaleTotalCut(uint256 _priceOf) public view returns (uint256)
```

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

