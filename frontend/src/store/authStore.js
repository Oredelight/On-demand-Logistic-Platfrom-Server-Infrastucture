import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      refreshToken: null,
      role: null,
      isAuthenticated: false,

      login: ({ user, access_token, refresh_token, role }) => {
        set({ user, token: access_token, refreshToken: refresh_token, role, isAuthenticated: true })
      },

      setUser: (user) => set({ user }),

      logout: () => {
        set({ user: null, token: null, refreshToken: null, role: null, isAuthenticated: false })
      },

      isAdmin: () => get().role === 'admin',
    }),
    {
      name: 'delifoods-auth',
      partialize: (s) => ({
        user: s.user,
        token: s.token,
        refreshToken: s.refreshToken,
        role: s.role,
        isAuthenticated: s.isAuthenticated,
      }),
    }
  )
)
