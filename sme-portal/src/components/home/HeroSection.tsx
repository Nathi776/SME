import { CheckCircle, Play } from "lucide-react";
import { Link } from "react-router-dom";

export default function HeroSection() {
  return (
    <section className="overflow-hidden bg-white">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
        <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2">
          <div>
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-green-100 bg-green-50 px-3 py-1.5 text-xs font-semibold text-green-700">
              <CheckCircle className="h-3.5 w-3.5" />
              Smart Financing for Growing Businesses
            </div>

            <h1 className="mb-2 text-4xl font-extrabold leading-tight text-gray-900 lg:text-5xl">Fuel Your Business.</h1>
            <h1 className="mb-6 text-4xl font-extrabold leading-tight text-green-600 lg:text-5xl">Unlock Your Potential.</h1>

            <p className="mb-8 max-w-md text-base leading-relaxed text-gray-500">
              SME Finance connects small and medium businesses with the capital they need to grow. Upload invoices, get financing, and manage your business finances — all in one place.
            </p>

            <div className="mb-10 flex flex-wrap items-center gap-4">
              <Link
                to="/register"
                className="inline-flex items-center gap-2 rounded-lg bg-gray-900 px-6 py-3 font-semibold text-white shadow-sm transition-colors hover:bg-gray-800"
              >
                Get Started Free →
              </Link>
              <button className="inline-flex items-center gap-2 font-medium text-gray-700 transition-colors hover:text-gray-900">
                <span className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-gray-200">
                  <Play className="ml-0.5 h-4 w-4 fill-gray-700 text-gray-700" />
                </span>
                How It Works
              </button>
            </div>

            <div className="flex flex-wrap gap-5">
              {["Quick Approvals", "Competitive Rates", "Trusted by SMEs"].map((item) => (
                <div key={item} className="flex items-center gap-1.5 text-sm text-gray-600">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  {item}
                </div>
              ))}
            </div>
          </div>

          <div className="relative hidden lg:block">
            <div className="relative">
              <div className="rounded-2xl bg-gray-900 p-3 shadow-2xl">
                <div className="overflow-hidden rounded-xl bg-gray-800" style={{ aspectRatio: "16 / 10" }}>
                  <div className="flex h-full">
                    <div className="flex w-36 shrink-0 flex-col gap-1.5 bg-[#0B1437] p-3">
                      <div className="mb-3 flex items-center gap-1.5">
                        <div className="flex h-5 w-5 items-center justify-center rounded bg-green-500">
                          <span className="text-[8px] font-bold text-white">S</span>
                        </div>
                        <p className="text-[7px] font-bold leading-none text-white">SME FINANCE</p>
                      </div>
                      {[
                        "Dashboard",
                        "Invoices",
                        "Finance Requests",
                        "Credit Score",
                        "Customers",
                        "Documents",
                        "Transactions",
                        "Messages",
                        "Settings",
                        "Help Center",
                      ].map((item, index) => (
                        <div
                          key={item}
                          className={`rounded px-2 py-1 text-[7px] ${index === 0 ? "bg-green-600 font-semibold text-white" : "text-gray-400"}`}
                        >
                          {item}
                        </div>
                      ))}
                      <div className="mt-auto px-2 py-1 text-[7px] text-red-400">Logout</div>
                    </div>

                    <div className="flex-1 overflow-hidden bg-gray-50 p-4">
                      <div className="mb-3 flex items-center justify-between">
                        <div>
                          <p className="text-[10px] font-bold text-gray-800">Dashboard</p>
                          <p className="text-[7px] text-gray-500">Welcome back, Thabo! 👋</p>
                        </div>
                        <div className="rounded bg-green-600 px-2 py-1 text-[7px] font-semibold text-white">Request Finance</div>
                      </div>

                      <div className="mb-3 grid grid-cols-4 gap-2">
                        {[
                          { label: "Total Invoices", val: "R245,000.00", sub: "12 Invoices" },
                          { label: "Financed Amount", val: "R150,000.00", sub: "6 Approved" },
                          { label: "Outstanding Balance", val: "R95,000.00", sub: "4 Pending" },
                          { label: "Credit Score", val: "78", sub: "Good Standing" },
                        ].map((card) => (
                          <div key={card.label} className="rounded border border-gray-100 bg-white p-1.5 shadow-sm">
                            <p className="text-[6px] text-gray-400">{card.label}</p>
                            <p className="text-[8px] font-bold text-gray-800">{card.val}</p>
                            <p className="text-[6px] text-green-600">{card.sub}</p>
                          </div>
                        ))}
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div className="rounded border border-gray-100 bg-white p-2">
                          <p className="mb-1 text-[7px] font-semibold text-gray-700">Invoice Overview</p>
                          <div className="flex h-12 items-end gap-0.5">
                            {[4, 6, 5, 8, 7, 9, 6, 8].map((height, index) => (
                              <div
                                key={index}
                                className="flex-1 rounded-sm"
                                style={{ height: `${height * 5}px`, background: index % 2 === 0 ? "#22C55E" : "#BBF7D0" }}
                              />
                            ))}
                          </div>
                          <div className="mt-1 flex justify-between">
                            {["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug"].map((month) => (
                              <span key={month} className="text-[5px] text-gray-400">{month}</span>
                            ))}
                          </div>
                        </div>

                        <div className="rounded border border-gray-100 bg-white p-2">
                          <p className="mb-1 text-[7px] font-semibold text-gray-700">Recent Activity</p>
                          {[
                            { text: "Invoice INV-2024-0012", status: "Paid", color: "bg-green-100 text-green-700" },
                            { text: "Finance request FR-2024-0088", status: "Approved", color: "bg-blue-100 text-blue-700" },
                            { text: "Invoice INV-2024-0011", status: "Uploaded", color: "bg-gray-100 text-gray-600" },
                            { text: "Payment of R25,000", status: "Received", color: "bg-purple-100 text-purple-700" },
                          ].map((item) => (
                            <div key={item.text} className="mb-1 flex items-center justify-between">
                              <span className="max-w-[80px] truncate text-[6px] text-gray-600">{item.text}</span>
                              <span className={`rounded px-1 py-0.5 text-[5px] font-medium ${item.color}`}>{item.status}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="absolute -bottom-4 -right-4 w-32 rounded-2xl border-4 border-gray-700 bg-gray-800 p-1.5 shadow-2xl">
                <div className="overflow-hidden rounded-xl bg-gray-50 p-2" style={{ aspectRatio: "9 / 16" }}>
                  <p className="mb-1 text-[7px] font-bold text-gray-800">Dashboard</p>
                  <div className="mb-1 rounded border border-gray-100 bg-white p-1.5">
                    <p className="text-[5px] text-gray-400">Credit Score</p>
                    <p className="text-[10px] font-bold text-gray-800">78</p>
                    <p className="text-[5px] text-green-600">● Good Standing</p>
                  </div>
                  <div className="grid grid-cols-2 gap-1">
                    {[
                      ["Upload Invoice", "bg-blue-50"],
                      ["Request Finance", "bg-green-50"],
                      ["View Customers", "bg-purple-50"],
                      ["Documents", "bg-orange-50"],
                    ].map(([label, color]) => (
                      <div key={label} className={`${color} rounded p-1 text-center`}>
                        <p className="text-[5px] font-semibold text-gray-700">{label}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
