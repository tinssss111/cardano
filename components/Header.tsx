/* eslint-disable @next/next/no-img-element */
"use client";

import React from "react";
import WalletConnector from "./WalletConnector";
import Link from "next/link";
import { useLucid } from "../context/LucidProvider";
import { usePathname } from "next/navigation"; // <- Thêm dòng này

const Header: React.FC = () => {
  const { address } = useLucid();
  const pathname = usePathname(); // <- Dùng để biết trang hiện tại

  return (
    <header className="flex justify-between items-center p-2 bg-white font-mono text-[15px]">
      <div className="flex items-center gap-2">
        <Link href="/">
          <img src="/logo/logo.png" alt="Mintix" className="w-12 h-12" />
        </Link>
        <div className="text-xl font-bold">mintix</div>
      </div>

      <div className="flex space-x-8 items-center">
        <nav className="hidden md:flex space-x-8">
          <Link
            href="/"
            className={`font-medium hover:text-gray-900 ${
              pathname === "/" ? "text-pink-500" : "text-gray-600"
            }`}
          >
            Home
          </Link>
          <Link
            href="/marketplace"
            className={`font-medium hover:text-gray-900 ${
              pathname === "/marketplace" ? "text-pink-500" : "text-gray-600"
            }`}
          >
            Marketplace
          </Link>
          {address && (
            <Link
              href="/profile"
              className={`font-medium hover:text-gray-900 ${
                pathname === "/profile" ? "text-pink-500" : "text-gray-600"
              }`}
            >
              My Profile
            </Link>
          )}
        </nav>

        <div className="flex items-center gap-4">
          <WalletConnector />
        </div>
      </div>
    </header>
  );
};

export default Header;
