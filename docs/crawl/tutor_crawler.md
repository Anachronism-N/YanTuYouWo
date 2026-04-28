# 导师爬虫系统设计

> 编写日期：2026-04-28
> 版本：v2.0（**AMiner 级深度抽取**，含完整论文列表 + 合作者网络 + 研究主题分布 + 年度趋势）

---

## 一、设计目标

为 985 高校的全部教师（估算 4-8 万）建立"分级数据画像"：

| 层级 | 字段 | 比例 | 数据来源 |
|---|---|---|---|
| **Tier 1** 完整画像 | 简介 + 教育 + 工作 + 论文 + 项目 + 获奖 + 招生要求 | ~10% | LLM 抽取教师主页 + OpenAlex |
| **Tier 2** 基础卡片 | 姓名 + 职称 + 研究方向 + 主页 + 邮箱 + 头像 | ~60% | 学院师资页 启发式解析 |
| **Tier 3** 仅外链占位 | 仅姓名 + 学校 + 院系 | ~30% | 占位（反爬/无列表） |

不追求对所有教师都有完整画像，根据可获取信息的丰富程度自动分档。

---

## 二、四阶段架构

```
┌──────────────────────────────────────────────────────────┐
│ 阶段 A：师资页定位（faculty_locator）                     │
│   依赖：departments 表 (1591 个)                          │
│   产出：faculty_page_sources                              │
│   策略：6 层级联（与 notice_page_locator 对称）           │
└────────────────────────┬─────────────────────────────────┘
                         ▼
┌──────────────────────────────────────────────────────────┐
│ 阶段 B1：基础卡片解析（faculty_list_parser）              │
│   依赖：faculty_page_sources                              │
│   产出：tutors（Tier 2 基础信息）                         │
│   策略：CMS 模板 → 启发式 → 结构检测 → LLM 兜底           │
│   特性：分页 + 类别中转页自动回退                         │
└────────────────────────┬─────────────────────────────────┘
                         ▼
┌──────────────────────────────────────────────────────────┐
│ 阶段 B2：LLM 详情提取（profile_extractor）                │
│   依赖：tutors.homepage_url                               │
│   产出：升级到 Tier 1（biography/publications/projects 等)│
│   策略：抓主页 → 内容抽取 → LLM 结构化 → 字段校验          │
└────────────────────────┬─────────────────────────────────┘
                         ▼
┌──────────────────────────────────────────────────────────┐
│ 阶段 C：外部数据补充（enrichers/*）                       │
│   依赖：tutors.name + university                          │
│   产出：h_index / citation_count / recent_papers          │
│   数据源：OpenAlex（首选）→ AMiner / 百度学术（待接入）    │
└──────────────────────────────────────────────────────────┘
```

---

## 三、数据模型

### 3.1 表结构

```python
class Tutor:
    # ─── 基础信息（B1 阶段产出）───
    name: str                    # 姓名
    title: str                   # 职称
    research_areas: list[str]    # 研究方向
    homepage_url: str | None     # 个人主页
    email: str | None            # 邮箱
    avatar_url: str | None       # 头像
    discipline: str              # 学科门类

    # ─── 招生信息（B2 阶段产出）───
    is_recruiting: bool
    recruiting_info: str         # 招生方向描述
    recruiting_requirements: str # 招生要求

    # ─── 详细内容（Tier 1 才有，B2 LLM 抽取）───
    biography: str               # 个人简介
    education: list              # 教育经历 [{year, degree, school, major}]
    experience: list             # 工作经历 [{year, title, organization}]
    publications: list           # 代表论文 [{title, venue, authors, year}]
    projects: list               # 科研项目 [{title, funder, role, year}]
    awards: list[str]            # 获奖情况

    # ─── 学术指标（C 阶段补充）───
    paper_count: int
    project_count: int
    h_index: int | None          # OpenAlex
    citation_count: int | None
    recent_papers: list          # OpenAlex 近期论文

    # ─── 质量控制 ───
    crawl_tier: str              # tier1/tier2/tier3
    profile_completeness: int    # 0-100
    crawl_source: str            # official/openalex/aminer/manual
    external_ids: dict           # {openalex_id, aminer_id, ...}
    last_crawled_at: datetime

    # ─── 关系 ───
    university_id, department_id

class FacultyPageSource:
    """阶段 A 产出"""
    department_id, source_url
    source_type: str             # advisor_list / faculty_list / faculty_by_title
    priority: int
    validation_score: int        # 0-100
    discovery_method: str        # nav_keyword/url_pattern/playwright/llm/path_guess

class TutorCrawlLog:
    """每阶段每位教师的爬取日志"""
    tutor_id, faculty_source_id
    stage: str                   # A_locate / B1_list / B2_profile / C_enrich
    status: str                  # success/failed/no_match/...
    duration_seconds: float
    fields_extracted: list[str]
```

