import React, { useEffect, useState } from "react";
import { Container, Typography, Card, CardContent, Grid, Button } from "@mui/material";
import { AdminApi } from "../api/adminApi";

export default function AdminDashboard() {
  const [pendingCount, setPendingCount] = useState<number | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await AdminApi.listPendingVerifications();
        setPendingCount(res.data.length);
      } catch (err) {
        setPendingCount(0);
      }
    };
    load();
  }, []);

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" sx={{ fontWeight: 800, mb: 3 }}>
        Admin Dashboard
      </Typography>

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 4 }}>
          <Card>
            <CardContent>
              <Typography variant="subtitle2" color="text.secondary">
                Pending Verifications
              </Typography>
              <Typography variant="h5" sx={{ mt: 1, fontWeight: 700 }}>
                {pendingCount ?? "—"}
              </Typography>
              <Button sx={{ mt: 2 }} href="/admin/verifications">
                Review
              </Button>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Container>
  );
}
