# EchoGesture 🤟
### Sign Language Prediction on Edge Devices

EchoGesture is a camera-based sign language recognition prototype designed to make communication more accessible. It uses computer vision to extract body and hand landmarks, processes gesture sequences through a machine learning model, and displays recognition results in a web interface.

**Hackathon Track:** Track 02 — Sign Language Prediction on Edge Devices

🌐 **Live Demo:** https://echo-gesture-web.vercel.app  
💻 **GitHub Repository:** https://github.com/HasiniGali/echo-gesture-web

---

## 📌 Project Overview

Communication can be challenging when people do not share a common language or understand sign language.

EchoGesture explores how computer vision and machine learning can help bridge this communication gap through real-time gesture recognition.

The current project is a working web-based prototype that captures gestures using a camera, extracts landmarks, sends processed sequences to a recognition backend, and displays the model's prediction.

Our goal is to develop a more accurate, efficient, and accessible sign recognition system that can eventually support edge-device deployment.

---

## ✨ Current Features

The following features are implemented in the current prototype:

- Live camera access through the browser
- Body and hand landmark detection using MediaPipe
- Gesture sequence collection using 60 frames
- Landmark preprocessing and feature generation
- Backend integration for model prediction
- Recognition across 77 gesture classes
- Confidence-based prediction handling
- Rejection of predictions that do not meet the confidence threshold
- Recognition status and error feedback
- Confidence and API latency display
- Deployed frontend and backend services

---

## 🏗️ System Architecture

EchoGesture follows a frontend–backend machine learning architecture.

```text
          User Performs a Sign
                   |
                   v
          Browser Camera
                   |
                   v
       MediaPipe Landmark Detection
          |                 |
          v                 v
       Pose Points      Hand Points
          |                 |
          +--------+--------+
                   |
                   v
       Landmark Preprocessing
                   |
                   v
        60-Frame Sequence
                   |
                   v
          Feature Generation
          60 x 258 Features
                   |
                   v
          Recognition API
                   |
                   v
        Machine Learning Model
                   |
                   v
      Prediction + Confidence
                   |
                   v
       Confidence Validation
                   |
                   v
        Recognition Interface
```

### Technology Stack

| Component | Technology |
|---|---|
| Frontend | React |
| Language | TypeScript |
| Build Tool | Vite |
| Computer Vision | MediaPipe |
| Backend | Python |
| API Framework | FastAPI |
| Machine Learning | PyTorch |
| Model Format | ONNX |
| Frontend Deployment | Vercel |
| Backend Deployment | Render |

---

## 🧠 Machine Learning Pipeline

The recognition pipeline processes a sequence of landmarks rather than directly classifying raw camera frames.

### 1. Landmark Extraction

MediaPipe is used to detect:

- Body pose landmarks
- Left-hand landmarks
- Right-hand landmarks

### 2. Sequence Collection

The application collects a sequence of **60 frames** for gesture recognition.

### 3. Preprocessing

The detected landmarks are converted into the model-compatible feature representation.

### 4. Model Input

The model receives a sequence with the following shape:

```text
60 frames x 258 features
```

### 5. Prediction

The backend processes the sequence and returns a prediction with confidence information.

### 6. Confidence Handling

Predictions below the configured confidence threshold are rejected rather than automatically displayed as reliable signs.

This helps prevent uncertain predictions from being treated as confirmed recognition results.

---

## 📊 Model Evaluation

The current model has been evaluated using the following metrics:

| Metric | Result |
|---|---:|
| Top-1 Accuracy | 23.38% |
| Top-3 Accuracy | 37.66% |
| Macro F1 Score | 16.96% |
| Number of Gesture Classes | 77 |
| Model Input | 60 × 258 |

### Interpretation

The current results show that the model can perform gesture classification, but recognition accuracy remains a major limitation.

Further improvements are required in:

- Model training
- Gesture representation
- Generalization across users
- Robustness under different lighting and camera conditions
- Prediction quality

These results are reported transparently and are not presented as production-level recognition accuracy.

---

## ⚡ Performance Benchmark

A model-only CPU inference benchmark was conducted.

| Measurement | Result |
|---|---:|
| Mean Inference Time | 1.529 ms |
| Median Inference Time | 0.217 ms |
| 95th Percentile | 0.702 ms |

**Benchmark scope:** These measurements represent model-only CPU inference.

They do not represent complete camera-to-prediction latency, browser-to-backend latency, or performance on a dedicated edge device.

The live application also displays API request latency during recognition.

---

## 🔧 Model Optimization Progress

The project has completed the following technical work:

