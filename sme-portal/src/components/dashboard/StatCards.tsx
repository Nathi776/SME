import { Star, FileText, AlertCircle, CreditCard, Wallet } from "lucide-react";

const stats = [
  {
    icon: Star,
    iconBg: "bg-blue-100 text-blue-600",
    label: "Credit Score",
    value: "78",
    suffix: "/100",
    sub: "Good Standing",
    subColor: "text-green-600",
  },
  {
    icon: FileText,
    iconBg: "bg-green-100 text-green-600",
    label: "Total Invoices",
    value: "24",
    sub: "R512,450.00",
  },
  {
    icon: AlertCircle,
    iconBg: "bg-orange-100 text-orange-500",
    label: "Unpaid Invoices",
    value: "8",
    sub: "R212,350.00",
  },
  {
    icon: CreditCard,
    iconBg: "bg-purple-100 text-purple-600",
    label: "Financed Amount",
    value: "R150,000.00",
    sub: "Across 3 requests",
  },
  {
    icon: Wallet,
    iconBg: "bg-emerald-100 text-emerald-600",
    label: "Available to Finance",
    value: "R169,880.00",
    sub: "80% of eligible invoices",
  },
];

export default function StatCards() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
      {stats.map((s, i) => (
        <div
          key={i}
          className="bg-card rounded-xl border border-border p-4 flex items-start gap-3 hover:shadow-md transition-shadow"
        >
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${s.iconBg}`}>
            <s.icon className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground font-medium">{s.label}</p>
            <p className="text-xl font-bold text-foreground leading-tight mt-0.5">
              {s.value}
              {s.suffix && <span className="text-sm font-normal text-muted-foreground">{s.suffix}</span>}
            </p>
            <p className={`text-xs mt-0.5 ${s.subColor || "text-muted-foreground"}`}>
              {s.sub}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
