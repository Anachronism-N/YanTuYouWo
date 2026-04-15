"""研途有我 — FastAPI 应用入口"""

import time
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import JSONResponse

from src.config import get_settings
from src.database import engine
from src.models import Base
from src.routers import notices, schools, search, stats, tutors
from src.routers import auth, user, favorites
from src.routers import community, progress
from src.routers import ai
from src.routers import voice as voice_router
from src.routers import admin

APP_VERSION = "1.1.0"

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
logger = logging.getLogger("yantu")

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """应用生命周期：启动时自动创建新增的表"""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    logger.info(f"研途有我 API v{APP_VERSION} 启动完成")
    yield
    logger.info("研途有我 API 已关闭")


app = FastAPI(
    title="研途有我 API",
    description="研途有我 — 一站式保研信息聚合平台后端 API",
    version=APP_VERSION,
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
    lifespan=lifespan,
)

app.add_middleware(GZipMiddleware, minimum_size=500)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def security_and_timing_middleware(request: Request, call_next):
    """安全头 + 请求计时"""
    start = time.time()
    response = await call_next(request)
    ms = (time.time() - start) * 1000

    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"

    if ms > 1000:
        logger.warning(f"慢请求: {request.method} {request.url.path} → {ms:.0f}ms")
    return response


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """全局异常兜底：防止未处理异常泄露堆栈到前端"""
    logger.error(f"未处理异常: {request.method} {request.url.path} → {type(exc).__name__}: {exc}")
    return JSONResponse(status_code=500, content={"detail": "服务器内部错误，请稍后再试"})


# Phase 1: 信息查询
app.include_router(notices.router, prefix="/api")
app.include_router(schools.router, prefix="/api")
app.include_router(tutors.router, prefix="/api")
app.include_router(search.router, prefix="/api")
app.include_router(stats.router, prefix="/api")

# Phase 2: 用户系统
app.include_router(auth.router, prefix="/api")
app.include_router(user.router, prefix="/api")
app.include_router(favorites.router, prefix="/api")

# Phase 3: 社群 + 进度
app.include_router(community.router, prefix="/api")
app.include_router(progress.router, prefix="/api")

# Phase 4: AI 功能
app.include_router(ai.router, prefix="/api")

# 语音 (TTS/ASR)
app.include_router(voice_router.router, prefix="/api")

# 管理员
app.include_router(admin.router, prefix="/api")


@app.get("/api/health")
async def health_check():
    """健康检查"""
    return {"status": "ok", "version": APP_VERSION}
