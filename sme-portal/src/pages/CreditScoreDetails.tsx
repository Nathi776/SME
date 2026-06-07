import React, { useEffect, useState } from "react";
import { Card, CardContent, Container, Typography, CircularProgress, Stack, Divider, Button } from "@mui/material";
import { SMEApi } from "../api/smeApi";
import { useNavigate } from "react-router-dom";

type BreakdownItem = {
  value: any;
  contribution: number;
};

export default function CreditScoreDetails() {
  const [loading, setLoading] = useState(false);
  const [score, setScore] = useState<number | null>(null);
  const [breakdown, setBreakdown] = useState<Record<string, BreakdownItem> | null>(null);
  const navigate = useNavigate();

  const load = async () => {
    try {
      setLoading(true);
      const dash = await SMEApi.getDashboard();
      const id = dash.data.sme_id;

      const res = await SMEApi.getCreditScoreDetails(id);
      setScore(res.data.score ?? null);
      setBreakdown(res.data.breakdown ?? null);
    } catch (err) {
      setBreakdown(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Stack spacing={2}>
        <Typography variant="h4" sx={{ fontWeight: 800 }}>Credit Score Details</Typography>
        <Button variant="outlined" onClick={() => navigate(-1)}>Back</Button>

        <Card>
          <CardContent>
            {loading && <CircularProgress />}
            {!loading && (
              <div>
                <Typography variant="h5" sx={{ fontWeight: 700 }}>Score: {score ?? "—"}</Typography>

                <Divider sx={{ my: 2 }} />

                {breakdown ? (
                  Object.entries(breakdown).map(([key, item]) => (
                    <div key={key} style={{ marginBottom: 12 }}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>{key}</Typography>
                      <Typography variant="body2" color="text.secondary">Value: {String(item.value)}</Typography>
                      <Typography variant="body2">Contribution: {item.contribution > 0 ? `+${item.contribution}` : item.contribution}</Typography>
                    </div>
                  ))
                ) : (
                  <Typography variant="body2" color="text.secondary">No breakdown available</Typography>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </Stack>
    </Container>
  );
}
