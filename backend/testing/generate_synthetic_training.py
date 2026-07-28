"""
testing/generate_synthetic_training.py

Generates 1,000+ synthetic SME profiles covering various stages,
scores them using the Assessment Engine, and simulates realistic outcomes
(Funded, Defaulted, Revenue Doubled, Closed, etc.) statistically based on the score.
Exports the resulting dataset to synthetic_dataset.json and synthetic_dataset.csv.
"""
import sys
import os
import json
import csv
import random
from types import ModuleType

# Mock DB-dependent modules so we run without any database connection
for name in ["database", "models.sme", "models.invoice", "models.verification",
             "models.founder_profile", "models.sme_outcome", "models.credit_score",
             "models.finance_request", "models.lender", "models.user",
             "sqlalchemy", "sqlalchemy.orm"]:
    sys.modules.setdefault(name, ModuleType(name))

# Setup path so we can import backend packages
TESTING_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.dirname(TESTING_DIR)
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from core.scoring import EvidencePackage, FounderSignalInput
from core.assessment_engine import assess

INDUSTRIES = [
    "Agriculture", "Construction", "Retail", "Manufacturing", "Technology",
    "Hospitality", "Logistics", "Healthcare", "Education", "Professional Services"
]

PROVINCES = [
    "Gauteng", "Western Cape", "KwaZulu-Natal", "Eastern Cape", "Limpopo",
    "Mpumalanga", "North West", "Free State", "Northern Cape"
]

QUALIFICATIONS = ["none", "matric", "certificate", "diploma", "degree", "postgraduate"]

def generate_random_sme(stage_choice):
    """
    Generates realistic random evidence package values based on target stage.
    """
    industry = random.choice(INDUSTRIES)
    province = random.choice(PROVINCES)
    
    if stage_choice == "idea":
        revenue = random.choice([0.0, float(random.randint(1000, 45000))])
        years_active = 0
        total_invoices = 0
        paid_on_time = 0
        unpaid_invoices = 0
        verifications = {}
        intent_doc_details = {}
        if random.random() > 0.5:
            # Maybe a supply quote or lease agreement
            intent_doc_details["supplier_quote"] = {"status": "approved"}
        overdraft_count = None
        income_regularity = None
        months_analysed = None
        
        has_founder = random.random() > 0.3
        founder = None
        if has_founder:
            founder = FounderSignalInput(
                years_industry_experience=random.randint(0, 5),
                highest_qualification=random.choice(QUALIFICATIONS),
                prior_business_owner=random.choice([True, False]),
                trade_association_member=random.choice([True, False]),
                reference_provided=random.choice([True, False])
            )
            
    elif stage_choice == "startup":
        revenue = float(random.randint(20000, 120000))
        years_active = random.choice([0, 1])
        total_invoices = random.randint(0, 4)
        paid_on_time = random.randint(0, total_invoices) if total_invoices > 0 else 0
        unpaid_invoices = total_invoices - paid_on_time
        
        verifications = {}
        if random.random() > 0.2:
            verifications["cipc"] = "approved"
        if random.random() > 0.5:
            verifications["bank_statement"] = "approved"
            
        intent_doc_details = {}
        if random.random() > 0.4:
            intent_doc_details["letter_of_intent"] = {"status": "approved", "loi_counterparty_known": random.choice([True, False])}
            
        months_analysed = random.choice([3, 4, None]) if "bank_statement" in verifications else None
        income_regularity = round(random.uniform(0.5, 0.9), 2) if months_analysed else None
        overdraft_count = random.randint(0, 3) if months_analysed else None
        
        has_founder = random.random() > 0.1
        founder = None
        if has_founder:
            founder = FounderSignalInput(
                years_industry_experience=random.randint(1, 8),
                highest_qualification=random.choice(QUALIFICATIONS),
                prior_business_owner=random.choice([True, False]),
                trade_association_member=random.choice([True, False]),
                reference_provided=random.choice([True, False])
            )
            
    elif stage_choice == "growth":
        revenue = float(random.randint(100000, 450000))
        years_active = random.randint(1, 3)
        total_invoices = random.randint(5, 25)
        paid_on_time = int(total_invoices * random.uniform(0.6, 1.0))
        unpaid_invoices = total_invoices - paid_on_time
        
        verifications = {
            "cipc": "approved",
            "bank_statement": "approved"
        }
        if random.random() > 0.5:
            verifications["tax_clearance"] = "approved"
            
        intent_doc_details = {}
        months_analysed = 6
        income_regularity = round(random.uniform(0.7, 0.98), 2)
        overdraft_count = random.choice([0, 0, 1, 2])
        
        founder = FounderSignalInput(
            years_industry_experience=random.randint(2, 12),
            highest_qualification=random.choice(QUALIFICATIONS[2:]), # usually has certificate+
            prior_business_owner=random.choice([True, False]),
            trade_association_member=random.choice([True, False]),
            reference_provided=True
        )
        
    else: # established
        revenue = float(random.randint(400000, 3000000))
        years_active = random.randint(3, 15)
        total_invoices = random.randint(20, 150)
        paid_on_time = int(total_invoices * random.uniform(0.75, 1.0))
        unpaid_invoices = total_invoices - paid_on_time
        
        verifications = {
            "cipc": "approved",
            "bank_statement": "approved",
            "tax_clearance": "approved"
        }
        if random.random() > 0.3:
            verifications["registration_docs"] = "approved"
            
        intent_doc_details = {}
        months_analysed = 6
        income_regularity = round(random.uniform(0.8, 1.0), 2)
        overdraft_count = random.choice([0, 0, 0, 1])
        
        founder = FounderSignalInput(
            years_industry_experience=random.randint(5, 20),
            highest_qualification=random.choice(QUALIFICATIONS[3:]), # diploma+
            prior_business_owner=random.choice([True, False]),
            trade_association_member=random.choice([True, False]),
            reference_provided=True
        )

    return EvidencePackage(
        revenue=revenue,
        years_active=years_active,
        industry=industry,
        total_invoices=total_invoices,
        paid_on_time=paid_on_time,
        unpaid_invoices=unpaid_invoices,
        verifications=verifications,
        intent_doc_details=intent_doc_details,
        overdraft_count=overdraft_count,
        income_regularity=income_regularity,
        months_analysed=months_analysed,
        province=province,
        founder=founder
    )

