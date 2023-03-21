// SPDX-License-Identifier: MIT
/// @title Gets UDAO-USD conversion rate from oracle
pragma solidity ^0.8.4;

import "./uniswap-0.8/v3-core/contracts/interfaces/IUniswapV3Factory.sol";
import "./uniswap-0.8/v3-periphery/contracts/libraries/OracleLibrary.sol";
import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";
import "./IPriceGetter.sol";

contract PriceGetter is IPriceGetter {
    AggregatorV3Interface internal priceFeed;
    address public token0;
    address public token1;
    address public pool;

    constructor(
        address _factory,
        address _token0,
        address _token1,
        uint24 _fee
    ) {
        token0 = _token0;
        token1 = _token1;

        address _pool = IUniswapV3Factory(_factory).getPool(
            _token0,
            _token1,
            _fee
        );
        require(_pool != address(0), "pool doesn't exist");

        pool = _pool;
    }

    function getUdaoOut(
        address tokenIn,
        uint128 amountIn
    ) external view returns (uint amountOut) {
        uint32 secondsAgo = 20;
        require(tokenIn == token0 || tokenIn == token1, "invalid token");

        address tokenOut = tokenIn == token0 ? token1 : token0;

        /// @dev Consult has calculations that are unnecessary for us. Below is
        // "consult" but some parts are stripped out
        // (int24 tick, ) = OracleLibrary.consult(pool, secondsAgo);

        // Code copied from OracleLibrary.sol, consult()
        uint32[] memory secondsAgos = new uint32[](2);
        secondsAgos[0] = secondsAgo;
        secondsAgos[1] = 0;

        // int56 since tick * time = int24 * uint32
        // 56 = 24 + 32
        (int56[] memory tickCumulatives, ) = IUniswapV3Pool(pool).observe(
            secondsAgos
        );

        int56 tickCumulativesDelta = tickCumulatives[1] - tickCumulatives[0];

        // int56 / uint32 = int24
        int24 tick = int24(tickCumulativesDelta / secondsAgo);
        // Always round to negative infinity
        /*
        int doesn't round down when it is negative

        int56 a = -3
        -3 / 10 = -3.3333... so round down to -4
        but we get
        a / 10 = -3

        so if tickCumulativeDelta < 0 and division has remainder, then round
        down
        */
        if (
            tickCumulativesDelta < 0 && (tickCumulativesDelta % secondsAgo != 0)
        ) {
            tick--;
        }

        amountOut = OracleLibrary.getQuoteAtTick(
            tick,
            amountIn,
            tokenIn,
            tokenOut
        );
    }

    /// @notice Get current price of UDAO in Matic from uniswap
    function convertMaticToUdao() internal {}

    /// @notice Get current price of Matic in fiat from chainlink
    function convertFiatToMatic(uint256 val) external view returns (int) {
        uint256 msgValueInUSD = (
            ((val * (uint256)(getLatestPrice())) / (10 ** 18))
        );
        return msgValueInUSD;
    }

    /// @notice Get current price of 1 Matic in fiat from chainlink
    function getLatestPrice(string memory fiat) public view returns (int) {
        /// @dev MATIC / USD address on Mumbai
        priceFeed = AggregatorV3Interface(
            0xAB594600376Ec9fD91F8e885dADF0CE036862dE0
        );
        (
            ,
            /* uint80 roundID */ int price /*uint startedAt*/ /*uint timeStamp*/ /*uint80 answeredInRound*/,
            ,
            ,

        ) = priceFeed.latestRoundData();

        if (fiat == "eur") {
            priceFeed = 0x73366fe0aa0ded304479862808e02506fe556a98;
        } else if (fiat == "jpy") {
            priceFeed = 0xd647a6fc9bc6402301583c91decc5989d8bc382d;
        } else if (fiat = "aud") {
            priceFeed = 0x062df9c4efd2030e243ffcc398b652e8b8f95c6f;
        } else if (fiat == "cad") {
            priceFeed = 0xaca44abb8b04d07d883202f99fa5e3c53ed57fb5;
        } else if (fiat == "chf") {
            priceFeed = 0xc76f762cedf0f78a439727861628e0fdfe1e70c2;
        } else if (fiat == "gbp") {
            priceFeed = 0x099a2540848573e94fb1ca0fa420b00acbbc845a;
        } else if (fiat == "usd") {
            continue;
        } else {
            revert("Unsupported fiat");
        }

        if (fiat != "usd") {
            (
                ,
                /* uint80 roundID */ int fiatToUsdPrice /*uint startedAt*/ /*uint timeStamp*/ /*uint80 answeredInRound*/,
                ,
                ,

            ) = priceFeed.latestRoundData();

            price = (fiatToUsdPrice * 10 ** 8) / price; // Matic per fiat
        }

        return (price);
    }
}
