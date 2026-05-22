import { DollarSign, ShieldCheck, Clock, Users } from "lucide-react";

const stats = [
  { icon: Users, value: "5,000+", label: "Businesses Empowered" },
  { icon: DollarSign, value: "R250M+", label: "Financing Disbursed" },
  { icon: Clock, value: "24-48hrs", label: "Average Approval Time" },
  { icon: ShieldCheck, value: "98%", label: "Customer Satisfaction" },
];

export default function StatsBar() {
  return (
    <section className="border-y border-gray-100 bg-white">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-6 lg:grid-cols-4">
          {stats.map((item) => (
            <div key={item.label} className="flex items-center gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-green-50">
                <item.icon className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-xl font-extrabold text-gray-900">{item.value}</p>
                <p className="text-sm text-gray-500">{item.label}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
