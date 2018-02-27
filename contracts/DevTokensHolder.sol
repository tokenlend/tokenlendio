pragma solidity 0.4.19;

/*
    Copyright 2017, Jordi Baylina
    Copyright 2018, Disc Soft Ltd.

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

/// @title DevTokensHolder Contract
/// Based on Jordi Baylina
/// @dev This contract will hold the tokens of the developers.
///  50% of tokens will be locked* for a 24 month period, and
///  the remaining 50% will be locked* for 48 months.


import "./MiniMeToken.sol";
import "./TLNContribution.sol";
import "./SafeMath.sol";
import "./ERC20Token.sol";


contract DevTokensHolder is Owned {
    using SafeMath for uint256;

    uint256 collectedTokens;
    TLNContribution contribution;
    MiniMeToken tln;

    function DevTokensHolder(address _owner, address _contribution, address _tln) public {
        owner = _owner;
        contribution = TLNContribution(_contribution);
        tln = MiniMeToken(_tln);
    }


    /// @notice The Dev (Owner) will call this method to extract the tokens
    function collectTokens() public onlyOwner {
        uint256 balance = tln.balanceOf(address(this));
        uint256 total = collectedTokens.add(balance);

        uint256 finalizedTime = contribution.finalizedTime();

        /// 50% of tokens will be locked* for a 24 month period
        require(finalizedTime > 0 && getTime() > finalizedTime.add(months(24)));

        uint256 canExtract = total;

        /// the remaining 50% will be locked* for 48 months
        if(getTime() < finalizedTime.add(months(48))) {
            canExtract = total.div(2);
        }

        canExtract = canExtract.sub(collectedTokens);

        if (canExtract > balance) {
            canExtract = balance;
        }

        collectedTokens = collectedTokens.add(canExtract);
        assert(tln.transfer(owner, canExtract));

        TokensWithdrawn(owner, canExtract);
    }

    function months(uint256 m) internal pure returns (uint256) {
        return m.mul(30 days);
    }

    function getTime() internal view returns (uint256) {
        return now;
    }


    //////////
    // Safety Methods
    //////////

    /// @notice This method can be used by the controller to extract mistakenly
    ///  sent tokens to this contract.
    /// @param _token The address of the token contract that you want to recover
    ///  set to 0 in case you want to extract ether.
    function claimTokens(address _token) public onlyOwner {
        require(_token != address(tln));
        if (_token == 0x0) {
            owner.transfer(this.balance);
            return;
        }

        ERC20Token token = ERC20Token(_token);
        uint256 balance = token.balanceOf(this);
        token.transfer(owner, balance);
        ClaimedTokens(_token, owner, balance);
    }

    event ClaimedTokens(address indexed _token, address indexed _controller, uint256 _amount);
    event TokensWithdrawn(address indexed _holder, uint256 _amount);
}
