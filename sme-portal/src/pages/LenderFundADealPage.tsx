import React, { useEffect, useMemo, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  Filter,
  TrendingUp,
  Coins,
  FileText,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Shield,
  Briefcase,
  ArrowRight,
  Info,
  Clock,
  ArrowRightLeft,
  HelpCircle,
  X,
  CheckCircle2,
  Users
} from "lucide-react";
import LenderLayout from "../components/lender/LenderLayout";
import { LenderApi, type FinanceRequest, type AvailableSme } from "../api/lenderApi";
import { FinanceApi } from "../api/financeApi";
import { formatZAR } from "../utils/format";
import { useSnackbar } from "notistack";

interface MarketOpportunity {
  id: number;
  sme_id: number;
  company_name: string;
  industry: string;
  location: string;
  credit_score: number;
  risk_level: "Low" | "Medium" | "High";
  requested_funding: number;
  invoice_value: number;
  expected_yield: number;
  funding_term: number;
  funded_percentage: number;
  funded_amount: number;
  remaining_amount: number;
  is_new?: boolean;
}

const INITIAL_MOCK_DEALS: MarketOpportunity[] = [
  {
    id: 15,
    sme_id: 15,
    company_name: "ABC Construction (Pty) Ltd",
    industry: "Construction",
    location: "Gauteng",
    credit_score: 78,
    risk_level: "Low",
    requested_funding: 85000,
    invoice_value: 95000,
    expected_yield: 12.0,
    funding_term: 30,
    funded_percentage: 80,
    funded_amount: 68000,
    remaining_amount: 17000,
    is_new: true
  },
  {
    id: 16,
    sme_id: 16,
    company_name: "Metro Hardware Supplies",
    industry: "Retail",
    location: "KwaZulu-Natal",
    credit_score: 65,
    risk_level: "Medium",
    requested_funding: 120000,
    invoice_value: 150000,
    expected_yield: 15.0,
    funding_term: 45,
    funded_percentage: 75,
    funded_amount: 90000,
    remaining_amount: 30000,
    is_new: true
  },
  {
    id: 17,
    sme_id: 17,
    company_name: "City Power Solutions (Pty) Ltd",
    industry: "Utilities",
    location: "Western Cape",
    credit_score: 82,
    risk_level: "Low",
    requested_funding: 60000,
    invoice_value: 70000,
    expected_yield: 11.5,
    funding_term: 30,
    funded_percentage: 70,
    funded_amount: 42000,
    remaining_amount: 18000,
    is_new: true
  },
  {
    id: 18,
    sme_id: 18,
    company_name: "BuildTech Projects (Pty) Ltd",
    industry: "Construction",
    location: "Eastern Cape",
    credit_score: 62,
    risk_level: "Medium",
    requested_funding: 95000,
    invoice_value: 110000,
    expected_yield: 14.0,
    funding_term: 45,
    funded_percentage: 60,
    funded_amount: 57000,
    remaining_amount: 38000
  },
  {
    id: 19,
    sme_id: 19,
    company_name: "Green Home Supplies",
    industry: "Retail",
    location: "Gauteng",
    credit_score: 45,
    risk_level: "High",
    requested_funding: 80000,
    invoice_value: 100000,
    expected_yield: 18.0,
    funding_term: 60,
    funded_percentage: 25,
    funded_amount: 20000,
    remaining_amount: 60000
  },
  {
    id: 20,
    sme_id: 20,
    company_name: "Fresh Food Distributors (Pty) Ltd",
    industry: "Wholesale",
    location: "Western Cape",
    credit_score: 74,
    risk_level: "Low",
    requested_funding: 75000,
    invoice_value: 90000,
    expected_yield: 12.5,
    funding_term: 30,
    funded_percentage: 75,
    funded_amount: 56250,
    remaining_amount: 18750
  }
];

