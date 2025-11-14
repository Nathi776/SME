from pydantic import BaseModel, Field

class CreditScoreRequest(BaseModel):
    applicant_name: str = Field(..., example="John Doe")
    monthly_income: float
    monthly_expenses: float
    loan_amount: float
    credit_history_years: int
    missed_payments: int


class CreditScoreResponse(BaseModel):
    id: int | None = None
    applicant_name: str
    credit_score: float
    decision: str

    class Config:
        from_attributes = True


class CreditScoreFullResponse(BaseModel):
    id: int
    applicant_name: str
    monthly_income: float
    monthly_expenses: float
    loan_amount: float
    credit_history_years: int
    missed_payments: int
    credit_score: float
    decision: str

    class Config:
        from_attributes = True
