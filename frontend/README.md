# Frontend - AI Job Copilot

Next.js (JavaScript only, no TypeScript) dashboard for the AI Job Copilot.

## Quick start

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:3000. Make sure the backend is running at
http://localhost:8000 (see `../backend/README.md`) - the dashboard's
status bar at the top will tell you if it can't reach it.

## Structure

```
app/
  page.js              -> main dashboard, holds shared state
  layout.js            -> root layout
  globals.css          -> all styling (plain CSS, no Tailwind build step needed)
  lib/api.js           -> fetch helper with friendly error messages
  components/
    StatusBar.js        -> backend/Ollama connectivity indicator
    ResumeUpload.js      -> PDF upload + structured resume analysis
    ResumeChat.js        -> manual-RAG chat about the resume
    JobAnalyzer.js        -> paste + analyze a job description
    MatchResult.js         -> resume vs job comparison
    WorkflowPanel.js        -> LangGraph-driven interview Qs + learning plan
    TagList.js               -> small reusable "chip" list renderer
```
