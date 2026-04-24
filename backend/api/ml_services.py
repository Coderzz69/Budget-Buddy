import json
import os
import sys
import csv
from pathlib import Path

# Add bb_ML to python path if not there
# ml_services.py -> api -> backend -> Budget-Buddy -> Budget_Buddy_app
BASE_DIR = Path(__file__).resolve().parent.parent.parent.parent
BB_ML_DIR = BASE_DIR / "bb_ML"
if str(BB_ML_DIR) not in sys.path:
    sys.path.append(str(BB_ML_DIR))

try:
    from bb_ml.classifier import NaiveBayesCategoryClassifier
except ImportError:
    NaiveBayesCategoryClassifier = None

def get_ml_summary():
    outputs_dir = BB_ML_DIR / "outputs"
    summary_file = outputs_dir / "behavior_summary.json"
        
    data = {}
    if summary_file.exists():
        with open(summary_file, "r") as f:
            data['summary'] = json.load(f)
    else:
        data['summary'] = None
        
    return data

_classifier_model = None

def get_classifier():
    global _classifier_model
    if _classifier_model is None and NaiveBayesCategoryClassifier is not None:
        model_path = BB_ML_DIR / "outputs" / "category_classifier_model.json"
        if model_path.exists():
            with open(model_path, "r", encoding="utf-8") as f:
                _classifier_model = NaiveBayesCategoryClassifier.from_dict(json.load(f))
    return _classifier_model

def predict_category(note: str, amount: float):
    model = get_classifier()
    if not model:
        return None
    
    # build a row dict simulating what the ML expects
    # In a full flow we'd normalize counterparty using the real normalizer
    row = {
        "counterparty_normalized": note.upper().strip(), 
        "counterparty_raw": note,
        "amount_inr": str(amount),
        "hour_of_day": "12", # default assumed
        "day_of_week": "Monday",
    }
    
    predictions = model.predict_proba(row, top_k=3)
    if not predictions:
        return None
        
    return {
        "predicted_category": predictions[0][0],
        "confidence": predictions[0][1],
        "alternatives": [{"category": p[0], "confidence": p[1]} for p in predictions[1:]]
    }
