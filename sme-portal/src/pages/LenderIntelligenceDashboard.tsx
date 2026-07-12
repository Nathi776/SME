import React, { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  TrendingUp,
  Users,
  DollarSign,
  Percent,
  TrendingDown,
  ChevronRight,
  Filter,
  BarChart3,
  Map,
  Layers,
  AlertCircle
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell
} from "recharts";
import LenderLayout from "../components/lender/LenderLayout";
import api from "../api/client";
import { formatZAR } from "../utils/format";

interface AnalyticsData {
  applications: {
    total: number;
    approved: number;
    funded: number;
    pending: number;
    rejected: number;
  };
  financials: {
    total_financed: number;
    total_fees: number;
  };
  scores: {
    average: number;
    distribution: {
      "Declined (<50)": number;
      "Review (50-74)": number;
      "Approved (75+)": number;
      "Unscored": number;
    };
  };
  concentration: {
    by_sector: Record<string, number>;
    by_province: Record<string, number>;
  };
  outcomes: {
    pending: number;
    active: number;
    repaid: number;
    defaulted: number;
    repayment_rate: number | null;
  };
}

interface AvailableSME {
  sme_id: number;
  company_name: string;
  industry: string;
  province: string | null;
  revenue: number;
  credit_score: number | null;
  risk_level: "High" | "Medium" | "Low" | null;
  pending_finance_requests: number;
}

const PIE_COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#14b8a6", "#6b7280"];

