# Solidity API

## ERC721Locked

_Implementation of https://eips.ethereum.org/EIPS/eip-721[ERC721] Non-Fungible Token Standard, including
the Metadata extension.

 Modified to make it non-transferable._

### constructor

```solidity
constructor(string name_, string symbol_) public
```

_Initializes the contract by setting a `name` and a `symbol` to the token collection._

### supportsInterface

```solidity
function supportsInterface(bytes4 interfaceId) public view virtual returns (bool)
```

_See {IERC165-supportsInterface}._

### balanceOf

```solidity
function balanceOf(address owner) public view virtual returns (uint256)
```

_See {IERC721-balanceOf}._

### ownerOf

```solidity
function ownerOf(uint256 tokenId) public view virtual returns (address)
```

_See {IERC721-ownerOf}._

### name

```solidity
function name() public view virtual returns (string)
```

_See {IERC721Metadata-name}._

### symbol

```solidity
function symbol() public view virtual returns (string)
```

_See {IERC721Metadata-symbol}._

### tokenURI

```solidity
function tokenURI(uint256 tokenId) public view virtual returns (string)
```

_See {IERC721Metadata-tokenURI}._

### _baseURI

```solidity
function _baseURI() internal view virtual returns (string)
```

_Base URI for computing {tokenURI}. If set, the resulting URI for each
token will be the concatenation of the `baseURI` and the `tokenId`. Empty
by default, can be overridden in child contracts._

### approve

```solidity
function approve(address, uint256) public virtual
```

_See {IERC721-approve}._

### getApproved

```solidity
function getApproved(uint256 tokenId) public view virtual returns (address)
```

_See {IERC721-getApproved}._

### _ownerOf

```solidity
function _ownerOf(uint256 tokenId) internal view virtual returns (address)
```

### setApprovalForAll

```solidity
function setApprovalForAll(address, bool) public virtual
```

_See {IERC721-setApprovalForAll}._

### isApprovedForAll

```solidity
function isApprovedForAll(address, address) public view virtual returns (bool)
```

_See {IERC721-isApprovedForAll}._

### transferFrom

```solidity
function transferFrom(address, address, uint256) public virtual
```

_See {IERC721-transferFrom}._

### safeTransferFrom

```solidity
function safeTransferFrom(address, address, uint256) public virtual
```

_See {IERC721-safeTransferFrom}._

### safeTransferFrom

```solidity
function safeTransferFrom(address, address, uint256, bytes) public virtual
```

_See {IERC721-safeTransferFrom}._

### _requireMinted

```solidity
function _requireMinted(uint256 tokenId) internal view virtual
```

### _exists

```solidity
function _exists(uint256 tokenId) internal view virtual returns (bool)
```

### _safeMint

```solidity
function _safeMint(address to, uint256 tokenId) internal virtual
```

### _safeMint

```solidity
function _safeMint(address to, uint256 tokenId, bytes data) internal virtual
```

_Same as {xref-ERC721-_safeMint-address-uint256-}[`_safeMint`], with an additional `data` parameter which is
forwarded in {IERC721Receiver-onERC721Received} to contract recipients._

### _mint

```solidity
function _mint(address to, uint256 tokenId) internal virtual
```

_Mints `tokenId` and transfers it to `to`.

WARNING: Usage of this method is discouraged, use {_safeMint} whenever possible

Requirements:

- `tokenId` must not exist.
- `to` cannot be the zero address.

Emits a {Transfer} event._

### _beforeTokenTransfer

```solidity
function _beforeTokenTransfer(address from, address to, uint256, uint256 batchSize) internal virtual
```

### locked

```solidity
function locked(uint256) external view virtual returns (bool)
```

### defaultLocked

```solidity
function defaultLocked() external view virtual returns (bool)
```

_Returns the current default lock status for tokens.
     The returned value MUST reflect the status indicated by the most recent `DefaultLocked` event._

