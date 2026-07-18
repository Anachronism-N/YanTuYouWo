"""研究方向泛化 —— 把 LLM 抽取的具体方向映射到用户常搜的宽泛类别。

痛点（见 docs/crawl/tutor_crawler.md 第十节）：用户搜「人工智能」命中 0，因为
LLM 抽出的 research_areas 是更具体的术语（如「基于深度学习的图像识别」），而
后端按子串匹配。本模块在爬虫侧（B2 提取后）把具体方向映射到宽泛类别并并入
research_areas（去重、保留具体项），让「人工智能/计算机视觉/网络安全」等泛词
也能命中。具体项不删，精确性不受损。

仅做关键词映射，不做语义推理；映射表聚焦 985 常见学科（以 CS/AI 为主）。
"""
from __future__ import annotations

import re

# 宽泛类别 → 触发关键词（小写匹配）。命中任一关键词即归入该类别。
# 顺序即优先级（更具体的类别放前面，避免都被吞进「人工智能」）。
_CATEGORY_KEYWORDS: list[tuple[str, list[str]]] = [
    ("计算机视觉", [
        "视觉", "图像", "cv", "目标检测", "图像分割", "人脸", "ocr",
        "图像识别", "图像生成", "视频理解", "遥感图像", "医学图像",
    ]),
    ("自然语言处理", [
        "自然语言", "nlp", "文本", "机器翻译", "问答", "语义", "对话",
        "大语言模型", "llm", "语言模型", "信息抽取", "情感分析", "知识图谱",
    ]),
    ("语音识别", ["语音", "声学", "音频", "说话人", "asr"]),
    ("机器人", ["机器人", "robot", "运动规划", "导航", "slam", "机械臂", "轨迹"]),
    ("网络安全", [
        "安全", "密码", "入侵检测", "漏洞", "隐私保护", "区块链",
        "web安全", "恶意", "攻防", "可信",
    ]),
    ("数据挖掘", ["数据挖掘", "挖掘", "推荐系统", "推荐算法", "关联规则", "用户画像"]),
    ("软件工程", ["软件工程", "软件测试", "代码", "程序分析", "软件架构", "devops"]),
    ("数据库", ["数据库", "存储", "查询处理", "索引", "事务", "oltp", "olap"]),
    ("计算机系统", [
        "体系结构", "编译", "操作系统", "并行计算", "分布式系统", "云计算",
        "边缘计算", "高性能计算", "hpc", "虚拟化", "容器",
    ]),
    ("计算机网络", ["计算机网络", "网络协议", "路由", "5g", "无线网络", "sdn", "物联网", "iot"]),
    ("人工智能", [
        "人工智能", "机器学习", "深度学习", "神经网络", "强化学习",
        "联邦学习", "迁移学习", "生成对抗", "知识蒸馏", "ai", "智能决策",
        "智能优化", "模式识别", "机器视觉",
    ]),
    ("控制科学", ["控制", "自动化", "反馈", "鲁棒", "最优控制", "自适应"]),
    ("信号处理", ["信号处理", "滤波", "雷达", "阵列信号", "压缩感知"]),
    ("微电子", ["集成电路", "芯片", "半导体", "vlsi", "微电子", "器件"]),
    ("生物信息学", ["生物信息", "基因", "蛋白质", "组学", "计算生物"]),
    ("材料科学", ["材料", "纳米", "凝聚态", "高分子", "合金"]),
    ("量子计算", ["量子", "quantum"]),
    ("经济学", ["经济", "金融", "市场", "博弈"]),
]

# 预编译：每条关键词做 re.search（含中英文）
_COMPILED: list[tuple[str, list[re.Pattern]]] = [
    (cat, [re.compile(re.escape(kw), re.IGNORECASE) for kw in kws])
    for cat, kws in _CATEGORY_KEYWORDS
]


def categorize_area(area: str) -> list[str]:
    """单个研究方向 → 命中的宽泛类别列表。"""
    if not area:
        return []
    hits: list[str] = []
    for cat, patterns in _COMPILED:
        if any(p.search(area) for p in patterns):
            hits.append(cat)
    return hits


def broaden_research_areas(areas: list[str] | None) -> list[str]:
    """把具体方向 + 推导出的宽泛类别合并、去重，保留原顺序（具体在前，类别在后）。

    用于 B2 提取后扩充 research_areas，让泛词检索可命中。具体项一律保留。
    """
    if not areas:
        return []
    out: list[str] = []
    seen: set[str] = set()

    def _add(val: str):
        v = val.strip()
        if v and v not in seen:
            seen.add(v)
            out.append(v)

    # 先放具体方向
    for a in areas:
        if isinstance(a, str):
            _add(a)
    # 再追加宽泛类别
    for a in areas:
        if not isinstance(a, str):
            continue
        for cat in categorize_area(a):
            _add(cat)

    return out[:15]  # 控制长度，避免无限膨胀
