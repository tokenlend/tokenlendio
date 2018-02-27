pragma solidity 0.4.19;

import '../AdvisoryTokensHolder.sol';

// @dev AdvisoryTokensHolderMock mocks current block number

contract AdvisoryTokensHolderMock is AdvisoryTokensHolder {

    function AdvisoryTokensHolderMock(address _owner, address _contribution, address _tln) public
    AdvisoryTokensHolder(_owner, _contribution, _tln) {
        mock_time = now;
    }

    function getTime() internal view returns (uint256) {
        return mock_time;
    }

    function setMockedTime(uint256 _t) public {
        mock_time = _t;
    }

    uint256 mock_time;
}
