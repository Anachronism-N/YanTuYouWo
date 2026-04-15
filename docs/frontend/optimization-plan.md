# 前端优化与迭代计划

> 编写日期：2026-04-13
>
> 本文档综合了技术团队审查和产品需求，列出前端下一阶段的优化方向、具体方案和执行优先级。

---

## 一、品牌升级

### 1.1 项目更名

当前名称「研途有我」直白但缺乏辨识度和传播力。建议更名为：

| 候选名称 | 含义 | 优劣 |
|----------|------|------|
| **研路 YanLoop** | 「研」+ 「路」，Loop 寓意信息闭环和持续迭代 | 简洁、国际化、域名友好 |
| **研伴 YanBan** | 「研」+ 「伴」，强调陪伴感 | 温暖、但略常见 |
| **研策 YanCe** | 「研」+ 「策」，强调智能策略 | 偏理性、AI 感强 |
| **砚舟 YanZhou** | 「砚」（学问）+ 「舟」（渡你上岸） | 文化感强、意象美，但略生僻 |

**推荐方案**：**砚舟 YanZhou** — 取义「以砚为舟，渡你上岸」。「砚」代表学术与笔墨，「舟」代表旅程与承载，隐喻平台承载学生的保研之旅。英文 YanZhou 发音清晰、域名可用性高。

> 最终名称待用户确认后，全局替换 `SITE_NAME`、文案、meta 标签、品牌色等。

### 1.2 虚拟 IP 形象 —— 「舟舟」

#### 角色设定

| 属性 | 内容 |
|------|------|
| 名称 | **舟舟**（与「砚舟」呼应） |
| 物种 | 拟人化的小狐狸 |
| 性格 | 聪明机敏、温暖可靠、略带学霸气质 |
| 穿着 | 深蓝色连帽卫衣 + 学士帽斜戴，脖子上围着一条发光的围巾（象征 AI） |
| 配色 | 主体毛色暖橙，连帽衫深蓝-紫渐变（与品牌渐变色一致） |
| 标志物 | 左手举着一卷半展开的录取通知书，右手托着一颗发光的水晶球（象征 AI 洞察） |
| 表情体系 | 常态微笑 / 加油打气 / 思考中 / 惊喜 / 抱抱（用于不同场景） |

#### 生成 Prompt

以下 prompt 可用于 AI 图像生成工具（Midjourney / DALL-E / Stable Diffusion）：

```
A cute anthropomorphic fox mascot character for an education tech brand, chibi/kawaii style, full-body standing pose, front view on a pure white background.

The fox has warm orange fur with a cream-colored belly and inner ears. It wears a dark navy-to-purple gradient hoodie with a glowing cyan scarf loosely wrapped around its neck (symbolizing AI). A black academic mortarboard hat sits playfully tilted on its head with a golden tassel.

In its left paw it holds a half-unrolled scroll/acceptance letter with a visible red seal. In its right paw it holds a small glowing crystal orb emitting soft blue-purple sparkles.

The fox has big, bright amber eyes with star-shaped highlights, a small friendly smile, rounded features. The style is flat vector illustration with soft shadows, suitable for a tech/education brand icon. Clean lines, minimal detail, highly readable at small sizes (32×32 avatar).

Aspect ratio 1:1, no background elements, transparent/white background.
```

#### IP 形象应用场景

| 场景 | 用法 |
|------|------|
| **悬浮球 AI Bot** | 悬浮球图标替换为舟舟头像，展开面板顶部显示舟舟半身像 + 打招呼语 |
| **空状态** | 各列表页无数据时显示舟舟插画（探索中 / 暂无结果 / 数据加载中） |
| **404 页面** | 舟舟迷路插画 |
| **登录/注册页** | 左侧装饰区域展示舟舟欢迎插画 |
| **加载动画** | 舟舟转水晶球的微动画 |
| **心理支持** | 舟舟抱抱姿态 |
| **成就解锁** | 舟舟庆祝姿态 |
| **首页 Hero** | 舟舟与用户并肩的场景插画 |

