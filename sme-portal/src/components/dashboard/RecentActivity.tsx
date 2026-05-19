import { CheckCircle, DollarSign, FileText, Star } from "lucide-react";
import { Link } from "react-router-dom";

type ActivityItem = {
  kind: string;
  text: string;
  created_at: string;
};

type RecentActivityProps = {
  activities: ActivityItem[];
};

const activityMeta: Record<string, { icon: typeof CheckCircle; iconBg: string }> = {
  finance_request: { icon: CheckCircle, iconBg: "bg-green-100 text-green-600" },
  invoice: { icon: FileText, iconBg: "bg-orange-100 text-orange-500" },
  credit_score: { icon: Star, iconBg: "bg-purple-100 text-purple-600" },
  payment: { icon: DollarSign, iconBg: "bg-blue-100 text-blue-600" },
};

export default function RecentActivity({ activities }: RecentActivityProps) {
  return (
    <div className="bg-white rounded-lg border border-gray-100 shadow-sm p-5 flex flex-col">
      <h3 className="font-semibold text-foreground text-sm mb-4">Recent Activity</h3>
      <div className="space-y-4 flex-1">
        {activities.length === 0 ? (
          <p className="text-sm text-muted-foreground">No recent activity.</p>
        ) : (
          activities.map((a, i) => {
            const meta = activityMeta[a.kind] ?? activityMeta.invoice;

            return (
              <div key={i} className="flex items-start gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${meta.iconBg}`}>
                  <meta.icon className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-medium text-foreground">{a.text}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {new Date(a.created_at).toLocaleString("en-ZA", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>
      <Link to="/" className="text-xs text-blue-600 hover:underline font-medium text-center mt-4">
        View all activity
      </Link>
    </div>
  );
}
