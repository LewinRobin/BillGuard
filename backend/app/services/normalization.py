from sentence_transformers import SentenceTransformer
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
import numpy as np

_model: SentenceTransformer | None = None

SIMILARITY_THRESHOLD = 0.75


def get_model() -> SentenceTransformer:
    global _model
    if _model is None:
        # all-MiniLM-L6-v2 is small (80MB) and fast — good for low-latency normalization
        _model = SentenceTransformer("all-MiniLM-L6-v2")
    return _model


def embed_text(text: str) -> list[float]:
    model = get_model()
    embedding = model.encode(text, normalize_embeddings=True)
    return embedding.tolist()


async def find_best_match(
    db: AsyncSession,
    extracted_text: str,
) -> tuple[str | None, str | None, str | None]:
    """
    Returns (service_id, canonical_name, category) or (None, None, None)
    if no match above threshold.
    """
    embedding = embed_text(extracted_text)
    embedding_str = "[" + ",".join(str(x) for x in embedding) + "]"

    result = await db.execute(
        text("""
            SELECT id, canonical_name, category,
                   1 - (embedding <=> CAST(:embedding AS vector)) AS similarity
            FROM services
            WHERE embedding IS NOT NULL
            ORDER BY embedding <=> CAST(:embedding AS vector)
            LIMIT 1
        """),
        {"embedding": embedding_str},
    )
    row = result.fetchone()

    if row and row.similarity >= SIMILARITY_THRESHOLD:
        return str(row.id), row.canonical_name, row.category

    return None, extracted_text, "other"
