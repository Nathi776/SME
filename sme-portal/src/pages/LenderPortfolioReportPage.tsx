import React, { useEffect, useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  TrendingUp,
  Coins,
  Briefcase,
  Shield,
  Search,
  Filter,
  Download,
  Share2,
  FileSpreadsheet,
  FileText,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Info,
  CheckCircle2,
  Eye,
  Calendar,
  AlertTriangle,
  ArrowRight
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell
} from "recharts";
import LenderLayout from "../components/lender/LenderLayout";
import { LenderApi, type FinanceRequest, type AvailableSme } from "../api/lenderApi";
import { formatZAR } from "../utils/format";
import { useSnackbar } from "notistack";

interface DealRow {
  id: string;
  sme_name: string;
  industry: string;
  invoice_amount: number;
  funded_amount: number;
  funding_date: string;
  term: number;
  interest_rate: number;
  expected_return: number;
  status: "Active" | "Repaid" | "Overdue" | "Defaulted" | "Cancelled";
  risk_level: "Low" | "Medium" | "High";
}

const MOCK_DEALS: DealRow[] = [
  { id: "FD-2026-001", sme_name: "ABC Construction (Pty) Ltd", industry: "Construction", invoice_amount: 95000, funded_amount: 85000, funding_date: "20 May 2026", term: 30, interest_rate: 12, expected_return: 8500, status: "Active", risk_level: "Low" },
  { id: "FD-2026-002", sme_name: "Metro Hardware Supplies", industry: "Retail", invoice_amount: 150000, funded_amount: 120000, funding_date: "18 May 2026", term: 45, interest_rate: 15, expected_return: 18000, status: "Active", risk_level: "Medium" },
  { id: "FD-2026-003", sme_name: "City Power Solutions (Pty) Ltd", industry: "Utilities", invoice_amount: 70000, funded_amount: 60000, funding_date: "17 May 2026", term: 30, interest_rate: 11, expected_return: 6600, status: "Repaid", risk_level: "Low" },
  { id: "FD-2026-004", sme_name: "Green Home Supplies", industry: "Retail", invoice_amount: 100000, funded_amount: 80000, funding_date: "12 May 2026", term: 60, interest_rate: 14, expected_return: 11200, status: "Overdue", risk_level: "High" },
  { id: "FD-2026-005", sme_name: "Fresh Food Distributors", industry: "Agriculture", invoice_amount: 75000, funded_amount: 75000, funding_date: "10 May 2026", term: 30, interest_rate: 12, expected_return: 7500, status: "Repaid", risk_level: "Low" },
  { id: "FD-2026-006", sme_name: "Apex Engineering Works", industry: "Manufacturing", invoice_amount: 200000, funded_amount: 160000, funding_date: "05 May 2026", term: 60, interest_rate: 13, expected_return: 20800, status: "Repaid", risk_level: "Medium" },
  { id: "FD-2026-007", sme_name: "Gauteng Transport Logistics", industry: "Logistics", invoice_amount: 110000, funded_amount: 95000, funding_date: "28 Apr 2026", term: 30, interest_rate: 12, expected_return: 9500, status: "Repaid", risk_level: "Low" },
  { id: "FD-2026-008", sme_name: "Cape IT Consulting", industry: "Technology", invoice_amount: 80000, funded_amount: 70000, funding_date: "25 Apr 2026", term: 30, interest_rate: 10, expected_return: 7000, status: "Defaulted", risk_level: "Medium" }
];

// Recharts Static Data
const GROWTH_DATA = [
  { name: "Jan 2026", invested: 800000, returns: 50000 },
  { name: "Feb 2026", invested: 1200000, returns: 75000 },
  { name: "Mar 2026", invested: 1600000, returns: 100000 },
  { name: "Apr 2026", invested: 2000000, returns: 130000 },
  { name: "May 2026", invested: 2400000, returns: 180000 }
];

const ALLOCATION_DATA = [
  { name: "Construction", value: 840000, percent: 35, fill: "#4f63f6" },
  { name: "Retail", value: 600000, percent: 25, fill: "#f59e0b" },
  { name: "Manufacturing", value: 480000, percent: 20, fill: "#10b981" },
  { name: "Technology", value: 360000, percent: 15, fill: "#8b7cff" },
  { name: "Agriculture", value: 120000, percent: 5, fill: "#38bdf8" }
];

