# 导师爬取流程优化记录（2026-07）

> 衔接 `summer_camp_optimization.md`。夏令营/预推免优化达到稳健里程碑后，
> 按 `/goal` 要求进入导师爬取流程优化。
> 仍在 `optimize/summer-camp-pre-admission` 分支。

---

## 一、目标与现状

导师爬虫已较成熟（见 `tutor_crawler.md`，v2.0 AMiner 级深度抽取）：

| 阶段 | 模块 | 现状 |
|------|------|------|
| A 师资页定位 | `faculty_locator.py` | 六层级联，已发现 435 源 |
| B1 基础卡片 | `faculty_list_parser.py` | 568 位教师入库 |
| B2 LLM 画像 | `profile_extractor.py` | 376 位 tier1 |
| C OpenAlex | `enrichers/openalex_enricher.py` | 282 位深度数据 |

本轮目标：补**环境健壮性缺口** + **真实验证** + **回归测试**，而非推倒重做。

---

## 二、发现的问题

| # | 问题 | 根因 | 影响 |
|---|------|------|------|
| 1 | OpenAlex 中文姓名匹配失效 | `pypinyin` 未声明为依赖；缺失时退化为原始中文名搜索 | 命中率骤降（导师核心学术数据拉不到） |
| 2 | 缺少回归测试 | pinyin/disambiguation/姓名提取无单测 | 重构易回归 |

> 说明：`pyproject.toml` 未列 `pypinyin`，`openalex_enricher.py` 用 `try/except ImportError`
> 静默降级。在干净环境部署时 OpenAlex 几乎匹配不到中文教师——这是文档「命中率 50%」
> 之外、纯粹由环境造成的人为劣化。

---

## 三、改动

### 3.1 声明 pypinyin 依赖（`pyproject.toml`）

```toml
"pypinyin>=0.50.0",   # 导师 OpenAlex：中文姓名→拼音（缺失会导致命中率骤降）
```

实测（黄永刚 / 北京理工大学）：pypinyin 就位后
`enrich_from_openalex` → `status=ok, method=matched_institution, h=155, works=695`，6s 返回。

### 3.2 导师核心逻辑单元测试（`tests/test_tutor_units.py`，7 项）

| 测试 | 覆盖 |
|------|------|
| `test_pinyin_variants` | 中文姓名 → 西式/中式拼音变体 |
| `test_disambiguate_prefers_institution_match` | **同名时优先本校候选，避免把同名名人错配给本校教师** |
| `test_disambiguate_no_match_when_no_institution_and_ambiguous` | 多候选 + 无机构匹配 + 名字不精确 → 拒绝错配 |
| `test_restore_abstract_inverted_index` | OpenAlex inverted index 还原 |
| `test_extract_name_prefix_strips_title_and_email` | 从「李未教授」「钱德沛教授depeiq@…」剥离姓名 |
| `test_looks_like_name_surname_whitelist` | 姓氏白名单 + 职称/噪音过滤 |
| `test_parse_faculty_list_minimal_html` | 师资列表 HTML 解析，姓名干净无职称/邮箱残留 |

`python -m pytest tests/test_phase3_unit.py tests/test_summer_camp_precision.py tests/test_tutor_units.py -q`
→ **23 passed**（16 通知 + 7 导师）。

---

## 四、真实验证（2026-07）

### 4.1 阶段 A → B1（北航计算机学院）

```
locate_faculty_pages(https://scse.buaa.edu.cn/) 
  → 命中 https://scse.buaa.edu.cn/szdw/qtjs.htm (score=80, nav_keyword)
parse_faculty_list(qtjs.htm)
  → 12 位教师，全部 title=教授 + homepage，10/12 有邮箱
  → 姓名 100% 干净：李未 / 郑志明 / 钱德沛 / 熊璋 / 李波 / 马殿富 …
```

关键：页面 `/info/1078/` 详情链接仅 12 个，解析 12/12，**非解析缺口**（其余教师在
分页 qtjs2.htm，由 `detect_pagination` 覆盖）。链接文本「钱德沛教授depeiq@buaa.edu.cn」
被正确拆成 name=钱德沛 / title=教授 / email。

### 4.2 阶段 C（OpenAlex，黄永刚/北理工）

```
status=ok, method=matched_institution, h=155, works=695, 6.0s
topics: Advanced Sensor and Energy Harvesting Materials / Advanced Materials and Mechanics / …
```

---

## 五、未改动但已验证的设计要点

- **消歧防同名错配**：搜索「北理工 黄永刚」时，即便存在高产的西北大学同名名人
  （works=695），只要候选里有北理工机构匹配项（works=10），后者胜出——见
  `test_disambiguate_prefers_institution_match`。
- **B1 局部卡片约束**：`_find_local_card` 限定卡片 < 800 字符，避免命中整页（这是
  文档记载「周成虎邮箱误匹」的修复点，本轮用单测固化）。

---

## 六、后续待办（沿用 `tutor_crawler.md` 第十节）

1. ~~`research_area=人工智能 命中 0`~~：**已在爬虫侧缓解**（见下「研究方向泛化」），
   后端若额外做同义词/语义检索可进一步提升。
2. OpenAlex 50% 命中率上限：很多国内教师无英文论文，OpenAlex 本身无索引；可接 AMiner。
3. 瑞数反爬高校（川大/兰大）师资页仍不可达。
4. 全量 39 校师资页定位（阶段 A）需 5-7h，建议季度跑。

---

## 七、补充（2026-07，研究方向泛化 + 报名日期兜底）

### 7.1 研究方向泛化（缓解「人工智能 命中 0」）

`src/tutor/research_areas.py`：B2 提取后把具体方向映射到用户常搜的宽泛类别，
并入 `research_areas`（具体项保留、去重、长度上限 15）。如「深度学习/图像识别/目标检测」
→ 追加「人工智能/计算机视觉」。覆盖 17 个宽泛类别（CV/NLP/语音/机器人/安全/数据挖掘/
软件工程/数据库/系统/网络/AI/控制/信号/微电子/生物信息/材料/量子）。

仅做关键词映射，不删具体项，精确性不受损；后端按子串检索 `research_areas` 即可命中泛词。

### 7.2 报名/活动日期兜底（夏令营/推免，详见 `summer_camp_optimization.md`）

导师侧未改动，但通知侧新增 `src/processor/date_inference.py`，对夏令营/预推免
通知在 LLM 漏提时用正则补全 `registration_end`/`camp_start` 等。

### 7.3 测试

`tests/test_research_areas.py`（5 项）+ `tests/test_date_inference.py`（9 项），
全量 **39 项测试通过**。
