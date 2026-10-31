import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { SnackbarProvider } from "notistack";
import LenderRequestDetailPage from "./LenderRequestDetailPage";
import { LenderApi } from "../api/lenderApi";

jest.mock("../components/lender/LenderLayout", () => ({ __esModule: true, default: ({ children }: any) => <div>{children}</div> }));
jest.mock("../api/lenderApi");
const api = LenderApi as jest.Mocked<typeof LenderApi>;

const request: any = {
  id: 7, sme_id: 3, invoice_id: null, request_type: "pre_invoice", amount_requested: 50000,
  status: "pending", created_at: "2026-10-01T10:00:00", purpose_of_funding: "Equipment",
};
const intel: any = {
  evidence: {
    documents: [
      { doc_type: "cipc", status: "approved", reviewed_at: null, newer_pending: false },
      { doc_type: "tax_clearance", status: "rejected", reviewed_at: null, newer_pending: false },
    ],
    funding_readiness: 41.2, viability_score: 55, evidence_confidence: 30,
  },
  sme: { id: 3, name: "Real Co", industry: "Retail", province: "Gauteng", business_city: "Pretoria", revenue: 120000, years_active: 1, cipc_verified: true },
  score: { current: 41.2, decision: "Review", breakdown: { "Business Age": { contribution: 2, max: 10, applicable: true } } },
  recommendations: { projected_score: 60, top_3_actions: [] },
  score_history: [], outcomes: [],
};

function renderAt(id: string) {
  return render(
    <SnackbarProvider>
      <MemoryRouter initialEntries={[`/lender/review-requests/${id}`]}>
        <Routes><Route path="/lender/review-requests/:id" element={<LenderRequestDetailPage />} /></Routes>
      </MemoryRouter>
    </SnackbarProvider>
  );
}

beforeEach(() => {
  api.getPendingRequests.mockResolvedValue({ data: [request] } as any);
  api.getAwaitingInfo.mockResolvedValue({ data: [] } as any);
  api.getMessages.mockResolvedValue({ data: [] } as any);
  api.getSMEInvoices.mockResolvedValue({ data: [] } as any);
  api.getSmeIntelligence.mockResolvedValue({ data: intel } as any);
});

test("shows the business's real data and real document statuses", async () => {
  renderAt("7");
  expect(await screen.findByText("Real Co")).toBeInTheDocument();
  expect(screen.getByText("CIPC registration")).toBeInTheDocument();
  expect(screen.getByText("rejected")).toBeInTheDocument();
  expect(screen.getByText(/Tax clearance (is rejected|has not)/)).toBeInTheDocument();
  expect(screen.getByText(/Low evidence confidence/)).toBeInTheDocument();
});

test("never shows placeholder claims", async () => {
  renderAt("7");
  await screen.findByText("Real Co");
  for (const fake of [/2021\/123456\/07/, /Approval Probability/i, /Model Confidence/i, /strong repayment/i,
                      /City Power Solutions/, /ABC Construction/, /Financial Statements \(2025\)/]) {
    expect(screen.queryByText(fake)).not.toBeInTheDocument();
  }
});

test("an unknown request id shows not-found, not sample data", async () => {
  renderAt("999");
  expect(await screen.findByText(/not found, or is no longer open/i)).toBeInTheDocument();
  expect(screen.queryByText("ABC Construction (Pty) Ltd")).not.toBeInTheDocument();
});

test("a failed assessment load blocks approval", async () => {
  api.getSmeIntelligence.mockRejectedValue(new Error("boom"));
  renderAt("7");
  expect(await screen.findByText(/could not be loaded/i)).toBeInTheDocument();
  await waitFor(() => expect(screen.getByRole("button", { name: "Approve" })).toBeDisabled());
});

test("a request awaiting a reply cannot be decided", async () => {
  api.getPendingRequests.mockResolvedValue({ data: [] } as any);
  api.getAwaitingInfo.mockResolvedValue({ data: [{ ...request, status: "info_requested" }] } as any);
  renderAt("7");
  expect(await screen.findByText(/Waiting for the business to reply/)).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Approve" })).toBeDisabled();
  expect(screen.getByRole("button", { name: "Reject" })).toBeDisabled();
});
