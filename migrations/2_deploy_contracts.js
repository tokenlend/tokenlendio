const MultiSigWallet = artifacts.require('MultiSigWallet');
const MiniMeTokenFactory = artifacts.require('MiniMeTokenFactory');
const Tln = artifacts.require('TLN');
const TlnContribution = artifacts.require('TLNContribution');
const ContributionWallet = artifacts.require('ContributionWallet');
const TeamTokensHolder = artifacts.require('DevTokensHolder');
const AdvisorsTokensHolder = artifacts.require('AdvisoryTokensHolder');
const TlnPlaceHolder = artifacts.require('TLNPlaceHolder');

module.exports = async (deployer, network, accounts) => {
    if (network === 'development') return;  // Don't deploy on tests

    const config = require('./configs/' + network);

    console.log('');
    console.log('Deploying team multisig wallet...');
    const multisigTeam = await MultiSigWallet.new(config.teamAccounts, 1);
    console.log('Team multisig wallet address: ' + multisigTeam.address);
 
    console.log('');
    console.log('Deploying community multisig wallet...');
    const multisigCommunity = await MultiSigWallet.new(config.communityAccounts, 1);
    console.log('Community multisig wallet address: ' + multisigCommunity.address);

    console.log('');
    console.log('Deploying advisors multisig wallet...');
    const multisigAdvisors = await MultiSigWallet.new(config.advisorsAccounts, 1);
    console.log('Advisors multisig wallet address: ' + multisigAdvisors.address);

    console.log('');
    console.log('Deploying bounties multisig wallet...');
    const multisigBounties = await MultiSigWallet.new(config.bountiesAccounts, 1);
    console.log('Bounties multisig wallet address: ' + multisigBounties.address);

    console.log('');
    console.log('Deploying minime token factory...');
    const miniMeTokenFactory = await MiniMeTokenFactory.new();
    console.log('Minime token factory address: ' + miniMeTokenFactory.address);

    console.log('');
    console.log('Deploying TLN contract...');
    const tln = await Tln.new(miniMeTokenFactory.address);
    console.log('TLN contract address: ' + tln.address);

    console.log('');
    console.log('Deploying TlnContribution contract...');
    const tlnContribution = await TlnContribution.new();
    console.log('TlnContribution contract address: ' + tlnContribution.address);

    console.log('');
    console.log('Deploying contribution wallet...');
    const contributionWallet = await ContributionWallet.new(
        multisigTeam.address,
        config.endBlockIco,
        tlnContribution.address
    );
    console.log('Contribution wallet address: ' + contributionWallet.address);

    console.log('');
    console.log('Deploying team tokens holder...');
    const teamTokensHolder = await TeamTokensHolder.new(
        multisigTeam.address,
        tlnContribution.address,
        tln.address
    );
    console.log('Team tokens holder address: ' + teamTokensHolder.address);

    console.log('');
    console.log('Deploying advisors tokens holder...');
    const advisorsTokensHolder = await AdvisorsTokensHolder.new(
        multisigAdvisors.address,
        tlnContribution.address,
        tln.address
    );
    console.log('Advisors tokens holder address: ' + advisorsTokensHolder.address);

    console.log('');
    console.log('Deploying TlnPlaceHolder controller...');
    const tlnPlaceHolder = await TlnPlaceHolder.new(
        multisigCommunity.address,
        tln.address,
        tlnContribution.address
    );
    console.log('TlnPlaceHolder address: ' + tlnPlaceHolder.address);

    console.log('');
    console.log('Changing TLN controller to TlnContribution...');
    await tln.changeController(tlnContribution.address);
    console.log('TLN controller address: ' + tlnContribution.address);

    console.log('');
    console.log('Initializing TlnContribution...');
    await tlnContribution.initialize(
        tln.address,
        tlnPlaceHolder.address,

        config.startBlockIco,
        config.endBlockIco,
        config.startBlockPresale,
        config.endBlockPresale,

        contributionWallet.address,

        advisorsTokensHolder.address,
        teamTokensHolder.address,
        multisigBounties.address
    );
    console.log('TLN contribution initialized!');

    console.log('');
    console.log('Add initial investors...');
    for (let investor of config.initialInvestors) {
        await tlnContribution.addInitialInvestor(
            investor.address, investor.baseTokens, investor.bonusTokens
        );
        console.log('Investor ' + investor.address + ' added');
    }

    console.log('');
    console.log('Deploy finished!');
};
