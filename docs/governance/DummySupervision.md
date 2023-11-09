# Solidity API

## DummySupervision

### emptyMapping

```solidity
mapping(uint256 => uint256) emptyMapping
```

### getIsValidated

```solidity
function getIsValidated(uint256 tokenId) external view returns (uint256)
```

Returns the validation result of a token

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| tokenId | uint256 | The ID of a token |

### createValidation

```solidity
function createValidation(uint256 tokenId, uint256 score) external
```

starts new validation for content

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| tokenId | uint256 | id of the content that will be validated |
| score | uint256 | validation score of the content |

### dismissValidation

```solidity
function dismissValidation(address demissionAddress) external
```

allows validators to be fired or resigned

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| demissionAddress | address | is the address that will be revoked from validator role |

### dismissDispute

```solidity
function dismissDispute(address demissionAddress) external
```

allows validators to dismiss a validation assignment

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| demissionAddress | address | id of the content that will be dismissed |

