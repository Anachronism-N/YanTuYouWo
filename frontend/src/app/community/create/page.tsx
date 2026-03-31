"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  PenSquare, Image, Tag, Send, ChevronLeft, X, Eye,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { PostCategory } from "@/types/community";

const CATEGORIES: PostCategory[] = ["经验分享", "择校咨询", "面试交流", "资料分享", "吐槽灌水"];
const SUGGESTED_TAGS = ["保研经验", "夏令营", "面试技巧", "择校", "科研", "英语", "简历", "导师", "心态", "时间管理"];

export default function CreatePostPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState<PostCategory>("经验分享");
  const [tags, setTags] = useState<string[]>([]);
  const [customTag, setCustomTag] = useState("");
  const [isPreview, setIsPreview] = useState(false);

  const addTag = (tag: string) => {
    if (tag && tags.length < 5 && !tags.includes(tag)) {
      setTags([...tags, tag]);
      setCustomTag("");
    }
  };

  const removeTag = (tag: string) => setTags(tags.filter((t) => t !== tag));

  const handleSubmit = () => {
    if (!title.trim() || !content.trim()) return;
    // Mock 提交
    alert("发帖成功！（Mock）");
    router.push("/community");
  };

  return (
    <div className="max-w-3xl mx-auto">
      {/* 顶部 */}
      <div className="flex items-center justify-between mb-6">
        <button onClick={() => router.back()} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ChevronLeft className="h-4 w-4" /> 返回
        </button>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setIsPreview(!isPreview)} className="gap-1.5">
            <Eye className="h-4 w-4" /> {isPreview ? "编辑" : "预览"}
          </Button>
          <Button size="sm" onClick={handleSubmit} disabled={!title.trim() || !content.trim()} className="gap-1.5">
            <Send className="h-4 w-4" /> 发布
          </Button>
        </div>
      </div>

      {isPreview ? (
        /* 预览模式 */
        <Card className="shadow-sm">
          <CardContent className="p-8">
            <div className="flex items-center gap-2 mb-4">
              <Badge>{category}</Badge>
              {tags.map((t) => <Badge key={t} variant="outline">{t}</Badge>)}
            </div>
            <h1 className="text-2xl font-bold mb-4">{title || "无标题"}</h1>
            <div className="prose prose-sm max-w-none">
              {content.split("\n").map((line, i) => (
                <p key={i}>{line || <br />}</p>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : (
        /* 编辑模式 */
        <div className="space-y-5">
          {/* 分类 */}
          <div>
            <label className="text-sm font-semibold mb-2 block">选择分类</label>
            <div className="flex gap-2 flex-wrap">
              {CATEGORIES.map((c) => (
                <button key={c} onClick={() => setCategory(c)}
                  className={cn("rounded-lg border px-4 py-2 text-sm font-medium transition-all",
                    category === c ? "border-primary bg-primary/5 text-primary" : "hover:bg-muted/50")}>
                  {c}
                </button>
              ))}
            </div>
          </div>

          {/* 标题 */}
          <div>
            <label className="text-sm font-semibold mb-1.5 block">标题 <span className="text-red-500">*</span></label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)}
              placeholder="请输入帖子标题（5-100 字）" className="h-12 text-base" maxLength={100} />
            <p className="text-xs text-muted-foreground mt-1 text-right">{title.length}/100</p>
          </div>

          {/* 内容 */}
          <div>
            <label className="text-sm font-semibold mb-1.5 block">内容 <span className="text-red-500">*</span></label>
            <textarea value={content} onChange={(e) => setContent(e.target.value)}
              placeholder="分享你的经验、问题或想法...&#10;&#10;支持换行排版，建议分段书写让内容更清晰。"
              className="w-full rounded-xl border bg-background px-4 py-3 text-sm min-h-[300px] resize-y focus:outline-none focus:ring-2 focus:ring-primary/20 transition-shadow leading-relaxed" />
          </div>

          {/* 标签 */}
          <div>
            <label className="text-sm font-semibold mb-2 block flex items-center gap-2">
              <Tag className="h-4 w-4" /> 标签 <span className="text-xs font-normal text-muted-foreground">（最多 5 个）</span>
            </label>
            {tags.length > 0 && (
              <div className="flex gap-2 flex-wrap mb-3">
                {tags.map((t) => (
                  <Badge key={t} variant="secondary" className="gap-1 pr-1">
                    {t}
                    <button onClick={() => removeTag(t)} className="ml-0.5 rounded-full hover:bg-muted p-0.5"><X className="h-3 w-3" /></button>
                  </Badge>
                ))}
              </div>
            )}
            <div className="flex gap-2 mb-2">
              <Input value={customTag} onChange={(e) => setCustomTag(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addTag(customTag.trim())}
                placeholder="输入自定义标签，回车添加" className="h-9 text-sm" />
              <Button variant="outline" size="sm" onClick={() => addTag(customTag.trim())} disabled={!customTag.trim()}>添加</Button>
            </div>
            <div className="flex gap-1.5 flex-wrap">
              {SUGGESTED_TAGS.filter((t) => !tags.includes(t)).map((t) => (
                <button key={t} onClick={() => addTag(t)}
                  className="rounded-full border px-2.5 py-1 text-xs text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-colors">
                  + {t}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
