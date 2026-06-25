<![CDATA[# 🏥 MediVision AI — Heart Disease Detection & Medical Chatbot

![Python](https://img.shields.io/badge/Python-3.10+-blue?logo=python)
![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-green?logo=fastapi)
![PyTorch](https://img.shields.io/badge/PyTorch-2.0+-red?logo=pytorch)
![License](https://img.shields.io/badge/License-MIT-yellow)
![Status](https://img.shields.io/badge/Status-Active-brightgreen)

---

## 📖 About

**MediVision AI** is an AI-powered clinical diagnostics platform that combines deep learning–based medical image analysis with a biomedical chatbot assistant. Users can upload cardiac scans — ECG strips, Chest X-Rays, and Cardiac MRIs — and receive instant AI-driven disease probability predictions. The integrated **BioGPT Medical Chatbot** provides contextual health guidance, symptom explanations, and precautionary recommendations based on the diagnostic results. A full **Doctor Approval Portal** enables clinicians to review, confirm, or overrule AI-generated diagnoses before they reach the patient, simulating a real-world clinical validation workflow.

> ⚠️ **Disclaimer:** MediVision AI is a demonstration/sandbox project for educational and portfolio purposes. It is **not** intended for real clinical use or medical decision-making.

---

## ✨ Features

| Category | Feature |
|----------|---------|
| 🖼️ **Multi-Modal Upload** | Supports ECG, Chest X-Ray, and Cardiac MRI image uploads with drag-and-drop |
| 🤖 **AI Prediction Engine** | Deep learning inference using **ResNet-18 / ViT / DenseNet121** via PyTorch |
| 💬 **BioGPT Chatbot** | Context-aware medical chatbot with selectable models (BioGPT, BioBERT, MedAlpaca) |
| 🩺 **Doctor Approval Portal** | Clinicians can review, approve, or overrule AI diagnoses with clinical notes |
| 📋 **Medical Records Database** | SQLite-backed patient history with scan records, verdicts, and doctor sign-offs |
| 🔐 **Role-Based Authentication** | Patient and Doctor roles with session-based access control |
| 🔥 **AI Attention Heatmaps** | Visual overlay showing model attention regions on uploaded scans |
| 📊 **Real-Time Scan Animation** | Animated scanning progress with clinical-grade UI feedback |
| 🎨 **Sample Scans Included** | Built-in high-fidelity ECG, X-Ray, and MRI samples for instant demo |

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|------------|
| **Backend** | Python 3.10+, FastAPI, Uvicorn |
| **AI / ML** | PyTorch, torchvision (ResNet-18, ViT, DenseNet121) |
| **NLP Chatbot** | Microsoft BioGPT / BioBERT / MedAlpaca (Hugging Face models) |
| **Database** | SQLite3 with auto-seeded demo data |
| **Frontend** | HTML5, CSS3 (custom design system), Vanilla JavaScript |
| **Icons** | Lucide Icons |
| **Fonts** | Google Fonts (Inter, Outfit) |
| **Image Processing** | Pillow (PIL) |

---

## 🏗️ Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                        CLIENT (Browser)                         │
│              HTML5 / CSS3 / Vanilla JavaScript                   │
│   ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌───────────────┐  │
│   │  Upload   │  │ Chatbot  │  │ Records  │  │ Doctor Portal │  │
│   │  Center   │  │  Panel   │  │  Table   │  │  (Auth-gated) │  │
│   └────┬─────┘  └────┬─────┘  └────┬─────┘  └──────┬────────┘  │
└────────┼─────────────┼─────────────┼────────────────┼───────────┘
         │             │             │                │
         ▼             ▼             ▼                ▼
┌──────────────────────────────────────────────────────────────────┐
│                    FastAPI REST API Server                       │
│                     (Uvicorn, port 8000)                         │
│                                                                  │
│   POST /api/predict ─────► PyTorch Inference Engine              │
│                              ├── ResNet-18 (torchvision)         │
│                              ├── ViT (google/vit-base)           │
│                              └── DenseNet121                     │
│                                                                  │
│   POST /api/chat ────────► BioGPT / BioBERT / MedAlpaca         │
│                              (Context-Aware Medical NLP)         │
│                                                                  │
│   POST /api/auth/* ──────► Auth Controller (Session Mgmt)        │
│   GET  /api/records ─────► SQLite Query Engine                   │
│   POST /api/records/*/review ──► Doctor Approval Pipeline        │
└──────────────────────────────────────────────────────────────────┘
         │                                        │
         ▼                                        ▼
┌─────────────────┐                   ┌────────────────────┐
│   SQLite DB     │                   │   /uploads/ Dir    │
│  medivision.db  │                   │  (Saved Scans)     │
│  ┌───────────┐  │                   └────────────────────┘
│  │  users    │  │
│  │  records  │  │
│  └───────────┘  │
└─────────────────┘
```

---

## 🚀 Getting Started

### Prerequisites

- **Python 3.10+** installed
- **pip** package manager
- (Optional) NVIDIA GPU with CUDA for accelerated inference

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/tejaprakas/MediVision.git
cd MediVision

# 2. Create a virtual environment (recommended)
python -m venv venv
source venv/bin/activate        # Linux / macOS
venv\Scripts\activate           # Windows

# 3. Install dependencies
pip install -r requirements.txt

# 4. Run the server
python server.py

# 5. Open your browser
# Navigate to http://localhost:8000
```

The server will automatically:
- 🗃️ Create the SQLite database (`medivision.db`)
- 👤 Seed demo Patient and Doctor accounts
- 📋 Seed sample medical records with ECG/X-Ray data
- 🚀 Start Uvicorn on `0.0.0.0:8000` with hot-reload enabled

---

## 🔑 Demo Credentials

Use these pre-seeded accounts to explore the platform instantly:

| Role | Email | Password | Access |
|------|-------|----------|--------|
| 🧑‍⚕️ **Patient** | `patient@medivision.ai` | `password` | Upload scans, chat with AI, view records |
| 👩‍⚕️ **Doctor** | `doctor@medivision.ai` | `password` | All patient features + Clinical Approval Queue |

> 💡 **Tip:** Click the quick-login buttons on the Sign In modal to auto-fill credentials.

---

## 📡 API Endpoints

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/auth/register` | Register a new patient or doctor account |
| `POST` | `/api/auth/login` | Authenticate and receive user session data |

### Diagnostics & Prediction

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/predict` | Upload a medical image for AI inference (multipart form) |
| `GET` | `/api/records` | Fetch all medical records (filtered by patient email) |

### Doctor Review

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/records/{record_id}/review` | Submit clinical verdict, notes, and signature for a record |

### Medical Chatbot

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/chat` | Send a message to the BioGPT chatbot (with optional diagnosis context) |

### Static Assets

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/` | Serve the main `index.html` application |
| `GET` | `/app.js` | Serve the frontend JavaScript |
| `GET` | `/style.css` | Serve the application stylesheet |
| `GET` | `/assets/*` | Serve sample scan images |
| `GET` | `/uploads/*` | Serve uploaded patient scans |

---

## 📁 Project Structure

```
MediVision/
├── 📄 index.html            # Main single-page application (Landing + Dashboard)
├── 🎨 style.css             # Complete design system (dark theme, animations)
├── ⚡ app.js                # Frontend logic (auth, upload, chat, doctor portal)
├── 🐍 server.py             # FastAPI backend (API routes, AI inference, DB)
├── 🗃️ medivision.db         # SQLite database (auto-generated on first run)
├── 📂 assets/               # Pre-loaded sample medical images
│   ├── ecg_sample.png       #   └── Sample ECG strip
│   ├── xray_sample.png      #   └── Sample Chest X-Ray
│   └── mri_sample.png       #   └── Sample Cardiac MRI
├── 📂 uploads/              # User-uploaded scan storage (auto-created)
├── 📄 requirements.txt      # Python dependency manifest
├── 📄 .gitignore            # Git exclusion rules
└── 📄 README.md             # This file
```

---

## 📸 Screenshots

> 🖼️ *Screenshots will be added in a future update.*

| View | Preview |
|------|---------|
| Landing Page | ![Landing Page](screenshots/landing.png) |
| Diagnostic Center | ![Diagnostic Center](screenshots/diagnostic-center.png) |
| AI Prediction Results | ![Prediction Results](screenshots/prediction-results.png) |
| BioGPT Chatbot | ![BioGPT Chatbot](screenshots/chatbot.png) |
| Medical Records | ![Medical Records](screenshots/records.png) |
| Doctor Approval Portal | ![Doctor Portal](screenshots/doctor-portal.png) |

---

## 🗺️ Future Roadmap

- [ ] 🔬 **Real Grad-CAM Heatmaps** — Generate true gradient-weighted attention maps from the CNN/ViT backbone
- [ ] 🤗 **Hugging Face Model Hub Integration** — Download and swap fine-tuned cardiac classification models at runtime
- [ ] 🐳 **Docker Deployment** — Single-command containerized deployment with `docker-compose`
- [ ] 🔄 **CI/CD Pipeline** — GitHub Actions for automated testing, linting, and deployment
- [ ] 📱 **Responsive Mobile UI** — Fully optimized touch-friendly interface for tablets and phones
- [ ] 🔒 **JWT Token Authentication** — Replace session-based auth with signed JWT tokens and refresh flows
- [ ] 📊 **Patient Analytics Dashboard** — Trend charts showing disease probability over multiple scans
- [ ] 🧬 **DICOM File Support** — Native parsing of clinical DICOM format medical images
- [ ] ☁️ **Cloud Deployment** — One-click deploy to AWS / GCP / Azure with managed database

---

## 📜 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

```
MIT License

Copyright (c) 2026 Teja Prakas

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
```

---

## 👤 Author

Built with ❤️ by [Teja Prakas](https://github.com/tejaprakas)

---

<p align="center">
  <strong>🏥 MediVision AI</strong> — Where Artificial Intelligence Meets Clinical Diagnostics
  <br>
  <sub>⭐ Star this repo if you found it useful!</sub>
</p>
]]>
