import os

from fastapi import FastAPI
from database import Base, engine
from routers import (
    auth_router,
    sme_router,
    invoice_router,
    credit_score_router,
    finance_request_router,
    lender_router
)
from fastapi.middleware.cors import CORSMiddleware

Base.metadata.create_all(bind=engine)

app = FastAPI(title="SME Credit Scoring API")

cors_origins = [
    origin.strip()
    for origin in os.getenv(
        "CORS_ORIGINS",
        "http://localhost:3000,http://127.0.0.1:3000",
    ).split(",")
    if origin.strip()
]

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

@app.get("/")
def root():
    return {"message": "Welcome to the SME Credit Scoring API"}
