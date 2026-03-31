import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { UserProfile, FavoriteItem } from "@/types/user";

interface UserState {
  /** 当前用户信息（null 表示未登录） */
  user: UserProfile | null;
  /** 认证 Token */
  token: string | null;
  /** 收藏列表 */
  favorites: FavoriteItem[];
  /** 是否已登录 */
  isLoggedIn: boolean;

  /** 设置用户信息（登录成功后调用） */
  setUser: (user: UserProfile, token: string) => void;
  /** 退出登录 */
  logout: () => void;
  /** 更新用户信息 */
  updateUser: (updates: Partial<UserProfile>) => void;
  /** 设置收藏列表 */
  setFavorites: (favorites: FavoriteItem[]) => void;
  /** 添加收藏 */
  addFavorite: (item: FavoriteItem) => void;
  /** 移除收藏 */
  removeFavorite: (type: string, targetId: number) => void;
  /** 检查是否已收藏 */
  isFavorited: (type: string, targetId: number) => boolean;
}

export const useUserStore = create<UserState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      favorites: [],
      isLoggedIn: false,

      setUser: (user, token) =>
        set({ user, token, isLoggedIn: true }),

      logout: () =>
        set({ user: null, token: null, favorites: [], isLoggedIn: false }),

      updateUser: (updates) =>
        set((state) => ({
          user: state.user ? { ...state.user, ...updates } : null,
        })),

      setFavorites: (favorites) => set({ favorites }),

      addFavorite: (item) =>
        set((state) => ({
          favorites: [item, ...state.favorites],
        })),

      removeFavorite: (type, targetId) =>
        set((state) => ({
          favorites: state.favorites.filter(
            (f) => !(f.type === type && f.target_id === targetId)
          ),
        })),

      isFavorited: (type, targetId) => {
        const { favorites } = get();
        return favorites.some((f) => f.type === type && f.target_id === targetId);
      },
    }),
    {
      name: "yantu-user-store",
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isLoggedIn: state.isLoggedIn,
        favorites: state.favorites,
      }),
    }
  )
);
