from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field

class CreditScoreRequest(BaseModel):
    applicant_name: str = Field(..., example="John Doe")
    monthly_income: Decimal = Field(..., ge=0)
    monthly_expenses: Decimal = Field(..., ge=0)
    loan_amount: Decimal = Field(..., ge=0)
    credit_history_years: int
    missed_payments: int


class CreditScoreResponse(BaseModel):
    id: int | None = None
    applicant_name: str
    credit_score: float
    decision: str

    model_config = ConfigDict(from_attributes=True)


class CreditScoreFullResponse(BaseModel):
    id: int
    applicant_name: str
    monthly_income: Decimal
    monthly_expenses: Decimal
    loan_amount: Decimal
    credit_history_years: int
    missed_payments: int
    credit_score: float
    decision: str

    model_config = ConfigDict(from_attributes=True)


class InvoiceCreate(BaseModel):
    client_name: str
    description: str
    amount: Decimal

class InvoiceOut(InvoiceCreate):
    id: int
    status: str

    model_config = ConfigDict(from_attributes=True)
