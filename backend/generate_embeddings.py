import asyncio
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy import select
from sentence_transformers import SentenceTransformer
from app.models.service import Service
from app.core.config import settings

model = SentenceTransformer("all-MiniLM-L6-v2")


async def main():
    engine = create_async_engine(settings.DATABASE_URL)
    session_local = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with session_local() as db:
        result = await db.execute(select(Service).where(Service.embedding.is_(None)))
        services = result.scalars().all()
        print(f"Generating embeddings for {len(services)} services...")

        for i, svc in enumerate(services):
            emb = model.encode(svc.canonical_name, normalize_embeddings=True)
            svc.embedding = emb.tolist()
            if (i + 1) % 200 == 0:
                print(f"  {i+1}/{len(services)}")
                await db.flush()

        await db.commit()
        print(f"Done! Embedded {len(services)} services")

    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(main())
