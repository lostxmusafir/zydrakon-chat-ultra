# 🌌 Zydrakon AI

**Zydrakon AI** is a next-generation high-performance conversational artificial intelligence model developed, trained, and engineered by **Raj Patil**. It is optimized for speed, precision, and visual excellence, leveraging advanced Large Language Models, local query caching, and dynamic vector diagram rendering.

---

## 🛠️ Architecture & Tech Stack

Zydrakon AI is split into a robust FastAPI backend and a responsive Next.js frontend:

### 1. Backend (FastAPI + Python)
- **High Performance API**: Powered by FastAPI, delivering rapid responses.
- **OpenRouter LLM Integration**: Hooks into multiple free-tier LLM models (Llama 3, Gemma 2, Mistral, Qwen, etc.) with automatic failover/fallback logic.
- **SQLite Database Cache**: Filters duplicate queries and stores pre-orchestrated/historical messages to bypass external API calls and deliver instant answers.
- **SQLite Rate Limiter**: Enforces system-level usage control (limits per-minute and daily queries).

### 2. Frontend (Next.js + Tailwind CSS)
- **Space-Age Design**: Styled with premium aesthetics, animations, and dark/light modes.
- **Mermaid Vector Diagram Rendering**: Supports visual flowchart, sequence, and system architecture diagrams rendered directly in the chat stream.
- **Raw SVG Rendering**: Visualizes inline SVG blocks seamlessly.
- **Responsive Layout**: Designed to expand to wide layouts (`max-w-5xl`) when displaying diagrams.

---

## 🚀 Getting Started

### Prerequisites
- Python 3.10+
- Node.js 18+

### Setup & Installation

#### 1. Clone the repository
```bash
git clone https://github.com/Vihangpatil37/Zydragon.ai.git
cd Zydragon.ai
```

#### 2. Run the Backend
Initialize a virtual environment and install dependencies:
```bash
# Windows
python -m venv venv
.\venv\Scripts\activate
pip install -r backend/requirements.txt

# Start Backend Server
python -m uvicorn backend.main:app --reload --port 8000
```
*Note: Make sure to add your OpenRouter API key inside `backend/.env` under `OPENROUTER_API_KEY`.*

#### 3. Run the Frontend
Install dependencies and run the development server:
```bash
cd frontend
npm install
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 📝 Features & Commands
- **Dynamic Diagrams**: Ask Zydrakon AI to *"draw a flowchart of X"* or *"diagram the workflow of Y"* and it will generate vertical top-to-bottom Mermaid vector diagrams directly in the chat.
- **Identity Interceptor**: Ask *"Who made you?"* or *"What is your pre-brain?"* to receive Zydrakon AI's core credentials and its system architecture diagram.

---
