"""数据清洗服务 - 在 API 层对爬虫原始数据进行格式整理"""

from __future__ import annotations

import re
from datetime import date


class DataCleanService:

    @staticmethod
    def clean_title(title: str) -> str:
        """清洗标题：移除前缀日期和噪音"""
        if not title:
            return ""
        title = re.sub(r"[\n\r\t]+", " ", title)
        title = re.sub(r"\s{2,}", " ", title)
        # Leading bullets/dots
        title = re.sub(r"^[·•▪►◆※►]+\s*", "", title)
        # "18:27:09国防科技大学..."
        title = re.sub(r"^\d{2}:\d{2}:\d{2}", "", title)
        # "12-16吉林大学..."
        title = re.sub(r"^\d{2}-\d{2,6}", "", title)
        # "132026.03清华大学..."
        title = re.sub(r"^\d{1,4}(\d{4})[./]\d{1,2}", "", title)
        # "162025-06标题"
        title = re.sub(r"^\d{1,3}(\d{4})[-./](\d{1,2})", r"\1-\2", title)
        title = re.sub(r"^\d{4}[-./]\d{1,2}[-./]\d{1,2}\s*", "", title)
        title = re.sub(r"^\d{4}[-./]\d{1,2}\s*", "", title)
        title = re.sub(r"^\d{4}年\d{1,2}月\d{1,2}日?\s*", "", title)
        return title.strip()

    @staticmethod
    def clean_raw_content(content: str) -> str:
        """清洗正文内容：修复格式问题"""
        if not content:
            return ""

        # 导航噪音
        content = re.sub(r"[^\n]*当前位置\s*[：: ]\s*[^\n]*\n(?:[\u4e00-\u9fa5]{2,10}\n){0,5}", "", content, count=1)
        content = re.sub(r"[^\n]*(?:首页|网站首页)\s*[>›»/]\s*[^\n]*\n", "", content, count=1)
        content = re.sub(r"[^\n]*您所在的位置[：:][^\n]*\n", "", content, count=1)
        content = re.sub(r"编辑[：:][^\n]*\n?\s*\d*\s*分享到[：:]?\s*", "", content)
        content = re.sub(r"^(?:EN)?(?:学院概况|学院简介|发展历程|学院领导|师资队伍|科学研究|人才培养|党建工作|学生工作|招生信息|院友之窗|合作交流|下载中心)(?:[\u4e00-\u9fa5]{2,10}){3,}[^\n]*\n", "", content)
        content = re.sub(r"^(?:硕士招生|博士招生|MPA招生|MBA招生|本科招生|招生工作|招生信息)\s*\n", "", content)
        content = re.sub(r"^(?:[\u4e00-\u9fa5]{2,10}\n){4,}", "", content)

        # 修复日期/数字拆散
        for _ in range(8):
            content, n1 = re.subn(r"(\d+)\s*\n\s*(年|月|日|号|时|分|秒|点|期|届|级|人|名|个|项|条|篇|次|周|%)", r"\1\2", content)
            content, n2 = re.subn(r"(年|月|日|号|时|分|第)\s*\n\s*(\d)", r"\1\2", content)
            if n1 == 0 and n2 == 0:
                break
        content = re.sub(r"(第)\s*\n\s*(\d+)\s*\n?\s*", r"\1\2", content)

        # 标点合并
        content = re.sub(r"\s*\n\s*([，。、；：！？）》」』】\]\),.;:!?\-])", r"\1", content)
        content = re.sub(r"([（《「『【\[\(])\s*\n\s*", r"\1", content)
        content = re.sub("\u201c\\s*\\n\\s*", "\u201c", content)
        content = re.sub("\\s*\\n\\s*\u201d", "\u201d", content)
        content = re.sub(r"([﹝﹙])\s*\n\s*", r"\1", content)
        content = re.sub(r"\s*\n\s*([﹞﹚])", r"\1", content)

        # 移除噪音文本
        _noise = [
            r"点击[：:]\s*\n?\s*次?\s*", r"分享[：:]\s*\n?", r"分享到[：:]?\s*\n?",
            r"编辑[：:]\s*[^\n]{0,20}\s*\n?", r"来源[：:]\s*[^\n]{0,30}\s*\n?",
            r"作者[：:]\s*[^\n]{0,20}\s*\n?", r"发布时间\s*[：:]\s*\d{4}[^\n]*\n?",
            r"阅读次数[：:]\s*\d*\s*", r"浏览次数[：:]\s*\d*\s*",
            r"点击次数[：:]\s*\d*\s*", r"阅读量[：:]\s*\d*\s*",
            r"浏览[：:]\s*\d+\s*次?\s*",
            r"上一篇[：:].*$", r"下一篇[：:].*$",
            r"上一条[：:].*$", r"下一条[：:].*$",
            r"返回首页.*$", r"返回列表.*$", r"打印本页.*$", r"关闭窗口.*$",
            r"版权所有.*$", r"Copyright.*$", r"ICP备\d+号.*$", r"技术支持.*$",
        ]
        for pat in _noise:
            content = re.sub(pat, "", content, flags=re.MULTILINE)

        # 智能短行合并
        content = re.sub(r"\n{3,}", "\n\n", content)
        lines = [l.strip() for l in content.split("\n")]
        merged: list[str] = []
        prev_empty = False
        for line in lines:
            if not line:
                if not prev_empty:
                    merged.append("")
                prev_empty = True
                continue
            prev_empty = False
            if (
                merged and merged[-1] and len(line) <= 4
                and not line.startswith(("•", "-", "·", "●", "◆", "※", "（", "(", "一", "二", "三", "四", "五", "六", "七", "八", "九", "十"))
                and not re.match(r"^\d+[\.、）)]", line)
            ):
                merged[-1] += line
            else:
                merged.append(line)
        content = "\n".join(merged)

        # ── 移除残留的导航菜单块 ──
        # 连续短行(<=8字)中文词条
        content = re.sub(r"(?:^|\n)(?:[\u4e00-\u9fa5]{2,8}\n){4,}", "\n", content)
        lines = content.split("\n")
        cleaned_lines: list[str] = []
        for line in lines:
            stripped = line.strip()
            if not stripped:
                cleaned_lines.append("")
                continue
            # 纯中文词条无标点(>25字) → 导航菜单
            if (
                len(stripped) > 25
                and not re.search(r"[，。、；：！？,.;:!?（）\(\)]", stripped)
                and re.match(r"^[\u4e00-\u9fa5\w&]+$", stripped)
            ):
                continue
            # ">08" / 纯数字碎片
            if re.match(r"^[>＞\d.]{1,5}$", stripped):
                continue
            # "已下载次" / "已下载0次"
            if re.match(r"已下载\d*次?$", stripped):
                continue
            cleaned_lines.append(stripped)
        content = "\n".join(cleaned_lines)

        # 移除尾部噪音块
        content = re.sub(r"\n电\s*话[：:][^\n]*$", "", content, flags=re.MULTILINE)
        content = re.sub(r"\n地\s*址[：:][^\n]*$", "", content, flags=re.MULTILINE)
        content = re.sub(r"\n邮\s*编[：:]\s*\d{6}[^\n]*$", "", content, flags=re.MULTILINE)
        content = re.sub(r"\n文字斋公众号[^\n]*$", "", content)
        content = re.sub(r"\n学院官网\s*$", "", content)
        # "附件【xxx】已下载次" 清理
        content = re.sub(r"附件\s*【[^】]+】\s*已下载\d*次?\s*", "", content)

        content = re.sub(r"\n{3,}", "\n\n", content)
        content = content.strip()

        # ── 修复首行残片 ──
        # 正文开头如果是孤立的标点/短词残片（<4字无数字），移除
        if content:
            first_nl = content.find("\n")
            if first_nl > 0:
                first_line = content[:first_nl].strip()
                if (
                    len(first_line) <= 3
                    and not re.search(r"\d", first_line)
                    and first_line not in ("一", "二", "三")
                ):
                    content = content[first_nl:].strip()
            elif len(content) <= 3:
                pass  # entire content is short, don't strip

        # ── 移除开头的导航碎片行（"首页\n硕士招生\n..."） ──
        while content:
            first_nl = content.find("\n")
            if first_nl < 0:
                break
            first_line = content[:first_nl].strip()
            if (
                len(first_line) <= 6
                and re.match(r"^[\u4e00-\u9fa5]+$", first_line)
                and first_line in (
                    "首页", "返回", "通知", "公告", "MPA", "MBA",
                    "招生", "培养", "学位", "学术",
                )
            ):
                content = content[first_nl:].strip()
            else:
                break

        return content

    @staticmethod
    def to_markdown(content: str) -> str:
        """将正文转换为 Markdown 格式，便于前端渲染。

        修复：
        - 数字编号被拆散（"3.\\n材料审核" → "3. 材料审核"）
        - 段落标号（"一、" / "（一）" / "(1)" 等）独立成行
        - 列表项格式化（"1)" / "2)" / "•"）
        - 段落标题加粗
        """
        if not content:
            return ""

        lines = content.split("\n")
        out: list[str] = []
        i = 0
        while i < len(lines):
            line = lines[i].strip()
            # Merge orphan numbering: "3." or "(9)" alone on a line → join with next
            if line and i + 1 < len(lines):
                if re.match(r"^[\(\(]?\d{1,2}[\)\)\.\、]$", line):
                    nxt = lines[i + 1].strip()
                    if nxt and not re.match(r"^[\(\(]?\d{1,2}[\)\)\.\、]$", nxt):
                        out.append(f"{line} {nxt}")
                        i += 2
                        continue
                # "（一）" / "一、" alone on a line
                if re.match(r"^[（\(](?:[一二三四五六七八九十]|\d{1,2})[）\)]$", line) or \
                   re.match(r"^[一二三四五六七八九十]+[、.]$", line):
                    nxt = lines[i + 1].strip() if i + 1 < len(lines) else ""
                    if nxt:
                        out.append(f"**{line}** {nxt}")
                        i += 2
                        continue
            out.append(lines[i])
            i += 1
        text = "\n".join(out)

        # Convert numbered headings to markdown bold
        text = re.sub(r"^([一二三四五六七八九十]+[、.]\s*[^\n]{2,30})$", r"### \1", text, flags=re.MULTILINE)
        # Numbered list items: ensure "1." / "2)" have proper formatting
        text = re.sub(r"^(\d+)[\.\)、]\s*", r"\1. ", text, flags=re.MULTILINE)
        # Bold key labels
        for label in ("报名时间", "活动时间", "申请条件", "招生人数", "招生名额",
                       "联系方式", "联系电话", "联系邮箱", "申请材料", "时间安排"):
            text = re.sub(rf"^({label})[：:]", rf"**\1：**", text, flags=re.MULTILINE)

        # Clean up excessive blank lines
        text = re.sub(r"\n{3,}", "\n\n", text)
        return text.strip()

    @staticmethod
    def extract_date_from_title(title: str) -> date | None:
        """从标题中提取日期（用于补全缺失的 publish_date）"""
        patterns = [
            r"^(\d{4})-(\d{1,2})-(\d{1,2})",
            r"^(\d{4})\.(\d{1,2})\.(\d{1,2})",
            r"^(\d{4})/(\d{1,2})/(\d{1,2})",
            r"^(\d{4})年(\d{1,2})月(\d{1,2})日?",
        ]
        for pattern in patterns:
            match = re.match(pattern, title.strip())
            if match:
                try:
                    return date(
                        int(match.group(1)),
                        int(match.group(2)),
                        int(match.group(3)),
                    )
                except ValueError:
                    continue
        return None

    @staticmethod
    def extract_date_from_content(content: str) -> date | None:
        """从正文中提取发布日期"""
        patterns = [
            r"发布时间[：:]\s*(\d{4})-(\d{1,2})-(\d{1,2})",
            r"发布日期[：:]\s*(\d{4})-(\d{1,2})-(\d{1,2})",
            r"(\d{4})-(\d{1,2})-(\d{1,2})\s*发布",
            r"发布时间[：:]\s*(\d{4})年(\d{1,2})月(\d{1,2})日",
        ]
        for pattern in patterns:
            match = re.search(pattern, content)
            if match:
                try:
                    return date(
                        int(match.group(1)),
                        int(match.group(2)),
                        int(match.group(3)),
                    )
                except ValueError:
                    continue
        return None


    @staticmethod
    def clean_images(images: list | None) -> list[dict]:
        """清洗图片列表：过滤无效图片、图标、导航图等噪音"""
        if not images or not isinstance(images, list):
            return []

        noise_patterns = [
            r"logo\.", r"icon[_\-]", r"banner\.", r"favicon",
            r"wechat|weixin|qrcode|erweima",
            r"footer|header|nav|sidebar",
            r"/themes?/", r"/static/admin/",
            r"\.gif$",  # 大多数 gif 是图标
        ]

        cleaned = []
        for img in images:
            if not isinstance(img, dict):
                continue
            url = img.get("url", "")
            if not url or len(url) < 10:
                continue
            if not url.startswith("http"):
                continue

            is_noise = False
            url_lower = url.lower()
            for pat in noise_patterns:
                if re.search(pat, url_lower):
                    is_noise = True
                    break
            if is_noise:
                continue

            cleaned.append({
                "url": url,
                "alt": img.get("alt", ""),
                "width": img.get("width"),
                "height": img.get("height"),
            })

        return cleaned


data_clean_service = DataCleanService()
