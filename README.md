# TLN Token

<img width="200px" src="https://tokenlend.io/images/logo_white.png"/>

## Technical definition

At the technical level TLN is a ERC20-compliant token, derived from [MiniMe Token](https://github.com/Giveth/minime).

TLN slightly differs from MiniMe after fixing the ERC20 short address attack and converting all values of  token amount from uint128 to uint256.

## Tokenlend contribution period

### Functional specification

#### Distribution

- 75% - will be distributed during the ICO.
- 7% - will be sold during the pre-sale
- 14% - founders and core team. 50% of these tokens will be locked for a 24 month period, and the remaining 50% will be locked for 48 months.
- 3% - legal and advisory. These tokens will be locked* for a 12 month period.
- 1% - bounty activities.

#### Whitelist

Addresses can be whitelisted during the whitelisting period. Addresses from this list are guaranteed to be deposited with appropriate TLN amount as stated in their token reservations at pre-sale opening.

#### Misc

Tokens are minted at 2500 TLN per 1 ETH (excl. bonus tokens)	

### TLN Sale flow

- Address: Given you on the token sale deposit page. For security reasons the Ethereum address to contribute ETH in the Token Sale will be available only for users registered through: https://tokenlend.io
- Gas limit: Please raise it to 250000 gas, because this is a smart contract transaction and it is more expensive than normal Ether transfer.
- Gas Price: Leave at 25 gwei. Do not go above 50 or the transaction will be rejected.

## Contracts

Token:

- [TLNPlaceHolder.sol](/contracts/TLNPlaceHolder.sol) - Takes control over the TLN after the contribution
- [AdvisoryTokensHolder.sol](/contracts/AdvisoryTokensHolder.sol) - Holds advisors' tokens
- [DevTokensHolder.sol](/contracts/DevTokensHolder.sol) - Holds developers' and founders' tokens

Sale:

- [TLNContribution.sol](/contracts/TLNContribution.sol) - Implements all contribution stages and TLN distribution logic
- [Bonuses.sol](/contracts/Bonuses.sol) - Contains bonus tiers data and sets current bonus tier according to specified conditions
- [ContributionWallet.sol](/contracts/ContributionWallet.sol) - Holds Ether during the contribution period
- [MultiSigWallet.sol](/contracts/MultiSigWallet.sol) - Multisignature wallet - allows multiple parties to agree on transaction before execution

Testnet:

- Example of a successful testnet sale: [TLN contribution](https://ropsten.etherscan.io/address/0x76dfcdc8d35c9ec1bca7a02288e9a32ef24f535f)
- Testnet TLN Token: [TLN](https://ropsten.etherscan.io/token/0x76dfcdc8d35c9ec1bca7a02288e9a32ef24f535f)
