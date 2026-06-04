import React, { useEffect, useState } from "react";
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
  const avgRequest = pendingRequests.length > 0 ? totalRequested / pendingRequests.length : 0;
  const highRiskCount = availableSmes.filter((sme) => sme.risk_level === "High").length;
  const stats = [
    { label: "Pending Requests", value: String(pendingRequests.length) },
    { label: "Requested Exposure", value: formatZAR(totalRequested) },
    { label: "Average Request", value: formatZAR(avgRequest) },
    { label: "High Risk SMEs", value: String(highRiskCount) },
  ];

  const smesById = availableSmes.reduce<Record<number, AvailableSme>>((accumulator, sme) => {
    accumulator[sme.sme_id] = sme;
    return accumulator;
  }, {});

  return (
    <LenderLayout>
      <div className="space-y-4">
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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 space-y-4">
            <PendingFinancingRequests requests={pendingRequests} smeById={smesById} />
            <RecentlyFundedDeals smes={availableSmes} />
          </div>
          <div className="space-y-4">
            <LenderQuickActions />
            <PortfolioSummary profile={profile} pendingRequests={pendingRequests} />
            <RiskDistribution smes={availableSmes} />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <RecentRepayments requests={pendingRequests} />
          <div className="bg-white rounded-lg border border-gray-100 p-4">Other Insights</div>
        </div>
      </div>
    </LenderLayout>
  );
}
