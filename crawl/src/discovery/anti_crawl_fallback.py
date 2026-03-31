"""
反爬降级策略 - 处理使用瑞数等企业级反爬系统的高校

当高校官网使用瑞数信息（Rui Shu）等企业级反爬系统时，
普通 HTTP 请求和 Playwright 浏览器渲染都无法绕过。

降级策略（按优先级）：
1. Playwright 浏览器渲染（可绕过部分 JS 反爬）
2. 备选数据源（百度百科等第三方网站提取学院列表）
3. 内置兜底数据（已知反爬高校的学院列表，从公开信息整理）
"""

from __future__ import annotations

import re
from typing import Optional

from loguru import logger


def detect_anti_crawl(html: str | None, status_code: int | None = None) -> str | None:
    """
    检测页面是否被反爬系统拦截。

    Args:
        html: 响应 HTML 内容
        status_code: HTTP 状态码

    Returns:
        反爬系统名称（如 "ruishu"），未检测到返回 None
    """
    # 状态码检测
    if status_code in (202, 412):
        # 瑞数信息典型状态码：202 Accepted（返回 JS 混淆）或 412 Precondition Failed
        return "ruishu"

    if not html:
        return None

    # 瑞数信息特征检测
    ruishu_markers = [
        # 瑞数 JS 混淆特征
        r"\$_ts\s*=",
        r"\$_t\s*=",
        r"_\$[a-zA-Z]{2}\s*=",
        # 瑞数 cookie 设置
        r"document\.cookie\s*=.*HttpOnly",
    ]

    for marker in ruishu_markers:
        if re.search(marker, html):
            return "ruishu"

    # 瑞数典型的空页面（只有空壳 HTML，无实质内容）
    if len(html) < 100 and re.search(r"<html>\s*<head>\s*</head>\s*<body>\s*</body>\s*</html>", html):
        return "ruishu"

    # 页面内容极短且无实质内容
    if len(html) < 200 and "<a" not in html:
        return "unknown_anti_crawl"

    return None


async def playwright_fetch_with_stealth(url: str, wait_seconds: int = 8) -> str | None:
    """
    使用 Playwright + 反检测脚本获取页面内容。

    Args:
        url: 目标 URL
        wait_seconds: JS 执行等待时间（秒）

    Returns:
        渲染后的 HTML 内容，失败返回 None
    """
    try:
        from playwright.async_api import async_playwright
    except ImportError:
        logger.warning("Playwright 未安装，跳过浏览器渲染")
        return None

    try:
        async with async_playwright() as p:
            browser = await p.chromium.launch(
                headless=True,
                args=[
                    "--disable-blink-features=AutomationControlled",
                    "--no-sandbox",
                    "--disable-dev-shm-usage",
                    "--disable-infobars",
                ]
            )
            context = await browser.new_context(
                user_agent=(
                    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                    "AppleWebKit/537.36 (KHTML, like Gecko) "
                    "Chrome/131.0.6778.86 Safari/537.36"
                ),
                viewport={"width": 1920, "height": 1080},
                locale="zh-CN",
                timezone_id="Asia/Shanghai",
            )
            # 注入反检测脚本
            await context.add_init_script("""
                Object.defineProperty(navigator, 'webdriver', {get: () => undefined});
                window.chrome = {runtime: {}, loadTimes: function(){}, csi: function(){}};
                delete navigator.__proto__.webdriver;
                Object.defineProperty(navigator, 'plugins', {
                    get: () => [1, 2, 3, 4, 5],
                });
                Object.defineProperty(navigator, 'languages', {
                    get: () => ['zh-CN', 'zh', 'en-US', 'en'],
                });
            """)

            page = await context.new_page()

            try:
                resp = await page.goto(url, wait_until="domcontentloaded", timeout=20000)
                status = resp.status if resp else None
                logger.debug(f"Playwright 请求 {url}: 状态码={status}")

                # 等待 JS 执行
                await page.wait_for_timeout(wait_seconds * 1000)

                html = await page.content()
                links_count = await page.eval_on_selector_all("a[href]", "els => els.length")

                logger.debug(f"Playwright 渲染完成: HTML={len(html)}, 链接={links_count}")

                # 判断是否成功
                if len(html) > 5000 and links_count > 10:
                    await browser.close()
                    return html
                else:
                    logger.warning(f"Playwright 渲染后内容仍不足: HTML={len(html)}, 链接={links_count}")
                    await browser.close()
                    return None

            except Exception as e:
                logger.warning(f"Playwright 页面加载失败: {url} - {e}")
                await browser.close()
                return None

    except Exception as e:
        logger.error(f"Playwright 启动失败: {e}")
        return None


