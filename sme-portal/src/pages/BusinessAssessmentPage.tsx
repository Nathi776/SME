import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  Check,
  Loader2,
  Sparkles,
  TrendingUp,
  ArrowRight,
  RefreshCw,
  FileCheck,
  MapPin,
  Info
} from "lucide-react";
import api from "../api/client";

const INDUSTRIES = [
  "Construction",
  "Retail",
  "Manufacturing",
  "Technology",
  "Healthcare",
  "Agriculture",
  "Transport & Logistics",
  "Food & Beverage",
  "Professional Services",
  "Other"
];

const PROVINCES = [
  "Gauteng",
  "Western Cape",
  "KwaZulu-Natal",
  "Mpumalanga",
  "Eastern Cape",
  "North West",
  "Free State",
  "Limpopo",
  "Northern Cape"
];

interface AssessmentResult {
  industry: string;
  province: string;
  viability_score: number;
  viability_label: string;
  sector_survival_rate: number;
  survival_label: string;
  province_market_score: number;
  market_label: string;
  top_risks: string[];
  encouragements: string[];
  next_step: string;
}

export default function BusinessAssessmentPage() {
  const navigate = useNavigate();
  const [industry, setIndustry] = useState(INDUSTRIES[0]);
  const [province, setProvince] = useState(PROVINCES[0]);
  const [status, setStatus] = useState<"input" | "loading" | "results">("input");
  const [result, setResult] = useState<AssessmentResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showLearnModal, setShowLearnModal] = useState(false);

  const handleAssess = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("loading");
    setError(null);
    try {
      const res = await api.get<AssessmentResult>(
        `/public/business-assessment?industry=${encodeURIComponent(industry)}&province=${encodeURIComponent(province)}`
      );
      setResult(res.data);
      setTimeout(() => {
        setStatus("results");
      }, 1000);
    } catch (err) {
      setError("Failed to generate market assessment. Please try again.");
      setStatus("input");
    }
  };

  const resetForm = () => {
    setStatus("input");
    setResult(null);
    setError(null);
  };

  const getViabilityColor = (score: number) => {
    if (score >= 70) return "#22c55e";
    if (score >= 55) return "#f59e0b";
    if (score < 40) return "#ef4444";
    return "#f97316";
  };

  const getViabilityTextClass = (score: number) => {
    if (score >= 70) return "text-green-600";
    if (score >= 55) return "text-amber-600";
    if (score < 40) return "text-red-600";
    return "text-orange-500";
  };

  const renderGauge = (score: number, label: string) => {
    const color = getViabilityColor(score);
    const r = 64;
    const cx = 72;
    const cy = 72;
    const circ = 2 * Math.PI * r;
    const dash = (score / 100) * circ;

    return (
      <div className="flex flex-col items-center gap-1">
        <svg width={cx * 2} height={cy * 2} className="-rotate-90">
          <circle cx={cx} cy={cy} r={r} fill="none" stroke="#e5e7eb" strokeWidth={12} />
          <circle
            cx={cx}
            cy={cy}
            r={r}
            fill="none"
            stroke={color}
            strokeWidth={12}
            strokeDasharray={`${dash} ${circ}`}
            strokeLinecap="round"
            style={{ transition: "stroke-dasharray 0.8s ease" }}
          />
        </svg>
        <div className="text-center -mt-[92px] mb-[45px]">
          <div className="text-3xl font-extrabold" style={{ color }}>
            {score.toFixed(1)}%
          </div>
          <div className="text-[11px] font-semibold text-gray-500 tracking-wider uppercase mt-1">
            {label}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#071942] text-white flex flex-col justify-between font-sans relative">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(31,114,79,0.15),rgba(255,255,255,0))]" />

      <header className="relative z-10 max-w-7xl mx-auto px-6 py-6 w-full flex justify-between items-center border-b border-white/10">
        <div className="flex items-center gap-2">
          <div className="h-9 w-9 rounded-lg bg-[#1f724f] flex items-center justify-center shadow-lg shadow-green-500/20">
            <TrendingUp className="h-5 w-5 text-white" />
          </div>
          <span className="font-bold text-lg tracking-wider">SME FINANCE</span>
        </div>
        <button
          onClick={() => navigate("/login")}
          className="text-sm font-semibold hover:text-green-400 transition-colors"
        >
          Sign In
        </button>
      </header>

      <main className="relative z-10 flex-1 max-w-4xl mx-auto px-6 py-12 w-full flex flex-col justify-center">
        {status === "input" && (
          <div className="space-y-8 animate-fadeIn">
            <div className="text-center space-y-3">
              <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight bg-gradient-to-r from-white via-gray-100 to-green-400 bg-clip-text text-transparent">
                Is your business idea viable?
              </h1>
              <p className="text-base text-gray-400 max-w-2xl mx-auto leading-relaxed">
                Get an instant market assessment before you register — free, no account needed.
              </p>
            </div>

            {error && (
              <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="bg-[#0B1E4E]/80 backdrop-blur-md rounded-2xl border border-white/10 p-8 shadow-2xl space-y-6">
              <form onSubmit={handleAssess} className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                    Industry Sector
                  </label>
                  <select
                    value={industry}
                    onChange={(e) => setIndustry(e.target.value)}
                    className="w-full bg-[#071942] border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-green-500/40 focus:border-green-400 transition-all cursor-pointer"
                  >
                    {INDUSTRIES.map((ind) => (
                      <option key={ind} value={ind}>
                        {ind}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                    Target Province
                  </label>
                  <select
                    value={province}
                    onChange={(e) => setProvince(e.target.value)}
                    className="w-full bg-[#071942] border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-green-500/40 focus:border-green-400 transition-all cursor-pointer"
                  >
                    {PROVINCES.map((prov) => (
                      <option key={prov} value={prov}>
                        {prov}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="sm:col-span-2 pt-2">
                  <button
                    type="submit"
                    className="w-full bg-gradient-to-r from-[#1f724f] to-green-600 hover:from-green-600 hover:to-green-500 text-white font-bold py-3.5 px-6 rounded-xl transition-all duration-200 shadow-lg shadow-green-900/30 flex items-center justify-center gap-2 hover:scale-[1.01]"
                  >
                    <Sparkles className="h-4.5 w-4.5" />
                    Assess My Idea
                  </button>
                </div>
              </form>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-4 text-center">
              <div className="flex flex-col items-center gap-2 p-4 rounded-xl bg-white/5 border border-white/5">
                <FileCheck className="h-5 w-5 text-green-400" />
                <span className="text-xs font-semibold text-gray-300">Powered by Stats SA data</span>
              </div>
              <div className="flex flex-col items-center gap-2 p-4 rounded-xl bg-white/5 border border-white/5">
                <TrendingUp className="h-5 w-5 text-green-400" />
                <span className="text-xs font-semibold text-gray-300">Based on real SA sector survival rates</span>
              </div>
              <div className="flex flex-col items-center gap-2 p-4 rounded-xl bg-white/5 border border-white/5">
                <MapPin className="h-5 w-5 text-green-400" />
                <span className="text-xs font-semibold text-gray-300">Used by SMEs across South Africa</span>
              </div>
            </div>
          </div>
        )}

        {status === "loading" && (
          <div className="flex flex-col items-center justify-center py-20 space-y-4 animate-pulse">
            <Loader2 className="h-12 w-12 text-green-400 animate-spin" />
            <h3 className="text-lg font-bold text-gray-200">Analysing market conditions...</h3>
            <p className="text-xs text-gray-500">Retrieving provincial economic indicators and industry risk maps</p>
          </div>
        )}

        {status === "results" && result && (
          <div className="space-y-8 animate-fadeIn">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div>
                <span className="text-xs font-bold text-green-400 uppercase tracking-widest">Viability Report</span>
                <h2 className="text-xl font-bold">{result.industry} in {result.province}</h2>
              </div>
              <button
                onClick={resetForm}
                className="flex items-center gap-2 text-xs font-semibold px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-all hover:text-green-400"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Try Another Idea
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-[#0B1E4E]/80 border border-white/10 rounded-2xl p-6 shadow-xl flex flex-col items-center justify-center text-center">
                {renderGauge(result.viability_score, "Viability")}
                <span className={`text-lg font-extrabold tracking-wide uppercase ${getViabilityTextClass(result.viability_score)}`}>
                  {result.viability_label}
                </span>
                <p className="text-xs text-gray-400 mt-2 max-w-[200px]">
                  Estimated viability index based on SA regional datasets
                </p>
              </div>

              <div className="md:col-span-2 space-y-4 flex flex-col justify-between">
                <div className="bg-[#0B1E4E]/80 border border-white/10 rounded-2xl p-5 shadow-md space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Sector Survival Rate</span>
                    <span className="text-sm font-bold text-green-400">
                      {(result.sector_survival_rate * 100).toFixed(0)}%
                    </span>
                  </div>
                  <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-green-500 rounded-full transition-all duration-500"
                      style={{ width: `${result.sector_survival_rate * 100}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-300 font-medium">{result.survival_label}</p>
                </div>

                <div className="bg-[#0B1E4E]/80 border border-white/10 rounded-2xl p-5 shadow-md space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Market Activity Index</span>
                    <span className="text-sm font-bold text-green-400">
                      {(result.province_market_score * 100).toFixed(0)}%
                    </span>
                  </div>
                  <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-green-500 rounded-full transition-all duration-500"
                      style={{ width: `${result.province_market_score * 100}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-300 font-medium">{result.market_label}</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-[#0B1E4E]/80 border border-white/10 rounded-2xl p-6 shadow-lg space-y-4">
                <h3 className="text-sm font-extrabold text-red-400 uppercase tracking-wider flex items-center gap-2">
                  <AlertTriangle className="h-4.5 w-4.5" />
                  Key Risks to Consider
                </h3>
                <ul className="space-y-3">
                  {result.top_risks.map((risk, index) => (
                    <li key={index} className="flex items-start gap-2.5 text-xs text-gray-300 leading-relaxed">
                      <span className="h-1.5 w-1.5 rounded-full bg-red-400 mt-1.5 shrink-0" />
                      <span>{risk}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="bg-[#0B1E4E]/80 border border-white/10 rounded-2xl p-6 shadow-lg space-y-4">
                <h3 className="text-sm font-extrabold text-green-400 uppercase tracking-wider flex items-center gap-2">
                  <Check className="h-4.5 w-4.5" />
                  Working in Your Favour
                </h3>
                <ul className="space-y-3">
                  {result.encouragements.map((enc, index) => (
                    <li key={index} className="flex items-start gap-2.5 text-xs text-gray-300 leading-relaxed">
                      <span className="h-1.5 w-1.5 rounded-full bg-green-400 mt-1.5 shrink-0" />
                      <span>{enc}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="border border-green-500/30 bg-green-950/20 rounded-2xl p-6 shadow-md space-y-4">
              <h3 className="text-sm font-extrabold text-green-400 flex items-center gap-2">
                <FileCheck className="h-5 w-5" />
                Ready to find out if you qualify for funding?
              </h3>
              <p className="text-xs text-gray-300 leading-relaxed">{result.next_step}</p>
              
              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <button
                  onClick={() => navigate("/register")}
                  className="flex-1 bg-gradient-to-r from-green-700 to-green-600 hover:from-green-600 hover:to-green-500 text-white font-bold py-3 px-5 rounded-xl transition-all flex items-center justify-center gap-2 text-xs shadow-md shadow-green-950/50 hover:scale-[1.01]"
                >
                  Create Free Account
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => setShowLearnModal(true)}
                  className="flex-1 bg-white/5 hover:bg-white/10 text-white border border-white/10 font-bold py-3 px-5 rounded-xl transition-all text-xs flex items-center justify-center gap-2"
                >
                  <Info className="h-3.5 w-3.5 text-gray-400" />
                  Learn How Scoring Works
                </button>
              </div>

              <div className="text-center pt-2 text-xs text-gray-400">
                Already have an account?{" "}
                <button
                  onClick={() => navigate("/login")}
                  className="text-green-400 font-semibold hover:underline"
                >
                  Sign in
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      <footer className="relative z-10 max-w-7xl mx-auto px-6 py-6 w-full text-center text-xs text-gray-500 border-t border-white/5">
        &copy; {new Date().getFullYear()} SME Credit Scoring Platform. All rights reserved.
      </footer>

      {showLearnModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-[#0B1E4E] border border-white/10 rounded-2xl max-w-md w-full p-6 space-y-4 animate-scaleUp">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Info className="h-5 w-5 text-green-400" />
              How Scoring Works
            </h3>
            <div className="text-xs text-gray-300 space-y-3 leading-relaxed">
              <p>
                Our platform aggregates multi-dimensional datasets to score your readiness for commercial funding:
              </p>
              <ul className="list-disc pl-4 space-y-1.5">
                <li>
                  <strong className="text-white">Compliance (25%):</strong> Proves your business matches official CIPC registry lists, tax codes, and banking details.
                </li>
                <li>
                  <strong className="text-white">Revenue Metrics (25%):</strong> Assessed directly via verified digital bank statement parsing, replacing self-declarations.
                </li>
                <li>
                  <strong className="text-white">Market Positioning (20%):</strong> Compares your sector survival rates and regional economic indexes (Stats SA).
                </li>
                <li>
                  <strong className="text-white">Intent (15%):</strong> Evaluated based on active client commitments, supplier quotes, or lease agreements.
                </li>
                <li>
                  <strong className="text-white">Founder Signals (15%):</strong> Rewards leadership experience, business track records, and professional networks.
                </li>
              </ul>
              <p className="text-gray-400 mt-2">
                Registering a free profile unlocks a customized step-by-step coaching roadmap to systematically lift your credit viability score.
              </p>
            </div>
            <div className="pt-2">
              <button
                onClick={() => setShowLearnModal(false)}
                className="w-full bg-[#1f724f] hover:bg-green-600 text-white font-bold py-2.5 rounded-xl text-xs transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
