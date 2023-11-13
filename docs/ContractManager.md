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

Address record of UDAO Token Contract

### roleManagerAddress

```solidity
address roleManagerAddress
```

Address record of RoleManager Contract

### udaocAddress

```solidity
address udaocAddress
```

Address record of UDAOC Token Contract

### udaoCertAddress

```solidity
address udaoCertAddress
```

Address record of UDAO-Cert Token Contract

### voucherVerifierAddress

```solidity
address voucherVerifierAddress
```

Address record of Voucher Verifier Contract

### platformTreasuryAddress

```solidity
address platformTreasuryAddress
```

Address record of Platform Treasury Contract

### governanceTreasuryAddress

```solidity
address governanceTreasuryAddress
```

Address record of Governance Treasury Contract

_The Governance Treasury contract is a placeholder with a dummy version on the MVP release and needs to be replaced with a functional contract._

### supervisionAddress

```solidity
address supervisionAddress
```

Address record of Supervision Contract

_The Supervision contract is a placeholder with a dummy version on the MVP release and needs to be replaced with a functional contract._

### udaoVpAddress

```solidity
address udaoVpAddress
```

Address record of UDAO-VP Token Contract

### udaoStakerAddress

```solidity
address udaoStakerAddress
```

Address record of UDAO Staker Contract

### udaoGovernorAddress

```solidity
address udaoGovernorAddress
```

Address record of UDAO Governor Contract

### constructor

```solidity
constructor(address _roleManagerAddress) public
```

### setAddresesVersion1Contracts

```solidity
function setAddresesVersion1Contracts(address _udaoAddress, address _roleManagerAddress, address _udaocAddress, address _udaoCertAddress, address _voucherVerifierAddress, address _platformTreasuryAddress) external
```

This function updates the addresses records held in this contract for the contracts used in UDAO Project version1.0

_Intended for use after the release of UDAO version 1.0 to perform bulk updates on address records for UDAO Project version 1.0 contracts._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _udaoAddress | address | The new address recond of the UDAO token contract to be held in this contract. |
| _roleManagerAddress | address | The new address recond of the Role Manager contract to be held in this contract. |
| _udaocAddress | address | The new address recond of the UDAOC (Content) token contract to be held in this contract. |
| _udaoCertAddress | address | The new address recond of the UDAO-Cert token contract to be held in this contract. |
| _voucherVerifierAddress | address | The new address recond of the Voucher Verifier contract to be held in this contract. |
| _platformTreasuryAddress | address | The new address recond of the Platform Treasury contract to be held in this contract. |

### setAddresesCommonInVersion1and2

```solidity
function setAddresesCommonInVersion1and2(address _governanceTreasuryAddress, address _supervisionAddress) external
```

This function updates the addresses records held in this contract for the common contracts used in UDAO Project version 1.0 and 2.0

_Intended for use after the release of UDAO version 1.0 and 2.0 to update Governance Treasury and Supervison contract address records._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _governanceTreasuryAddress | address | The new address recond of the Governance Treasury contract to be held in this contract. |
| _supervisionAddress | address | The new address recond of the Supervision contract to be held in this contract. |

### setAddresesVersion2GovernanceContracts

```solidity
function setAddresesVersion2GovernanceContracts(address _udaoVpAddress, address _udaoStakerAddress, address _udaoGovernorAddress) external
```

This function updates the addresses records held in this contract for the contracts used in UDAO Project version2.0 (Governance Update)

_Intended for use after the release of UDAO version 2.0 to perform bulk updates on address records for UDAO Project version 2.0 contracts._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _udaoVpAddress | address | The new address recond of the UDAO-VP token contract to be held in this contract. |
| _udaoStakerAddress | address | The new address recond of the UDAO Staker contract to be held in this contract. |
| _udaoGovernorAddress | address | The new address recond of the UDAO Governor contract to be held in this contract. |

### syncVersion1ContractAddresses

```solidity
function syncVersion1ContractAddresses() external
```

Updates and syncs addresses of UDAO version 1.0 contracts.

_This function performs contract wise address updates on UDAO version 1.0 contracts and synchronizes them with the records in this contract._

### syncVersion2ContractAddresses

```solidity
function syncVersion2ContractAddresses() external
```

Updates and syncs addresses of UDAO version 2.0 contracts.

_This function performs contract wise address updates on UDAO version 2.0 contracts and synchronizes them with the records in this contract._

### setAddressUDAOContract

```solidity
function setAddressUDAOContract(address _udaoAddress) external
```

This function updates the address record held in this contract for the UDAO token contract

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _udaoAddress | address | The new address recond of the UDAO token contract to be held in this contract. |

### setAddressRoleManagerContract

```solidity
function setAddressRoleManagerContract(address _roleManagerAddress) external
```

This function updates the address record held in this contract for the Role Manager contract

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _roleManagerAddress | address | The new address recond of the Role Manager contract to be held in this contract. |

### setAddressUDAOCContract

```solidity
function setAddressUDAOCContract(address _udaocAddress) external
```

This function updates the address record held in this contract for the UDAOContent token contract

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _udaocAddress | address | The new address recond of the UDAOC (Content) token contract to be held in this contract. |

### setAddressUDAOCertContract

```solidity
function setAddressUDAOCertContract(address _udaoCertAddress) external
```

This function updates the address record held in this contract for the UDAO-Cert token contract

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _udaoCertAddress | address | The new address recond of the UDAO-Cert token contract to be held in this contract. |

### setAddressVoucherVerifierContract

```solidity
function setAddressVoucherVerifierContract(address _voucherVerifierAddress) external
```

This function updates the address record held in this contract for the Voucher Verifier contract

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _voucherVerifierAddress | address | The new address recond of the Voucher Verifier contract to be held in this contract. |

### setAddressPlatformTreasuryContract

```solidity
function setAddressPlatformTreasuryContract(address _platformTreasuryAddress) external
```

This function updates the address record held in this contract for the Platform Treasury contract

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _platformTreasuryAddress | address | The new address recond of the Platform Treasury contract to be held in this contract. |

### setAddressGovernanceTreasuryContract

```solidity
function setAddressGovernanceTreasuryContract(address _governanceTreasuryAddress) external
```

This function updates the address record held in this contract for the Governance Treasury contract

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _governanceTreasuryAddress | address | The new address recond of the Governance Treasury contract to be held in this contract. |

### setAddressSupervisionContract

```solidity
function setAddressSupervisionContract(address _supervisionAddress) external
```

This function updates the address record held in this contract for the Supervision contract

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _supervisionAddress | address | The new address recond of the Supervision contract to be held in this contract. |

### setAddressUDAOvpContract

```solidity
function setAddressUDAOvpContract(address _udaoVpAddress) external
```

This function updates the address record held in this contract for the UDAO-VP token contract

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _udaoVpAddress | address | The new address recond of the UDAO-VP token contract to be held in this contract. |

### setAddressUDAOStakerContract

```solidity
function setAddressUDAOStakerContract(address _udaoStakerAddress) external
```

This function updates the address record held in this contract for the UDAO Staker contract

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _udaoStakerAddress | address | The new address recond of the UDAO Staker contract to be held in this contract. |

### setAddressUDAOGovernorContract

```solidity
function setAddressUDAOGovernorContract(address _udaoGovernorAddress) external
```

This function updates the address record held in this contract for the UDAO Governor contract

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _udaoGovernorAddress | address | The new address recond of the UDAO Governor contract to be held in this contract. |

