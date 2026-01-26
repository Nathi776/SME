# API Documentation - Complete Reference

## Base URL
```
http://localhost:8000
```

## Authentication
All endpoints except `/auth/login` and `/auth/register` require JWT token in header:
```
Authorization: Bearer <token>
```

---

## Authentication Endpoints

### Register User
```
POST /auth/register
Content-Type: application/json

Request Body:
{
  "username": "john_doe",
  "password": "securepassword123",
  "email": "john@example.com"
}

Response (200):
{
  "message": "User registered successfully",
  "user": "john_doe"
}
```

### Login
```
POST /auth/login
Content-Type: application/json

Request Body:
{
  "username": "john_doe",
  "password": "securepassword123"
}

Response (200):
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer"
}
```

---

## SME Endpoints

### Get SME Dashboard
```
GET /smes/dashboard
Authorization: Bearer <token>

Response (200):
{
  "sme_id": 1,
  "invoice_count": 5,
  "outstanding_balance": 150000,
  "credit_score": 65,
  "finance_requests": 2
}
```

### Create SME Profile
```
POST /smes/
Content-Type: application/json

Request Body:
{
  "name": "Tech Solutions Ltd",
  "industry": "Technology",
  "revenue": 500000,
  "user_id": 1
}

Response (200):
{
  "id": 1,
  "name": "Tech Solutions Ltd",
  "industry": "Technology",
  "revenue": 500000,
  "user_id": 1
}
```

### Get SME by ID
```
GET /smes/{sme_id}
Authorization: Bearer <token>

Response (200):
{
  "id": 1,
  "name": "Tech Solutions Ltd",
  "industry": "Technology",
  "revenue": 500000,
  "user_id": 1
}
```

---

## Invoice Endpoints

### Create Invoice
```
POST /invoices/
Content-Type: application/json
Authorization: Bearer <token>

Request Body:
{
  "sme_id": 1,
  "client_name": "Client Corp",
  "description": "Service delivery",
  "amount": 50000
}

Response (200):
{
  "message": "Invoice created successfully",
  "invoice": 1
}
```

### Get Invoices by SME
```
GET /invoices/sme/{sme_id}
Authorization: Bearer <token>

Response (200):
[
  {
    "id": 1,
    "sme_id": 1,
    "client_name": "Client Corp",
    "amount": 50000,
    "status": "Pending",
    "created_at": "2026-01-23T10:00:00"
  }
]
```

### Get All Invoices
```
GET /invoices/
Authorization: Bearer <token>

Response (200):
[
  {
    "id": 1,
    "sme_id": 1,
    "client_name": "Client Corp",
    "amount": 50000,
    "status": "Pending"
  }
]
```

### Update Invoice
```
PUT /invoices/{invoice_id}
Content-Type: application/json
Authorization: Bearer <token>

Request Body:
{
  "status": "paid"
}

Response (200):
{
  "message": "Invoice updated successfully",
  "invoice": { ... }
}
```

### Delete Invoice
```
DELETE /invoices/{invoice_id}
Authorization: Bearer <token>

Response (200):
{
  "message": "Invoice deleted successfully"
}
```

---

## Credit Score Endpoints

### Calculate Credit Score
```
POST /credit-scores/
Content-Type: application/json
Authorization: Bearer <token>

Request Body:
{
  "sme_id": 1,
  "revenue_growth": 0.15,
  "on_time_invoices": 0.85,
  "debt_ratio": 0.4,
  "profit_margin": 0.25,
  "unpaid_invoices": 0.03,
  "business_age": 3,
  "industry_risk": 0.5
}

Response (201):
{
  "id": 1,
  "sme_id": 1,
  "score": 75,
  "rating": "Good",
  "created_at": "2026-01-23T10:00:00"
}
```

### Get Credit Scores for SME
```
GET /credit-scores/sme/{sme_id}
Authorization: Bearer <token>

Response (200):
[
  {
    "id": 1,
    "sme_id": 1,
    "score": 75,
    "rating": "Good",
    "created_at": "2026-01-23T10:00:00"
  }
]
```

---

## Lender Endpoints

### Register as Lender ✅ (NEW)
```
POST /lenders/register
Content-Type: application/json
Authorization: Bearer <token>

Request Body:
{
  "organization_name": "Capital Lenders Inc",
  "contact_email": "info@capitallenders.com",
  "phone": "+27123456789",
  "max_lending_amount": 5000000,
  "min_credit_score": 40
}

Response (200):
{
  "id": 1,
  "user_id": 5,
  "organization_name": "Capital Lenders Inc",
  "contact_email": "info@capitallenders.com",
  "phone": "+27123456789",
  "max_lending_amount": 5000000,
  "min_credit_score": 40
}
```

### Get Lender Profile
```
GET /lenders/me
Authorization: Bearer <token>

Response (200):
{
  "id": 1,
  "user_id": 5,
  "organization_name": "Capital Lenders Inc",
  "contact_email": "info@capitallenders.com",
  "phone": "+27123456789",
  "max_lending_amount": 5000000,
  "min_credit_score": 40
}
```

### Update Lender Profile
```
PUT /lenders/me
Content-Type: application/json
Authorization: Bearer <token>

Request Body:
{
  "max_lending_amount": 10000000,
  "min_credit_score": 50
}

Response (200):
{
  "id": 1,
  "user_id": 5,
  "organization_name": "Capital Lenders Inc",
  "contact_email": "info@capitallenders.com",
  "max_lending_amount": 10000000,
  "min_credit_score": 50
}
```

