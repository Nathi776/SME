import { Info } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";

const score = 78;
const data = [{ value: score }, { value: 100 - score }];
const colors = ["hsl(228, 72%, 55%)", "hsl(220, 14%, 93%)"];

export default function CreditScoreOverview() {
  return (
    <div className="bg-card rounded-xl border border-border p-5 flex flex-col min-h-[320px]">
      <div className="flex items-center gap-2 mb-4">
        <h3 className="font-semibold text-foreground text-sm">Credit Score Overview</h3>
        <Info className="w-3.5 h-3.5 text-muted-foreground" />
      </div>

      <div className="flex-1 flex flex-col items-center justify-center">
        <div className="relative w-40 h-40">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                innerRadius={52}
                outerRadius={72}
                startAngle={90}
                endAngle={-270}
                dataKey="value"
                stroke="none"
              >
                {data.map((_, index) => (
                  <Cell key={index} fill={colors[index]} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-3xl font-bold text-foreground">{score}</span>
            <span className="text-[10px] text-muted-foreground">out of 100</span>
          </div>
        </div>
        <div className="flex items-center gap-1.5 mt-3">
          <span className="w-2 h-2 rounded-full bg-green-500" />
          <span className="text-sm font-semibold text-green-600">Good Standing</span>
        </div>
        <p className="text-xs text-muted-foreground text-center mt-2 max-w-[200px]">
          Your score is based on payment behavior, revenue consistency, and invoice history.
        </p>
      </div>

      <button className="mt-4 self-center inline-flex items-center justify-center rounded-md border border-border bg-background px-3 py-2 text-xs font-medium text-foreground hover:bg-muted">
        View Score Details
      </button>
    </div>
  );
}
