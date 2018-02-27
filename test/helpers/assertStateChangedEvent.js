require('truffle-test-utils').init();

module.exports = (result, expectedState) => {
    assert.web3Event(result, {
        event: 'StateChanged', args: { _state: expectedState }
    }, 'Event StateChanged(_state: ' + expectedState + ') expected');
};
