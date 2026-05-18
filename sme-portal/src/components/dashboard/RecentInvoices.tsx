import { Link } from "react-router-dom";

const invoices = [
  { id: "INV-2024-024", company: "ABC Construction (Pty) Ltd", amount: "R68,500.00", status: "Unpaid", date: "Due: 25 May 2024" },
  { id: "INV-2024-023", company: "City Power Solutions", amount: "R42,000.00", status: "Paid", date: "Paid: 10 May 2024" },
  { id: "INV-2024-022", company: "Metro Hardware", amount: "R36,750.00", status: "Unpaid", date: "Due: 01 Jun 2024" },
  { id: "INV-2024-021", company: "Beta Projects", amount: "R55,300.00", status: "Paid", date: "Paid: 05 May 2024" },
];

const statusStyles: Record<(typeof invoices)[number]["status"], string> = {
  Paid: "bg-green-100 text-green-700 border-green-200",
  Unpaid: "bg-orange-100 text-orange-700 border-orange-200",
};

export default function RecentInvoices() {
  return (
    <div className="bg-card rounded-xl border border-border p-5 flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-foreground text-sm">Recent Invoices</h3>
        <Link to="/invoices" className="text-xs text-blue-600 hover:underline font-medium">View all</Link>
      </div>
      <div className="space-y-3 flex-1">
        {invoices.map((inv) => (
          <div key={inv.id} className="flex items-start justify-between py-2 border-b border-border last:border-0">
            <div>
              <p className="text-sm font-semibold text-foreground">{inv.id}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{inv.company}</p>
            </div>
            <div className="text-right">
              <div className="flex items-center gap-2 justify-end">
                <p className="text-sm font-semibold text-foreground">{inv.amount}</p>
                <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-medium ${statusStyles[inv.status]}`}>
                  {inv.status}
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground mt-0.5">{inv.date}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
