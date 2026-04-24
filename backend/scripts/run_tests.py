import requests
import json
import os

TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ0ZXN0X3VzZXJfMTIzIiwiZW1haWwiOiJ0ZXN0QGV4YW1wbGUuY29tIiwibmFtZSI6IlRlc3RlciJ9.pLNEz-v1Iteg8ve7klohXOsphGzbo-5tTo_2qyOKVqk"
BASE_URL = "http://localhost:8000/api/ml/upload-statement/"
HEADERS = {"Authorization": f"Bearer {TOKEN}"}

test_files = [
    ("Scenario 1: Happy Path", "/home/sanathcoonani/Desktop/Budget_Buddy_app/Budget-Buddy/backend/tests/data/test_happy_path.csv"),
    ("Scenario 2: Variation (Headers)", "/home/sanathcoonani/Desktop/Budget_Buddy_app/Budget-Buddy/backend/tests/data/test_variation_headers.csv"),
    ("Scenario 2: Variation (Dates)", "/home/sanathcoonani/Desktop/Budget_Buddy_app/Budget-Buddy/backend/tests/data/test_variation_dates.csv"),
    ("Scenario 3: Edge Cases", "/home/sanathcoonani/Desktop/Budget_Buddy_app/Budget-Buddy/backend/tests/data/test_edge_cases.csv"),
    ("Scenario 4: ML Accuracy", "/home/sanathcoonani/Desktop/Budget_Buddy_app/Budget-Buddy/backend/tests/data/test_ml_accuracy.csv"),
    ("Scenario 10: Wrong File Type", "/home/sanathcoonani/Desktop/Budget_Buddy_app/Budget-Buddy/backend/manage.py"),
]

for name, path in test_files:
    print(f"--- {name} ---")
    if not os.path.exists(path):
        print(f"Error: File not found at {path}")
        continue
    try:
        with open(path, 'rb') as f:
            files = {'file': f}
            response = requests.post(BASE_URL, headers=HEADERS, files=files)
            print(f"Status: {response.status_code}")
            print(f"Response: {response.text}")
    except Exception as e:
        print(f"Error: {e}")
    print("\n")
