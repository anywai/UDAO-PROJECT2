
contract Deneme {

    mapping(address => uint256[][]) public ownedContents;

    function setOwnedContents(address contentReceiver, uint256 tokenId, uint256[] calldata finalParts) external {
        uint256[][] storage contentList = ownedContents[contentReceiver];

        // Check if this tokenId already exists
        if (tokenId >= contentList.length) {
            // If it doesn't exist, expand the array to accommodate the tokenId
            for (uint256 i = contentList.length; i <= tokenId; i++) {
                contentList.push(new uint256[](0));
            }
        }

        // Set the finalParts for the specified tokenId
        contentList[tokenId] = finalParts;
    }

    function getOwnedContents(address contentReceiver, uint256 tokenId) external view returns (uint256[] memory) {
        return ownedContents[contentReceiver][tokenId];
    }

    function returnAllOwnedContents(address contentReceiver) external view returns (uint256[][] memory) {
        return ownedContents[contentReceiver];
    }

    function newRefund(address contentReceiver, uint256 tokenId, uint256[] calldata finalParts) external {
            //require(adamda bu token var mı?)
            /*
            1,2
            4,5
            3
            [1][1,2,4,5,3]
            [1][], [][]
            [1][1,2,3]
            */
            /// @dev First remove specific content from the contentReceiver
            delete ownedContents[contentReceiver][tokenId];
            /// @dev Then add the content to the contentReceiver
            ownedContents[contentReceiver][tokenId] = finalParts;
            
    }
}