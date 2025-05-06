/* eslint-disable @next/next/no-img-element */
"use client";

import { FC } from "react";
import { NFT } from "../../types/nft";
import { useRouter } from "next/navigation";

interface NFTCardProps {
  nft: NFT;
}

export const NFTCard: FC<NFTCardProps> = ({ nft }) => {
  const router = useRouter();
  const metadata = nft.assetDetails?.onchain_metadata || {};
  const name = metadata.name || "Unknown NFT";
  const image = metadata.image
    ? metadata.image.startsWith("ipfs://")
      ? `https://gateway.pinata.cloud/ipfs/${metadata.image.replace(
          "ipfs://",
          ""
        )}`
      : metadata.image
    : "https://i.sstatic.net/LnEYQ.jpghttps://www.google.com/url?sa=i&url=https%3A%2F%2Fwww.istockphoto.com%2Fphotos%2Fimage-not-found&psig=AOvVaw0EbS87eJNX66R7wrCM5Ykk&ust=1746265102435000&source=images&cd=vfe&opi=89978449&ved=0CBUQjRxqFwoTCMC70cq-hI0DFQAAAAAdAAAAABAE";

  const quantity = nft.quantity;

  const handleClick = () => {
    router.push(`/nft/details/${nft.unit}`);
  };

  return (
    <div
      className="rounded-xl shadow-md hover:shadow-lg hover:scale-105 transition-transform duration-300 ease-in-out overflow-hidden bg-white cursor-pointer border border-gray-200"
      onClick={handleClick}
    >
      <div className="relative">
        <img
          src={image}
          alt={name}
          className="w-full h-44 object-cover"
          onError={(e) => {
            e.currentTarget.src = "https://via.placeholder.com/150?text=NFT";
          }}
        />
        {quantity && parseInt(quantity, 10) > 1 && (
          <div className="absolute top-2 right-2 bg-gray-900/80 text-white text-xs px-2 py-1 rounded-full">
            x{quantity}
          </div>
        )}
      </div>
      <div className="p-4">
        <h3 className="text-base font-semibold text-gray-900 truncate mb-1">
          {name}
        </h3>
        <div className="flex justify-between items-center mt-2">
          <div className="flex items-center">
            <p className="text-xs text-gray-500">
              {quantity} {name}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
