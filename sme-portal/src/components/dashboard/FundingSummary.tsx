import { ChevronDown } from "lucide-react";
import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts";
import { formatZAR } from "../../utils/format";

type FundingSummaryProps = {
  requestedAmount: number | string;
  approvedAmount: number | string;
  fundedAmount: number | string;
};

const money = (value: number | string) => formatZAR(value);

export default function FundingSummary({ requestedAmount, approvedAmount, fundedAmount }: FundingSummaryProps) {
  const data = [
    { name: "Total Requested", value: requestedAmount, color: "#315cff" },
    { name: "Total Approved", value: approvedAmount, color: "#22c55e" },
    { name: "Total Funded", value: fundedAmount, color: "#7c3cff" },
  ];

  return (
    <div className="flex min-h-[380px] flex-col rounded-lg border border-[#e9eef8] bg-white px-6 py-5 shadow-sm">
      <div className="mb-5 flex items-center justify-between">
        <h3 className="text-[15px] font-semibold text-[#071942]">Funding Summary</h3>
        <button className="inline-flex items-center gap-2 rounded-md border border-[#dfe7f4] px-4 py-2 text-sm font-medium text-[#31456f] hover:bg-[#f6f8fc]">
          This Month
          <ChevronDown className="h-4 w-4" />
        </button>
      </div>

      <div className="flex flex-1 flex-col items-center gap-6 sm:flex-row">
        <div className="h-40 w-40 shrink-0">
          {requestedAmount > 0 || approvedAmount > 0 || fundedAmount > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={data} innerRadius={48} outerRadius={74} dataKey="value" stroke="#ffffff" strokeWidth={1}>
                  {data.map((d) => (
                    <Cell key={d.name} fill={d.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-full w-full items-center justify-center rounded-full border border-dashed border-[#b9c6dc] text-xs text-[#6d7b99]">
              No funding data
            </div>
          )}
        </div>
        <div className="w-full space-y-6">
          {data.map((item) => (
            <div key={item.name} className="flex items-center justify-between gap-4 text-sm">
              <span className="text-[#31456f]">{item.name}</span>
              <span className="font-semibold text-[#071942]">{money(item.value)}</span>
            </div>
          ))}
        </div>
      </div>

      <button className="mt-5 inline-flex items-center justify-center self-center rounded-md border border-[#a9bcf5] bg-white px-6 py-2.5 text-sm font-semibold text-[#315cff] hover:bg-[#f5f7ff]">
        View Full Report
      </button>
    </div>
  );
}
