# Solidity API

## PlatformTreasury

### FoundationWithdrawn

```solidity
event FoundationWithdrawn(uint256 amount)
```

this event gets triggered when founcation withdraw tokens

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| amount | uint256 | The amount of tokens withdrawn |

### InstructorWithdrawn

```solidity
event InstructorWithdrawn(address instructor, uint256 amount, uint256 debt)
```

this event gets triggered when a instructor withdraw tokens

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| instructor | address | The address of the instructor |
| amount | uint256 | The amount of tokens withdrawn |
| debt | uint256 | The amount of tokens that are not withdrawn due to the debt |

### RefundWindowUpdated

```solidity
event RefundWindowUpdated(uint256 newWindow)
```

this event gets triggered when the refund window is updated

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| newWindow | uint256 | The new refund window period |

### constructor

```solidity
constructor(address _rmAddress, address _udaoAddress, address _udaocAddress, address _governanceTreasuryAddress, address _voucherVerifierAddress) public
```

constructor of the PlatformTreasury contract

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _rmAddress | address | The address of the deployed role manager |
| _udaoAddress | address | The address of the deployed UDAO token |
| _udaocAddress | address | The address of the deployed UDAOC token |
| _governanceTreasuryAddress | address | The address of the deployed governance treasury |
| _voucherVerifierAddress | address | The address of the deployed voucher verifier |

### updateAndTransferPlatformBalances

```solidity
function updateAndTransferPlatformBalances() external
```

Allows anyone to update the platform cut balances and transfer the platform cut to governance

### withdrawFoundation

```solidity
function withdrawFoundation() external
```

withdraws foundation balance to foundation wallet

### withdrawInstructor

```solidity
function withdrawInstructor() external
```

Allows instructers to withdraw individually.

### getWithdrawableBalanceInstructor

```solidity
function getWithdrawableBalanceInstructor(address _inst) public view returns (uint256, uint256)
```

returns the withdrawable balance of the instructor

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _inst | address | The address of the instructor |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | withdrawableBalance The withdrawable balance of the given instructor |
| [1] | uint256 |  |

### changeRefundWindow

```solidity
function changeRefundWindow(uint256 _newWindow) external
```

Allows backend to change platform refun window period

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _newWindow | uint256 | The new refund window period |

