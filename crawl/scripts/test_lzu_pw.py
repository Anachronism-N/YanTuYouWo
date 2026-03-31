import asyncio
from playwright.async_api import async_playwright

async def test():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()
        try:
            resp = await page.goto("https://ge.lzu.edu.cn/tongzhigonggao/index.html", timeout=20000)
            print("Status:", resp.status)
            await page.wait_for_timeout(5000)
            content = await page.content()
            print("Content:", len(content), "chars")
            
            # 检查ol中的li
            lis = await page.eval_on_selector_all(
                "div.post-list ol li",
                """els => els.map(e => {
                    let a = e.querySelector('a');
                    return {
                        title: a ? a.textContent.trim().slice(0, 60) : 'no-a',
                        href: a ? a.href : ''
                    };
                })"""
            )
            print("ol li count:", len(lis))
            for item in lis[:10]:
                print("  ", item["title"], "|", item["href"][:60])
            
            # 也检查所有a标签
            if len(lis) == 0:
                print("\nFallback: checking all links with long text")
                links = await page.eval_on_selector_all(
                    "a",
                    """els => els.filter(e => e.textContent.trim().length > 10)
                        .map(e => ({
                            title: e.textContent.trim().slice(0, 60),
                            href: e.href
                        })).slice(0, 20)"""
                )
                for item in links:
                    print("  ", item["title"], "|", item["href"][:60])
        except Exception as e:
            print("Error:", e)
        await browser.close()

asyncio.run(test())
