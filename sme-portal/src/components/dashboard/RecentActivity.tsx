import { Check, Circle, FileText, ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";

type ActivityItem = {
  kind: string;
  text: string;
  created_at: string;
};

type RecentActivityProps = {
  activities: ActivityItem[];
};

const activityMeta: Record<string, { icon: typeof Check; color: string }> = {
  finance_request: { icon: ShieldCheck, color: "text-[#16b957]" },
  invoice: { icon: FileText, color: "text-[#5d4dff]" },
  credit_score: { icon: Circle, color: "text-[#6a52ff]" },
  payment: { icon: Check, color: "text-[#16b957]" },
};

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("en-ZA", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function RecentActivity({ activities }: RecentActivityProps) {
  return (
    <div className="flex min-h-[300px] flex-col rounded-lg border border-[#eef4ff] bg-white px-6 py-5 shadow-sm xl:col-span-4">
      <h3 className="mb-5 text-base font-bold text-[#071942]">Recent Activity</h3>
      <div className="flex-1">
        {activities.length === 0 ? (
          <p className="text-sm text-[#6d7b99]">No recent activity.</p>
        ) : (
          <div className="relative space-y-4 before:absolute before:left-[9px] before:top-4 before:h-[calc(100%-28px)] before:w-px before:bg-[#d6ddff]">
            {activities.slice(0, 4).map((activity, i) => {
              const meta = activityMeta[activity.kind] ?? activityMeta.invoice;

              return (
                <div key={`${activity.text}-${i}`} className="relative flex items-start gap-5">
                  <span className="z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-md border-2 border-current bg-white">
                    <meta.icon className={`h-3 w-3 ${meta.color}`} />
                  </span>
                  <div className="-mt-1">
                    <p className="text-sm font-medium text-[#071942]">{activity.text}</p>
                    <p className="mt-1 text-sm text-[#31456f]">{formatDateTime(activity.created_at)}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      <Link to="/dashboard" className="mt-5 text-center text-sm font-medium text-[#315cff] hover:underline">
        View all activity
      </Link>
    </div>
  );
}
