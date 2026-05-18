import { CheckCircle, DollarSign, FileText, Star } from "lucide-react";
import { Link } from "react-router-dom";

const activities = [
  {
    icon: CheckCircle,
    iconBg: "bg-green-100 text-green-600",
    text: "Your finance request REQ-2024-014 was approved",
    date: "18 May 2024, 10:30 AM",
  },
  {
    icon: DollarSign,
    iconBg: "bg-blue-100 text-blue-600",
    text: "Payment received for INV-2024-023",
    date: "10 May 2024, 09:15 AM",
  },
  {
    icon: FileText,
    iconBg: "bg-orange-100 text-orange-500",
    text: "New invoice INV-2024-024 uploaded",
    date: "20 May 2024, 02:45 PM",
  },
  {
    icon: Star,
    iconBg: "bg-purple-100 text-purple-600",
    text: "Your credit score was updated",
    date: "18 May 2024, 08:00 AM",
  },
];

export default function RecentActivity() {
  return (
    <div className="bg-card rounded-xl border border-border p-5 flex flex-col">
      <h3 className="font-semibold text-foreground text-sm mb-4">Recent Activity</h3>
      <div className="space-y-4 flex-1">
        {activities.map((a, i) => (
          <div key={i} className="flex items-start gap-3">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${a.iconBg}`}>
              <a.icon className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-medium text-foreground">{a.text}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">{a.date}</p>
            </div>
          </div>
        ))}
      </div>
      <Link to="/" className="text-xs text-blue-600 hover:underline font-medium text-center mt-4">
        View all activity
      </Link>
    </div>
  );
}
