import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  BarChart2,
  CheckCircle2,
  ChevronDown,
  Eye,
  EyeOff,
  Loader2,
  ShieldCheck,
  TrendingUp,
  Zap,
} from "lucide-react";
import { AuthApi } from "../api/authApi";
import { formatApiErrorDetail } from "../utils/formatApiError";
import { login as autoLogin } from "../utils/auth";

const BUSINESS_TYPES = [
  "Sole Proprietor",
  "Partnership",
  "Private Company (Pty) Ltd",
  "Public Company",
  "Close Corporation",
  "NPO / NGO",
];

const INDUSTRIES = [
  "Construction",
  "Retail",
  "Manufacturing",
  "Technology",
  "Healthcare",
  "Agriculture",
  "Transport & Logistics",
  "Food & Beverage",
  "Professional Services",
  "Other",
];

type PasswordStrengthProps = {
  password: string;
};

function PasswordStrength({ password }: PasswordStrengthProps) {
  const checks = [
    { label: "At least 8 characters", ok: password.length >= 8 },
    { label: "One uppercase letter", ok: /[A-Z]/.test(password) },
    { label: "One lowercase letter", ok: /[a-z]/.test(password) },
    { label: "One special character", ok: /[^A-Za-z0-9]/.test(password) },
    { label: "One number", ok: /[0-9]/.test(password) },
  ];

  return (
    <div className="mt-3 rounded-lg border border-blue-100 bg-blue-50 p-3">
      <p className="mb-2 text-xs font-semibold text-gray-700">Password must contain:</p>
      <div className="grid grid-cols-1 gap-1 sm:grid-cols-2 lg:grid-cols-3">
        {checks.map((check) => (
          <div key={check.label} className="flex items-center gap-1">
            <CheckCircle2 className={`h-3 w-3 shrink-0 ${check.ok ? "text-green-500" : "text-gray-300"}`} />
            <span className="text-[10px] text-gray-600">{check.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function buildUsername(source: string) {
  const fallback = source.trim().split("@")[0] || source;
  const normalized = fallback
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 32);

  return normalized.length >= 3 ? normalized : `user_${Date.now().toString().slice(-6)}`;
}

export default function RegisterPage() {
  const navigate = useNavigate();

  const [businessName, setBusinessName] = useState("");
  const [regNumber, setRegNumber] = useState("");
  const [businessType, setBusinessType] = useState("");
  const [industry, setIndustry] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [province, setProvince] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [phone, setPhone] = useState("");

  const [fullName, setFullName] = useState("");
  const [position, setPosition] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [accountType, setAccountType] = useState<"sme" | "lender">("sme");
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [agreed, setAgreed] = useState(false);

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const username = useMemo(() => buildUsername(email || businessName || fullName), [businessName, email, fullName]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (!agreed) {
      setError("Please agree to the Terms of Service and Privacy Policy");
      return;
    }

    setLoading(true);

    try {
      const registerResponse = await AuthApi.register(username, password, email);
      const userId = registerResponse.data?.id;

      if (userId) {
        sessionStorage.setItem("justRegisteredUserId", String(userId));
      }

      try {
        await autoLogin(username, password);
      } catch {
        // Registration succeeded; the user can log in manually if auto-login fails.
      }

      navigate(accountType === "lender" ? "/register/lender" : "/register/sme");
    } catch (registerError: any) {
      const detail = registerError?.response?.data?.detail;
      setError(formatApiErrorDetail(detail) || registerError?.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="flex items-center justify-end gap-4 border-b border-gray-100 bg-white px-8 py-3">
        <button className="flex items-center gap-1.5 text-sm text-gray-500 transition-colors hover:text-gray-700" type="button">
          <span className="flex h-4 w-4 items-center justify-center rounded-full border border-gray-300 text-[10px]">?</span>
          Need help?
        </button>
        <button className="flex items-center gap-1 text-sm text-gray-500 transition-colors hover:text-gray-700" type="button">
          <span role="img" aria-hidden="true">
            🌐
          </span>
          English <ChevronDown className="h-4 w-4" />
        </button>
      </div>

      <div className="mx-auto flex w-full max-w-6xl flex-1 gap-6 px-4 py-6">
        <aside className="relative hidden w-64 shrink-0 overflow-hidden rounded-2xl bg-[#0B1437] p-7 text-white lg:flex lg:flex-col">
          <div className="mb-8 flex items-center gap-2">
            <BarChart2 className="h-6 w-6 text-green-400" />
            <div>
              <p className="text-sm font-bold leading-tight">SME FINANCE</p>
              <p className="text-[10px] text-green-400">Grow Your Business</p>
            </div>
          </div>

          <h2 className="mb-3 text-xl font-bold leading-snug">Fuel Your Business Growth</h2>
          <p className="mb-8 text-sm leading-relaxed text-white/60">
            Join thousands of SMEs using our platform to access financing, manage invoices, and grow their businesses.
          </p>

          <div className="mb-8 space-y-5">
            {[
              {
                icon: ShieldCheck,
                color: "text-green-400",
                title: "Secure & Trusted",
                desc: "Bank-level security for your business data",
              },
              {
                icon: Zap,
                color: "text-yellow-400",
                title: "Fast & Easy",
                desc: "Get financing decisions in as little as 24 hours",
              },
              {
                icon: TrendingUp,
                color: "text-blue-400",
                title: "Grow Your Business",
                desc: "Access the capital you need to scale your operations",
              },
            ].map((item) => (
              <div key={item.title} className="flex gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/10">
                  <item.icon className={`h-4 w-4 ${item.color}`} />
                </div>
                <div>
                  <p className="text-sm font-semibold">{item.title}</p>
                  <p className="text-xs text-white/50">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-1 items-end">
            <div className="w-full rounded-xl border border-white/10 bg-white/5 p-3">
              <div className="mb-2 flex gap-2">
                <div className="h-8 w-8 rounded-md bg-white/10" />
                <div className="flex-1 space-y-1">
                  <div className="h-2 w-3/4 rounded bg-white/20" />
                  <div className="h-2 w-1/2 rounded bg-white/10" />
                </div>
              </div>
              <div className="flex h-12 items-end gap-0.5 rounded-md bg-gradient-to-r from-blue-500/30 to-green-500/30 px-2 pb-1">
                {[3, 5, 4, 7, 6, 8, 5].map((height, index) => (
                  <div key={index} className="flex-1 rounded-sm bg-green-400/60" style={{ height: `${height * 4}px` }} />
                ))}
              </div>
              <div className="mt-2 flex items-center justify-between">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-green-500">
                  <CheckCircle2 className="h-4 w-4 text-white" />
                </div>
                <div className="h-2 w-2/3 rounded bg-white/20" />
              </div>
            </div>
          </div>

          <div className="mt-6 border-t border-white/10 pt-5">
            <p className="text-xs text-white/50">Already have an account?</p>
            <Link to="/login" className="text-sm font-medium text-green-400 transition-colors hover:text-green-300">
              Sign in to your account →
            </Link>
          </div>
        </aside>

        <main className="flex-1">
          <div className="rounded-2xl border border-gray-100 bg-white p-8 shadow-sm">
            <h1 className="mb-1 text-2xl font-bold text-gray-900">Create Your Account</h1>
            <p className="mb-6 text-sm text-gray-500">Join SME Finance and start your journey today</p>

            <div className="mb-8 flex items-center gap-4">
              {[
                { n: 1, label: "Business Info" },
                { n: 2, label: "Account Info" },
                { n: 3, label: "Verify Account" },
              ].map((step, index) => (
                <div key={step.n} className="flex flex-1 items-center gap-4 last:flex-none last:gap-0">
                  <div className="flex flex-col items-center">
                    <div className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${step.n === 1 ? "bg-green-500 text-white" : "bg-gray-100 text-gray-400"}`}>
                      {step.n}
                    </div>
                    <span className={`mt-1 text-[11px] font-medium ${step.n === 1 ? "text-gray-900" : "text-gray-400"}`}>{step.label}</span>
                  </div>
                  {index < 2 && <div className="mb-4 h-px flex-1 bg-gray-200" />}
                </div>
              ))}
            </div>

            {error ? <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div> : null}

            <form onSubmit={handleSubmit} className="space-y-6">
              <section>
                <h2 className="mb-4 text-base font-bold text-gray-900">Business Information</h2>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Field label="Business Name" required>
                    <input
                      required
                      value={businessName}
                      onChange={(event) => setBusinessName(event.target.value)}
                      placeholder="e.g. ABC Construction (Pty) Ltd"
                      className={inputClassName}
                    />
                  </Field>
                  <Field label="Business Registration Number" required>
                    <input
                      required
                      value={regNumber}
                      onChange={(event) => setRegNumber(event.target.value)}
                      placeholder="e.g. 2023/123456/07"
                      className={inputClassName}
                    />
                  </Field>
                  <Field label="Business Type" required>
                    <select
                      required
                      value={businessType}
                      onChange={(event) => setBusinessType(event.target.value)}
                      className={inputClassName}
                    >
                      <option value="">Select business type</option>
                      {BUSINESS_TYPES.map((type) => (
                        <option key={type} value={type}>
                          {type}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Industry" required>
                    <select required value={industry} onChange={(event) => setIndustry(event.target.value)} className={inputClassName}>
                      <option value="">Select industry</option>
                      {INDUSTRIES.map((item) => (
                        <option key={item} value={item}>
                          {item}
                        </option>
                      ))}
                    </select>
                  </Field>
                </div>

                <div className="mt-4">
                  <Field label="Business Address" required>
                    <input
                      required
                      value={address}
                      onChange={(event) => setAddress(event.target.value)}
                      placeholder="e.g. 123 Main Street, Johannesburg, 2000"
                      className={inputClassName}
                    />
                  </Field>
                </div>

                <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
                  <Field label="City" required>
                    <input required value={city} onChange={(event) => setCity(event.target.value)} placeholder="e.g. Johannesburg" className={inputClassName} />
                  </Field>
                  <Field label="State / Province" required>
                    <input required value={province} onChange={(event) => setProvince(event.target.value)} placeholder="e.g. Gauteng" className={inputClassName} />
                  </Field>
                  <Field label="Postal Code" required>
                    <input required value={postalCode} onChange={(event) => setPostalCode(event.target.value)} placeholder="e.g. 2000" className={inputClassName} />
                  </Field>
                </div>

                <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Field label="Phone Number" required>
                    <div className="flex">
                      <div className="flex items-center gap-1 rounded-l-lg border border-r-0 border-gray-200 bg-gray-50 px-2 text-sm text-gray-600">
                        🇿🇦 +27
                      </div>
                      <input
                        required
                        value={phone}
                        onChange={(event) => setPhone(event.target.value)}
                        placeholder="82 123 4567"
                        className={`${inputClassName} rounded-l-none`}
                      />
                    </div>
                  </Field>
                  <Field label="Email Address" required>
                    <input
                      required
                      type="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      placeholder="e.g. info@yourbusiness.co.za"
                      className={inputClassName}
                    />
                  </Field>
                </div>
              </section>

              <section>
                <h2 className="mb-4 text-base font-bold text-gray-900">Account Information</h2>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Field label="Full Name" required>
                    <input required value={fullName} onChange={(event) => setFullName(event.target.value)} placeholder="e.g. John Doe" className={inputClassName} />
                  </Field>
                  <Field label="Position / Role" required>
                    <input
                      required
                      value={position}
                      onChange={(event) => setPosition(event.target.value)}
                      placeholder="e.g. Owner / Director"
                      className={inputClassName}
                    />
                  </Field>
                  <Field label="Password" required>
                    <div className="relative">
                      <input
                        required
                        type={showPass ? "text" : "password"}
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        placeholder="Create a strong password"
                        className={`${inputClassName} pr-10`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPass((current) => !current)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 transition-colors hover:text-gray-600"
                        aria-label={showPass ? "Hide password" : "Show password"}
                      >
                        {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </Field>
                  <Field label="Confirm Password" required>
                    <div className="relative">
                      <input
                        required
                        type={showConfirm ? "text" : "password"}
                        value={confirmPassword}
                        onChange={(event) => setConfirmPassword(event.target.value)}
                        placeholder="Confirm your password"
                        className={`${inputClassName} pr-10`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirm((current) => !current)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 transition-colors hover:text-gray-600"
                        aria-label={showConfirm ? "Hide confirm password" : "Show confirm password"}
                      >
                        {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </Field>
                </div>

                <div className="mt-4">
                  <Field label="Account Type" required>
                    <select value={accountType} onChange={(event) => setAccountType(event.target.value as "sme" | "lender")} className={inputClassName}>
                      <option value="sme">SME</option>
                      <option value="lender">Lender</option>
                    </select>
                  </Field>
                </div>

                {password ? <PasswordStrength password={password} /> : null}
              </section>

              <div className="mt-5 flex items-start gap-2">
                <input
                  id="agree"
                  type="checkbox"
                  checked={agreed}
                  onChange={(event) => setAgreed(event.target.checked)}
                  className="mt-0.5 h-4 w-4 cursor-pointer accent-blue-600"
                />
                <label htmlFor="agree" className="cursor-pointer text-sm text-gray-600">
                  I agree to the <a href="#" className="font-medium text-blue-600 hover:underline">Terms of Service</a> and{' '}
                  <a href="#" className="font-medium text-blue-600 hover:underline">Privacy Policy</a>
                </label>
              </div>

              <div className="flex items-center justify-between gap-4">
                <Link to="/" className="rounded-lg border border-gray-200 px-6 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50">
                  Cancel
                </Link>
                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex items-center gap-2 rounded-lg bg-[#4F46E5] px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#4338CA] disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> Creating...
                    </>
                  ) : (
                    <>Continue →</>
                  )}
                </button>
              </div>

              <p className="text-center text-xs text-gray-400">Your login username will be derived from your email address: <span className="font-medium text-gray-600">{username}</span></p>
            </form>
          </div>

          <p className="mt-4 text-center text-xs text-gray-400">© 2024 SME Finance. All rights reserved.</p>
        </main>
      </div>
    </div>
  );
}

type FieldProps = {
  label: string;
  required?: boolean;
  children: React.ReactNode;
};

function Field({ label, required, children }: FieldProps) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-gray-700">
        {label} {required ? <span className="text-red-500">*</span> : null}
      </span>
      {children}
    </label>
  );
}

const inputClassName =
  "w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-700 placeholder:text-gray-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20";