> 第一版先生成正面站立全身图，后续根据应用场景扩展表情和姿态变体。

### 1.3 品牌资产整理

已完成：将 `logo.png`、`slogan.png`、`slogan_AD.png` 从项目根目录迁移到 `frontend/public/images/`，代码引用路径已更新：

- `AppFooter.tsx`: `/slogan.png` → `/images/slogan.png`
- `auth/login/page.tsx`: `/slogan_AD.png` → `/images/slogan_AD.png`
- `auth/register/page.tsx`: `/slogan_AD.png` → `/images/slogan_AD.png`

后续品牌资产统一放入 `public/images/brand/` 目录。

---

## 二、天气动态背景优化

### 2.1 当前问题

1. **天气 API 不可靠**：使用 `wttr.in` 无认证免费服务，超时/失败率高
2. **代码体积过大**：`DynamicBackground.tsx` 单文件 700+ 行，包含所有天气效果的内联样式
3. **性能开销**：虽然已从 Canvas 优化为 CSS 动画，但多个 SVG 背景平铺仍有不必要的 GPU 合成层
4. **可维护性差**：全部效果写在一个巨型 switch-case 中，新增效果困难

### 2.2 优化方案

#### 架构重构

```
components/layout/
├── DynamicBackground.tsx        # 主容器（效果调度 + 天气检测）
├── backgrounds/
│   ├── GradientEffect.tsx       # 渐变流动
│   ├── ParticleEffect.tsx       # 粒子漂浮
│   ├── GeoEffect.tsx            # 几何线条
│   ├── SunnyEffect.tsx          # 晴天
│   ├── CloudyEffect.tsx         # 多云
│   ├── RainEffect.tsx           # 雨天
│   ├── StormEffect.tsx          # 雷暴
│   ├── SnowEffect.tsx           # 雪天
│   └── FogEffect.tsx            # 雾天
```

#### 性能优化

| 优化项 | 方案 |
|--------|------|
| 天气 API | 改用 `wttr.in` JSON endpoint (`?format=j1`) 增加容错，结果缓存到 `localStorage`（1 小时过期） |
| 懒加载 | 每个效果组件独立 `React.lazy()`，只加载当前激活的效果 |
| `prefers-reduced-motion` | 检测用户动画偏好，自动降级为静态渐变 |
| 低电量 | 使用 Battery API 检测，低电量时关闭动画 |
| 暗色模式 | 各效果内置浅/深色变体，无需 ThemeProvider 额外注入 |

#### CSS 动画精简

- 所有 keyframes 统一到 `globals.css`，去除组件内的 `dangerouslySetInnerHTML` 样式注入
- 雨/雪效果从 SVG 背景平铺改为 CSS `conic-gradient` + `repeating-linear-gradient`，减少 DOM
- 云朵效果从多个 `box-shadow` div 改为单个 `background-image` 多层 `radial-gradient`

---

## 三、简历工坊增强

### 3.1 当前问题

- 简历预览区所有字段为空，无法直观看到排版效果
- 模板差异化仅靠标题样式区分，整体效果不够专业
- 缺少 A4 纸张比例预览

### 3.2 优化方案

#### 填充完整示例简历

在 `lib/mock-data.ts` 或 `ai/resume/page.tsx` 中新增一份**完整的虚假简历数据**，包含所有字段：

| 模块 | 示例内容 |
|------|----------|
| 基本信息 | 张明轩，男，汉族，2003 年 1 月生，中共党员，本科西安交通大学计算机科学与技术，目标北京大学智能科学 |
| 教育经历 | 西安交通大学 2021-2025，GPA 3.85/4.0，排名 5/180，核心课程若干 |
| 科研经历 | 2 段（国家级大学生创新项目 + 企业合作项目），各含实验室、技术栈、成果 |
| 论文成果 | 2 篇（1 篇 SCI 二区已发表 + 1 篇 CCF-A 在审） |
| 获奖经历 | 4 项（全国大学生数学建模国家一等奖、ACM 区域赛银牌等） |
| 实习经历 | 1 段（腾讯 AI Lab 研究实习） |
| 技能 | Python 5/5、PyTorch 4/5、C++ 4/5、LaTeX 4/5 等 |
| 语言能力 | 英语 CET-6 580 分，IELTS 7.0 |
| 自我评价 | 2-3 句总结性描述 |

