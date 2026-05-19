import { Info } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";

const colors = ["hsl(228, 72%, 55%)", "hsl(220, 14%, 93%)"];

type CreditScoreOverviewProps = {
  score: number | null;
};

export default function CreditScoreOverview({ score }: CreditScoreOverviewProps) {
  const displayScore = score ?? 0;
  const data = [{ value: displayScore }, { value: 100 - displayScore }];
  const standing = score === null ? "No score yet" : score >= 80 ? "Excellent" : score >= 60 ? "Good Standing" : score >= 40 ? "Needs Attention" : "High Risk";
  const standingColor = score === null ? "text-muted-foreground" : score >= 60 ? "text-green-600" : "text-orange-600";

  return (
    <div className="bg-white border border-gray-100 rounded-lg shadow-sm p-6 flex flex-col min-h-[320px]">
      <div className="flex items-center gap-2 mb-4">
        <h3 className="font-semibold text-foreground text-sm">Credit Score Overview</h3>
        <Info className="w-4 h-4 text-muted-foreground" />
      </div>

      <div className="flex-1 flex flex-col items-center justify-center">
        <div className="relative w-64 h-40">
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
            <span className="text-5xl font-extrabold text-foreground">{score === null ? "-" : score}</span>
            <span className="text-[10px] text-muted-foreground">out of 100</span>
          </div>
        </div>
        <div className="flex items-center gap-1.5 mt-3">
          <span className="w-2 h-2 rounded-full bg-green-500" />
          <span className={`text-sm font-semibold ${standingColor}`}>{standing}</span>
        </div>
        <p className="text-xs text-muted-foreground text-center mt-2 max-w-[200px]">
          Your score is based on payment behavior, revenue consistency, and invoice history.
        </p>
      </div>

      <button className="mt-4 self-center inline-flex items-center justify-center rounded-md border border-gray-100 bg-white px-3 py-2 text-xs font-medium text-foreground hover:shadow-sm">
        View Score Details
      </button>
    </div>
  );
}
