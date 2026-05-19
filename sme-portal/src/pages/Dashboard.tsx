import { useEffect, useState } from "react";
import WelcomeBanner from "../components/dashboard/WelcomeBanner";
import StatCards from "../components/dashboard/StatCards";
import CreditScoreOverview from "../components/dashboard/CreditScoreOverview";
import RecentInvoices from "../components/dashboard/RecentInvoices";
import FinanceRequests from "../components/dashboard/FinanceRequests";
import FundingSummary from "../components/dashboard/FundingSummary";
import RecentActivity from "../components/dashboard/RecentActivity";
import QuickActions from "../components/dashboard/QuickActions";
import { DashboardResponse, SMEApi } from "../api/smeApi";

export default function Dashboard() {
  const [dashboard, setDashboard] = useState<DashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadDashboard = async () => {
      try {
        const response = await SMEApi.getDashboard();
        if (isMounted) {
          setDashboard(response.data);
          setError(null);
        }
      } catch (requestError) {
        if (isMounted) {
          setError("Unable to load your dashboard right now.");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadDashboard();

    return () => {
      isMounted = false;
    };
  }, []);

  if (loading) {
    return <div className="max-w-[1400px] mx-auto text-sm text-muted-foreground">Loading dashboard...</div>;
  }

  if (error || !dashboard) {
    return <div className="max-w-[1400px] mx-auto text-sm text-red-600">{error || "No dashboard data available."}</div>;
  }

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto px-6">
      <WelcomeBanner username={dashboard.username} smeName={dashboard.sme_name} industry={dashboard.industry} />
      <StatCards
        creditScore={dashboard.credit_score}
        invoiceCount={dashboard.invoice_count}
        outstandingBalance={dashboard.outstanding_balance}
        fundedAmount={dashboard.funded_amount}
        eligibleAmount={dashboard.eligible_amount}
      />

      {/* Row: Credit Score / Recent Invoices / Finance Requests */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <CreditScoreOverview score={dashboard.credit_score} />
        <RecentInvoices invoices={dashboard.recent_invoices} />
        <FinanceRequests requests={dashboard.recent_finance_requests} />
      </div>

      {/* Row: Funding Summary / Recent Activity / Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <FundingSummary
          requestedAmount={dashboard.requested_amount}
          approvedAmount={dashboard.approved_amount}
          fundedAmount={dashboard.funded_amount}
        />
        <RecentActivity activities={dashboard.recent_activity} />
        <QuickActions />
      </div>
    </div>
  );
}
