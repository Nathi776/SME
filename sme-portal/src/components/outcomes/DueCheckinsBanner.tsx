import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { CalendarClock } from "lucide-react";
import { OutcomeApi, type DueCheckin } from "../../api/outcomeApi";

/** Shows check-ins that are due. Renders nothing when none are due or the call fails. */
export default function DueCheckinsBanner({ linkToPage = true }: { linkToPage?: boolean }) {
  const [due, setDue] = useState<DueCheckin[]>([]);

  useEffect(() => {
    OutcomeApi.getDue()
      .then(({ data }) => setDue(data))
      .catch(() => setDue([]));
  }, []);

  if (due.length === 0) return null;

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
      <div className="flex items-start gap-3">
        <CalendarClock className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
        <div className="flex-1">
          <p className="text-sm font-semibold text-amber-900">
            {due.length === 1 ? "1 check-in is due" : `${due.length} check-ins are due`}
          </p>
          <ul className="mt-1 space-y-0.5 text-sm text-amber-800">
            {due.map((d) => (
              <li key={`${d.outcome_id}-${d.interval}`}>
                {d.interval}-day check-in
                {d.days_overdue > 0 ? `, ${d.days_overdue} day${d.days_overdue === 1 ? "" : "s"} overdue` : ", due now"}
              </li>
            ))}
          </ul>
          {linkToPage && (
            <Link to="/outcomes" className="mt-2 inline-block text-sm font-semibold text-amber-900 underline">
              Complete your check-in
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
