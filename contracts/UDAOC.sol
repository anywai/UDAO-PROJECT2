// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "./IKYC.sol";

contract UDAOContent is ERC721, ERC721URIStorage, AccessControl {
    bytes32 public constant VALIDATOR_ROLE = keccak256("VALIDATOR_ROLE");
    bytes32 public constant SUPER_VALIDATOR_ROLE =
        keccak256("SUPER_VALIDATOR_ROLE");
    bytes32 public constant BACKEND_ROLE = keccak256("BACKEND_ROLE");
    bytes32 public constant FOUNDATION_ROLE = keccak256("FOUNDATION_ROLE");
    bytes32 public constant STAKING_CONTRACT = keccak256("STAKING_CONTRACT");
    bytes32 public constant GOVERNANCE_ROLE = keccak256("GOVERNANCE_ROLE");
    using Counters for Counters.Counter;

    IKYC ikyc;

    Counters.Counter private _tokenIdCounter;

    mapping(uint => uint) contentPrice;
    mapping(uint => uint) isValidated;

    string public defaultURI;

    uint public requiredValidator;
    uint public minRequiredVote;

    struct Validation {
        uint id;
        uint tokenId;
        uint8 validationCount;
        address[] validators;
        bool[] validationResults;
        bool finalValidationResult;
        mapping(address => bool) vote;
        mapping(address => bool) isVoted;
        uint resultDate;
        uint validationScore;
        uint validatorScore; // successfulValidation * validationScore
    }

    Validation[] validations;
    mapping(uint => uint[]) validationIdOfToken;
    mapping(address => uint) validationCount;
    mapping(address => bool) activeValidation;
    mapping(address => bool) isInDispute;
    mapping(address => uint) maximumValidation;
    mapping(address => uint) public successfulValidation;
    mapping(address => uint) public unsuccessfulValidation;

    /**
     * assignValidation(uint tokenId) onlyRole(VALIDATION_ROLE || SUPER_VALIDATION_ROLE)
     *      - makeActiveValidation true
     *      - validations[tokenId].validators.push(msg.sender)
     * sendValidation(bool result) onlyRole(VALIDATION_ROLE || SUPER_VALIDATION_ROLE)
     *      - validationCount++
     *      - makeActiveValidation false
     *      - validations[tokenId].validationResults.push(true || false)
     *      - validations[tokenId].isVoted[msg.sender] = true
     *      - (validationCount == requiredValidator) ? event ValiadationFinalised(tokenId,result);finalValidationResult=result; successfulValidation(address) ++ , unsuccessfulValidation(address2) --; resultDate = block.timestamp
     *
     * dismissValidation(uint tokenId) onlyRole(VALIDATION_ROLE || SUPER_VALIDATION_ROLE)
     *      - makeActiveValidation false
     *      - validations[tokenId].validators remove msg.sender
     *
     *
     * setMavimumValidation(uint max) onlyRole(STAKING_CONTRACT)
     * grantValidatorRole(uint8 roleId, address account)  onlyRole(STAKING_CONTRACT) aynısnın revoke'u
     *      - 0 -> VALIDATOR_ROLE
     *      - 1 -> SUPER_VALIDATOR_ROLE
     *      - _grantRole(role,account) => _revokeRole
     *
     *  setDisputer(uint id) onlyRole(FOUNDATION_ROLE) millet canı sıkıldıkça dispute açmasın (off-chain rapor toplayıp foundation dispute açabilir)
     *      - isInDispute[addresses] = true
     *      - successfulValidation(address) ++ , unsuccessfulValidation(address2) --;
     *  endDispute(uint id, bool) onlyRole(FOUNDATION_ROLE)
     *      - isInDispute[addresses] = false
     *      - successfulValidation(address) ++ , unsuccessfulValidation(address2) --;
     *
     */

    constructor(address _kycAddress) ERC721("UDAO Content", "UDAOC") {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        ikyc = IKYC(_kycAddress);
    }

    function _baseURI() internal view override returns (string memory) {
        return defaultURI;
    }

    function setBaseURI(string calldata _newURI)
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        defaultURI = _newURI;
    }

    function safeMint(
        address to,
        string memory uri,
        uint _contentPrice
    ) public {
        uint256 tokenId = _tokenIdCounter.current();
        _tokenIdCounter.increment();
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, uri);
        contentPrice[tokenId] = _contentPrice;
    }

    function createValidatior(uint tokenId, uint score)
        external
        onlyRole(BACKEND_ROLE)
    {
        Validation storage validation = validations.push();
        validation.id = validations.length;
        validation.tokenId = tokenId;
        validation.validationScore = score;
    }

    // The following functions are overrides required by Solidity.

    function _burn(uint256 tokenId)
        internal
        override(ERC721, ERC721URIStorage)
    {
        super._burn(tokenId);
    }

    function tokenURI(uint256 tokenId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (string memory)
    {
        return super.tokenURI(tokenId);
    }

    // Getters
    function getPriceContent(uint tokenId) external view returns (uint) {
        return contentPrice[tokenId];
    }

    // Setters

    function setPriceContent(uint tokenId, uint _contentPrice) external {
        require(ownerOf(tokenId) == msg.sender);
        contentPrice[tokenId] = _contentPrice;
    }

    function setKycContractAddress(address _kycAddress)
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        ikyc = IKYC(address(_kycAddress));
    }

    // The following functions are overrides required by Solidity.

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, AccessControl)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
