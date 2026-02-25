# ⚛️ Physics AI Chatbot — RAG-Powered Q&A System

<div align="center">

![Physics Chatbot Banner](https://img.shields.io/badge/Physics-AI%20Chatbot-blueviolet?style=for-the-badge&logo=atom&logoColor=white)
![Python](https://img.shields.io/badge/Python-3.12-blue?style=for-the-badge&logo=python&logoColor=white)
![Next.js](https://img.shields.io/badge/Next.js-14-black?style=for-the-badge&logo=next.js&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688?style=for-the-badge&logo=fastapi&logoColor=white)
![LangChain](https://img.shields.io/badge/LangChain-RAG-orange?style=for-the-badge)
![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)

**A domain-specific, retrieval-augmented generation (RAG) chatbot that answers Physics questions with high accuracy using locally-running LLMs, hybrid vector search, and cross-encoder reranking.**

[Features](#-features) • [Architecture](#-architecture) • [Tech Stack](#-tech-stack) • [Getting Started](#-getting-started) • [API Reference](#-api-reference) • [Project Structure](#-project-structure)

</div>

---

## 📌 Overview

The **Physics AI Chatbot** is a full-stack intelligent Q&A system purpose-built for Physics education. It leverages a **Retrieval-Augmented Generation (RAG)** pipeline to ground every response in a curated physics knowledge base, preventing hallucinations and ensuring domain accuracy.

The system uses **Ollama (Gemma2:2b)** as its local LLM, **FAISS** for vector search, **SentenceTransformer** for dense retrieval, and a **CrossEncoder** for response reranking — all served through a **FastAPI** streaming backend and a **Next.js 14** frontend.

---

## ✨ Features

- 🔍 **Hybrid Retrieval** — Combines FAISS (sparse) + SentenceTransformer dense embeddings for superior recall
- 🔄 **Cross-Encoder Reranking** — Uses `ms-marco-MiniLM-L-6-v2` to rerank candidates by relevance score
- 🧠 **Multi-Prompt Routing** — Automatically selects the best prompt type (Factual / Reasoning / Math / General) based on the question
- 💬 **Conversational Memory** — Maintains per-session chat history with context-aware question reformulation
- ⚡ **Real-time Streaming** — Streams token-by-token responses via SSE (Server-Sent Events)
- 🔒 **Domain Enforcement** — Refuses to answer non-physics questions with a graceful fallback message
- 🗑️ **Session Management** — Create and delete isolated chat sessions per user
- 📐 **Math Support** — Renders LaTeX/MathJax equations in the frontend
- 🎨 **Modern UI** — Animated, responsive interface with Framer Motion and Tailwind CSS

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Physics AI Chatbot                       │
│                                                                 │
│  ┌─────────────────┐          ┌──────────────────────────────┐  │
│  │   Next.js 14    │  HTTP/   │        FastAPI Server        │  │
│  │   Frontend      │◄─SSE────►│                              │  │
│  │                 │          │  ┌────────────────────────┐  │  │
│  │  • Chat UI      │          │  │    RAG Pipeline        │  │  │
│  │  • Streaming    │          │  │                        │  │  │
│  │  • MathJax      │          │  │  1. Hybrid Retrieval   │  │  │
│  │  • Session Mgmt │          │  │     ├─ FAISS Search    │  │  │
│  └─────────────────┘          │  │     └─ Dense Retrieval │  │  │
│                               │  │                        │  │  │
│                               │  │  2. CrossEncoder       │  │  │
│                               │  │     Reranking          │  │  │
│                               │  │                        │  │  │
│                               │  │  3. Prompt Routing     │  │  │
│                               │  │     (Factual/Math/     │  │  │
│                               │  │      Reasoning/General)│  │  │
│                               │  │                        │  │  │
│                               │  │  4. Ollama LLM         │  │  │
│                               │  │     (Gemma2:2b)        │  │  │
│                               │  └────────────────────────┘  │  │
│                               └──────────────────────────────┘  │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                    Knowledge Base                         │   │
│  │   Book TXT  ──►  Text Splitter  ──►  FAISS Index         │   │
│  │                  (chunk: 900)        (all-mpnet-base-v2)  │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### RAG Pipeline Flow

```
User Question
     │
     ▼
┌─────────────┐    ┌──────────────────┐    ┌────────────────────┐
│ Hybrid      │───►│ CrossEncoder     │───►│ Prompt Router      │
│ Retrieval   │    │ Reranking        │    │ (auto-selects type)│
│ FAISS +     │    │ score > 0.5 kept │    └────────┬───────────┘
│ Dense       │    └──────────────────┘             │
└─────────────┘                                     ▼
                                          ┌────────────────────┐
                                          │ History-Aware      │
                                          │ Retriever          │
                                          │ (LangChain)        │
                                          └────────┬───────────┘
                                                   │
                                                   ▼
                                          ┌────────────────────┐
                                          │ Ollama Gemma2:2b   │
                                          │ (Streamed Output)  │
                                          └────────────────────┘
```

---

## 🛠️ Tech Stack

### Backend
| Technology | Purpose |
|---|---|
| **FastAPI** | REST API + SSE Streaming server |
| **LangChain** | RAG chain orchestration |
| **Ollama (Gemma2:2b)** | Local LLM inference |
| **FAISS** | Vector similarity search index |
| **HuggingFace Embeddings** | `all-mpnet-base-v2` for document embeddings |
| **SentenceTransformer** | `all-MiniLM-L6-v2` for dense retrieval |
| **CrossEncoder** | `ms-marco-MiniLM-L-6-v2` for reranking |
| **Starlette Sessions** | Per-user session management |

### Frontend
| Technology | Purpose |
|---|---|
| **Next.js 14** | React framework with App Router |
| **TypeScript** | Type-safe frontend code |
| **Tailwind CSS** | Utility-first styling |
| **Framer Motion** | Animations and transitions |
| **MathJax** | LaTeX equation rendering |
| **react-markdown** | Markdown response rendering |
| **Axios** | HTTP client for API calls |
| **Lucide React** | Icon library |

---

## 🚀 Getting Started

### Prerequisites

- **Python 3.12+**
- **Node.js 18+** and **npm**
- **[Ollama](https://ollama.com/)** installed and running locally

### 1. Clone the Repository

```bash
git clone https://github.com/your-username/physics-chatbot.git
cd physics-chatbot
```

### 2. Backend Setup

```bash
cd server
```

**Install Python dependencies:**

```bash
pip install fastapi uvicorn langchain langchain-community langchain-huggingface langchain-ollama sentence-transformers faiss-cpu numpy
```

**Pull the LLM model via Ollama:**

```bash
ollama pull gemma2:2b
```

**Prepare your knowledge base:**

Place your physics textbook content as `book.txt` inside `server/data_extraction/`.

> The FAISS index will be auto-generated on first startup and saved to `server/vector/`.

**Run the backend server:**

```bash
python rag-5.5.py
```

The API will be live at `http://localhost:8000`.

---

### 3. Frontend Setup

```bash
cd client
```

**Install dependencies:**

```bash
npm install
```

**Configure environment variables:**

Create a `.env.local` file in the `client/` directory:

```env
NEXT_PUBLIC_BACKEND_URL=http://localhost:8000
```

**Run the development server:**

```bash
npm run dev
```

The app will be available at `http://localhost:3000`.

---

## 📡 API Reference

### POST `/question`
Registers a question for a session and validates the request.

**Request Body:**
```json
{
  "question": "What is Newton's second law?",
  "session_id": "user-uuid-here"
}
```

**Response:**
```json
{
  "message": "Question received."
}
```

---

### GET `/stream_response`
Streams the AI-generated answer using Server-Sent Events (SSE).

**Query Parameters:**
| Parameter | Type | Description |
|---|---|---|
| `session_id` | `string` | Unique user session identifier |
| `question` | `string` | The physics question to answer |

**Response:** `text/event-stream` — token chunks streamed in real-time.

---

### DELETE `/delete_session/{session_id}`
Clears the chat history for the given session.

**Response:**
```json
{
  "message": "Session deleted successfully."
}
```

---

## 📁 Project Structure

```
physics-chatbot/
├── client/                         # Next.js 14 Frontend
│   ├── app/
│   │   ├── (root)/
│   │   │   ├── page.tsx            # Home / landing page
│   │   │   └── [id]/               # Dynamic chat session page
│   │   ├── components/
│   │   │   ├── Header.tsx          # App header with session controls
│   │   │   ├── About.tsx           # About section component
│   │   │   ├── CardMove.tsx        # Animated card component
│   │   │   └── ui/                 # Reusable UI primitives (button, etc.)
│   │   ├── assets/                 # Static images and assets
│   │   ├── globals.css             # Global styles
│   │   └── layout.tsx              # Root layout
│   ├── lib/                        # Utility functions
│   ├── next.config.mjs
│   ├── tailwind.config.ts
│   └── package.json
│
└── server/                         # FastAPI Backend
    ├── rag-5.5.py                  # Main RAG pipeline & API server
    ├── config.py                   # Path & secret key configuration
    ├── data_extraction/
    │   └── book.txt                # Physics knowledge base (source text)
    ├── vector/                     # Auto-generated FAISS index
    ├── all-mpnet-base-v2/          # Local HuggingFace embedding model
    ├── ColDB/                      # ColBERT index (optional)
    └── results/                    # Output/result storage
```

---

## 🧠 How the RAG Pipeline Works

### Step 1 — Knowledge Base Ingestion
The physics textbook (`book.txt`) is split into chunks of **900 characters** with **100-character overlap** using LangChain's `RecursiveCharacterTextSplitter`. Chunks are embedded using `all-mpnet-base-v2` and stored in a persistent **FAISS index**.

### Step 2 — Hybrid Retrieval
When a question arrives, **two retrievers** run in parallel:
- **FAISS retriever** — returns top-5 semantically similar chunks
- **Dense retriever (SentenceTransformer)** — returns top-3 chunks via cosine similarity

Results are combined (top 6 candidates) for reranking.

### Step 3 — CrossEncoder Reranking
The `ms-marco-MiniLM-L-6-v2` cross-encoder scores each candidate against the query. Only documents with a **relevance score > 0.5** are passed to the LLM as context.

### Step 4 — Prompt Routing
The system automatically classifies the question and selects the most appropriate prompt template:

| Question Type | Trigger Words | Prompt Style |
|---|---|---|
| **Reasoning** | why, explain, how does, analyze | Analytical, step-by-step |
| **Factual** | what, define, who, when, list | Concise, direct |
| **Math** | calculate, formula, solve, derive | Step-by-step math solution |
| **General** | (default fallback) | Balanced, comprehensive |

### Step 5 — History-Aware Generation
LangChain's `create_history_aware_retriever` reformulates the user's question using the session's full chat history, ensuring coherent multi-turn conversations.

### Step 6 — Streamed Response
The final answer is streamed token-by-token via SSE to the frontend, where it's rendered as Markdown with MathJax support.

---

## ⚙️ Configuration

Edit `server/config.py` to update key paths:

```python
class Config:
    SECRET_KEY         = 'your-secret-key'
    EMBEDDING_MODEL_PATH = r'\all-mpnet-base-v2'     # Local embedding model path
    FAISS_INDEX_PATH     = r'\vector\index.faiss'    # FAISS index storage
    TXT_SAVE_PATH        = r'\data_extraction\book.txt'  # Knowledge base text
```

---

## 🤝 Contributing

Contributions are welcome! To get started:

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature-name`
3. Commit your changes: `git commit -m 'feat: add your feature'`
4. Push to the branch: `git push origin feature/your-feature-name`
5. Open a Pull Request

---

## 📄 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgements

- [LangChain](https://www.langchain.com/) for RAG chain abstractions
- [Ollama](https://ollama.com/) for local LLM inference
- [HuggingFace](https://huggingface.co/) for embedding models and CrossEncoder
- [FAISS](https://github.com/facebookresearch/faiss) by Meta Research for vector search
- [Next.js](https://nextjs.org/) by Vercel

---

<div align="center">
  Made with ❤️ for Physics Education
</div>
