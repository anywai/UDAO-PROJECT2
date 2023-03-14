# Solidity API

## IUDAOC

### hasRole

```solidity
function hasRole(bytes32 role, address account) external view returns (bool)
```

### getValidationResults

```solidity
function getValidationResults(address account) external view returns (uint256[2] results)
```

### getTotalValidation

```solidity
function getTotalValidation() external view returns (uint256)
```

### exists

```solidity
function exists(uint256 tokenId) external view returns (bool)
```

### isCoachingEnabled

```solidity
function isCoachingEnabled(uint256 tokenId) external view returns (bool)
```

### getPriceContent

```solidity
function getPriceContent(uint256 tokenId, uint256 partId) external view returns (uint256)
```

### getPartNumberOfContent

```solidity
function getPartNumberOfContent(uint256 tokenId) external view returns (uint256)
```

