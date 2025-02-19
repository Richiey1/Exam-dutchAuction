// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract DutchAuction {
    address public seller;
    IERC20 public token;
    uint256 public initialPrice;
    uint256 public startTime;
    uint256 public duration;
    uint256 public priceDecreaseRate;
    uint256 public tokensForSale;
    bool public auctionEnded;

    event AuctionStarted(address indexed seller, uint256 initialPrice, uint256 duration, uint256 priceDecreaseRate);
    event AuctionFinalized(address indexed buyer, uint256 finalPrice);

    constructor(
        address _token,
        uint256 _initialPrice,
        uint256 _duration,
        uint256 _priceDecreaseRate,
        uint256 _tokensForSale
    ) {
        seller = msg.sender;
        token = IERC20(_token);
        initialPrice = _initialPrice;
        duration = _duration;
        priceDecreaseRate = _priceDecreaseRate;
        tokensForSale = _tokensForSale;
        startTime = block.timestamp;
        auctionEnded = false;

        emit AuctionStarted(seller, initialPrice, duration, priceDecreaseRate);
    }

    function getCurrentPrice() public view returns (uint256) {
        uint256 elapsedTime = block.timestamp - startTime;
        if (elapsedTime >= duration) {
            return 0; // Minimum price reached
        }
        return initialPrice - (elapsedTime * priceDecreaseRate);
    }

    function buy() external payable {
        require(!auctionEnded, "Auction has ended");
        uint256 currentPrice = getCurrentPrice();
        require(msg.value >= currentPrice, "Insufficient payment");

        auctionEnded = true;
        token.transfer(msg.sender, tokensForSale);
        payable(seller).transfer(msg.value);

        emit AuctionFinalized(msg.sender, currentPrice);
    }
}
