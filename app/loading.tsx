export default function Loading() {
  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center bg-white z-50">
      <div className="relative">
        <div className="h-24 w-24 rounded-full border-t-4 border-b-4 border-[#FF00EF] animate-spin"></div>
        <div className="absolute top-0 left-0 h-24 w-24 rounded-full border-r-4 border-l-4 border-purple-300 animate-ping opacity-75"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-[#FF00EF] font-bold text-xl">
          Mintix
        </div>
      </div>
      <p className="mt-4 text-gray-600 text-lg">Loading...</p>
    </div>
  );
}
