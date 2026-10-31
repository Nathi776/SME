import { useCallback, useEffect, useState } from "react";
import { useSnackbar } from "notistack";
import { Loader2, ShieldCheck } from "lucide-react";
import {
  ConsentApi,
  type ConsentHistoryItem,
  type ConsentState,
} from "../api/consentApi";

const fmt = (iso: string | null) => (iso ? new Date(iso).toLocaleString() : "");

export default function PrivacyConsentPage() {
  const { enqueueSnackbar } = useSnackbar();
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [consents, setConsents] = useState<ConsentState[]>([]);
  const [history, setHistory] = useState<ConsentHistoryItem[]>([]);
  const [failed, setFailed] = useState(false);

  const load = useCallback(async () => {
    try {
      const [mine, hist] = await Promise.all([ConsentApi.getMine(), ConsentApi.getHistory()]);
      setConsents(mine.data.consents);
      setHistory(hist.data);
      setFailed(false);
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const change = async (purpose: string, granted: boolean) => {
    setBusy(purpose);
    try {
      await ConsentApi.set(purpose, granted);
      enqueueSnackbar(granted ? "Consent recorded." : "Consent withdrawn.", { variant: "success" });
      await load();
    } catch (err: any) {
      enqueueSnackbar(err.response?.data?.detail || "Could not save your choice.", { variant: "error" });
    } finally {
      setBusy(null);
    }
  };

  if (loading)
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-green-500" />
      </div>
    );

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold text-[#071942]">
          <ShieldCheck className="h-6 w-6 text-gray-500" /> Privacy &amp; Data Use
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Choose how your data may be used beyond your own assessment. Your choices never change your
          score or your funding requests.
        </p>
      </div>

      {failed && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          Could not load your privacy choices. Please refresh and try again.
        </div>
      )}

      {consents.map((c) => (
        <div key={c.purpose} className="space-y-4 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-sm font-bold text-[#071942]">Help improve the scoring model</h2>
              <p className="mt-1 text-sm text-gray-600">{c.description}</p>
            </div>
            <span
              className={`shrink-0 rounded-full border px-3 py-1 text-xs font-semibold ${
                c.granted
                  ? "border-green-200 bg-green-100 text-green-800"
                  : "border-gray-200 bg-gray-100 text-gray-700"
              }`}
            >
              {c.granted ? "Allowed" : c.decided ? "Withdrawn" : "Not allowed"}
            </span>
          </div>

          <p className="text-xs text-gray-500">
            {c.decided
              ? `Last changed ${fmt(c.recorded_at)} under policy ${c.policy_version}.`
              : "You have not made a choice yet. Nothing is shared until you allow it."}
            {c.decided && c.policy_version !== c.current_policy_version &&
              ` The policy has since been updated to ${c.current_policy_version}; your earlier choice is kept until you change it.`}
          </p>

          <div className="flex justify-end border-t border-gray-100 pt-4">
            <button
              disabled={busy === c.purpose}
              onClick={() => change(c.purpose, !c.granted)}
              className={`flex items-center gap-2 rounded-lg px-6 py-2.5 text-sm font-semibold shadow-sm transition-colors disabled:opacity-50 ${
                c.granted
                  ? "border border-gray-300 text-gray-700 hover:bg-gray-50"
                  : "bg-[#1f724f] text-white hover:bg-[#155a3a]"
              }`}
            >
              {busy === c.purpose && <Loader2 className="h-4 w-4 animate-spin" />}
              {c.granted ? "Withdraw consent" : "Allow"}
            </button>
          </div>
        </div>
      ))}

      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="mb-3 border-b border-gray-100 pb-3 text-sm font-bold text-[#071942]">History of your choices</h2>
        {history.length === 0 ? (
          <p className="text-sm text-gray-500">No choices recorded yet.</p>
        ) : (
          <ul className="space-y-2">
            {history.map((h, i) => (
              <li key={i} className="flex justify-between gap-4 text-sm text-gray-700">
                <span>{h.granted ? "Allowed" : "Withdrawn"} <span className="text-xs text-gray-400">({h.source}, policy {h.policy_version})</span></span>
                <span className="text-xs text-gray-500">{fmt(h.recorded_at)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
