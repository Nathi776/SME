import { useEffect, useMemo, useRef, useState, type ClipboardEvent, type FormEvent, type KeyboardEvent, type ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useSnackbar } from "notistack";
import axios from "axios";
import type { LucideIcon } from "lucide-react";
import {
  BarChart2,
  CheckCircle,
  CheckCircle2,
  FileText,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
  ShieldCheck,
  TrendingUp,
  Upload,
  User,
  Zap,
} from "lucide-react";
import { AuthApi } from "../api/authApi";
import { SMEApi } from "../api/smeApi";
import { formatApiErrorDetail } from "../utils/formatApiError";
import { login as autoLogin } from "../utils/auth";

const BUSINESS_TYPES = ["Sole Proprietor", "Partnership", "Private Company (Pty) Ltd", "Public Company", "Close Corporation", "NPO / NGO"];
const INDUSTRIES = ["Construction", "Retail", "Manufacturing", "Technology", "Healthcare", "Agriculture", "Transport & Logistics", "Food & Beverage", "Professional Services", "Other"];
const LANGUAGES = ["English", "Afrikaans", "Zulu", "Xhosa", "Sotho"];
const TIMEZONES = ["(GMT+02:00) Harare, Pretoria", "(GMT+00:00) London", "(GMT-05:00) New York", "(GMT+01:00) Paris"];
const FINANCING_TIMELINES = ["30 - 60 Days", "30 - 90 Days", "60 - 120 Days", "90 - 180 Days"];
const FUNDING_GOALS = ["Working Capital", "Inventory Purchase", "Equipment Upgrade", "Expansion", "Cash Flow Stability"];
const FUNDING_FREQUENCY = ["As Needed", "Monthly", "Quarterly"];
const ACCOUNT_TYPES = ["Business Current Account", "Savings Account", "Call Account"];
const OTP_LENGTH = 6;

const INPUT_CLS = "w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-400 transition-colors";
const SELECT_CLS = `${INPUT_CLS} bg-white`;

type FieldProps = { label: string; required?: boolean; children: ReactNode };
type PasswordStrengthProps = { password: string };
type StepperProps = { step: number };
type OtpCodeInputProps = { label: string; value: string; onChange: (value: string) => void; autoFocus?: boolean; disabled?: boolean };
type UploadCardProps = { title: string; subtitle: string; file: File | null; onChange: (file: File | null) => void };

type FeatureProps = { icon: LucideIcon; title: string; desc: string; color: string };

