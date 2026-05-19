# DocAgent

DocAgent is a document-processing app with:

- an Expo React Native frontend in `frontend/`
- a FastAPI + Celery backend in `doc-agent-backend/`
- a separate Node/Prisma auth service in `node-auth-backend/`
- local document models already checked into `doc-agent-backend/app/models/`

## Project Layout

```text
DocAgent/
|-- frontend/             Expo mobile app
|-- doc-agent-backend/    FastAPI API + Celery + OCR + ML inference
|-- node-auth-backend/    Node auth/email service for login/register/reset
|-- scripts/              Utility scripts
`-- README.md
```

## Models Included In This Repo

The backend already contains local model assets in `doc-agent-backend/app/models/`.

Default runtime path:

- `classifier.onnx`
- `ner_fixed.onnx`
- `vqa.onnx`
- tokenizer / processor folders:
  - `app/models/classifier/`
  - `app/models/ner/`
  - `app/models/vqa/`

For normal startup, you do not need to download models first.

There is also an alternate HuggingFace-based model loader in the backend code, but the active inference path used by the API and Celery worker currently uses the local ONNX models above.

## What You Need Installed

### Required

- Docker Desktop
- Node.js 18+

### Required only if you run the Python backend outside Docker

- Python 3.11
- Tesseract OCR for Windows

## Services and Ports

| Service | Folder | Port | Required |
|---|---|---:|---|
| FastAPI API | `doc-agent-backend/` | `8000` | Yes |
| Celery worker | `doc-agent-backend/` | n/a | Yes |
| PostgreSQL | Docker compose | `5432` | Yes |
| Redis | Docker compose | `6379` | Yes |
| Node auth service | `node-auth-backend/` | `3000` | Yes for login/register/forgot-password |
| Expo dev server | `frontend/` | `8081` usually | Yes for mobile app |

If you only use guest mode in the app, the Node auth service is not required.

## Quick Start

Start services in this order:

1. Docker Desktop
2. FastAPI backend + Postgres + Redis + Celery
3. Node auth backend
4. Expo frontend

## 1. Start Docker Desktop

Open Docker Desktop and wait for it to finish starting.

If Docker Desktop refuses to reopen with the lingering-process error, use the fix tagged below:

### [DOCKER-DESKTOP-FIX]

```powershell
powershell -ExecutionPolicy Bypass -File ".\scripts\restart-docker-desktop.ps1" -Launch
```

## 2. Configure the FastAPI Backend

Create `doc-agent-backend/.env`.

Recommended Docker setup:

```env
POSTGRES_USER=docagent_user
POSTGRES_PASSWORD=yourpassword123
DATABASE_URL=postgresql+asyncpg://docagent_user:yourpassword123@db:5432/docagent
REDIS_URL=redis://redis:6379/0
SECRET_KEY=change-this-to-a-long-random-string
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=10080
UPLOAD_DIR=./uploads
MAX_FILE_SIZE_MB=20
TESSERACT_CMD=tesseract

# Optional tuning
MODEL_DIR=
QA_MODEL_DIR=
INFERENCE_DEVICE=cpu
CONFIDENCE_THRESHOLD=0.70
```

Notes:

- `MODEL_DIR` and `QA_MODEL_DIR` are optional for this repo's default startup.
- Leaving them empty is fine.
- The checked-in ONNX models are already used by the active inference path.

## 3. Start the FastAPI Backend Stack

From the project root:

```powershell
cd ".\doc-agent-backend"
docker compose up --build
```

This starts:

- PostgreSQL
- Redis
- FastAPI on `http://localhost:8000`
- Celery worker

Keep that terminal open.

Health checks:

```text
http://localhost:8000/health
http://localhost:8000/docs
```

Expected health response:

```json
{"status":"ok","service":"DocAgent","version":"1.0.0"}
```

## 4. Configure the Node Auth Backend

The frontend login, register, verify-email, forgot-password, and reset-password flows call the Node auth service on port `3000`.

Create `node-auth-backend/.env`.

Example:

```env
PORT=3000
DATABASE_URL=postgresql://docagent_user:yourpassword123@localhost:5432/docagent
JWT_SECRET=change-this-to-a-long-random-string

SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@example.com
SMTP_PASS=your-email-password-or-app-password

FRONTEND_URL=docagent://
```

Notes:

