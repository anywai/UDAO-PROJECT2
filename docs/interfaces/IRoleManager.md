# Solidity API

## IRoleManager

### hasRoles

```solidity
function hasRoles(bytes32[] roles, address account) external view returns (bool)
```

### isKYCed

```solidity
function isKYCed(address _address, uint256 functionId) external view returns (bool)
```

### isBanned

```solidity
function isBanned(address _address, uint256 functionId) external view returns (bool)
```

### grantRoleStaker

```solidity
function grantRoleStaker(bytes32 role, address user) external
```

### revokeRoleStaker

```solidity
function revokeRoleStaker(bytes32 role, address user) external
```

