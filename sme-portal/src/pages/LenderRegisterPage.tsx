import { useEffect, useMemo, useRef, useState, type ClipboardEvent, type FormEvent, type KeyboardEvent, type ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useSnackbar } from "notistack";
import axios from "axios";
import type { LucideIcon } from "lucide-react";
import {
  BarChart2,
  CheckCircle,
  CheckCircle2,
  ChevronDown,
  Clock,
  Eye,
  EyeOff,
  FileText,
  Globe,
  HeadphonesIcon,
  Loader2,
  Lock,
  Mail,
  Menu,
  ShieldCheck,
  Target,
  TrendingUp,
  Upload,
  User,
  UserRound,
  Building2,
  Bell,
  X,
} from "lucide-react";
import { AuthApi } from "../api/authApi";
import { LenderApi } from "../api/lenderApi";
import { formatApiErrorDetail } from "../utils/formatApiError";
import { login as autoLogin } from "../utils/auth";

const COMPANY_TYPES = ["Private Company", "Public Company", "Close Corporation", "Sole Proprietor", "Partnership"];
const COUNTRIES = ["South Africa", "Botswana", "Zimbabwe", "Namibia"];
const INDUSTRIES = ["Construction", "Retail & Wholesale", "Manufacturing", "Logistics", "Technology", "Healthcare", "Agriculture", "Food & Beverage"];
const FUNDING_TENURES = ["30 - 90 Days", "30 - 60 Days", "60 - 120 Days", "90 - 180 Days"];
const PAYOUT_TIMES = ["Within 24 Hours", "Within 48 Hours", "2 - 3 Business Days", "Same Day"];
const APPROVAL_TIMES = ["1 - 2 Business Days", "Same Day", "2 - 3 Business Days", "3 - 5 Business Days"];
const CREDIT_SCORES = ["40 - Fair", "60 - Good", "70 - Very Good", "80 - Excellent"];
const RISK_LEVELS = ["Low Risk", "Medium Risk", "High Risk"];
const OTP_LENGTH = 6;

const INPUT_CLS = "w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400 transition-colors";
const SELECT_CLS = `${INPUT_CLS} bg-white`;

type FieldProps = { label: string; required?: boolean; children: ReactNode };
type PasswordStrengthProps = { password: string };
type StepperProps = { step: number };
type OtpCodeInputProps = { label: string; value: string; onChange: (value: string) => void; autoFocus?: boolean; disabled?: boolean };
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
            <CheckCircle2 className={`h-3.5 w-3.5 shrink-0 ${check.ok ? "text-violet-500" : "text-gray-300"}`} />
            <span className="text-[11px] text-gray-600">{check.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Stepper({ step }: StepperProps) {
  const steps = [
    { n: 1, label: "Account" },
    { n: 2, label: "Organization" },
    { n: 3, label: "Compliance" },
    { n: 4, label: "Funding" },
  ];

  return (
    <div className="mb-8 flex items-center gap-2">
      {steps.map((item, index) => (
        <div key={item.n} className="flex flex-1 items-center gap-2 last:flex-none last:gap-0">
          <div className="flex min-w-[72px] flex-col items-center">
            <div className={`flex h-9 w-9 items-center justify-center rounded-full border-2 text-sm font-bold transition-colors ${item.n <= step ? "border-violet-600 bg-violet-600 text-white" : "border-gray-200 bg-white text-gray-400"}`}>
              {item.n < step ? <CheckCircle2 className="h-5 w-5" /> : item.n}
            </div>
            <span className={`mt-1 text-center text-[11px] font-medium ${item.n <= step ? "text-gray-900" : "text-gray-400"}`}>{item.label}</span>
          </div>
          {index < steps.length - 1 ? <div className={`mb-4 h-0.5 flex-1 ${item.n < step ? "bg-violet-600" : "bg-gray-200"}`} /> : null}
        </div>
      ))}
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
            className="h-12 w-12 rounded-lg border border-gray-200 text-center text-base text-gray-800 focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-500/20 disabled:bg-gray-50"
          />
        ))}
      </div>
    </div>
  );
}

