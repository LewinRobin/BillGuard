from fastapi import APIRouter
from app.api.v1 import auth, bills, benchmarks, services

api_router = APIRouter(prefix="/api/v1")
api_router.include_router(auth.router)
api_router.include_router(bills.router)
api_router.include_router(benchmarks.router)
api_router.include_router(services.router)
