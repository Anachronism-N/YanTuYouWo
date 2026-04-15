"use client";

import { useState, useRef } from "react";
import {
  Upload, FileText, Video, Image, File, X, CheckCircle2,
  FolderOpen, CloudUpload, AlertCircle,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type UploadCategory = "course" | "template" | "resource" | "question" | "experience";

const CATEGORIES: { id: UploadCategory; label: string; icon: React.ElementType; desc: string; accept: string }[] = [
  { id: "course", label: "录播课程", icon: Video, desc: "保研相关视频课程", accept: "video/*" },
  { id: "template", label: "文书模板", icon: FileText, desc: "个人陈述、推荐信等模板", accept: ".doc,.docx,.pdf,.tex" },
  { id: "resource", label: "学习资料", icon: FolderOpen, desc: "真题、笔记、攻略等", accept: ".pdf,.doc,.docx,.ppt,.pptx,.zip" },
  { id: "question", label: "面试题目", icon: File, desc: "面试真题及参考答案", accept: ".pdf,.doc,.docx,.md,.txt" },
  { id: "experience", label: "经验帖", icon: FileText, desc: "审核通过的经验分享", accept: ".md,.txt,.doc,.docx" },
];

interface UploadItem {
  id: string;
  name: string;
  size: string;
  category: UploadCategory;
  status: "uploading" | "done" | "error";
  progress: number;
}

export default function AdminUploadPage() {
  const [selectedCategory, setSelectedCategory] = useState<UploadCategory>("template");
  const [uploads, setUploads] = useState<UploadItem[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const currentCat = CATEGORIES.find((c) => c.id === selectedCategory)!;

  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    const newUploads: UploadItem[] = Array.from(files).map((f) => ({
      id: Math.random().toString(36).slice(2),
      name: f.name,
      size: f.size > 1024 * 1024 ? `${(f.size / 1024 / 1024).toFixed(1)} MB` : `${(f.size / 1024).toFixed(0)} KB`,
      category: selectedCategory,
      status: "done" as const,
      progress: 100,
    }));
    setUploads((prev) => [...prev, ...newUploads]);
  };

  const removeUpload = (id: string) => {
    setUploads((prev) => prev.filter((u) => u.id !== id));
  };

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight">内容上传</h1>
        <p className="text-sm text-muted-foreground mt-0.5">上传课程、模板、资料等内容到知识库</p>
      </div>

      {/* 分类选择 */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {CATEGORIES.map((cat) => (
          <button key={cat.id} onClick={() => setSelectedCategory(cat.id)} className={cn(
            "rounded-xl border-2 p-4 text-left transition-all",
            selectedCategory === cat.id ? "border-primary bg-primary/5 shadow-sm" : "border-transparent bg-muted/30 hover:bg-muted/50"
          )}>
            <cat.icon className="h-5 w-5 mb-2 text-primary" />
            <p className="text-sm font-medium">{cat.label}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{cat.desc}</p>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 上传信息 */}
        <Card>
          <CardContent className="p-5 space-y-4">
            <h2 className="text-base font-semibold">内容信息</h2>
            <div>
              <label className="text-sm font-medium block mb-1.5">标题</label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={`如：保研面试高频50题`} />
            </div>
            <div>
              <label className="text-sm font-medium block mb-1.5">描述</label>
              <textarea className="w-full rounded-lg border bg-background px-4 py-3 text-sm min-h-[80px] resize-y" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="简要描述内容" />
            </div>
            <div>
              <label className="text-sm font-medium block mb-1.5">标签（逗号分隔）</label>
              <Input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="如：面试, 计算机, 真题" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium block mb-1.5">适用学科</label>
                <select className="w-full h-9 rounded-lg border bg-background px-3 text-sm">
                  <option>全部学科</option><option>计算机</option><option>电子信息</option><option>数学</option><option>经济学</option><option>管理学</option><option>法学</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium block mb-1.5">是否免费</label>
                <select className="w-full h-9 rounded-lg border bg-background px-3 text-sm"><option>免费</option><option>会员可见</option></select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 文件上传区 */}
        <Card>
          <CardContent className="p-5 space-y-4">
            <h2 className="text-base font-semibold">文件上传</h2>

            {/* 拖拽区 */}
            <div
              className={cn(
                "border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer",
                dragOver ? "border-primary bg-primary/5" : "border-muted-foreground/20 hover:border-primary/50"
              )}
              onClick={() => fileRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files); }}
            >
              <CloudUpload className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
              <p className="text-sm font-medium">点击或拖拽文件到这里</p>
              <p className="text-xs text-muted-foreground mt-1">支持格式：{currentCat.accept}</p>
              <input ref={fileRef} type="file" className="hidden" accept={currentCat.accept} multiple onChange={(e) => handleFiles(e.target.files)} />
            </div>

            {/* 已上传文件列表 */}
            {uploads.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium">已选择 {uploads.length} 个文件</p>
                {uploads.map((u) => (
                  <div key={u.id} className="flex items-center gap-3 rounded-lg border px-3 py-2.5">
                    <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm truncate">{u.name}</p>
                      <p className="text-xs text-muted-foreground">{u.size}</p>
                    </div>
                    {u.status === "done" && <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />}
                    {u.status === "error" && <AlertCircle className="h-4 w-4 text-red-500 shrink-0" />}
                    <button onClick={() => removeUpload(u.id)} className="shrink-0"><X className="h-4 w-4 text-muted-foreground hover:text-foreground" /></button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-end pt-2">
              <Button disabled={uploads.length === 0 || !title} className="gap-2">
                <Upload className="h-4 w-4" /> 提交发布
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