function Field({ label, required, children }: FieldProps) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold text-gray-700">{label} {required ? <span className="text-red-500">*</span> : null}</span>
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

export default function LenderRegisterPage() {
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const displayName = useMemo(() => sessionStorage.getItem("username") || sessionStorage.getItem("email") || "User", []);

  const [step, setStep] = useState(1);

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState(sessionStorage.getItem("email") || "");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [orgName, setOrgName] = useState("");
  const [registrationNumber, setRegistrationNumber] = useState("");
  const [financialLicenseNumber, setFinancialLicenseNumber] = useState("");
  const [companyType, setCompanyType] = useState("Private Company");
  const [country, setCountry] = useState("South Africa");
  const [headOfficeAddress, setHeadOfficeAddress] = useState("");
  const [primaryContact, setPrimaryContact] = useState("");

  const [emailOtp, setEmailOtp] = useState("");
  const [emailResendTimer, setEmailResendTimer] = useState(56);
  const [companyRegistration, setCompanyRegistration] = useState<File | null>(null);
  const [financialServicesLicense, setFinancialServicesLicense] = useState<File | null>(null);
  const [proofOfBanking, setProofOfBanking] = useState<File | null>(null);
  const [taxClearance, setTaxClearance] = useState<File | null>(null);

  const [totalFundingCapacity, setTotalFundingCapacity] = useState("R 50,000,000.00");
  const [minimumInvoiceAmount, setMinimumInvoiceAmount] = useState("R 10,000.00");
  const [maximumInvoiceAmount, setMaximumInvoiceAmount] = useState("R 5,000,000.00");
  const [typicalFundingTenure, setTypicalFundingTenure] = useState("30 - 90 Days");
  const [preferredPayoutTime, setPreferredPayoutTime] = useState("Within 24 Hours");
  const [averageApprovalTime, setAverageApprovalTime] = useState("1 - 2 Business Days");
  const [minimumCreditScore, setMinimumCreditScore] = useState("60 - Good");
  const [maximumRiskLevel, setMaximumRiskLevel] = useState("Medium Risk");
  const [preferredInvoiceAge, setPreferredInvoiceAge] = useState("0 - 90 Days");
  const [preferredRepaymentTerms, setPreferredRepaymentTerms] = useState("30 - 90 Days");
  const [industriesToFund, setIndustriesToFund] = useState<string[]>(["Construction", "Retail & Wholesale", "Manufacturing", "Logistics"]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const username = useMemo(() => buildUsername(email || orgName || fullName), [email, fullName, orgName]);

  useEffect(() => {
    if (step !== 3) return;
    const interval = window.setInterval(() => setEmailResendTimer((current) => (current > 0 ? current - 1 : 0)), 1000);
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

  const handleOrganizationNext = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const registerResponse = await AuthApi.register(username, password, email, "lender");
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
    // Require all compliance documents before completing verification
    if (!companyRegistration || !financialServicesLicense || !proofOfBanking || !taxClearance) {
      setLoading(false);
      setError("Please upload all required compliance documents before continuing.");
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

  const addIndustry = (industry: string) => {
    if (industry && !industriesToFund.includes(industry)) {
      setIndustriesToFund([...industriesToFund, industry]);
    }
  };

  const removeIndustry = (industry: string) => {
    setIndustriesToFund(industriesToFund.filter((item) => item !== industry));
  };

  const handleFundingSubmit = async () => {
    setError("");
    setLoading(true);

    try {
      await LenderApi.register({
        organization_name: orgName,
        contact_email: email,
        phone,
        max_lending_amount: Number(String(totalFundingCapacity).replace(/[^\d.-]/g, "")) || 0,
        min_credit_score: Number(String(minimumCreditScore).match(/\d+/)?.[0] ?? 0),
      });
      sessionStorage.removeItem("justRegisteredUserId");
      navigate("/lender/dashboard");
    } catch (requestError) {
      if (axios.isAxiosError(requestError)) {
        const detail = requestError.response?.data?.detail;
        setError(formatApiErrorDetail(detail) || requestError.message || "Failed to register lender");
      } else {
        setError("Failed to register lender");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-gray-50 font-inter">
      <div className="flex items-center justify-end gap-4 border-b border-gray-100 bg-white px-8 py-3">
        <Link to="/register" className="text-sm font-medium text-gray-500 transition-colors hover:text-gray-700">Change role</Link>
        <Link to="/login" className="text-sm font-medium text-gray-500 transition-colors hover:text-gray-700">Sign in</Link>
      </div>

      <div className="mx-auto flex w-full max-w-7xl flex-1 gap-6 px-4 py-6">
        <div className="relative hidden w-64 shrink-0 overflow-hidden rounded-2xl bg-gradient-to-b from-[#1f1236] to-[#120822] p-6 text-white lg:flex lg:flex-col">
          <div className="mb-7 flex items-center gap-2">
            <BarChart2 className="h-6 w-6 text-violet-400" />
            <div>
              <p className="text-sm font-bold leading-tight">SME FINANCE</p>
              <p className="text-[10px] font-medium text-violet-400">Funding partners</p>
            </div>
          </div>
          <h2 className="mb-3 text-xl font-extrabold leading-snug">Set up your lender account</h2>
          <p className="mb-7 text-xs leading-relaxed text-white/60">Complete account creation, organization verification, compliance, and funding preferences in one guided flow.</p>
          <div className="mb-6 w-full border-t border-white/10" />
          <div className="mb-8 space-y-5">
            <Feature icon={ShieldCheck} color="bg-violet-500/20 text-violet-400" title="Secure & Compliant" desc="Verification and compliance come first" />
            <Feature icon={TrendingUp} color="bg-cyan-500/20 text-cyan-400" title="Funding Ready" desc="Configure your preferred lending criteria" />
            <Feature icon={Target} color="bg-emerald-500/20 text-emerald-400" title="Match SMEs" desc="Review quality opportunities faster" />
          </div>
        </div>

        <div className="min-w-0 flex-1">
          <div className="rounded-2xl border border-gray-100 bg-white p-8 shadow-sm">
            <h1 className="mb-1 text-2xl font-bold text-gray-900">Lender Registration</h1>
            <p className="mb-6 text-sm text-gray-500">Follow the four-step lender onboarding flow.</p>

            <Stepper step={step} />
            {error ? <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600">{error}</div> : null}

            {step === 1 && (
              <form onSubmit={handleAccountNext}>
                <h2 className="mb-4 text-base font-bold text-gray-900">Account Information</h2>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Field label="Full Name" required><div className="relative"><User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" /><input required value={fullName} onChange={(event) => setFullName(event.target.value)} className={`${INPUT_CLS} pl-9`} /></div></Field>
                  <Field label="Phone Number" required><div className="flex"><span className="flex items-center whitespace-nowrap rounded-l-lg border border-r-0 border-gray-200 bg-gray-50 px-2.5 text-sm text-gray-600">🇿🇦 +27</span><input required value={phone} onChange={(event) => setPhone(event.target.value)} className="flex-1 rounded-r-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-500/20" /></div></Field>
                  <Field label="Email Address" required><div className="relative"><Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" /><input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} className={`${INPUT_CLS} pl-9`} /></div></Field>
                  <Field label="Password" required><div className="relative"><Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" /><input required type={showPass ? "text" : "password"} value={password} onChange={(event) => setPassword(event.target.value)} className={`${INPUT_CLS} pl-9 pr-10`} /><button type="button" onClick={() => setShowPass((current) => !current)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">{showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button></div></Field>
                  <Field label="Confirm Password" required><div className="relative"><Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" /><input required type={showConfirm ? "text" : "password"} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} className={`${INPUT_CLS} pl-9 pr-10`} /><button type="button" onClick={() => setShowConfirm((current) => !current)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">{showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button></div></Field>
                  {password ? <PasswordStrength password={password} /> : null}
                </div>
                <div className="mt-6 flex justify-end"><button type="submit" className="rounded-lg bg-violet-700 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-violet-800">Continue →</button></div>
              </form>
            )}

            {step === 2 && (
              <form onSubmit={handleOrganizationNext}>
                <h2 className="mb-4 text-base font-bold text-gray-900">Organization Information</h2>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div><label className="mb-1.5 block text-xs font-semibold text-gray-700">Organization Name <span className="text-red-500">*</span></label><input required value={orgName} onChange={(event) => setOrgName(event.target.value)} className={INPUT_CLS} /></div>
                  <div><label className="mb-1.5 block text-xs font-semibold text-gray-700">Registration Number <span className="text-red-500">*</span></label><input required value={registrationNumber} onChange={(event) => setRegistrationNumber(event.target.value)} className={INPUT_CLS} /></div>
                  <div><label className="mb-1.5 block text-xs font-semibold text-gray-700">Financial License Number <span className="text-red-500">*</span></label><input required value={financialLicenseNumber} onChange={(event) => setFinancialLicenseNumber(event.target.value)} className={INPUT_CLS} /></div>
                  <div><label className="mb-1.5 block text-xs font-semibold text-gray-700">Company Type <span className="text-red-500">*</span></label><select required value={companyType} onChange={(event) => setCompanyType(event.target.value)} className={SELECT_CLS}>{COMPANY_TYPES.map((item) => <option key={item}>{item}</option>)}</select></div>
                  <div><label className="mb-1.5 block text-xs font-semibold text-gray-700">Country of Operation <span className="text-red-500">*</span></label><select required value={country} onChange={(event) => setCountry(event.target.value)} className={SELECT_CLS}>{COUNTRIES.map((item) => <option key={item}>{item}</option>)}</select></div>
                  <div><label className="mb-1.5 block text-xs font-semibold text-gray-700">Head Office Address <span className="text-red-500">*</span></label><input required value={headOfficeAddress} onChange={(event) => setHeadOfficeAddress(event.target.value)} className={INPUT_CLS} /></div>
                </div>
                <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div><label className="mb-1.5 block text-xs font-semibold text-gray-700">Primary Contact Person <span className="text-red-500">*</span></label><div className="relative"><UserRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" /><input required value={primaryContact} onChange={(event) => setPrimaryContact(event.target.value)} className={`${INPUT_CLS} pl-9`} /></div></div>
                  <div><label className="mb-1.5 block text-xs font-semibold text-gray-700">Contact Email <span className="text-red-500">*</span></label><div className="relative"><Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" /><input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} className={`${INPUT_CLS} pl-9`} /></div></div>
                  <div><label className="mb-1.5 block text-xs font-semibold text-gray-700">Contact Phone Number <span className="text-red-500">*</span></label><div className="flex"><span className="flex items-center whitespace-nowrap rounded-l-lg border border-r-0 border-gray-200 bg-gray-50 px-2.5 text-sm text-gray-600">🇿🇦 +27</span><input required value={phone} onChange={(event) => setPhone(event.target.value)} className="flex-1 rounded-r-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-500/20" /></div></div>
                </div>
                <div className="mt-6 flex items-center justify-between"><button type="button" onClick={() => setStep(1)} className="rounded-lg border border-gray-200 px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50">← Back</button><button type="submit" disabled={loading} className="flex items-center gap-2 rounded-lg bg-violet-700 px-6 py-2.5 text-sm font-semibold text-white hover:bg-violet-800 disabled:opacity-50">{loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Creating...</> : <>Continue →</>}</button></div>
              </form>
            )}

            {step === 3 && (
              <div>
                <div className="mb-1 flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-violet-600" /><h2 className="text-base font-bold text-gray-900">Compliance Verification</h2></div>
                <p className="mb-6 text-sm text-gray-500">Verify your email and upload the documents needed to activate lender access.</p>
                <div className="mb-4 rounded-xl border border-gray-200 p-5">
                  <div className="mb-4 flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-violet-100"><Mail className="h-5 w-5 text-violet-600" /></div><div><p className="text-sm font-semibold text-gray-900">Verify Email Address</p><p className="mt-0.5 text-xs text-gray-500">We've sent a 6-digit verification code to:</p><p className="text-xs font-semibold text-violet-600">{email}</p></div></div>
                    <button type="button" onClick={handleResendEmail} disabled={emailResendTimer > 0} className="shrink-0 whitespace-nowrap rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60">Resend Code {emailResendTimer > 0 ? `(${emailResendTimer}s)` : ""}</button>
                  </div>
                  <OtpCodeInput label="Enter 6-digit code" value={emailOtp} onChange={setEmailOtp} autoFocus disabled={loading} />
                </div>

                <div className="mb-4 rounded-xl border border-gray-200 p-5">
                  <div className="mb-4 flex items-start gap-3"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-violet-100"><FileText className="h-5 w-5 text-violet-600" /></div><div><p className="text-sm font-semibold text-gray-900">Upload compliance documents</p><p className="mt-0.5 text-xs text-gray-500">These help confirm your organization and regulatory status.</p></div></div>
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                    {[
                      ["Company Registration", companyRegistration, setCompanyRegistration],
                      ["Financial Services License", financialServicesLicense, setFinancialServicesLicense],
                      ["Proof of Banking", proofOfBanking, setProofOfBanking],
                      ["Tax Clearance", taxClearance, setTaxClearance],
                    ].map(([label, file, setFile]) => (
                      <label key={label as string} className="group flex cursor-pointer flex-col items-center gap-2 rounded-xl border border-gray-200 p-4 transition-colors hover:border-violet-400 hover:bg-violet-50">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100 transition-colors group-hover:bg-violet-100"><Upload className="h-5 w-5 text-gray-400 transition-colors group-hover:text-violet-600" /></div>
                        <span className="text-center text-xs font-semibold text-violet-700">Upload File</span>
                        <p className="max-w-full truncate text-[9px] text-gray-500">{(file as File | null)?.name || `${label as string}`}</p>
                        <input type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={(event) => (setFile as (file: File | null) => void)(event.target.files?.[0] ?? null)} />
                      </label>
                    ))}
                  </div>
                </div>
                <div className="flex items-center justify-between"><button type="button" onClick={() => setStep(2)} className="rounded-lg border border-gray-200 px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50">← Back</button><button type="button" onClick={handleVerify} disabled={loading || emailOtp.length < OTP_LENGTH || !companyRegistration || !financialServicesLicense || !proofOfBanking || !taxClearance} className="flex items-center gap-2 rounded-lg bg-violet-700 px-6 py-2.5 text-sm font-semibold text-white hover:bg-violet-800 disabled:opacity-50">{loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Verifying...</> : <>Complete Verification</>}</button></div>
              </div>
            )}

            {step === 4 && (
              <div>
                <h2 className="mb-4 text-base font-bold text-gray-900">Funding Preferences</h2>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div><label className="mb-1.5 block text-xs font-semibold text-gray-700">Total Funding Capacity (ZAR) <span className="text-red-500">*</span></label><input value={totalFundingCapacity} onChange={(event) => setTotalFundingCapacity(event.target.value)} className={INPUT_CLS} /></div>
                  <div><label className="mb-1.5 block text-xs font-semibold text-gray-700">Minimum Invoice Amount <span className="text-red-500">*</span></label><input value={minimumInvoiceAmount} onChange={(event) => setMinimumInvoiceAmount(event.target.value)} className={INPUT_CLS} /></div>
                  <div><label className="mb-1.5 block text-xs font-semibold text-gray-700">Maximum Invoice Amount <span className="text-red-500">*</span></label><input value={maximumInvoiceAmount} onChange={(event) => setMaximumInvoiceAmount(event.target.value)} className={INPUT_CLS} /></div>
                </div>
                <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div><label className="mb-1.5 block text-xs font-semibold text-gray-700">Typical Funding Tenure <span className="text-red-500">*</span></label><select value={typicalFundingTenure} onChange={(event) => setTypicalFundingTenure(event.target.value)} className={SELECT_CLS}>{FUNDING_TENURES.map((item) => <option key={item}>{item}</option>)}</select></div>
                  <div><label className="mb-1.5 block text-xs font-semibold text-gray-700">Preferred Payout Time <span className="text-red-500">*</span></label><select value={preferredPayoutTime} onChange={(event) => setPreferredPayoutTime(event.target.value)} className={SELECT_CLS}>{PAYOUT_TIMES.map((item) => <option key={item}>{item}</option>)}</select></div>
                  <div><label className="mb-1.5 block text-xs font-semibold text-gray-700">Average Approval Time <span className="text-red-500">*</span></label><select value={averageApprovalTime} onChange={(event) => setAverageApprovalTime(event.target.value)} className={SELECT_CLS}>{APPROVAL_TIMES.map((item) => <option key={item}>{item}</option>)}</select></div>
                </div>
                <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div><label className="mb-1.5 block text-xs font-semibold text-gray-700">Minimum Credit Score Accepted <span className="text-red-500">*</span></label><select value={minimumCreditScore} onChange={(event) => setMinimumCreditScore(event.target.value)} className={SELECT_CLS}>{CREDIT_SCORES.map((item) => <option key={item}>{item}</option>)}</select></div>
                  <div><label className="mb-1.5 block text-xs font-semibold text-gray-700">Maximum Risk Level You Accept <span className="text-red-500">*</span></label><select value={maximumRiskLevel} onChange={(event) => setMaximumRiskLevel(event.target.value)} className={SELECT_CLS}>{RISK_LEVELS.map((item) => <option key={item}>{item}</option>)}</select></div>
                </div>
                <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div><label className="mb-1.5 block text-xs font-semibold text-gray-700">Preferred Invoice Age <span className="text-red-500">*</span></label><select value={preferredInvoiceAge} onChange={(event) => setPreferredInvoiceAge(event.target.value)} className={SELECT_CLS}><option>0 - 30 Days</option><option>0 - 60 Days</option><option>0 - 90 Days</option><option>0 - 120 Days</option></select></div>
                  <div><label className="mb-1.5 block text-xs font-semibold text-gray-700">Preferred Repayment Terms <span className="text-red-500">*</span></label><select value={preferredRepaymentTerms} onChange={(event) => setPreferredRepaymentTerms(event.target.value)} className={SELECT_CLS}><option>30 - 60 Days</option><option>30 - 90 Days</option><option>60 - 120 Days</option><option>90 - 180 Days</option></select></div>
                </div>
                <div className="mt-4 flex min-h-[42px] flex-wrap items-center gap-1.5 rounded-lg border border-gray-200 p-2">
                  {industriesToFund.map((industry) => (
                    <span key={industry} className="flex items-center gap-1 rounded bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700">
                      {industry}
                      <button type="button" onClick={() => removeIndustry(industry)}><X className="h-3 w-3 text-gray-400 hover:text-red-500" /></button>
                    </span>
                  ))}
                  <select className="min-w-[80px] flex-1 border-0 bg-transparent text-xs text-gray-400 outline-none" value="" onChange={(event) => addIndustry(event.target.value)}>
                    <option value="">+ Add industry</option>
                    {INDUSTRIES.filter((item) => !industriesToFund.includes(item)).map((item) => <option key={item} value={item}>{item}</option>)}
                  </select>
                </div>
                <div className="mt-6 flex items-center justify-between"><button type="button" onClick={() => setStep(3)} className="rounded-lg border border-gray-200 px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50">← Back</button><button type="button" onClick={handleFundingSubmit} disabled={loading} className="flex items-center gap-2 rounded-lg bg-violet-700 px-6 py-2.5 text-sm font-semibold text-white hover:bg-violet-800 disabled:opacity-50">{loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Completing...</> : <>Complete Setup & Continue</>}</button></div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}