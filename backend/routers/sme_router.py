from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models.sme import SME
from models.user import User
from pydantic import BaseModel
from typing import List

router = APIRouter(
    prefix="/smes",
    tags=["SMEs"]
)

# ---------- Pydantic Schemas ----------
class SMEBase(BaseModel):
    name: str
    industry: str
    revenue: float
    user_id: int

class SMECreated(SMEBase):
    id: int

    class Config:
        orm_mode = True


# ---------- CRUD Endpoints ----------

# ✅ Create SME
@router.post("/", response_model=SMECreated)
def create_sme(sme: SMEBase, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == sme.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found. Cannot link SME.")

    new_sme = SME(
        name=sme.name,
        industry=sme.industry,
        revenue=sme.revenue,
        user_id=sme.user_id
    )
    db.add(new_sme)
    db.commit()
    db.refresh(new_sme)
    return new_sme


# ✅ Get all SMEs
@router.get("/", response_model=List[SMECreated])
def get_all_smes(db: Session = Depends(get_db)):
    smes = db.query(SME).all()
    return smes


# ✅ Get SME by ID
@router.get("/{sme_id}", response_model=SMECreated)
def get_sme(sme_id: int, db: Session = Depends(get_db)):
    sme = db.query(SME).filter(SME.id == sme_id).first()
    if not sme:
        raise HTTPException(status_code=404, detail="SME not found.")
    return sme


# ✅ Update SME
@router.put("/{sme_id}", response_model=SMECreated)
def update_sme(sme_id: int, updated_sme: SMEBase, db: Session = Depends(get_db)):
    sme = db.query(SME).filter(SME.id == sme_id).first()
    if not sme:
        raise HTTPException(status_code=404, detail="SME not found.")

    sme.name = updated_sme.name
    sme.industry = updated_sme.industry
    sme.revenue = updated_sme.revenue
    sme.user_id = updated_sme.user_id
    db.commit()
    db.refresh(sme)
    return sme


# ✅ Delete SME
@router.delete("/{sme_id}")
def delete_sme(sme_id: int, db: Session = Depends(get_db)):
    sme = db.query(SME).filter(SME.id == sme_id).first()
    if not sme:
        raise HTTPException(status_code=404, detail="SME not found.")

    db.delete(sme)
    db.commit()
    return {"message": f"SME with ID {sme_id} deleted successfully."}
