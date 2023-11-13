# Solidity API

## RoleLegacy

### roleManager

```solidity
contract IRoleManager roleManager
```

Role manager contract address

### hasRole

```solidity
function hasRole(bytes32 _role, address _account) internal view returns (bool)
```

Checks if a wallet address has a specific role

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _role | bytes32 | The role to check |
| _account | address | The address to check |

### isNotBanned

```solidity
function isNotBanned(address _userAddress, uint256 _functionID) internal view returns (bool)
```

Checks if a wallet address is banned from a specific function

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _userAddress | address | The address to check |
| _functionID | uint256 | The function to check |

### isKYCed

```solidity
function isKYCed(address _userAddress, uint256 _functionID) internal view returns (bool)
```

Checks if a wallet address is KYCed for a specific function

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _userAddress | address | The address to check |
| _functionID | uint256 | The function to check |

### foundationWallet

```solidity
address foundationWallet
```

Address of foundation wallet is used for sending funds to foundation

### FoundationWalletUpdated

```solidity
event FoundationWalletUpdated(address newAddress)
```

This event is triggered if the foundation wallet address is updated.

### constructor

```solidity
constructor() internal
```

### setFoundationAddress

```solidity
function setFoundationAddress(address _newAddress) external
```

sets foundation wallet addresses

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _newAddress | address | new address of the contract |

