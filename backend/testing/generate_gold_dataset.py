"""
testing/generate_gold_dataset.py

Programmatically generates the 100+ Gold Standard scenario dataset.
Writes individual scenario JSONs to backend/testing/scenarios/<stage>/
and aggregates all scenarios into backend/testing/gold_dataset.json.
"""
import os
import json

# Ensure directories exist
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
SCENARIOS_DIR = os.path.join(BASE_DIR, "scenarios")
categories = ["idea", "startup", "growth", "established", "boundary", "fraud", "missing_evidence"]
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

scenarios = []

# --- 1. IDEA STAGE SCENARIOS (10 cases, 1 per industry) ---
for idx, ind in enumerate(INDUSTRIES):
    s_id = f"SME_IDEA_{idx+1:03d}"
    province = PROVINCES[idx % len(PROVINCES)]
    scenarios.append({
        "id": s_id,
        "name": f"Early {ind} Concept",
        "description": f"An entrepreneur with an early-stage concept in the {ind} sector based in {province}.",
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
            "province": province,
            "founder": {
                "years_industry_experience": 3,
                "highest_qualification": "diploma",
                "prior_business_owner": False,
                "trade_association_member": False,
                "reference_provided": False
            }
        },
        "expected": {
            "profile": "idea",
            "decision": "Declined",
            "score_range": [15.0, 50.0],
            "confidence_range": [15.0, 30.0],
            "recommendations_contain": ["CIPC", "Bank Statement"]
        }
    })

# --- 2. STARTUP STAGE SCENARIOS (10 cases, 1 per industry) ---
for idx, ind in enumerate(INDUSTRIES):
    s_id = f"SME_STARTUP_{idx+1:03d}"
    province = PROVINCES[(idx + 1) % len(PROVINCES)]
    
    expected_decision = "Declined" if ind in ["Construction", "Retail", "Manufacturing", "Hospitality", "Logistics"] else "Review"
    
    scenarios.append({
        "id": s_id,
        "name": f"Registered {ind} Startup",
        "description": f"A formally registered {ind} startup in {province} with CIPC verified.",
        "category": "startup",
        "is_valid_evidence": True,
        "evidence": {
            "revenue": 45000.0,
            "years_active": 0,
            "industry": ind,
            "total_invoices": 0,
            "paid_on_time": 0,
            "unpaid_invoices": 0,
            "verifications": {
                "cipc": "approved"
            },
            "intent_doc_details": {
                "letter_of_intent": {"status": "approved", "loi_counterparty_known": True}
            },
            "overdraft_count": None,
            "income_regularity": None,
            "months_analysed": None,
            "province": province,
            "founder": {
                "years_industry_experience": 5,
                "highest_qualification": "degree",
                "prior_business_owner": False,
                "trade_association_member": True,
                "reference_provided": True
            }
        },
        "expected": {
            "profile": "startup",
            "decision": expected_decision,
            "score_range": [40.0, 75.0],
            "confidence_range": [30.0, 60.0],
            "recommendations_contain": ["bank", "statement"]
        }
    })

# --- 3. GROWTH STAGE SCENARIOS (10 cases, 1 per industry) ---
for idx, ind in enumerate(INDUSTRIES):
    s_id = f"SME_GROWTH_{idx+1:03d}"
    province = PROVINCES[(idx + 2) % len(PROVINCES)]
    scenarios.append({
        "id": s_id,
        "name": f"Growing {ind} Enterprise",
        "description": f"An active {ind} enterprise in {province} with 1.5 years of experience, trading invoices.",
        "category": "growth",
        "is_valid_evidence": True,
        "evidence": {
            "revenue": 180000.0,
            "years_active": 1,
            "industry": ind,
            "total_invoices": 12,
            "paid_on_time": 10,
            "unpaid_invoices": 1,
            "verifications": {
                "cipc": "approved",
                "bank_statement": "approved"
            },
            "intent_doc_details": {},
            "overdraft_count": 0,
            "income_regularity": 0.85,
            "months_analysed": 6,
            "province": province,
            "founder": {
                "years_industry_experience": 7,
                "highest_qualification": "degree",
                "prior_business_owner": True,
                "trade_association_member": True,
                "reference_provided": True
            }
        },
        "expected": {
            "profile": "growth",
            "decision": "Review",
            "score_range": [50.0, 75.0],
            "confidence_range": [65.0, 95.0],
            "recommendations_contain": ["SARS", "unpaid"]
        }
    })

