import React from "react";
import { Landmark } from "lucide-react";
import type { LenderProfile } from "../../api/lenderApi";
import { formatZAR } from "../../utils/format";

type Props = {
  profile?: LenderProfile | null;
  pendingCount: number;
  totalRequested: number;
  availableSmesCount: number;
};

export default function LenderWelcomeBanner({ profile }: Props) {
  const displayName = sessionStorage.getItem("username")?.split(" ")[0] || "there";
  const lenderName = profile?.organization_name || "Not available";
  const lendingLimit = Number(profile?.max_lending_amount || 0);

  return (
    <div className="flex flex-col justify-between gap-6 rounded-lg border border-[#dfe7f4] bg-white p-6 shadow-sm xl:flex-row xl:items-center">
      <div>
        <h1 className="text-xl font-bold text-[#071942]">
          Welcome back, {displayName}! <span aria-hidden="true">{"\u{1F44B}"}</span>
        </h1>
        <p className="mt-2 text-sm text-[#31456f]">Here's what's happening with your lending portfolio today.</p>
      </div>

      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-[220px_180px_210px_auto] xl:items-center">
        <div className="border-[#e5ecf7] xl:border-l xl:pl-7">
          <p className="text-xs font-medium text-[#31456f]">Lender Name</p>
          <p className="mt-2 text-sm font-semibold text-[#071942]">{lenderName}</p>
        </div>
        <div className="border-[#e5ecf7] xl:border-l xl:pl-7">
          <p className="text-xs font-medium text-[#31456f]">Lender ID</p>
          <p className="mt-2 text-sm font-semibold text-[#071942]">{profile?.id ? `LND-2024-${String(profile.id).padStart(5, "0")}` : "Not available"}</p>
        </div>
        <div className="border-[#e5ecf7] xl:border-l xl:pl-7">
          <p className="text-xs font-medium text-[#31456f]">Available Balance</p>
          <p className="mt-2 text-sm font-semibold text-[#071942]">{formatZAR(lendingLimit).replace(/\s/g, "")}</p>
        </div>
        <button
          type="button"
          className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-[#4f63f6] px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#3851e8]"
        >
          <Landmark className="h-4 w-4" />
          Fund Your Account
        </button>
      </div>
    </div>
  );
}
