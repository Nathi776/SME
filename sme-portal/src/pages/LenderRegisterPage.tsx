import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  BarChart2,
  CheckCircle,
  ChevronDown,
  ExternalLink,
  FileText,
  HelpCircle,
  Info,
  Menu,
  ShieldCheck,
  Upload,
  User,
  Mail,
  X,
  Target,
  ShieldAlert,
  HeadphonesIcon,
  Bell,
} from "lucide-react";
import { formatApiErrorDetail } from "../utils/formatApiError";
import { LenderApi } from "../api/lenderApi";

type StepStatus = "completed" | "in_progress" | "pending";

type StepItem = {
  n: number;
  label: string;
  status: StepStatus;
};

type OrganizationForm = {
  lenderName: string;
  registrationNumber: string;
  financialLicenseNumber: string;
  companyType: string;
  countryOfOperation: string;
  headOfficeAddress: string;
  primaryContact: string;
  contactEmail: string;
  contactPhone: string;
};

type FundingForm = {
  totalFundingCapacity: string;
  minimumInvoiceAmount: string;
  maximumInvoiceAmount: string;
  typicalFundingTenure: string;
  preferredPayoutTime: string;
  averageApprovalTime: string;
};

type RiskForm = {
  industriesToFund: string[];
  minimumCreditScore: string;
  maximumRiskLevel: string;
  preferredInvoiceAge: string;
  preferredRepaymentTerms: string;
};

type DocsForm = {
  companyRegistration: File | null;
  financialServicesLicense: File | null;
  proofOfBanking: File | null;
  taxClearance: File | null;
};

type AgreementsForm = {
  confirmAccuracy: boolean;
  agreeTerms: boolean;
};

type SectionProps = {
  title: string;
  number: number;
  subtitle?: string;
  children: React.ReactNode;
};

type SimpleUploadBoxProps = {
  label: string;
  subtitle?: string;
  file: File | null;
  onUpload: (file: File | null) => void;
};

const STEPS: StepItem[] = [
  { n: 1, label: "Business Info", status: "completed" },
  { n: 2, label: "Account Info", status: "completed" },
  { n: 3, label: "Verify Account", status: "completed" },
  { n: 4, label: "Lender Setup", status: "in_progress" },
  { n: 5, label: "Dashboard Access", status: "pending" },
];

const INDUSTRIES = ["Construction", "Retail & Wholesale", "Manufacturing", "Logistics", "Technology", "Healthcare", "Agriculture", "Food & Beverage"];

const sectionInput = "w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-400 transition-colors";
const sectionSelect = `${sectionInput} bg-white`;
const sectionLabel = "block text-xs font-semibold text-gray-700 mb-1.5";

function Section({ title, number, subtitle, children }: SectionProps) {
  return (
    <section className="mb-6 rounded-xl border border-gray-200 bg-white p-6">
      <div className="mb-1 flex items-center gap-2">
        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#0a1628] text-xs font-bold text-white">{number}</div>
        <h2 className="text-base font-bold text-gray-900">{title}</h2>
      </div>
      {subtitle ? <p className="mb-5 ml-8 text-xs text-gray-500">{subtitle}</p> : null}
      {children}
    </section>
  );
}

