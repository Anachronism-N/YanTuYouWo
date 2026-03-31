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


class HttpClient:
    """异步 HTTP 客户端，内置频率控制和重试机制"""

    def __init__(self):
        self._client: Optional[httpx.AsyncClient] = None
        self._semaphore = asyncio.Semaphore(settings.CRAWL_CONCURRENCY)
        self._domain_last_request: dict[str, float] = {}  # 域名 → 上次请求时间

    async def _get_client(self) -> httpx.AsyncClient:
        """懒初始化 HTTP 客户端"""
        if self._client is None or self._client.is_closed:
            self._client = httpx.AsyncClient(
                timeout=httpx.Timeout(settings.CRAWL_TIMEOUT),
                follow_redirects=True,
                http2=True,
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
                async with self._semaphore:
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


# 全局 HTTP 客户端单例
http_client = HttpClient()
