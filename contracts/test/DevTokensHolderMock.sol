pragma solidity 0.4.19;

import '../DevTokensHolder.sol';

// @dev DevTokensHolderMock mocks current block number

contract DevTokensHolderMock is DevTokensHolder {

    uint mock_time;

    function DevTokensHolderMock(address _owner, address _contribution, address _tln) public
    DevTokensHolder(_owner, _contribution, _tln) {
        mock_time = now;
    }

    function getTime() internal view returns (uint) {
        return mock_time;
    }

    function setMockedTime(uint _t) public {
        mock_time = _t;
    }
}
