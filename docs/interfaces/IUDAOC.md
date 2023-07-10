# Solidity API

## IUDAOC

### exists

```solidity
function exists(uint256 tokenId) external view returns (bool)
```

### coachingEnabled

```solidity
function coachingEnabled(uint256 tokenId) external view returns (bool)
```

### coachingRefundable

```solidity
function coachingRefundable(uint256 tokenId) external view returns (bool)
```

### getContentPriceAndCurrency

```solidity
function getContentPriceAndCurrency(uint256 tokenId, uint256 partId) external view returns (uint256, bytes32)
```

### getCoachingPriceAndCurrency

```solidity
function getCoachingPriceAndCurrency(uint256 tokenId) external view returns (uint256, bytes32)
```

### getPartNumberOfContent

```solidity
function getPartNumberOfContent(uint256 tokenId) external view returns (uint256)
```

