/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @next/next/no-img-element */
"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useLucid } from "@/context/LucidProvider";
import NFTMarketplaceService from "@/services/marketplace";
import BlockforstService from "@/services/blockforst";
import { MarketplaceDatum } from "@/contract/marketplace/datum";
import { Data } from "lucid-cardano";
import SearchInput from "@/components/UI/SearchInput";

export interface NFTListing {
  address: string;
  assetName: string;
  assets: {
    [policyId: string]: string;
  };
  datum: string;
  datumHash?: string;
  outputIndex: number;
  policyId: string;
  price: bigint;
  scriptRef?: string;
  seller: string;
  txHash: string;
  image?: string;
  name?: string;
  description?: string;
}

const NFTMarketplace: React.FC = () => {
  const [nfts, setNfts] = useState<NFTListing[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const { lucid } = useLucid();
  const router = useRouter();
  const blockfrostService = new BlockforstService();
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [filteredNfts, setFilteredNfts] = useState<NFTListing[]>([]);
  const [filterType, setFilterType] = useState<string>("all"); // all, forSale, bundles
  const [sortOrder, setSortOrder] = useState<string>("lowToHigh"); // lowToHigh, highToLow
  const [minPrice, setMinPrice] = useState<string>("");
  const [maxPrice, setMaxPrice] = useState<string>("");
  const [viewMode, setViewMode] = useState<string>("grid"); // grid, list
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [txHash, setTxHash] = useState<string>(""); // Kept for transaction notifications
  const [propertySearchTerm, setPropertySearchTerm] = useState<string>("");

  useEffect(() => {
    const fetchNFTs = async () => {
      if (!lucid) return;
      const nftMarketplaceService = new NFTMarketplaceService(lucid);
      const scriptUTxOs = await nftMarketplaceService.getUTxOs();

      const utxos = scriptUTxOs
        ?.map((utxo) => {
          try {
            const temp = Data.from<typeof MarketplaceDatum>(
              utxo.datum || "",
              MarketplaceDatum
            );
            return {
              ...utxo,
              ...temp,
            };
          } catch (error) {
            console.log(error);
            return false;
          }
        })
        .filter(Boolean) as unknown as NFTListing[];

      // Fetch additional metadata for each NFT
      const enrichedNfts = await Promise.all(
        utxos.map(async (nft) => {
          try {
            const unit = `${nft.policyId}${nft.assetName}`;
            const assetDetails = await blockfrostService.getAssetDetails(unit);

            return {
              ...nft,
              name: assetDetails.onchain_metadata?.name || "Unnamed NFT",
              description:
                assetDetails.onchain_metadata?.description || "No description",
              image: assetDetails.onchain_metadata?.image
                ? assetDetails.onchain_metadata.image.replace(
                    "ipfs://",
                    "https://crimson-fascinating-vulture-838.mypinata.cloud/ipfs/"
                  )
                : "/placeholder-image.png",
            };
          } catch (error) {
            console.error("Error fetching NFT metadata:", error);
            return nft;
          }
        })
      );

      setNfts(enrichedNfts || []);
      setFilteredNfts(enrichedNfts || []);
      setLoading(false);
    };

    fetchNFTs();
  }, [lucid]);

  // Filter and search effect
  useEffect(() => {
    let result = [...nfts];

    // Apply search filter
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      result = result.filter(
        (nft) =>
          nft.name?.toLowerCase().includes(search) ||
          nft.description?.toLowerCase().includes(search) ||
          nft.policyId.toLowerCase().includes(search) ||
          nft.assetName.toLowerCase().includes(search)
      );
    }

    // Apply sale type filter
    if (filterType === "forSale") {
      // All NFTs in marketplace are for sale
      result = result;
    } else if (filterType === "bundles") {
      // This would be implemented based on bundle data
      result = result;
    }

    // Apply price range filter
    if (minPrice) {
      const min = parseFloat(minPrice) * 1_000_000; // Convert to lovelace
      result = result.filter((nft) => Number(nft.price) >= min);
    }

    if (maxPrice) {
      const max = parseFloat(maxPrice) * 1_000_000; // Convert to lovelace
      result = result.filter((nft) => Number(nft.price) <= max);
    }

    // Apply sorting
    result.sort((a, b) => {
      if (sortOrder === "lowToHigh") {
        return Number(a.price) - Number(b.price);
      } else {
        return Number(b.price) - Number(a.price);
      }
    });

    setFilteredNfts(result);
  }, [nfts, searchTerm, filterType, minPrice, maxPrice, sortOrder]);

  const navigateToDetail = (nft: NFTListing) => {
    const unit = `${nft.policyId}${nft.assetName}`;
    router.push(`/nft/details/${unit}`);
  };

  // Unused function but kept for future reference
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const buyNFT = async (nft: NFTListing, e: React.MouseEvent) => {
    e.stopPropagation();
    // Implementation...
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  const handleFilterChange = (type: string) => {
    setFilterType(type);
  };

  const handleSortChange = (order: string) => {
    setSortOrder(order);
  };

  const handleMinPriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMinPrice(e.target.value);
  };

  const handleMaxPriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMaxPrice(e.target.value);
  };

  const handleViewModeChange = (mode: string) => {
    setViewMode(mode);
  };

  const handlePropertySearchChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    setPropertySearchTerm(e.target.value);
    // Add any filtering logic for properties here if needed
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
          <p className="mt-4 text-gray-600 text-lg">
            Loading NFT Marketplace...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 font-mono mt-[50px]">
      {/* Marketplace Header and Filters */}
      <div className="flex flex-col md:flex-row justify-between items-center mb-6">
        <div className="mb-4 md:mb-0">
          <button
            className="bg-white border border-gray-300 rounded-l-lg p-2 px-4 inline-flex items-center"
            onClick={() => handleViewModeChange("grid")}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className={`h-5 w-5 ${
                viewMode === "grid" ? "text-[#FF00EF]" : "text-gray-500"
              }`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
              />
            </svg>
          </button>
          <button
            className="bg-white border border-gray-300 rounded-r-lg p-2 px-4 inline-flex items-center"
            onClick={() => handleViewModeChange("list")}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className={`h-5 w-5 ${
                viewMode === "list" ? "text-[#FF00EF]" : "text-gray-500"
              }`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          </button>
        </div>

        <div className="flex items-center space-x-2">
          <div className="relative">
            <select
              value={sortOrder}
              onChange={(e) => handleSortChange(e.target.value)}
              className="bg-white border border-gray-300 rounded-lg p-2 pl-3 pr-10 appearance-none focus:outline-none"
            >
              <option value="lowToHigh">Price: Low to High</option>
              <option value="highToLow">Price: High to Low</option>
            </select>
            <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
              <svg
                className="w-4 h-4 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row ">
        {/* Sidebar Filters */}
        <div className="lg:w-1/4 pr-8">
          <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
            <div className="mb-4">
              <button className="flex items-center space-x-2 text-gray-700 font-medium">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 text-gray-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
                  />
                </svg>
                <span>Filters</span>
              </button>
            </div>

            <div className="mb-6">
              <h3 className="text-sm font-semibold mb-2">Sale Type</h3>
              <div className="space-y-2">
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="saleType"
                    checked={filterType === "all"}
                    onChange={() => handleFilterChange("all")}
                    className="h-4 w-4 text-[#FF00EF] focus:ring-[#FF00EF]"
                  />
                  <span className="ml-2 text-sm">All NFTs</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="saleType"
                    checked={filterType === "forSale"}
                    onChange={() => handleFilterChange("forSale")}
                    className="h-4 w-4 text-[#FF00EF] focus:ring-[#FF00EF]"
                  />
                  <span className="ml-2 text-sm">For Sale</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="saleType"
                    checked={filterType === "bundles"}
                    onChange={() => handleFilterChange("bundles")}
                    className="h-4 w-4 text-[#FF00EF] focus:ring-[#FF00EF]"
                  />
                  <span className="ml-2 text-sm">Bundles</span>
                </label>
              </div>
            </div>

            <div className="mb-6">
              <h3 className="text-sm font-semibold mb-2">Price Range (ADA)</h3>
              <div className="flex items-center space-x-2">
                <input
                  type="number"
                  placeholder="Min"
                  value={minPrice}
                  onChange={handleMinPriceChange}
                  className="border border-gray-300 rounded-md p-2 w-1/2 text-sm"
                />
                <input
                  type="number"
                  placeholder="Max"
                  value={maxPrice}
                  onChange={handleMaxPriceChange}
                  className="border border-gray-300 rounded-md p-2 w-1/2 text-sm"
                />
              </div>
            </div>

            <div className="mb-6">
              <h3 className="text-sm font-semibold mb-2">Properties</h3>
              <div className="relative">
                <SearchInput
                  placeholder="Search property"
                  value={propertySearchTerm}
                  onChange={handlePropertySearchChange}
                  className="text-sm"
                />
              </div>
            </div>

            {/* Expandable property filters */}
            <div className="space-y-2">
              {[
                "Body",
                "Eyes",
                "Brows",
                "Mouth",
                "Wings",
                "Project",
                "Clothes",
                "Background",
                "Traitcount",
                "Accessories",
                "Hats and hair",
              ].map((property) => (
                <div key={property} className="border-t border-gray-100 pt-2">
                  <button className="flex items-center justify-between w-full text-sm font-medium text-gray-700 hover:text-gray-900">
                    <span>{property}</span>
                    <svg
                      className="h-5 w-5 text-gray-500"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="lg:w-3/4">
          {/* Search Bar */}
          <div className="mb-6">
            <SearchInput
              placeholder="Search NFTs"
              value={searchTerm}
              onChange={handleSearchChange}
            />
          </div>

          {/* NFT Grid */}
          <div
            className={`grid ${
              viewMode === "grid"
                ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
                : "grid-cols-1"
            } gap-4`}
          >
            {filteredNfts.length > 0 ? (
              filteredNfts.map((nft) => (
                <div
                  key={`${nft.txHash}-${nft.outputIndex}`}
                  className={`bg-white rounded-lg shadow-sm overflow-hidden hover:shadow-md transition-shadow duration-300 cursor-pointer ${
                    viewMode === "list" ? "flex" : ""
                  }`}
                  onClick={() => navigateToDetail(nft)}
                >
                  {/* NFT Image */}
                  <div
                    className={`${
                      viewMode === "list" ? "w-1/4" : "aspect-square"
                    } bg-gray-100 overflow-hidden`}
                  >
                    {nft.image ? (
                      <img
                        src={nft.image}
                        alt={nft.name || "NFT Image"}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400">
                        NFT Image
                      </div>
                    )}
                  </div>

                  {/* NFT Details */}
                  <div
                    className={`p-4 flex justify-start ${
                      viewMode === "list" ? "w-3/4" : ""
                    }`}
                  >
                    <div
                      className={`${
                        viewMode === "list" ? "flex justify-start " : ""
                      }`}
                    >
                      <div>
                        <h3 className="font-semibold text-lg truncate">
                          {nft.name || nft.assetName}
                        </h3>
                        {viewMode === "list" && (
                          <p className="text-sm text-gray-500 truncate">
                            {nft.description}
                          </p>
                        )}
                      </div>

                      <div
                        className={`mt-2 ${
                          viewMode === "list" ? "text-right" : ""
                        }`}
                      >
                        <p className="text-gray-600 flex items-center justify-start">
                          <strong className="font-medium text-[#FF00EF]">
                            {Number(nft.price)} ₳
                          </strong>
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-full text-center py-12">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-12 w-12 mx-auto text-gray-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <h3 className="mt-4 text-lg font-medium text-gray-900">
                  No NFTs Found
                </h3>
                <p className="mt-1 text-gray-500">
                  Try adjusting your search or filters.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default NFTMarketplace;
