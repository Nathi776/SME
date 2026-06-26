import { useNavigate } from "react-router-dom";
import { UploadCloud, CheckCircle, AlertCircle, ArrowRight, Sparkles } from "lucide-react";

type ScoreImprovementPanelProps = {
  missingDocs: string[];
};

const DOCUMENT_GUIDANCE: Record<string, { label: string; pts: number }> = {
  cipc: { label: "CIPC Registration Certificate", pts: 10 },
  bank_statement: { label: "Verified Bank Statement", pts: 8 },
  tax_clearance: { label: "Tax Clearance Certificate", pts: 5 },
  registration_docs: { label: "Company Registration Documents", pts: 2 },
};

export default function ScoreImprovementPanel({ missingDocs }: ScoreImprovementPanelProps) {
  const navigate = useNavigate();

  // Filter missing docs to only those we have guidance for
  const actionableDocs = missingDocs.filter(doc => doc in DOCUMENT_GUIDANCE);

  return (
    <div className="flex flex-col rounded-xl border border-[#e9eef8] bg-white p-5 shadow-sm min-h-[380px] justify-between">
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="h-5 w-5 text-emerald-600 animate-pulse" />
          <h3 className="text-[15px] font-bold text-[#071942]">Boost Your Credit Score</h3>
        </div>
        <p className="text-xs text-[#5f6d8a] mb-5 leading-relaxed">
          Complete the verification steps below to increase your eligibility and unlock lower financing fee rates.
        </p>

        {actionableDocs.length > 0 ? (
          <div className="space-y-3.5">
            {actionableDocs.map((docKey) => {
              const info = DOCUMENT_GUIDANCE[docKey];
              return (
                <div 
                  key={docKey}
                  onClick={() => navigate("/documents")}
                  className="flex items-center justify-between p-3.5 rounded-xl border border-slate-100 hover:border-emerald-350 hover:bg-emerald-50/5 transition-all cursor-pointer group"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600 border border-amber-100 group-hover:bg-emerald-50 group-hover:text-emerald-600 group-hover:border-emerald-100 transition-all">
                      <UploadCloud className="h-4.5 w-4.5" />
                    </div>
                    <div>
                      <p className="text-[11.5px] font-extrabold text-[#071942] line-clamp-1">
                        Upload {info.label}
                      </p>
                      <p className="text-[10px] text-[#8f9bba] mt-0.5">Increase your underwriting profile</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 pl-2 shrink-0">
                    <span className="inline-flex rounded-full bg-emerald-100 px-2 py-0.5 text-[9px] font-black text-emerald-800 uppercase tracking-wider">
                      +{info.pts} pts
                    </span>
                    <ArrowRight className="h-3.5 w-3.5 text-[#91a1bf] group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-[#dfe5f0] bg-slate-50/50 p-5 text-center">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100 mb-3">
              <CheckCircle className="h-6 w-6" />
            </div>
            <h4 className="text-xs font-bold text-[#071942]">All Documents Verified!</h4>
            <p className="text-[10px] text-[#5f6d8a] mt-1.5 leading-relaxed max-w-[220px] mx-auto">
              Your profile verification is 100% complete. Continue paying financed invoices on time to improve score.
            </p>
          </div>
        )}
      </div>

      <div className="mt-6 border-t border-slate-100 pt-4">
        <div className="flex items-start gap-2.5 rounded-lg bg-slate-50 p-3 text-[10px] text-[#5f6d8a] leading-relaxed">
          <AlertCircle className="h-4 w-4 shrink-0 text-slate-400 mt-0.5" />
          <span>
            Financing eligibility caps and rates dynamically adjust as documents undergo review and approval.
          </span>
        </div>
      </div>
    </div>
  );
}
