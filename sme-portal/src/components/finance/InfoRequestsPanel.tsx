import { useCallback, useEffect, useState } from "react";
import { useSnackbar } from "notistack";
import { Loader2, MessageSquareMore } from "lucide-react";
import { FinanceApi, type FinanceRequest, type InfoMessage } from "../../api/financeApi";
import { SMEApi } from "../../api/smeApi";
import InfoThread from "./InfoThread";

interface Item {
  request: FinanceRequest;
  messages: InfoMessage[];
}

/** For the business owner: lender questions waiting for an answer. Renders nothing when there are none. */
export default function InfoRequestsPanel({ smeId }: { smeId?: number }) {
  const { enqueueSnackbar } = useSnackbar();
  const [items, setItems] = useState<Item[]>([]);
  const [drafts, setDrafts] = useState<Record<number, string>>({});
  const [sending, setSending] = useState<number | null>(null);

  const load = useCallback(async () => {
    try {
      const id = smeId ?? (await SMEApi.getDashboard()).data.sme_id;
      const { data } = await FinanceApi.getRequests(id);
      const waiting = data.filter((r) => r.status === "info_requested");
      const withThreads = await Promise.all(
        waiting.map(async (request) => ({
          request,
          messages: (await FinanceApi.getMessages(request.id)).data,
        }))
      );
      setItems(withThreads);
    } catch {
      setItems([]);
    }
  }, [smeId]);

  useEffect(() => {
    load();
  }, [load]);

  const send = async (id: number) => {
    const text = (drafts[id] || "").trim();
    if (text.length < 5) {
      enqueueSnackbar("Please write at least a few words.", { variant: "warning" });
      return;
    }
    setSending(id);
    try {
      await FinanceApi.respond(id, text);
      enqueueSnackbar("Reply sent to the lender.", { variant: "success" });
      setDrafts((d) => ({ ...d, [id]: "" }));
      await load();
    } catch (err: any) {
      enqueueSnackbar(err.response?.data?.detail || "Could not send your reply.", { variant: "error" });
    } finally {
      setSending(null);
    }
  };

  if (items.length === 0) return null;

  return (
    <div className="space-y-3">
      {items.map(({ request, messages }) => (
        <div key={request.id} className="rounded-xl border border-amber-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-amber-900">
            <MessageSquareMore className="h-5 w-5 text-amber-600" />
            A lender needs more information on your funding request #{request.id}
          </div>
          <InfoThread messages={messages} />
          <textarea
            rows={3}
            maxLength={1000}
            value={drafts[request.id] || ""}
            onChange={(e) => setDrafts((d) => ({ ...d, [request.id]: e.target.value }))}
            placeholder="Type your reply to the lender..."
            className="mt-3 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-green-400 focus:outline-none focus:ring-2 focus:ring-green-500/20"
          />
          <div className="mt-2 flex justify-end">
            <button
              onClick={() => send(request.id)}
              disabled={sending === request.id}
              className="flex items-center gap-2 rounded-lg bg-[#1f724f] px-5 py-2 text-sm font-semibold text-white hover:bg-[#155a3a] disabled:opacity-50"
            >
              {sending === request.id && <Loader2 className="h-4 w-4 animate-spin" />}
              Send reply
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
