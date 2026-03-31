# 数据质量优化方案

> 创建时间：2026-04-01
> 状态：规划中

---

## 一、问题总览

通过前后端联调测试，发现以下 4 个数据质量问题：

| # | 问题 | 影响范围 | 严重程度 | 修改位置 |
|---|---|---|---|---|
| 1 | 筛选选项选中后显示英文 key | 前端 FilterPanel | ⚠️ 中 | 前端 |
| 2 | 详情页正文格式混乱 + 标题含日期 | 爬虫 → 前端展示 | 🔴 高 | 爬虫/后端 |
| 3 | 详情页图片缺失 | 爬虫内容提取 | 🟡 中 | 爬虫 |
| 4 | 大量条目缺少时间信息 | 爬虫数据提取 | 🔴 高 | 爬虫/后端 |

**数据现状**（989 条通知）：
- 284 条（28.7%）缺少 `publish_date`
- 634 条（64.1%）`program_type` 为"其他"（分类不精确）
- 正文内容存在大量格式问题（数字/文字被换行符拆散）

---

## 二、问题详细分析与方案

### 问题 1：筛选选项选中后显示英文 key

**现象**：在保研信息列表页，选择筛选条件后，下拉框显示的是英文 key（如 `summer_camp`、`ended`、`latest`），而非中文标签（如"夏令营"、"已结束"、"最新发布"）。

**根因**：`FilterPanel.tsx` 中的 `FilterSelect` 组件使用了 Radix UI 的 `<Select>` 组件。当通过 `key` 切换实现 uncontrolled→controlled 模式转换时，`<SelectValue>` 组件在 controlled 模式下无法正确映射 value→label，导致直接显示了 value 字符串。

**修复方案**（✅ 已完成）：
- 在 `FilterSelect` 中增加 `getDisplayLabel()` 函数，根据 value 查找对应的中文 label
- 当有选中值时，用 `<span>{getDisplayLabel(value)}</span>` 替代 `<SelectValue />`
- 排序 Select 同理修复

**涉及文件**：
- `frontend/src/components/common/FilterPanel.tsx`

---

### 问题 2：详情页正文格式混乱 + 标题含日期

**现象**：
1. 通知原文中，数字和文字被换行符拆散（如"2025\n年\n8\n月\n19\n日至\n30\n日"）
2. 正文包含大量页面导航噪音（如"招生就业 > 硕士招生 > 正文"）
3. 标题中包含发布日期前缀（如"2022-07-13武汉大学化学与分子科学学院..."）

**根因分析**：

#### 2a. 正文格式问题
爬虫的 `content_extractor.py` 使用 `get_text(separator="\n", strip=True)` 提取文本。这种方式会将每个 HTML 标签（包括 `<span>`、`<br>`、`<td>` 等行内元素）都用换行符分隔，导致原本连续的文本被拆散。

例如原始 HTML：
```html
<p>2025<span>年</span><span>8</span><span>月</span></p>
```
提取后变成：
```
2025
年
8
月
```

#### 2b. 导航噪音
`_clean_text()` 函数虽然有噪音清理逻辑，但没有处理面包屑导航、侧边栏菜单等结构性噪音。

#### 2c. 标题含日期
爬虫列表页解析时，部分高校的列表页将日期和标题放在同一个元素中，解析器未能正确分离。

**解决方案**：在后端添加数据清洗服务（推荐），而非修改爬虫（避免需要重新爬取）。

#### 方案 A：后端数据清洗服务（推荐，优先实施）

在后端新增 `DataCleanService`，在 API 返回数据时进行实时清洗：

