# Solidity API

## UDAOCertificate

### SIGNING_DOMAIN

```solidity
string SIGNING_DOMAIN
```

### SIGNATURE_VERSION

```solidity
string SIGNATURE_VERSION
```

### _tokenIdCounter

```solidity
struct Counters.Counter _tokenIdCounter
```

_The counter for certificate token ids._

### AddressesUpdated

```solidity
event AddressesUpdated(address roleManagerAddress)
```

This event is triggered if the contract manager updates the addresses.

### constructor

```solidity
constructor(address roleManagerAddress) public
```

### CertificateVoucher

```solidity
struct CertificateVoucher {
  uint256 tokenId;
  string uri;
  address redeemer;
  string name;
  string description;
  bytes signature;
}
```

### updateAddresses

```solidity
function updateAddresses(address roleManagerAddress) external
```

Get the updated addresses from contract manager

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| roleManagerAddress | address | The address of the role manager contract |

### redeem

```solidity
function redeem(struct UDAOCertificate.CertificateVoucher voucher) public
```

Redeems a CertificateVoucher for an actual NFT, creating it in the process.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| voucher | struct UDAOCertificate.CertificateVoucher | A signed CertificateVoucher that describes the NFT to be redeemed. |

### _hash

```solidity
function _hash(struct UDAOCertificate.CertificateVoucher voucher) internal view returns (bytes32)
```

Returns a hash of the given CertificateVoucher, prepared using EIP712 typed data hashing rules.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| voucher | struct UDAOCertificate.CertificateVoucher | A CertificateVoucher to hash. |

### getChainID

```solidity
function getChainID() external view returns (uint256)
```

Returns the chain id of the current blockchain.

_This is used to workaround an issue with ganache returning different values from the on-chain chainid() function and
 the eth_chainId RPC method. See https://github.com/protocol/nft-website/issues/121 for context._

### _verify

```solidity
function _verify(struct UDAOCertificate.CertificateVoucher voucher) internal view returns (address)
```

Verifies the signature for a given CertificateVoucher, returning the address of the signer.

_Will revert if the signature is invalid. Does not verify that the signer is authorized to mint NFTs._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| voucher | struct UDAOCertificate.CertificateVoucher | A CertificateVoucher describing an unminted NFT. |

### _beforeTokenTransfer

```solidity
function _beforeTokenTransfer(address from, address to, uint256 tokenId) internal virtual
```

Checks if token transfer is allowed.

_Reverts if new receiver is not KYCed or msg.sender is not Backend._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| from | address | The current token owner |
| to | address | Token to send to |
| tokenId | uint256 | The id of the token to transfer |

### emergencyTransfer

```solidity
function emergencyTransfer(address from, address to, uint256 tokenId) external
```

transfer token in emergency if owner approved the backend

_Reverts if msg sender is not Backend or if to address is not KYCed or banned_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| from | address | The current token owner |
| to | address | Token to send to |
| tokenId | uint256 | The id of the token to transfer |

### burn

```solidity
function burn(uint256 tokenId) external
```

burn tokens if owner does not want to have certificate any more

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| tokenId | uint256 | The id of the token to burn |

### _burn

```solidity
function _burn(uint256 tokenId) internal
```

### tokenURI

```solidity
function tokenURI(uint256 tokenId) public view returns (string)
```

### pause

```solidity
function pause() external
```

### unpause

```solidity
function unpause() external
```