const STATUS_DATA = [
  { name: "Active", value: 32, fill: "#4f63f6" },
  { name: "Repaid", value: 22, fill: "#10b981" },
  { name: "Overdue", value: 4, fill: "#f59e0b" },
  { name: "Defaulted", value: 2, fill: "#ef4444" },
  { name: "Cancelled", value: 4, fill: "#94a3b8" }
];

export default function LenderPortfolioReportPage() {
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();

  const [dbRequests, setDbRequests] = useState<FinanceRequest[]>([]);
  const [availableSmes, setAvailableSmes] = useState<AvailableSme[]>([]);
  const [loading, setLoading] = useState(false);

  // Filter and Search states
  const [searchValue, setSearchValue] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [industryFilter, setIndustryFilter] = useState("All");
  const [riskFilter, setRiskFilter] = useState("All");

  // Debounce search query
  useEffect(() => {
    const handler = setTimeout(() => {
      setSearchQuery(searchValue);
      setCurrentPage(1); // Reset page on search
    }, 300);

    return () => {
      clearTimeout(handler);
    };
  }, [searchValue]);
  const [activeTab, setActiveTab] = useState<"All" | "Active" | "Repaid" | "Overdue" | "Defaulted" | "Cancelled">("All");

  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 5;

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [requestsRes, smesRes] = await Promise.all([
        LenderApi.getPendingRequests(),
        LenderApi.getAvailableSMEs()
      ]);
      setDbRequests(requestsRes.data || []);
      setAvailableSmes(smesRes.data || []);
    } catch (err) {
      console.error(err);
      enqueueSnackbar("Failed to fetch current request records.", { variant: "error" });
    } finally {
      setLoading(false);
    }
  }, [enqueueSnackbar]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Merge database items
  const smesById = useMemo(() => {
    const map: Record<number, AvailableSme> = {};
    availableSmes.forEach((sme) => {
      map[sme.sme_id] = sme;
    });
    return map;
  }, [availableSmes]);

  const allDeals = useMemo(() => {
    const list: DealRow[] = [];

    // Map database approved/funded transactions if any
    dbRequests.forEach((req) => {
      if (req.status === "approved" || req.status === "funded" || req.status === "paid" || req.status === "closed") {
        const sme = smesById[req.sme_id];
        const name = sme?.company_name || `SME ${req.sme_id}`;
        const requested = Number(req.amount_requested);
        const invoice = Math.round(requested * 1.15);
        const dateStr = new Date(req.created_at).toLocaleDateString("en-ZA", {
          day: "2-digit",
          month: "short",
          year: "numeric"
        });

        let mappedStatus: "Active" | "Repaid" | "Overdue" | "Defaulted" | "Cancelled" = "Active";
        if (req.status === "paid" || req.status === "closed") mappedStatus = "Repaid";

        list.push({
          id: `FD-2026-${String(req.id).padStart(3, "0")}`,
          sme_name: name,
          industry: sme?.industry || "Services",
          invoice_amount: invoice,
          funded_amount: requested,
          funding_date: dateStr,
          term: 30,
          interest_rate: Math.round(req.fee_rate * 100) || 12,
          expected_return: Number(req.platform_fee) || Math.round(requested * 0.12),
          status: mappedStatus,
          risk_level: (sme?.risk_level || "Low") as any
        });
      }
    });

    // Populate with mock list
    MOCK_DEALS.forEach((mock) => {
      if (!list.some((r) => r.id === mock.id)) {
        list.push(mock);
      }
    });

    return list;
  }, [dbRequests, smesById]);

  // Tab Filtering & Query Searches
  const filteredDeals = useMemo(() => {
    let list = [...allDeals];

    // Status Tab Filter
    if (activeTab !== "All") {
      list = list.filter((d) => d.status === activeTab);
    }

    // Search query
    if (searchQuery.trim() !== "") {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (d) =>
          d.sme_name.toLowerCase().includes(q) ||
          d.industry.toLowerCase().includes(q) ||
          d.id.toLowerCase().includes(q)
      );
    }

    // Industry Filter
    if (industryFilter !== "All") {
      list = list.filter((d) => d.industry === industryFilter);
    }

    // Risk Filter
    if (riskFilter !== "All") {
      list = list.filter((d) => d.risk_level === riskFilter);
    }

    return list;
  }, [allDeals, activeTab, searchQuery, industryFilter, riskFilter]);

  // Unique Industry list
  const industries = useMemo(() => {
    const set = new Set<string>();
    allDeals.forEach((d) => set.add(d.industry));
    return Array.from(set);
  }, [allDeals]);

  // Pagination
  const paginatedDeals = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredDeals.slice(start, start + pageSize);
  }, [filteredDeals, currentPage]);

  const handleExport = (format: string) => {
    enqueueSnackbar(`Generating and exporting portfolio report as ${format}...`, {
      variant: "success"
    });
  };

  return (
    <LenderLayout>
      <div className="space-y-6 text-[#071942] max-w-[1600px] px-6 mx-auto pb-12">
        
        {/* Header Title Section */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-[#071942]">Portfolio Report</h1>
            <p className="text-sm text-[#5f6d8a] mt-0.5">Overview of your lending portfolio performance and analytics.</p>
          </div>

          <div className="flex items-center gap-3">
            {/* Date Picker Button Mock */}
            <div className="flex items-center gap-2 rounded-xl border border-[#dfe5f0] bg-white px-3.5 py-2 text-xs font-bold text-[#5f6d8a]">
              <Calendar className="h-4 w-4 text-[#91a1bf]" />
              <span>01 Jan 2026 - 30 May 2026</span>
            </div>

            {/* Export Dropdown */}
            <div className="relative group">
              <button className="flex items-center gap-1.5 rounded-xl bg-[#4f63f6] hover:bg-[#3d51e5] px-4.5 py-2.5 text-xs font-bold text-white shadow-md shadow-indigo-950/10 transition active:scale-95">
                <Download className="h-4 w-4" />
                <span>Export Report</span>
              </button>
              <div className="absolute right-0 top-full mt-2 w-48 bg-white border border-[#e9eef8] rounded-xl shadow-xl py-2 hidden group-hover:block z-30 font-semibold text-xs text-[#071942]">
                <button onClick={() => handleExport("PDF")} className="w-full text-left px-4 py-2 hover:bg-slate-50 flex items-center gap-2">
                  <FileText className="h-4 w-4 text-rose-500" /> Download PDF Report
                </button>
                <button onClick={() => handleExport("Excel")} className="w-full text-left px-4 py-2 hover:bg-slate-50 flex items-center gap-2">
                  <FileSpreadsheet className="h-4 w-4 text-emerald-500" /> Export Excel
                </button>
                <button onClick={() => handleExport("Share")} className="w-full text-left px-4 py-2 hover:bg-slate-50 flex items-center gap-2">
                  <Share2 className="h-4 w-4 text-indigo-500" /> Share Report
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* 5 Top KPI Cards Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          
          {/* Card 1 */}
          <div className="rounded-2xl border border-[#e9eef8] bg-white p-5 shadow-sm flex items-start gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-[#4f63f6] border border-indigo-100">
              <Briefcase className="h-5.5 w-5.5" />
            </div>
            <div>
              <p className="text-[11px] font-bold text-[#8f9bba] uppercase tracking-wide">Total Invested</p>
              <p className="text-2xl font-black text-[#071942] mt-1">R 2,400,000.00</p>
              <p className="text-[10px] text-[#8f9bba] mt-0.5">Across 32 deals</p>
            </div>
          </div>

          {/* Card 2 */}
          <div className="rounded-2xl border border-[#e9eef8] bg-white p-5 shadow-sm flex items-start gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100">
              <Coins className="h-5.5 w-5.5" />
            </div>
            <div>
              <p className="text-[11px] font-bold text-[#8f9bba] uppercase tracking-wide">Total Returns (Received)</p>
              <p className="text-2xl font-black text-[#071942] mt-1">R 180,000.00</p>
              <p className="text-[10px] text-[#8f9bba] mt-0.5">7.5% of invested capital</p>
            </div>
          </div>

          {/* Card 3 */}
          <div className="rounded-2xl border border-[#e9eef8] bg-white p-5 shadow-sm flex items-start gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600 border border-amber-100">
              <TrendingUp className="h-5.5 w-5.5" />
            </div>
            <div>
              <p className="text-[11px] font-bold text-[#8f9bba] uppercase tracking-wide">Expected Returns</p>
              <p className="text-2xl font-black text-[#071942] mt-1">R 320,000.00</p>
              <p className="text-[10px] text-[#8f9bba] mt-0.5">13.3% expected yield</p>
            </div>
          </div>

          {/* Card 4 */}
          <div className="rounded-2xl border border-[#e9eef8] bg-white p-5 shadow-sm flex items-start gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 border border-blue-100">
              <CheckCircle2 className="h-5.5 w-5.5" />
            </div>
            <div>
              <p className="text-[11px] font-bold text-[#8f9bba] uppercase tracking-wide">Active Deals</p>
              <p className="text-2xl font-black text-[#071942] mt-1">32</p>
              <p className="text-[10px] text-[#8f9bba] mt-0.5">Currently funded</p>
            </div>
          </div>

          {/* Card 5 */}
          <div className="rounded-2xl border border-[#e9eef8] bg-white p-5 shadow-sm flex items-start gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-[#009a65] border border-emerald-100">
              <Coins className="h-5.5 w-5.5" />
            </div>
            <div>
              <p className="text-[11px] font-bold text-[#8f9bba] uppercase tracking-wide">Available Capital</p>
              <p className="text-2xl font-black text-[#071942] mt-1">R 500,000.00</p>
              <p className="text-[10px] text-[#8f9bba] mt-0.5">Ready to invest</p>
            </div>
          </div>

        </div>

        {/* Charts Row Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          
          {/* Left Column (Growth and Allocation) */}
          <div className="xl:col-span-2 space-y-6">
            
            {/* Chart 1: Portfolio Growth */}
            <div className="rounded-2xl border border-[#e9eef8] bg-white p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-[#f2f5fa] pb-3">
                <div className="flex items-center gap-1.5">
                  <h3 className="text-[15px] font-extrabold text-[#071942]">Portfolio Growth</h3>
                  <button onClick={() => enqueueSnackbar("Displays cumulative investment capital vs collected interest yields.", { variant: "info" })}>
                    <Info className="h-4 w-4 text-[#8f9bba] hover:text-[#071942]" />
                  </button>
                </div>
                
                <select className="rounded-lg border border-[#dfe5f0] bg-white px-2 py-1.5 text-[10px] font-bold text-[#5f6d8a]">
                  <option>Monthly</option>
                  <option>Quarterly</option>
                  <option>Yearly</option>
                </select>
              </div>

              {/* Chart container */}
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={GROWTH_DATA} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorInvested" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#4f63f6" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#4f63f6" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorReturns" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} tickLine={false} />
                    <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} tickFormatter={(v) => `R ${(v / 1000).toFixed(0)}k`} />
                    <Tooltip formatter={(value) => [`R ${Number(value).toLocaleString()}`]} />
                    <Area type="monotone" dataKey="invested" name="Total Invested" stroke="#4f63f6" strokeWidth={2.5} fillOpacity={1} fill="url(#colorInvested)" />
                    <Area type="monotone" dataKey="returns" name="Returns (Cumulative)" stroke="#10b981" strokeWidth={2.5} fillOpacity={1} fill="url(#colorReturns)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Chart 2: Portfolio Allocation by Industry */}
            <div className="rounded-2xl border border-[#e9eef8] bg-white p-6 shadow-sm space-y-4">
              <h3 className="text-[15px] font-extrabold text-[#071942] border-b border-[#f2f5fa] pb-3">Portfolio Allocation by Industry</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                {/* Donut Chart */}
                <div className="md:col-span-5 h-56 flex items-center justify-center relative">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={ALLOCATION_DATA}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={80}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {ALLOCATION_DATA.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v) => `R ${Number(v).toLocaleString()}`} />
                    </PieChart>
                  </ResponsiveContainer>
                  {/* Center Text */}
                  <div className="absolute flex flex-col items-center">
                    <span className="text-xs font-semibold text-[#8f9bba] uppercase">Total Invested</span>
                    <span className="text-base font-black text-[#071942] mt-0.5">R 2.40M</span>
                  </div>
                </div>

                {/* Legend Values */}
                <div className="md:col-span-7 space-y-2.5 text-xs">
                  {ALLOCATION_DATA.map((entry) => (
                    <div key={entry.name} className="flex items-center justify-between border-b border-dashed border-[#f2f5fa] pb-2 last:border-0">
                      <div className="flex items-center gap-2">
                        <div className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: entry.fill }} />
                        <span className="font-bold text-[#071942]">{entry.name}</span>
                      </div>
                      <div className="text-right">
                        <span className="font-black text-[#071942]">{entry.percent}%</span>
                        <span className="text-[10px] text-[#8f9bba] font-bold ml-2">({formatZAR(entry.value)})</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

          </div>

          {/* Right Column (Risk Score, Status, AI insights) */}
          <div className="space-y-6">
            
            {/* Risk Overview Card */}
            <div className="rounded-2xl border border-[#e9eef8] bg-white p-6 shadow-sm space-y-4">
              <div className="flex items-center gap-1.5 border-b border-[#f2f5fa] pb-3">
                <h3 className="text-[15px] font-extrabold text-[#071942]">Portfolio Risk Overview</h3>
                <button onClick={() => enqueueSnackbar("Calculates weighted exposure across low, medium, and high credit thresholds.", { variant: "info" })}>
                  <Info className="h-4 w-4 text-[#8f9bba] hover:text-[#071942]" />
                </button>
              </div>

              <div className="space-y-3.5 text-xs border-b border-[#f2f5fa] pb-4">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <div className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                    <span className="font-bold text-[#5f6d8a]">Low Risk Deals</span>
                  </div>
                  <span className="font-extrabold text-[#071942]">18 <span className="text-[#8f9bba] font-semibold">(56%)</span></span>
                </div>
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <div className="h-2.5 w-2.5 rounded-full bg-amber-500" />
                    <span className="font-bold text-[#5f6d8a]">Medium Risk Deals</span>
                  </div>
                  <span className="font-extrabold text-[#071942]">9 <span className="text-[#8f9bba] font-semibold">(28%)</span></span>
                </div>
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <div className="h-2.5 w-2.5 rounded-full bg-rose-500" />
                    <span className="font-bold text-[#5f6d8a]">High Risk Deals</span>
                  </div>
                  <span className="font-extrabold text-[#071942]">5 <span className="text-[#8f9bba] font-semibold">(16%)</span></span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <div>
                  <p className="text-[10px] font-bold text-[#8f9bba] uppercase tracking-wide">Portfolio Risk Score</p>
                  <p className="text-2xl font-black text-[#071942] mt-1">
                    72<span className="text-xs text-[#8f9bba] font-semibold"> /100</span>
                  </p>
                  <p className="text-[9px] text-[#8f9bba] font-bold mt-1">Your risk index is in a healthy range.</p>
                </div>
                <span className="rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700 border border-emerald-100">
                  Good
                </span>
              </div>
            </div>

            {/* AI Insights & Recommendation Panel */}
            <div className="rounded-2xl border border-indigo-100 bg-indigo-50/20 p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-indigo-100/50 pb-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4.5 w-4.5 text-[#4f63f6]" />
                  <h3 className="text-[15px] font-extrabold text-[#071942]">AI Insights</h3>
                </div>
                <span className="rounded bg-indigo-50 px-2 py-0.5 text-[9px] font-black text-[#4f63f6] border border-indigo-100">
                  Health: 84%
                </span>
              </div>

              <ul className="space-y-3.5 text-xs text-[#5f6d8a] leading-normal font-semibold">
                <li className="flex items-start gap-2.5">
                  <div className="h-1.5 w-1.5 rounded-full bg-[#4f63f6] shrink-0 mt-1.5" />
                  <span>Construction sector is performing above average with 14% returns.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <div className="h-1.5 w-1.5 rounded-full bg-[#4f63f6] shrink-0 mt-1.5" />
                  <span>Repayment success rate increased by 6% compared to last quarter.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <div className="h-1.5 w-1.5 rounded-full bg-[#4f63f6] shrink-0 mt-1.5" />
                  <span>Consider increasing allocation in Manufacturing sector.</span>
                </li>
              </ul>

              <button 
                onClick={() => enqueueSnackbar("The AI Portfolio Advisory Engine is generating full forecasts...", { variant: "info" })}
                className="w-full rounded-xl bg-white border border-[#dfe5f0] py-2.5 text-xs font-bold text-[#071942] hover:bg-slate-50 transition flex items-center justify-center gap-1 shadow-sm"
              >
                <span>View full insights report</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>

          </div>

        </div>

        {/* Returns & Deal Status Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          
          {/* Returns Breakdown */}
          <div className="rounded-2xl border border-[#e9eef8] bg-white p-6 shadow-sm space-y-4">
            <h3 className="text-[15px] font-extrabold text-[#071942] border-b border-[#f2f5fa] pb-3">Returns Breakdown</h3>
            
            <div className="space-y-3.5 text-xs">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <div className="h-2.5 w-2.5 rounded-full bg-[#4f63f6]" />
                  <span className="font-bold text-[#5f6d8a]">Expected Returns</span>
                </div>
                <span className="font-black text-[#071942]">R 320,000.00</span>
              </div>
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <div className="h-2.5 w-2.5 rounded-full bg-[#10b981]" />
                  <span className="font-bold text-[#5f6d8a]">Received Returns</span>
                </div>
                <span className="font-black text-[#071942]">R 180,000.00</span>
              </div>
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <div className="h-2.5 w-2.5 rounded-full bg-amber-500" />
                  <span className="font-bold text-[#5f6d8a]">Pending Returns</span>
                </div>
                <span className="font-black text-[#071942]">R 140,000.00</span>
              </div>
              
              <div className="flex justify-between items-center border-t border-dashed border-[#dfe5f0] pt-3">
                <span className="font-extrabold text-[#071942]">Collection Rate</span>
                <span className="font-black text-emerald-600">56.3%</span>
              </div>
            </div>
          </div>

          {/* Deal Status Summary */}
          <div className="rounded-2xl border border-[#e9eef8] bg-white p-6 shadow-sm space-y-4">
            <h3 className="text-[15px] font-extrabold text-[#071942] border-b border-[#f2f5fa] pb-3">Deal Status Summary</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
              {/* Pie Chart */}
              <div className="md:col-span-5 h-44 flex items-center justify-center relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={STATUS_DATA}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={60}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {STATUS_DATA.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute flex flex-col items-center">
                  <span className="text-[14px] font-black text-[#071942]">64</span>
                  <span className="text-[8px] font-bold text-[#8f9bba] uppercase">Deals</span>
                </div>
              </div>

              {/* Status List */}
              <div className="md:col-span-7 space-y-1.5 text-[11px]">
                {STATUS_DATA.map((entry) => (
                  <div key={entry.name} className="flex items-center justify-between pb-1">
                    <div className="flex items-center gap-1.5">
                      <div className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: entry.fill }} />
                      <span className="font-bold text-[#5f6d8a]">{entry.name}</span>
                    </div>
                    <span className="font-black text-[#071942]">
                      {entry.value} <span className="text-[#8f9bba] font-bold font-mono text-[9px]">({Math.round((entry.value / 64) * 100)}%)</span>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Top Performing SMEs */}
          <div className="rounded-2xl border border-[#e9eef8] bg-white p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-[#f2f5fa] pb-3">
              <h3 className="text-[15px] font-extrabold text-[#071942]">Top Performing SMEs</h3>
              <button onClick={() => navigate("/lender/lenders-smes")} className="text-[10px] font-bold text-[#4f63f6] hover:underline">View all</button>
            </div>

            <div className="space-y-3">
              {[
                { rank: 1, name: "ABC Construction (Pty) Ltd", count: 12, rate: 98 },
                { rank: 2, name: "City Power Solutions (Pty) Ltd", count: 8, rate: 96 },
                { rank: 3, name: "Metro Hardware Supplies", count: 6, rate: 94 }
              ].map((sme) => (
                <div key={sme.rank} className="flex items-center justify-between text-xs pb-2 border-b border-dashed border-[#f2f5fa] last:border-0 last:pb-0">
                  <div className="flex items-center gap-3">
                    <div className="h-6 w-6 rounded-lg bg-slate-100 flex items-center justify-center font-extrabold text-[11px] text-[#5f6d8a]">
                      {sme.rank}
                    </div>
                    <div>
                      <p className="font-extrabold text-[#071942] truncate max-w-[150px]">{sme.name}</p>
                      <p className="text-[9px] text-[#8f9bba] mt-0.5">{sme.count} Deals Funded</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100/50">
                    {sme.rate}% Success Rate
                  </span>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Funded Deals Table */}
        <div className="rounded-2xl border border-[#e9eef8] bg-white shadow-sm overflow-hidden">
          
          {/* Table Header Controls */}
          <div className="p-6 border-b border-[#e9eef8] space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <h3 className="text-base font-extrabold text-[#071942]">Funded Deals</h3>
              
              <div className="flex flex-wrap items-center gap-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#91a1bf]" />
                  <input
                    type="text"
                    placeholder="Search deals..."
                    value={searchValue}
                    onChange={(e) => setSearchValue(e.target.value)}
                    className="rounded-xl border border-[#dfe5f0] bg-white pl-9 pr-4 py-2 text-xs text-[#071942] placeholder-[#91a1bf] font-medium transition focus:border-[#4f63f6] focus:outline-none w-56"
                  />
                </div>

                <select
                  value={industryFilter}
                  onChange={(e) => setIndustryFilter(e.target.value)}
                  className="rounded-xl border border-[#dfe5f0] bg-white px-3 py-2 text-xs font-semibold text-[#5f6d8a] focus:border-[#4f63f6] focus:outline-none"
                >
                  <option value="All">All Industries</option>
                  {industries.map((ind) => (
                    <option key={ind} value={ind}>{ind}</option>
                  ))}
                </select>

                <select
                  value={riskFilter}
                  onChange={(e) => setRiskFilter(e.target.value)}
                  className="rounded-xl border border-[#dfe5f0] bg-white px-3 py-2 text-xs font-semibold text-[#5f6d8a] focus:border-[#4f63f6] focus:outline-none"
                >
                  <option value="All">All Risks</option>
                  <option value="Low">Low Risk</option>
                  <option value="Medium">Medium Risk</option>
                  <option value="High">High Risk</option>
                </select>
              </div>
            </div>

            {/* Filter Tabs */}
            <div className="flex flex-wrap items-center gap-2 border-t border-[#f2f5fa] pt-4">
              {[
                { key: "All", count: allDeals.length },
                { key: "Active", count: allDeals.filter((d) => d.status === "Active").length },
                { key: "Repaid", count: allDeals.filter((d) => d.status === "Repaid").length },
                { key: "Overdue", count: allDeals.filter((d) => d.status === "Overdue").length },
                { key: "Defaulted", count: allDeals.filter((d) => d.status === "Defaulted").length },
                { key: "Cancelled", count: allDeals.filter((d) => d.status === "Cancelled").length }
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => {
                    setActiveTab(tab.key as any);
                    setCurrentPage(1);
                  }}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                    activeTab === tab.key
                      ? "bg-[#4f63f6] text-white shadow-sm"
                      : "border border-[#dfe5f0] text-[#5f6d8a] hover:bg-slate-50"
                  }`}
                >
                  <span>{tab.key}</span>
                  <span className={`inline-block px-1.5 py-0.2 rounded-full text-[9px] font-black ${
                    activeTab === tab.key ? "bg-white/20 text-white" : "bg-slate-100 text-[#5f6d8a]"
                  }`}>{tab.count}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Mobile Card Fallback (hidden on md and above) */}
          <div className="block md:hidden divide-y divide-[#f2f5fa] bg-white">
            {loading && paginatedDeals.length === 0 ? (
              <div className="py-12 text-center text-[#5f6d8a] font-bold text-xs">
                Loading funded transactions...
              </div>
            ) : paginatedDeals.length === 0 ? (
              <div className="py-12 text-center text-[#5f6d8a] font-bold text-xs">
                No deals available under selected criteria.
              </div>
            ) : (
              paginatedDeals.map((deal) => (
                <div key={deal.id} className="p-5 space-y-3.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#5f6d8a]">{deal.id}</span>
                    <div className="flex gap-2">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase ${
                        deal.status === "Active"
                          ? "bg-blue-50 text-blue-700 border border-blue-100"
                          : deal.status === "Repaid"
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                          : deal.status === "Overdue"
                          ? "bg-amber-50 text-amber-700 border border-amber-100"
                          : "bg-rose-50 text-rose-700 border border-rose-100"
                      }`}>
                        {deal.status}
                      </span>
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-[9px] font-bold border ${
                        deal.risk_level === "Low"
                          ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                          : deal.risk_level === "High"
                          ? "bg-rose-50 text-rose-700 border-rose-100"
                          : "bg-amber-50 text-amber-700 border-amber-100"
                      }`}>
                        {deal.risk_level} Risk
                      </span>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-extrabold text-[#071942]">{deal.sme_name}</h4>
                    <p className="text-[10px] text-[#8f9bba] mt-0.5">{deal.industry} • Funded on {deal.funding_date}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-y-3 gap-x-2 pt-3 border-t border-[#f2f5fa] text-xs">
                    <div>
                      <span className="text-[#8f9bba] block text-[9px] uppercase font-bold">Funded Amount</span>
                      <span className="font-extrabold text-[#071942]">{formatZAR(deal.funded_amount)}</span>
                      <span className="text-[9px] text-[#8f9bba] block">Inv: {formatZAR(deal.invoice_amount)}</span>
                    </div>
                    <div>
                      <span className="text-[#8f9bba] block text-[9px] uppercase font-bold">Expected Return</span>
                      <span className="font-black text-emerald-600">{formatZAR(deal.expected_return)}</span>
                      <span className="text-[9px] text-[#8f9bba] block">Yield: {deal.interest_rate}%</span>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-[#f2f5fa] flex items-center justify-between text-xs">
                    <span className="text-[10px] text-[#8f9bba] font-bold">Term: {deal.term} Days</span>
                    <button
                      onClick={() => navigate(`/lender/review-requests/${deal.id.split("-").pop()}`)}
                      className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-[#dfe5f0] bg-white hover:bg-slate-50 text-[#071942] px-3.5 py-2 text-xs font-bold transition active:scale-95"
                    >
                      View Details
                      <ArrowRight className="h-3.5 w-3.5 text-[#91a1bf]" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Table Container */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#e9eef8] bg-slate-50 text-[10px] font-extrabold uppercase tracking-wider text-[#5f6d8a]">
                  <th className="py-4 px-6">Deal ID</th>
                  <th className="py-4 px-6">SME Name</th>
                  <th className="py-4 px-4">Industry</th>
                  <th className="py-4 px-4 text-right">Invoice Amount</th>
                  <th className="py-4 px-4 text-right">Funded Amount</th>
                  <th className="py-4 px-4">Funding Date</th>
                  <th className="py-4 px-4">Term</th>
                  <th className="py-4 px-4 text-center">Interest</th>
                  <th className="py-4 px-4 text-right">Expected Return</th>
                  <th className="py-4 px-4 text-center">Status</th>
                  <th className="py-4 px-4 text-center">Risk Level</th>
                  <th className="py-4 px-6 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f2f5fa] text-xs font-semibold text-[#071942]">
                {loading && paginatedDeals.length === 0 ? (
                  <tr>
                    <td colSpan={12} className="py-12 text-center text-[#5f6d8a] font-bold">
                      Loading funded transactions...
                    </td>
                  </tr>
                ) : paginatedDeals.length === 0 ? (
                  <tr>
                    <td colSpan={12} className="py-12 text-center text-[#5f6d8a] font-bold">
                      No deals available under selected criteria.
                    </td>
                  </tr>
                ) : (
                  paginatedDeals.map((deal) => (
                    <tr key={deal.id} className="hover:bg-slate-50/40 transition duration-150">
                      <td className="py-4 px-6 font-bold text-[#5f6d8a]">{deal.id}</td>
                      <td className="py-4 px-6 font-extrabold text-sm">{deal.sme_name}</td>
                      <td className="py-4 px-4">{deal.industry}</td>
                      <td className="py-4 px-4 text-right font-bold">{formatZAR(deal.invoice_amount)}</td>
                      <td className="py-4 px-4 text-right font-extrabold text-[#071942]">{formatZAR(deal.funded_amount)}</td>
                      <td className="py-4 px-4">{deal.funding_date}</td>
                      <td className="py-4 px-4">{deal.term} Days</td>
                      <td className="py-4 px-4 text-center font-bold">{deal.interest_rate}%</td>
                      <td className="py-4 px-4 text-right font-black text-emerald-600">{formatZAR(deal.expected_return)}</td>
                      <td className="py-4 px-4 text-center">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase ${
                          deal.status === "Active"
                            ? "bg-blue-50 text-blue-700 border border-blue-100"
                            : deal.status === "Repaid"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                            : deal.status === "Overdue"
                            ? "bg-amber-50 text-amber-700 border border-amber-100 animate-none"
                            : "bg-rose-50 text-rose-700 border border-rose-100"
                        }`}>
                          {deal.status}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[9px] font-bold border ${
                          deal.risk_level === "Low"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                            : deal.risk_level === "High"
                            ? "bg-rose-50 text-rose-700 border-rose-100"
                            : "bg-amber-50 text-amber-700 border-amber-100"
                        }`}>
                          {deal.risk_level}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => navigate(`/lender/review-requests/${deal.id.split("-").pop()}`)}
                            title="View deal record"
                            className="p-1.5 rounded-lg border border-[#dfe5f0] text-[#5f6d8a] hover:text-[#4f63f6] hover:bg-[#f5f7ff] transition"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleExport(deal.id)}
                            title="Download deal report"
                            className="p-1.5 rounded-lg border border-[#dfe5f0] text-[#5f6d8a] hover:text-emerald-600 hover:bg-emerald-50 transition"
                          >
                            <Download className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {filteredDeals.length > 0 && (
            <div className="flex items-center justify-between border-t border-[#e9eef8] bg-white px-6 py-4 rounded-b-2xl">
              <p className="text-xs text-[#5f6d8a] font-semibold">
                Showing {(currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, filteredDeals.length)} of {filteredDeals.length} results
              </p>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                  disabled={currentPage === 1}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#dfe5f0] text-[#5f6d8a] hover:bg-slate-50 disabled:opacity-40"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                {Array.from({ length: Math.ceil(filteredDeals.length / pageSize) }).map((_, idx) => (
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
                  onClick={() => setCurrentPage((p) => Math.min(p + 1, Math.ceil(filteredDeals.length / pageSize)))}
                  disabled={currentPage === Math.ceil(filteredDeals.length / pageSize)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#dfe5f0] text-[#5f6d8a] hover:bg-slate-50 disabled:opacity-40"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

        </div>

      </div>
    </LenderLayout>
  );
}
