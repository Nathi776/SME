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
          const d = response.data;
          // Coerce numeric-like fields to numbers for the UI components
          const coerced = {
            ...d,
            revenue: Number(d.revenue),
            outstanding_balance: Number(d.outstanding_balance),
            funded_amount: Number(d.funded_amount),
            eligible_amount: Number(d.eligible_amount),
            requested_amount: Number(d.requested_amount),
            approved_amount: Number(d.approved_amount),
            recent_invoices: (d.recent_invoices || []).map((inv: any) => ({ ...inv, amount: Number(inv.amount) })),
            recent_finance_requests: (d.recent_finance_requests || []).map((r: any) => ({
              ...r,
              amount_requested: Number(r.amount_requested),
              approved_amount: r.approved_amount == null ? null : Number(r.approved_amount),
            })),
          } as DashboardResponse;

          setDashboard(coerced);
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
    return <div className="text-sm text-muted-foreground">Loading dashboard...</div>;
  }

  if (error || !dashboard) {
    return <div className="text-sm text-red-600">{error || "No dashboard data available."}</div>;
  }

  return (
    <div className="space-y-4 pb-6 text-[#071942]">
      <WelcomeBanner username={dashboard.username} smeName={dashboard.sme_name} smeId={String(dashboard.sme_id)} />
      <StatCards
        creditScore={dashboard.credit_score}
        invoiceCount={dashboard.invoice_count}
        unpaidInvoiceCount={dashboard.recent_invoices.filter((invoice) => invoice.status?.toLowerCase() !== "paid").length}
        outstandingBalance={dashboard.outstanding_balance}
        fundedAmount={dashboard.funded_amount}
        eligibleAmount={dashboard.eligible_amount}
        financeRequestCount={dashboard.finance_requests}
      />
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <CreditScoreOverview score={dashboard.credit_score} />
        <RecentInvoices invoices={dashboard.recent_invoices} />
        <FinanceRequests requests={dashboard.recent_finance_requests} />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
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
