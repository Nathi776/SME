"""
testing/report_generator.py

Generates beautiful console and markdown validation reports.
Exposes a generate_report() function called by regression_runner.py.
"""
import os

def generate_report(report_data):
    testing_dir = os.path.dirname(os.path.abspath(__file__))
    md_path = os.path.join(testing_dir, "validation_report.md")

    # 1. Generate console output
    console = []
    console.append("===========================================")
    console.append("        Assessment Engine Validation       ")
    console.append("===========================================")
    console.append(f"Timestamp:              {report_data['timestamp']}")
    console.append(f"Total Scenarios:        {report_data['total_scenarios']}")
    console.append(f"Passed:                 {report_data['passed']}")
    console.append(f"Failed:                 {report_data['failed']}")
    console.append(f"Avg Execution Time:     {report_data['avg_duration_ms']} ms")
    console.append(f"Total Execution Time:   {report_data['total_duration_ms']} ms")
    console.append("-------------------------------------------")
    console.append("Profile Inference Accuracy:")
    for stage, acc in report_data["stage_accuracy"].items():
        console.append(f"  {stage.capitalize():<12} ......... {acc:.1f}%")
    console.append(f"Recommendation Acc ..... {report_data['recommendation_accuracy']:.1f}%")
    console.append("-------------------------------------------")
    
    # Regression changes
    reg_changes = report_data["regression_changes"]
    if reg_changes:
        console.append(f"WARNING: {len(reg_changes)} regression changes detected!")
        for change in reg_changes[:10]:
            console.append(f"  [{change['id']}] {change['name']}:")
            console.append(f"    Score:    {change['old_score']} -> {change['new_score']}")
            console.append(f"    Decision: {change['old_decision']} -> {change['new_decision']}")
            console.append(f"    Profile:  {change['old_profile']} -> {change['new_profile']}")
        if len(reg_changes) > 10:
            console.append(f"  ... and {len(reg_changes) - 10} more changes.")
    else:
        console.append("Regression: No changes in scores detected compared to baseline.")
    console.append("-------------------------------------------")

    # Failed scenarios
    fails = report_data["failed_scenarios"]
    if fails:
        console.append(f"FAILURES ({len(fails)}):")
        for f in fails:
            console.append(f"  [{f['id']}] {f['name']}: {f['error']}")
    else:
        console.append("All assertions passed successfully!")
    console.append("===========================================")

    console_str = "\n".join(console)
    print(console_str)

    # 2. Generate Markdown report
    md = []
    md.append("# SME Assessment Engine Validation Report")
    md.append(f"**Generated at:** `{report_data['timestamp']}`")
    md.append("")
    
    # Quick Summary Cards
    md.append("## Summary Metrics")
    md.append("| Metric | Value |")
    md.append("| :--- | :--- |")
    md.append(f"| **Total Scenarios** | {report_data['total_scenarios']} |")
    md.append(f"| **Passed** | {report_data['passed']} |")
    md.append(f"| **Failed** | {report_data['failed']} |")
    md.append(f"| **Success Rate** | {(report_data['passed'] / report_data['total_scenarios'] * 100.0):.1f}% |")
    md.append(f"| **Average Execution Time** | {report_data['avg_duration_ms']} ms |")
    md.append("")

    # Stage accuracy table
    md.append("## Stage Inference Accuracy")
    md.append("| stage | Accuracy |")
    md.append("| :--- | :--- |")
    for stage, acc in report_data["stage_accuracy"].items():
        md.append(f"| {stage.capitalize()} | {acc:.1f}% |")
    md.append(f"| **Recommendations Match** | {report_data['recommendation_accuracy']:.1f}% |")
    md.append("")

    # Regression differences
    md.append("## Regression Verification")
    if reg_changes:
        md.append(f"> [!WARNING]")
        md.append(f"> {len(reg_changes)} scenarios changed scores compared to the baseline expected_results.json. This might indicate weight changes or regression bugs.")
        md.append("")
        md.append("| Scenario ID | Scenario Name | Previous Score | New Score | Previous Profile | New Profile |")
        md.append("| :--- | :--- | :--- | :--- | :--- | :--- |")
        for change in reg_changes:
            md.append(f"| {change['id']} | {change['name']} | {change['old_score']} ({change['old_decision']}) | {change['new_score']} ({change['new_decision']}) | {change['old_profile']} | {change['new_profile']} |")
    else:
        md.append("> [!NOTE]")
        md.append("> No regression changes detected. Scoring behavior matches the saved baseline exactly.")
    md.append("")

    # Failures table
    md.append("## Failed Assertions Details")
    if fails:
        md.append("| Scenario ID | Scenario Name | Error Description |")
        md.append("| :--- | :--- | :--- |")
        for f in fails:
            md.append(f"| {f['id']} | {f['name']} | {f['error']} |")
    else:
        md.append("> [!TIP]")
        md.append("> All scenarios passed expectations and range boundaries.")
    md.append("")

    with open(md_path, "w") as f:
        f.write("\n".join(md))
    print(f"Markdown report written to: {md_path}")
