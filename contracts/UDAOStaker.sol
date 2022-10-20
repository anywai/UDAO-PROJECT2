// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/governance/IGovernor.sol";
import "./RoleController.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

contract UDAOStaker is RoleController {
    IERC20 public iudao;
    IERC20 public iudaovp;
    IGovernor public igovernor;

    mapping(address => uint) public balanceOf;

    uint public amountPerValidation;

    mapping(address => bool) validatorStatus;
    mapping(address => uint) maximumValidation;

    constructor(
        address udaovpAddress,
        address udaoAddress,
        address governorAddress,
        address irmAddress
    ) RoleController(irmAddress) {
        iudao = IERC20(udaoAddress);
        iudaovp = IERC20(udaovpAddress);
        igovernor = IGovernor(governorAddress);
    }

    function applyForValidator(uint validationAmount) external {
        iudao.transferFrom(
            msg.sender,
            address(this),
            amountPerValidation * validationAmount
        );
        maximumValidation[msg.sender] = validationAmount;
        address[] memory addresses = new address[](1);
        addresses[0] = address(iudao);
        uint[] memory amounts = new uint[](1);
        amounts[0] = 0;
        bytes[] memory calldatas = new bytes[](1);
        calldatas[0] = abi.encode(
            bytes4(keccak256(bytes("0xdbd9a031"))),
            msg.sender
        );
        igovernor.propose(
            addresses,
            amounts,
            calldatas,
            string(
                abi.encodePacked(
                    "Approve",
                    Strings.toHexString(uint160(msg.sender), 20),
                    "as validator"
                )
            )
        );
    }

    function approveValidator(address _newValidator)
        external
        onlyRole(GOVERNANCE_ROLE)
    {
        irm.grantRole(VALIDATOR_ROLE, _newValidator);
    }

    function applyForSuperValidator(uint validationAmount) external {
        iudao.transferFrom(
            msg.sender,
            address(this),
            amountPerValidation * validationAmount
        );
        address[] memory addresses = new address[](1);
        addresses[0] = address(iudao);
        uint[] memory amounts = new uint[](1);
        amounts[0] = 0;
        bytes[] memory calldatas = new bytes[](1);
        calldatas[0] = abi.encode(
            bytes4(keccak256(bytes("0xac030ba9"))),
            msg.sender
        );
        igovernor.propose(
            addresses,
            amounts,
            calldatas,
            string(
                abi.encodePacked(
                    "Approve",
                    Strings.toHexString(uint160(msg.sender), 20),
                    "as validator"
                )
            )
        );
    }

    function approveSuperValidator(address _newValidator)
        external
        onlyRole(GOVERNANCE_ROLE)
    {
        irm.grantRole(SUPER_VALIDATOR_ROLE, _newValidator);
        maximumValidation[_newValidator] = 2**256 - 1;
    }
}
