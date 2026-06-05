import React, { useEffect, useState } from "react";
import { BadgePercent, CalendarCheck, Coins, HandCoins, WalletCards } from "lucide-react";
import LenderLayout from "../components/lender/LenderLayout";
import LenderWelcomeBanner from "../components/lender/LenderWelcomeBanner";
import LenderStatCards from "../components/lender/LenderStatCards";
import PendingFinancingRequests from "../components/lender/PendingFinancingRequests";
import RecentlyFundedDeals from "../components/lender/RecentlyFundedDeals";
import RecentRepayments from "../components/lender/RecentRepayments";
import PortfolioSummary from "../components/lender/PortfolioSummary";
import RiskDistribution from "../components/lender/RiskDistribution";
import LenderQuickActions from "../components/lender/LenderQuickActions";
import { LenderApi } from "../api/lenderApi";
import type { AvailableSme, FinanceRequest, LenderProfile } from "../api/lenderApi";
import { formatZAR } from "../utils/format";

export default function LenderDashboardPage() {
  const [profile, setProfile] = useState<LenderProfile | null>(null);
  const [pendingRequests, setPendingRequests] = useState<FinanceRequest[]>([]);
  const [availableSmes, setAvailableSmes] = useState<AvailableSme[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadDashboard = async () => {
      try {
        const [profileResponse, requestsResponse, smesResponse] = await Promise.all([
          LenderApi.getProfile(),
          LenderApi.getPendingRequests(),
          LenderApi.getAvailableSMEs(),
        ]);

        if (!isMounted) {
          return;
        }

        setProfile(profileResponse.data);
        setPendingRequests(requestsResponse.data ?? []);
        setAvailableSmes(smesResponse.data ?? []);
        setError(null);
      } catch (requestError) {
        if (!isMounted) {
          return;
        }

        setError(requestError instanceof Error ? requestError.message : "Failed to load lender dashboard");
      }
    };

    void loadDashboard();

    return () => {
      isMounted = false;
    };
  }, []);

  const totalRequested = pendingRequests.reduce((sum, request) => sum + Number(request.amount_requested || 0), 0);
  const lendingLimit = Number(profile?.max_lending_amount || 0);
  const availableBalance = Math.max(lendingLimit - totalRequested, 0);
  const stats = [
    {
      label: "Lending Limit",
      value: formatZAR(lendingLimit).replace(/\s/g, ""),
      sub: "Configured profile limit",
      icon: WalletCards,
      color: "text-[#315cff]",
      bg: "bg-[#dfe9ff]",
    },
    {
      label: "Pending Exposure",
      value: formatZAR(totalRequested).replace(/\s/g, ""),
      sub: `${pendingRequests.length} pending request${pendingRequests.length === 1 ? "" : "s"}`,
      icon: HandCoins,
      color: "text-[#16a35d]",
      bg: "bg-[#d9f7e6]",
    },
    {
      label: "Available Balance",
      value: formatZAR(availableBalance).replace(/\s/g, ""),
      sub: "Limit minus pending exposure",
      icon: Coins,
      color: "text-[#ff7a00]",
      bg: "bg-[#ffe9c7]",
    },
    {
      label: "Available SMEs",
      value: String(availableSmes.length),
      sub: "Returned for this lender",
      icon: CalendarCheck,
      color: "text-[#7c3cff]",
      bg: "bg-[#eadcff]",
    },
    {
      label: "Min. Credit Score",
      value: profile?.min_credit_score == null ? "-" : String(profile.min_credit_score),
      sub: "Configured lending rule",
      icon: BadgePercent,
      color: "text-[#315cff]",
      bg: "bg-[#dfe9ff]",
    },
  ];

  const smesById = availableSmes.reduce<Record<number, AvailableSme>>((accumulator, sme) => {
    accumulator[sme.sme_id] = sme;
    return accumulator;
  }, {});

  return (
    <LenderLayout>
      <div className="mx-auto max-w-[1540px] space-y-4 text-[#071942]">
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <LenderWelcomeBanner
          profile={profile}
          pendingCount={pendingRequests.length}
          totalRequested={totalRequested}
          availableSmesCount={availableSmes.length}
        />
        <LenderStatCards stats={stats} />

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.6fr_1fr]">
          <div className="space-y-4">
            <PendingFinancingRequests requests={pendingRequests} smeById={smesById} />
          </div>
          <div className="space-y-4">
            <PortfolioSummary profile={profile} pendingRequests={pendingRequests} />
            <RiskDistribution smes={availableSmes} />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_1fr_1.3fr]">
          <RecentlyFundedDeals smes={availableSmes} />
          <RecentRepayments requests={pendingRequests} />
          <LenderQuickActions />
        </div>
      </div>
    </LenderLayout>
  );
}
