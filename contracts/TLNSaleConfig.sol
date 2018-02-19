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

/// @title Token Configuration

import "./SafeMath.sol";

contract TLNSaleConfig {

    using SafeMath for uint256;

    enum IcoState{
       Init,
       Paused,

       PresaleRunning,
       PresaleFinished,

       ICORunning,
       ICOFinished
    }

    uint256 constant public TLN_SOFT_CAP = 20000 ether;
    uint256 constant public TLN_HARD_CAP = 140000 ether;
    uint256 constant public TLN_HARD_CAP_PRESALE = 11047 ether;

    /// 2500 TLN per ETH
    uint256 constant public TLN_EXCHANGE_RATE = 2500;

    uint256 constant public TLN_MAX_GAS_PRICE = 50000000000;
    uint256 constant public TLN_MAX_CALL_FREQUENCY = 100;

    uint256 constant public TLN_BONUS_1_CAP = 3000 ether;
    uint256 constant public TLN_BONUS_1 = 10;
    uint256 constant public TLN_BONUS_2_CAP = 9000 ether;
    uint256 constant public TLN_BONUS_2 = 7;
    uint256 constant public TLN_BONUS_3_CAP = 21000 ether;
    uint256 constant public TLN_BONUS_3 = 5;
    uint256 constant public TLN_BONUS_4_CAP = 45000 ether;
    uint256 constant public TLN_BONUS_4 = 3;

    uint256 constant public TLN_BONUS_PRESALE = 20;

    //////////
    // Pure functions
    //////////

    function getMaxCallFrequency() public pure returns (uint256) {
        return TLN_MAX_CALL_FREQUENCY;
    }

    function getMaxGasPrice() public pure returns (uint256) {
        return TLN_MAX_GAS_PRICE;
    }

    function getExchangeRate() public pure returns (uint256) {
        return TLN_EXCHANGE_RATE;
    }

    function getHardCap() public pure returns (uint256) {
        return TLN_HARD_CAP;
    }

    function getSoftCap() public pure returns (uint256) {
        return TLN_SOFT_CAP;
    }

    function getHardCapPresale() public pure returns (uint256) {
        return TLN_HARD_CAP_PRESALE;
    }
}
