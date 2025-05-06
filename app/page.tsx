import Spline from "@splinetool/react-spline/next";
import Link from "next/link";

export default function Home() {
  return (
    <main className="relative mt-[-200px]">
      <div className="">
        {/* Left side content */}
        <div className="absolute top-0 left-0 w-full h-full flex flex-col justify-center items-start p-8 md:p-16 font-mono">
          <h1 className="text-4xl md:text-6xl font-bold text-black mb-6">
            Welcome to <span className="text-[#FF00EF]">MINTIX</span>
          </h1>
          <p className="text-xl text-gray-500 mb-12 max-w-md">
            Explore the possibilities of digital creation with Cardano NFTs.
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <Link
              href="/generate-image"
              className="px-8 py-3 bg-[#FF00EF] hover:bg-[#f483ee] text-white font-medium rounded-full transition-colors text-lg"
            >
              Generate Image
            </Link>
            <Link
              href="mint"
              className="px-8 py-3 bg-transparent hover:bg-gray-300 hover:text-gray-500 text-black border font-medium rounded-full transition-colors text-lg"
            >
              Mint NFT
            </Link>
          </div>
        </div>

        {/* Right side - Spline 3D animation */}
        <div className="">
          <Spline scene="https://prod.spline.design/dUwVNXi2LWj3kvQP/scene.splinecode" />
        </div>
      </div>
    </main>
  );
}
