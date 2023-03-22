// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

interface IPriceGetter {
    function getUdaoOut(
        address tokenIn,
        uint128 amountIn
    ) external view returns (uint amountOut);
}
