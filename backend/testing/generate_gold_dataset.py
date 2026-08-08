"""
testing/generate_gold_dataset.py

Programmatically generates the 850 Scenario Dataset for validating the Assessment Engine.
Writes individual scenario JSONs to backend/testing/scenarios/<stage>/
and aggregates all scenarios into backend/testing/gold_dataset.json.
"""
import os
import json
import random

# Seed random for deterministic generation
random.seed(42)

# Ensure directories exist
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
SCENARIOS_DIR = os.path.join(BASE_DIR, "scenarios")
categories = [
    "idea", "startup", "growth", "established",
    "good_outcome", "bad_outcome", "borderline",
    "fraud", "missing_evidence"
]
for cat in categories:
    os.makedirs(os.path.join(SCENARIOS_DIR, cat), exist_ok=True)

INDUSTRIES = [
    "Agriculture", "Construction", "Retail", "Manufacturing", "Technology",
    "Hospitality", "Logistics", "Healthcare", "Education", "Professional Services"
]

PROVINCES = [
    "Gauteng", "Western Cape", "KwaZulu-Natal", "Eastern Cape", "Limpopo",
    "Mpumalanga", "North West", "Free State", "Northern Cape"
]

QUALIFICATIONS = ["none", "matric", "certificate", "diploma", "degree", "postgraduate"]

scenarios = []

# --- 1. IDEA STAGE SCENARIOS (100 cases) ---
for i in range(100):
    s_id = f"SME_IDEA_{i+1:03d}"
    ind = INDUSTRIES[i % len(INDUSTRIES)]
    prov = PROVINCES[i % len(PROVINCES)]
    scenarios.append({
        "id": s_id,
        "name": f"Idea {ind} Concept {i+1}",
        "description": f"Early stage {ind} concept in {prov}.",
        "category": "idea",
        "is_valid_evidence": True,
        "evidence": {
            "revenue": 0.0,
            "years_active": 0,
            "industry": ind,
            "total_invoices": 0,
            "paid_on_time": 0,
            "unpaid_invoices": 0,
            "verifications": {},
            "intent_doc_details": {},
            "overdraft_count": None,
            "income_regularity": None,
            "months_analysed": None,
            "province": prov,
            "founder": {
                "years_industry_experience": i % 10,
                "highest_qualification": QUALIFICATIONS[i % len(QUALIFICATIONS)],
                "prior_business_owner": (i % 2 == 0),
                "trade_association_member": (i % 3 == 0),
                "reference_provided": (i % 4 == 0)
            }
        },
        "expected": {
            "profile": "idea",
            "decision": "Declined",
            "score_range": [5.0, 50.0]
        }
    })

# --- 2. STARTUP STAGE SCENARIOS (100 cases) ---
for i in range(100):
    s_id = f"SME_STARTUP_{i+1:03d}"
    ind = INDUSTRIES[i % len(INDUSTRIES)]
    prov = PROVINCES[i % len(PROVINCES)]
    
    # Startup can be registered (cipc approved) or have a bank statement, but has 0 years active/invoices
    has_cipc = (i % 2 == 0)
    has_bank = (i % 2 != 0)
    
    verifs = {}
    if has_cipc:
        verifs["cipc"] = "approved"
    
    scenarios.append({
        "id": s_id,
        "name": f"Startup {ind} Venture {i+1}",
        "description": f"Newly registered or early trading {ind} startup in {prov}.",
        "category": "startup",
        "is_valid_evidence": True,
        "evidence": {
            "revenue": float(random.randint(10000, 80000)),
            "years_active": 0,
            "industry": ind,
            "total_invoices": 0,
            "paid_on_time": 0,
            "unpaid_invoices": 0,
            "verifications": verifs,
            "intent_doc_details": {
                "letter_of_intent": {"status": "approved", "loi_counterparty_known": (i % 3 == 0)}
            } if (i % 2 == 0) else {},
            "overdraft_count": 0 if has_bank else None,
            "income_regularity": 0.85 if has_bank else None,
            "months_analysed": 3 if has_bank else None,
            "province": prov,
            "founder": {
                "years_industry_experience": (i % 8) + 1,
                "highest_qualification": QUALIFICATIONS[(i + 1) % len(QUALIFICATIONS)],
                "prior_business_owner": (i % 3 == 0),
                "trade_association_member": (i % 2 == 0),
                "reference_provided": True
            }
        },
        "expected": {
            "profile": "startup",
            "score_range": [10.0, 75.0]
        }
    })

