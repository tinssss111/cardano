/* eslint-disable @typescript-eslint/no-explicit-any */
interface NFTCardProps {
  nft: {
    unit: string;
    quantity: string;
    assetDetails: {
      asset: string;
      policy_id: string;
      asset_name: string;
      fingerprint: string;
      quantity: string;
      initial_mint_tx_hash: string;
      mint_or_burn_count: number;
      onchain_metadata: {
        name: string;
        description: string;
        image: string;
        mediaType: string;
      };
      onchain_metadata_standard: string;
      onchain_metadata_extra: null | any;
      metadata: null | any;
    };
  };
}

const NFTCard: React.FC<NFTCardProps> = ({ nft }) => {
  return (
    <div className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200">
      <div className="relative">
        <img
          src={
            nft.assetDetails.onchain_metadata?.image?.replace(
              "ipfs://",
              "https://crimson-fascinating-vulture-838.mypinata.cloud/ipfs/"
            ) || "/placeholder-image.png"
          }
          alt={nft.assetDetails.onchain_metadata?.name || "NFT Image"}
          className="w-full h-64 object-cover rounded-t-lg"
        />
      </div>

      <div className="p-4">
        <h3 className="font-semibold text-lg mb-2 truncate">
          {nft.assetDetails.onchain_metadata?.name || "Unnamed NFT"}
        </h3>

        <div className="flex justify-between items-center">
          <p className="text-gray-600">
            <span className="text-[#FF00EF] font-bold">{nft.quantity} ₳</span>
          </p>
          <p className="text-xs text-gray-500 truncate max-w-[70%]">
            {nft.assetDetails.policy_id.slice(0, 8)}...
          </p>
        </div>
      </div>
    </div>
  );
};

export default NFTCard;
