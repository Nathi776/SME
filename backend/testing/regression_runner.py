"""
testing/regression_runner.py

Test runner for the Assessment Engine Validation Framework.
Loads gold_dataset.json, executes assess() and generate_plan() for each scenario,
validates results against expected definitions, measures execution times,
and performs regression comparison against expected_results.json.
"""
import sys
import os
import json
import time
import argparse
from types import ModuleType

# 1. Mock DB-dependent modules so we run without any database connection
for name in ["database", "models.sme", "models.invoice", "models.verification",
             "models.founder_profile", "models.sme_outcome", "models.credit_score",
             "models.finance_request", "models.lender", "models.user",
             "sqlalchemy", "sqlalchemy.orm"]:
    sys.modules.setdefault(name, ModuleType(name))

# 2. Setup path so we can import backend packages
TESTING_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.dirname(TESTING_DIR)
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from core.scoring import EvidencePackage, FounderSignalInput
from core.assessment_engine import assess, BusinessProfile
from services.recommendations_service import RecommendationEngine

def deserialize_founder(fd):
    if not fd:
        return None
    return FounderSignalInput(
        years_industry_experience=fd.get("years_industry_experience"),
        highest_qualification=fd.get("highest_qualification"),
        prior_business_owner=fd.get("prior_business_owner"),
        trade_association_member=fd.get("trade_association_member"),
        reference_provided=fd.get("reference_provided")
    )

def deserialize_evidence(ev):
    fd = deserialize_founder(ev.get("founder"))
    return EvidencePackage(
        revenue=ev.get("revenue", 0.0),
        years_active=ev.get("years_active", 0),
        industry=ev.get("industry", "Other"),
        total_invoices=ev.get("total_invoices", 0),
        paid_on_time=ev.get("paid_on_time", 0),
        unpaid_invoices=ev.get("unpaid_invoices", 0),
        verifications=ev.get("verifications", {}),
        intent_doc_details=ev.get("intent_doc_details", {}),
        overdraft_count=ev.get("overdraft_count"),
        income_regularity=ev.get("income_regularity"),
        months_analysed=ev.get("months_analysed"),
        province=ev.get("province"),
        founder=fd
    )

def run_scenario(sc):
    """
    Executes a single scenario.
    Returns a dict with execution details:
      {
         "passed": bool,
         "error": str | None,
         "score": float | None,
         "decision": str | None,
         "profile": str | None,
         "confidence": float | None,
         "duration_ms": float,
         "recommendations": list[str]
      }
    """
    start_time = time.perf_counter()
    res_details = {
        "passed": True,
        "error": None,
        "score": None,
        "decision": None,
        "profile": None,
        "confidence": None,
        "duration_ms": 0.0,
        "recommendations": []
    }
    
    is_valid = sc.get("is_valid_evidence", True)
    evidence_dict = sc.get("evidence", {})
    expected = sc.get("expected", {})
    
    try:
        pkg = deserialize_evidence(evidence_dict)
    except Exception as e:
        duration = (time.perf_counter() - start_time) * 1000.0
        res_details["duration_ms"] = round(duration, 2)
        if not is_valid:
            return res_details # Expected deserialization failure
        res_details["passed"] = False
        res_details["error"] = f"Failed to deserialize evidence: {str(e)}"
        return res_details

    # Run core assess
    try:
        result = assess(pkg)
        # Run recommendations engine
        plan = RecommendationEngine.generate(result)
        
        duration = (time.perf_counter() - start_time) * 1000.0
        res_details["duration_ms"] = round(duration, 2)
        res_details["score"] = result.score
        res_details["decision"] = result.decision
        res_details["profile"] = result.profile.value
        res_details["confidence"] = result.confidence_score
        res_details["recommendations"] = [r.action for r in plan.recommendations]
        res_details["warnings"] = result.breakdown.get("_assessment", {}).get("warnings", [])

        if not is_valid:
            res_details["passed"] = False
            res_details["error"] = "Expected validation error but assess() succeeded"
            return res_details
            
        # Verify expected profile
        exp_profile = expected.get("profile")
        if exp_profile and result.profile.value != exp_profile:
            res_details["passed"] = False
            res_details["error"] = f"Profile mismatch. Expected: {exp_profile}, Got: {result.profile.value}"
            return res_details

        # Verify expected decision
        exp_decision = expected.get("decision")
        if exp_decision and result.decision != exp_decision:
            res_details["passed"] = False
            res_details["error"] = f"Decision mismatch. Expected: {exp_decision}, Got: {result.decision}"
            return res_details

        # Verify expected score range
        exp_score_range = expected.get("score_range")
        if exp_score_range:
            low, high = exp_score_range
            if not (low <= result.score <= high):
                res_details["passed"] = False
                res_details["error"] = f"Score {result.score} out of expected range [{low}, {high}]"
                return res_details

        # Verify expected confidence range
        exp_conf_range = expected.get("confidence_range")
        if exp_conf_range:
            low, high = exp_conf_range
            if not (low <= result.confidence_score <= high):
                res_details["passed"] = False
                res_details["error"] = f"Confidence {result.confidence_score} out of expected range [{low}, {high}]"
                return res_details

        # Verify expected warnings contain
        exp_warnings = expected.get("warnings_contain")
        if exp_warnings:
            actual_warnings = res_details["warnings"]
            for w in exp_warnings:
                if not any(w in aw for aw in actual_warnings):
                    res_details["passed"] = False
                    res_details["error"] = f"Expected warning content '{w}' not found in actual warnings: {actual_warnings}"
                    return res_details

        # Verify expected recommendations contain
        exp_recs = expected.get("recommendations_contain")
        if exp_recs:
            actual_recs = res_details["recommendations"]
            for r in exp_recs:
                if not any(r.lower() in ar.lower() for ar in actual_recs):
                    res_details["passed"] = False
                    res_details["error"] = f"Expected recommendation keyword '{r}' not found in actual recommendations"
                    return res_details

    except ValueError as val_err:
        duration = (time.perf_counter() - start_time) * 1000.0
        res_details["duration_ms"] = round(duration, 2)
        if not is_valid:
            # Expected failure
            return res_details
        res_details["passed"] = False
        res_details["error"] = f"Unexpected ValueError raised: {str(val_err)}"
    except Exception as e:
        duration = (time.perf_counter() - start_time) * 1000.0
        res_details["duration_ms"] = round(duration, 2)
        res_details["passed"] = False
        res_details["error"] = f"Exception raised during execution: {str(e)}"
        
    return res_details

