"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import {
  Address,
  Blockfrost,
  Cardano,
  Datum,
  Lucid,
  UTxO,
  WalletApi,
} from "lucid-cardano";

// Add type declaration for the global window.cardano object
declare global {
  interface Window {
    cardano: {
      [key: string]: Cardano;
    };
  }
}

interface LucidContextType {
  address: Address | null;
  lucid: Lucid | null;
  walletApi: WalletApi | null;
  connectWallet: (api: WalletApi) => Promise<void>;
  disconnectWallet: () => void;
  getUTxOs: (address: string) => Promise<UTxO[]>;
  getDatum: (datumHash: string) => Promise<Datum>;
}

const LucidContext = createContext<LucidContextType | undefined>(undefined);

export function LucidProvider({ children }: { children: ReactNode }) {
  const [address, setAddress] = useState<Address | null>(null);
  const [lucid, setLucid] = useState<Lucid | null>(null);
  const [walletApi, setWalletApi] = useState<WalletApi | null>(null);

  useEffect(() => {
    const initLucid = async () => {
      try {
        const lucidInstance = await Lucid.new(
          new Blockfrost(
            "https://cardano-preprod.blockfrost.io/api/v0",
            "preproduQs0kci5QeXLxPc6fVvzsiqOAr5Y6Osg"
          ),
          "Preprod"
        );
        setLucid(lucidInstance);
      } catch (error) {
        console.error("Failed to initialize Lucid:", error);
      }
    };
    initLucid();
  }, []);

  // Check if wallet was previously connected
  useEffect(() => {
    const checkConnection = async () => {
      if (lucid && typeof window !== "undefined") {
        const walletName = sessionStorage.getItem("connectedWallet");
        if (walletName) {
          try {
            // Try to reconnect
            const cardano = window.cardano;
            if (cardano && cardano[walletName]) {
              const api = await cardano[walletName].enable();
              connectWallet(api);
              sessionStorage.setItem("connectedWallet", walletName);
            }
          } catch (error) {
            console.error("Failed to reconnect wallet:", error);
            sessionStorage.removeItem("connectedWallet");
          }
        }
      }
    };

    checkConnection();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lucid]);

  const connectWallet = async (api: WalletApi) => {
    if (!lucid) {
      throw new Error("Lucid is not initialized");
    }

    lucid.selectWallet(api);
    setWalletApi(api);

    const walletAddress = await lucid.wallet.address();
    setAddress(walletAddress);
  };

  const disconnectWallet = () => {
    setAddress(null);
    setWalletApi(null);

    if (typeof window !== "undefined") {
      sessionStorage.removeItem("connectedWallet");
    }

    // Create a new Lucid instance without wallet connection
    const initLucid = async () => {
      try {
        const lucidInstance = await Lucid.new(
          new Blockfrost(
            "https://cardano-preprod.blockfrost.io/api/v0",
            "preprodE4Ulx8IH7MBAUFuJnkve21khk7LUC5Uo"
          ),
          "Preprod"
        );
        setLucid(lucidInstance);
      } catch (error) {
        console.error("Failed to reinitialize Lucid:", error);
      }
    };
    initLucid();
  };

  const getUTxOs = async (address: string) => {
    if (!lucid) {
      throw new Error("Lucid is not initialized");
    }

    return await lucid.utxosAt(address);
  };

  const getDatum = async (datumHash: string) => {
    if (!lucid) {
      throw new Error("Lucid is not initialized");
    }
    return await lucid.provider.getDatum(datumHash);
  };

  return (
    <LucidContext.Provider
      value={{
        lucid,
        address,
        walletApi,
        connectWallet,
        disconnectWallet,
        getUTxOs,
        getDatum,
      }}
    >
      {children}
    </LucidContext.Provider>
  );
}

export function useLucid() {
  const context = useContext(LucidContext);
  if (context === undefined) {
    throw new Error("useLucid must be used within a LucidProvider");
  }
  return context;
}
