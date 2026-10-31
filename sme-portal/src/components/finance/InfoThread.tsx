import type { InfoMessage } from "../../api/financeApi";

/** The lender/business question-and-answer thread for one finance request. */
export default function InfoThread({ messages }: { messages: InfoMessage[] }) {
  if (messages.length === 0) return null;
  return (
    <ul className="space-y-2">
      {messages.map((m) => (
        <li
          key={m.id}
          className={`rounded-lg border px-3 py-2 text-sm ${
            m.author_role === "lender"
              ? "border-amber-200 bg-amber-50 text-amber-900"
              : "border-green-200 bg-green-50 text-green-900"
          }`}
        >
          <div className="mb-0.5 flex justify-between text-[11px] font-semibold uppercase tracking-wide opacity-70">
            <span>{m.author_role === "lender" ? "Lender asked" : "Business replied"}</span>
            <span>{new Date(m.created_at).toLocaleString()}</span>
          </div>
          <p className="whitespace-pre-wrap">{m.message}</p>
        </li>
      ))}
    </ul>
  );
}
