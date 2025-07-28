// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract NewGovernanceTreasuryDummy {
    mapping(address => uint256) public tokenBalances;
    uint256 public maticBalance;
    event GovernanceFundReceived(address indexed token, uint256 amount);

    /// ONLY FOR TESTING PURPOSES ///
    mapping(address => bool) public bannedTokens;

    function setTokenBan(address token, bool banned) external {
        bannedTokens[token] = banned;
    }

    /// END OF ONLY FOR TESTING PURPOSES ///

    function addGovernanceFunds(address tokenAddress, uint256 amount) external {
        require(!bannedTokens[tokenAddress], "Token is banned"); /// ONLY FOR TESTING PURPOSES ///

        // Ödemeyi bu kontratın alması gerekiyor
        // Dolayısıyla ödeme token.transfer(governanceContract, amount) ile yapılmış olmalı
        // Bu fonksiyon sadece kaydı tutar
        if (tokenAddress != address(0)) {
            tokenBalances[tokenAddress] += amount;
        } else {
            maticBalance += amount;
        }

        emit GovernanceFundReceived(tokenAddress, amount);
    }

    // getter olarak optional
    function getBalance(address token) external view returns (uint256) {
        if (token == address(0)) {
            return maticBalance;
        } else {
            return tokenBalances[token];
        }
    }

    receive() external payable {
        if (bannedTokens[address(0)]) {
            revert("Token is banned"); // prevent direct ETH transfers
        }
    }
}
/*
checkWithdrawStatus: if (paymentId == 0) continue; //TODO: BATU buraya gelemedim ben
withdrawCoursePayments, _withdrawCoursePayments: Iif (paymentId == 0) continue; // TODO: BATU buraya gelemedim ben
_refundCourse : require(courseIndex > 0, "Course not found in receiver's owned list"); //TODO: BATU buraya gelemedim ben

refund: Erequire(sent, "Native refund failed");
withdraw: Eif (governanceAddress.code.length > 0) {


    function _withdrawCoursePayments(
        uint256 courseId,
        uint256 fromIndex,
        uint256 toIndex
    ) internal {
        uint256 withdrawnCompleted = 0;

        for (uint256 j = fromIndex; j <= toIndex; j++) {
            uint256 paymentId = courseSaleRecords[courseId][j];
            if (paymentId == 0) continue;

            Payment storage p = payments[paymentId];

            if (
                p.isRefunded ||
                p.isWithdrawn ||
                p.endOfRefundWindow >= block.timestamp
            ) {
                continue;
            }

            p.isWithdrawn = true;

            if (p.tokenAddress == address(0)) {
                (bool sent, ) = payable(msg.sender).call{
                    value: p.instructorShare
                }("");
                require(sent, "Native token transfer failed");
            } else {
                IERC20(p.tokenAddress).safeTransfer(
                    msg.sender,
                    p.instructorShare
                );
            }
            withdrawnCompleted++;
        }
        emit CoursePaymentsWithdrawn(
            courseId,
            fromIndex,
            toIndex,
            msg.sender,
            withdrawnCompleted
        );
    }


    function _withdrawCoursePayments2(
        uint256 courseId,
        uint256 fromIndex,
        uint256 toIndex
    ) internal {
        uint256 withdrawnCompleted = 0;

        for (uint256 j = fromIndex; j <= toIndex; j++) {
            uint256 paymentId = courseSaleRecords[courseId][j];
            if (paymentId == 0) continue;

            Payment storage p = payments[paymentId];

            if (
                p.isRefunded ||
                p.isWithdrawn ||
                p.endOfRefundWindow >= block.timestamp
            ) {
                continue;
            }

            // mark as withdrawn first (prevent reentrancy during transfer)
            p.isWithdrawn = true;
            // attempt transfer
            bool success;

            if (p.tokenAddress == address(0)) {
                // native transfer with low-level call
                (success, ) = payable(msg.sender).call{
                    value: p.instructorShare
                }("");
            } else {
                // ERC20 transfer with low-level call
                (success, ) = p.tokenAddress.call(
                    abi.encodeWithSelector(
                        IERC20.transfer.selector,
                        msg.sender,
                        p.instructorShare
                    )
                );

                // check return value (bool) if data is present
                if (success) {
                    assembly {
                        switch returndatasize()
                        case 0 {
                            success := 1 // eski ERC20: return etmiyor → kabul
                        }
                        case 32 {
                            returndatacopy(0, 0, 32)
                            success := eq(mload(0), 1) // sadece `true` kabul
                        }
                        default {
                            success := 0 // saçma veri döndürdü → reddet
                        }
                    }
                }
            }

            if (!success) {
                // revert withdrawn flag if transfer failed
                p.isWithdrawn = false;
                continue;
            }

            withdrawnCompleted++;
        }

        emit CoursePaymentsWithdrawn(
            courseId,
            fromIndex,
            toIndex,
            msg.sender,
            withdrawnCompleted
        );
    }

        // returndatasize() fonksiyonu en son yapılan .call() fonksiyonunun döndürdüğü veri boyutunu verir. Kaç byte?
        // eğer bool dndürdüyse 32 byte, eğer hiç veri döndürmediyse 0 byte
        // returndatacopy(...) fonksiyonu ise bu veriyi belleğe kopyalar.
        // returndatacomp(0,0,32) ile 0. byte'dan başlayarak 32 byte'lık veriyi memory[0:32]'ye yazar.
        // mload(0) ile memory[0:32] adresindeki veriyi okuruz.
    
    function _safeERC20Transfer(
        address token,
        address to,
        uint256 amount
    ) internal returns (bool success) {
        (success, ) = token.call(
            abi.encodeWithSelector(IERC20.transfer.selector, to, amount)
        );

        if (success) {
            assembly {
                switch returndatasize()
                case 0 {
                    success := 1
                }
                case 32 {
                    returndatacopy(0, 0, 32)
                    success := eq(mload(0), 1)
                }
                default {
                    success := 0
                }
            }
        }
    }


Ne Yapabilirsin?
🔸 1. Try/Catch Kullanımı (Yalnız External Calls için işe yarar):
ERC20 transferleri normalde try/catch ile sarılamaz çünkü transfer() external değil.

Ama proxy gibi durumlarda low-level call yapılırsa bu mümkün olabilir. Yine de bu karmaşıktır ve genelde önerilmez.

🔸 2. "Fail-soft" Yaklaşım:
Her ödeme transferini try/catch benzeri yapıya dönüştürüp, revert edenleri atlayarak devam etmek mümkün.

OpenZeppelin’in SafeERC20 kütüphanesi bu konuda yardımcı olur ama yine de bazı revertler önlenemez.

🔸 3. Withdraw'ları Gruplamaya Zorlamak:
Tek transaction’da çok fazla farklı tokenla işlem yapılmasına izin verme.

Veya voucher'ı tek tokenlı withdraw'larla sınırla.



*/
