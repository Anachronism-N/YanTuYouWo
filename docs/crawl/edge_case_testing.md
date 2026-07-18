# 爬虫边界工况测试覆盖（2026-07）

> 本轮目标：最完整的测试 + 覆盖所有工况 + 内容格式整理优化 + 性能/健壮性。
> 通过构建边界测试矩阵「先暴露问题，再修复」，累计 **102 项自动化测试全过**。

---

## 一、测试矩阵

| 测试文件 | 项数 | 覆盖的工况 |
|---------|------|-----------|
| `test_phase3_unit.py` | 12 | 原有核心模块（规则过滤/校验/置信度/列表解析/JSON容错/日期/翻页） |
| `test_summer_camp_precision.py` | 10 | 夏令营/预推免精度 + 源类型分类 + 标题覆盖 LLM |
| `test_tutor_units.py` | 7 | OpenAlex 拼音/消歧/姓名提取 |
| `test_date_inference.py` | 10 | 报名/活动日期推断（含即日起至、跨年、双月日） |
| `test_research_areas.py` | 5 | 研究方向泛化 |
| `test_content_extractor.py` | 5 | 微信/博达/#zoom/导航噪音/行内日期 |
| **`test_list_parser_edge.py`** | **12** | **列表解析边界** |
| **`test_content_format_edge.py`** | **13** | **正文格式整理边界** |
| **`test_filter_date_edge.py`** | **12** | **过滤/日期对抗性边界** |
| **`test_http_layer_edge.py`** | **6** | **HTTP/编码/导航/SPA** |
| **`test_url_utils.py`** | **9** | **URL 规范化/有效性/同域** |
| **`test_storage_snapshot.py`** | **4** | **快照写盘容错** |
| **`test_pagination_resilience.py`** | **1** | **分页单页失败不丢后续** |
| **合计** | **102** | |

运行：
```bash
cd crawl
PYTHONUTF8=1 python -m pytest tests/test_phase3_unit.py tests/test_summer_camp_precision.py \
  tests/test_tutor_units.py tests/test_date_inference.py tests/test_research_areas.py \
  tests/test_content_extractor.py tests/test_list_parser_edge.py tests/test_content_format_edge.py \
  tests/test_filter_date_edge.py tests/test_http_layer_edge.py tests/test_url_utils.py \
  tests/test_storage_snapshot.py tests/test_pagination_resilience.py -q
```

---

## 二、本轮发现并修复的真实缺陷

| # | 缺陷 | 触发 | 修复 |
|---|------|------|------|
| 1 | `NoticeListParser.parse(None)` 崩溃 | None/非字符串 HTML | 入口 `isinstance`+长度守卫返回 `[]` |
| 2 | `relevance_score(None)` 崩溃 | None 标题 | 入口 `isinstance` 守卫返回 `0.0` |
| 3 | 全角空格 `　` / nbsp `\xa0` 残留 | 微信/部分 CMS 正文 | `_clean_text` 阶段0 规整为普通空格 |
| 4 | `\r\n` / `\r` 未规整 | Windows 服务器页面 | 阶段0 统一为 `\n` |
| 5 | 开头面包屑碎片未清除（含被合并的「首页硕士招生」） | 学院通知详情页 | `_clean_text` 阶段7 迭代剥离导航词行 |
| 6 | 日期区间「两个都是月日（无年份）」不解析 | 「活动时间：7月5日—7月9日」 | `_find_date_window_range` 新增 default_year 双月日分支 |
| 7 | `normalize_url(None/空)` 抛 TypeError | None/空 href | 入口守卫返回空串 |
| 8 | 快照写盘失败丢整条通知 | 磁盘满/权限/坏字符 | `save_snapshot` 容错返回 None，不影响入库 |
| 9 | 分页单页失败丢后续所有页 | 翻页遇瞬时失败 break | 跳过失败页 continue，连续 2 页失败才停 |
| 10 | 详情处理串行（全量爬取极慢） | 每条 sleep+fetch+LLM 串行 | 拆分 prepare(并发) + store(串行)，约 3× 提速 |

---

## 四、性能与健壮性改进（本轮）

- **详情处理并发化**：`detail_crawler` 拆分 `_prepare_notice`（网络/CPU，并发）+
  `_store_notice`（DB，串行）；`NoticeProcessor` 用 `asyncio.gather` 并发 prepare
  （Semaphore=3），DB 写入串行避免 `database is locked`。全量爬取耗时大幅下降。
  验证：东南源并发路径入库 12 条，分类正确。
- **快照容错**：写盘失败返回 None，通知照常入库（raw_html_path 可空）。
- **分页健壮性**：单页失败跳过、连续 2 页失败才停，避免瞬时抖动丢失整段历史通知。
- **内容选择器扩展**：`#zoom`、`#font`、con/art_content、main_text 系列等高校常见容器。
- **年份阈值相对化**：旧通知跳过阈值 `<2023` → `datetime.now().year-3`，未来自适应。

---

## 三、覆盖的工况矩阵（「任何情况都能爬」）

**列表解析**：空/None/畸形 HTML、纯导航页、7 种日期格式、表格/卡片/无日期/title 属性/多容器择优、SPA 空容器、相对-绝对-协议相对 URL、分页（共X页/1/X/?page=/无）。

**正文与格式**：全角/nbsp 空格、Windows 换行、内联发布时间/浏览次数/编辑分享/上下篇/版权噪音、日期拆散、编号列表（含碎片合并）、空行折叠、开头导航碎片、综合噪音混合。

**HTTP 层**：GBK/GB2312/UTF-8/big5/无 meta 编码检测、header charset 优先、导航页判定、Vue/React SPA 检测、HTTP/2 降级。

**过滤/日期/分类**：空/None/纯英文标题、矛盾信号（推免 vs 统考，推免优先）、多截止日、非法日期过滤、跨年区间、源类型边界。

---

## 四、真实端到端回归

`scripts/e2e_probe.py --no-llm`（6 所可访问 985 研招办）：**解析 181 / 过滤 109 / 高相关 69**，与改动前一致——所有边界修复未引入回归。统考/在职/定向博士拟录取正确归为「统考招生」。
