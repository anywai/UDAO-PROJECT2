# Solidity API

## PlatformTreasury

### FoundationWithdrawn

```solidity
event FoundationWithdrawn(uint256 amount)
```

this event gets triggered when founcation withdraw tokens

### InstructorWithdrawn

```solidity
event InstructorWithdrawn(address instructor, uint256 amount, uint256 debt)
```

this event gets triggered when a instructor withdraw tokens

### RefundWindowUpdated

```solidity
event RefundWindowUpdated(uint256 newWindow)
```

this event gets triggered when the refund window is updated

### constructor

```solidity
constructor(address _rmAddress, address _udaoAddress, address _udaocAddress, address _governanceTreasuryAddress, address _voucherVerifierAddress) public
```

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _rmAddress | address | The address of the deployed role manager |
| _udaoAddress | address |  |
| _udaocAddress | address |  |
| _governanceTreasuryAddress | address |  |
| _voucherVerifierAddress | address |  |

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
function getWithdrawableBalanceInstructor(address _inst) public view returns (uint256)
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

### changeRefundWindow

```solidity
function changeRefundWindow(uint256 _newWindow) external
```

Allows backend to change platform refun window period

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _newWindow | uint256 | The new refund window period |

