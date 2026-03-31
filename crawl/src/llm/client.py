from __future__ import annotations

"""SiliconFlow LLM 客户端封装"""

import asyncio
import json
import re
from typing import Any

from openai import AsyncOpenAI
from loguru import logger

from src.config import settings
from src.llm.prompts import CLASSIFY_PROMPT, EXTRACT_PROMPT, ANALYZE_PAGE_PROMPT, PARSE_LIST_PROMPT


class LLMClient:
    """SiliconFlow LLM 客户端"""

    def __init__(self):
        self.client = AsyncOpenAI(
            api_key=settings.SILICONFLOW_API_KEY,
            base_url=settings.SILICONFLOW_BASE_URL,
        )

    async def _call(self, task_type: str, prompt: str, max_retries: int = 3) -> str:
        """
        调用 LLM API，内置重试机制。

        Args:
            task_type: 任务类型（classify/extract/analyze），决定使用哪个模型
            prompt: 完整的 prompt 文本
            max_retries: 最大重试次数

        Returns:
            LLM 响应文本
        """
        model_config = settings.llm_models.get(task_type, settings.llm_models["extract"])

        for attempt in range(max_retries):
            try:
                response = await asyncio.wait_for(
                    self.client.chat.completions.create(
                        model=model_config["model"],
                        messages=[{"role": "user", "content": prompt}],
                        max_tokens=model_config["max_tokens"],
                        temperature=model_config["temperature"],
                    ),
                    timeout=30.0,  # 30秒超时（分类任务不需要太长）
                )
                result = response.choices[0].message.content.strip()
                logger.debug(f"LLM [{task_type}] 响应: {result[:200]}...")
                return result
            except asyncio.TimeoutError:
                logger.warning(f"LLM 调用超时 [{task_type}] (尝试 {attempt + 1}/{max_retries})")
                if attempt < max_retries - 1:
                    await asyncio.sleep(min(2 ** attempt, 5))  # 最多等待5秒
            except Exception as e:
                logger.warning(f"LLM 调用失败 [{task_type}] (尝试 {attempt + 1}/{max_retries}): {e}")
                if attempt < max_retries - 1:
                    await asyncio.sleep(2 ** attempt)

        logger.error(f"LLM 调用最终失败 [{task_type}]，已重试 {max_retries} 次")
        raise RuntimeError(f"LLM 调用失败: {task_type}")

    def _parse_json_response(self, result: str) -> Any:
        """
        从 LLM 响应中解析 JSON，支持多种格式容错。

        支持：
        - 纯 JSON 文本
        - ```json ... ``` 代码块包裹
        - ``` ... ``` 代码块包裹
        - 文本中嵌入的 JSON 块（提取第一个 { 到最后一个 } 之间的内容）
        """
        # 1. 直接尝试解析
        try:
            return json.loads(result)
        except json.JSONDecodeError:
            pass

        # 2. 处理 markdown 代码块
        if "```" in result:
            # 匹配 ```json ... ``` 或 ``` ... ```
            code_block_match = re.search(r"```(?:json)?\s*\n?(.*?)\n?\s*```", result, re.DOTALL)
            if code_block_match:
                try:
                    return json.loads(code_block_match.group(1).strip())
                except json.JSONDecodeError:
                    pass

        # 3. 提取嵌入的 JSON 对象 {...}
        brace_match = re.search(r"\{.*\}", result, re.DOTALL)
        if brace_match:
            try:
                return json.loads(brace_match.group(0))
            except json.JSONDecodeError:
                pass

        # 4. 提取嵌入的 JSON 数组 [...]
        bracket_match = re.search(r"\[.*\]", result, re.DOTALL)
        if bracket_match:
            try:
                return json.loads(bracket_match.group(0))
            except json.JSONDecodeError:
                pass

        logger.warning(f"JSON 解析失败，原始响应: {result[:500]}")
        return None

    async def classify(self, title: str, content: str) -> bool:
        """
        通知分类：判断是否与推免相关。

        Args:
            title: 通知标题
            content: 通知正文（前500字）

        Returns:
            True 表示相关，False 表示不相关
        """
        try:
            prompt = CLASSIFY_PROMPT.format(title=title, content=content[:500])
            result = await self._call("classify", prompt)
            result_stripped = result.strip()
            # 严格判断：只有明确回答"相关"（且不包含"不相关"）才认为相关
            if "不相关" in result_stripped:
                return False
            if "相关" in result_stripped:
                return True
            # 无法判断时保守处理：认为不相关（减少误入库）
            logger.warning(f"LLM 分类结果不明确: '{result_stripped}' | {title}")
            return False
        except Exception as e:
            logger.error(f"LLM 分类异常: {e}")
            # 分类失败时保守处理：认为不相关（避免垃圾数据入库）
            return False

    async def extract(self, content: str) -> dict[str, Any]:
        """
        从通知正文中提取结构化信息。

        Args:
            content: 通知正文

        Returns:
            结构化信息字典
        """
        try:
            # 限制正文长度，避免超出 token 限制
            truncated = content[:5000] if len(content) > 5000 else content
            prompt = EXTRACT_PROMPT.format(content=truncated)
            result = await self._call("extract", prompt)
            parsed = self._parse_json_response(result)
            if isinstance(parsed, dict):
                return parsed
            logger.warning(f"LLM 提取结果非字典类型: {type(parsed)}")
            return {}
        except Exception as e:
            logger.error(f"LLM 提取异常: {e}")
            return {}

    async def analyze_page(self, html: str, context: str) -> list[dict[str, str]]:
        """
        分析页面结构，定位通知列表页。

        Args:
            html: 精简后的 HTML 内容
            context: 上下文信息（如学院名称）

        Returns:
            候选 URL 列表 [{"url": "...", "type": "..."}]
        """
        try:
            prompt = ANALYZE_PAGE_PROMPT.format(html=html[:3000], context=context)
            result = await self._call("analyze", prompt)
            parsed = self._parse_json_response(result)
            if isinstance(parsed, list):
                return parsed
            return []
        except Exception as e:
            logger.error(f"LLM 页面分析异常: {e}")
            return []

    async def parse_notice_list(self, html: str, url: str) -> list[dict[str, str]]:
        """
        使用 LLM 解析通知列表页。

        Args:
            html: 精简后的 HTML 内容
            url: 页面 URL

        Returns:
            通知条目列表 [{"title": "...", "url": "...", "date": "..."}]
        """
        try:
            prompt = PARSE_LIST_PROMPT.format(html=html[:3000], url=url)
            result = await self._call("analyze", prompt)
            parsed = self._parse_json_response(result)
            if isinstance(parsed, list):
                return parsed
            return []
        except Exception as e:
            logger.error(f"LLM 列表解析异常: {e}")
            return []


# 全局 LLM 客户端单例
llm_client = LLMClient()
