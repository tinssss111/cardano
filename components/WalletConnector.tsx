"use client";

import { useState, useEffect, useRef } from "react";
import { useLucid } from "@/context/LucidProvider";
import Image from "next/image";
import { WalletApi } from "lucid-cardano";

interface WalletOption {
  id: string;
  name: string;
  logo: string;
  installUrl: string;
  connector: () => Promise<WalletApi>;
}

export default function WalletConnector() {
  const { lucid, address, connectWallet, disconnectWallet } = useLucid();
  const [isOpen, setIsOpen] = useState(false);
  const [isWalletMenuOpen, setIsWalletMenuOpen] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [installedWallets, setInstalledWallets] = useState<
    Record<string, boolean>
  >({});
  const [balance, setBalance] = useState<string>("0");
  const [copiedAddress, setCopiedAddress] = useState(false);
  const walletMenuRef = useRef<HTMLDivElement>(null);

  // Define wallet options
  const walletOptions: WalletOption[] = [
    {
      id: "eternl",
      name: "Eternl",
      logo: "/logo/eternl.png",
      installUrl: "https://eternl.io/app/mainnet/welcome",
      connector: async () => {
        if (!lucid) throw new Error("Lucid is not initialized");
        if (!window.cardano?.eternl) throw new Error("Eternl wallet not found");
        const api = await window.cardano.eternl.enable();
        return api;
      },
    },
    {
      id: "lace",
      name: "Lace",
      logo: "/logo/lace.svg",
      installUrl: "https://www.lace.io/",
      connector: async () => {
        if (!lucid) throw new Error("Lucid is not initialized");
        const api = await window.cardano.lace.enable();
        return api;
      },
    },
    {
      id: "atomic",
      name: "Atomic",
      logo: "/logo/atomic.png", // Using atomic.png for Gero as placeholder
      installUrl: "https://atomic.io/",
      connector: async () => {
        if (!lucid) throw new Error("Lucid is not initialized");
        const api = await window.cardano.atomic.enable();
        return api;
      },
    },
    {
      id: "daedalus",
      name: "Daedalus",
      logo: "/logo/daedalus.svg", // Using daedalus.svg for Typhon as placeholder
      installUrl: "https://daedalus.io/",
      connector: async () => {
        if (!lucid) throw new Error("Lucid is not initialized");
        const api = await window.cardano.daedalus.enable();
        return api;
      },
    },
    {
      id: "yoroi",
      name: "Yoroi",
      logo: "/logo/yoroi.png", // Using yoroi.png for Vespr as placeholder
      installUrl: "https://yoroi.xyz/",
      connector: async () => {
        if (!lucid) throw new Error("Lucid is not initialized");
        const api = await window.cardano.yoroi.enable();
        return api;
      },
    },
  ];

  // Check installed wallets
  useEffect(() => {
    if (typeof window !== "undefined") {
      const detected: Record<string, boolean> = {};
      walletOptions.forEach((wallet) => {
        detected[wallet.id] =
          window.cardano && window.cardano[wallet.id] !== undefined;
      });
      setInstalledWallets(detected);
    }
  }, [address]);

  // Fetch wallet balance when connected
  useEffect(() => {
    const fetchBalance = async () => {
      if (lucid && address) {
        try {
          const utxos = await lucid.utxosAt(address);
          const lovelaceAmount = utxos.reduce(
            (total, utxo) => total + BigInt(utxo.assets.lovelace || String(0)),
            BigInt(0)
          );
          // Convert lovelace to ADA (1 ADA = 1,000,000 lovelace)
          const adaAmount = Number(lovelaceAmount) / 1_000_000;
          setBalance(adaAmount.toFixed(2));
        } catch (error) {
          console.error("Failed to fetch balance:", error);
          setBalance("?");
        }
      }
    };

    if (address) {
      fetchBalance();
    }
  }, [lucid, address]);

  // Handle click outside wallet menu
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        walletMenuRef.current &&
        !walletMenuRef.current.contains(event.target as Node)
      ) {
        setIsWalletMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [walletMenuRef]);

  const handleConnectWallet = async (wallet: WalletOption) => {
    if (!termsAccepted) {
      alert("Please accept the Terms and Conditions before connecting");
      return;
    }

    if (!installedWallets[wallet.id]) {
      // Open the install URL in a new tab
      window.open(wallet.installUrl, "_blank");
      return;
    }

    try {
      if (!lucid) {
        throw new Error("Lucid is not initialized");
      }
      const api = await wallet.connector();

      // Use the connectWallet function from context
      await connectWallet(api);

      // Save the wallet name to session storage for reconnection
      sessionStorage.setItem("connectedWallet", wallet.id);

      // Close the modal after connection
      setIsOpen(false);
    } catch (error) {
      console.error(`Failed to connect to ${wallet.name}:`, error);
      alert(
        `Failed to connect to ${wallet.name}. Please make sure the wallet extension is installed and unlocked.`
      );
    }
  };

  // Show either connect or disconnect button based on connection status
  const shortenAddress = (addr: string | null) => {
    if (!addr) return "";
    return `${addr.slice(0, 6)}...${addr.slice(-6)}`;
  };

  const copyToClipboard = async () => {
    if (address) {
      try {
        await navigator.clipboard.writeText(address);
        setCopiedAddress(true);
        setTimeout(() => setCopiedAddress(false), 2000);
      } catch (err) {
        console.error("Failed to copy address:", err);
      }
    }
  };

  const viewOnExplorer = () => {
    if (address) {
      window.open(
        `https://preprod.cardanoscan.io/address/${address}`,
        "_blank"
      );
    }
  };

  const handleDisconnect = () => {
    disconnectWallet();
    setIsWalletMenuOpen(false);
  };

  return (
    <>
      {address ? (
        <div className="relative" ref={walletMenuRef}>
          <button
            onClick={() => setIsWalletMenuOpen(!isWalletMenuOpen)}
            className="flex items-center gap-2 bg-white border border-gray-300 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-2">
              <span className="text-[#FF00EF] font-bold">{balance} ₳</span>

              {/* Gạch dọc phân cách */}
              <div className="h-4 w-px bg-gray-300"></div>

              <span className="text-gray-600 text-sm">
                {shortenAddress(address)}
              </span>
            </div>

            <svg
              xmlns="http://www.w3.org/2000/svg"
              className={`h-4 w-4 text-gray-600 transition-transform ${
                isWalletMenuOpen ? "rotate-180" : ""
              }`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>

          {/* Wallet Menu Popup */}
          {isWalletMenuOpen && (
            <div className="absolute right-0 mt-2 w-60 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
              <div className="p-2">
                <button
                  onClick={copyToClipboard}
                  className="flex items-center w-full px-4 py-2 text-sm text-left hover:bg-gray-100 rounded-md"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4 mr-2"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                    />
                  </svg>
                  {copiedAddress ? "Address Copied!" : "Copy Address"}
                </button>
                <button
                  onClick={viewOnExplorer}
                  className="flex items-center w-full px-4 py-2 text-sm text-left hover:bg-gray-100 rounded-md"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4 mr-2"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                    />
                  </svg>
                  View on Explorer
                </button>
                <button
                  onClick={handleDisconnect}
                  className="flex items-center w-full px-4 py-2 text-sm text-left hover:bg-gray-100 rounded-md text-red-600"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4 mr-2"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                    />
                  </svg>
                  Disconnect
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <button
          onClick={() => setIsOpen(true)}
          className="bg-[#FF00EF] hover:bg-[#bf66b9] text-white px-6 py-3 rounded-lg transition-colors"
          disabled={!lucid}
        >
          {!lucid ? "Initializing..." : "Connect Wallet"}
        </button>
      )}

      {/* Wallet Selection Modal with Backdrop */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop with blur effect */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setIsOpen(false)}
          ></div>

          <div className="bg-white rounded-lg p-6 max-w-md w-full relative z-10">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-medium">Connect Wallet</h3>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>

            <div className="mb-4">
              <label className="flex items-start gap-2">
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={termsAccepted}
                  onChange={(e) => setTermsAccepted(e.target.checked)}
                />
                <div className="text-[10px] text-gray-600">
                  <span role="img" aria-label="pointer" className="mr-1">
                    👆
                  </span>
                  By checking this box and connecting my wallet, I confirm that
                  I have read, understood, and agree to the{" "}
                  <a href="#" className="text-blue-600 hover:underline">
                    Terms and Conditions
                  </a>
                  .
                </div>
              </label>
            </div>

            <div className="space-y-1 max-h-[350px] overflow-y-auto">
              {walletOptions.map((wallet) => (
                <button
                  key={wallet.id}
                  onClick={() => handleConnectWallet(wallet)}
                  className="flex items-center justify-between w-full p-3 border-b border-gray-200 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center">
                    <div className="flex-shrink-0 w-8 h-8 mr-3 relative">
                      <Image
                        src={wallet.logo}
                        alt={wallet.name}
                        width={32}
                        height={32}
                        style={{ objectFit: "contain" }}
                      />
                    </div>
                    <span>{wallet.name}</span>
                  </div>
                  <span className="text-sm text-gray-500">
                    {installedWallets[wallet.id]
                      ? "Installed"
                      : "Not installed"}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