# --- 4. ESTABLISHED STAGE SCENARIOS (10 cases, 1 per industry) ---
for idx, ind in enumerate(INDUSTRIES):
    s_id = f"SME_ESTABLISHED_{idx+1:03d}"
    province = PROVINCES[(idx + 3) % len(PROVINCES)]
    scenarios.append({
        "id": s_id,
        "name": f"Established {ind} Corporate",
        "description": f"A long-standing {ind} company in {province} with robust compliance and history.",
        "category": "established",
        "is_valid_evidence": True,
        "evidence": {
            "revenue": 650000.0,
            "years_active": 5,
            "industry": ind,
            "total_invoices": 45,
            "paid_on_time": 42,
            "unpaid_invoices": 1,
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
            "income_regularity": 0.95,
            "months_analysed": 6,
            "province": province,
            "founder": {
                "years_industry_experience": 12,
                "highest_qualification": "postgraduate",
                "prior_business_owner": True,
                "trade_association_member": True,
                "reference_provided": True
            }
        },
        "expected": {
            "profile": "established",
            "decision": "Approved",
            "score_range": [80.0, 100.0],
            "confidence_range": [90.0, 100.0],
            "recommendations_contain": []
        }
    })

# --- 5. BOUNDARY CASES (20 cases) ---
scenarios.append({
    "id": "SME_BOUNDARY_001",
    "name": "Age 0.99 Years active",
    "description": "Startup stage because age is slightly below 1 year, even with invoices.",
    "category": "boundary",
    "is_valid_evidence": True,
    "evidence": {
        "revenue": 50000.0, "years_active": 0, "industry": "Technology",
        "total_invoices": 5, "paid_on_time": 5, "unpaid_invoices": 0,
        "verifications": {"cipc": "approved"}, "province": "Gauteng"
    },
    "expected": {
        "profile": "startup",
        "decision": "Declined",
        "score_range": [40.0, 60.0]
    }
})

scenarios.append({
    "id": "SME_BOUNDARY_002",
    "name": "Age 1.0 Years active with invoices",
    "description": "Transitions to Growth because age is exactly 1 and there are invoices.",
    "category": "boundary",
    "is_valid_evidence": True,
    "evidence": {
        "revenue": 50000.0, "years_active": 1, "industry": "Technology",
        "total_invoices": 5, "paid_on_time": 5, "unpaid_invoices": 0,
        "verifications": {"cipc": "approved"}, "province": "Gauteng"
    },
    "expected": {
        "profile": "growth",
        "decision": "Declined",
        "score_range": [40.0, 65.0]
    }
})

scenarios.append({
    "id": "SME_BOUNDARY_003",
    "name": "Age 2.99 Years",
    "description": "Growth stage because age is slightly below 3 years.",
    "category": "boundary",
    "is_valid_evidence": True,
    "evidence": {
        "revenue": 150000.0, "years_active": 2, "industry": "Retail",
        "total_invoices": 10, "paid_on_time": 9, "unpaid_invoices": 1,
        "verifications": {"cipc": "approved"}, "province": "Gauteng"
    },
    "expected": {
        "profile": "growth",
        "decision": "Declined",
        "score_range": [40.0, 70.0]
    }
})

scenarios.append({
    "id": "SME_BOUNDARY_004",
    "name": "Age 3.0 Years",
    "description": "Established stage because age is exactly 3 years.",
    "category": "boundary",
    "is_valid_evidence": True,
    "evidence": {
        "revenue": 150000.0, "years_active": 3, "industry": "Retail",
        "total_invoices": 10, "paid_on_time": 9, "unpaid_invoices": 1,
        "verifications": {"cipc": "approved"}, "province": "Gauteng"
    },
    "expected": {
        "profile": "established",
        "decision": "Review",
        "score_range": [40.0, 75.0]
    }
})

