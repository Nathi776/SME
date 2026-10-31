import { useCallback, useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AlertTriangle, ArrowLeft, Check, Clock, Coins, FileText } from "lucide-react";
import { useSnackbar } from "notistack";
import LenderLayout from "../components/lender/LenderLayout";
import InfoThread from "../components/finance/InfoThread";
import type { InfoMessage } from "../api/financeApi";
import { LenderApi, type FinanceRequest, type SmeIntelligence } from "../api/lenderApi";
import { formatZAR } from "../utils/format";
import { invoiceApi } from "../api/invoiceApi";

interface InvoiceRow {
  pdf_url?: string | null;
  id: number;
  invoice_number?: string | null;
  client_name?: string | null;
  customer_company?: string | null;
  amount: number | string;
  status?: string | null;
  issue_date?: string | null;
  due_date?: string | null;
}

const DOC_LABELS: Record<string, string> = {
  cipc: "CIPC registration", bank_statement: "Bank statement", tax_clearance: "Tax clearance",
  registration_docs: "Registration documents", letter_of_intent: "Letter of intent",
  supplier_quote: "Supplier quote", lease_agreement: "Lease agreement",
  financial_statements: "Financial statements", vat_certificate: "VAT certificate",
  director_id: "Director ID", bee_certificate: "B-BBEE certificate", income_statement: "Income statement",
  shareholder_docs: "Shareholder documents", sars_compliance: "SARS compliance",
  proof_of_address: "Proof of address", proof_of_bank_account: "Proof of bank account",
};
const COMPLIANCE = ["cipc", "bank_statement", "tax_clearance", "registration_docs"];
const label = (k: string) => DOC_LABELS[k] || k.replace(/_/g, " ");
const date = (s?: string | null) => (s ? new Date(s).toLocaleDateString("en-ZA", { day: "2-digit", month: "short", year: "numeric" }) : "Not provided");

const CARD = "rounded-2xl border border-[#e9eef8] bg-white p-6 shadow-sm";
const H3 = "text-base font-bold text-[#071942] border-b border-[#e9eef8] pb-4 mb-4";
const KEY = "text-[10px] font-extrabold text-[#8f9bba] uppercase tracking-wide";

const STATUS_STYLE: Record<string, string> = {
  approved: "bg-emerald-50 text-emerald-700 border-emerald-100",
  pending: "bg-amber-50 text-amber-700 border-amber-100",
  rejected: "bg-rose-50 text-rose-700 border-rose-100",
};

