const MultiSigWallet = artifacts.require('MultiSigWallet');
const MiniMeTokenFactory = artifacts.require('MiniMeTokenFactory');
const Tln = artifacts.require('TLN');
const TlnContributionMock = artifacts.require('TLNContributionMock');
const ContributionWallet = artifacts.require('ContributionWallet');
const TeamTokensHolderMock = artifacts.require('DevTokensHolderMock');
const AdvisorsTokensHolderMock = artifacts.require('AdvisoryTokensHolderMock');
const TlnPlaceHolderMock = artifacts.require('TLNPlaceHolderMock');

const assertFail = require('./helpers/assertFail');
const assertStateChangedEvent = require('./helpers/assertStateChangedEvent');
const helper = require('./helpers/base');

contract('TlnContribution', (accounts) => {
    const owner = accounts[0];
    const accountTeam1 = accounts[1];
    const accountTeam2 = accounts[2];
    const accountCommunity = accounts[3];
    const accountAdvisors = accounts[4];
    const accountBounties = accounts[5];
    const investor1 = accounts[6];
    const investor2 = accounts[7];
    const investor3 = accounts[8];
    const investor4 = accounts[9];
    const investor5 = accounts[10];

    let multisigTeam;

    let multisigCommunity;
    let multisigAdvisories;
    let multisigBounties;
    let miniMeTokenFactory;
    let tln;
    let tlnContribution;
    let contributionWallet;

    let teamTokensHolder;
    let advisorsTokensHolder;
    let tlnPlaceHolder;

    const startBlockPresale = 1010000;
    const endBlockPresale = 1020000;
    const startBlockIco = 1030000;
    const endBlockIco = 1040000;

    const presaleMaxAmount = web3.toWei(3500);

    const deployContracts = async () => {
        multisigTeam = await MultiSigWallet.new([accountTeam1, accountTeam2], 1);
        multisigCommunity = await MultiSigWallet.new([accountCommunity], 1);
        multisigAdvisors = await MultiSigWallet.new([accountAdvisors], 1);
        multisigBounties = await MultiSigWallet.new([accountBounties], 1);

        miniMeTokenFactory = await MiniMeTokenFactory.new();

        tln = await Tln.new(miniMeTokenFactory.address);

        tlnContribution = await TlnContributionMock.new();

        contributionWallet = await ContributionWallet.new(
            multisigTeam.address,
            endBlockIco,
            tlnContribution.address);

        teamTokensHolder = await TeamTokensHolderMock.new(
            multisigTeam.address,
            tlnContribution.address,
            tln.address);

        advisorsTokensHolder = await AdvisorsTokensHolderMock.new(
            multisigAdvisors.address,
            tlnContribution.address,
            tln.address);

        tlnPlaceHolder = await TlnPlaceHolderMock.new(
            multisigCommunity.address,
            tln.address,
            tlnContribution.address);

        await tln.changeController(tlnContribution.address);

        await tlnContribution.initialize(
            tln.address,
            tlnPlaceHolder.address,

            startBlockIco,
            endBlockIco,
            startBlockPresale,
            endBlockPresale,

            contributionWallet.address,

            advisorsTokensHolder.address,
            teamTokensHolder.address,
            multisigBounties.address);
    };

    describe('Deploy', () => {
        const balanceBefore = helper.getBalance(owner);

        before(deployContracts);

        it('check deploy cost', async () => {
            const balanceAfter = helper.getBalance(owner);
            const deployCostInEth = helper.logContractCallCost(
                balanceBefore, balanceAfter, 'Deploy cost'
            );
            assert.isBelow(deployCostInEth, 0.05);
        });

        it('check initial parameters', async () => {
            assert.equal(await tln.controller(), tlnContribution.address);
            assert.equal(await tlnContribution.currentState.call(), 0);
        });
    });

    describe('Pre-sale', () => {
        beforeEach(deployContracts);

        it('should not allow to buy before the sale starts', async () => {
            const investorBalanceBefore = helper.getBalance(investor2);
            await assertFail(async () => {
                await tln.sendTransaction({ value: web3.toWei(1), from: investor2, gasPrice: 0 });
            });
            assert.equal(helper.getBalance(contributionWallet.address), 0);

            const investorBalanceAfter = helper.getBalance(investor2);
            investorBalanceAfter.should.be.bignumber.equal(investorBalanceBefore);
        });

        it('should not allow to buy when pre-sale valid block and invalid stage', async () => {
            await tlnContribution.setMockedBlockNumber(startBlockPresale);
            await assertFail(async () => {
                await tln.sendTransaction({ value: web3.toWei(1), from: investor2, gasPrice: 0 });
            });
        });

        it('should not allow to buy when pre-sale incorrect block and valid stage', async () => {
            await tlnContribution.setMockedBlockNumber(startBlockPresale - 1);
            const setStateResult = await tlnContribution.startPresale();
            await assertFail(async () => {
                await tln.sendTransaction({ value: web3.toWei(1), from: investor2, gasPrice: 0 });
            });
            assertStateChangedEvent(setStateResult, 2);
        });

        it('check purchase with 20% bonuses', async () => {
            await tlnContribution.setMockedBlockNumber(startBlockPresale);
            await tlnContribution.startPresale();

            const amount = web3.toWei(500);
            assert.ok(await tln.sendTransaction({ value: amount, from: investor2, gasPrice: 0 }));
            helper.getBalance(contributionWallet.address).should.be.bignumber.equal(amount);
            const expectedInvestorTln = helper.toTln(web3.toBigNumber(amount).mul(1.2));
            const actualInvestorTln = await helper.getTlnByContractAndAccount(tln, investor2);
            actualInvestorTln.should.be.bignumber.equal(expectedInvestorTln);

            (await tlnContribution.totalCollectedPresale()).should.be.bignumber.equal(amount);
        });

        it('check 2 purchases from same investor', async () => {
            await tlnContribution.setMockedBlockNumber(startBlockPresale);
            await tlnContribution.startPresale();

            const amount1 = web3.toWei(1);
            const amount2 = web3.toWei(1.1);
            const total = web3.toBigNumber(amount1).add(amount2);
            assert.ok(await tln.sendTransaction({ value: amount1, from: investor2, gasPrice: 0 }));

            await tlnContribution.setMockedBlockNumber(startBlockPresale + 20);
            assert.ok(await tln.sendTransaction({ value: amount2, from: investor2, gasPrice: 0 }));

            const expectedInvestorTln = helper.toTln(web3.toBigNumber(total).mul(1.2));
            const actualInvestorTln = await helper.getTlnByContractAndAccount(tln, investor2);
            actualInvestorTln.should.be.bignumber.equal(expectedInvestorTln);

            (await tlnContribution.totalCollectedPresale()).should.be.bignumber.equal(total);
            (await tln.totalSupply()).should.be.bignumber.equal(
                helper.mulByDecimalsFactor(expectedInvestorTln)
            );
        });

        it('check 2 purchases from same investor should revert second transaction', async () => {
            await tlnContribution.setMockedBlockNumber(startBlockPresale);
            await tlnContribution.startPresale();

            const amount = web3.toWei(1);
            assert.ok(await tln.sendTransaction({ value: amount, from: investor2, gasPrice: 0 }));

            await tlnContribution.setMockedBlockNumber(startBlockPresale + 19);
            await assertFail(async () => {
                await tln.sendTransaction({ value: amount, from: investor2, gasPrice: 0 });
            });

            const expectedInvestorTln = helper.toTln(web3.toBigNumber(amount).mul(1.2));
            const actualInvestorTln = await helper.getTlnByContractAndAccount(tln, investor2);
            actualInvestorTln.should.be.bignumber.equal(expectedInvestorTln);

            (await tlnContribution.totalCollectedPresale()).should.be.bignumber.equal(amount);
        });

        it('should not allow purchase less than 1 ETH', async () => {
            await tlnContribution.setMockedBlockNumber(startBlockPresale);
            await tlnContribution.startPresale();

            const investorBalanceBefore = helper.getBalance(investor2);
            await assertFail(async () => {
                await tln.sendTransaction(
                    { value: web3.toWei('0.999999999999999999'), from: investor2, gasPrice: 0 }
                );
            });
            assert.equal(helper.getBalance(contributionWallet.address), 0);

            const investorBalanceAfter = helper.getBalance(investor2);
            investorBalanceAfter.should.be.bignumber.equal(investorBalanceBefore);
        });

        it('check purchase more than pre-sale cap', async () => {
            await tlnContribution.setMockedBlockNumber(startBlockPresale);
            await tlnContribution.startPresale();

            const investorBalanceBefore = helper.getBalance(investor5);

            const amount = web3.toBigNumber(presaleMaxAmount).plus(web3.toWei(0.5));
            assert.ok(await tln.sendTransaction({ value: amount, from: investor5, gasPrice: 0 }));
            helper.getBalance(contributionWallet.address).should.be.bignumber.equal(presaleMaxAmount);
            const expectedInvestorTln = helper.toTln(web3.toBigNumber(presaleMaxAmount).mul(1.2));
            const actualInvestorTln = await helper.getTlnByContractAndAccount(tln, investor5);
            actualInvestorTln.should.be.bignumber.equal(expectedInvestorTln);

            (await tlnContribution.totalCollectedPresale()).should.be.bignumber.equal(presaleMaxAmount);

            const investorBalanceAfter = helper.getBalance(investor5);
            investorBalanceAfter.should.be.bignumber.equal(investorBalanceBefore.sub(presaleMaxAmount));
        });

        it('should not allow to buy with gas price more than 50 gwei', async () => {
            await tlnContribution.setMockedBlockNumber(startBlockPresale);
            await tlnContribution.startPresale();

            const investorBalanceBefore = helper.getBalance(investor2);

            const gasPrice = web3.toBigNumber(web3.toWei(50, 'gwei')).plus(1);
            await assertFail(async () => {
                await tln.sendTransaction({ value: web3.toWei(1), from: investor2, gasPrice: gasPrice });
            });
            assert.equal(helper.getBalance(contributionWallet.address), 0);

            const investorBalanceAfter = helper.getBalance(investor2);
            investorBalanceAfter.should.be.bignumber.above(
                investorBalanceBefore.sub(gasPrice.mul(21000 * 2))
            );
        });

        it('check pause and resumption', async () => {
            await tlnContribution.startPresale();
            await tlnContribution.setMockedBlockNumber(startBlockPresale);
            let setStateResult = await tlnContribution.pausePresale();
            assertStateChangedEvent(setStateResult, 1);
            await assertFail(async () => {
                await tln.sendTransaction({ value: web3.toWei(1), from: investor2, gasPrice: 0 });
            });
            setStateResult = await tlnContribution.resumePresale();
            assertStateChangedEvent(setStateResult, 2);
            assert.ok(await tln.sendTransaction({ value: web3.toWei(1), from: investor2, gasPrice: 0 }));
        });

        it('should not allow to buy after pre-sale cap collected', async () => {
            await tlnContribution.setMockedBlockNumber(startBlockPresale);
            await tlnContribution.startPresale();

            assert.ok(await tln.sendTransaction({ value: presaleMaxAmount, from: investor5, gasPrice: 0 }));
            assert.equal((await tlnContribution.currentState.call()).toNumber(), 3);

            await assertFail(async () => {
                await tln.sendTransaction({ value: web3.toWei(1), from: investor2, gasPrice: 0 });
            });
        });
    });

    describe('States', () => {
        before(deployContracts);

        it('should not allow pause after init', async () => {
            await assertFail(async () => {
                await tlnContribution.setState(1);
            });
        });

        it('should not allow pre-sale finish after init', async () => {
            await assertFail(async () => {
                await tlnContribution.setState(3);
            });
        });

        it('should not allow ICO start after init', async () => {
            await assertFail(async () => {
                await tlnContribution.setState(4);
            });
        });

        it('should not allow ICO finish after init', async () => {
            await assertFail(async () => {
                await tlnContribution.setState(5);
            });
        });

        it('should allow pause after pre-sale start', async () => {
            await tlnContribution.startPresale();
            const balanceBefore = helper.getBalance(owner);
            let setStateResult = await tlnContribution.setState(1);
            assertStateChangedEvent(setStateResult, 1);
            const balanceAfter = helper.getBalance(owner);
            helper.logContractCallCost(balanceBefore, balanceAfter, 'Cost setState()');
        });

        it('should not allow set same state', async () => {
            await assertFail(async () => {
                await tlnContribution.setState(1);
            });
        });

        it('should allow pre-sale start after pause', async () => {
            const setStateResult = await tlnContribution.setState(2);
            assertStateChangedEvent(setStateResult, 2);
        });

        it('should not allow pre-sale finish after pause', async () => {
            await tlnContribution.pausePresale();

            await assertFail(async () => {
                await tlnContribution.setState(3);
            });
        });

        it('should not allow ICO start after pre-sale pause', async () => {
            await assertFail(async () => {
                await tlnContribution.setState(4);
            });
        });

        it('should allow pre-sale finish after pre-sale start', async () => {
            await tlnContribution.startPresale();

            const setStateResult = await tlnContribution.setState(3);
            assertStateChangedEvent(setStateResult, 3);
        });

        it('should not allow pause after pre-sale finish', async () => {
            await assertFail(async () => {
                await tlnContribution.pausePresale();
            });
        });

        it('should allow ICO start after pre-sale finish', async () => {
            const setStateResult = await tlnContribution.setState(4);
            assertStateChangedEvent(setStateResult, 4);
        });

        it('should allow pause after ICO start', async () => {
            const setStateResult = await tlnContribution.pauseContribution();
            assertStateChangedEvent(setStateResult, 1);
        });

        it('should not allow ICO start after pause with incorrect block', async () => {
            await assertFail(async () => {
                await tlnContribution.setState(4);
            });
        });

        it('should allow ICO start after pause with valid block', async () => {
            await tlnContribution.setMockedBlockNumber(startBlockIco);
            const setStateResult = await tlnContribution.resumeContribution();
            assertStateChangedEvent(setStateResult, 4);
        });

        it('should allow ICO finish after start', async () => {
            const setStateResult = await tlnContribution.setState(5);
            assertStateChangedEvent(setStateResult, 5);
        });

        it('should not allow any states after ICO finish', async () => {
            for (let state of [0, 1, 2, 3, 4]) {
                await assertFail(async () => {
                    await tlnContribution.setState(state);
                });
            }
        });
    });

    describe('ICO Contribution', () => {
        beforeEach(deployContracts);

        it('should not allow to buy when valid block and invalid stage', async () => {
            await tlnContribution.setMockedBlockNumber(startBlockIco);
            await tlnContribution.startPresale();
            await assertFail(async () => {
                await tln.sendTransaction({ value: web3.toWei(1), from: investor5, gasPrice: 0 });
            });
        });

        it('should not allow to buy when incorrect block and valid stage', async () => {
            await tlnContribution.setMockedBlockNumber(startBlockIco - 1);
            await tlnContribution.startIco();
            await assertFail(async () => {
                await tln.sendTransaction({ value: web3.toWei(1), from: investor5, gasPrice: 0 });
            });
        });

        it('check purchase 1 TLN', async () => {
            await tlnContribution.setMockedBlockNumber(startBlockIco);
            await tlnContribution.startIco();

            const amount = web3.toWei(0.0004);
            assert.ok(await tln.sendTransaction({ value: amount, from: investor1, gasPrice: 0 }));
            helper.getBalance(contributionWallet.address).should.be.bignumber.equal(amount);
            const expectedInvestorTln = helper.toTln(web3.toBigNumber(amount).mul(1.1));
            const actualInvestorTln = await helper.getTlnByContractAndAccount(tln, investor1);
            actualInvestorTln.should.be.bignumber.equal(expectedInvestorTln);

            (await tlnContribution.totalCollected()).should.be.bignumber.equal(amount);
            (await tln.totalSupply()).should.be.bignumber.equal(
                helper.mulByDecimalsFactor(expectedInvestorTln)
            );
        });

        it('should allow to buy less than 1 TLN', async () => {
            await tlnContribution.setMockedBlockNumber(startBlockIco);
            await tlnContribution.startIco();

            const amount = helper.getBalance(investor3);
            assert.isBelow(amount, web3.toWei(0.0004));
            assert.ok(await tln.sendTransaction({ value: amount, from: investor3, gasPrice: 0 }));
            helper.getBalance(contributionWallet.address).should.be.bignumber.equal(amount);
            const expectedInvestorTln = helper.toTln(web3.toBigNumber(amount).mul(1.1));
            const actualInvestorTln = await helper.getTlnByContractAndAccount(tln, investor3);
            actualInvestorTln.should.be.bignumber.equal(expectedInvestorTln);

            (await tlnContribution.totalCollected()).should.be.bignumber.equal(amount);
            (await tln.totalSupply()).should.be.bignumber.equal(
                helper.mulByDecimalsFactor(expectedInvestorTln)
            );
        });

        it('check 2 purchases from same investor', async () => {
            await tlnContribution.setMockedBlockNumber(startBlockIco);
            await tlnContribution.startIco();

            const amount1 = web3.toWei(0.0004);
            const amount2 = web3.toWei(0.0008);
            const total = web3.toBigNumber(amount1).add(amount2);
            assert.ok(await tln.sendTransaction({ value: amount1, from: investor2, gasPrice: 0 }));

            await tlnContribution.setMockedBlockNumber(startBlockIco + 20);
            assert.ok(await tln.sendTransaction({ value: amount2, from: investor2, gasPrice: 0 }));

            const expectedInvestorTln = helper.toTln(web3.toBigNumber(total).mul(1.1));
            const actualInvestorTln = await helper.getTlnByContractAndAccount(tln, investor2);
            actualInvestorTln.should.be.bignumber.equal(expectedInvestorTln);

            (await tlnContribution.totalCollected()).should.be.bignumber.equal(total);
            (await tln.totalSupply()).should.be.bignumber.equal(
                helper.mulByDecimalsFactor(expectedInvestorTln)
            );
        });

        it('check 2 purchases from same investor should revert second transaction', async () => {
            await tlnContribution.setMockedBlockNumber(startBlockIco);
            await tlnContribution.startIco();

            const amount = web3.toWei(0.0004);
            assert.ok(await tln.sendTransaction({ value: amount, from: investor2, gasPrice: 0 }));

            await tlnContribution.setMockedBlockNumber(startBlockPresale + 19);
            await assertFail(async () => {
                await tln.sendTransaction({ value: amount, from: investor2, gasPrice: 0 });
            });

            const expectedInvestorTln = helper.toTln(web3.toBigNumber(amount).mul(1.1));
            const actualInvestorTln = await helper.getTlnByContractAndAccount(tln, investor2);
            actualInvestorTln.should.be.bignumber.equal(expectedInvestorTln);

            (await tlnContribution.totalCollected()).should.be.bignumber.equal(amount);
        });

        it('should not allow purchase more than 2000 ETH', async () => {
            await tlnContribution.setMockedBlockNumber(startBlockIco);
            await tlnContribution.startIco();

            const investorBalanceBefore = helper.getBalance(investor5);
            await assertFail(async () => {
                await tln.sendTransaction(
                    { value: web3.toWei('2000.000000000000000001'), from: investor5, gasPrice: 0 }
                );
            });
            assert.equal(helper.getBalance(contributionWallet.address), 0);

            const investorBalanceAfter = helper.getBalance(investor5);
            investorBalanceAfter.should.be.bignumber.equal(investorBalanceBefore);
        });

        it('should not allow to buy with gas price more than 50 gwei', async () => {
            await tlnContribution.setMockedBlockNumber(startBlockIco);
            await tlnContribution.startIco();

            const investorBalanceBefore = helper.getBalance(investor2);

            const gasPrice = web3.toBigNumber(web3.toWei(50, 'gwei')).plus(1);
            await assertFail(async () => {
                await tln.sendTransaction({ value: web3.toWei(0.0004), from: investor2, gasPrice: gasPrice });
            });
            assert.equal(helper.getBalance(contributionWallet.address), 0);

            const investorBalanceAfter = helper.getBalance(investor2);
            investorBalanceAfter.should.be.bignumber.above(
                investorBalanceBefore.sub(gasPrice.mul(21000 * 2))
            );
        });

        it('check pause and resumption', async () => {
            await tlnContribution.setMockedBlockNumber(startBlockIco);
            await tlnContribution.startIco();
            let setStateResult = await tlnContribution.pauseContribution();
            assertStateChangedEvent(setStateResult, 1);
            await assertFail(async () => {
                await tln.sendTransaction({ value: web3.toWei(0.0004), from: investor2, gasPrice: 0 });
            });
            setStateResult = await tlnContribution.resumeContribution();
            assertStateChangedEvent(setStateResult, 4);
            assert.ok(
                await tln.sendTransaction({ value: web3.toWei(0.0004), from: investor2, gasPrice: 0 })
            );
        });

        it('check purchase 1000 ETH with 10% bonuses', async () => {
            await tlnContribution.setMockedBlockNumber(startBlockIco);
            await tlnContribution.startIco();

            const amount = web3.toWei(1000);
            assert.ok(await tln.sendTransaction({ value: amount, from: investor5, gasPrice: 0 }));
            helper.getBalance(contributionWallet.address).should.be.bignumber.equal(amount);
            const expectedInvestorTln = helper.toTln(web3.toBigNumber(amount).mul(1.1));
            const actualInvestorTln = await helper.getTlnByContractAndAccount(tln, investor5);
            actualInvestorTln.should.be.bignumber.equal(expectedInvestorTln);

            (await tlnContribution.totalCollected()).should.be.bignumber.equal(amount);
        });

        it('check purchase 1100 ETH with 10% and 7% bonuses', async () => {
            await tlnContribution.setMockedBlockNumber(startBlockIco);
            await tlnContribution.startIco();

            const amount = web3.toWei(1100);
            assert.ok(await tln.sendTransaction({ value: amount, from: investor5, gasPrice: 0 }));
            helper.getBalance(contributionWallet.address).should.be.bignumber.equal(amount);
            const expectedStage1Tln = helper.toTln(web3.toWei(1000)).mul(1.1);
            const expectedStage2Tln = helper.toTln(web3.toWei(100)).mul(1.07);
            const expectedInvestorTln = expectedStage1Tln.plus(expectedStage2Tln);

            const actualInvestorTln = await helper.getTlnByContractAndAccount(tln, investor5);
            actualInvestorTln.should.be.bignumber.equal(expectedInvestorTln);

            (await tlnContribution.totalCollected()).should.be.bignumber.equal(amount);
        });

        it('check purchase with 7% and 5% bonuses', async () => {
            await tlnContribution.setMockedBlockNumber(startBlockIco);
            await tlnContribution.startIco();

            const amount = web3.toWei(2000);
            assert.ok(await tln.sendTransaction({ value: amount, from: investor5, gasPrice: 0 }));
            const investorTlnBefore = await helper.getTlnByContractAndAccount(tln, investor5);

            await tlnContribution.setMockedBlockNumber(startBlockIco + 20);
            assert.ok(await tln.sendTransaction({ value: amount, from: investor5, gasPrice: 0 }));

            const expectedStage2Tln = helper.toTln(web3.toWei(1000)).mul(1.07);
            const expectedStage3Tln = helper.toTln(web3.toWei(1000)).mul(1.05);
            const expectedInvestorTln = investorTlnBefore.plus(
                expectedStage2Tln.plus(expectedStage3Tln)
            );

            const actualInvestorTln = await helper.getTlnByContractAndAccount(tln, investor5);
            actualInvestorTln.should.be.bignumber.equal(expectedInvestorTln);

            (await tlnContribution.totalCollected()).should.be.bignumber.equal(amount * 2);
        });

        it('check purchase with 5% and 3% bonuses', async () => {
            await tlnContribution.setMockedBlockNumber(startBlockIco);
            await tlnContribution.startIco();

            const amount = web3.toWei(2000);
            let blockNumber = startBlockIco;
            for (let i = 0; i < 4; i++) {
                assert.ok(await tln.sendTransaction({ value: amount, from: investor5, gasPrice: 0 }));
                blockNumber += 20;
                await tlnContribution.setMockedBlockNumber(blockNumber);
            }
            const investorTlnBefore = await helper.getTlnByContractAndAccount(tln, investor5);

            assert.ok(await tln.sendTransaction({ value: amount, from: investor5, gasPrice: 0 }));

            const expectedStage3Tln = helper.toTln(web3.toWei(1000)).mul(1.05);
            const expectedStage4Tln = helper.toTln(web3.toWei(1000)).mul(1.03);
            const expectedInvestorTln = investorTlnBefore.plus(
                expectedStage3Tln.plus(expectedStage4Tln)
            );

            const actualInvestorTln = await helper.getTlnByContractAndAccount(tln, investor5);
            actualInvestorTln.should.be.bignumber.equal(expectedInvestorTln);

            (await tlnContribution.totalCollected()).should.be.bignumber.equal(amount * 5);
        });

        it('should be no bonuses after 21000 ETH', async () => {
            await tlnContribution.setMockedBlockNumber(startBlockIco);
            await tlnContribution.startIco();

            const amount = web3.toWei(1000);
            let blockNumber = startBlockIco;
            for (let i = 0; i < 21; i++) {
                assert.ok(await tln.sendTransaction({ value: amount, from: investor5, gasPrice: 0 }));
                blockNumber += 20;
                await tlnContribution.setMockedBlockNumber(blockNumber);
            }
            const investorTlnBefore = await helper.getTlnByContractAndAccount(tln, investor5);

            assert.ok(await tln.sendTransaction({ value: amount, from: investor5, gasPrice: 0 }));

            const expectedInvestorTln = investorTlnBefore.plus(helper.toTln(amount));

            const actualInvestorTln = await helper.getTlnByContractAndAccount(tln, investor5);
            actualInvestorTln.should.be.bignumber.equal(expectedInvestorTln);

            (await tlnContribution.totalCollected()).should.be.bignumber.equal(amount * 22);
        });

        it('should not allow to buy after hard cap collected', async () => {
            await tlnContribution.setMockedBlockNumber(startBlockIco);
            await tlnContribution.startIco();

            const amount = web3.toWei(2000);
            let blockNumber = startBlockIco;
            for (let i = 0; i < 20; i++) {
                assert.ok(await tln.sendTransaction({ value: amount, from: investor5, gasPrice: 0 }));
                blockNumber += 20;
                await tlnContribution.setMockedBlockNumber(blockNumber);
            }

            const investorBalanceBefore = helper.getBalance(investor5);
            assert.ok(await tln.sendTransaction({ value: web3.toWei(1000.01), from: investor5, gasPrice: 0 }));
            const investorBalanceAfter = helper.getBalance(investor5);
            investorBalanceBefore.sub(investorBalanceAfter).should.be.bignumber.equal(web3.toWei(1000));

            await assertFail(async () => {
                await tln.sendTransaction({ value: web3.toWei(0.0004), from: investor2, gasPrice: 0 });
            });

            helper.getBalance(contributionWallet.address).should.be.bignumber.equal(web3.toWei(41000));
        });

        it('check purchase with pre-sale', async () => {
            await tlnContribution.setMockedBlockNumber(startBlockPresale);
            await tlnContribution.startPresale();

            const investorBalanceBefore = helper.getBalance(investor5);

            const amount = web3.toWei(1);
            assert.ok(await tln.sendTransaction({ value: amount, from: investor5, gasPrice: 0 }));

            await tlnContribution.setState(3);
            await tlnContribution.setMockedBlockNumber(startBlockIco);
            await tlnContribution.setState(4);

            assert.ok(await tln.sendTransaction({ value: amount, from: investor5, gasPrice: 0 }));
            helper.getBalance(contributionWallet.address).should.be.bignumber.equal(amount * 2);

            const expectedInvestorTln = helper.toTln(
                web3.toBigNumber(amount).mul(1.2).plus(web3.toBigNumber(amount).mul(1.1))
            );
            const actualInvestorTln = await helper.getTlnByContractAndAccount(tln, investor5);
            actualInvestorTln.should.be.bignumber.equal(expectedInvestorTln);

            (await tlnContribution.totalCollectedPresale()).should.be.bignumber.equal(amount);
            (await tlnContribution.totalCollectedIco()).should.be.bignumber.equal(amount);
            (await tlnContribution.totalCollected()).should.be.bignumber.equal(amount * 2);

            const investorBalanceAfter = helper.getBalance(investor5);
            investorBalanceAfter.should.be.bignumber.equal(investorBalanceBefore.sub(amount * 2));

            (await tln.totalSupply()).should.be.bignumber.equal(
                helper.mulByDecimalsFactor(expectedInvestorTln)
            );
        });

        it('should not allow to buy after hard cap collected with pre-sale max amount', async () => {
            await tlnContribution.setMockedBlockNumber(startBlockPresale);
            await tlnContribution.startPresale();

            assert.ok(await tln.sendTransaction({ value: presaleMaxAmount, from: investor5, gasPrice: 0 }));

            await tlnContribution.setMockedBlockNumber(startBlockIco);
            await tlnContribution.setState(4);

            const amount = web3.toWei(2000);
            let blockNumber = startBlockIco;
            for (let i = 0; i < 18; i++) {
                assert.ok(await tln.sendTransaction({ value: amount, from: investor5, gasPrice: 0 }));
                blockNumber += 20;
                await tlnContribution.setMockedBlockNumber(blockNumber);
            }

            const investorBalanceBefore = helper.getBalance(investor5);
            assert.ok(await tln.sendTransaction({ value: web3.toWei(1500.01), from: investor5, gasPrice: 0 }));
            const investorBalanceAfter = helper.getBalance(investor5);
            investorBalanceBefore.sub(investorBalanceAfter).should.be.bignumber.equal(web3.toWei(1500));

            await assertFail(async () => {
                await tln.sendTransaction({ value: web3.toWei(0.0004), from: investor2, gasPrice: 0 });
            });

            helper.getBalance(contributionWallet.address).should.be.bignumber.equal(web3.toWei(41000));

            const expectedInvestorTln = helper.toTln(
                web3.toBigNumber(presaleMaxAmount).mul(1.2)
                    .plus(web3.toBigNumber(web3.toWei(1000)).mul(1.1))
                    .plus(web3.toBigNumber(web3.toWei(2000)).mul(1.07))
                    .plus(web3.toBigNumber(web3.toWei(6000)).mul(1.05))
                    .plus(web3.toBigNumber(web3.toWei(12000)).mul(1.03))
                    .plus(web3.toWei(16500))
            );
            const actualInvestorTln = await helper.getTlnByContractAndAccount(tln, investor5);
            actualInvestorTln.should.be.bignumber.equal(expectedInvestorTln);
        });
    });

    describe('Initial investors', () => {
        beforeEach(deployContracts);

        it('add initial investors after init', async () => {
            const baseTokensForInvestor1 = web3.toBigNumber(web3.toWei(1000));
            const bonusTokensForInvestor1 = web3.toWei(200);

            const baseTokensForInvestor2 = web3.toBigNumber(web3.toWei(10000));
            const bonusTokensForInvestor2 = web3.toWei(2500);

            await tlnContribution.addInitialInvestor(
                investor1, baseTokensForInvestor1, bonusTokensForInvestor1
            );
            const investor1Tln = web3.toBigNumber(await tln.balanceOf(investor1));
            investor1Tln.should.be.bignumber.equal(baseTokensForInvestor1.plus(bonusTokensForInvestor1));

            await tlnContribution.addInitialInvestor(
                investor2, baseTokensForInvestor2, bonusTokensForInvestor2
            );
            const investor2Tln = web3.toBigNumber(await tln.balanceOf(investor2));
            investor2Tln.should.be.bignumber.equal(baseTokensForInvestor2.plus(bonusTokensForInvestor2));

            const expectedEthAmount = baseTokensForInvestor1.plus(baseTokensForInvestor2).div(2500);
            const expectedTlnAmount = investor1Tln.plus(investor2Tln);
            (await tlnContribution.totalCollectedInitialInvestors()).should.be.bignumber.equal(expectedEthAmount);
            (await tln.totalSupply()).should.be.bignumber.equal(expectedTlnAmount);
        });

        it('should allow to add initial investor without bonus tokens', async () => {
            const baseTokens = web3.toBigNumber(web3.toWei(3500)).mul(2500);

            await tlnContribution.addInitialInvestor(
                investor1, baseTokens, 0
            );
            const investor1Tln = web3.toBigNumber(await tln.balanceOf(investor1));
            investor1Tln.should.be.bignumber.equal(baseTokens);
        });

        it('should not allow to add initial investor with base tokens > 3500 ETH equivalent', async () => {
            const baseTokens = web3.toBigNumber(web3.toWei('3500.00000000000001')).mul(2500);

            await assertFail(async () => {
                await tlnContribution.addInitialInvestor(
                    investor1, baseTokens, 0
                );
            });
        });

        it('add initial investor + pre-sale', async () => {
            const baseTokens = web3.toBigNumber(web3.toWei(2500));
            const bonusTokens = web3.toWei(500);

            await tlnContribution.addInitialInvestor(
                investor5, baseTokens, bonusTokens
            );

            await tlnContribution.setMockedBlockNumber(startBlockPresale);
            await tlnContribution.startPresale();

            const amount = web3.toWei(1);
            assert.ok(await tln.sendTransaction({ value: amount, from: investor5, gasPrice: 0 }));
            helper.getBalance(contributionWallet.address).should.be.bignumber.equal(amount);

            const investorTlnBeforePreSale = helper.divByDecimalsFactor(baseTokens.plus(bonusTokens));
            const expectedInvestorTln = helper.toTln(web3.toBigNumber(amount).mul(1.2))
                                              .plus(investorTlnBeforePreSale);

            const actualInvestorTln = await helper.getTlnByContractAndAccount(tln, investor5);
            actualInvestorTln.should.be.bignumber.equal(expectedInvestorTln);

            const initialInvestmentInEth = baseTokens.div(2500);
            (await tlnContribution.totalCollectedInitialInvestors()).should.be.bignumber.equal(
                initialInvestmentInEth
            );
            (await tlnContribution.totalCollectedPresale()).should.be.bignumber.equal(amount);
            (await tlnContribution.totalCollected()).should.be.bignumber.equal(initialInvestmentInEth.plus(amount));
        });

        it('add initial investor + main ICO', async () => {
            const baseTokens = web3.toBigNumber(web3.toWei(2500));
            const bonusTokens = web3.toWei(500);

            await tlnContribution.addInitialInvestor(
                investor5, baseTokens, bonusTokens
            );

            await tlnContribution.setMockedBlockNumber(startBlockIco);
            await tlnContribution.startIco();

            const amount = web3.toWei(1);
            assert.ok(await tln.sendTransaction({ value: amount, from: investor5, gasPrice: 0 }));
            helper.getBalance(contributionWallet.address).should.be.bignumber.equal(amount);

            const investorTlnBeforeIco = helper.divByDecimalsFactor(baseTokens.plus(bonusTokens));
            const expectedInvestorTln = helper.toTln(web3.toBigNumber(amount).mul(1.1))
                                              .plus(investorTlnBeforeIco);

            const actualInvestorTln = await helper.getTlnByContractAndAccount(tln, investor5);
            actualInvestorTln.should.be.bignumber.equal(expectedInvestorTln);

            const initialInvestmentInEth = baseTokens.div(2500);
            (await tlnContribution.totalCollectedInitialInvestors()).should.be.bignumber.equal(
                initialInvestmentInEth
            );
            (await tlnContribution.totalCollectedIco()).should.be.bignumber.equal(amount);
            (await tlnContribution.totalCollected()).should.be.bignumber.equal(initialInvestmentInEth.plus(amount));
        });

        it('should not allow to add initial investor with bonus tokens > 25%', async () => {
            const baseTokens = web3.toBigNumber(web3.toWei(1));

            await assertFail(async () => {
                await tlnContribution.addInitialInvestor(
                    investor1, baseTokens, baseTokens.div(4).plus(1)
                );
            });
        });

        it('should not allow to add initial investor after pre-sale start', async () => {
            const baseTokens = web3.toBigNumber(web3.toWei(1));
            for (let state of [2, 3, 4, 5]) {
                await tlnContribution.setState(state);

                await assertFail(async () => {
                    await tlnContribution.addInitialInvestor(
                        investor1, baseTokens, 0
                    );
                });
            }
        });
    });

    describe('Finalization', () => {
        beforeEach(deployContracts);

        it('should not allow to finalize before ICO start block', async () => {
            await tlnContribution.setMockedBlockNumber(startBlockPresale);
            await tlnContribution.startPresale();
            assert.ok(await tln.sendTransaction({ value: web3.toWei(1), from: investor5, gasPrice: 0 }));

            await assertFail(async () => {
                await tlnContribution.finalize();
            });

            await tlnContribution.setState(3);
            await tlnContribution.setMockedBlockNumber(startBlockIco - 1);
            await tlnContribution.setState(4);

            await assertFail(async () => {
                await tlnContribution.finalize();
            });
        });

        it('should not allow to finalize before end block when soft cap was not reached', async () => {
            await tlnContribution.setMockedBlockNumber(startBlockPresale);
            await tlnContribution.startPresale();
            assert.ok(await tln.sendTransaction({ value: presaleMaxAmount, from: investor5, gasPrice: 0 }));

            await tlnContribution.setState(4);
            await tlnContribution.setMockedBlockNumber(endBlockIco - 1);

            const amount = web3.toWei('1499.999999999999999999');
            assert.ok(await tln.sendTransaction({ value: amount, from: investor5, gasPrice: 0 }));
            await tlnContribution.setState(5);

            await assertFail(async () => {
                await tlnContribution.finalize();
            });
        });

        it('should allow to finalize before end block when soft cap was reached', async () => {
            const baseTokens = web3.toBigNumber(web3.toWei(2500));
            const bonusTokens = web3.toWei(500);

            await tlnContribution.addInitialInvestor(
                investor1, baseTokens, bonusTokens
            );

            await tlnContribution.setMockedBlockNumber(startBlockPresale);
            await tlnContribution.startPresale();
            assert.ok(await tln.sendTransaction({
                value: web3.toBigNumber(presaleMaxAmount).sub(web3.toWei(1)),
                from: investor5, gasPrice: 0
            }));

            await tlnContribution.setState(4);
            await tlnContribution.setMockedBlockNumber(endBlockIco - 1);

            const amount = web3.toWei(1500);
            assert.ok(await tln.sendTransaction({ value: amount, from: investor5, gasPrice: 0 }));

            const balanceBefore = helper.getBalance(owner);
            assert.ok(await tlnContribution.finalize());

            assert.equal((await tlnContribution.currentState.call()).toNumber(), 5);

            const balanceAfter = helper.getBalance(owner);
            const finalizationCostInEth = helper.logContractCallCost(
                balanceBefore, balanceAfter, 'Finalization cost'
            );
            assert.isBelow(finalizationCostInEth, 0.001);

            const totalEth = web3.toBigNumber(presaleMaxAmount).plus(amount).div(0.82);

            const expectedTeamTln = helper.toTln(totalEth.mul(0.14));
            const actualTeamTln = await helper.getTlnByContractAndAccount(tln, teamTokensHolder.address);
            assert.equal(actualTeamTln.toNumber(), expectedTeamTln.toNumber(), 'team');

            const expectedAdvisorsTln = helper.toTln(totalEth.mul(0.03));
            const actualAdvisorsTln = await helper.getTlnByContractAndAccount(tln, advisorsTokensHolder.address);
            assert.equal(actualAdvisorsTln.toNumber(), expectedAdvisorsTln.toNumber(), 'advisors');

            const expectedBountiesTln = helper.toTln(totalEth.mul(0.01));
            const actualBountiesTln = await helper.getTlnByContractAndAccount(tln, multisigBounties.address);
            assert.equal(actualBountiesTln.toNumber(), expectedBountiesTln.toNumber(), 'bounties');
        });

        it('should allow to finalize after end block when no investments', async () => {
            await tlnContribution.setMockedBlockNumber(endBlockIco + 1);

            const balanceBefore = helper.getBalance(investor5);
            assert.ok(await tlnContribution.finalize({ from: investor5 }));

            assert.equal((await tlnContribution.currentState.call()).toNumber(), 5);

            const balanceAfter = helper.getBalance(investor5);
            const finalizationCostInEth = helper.logContractCallCost(
                balanceBefore, balanceAfter, 'Finalization cost'
            );
            assert.isBelow(finalizationCostInEth, 0.001);

            assert.equal(await tln.totalSupply(), 0);

            const actualTeamTln = await helper.getTlnByContractAndAccount(tln, teamTokensHolder.address);
            assert.equal(actualTeamTln, 0, 'team');
        });

        it('should not allow to move ETH to the team multisig before finalization', async () => {
            await tlnContribution.setMockedBlockNumber(startBlockPresale);
            await tlnContribution.startPresale();
            assert.ok(await tln.sendTransaction({ value: presaleMaxAmount, from: investor5, gasPrice: 0 }));

            await multisigTeam.submitTransaction(
                contributionWallet.address,
                0,
                contributionWallet.contract.withdraw.getData(),
                { from: accountTeam1, gasPrice: 0 }
            );

            assert.equal(helper.getBalance(multisigTeam.address), 0);
        });

        it('should allow to move ETH to the team multisig after finalization', async () => {
            await tlnContribution.setMockedBlockNumber(startBlockPresale);
            await tlnContribution.startPresale();
            assert.ok(await tln.sendTransaction({ value: presaleMaxAmount, from: investor5, gasPrice: 0 }));

            await tlnContribution.setMockedBlockNumber(endBlockIco + 1);
            assert.ok(await tlnContribution.finalize());

            await multisigTeam.submitTransaction(
                contributionWallet.address,
                0,
                contributionWallet.contract.withdraw.getData(),
                { from: accountTeam1, gasPrice: 0 }
            );

            helper.getBalance(multisigTeam.address).should.be.bignumber.equal(presaleMaxAmount);
        });

        it('check that TLN controller is upgradeable', async () => {
            await tlnContribution.setMockedBlockNumber(endBlockIco + 1);
            assert.ok(await tlnContribution.finalize());

            await multisigCommunity.submitTransaction(
                tlnPlaceHolder.address,
                0,
                tlnPlaceHolder.contract.changeController.getData(multisigTeam.address),
                { from: accountCommunity, gasPrice: 0 }
            );

            assert.equal(await tln.controller(), multisigTeam.address);
        });
    });

    describe('Transfers', () => {
        let totalEth;
        let currentTime

        beforeEach(async () => {
            await deployContracts();

            await tlnContribution.setMockedBlockNumber(startBlockPresale);
            await tlnContribution.startPresale();
            await tln.sendTransaction({ value: presaleMaxAmount, from: investor5, gasPrice: 0 });

            await tlnContribution.setMockedBlockNumber(endBlockIco + 1);
            await tlnContribution.finalize();

            totalEth = web3.toBigNumber(presaleMaxAmount).div(0.82);
            currentTime = Math.floor(new Date().getTime() / 1000);
        });

        it('should allow transfers for investors after 1 week period', async () => {
            const t = currentTime + 86400 * 7 + 1000;
            await tlnPlaceHolder.setMockedTime(t);

            const inverstor5BalanceBefore = await helper.getTlnByContractAndAccount(tln, investor5);

            const amount = 250;
            await tln.transfer(investor1, web3.toWei(amount), { from: investor5 });

            const balance = await helper.getTlnByContractAndAccount(tln, investor1);
            balance.should.be.bignumber.equal(amount);

            const inverstor5BalanceAfter = await helper.getTlnByContractAndAccount(tln, investor5);
            inverstor5BalanceAfter.should.be.bignumber.equal(inverstor5BalanceBefore - amount);
        });

        it('should not allow transfers for investors for 1 week', async () => {
            const t = currentTime + 86400 * 7 - 10000;
            await tlnPlaceHolder.setMockedTime(t);

            const inverstor5BalanceBefore = await helper.getTlnByContractAndAccount(tln, investor5);

            const amount = 250;
            await assertFail(async () => {
                await tln.transfer(investor2, web3.toWei(amount), { from: investor5 });
            });

            const balance = await helper.getTlnByContractAndAccount(tln, investor2);
            balance.should.be.bignumber.equal(0);

            const inverstor5BalanceAfter = await helper.getTlnByContractAndAccount(tln, investor5);
            inverstor5BalanceAfter.should.be.bignumber.equal(inverstor5BalanceBefore);
        });

        it('should not allow team tokens transferring before 24 months', async () => {
            const t = currentTime + 86400 * 360 * 2 - 10000;
            await teamTokensHolder.setMockedTime(t);
            await tlnPlaceHolder.setMockedTime(currentTime + 86400 * 7 + 1000);

            await multisigTeam.submitTransaction(
                teamTokensHolder.address,
                0,
                teamTokensHolder.contract.collectTokens.getData(),
                { from: accountTeam1, gasPrice: 0 }
            );

            const balance = await helper.getTlnByContractAndAccount(tln, multisigTeam.address);
            balance.should.be.bignumber.equal(0);
        });

        it('should allow to transfer 50% team tokens after 24 months', async () => {
            const t = currentTime + 86400 * 360 * 2 + 10000;
            await teamTokensHolder.setMockedTime(t);
            await tlnPlaceHolder.setMockedTime(currentTime + 86400 * 7 + 1000);

            await multisigTeam.submitTransaction(
                teamTokensHolder.address,
                0,
                teamTokensHolder.contract.collectTokens.getData(),
                { from: accountTeam1, gasPrice: 0 }
            );

            const expectedTeamTln = helper.toTln(totalEth.mul(0.14).div(2));
            const actualTeamTln = await helper.getTlnByContractAndAccount(tln, multisigTeam.address);
            assert.equal(actualTeamTln.toNumber(), expectedTeamTln.toNumber());

            const balanceTeamTokensHolder = await helper.getTlnByContractAndAccount(
                tln, teamTokensHolder.address
            );
            assert.equal(actualTeamTln.toNumber(), expectedTeamTln.toNumber());
        });

        it('should allow to transfer all team tokens after 48 months', async () => {
            const t = currentTime + 86400 * 360 * 4 + 10000;
            await teamTokensHolder.setMockedTime(t);
            await tlnPlaceHolder.setMockedTime(currentTime + 86400 * 7 + 1000);

            await multisigTeam.submitTransaction(
                teamTokensHolder.address,
                0,
                teamTokensHolder.contract.collectTokens.getData(),
                { from: accountTeam1, gasPrice: 0 }
            );

            const expectedTeamTln = helper.toTln(totalEth.mul(0.14));
            const actualTeamTln = await helper.getTlnByContractAndAccount(tln, multisigTeam.address);
            assert.equal(actualTeamTln.toNumber(), expectedTeamTln.toNumber());

            const balanceTeamTokensHolder = await helper.getTlnByContractAndAccount(
                tln, teamTokensHolder.address
            );
            assert.equal(balanceTeamTokensHolder, 0);
        });

        it('should not allow advisors tokens transferring before 12 months', async () => {
            const t = currentTime + 86400 * 360 - 10000;
            await advisorsTokensHolder.setMockedTime(t);
            await tlnPlaceHolder.setMockedTime(currentTime + 86400 * 7 + 1000);

            await multisigAdvisors.submitTransaction(
                advisorsTokensHolder.address,
                0,
                teamTokensHolder.contract.collectTokens.getData(),
                { from: accountAdvisors, gasPrice: 0 }
            );

            const balance = await helper.getTlnByContractAndAccount(tln, multisigAdvisors.address);
            balance.should.be.bignumber.equal(0);
        });

        it('should allow to transfer all advisors tokens after 12 months', async () => {
            const t = currentTime + 86400 * 360 + 10000;
            await advisorsTokensHolder.setMockedTime(t);
            await tlnPlaceHolder.setMockedTime(currentTime + 86400 * 7 + 1000);

            await multisigAdvisors.submitTransaction(
                advisorsTokensHolder.address,
                0,
                teamTokensHolder.contract.collectTokens.getData(),
                { from: accountAdvisors, gasPrice: 0 }
            );

            const expectedAdvisorsTln = helper.toTln(totalEth.mul(0.03));
            const actualAdvisorsTln = await helper.getTlnByContractAndAccount(
                tln, multisigAdvisors.address
            );
            assert.equal(actualAdvisorsTln.toNumber(), expectedAdvisorsTln.toNumber());

            const balanceAdvisorsTokensHolder = await helper.getTlnByContractAndAccount(
                tln, advisorsTokensHolder.address
            );
            assert.equal(balanceAdvisorsTokensHolder, 0);
        });

        it('should allow to transfer bounties tokens after 1 week period', async () => {
            await tlnPlaceHolder.setMockedTime(currentTime + 86400 * 7 + 1000);

            const bountiesBalanceBefore = await helper.getTlnByContractAndAccount(
                tln, multisigBounties.address
            );

            const amount = 250;
            await multisigBounties.submitTransaction(
                tln.address,
                0,
                tln.contract.transfer.getData(investor3, web3.toWei(amount)),
                { from: accountBounties, gasPrice: 0 }
            );

            const balance = await helper.getTlnByContractAndAccount(tln, investor3);
            balance.should.be.bignumber.equal(amount);

            const bountiesBalanceAfter = await helper.getTlnByContractAndAccount(
                tln, multisigBounties.address
            );
            bountiesBalanceAfter.should.be.bignumber.equal(bountiesBalanceBefore.sub(amount));
        });
    });
});
