module.exports = {
  skipFiles: [
    "uniswap-0.8/v3-core/contracts/interfaces/IUniswapV3Factory.sol",
    "uniswap-0.8/v3-core/contracts/interfaces/IUniswapV3Pool.sol",
    "uniswap-0.8/v3-core/contracts/interfaces/pool/IUniswapV3PoolActions.sol",
    "uniswap-0.8/v3-core/contracts/interfaces/pool/IUniswapV3PoolDerivedState.sol",
    "uniswap-0.8/v3-core/contracts/interfaces/pool/IUniswapV3PoolErrors.sol",
    "uniswap-0.8/v3-core/contracts/interfaces/pool/IUniswapV3PoolEvents.sol",
    "uniswap-0.8/v3-core/contracts/interfaces/pool/IUniswapV3PoolImmutables.sol",
    "uniswap-0.8/v3-core/contracts/interfaces/pool/IUniswapV3PoolOwnerActions.sol",
    "uniswap-0.8/v3-core/contracts/interfaces/pool/IUniswapV3PoolState.sol",
    "uniswap-0.8/v3-core/contracts/libraries/FullMath.sol",
    "uniswap-0.8/v3-core/contracts/libraries/TickMath.sol",
    "uniswap-0.8/v3-periphery/contracts/libraries/OracleLibrary.sol",
  ],
  compileCommand: "npx hardhat compile",
};