scenarios.append({
    "id": "SME_BOUNDARY_005",
    "name": "Invoices 19",
    "description": "Growth stage when age is 1 year and invoices are 19.",
    "category": "boundary",
    "is_valid_evidence": True,
    "evidence": {
        "revenue": 150000.0, "years_active": 1, "industry": "Retail",
        "total_invoices": 19, "paid_on_time": 18, "unpaid_invoices": 1,
        "verifications": {"cipc": "approved"}, "province": "Gauteng"
    },
    "expected": {
        "profile": "growth",
        "decision": "Declined",
        "score_range": [40.0, 75.0]
    }
})

scenarios.append({
    "id": "SME_BOUNDARY_006",
    "name": "Invoices 20",
    "description": "Established stage because invoices are exactly 20, even if age is 1.",
    "category": "boundary",
    "is_valid_evidence": True,
    "evidence": {
        "revenue": 150000.0, "years_active": 1, "industry": "Retail",
        "total_invoices": 20, "paid_on_time": 19, "unpaid_invoices": 1,
        "verifications": {"cipc": "approved"}, "province": "Gauteng"
    },
    "expected": {
        "profile": "established",
        "decision": "Review",
        "score_range": [40.0, 75.0]
    }
})

# Revenue Tier boundaries
revenue_thresholds = [0.0, 49999.0, 50000.0, 99999.0, 100000.0, 199999.0, 200000.0, 499999.0, 500000.0]
for idx, rev in enumerate(revenue_thresholds):
    scenarios.append({
        "id": f"SME_BOUNDARY_{7+idx:03d}",
        "name": f"Revenue Boundary R{rev:,.0f}",
        "description": f"Testing the exact revenue threshold of R{rev:,.0f} under Growth stage.",
        "category": "boundary",
        "is_valid_evidence": True,
        "evidence": {
            "revenue": rev, "years_active": 2, "industry": "Technology",
            "total_invoices": 10, "paid_on_time": 10, "unpaid_invoices": 0,
            "verifications": {"cipc": "approved"}, "province": "Gauteng"
        },
        "expected": {
            "profile": "growth",
            "score_range": [10.0, 95.0]
        }
    })

# Add 5 more boundary cases for general scoring inputs (e.g. founder years experience boundaries 0, 1, 2, 5)
founder_exp_thresholds = [0, 1, 2, 5, 60]
for idx, exp in enumerate(founder_exp_thresholds):
    scenarios.append({
        "id": f"SME_BOUNDARY_{16+idx:03d}",
        "name": f"Founder Experience {exp} years",
        "description": f"Idea stage with founder years experience exactly {exp}.",
        "category": "boundary",
        "is_valid_evidence": True,
        "evidence": {
            "revenue": 0.0, "years_active": 0, "industry": "Technology",
            "total_invoices": 0, "paid_on_time": 0, "unpaid_invoices": 0,
            "verifications": {}, "province": "Gauteng",
            "founder": {
                "years_industry_experience": exp,
                "highest_qualification": "diploma",
                "prior_business_owner": False,
                "trade_association_member": False,
                "reference_provided": False
            }
        },
        "expected": {
            "profile": "idea",
            "score_range": [15.0, 60.0]
        }
    })

# --- 6. MISSING EVIDENCE CASES (20 cases) ---
scenarios.append({
    "id": "SME_MISSING_001",
    "name": "Founder Profile Only",
    "description": "Only founder profile completed. All other evidence fields are zero/missing.",
    "category": "missing_evidence",
    "is_valid_evidence": True,
    "evidence": {
        "revenue": 0.0, "years_active": 0, "industry": "Technology",
        "total_invoices": 0, "paid_on_time": 0, "unpaid_invoices": 0,
        "verifications": {},
        "founder": {
            "years_industry_experience": 5,
            "highest_qualification": "degree",
            "prior_business_owner": True,
            "trade_association_member": True,
            "reference_provided": True
        }
    },
    "expected": {
        "profile": "idea",
        "decision": "Declined",
        "confidence_range": [15.0, 25.0]
    }
})

scenarios.append({
    "id": "SME_MISSING_002",
    "name": "Bank Statement Only",
    "description": "Only bank statement parsed, no founder, no CIPC, no invoices.",
    "category": "missing_evidence",
    "is_valid_evidence": True,
    "evidence": {
        "revenue": 85000.0, "years_active": 0, "industry": "Retail",
        "total_invoices": 0, "paid_on_time": 0, "unpaid_invoices": 0,
        "verifications": {},
        "months_analysed": 6, "income_regularity": 0.9, "overdraft_count": 0
    },
    "expected": {
        "profile": "startup",
        "confidence_range": [30.0, 50.0]
    }
})

