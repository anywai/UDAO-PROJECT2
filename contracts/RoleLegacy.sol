// SPDX-License-Identifier: MIT
/// @title UDAO smart contract's role definitions.

pragma solidity ^0.8.4;

import "./RoleNames.sol";
import "./interfaces/IRoleManager.sol";

abstract contract RoleLegacy is RoleNames {
    /// @notice Role manager contract address
    IRoleManager roleManager;

    // Bu contract eski roleManager-RoleControllerdaki abstract olup iherit edilen contracta benziyor. 2 opsiyonumuz var
    // 1) aaşağıdaki fonksiyonları roleNames kullanan her contrata ekleyeceğiz
    // 2) roleNames'i inherit eden contractlarıda bu kontratla değiştiririz. (RoleNames de bu kontrat tarafından inherit ediliyor bu arada)
    // eğer bu iki yoldan birini izlemezsek external colling yapmak zorunda kalırız buda deployment memoryleri arttırıyor.

    function hasRole(
        bytes32 _role,
        address _account
    ) internal view returns (bool) {
        return (roleManager.hasRole(_role, _account));
    }

    function isNotBanned(
        address _userAddress,
        uint _functionID
    ) internal view returns (bool) {
        return !roleManager.isBanned(_userAddress, _functionID);
    }

    function isKYCed(
        address _userAddress,
        uint _functionID
    ) internal view returns (bool) {
        return roleManager.isKYCed(_userAddress, _functionID);
    }
}
