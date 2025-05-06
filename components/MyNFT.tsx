"use client";

import { useEffect, useState } from "react";
import { useLucid } from "../context/LucidProvider";
import Blockfrost from "../services/blockforst";
import { NFT } from "../types/nft";
import { NFTCard } from "./UI/MyNFTCard";

export const MyNFT = () => {
  const { address } = useLucid();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const blockfrostService = new Blockfrost();
  const [nfts, setNfts] = useState<NFT[]>([]);

  useEffect(() => {
    async function fetchNFTs() {
      if (address) {
        try {
          const fetchedNfts = await blockfrostService.getNFTs(address);
          setNfts(fetchedNfts);
        } catch (error) {
          console.error("Error fetching NFTs:", error);
        }
      }
    }
    fetchNFTs();
  }, [address, blockfrostService]);

  return (
    <div className="max-w-7xl mx-auto p-6">
      <h1 className="uppercase text-4xl font-bold text-center font-mono mt-10 mb-10 text-white border-b pb-[70px] border-gray-500 animate-fade-in">
        AI predictions turned into nft you can sell it
      </h1>
      {nfts.length === 0 ? (
        <p className="text-center text-lg text-gray-400 font-mono animate-pulse">
          Loading...
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
          {nfts.map((nft, index) => (
            <NFTCard key={index} nft={nft} />
          ))}
        </div>
      )}
    </div>
  );
};
