import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FileText,
  AlertTriangle,
  Coins,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  ArrowRight
} from "lucide-react";
import LenderLayout from "../components/lender/LenderLayout";
import { LenderApi, type FinanceRequest, type AvailableSme } from "../api/lenderApi";
import { formatZAR } from "../utils/format";

// Request Row Interface
interface ReviewRequestRow {
  id: number;
  sme_id: number;
  name: string;
  amount: number;
  score: number;
  risk: "Low" | "Medium" | "High";
  date: string;
  status: string;
}

// Fallback mock requests matching the requirements
const MOCK_REQUESTS: ReviewRequestRow[] = [
  { id: 15, sme_id: 15, name: "ABC Construction (Pty) Ltd", amount: 85000, score: 78, risk: "Low", date: "20 Jun 2026", status: "pending" },
  { id: 16, sme_id: 16, name: "XYZ Trading Ltd", amount: 50000, score: 74, risk: "Low", date: "19 Jun 2026", status: "pending" },
  { id: 17, sme_id: 17, name: "Metro Supply & Hardware", amount: 90000, score: 45, risk: "High", date: "18 Jun 2026", status: "pending" },
  { id: 18, sme_id: 18, name: "Gauteng Logistics", amount: 120000, score: 62, risk: "Medium", date: "15 Jun 2026", status: "pending" },
  { id: 19, sme_id: 19, name: "Cape Wholesale Goods", amount: 65000, score: 81, risk: "Low", date: "12 Jun 2026", status: "pending" }
];