export default function LenderFundADealPage() {
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();

  // API loading states
  const [dbRequests, setDbRequests] = useState<FinanceRequest[]>([]);
  const [availableSmes, setAvailableSmes] = useState<AvailableSme[]>([]);
  const [loading, setLoading] = useState(false);

  // UI state for capital/portfolio
  const [availableCapital, setAvailableCapital] = useState<number>(500000);
  const [totalInvested, setTotalInvested] = useState<number>(2400000);
  const [activeDealsCount, setActiveDealsCount] = useState<number>(32);

  // Search & Filter state
  const [searchValue, setSearchValue] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [riskFilter, setRiskFilter] = useState("All");

  // Debounce search query
  useEffect(() => {
    const handler = setTimeout(() => {
      setSearchQuery(searchValue);
    }, 300);

    return () => {
      clearTimeout(handler);
    };
  }, [searchValue]);
  const [industryFilter, setIndustryFilter] = useState("All");
  const [amountFilter, setAmountFilter] = useState("All");
  const [scoreFilter, setScoreFilter] = useState("All");
  const [termFilter, setTermFilter] = useState("All");
  const [sortBy, setSortBy] = useState("Highest Yield");

  // Modal State
  const [selectedDeal, setSelectedDeal] = useState<MarketOpportunity | null>(null);
  const [fundingInput, setFundingInput] = useState<string>("");
  const [submittingFunding, setSubmittingFunding] = useState(false);

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
      enqueueSnackbar("Failed to fetch pending requests from database", { variant: "error" });
    } finally {
      setLoading(false);
    }
  }, [enqueueSnackbar]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Merge backend data with static mock list
  const smesById = useMemo(() => {
    const map: Record<number, AvailableSme> = {};
    availableSmes.forEach((sme) => {
      map[sme.sme_id] = sme;
    });
    return map;
  }, [availableSmes]);

  const opportunities = useMemo(() => {
    const list: MarketOpportunity[] = [];

    // Map db requests
    dbRequests.forEach((req) => {
      const sme = smesById[req.sme_id];
      const name = sme?.company_name || `SME ${req.sme_id}`;
      const score = sme?.credit_score ?? 72;
      const risk = sme?.risk_level || "Medium";
      const requested = Number(req.amount_requested);
      const invoice = Math.round(requested * 1.15);

      // Determine expected yield based on credit score
      const scoreYield = score >= 80 ? 11.5 : score >= 60 ? 13.5 : score >= 40 ? 15.5 : 18.0;
      // Determine term based on payout dates or defaults
      const term = 30;

      list.push({
        id: req.id,
        sme_id: req.sme_id,
        company_name: name,
        industry: sme?.industry || "Services",
        location: "Gauteng",
        credit_score: score,
        risk_level: risk as any,
        requested_funding: requested,
        invoice_value: invoice,
        expected_yield: scoreYield,
        funding_term: term,
        funded_percentage: 0,
        funded_amount: 0,
        remaining_amount: requested,
        is_new: true
      });
    });

    // Add static mocks to populate marketplace
    INITIAL_MOCK_DEALS.forEach((mock) => {
      if (!list.some((r) => r.id === mock.id)) {
        list.push(mock);
      }
    });

    return list;
  }, [dbRequests, smesById]);

  // Statistics calculation
  const stats = useMemo(() => {
    const activeDeals = opportunities.length;
    const totalDemand = opportunities.reduce((sum, r) => sum + r.requested_funding, 0);
    const avgYield = opportunities.length > 0
      ? Number((opportunities.reduce((sum, r) => sum + r.expected_yield, 0) / opportunities.length).toFixed(1))
      : 12.8;
    const lowRiskCount = opportunities.filter((r) => r.risk_level === "Low").length;

    return { activeDeals, totalDemand, avgYield, lowRiskCount };
  }, [opportunities]);

  // Unique lists for filter dropdowns
  const uniqueIndustries = useMemo(() => {
    const set = new Set<string>();
    opportunities.forEach((o) => set.add(o.industry));
    return Array.from(set);
  }, [opportunities]);

  // Filtering Logic
  const filteredDeals = useMemo(() => {
    let list = [...opportunities];

    // Search query
    if (searchQuery.trim() !== "") {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (o) =>
          o.company_name.toLowerCase().includes(q) ||
          o.industry.toLowerCase().includes(q) ||
          String(o.id).includes(q)
      );
    }

    // Risk level
    if (riskFilter !== "All") {
      list = list.filter((o) => o.risk_level === riskFilter);
    }

    // Industry
    if (industryFilter !== "All") {
      list = list.filter((o) => o.industry === industryFilter);
    }

    // Amount Range
    if (amountFilter !== "All") {
      list = list.filter((o) => {
        const amt = o.requested_funding;
        if (amountFilter === "<50k") return amt < 50000;
        if (amountFilter === "50k-100k") return amt >= 50000 && amt <= 100000;
        if (amountFilter === ">100k") return amt > 100000;
        return true;
      });
    }

    // Credit score
    if (scoreFilter !== "All") {
      list = list.filter((o) => {
        const cs = o.credit_score;
        if (scoreFilter === "80+") return cs >= 80;
        if (scoreFilter === "60-80") return cs >= 60 && cs < 80;
        if (scoreFilter === "<60") return cs < 60;
        return true;
      });
    }

    // Funding Term
    if (termFilter !== "All") {
      list = list.filter((o) => {
        const t = o.funding_term;
        if (termFilter === "30") return t === 30;
        if (termFilter === "45") return t === 45;
        if (termFilter === "60") return t === 60;
        return true;
      });
    }

    // Sorting
    list.sort((a, b) => {
      if (sortBy === "Highest Yield") return b.expected_yield - a.expected_yield;
      if (sortBy === "Lowest Risk") return a.credit_score - b.credit_score; // Lower score is higher risk, so lowest risk means highest score
      if (sortBy === "Highest Score") return b.credit_score - a.credit_score;
      if (sortBy === "Amount: High to Low") return b.requested_funding - a.requested_funding;
      if (sortBy === "Amount: Low to High") return a.requested_funding - b.requested_funding;
      return 0;
    });

    return list;
  }, [opportunities, searchQuery, riskFilter, industryFilter, amountFilter, scoreFilter, termFilter, sortBy]);

  // Open modal handler
  const handleOpenFundingModal = (deal: MarketOpportunity) => {
    setSelectedDeal(deal);
    // Suggest the remaining funding needed or recommended amount
    const recommended = Math.round(deal.remaining_amount * (deal.credit_score >= 80 ? 1.0 : deal.credit_score >= 60 ? 0.9 : 0.7));
    setFundingInput(String(recommended));
  };

  const handleCloseModal = () => {
    setSelectedDeal(null);
    setFundingInput("");
  };

  // Expected profit calculation (Flat rate calculation matching mock UI: amount * yield_percent)
  const expectedProfit = useMemo(() => {
    if (!selectedDeal || !fundingInput) return 0;
    const amount = Number(fundingInput) || 0;
    return Math.round(amount * (selectedDeal.expected_yield / 100));
  }, [selectedDeal, fundingInput]);

  // Confirm funding action
  const handleConfirmFunding = async () => {
    if (!selectedDeal) return;
    const amountToFund = Number(fundingInput);

    if (isNaN(amountToFund) || amountToFund <= 0) {
      enqueueSnackbar("Please enter a valid funding amount", { variant: "warning" });
      return;
    }

    if (amountToFund > selectedDeal.remaining_amount) {
      enqueueSnackbar(`Cannot fund more than the remaining demand of ${formatZAR(selectedDeal.remaining_amount)}`, { variant: "warning" });
      return;
    }

    if (amountToFund > availableCapital) {
      enqueueSnackbar("Insufficient available capital in your account", { variant: "error" });
      return;
    }

    try {
      setSubmittingFunding(true);

      // Call API if it is a real backend pending request
      const isRealDbRequest = dbRequests.some((r) => r.id === selectedDeal.id);
      if (isRealDbRequest) {
        // Step 1: Approve the request
        await LenderApi.approveRequest(selectedDeal.id, amountToFund);
        // Step 2: Mark it as funded
        await FinanceApi.fund(selectedDeal.id);
      }

      // Update local states to simulate action success
      setAvailableCapital((prev) => prev - amountToFund);
      setTotalInvested((prev) => prev + amountToFund);
      setActiveDealsCount((prev) => prev + 1);

      // Mutate mock list to simulate real-time updates in marketplace
      const idx = INITIAL_MOCK_DEALS.findIndex((d) => d.id === selectedDeal.id);
      if (idx !== -1) {
        const item = INITIAL_MOCK_DEALS[idx];
        const newFunded = item.funded_amount + amountToFund;
        item.funded_amount = newFunded;
        item.remaining_amount = Math.max(item.requested_funding - newFunded, 0);
        item.funded_percentage = Math.round((newFunded / item.requested_funding) * 100);
      }

      enqueueSnackbar(`Successfully funded ${formatZAR(amountToFund)} to ${selectedDeal.company_name}!`, {
        variant: "success"
      });

      handleCloseModal();
      loadData(); // Reload backend requests
    } catch (err) {
      console.error(err);
      enqueueSnackbar("An error occurred while confirming funding", { variant: "error" });
    } finally {
      setSubmittingFunding(false);
    }
  };

  return (
    <LenderLayout>
      <div className="space-y-6 text-[#071942] max-w-[1600px] px-6 mx-auto pb-12">

        {/* Marketplace Banner Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 items-start">

          {/* Main Marketplace Area (Left 75% Column) */}
          <div className="xl:col-span-3 space-y-6">

            {/* Header Title */}
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h1 className="text-3xl font-extrabold tracking-tight text-[#071942]">Fund a Deal</h1>
                <p className="text-sm text-[#5f6d8a] mt-0.5">Browse and fund verified SME financing opportunities.</p>
              </div>
              <button
                onClick={() => enqueueSnackbar("All financing opportunities are fully audited and backed by valid invoices.", { variant: "info" })}
                className="flex items-center gap-1.5 rounded-xl border border-[#dfe5f0] bg-white px-4 py-2 text-xs font-bold text-[#5f6d8a] hover:bg-slate-50 transition"
              >
                <HelpCircle className="h-4 w-4" />
                How it works
              </button>
            </div>

            {/* Top Stat Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Stat 1 */}
              <div className="rounded-2xl border border-[#e9eef8] bg-white p-5 shadow-sm flex items-start gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-[#4f63f6] border border-indigo-100">
                  <Briefcase className="h-5.5 w-5.5" />
                </div>
                <div>
                  <p className="text-[11px] font-bold text-[#8f9bba] uppercase tracking-wide">Available Deals</p>
                  <p className="text-2xl font-black text-[#071942] mt-1">{stats.activeDeals}</p>
                  <p className="text-[10px] text-[#8f9bba] mt-0.5">New opportunities</p>
                </div>
              </div>

              {/* Stat 2 */}
              <div className="rounded-2xl border border-[#e9eef8] bg-white p-5 shadow-sm flex items-start gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100">
                  <Coins className="h-5.5 w-5.5" />
                </div>
                <div>
                  <p className="text-[11px] font-bold text-[#8f9bba] uppercase tracking-wide">Total Demand</p>
                  <p className="text-2xl font-black text-[#071942] mt-1">{formatZAR(stats.totalDemand)}</p>
                  <p className="text-[10px] text-[#8f9bba] mt-0.5">Across all opportunities</p>
                </div>
              </div>

              {/* Stat 3 */}
              <div className="rounded-2xl border border-[#e9eef8] bg-white p-5 shadow-sm flex items-start gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600 border border-amber-100">
                  <TrendingUp className="h-5.5 w-5.5" />
                </div>
                <div>
                  <p className="text-[11px] font-bold text-[#8f9bba] uppercase tracking-wide">Avg Expected Yield</p>
                  <p className="text-2xl font-black text-[#071942] mt-1">{stats.avgYield}%</p>
                  <p className="text-[10px] text-[#8f9bba] mt-0.5">Per annum</p>
                </div>
              </div>

              {/* Stat 4 */}
              <div className="rounded-2xl border border-[#e9eef8] bg-white p-5 shadow-sm flex items-start gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 border border-blue-100">
                  <Shield className="h-5.5 w-5.5" />
                </div>
                <div>
                  <p className="text-[11px] font-bold text-[#8f9bba] uppercase tracking-wide">Low Risk Deals</p>
                  <p className="text-2xl font-black text-[#071942] mt-1">{stats.lowRiskCount}</p>
                  <p className="text-[10px] text-[#8f9bba] mt-0.5">Ready to fund</p>
                </div>
              </div>
            </div>

            {/* Advanced Filters Card */}
            <div className="rounded-2xl border border-[#e9eef8] bg-white p-5 shadow-sm space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
                {/* Search Bar */}
                <div className="relative md:col-span-2">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4.5 w-4.5 text-[#91a1bf]" />
                  <input
                    type="text"
                    placeholder="Search SME or invoice..."
                    value={searchValue}
                    onChange={(e) => setSearchValue(e.target.value)}
                    className="w-full rounded-xl border border-[#dfe5f0] bg-white pl-10 pr-4 py-2.5 text-xs text-[#071942] placeholder-[#91a1bf] font-medium transition focus:border-[#4f63f6] focus:outline-none"
                  />
                </div>

                {/* Risk Filter */}
                <div>
                  <label className="block text-[9px] font-bold text-[#8f9bba] uppercase mb-1">Risk Level</label>
                  <select
                    value={riskFilter}
                    onChange={(e) => setRiskFilter(e.target.value)}
                    className="w-full rounded-xl border border-[#dfe5f0] bg-white px-3 py-2.5 text-xs font-semibold text-[#5f6d8a] focus:border-[#4f63f6] focus:outline-none"
                  >
                    <option value="All">All Risks</option>
                    <option value="Low">Low Risk</option>
                    <option value="Medium">Medium Risk</option>
                    <option value="High">High Risk</option>
                  </select>
                </div>

                {/* Industry Filter */}
                <div>
                  <label className="block text-[9px] font-bold text-[#8f9bba] uppercase mb-1">Industry</label>
                  <select
                    value={industryFilter}
                    onChange={(e) => setIndustryFilter(e.target.value)}
                    className="w-full rounded-xl border border-[#dfe5f0] bg-white px-3 py-2.5 text-xs font-semibold text-[#5f6d8a] focus:border-[#4f63f6] focus:outline-none"
                  >
                    <option value="All">All Industries</option>
                    {uniqueIndustries.map((ind) => (
                      <option key={ind} value={ind}>{ind}</option>
                    ))}
                  </select>
                </div>

                {/* Amount Filter */}
                <div>
                  <label className="block text-[9px] font-bold text-[#8f9bba] uppercase mb-1">Amount Range</label>
                  <select
                    value={amountFilter}
                    onChange={(e) => setAmountFilter(e.target.value)}
                    className="w-full rounded-xl border border-[#dfe5f0] bg-white px-3 py-2.5 text-xs font-semibold text-[#5f6d8a] focus:border-[#4f63f6] focus:outline-none"
                  >
                    <option value="All">All Amounts</option>
                    <option value="<50k">&lt; R50k</option>
                    <option value="50k-100k">R50k - R100k</option>
                    <option value=">100k">&gt; R100k</option>
                  </select>
                </div>

                {/* Credit Score Filter */}
                <div>
                  <label className="block text-[9px] font-bold text-[#8f9bba] uppercase mb-1">Credit Score</label>
                  <select
                    value={scoreFilter}
                    onChange={(e) => setScoreFilter(e.target.value)}
                    className="w-full rounded-xl border border-[#dfe5f0] bg-white px-3 py-2.5 text-xs font-semibold text-[#5f6d8a] focus:border-[#4f63f6] focus:outline-none"
                  >
                    <option value="All">All Scores</option>
                    <option value="80+">80+ (Excellent)</option>
                    <option value="60-80">60-80 (Good)</option>
                    <option value="<60">&lt; 60 (Fair/Poor)</option>
                  </select>
                </div>
              </div>

              {/* Bottom Sorting Row */}
              <div className="flex flex-wrap items-center justify-between border-t border-[#f2f5fa] pt-4 gap-4">
                <p className="text-xs text-[#5f6d8a] font-semibold">
                  Showing <span className="text-[#071942] font-bold">{filteredDeals.length}</span> of {opportunities.length} opportunities
                </p>

                <div className="flex items-center gap-3">
                  <span className="text-xs text-[#8f9bba] font-medium">Sort by:</span>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="rounded-xl border border-[#dfe5f0] bg-white px-3 py-2 text-xs font-semibold text-[#071942] focus:border-[#4f63f6] focus:outline-none"
                  >
                    <option value="Highest Yield">Highest Yield</option>
                    <option value="Lowest Risk">Lowest Risk</option>
                    <option value="Highest Score">Highest Score</option>
                    <option value="Amount: High to Low">Amount: High to Low</option>
                    <option value="Amount: Low to High">Amount: Low to High</option>
                  </select>
                  <button className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#dfe5f0] bg-white hover:bg-slate-50 text-[#5f6d8a] transition">
                    <Filter className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Opportunities Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {filteredDeals.length === 0 ? (
                <div className="col-span-full rounded-2xl border border-dashed border-[#d8e2f3] bg-white py-16 text-center">
                  <p className="text-sm font-semibold text-[#5f6d8a]">No financing opportunities match your filter selections.</p>
                  <button
                    onClick={() => {
                      setSearchQuery("");
                      setRiskFilter("All");
                      setIndustryFilter("All");
                      setAmountFilter("All");
                      setScoreFilter("All");
                      setTermFilter("All");
                    }}
                    className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold text-[#4f63f6] hover:underline"
                  >
                    Reset Filters
                  </button>
                </div>
              ) : (
                filteredDeals.map((deal) => (
                  <div key={deal.id} className="rounded-2xl border border-[#e9eef8] bg-white p-5 shadow-sm space-y-4 relative hover:shadow-md transition duration-200">

                    {/* Badge header */}
                    <div className="flex items-center justify-between">
                      <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[9px] font-bold border ${deal.risk_level === "Low"
                          ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                          : deal.risk_level === "High"
                            ? "bg-rose-50 text-rose-700 border-rose-100"
                            : "bg-amber-50 text-amber-700 border-amber-100"
                        }`}>
                        {deal.risk_level} Risk
                      </span>
                      {deal.is_new && (
                        <span className="rounded bg-[#8b7cff]/10 px-1.5 py-0.5 text-[8px] font-bold text-[#8b7cff] tracking-wide uppercase">
                          New
                        </span>
                      )}
                    </div>

                    {/* Company Details */}
                    <div>
                      <h4 className="font-extrabold text-[#071942] text-[15px] truncate hover:text-[#4f63f6] transition cursor-pointer" title={deal.company_name} onClick={() => navigate(`/lender/review-requests/${deal.id}`)}>
                        {deal.company_name}
                      </h4>
                      <p className="text-[10px] font-semibold text-[#8f9bba] mt-0.5">
                        {deal.industry} • {deal.location}
                      </p>
                    </div>

                    {/* Score Gauge & Key Metrics Grid */}
                    <div className="grid grid-cols-12 gap-3 items-center py-1">
                      {/* Circle Score dial */}
                      <div className="col-span-4 flex flex-col items-center justify-center">
                        <div className="relative h-15 w-15 flex items-center justify-center group cursor-help">
                          {/* Tooltip Content */}
                          <div className="absolute bottom-full mb-2 hidden group-hover:block z-20 w-48 bg-[#071b3f] text-white text-[10px] leading-normal p-2.5 rounded-lg shadow-xl font-medium text-left">
                            <p className="font-extrabold mb-1 border-b border-white/10 pb-1">ML Scoring Model</p>
                            Calculated via:
                            <ul className="list-disc pl-3 mt-1 space-y-0.5 text-white/90">
                              <li>Debt Service Cover (DSCR)</li>
                              <li>Days Sales Outstanding (DSO)</li>
                              <li>Consistent Revenue Trends</li>
                              <li>Industry Default Averages</li>
                            </ul>
                            <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-[#071b3f]" />
                          </div>
                          <svg className="h-full w-full transform -rotate-90">
                            <circle cx="30" cy="30" r="24" stroke="#f1f5f9" strokeWidth="4.5" fill="transparent" />
                            <circle
                              cx="30"
                              cy="30"
                              r="24"
                              stroke={deal.risk_level === "High" ? "#ef4444" : deal.risk_level === "Low" ? "#10b981" : "#f59e0b"}
                              strokeWidth="4.5"
                              fill="transparent"
                              strokeDasharray={2 * Math.PI * 24}
                              strokeDashoffset={2 * Math.PI * 24 * (1 - deal.credit_score / 100)}
                              strokeLinecap="round"
                            />
                          </svg>
                          <span className="absolute text-[13px] font-extrabold text-[#071942]">{deal.credit_score}</span>
                        </div>
                        <span className={`text-[8px] font-bold mt-1 uppercase tracking-wide ${deal.risk_level === "High" ? "text-rose-600" : deal.risk_level === "Low" ? "text-emerald-600" : "text-amber-600"
                          }`}>
                          {deal.credit_score >= 80 ? "Excellent" : deal.credit_score >= 70 ? "Good" : deal.credit_score >= 60 ? "Fair" : "Poor"}
                        </span>
                      </div>

                      {/* Info Columns */}
                      <div className="col-span-8 grid grid-cols-2 gap-y-3 gap-x-2 text-xs">
                        <div>
                          <p className="text-[9px] font-bold text-[#8f9bba] uppercase tracking-wide">Requested Funding</p>
                          <p className="font-extrabold text-[#071942] mt-0.5 text-sm">{formatZAR(deal.requested_funding)}</p>
                          <p className="text-[8px] text-[#8f9bba] mt-0.5">Inv: {formatZAR(deal.invoice_value)}</p>
                        </div>
                        <div>
                          <p className="text-[9px] font-bold text-[#8f9bba] uppercase tracking-wide">Expected Yield</p>
                          <p className="font-extrabold text-[#009a65] mt-0.5 text-sm">{deal.expected_yield}%</p>
                          <p className="text-[8px] text-[#8f9bba] mt-0.5">Term: {deal.funding_term} Days</p>
                        </div>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[9px] font-bold text-[#5f6d8a]">
                        <span>Funding Progress</span>
                        <span>{deal.funded_percentage}%</span>
                      </div>
                      <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all duration-500 ${deal.risk_level === "High"
                              ? "bg-rose-500"
                              : deal.risk_level === "Low"
                                ? "bg-emerald-500"
                                : "bg-amber-500"
                            }`}
                          style={{ width: `${deal.funded_percentage}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-[8px] font-bold text-[#8f9bba] pt-0.5">
                        <span>{formatZAR(deal.funded_amount)} funded</span>
                        <span>{formatZAR(deal.remaining_amount)} remaining</span>
                      </div>
                    </div>

                    {/* Actions Row */}
                    <div className="grid grid-cols-2 gap-3 pt-2 border-t border-[#f2f5fa]">
                      <button
                        onClick={() => navigate(`/lender/review-requests/${deal.id}`)}
                        className="inline-flex items-center justify-center gap-1 rounded-xl border border-[#dfe5f0] bg-white hover:bg-slate-50 py-2.5 text-[11px] font-extrabold text-[#5f6d8a] transition"
                      >
                        View Details
                      </button>
                      <button
                        onClick={() => handleOpenFundingModal(deal)}
                        disabled={deal.remaining_amount <= 0}
                        className="inline-flex items-center justify-center gap-1 rounded-xl bg-[#009a65] hover:bg-[#008154] disabled:bg-slate-100 disabled:text-slate-400 py-2.5 text-[11px] font-extrabold text-white transition shadow-sm"
                      >
                        Fund Deal
                      </button>
                    </div>

                  </div>
                ))
              )}
            </div>

            {/* Pagination Controls */}
            {filteredDeals.length > 0 && (
              <div className="flex items-center justify-between border-t border-[#e9eef8] bg-white p-5 rounded-2xl shadow-sm mt-4">
                <p className="text-xs text-[#5f6d8a] font-semibold">
                  Showing 1 to {filteredDeals.length} of {filteredDeals.length} opportunities
                </p>
                <div className="flex items-center gap-1">
                  <button className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#dfe5f0] text-slate-400 hover:bg-slate-50 disabled:opacity-40" disabled>
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button className="h-8 w-8 rounded-lg text-xs font-bold bg-[#4f63f6] text-white shadow-sm">1</button>
                  <button className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#dfe5f0] text-slate-400 hover:bg-slate-50 disabled:opacity-40" disabled>
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}

          </div>

          {/* Right Sidebar Column (25% Column) */}
          <div className="space-y-6">

            {/* 1. My Portfolio Summary Card */}
            <div className="rounded-2xl border border-[#e9eef8] bg-[#071b3f] text-white p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <h3 className="text-sm font-bold tracking-wide">My Portfolio</h3>
                <button onClick={() => navigate("/lender/funded-deals")} className="text-[10px] font-bold text-[#8b7cff] hover:underline">View Portfolio</button>
              </div>

              <div className="space-y-3.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-white/60">Total Invested</span>
                  <span className="font-extrabold text-white text-[13px]">{formatZAR(totalInvested)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/60">Active Deals</span>
                  <span className="font-extrabold text-white text-[13px]">{activeDealsCount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/60">Expected Returns (Total)</span>
                  <span className="font-extrabold text-white text-[13px]">{formatZAR(totalInvested * 0.133)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/60">Average Yield</span>
                  <span className="font-extrabold text-emerald-400 text-[13px]">12.6% p.a.</span>
                </div>
                <div className="flex justify-between border-t border-dashed border-white/15 pt-3">
                  <span className="text-white/60">Available Capital</span>
                  <span className="font-extrabold text-emerald-400 text-sm">{formatZAR(availableCapital)}</span>
                </div>
              </div>

              <button
                onClick={() => navigate("/lender/decision-engine")}
                className="w-full rounded-xl bg-[#4f63f6] py-2.5 text-center text-xs font-bold text-white transition hover:bg-[#3d51e5] active:scale-95 shadow-md shadow-indigo-950/20"
              >
                Add Funds
              </button>
            </div>

            {/* 2. Quick Actions Card */}
            <div className="rounded-2xl border border-[#e9eef8] bg-white p-5 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-[#071942] border-b border-[#f2f5fa] pb-3">Quick Actions</h3>

              <div className="space-y-2 text-xs font-bold">
                {[
                  { label: "Review Requests", path: "/lender/review-requests" },
                  { label: "Funded Deals", path: "/lender/funded-deals" },
                  { label: "Transactions", path: "/lender/transactions" },
                  { label: "Reports", path: "/lender/reports" }
                ].map((act) => (
                  <button
                    key={act.label}
                    onClick={() => navigate(act.path)}
                    className="w-full flex items-center justify-between rounded-xl bg-slate-50 hover:bg-[#f5f7ff] hover:text-[#4f63f6] p-3 text-left transition group border border-[#f2f5fa]"
                  >
                    <span className="text-[#5f6d8a] group-hover:text-[#4f63f6]">{act.label}</span>
                    <ArrowRight className="h-3.5 w-3.5 text-slate-400 group-hover:text-[#4f63f6] group-hover:translate-x-1 transition" />
                  </button>
                ))}
              </div>
            </div>

            {/* 3. Recent Funded Deals Card */}
            <div className="rounded-2xl border border-[#e9eef8] bg-white p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-[#f2f5fa] pb-3">
                <h3 className="text-sm font-bold text-[#071942]">Recent Funded Deals</h3>
                <button onClick={() => navigate("/lender/funded-deals")} className="text-[10px] font-bold text-[#4f63f6] hover:underline">View All</button>
              </div>

              <div className="space-y-3.5">
                {[
                  { initial: "BT", name: "BuildTech Projects", amount: 50000, date: "18 Jun 2026", status: "Active", bg: "bg-[#8b7cff]/10 text-[#8b7cff]" },
                  { initial: "CP", name: "City Power Solutions", amount: 60000, date: "17 Jun 2026", status: "Active", bg: "bg-emerald-50 text-emerald-600" },
                  { initial: "AA", name: "Alpha Agencies", amount: 40000, date: "16 Jun 2026", status: "Repaid", bg: "bg-indigo-50 text-[#4f63f6]" },
                  { initial: "MH", name: "Metro Hardware", amount: 120000, date: "15 Jun 2026", status: "Active", bg: "bg-amber-50 text-amber-600" }
                ].map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between text-xs border-b border-dashed border-[#f2f5fa] last:border-0 pb-3 last:pb-0">
                    <div className="flex items-center gap-3">
                      <div className={`h-8 w-8 rounded-xl flex items-center justify-center font-extrabold text-[11px] ${item.bg}`}>
                        {item.initial}
                      </div>
                      <div>
                        <p className="font-extrabold text-[#071942] truncate max-w-[120px]">{item.name}</p>
                        <p className="text-[9px] text-[#8f9bba] mt-0.5">Funded on {item.date}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-black text-[#071942]">{formatZAR(item.amount)}</p>
                      <span className={`inline-block text-[8px] font-extrabold mt-0.5 rounded px-1.5 py-0.2 ${item.status === "Active" ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-400"
                        }`}>{item.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 4. Need Help Support Card */}
            <div className="rounded-2xl border border-indigo-100 bg-indigo-50/40 p-5 text-center space-y-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-50 text-[#4f63f6] mx-auto border border-indigo-100">
                <Info className="h-4.5 w-4.5" />
              </div>
              <div>
                <h4 className="font-bold text-[#071942] text-xs">Need Help?</h4>
                <p className="text-[10px] text-[#5f6d8a] leading-normal mt-0.5">Our support team is here to assist you.</p>
              </div>
              <button
                onClick={() => navigate("/messages")}
                className="w-full rounded-xl bg-white border border-[#dfe5f0] py-2 text-[10px] font-extrabold text-[#071942] hover:bg-slate-50 transition active:scale-95"
              >
                Contact Support
              </button>
            </div>

          </div>

        </div>

      </div>

      {/* Fund Deal Confirmation Modal */}
      {selectedDeal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/55 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-[#e9eef8] w-full max-w-[460px] shadow-2xl p-6 relative overflow-hidden animate-none">

            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-[#f2f5fa] pb-4">
              <div>
                <h3 className="text-lg font-black text-[#071942]">Fund Deal</h3>
                <p className="text-xs text-[#5f6d8a] mt-0.5">Fund {selectedDeal.company_name}</p>
              </div>
              <button onClick={handleCloseModal} className="h-7 w-7 flex items-center justify-center rounded-full bg-slate-50 hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition">
                <X className="h-4.5 w-4.5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="py-5 space-y-4 text-xs font-semibold text-[#071942]">

              {/* Stats Row */}
              <div className="grid grid-cols-2 gap-4 bg-[#f8faff] rounded-xl border border-[#d8e2f3] p-3">
                <div>
                  <span className="text-[#8f9bba] text-[10px] font-bold uppercase tracking-wide">Requested Amount</span>
                  <p className="text-base font-extrabold text-[#071942] mt-0.5">{formatZAR(selectedDeal.requested_funding)}</p>
                </div>
                <div>
                  <span className="text-[#8f9bba] text-[10px] font-bold uppercase tracking-wide">Recommended Amount</span>
                  <p className="text-base font-extrabold text-emerald-600 mt-0.5">
                    {formatZAR(Math.round(selectedDeal.remaining_amount * (selectedDeal.credit_score >= 80 ? 1.0 : selectedDeal.credit_score >= 60 ? 0.9 : 0.7)))}
                  </p>
                </div>
              </div>

              {/* Deal Details */}
              <div className="grid grid-cols-2 gap-y-3 pt-1">
                <div className="flex justify-between border-r border-[#f2f5fa] pr-4">
                  <span className="text-[#5f6d8a]">Expected Return</span>
                  <span className="font-extrabold text-[#009a65]">{selectedDeal.expected_yield}%</span>
                </div>
                <div className="flex justify-between pl-4">
                  <span className="text-[#5f6d8a]">Funding Term</span>
                  <span className="font-extrabold text-[#071942]">{selectedDeal.funding_term} Days</span>
                </div>
              </div>

              {/* Amount Input */}
              <div className="space-y-1.5 pt-2">
                <label className="block text-[10px] font-bold text-[#5f6d8a] uppercase tracking-wide">Enter Funding Amount</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-extrabold text-[#5f6d8a]">R</span>
                  <input
                    type="number"
                    value={fundingInput}
                    onChange={(e) => setFundingInput(e.target.value)}
                    placeholder="Enter amount..."
                    className="w-full rounded-xl border border-[#dfe5f0] bg-white pl-8 pr-4 py-2.5 text-xs text-[#071942] font-black focus:border-[#4f63f6] focus:outline-none"
                  />
                </div>
                <p className="text-[9px] text-[#8f9bba] font-bold mt-0.5">
                  Available Capital: {formatZAR(availableCapital)} | Remaining: {formatZAR(selectedDeal.remaining_amount)}
                </p>
              </div>

              {/* Expected Profit Output */}
              <div className="flex items-center justify-between border-t border-[#f2f5fa] pt-4">
                <div>
                  <p className="text-[#071942] font-extrabold">Expected Profit</p>
                  <p className="text-[9px] text-[#8f9bba] font-semibold mt-0.5">Calculated at flat yield rate</p>
                </div>
                <p className="text-xl font-black text-[#009a65]">
                  {formatZAR(expectedProfit)}
                </p>
              </div>

            </div>

            {/* Modal Actions */}
            <div className="grid grid-cols-2 gap-3 pt-3 border-t border-[#f2f5fa]">
              <button
                onClick={handleCloseModal}
                disabled={submittingFunding}
                className="inline-flex items-center justify-center rounded-xl border border-[#dfe5f0] bg-white hover:bg-slate-50 py-2.5 text-xs font-bold text-[#5f6d8a] transition active:scale-95 disabled:opacity-40"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmFunding}
                disabled={submittingFunding || !fundingInput || Number(fundingInput) <= 0 || Number(fundingInput) > selectedDeal.remaining_amount || Number(fundingInput) > availableCapital}
                className="inline-flex items-center justify-center rounded-xl bg-[#009a65] hover:bg-[#008154] disabled:bg-slate-100 disabled:text-slate-400 py-2.5 text-xs font-bold text-white transition active:scale-95 shadow-sm"
              >
                {submittingFunding ? "Processing..." : "Confirm Funding"}
              </button>
            </div>

          </div>
        </div>
      )}
    </LenderLayout>
  );
}