#### 模板升级

| 模板 | 视觉风格 | 适用方向 |
|------|----------|----------|
| **学术经典** | LaTeX 学术论文风格，Times 衬线字体，双横线标题分隔，时间右对齐 | 理工科 / 学术型 |
| **简约清新** | 单色系 + 大量留白，无衬线字体，细线分隔，重点加粗 | 文商科 / 综合型 |
| **现代创意** | 左侧色带装饰，色块标题栏，圆角卡片风格，图标点缀 | 设计 / 交叉学科 |
| **专业商务**（新增） | 深色标题栏 + 灰色辅助色，两栏布局（左窄右宽），紧凑信息密度 | 金融 / 管理 / 法学 |

#### A4 预览

- 预览区域使用 `aspect-[210/297]` 锁定 A4 比例
- 增加缩放滑块（50%-150%）
- 支持全屏预览模式

---

## 四、新增页面：竞赛与论文信息

### 4.1 页面定位

路径：`/info/competitions`（竞赛信息）+ `/info/journals`（期刊会议信息）
或合并为：`/info/academic`（学术资源）

为保研学生提供：
1. **可参加的竞赛列表** — 数学建模、ACM、挑战杯等，含报名时间、等级、含金量评估
2. **可投递的期刊与会议** — 按学科分类，含影响因子、审稿周期、录用率、是否适合本科生

### 4.2 竞赛信息页设计

```
/info/competitions
├── 筛选栏：学科门类 / 竞赛级别(国家级/省级/校级) / 状态(报名中/即将开始/已结束) / 关键词
├── 竞赛卡片列表
│   ├── 竞赛名称 + 级别标签
│   ├── 主办单位
│   ├── 报名时间 / 比赛时间
│   ├── 含金量评级（⭐⭐⭐⭐⭐）
│   ├── 适用学科标签
│   ├── 保研加分说明（如"多数 985 认可"、"可写入简历"等）
│   └── 官网链接 + 收藏按钮
├── 侧边栏
│   ├── 保研竞赛含金量排行（Top 10）
│   ├── 即将截止提醒
│   └── 竞赛日历（时间轴视图）
```

#### Mock 数据示例

| 竞赛 | 级别 | 学科 | 含金量 | 报名时间 |
|------|------|------|--------|----------|
| 全国大学生数学建模竞赛 | 国家级 | 数学/计算机/工学 | ⭐⭐⭐⭐⭐ | 每年 6-9 月 |
| ACM-ICPC 亚洲区域赛 | 国际级 | 计算机 | ⭐⭐⭐⭐⭐ | 每年 9-11 月 |
| "挑战杯"大学生课外学术科技作品竞赛 | 国家级 | 全学科 | ⭐⭐⭐⭐⭐ | 两年一届 |
| 全国大学生英语竞赛 (NECCS) | 国家级 | 外语 | ⭐⭐⭐⭐ | 每年 3-5 月 |
| 美国大学生数学建模竞赛 (MCM/ICM) | 国际级 | 数学/工学 | ⭐⭐⭐⭐⭐ | 每年 1-2 月 |
| "互联网+"大学生创新创业大赛 | 国家级 | 全学科 | ⭐⭐⭐⭐ | 每年 4-10 月 |
| 全国大学生电子设计竞赛 | 国家级 | 电子/通信/计算机 | ⭐⭐⭐⭐ | 两年一届 |
| 中国大学生计算机设计大赛 | 国家级 | 计算机 | ⭐⭐⭐ | 每年 3-7 月 |
| 全国大学生统计建模大赛 | 国家级 | 统计/数学/经济 | ⭐⭐⭐ | 每年 5-9 月 |
| RoboMaster 机甲大师赛 | 国家级 | 机械/自动化/计算机 | ⭐⭐⭐⭐ | 每年 1-8 月 |

