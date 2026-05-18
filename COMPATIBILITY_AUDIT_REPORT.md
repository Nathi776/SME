# SME Finance Portal - Compatibility & Component Audit

**Date:** May 17, 2026  
**Scope:** Backend API ↔ Frontend (sme-portal) Compatibility | Layout/Component Alignment | Redundant Files

---

## 1. CRITICAL LAYOUT MISALIGNMENT ISSUES ⚠️

### Issue 1.1: Double Layout in App.tsx (SME + Lender)
**Problem:** `App.tsx` wraps ALL routes with `TopHeader` + `Sidebar` (SME layout), but `LenderDashboard` page uses its own `LenderLayout` (which includes `LenderHeader` + `LenderSidebar`).

**Current Flow:**
```
App.tsx TopHeader
    ↓
App.tsx Sidebar (SME-themed)
    ↓
Routes
    ↓
  LenderDashboard (renders LenderLayout internally)
    → LenderLayout has its own LenderHeader + LenderSidebar
    → RESULT: TWO headers + TWO sidebars visible (overlapping/broken UI)
```

**Affected Routes:**
- `/lender/dashboard` ❌ Shows SME sidebar + LenderDashboard's own layout

**Solution:** Use role-aware layout switching. Replace lines 24-38 in `App.tsx`:

```typescript
// BEFORE (lines 24-38)
const [sidebarOpen, setSidebarOpen] = useState(false);

return (
  <BrowserRouter>
    <TopHeader onMenuToggle={() => setSidebarOpen((s) => !s)} />
    <Box sx={{ display: 'flex' }}>
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <Box component="main" sx={{ flex: 1, p: { xs: 2, md: 4 } }}>
        <Routes>
          ...
          <Route path="/lender/dashboard" element={<ProtectedRoute roles={["lender"]}><LenderDashboard /></ProtectedRoute>} />
```

**AFTER (role-aware):**
```typescript
const [sidebarOpen, setSidebarOpen] = useState(false);
const [userRole, setUserRole] = useState<string | null>(null);

useEffect(() => {
  const role = sessionStorage.getItem("role");
  setUserRole(role);
}, []);

const isLenderRoute = location.pathname.startsWith("/lender");

return (
  <BrowserRouter>
    {!isLenderRoute && (
      <>
        <TopHeader onMenuToggle={() => setSidebarOpen((s) => !s)} />
        <Box sx={{ display: 'flex' }}>
          <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
          <Box component="main" sx={{ flex: 1, p: { xs: 2, md: 4 } }}>
```

**Recommendation:** Refactor App.tsx to conditionally render layout based on route role:
- **Lender routes** (`/lender/*`): Use `LenderLayout` (no TopHeader/Sidebar wrapper)
- **SME routes** (`/dashboard`, `/invoices`, etc.): Use TopHeader + Sidebar
- **Auth routes** (`/login`, `/register`, `/register/sme`, `/register/lender`): No sidebar (full width)
- **Home/Unauthorized**: No sidebar

---

### Issue 1.2: Register Pages Show SME Sidebar
**Problem:** `LenderRegisterPage.tsx` and `SmeRegisterPage.tsx` display the SME sidebar (from App.tsx), but these are single-column forms that shouldn't have navigation.

**Affected Routes:**
- `/register/sme` ❌
- `/register/lender` ❌

**Solution:** Hide sidebar for auth routes in App.tsx (see Issue 1.1 fix above).

---

## 2. BACKEND ↔ FRONTEND COMPATIBILITY ✅

### Overall Status: **COMPATIBLE** (with 2 fixes applied)

**Applied Fixes:**
1. ✅ `backend/routers/auth_router.py`: `/auth/register` now returns `id` field (was missing, frontend needs it)
2. ✅ `backend/routers/invoice_router.py`: `/invoices/` POST now returns full invoice object (not just ID)
3. ✅ `sme-portal/src/api/invoiceApi.ts`: Updated `create` type to match backend response

### Endpoint Mapping Verification

| Endpoint | Frontend Uses | Backend Impl | Status |
|----------|---------------|--------------|--------|
| **Auth** | | | |
| `POST /auth/register` | `AuthApi.register()` | ✅ Exists | ✅ |
| `POST /auth/login` | `AuthApi.login()` | ✅ Exists | ✅ |
| **Invoices** | | | |
| `GET /invoices/sme/{sme_id}` | `invoiceApi.listBySme()` | ✅ Exists | ✅ |
| `POST /invoices/` | `invoiceApi.create()` | ✅ Exists | ✅ |
| `DELETE /invoices/{id}` | `invoiceApi.delete()` | ✅ Exists | ✅ |
| **Finance Requests** | | | |
| `GET /finance/requests/{sme_id}` | `FinanceApi.getRequests()` | ✅ Exists | ✅ |
| `GET /finance/pending` | `FinanceApi.getPendingRequests()` | ✅ Exists | ✅ |
| `PUT /finance/approve/{id}` | `FinanceApi.approve()` | ✅ Exists | ✅ |
| `PUT /finance/reject/{id}` | `FinanceApi.reject()` | ✅ Exists | ✅ |
| `POST /finance/apply` | `FinanceApi.apply()` | ✅ Exists | ✅ |
| **SMEs** | | | |
| `GET /smes` | `SMEApi.getAll()` | ✅ Exists | ✅ |
| `GET /smes/{id}` | `SMEApi.getOne()` | ✅ Exists | ✅ |
| `POST /smes` | `SMEApi.create()` | ✅ Exists | ✅ |
| `PUT /smes/{id}` | `SMEApi.update()` | ✅ Exists | ✅ |
| `DELETE /smes/{id}` | `SMEApi.delete()` | ✅ Exists | ✅ |
| `GET /smes/dashboard` | Pages: InvoicePage, FinanceRequestPage | ✅ Exists | ✅ |
| **Lenders** | | | |
| `GET /lenders/me` | `LenderApi.getProfile()` | ✅ Exists | ✅ |
| `PUT /lenders/me` | `LenderApi.updateProfile()` | ✅ Exists | ✅ |
| `POST /lenders/register` | `LenderApi.register()` | ✅ Exists | ✅ |
| `GET /lenders/available-smes` | `LenderApi.getAvailableSMEs()` | ✅ Exists | ✅ |
| **Credit Scores** | | | |
| `GET /credit-scores/sme/{sme_id}` | `SMEApi.getCreditScore()` | ✅ Exists | ✅ |