### Get Available SMEs ✅ (NEW)
```
GET /lenders/available-smes
Authorization: Bearer <token>

Response (200):
[
  {
    "sme_id": 1,
    "company_name": "Tech Solutions Ltd",
    "industry": "Technology",
    "revenue": 500000,
    "credit_score": 75,
    "risk_level": "Low",
    "pending_finance_requests": 2
  }
]
```

### Get Specific Lender
```
GET /lenders/{lender_id}
Authorization: Bearer <token>

Response (200):
{
  "id": 1,
  "user_id": 5,
  "organization_name": "Capital Lenders Inc",
  "contact_email": "info@capitallenders.com",
  "phone": "+27123456789",
  "max_lending_amount": 5000000,
  "min_credit_score": 40
}
```

---

## Finance Request Endpoints

### Apply for Finance ✅ (NEW)
```
POST /finance/apply
Content-Type: application/json
Authorization: Bearer <token>

Request Body:
{
  "invoice_id": 1,
  "amount": 50000
}

Response (200):
{
  "message": "Finance request submitted",
  "request_id": 1,
  "fee_rate": 0.03,
  "status": "pending"
}

Response (400):
{
  "detail": "Invoice not found or does not belong to this SME"
}
```

### Get Finance Requests by SME
```
GET /finance/requests/{sme_id}
Authorization: Bearer <token>

Response (200):
[
  {
    "id": 1,
    "sme_id": 1,
    "amount_requested": 50000,
    "approved_amount": null,
    "fee_rate": 0.03,
    "status": "pending",
    "created_at": "2026-01-23T10:00:00",
    "approved_at": null
  }
]
```

### Get Pending Finance Requests (Lender) ✅ (NEW)
```
GET /finance/pending
Authorization: Bearer <token>

Response (200):
[
  {
    "id": 1,
    "sme_id": 1,
    "amount_requested": 50000,
    "approved_amount": null,
    "fee_rate": 0.03,
    "status": "pending",
    "created_at": "2026-01-23T10:00:00",
    "approved_at": null
  }
]

Response (403):
{
  "detail": "Only lenders can view pending requests"
}
```

### Approve Finance Request ✅ (NEW)
```
PUT /finance/approve/{request_id}
Content-Type: application/json
Authorization: Bearer <token>

Request Body:
{
  "approved_amount": 40000
}

Response (200):
{
  "id": 1,
  "sme_id": 1,
  "amount_requested": 50000,
  "approved_amount": 40000,
  "fee_rate": 0.03,
  "status": "approved",
  "created_at": "2026-01-23T10:00:00",
  "approved_at": "2026-01-23T11:00:00"
}

Response (400):
{
  "detail": "Approved amount cannot exceed requested amount"
}
```

### Reject Finance Request ✅ (NEW)
```
PUT /finance/reject/{request_id}
Authorization: Bearer <token>

Response (200):
{
  "id": 1,
  "sme_id": 1,
  "amount_requested": 50000,
  "approved_amount": null,
  "fee_rate": 0.03,
  "status": "rejected",
  "created_at": "2026-01-23T10:00:00",
  "approved_at": "2026-01-23T11:00:00"
}
```

---

## Fee Rate Calculation

The fee rate is automatically calculated based on SME's credit score:

| Credit Score | Fee Rate | Eligible Amount |
|--------------|----------|-----------------|
| < 40         | 8%       | 60% of invoice  |
| 40-60        | 5%       | 70% of invoice  |
| 60-80        | 3%       | 80% of invoice  |
| 80+          | 1.5%     | 90% of invoice  |

---

## Error Responses

### 400 Bad Request
```json
{
  "detail": "Invalid input or business logic error"
}
```

### 401 Unauthorized
```json
{
  "detail": "Invalid authentication token"
}
```

### 403 Forbidden
```json
{
  "detail": "You don't have permission to perform this action"
}
```

### 404 Not Found
```json
{
  "detail": "Resource not found"
}
```

### 422 Unprocessable Entity
```json
{
  "detail": [
    {
      "loc": ["body", "field_name"],
      "msg": "Field validation error",
      "type": "value_error"
    }
  ]
}
```

---

## Status Codes

| Code | Meaning |
|------|---------|
| 200  | OK - Success |
| 201  | Created - Resource created |
| 400  | Bad Request - Invalid input |
| 401  | Unauthorized - Invalid token |
| 403  | Forbidden - Insufficient permissions |
| 404  | Not Found - Resource doesn't exist |
| 422  | Unprocessable Entity - Validation failed |
| 500  | Server Error - Internal error |

---

## Request/Response Headers

### Request Headers
```
Content-Type: application/json
Authorization: Bearer <jwt_token>
```

### Response Headers
```
Content-Type: application/json
X-Process-Time: 0.123
```

---

## Rate Limits

No rate limiting currently implemented. Recommended for production:
- 100 requests per minute per user
- 1000 requests per minute per IP

---

## Pagination (Future Enhancement)

Not currently implemented. Recommended for large datasets:
```
GET /invoices/?page=1&per_page=50
```

---

## Notes

✅ = Newly implemented in this session
All endpoints marked with ✅ are part of the Lender Module implementation
