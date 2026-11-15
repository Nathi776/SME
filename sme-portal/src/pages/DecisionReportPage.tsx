import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { FileText, Loader2 } from "lucide-react";
import { DecisionReportApi, type DecisionReport, type ReportFactor } from "../api/decisionReportApi";

const BAND_STYLE: Record<string, string> = {
  high: "bg-green-100 text-green-800 border-green-200",
  medium_high: "bg-green-50 text-green-800 border-green-200",
  medium: "bg-amber-50 text-amber-800 border-amber-200",
  low: "bg-orange-50 text-orange-800 border-orange-200",
  none: "bg-gray-100 text-gray-700 border-gray-200",
  not_applicable: "bg-gray-50 text-gray-600 border-gray-200",
};

function Score({ label, value, hint }: { label: string; value: number | null; hint?: string }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-[#071942]">{value === null ? "–" : value}</p>
      {hint && <p className="mt-1 text-xs text-gray-500">{hint}</p>}
    </div>
  );
}

function Factor({ f }: { f: ReportFactor }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-[#071942]">{f.name}</h3>
          <p className="text-sm text-gray-600">{f.rests_on ?? f.description}</p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-sm font-semibold text-[#071942]">
            {f.points} / {f.max_points} pts
          </p>
          <span
            className={`mt-1 inline-block rounded-full border px-2 py-0.5 text-xs font-semibold ${
              BAND_STYLE[f.confidence ?? "none"] ?? BAND_STYLE.none
            }`}
          >
            {f.confidence_text}
          </span>
        </div>
      </div>
      {f.notes.length > 0 && (
        <ul className="mt-3 list-disc space-y-1 pl-5 text-xs text-gray-600">
          {f.notes.map((n) => (
            <li key={n}>{n}</li>
          ))}
        </ul>
      )}
      {f.what_would_help && <p className="mt-3 text-xs font-medium text-green-700">Next step: {f.what_would_help}</p>}
    </div>
  );
}

export default function DecisionReportPage() {
  const { smeId } = useParams();
  const [report, setReport] = useState<DecisionReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (smeId ? DecisionReportApi.forSme(smeId) : DecisionReportApi.mine())
      .then((r) => setReport(r.data))
      .catch((e) =>
        setError(e.response?.status === 404 ? "No assessment is available yet." : "Could not load the report.")
      )
      .finally(() => setLoading(false));
  }, [smeId]);

  if (loading)
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-green-500" />
      </div>
    );
  if (error || !report)
    return <div className="mx-auto max-w-3xl p-6 text-sm text-gray-600">{error ?? "No report."}</div>;

  const h = report.headline;
  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold text-[#071942]">
          <FileText className="h-6 w-6 text-gray-500" /> Assessment explanation
        </h1>
        <p className="mt-1 text-sm text-gray-500">{report.statement}</p>
      </div>

      <div className="rounded-xl border border-gray-200 bg-gray-50 p-5">
        <p className="text-sm text-gray-600">
          Stage: <span className="font-semibold text-[#071942]">{h.stage}</span> · Outcome:{" "}
          <span className="font-semibold text-[#071942]">{h.decision}</span>
        </p>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <Score label="Funding readiness" value={h.funding_readiness_score} hint={h.scores_explained.funding_readiness_score} />
          <Score label="Viability" value={h.viability_score} hint={h.scores_explained.viability_score} />
          <Score label="Evidence confidence" value={h.evidence_confidence_score} hint={h.scores_explained.evidence_confidence_score} />
        </div>
        {report.reasoning.length > 0 && (
          <ul className="mt-4 list-disc space-y-1 pl-5 text-sm text-gray-600">
            {report.reasoning.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
        )}
      </div>

      {report.main_gaps.length > 0 && (
        <section>
          <h2 className="mb-2 text-sm font-bold text-[#071942]">What would strengthen this assessment</h2>
          <ul className="space-y-1 text-sm text-gray-700">
            {report.main_gaps.map((g) => (
              <li key={g.name}>
                <span className="font-semibold">{g.name}:</span> {g.what_would_help ?? "Needs review."}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="space-y-3">
        <h2 className="text-sm font-bold text-[#071942]">How each part was assessed</h2>
        {!report.evidence_detail_available && (
          <p className="text-xs text-gray-500">
            Evidence detail was not recorded for this assessment. Run a new assessment to see it.
          </p>
        )}
        {report.factors.map((f) => (
          <Factor key={f.name} f={f} />
        ))}
      </section>

      {report.context_only.length > 0 && (
        <section>
          <h2 className="mb-2 text-sm font-bold text-[#071942]">Shown for context only (not scored)</h2>
          <ul className="space-y-1 text-sm text-gray-600">
            {report.context_only.map((c) => (
              <li key={c.name}>
                <span className="font-semibold">{c.name}:</span> {c.description}
              </li>
            ))}
          </ul>
        </section>
      )}

      <p className="rounded-lg bg-gray-50 p-4 text-xs text-gray-500">{report.confidence_note}</p>
      <p className="text-xs text-gray-400">
        Assessed {report.traceability.assessed_at ? new Date(report.traceability.assessed_at).toLocaleString() : "–"} ·
        scoring {report.traceability.strategy_version ?? "–"} · evidence rules {report.traceability.evidence_rules_version ?? "–"}
      </p>
      {smeId && (
        <Link to={`/lender/sme/${smeId}`} className="text-sm text-green-700 underline">
          Back to business
        </Link>
      )}
    </div>
  );
}
