import type { PaymentMethod, Product, User } from "./mock-data"

export interface AuthCredentials {
  email: string
  password: string
  name?: string
}

export interface Account extends User {
  password: string
  address?: string
}

export interface CartItem {
  product: Product
  quantity: number
}

export interface CheckoutFormValues {
  paymentMethod: PaymentMethod
  pixKey?: string
  cardHolder?: string
  cardNumber?: string
  cardExpiration?: string
  cardCvv?: string
  boletoDueDate?: string
  boletoInstructions?: string
}

export type CheckoutStep = "catalog" | "cart" | "payment" | "status"
