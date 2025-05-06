"use client";

import { useEffect, useState } from "react";
import { useLucid } from "../../context/LucidProvider";
import BlockforstService from "../../services/blockforst";
import { NFT } from "../../types/nft";
import { NFTCard } from "../../components/UI/MyNFTCard";
import Link from "next/link";
import { toast } from "react-hot-toast";
import { BlockieAvatar } from "../../components/UI/BlockieAvatar";
import SearchInput from "../../components/UI/SearchInput";

interface TokenInfo {
  unit: string;
  amount: string;
  name: string;
}

export default function ProfilePage() {
  const { lucid, address } = useLucid();
  const [loading, setLoading] = useState(true);
  const [nfts, setNfts] = useState<NFT[]>([]);
  const [balance, setBalance] = useState<{
    lovelace: string;
    tokens: TokenInfo[];
  }>({
    lovelace: "0",
    tokens: [],
  });
  const [walletName, setWalletName] = useState<string>("");
  const [networkId] = useState<string>("Preprod");
  const [copyTooltip, setCopyTooltip] = useState<string>("Copy to clipboard");
  const [showEditName, setShowEditName] = useState(false);
  const [newWalletName, setNewWalletName] = useState("");

  // Add new state for NFT search
  const [nftSearchTerm, setNftSearchTerm] = useState<string>("");
  const [filteredNfts, setFilteredNfts] = useState<NFT[]>([]);

  // Fetch wallet NFTs and balance
  useEffect(() => {
    async function fetchWalletData() {
      if (!address || !lucid) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const blockfrostService = new BlockforstService();

        // Fetch NFTs
        const fetchedNfts = await blockfrostService.getNFTs(address);
        setNfts(fetchedNfts);

        // Fetch wallet balance
        const utxos = await lucid.utxosAt(address);

        // Calculate total balance
        let totalLovelace = BigInt(0);
        const tokenAmounts: Record<string, bigint> = {};

        for (const utxo of utxos) {
          for (const [unit, amount] of Object.entries(utxo.assets)) {
            if (unit === "lovelace") {
              totalLovelace += BigInt(amount.toString());
            } else {
              const currentAmount = tokenAmounts[unit] || BigInt(0);
              tokenAmounts[unit] = currentAmount + BigInt(amount.toString());
            }
          }
        }

        // Convert to readable format
        const lovelaceBalance = (Number(totalLovelace) / 1000000).toFixed(6);

        // Format token balances
        const tokenBalances = Object.entries(tokenAmounts).map(
          ([unit, amount]) => ({
            unit,
            amount: amount.toString(),
            // Would typically fetch token metadata here
            name: unit.slice(-32), // Simple display name from unit
          })
        );

        setBalance({
          lovelace: lovelaceBalance,
          tokens: tokenBalances,
        });

        // Get wallet name from session storage
        if (typeof window !== "undefined") {
          const storedWalletName = sessionStorage.getItem("connectedWallet");
          if (storedWalletName) {
            setWalletName(storedWalletName);
            setNewWalletName(storedWalletName);
          }
        }
      } catch (error) {
        console.error("Error fetching wallet data:", error);
        toast.error("Failed to load wallet data");
      } finally {
        setLoading(false);
      }
    }

    fetchWalletData();
  }, [address, lucid]);

  // Add search filter effect
  useEffect(() => {
    if (nftSearchTerm.trim() === "") {
      setFilteredNfts(nfts);
    } else {
      const searchLower = nftSearchTerm.toLowerCase();
      const filtered = nfts.filter(
        (nft) =>
          nft.assetDetails?.onchain_metadata?.name
            ?.toLowerCase()
            .includes(searchLower) ||
          nft.assetDetails?.onchain_metadata?.description
            ?.toLowerCase()
            .includes(searchLower) ||
          nft.assetDetails?.policy_id?.toLowerCase().includes(searchLower) ||
          nft.assetDetails?.asset_name?.toLowerCase().includes(searchLower) ||
          nft.unit?.toLowerCase().includes(searchLower)
      );
      setFilteredNfts(filtered);
    }
  }, [nfts, nftSearchTerm]);

  // Add handler for search input
  const handleNftSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNftSearchTerm(e.target.value);
  };

  // Function to copy address to clipboard
  const copyToClipboard = () => {
    if (!address) return;

    navigator.clipboard
      .writeText(address)
      .then(() => {
        setCopyTooltip("Copied!");
        setTimeout(() => setCopyTooltip("Copy to clipboard"), 2000);
        toast.success("Address copied to clipboard");
      })
      .catch((error) => {
        console.error("Failed to copy address:", error);
        toast.error("Failed to copy address");
      });
  };

  // Format address for display
  const formatAddress = (addr: string | null) => {
    if (!addr) return "";
    return addr.length > 20
      ? `${addr.substring(0, 10)}...${addr.substring(addr.length - 10)}`
      : addr;
  };

  // Function to save the new wallet name
  const saveWalletName = () => {
    if (newWalletName.trim()) {
      setWalletName(newWalletName.trim());
      sessionStorage.setItem("connectedWallet", newWalletName.trim());
      toast.success("Wallet name saved");
    }
    setShowEditName(false);
  };

  if (!address) {
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
    <div className="max-w-6xl mx-auto p-6 mt-[50px] font-mono">
      {/* Profile Header with gradient background */}
      <div className="bg-gradient-to-r from-red-500/70 via-purple-500/70 to-blue-500/70 rounded-xl p-8 mb-8 shadow-lg relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-red-500/30 via-green-500/30 to-blue-500/30 backdrop-blur-sm"></div>

        <div className="relative z-10 flex flex-col md:flex-row items-center md:items-start gap-6">
          {/* Avatar Section */}
          <div className="flex-shrink-0">
            <div className="border-4 border-white rounded-full shadow-xl bg-gradient-to-br from-purple-200 to-indigo-200 p-1">
              <BlockieAvatar address={address} size={96} />
            </div>
          </div>

          {/* Profile Info */}
          <div className="flex-grow flex flex-col items-center md:items-start">
            {showEditName ? (
              <div className="flex items-center mb-2">
                <input
                  type="text"
                  value={newWalletName}
                  onChange={(e) => setNewWalletName(e.target.value)}
                  className="bg-white/80 backdrop-blur-sm px-3 py-1 rounded border border-white/50 text-gray-900 focus:outline-none"
                  placeholder="Enter wallet name"
                />
                <button
                  onClick={saveWalletName}
                  className="ml-2 bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded"
                >
                  Save
                </button>
                <button
                  onClick={() => setShowEditName(false)}
                  className="ml-1 bg-gray-500 hover:bg-gray-600 text-white px-3 py-1 rounded"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <div className="flex items-center mb-1">
                <h1 className="text-2xl md:text-3xl font-bold text-white mr-2">
                  {walletName || "Unnamed Wallet"}
                </h1>
                <button
                  onClick={() => setShowEditName(true)}
                  className="text-white/80 hover:text-white"
                >
                  ✏️
                </button>
              </div>
            )}

            <div className="flex items-center text-white/90 mb-1">
              <span className="font-mono bg-black/20 backdrop-blur-sm rounded px-2 py-1">
                {formatAddress(address)}
              </span>
              <button
                onClick={copyToClipboard}
                className="ml-2 text-white/80 hover:text-white transition"
                title={copyTooltip}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" />
                  <path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z" />
                </svg>
              </button>
            </div>

            <div className="flex items-center gap-4 mt-2">
              <div className="bg-black/20 backdrop-blur-sm text-white rounded-lg px-3 py-1">
                <span className="text-white/80 text-sm mr-1">NET WORTH</span>
                <span className="font-bold">{balance.lovelace} ₳</span>
              </div>

              <div className="bg-black/20 backdrop-blur-sm text-white rounded-lg px-3 py-1">
                <span className="text-white/80 text-sm mr-1">NFTs</span>
                <span className="font-bold">{nfts.length}</span>
              </div>

              <div className="bg-black/20 backdrop-blur-sm text-white rounded-lg px-3 py-1">
                <span className="text-white/80 text-sm mr-1">TOKENS</span>
                <span className="font-bold">{balance.tokens.length}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Left Column - Wallet Info & Assets */}
        <div className="md:col-span-4 flex flex-col gap-6">
          {/* Wallet Information Card */}
          <div className="bg-white rounded-lg p-6 shadow border border-gray-200">
            <h2 className="text-xl font-bold text-gray-900 mb-4 border-b border-gray-200 pb-2">
              Wallet Details
            </h2>

            {loading ? (
              <div className="animate-pulse flex flex-col space-y-4">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-4 bg-gray-200 rounded w-full"></div>
                <div className="h-4 bg-gray-200 rounded w-5/6"></div>
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="text-gray-500 text-sm block">
                    Wallet Name
                  </label>
                  <p className="text-gray-900 font-semibold">
                    {walletName || "Unnamed Wallet"}
                  </p>
                </div>

                <div>
                  <label className="text-gray-500 text-sm block">Address</label>
                  <div className="flex items-center">
                    <p className="text-gray-900 font-mono text-sm truncate mr-2">
                      {formatAddress(address)}
                    </p>
                    <button
                      onClick={copyToClipboard}
                      className="text-blue-600 hover:text-blue-700 text-sm"
                      title={copyTooltip}
                    >
                      📋
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-gray-500 text-sm block">Network</label>
                  <p className="text-gray-900">{networkId}</p>
                </div>

                <div>
                  <label className="text-gray-500 text-sm block">Balance</label>
                  <p className="text-gray-900 font-bold">
                    {balance.lovelace} ₳
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column - NFTs */}
        <div className="md:col-span-8">
          <div className="bg-white rounded-lg p-6 shadow border border-gray-200">
            <div className="flex justify-between items-center mb-4 border-b border-gray-200 pb-2">
              <h2 className="text-xl font-bold text-gray-900">Your NFTs</h2>

              <div className="flex items-center gap-2">
                <Link
                  href="/mint"
                  className="inline-block bg-gradient-to-r from-[#FF00EF] to-purple-600 text-white px-4 py-2 rounded-lg text-sm shadow-md hover:opacity-90 transition"
                >
                  Mint NFT
                </Link>

                <Link
                  href="/marketplace"
                  className="inline-block bg-gradient-to-r from-indigo-500 to-blue-600 text-white px-4 py-2 rounded-lg text-sm shadow-md hover:opacity-90 transition"
                >
                  Marketplace
                </Link>
              </div>
            </div>

            {/* Add search input */}
            <div className="mb-4">
              <SearchInput
                placeholder="Search your NFTs"
                value={nftSearchTerm}
                onChange={handleNftSearchChange}
              />
            </div>

            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[...Array(6)].map((_, index) => (
                  <div key={index} className="animate-pulse">
                    <div className="bg-gray-200 aspect-square rounded-lg"></div>
                    <div className="h-4 bg-gray-200 rounded mt-2 w-3/4"></div>
                    <div className="h-4 bg-gray-200 rounded mt-2 w-1/2"></div>
                  </div>
                ))}
              </div>
            ) : nfts.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredNfts.map((nft, index) => (
                  <NFTCard key={index} nft={nft} />
                ))}
              </div>
            ) : (
              <div className="text-center py-10">
                <div className="text-gray-400 mb-4">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-16 w-16 mx-auto"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1}
                      d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                </div>
                <h3 className="text-xl font-medium text-gray-900 mb-2">
                  No NFTs Found
                </h3>
                <p className="text-gray-500 mb-6">
                  You don&apos;t have any NFTs in your wallet yet.
                </p>
                <Link
                  href="/mint"
                  className="inline-block bg-gradient-to-r from-[#FF00EF] to-purple-600 text-white px-6 py-3 rounded-lg font-medium shadow-md hover:opacity-90 transition"
                >
                  Mint Your First NFT
                </Link>
              </div>
            )}
          </div>

          {/* Tokens List for Mobile View */}
          <div className="md:hidden mt-6 bg-white rounded-lg p-6 shadow border border-gray-200">
            <h2 className="text-xl font-bold text-gray-900 mb-4 border-b border-gray-200 pb-2">
              Your Tokens
            </h2>

            {loading ? (
              <div className="animate-pulse flex flex-col space-y-4">
                <div className="h-4 bg-gray-200 rounded w-full"></div>
                <div className="h-4 bg-gray-200 rounded w-5/6"></div>
              </div>
            ) : balance.tokens.length > 0 ? (
              <div className="space-y-2">
                {balance.tokens.map((token, i) => (
                  <div
                    key={i}
                    className="flex justify-between items-center p-3 bg-gray-50 rounded-lg border border-gray-100"
                  >
                    <div className="font-mono text-xs text-gray-800 truncate max-w-[200px]">
                      {token.name}
                    </div>
                    <div className="font-medium text-gray-900">
                      {Number(token.amount).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-gray-500">
                No tokens found in your wallet
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
