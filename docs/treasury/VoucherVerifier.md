# Solidity API

## VoucherVerifier

### constructor

```solidity
constructor(address roleManagerAddress) public
```

### AddressesUpdated

```solidity
event AddressesUpdated(address roleManagerAddress)
```

This event is triggered if the contract manager updates the addresses.

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

### RefundVoucher

```solidity
struct RefundVoucher {
  uint256 saleID;
  address instructor;
  uint256[] finalParts;
  uint256[] finalContents;
  uint256 validUntil;
  bytes signature;
}
```

### CoachingVoucher

```solidity
struct CoachingVoucher {
  address coach;
  uint256 priceToPay;
  uint256 coachingDate;
  address learner;
  bytes signature;
}
```

### updateAddresses

```solidity
function updateAddresses(address roleManagerAddress) external
```

Get the updated addresses from contract manager

### _hashDiscountVoucher

```solidity
function _hashDiscountVoucher(struct VoucherVerifier.ContentDiscountVoucher voucher) internal view returns (bytes32)
```

Returns a hash of the given ContentDiscountVoucher, prepared using EIP712 typed data hashing rules.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| voucher | struct VoucherVerifier.ContentDiscountVoucher | A ContentDiscountVoucher to hash. |

### _hashRefundVoucher

```solidity
function _hashRefundVoucher(struct VoucherVerifier.RefundVoucher voucher) internal view returns (bytes32)
```

Returns a hash of the given RefundVoucher, prepared using EIP712 typed data hashing rules.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| voucher | struct VoucherVerifier.RefundVoucher | A RefundVoucher to hash. |

### _hashCoachingVoucher

```solidity
function _hashCoachingVoucher(struct VoucherVerifier.CoachingVoucher voucher) internal view returns (bytes32)
```

Returns a hash of the given CoachingVoucher, prepared using EIP712 typed data hashing rules.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| voucher | struct VoucherVerifier.CoachingVoucher | A CoachingVoucher to hash. |

### verifyDiscountVoucher

```solidity
function verifyDiscountVoucher(struct VoucherVerifier.ContentDiscountVoucher voucher) external view
```

Verifies the signature for a given ContentDiscountVoucher, returning the address of the signer.

_Will revert if the signature is invalid._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| voucher | struct VoucherVerifier.ContentDiscountVoucher | A ContentDiscountVoucher describing a content access rights. |

### verifyRefundVoucher

```solidity
function verifyRefundVoucher(struct VoucherVerifier.RefundVoucher voucher) external view
```

Verifies the signature for a given ContentDiscountVoucher, returning the address of the signer.

_Will revert if the signature is invalid._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| voucher | struct VoucherVerifier.RefundVoucher | A ContentDiscountVoucher describing a content access rights. |

### verifyCoachingVoucher

```solidity
function verifyCoachingVoucher(struct VoucherVerifier.CoachingVoucher voucher) external view
```

Verifies the signature for a given CoachingVoucher, returning the address of the signer.

_Will revert if the signature is invalid._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| voucher | struct VoucherVerifier.CoachingVoucher | A CoachingVoucher describing a content access rights. |

### getChainID

```solidity
function getChainID() external view returns (uint256)
```

Returns the chain id of the current blockchain.

_This is used to workaround an issue with ganache returning different values from the on-chain chainid() function and
 the eth_chainId RPC method. See https://github.com/protocol/nft-website/issues/121 for context._

