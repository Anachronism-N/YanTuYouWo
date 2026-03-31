"""研招网爬虫 - 获取 985 高校列表及其招生单位（学院）"""

from __future__ import annotations

import re
import asyncio
from typing import Optional

from bs4 import BeautifulSoup
from loguru import logger

from src.utils.http_client import http_client
from src.utils.url_utils import normalize_url


# 研招网院校库 URL
CHSI_BASE_URL = "https://yz.chsi.com.cn"
CHSI_SCHOOL_LIST_URL = "https://yz.chsi.com.cn/sch/"

# 985 高校列表（39 所）- 作为校验基准
UNIVERSITIES_985 = [
    "北京大学", "清华大学", "中国人民大学", "北京师范大学", "北京航空航天大学",
    "北京理工大学", "中国农业大学", "中央民族大学", "南开大学", "天津大学",
    "大连理工大学", "东北大学", "吉林大学", "哈尔滨工业大学", "复旦大学",
    "上海交通大学", "同济大学", "华东师范大学", "南京大学", "东南大学",
    "浙江大学", "中国科学技术大学", "厦门大学", "山东大学", "中国海洋大学",
    "武汉大学", "华中科技大学", "湖南大学", "中南大学", "中山大学",
    "华南理工大学", "四川大学", "电子科技大学", "重庆大学", "西安交通大学",
    "西北工业大学", "西北农林科技大学", "兰州大学", "国防科技大学",
]

# 985 高校所在省份映射
UNIVERSITY_PROVINCES = {
    "北京大学": "北京", "清华大学": "北京", "中国人民大学": "北京",
    "北京师范大学": "北京", "北京航空航天大学": "北京", "北京理工大学": "北京",
    "中国农业大学": "北京", "中央民族大学": "北京",
    "南开大学": "天津", "天津大学": "天津",
    "大连理工大学": "辽宁", "东北大学": "辽宁",
    "吉林大学": "吉林",
    "哈尔滨工业大学": "黑龙江",
    "复旦大学": "上海", "上海交通大学": "上海", "同济大学": "上海", "华东师范大学": "上海",
    "南京大学": "江苏", "东南大学": "江苏",
    "浙江大学": "浙江",
    "中国科学技术大学": "安徽",
    "厦门大学": "福建",
    "山东大学": "山东", "中国海洋大学": "山东",
    "武汉大学": "湖北", "华中科技大学": "湖北",
    "湖南大学": "湖南", "中南大学": "湖南",
    "中山大学": "广东", "华南理工大学": "广东",
    "四川大学": "四川", "电子科技大学": "四川",
    "重庆大学": "重庆",
    "西安交通大学": "陕西", "西北工业大学": "陕西", "西北农林科技大学": "陕西",
    "兰州大学": "甘肃",
    "国防科技大学": "湖南",
}


async def crawl_chsi_school_list() -> list[dict]:
    """
    从研招网院校库获取高校列表。

    研招网院校库页面结构：
    - 支持按 985/211 筛选
    - 每个高校有详情页，包含招生单位列表

    Returns:
        高校信息列表 [{"name": "北京大学", "chsi_url": "...", "chsi_id": "..."}]
    """
    logger.info("开始爬取研招网院校库...")

    # 研招网院校库搜索页面（985 筛选）
    search_url = f"{CHSI_SCHOOL_LIST_URL}search.do"
    schools = []

    # 尝试获取院校列表页
    html = await http_client.fetch(
        search_url,
        headers={"Referer": CHSI_BASE_URL},
    )

    if html:
        soup = BeautifulSoup(html, "lxml")
        # 解析院校列表
        school_items = soup.select(".ch-table tbody tr") or soup.select(".sch-list .sch-item")

        for item in school_items:
            link = item.select_one("a")
            if link:
                name = link.get_text(strip=True)
                href = link.get("href", "")
                if name and href:
                    chsi_id = _extract_chsi_id(href)
                    schools.append({
                        "name": name,
                        "chsi_url": normalize_url(href, CHSI_BASE_URL),
                        "chsi_id": chsi_id,
                    })

    # 如果研招网爬取失败或数据不全，使用内置的 985 列表作为基准
    if len(schools) < 30:
        logger.warning(f"研招网仅获取到 {len(schools)} 所高校，使用内置 985 列表补充")
        existing_names = {s["name"] for s in schools}
        for name in UNIVERSITIES_985:
            if name not in existing_names:
                schools.append({
                    "name": name,
                    "chsi_url": "",
                    "chsi_id": "",
                })

    logger.info(f"共获取 {len(schools)} 所高校")
    return schools


