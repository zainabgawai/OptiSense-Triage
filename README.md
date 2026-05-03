<div align="center">

<br/>

```
 ██████╗ ██████╗ ████████╗██╗███████╗███████╗███╗   ██╗███████╗███████╗
██╔═══██╗██╔══██╗╚══██╔══╝██║██╔════╝██╔════╝████╗  ██║██╔════╝██╔════╝
██║   ██║██████╔╝   ██║   ██║███████╗█████╗  ██╔██╗ ██║███████╗█████╗  
██║   ██║██╔═══╝    ██║   ██║╚════██║██╔══╝  ██║╚██╗██║╚════██║██╔══╝  
╚██████╔╝██║        ██║   ██║███████║███████╗██║ ╚████║███████║███████╗
 ╚═════╝ ╚═╝        ╚═╝   ╚═╝╚══════╝╚══════╝╚═╝  ╚═══╝╚══════╝╚══════╝
                            T R I A G E
```

### *AI-powered triage decision support for emergency departments*

<br/>

[![Python](https://img.shields.io/badge/Python-3.10+-3776AB?style=flat-square&logo=python&logoColor=white)](https://python.org)
[![XGBoost](https://img.shields.io/badge/ML-XGBoost-E95420?style=flat-square)](https://xgboost.readthedocs.io)
[![Gemini](https://img.shields.io/badge/AI-Gemini_2.5_Flash-4285F4?style=flat-square&logo=google&logoColor=white)](https://deepmind.google/gemini)
[![Dataset](https://img.shields.io/badge/Data-MIMIC--III-00897B?style=flat-square)](https://physionet.org/content/mimiciii)
[![ESI](https://img.shields.io/badge/Scale-ESI_Level_1--5-6C3483?style=flat-square)]()
[![Hackathon](https://img.shields.io/badge/Built_at-NexForge_Hackathon-F39C12?style=flat-square)]()

<br/>

> **"tachycardia and chest pain are the primary risk factors here — recommend immediate evaluation"**
> 
> *— Gemini 2.5 Flash explainability layer, in plain English*

<br/>

</div>

---

## The Problem

Emergency departments are one of the most time-critical environments in healthcare, yet triage — deciding which patients need urgent care — is still done **entirely manually**.

A nurse has to assess dozens of patients simultaneously under extreme pressure, with incomplete information and no decision support. The result is two costly failure modes:

| Failure Mode | What happens | Cost |
|---|---|---|
| 🔴 **Under-triage** | Critical patients sent to the waiting room | Lives at risk |
| 🟡 **Over-triage** | Stable patients consuming ICU resources | Wasted capacity |

> **Studies suggest manual triage misclassification rates of 30–40% in busy ERs.** Every misclassification is either a life at risk or a wasted resource.

---

## The Solution

**OptiSense Triage** is a real-time decision support tool for ER nurses. When a patient arrives, the nurse inputs:

- 5 vitals — heart rate, blood pressure, SpO₂, temperature, respiratory rate
- A short chief complaint in plain text
- Basic patient history

The system returns an **ESI severity score (Level 1–5) within seconds**, alongside a plain-English explanation of the top three risk drivers and ordered next steps — powered by Gemini AI explainability.

```
Input:  HR 124bpm | BP 88/60 | SpO₂ 94% | Chief complaint: "chest tightness since 2hrs"
Output: ESI Level 2 — Emergent
        → Tachycardia + hypotension are primary risk factors
        → SpO₂ below threshold warrants immediate evaluation
        → Recommend: immediate ECG, troponin, IV access
```

It **doesn't replace the nurse's judgment**. It gives them a second opinion, pattern-matched against tens of thousands of real ICU admissions from the MIMIC-III dataset.

The dashboard also shows a **live bed allocation map** and a **queue sorted by severity**, so the charge nurse can see the entire department's risk profile at a glance.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         OptiSense Triage Pipeline                       │
└─────────────────────────────────────────────────────────────────────────┘

  01 INPUT            02 PROCESSING          03 REASONING         04 OUTPUT
  ─────────           ─────────────          ────────────         ─────────
  ┌─────────┐         ┌─────────────┐        ┌───────────┐        ┌────────┐
  │  Nurse  │         │  XGBoost    │        │  Gemini   │        │  Dash  │
  │  Input  │ ──────► │  Binary     │ ──────►│  2.5      │ ──────►│  board │
  │         │         │  Classifier │        │  Flash    │        │        │
  └─────────┘         └─────────────┘        └───────────┘        └────────┘
  • Vitals            • Trained on           • Top-3 risk          • ESI Score
  • Age / Gender        MIMIC-III              drivers             • Severity
  • Chief complaint   • Critical vs          • Plain-English         queue
    (text)             Non-critical            reasoning           • Bed map
  • Comorbidities     • NLP encoding         • Next steps          • Flags
```

---

## ESI Severity Scale

| Level | Label | Description | Response |
|:---:|---|---|---|
| 🔴 **1** | Resuscitate | Immediate life threat | Immediate |
| 🟠 **2** | Emergent | High-risk / severe pain | < 10 min |
| 🟡 **3** | Urgent | Multiple resources needed | < 30 min |
| 🟢 **4** | Less Urgent | One resource needed | < 60 min |
| ⚪ **5** | Non-Urgent | No resources needed | < 120 min |

---

## Tech Stack

```
Machine Learning         Data Pipeline           AI Explainability
────────────────         ─────────────           ─────────────────
XGBoost                  MIMIC-III               Gemini 2.5 Flash
scikit-learn             pandas                  Plain-English outputs
Feature engineering      NLP preprocessing       Top-3 risk drivers
Binary classification    Data normalization      ESI reasoning

Backend                  Project Structure
───────                  ─────────────────
Python 3.10+             src/        → core model logic
FastAPI (api/)           api/        → REST endpoints
requirements.txt         models/     → saved model artifacts
                         notebooks/  → exploration & analysis
                         reports/    → results & evaluations
```

---

## Quick Start

**Prerequisites:** Node.js, Python 3.10+, pip, MIMIC-III access, Gemini API Key

```bash
# 0. Set your Gemini API Key
# (Or set GOOGLE_APPLICATION_CREDENTIALS for Vertex AI)
set GEMINI_API_KEY=your_api_key_here

# 1. Clone the repo
git clone https://github.com/zainabgawai/OptiSense-Triage.git
cd OptiSense-Triage

# 2. Install backend dependencies
pip install -r requirements.txt

# 3. Add MIMIC-III data (Optional for inference, required for training)
# Place CSV files in mimic-iii-clinical-db/

# 4. Train the model (Skip if using pre-trained models)
python notebooks/train_model.py

# 5. Launch the API (Backend)
# Run this from the root OptiSense-Triage directory
uvicorn api.main:app --reload

The API will be live at `http://localhost:8000`. See `/docs` for the Swagger UI.

# 6. Launch the Frontend
# Open a new terminal window, then navigate to the `src/` directory to start the React application:

cd src
npm install
npm run dev

The frontend will be available at `http://localhost:3000` (or the port Vite provides).

```
---

## Project Structure

```
OptiSense-Triage/
├── requirements.txt          ← all dependencies
├── README.md
│
├── src/                      ← core source modules
├── api/                      ← REST API layer
├── models/                   ← saved model artifacts (.pkl / .json)
├── notebooks/                ← Data Cleaning and Model Training Files
├── reports/                  ← evaluation reports & metrics
└── mimic-iii-clinical-db/    ← Processed Dataset 
```

---

## Dataset

This project uses the **MIMIC-III Clinical Database** — a large, freely available database comprising de-identified health data from ICU patients at Beth Israel Deaconess Medical Center (2001–2012).

Access requires credentialing via [PhysioNet](https://physionet.org/content/mimiciii/1.4/).

> ⚠️ MIMIC-III data files are **not included** in this repository per data use agreement. Add them locally to `mimic-iii-clinical-db/` before training.

---

## Disclaimer

> OptiSense Triage is a **hackathon prototype** built for research and demonstration purposes only. It is **not validated for clinical use** and should not be used to make real medical decisions. Always defer to qualified healthcare professionals.

---

<div align="center">

Built with ❤️ for **NexForge Hackathon** · Trained on MIMIC-III · Powered by Gemini

</div>