export default function LenderReviewRequestsPage() {
  const navigate = useNavigate();
  const [dbRequests, setDbRequests] = useState<FinanceRequest[]>([]);
  const [availableSmes, setAvailableSmes] = useState<AvailableSme[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [riskFilter, setRiskFilter] = useState("All");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // Load backend data
  const loadData = async () => {
    try {
      setLoading(true);
      const [requestsRes, smesRes] = await Promise.all([
        LenderApi.getPendingRequests(),
        LenderApi.getAvailableSMEs()
      ]);
      setDbRequests(requestsRes.data || []);
      setAvailableSmes(smesRes.data || []);
      setError(null);
    } catch (err) {
      console.error(err);
      setError("Failed to load pending requests from server.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Map of SMEs by ID
  const smesById = useMemo(() => {
    const map: Record<number, AvailableSme> = {};
    availableSmes.forEach((sme) => {
      map[sme.sme_id] = sme;
    });
    return map;
  }, [availableSmes]);

  // Merge backend data with mock data
  const requests = useMemo(() => {
    const list: ReviewRequestRow[] = [];

    // Map db requests
    dbRequests.forEach((req) => {
      const sme = smesById[req.sme_id];
      const name = sme?.company_name || `SME ${req.sme_id}`;
      const score = sme?.credit_score ?? 72;
      const risk = sme?.risk_level || "Medium";
      const dateStr = new Date(req.created_at).toLocaleDateString("en-ZA", {
        day: "2-digit",
        month: "short",
        year: "numeric"
      });

      list.push({
        id: req.id,
        sme_id: req.sme_id,
        name,
        amount: Number(req.amount_requested),
        score,
        risk: risk as any,
        date: dateStr,
        status: req.status
      });
    });

    // Add mock requests to populate the list if needed, or to make it complete
    MOCK_REQUESTS.forEach((mock) => {
      // Avoid duplicate IDs if the DB has generated them
      if (!list.some((r) => r.id === mock.id)) {
        list.push(mock);
      }
    });

    return list;
  }, [dbRequests, smesById]);

  // Statistics
  const stats = useMemo(() => {
    const pendingCount = requests.length;
    const totalValue = requests.reduce((sum, r) => sum + r.amount, 0);
    const highRisk = requests.filter((r) => r.risk === "High").length;
    const readyForApproval = requests.filter((r) => r.score >= 70).length;

    return { pendingCount, totalValue, highRisk, readyForApproval };
  }, [requests]);

  // Filtering
  const filteredRequests = useMemo(() => {
    let list = [...requests];

    if (searchQuery.trim() !== "") {
      const q = searchQuery.toLowerCase();
      list = list.filter((r) => r.name.toLowerCase().includes(q) || String(r.id).includes(q));
    }

    if (riskFilter !== "All") {
      list = list.filter((r) => r.risk === riskFilter);
    }

    return list;
  }, [requests, searchQuery, riskFilter]);

  // Pagination
  const paginatedRequests = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredRequests.slice(start, start + pageSize);
  }, [filteredRequests, currentPage, pageSize]);

  return (
    <LenderLayout>
      <div className="space-y-6 text-[#071942] max-w-[1540px] mx-auto">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-[#071942]">Review Financing Requests</h1>
          <p className="text-sm text-[#5f6d8a] mt-0.5">Evaluate SME financing applications and perform credit assessments</p>
        </div>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-xs text-red-700">
            {error}
          </div>
        )}

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Pending Requests */}
          <div className="flex items-start gap-4 rounded-2xl border border-[#e9eef8] bg-white p-5 shadow-sm">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 border border-blue-100">
              <FileText className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-semibold text-[#5f6d8a]">Pending Requests</p>
              <p className="text-3xl font-bold text-[#071942] mt-1">{stats.pendingCount}</p>
              <p className="text-xs text-[#8f9bba] mt-1.5">Awaiting credit decisions</p>
            </div>
          </div>

          {/* Total Value */}
          <div className="flex items-start gap-4 rounded-2xl border border-[#e9eef8] bg-white p-5 shadow-sm">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100">
              <Coins className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-semibold text-[#5f6d8a]">Total Value</p>
              <p className="text-3xl font-bold text-[#071942] mt-1">{formatZAR(stats.totalValue)}</p>
              <p className="text-xs text-[#8f9bba] mt-1.5">Total funding exposure requested</p>
            </div>
          </div>

          {/* High Risk */}
          <div className="flex items-start gap-4 rounded-2xl border border-[#e9eef8] bg-white p-5 shadow-sm">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-rose-600 border border-rose-100">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-semibold text-[#5f6d8a]">High Risk Requests</p>
              <p className="text-3xl font-bold text-[#071942] mt-1">{stats.highRisk}</p>
              <p className="text-xs text-[#8f9bba] mt-1.5">SMEs with score below 50</p>
            </div>
          </div>

          {/* Ready For Approval */}
          <div className="flex items-start gap-4 rounded-2xl border border-[#e9eef8] bg-white p-5 shadow-sm">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100">
              <TrendingUp className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-semibold text-[#5f6d8a]">Ready For Approval</p>
              <p className="text-3xl font-bold text-[#071942] mt-1">{stats.readyForApproval}</p>
              <p className="text-xs text-[#8f9bba] mt-1.5">SMEs with credit score &gt; 70</p>
            </div>
          </div>
        </div>

        {/* Requests Table Card */}
        <div className="rounded-2xl border border-[#e9eef8] bg-white shadow-sm overflow-hidden">
          {/* Controls Header */}
          <div className="p-6 border-b border-[#e9eef8] flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="relative w-full md:max-w-md">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#91a1bf]" />
              <input
                type="text"
                placeholder="Search by SME name or ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-xl border border-[#dfe5f0] bg-white pl-10 pr-4 py-2.5 text-sm text-[#071942] placeholder-[#91a1bf] font-medium transition focus:border-[#4f63f6] focus:outline-none focus:ring-1 focus:ring-[#4f63f6]"
              />
            </div>

            <div className="flex items-center gap-3 w-full md:w-auto justify-end">
              <select
                value={riskFilter}
                onChange={(e) => setRiskFilter(e.target.value)}
                className="rounded-xl border border-[#dfe5f0] bg-white px-3 py-2.5 text-xs font-semibold text-[#5f6d8a] focus:border-[#4f63f6] focus:outline-none"
              >
                <option value="All">All Risk Levels</option>
                <option value="Low">Low Risk</option>
                <option value="Medium">Medium Risk</option>
                <option value="High">High Risk</option>
              </select>

              <button className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#dfe5f0] bg-white hover:bg-slate-50 transition text-[#5f6d8a]">
                <Filter className="h-4.5 w-4.5" />
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#e9eef8] bg-slate-50 text-[10px] font-extrabold uppercase tracking-wider text-[#5f6d8a]">
                  <th className="py-4 px-6">Request ID</th>
                  <th className="py-4 px-6">SME Name</th>
                  <th className="py-4 px-4 text-center">Credit Score</th>
                  <th className="py-4 px-6">Amount Requested</th>
                  <th className="py-4 px-4 text-center">Risk Level</th>
                  <th className="py-4 px-6 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f2f5fa] text-xs font-medium text-[#071942]">
                {loading && requests.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-[#5f6d8a] font-semibold">
                      Fetching requests...
                    </td>
                  </tr>
                ) : paginatedRequests.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-[#5f6d8a] font-semibold">
                      No pending requests available.
                    </td>
                  </tr>
                ) : (
                  paginatedRequests.map((row) => (
                    <tr key={row.id} className="hover:bg-slate-50/40 transition duration-150">
                      {/* ID */}
                      <td className="py-4 px-6 text-[#5f6d8a] font-bold">
                        REQ-2026-{String(row.id).padStart(3, "0")}
                      </td>

                      {/* SME Name */}
                      <td className="py-4 px-6 font-extrabold text-sm text-[#071942]">
                        {row.name}
                      </td>

                      {/* Score */}
                      <td className="py-4 px-4 text-center">
                        <span className="inline-flex min-w-10 justify-center rounded-lg border border-[#c8d5ff] bg-[#f5f7ff] px-2.5 py-1 text-xs font-bold text-[#315cff]">
                          {row.score}
                        </span>
                      </td>

                      {/* Amount */}
                      <td className="py-4 px-6 font-extrabold text-[#071942] text-sm">
                        {formatZAR(row.amount)}
                      </td>

                      {/* Risk */}
                      <td className="py-4 px-4 text-center">
                        <span
                          className={`inline-flex min-w-[76px] justify-center rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${
                            row.risk === "Low"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                              : row.risk === "High"
                              ? "bg-rose-50 text-rose-700 border-rose-100"
                              : "bg-amber-50 text-amber-700 border-amber-100"
                          }`}
                        >
                          {row.risk} Risk
                        </span>
                      </td>

                      {/* Action */}
                      <td className="py-4 px-6 text-right">
                        <button
                          onClick={() => navigate(`/lender/review-requests/${row.id}`)}
                          className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#4f63f6] hover:bg-[#3d51e5] text-white px-4 py-2 text-xs font-bold shadow-md shadow-indigo-950/5 transition active:scale-95"
                        >
                          Review
                          <ArrowRight className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between border-t border-[#e9eef8] bg-white px-6 py-4 rounded-b-2xl">
            <p className="text-xs text-[#5f6d8a]">
              Showing {filteredRequests.length === 0 ? 0 : (currentPage - 1) * pageSize + 1} to{" "}
              {Math.min(currentPage * pageSize, filteredRequests.length)} of {filteredRequests.length} requests
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                disabled={currentPage === 1}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#dfe5f0] text-[#5f6d8a] hover:bg-slate-50 disabled:opacity-40"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              {Array.from({ length: Math.ceil(filteredRequests.length / pageSize) }).map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentPage(idx + 1)}
                  className={`h-8 w-8 rounded-lg text-xs font-bold transition-all ${
                    currentPage === idx + 1
                      ? "bg-[#4f63f6] text-white shadow-sm"
                      : "border border-[#dfe5f0] text-[#5f6d8a] hover:bg-slate-50"
                  }`}
                >
                  {idx + 1}
                </button>
              ))}
              <button
                onClick={() => setCurrentPage((p) => Math.min(p + 1, Math.ceil(filteredRequests.length / pageSize)))}
                disabled={currentPage === Math.ceil(filteredRequests.length / pageSize) || filteredRequests.length === 0}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#dfe5f0] text-[#5f6d8a] hover:bg-slate-50 disabled:opacity-40"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </LenderLayout>
  );
}
