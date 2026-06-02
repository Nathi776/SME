import { useEffect, useMemo, useRef, useState, type ClipboardEvent, type FormEvent, type KeyboardEvent, type ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useSnackbar } from "notistack";
import axios from "axios";
import type { LucideIcon } from "lucide-react";
import {
  BadgeCheck,
  BarChart2,
  CheckCircle,
  CheckCircle2,
  ChevronDown,
  Clock,
  Eye,
  EyeOff,
  Globe,
  Loader2,
  Lock,
  Mail,
  Phone,
  ShieldCheck,
  TrendingUp,
  User,
  Zap,
} from "lucide-react";
import { AuthApi } from "../api/authApi";
import { formatApiErrorDetail } from "../utils/formatApiError";
import { login as autoLogin } from "../utils/auth";

const BUSINESS_TYPES = ["Sole Proprietor", "Partnership", "Private Company (Pty) Ltd", "Public Company", "Close Corporation", "NPO / NGO"];
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
const LANGUAGES = ["English", "Afrikaans", "Zulu", "Xhosa", "Sotho"];
const TIMEZONES = ["(GMT+02:00) Harare, Pretoria", "(GMT+00:00) London", "(GMT-05:00) New York", "(GMT+01:00) Paris"];
const OTP_LENGTH = 6;

const INPUT_CLS = "w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-400 transition-colors";
const SELECT_CLS = `${INPUT_CLS} bg-white`;

type FieldProps = {
  label: string;
  required?: boolean;
  children: ReactNode;
};

type PasswordStrengthProps = {
  password: string;
};

type StepperProps = {
  step: number;
};

type LeftPanelFeature = {
  icon: LucideIcon;
  color: string;
  title: string;
  desc: string;
};

type OtpCodeInputProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  autoFocus?: boolean;
  disabled?: boolean;
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
    { n: 3, label: "Verification" },
    { n: 4, label: "Onboarding Setup" },
  ];

  return (
    <div className="mb-8 flex items-center gap-2">
      {steps.map((item, index) => (
        <div key={item.n} className="flex flex-1 items-center gap-2 last:flex-none last:gap-0">
          <div className="flex min-w-[72px] flex-col items-center">
            <div
              className={`flex h-9 w-9 items-center justify-center rounded-full border-2 text-sm font-bold transition-colors ${
                item.n <= step ? "border-green-500 bg-green-500 text-white" : "border-gray-200 bg-white text-gray-400"
              }`}
            >
              {item.n < step ? <CheckCircle2 className="h-5 w-5" /> : item.n}
            </div>
            <span className={`mt-1 text-[11px] font-medium text-center ${item.n <= step ? "text-gray-900" : "text-gray-400"}`}>{item.label}</span>
          </div>
          {index < steps.length - 1 ? <div className={`mb-4 h-0.5 flex-1 ${item.n < step ? "bg-green-500" : "bg-gray-200"}`} /> : null}
        </div>
      ))}
    </div>
  );
}

