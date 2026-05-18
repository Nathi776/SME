import React from "react";
import { Wallet } from "lucide-react";

export default function LenderWelcomeBanner() {
  const firstName = "Lerato";

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Welcome back, {firstName}! 👋</h2>
        <p className="text-sm text-gray-500 mt-1">Here's what's happening with your lending portfolio today.</p>
      </div>
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="text-sm">
          <p className="text-gray-400 text-xs">Lender Name</p>
          <p className="font-semibold text-gray-900">Mokoena Capital Partners</p>
        </div>
        <div className="text-sm">
          <p className="text-gray-400 text-xs">Lender ID</p>
          <p className="font-semibold text-gray-900">LND-2024-00056</p>
        </div>
        <div className="text-sm">
          <p className="text-gray-400 text-xs">Available Balance</p>
          <p className="font-semibold text-gray-900">R1,250,000.00</p>
        </div>
        <button
          type="button"
          className="inline-flex items-center bg-[#4F46E5] hover:bg-[#4338CA] text-white text-xs font-semibold px-4 py-2 rounded-md gap-2 transition-colors"
        >
          <Wallet className="w-4 h-4" />
          Fund Your Account
        </button>
      </div>
    </div>
  );
}