### 4.3 期刊与会议信息页设计

```
/info/journals
├── 两个 Tab：期刊 / 学术会议
├── 筛选栏：学科 / 级别(SCI/EI/CSSCI/核心/普刊) / 是否适合本科生 / 审稿周期
├── 期刊卡片列表
│   ├── 期刊/会议名称 + 级别标签(SCI Q1/CCF-A 等)
│   ├── 影响因子 / H-index
│   ├── 审稿周期（如"2-4 个月"）
│   ├── 录用率估计
│   ├── 本科生友好度评级
│   ├── 投稿建议（简短的一句话建议）
│   └── 官网链接 + 收藏按钮
├── 侧边栏
│   ├── 本科生最佳投稿选择 Top 10
│   ├── 各学科推荐期刊
│   └── 投稿时间线建议
```

#### Mock 数据示例

**期刊：**

| 名称 | 级别 | 学科 | IF | 审稿周期 | 本科生友好度 |
|------|------|------|----|----------|-------------|
| IEEE TPAMI | SCI Q1 / CCF-A | 计算机视觉/AI | 23.6 | 3-6 月 | ⭐⭐ |
| NeurIPS (会议) | CCF-A | 机器学习 | - | 3 月 | ⭐⭐ |
| Pattern Recognition | SCI Q1 / CCF-B | 模式识别 | 8.0 | 2-4 月 | ⭐⭐⭐ |
| Knowledge-Based Systems | SCI Q1 | AI/知识工程 | 8.8 | 1-3 月 | ⭐⭐⭐⭐ |
| Applied Soft Computing | SCI Q1 | 计算智能 | 8.7 | 2-3 月 | ⭐⭐⭐⭐ |
| 计算机学报 | 中文 CCF-A | 计算机 | - | 3-6 月 | ⭐⭐⭐ |
| 软件学报 | 中文 CCF-A | 软件工程 | - | 3-6 月 | ⭐⭐⭐ |
| 经济研究 | CSSCI | 经济学 | - | 3-6 月 | ⭐⭐ |

**会议：**

| 名称 | 级别 | 学科 | 截稿月份 | 录用率 | 本科生友好度 |
|------|------|------|----------|--------|-------------|
| AAAI | CCF-A | 人工智能 | 8 月 | ~20% | ⭐⭐⭐ |
| CVPR | CCF-A | 计算机视觉 | 11 月 | ~25% | ⭐⭐ |
| ACL | CCF-A | 自然语言处理 | 1 月 | ~22% | ⭐⭐⭐ |
| IJCAI | CCF-A | 人工智能 | 1 月 | ~15% | ⭐⭐⭐ |
| ICML | CCF-A | 机器学习 | 1 月 | ~22% | ⭐⭐ |

### 4.4 导航集成

在「保研信息」下拉菜单中新增两项：

```ts
{ title: "竞赛信息", href: "/info/competitions", description: "保研加分竞赛指南与报名信息" },
{ title: "期刊会议", href: "/info/journals", description: "适合本科生投稿的期刊与会议" },
```

---

## 五、UI/UX 全局优化

### 5.1 导航栏升级

| 问题 | 优化方案 |
|------|----------|
| Logo 使用 Lucide 图标占位 | 替换为真实 logo.png（`/images/logo.png`），使用 `next/image` 渲染 |
| 导航项过多时拥挤 | 下拉菜单增加分组标题和图标，改善视觉层次 |
| 移动端菜单体验差 | 改为底部抽屉式导航 + 手势支持 |

### 5.2 首页优化

