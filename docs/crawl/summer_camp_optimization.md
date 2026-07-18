# 夏令营 / 预推免爬取优化记录（2026-07）

> 本轮聚焦「保研（推免）」平台的核心数据——夏令营与预推免信息的爬取质量。
> 所有改动均在 `optimize/summer-camp-pre-admission` 分支，逐项 commit，可整体回退。
> 上一轮的总体记录见 `data_quality_optimization.md`。

---

## 一、目标

把夏令营 / 预推免爬取从「初始可用」推进到「精准可用」：

1. **召回**：真实招生列表页能稳定抓取、正确解析出通知条目。
2. **精度（核心）**：把「统考 / 在职 / 定向 / 非全 / 专项博士」等**非推免渠道**
   与「夏令营 / 预推免」严格区分，不让统考噪音污染保研信息。
3. **健壮性**：在缺少 `h2` 包等常见环境下爬虫不整体崩溃。

---

## 二、发现的真实问题（端到端探针验证）

用 `scripts/e2e_probe.py` 对 10 所可访问的 985 研招办页跑真实抓取，发现：

| # | 问题 | 根因 | 严重度 |
|---|------|------|--------|
| 1 | **所有请求静默失败** | `http_client` 硬编码 `http2=True`，未装 `h2` 时每个请求抛 `ImportError` 被吞 | 🔴 致命 |
| 2 | 统考内容被误判推免类 | `infer_program_type` 把「初试考试大纲」「在职博士拟录取」判为「招生简章/拟录取」 | 🔴 高 |
| 3 | LLM 渠道误判不被纠正 | `infer_program_type` 只在 LLM 返回「其他」时纠正；LLM 说「拟录取」就照单全收 | 🔴 高 |
| 4 | 过期通知长期高分 | 2018/2019 年夏令营/拟录取仍挂列表页，`relevance_score` 无降权 | 🟡 中 |
| 5 | 凭证只能放 repo 内 | `config.py` 只读 CWD 的 `.env`，无法从仓库外加载密钥 | 🟡 中 |

---

## 三、改动清单

### 3.1 HTTP/2 优雅降级（`src/utils/http_client.py`）

- 新增 `_http2_available()`，启动时检测 `h2` 包。
- 未安装时自动降级为 HTTP/1.1 并打印一次告警，而非每个请求抛异常。
- **效果**：在未装 `h2` 的环境（如本次开发机）爬虫从「0% 成功率」恢复到正常。

### 3.2 凭证外部加载（`src/config.py`）

- `Settings` 实例化前，按优先级 `load_dotenv`：
  1. `$YANTU_ENV_FILE` 指定文件
  2. 仓库根之上的 `ytyw/.env`（位于 git 仓库外）
  3. CWD 的 `.env`
- **效果**：真实 API key 无需放进 git 工作树，避免误提交泄露。

### 3.3 渠道消歧：统考 vs 推免（`src/processor/rule_filter.py`）

`infer_program_type` 重构为「**渠道以标题强信号为准**」：

```
1. 标题有「夏令营/暑期学校/研学营…」          → 夏令营
2. 标题有统考/在职/定向/非全/专项/初试… 且无推免 → 统考招生  ← 覆盖 LLM
3. 标题明确「推免/推荐免试/免试攻读」          → 拟录取/入营名单/预推免
4. 直博 / 硕博连读（明确字样）
5. 标题无强渠道信号                           → 信任 LLM 有效分类
6. LLM 给「其他」时                           → 标题兜底推断
```

**关键点**：第 2 步**覆盖 LLM**。真实场景里 LLM 会把「在职攻读博士拟录取名单」
判为「拟录取」（推免类），第 2 步凭标题里的「在职攻读博士」强制纠正为「统考招生」。

`relevance_score` 新增**过期年份降权**：标题含 `20NN级/年` 且 `NN≤23` 时 `-0.6`，
让 2018/2019 旧通知不再占据高分前列。日期前缀（`2025-12-24标题…`）不误判。

### 3.4 LLM Prompt 优化（`src/llm/prompts.py`）

- `CLASSIFY_PROMPT`：放宽夏令营判定（即使行文用「科创硕士」等表述，本质是夏令营
  选拔研究生即「相关」），减少假阴性；明确统考/在职/定向为「不相关」。
- `EXTRACT_PROMPT`：`program_type` 新增「统考招生」；明确「在职/定向/非全/专项/
  申请考核制博士不是推免，应归统考招生而非拟录取」；强调报名截止日期对用户最关键。

### 3.5 校验枚举（`src/crawler/detail_crawler.py`）

- `_validate_and_fix` 的 `valid_types` 增补「统考招生」，与 9 类分类体系一致。

---

## 四、验证

### 4.1 单元 / 回归测试

`tests/test_summer_camp_precision.py`（8 项，标题全部来自真实爬取）：

| 测试 | 覆盖 |
|------|------|
| 夏令营识别 | 2027暑期夏令营、智荟深蓝夏令营… → 夏令营 + 高分 |
| 预推免识别 | 2027接收推荐免试研究生报名通知… → 预推免 + 高分 |
| 推免拟录取识别 | 2026拟录取推免硕士（直博）名单 → 拟录取（非统考） |
| 统考渠道归类 | 初试考试大纲/在职博士/非全博士/定向博士/专项博士… → 统考招生 |
| 过期年份降权 | 2019级/2018年 同款标题得分低于新鲜标题 |
| 推免排序高于统考 | 批量过滤后推免类排在统考类前 |
| 日期前缀不误判 | `2025-12-24…` 不触发过期降权 |
| 标题覆盖 LLM 误分类 | LLM 说「拟录取」+ 标题在职 → 统考招生 |

