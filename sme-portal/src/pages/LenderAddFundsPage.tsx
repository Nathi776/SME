import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Wallet,
  Coins,
  Clock,
  TrendingUp,
  Info,
  Shield,
  Check,
  Copy,
  Download,
  Calendar,
  ArrowRight,
  FileText,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  HelpCircle,
  Building,
  Zap,
  Landmark,
  FileSpreadsheet
} from "lucide-react";
import LenderLayout from "../components/lender/LenderLayout";
import { formatZAR } from "../utils/format";
import { useSnackbar } from "notistack";

interface DepositRecord {
  date: string;
  reference: string;
  amount: number;
  method: string;
  status: "Completed" | "Pending" | "Failed";
}

export default function LenderAddFundsPage() {
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();

  // Core metrics state
  const [availableBalance, setAvailableBalance] = useState<number>(850000);
  const [totalInvested] = useState<number>(2400000);
  const [pendingDeposits, setPendingDeposits] = useState<number>(150000);
  const [lifetimeReturns] = useState<number>(185000);
  const [targetCapital, setTargetCapital] = useState<number>(5000000);

  // Form states
  const [amountInput, setAmountInput] = useState<string>("100000");
  const [fundingMethod, setFundingMethod] = useState<string>("EFT Transfer");
  const [referenceName, setReferenceName] = useState<string>("Mokoena Electrical (Pty) Ltd");
  const [expectedDate, setExpectedDate] = useState<string>("2026-06-23");

  // Inline edit state for target capital
  const [isEditingTarget, setIsEditingTarget] = useState<boolean>(false);
  const [targetCapitalInput, setTargetCapitalInput] = useState<string>("5000000");

  // History state
  const [deposits, setDeposits] = useState<DepositRecord[]>([
    { date: "20 Jun 2026", reference: "DEP-2026-0548", amount: 50000, method: "EFT Transfer", status: "Completed" },
    { date: "15 Jun 2026", reference: "DEP-2026-0512", amount: 100000, method: "Instant EFT", status: "Completed" },
    { date: "10 Jun 2026", reference: "DEP-2026-0481", amount: 25000, method: "Bank Transfer", status: "Pending" },
    { date: "05 Jun 2026", reference: "DEP-2026-0440", amount: 75000, method: "EFT Transfer", status: "Completed" },
    { date: "01 Jun 2026", reference: "DEP-2026-0415", amount: 200000, method: "EFT Transfer", status: "Failed" }
  ]);

  // Derived capital stats
  const currentCapital = useMemo(() => {
    return availableBalance + totalInvested;
  }, [availableBalance, totalInvested]);

  const targetPercentage = useMemo(() => {
    if (targetCapital <= 0) return 0;
    return Math.min(Math.round((currentCapital / targetCapital) * 100), 100);
  }, [currentCapital, targetCapital]);

  // Handle deposit form submission
  const handleAddFunds = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = Number(amountInput);

    if (isNaN(amount) || amount <= 0) {
      enqueueSnackbar("Please enter a valid deposit amount.", { variant: "warning" });
      return;
    }

    if (!referenceName.trim()) {
      enqueueSnackbar("Please enter a reference name.", { variant: "warning" });
      return;
    }

    // Add to deposit history list
    const newRecord: DepositRecord = {
      date: new Date(expectedDate).toLocaleDateString("en-ZA", { day: "2-digit", month: "short", year: "numeric" }),
      reference: `DEP-2026-0${Math.floor(Math.random() * 900) + 100}`,
      amount,
      method: fundingMethod,
      status: "Pending"
    };

    setDeposits((prev) => [newRecord, ...prev]);
    setPendingDeposits((prev) => prev + amount);

    enqueueSnackbar(`Funds deposit of ${formatZAR(amount)} requested! Standard Bank Trust Account details are shown below.`, {
      variant: "success"
    });
  };

  // Copy Trust details to clipboard
  const handleCopyDetails = () => {
    const trustDetails = `
      Bank: Standard Bank
      Account Name: SME Finance (Pty) Ltd - Trust Account
      Account Number: 1234 5678 9101
      Branch Code: 051001
      Account Type: Business Current Account
      Reference: LENDER-00125
    `.trim().replace(/\n\s+/g, "\n");

    navigator.clipboard.writeText(trustDetails);
    enqueueSnackbar("SME Finance Trust Account details copied to clipboard!", { variant: "success" });
  };

  // Download details as simulated PDF
  const handleDownloadPDF = () => {
    const content = `
      SME FINANCE LENDER TRUST ACCOUNT DETAILS
      ========================================
      Bank: Standard Bank
      Account Name: SME Finance (Pty) Ltd - Trust Account
      Account Number: 1234 5678 9101
      Branch Code: 051001
      Account Type: Business Current Account
      Payment Reference: LENDER-00125
      
      This document serves as proof of instructions. Please perform the deposit using standard channels.
    `.trim().replace(/\n\s+/g, "\n");

    const element = document.createElement("a");
    const file = new Blob([content], { type: "text/plain" });
    element.href = URL.createObjectURL(file);
    element.download = "SME_Finance_Trust_Account_Instructions.txt";
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);

    enqueueSnackbar("Trust account instructions PDF downloaded successfully.", { variant: "success" });
  };

  // Simulate clearing/completing a pending deposit
  const handleClearPending = (ref: string, amount: number) => {
    setDeposits((prev) =>
      prev.map((d) => (d.reference === ref ? { ...d, status: "Completed" } : d))
    );
    setPendingDeposits((prev) => Math.max(prev - amount, 0));
    setAvailableBalance((prev) => prev + amount);

    enqueueSnackbar(`Pending deposit ${ref} has been cleared! ${formatZAR(amount)} added to your Available Balance.`, {
      variant: "success"
    });
  };

  // Simulate retrying a failed deposit
  const handleRetryFailed = (ref: string, record: DepositRecord) => {
    // Re-trigger form inputs for retry
    setAmountInput(String(record.amount));
    setFundingMethod(record.method);
    enqueueSnackbar(`Retrying deposit details for ${ref}. Values loaded into the funding form.`, {
      variant: "info"
    });
  };

  // Save the updated target capital
  const handleSaveTargetCapital = () => {
    const val = Number(targetCapitalInput);
    if (isNaN(val) || val <= 0) {
      enqueueSnackbar("Please enter a valid target capital amount.", { variant: "warning" });
      return;
    }
    setTargetCapital(val);
    setIsEditingTarget(false);
    enqueueSnackbar(`Target capital updated to ${formatZAR(val)}.`, { variant: "success" });
  };

  return (
    <LenderLayout>
      <div className="mx-auto max-w-[1600px] px-6 space-y-6 text-[#071942] pb-12">
        
        {/* Header Title */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-[#071942]">Add Funds</h1>
            <p className="text-sm text-[#5f6d8a] mt-0.5">Increase your available capital to fund more SME financing opportunities.</p>
          </div>
          <button 
            onClick={() => enqueueSnackbar("All deposits are processed through a regulated trust escrow account.", { variant: "info" })}
            className="flex items-center gap-1.5 rounded-xl border border-[#dfe5f0] bg-white px-4 py-2 text-xs font-bold text-[#5f6d8a] hover:bg-slate-50 transition"
          >
            <HelpCircle className="h-4 w-4" />
            Escrow Trust Details
          </button>
        </div>

        {/* Top KPI Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Card 1: Available Balance */}
          <div className="rounded-2xl border border-[#e9eef8] bg-white p-5 shadow-sm flex items-start gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100">
              <Wallet className="h-5.5 w-5.5" />
            </div>
            <div>
              <p className="text-[11px] font-bold text-[#8f9bba] uppercase tracking-wide">Available Balance</p>
              <p className="text-2xl font-black text-[#071942] mt-1">{formatZAR(availableBalance)}</p>
              <p className="text-[10px] text-emerald-600 font-bold mt-0.5">Available to fund</p>
            </div>
          </div>

          {/* Card 2: Total Invested */}
          <div className="rounded-2xl border border-[#e9eef8] bg-white p-5 shadow-sm flex items-start gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-[#4f63f6] border border-indigo-100">
              <Coins className="h-5.5 w-5.5" />
            </div>
            <div>
              <p className="text-[11px] font-bold text-[#8f9bba] uppercase tracking-wide">Total Invested</p>
              <p className="text-2xl font-black text-[#071942] mt-1">{formatZAR(totalInvested)}</p>
              <p className="text-[10px] text-[#8f9bba] mt-0.5">Across 42 deals</p>
            </div>
          </div>

          {/* Card 3: Pending Deposits */}
          <div className="rounded-2xl border border-[#e9eef8] bg-white p-5 shadow-sm flex items-start gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600 border border-amber-100">
              <Clock className="h-5.5 w-5.5" />
            </div>
            <div>
              <p className="text-[11px] font-bold text-[#8f9bba] uppercase tracking-wide">Pending Deposits</p>
              <p className="text-2xl font-black text-[#071942] mt-1">{formatZAR(pendingDeposits)}</p>
              <p className="text-[10px] text-amber-600 font-bold mt-0.5">Awaiting clearance</p>
            </div>
          </div>

          {/* Card 4: Lifetime Returns */}
          <div className="rounded-2xl border border-[#e9eef8] bg-white p-5 shadow-sm flex items-start gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 border border-blue-100">
              <TrendingUp className="h-5.5 w-5.5" />
            </div>
            <div>
              <p className="text-[11px] font-bold text-[#8f9bba] uppercase tracking-wide">Lifetime Returns</p>
              <p className="text-2xl font-black text-[#071942] mt-1">{formatZAR(lifetimeReturns)}</p>
              <p className="text-[10px] text-[#009a65] font-bold mt-0.5 flex items-center gap-1">
                <span>↑ 12.8%</span>
                <span className="text-[#8f9bba] font-semibold">vs last month</span>
              </p>
            </div>
          </div>
        </div>

        {/* Main Content Layout Grid (Split 60 / 40) */}
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.6fr_1fr]">
          
          {/* Left Column (Forms & Instructions) */}
          <div className="space-y-6">
            
            {/* 1. Add Funds Form Card */}
            <div className="rounded-2xl border border-[#e9eef8] bg-white p-6 shadow-sm">
              <div className="flex items-center gap-3 border-b border-[#e9eef8] pb-4 mb-5">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#4f63f6] text-sm font-bold text-white">
                  1
                </div>
                <h2 className="text-lg font-bold text-[#071942]">Add Funds</h2>
              </div>

              <form onSubmit={handleAddFunds} className="space-y-5 text-xs font-semibold">
                
                {/* Amount field */}
                <div>
                  <label className="block text-xs font-bold text-[#5f6d8a] mb-2 uppercase tracking-wide">Amount to Deposit *</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-[#5f6d8a]">R</span>
                    <input
                      type="number"
                      required
                      value={amountInput}
                      onChange={(e) => setAmountInput(e.target.value)}
                      placeholder="e.g. 100,000.00"
                      className="w-full rounded-xl border border-[#dfe5f0] bg-white pl-8 pr-4 py-3 text-sm text-[#071942] font-black transition focus:border-[#4f63f6] focus:outline-none focus:ring-1 focus:ring-[#4f63f6]"
                    />
                  </div>
                </div>

                {/* Funding Method Radio Grid */}
                <div>
                  <label className="block text-xs font-bold text-[#5f6d8a] mb-2 uppercase tracking-wide">Select Funding Method *</label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {[
                      { label: "EFT Transfer", desc: "Manual EFT", icon: Landmark },
                      { label: "Instant EFT", desc: "Pay via online banking", icon: Zap },
                      { label: "Bank Transfer", desc: "Direct bank deposit", icon: Building },
                      { label: "Corporate Account", desc: "Internal transfer", icon: FileSpreadsheet }
                    ].map((method) => {
                      const Icon = method.icon;
                      const isSelected = fundingMethod === method.label;
                      return (
                        <div
                          key={method.label}
                          onClick={() => setFundingMethod(method.label)}
                          className={`rounded-xl border p-4 text-center cursor-pointer transition flex flex-col items-center justify-center space-y-2 select-none ${
                            isSelected
                              ? "border-[#4f63f6] bg-[#f8faff] shadow-sm"
                              : "border-[#dfe5f0] bg-white hover:border-[#4f63f6]/40 hover:bg-slate-50"
                          }`}
                        >
                          <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                            isSelected ? "bg-indigo-100 text-[#4f63f6]" : "bg-slate-100 text-[#5f6d8a]"
                          }`}>
                            <Icon className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="font-bold text-[#071942] text-[11.5px] leading-tight">{method.label}</p>
                            <p className="text-[9px] text-[#8f9bba] mt-0.5 font-medium">{method.desc}</p>
                          </div>
                          <input
                            type="radio"
                            name="fundingMethod"
                            checked={isSelected}
                            onChange={() => {}}
                            className="h-3 w-3 text-[#4f63f6] focus:ring-[#4f63f6] border-[#dfe5f0]"
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Grid inputs for Reference and Expected Date */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-[#5f6d8a] mb-2 uppercase tracking-wide">Reference Name *</label>
                    <input
                      type="text"
                      required
                      value={referenceName}
                      onChange={(e) => setReferenceName(e.target.value)}
                      placeholder="Enter company reference name..."
                      className="w-full rounded-xl border border-[#dfe5f0] bg-white px-4 py-3 text-xs text-[#071942] transition focus:border-[#4f63f6] focus:outline-none focus:ring-1 focus:ring-[#4f63f6]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#5f6d8a] mb-2 uppercase tracking-wide font-semibold">Expected Deposit Date</label>
                    <div className="relative">
                      <input
                        type="date"
                        required
                        value={expectedDate}
                        onChange={(e) => setExpectedDate(e.target.value)}
                        className="w-full rounded-xl border border-[#dfe5f0] bg-white px-4 py-3 text-xs text-[#071942] transition focus:border-[#4f63f6] focus:outline-none focus:ring-1 focus:ring-[#4f63f6]"
                      />
                    </div>
                  </div>
                </div>

                {/* Important notice badge */}
                <div className="rounded-xl bg-blue-50/50 p-4 border border-blue-100/30 flex items-start gap-3 text-xs text-blue-700 leading-normal font-semibold">
                  <Info className="h-5 w-5 shrink-0 text-blue-500" />
                  <div>
                    <p className="text-[11px] font-bold text-blue-900 uppercase tracking-wider mb-0.5">Please use your unique reference when making the deposit.</p>
                    <p className="text-blue-700/90 font-medium">This allows our dynamic verification engine to identify your transfer quickly.</p>
                  </div>
                </div>

                {/* Submit button */}
                <button
                  type="submit"
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#4f63f6] py-3 text-center text-xs font-extrabold text-white transition hover:bg-[#3d51e5] active:scale-[0.99] shadow-md shadow-indigo-950/10"
                >
                  <Coins className="h-4.5 w-4.5" />
                  Add Funds
                </button>

              </form>
            </div>

            {/* 2. Funding Instructions (Trust Bank account information) */}
            <div className="rounded-2xl border border-[#e9eef8] bg-white p-6 shadow-sm space-y-5">
              <div className="flex items-center gap-3 border-b border-[#e9eef8] pb-4 mb-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#4f63f6] text-sm font-bold text-white">
                  2
                </div>
                <h2 className="text-lg font-bold text-[#071942]">Funding Instructions</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                {/* Visual Icon card representing banking */}
                <div className="md:col-span-3 flex flex-col items-center justify-center bg-[#f8faff] rounded-2xl p-5 border border-[#e9eef8] text-indigo-600">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white border border-[#dfe5f0] shadow-sm mb-2">
                    <Building className="h-7 w-7 text-[#4f63f6]" />
                  </div>
                  <span className="text-[11px] font-extrabold text-[#071942]">Standard Bank</span>
                  <span className="text-[9px] text-emerald-600 font-bold bg-emerald-50 px-1.5 py-0.2 rounded-full mt-1.5">Verified Account</span>
                </div>

                {/* Bank Details list */}
                <div className="md:col-span-9 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-semibold text-[#071942]">
                  <div className="flex justify-between border-b border-[#f2f5fa] pb-2">
                    <span className="text-[#5f6d8a]">Bank</span>
                    <span className="font-bold">Standard Bank</span>
                  </div>
                  <div className="flex justify-between border-b border-[#f2f5fa] pb-2">
                    <span className="text-[#5f6d8a]">Account Name</span>
                    <span className="font-bold text-right truncate max-w-[150px]" title="SME Finance (Pty) Ltd - Trust Account">SME Finance (Pty) Ltd - Trust Account</span>
                  </div>
                  <div className="flex justify-between border-b border-[#f2f5fa] pb-2">
                    <span className="text-[#5f6d8a]">Account Number</span>
                    <span className="font-bold tracking-wider">1234 5678 9101</span>
                  </div>
                  <div className="flex justify-between border-b border-[#f2f5fa] pb-2">
                    <span className="text-[#5f6d8a]">Branch Code</span>
                    <span className="font-bold">051001</span>
                  </div>
                  <div className="flex justify-between border-b border-[#f2f5fa] pb-2 md:border-0 md:pb-0">
                    <span className="text-[#5f6d8a]">Account Type</span>
                    <span className="font-bold">Business Current Account</span>
                  </div>
                  <div className="flex justify-between md:border-0">
                    <span className="text-[#5f6d8a] font-bold text-indigo-600">Payment Reference</span>
                    <span className="font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">LENDER-00125</span>
                  </div>
                </div>
              </div>

              {/* Action buttons copy/download */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-4 border-t border-[#f2f5fa]">
                <button
                  onClick={handleCopyDetails}
                  className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-[#dfe5f0] bg-white hover:bg-slate-50 py-3 text-xs font-extrabold text-[#5f6d8a] transition"
                >
                  <Copy className="h-4 w-4" />
                  Copy Details
                </button>
                <button
                  onClick={handleDownloadPDF}
                  className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-[#dfe5f0] bg-white hover:bg-slate-50 py-3 text-xs font-extrabold text-[#5f6d8a] transition"
                >
                  <Download className="h-4 w-4" />
                  Download PDF
                </button>
              </div>

            </div>

          </div>

          {/* Right Column (Progress, Deposit history, notes) */}
          <div className="space-y-6">
            
            {/* Funding Progress widget */}
            <div className="rounded-2xl border border-[#e9eef8] bg-white p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-[#f2f5fa] pb-3">
                <h3 className="text-sm font-bold text-[#071942]">Funding Progress</h3>
                
                {!isEditingTarget ? (
                  <button
                    onClick={() => {
                      setTargetCapitalInput(String(targetCapital));
                      setIsEditingTarget(true);
                    }}
                    className="text-[10px] font-bold text-[#4f63f6] hover:underline"
                  >
                    Edit Target Capital
                  </button>
                ) : (
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      value={targetCapitalInput}
                      onChange={(e) => setTargetCapitalInput(e.target.value)}
                      className="w-24 rounded border border-[#dfe5f0] px-1.5 py-0.5 text-[10px] font-black outline-none focus:border-[#4f63f6]"
                    />
                    <button
                      onClick={handleSaveTargetCapital}
                      className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100 hover:bg-emerald-100 transition"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => setIsEditingTarget(false)}
                      className="text-[9px] font-bold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-100 hover:bg-rose-100 transition"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>

              {/* Progress visual row */}
              <div className="grid grid-cols-2 gap-4 text-xs font-semibold text-[#071942]">
                <div>
                  <span className="text-[#8f9bba] text-[9.5px] font-bold uppercase tracking-wide">Target Capital</span>
                  <p className="text-base font-black text-[#071942] mt-0.5">{formatZAR(targetCapital)}</p>
                </div>
                <div className="text-right">
                  <span className="text-[#8f9bba] text-[9.5px] font-bold uppercase tracking-wide">Current Capital</span>
                  <p className="text-base font-black text-[#071942] mt-0.5">{formatZAR(currentCapital)}</p>
                </div>
              </div>

              {/* Progress bar line */}
              <div className="space-y-2 pt-1">
                <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden flex items-center relative">
                  <div
                    className="h-full bg-emerald-500 transition-all duration-500 rounded-full"
                    style={{ width: `${targetPercentage}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-[10px] font-bold">
                  <span className="text-[#5f6d8a]">{targetPercentage}% of your target capital has been reached.</span>
                  <span className="text-emerald-600">{targetPercentage}%</span>
                </div>
              </div>

            </div>

            {/* Recent Deposits table card */}
            <div className="rounded-2xl border border-[#e9eef8] bg-white p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-[#f2f5fa] pb-3">
                <h3 className="text-sm font-bold text-[#071942]">Recent Deposits</h3>
                <button onClick={() => navigate("/lender/transactions")} className="text-[10px] font-bold text-[#4f63f6] hover:underline">View All</button>
              </div>

              {/* Deposit List table */}
              <div className="overflow-x-auto">
                <table className="w-full text-[11px] font-semibold text-[#071942] text-left border-collapse">
                  <thead>
                    <tr className="border-b border-[#f2f5fa] text-[#8f9bba] text-[9.5px] uppercase font-bold">
                      <th className="pb-2">Date</th>
                      <th className="pb-2">Reference</th>
                      <th className="pb-2">Amount</th>
                      <th className="pb-2">Status</th>
                      <th className="pb-2 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {deposits.map((dep, idx) => (
                      <tr key={idx} className="border-b border-dashed border-[#f2f5fa] last:border-0 py-3 block-items-row">
                        <td className="py-2.5 whitespace-nowrap text-[#5f6d8a]">{dep.date}</td>
                        <td className="py-2.5 whitespace-nowrap font-mono">{dep.reference}</td>
                        <td className="py-2.5 whitespace-nowrap font-bold">{formatZAR(dep.amount)}</td>
                        <td className="py-2.5 whitespace-nowrap">
                          <span className={`inline-flex px-1.5 py-0.5 rounded text-[8px] font-bold tracking-wide uppercase ${
                            dep.status === "Completed"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                              : dep.status === "Pending"
                              ? "bg-amber-50 text-amber-700 border border-amber-100"
                              : "bg-rose-50 text-rose-700 border border-rose-100"
                          }`}>
                            {dep.status}
                          </span>
                        </td>
                        <td className="py-2.5 whitespace-nowrap text-right">
                          <div className="inline-flex gap-1.5 items-center justify-end">
                            {dep.status === "Completed" && (
                              <button 
                                onClick={() => enqueueSnackbar("Downloaded invoice receipt for " + dep.reference, { variant: "success" })}
                                className="h-6 w-6 flex items-center justify-center rounded bg-slate-50 border border-[#dfe5f0] text-[#5f6d8a] hover:bg-slate-100 transition"
                                title="Download Receipt"
                              >
                                <Download className="h-3 w-3" />
                              </button>
                            )}
                            {dep.status === "Pending" && (
                              <button
                                onClick={() => handleClearPending(dep.reference, dep.amount)}
                                className="h-6 w-6 flex items-center justify-center rounded bg-emerald-50 border border-emerald-100 text-emerald-600 hover:bg-emerald-100 transition"
                                title="Approve & Clear Deposit"
                              >
                                <Check className="h-3.5 w-3.5 font-bold" />
                              </button>
                            )}
                            {dep.status === "Failed" && (
                              <button
                                onClick={() => handleRetryFailed(dep.reference, dep)}
                                className="h-6 w-6 flex items-center justify-center rounded bg-rose-50 border border-rose-100 text-rose-600 hover:bg-rose-100 transition"
                                title="Retry Deposit Details"
                              >
                                <RefreshCw className="h-3 w-3" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Important Notes */}
            <div className="rounded-2xl border border-[#e9eef8] bg-white p-5 shadow-sm space-y-4">
              <h4 className="text-xs font-bold text-[#071942] uppercase tracking-wider border-b border-[#f2f5fa] pb-2">Important Notes</h4>
              <div className="space-y-3.5 text-xs text-[#5f6d8a]">
                <div className="flex items-start gap-2.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                  <p>Funds are held in a secure, ring-fenced trust account. Your capital is protected and used only for approved financings.</p>
                </div>
                <div className="flex items-start gap-2.5">
                  <Clock className="h-4 w-4 text-[#4f63f6] shrink-0 mt-0.5" />
                  <p>EFT deposits may take up to 1 business day to clear. Instant EFT deposits reflect immediately.</p>
                </div>
                <div className="flex items-start gap-2.5">
                  <FileText className="h-4 w-4 text-indigo-500 shrink-0 mt-0.5" />
                  <p>Always use your unique reference. Deposits without a reference may cause clearance delays.</p>
                </div>
                <div className="flex items-start gap-2.5">
                  <Info className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
                  <p>Need help? Contact our support team if you have any deposit or transaction questions.</p>
                </div>
              </div>
            </div>

            {/* Tips for Lenders */}
            <div className="rounded-2xl border border-indigo-100 bg-indigo-50/20 p-5 shadow-sm space-y-4">
              <h4 className="text-xs font-bold text-[#071942] uppercase tracking-wider border-b border-indigo-100/30 pb-2">Tips for Lenders</h4>
              <ul className="space-y-2.5 text-xs text-[#5f6d8a] font-medium">
                <li className="flex items-start gap-2">
                  <span className="text-indigo-600 font-bold">✓</span>
                  <span>Higher available capital gives you access to larger and more profitable opportunities.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-indigo-600 font-bold">✓</span>
                  <span>Diversify across industries to reduce risk and improve portfolio yield.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-indigo-600 font-bold">✓</span>
                  <span>Check risk scores and SME profiles before submitting deal funding amounts.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-indigo-600 font-bold">✓</span>
                  <span>Monitor your portfolio performance regularly from your analytics report dashboard.</span>
                </li>
              </ul>
            </div>

          </div>

        </div>

        {/* Quick Actions Grid Card links */}
        <div className="border-t border-[#e9eef8] pt-6 space-y-3">
          <h3 className="text-xs font-bold text-[#8f9bba] uppercase tracking-wider">Quick Actions</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            
            <div
              onClick={() => navigate("/lender/fund-a-deal")}
              className="rounded-2xl border border-[#e9eef8] bg-white p-5 shadow-sm cursor-pointer hover:shadow-md hover:border-[#4f63f6]/40 transition group flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-[#4f63f6] group-hover:bg-indigo-100 transition">
                  <Building className="h-4.5 w-4.5" />
                </div>
                <div>
                  <h4 className="font-extrabold text-[12.5px] text-[#071942]">Browse Deals</h4>
                  <p className="text-[10px] text-[#8f9bba] mt-0.5">View available opportunities</p>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-[#4f63f6] group-hover:translate-x-1 transition" />
            </div>

            <div
              onClick={() => navigate("/lender/funded-deals")}
              className="rounded-2xl border border-[#e9eef8] bg-white p-5 shadow-sm cursor-pointer hover:shadow-md hover:border-[#4f63f6]/40 transition group flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 group-hover:bg-emerald-100 transition">
                  <Wallet className="h-4.5 w-4.5" />
                </div>
                <div>
                  <h4 className="font-extrabold text-[12.5px] text-[#071942]">Portfolio</h4>
                  <p className="text-[10px] text-[#8f9bba] mt-0.5">View your funded deals</p>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-[#4f63f6] group-hover:translate-x-1 transition" />
            </div>

            <div
              onClick={() => navigate("/lender/transactions")}
              className="rounded-2xl border border-[#e9eef8] bg-white p-5 shadow-sm cursor-pointer hover:shadow-md hover:border-[#4f63f6]/40 transition group flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-600 group-hover:bg-amber-100 transition">
                  <Clock className="h-4.5 w-4.5" />
                </div>
                <div>
                  <h4 className="font-extrabold text-[12.5px] text-[#071942]">Transactions</h4>
                  <p className="text-[10px] text-[#8f9bba] mt-0.5">View deposit history</p>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-[#4f63f6] group-hover:translate-x-1 transition" />
            </div>

            <div
              onClick={() => navigate("/lender/reports")}
              className="rounded-2xl border border-[#e9eef8] bg-white p-5 shadow-sm cursor-pointer hover:shadow-md hover:border-[#4f63f6]/40 transition group flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600 group-hover:bg-blue-100 transition">
                  <FileText className="h-4.5 w-4.5" />
                </div>
                <div>
                  <h4 className="font-extrabold text-[12.5px] text-[#071942]">Reports</h4>
                  <p className="text-[10px] text-[#8f9bba] mt-0.5">Generate portfolio reports</p>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-[#4f63f6] group-hover:translate-x-1 transition" />
            </div>

          </div>
        </div>

      </div>
    </LenderLayout>
  );
}
