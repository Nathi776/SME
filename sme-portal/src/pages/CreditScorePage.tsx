import React, { useEffect, useState } from "react";
import { Button, Card, CardContent, CircularProgress, Container, Stack, Typography } from "@mui/material";
import { SMEApi } from "../api/smeApi";
import { useNavigate } from "react-router-dom";

type CreditHistoryItem = {
  id: number;
  score: number;
  created_at: string;
};

export default function CreditScorePage() {
  const [loading, setLoading] = useState(false);
  const [smeId, setSmeId] = useState<number | null>(null);
  const [score, setScore] = useState<number | null>(null);
  const [decision, setDecision] = useState<string | null>(null);
  const [history, setHistory] = useState<CreditHistoryItem[]>([]);
  const navigate = useNavigate();

  const loadDashboard = async () => {
    try {
      setLoading(true);
      const res = await SMEApi.getDashboard();
      setSmeId(res.data.sme_id);
    } catch (err) {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  const loadScore = async (id: number) => {
    try {
      setLoading(true);
      const res = await SMEApi.getCreditScore(id);
      setHistory((res.data || []) as CreditHistoryItem[]);
      if (res.data && res.data.length > 0) {
        setScore(res.data[0].score ?? null);
      } else {
        setScore(null);
      }

      try {
        const decisionRes = await SMEApi.getCreditDecision(id);
        setDecision(decisionRes.data?.decision ?? null);
      } catch (err) {
        setDecision(null);
      }
    } catch (err) {
      setScore(null);
      setDecision(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  useEffect(() => {
    if (smeId) loadScore(smeId);
  }, [smeId]);

  const handleRecalculate = async () => {
    if (!smeId) return;
    try {
      setLoading(true);
      await SMEApi.calculateCreditScore(smeId);
      await loadScore(smeId);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Typography variant="h4" sx={{ fontWeight: 800, mb: 2 }}>Credit Score</Typography>
      <Card>
        <CardContent>
          <Stack spacing={2}>
            {loading && <CircularProgress />}
            <Typography variant="h6">Current Score: {score ?? "—"}</Typography>
            <Typography variant="body2" color="text.secondary">Decision: {decision ?? "—"}</Typography>
            <Button variant="contained" onClick={handleRecalculate} disabled={!smeId || loading}>
              Recalculate Score
            </Button>
            <Button variant="outlined" onClick={() => navigate("/credit-score/details")} disabled={!smeId || loading}>
              View Details
            </Button>

            <div>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, mt: 2 }}>History</Typography>
              {history.length === 0 && <Typography variant="body2" color="text.secondary">No score history</Typography>}
              {history.map((h: any) => (
                <div key={h.id} style={{ marginTop: 8 }}>
                  <Typography variant="body2">Score: {h.score} — {new Date(h.created_at).toLocaleString()}</Typography>
                </div>
              ))}
            </div>
          </Stack>
        </CardContent>
      </Card>
    </Container>
  );
}
