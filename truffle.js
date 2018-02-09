const HDWalletProvider = require('truffle-hdwallet-provider');

const mnemonic = process.env.TEST_MNEMONIC || 'real mnemonic real mnemonic real mnemonic real mnemonic real mnemonic real mnemonic';
const providerRopsten = new HDWalletProvider(mnemonic, 'https://ropsten.infura.io/', 0);
const providerKovan = new HDWalletProvider(mnemonic, 'https://kovan.infura.io', 0);

module.exports = {
  networks: {
    development: {
      host: 'localhost',
      port: 8545,
      network_id: '*', // Match any network id
    },
    testrpc: {
      host: 'localhost',
      port: 8545,
      network_id: '*', // Match any network id
    },
    ganache: {
      host: 'localhost',
      port: 7545,
      network_id: '*', // Match any network id
    },
  },
};
