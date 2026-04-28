"""
OpenAlex 数据补充器 — 阶段 C 核心模块（深度版）

OpenAlex API: https://docs.openalex.org/api-entities/authors

策略：
  1. 中文姓名 → 拼音化
  2. 多变体搜索 → 候选作者列表
  3. 三阶段消歧（机构 → works → 名字相似度）
  4. 选定作者 → 拉取：
     - 学术指标（h-index / i10-index / cited_by_count / works_count）
     - 完整论文列表（最多 50 篇，按被引数 + 年份排序）
     - 主要合作者（聚合 works.authorships）
     - 研究主题（x_concepts，AMiner 风格）
     - 年度趋势（counts_by_year）
"""

from __future__ import annotations

import asyncio
import re
from collections import Counter
from typing import Any

import httpx
from loguru import logger

try:
    from pypinyin import lazy_pinyin
except ImportError:
    logger.warning("pypinyin 未安装，将使用原始中文名搜索（命中率低）")

    def lazy_pinyin(text):  # type: ignore
        return [text]


# ============================================================
# 中英文学校名映射（39 所 985）
# ============================================================

UNIVERSITY_EN_MAP: dict[str, list[str]] = {
    "北京大学": ["Peking University", "Beijing University"],
    "清华大学": ["Tsinghua University"],
    "复旦大学": ["Fudan University"],
    "上海交通大学": ["Shanghai Jiao Tong University"],
    "浙江大学": ["Zhejiang University"],
    "南京大学": ["Nanjing University"],
    "中国科学技术大学": ["University of Science and Technology of China", "USTC"],
    "中国人民大学": ["Renmin University of China", "Renmin University"],
    "北京航空航天大学": ["Beihang University", "Beijing University of Aeronautics"],
    "北京理工大学": ["Beijing Institute of Technology"],
    "北京师范大学": ["Beijing Normal University"],
    "中央民族大学": ["Minzu University of China"],
    "南开大学": ["Nankai University"],
    "天津大学": ["Tianjin University"],
    "大连理工大学": ["Dalian University of Technology"],
    "东北大学": ["Northeastern University"],
    "吉林大学": ["Jilin University"],
    "哈尔滨工业大学": ["Harbin Institute of Technology"],
    "同济大学": ["Tongji University"],
    "华东师范大学": ["East China Normal University"],
    "厦门大学": ["Xiamen University"],
    "山东大学": ["Shandong University"],
    "中国海洋大学": ["Ocean University of China"],
    "武汉大学": ["Wuhan University"],
    "华中科技大学": ["Huazhong University of Science and Technology"],
    "湖南大学": ["Hunan University"],
    "中南大学": ["Central South University"],
    "中山大学": ["Sun Yat-sen University", "Sun Yat Sen University"],
    "华南理工大学": ["South China University of Technology"],
    "四川大学": ["Sichuan University"],
    "重庆大学": ["Chongqing University"],
    "电子科技大学": ["University of Electronic Science and Technology of China"],
    "西安交通大学": ["Xi'an Jiaotong University", "Xi an Jiaotong University"],
    "西北工业大学": ["Northwestern Polytechnical University"],
    "兰州大学": ["Lanzhou University"],
    "国防科技大学": ["National University of Defense Technology"],
    "西北农林科技大学": ["Northwest A&F University"],
    "东南大学": ["Southeast University"],
    "中国农业大学": ["China Agricultural University"],
}


def _english_university(chinese_name: str) -> list[str]:
    if chinese_name in UNIVERSITY_EN_MAP:
        return UNIVERSITY_EN_MAP[chinese_name]
    return [chinese_name]


