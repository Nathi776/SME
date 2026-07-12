import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  CheckCircle,
  AlertCircle,
  XCircle,
  HelpCircle,
  Calendar,
  Building,
  MapPin,
  Clock,
  Sparkles,
  TrendingUp,
  UserCheck,
  ShieldCheck,
  FileText
} from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine
} from "recharts";
import LenderLayout from "../components/lender/LenderLayout";
import api from "../api/client";
import { formatZAR } from "../utils/format";

interface SMEIntelligence {
  sme: {
    id: number;
    name: string;
    industry: string;
    province: string | null;
    business_city: string | null;
    revenue: number;
    years_active: number;
    cipc_verified: boolean;
  };
  score: {
    current: number;
    decision: string;
    breakdown: Record<
      string,
      {
        value: any;
        label: string;
        contribution: number;
        max: number;
        note?: string | null;
      }
    >;
  };
  founder: {
    years_experience: number | null;
    highest_qualification: string | null;
    prior_business_owner: boolean | null;
    trade_association: string | null;
    reference_provided: boolean;
  } | null;
  recommendations: {
    projected_score: number;
    projected_decision: string;
    top_3_actions: Array<{
      action: string;
      impact_score: number;
      difficulty: string;
    }>;
  };
  score_history: Array<{
    score: number;
    created_at: string;
  }>;
  outcomes: any[];
}

const DECISION_BADGES: Record<string, string> = {
  Approved: "bg-green-100 text-green-700 border-green-200",
  Review: "bg-amber-100 text-amber-700 border-amber-200",
  Declined: "bg-red-100 text-red-700 border-red-200"
};

const DIFFICULTY_BADGES: Record<string, string> = {
  Easy: "bg-green-100 text-green-700",
  Medium: "bg-amber-100 text-amber-700",
  Hard: "bg-red-100 text-red-700"
};

// ── ScoreGauge Sub-component ──
function ScoreGauge({ score, label }: { score: number; label: string }) {
  const color = score >= 75 ? "#22c55e" : score >= 50 ? "#f59e0b" : "#ef4444";
  const r = 45;
  const cx = 52;
  const cy = 52;
  const circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;

  return (
    <div className="flex flex-col items-center justify-center shrink-0">
      <svg width={cx * 2} height={cy * 2} className="-rotate-90">
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#e5e7eb" strokeWidth={8} />
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={8}
          strokeDasharray={`${dash} ${circ}`}
          strokeLinecap="round"
          style={{ transition: "stroke-dasharray 0.8s ease" }}
        />
      </svg>
      <div className="text-center -mt-[64px] mb-[28px]">
        <div className="text-xl font-black" style={{ color }}>
          {score.toFixed(1)}
        </div>
        <div className="text-[9px] font-bold text-gray-400 uppercase tracking-wide">
          {label}
        </div>
      </div>
    </div>
  );
}

