from __future__ import annotations

import argparse
import json
from pathlib import Path

import pandas as pd

from app.training.metrics import classification_metrics


def main() -> int:
    parser = argparse.ArgumentParser(description="Calculate metrics from real model predictions; this script does not train or score missing data.")
    parser.add_argument("predictions", type=Path, help="CSV containing true_class and predicted_class columns")
    parser.add_argument("--probability-columns", action="store_true", help="Use p0..p76 columns to calculate top-3 accuracy")
    arguments = parser.parse_args()
    frame = pd.read_csv(arguments.predictions)
    required = {"true_class", "predicted_class"}
    if not required.issubset(frame.columns):
        parser.error(f"CSV must include columns {sorted(required)}")
    probabilities = None
    if arguments.probability_columns:
        probability_columns = [f"p{index}" for index in range(77)]
        if not set(probability_columns).issubset(frame.columns):
            parser.error("--probability-columns requires p0 through p76")
        probabilities = frame[probability_columns].to_numpy(dtype=float)
    report = classification_metrics(
        frame["true_class"].astype(int).tolist(),
        frame["predicted_class"].astype(int).tolist(),
        probabilities,
    )
    print(json.dumps(report, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
