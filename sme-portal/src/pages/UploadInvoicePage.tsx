import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft, FileText, UploadCloud, Info, Eye, Check } from "lucide-react";
import api from "../api/client";
import { invoiceApi } from "../api/invoiceApi";
import { formatZAR } from "../utils/format";
import { useSnackbar } from "notistack";

export default function UploadInvoicePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { enqueueSnackbar } = useSnackbar();

  // Invoice Information
  const [clientName, setClientName] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [invoiceAmount, setInvoiceAmount] = useState<number | "">("");
  const [issueDate, setIssueDate] = useState("2026-06-01");
  const [dueDate, setDueDate] = useState("2026-06-30");
  const [currency, setCurrency] = useState("ZAR");
  const [description, setDescription] = useState("");

  // Customer Information
  const [customerCompany, setCustomerCompany] = useState("");
  const [contactPerson, setContactPerson] = useState("");
  const [emailAddress, setEmailAddress] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [customerIndustry, setCustomerIndustry] = useState("Manufacturing");
  const [paymentTerms, setPaymentTerms] = useState<number | "">(30);

  // Supporting Documents
  const [uploadedFile, setUploadedFile] = useState<{ name: string; size: string } | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // SME Credit Score
  const [creditScore, setCreditScore] = useState<number | null>(78); // Default score is 78 (780)
  const [loadingScore, setLoadingScore] = useState(false);
  const [saving, setSaving] = useState(false);

  // Sync Customer Company with Client Name if not manually edited
  const [isCompanySynced, setIsCompanySynced] = useState(true);

  useEffect(() => {
    // Fetch latest credit score of the SME
    const fetchSmeData = async () => {
      try {
        setLoadingScore(true);
        const dash = await api.get("/smes/dashboard");
        if (dash.data.credit_score !== null) {
          setCreditScore(dash.data.credit_score);
        }
      } catch (err) {
        console.error("Failed to fetch SME credit score for preview", err);
      } finally {
        setLoadingScore(false);
      }
    };
    fetchSmeData();
  }, []);

  useEffect(() => {
    const prefill = location.state as any;
    if (prefill) {
      if (prefill.prefillClientName) {
        setClientName(prefill.prefillClientName);
        setCustomerCompany(prefill.prefillClientName);
        setIsCompanySynced(false);
      }
      if (prefill.prefillContactPerson && prefill.prefillContactPerson !== "Not Provided") {
        setContactPerson(prefill.prefillContactPerson);
      }
      if (prefill.prefillEmail && prefill.prefillEmail !== "Not Provided") {
        setEmailAddress(prefill.prefillEmail);
      }
      if (prefill.prefillPhone && prefill.prefillPhone !== "Not Provided") {
        setPhoneNumber(prefill.prefillPhone);
      }
      if (prefill.prefillIndustry) {
        // Industry values in dropdown: 'Manufacturing', 'Retail & Trade', 'Technology', 'Construction', 'Professional Services', 'Logistics', 'Agriculture', 'Other'
        let ind = prefill.prefillIndustry;
        if (ind === "Retail") ind = "Retail & Trade";
        if (ind === "Utilities") ind = "Other"; // Fallback if Utilities not in dropdown
        setCustomerIndustry(ind);
      }
      if (prefill.prefillPaymentTerms) {
        setPaymentTerms(prefill.prefillPaymentTerms);
      }
    }
  }, [location.state]);

  const handleClientNameChange = (val: string) => {
    setClientName(val);
    if (isCompanySynced) {
      setCustomerCompany(val);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setUploadedFile({
        name: file.name,
        size: (file.size / (1024 * 1024)).toFixed(1) + " MB",
      });
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      setUploadedFile({
        name: file.name,
        size: (file.size / (1024 * 1024)).toFixed(1) + " MB",
      });
    }
  };

  // Eligibility Formulas
  const getEligibilityMetrics = () => {
    const scoreVal = creditScore ?? 78; // Default 78
    const amountVal = Number(invoiceAmount) || 0;

    // Advance Rate: <40 = 60%, <60 = 70%, <80 = 80%, 80+ = 90%
    let advanceRate = 0.8;
    if (scoreVal < 40) advanceRate = 0.6;
    else if (scoreVal < 60) advanceRate = 0.7;
    else if (scoreVal < 80) advanceRate = 0.8;
    else advanceRate = 0.9;

    // Fee Rate: <40 = 8%, <60 = 5%, <80 = 2.5%, 80+ = 1.5%
    let feeRate = 0.025;
    if (scoreVal < 40) feeRate = 0.08;
    else if (scoreVal < 60) feeRate = 0.05;
    else if (scoreVal < 80) feeRate = 0.025;
    else feeRate = 0.015;

    const financeAvailable = amountVal * advanceRate;
    const feeAmount = financeAvailable * feeRate;
    const youReceive = financeAvailable - feeAmount;

    return {
      score: Math.round(scoreVal * 10),
      rating: scoreVal >= 80 ? "Excellent" : scoreVal >= 60 ? "Good" : scoreVal >= 40 ? "Fair" : "Poor",
      advanceRate: Math.round(advanceRate * 100),
      feeRatePercent: (feeRate * 100).toFixed(1),
      financeAvailable,
      feeAmount,
      youReceive,
    };
  };

  const metrics = getEligibilityMetrics();

  const handleSaveInvoice = async (requestFinanceAfterSave: boolean) => {
    if (!clientName || !invoiceAmount || !invoiceNumber) {
      enqueueSnackbar("Please fill in all required fields marked with *", { variant: "warning" });
      return;
    }

    try {
      setSaving(true);
      const res = await invoiceApi.create({
        client_name: clientName,
        amount: Number(invoiceAmount),
        description,
        invoice_number: invoiceNumber,
        issue_date: issueDate ? new Date(issueDate).toISOString() : undefined,
        due_date: dueDate ? new Date(dueDate).toISOString() : undefined,
        currency,
        customer_company: customerCompany,
        contact_person: contactPerson || undefined,
        email: emailAddress || undefined,
        phone: phoneNumber || undefined,
        customer_industry: customerIndustry || undefined,
        payment_terms: paymentTerms ? Number(paymentTerms) : undefined,
        pdf_url: uploadedFile ? `mock_uploads/${uploadedFile.name}` : undefined,
      });

      enqueueSnackbar("Invoice saved successfully", { variant: "success" });

      const newInvoice = res.data.invoice;

      if (requestFinanceAfterSave && newInvoice) {
        // Redirect directly to the finance requests page with this invoice preselected
        navigate("/finance", {
          state: {
            preselectInvoiceId: newInvoice.id,
            prefillAmount: metrics.financeAvailable,
          },
        });
      } else {
        navigate("/invoices");
      }
    } catch (err: any) {
      console.error("Failed to create invoice", err);
      enqueueSnackbar("Failed to save invoice record", { variant: "error" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 pb-12 text-[#071942]">
      {/* Breadcrumbs and Page Header */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2 text-xs font-semibold text-[#8f9bba]">
          <span className="cursor-pointer hover:text-[#1f724f]" onClick={() => navigate("/dashboard")}>Dashboard</span>
          <span>&gt;</span>
          <span className="cursor-pointer hover:text-[#1f724f]" onClick={() => navigate("/invoices")}>Invoices</span>
          <span>&gt;</span>
          <span className="text-[#071942]">Upload Invoice</span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/invoices")}
            className="flex items-center justify-center h-10 w-10 rounded-xl border border-[#e9eef8] bg-white hover:bg-slate-50 transition active:scale-95"
            title="Go back to invoices"
          >
            <ArrowLeft className="h-5 w-5 text-[#5f6d8a]" />
          </button>
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-[#071942]">Upload Invoice</h1>
            <p className="text-sm text-[#5f6d8a] mt-0.5">Add a new invoice to your account</p>
          </div>
        </div>
      </div>

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        {/* Left Column (Inputs) */}
        <div className="xl:col-span-2 space-y-6">
          {/* Step 1: Invoice Information */}
          <div className="rounded-2xl border border-[#e9eef8] bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3 border-b border-[#e9eef8] pb-4 mb-5">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#1f724f] text-sm font-bold text-white">
                1
              </div>
              <h2 className="text-lg font-bold text-[#071942]">Invoice Information</h2>
            </div>

            <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
              <div>
                <label className="block text-xs font-bold text-[#5f6d8a] mb-2 uppercase tracking-wide">Client Name *</label>
                <input
                  type="text"
                  placeholder="e.g. ABC Manufacturing Pty Ltd"
                  value={clientName}
                  onChange={(e) => handleClientNameChange(e.target.value)}
                  className="w-full rounded-xl border border-[#dfe5f0] bg-white px-4 py-3 text-sm text-[#071942] placeholder-[#91a1bf] transition focus:border-[#1f724f] focus:outline-none focus:ring-1 focus:ring-[#1f724f]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#5f6d8a] mb-2 uppercase tracking-wide">Invoice Number *</label>
                <input
                  type="text"
                  placeholder="e.g. INV-2026-001"
                  value={invoiceNumber}
                  onChange={(e) => setInvoiceNumber(e.target.value)}
                  className="w-full rounded-xl border border-[#dfe5f0] bg-white px-4 py-3 text-sm text-[#071942] placeholder-[#91a1bf] transition focus:border-[#1f724f] focus:outline-none focus:ring-1 focus:ring-[#1f724f]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#5f6d8a] mb-2 uppercase tracking-wide">Invoice Amount *</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-[#5f6d8a]">R</span>
                  <input
                    type="number"
                    placeholder="50 000.00"
                    value={invoiceAmount}
                    onChange={(e) => setInvoiceAmount(e.target.value === "" ? "" : Number(e.target.value))}
                    className="w-full rounded-xl border border-[#dfe5f0] bg-white pl-8 pr-4 py-3 text-sm text-[#071942] placeholder-[#91a1bf] font-bold transition focus:border-[#1f724f] focus:outline-none focus:ring-1 focus:ring-[#1f724f]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#5f6d8a] mb-2 uppercase tracking-wide">Issue Date *</label>
                <input
                  type="date"
                  value={issueDate}
                  onChange={(e) => setIssueDate(e.target.value)}
                  className="w-full rounded-xl border border-[#dfe5f0] bg-white px-4 py-3 text-sm text-[#071942] transition focus:border-[#1f724f] focus:outline-none focus:ring-1 focus:ring-[#1f724f]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#5f6d8a] mb-2 uppercase tracking-wide">Due Date *</label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full rounded-xl border border-[#dfe5f0] bg-white px-4 py-3 text-sm text-[#071942] transition focus:border-[#1f724f] focus:outline-none focus:ring-1 focus:ring-[#1f724f]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#5f6d8a] mb-2 uppercase tracking-wide">Currency</label>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="w-full rounded-xl border border-[#dfe5f0] bg-white px-4 py-3 text-sm text-[#071942] transition focus:border-[#1f724f] focus:outline-none focus:ring-1 focus:ring-[#1f724f]"
                >
                  <option value="ZAR">ZAR - South African Rand</option>
                  <option value="USD">USD - United States Dollar</option>
                  <option value="EUR">EUR - Euro</option>
                  <option value="GBP">GBP - British Pound</option>
                </select>
              </div>

              <div className="md:col-span-3">
                <label className="block text-xs font-bold text-[#5f6d8a] mb-2 uppercase tracking-wide">Description (Optional)</label>
                <textarea
                  rows={3}
                  placeholder="Describe the goods or services supplied..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full rounded-xl border border-[#dfe5f0] bg-white px-4 py-3 text-sm text-[#071942] placeholder-[#91a1bf] transition focus:border-[#1f724f] focus:outline-none focus:ring-1 focus:ring-[#1f724f]"
                />
              </div>
            </div>
          </div>

          {/* Step 2: Customer Information */}
          <div className="rounded-2xl border border-[#e9eef8] bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3 border-b border-[#e9eef8] pb-4 mb-5">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#1f724f] text-sm font-bold text-white">
                2
              </div>
              <h2 className="text-lg font-bold text-[#071942]">Customer Information</h2>
            </div>

            <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-bold text-[#5f6d8a] uppercase tracking-wide">Customer Company *</label>
                  <label className="flex items-center gap-1.5 text-[10px] font-medium text-[#1f724f] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isCompanySynced}
                      onChange={(e) => {
                        setIsCompanySynced(e.target.checked);
                        if (e.target.checked) setCustomerCompany(clientName);
                      }}
                      className="rounded border-[#dfe5f0] text-[#1f724f] focus:ring-[#1f724f]"
                    />
                    Same as client
                  </label>
                </div>
                <input
                  type="text"
                  placeholder="e.g. ABC Manufacturing Pty Ltd"
                  value={customerCompany}
                  onChange={(e) => {
                    setCustomerCompany(e.target.value);
                    setIsCompanySynced(false);
                  }}
                  className="w-full rounded-xl border border-[#dfe5f0] bg-white px-4 py-3 text-sm text-[#071942] placeholder-[#91a1bf] transition focus:border-[#1f724f] focus:outline-none focus:ring-1 focus:ring-[#1f724f]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#5f6d8a] mb-2 uppercase tracking-wide">Contact Person</label>
                <input
                  type="text"
                  placeholder="e.g. John Smith"
                  value={contactPerson}
                  onChange={(e) => setContactPerson(e.target.value)}
                  className="w-full rounded-xl border border-[#dfe5f0] bg-white px-4 py-3 text-sm text-[#071942] placeholder-[#91a1bf] transition focus:border-[#1f724f] focus:outline-none focus:ring-1 focus:ring-[#1f724f]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#5f6d8a] mb-2 uppercase tracking-wide">Email Address</label>
                <input
                  type="email"
                  placeholder="e.g. john.smith@abc.co.za"
                  value={emailAddress}
                  onChange={(e) => setEmailAddress(e.target.value)}
                  className="w-full rounded-xl border border-[#dfe5f0] bg-white px-4 py-3 text-sm text-[#071942] placeholder-[#91a1bf] transition focus:border-[#1f724f] focus:outline-none focus:ring-1 focus:ring-[#1f724f]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#5f6d8a] mb-2 uppercase tracking-wide">Phone Number</label>
                <input
                  type="text"
                  placeholder="e.g. +27 82 123 4567"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  className="w-full rounded-xl border border-[#dfe5f0] bg-white px-4 py-3 text-sm text-[#071942] placeholder-[#91a1bf] transition focus:border-[#1f724f] focus:outline-none focus:ring-1 focus:ring-[#1f724f]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#5f6d8a] mb-2 uppercase tracking-wide">Customer Industry</label>
                <select
                  value={customerIndustry}
                  onChange={(e) => setCustomerIndustry(e.target.value)}
                  className="w-full rounded-xl border border-[#dfe5f0] bg-white px-4 py-3 text-sm text-[#071942] transition focus:border-[#1f724f] focus:outline-none focus:ring-1 focus:ring-[#1f724f]"
                >
                  <option value="Manufacturing">Manufacturing</option>
                  <option value="Retail & Trade">Retail & Trade</option>
                  <option value="Technology">Technology</option>
                  <option value="Construction">Construction</option>
                  <option value="Professional Services">Professional Services</option>
                  <option value="Logistics">Logistics</option>
                  <option value="Agriculture">Agriculture</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#5f6d8a] mb-2 uppercase tracking-wide">Payment Terms (Days)</label>
                <input
                  type="number"
                  placeholder="30"
                  value={paymentTerms}
                  onChange={(e) => setPaymentTerms(e.target.value === "" ? "" : Number(e.target.value))}
                  className="w-full rounded-xl border border-[#dfe5f0] bg-white px-4 py-3 text-sm text-[#071942] placeholder-[#91a1bf] transition focus:border-[#1f724f] focus:outline-none focus:ring-1 focus:ring-[#1f724f]"
                />
              </div>
            </div>
          </div>

          {/* Step 3: Supporting Documents */}
          <div className="rounded-2xl border border-[#e9eef8] bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3 border-b border-[#e9eef8] pb-4 mb-5">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#1f724f] text-sm font-bold text-white">
                3
              </div>
              <h2 className="text-lg font-bold text-[#071942]">Supporting Documents</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
              {/* Dropzone */}
              <div className="md:col-span-3">
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={`flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-6 transition text-center cursor-pointer min-h-[160px] ${isDragging
                      ? "border-[#1f724f] bg-emerald-50/30"
                      : uploadedFile
                        ? "border-emerald-500/50 bg-emerald-50/10"
                        : "border-[#dfe5f0] hover:border-[#1f724f] hover:bg-slate-50/50"
                    }`}
                >
                  <input
                    type="file"
                    id="invoice-file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <label htmlFor="invoice-file" className="cursor-pointer flex flex-col items-center w-full">
                    {uploadedFile ? (
                      <>
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 mb-3 animate-bounce">
                          <Check className="h-6 w-6" />
                        </div>
                        <p className="text-sm font-bold text-[#071942] max-w-[220px] truncate">{uploadedFile.name}</p>
                        <p className="text-xs text-[#5f6d8a] mt-1">{uploadedFile.size} • Click to replace</p>
                      </>
                    ) : (
                      <>
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-[#5f6d8a] mb-3">
                          <UploadCloud className="h-6 w-6" />
                        </div>
                        <p className="text-sm font-bold text-[#071942]">Drag & drop your invoice PDF here</p>
                        <p className="text-xs text-[#8f9bba] mt-1">or</p>
                        <span className="mt-2 inline-flex rounded-xl bg-[#1f724f] px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-[#165339] active:scale-95 transition">
                          Choose File
                        </span>
                        <p className="text-[10px] text-[#8f9bba] mt-3">Accepted formats: PDF, JPG, PNG • Max size: 10MB</p>
                      </>
                    )}
                  </label>
                </div>
              </div>

              {/* Tips */}
              <div className="md:col-span-2 rounded-2xl bg-slate-50 p-5 border border-slate-100 flex flex-col justify-center">
                <h4 className="text-xs font-bold text-[#071942] uppercase tracking-wider mb-3">Tips for best results</h4>
                <ul className="space-y-2.5 text-xs text-[#5f6d8a]">
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-500 font-bold">✓</span>
                    <span>Upload a clear, readable invoice</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-500 font-bold">✓</span>
                    <span>Ensure all amounts are visible</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-500 font-bold">✓</span>
                    <span>PDF format is recommended</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-500 font-bold">✓</span>
                    <span>Maximum file size is 10MB</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-[#e9eef8] pt-6">
            <button
              onClick={() => navigate("/invoices")}
              disabled={saving}
              className="w-full sm:w-auto rounded-xl border border-[#dfe5f0] bg-white px-6 py-3 text-sm font-bold text-[#5f6d8a] hover:bg-slate-50 transition active:scale-95 text-center"
            >
              Cancel
            </button>
            <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
              <button
                onClick={() => handleSaveInvoice(false)}
                disabled={saving}
                className="w-full sm:w-auto rounded-xl border border-[#1f724f] bg-white px-6 py-3 text-sm font-bold text-[#1f724f] hover:bg-emerald-50/50 transition active:scale-95 text-center"
              >
                {saving ? "Saving..." : "Save Invoice"}
              </button>
              <button
                onClick={() => handleSaveInvoice(true)}
                disabled={saving}
                className="w-full sm:w-auto rounded-xl bg-[#1f724f] px-6 py-3 text-sm font-bold text-white shadow-lg shadow-emerald-950/10 hover:bg-[#165339] hover:shadow-emerald-950/20 transition active:scale-95 text-center"
              >
                {saving ? "Processing..." : "Save & Request Finance"}
              </button>
            </div>
          </div>
        </div>

        {/* Right Column (Eligibility Preview + Summary) */}
        <div className="space-y-6">
          {/* Finance Eligibility Preview */}
          <div className="rounded-2xl border border-[#e9eef8] bg-white p-6 shadow-sm relative overflow-hidden">
            <div className="flex items-center justify-between border-b border-[#e9eef8] pb-4 mb-5">
              <div className="flex items-center gap-2">
                <h3 className="text-base font-extrabold text-[#071942]">Finance Eligibility Preview</h3>
                <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-bold text-[#1f724f] uppercase tracking-wide">Beta</span>
              </div>
            </div>

            <p className="text-xs text-[#8f9bba] mb-6">Based on your credit profile and this invoice</p>

            <div className="space-y-4 text-sm">
              <div className="flex items-center justify-between border-b border-dashed border-[#e9eef8] pb-3">
                <span className="text-[#5f6d8a] font-medium">Credit Score</span>
                <div className="flex flex-col items-end">
                  <span className="font-extrabold text-2xl text-[#1f724f]">
                    {loadingScore ? "..." : metrics.score}
                  </span>
                  <span className="text-[10px] font-bold text-[#1f724f] uppercase mt-0.5">{metrics.rating}</span>
                </div>
              </div>

              <div className="flex items-center justify-between border-b border-[#f3f6fc] pb-3">
                <span className="text-[#5f6d8a]">Advance Rate</span>
                <span className="font-bold text-[#071942]">{metrics.advanceRate}%</span>
              </div>

              <div className="flex items-center justify-between border-b border-[#f3f6fc] pb-3">
                <span className="text-[#5f6d8a]">Estimated Finance Available</span>
                <span className="font-extrabold text-[#1f724f]">{formatZAR(metrics.financeAvailable)}</span>
              </div>

              <div className="flex items-center justify-between border-b border-[#f3f6fc] pb-3">
                <span className="text-[#5f6d8a]">Estimated Fee ({metrics.feeRatePercent}%)</span>
                <span className="font-semibold text-[#071942]">{formatZAR(metrics.feeAmount)}</span>
              </div>

              {/* Net box */}
              <div className="rounded-xl bg-emerald-50/50 p-4 border border-emerald-100/30 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-[#1f724f] uppercase tracking-wider">You Receive</p>
                  <p className="text-[10px] text-[#8f9bba] mt-0.5">Estimated Net Amount</p>
                </div>
                <span className="font-black text-xl text-[#1f724f]">
                  {formatZAR(metrics.youReceive)}
                </span>
              </div>

              {/* Alert notice */}
              <div className="rounded-xl bg-blue-50/50 p-3.5 border border-blue-100/30 flex items-start gap-2.5 text-xs text-blue-700 leading-normal">
                <Info className="h-4.5 w-4.5 shrink-0 text-blue-500 mt-0.5" />
                <p>This is an estimate only. Final amount may vary after lender review.</p>
              </div>
            </div>
          </div>

          {/* Invoice Summary Card */}
          <div className="rounded-2xl border border-[#e9eef8] bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between border-b border-[#e9eef8] pb-4 mb-5">
              <div className="flex items-center gap-2">
                <h3 className="text-base font-extrabold text-[#071942]">Invoice Summary</h3>
                <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-[#5f6d8a] uppercase tracking-wide">Draft</span>
              </div>
            </div>

            {/* Simulated mini card */}
            <div className="flex items-center gap-3 bg-slate-50 p-4 rounded-xl border border-slate-100 mb-5">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white border border-slate-200 shadow-sm text-[#1f724f]">
                <FileText className="h-5.5 w-5.5" />
              </div>
              <div className="overflow-hidden flex-1">
                <h4 className="font-extrabold text-sm text-[#071942] truncate">
                  {invoiceNumber || "INV-2026-XXX"}
                </h4>
                <p className="text-xs text-[#8f9bba] truncate mt-0.5">
                  {clientName || "Client Name"}
                </p>
              </div>
            </div>

            <div className="space-y-3.5 text-xs">
              <div className="flex justify-between">
                <span className="text-[#5f6d8a]">Amount</span>
                <span className="font-bold text-[#071942]">
                  {invoiceAmount ? formatZAR(Number(invoiceAmount)) : "R0.00"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#5f6d8a]">Issue Date</span>
                <span className="font-semibold text-[#071942]">
                  {issueDate ? new Date(issueDate).toLocaleDateString("en-ZA", { day: "2-digit", month: "short", year: "numeric" }) : "-"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#5f6d8a]">Due Date</span>
                <span className="font-semibold text-[#071942]">
                  {dueDate ? new Date(dueDate).toLocaleDateString("en-ZA", { day: "2-digit", month: "short", year: "numeric" }) : "-"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#5f6d8a]">Payment Terms</span>
                <span className="font-semibold text-[#071942]">
                  {paymentTerms ? `${paymentTerms} Days` : "-"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#5f6d8a]">Status</span>
                <span className="flex items-center gap-1.5 font-bold text-amber-600">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                  Draft
                </span>
              </div>

              {/* View after saving button */}
              <button
                disabled
                className="w-full mt-4 flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50/50 py-3 text-xs font-bold text-slate-400 cursor-not-allowed"
              >
                <Eye className="h-4 w-4" />
                View After Saving
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
