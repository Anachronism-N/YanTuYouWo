from __future__ import annotations

"""HTML 快照文件存储"""

import hashlib
from datetime import datetime
from pathlib import Path

from loguru import logger

from src.config import settings


def save_snapshot(html: str, url: str) -> str | None:
    """
    保存 HTML 快照到文件。

    快照仅作备份用途，**写盘失败不得影响通知入库**：任何异常都捕获后返回 None，
    由上层把 raw_html_path 置空（字段可空）。

    Args:
        html: HTML 内容
        url: 原始 URL

    Returns:
        保存的文件路径；失败返回 None
    """
    if not html:
        return None
    try:
        # 使用 URL 的 MD5 哈希作为文件名
        url_hash = hashlib.md5(url.encode("utf-8", errors="replace")).hexdigest()[:12]
        date_str = datetime.now().strftime("%Y%m%d")
        filename = f"{date_str}_{url_hash}.html"

        # 按日期分目录
        dir_path = Path(settings.HTML_SNAPSHOT_DIR) / date_str
        dir_path.mkdir(parents=True, exist_ok=True)

        file_path = dir_path / filename
        # errors="replace" 防止个别页面含 lone surrogate 等无法 utf-8 编码的字符而失败
        file_path.write_text(html, encoding="utf-8", errors="replace")

        logger.debug(f"HTML 快照已保存: {file_path}")
        return str(file_path)
    except Exception as e:
        logger.warning(f"HTML 快照保存失败（不影响入库）: {url} - {e}")
        return None


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
