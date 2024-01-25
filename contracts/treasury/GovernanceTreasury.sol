// SPDX-License-Identifier: MIT
/// @title Treasury for governance related roles.
/// @dev This contract is intended to distribute the accumulated pool balances for jurors, validators, and governance to respective individuals in future functionalities.
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "../interfaces/IRoleManager.sol";
import "../RoleLegacy.sol";

contract GovernanceTreasury is Pausable, RoleLegacy {
    // UDAO (ERC20) Token contract address
    IERC20 udao;

    /// @notice Its a pool for jurors, The revenue generated from sales after completing lock period (on Platform treasury) will be transferred to this pool.
    uint jurorPool;
    /// @notice Its a pool for validators, The revenue generated from sales after completing lock period (on Platform treasury) will be transferred to this pool.
    uint validatorPool;
    /// @notice Its a pool for governance, The revenue generated from sales after completing lock period (on Platform treasury) will be transferred to this pool.
    uint governancePool;

    /// @notice Address of the deployer of this dummy contract
    address ownerOfDummy; // --> TODO it belongs to dummy contract use updateAddress funtion and foundation ownership instead

    /// @notice Constructor function of governance treasury contract.
    /// @param udaoAddress Address of the UDAO token contract.
    constructor(address udaoAddress) {
        udao = IERC20(udaoAddress);
        ownerOfDummy = msg.sender;
        validatorDistributionRound = block.timestamp;
    }

    event AddressesUpdated(address RoleManagerAddress, address UdaoAddress);

    /// @notice Get the updated addresses from contract manager
    function updateAddresses(
        address roleManagerAddress,
        address udaoAddress
    ) external {
        if (msg.sender != foundationWallet) {
            require(
                (hasRole(BACKEND_ROLE, msg.sender) ||
                    hasRole(CONTRACT_MANAGER, msg.sender)),
                "Only backend and contract manager can update addresses"
            );
        }
        roleManager = IRoleManager(roleManagerAddress);
        udao = IERC20(udaoAddress);

        emit AddressesUpdated(roleManagerAddress, udaoAddress);
    }

    /// @notice Updates the jurors balance in this treasury.
    /// @param _balance The balance to update.
    function jurorBalanceUpdate(uint _balance) external {
        jurorPool += _balance;
    }

    /// @notice Updates the validators balance in this treasury.
    /// @param _balance The balance to update.
    function validatorBalanceUpdate(uint _balance) external {
        require(
            roleManager.hasRole(SUPERVISION_CONTRACT, msg.sender),
            "Only supervision contract can update validator balance"
        );

        validatorPool += _balance;
        //star the next round
        if (autoStartRound) {
            if (
                block.timestamp - lastCreatedRoundValidatorTimestamp >
                autoNextRoundDuration
            ) {
                _nextValidatorDistributionRound();
            }
        }
    }

    /// @notice Updates the governance balance in this treasury.
    /// @param _balance The balance to update.
    function governanceBalanceUpdate(uint _balance) external {
        governancePool += _balance;
    }

    /// @notice rounds of distribution
    uint public validatorDistributionRound;
    uint public jurorDistributionRound;

    // validator/juror => (round => score)
    mapping(address => mapping(uint256 => uint256)) validatorScorePerRound;
    mapping(address => mapping(uint256 => uint256)) jurorScorePerRound;

    // round => score
    mapping(uint256 => uint256) public totalValidatorScorePerRound;
    mapping(uint256 => uint256) public totalJurorScorePerRound;

    // round => total payment
    // TODO Kanka bu roundPayoutsValidator ve roundPayoutsJuror millet para çektiğinde düşürmemiz lazım!!!
    mapping(uint256 => uint256) public roundPayoutsValidator;
    mapping(uint256 => uint256) public roundPayoutsJuror;

    // validator/juror => last claim round
    mapping(address => uint256) public validatorLastClaimedRound; // --> it is not last claimed actually, it should be next claimable round
    mapping(address => uint256) public jurorLastClaimedRound; // --> it is not last claimed actually, it should be next claimable round

    uint lastCreatedRoundValidatorTimestamp;
    uint lastCreatedRoundJurorTimestamp;

    uint lastExpiredRoundValidator;
    uint lastExpiredRoundJuror;

    uint autoNextRoundDuration = 30 days;

    bool autoStartRound = true;

    function incValidatorScorePerRound(address _validator) external {
        totalValidatorScorePerRound[validatorDistributionRound]++;
        validatorScorePerRound[_validator][validatorDistributionRound]++;
    }

    function incJurorScorePerRound(address _juror) external {
        totalJurorScorePerRound[jurorDistributionRound]++;
        jurorScorePerRound[_juror][jurorDistributionRound]++;
    }

    function decValidatorScorePerRound(address _validator) external {
        // İS THİS FUNCTİON NECESSARY?
        validatorScorePerRound[_validator][validatorDistributionRound]--;
        totalValidatorScorePerRound[validatorDistributionRound]--;
    }

    function decJurorScorePerRound(address _juror) external {
        // İS THİS FUNCTİON NECESSARY?
        jurorScorePerRound[_juror][jurorDistributionRound]--;
        totalJurorScorePerRound[jurorDistributionRound]--;
    }

    function nextValidatorDistributionRound() external {
        require(
            roleManager.hasRole(BACKEND_ROLE, msg.sender),
            "Only backend can start next round"
        );
        require(
            block.timestamp - lastCreatedRoundValidatorTimestamp >
                autoNextRoundDuration,
            "Too early to start next round"
        );
        _nextValidatorDistributionRound();
    }

    function _nextValidatorDistributionRound() internal {
        validatorDistributionRound++;
        lastCreatedRoundValidatorTimestamp = block.timestamp;
        uint temp = validatorPool;
        validatorPool = 0;
        roundPayoutsValidator[validatorDistributionRound - 1] = temp;

        transferExpiredDistributionRoundValidator();
    }

    function transferExpiredDistributionRoundValidator() internal {
        for (
            uint i = lastExpiredRoundValidator;
            i < validatorDistributionRound;
            i++
        ) {
            if (validatorDistributionRound - lastExpiredRoundValidator == 6) {
                lastExpiredRoundValidator = i + 1; //?
                uint temp = roundPayoutsValidator[i];
                roundPayoutsValidator[i] = 0;
                validatorPool += temp;
            } else {
                break;
            }
        }
    }

    function nextJurorDistributionRound() external {
        jurorDistributionRound++;
        uint temp = jurorPool;
        jurorPool = 0;
        roundPayoutsJuror[jurorDistributionRound - 1] = temp;
    }

    /// @notice calculates validator earnings and withdraws calculated earning to validator's wallet
    function withdrawValidator() external whenNotPaused {
        require(
            roleManager.hasRole(VALIDATOR_ROLE, msg.sender),
            "Only validator can withdraw"
        );
        uint claimableRound = validatorLastClaimedRound[msg.sender];
        require(claimableRound < validatorDistributionRound, "Already claimed");

        uint withdrawableBalance = 0;

        for (uint i = claimableRound; i < validatorDistributionRound; i++) {
            withdrawableBalance +=
                (roundPayoutsValidator[i] *
                    validatorScorePerRound[msg.sender][i]) /
                totalValidatorScorePerRound[i];
        }

        validatorLastClaimedRound[msg.sender] = validatorDistributionRound;
        udao.transfer(msg.sender, withdrawableBalance);
        //emit ValidatorWithdrawn(msg.sender, withdrawableBalance);
    }

    /// @notice calculates juror earnings and withdraws calculated earning to juror's wallet
    function withdrawJuror() external whenNotPaused {
        require(
            roleManager.hasRole(JUROR_ROLE, msg.sender),
            "Only juror can withdraw"
        );
        uint claimableRound = jurorLastClaimedRound[msg.sender];
        require(claimableRound < jurorDistributionRound, "Already claimed");

        uint withdrawableBalance = 0;

        for (uint i = claimableRound; i < jurorDistributionRound; i++) {
            withdrawableBalance +=
                (roundPayoutsJuror[i] * jurorScorePerRound[msg.sender][i]) /
                totalJurorScorePerRound[i];
        }

        jurorLastClaimedRound[msg.sender] = jurorDistributionRound;
        udao.transfer(msg.sender, withdrawableBalance);
        //emit JurorWithdrawn(msg.sender, withdrawableBalance);
    }

    /// @notice withdraws governance balance to governance treasury
    function withdrawGovernance() external whenNotPaused {
        //require(
        //    roleManager.hasRole(GOVERNANCE_ROLE, msg.sender),
        //    "Only governance can withdraw"
        //);
        //uint withdrawableBalance = governanceBalance;
        //governanceBalance = 0; /// @dev zeroing before the actual withdraw
        //udao.transfer(governanceTreasury, withdrawableBalance);
        //emit GovernanceWithdrawn(withdrawableBalance);
    }

    function transferGovernanceRewards(
        address _to,
        uint _amount
    ) external whenNotPaused {
        require(
            roleManager.hasRole(STAKING_CONTRACT, msg.sender),
            "Only staking contract can transfer governance rewards"
        );
        udao.transfer(_to, _amount);
    }

    /// TODO: Bu fonksiyon dummy versiona yanlışlıkla para aktarılması durumunda kullanılması için tasarlandı kaldırılması lazım!
    /// @notice Withdraws the balance of the treasury.
    /// @dev this dummy contract should not accumulate any balance, if any at all it an unwanted behaviour and deployer can save the funds.
    function emergencyWithdraw() external {
        require(
            msg.sender == ownerOfDummy,
            "you are not owner of dummy contract"
        );
        udao.transfer(msg.sender, udao.balanceOf(address(this)));
        validatorPool = 0;
        jurorPool = 0;
        governancePool = 0;
    }

    /// @notice Returns the score of a validator for a specific round
    /// @param _validator The address of the validator
    /// @param _round Reward round ID
    function getValidatorScore(
        address _validator,
        uint256 _round
    ) external view returns (uint256) {
        return validatorScorePerRound[_validator][_round];
    }

    /// @notice returns total successful validation count
    /// @param _round Reward round ID
    function getTotalValidationScore(
        uint256 _round
    ) external view returns (uint) {
        return totalValidatorScorePerRound[_round];
    }

    /// @notice Returns the score of a juror for a speficied round
    function getJurorScore(
        address _juror,
        uint _round
    ) external view returns (uint) {
        return jurorScorePerRound[_juror][_round];
    }

    /// @notice returns total juror scores
    function getTotalJurorScore(uint256 _round) external view returns (uint) {
        return totalJurorScorePerRound[_round];
    }
}
