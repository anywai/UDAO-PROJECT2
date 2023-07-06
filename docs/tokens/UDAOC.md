# Solidity API

## UDAOContent

### _tokenIds

```solidity
struct Counters.Counter _tokenIds
```

### constructor

```solidity
constructor(address irmAdress) public
```

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| irmAdress | address | The address of the deployed role manager |

### contentPrice

```solidity
mapping(uint256 => mapping(uint256 => uint256)) contentPrice
```

### currencyName

```solidity
mapping(uint256 => bytes32) currencyName
```

### partNumberOfContent

```solidity
mapping(uint256 => uint256) partNumberOfContent
```

### coachingEnabled

```solidity
mapping(uint256 => bool) coachingEnabled
```

### coachingPrice

```solidity
mapping(uint256 => uint256) coachingPrice
```

### coachingCurrency

```solidity
mapping(uint256 => bytes32) coachingCurrency
```

### coachingRefundable

```solidity
mapping(uint256 => bool) coachingRefundable
```

### newPartAdded

```solidity
event newPartAdded(uint256 tokenId, uint256 newPartId, uint256 newPartPrice)
```

### redeem

```solidity
function redeem(uint256[] _contentPrice, string _currencyName, string _uri, address _redeemer, uint256 _coachingPrice, string _coachingCurrencyName, bool _isCoachingEnabled, bool _isCoachingRefundable) public
```

Redeems a ContentVoucher for an actual NFT, creating it in the process.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _contentPrice | uint256[] | The price of the content, first price is the full price |
| _currencyName | string | Name of the selling currency |
| _uri | string | The metadata URI to associate with this token. |
| _redeemer | address | Address of the redeemer |
| _coachingPrice | uint256 | The price of the coaching service |
| _coachingCurrencyName | string | Name of the coaching currency |
| _isCoachingEnabled | bool | Whether learner can buy coaching or not |
| _isCoachingRefundable | bool | Whether coaching is refundable or not |

### modifyContent

```solidity
function modifyContent(uint256 tokenId, uint256[] _contentPrice, string _currencyName, string _uri) external
```

Allows token owners to burn the token

### addNewPart

```solidity
function addNewPart(uint256 tokenId, uint256 newPartId, uint256 newPartPrice, string _currencyName) external
```

_Allows content owners to insert new parts_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| tokenId | uint256 | The id of the token |
| newPartId | uint256 | The id of the new part |
| newPartPrice | uint256 | The price of the new part |
| _currencyName | string |  |

### _insertNewPart

```solidity
function _insertNewPart(uint256 tokenId, uint256 newPartId, uint256 newPartPrice) internal
```

_Internal function to insert a new part in between existing parts_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| tokenId | uint256 | The id of the token |
| newPartId | uint256 | The id of the new part |
| newPartPrice | uint256 | The price of the new part |

### enableCoaching

```solidity
function enableCoaching(uint256 tokenId) external
```

Allows instructers' to enable coaching for a specific content

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| tokenId | uint256 | The content id |

### disableCoaching

```solidity
function disableCoaching(uint256 tokenId) external
```

Allows instructers' to disable coaching for a specific content

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| tokenId | uint256 | tokenId of the content that will be not coached |

### isCoachingEnabled

```solidity
function isCoachingEnabled(uint256 tokenId) external view returns (bool)
```

Returns if a coaching enabled for a token or not

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| tokenId | uint256 | the content ID of the token |

### setCoachingPriceAndCurrency

```solidity
function setCoachingPriceAndCurrency(uint256 tokenId, uint256 price, bytes32 currency) external
```

sets the coaching price and currency of a specific content

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| tokenId | uint256 | the content ID of the token |
| price | uint256 | the price of the coaching |
| currency | bytes32 | the currency of the coaching |

### getCoachingPriceAndCurrency

```solidity
function getCoachingPriceAndCurrency(uint256 tokenId) external view returns (uint256, bytes32)
```

returns the coaching price and currency of a specific content

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| tokenId | uint256 | the content ID of the token |

### getContentPriceAndCurrency

```solidity
function getContentPriceAndCurrency(uint256 tokenId, uint256 partId) external view returns (uint256, bytes32)
```

returns the price of a specific content

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| tokenId | uint256 | the content ID of the token |
| partId | uint256 | the part ID of the token (microlearning), full content price if 0 |

### setFullPriceContent

```solidity
function setFullPriceContent(uint256 tokenId, uint256 _contentPrice) external
```

allows content owners to set full content price

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| tokenId | uint256 | the content ID of the token |
| _contentPrice | uint256 | the price to set |

### setPartialContent

```solidity
function setPartialContent(uint256 tokenId, uint256 partId, uint256 _contentPrice) external
```

allows content owners to set price for a part in a content (microlearning)

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| tokenId | uint256 | the content ID of the token |
| partId | uint256 |  |
| _contentPrice | uint256 | the price to set |

### setBatchPartialContent

```solidity
function setBatchPartialContent(uint256 tokenId, uint256[] partId, uint256[] _contentPrice) external
```

allows content owners to set price for multiple parts in a content (microlearning)

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| tokenId | uint256 | the content ID of the token |
| partId | uint256[] |  |
| _contentPrice | uint256[] | the price to set |

### setBatchFullContent

```solidity
function setBatchFullContent(uint256 tokenId, uint256[] partId, uint256[] _contentPrice) external
```

allows content owners to set price for full content and multiple parts in a content

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| tokenId | uint256 | the content ID of the token |
| partId | uint256[] |  |
| _contentPrice | uint256[] | the price to set, first price is for full content price |

### _getPartNumberOfContent

```solidity
function _getPartNumberOfContent(uint256 tokenId) internal view returns (uint256)
```

Returns the part numbers that a content has

### getPartNumberOfContent

```solidity
function getPartNumberOfContent(uint256 tokenId) external view returns (uint256)
```

Returns the part numbers that a content has

### burn

```solidity
function burn(uint256 tokenId) external
```

A content can be completely removed by the owner

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| tokenId | uint256 | The token ID of a content |

### _burn

```solidity
function _burn(uint256 tokenId) internal
```

### _beforeTokenTransfer

```solidity
function _beforeTokenTransfer(address from, address to, uint256 tokenId) internal virtual
```

_Hook that is called before any token transfer. This includes minting
and burning.

Calling conditions:

- When `from` and `to` are both non-zero, ``from``'s `tokenId` will be
transferred to `to`.
- When `from` is zero, `tokenId` will be minted for `to`.
- When `to` is zero, ``from``'s `tokenId` will be burned.
- `from` and `to` are never both zero.

To learn more about hooks, head to xref:ROOT:extending-contracts.adoc#using-hooks[Using Hooks]._

### exists

```solidity
function exists(uint256 tokenId) external view returns (bool)
```

Allows off-chain check if a token(content) exists

### tokenURI

```solidity
function tokenURI(uint256 tokenId) public view returns (string)
```

### supportsInterface

```solidity
function supportsInterface(bytes4 interfaceId) public view returns (bool)
```

