import React, { useEffect, useState } from "react";
import {
  Container,
  Typography,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Button,
  Stack,
  TextField,
} from "@mui/material";
import { AdminApi, VerificationItem } from "../api/adminApi";

export default function AdminVerifications() {
  const [items, setItems] = useState<VerificationItem[]>([]);
  const [notes, setNotes] = useState<Record<number, string>>({});

  const load = async () => {
    try {
      const res = await AdminApi.listPendingVerifications();
      setItems(res.data || []);
    } catch (err) {
      setItems([]);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleAction = async (id: number, action: "approve" | "reject") => {
    try {
      if (action === "approve") await AdminApi.approveVerification(id, notes[id]);
      else await AdminApi.rejectVerification(id, notes[id]);
      await load();
    } catch (err) {
      console.error(err);
      alert("Failed to perform action");
    }
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" sx={{ fontWeight: 800, mb: 3 }}>
        Review Verifications
      </Typography>

      <Card>
        <CardContent>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>ID</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Entity</TableCell>
                <TableCell>Submitted</TableCell>
                <TableCell>Notes</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {items.map((it) => (
                <TableRow key={it.id}>
                  <TableCell>#{it.id}</TableCell>
                  <TableCell>{it.doc_type}</TableCell>
                  <TableCell>{it.sme_id ? `SME ${it.sme_id}` : it.lender_id ? `Lender ${it.lender_id}` : "-"}</TableCell>
                  <TableCell>{new Date(it.submitted_at).toLocaleString()}</TableCell>
                  <TableCell>
                    <TextField
                      size="small"
                      value={notes[it.id] || ""}
                      onChange={(e) => setNotes({ ...notes, [it.id]: e.target.value })}
                      placeholder="Reviewer notes"
                    />
                  </TableCell>
                  <TableCell align="right">
                    <Stack direction="row" spacing={1} justifyContent="flex-end">
                      <Button color="error" variant="outlined" onClick={() => handleAction(it.id, "reject")}>Reject</Button>
                      <Button color="primary" variant="contained" onClick={() => handleAction(it.id, "approve")}>Approve</Button>
                    </Stack>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </Container>
  );
}