# ============================================================
# 内置兜底数据：已知反爬高校的学院列表
# 数据来源：各高校公开信息（百度百科、研招网等）
# 更新日期：2026-03-27
# ============================================================

FALLBACK_DEPARTMENTS: dict[str, list[dict]] = {
    "四川大学": [
        {"name": "经济学院", "url": "https://sesu.scu.edu.cn"},
        {"name": "法学院", "url": "https://law.scu.edu.cn"},
        {"name": "文学与新闻学院", "url": "https://www.sculj.cn"},
        {"name": "外国语学院", "url": "https://flc.scu.edu.cn"},
        {"name": "艺术学院", "url": "https://arts.scu.edu.cn"},
        {"name": "历史文化学院", "url": "https://history.scu.edu.cn"},
        {"name": "数学学院", "url": "https://math.scu.edu.cn"},
        {"name": "物理学院", "url": "https://physics.scu.edu.cn"},
        {"name": "化学学院", "url": "https://chem.scu.edu.cn"},
        {"name": "生命科学学院", "url": "https://life.scu.edu.cn"},
        {"name": "电子信息学院", "url": "https://eie.scu.edu.cn"},
        {"name": "材料科学与工程学院", "url": "https://mse.scu.edu.cn"},
        {"name": "机械工程学院", "url": "https://me.scu.edu.cn"},
        {"name": "电气工程学院", "url": "https://dee.scu.edu.cn"},
        {"name": "计算机学院", "url": "https://cs.scu.edu.cn"},
        {"name": "软件学院", "url": "https://sw.scu.edu.cn"},
        {"name": "建筑与环境学院", "url": "https://acem.scu.edu.cn"},
        {"name": "化学工程学院", "url": "https://ce.scu.edu.cn"},
        {"name": "水利水电学院", "url": "https://wrhes.scu.edu.cn"},
        {"name": "高分子科学与工程学院", "url": "https://cpse.scu.edu.cn"},
        {"name": "轻工科学与工程学院", "url": "https://qgxy.scu.edu.cn"},
        {"name": "生物医学工程学院", "url": "https://bme.scu.edu.cn"},
        {"name": "空天科学与工程学院", "url": "https://aero.scu.edu.cn"},
        {"name": "公共管理学院", "url": "https://ggglxy.scu.edu.cn"},
        {"name": "商学院", "url": "https://bs.scu.edu.cn"},
        {"name": "马克思主义学院", "url": "https://marxism.scu.edu.cn"},
        {"name": "体育学院", "url": "https://tyxy.scu.edu.cn"},
        {"name": "华西基础医学与法医学院", "url": "https://bms.scu.edu.cn"},
        {"name": "华西临床医学院", "url": "https://wchscu.cn"},
        {"name": "华西口腔医学院", "url": "https://hxkq.scu.edu.cn"},
        {"name": "华西公共卫生学院", "url": "https://wcsph.scu.edu.cn"},
        {"name": "华西药学院", "url": "https://pharmacy.scu.edu.cn"},
        {"name": "护理学院", "url": "https://nursing.scu.edu.cn"},
        {"name": "灾后重建与管理学院", "url": "https://idmr.scu.edu.cn"},
        {"name": "国际关系学院", "url": "https://sis.scu.edu.cn"},
        {"name": "匹兹堡学院", "url": "https://scupi.scu.edu.cn"},
        {"name": "网络空间安全学院", "url": "https://ccs.scu.edu.cn"},
        {"name": "人工智能学院", "url": "https://ai.scu.edu.cn"},
        {"name": "考古文博学院", "url": ""},  # 新成立学院，暂无独立网站
        {"name": "碳中和未来技术学院", "url": ""},  # 新成立学院，暂无独立网站
        {"name": "国家保密学院", "url": ""},  # 新成立学院，暂无独立网站
    ],
    "兰州大学": [
        {"name": "文学院", "url": "https://chin.lzu.edu.cn"},
        {"name": "历史文化学院", "url": "https://history.lzu.edu.cn"},
        {"name": "哲学社会学院", "url": "https://phil.lzu.edu.cn"},
        {"name": "经济学院", "url": "https://econ.lzu.edu.cn"},
        {"name": "管理学院", "url": "https://ms.lzu.edu.cn"},
        {"name": "法学院", "url": "https://law.lzu.edu.cn"},
        {"name": "马克思主义学院", "url": "https://marx.lzu.edu.cn"},
        {"name": "新闻与传播学院", "url": "https://xwxy.lzu.edu.cn"},
        {"name": "外国语学院", "url": "https://wyx.lzu.edu.cn"},
        {"name": "艺术学院", "url": "https://art.lzu.edu.cn"},
        {"name": "数学与统计学院", "url": "https://math.lzu.edu.cn"},
        {"name": "物理科学与技术学院", "url": "https://phys.lzu.edu.cn"},
        {"name": "化学化工学院", "url": "https://chem.lzu.edu.cn"},
        {"name": "生命科学学院", "url": "https://lifesc.lzu.edu.cn"},
        {"name": "信息科学与工程学院", "url": "https://xxxy.lzu.edu.cn"},
        {"name": "资源环境学院", "url": "https://cere.lzu.edu.cn"},
        {"name": "大气科学学院", "url": "https://atmos.lzu.edu.cn"},
        {"name": "草地农业科技学院", "url": "https://caoye.lzu.edu.cn"},
        {"name": "土木工程与力学学院", "url": "https://ce.lzu.edu.cn"},
        {"name": "核科学与技术学院", "url": "https://nuclear.lzu.edu.cn"},
        {"name": "基础医学院", "url": "https://bms.lzu.edu.cn"},
        {"name": "公共卫生学院", "url": "https://sph.lzu.edu.cn"},
        {"name": "药学院", "url": "https://pharm.lzu.edu.cn"},
        {"name": "口腔医学院", "url": "https://dent.lzu.edu.cn"},
        {"name": "护理学院", "url": "https://nursing.lzu.edu.cn"},
        {"name": "第一临床医学院", "url": "https://ldyy.lzu.edu.cn"},
        {"name": "第二临床医学院", "url": "https://ery.lzu.edu.cn"},
        {"name": "材料与能源学院", "url": "https://mee.lzu.edu.cn"},
        {"name": "生态学院", "url": "https://ecology.lzu.edu.cn"},
        {"name": "地质科学与矿产资源学院", "url": "https://geo.lzu.edu.cn"},
        {"name": "政治与国际关系学院", "url": "https://pir.lzu.edu.cn"},
        {"name": "萃英学院", "url": "https://cuiying.lzu.edu.cn"},
        {"name": "国际文化交流学院", "url": "https://icce.lzu.edu.cn"},
        {"name": "动物医学与生物安全学院", "url": "https://vet.lzu.edu.cn"},
        {"name": "威尔士学院", "url": "https://wales.lzu.edu.cn"},
        {"name": "纪检监察学院", "url": "https://jiwei.lzu.edu.cn"},
        {"name": "考古与文化遗产研究院", "url": "https://whyc.lzu.edu.cn"},
    ],
}


