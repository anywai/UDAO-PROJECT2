// SPDX-License-Identifier: MIT
/// @title Gets UDAO-USD conversion rate from oracle
pragma solidity ^0.8.4;

import "./uniswap-0.8/v3-core/contracts/interfaces/IUniswapV3Factory.sol";
import "./uniswap-0.8/v3-periphery/contracts/libraries/OracleLibrary.sol";
import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";
import "./interfaces/IPriceGetter.sol";
import "./RoleController.sol";

contract PriceGetter is IPriceGetter, RoleController {
    address public token0;
    address public token1;
    address public pool;
    /// fiat name => aggregator interface
    mapping(bytes32 => AggregatorV3Interface) public fiatToPriceFeed;

    /// @dev token0 = tokenIn (matic) and token1 = tokenOut(udao)
    constructor(
        address _factory,
        address _token0,
        address _token1,
        uint24 _fee,
        address rmAddress
    ) RoleController(rmAddress) {
        token0 = _token0;
        token1 = _token1;

        address _pool = IUniswapV3Factory(_factory).getPool(
            _token0,
            _token1,
            _fee
        );
        require(_pool != address(0), "pool doesn't exist");

        pool = _pool;

        /// Initialize the contract with the price feed addresses
        fiatToPriceFeed[
            keccak256(abi.encodePacked("usd"))
        ] = AggregatorV3Interface(0xAB594600376Ec9fD91F8e885dADF0CE036862dE0);
        fiatToPriceFeed[
            keccak256(abi.encodePacked("eur"))
        ] = AggregatorV3Interface(0x73366Fe0AA0Ded304479862808e02506FE556a98);
        fiatToPriceFeed[
            keccak256(abi.encodePacked("jpy"))
        ] = AggregatorV3Interface(0xD647a6fC9BC6402301583C91decC5989d8Bc382D);
        fiatToPriceFeed[
            keccak256(abi.encodePacked("gbp"))
        ] = AggregatorV3Interface(0x099a2540848573e94fb1Ca0Fa420b00acbBc845a);
        fiatToPriceFeed[
            keccak256(abi.encodePacked("aud"))
        ] = AggregatorV3Interface(0x062Df9C4efd2030e243ffCc398b652e8b8F95C6f);
        fiatToPriceFeed[
            keccak256(abi.encodePacked("cad"))
        ] = AggregatorV3Interface(0xACA44ABb8B04D07D883202F99FA5E3c53ed57Fb5);
        fiatToPriceFeed[
            keccak256(abi.encodePacked("chf"))
        ] = AggregatorV3Interface(0xc76f762CedF0F78a439727861628E0fdfE1e70c2);
    }

    /// @notice Get fiat to UDAO token amount
    /// @param amountIn Amount of fiat
    /// @param fiat Name of the fiat currency
    function getUdaoOut(
        uint128 amountIn,
        bytes32 fiat
    ) external view returns (uint udaoPayment) {
        /// @dev Get amount of matic in return of given amount of fiat
        uint128 _fiatToMaticAmount = convertFiatToMatic(amountIn, fiat);
        /// @dev Get amount of udao in return of given amount of matic
        udaoPayment = convertMaticToUdao(_fiatToMaticAmount);
        return (udaoPayment);
    }

    /// @notice Converts given amount of matic to udao
    /// @dev token0 = tokenIn (matic) and token1 = tokenOut(udao)
    /// @param amountIn Amount of matic token to convert
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

    /// @notice Returns given amount of fiat currency to matic token
    /// @param val Amount of fiat currency
    /// @param fiat Name of the fiat currency
    function convertFiatToMatic(
        uint256 val,
        bytes32 fiat
    ) public view returns (uint128) {
        uint256 msgValueInUSD = (
            ((val * (uint256)(getLatestPrice(fiat))) / (10 ** 18))
        );
        return (uint128)(msgValueInUSD);
    }

    /// @notice Returns current price of 1 Matic in fiat from chainlink
    /// @param fiat Name of the fiat currency
    function getLatestPrice(bytes32 fiat) public view returns (int) {
        /// @dev MATIC / USD address on Mumbai
        AggregatorV3Interface priceFeed = fiatToPriceFeed[
            keccak256(abi.encodePacked("usd"))
        ];

        (
            ,
            /* uint80 roundID */ int price /*uint startedAt*/ /*uint timeStamp*/ /*uint80 answeredInRound*/,
            ,
            ,

        ) = priceFeed.latestRoundData();

        if (fiat != keccak256(abi.encodePacked("usd"))) {
            priceFeed = fiatToPriceFeed[fiat];

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

    /// @notice Add new fiat currency to the contract can also be used for modifying existing ones
    /// @param fiat Name of the fiat currency
    /// @param priceFeedAddress Address of the price feed of the fiat currency
    function addNewFiat(
        bytes32 fiat,
        address priceFeedAddress
    ) external onlyRoles(administrator_roles) {
        fiatToPriceFeed[fiat] = AggregatorV3Interface(priceFeedAddress);
    }

    /// @notice Delete fiat currency from the contract
    /// @param fiat Name of the fiat currency
    function deleteFiat(bytes32 fiat) external onlyRoles(administrator_roles) {
        delete fiatToPriceFeed[fiat];
    }

    /// @notice Get the address of the price feed of the given fiat currency
    /// @param fiat Name of the fiat currency
    function getPriceFeedAddress(bytes32 fiat) external view returns (address) {
        return address(fiatToPriceFeed[fiat]);
    }
}
