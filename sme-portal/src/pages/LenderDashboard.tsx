import React, { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Chip,
} from "@mui/material";
import api from "../api/client";

interface FinanceRequest {
  id: number;
  sme_id: number;
  amount_requested: number;
  approved_amount: number | null;
  fee_rate: number;
  status: string;
  created_at: string;
}

interface SME {
  sme_id: number;
  company_name: string;
  industry: string;
  revenue: number;
  credit_score: number | null;
  risk_level: string | null;
  finance_requests?: number;
}

export default function LenderDashboard() {
  const [pendingRequests, setPendingRequests] = useState<FinanceRequest[]>([]);
  const [availableSMEs, setAvailableSMEs] = useState<SME[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<FinanceRequest | null>(null);
  const [approvalAmount, setApprovalAmount] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      setError("You are not logged in.");
      setLoading(false);
      return;
    }

    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const [pendingRes, smeRes] = await Promise.all([
        api.get("/finance/pending"),
        api.get("/lenders/available-smes"),
      ]);

      setPendingRequests(pendingRes.data || []);
      setAvailableSMEs(smeRes.data || []);
      setLoading(false);
    } catch (err) {
      setError("Failed to load dashboard data");
      setLoading(false);
    }
  };

  const handleApproveClick = (request: FinanceRequest) => {
    setSelectedRequest(request);
    setApprovalAmount(request.amount_requested.toString());
    setOpenDialog(true);
  };

  const handleApprove = async () => {
    if (!selectedRequest || !approvalAmount) {
      alert("Please enter an approval amount");
      return;
    }

    try {
      await api.put(`/finance/approve/${selectedRequest.id}`, {
        approved_amount: parseFloat(approvalAmount),
      });

      alert("Finance request approved!");
      setOpenDialog(false);
      loadDashboardData();
    } catch (err) {
      alert("Failed to approve request");
    }
  };

  const handleReject = async (requestId: number) => {
    if (window.confirm("Are you sure you want to reject this request?")) {
      try {
        await api.put(`/finance/reject/${requestId}`, {});
        alert("Finance request rejected!");
        loadDashboardData();
      } catch (err) {
        alert("Failed to reject request");
      }
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "warning";
      case "approved":
        return "success";
      case "rejected":
        return "error";
      default:
        return "default";
    }
  };

  const getRiskColor = (score: number | null) => {
    if (!score) return "default";
    if (score < 40) return "error";
    if (score < 60) return "warning";
    return "success";
  };

  if (loading) return <Typography>Loading...</Typography>;

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" sx={{ mb: 3 }}>
        Lender Dashboard
      </Typography>

      {error && <Typography color="error">{error}</Typography>}

      {/* Pending Requests Section */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Pending Finance Requests ({pendingRequests.length})
          </Typography>

          {pendingRequests.length === 0 ? (
            <Typography>No pending requests</Typography>
          ) : (
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow sx={{ backgroundColor: "#f5f5f5" }}>
                    <TableCell>Request ID</TableCell>
                    <TableCell align="right">Amount Requested</TableCell>
                    <TableCell>Fee Rate</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Submitted</TableCell>
                    <TableCell align="center">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {pendingRequests.map((req) => (
                    <TableRow key={req.id}>
                      <TableCell>#{req.id}</TableCell>
                      <TableCell align="right">
                        R{req.amount_requested.toLocaleString()}
                      </TableCell>
                      <TableCell>{(req.fee_rate * 100).toFixed(1)}%</TableCell>
                      <TableCell>
                        <Chip
                          label={req.status}
                          color={getStatusColor(req.status) as any}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>{new Date(req.created_at).toLocaleDateString()}</TableCell>
                      <TableCell align="center">
                        <Button
                          size="small"
                          variant="contained"
                          color="success"
                          onClick={() => handleApproveClick(req)}
                          sx={{ mr: 1 }}
                        >
                          Approve
                        </Button>
                        <Button
                          size="small"
                          variant="outlined"
                          color="error"
                          onClick={() => handleReject(req.id)}
                        >
                          Reject
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>

      {/* Available SMEs Section */}
      <Card>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Available SMEs for Financing ({availableSMEs.length})
          </Typography>

          {availableSMEs.length === 0 ? (
            <Typography>No SMEs available</Typography>
          ) : (
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow sx={{ backgroundColor: "#f5f5f5" }}>
                    <TableCell>Company Name</TableCell>
                    <TableCell>Industry</TableCell>
                    <TableCell align="right">Revenue</TableCell>
                    <TableCell align="center">Credit Score</TableCell>
                    <TableCell>Risk Level</TableCell>
                    <TableCell align="center">Pending Requests</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {availableSMEs.map((sme) => (
                    <TableRow key={sme.sme_id}>
                      <TableCell>{sme.company_name}</TableCell>
                      <TableCell>{sme.industry}</TableCell>
                      <TableCell align="right">
                        R{sme.revenue.toLocaleString()}
                      </TableCell>
                      <TableCell align="center">
                        {sme.credit_score ? (
                          <Chip
                            label={sme.credit_score.toFixed(0)}
                            color={getRiskColor(sme.credit_score) as any}
                            size="small"
                          />
                        ) : (
                          <Typography>N/A</Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        {sme.risk_level ? (
                          <Chip
                            label={sme.risk_level}
                            color={sme.risk_level === "Low" ? "success" : sme.risk_level === "Medium" ? "warning" : "error"}
                            size="small"
                          />
                        ) : (
                          <Typography>N/A</Typography>
                        )}
                      </TableCell>
                      <TableCell align="center">{sme.finance_requests ? sme.finance_requests : 0}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>

      {/* Approval Dialog */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)}>
        <DialogTitle>Approve Finance Request</DialogTitle>
        <DialogContent>
          {selectedRequest && (
            <Box sx={{ pt: 2 }}>
              <Typography>Request ID: {selectedRequest.id}</Typography>
              <Typography>Amount Requested: R{selectedRequest.amount_requested.toLocaleString()}</Typography>
              <Typography sx={{ mb: 2 }}>Fee Rate: {(selectedRequest.fee_rate * 100).toFixed(1)}%</Typography>
              <TextField
                fullWidth
                label="Approval Amount"
                type="number"
                value={approvalAmount}
                onChange={(e) => setApprovalAmount(e.target.value)}
                inputProps={{ min: 0, max: selectedRequest.amount_requested }}
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
          <Button onClick={handleApprove} variant="contained" color="success">
            Approve
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