def main():
    parser = argparse.ArgumentParser(description="Assessment Engine Regression Runner")
    parser.path = os.path.join(TESTING_DIR, "gold_dataset.json")
    parser.add_argument("--update-expected", action="store_true", help="Overwrite expected_results.json with current results as baseline")
    args = parser.parse_args()

    # Load dataset
    gold_path = os.path.join(TESTING_DIR, "gold_dataset.json")
    if not os.path.exists(gold_path):
        print(f"Error: {gold_path} does not exist. Please run generate_gold_dataset.py first.")
        sys.exit(1)
        
    with open(gold_path, "r") as f:
        scenarios = json.load(f)

    # Load baseline if exists
    expected_results_path = os.path.join(TESTING_DIR, "expected_results.json")
    baseline = {}
    if os.path.exists(expected_results_path) and not args.update_expected:
        with open(expected_results_path, "r") as f:
            baseline = json.load(f)

    results = {}
    passed_count = 0
    failed_count = 0
    total_ms = 0.0
    regression_changes = []
    
    stage_correct = {"idea": 0, "startup": 0, "growth": 0, "established": 0}
    stage_totals = {"idea": 0, "startup": 0, "growth": 0, "established": 0}
    
    recs_matched = 0
    recs_total_cases = 0

    print(f"Running {len(scenarios)} scenarios...")
    
    for sc in scenarios:
        s_id = sc["id"]
        res = run_scenario(sc)
        results[s_id] = {
            "score": res["score"],
            "decision": res["decision"],
            "profile": res["profile"],
            "confidence": res["confidence"],
            "passed": res["passed"],
            "error": res["error"],
            "warnings": res.get("warnings", []),
            "recommendations": res["recommendations"]
        }
        
        total_ms += res["duration_ms"]
        
        # Accumulate metrics
        if res["passed"]:
            passed_count += 1
        else:
            failed_count += 1
            
        actual_profile = res["profile"]
        expected_profile = sc.get("expected", {}).get("profile")
        if expected_profile:
            stage_totals[expected_profile] += 1
            if actual_profile == expected_profile:
                stage_correct[expected_profile] += 1

        exp_recs = sc.get("expected", {}).get("recommendations_contain")
        if exp_recs:
            recs_total_cases += 1
            # Check if all expected recs are in the recommendations
            matched = True
            for r in exp_recs:
                if not any(r.lower() in ar.lower() for ar in res["recommendations"]):
                    matched = False
                    break
            if matched:
                recs_matched += 1

        # Check regression against baseline
        if s_id in baseline and res["score"] is not None:
            base_score = baseline[s_id].get("score")
            base_decision = baseline[s_id].get("decision")
            base_profile = baseline[s_id].get("profile")
            
            if base_score != res["score"] or base_decision != res["decision"] or base_profile != res["profile"]:
                regression_changes.append({
                    "id": s_id,
                    "name": sc["name"],
                    "old_score": base_score,
                    "new_score": res["score"],
                    "old_decision": base_decision,
                    "new_decision": res["decision"],
                    "old_profile": base_profile,
                    "new_profile": res["profile"]
                })

    avg_ms = total_ms / len(scenarios) if scenarios else 0.0
    
    # Save current results as baseline if requested or if none exists
    if args.update_expected or not baseline:
        with open(expected_results_path, "w") as f:
            json.dump(results, f, indent=2)
        print(f"Baseline saved/updated in {expected_results_path}")

    # Build report data for report_generator
    report_data = {
        "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
        "total_scenarios": len(scenarios),
        "passed": passed_count,
        "failed": failed_count,
        "avg_duration_ms": round(avg_ms, 2),
        "total_duration_ms": round(total_ms, 2),
        "stage_accuracy": {
            k: (stage_correct[k] / stage_totals[k] * 100.0) if stage_totals[k] > 0 else 100.0
            for k in stage_totals
        },
        "recommendation_accuracy": (recs_matched / recs_total_cases * 100.0) if recs_total_cases > 0 else 100.0,
        "regression_changes": regression_changes,
        "failed_scenarios": [
            {"id": s_id, "name": s_name, "error": results[s_id]["error"]}
            for s_id, s_name in [(s["id"], s["name"]) for s in scenarios]
            if not results[s_id]["passed"]
        ]
    }

    # Save validation report data to a temp file for the report generator
    report_json_path = os.path.join(TESTING_DIR, "validation_report_data.json")
    with open(report_json_path, "w") as f:
        json.dump(report_data, f, indent=2)
        
    # Call report generator
    try:
        from testing.report_generator import generate_report
        generate_report(report_data)
    except ImportError:
        # Fallback if report_generator.py isn't written yet
        print("\n=== Validation Runner Completed ===")
        print(f"Passed: {passed_count} / {len(scenarios)}")
        print(f"Failed: {failed_count}")
        print(f"Avg Time: {avg_ms:.2f} ms")
        if regression_changes:
            print(f"Regression changes detected in {len(regression_changes)} scenarios!")

if __name__ == "__main__":
    main()