### 3.2 Completeness 评分

| 字段 | Tier 2 加分 | Tier 1 加分 |
|---|---|---|
| 姓名（必有） | 15 | — |
| `homepage_url` | 15 | — |
| `title` | 10 | — |
| `email` | 10 | 5 |
| `avatar_url` | 5 | — |
| `research_areas` | 5 | 15 |
| `biography` | — | 20 |
| `education` | — | 10 |
| `experience` | — | 10 |
| `publications` | — | 20 |
| `projects` | — | 8 |
| `awards` | — | 5 |
| `recruiting_info` | — | 7 |
| `h_index`（OpenAlex） | — | +5 |
| `recent_papers`（OpenAlex） | — | +5 |
| **上限** | **60** | **100** |

`completeness >= 60` 自动升级为 Tier 1。

---

## 四、阶段 A：师资页定位（`faculty_locator.py`）

### 4.1 策略级联（六层）

```python
F1 导航关键词（博导/师资队伍/faculty）
   ↓ < 2 候选
F2 全文链接扫描 + URL 路径特征（/szdw /bdmd /faculty）
   ↓ 0 候选
F3 Playwright 渲染（处理 SPA / 动态菜单）
   ↓
F4 LLM 智能分析页面结构
   ↓
F5 子路径猜测（16 种常见路径，如 `/szdw/index.htm`）
   ↓
F5.5 子路径学院 → 父站点扫描
   ↓
F6 研究生院"博导名录"回退
```

### 4.2 关键词配置

```python
PRIORITY_KEYWORDS = [
    # 优先级 1：博导/硕导名录
    ["博士生导师", "硕士生导师", "博导", "硕导", "导师名录", ...],
    # 优先级 2：师资队伍
    ["师资队伍", "教师队伍", "全体教师", "faculty", "people", ...],
    # 优先级 3：按职称分组
    ["教授", "副教授", "特聘教授", ...],
]

URL_PATH_PATTERNS = [
    (r"/bdmd",       "advisor_list"),
    (r"/szdw",       "faculty_list"),
    (r"/jsdw",       "faculty_list"),
    (r"/faculty",    "faculty_list"),
    (r"/people",     "faculty_list"),
    ...
]
```

### 4.3 验证评分（满分 100）

| 信号 | 分数 |
|---|---|
| 中文姓名风格链接 ≥ 20 / ≥ 10 / ≥ 5 | 30 / 25 / 15 |
| 职称关键词出现 ≥ 15 / ≥ 8 / ≥ 3 次 | 25 / 20 / 10 |
| 头像 + 姓名 配对 ≥ 10 / ≥ 5 / ≥ 2 个 | 15 / 10 / 5 |
| 邮箱 ≥ 5 个 | 10 |
| 页面标题含"师资/教师/导师/faculty" | 10 |
| 分页组件存在 | 5 |
| URL 路径匹配补偿 | 至少 30 |
| JS 动态页面（标题对但 0 姓名） | 至少 35 |
| **静态展示页降分**（"概况/简介/介绍"） | 上限 15 |

得分 ≥ 30 → 入库。

---

