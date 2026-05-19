import { Star, FileText, AlertCircle, CreditCard, Wallet } from "lucide-react";
import { formatZAR } from "../../utils/format";

type StatCardsProps = {
  creditScore: number | null;
  invoiceCount: number;
  outstandingBalance: number;
  fundedAmount: number;
  eligibleAmount: number;
};

export default function StatCards({
  creditScore,
  invoiceCount,
  outstandingBalance,
  fundedAmount,
  eligibleAmount,
}: StatCardsProps) {
  const stats = [
    {
      icon: Star,
      iconBg: "bg-blue-100 text-blue-600",
      label: "Credit Score",
      value: creditScore === null ? "-" : String(creditScore),
      suffix: creditScore === null ? "" : "/100",
      sub: creditScore === null ? "No score yet" : creditScore >= 60 ? "Good Standing" : "Needs Attention",
      subColor: creditScore === null ? "text-muted-foreground" : creditScore >= 60 ? "text-green-600" : "text-orange-600",
    },
    {
      icon: FileText,
      iconBg: "bg-green-100 text-green-600",
      label: "Total Invoices",
      value: String(invoiceCount),
      sub: formatZAR(outstandingBalance),
    },
    {
      icon: AlertCircle,
      iconBg: "bg-orange-100 text-orange-500",
      label: "Outstanding Balance",
      value: formatZAR(outstandingBalance),
      sub: "Current unpaid invoices",
    },
    {
      icon: CreditCard,
      iconBg: "bg-purple-100 text-purple-600",
      label: "Financed Amount",
      value: formatZAR(fundedAmount),
      sub: "Approved finance total",
    },
    {
      icon: Wallet,
      iconBg: "bg-emerald-100 text-emerald-600",
      label: "Available to Finance",
      value: formatZAR(eligibleAmount),
      sub: "Based on current credit score",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
      {stats.map((s, i) => (
        <div
          key={i}
          className="bg-white border border-gray-100 rounded-lg shadow-sm p-4 flex items-start gap-3 hover:shadow-md transition-shadow"
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
