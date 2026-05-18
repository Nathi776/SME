import React from "react";

export default function PortfolioSummary() {
  return (
    <div className="bg-white rounded-lg border border-gray-100 p-4">
      <h3 className="text-sm font-semibold text-gray-900">Portfolio Summary</h3>
      <div className="mt-3">
        <p className="text-sm text-gray-500">Total Loans: <span className="font-semibold text-gray-900">1,254</span></p>
        <p className="text-sm text-gray-500">Outstanding Balance: <span className="font-semibold text-gray-900">R9,800,000</span></p>
        <p className="text-sm text-gray-500">Weighted Avg Yield: <span className="font-semibold text-gray-900">6.9%</span></p>
      </div>
    </div>
  );
}
