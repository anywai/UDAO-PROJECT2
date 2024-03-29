# Solidity API

## UDAOVp

### stakingContractAddress

```solidity
address stakingContractAddress
```

### contractManager

```solidity
contract ContractManager contractManager
```

### constructor

```solidity
constructor(address rmAddress, address _contractManager) public
```

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| rmAddress | address | The address of the deployed role manager |
| _contractManager | address |  |

### updateAddresses

```solidity
function updateAddresses() external
```

Get the updated addresses from contract manager

### mint

```solidity
function mint(address to, uint256 amount) public
```

Allows staking contract to mint vp token "to" an address

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| to | address | The address of the vp token recipient |
| amount | uint256 | of the vp token |

### allowance

```solidity
function allowance(address owner, address spender) public view virtual returns (uint256)
```

returns allowance of an account for another account

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| owner | address | Owner of the tokens |
| spender | address | Address of the user with allownece rights |

### _afterTokenTransfer

```solidity
function _afterTokenTransfer(address from, address to, uint256 amount) internal
```

### _mint

```solidity
function _mint(address to, uint256 amount) internal
```

### _burn

```solidity
function _burn(address account, uint256 amount) internal
```

