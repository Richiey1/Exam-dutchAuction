import { ethers } from "hardhat";

async function main() {
  try {
    console.log("🚀 Starting Dutch Auction deployment and interaction script...\n");

    // Get signer
    const [deployer] = await ethers.getSigners();
    console.log("👤 Deploying and interacting with account:", deployer.address);

    // Deploy DutchAuctionToken with smaller supply
    console.log("\n📌 1. Deploying DutchAuctionToken...");
    const initialSupply = ethers.parseEther("100"); // 100 tokens
    const DutchAuctionToken = await ethers.getContractFactory("DutchAuctionToken");
    const dutchAuctionToken = await DutchAuctionToken.deploy(initialSupply);
    await dutchAuctionToken.waitForDeployment();
    const tokenAddress = await dutchAuctionToken.getAddress();
    console.log("✅ DutchAuctionToken deployed to:", tokenAddress);

    // Check deployer balance
    const deployerBalance = await dutchAuctionToken.balanceOf(deployer.address);
    console.log("💰 Deployer token balance:", ethers.formatEther(deployerBalance));

    // Deploy DutchAuction with smaller values
    console.log("\n📌 2. Deploying DutchAuction...");
    const tokensForSale = ethers.parseEther("10"); // 10 tokens for sale
    const initialPrice = ethers.parseEther("0.01"); // 0.01 ETH
    const duration = 3600; // 1 hour
    const priceDecreaseRate = ethers.parseEther("0.000001"); // Smaller decrease rate

    const DutchAuction = await ethers.getContractFactory("DutchAuction");
    const auction = await DutchAuction.deploy(
        tokenAddress,
        initialPrice,
        duration,
        priceDecreaseRate,
        tokensForSale
    );
    await auction.waitForDeployment();
    const auctionAddress = await auction.getAddress();
    console.log("✅ DutchAuction deployed to:", auctionAddress);

    // Transfer tokens to auction contract
    console.log("\n📌 3. Setting up auction...");
    const transferTx = await dutchAuctionToken.transfer(auctionAddress, tokensForSale);
    await transferTx.wait();
    console.log("✅ Transferred", ethers.formatEther(tokensForSale), "tokens to auction contract");

    // Check auction contract balance
    const auctionBalance = await dutchAuctionToken.balanceOf(auctionAddress);
    console.log("🏦 Auction contract token balance:", ethers.formatEther(auctionBalance));

    // Get current price
    console.log("\n📌 4. Checking auction status...");
    const currentPrice = await auction.getCurrentPrice();
    console.log("💲 Current price:", ethers.formatEther(currentPrice), "ETH");

    // Buy using the same account (deployer)
    console.log("\n📌 5. Attempting purchase...");
    console.log("💰 Using price:", ethers.formatEther(currentPrice), "ETH");

    const buyTx = await auction.buy({ value: currentPrice });
    await buyTx.wait();
    console.log("🎉 Purchase successful!");

    // Check final balances
    const finalBalance = await dutchAuctionToken.balanceOf(deployer.address);
    console.log("💰 Final token balance:", ethers.formatEther(finalBalance));

    // Check if auction ended
    const auctionEnded = await auction.auctionEnded();
    console.log("\n📌 6. Final auction status:");
    console.log("⏳ Auction ended:", auctionEnded);

    console.log("\n✅ Script completed successfully!");
    
    // Log contract addresses for verification
    console.log("\n🔗 Contract Addresses for verification:");
    console.log("📌 DutchAuctionToken:", tokenAddress);
    console.log("📌 DutchAuction:", auctionAddress);

  } catch (error) {
    console.error("\n❌ Error in script execution:");
    console.error(error);
    process.exit(1);
  }
}

// Handle promise rejection
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