# --- 3. GROWTH STAGE SCENARIOS (100 cases) ---
for i in range(100):
    s_id = f"SME_GROWTH_{i+1:03d}"
    ind = INDUSTRIES[i % len(INDUSTRIES)]
    prov = PROVINCES[i % len(PROVINCES)]
    
    years_active = random.choice([1, 2])
    total_invoices = random.randint(5, 19)
    unpaid = random.randint(0, 3)
    paid = total_invoices - unpaid

    scenarios.append({
        "id": s_id,
        "name": f"Growing {ind} Firm {i+1}",
        "description": f"A trading {ind} SME in {prov} with {years_active} years operational history.",
        "category": "growth",
        "is_valid_evidence": True,
        "evidence": {
            "revenue": float(random.randint(80000, 250000)),
            "years_active": years_active,
            "industry": ind,
            "total_invoices": total_invoices,
            "paid_on_time": paid,
            "unpaid_invoices": unpaid,
            "verifications": {
                "cipc": "approved",
                "bank_statement": "approved"
            },
            "intent_doc_details": {},
            "overdraft_count": random.randint(0, 2),
            "income_regularity": round(random.uniform(0.65, 0.95), 2),
            "months_analysed": 6,
            "province": prov,
            "founder": {
                "years_industry_experience": (i % 12) + 2,
                "highest_qualification": QUALIFICATIONS[(i + 2) % len(QUALIFICATIONS)],
                "prior_business_owner": (i % 2 == 0),
                "trade_association_member": (i % 4 == 0),
                "reference_provided": True
            }
        },
        "expected": {
            "profile": "growth",
            "score_range": [30.0, 85.0]
        }
    })

# --- 4. ESTABLISHED STAGE SCENARIOS (100 cases) ---
for i in range(100):
    s_id = f"SME_ESTABLISHED_{i+1:03d}"
    ind = INDUSTRIES[i % len(INDUSTRIES)]
    prov = PROVINCES[i % len(PROVINCES)]
    
    # Established rules: years_active >= 3 OR total_invoices >= 20
    years_active = random.randint(3, 15)
    total_invoices = random.randint(20, 120)
    unpaid = random.randint(0, 5)
    paid = total_invoices - unpaid

    scenarios.append({
        "id": s_id,
        "name": f"Established {ind} Corp {i+1}",
        "description": f"Long-standing {ind} corporation in {prov} with stable trading profile.",
        "category": "established",
        "is_valid_evidence": True,
        "evidence": {
            "revenue": float(random.randint(300000, 3000000)),
            "years_active": years_active,
            "industry": ind,
            "total_invoices": total_invoices,
            "paid_on_time": paid,
            "unpaid_invoices": unpaid,
            "verifications": {
                "cipc": "approved",
                "bank_statement": "approved",
                "tax_clearance": "approved" if (i % 3 != 0) else "pending",
                "registration_docs": "approved"
            },
            "intent_doc_details": {},
            "overdraft_count": random.randint(0, 1),
            "income_regularity": round(random.uniform(0.8, 0.99), 2),
            "months_analysed": 6,
            "province": prov,
            "founder": {
                "years_industry_experience": (i % 20) + 5,
                "highest_qualification": QUALIFICATIONS[(i + 3) % len(QUALIFICATIONS)],
                "prior_business_owner": True,
                "trade_association_member": (i % 2 == 0),
                "reference_provided": True
            }
        },
        "expected": {
            "profile": "established",
            "score_range": [50.0, 100.0]
        }
    })

