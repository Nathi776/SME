import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { FileText, Clock, Check, ArrowRight, ArrowLeft, HeartHandshake, ShieldCheck } from "lucide-react";
import api from "../api/client";
import { FinanceApi } from "../api/financeApi";
import { useSnackbar } from "notistack";
import { formatZAR } from "../utils/format";
import { formatApiErrorDetail } from "../utils/formatApiError";

interface Invoice {
  id: number;
  client_name: string;
  amount: number;
  invoice_number?: string;
  issue_date?: string;
  due_date?: string;
  status: string;
}

interface FinanceRequest {
  id: number;
  amount_requested: number;
  fee_rate: number;
  status: string;
  created_at: string;
}

const calculateEligibleAmount = (invoiceAmount: number, score: number | null) => {
  if (score === null || score < 40) return invoiceAmount * 0.6;
  if (score < 60) return invoiceAmount * 0.7;
  if (score < 80) return invoiceAmount * 0.8;
  return invoiceAmount * 0.9;
};

const getFeeRate = (score: number | null) => {
  if (score === null || score < 40) return 0.08;
  if (score < 60) return 0.05;
  if (score < 80) return 0.025; // 2.5%
  return 0.015; // 1.5%
};

export default function FinanceRequestPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { enqueueSnackbar } = useSnackbar();

  // Navigation steps: 1 = Form Entry, 3 = Review, 4 = Success
  const [currentStep, setCurrentStep] = useState<1 | 3 | 4>(1);

  // Form State
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [financeRequests, setFinanceRequests] = useState<FinanceRequest[]>([]);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<number | "">("");
  const [requestedAmount, setRequestedAmount] = useState<number>(0);
  const [purpose, setPurpose] = useState("Working Capital");
  const [payoutDate, setPayoutDate] = useState("2026-06-15");
  const [additionalNotes, setAdditionalNotes] = useState("");

  // Terms Checkboxes
  const [term1, setTerm1] = useState(false);
  const [term2, setTerm2] = useState(false);
  const [term3, setTerm3] = useState(false);

  // SME Details & Credit Score
  const [creditScore, setCreditScore] = useState<number | null>(78);
  const [loading, setLoading] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const dashboardRes = await api.get("/smes/dashboard");
      const smeId = dashboardRes.data.sme_id;
      const scoreVal = dashboardRes.data.credit_score ?? 78;
      setCreditScore(scoreVal);

      const [invoicesRes, requestsRes] = await Promise.all([
        api.get(`/invoices/sme/${smeId}`),
        api.get(`/finance/requests/${smeId}`),
      ]);

      const activeInvoices = invoicesRes.data.filter((inv: Invoice) => inv.status !== "paid");
      setInvoices(activeInvoices);
      setFinanceRequests(requestsRes.data || []);

      // Check for preselected invoice state passed from onboarding
      const preselectInvoiceId = location.state?.preselectInvoiceId;
      if (preselectInvoiceId) {
        setSelectedInvoiceId(Number(preselectInvoiceId));
        const selected = activeInvoices.find((inv: Invoice) => inv.id === Number(preselectInvoiceId));
        if (selected) {
          const prefill = location.state?.prefillAmount;
          if (prefill) {
            setRequestedAmount(Number(prefill));
          } else {
            setRequestedAmount(calculateEligibleAmount(selected.amount, scoreVal));
          }
        }
      } else {
        const prefillClientName = location.state?.prefillClientName;
        if (prefillClientName) {
          // Find first outstanding invoice for this client
          const selected = activeInvoices.find((inv: Invoice) => 
            inv.client_name.toLowerCase().includes(prefillClientName.toLowerCase()) || 
            prefillClientName.toLowerCase().includes(inv.client_name.toLowerCase())
          );
          if (selected) {
            setSelectedInvoiceId(selected.id);
            setRequestedAmount(calculateEligibleAmount(selected.amount, scoreVal));
          } else {
            enqueueSnackbar(`No outstanding invoices found for ${prefillClientName}.`, { variant: "info" });
          }
        }
      }
    } catch (err) {
      enqueueSnackbar("Failed to load dashboard parameters.", { variant: "error" });
    } finally {
      setLoading(false);
    }
  }, [location.state, enqueueSnackbar]);

  useEffect(() => {
    const token = sessionStorage.getItem("token");
    if (!token) {
      navigate("/");
      return;
    }
    loadData();
  }, [navigate, loadData]);

  // Handle invoice selection changes
  const handleSelectInvoice = (id: number) => {
    setSelectedInvoiceId(id);
    const selected = invoices.find((inv) => inv.id === id);
    if (selected) {
      const maxEligible = calculateEligibleAmount(selected.amount, creditScore);
      setRequestedAmount(maxEligible);
    }
  };

  // Find currently selected invoice object
  const selectedInvoice = useMemo(() => {
    return invoices.find((inv) => inv.id === Number(selectedInvoiceId)) || null;
  }, [invoices, selectedInvoiceId]);

  // Derived financial previews
  const previewMetrics = useMemo(() => {
    if (!selectedInvoice) return { maxEligible: 0, advanceRate: 80, feeRatePercent: "2.5", feeAmount: 0, payout: 0 };

    const scoreVal = creditScore ?? 78;
    const advanceRate = scoreVal < 40 ? 60 : scoreVal < 60 ? 70 : scoreVal < 80 ? 80 : 90;
    const feeRate = getFeeRate(scoreVal);
    const maxEligible = calculateEligibleAmount(selectedInvoice.amount, scoreVal);

    const feeAmount = requestedAmount * feeRate;
    const payout = requestedAmount - feeAmount;

    return {
      maxEligible,
      advanceRate,
      feeRatePercent: (feeRate * 100).toFixed(1),
      feeAmount,
      payout: Math.max(0, payout),
    };
  }, [selectedInvoice, requestedAmount, creditScore]);

  // Dynamic statistics for right card
  const historyStats = useMemo(() => {
    const total = financeRequests.length;
    const approved = financeRequests.filter((r) => r.status === "approved").length;
    const funded = financeRequests.filter((r) => r.status === "funded" || r.status === "paid" || r.status === "closed" || r.status === "completed").length;
    const pending = financeRequests.filter((r) => r.status === "pending").length;

    const totalFundedAmount = financeRequests
      .filter((r) => r.status === "funded" || r.status === "paid" || r.status === "closed" || r.status === "completed")
      .reduce((sum, r) => sum + Number(r.amount_requested), 0);

    return { total, approved, funded, pending, totalFundedAmount };
  }, [financeRequests]);

  const isFormValid = useMemo(() => {
    if (!selectedInvoiceId) return false;
    if (requestedAmount <= 0 || requestedAmount > previewMetrics.maxEligible) return false;
    if (!term1 || !term2 || !term3) return false;
    return true;
  }, [selectedInvoiceId, requestedAmount, previewMetrics.maxEligible, term1, term2, term3]);

  // Submit the request to the backend API
  const handleFinalSubmit = async () => {
    if (!selectedInvoiceId || requestedAmount <= 0) return;

    try {
      setLoading(true);
      await FinanceApi.apply(
        Number(selectedInvoiceId),
        requestedAmount,
        purpose,
        payoutDate ? new Date(payoutDate).toISOString() : undefined,
        additionalNotes || undefined
      );
      enqueueSnackbar("Finance request submitted successfully!", { variant: "success" });
      setCurrentStep(4); // Success step
    } catch (err: any) {
      const detail = err?.response?.data?.detail;
      const text = formatApiErrorDetail(detail) || "Failed to submit financing request.";
      enqueueSnackbar(text, { variant: "error" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 pb-12 text-[#071942]">
      {/* Page Header */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2 text-xs font-semibold text-[#8f9bba]">
          <span className="cursor-pointer hover:text-[#1f724f]" onClick={() => navigate("/dashboard")}>Dashboard</span>
          <span>&gt;</span>
          <span className="text-[#071942]">Finance Requests</span>
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight text-[#071942]">Request Finance</h1>
        <p className="text-sm text-[#5f6d8a] mt-0.5">Apply for funding against your outstanding invoice</p>
      </div>

      {/* 4-Step Stepper Progress Bar */}
      <div className="rounded-2xl border border-[#e9eef8] bg-white p-5 shadow-sm">
        <div className="max-w-4xl mx-auto flex items-center justify-between relative">
          {/* Progress Connecting Line */}
          <div className="absolute top-[22px] left-8 right-8 h-1 bg-[#edf2fa] -z-10">
            <div 
              className="h-full bg-[#1f724f] transition-all duration-300"
              style={{
                width: currentStep === 1 ? "33.3%" : currentStep === 3 ? "66.6%" : "100%"
              }}
            />
          </div>

          {/* Step 1 & 2: Form Selection */}
          <div className="flex flex-col items-center text-center">
            <div className={`flex h-11 w-11 items-center justify-center rounded-full text-sm font-bold border-2 transition-all ${
              currentStep >= 1 ? "bg-[#1f724f] text-white border-[#1f724f] shadow-[0_4px_12px_rgba(31,114,79,0.2)]" : "bg-white text-[#8f9bba] border-[#dfe5f0]"
            }`}>
              {currentStep > 1 ? <Check className="h-5 w-5" /> : "1"}
            </div>
            <span className="mt-2 text-xs font-bold text-[#071942]">Invoice Selection</span>
            <span className="text-[10px] text-[#8f9bba] mt-0.5">Select an invoice</span>
          </div>

          {/* Step 2: Request Details */}
          <div className="flex flex-col items-center text-center">
            <div className={`flex h-11 w-11 items-center justify-center rounded-full text-sm font-bold border-2 transition-all ${
              currentStep >= 1 ? "bg-[#1f724f] text-white border-[#1f724f] shadow-[0_4px_12px_rgba(31,114,79,0.2)]" : "bg-white text-[#8f9bba] border-[#dfe5f0]"
            }`}>
              {currentStep > 1 ? <Check className="h-5 w-5" /> : "2"}
            </div>
            <span className="mt-2 text-xs font-bold text-[#071942]">Request Details</span>
            <span className="text-[10px] text-[#8f9bba] mt-0.5">Provide request details</span>
          </div>

          {/* Step 3: Review & Confirm */}
          <div className="flex flex-col items-center text-center">
            <div className={`flex h-11 w-11 items-center justify-center rounded-full text-sm font-bold border-2 transition-all ${
              currentStep >= 3 ? "bg-[#1f724f] text-white border-[#1f724f] shadow-[0_4px_12px_rgba(31,114,79,0.2)]" : "bg-white text-[#8f9bba] border-[#dfe5f0]"
            }`}>
              {currentStep > 3 ? <Check className="h-5 w-5" /> : "3"}
            </div>
            <span className="mt-2 text-xs font-bold text-[#071942]">Review & Confirm</span>
            <span className="text-[10px] text-[#8f9bba] mt-0.5">Review your request</span>
          </div>

          {/* Step 4: Submitted */}
          <div className="flex flex-col items-center text-center">
            <div className={`flex h-11 w-11 items-center justify-center rounded-full text-sm font-bold border-2 transition-all ${
              currentStep === 4 ? "bg-[#1f724f] text-white border-[#1f724f] shadow-[0_4px_12px_rgba(31,114,79,0.2)]" : "bg-white text-[#8f9bba] border-[#dfe5f0]"
            }`}>
              4
            </div>
            <span className="mt-2 text-xs font-bold text-[#071942]">Submitted</span>
            <span className="text-[10px] text-[#8f9bba] mt-0.5">Await lender decision</span>
          </div>
        </div>
      </div>

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        {/* Left Column (Forms / Wizards) */}
        <div className="xl:col-span-2 space-y-6">
          {currentStep === 1 && (
            <>
              {/* Section 1: Select Invoice to Finance */}
              <div className="rounded-2xl border border-[#e9eef8] bg-white p-6 shadow-sm">
                <div className="flex items-center gap-3 border-b border-[#e9eef8] pb-4 mb-5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#1f724f] text-sm font-bold text-white">
                    1
                  </div>
                  <h2 className="text-lg font-bold text-[#071942]">Select Invoice to Finance</h2>
                </div>
                <p className="text-xs text-[#5f6d8a] -mt-2 mb-4">Choose an eligible invoice from your outstanding invoices.</p>

                {invoices.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 text-center rounded-xl bg-slate-50 border border-slate-100">
                    <FileText className="h-10 w-10 text-slate-400 mb-2" />
                    <p className="text-sm font-bold text-[#071942]">No eligible invoices found</p>
                    <p className="text-xs text-[#5f6d8a] mt-1 max-w-[280px]">All invoices are settled or currently under review. Upload a new invoice to apply.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {invoices.map((inv) => {
                      const isSelected = selectedInvoiceId === inv.id;
                      const issueStr = inv.issue_date ? new Date(inv.issue_date).toLocaleDateString("en-ZA", { day: "2-digit", month: "short", year: "numeric" }) : "-";
                      const dueStr = inv.due_date ? new Date(inv.due_date).toLocaleDateString("en-ZA", { day: "2-digit", month: "short", year: "numeric" }) : "-";

                      // Calculate remaining terms
                      let remainingDays = 30;
                      if (inv.due_date) {
                        const diffTime = new Date(inv.due_date).getTime() - new Date().getTime();
                        remainingDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                      }

                      return (
                        <div
                          key={inv.id}
                          onClick={() => handleSelectInvoice(inv.id)}
                          className={`flex items-start gap-4 p-4 rounded-xl border-2 transition cursor-pointer ${
                            isSelected 
                              ? "border-[#1f724f] bg-emerald-50/10"
                              : "border-[#dfe5f0] hover:border-[#1f724f]/50 hover:bg-slate-50/50"
                          }`}
                        >
                          <div className={`mt-1 flex h-5.5 w-5.5 shrink-0 items-center justify-center rounded-full border-2 ${
                            isSelected ? "border-[#1f724f]" : "border-[#dfe5f0]"
                          }`}>
                            {isSelected && <div className="h-3 w-3 rounded-full bg-[#1f724f]" />}
                          </div>
                          
                          <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-3">
                            <div className="md:col-span-2">
                              <h4 className="font-extrabold text-sm text-[#071942]">{inv.invoice_number || `INV-2026-${String(inv.id).padStart(3, "0")}`}</h4>
                              <p className="text-xs text-[#5f6d8a] mt-0.5">{inv.client_name}</p>
                            </div>
                            <div>
                              <p className="text-xs font-bold text-[#5f6d8a] uppercase tracking-wide">Amount</p>
                              <p className="text-sm font-extrabold text-[#071942] mt-0.5">{formatZAR(inv.amount)}</p>
                            </div>
                            <div className="flex flex-col md:items-end">
                              <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                                remainingDays < 0 ? "bg-rose-50 text-rose-700" : "bg-emerald-50 text-emerald-700"
                              }`}>
                                {remainingDays < 0 ? `Overdue by ${Math.abs(remainingDays)} days` : `Due in ${remainingDays} days`}
                              </span>
                              <p className="text-[10px] text-[#8f9bba] mt-1">Issued: {issueStr} | Due: {dueStr}</p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Section 2: Finance Request Details */}
              <div className="rounded-2xl border border-[#e9eef8] bg-white p-6 shadow-sm">
                <div className="flex items-center gap-3 border-b border-[#e9eef8] pb-4 mb-5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#1f724f] text-sm font-bold text-white">
                    2
                  </div>
                  <h2 className="text-lg font-bold text-[#071942]">Finance Request Details</h2>
                </div>

                <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
                  <div>
                    <label className="block text-xs font-bold text-[#5f6d8a] mb-2 uppercase tracking-wide">Invoice Amount</label>
                    <input
                      type="text"
                      disabled
                      value={selectedInvoice ? formatZAR(selectedInvoice.amount) : "R0.00"}
                      className="w-full rounded-xl border border-[#dfe5f0] bg-slate-50 px-4 py-3 text-sm text-[#5f6d8a] font-bold cursor-not-allowed"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#5f6d8a] mb-2 uppercase tracking-wide">Maximum Eligible ({previewMetrics.advanceRate}% Advance)</label>
                    <input
                      type="text"
                      disabled
                      value={formatZAR(previewMetrics.maxEligible)}
                      className="w-full rounded-xl border border-[#dfe5f0] bg-slate-50 px-4 py-3 text-sm text-[#5f6d8a] font-bold cursor-not-allowed"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#5f6d8a] mb-2 uppercase tracking-wide">Requested Amount *</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-[#5f6d8a]">R</span>
                      <input
                        type="number"
                        disabled={!selectedInvoiceId}
                        placeholder="35 000.00"
                        value={requestedAmount || ""}
                        onChange={(e) => setRequestedAmount(e.target.value === "" ? 0 : Number(e.target.value))}
                        className="w-full rounded-xl border border-[#dfe5f0] bg-white pl-8 pr-4 py-3 text-sm text-[#071942] placeholder-[#91a1bf] font-bold transition focus:border-[#1f724f] focus:outline-none focus:ring-1 focus:ring-[#1f724f]"
                      />
                    </div>
                    {selectedInvoiceId && requestedAmount > previewMetrics.maxEligible && (
                      <p className="text-[10px] font-semibold text-rose-600 mt-1">Amount cannot exceed max eligible limit</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#5f6d8a] mb-2 uppercase tracking-wide">Purpose of Funding *</label>
                    <select
                      value={purpose}
                      onChange={(e) => setPurpose(e.target.value)}
                      className="w-full rounded-xl border border-[#dfe5f0] bg-white px-4 py-3 text-sm text-[#071942] transition focus:border-[#1f724f] focus:outline-none focus:ring-1 focus:ring-[#1f724f]"
                    >
                      <option value="Working Capital">Working Capital</option>
                      <option value="Inventory Purchase">Inventory Purchase</option>
                      <option value="Equipment">Equipment</option>
                      <option value="Payroll">Payroll</option>
                      <option value="Expansion">Expansion</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-[#5f6d8a] mb-2 uppercase tracking-wide">Preferred Payout Date</label>
                    <input
                      type="date"
                      value={payoutDate}
                      onChange={(e) => setPayoutDate(e.target.value)}
                      className="w-full rounded-xl border border-[#dfe5f0] bg-white px-4 py-3 text-sm text-[#071942] transition focus:border-[#1f724f] focus:outline-none focus:ring-1 focus:ring-[#1f724f]"
                    />
                  </div>

                  <div className="md:col-span-3">
                    <label className="block text-xs font-bold text-[#5f6d8a] mb-2 uppercase tracking-wide">Additional Notes (Optional)</label>
                    <textarea
                      rows={3}
                      maxLength={500}
                      placeholder="Tell lenders more about how you plan to use these funds..."
                      value={additionalNotes}
                      onChange={(e) => setAdditionalNotes(e.target.value)}
                      className="w-full rounded-xl border border-[#dfe5f0] bg-white px-4 py-3 text-sm text-[#071942] placeholder-[#91a1bf] transition focus:border-[#1f724f] focus:outline-none focus:ring-1 focus:ring-[#1f724f]"
                    />
                    <div className="flex justify-end text-[10px] text-[#8f9bba] mt-1">
                      {additionalNotes.length}/500
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 3: Terms & Conditions */}
              <div className="rounded-2xl border border-[#e9eef8] bg-white p-6 shadow-sm">
                <div className="flex items-center gap-3 border-b border-[#e9eef8] pb-4 mb-5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#1f724f] text-sm font-bold text-white">
                    3
                  </div>
                  <h2 className="text-lg font-bold text-[#071942]">Terms & Conditions</h2>
                </div>

                <div className="space-y-3.5">
                  <label className="flex items-start gap-3 text-xs text-[#5f6d8a] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={term1}
                      onChange={(e) => setTerm1(e.target.checked)}
                      className="mt-0.5 rounded border-[#dfe5f0] text-[#1f724f] focus:ring-[#1f724f]"
                    />
                    <span>I confirm that the information provided is true and correct.</span>
                  </label>
                  
                  <label className="flex items-start gap-3 text-xs text-[#5f6d8a] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={term2}
                      onChange={(e) => setTerm2(e.target.checked)}
                      className="mt-0.5 rounded border-[#dfe5f0] text-[#1f724f] focus:ring-[#1f724f]"
                    />
                    <span>I confirm that the selected invoice is genuine and not previously financed.</span>
                  </label>

                  <label className="flex items-start gap-3 text-xs text-[#5f6d8a] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={term3}
                      onChange={(e) => setTerm3(e.target.checked)}
                      className="mt-0.5 rounded border-[#dfe5f0] text-[#1f724f] focus:ring-[#1f724f]"
                    />
                    <span>I understand that approval is at the discretion of lenders and not guaranteed.</span>
                  </label>
                </div>
              </div>

              {/* Bottom Actions */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-[#e9eef8] pt-6">
                <button
                  onClick={() => {
                    enqueueSnackbar("Draft saved successfully", { variant: "info" });
                    navigate("/dashboard");
                  }}
                  className="w-full sm:w-auto rounded-xl border border-[#dfe5f0] bg-white px-6 py-3 text-sm font-bold text-[#5f6d8a] hover:bg-slate-50 transition active:scale-95 text-center"
                >
                  Save Draft
                </button>
                <button
                  onClick={() => setCurrentStep(3)}
                  disabled={!isFormValid}
                  className={`w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3 text-sm font-bold text-white shadow-lg transition active:scale-95 text-center ${
                    isFormValid
                      ? "bg-[#1f724f] hover:bg-[#165339] shadow-emerald-950/10 hover:shadow-emerald-950/20"
                      : "bg-slate-300 cursor-not-allowed shadow-none"
                  }`}
                >
                  Review & Submit Request
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </>
          )}

          {currentStep === 3 && (
            /* Step 3: Review & Confirm */
            <div className="rounded-2xl border border-[#e9eef8] bg-white p-6 shadow-sm space-y-6">
              <div className="border-b border-[#e9eef8] pb-4">
                <h2 className="text-xl font-extrabold text-[#071942]">Review & Confirm</h2>
                <p className="text-xs text-[#5f6d8a] mt-0.5">Please review your lending request parameters before final submission.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
                <div className="space-y-4">
                  <h3 className="font-extrabold text-xs uppercase text-[#5f6d8a] tracking-wider">Invoice details</h3>
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-2">
                    <p className="font-bold text-[#071942]">Invoice Number: <span className="font-medium text-[#5f6d8a]">{selectedInvoice?.invoice_number || `INV-2026-${String(selectedInvoice?.id).padStart(3,"0")}`}</span></p>
                    <p className="font-bold text-[#071942]">Client: <span className="font-medium text-[#5f6d8a]">{selectedInvoice?.client_name}</span></p>
                    <p className="font-bold text-[#071942]">Full Value: <span className="font-medium text-[#5f6d8a]">{formatZAR(selectedInvoice?.amount || 0)}</span></p>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="font-extrabold text-xs uppercase text-[#5f6d8a] tracking-wider">Financing parameters</h3>
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-2">
                    <p className="font-bold text-[#071942]">Requested Funding: <span className="font-black text-[#1f724f]">{formatZAR(requestedAmount)}</span></p>
                    <p className="font-bold text-[#071942]">Purpose of Funding: <span className="font-medium text-[#5f6d8a]">{purpose}</span></p>
                    <p className="font-bold text-[#071942]">Payout Date: <span className="font-medium text-[#5f6d8a]">{payoutDate}</span></p>
                  </div>
                </div>

                {additionalNotes && (
                  <div className="md:col-span-2 space-y-2">
                    <h3 className="font-extrabold text-xs uppercase text-[#5f6d8a] tracking-wider">Additional notes</h3>
                    <p className="bg-slate-50 p-4 rounded-xl border border-slate-100 text-[#5f6d8a] italic">
                      "{additionalNotes}"
                    </p>
                  </div>
                )}

                <div className="md:col-span-2 flex items-start gap-2.5 rounded-xl bg-emerald-50/30 p-4 border border-emerald-100/30 text-xs text-[#1f724f] leading-normal">
                  <ShieldCheck className="h-5 w-5 shrink-0 text-[#1f724f] mt-0.5" />
                  <p>By confirming and submitting, you declare that the selected invoice is genuine, not previously financed, and all details submitted are correct.</p>
                </div>
              </div>

              {/* Step 3 Actions */}
              <div className="flex items-center justify-between border-t border-[#e9eef8] pt-6">
                <button
                  onClick={() => setCurrentStep(1)}
                  disabled={loading}
                  className="rounded-xl border border-[#dfe5f0] bg-white px-5 py-3 text-sm font-bold text-[#5f6d8a] hover:bg-slate-50 transition inline-flex items-center gap-2"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back
                </button>
                <button
                  onClick={handleFinalSubmit}
                  disabled={loading}
                  className="rounded-xl bg-[#1f724f] px-6 py-3 text-sm font-bold text-white shadow-lg shadow-emerald-950/10 hover:bg-[#165339] transition inline-flex items-center gap-2"
                >
                  {loading ? "Submitting..." : "Confirm & Submit"}
                  <Check className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          {currentStep === 4 && (
            /* Step 4: Success state */
            <div className="rounded-2xl border border-[#e9eef8] bg-white p-8 shadow-sm text-center space-y-6">
              <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 shadow-[0_4px_16px_rgba(16,185,129,0.15)] animate-bounce">
                <Check className="h-8 w-8" />
              </div>

              <div>
                <h2 className="text-2xl font-extrabold text-[#071942]">Finance Request Submitted!</h2>
                <p className="text-sm text-[#5f6d8a] mt-2 max-w-md mx-auto">
                  Your request has been successfully registered and is now listed on the lender board for risk analysis and decision making.
                </p>
              </div>

              <div className="max-w-md mx-auto rounded-xl bg-slate-50 border border-slate-100 p-4 text-xs text-left space-y-2 text-[#5f6d8a]">
                <p className="font-semibold text-[#071942]">What happens next:</p>
                <p>1. Lenders will inspect your credit profile and the selected invoice validity.</p>
                <p>2. Decisions are typically finalized within 24-48 hours.</p>
                <p>3. Once funded, payouts will be processed to your linked business account.</p>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
                <button
                  onClick={() => {
                    loadData();
                    setSelectedInvoiceId("");
                    setRequestedAmount(0);
                    setTerm1(false);
                    setTerm2(false);
                    setTerm3(false);
                    setCurrentStep(1);
                  }}
                  className="w-full sm:w-auto rounded-xl border border-[#dfe5f0] bg-white px-5 py-3 text-sm font-bold text-[#071942] hover:bg-slate-50 transition"
                >
                  Apply For Another
                </button>
                <button
                  onClick={() => navigate("/dashboard")}
                  className="w-full sm:w-auto rounded-xl bg-[#1f724f] px-6 py-3 text-sm font-bold text-white shadow-lg shadow-emerald-950/10 hover:bg-[#165339] transition"
                >
                  Go to Dashboard
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right Column (Previews & Widgets) */}
        <div className="space-y-6">
          {/* Finance Offer Preview */}
          <div className="rounded-2xl border border-[#e9eef8] bg-white p-6 shadow-sm">
            <h3 className="text-base font-extrabold text-[#071942] border-b border-[#e9eef8] pb-3 mb-5">Finance Preview</h3>
            
            <div className="space-y-4 text-sm">
              <div className="flex justify-between">
                <span className="text-[#5f6d8a]">Invoice Value</span>
                <span className="font-bold text-[#071942]">
                  {selectedInvoice ? formatZAR(selectedInvoice.amount) : "R0.00"}
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-[#5f6d8a]">Advance Rate</span>
                <span className="font-bold text-[#071942]">{previewMetrics.advanceRate}%</span>
              </div>

              <div className="flex justify-between">
                <span className="text-[#5f6d8a]">Maximum Finance</span>
                <span className="font-bold text-[#071942]">{formatZAR(previewMetrics.maxEligible)}</span>
              </div>

              <div className="flex justify-between border-t border-dashed border-[#e9eef8] pt-3">
                <span className="text-[#5f6d8a]">Requested Amount</span>
                <span className="font-bold text-[#071942]">{formatZAR(requestedAmount)}</span>
              </div>

              <div className="flex justify-between border-b border-[#f3f6fc] pb-3">
                <span className="text-[#5f6d8a]">Platform Fee ({previewMetrics.feeRatePercent}%)</span>
                <span className="font-semibold text-rose-600">-{formatZAR(previewMetrics.feeAmount)}</span>
              </div>

              {/* Net payout box */}
              <div className="rounded-xl bg-emerald-50/50 p-4 border border-emerald-100/30 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-[#1f724f] uppercase tracking-wider">Estimated Payout</p>
                  <p className="text-[10px] text-[#8f9bba] mt-0.5">Payout after review</p>
                </div>
                <span className="font-black text-xl text-[#1f724f]">
                  {formatZAR(previewMetrics.payout)}
                </span>
              </div>

              <div className="flex items-center gap-2 text-xs text-[#8f9bba] bg-slate-50 p-3 rounded-xl border border-slate-100">
                <Clock className="h-4.5 w-4.5 text-[#91a1bf] shrink-0" />
                <span>Expected Review Time: 24-48 Hours</span>
              </div>
            </div>
          </div>

          {/* Credit Score Card */}
          {creditScore !== null && (
            <div className="rounded-2xl border border-[#e9eef8] bg-white p-6 shadow-sm">
              <h3 className="text-base font-extrabold text-[#071942] border-b border-[#e9eef8] pb-3 mb-5">Credit Profile</h3>
              
              <div className="flex items-center gap-5">
                <div className="relative flex items-center justify-center h-20 w-20 shrink-0 rounded-full border-4 border-emerald-500/20">
                  <div className="text-center">
                    <span className="text-lg font-black text-[#071942]">{Math.round(creditScore * 10)}</span>
                  </div>
                </div>
                <div>
                  <h4 className="font-bold text-sm text-[#00a662]">
                    {creditScore >= 80 ? "Excellent" : creditScore >= 60 ? "Good" : creditScore >= 40 ? "Fair" : "Poor"}
                  </h4>
                  <p className="text-xs text-[#5f6d8a] mt-0.5">Low Risk standing</p>
                  <p className="text-[10px] text-[#8f9bba] mt-1">Your excellent credit score increases your chances of approval.</p>
                </div>
              </div>
            </div>
          )}

          {/* Funding History Card */}
          <div className="rounded-2xl border border-[#e9eef8] bg-white p-6 shadow-sm">
            <h3 className="text-base font-extrabold text-[#071942] border-b border-[#e9eef8] pb-3 mb-4">Funding History</h3>
            
            <div className="space-y-3 text-xs text-[#5f6d8a]">
              <div className="flex justify-between">
                <span>Total Requests</span>
                <span className="font-bold text-[#071942]">{historyStats.total}</span>
              </div>
              <div className="flex justify-between">
                <span>Approved Requests</span>
                <span className="font-bold text-[#071942]">{historyStats.approved}</span>
              </div>
              <div className="flex justify-between">
                <span>Funded Requests</span>
                <span className="font-bold text-[#071942]">{historyStats.funded}</span>
              </div>
              <div className="flex justify-between border-t border-dashed border-[#e9eef8] pt-2.5">
                <span>Total Funded Amount</span>
                <span className="font-extrabold text-[#071942]">{formatZAR(historyStats.totalFundedAmount)}</span>
              </div>
            </div>
          </div>

          {/* Contact Support */}
          <div className="rounded-2xl border border-dashed border-[#dfe5f0] bg-slate-50/50 p-5 text-center">
            <HeartHandshake className="h-6 w-6 text-[#1f724f] mx-auto mb-2" />
            <h4 className="text-xs font-bold text-[#071942]">Need Help?</h4>
            <p className="text-[10px] text-[#5f6d8a] mt-1">Our support team is here to help you.</p>
            <button
              onClick={() => navigate("/messages")}
              className="mt-3 w-full rounded-xl border border-[#dfe5f0] bg-white py-2 text-xs font-bold text-[#1f724f] hover:bg-slate-50 transition"
            >
              Contact Support
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
