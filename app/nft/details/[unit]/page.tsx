/* eslint-disable @next/next/no-img-element */
"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Data, UTxO } from "lucid-cardano";
import { useLucid } from "@/context/LucidProvider";
import BlockforstService from "@/services/blockforst";
import NFTMarketplaceService from "@/services/marketplace";
import getMarketplaceValidator from "../../../../contract/marketplace/read-validator";
import { MarketplaceDatum } from "@/contract/marketplace/datum";

interface NFTDetails {
  unit: string;
  policyId: string;
  assetName: string;
  name: string;
  description: string;
  image: string;
  isOwner: boolean;
  isListed: boolean;
  price?: bigint;
  listingUtxo?: UTxO;
}

const NFTDetailPage: React.FC = () => {
  const { unit } = useParams<{ unit: string }>();
  const router = useRouter();
  const { lucid } = useLucid();
  const [loading, setLoading] = useState<boolean>(true);
  const [nftDetails, setNftDetails] = useState<NFTDetails | null>(null);
  const [txHash, setTxHash] = useState<string>("");
  const [error, setError] = useState<string>("");

  useEffect(() => {
    const fetchNFTDetails = async () => {
      if (!lucid || !unit) return;

      try {
        setLoading(true);
        const blockfrostService = new BlockforstService();
        const nftMarketplaceService = new NFTMarketplaceService(lucid);

        // Get asset details from Blockfrost
        const assetDetails = await blockfrostService.getAssetDetails(
          unit as string
        );

        // Check if the current wallet owns this NFT
        const walletAddress = await lucid.wallet.address();
        const walletUtxos = await lucid.utxosAt(walletAddress);
        const isOwner = walletUtxos.some((utxo) =>
          Object.keys(utxo.assets).some((asset) => asset === unit)
        );

        // Check if the NFT is listed in the marketplace
        const marketplaceUtxos = await nftMarketplaceService.getUTxOs();
        let isListed = false;
        let price: bigint | undefined;
        let listingUtxo: UTxO | undefined;

        // Extract policy ID and asset name from unit
        const policyId = unit.slice(0, 56);
        const assetName = unit.slice(56);

        // Check if this NFT is in the marketplace
        marketplaceUtxos?.forEach((utxo) => {
          try {
            const datum = Data.from<typeof MarketplaceDatum>(
              utxo.datum || "",
              MarketplaceDatum
            );

            if (datum.policyId === policyId && datum.assetName === assetName) {
              isListed = true;
              price = datum.price;
              listingUtxo = utxo;
            }
          } catch (error) {
            console.error("Error parsing datum:", error);
          }
        });

        // Set NFT details
        setNftDetails({
          unit: unit as string,
          policyId,
          assetName,
          name: assetDetails.onchain_metadata?.name || "Unnamed NFT",
          description:
            assetDetails.onchain_metadata?.description ||
            "No description available",
          image: assetDetails.onchain_metadata?.image
            ? assetDetails.onchain_metadata.image.replace(
                "ipfs://",
                "https://crimson-fascinating-vulture-838.mypinata.cloud/ipfs/"
              )
            : "/placeholder-image.png",
          isOwner,
          isListed,
          price,
          listingUtxo,
        });

        setLoading(false);
      } catch (error) {
        console.error("Error fetching NFT details:", error);
        setError("Failed to load NFT details. Please try again.");
        setLoading(false);
      }
    };

    fetchNFTDetails();
  }, [lucid, unit]);

  const handleBuyNFT = async () => {
    if (
      !lucid ||
      !nftDetails ||
      !nftDetails.isListed ||
      !nftDetails.price ||
      !nftDetails.listingUtxo
    ) {
      setError(
        "Cannot buy this NFT. It may not be listed or details are missing."
      );
      return;
    }

    try {
      const validator = getMarketplaceValidator();
      const contractAddress = lucid.utils.validatorToAddress(validator);
      if (!contractAddress) {
        console.log("loiloi");
      }

      // Market fee address and calculation
      const marketAddress =
        "addr_test1qr6f780g8wj7su0v6lr4pqp4w5l5947gcq45d60cl0xd2txkuxdtp7znxpl0kflxpt8z0eqauckttc7zk75gvu5s8dcqj250mt";
      const feeMarket =
        (nftDetails.price * BigInt(1) * BigInt(10) ** BigInt(6)) / BigInt(100); // 1% fee

      // Find the listing UTXO
      const utxoNft = Data.from<typeof MarketplaceDatum>(
        nftDetails.listingUtxo.datum || "",
        MarketplaceDatum
      );

      // Convert seller hash to address
      const sellerAddressCredential = lucid.utils.keyHashToCredential(
        utxoNft.seller
      );
      const sellerAddress = lucid.utils.credentialToAddress(
        sellerAddressCredential
      );

      // Create and submit transaction
      const tx = await lucid
        .newTx()
        .payToAddress(sellerAddress, { lovelace: utxoNft.price })
        .payToAddress(marketAddress, { lovelace: feeMarket })
        .collectFrom([nftDetails.listingUtxo], Data.void())
        .attachSpendingValidator(validator)
        .complete();

      const signedTx = await tx.sign().complete();
      const txHash = await signedTx.submit();

      setTxHash(txHash);

      // Reload NFT details after purchase
      setTimeout(() => {
        setLoading(true);
        setTxHash("");
        router.refresh();
      }, 5000);
    } catch (error) {
      console.error("Error buying NFT:", error);
      setError("Failed to buy NFT. Please try again.");
    }
  };

  const handleSellNFT = () => {
    // Navigate to sell page with the NFT details
    router.push(`/nft/sell/${unit}`);
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col justify-center items-center h-[70vh]">
          <div className="relative">
            <div className="h-24 w-24 rounded-full border-t-4 border-b-4 border-[#FF00EF] animate-spin"></div>
            <div className="absolute top-0 left-0 h-24 w-24 rounded-full border-r-4 border-l-4 border-purple-300 animate-ping opacity-75"></div>
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-[#FF00EF] font-bold text-xl">
              Mintix
            </div>
          </div>
          <p className="mt-4 text-gray-600 text-lg">Loading NFT Details...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-center items-center h-[70vh]">
          <div className="relative">
            <div className="h-24 w-24 rounded-full border-t-4 border-b-4 border-[#FF00EF] animate-spin"></div>
            <div className="absolute top-0 left-0 h-24 w-24 rounded-full border-r-4 border-l-4 border-purple-300 animate-ping"></div>
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-[#FF00EF] font-bold">
              Mintix
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!nftDetails) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-center items-center h-[70vh]">
          <div className="relative">
            <div className="h-24 w-24 rounded-full border-t-4 border-b-4 border-[#FF00EF] animate-spin"></div>
            <div className="absolute top-0 left-0 h-24 w-24 rounded-full border-r-4 border-l-4 border-purple-300 animate-ping"></div>
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-[#FF00EF] font-bold">
              Mintix
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 mt-[50px]">
      {txHash && (
        <div className="mb-8 p-4 text-green-700 ">
          <p>Transaction submitted successfully!</p>
          <a
            href={`https://preprod.cardanoscan.io/transaction/${txHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-green-600 hover:text-green-800 underline break-all"
          >
            {txHash}
          </a>
        </div>
      )}

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Left Column - NFT Image */}
        <div className="lg:w-1/2">
          <div className="bg-white rounded-xl shadow-md overflow-hidden">
            <img
              src={nftDetails.image}
              alt={nftDetails.name}
              className="w-full h-auto object-contain"
            />
          </div>
        </div>

        {/* Right Column - NFT Details */}
        <div className="lg:w-1/2">
          <div className="bg-white rounded-xl shadow-md p-4">
            <div className="mb-6">
              <h1 className="text-3xl font-bold">{nftDetails.name}</h1>
              <div className="mt-2 text-gray-500">
                <p>Owned by {nftDetails.isOwner ? "you" : "someone else"}</p>
              </div>
            </div>
            {/* Action Buttons */}
            <div className="mb-6">
              {nftDetails.isOwner && !nftDetails.isListed && (
                <button
                  onClick={handleSellNFT}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 px-6 rounded-lg text-md font-semibold transition-colors"
                >
                  List for Sale
                </button>
              )}

              {nftDetails.isOwner && nftDetails.isListed && (
                <button
                  onClick={() => {
                    /* TODO: Add cancel listing functionality */
                  }}
                  className="w-full bg-red-600 hover:bg-red-700 text-white py-3 px-6 rounded-lg text-md font-semibold transition-colors"
                >
                  Cancel Listing
                </button>
              )}
            </div>

            {/* Description Section */}
            <div className="mb-6 border-t border-gray-200 pt-6">
              <div className="border-b border-gray-200 pb-2 flex justify-between items-center">
                <span className="font-semibold text-lg">Description</span>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  className="w-5 h-5"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </div>
              <div className="mt-4 text-gray-600">
                <p>{nftDetails.description}</p>
              </div>
            </div>

            {/* Properties Section */}
            <div className="mb-6 border-t border-gray-200 pt-6">
              <div className="border-b border-gray-200 pb-2 flex justify-between items-center">
                <span className="font-semibold text-lg">Details</span>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  className="w-5 h-5"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </div>
              <div className="mt-4 space-y-2">
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-500">Policy ID</span>
                  <span className="text-sm font-mono truncate max-w-[180px]">
                    {nftDetails.policyId}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-500">Asset Name</span>
                  <span className="text-sm font-mono">
                    {nftDetails.assetName}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-500">Status</span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs ${
                      nftDetails.isListed
                        ? "bg-green-100 text-green-800"
                        : "bg-gray-100 text-gray-800"
                    }`}
                  >
                    {nftDetails.isListed ? "Listed" : "Not Listed"}
                  </span>
                </div>
              </div>
            </div>
            {nftDetails.isListed && nftDetails.price && (
              <div className="p-4">
                {!nftDetails.isOwner && (
                  <button
                    onClick={handleBuyNFT}
                    className="w-full mt-4 bg-[#FF00EF] hover:bg-[#bf66b9] text-white py-3 px-6 rounded-lg text-md font-semibold transition-colors"
                  >
                    Buy Now
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default NFTDetailPage;
