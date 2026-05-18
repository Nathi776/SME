import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";

const data = [
  { name: "Total Requested", value: 200000, color: "hsl(228, 72%, 55%)" },
  { name: "Total Approved", value: 140000, color: "hsl(152, 60%, 48%)" },
  { name: "Total Funded", value: 90000, color: "hsl(35, 92%, 55%)" },
];

const legend = [
  { label: "Total Requested", amount: "R200,000.00", color: "bg-blue-500" },
  { label: "Total Approved", amount: "R140,000.00", color: "bg-green-500" },
  { label: "Total Funded", amount: "R90,000.00", color: "bg-orange-400" },
];

export default function FundingSummary() {
  return (
    <div className="bg-card rounded-xl border border-border p-5 flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-foreground text-sm">Funding Summary</h3>
        <span className="text-xs text-muted-foreground border border-border rounded-md px-2 py-1">This Month ▾</span>
      </div>

      <div className="flex items-center gap-4 flex-1">
        <div className="w-32 h-32 shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                innerRadius={36}
                outerRadius={56}
                dataKey="value"
                stroke="none"
              >
                {data.map((d, i) => (
                  <Cell key={i} fill={d.color} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="space-y-3">
          {legend.map((l, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className={`w-2.5 h-2.5 rounded-full ${l.color}`} />
              <div>
                <p className="text-xs text-muted-foreground">{l.label}</p>
                <p className="text-sm font-semibold text-foreground">{l.amount}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <button className="mt-4 self-center inline-flex items-center justify-center rounded-md border border-border bg-background px-3 py-2 text-xs font-medium text-foreground hover:bg-muted">
        View Full Report
      </button>
    </div>
  );
}
