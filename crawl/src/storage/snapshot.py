from __future__ import annotations

"""HTML 快照文件存储"""

import hashlib
from datetime import datetime
from pathlib import Path

from loguru import logger

from src.config import settings


def save_snapshot(html: str, url: str) -> str:
    """
    保存 HTML 快照到文件。

    Args:
        html: HTML 内容
        url: 原始 URL

    Returns:
        保存的文件路径
    """
    # 使用 URL 的 MD5 哈希作为文件名
    url_hash = hashlib.md5(url.encode()).hexdigest()[:12]
    date_str = datetime.now().strftime("%Y%m%d")
    filename = f"{date_str}_{url_hash}.html"

    # 按日期分目录
    dir_path = Path(settings.HTML_SNAPSHOT_DIR) / date_str
    dir_path.mkdir(parents=True, exist_ok=True)

    file_path = dir_path / filename
    file_path.write_text(html, encoding="utf-8")

    logger.debug(f"HTML 快照已保存: {file_path}")
    return str(file_path)


def load_snapshot(file_path: str) -> str | None:
    """
    加载 HTML 快照。

    Args:
        file_path: 文件路径

    Returns:
        HTML 内容，文件不存在返回 None
    """
    path = Path(file_path)
    if path.exists():
        return path.read_text(encoding="utf-8")
    return None