## 五、阶段 B1：基础卡片解析（`faculty_list_parser.py`）

### 5.1 解析策略（四层）

```python
1. CMS 模板匹配
   - 博达站群 .news_list li
   - 自研模板 .teacher-card / .faculty-item / .person-list li

2. 启发式（主力）
   姓氏白名单（700+ 常用姓氏）
   + 教师详情 URL 特征（/info/xxx/yyy.htm 等 13 种模式）
   + 职称近邻匹配（卡片局部容器内）

3. 结构检测
   找到包含 ≥ 5 个姓名的最大容器
   迭代直接子元素，每个视为一个教师卡片

4. LLM 兜底（占位）
```

### 5.2 姓名识别细节

```python
# "杨芙清" → name="杨芙清"  ✓
# "高文职称：教授 中国工程院院士" → name="高文"  ✓
# "约翰·爱德华·霍普克罗夫特" → 完整外籍名  ✓
# "李未教授" → 拒绝（含职称 keyword）  ✓
# "全体教师" → 拒绝（在 _NOISE_TEXTS 名单中）  ✓
```

姓名边界正则：

```python
_NAME_BOUNDARY_RE = re.compile(
    r"(?:职称|职务|性别|男|女|博导|硕导|博士|硕士|"
    r"教授|副教授|研究员|讲师|"
    r"[Pp]rofessor|[Aa]ssociate|"
    r"[\s\u3000]|[:：,，、、。\.\(（;；])"
)
```

### 5.3 局部容器搜索

`_find_local_card`：向上找最近的 `<li>`/`<tr>`/`<dd>`/`<article>` 或带 class 的 `<div>`，**总文本 < 800 字符**才认作合法卡片，避免命中整页。这是修复"周成虎邮箱误匹"等问题的关键。

### 5.4 类别中转页自动回退

部分学院首页只是分类入口（如南开博导名录页指向"教授/副教授/讲师"等子链）。`tutor_orchestrator` 检测到 0 条结果 + 多个职称类子链时，自动访问每个子分类页（含分页）抓全部教师。

### 5.5 默认 title 兜底

```python
_URL_TITLE_HINTS = [
    (r"/(bssds|bsds|bdmd|博导)", "博士生导师"),
    (r"/(ssds|sssds|sdml)", "硕士生导师"),
    (r"/(ys|院士)", "院士"),
    (r"/(zjjs|qtjs|jsml)", "教授"),
    ...
]
```

页面 URL 含 `bssds` → 所有抓到的姓名默认 title="博士生导师"。

---

## 六、阶段 B2：LLM 详情提取（`profile_extractor.py`）

### 6.1 流程

```python
async def extract_profile(homepage_url, name, university, department) -> dict:
    1. 抓 HTML（httpx → Playwright 降级）
    2. 内容抽取（复用 parser.content_extractor，截断到 6000 字）
    3. LLM 调用（Qwen2.5-32B-Instruct，超时 90s，重试 2 次）
    4. JSON 解析（三级容错：直接 → 去 code fence → 提取首个 {...}）
    5. 字段校验（_VALID_TITLES, 长度限制, 黑名单过滤）
    6. completeness 评分
```

### 6.2 Prompt（节选）

```
你是学术信息结构化提取助手。以下是 {university} {department} {name} 教授的个人主页正文（已清洗）。

请提取并返回 JSON 格式（未提及的字段填 null 或空数组）：
{
  "title": "职称",
  "research_areas": [...],
  "email": "邮箱",
  "biography": "100-300 字的个人简介摘要（中文）",
  "education": [{"year": "2005-2010", "degree": "博士", "school": "...", "major": "..."}],
  "experience": [...],
  "publications": [{"title": "...", "venue": "CVPR 2024", "year": 2024}],
  "projects": [...],
  "awards": [...],
  "recruiting_info": "...",
  "is_recruiting": true
}

要求：
1. 不要编造：原文中没有的信息一律填 null/空数组
2. publications 最多 10 篇代表作
3. research_areas 必须是 2-15 字的研究领域名词
4. biography 必须是单段中文文本
```

