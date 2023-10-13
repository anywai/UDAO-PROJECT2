# Solidity API

## ContractManager

### roleManager

```solidity
contract IRoleManager roleManager
```

### StakingContractAddress

```solidity
address StakingContractAddress
```

_Below should be set after the deployment_

### PlatformTreasuryAddress

```solidity
address PlatformTreasuryAddress
```

### UdaoVpAddress

```solidity
address UdaoVpAddress
```

### ISupVisAddress

```solidity
address ISupVisAddress
```

_Below needs to be set during deployment_

### UdaoAddress

```solidity
address UdaoAddress
```

### UdaocAddress

```solidity
address UdaocAddress
```

### RmAddress

```solidity
address RmAddress
```

### GovernanceTreasuryAddress

```solidity
address GovernanceTreasuryAddress
```

_unknown if before or after_

### VoucherVerifierAddress

```solidity
address VoucherVerifierAddress
```

### constructor

```solidity
constructor(address _supAddress, address _udaoAddress, address _udaocAddress, address _rmAddress) public
```

### setGovernanceTreasuryAddress

```solidity
function setGovernanceTreasuryAddress(address _governanceTreasuryAddress) external
```

### setPlatformTreasuryAddress

```solidity
function setPlatformTreasuryAddress(address _platformTreasuryAddress) external
```

### setAddressStaking

```solidity
function setAddressStaking(address _stakingAddress) external
```

### setAddressUdaoVp

```solidity
function setAddressUdaoVp(address _udaoVpAddress) external
```

### setAddressISupVisAddress

```solidity
function setAddressISupVisAddress(address _supAddress) external
```

### setAddressUdaoAddress

```solidity
function setAddressUdaoAddress(address _udaoAddress) external
```

### setAddressUdaocAddress

```solidity
function setAddressUdaocAddress(address _udaocAddress) external
```

### setAddressIrmAddress

```solidity
function setAddressIrmAddress(address _rmAddress) external
```

### setAddressVoucherVerifierAddress

```solidity
function setAddressVoucherVerifierAddress(address _voucherVerifierAddress) external
```