| 区域 | 当前状态 | 优化方案 |
|------|----------|----------|
| Hero 区域 | 纯文字 + 搜索框 | 加入舟舟 IP 插画 + 品牌 Slogan 动画 |
| 功能入口 | 简单卡片网格 | 改为带悬浮预览的大卡片，hover 时显示功能截图/动画 |
| 数据统计 | 静态数字 | 加入 `CountUp` 数字滚动动画（进入视口时触发） |
| 最新通知 | 简单列表 | 改为横向滚动卡片 + 自动轮播 |

### 5.3 色彩与排版

| 项目 | 优化方案 |
|------|----------|
| 主色调 | 从 shadcn 默认蓝调整为品牌色（蓝紫渐变，与 logo 一致） |
| 中文字体 | 引入思源黑体 / 阿里巴巴普惠体 webfont，取代系统默认 |
| 字号层次 | 统一为设计系统：H1 2xl, H2 xl, H3 lg, body sm, caption xs |
| 卡片圆角 | 全局统一 `rounded-2xl`（当前混用 xl / 2xl / 3xl） |
| 阴影体系 | 定义 3 级阴影 token: `shadow-card`, `shadow-card-hover`, `shadow-panel` |

### 5.4 交互动效

| 场景 | 方案 |
|------|------|
| 页面切换 | 添加 Framer Motion `layout` 过渡动画 |
| 列表加载 | 骨架屏 + stagger 进入动画（已有，需统一时长） |
| 按钮反馈 | 统一 `active:scale-95` + `hover:shadow` |
| 滚动触发 | 使用 `framer-motion` 的 `whileInView` 替代手动 IntersectionObserver |
| Toast 通知 | 引入 `sonner` 或 `react-hot-toast`，统一操作反馈 |

### 5.5 深色模式完善

当前深色模式仍有部分页面存在：
- 硬编码的 `bg-blue-50`、`text-gray-900` 等未适配 dark 变体
- 部分卡片在深色下 border 不可见
- 图片/图标在深色背景上对比度不足

**方案**：全局审查并补充 `dark:` 变体，建立深色模式 checklist 检查流程。

---

## 六、技术债务清理

### 6.1 代码质量

| 项目 | 方案 |
|------|------|
| Prettier | 配置 `.prettierrc`，统一代码格式 |
| Husky + lint-staged | 提交前自动格式化 + lint 检查 |
| 组件拆分 | 超过 500 行的页面组件拆分为子组件 |
| 类型完善 | 补全所有 `any` 类型标注 |

### 6.2 性能优化

| 项目 | 方案 |
|------|------|
| SWR 数据层 | 全面使用 SWR 替代 `useEffect + fetch`，获得缓存/重新验证/分页支持 |
| 图片优化 | 所有 `<img>` 替换为 `next/image`，启用 AVIF/WebP |
| 代码分割 | 大型页面组件使用 `next/dynamic` 按需加载 |
| Bundle 分析 | 集成 `@next/bundle-analyzer` 审查包体积 |

### 6.3 SSR/SSG 策略

| 页面 | 目标渲染方式 |
|------|-------------|
| 首页 | SSG + ISR (60s) |
| 通知列表 | SSR（动态筛选） |
| 通知详情 | SSG + ISR (3600s) |
| 院校列表 | SSG + ISR (86400s) |
| 竞赛/期刊 | SSG + ISR (86400s) |
| AI 功能页 | CSR |
| 用户中心 | CSR |

---

## 七、执行优先级

### P0（本轮立即执行）

1. [x] 品牌资产迁移（PNG → `public/images/`）
2. [ ] 确认项目新名称
3. [ ] 生成虚拟 IP 形象（舟舟）第一版
4. [ ] 天气背景代码拆分重构
5. [ ] 简历工坊填充完整示例数据 + A4 预览
6. [ ] 新增竞赛信息页 `/info/competitions`
7. [ ] 新增期刊会议页 `/info/journals`

### P1（短期跟进）

