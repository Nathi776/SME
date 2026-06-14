import React, { useEffect, useState, useMemo, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Briefcase,
  Calendar,
  FileText,
  Clock,
  Coins,
  AlertTriangle,
  Eye,
  Check
} from "lucide-react";
import LenderLayout from "../components/lender/LenderLayout";
import { LenderApi, type FinanceRequest, type AvailableSme } from "../api/lenderApi";
import { formatZAR } from "../utils/format";
import { useSnackbar } from "notistack";

interface UnderwritingDetails {
  id: number;
  req_code: string;
  status: string;
  submitted_date: string;
  requested_amount: number;
  invoice_amount: number;
  due_date: string;
  days_remaining: number;
  term: string;
  purpose: string;
  sme_name: string;
  industry: string;
  years_active: number;
  location: string;
  employees: number;
  total_invoices: number;
  total_financed: number;
  repayment_success_rate: number;
  previous_loans: string;
  credit_score: number;
  risk_level: "Low" | "Medium" | "High";
  approval_probability: number;
  recommended_amount: number;
  model_confidence: number;
  invoice_number: string;
  customer_name: string;
  amount_paid: number;
  outstanding_amount: number;
}

const DEFAULT_UNDERWRITING: UnderwritingDetails = {
  id: 15,
  req_code: "REQ-2026-015",
  status: "Pending Review",
  submitted_date: "20 Jun 2026 • 10:24 AM",
  requested_amount: 85000,
  invoice_amount: 95000,
  due_date: "30 Jul 2026",
  days_remaining: 40,
  term: "30 Days",
  purpose: "Working Capital",
  sme_name: "ABC Construction (Pty) Ltd",
  industry: "Construction",
  years_active: 5,
  location: "Gauteng, South Africa",
  employees: 12,
  total_invoices: 24,
  total_financed: 150000,
  repayment_success_rate: 96,
  previous_loans: "3 (All Repaid)",
  credit_score: 78,
  risk_level: "Low",
  approval_probability: 87,
  recommended_amount: 80000,
  model_confidence: 92,
  invoice_number: "INV-2026-024",
  customer_name: "City Power Solutions (Pty) Ltd",
  amount_paid: 0,
  outstanding_amount: 95000
};

