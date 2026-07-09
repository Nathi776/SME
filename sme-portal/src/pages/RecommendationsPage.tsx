import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertCircle, ArrowRight, CheckCircle2, ChevronRight,
  Clock, FileText, Loader2, Target, TrendingUp, Zap,
} from "lucide-react";
import { RecommendationsApi, type RecommendationPlan, type Recommendation, type FactorStatus } from "../api/recommendationsApi";

// ── Helpers ───────────────────────────────────────────────────────────────────

const DECISION_COLORS: Record<string, string> = {
  Approved: "text-green-700 bg-green-50 border-green-200",
  Review:   "text-amber-700 bg-amber-50 border-amber-200",
  Declined: "text-red-700 bg-red-50 border-red-200",
};

const STATUS_COLORS: Record<string, string> = {
  Strong:   "bg-green-500",
  Moderate: "bg-amber-400",
  Weak:     "bg-orange-400",
  Missing:  "bg-red-400",
};

const DIFFICULTY_BADGE: Record<string, string> = {
  Easy:   "bg-green-100 text-green-700",
  Medium: "bg-amber-100 text-amber-700",
  Hard:   "bg-red-100 text-red-700",
};

const CATEGORY_ICONS: Record<string, string> = {
  "Compliance Documents": "📋",
  "Intent Documents":     "🤝",
  "Founder Profile":      "👤",
  "Business Performance": "📈",
  "Market Position":      "🗺️",
};

// ── Sub-components ────────────────────────────────────────────────────────────

function ScoreGauge({ score, label, size = "lg" }: { score: number; label: string; size?: "sm" | "lg" }) {
  const color = score >= 75 ? "#22c55e" : score >= 50 ? "#f59e0b" : "#ef4444";
  const r     = size === "lg" ? 52 : 36;
  const cx    = size === "lg" ? 60 : 44;
  const cy    = size === "lg" ? 60 : 44;
  const circ  = 2 * Math.PI * r;
  const dash  = (score / 100) * circ;

  return (
    <div className="flex flex-col items-center gap-1">
      <svg width={cx * 2} height={cy * 2} className="-rotate-90">
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#e5e7eb" strokeWidth={size === "lg" ? 10 : 7} />
        <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth={size === "lg" ? 10 : 7}
          strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
          style={{ transition: "stroke-dasharray 0.8s ease" }} />
      </svg>
      <div className="text-center -mt-1" style={{ marginTop: size === "lg" ? "-68px" : "-52px" }}>
        <div className={`font-bold ${size === "lg" ? "text-2xl" : "text-lg"}`} style={{ color }}>
          {score.toFixed(1)}
        </div>
        <div className="text-[10px] text-gray-500 mt-0.5">{label}</div>
      </div>
      <div style={{ marginTop: size === "lg" ? "52px" : "36px" }} />
    </div>
  );
}

function FactorBar({ fs }: { fs: FactorStatus }) {
  return (
    <div className="flex items-center gap-3 py-2">
      <div className="w-36 text-xs text-gray-600 font-medium truncate">{fs.factor}</div>
      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${STATUS_COLORS[fs.status]}`}
          style={{ width: `${Math.min(fs.pct, 100)}%` }}
        />
      </div>
      <div className="w-20 text-right text-xs text-gray-500">
        {fs.current_pts.toFixed(1)}/{fs.max_pts} pts
      </div>
      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full w-16 text-center
        ${fs.status === "Strong" ? "bg-green-100 text-green-700" :
          fs.status === "Moderate" ? "bg-amber-100 text-amber-700" :
          fs.status === "Weak" ? "bg-orange-100 text-orange-700" :
          "bg-red-100 text-red-700"}`}>
        {fs.status}
      </span>
    </div>
  );
}

