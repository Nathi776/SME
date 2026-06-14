import React, { useEffect, useMemo, useState } from "react";
import { Alert, Button, Card, CardContent, Container, FormControlLabel, LinearProgress, Stack, Switch, TextField, Typography } from "@mui/material";
import { LenderApi, type AvailableSme, type LenderProfile } from "../api/lenderApi";
import LenderLayout from "../components/lender/LenderLayout";

export default function LenderDecisionEngine() {
  const [enabled, setEnabled] = useState(true);
  const [minScore, setMinScore] = useState(60);
  const [profile, setProfile] = useState<LenderProfile | null>(null);
  const [availableSmes, setAvailableSmes] = useState<AvailableSme[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;

    const load = async () => {
      try {
        setLoading(true);
        const [profileResponse, smesResponse] = await Promise.all([
          LenderApi.getProfile(),
          LenderApi.getAvailableSMEs(),
        ]);

        if (!alive) return;

        setProfile(profileResponse.data);
        setMinScore(profileResponse.data.min_credit_score ?? 60);
        setAvailableSmes(smesResponse.data ?? []);
        setMessage(null);
      } catch (err) {
        if (!alive) return;
        setMessage(err instanceof Error ? err.message : "Failed to load decision engine settings");
      } finally {
        if (alive) setLoading(false);
      }
    };

    void load();

    return () => {
      alive = false;
    };
  }, []);

  const eligibleSmes = useMemo(() => {
    return availableSmes.filter((sme) => (sme.credit_score ?? 0) >= minScore);
  }, [availableSmes, minScore]);

  const handleSave = async () => {
    try {
      setSaving(true);
      if (!profile) {
        setMessage("Load your lender profile first.");
        return;
      }

      await LenderApi.updateProfile({
        ...profile,
        min_credit_score: minScore,
      });
      setMessage("Decision engine settings saved.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Could not save decision engine settings");
    } finally {
      setSaving(false);
    }
  };

  return (
    <LenderLayout>
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 800, mb: 2 }}>Decision Engine</Typography>
        <Card>
          <CardContent>
            <Stack spacing={3}>
              {loading && <LinearProgress />}
              {message && <Alert severity={message.includes("saved") ? "success" : "info"}>{message}</Alert>}

              <FormControlLabel control={<Switch checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />} label="Enable Decision Engine" />

              <div>
                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>Basic Rule</Typography>
                <Typography variant="body2" color="text.secondary">Automatically approve requests with credit score above threshold.</Typography>
                <TextField type="number" label="Minimum score to auto-approve" value={minScore} onChange={(e) => setMinScore(Number(e.target.value))} sx={{ mt: 1 }} />
              </div>

              <div>
                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>Decision Preview</Typography>
                <Typography variant="body2" color="text.secondary">
                  {eligibleSmes.length} of {availableSmes.length} SMEs currently meet your threshold.
                </Typography>
                <Stack spacing={1} sx={{ mt: 2 }}>
                  {eligibleSmes.slice(0, 5).map((sme) => (
                    <Stack key={sme.sme_id} direction="row" justifyContent="space-between" sx={{ borderBottom: "1px solid", borderColor: "divider", pb: 1 }}>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>{sme.company_name}</Typography>
                      <Typography variant="body2" color="text.secondary">Score {sme.credit_score ?? 0}</Typography>
                    </Stack>
                  ))}
                  {eligibleSmes.length === 0 && (
                    <Typography variant="body2" color="text.secondary">No SMEs currently meet the threshold.</Typography>
                  )}
                </Stack>
              </div>

              <div>
                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>Custom Rules</Typography>
                <Typography variant="body2" color="text.secondary">This threshold is backed by the lender profile and can be extended later for more rules.</Typography>
              </div>

              <Button variant="contained" onClick={handleSave} disabled={saving || loading}>Save</Button>
            </Stack>
          </CardContent>
        </Card>
      </Container>
    </LenderLayout>
  );
}
