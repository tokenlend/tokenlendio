const web3 = require('web3/lib/utils/utils');

module.exports = {
    startBlockPresale: 2742274,
    endBlockPresale: 2742754,

    startBlockIco: 2742874,
    endBlockIco: 2743354,

    teamAccounts: [
        '0xBEe5c7267E5Ae584f97F6D503a6d17af6C2C022C',
        '0x8b6448C9e26f41Ca3034D514901515EAB9577D98',
    ],
    communityAccounts: [
        '0xFbED50a1DcbF6fd2993618278CebE534f6232D38',
    ],
    advisorsAccounts: [
        '0x194DAD5F6F808Ed3C7Ca5D05F1Cc54b0CfDe9A8B',
    ],
    bountiesAccounts: [
        '0x1B8c997e18dC17db8d6A14DF69f3d4A43E1f907A',
    ],
    initialInvestors: [
        {
            address: '0xcdBde543B72aD77AB5CE683A3f89c28c962a3D59',
            baseTokens: web3.toWei(1400),
            bonusTokens: web3.toWei(350)
        },
    ]
}