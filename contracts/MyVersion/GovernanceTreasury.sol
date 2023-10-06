// Bu kontrat     governanceTreasury'de şunlar olcak:
// 1) jurorBalanceUpdate(): bu fonksiyona uint juror balance değeri girecek ve mevcut juror balancı güncelleyecek
// 2-3) validatorBalanceUpdate(): governanceBalanceUpdate(): aynısı üstekininin

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "../ContractManager.sol";
import "../interfaces/IUDAOC.sol";
import "../interfaces/ISupervision.sol";
import "../interfaces/IPriceGetter.sol";

contract GovernanceTreasury {
    // UDAO (ERC20) Token interface
    //IERC20 udao;

    // UDAO (ERC721) Token interface
    //IUDAOC udaoc;

    uint jurorBalance;
    uint validatorBalance;
    uint governanceBalance;

    /*
    constructor(address _udao, address _udaoc) {
        udao = IERC20(_udao);
        udaoc = IUDAOC(_udaoc);
    }
    */

    function jurorBalanceUpdate(uint _balance) external {
        jurorBalance += _balance;
    }

    function validatorBalanceUpdate(uint _balance) external {
        validatorBalance += _balance;
    }

    function governanceBalanceUpdate(uint _balance) external {
        governanceBalance += _balance;
    }
}
