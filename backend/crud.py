from sqlalchemy.orm import Session
import models
import schemas
from datetime import datetime

def create_credit_record(db: Session, request: schemas.CreditScoreRequest, score: float, decision: str):
    record = models.CreditScoreRecord(
        applicant_name=request.applicant_name,
        monthly_income=request.monthly_income,
        monthly_expenses=request.monthly_expenses,
        loan_amount=request.loan_amount,
        credit_history_years=request.credit_history_years,
        missed_payments=request.missed_payments,
        credit_score=score,
        decision=decision,
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


def get_credit_scores(db: Session, skip: int = 0, limit: int = 20):
    return db.query(models.CreditScoreRecord).offset(skip).limit(limit).all()


def get_credit_score_by_id(db: Session, record_id: int):
    return db.query(models.CreditScoreRecord).filter(models.CreditScoreRecord.id == record_id).first()


def delete_credit_score(db: Session, record_id: int):
    record = db.query(models.CreditScoreRecord).filter(models.CreditScoreRecord.id == record_id).first()
    if record:
        db.delete(record)
        db.commit()
    return record
