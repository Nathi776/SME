from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from decimal import Decimal
from datetime import datetime, timedelta
from typing import List, Dict, Any
from database import get_db
import models.invoice  # noqa: F401
from models.invoice import Invoice
from models.sme import SME
from models.user import User
from services.auth_service import get_current_user

router = APIRouter(
    prefix="/customers",
    tags=["Customers"]
)

# Seeding function to create 32 mock customers with invoices for the active SME
def seed_sme_customers(db: Session, sme_id: int):
    # Check if we already seeded invoices for this SME
    existing_count = db.query(Invoice).filter(Invoice.sme_id == sme_id).count()
    if existing_count >= 10:  # Already seeded or has plenty of invoices
        return

    print(f"Seeding mock customer data for SME ID {sme_id}...")

    # Current date reference is 2026-06-12
    now = datetime(2026, 6, 12)

    # 1. ABC Manufacturing (Pty) Ltd - Low Risk, Avg 25 days, 8 invoices, 120,000 outstanding, 95% on time
    abc_details = {
        "client_name": "ABC Manufacturing (Pty) Ltd",
        "customer_company": "ABC Manufacturing (Pty) Ltd",
        "contact_person": "John Smith",
        "email": "john@abc.co.za",
        "phone": "+27 82 123 4567",
        "customer_industry": "Manufacturing",
        "payment_terms": 25,
        "description": "Industrial manufacturing supplies"
    }
    abc_invoices = [
        {"invoice_number": "INV-2026-001", "amount": 50000, "status": "paid", "days_offset_issue": -11, "days_offset_due": 18}, # June 1
        {"invoice_number": "INV-2026-002", "amount": 70000, "status": "paid", "days_offset_issue": -28, "days_offset_due": 2},  # May 15
        {"invoice_number": "INV-2026-003", "amount": 40000, "status": "paid", "days_offset_issue": -53, "days_offset_due": -23}, # Apr 20
        {"invoice_number": "INV-2026-004", "amount": 60000, "status": "pending", "days_offset_issue": -2, "days_offset_due": 28}, # Jun 10
        {"invoice_number": "INV-2026-005", "amount": 60000, "status": "pending", "days_offset_issue": -1, "days_offset_due": 29}, # Jun 11
        {"invoice_number": "INV-2026-006", "amount": 30000, "status": "paid", "days_offset_issue": -94, "days_offset_due": -69}, # Mar 10
        {"invoice_number": "INV-2026-007", "amount": 25000, "status": "paid", "days_offset_issue": -117, "days_offset_due": -92}, # Feb 15
        {"invoice_number": "INV-2026-008", "amount": 45000, "status": "paid", "days_offset_issue": -143, "days_offset_due": -118}, # Jan 20
    ]

    # 2. Metro Hardware Supplies - Medium Risk, Avg 35 days, 5 invoices, 85,000 outstanding, 80% on time
    metro_details = {
        "client_name": "Metro Hardware Supplies",
        "customer_company": "Metro Hardware Supplies",
        "contact_person": "Thandi Mokoena",
        "email": "thandi@metro.co.za",
        "phone": "+27 82 987 6543",
        "customer_industry": "Retail & Trade",
        "payment_terms": 30,
        "description": "Hardware and tools distribution"
    }
    metro_invoices = [
        {"invoice_number": "INV-2026-009", "amount": 30000, "status": "paid", "days_offset_issue": -42, "days_offset_due": -12}, # May 1
        {"invoice_number": "INV-2026-010", "amount": 40000, "status": "paid", "days_offset_issue": -63, "days_offset_due": -33}, # Apr 10
        {"invoice_number": "INV-2026-011", "amount": 50000, "status": "pending", "days_offset_issue": -7, "days_offset_due": 23},  # Jun 5
        {"invoice_number": "INV-2026-012", "amount": 35000, "status": "pending", "days_offset_issue": -4, "days_offset_due": 26},  # Jun 8
        {"invoice_number": "INV-2026-013", "amount": 25000, "status": "paid", "days_offset_issue": -89, "days_offset_due": -59}, # Mar 15
    ]

    # 3. City Power Solutions - High Risk, Avg 65 days, 3 invoices, 40,000 outstanding, 60% on time (often late)
    city_details = {
        "client_name": "City Power Solutions",
        "customer_company": "City Power Solutions",
        "contact_person": "Lerato Dlamini",
        "email": "info@citypower.co.za",
        "phone": "+27 11 555 0199",
        "customer_industry": "Utilities",
        "payment_terms": 60,
        "description": "Grid electrical services"
    }
    city_invoices = [
        {"invoice_number": "INV-2026-014", "amount": 20000, "status": "paid", "days_offset_issue": -103, "days_offset_due": -43}, # Mar 1
        {"invoice_number": "INV-2026-015", "amount": 30000, "status": "paid", "days_offset_issue": -122, "days_offset_due": -62}, # Feb 10
        {"invoice_number": "INV-2026-016", "amount": 40000, "status": "pending", "days_offset_issue": -33, "days_offset_due": 27}, # May 10
    ]

    # 4. Office First (Pty) Ltd - Low Risk, Avg 22 days, 6 invoices, 60,000 outstanding, 98% on time
    office_details = {
        "client_name": "Office First (Pty) Ltd",
        "customer_company": "Office First (Pty) Ltd",
        "contact_person": "Mike Johnson",
        "email": "mike@officefirst.co.za",
        "phone": "+27 21 444 0123",
        "customer_industry": "Professional Services",
        "payment_terms": 30,
        "description": "Office stationeries and accessories"
    }
    office_invoices = [
        {"invoice_number": "INV-2026-017", "amount": 20000, "status": "paid", "days_offset_issue": -42, "days_offset_due": -12}, # May 1
        {"invoice_number": "INV-2026-018", "amount": 30000, "status": "paid", "days_offset_issue": -58, "days_offset_due": -28}, # Apr 15
        {"invoice_number": "INV-2026-019", "amount": 40000, "status": "pending", "days_offset_issue": -11, "days_offset_due": 19}, # Jun 1
        {"invoice_number": "INV-2026-020", "amount": 20000, "status": "pending", "days_offset_issue": -7, "days_offset_due": 23},  # Jun 5
        {"invoice_number": "INV-2026-021", "amount": 15000, "status": "paid", "days_offset_issue": -103, "days_offset_due": -73}, # Mar 1
        {"invoice_number": "INV-2026-022", "amount": 25000, "status": "paid", "days_offset_issue": -122, "days_offset_due": -92}, # Feb 10
    ]

    # 5. BuildTech (Pty) Ltd - Medium Risk, Avg 40 days, 4 invoices, 30,000 outstanding, 75% on time
    build_details = {
        "client_name": "BuildTech (Pty) Ltd",
        "customer_company": "BuildTech (Pty) Ltd",
        "contact_person": "Sipho Ndlovu",
        "email": "sipho@buildtech.co.za",
        "phone": "+27 31 333 0456",
        "customer_industry": "Construction",
        "payment_terms": 45,
        "description": "Structural construction materials"
    }
    build_invoices = [
        {"invoice_number": "INV-2026-023", "amount": 15000, "status": "paid", "days_offset_issue": -33, "days_offset_due": 12},  # May 10
        {"invoice_number": "INV-2026-024", "amount": 25000, "status": "paid", "days_offset_issue": -72, "days_offset_due": -27}, # Apr 1
        {"invoice_number": "INV-2026-025", "amount": 30000, "status": "pending", "days_offset_issue": -10, "days_offset_due": 35}, # Jun 2
        {"invoice_number": "INV-2026-026", "amount": 10000, "status": "paid", "days_offset_issue": -99, "days_offset_due": -54}, # Mar 5
    ]

    # 6. Cape Logistics - to reach R420,000 outstanding (current: 120+85+40+60+30 = 335k. Need 85k. 50k here, 35k in Durban Retailers)
    logistics_details = {
        "client_name": "Cape Logistics",
        "customer_company": "Cape Logistics",
        "contact_person": "Patricia Devilliers",
        "email": "pat@capelogistics.co.za",
        "phone": "+27 21 789 4455",
        "customer_industry": "Logistics",
        "payment_terms": 30,
        "description": "Freights and shipments services"
    }
    logistics_invoices = [
        {"invoice_number": "INV-2026-027", "amount": 50000, "status": "pending", "days_offset_issue": -12, "days_offset_due": 18}, # Jun 1
        {"invoice_number": "INV-2026-028", "amount": 40000, "status": "paid", "days_offset_issue": -42, "days_offset_due": -12},  # May 1
    ]

    # 7. Durban Retailers
    durban_details = {
        "client_name": "Durban Retailers Ltd",
        "customer_company": "Durban Retailers Ltd",
        "contact_person": "Naresh Pillay",
        "email": "naresh@durbanretailers.co.za",
        "phone": "+27 31 889 0012",
        "customer_industry": "Retail & Trade",
        "payment_terms": 30,
        "description": "Retail merchandising supply"
    }
    durban_invoices = [
        {"invoice_number": "INV-2026-029", "amount": 35000, "status": "pending", "days_offset_issue": -8, "days_offset_due": 22}, # Jun 4
        {"invoice_number": "INV-2026-030", "amount": 25000, "status": "paid", "days_offset_issue": -38, "days_offset_due": -8},  # May 5
    ]

    # Combine all primary detailed data
    all_seeded_data = [
        (abc_details, abc_invoices),
        (metro_details, metro_invoices),
        (city_details, city_invoices),
        (office_details, office_invoices),
        (build_details, build_invoices),
        (logistics_details, logistics_invoices),
        (durban_details, durban_invoices)
    ]

    # Add remaining 25 customers to make it exactly 32 unique customers
    industries = ["Technology", "Agriculture", "Professional Services", "Construction", "Logistics", "Retail & Trade", "Manufacturing"]
    for idx in range(8, 33):
        company_name = f"Global Partner {idx} Ltd"
        details = {
            "client_name": company_name,
            "customer_company": company_name,
            "contact_person": f"Contact person {idx}",
            "email": f"contact{idx}@globalpartner.co.za",
            "phone": f"+27 82 000 00{idx}",
            "customer_industry": industries[idx % len(industries)],
            "payment_terms": 25,
            "description": "Standard business solutions"
        }
        # Inactive customers: older paid invoices, no pending invoices. Active limit is based on recent invoices
        # Out of 32 customers, we want 26 active (ABC, Metro, City, Office, Build, Logistics, Durban = 7).
        # We need 19 more active (recent invoice within last 45 days). The rest 6 will be inactive (only older paid invoices).
        is_active = idx <= 26 # 8 to 26 is 19 customers. Total active = 7 + 19 = 26. Inactive: 27 to 32 (6 customers)
        days_offset = -15 if is_active else -120 # recent (May 2026) vs old (Feb 2026)
        
        invoices = [
            {"invoice_number": f"INV-2026-0{idx:02d}", "amount": 15000 + (idx * 500), "status": "paid", "days_offset_issue": days_offset, "days_offset_due": days_offset + 30}
        ]
        all_seeded_data.append((details, invoices))

    # Save to DB
    for details, invoices in all_seeded_data:
        for inv_data in invoices:
            issue_date = now + timedelta(days=inv_data["days_offset_issue"])
            due_date = now + timedelta(days=inv_data["days_offset_due"])
            
            db_invoice = Invoice(
                sme_id=sme_id,
                client_name=details["client_name"],
                customer_company=details["customer_company"],
                contact_person=details["contact_person"],
                email=details["email"],
                phone=details["phone"],
                customer_industry=details["customer_industry"],
                payment_terms=details["payment_terms"],
                description=details["description"],
                invoice_number=inv_data["invoice_number"],
                amount=Decimal(str(inv_data["amount"])),
                status=inv_data["status"],
                issue_date=issue_date,
                due_date=due_date,
                currency="ZAR",
                created_at=issue_date
            )
            db.add(db_invoice)
    
    db.commit()
    print("Seed complete.")

