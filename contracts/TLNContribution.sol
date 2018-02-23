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

/// @title TLNContribution Contract
/// Based on Jordi Baylina
/// @dev This contract will be the TLN controller during the contribution period.
///  This contract will determine the rules during this period.
///  Final users will generally not interact directly with this contract. ETH will
///  be sent to the TLN token contract. The ETH is sent to this contract and from here,
///  ETH is sent to the contribution walled and TLNs are mined according to the defined
///  rules.

import "./Owned.sol";
import "./MiniMeToken.sol";
import "./SafeMath.sol";
import "./ERC20Token.sol";
import "./TLNSaleConfig.sol";
import "./Bonuses.sol";

contract TLNContribution is Owned, TokenController, TLNSaleConfig, Bonuses {
    using SafeMath for uint256;

    MiniMeToken public TLN;
    uint256 public startBlock;
    uint256 public endBlock;
    uint256 public startBlockPresale;
    uint256 public endBlockPresale;

    address public destEthTeam;

    address public destTokensTeam;
    address public destTokensBounties;
    address public destTokensAdvisory;

    address public tlnController;

    uint256 public totalInitialInvestorsCollected;
    uint256 public totalPresaleCollected;
    uint256 public totalNormalCollected;

    uint256 public finalizedBlock;
    uint256 public finalizedTime;

    mapping (address => uint256) public lastCallBlock;

    bool public paused;

    IcoState public currentState = IcoState.Init;

    modifier initialized() {
        require(address(TLN) != 0x0);
        _;
    }

    modifier saleOpen() {
        require(((getBlockNumber() >= startBlock && getBlockNumber() <= endBlock) ||
                 (getBlockNumber() >= startBlockPresale && getBlockNumber() <= endBlockPresale)
                ) &&
                finalizedBlock == 0 &&
                address(TLN) != 0x0);
        _;
    }

    modifier notPaused() {
        require(!paused);
        _;
    }

    modifier requiresState(IcoState state) {
        require(state == currentState); 
        _; 
    }

    function TLNContribution() public {
        paused = false;
    }


    /// @notice This method should be called by the owner before the contribution
    ///  period starts This initializes most of the parameters
    /// @param _tln Address of the TLN token contract
    /// @param _tlnController Token controller for the TLN that will be transferred after
    ///  the contribution finalizes.
    /// @param _startBlock Block when the contribution period starts
    /// @param _endBlock The last block that the contribution period is active
    /// @param _destEthTeam Destination address where the contribution ether is sent
    /// @param _destTokensAdvisory Address where the tokens for the Advisory are sent
    function initialize(
        address _tln,
        address _tlnController,
        uint256 _startBlock,
        uint256 _endBlock,
        uint256 _startBlockPresale,
        uint256 _endBlockPresale,
        address _destEthTeam,
        address _destTokensAdvisory,
        address _destTokensTeam,
        address _destTokensBounties
    ) public onlyOwner {
        // Initialize only once
        require(address(TLN) == 0x0);

        TLN = MiniMeToken(_tln);
        require(TLN.totalSupply() == 0);
        require(TLN.controller() == address(this));
        require(TLN.decimals() == 18);  // Same amount of decimals as ETH

        require(_tlnController != 0x0);
        tlnController = _tlnController;

        // initial investors could buy all tokens and Presale will be skipped
        if(_startBlockPresale > 0  && _endBlockPresale > 0)
        {
            require(_startBlockPresale >= getBlockNumber());
            require(_startBlockPresale < _endBlockPresale);
        }

        startBlockPresale = _startBlockPresale;
        endBlockPresale = _endBlockPresale;

        require(_startBlock > _endBlockPresale);
        require(_startBlock >= getBlockNumber());
        require(_startBlock < _endBlock);
        startBlock = _startBlock;
        endBlock = _endBlock;

        require(_destEthTeam != 0x0);
        destEthTeam = _destEthTeam;

        require(_destTokensTeam != 0x0);
        destTokensTeam = _destTokensTeam;

        require(_destTokensBounties != 0x0);
        destTokensBounties = _destTokensBounties;

        require(_destTokensAdvisory != 0x0);
        destTokensAdvisory = _destTokensAdvisory;

        totalInitialInvestorsCollected = 0;
        totalPresaleCollected = 0;
        totalNormalCollected = 0;

        currentState = IcoState.Init;
    }

    /// @notice If anybody sends Ether directly to this contract, consider he is
    ///  getting TLNs.
    function () public payable notPaused {
        proxyPayment(msg.sender);
    }


    //////////
    // MiniMe Controller functions
    //////////

    /// @notice This method will generally be called by the TLN token contract to
    ///  acquire TLNs. Or directly from third parties that want to acquire TLNs in
    ///  behalf of a token holder.
    /// @param _th TLN holder where the TLNs will be minted.
    function proxyPayment(address _th) public payable notPaused initialized saleOpen returns (bool) {
        require(_th != 0x0);
        require(currentState == IcoState.PresaleRunning || currentState == IcoState.ICORunning);

        if(currentState == IcoState.PresaleRunning) {
            // min - 1 ETH
            require(msg.value >= 1 ether);
        }

        // call internal function "buyTokens"
        buyTokens(_th);
        return true;
    }

    function onTransfer(address, address, uint256) public returns (bool) {
        return false;
    }

    function onApprove(address, address, uint256) public returns (bool) {
        return false;
    }

    // internal
    function buyTokens(address _th) internal {
        require(tx.gasprice <= getMaxGasPrice());

        // Antispam mechanism
        address caller;
        if (msg.sender == address(TLN)) {
            caller = _th;
        } else {
            caller = msg.sender;
        }

        // Do not allow contracts to game the system
        require(!isContract(caller));

        require(getBlockNumber().sub(lastCallBlock[caller]) >= getMaxCallFrequency());
        lastCallBlock[caller] = getBlockNumber();

        // check "hardcap - already collected"
        uint256 toCollect;
        if(currentState == IcoState.PresaleRunning) {
            toCollect = getHardCapPresale() - (totalCollectedPresale() + totalCollectedInitialInvestors());
        } else if(currentState == IcoState.ICORunning){
            toCollect = getHardCap() - totalCollected();
        }

        // check amount
        uint256 toFund;
        if (msg.value <= toCollect) {
            toFund = msg.value;
        } else {
            toFund = toCollect;
        }

        // increment collected number
        if(currentState == IcoState.PresaleRunning) {
            totalPresaleCollected = totalPresaleCollected.add(toFund);
            // call internal function "doBuyPresale"
            doBuyPresale(_th, toFund);
        } else if(currentState == IcoState.ICORunning){
            totalNormalCollected = totalNormalCollected.add(toFund);
            // call internal function "doBuy"
            doBuy(_th, toFund);
        }
    }

    // internal
    function doBuyPresale(address _th, uint256 _toFund) internal 
    {
        assert(msg.value >= _toFund);  // Not needed, but double check.
        assert((totalCollectedPresale() + totalCollectedInitialInvestors()) <= getHardCapPresale());

        require(msg.value >= 1 ether); // double check

        if (_toFund > 0) {
            uint256 tokensGenerated = _toFund.mul(getExchangeRate());
            // Total tokens = tokensGenerated + bonuses
            tokensGenerated = tokensGenerated.add(tokensGenerated.percent(getBonusPresale()));

            assert(TLN.generateTokens(_th, tokensGenerated));
            destEthTeam.transfer(_toFund);

            NewPresale(_th, _toFund, tokensGenerated);
        }

        uint256 toReturn = msg.value.sub(_toFund);
        if (toReturn > 0) {
            // If the call comes from the Token controller,
            // then we return it to the token Holder.
            // Otherwise we return to the sender.
            if (msg.sender == address(TLN)) {
                _th.transfer(toReturn);
            } else {
                msg.sender.transfer(toReturn);
            }
        }
    }

    // internal
    function doBuy(address _th, uint256 _toFund) internal 
    {
        assert(msg.value >= _toFund);  // Not needed, but double check.
        assert(totalCollected() <= getHardCap());

        // important: totalCollected() = "collected + toFund"
        uint256 collected = totalCollected();
        uint256 totCollected = collected;
        collected = collected.sub(_toFund);

        if (_toFund > 0) 
        {
            uint256 tokensGenerated = _toFund.mul(getExchangeRate());
            uint256 tokensToBonusCap = 0;
            uint256 tokensToNextBonusCap = 0;
            uint256 bonusTokens = 0;
            BonusStage bonusStage = getBonusStage(collected);

            if (bonusStage == BonusStage.Stage1)
            {
                if (totCollected <= getBonus1Cap())
                {
                    // Total tokens = tokensGenerated + bonuses
                    tokensGenerated = tokensGenerated.add(tokensGenerated.percent(getBonus1()));
                } 
                else 
                {
                    // Calc some tokens for bonus1 stage
                    bonusTokens = getBonus1Cap().sub(collected).percent(getBonus1()).mul(getExchangeRate());
                    tokensToBonusCap = tokensGenerated.add(bonusTokens);
                    // Calc some tokens for bonus2 stage
                    tokensToNextBonusCap = totCollected.sub(getBonus1Cap()).percent(getBonus2()).mul(getExchangeRate());
                    // Total tokens = tokensGenerated + tokensToBonusCap + tokensToNextBonusCap
                    tokensGenerated = tokensToBonusCap.add(tokensToNextBonusCap);
                }
            } 
            else if (bonusStage == BonusStage.Stage2) 
            {
                if (totCollected <= getBonus2Cap()) 
                {
                    // Total tokens = tokensGenerated + bonuses
                    tokensGenerated = tokensGenerated.add(tokensGenerated.percent(getBonus2()));
                }
                else 
                {
                    // Calc some tokens for bonus2 stage
                    bonusTokens = getBonus2Cap().sub(collected).percent(getBonus2()).mul(getExchangeRate());
                    tokensToBonusCap = tokensGenerated.add(bonusTokens);
                    // Calc some tokens for bonus3 stage
                    tokensToNextBonusCap = totCollected.sub(getBonus2Cap()).percent(getBonus3()).mul(getExchangeRate());
                    // Total tokens = tokensGenerated + tokensToBonusCap + tokensToNextBonusCap
                    tokensGenerated = tokensToBonusCap.add(tokensToNextBonusCap);
                }
            }
            else if (bonusStage == BonusStage.Stage3) 
            {
                if (totCollected <= getBonus3Cap()) 
                {
                    // Total tokens = tokensGenerated + bonuses
                    tokensGenerated = tokensGenerated.add(tokensGenerated.percent(getBonus3()));
                } 
                else 
                {
                    // Calc some tokens for bonus3 stage
                    bonusTokens = getBonus3Cap().sub(collected).percent(getBonus3()).mul(getExchangeRate());
                    tokensToBonusCap = tokensGenerated.add(bonusTokens);
                    // Calc some tokens for bonus4 stage
                    tokensToNextBonusCap = totCollected.sub(getBonus3Cap()).percent(getBonus4()).mul(getExchangeRate());
                    // Total tokens = tokensGenerated + tokensToBonusCap + tokensToNextBonusCap
                    tokensGenerated = tokensToBonusCap.add(tokensToNextBonusCap);
                }
            } 
            else if (bonusStage == BonusStage.Stage4) 
            {
                if (totCollected <= getBonus4Cap()) 
                {
                    // Total tokens = tokensGenerated + bonuses
                    tokensGenerated = tokensGenerated.add(tokensGenerated.percent(getBonus4()));
                }
                else 
                {
                    // Calc some tokens for bonus4 stage
                    bonusTokens = getBonus4Cap().sub(collected).percent(getBonus4()).mul(getExchangeRate());
                    // Total tokens = tokensGenerated + some tokens to bonus cap
                    tokensGenerated = tokensGenerated.add(bonusTokens);
                }
            }

            assert(TLN.generateTokens(_th, tokensGenerated));
            destEthTeam.transfer(_toFund);

            NewSale(_th, _toFund, tokensGenerated);
        }

        uint256 toReturn = msg.value.sub(_toFund);
        if (toReturn > 0) 
        {
            // If the call comes from the Token controller,
            // then we return it to the token Holder.
            // Otherwise we return to the sender.
            if (msg.sender == address(TLN)) 
            {
                _th.transfer(toReturn);
            } 
            else 
            {
                msg.sender.transfer(toReturn);
            }
        }
    }

    // NOTE on Percentage format
    // Percentage in "x per 10**18"
    // This format has a precision of 16 digits for a percent.
    // Examples:
    //  3%   =   3*(10**16)
    //  100% = 100*(10**16) = 10**18
    //
    // To get a percentage of a value we do it by first multiplying it by the percentage in  (x per 10^18)
    //  and then divide it by 10**18
    //
    //              Y * X(in x per 10**18)
    //  X% of Y = -------------------------
    //               100(in x per 10**18)
    //


    /// @notice This method will can be called by the owner before the contribution period
    ///  end or by anybody after the `endBlock`. This method finalizes the contribution period
    ///  by creating the remaining tokens and transferring the controller to the configured
    ///  controller.
    function finalize() public initialized {
        require(getBlockNumber() >= startBlock);
        require(msg.sender == owner || getBlockNumber() > endBlock);
        require(finalizedBlock == 0);

        // Allow premature finalization if final limit is reached
        if (getBlockNumber() <= endBlock) {
            require(totalNormalCollected >= getSoftCap());
        }

        finalizedBlock = getBlockNumber();
        finalizedTime = now;

        currentState = IcoState.ICOFinished;

        uint256 percentageToContributors = percent(75);
        uint256 percentageToTeam = percent(14);
        uint256 percentageToAdvisory = percent(3);
        uint256 percentageToBounties = percent(1);
        uint256 percentageToPreSale = percent(7);

        // TLN.totalSupply() -> Tokens minted during the contribution and presale
        //  totalTokens  -> Total tokens that should be after the allocation of devTokens, advisoryTokens, bountiesTokens
        //  percentageToContributors -> Which percentage should go to the contribution participants (x per 10**18 format)
        //  percent(100) -> 100% in (x per 10**18 format)
        //  TLN.totalSupply() = ((percentageToContributors + percentageToPreSale) / percent(100)) * totalTokens  =>
        //  =>  totalTokens = (percent(100) / (percentageToContributors + percentageToPreSale)) * TLN.totalSupply()

        uint256 totalTokens = TLN.totalSupply().mul(percent(100)).div(percentageToContributors + percentageToPreSale);


        //  bountiesTokens = percentageToBounties / percentage(100) * totalTokens

        assert(TLN.generateTokens(
            destTokensBounties,
            totalTokens.mul(percentageToBounties).div(percent(100))));

        //  advisoryTokens = percentageToAdvisory / percentage(100) * totalTokens

        assert(TLN.generateTokens(
            destTokensAdvisory,
            totalTokens.mul(percentageToAdvisory).div(percent(100))));

        //  teamTokens = percentageToTeam / percentage(100) * totalTokens

        assert(TLN.generateTokens(
            destTokensTeam,
            totalTokens.mul(percentageToTeam).div(percent(100))));

        TLN.changeController(tlnController);

        Finalized();
    }

    function percent(uint256 p) internal pure returns (uint256) {
        return p.mul(10**16);
    }

    /// @dev Internal function to determine if an address is a contract
    /// @param _sender the sender address
    /// @return True if tx.origin is not the sender (so smart contract involved)
    function isContract(address _sender) constant internal returns (bool) {
        return tx.origin != _sender;
        /*if (_addr == 0) return false;
        uint256 size;
        assembly {
            size := extcodesize(_addr)
        }
        return (size > 0);*/

    }

    /// @dev Public function for generating tokens for initial investors, who bought tokens before presale
    /// @param _th The investor address
    /// @param _baseTokens Amount of tokens without bonuses
    /// @param _bonusTokens Amount of bonus tokens
    function addInitialInvestor(address _th, uint256 _baseTokens, uint256 _bonusTokens) public initialized onlyOwner requiresState(IcoState.Init) {
        require(_th != 0x0);

        // _bonusTokens must be <= 25% of _baseTokens
        require(_bonusTokens <= (_baseTokens / 4));

        uint256 ethEquivalent = _baseTokens.div(getExchangeRate());
        require((totalInitialInvestorsCollected + ethEquivalent) <= getHardCapPresale());
        totalInitialInvestorsCollected = totalInitialInvestorsCollected.add(ethEquivalent);

        uint256 totalInverstorTokens = _baseTokens + _bonusTokens;
        assert(TLN.generateTokens(_th, totalInverstorTokens));
        NewInitialInvestor(_th, totalInverstorTokens);
    }

    //////////
    // Constant functions
    //////////

    /// @return Total tokens issued in weis.
    function tokensIssued() public constant returns (uint256) {
        return TLN.totalSupply();
    }

    /// @return Total Ether collected.
    function totalCollected() public constant returns (uint256) {
        return totalNormalCollected;
    }

    /// @return Total presale Ether collected.
    function totalCollectedPresale() public constant returns (uint256) {
        return totalPresaleCollected;
    }

    /// @return Total collected before presale
    function totalCollectedInitialInvestors() public constant returns (uint256) {
        return totalInitialInvestorsCollected;
    }

    //////////
    // Testing specific methods
    //////////

    /// @notice This function is overridden by the test Mocks.
    function getBlockNumber() internal constant returns (uint256) {
        return block.number;
    }

    //////////
    // Safety Methods
    //////////

    /// @notice This method can be used by the controller to extract mistakenly
    ///  sent tokens to this contract.
    /// @param _token The address of the token contract that you want to recover
    ///  set to 0 in case you want to extract ether.
    function claimTokens(address _token) public onlyOwner {
        if (TLN.controller() == address(this)) {
            TLN.claimTokens(_token);
        }
        if (_token == 0x0) {
            owner.transfer(this.balance);
            return;
        }

        ERC20Token token = ERC20Token(_token);
        uint256 balance = token.balanceOf(this);
        token.transfer(owner, balance);
        ClaimedTokens(_token, owner, balance);
    }


    /// @notice Pauses the contribution if there is any issue
    function pauseContribution() public onlyOwner requiresState(IcoState.ICORunning) {
        paused = true;
        setState(IcoState.Paused);
    }

    /// @notice Resumes the contribution
    function resumeContribution() public onlyOwner requiresState(IcoState.Paused) {
        paused = false;
        setState(IcoState.ICORunning);
    }

    /// @notice Pauses the contribution if there is any issue
    function pausePresale() public onlyOwner requiresState (IcoState.PresaleRunning) {
        paused = true;
        setState(IcoState.Paused);
    }

    /// @notice Resumes the contribution
    function resumePresale() public onlyOwner requiresState (IcoState.Paused) {
        paused = false;
        setState(IcoState.PresaleRunning);
    }

    function setState(IcoState _nextState) public onlyOwner
    {
        //method shouldn't be called after ICOFinished
        require(currentState != IcoState.ICOFinished);

        assert(currentState != _nextState);

        /*
        if (currentState == IcoState.Init) {
            assert(_nextState == IcoState.PresaleRunning); 
        } else if (currentState == IcoState.PresaleRunning) {
            assert(_nextState == IcoState.PresaleFinished || _nextState == IcoState.Paused); 
        } else if (currentState == IcoState.PresaleFinished) {
            assert(_nextState == IcoState.ICORunning);
        } else if (currentState == IcoState.ICORunning) { 
            assert(_nextState == IcoState.ICOFinished || _nextState == IcoState.Paused); 
        } else if (currentState == IcoState.Paused) { 
            assert(_nextState == IcoState.ICORunning || _nextState == IcoState.PresaleRunning); 
        } else assert(false);
        */

        currentState = _nextState;
        StateChanged(currentState);
    }

    event StateChanged(IcoState _state);
    event ClaimedTokens(address indexed _token, address indexed _controller, uint256 _amount);
    event NewInitialInvestor(address indexed _th, uint256 _tokens);
    event NewSale(address indexed _th, uint256 _amount, uint256 _tokens);
    event NewPresale(address indexed _th, uint256 _amount, uint256 _tokens);
    event Finalized();
}
