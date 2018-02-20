pragma solidity 0.4.19;

import '../TLN.sol';

// @dev TLNMock mocks current block number

contract TLNMock is TLN {

    function TLNMock(address _tokenFactory) public TLN(_tokenFactory) {}

    function getBlockNumber() internal constant returns (uint) {
        return mock_blockNumber;
    }

    function setMockedBlockNumber(uint _b) public {
        mock_blockNumber = _b;
    }

    uint mock_blockNumber = 1;
}
