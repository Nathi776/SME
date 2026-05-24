import { BadgeDollarSign, FolderOpen, UploadCloud, Users } from "lucide-react";
import { Link } from "react-router-dom";

const actions = [
  { icon: UploadCloud, label: "Upload Invoice", desc: "Add a new invoice", path: "/invoices", color: "text-[#315cff]" },
  { icon: BadgeDollarSign, label: "Request Finance", desc: "Get paid early", path: "/finance-requests", color: "text-[#7c3cff]" },
  { icon: Users, label: "View Customers", desc: "Manage your customers", path: "/customers", color: "text-[#315cff]" },
  { icon: FolderOpen, label: "Documents", desc: "Manage business docs", path: "/documents", color: "text-[#7c3cff]" },
];

export default function QuickActions() {
  return (
    <div className="min-h-[300px] rounded-lg border border-[#dfe7f4] bg-white px-7 py-5 shadow-[0_10px_30px_rgba(9,30,66,0.04)] xl:col-span-4">
      <h3 className="mb-6 text-base font-bold text-[#071942]">Quick Actions</h3>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {actions.map((action) => (
          <Link
            key={action.label}
            to={action.path}
            className="flex min-h-[82px] items-center gap-5 rounded-md border border-[#d8e2f3] bg-[#f8faff] px-5 py-4 text-left transition hover:border-[#a9bcf5] hover:bg-white hover:shadow-[0_8px_20px_rgba(49,92,255,0.08)]"
          >
            <action.icon className={`h-8 w-8 shrink-0 ${action.color}`} />
            <div className="min-w-0">
              <p className="text-sm font-bold text-[#071942]">{action.label}</p>
              <p className="mt-1 text-xs text-[#31456f]">{action.desc}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
