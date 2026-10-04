"""
store.py - tiny JSON-file persistence for history + the active session.

Keeps the project dependency-free (no database needed). Thread-safe enough
for a single-user local app.
"""

import json
import os
import threading
import time
import uuid

DATA_DIR = os.path.join(os.path.dirname(__file__), "data")
HISTORY_FILE = os.path.join(DATA_DIR, "history.json")
_lock = threading.Lock()

os.makedirs(DATA_DIR, exist_ok=True)


def _read() -> list[dict]:
    if not os.path.exists(HISTORY_FILE):
        return []
    try:
        with open(HISTORY_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except (json.JSONDecodeError, OSError):
        return []


def _write(items: list[dict]) -> None:
    tmp = HISTORY_FILE + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(items, f, indent=2, ensure_ascii=False)
    os.replace(tmp, HISTORY_FILE)


def add_item(kind: str, title: str, payload: dict) -> dict:
    """kind: resume | job | match | workflow"""
    item = {
        "id": uuid.uuid4().hex[:12],
        "kind": kind,
        "title": title,
        "created_at": int(time.time()),
        "payload": payload,
    }
    with _lock:
        items = _read()
        items.insert(0, item)
        _write(items[:100])  # cap history size
    return item


def list_items(kind: str | None = None) -> list[dict]:
    with _lock:
        items = _read()
    if kind:
        items = [i for i in items if i["kind"] == kind]
    return items


def get_item(item_id: str) -> dict | None:
    return next((i for i in list_items() if i["id"] == item_id), None)


def delete_item(item_id: str) -> bool:
    with _lock:
        items = _read()
        kept = [i for i in items if i["id"] != item_id]
        _write(kept)
        return len(kept) != len(items)


def clear_items() -> int:
    with _lock:
        n = len(_read())
        _write([])
        return n