def get_fallback_departments(university_name: str) -> list[dict] | None:
    """
    获取内置的兜底学院数据。

    Args:
        university_name: 高校名称

    Returns:
        学院列表，无数据返回 None
    """
    depts = FALLBACK_DEPARTMENTS.get(university_name)
    if depts:
        logger.info(f"{university_name}: 使用内置兜底数据 ({len(depts)} 个学院)")
        return [dict(d) for d in depts]  # 返回副本
    return None


# 已知反爬高校的研究生院 URL
FALLBACK_GRADUATE_URLS: dict[str, str] = {
    "四川大学": "https://gs.scu.edu.cn",
    "兰州大学": "https://yz.lzu.edu.cn",
}


# 已知反爬高校的院系列表页 URL
FALLBACK_DEPT_LIST_URLS: dict[str, str] = {
    "四川大学": "https://www.scu.edu.cn/jgsz/yxsz.htm",
    "兰州大学": "https://www.lzu.edu.cn/jgsz/yxsz.htm",
}


def get_fallback_graduate_url(university_name: str) -> str | None:
    """获取内置的研究生院 URL"""
    url = FALLBACK_GRADUATE_URLS.get(university_name)
    if url:
        logger.info(f"{university_name}: 使用内置研究生院 URL: {url}")
    return url


def get_fallback_dept_list_url(university_name: str) -> str | None:
    """获取内置的院系列表页 URL"""
    url = FALLBACK_DEPT_LIST_URLS.get(university_name)
    if url:
        logger.info(f"{university_name}: 使用内置院系列表页 URL: {url}")
    return url
