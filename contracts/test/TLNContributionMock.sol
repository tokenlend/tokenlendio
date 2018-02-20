pragma solidity 0.4.19;

import '../TLNContribution.sol';

// @dev TLNContributionMock mocks current block number

contract TLNContributionMock is TLNContribution {

    function TLNContributionMock() public TLNContribution() {}

    function getBlockNumber() internal constant returns (uint) {
        return mock_blockNumber;
    }

    function setMockedBlockNumber(uint _b) public {
        mock_blockNumber = _b;
    }

    uint mock_blockNumber = 1;
}
