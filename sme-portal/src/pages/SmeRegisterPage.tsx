import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  BarChart2,
  CheckCircle,
  HelpCircle,
  Info,
  Menu,
  ShieldCheck,
} from "lucide-react";
import { formatApiErrorDetail } from "../utils/formatApiError";
import { SMEApi } from "../api/smeApi";

const SmeRegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [industry, setIndustry] = useState("");
  const [revenue, setRevenue] = useState<number | "">("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const userId = sessionStorage.getItem("justRegisteredUserId");
      const payload: any = {
        name,
        industry,
        revenue: Number(revenue) || 0,
      };
      if (userId) payload.user_id = Number(userId);

      await SMEApi.create(payload);
      // done, clear temporary storage and navigate to SME dashboard
      sessionStorage.removeItem("justRegisteredUserId");
      navigate("/dashboard");
    } catch (err: any) {
      const detail = err?.response?.data?.detail;
      setError(formatApiErrorDetail(detail) || err?.message || "Failed to create SME profile");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      <aside className="sticky top-0 hidden min-h-screen w-64 shrink-0 flex-col bg-[#0f172a] lg:flex">
        <div className="flex items-center gap-3 border-b border-white/10 px-5 py-6">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-green-700">
            <BarChart2 className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-wide text-white">SME FINANCE</h1>
            <p className="text-[10px] tracking-wider text-green-400">Grow Your Business</p>
          </div>
        </div>

        <div className="px-5 pt-6 pb-4">
          <p className="mb-4 text-[10px] font-semibold uppercase tracking-widest text-gray-400">Onboarding Progress</p>
          <div className="space-y-0">
            {[
              { number: 1, label: "Business Info", status: "completed" },
              { number: 2, label: "Account Info", status: "completed" },
              { number: 3, label: "Verify Account", status: "completed" },
              { number: 4, label: "Business Setup", status: "in_progress" },
              { number: 5, label: "Dashboard Access", status: "pending" },
            ].map((step, index, list) => {
              const completed = step.status === "completed";
              const inProgress = step.status === "in_progress";

              return (
                <div key={step.number} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 ${
                        completed ? "border-green-500 bg-green-500" : inProgress ? "border-green-400 bg-[#0f172a]" : "border-gray-600 bg-[#0f172a]"
                      }`}
                    >
                      {completed ? <CheckCircle className="h-4 w-4 fill-green-500 text-white" /> : <span className={`text-xs font-bold ${inProgress ? "text-green-400" : "text-gray-500"}`}>{step.number}</span>}
                    </div>
                    {index < list.length - 1 ? <div className={`mt-1 h-8 w-0.5 ${completed ? "bg-green-500" : "bg-gray-700"}`} /> : null}
                  </div>
                  <div className="pb-6">
                    <p className={`text-sm leading-tight ${completed ? "font-semibold text-green-400" : inProgress ? "font-bold text-white" : "text-gray-400"}`}>{step.label}</p>
                    <p className={`text-[10px] ${completed ? "text-green-400" : inProgress ? "font-medium text-green-400" : "text-gray-500"}`}>
                      {completed ? "Completed" : inProgress ? "In Progress" : "Pending"}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex-1" />

        <div className="mx-4 mb-4 rounded-xl border border-white/10 p-4">
          <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-full bg-white/10">
            <HelpCircle className="h-5 w-5 text-gray-300" />
          </div>
          <p className="text-sm font-semibold text-white">Need help?</p>
          <p className="mt-1 mb-3 text-xs text-gray-400">Our support team is here to help you get started.</p>
          <button type="button" className="w-full rounded-lg border border-green-500 py-2 text-xs font-medium text-green-400 transition-colors hover:bg-green-500/10">
            Contact Support
          </button>
        </div>

        <div className="mx-4 mb-4 rounded-xl border border-white/10 bg-white/5 p-3">
          <div className="flex h-20 items-end gap-1 px-2 pb-1">
            {[30, 55, 40, 70, 50, 80, 60].map((height, index) => (
              <div key={index} className="flex-1 rounded-sm bg-green-500/50" style={{ height: `${height}%` }} />
            ))}
          </div>
          <div className="mt-2 flex items-center gap-2 rounded-lg bg-white/5 px-3 py-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-green-500/20">
              <ShieldCheck className="h-4 w-4 text-green-400" />
            </div>
            <p className="text-[11px] text-gray-300">Your data is secure and encrypted</p>
          </div>
        </div>

        <div className="flex items-center gap-2 px-5 pb-5">
          <ShieldCheck className="h-4 w-4 shrink-0 text-gray-400" />
          <p className="text-[11px] text-gray-400">Your data is secure and encrypted</p>
        </div>
      </aside>

      <div className="flex min-h-screen flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-gray-200 bg-white px-6">
          <button type="button" className="rounded-lg p-2 transition-colors hover:bg-gray-100">
            <Menu className="h-5 w-5 text-gray-500" />
          </button>

          <div className="flex items-center gap-4">
            <button type="button" className="flex items-center gap-1.5 text-sm text-gray-500 transition-colors hover:text-gray-700">
              <HelpCircle className="h-4 w-4" />
              Need help?
            </button>
            <button type="button" className="rounded-lg p-2 transition-colors hover:bg-gray-100">
              <Info className="h-5 w-5 text-gray-500" />
            </button>
          </div>
        </header>

        <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col px-6 py-8">
          <h1 className="mb-1 text-2xl font-bold text-gray-900">Complete Your SME Profile</h1>
          <p className="mb-6 text-sm text-gray-500">Tell us a little more about your business so we can personalize your experience.</p>

          <div className="mb-8 flex items-start gap-3 rounded-xl border border-gray-200 bg-white px-5 py-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-green-100">
              <Info className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">Why do we need this?</p>
              <p className="mt-0.5 text-xs text-gray-500">
                This information helps us verify your business, match you with the right financing options, and provide a better experience.
              </p>
            </div>
          </div>

          {error ? <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600">{error}</div> : null}

          <form onSubmit={handleSubmit}>
            <section className="mb-6 rounded-xl border border-gray-200 bg-white p-6">
              <div className="mb-1 flex items-center gap-2">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-green-700 text-xs font-bold text-white">1</div>
                <h2 className="text-base font-bold text-gray-900">Business Profile</h2>
              </div>
              <p className="mb-5 ml-8 text-xs text-gray-500">Help us understand your business better.</p>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-gray-700">SME Name <span className="text-red-500">*</span></label>
                  <input
                    className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-green-400 focus:outline-none focus:ring-2 focus:ring-green-500/20"
                    placeholder="e.g. ABC Construction (Pty) Ltd"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-gray-700">Industry <span className="text-red-500">*</span></label>
                  <select
                    className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 focus:border-green-400 focus:outline-none focus:ring-2 focus:ring-green-500/20"
                    value={industry}
                    onChange={(event) => setIndustry(event.target.value)}
                  >
                    <option value="">Select your industry</option>
                    <option>Retail</option>
                    <option>Manufacturing</option>
                    <option>Construction</option>
                    <option>Agriculture</option>
                    <option>Technology</option>
                    <option>Healthcare</option>
                    <option>Transport & Logistics</option>
                    <option>Food & Beverage</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-gray-700">Annual Revenue</label>
                  <input
                    type="number"
                    className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-green-400 focus:outline-none focus:ring-2 focus:ring-green-500/20"
                    placeholder="e.g. 250000"
                    value={revenue}
                    onChange={(event) => setRevenue(event.target.value === "" ? "" : Number(event.target.value))}
                  />
                </div>
              </div>
            </section>

            <div className="mb-6 rounded-xl border border-green-200 bg-green-50 px-5 py-4">
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-green-600">
                  <CheckCircle className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">Next step: complete your account setup</p>
                  <p className="text-xs text-gray-500">
                    Once saved, you’ll move into the onboarding flow to finish setup and access your SME dashboard.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-gray-200 pt-6">
              <button
                type="button"
                onClick={() => navigate("/register")}
                className="flex items-center gap-2 rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex items-center gap-2 rounded-lg bg-green-700 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-green-800 disabled:opacity-50"
              >
                {submitting ? "Creating Profile..." : "Create SME Profile"}
                {!submitting ? <ArrowRight className="h-4 w-4" /> : null}
              </button>
            </div>

            <div className="mt-4 flex items-center justify-center gap-2">
              <Info className="h-4 w-4 text-gray-400" />
              <p className="text-xs text-gray-500">Once completed, you'll gain full access to your SME dashboard and financing features.</p>
            </div>
          </form>
        </main>
      </div>
    </div>
  );
};

export default SmeRegisterPage;
