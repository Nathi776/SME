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
  const money = (value: number | string) => formatZAR(value).replace(/\s/g, "");
  const ob = Number(outstandingBalance || 0);
  const ea = Number(eligibleAmount || 0);
  const eligiblePercent = ob > 0 ? Math.round((ea / ob) * 100) : 80;
  const stats = [
    {
      icon: ClipboardList,
      iconBg: "bg-gradient-to-br from-[#eff3ff] to-[#eef7ff] text-[#546bff]",
      label: "Credit Score",
      value: creditScore === null ? "-" : String(creditScore),
      suffix: creditScore === null ? "" : "/100",
      sub: creditScore === null ? "No score yet" : creditScore >= 60 ? "Good Standing" : "Needs Attention",
      subColor: creditScore === null ? "text-[#6d7b99]" : creditScore >= 60 ? "text-[#009a65]" : "text-[#d97706]",
    },
    {
      icon: ReceiptText,
      iconBg: "bg-gradient-to-br from-[#f2fff5] to-[#f4fffb] text-[#18a957]",
      label: "Total Invoices",
      value: String(invoiceCount),
      sub: money(outstandingBalance),
    },
    {
      icon: FileText,
      iconBg: "bg-[#f59e0b]/16 text-[#f07822]",
      label: "Unpaid Invoices",
      value: String(unpaidInvoiceCount),
      sub: money(outstandingBalance),
    },
    {
      icon: BadgeDollarSign,
      iconBg: "bg-[#8b5cf6]/18 text-[#8b5cf6]",
      label: "Financed Amount",
      value: money(fundedAmount),
      sub: `Across ${financeRequestCount || 0} requests`,
    },
    {
      icon: WalletCards,
      iconBg: "bg-[#6b9cff]/18 text-[#346bff]",
      label: "Available to Finance",
      value: money(eligibleAmount),
      sub: `${eligiblePercent}% of eligible invoices`,
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
      {stats.map((s, i) => (
        <div
          key={s.label}
          className="flex min-h-[152px] items-start gap-5 rounded-lg border border-[#eef4ff] bg-white px-6 py-6 shadow-sm transition-shadow hover:shadow-md"
        >
          <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${s.iconBg}`}>
            <s.icon className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-[#071942]">{s.label}</p>
            <p className="mt-4 text-3xl font-bold leading-tight text-[#071942]">
              {s.value}
              {s.suffix && <span className="text-base font-medium text-[#31456f]">{s.suffix}</span>}
            </p>
            <p className={`mt-4 text-sm ${s.subColor || "text-[#31456f]"}`}>
              {i === 0 && <span className="mr-2 inline-block h-2 w-2 rounded-full bg-[#58d67b]" />}
              {s.sub}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
