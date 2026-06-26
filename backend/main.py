from fastapi import FastAPI
from database import Base, engine
from config import get_settings
from routers import (
    auth_router,
    sme_router,
    invoice_router,
    credit_score_router,
    finance_request_router,
    lender_router,
    customer_router
)
from routers import verification_router
from fastapi.middleware.cors import CORSMiddleware
from limiter import limiter
from slowapi.errors import RateLimitExceeded
from slowapi import _rate_limit_exceeded_handler

app = FastAPI(title="SME Credit Scoring API")
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

settings = get_settings()
cors_origins = settings.cors_origins

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins or ["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth_router.router)
app.include_router(sme_router.router)
app.include_router(invoice_router.router)
app.include_router(credit_score_router.router)
app.include_router(finance_request_router.router)
app.include_router(lender_router.router)
app.include_router(verification_router.router)
app.include_router(customer_router.router)

@app.get("/")
def root():
    return {"message": "Welcome to the SME Credit Scoring API"}
