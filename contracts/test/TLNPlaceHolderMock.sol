pragma solidity ^0.4.18;

import '../TLNPlaceHolder.sol';

// @dev TLNPlaceHolderMock mocks current block number

contract TLNPlaceHolderMock is TLNPlaceHolder {

    uint mock_time;

    function TLNPlaceHolderMock(address _owner, address _tln, address _contribution) public
            TLNPlaceHolder(_owner, _tln, _contribution) {
        mock_time = now;
    }

    function getTime() internal view returns (uint) {
        return mock_time;
    }

    function setMockedTime(uint _t) public {
        mock_time = _t;
    }
}