```python
# backend/src/services/data_clean_service.py

import re

class DataCleanService:
    """数据清洗服务 - 在API层对爬虫原始数据进行格式整理"""

    @staticmethod
    def clean_title(title: str) -> str:
        """清洗标题：移除前缀日期"""
        # 移除标题开头的日期前缀（如 "2022-07-13"、"2025-06-13"）
        title = re.sub(r"^\d{4}-\d{2}-\d{2}\s*", "", title)
        return title.strip()

    @staticmethod
    def clean_raw_content(content: str) -> str:
        """清洗正文内容：修复格式问题"""
        if not content:
            return ""

        # 1. 移除页面导航噪音（面包屑、侧边栏菜单）
        # 匹配 "首页 > xxx > xxx > 正文" 模式
        content = re.sub(r"^.*?(?:首页|当前位置).*?(?:正文|详情)\s*\n?", "", content, flags=re.DOTALL)
        # 移除开头的菜单项（如 "招生就业\n本科招生\n硕士招生\n..."）
        content = re.sub(r"^(?:[\u4e00-\u9fa5]{2,8}\n){3,}", "", content)

        # 2. 修复被换行符拆散的数字和文字
        # "2025\n年\n8\n月\n19\n日" → "2025年8月19日"
        content = re.sub(r"(\d+)\n(年|月|日|号|时|分|秒|点|期|届|级|人|名|个|项|条|篇|次|周)", r"\1\2", content)
        # "第\n3\n批" → "第3批"
        content = re.sub(r"(第)\n(\d+)\n", r"\1\2", content)
        # 修复被拆散的标点
        content = re.sub(r"\n([，。、；：！？）》」』】])", r"\1", content)
        content = re.sub(r"([（《「『【])\n", r"\1", content)
        # 修复被拆散的引号
        content = re.sub(r""\n", """, content)
        content = re.sub(r"\n"", """, content)
        content = re.sub(r""\n", """, content)
        content = re.sub(r"\n"", """, content)
        # 修复短行合并（单个字符或很短的行应该与前后行合并）
        lines = content.split("\n")
        merged = []
        for line in lines:
            stripped = line.strip()
            if not stripped:
                merged.append("")
                continue
            # 如果当前行很短（≤3字符）且不是标题/列表项，与前一行合并
            if len(stripped) <= 3 and merged and merged[-1] and not stripped.startswith(("•", "-", "·", "●")):
                merged[-1] += stripped
            else:
                merged.append(stripped)
        content = "\n".join(merged)

        # 3. 清理多余空行
        content = re.sub(r"\n{3,}", "\n\n", content)

        return content.strip()

    @staticmethod
    def extract_date_from_title(title: str) -> str | None:
        """从标题中提取日期（用于补全缺失的 publish_date）"""
        match = re.match(r"^(\d{4}-\d{2}-\d{2})", title)
        if match:
            return match.group(1)
        return None
```

#### 方案 B：爬虫侧 LLM 格式整理（后续优化）

在爬虫阶段3的 `detail_crawler.py` 中，增加 LLM 格式整理步骤：

```python
# 在 process_notice() 的步骤 2 和步骤 3 之间增加：
# 2.5 LLM 格式整理（清洗正文、提取标题）
cleaned_content = await llm_client.clean_content(content)
cleaned_title = await llm_client.clean_title(title)
```

新增 LLM Prompt：
```python
CLEAN_CONTENT_PROMPT = """请整理以下从网页提取的通知正文，修复格式问题：
1. 合并被错误换行拆散的句子
2. 移除页面导航、菜单等噪音文本
3. 保持段落结构清晰
4. 不要修改原文内容含义

原始文本：
{content}

请直接返回整理后的文本，不要添加任何说明。"""

CLEAN_TITLE_PROMPT = """请从以下通知标题中移除日期前缀，只保留标题本身。
如果标题不含日期前缀，原样返回。

标题：{title}

请直接返回清理后的标题。"""
```

> ⚠️ 方案 B 会增加 LLM 调用成本，建议仅在方案 A 效果不佳时使用。

---

### 问题 3：详情页图片缺失

**现象**：部分通知详情页包含图片（如表格截图、流程图等），但当前爬虫只提取纯文本，图片信息完全丢失。

**根因**：`content_extractor.py` 的 `extract_content()` 函数使用 `get_text()` 提取纯文本，会丢弃所有 `<img>` 标签。

**解决方案**：分两步实施。

#### 步骤 1：提取图片 URL 并存储（爬虫侧）

修改 `content_extractor.py`，新增图片提取功能：

```python
def extract_content_with_images(html: str, base_url: str = "") -> tuple[str, list[dict]]:
    """
    从 HTML 中提取正文内容和图片信息。

    Returns:
        (text_content, images)
        images: [{"url": "...", "alt": "...", "position": 123}, ...]
    """
    soup = BeautifulSoup(html, "lxml")
    # ... 现有的标签清理逻辑 ...

    # 提取图片
    images = []
    for img in main_content.find_all("img"):
        src = img.get("src", "")
        if not src or src.startswith("data:"):  # 跳过 base64 内联图片
            continue
        # 转为绝对 URL
        if base_url and not src.startswith("http"):
            from urllib.parse import urljoin
            src = urljoin(base_url, src)
        images.append({
            "url": src,
            "alt": img.get("alt", ""),
            "width": img.get("width"),
            "height": img.get("height"),
        })

    text = main_content.get_text(separator="\n", strip=True)
    text = _clean_text(text)

    return text, images
```

#### 步骤 2：数据库模型扩展

在 `AdmissionNotice` 模型中新增 `images` JSON 字段：

```python
images: Mapped[Optional[list]] = mapped_column(
    JSON, nullable=True, comment="图片列表 [{url, alt, width, height}]"
)
```

