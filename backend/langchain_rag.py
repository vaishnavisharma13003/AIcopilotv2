"""
langchain_rag.py - RAG IMPLEMENTED WITH LANGCHAIN

This does the SAME job as rag.py (manual RAG), but uses LangChain's
building blocks instead of writing everything by hand:

    HuggingFaceEmbeddings  -> replaces our manual SentenceTransformer calls
    RecursiveCharacterTextSplitter -> replaces our manual chunk_text()
    FAISS (langchain_community) -> replaces our manual faiss.IndexFlatL2 code
    ChatOllama -> replaces our manual ollama.Client().chat() calls
    retriever + LCEL chain -> replaces our manual retrieve + generate functions

Compare the two files side by side to see what a framework buys you.
"""

import os
import io
from pypdf import PdfReader

from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_community.vectorstores import FAISS
from langchain_ollama import ChatOllama
from langchain_core.documents import Document
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.runnables import RunnablePassthrough
from langchain_core.output_parsers import StrOutputParser

OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "llama3.2")
OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
EMBEDDING_MODEL_NAME = os.getenv("EMBEDDING_MODEL", "all-MiniLM-L6-v2")

# Loaded once and reused across requests
_embeddings = HuggingFaceEmbeddings(model_name=EMBEDDING_MODEL_NAME)
_llm = ChatOllama(model=OLLAMA_MODEL, base_url=OLLAMA_BASE_URL, temperature=0)

RAG_PROMPT = ChatPromptTemplate.from_template(
    """You are a helpful assistant answering questions about a resume.

ONLY use the CONTEXT below. Do NOT invent or guess information. If the
answer is not clearly present, respond EXACTLY with:
"I couldn't find that information in the resume."

CONTEXT:
{context}

QUESTION:
{question}

ANSWER:"""
)


class LangChainRAGStore:
    """Holds the LangChain FAISS vector store + retriever for one resume."""

    def __init__(self):
        self.vector_store: FAISS | None = None
        self.retriever = None

    def is_ready(self) -> bool:
        return self.vector_store is not None


langchain_rag_store = LangChainRAGStore()


def _extract_text_from_pdf(file_bytes: bytes) -> str:
    reader = PdfReader(io.BytesIO(file_bytes))
    text_parts = [page.extract_text() or "" for page in reader.pages]
    return "\n".join(text_parts).strip()


def build_langchain_index(file_bytes: bytes) -> int:
    """
    Extract text, split it with LangChain's text splitter, embed with
    HuggingFace embeddings, and store everything in a LangChain FAISS
    vector store. Returns the number of chunks created.
    """
    text = _extract_text_from_pdf(file_bytes)
    if not text:
        raise ValueError("No extractable text found in this PDF.")

    splitter = RecursiveCharacterTextSplitter(
        chunk_size=500,
        chunk_overlap=100,
    )
    chunks = splitter.split_text(text)
    if not chunks:
        raise ValueError("Resume text could not be split into chunks.")

    documents = [Document(page_content=chunk) for chunk in chunks]

    vector_store = FAISS.from_documents(documents, _embeddings)

    langchain_rag_store.vector_store = vector_store
    langchain_rag_store.retriever = vector_store.as_retriever(
        search_kwargs={"k": 3}
    )
    return len(chunks)


def _format_docs(docs) -> str:
    return "\n---\n".join(doc.page_content for doc in docs)


def answer_question_langchain(question: str) -> dict:
    """Run the LCEL RAG chain: retriever -> prompt -> llm -> string."""
    if not langchain_rag_store.is_ready():
        return {
            "question": question,
            "answer": "No resume has been uploaded yet. Please upload a resume first.",
            "context_used": [],
        }

    retriever = langchain_rag_store.retriever
    retrieved_docs = retriever.invoke(question)

    chain = (
        {
            "context": retriever | _format_docs,
            "question": RunnablePassthrough(),
        }
        | RAG_PROMPT
        | _llm
        | StrOutputParser()
    )

    try:
        answer = chain.invoke(question).strip()
    except Exception as e:
        raise RuntimeError(f"Ollama request failed: {e}")

    if not answer:
        answer = "I couldn't find that information in the resume."

    return {
        "question": question,
        "answer": answer,
        "context_used": [doc.page_content for doc in retrieved_docs],
    }
