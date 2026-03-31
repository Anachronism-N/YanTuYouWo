/** 搜索结果 */
export interface SearchResult {
  id: number;
  type: "notice" | "school" | "tutor";
  title: string;
  description: string;
  url: string;
}

/** 搜索响应 */
export interface SearchResponse {
  total: number;
  items: SearchResult[];
}

/** 统计概览 */
export interface StatsOverview {
  school_count: number;
  notice_count: number;
  department_count: number;
  tutor_count: number;
}

/** 分页响应通用类型 */
export interface PaginatedResponse<T> {
  total: number;
  items: T[];
}

/** API 错误响应 */
export interface ApiError {
  code: number;
  message: string;
}