function LeftPanel() {
  const features: LeftPanelFeature[] = [
    { icon: ShieldCheck, color: "bg-green-500/20 text-green-400", title: "Secure & Trusted", desc: "Bank-level security for your business data" },
    { icon: Zap, color: "bg-yellow-500/20 text-yellow-400", title: "Fast & Easy", desc: "Get financing decisions in as little as 24 hours" },
    { icon: TrendingUp, color: "bg-blue-500/20 text-blue-400", title: "Grow Your Business", desc: "Access the capital you need to scale your operations" },
  ];

  return (
    <div className="relative hidden w-60 shrink-0 overflow-hidden rounded-2xl bg-gradient-to-b from-[#0a2518] to-[#0d3320] p-6 text-white lg:flex lg:flex-col">
      <div className="mb-7 flex items-center gap-2">
        <BarChart2 className="h-6 w-6 text-green-400" />
        <div>
          <p className="text-sm font-bold leading-tight">SME FINANCE</p>
          <p className="text-[10px] font-medium text-green-400">Grow Your Business</p>
        </div>
      </div>

      <h2 className="mb-3 text-xl font-extrabold leading-snug">Fuel Your Business Growth</h2>
      <p className="mb-7 text-xs leading-relaxed text-white/60">
        Join thousands of SMEs using our platform to access financing, manage invoices, and grow their businesses.
      </p>

      <div className="mb-6 w-full border-t border-white/10" />

      <div className="mb-8 space-y-5">
        {features.map((feature) => (
          <div key={feature.title} className="flex gap-3">
            <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${feature.color}`}>
              <feature.icon className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-semibold">{feature.title}</p>
              <p className="text-xs text-white/50">{feature.desc}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-1 items-end">
        <div className="relative h-36 w-full">
          <div className="absolute right-0 bottom-0 w-24 rounded-xl border border-white/20 bg-white/10 p-2">
            <div className="mx-auto mb-1 h-5 w-5 rounded-full bg-green-500/40" />
            <div className="space-y-1">
              <div className="h-1.5 w-full rounded bg-white/20" />
              <div className="h-1.5 w-3/4 rounded bg-white/10" />
              <div className="h-1.5 w-1/2 rounded bg-green-400/30" />
            </div>
            <div className="mt-2 flex gap-1">
              <div className="h-6 flex-1 rounded bg-green-500/20" />
              <div className="h-6 w-6 rounded bg-white/10" />
            </div>
          </div>

          <div className="absolute left-2 bottom-4 w-20 rounded-xl border border-white/20 bg-white/10 p-2">
            <div className="relative mb-1 h-10 overflow-hidden rounded bg-gradient-to-t from-green-500/20 to-transparent">
              <svg className="absolute inset-0 h-full w-full" viewBox="0 0 60 30" aria-hidden="true">
                <path d="M0,25 C10,20 20,10 30,8 C40,6 50,12 60,5" fill="none" stroke="#22C55E" strokeWidth="1.5" />
              </svg>
            </div>
            <div className="h-1.5 w-full rounded bg-white/20" />
          </div>

          <div className="absolute right-6 top-0 flex h-8 w-8 items-center justify-center rounded-full bg-green-500 shadow-lg">
            <CheckCircle className="h-5 w-5 text-white" />
          </div>

          <div className="absolute left-0 bottom-0 flex h-8 w-8 items-center justify-center rounded-full border border-green-700/40 bg-[#0d3320]">
            <Lock className="h-4 w-4 text-green-400" />
          </div>
        </div>
      </div>

      <div className="mt-5 border-t border-white/10 pt-5">
        <p className="mb-1 text-xs text-white/50">Already have an account?</p>
        <Link to="/login" className="text-sm font-medium text-green-400 hover:text-green-300">
          Sign in to your account →
        </Link>
      </div>
    </div>
  );
}

function OtpCodeInput({ label, value, onChange, autoFocus, disabled }: OtpCodeInputProps) {
  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);

  useEffect(() => {
    if (autoFocus) {
      inputRefs.current[0]?.focus();
    }
  }, [autoFocus]);

  const code = Array.from({ length: OTP_LENGTH }, (_, index) => value[index] ?? "");

  const updateCode = (index: number, rawValue: string) => {
    const digit = rawValue.replace(/\D/g, "").slice(-1);
    const nextCode = [...code];
    nextCode[index] = digit;
    onChange(nextCode.join("").replace(/\s/g, ""));

    if (digit && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>, index: number) => {
    if (event.key === "Backspace" && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
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
  const normalized = fallback
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 32);

  return normalized.length >= 3 ? normalized : `user_${Date.now().toString().slice(-6)}`;
}

export default function RegisterPage() {
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();

  const [step, setStep] = useState(1);

  const [businessName, setBusinessName] = useState("");
  const [regNumber, setRegNumber] = useState("");
  const [businessType, setBusinessType] = useState("");
  const [industry, setIndustry] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [province, setProvince] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [bizPhone, setBizPhone] = useState("");
  const [bizEmail, setBizEmail] = useState("");

  const [fullName, setFullName] = useState("");
  const [position, setPosition] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [accountType, setAccountType] = useState<"sme" | "lender">("sme");
  const [language, setLanguage] = useState("English");
  const [timezone, setTimezone] = useState("(GMT+02:00) Harare, Pretoria");
  const [twoFa, setTwoFa] = useState(true);
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [emailOtp, setEmailOtp] = useState("");
  const [phoneOtp, setPhoneOtp] = useState("");
  const [emailResendTimer, setEmailResendTimer] = useState(56);
  const [phoneResendTimer, setPhoneResendTimer] = useState(56);

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const username = useMemo(() => buildUsername(email || businessName || fullName), [businessName, email, fullName]);

  useEffect(() => {
    if (step !== 3) {
      return;
    }

    const interval = window.setInterval(() => {
      setEmailResendTimer((current) => (current > 0 ? current - 1 : 0));
      setPhoneResendTimer((current) => (current > 0 ? current - 1 : 0));
    }, 1000);

    return () => window.clearInterval(interval);
  }, [step]);

  const handleStep1 = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setStep(2);
  };

  const handleStep2 = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);

    try {
      const registerResponse = await AuthApi.register(username, password, email, accountType);
      const userId = registerResponse.data?.id;

      if (userId) {
        sessionStorage.setItem("justRegisteredUserId", String(userId));
      }

      // Request the email verification code from the server.
      try {
        const identifier = registerResponse.data?.id ?? email;
        await AuthApi.sendVerification(identifier, ["email"]);
        enqueueSnackbar("Verification code sent. Check your email.", { variant: "success" });
      } catch (sendErr) {
        if (axios.isAxiosError(sendErr)) {
          const detail = sendErr.response?.data?.detail;
          setError(formatApiErrorDetail(detail) || sendErr.message || "Could not send verification email");
        } else {
          setError("Could not send verification email");
        }
        return;
      }

      setEmailOtp("");
      setPhoneOtp("");
      setEmailResendTimer(56);
      setPhoneResendTimer(56);
      setStep(3);
    } catch (registerError) {
      if (axios.isAxiosError(registerError)) {
        const detail = registerError.response?.data?.detail;
        setError(formatApiErrorDetail(detail) || registerError.message || "Registration failed");
      } else {
        setError("Registration failed");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    setError("");
    setLoading(true);

    try {
      // Verify the email code with the server before completing registration
      const stored = sessionStorage.getItem("justRegisteredUserId");
      const userIdentifierForEmail: number | string = stored ? Number(stored) : email;

      try {
        await AuthApi.verifyOtp(userIdentifierForEmail, "email", emailOtp);
      } catch (vErr) {
        throw new Error("Email verification failed");
      }

      // After successful verification, attempt automatic login
      await autoLogin(username, password);
      sessionStorage.setItem("email", email.trim());
      sessionStorage.setItem("username", username);

      // Advance to onboarding setup step (step 4) — user will proceed to the relevant setup page
      setStep(4);
    } catch (verifyError) {
      if (axios.isAxiosError(verifyError)) {
        const detail = verifyError.response?.data?.detail;
        setError(formatApiErrorDetail(detail) || verifyError.message || "Unable to complete registration");
      } else if (verifyError instanceof Error) {
        setError(verifyError.message);
      } else {
        setError("Unable to complete registration");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResendEmail = () => {
    if (!email) {
      setError("Enter an email address before resending the code.");
      return;
    }

    (async () => {
      setError("");
      setEmailResendTimer(56);
      const stored = sessionStorage.getItem("justRegisteredUserId");
      const identifier = stored ? Number(stored) : email;

      try {
        await AuthApi.resendVerification(identifier, "email");
        enqueueSnackbar("Code sent. Check your email for the new code.", { variant: "success" });
      } catch (err) {
        setError("Unable to resend email code");
      }
    })();
  };

  const handleResendPhone = () => {
    enqueueSnackbar("SMS verification will be added after email verification is live.", { variant: "info" });
  };

  return (
    <div className="flex min-h-screen flex-col bg-gray-50 font-inter">
      <div className="flex items-center justify-end gap-4 border-b border-gray-100 bg-white px-8 py-3">
        <button type="button" className="flex items-center gap-1.5 text-sm text-gray-500 transition-colors hover:text-gray-700">
          <span className="flex h-4 w-4 items-center justify-center rounded-full border border-gray-300 text-[10px] font-bold">?</span>
          Need help?
        </button>
        <button type="button" className="flex items-center gap-1 text-sm text-gray-500 transition-colors hover:text-gray-700">
          <span aria-hidden="true">🌐</span>
          English <ChevronDown className="h-4 w-4" />
        </button>
      </div>

      <div className="mx-auto flex w-full max-w-5xl flex-1 gap-6 px-4 py-6">
        <LeftPanel />

        <div className="min-w-0 flex-1">
          <div className="rounded-2xl border border-gray-100 bg-white p-8 shadow-sm">
            <h1 className="mb-1 text-2xl font-bold text-gray-900">Create Your Account</h1>
            <p className="mb-6 text-sm text-gray-500">Join SME Finance and start your journey today</p>

            <Stepper step={step} />

            {error ? <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600">{error}</div> : null}

            {step === 2 && (
              <form onSubmit={handleStep1}>
                <h2 className="mb-4 text-base font-bold text-gray-900">Business Information</h2>
                <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-gray-700">
                      Business Name <span className="text-red-500">*</span>
                    </label>
                    <input required value={businessName} onChange={(event) => setBusinessName(event.target.value)} placeholder="e.g. ABC Construction (Pty) Ltd" className={INPUT_CLS} />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-gray-700">
                      Registration Number <span className="text-red-500">*</span>
                    </label>
                    <input required value={regNumber} onChange={(event) => setRegNumber(event.target.value)} placeholder="e.g. 2023/123456/07" className={INPUT_CLS} />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-gray-700">
                      Business Type <span className="text-red-500">*</span>
                    </label>
                    <select required value={businessType} onChange={(event) => setBusinessType(event.target.value)} className={SELECT_CLS}>
                      <option value="">Select business type</option>
                      {BUSINESS_TYPES.map((type) => (
                        <option key={type} value={type}>
                          {type}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-gray-700">
                      Industry <span className="text-red-500">*</span>
                    </label>
                    <select required value={industry} onChange={(event) => setIndustry(event.target.value)} className={SELECT_CLS}>
                      <option value="">Select industry</option>
                      {INDUSTRIES.map((item) => (
                        <option key={item} value={item}>
                          {item}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="mb-4">
                  <label className="mb-1.5 block text-xs font-semibold text-gray-700">
                    Business Address <span className="text-red-500">*</span>
                  </label>
                  <input required value={address} onChange={(event) => setAddress(event.target.value)} placeholder="e.g. 123 Main Street" className={INPUT_CLS} />
                </div>

                <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-3">
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-gray-700">
                      City <span className="text-red-500">*</span>
                    </label>
                    <input required value={city} onChange={(event) => setCity(event.target.value)} placeholder="Johannesburg" className={INPUT_CLS} />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-gray-700">
                      Province <span className="text-red-500">*</span>
                    </label>
                    <input required value={province} onChange={(event) => setProvince(event.target.value)} placeholder="Gauteng" className={INPUT_CLS} />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-gray-700">
                      Postal Code <span className="text-red-500">*</span>
                    </label>
                    <input required value={postalCode} onChange={(event) => setPostalCode(event.target.value)} placeholder="2000" className={INPUT_CLS} />
                  </div>
                </div>

                <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-gray-700">
                      Business Phone <span className="text-red-500">*</span>
                    </label>
                    <div className="flex">
                      <span className="flex items-center gap-1 whitespace-nowrap rounded-l-lg border border-r-0 border-gray-200 bg-gray-50 px-2.5 text-sm text-gray-600">🇿🇦 +27</span>
                      <input
                        required
                        value={bizPhone}
                        onChange={(event) => setBizPhone(event.target.value)}
                        placeholder="82 123 4567"
                        className="flex-1 rounded-r-lg border border-gray-200 px-3 py-2.5 text-sm transition-colors focus:border-green-400 focus:outline-none focus:ring-2 focus:ring-green-500/20"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-gray-700">
                      Business Email <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                      <input required type="email" value={bizEmail} onChange={(event) => setBizEmail(event.target.value)} placeholder="info@yourbusiness.co.za" className={`${INPUT_CLS} pl-9`} />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end">
                  <button type="submit" className="rounded-lg bg-green-700 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-green-800">
                    Continue →
                  </button>
                </div>
              </form>
            )}

            {step === 1 && (
              <form onSubmit={handleStep2}>
                <h2 className="mb-4 text-base font-bold text-gray-900">Account Information</h2>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Field label="Full Name" required>
                    <div className="relative">
                      <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                      <input required value={fullName} onChange={(event) => setFullName(event.target.value)} placeholder="John Doe" className={`${INPUT_CLS} pl-9`} />
                    </div>
                  </Field>

                  <Field label="Position / Role" required>
                    <div className="relative">
                      <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                      <input required value={position} onChange={(event) => setPosition(event.target.value)} placeholder="Owner / Director" className={`${INPUT_CLS} pl-9`} />
                    </div>
                  </Field>

                  <Field label="Phone Number" required>
                    <div className="flex">
                      <span className="flex items-center gap-1 whitespace-nowrap rounded-l-lg border border-r-0 border-gray-200 bg-gray-50 px-2.5 text-sm text-gray-600">🇿🇦 +27</span>
                      <input
                        required
                        value={phone}
                        onChange={(event) => setPhone(event.target.value)}
                        placeholder="82 123 4567"
                        className="flex-1 rounded-r-lg border border-gray-200 px-3 py-2.5 text-sm transition-colors focus:border-green-400 focus:outline-none focus:ring-2 focus:ring-green-500/20"
                      />
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
                      <input
                        required
                        type={showPass ? "text" : "password"}
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        placeholder="••••••••••"
                        className={`${INPUT_CLS} pl-9 pr-10`}
                      />
                      <button type="button" onClick={() => setShowPass((current) => !current)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                        {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </Field>

                  <Field label="Confirm Password" required>
                    <div className="relative">
                      <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                      <input
                        required
                        type={showConfirm ? "text" : "password"}
                        value={confirmPassword}
                        onChange={(event) => setConfirmPassword(event.target.value)}
                        placeholder="••••••••••"
                        className={`${INPUT_CLS} pl-9 pr-10`}
                      />
                      <button type="button" onClick={() => setShowConfirm((current) => !current)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                        {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </Field>

                  {password ? <PasswordStrength password={password} /> : null}
                </div>

                <h2 className="mb-4 mt-6 text-base font-bold text-gray-900">Security &amp; Preferences</h2>
                <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Field label="Preferred Language">
                    <div className="relative">
                      <Globe className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                      <select value={language} onChange={(event) => setLanguage(event.target.value)} className={`${SELECT_CLS} pl-9`}>
                        {LANGUAGES.map((item) => (
                          <option key={item} value={item}>
                            {item}
                          </option>
                        ))}
                      </select>
                    </div>
                  </Field>

                  <Field label="Time Zone">
                    <div className="relative">
                      <Clock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                      <select value={timezone} onChange={(event) => setTimezone(event.target.value)} className={`${SELECT_CLS} pl-9`}>
                        {TIMEZONES.map((item) => (
                          <option key={item} value={item}>
                            {item}
                          </option>
                        ))}
                      </select>
                    </div>
                  </Field>
                </div>

                <div className="mb-4 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold text-gray-800">
                        Two-Factor Authentication <span className="font-normal text-gray-400">(Recommended)</span>
                      </p>
                      <p className="mt-0.5 text-xs text-gray-500">Add an extra layer of security to protect your account.</p>
                    </div>
                    <button type="button" onClick={() => setTwoFa((current) => !current)} className={`relative h-6 w-11 rounded-full transition-colors ${twoFa ? "bg-green-500" : "bg-gray-300"}`}>
                      <span className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${twoFa ? "translate-x-5" : ""}`} />
                    </button>
                  </div>
                </div>

                <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Field label="Registration Type">
                    <select value={accountType} onChange={(event) => setAccountType(event.target.value as "sme" | "lender")} className={SELECT_CLS}>
                      <option value="sme">SME</option>
                      <option value="lender">Lender</option>
                    </select>
                  </Field>
                </div>

                <div className="mb-6 flex items-start gap-3 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-green-100">
                    <ShieldCheck className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-800">Your security is important to us</p>
                    <p className="mt-0.5 text-xs text-gray-500">We use industry-standard encryption to keep your information safe and secure.</p>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <button type="button" onClick={() => setStep(2)} className="flex items-center gap-2 rounded-lg border border-gray-200 px-5 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50">
                    ← Back
                  </button>
                  <button type="submit" disabled={loading} className="flex items-center gap-2 rounded-lg bg-green-700 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-green-800 disabled:opacity-50">
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" /> Creating...
                      </>
                    ) : (
                      <>Continue →</>
                    )}
                  </button>
                </div>
              </form>
            )}

            {step === 4 && (
              <div>
                <h2 className="mb-4 text-base font-bold text-gray-900">Onboarding Setup</h2>
                <p className="mb-4 text-sm text-gray-500">Your account is active. Finish setting up your organization details and preferences.</p>

                <div className="mb-4 rounded-lg border border-gray-200 bg-gray-50 p-4">
                  <p className="mb-2 text-sm font-semibold text-gray-800">Account</p>
                  <div className="text-xs text-gray-600">{fullName} — {email}</div>
                </div>

                <div className="mb-4 flex justify-between">
                  <button type="button" onClick={() => setStep(3)} className="flex items-center gap-2 rounded-lg border border-gray-200 px-5 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50">
                    ← Back
                  </button>
                  <button type="button" onClick={() => navigate(accountType === "lender" ? "/register/lender" : "/register/sme")} className="flex items-center gap-2 rounded-lg bg-green-700 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-green-800">
                    Continue to Setup →
                  </button>
                </div>
              </div>
            )}

            {step === 3 && (
              <div>
                <div className="mb-1 flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-green-600" />
                  <h2 className="text-base font-bold text-gray-900">Verify Your Account</h2>
                </div>
                <p className="mb-6 text-sm text-gray-500">Please verify your email address and phone number to activate your account.</p>

                <div className="mb-4 rounded-xl border border-gray-200 p-5">
                  <div className="mb-4 flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-green-100">
                        <Mail className="h-5 w-5 text-green-600" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-900">Verify Email Address</p>
                        <p className="mt-0.5 text-xs text-gray-500">We've sent a 6-digit verification code to:</p>
                        <p className="text-xs font-semibold text-green-600">{email || "info@yourbusiness.co.za"}</p>
                      </div>
                    </div>
                    <button type="button" onClick={handleResendEmail} disabled={emailResendTimer > 0} className="shrink-0 whitespace-nowrap rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-60">
                      Resend Code {emailResendTimer > 0 ? `(${emailResendTimer}s)` : ""}
                    </button>
                  </div>
                  <OtpCodeInput label="Enter 6-digit code" value={emailOtp} onChange={setEmailOtp} autoFocus disabled={loading} />
                </div>

                <div className="mb-4 rounded-xl border border-gray-200 p-5">
                  <div className="mb-4 flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-green-100">
                        <Phone className="h-5 w-5 text-green-600" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-900">SMS Verification <span className="font-normal text-gray-400">(Coming Soon)</span></p>
                        <p className="mt-0.5 text-xs text-gray-500">Email verification is active now. SMS will be added next.</p>
                        <p className="text-xs font-semibold text-green-600">+27 {phone || "82 123 4567"}</p>
                      </div>
                    </div>
                    <button type="button" onClick={handleResendPhone} disabled className="shrink-0 whitespace-nowrap rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-400 opacity-60">
                      Coming Soon
                    </button>
                  </div>
                  <OtpCodeInput label="SMS code placeholder" value={phoneOtp} onChange={setPhoneOtp} disabled />
                </div>

                <div className="mb-4 rounded-xl border border-gray-200 p-5">
                  <div className="mb-4 flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-green-100">
                      <BadgeCheck className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">
                        Identity Verification <span className="font-normal text-gray-500">(Optional but Recommended)</span>
                      </p>
                      <p className="mt-0.5 text-xs text-gray-500">Verify your identity to increase your credit limit and build trust with lenders.</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-4">
                    <button type="button" className="rounded-lg border border-green-600 px-4 py-2 text-sm font-medium text-green-700 transition-colors hover:bg-green-50">
                      Verify Identity Now
                    </button>
                    <div className="space-y-1">
                      {["Upload ID document", "Take a selfie", "Get verified in minutes"].map((item) => (
                        <div key={item} className="flex items-center gap-1.5">
                          <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                          <span className="text-xs text-gray-600">{item}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="mb-6 flex items-center gap-3 rounded-xl border border-green-200 bg-green-50 px-4 py-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-green-500">
                    <CheckCircle className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">Once verified, you'll be able to access all platform features</p>
                    <p className="text-xs text-gray-500">Your information is secure and encrypted.</p>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <button type="button" onClick={() => setStep(2)} className="flex items-center gap-2 rounded-lg border border-gray-200 px-5 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50">
                    ← Back
                  </button>
                  <button
                    type="button"
                    onClick={handleVerify}
                    disabled={loading || emailOtp.length < OTP_LENGTH}
                    className="flex items-center gap-2 rounded-lg bg-green-700 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-green-800 disabled:opacity-50"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" /> Verifying...
                      </>
                    ) : (
                      <>
                        <Lock className="h-4 w-4" /> Complete Registration
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>

          <p className="mt-4 text-center text-xs text-gray-400">© 2024 SME Finance. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
}