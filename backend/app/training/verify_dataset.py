from __future__ import annotations

import argparse
import json
import os
from pathlib import Path

from app.training.dataset import validate_dataset


def main() -> int:
    parser = argparse.ArgumentParser(description="Validate the EchoGesture 77-class manifests and feature files without modifying them.")
    parser.add_argument("--manifest-dir", type=Path, default=os.getenv("ECHOGESTURE_MANIFEST_DIR") or None)
    parser.add_argument("--feature-dir", type=Path, default=os.getenv("ECHOGESTURE_FEATURE_DIR") or None)
    arguments = parser.parse_args()
    if arguments.manifest_dir is None or arguments.feature_dir is None:
        parser.error("provide --manifest-dir and --feature-dir (the Colab Drive paths are not mounted automatically on Windows)")
    report = validate_dataset(arguments.manifest_dir, arguments.feature_dir)
    print(json.dumps(report.as_dict(), indent=2))
    return 0 if report.valid else 2


if __name__ == "__main__":
    raise SystemExit(main())
