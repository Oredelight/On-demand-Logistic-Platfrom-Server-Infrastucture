import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const useCartStore = create(
  persist(
    (set, get) => ({
      items: [],
      isOpen: false,

      setItems: (items) => set({ items }),

      addItem: (item) =>
        set((s) => {
          const exists = s.items.find((i) => i.id === item.id)
          if (exists) return s
          return { items: [...s.items, item] }
        }),

      removeItem: (id) =>
        set((s) => ({ items: s.items.filter((i) => i.id !== id) })),

      clearItems: () => set({ items: [] }),

      openCart: () => set({ isOpen: true }),
      closeCart: () => set({ isOpen: false }),
      toggleCart: () => set((s) => ({ isOpen: !s.isOpen })),

      totalItems: () => get().items.reduce((sum, i) => sum + i.quantity, 0),

      totalPrice: () =>
        get().items.reduce((sum, i) => sum + i.subtotal, 0),
    }),
    {
      name: 'delifoods-cart',
      partialize: (s) => ({ items: s.items }),
    }
  )
)