scenarios.append({
    "id": "SME_MISSING_003",
    "name": "Invoices Only",
    "description": "Only invoices uploaded. No CIPC, no founder, no bank statement, no years active.",
    "category": "missing_evidence",
    "is_valid_evidence": True,
    "evidence": {
        "revenue": 0.0, "years_active": 0, "industry": "Retail",
        "total_invoices": 10, "paid_on_time": 10, "unpaid_invoices": 0,
        "verifications": {}
    },
    "expected": {
        "profile": "idea",
        "confidence_range": [5.0, 20.0]
    }
})

scenarios.append({
    "id": "SME_MISSING_004",
    "name": "Completely Blank Profile",
    "description": "No evidence whatsoever has been provided.",
    "category": "missing_evidence",
    "is_valid_evidence": True,
    "evidence": {
        "revenue": 0.0, "years_active": 0, "industry": "Other",
        "total_invoices": 0, "paid_on_time": 0, "unpaid_invoices": 0,
        "verifications": {}
    },
    "expected": {
        "profile": "idea",
        "decision": "Declined",
        "confidence_range": [5.0, 15.0]
    }
})

# Create 16 more permutations of missing data
for i in range(5, 21):
    has_cipc = (i % 2 == 0)
    has_founder = ((i // 2) % 2 == 0)
    has_bank = ((i // 4) % 2 == 0)
    has_invoices = ((i // 8) % 2 == 0)
    
    verifs = {}
    if has_cipc:
        verifs["cipc"] = "approved"
    if has_bank:
        verifs["bank_statement"] = "approved"

    scenarios.append({
        "id": f"SME_MISSING_{i:03d}",
        "name": f"Partial Evidence {i-4}",
        "description": f"Permutation {i}: CIPC={has_cipc}, Founder={has_founder}, Bank={has_bank}, Invoices={has_invoices}",
        "category": "missing_evidence",
        "is_valid_evidence": True,
        "evidence": {
            "revenue": 100000.0 if (has_bank or has_invoices) else 0.0,
            "years_active": 1 if has_invoices else 0,
            "industry": "Retail",
            "total_invoices": 8 if has_invoices else 0,
            "paid_on_time": 7 if has_invoices else 0,
            "unpaid_invoices": 1 if has_invoices else 0,
            "verifications": verifs,
            "months_analysed": 6 if has_bank else None,
            "income_regularity": 0.85 if has_bank else None,
            "overdraft_count": 0 if has_bank else None,
            "founder": {
                "years_industry_experience": 4,
                "highest_qualification": "diploma",
                "prior_business_owner": False,
                "trade_association_member": False,
                "reference_provided": False
            } if has_founder else None
        },
        "expected": {
            "score_range": [5.0, 95.0]
        }
    })

# --- 7. FRAUD AND VALIDATION CASES (20 cases) ---
val_failures = [
    ("SME_FRAUD_001", "Negative Revenue", {"revenue": -100.0}),
    ("SME_FRAUD_002", "Negative Years Active", {"years_active": -1}),
    ("SME_FRAUD_003", "Negative Invoices", {"total_invoices": -5}),
    ("SME_FRAUD_004", "Negative Paid Invoices", {"paid_on_time": -1}),
    ("SME_FRAUD_005", "Negative Unpaid Invoices", {"unpaid_invoices": -1}),
    ("SME_FRAUD_006", "Paid exceeds total", {"total_invoices": 5, "paid_on_time": 6}),
    ("SME_FRAUD_007", "Unpaid exceeds total", {"total_invoices": 5, "unpaid_invoices": 6}),
    ("SME_FRAUD_008", "Sum of paid/unpaid exceeds total", {"total_invoices": 10, "paid_on_time": 6, "unpaid_invoices": 5}),
    ("SME_FRAUD_009", "Negative months analyzed", {"months_analysed": -3}),
    ("SME_FRAUD_010", "Negative overdraft", {"overdraft_count": -1}),
    ("SME_FRAUD_011", "Regularity too high", {"income_regularity": 1.1}),
    ("SME_FRAUD_012", "Regularity too low", {"income_regularity": -0.1}),
]

for s_id, name, overrides in val_failures:
    evidence = {
        "revenue": 50000.0, "years_active": 2, "industry": "Technology",
        "total_invoices": 10, "paid_on_time": 8, "unpaid_invoices": 2,
        "verifications": {"cipc": "approved"}, "province": "Gauteng",
        "months_analysed": 6, "income_regularity": 0.8, "overdraft_count": 0
    }
    evidence.update(overrides)
    scenarios.append({
        "id": s_id,
        "name": name,
        "description": f"Validation failure check: {name}",
        "category": "fraud",
        "is_valid_evidence": False,
        "evidence": evidence,
        "expected": {}
    })

scenarios.append({
    "id": "SME_FRAUD_013",
    "name": "Contradictory Founder",
    "description": "10 years business age but founder has 0 years experience.",
    "category": "fraud",
    "is_valid_evidence": True,
    "evidence": {
        "revenue": 100000.0, "years_active": 10, "industry": "Retail",
        "total_invoices": 5, "paid_on_time": 5, "unpaid_invoices": 0,
        "verifications": {}, "founder": {
            "years_industry_experience": 0, "highest_qualification": "matric"
        }
    },
    "expected": {
        "profile": "established",
        "score_range": [15.0, 60.0]
    }
})

scenarios.append({
    "id": "SME_FRAUD_014",
    "name": "Impossible Revenue",
    "description": "R1 billion revenue but active for 0 years and no invoices.",
    "category": "fraud",
    "is_valid_evidence": True,
    "evidence": {
        "revenue": 1000000000.0, "years_active": 0, "industry": "Retail",
        "total_invoices": 0, "paid_on_time": 0, "unpaid_invoices": 0,
        "verifications": {}
    },
    "expected": {
        "profile": "idea",
        "warnings_contain": ["Unusually high revenue"]
    }
})

scenarios.append({
    "id": "SME_FRAUD_015",
    "name": "Impossible Invoices",
    "description": "3 months active (Startup) but 400 invoices.",
    "category": "fraud",
    "is_valid_evidence": True,
    "evidence": {
        "revenue": 200000.0, "years_active": 0, "industry": "Retail",
        "total_invoices": 400, "paid_on_time": 390, "unpaid_invoices": 10,
        "verifications": {"cipc": "approved"}
    },
    "expected": {
        "profile": "established",
        "score_range": [50.0, 95.0]
    }
})

scenarios.append({
    "id": "SME_FRAUD_016",
    "name": "Impossible Age",
    "description": "Business age is 120 years.",
    "category": "fraud",
    "is_valid_evidence": True,
    "evidence": {
        "revenue": 50000.0, "years_active": 120, "industry": "Retail",
        "total_invoices": 0, "paid_on_time": 0, "unpaid_invoices": 0,
        "verifications": {}
    },
    "expected": {
        "profile": "established",
        "warnings_contain": ["Unusually high business age"]
    }
})

for i in range(17, 21):
    scenarios.append({
        "id": f"SME_FRAUD_{i:03d}",
        "name": f"Fraud Permutation {i-16}",
        "description": f"Contradictory revenue/invoice ratio {i-16}",
        "category": "fraud",
        "is_valid_evidence": True,
        "evidence": {
            "revenue": 250000000.0, "years_active": 1, "industry": "Manufacturing",
            "total_invoices": 1, "paid_on_time": 0, "unpaid_invoices": 1,
            "verifications": {}
        },
        "expected": {
            "profile": "growth",
            "warnings_contain": ["Unusually high revenue"]
        }
    })

# Write individual files
for sc in scenarios:
    cat = sc["category"]
    sc_id = sc["id"]
    filepath = os.path.join(SCENARIOS_DIR, cat, f"{sc_id}.json")
    with open(filepath, "w") as f:
        json.dump(sc, f, indent=2)

# Write compiled file
gold_dataset_path = os.path.join(BASE_DIR, "gold_dataset.json")
with open(gold_dataset_path, "w") as f:
    json.dump(scenarios, f, indent=2)

print(f"Generated {len(scenarios)} scenarios.")
print(f"Aggregated file written to: {gold_dataset_path}")
