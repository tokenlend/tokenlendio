const should = require('chai')
    .use(require('chai-as-promised'))
    .use(require('chai-bignumber')(web3.BigNumber))
    .should();

const decimalsFactor = new web3.BigNumber(10).pow(18);

const helper = module.exports = {
    log: (message, value) => console.log('      ' + message + ': ' + value),
    getBalance: address => web3.eth.getBalance(address),
    toWei: value => value.toString(10),
    toEther: value => Number(web3.fromWei(value, 'ether')),
    getTlnByContractAndAccount: async (contract, account) => {
        return helper.divByDecimalsFactor(await contract.balanceOf(account))
    },
    divByDecimalsFactor: value => web3.toBigNumber(value).div(decimalsFactor),
    toTln: value => helper.divByDecimalsFactor(web3.toBigNumber(value).mul(2500)),
    mulByDecimalsFactor: value => decimalsFactor.mul(value),
    logContractCallCost: (balanceBefore, balanceAfter, message = 'Cost') => {
        const costInETH = helper.toEther(balanceBefore - balanceAfter);
        helper.log(message, costInETH + ' ETH');
        return costInETH;
    }
}