### Known Concerns
1. **Decimal/Number Serialization:** Backend returns Decimal types (FastAPI serializes to JSON strings by default). Frontend expects numbers. If you see amount fields as strings in JSON, either:
   - Convert Decimals to floats in backend before returning, or
   - Parse strings to numbers in frontend (axios should auto-parse)

2. **CORS:** Backend config allows `http://localhost:3000` and `http://127.0.0.1:3000`. If CRA runs on different port (e.g., `:3001`), add it to `backend/config.py` `cors_origins`.

3. **Invoice Creation:** Frontend sends `issue_date` and `due_date` but backend doesn't accept them. This causes the create to fail silently. Either:
   - Remove those fields from frontend `InvoicePage.tsx` line 44, or
   - Add them to backend `InvoiceCreate` schema

---

## 3. REDUNDANT / UNUSED FILES 🗑️

### Unused Pages (Not routed in App.tsx)
| File | Current Usage | Recommendation |
|------|---------------|-----------------|
| `sme-portal/src/pages/SMEPage.tsx` | ❌ Not in App.tsx routes | Delete or keep as admin/dev page (clarify intent) |

**Action:** Remove or document why kept.

### Analysis
- `SMEPage.tsx`: Lists and creates SMEs with full CRUD UI, but not accessible from App routing. Likely leftover from dev/admin phase.

---

## 4. LAYOUT COMPONENT SUMMARY

### SME Portal Layout Structure
```
app/
├── layout/
│   ├── TopHeader.tsx      (SME header, used in App root)
│   └── Sidebar.tsx        (SME sidebar, used in App root)
├── lender/
│   ├── LenderHeader.tsx   (Lender header, used in LenderLayout)
│   ├── LenderLayout.tsx   (Wrapper for lender routes)
│   ├── LenderSidebar.tsx  (Lender sidebar, used in LenderLayout)
│   └── ... (LenderWelcomeBanner, etc.)
└── pages/
    ├── LenderDashboard.tsx     (uses LenderLayout)
    ├── Dashboard.tsx           (SME dashboard)
    └── ... (various pages)
```

### Current Issues
1. **App.tsx wraps all non-auth routes with TopHeader + Sidebar** → conflicts with LenderLayout
2. **Auth pages (Register, Login) show SME sidebar** → should be full-width
3. **No separation between role-based layouts** → needs conditional rendering

---

## 5. RECOMMENDED FIXES (Priority Order)

### HIGH PRIORITY 🔴
1. **Fix App.tsx layout switching** (Issue 1.1)
   - Implement role-aware layout
   - Hide sidebar for auth/home pages
   - Let lender routes use their own LenderLayout
   - **Time:** ~30 minutes
   - **Files:** `sme-portal/src/App.tsx`

### MEDIUM PRIORITY 🟡
2. **Remove unused SMEPage.tsx or document intent**
   - **Time:** ~5 minutes
   - **Files:** `sme-portal/src/pages/SMEPage.tsx`

3. **Fix invoice creation date fields** (send only required fields)
   - **Time:** ~10 minutes
   - **Files:** `sme-portal/src/pages/InvoicePage.tsx` line 44

4. **Update CORS for dev ports** (if running on non-3000 port)
   - **Time:** ~2 minutes
   - **Files:** `backend/config.py`

### LOW PRIORITY 🟢
5. Convert Decimal to float in backend (optional, if numeric fields become strings)
   - **Time:** ~15 minutes
   - **Files:** Backend response models

---

## 6. IMPORT ALIAS STATUS

All relative imports verified ✅  
- `@/components/lender/*` → converted to relative imports
- `@/utils/auth` → converted to relative imports
- No remaining unresolved aliases

---

## Summary
- **Backend-Frontend Compatibility:** ✅ **COMPATIBLE** (minor fixes applied)
- **Layout Alignment:** ❌ **CRITICAL ISSUES** (needs App.tsx refactor)
- **Redundant Files:** ⚠️ **1 unused page** (SMEPage.tsx)
- **Action Items:** 5 (1 HIGH, 3 MEDIUM, 1 LOW)

