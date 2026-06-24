import { BadgeDollarSign, ClipboardList, FileText, ReceiptText, WalletCards } from "lucide-react";
import { formatZAR } from "../../utils/format";

type StatCardsProps = {
  creditScore: number | string | null;
  invoiceCount: number;
  unpaidInvoiceCount: number;
  outstandingBalance: number | string;
  fundedAmount: number | string;
  eligibleAmount: number | string;
  financeRequestCount: number;
};

export default function StatCards({
  creditScore,
  invoiceCount,
  unpaidInvoiceCount,
  outstandingBalance,
  fundedAmount,
  eligibleAmount,
  financeRequestCount,
}: StatCardsProps) {
  const money = (value: number | string) => formatZAR(value);
  const ob = Number(outstandingBalance || 0);
  const ea = Number(eligibleAmount || 0);
  const eligiblePercent = ob > 0 ? Math.round((ea / ob) * 100) : 80;
  const stats = [
    {
      icon: ClipboardList,
      iconBg: "bg-[#eff3ff]",
      iconColor: "text-[#546bff]",
      label: "Credit Score",
      value: creditScore === null ? "-" : String(creditScore),
      suffix: creditScore === null ? "" : "/100",
      sub: creditScore === null ? "No score yet" : creditScore >= 60 ? "Good Standing" : "Needs Attention",
      subColor: creditScore === null ? "text-[#6d7b99]" : creditScore >= 60 ? "text-[#009a65]" : "text-[#d97706]",
    },
    {
      icon: ReceiptText,
      iconBg: "bg-[#f2fff5]",
      iconColor: "text-[#18a957]",
      label: "Total Invoices",
      value: String(invoiceCount),
      sub: money(outstandingBalance),
    },
    {
      icon: FileText,
      iconBg: "bg-[#fff4e6]",
      iconColor: "text-[#f07822]",
      label: "Unpaid Invoices",
      value: String(unpaidInvoiceCount),
      sub: money(outstandingBalance),
    },
    {
      icon: BadgeDollarSign,
      iconBg: "bg-[#f3e8ff]",
      iconColor: "text-[#8b5cf6]",
      label: "Financed Amount",
      value: money(fundedAmount),
      sub: `Across ${financeRequestCount || 0} requests`,
    },
    {
      icon: WalletCards,
      iconBg: "bg-[#eff6ff]",
      iconColor: "text-[#346bff]",
      label: "Available to Finance",
      value: money(eligibleAmount),
      sub: `${eligiblePercent}% of eligible invoices`,
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
      {stats.map((s, i) => (
        <div
          key={s.label}
          className="flex min-h-[146px] flex-col justify-between rounded-lg border border-[#e9eef8] bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
        >
          <div className="flex items-start gap-4">
            <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${s.iconBg}`}>
              <s.icon className={`h-6 w-6 ${s.iconColor}`} />
            </div>
            <div className="min-w-0">
              <p className="text-[15px] font-semibold text-[#071942]">{s.label}</p>
            </div>
          </div>
          <div className="mt-4">
            <p className="text-[28px] font-semibold leading-tight text-[#071942]">
              {s.value}
              {s.suffix && <span className="text-base font-medium text-[#31456f]">{s.suffix}</span>}
            </p>
            <p className={`mt-2 flex items-center gap-2 text-sm ${s.subColor || "text-[#31456f]"}`}>
              {i === 0 && creditScore !== null && <span className="h-2 w-2 rounded-full bg-[#58d67b]" />}
              {s.sub}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
