import React, { useEffect, useState } from "react";
import { AdminApi } from "../api/adminApi";
import { Key, Copy, Check, Trash2, ShieldAlert, Plus, Loader2 } from "lucide-react";

interface APIKeyItem {
  id: number;
  name: string;
  consumer_type: string;
  created_at: string;
  last_used_at: string | null;
  is_active: boolean;
}

export default function AdminAPIKeysPage() {
  const [keys, setKeys] = useState<APIKeyItem[]>([]);
  const [name, setName] = useState("");
  const [consumerType, setConsumerType] = useState("lender");
  const [loading, setLoading] = useState(false);
  const [listLoading, setListLoading] = useState(false);
  const [error, setError] = useState("");
  const [successKey, setSuccessKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const fetchKeys = async () => {
    setListLoading(true);
    try {
      const res = await AdminApi.listAPIKeys();
      setKeys(res.data || []);
    } catch (err) {
      console.error(err);
      setError("Failed to load API keys.");
    } finally {
      setListLoading(false);
    }
  };

  useEffect(() => {
    fetchKeys();
  }, []);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    setError("");
    setSuccessKey(null);
    setCopied(false);

    try {
      const res = await AdminApi.generateAPIKey(name.trim(), consumerType);
      setSuccessKey(res.data.api_key);
      setName("");
      fetchKeys();
    } catch (err) {
      console.error(err);
      setError("Failed to generate API key.");
    } finally {
      setLoading(false);
    }
  };

  const handleRevoke = async (id: number) => {
    if (!window.confirm("Are you sure you want to revoke this API key? This cannot be undone.")) return;
    try {
      await AdminApi.revokeAPIKey(id);
      fetchKeys();
    } catch (err) {
      console.error(err);
      alert("Failed to revoke API key.");
    }
  };

  const handleCopy = () => {
    if (!successKey) return;
    navigator.clipboard.writeText(successKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto py-2">
      {/* Title */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center gap-3">
          <Key className="h-7 w-7 text-indigo-600" /> API Integration Keys
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          Generate and manage secure API keys for external consumption by lenders, developers, and partners.
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-3 text-sm">
          <ShieldAlert className="h-5 w-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Success Box for new API Key */}
      {successKey && (
        <div className="bg-emerald-50 border-2 border-emerald-300 rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex items-start gap-3">
            <div className="bg-emerald-500 text-white rounded-full p-1 mt-0.5">
              <Check className="h-4 w-4" />
            </div>
            <div>
              <h3 className="font-semibold text-emerald-800">API Key Generated Successfully</h3>
              <p className="text-emerald-700 text-xs mt-0.5">
                Copy this key now. For security reasons, it will not be shown again.
              </p>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center bg-white border border-emerald-200 p-2.5 rounded-lg">
            <span className="font-mono text-sm break-all flex-1 select-all px-2 py-1 text-slate-800 bg-slate-50 border border-slate-100 rounded">
              {successKey}
            </span>
            <button
              onClick={handleCopy}
              className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold px-4 py-2 rounded-md transition-all shrink-0"
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  Copy to Clipboard
                </>
              )}
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Section 1: Generate Key Form */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-6 h-fit">
          <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
            <Plus className="h-5 w-5 text-indigo-500" /> Generate New Key
          </h2>
          <form onSubmit={handleGenerate} className="space-y-4">
            <div>
              <label htmlFor="name-input" className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">
                Application Name / Label
              </label>
              <input
                id="name-input"
                type="text"
                placeholder="e.g. Nedbank Integration"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full border border-slate-200 rounded-lg px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
              />
            </div>

            <div>
              <label htmlFor="consumer-type" className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">
                Consumer Type
              </label>
              <select
                id="consumer-type"
                value={consumerType}
                onChange={(e) => setConsumerType(e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3.5 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
              >
                <option value="lender">Lender</option>
                <option value="government">Government</option>
                <option value="corporate">Corporate</option>
                <option value="developer">Developer</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={loading || !name.trim()}
              className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 disabled:text-slate-400 text-white font-semibold py-2.5 rounded-lg transition-all text-sm cursor-pointer shadow-sm hover:shadow"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Key className="h-4 w-4" />
                  Generate Key
                </>
              )}
            </button>
          </form>
        </div>

        {/* Section 2: Active Keys Table */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-200/80 p-6 flex flex-col">
          <h2 className="text-lg font-bold text-slate-800 mb-4">Active API Keys</h2>
          
          <div className="flex-1 overflow-x-auto">
            {listLoading && keys.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-slate-400 space-y-2">
                <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
                <span className="text-sm">Fetching keys...</span>
              </div>
            ) : keys.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-slate-400 border border-dashed border-slate-200 rounded-xl">
                <Key className="h-10 w-10 text-slate-300 mb-2" />
                <span className="text-sm font-medium">No API keys generated yet.</span>
                <span className="text-xs text-slate-400">Generate a key on the left to get started.</span>
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-500 text-xs font-semibold uppercase tracking-wider">
                    <th className="pb-3 px-3">Name</th>
                    <th className="pb-3 px-3">Consumer Type</th>
                    <th className="pb-3 px-3">Created</th>
                    <th className="pb-3 px-3">Last Used</th>
                    <th className="pb-3 px-3">Status</th>
                    <th className="pb-3 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
                  {keys.map((k) => (
                    <tr key={k.id} className="hover:bg-slate-50/55 transition-colors">
                      <td className="py-3.5 px-3 font-semibold text-slate-800">{k.name}</td>
                      <td className="py-3.5 px-3 capitalize">
                        <span className="inline-block bg-slate-100 text-slate-700 text-[11px] font-bold px-2 py-0.5 rounded">
                          {k.consumer_type}
                        </span>
                      </td>
                      <td className="py-3.5 px-3 text-slate-500 text-xs">
                        {k.created_at ? new Date(k.created_at).toLocaleDateString() : "—"}
                      </td>
                      <td className="py-3.5 px-3 text-slate-500 text-xs">
                        {k.last_used_at ? new Date(k.last_used_at).toLocaleString() : "Never"}
                      </td>
                      <td className="py-3.5 px-3">
                        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          k.is_active 
                            ? "bg-emerald-50 text-emerald-700" 
                            : "bg-red-50 text-red-700"
                        }`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${k.is_active ? "bg-emerald-500" : "bg-red-500"}`}></span>
                          {k.is_active ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="py-3.5 px-3 text-right">
                        {k.is_active && (
                          <button
                            onClick={() => handleRevoke(k.id)}
                            className="text-red-500 hover:text-red-700 p-1.5 rounded hover:bg-red-50 transition cursor-pointer"
                            title="Revoke API Key"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
