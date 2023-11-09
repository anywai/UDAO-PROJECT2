# Solidity API

## IVoucherVerifier

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

### verifyDiscountVoucher

```solidity
function verifyDiscountVoucher(struct IVoucherVerifier.ContentDiscountVoucher voucher) external view
```

### verifyRefundVoucher

```solidity
function verifyRefundVoucher(struct IVoucherVerifier.RefundVoucher voucher) external view
```

### verifyCoachingVoucher

```solidity
function verifyCoachingVoucher(struct IVoucherVerifier.CoachingVoucher voucher) external view
```

