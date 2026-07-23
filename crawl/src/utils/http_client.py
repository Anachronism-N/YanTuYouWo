from __future__ import annotations

"""HTTP 客户端封装 - 频率控制、重试、UA 轮换"""

import asyncio
import random
import re
from typing import Optional

import httpx
from loguru import logger

from src.config import settings
from src.utils.ua_pool import get_default_headers


def _http2_available() -> bool:
    """检测 h2 包是否已安装（httpx 启用 http2=True 的前置依赖）。"""
    try:
        import h2  # noqa: F401
        return True
    except ImportError:
        return False


class HttpClient:
    """异步 HTTP 客户端，内置频率控制和重试机制"""

    def __init__(self):
        self._client: Optional[httpx.AsyncClient] = None
        # 信号量延迟到首次使用时创建（绑定到实际运行的 event loop）。
        # 在模块导入时创建会绑定到导入期的 loop，与 asyncio.run() 的 loop 不符，
        # 并发下报 "Future attached to a different loop"。
        self._semaphore: Optional[asyncio.Semaphore] = None
        self._domain_last_request: dict[str, float] = {}  # 域名 → 上次请求时间
        # 预检测 HTTP/2 支持：未安装 h2 时优雅降级到 HTTP/1.1，
        # 否则 httpx 会在每个请求上抛 ImportError 导致全部失败。
        self._use_http2: bool = _http2_available()
        if not self._use_http2:
            logger.warning(
                "未安装 h2 包，HTTP 客户端降级为 HTTP/1.1。"
                "如需 HTTP/2，请执行: pip install 'httpx[http2]'"
            )

    def _get_semaphore(self) -> asyncio.Semaphore:
        """惰性创建信号量，绑定到当前运行的 event loop。"""
        if self._semaphore is None:
            self._semaphore = asyncio.Semaphore(settings.CRAWL_CONCURRENCY)
        return self._semaphore

    async def _get_client(self) -> httpx.AsyncClient:
        """懒初始化 HTTP 客户端"""
        if self._client is None or self._client.is_closed:
            self._client = httpx.AsyncClient(
                timeout=httpx.Timeout(settings.CRAWL_TIMEOUT),
                follow_redirects=True,
                http2=self._use_http2,
                limits=httpx.Limits(
                    max_connections=settings.CRAWL_CONCURRENCY * 2,
                    max_keepalive_connections=settings.CRAWL_CONCURRENCY,
                ),
            )
        return self._client

    async def _rate_limit(self, domain: str):
        """域名级别的频率控制"""
        now = asyncio.get_event_loop().time()
        last_time = self._domain_last_request.get(domain, 0)
        delay = random.uniform(settings.CRAWL_DELAY_MIN, settings.CRAWL_DELAY_MAX)
        wait_time = max(0, last_time + delay - now)

        if wait_time > 0:
            logger.debug(f"频率控制: {domain} 等待 {wait_time:.1f}s")
            await asyncio.sleep(wait_time)

        self._domain_last_request[domain] = asyncio.get_event_loop().time()

    async def fetch(
        self,
        url: str,
        *,
        method: str = "GET",
        headers: dict | None = None,
        retry: int | None = None,
        encoding: str | None = None,
        return_status: bool = False,
    ) -> str | None | tuple[str | None, int | None]:
        """
        发起 HTTP 请求，返回响应文本。

        Args:
            url: 请求 URL
            method: 请求方法
            headers: 自定义请求头（会与默认头合并）
            retry: 重试次数（默认使用配置值）
            encoding: 强制指定编码
            return_status: 是否同时返回状态码（返回 (text, status_code) 元组）

        Returns:
            响应文本，失败返回 None。如果 return_status=True，返回 (text, status_code) 元组。
        """
        from src.utils.url_utils import get_domain

        max_retries = retry if retry is not None else settings.CRAWL_RETRY_TIMES
        domain = get_domain(url)

        # 合并请求头
        req_headers = get_default_headers()
        if headers:
            req_headers.update(headers)

        for attempt in range(max_retries + 1):
            try:
                async with self._get_semaphore():
                    await self._rate_limit(domain)

                    client = await self._get_client()
                    response = await client.request(method, url, headers=req_headers)

                    if response.status_code == 200:
                        if encoding:
                            response.encoding = encoding
                        else:
                            # 自动检测编码：优先从HTML meta标签中提取charset
                            detected = self._detect_encoding(response)
                            if detected:
                                response.encoding = detected
                        text = response.text
                        logger.debug(f"请求成功: {url} ({len(text)} chars)")
                        if return_status:
                            return text, response.status_code
                        return text
                    elif response.status_code in (202, 412):
                        # 可能是反爬系统拦截（瑞数信息等）
                        # 返回内容以便上层进行反爬检测
                        logger.warning(f"疑似反爬拦截 {response.status_code}: {url}")
                        text = response.text if response.text else None
                        if return_status:
                            return text, response.status_code
                        return text
                    else:
                        logger.warning(f"请求返回 {response.status_code}: {url}")
                        if response.status_code == 404:
                            # 404 直接返回，不重试（页面不存在）
                            logger.debug(f"404 Not Found，跳过: {url}")
                            if return_status:
                                return None, response.status_code
                            return None
                        elif response.status_code in (403, 429, 503):
                            if attempt >= max_retries:
                                # 最后一次尝试，不再等待
                                break
                            # 被限制，增加等待时间
                            wait = (attempt + 1) * 5
                            logger.info(f"被限制，等待 {wait}s 后重试...")
                            await asyncio.sleep(wait)
                        elif response.status_code >= 500:
                            # 服务器错误，短暂等待后重试
                            await asyncio.sleep(2 * (attempt + 1))
                        else:
                            # 4xx 错误（非 403/429/412），不重试
                            if return_status:
                                return None, response.status_code
                            return None

            except httpx.TimeoutException:
                logger.warning(f"请求超时 (尝试 {attempt + 1}/{max_retries + 1}): {url}")
                await asyncio.sleep(2 * (attempt + 1))
            except httpx.HTTPError as e:
                error_str = str(e)
                logger.warning(f"HTTP 错误 (尝试 {attempt + 1}/{max_retries + 1}): {url} - {e}")
                # 服务器主动拒绝连接（TLS EOF / 连接被重置 / 拒绝）——非瞬时错误，
                # retry/SSL-skip/http-降级都无效。快速失败，省掉无效重试时间
                # （这些站多为 IP 封锁/地域限制，全量爬取时大量此类站点会拖垮耗时）。
                if re.search(r"connection has been closed|EOF|RemoteDisconnected|ConnectionReset|Connection refused|winrd 10054|errno 10054", error_str, re.I):
                    logger.debug(f"服务器拒绝连接，快速失败: {url}")
                    if return_status:
                        return None, None
                    return None
                # SSL 错误自动降级到 HTTP
                if "SSL" in error_str and url.startswith("https://"):
                    http_url = url.replace("https://", "http://", 1)
                    logger.info(f"SSL 错误，尝试降级到 HTTP: {http_url}")
                    try:
                        await self._rate_limit(domain)
                        client = await self._get_client()
                        response = await client.request(method, http_url, headers=req_headers)
                        if response.status_code == 200:
                            # SSL降级也需要检测编码
                            detected = self._detect_encoding(response)
                            if detected:
                                response.encoding = detected
                            text = response.text
                            logger.debug(f"HTTP 降级成功: {http_url} ({len(text)} chars)")
                            if return_status:
                                return text, response.status_code
                            return text
                    except Exception as e2:
                        logger.debug(f"HTTP 降级也失败: {http_url} - {e2}")

                    # HTTP降级也失败，尝试跳过SSL验证
                    logger.info(f"尝试跳过SSL验证: {url}")
                    try:
                        await self._rate_limit(domain)
                        async with httpx.AsyncClient(
                            timeout=httpx.Timeout(settings.CRAWL_TIMEOUT),
                            follow_redirects=True,
                            verify=False,
                        ) as insecure_client:
                            response = await insecure_client.request(method, url, headers=req_headers)
                            if response.status_code == 200:
                                detected = self._detect_encoding(response)
                                if detected:
                                    response.encoding = detected
                                text = response.text
                                logger.debug(f"跳过SSL验证成功: {url} ({len(text)} chars)")
                                if return_status:
                                    return text, response.status_code
                                return text
                    except Exception as e3:
                        logger.debug(f"跳过SSL验证也失败: {url} - {e3}")
                await asyncio.sleep(2 * (attempt + 1))
            except Exception as e:
                logger.error(f"未知错误: {url} - {e}")
                if return_status:
                    return None, None
                return None

        logger.error(f"请求失败（已重试 {max_retries} 次）: {url}")
        if return_status:
            return None, None
        return None

    @staticmethod
    def _detect_encoding(response: httpx.Response) -> str | None:
        """从HTML meta标签中检测编码（处理GB2312/GBK等非UTF-8页面）"""
        # 先检查Content-Type header
        content_type = response.headers.get("content-type", "")
        if "charset=" in content_type.lower():
            # header中已有charset，httpx会自动处理
            return None

        # 从HTML内容中检测charset（用原始字节）
        try:
            raw = response.content[:2048]  # 只检查前2KB
            # 匹配 <meta charset="xxx"> 或 <meta http-equiv="Content-Type" content="text/html; charset=xxx">
            match = re.search(
                rb'charset=["\']?([a-zA-Z0-9_-]+)',
                raw,
                re.IGNORECASE,
            )
            if match:
                charset = match.group(1).decode('ascii').lower()
                # 统一GB系列编码为gbk（gbk是gb2312的超集）
                if charset in ('gb2312', 'gb18030', 'gbk'):
                    return 'gbk'
                if charset != 'utf-8':
                    return charset
        except Exception:
            pass
        return None

    async def close(self):
        """关闭客户端"""
        if self._client and not self._client.is_closed:
            await self._client.aclose()
            self._client = None

    async def fetch_bytes(self, url: str, *, retry: int | None = None) -> Optional[bytes]:
        """下载二进制内容（PDF/图片附件等）。复用频率控制与重试，返回原始字节。

        失败返回 None（不抛异常）。专用于 PDF 附件等二进制抓取，避免触发文本解码。
        """
        from src.utils.url_utils import get_domain

        max_retries = retry if retry is not None else settings.CRAWL_RETRY_TIMES
        domain = get_domain(url)
        req_headers = get_default_headers()

        for attempt in range(max_retries + 1):
            try:
                async with self._get_semaphore():
                    await self._rate_limit(domain)
                    client = await self._get_client()
                    response = await client.request("GET", url, headers=req_headers)
                    if response.status_code == 200:
                        return response.content
                    if response.status_code == 404:
                        return None
                    if response.status_code in (403, 429, 503) and attempt < max_retries:
                        await asyncio.sleep((attempt + 1) * 5)
                        continue
                    if response.status_code >= 500 and attempt < max_retries:
                        await asyncio.sleep(2 * (attempt + 1))
                        continue
                    return None
            except httpx.HTTPError:
                if attempt < max_retries:
                    await asyncio.sleep(2 * (attempt + 1))
                else:
                    return None
            except Exception:
                return None
        return None


# 全局 HTTP 客户端单例
http_client = HttpClient()
