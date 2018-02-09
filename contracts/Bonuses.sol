pragma solidity ^0.4.18;

/*
    Copyright (c) 2017 Disc Soft Ltd.
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

/// @title Presale and contribution bonuses

import "./SafeMath.sol";
import "./TLNSaleConfig.sol";

contract Bonuses is TLNSaleConfig{
    using SafeMath for uint256;

    enum BonusStage { NoBonuses, Stage1, Stage2, Stage3, Stage4 }

    function getBonus1Cap() internal pure returns (uint256) {
        return TLN_BONUS_1_CAP;
    }

    function getBonus2Cap() internal pure returns (uint256) {
        return TLN_BONUS_2_CAP;
    }

    function getBonus3Cap() internal pure returns (uint256) {
        return TLN_BONUS_3_CAP;
    }

    function getBonus4Cap() internal pure returns (uint256) {
        return TLN_BONUS_4_CAP;
    }

    function getBonus1() internal pure returns (uint256) {
        return TLN_BONUS_1;
    }

    function getBonus2() internal pure returns (uint256) {
        return TLN_BONUS_2;
    }

    function getBonus3() internal pure returns (uint256) {
        return TLN_BONUS_3;
    }

    function getBonus4() internal pure returns (uint256) {
        return TLN_BONUS_4;
    }

    function getBonusPresale() internal pure returns (uint256) {
        return TLN_BONUS_PRESALE;
    }

    function getBonusStage(uint256 totalCollected) internal pure returns (BonusStage) {

        if(totalCollected < getBonus1Cap()) {
            return BonusStage.Stage1;
        }

        if(totalCollected < getBonus2Cap()) {
            return BonusStage.Stage2;
        }

        if(totalCollected < getBonus3Cap()) {
            return BonusStage.Stage3;
        }

        if(totalCollected < getBonus4Cap()) {
            return BonusStage.Stage4;
        }

        return BonusStage.NoBonuses;
    }
}