8. [ ] 导航栏 Logo 替换为真实品牌图
9. [ ] 首页 Hero 区域集成 IP 形象
10. [ ] 悬浮球替换为舟舟形象
11. [ ] 深色模式全局检查与修复
12. [ ] 全局圆角/阴影/字体统一

### P2（中期优化）

13. [ ] SWR 数据层迁移
14. [ ] Prettier + Husky 配置
15. [ ] SSR/SSG 渲染策略落地
16. [ ] 移动端体验精细打磨
17. [ ] SEO 优化（meta / JSON-LD / sitemap）

---

## 附录：文件变更记录

### 2026-04-13

| 文件 | 变更 |
|------|------|
| `frontend/public/images/logo.png` | 新增（从项目根目录迁移） |
| `frontend/public/images/slogan.png` | 新增（从项目根目录迁移） |
| `frontend/public/images/slogan_AD.png` | 新增（从项目根目录迁移） |
| `src/components/layout/AppFooter.tsx` | 图片路径更新 `/slogan.png` → `/images/slogan.png` |
| `src/app/auth/login/page.tsx` | 图片路径更新 `/slogan_AD.png` → `/images/slogan_AD.png` |
| `src/app/auth/register/page.tsx` | 图片路径更新 `/slogan_AD.png` → `/images/slogan_AD.png` |

---

## 九、可视化元素计划

> 更新日期：2026-04-14

### 已实现

| 位置 | 元素类型 | 实现方式 |
|------|---------|---------|
| 管理后台-数据统计 | CSS 柱状图（7天访问趋势） | div 高度百分比 + 渐变填充 |
| 管理后台-数据统计 | 进度条（内容分布） | div 宽度百分比 + 品牌色 |
| 管理后台-数据统计 | 热门搜索词云 | Badge 不同大小/颜色 |
| 首页统计区 | CountUp 数字动画 | requestAnimationFrame + IntersectionObserver |
| 关于我们 | 项目思维导图 | 纯 CSS/HTML + SVG 连线 |
| 个人知识库 | 知识图谱 | D3 力导向 + Canvas |

### 待实现（按优先级排序）

| 优先级 | 位置 | 元素 | 实现方案 | 预估工时 |
|--------|------|------|---------|---------|
| P0 | 进度中心首页 | **完成率环形图** | SVG circle + stroke-dashoffset | 0.5h |
| P0 | 首页统计区 | **迷你进度条** | div 宽度动画，CountUp 下方 | 0.5h |
| P1 | 院校详情页 | **学院通知数量柱状图** | CSS div 柱状图 | 1h |
| P1 | 竞赛信息页 | **竞赛时间轴** | CSS timeline + 时间段色块 | 2h |
| P1 | 社群首页 | **热门话题词云** | Badge 大小/颜色变化 | 0.5h |
| P2 | 导师详情页 | **研究方向词云** | 同上 | 0.5h |
| P2 | 进度中心 | **本周学习时长柱状图** | CSS div 柱状图 | 1h |
| P2 | 知识库首页 | **内容数量统计条形图** | CSS 进度条 | 0.5h |
| P3 | 院校详情页 | **学科分布饼图** | 引入 ECharts | 2h |
| P3 | 管理后台 | **通知来源分布饼图** | 引入 ECharts | 1h |
| P3 | 简历预览 | **技能雷达图** | SVG polygon + 刻度线 | 2h |
| P3 | 管理后台 | **访问趋势折线图（交互式）** | 引入 ECharts | 2h |

### 技术方案选择

| 复杂度 | 方案 | 适用场景 |
|--------|------|---------|
| 简单 | 纯 CSS div 高度/宽度 + 渐变 | 柱状图、进度条、时间轴 |
| 中等 | SVG circle/polygon + 动画 | 环形图、雷达图 |
| 复杂 | ECharts / D3 | 饼图、折线图、交互式图表 |

> 建议先完成所有 P0/P1 项目（纯 CSS/SVG 方案），然后在 Phase 2 后端对接完成后引入 ECharts 做 P3 项目（需要真实数据支撑）。