def _to_pinyin_name(chinese_name: str) -> list[str]:
    """中文姓名 → 多种拼写候选"""
    if not chinese_name:
        return []
    parts = lazy_pinyin(chinese_name)
    if not parts:
        return [chinese_name]
    surname = parts[0].capitalize()
    given = "".join(p.capitalize() for p in parts[1:])
    given_spaced = " ".join(p.capitalize() for p in parts[1:])

    candidates = []
    if given:
        candidates.append(f"{given} {surname}")          # 西式 (名 姓)
        candidates.append(f"{surname} {given}")          # 中式 (姓名连写)
        if given_spaced != given:
            candidates.append(f"{surname} {given_spaced}")
    else:
        candidates.append(surname)
    return candidates


# ============================================================
# 名字相似度
# ============================================================

def _normalize_name(name: str) -> str:
    return re.sub(r"[\s\-\.,_]+", "", name).lower()


def _name_similarity(a: str, b: str) -> float:
    na = _normalize_name(a)
    nb = _normalize_name(b)
    if not na or not nb:
        return 0
    if na == nb:
        return 1.0
    sa, sb = set(na), set(nb)
    return len(sa & sb) / max(len(sa | sb), 1)


# ============================================================
# OpenAlex API 客户端
# ============================================================

OPENALEX_BASE = "https://api.openalex.org"
DEFAULT_MAILTO = "yantu@example.com"


class OpenAlexClient:
    """OpenAlex API 客户端（含限流和错误处理）"""

    def __init__(self, mailto: str = DEFAULT_MAILTO, timeout: float = 20.0):
        self.mailto = mailto
        self.timeout = timeout
        self._client: httpx.AsyncClient | None = None
        self._last_request_time: float = 0
        self._min_interval: float = 0.2  # 200ms / req（更保守，避免 429）
        self._lock = asyncio.Lock()

    async def _get(self) -> httpx.AsyncClient:
        if self._client is None or self._client.is_closed:
            self._client = httpx.AsyncClient(
                timeout=self.timeout,
                follow_redirects=True,
                headers={"User-Agent": f"yantu/1.0 (mailto:{self.mailto})"},
            )
        return self._client

    async def _rate_limit(self):
        async with self._lock:
            now = asyncio.get_event_loop().time()
            elapsed = now - self._last_request_time
            if elapsed < self._min_interval:
                await asyncio.sleep(self._min_interval - elapsed)
            self._last_request_time = asyncio.get_event_loop().time()

    async def _request_with_retry(
        self,
        url: str,
        params: dict,
        *,
        max_retries: int = 3,
    ) -> dict | None:
        """GET 请求 + 429 退避重试"""
        client = await self._get()
        for attempt in range(max_retries):
            await self._rate_limit()
            try:
                r = await client.get(url, params=params)
                if r.status_code == 429:
                    # 限流：指数退避（2/4/8 秒）
                    wait = 2 ** (attempt + 1)
                    logger.debug(f"OpenAlex 429 限流，等待 {wait}s 重试 ({attempt+1}/{max_retries})")
                    await asyncio.sleep(wait)
                    continue
                r.raise_for_status()
                return r.json()
            except httpx.HTTPStatusError as e:
                if attempt == max_retries - 1:
                    logger.debug(f"OpenAlex 失败（最终）{url}: {e}")
                else:
                    await asyncio.sleep(1)
            except Exception as e:
                if attempt == max_retries - 1:
                    logger.debug(f"OpenAlex 异常 {url}: {e}")
                else:
                    await asyncio.sleep(1)
        return None

    async def search_authors(self, query: str, *, per_page: int = 10) -> list[dict]:
        data = await self._request_with_retry(
            f"{OPENALEX_BASE}/authors",
            {"search": query, "per-page": per_page, "mailto": self.mailto},
        )
        return (data or {}).get("results", [])

    async def get_author_works(
        self,
        author_id: str,
        *,
        per_page: int = 50,
        sort: str = "cited_by_count:desc",
    ) -> list[dict]:
        """获取作者的论文列表（默认按被引数倒序，最多 50 篇）"""
        data = await self._request_with_retry(
            f"{OPENALEX_BASE}/works",
            {
                "filter": f"author.id:{author_id}",
                "sort": sort,
                "per-page": per_page,
                "mailto": self.mailto,
            },
        )
        return (data or {}).get("results", [])

    async def close(self):
        if self._client and not self._client.is_closed:
            await self._client.aclose()


