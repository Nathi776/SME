import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { TrendingUp, Info } from "lucide-react";

type ScoreHistoryItem = {
  id: number;
  score: number;
  created_at: string;
};

type ScoreTrajectoryChartProps = {
  history: ScoreHistoryItem[];
};

export default function ScoreTrajectoryChart({ history }: ScoreTrajectoryChartProps) {
  // Sort history ascending by date
  const chartData = [...history]
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
    .map(item => {
      const d = new Date(item.created_at);
      return {
        Score: Math.round(item.score),
        date: d.toLocaleDateString("en-ZA", { day: "2-digit", month: "short" }),
      };
    });

  const hasHistory = chartData.length > 0;

  return (
    <div className="flex flex-col rounded-xl border border-[#e9eef8] bg-white p-5 shadow-sm min-h-[380px]">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-emerald-600" />
          <h3 className="text-[15px] font-bold text-[#071942]">Score Trajectory</h3>
        </div>
        <div className="flex items-center gap-1.5 text-[10px] text-[#8f9bba]">
          <Info className="h-3.5 w-3.5" />
          <span>Updates on profile changes</span>
        </div>
      </div>

      {hasHistory ? (
        <div className="flex-1 w-full min-h-[260px] mt-2">
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f6fc" />
              <XAxis 
                dataKey="date" 
                stroke="#8f9bba" 
                fontSize={10} 
                fontWeight={600}
                tickLine={false}
                axisLine={false}
                dy={10}
              />
              <YAxis 
                stroke="#8f9bba" 
                fontSize={10} 
                fontWeight={600}
                domain={[0, 100]}
                tickLine={false}
                axisLine={false}
                dx={-5}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: "#071942", 
                  borderRadius: "8px", 
                  border: "none",
                  color: "#fff",
                  fontSize: "11px",
                  fontWeight: "bold",
                  boxShadow: "0 4px 12px rgba(7, 25, 66, 0.15)"
                }}
                itemStyle={{ color: "#10b981" }}
                labelStyle={{ color: "#8f9bba" }}
              />
              <Line 
                type="monotone" 
                dataKey="Score" 
                stroke="#10b981" 
                strokeWidth={3} 
                dot={{ fill: "#10b981", stroke: "#fff", strokeWidth: 2, r: 5 }}
                activeDot={{ fill: "#10b981", stroke: "#fff", strokeWidth: 2, r: 7 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center border border-dashed border-[#dfe5f0] bg-slate-50/50 rounded-xl p-8 text-center">
          <p className="text-xs font-bold text-[#071942]">No historical trajectory</p>
          <p className="text-[10px] text-[#5f6d8a] mt-1 max-w-[200px]">
            Once you submit documents or link invoices, your score will update over time.
          </p>
        </div>
      )}
    </div>
  );
}
