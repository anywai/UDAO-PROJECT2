// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;
import "./BasePlatform.sol";

abstract contract ContentManager is BasePlatform {
    function buyContent(uint tokenId) external {
        require(ikyc.getKYC(msg.sender), "You are not KYCed");
        require(
            isTokenBought[msg.sender][tokenId] == false,
            "Content Already Bought"
        );
        foundationBalance +=
            (udaoc.getPriceContent(tokenId) * courseFoundationCut) /
            100000;
        governacneBalance +=
            (udaoc.getPriceContent(tokenId) * courseGovernancenCut) /
            100000;
        validatorBalance +=
            (udaoc.getPriceContent(tokenId) * validatorBalance) /
            100000;
        jurorBalance +=
            (udaoc.getPriceContent(tokenId) * courseGovernancenCut) /
            100000;
        contentBalance[udaoc.ownerOf(tokenId)] +=
            udaoc.getPriceContent(tokenId) -
            ((udaoc.getPriceContent(tokenId) * courseFoundationCut) / 100000) -
            ((udaoc.getPriceContent(tokenId) * courseGovernancenCut) / 100000) -
            ((udaoc.getPriceContent(tokenId) * validatorBalance) / 100000) -
            ((udaoc.getPriceContent(tokenId) * courseGovernancenCut) / 100000);
        udao.transferFrom(
            msg.sender,
            address(this),
            udaoc.getPriceContent(tokenId)
        );
        isTokenBought[msg.sender][tokenId] = true;
        ownedContents[msg.sender].push(tokenId);
    }
}
