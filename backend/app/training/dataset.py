from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import numpy as np
import pandas as pd

EXPECTED_SPLITS = {"train": 239, "validation": 77, "test": 77}
EXPECTED_CLASSES = 77
EXPECTED_SHAPE = (60, 258)
MANIFEST_FILES = {
    "train": "train.csv",
    "validation": "validation.csv",
    "test": "test.csv",
}
FEATURE_COLUMNS = ("feature_file", "feature_path", "features_path", "keypoints_path", "npy_path", "path", "file_path")
LABEL_COLUMNS = ("label_id", "class_index", "label_index", "class_id", "label", "sentence_id", "sentence")
SAMPLE_COLUMNS = ("sample_id", "clip_id", "video_id", "id")
SIGNER_COLUMNS = ("signer_id", "subject_id", "participant_id", "person_id")
SENTENCE_COLUMNS = ("sentence", "sentence_text", "transcription", "text")


@dataclass
class DatasetReport:
    valid: bool
    errors: list[str]
    warnings: list[str]
    split_counts: dict[str, int]
    classes: int | None
    features_checked: int
    shape: tuple[int, int] | None
    signer_overlap: list[str]

    def as_dict(self) -> dict[str, Any]:
        return {
            "valid": self.valid,
            "errors": self.errors,
            "warnings": self.warnings,
            "split_counts": self.split_counts,
            "classes": self.classes,
            "features_checked": self.features_checked,
            "feature_shape": list(self.shape) if self.shape else None,
            "signer_overlap": self.signer_overlap,
        }


def _find_column(frame: pd.DataFrame, options: tuple[str, ...]) -> str | None:
    normalized = {str(column).strip().lower(): str(column) for column in frame.columns}
    return next((normalized[name] for name in options if name in normalized), None)


def _labels_from_json(payload: Any) -> list[str]:
    if isinstance(payload, dict):
        nested = payload.get("idx_to_sentence", payload.get("class_to_sentence"))
        if isinstance(nested, dict):
            indexed = {int(key): str(value) for key, value in nested.items() if str(key).isdigit()}
            if set(indexed) != set(range(EXPECTED_CLASSES)):
                raise ValueError("idx_to_sentence must define indices 0 through 76")
            payload = [indexed[index] for index in range(EXPECTED_CLASSES)]
        elif isinstance(payload.get("sentence_to_idx"), dict):
            reverse = {str(sentence): int(index) for sentence, index in payload["sentence_to_idx"].items()}
            if set(reverse.values()) != set(range(EXPECTED_CLASSES)):
                raise ValueError("sentence_to_idx must map 77 sentences to indices 0 through 76")
            payload = [next(sentence for sentence, index in reverse.items() if index == class_index) for class_index in range(EXPECTED_CLASSES)]
        else:
            payload = payload.get("class_to_sentence", payload.get("sentence_vocabulary", payload.get("classes", payload)))
    if isinstance(payload, list):
        if payload and isinstance(payload[0], dict):
            ordered = sorted(payload, key=lambda item: int(item.get("class_index", item.get("classIndex", item.get("index", -1)))))
            labels = [str(item.get("sentence", item.get("label", item.get("name", "")))) for item in ordered]
        else:
            labels = [str(item) for item in payload]
    elif isinstance(payload, dict):
        indexed = {int(key): str(value) for key, value in payload.items() if str(key).isdigit()}
        labels = [indexed[index] for index in range(len(indexed))] if indexed else []
    else:
        labels = []
    if len(labels) != EXPECTED_CLASSES or len(set(labels)) != EXPECTED_CLASSES or any(not item.strip() for item in labels):
        raise ValueError("sentence vocabulary must define exactly 77 unique, non-empty labels")
    return labels


def _validate_vocabulary_mappings(payload: Any, labels: list[str]) -> list[str]:
    errors: list[str] = []
    if not isinstance(payload, dict):
        return errors
    expected = {index: label for index, label in enumerate(labels)}
    idx_to_sentence = payload.get("idx_to_sentence")
    if isinstance(idx_to_sentence, dict):
        try:
            actual = {int(index): str(sentence) for index, sentence in idx_to_sentence.items()}
        except (TypeError, ValueError):
            errors.append("idx_to_sentence contains a non-integer class index")
        else:
            if actual != expected:
                errors.append("idx_to_sentence does not match the ordered sentence vocabulary")
    sentence_to_idx = payload.get("sentence_to_idx")
    if isinstance(sentence_to_idx, dict):
        try:
            actual_reverse = {str(sentence): int(index) for sentence, index in sentence_to_idx.items()}
        except (TypeError, ValueError):
            errors.append("sentence_to_idx contains a non-integer class index")
        else:
            expected_reverse = {sentence: index for index, sentence in expected.items()}
            if actual_reverse != expected_reverse:
                errors.append("sentence_to_idx is not the inverse of idx_to_sentence")
    return errors