export default function LenderSMEDetailPage() {
  const { smeId } = useParams<{ smeId: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<SMEIntelligence | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadSmeIntelligence() {
      try {
        const res = await api.get<SMEIntelligence>(`/lenders/sme-intelligence/${smeId}`);
        setData(res.data);
        setLoading(false);
      } catch (err) {
        setError("Failed to load SME credit intelligence details.");
        setLoading(false);
      }
    }
    loadSmeIntelligence();
  }, [smeId]);

  if (loading) {
    return (
      <LenderLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="flex flex-col items-center gap-2">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#4f63f6]" />
            <span className="text-sm text-gray-500">Retrieving SME intelligence dossier...</span>
          </div>
        </div>
      </LenderLayout>
    );
  }

  if (error || !data) {
    return (
      <LenderLayout>
        <div className="max-w-[1200px] px-6 mx-auto py-10">
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 flex items-center gap-2">
            <AlertCircle className="h-5 w-5 animate-pulse" />
            <span>{error || "SME Dossier not found."}</span>
          </div>
          <button
            onClick={() => navigate("/lender/dashboard")}
            className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-[#4f63f6] hover:underline"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Dashboard
          </button>
        </div>
      </LenderLayout>
    );
  }

  const { sme, score, founder, recommendations, score_history } = data;

  return (
    <LenderLayout>
      <div className="max-w-[1200px] px-6 mx-auto space-y-6 text-[#071942] pb-12">
        {/* Back Button */}
        <div>
          <button
            onClick={() => navigate("/lender/dashboard")}
            className="inline-flex items-center gap-2 text-xs font-bold text-gray-400 hover:text-gray-600 transition-colors uppercase tracking-wider"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Dashboard
          </button>
        </div>

        {/* Section 1: SME Header Card */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-3 text-center md:text-left">
            <div className="flex flex-col sm:flex-row items-center gap-2.5">
              <h1 className="text-2xl font-black tracking-tight">{sme.name}</h1>
              {sme.cipc_verified ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold bg-green-50 text-green-700 px-2.5 py-0.5 rounded-full border border-green-100">
                  <CheckCircle className="h-3.5 w-3.5 text-green-600" /> CIPC Verified
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold bg-gray-50 text-gray-500 px-2.5 py-0.5 rounded-full border border-gray-200">
                  <HelpCircle className="h-3.5 w-3.5 text-gray-400" /> Unverified
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-y-2 gap-x-4 text-xs font-semibold text-gray-400">
              <div className="flex items-center justify-center md:justify-start gap-1">
                <Building className="h-3.5 w-3.5 shrink-0 text-gray-300" />
                <span>{sme.industry}</span>
              </div>
              <div className="flex items-center justify-center md:justify-start gap-1">
                <MapPin className="h-3.5 w-3.5 shrink-0 text-gray-300" />
                <span>{sme.business_city ? `${sme.business_city}, ${sme.province}` : sme.province || "Unspecified"}</span>
              </div>
              <div className="flex items-center justify-center md:justify-start gap-1">
                <Clock className="h-3.5 w-3.5 shrink-0 text-gray-300" />
                <span>{sme.years_active} year{sme.years_active === 1 ? "" : "s"} active</span>
              </div>
              <div className="flex items-center justify-center md:justify-start gap-1">
                <FileText className="h-3.5 w-3.5 shrink-0 text-gray-300" />
                <span>{formatZAR(sme.revenue)} Revenue</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-5 shrink-0 border-t md:border-t-0 md:border-l border-gray-100 pt-4 md:pt-0 md:pl-6 w-full md:w-auto justify-center">
            <ScoreGauge score={score.current} label="Score" />
            <div className="text-center md:text-left">
              <span className={`inline-block px-3 py-1 rounded-full text-xs font-extrabold border uppercase tracking-wider ${DECISION_BADGES[score.decision] || "bg-gray-100"}`}>
                {score.decision}
              </span>
              <p className="text-[10px] text-gray-400 font-semibold mt-1">Calculated Live Decision</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Section 2: Score Breakdown Card */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-gray-400">Readiness Score Breakdown</h3>
            <div className="space-y-3.5 divide-y divide-gray-50">
              {Object.entries(score.breakdown).map(([factor, bd]) => {
                const percentage = bd.max > 0 ? (bd.contribution / bd.max) * 100 : 0;
                let barColorClass = "bg-red-500";
                if (percentage >= 80) barColorClass = "bg-green-500";
                else if (percentage >= 50) barColorClass = "bg-amber-500";

                return (
                  <div key={factor} className="pt-3 first:pt-0">
                    <div className="flex justify-between items-center text-xs font-semibold mb-1.5">
                      <span className="text-gray-700">{factor}</span>
                      <span className="text-gray-500">
                        {bd.contribution.toFixed(1)} / {bd.max} pts
                      </span>
                    </div>
                    <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${barColorClass}`}
                        style={{ width: `${Math.min(percentage, 100)}%` }}
                      />
                    </div>
                    <p className="text-[10px] text-gray-400 mt-1 leading-relaxed">{bd.label}</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Column Stack */}
          <div className="space-y-6">
            {/* Section 3: Founder Intelligence */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-gray-400">Founder Signal Intelligence</h3>
              {founder === null ? (
                <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 p-6 text-center text-xs text-gray-400">
                  Founder profile not yet completed
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-0.5">Industry Experience</p>
                    <p className="font-bold text-gray-700">
                      {founder.years_experience !== null ? `${founder.years_experience} Years` : "Not provided"}
                    </p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-0.5">Highest Qualification</p>
                    <p className="font-bold text-gray-700 capitalize">
                      {founder.highest_qualification || "Not provided"}
                    </p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-0.5">Prior Business Owner</p>
                    <p className="font-bold text-gray-700">
                      {founder.prior_business_owner === true ? "Yes" : founder.prior_business_owner === false ? "No" : "Not specified"}
                    </p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-0.5">Trade Association</p>
                    <p className="font-bold text-gray-700">
                      {founder.trade_association || "None"}
                    </p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-xl border border-gray-100 col-span-2 flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Business Reference Provided</p>
                      <p className="text-gray-500 text-[10px] mt-0.5">Checked against trade partners</p>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] border ${founder.reference_provided ? "bg-green-50 text-green-700 border-green-200" : "bg-red-50 text-red-700 border-red-200"}`}>
                      {founder.reference_provided ? "Verified" : "Missing"}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Section 4: Score Trajectory */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-gray-400">Score Calculation History</h3>
              {score_history.length === 0 ? (
                <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 p-6 text-center text-xs text-gray-400">
                  No calculation history recorded yet.
                </div>
              ) : (
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={score_history} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                      <XAxis
                        dataKey="created_at"
                        tick={{ fontSize: 9, fill: "#9ca3af" }}
                        tickFormatter={(val) => new Date(val).toLocaleDateString()}
                      />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 9, fill: "#9ca3af" }} />
                      <Tooltip
                        contentStyle={{ fontSize: "11px", borderRadius: "8px" }}
                        labelFormatter={(val) => new Date(val).toLocaleString()}
                      />
                      <ReferenceLine y={75} stroke="#10b981" strokeDasharray="3 3" strokeWidth={1} label={{ value: "Approved (75)", fill: "#10b981", fontSize: 8, position: "top" }} />
                      <ReferenceLine y={50} stroke="#f59e0b" strokeDasharray="3 3" strokeWidth={1} label={{ value: "Review (50)", fill: "#f59e0b", fontSize: 8, position: "top" }} />
                      <Line
                        type="monotone"
                        dataKey="score"
                        stroke="#4f63f6"
                        strokeWidth={2.5}
                        dot={{ r: 4, strokeWidth: 1, fill: "#fff" }}
                        activeDot={{ r: 6 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Section 5: Top Recommendations */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-gray-400">Top 3 Recommended Improvement Actions</h3>
              <p className="text-xs text-gray-400 mt-0.5">High-impact tasks curated by the credit decision engine.</p>
            </div>
            <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-2 text-center sm:text-right shrink-0">
              <p className="text-[10px] font-bold text-green-800 uppercase tracking-wide">Projected Score Potential</p>
              <p className="text-xs font-semibold text-green-700 mt-0.5">
                Target Score: <strong className="text-sm font-extrabold">{recommendations.projected_score}</strong> ({recommendations.projected_decision})
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {recommendations.top_3_actions.length === 0 ? (
              <div className="md:col-span-3 rounded-xl border border-dashed border-gray-200 bg-gray-50 p-6 text-center text-xs text-gray-400">
                SME profile is fully optimized. No recommendations.
              </div>
            ) : (
              recommendations.top_3_actions.map((rec, index) => (
                <div key={index} className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm space-y-3 flex flex-col justify-between hover:border-blue-100 transition-colors">
                  <div className="space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-black text-gray-300">ACTION 0{index + 1}</span>
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${DIFFICULTY_BADGES[rec.difficulty] || "bg-gray-100 text-gray-700"}`}>
                        {rec.difficulty}
                      </span>
                    </div>
                    <p className="text-xs font-bold text-gray-700 leading-snug">{rec.action}</p>
                  </div>
                  
                  <div className="flex items-center gap-1 text-green-600 text-xs font-bold pt-2 border-t border-gray-50">
                    <TrendingUp className="h-3.5 w-3.5" />
                    <span>+{rec.impact_score.toFixed(1)} pts score impact</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </LenderLayout>
  );
}