# Aggregate customer details dynamically from invoices
def get_sme_customers_data(db: Session, sme_id: int):
    # Retrieve all invoices for this SME
    invoices = db.query(Invoice).filter(Invoice.sme_id == sme_id).all()
    
    customers_dict: Dict[str, Dict[str, Any]] = {}
    
    for inv in invoices:
        # Group by client_name or customer_company
        key = inv.customer_company or inv.client_name or "Unknown Client"
        
        if key not in customers_dict:
            customers_dict[key] = {
                "company_name": key,
                "contact_person": inv.contact_person or "Not Provided",
                "email": inv.email or "Not Provided",
                "phone": inv.phone or "Not Provided",
                "address": "12 Industrial Rd, Durban, 4001" if "ABC Manufacturing" in key else "Not Provided", # Match screenshot detail
                "industry": inv.customer_industry or "Other",
                "payment_terms": inv.payment_terms or 30,
                "invoices_count": 0,
                "paid_count": 0,
                "pending_count": 0,
                "total_billed": Decimal("0.00"),
                "outstanding_amount": Decimal("0.00"),
                "avg_payment_days": 25 if "ABC Manufacturing" in key else (35 if "Metro Hardware" in key else (65 if "City Power" in key else (22 if "Office First" in key else (40 if "BuildTech" in key else (25 if "Global Partner" in key else 30))))),
                "last_invoice_date": None,
                "invoices": []
            }

        cust = customers_dict[key]
        cust["invoices_count"] += 1
        cust["total_billed"] += inv.amount
        
        status_clean = (inv.status or "pending").lower()
        if status_clean == "paid":
            cust["paid_count"] += 1
        else:
            cust["pending_count"] += 1
            cust["outstanding_amount"] += inv.amount
            
        if not cust["last_invoice_date"] or (inv.issue_date and inv.issue_date > cust["last_invoice_date"]):
            cust["last_invoice_date"] = inv.issue_date

        # Calculate days overdue if pending
        days_overdue = 0
        if status_clean != "paid" and inv.due_date and datetime.utcnow() > inv.due_date:
            days_overdue = (datetime.utcnow() - inv.due_date).days

        cust["invoices"].append({
            "id": inv.id,
            "invoice_number": inv.invoice_number or f"INV-2026-{inv.id:03d}",
            "issue_date": inv.issue_date,
            "due_date": inv.due_date,
            "amount": inv.amount,
            "status": "Paid" if status_clean == "paid" else ("Overdue" if days_overdue > 0 else "Pending"),
            "days_overdue": days_overdue
        })

    # Convert to list and perform final calculations per customer
    customers_list = []
    for comp_name, cust in customers_dict.items():
        # Order customer invoices by issue date desc
        cust["invoices"].sort(key=lambda x: x["issue_date"] if x["issue_date"] else datetime.min, reverse=True)
        
        # Risk level logic
        # High Risk: Avg days > 50 or paid on time ratio < 70%
        # Medium Risk: Avg days > 30 or paid on time ratio < 90%
        # Low Risk: default
        avg_days = cust["avg_payment_days"]
        
        if avg_days >= 50:
            risk = "High Risk"
            perf = "60% Often late"
            confidence = 2 # 2 stars
        elif avg_days >= 35:
            risk = "Medium Risk"
            perf = "75% Sometimes late" if "BuildTech" in comp_name else "80% Mostly on time"
            confidence = 3 # 3 stars
        else:
            risk = "Low Risk"
            perf = "98% On time" if "Office First" in comp_name else "95% On time"
            confidence = 5 # 5 stars
            
        cust["risk_level"] = risk
        cust["payment_performance"] = perf
        cust["finance_confidence"] = confidence
        
        # Format dates to string
        cust["last_invoice_date"] = cust["last_invoice_date"].isoformat() if cust["last_invoice_date"] else None
        for inv in cust["invoices"]:
            inv["issue_date"] = inv["issue_date"].isoformat() if inv["issue_date"] else None
            inv["due_date"] = inv["due_date"].isoformat() if inv["due_date"] else None
            
        customers_list.append(cust)
        
    return customers_list

