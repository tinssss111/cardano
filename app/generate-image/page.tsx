/* eslint-disable @next/next/no-img-element */
"use client";

import React, { useState, useCallback, useEffect } from "react";
import { useLucid } from "@/context/LucidProvider";

interface UserImage {
  id: string;
  walletAddress: string;
  prompt: string;
  imageUrl: string;
  createdAt: string;
  model?: string;
}

const GenerateImagePage: React.FC = () => {
  const { lucid, address } = useLucid();
  const [prompt, setPrompt] = useState("");
  const [generatedImage, setGeneratedImage] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingTime, setLoadingTime] = useState(0);
  const [error, setError] = useState("");
  const [walletAddress, setWalletAddress] = useState<string>("");
  const [imageHistory, setImageHistory] = useState<UserImage[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [hoverImageId, setHoverImageId] = useState<string | null>(null);
  const [canUseFallback, setCanUseFallback] = useState(false);
  const [useFallbackModel, setUseFallbackModel] = useState(false);
  const [currentModel, setCurrentModel] = useState<string | null>(null);

  // Loading timer
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;

    if (loading) {
      setLoadingTime(0);
      timer = setInterval(() => {
        setLoadingTime((prev) => prev + 1);
      }, 1000);
    } else if (timer) {
      clearInterval(timer);
    }

    return () => {
      if (timer) clearInterval(timer);
    };
  }, [loading]);

  // Get wallet address on component mount
  useEffect(() => {
    const getWalletAddress = async () => {
      if (lucid && address) {
        try {
          setWalletAddress(address);
        } catch (error) {
          console.error("Error getting wallet address:", error);
        }
      }
    };

    getWalletAddress();
  }, [address]);

  // Fetch image history when wallet address changes
  useEffect(() => {
    const fetchImageHistory = async () => {
      if (!walletAddress) return;

      try {
        setLoadingHistory(true);
        const response = await fetch(
          `/api/user-images?walletAddress=${walletAddress}`
        );

        if (response.ok) {
          const data = await response.json();
          setImageHistory(data);
        }
      } catch (error) {
        console.error("Error fetching image history:", error);
      } finally {
        setLoadingHistory(false);
      }
    };

    fetchImageHistory();
  }, [walletAddress]);

  const handleGenerateImage = useCallback(async () => {
    if (!prompt) {
      setError("Please enter a prompt");
      return;
    }

    if (!walletAddress) {
      setError("Please connect your wallet first");
      return;
    }

    try {
      setLoading(true);
      setError("");
      setCanUseFallback(false);
      setCurrentModel(null);

      const response = await fetch("/api/generate-image", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt,
          useFallbackModel,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        let errorMessage = data.error || "Failed to generate image";

        // Check if we can use fallback model
        if (data.canUseFallback) {
          setCanUseFallback(true);
          throw new Error(`${errorMessage}. You can try using a faster model.`);
        }

        // Extract more detailed error if available
        if (data.details) {
          if (typeof data.details === "string") {
            errorMessage += `: ${data.details}`;
          } else if (data.details.message) {
            errorMessage += `: ${data.details.message}`;
          } else if (data.details.error?.message) {
            errorMessage += `: ${data.details.error.message}`;
          }
        }

        throw new Error(errorMessage);
      }

      setGeneratedImage(data.image);
      if (data.model) {
        setCurrentModel(data.model);
      }

      // Save image to history
      await saveImageToHistory(data.image, data.model);
    } catch (error) {
      console.error("Error generating image:", error);
      setError(
        error instanceof Error
          ? error.message
          : "Failed to generate image. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }, [prompt, walletAddress, useFallbackModel]);

  const saveImageToHistory = async (imageUrl: string, model?: string) => {
    try {
      const response = await fetch("/api/user-images", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          walletAddress,
          prompt,
          imageUrl,
          model,
        }),
      });

      if (response.ok) {
        const newImage = await response.json();
        // Update history with new image
        setImageHistory((prev) => [newImage, ...prev]);
      }
    } catch (error) {
      console.error("Error saving image to history:", error);
    }
  };

  const handleUseFallbackModel = () => {
    setUseFallbackModel(true);
    handleGenerateImage();
  };

  const handleDownload = useCallback((imageUrl: string) => {
    if (!imageUrl) return;

    const link = document.createElement("a");
    link.href = imageUrl;
    link.download = `generated-image-${Date.now()}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, []);

  // Use image from history as prompt
  const handleUseImage = (image: UserImage) => {
    setPrompt(image.prompt);
    setGeneratedImage(image.imageUrl);
    if (image.model) {
      setCurrentModel(image.model);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 mt-[50px]">
      <h1 className="text-3xl font-bold text-center mb-8">Generate AI Image</h1>

      <div className="flex flex-col md:flex-row gap-6">
        {/* Left Column - Image History */}
        <div className="md:w-1/3 bg-white p-6 border-r border-gray-300">
          <h2 className="text-xl font-semibold mb-4">Your Image History</h2>

          {!walletAddress ? (
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
          ) : loadingHistory ? (
            <div className="flex justify-center items-center my-8">
              <div className="h-10 w-10 rounded-full border-t-4 border-b-4 border-[#FF00EF] animate-spin"></div>
            </div>
          ) : imageHistory.length === 0 ? (
            <div className="text-center p-4">
              <p>No images generated yet</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {imageHistory.map((image) => (
                <div
                  key={image.id}
                  className="relative aspect-square cursor-pointer"
                  onMouseEnter={() => setHoverImageId(image.id)}
                  onMouseLeave={() => setHoverImageId(null)}
                  onClick={() => handleUseImage(image)}
                >
                  <img
                    src={image.imageUrl}
                    alt={image.prompt}
                    className="w-full h-full object-cover"
                  />

                  {hoverImageId === image.id && (
                    <div className="absolute inset-0 backdrop-blur-sm bg-white/10 flex items-center justify-center">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDownload(image.imageUrl);
                        }}
                        className="p-2 rounded-full bg-white text-gray-800 hover:bg-gray-200"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-6 w-6"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                          />
                        </svg>
                      </button>
                    </div>
                  )}

                  {image.model && (
                    <div className="absolute bottom-1 right-1 text-xs bg-opacity-60 text-white px-1 py-0.5 rounded">
                      {image.model.includes("FLUX") ? "FLUX" : "SDXL"}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Column - Generate Image Form */}
        <div className="md:w-2/3 bg-white rounded-xl p-6">
          <h2 className="text-xl font-semibold mb-4">Create New Image</h2>

          {!walletAddress ? (
            <div className="text-center p-4 bg-gray-50 rounded-lg mb-4">
              <p>Connect your wallet to generate images</p>
            </div>
          ) : (
            <>
              <div className="mb-4">
                <label
                  htmlFor="prompt"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Describe the image you want to generate
                </label>
                <textarea
                  id="prompt"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-[#FF00EF] focus:border-[#FF00EF] min-h-[100px]"
                  placeholder="Enter a detailed description of the image you want to create..."
                />
              </div>

              <div className="flex flex-col sm:flex-row gap-3 mb-4">
                <button
                  onClick={() => {
                    setUseFallbackModel(false);
                    handleGenerateImage();
                  }}
                  disabled={loading || !prompt}
                  className="flex-1 bg-[#FF00EF] hover:bg-[#bf66b9] text-white py-3 px-6 rounded-lg text-md font-semibold transition-colors disabled:bg-gray-400"
                >
                  {loading && !useFallbackModel
                    ? "Generating (High Quality)..."
                    : "Generate High Quality"}
                </button>

                <button
                  onClick={() => {
                    setUseFallbackModel(true);
                    handleGenerateImage();
                  }}
                  disabled={loading || !prompt}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 px-6 rounded-lg text-md font-semibold transition-colors disabled:bg-gray-400"
                >
                  {loading && useFallbackModel
                    ? "Generating (Faster)..."
                    : "Generate Faster"}
                </button>
              </div>

              {error && (
                <div className="mt-4 p-3 bg-red-100 text-red-700 rounded-lg">
                  {error}

                  {canUseFallback && (
                    <div className="mt-2">
                      <button
                        onClick={handleUseFallbackModel}
                        className="text-white bg-blue-600 hover:bg-blue-700 py-2 px-4 rounded text-sm"
                      >
                        Try faster model
                      </button>
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {loading && (
            <div className="flex flex-col justify-center items-center my-8">
              <div className="relative mb-4">
                <div className="h-24 w-24 rounded-full border-t-4 border-b-4 border-[#FF00EF] animate-spin"></div>
                <div className="absolute top-0 left-0 h-24 w-24 rounded-full border-r-4 border-l-4 border-purple-300 animate-ping opacity-75"></div>
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-[#FF00EF] font-bold text-xl">
                  Mintix
                </div>
              </div>
              <div className="text-center">
                <p className="text-gray-600">
                  Generating image with{" "}
                  {useFallbackModel ? "faster" : "high quality"} model...{" "}
                  {loadingTime}s
                </p>
                {loadingTime > 20 && !useFallbackModel && (
                  <p className="text-gray-500 text-sm mt-2">
                    High quality image generation can take up to 90 seconds. For
                    faster results, try the &quot;Generate Faster&quot; option.
                  </p>
                )}
                {loadingTime > 20 && useFallbackModel && (
                  <p className="text-gray-500 text-sm mt-2">
                    Image generation is taking longer than expected. Please be
                    patient.
                  </p>
                )}
              </div>
            </div>
          )}

          {generatedImage && !loading && (
            <div className="mt-6">
              <h3 className="text-lg font-medium mb-3">Generated Image</h3>
              <div
                className="relative w-full aspect-square mb-4"
                onMouseEnter={() => setHoverImageId("current")}
                onMouseLeave={() => setHoverImageId(null)}
              >
                <img
                  src={generatedImage}
                  alt="Generated AI image"
                  className="w-full h-full object-contain rounded-lg"
                />

                {hoverImageId === "current" && (
                  <div className="absolute inset-0 backdrop-blur-sm bg-white/10 rounded-lg flex items-center justify-center">
                    <button
                      onClick={() => handleDownload(generatedImage)}
                      className="p-2 rounded-full bg-white text-gray-800 hover:bg-gray-200"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-6 w-6"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                        />
                      </svg>
                    </button>
                  </div>
                )}

                {currentModel && (
                  <div className="absolute bottom-1 right-1 text-xs bg-black bg-opacity-60 text-white px-1 py-0.5 rounded">
                    {currentModel.includes("FLUX")
                      ? "FLUX (High Quality)"
                      : "SDXL (Faster)"}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default GenerateImagePage;
