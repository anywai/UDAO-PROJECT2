# Solidity API

## ContentManager

### ContentBought

```solidity
event ContentBought(string userId, uint256 cartSaleID, uint256 contentSaleID)
```

Emitted when a content is bought

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| userId | string | The ID of the user |
| cartSaleID | uint256 | The ID of the cart sale |
| contentSaleID | uint256 | The ID of the content sale |

### CoachingBought

```solidity
event CoachingBought(string userId, uint256 coachingSaleID)
```

Emitted when a coaching is bought

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| userId | string | The ID of the user |
| coachingSaleID | uint256 | The ID of the coaching sale |

### SaleRefunded

```solidity
event SaleRefunded(uint256 saleID, uint8 saleType)
```

Emitted when refund is requested. saleType: 0=coaching, 1=content

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| saleID | uint256 | The ID of the coaching or content sale to be refunded |
| saleType | uint8 | The type of the sale 0=coaching, 1=content |

### ContentCutPoolUpdated

```solidity
event ContentCutPoolUpdated(uint256 _contentCutPool)
```

Emitted when the "ContentCutPool revenue balance" is updated,

_after the refund window is over, the revenue collected from content sales for platform roles is transferred to the "ContentCutPool"_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _contentCutPool | uint256 | The new value of the content cut pool |

### ContentCutLockedPoolUpdated

```solidity
event ContentCutLockedPoolUpdated()
```

Emitted when the "ContentCutLockedPool: locked revenue balances" are updated,

_This revenue collected from content sales for platform roles, and these are locked revenue balances which doesn't completes refund window yet_

### CoachingCutPoolUpdated

```solidity
event CoachingCutPoolUpdated(uint256 _coachingCutPool)
```

Emitted when the "CoachingCutPool revenue balance" is updated,

_after the refund window is over, the revenue collected from coaching sales for platform roles is transferred to the "CoachingCutPool"_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _coachingCutPool | uint256 | The new value of the cut pool |

### CoachingCutLockedPoolUpdated

```solidity
event CoachingCutLockedPoolUpdated()
```

Emitted when the "CoachingCutLockedPool: locked revenue balances" are updated,

_This revenue collected from coaching sales for platform roles, and these are locked revenue balances which doesn't completes refund window yet_

### RoleBalancesUpdated

```solidity
event RoleBalancesUpdated(uint256 foundationBalance, uint256 jurorBalance, uint256 validatorsBalance, uint256 governanceBalance)
```

Emitted when platform role revenues are distributed to roles or role revenues are directed to governance treasury

_the platform role revenues are content and coaching cut pools, and roles are foundation, juror, validator and governance_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| foundationBalance | uint256 | The new value of the foundation balance |
| jurorBalance | uint256 | The new value of the juror balance |
| validatorsBalance | uint256 | The new value of the validators balance |
| governanceBalance | uint256 | The new value of the governance balance |

### InstructorBalanceUpdated

```solidity
event InstructorBalanceUpdated(address _instructor, uint256 _instBalance)
```

Emitted when the instructor balance is updated

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _instructor | address | The address of the instructor |
| _instBalance | uint256 | The new value of the instructor balance |

### InstructorLockedBalanceUpdated

```solidity
event InstructorLockedBalanceUpdated(address _instructor)
```

Emitted when the instructor locked balances is updated

### contentSaleID

```solidity
struct Counters.Counter contentSaleID
```

Used to generate unique ids for content sales

### coachingSaleID

```solidity
struct Counters.Counter coachingSaleID
```

Used to generate unique ids for coaching sales

### cartSaleID

```solidity
struct Counters.Counter cartSaleID
```

Used to generate unique ids for cart sales

### ContentSale

```solidity
struct ContentSale {
  address payee;
  address contentReceiver;
  address instructor;
  uint256 instrShare;
  uint256 totalCut;
  uint256 tokenId;
  uint256[] purchasedParts;
  bool isRefunded;
  uint256 refundablePeriod;
  bool fullPurchase;
}
```

### CoachingSale

```solidity
struct CoachingSale {
  address payee;
  address contentReceiver;
  address coach;
  uint256 instrShare;
  uint256 totalCut;
  bool isRefunded;
  uint256 coachingDate;
  uint256 refundablePeriod;
}
```

### contentSales

```solidity
mapping(uint256 => struct ContentManager.ContentSale) contentSales
```

content sale id => the content sale

### coachSales

```solidity
mapping(uint256 => struct ContentManager.CoachingSale) coachSales
```

coaching sale id => the coaching sale

### isPartBought

```solidity
mapping(address => mapping(uint256 => mapping(uint256 => bool))) isPartBought
```

user address => (content id => (content part id => part owned/not owned by the user))

### ownedParts

```solidity
mapping(address => mapping(uint256 => uint256[])) ownedParts
```

user address => content token Id => content part Id

### isFullyPurchased

```solidity
mapping(address => mapping(uint256 => bool)) isFullyPurchased
```

user address => content token Id => is full content purchase

### isContentBought