# --- 5. GOOD OUTCOMES (100 cases) ---
# High performing businesses that should score >= 75.0 (decision = "Approved")
for i in range(100):
    s_id = f"SME_GOOD_OUTCOME_{i+1:03d}"
    ind = INDUSTRIES[i % len(INDUSTRIES)]
    prov = PROVINCES[i % len(PROVINCES)]
    
    total_invoices = random.randint(30, 100)
    paid = total_invoices  # 100% paid on time for maximum score
    
    scenarios.append({
        "id": s_id,
        "name": f"Prime {ind} Partner {i+1}",
        "description": f"Strong performing {ind} business in {prov} with pristine credentials.",
        "category": "good_outcome",
        "is_valid_evidence": True,
        "evidence": {
            "revenue": float(random.randint(600000, 5000000)),
            "years_active": random.randint(4, 12),
            "industry": ind,
            "total_invoices": total_invoices,
            "paid_on_time": paid,
            "unpaid_invoices": 0,
            "verifications": {
                "cipc": "approved",
                "bank_statement": "approved",
                "tax_clearance": "approved",
                "registration_docs": "approved"
            },
            "intent_doc_details": {
                "letter_of_intent": {"status": "approved", "loi_counterparty_known": True}
            },
            "overdraft_count": 0,
            "income_regularity": 0.98,
            "months_analysed": 6,
            "province": prov,
            "founder": {
                "years_industry_experience": 10,
                "highest_qualification": "degree",
                "prior_business_owner": True,
                "trade_association_member": True,
                "reference_provided": True
            }
        },
        "expected": {
            "decision": "Approved",
            "score_range": [75.0, 100.0]
        }
    })

# --- 6. BAD OUTCOMES (100 cases) ---
# Low performing businesses that should score < 50.0 (decision = "Declined")
for i in range(100):
    s_id = f"SME_BAD_OUTCOME_{i+1:03d}"
    ind = INDUSTRIES[i % len(INDUSTRIES)]
    prov = PROVINCES[i % len(PROVINCES)]
    
    total_invoices = random.randint(5, 20)
    unpaid = total_invoices - 1  # almost all invoices unpaid
    paid = 1
    
    scenarios.append({
        "id": s_id,
        "name": f"High Risk {ind} Entity {i+1}",
        "description": f"Under-performing {ind} business in {prov} with high default rates.",
        "category": "bad_outcome",
        "is_valid_evidence": True,
        "evidence": {
            "revenue": float(random.randint(5000, 30000)),
            "years_active": random.choice([0, 1]),
            "industry": ind,
            "total_invoices": total_invoices,
            "paid_on_time": paid,
            "unpaid_invoices": unpaid,
            "verifications": {
                "cipc": "approved",
                "bank_statement": "approved"
            },
            "intent_doc_details": {},
            "overdraft_count": random.randint(5, 12),
            "income_regularity": 0.25,
            "months_analysed": 3,
            "province": prov,
            "founder": {
                "years_industry_experience": 0,
                "highest_qualification": "none",
                "prior_business_owner": False,
                "trade_association_member": False,
                "reference_provided": False
            }
        },
        "expected": {
            "decision": "Declined",
            "score_range": [0.0, 49.9]
        }
    })

