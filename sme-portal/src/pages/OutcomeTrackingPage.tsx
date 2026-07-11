import { useEffect, useState } from "react";
import {
  Activity, Calendar, DollarSign, CheckCircle2, XCircle, AlertCircle,
  Loader2, ChevronDown, ChevronUp, RefreshCw, BarChart2, Briefcase
} from "lucide-react";
import { OutcomeApi, type SmeOutcome, type CheckinSubmit } from "../api/outcomeApi";

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-blue-100 text-blue-800 border-blue-200",
  active: "bg-green-100 text-green-800 border-green-200",
  repaid: "bg-emerald-100 text-emerald-800 border-emerald-200",
  defaulted: "bg-red-100 text-red-800 border-red-200",
};

export default function OutcomeTrackingPage() {
  const [outcomes, setOutcomes] = useState<SmeOutcome[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Collapsed recommendations state
  const [expandedOutcome, setExpandedOutcome] = useState<Record<number, boolean>>({});

  // Checkin form state
  const [activeCheckin, setActiveCheckin] = useState<{ outcomeId: number; interval: number } | null>(null);
  const [formStillOperating, setFormStillOperating] = useState<boolean>(true);
  const [formRevenue, setFormRevenue] = useState<string>("");
  const [formLoanRepaid, setFormLoanRepaid] = useState<boolean>(false);
  const [submittingCheckin, setSubmittingCheckin] = useState(false);

  const fetchHistory = () => {
    setLoading(true);
    OutcomeApi.getHistory()
      .then(({ data }) => {
        setOutcomes(data);
        setError(null);
      })
      .catch(() => {
        setError("Failed to load outcome tracking history. Please try again.");
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const toggleExpand = (outcomeId: number) => {
    setExpandedOutcome((prev) => ({
      ...prev,
      [outcomeId]: !prev[outcomeId],
    }));
  };

  const handleOpenForm = (outcomeId: number, interval: number) => {
    setActiveCheckin({ outcomeId, interval });
    setFormStillOperating(true);
    setFormRevenue("");
    setFormLoanRepaid(false);
  };

  const handleCloseForm = () => {
    setActiveCheckin(null);
  };

  const handleSubmitCheckin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCheckin) return;

    const revenueNum = parseFloat(formRevenue);
    if (isNaN(revenueNum) || revenueNum < 0) {
      alert("Please enter a valid positive revenue amount.");
      return;
    }

    setSubmittingCheckin(true);
    const data: CheckinSubmit = {
      interval: activeCheckin.interval,
      still_operating: formStillOperating,
      revenue: revenueNum,
      loan_repaid: formLoanRepaid,
    };

    OutcomeApi.submitCheckin(activeCheckin.outcomeId, data)
      .then(() => {
        handleCloseForm();
        fetchHistory(); // Refresh data to reflect updated statuses and outcomes
      })
      .catch((err) => {
        alert(err.response?.data?.detail || "Failed to submit check-in. Please try again.");
      })
      .finally(() => {
        setSubmittingCheckin(false);
      });
  };

  if (loading && outcomes.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin h-8 w-8 text-green-500" />
      </div>
    );
  }

  if (error && outcomes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <AlertCircle className="h-8 w-8 text-red-400" />
        <p className="text-sm text-gray-500">{error}</p>
        <button
          onClick={fetchHistory}
          className="flex items-center gap-1 text-xs font-semibold text-[#1f724f] hover:text-[#155a3a] transition-colors"
        >
          <RefreshCw className="h-4.5 w-4.5" /> Try again
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 p-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#071942]">Outcome Tracking</h1>
          <p className="mt-1 text-sm text-gray-500">
            Monitor and submit operational check-ins for your funded financing deals.
          </p>
        </div>
        <button
          onClick={fetchHistory}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh
        </button>
      </div>

      {outcomes.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-12 text-center">
          <Briefcase className="h-10 w-10 text-gray-400 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-gray-700">No funded deals found</h3>
          <p className="text-sm text-gray-500 mt-1">
            Once a finance request has been funded, its outcome history and check-in timeline will appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {outcomes.map((outcome) => {
            const isExpanded = !!expandedOutcome[outcome.id];
            const followedCount = outcome.followed_recommendations?.filter(r => r.followed).length || 0;
            const totalRecs = outcome.outstanding_recommendations?.length || 0;
            const progressPct = totalRecs > 0 ? Math.round((followedCount / totalRecs) * 100) : 0;

            return (
              <div key={outcome.id} className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
                
                {/* Outcome card head */}
                <div className="p-5 border-b border-gray-100 bg-gray-50/50 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-semibold text-gray-500">Deal #{outcome.finance_request_id}</span>
                      <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${STATUS_COLORS[outcome.outcome_status] || "bg-gray-100"}`}>
                        {outcome.outcome_status.toUpperCase()}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-5 w-5 text-gray-400 -mr-1" />
                      <span className="text-xl font-bold text-[#071942]">{outcome.amount.toLocaleString()}</span>
                      <span className="text-xs text-gray-400">funded at {new Date(outcome.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="text-xs text-gray-500">Score at Funding</div>
                      <div className="text-lg font-bold text-green-600">{outcome.score_at_funding.toFixed(1)}</div>
                    </div>
                    
                    <button
                      onClick={() => toggleExpand(outcome.id)}
                      className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors"
                      title={isExpanded ? "Show Less" : "Show Details"}
                    >
                      {isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                    </button>
                  </div>
                </div>

                {/* Outcome card body */}
                <div className="p-5 space-y-6">
                  
                  {/* Timeline block */}
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-4 flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5" /> Check-in Timelines
                    </h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      
                      {/* 90 Days Check-in */}
                      <div className={`p-4 rounded-xl border ${outcome.checkin_90_completed ? "bg-green-50/30 border-green-100" : "bg-white border-gray-100"} space-y-3`}>
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-semibold text-[#071942]">90 Days Check-in</span>
                          {outcome.checkin_90_completed ? (
                            <CheckCircle2 className="h-5 w-5 text-green-500" />
                          ) : (
                            <div className="w-5 h-5 rounded-full border-2 border-dashed border-gray-300" />
                          )}
                        </div>
                        
                        {outcome.checkin_90_completed ? (
                          <div className="text-xs text-gray-600 space-y-1">
                            <div>Submitted: {new Date(outcome.checkin_90_date!).toLocaleDateString()}</div>
                            <div>Revenue: R{outcome.checkin_90_revenue?.toLocaleString()}</div>
                            <div>Operating: {outcome.checkin_90_still_operating ? "Yes" : "No"}</div>
                            <div>Loan Repaid: {outcome.checkin_90_loan_repaid ? "Yes" : "No"}</div>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <div className="text-xs text-gray-500">
                              Due Date: {outcome.check_in_90_due_at ? new Date(outcome.check_in_90_due_at).toLocaleDateString() : "Pending"}
                            </div>
                            <button
                              onClick={() => handleOpenForm(outcome.id, 90)}
                              className="w-full text-center py-1.5 bg-[#1f724f] hover:bg-[#155a3a] text-white text-xs font-semibold rounded-lg transition-colors"
                            >
                              Submit Check-in
                            </button>
                          </div>
                        )}
                      </div>

                      {/* 180 Days Check-in */}
                      <div className={`p-4 rounded-xl border ${outcome.checkin_180_completed ? "bg-green-50/30 border-green-100" : "bg-white border-gray-100"} space-y-3`}>
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-semibold text-[#071942]">180 Days Check-in</span>
                          {outcome.checkin_180_completed ? (
                            <CheckCircle2 className="h-5 w-5 text-green-500" />
                          ) : (
                            <div className="w-5 h-5 rounded-full border-2 border-dashed border-gray-300" />
                          )}
                        </div>
                        
                        {outcome.checkin_180_completed ? (
                          <div className="text-xs text-gray-600 space-y-1">
                            <div>Submitted: {new Date(outcome.checkin_180_date!).toLocaleDateString()}</div>
                            <div>Revenue: R{outcome.checkin_180_revenue?.toLocaleString()}</div>
                            <div>Operating: {outcome.checkin_180_still_operating ? "Yes" : "No"}</div>
                            <div>Loan Repaid: {outcome.checkin_180_loan_repaid ? "Yes" : "No"}</div>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <div className="text-xs text-gray-500">
                              Due Date: {outcome.check_in_180_due_at ? new Date(outcome.check_in_180_due_at).toLocaleDateString() : "Pending"}
                            </div>
                            <button
                              onClick={() => handleOpenForm(outcome.id, 180)}
                              className="w-full text-center py-1.5 bg-[#1f724f] hover:bg-[#155a3a] text-white text-xs font-semibold rounded-lg transition-colors"
                            >
                              Submit Check-in
                            </button>
                          </div>
                        )}
                      </div>

                      {/* 365 Days Check-in */}
                      <div className={`p-4 rounded-xl border ${outcome.checkin_365_completed ? "bg-green-50/30 border-green-100" : "bg-white border-gray-100"} space-y-3`}>
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-semibold text-[#071942]">365 Days Check-in</span>
                          {outcome.checkin_365_completed ? (
                            <CheckCircle2 className="h-5 w-5 text-green-500" />
                          ) : (
                            <div className="w-5 h-5 rounded-full border-2 border-dashed border-gray-300" />
                          )}
                        </div>
                        
                        {outcome.checkin_365_completed ? (
                          <div className="text-xs text-gray-600 space-y-1">
                            <div>Submitted: {new Date(outcome.checkin_365_date!).toLocaleDateString()}</div>
                            <div>Revenue: R{outcome.checkin_365_revenue?.toLocaleString()}</div>
                            <div>Operating: {outcome.checkin_365_still_operating ? "Yes" : "No"}</div>
                            <div>Loan Repaid: {outcome.checkin_365_loan_repaid ? "Yes" : "No"}</div>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <div className="text-xs text-gray-500">
                              Due Date: {outcome.check_in_365_due_at ? new Date(outcome.check_in_365_due_at).toLocaleDateString() : "Pending"}
                            </div>
                            <button
                              onClick={() => handleOpenForm(outcome.id, 365)}
                              className="w-full text-center py-1.5 bg-[#1f724f] hover:bg-[#155a3a] text-white text-xs font-semibold rounded-lg transition-colors"
                            >
                              Submit Check-in
                            </button>
                          </div>
                        )}
                      </div>

                    </div>
                  </div>

                  {/* Dynamic recommendations progress */}
                  <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 flex flex-col sm:flex-row items-center gap-4">
                    <div className="flex-shrink-0 flex items-center justify-center w-12 h-12 bg-white rounded-full border border-gray-200">
                      <BarChart2 className="h-6 w-6 text-green-600" />
                    </div>
                    <div className="flex-1 text-center sm:text-left space-y-1">
                      <h4 className="text-sm font-semibold text-[#071942]">Coaching Roadmap Followed</h4>
                      <p className="text-xs text-gray-500">
                        You have completed {followedCount} of the {totalRecs} recommendations snapshotted at funding.
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div className="h-full bg-green-500" style={{ width: `${progressPct}%` }} />
                      </div>
                      <span className="text-xs font-bold text-gray-700">{progressPct}%</span>
                    </div>
                  </div>

                  {/* Expanded block containing recommendations snapshot */}
                  {isExpanded && (
                    <div className="pt-4 border-t border-gray-100 space-y-3">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400">
                        Outstanding Recommendations Snapshot
                      </h4>
                      
                      {totalRecs === 0 ? (
                        <div className="text-xs text-gray-500 italic">No recommendations were outstanding.</div>
                      ) : (
                        <div className="space-y-2">
                          {outcome.followed_recommendations?.map((rec, rIdx) => (
                            <div key={rIdx} className="flex justify-between items-center p-3 rounded-lg border border-gray-100 bg-white hover:bg-gray-50/50 transition-colors">
                              <div className="space-y-0.5">
                                <div className="text-xs text-gray-400">{rec.category}</div>
                                <div className="text-sm font-semibold text-gray-800">{rec.action}</div>
                              </div>
                              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1 ${rec.followed ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>
                                {rec.followed ? (
                                  <>
                                    <CheckCircle2 className="h-3 w-3" /> Done
                                  </>
                                ) : (
                                  <>
                                    <XCircle className="h-3 w-3" /> Not Done
                                  </>
                                )}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* Checkin Submission Form Modal */}
      {activeCheckin && (
        <div className="fixed inset-0 bg-black/55 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-gray-100 overflow-hidden transform scale-100 transition-all">
            
            <div className="px-6 py-5 bg-[#071942] text-white flex justify-between items-center">
              <div>
                <h2 className="text-lg font-bold">Submit Check-in</h2>
                <p className="text-xs text-white/70">For Deal #{activeCheckin.outcomeId} ({activeCheckin.interval} Days)</p>
              </div>
              <button
                onClick={handleCloseForm}
                className="text-white/80 hover:text-white text-lg font-semibold"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSubmitCheckin} className="p-6 space-y-5">
              
              {/* Still operating field */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700">
                  Is your business still operating?
                </label>
                <div className="flex gap-4">
                  <button
                    type="button"
                    onClick={() => setFormStillOperating(true)}
                    className={`flex-1 py-2 text-sm font-semibold border rounded-lg transition-all ${formStillOperating ? "bg-[#1f724f] border-[#1f724f] text-white" : "bg-white border-gray-200 text-gray-700"}`}
                  >
                    Yes
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormStillOperating(false)}
                    className={`flex-1 py-2 text-sm font-semibold border rounded-lg transition-all ${!formStillOperating ? "bg-red-600 border-red-600 text-white" : "bg-white border-gray-200 text-gray-700"}`}
                  >
                    No
                  </button>
                </div>
              </div>

              {/* Revenue field */}
              <div className="space-y-2">
                <label htmlFor="revenue" className="block text-sm font-semibold text-gray-700">
                  Current Revenue (since last check-in)
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400 font-semibold">
                    R
                  </div>
                  <input
                    type="number"
                    id="revenue"
                    value={formRevenue}
                    onChange={(e) => setFormRevenue(e.target.value)}
                    required
                    placeholder="Enter revenue amount"
                    className="w-full pl-8 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-green-500 transition-colors"
                  />
                </div>
              </div>

              {/* Loan repaid field */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700">
                  Has the financing been fully repaid?
                </label>
                <div className="flex gap-4">
                  <button
                    type="button"
                    onClick={() => setFormLoanRepaid(true)}
                    className={`flex-1 py-2 text-sm font-semibold border rounded-lg transition-all ${formLoanRepaid ? "bg-[#1f724f] border-[#1f724f] text-white" : "bg-white border-gray-200 text-gray-700"}`}
                  >
                    Yes
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormLoanRepaid(false)}
                    className={`flex-1 py-2 text-sm font-semibold border rounded-lg transition-all ${!formLoanRepaid ? "bg-gray-100 border-gray-200 text-gray-700" : "bg-white border-gray-200 text-gray-700"}`}
                  >
                    No
                  </button>
                </div>
              </div>

              {/* Form buttons */}
              <div className="pt-3 flex gap-3">
                <button
                  type="button"
                  onClick={handleCloseForm}
                  className="flex-1 py-2 border border-gray-200 hover:bg-gray-50 text-sm font-semibold text-gray-600 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingCheckin}
                  className="flex-1 py-2 bg-[#1f724f] hover:bg-[#155a3a] disabled:bg-[#1f724f]/60 text-white text-sm font-semibold rounded-lg transition-colors flex items-center justify-center gap-1.5"
                >
                  {submittingCheckin ? (
                    <>
                      <Loader2 className="h-4.5 w-4.5 animate-spin" /> Submitting...
                    </>
                  ) : (
                    "Submit"
                  )}
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
}