function PasswordStrength({ password }: PasswordStrengthProps) {
  const checks = [
    { label: "At least 8 characters", ok: password.length >= 8 },
    { label: "One uppercase letter", ok: /[A-Z]/.test(password) },
    { label: "One lowercase letter", ok: /[a-z]/.test(password) },
    { label: "One special character", ok: /[^A-Za-z0-9]/.test(password) },
    { label: "One number", ok: /[0-9]/.test(password) },
  ];

  return (
    <div className="mt-1 rounded-lg border border-gray-200 bg-gray-50 p-3 sm:col-span-2">
      <p className="mb-2 text-xs font-semibold text-gray-700">Password must contain:</p>
      <div className="grid grid-cols-1 gap-x-4 gap-y-1 sm:grid-cols-2 lg:grid-cols-3">
        {checks.map((check) => (
          <div key={check.label} className="flex items-center gap-1.5">
            <CheckCircle2 className={`h-3.5 w-3.5 shrink-0 ${check.ok ? "text-green-500" : "text-gray-300"}`} />
            <span className="text-[11px] text-gray-600">{check.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Stepper({ step }: StepperProps) {
  const steps = [
    { n: 1, label: "Account Information" },
    { n: 2, label: "Business Information" },
    { n: 3, label: "Verification & Compliance" },
    { n: 4, label: "Onboarding Setup" },
    { n: 5, label: "Dashboard Access" },
  ];

  return (
    <div className="mb-8 rounded-xl border border-green-100 bg-green-50/40 p-4">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-xs font-semibold text-green-800">Registration Progress</p>
        <p className="text-xs font-semibold text-green-700">Step {Math.min(step, 5)} of 5</p>
      </div>
      <div className="mb-4 h-2 overflow-hidden rounded-full bg-green-100">
        <div className="h-full rounded-full bg-green-600 transition-all" style={{ width: `${(Math.min(step, 5) / 5) * 100}%` }} />
      </div>
      <div className="flex items-center gap-2">
      {steps.map((item, index) => (
        <div key={item.n} className="flex flex-1 items-center gap-2 last:flex-none last:gap-0">
          <div className="flex min-w-[72px] flex-col items-center">
            <div className={`flex h-9 w-9 items-center justify-center rounded-full border-2 text-sm font-bold transition-colors ${item.n <= step ? "border-green-500 bg-green-500 text-white" : "border-gray-200 bg-white text-gray-400"}`}>
              {item.n < step ? <CheckCircle2 className="h-5 w-5" /> : item.n}
            </div>
            <span className={`mt-1 text-center text-[11px] font-medium ${item.n <= step ? "text-gray-900" : "text-gray-400"}`}>{item.label}</span>
          </div>
          {index < steps.length - 1 ? <div className={`mb-4 h-0.5 flex-1 ${item.n < step ? "bg-green-500" : "bg-gray-200"}`} /> : null}
        </div>
      ))}
      </div>
    </div>
  );
}

function OtpCodeInput({ label, value, onChange, autoFocus, disabled }: OtpCodeInputProps) {
  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);

  useEffect(() => {
    if (autoFocus) inputRefs.current[0]?.focus();
  }, [autoFocus]);

  const code = Array.from({ length: OTP_LENGTH }, (_, index) => value[index] ?? "");

  const updateCode = (index: number, rawValue: string) => {
    const digit = rawValue.replace(/\D/g, "").slice(-1);
    const nextCode = [...code];
    nextCode[index] = digit;
    onChange(nextCode.join(""));
    if (digit && index < OTP_LENGTH - 1) inputRefs.current[index + 1]?.focus();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>, index: number) => {
    if (event.key === "Backspace" && !code[index] && index > 0) inputRefs.current[index - 1]?.focus();
  };

  const handlePaste = (event: ClipboardEvent<HTMLInputElement>) => {
    event.preventDefault();
    const digits = event.clipboardData.getData("text").replace(/\D/g, "").slice(0, OTP_LENGTH);
    onChange(digits);
    inputRefs.current[Math.min(digits.length, OTP_LENGTH - 1)]?.focus();
  };

  return (
    <div>
      <p className="mb-2 text-xs font-semibold text-gray-700">{label}</p>
      <div className="flex gap-2">
        {code.map((digit, index) => (
          <input
            key={index}
            ref={(element) => {
              inputRefs.current[index] = element;
            }}
            value={digit}
            onChange={(event) => updateCode(index, event.target.value)}
            onKeyDown={(event) => handleKeyDown(event, index)}
            onPaste={index === 0 ? handlePaste : undefined}
            disabled={disabled}
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={1}
            className="h-12 w-12 rounded-lg border border-gray-200 text-center text-base text-gray-800 focus:border-green-400 focus:outline-none focus:ring-2 focus:ring-green-500/20 disabled:bg-gray-50"
          />
        ))}
      </div>
    </div>
  );
}

function Field({ label, required, children }: FieldProps) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold text-gray-700">
        {label} {required ? <span className="text-red-500">*</span> : null}
      </span>
      {children}
    </label>
  );
}

function buildUsername(source: string) {
  const fallback = source.trim().split("@")[0] || source;
  const normalized = fallback.toLowerCase().replace(/[^a-z0-9_]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 32);
  return normalized.length >= 3 ? normalized : `user_${Date.now().toString().slice(-6)}`;
}

function Feature({ icon: Icon, title, desc, color }: FeatureProps) {
  return (
    <div className="flex gap-3">
      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${color}`}>
        <Icon className="h-4 w-4" />
      </div>
      <div>
        <p className="text-sm font-semibold text-white">{title}</p>
        <p className="text-xs text-white/50">{desc}</p>
      </div>
    </div>
  );
}

export default function SmeRegisterPage() {
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const [step, setStep] = useState(1);

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [businessName, setBusinessName] = useState("");
  const [regNumber, setRegNumber] = useState("");
  const [businessType, setBusinessType] = useState("");
  const [industry, setIndustry] = useState("");
  const [yearsActive, setYearsActive] = useState<number | "">("");
  const [revenue, setRevenue] = useState<number | "">("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [province, setProvince] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [bizPhone, setBizPhone] = useState("");
  const [bizEmail, setBizEmail] = useState("");

  const [language, setLanguage] = useState("English");
  const [timezone, setTimezone] = useState("(GMT+02:00) Harare, Pretoria");
  const [notifyEmail, setNotifyEmail] = useState(true);
  const [notifySms, setNotifySms] = useState(false);
  const [notifyWhatsApp, setNotifyWhatsApp] = useState(false);

  const [bankName, setBankName] = useState("");
  const [accountHolder, setAccountHolder] = useState("");
  const [accountType, setAccountType] = useState("Business Current Account");
  const [accountNumber, setAccountNumber] = useState("");
  const [branchCode, setBranchCode] = useState("");

  const [financingTimeline, setFinancingTimeline] = useState("30 - 90 Days");
  const [fundingGoal, setFundingGoal] = useState("Working Capital");
  const [fundingFrequency, setFundingFrequency] = useState("As Needed");

  const [businessRegistrationDoc, setBusinessRegistrationDoc] = useState<File | null>(null);
  const [taxClearanceDoc, setTaxClearanceDoc] = useState<File | null>(null);
  const [proofOfBankingDoc, setProofOfBankingDoc] = useState<File | null>(null);

  const [emailOtp, setEmailOtp] = useState("");
  const [emailResendTimer, setEmailResendTimer] = useState(56);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const username = useMemo(() => buildUsername(email || businessName || fullName), [businessName, email, fullName]);

  useEffect(() => {
    if (step !== 3) return;
    const interval = window.setInterval(() => {
      setEmailResendTimer((current) => (current > 0 ? current - 1 : 0));
    }, 1000);
    return () => window.clearInterval(interval);
  }, [step]);

  const handleAccountNext = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    setStep(2);
  };

  const handleBusinessNext = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const registerResponse = await AuthApi.register(username, password, email, "sme");
      const userId = registerResponse.data?.id;
      if (userId) sessionStorage.setItem("justRegisteredUserId", String(userId));

      const identifier = userId ?? email;
      await AuthApi.sendVerification(identifier, ["email"]);
      enqueueSnackbar("Verification code sent. Check your email.", { variant: "success" });
      setEmailOtp("");
      setEmailResendTimer(56);
      setStep(3);
    } catch (requestError) {
      if (axios.isAxiosError(requestError)) {
        const detail = requestError.response?.data?.detail;
        setError(formatApiErrorDetail(detail) || requestError.message || "Failed to create account");
      } else {
        setError("Failed to create account");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    setError("");
    setLoading(true);

    if (!businessRegistrationDoc || !taxClearanceDoc || !proofOfBankingDoc) {
      setLoading(false);
      setError("Upload all required compliance documents before continuing.");
      return;
    }

    try {
      const stored = sessionStorage.getItem("justRegisteredUserId");
      const userIdentifier = stored ? Number(stored) : email;
      await AuthApi.verifyOtp(userIdentifier, "email", emailOtp);
      await autoLogin(username, password);
      sessionStorage.setItem("email", email.trim());
      sessionStorage.setItem("username", username);
      setStep(4);
    } catch (verifyError) {
      if (axios.isAxiosError(verifyError)) {
        const detail = verifyError.response?.data?.detail;
        setError(formatApiErrorDetail(detail) || verifyError.message || "Unable to verify account");
      } else if (verifyError instanceof Error) {
        setError(verifyError.message);
      } else {
        setError("Unable to verify account");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResendEmail = () => {
    if (!email) return setError("Enter an email address before resending the code.");
    (async () => {
      setError("");
      setEmailResendTimer(56);
      const stored = sessionStorage.getItem("justRegisteredUserId");
      const identifier = stored ? Number(stored) : email;
      try {
        await AuthApi.resendVerification(identifier, "email");
        enqueueSnackbar("Code sent. Check your email for the new code.", { variant: "success" });
      } catch {
        setError("Unable to resend email code");
      }
    })();
  };

  const handleSetup = async () => {
    setError("");
    setLoading(true);

    try {
      await SMEApi.create({
        name: businessName,
        industry,
        revenue: Number(revenue) || 0,
        years_active: Number(yearsActive) || 0,
      });
      sessionStorage.removeItem("justRegisteredUserId");
      setStep(5);
    } catch (requestError) {
      if (axios.isAxiosError(requestError)) {
        const detail = requestError.response?.data?.detail;
        setError(formatApiErrorDetail(detail) || requestError.message || "Failed to create SME profile");
      } else {
        setError("Failed to create SME profile");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-gray-50 font-inter">
      <div className="flex items-center justify-end gap-4 border-b border-gray-100 bg-white px-8 py-3">
        <Link to="/register" className="text-sm font-medium text-gray-500 transition-colors hover:text-gray-700">
          Change role
        </Link>
        <Link to="/login" className="text-sm font-medium text-gray-500 transition-colors hover:text-gray-700">
          Sign in
        </Link>
      </div>

      <div className="mx-auto flex w-full max-w-7xl flex-1 gap-6 px-4 py-6">
        <div className="relative hidden w-72 shrink-0 overflow-hidden rounded-2xl bg-gradient-to-b from-[#0a2518] via-[#0d3320] to-[#123d27] p-6 text-white lg:flex lg:flex-col">
          <div className="pointer-events-none absolute -left-12 -top-16 h-44 w-44 rounded-full bg-green-500/20 blur-2xl" />
          <div className="pointer-events-none absolute -bottom-20 -right-12 h-52 w-52 rounded-full bg-emerald-400/20 blur-2xl" />
          <div className="mb-7 flex items-center gap-2">
            <BarChart2 className="h-6 w-6 text-green-400" />
            <div>
              <p className="text-sm font-bold leading-tight">SME FINANCE</p>
              <p className="text-[10px] font-medium text-green-400">Grow Your Business</p>
            </div>
          </div>
          <h2 className="mb-3 text-xl font-extrabold leading-snug">Set up your SME account</h2>
          <p className="mb-7 text-xs leading-relaxed text-white/70">Complete account setup, compliance checks, and funding preferences in one clean flow.</p>
          <div className="mb-6 w-full border-t border-white/10" />
          <div className="mb-6 rounded-xl border border-white/10 bg-white/5 p-3">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-green-300">What you'll unlock</p>
            <ul className="mt-2 space-y-1.5 text-xs text-white/80">
              <li>Fast application decisions</li>
              <li>SME credit profile visibility</li>
              <li>Access to funding partners</li>
            </ul>
          </div>
          <div className="mb-8 space-y-5">
            <Feature icon={ShieldCheck} color="bg-green-500/20 text-green-400" title="Secure & Trusted" desc="Bank-level security for your business data" />
            <Feature icon={Zap} color="bg-yellow-500/20 text-yellow-400" title="Fast & Easy" desc="Get financing decisions in as little as 24 hours" />
            <Feature icon={TrendingUp} color="bg-blue-500/20 text-blue-400" title="Grow Your Business" desc="Access the capital you need to scale" />
          </div>
        </div>

        <div className="min-w-0 flex-1">
          <div className="rounded-2xl border border-gray-100 bg-white p-8 shadow-sm">
            <h1 className="mb-1 text-2xl font-bold text-gray-900">Create your SME account</h1>
            <p className="mb-6 text-sm text-gray-500">Complete the 5-step onboarding journey to activate your dashboard access.</p>

            <Stepper step={step} />
            {error ? <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600">{error}</div> : null}

            {step === 1 && (
              <form onSubmit={handleAccountNext}>
                <h2 className="mb-4 text-base font-bold text-gray-900">Account Information</h2>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Field label="Full Name" required>
                    <div className="relative">
                      <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                      <input required value={fullName} onChange={(event) => setFullName(event.target.value)} placeholder="John Doe" className={`${INPUT_CLS} pl-9`} />
                    </div>
                  </Field>
                  <Field label="Phone Number" required>
                    <div className="flex">
                      <span className="flex items-center gap-1 whitespace-nowrap rounded-l-lg border border-r-0 border-gray-200 bg-gray-50 px-2.5 text-sm text-gray-600">🇿🇦 +27</span>
                      <input required value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="82 123 4567" className="flex-1 rounded-r-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-green-400 focus:outline-none focus:ring-2 focus:ring-green-500/20" />
                    </div>
                  </Field>
                  <Field label="Email Address" required>
                    <div className="relative">
                      <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                      <input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="info@yourbusiness.co.za" className={`${INPUT_CLS} pl-9`} />
                    </div>
                  </Field>
                  <Field label="Password" required>
                    <div className="relative">
                      <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                      <input required type={showPass ? "text" : "password"} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="••••••••••" className={`${INPUT_CLS} pl-9 pr-10`} />
                      <button type="button" onClick={() => setShowPass((current) => !current)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">{showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button>
                    </div>
                  </Field>
                  <Field label="Confirm Password" required>
                    <div className="relative">
                      <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                      <input required type={showConfirm ? "text" : "password"} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} placeholder="••••••••••" className={`${INPUT_CLS} pl-9 pr-10`} />
                      <button type="button" onClick={() => setShowConfirm((current) => !current)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">{showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button>
                    </div>
                  </Field>
                  {password ? <PasswordStrength password={password} /> : null}
                </div>
                <div className="mt-6 flex justify-end">
                  <button type="submit" className="rounded-lg bg-green-700 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-green-800">Next: Business Information</button>
                </div>
              </form>
            )}

            {step === 2 && (
              <form onSubmit={handleBusinessNext}>
                <h2 className="mb-4 text-base font-bold text-gray-900">Business Information</h2>
                <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-gray-700">Business Name <span className="text-red-500">*</span></label>
                    <input required value={businessName} onChange={(event) => setBusinessName(event.target.value)} placeholder="e.g. ABC Construction (Pty) Ltd" className={INPUT_CLS} />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-gray-700">Registration Number <span className="text-red-500">*</span></label>
                    <input required value={regNumber} onChange={(event) => setRegNumber(event.target.value)} placeholder="e.g. 2023/123456/07" className={INPUT_CLS} />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-gray-700">Business Type <span className="text-red-500">*</span></label>
                    <select required value={businessType} onChange={(event) => setBusinessType(event.target.value)} className={SELECT_CLS}><option value="">Select business type</option>{BUSINESS_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}</select>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-gray-700">Industry <span className="text-red-500">*</span></label>
                    <select required value={industry} onChange={(event) => setIndustry(event.target.value)} className={SELECT_CLS}><option value="">Select industry</option>{INDUSTRIES.map((item) => <option key={item} value={item}>{item}</option>)}</select>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-gray-700">Years in Operation <span className="text-red-500">*</span></label>
                    <input required type="number" min={0} value={yearsActive} onChange={(event) => setYearsActive(event.target.value === "" ? "" : Number(event.target.value))} placeholder="e.g. 5" className={INPUT_CLS} />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-gray-700">Annual Revenue</label>
                    <input type="number" value={revenue} onChange={(event) => setRevenue(event.target.value === "" ? "" : Number(event.target.value))} placeholder="e.g. 250000" className={INPUT_CLS} />
                  </div>
                </div>
                <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-3">
                  <div><label className="mb-1.5 block text-xs font-semibold text-gray-700">City <span className="text-red-500">*</span></label><input required value={city} onChange={(event) => setCity(event.target.value)} className={INPUT_CLS} /></div>
                  <div><label className="mb-1.5 block text-xs font-semibold text-gray-700">Province <span className="text-red-500">*</span></label><input required value={province} onChange={(event) => setProvince(event.target.value)} className={INPUT_CLS} /></div>
                  <div><label className="mb-1.5 block text-xs font-semibold text-gray-700">Postal Code <span className="text-red-500">*</span></label><input required value={postalCode} onChange={(event) => setPostalCode(event.target.value)} className={INPUT_CLS} /></div>
                </div>
                <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div><label className="mb-1.5 block text-xs font-semibold text-gray-700">Business Phone <span className="text-red-500">*</span></label><div className="flex"><span className="flex items-center whitespace-nowrap rounded-l-lg border border-r-0 border-gray-200 bg-gray-50 px-2.5 text-sm text-gray-600">🇿🇦 +27</span><input required value={bizPhone} onChange={(event) => setBizPhone(event.target.value)} className="flex-1 rounded-r-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-green-400 focus:outline-none focus:ring-2 focus:ring-green-500/20" /></div></div>
                  <div><label className="mb-1.5 block text-xs font-semibold text-gray-700">Business Email <span className="text-red-500">*</span></label><input required type="email" value={bizEmail} onChange={(event) => setBizEmail(event.target.value)} className={INPUT_CLS} /></div>
                </div>
                <div className="mb-6 grid grid-cols-1 gap-4"><div><label className="mb-1.5 block text-xs font-semibold text-gray-700">Business Address <span className="text-red-500">*</span></label><input required value={address} onChange={(event) => setAddress(event.target.value)} className={INPUT_CLS} /></div></div>
                <div className="flex items-center justify-between">
                  <button type="button" onClick={() => setStep(1)} className="rounded-lg border border-gray-200 px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50">← Back</button>
                  <button type="submit" disabled={loading} className="flex items-center gap-2 rounded-lg bg-green-700 px-6 py-2.5 text-sm font-semibold text-white hover:bg-green-800 disabled:opacity-50">{loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Creating...</> : <>Next: Verification & Compliance</>}</button>
                </div>
              </form>
            )}

            {step === 3 && (
              <div>
                <div className="mb-1 flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-green-600" /><h2 className="text-base font-bold text-gray-900">Verification & Compliance</h2></div>
                <p className="mb-6 text-sm text-gray-500">Verify your email and upload your compliance documents to continue onboarding.</p>
                <div className="mb-4 rounded-xl border border-gray-200 p-5">
                  <div className="mb-4 flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-green-100"><Mail className="h-5 w-5 text-green-600" /></div><div><p className="text-sm font-semibold text-gray-900">Verify Email Address</p><p className="mt-0.5 text-xs text-gray-500">We've sent a 6-digit verification code to:</p><p className="text-xs font-semibold text-green-600">{email}</p></div></div>
                    <button type="button" onClick={handleResendEmail} disabled={emailResendTimer > 0} className="shrink-0 whitespace-nowrap rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60">Resend Code {emailResendTimer > 0 ? `(${emailResendTimer}s)` : ""}</button>
                  </div>
                  <OtpCodeInput label="Enter 6-digit code" value={emailOtp} onChange={setEmailOtp} autoFocus disabled={loading} />
                </div>

                <div className="mb-4 rounded-xl border border-gray-200 bg-gray-50 p-5">
                  <div className="mb-3 flex items-center gap-2">
                    <FileText className="h-4.5 w-4.5 text-green-600" />
                    <h3 className="text-sm font-semibold text-gray-900">Required Documents</h3>
                  </div>
                  <div className="space-y-3">
                    <UploadCard
                      title="Business Registration (CIPC)"
                      subtitle="Upload your CIPC registration certificate."
                      file={businessRegistrationDoc}
                      onChange={setBusinessRegistrationDoc}
                    />
                    <UploadCard
                      title="Tax Clearance Certificate"
                      subtitle="Upload your latest SARS tax clearance document."
                      file={taxClearanceDoc}
                      onChange={setTaxClearanceDoc}
                    />
                    <UploadCard
                      title="Proof of Banking (Bank Statement)"
                      subtitle="Upload a recent bank statement (up to 3 months old)."
                      file={proofOfBankingDoc}
                      onChange={setProofOfBankingDoc}
                    />
                  </div>
                </div>

                <div className="mb-4 rounded-xl border border-green-200 bg-green-50 px-4 py-3"><p className="text-sm font-semibold text-gray-900">Once verified and documents are uploaded, you'll continue to onboarding setup.</p></div>
                <div className="flex items-center justify-between"><button type="button" onClick={() => setStep(2)} className="rounded-lg border border-gray-200 px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50">← Back</button><button type="button" onClick={handleVerify} disabled={loading || emailOtp.length < OTP_LENGTH} className="flex items-center gap-2 rounded-lg bg-green-700 px-6 py-2.5 text-sm font-semibold text-white hover:bg-green-800 disabled:opacity-50">{loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Verifying...</> : <>Verify & Continue</>}</button></div>
              </div>
            )}

            {step === 4 && (
              <div>
                <h2 className="mb-4 text-base font-bold text-gray-900">Onboarding Setup</h2>

                <div className="mb-4 rounded-xl border border-gray-200 p-5">
                  <h3 className="mb-3 text-sm font-semibold text-gray-900">Banking Information</h3>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Field label="Bank Name" required>
                      <input required value={bankName} onChange={(event) => setBankName(event.target.value)} className={INPUT_CLS} placeholder="e.g. Standard Bank" />
                    </Field>
                    <Field label="Account Holder Name" required>
                      <input required value={accountHolder} onChange={(event) => setAccountHolder(event.target.value)} className={INPUT_CLS} placeholder="Registered business name" />
                    </Field>
                    <Field label="Account Type" required>
                      <select value={accountType} onChange={(event) => setAccountType(event.target.value)} className={SELECT_CLS}>{ACCOUNT_TYPES.map((item) => <option key={item} value={item}>{item}</option>)}</select>
                    </Field>
                    <Field label="Account Number" required>
                      <input required value={accountNumber} onChange={(event) => setAccountNumber(event.target.value)} className={INPUT_CLS} placeholder="0123456789" />
                    </Field>
                    <Field label="Branch Code" required>
                      <input required value={branchCode} onChange={(event) => setBranchCode(event.target.value)} className={INPUT_CLS} placeholder="051001" />
                    </Field>
                  </div>
                </div>

                <div className="mb-4 rounded-xl border border-gray-200 p-5">
                  <h3 className="mb-3 text-sm font-semibold text-gray-900">Notification Preferences</h3>
                  <div className="space-y-3">
                    <label className="flex items-center justify-between gap-4 rounded-lg border border-gray-100 px-3 py-2">
                      <span className="text-sm font-semibold text-gray-800">Email notifications</span>
                      <input type="checkbox" checked={notifyEmail} onChange={(event) => setNotifyEmail(event.target.checked)} />
                    </label>
                    <label className="flex items-center justify-between gap-4 rounded-lg border border-gray-100 px-3 py-2">
                      <span className="text-sm font-semibold text-gray-800">SMS notifications</span>
                      <input type="checkbox" checked={notifySms} onChange={(event) => setNotifySms(event.target.checked)} />
                    </label>
                    <label className="flex items-center justify-between gap-4 rounded-lg border border-gray-100 px-3 py-2">
                      <span className="text-sm font-semibold text-gray-800">WhatsApp notifications</span>
                      <input type="checkbox" checked={notifyWhatsApp} onChange={(event) => setNotifyWhatsApp(event.target.checked)} />
                    </label>
                  </div>
                </div>

                <div className="mb-4 rounded-xl border border-gray-200 p-5">
                  <h3 className="mb-3 text-sm font-semibold text-gray-900">Financing Preferences</h3>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <Field label="Preferred Funding Timeline" required>
                      <select value={financingTimeline} onChange={(event) => setFinancingTimeline(event.target.value)} className={SELECT_CLS}>{FINANCING_TIMELINES.map((item) => <option key={item} value={item}>{item}</option>)}</select>
                    </Field>
                    <Field label="Primary Funding Goal" required>
                      <select value={fundingGoal} onChange={(event) => setFundingGoal(event.target.value)} className={SELECT_CLS}>{FUNDING_GOALS.map((item) => <option key={item} value={item}>{item}</option>)}</select>
                    </Field>
                    <Field label="Funding Request Frequency" required>
                      <select value={fundingFrequency} onChange={(event) => setFundingFrequency(event.target.value)} className={SELECT_CLS}>{FUNDING_FREQUENCY.map((item) => <option key={item} value={item}>{item}</option>)}</select>
                    </Field>
                  </div>
                </div>

                <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Field label="Preferred Language"><select value={language} onChange={(event) => setLanguage(event.target.value)} className={SELECT_CLS}>{LANGUAGES.map((item) => <option key={item} value={item}>{item}</option>)}</select></Field>
                  <Field label="Time Zone"><select value={timezone} onChange={(event) => setTimezone(event.target.value)} className={SELECT_CLS}>{TIMEZONES.map((item) => <option key={item} value={item}>{item}</option>)}</select></Field>
                </div>
                <div className="mb-6 flex items-start gap-3 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3"><div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-green-100"><ShieldCheck className="h-5 w-5 text-green-600" /></div><div><p className="text-sm font-semibold text-gray-800">Your setup is almost complete</p><p className="mt-0.5 text-xs text-gray-500">We’ll take you to the dashboard after your SME profile is created.</p></div></div>
                <div className="flex items-center justify-between"><button type="button" onClick={() => setStep(3)} className="rounded-lg border border-gray-200 px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50">← Back</button><button type="button" onClick={handleSetup} disabled={loading} className="flex items-center gap-2 rounded-lg bg-green-700 px-6 py-2.5 text-sm font-semibold text-white hover:bg-green-800 disabled:opacity-50">{loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Completing...</> : <>Finish Setup</>}</button></div>
              </div>
            )}

            {step === 5 && (
              <div className="mx-auto max-w-2xl text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                  <CheckCircle className="h-9 w-9 text-green-600" />
                </div>
                <h2 className="text-2xl font-extrabold text-gray-900">Welcome to SME Finance</h2>
                <p className="mt-2 text-sm text-gray-500">Your onboarding is complete and your dashboard access is ready.</p>

                <div className="mt-6 rounded-xl border border-gray-200 bg-gray-50 p-5 text-left">
                  <h3 className="mb-3 text-sm font-semibold text-gray-900">What you can do now</h3>
                  <div className="space-y-2 text-sm text-gray-700">
                    <p>Track your SME credit profile and funding readiness.</p>
                    <p>Submit funding requests matched to your business goals.</p>
                    <p>Manage notifications and onboarding preferences anytime.</p>
                  </div>
                </div>

                <div className="mt-6 flex justify-center">
                  <button
                    type="button"
                    onClick={() => navigate("/dashboard")}
                    className="rounded-lg bg-green-700 px-7 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-green-800"
                  >
                    Go to Dashboard
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function UploadCard({ title, subtitle, file, onChange }: UploadCardProps) {
  return (
    <label className="group flex cursor-pointer items-start gap-3 rounded-xl border border-gray-200 bg-white p-4 transition-colors hover:border-green-400 hover:bg-green-50">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gray-100 transition-colors group-hover:bg-green-100">
        <FileText className="h-5 w-5 text-gray-400 transition-colors group-hover:text-green-600" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-gray-900">{title}</p>
        <p className="mt-0.5 text-xs text-gray-500">{subtitle}</p>
        <p className="mt-2 truncate text-xs font-medium text-green-700">{file?.name ?? "No file selected"}</p>
      </div>
      <div className="flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-gray-700">
        <Upload className="h-3.5 w-3.5" />
        Upload
      </div>
      <input
        type="file"
        accept=".pdf,.jpg,.jpeg,.png"
        className="hidden"
        onChange={(event) => onChange(event.target.files?.[0] ?? null)}
      />
    </label>
  );
}