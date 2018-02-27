pragma solidity 0.4.19;

import '../ContributionWallet.sol';

// @dev ContributionWalletMock mocks current block number

contract ContributionWalletMock is ContributionWallet {

    function getBlockNumber() internal constant returns (uint) {
        return mock_blockNumber;
    }

    function setMockedBlockNumber(uint _b) public {
        mock_blockNumber = _b;
    }

    uint mock_blockNumber = 1;
}
