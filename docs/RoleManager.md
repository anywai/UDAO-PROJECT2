# Solidity API

## RoleManager

### contractManager

```solidity
contract ContractManager contractManager
```

### ISupVis

```solidity
contract ISupervision ISupVis
```

### activeKYCFunctions

```solidity
mapping(uint256 => bool) activeKYCFunctions
```

### activeBanFunctions

```solidity
mapping(uint256 => bool) activeBanFunctions
```

### AddressesUpdated

```solidity
event AddressesUpdated(address ContractManagerAddress)
```

### KYCList

```solidity
mapping(address => bool) KYCList
```

### BanList

```solidity
mapping(address => bool) BanList
```

### SetKYC

```solidity
event SetKYC(address user, bool result)
```

events fired when a KYC or Ban is set

### SetBan

```solidity
event SetBan(address user, bool result)
```

### constructor

```solidity
constructor() public
```

Deployer gets the admin role.

### setContractManager

```solidity
function setContractManager(address _contractManager) external
```

### updateAddresses

```solidity
function updateAddresses() external
```

Get the updated addresses from contract manager

### hasRoles

```solidity
function hasRoles(bytes32[] roles, address account) public view returns (bool)
```

Modified AccessControl checkRoles for multiple role check

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| roles | bytes32[] | The name of the roles to check |
| account | address |  |

### setKYC

```solidity
function setKYC(address _address, bool _isKYCed) external
```

set KYC for an account address

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _address | address | address that will be KYCed |
| _isKYCed | bool | result of KYC |

### setBan

```solidity
function setBan(address _address, bool _isBanned) external
```

set ban for an account address

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _address | address | address that will be ban set |
| _isBanned | bool | ban set result |

### setActiveKYCFunctions

```solidity
function setActiveKYCFunctions(uint256 functionId, bool status) external
```

Setter function of activeKYCFunctions

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| functionId | uint256 | function id of the function |
| status | bool | KYC status of the function |

### setActiveBanFunctions

```solidity
function setActiveBanFunctions(uint256 functionId, bool status) external
```

Setter function of activeBanFunctions

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| functionId | uint256 | function id of the function |
| status | bool | Ban status of the function |

### isKYCed

```solidity
function isKYCed(address _address, uint256 functionId) external view returns (bool)
```

gets KYC result of the address

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _address | address | wallet that KYC result will be sent |
| functionId | uint256 |  |

### isBanned

```solidity
function isBanned(address _address, uint256 functionId) external view returns (bool)
```

gets ban result of the address

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _address | address | wallet that ban result will be sent |
| functionId | uint256 |  |

### grantRoleStaker

```solidity
function grantRoleStaker(bytes32 role, address user) external
```

grants a role to an account

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| role | bytes32 | The name of the role to grant |
| user | address | The address of the account to grant the role to |

### revokeRoleStaker

```solidity
function revokeRoleStaker(bytes32 role, address user) external
```

revokes a role from an account

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| role | bytes32 | The name of the role to revoke |
| user | address | The address of the account to revoke the role from |

### grantBackend

```solidity
function grantBackend(address backendAddress) external
```

grants BACKEND_ROLE to a new address

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| backendAddress | address | The address of the backend to grant |

### revokeBackend

```solidity
function revokeBackend(address backendAddress) external
```

revokes BACKEND_ROLE and bans the backend address

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| backendAddress | address | The address of the backend to revoke |