### 6.3 字段校验

- `title` 长度 2-50；`research_areas` 每项 2-30 字 + 不含 `@` 或 6+ 数字；`biography` 至少 30 字符
- `publications` / `projects` / `education` 数组项数限制（最多 12/10/8）
- `awards` 每条 3-200 字符
- 字符串字段值为 "null"/"none"/"n/a" 自动剔除

### 6.4 性能 / 成本

POC 实测（北航 70 位老师）：

| 指标 | 数值 |
|---|---|
| 成功率 | 100%（70/70）|
| 平均耗时 | 17s/位（含 1.5s 抓页 + 15s LLM）|
| 平均完整度 | 69.9/100 |
| Tier 1 升级数 | 63 位（90%）|
| LLM 平均 token | ~3500 输入 + ~600 输出 |
| 成本估算 | 约 ¥0.05/位（Qwen2.5-32B 推理）|

---

## 七、阶段 C：OpenAlex 补充（`enrichers/openalex_enricher.py`）

### 7.1 OpenAlex API

- **接口**：
  - `GET /authors?search={name}` 搜索作者
  - `GET /works?filter=author.id:{id}&sort=cited_by_count:desc&per-page=50` 拉作者论文
- **免费、无需 key**（建议在 mailto 字段填邮箱，进入 polite-pool 优先级）
- **频控**：单 IP 默认 10 req/sec，本爬虫保守设为 5 req/sec（200ms 间隔）+ 429 指数退避（2/4/8s）

### 7.1.1 抽取的字段

**作者级**：
- `summary_stats.{h_index, i10_index, 2yr_mean_citedness}`
- `cited_by_count` 总被引
- `works_count` 总论文数
- `affiliations[]` 所有任职机构（含年份）
- `topics[]` 具体研究主题（每个含 `count` 论文数 + `subfield`）
- `x_concepts[]` 广义概念（如 Computer Science，含 score 0-1）
- `counts_by_year[]` 年度统计

**论文级**（每位最多 50 篇，按被引倒序）：
- `title` / `display_name`
- `primary_location.source.display_name` → fallback `raw_source_name`：venue
- `publication_year`
- `cited_by_count`
- `abstract_inverted_index` → 还原为完整摘要
- `authorships[]` → 提取作者列表 + 合作者聚合
- `doi`, `landing_page_url`
- `type`（article / preprint / proceedings-article / chapter / book）

**合作者聚合**（从论文 `authorships` 反推）：
- 排除目标作者本人
- 按合作次数倒序，取前 20 位
- 每位含 `name` / `openalex_id` / `works_together_count` / `last_year`

### 7.2 三阶段消歧

```python
1. 多种姓名变体查询
   - 拼音西式：王睿杰 → "Ruijie Wang"
   - 拼音中式：→ "Wang Ruijie"
   - 中文：→ "王睿杰"（兜底）

2. 机构匹配（必须）
   候选 author 的 affiliations 中包含目标学校英文名变体
   - 北京大学 → "Peking University", "Beijing University"
   - 中山大学 → "Sun Yat-sen University", "Sun Yat Sen University"

3. 综合评分
   score = 机构匹配 × 100 + 名字相似度 × 50 + works_count × 0.05
```

### 7.3 兜底策略

- 候选数 ≤ 3 + 没有机构匹配 → 选 works_count 最高的（≥ 30 篇）
- 候选数 > 3 + 没有机构匹配 → 拒绝（避免误匹配）

### 7.4 性能

实测（568 位老师，深度版 v2.0）：

| 指标 | 数值 |
|---|---|
| 命中率 | 49.6%（282/568）|
| 平均 h-index | 24.1 |
| 平均拉到论文数 | 50 篇 / 命中作者 |
| 平均合作者数 | 20 位 / 命中作者 |
| 平均研究主题数 | 6 个 / 命中作者 |
| 平均年度跨度 | 17 年 / 命中作者 |
| API 限流 | 200ms / 请求 + 429 指数退避 |
| 总耗时 | ~6 分钟（concurrency=5）|

