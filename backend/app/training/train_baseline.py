from __future__ import annotations

import argparse
import json
import os
import random
from pathlib import Path

import numpy as np
import pandas as pd

from app.training.dataset import EXPECTED_SHAPE, _labels_from_json, validate_dataset
from app.training.metrics import classification_metrics
from app.training.preprocessing_contract import CONTRACT_ID, audit_cell57_features

BACKEND_DIR = Path(__file__).resolve().parents[2]


def load_split(manifest_path: Path, feature_dir: Path, torch):
    frame = pd.read_csv(manifest_path)
    sequences: list[np.ndarray] = []
    labels: list[int] = []
    for row in frame.itertuples(index=False):
        feature_path = (feature_dir / str(row.feature_file)).resolve()
        if not feature_path.is_file():
            raise FileNotFoundError(f"Missing feature in {manifest_path.name}: {feature_path}")
        sequence = np.asarray(np.load(feature_path, allow_pickle=False), dtype=np.float32)
        if sequence.shape != EXPECTED_SHAPE or not np.isfinite(sequence).all():
            raise ValueError(f"Invalid feature tensor {feature_path}: shape={sequence.shape}, finite={np.isfinite(sequence).all()}")
        sequences.append(sequence)
        labels.append(int(row.label_id))
    dataset = torch.utils.data.TensorDataset(
        torch.from_numpy(np.stack(sequences)),
        torch.tensor(labels, dtype=torch.long),
    )
    return dataset


def evaluate(model, loader, torch):
    model.eval()
    true_labels: list[int] = []
    predicted_labels: list[int] = []
    probability_batches: list[np.ndarray] = []
    with torch.inference_mode():
        for features, labels in loader:
            probabilities = torch.softmax(model(features), dim=1)
            true_labels.extend(labels.tolist())
            predicted_labels.extend(probabilities.argmax(dim=1).tolist())
            probability_batches.append(probabilities.cpu().numpy())
    return classification_metrics(true_labels, predicted_labels, np.concatenate(probability_batches))


