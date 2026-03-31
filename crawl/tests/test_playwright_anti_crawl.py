"""
Playwright 反爬绕过测试脚本 - 多策略版

测试多种策略绕过四川大学和兰州大学的瑞数信息反爬系统。
"""

import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))


# 完整的反检测 JS 脚本
STEALTH_JS = """
// 1. 隐藏 webdriver 标志
Object.defineProperty(navigator, 'webdriver', {get: () => false});
delete navigator.__proto__.webdriver;

// 2. 模拟 Chrome 运行时
window.chrome = {
    runtime: {
        PlatformOs: {MAC: 'mac', WIN: 'win', ANDROID: 'android', CROS: 'cros', LINUX: 'linux', OPENBSD: 'openbsd'},
        PlatformArch: {ARM: 'arm', X86_32: 'x86-32', X86_64: 'x86-64', MIPS: 'mips', MIPS64: 'mips64'},
        PlatformNaclArch: {ARM: 'arm', X86_32: 'x86-32', X86_64: 'x86-64', MIPS: 'mips', MIPS64: 'mips64'},
        RequestUpdateCheckStatus: {THROTTLED: 'throttled', NO_UPDATE: 'no_update', UPDATE_AVAILABLE: 'update_available'},
        OnInstalledReason: {INSTALL: 'install', UPDATE: 'update', CHROME_UPDATE: 'chrome_update', SHARED_MODULE_UPDATE: 'shared_module_update'},
        OnRestartRequiredReason: {APP_UPDATE: 'app_update', OS_UPDATE: 'os_update', PERIODIC: 'periodic'},
    },
    loadTimes: function() {},
    csi: function() {},
};

// 3. 模拟 plugins
Object.defineProperty(navigator, 'plugins', {
    get: () => {
        const plugins = [
            {name: 'Chrome PDF Plugin', filename: 'internal-pdf-viewer', description: 'Portable Document Format'},
            {name: 'Chrome PDF Viewer', filename: 'mhjfbmdgcfjbbpaeojofohoefgiehjai', description: ''},
            {name: 'Native Client', filename: 'internal-nacl-plugin', description: ''},
        ];
        plugins.refresh = () => {};
        return plugins;
    },
});

// 4. 模拟 languages
Object.defineProperty(navigator, 'languages', {
    get: () => ['zh-CN', 'zh', 'en-US', 'en'],
});

// 5. 修复 permissions
const originalQuery = window.navigator.permissions.query;
window.navigator.permissions.query = (parameters) => (
    parameters.name === 'notifications' ?
        Promise.resolve({state: Notification.permission}) :
        originalQuery(parameters)
);

// 6. 隐藏 Automation 相关属性
Object.defineProperty(navigator, 'maxTouchPoints', {get: () => 0});

// 7. 修复 iframe contentWindow
const originalAttachShadow = Element.prototype.attachShadow;
Element.prototype.attachShadow = function() {
    return originalAttachShadow.apply(this, arguments);
};

// 8. 模拟正常的 screen 属性
Object.defineProperty(screen, 'availWidth', {get: () => 1920});
Object.defineProperty(screen, 'availHeight', {get: () => 1080});

// 9. 覆盖 toString 方法，防止通过 toString 检测
const oldToString = Function.prototype.toString;
Function.prototype.toString = function() {
    if (this === Function.prototype.toString) return 'function toString() { [native code] }';
    if (this === navigator.permissions.query) return 'function query() { [native code] }';
    return oldToString.call(this);
};
"""


async def strategy_1_stealth(url: str, name: str) -> dict:
    """策略1：Stealth 模式 + 长等待"""
    from playwright.async_api import async_playwright

    print(f"\n  [策略1] Stealth 模式 + 长等待")
    try:
        async with async_playwright() as p:
            browser = await p.chromium.launch(
                headless=True,
                args=[
                    "--disable-blink-features=AutomationControlled",
                    "--no-sandbox",
                    "--disable-dev-shm-usage",
                    "--disable-infobars",
                    "--disable-background-timer-throttling",
                    "--disable-backgrounding-occluded-windows",
                    "--disable-renderer-backgrounding",
                ]
            )
            context = await browser.new_context(
                user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.6778.86 Safari/537.36",
                viewport={"width": 1920, "height": 1080},
                locale="zh-CN",
                timezone_id="Asia/Shanghai",
                color_scheme="light",
            )
            await context.add_init_script(STEALTH_JS)

            page = await context.new_page()
            resp = await page.goto(url, wait_until="domcontentloaded", timeout=20000)
            status = resp.status if resp else None
            print(f"    状态码: {status}")

            # 等待更长时间让 JS 执行
            await page.wait_for_timeout(10000)

            title = await page.title()
            html = await page.content()
            links = await page.eval_on_selector_all("a[href]", "els => els.length")
            print(f"    标题: {title}, HTML: {len(html)}, 链接: {links}")

            success = len(html) > 5000 and links > 10
            await browser.close()
            return {"success": success, "html": html, "title": title, "links": links}
    except Exception as e:
        print(f"    错误: {e}")
        return {"success": False, "html": "", "title": "", "links": 0}


