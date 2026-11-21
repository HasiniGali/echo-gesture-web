from __future__ import annotations

import argparse
from pathlib import Path


def main() -> int:
    parser = argparse.ArgumentParser(description="Export a trained TorchScript 77-class sequence classifier to ONNX.")
    parser.add_argument("model", type=Path, help="TorchScript model produced by the reviewed training pipeline")
    parser.add_argument("output", type=Path, help="Output .onnx path")
    arguments = parser.parse_args()
    if not arguments.model.is_file():
        parser.error(f"model file does not exist: {arguments.model}")
    try:
        import torch
    except ImportError as error:
        parser.error(f"PyTorch is required for ONNX export: {error}")
    model = torch.jit.load(str(arguments.model), map_location="cpu").eval()
    sample = torch.zeros((1, 60, 258), dtype=torch.float32)
    with torch.inference_mode():
        output = model(sample)
    if isinstance(output, (tuple, list)):
        output = output[0]
    if output.ndim != 2 or tuple(output.shape) != (1, 77):
        parser.error(f"model output must be (1, 77), got {tuple(output.shape)}")
    arguments.output.parent.mkdir(parents=True, exist_ok=True)
    torch.onnx.export(
        model,
        sample,
        str(arguments.output),
        input_names=["features"],
        output_names=["logits"],
        dynamic_axes={"features": {0: "batch"}, "logits": {0: "batch"}},
        opset_version=17,
    )
    print(f"Exported {arguments.output}; run a parity check against the trained PyTorch model before deployment.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
