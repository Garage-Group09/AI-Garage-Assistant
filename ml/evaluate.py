"""
Standalone Evaluation Script for AI-Garage-Assistant Naive Bayes Model.
Runs evaluation on the held-out test split and prints full performance metrics.
"""

import os
import sys
import json

# Import functions from train.py
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from train import load_dataset, stratified_train_test_split, evaluate, print_evaluation_report

def main():
    root_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    data_path = os.path.join(root_dir, "ml", "data", "vehicle_symptoms_dataset.json")
    model_path = os.path.join(root_dir, "backend", "src", "main", "resources", "nb_model.json")

    if len(sys.argv) > 1:
        model_path = sys.argv[1]

    print(f"Loading model from: {model_path}")
    with open(model_path, "r", encoding="utf-8") as f:
        model = json.load(f)

    dataset, _ = load_dataset(data_path)
    _, test_set = stratified_train_test_split(dataset, test_ratio=0.20, seed=42)

    eval_results = evaluate(model, test_set)
    print_evaluation_report(eval_results)

if __name__ == "__main__":
    main()
