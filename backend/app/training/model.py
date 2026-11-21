from __future__ import annotations

import torch
import torch.nn as nn

class TemporalConvBaseline(nn.Module):
    def __init__(self) -> None:
        super().__init__()
        self.encoder = nn.Sequential(
            nn.Conv1d(258, 64, kernel_size=5, padding=2, bias=False),
            nn.BatchNorm1d(64),
            nn.GELU(),
            nn.Dropout(0.15),
            nn.Conv1d(64, 64, kernel_size=3, padding=1, bias=False),
            nn.BatchNorm1d(64),
            nn.GELU(),
        )
        self.classifier = nn.Sequential(
            nn.Linear(128, 64),
            nn.GELU(),
            nn.Dropout(0.2),
            nn.Linear(64, 77),
        )

    def forward(self, sequence):
        encoded = self.encoder(sequence.transpose(1, 2))
        pooled = nn.functional.adaptive_avg_pool1d(encoded, 1).squeeze(-1)
        peak = nn.functional.adaptive_max_pool1d(encoded, 1).squeeze(-1)
        return self.classifier(nn.functional.dropout(torch.cat((pooled, peak), dim=1), p=0.1, training=self.training))


def build_model() -> TemporalConvBaseline:
    return TemporalConvBaseline()
