pragma solidity 0.4.19;

import '../TLNContribution.sol';

// @dev TLNContributionMock mocks current block number

contract TLNContributionMock is TLNContribution {

    function TLNContributionMock() public TLNContribution() {}

    function getBlockNumber() internal view returns (uint) {
        return mock_blockNumber;
    }

    function setMockedBlockNumber(uint _b) public {
        mock_blockNumber = _b;
    }

    function startPresale() public {
        setState(IcoState.PresaleRunning);
    }

    function startIco() public {
        setState(IcoState.PresaleRunning);
        setState(IcoState.PresaleFinished);
        setState(IcoState.ICORunning);
    }

    uint mock_blockNumber = 1;
}
