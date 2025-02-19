import { time, loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { ethers } from "hardhat";
import { expect } from "chai";
import { Contract, Signer } from "ethers";

describe("DutchAuction", function () {
  let dutchAuctionToken: Contract;
  let dutchAuction: Contract;
  let deployer: Signer, buyer: Signer, otherBuyer: Signer;

  const initialSupply = ethers.parseEther("100"); // 100 DTK
  const tokensForSale = ethers.parseEther("10"); // 10 DTK for sale
  const initialPrice = ethers.parseEther("1"); // 1 ETH starting price
  const duration = 3600; // 1 hour
  const priceDecreaseRate = ethers.parseEther("0.0001"); // Small price decrease per second

  async function deployContracts() {
    [deployer, buyer, otherBuyer] = await ethers.getSigners();

    // Deploy the DutchAuctionToken contract (ERC-20)
    const DutchAuctionToken = await ethers.getContractFactory("DutchAuctionToken");
    dutchAuctionToken = await DutchAuctionToken.deploy(initialSupply);
    await dutchAuctionToken.waitForDeployment();

    // Deploy the DutchAuction contract
    const DutchAuction = await ethers.getContractFactory("DutchAuction");
    dutchAuction = await DutchAuction.deploy(
      await dutchAuctionToken.getAddress(),
      initialPrice,
      duration,
      priceDecreaseRate,
      tokensForSale
    );
    await dutchAuction.waitForDeployment();

    // Transfer tokens to auction contract
    await dutchAuctionToken.transfer(await dutchAuction.getAddress(), tokensForSale);
  }

  beforeEach(async function () {
    await loadFixture(deployContracts);
  });

  it("✅ Should correctly decrease the price over time", async function () {
    const startPrice = await dutchAuction.getCurrentPrice();
    expect(startPrice).to.equal(initialPrice);

    // Fast forward 1000 seconds
    await time.increase(1000);

    const expectedNewPrice = initialPrice - (priceDecreaseRate * BigInt(1000));
    const newPrice = await dutchAuction.getCurrentPrice();
    expect(newPrice).to.equal(expectedNewPrice);
  });

  it("✅ Should allow only one buyer to purchase per auction", async function () {
    const buyerAddress = await buyer.getAddress();
    
    // Buyer 1 purchases
    const price = await dutchAuction.getCurrentPrice();
    await dutchAuction.connect(buyer).buy({ value: price });

    // Ensure auction ended
    expect(await dutchAuction.auctionEnded()).to.be.true;

    // Another buyer should fail
    await expect(dutchAuction.connect(otherBuyer).buy({ value: price }))
      .to.be.revertedWith("Auction has ended");
  });

  it("✅ Should swap funds and tokens correctly", async function () {
    const buyerAddress = await buyer.getAddress();
    const sellerAddress = await deployer.getAddress();

    const price = await dutchAuction.getCurrentPrice();

    // Capture initial balances
    const initialBuyerBalance = await dutchAuctionToken.balanceOf(buyerAddress);
    const initialSellerEthBalance = await ethers.provider.getBalance(sellerAddress);

    // Buyer purchases tokens
    const tx = await dutchAuction.connect(buyer).buy({ value: price });
    const receipt = await tx.wait();
    const gasUsed = receipt?.gasUsed ?? 0n;
    const gasPrice = tx.gasPrice ?? 0n;
    const gasCost = gasUsed * gasPrice;

    // Final balances
    const finalBuyerBalance = await dutchAuctionToken.balanceOf(buyerAddress);
    const finalSellerEthBalance = await ethers.provider.getBalance(sellerAddress);

    // Buyer should receive the auction tokens
    expect(finalBuyerBalance - initialBuyerBalance).to.equal(tokensForSale);

    // Seller should receive the ETH (minus gas)
    expect(finalSellerEthBalance).to.equal(initialSellerEthBalance + price);
  });

  it("✅ Should handle the case when no one buys before auction ends", async function () {
    // Fast forward beyond the auction duration
    await time.increase(duration + 10);

    // Ensure auction ended
    expect(await dutchAuction.getCurrentPrice()).to.equal(0);
    expect(await dutchAuction.auctionEnded()).to.be.false;

    // Buyer tries to purchase at 0 price (should fail)
    await expect(dutchAuction.connect(buyer).buy({ value: 0 }))
      .to.be.revertedWith("Insufficient payment");
  });

  it("✅ Should reject purchase if buyer sends insufficient ETH", async function () {
    const price = await dutchAuction.getCurrentPrice();
    const insufficientAmount = price - ethers.parseEther("0.001"); // Slightly less than needed

    await expect(dutchAuction.connect(buyer).buy({ value: insufficientAmount }))
      .to.be.revertedWith("Insufficient payment");
  });
});
