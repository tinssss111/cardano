/* eslint-disable @next/next/no-img-element */
import { fromText } from "lucid-cardano";
import React, { useState, useRef, ChangeEvent } from "react";
import { useLucid } from "../context/LucidProvider";
interface MintStatus {
  status: "idle" | "uploading" | "minting" | "success" | "error";
  message?: string;
}

export const Mint = () => {
  const { lucid, address } = useLucid();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [image, setImage] = useState<string>("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string>("");
  const [status, setStatus] = useState<MintStatus>({ status: "idle" });
  console.log("ssss", process.env.PINATA_API_KEY);
  console.log(process.env.PINATA_API_SECRET);
  // Add supply/quantity state
  const [supply, setSupply] = useState<string>("1");

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImageFile(file);

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const uploadToIPFS = async (file: File): Promise<string> => {
    try {
      setStatus({ status: "uploading", message: "Uploading image to IPFS..." });

      // Create FormData
      const formData = new FormData();
      formData.append("file", file);

      // This is a sample API endpoint - replace with your actual IPFS service
      const ipfsEndpoint = "https://api.pinata.cloud/pinning/pinFileToIPFS";
      const pinataApiKey = process.env.NEXT_PUBLIC_PINATA_API_KEY || "";
      const pinataSecretApiKey =
        process.env.NEXT_PUBLIC_PINATA_API_SECRET || "";

      // You'll need to add your API keys for authentication
      const response = await fetch(ipfsEndpoint, {
        method: "POST",
        headers: {
          pinata_api_key: pinataApiKey || "",
          pinata_secret_api_key: pinataSecretApiKey || "",
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Failed to upload to IPFS");
      }

      const data = await response.json();
      // The IPFS URL will be in the format: ipfs://{CID}
      const ipfsUrl = `ipfs://${data.IpfsHash}`;
      setImage(ipfsUrl);
      return ipfsUrl;
    } catch (error) {
      console.error("Error uploading to IPFS:", error);
      setStatus({
        status: "error",
        message: "Failed to upload image. Please try again.",
      });
      throw error;
    }
  };

  const getMintingPolicy = async () => {
    if (!lucid) {
      throw new Error("Lucid is not initialized");
    }

    if (!address) {
      throw new Error("Wallet is not connected");
    }

    try {
      const { paymentCredential } = lucid.utils.getAddressDetails(address);

      if (!paymentCredential) {
        throw new Error("Payment credential not found");
      }

      const mintingPolicy = lucid.utils.nativeScriptFromJson({
        type: "all",
        scripts: [
          { type: "sig", keyHash: paymentCredential.hash },
          {
            type: "before",
            slot: lucid.utils.unixTimeToSlot(Date.now() + 1000000),
          },
        ],
      });

      const policyId = lucid.utils.mintingPolicyToId(mintingPolicy);

      return {
        policyId,
        mintingPolicy,
      };
    } catch (error) {
      console.error("Error in getMintingPolicy:", error);
      throw error;
    }
  };

  const mint = async () => {
    try {
      // Kiểm tra xem người dùng đã kết nối ví chưa
      if (!lucid) {
        setStatus({
          status: "error",
          message: "Please connect your Cardano wallet to mint NFT",
        });
        return;
      }

      if (!name) {
        setStatus({
          status: "error",
          message: "Please enter a name for your NFT",
        });
        return;
      }

      let ipfsUrl = image;

      // If user uploaded a file, send it to IPFS first
      if (imageFile && !image) {
        ipfsUrl = await uploadToIPFS(imageFile);
      }

      if (!ipfsUrl) {
        setStatus({
          status: "error",
          message: "Please upload an image or provide an image URL",
        });
        return;
      }

      // Kiểm tra xem địa chỉ ví đã được cung cấp chưa
      if (!address) {
        setStatus({
          status: "error",
          message: "Could not get wallet address. Please reconnect.",
        });
        return;
      }

      // Validate supply
      const supplyNum = parseInt(supply);
      if (isNaN(supplyNum) || supplyNum < 1) {
        setStatus({
          status: "error",
          message: "Supply must be a positive number",
        });
        return;
      }

      setStatus({ status: "minting", message: "Creating your NFT..." });

      const { mintingPolicy, policyId } = await getMintingPolicy();
      const assetName = fromText(name);

      // Create NFT metadata according to CIP-25 standard
      const metadata = {
        [policyId]: {
          [name]: {
            name,
            description: description || "",
            image: ipfsUrl,
            mediaType: imageFile?.type || "image/png",
            supply: supplyNum,
          },
        },
      };

      // 721 is the metadata label for NFTs according to CIP-25
      const tx = await lucid
        .newTx()
        .mintAssets({ [policyId + assetName]: BigInt(supplyNum) })
        .attachMetadata(721, metadata)
        .validTo(Date.now() + 200000)
        .attachMintingPolicy(mintingPolicy)
        .complete();

      const signedTx = await tx.sign().complete();
      const txHashResult = await signedTx.submit();
      setTxHash(txHashResult);
      setStatus({
        status: "success",
        message: "NFT minted successfully!",
      });

      // Reset form after successful mint
      setTimeout(() => {
        setName("");
        setDescription("");
        setImage("");
        setImageFile(null);
        setImagePreview(null);
        setSupply("1");
        setStatus({ status: "idle" });
      }, 5000);
    } catch (error) {
      console.error("Error minting NFT:", error);
      setStatus({
        status: "error",
        message: `Error minting NFT: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      });
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="p-8 max-w-3xl w-full mx-auto">
      <h1 className="text-3xl font-bold mb-2 text-gray-800">create an nft</h1>
      <p className="text-sm text-gray-500 mb-6">
        once your item is minted you will not be able to change any of its
        information.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Left column - NFT Image */}
        <div className="mb-4">
          <div
            onClick={triggerFileInput}
            className={`border border-dashed rounded-lg flex flex-col items-center justify-center text-center cursor-pointer transition-colors h-80 ${
              imagePreview
                ? "border-gray-300"
                : "border-gray-300 hover:border-blue-500"
            }`}
          >
            {imagePreview ? (
              <div className="relative w-full h-full flex justify-center items-center">
                <img
                  src={imagePreview}
                  alt="nft preview"
                  className="h-full w-full object-contain rounded-lg"
                />
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setImagePreview(null);
                    setImageFile(null);
                    setImage("");
                    if (fileInputRef.current) fileInputRef.current.value = "";
                  }}
                  className="absolute top-2 right-2 bg-gray-800 bg-opacity-60 text-white p-1 rounded-full hover:bg-gray-900"
                  title="Remove image"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                      clipRule="evenodd"
                    />
                  </svg>
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full px-6">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-10 w-10 text-gray-400 mb-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                  />
                </svg>
                <p className="text-base font-medium">drag and drop media</p>
                <p className="text-sm text-blue-600 mt-1">browse files</p>
                <p className="text-xs text-gray-500 mt-2">
                  max size: 50mb
                  <br />
                  jpg, png, gif, svg, mp4
                </p>
              </div>
            )}
          </div>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/*,video/mp4"
            className="hidden"
          />
        </div>
        {/* Right column - Form Fields */}
        <div className="space-y-6">
          {/* Name */}
          <div>
            <label
              htmlFor="name"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="name your nft"
            />
          </div>

          {/* Supply/Quantity */}
          <div>
            <label
              htmlFor="supply"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              supply <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              id="supply"
              value={supply}
              min="1"
              onChange={(e) => setSupply(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="1"
            />
          </div>

          {/* Description */}
          <div>
            <label
              htmlFor="description"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              description
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="enter a description"
              rows={2}
            />
          </div>
        </div>
      </div>

      {/* Status Messages */}
      {status.status !== "idle" && status.message && (
        <div
          className={`p-4 rounded-lg mt-6 ${
            status.status === "error"
              ? "bg-red-50 text-red-700"
              : status.status === "success"
              ? "bg-green-50 text-green-700"
              : "bg-blue-50 text-blue-700"
          }`}
        >
          <p>{status.message}</p>
        </div>
      )}

      {/* Transaction Hash */}
      {txHash && (
        <div className="p-4 bg-gray-50 rounded-lg mt-6 border border-gray-200">
          <p className="text-sm text-gray-600 mb-1">Transaction Hash:</p>
          <div className="flex items-center">
            <p className="font-mono text-xs text-gray-800 truncate flex-1">
              {txHash}
            </p>
            <button
              onClick={() => {
                navigator.clipboard.writeText(txHash);
              }}
              className="text-blue-600 hover:text-blue-700 ml-2"
              title="Copy to clipboard"
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
            <a
              href={`https://cardanoscan.io/transaction/${txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="ml-2 text-blue-600 hover:text-blue-700"
              title="View on Cardanoscan"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z" />
                <path d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z" />
              </svg>
            </a>
          </div>
        </div>
      )}

      {/* Mint Button */}
      <div className="mt-8">
        <button
          onClick={mint}
          disabled={
            status.status === "uploading" || status.status === "minting"
          }
          className={`w-full ${
            status.status === "uploading" || status.status === "minting"
              ? "bg-gray-400 cursor-not-allowed"
              : "bg-[#FF00EF] hover:bg-[#e37edc]"
          } text-white font-medium py-3 px-6 rounded-lg transition duration-200`}
        >
          {status.status === "uploading"
            ? "uploading..."
            : status.status === "minting"
            ? "minting..."
            : "create nft"}
        </button>
      </div>
    </div>
  );
};