def simulate_outcome(score):
    """
    Simulates outcome based statistically on the score.
    Higher scores have higher funding chance and better business outcomes.
    """
    rand = random.random()
    
    # 1. Determine Funding status
    if score >= 75.0:
        funded = (rand < 0.85) # 85% funded
    elif score >= 50.0:
        funded = (rand < 0.50) # 50% funded
    else:
        funded = (rand < 0.08) # 8% funded (exception cases)

    if not funded:
        decision_outcome = "Not Funded"
        # Business performance outcome without funding
        perf_rand = random.random()
        if score >= 75.0:
            business_outcome = random.choice(["Growing", "Revenue Doubled", "Growing"]) # thrives anyway
        elif score >= 50.0:
            business_outcome = random.choice(["Growing", "Dormant", "Revenue Declined"])
        else:
            business_outcome = random.choice(["Closed", "Dormant", "Revenue Declined"])
    else:
        decision_outcome = "Funded"
        perf_rand = random.random()
        
        if score >= 75.0:
            # 93% success rate with funding
            if perf_rand < 0.40:
                business_outcome = "Revenue Doubled"
            elif perf_rand < 0.80:
                business_outcome = "Growing"
            elif perf_rand < 0.93:
                business_outcome = "Acquired"
            else:
                business_outcome = "Defaulted" # rare
        elif score >= 50.0:
            # 70% success rate with funding
            if perf_rand < 0.15:
                business_outcome = "Revenue Doubled"
            elif perf_rand < 0.65:
                business_outcome = "Growing"
            elif perf_rand < 0.70:
                business_outcome = "Acquired"
            elif perf_rand < 0.90:
                business_outcome = "Revenue Declined"
            else:
                business_outcome = "Defaulted"
        else:
            # 35% success rate with funding
            if perf_rand < 0.05:
                business_outcome = "Revenue Doubled"
            elif perf_rand < 0.30:
                business_outcome = "Growing"
            elif perf_rand < 0.35:
                business_outcome = "Dormant"
            elif perf_rand < 0.70:
                business_outcome = "Revenue Declined"
            elif perf_rand < 0.90:
                business_outcome = "Defaulted"
            else:
                business_outcome = "Closed"

    return decision_outcome, business_outcome

def main():
    total_count = 1000
    dataset = []
    
    stages = ["idea", "startup", "growth", "established"]
    
    print(f"Generating {total_count} synthetic SME records...")
    
    for i in range(total_count):
        # Even distribution of stage profiles
        target_stage = stages[i % len(stages)]
        pkg = generate_random_sme(target_stage)
        
        # Run through assessment engine
        result = assess(pkg)
        
        # Simulate outcome
        funding_status, business_outcome = simulate_outcome(result.score)
        
        # Serialize founder sub-fields
        founder_dict = {}
        if pkg.founder:
            founder_dict = {
                "years_experience": pkg.founder.years_industry_experience,
                "qualification": pkg.founder.highest_qualification,
                "prior_owner": pkg.founder.prior_business_owner,
                "trade_assoc": pkg.founder.trade_association_member,
                "reference": pkg.founder.reference_provided
            }

        record = {
            "record_id": f"SYN_{i+1:04d}",
            "industry": pkg.industry,
            "province": pkg.province or "None",
            "revenue": pkg.revenue,
            "years_active": pkg.years_active,
            "total_invoices": pkg.total_invoices,
            "paid_on_time": pkg.paid_on_time,
            "unpaid_invoices": pkg.unpaid_invoices,
            "overdraft_count": pkg.overdraft_count if pkg.overdraft_count is not None else -1,
            "income_regularity": pkg.income_regularity if pkg.income_regularity is not None else -1.0,
            "months_analysed": pkg.months_analysed if pkg.months_analysed is not None else -1,
            "cipc_verified": pkg.verifications.get("cipc") == "approved",
            "bank_statement_verified": pkg.verifications.get("bank_statement") == "approved",
            "tax_verified": pkg.verifications.get("tax_clearance") == "approved",
            "founder_experience": founder_dict.get("years_experience", -1),
            "founder_qualification": founder_dict.get("qualification", "none"),
            "founder_prior_owner": founder_dict.get("prior_owner", False),
            
            # Assessment Outputs
            "inferred_stage": result.profile.value,
            "assessment_score": result.score,
            "assessment_decision": result.decision,
            "confidence_score": result.confidence_score,
            
            # Simulated Outcomes
            "funding_status": funding_status,
            "business_outcome": business_outcome
        }
        dataset.append(record)

    # Export to JSON
    json_path = os.path.join(TESTING_DIR, "synthetic_dataset.json")
    with open(json_path, "w") as f:
        json.dump(dataset, f, indent=2)
    print(f"JSON export completed: {json_path}")
    
    # Export to CSV
    csv_path = os.path.join(TESTING_DIR, "synthetic_dataset.csv")
    if dataset:
        keys = dataset[0].keys()
        with open(csv_path, "w", newline="") as f:
            writer = csv.DictWriter(f, fieldnames=keys)
            writer.writeheader()
            writer.writerows(dataset)
    print(f"CSV export completed: {csv_path}")

if __name__ == "__main__":
    main()
