// SPDX-License-Identifier: MIT
/// @title An example contract using the contractmanager. This way we only need to make changes in a single contract and update the rest with function "updateAddresses"

import "./ContractManager.sol";
import "./IVM.sol";
import "./JurorManager.sol";

pragma solidity ^0.8.0;

contract C {
    ContractManager public contractManager;

    IValidationManager public IVM;
    IStakingContract public staker;

    constructor(address _ContractManager) public {
        contractManager = ContractManager(_ContractManager);
        address ivmAddress = contractManager.IVMAddress();
        address stakerAddress = contractManager.IStakingContractAddress();

        IVM = IValidationManager(ivmAddress);
        staker = IStakingContract(stakerAddress);
    }

    /// @notice Get the updated addresses from a central location
    function updateAddresses() external{
        address ivmAddress = contractManager.IVMAddress();
        address stakerAddress = contractManager.IStakingContractAddress();

        IVM = IValidationManager(ivmAddress);
        staker = IStakingContract(stakerAddress);
    }

    function doSomethingWithIVM(uint256 tokenId) external{
        IVM.getIsValidated(tokenId);
    }

    function doSomethingWithStaker() external{
        staker.registerValidation();
    }
}