def _resolve_feature(value: Any, feature_root: Path, manifest_root: Path) -> Path:
    raw = Path(str(value)).expanduser()
    if raw.is_absolute():
        return raw.resolve()
    candidates = ((feature_root / raw).resolve(), (manifest_root / raw).resolve())
    return next((candidate for candidate in candidates if candidate.is_file()), candidates[0])


def _load_feature(path: Path) -> np.ndarray:
    if path.suffix.lower() == ".npy":
        array = np.load(path, allow_pickle=False)
    elif path.suffix.lower() == ".npz":
        with np.load(path, allow_pickle=False) as archive:
            if len(archive.files) != 1:
                raise ValueError("NPZ feature files must contain exactly one array")
            array = archive[archive.files[0]]
    else:
        raise ValueError(f"unsupported feature extension '{path.suffix}' (expected .npy or single-array .npz)")
    array = np.asarray(array, dtype=np.float32)
    if array.shape != EXPECTED_SHAPE:
        raise ValueError(f"expected feature shape {EXPECTED_SHAPE}, found {array.shape}")
    if not np.isfinite(array).all():
        raise ValueError("feature array contains NaN or Inf values")
    return array


def validate_dataset(manifest_dir: Path, feature_dir: Path) -> DatasetReport:
    errors: list[str] = []
    warnings: list[str] = []
    split_counts: dict[str, int] = {}
    features_checked = 0
    label_set: set[str] = set()
    loaded_manifests: dict[str, pd.DataFrame] = {}
    split_ids: dict[str, set[str]] = {}
    signer_sets: dict[str, set[str]] = {}
    found_shape: tuple[int, int] | None = None

    if not manifest_dir.is_dir():
        return DatasetReport(False, [f"Manifest directory does not exist: {manifest_dir}"], [], {}, None, 0, None, [])
    if not feature_dir.is_dir():
        return DatasetReport(False, [f"Feature directory does not exist: {feature_dir}"], [], {}, None, 0, None, [])

    required = [*MANIFEST_FILES.values(), "training_manifest.csv", "sentence_vocabulary.json", "dataset_config.json"]
    for filename in required:
        if not (manifest_dir / filename).is_file():
            errors.append(f"Required dataset file is missing: {manifest_dir / filename}")
    if errors:
        return DatasetReport(False, errors, warnings, split_counts, None, features_checked, found_shape, [])

    try:
        vocabulary = json.loads((manifest_dir / "sentence_vocabulary.json").read_text(encoding="utf-8"))
        labels = _labels_from_json(vocabulary)
        label_set = set(labels)
        errors.extend(_validate_vocabulary_mappings(vocabulary, labels))
    except (OSError, json.JSONDecodeError, ValueError, TypeError) as error:
        errors.append(f"Invalid sentence_vocabulary.json: {error}")
        labels = []

    try:
        config = json.loads((manifest_dir / "dataset_config.json").read_text(encoding="utf-8"))
        declared_shape = config.get("feature_shape", config.get("input_shape")) if isinstance(config, dict) else None
        if isinstance(declared_shape, list) and declared_shape and declared_shape[0] == "batch":
            declared_shape = declared_shape[1:]
        if declared_shape is not None and tuple(declared_shape) != EXPECTED_SHAPE:
            errors.append(f"dataset_config.json declares shape {declared_shape}, expected {EXPECTED_SHAPE}")
        elif declared_shape is None:
            warnings.append("dataset_config.json does not declare feature_shape/input_shape; preprocessing contract needs manual review")
        declared_selected = config.get("selected_samples") if isinstance(config, dict) else None
        if declared_selected is not None and declared_selected != sum(EXPECTED_SPLITS.values()):
            errors.append(f"dataset_config.json declares {declared_selected} selected samples; expected {sum(EXPECTED_SPLITS.values())}")
        declared_counts = config.get("split_counts") if isinstance(config, dict) else None
        if isinstance(declared_counts, dict):
            normalized_counts = {"train": declared_counts.get("train"), "validation": declared_counts.get("validation", declared_counts.get("val")), "test": declared_counts.get("test")}
            if normalized_counts != EXPECTED_SPLITS:
                errors.append(f"dataset_config.json split_counts do not match {EXPECTED_SPLITS}: {normalized_counts}")
        total_source_records = config.get("total_source_records") if isinstance(config, dict) else None
        selected_samples = config.get("selected_samples") if isinstance(config, dict) else None
        excluded_samples = config.get("excluded_samples") if isinstance(config, dict) else None
        feature_file_count = sum(1 for path in feature_dir.rglob("*") if path.is_file() and path.suffix.lower() in {".npy", ".npz"})
        if total_source_records is not None and feature_file_count != total_source_records:
            errors.append(f"Feature directory contains {feature_file_count} arrays; dataset_config.json declares {total_source_records} source records")
        if total_source_records is not None and selected_samples is not None and excluded_samples is not None:
            if total_source_records - selected_samples != excluded_samples:
                errors.append("dataset_config.json selected/excluded counts do not reconcile with total_source_records")
        preprocessing_keys = {"normalization", "normalization_method", "channel_order", "feature_layout", "preprocessing", "preprocessing_pipeline"}
        if isinstance(config, dict) and not preprocessing_keys.intersection(config):
            warnings.append("dataset_config.json does not specify normalization or channel order; webcam preprocessing parity is unverified")
    except (OSError, json.JSONDecodeError, TypeError) as error:
        errors.append(f"Invalid dataset_config.json: {error}")

    for split, filename in MANIFEST_FILES.items():
        manifest_path = manifest_dir / filename
        try:
            frame = pd.read_csv(manifest_path)
        except Exception as error:
            errors.append(f"Could not read {filename}: {error}")
            continue
        loaded_manifests[split] = frame
        split_counts[split] = len(frame)
        expected_count = EXPECTED_SPLITS[split]
        if len(frame) != expected_count:
            errors.append(f"{filename} contains {len(frame)} rows; expected {expected_count}")
        label_column = _find_column(frame, LABEL_COLUMNS)
        feature_column = _find_column(frame, FEATURE_COLUMNS)
        sample_column = _find_column(frame, SAMPLE_COLUMNS)
        signer_column = _find_column(frame, SIGNER_COLUMNS)
        sentence_column = _find_column(frame, SENTENCE_COLUMNS)
        split_column = _find_column(frame, ("split",))
        if label_column is None:
            errors.append(f"{filename} has no recognized label column; columns are {list(frame.columns)}")
        if feature_column is None:
            errors.append(f"{filename} has no recognized feature path column; columns are {list(frame.columns)}")
        if sample_column:
            split_ids[split] = set(frame[sample_column].dropna().astype(str))
            duplicate_ids = int(frame[sample_column].duplicated().sum())
            if duplicate_ids:
                errors.append(f"{filename} contains {duplicate_ids} duplicate sample IDs")
        if signer_column:
            signer_sets[split] = set(frame[signer_column].dropna().astype(str))
        if split_column:
            expected_split_values = {"validation", "val"} if split == "validation" else {split}
            observed_split_values = set(frame[split_column].dropna().astype(str).str.strip().str.lower())
            if not observed_split_values or not observed_split_values.issubset(expected_split_values):
                errors.append(f"{filename} has inconsistent split values: {sorted(observed_split_values)}")
        if label_column:
            observed = set(frame[label_column].dropna().astype(str))
            if len(observed) != EXPECTED_CLASSES:
                errors.append(f"{filename} represents {len(observed)} labels; expected all 77 classes")
            allowed = label_set | {str(index) for index in range(EXPECTED_CLASSES)}
            unknown = observed - allowed
            if unknown:
                errors.append(f"{filename} contains labels absent from the vocabulary: {sorted(unknown)[:8]}")
            if sentence_column and label_column != sentence_column and label_set:
                label_to_index = {label: index for index, label in enumerate(labels)}
                mismatches = 0
                for label_value, sentence_value in zip(frame[label_column], frame[sentence_column], strict=True):
                    if pd.isna(label_value) or pd.isna(sentence_value):
                        mismatches += 1
                        continue
                    try:
                        class_index = int(label_value)
                    except (TypeError, ValueError):
                        class_index = label_to_index.get(str(label_value), -1)
                    if not 0 <= class_index < EXPECTED_CLASSES or labels[class_index] != str(sentence_value):
                        mismatches += 1
                if mismatches:
                    errors.append(f"{filename} has {mismatches} sentence-to-label mapping mismatches")
        if feature_column:
            duplicate_features = int(frame[feature_column].duplicated().sum())
            if duplicate_features:
                errors.append(f"{filename} contains {duplicate_features} duplicate feature references")
            for row_number, value in enumerate(frame[feature_column], start=2):
                path = _resolve_feature(value, feature_dir, manifest_dir)
                if not path.is_file():
                    errors.append(f"{filename}:{row_number} feature file is missing: {path}")
                    continue
                try:
                    feature = _load_feature(path)
                except (OSError, ValueError) as error:
                    errors.append(f"{filename}:{row_number} invalid feature {path}: {error}")
                    continue
                features_checked += 1
                found_shape = feature.shape

    training_manifest_path = manifest_dir / "training_manifest.csv"
    if training_manifest_path.is_file():
        try:
            training_manifest = pd.read_csv(training_manifest_path)
            if len(training_manifest) != sum(EXPECTED_SPLITS.values()):
                errors.append(f"training_manifest.csv contains {len(training_manifest)} rows; expected {sum(EXPECTED_SPLITS.values())}")
            if len(loaded_manifests) == len(MANIFEST_FILES):
                combined_manifest = pd.concat(loaded_manifests.values(), ignore_index=True)
                master_id = _find_column(training_manifest, SAMPLE_COLUMNS)
                split_id = _find_column(combined_manifest, SAMPLE_COLUMNS)
                if master_id and split_id:
                    if training_manifest[master_id].duplicated().any():
                        errors.append("training_manifest.csv contains duplicate sample IDs")
                    if set(training_manifest[master_id].dropna().astype(str)) != set(combined_manifest[split_id].dropna().astype(str)):
                        errors.append("training_manifest.csv sample IDs do not match the three split manifests")
                    comparable_columns = [column for column in training_manifest.columns if column in combined_manifest.columns]
                    master_values = training_manifest[comparable_columns].sort_values(master_id, kind="stable").reset_index(drop=True)
                    split_values = combined_manifest[comparable_columns].sort_values(split_id, kind="stable").reset_index(drop=True)
                    if not master_values.equals(split_values):
                        errors.append("training_manifest.csv rows do not match the combined train/validation/test manifests")
                else:
                    warnings.append("training_manifest.csv cannot be compared to split manifests because sample IDs are missing")
            video_column = _find_column(training_manifest, ("video_path", "source_video", "video_file"))
            if video_column is None or training_manifest[video_column].isna().all():
                warnings.append("Source video paths are absent; feature-to-video lineage cannot be verified")
            signer_column = _find_column(training_manifest, SIGNER_COLUMNS)
            if signer_column is None:
                warnings.append("Signer identifiers are absent; signer leakage cannot be ruled out from these manifests")
        except Exception as error:
            errors.append(f"Could not validate training_manifest.csv: {error}")

    overlaps: list[str] = []
    split_names = list(MANIFEST_FILES)
    for first_index, first in enumerate(split_names):
        for second in split_names[first_index + 1:]:
            shared = split_ids.get(first, set()) & split_ids.get(second, set())
            if shared:
                errors.append(f"Sample IDs overlap between {first} and {second}: {len(shared)}")
            if first in signer_sets and second in signer_sets:
                common_signers = signer_sets[first] & signer_sets[second]
                if common_signers:
                    overlaps.extend(sorted(common_signers))
    if overlaps:
        warnings.append("Signer identities occur across splits; investigate signer leakage before training/evaluation")

    valid = not errors and split_counts == EXPECTED_SPLITS and features_checked == sum(EXPECTED_SPLITS.values())
    if valid:
        warnings.append("Review preprocessing lineage and signer separation manually before training")
    return DatasetReport(valid, errors, warnings, split_counts, len(label_set) or None, features_checked, found_shape, sorted(set(overlaps)))
