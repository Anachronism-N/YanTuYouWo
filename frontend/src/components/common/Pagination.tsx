"use client";

import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, MoreHorizontal } from "lucide-react";

interface PaginationProps {
  /** 当前页码（从1开始） */
  currentPage: number;
  /** 总页数 */
  totalPages: number;
  /** 页码变化回调 */
  onPageChange: (page: number) => void;
}

/**
 * 生成页码数组，包含省略号占位
 * 例如：[1, '...', 4, 5, 6, '...', 10]
 */
function generatePageNumbers(current: number, total: number): (number | "ellipsis")[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  const pages: (number | "ellipsis")[] = [];

  // 始终显示第一页
  pages.push(1);

  if (current <= 3) {
    // 靠近开头：1 2 3 4 ... N
    pages.push(2, 3, 4, "ellipsis", total);
  } else if (current >= total - 2) {
    // 靠近结尾：1 ... N-3 N-2 N-1 N
    pages.push("ellipsis", total - 3, total - 2, total - 1, total);
  } else {
    // 中间：1 ... C-1 C C+1 ... N
    pages.push("ellipsis", current - 1, current, current + 1, "ellipsis", total);
  }

  return pages;
}

export default function Pagination({ currentPage, totalPages, onPageChange }: PaginationProps) {
  if (totalPages <= 1) return null;

  const pages = generatePageNumbers(currentPage, totalPages);

  return (
    <nav className="flex items-center justify-center gap-1" aria-label="分页导航">
      {/* 上一页 */}
      <Button
        variant="ghost"
        size="sm"
        className="h-9 w-9 p-0"
        disabled={currentPage <= 1}
        onClick={() => onPageChange(currentPage - 1)}
        aria-label="上一页"
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>

      {/* 页码 */}
      {pages.map((page, index) => {
        if (page === "ellipsis") {
          return (
            <span
              key={`ellipsis-${index}`}
              className="flex h-9 w-9 items-center justify-center text-muted-foreground"
            >
              <MoreHorizontal className="h-4 w-4" />
            </span>
          );
        }

        const isActive = page === currentPage;
        return (
          <Button
            key={page}
            variant={isActive ? "default" : "ghost"}
            size="sm"
            className={`h-9 w-9 p-0 text-sm ${
              isActive
                ? "pointer-events-none"
                : "hover:bg-primary/10 hover:text-primary"
            }`}
            onClick={() => onPageChange(page)}
            aria-label={`第 ${page} 页`}
            aria-current={isActive ? "page" : undefined}
          >
            {page}
          </Button>
        );
      })}

      {/* 下一页 */}
      <Button
        variant="ghost"
        size="sm"
        className="h-9 w-9 p-0"
        disabled={currentPage >= totalPages}
        onClick={() => onPageChange(currentPage + 1)}
        aria-label="下一页"
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </nav>
  );
}