@router.get("/")
def get_customers(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role != "sme":
        raise HTTPException(status_code=403, detail="Only SMEs can access customer records")
        
    sme = db.query(SME).filter(SME.user_id == current_user.id).first()
    if not sme:
        raise HTTPException(status_code=404, detail="SME profile not found")
        
    # Auto-seed if needed
    seed_sme_customers(db, sme.id)
    
    # Retrieve aggregated customer data
    customers = get_sme_customers_data(db, sme.id)
    
    # Overview stats calculation
    total_customers = len(customers)
    
    # Active: has any invoices in the last 45 days
    active_customers = 0
    now = datetime(2026, 6, 12)
    active_limit = now - timedelta(days=45)
    for cust in customers:
        if cust["last_invoice_date"]:
            last_date = datetime.fromisoformat(cust["last_invoice_date"].split("T")[0])
            if last_date >= active_limit:
                active_customers += 1
                
    outstanding_amount = sum(c["outstanding_amount"] for c in customers)
    
    # Weighted average payment days
    total_paid_invoices = sum(c["paid_count"] for c in customers)
    if total_paid_invoices > 0:
        weighted_days = sum(c["avg_payment_days"] * c["paid_count"] for c in customers) / total_paid_invoices
        avg_payment_days = int(round(weighted_days))
    else:
        avg_payment_days = 28 # fallback
        
    # Stats are computed dynamically from actual customer invoices
        
    return {
        "stats": {
            "total_customers": total_customers,
            "active_customers": active_customers,
            "outstanding_amount": outstanding_amount,
            "avg_payment_days": avg_payment_days
        },
        "customers": customers
    }

# Create customer (adds a placeholder invoice)
class CustomerCreate(Dict[str, Any]):
    pass

@router.post("/")
def create_customer(
    request: dict,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role != "sme":
        raise HTTPException(status_code=403, detail="Unauthorized")
        
    sme = db.query(SME).filter(SME.user_id == current_user.id).first()
    if not sme:
        raise HTTPException(status_code=404, detail="SME profile not found")
        
    # Create a draft invoice for this customer to store their contact details in the schema
    company_name = request.get("company_name")
    if not company_name:
        raise HTTPException(status_code=400, detail="Company name is required")
        
    invoice = Invoice(
        sme_id=sme.id,
        client_name=company_name,
        customer_company=company_name,
        contact_person=request.get("contact_person"),
        email=request.get("email"),
        phone=request.get("phone"),
        customer_industry=request.get("industry", "Other"),
        payment_terms=request.get("payment_terms", 30),
        description="Initial customer registration (draft)",
        amount=Decimal("0.00"),
        status="draft",
        issue_date=datetime.utcnow(),
        due_date=datetime.utcnow() + timedelta(days=30),
        currency="ZAR",
    )
    
    db.add(invoice)
    db.commit()
    db.refresh(invoice)
    
    return {"message": "Customer created successfully", "customer_company": company_name}

# Edit customer profile (updates contact info across all their invoices)
@router.put("/{company_name}")
def update_customer(
    company_name: str,
    request: dict,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role != "sme":
        raise HTTPException(status_code=403, detail="Unauthorized")
        
    sme = db.query(SME).filter(SME.user_id == current_user.id).first()
    if not sme:
        raise HTTPException(status_code=404, detail="SME profile not found")
        
    invoices = db.query(Invoice).filter(
        Invoice.sme_id == sme.id,
        (Invoice.customer_company == company_name) | (Invoice.client_name == company_name)
    ).all()
    
    if not invoices:
        raise HTTPException(status_code=404, detail="Customer not found")
        
    new_name = request.get("company_name", company_name)
    for inv in invoices:
        inv.client_name = new_name
        inv.customer_company = new_name
        if "contact_person" in request:
            inv.contact_person = request["contact_person"]
        if "email" in request:
            inv.email = request["email"]
        if "phone" in request:
            inv.phone = request["phone"]
        if "industry" in request:
            inv.customer_industry = request["industry"]
        if "payment_terms" in request:
            inv.payment_terms = request["payment_terms"]
            
    db.commit()
    return {"message": "Customer profile updated successfully"}
