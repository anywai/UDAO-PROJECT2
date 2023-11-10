# Solidity API

## updRoleManager

### updateAddresses

```solidity
function updateAddresses(address supervisionAddress) external
```

## updUDAOC

### updateAddresses

```solidity
function updateAddresses(address roleManagerAddress, address supervisionAddress) external
```

## updUDAOCert

### updateAddresses

```solidity
function updateAddresses(address roleManagerAddress) external
```

## updVoucherVerifier

### updateAddresses

```solidity
function updateAddresses(address roleManagerAddress) external
```

## updPlatformTreasury

### updateAddresses

```solidity
function updateAddresses(address udaoAddress, address udaocAddress, address roleManagerAddress, address governanceTreasuryAddress, address voucherVerifierAddress) external
```

## updSupervision

### updateAddresses

```solidity
function updateAddresses(address roleManagerAddress, address udaocAddress, address platformTreasuryAddress, address udaoStakerAddres) external
```

## updUDAOvp

### updateAddresses

```solidity
function updateAddresses(address roleManagerAddress, address udaoStakerAddres) external
```

## updUDAOStaker

### updateAddresses

```solidity
function updateAddresses(address roleManagerAddress, address udaoAddress, address platformTreasuryAddress, address udaoVpAddress) external
```

## updUDAOGovernor

### updateAddresses

```solidity
function updateAddresses(address roleManagerAddress, address udaoStakerAddress) external
```

## ContractManager

### udaoAddress

```solidity
address udaoAddress
```

### roleManagerAddress

```solidity
address roleManagerAddress
```

### governanceTreasuryAddress

```solidity
address governanceTreasuryAddress
```

### supervisionAddress

```solidity
address supervisionAddress
```

### udaocAddress

```solidity
address udaocAddress
```

### udaoCertAddress

```solidity
address udaoCertAddress
```

### voucherVerifierAddress

```solidity
address voucherVerifierAddress
```

### platformTreasuryAddress

```solidity
address platformTreasuryAddress
```

### udaoVpAddress

```solidity
address udaoVpAddress
```

### udaoStakerAddress

```solidity
address udaoStakerAddress
```

### udaoGovernorAddress

```solidity
address udaoGovernorAddress
```

### StakingContractAddress

```solidity
address StakingContractAddress
```

_Below should be set after the deployment
TODO OLD CODE_

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

_Below needs to be set during deployment
TODO OLD CODE_

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

_unknown if before or after
TODO OLD CODE_

### VoucherVerifierAddress

```solidity
address VoucherVerifierAddress
```

### constructor

```solidity
constructor(address _roleManagerAddress) public
```

### setMVPAddreses

```solidity
function setMVPAddreses(address _udaoAddress, address _roleManagerAddress, address _udaocAddress, address _udaoCertAddress, address _voucherVerifierAddress, address _platformTreasuryAddress) external
```

### setDummyAddreses

```solidity
function setDummyAddreses(address _governanceTreasuryAddress, address _supervisionAddress) external
```

### setGovernanceUpdateAddreses

```solidity
function setGovernanceUpdateAddreses(address _udaoVpAddress, address _udaoStakerAddress, address _udaoGovernorAddress) external
```

### callUpdAddFunctionsMVP

```solidity
function callUpdAddFunctionsMVP() external
```

### callUpdAddFunctionsGoverUpd

```solidity
function callUpdAddFunctionsGoverUpd() external
```

### setGovernanceTreasuryAddress

```solidity
function setGovernanceTreasuryAddress(address _governanceTreasuryAddress) external
```

TODO OLD CODE BELOW

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

