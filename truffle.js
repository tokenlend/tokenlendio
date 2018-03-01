const HDWalletProvider = require('truffle-hdwallet-provider');

const mnemonic = process.env.TEST_MNEMONIC || 'tln mnemonic tln mnemonic tln mnemonic tln mnemonic tln mnemonic tln mnemonic';
const providerRopsten = new HDWalletProvider(mnemonic, 'https://ropsten.infura.io/');
const providerKovan = new HDWalletProvider(mnemonic, 'https://kovan.infura.io');

module.exports = {
  solc: {
    optimizer: {
      enabled: true,
      runs: 200
    }
  },
  mocha: {
    grep: '.'
  },
  networks: {
    live: {
      host: 'localhost',
      port: 8545,
      network_id: 1,
      gas: 4000000,
      gasPrice: 5000000000
    },
    development: {
      host: 'localhost',
      port: 8545,
      gasPrice: 2000000000,
      gas: 4000000,
      network_id: '*', // Match any network id
    },
    testrpc: {
      host: 'localhost',
      port: 8545,
      network_id: '*', // Match any network id
      gasPrice: 2000000000
    },
    ganache: {
      host: 'localhost',
      port: 8545,
      network_id: '*', // Match any network id
      gas: 4000000,
      gasPrice: 20000000000,
    },
    ropsten: {
      provider: providerRopsten,
      network_id: 3, // eslint-disable-line camelcase
      gas: 4000000,
      gasPrice: 2000000000,
    },
  },
};