# ============================================================
# 消歧
# ============================================================

def _disambiguate(
    candidates: list[dict],
    target_name: str,
    target_university_en_list: list[str],
    *,
    target_pinyin_candidates: list[str] | None = None,
) -> tuple[dict | None, str]:
    """
    三阶段消歧：
      1. 机构匹配 + 名字相似度（同校 + 名字接近 → 高分）
      2. 仅名字高度相似（无机构信息）
      3. 严格回退：候选数极少 + 名字相似度 ≥ 0.5

    重要：必须避免同一 OpenAlex 作者被多个 tutor 错配。
    """
    if not candidates:
        return None, "no_candidate"

    target_uni_norm = [_normalize_name(u) for u in target_university_en_list]
    py_norms = [_normalize_name(p) for p in (target_pinyin_candidates or [])]

    def _author_name_match(author: dict) -> float:
        """对作者所有名字变体做相似度比较，取最高"""
        names = [author.get("display_name", "")]
        names += author.get("display_name_alternatives") or []
        max_sim = 0.0
        for n in names:
            n_norm = _normalize_name(n)
            for py in py_norms or [_normalize_name(target_name)]:
                if not n_norm or not py:
                    continue
                if n_norm == py:
                    return 1.0
                sim = _name_similarity(n, py)
                if sim > max_sim:
                    max_sim = sim
        return max_sim

    matched: list[tuple[dict, float, int]] = []  # (author, total_score, inst_match)

    for a in candidates:
        affs = a.get("affiliations") or []
        inst_match = 0
        for aff in affs[:5]:
            inst_name = (aff.get("institution") or {}).get("display_name", "")
            inst_norm = _normalize_name(inst_name)
            for uni_norm in target_uni_norm:
                if uni_norm and (uni_norm in inst_norm or inst_norm in uni_norm):
                    inst_match += 1
                    break

        name_sim = _author_name_match(a)
        works = a.get("works_count", 0)
        # 综合评分：机构匹配 + 名字相似度（核心） + works
        total = inst_match * 50 + name_sim * 100 + min(works, 200) * 0.05
        matched.append((a, total, inst_match))

    matched.sort(key=lambda x: x[1], reverse=True)
    best, best_score, best_inst = matched[0]
    best_name_sim = _author_name_match(best)

    # 阶段 1：机构匹配 + 名字相似度 >= 0.4 （最高质量）
    if best_inst > 0 and best_name_sim >= 0.4:
        return best, "matched_institution"

    # 阶段 2：名字相似度 >= 0.6（无机构匹配但名字非常像）
    if best_name_sim >= 0.6 and best.get("works_count", 0) >= 20:
        return best, "matched_name"

    # 阶段 3：严格回退（候选少 + 名字相似度足够）
    if len(candidates) <= 2 and best_name_sim >= 0.5 and best.get("works_count", 0) >= 30:
        return best, "fallback_few_candidates"

    return None, "no_match"


# ============================================================
# Abstract 还原（OpenAlex inverted index）
# ============================================================

def _restore_abstract(inverted_idx: dict[str, list[int]] | None) -> str | None:
    """OpenAlex `abstract_inverted_index` 是 token → positions 的字典，需要还原成文本"""
    if not inverted_idx:
        return None
    try:
        positions: dict[int, str] = {}
        for word, idxs in inverted_idx.items():
            for i in idxs:
                positions[i] = word
        if not positions:
            return None
        sorted_words = [positions[i] for i in sorted(positions.keys())]
        text = " ".join(sorted_words)
        return text[:1500]  # 限长
    except Exception:
        return None


# ============================================================
# 数据聚合
# ============================================================

