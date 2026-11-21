from __future__ import annotations

import json

from app.services.recognition_service import RecognitionService
from app.training.dataset import _labels_from_json, _validate_vocabulary_mappings


def test_nested_transferred_vocabulary_mappings_are_consistent():
    labels = [f"sentence {index}" for index in range(77)]
    vocabulary = {
        "num_classes": 77,
        "idx_to_sentence": {str(index): sentence for index, sentence in enumerate(labels)},
        "sentence_to_idx": {sentence: index for index, sentence in enumerate(labels)},
    }

    parsed = _labels_from_json(vocabulary)

    assert parsed == labels
    assert _validate_vocabulary_mappings(vocabulary, parsed) == []


def test_vocabulary_mapping_mismatch_is_reported():
    labels = [f"sentence {index}" for index in range(77)]
    vocabulary = {
        "idx_to_sentence": {str(index): sentence for index, sentence in enumerate(labels)},
        "sentence_to_idx": {sentence: index for index, sentence in enumerate(labels)},
    }
    vocabulary["sentence_to_idx"][labels[0]] = 1

    assert "sentence_to_idx is not the inverse of idx_to_sentence" in _validate_vocabulary_mappings(vocabulary, labels)


def test_runtime_recognition_loader_accepts_transferred_idx_mapping(tmp_path):
    labels = [f"sentence {index}" for index in range(77)]
    vocabulary_path = tmp_path / "sentence_vocabulary.json"
    vocabulary_path.write_text(json.dumps({"idx_to_sentence": {str(index): sentence for index, sentence in enumerate(labels)}}), encoding="utf-8")

    assert RecognitionService()._read_labels(vocabulary_path) == labels
