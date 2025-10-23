import { create } from "zustand"
import { persist } from "zustand/middleware"

import type { PaymentAttempt, PaymentMethod } from "@/lib/mock-data"
import type { CheckoutFormValues, CheckoutStep } from "@/lib/types"

type PaymentStatus = PaymentAttempt["status"]

type CheckoutState = {
  step: CheckoutStep
  payment: CheckoutFormValues
  status: PaymentStatus
  processing: boolean
  attempts: PaymentAttempt[]
  activeAttemptId: string | null
  error: string | null
  setStep: (step: CheckoutStep) => void
  setPaymentMethod: (method: PaymentMethod) => void
  updatePayment: (values: Partial<CheckoutFormValues>) => void
  reset: () => void
  submitOrder: (total: number) => Promise<PaymentAttempt>
  resume: (attemptId: string) => void
  retry: () => void
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

const initialState: Omit<
  CheckoutState,
  "setStep" | "setPaymentMethod" | "updatePayment" | "reset" | "submitOrder" | "resume"
> = {
  step: "catalog",
  payment: {
    paymentMethod: "pix",
    pixKey: "",
    cardHolder: "",
    cardNumber: "",
    cardExpiration: "",
    cardCvv: "",
    boletoDueDate: "",
    boletoInstructions: "",
  },
  status: "inicial",
  processing: false,
  attempts: [],
  activeAttemptId: null,
  error: null,
}

const paymentSuccessRates: Record<PaymentMethod, number> = {
  pix: 0.85,
  credit: 0.72,
  boleto: 0.6,
}

const paymentFailureMessages: Record<PaymentMethod, string> = {
  pix: "Pagamento Pix expirou. Gere um novo QR Code para tentar novamente.",
  credit: "Transação recusada pelo emissor. Verifique os dados do cartão.",
  boleto: "Boleto não registrado a tempo. Escolha outro método ou tente novamente.",
}

const getRandomStatus = (method: PaymentMethod): PaymentStatus => {
  const successRate = paymentSuccessRates[method] ?? 0.5
  const random = Math.random()

  if (random <= successRate) return "pago"
  if (random <= successRate + 0.1) return "expirado"
  return "falhado"
}

export const useCheckoutStore = create<CheckoutState>()(
  persist(
    (set, get) => ({
      ...initialState,
      setStep: (step) => set({ step }),
      setPaymentMethod: (method) =>
        set({
          payment: { ...get().payment, paymentMethod: method },
          error: null,
        }),
      updatePayment: (values) =>
        set({
          payment: { ...get().payment, ...values },
          error: null,
        }),
      reset: () => set({ ...initialState }),
      retry: () =>
        set({
          status: "inicial",
          processing: false,
          step: "payment",
          error: null,
        }),
      resume: (attemptId) => {
        const { attempts } = get()
        const attempt = attempts.find((item) => item.id === attemptId)
        if (!attempt) return
        set({
          activeAttemptId: attemptId,
          status: attempt.status,
          step: attempt.status === "pago" ? "status" : "payment",
        })
      },
      async submitOrder(total) {
        set({ processing: true, status: "processando", error: null })
        await sleep(1400)

        if (total <= 0) {
          const errorAttempt: PaymentAttempt = {
            id: `attempt-${Date.now()}`,
            method: get().payment.paymentMethod,
            status: "falhado",
            createdAt: new Date(),
            updatedAt: new Date(),
            details: "Carrinho vazio. Adicione itens antes de finalizar.",
          }
          set((state) => ({
            attempts: [...state.attempts, errorAttempt],
            processing: false,
            status: "falhado",
            activeAttemptId: errorAttempt.id,
            step: "cart",
            error: errorAttempt.details,
          }))
          return errorAttempt
        }

        const method = get().payment.paymentMethod
        const outcome = getRandomStatus(method)
        const attempt: PaymentAttempt = {
          id: `attempt-${Date.now()}`,
          method,
          status: outcome,
          createdAt: new Date(),
          updatedAt: new Date(),
          details:
            outcome === "pago"
              ? "Pagamento confirmado! Pedido em preparação."
              : paymentFailureMessages[method],
        }

        await sleep(800)

        set((state) => ({
          attempts: [...state.attempts, attempt],
          status: outcome,
          processing: false,
          activeAttemptId: attempt.id,
          step: "status",
          error: outcome === "pago" ? null : paymentFailureMessages[method],
        }))

        return attempt
      },
    }),
    {
      name: "checkout-flow",
      onRehydrateStorage: () => (state) => {
        if (!state) return
        state.processing = false
        state.attempts = state.attempts.map((attempt) => ({
          ...attempt,
          createdAt:
            attempt.createdAt instanceof Date ? attempt.createdAt : new Date(attempt.createdAt),
          updatedAt:
            attempt.updatedAt instanceof Date ? attempt.updatedAt : new Date(attempt.updatedAt),
        }))
      },
    },
  ),
)

export const currentAttempt = () => {
  const state = useCheckoutStore.getState()
  return state.attempts.find((attempt) => attempt.id === state.activeAttemptId) ?? null
}
