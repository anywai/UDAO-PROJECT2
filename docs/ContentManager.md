# Solidity API

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

