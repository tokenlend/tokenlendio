pragma solidity ^0.4.18;

/*
    Copyright (c) 2018 Disc Soft Ltd.
    https://tokenlend.io/

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

import "./MiniMeToken.sol";
import "./TLNConfig.sol";

contract TLN is MiniMeToken, TLNConfig {
    // @dev TLN constructor just parametrizes the MiniMeIrrevocableVestedToken constructor
    function TLN(address _tokenFactory) public
            MiniMeToken(
                _tokenFactory,
                0x0,                     // no parent token
                0,                       // no snapshot block number from parent
                TLN_TOKEN_NAME,          // Token name
                TLN_TOKEN_DECIMALS,      // Decimals
                TLN_TOKEN_SYMBOL,        // Symbol
                true                     // Enable transfers
            ) {}
}
