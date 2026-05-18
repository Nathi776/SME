import React from "react";
import LenderLayout from "../components/lender/LenderLayout";
import LenderWelcomeBanner from "../components/lender/LenderWelcomeBanner";
import LenderStatCards from "../components/lender/LenderStatCards";
import PendingFinancingRequests from "../components/lender/PendingFinancingRequests";
import RecentlyFundedDeals from "../components/lender/RecentlyFundedDeals";
import RecentRepayments from "../components/lender/RecentRepayments";
import PortfolioSummary from "../components/lender/PortfolioSummary";
import RiskDistribution from "../components/lender/RiskDistribution";
import LenderQuickActions from "../components/lender/LenderQuickActions";

export default function LenderDashboardPage() {
  return (
    <LenderLayout>
      <div className="space-y-4">
        <LenderWelcomeBanner />
        <LenderStatCards />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 space-y-4">
            <PendingFinancingRequests />
            <RecentlyFundedDeals />
          </div>
          <div className="space-y-4">
            <LenderQuickActions />
            <PortfolioSummary />
            <RiskDistribution />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <RecentRepayments />
          <div className="bg-white rounded-lg border border-gray-100 p-4">Other Insights</div>
        </div>
      </div>
    </LenderLayout>
  );
}