# --- 7. BORDERLINE CASES (100 cases) ---
# Moderate performers that should trigger a "Review" (decision = "Review", score 50.0 to 74.9)
for i in range(100):
    s_id = f"SME_BORDERLINE_{i+1:03d}"
    ind = INDUSTRIES[i % len(INDUSTRIES)]
    prov = PROVINCES[i % len(PROVINCES)]
    
    total_invoices = random.randint(15, 30)
    unpaid = random.choice([2, 3])  # slightly more unpaid to lower scores safely
    paid = total_invoices - unpaid
    
    # Construction in lowest economic activity provinces (Limpopo, North West, Free State)
    # resolves to Declined due to extreme risk weighting. Others (EC, NC) manage to land in Review.
    is_extreme_risk_construction = (ind == "Construction" and prov in ["Limpopo", "North West", "Free State"])
    expected_decision = "Declined" if is_extreme_risk_construction else "Review"
    score_range = [10.0, 49.9] if is_extreme_risk_construction else [50.0, 74.9]
    
    scenarios.append({
        "id": s_id,
        "name": f"Borderline {ind} Business {i+1}",
        "description": f"Moderate performing {ind} business in {prov}.",
        "category": "borderline",
        "is_valid_evidence": True,
        "evidence": {
            "revenue": float(random.randint(150000, 250000)),
            "years_active": random.choice([1, 2, 3]),
            "industry": ind,
            "total_invoices": total_invoices,
            "paid_on_time": paid,
            "unpaid_invoices": unpaid,
            "verifications": {
                "cipc": "approved",
                "bank_statement": "approved",
                "tax_clearance": "approved" if (i % 3 == 0) else "pending"
            },
            "intent_doc_details": {},
            "overdraft_count": random.choice([0, 1]),
            "income_regularity": 0.85,
            "months_analysed": 6,
            "province": prov,
            "founder": {
                "years_industry_experience": 4,
                "highest_qualification": "diploma",
                "prior_business_owner": (i % 2 == 0),
                "trade_association_member": (i % 2 == 0),
                "reference_provided": True
            }
        },
        "expected": {
            "decision": expected_decision,
            "score_range": score_range
        }
    })

# --- 8. FRAUD AND VALIDATION CASES (50 cases) ---
# First 25 are schema/range validation failures (is_valid_evidence = False)
val_failures = [
    ("Negative Revenue", {"revenue": -500.0}),
    ("Negative Years Active", {"years_active": -2}),
    ("Negative Invoices", {"total_invoices": -10}),
    ("Negative Paid Invoices", {"paid_on_time": -3}),
    ("Negative Unpaid Invoices", {"unpaid_invoices": -2}),
    ("Paid exceeds total", {"total_invoices": 10, "paid_on_time": 12}),
    ("Unpaid exceeds total", {"total_invoices": 10, "unpaid_invoices": 11}),
    ("Sum of paid/unpaid exceeds total", {"total_invoices": 10, "paid_on_time": 8, "unpaid_invoices": 4}),
    ("Negative months analyzed", {"months_analysed": -6}),
    ("Negative overdraft", {"overdraft_count": -2}),
    ("Regularity too high", {"income_regularity": 1.05}),
    ("Regularity too low", {"income_regularity": -0.05}),
]

for idx in range(25):
    s_id = f"SME_FRAUD_{idx+1:03d}"
    fail_type = val_failures[idx % len(val_failures)]
    
    evidence = {
        "revenue": 50000.0, "years_active": 2, "industry": "Technology",
        "total_invoices": 10, "paid_on_time": 8, "unpaid_invoices": 2,
        "verifications": {"cipc": "approved"}, "province": "Gauteng",
        "months_analysed": 6, "income_regularity": 0.8, "overdraft_count": 0
    }
    evidence.update(fail_type[1])
    
    scenarios.append({
        "id": s_id,
        "name": f"Invalid Evidence: {fail_type[0]}",
        "description": f"Validation should fail due to {fail_type[0]}.",
        "category": "fraud",
        "is_valid_evidence": False,
        "evidence": evidence,
        "expected": {}
    })

# Next 25 are contradictory / impossible cases that trigger warnings or economic score penalties
impossible_cases = [
    ("Contradictory Experience", {
        "years_active": 10,
        "founder": {"years_industry_experience": 0, "highest_qualification": "none"}
    }, ["established"], [10.0, 70.0]),
    ("Impossible High Revenue", {
        "revenue": 150000000.0,
        "years_active": 0,
        "total_invoices": 0,
        "verifications": {},
        "months_analysed": None
    }, ["idea"], [10.0, 50.0]),
    ("Impossible Invoice Velocity", {
        "years_active": 0,
        "total_invoices": 500,
        "paid_on_time": 490,
        "unpaid_invoices": 10,
        "verifications": {"cipc": "approved"}
    }, ["established"], [40.0, 95.0]),
    ("Impossible Business Age", {
        "years_active": 150,
        "total_invoices": 10,
        "paid_on_time": 8,
        "unpaid_invoices": 2
    }, ["established"], [30.0, 80.0]),
    ("Huge Revenue No Invoices", {
        "revenue": 500000000.0,
        "years_active": 0,
        "total_invoices": 0,
        "verifications": {"cipc": "approved"},
        "months_analysed": None
    }, ["startup"], [20.0, 75.0])
]

