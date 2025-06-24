import { expect } from "chai";
import {
  createTestClient,
  http,
  parseEther,
  walletActions,
  publicActions,
  createWalletClient,
  createPublicClient,
  Address,
} from "viem";
import { hardhat } from "viem/chains";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";

// Import compiled contract artifacts
import StatTrackerArtifact from "../artifacts/contracts/StatTracker.sol/StatTracker.json";

describe("StatTracker Soulbound NFT Tests", () => {
  let testClient: any;
  let publicClient: any;
  let walletClient: any;
  let contractAddress: Address;
  let owner: any;
  let recipient: any;
  let thirdParty: any;

  // Use ABI directly from the compiled artifact
  const statTrackerAbi = StatTrackerArtifact.abi;

  before(async () => {
    // Create test accounts
    const ownerPrivateKey = generatePrivateKey();
    const recipientPrivateKey = generatePrivateKey();
    const thirdPartyPrivateKey = generatePrivateKey();

    owner = privateKeyToAccount(ownerPrivateKey);
    recipient = privateKeyToAccount(recipientPrivateKey);
    thirdParty = privateKeyToAccount(thirdPartyPrivateKey);

    // Create clients for Hardhat network with localhost transport
    testClient = createTestClient({
      chain: hardhat,
      mode: "hardhat",
      transport: http("http://localhost:8545"),
    })
      .extend(publicActions)
      .extend(walletActions);

    publicClient = createPublicClient({
      chain: hardhat,
      transport: http("http://localhost:8545"),
    });

    walletClient = createWalletClient({
      chain: hardhat,
      transport: http("http://localhost:8545"),
    });

    // Fund accounts
    await testClient.setBalance({
      address: owner.address,
      value: parseEther("100"),
    });

    await testClient.setBalance({
      address: recipient.address,
      value: parseEther("100"),
    });

    await testClient.setBalance({
      address: thirdParty.address,
      value: parseEther("100"),
    });

    // Deploy StatTracker contract once using the compiled bytecode
    const deployHash = await testClient.deployContract({
      abi: StatTrackerArtifact.abi,
      bytecode: StatTrackerArtifact.bytecode as `0x${string}`,
      args: [owner.address],
      account: owner,
    });

    const deployReceipt = await publicClient.waitForTransactionReceipt({
      hash: deployHash,
    });

    contractAddress = deployReceipt.contractAddress!;
  });

  describe("Contract Deployment", () => {
    it("should deploy with correct name and symbol", async () => {
      const name = await publicClient.readContract({
        address: contractAddress,
        abi: statTrackerAbi,
        functionName: "name",
      });

      const symbol = await publicClient.readContract({
        address: contractAddress,
        abi: statTrackerAbi,
        functionName: "symbol",
      });

      expect(name).to.equal("My Soulbound NFT");
      expect(symbol).to.equal("MSBT");
    });

    it("should set the correct owner", async () => {
      const contractOwner = await publicClient.readContract({
        address: contractAddress,
        abi: statTrackerAbi,
        functionName: "owner",
      });

      expect(contractOwner.toLowerCase()).to.equal(owner.address.toLowerCase());
    });
  });

  describe("Minting", () => {
    let tokenId: bigint;

    it("should allow owner to mint NFT to recipient", async () => {
      // Get current nextTokenId before minting
      const currentTokenId = await publicClient.readContract({
        address: contractAddress,
        abi: statTrackerAbi,
        functionName: "nextTokenId",
      });

      tokenId = currentTokenId;

      // Mint NFT to recipient
      const mintHash = await testClient.writeContract({
        address: contractAddress,
        abi: statTrackerAbi,
        functionName: "mint",
        args: [recipient.address],
        account: owner,
      });

      await publicClient.waitForTransactionReceipt({ hash: mintHash });

      // Verify minting
      const ownerOf = await publicClient.readContract({
        address: contractAddress,
        abi: statTrackerAbi,
        functionName: "ownerOf",
        args: [tokenId],
      });

      const balance = await publicClient.readContract({
        address: contractAddress,
        abi: statTrackerAbi,
        functionName: "balanceOf",
        args: [recipient.address],
      });

      expect(ownerOf.toLowerCase()).to.equal(recipient.address.toLowerCase());
      expect(balance).to.be.equal(1n);
    });

    it("should increment nextTokenId after minting", async () => {
      const nextTokenId = await publicClient.readContract({
        address: contractAddress,
        abi: statTrackerAbi,
        functionName: "nextTokenId",
      });

      expect(nextTokenId).to.equal(tokenId + 1n);
    });

    it("should not allow non-owner to mint", async () => {
      try {
        await testClient.writeContract({
          address: contractAddress,
          abi: statTrackerAbi,
          functionName: "mint",
          args: [recipient.address],
          account: thirdParty, // Non-owner account
        });

        expect.fail("Minting by non-owner should have been reverted");
      } catch (error: any) {
        expect(error.message).to.include("OwnableUnauthorizedAccount");
      }
    });
  });

  describe("Soulbound Transfer Restrictions", () => {
    let testTokenId: bigint;

    before(async () => {
      // Get current nextTokenId and mint a token for testing transfers
      const currentTokenId = await publicClient.readContract({
        address: contractAddress,
        abi: statTrackerAbi,
        functionName: "nextTokenId",
      });

      testTokenId = currentTokenId;

      await testClient.writeContract({
        address: contractAddress,
        abi: statTrackerAbi,
        functionName: "mint",
        args: [recipient.address],
        account: owner,
      });
    });

    it("should revert when trying to transfer via transferFrom", async () => {
      try {
        await testClient.writeContract({
          address: contractAddress,
          abi: statTrackerAbi,
          functionName: "transferFrom",
          args: [recipient.address, thirdParty.address, testTokenId],
          account: recipient,
        });

        expect.fail("transferFrom should have been reverted");
      } catch (error: any) {
        expect(error.message).to.include("Soulbound: transfer disabled");
      }
    });

    it("should revert when trying to transfer via safeTransferFrom (3 params)", async () => {
      try {
        await testClient.writeContract({
          address: contractAddress,
          abi: statTrackerAbi,
          functionName: "safeTransferFrom",
          args: [recipient.address, thirdParty.address, testTokenId],
          account: recipient,
        });

        expect.fail("safeTransferFrom should have been reverted");
      } catch (error: any) {
        expect(error.message).to.include("Soulbound: transfer disabled");
      }
    });

    it("should revert when trying to transfer via safeTransferFrom (4 params)", async () => {
      try {
        await testClient.writeContract({
          address: contractAddress,
          abi: statTrackerAbi,
          functionName: "safeTransferFrom",
          args: [recipient.address, thirdParty.address, testTokenId, "0x"],
          account: recipient,
        });

        expect.fail("safeTransferFrom with data should have been reverted");
      } catch (error: any) {
        expect(error.message).to.include("Soulbound: transfer disabled");
      }
    });

    it("should revert when trying to approve another address", async () => {
      try {
        await testClient.writeContract({
          address: contractAddress,
          abi: statTrackerAbi,
          functionName: "approve",
          args: [thirdParty.address, testTokenId],
          account: recipient,
        });

        expect.fail("approve should have been reverted");
      } catch (error: any) {
        expect(error.message).to.include("Soulbound: Approvals disabled");
      }
    });

    it("should revert when trying to set approval for all", async () => {
      try {
        await testClient.writeContract({
          address: contractAddress,
          abi: statTrackerAbi,
          functionName: "setApprovalForAll",
          args: [thirdParty.address, true],
          account: recipient,
        });

        expect.fail("setApprovalForAll should have been reverted");
      } catch (error: any) {
        expect(error.message).to.include("Soulbound: Approvals disabled");
      }
    });

    it("should not allow third party to transfer even if they were previously approved", async () => {
      try {
        await testClient.writeContract({
          address: contractAddress,
          abi: statTrackerAbi,
          functionName: "transferFrom",
          args: [recipient.address, thirdParty.address, testTokenId],
          account: thirdParty, // Third party trying to transfer
        });

        expect.fail("Third party transfer should have been reverted");
      } catch (error: any) {
        expect(error.message).to.include("Soulbound: transfer disabled");
      }
    });
  });

  describe("Token Ownership Verification", () => {
    let verifyTokenId: bigint;

    before(async () => {
      // Get current nextTokenId and mint a token for verification tests
      const currentTokenId = await publicClient.readContract({
        address: contractAddress,
        abi: statTrackerAbi,
        functionName: "nextTokenId",
      });

      verifyTokenId = currentTokenId;

      await testClient.writeContract({
        address: contractAddress,
        abi: statTrackerAbi,
        functionName: "mint",
        args: [recipient.address],
        account: owner,
      });
    });

    it("should maintain correct ownership after failed transfer attempts", async () => {
      // Try to transfer (should fail)
      try {
        await testClient.writeContract({
          address: contractAddress,
          abi: statTrackerAbi,
          functionName: "transferFrom",
          args: [recipient.address, thirdParty.address, verifyTokenId],
          account: recipient,
        });
      } catch {
        // Expected to fail
      }

      // Verify ownership hasn't changed
      const ownerOf = await publicClient.readContract({
        address: contractAddress,
        abi: statTrackerAbi,
        functionName: "ownerOf",
        args: [verifyTokenId],
      });

      const recipientBalance = await publicClient.readContract({
        address: contractAddress,
        abi: statTrackerAbi,
        functionName: "balanceOf",
        args: [recipient.address],
      });

      const thirdPartyBalance = await publicClient.readContract({
        address: contractAddress,
        abi: statTrackerAbi,
        functionName: "balanceOf",
        args: [thirdParty.address],
      });

      expect(ownerOf.toLowerCase()).to.equal(recipient.address.toLowerCase());
      expect(recipientBalance).to.be.equal(3n);
      expect(thirdPartyBalance).to.equal(0n);
    });

    it("should show no approved addresses due to disabled approvals", async () => {
      const approved = await publicClient.readContract({
        address: contractAddress,
        abi: statTrackerAbi,
        functionName: "getApproved",
        args: [verifyTokenId],
      });

      const isApprovedForAll = await publicClient.readContract({
        address: contractAddress,
        abi: statTrackerAbi,
        functionName: "isApprovedForAll",
        args: [recipient.address, thirdParty.address],
      });

      expect(approved).to.equal("0x0000000000000000000000000000000000000000");
      expect(isApprovedForAll).to.be.false;
    });
  });
});
