import WelcomeBanner from "../components/dashboard/WelcomeBanner";
import StatCards from "../components/dashboard/StatCards";
import CreditScoreOverview from "../components/dashboard/CreditScoreOverview";
import RecentInvoices from "../components/dashboard/RecentInvoices";
import FinanceRequests from "../components/dashboard/FinanceRequests";
import FundingSummary from "../components/dashboard/FundingSummary";
import RecentActivity from "../components/dashboard/RecentActivity";
import QuickActions from "../components/dashboard/QuickActions";

export default function Dashboard() {
  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">
      <WelcomeBanner />
      <StatCards />

      {/* Row: Credit Score / Recent Invoices / Finance Requests */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <CreditScoreOverview />
        <RecentInvoices />
        <FinanceRequests />
      </div>

      {/* Row: Funding Summary / Recent Activity / Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <FundingSummary />
        <RecentActivity />
        <QuickActions />
      </div>
    </div>
  );
}