def _summarize_works(works: list[dict], target_author_id: str) -> dict:
    """从 works 列表中聚合论文 / 合作者 / 年度统计"""
    papers: list[dict] = []
    coauthor_counter: Counter = Counter()
    coauthor_meta: dict[str, dict] = {}
    yearly: dict[int, dict] = {}

    for w in works:
        # ─── 论文条目 ───
        title = w.get("title") or w.get("display_name") or ""
        primary = w.get("primary_location") or {}
        # venue 提取：source.display_name → raw_source_name → host_venue.display_name
        venue = None
        if isinstance(primary, dict):
            source = primary.get("source")
            if isinstance(source, dict):
                venue = source.get("display_name")
            if not venue:
                venue = primary.get("raw_source_name")
        if not venue:
            host = w.get("host_venue") or {}
            if isinstance(host, dict):
                venue = host.get("display_name")
        year = w.get("publication_year")
        cited = w.get("cited_by_count") or 0
        doi = w.get("doi")
        url = primary.get("landing_page_url") if isinstance(primary, dict) else None
        # type 信息（journal-article / proceedings-article 等）
        work_type = w.get("type") or (primary.get("raw_type") if isinstance(primary, dict) else None)

        # 作者列表（前 4 人 + et al）
        authors_list = []
        for a in (w.get("authorships") or [])[:4]:
            au = (a.get("author") or {}).get("display_name")
            if au:
                authors_list.append(au)
        if len(w.get("authorships") or []) > 4:
            authors_list.append("et al.")
        authors = ", ".join(authors_list)

        # 摘要（OpenAlex 用 inverted index 存）
        abstract = _restore_abstract(w.get("abstract_inverted_index"))

        if title:
            papers.append({
                "title": title.strip()[:300],
                "venue": venue,
                "year": year,
                "authors": authors or None,
                "citations": cited,
                "abstract": abstract,
                "doi": doi,
                "url": url,
                "type": work_type,
            })

        # ─── 合作者聚合 ───
        for a in (w.get("authorships") or []):
            author_obj = a.get("author") or {}
            author_id = author_obj.get("id")
            if not author_id or author_id == target_author_id:
                continue
            name = author_obj.get("display_name", "")
            if not name:
                continue
            coauthor_counter[author_id] += 1
            if author_id not in coauthor_meta:
                coauthor_meta[author_id] = {
                    "name": name,
                    "openalex_id": author_id.rsplit("/", 1)[-1] if author_id else None,
                    "works_together_count": 0,
                    "last_year": year,
                }
            coauthor_meta[author_id]["works_together_count"] = coauthor_counter[author_id]
            if year and (coauthor_meta[author_id].get("last_year") or 0) < year:
                coauthor_meta[author_id]["last_year"] = year

        # ─── 年度统计 ───
        if year:
            if year not in yearly:
                yearly[year] = {"year": year, "works_count": 0, "cited_by_count": 0}
            yearly[year]["works_count"] += 1
            yearly[year]["cited_by_count"] += cited

    # 合作者按合作次数排序，取前 20
    coauthors_sorted = sorted(
        coauthor_meta.values(),
        key=lambda x: x["works_together_count"],
        reverse=True,
    )[:20]

    # 年度统计按年份倒序
    yearly_sorted = sorted(yearly.values(), key=lambda x: x["year"], reverse=True)

    return {
        "papers": papers,
        "coauthors": coauthors_sorted,
        "yearly_stats": yearly_sorted,
    }


def _extract_topics(author: dict) -> list[dict]:
    """从 OpenAlex 提取研究主题。

    OpenAlex 提供两个字段：
      - `topics`：具体研究领域（如 "Video Coding and Compression"），含 `count`（论文数）
      - `x_concepts`：广义概念（如 "Computer science"），含 `score` (0-1)

    我们优先用 `topics`，更精确且带论文计数；fallback 到 `x_concepts`。
    """
    result: list[dict] = []

    # 优先：specific topics
    for t in (author.get("topics") or [])[:10]:
        name = t.get("display_name")
        count = t.get("count")
        if not name:
            continue
        subfield = t.get("subfield") or {}
        result.append({
            "name": name,
            "kind": "topic",
            "works_count": count or 0,
            "subfield": subfield.get("display_name"),
        })

    # 补充：broader x_concepts (level >= 1 即可，避免重复 Computer Science 之类的根)
    for c in (author.get("x_concepts") or [])[:8]:
        name = c.get("display_name")
        level = c.get("level", 0)
        score = c.get("score")
        if not name or score is None:
            continue
        # score 在 0-1 之间；过滤低分
        if score < 0.05:
            continue
        # 跳过过于泛化的 level 0 主题（"Computer science", "Mathematics" 等）
        if level == 0 and len(result) > 5:
            continue
        result.append({
            "name": name,
            "kind": "concept",
            "level": level,
            "score": round(score, 3),
        })

    return result[:15]


