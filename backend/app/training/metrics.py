from __future__ import annotations

from typing import Any

import numpy as np


def classification_metrics(labels: list[int], predictions: list[int], probabilities: np.ndarray | None = None) -> dict[str, Any]:
    if len(labels) != len(predictions) or not labels:
        raise ValueError("labels and predictions must have the same non-zero length")
    if any(label < 0 or label >= 77 for label in labels + predictions):
        raise ValueError("class indices must be between 0 and 76")
    matrix = np.zeros((77, 77), dtype=np.int64)
    for actual, predicted in zip(labels, predictions, strict=True):
        matrix[actual, predicted] += 1
    true_positive = np.diag(matrix).astype(np.float64)
    precision = np.divide(true_positive, matrix.sum(axis=0), out=np.zeros(77), where=matrix.sum(axis=0) != 0)
    recall = np.divide(true_positive, matrix.sum(axis=1), out=np.zeros(77), where=matrix.sum(axis=1) != 0)
    f1 = np.divide(2 * precision * recall, precision + recall, out=np.zeros(77), where=(precision + recall) != 0)
    result: dict[str, Any] = {
        "sample_count": len(labels),
        "accuracy": float(true_positive.sum() / len(labels)),
        "macro_precision": float(precision.mean()),
        "macro_recall": float(recall.mean()),
        "macro_f1": float(f1.mean()),
        "per_class": [
            {"class_index": index, "precision": float(precision[index]), "recall": float(recall[index]), "f1": float(f1[index]), "support": int(matrix[index].sum())}
            for index in range(77)
        ],
        "confusion_matrix": matrix.tolist(),
    }
    if probabilities is not None:
        scores = np.asarray(probabilities)
        if scores.shape != (len(labels), 77):
            raise ValueError(f"probabilities must have shape ({len(labels)}, 77)")
        top_three = np.argpartition(scores, -3, axis=1)[:, -3:]
        result["top3_accuracy"] = float(np.mean([actual in candidates for actual, candidates in zip(labels, top_three, strict=True)]))
    return result
