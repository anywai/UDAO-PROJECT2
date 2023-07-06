# Solidity API

## RoleManager

### VALIDATOR_ROLE

```solidity
bytes32 VALIDATOR_ROLE
```

### SUPER_VALIDATOR_ROLE

```solidity
bytes32 SUPER_VALIDATOR_ROLE
```

### JUROR_ROLE

```solidity
bytes32 JUROR_ROLE
```

### BACKEND_ROLE

```solidity
bytes32 BACKEND_ROLE
```

### STAKING_CONTRACT

```solidity
bytes32 STAKING_CONTRACT
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

### checkRole

```solidity
function checkRole(bytes32 role, address account) external view
```

Used for checking if the given account has the asked role

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| role | bytes32 | The name of the role to check |
| account | address | The address of the account to check |

### checkRoles

```solidity
function checkRoles(bytes32[] roles, address account) external view
```

Used for checking if given account has given multiple roles

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| roles | bytes32[] | The name of the roles to check |
| account | address | The address of the account to check |

### _checkRoles

```solidity
function _checkRoles(bytes32[] roles, address account) internal view virtual
```

Modified AccessControl checkRoles for multiple role check

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| roles | bytes32[] | The name of the roles to check |
| account | address | The address of the account to check |

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

### isKYCed

```solidity
function isKYCed(address _address) external view returns (bool)
```

gets KYC result of the address

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _address | address | wallet that KYC result will be sent |

### isBanned

```solidity
function isBanned(address _address) external view returns (bool)
```

gets ban result of the address

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _address | address | wallet that ban result will be sent |

### grantRoleStaker

```solidity
function grantRoleStaker(bytes32 role, address user) external
```

### revokeRoleStaker

```solidity
function revokeRoleStaker(bytes32 role, address user) external
```

