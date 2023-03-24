// SPDX-License-Identifier: MIT
/// @title Gets UDAO-USD conversion rate from oracle
pragma solidity ^0.8.4;

import "./uniswap-0.8/v3-core/contracts/interfaces/IUniswapV3Factory.sol";
import "./uniswap-0.8/v3-periphery/contracts/libraries/OracleLibrary.sol";
import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";
import "./IPriceGetter.sol";

contract PriceGetter is IPriceGetter {
    address public token0;
    address public token1;
    address public pool;

    /// @dev token0 = tokenIn (udao) and token1 = tokenOut(matic)
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

    /// @notice Get current price of UDAO in Matic from uniswap
    function getUdaoOut(
        uint128 amountIn,
        string memory fiat
    ) external view returns (uint udaoPayment) {
        uint128 maticPayment = convertFiatToMatic(
            convertMaticToUdao(amountIn),
            fiat
        );
        udaoPayment = convertMaticToUdao(maticPayment);
        return (udaoPayment);
    }

    /// @dev token0 = tokenIn (matic) and token1 = tokenOut(udao)
    function convertMaticToUdao(
        uint128 amountIn
    ) public view returns (uint amountOut) {
        uint32 secondsAgo = 20;

        address tokenIn = token0;
        address tokenOut = token1;

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
        int24 tick = int24((tickCumulativesDelta / int56(int32(secondsAgo))));
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
            tickCumulativesDelta < 0 &&
            (tickCumulativesDelta % int56(int32(secondsAgo)) != 0)
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

    /// @notice Get current price of Matic in fiat from chainlink
    function convertFiatToMatic(
        uint256 val,
        string memory fiat
    ) public view returns (uint128) {
        uint256 msgValueInUSD = (
            ((val * (uint256)(getLatestPrice(fiat))) / (10 ** 18))
        );
        return (uint128)(msgValueInUSD);
    }

    /// @notice Get current price of 1 Matic in fiat from chainlink
    function getLatestPrice(string memory fiat) public view returns (int) {
        /// @dev MATIC / USD address on Mumbai
        AggregatorV3Interface priceFeed = AggregatorV3Interface(
            0xAB594600376Ec9fD91F8e885dADF0CE036862dE0
        );
        (
            ,
            /* uint80 roundID */ int price /*uint startedAt*/ /*uint timeStamp*/ /*uint80 answeredInRound*/,
            ,
            ,

        ) = priceFeed.latestRoundData();

        bytes32 hashFiat = keccak256(abi.encodePacked(fiat));

        if (hashFiat != keccak256(abi.encodePacked("usd"))) {
            if (hashFiat == keccak256(abi.encodePacked("eur"))) {
                priceFeed = AggregatorV3Interface(
                    0x73366Fe0AA0Ded304479862808e02506FE556a98
                );
            } else if (hashFiat == keccak256(abi.encodePacked("jpy"))) {
                priceFeed = AggregatorV3Interface(
                    0xD647a6fC9BC6402301583C91decC5989d8Bc382D
                );
            } else if (hashFiat == keccak256(abi.encodePacked("aud"))) {
                priceFeed = AggregatorV3Interface(
                    0x062Df9C4efd2030e243ffCc398b652e8b8F95C6f
                );
            } else if (hashFiat == keccak256(abi.encodePacked("cad"))) {
                priceFeed = AggregatorV3Interface(
                    0xACA44ABb8B04D07D883202F99FA5E3c53ed57Fb5
                );
            } else if (hashFiat == keccak256(abi.encodePacked("chf"))) {
                priceFeed = AggregatorV3Interface(
                    0xc76f762CedF0F78a439727861628E0fdfE1e70c2
                );
            } else if (hashFiat == keccak256(abi.encodePacked("gbp"))) {
                priceFeed = AggregatorV3Interface(
                    0x099a2540848573e94fb1Ca0Fa420b00acbBc845a
                );
            } else {
                revert("Unsupported fiat");
            }

            (
                ,
                /* uint80 roundID */ int fiatToUsdPrice /*uint startedAt*/ /*uint timeStamp*/ /*uint80 answeredInRound*/,
                ,
                ,

            ) = priceFeed.latestRoundData();

            price = (price * 10 ** 8) / fiatToUsdPrice; // Matic per fiat
        }

        return (price);
    }
}