async def crawl_chsi_departments(university_name: str, chsi_url: str) -> list[dict]:
    """
    从研招网获取某高校的招生单位（学院）列表。

    Args:
        university_name: 高校名称
        chsi_url: 研招网院校详情页 URL

    Returns:
        招生单位列表 [{"name": "计算机科学与技术学院", "code": "001"}]
    """
    if not chsi_url:
        logger.debug(f"无研招网 URL，跳过: {university_name}")
        return []

    logger.debug(f"获取招生单位: {university_name}")

    # 研招网院校详情页通常有"招生单位"或"院系所"列表
    html = await http_client.fetch(
        chsi_url,
        headers={"Referer": CHSI_SCHOOL_LIST_URL},
    )

    if not html:
        return []

    soup = BeautifulSoup(html, "lxml")
    departments = []

    # 尝试多种选择器
    selectors = [
        "select[name='dwmc'] option",  # 下拉选择框
        ".yxk-table tbody tr td:first-child",  # 表格
        ".zsml-zy-filter select option",  # 专业目录筛选
        "ul.dept-list li a",  # 列表
    ]

    for selector in selectors:
        items = soup.select(selector)
        for item in items:
            name = item.get_text(strip=True)
            code = item.get("value", "")
            if name and name != "请选择" and name != "不限" and len(name) >= 2:
                departments.append({
                    "name": name,
                    "code": code,
                })
        if departments:
            break

    logger.debug(f"{university_name}: 获取到 {len(departments)} 个招生单位")
    return departments


def _extract_chsi_id(url: str) -> str:
    """从研招网 URL 中提取院校 ID"""
    match = re.search(r"schId=(\w+)", url)
    if match:
        return match.group(1)
    match = re.search(r"/(\d+)\.dhtml", url)
    if match:
        return match.group(1)
    return ""


async def build_university_database() -> list[dict]:
    """
    构建完整的高校数据库。

    流程：
    1. 从研招网获取高校列表
    2. 逐校获取招生单位列表
    3. 返回完整的高校+学院数据

    Returns:
        [{"name": "北京大学", "province": "北京", "level": "985",
          "chsi_id": "...", "departments": [{"name": "计算机学院", "code": "001"}]}]
    """
    logger.info("=== 开始构建高校数据库 ===")

    # Step 1: 获取高校列表
    schools = await crawl_chsi_school_list()

    # Step 2: 逐校获取招生单位
    results = []
    for i, school in enumerate(schools):
        name = school["name"]
        logger.info(f"[{i + 1}/{len(schools)}] 处理: {name}")

        departments = await crawl_chsi_departments(name, school.get("chsi_url", ""))

        results.append({
            "name": name,
            "province": UNIVERSITY_PROVINCES.get(name, ""),
            "level": "985",
            "chsi_id": school.get("chsi_id", ""),
            "departments": departments,
        })

        # 每处理 5 所高校，短暂休息
        if (i + 1) % 5 == 0:
            await asyncio.sleep(2)

    # 统计
    total_depts = sum(len(r["departments"]) for r in results)
    logger.info(f"=== 高校数据库构建完成: {len(results)} 所高校, {total_depts} 个招生单位 ===")

    return results