async def strategy_2_retry_reload(url: str, name: str) -> dict:
    """策略2：多次刷新重试（瑞数可能在第二次请求时放行）"""
    from playwright.async_api import async_playwright

    print(f"\n  [策略2] 多次刷新重试")
    try:
        async with async_playwright() as p:
            browser = await p.chromium.launch(
                headless=True,
                args=["--disable-blink-features=AutomationControlled", "--no-sandbox"]
            )
            context = await browser.new_context(
                user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.6778.86 Safari/537.36",
                viewport={"width": 1920, "height": 1080},
                locale="zh-CN",
            )
            await context.add_init_script(STEALTH_JS)
            page = await context.new_page()

            for attempt in range(3):
                resp = await page.goto(url, wait_until="domcontentloaded", timeout=15000)
                status = resp.status if resp else None
                await page.wait_for_timeout(5000)
                html = await page.content()
                links = await page.eval_on_selector_all("a[href]", "els => els.length")
                print(f"    尝试 {attempt+1}: 状态={status}, HTML={len(html)}, 链接={links}")

                if len(html) > 5000 and links > 10:
                    title = await page.title()
                    await browser.close()
                    return {"success": True, "html": html, "title": title, "links": links}

                # 刷新页面
                await page.reload(wait_until="domcontentloaded", timeout=15000)
                await page.wait_for_timeout(5000)

            await browser.close()
            return {"success": False, "html": "", "title": "", "links": 0}
    except Exception as e:
        print(f"    错误: {e}")
        return {"success": False, "html": "", "title": "", "links": 0}


async def strategy_3_firefox(url: str, name: str) -> dict:
    """策略3：使用 Firefox（不同的浏览器指纹）"""
    from playwright.async_api import async_playwright

    print(f"\n  [策略3] Firefox 浏览器")
    try:
        async with async_playwright() as p:
            browser = await p.firefox.launch(headless=True)
            context = await browser.new_context(
                viewport={"width": 1920, "height": 1080},
                locale="zh-CN",
            )
            page = await context.new_page()

            resp = await page.goto(url, wait_until="domcontentloaded", timeout=20000)
            status = resp.status if resp else None
            print(f"    状态码: {status}")

            await page.wait_for_timeout(10000)

            title = await page.title()
            html = await page.content()
            links = await page.eval_on_selector_all("a[href]", "els => els.length")
            print(f"    标题: {title}, HTML: {len(html)}, 链接: {links}")

            success = len(html) > 5000 and links > 10
            await browser.close()
            return {"success": success, "html": html, "title": title, "links": links}
    except Exception as e:
        print(f"    错误: {e}")
        return {"success": False, "html": "", "title": "", "links": 0}


async def strategy_4_webkit(url: str, name: str) -> dict:
    """策略4：使用 WebKit（Safari 内核）"""
    from playwright.async_api import async_playwright

    print(f"\n  [策略4] WebKit (Safari) 浏览器")
    try:
        async with async_playwright() as p:
            browser = await p.webkit.launch(headless=True)
            context = await browser.new_context(
                viewport={"width": 1920, "height": 1080},
                locale="zh-CN",
            )
            page = await context.new_page()

            resp = await page.goto(url, wait_until="domcontentloaded", timeout=20000)
            status = resp.status if resp else None
            print(f"    状态码: {status}")

            await page.wait_for_timeout(10000)

            title = await page.title()
            html = await page.content()
            links = await page.eval_on_selector_all("a[href]", "els => els.length")
            print(f"    标题: {title}, HTML: {len(html)}, 链接: {links}")

            success = len(html) > 5000 and links > 10
            await browser.close()
            return {"success": success, "html": html, "title": title, "links": links}
    except Exception as e:
        print(f"    错误: {e}")
        return {"success": False, "html": "", "title": "", "links": 0}


async def test_university(url: str, name: str):
    """对单所高校测试所有策略"""
    print(f"\n{'='*60}")
    print(f"🏫 {name} ({url})")
    print(f"{'='*60}")

    strategies = [
        ("Stealth + 长等待", strategy_1_stealth),
        ("多次刷新重试", strategy_2_retry_reload),
        ("Firefox", strategy_3_firefox),
        ("WebKit (Safari)", strategy_4_webkit),
    ]

    for sname, sfunc in strategies:
        result = await sfunc(url, name)
        if result["success"]:
            print(f"\n  🎉 策略 '{sname}' 成功！")
            print(f"     标题: {result['title']}")
            print(f"     HTML: {len(result['html'])} 字符, 链接: {result['links']}")
            return sname, result

    print(f"\n  ❌ 所有策略均失败")
    return None, None


async def main():
    targets = [
        ("https://www.scu.edu.cn", "四川大学"),
        ("https://www.lzu.edu.cn", "兰州大学"),
    ]

    print("=" * 60)
    print("🔬 Playwright 反爬绕过多策略测试")
    print("=" * 60)

    results = {}
    for url, name in targets:
        strategy_name, result = await test_university(url, name)
        results[name] = (strategy_name, result)

    print(f"\n\n{'='*60}")
    print("📊 最终结果")
    print(f"{'='*60}")
    for name, (sname, result) in results.items():
        if sname:
            print(f"  ✅ {name}: 策略 '{sname}' 成功")
        else:
            print(f"  ❌ {name}: 所有策略失败")


if __name__ == "__main__":
    asyncio.run(main())