import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

import Header from "../components/Header";
import { LucidProvider } from "@/context/LucidProvider";
import { Toaster } from "react-hot-toast";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Mintix",
  description: "Mintix is a decentralized NFT marketplace",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="mdl-js">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <LucidProvider>
          <div className="container mx-auto px-4 fixed top-0 left-0 right-0 z-50">
            <Header />
          </div>
          <main className="container mx-auto px-4 py-8">{children}</main>
          <Toaster position="bottom-right" />
        </LucidProvider>
      </body>
    </html>
  );
}