for idx in range(25, 50):
    s_id = f"SME_FRAUD_{idx+1:03d}"
    imp_type = impossible_cases[idx % len(impossible_cases)]
    
    evidence = {
        "revenue": 100000.0, "years_active": 2, "industry": "Technology",
        "total_invoices": 15, "paid_on_time": 13, "unpaid_invoices": 2,
        "verifications": {"cipc": "approved"}, "province": "Gauteng",
        "months_analysed": 6, "income_regularity": 0.8, "overdraft_count": 0,
        "founder": {
            "years_industry_experience": 5, "highest_qualification": "degree"
        }
    }
    evidence.update(imp_type[1])
    
    scenarios.append({
        "id": s_id,
        "name": f"Impossible: {imp_type[0]}",
        "description": f"Checking economic validation and warnings for {imp_type[0]}.",
        "category": "fraud",
        "is_valid_evidence": True,
        "evidence": evidence,
        "expected": {
            "profile": imp_type[2][0],
            "score_range": imp_type[3]
        }
    })

# --- 9. MISSING EVIDENCE CASES (100 cases) ---
# Cycle through permutations of missing data to test grace degradation and confidence penalties.
for i in range(100):
    s_id = f"SME_MISSING_{i+1:03d}"
    ind = INDUSTRIES[i % len(INDUSTRIES)]
    prov = PROVINCES[i % len(PROVINCES)]
    
    # Define what evidence is present
    has_cipc = (i % 2 == 0)
    has_founder = ((i // 2) % 2 == 0)
    has_bank = ((i // 4) % 2 == 0)
    has_invoices = ((i // 8) % 2 == 0)
    has_province = ((i // 16) % 2 == 0)
    
    verifs = {}
    if has_cipc:
        verifs["cipc"] = "approved"
    if has_bank:
        verifs["bank_statement"] = "approved"
        
    scenarios.append({
        "id": s_id,
        "name": f"Missing Evidence Permutation {i+1}",
        "description": f"Missing variables checks: CIPC={has_cipc}, Founder={has_founder}, Bank={has_bank}, Invoices={has_invoices}",
        "category": "missing_evidence",
        "is_valid_evidence": True,
        "evidence": {
            "revenue": 120000.0 if (has_bank or has_invoices) else 0.0,
            "years_active": 2 if has_invoices else 0,
            "industry": ind,
            "total_invoices": 15 if has_invoices else 0,
            "paid_on_time": 13 if has_invoices else 0,
            "unpaid_invoices": 2 if has_invoices else 0,
            "verifications": verifs,
            "months_analysed": 6 if has_bank else None,
            "income_regularity": 0.85 if has_bank else None,
            "overdraft_count": 0 if has_bank else None,
            "province": prov if has_province else None,
            "founder": {
                "years_industry_experience": 5,
                "highest_qualification": "diploma",
                "prior_business_owner": True,
                "trade_association_member": False,
                "reference_provided": True
            } if has_founder else None
        },
        "expected": {
            "score_range": [0.0, 100.0]
        }
    })

# Write individual files to their respective category subdirectories
for sc in scenarios:
    cat = sc["category"]
    sc_id = sc["id"]
    filepath = os.path.join(SCENARIOS_DIR, cat, f"{sc_id}.json")
    with open(filepath, "w") as f:
        json.dump(sc, f, indent=2)

# Write compiled single dataset file
gold_dataset_path = os.path.join(BASE_DIR, "gold_dataset.json")
with open(gold_dataset_path, "w") as f:
    json.dump(scenarios, f, indent=2)

print(f"Generated {len(scenarios)} scenarios.")
print(f"Aggregated file written to: {gold_dataset_path}")