function RecommendationCard({
  rec,
  onAction,
}: {
  rec: Recommendation;
  onAction: (rec: Recommendation) => void;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 hover:border-green-200 hover:shadow-sm transition-all">
      <div className="flex items-start gap-3">
        {/* Priority badge */}
        <div className="flex-shrink-0 w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-600">
          {rec.priority}
        </div>

        <div className="flex-1 min-w-0">
          {/* Category + difficulty */}
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-xs text-gray-400">
              {CATEGORY_ICONS[rec.category] || "📌"} {rec.category}
            </span>
            <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${DIFFICULTY_BADGE[rec.difficulty]}`}>
              {rec.difficulty}
            </span>
            <span className="flex items-center gap-0.5 text-[10px] text-gray-400">
              <Clock className="h-3 w-3" /> {rec.time_estimate}
            </span>
          </div>

          {/* Action */}
          <p className="text-sm font-semibold text-[#071942] leading-snug">{rec.action}</p>

          {/* Reason */}
          <p className="mt-1 text-xs text-gray-500 leading-relaxed">{rec.reason}</p>

          {/* Impact + CTA */}
          <div className="mt-3 flex items-center justify-between">
            <div className="flex items-center gap-1 text-green-600">
              <TrendingUp className="h-3.5 w-3.5" />
              <span className="text-xs font-bold">+{rec.impact_score.toFixed(1)} pts</span>
            </div>
            {rec.doc_type && (
              <button
                onClick={() => onAction(rec)}
                className="flex items-center gap-1 text-xs font-semibold text-[#1f724f] hover:text-[#155a3a] transition-colors"
              >
                Upload document <ChevronRight className="h-3.5 w-3.5" />
              </button>
            )}
            {!rec.doc_type && (
              <button
                onClick={() => onAction(rec)}
                className="flex items-center gap-1 text-xs font-semibold text-[#1f724f] hover:text-[#155a3a] transition-colors"
              >
                Take action <ChevronRight className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function RecommendationsPage() {
  const navigate  = useNavigate();
  const [plan,    setPlan]    = useState<RecommendationPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  useEffect(() => {
    RecommendationsApi.get()
      .then(({ data }) => setPlan(data))
      .catch(() => setError("Could not load recommendations. Please try again."))
      .finally(() => setLoading(false));
  }, []);

  const handleAction = (rec: Recommendation) => {
    if (rec.doc_type) {
      navigate("/documents");
    } else if (rec.category === "Founder Profile") {
      navigate("/founder-profile");
    } else if (rec.category === "Market Position") {
      navigate("/settings");
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="animate-spin h-8 w-8 text-green-500" />
    </div>
  );

  if (error || !plan) return (
    <div className="flex flex-col items-center justify-center h-64 gap-3">
      <AlertCircle className="h-8 w-8 text-red-400" />
      <p className="text-sm text-gray-500">{error || "No data available"}</p>
    </div>
  );

  const gain = plan.projected_score - plan.current_score;
  const easyRecs = plan.recommendations.filter(r => r.difficulty === "Easy");

  return (
    <div className="max-w-3xl mx-auto space-y-6 p-6">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[#071942]">Funding Readiness Plan</h1>
        <p className="mt-1 text-sm text-gray-500">
          Your personalised action plan. Every step below has a direct impact on your score.
        </p>
      </div>

      {/* Score overview */}
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <div className="flex flex-col sm:flex-row items-center gap-6">
          {/* Current score */}
          <div className="flex flex-col items-center">
            <ScoreGauge score={plan.current_score} label="Current Score" />
            <span className={`mt-2 text-xs font-semibold px-3 py-1 rounded-full border ${DECISION_COLORS[plan.decision]}`}>
              {plan.decision}
            </span>
          </div>

          {/* Arrow */}
          <div className="flex flex-col items-center gap-1 text-gray-300">
            <ArrowRight className="h-6 w-6" />
            <span className="text-xs text-green-600 font-semibold">+{gain.toFixed(1)} pts</span>
          </div>

          {/* Projected score */}
          <div className="flex flex-col items-center">
            <ScoreGauge score={plan.projected_score} label="Projected Score" />
            <span className={`mt-2 text-xs font-semibold px-3 py-1 rounded-full border ${DECISION_COLORS[plan.projected_decision]}`}>
              {plan.projected_decision}
            </span>
          </div>

          {/* Summary */}
          <div className="flex-1 rounded-xl bg-green-50 border border-green-100 p-4">
            <div className="flex items-start gap-2">
              <Target className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-green-800 leading-relaxed">{plan.summary}</p>
            </div>
            {easyRecs.length > 0 && (
              <div className="mt-3 flex items-center gap-1.5 text-xs text-green-700 font-medium">
                <Zap className="h-3.5 w-3.5" />
                {easyRecs.length} easy win{easyRecs.length !== 1 ? "s" : ""} you can complete today
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Factor health */}
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="text-sm font-bold text-[#071942] mb-4">Score Factor Health</h2>
        <div className="divide-y divide-gray-50">
          {plan.factor_statuses.map(fs => (
            <FactorBar key={fs.factor} fs={fs} />
          ))}
        </div>
      </div>

      {/* Quick wins — Easy difficulty only */}
      {easyRecs.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Zap className="h-4 w-4 text-amber-500" />
            <h2 className="text-sm font-bold text-[#071942]">
              Quick wins — complete these today
            </h2>
          </div>
          <div className="space-y-3">
            {easyRecs.map(rec => (
              <RecommendationCard key={rec.priority} rec={rec} onAction={handleAction} />
            ))}
          </div>
        </div>
      )}

      {/* All recommendations */}
      {plan.recommendations.filter(r => r.difficulty !== "Easy").length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <FileText className="h-4 w-4 text-gray-400" />
            <h2 className="text-sm font-bold text-[#071942]">
              Medium and longer-term actions
            </h2>
          </div>
          <div className="space-y-3">
            {plan.recommendations
              .filter(r => r.difficulty !== "Easy")
              .map(rec => (
                <RecommendationCard key={rec.priority} rec={rec} onAction={handleAction} />
              ))}
          </div>
        </div>
      )}

      {/* All done */}
      {plan.recommendations.length === 0 && (
        <div className="rounded-xl border border-green-200 bg-green-50 p-6 flex items-center gap-4">
          <CheckCircle2 className="h-8 w-8 text-green-500 flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-green-800">
              Your profile is fully optimised
            </p>
            <p className="text-xs text-green-700 mt-1">
              Focus on growing revenue, improving invoice collection, and maintaining your compliance documents.
            </p>
          </div>
        </div>
      )}

    </div>
  );
}
