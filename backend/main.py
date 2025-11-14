from fastapi import FastAPI
from database import Base, engine
from routers import (
    auth_router,
    sme_router,
    invoice_router,
    credit_score_router,
    finance_request_router
)

Base.metadata.create_all(bind=engine)

app = FastAPI(title="SME Credit Scoring API")

# Include routers
app.include_router(auth_router.router)
app.include_router(sme_router.router)
app.include_router(invoice_router.router)
app.include_router(credit_score_router.router)
app.include_router(finance_request_router.router)

@app.get("/")
def root():
    return {"message": "Welcome to the SME Credit Scoring API"}
