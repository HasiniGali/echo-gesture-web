# EchoGesture

EchoGesture is an accessibility-focused communication prototype for Indian Sign Language, speech and text.

> Every gesture has a voice. Every voice deserves to be heard.

## Architecture

- `src/`: React, TypeScript, Vite, eight routed screens, browser speech/camera controls and a typed API client.
- `backend/app/`: FastAPI routers, Pydantic request validation, model/provider services and SQLite persistence.
- `backend/app/training/`: read-only 77-class dataset validation, metric calculation and guarded training/export entry points.
- Vite proxies `/api` to `http://127.0.0.1:8001` during development. The backend can also run independently.

## Windows Setup

From PowerShell at the project root:

```powershell
npm install
py -m venv backend\.venv
backend\.venv\Scripts\python.exe -m pip install -r backend\requirements.txt
Copy-Item backend\.env.example backend\.env
```

Start the backend in a PowerShell window:

```powershell
Set-Location C:\Users\hasin\echo-gesture-web\backend
.\.venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8001
```

Start the frontend in another PowerShell window:

```powershell
Set-Location C:\Users\hasin\echo-gesture-web
npm run dev
```

Open the Vite URL (normally `http://localhost:5173`). FastAPI Swagger documentation is at `http://127.0.0.1:8001/docs`.

Checks:

```powershell
npm run lint
npm run build
Set-Location backend
.\.venv\Scripts\python.exe -m pytest -q
```

## Configuration

Copy `backend\.env.example` to `backend\.env`; real credentials belong only in the ignored `.env` file. Supported variables:

- `ECHOGESTURE_DATABASE_PATH`: SQLite file path; defaults to `backend/data/echogesture.sqlite3`.
- `ECHOGESTURE_CORS_ORIGINS`: comma-separated allowed frontend origins.
- `GOOGLE_TRANSLATE_API_KEY`: optional Google Cloud Translation credential. Requests remain server-side.
- `ECHOGESTURE_MODEL_PATH`: optional TorchScript model path.
- `ECHOGESTURE_VOCABULARY_PATH`: optional 77-label JSON mapping.
- `ECHOGESTURE_PREPROCESSING_VERIFIED`: must remain `false` until browser and training preprocessing are verified to match.
- `ECHOGESTURE_REJECTION_THRESHOLD`: model confidence rejection threshold, default `0.60`.
- `ECHOGESTURE_MANIFEST_DIR` and `ECHOGESTURE_FEATURE_DIR`: local paths for dataset validation.
- `VITE_API_BASE_URL`: optional public API base URL for deployments; development defaults to the Vite `/api` proxy.

The API is a local prototype without user authentication. Do not expose it publicly or put credentials in frontend environment variables.

## API

- `GET /api/health`: API, SQLite, model and translation availability.
- `GET /api/recognition/status`: actual model readiness and blocker reason.
- `POST /api/recognition/predict`: validates exactly 60 frames × 258 finite values; returns 503 until model, vocabulary and preprocessing gates pass.
- `POST /api/translation`: server-side Google translation when configured; returns 503 otherwise.
- `GET|PUT /api/settings`: settings persistence.
- `GET|POST /api/history/recognition`: recognition history.
- `GET|POST /api/history/translations`: successful translation history.
- `GET|POST /api/history/favorites` and `/api/history/favorites/remove`: emergency phrase favorites.
- `GET|POST /api/history/emergency-phrases`: emergency phrase recency.
- `GET|POST /api/history/translation-favorites` and `/remove`: saved translations.
- `GET /api/learning/lessons`: explicitly reports that verified lesson content is unavailable.
- `GET|PUT /api/learning/progress`: lesson progress storage.

## Dataset Validation

The supplied `/content/drive/MyDrive/...` locations are Colab paths. Their ZIP archives have been transferred and extracted locally without changing the source archives or split membership:

```text
backend/data/manifests_77_v1/
backend/data/full_keypoints/
```

The manifest directory must include `training_manifest.csv`, `train.csv`, `validation.csv`, `test.csv`, `sentence_vocabulary.json` and `dataset_config.json`. Then run from the backend directory:

```powershell
$env:ECHOGESTURE_MANIFEST_DIR = 'C:\Users\hasin\echo-gesture-web\backend\data\manifests_77_v1'
$env:ECHOGESTURE_FEATURE_DIR = 'C:\Users\hasin\echo-gesture-web\backend\data\full_keypoints'
.\.venv\Scripts\python.exe -m app.training.verify_dataset --manifest-dir $env:ECHOGESTURE_MANIFEST_DIR --feature-dir $env:ECHOGESTURE_FEATURE_DIR
```

The read-only validator passes: 239/77/77 rows, 77 mapped classes, 393 referenced feature files with shape `(60, 258)`, finite values, no sample-ID overlap, and matching `training_manifest.csv`. The notebook's full-keypoints writer output reports 492/492 successful arrays into `full_keypoints` with the same numbered filenames and 492 source records recorded by this dataset config. Feature geometry independently matches the original 3D shoulder-centered, shoulder-distance-scaled transform and not the later 2D-width/per-sample-normalized arrays. The transferred split has empty video paths and no signer IDs, so video-by-video provenance and signer leakage remain unverified.

The stored Cell 57 contract is documented in `backend/app/training/preprocessing_contract.py`: Pose `[x,y,z,visibility]` (33×4), Left Hand `[x,y,z]` (21×3), Right Hand `[x,y,z]` (21×3); per frame subtract the midpoint of shoulder pose landmarks 11 and 12 in xyz, divide xyz coordinates by their 3D Euclidean distance, preserve pose visibility, retain zero missing-hand landmarks, return an all-zero frame if no pose or shoulder scale is below `1e-5`, and pad short clips at the end. The writer samples up to 60 evenly spaced source-frame indices. It runs fresh Pose/Hand Tasks per video with monotonically increasing `frame_number * 1000` timestamps. The later extraction_v2 keypoints and Cell 298 `X_landmarks`/clean_v1 per-sample z-score path are separate artifacts and are not applied to these 393 tensors.

A compact temporal CNN baseline is prepared. It consumes stored tensors unchanged, trains only on `train.csv`, selects/early-stops on `validation.csv`, and never loads `test.csv` for training. The audit has verified the stored-data preprocessing contract; the separate inference flag must stay false until webcam landmarks reproduce it. Run the baseline only with the explicit dataset-review confirmation:

```powershell
$env:ECHOGESTURE_DATASET_PREPROCESSING_VERIFIED = 'true'
.\.venv\Scripts\python.exe -m app.training.train --manifest-dir $env:ECHOGESTURE_MANIFEST_DIR --feature-dir $env:ECHOGESTURE_FEATURE_DIR --confirm-preprocessing-review
```

Do not set `ECHOGESTURE_PREPROCESSING_VERIFIED=true` until the browser pipeline has been implemented and parity-tested. The test split is reserved for one final evaluation after validation-based checkpoint selection. No training has been run and no accuracy is claimed.

## Model and Translation Readiness

Recognition is not operational. There is no trained model, browser landmark extractor, or confirmed browser/training preprocessing parity. `backend/requirements-ml.txt` contains optional PyTorch/scikit-learn/ONNX tooling; PyTorch installation must use a supported Python/platform wheel. The API only loads a configured 77-output TorchScript model after the preprocessing gate is explicitly verified. Low-confidence outputs are rejected.

Translation requires `GOOGLE_TRANSLATE_API_KEY`; it is never fabricated. Camera preview remains local-only. Browser speech recognition, microphone/camera access and speech voices depend on browser support and permissions. Learning entries are demonstrations only; no unverified signs are served as authentic content.
