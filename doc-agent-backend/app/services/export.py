"""
export.py
---------
Export helpers that serialise an ExtractionResult (or its raw dict form)
into downstream-ready formats.

Supported formats
-----------------
  JSON  — clean, indented representation of classification + entity list
  CSV   — flat table with one row per extracted entity

Both functions accept either an ORM ExtractionResult instance **or** the raw
dict returned by run_inference() so they can be used in API routes and Celery
tasks without importing the DB model.
"""

from __future__ import annotations

import csv
import io
import json
from typing import Union


# ---------------------------------------------------------------------------
# Type alias for the source data
# ---------------------------------------------------------------------------

ExtractionData = Union[
    "app.models.result.ExtractionResult",  # ORM instance
    dict,                                   # raw run_inference() output
]


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _as_dict(source: ExtractionData) -> dict:
    """Normalise ORM instance or raw dict into a plain dict."""
    if isinstance(source, dict):
        return source

    # ORM ExtractionResult instance
    return {
        "id": str(source.id),
        "document_id": str(source.document_id),
        "classification": source.classification or {},
        "entities": source.entities or [],
        "processing_time_ms": source.processing_time_ms,
        "created_at": source.created_at.isoformat() if source.created_at else None,
    }


# ---------------------------------------------------------------------------
# Public export functions
# ---------------------------------------------------------------------------

def to_json(source: ExtractionData, indent: int = 2) -> str:
    """
    Serialise extraction results to a formatted JSON string.

    Example output::

        {
          "classification": {
            "class": "invoice",
            "confidence": 0.93,
            ...
          },
          "entities": [
            {"type": "date", "value": "2024-01-15", "confidence": 0.85},
            ...
          ],
          "processing_time_ms": 1240
        }
    """
    data = _as_dict(source)

    export = {
        "document_id": data.get("document_id"),
        "classification": data.get("classification", {}),
        "doc_type": data.get("doc_type") or data.get("classification", {}).get("class"),
        "confidence": data.get("confidence") or data.get("classification", {}).get("confidence"),
        "needs_review": data.get("needs_review", False),
        "entities": data.get("entities", []),
        "processing_time_ms": data.get("processing_time_ms"),
        "created_at": data.get("created_at"),
    }

    return json.dumps(export, indent=indent, ensure_ascii=False, default=str)


def to_csv(source: ExtractionData) -> str:
    """
    Flatten entities into a CSV table.

    Columns: document_id, entity_type, entity_value, confidence

    Returns the CSV as a UTF-8 string (including header row).
    """
    data = _as_dict(source)
    entities: list[dict] = data.get("entities", [])
    doc_id = data.get("document_id", "")

    buffer = io.StringIO()
    writer = csv.DictWriter(
        buffer,
        fieldnames=["document_id", "entity_type", "entity_value", "confidence"],
        extrasaction="ignore",
        lineterminator="\n",
    )
    writer.writeheader()

    for ent in entities:
        writer.writerow(
            {
                "document_id": doc_id,
                "entity_type": ent.get("type", ""),
                "entity_value": ent.get("value", ""),
                "confidence": ent.get("confidence", ""),
            }
        )

    return buffer.getvalue()


def to_sql_insert(source: ExtractionData, table: str = "extracted_fields") -> str:
    """
    Generate SQL INSERT statements for each entity, compatible with standard
    ERP / compliance databases.

    Each statement inserts one row: (document_id, entity_type, entity_value, confidence).
    """
    data = _as_dict(source)
    entities: list[dict] = data.get("entities", [])
    doc_id = data.get("document_id", "")

    lines: list[str] = []
    for ent in entities:
        e_type = ent.get("type", "").replace("'", "''")
        e_value = str(ent.get("value", "")).replace("'", "''")
        e_conf = ent.get("confidence", 0)
        lines.append(
            f"INSERT INTO {table} (document_id, entity_type, entity_value, confidence) "
            f"VALUES ('{doc_id}', '{e_type}', '{e_value}', {e_conf});"
        )

    return "\n".join(lines)
