/* eslint-disable @next/next/no-img-element */
"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Data } from "lucid-cardano";
import { useLucid } from "@/context/LucidProvider";
import BlockforstService from "@/services/blockforst";
import getMarketplaceValidator from "../../../../contract/marketplace/read-validator";
import { MarketplaceDatum } from "@/contract/marketplace/datum";

interface NFTDetails {
  unit: string;
  policyId: string;
  assetName: string;
  name: string;
  description: string;
  image: string;
}

const SellNFTPage: React.FC = () => {
  const { unit } = useParams<{ unit: string }>();
  const router = useRouter();
  const { lucid } = useLucid();
  const [loading, setLoading] = useState<boolean>(true);
  const [nftDetails, setNftDetails] = useState<NFTDetails | null>(null);
  const [price, setPrice] = useState<string>("");
  const [txHash, setTxHash] = useState<string>("");
  const [error, setError] = useState<string>("");

  useEffect(() => {
    const fetchNFTDetails = async () => {
      if (!lucid || !unit) return;

      try {
        setLoading(true);
        const blockfrostService = new BlockforstService();

        const walletAddress = await lucid.wallet.address();
        const walletUtxos = await lucid.utxosAt(walletAddress);
        const ownsNFT = walletUtxos.some((utxo) =>
          Object.keys(utxo.assets).some((asset) => asset === unit)
        );

        if (!ownsNFT) {
          setError("You don't own this NFT");
          setLoading(false);
          return;
        }

        // Get asset details from Blockfrost
        const assetDetails = await blockfrostService.getAssetDetails(
          unit as string
        );

        // Extract policy ID and asset name from unit
        const policyId = unit.slice(0, 56);
        const assetName = unit.slice(56);

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

  const handleListForSale = async () => {
    if (!lucid || !nftDetails || !price) {
      setError("Please enter a valid price");
      return;
    }

    try {
      // Get validator script
      const validator = getMarketplaceValidator();
      const contractAddress = lucid.utils.validatorToAddress(validator);

      // Create datum with seller information
      const walletAddress = await lucid.wallet.address();
      const { paymentCredential } =
        lucid.utils.getAddressDetails(walletAddress);

      if (!paymentCredential) {
        setError("Could not get payment credential from wallet address");
        return;
      }

      // Get the key hash from the payment credential
      const keyHash = paymentCredential.hash;

      // Create marketplace datum
      const datum = {
        policyId: nftDetails.policyId,
        assetName: nftDetails.assetName,
        seller: keyHash,
        price: BigInt(price),
      };

      // Calculate fee (1% of price)
      const feeMarket =
        (BigInt(price) * BigInt(1) * BigInt(10) ** BigInt(6)) / BigInt(100);

      // Combine policy ID and asset name for NFT identification
      const nftUnit = nftDetails.unit;

      // Create transaction to list NFT using the inline datum format
      const tx = await lucid
        .newTx()
        .payToContract(
          contractAddress,
          { inline: Data.to(datum, MarketplaceDatum) },
          {
            [nftUnit]: BigInt(1),
            lovelace: feeMarket,
          }
        )
        .complete();

      const signedTx = await tx.sign().complete();
      const txHash = await signedTx.submit();

      setTxHash(txHash);

      // Navigate back to NFT details page after successful listing
      setTimeout(() => {
        router.push(`/nft/details/${unit}`);
      }, 3000);
    } catch (error) {
      console.error("Error listing NFT for sale:", error);
      setError("Failed to list NFT for sale. Please try again.");
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-center items-center h-[70vh]">
          <div className="relative">
            <div className="h-24 w-24 rounded-full border-t-4 border-b-4 border-[#FF00EF] animate-spin"></div>
            <div className="absolute top-0 left-0 h-24 w-24 rounded-full border-r-4 border-l-4 border-purple-300 animate-ping"></div>
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-[#FF00EF] font-bold">
              NFT
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-100 text-red-700 p-4 rounded-lg">
          <p>{error}</p>
          <button
            onClick={() => router.back()}
            className="mt-4 bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  if (!nftDetails) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h2 className="text-2xl font-bold">NFT not found</h2>
          <p className="mt-2">
            The NFT you are trying to sell does not exist or could not be
            loaded.
          </p>
          <button
            onClick={() => router.push("/marketplace")}
            className="mt-4 bg-purple-600 text-white py-2 px-4 rounded-lg hover:bg-purple-700"
          >
            Back to Marketplace
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-center mb-8">Sell Your NFT</h1>

      {txHash && (
        <div className="mb-8 p-4 bg-green-100 text-green-700 rounded-lg">
          <p>NFT listed successfully! Transaction Hash:</p>
          <a
            href={`https://preprod.cardanoscan.io/transaction/${txHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-green-600 hover:text-green-800 underline break-all"
          >
            {txHash}
          </a>
          <p className="mt-2">Redirecting to NFT details page...</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* NFT Preview */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="p-4 border-b">
            <h2 className="text-xl font-semibold">NFT Preview</h2>
          </div>
          <div className="p-4">
            <img
              src={nftDetails.image}
              alt={nftDetails.name}
              className="w-full h-auto rounded-lg"
            />
            <h3 className="text-xl font-semibold mt-4">{nftDetails.name}</h3>
            <p className="text-gray-600 mt-2">{nftDetails.description}</p>
          </div>
        </div>

        {/* Listing Form */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="p-4 border-b">
            <h2 className="text-xl font-semibold">Listing Details</h2>
          </div>
          <div className="p-6">
            <div className="mb-6">
              <label className="block text-gray-700 font-semibold mb-2">
                Price (ADA)
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  min="0"
                  step="0.1"
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="Enter price in ADA"
                />
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                  <span className="text-gray-500">₳</span>
                </div>
              </div>
              <p className="text-sm text-gray-500 mt-1">
                Set a price for your NFT in ADA
              </p>
            </div>

            <div className="mb-6">
              <h3 className="font-semibold mb-2">Listing Summary</h3>
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex justify-between mb-2">
                  <span>List Price:</span>
                  <span>{price ? `${price} ₳` : "-"}</span>
                </div>
                <div className="flex justify-between mb-2">
                  <span>Marketplace Fee (1%):</span>
                  <span>
                    {price ? `${(parseFloat(price) * 0.01).toFixed(2)} ₳` : "-"}
                  </span>
                </div>
                <div className="flex justify-between font-semibold">
                  <span>You Receive:</span>
                  <span>
                    {price ? `${(parseFloat(price) * 0.99).toFixed(2)} ₳` : "-"}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex space-x-4">
              <button
                onClick={handleListForSale}
                disabled={!price}
                className={`flex-1 py-3 px-6 rounded-lg text-white font-semibold ${
                  price
                    ? "bg-gradient-to-r from-purple-600 to-pink-600 hover:opacity-90"
                    : "bg-gray-400 cursor-not-allowed"
                }`}
              >
                List for Sale
              </button>
              <button
                onClick={() => router.back()}
                className="flex-1 py-3 px-6 bg-gray-200 text-gray-800 rounded-lg font-semibold hover:bg-gray-300"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SellNFTPage;