- `DATABASE_URL` here is for Prisma and should use the normal PostgreSQL URL format.
- If you use Docker for Postgres, `localhost:5432` is correct from the Windows host.
- `FRONTEND_URL` is used to build password reset links. Set it to the URL/deep link you actually want users to open.

## 5. Start the Node Auth Backend

Open a new terminal:

```powershell
cd ".\node-auth-backend"
npm install
npx prisma generate
npx prisma db push
npm run dev
```

Health check:

```text
http://localhost:3000/health
```

Expected response:

```json
{"status":"ok","service":"docagent-node-auth"}
```

## 6. Start the Expo Frontend

Open another new terminal:

```powershell
cd ".\frontend"
npm install
npx expo start
```

Then open the app with:

- Expo Go on a physical device
- Android emulator
- iOS simulator

## 7. API URL in the App

The frontend tries to auto-detect the FastAPI backend, but if it fails, set the API URL manually inside the app settings.

Use:

| Device | API URL |
|---|---|
| Android emulator | `http://10.0.2.2:8000` |
| iOS simulator | `http://localhost:8000` |
| Physical phone on same Wi-Fi | `http://<your-lan-ip>:8000` |

To find your LAN IP:

```powershell
ipconfig
```

The auth service is derived automatically by replacing port `8000` with `3000`.

## Startup Checklist

Use this as the shortest repeatable sequence:

### Terminal 1 - backend stack

```powershell
cd ".\doc-agent-backend"
docker compose up --build
```

### Terminal 2 - auth service

```powershell
cd ".\node-auth-backend"
npm install
npx prisma generate
npx prisma db push
npm run dev
```

### Terminal 3 - frontend

```powershell
cd ".\frontend"
npm install
npx expo start
```

## First Run Verification

Verify these before testing the app:

1. `http://localhost:8000/health` works
2. `http://localhost:8000/docs` opens
3. `http://localhost:3000/health` works
4. Expo starts and shows a QR code or emulator options

Then in the app:

1. Use guest mode, or
2. Register/login through the Node auth backend
3. Upload or scan a document
4. Confirm results are returned from the backend

## Stopping Everything

### Docker backend stack

In the `doc-agent-backend` terminal:

```powershell
Ctrl + C
docker compose down
```

To remove database volume too:

```powershell
docker compose down -v
```

### Node auth backend

```powershell
Ctrl + C
```

### Expo frontend

```powershell
Ctrl + C
```

## Running the Python Backend Without Docker

Use this only if you do not want Docker for the FastAPI/Celery stack.

### Local backend `.env`

```env
POSTGRES_USER=docagent_user
POSTGRES_PASSWORD=yourpassword123
DATABASE_URL=postgresql+asyncpg://docagent_user:yourpassword123@localhost:5432/docagent
REDIS_URL=redis://localhost:6379/0
SECRET_KEY=change-this-to-a-long-random-string
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=10080
UPLOAD_DIR=./uploads
MAX_FILE_SIZE_MB=20
TESSERACT_CMD=C:\Program Files\Tesseract-OCR\tesseract.exe
MODEL_DIR=
QA_MODEL_DIR=
INFERENCE_DEVICE=cpu
CONFIDENCE_THRESHOLD=0.70
```

### Manual backend start

```powershell
cd ".\doc-agent-backend"
python -m venv venv
.\venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install torch torchvision --index-url https://download.pytorch.org/whl/cpu
pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Start the Celery worker in another terminal:

```powershell
cd ".\doc-agent-backend"
.\venv\Scripts\Activate.ps1
celery -A app.tasks.celery_app worker --pool=solo --loglevel=info
```

## Common Startup Issues

### Docker compose says no configuration file was found

Run it from `doc-agent-backend/`, not the project root:

```powershell
cd ".\doc-agent-backend"
docker compose up --build
```

### App cannot reach the backend

- Make sure FastAPI is running on port `8000`
- Make sure the app API URL is correct
- Use `10.0.2.2` on Android emulator instead of `localhost`

### Login/register does not work but guest mode works

The Node auth backend is not running, or its `.env` / Prisma setup is incomplete.

Start:

```powershell
cd ".\node-auth-backend"
npx prisma generate
npx prisma db push
npm run dev
```

### PowerShell blocks local scripts

```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

## Optional: Pre-download HuggingFace Models

This is optional and not required for the default ONNX startup path.

```powershell
cd ".\doc-agent-backend"
python download_models.py
```

## Last Updated

April 2026
