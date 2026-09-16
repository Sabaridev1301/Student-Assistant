# AI-Powered Learning & Study Assistant

An **agentic AI** application that acts as a personal tutor and study planner —
built for the "AI Learning & Study Assistant" use case (RAG + Memory + Tools).

> Students juggle multiple subjects, scattered notes, and limited time. This
> assistant takes a goal ("prepare for my OS mid-sem in 5 days"), breaks it
> into sub-tasks, calls tools to extract topics / build a schedule / generate
> quizzes, and **re-plans automatically** based on how the student actually
> performs — instead of leaving all the planning to the student.

## Why this counts as "agentic"

Rather than one prompt → one answer, a central **planning agent**
(`backend/services/agent.js`) decomposes the goal and calls specialised tools
in sequence, then closes the loop:

```
Goal intake (exam, days, hours/day, uploaded notes)
        │
        ▼
 Summarizer tool  ── extracts topics + difficulty from raw notes
        │
        ▼
 Scheduler tool   ── builds a day-wise plan, weighted by difficulty
        │
        ▼
 Quiz Generator tool ── produces MCQ / short-answer questions per topic
        │
        ▼
 Student attempts quiz → agent grades it
        │
        ▼
 Mastery score updated ("Memory") ──► Scheduler tool re-invoked
        │                                  (re-plans remaining days,
        ▼                                   weaker topics get more time)
 RAG chat tool ── answers doubts, grounded only in the student's own notes
```

| Capability | Where it lives |
|---|---|
| **Tools** | `topicExtractor.js`, `scheduler.js`, `quizGenerator.js` — each is a self-contained tool the agent calls |
| **Memory** | `progress` + `plans` + `chats` collections persist across sessions (mastery scores, chat history, the active plan) |
| **RAG** | `ragRetriever.js` chunks uploaded notes and retrieves the passages most relevant to a question before answering |

## Tech stack

- **Backend:** Node.js + Express, REST API, lightweight JSON-file persistence (`lowdb`) — schema-shaped so it's a drop-in swap for MongoDB/Mongoose (see below)
- **Frontend:** React (Vite)
- **No external API key required to run.** Topic extraction, quiz generation, scheduling and RAG retrieval are all implemented as standalone algorithms. If you set `ANTHROPIC_API_KEY` on the backend, the chat tool will use it to compose more fluent answers — still constrained to the retrieved context, so it stays grounded.

## Project structure

```
ai-study-assistant/
├── backend/
│   ├── server.js              # Express app entry point
│   ├── routes/                # REST endpoints (materials, plan, quiz, progress, chat)
│   ├── services/
│   │   ├── agent.js           # the planning agent — orchestrates all tools
│   │   ├── topicExtractor.js  # Summarizer tool
│   │   ├── scheduler.js       # Scheduler tool (build + adaptive re-plan)
│   │   ├── quizGenerator.js   # Quiz Generator tool
│   │   ├── ragRetriever.js    # retrieval half of the RAG chat
│   │   └── db.js              # persistence layer ("Memory")
│   └── data/db.json           # created automatically on first run
└── frontend/
    └── src/
        ├── pages/              # Upload, Plan, Quiz, Dashboard, Chat
        └── api.js              # API client
```

## Running it locally

Requires Node.js 18+.

**1. Backend**
```bash
cd backend
npm install
npm start
# → AI Study Assistant backend running on http://localhost:5000
```

**2. Frontend** (in a second terminal)
```bash
cd frontend
npm install
npm run dev
# → http://localhost:5173
```

Open `http://localhost:5173`, then work through the tabs in order:
**Upload Material → Study Plan → Quiz → Dashboard → Ask a Doubt.**

Optional: to let the chat assistant use Claude for answer composition,
set an environment variable before starting the backend:
```bash
export ANTHROPIC_API_KEY=sk-ant-...
npm start
```

## API overview

| Method & path | Purpose |
|---|---|
| `POST /api/materials` | Upload notes (raw text or a `.txt`/`.pdf` file) |
| `POST /api/plan` | Goal intake — triggers topic extraction + schedule build |
| `GET /api/plan` | Fetch the active plan + extracted topics |
| `POST /api/quiz/generate` | Generate a quiz for a topic |
| `POST /api/quiz/submit` | Submit answers — grades, updates mastery, re-plans |
| `GET /api/progress` | Mastery dashboard data |
| `POST /api/chat` | Ask a question, grounded in uploaded material (RAG) |

## Swapping in MongoDB

`backend/services/db.js` is written with the same shapes a Mongoose model
would use (`materials`, `topics`, `plans`, `quizzes`, `progress`, `chats`).
To move from the JSON-file store to MongoDB: replace the `lowdb` adapter with
`mongoose.connect(process.env.MONGODB_URI)` and define a schema per
collection — the rest of the codebase (routes, agent, tools) doesn't need to
change, since it only calls `db.get('<collection>')`.

## Key features

- Automatic topic extraction from uploaded notes/PDFs
- Adaptive day-wise study planner that re-adjusts after every quiz
- Auto-generated quizzes (MCQ + short-answer) per topic
- Progress dashboard: mastery %, weak topics, attempts
- Context-aware Q&A chatbot grounded in the student's own material (RAG)

## Future enhancements

- Multi-modal input (handwritten notes via OCR, lecture audio transcription)
- Collaborative study groups with shared revision plans
- Academic-calendar integration to auto-sync exam dates
- Voice-based doubt clearing
- Peer-benchmark analytics (opt-in, anonymized)

## Author

**Sabareeshwaran D** — B.E. Computer Science and Engineering, Government College of
Engineering, Bodinayakanur (Anna University), 2026–2027.