- PyTorch model inference pipeline
- ONNX model export
- Recognition API integration
- Confidence-based prediction handling
- Model-only CPU inference benchmarking

### Ongoing Optimization

The following work remains part of the optimization roadmap:

- Model quantization and validation
- Improved recognition accuracy
- Robustness testing
- End-to-end latency measurement
- Testing on actual edge hardware

ONNX export has been completed. Quantization and validated edge-device deployment are not yet claimed as completed.

---

## 🚀 Getting Started

Follow these steps to run EchoGesture locally.

### Prerequisites

Install the following:

- Node.js and npm
- Python 3.10 or a compatible Python version
- Git
- A webcam
- A modern browser

### 1. Clone the Repository

```bash
git clone https://github.com/HasiniGali/echo-gesture-web.git
```

Navigate to the project directory:

```bash
cd echo-gesture-web
```

### 2. Start the Frontend

Install frontend dependencies:

```bash
npm install
```

Create or update the frontend environment file:

```text
.env
```

Add the backend API URL:

```env
VITE_API_URL=https://echo-gesture-web.onrender.com/api
```

Start the development server:

```bash
npm run dev
```

Open the local URL displayed by Vite in your browser.

### 3. Start the Backend

Open a separate terminal.

Navigate to the backend directory:

```bash
cd backend
```

Install backend dependencies:

```bash
pip install -r requirements.txt
```

Start the FastAPI server:

```bash
uvicorn app.main:app --reload
```

The backend will start on the local development address configured by Uvicorn.

If your local environment uses a different Python command or virtual environment, activate it before installing dependencies.

---

## 🔌 API Endpoints

The backend provides recognition-related API endpoints.

### Recognition Status

```http
GET /api/recognition/status
```

Checks the availability and status of the recognition service.

### Gesture Prediction

```http
POST /api/recognition/predict
```

Accepts a processed landmark sequence and returns the recognition result.

The response includes prediction information and confidence-based recognition status.

---

## 🌐 Deployment

EchoGesture is deployed using separate frontend and backend services.

| Service | Platform | URL |
|---|---|---|
| Frontend | Vercel | https://echo-gesture-web.vercel.app |
| Backend | Render | https://echo-gesture-web.onrender.com |

The frontend communicates with the backend through the configured API URL.

Camera access requires browser permission and a supported secure context.

---

## 🧪 Testing the Prototype

To test the current application:

1. Open the live demo.
2. Navigate to the Recognition page.
3. Allow camera access.
4. Wait for the landmark models to initialize.
5. Perform a gesture in front of the camera.
6. Allow the application to collect the required frames.
7. Observe the prediction and confidence information.
8. Check the recognition status and API latency.

A rejected prediction means the model did not produce a result that met the configured confidence requirement.

---

## 🔮 Future Enhancements

The following features are planned for future development.

### 1. Emergency Communication Mode

A dedicated mode for important communication phrases, such as:

- Requesting help
- Requesting an ambulance
- Asking for a doctor
- Reporting an injury

High-priority phrases will require validation to ensure reliable output.

### 2. Regional Language Support

Planned output languages:

- English
- Hindi
- Telugu
- Tamil
- Kannada

Translation quality and meaning preservation will need to be validated.

### 3. ISL Learning Mode

A learning experience that may include:

- Sign demonstrations
- Gesture practice
- Landmark-based feedback
- Recognition-based learning progress

### 4. Edge Optimization

Future technical improvements include:

- Model quantization
- Reduced inference overhead
- Edge-device testing
- End-to-end latency measurement
- Improved model accuracy and robustness

These features are planned enhancements and are not represented as fully implemented in the current prototype.

---

## ⚠️ Current Limitations

The current prototype has several limitations:

- Recognition accuracy is still low.
- Predictions may be rejected because of low confidence.
- Recognition performance can vary with camera position and lighting.
- The model has not been validated for all users and environments.
- Complete edge-device deployment and quantization remain future work.
- Planned accessibility modes are not yet fully implemented.

The project is currently a prototype and should not be treated as a reliable communication or emergency-response system.

---

## 🎯 Project Objective

EchoGesture aims to combine computer vision, machine learning, and accessible interface design to create a foundation for sign language recognition.

The current implementation demonstrates the complete recognition workflow:

**Camera → Landmarks → Preprocessing → Model → Prediction → User Interface**

The next stage is to improve accuracy, validate robustness, and optimize the system for efficient edge-device operation.

---

## 👥 Team

**Project:** EchoGesture  
**Track:** Sign Language Prediction on Edge Devices  
**Repository:** https://github.com/HasiniGali/echo-gesture-web

---


