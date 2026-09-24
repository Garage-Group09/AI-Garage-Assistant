"""
Reproducible Multinomial Naive Bayes Training Pipeline for AI-Garage-Assistant.
Strictly zero third-party dependencies (Python 3.8+ standard library only).
Matches Java NaiveBayesService tokenization, scoring and output structure.
"""

import json
import math
import os
import random
import re
import sys
import hashlib
from contextlib import contextmanager
from collections import Counter, defaultdict
from datetime import datetime

# 7 Supported Target Classes
CLASSES = [
    "air_conditioning",
    "brake_system",
    "cooling_system",
    "electrical_battery",
    "engine_mechanical",
    "tires_suspension",
    "transmission"
]

def tokenize(text):
    """Matches Java NaiveBayesService: text.toLowerCase().split("\\W+")"""
    return [t for t in re.split(r'[^a-z0-9_]+', text.lower()) if t]

def load_dataset(dataset_path, approved_candidates_path=None):
    with open(dataset_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    approved_candidates = []
    # Optionally load approved admin-reviewed candidates (to be appended strictly to training set)
    if approved_candidates_path and os.path.exists(approved_candidates_path):
        with open(approved_candidates_path, "r", encoding="utf-8") as f:
            candidates = json.load(f)
            approved = [c for c in candidates if c.get("status") == "APPROVED"]
            for c in approved:
                approved_candidates.append({
                    "id": f"cand_{c.get('id', len(data)+1)}",
                    "text": c["symptomText"],
                    "category": c["reviewedCategory"] or c["proposedCategory"],
                    "provenance": "admin_reviewed_candidate"
                })
    return data, approved_candidates

def stratified_train_test_split(data, test_ratio=0.20, seed=42):
    random.seed(seed)
    by_class = defaultdict(list)
    for item in data:
        by_class[item["category"]].append(item)

    train_set, test_set = [], []
    for cls in CLASSES:
        items = list(by_class[cls])
        random.shuffle(items)
        n_test = max(1, int(round(len(items) * test_ratio)))
        test_set.extend(items[:n_test])
        train_set.extend(items[n_test:])
    return train_set, test_set

def train_naive_bayes(train_set, alpha=1.0):
    total_docs = len(train_set)
    class_docs = Counter(item["category"] for item in train_set)

    # 1. Class Log Priors: log(Nc / N)
    class_log_prior = [math.log(class_docs[cls] / total_docs) for cls in CLASSES]

    # 2. Build Vocabulary ONLY from training data (no test leakage)
    vocab_counter = Counter()
    class_word_counts = {cls: Counter() for cls in CLASSES}

    for item in train_set:
        cls = item["category"]
        tokens = tokenize(item["text"])
        for token in tokens:
            vocab_counter[token] += 1
            class_word_counts[cls][token] += 1

    # Deterministic vocabulary sorted alphabetically
    vocabulary = {word: idx for idx, word in enumerate(sorted(vocab_counter.keys()))}
    vocab_size = len(vocabulary)

    # 3. Feature Log Probabilities: Laplace smoothing (alpha=1.0)
    # P(w|c) = (count(w,c) + alpha) / (total_words_in_c + alpha * vocab_size)
    feature_log_prob = []
    for cls in CLASSES:
        total_words_c = sum(class_word_counts[cls].values())
        denominator = total_words_c + alpha * vocab_size
        cls_probs = []
        for word in vocabulary.keys():
            count_w_c = class_word_counts[cls].get(word, 0)
            cls_probs.append(math.log((count_w_c + alpha) / denominator))
        feature_log_prob.append(cls_probs)

    model = {
        "vocabulary": vocabulary,
        "classes": CLASSES,
        "class_log_prior": class_log_prior,
        "feature_log_prob": feature_log_prob
    }
    return model

def predict(model, text):
    tokens = tokenize(text)
    classes = model["classes"]
    vocab = model["vocabulary"]
    priors = model["class_log_prior"]
    flp = model["feature_log_prob"]

    scores = list(priors)
    for c_idx in range(len(classes)):
        for token in tokens:
            if token in vocab:
                w_idx = vocab[token]
                scores[c_idx] += flp[c_idx][w_idx]

    # Softmax for probabilities
    max_score = max(scores)
    exp_scores = [math.exp(s - max_score) for s in scores]
    sum_exp = sum(exp_scores)
    probabilities = {classes[i]: exp_scores[i] / sum_exp for i in range(len(classes))}
    best_class = classes[scores.index(max(scores))]
    return best_class, probabilities

def evaluate(model, test_set):
    classes = model["classes"]
    n_classes = len(classes)
    cls_to_idx = {c: i for i, c in enumerate(classes)}

    # Confusion Matrix: rows = actual, cols = predicted
    confusion = [[0] * n_classes for _ in range(n_classes)]

    for item in test_set:
        actual = item["category"]
        pred, _ = predict(model, item["text"])
        r = cls_to_idx[actual]
        c = cls_to_idx[pred]
        confusion[r][c] += 1

    total_test = len(test_set)
    correct = sum(confusion[i][i] for i in range(n_classes))
    accuracy = correct / total_test if total_test > 0 else 0.0

    per_class = {}
    f1_list, prec_list, rec_list = [], [], []
    for i, cls in enumerate(classes):
        tp = confusion[i][i]
        fp = sum(confusion[r][i] for r in range(n_classes) if r != i)
        fn = sum(confusion[i][c] for c in range(n_classes) if c != i)
        support = sum(confusion[i])

        prec = tp / (tp + fp) if (tp + fp) > 0 else 0.0
        rec = tp / (tp + fn) if (tp + fn) > 0 else 0.0
        f1 = (2 * prec * rec) / (prec + rec) if (prec + rec) > 0 else 0.0

        per_class[cls] = {
            "precision": round(prec, 4),
            "recall": round(rec, 4),
            "f1_score": round(f1, 4),
            "support": support
        }
        prec_list.append(prec)
        rec_list.append(rec)
        f1_list.append(f1)

    macro_f1 = sum(f1_list) / len(f1_list) if f1_list else 0.0
    macro_prec = sum(prec_list) / len(prec_list) if prec_list else 0.0
    macro_rec = sum(rec_list) / len(rec_list) if rec_list else 0.0

    return {
        "accuracy": round(accuracy, 4),
        "macro_f1": round(macro_f1, 4),
        "macro_precision": round(macro_prec, 4),
        "macro_recall": round(macro_rec, 4),
        "per_class": per_class,
        "confusion_matrix": confusion,
        "classes": classes,
        "total_test_samples": total_test
    }

def print_evaluation_report(eval_results):
    print("\n" + "="*75)
    print("NAIVE BAYES HELD-OUT TEST EVALUATION METRICS")
    print("="*75)
    print(f"Overall Accuracy:   {eval_results['accuracy']*100:.2f}%")
    print(f"Macro Average F1:   {eval_results['macro_f1']:.4f}")
    print(f"Macro Precision:    {eval_results['macro_precision']:.4f}")
    print(f"Macro Recall:       {eval_results['macro_recall']:.4f}")
    print(f"Total Test Samples: {eval_results['total_test_samples']}")
    print("-" * 75)
    print(f"{'Class':<22} | {'Precision':<10} | {'Recall':<10} | {'F1-Score':<10} | {'Support':<8}")
    print("-" * 75)
    for cls, metrics in eval_results["per_class"].items():
        print(f"{cls:<22} | {metrics['precision']:<10.4f} | {metrics['recall']:<10.4f} | {metrics['f1_score']:<10.4f} | {metrics['support']:<8}")
    print("-" * 75)
    print("\nCONFUSION MATRIX (Rows: Actual, Columns: Predicted):")
    header = " " * 22 + " ".join([f"{c[:4]:>6}" for c in eval_results["classes"]])
    print(header)
    for i, cls in enumerate(eval_results["classes"]):
        row_str = " ".join([f"{val:>6}" for val in eval_results["confusion_matrix"][i]])
        print(f"{cls:<22} {row_str}")
    print("="*75 + "\n")

def normalized(text):
    return " ".join(tokenize(text))


def validate_candidates(candidates, base_train, held_out):
    """Approved text cannot duplicate base/training or evaluation complaints."""
    seen = {normalized(row["text"]) for row in base_train}
    reserved = {normalized(row["text"]) for row in held_out}
    clean = []
    for item in candidates:
        if item["category"] not in CLASSES:
            raise ValueError("Candidate contains an unsupported reviewed category")
        key = normalized(item["text"])
        if not key:
            raise ValueError("Candidate must contain English symptom text for this model")
        if key in reserved:
            raise ValueError("Candidate overlaps the held-out evaluation set")
        if key not in seen:
            clean.append(item)
            seen.add(key)
    return clean


def atomic_json(path, data):
    path = os.path.abspath(path)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    temporary = path + ".tmp"
    try:
        with open(temporary, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, allow_nan=False)
        os.replace(temporary, path)
    finally:
        if os.path.exists(temporary):
            os.unlink(temporary)


@contextmanager
def training_lock(root):
    lock_path = os.path.join(root, "ml", ".training.lock")
    try:
        fd = os.open(lock_path, os.O_CREAT | os.O_EXCL | os.O_WRONLY)
    except FileExistsError:
        raise RuntimeError("Another training job is running. If a process crashed, stop it before removing ml/.training.lock.")
    os.close(fd)
    try:
        yield
    finally:
        os.unlink(lock_path)


def run_training(root, rollback=False):
    models = os.path.join(root, "ml", "models")
    os.makedirs(models, exist_ok=True)
    state_path = os.path.join(models, "serving_model.json")
    serving_path = os.path.join(root, "backend", "src", "main", "resources", "nb_model.json")
    previous = {}
    if os.path.exists(state_path):
        with open(state_path, encoding="utf-8") as f:
            previous = json.load(f)
    old_version = previous.get("servingVersion", "v1.0.0")
    if rollback:
        with open(os.path.join(models, "nb_model_v1.0.0.json"), encoding="utf-8") as f:
            baseline = json.load(f)
        atomic_json(serving_path, baseline)
        state = {"servingVersion": "v1.0.0", "status": "ROLLED_BACK", "rollbackAvailable": True}
        atomic_json(state_path, state)
        return state

    dataset, candidates = load_dataset(
        os.path.join(root, "ml", "data", "vehicle_symptoms_dataset.json"),
        os.path.join(root, "ml", "data", "approved_candidates.json"))
    base_train, test_set = stratified_train_test_split(dataset)
    candidates = validate_candidates(candidates, base_train, test_set)
    training = base_train + candidates
    model = train_naive_bayes(training)
    metrics = evaluate(model, test_set)
    print_evaluation_report(metrics)
    with open(os.path.join(models, "evaluation_report_v1.0.0.json"), encoding="utf-8") as f:
        baseline = json.load(f)["evaluation"]
    # Prototype acceptance gate on a small development benchmark; not field validation.
    accepted = metrics["macro_f1"] >= baseline["macro_f1"] and metrics["accuracy"] >= baseline["accuracy"]
    digest = hashlib.sha256(json.dumps(training, sort_keys=True).encode()).hexdigest()[:12]
    version = "candidate_" + digest
    report = {"version": version, "status": "ACTIVATED" if accepted else "REJECTED",
              "timestamp": datetime.now().isoformat(), "train_samples": len(training),
              "test_samples": len(test_set), "total_dataset_size": len(training) + len(test_set),
              "approved_samples": len(candidates), "evaluation": metrics,
              "baseline_version": "v1.0.0",
              "evaluation_note": "Fixed small development benchmark reused for activation; not an independent final test."}
    atomic_json(os.path.join(models, "evaluation_report_" + version + ".json"), report)
    atomic_json(os.path.join(models, "nb_model_" + version + ".json"), model)
    if accepted:
        atomic_json(serving_path, model)
    state = {"servingVersion": version if accepted else old_version,
             "status": report["status"], "latestCandidateVersion": version,
             "rollbackAvailable": True, "lastTrained": datetime.now().isoformat()}
    atomic_json(state_path, state)
    return state


def main():
    root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    with training_lock(root):
        result = run_training(root, rollback="--rollback" in sys.argv)
    print(json.dumps(result))


if __name__ == "__main__":
    main()
