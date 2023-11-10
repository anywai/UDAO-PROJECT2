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

### isNotBanned

```solidity
function isNotBanned(address _userAddress, uint256 _functionID) internal view returns (bool)
```

### isKYCed

```solidity
function isKYCed(address _userAddress, uint256 _functionID) internal view returns (bool)
```

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

