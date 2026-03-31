"""研途有我 — FastAPI 应用入口"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from src.config import get_settings
from src.routers import notices, schools, search, stats

settings = get_settings()

app = FastAPI(
    title="研途有我 API",
    description="研途有我 — 一站式保研信息聚合平台后端 API",
    version="0.1.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
)

# CORS 中间件
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 注册路由（统一 /api 前缀）
app.include_router(notices.router, prefix="/api")
app.include_router(schools.router, prefix="/api")
app.include_router(search.router, prefix="/api")
app.include_router(stats.router, prefix="/api")


@app.get("/api/health")
async def health_check():
    """健康检查"""
    return {"status": "ok", "version": "0.1.0"}
