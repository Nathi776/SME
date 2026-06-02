import { Link } from "react-router-dom";
import { ArrowRight, BarChart2, Building2, CheckCircle2, ShieldCheck, UserRound } from "lucide-react";

function RoleCard({
  title,
  subtitle,
  description,
  href,
  accent,
  icon: Icon,
}: {
  title: string;
  subtitle: string;
  description: string;
  href: string;
  accent: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <Link
      to={href}
      className={`group rounded-3xl border border-gray-200 bg-white p-6 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl ${accent}`}
    >
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-gray-400">{subtitle}</p>
          <h2 className="mt-2 text-2xl font-black text-gray-900">{title}</h2>
        </div>
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gray-50 text-gray-900 transition-colors group-hover:bg-gray-100">
          <Icon className="h-6 w-6" />
        </div>
      </div>

      <p className="max-w-md text-sm leading-6 text-gray-600">{description}</p>

      <div className="mt-6 space-y-2">
        {[
          "Account information",
          title === "SME" ? "Business profile" : "Organization profile",
          title === "SME" ? "Verification" : "Compliance verification",
          title === "SME" ? "Setup preferences" : "Funding preferences",
        ].map((item) => (
          <div key={item} className="flex items-center gap-2 text-sm text-gray-700">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <span>{item}</span>
          </div>
        ))}
      </div>

      <div className="mt-7 inline-flex items-center gap-2 text-sm font-semibold text-gray-900 transition-transform group-hover:translate-x-1">
        Continue
        <ArrowRight className="h-4 w-4" />
      </div>
    </Link>
  );
}

export default function ChooseRolePage() {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(34,197,94,0.09),_transparent_34%),linear-gradient(180deg,#f9fafb_0%,#f3f4f6_100%)] text-gray-900">
      <div className="mx-auto flex min-h-screen max-w-7xl flex-col px-4 py-6 sm:px-6 lg:px-8">
        <header className="flex items-center justify-between rounded-3xl border border-white/70 bg-white/80 px-5 py-4 shadow-sm backdrop-blur">
          <Link to="/" className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-green-600 text-white shadow-lg shadow-green-600/25">
              <BarChart2 className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-black tracking-wide">SME FINANCE</p>
              <p className="text-xs font-medium text-gray-500">Choose your registration path</p>
            </div>
          </Link>

          <Link to="/login" className="rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50">
            Sign in
          </Link>
        </header>

        <main className="flex flex-1 items-center py-10">
          <div className="grid w-full grid-cols-1 gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:gap-10">
            <section className="flex flex-col justify-center">
              <p className="mb-3 inline-flex w-fit items-center gap-2 rounded-full border border-green-200 bg-green-50 px-4 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-green-700">
                <ShieldCheck className="h-4 w-4" /> 4 simple steps to get started
              </p>
              <h1 className="max-w-2xl text-4xl font-black leading-tight text-gray-950 sm:text-5xl lg:text-6xl">
                Select the registration flow that matches your role.
              </h1>
              <p className="mt-5 max-w-2xl text-lg leading-8 text-gray-600">
                SMEs and lenders now start from a shared entry page, then move into their own onboarding sequence without repeating questions.
              </p>

              <div className="mt-8 grid gap-4 sm:grid-cols-3">
                <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                  <UserRound className="h-5 w-5 text-green-600" />
                  <p className="mt-3 text-sm font-semibold text-gray-900">Account</p>
                  <p className="mt-1 text-sm text-gray-500">Create login details once.</p>
                </div>
                <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                  <Building2 className="h-5 w-5 text-green-600" />
                  <p className="mt-3 text-sm font-semibold text-gray-900">Profile</p>
                  <p className="mt-1 text-sm text-gray-500">Enter only the role-specific information.</p>
                </div>
                <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                  <ShieldCheck className="h-5 w-5 text-green-600" />
                  <p className="mt-3 text-sm font-semibold text-gray-900">Verify</p>
                  <p className="mt-1 text-sm text-gray-500">Confirm email before onboarding.
                  </p>
                </div>
              </div>
            </section>

            <section className="grid gap-5">
              <RoleCard
                title="SME"
                subtitle="For businesses"
                description="Register as a business owner to manage invoices, verify your company, and configure SME setup preferences."
                href="/register/sme"
                accent="border-green-200 hover:border-green-300"
                icon={BarChart2}
              />
              <RoleCard
                title="LENDER"
                subtitle="For funding partners"
                description="Register as a lender to complete compliance checks, define funding criteria, and review SME opportunities."
                href="/register/lender"
                accent="border-violet-200 hover:border-violet-300"
                icon={Building2}
              />
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}