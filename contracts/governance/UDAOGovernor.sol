// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/governance/Governor.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorSettings.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorCountingSimple.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorVotes.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorTimelockControl.sol";
import "../interfaces/IRoleManager.sol";
import "../RoleLegacy.sol";

interface IUDAOStaker {
    function addVoteRewards(address voter) external;
}

contract UDAOGovernor is
    Governor,
    GovernorSettings,
    GovernorCountingSimple,
    GovernorVotes,
    GovernorTimelockControl,
    RoleLegacy
{
    IUDAOStaker udaoStaker;

    constructor(
        IVotes _token,
        TimelockController _timelock,
        address stakingContractAddress,
        address roleManagerAddress
    )
        Governor("UDAOGovernor")
        /// @dev 1 block mined in 2 seconds in Polygon
        GovernorSettings(
            302400 /* 1 week voting delay */,
            302400 /* 1 week voting period duration*/,
            1 /*proposal threshold*/
        )
        GovernorVotes(_token)
        GovernorTimelockControl(_timelock)
    {
        roleManager = IRoleManager(roleManagerAddress);
        udaoStaker = IUDAOStaker(stakingContractAddress);
    }

    event AddressesUpdated(
        address RoleManagerAddress,
        address StakingContractAddress
    );

    /// @notice Get the updated addresses from contract manager
    function updateAddresses(
        address roleManagerAddress,
        address stakingContractAddress
    ) external {
        if (msg.sender != foundationWallet) {
            require(
                (hasRole(BACKEND_ROLE, msg.sender) ||
                    hasRole(CONTRACT_MANAGER, msg.sender)),
                "Only backend and contract manager can update addresses"
            );
        }
        roleManager = IRoleManager(roleManagerAddress);
        udaoStaker = IUDAOStaker(stakingContractAddress);

        emit AddressesUpdated(roleManagerAddress, stakingContractAddress);
    }

    uint _quorum = 1e18; // 720000000e18 (200.000.000 * 0.04 * 6 * 30)

    // TODO Check if we can customize propose function to add quorum as a parameter
    // TODO check if we can change public to internal and override the propose function
    // TODO Check when setQuroum gets effective (before proposal creation? After? What about before/after update voting power?)
    // TODO Check if we can block users who didn't update their voting power before certain time of a proposal creation
    function propose(
        address[] memory targets,
        uint256[] memory values,
        bytes[] memory calldatas,
        string memory description,
        uint newQuorum
    ) public override(IGovernor, Governor) returns (uint256) {
        setQuorum(newQuorum);
        require(hasRole(ROLE_MEMBER, msg.sender), "Only members can propose");
        return super.propose(targets, values, calldatas, description);
    }

    function setQuorum(uint newQuorum) external onlyGovernance {
        _quorum = newQuorum;
    }

    /// @notice Allows backend to set the staking contract address.
    /// @param stakingContractAddress Address to set to
    /// TODO remove this function and use updateAddresses instead
    function setStakingContract(address stakingContractAddress) external {
        require(
            hasRole(BACKEND_ROLE, msg.sender),
            "Only backend can set staking contract"
        );
        udaoStaker = IUDAOStaker(stakingContractAddress);
    }

    function _castVote(
        uint256 proposalId,
        address account,
        uint8 support,
        string memory reason
    ) internal override(Governor) returns (uint256) {
        require(
            VotingPower.hasUpdatedVotingPower(account),
            "No updated voting power"
        );
        udaoStaker.addVoteRewards(msg.sender);
        return
            _castVote(proposalId, account, support, reason, _defaultParams());
    }

    function hasUpdatedVotingPower(address account) public view returns (bool) {
        // address => timeStamp
        // mapping(address => uint256) public votingPower;
        if (votingPower[account] < 3 days) {
            return true;
        } else {
            return false;
        }
    }

    // The following functions are overrides required by Solidity.

    function votingDelay()
        public
        view
        override(IGovernor, GovernorSettings)
        returns (uint256)
    {
        return super.votingDelay();
    }

    function votingPeriod()
        public
        view
        override(IGovernor, GovernorSettings)
        returns (uint256)
    {
        return super.votingPeriod();
    }

    function quorum(
        uint256 blockNumber
    ) public view override(IGovernor) returns (uint256) {
        return _quorum;
    }

    function state(
        uint256 proposalId
    )
        public
        view
        override(Governor, GovernorTimelockControl)
        returns (ProposalState)
    {
        return super.state(proposalId);
    }

    function proposalThreshold()
        public
        view
        override(Governor, GovernorSettings)
        returns (uint256)
    {
        return super.proposalThreshold();
    }

    function _execute(
        uint256 proposalId,
        address[] memory targets,
        uint256[] memory values,
        bytes[] memory calldatas,
        bytes32 descriptionHash
    ) internal override(Governor, GovernorTimelockControl) {
        super._execute(proposalId, targets, values, calldatas, descriptionHash);
    }

    function _cancel(
        address[] memory targets,
        uint256[] memory values,
        bytes[] memory calldatas,
        bytes32 descriptionHash
    ) internal override(Governor, GovernorTimelockControl) returns (uint256) {
        return super._cancel(targets, values, calldatas, descriptionHash);
    }

    function _executor()
        internal
        view
        override(Governor, GovernorTimelockControl)
        returns (address)
    {
        return super._executor();
    }

    function supportsInterface(
        bytes4 interfaceId
    ) public view override(Governor, GovernorTimelockControl) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}
