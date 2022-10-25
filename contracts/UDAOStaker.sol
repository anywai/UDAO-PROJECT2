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

    uint public payablePerValidation;
    /// @notice the required duration to be a validator
    uint public validatorLockTime = 90 days;
    /// @notice the required duration to be a super validator
    uint public superValidatorLockTime = 180 days;

    struct locked {
        uint256 expire;
        uint256 amount;
    }

    mapping(address => locked[]) validatorValidity;
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

    /// @notice allows users to apply for validator role
    /// @param validationAmount The amount of validations that a validator wants to do
    function applyForValidator(uint validationAmount) external {
        uint tokenToExtract = payablePerValidation * validationAmount;

        iudao.transferFrom(msg.sender, address(this), tokenToExtract);
        maximumValidation[msg.sender] = validationAmount;

        locked storage userInfo = validatorValidity[msg.sender].push();
        userInfo.expire = block.timestamp + validatorLockTime;
        userInfo.amount = tokenToExtract;
    }

    function approveValidator(address _newValidator)
        external
        onlyRole(GOVERNANCE_ROLE)
    {
        irm.grantRole(VALIDATOR_ROLE, _newValidator);
    }

    function applyForSuperValidator(uint validationAmount) external {
        uint tokenToExtract = payablePerValidation * validationAmount;

        iudao.transferFrom(msg.sender, address(this), tokenToExtract);

        locked storage userInfo = validatorValidity[msg.sender].push();
        userInfo.expire = block.timestamp + superValidatorLockTime;
        userInfo.amount = tokenToExtract;
    }

    function approveSuperValidator(address _newValidator)
        external
        onlyRole(GOVERNANCE_ROLE)
    {
        irm.grantRole(SUPER_VALIDATOR_ROLE, _newValidator);
        maximumValidation[_newValidator] = 2**256 - 1;
    }

    /// @notice allows validators to withdraw their staked tokens
    function withdrawStake() public {
        uint withdrawableBalance;
        if (
            irm.hasRole(VALIDATOR_ROLE, msg.sender) ||
            irm.hasRole(SUPER_VALIDATOR_ROLE, msg.sender)
        ) {
            for (uint i; i < validatorValidity[msg.sender].length; i++) {
                locked storage userInfo = validatorValidity[msg.sender][i];
                if (block.timestamp >= userInfo.expire) {
                    withdrawableBalance += userInfo.amount;
                    validatorValidity[msg.sender][i] = validatorValidity[
                        msg.sender
                    ][validatorValidity[msg.sender].length - 1];
                    validatorValidity[msg.sender].pop();
                    unchecked {
                        i--;
                    }
                }
            }
        } else {
            for (uint i; i < validatorValidity[msg.sender].length; i++) {
                locked storage userInfo = validatorValidity[msg.sender][i];
                withdrawableBalance += userInfo.amount;
            }
            delete validatorValidity[msg.sender];
        }
        require(withdrawableBalance > 0, "You don't have withdrawable token");
        iudao.transfer(msg.sender, withdrawableBalance);
    }

    function withdrawableStake() public view returns (uint) {
        uint withdrawableBalance;
        uint stakings = validatorValidity[msg.sender].length;
        for (uint i; i < stakings; i++) {
            locked storage userInfo = validatorValidity[msg.sender][i];
            if (
                irm.hasRole(VALIDATOR_ROLE, msg.sender) ||
                irm.hasRole(SUPER_VALIDATOR_ROLE, msg.sender)
            ) {
                if (block.timestamp >= userInfo.expire) {
                    withdrawableBalance += userInfo.amount;
                }
            } else {
                withdrawableBalance += userInfo.amount;
            }
        }
        return withdrawableBalance;
    }
}
