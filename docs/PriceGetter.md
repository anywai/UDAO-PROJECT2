# Solidity API

## PriceGetter

### token0

```solidity
address token0
```

### token1

```solidity
address token1
```

### pool

```solidity
address pool
```

### fiatToPriceFeed

```solidity
mapping(bytes32 => contract AggregatorV3Interface) fiatToPriceFeed
```

fiat name => aggregator interface

### constructor

```solidity
constructor(address _factory, address _token0, address _token1, uint24 _fee, address rmAddress) public
```

_token0 = tokenIn (matic) and token1 = tokenOut(udao)_

### getUdaoOut

```solidity
function getUdaoOut(uint128 amountIn, bytes32 fiat) external view returns (uint256 udaoPayment)
```

Get fiat to UDAO token amount

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| amountIn | uint128 | Amount of fiat |
| fiat | bytes32 | Name of the fiat currency |

### convertMaticToUdao

```solidity
function convertMaticToUdao(uint128 amountIn) public view returns (uint256 amountOut)
```

Converts given amount of matic to udao

_token0 = tokenIn (matic) and token1 = tokenOut(udao)_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| amountIn | uint128 | Amount of matic token to convert |

### convertFiatToMatic

```solidity
function convertFiatToMatic(uint256 val, bytes32 fiat) public view returns (uint128)
```

Returns given amount of fiat currency to matic token

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| val | uint256 | Amount of fiat currency |
| fiat | bytes32 | Name of the fiat currency |

### getLatestPrice

```solidity
function getLatestPrice(bytes32 fiat) public view returns (int256)
```

Returns current price of 1 Matic in fiat from chainlink

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| fiat | bytes32 | Name of the fiat currency |

### addNewFiat

```solidity
function addNewFiat(bytes32 fiat, address priceFeedAddress) external
```

Add new fiat currency to the contract can also be used for modifying existing ones

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| fiat | bytes32 | Name of the fiat currency |
| priceFeedAddress | address | Address of the price feed of the fiat currency |

### deleteFiat

```solidity
function deleteFiat(bytes32 fiat) external
```

Delete fiat currency from the contract

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| fiat | bytes32 | Name of the fiat currency |

### getPriceFeedAddress

```solidity
function getPriceFeedAddress(bytes32 fiat) external view returns (address)
```

Get the address of the price feed of the given fiat currency

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| fiat | bytes32 | Name of the fiat currency |

