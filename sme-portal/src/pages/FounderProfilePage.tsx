import { useEffect, useState } from "react";
import { useSnackbar } from "notistack";
import { FounderApi, type FounderProfile } from "../api/founderApi";

const QUALIFICATIONS = [
  { value: "none",         label: "No formal qualification" },
  { value: "matric",       label: "Matric / Grade 12" },
  { value: "certificate",  label: "Certificate" },
  { value: "diploma",      label: "Diploma" },
  { value: "degree",       label: "Bachelor's Degree" },
  { value: "postgraduate", label: "Postgraduate (Honours / Masters / PhD)" },
];

const INDUSTRIES = [
  "Construction", "Retail", "Manufacturing", "Technology", "Healthcare",
  "Agriculture", "Transport & Logistics", "Food & Beverage", "Professional Services", "Other",
];

const INPUT  = "w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-400 transition-colors";
const SELECT = `${INPUT} bg-white`;
const LABEL  = "block text-xs font-semibold text-gray-700 mb-1.5";

export default function FounderProfilePage() {
  const { enqueueSnackbar } = useSnackbar();
  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(false);
  const [preview,  setPreview]  = useState<{ current_founder_contribution: number; max_founder_pts: number; potential_gains: Array<{ action: string; potential_pts: number }> } | null>(null);

  // Form state
  const [form, setForm] = useState<Partial<FounderProfile>>({
    prior_employer:            "",
    prior_job_title:           "",
    prior_industry:            "",
    years_industry_experience: undefined,
    prior_business_owner:      undefined,
    prior_business_name:       "",
    highest_qualification:     "",
    field_of_study:            "",
    trade_association_member:  undefined,
    trade_association_name:    "",
    reference_name:            "",
    reference_company:         "",
    reference_phone:           "",
    id_number:                 "",
  });

  const [isNew, setIsNew] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await FounderApi.get();
        setForm(data);
        setIsNew(false);
      } catch {
        setIsNew(true);
      } finally {
        setLoading(false);
      }

      try {
        const { data } = await FounderApi.preview();
        setPreview(data);
      } catch { /* preview optional */ }
    })();
  }, []);

  const set = (field: keyof FounderProfile, value: unknown) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleSave = async () => {
    setSaving(true);
    try {
      if (isNew) {
        await FounderApi.create(form);
        setIsNew(false);
        enqueueSnackbar("Founder profile created! Your score has been updated.", { variant: "success" });
      } else {
        await FounderApi.update(form);
        enqueueSnackbar("Founder profile updated! Your score has been recalculated.", { variant: "success" });
      }
      const { data } = await FounderApi.preview();
      setPreview(data);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      enqueueSnackbar(msg || "Failed to save founder profile.", { variant: "error" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin h-8 w-8 rounded-full border-4 border-green-500 border-t-transparent" />
    </div>
  );

  return (
    <div className="max-w-3xl mx-auto space-y-6 p-6">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[#071942]">Founder Profile</h1>
        <p className="mt-1 text-sm text-gray-500">
          Tell us about yourself. These signals feed directly into your credit score's
          Founder Signal factor — worth up to 15 points.
        </p>
      </div>

      {/* Score preview banner */}
      {preview && (
        <div className="rounded-xl border border-green-100 bg-green-50 p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold text-green-800">
              Founder Signal: {preview.current_founder_contribution} / {preview.max_founder_pts} pts
            </span>
            <div className="h-2 w-48 rounded-full bg-green-100 overflow-hidden">
              <div
                className="h-full rounded-full bg-green-500"
                style={{ width: `${(preview.current_founder_contribution / preview.max_founder_pts) * 100}%` }}
              />
            </div>
          </div>
          {preview.potential_gains.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-green-700 mb-2">What you can earn:</p>
              <div className="space-y-1">
                {preview.potential_gains.map((g) => (
                  <div key={g.action} className="flex items-center justify-between text-xs text-green-700">
                    <span>• {g.action}</span>
                    <span className="font-semibold ml-2">+{g.potential_pts} pts</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Section: Employment */}
      <section className="rounded-xl border border-gray-200 bg-white p-5 space-y-4">
        <h2 className="text-sm font-bold text-[#071942] border-b border-gray-100 pb-2">
          Employment & Industry Experience
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={LABEL}>Prior Employer</label>
            <input className={INPUT} value={form.prior_employer || ""} placeholder="e.g. Deloitte"
              onChange={(e) => set("prior_employer", e.target.value)} />
          </div>
          <div>
            <label className={LABEL}>Prior Job Title</label>
            <input className={INPUT} value={form.prior_job_title || ""} placeholder="e.g. Senior Accountant"
              onChange={(e) => set("prior_job_title", e.target.value)} />
          </div>
          <div>
            <label className={LABEL}>Industry of Prior Employment</label>
            <select className={SELECT} value={form.prior_industry || ""}
              onChange={(e) => set("prior_industry", e.target.value)}>
              <option value="">Select industry</option>
              {INDUSTRIES.map((i) => <option key={i} value={i}>{i}</option>)}
            </select>
          </div>
          <div>
            <label className={LABEL}>Years of Industry Experience <span className="text-green-600">(+up to 5 pts)</span></label>
            <input className={INPUT} type="number" min={0} max={50}
              value={form.years_industry_experience ?? ""}
              placeholder="e.g. 7"
              onChange={(e) => set("years_industry_experience", e.target.value ? Number(e.target.value) : undefined)} />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={LABEL}>Have you owned a business before? <span className="text-green-600">(+3 pts)</span></label>
            <select className={SELECT} value={form.prior_business_owner === true ? "yes" : form.prior_business_owner === false ? "no" : ""}
              onChange={(e) => set("prior_business_owner", e.target.value === "yes" ? true : e.target.value === "no" ? false : undefined)}>
              <option value="">Select</option>
              <option value="yes">Yes</option>
              <option value="no">No</option>
            </select>
          </div>
          {form.prior_business_owner && (
            <div>
              <label className={LABEL}>Prior Business Name</label>
              <input className={INPUT} value={form.prior_business_name || ""} placeholder="e.g. Nkosi Trading (Pty) Ltd"
                onChange={(e) => set("prior_business_name", e.target.value)} />
            </div>
          )}
        </div>
      </section>

      {/* Section: Education */}
      <section className="rounded-xl border border-gray-200 bg-white p-5 space-y-4">
        <h2 className="text-sm font-bold text-[#071942] border-b border-gray-100 pb-2">
          Education
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={LABEL}>Highest Qualification <span className="text-green-600">(+up to 4 pts)</span></label>
            <select className={SELECT} value={form.highest_qualification || ""}
              onChange={(e) => set("highest_qualification", e.target.value)}>
              <option value="">Select qualification</option>
              {QUALIFICATIONS.map((q) => <option key={q.value} value={q.value}>{q.label}</option>)}
            </select>
          </div>
          <div>
            <label className={LABEL}>Field of Study</label>
            <input className={INPUT} value={form.field_of_study || ""} placeholder="e.g. Civil Engineering"
              onChange={(e) => set("field_of_study", e.target.value)} />
          </div>
        </div>
      </section>

      {/* Section: Identity */}
      <section className="rounded-xl border border-gray-200 bg-white p-5 space-y-4">
        <h2 className="text-sm font-bold text-[#071942] border-b border-gray-100 pb-2">
          Identity Information
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={LABEL}>ID Number (for future bureau pull)</label>
            <input className={INPUT} value={form.id_number || ""} placeholder="e.g. 8501015123081"
              onChange={(e) => set("id_number", e.target.value)} />
          </div>
        </div>
      </section>

      {/* Section: Network & References */}
      <section className="rounded-xl border border-gray-200 bg-white p-5 space-y-4">
        <h2 className="text-sm font-bold text-[#071942] border-b border-gray-100 pb-2">
          Network & References
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={LABEL}>Are you a member of a trade association? <span className="text-green-600">(+2 pts)</span></label>
            <select className={SELECT} value={form.trade_association_member === true ? "yes" : form.trade_association_member === false ? "no" : ""}
              onChange={(e) => set("trade_association_member", e.target.value === "yes" ? true : e.target.value === "no" ? false : undefined)}>
              <option value="">Select</option>
              <option value="yes">Yes</option>
              <option value="no">No</option>
            </select>
          </div>
          {form.trade_association_member && (
            <div>
              <label className={LABEL}>Trade Association Name</label>
              <input className={INPUT} value={form.trade_association_name || ""} placeholder="e.g. SACCI"
                onChange={(e) => set("trade_association_name", e.target.value)} />
            </div>
          )}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className={LABEL}>Reference Contact Name <span className="text-green-600">(+1 pt when provided)</span></label>
            <input className={INPUT} value={form.reference_name || ""} placeholder="e.g. Sipho Nkosi"
              onChange={(e) => set("reference_name", e.target.value)} />
          </div>
          <div>
            <label className={LABEL}>Reference Company</label>
            <input className={INPUT} value={form.reference_company || ""} placeholder="e.g. Nkosi Logistics"
              onChange={(e) => set("reference_company", e.target.value)} />
          </div>
          <div>
            <label className={LABEL}>Reference Phone</label>
            <input className={INPUT} value={form.reference_phone || ""} placeholder="e.g. 082 123 4567"
              onChange={(e) => set("reference_phone", e.target.value)} />
          </div>
        </div>
      </section>

      {/* Action Buttons */}
      <div className="flex justify-end gap-3">
        <button
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center justify-center rounded-lg bg-green-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500/20 active:scale-95 transition disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          {saving ? "Saving..." : "Save Profile"}
        </button>
      </div>

    </div>
  );
}