#### 步骤 3：前端展示图片

在通知详情页的"通知原文"区域，渲染图片：

```tsx
{notice.images?.map((img, i) => (
  <img key={i} src={img.url} alt={img.alt || "通知图片"} className="max-w-full rounded-lg my-4" />
))}
```

#### 步骤 4（可选）：图片下载与本地存储

为避免外链图片失效，可在爬虫侧下载图片到本地：

```python
async def download_image(url: str, save_dir: str) -> str:
    """下载图片到本地，返回本地路径"""
    # 使用 httpx 下载
    # 保存到 crawl/data/images/{hash}.{ext}
    # 返回相对路径
```

> ⚠️ 图片下载会显著增加爬取时间和存储空间，建议先实施步骤 1-3（只存 URL），后续按需下载。

---

### 问题 4：大量条目缺少时间信息

**现象**：989 条通知中有 284 条（28.7%）缺少 `publish_date`。

**根因分析**：
1. 列表页解析时，部分高校的日期格式不标准，正则未能匹配
2. 部分通知的日期嵌入在标题中（如 `2025-09-06化学与材料科学学院...`），但列表解析器未提取
3. LLM 提取阶段未能从正文中提取发布日期

**解决方案**：多层级日期提取策略。

#### 层级 1：从标题中提取日期（正则，后端实时处理）

```python
import re
from datetime import date

def extract_date_from_title(title: str) -> date | None:
    """从标题中提取日期"""
    patterns = [
        r"^(\d{4}-\d{2}-\d{2})",           # 2025-09-06标题...
        r"^(\d{4})年(\d{1,2})月(\d{1,2})日",  # 2025年9月6日标题...
        r"(\d{4})\.(\d{1,2})\.(\d{1,2})",   # 2025.09.06
    ]
    for pattern in patterns:
        match = re.search(pattern, title)
        if match:
            groups = match.groups()
            if len(groups) == 1:
                return date.fromisoformat(groups[0])
            elif len(groups) == 3:
                return date(int(groups[0]), int(groups[1]), int(groups[2]))
    return None
```

#### 层级 2：从正文中提取日期（正则，后端批处理）

```python
def extract_date_from_content(content: str) -> date | None:
    """从正文中提取发布日期"""
    patterns = [
        r"发布时间[：:]\s*(\d{4}-\d{2}-\d{2})",
        r"发布日期[：:]\s*(\d{4}-\d{2}-\d{2})",
        r"(\d{4}-\d{2}-\d{2})\s*发布",
    ]
    for pattern in patterns:
        match = re.search(pattern, content)
        if match:
            try:
                return date.fromisoformat(match.group(1))
            except ValueError:
                continue
    return None
```

#### 层级 3：LLM 日期提取（爬虫侧，重新爬取时使用）

在 `EXTRACT_PROMPT` 中强调日期提取：

```
注意：
1. 日期格式必须为 YYYY-MM-DD
2. 如果正文中有"发布时间"、"发布日期"等字段，优先使用
3. 如果标题中包含日期，也请提取
4. publish_date 字段非常重要，请尽量提取
```

#### 实施建议

1. **立即实施**：在后端 `notice_service.py` 的 `_notice_to_item()` 中，当 `publish_date` 为空时，尝试从标题和正文中提取
2. **批量修复**：编写一次性脚本，遍历所有缺少日期的通知，用正则+LLM补全
3. **爬虫优化**：在下次重新爬取时，优化列表页解析器的日期提取逻辑

---

## 三、实施优先级

| 优先级 | 任务 | 预计工时 | 依赖 |
|---|---|---|---|
| P0 | ✅ 修复筛选选项英文显示 | 0.5h | 无 |
| P0 | 后端数据清洗服务（正文格式+标题日期） | 2h | 无 |
| P0 | 后端日期补全逻辑 | 1h | 无 |
| P1 | 爬虫图片 URL 提取 + 数据库扩展 | 3h | 无 |
| P1 | 前端详情页图片渲染 | 1h | 图片提取 |
| P2 | 批量数据修复脚本（日期、格式） | 2h | 清洗服务 |
| P2 | 爬虫 LLM 格式整理 Prompt | 1h | 无 |
| P3 | 图片本地下载存储 | 3h | 图片提取 |

---

## 四、后续优化方向

1. **内容质量评分**：为每条通知计算内容质量分（字段完整度、格式规范度），低质量数据标记为待审核
2. **增量清洗**：新爬取的数据自动经过清洗管道，确保入库数据质量
3. **HTML 保留渲染**：考虑在前端直接渲染清洗后的 HTML（而非纯文本），保留原始排版
4. **PDF 内容提取**：部分通知以 PDF 附件形式发布，需要 PDF 解析能力
