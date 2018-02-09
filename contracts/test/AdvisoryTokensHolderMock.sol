pragma solidity ^0.4.18;

import '../AdvisoryTokensHolder.sol';

// @dev AdvisoryTokensHolderMock mocks current block number

contract AdvisoryTokensHolderMock is AdvisoryTokensHolder {

    function AdvisoryTokensHolderMock(address _owner, address _contribution, address _tln) public
    AdvisoryTokensHolder(_owner, _contribution, _tln) {
        mock_date = now;
    }

    function getTime() internal view returns (uint256) {
        return mock_date;
    }

    function setMockedDate(uint256 date) public {
        mock_date = date;
    }

    uint256 mock_date = now;
}
