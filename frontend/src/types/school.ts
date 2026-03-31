import { SchoolLevel } from "./notice";

/** 院校列表项 */
export interface SchoolItem {
  id: number;
  name: string;
  short_name: string;
  level: SchoolLevel;
  province: string;
  city: string;
  homepage_url: string;
  logo_url?: string;
  department_count: number;
  notice_count: number;
}

/** 学院信息 */
export interface DepartmentItem {
  id: number;
  name: string;
  discipline_category: string;
  notice_count: number;
  homepage_url: string;
}

/** 院校详情 */
export interface SchoolDetail extends SchoolItem {
  graduate_url: string;
  departments: DepartmentItem[];
  description?: string;
}

/** 院校查询参数 */
export interface SchoolQueryParams {
  level?: SchoolLevel;
  province?: string;
  keyword?: string;
  sort?: "name" | "notice_count";
  page?: number;
  size?: number;
}

/** 院校列表响应 */
export interface SchoolListResponse {
  total: number;
  items: SchoolItem[];
}
