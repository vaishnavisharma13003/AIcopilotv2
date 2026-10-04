"""
rag.py - MANUAL RAG IMPLEMENTATION (no LangChain here)

This file shows you what RAG actually does "under the hood", step by step,
without any framework hiding the details. Compare this to langchain_rag.py
which does the same job using LangChain's building blocks.

Pipeline:
    PDF -> extract text -> chunk text -> embed chunks -> store in FAISS
    -> (question) -> embed question -> search FAISS -> retrieved context
    -> send context + question to Ollama -> answer
"""

import os
import numpy as np
import faiss
from sentence_transformers import SentenceTransformer
from pypdf import PdfReader
import ollama

OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "llama3.2")
OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
EMBEDDING_MODEL_NAME = os.getenv("EMBEDDING_MODEL", "all-MiniLM-L6-v2")

_client = ollama.Client(host=OLLAMA_BASE_URL)

# Step 3 (loaded once, reused for every embedding call)
_embedding_model = SentenceTransformer(EMBEDDING_MODEL_NAME)


class ManualRAGStore:
    """
    Holds the FAISS index + the original text chunks for ONE uploaded resume.
    In a real product you'd have one of these per user/session; here we keep
    it simple with a single in-memory store (fine for a local demo app).
    """

    def __init__(self):
        self.index = None          # FAISS index object
        self.chunks = []           # list[str] - original text of each chunk
        self.dimension = None

    def is_ready(self) -> bool:
        return self.index is not None and len(self.chunks) > 0


# Single global store used by the manual RAG endpoints in main.py
manual_rag_store = ManualRAGStore()


def extract_text_from_pdf(file_bytes: bytes) -> str:
    """Step 1: Extract raw text from an uploaded PDF's bytes."""
    reader = PdfReader.__new__(PdfReader)  # placeholder to keep linters calm
    import io
    reader = PdfReader(io.BytesIO(file_bytes))

    text_parts = []
    for page in reader.pages:
        page_text = page.extract_text() or ""
        text_parts.append(page_text)

    full_text = "\n".join(text_parts).strip()
    return full_text


def chunk_text(text: str, chunk_size: int = 500, overlap: int = 100) -> list[str]:
    """
    Step 2: Split text into overlapping chunks.

    We chunk by characters (simple & beginner-friendly). Overlap helps make
    sure we don't cut a sentence in half and lose meaning at chunk borders.
    """
    if not text:
        return []

    chunks = []
    start = 0
    text_length = len(text)

    while start < text_length:
        end = start + chunk_size
        chunk = text[start:end].strip()
        if chunk:
            chunks.append(chunk)
        start += chunk_size - overlap  # move forward, but overlap a bit

    return chunks


def embed_texts(texts: list[str]) -> np.ndarray:
    """Step 3: Convert a list of text chunks into embedding vectors."""
    embeddings = _embedding_model.encode(texts, convert_to_numpy=True)
    return embeddings.astype("float32")


def build_faiss_index(chunks: list[str]) -> ManualRAGStore:
    """Step 4: Build a FAISS index from resume chunks and store it globally."""
    if not chunks:
        raise ValueError("No text chunks to index - resume text may be empty.")

    embeddings = embed_texts(chunks)
    dimension = embeddings.shape[1]

    # IndexFlatL2 = simple, exact nearest-neighbour search (great for small demos)
    index = faiss.IndexFlatL2(dimension)
    index.add(embeddings)

    manual_rag_store.index = index
    manual_rag_store.chunks = chunks
    manual_rag_store.dimension = dimension
    return manual_rag_store


def retrieve_relevant_chunks(question: str, top_k: int = 3) -> list[str]:
    """Step 5: Embed the question and search FAISS for the closest chunks."""
    if not manual_rag_store.is_ready():
        return []

    question_embedding = embed_texts([question])
    distances, indices = manual_rag_store.index.search(question_embedding, top_k)

    retrieved = []
    for idx in indices[0]:
        if 0 <= idx < len(manual_rag_store.chunks):
            retrieved.append(manual_rag_store.chunks[idx])
    return retrieved


def generate_answer_from_context(question: str, context_chunks: list[str]) -> str:
    """Step 6: Send the retrieved context + question to Llama 3.2 via Ollama."""
    if not context_chunks:
        return "I couldn't find that information in the resume."

    context_text = "\n---\n".join(context_chunks)

    prompt = f"""You are a helpful assistant answering questions about a resume.

ONLY use the CONTEXT below to answer. Do NOT invent, guess, or use outside
knowledge. If the answer is not clearly present in the context, respond
EXACTLY with: "I couldn't find that information in the resume."

CONTEXT:
{context_text}

QUESTION:
{question}

ANSWER:"""

    try:
        response = _client.chat(
            model=OLLAMA_MODEL,
            messages=[{"role": "user", "content": prompt}],
        )
        answer = response["message"]["content"].strip()
        return answer if answer else "I couldn't find that information in the resume."
    except Exception as e:
        raise RuntimeError(f"Ollama request failed: {e}")


def answer_resume_question(question: str, top_k: int = 3) -> dict:
    """Convenience wrapper used by the /resume-chat endpoint."""
    if not manual_rag_store.is_ready():
        return {
            "question": question,
            "answer": "No resume has been uploaded yet. Please upload a resume first.",
            "context_used": [],
        }

    retrieved_chunks = retrieve_relevant_chunks(question, top_k=top_k)
    answer = generate_answer_from_context(question, retrieved_chunks)

    return {
        "question": question,
        "answer": answer,
        "context_used": retrieved_chunks,
    }
