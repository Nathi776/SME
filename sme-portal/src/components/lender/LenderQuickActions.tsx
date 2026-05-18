import React from "react";

export default function LenderQuickActions() {
  return (
    <div className="bg-white rounded-lg border border-gray-100 p-4">
      <h3 className="text-sm font-semibold text-gray-900">Quick Actions</h3>
      <div className="mt-3 flex flex-col sm:flex-row gap-2">
        <button className="px-3 py-2 bg-indigo-600 text-white rounded text-sm">Create Offer</button>
        <button className="px-3 py-2 bg-gray-100 text-gray-800 rounded text-sm">Export Portfolio</button>
        <button className="px-3 py-2 bg-gray-100 text-gray-800 rounded text-sm">Review Pending</button>
      </div>
    </div>
  );
}
