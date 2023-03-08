# Solidity API

## IValidationManager

### getIsValidated

```solidity
function getIsValidated(uint256 tokenId) external view returns (bool)
```

### getValidatorScore

```solidity
function getValidatorScore(address _validator, uint256 _round) external view returns (uint256)
```

### getTotalValidationScore

```solidity
function getTotalValidationScore() external view returns (uint256)
```

### nextRound

```solidity
function nextRound() external
```

### getValidatorsOfVal

```solidity
function getValidatorsOfVal(uint256 validationId) external view returns (address[])
```

### getLatestValidationIdOfToken

```solidity
function getLatestValidationIdOfToken(uint256 tokenId) external view returns (uint256)
```