def main() -> int:
    parser = argparse.ArgumentParser(description="Compact 77-class temporal CNN baseline; trains on train.csv and selects checkpoints on validation.csv only.")
    parser.add_argument("--manifest-dir", type=Path, default=os.getenv("ECHOGESTURE_MANIFEST_DIR") or None)
    parser.add_argument("--feature-dir", type=Path, default=os.getenv("ECHOGESTURE_FEATURE_DIR") or None)
    parser.add_argument("--output-dir", type=Path, default=BACKEND_DIR / "artifacts" / "baseline_tcn")
    parser.add_argument("--epochs", type=int, default=60)
    parser.add_argument("--patience", type=int, default=10)
    parser.add_argument("--batch-size", type=int, default=32)
    parser.add_argument("--learning-rate", type=float, default=0.001)
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--confirm-preprocessing-review", action="store_true", help="Confirm channel order and preprocessing parity have been reviewed")
    arguments = parser.parse_args()
    if arguments.manifest_dir is None or arguments.feature_dir is None:
        parser.error("provide --manifest-dir and --feature-dir")
    if min(arguments.epochs, arguments.patience, arguments.batch_size) < 1 or arguments.learning_rate <= 0:
        parser.error("epochs, patience and batch size must be positive; learning rate must be greater than zero")

    report = validate_dataset(arguments.manifest_dir, arguments.feature_dir)
    print(json.dumps(report.as_dict(), indent=2))
    if not report.valid:
        print("Training was not started; dataset integrity validation failed.")
        return 2

    config = json.loads((arguments.manifest_dir / "dataset_config.json").read_text(encoding="utf-8"))
    preprocessing_audit = audit_cell57_features(arguments.manifest_dir, arguments.feature_dir)
    print(json.dumps(preprocessing_audit, indent=2))
    config_matches_contract = (
        config.get("sequence_length") == EXPECTED_SHAPE[0]
        and config.get("feature_dim") == EXPECTED_SHAPE[1]
        and config.get("preprocessing_changes_applied") is False
        and config.get("selected_samples") == 393
    )
    dataset_preprocessing_verified = os.getenv("ECHOGESTURE_DATASET_PREPROCESSING_VERIFIED", "false").lower() == "true"
    if not preprocessing_audit["passed"] or not config_matches_contract or not dataset_preprocessing_verified or not arguments.confirm_preprocessing_review:
        print(json.dumps({
            "training_started": False,
            "reason": "cell57_dataset_contract_not_verified",
            "config_matches_contract": config_matches_contract,
            "dataset_preprocessing_verified": dataset_preprocessing_verified,
            "inference_preprocessing_verified": os.getenv("ECHOGESTURE_INFERENCE_PREPROCESSING_VERIFIED", os.getenv("ECHOGESTURE_PREPROCESSING_VERIFIED", "false")).lower() == "true",
            "required": f"Confirm the {CONTRACT_ID} contract, set ECHOGESTURE_DATASET_PREPROCESSING_VERIFIED=true, and pass --confirm-preprocessing-review. Webcam inference has a separate gate.",
            "test_split_used_for_training": False,
        }, indent=2))
        return 3

    try:
        import torch
    except ImportError as error:
        print(f"Training was not started: PyTorch is unavailable ({error}).")
        return 4

    from app.training.model import build_model

    random.seed(arguments.seed)
    np.random.seed(arguments.seed)
    torch.manual_seed(arguments.seed)
    train_dataset = load_split(arguments.manifest_dir / "train.csv", arguments.feature_dir, torch)
    validation_dataset = load_split(arguments.manifest_dir / "validation.csv", arguments.feature_dir, torch)
    train_loader = torch.utils.data.DataLoader(train_dataset, batch_size=arguments.batch_size, shuffle=True)
    validation_loader = torch.utils.data.DataLoader(validation_dataset, batch_size=arguments.batch_size, shuffle=False)
    model = build_model()
    optimizer = torch.optim.AdamW(model.parameters(), lr=arguments.learning_rate, weight_decay=1e-3)
    loss_function = torch.nn.CrossEntropyLoss()
    best_score = -1.0
    best_epoch = 0
    stale_epochs = 0
    best_metrics: dict[str, object] = {}
    arguments.output_dir.mkdir(parents=True, exist_ok=True)

    for epoch in range(1, arguments.epochs + 1):
        model.train()
        for features, labels in train_loader:
            optimizer.zero_grad(set_to_none=True)
            loss = loss_function(model(features), labels)
            loss.backward()
            torch.nn.utils.clip_grad_norm_(model.parameters(), max_norm=1.0)
            optimizer.step()
        validation_metrics = evaluate(model, validation_loader, torch)
        score = float(validation_metrics["macro_f1"])
        print(f"epoch={epoch} validation_macro_f1={score:.4f} validation_accuracy={validation_metrics['accuracy']:.4f}")
        if score > best_score:
            best_score = score
            best_epoch = epoch
            stale_epochs = 0
            best_metrics = validation_metrics
            torch.save(model.state_dict(), arguments.output_dir / "best_checkpoint.pt")
        else:
            stale_epochs += 1
            if stale_epochs >= arguments.patience:
                break

    model.load_state_dict(torch.load(arguments.output_dir / "best_checkpoint.pt", map_location="cpu", weights_only=True))
    model.eval()
    torch.jit.trace(model, torch.zeros((1, *EXPECTED_SHAPE), dtype=torch.float32)).save(str(arguments.output_dir / "baseline_tcn.ts"))
    labels = _labels_from_json(json.loads((arguments.manifest_dir / "sentence_vocabulary.json").read_text(encoding="utf-8")))
    (arguments.output_dir / "sentence_vocabulary.json").write_text(json.dumps(labels, ensure_ascii=False, indent=2), encoding="utf-8")
    summary = {
        "architecture": "compact temporal CNN with global average/max pooling",
        "input_shape": list(EXPECTED_SHAPE),
        "train_samples": len(train_dataset),
        "validation_samples": len(validation_dataset),
        "test_split_used_for_training": False,
        "best_epoch": best_epoch,
        "best_validation_metrics": best_metrics,
        "preprocessing": "stored feature tensors consumed unchanged; no inferred normalization or channel reordering",
    }
    (arguments.output_dir / "training_report.json").write_text(json.dumps(summary, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(summary, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
