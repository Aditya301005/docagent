# About DocAgent AI

DocAgent AI is an advanced, AI-powered document scanning and intelligence application. It bridges the gap between physical documents and structured digital data by utilizing cutting-edge on-device mobile features combined with powerful cloud-based AI inference models.

## Project Overview

The primary goal of DocAgent is to allow users to capture images of physical documents (like invoices, receipts, contracts, ID cards, and forms) and instantly extract structured, meaningful data from them. 

Beyond simple Optical Character Recognition (OCR), DocAgent uses Large Language Models (LLMs) to logically understand the document—identifying totals, dates, names, addresses, and document types autonomously.

## Core Features

- **AI-Powered Extraction**: Point the camera at a document, and the app automatically parses out the critical fields into structured JSON.
- **Intelligent History**: A searchable archive of all scanned documents, dynamically grouped by time (Today, This Week, Earlier) with AI-generated insights (e.g., "3 invoices · total $450.00").
- **Secure Vault**: Highly sensitive documents (like ID cards or contracts) can be moved to a Secure Vault locked behind a 6-digit PIN. These documents are encrypted and hidden from the main history view.
- **Immersive UI/UX**: Built with a focus on premium, glassmorphic design. It features dynamic ambient orb backgrounds, fluid swipeable tab navigation, custom haptic feedback, and an animated skeleton-loading system.

---

## Technical Stack & Methodology

DocAgent is built using a modern, decoupled microservices architecture, split into three primary repositories/services:

### 1. Mobile Frontend (React Native + Expo)
- **Framework**: React Native managed by Expo (SDK 52+).
- **Navigation**: Expo Router (file-based routing) with custom `react-native-gesture-handler` wrappers for fluid, swipeable tab navigation.
- **State Management**: Zustand for global state (`useDocStore`, `useThemeStore`).
- **Storage**: `AsyncStorage` for local caching and Secure Store for handling authentication tokens and the Vault PIN.
- **Animations & UI**: Heavy use of `react-native-reanimated` for 60fps spring physics and micro-interactions. `react-native-svg` is used for dynamic gradient backgrounds and custom icons. `expo-haptics` drives the physical feedback engine.
- **Local Notifications**: `expo-notifications` is used to trigger local device alerts when background extraction tasks complete.

### 2. AI Inference Backend (Python / FastAPI)
- **Framework**: FastAPI (Python) running on Uvicorn, containerized using Docker and Docker Compose.

- **Methodology**: The backend receives an image payload from the mobile app. It securely transmits the image to the Gemini vision model with a strict system prompt demanding a structured JSON response. The LLM performs visual OCR and entity extraction simultaneously, classifying the document and returning key-value pairs (e.g., totals, dates).
- **Performance**: Optimized with HTTPX for asynchronous external API calls and strict timeouts to prevent hanging connections.

### 3. Authentication Backend (Node.js)
- **Framework**: Node.js / Express.
- **Purpose**: Handles secure user registration, login, and session management.
- **Security**: Utilizes JWT (JSON Web Tokens) for stateless authentication. The frontend caches this token and sends it as a Bearer token to authorize requests.

---

## Design Philosophy

The project heavily emphasizes a **"Premium First"** aesthetic. Instead of relying on standard OS-level UI components (like default alert pop-ups or basic navigation bars), DocAgent utilizes custom-built, glassmorphic UI elements. 

Animations are not just decorative; they are used to mask network latency. For example, while the Python backend processes the image via Gemini (which takes 10-15 seconds), the frontend displays a glowing, animated "Skeleton Loader" with typing text ("AI is analyzing your document...") to keep the user engaged and informed.
