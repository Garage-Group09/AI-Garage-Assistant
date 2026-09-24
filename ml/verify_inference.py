"""Compile and execute the SAME Java scorer used in production; compare all probabilities."""
import base64
import json
from pathlib import Path
import subprocess
import shutil
import tempfile
from train import predict

FIXTURES = ["air conditioner blowing warm air", "brakes squeaking when stopping", "radiator steam coolant bubbling",
            "dead battery alternator clicking", "engine misfire oil leak", "tires uneven wear suspension",
            "transmission gears slipping", "yes", "after warm up", "", "தமிழ் சத்தம்", "BRAKES squeaking! 123"]

def main():
    root = Path(__file__).resolve().parents[1]
    model = json.loads((root / "backend/src/main/resources/nb_model.json").read_text())
    scorer = root / "backend/src/main/java/com/garagegroup/garage_backend/service/NbScorer.java"
    runner = root / "ml/tests/ParityRunner.java"
    with tempfile.TemporaryDirectory() as folder:
        folder = Path(folder)
        data = folder / "model.txt"
        words = sorted(model["vocabulary"], key=model["vocabulary"].get)
        lines = [str(len(words)), *words, str(len(model["classes"])),
                 " ".join(map(str,model["class_log_prior"]))]
        lines.extend(" ".join(map(str,row)) for row in model["feature_log_prob"])
        data.write_text("\n".join(lines), encoding="utf-8")
        compiler = ["javac"] if shutil.which("javac") else ["java", "com.sun.tools.javac.Main"]
        subprocess.run(compiler + ["-d", str(folder), str(scorer), str(runner)], check=True)
        args = [base64.b64encode(text.encode()).decode() for text in FIXTURES]
        result = subprocess.run(["java", "-cp", str(folder), "ParityRunner", str(data), *args],
                                check=True, capture_output=True, text=True)
        rows = result.stdout.strip().splitlines()
        assert len(rows) == len(FIXTURES)
        for text, line in zip(FIXTURES, rows):
            _, expected = predict(model, text)
            actual = list(map(float,line.split()))
            assert len(actual) == len(model["classes"])
            for cls, value in zip(model["classes"], actual):
                assert abs(value - expected[cls]) < 1e-12, (text, cls, value, expected[cls])
        print(f"PASS: actual Java/Python scoring parity on {len(FIXTURES)} fixtures (all class probabilities).")
        print("Parity measures implementation agreement, not diagnostic accuracy.")

if __name__ == "__main__":
    main()
