# Solidity API

## IRoleManager

### checkRole

```solidity
function checkRole(bytes32 roles, address account) external view
```

### checkRoles

```solidity
function checkRoles(bytes32[] roles, address account) external view
```

### isKYCed

```solidity
function isKYCed(address _address) external view returns (bool)
```

### isBanned

```solidity
function isBanned(address _address) external view returns (bool)
```

### grantRoleStaker

```solidity
function grantRoleStaker(bytes32 role, address user) external
```

### revokeRoleStaker

```solidity
function revokeRoleStaker(bytes32 role, address user) external
```

