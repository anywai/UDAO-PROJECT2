# Solidity API

## UDAOContent

### _tokenIds

```solidity
struct Counters.Counter _tokenIds
```

_The counter for content token ids._

### SIGNING_DOMAIN

```solidity
string SIGNING_DOMAIN
```

### SIGNATURE_VERSION

```solidity
string SIGNATURE_VERSION
```

### supervision

```solidity
contract ISupervision supervision
```

### constructor

```solidity
constructor(address roleManagerAddress) public
```

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| roleManagerAddress | address | The address of the deployed role manager |

### isAllowedToBurn

```solidity
bool isAllowedToBurn
```

_isAllowedToBurn is a bool variable that controls whether the backend is allowed to burn a content or not._

### isSellable

```solidity
mapping(uint256 => bool) isSellable
```

_tokenId => true/false (is sellable)_

### contentParts

```solidity
mapping(uint256 => uint256[]) contentParts
```

_tokenId => partIds_

### NewContentCreated

```solidity
event NewContentCreated(uint256 tokenId, address owner)
```

This event is triggered when a new content is created

### ContentModified

```solidity
event ContentModified(uint256 tokenId, address owner, uint256 newPartNumber)
```

This event is triggered when a new part is added to a content

### AddressesUpdated

```solidity
event AddressesUpdated(address RoleManager, address Supervision)
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
  uint256[] _parts;
  uint256 tokenId;
  string _uri;
  address _contentCreator;
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

### setIsAllowedToBurn

```solidity
function setIsAllowedToBurn(bool status) external
```

### updateAddresses

```solidity
function updateAddresses(address roleManagerAddress, address supervisionAddress) external
```

Get the updated addresses from contract manager

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| roleManagerAddress | address | The address of the role manager contract |
| supervisionAddress | address | The address of the supervision contract |

### createContent

```solidity
function createContent(struct UDAOContent.RedeemVoucher voucher) public
```

Redeems a RedeemVoucher for an actual NFT, creating it in the process.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| voucher | struct UDAOContent.RedeemVoucher | A RedeemVoucher describing an unminted NFT. |

### batchCreateContents

```solidity
function batchCreateContents(struct UDAOContent.RedeemVoucher[] voucher) public
```

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

Allows modification of a content by redeeming a voucher.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| voucher | struct UDAOContent.RedeemVoucher | A RedeemVoucher describing an unminted NFT. |

### getContentParts

```solidity
function getContentParts(uint256 tokenId) external view returns (uint256[])
```

returns the parts array of a specific content

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| tokenId | uint256 | the content ID of the token |

### getPartNumberOfContent

```solidity
function getPartNumberOfContent(uint256 tokenId) external view returns (uint256)
```

Returns the part numbers that a content has

### burn

```solidity
function burn(uint256 tokenId) external
```

Burns a content which is not allowed

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| tokenId | uint256 | The id of the token to burn |

### _burn

```solidity
function _burn(uint256 tokenId) internal
```

Burns a content which is not allowed

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| tokenId | uint256 | The id of the token to burn |

### _beforeTokenTransfer

```solidity
function _beforeTokenTransfer(address from, address to, uint256 tokenId) internal virtual
```

Allows transfer of a content with KYC and ban checks

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| from | address | The current token owner |
| to | address | Token to send to |
| tokenId | uint256 | The id of the token to transfer |

### existsBatch

```solidity
function existsBatch(uint256[] tokenIds) external view returns (bool[])
```

Allows off-chain check if batch of tokens(content) exists

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| tokenIds | uint256[] | Array of token IDs |

### exists

```solidity
function exists(uint256 tokenId) external view returns (bool)
```

Allows off-chain check if a token(content) exists

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| tokenId | uint256 | The ID of a token |

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

### pause

```solidity
function pause() external
```

Allows backend to pause the contract

### unpause

```solidity
function unpause() external
```

Allows backend to unpause the contract

### tokenURI

```solidity
function tokenURI(uint256 tokenId) public view returns (string)
```

### supportsInterface

```solidity
function supportsInterface(bytes4 interfaceId) public view returns (bool)
```

