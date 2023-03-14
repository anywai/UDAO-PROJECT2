# Solidity API

## UDAOContent

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

### ContentVoucher

```solidity
struct ContentVoucher {
  uint256 tokenId;
  uint256[] contentPrice;
  string uri;
  address redeemer;
  bool isCoachingEnabled;
  string name;
  string description;
}
```

### coachingEnabled

```solidity
mapping(uint256 => bool) coachingEnabled
```

### redeem

```solidity
function redeem(struct UDAOContent.ContentVoucher voucher) public
```

Redeems a ContentVoucher for an actual NFT, creating it in the process.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| voucher | struct UDAOContent.ContentVoucher | A signed ContentVoucher that describes the NFT to be redeemed. |

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

### getPriceContent

```solidity
function getPriceContent(uint256 tokenId, uint256 partId) external view returns (uint256)
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

_See {IERC165-supportsInterface}._

