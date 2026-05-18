import { Upload, CreditCard, Users, FolderOpen } from "lucide-react";
import { Link } from "react-router-dom";

const actions = [
  { icon: Upload, label: "Upload Invoice", desc: "Add a new invoice", path: "/invoices", color: "bg-blue-50 text-blue-600 hover:bg-blue-100" },
  { icon: CreditCard, label: "Request Finance", desc: "Get paid early", path: "/finance-requests", color: "bg-green-50 text-green-600 hover:bg-green-100" },
  { icon: Users, label: "View Customers", desc: "Manage your customers", path: "/customers", color: "bg-purple-50 text-purple-600 hover:bg-purple-100" },
  { icon: FolderOpen, label: "Documents", desc: "Manage business docs", path: "/documents", color: "bg-orange-50 text-orange-600 hover:bg-orange-100" },
];

export default function QuickActions() {
  return (
    <div className="bg-card rounded-xl border border-border p-5">
      <h3 className="font-semibold text-foreground text-sm mb-4">Quick Actions</h3>
      <div className="grid grid-cols-2 gap-3">
        {actions.map((a, i) => (
          <Link
            key={i}
            to={a.path}
            className={`flex flex-col items-center justify-center p-4 rounded-xl border border-border transition-colors text-center ${a.color}`}
          >
            <a.icon className="w-6 h-6 mb-2" />
            <p className="text-xs font-semibold">{a.label}</p>
            <p className="text-[10px] opacity-70 mt-0.5">{a.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
