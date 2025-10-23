import { create } from "zustand"
import { persist } from "zustand/middleware"

import type { CartItem } from "@/lib/types"
import type { Product } from "@/lib/mock-data"

type CartState = {
  items: CartItem[]
  addItem: (product: Product) => void
  updateQuantity: (productId: string, quantity: number) => void
  removeItem: (productId: string) => void
  clear: () => void
  setItems: (items: CartItem[]) => void
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      addItem: (product) => {
        const existing = get().items
        const itemIndex = existing.findIndex((item) => item.product.id === product.id)

        if (itemIndex >= 0) {
          const updated = [...existing]
          updated[itemIndex] = {
            ...updated[itemIndex],
            quantity: Math.min(product.stock, updated[itemIndex].quantity + 1),
          }
          set({ items: updated })
          return
        }

        set({
          items: [
            ...existing,
            {
              product,
              quantity: 1,
            },
          ],
        })
      },
      updateQuantity: (productId, quantity) => {
        if (quantity <= 0) {
          set({ items: get().items.filter((item) => item.product.id !== productId) })
          return
        }

        set({
          items: get().items.map((item) =>
            item.product.id === productId
              ? { ...item, quantity: Math.min(item.product.stock, quantity) }
              : item,
          ),
        })
      },
      removeItem: (productId) => {
        set({
          items: get().items.filter((item) => item.product.id !== productId),
        })
      },
      clear: () => set({ items: [] }),
      setItems: (items) => set({ items }),
    }),
    {
      name: "checkout-cart",
    },
  ),
)

export const cartTotal = (items: CartItem[]) =>
  items.reduce((acc, { product, quantity }) => acc + product.price * quantity, 0)

export const cartQuantity = (items: CartItem[]) =>
  items.reduce((acc, { quantity }) => acc + quantity, 0)
