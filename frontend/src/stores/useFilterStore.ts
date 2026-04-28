import { create } from "zustand";

/** 筛选值类型 */
export interface FilterValues {
  keyword: string;
  school_level: string;
  province: string;
  university: string;
  discipline: string;
  major: string;
  program_type: string;
  status: string;
  source_type: string;
  sort: string;
}

/** 默认筛选值 */
export const defaultFilterValues: FilterValues = {
  keyword: "",
  school_level: "",
  province: "",
  university: "",
  discipline: "",
  major: "",
  program_type: "",
  status: "",
  source_type: "",
  sort: "latest",
};

/** 视图模式 */
export type ViewMode = "card" | "compact";

interface FilterState {
  /** 筛选条件 */
  filters: FilterValues;
  /** 当前页码 */
  page: number;
  /** 每页条数 */
  pageSize: number;
  /** 视图模式 */
  viewMode: ViewMode;

  /** 更新筛选条件（重置页码到第1页） */
  setFilters: (filters: FilterValues) => void;
  /** 更新单个筛选字段（重置页码到第1页） */
  updateFilter: (key: keyof FilterValues, value: string) => void;
  /** 清除单个筛选字段 */
  clearFilter: (key: keyof FilterValues) => void;
  /** 清除所有筛选条件 */
  clearAll: () => void;
  /** 设置页码 */
  setPage: (page: number) => void;
  /** 设置每页条数 */
  setPageSize: (size: number) => void;
  /** 切换视图模式 */
  setViewMode: (mode: ViewMode) => void;
  /** 从 URL query params 初始化筛选条件 */
  initFromParams: (params: Record<string, string>) => void;
}

export const useFilterStore = create<FilterState>((set) => ({
  filters: defaultFilterValues,
  page: 1,
  pageSize: 10,
  viewMode: "card",

  setFilters: (filters) => set({ filters, page: 1 }),

  updateFilter: (key, value) =>
    set((state) => ({
      filters: { ...state.filters, [key]: value === "__all__" ? "" : value },
      page: 1,
    })),

  clearFilter: (key) =>
    set((state) => ({
      filters: { ...state.filters, [key]: "" },
      page: 1,
    })),

  clearAll: () => set({ filters: defaultFilterValues, page: 1 }),

  setPage: (page) => set({ page }),

  setPageSize: (pageSize) => set({ pageSize, page: 1 }),

  setViewMode: (viewMode) => set({ viewMode }),

  initFromParams: (params) =>
    set({
      filters: {
        keyword: params.keyword || "",
        school_level: params.school_level || "",
        province: params.province || "",
        university: params.university || "",
        discipline: params.discipline || "",
        major: params.major || "",
        program_type: params.program_type || "",
        status: params.status || "",
        source_type: params.source_type || "",
        sort: params.sort || "latest",
      },
      page: params.page ? parseInt(params.page, 10) : 1,
      viewMode: (params.view as ViewMode) || "card",
    }),
}));
