# Solidity API

## RoleController

### VALIDATOR_ROLE

```solidity
bytes32 VALIDATOR_ROLE
```

### SUPER_VALIDATOR_ROLE

```solidity
bytes32 SUPER_VALIDATOR_ROLE
```

### BACKEND_ROLE

```solidity
bytes32 BACKEND_ROLE
```

### FOUNDATION_ROLE

```solidity
bytes32 FOUNDATION_ROLE
```

### STAKING_CONTRACT

```solidity
bytes32 STAKING_CONTRACT
```

### GOVERNANCE_ROLE

```solidity
bytes32 GOVERNANCE_ROLE
```

### GOVERNANCE_CONTRACT

```solidity
bytes32 GOVERNANCE_CONTRACT
```

### JUROR_ROLE

```solidity
bytes32 JUROR_ROLE
```

### JUROR_CONTRACT

```solidity
bytes32 JUROR_CONTRACT
```

### TREASURY_CONTRACT

```solidity
bytes32 TREASURY_CONTRACT
```

### VALIDATION_MANAGER

```solidity
bytes32 VALIDATION_MANAGER
```

### CORPORATE_ROLE

```solidity
bytes32 CORPORATE_ROLE
```

### validator_roles

```solidity
bytes32[] validator_roles
```

Role group for validators

### administrator_roles

```solidity
bytes32[] administrator_roles
```

Role group for administrator roles

### IRM

```solidity
contract IRoleManager IRM
```

### onlyRole

```solidity
modifier onlyRole(bytes32 role)
```

onlyRole is used to check if the msg.sender has the a role required to call that function

### onlyRoles

```solidity
modifier onlyRoles(bytes32[] roles)
```

onlyRole is used to check if the msg.sender has one of the roles required to call that function

### constructor

```solidity
constructor(address rmAddress) internal
```

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| rmAddress | address | The address of the deployed role manager |

### pause

```solidity
function pause() public
```

pauses function

### unpause

```solidity
function unpause() public
```

unpauses function