```solidity
mapping(address => mapping(uint256 => bool)) isContentBought
```

user address => (content id => content owned/not owned by the user)

### ownedContents

```solidity
mapping(address => uint256[]) ownedContents
```

user address => content token Ids

### buyCoaching

```solidity
function buyCoaching(struct IVoucherVerifier.CoachingVoucher voucher) external
```

Allows users to buy coaching with a voucher created by instructor

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| voucher | struct IVoucherVerifier.CoachingVoucher | buy coaching voucher |

### buyContent

```solidity
function buyContent(struct IVoucherVerifier.ContentDiscountVoucher[] vouchers) external
```

Allows users to purchase multiple contents for the caller or gift receiver with discount vouchers

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| vouchers | struct IVoucherVerifier.ContentDiscountVoucher[] | buy discount content voucher array |

### _buyContent

```solidity
function _buyContent(uint256 tokenId, bool fullContentPurchase, uint256[] purchasedParts, address contentReceiver, uint256 totalCut, uint256 instrShare) internal returns (uint256 _contentID)
```

Used by buy content functions to receive payment from user and deliver the content to user

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| tokenId | uint256 | The token ID of the content. |
| fullContentPurchase | bool | A boolean indicating whether it's a full content purchase. |
| purchasedParts | uint256[] | An array representing the parts of the content purchased. |
| contentReceiver | address | The address of the content receiver. |
| totalCut | uint256 | The total platform cut applied to the content sale. |
| instrShare | uint256 | The instructor's share from the the content sale. |

### _checkPartReceiver

```solidity
function _checkPartReceiver(uint256 _tokenId, uint256[] _purchasedParts, address _contentReceiver) public view returns (address)
```

Checks if there is nothing wrong with the content purchase related to content receiver

_This function checks if the content receiver is banned, not KYCed, or already owns the content or content part.
It can be used also by backend to check a purchase request is acceptable or not before a bulk fiat purchase.(So that it a public view function)_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _tokenId | uint256 | The token ID of the content. |
| _purchasedParts | uint256[] | An array representing the parts of the content purchased. |
| _contentReceiver | address | The address of the content receiver. |

### getOwnedParts

```solidity
function getOwnedParts(address _buyer, uint256 _tokenId) external view returns (uint256[])
```

Returns the parts owned by buyer if buyer has bought any parts in the past

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _buyer | address | The address of the buyer. |
| _tokenId | uint256 | The token ID of the content. |

### getOwnedContents

```solidity
function getOwnedContents(address _buyer) external view returns (uint256[])
```

Returns the contents owned by buyer

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _buyer | address | The address of the buyer. |

### _updatePlatformCutBalances

```solidity
function _updatePlatformCutBalances(uint256 totalCutContentShare, uint256 totalCutCoachingShare, uint256 _transactionTime, uint256 _transactionLBIndex) internal
```

Update content and coaching CutPools and handle locked payments during the refund window.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| totalCutContentShare | uint256 | amount of UDAO to be paid to the platform, it is revenue of platform from content sales. |
| totalCutCoachingShare | uint256 | amount of UDAO to be paid to the platform, it is revenue of platform from coaching sales. |
| _transactionTime | uint256 | indicates the day of the transaction (number of days passed since 1Jan1970-0:0:0) |
| _transactionLBIndex | uint256 | determines the payment will be added to which position in the CutLockedPool arrays. |

### _updateInstructorBalances

```solidity
function _updateInstructorBalances(uint256 _instrShare, address _inst, uint256 _transactionTime, uint256 _transactionLBIndex) internal
```

Updates instructor balances and handle locked payments during the refund window.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _instrShare | uint256 | amount of UDAO to be paid to the instructor, it is revenue of instructor from content sales. |
| _inst | address | address of the instructor. |
| _transactionTime | uint256 | indicates the day of the transaction (number of days passed since 1Jan1970-0:0:0) |
| _transactionLBIndex | uint256 | determines the payment will be added to which position in the insLockedBalance array. |

### _transferPlatformCutstoGovernance

```solidity
function _transferPlatformCutstoGovernance() internal
```

Distributes platform revenue to platform roles and transfers governance role shares to the governance treasury.

### refundCoachingByInstructorOrLearner

```solidity
function refundCoachingByInstructorOrLearner(uint256 _refCoachSaleID) external
```

Allows learner to get refund of coaching 1 day prior to coaching date, or coach to refund in refund window

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _refCoachSaleID | uint256 | The ID of the coaching sale |

### newRefundCoaching

```solidity
function newRefundCoaching(struct IVoucherVerifier.RefundVoucher voucher) external
```

Allows to anyone to refund of coaching with a voucher created by platform

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| voucher | struct IVoucherVerifier.RefundVoucher | A RefundVoucher |

### newRefundContent

```solidity
function newRefundContent(struct IVoucherVerifier.RefundVoucher voucher) external
```

Allows anyone to refund of a content with a voucher created by platform

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| voucher | struct IVoucherVerifier.RefundVoucher | A RefundVoucher |

