// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

interface IPriceGetter {
    function getUdaoOut(
        uint128 amountIn, string memory fiat
    ) external view returns (uint amountOut);
}