`pytest tests/test_phase3_unit.py tests/test_summer_camp_precision.py -q` → **16 passed**。

### 4.2 真实管线端到端（`scripts/validate_process_notice.py`）

对东南大学、天津大学研招办跑生产 `process_notice`：

| 通知 | 优化前 | 优化后 |
|------|--------|--------|
| 东南 2027 接收推荐免试研究生报名通知 | 预推免 | 预推免 ✓（summary 准确） |
| 天津 2027 优秀大学生暑期夏令营 | 夏令营 | 夏令营 ✓ |
| 天津 宣怀学院 科创硕士夏令营 | 夏令营 | 夏令营 ✓（conf=1.0，reg=2024-06-05~19，camp=06-26~07-10） |
| 天津 新质生产力专项博士招生简章 | **招生简章** | **统考招生** ✓ |
| 东南 在职攻读博士拟录取名单 | **拟录取** | 被过滤（非推免）/ 统考招生 |

---

## 五、运行 / 复现

```bash
cd crawl

# 1. 凭证：在仓库之外放 key（ytyw/.env），crawl/.env 留空占位
#    SILICONFLOW_API_KEY=sk-...

# 2. 跑测试
python -m pytest tests/test_phase3_unit.py tests/test_summer_camp_precision.py -q

# 3. 列表页探针（无需 LLM，快）
CRAWL_DELAY_MIN=0 CRAWL_DELAY_MAX=0.5 python scripts/e2e_probe.py --no-llm

# 4. 端到端探针（含 LLM）
python scripts/e2e_probe.py --only "东南大学,天津大学" --top 2

# 5. 真实生产管线验证
python scripts/validate_process_notice.py
```

> 环境变量 `CRAWL_DELAY_MIN/MAX`、`CRAWL_RETRY_TIMES` 可在探针时调小以加速。

---

## 六、后续待办

1. **Hub/汇总页**：东南「汇总」、天大「更新中」这类索引页正文很薄，单个院系通知
   要靠各学院源覆盖（阶段一定位已支持）；可考虑对汇总页做二级链接展开。
2. ~~**微信文章**~~：`mp.weixin.qq.com` 提取**已验证可用**（见下 7.3）。
3. **更大样本回归**：当前验证基于 10 所可访问高校；可结合阶段一/二全量源跑一次
   完整 `run_crawl.py` 复核整体指标（program_type 分布、日期覆盖率）。

---

## 七、补充（2026-07，完整管线端到端验证轮次）

### 7.1 招生源类型优先级/加成统一识别

`scripts/full_pipeline_e2e.py`（播种真实源→`NoticeProcessor.process_all`→查库）暴露：
`NoticeProcessor._get_active_sources` 的类型优先级 `case` 只精确匹配「招生/通知/新闻」，
而实际 `source_type` 取值含「研招办/研究生院/学院招生」，全部落入 `else=3` 最低优先级——
**最高价值的招生源被排在普通通知源之后处理**。`batch_filter` 的招生加成（+0.3）同理漏判。

修复（详见 commit `fix(crawl): 招生源类型优先级/加成统一识别`）：
- `rule_filter.source_type_category()` 统一归类 admission/notice/news/other。
- `batch_filter` 与 `NoticeProcessor` 均改用该归类，研招办等招生源获得 +0.3 加成与 0 级优先。
- 新增 2 项回归测试，全量 **25 项测试通过**。

### 7.2 端到端验证结论

| 环节 | 验证方式 | 结论 |
|------|----------|------|
| `crawl_source`（抓取/解析/翻页/过滤/去重） | `full_pipeline_e2e` 南大源：total=28 new=22 rel=11，无错 | ✅ |
| `process_notice`（详情/分类/提取/校验/入库） | `validate_process_notice`：东南/天大 6 条入库（预推免/夏令营/统考招生/拟录取，含日期） | ✅ |
| 编排（增量状态/并发/提交） | 南大 22 条经 LLM 全部正确判为非招生→不入库（行为正确） | ✅ |

> 注：`full_pipeline_e2e` 在有限超时内难跑完整批（每条详情+LLM≈8s，单源数十条），
> 故聚合报告以 `validate_process_notice` 的逐条入库结果为准；各环节均已独立验证通过。

### 7.3 报名/活动日期正则兜底 + 微信文章提取确认

- **报名日期兜底**：新增 `src/processor/date_inference.py`，在 LLM 漏提
  `registration_start/end`、`camp_start/end` 时，用正则从正文补全（只认明确截止信号，
  支持 YYYY-MM-DD/年月日/仅月日+标题年份/「日期前报名」反序/区间）。真实管线验证：
  天大「专项博士招生简章」`reg_end=2026-04-07` 被补全（LLM 漏提）。
- **微信文章提取**：文档原记「`mp.weixin.qq.com` 正文提取失败」。本轮确认 **已可用**——
  `content_extractor` 的 `js_content`/`rich_media_content` 选择器 + `data-src` 图片提取 +
  本轮 HTTP/2 修复（此前 httpx 全失败）共同解决。`tests/test_content_extractor.py` 锁定。

### 7.4 测试汇总

`tests/` 下新增/扩充：`test_summer_camp_precision`(10) / `test_tutor_units`(7) /
`test_date_inference`(9) / `test_research_areas`(5) / `test_content_extractor`(4) +
原有 `test_phase3_unit`(12) → **全量 43 项通过**。
