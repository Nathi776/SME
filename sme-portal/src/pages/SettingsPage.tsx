import { useEffect, useState } from "react";
import { useSnackbar } from "notistack";
import { Building2, Loader2, Save, Settings } from "lucide-react";
import { SMEApi, type SMECreate } from "../api/smeApi";

const PROVINCES = [
  { value: "",              label: "Select Province" },
  { value: "Eastern Cape",  label: "Eastern Cape" },
  { value: "Free State",     label: "Free State" },
  { value: "Gauteng",        label: "Gauteng" },
  { value: "KwaZulu-Natal",  label: "KwaZulu-Natal" },
  { value: "Limpopo",        label: "Limpopo" },
  { value: "Mpumalanga",     label: "Mpumalanga" },
  { value: "North West",     label: "North West" },
  { value: "Northern Cape",  label: "Northern Cape" },
  { value: "Western Cape",   label: "Western Cape" },
];

const INDUSTRIES = [
  "Construction", "Retail", "Manufacturing", "Technology", "Healthcare",
  "Agriculture", "Transport & Logistics", "Food & Beverage", "Professional Services", "Other",
];

const INPUT  = "w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-400 transition-colors";
const SELECT = `${INPUT} bg-white`;
const LABEL  = "block text-xs font-semibold text-gray-700 mb-1.5";

export default function SettingsPage() {
  const { enqueueSnackbar } = useSnackbar();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [smeId, setSmeId] = useState<number | null>(null);

  const [form, setForm] = useState<SMECreate>({
    name: "",
    industry: "",
    revenue: 0,
    years_active: 0,
    province: "",
    business_city: "",
    description: "",
  });

  useEffect(() => {
    (async () => {
      try {
        const { data: dashboard } = await SMEApi.getDashboard();
        setSmeId(dashboard.sme_id);
        const { data: sme } = await SMEApi.getOne(dashboard.sme_id);
        setForm({
          name: sme.name || "",
          industry: sme.industry || "",
          revenue: Number(sme.revenue) || 0,
          years_active: sme.years_active || 0,
          province: sme.province || "",
          business_city: sme.business_city || "",
          description: sme.description || "",
        });
      } catch (err) {
        enqueueSnackbar("Failed to load business settings.", { variant: "error" });
      } finally {
        setLoading(false);
      }
    })();
  }, [enqueueSnackbar]);

  const handleSave = async () => {
    if (!smeId) return;
    setSaving(true);
    try {
      await SMEApi.update(smeId, form);
      enqueueSnackbar("Business profile updated successfully! Score recalculated.", { variant: "success" });
    } catch (err: any) {
      const msg = err.response?.data?.detail || "Failed to update business settings.";
      enqueueSnackbar(msg, { variant: "error" });
    } finally {
      setSaving(false);
    }
  };

  const set = (field: keyof SMECreate, value: any) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="animate-spin h-8 w-8 text-green-500" />
    </div>
  );

  return (
    <div className="max-w-3xl mx-auto space-y-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[#071942] flex items-center gap-2">
          <Settings className="h-6 w-6 text-gray-500" /> Business Profile Settings
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Manage your business credentials and company registration details.
        </p>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm space-y-6">
        <h2 className="text-sm font-bold text-[#071942] border-b border-gray-100 pb-3 flex items-center gap-2">
          <Building2 className="h-4 w-4 text-green-600" /> Company Profile
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Company Name */}
          <div>
            <label className={LABEL}>Business Name</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              className={INPUT}
            />
          </div>

          {/* Industry */}
          <div>
            <label className={LABEL}>Industry</label>
            <select
              value={form.industry}
              onChange={(e) => set("industry", e.target.value)}
              className={SELECT}
            >
              <option value="">Select Industry</option>
              {INDUSTRIES.map((ind) => (
                <option key={ind} value={ind}>{ind}</option>
              ))}
            </select>
          </div>

          {/* Annual Revenue */}
          <div>
            <label className={LABEL}>Self-Reported Annual Revenue (ZAR)</label>
            <input
              type="number"
              value={form.revenue}
              onChange={(e) => set("revenue", Number(e.target.value))}
              className={INPUT}
            />
          </div>

          {/* Years Active */}
          <div>
            <label className={LABEL}>Years Active</label>
            <input
              type="number"
              value={form.years_active}
              onChange={(e) => set("years_active", Number(e.target.value))}
              className={INPUT}
            />
          </div>

          {/* Province */}
          <div>
            <label className={LABEL}>Province</label>
            <select
              value={form.province || ""}
              onChange={(e) => set("province", e.target.value || null)}
              className={SELECT}
            >
              {PROVINCES.map((prov) => (
                <option key={prov.value} value={prov.value}>{prov.label}</option>
              ))}
            </select>
            <p className="mt-1 text-[10px] text-gray-400">
              * Feeds directly into your Market Viability score.
            </p>
          </div>

          {/* Business City */}
          <div>
            <label className={LABEL}>Business City</label>
            <input
              type="text"
              value={form.business_city || ""}
              onChange={(e) => set("business_city", e.target.value)}
              className={INPUT}
            />
          </div>
        </div>

        {/* Description */}
        <div>
          <label className={LABEL}>Business Description</label>
          <textarea
            value={form.description || ""}
            onChange={(e) => set("description", e.target.value)}
            className={`${INPUT} min-h-[100px] resize-y`}
            placeholder="Tell us about your business services and target clients..."
          />
        </div>

        {/* Action Button */}
        <div className="flex justify-end pt-4 border-t border-gray-100">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 bg-[#1f724f] hover:bg-[#155a3a] text-white font-semibold py-2.5 px-6 rounded-lg transition-colors text-sm shadow-sm hover:shadow"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" /> Save Settings
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
