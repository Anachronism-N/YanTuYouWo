"""测试低覆盖高校的正确URL和Playwright渲染效果"""
import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from playwright.async_api import async_playwright


async def test():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()

        urls = [
            ("同济大学-公告通知", "https://yz.tongji.edu.cn/zsxw/ggtz.htm"),
            ("南京大学-47836", "https://yzb.nju.edu.cn/47836/list.htm"),
            ("南京大学-47862", "https://yzb.nju.edu.cn/47862/list.htm"),
            ("南京大学-47863", "https://yzb.nju.edu.cn/47863/list.htm"),
            ("电子科大-重要通知", "https://yz.uestc.edu.cn/index/zytz.htm"),
            ("电子科大-硕士招生", "https://yz.uestc.edu.cn/sszs/tzgg.htm"),
            ("中央民族-硕士招生", "https://grs.muc.edu.cn/yjsyzsw/sszs.htm"),
            ("北京理工-研招", "https://grd.bit.edu.cn/zsgz/zsxx/index.htm"),
            ("北京师范-研招", "https://yz.bnu.edu.cn/list/news"),
            ("华南理工-研招", "https://yanzhao.scut.edu.cn/open/Master/Zsgg.aspx"),
            ("厦门大学-研招", "https://zs.xmu.edu.cn/info/sszsgg/"),
        ]

        for name, url in urls:
            try:
                resp = await page.goto(url, timeout=15000)
                await page.wait_for_timeout(3000)
                content = await page.content()
                links = await page.eval_on_selector_all(
                    "a",
                    """els => els.filter(e => e.textContent.trim().length > 10)
                        .map(e => e.textContent.trim().slice(0, 60))
                        .slice(0, 10)"""
                )
                tuimian = [l for l in links if any(k in l for k in ['推免', '夏令营', '免试', '保研', '预报名', '暑期'])]
                print(f"\n{name} ({resp.status}, {len(content)} chars, {len(links)} links):", flush=True)
                if tuimian:
                    for l in tuimian[:5]:
                        print(f"  [推免] {l}", flush=True)
                else:
                    for l in links[:5]:
                        print(f"  {l}", flush=True)
            except Exception as e:
                print(f"\n{name}: Error {e}", flush=True)

        await browser.close()


asyncio.run(test())
