# DocAgent AI: Autonomous Document Processing Agent

## Project Overview
DocAgent is an advanced, AI-powered document scanning and intelligence application. It bridges the gap between physical documents and structured digital data by utilizing cutting-edge on-device mobile features combined with powerful cloud-based AI inference models.

The primary goal of DocAgent is to allow users to capture images of physical documents (like invoices, receipts, contracts, ID cards, and forms) and instantly extract structured, meaningful data from them. Beyond simple Optical Character Recognition (OCR), DocAgent uses Large Language Models (LLMs) to logically understand the document—identifying totals, dates, names, addresses, and document types autonomously.

---



## Features

- **AI-Powered Entity & Classification Extraction**: Points the camera at a document, performs visual OCR and entity extraction, classifies the document type, and returns structured fields (like totals, dates, names, and addresses) as structured JSON.
- **Intelligent Scan History**: A searchable archive of all scanned documents, dynamically grouped by time (Today, This Week, Earlier) with AI-generated insights (e.g., "3 invoices · total $450.00").
- **Secure Document Vault**: Highly sensitive documents (like ID cards or contracts) can be moved to a Secure Vault locked behind a 6-digit PIN. These documents are encrypted locally and hidden from the main history.
- **Microservice Token Synchronization**: Handles secure logins, registration, and email verification through a dedicated Node service. Automatically shadow-registers users on the FastAPI core database upon first API requests using JWT decoding.
- **Local/Offline Inference Capability**: Includes local pre-trained ONNX models (`classifier.onnx`, `ner_fixed.onnx`, `vqa.onnx`) directly in the codebase for zero-setup execution and optional offline performance.
- **Immersive UI/UX Aesthetics**: Beautiful glassmorphic design featuring ambient floating orbs, fluid swipeable tab navigation, custom haptic feedback, and an animated skeleton loading system to mask latency.

---

## Technology Stack

### 1. Mobile Frontend
- **Framework**: React Native managed by Expo (SDK 52+).
- **Navigation**: Expo Router (file-based navigation) with `react-native-gesture-handler` wrappers.
- **State Management**: Zustand for global state (`useDocStore`, `useThemeStore`).
- **Persistence**: `AsyncStorage` for normal caching; `SecureStore` for Vault PINs and auth tokens.
- **Animations & UI**: `react-native-reanimated` (for 60fps spring transitions), `react-native-svg` (for dynamic gradient orbs), and `expo-haptics`.

### 2. Core Python Backend
- **Framework**: FastAPI with Uvicorn server, containerized with Docker & Docker Compose.
- **Database Access**: SQLAlchemy (async session) & Alembic database migrations.
- **Task Queue**: Celery task runner with Redis.
- **Local Inference**: ONNX Runtime running local `.onnx` models.

### 3. Node.js Auth Backend
- **Framework**: Node.js & Express.
- **Database ORM**: Prisma Client.
- **Authentication**: Stateless JWT token generation & verification.
- **Mailing**: Nodemailer configured for SMTP.

### 4. Database & Broker Layer
- **PostgreSQL**: Shared database for user credentials and documents metadata.
- **Redis**: Serves as a Celery broker and caching database.

---

## Pre-requisites & Installation Steps

### 1. System Requirements
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (Required)
- [Node.js](https://nodejs.org/) v18+ (Required)
- [Python 3.11](https://www.python.org/) & [Tesseract OCR](https://github.com/tesseract-ocr/tesseract) (Only if running the backend outside Docker)

### 2. Configure Environment Files

You need to create `.env` files in two locations:

#### Core Backend Configuration
Create [doc-agent-backend/.env](file:///c:/Users/adity/OneDrive/Desktop/DocAgent/doc-agent-backend/.env):
```env
POSTGRES_USER=docagent_user
POSTGRES_PASSWORD=yourpassword123
DATABASE_URL=postgresql+asyncpg://docagent_user:yourpassword123@db:5432/docagent
REDIS_URL=redis://redis:6379/0
SECRET_KEY=your-jwt-secret-key-must-be-long-and-random
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=10080
UPLOAD_DIR=./uploads
MAX_FILE_SIZE_MB=20
TESSERACT_CMD=tesseract

# Optional configurations
INFERENCE_DEVICE=cpu
CONFIDENCE_THRESHOLD=0.70
```

#### Node Auth Backend Configuration
Create [node-auth-backend/.env](file:///c:/Users/adity/OneDrive/Desktop/DocAgent/node-auth-backend/.env):
```env
PORT=3000
DATABASE_URL=postgresql://docagent_user:yourpassword123@localhost:5432/docagent
JWT_SECRET=your-jwt-secret-key-must-be-long-and-random

SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-gmail-app-password

FRONTEND_URL=docagent://
```

---

## How to Run Backend & Databases

We provide two backend services: the AI Inference Engine and the Node.js Auth/User Service.

### Step 1: Start Core Python Backend (FastAPI, Redis, Postgres, Celery)
Navigate to the `doc-agent-backend/` folder and launch the Docker stack:
```powershell
cd doc-agent-backend
docker compose up --build
```
This launches:
- **FastAPI server** at `http://localhost:8000`
- **PostgreSQL database** at port `5432`
- **Redis instance** at port `6379`
- **Celery worker** task queue runner

Verify it works by opening the OpenAPI documentation at: `http://localhost:8000/docs`.

### Step 2: Start Node.js Authentication Backend
Open a new terminal and run:
```powershell
cd node-auth-backend
npm install
npx prisma generate
npx prisma db push
npm run dev
```
Verify the authentication health check by visiting: `http://localhost:3000/health`.

---

## How to Run Frontend

Open a third terminal window to start the Expo Metro dev server:
```powershell
cd frontend
npm install
npx expo start
```
Use the QR code in the terminal to load the application inside **Expo Go** on a physical iOS or Android device, or press `a` for Android Emulator or `i` for iOS Simulator.

### Device Connection Settings
The frontend is pre-configured to detect API urls, but if you run on different devices, set the target API URL manually inside the app settings:
- **Android Emulator**: `http://10.0.2.2:8000`
- **iOS Simulator**: `http://localhost:8000`
- **Physical Device**: `http://<YOUR_LAN_IP>:8000`

---

## Sample Workflow

Here is how to test a full user flow from scratch:

1. **User Sign Up & Authentication**:
   - Open the app. Click **Sign Up** to create an account.
   - Enter your email and password. The Express Backend sends a verification email using SMTP.
   - Login to retrieve your secure JWT access token.
2. **First-Time Document Extraction (Connected Mode)**:
   - Go to the **Scan** tab. Use your camera or select an image file (e.g., a sample receipt or invoice).
   - Press **Extract**. The frontend uploads the image via multipart FormData to the FastAPI `/api/documents/sync` endpoint.
   - The FastAPI backend extracts the text, sends it to Google's Gemini LLM to execute structured extraction, and parses the result into classification types, confidence metrics, and clean keys.
3. **Local Store Hydration**:
   - On succeeding logins or application reinstalls, the app calls `syncDocumentsFromServer`.
   - The app reconciles local files with server history, ensuring all scanned documents are restored.
4. **Moving sensitive documents to the Vault**:
   - Locate a document card in history (e.g. an ID card).
   - Swipe or click to lock the document. Setup a 6-digit PIN.
   - The file will be hidden from the standard history screen and moved to the encrypted **Secure Vault** tab, accessible only upon entering the PIN.



---

## License / Acknowledgment
- **License**: Distributed under the MIT License. See `LICENSE` for details.
- **Acknowledgments**:
  - Expo and the React Native Community
  - Prisma Client & PostgreSQL
  - FastAPI & Celery
