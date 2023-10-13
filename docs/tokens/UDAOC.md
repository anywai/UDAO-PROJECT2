# Solidity API

## UDAOContent

### contractManager

```solidity
contract ContractManager contractManager
```

### _tokenIds

```solidity
struct Counters.Counter _tokenIds
```

### SIGNING_DOMAIN

```solidity
string SIGNING_DOMAIN
```

### SIGNATURE_VERSION

```solidity
string SIGNATURE_VERSION
```

### ISupVis

```solidity
contract ISupervision ISupVis
```

### roleManager

```solidity
contract IRoleManager roleManager
```

### constructor

```solidity
constructor(address rmAddress) public
```

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| rmAddress | address | The address of the deployed role manager |

### isSellable

```solidity
mapping(uint256 => bool) isSellable
```

### contentPrice

```solidity
mapping(uint256 => mapping(uint256 => uint256)) contentPrice
```

### partNumberOfContent

```solidity
mapping(uint256 => uint256) partNumberOfContent
```

### newPartAdded

```solidity
event newPartAdded(uint256 tokenId, uint256 newPartId, uint256 newPartPrice)
```

This event is triggered when a new part is added to a content

### AddressesUpdated

```solidity
event AddressesUpdated(address isupvis)
```

This event is triggered if the contract manager updates the addresses.

### KYCRequirementForCreateContentChanged

```solidity
event KYCRequirementForCreateContentChanged(bool status)
```

Triggered when KYC requirement for content creating is changed

### RedeemVoucher

```solidity
struct RedeemVoucher {
  uint256 validUntil;
  uint256[] _contentPrice;
  uint256 tokenId;
  string _uri;
  address _redeemer;
  uint256 redeemType;
  uint256 validationScore;
  bytes signature;
}
```

### setSellable

```solidity
function setSellable(uint256 _tokenId, bool _isSellable) external
```

Allows sale controller to set sellable status of a content

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _tokenId | uint256 | id of the content |
| _isSellable | bool | is content sellable |

### setContractManager

```solidity
function setContractManager(address _contractManager) external
```

Allows backend to set the contract manager address

_This function is needed because the contract manager address is not known at compile time._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _contractManager | address | The address of the contract manager |

### updateAddresses

```solidity
function updateAddresses() external
```

Get the updated addresses from contract manager

### createContent

```solidity
function createContent(struct UDAOContent.RedeemVoucher voucher) public
```

Redeems a RedeemVoucher for an actual NFT, creating it in the process.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| voucher | struct UDAOContent.RedeemVoucher | A RedeemVoucher describing an unminted NFT. |

### isCalldataStringEmpty

```solidity
function isCalldataStringEmpty(string input) internal pure returns (bool)
```

Checks if a string is empty

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| input | string | The string to check |

### modifyContent

```solidity
function modifyContent(struct UDAOContent.RedeemVoucher voucher) external
```

Redeems a RedeemVoucher for an actual NFT, modifying existing content in the process.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| voucher | struct UDAOContent.RedeemVoucher | A RedeemVoucher describing an unminted NFT. |

### getContentPriceAndCurrency

```solidity
function getContentPriceAndCurrency(uint256 tokenId, uint256 partId) external view returns (uint256)
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

### existsBatch

```solidity
function existsBatch(uint256[] tokenId) external view returns (bool[])
```

Allows off-chain check if a token(content) exists

### exists

```solidity
function exists(uint256 tokenId) external view returns (bool)
```

Allows off-chain check if a token(content) exists

### tokenURI

```solidity
function tokenURI(uint256 tokenId) public view returns (string)
```

### _hash

```solidity
function _hash(struct UDAOContent.RedeemVoucher voucher) internal view returns (bytes32)
```

Returns a hash of the given RedeemVoucher, prepared using EIP712 typed data hashing rules.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| voucher | struct UDAOContent.RedeemVoucher | A RedeemVoucher to hash. |

### getChainID

```solidity
function getChainID() external view returns (uint256)
```

Returns the chain id of the current blockchain.

_This is used to workaround an issue with ganache returning different values from the on-chain chainid() function and
 the eth_chainId RPC method. See https://github.com/protocol/nft-website/issues/121 for context._

### _verify

```solidity
function _verify(struct UDAOContent.RedeemVoucher voucher) internal view returns (address)
```

Verifies the signature for a given RedeemVoucher, returning the address of the signer.

_Will revert if the signature is invalid. Does not verify that the signer is authorized to mint NFTs._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| voucher | struct UDAOContent.RedeemVoucher | A RedeemVoucher describing an unminted NFT. |

### supportsInterface

```solidity
function supportsInterface(bytes4 interfaceId) public view returns (bool)
```

### pause

```solidity
function pause() external
```

### unpause

```solidity
function unpause() external
```

