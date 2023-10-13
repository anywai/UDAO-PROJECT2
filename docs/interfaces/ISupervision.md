# Solidity API

## ISupervision

### getIsValidated

```solidity
function getIsValidated(uint256 tokenId) external view returns (uint256)
```

### getValidatorScore

```solidity
function getValidatorScore(address _validator, uint256 _round) external view returns (uint256)
```

### setValidationStatus

```solidity
function setValidationStatus(uint256 tokenId, uint256 status) external
```

### getTotalValidationScore

```solidity
function getTotalValidationScore() external view returns (uint256)
```

### getValidatorsOfVal

```solidity
function getValidatorsOfVal(uint256 validationId) external view returns (address[])
```

### getLatestValidationIdOfToken

```solidity
function getLatestValidationIdOfToken(uint256 tokenId) external view returns (uint256)
```

### getJurorScore

```solidity
function getJurorScore(address _juror, uint256 _round) external view returns (uint256)
```

### getTotalJurorScore

```solidity
function getTotalJurorScore() external view returns (uint256)
```

### createValidation

```solidity
function createValidation(uint256 tokenId, uint256 score) external
```

### nextRound

```solidity
function nextRound() external
```

### dismissValidation

```solidity
function dismissValidation(address demissionAdress) external
```

### dismissDispute

```solidity
function dismissDispute(address demissionAdress) external
```