# ============================================================
# 主入口
# ============================================================

async def enrich_from_openalex(
    *,
    name: str,
    university: str,
    client: OpenAlexClient | None = None,
    fetch_papers: bool = True,
    papers_per_page: int = 50,
) -> dict:
    """
    通过 OpenAlex 检索作者并补充深度学术指标。

    Returns: {
        "status": "ok" / "no_match" / "search_failed",
        "openalex_id": str | None,
        "h_index": int | None,
        "i10_index": int | None,
        "citation_count": int | None,
        "works_count": int | None,
        "papers": list[dict],          # 完整论文列表
        "coauthors": list[dict],       # 主要合作者
        "topics": list[dict],          # 研究主题分布
        "yearly_stats": list[dict],    # 年度统计
        "match_method": str,
        "match_name": str,
    }
    """
    own_client = client is None
    if client is None:
        client = OpenAlexClient()

    try:
        pinyin_candidates = _to_pinyin_name(name)
        univ_en = _english_university(university)
        all_candidates: list[dict] = []
        seen_ids: set[str] = set()

        for py in pinyin_candidates[:2]:
            cands = await client.search_authors(py, per_page=10)
            for c in cands:
                cid = c.get("id")
                if cid and cid not in seen_ids:
                    seen_ids.add(cid)
                    all_candidates.append(c)

        if not all_candidates:
            cands = await client.search_authors(name, per_page=10)
            for c in cands:
                cid = c.get("id")
                if cid and cid not in seen_ids:
                    seen_ids.add(cid)
                    all_candidates.append(c)

        if not all_candidates:
            return {"status": "no_match", "match_method": "no_candidate"}

        author, method = _disambiguate(
            all_candidates, name, univ_en,
            target_pinyin_candidates=pinyin_candidates,
        )
        if author is None:
            return {
                "status": "no_match",
                "match_method": method,
                "candidate_count": len(all_candidates),
            }

        author_id_full = author.get("id", "")
        author_id_short = author_id_full.rsplit("/", 1)[-1] if author_id_full else None
        summary = author.get("summary_stats") or {}

        result: dict[str, Any] = {
            "status": "ok",
            "openalex_id": author_id_short,
            "h_index": summary.get("h_index"),
            "i10_index": summary.get("i10_index"),
            "citation_count": author.get("cited_by_count"),
            "works_count": author.get("works_count"),
            "match_method": method,
            "match_name": author.get("display_name"),
        }

        # 研究主题分布（无论 fetch_papers 是否开启都提取）
        result["topics"] = _extract_topics(author)

        # 拉取完整论文 + 聚合合作者 + 年度统计
        if fetch_papers and author_id_full:
            works = await client.get_author_works(
                author_id_full, per_page=papers_per_page,
            )
            agg = _summarize_works(works, author_id_full)
            result["papers"] = agg["papers"]
            result["coauthors"] = agg["coauthors"]
            result["yearly_stats"] = agg["yearly_stats"]

            # 兼容旧字段：recent_papers 取前 5 篇
            result["recent_papers"] = agg["papers"][:5]
        else:
            result["papers"] = []
            result["coauthors"] = []
            result["yearly_stats"] = []
            result["recent_papers"] = []

        return result
    finally:
        if own_client:
            await client.close()