export default function LenderRequestDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();

  const [loading, setLoading] = useState(true);
  const [request, setRequest] = useState<FinanceRequest | null>(null);
  const [intel, setIntel] = useState<SmeIntelligence | null>(null);
  const [intelFailed, setIntelFailed] = useState(false);
  const [invoice, setInvoice] = useState<InvoiceRow | null>(null);
  const [thread, setThread] = useState<InfoMessage[]>([]);

  const [approvedAmount, setApprovedAmount] = useState("");
  const [infoDraft, setInfoDraft] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [pending, awaiting] = await Promise.all([LenderApi.getPendingRequests(), LenderApi.getAwaitingInfo()]);
      const found = [...(pending.data || []), ...(awaiting.data || [])].find((r) => r.id === Number(id)) || null;
      setRequest(found);
      if (!found) return;
      setApprovedAmount((cur) => cur || String(Number(found.amount_requested)));

      LenderApi.getMessages(found.id).then((r) => setThread(r.data)).catch(() => setThread([]));
      setIntelFailed(false);
      LenderApi.getSmeIntelligence(found.sme_id).then((r) => setIntel(r.data)).catch(() => { setIntel(null); setIntelFailed(true); });
      if (found.invoice_id) {
        LenderApi.getSMEInvoices(found.sme_id)
          .then((r) => setInvoice((r.data as InvoiceRow[]).find((i) => i.id === found.invoice_id) || null))
          .catch(() => setInvoice(null));
      } else {
        setInvoice(null);
      }
    } catch {
      enqueueSnackbar("Error fetching details from server", { variant: "error" });
    } finally {
      setLoading(false);
    }
  }, [id, enqueueSnackbar]);

  useEffect(() => { load(); }, [load]);

  const awaitingReply = request?.status === "info_requested";
  const requested = Number(request?.amount_requested || 0);
  const approvedNum = Number(approvedAmount) || 0;

  const run = async (fn: () => Promise<unknown>, ok: string, fail: string, leave = false) => {
    try {
      setBusy(true);
      await fn();
      enqueueSnackbar(ok, { variant: "success" });
      if (leave) navigate("/lender/review-requests"); else await load();
    } catch (err: any) {
      enqueueSnackbar(err?.response?.data?.detail || fail, { variant: "error" });
    } finally {
      setBusy(false);
    }
  };

  const approve = () => {
    if (!request) return;
    if (approvedNum <= 0 || approvedNum > requested) {
      enqueueSnackbar("Approved amount must be above 0 and not exceed the requested amount", { variant: "warning" });
      return;
    }
    run(() => LenderApi.approveRequest(request.id, approvedNum), "Request approved", "Failed to approve request", true);
  };
  const reject = () => {
    if (!request) return;
    const reason = window.prompt("Reject this request? This cannot be undone.\nGive the business a short reason (optional):");
    if (reason === null) return;
    run(() => LenderApi.rejectRequest(request.id, reason), "Request rejected", "Failed to reject request", true);
  };
  const askInfo = () => {
    if (!request) return;
    if (infoDraft.trim().length < 5) {
      enqueueSnackbar("Write the question you need answered (at least a few words)", { variant: "warning" });
      return;
    }
    run(async () => { await LenderApi.requestInfo(request.id, infoDraft.trim()); setInfoDraft(""); },
      "Question sent. The request is paused until the business replies.", "Could not send your question");
  };

  if (loading && !request) {
    return <LenderLayout><div className="flex h-64 items-center justify-center text-sm font-semibold text-slate-500">Loading request...</div></LenderLayout>;
  }
  if (!request) {
    return (
      <LenderLayout>
        <div className="flex h-64 flex-col items-center justify-center gap-3 text-sm font-semibold text-slate-500">
          This request was not found, or is no longer open for your review.
          <button onClick={() => navigate("/lender/review-requests")} className="text-[#4f63f6] hover:underline">Back to requests</button>
        </div>
      </LenderLayout>
    );
  }

  const docs = intel?.evidence.documents || [];
  const docStatus = (t: string) => docs.find((d) => d.doc_type === t);
  const missingCompliance = COMPLIANCE.filter((t) => docStatus(t)?.status !== "approved");
  const positives: string[] = [];
  const concerns: string[] = [];
  if (intel) {
    if (intel.sme.cipc_verified) positives.push("Business registration verified with CIPC");
    COMPLIANCE.filter((t) => docStatus(t)?.status === "approved").forEach((t) => positives.push(`${label(t)} approved`));
    if (intel.sme.years_active >= 5) positives.push(`Operating for ${intel.sme.years_active} years`);
    const repaid = intel.outcomes.filter((o) => o.outcome_status === "repaid").length;
    if (repaid > 0) positives.push(`${repaid} earlier financing deal${repaid === 1 ? "" : "s"} on this platform repaid`);
    missingCompliance.forEach((t) => concerns.push(`${label(t)} ${docStatus(t) ? `is ${docStatus(t)!.status}` : "has not been submitted"}`));
    if (intel.sme.years_active < 2) concerns.push(`Young business (${intel.sme.years_active} year${intel.sme.years_active === 1 ? "" : "s"})`);
    if (intel.evidence.evidence_confidence < 50) concerns.push(`Low evidence confidence (${Math.round(intel.evidence.evidence_confidence)}/100): the score rests on little verified evidence`);
    intel.outcomes.filter((o) => o.outcome_status === "defaulted").forEach(() => concerns.push("An earlier financing deal on this platform defaulted"));
  }

  const reqCode = `REQ-${String(request.id).padStart(3, "0")}`;

  return (
    <LenderLayout>
      <div className="space-y-6 text-[#071942] max-w-[1600px] px-6 mx-auto pb-12">
        <div className="flex flex-col gap-1.5">
          <button onClick={() => navigate("/lender/review-requests")} className="inline-flex items-center gap-1.5 text-xs font-bold text-[#8f9bba] hover:text-[#4f63f6] transition">
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Requests
          </button>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-extrabold tracking-tight">Review Financing Request</h1>
              <span className="rounded-full border border-amber-100 bg-amber-50 px-2.5 py-0.5 text-xs font-bold text-amber-700">
                {awaitingReply ? "Awaiting business reply" : "Pending review"}
              </span>
            </div>
            <div className="text-right">
              <p className="text-sm font-bold">Request ID: {reqCode}</p>
              <p className="text-[11px] text-slate-400 font-semibold mt-1">Submitted: {date(request.created_at)}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {[
            { icon: <Coins className="h-5 w-5" />, k: "Requested", v: formatZAR(requested) },
            { icon: <FileText className="h-5 w-5" />, k: request.request_type === "pre_invoice" ? "Type" : "Invoice amount",
              v: request.request_type === "pre_invoice" ? "Pre-invoice (no invoice)" : invoice ? formatZAR(Number(invoice.amount)) : "—" },
            { icon: <Clock className="h-5 w-5" />, k: "Preferred payout", v: date(request.preferred_payout_date) },
            { icon: <FileText className="h-5 w-5" />, k: "Purpose", v: request.purpose_of_funding || "Not provided" },
          ].map((c) => (
            <div key={c.k} className="rounded-2xl border border-[#e9eef8] bg-white p-4 shadow-sm flex gap-3 items-start">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 border border-blue-100">{c.icon}</div>
              <div><p className={KEY}>{c.k}</p><p className="text-sm font-extrabold mt-1">{c.v}</p></div>
            </div>
          ))}
        </div>

        {request.invoice_id && (
          <div>
            {invoice?.pdf_url ? (
              <button
                type="button"
                onClick={() => invoiceApi.openPdf(request.invoice_id as number).catch(() =>
                  enqueueSnackbar("Could not open the invoice PDF", { variant: "error" }))}
                className="inline-flex items-center gap-2 rounded-xl border border-[#dfe5f0] bg-white px-4 py-2 text-xs font-bold text-[#071942] hover:bg-slate-50"
              >
                <FileText className="h-4 w-4" /> View invoice PDF
              </button>
            ) : (
              <p className="text-xs font-semibold text-[#5f6d8a]">The business has not attached an invoice PDF.</p>
            )}
          </div>
        )}

        {intelFailed && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm font-semibold text-rose-700">
            The business profile and assessment could not be loaded. Do not decide without them; refresh and try again.
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          <div className="xl:col-span-2 space-y-6">
            <div className={CARD}>
              <h3 className={H3}>Business Profile</h3>
              {intel ? (
                <div className="grid grid-cols-2 gap-6 md:grid-cols-3">
                  <div className="col-span-2 md:col-span-3">
                    <h4 className="text-lg font-extrabold">{intel.sme.name}</h4>
                    <span className={`mt-1 inline-block rounded px-2 py-0.5 text-[10px] font-bold ${intel.sme.cipc_verified ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
                      {intel.sme.cipc_verified ? "CIPC verified" : "CIPC not verified"}
                    </span>
                  </div>
                  <div><p className={KEY}>Industry</p><p className="text-sm font-bold mt-1">{intel.sme.industry}</p></div>
                  <div><p className={KEY}>Years in business</p><p className="text-sm font-bold mt-1">{intel.sme.years_active}</p></div>
                  <div><p className={KEY}>Location</p><p className="text-sm font-bold mt-1">{[intel.sme.business_city, intel.sme.province].filter(Boolean).join(", ") || "Not provided"}</p></div>
                  <div><p className={KEY}>Annual revenue (self-reported)</p><p className="text-sm font-bold mt-1">{formatZAR(intel.sme.revenue)}</p></div>
                  <div><p className={KEY}>Earlier deals here</p><p className="text-sm font-bold mt-1">{intel.outcomes.length}</p></div>
                </div>
              ) : <p className="text-sm text-slate-400">{intelFailed ? "Unavailable" : "Loading..."}</p>}
            </div>

            {request.invoice_id && (
              <div className={CARD}>
                <h3 className={H3}>Invoice</h3>
                {invoice ? (
                  <div className="grid grid-cols-2 gap-5 text-xs md:grid-cols-4">
                    <div><p className={KEY}>Number</p><p className="font-bold mt-1">{invoice.invoice_number || `#${invoice.id}`}</p></div>
                    <div><p className={KEY}>Customer</p><p className="font-bold mt-1">{invoice.customer_company || invoice.client_name || "Not provided"}</p></div>
                    <div><p className={KEY}>Issued</p><p className="font-bold mt-1">{date(invoice.issue_date)}</p></div>
                    <div><p className={KEY}>Due</p><p className="font-bold mt-1">{date(invoice.due_date)}</p></div>
                    <div><p className={KEY}>Amount</p><p className="font-bold mt-1">{formatZAR(Number(invoice.amount))}</p></div>
                    <div><p className={KEY}>Status</p><p className="font-bold mt-1 capitalize">{invoice.status || "unknown"}</p></div>
                  </div>
                ) : <p className="text-sm text-slate-400">Invoice details unavailable.</p>}
              </div>
            )}

            {request.additional_notes && (
              <div className={CARD}><h3 className={H3}>Notes from the business</h3><p className="text-sm whitespace-pre-wrap">{request.additional_notes}</p></div>
            )}

            <div className={CARD}>
              <h3 className={H3}>What the evidence shows</h3>
              {intel ? (
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2 text-xs">
                  <div className="space-y-2">
                    <h4 className="font-extrabold text-[#008b5a] uppercase tracking-wider text-[10px]">In their favour</h4>
                    {positives.length ? positives.map((p) => (
                      <p key={p} className="flex items-start gap-2 text-[#5f6d8a]"><Check className="h-4 w-4 text-emerald-500 shrink-0" />{p}</p>
                    )) : <p className="text-slate-400">Nothing verified yet.</p>}
                  </div>
                  <div className="space-y-2 md:border-l border-[#f2f5fa] md:pl-6">
                    <h4 className="font-extrabold text-amber-600 uppercase tracking-wider text-[10px]">Concerns and gaps</h4>
                    {concerns.length ? concerns.map((c) => (
                      <p key={c} className="flex items-start gap-2 text-[#5f6d8a]"><AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />{c}</p>
                    )) : <p className="text-slate-400">None identified from the available evidence.</p>}
                  </div>
                </div>
              ) : <p className="text-sm text-slate-400">Unavailable</p>}
            </div>

            {intel && intel.outcomes.length > 0 && (
              <div className={CARD}>
                <h3 className={H3}>Earlier financing on this platform</h3>
                <ul className="space-y-2 text-xs">
                  {intel.outcomes.map((o) => (
                    <li key={o.id} className="flex justify-between">
                      <span>{date(o.created_at)} · {formatZAR(o.amount)}</span>
                      <span className="font-bold capitalize">{o.outcome_status}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <div className="space-y-6">
            <div className={CARD}>
              <h3 className={H3}>Assessment</h3>
              {intel ? (
                <div className="space-y-4 text-xs text-[#5f6d8a]">
                  <div className="flex justify-between items-baseline"><span>Funding readiness</span><span className="text-xl font-black text-[#071942]">{Math.round(intel.evidence.funding_readiness)}<span className="text-xs font-bold text-slate-400">/100</span></span></div>
                  <div className="flex justify-between"><span>Engine decision</span><span className="font-extrabold text-[#071942]">{intel.score.decision}</span></div>
                  <div className="flex justify-between"><span>Business viability</span><span className="font-bold text-[#071942]">{intel.evidence.viability_score == null ? "—" : `${Math.round(intel.evidence.viability_score)}/100`}</span></div>
                  <div className="flex justify-between"><span>Evidence confidence</span><span className="font-bold text-[#071942]">{Math.round(intel.evidence.evidence_confidence)}/100</span></div>
                  <p className="rounded-xl bg-[#f8faff] border border-[#d8e2f3] p-3 text-[10px] leading-normal">
                    Funding readiness is not a default probability. It is not validated against repayment outcomes yet, so use it as one input to your own judgement.
                  </p>
                  <details>
                    <summary className="cursor-pointer text-[10px] font-extrabold text-[#4f63f6]">Factor breakdown</summary>
                    <ul className="mt-2 space-y-1">
                      {Object.entries(intel.score.breakdown).filter(([, f]) => f.applicable !== false).map(([name, f]) => (
                        <li key={name} className="flex justify-between gap-2"><span>{name}</span><span className="font-bold text-[#071942]">{f.contribution ?? 0}/{f.max ?? "—"}</span></li>
                      ))}
                    </ul>
                  </details>
                </div>
              ) : <p className="text-sm text-slate-400">{intelFailed ? "Unavailable" : "Loading..."}</p>}
            </div>

            <div className={CARD}>
              <h3 className={H3}>Supporting Documents</h3>
              {intel ? (docs.length ? (
                <ul className="space-y-2.5 text-xs">
                  {docs.map((d) => (
                    <li key={d.doc_type} className="flex items-center justify-between gap-2">
                      <span className="font-semibold">{label(d.doc_type)}{d.newer_pending && <span className="ml-1 text-[9px] text-amber-600">(newer upload pending)</span>}</span>
                      <span className={`rounded-full border px-2 py-0.5 text-[9px] font-extrabold uppercase ${STATUS_STYLE[d.status] || STATUS_STYLE.pending}`}>{d.status}</span>
                    </li>
                  ))}
                </ul>
              ) : <p className="text-xs text-slate-400">No documents submitted.</p>) : <p className="text-sm text-slate-400">Unavailable</p>}
              <p className="mt-3 text-[10px] text-slate-400">Only documents reviewed and approved by the platform count as verified.</p>
            </div>

            <div className={CARD}>
              <h3 className={H3}>Decision</h3>
              <div className="space-y-4 text-xs">
                {thread.length > 0 && (<div><p className={`${KEY} mb-1.5`}>Conversation</p><InfoThread messages={thread} /></div>)}

                {awaitingReply ? (
                  <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 font-semibold text-amber-800">
                    Waiting for the business to reply. You can approve or reject once they do.
                  </p>
                ) : (
                  <>
                    <div>
                      <label className={`${KEY} block mb-1.5`}>Approved amount (max {formatZAR(requested)})</label>
                      <div className="relative">
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-extrabold text-[#5f6d8a]">R</span>
                        <input type="number" value={approvedAmount} onChange={(e) => setApprovedAmount(e.target.value)}
                          className="w-full rounded-xl border border-[#dfe5f0] pl-8 pr-4 py-2 text-xs font-extrabold focus:border-[#4f63f6] focus:outline-none" />
                      </div>
                      <p className="mt-1 text-[10px] text-slate-400">The platform fee and net amount are calculated by the platform when you approve.</p>
                    </div>
                    <div>
                      <label className={`${KEY} block mb-1.5`}>Need more information?</label>
                      <textarea rows={2} maxLength={1000} value={infoDraft} onChange={(e) => setInfoDraft(e.target.value)}
                        placeholder="Ask the business a question before you decide..."
                        className="w-full rounded-xl border border-[#dfe5f0] px-3 py-2 text-xs focus:border-[#4f63f6] focus:outline-none" />
                      <button type="button" onClick={askInfo} disabled={busy}
                        className="mt-2 w-full rounded-xl border border-amber-400 bg-white hover:bg-amber-50 py-2 text-xs font-bold text-amber-700 disabled:opacity-40">
                        Send question and pause decision
                      </button>
                    </div>
                  </>
                )}

                <div className="grid grid-cols-2 gap-3 pt-1">
                  <button type="button" onClick={reject} disabled={busy || awaitingReply}
                    className="rounded-xl border border-rose-500 bg-white hover:bg-rose-50 py-2.5 text-xs font-bold text-rose-600 disabled:opacity-40">Reject</button>
                  <button type="button" onClick={approve} disabled={busy || awaitingReply || intelFailed}
                    className="rounded-xl bg-[#009a65] hover:bg-[#008154] py-2.5 text-xs font-bold text-white disabled:opacity-40">
                    {busy ? "Processing..." : "Approve"}
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
