// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;
import "./BasePlatform.sol";

abstract contract ContentManager is BasePlatform {
    // wallet => content token Ids
    mapping(address => uint[]) ownedContents;

    function buyContent(uint tokenId) external {
        /// @notice buys content
        /// @param tokenId id of the token that will be bought
        require(ikyc.getKYC(msg.sender), "You are not KYCed");
        require(
            isTokenBought[msg.sender][tokenId] == false,
            "Content Already Bought"
        );
        foundationBalance +=
            (udaoc.getPriceContent(tokenId) * contentFoundationCut) /
            100000;
        governanceBalance +=
            (udaoc.getPriceContent(tokenId) * contentGovernancenCut) /
            100000;
        validatorBalance +=
            (udaoc.getPriceContent(tokenId) * validatorBalance) /
            100000;
        jurorBalance +=
            (udaoc.getPriceContent(tokenId) * contentGovernancenCut) /
            100000;
        contentBalance[udaoc.ownerOf(tokenId)] +=
            udaoc.getPriceContent(tokenId) -
            ((udaoc.getPriceContent(tokenId) * contentFoundationCut) / 100000) -
            ((udaoc.getPriceContent(tokenId) * contentGovernancenCut) /
                100000) -
            ((udaoc.getPriceContent(tokenId) * validatorBalance) / 100000) -
            ((udaoc.getPriceContent(tokenId) * contentGovernancenCut) / 100000);
        udao.transferFrom(
            msg.sender,
            address(this),
            udaoc.getPriceContent(tokenId)
        );
        isTokenBought[msg.sender][tokenId] = true;
        ownedContents[msg.sender].push(tokenId);
    }
}
