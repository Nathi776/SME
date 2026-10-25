
import subprocess
import sys

TEST_FILES = [
    "test_scoring_unit.py",
    "test_assessment_engine.py",
    "test_scoring_service.py",
]

for test_file in TEST_FILES:
    print(f"\n{'=' * 60}")
    print(f"Running {test_file}")
    print("=" * 60)

    result = subprocess.run(
        [sys.executable, "-m", "pytest", test_file, "-q"],
        check=False,
    )

    if result.returncode != 0:
        print(f"\nFAILED: {test_file}")
        sys.exit(result.returncode)

print("\nAll three test suites passed.")
