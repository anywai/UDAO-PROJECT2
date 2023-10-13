# Solidity API

## ContentManager

### ContentBought

```solidity
event ContentBought(uint256 tokenId, uint256[] parts, uint256 pricePaid, address buyer)
```

Emitted when a content is bought

### CoachingBought

```solidity
event CoachingBought(uint256 coachingSaleID)
```

### saleID

```solidity
struct Counters.Counter saleID
```

Used to generate unique ids for content sales

### coachingSaleID

```solidity
struct Counters.Counter coachingSaleID
```

Used to generate unique ids for coaching sales

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

### sales

```solidity
mapping(uint256 => struct ContentManager.ContentSale) sales
```

### coachSales

```solidity
mapping(uint256 => struct ContentManager.CoachingSale) coachSales
```

### ownedContents

```solidity
mapping(address => uint256[][]) ownedContents
```

### coachingIndex

```solidity
uint256 coachingIndex
```

### buyContentWithDiscount

```solidity
function buyContentWithDiscount(struct IVoucherVerifier.ContentDiscountVoucher[] voucher) external
```

Allows users to buy content with discount voucher

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| voucher | struct IVoucherVerifier.ContentDiscountVoucher[] | discount vouchers |

### buyCoaching

```solidity
function buyCoaching(struct IVoucherVerifier.CoachingVoucher voucher) external
```

### buyContent

```solidity
function buyContent(uint256[] tokenIds, bool[] fullContentPurchases, uint256[][] purchasedParts, address[] giftReceivers) external
```

Allows multiple content purchases using buyContent

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| tokenIds | uint256[] | ids of the content |
| fullContentPurchases | bool[] | is full content purchased |
| purchasedParts | uint256[][] | parts of the content purchased |
| giftReceivers | address[] | address of the gift receiver if purchase is a gift |

### _buyContentwithUDAO

```solidity
function _buyContentwithUDAO(uint256 tokenId, bool fullContentPurchase, uint256[] purchasedParts, address contentReceiver, uint256 totalCut, uint256 instrShare) internal
```

### _doReceiverHaveContentOrPart

```solidity
function _doReceiverHaveContentOrPart(uint256 tokenId, bool fullContentPurchase, uint256[] purchasedParts, address contentReceiver) internal view returns (bool)
```

### calculatePriceToPayInTotal

```solidity
function calculatePriceToPayInTotal(uint256[] tokenIds, bool[] fullContentPurchases, uint256[][] purchasedParts) external view returns (uint256)
```

Calculates total amount to pay for a cart purchase

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| tokenIds | uint256[] | ids of the contents |
| fullContentPurchases | bool[] | is full content purchased |
| purchasedParts | uint256[][] | parts of the content purchased |

### calculatePriceToPay

```solidity
function calculatePriceToPay(uint256 _tokenId, bool _fullContentPurchase, uint256[] _purchasedParts) public view returns (uint256)
```

Calculates price to pay for a purchase

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _tokenId | uint256 | id of the content |
| _fullContentPurchase | bool | is full content purchased |
| _purchasedParts | uint256[] | parts of the content purchased |

### _updateGlobalContentBalances

```solidity
function _updateGlobalContentBalances(uint256 totalCutContentShare, uint256 _transactionTime, uint256 _transactionFuIndex) internal
```

### _updateGlobalCoachingBalances

```solidity
function _updateGlobalCoachingBalances(uint256 totalCutCoachingShare, uint256 _transactionTime, uint256 _transactionFuIndex) internal
```

### _updateInstructorBalances

```solidity
function _updateInstructorBalances(uint256 _instrShare, address _inst, uint256 _transactionTime, uint256 _transactionLBIndex) internal
```

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _instrShare | uint256 | amount of UDAO to be paid to the instructor, it revenue of instructor after the content sale |
| _inst | address | address of the instructor |
| _transactionTime | uint256 | indicates the day of the transaction (how many days passed since 1Jan1970-0:0:0) |
| _transactionLBIndex | uint256 | determines the payment will be added to which position in the insLockedBalance array. |

### _sendCurrentGlobalCutsToGovernanceTreasury

```solidity
function _sendCurrentGlobalCutsToGovernanceTreasury() internal
```

### refundCoachingByInstructorOrLearner

```solidity
function refundCoachingByInstructorOrLearner(uint256 _saleID) external
```

Allows learner to get refund of coaching 1 day prior to coaching date or coach to refund anytime

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _saleID | uint256 | id of the coaching sale |

### newRefundCoaching

```solidity
function newRefundCoaching(struct IVoucherVerifier.RefundVoucher voucher) external
```

Allows refund of coaching with a voucher

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| voucher | struct IVoucherVerifier.RefundVoucher | A RefundVoucher |

### newRefundContent

```solidity
function newRefundContent(struct IVoucherVerifier.RefundVoucher voucher) external
```

Allows refund of a content with a voucher

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| voucher | struct IVoucherVerifier.RefundVoucher | A RefundVoucher |

### getOwnedContent

```solidity
function getOwnedContent(address _owner) public view returns (uint256[][])
```

returns owned contents of the _owner

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _owner | address | address of the user that will owned contents be returned |

### getChainID

```solidity
function getChainID() external view returns (uint256)
```

Returns the chain id of the current blockchain.

_This is used to workaround an issue with ganache returning different values from the on-chain chainid() function and
 the eth_chainId RPC method. See https://github.com/protocol/nft-website/issues/121 for context._

