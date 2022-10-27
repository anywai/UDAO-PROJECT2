// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/governance/IGovernor.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/draft-EIP712.sol";
import "./RoleController.sol";

contract UDAOStaker is RoleController, EIP712 {
    string private constant SIGNING_DOMAIN = "UDAOStaker";
    string private constant SIGNATURE_VERSION = "1";

    IERC20 public udao;
    IERC20 public udaovp;
    IGovernor public igovernor;

    uint public payablePerValidation;
    /// @notice the required duration to be a validator
    uint public validatorLockTime = 90 days;
    /// @notice the required duration to be a super validator
    uint public superValidatorLockTime = 180 days;
    /// @notice Amount to deduct from super validator application
    uint superValidatorLockAmount = 1000 ether;

    struct StakeLock {
        uint256 expire;
        uint256 amount;
    }

    mapping(address => StakeLock[]) validatorValidity;
    mapping(address => uint) maximumValidation;

    struct GovernanceLock {
        uint256 expire;
        uint256 amount;
        uint256 vpamount;
    }

    mapping(address => GovernanceLock[]) governanceStakes;

    struct ValidationApplication {
        address applicant;
        bool isSuper;
        bool isFinished;
    }

    ValidationApplication[] public validatorApplications;
    mapping(address => uint) validatorApplicationId;
    uint private applicationIndex;

    constructor(
        address udaovpAddress,
        address udaoAddress,
        address governorAddress,
        address irmAddress
    ) 
    EIP712(SIGNING_DOMAIN, SIGNATURE_VERSION)
    RoleController(irmAddress) {
        udao = IERC20(udaoAddress);
        udaovp = IERC20(udaovpAddress);
        igovernor = IGovernor(governorAddress);
    }

    /// @notice Represents the right to get a role
    struct RoleVoucher {
        /// @notice Address of the redeemer
        address redeemer;
        /// @notice the EIP-712 signature of all other fields in the ContentVoucher struct.
        bytes signature;
    }

    /// @notice allows users to apply for validator role
    /// @param validationAmount The amount of validations that a validator wants to do
    function applyForValidator(uint validationAmount) external {
        require(
            !irm.hasRole(SUPER_VALIDATOR_ROLE, msg.sender),
            "Address is a Super Validator"
        );
        require(
            !irm.hasRole(VALIDATOR_ROLE, msg.sender),
            "Address is already a Validator"
        );
        uint tokenToExtract = payablePerValidation * validationAmount;

        udao.transferFrom(msg.sender, address(this), tokenToExtract);
        maximumValidation[msg.sender] = validationAmount;

        StakeLock storage userInfo = validatorValidity[msg.sender].push();
        userInfo.expire = block.timestamp + validatorLockTime;
        userInfo.amount = tokenToExtract;
        ValidationApplication
            storage validationApplication = validatorApplications.push();
        validationApplication.applicant = msg.sender;
        validatorApplicationId[msg.sender] = applicationIndex;
        applicationIndex++;
    }

    function applyForSuperValidator() external {
        require(
            !irm.hasRole(SUPER_VALIDATOR_ROLE, msg.sender),
            "Address is a Super Validator"
        );
        require(
            irm.hasRole(VALIDATOR_ROLE, msg.sender),
            "Address is should be a Validator"
        );
        

        udao.transferFrom(msg.sender, address(this), superValidatorLockAmount);

        StakeLock storage userInfo = validatorValidity[msg.sender].push();
        userInfo.expire = block.timestamp + superValidatorLockTime;
        userInfo.amount = superValidatorLockAmount;
        ValidationApplication
            storage validationApplication = validatorApplications.push();
        validationApplication.applicant = msg.sender;
        validationApplication.isSuper = true;
        validatorApplicationId[msg.sender] = applicationIndex;
        applicationIndex++;
    }

    function getRole(RoleVoucher calldata voucher)
        external
    {
        // make sure redeemer is redeeming
        require(voucher.redeemer == msg.sender, "You are not the redeemer");
        //make sure redeemer is kyced
        require(irm.getKYC(msg.sender), "You are not KYCed");
         // make sure signature is valid and get the address of the signer
        address signer = _verify(voucher);
        require(
            irm.hasRole(BACKEND_ROLE, signer),
            "Signature invalid or unauthorized"
        );

        ValidationApplication
            storage validationApplication = validatorApplications[
                validatorApplicationId[voucher.redeemer]
            ];
        if (validationApplication.isSuper) {
            irm.grantRole(SUPER_VALIDATOR_ROLE, voucher.redeemer);
            maximumValidation[voucher.redeemer] = 2**256 - 1;
        } else {
            irm.grantRole(VALIDATOR_ROLE, voucher.redeemer);
        }
        validationApplication.isFinished = true;
    }

    function rejectApplication(address _applicant)
        external
        onlyRole(BACKEND_ROLE)
    {
        ValidationApplication
            storage validationApplication = validatorApplications[
                validatorApplicationId[_applicant]
            ];
        validationApplication.isFinished = true;
    }

    /// @notice allows validators to withdraw their staked tokens
    function withdrawValidatorStake() public {
        uint withdrawableBalance;
        if (
            irm.hasRole(VALIDATOR_ROLE, msg.sender) ||
            irm.hasRole(SUPER_VALIDATOR_ROLE, msg.sender)
        ) {
            for (int i; uint(i) < validatorValidity[msg.sender].length; i++) {
                StakeLock storage userInfo = validatorValidity[msg.sender][
                    uint(i)
                ];
                if (block.timestamp >= userInfo.expire) {
                    withdrawableBalance += userInfo.amount;
                    validatorValidity[msg.sender][uint(i)] = validatorValidity[
                        msg.sender
                    ][validatorValidity[msg.sender].length - 1];
                    validatorValidity[msg.sender].pop();
                    i--;
                }
            }
        } else {
            for (uint i; i < validatorValidity[msg.sender].length; i++) {
                StakeLock storage userInfo = validatorValidity[msg.sender][i];
                withdrawableBalance += userInfo.amount;
            }
            delete validatorValidity[msg.sender];
        }
        require(withdrawableBalance > 0, "You don't have withdrawable token");
        udao.transfer(msg.sender, withdrawableBalance);
    }

    function withdrawableValidatorStake() public view returns (uint) {
        uint withdrawableBalance;
        uint stakingsLength = validatorValidity[msg.sender].length;
        for (uint i; i < stakingsLength; i++) {
            StakeLock storage userInfo = validatorValidity[msg.sender][i];
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

    function stakeForGovernance(uint _amount, uint _days) public {
        require(_amount > 0, "Stake amount can't be 0");
        require(_days >= 7, "Minimum lock duration is 7 days");
        require(irm.getKYC(msg.sender), "Address is not KYCed");
        require(!irm.getBan(msg.sender), "Address is banned");
        udao.transferFrom(msg.sender, address(this), _amount);

        GovernanceLock storage lock = governanceStakes[msg.sender].push();
        lock.amount = _amount;
        lock.expire = block.timestamp + (_days * (1 days));
        lock.vpamount = _amount * _days;

        udaovp.transfer(msg.sender, lock.vpamount);
    }

    function withdrawGovernanceStake(uint _amount) public {
        require(_amount > 0, "Stake amount can't be 0");
        uint withdrawableBalance;
        uint vpBalance;
        uint stakingsLength = governanceStakes[msg.sender].length;
        for (int i = 0; uint(i) < stakingsLength; i++) {
            GovernanceLock storage lock = governanceStakes[msg.sender][uint(i)];
            if (block.timestamp >= lock.expire) {
                if (_amount < (withdrawableBalance + lock.amount)) {
                    uint vpFromLatest = ((lock.vpamount *
                        (((_amount - withdrawableBalance) * 100) /
                            lock.amount)) / 100);
                    uint udaoFromLatest = lock.amount -
                        (_amount - withdrawableBalance);
                    lock.amount -= udaoFromLatest;
                    lock.vpamount -= vpFromLatest;
                    vpBalance += vpFromLatest;
                    udaovp.transferFrom(msg.sender, address(0x0), vpBalance);
                    udao.transfer(msg.sender, _amount);
                }
                withdrawableBalance += lock.amount;
                vpBalance += lock.vpamount;
                governanceStakes[msg.sender][uint(i)] = governanceStakes[
                    msg.sender
                ][governanceStakes[msg.sender].length - 1];
                governanceStakes[msg.sender].pop();
                i--;
            }
        }
    }

    function setSuperValidatorLockAmount(uint _amount) external onlyRoles(administrator_roles){
        superValidatorLockAmount = _amount;
    }
    /// @notice Returns a hash of the given ContentVoucher, prepared using EIP712 typed data hashing rules.
    /// @param voucher A ContentVoucher to hash.
    function _hash(RoleVoucher calldata voucher)
        internal
        view
        returns (bytes32)
    {
        return
            _hashTypedDataV4(
                keccak256(
                    abi.encode(
                        keccak256(
                            "UDAOStaker(address redeemer)"
                        ),
                        voucher.redeemer
                    )
                )
            );
    }

    /// @notice Returns the chain id of the current blockchain.
    /// @dev This is used to workaround an issue with ganache returning different values from the on-chain chainid() function and
    ///  the eth_chainId RPC method. See https://github.com/protocol/nft-website/issues/121 for context.
    function getChainID() external view returns (uint256) {
        uint256 id;
        assembly {
            id := chainid()
        }
        return id;
    }

    /// @notice Verifies the signature for a given ContentVoucher, returning the address of the signer.
    /// @dev Will revert if the signature is invalid. Does not verify that the signer is authorized to mint NFTs.
    /// @param voucher A ContentVoucher describing an unminted NFT.
    function _verify(RoleVoucher calldata voucher)
        internal
        view
        returns (address)
    {
        bytes32 digest = _hash(voucher);
        return ECDSA.recover(digest, voucher.signature);
    }
}