export default function LenderIntelligenceDashboard() {
  const navigate = useNavigate();
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [availableSmes, setAvailableSmes] = useState<AvailableSME[]>([]);
  const [filteredSmes, setFilteredSmes] = useState<AvailableSME[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters State
  const [minScore, setMinScore] = useState<number>(50);
  const [maxDealSize, setMaxDealSize] = useState<number>(1000000);

  useEffect(() => {
    async function loadData() {
      try {
        const [analyticsRes, smesRes] = await Promise.all([
          api.get<AnalyticsData>("/lenders/portfolio-analytics"),
          api.get<AvailableSME[]>("/lenders/available-smes")
        ]);
        setAnalytics(analyticsRes.data);
        setAvailableSmes(smesRes.data || []);
        
        // Initial filter on mount
        const initialFiltered = (smesRes.data || []).filter((sme) => {
          const score = sme.credit_score ?? 0;
          return score >= 50 && sme.revenue <= 1000000;
        });
        setFilteredSmes(initialFiltered);
        
        setLoading(false);
      } catch (err) {
        setError("Failed to load portfolio analytics");
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const handleApplyFilters = () => {
    const filtered = availableSmes.filter((sme) => {
      const score = sme.credit_score ?? 0;
      // Filter score >= minScore
      const scoreMatch = sme.credit_score !== null ? score >= minScore : false;
      // Filter deal size: SME revenue <= maxDealSize (as proxy/capacity)
      const dealMatch = sme.revenue <= maxDealSize;
      return scoreMatch && dealMatch;
    });
    setFilteredSmes(filtered);
  };

  // 1. Total SMEs
  const totalSMEs = useMemo(() => {
    if (!analytics) return 0;
    const dist = analytics.scores.distribution;
    return (
      (dist["Approved (75+)"] || 0) +
      (dist["Review (50-74)"] || 0) +
      (dist["Declined (<50)"] || 0) +
      (dist["Unscored"] || 0)
    );
  }, [analytics]);

  // 2. Score distribution chart data
  const scoreChartData = useMemo(() => {
    if (!analytics) return [];
    const dist = analytics.scores.distribution;
    return [
      { name: "Declined", count: dist["Declined (<50)"] || 0, fill: "#ef4444" },
      { name: "Review", count: dist["Review (50-74)"] || 0, fill: "#f59e0b" },
      { name: "Approved", count: dist["Approved (75+)"] || 0, fill: "#10b981" },
      { name: "Unscored", count: dist["Unscored"] || 0, fill: "#9ca3af" }
    ];
  }, [analytics]);

  // 3. Sector concentration pie data
  const sectorPieData = useMemo(() => {
    if (!analytics) return [];
    return Object.entries(analytics.concentration.by_sector).map(([name, count]) => ({
      name,
      value: count
    }));
  }, [analytics]);

  // 4. Province list sorted descending by count
  const provinceTableData = useMemo(() => {
    if (!analytics) return [];
    const entries = Object.entries(analytics.concentration.by_province);
    const total = entries.reduce((sum, [, count]) => sum + count, 0);
    return entries
      .map(([province, count]) => ({
        province,
        count,
        percentage: total > 0 ? (count / total) * 100 : 0
      }))
      .sort((a, b) => b.count - a.count);
  }, [analytics]);

  const getDecisionBadge = (score: number | null) => {
    if (score === null) return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-700">Unscored</span>;
    if (score >= 75) return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700">Approved</span>;
    if (score >= 50) return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700">Review</span>;
    return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700">Declined</span>;
  };

  if (loading) {
    return (
      <LenderLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="flex flex-col items-center gap-2">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#4f63f6]" />
            <span className="text-sm text-gray-500">Loading intelligence data...</span>
          </div>
        </div>
      </LenderLayout>
    );
  }

  if (error || !analytics) {
    return (
      <LenderLayout>
        <div className="max-w-[1200px] px-6 mx-auto py-10 space-y-4">
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            <span>{error || "An error occurred while loading data."}</span>
          </div>
        </div>
      </LenderLayout>
    );
  }

  return (
    <LenderLayout>
      <div className="max-w-[1600px] px-6 mx-auto space-y-8 text-[#071942] pb-12">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#071942]">Lender Intelligence Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">
            Real-time portfolio scoring, geographic distribution, and sector concentrations.
          </p>
        </div>

        {/* Section 1: Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* Card 1: Total SMEs */}
          <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm hover:shadow-md transition-shadow flex items-center gap-4">
            <div className="h-12 w-12 rounded-lg bg-[#dfe9ff] text-[#315cff] flex items-center justify-center">
              <Users className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Total SMEs</p>
              <h3 className="text-xl font-bold mt-1">{totalSMEs}</h3>
              <p className="text-[10px] text-gray-500 mt-0.5">On-boarded on platform</p>
            </div>
          </div>

          {/* Card 2: Average Credit Score */}
          <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm hover:shadow-md transition-shadow flex items-center gap-4">
            <div className="h-12 w-12 rounded-lg bg-[#eadcff] text-[#7c3cff] flex items-center justify-center">
              <TrendingUp className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Avg Credit Score</p>
              <h3 className="text-xl font-bold mt-1">{analytics.scores.average.toFixed(1)}</h3>
              <p className="text-[10px] text-gray-500 mt-0.5">Weighted average score</p>
            </div>
          </div>

          {/* Card 3: Total Financed */}
          <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm hover:shadow-md transition-shadow flex items-center gap-4">
            <div className="h-12 w-12 rounded-lg bg-[#d9f7e6] text-[#16a35d] flex items-center justify-center">
              <DollarSign className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Total Financed</p>
              <h3 className="text-xl font-bold mt-1">{formatZAR(analytics.financials.total_financed)}</h3>
              <p className="text-[10px] text-gray-500 mt-0.5">Approved & funded amount</p>
            </div>
          </div>

          {/* Card 4: Repayment Rate */}
          <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm hover:shadow-md transition-shadow flex items-center gap-4">
            <div className="h-12 w-12 rounded-lg bg-[#ffe9c7] text-[#ff7a00] flex items-center justify-center">
              <Percent className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Repayment Rate</p>
              <h3 className="text-xl font-bold mt-1">
                {analytics.outcomes.repayment_rate !== null
                  ? `${analytics.outcomes.repayment_rate.toFixed(1)}%`
                  : "No data yet"}
              </h3>
              <p className="text-[10px] text-gray-500 mt-0.5">Repaid deals / active ratio</p>
            </div>
          </div>
        </div>

        {/* Section 2: Charts (Bar + Pie) */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {/* Score Distribution Chart */}
          <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-6">
              <BarChart3 className="h-5 w-5 text-gray-400" />
              <h3 className="text-base font-bold">Credit Score Distribution</h3>
            </div>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={scoreChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#6b7280" }} />
                  <YAxis tick={{ fontSize: 11, fill: "#6b7280" }} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ fontSize: "11px", borderRadius: "8px", border: "1px solid #e5e7eb" }}
                    cursor={{ fill: "rgba(0,0,0,0.02)" }}
                  />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {scoreChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Sector Concentration Chart */}
          <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-6">
              <Layers className="h-5 w-5 text-gray-400" />
              <h3 className="text-base font-bold">Sector Concentration</h3>
            </div>
            <div className="h-72 flex flex-col sm:flex-row items-center justify-center">
              <div className="w-full sm:w-1/2 h-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={sectorPieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={85}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {sectorPieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ fontSize: "11px", borderRadius: "8px" }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="w-full sm:w-1/2 overflow-y-auto max-h-60 mt-4 sm:mt-0 px-4 space-y-1">
                {sectorPieData.map((entry, index) => (
                  <div key={entry.name} className="flex items-center justify-between text-xs py-1 border-b border-gray-50 last:border-0">
                    <div className="flex items-center gap-2 truncate">
                      <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: PIE_COLORS[index % PIE_COLORS.length] }} />
                      <span className="truncate text-gray-600 font-medium">{entry.name}</span>
                    </div>
                    <span className="font-bold text-gray-800 shrink-0">{entry.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Section 3: Province Heatmap Table */}
        <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Map className="h-5 w-5 text-gray-400" />
            <h3 className="text-base font-bold">Geographic Province Heatmap</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-100 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  <th className="py-3 px-4">Province</th>
                  <th className="py-3 px-4 text-right">SME Count</th>
                  <th className="py-3 px-4 text-right">% of Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 text-sm">
                {provinceTableData.map((row) => (
                  <tr key={row.province} className="hover:bg-gray-50/50 transition-colors">
                    <td className="py-3.5 px-4 font-semibold text-gray-700">{row.province}</td>
                    <td className="py-3.5 px-4 text-right font-bold text-gray-800">{row.count}</td>
                    <td className="py-3.5 px-4 text-right text-gray-500">{row.percentage.toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Section 4: Funding Criteria Filter & Table */}
        <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm space-y-6">
          <div className="flex items-center gap-2">
            <Filter className="h-5 w-5 text-gray-400" />
            <h3 className="text-base font-bold">SME Filter & Screening Tool</h3>
          </div>

          {/* Filters Form */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 items-end bg-gray-50 p-5 rounded-xl border border-gray-100">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                Min. Credit Score Threshold
              </label>
              <input
                type="number"
                value={minScore}
                onChange={(e) => setMinScore(Number(e.target.value))}
                className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#4f63f6]/20 focus:border-[#4f63f6] transition-colors"
                min="0"
                max="100"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                Max Deal Size (ZAR capacity)
              </label>
              <input
                type="number"
                value={maxDealSize}
                onChange={(e) => setMaxDealSize(Number(e.target.value))}
                className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#4f63f6]/20 focus:border-[#4f63f6] transition-colors"
                min="0"
              />
            </div>
            <div>
              <button
                onClick={handleApplyFilters}
                className="w-full bg-[#4f63f6] hover:bg-[#384ee3] text-white font-semibold py-2 px-4 rounded-lg transition-colors text-sm shadow-sm"
              >
                Apply Filters
              </button>
            </div>
          </div>

          {/* Filtered SMEs List Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-100 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  <th className="py-3 px-4">Name</th>
                  <th className="py-3 px-4">Industry</th>
                  <th className="py-3 px-4">Province</th>
                  <th className="py-3 px-4 text-right">Credit Score</th>
                  <th className="py-3 px-4">Decision</th>
                  <th className="py-3 px-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 text-sm">
                {filteredSmes.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-gray-400 text-xs">
                      No SMEs match the current screening criteria. Try widening your filters.
                    </td>
                  </tr>
                ) : (
                  filteredSmes.map((sme) => (
                    <tr key={sme.sme_id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-gray-800">{sme.company_name}</td>
                      <td className="py-3.5 px-4 text-gray-600">{sme.industry}</td>
                      <td className="py-3.5 px-4 text-gray-600">{sme.province || "Unspecified"}</td>
                      <td className="py-3.5 px-4 text-right font-bold text-gray-800">
                        {sme.credit_score !== null ? sme.credit_score.toFixed(1) : "-"}
                      </td>
                      <td className="py-3.5 px-4">{getDecisionBadge(sme.credit_score)}</td>
                      <td className="py-3.5 px-4 text-center">
                        <button
                          onClick={() => navigate(`/lender/sme/${sme.sme_id}`)}
                          className="inline-flex items-center gap-1 text-xs font-bold text-[#4f63f6] hover:text-[#384ee3] transition-colors"
                        >
                          View Intelligence
                          <ChevronRight className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </LenderLayout>
  );
}