### 7.5 数据样例（黄永刚，北京理工大学）

```
学术指标: h=154, i10=478, citations=93578, works=691
论文（50 篇 Top 引用）:
  [2010] Materials and Mechanics for Stretchable Electronics (Science, 4845 引)
  [2011] Epidermal Electronics (Science, 4557 引)
  [2010] Dissolvable films of silk fibroin (Nature Materials, 1692 引)
  ...
合作者（20 位）:
  John A. Rogers (合作 27 篇)
  Yihui Zhang (合作 12 篇)
  ...
研究主题（6 个）:
  Advanced Sensor and Energy Harvesting Materials (313 篇)
  Advanced Materials and Mechanics (150 篇)
  Neuroscience and Neural Engineering (76 篇)
  ...
年度趋势（17 年）:
  2024: 5 篇 / 458 引
  2023: 3 篇 / 2226 引
  ...
```

---

## 八、运行命令

```bash
cd crawl

# 0. 初始化新表（首次执行 / 旧 DB 迁移）
.venv/bin/python scripts/init_tutor_tables.py --db data/large_scale_test.db

# 阶段 A：师资页定位（季度跑一次，预计 5-7 小时）
.venv/bin/python scripts/run_faculty_discovery.py \
    --db data/large_scale_test.db --only-missing --concurrency 4

# 阶段 B1：基础卡片入库（每月跑，预计 1-2 小时）
.venv/bin/python scripts/run_tutor_crawl.py \
    --db data/large_scale_test.db --max-pages 5 --concurrency 3

# 阶段 B2：LLM 详情提取（每季度，可按学院分批控制 LLM 成本）
.venv/bin/python scripts/run_tutor_profile.py \
    --db data/large_scale_test.db --department 计算机 --concurrency 3

# 阶段 C：OpenAlex 增量补充（每月）
.venv/bin/python scripts/run_tutor_enrich.py \
    --db data/large_scale_test.db --skip-existing --concurrency 5
```

### 增量模式

| 脚本 | 增量参数 | 说明 |
|---|---|---|
| `run_faculty_discovery.py` | `--only-missing` | 只处理 `faculty_page_sources` 表中没有记录的学院 |
| `run_tutor_crawl.py` | （内置去重）| `(department_id, name)` 唯一约束，重复运行不会插入重复教师 |
| `run_tutor_profile.py` | `--only-tier2` | 只处理尚未升级到 tier1 的教师（默认开启）|
| `run_tutor_enrich.py` | `--skip-existing` | 跳过已有 `h_index` 的教师 |

---

## 九、当前状态（2026-04-28，AMiner 级深度版）

| 阶段 | 状态 | 数据量 |
|---|---|---|
| Phase A（师资页发现） | 🔄 进行中 | 435 个 source / 187 学院（11 校） |
| Phase B1（Tier 2 入库） | ✅ 完成 | 568 位教师 |
| Phase B2（LLM Tier 1） | 🔄 进行中 | **376 位升级到 tier1**，平均 completeness ~70/100 |
| Phase C（OpenAlex 深度） | ✅ 完成 | **282 位** 含完整论文+合作者+主题+年度（h=24.1 平均）|

### 9.1 数据完整度

```sql
SELECT
  SUM(CASE WHEN biography IS NOT NULL AND biography != '' THEN 1 ELSE 0 END) AS bio,        -- 158
  SUM(CASE WHEN publications IS NOT NULL AND publications != '[]' THEN 1 ELSE 0 END) AS llm_pubs,  -- 21+
  SUM(CASE WHEN papers IS NOT NULL AND papers != '[]' THEN 1 ELSE 0 END) AS deep_papers,    -- 282
  SUM(CASE WHEN coauthors IS NOT NULL AND coauthors != '[]' THEN 1 ELSE 0 END) AS coauths,  -- 282
  SUM(CASE WHEN topics IS NOT NULL AND topics != '[]' THEN 1 ELSE 0 END) AS topics_n,       -- 282
  SUM(CASE WHEN h_index IS NOT NULL THEN 1 ELSE 0 END) AS hidx,                              -- 339
  SUM(CASE WHEN avatar_url IS NOT NULL THEN 1 ELSE 0 END) AS av,                            -- 202
  SUM(CASE WHEN email IS NOT NULL THEN 1 ELSE 0 END) AS em                                  -- 142
FROM tutors;
```