export default function LenderRequestDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();

  const [dbRequests, setDbRequests] = useState<FinanceRequest[]>([]);
  const [availableSmes, setAvailableSmes] = useState<AvailableSme[]>([]);
  const [loading, setLoading] = useState(false);

  const [approvedAmountInput, setApprovedAmountInput] = useState<string>("");
  const [platformFeePercent, setPlatformFeePercent] = useState<number>(5);
  const [notes, setNotes] = useState("");
  const [submittingDecision, setSubmittingDecision] = useState(false);

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
      enqueueSnackbar("Error fetching details from server", { variant: "error" });
    } finally {
      setLoading(false);
    }
  }, [enqueueSnackbar]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const smesById = useMemo(() => {
    const map: Record<number, AvailableSme> = {};
    availableSmes.forEach((sme) => {
      map[sme.sme_id] = sme;
    });
    return map;
  }, [availableSmes]);

  const details = useMemo<UnderwritingDetails | null>(() => {
    const reqId = Number(id);
    const dbReq = dbRequests.find((r) => r.id === reqId);

    if (dbReq) {
      const sme = smesById[dbReq.sme_id];
      const name = sme?.company_name || `SME ${dbReq.sme_id}`;
      const creditScore = sme?.credit_score ?? 72;
      const riskLevel = sme?.risk_level || "Medium";
      const requested = Number(dbReq.amount_requested);
      const recommendPercent = creditScore >= 80 ? 1.0 : creditScore >= 60 ? 0.9 : 0.7;
      const recommended = Math.round(requested * recommendPercent);

      const submittedStr = new Date(dbReq.created_at).toLocaleDateString("en-ZA", {
        day: "2-digit",
        month: "short",
        year: "numeric"
      }) + " • " + new Date(dbReq.created_at).toLocaleTimeString("en-ZA", {
        hour: "2-digit",
        minute: "2-digit"
      });

      return {
        ...DEFAULT_UNDERWRITING,
        id: dbReq.id,
        req_code: `REQ-2026-${String(dbReq.id).padStart(3, "0")}`,
        status: dbReq.status === "pending" ? "Pending Review" : dbReq.status,
        submitted_date: submittedStr,
        requested_amount: requested,
        invoice_amount: Math.round(requested * 1.15),
        purpose: dbReq.purpose_of_funding || "Working Capital",
        sme_name: name,
        industry: sme?.industry || "Other",
        credit_score: creditScore,
        risk_level: riskLevel as any,
        recommended_amount: recommended,
        invoice_number: `INV-2026-${String(dbReq.invoice_id).padStart(3, "0")}`,
        outstanding_amount: Math.round(requested * 1.15)
      };
    }

    return reqId === 15 ? DEFAULT_UNDERWRITING : { ...DEFAULT_UNDERWRITING, id: reqId, req_code: `REQ-2026-${String(reqId).padStart(3, "0")}` };
  }, [id, dbRequests, smesById]);

  useEffect(() => {
    if (details) {
      setApprovedAmountInput(String(details.recommended_amount));
      const score = details.credit_score;
      if (score >= 80) setPlatformFeePercent(1.5);
      else if (score >= 60) setPlatformFeePercent(2.5);
      else if (score >= 40) setPlatformFeePercent(5);
      else setPlatformFeePercent(8);
    }
  }, [details]);

  const approvedAmountNum = Number(approvedAmountInput) || 0;
  const platformFeeVal = approvedAmountNum * (platformFeePercent / 100);
  const netDisbursement = Math.max(approvedAmountNum - platformFeeVal, 0);

  const handleApprove = async () => {
    if (!details) return;
    if (approvedAmountNum <= 0 || approvedAmountNum > details.requested_amount) {
      enqueueSnackbar("Approved amount must be greater than 0 and not exceed requested amount", { variant: "warning" });
      return;
    }

    try {
      setSubmittingDecision(true);
      await LenderApi.approveRequest(details.id, approvedAmountNum);
      enqueueSnackbar(`Request REQ-2026-${String(details.id).padStart(3, "0")} successfully approved`, { variant: "success" });
      navigate("/lender/review-requests");
    } catch (err) {
      console.error(err);
      enqueueSnackbar("Failed to approve financing request", { variant: "error" });
    } finally {
      setSubmittingDecision(false);
    }
  };

  const handleReject = async () => {
    if (!details) return;
    try {
      setSubmittingDecision(true);
      await LenderApi.rejectRequest(details.id);
      enqueueSnackbar(`Request REQ-2026-${String(details.id).padStart(3, "0")} rejected`, { variant: "info" });
      navigate("/lender/review-requests");
    } catch (err) {
      console.error(err);
      enqueueSnackbar("Failed to reject request", { variant: "error" });
    } finally {
      setSubmittingDecision(false);
    }
  };

  if (loading && !details) {
    return (
      <LenderLayout>
        <div className="flex h-64 items-center justify-center text-sm font-semibold text-slate-500">
          Loading underwriting profile...
        </div>
      </LenderLayout>
    );
  }

  if (!details) {
    return (
      <LenderLayout>
        <div className="flex h-64 items-center justify-center text-sm font-semibold text-slate-500">
          Request details not found.
        </div>
      </LenderLayout>
    );
  }

  return (
    <LenderLayout>
      <div className="space-y-6 text-[#071942] max-w-[1540px] mx-auto pb-12">
        {/* Breadcrumb Header */}
        <div className="flex flex-col gap-1.5">
          <button
            onClick={() => navigate("/lender/review-requests")}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-[#8f9bba] hover:text-[#4f63f6] transition"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Requests
          </button>
          
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-extrabold tracking-tight text-[#071942]">Review Financing Request</h1>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-100 bg-amber-50 px-2.5 py-0.5 text-xs font-bold text-amber-700">
                  {details.status}
                </span>
              </div>
              <p className="text-sm text-[#5f6d8a] mt-0.5">Carefully review the request details, risk assessment and supporting documents before making a decision.</p>
            </div>
            
            <div className="text-right">
              <p className="text-sm font-bold text-[#071942]">Request ID: {details.req_code}</p>
              <p className="text-[11px] text-slate-400 font-semibold mt-1">Submitted: {details.submitted_date}</p>
            </div>
          </div>
        </div>

        {/* Top Overview Cards Row */}
        <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
          <div className="rounded-2xl border border-[#e9eef8] bg-white p-4 shadow-sm flex gap-3 items-start">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 border border-blue-100 mt-0.5"><Coins className="h-5 w-5" /></div>
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-wide text-[#8f9bba]">Requested Amount</p>
              <p className="text-base font-extrabold text-[#071942] mt-1">{formatZAR(details.requested_amount)}</p>
              <p className="text-[9px] text-[#8f9bba] mt-0.5">{Math.round((details.requested_amount / details.invoice_amount) * 100)}% of invoice</p>
            </div>
          </div>

          <div className="rounded-2xl border border-[#e9eef8] bg-white p-4 shadow-sm flex gap-3 items-start">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100 mt-0.5"><FileText className="h-5 w-5" /></div>
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-wide text-[#8f9bba]">Invoice Amount</p>
              <p className="text-base font-extrabold text-[#071942] mt-1">{formatZAR(details.invoice_amount)}</p>
              <button onClick={() => enqueueSnackbar("Viewing invoice detail", { variant: "info" })} className="text-[9px] text-[#4f63f6] font-bold mt-0.5 hover:underline">View Invoice</button>
            </div>
          </div>

          <div className="rounded-2xl border border-[#e9eef8] bg-white p-4 shadow-sm flex gap-3 items-start">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-purple-50 text-purple-600 border border-purple-100 mt-0.5"><Calendar className="h-5 w-5" /></div>
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-wide text-[#8f9bba]">Due Date</p>
              <p className="text-base font-extrabold text-[#071942] mt-1">{details.due_date}</p>
              <p className="text-[9px] text-[#8f9bba] mt-0.5">{details.days_remaining} days remaining</p>
            </div>
          </div>

          <div className="rounded-2xl border border-[#e9eef8] bg-white p-4 shadow-sm flex gap-3 items-start">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-orange-600 border border-orange-100 mt-0.5"><Clock className="h-5 w-5" /></div>
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-wide text-[#8f9bba]">Funding Term</p>
              <p className="text-base font-extrabold text-[#071942] mt-1">{details.term}</p>
              <p className="text-[9px] text-[#8f9bba] mt-0.5">Short term</p>
            </div>
          </div>

          <div className="rounded-2xl border border-[#e9eef8] bg-white p-4 shadow-sm flex gap-3 items-start">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600 border border-amber-100 mt-0.5"><Briefcase className="h-5 w-5" /></div>
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-wide text-[#8f9bba]">Purpose</p>
              <p className="text-base font-extrabold text-[#071942] mt-1 truncate max-w-[100px]">{details.purpose}</p>
              <p className="text-[9px] text-[#8f9bba] mt-0.5">Business operations</p>
            </div>
          </div>
        </div>

        {/* Main Columns Grid */}
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          {/* Left Column (Underwriting core details) */}
          <div className="xl:col-span-2 space-y-6">
            {/* 1. SME Profile */}
            <div className="rounded-2xl border border-[#e9eef8] bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between border-b border-[#e9eef8] pb-4 mb-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#f0f4fa] text-[#5f6d8a] text-xs font-bold">1</div>
                  <h3 className="text-base font-bold text-[#071942]">SME Profile</h3>
                </div>
                <span className="rounded bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700">Verified SME</span>
              </div>

              <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                <div className="md:col-span-2">
                  <h4 className="text-lg font-extrabold text-[#071942]">{details.sme_name}</h4>
                  <p className="text-xs text-slate-400 font-semibold mt-0.5">Registration: 2021/123456/07</p>
                </div>
                <div></div>

                <div>
                  <p className="text-[10px] font-extrabold text-[#8f9bba] uppercase tracking-wide">Industry</p>
                  <p className="text-sm font-bold text-[#071942] mt-1">{details.industry}</p>
                </div>
                <div>
                  <p className="text-[10px] font-extrabold text-[#8f9bba] uppercase tracking-wide">Years in Business</p>
                  <p className="text-sm font-bold text-[#071942] mt-1">{details.years_active} Years</p>
                </div>
                <div>
                  <p className="text-[10px] font-extrabold text-[#8f9bba] uppercase tracking-wide">Location</p>
                  <p className="text-sm font-bold text-[#071942] mt-1">{details.location}</p>
                </div>

                <div>
                  <p className="text-[10px] font-extrabold text-[#8f9bba] uppercase tracking-wide">Employees</p>
                  <p className="text-sm font-bold text-[#071942] mt-1">{details.employees}</p>
                </div>
                <div>
                  <p className="text-[10px] font-extrabold text-[#8f9bba] uppercase tracking-wide">Total Invoices</p>
                  <p className="text-sm font-bold text-[#071942] mt-1">{details.total_invoices}</p>
                </div>
                <div>
                  <p className="text-[10px] font-extrabold text-[#8f9bba] uppercase tracking-wide">Total Financed</p>
                  <p className="text-sm font-bold text-[#071942] mt-1">{formatZAR(details.total_financed)}</p>
                </div>

                <div>
                  <p className="text-[10px] font-extrabold text-[#8f9bba] uppercase tracking-wide">Repayment Success Rate</p>
                  <p className="text-sm font-bold text-[#071942] mt-1">{details.repayment_success_rate}%</p>
                </div>
                <div>
                  <p className="text-[10px] font-extrabold text-[#8f9bba] uppercase tracking-wide">Previous Loans</p>
                  <p className="text-sm font-bold text-[#071942] mt-1">{details.previous_loans}</p>
                </div>
              </div>
            </div>

            {/* 3. Invoice Details */}
            <div className="rounded-2xl border border-[#e9eef8] bg-white p-6 shadow-sm">
              <div className="flex items-center gap-3 border-b border-[#e9eef8] pb-4 mb-4">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#f0f4fa] text-[#5f6d8a] text-xs font-bold">3</div>
                <h3 className="text-base font-bold text-[#071942]">Invoice Details</h3>
              </div>

              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <div className="space-y-3.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-[#5f6d8a]">Invoice Number</span>
                    <span className="font-bold text-[#071942]">{details.invoice_number}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#5f6d8a]">Customer</span>
                    <span className="font-bold text-[#071942]">{details.customer_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#5f6d8a]">Invoice Date</span>
                    <span className="font-bold text-[#071942]">20 Jun 2026</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#5f6d8a]">Due Date</span>
                    <span className="font-bold text-[#071942]">{details.due_date} ({details.days_remaining} days)</span>
                  </div>
                </div>

                <div className="space-y-3.5 text-xs border-t md:border-t-0 md:border-l border-[#f2f5fa] pt-4 md:pt-0 md:pl-6">
                  <div className="flex justify-between">
                    <span className="text-[#5f6d8a]">Invoice Amount</span>
                    <span className="font-bold text-[#071942]">{formatZAR(details.invoice_amount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#5f6d8a]">Amount Already Paid</span>
                    <span className="font-bold text-[#071942]">{formatZAR(details.amount_paid)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#5f6d8a]">Outstanding Amount</span>
                    <span className="font-bold text-[#071942]">{formatZAR(details.outstanding_amount)}</span>
                  </div>
                  <div className="flex justify-between border-t border-dashed border-[#e9eef8] pt-2">
                    <span className="text-[#5f6d8a] font-bold">Requested Finance</span>
                    <span className="font-extrabold text-[#071942]">{formatZAR(details.requested_amount)} ({Math.round((details.requested_amount / details.invoice_amount) * 100)}%)</span>
                  </div>
                </div>
              </div>

              <div className="mt-5 pt-4 border-t border-[#f2f5fa]">
                <button
                  onClick={() => enqueueSnackbar("Viewing invoice PDF", { variant: "info" })}
                  className="rounded-xl border border-[#dfe5f0] bg-white px-5 py-2.5 text-xs font-bold text-[#071942] hover:bg-slate-50 transition active:scale-95 flex items-center gap-1.5"
                >
                  <FileText className="h-4 w-4" />
                  View Invoice PDF
                </button>
              </div>
            </div>

            {/* 5. Risk Factors */}
            <div className="rounded-2xl border border-[#e9eef8] bg-white p-6 shadow-sm">
              <div className="flex items-center gap-3 border-b border-[#e9eef8] pb-4 mb-4">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#f0f4fa] text-[#5f6d8a] text-xs font-bold">5</div>
                <h3 className="text-base font-bold text-[#071942]">Risk Factors</h3>
              </div>

              <div className="grid grid-cols-1 gap-6 md:grid-cols-2 text-xs">
                <div className="space-y-2.5">
                  <h4 className="font-extrabold text-[#008b5a] uppercase tracking-wider text-[10px]">Positive Factors</h4>
                  <ul className="space-y-2">
                    <li className="flex items-start gap-2 text-[#5f6d8a] leading-normal">
                      <Check className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                      <span>Strong payment history with this lender</span>
                    </li>
                    <li className="flex items-start gap-2 text-[#5f6d8a] leading-normal">
                      <Check className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                      <span>Low outstanding debt relative to revenue</span>
                    </li>
                    <li className="flex items-start gap-2 text-[#5f6d8a] leading-normal">
                      <Check className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                      <span>Stable business with consistent cash flow</span>
                    </li>
                  </ul>
                </div>

                <div className="space-y-2.5 md:border-l border-[#f2f5fa] md:pl-6">
                  <h4 className="font-extrabold text-amber-600 uppercase tracking-wider text-[10px]">Risk Factors</h4>
                  <ul className="space-y-2">
                    <li className="flex items-start gap-2 text-[#5f6d8a] leading-normal">
                      <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                      <span>Customer (debtor) has delayed payments in past</span>
                    </li>
                    <li className="flex items-start gap-2 text-[#5f6d8a] leading-normal">
                      <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                      <span>Business is relatively young ({details.years_active} years)</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            {/* 7. Request History */}
            <div className="rounded-2xl border border-[#e9eef8] bg-white p-6 shadow-sm">
              <div className="flex items-center gap-3 border-b border-[#e9eef8] pb-4 mb-5">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#f0f4fa] text-[#5f6d8a] text-xs font-bold">7</div>
                <h3 className="text-base font-bold text-[#071942]">Request History</h3>
              </div>

              <div className="max-w-3xl mx-auto flex items-center justify-between relative px-2">
                <div className="absolute top-[12px] left-8 right-8 h-0.5 bg-slate-100 -z-10">
                  <div className="h-full bg-emerald-500 w-[66.6%]" />
                </div>

                <div className="flex flex-col items-center text-center">
                  <div className="flex h-6.5 w-6.5 items-center justify-center rounded-full bg-emerald-500 text-white shadow-sm ring-4 ring-emerald-100">
                    <Check className="h-3.5 w-3.5 stroke-[3px]" />
                  </div>
                  <span className="mt-2 text-[11px] font-bold text-[#071942]">Request Submitted</span>
                  <span className="text-[9px] text-[#8f9bba] mt-0.5">20 Jun 2026</span>
                </div>

                <div className="flex flex-col items-center text-center">
                  <div className="flex h-6.5 w-6.5 items-center justify-center rounded-full bg-emerald-500 text-white shadow-sm ring-4 ring-emerald-100">
                    <Check className="h-3.5 w-3.5 stroke-[3px]" />
                  </div>
                  <span className="mt-2 text-[11px] font-bold text-[#071942]">Under Review</span>
                  <span className="text-[9px] text-[#8f9bba] mt-0.5">20 Jun 2026</span>
                </div>

                <div className="flex flex-col items-center text-center">
                  <div className="flex h-6.5 w-6.5 items-center justify-center rounded-full bg-white border-2 border-emerald-500 text-emerald-600 shadow-sm ring-4 ring-emerald-50">
                    <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
                  </div>
                  <span className="mt-2 text-[11px] font-bold text-[#071942]">Decision Pending</span>
                  <span className="text-[9px] text-[#8f9bba] mt-0.5">Active</span>
                </div>

                <div className="flex flex-col items-center text-center">
                  <div className="flex h-6.5 w-6.5 items-center justify-center rounded-full bg-white border-2 border-slate-200 text-[#8f9bba]">
                    <span className="text-[9px] font-bold">4</span>
                  </div>
                  <span className="mt-2 text-[11px] font-bold text-slate-400">Funds Disbursed</span>
                  <span className="text-[9px] text-slate-300 mt-0.5">N/A</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column (Decision actions & credit assessment) */}
          <div className="space-y-6">
            {/* 2. Credit & Risk Assessment */}
            <div className="rounded-2xl border border-[#e9eef8] bg-white p-6 shadow-sm">
              <div className="flex items-center gap-3 border-b border-[#e9eef8] pb-4 mb-4">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#f0f4fa] text-[#5f6d8a] text-xs font-bold">2</div>
                <h3 className="text-base font-bold text-[#071942]">Credit & Risk Assessment</h3>
              </div>

              <div className="flex flex-col items-center justify-center py-2 text-center">
                <div className="relative flex items-center justify-center h-24 w-24 shrink-0">
                  <svg className="h-full w-full transform -rotate-90">
                    <circle cx="48" cy="48" r="38" stroke="#edf2fa" strokeWidth="7.5" fill="transparent" />
                    <circle
                      cx="48"
                      cy="48"
                      r="38"
                      stroke={details.risk_level === "High" ? "#ef4444" : details.risk_level === "Low" ? "#009a65" : "#f59e0b"}
                      strokeWidth="7.5"
                      fill="transparent"
                      strokeDasharray={2 * Math.PI * 38}
                      strokeDashoffset={2 * Math.PI * 38 * (1 - details.credit_score / 100)}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute flex flex-col items-center">
                    <span className="text-xl font-black text-[#071942] leading-none">{details.credit_score}</span>
                    <span className={`text-[9px] font-bold mt-1 ${
                      details.risk_level === "High" ? "text-red-500" : details.risk_level === "Low" ? "text-emerald-600" : "text-amber-500"
                    }`}>
                      {details.credit_score >= 70 ? "Good" : "Fair"}
                    </span>
                  </div>
                </div>

                <div className="w-full mt-5 space-y-3 text-xs text-[#5f6d8a]">
                  <div className="flex justify-between">
                    <span>Risk Level</span>
                    <span className={`font-extrabold ${
                      details.risk_level === "High" ? "text-red-600" : details.risk_level === "Low" ? "text-emerald-700" : "text-amber-600"
                    }`}>{details.risk_level} Risk</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Approval Probability</span>
                    <span className="font-bold text-[#071942]">{details.approval_probability}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Recommended Amount</span>
                    <span className="font-extrabold text-[#009a65]">{formatZAR(details.recommended_amount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Model Confidence</span>
                    <span className="font-bold text-[#071942]">{details.model_confidence}%</span>
                  </div>
                </div>

                <div className="w-full mt-4 bg-emerald-50/50 border border-emerald-100/30 p-3 rounded-xl text-[10px] text-emerald-800 leading-normal text-left">
                  The SME shows strong repayment behavior with low default risk.
                  <button className="block text-[9px] font-extrabold text-[#4f63f6] mt-1.5 hover:underline">
                    View full risk analysis →
                  </button>
                </div>
              </div>
            </div>

            {/* 4. Supporting Documents */}
            <div className="rounded-2xl border border-[#e9eef8] bg-white p-6 shadow-sm">
              <div className="flex items-center gap-3 border-b border-[#e9eef8] pb-4 mb-4">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#f0f4fa] text-[#5f6d8a] text-xs font-bold">4</div>
                <h3 className="text-base font-bold text-[#071942]">Supporting Documents</h3>
              </div>

              <div className="space-y-2.5 text-xs">
                {[
                  { name: "CIPC Registration Certificate", status: "Verified" },
                  { name: "Tax Clearance Certificate", status: "Verified" },
                  { name: "Bank Statement (May 2026)", status: "Verified" },
                  { name: "ID Copy (Director)", status: "Verified" },
                  { name: "Financial Statements (2025)", status: "Pending Review" }
                ].map((doc) => (
                  <div key={doc.name} className="flex items-center justify-between border-b border-[#f2f5fa] pb-2 last:border-0">
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-[#071942] truncate" title={doc.name}>{doc.name}</p>
                    </div>
                    <div className="flex items-center gap-2.5 shrink-0 ml-3">
                      <span className={`rounded-full px-2 py-0.5 text-[8px] font-extrabold uppercase border ${
                        doc.status === "Verified" ? "bg-emerald-50 text-emerald-700 border-emerald-100" : "bg-amber-50 text-amber-700 border-amber-100"
                      }`}>
                        {doc.status.replace(" Review", "")}
                      </span>
                      <button onClick={() => enqueueSnackbar(`Viewing document details: ${doc.name}`, { variant: "info" })} className="text-slate-400 hover:text-[#071942]">
                        <Eye className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-4 text-center border-t border-[#f2f5fa] pt-3">
                <button onClick={() => enqueueSnackbar("All documents display expanded", { variant: "info" })} className="text-[10px] font-bold text-[#4f63f6] hover:underline">
                  View all documents (7) →
                </button>
              </div>
            </div>

            {/* 6. Decision & Action */}
            <div className="rounded-2xl border border-[#e9eef8] bg-white p-6 shadow-sm">
              <div className="flex items-center gap-3 border-b border-[#e9eef8] pb-4 mb-4">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#f0f4fa] text-[#5f6d8a] text-xs font-bold">6</div>
                <h3 className="text-base font-bold text-[#071942]">Decision & Action</h3>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between text-xs">
                  <span className="text-[#5f6d8a] font-medium">Requested Amount</span>
                  <span className="font-extrabold text-[#071942]">{formatZAR(details.requested_amount)}</span>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-[#5f6d8a] mb-1.5 uppercase tracking-wide">Approved Amount *</label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-extrabold text-[#5f6d8a]">R</span>
                    <input
                      type="number"
                      value={approvedAmountInput}
                      onChange={(e) => setApprovedAmountInput(e.target.value)}
                      className="w-full rounded-xl border border-[#dfe5f0] bg-white pl-8 pr-4 py-2 text-xs text-[#071942] font-extrabold transition focus:border-[#4f63f6] focus:outline-none"
                    />
                  </div>
                  <p className="text-[9px] text-[#8f9bba] mt-1 font-semibold">Enter approved amount.</p>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-[#5f6d8a] mb-1.5 uppercase tracking-wide">Platform Fee / Discount</label>
                  <select
                    value={platformFeePercent}
                    onChange={(e) => setPlatformFeePercent(Number(e.target.value))}
                    className="w-full rounded-xl border border-[#dfe5f0] bg-white px-3 py-2 text-xs font-semibold text-[#071942] focus:border-[#4f63f6] focus:outline-none"
                  >
                    <option value={1.5}>1.5% - Very Low Risk</option>
                    <option value={2.5}>2.5% - Low Risk</option>
                    <option value={5}>5.0% - Medium Risk</option>
                    <option value={8}>8.0% - High Risk</option>
                  </select>
                </div>

                <div className="bg-[#f8faff] rounded-xl border border-[#d8e2f3] p-3 text-xs space-y-2.5 font-semibold text-[#071942]">
                  <div className="flex justify-between">
                    <span className="text-[#5f6d8a]">You will fund (before fee)</span>
                    <span>{formatZAR(approvedAmountNum)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#5f6d8a]">Platform Fee ({platformFeePercent}%)</span>
                    <span className="text-rose-600">-{formatZAR(platformFeeVal)}</span>
                  </div>
                  <div className="flex justify-between border-t border-[#d8e2f3] pt-2 font-black text-[#009a65]">
                    <span>Net Disbursement</span>
                    <span>{formatZAR(netDisbursement)}</span>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-[#5f6d8a] mb-1.5 uppercase tracking-wide">Notes (Optional)</label>
                  <textarea
                    rows={2}
                    placeholder="Decision notes..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full rounded-xl border border-[#dfe5f0] bg-white px-3 py-2 text-xs text-[#071942] focus:border-[#4f63f6] focus:outline-none animate-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3 pt-1">
                  <button
                    type="button"
                    onClick={handleReject}
                    disabled={submittingDecision}
                    className="inline-flex items-center justify-center rounded-xl border border-rose-500 bg-white hover:bg-rose-50 py-2.5 text-xs font-bold text-rose-600 transition active:scale-95 disabled:opacity-40"
                  >
                    Reject Request
                  </button>
                  <button
                    type="button"
                    onClick={handleApprove}
                    disabled={submittingDecision}
                    className="inline-flex items-center justify-center rounded-xl bg-[#009a65] hover:bg-[#008154] py-2.5 text-xs font-bold text-white transition active:scale-95 disabled:opacity-40 shadow-sm"
                  >
                    {submittingDecision ? "Processing..." : "Approve & Fund"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </LenderLayout>
  );
}
