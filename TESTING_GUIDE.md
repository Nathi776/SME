# Testing the New Features - Complete Step-by-Step Guide

## Prerequisites
- Backend running on `localhost:8000`
- Swagger UI available at `http://localhost:8000/docs`
- Frontend running on `localhost:3000` (optional, for UI testing)

## Quick Start - Complete Testing Workflow

**Total Time: ~10 minutes**

Open **http://localhost:8000/docs** in your browser and follow these steps in order.

## Test Data Setup - Follow These Steps in Order

### Step 1: Register SME User
1. In Swagger, find **POST /auth/register**
2. Click "Try it out"
3. Copy-paste this into the request body:
```json
{
  "username": "test_sme_001",
  "password": "password123",
  "email": "sme001@test.com"
}
```
4. Click "Execute"
5. **Note the user ID** from the response (should be 1 or higher)

### Step 2: Create SME Profile
1. Find **POST /smes/**
2. Click "Try it out"
3. Replace `{user_id}` with the ID from Step 1, then copy-paste:
```json
{
  "name": "TechStart Solutions",
  "industry": "Technology",
  "revenue": 500000,
  "user_id": 1
}
```
4. Click "Execute"
5. **Note the SME ID** from the response

### Step 3: Create Invoice
1. Find **POST /invoices/**
2. Click "Try it out"
3. Replace `{sme_id}` with the ID from Step 2, then copy-paste:
```json
{
  "sme_id": 1,
  "client_name": "Client Corp",
  "amount": 50000,
  "description": "Service delivery"
}
```
4. Click "Execute"
5. **Note the invoice ID** from the response

### Step 4: Calculate Credit Score
1. Find **POST /credit-score/calculate/{sme_id}**
2. Click "Try it out"
3. Replace `{sme_id}` with `1` (from Step 2)
4. **Leave the request body empty** (no JSON needed - the endpoint calculates automatically)
5. Click "Execute"
6. You should see a response with the calculated credit score (typically 50-85)
7. ✅ The score is calculated automatically based on:
   - SME revenue
   - Years in business
   - Number of unpaid invoices

### Step 5: Register Lender User
1. Find **POST /auth/register** again
2. Click "Try it out"
3. Copy-paste this:
```json
{
  "username": "test_lender_001",
  "password": "password123",
  "email": "lender001@test.com"
}
```
4. Click "Execute"
5. **Note the lender user ID** from the response

### Step 6: Login as Lender
1. Find **POST /auth/login**
2. Click "Try it out"
3. You should see fields for "username" and "password"
4. Enter:
   - **username**: `test_lender_001`
   - **password**: `password123`
5. Click "Execute"
6. **Copy the access_token** from the response (it's a long string)

### Step 7: Authorize Swagger with Lender Token
1. Scroll to the **top right** of Swagger and click the green **"Authorize"** button
2. In the popup, paste your token in the format:
   ```
   Bearer YOUR_ACCESS_TOKEN_HERE
   ```
3. Click "Authorize"
4. Close the popup

### Step 8: Register as Lender
1. Find **POST /lenders/register**
2. Click "Try it out"
3. Copy-paste:
```json
{
  "organization_name": "Test Lenders Ltd",
  "contact_email": "lender001@test.com",
  "phone": "+27123456789",
  "max_lending_amount": 1000000,
  "min_credit_score": 40
}
```
4. Click "Execute"
5. You should get a 200 response with lender details

### Step 9: SME Apply for Finance
1. **Logout** Swagger: Click Authorize button → "Logout"
2. Login as SME: Find **POST /auth/login**, enter:
   - **username**: `test_sme_001`
   - **password**: `password123`
3. Click Authorize button, paste the new token with `Bearer` prefix
4. Find **POST /finance/apply**
5. Click "Try it out" and copy-paste:
```json
{
  "invoice_id": 1,
  "amount": 30000
}
```
6. Click "Execute"
7. **Note the request ID** from the response

### Step 10: Lender Reviews Pending Requests
1. Logout and login as Lender again (use credentials from Step 6)
2. Click Authorize button with lender token
3. Find **GET /finance/pending**
4. Click "Try it out" → "Execute"
5. You should see the SME's finance request with status "pending"

### Step 11: Lender Approves Request
1. Find **PUT /finance/approve/{request_id}**
2. Click "Try it out"
3. Replace `{request_id}` with the ID from Step 9
4. Copy-paste:
```json
{
  "approved_amount": 30000
}
```
5. Click "Execute"
6. You should get a 200 response with the approved request

### Step 12: View SME Dashboard
1. Logout and login as SME again
2. Find **GET /smes/dashboard**
3. Click "Try it out" → "Execute"
4. You should see:
   - SME profile info
   - Invoice list
   - Finance requests with the approved one showing status "approved"
   - Credit score information
   - Fee rate applied (should be around 3%)

---

## Success Indicators

✅ Step 1-5: You have test data created
✅ Step 6-8: Lender can register 
✅ Step 9-10: Finance request is pending with correct fee rate
✅ Step 11: Lender can approve request
✅ Step 12: SME can see approved financing with all details

## Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| **422 Unprocessable Entity on /auth/login** | Make sure you're entering username/password in the OAuth2 form, not JSON body |
| **401 Unauthorized** | Click Authorize button and re-enter your credentials |
| **404 Not Found on endpoints** | Make sure you're using the correct IDs from previous responses |
| **Fee rate is 0** | Credit score must exist before finance request; check Step 4 completed successfully |
| **Can't see pending requests** | Make sure you're logged in as Lender and authorized in Swagger |
| **Credit score calculation fails** | Make sure SME has revenue and an invoice before calculating score |

## What to Test Next

1. **Reject a Finance Request**: Use **PUT /finance/reject/{request_id}** while logged in as Lender
2. **View Lender Profile**: Use **GET /lenders/me** to see your lender details
3. **View Available SMEs**: Use **GET /lenders/available-smes** to see all SMEs with credit scores
4. **Create Multiple Finance Requests**: Repeat Steps 9-11 with different amounts to see fee calculations

## Frontend Testing (Optional)

Once API is working, test the UI:
1. Go to `http://localhost:3000`
2. Login with SME credentials (test_sme_001 / password123)
3. Check Dashboard, Invoices, Finance pages
4. Logout and login as Lender (test_lender_001 / password123)
5. Check Lender Dashboard, Available SMEs, Analytics

---

**Need help?** Re-read the step that's failing and check the Common Issues table above.