### 9.2 顶级数据样本

按 h-index 排序的真实数据（前 5 位）：

| 名字 | 学校 | h | i10 | 论文 | 完整度 | 数据维度 |
|---|---|---|---|---|---|---|
| 黄永刚 | 北京理工大学 | **154** | 478 | 691 | 73/100 | 50 篇 + 20 合作者 + 6 主题 + 17 年 |
| 马波 | 北京理工大学 | 122 | 417 | 732 | 73/100 | 50 + 20 + 6 + 17 |
| 邓磊 | 中南大学 | 26 | 64 | 90 | 73/100 | 50 + 20 + 6 + 12 |

详细统计：

```
SELECT crawl_tier, COUNT(*) FROM tutors GROUP BY crawl_tier;
tier1|105
tier2|463

SELECT
  SUM(CASE WHEN biography IS NOT NULL THEN 1 ELSE 0 END) AS with_bio,
  SUM(CASE WHEN h_index IS NOT NULL THEN 1 ELSE 0 END) AS with_h,
  SUM(CASE WHEN email IS NOT NULL THEN 1 ELSE 0 END) AS with_email,
  SUM(CASE WHEN avatar_url IS NOT NULL THEN 1 ELSE 0 END) AS with_avatar
FROM tutors;
69 | 286 | 142 | 202
```

---

## 十、已知限制与未来工作

### 当前限制

- **OpenAlex 命中率 50%**：很多国内教师不发英文论文，OpenAlex 无索引
- **B2 LLM 成本**：粗估全量 5 万人 × ¥0.05 = ¥2500（一次性投入）
- **瑞数反爬**：四川大学/兰州大学等使用瑞数 WAF，Playwright 也无法绕过
- **微信公众号链接**：少数老师的 publications 页面是 `mp.weixin.qq.com`，无法抓取
- **`research_area=人工智能` 命中 0**：LLM 抽取的方向是更具体的术语（如"基于 AI 的网络安全"），泛词 fallback 不够好

### 未来工作

1. **AMiner enricher**：作为 OpenAlex 的备选数据源（中文学者覆盖更全）
2. **DBLP enricher**：CS 领域交叉验证 + 论文准确度提升
3. **同义词扩展 / 语义检索**：让"人工智能"可以命中"AI"、"机器学习"等
4. **自适应增量**：检测教师主页是否更新（HTML hash），仅对变化的重新跑 B2
5. **手动校正端点**：`POST /api/admin/tutors/{id}/edit` 让管理员修正错误数据
6. **统一头像 CDN**：把抓到的 avatar_url 镜像到自建对象存储，避免学院网站挂掉时图片丢失

---

## 附录：与现有爬虫系统的差异

| 维度 | 通知爬虫（已有）| 导师爬虫（新增） |
|---|---|---|
| 目标实体 | 推免通知（增量）| 导师（半静态） |
| 数据周期 | 每日 2 次 | 季度 1 次 |
| LLM 用量 | 分类（Qwen 7B）+ 提取（32B） | 提取（32B），无分类 |
| 主页抓取 | 详情页 | 个人主页（多样化）|
| 多页支持 | ✅ 复用 | ✅ 复用 `detect_pagination` |
| 反爬降级 | ✅ 复用 | ✅ 复用 `anti_crawl_fallback` |
| 外部数据源 | 无 | OpenAlex（已接入）/ AMiner（待） |

整体复用了 ~70% 的现有基础设施（HTTP 客户端、反爬、Playwright 降级、LLM 客户端、URL 工具、内容抽取器）。