function SidebarStep({ step, isLast }: { step: StepItem; isLast: boolean }) {
  const completed = step.status === "completed";
  const inProgress = step.status === "in_progress";

  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center">
        <div
          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 ${
            completed ? "border-green-500 bg-green-500" : inProgress ? "border-green-400 bg-[#0a1628]" : "border-gray-600 bg-[#0a1628]"
          }`}
        >
          {completed ? <CheckCircle className="h-4 w-4 fill-green-500 text-white" /> : <span className={`text-xs font-bold ${inProgress ? "text-green-400" : "text-gray-500"}`}>{step.n}</span>}
        </div>
        {!isLast ? <div className={`mt-1 h-8 w-0.5 ${completed ? "bg-green-500" : "bg-gray-700"}`} /> : null}
      </div>
      <div className="pb-6">
        <p className={`text-sm leading-tight ${completed ? "font-semibold text-green-400" : inProgress ? "font-bold text-white" : "text-gray-400"}`}>{step.label}</p>
        <p className={`text-[10px] ${completed ? "text-green-400" : inProgress ? "font-medium text-green-400" : "text-gray-500"}`}>
          {completed ? "Completed" : inProgress ? "In Progress" : "Pending"}
        </p>
      </div>
    </div>
  );
}

function UploadBox({ label, subtitle, file, onUpload }: SimpleUploadBoxProps) {
  return (
    <div className="flex flex-col items-center">
      <p className="mb-0.5 text-center text-xs font-semibold leading-snug text-gray-700">
        {label}
        <span className="ml-0.5 text-red-500">*</span>
      </p>
      {subtitle ? <p className="mb-2 text-center text-[10px] text-gray-400">{subtitle}</p> : null}
      <label className="group flex w-full cursor-pointer flex-col items-center gap-2 rounded-xl border border-gray-200 p-4 transition-colors hover:border-green-400 hover:bg-green-50">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100 transition-colors group-hover:bg-green-100">
          <FileText className="h-5 w-5 text-gray-400 transition-colors group-hover:text-green-600" />
        </div>
        <span className="flex items-center gap-1 text-xs font-semibold text-green-700">
          <Upload className="h-3 w-3" /> Upload File
        </span>
        {file ? <p className="max-w-full truncate text-[9px] text-gray-500">{file.name}</p> : null}
        <input type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={(event) => onUpload(event.target.files?.[0] ?? null)} />
      </label>
      <p className="mt-1 text-center text-[9px] text-gray-400">PDF, JPG or PNG (Max 5MB)</p>
    </div>
  );
}

export default function LenderRegisterPage() {
  const navigate = useNavigate();
  const displayName = useMemo(() => sessionStorage.getItem("username") || sessionStorage.getItem("email") || "User", []);
  const initials = useMemo(() => displayName.split(/\s+|@/).filter(Boolean).map((value) => value[0]).join("").toUpperCase().slice(0, 2) || "U", [displayName]);

  const [org, setOrg] = useState<OrganizationForm>({
    lenderName: "",
    registrationNumber: "",
    financialLicenseNumber: "",
    companyType: "Private Company",
    countryOfOperation: "South Africa",
    headOfficeAddress: "",
    primaryContact: "",
    contactEmail: sessionStorage.getItem("email") || "",
    contactPhone: "",
  });

  const [funding, setFunding] = useState<FundingForm>({
    totalFundingCapacity: "R 50,000,000.00",
    minimumInvoiceAmount: "R 10,000.00",
    maximumInvoiceAmount: "R 5,000,000.00",
    typicalFundingTenure: "30 - 90 Days",
    preferredPayoutTime: "Within 24 Hours",
    averageApprovalTime: "1 - 2 Business Days",
  });

  const [risk, setRisk] = useState<RiskForm>({
    industriesToFund: ["Construction", "Retail & Wholesale", "Manufacturing", "Logistics"],
    minimumCreditScore: "60 - Good",
    maximumRiskLevel: "Medium Risk",
    preferredInvoiceAge: "0 - 90 Days",
    preferredRepaymentTerms: "30 - 90 Days",
  });

  const [docs, setDocs] = useState<DocsForm>({
    companyRegistration: null,
    financialServicesLicense: null,
    proofOfBanking: null,
    taxClearance: null,
  });

  const [agreements, setAgreements] = useState<AgreementsForm>({
    confirmAccuracy: true,
    agreeTerms: true,
  });

  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const updateOrg = <K extends keyof OrganizationForm>(key: K, value: OrganizationForm[K]) => setOrg((current) => ({ ...current, [key]: value }));
  const updateFunding = <K extends keyof FundingForm>(key: K, value: FundingForm[K]) => setFunding((current) => ({ ...current, [key]: value }));
  const updateRisk = <K extends keyof RiskForm>(key: K, value: RiskForm[K]) => setRisk((current) => ({ ...current, [key]: value }));
  const updateDoc = <K extends keyof DocsForm>(key: K, value: DocsForm[K]) => setDocs((current) => ({ ...current, [key]: value }));
  const updateAgreement = <K extends keyof AgreementsForm>(key: K, value: AgreementsForm[K]) => setAgreements((current) => ({ ...current, [key]: value }));

  const addIndustry = (industry: string) => {
    if (industry && !risk.industriesToFund.includes(industry)) {
      updateRisk("industriesToFund", [...risk.industriesToFund, industry]);
    }
  };

  const removeIndustry = (industry: string) => {
    updateRisk("industriesToFund", risk.industriesToFund.filter((item) => item !== industry));
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);

    try {
      const payload = {
        organization_name: org.lenderName,
        contact_email: org.contactEmail,
        phone: org.contactPhone,
        max_lending_amount: Number(String(funding.totalFundingCapacity).replace(/[^\d.-]/g, "")) || 0,
        min_credit_score: Number(String(risk.minimumCreditScore).match(/\d+/)?.[0] ?? 0),
      };

      await LenderApi.register(payload);
      navigate("/lender/dashboard");
    } catch (requestError: any) {
      const detail = requestError?.response?.data?.detail;
      setError(formatApiErrorDetail(detail) || requestError?.message || "Failed to register lender");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-50 font-inter">
      <aside className="sticky top-0 hidden min-h-screen w-64 shrink-0 flex-col bg-[#0a1628] text-white lg:flex">
        <div className="flex items-center gap-2 border-b border-white/10 px-5 py-6">
          <BarChart2 className="h-6 w-6 text-green-400" />
          <div>
            <p className="text-sm font-bold leading-tight">SME FINANCE</p>
            <p className="text-[9px] tracking-wide text-green-400">Smart Financing. Stronger SMEs.</p>
          </div>
        </div>

        <div className="px-5 pt-5 pb-2">
          <p className="mb-4 text-[9px] font-bold uppercase tracking-widest text-gray-400">Onboarding Progress</p>
          <div className="space-y-0">
            {STEPS.map((step, index) => (
              <SidebarStep key={step.n} step={step} isLast={index === STEPS.length - 1} />
            ))}
          </div>
        </div>

        <div className="flex-1" />

        <div className="mx-4 mb-4 rounded-xl border border-white/10 bg-[#0f2040] p-4">
          <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-full bg-blue-500/20">
            <HeadphonesIcon className="h-5 w-5 text-blue-400" />
          </div>
          <p className="mb-1 text-sm font-semibold">Need help?</p>
          <p className="mb-3 text-xs text-gray-400">Our support team is here to help you get started.</p>
          <button type="button" className="w-full rounded-lg border border-gray-500 py-2 text-xs font-medium text-gray-300 transition-colors hover:bg-white/5">
            Contact Support
          </button>
        </div>

        <div className="mx-4 mb-4 flex items-start gap-2">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
          <div>
            <p className="text-xs font-semibold text-gray-300">Your data is secure</p>
            <p className="text-[10px] leading-relaxed text-gray-500">We use bank-level encryption to protect your information.</p>
          </div>
        </div>

        <div className="flex justify-center pb-6 opacity-30">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-blue-900/50">
            <span className="text-4xl">🏛️</span>
          </div>
        </div>
      </aside>

      <div className="flex min-h-screen min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-gray-200 bg-white px-6">
          <button type="button" className="rounded-lg p-2 transition-colors hover:bg-gray-100 lg:hidden" aria-label="Open menu">
            <Menu className="h-5 w-5 text-gray-600" />
          </button>

          <div className="flex-1" />

          <div className="flex items-center gap-4">
            <button type="button" className="flex items-center gap-1.5 text-sm text-gray-500 transition-colors hover:text-gray-700">
              <HelpCircle className="h-4 w-4" />
              Need help?
            </button>
            <button type="button" className="relative rounded-lg p-2 transition-colors hover:bg-gray-100" aria-label="Notifications">
              <Bell className="h-5 w-5 text-gray-500" />
              <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-red-500" />
            </button>
            <div className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 transition-colors hover:bg-gray-50">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-700">
                <span className="text-xs font-bold text-white">{initials}</span>
              </div>
              <div className="hidden sm:block">
                <p className="text-sm font-semibold leading-tight text-gray-900">{displayName}</p>
                <p className="text-[10px] text-gray-400">Lender Account</p>
              </div>
              <ChevronDown className="h-4 w-4 text-gray-400" />
            </div>
          </div>
        </header>

        <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col px-6 py-8">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Complete Your Lender Setup</h1>
            <p className="mt-1 text-sm text-gray-500">Help us understand your organization so you can start funding SMEs with confidence.</p>
          </div>

          <div className="mb-6 flex items-start gap-3 rounded-xl border border-blue-200 bg-blue-50 px-5 py-4">
            <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-500">
              <span className="text-xs font-bold text-white">i</span>
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">Why do we need this information?</p>
              <p className="mt-0.5 text-xs leading-relaxed text-gray-500">
                This information helps us verify your organization, assess your funding preferences, and ensure compliance with regulatory requirements.
              </p>
            </div>
          </div>

          {error ? <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600">{error}</div> : null}

          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <Section title="Organization Details" number={1} subtitle="Tell us about your lender organization.">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div>
                  <label className={sectionLabel}>Lender / Organization Name <span className="text-red-500">*</span></label>
                  <input className={sectionInput} placeholder="e.g. Mokoena Capital (Pty) Ltd" value={org.lenderName} onChange={(event) => updateOrg("lenderName", event.target.value)} />
                </div>
                <div>
                  <label className={sectionLabel}>Registration Number <span className="text-red-500">*</span></label>
                  <input className={sectionInput} placeholder="2021/123456/07" value={org.registrationNumber} onChange={(event) => updateOrg("registrationNumber", event.target.value)} />
                </div>
                <div>
                  <label className={sectionLabel}>Financial License Number <span className="text-red-500">*</span></label>
                  <input className={sectionInput} placeholder="NCRCP12345" value={org.financialLicenseNumber} onChange={(event) => updateOrg("financialLicenseNumber", event.target.value)} />
                </div>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div>
                  <label className={sectionLabel}>Company Type <span className="text-red-500">*</span></label>
                  <select className={sectionSelect} value={org.companyType} onChange={(event) => updateOrg("companyType", event.target.value)}>
                    <option>Private Company</option>
                    <option>Public Company</option>
                    <option>Close Corporation</option>
                    <option>Sole Proprietor</option>
                    <option>Partnership</option>
                  </select>
                </div>
                <div>
                  <label className={sectionLabel}>Country of Operation <span className="text-red-500">*</span></label>
                  <select className={sectionSelect} value={org.countryOfOperation} onChange={(event) => updateOrg("countryOfOperation", event.target.value)}>
                    <option>South Africa</option>
                    <option>Botswana</option>
                    <option>Zimbabwe</option>
                    <option>Namibia</option>
                  </select>
                </div>
                <div>
                  <label className={sectionLabel}>Head Office Address <span className="text-red-500">*</span></label>
                  <input className={sectionInput} placeholder="12 Sandton Drive, Sandton, 2196" value={org.headOfficeAddress} onChange={(event) => updateOrg("headOfficeAddress", event.target.value)} />
                </div>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div>
                  <label className={sectionLabel}>Primary Contact Person <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <input className={`${sectionInput} pl-9`} placeholder="Thabo Mokoena" value={org.primaryContact} onChange={(event) => updateOrg("primaryContact", event.target.value)} />
                  </div>
                </div>
                <div>
                  <label className={sectionLabel}>Contact Email <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <input type="email" className={`${sectionInput} pl-9`} placeholder="thabo@mokoenacapital.co.za" value={org.contactEmail} onChange={(event) => updateOrg("contactEmail", event.target.value)} />
                  </div>
                </div>
                <div>
                  <label className={sectionLabel}>Contact Phone Number <span className="text-red-500">*</span></label>
                  <div className="flex">
                    <span className="flex items-center whitespace-nowrap rounded-l-lg border border-r-0 border-gray-200 bg-gray-50 px-2.5 text-sm text-gray-600">🇿🇦 +27</span>
                    <input className="flex-1 rounded-r-lg border border-gray-200 px-3 py-2.5 text-sm transition-colors focus:border-green-400 focus:outline-none focus:ring-2 focus:ring-green-500/30" placeholder="82 123 4567" value={org.contactPhone} onChange={(event) => updateOrg("contactPhone", event.target.value)} />
                  </div>
                </div>
              </div>
            </Section>

            <Section title="Funding & Capacity Information" number={2} subtitle="Define the scale and structure of the funding you provide.">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div>
                  <label className={sectionLabel}>Total Funding Capacity (ZAR) <span className="text-red-500">*</span></label>
                  <input className={sectionInput} placeholder="R 50,000,000.00" value={funding.totalFundingCapacity} onChange={(event) => updateFunding("totalFundingCapacity", event.target.value)} />
                </div>
                <div>
                  <label className={sectionLabel}>Minimum Invoice Amount <span className="text-red-500">*</span></label>
                  <input className={sectionInput} placeholder="R 10,000.00" value={funding.minimumInvoiceAmount} onChange={(event) => updateFunding("minimumInvoiceAmount", event.target.value)} />
                </div>
                <div>
                  <label className={sectionLabel}>Maximum Invoice Amount <span className="text-red-500">*</span></label>
                  <input className={sectionInput} placeholder="R 5,000,000.00" value={funding.maximumInvoiceAmount} onChange={(event) => updateFunding("maximumInvoiceAmount", event.target.value)} />
                </div>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div>
                  <label className={sectionLabel}>Typical Funding Tenure <span className="text-red-500">*</span></label>
                  <select className={sectionSelect} value={funding.typicalFundingTenure} onChange={(event) => updateFunding("typicalFundingTenure", event.target.value)}>
                    <option>30 - 90 Days</option>
                    <option>30 - 60 Days</option>
                    <option>60 - 120 Days</option>
                    <option>90 - 180 Days</option>
                  </select>
                </div>
                <div>
                  <label className={sectionLabel}>Preferred Payout Time <span className="text-red-500">*</span></label>
                  <select className={sectionSelect} value={funding.preferredPayoutTime} onChange={(event) => updateFunding("preferredPayoutTime", event.target.value)}>
                    <option>Within 24 Hours</option>
                    <option>Within 48 Hours</option>
                    <option>2 - 3 Business Days</option>
                    <option>Same Day</option>
                  </select>
                </div>
                <div>
                  <label className={sectionLabel}>Average Approval Time <span className="text-red-500">*</span></label>
                  <select className={sectionSelect} value={funding.averageApprovalTime} onChange={(event) => updateFunding("averageApprovalTime", event.target.value)}>
                    <option>1 - 2 Business Days</option>
                    <option>Same Day</option>
                    <option>2 - 3 Business Days</option>
                    <option>3 - 5 Business Days</option>
                  </select>
                </div>
              </div>
            </Section>

            <Section title="Risk & Funding Preferences" number={3} subtitle="Set your lending criteria and preferences.">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className={sectionLabel}>Industries You Want to Fund <span className="text-red-500">*</span></label>
                  <div className="flex min-h-[42px] flex-wrap items-center gap-1.5 rounded-lg border border-gray-200 p-2">
                    {risk.industriesToFund.map((industry) => (
                      <span key={industry} className="flex items-center gap-1 rounded bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700">
                        {industry}
                        <button type="button" onClick={() => removeIndustry(industry)}>
                          <X className="h-3 w-3 text-gray-400 hover:text-red-500" />
                        </button>
                      </span>
                    ))}
                    <select className="min-w-[80px] flex-1 border-0 bg-transparent text-xs text-gray-400 outline-none" value="" onChange={(event) => addIndustry(event.target.value)}>
                      <option value="">+ Add</option>
                      {INDUSTRIES.filter((industry) => !risk.industriesToFund.includes(industry)).map((industry) => (
                        <option key={industry} value={industry}>
                          {industry}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label className={sectionLabel}>Minimum Credit Score Accepted <span className="text-red-500">*</span></label>
                  <select className={sectionSelect} value={risk.minimumCreditScore} onChange={(event) => updateRisk("minimumCreditScore", event.target.value)}>
                    <option>40 - Fair</option>
                    <option>60 - Good</option>
                    <option>70 - Very Good</option>
                    <option>80 - Excellent</option>
                  </select>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div>
                  <label className={sectionLabel}>Maximum Risk Level You Accept <span className="text-red-500">*</span></label>
                  <select className={sectionSelect} value={risk.maximumRiskLevel} onChange={(event) => updateRisk("maximumRiskLevel", event.target.value)}>
                    <option>Low Risk</option>
                    <option>Medium Risk</option>
                    <option>High Risk</option>
                  </select>
                </div>
                <div>
                  <label className={sectionLabel}>Preferred Invoice Age (Days) <span className="text-red-500">*</span></label>
                  <select className={sectionSelect} value={risk.preferredInvoiceAge} onChange={(event) => updateRisk("preferredInvoiceAge", event.target.value)}>
                    <option>0 - 30 Days</option>
                    <option>0 - 60 Days</option>
                    <option>0 - 90 Days</option>
                    <option>0 - 120 Days</option>
                  </select>
                </div>
                <div>
                  <label className={sectionLabel}>Preferred Repayment Terms <span className="text-red-500">*</span></label>
                  <select className={sectionSelect} value={risk.preferredRepaymentTerms} onChange={(event) => updateRisk("preferredRepaymentTerms", event.target.value)}>
                    <option>30 - 60 Days</option>
                    <option>30 - 90 Days</option>
                    <option>60 - 120 Days</option>
                    <option>90 - 180 Days</option>
                  </select>
                </div>
              </div>

              <div className="mt-4 flex items-start gap-3 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3">
                <Target className="mt-0.5 h-5 w-5 shrink-0 text-blue-500" />
                <div>
                  <p className="text-sm font-semibold text-gray-900">These preferences help us match you with the right SME financing opportunities.</p>
                  <p className="text-xs text-gray-500">You can update these settings anytime from your profile.</p>
                </div>
              </div>
            </Section>

            <Section title="Compliance & Documentation" number={4} subtitle="Upload required documents to verify your organization and ensure compliance.">
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <UploadBox label="Company Registration Certificate" file={docs.companyRegistration} onUpload={(file) => updateDoc("companyRegistration", file)} />
                <UploadBox label="Financial Services License" file={docs.financialServicesLicense} onUpload={(file) => updateDoc("financialServicesLicense", file)} />
                <UploadBox label="Proof of Banking" subtitle="(Bank Statement)" file={docs.proofOfBanking} onUpload={(file) => updateDoc("proofOfBanking", file)} />
                <UploadBox label="Tax Clearance Certificate" file={docs.taxClearance} onUpload={(file) => updateDoc("taxClearance", file)} />
              </div>

              <div className="mt-4 flex items-center gap-2 text-gray-400">
                <ShieldCheck className="h-3.5 w-3.5 shrink-0" />
                <p className="text-xs">All documents are securely stored and encrypted.</p>
              </div>
            </Section>

            <Section title="Agreements & Acknowledgement" number={5} subtitle="Please review and accept the following to continue.">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-3">
                  <label className="group flex cursor-pointer items-start gap-3">
                    <div
                      onClick={() => updateAgreement("confirmAccuracy", !agreements.confirmAccuracy)}
                      className={`mt-0.5 flex h-4 w-4 shrink-0 cursor-pointer items-center justify-center rounded border-2 transition-colors ${agreements.confirmAccuracy ? "border-green-600 bg-green-600" : "border-gray-300"}`}
                    >
                      {agreements.confirmAccuracy ? (
                        <svg className="h-2.5 w-2.5 text-white" fill="none" viewBox="0 0 12 12">
                          <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      ) : null}
                    </div>
                    <span className="text-sm text-gray-700">I confirm that all information provided is accurate and up to date.</span>
                  </label>

                  <label className="group flex cursor-pointer items-start gap-3">
                    <div
                      onClick={() => updateAgreement("agreeTerms", !agreements.agreeTerms)}
                      className={`mt-0.5 flex h-4 w-4 shrink-0 cursor-pointer items-center justify-center rounded border-2 transition-colors ${agreements.agreeTerms ? "border-green-600 bg-green-600" : "border-gray-300"}`}
                    >
                      {agreements.agreeTerms ? (
                        <svg className="h-2.5 w-2.5 text-white" fill="none" viewBox="0 0 12 12">
                          <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      ) : null}
                    </div>
                    <span className="text-sm text-gray-700">
                      I agree to the <a href="#" className="font-medium text-green-600 hover:underline">Lender Terms of Service</a> and <a href="#" className="font-medium text-green-600 hover:underline">Privacy Policy</a>.
                    </span>
                  </label>
                </div>

                <button type="button" className="flex items-center gap-1.5 whitespace-nowrap rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50">
                  View Agreements
                  <ExternalLink className="h-3.5 w-3.5 text-gray-400" />
                </button>
              </div>
            </Section>
          </div>

          <div className="mb-2 mt-4 flex items-center gap-2">
            <div className="flex h-5 w-5 items-center justify-center rounded-full border border-gray-300">
              <span className="text-[10px] font-bold text-gray-400">i</span>
            </div>
            <p className="text-xs text-gray-400">Once completed, you'll be able to access your Lender Dashboard and start funding SMEs.</p>
          </div>

          <div className="flex items-center justify-between py-4">
            <button onClick={() => navigate(-1)} className="flex items-center gap-2 rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100">
              <ArrowLeft className="h-4 w-4" />
              Back
            </button>
            <button onClick={handleSubmit} disabled={submitting} className="flex items-center gap-2 rounded-lg bg-green-700 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-green-800 disabled:opacity-50">
              {submitting ? "Completing Setup..." : "Complete Setup & Continue"}
              {!submitting ? <ArrowRight className="h-4 w-4" /> : null}
            </button>
          </div>

          <div className="mb-2 flex items-start gap-2">
            <div className="flex h-5 w-5 items-center justify-center rounded-full border border-gray-300">
              <span className="text-[10px] font-bold text-gray-400">i</span>
            </div>
            <p className="text-xs text-gray-400">After completion, you can start reviewing SMEs and funding opportunities.</p>
          </div>
        </main>
      </div>
    </div>
  );
}
