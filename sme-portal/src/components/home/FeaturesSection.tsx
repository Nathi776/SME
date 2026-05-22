import { BarChart2, FileText, ShieldCheck, Tag, Zap } from "lucide-react";

const features = [
  {
    icon: FileText,
    iconBg: "bg-green-50 text-green-600",
    title: "Invoice Financing",
    desc: "Convert your unpaid invoices into working capital.",
  },
  {
    icon: Zap,
    iconBg: "bg-yellow-50 text-yellow-600",
    title: "Quick Approvals",
    desc: "Get funding in as little as 24-48 hours.",
  },
  {
    icon: Tag,
    iconBg: "bg-blue-50 text-blue-600",
    title: "Competitive Rates",
    desc: "Transparent pricing with no hidden fees.",
  },
  {
    icon: BarChart2,
    iconBg: "bg-purple-50 text-purple-600",
    title: "Business Insights",
    desc: "Track performance and make data-driven decisions.",
  },
  {
    icon: ShieldCheck,
    iconBg: "bg-green-50 text-green-700",
    title: "Secure & Trusted",
    desc: "Your data and transactions are always protected.",
  },
];

export default function FeaturesSection() {
  return (
    <section id="features" className="bg-gray-50 py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-10 text-center">
          <p className="mb-2 text-sm font-semibold uppercase tracking-wide text-green-600">WHY CHOOSE SME FINANCE</p>
          <h2 className="mb-3 text-3xl font-extrabold text-gray-900">Everything You Need to Grow</h2>
          <p className="mx-auto max-w-lg text-base text-gray-500">Powerful tools and funding solutions designed specifically for SMEs</p>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-5">
          {features.map((feature) => (
            <div key={feature.title} className="rounded-xl border border-gray-100 bg-white p-5 transition-shadow hover:shadow-md">
              <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-lg ${feature.iconBg}`}>
                <feature.icon className="h-5 w-5" />
              </div>
              <h3 className="mb-1 text-sm font-semibold text-gray-900">{feature.title}</h3>
              <p className="text-xs leading-relaxed text-gray-500">{feature.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
