# EchoGesture 77-Class Dataset Transfer Checklist

This checklist records the transferred dataset layout and the files required by the read-only validator and future recognition training/export pipeline. The Colab paths are not mounted on Windows; the original ZIPs are preserved in `backend/data/`, and their contents have been extracted into the directories below.

## 1. Transfer destination

The transferred archives are extracted without changing filenames or split membership:

```text
C:\Users\hasin\echo-gesture-web\backend\data\
  manifests_77_v1\
    training_manifest.csv
    train.csv
    validation.csv
    test.csv
    sentence_vocabulary.json
    dataset_config.json

  full_keypoints\
    <feature files referenced by the manifests>
```

The existing validator also accepts absolute feature paths in CSV columns. Relative paths are resolved first from `full_keypoints`, then from `manifests_77_v1`.

## 2. Required manifest files

All six files below are required:

- `training_manifest.csv`
- `train.csv`
- `validation.csv`
- `test.csv`
- `sentence_vocabulary.json`
- `dataset_config.json`

The split CSV counts must be:

| CSV | Required rows |
|---|---:|
| `train.csv` | 239 |
| `validation.csv` | 77 |
| `test.csv` | 77 |

The combined dataset count must be 393. The validator also checks that `training_manifest.csv` exists but does not yet infer architecture or modify lineage from it.

## 3. Recommended manifest columns

For robust transfer, each split CSV should include the following when available:

- A feature-path column: `feature_file` (used by the transferred manifests), `feature_path`, `features_path`, `keypoints_path`, `npy_path`, `path`, or `file_path`
- A label column: `label_id` (used by the transferred manifests), `class_index`, `label_index`, `class_id`, `label`, `sentence_id`, or `sentence`
- A sample-ID column: `sample_id`, `clip_id`, `video_id`, or `id`
- A signer-ID column when available: `signer_id`, `subject_id`, `participant_id`, or `person_id`

The validator recognizes these alternative names by case-insensitive matching. The transferred split column is `split`; validation rows use `val`. Feature-path and label columns are required for a valid result. Sample-ID and signer-ID columns are needed to investigate leakage; they are strongly recommended rather than optional for reliable evaluation.

## 4. Vocabulary format

`sentence_vocabulary.json` must define exactly 77 unique, non-empty labels. The transferred format contains `idx_to_sentence` and inverse `sentence_to_idx` mappings; the verifier checks their consistency. Accepted formats also include:

```json
["Hello, good morning.", "Hello, good evening."]
```

An indexed object:

```json
{
  "0": "Hello, good morning.",
  "1": "Hello, good evening."
}
```

A class-to-sentence object:

```json
{
  "class_to_sentence": {
    "0": "Hello, good morning.",
    "1": "Hello, good evening."
  }
}
```

The runtime recognition service expects a JSON list or 77-key object, and every label must map to the same class index in every manifest and model export.

## 5. Dataset configuration

The transferred `dataset_config.json` declares `sequence_length: 60`, `feature_dim: 258`, `input_shape: ["batch", 60, 258]`, `preprocessing_changes_applied: false`, 492 source records, 393 selected and 99 excluded samples. The original notebook's full-keypoints writer output records 492 successes into `full_keypoints` using numbered `sample_*.npy` files, matching the transferred archive. Per-array shoulder geometry also matches the original Cell 46/57 normalizer. This is strong path/output/feature evidence, although empty `video_path` values prevent per-video hash lineage verification.

The verified stored-feature contract is:

- Channel order: Pose `(33,4)` as `[x,y,z,visibility]`, Left Hand `(21,3)` as `[x,y,z]`, then Right Hand `(21,3)` as `[x,y,z]`.
- For each frame, use pose landmarks 11 and 12 as shoulders; center is their xyz midpoint and scale is their xyz Euclidean distance.
- Subtract the center and divide xyz for pose and present hands by that scale. Pose visibility is left unchanged. If scale is below `1e-5`, the frame becomes 258 zeros.
- A frame with no detected pose is all zeros. Missing hands remain zero-filled.
- Select up to 60 evenly spaced frame indices from first to last; pad shorter clips with trailing zero frames. The full-keypoints writer's extractor uses fresh Pose/Hand Tasks per video and timestamps `frame_number * 1000`.
- The later `extraction_v2` 2D-shoulder normalization and per-sample z-score/clipping into `X_landmarks.npy` are separate outputs, not the current `full_keypoints` tensors.

The config does not encode this contract, so the repository keeps it in `app/training/preprocessing_contract.py` rather than rewriting transferred data. The validator accepts `feature_shape` or `input_shape` and requires `(60, 258)` after removing the optional batch dimension:

```json
{
  "feature_shape": [60, 258]
}
```

It should also preserve, where available:

- Feature naming and channel order.
- Normalization and missing-landmark handling.
- Padding/interpolation behavior.
- FPS and sequence construction method.
- Wrist/hip/body reference logic.
- Face and hand landmark channel lineage.
- Any fixed dtype or value range.
- Video-to-feature generation source and manifest lineage.

## 6. Feature files

The 393 split rows must reference 393 valid `.npy` or single-array `.npz` feature files. Each array must contain exactly:

```text
shape: (60, 258)
dtype: converted to float32 by the validator
values: finite numbers only; NaN and infinity are rejected
```

Do not mix a feature root or manifests from another 77-class export, an older 100-class dataset, or a CTC dataset. The total of 239 training + 77 validation + 77 test files must remain unchanged.

## 7. Integrity checks performed

Before training, the existing validator checks:

- Manifest directory and feature directory exist.
- Required CSV and JSON files exist.
- Split counts match 239/77/77.
- Every split represents 77 labels.
- Every label exists in the 77-label vocabulary.
- Feature paths exist.
- Every feature loads as `.npy` or single-array `.npz`.
- Every feature has shape `(60, 258)`.
- Every feature has finite values.
- Sample IDs do not overlap across splits.
- Signer IDs are inspected for overlap when present.

The validator does not train, modify, overwrite or mix dataset files.

## 8. Manual checks still required

No model should be trained until a reviewer confirms:

- Each sample's feature sequence matches its source video and sentence label.
- Channel order in browser landmarks exactly matches training channels.
- Train, validation and test samples have no shared source video or source sequence.
- Signer identities are not leaked across splits.
- Missing landmarks use the exact training convention.
- Sequence padding, interpolation and normalization match at browser inference time.
- The test set is untouched until final evaluation.

## 9. Environment variables

After transfer, set:

```powershell
$env:ECHOGESTURE_MANIFEST_DIR = 'C:\Users\hasin\echo-gesture-web\backend\data\manifests_77_v1'
$env:ECHOGESTURE_FEATURE_DIR = 'C:\Users\hasin\echo-gesture-web\backend\data\full_keypoints'
```

Run:

```powershell
Set-Location C:\Users\hasin\echo-gesture-web\backend
.\.venv\Scripts\python.exe -m app.training.verify_dataset --manifest-dir $env:ECHOGESTURE_MANIFEST_DIR --feature-dir $env:ECHOGESTURE_FEATURE_DIR
```

A valid report must show `valid: true`, 239/77/77 split counts, 77 classes, and 393 features checked. The training gate will still require independent preprocessing and signer-lineage review before any model training starts.
