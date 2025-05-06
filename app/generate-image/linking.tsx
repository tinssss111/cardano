import React from "react";
import Link from "next/link";

export const GenerateImageButton: React.FC = () => {
  return (
    <Link href="/generate-image">
      <div className="flex items-center gap-2 p-3 rounded-lg hover:bg-gray-100 transition-colors">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-6 w-6 text-[#FF00EF]"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
        <span className="font-medium">Generate AI Image</span>
      </div>
    </Link>
  );
};
