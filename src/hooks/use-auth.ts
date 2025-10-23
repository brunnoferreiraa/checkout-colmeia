import { create } from "zustand"
import { persist } from "zustand/middleware"

import { mockUsers, type User } from "@/lib/mock-data"
import type { Account, AuthCredentials } from "@/lib/types"

const defaultPassword = "senha123"

const seedAccounts: Record<string, Account> = mockUsers.reduce(
  (acc, user) => ({
    ...acc,
    [user.email]: { ...user, password: defaultPassword },
  }),
  {} as Record<string, Account>,
)

type AuthState = {
  user: Account | null
  accounts: Record<string, Account>
  loading: boolean
  error: string | null
  login: (credentials: AuthCredentials) => Promise<boolean>
  register: (credentials: AuthCredentials) => Promise<boolean>
  logout: () => void
  clearError: () => void
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accounts: seedAccounts,
      loading: false,
      error: null,
      async login({ email, password }) {
        set({ loading: true, error: null })
        await sleep(850)
        const { accounts } = get()

        const account = accounts[email.toLowerCase()]

        if (!account || account.password !== password) {
          set({
            loading: false,
            error: "Credenciais inválidas. Verifique e tente novamente.",
          })
          return false
        }

        set({ user: account, loading: false })
        return true
      },
      async register({ email, name, password }) {
        set({ loading: true, error: null })
        await sleep(1000)

        const normalizedEmail = email.toLowerCase()
        const { accounts } = get()

        if (accounts[normalizedEmail]) {
          set({
            loading: false,
            error: "E-mail já cadastrado. Tente fazer login.",
          })
          return false
        }

        const newAccount: Account = {
          id: `user-${Date.now()}`,
          name: name ?? normalizedEmail.split("@")[0],
          email: normalizedEmail,
          document: "000.000.000-00",
          phone: "+55 11 90000-0000",
          password: password ?? defaultPassword,
        }

        set({
          accounts: { ...accounts, [normalizedEmail]: newAccount },
          user: newAccount,
          loading: false,
        })
        return true
      },
      logout() {
        set({ user: null })
      },
      clearError() {
        if (get().error) {
          set({ error: null })
        }
      },
    }),
    {
      name: "checkout-auth",
      partialize: (state) => ({
        user: state.user,
        accounts: state.accounts,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.loading = false
          state.error = null
        }
      },
    },
  ),
)

export const getAuthenticatedUser = (): User | null =>
  useAuthStore.getState().user
