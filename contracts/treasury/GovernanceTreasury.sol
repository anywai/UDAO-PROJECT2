// Bu kontrat     governanceTreasury'de şunlar olcak:
// 1) jurorBalanceUpdate(): bu fonksiyona uint juror balance değeri girecek ve mevcut juror balancı güncelleyecek
// 2-3) validatorBalanceUpdate(): governanceBalanceUpdate(): aynısı üstekininin

// SPDX-License-Identifier: MIT
/// @title Dummy version of the governance treasury contract.
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract GovernanceTreasury {
    // UDAO (ERC20) Token interface
    IERC20 udao;

    uint jurorBalance;
    uint validatorBalance;
    uint governanceBalance;

    address ownerOfDummy;

    constructor(address udaoAddress) {
        udao = IERC20(udaoAddress);
        ownerOfDummy = msg.sender;
    }

    function jurorBalanceUpdate(uint _balance) external {
        jurorBalance += _balance;
    }

    function validatorBalanceUpdate(uint _balance) external {
        validatorBalance += _balance;
    }

    function governanceBalanceUpdate(uint _balance) external {
        governanceBalance += _balance;
    }

    function emergencyWithdraw() external {
        require(
            msg.sender == ownerOfDummy,
            "you are not owner of dummy contract"
        );
        udao.transfer(
            msg.sender,
            jurorBalance + validatorBalance + governanceBalance
        );
        validatorBalance = 0;
        jurorBalance = 0;
        governanceBalance = 0;
    }
}
