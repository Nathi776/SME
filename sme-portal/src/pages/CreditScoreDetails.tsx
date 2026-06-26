import React, { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { 
  Card, 
  CardContent, 
  Container, 
  Typography, 
  CircularProgress, 
  Stack, 
  Button, 
  LinearProgress, 
  Box, 
  Chip,
  Alert
} from "@mui/material";
import { ArrowLeft, CheckCircle, AlertTriangle, Sparkles, AlertCircle } from "lucide-react";
import { SMEApi } from "../api/smeApi";

type BreakdownItem = {
  value: any;
  label?: string;
  contribution: number;
  max: number;
  source?: string;
  verified?: string[];
  missing?: string[];
  bank_statement_parsed?: boolean;
  bank_statement_quality?: string[] | null;
};

export default function CreditScoreDetails() {
  const { smeId } = useParams<{ smeId?: string }>();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(false);
  const [score, setScore] = useState<number | null>(null);
  const [breakdown, setBreakdown] = useState<Record<string, BreakdownItem> | null>(null);
  const [smeName, setSmeName] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      let id: number;
      if (smeId) {
        id = Number(smeId);
      } else {
        const dash = await SMEApi.getDashboard();
        id = dash.data.sme_id;
      }

      // Load SME profile to display their company name
      try {
        const profileRes = await SMEApi.getOne(id);
        setSmeName(profileRes.data?.name || null);
      } catch (err) {
        console.error("Could not fetch SME profile name", err);
      }

      const res = await SMEApi.getCreditScoreDetails(id);
      setScore(res.data.score ?? null);
      setBreakdown(res.data.breakdown ?? null);
    } catch (err) {
      setBreakdown(null);
    } finally {
      setLoading(false);
    }
  }, [smeId]);

  useEffect(() => { load(); }, [load]);

  const getDecisionStyles = (scoreVal: number) => {
    if (scoreVal >= 75) {
      return {
        color: "#10b981", // Emerald
        bgColor: "#ecfdf5",
        borderColor: "#a7f3d0",
        label: "Approved",
        rating: "Excellent Risk"
      };
    } else if (scoreVal >= 50) {
      return {
        color: "#f59e0b", // Amber
        bgColor: "#fffbeb",
        borderColor: "#fde68a",
        label: "Under Review",
        rating: "Moderate Risk"
      };
    } else {
      return {
        color: "#ef4444", // Rose
        bgColor: "#fef2f2",
        borderColor: "#fecaca",
        label: "Declined",
        rating: "High Risk"
      };
    }
  };

  const status = score !== null ? getDecisionStyles(score) : null;

  return (
    <Container maxWidth="md" sx={{ py: 4, color: "#071942" }}>
      <Stack spacing={3}>
        {/* Navigation & Header */}
        <Box sx={{ display: "flex", alignItems: "center", justifyItems: "center", justifyContent: "space-between" }}>
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 800, color: "#071942", letterSpacing: "-0.5px" }}>
              Credit Score Explanation
            </Typography>
            {smeName && (
              <Typography variant="subtitle1" sx={{ color: "#5f6d8a", mt: 0.5 }}>
                Analyzing profile for <strong>{smeName}</strong>
              </Typography>
            )}
          </Box>
          <Button 
            variant="outlined" 
            startIcon={<ArrowLeft size={16} />} 
            onClick={() => navigate(-1)}
            sx={{ borderRadius: "10px", textTransform: "none", color: "#5f6d8a", borderColor: "#dfe5f0" }}
          >
            Back
          </Button>
        </Box>

        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
            <CircularProgress sx={{ color: "#1f724f" }} />
          </Box>
        ) : (
          <>
            {/* Overall Score Summary Panel */}
            {score !== null && status && (
              <Card sx={{ borderRadius: "16px", border: "1px solid #e9eef8", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.05)" }}>
                <CardContent sx={{ p: 4 }}>
                  <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 2fr" }, gap: 4, alignItems: "center" }}>
                    <Box sx={{ display: "flex", justifyContent: "center" }}>
                      {/* Circular Gauge Representation */}
                      <Box sx={{ 
                        position: "relative", 
                        display: "inline-flex", 
                        width: 140, 
                        height: 140, 
                        borderRadius: "50%", 
                        border: `8px solid ${status.bgColor}`,
                        borderTopColor: status.color,
                        alignItems: "center", 
                        justifyContent: "center",
                        boxShadow: "inset 0 2px 4px 0 rgb(0 0 0 / 0.06)"
                      }}>
                        <Box sx={{ textAlign: "center" }}>
                          <Typography variant="h3" sx={{ fontWeight: 900, color: "#071942", lineHeight: 1 }}>
                            {Math.round(score)}
                          </Typography>
                          <Typography variant="caption" sx={{ color: "#8f9bba", fontWeight: 700, textTransform: "uppercase" }}>
                            Out of 100
                          </Typography>
                        </Box>
                      </Box>
                    </Box>
                    <Box>
                      <Stack spacing={1.5}>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                          <Chip 
                            label={status.label} 
                            sx={{ 
                              bgcolor: status.bgColor, 
                              color: status.color, 
                              fontWeight: 800, 
                              border: `1px solid ${status.borderColor}`,
                              borderRadius: "8px" 
                            }} 
                          />
                          <Typography variant="h6" sx={{ fontWeight: 800, color: status.color }}>
                            {status.rating}
                          </Typography>
                        </Box>
                        <Typography variant="body2" sx={{ color: "#5f6d8a", lineHeight: 1.6 }}>
                          This score was generated in real-time from active business registration registry details, outstanding invoices timeliness, unpaid balance risk ratios, and verified cashflow signals.
                        </Typography>
                        <Alert 
                          severity={score >= 75 ? "success" : score >= 50 ? "info" : "error"}
                          icon={score >= 75 ? <CheckCircle size={20} /> : score >= 50 ? <AlertTriangle size={20} /> : <AlertCircle size={20} />}
                          sx={{ borderRadius: "10px", mt: 1 }}
                        >
                          {score >= 75 
                            ? "Approved: Safe credit profile. Pre-approved for auto-financing requests."
                            : score >= 50 
                            ? "Review: Moderate credit profile. Requests undergo manual lender risk assessment."
                            : "Declined: Insufficient credit score rating. Pre-invoice financing is currently disabled."}
                        </Alert>
                      </Stack>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            )}

            {/* 6-Factor Breakdowns */}
            {breakdown ? (
              <Stack spacing={3}>
                <Typography variant="h6" sx={{ fontWeight: 800, color: "#071942" }}>
                  Detailed Factor Breakdown
                </Typography>
                
                {Object.entries(breakdown).map(([factorName, item]) => {
                  const percent = item.max > 0 ? (item.contribution / item.max) * 100 : 0;
                  
                  // Color maps for factors based on performance
                  let colorClass = "#10b981"; // Emerald
                  if (percent < 40) colorClass = "#ef4444"; // Rose
                  else if (percent < 75) colorClass = "#f59e0b"; // Amber

                  return (
                    <Card key={factorName} sx={{ borderRadius: "16px", border: "1px solid #e9eef8", boxShadow: "0 1px 3px 0 rgb(0 0 0 / 0.05)" }}>
                      <CardContent sx={{ p: 3 }}>
                        <Stack spacing={2}>
                          {/* Factor Header */}
                          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
                            <Box sx={{ flex: 1 }}>
                              <Typography variant="subtitle1" sx={{ fontWeight: 800, color: "#071942" }}>
                                {factorName}
                              </Typography>
                              <Typography variant="caption" sx={{ color: "#5f6d8a", mt: 0.5, display: "block" }}>
                                Value Analyzed: <strong>{item.label || String(item.value ?? "N/A")}</strong>
                              </Typography>
                            </Box>
                            <Box sx={{ textAlign: "right" }}>
                              <Typography variant="subtitle2" sx={{ fontWeight: 900, color: colorClass }}>
                                {item.contribution} / {item.max} pts
                              </Typography>
                              <Typography variant="caption" sx={{ color: "#8f9bba" }}>
                                Contribution
                              </Typography>
                            </Box>
                          </Box>

                          {/* Progress Indicator */}
                          <Box sx={{ width: "100%" }}>
                            <LinearProgress 
                              variant="determinate" 
                              value={percent} 
                              sx={{ 
                                height: 8, 
                                borderRadius: 4, 
                                bgcolor: "#edf2fa",
                                "& .MuiLinearProgress-bar": {
                                  bgcolor: colorClass,
                                  borderRadius: 4
                                }
                              }} 
                            />
                          </Box>

                          {/* Nested Special Sub-Breakdowns */}
                          
                          {/* Verification Depth Documents List */}
                          {factorName === "Verification Depth" && (item.verified || item.missing) && (
                            <Box sx={{ pt: 1, borderTop: "1px dashed #e9eef8" }}>
                              <Typography variant="caption" sx={{ color: "#8f9bba", fontWeight: 700, textTransform: "uppercase", display: "block", mb: 1 }}>
                                Verification Assets Status
                              </Typography>
                              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
                                {item.verified?.map((doc) => (
                                  <Chip 
                                    key={doc}
                                    icon={<CheckCircle size={12} color="#10b981" />}
                                    label={`${doc.toUpperCase()} Verified`}
                                    size="small"
                                    sx={{ bgcolor: "#ecfdf5", border: "1px solid #a7f3d0", color: "#065f46", fontSize: "10px", fontWeight: 700 }}
                                  />
                                ))}
                                {item.missing?.map((doc) => (
                                  <Chip 
                                    key={doc}
                                    icon={<AlertTriangle size={12} color="#f59e0b" />}
                                    label={`${doc.toUpperCase()} Missing`}
                                    size="small"
                                    sx={{ bgcolor: "#fffbeb", border: "1px solid #fde68a", color: "#92400e", fontSize: "10px", fontWeight: 700 }}
                                  />
                                ))}
                              </Box>
                            </Box>
                          )}

                          {/* Bank Statement Parsing Signals List */}
                          {factorName === "Verification Depth" && item.bank_statement_parsed && (
                            <Box sx={{ pt: 1.5, px: 2, pb: 1.5, bgcolor: "#ecfdf5/40", border: "1px solid #a7f3d0/30", borderRadius: "12px", mt: 1 }}>
                              <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
                                <Sparkles size={14} color="#059669" />
                                <Typography variant="caption" sx={{ color: "#047857", fontWeight: 800 }}>
                                  Bank Statement parsing bonus active
                                </Typography>
                              </Box>
                              {item.bank_statement_quality && item.bank_statement_quality.length > 0 ? (
                                <ul style={{ margin: 0, paddingLeft: "16px", color: "#065f46", fontSize: "11px" }}>
                                  {item.bank_statement_quality.map((detail, idx) => (
                                    <li key={idx} style={{ marginTop: "2px" }}>
                                      {detail}
                                    </li>
                                  ))}
                                </ul>
                              ) : (
                                <Typography variant="caption" sx={{ color: "#5f6d8a", display: "block" }}>
                                  No premium cashflow quality bonuses identified in statement.
                                </Typography>
                              )}
                            </Box>
                          )}
                        </Stack>
                      </CardContent>
                    </Card>
                  );
                })}
              </Stack>
            ) : (
              <Card sx={{ borderRadius: "16px", border: "1px solid #e9eef8", p: 4, textItems: "center" }}>
                <Typography variant="body1" sx={{ color: "#5f6d8a" }}>
                  No factor breakdown details are currently available. Generate a credit score first.
                </Typography>
              </Card>
            )}
          </>
        )}
      </Stack>
    </Container>
  );
}
