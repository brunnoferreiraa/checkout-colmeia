'use client'

import { useEffect, useMemo, useState, type FormEvent } from "react"
import type { ElementType } from "react"
import {
  BadgeCheck,
  Box,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  FileText,
  LogOut,
  Package,
  QrCode,
  RefreshCw,
  ShoppingCart,
  TimerReset,
  XCircle,
} from "lucide-react"
import { Toaster, toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { useAuthStore } from "@/hooks/use-auth"
import { cartQuantity, cartTotal, useCartStore } from "@/hooks/use-cart"
import { currentAttempt, useCheckoutStore } from "@/hooks/use-checkout"
import { formatCurrency, maskCardNumber, maskExpiration } from "@/lib/format"
import { products } from "@/lib/mock-data"
import type { PaymentMethod } from "@/lib/mock-data"
import type { CheckoutFormValues, CheckoutStep } from "@/lib/types"
import { cn } from "@/lib/utils"

const stepOrder: CheckoutStep[] = ["catalog", "cart", "payment", "status"]

const stepLabels: Record<CheckoutStep, { title: string; description: string; icon: ElementType }> = {
  catalog: { title: "Catálogo", description: "Escolha seus produtos", icon: Package },
  cart: { title: "Carrinho", description: "Revise itens e quantidades", icon: ShoppingCart },
  payment: { title: "Pagamento", description: "Informe os dados de pagamento", icon: CreditCard },
  status: { title: "Status", description: "Acompanhe seu pedido", icon: FileText },
}

const paymentLabels: Record<PaymentMethod, { title: string; description: string; icon: ElementType }> = {
  pix: { title: "Pix", description: "Pagamentos instantâneos com QR Code ou chave", icon: QrCode },
  credit: { title: "Cartão de Crédito", description: "Até 12x sem juros", icon: CreditCard },
  boleto: { title: "Boleto", description: "Vencimento em 2 dias úteis", icon: FileText },
}

const statusVariants: Record<string, { label: string; variant: "default" | "secondary" | "destructive" }> = {
  inicial: { label: "Aguardando confirmação", variant: "secondary" },
  processando: { label: "Processando pagamento", variant: "default" },
  pago: { label: "Pagamento aprovado", variant: "default" },
  falhado: { label: "Pagamento recusado", variant: "destructive" },
  expirado: { label: "Pagamento expirado", variant: "destructive" },
}

function CatalogStep({
  onAddProduct,
  onGoToCart,
  itemsCount,
}: {
  onAddProduct: (productId: string) => void
  onGoToCart: () => void
  itemsCount: number
}) {
  return (
    <div className="grid gap-6 lg:grid-cols-[2fr,1fr]">
      <Card className="h-full">
        <CardHeader className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-2xl">Catálogo de produtos</CardTitle>
            <CardDescription>
              Seleção mockada de itens premium para compor o pedido.
            </CardDescription>
          </div>
          <Badge variant="secondary" className="flex items-center gap-1">
            <Package className="h-3.5 w-3.5" aria-hidden="true" />
            {products.length} produtos
          </Badge>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          {products.map((product) => (
            <article
              key={product.id}
              className="flex h-full flex-col justify-between rounded-lg border border-border p-4 transition hover:border-primary"
            >
              <div className="space-y-2">
                <h3 className="text-lg font-semibold text-foreground">{product.name}</h3>
                <p className="text-sm text-muted-foreground">{product.description}</p>
              </div>
              <div className="mt-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-base font-semibold text-foreground">
                    {formatCurrency(product.price)}
                  </span>
                  <Badge variant="outline">{product.category}</Badge>
                </div>
                <Button
                  variant="outline"
                  onClick={() => onAddProduct(product.id)}
                  className="w-full"
                >
                  <ShoppingCart className="mr-2 h-4 w-4" aria-hidden="true" />
                  Adicionar
                </Button>
                <p className="text-xs text-muted-foreground">
                  Estoque virtual: {product.stock} unidade{product.stock > 1 ? "s" : ""}
                </p>
              </div>
            </article>
          ))}
        </CardContent>
      </Card>

      <Card className="sticky top-8 h-fit">
        <CardHeader>
          <CardTitle className="text-xl">Resumo rápido</CardTitle>
          <CardDescription>
            A sessão permanece ativa mesmo ao recarregar a página. O carrinho é salvo localmente.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-md border border-dashed border-border p-4 text-sm">
            <p className="text-muted-foreground">
              <strong className="text-foreground">Status da sessão:</strong> autenticada e persistida via
              localStorage. O fluxo segue bloqueado até login/cadastro.
            </p>
          </div>
          <Button
            className="w-full"
            size="lg"
            onClick={onGoToCart}
            disabled={itemsCount === 0}
          >
            Continuar para o carrinho
            <ChevronRight className="ml-2 h-4 w-4" aria-hidden="true" />
          </Button>
          {itemsCount === 0 ? (
            <p className="text-center text-xs text-muted-foreground">
              Adicione itens para liberar o próximo passo.
            </p>
          ) : (
            <p className="text-center text-sm text-muted-foreground">
              Você possui <strong>{itemsCount}</strong> item{itemsCount > 1 ? "s" : ""} no carrinho.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function CartStep({
  items,
  total,
  onUpdateQuantity,
  onRemove,
  onGoToCatalog,
  onGoToPayment,
}: {
  items: ReturnType<typeof useCartStore>["items"]
  total: number
  onUpdateQuantity: (productId: string, quantity: number) => void
  onRemove: (productId: string) => void
  onGoToCatalog: () => void
  onGoToPayment: () => void
}) {
  const hasItems = items.length > 0

  return (
    <Card>
      <CardHeader className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle className="text-2xl">Seu carrinho</CardTitle>
          <CardDescription>Edite quantidades, remova itens e prossiga.</CardDescription>
        </div>
        <Badge variant="secondary" className="flex items-center gap-1">
          <ShoppingCart className="h-3.5 w-3.5" aria-hidden="true" />
          {items.length} item{items.length !== 1 ? "s" : ""}
        </Badge>
      </CardHeader>
      <CardContent className="space-y-6">
        {!hasItems ? (
          <div className="rounded-md border border-dashed border-border p-6 text-center">
            <Package className="mx-auto h-10 w-10 text-muted-foreground" aria-hidden="true" />
            <p className="mt-3 text-sm text-muted-foreground">
              Seu carrinho está vazio. Volte ao catálogo para escolher novos produtos.
            </p>
            <Button className="mt-4" onClick={onGoToCatalog}>
              <ChevronLeft className="mr-2 h-4 w-4" aria-hidden="true" />
              Ir para o catálogo
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <ul className="space-y-3">
              {items.map((item) => (
                <li
                  key={item.product.id}
                  className="flex flex-col gap-4 rounded-lg border border-border p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="text-sm font-semibold text-foreground">{item.product.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatCurrency(item.product.price)} • Estoque: {item.product.stock}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Label className="text-xs text-muted-foreground" htmlFor={`quantity-${item.product.id}`}>
                      Quantidade
                    </Label>
                    <Input
                      id={`quantity-${item.product.id}`}
                      type="number"
                      min={1}
                      max={item.product.stock}
                      value={item.quantity}
                      onChange={(event) => {
                        const nextValue = Number(event.target.value)
                        onUpdateQuantity(item.product.id, nextValue)
                      }}
                      className="w-20"
                    />
                    <Button variant="ghost" size="sm" onClick={() => onRemove(item.product.id)}>
                      Remover
                    </Button>
                    <span className="min-w-[96px] text-right text-sm font-medium text-foreground">
                      {formatCurrency(item.product.price * item.quantity)}
                    </span>
                  </div>
                </li>
              ))}
            </ul>

            <div className="flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-col text-sm text-muted-foreground">
                <span>Subtotal</span>
                <span className="text-lg font-semibold text-foreground">
                  {formatCurrency(total)}
                </span>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button variant="outline" onClick={onGoToCatalog}>
                  <ChevronLeft className="mr-2 h-4 w-4" aria-hidden="true" />
                  Escolher mais itens
                </Button>
                <Button onClick={onGoToPayment}>
                  Avançar para pagamento
                  <ChevronRight className="ml-2 h-4 w-4" aria-hidden="true" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function PaymentStep({
  user,
  items,
  total,
  payment,
  processing,
  onUpdatePayment,
  onSelectMethod,
  onBackToCart,
  onConfirm,
}: {
  user: NonNullable<ReturnType<typeof useAuthStore>["user"]>
  items: ReturnType<typeof useCartStore>["items"]
  total: number
  payment: CheckoutFormValues
  processing: boolean
  onUpdatePayment: (values: Partial<CheckoutFormValues>) => void
  onSelectMethod: (method: PaymentMethod) => void
  onBackToCart: () => void
  onConfirm: () => Promise<void>
}) {
  const method = payment.paymentMethod

  return (
    <div className="grid gap-6 lg:grid-cols-[2fr,1fr]">
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Dados do comprador</CardTitle>
            <CardDescription>
              Informações carregadas da sessão autenticada (somente leitura).
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <Field label="Nome" value={user.name} />
            <Field label="E-mail" value={user.email} />
            <Field label="Documento" value={user.document} />
            <Field label="Telefone" value={user.phone} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Método de pagamento</CardTitle>
            <CardDescription>Escolha uma opção para exibir os campos específicos.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-3">
            {(Object.keys(paymentLabels) as PaymentMethod[]).map((option) => {
              const meta = paymentLabels[option]
              const isActive = method === option
              const Icon = meta.icon
              return (
                <button
                  key={option}
                  type="button"
                  className={cn(
                    "flex flex-col gap-2 rounded-lg border border-border p-4 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    isActive ? "border-primary bg-primary/5 text-primary" : "hover:border-primary",
                  )}
                  onClick={() => onSelectMethod(option)}
                >
                  <div className="flex items-center gap-2">
                    <div
                      className={cn(
                        "flex h-9 w-9 items-center justify-center rounded-full border",
                        isActive ? "border-primary bg-primary text-primary-foreground" : "border-border",
                      )}
                    >
                      <Icon className="h-4 w-4" aria-hidden="true" />
                    </div>
                    <span className="text-sm font-semibold capitalize">{meta.title}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{meta.description}</p>
                </button>
              )
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Detalhes do pagamento</CardTitle>
            <CardDescription>Campos obrigatórios variam conforme o método escolhido.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            {method === "pix" ? (
              <div className="grid gap-2 sm:max-w-sm">
                <Label htmlFor="pixKey">Chave Pix</Label>
                <Input
                  id="pixKey"
                  placeholder="CPF, CNPJ, e-mail ou chave aleatória"
                  value={payment.pixKey ?? ""}
                  onChange={(event) =>
                    onUpdatePayment({
                      pixKey: event.target.value,
                    })
                  }
                  autoComplete="off"
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Simulação: gere um QR Code virtual após confirmar.
                </p>
              </div>
            ) : null}

            {method === "credit" ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-2 sm:col-span-2">
                  <Label htmlFor="cardHolder">Nome impresso no cartão</Label>
                  <Input
                    id="cardHolder"
                    placeholder="Maria S Souza"
                    value={payment.cardHolder ?? ""}
                    onChange={(event) =>
                      onUpdatePayment({
                        cardHolder: event.target.value.toUpperCase(),
                      })
                    }
                    autoComplete="cc-name"
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="cardNumber">Número do cartão</Label>
                  <Input
                    id="cardNumber"
                    inputMode="numeric"
                    autoComplete="cc-number"
                    maxLength={19}
                    placeholder="0000 0000 0000 0000"
                    value={maskCardNumber(payment.cardNumber ?? "")}
                    onChange={(event) =>
                      onUpdatePayment({
                        cardNumber: maskCardNumber(event.target.value),
                      })
                    }
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="cardExpiration">Validade</Label>
                  <Input
                    id="cardExpiration"
                    inputMode="numeric"
                    autoComplete="cc-exp"
                    placeholder="MM/AA"
                    maxLength={5}
                    value={maskExpiration(payment.cardExpiration ?? "")}
                    onChange={(event) =>
                      onUpdatePayment({
                        cardExpiration: maskExpiration(event.target.value),
                      })
                    }
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="cardCvv">CVV</Label>
                  <Input
                    id="cardCvv"
                    inputMode="numeric"
                    autoComplete="cc-csc"
                    maxLength={4}
                    placeholder="123"
                    value={payment.cardCvv ?? ""}
                    onChange={(event) =>
                      onUpdatePayment({
                        cardCvv: event.target.value.replace(/\D/g, ""),
                      })
                    }
                    required
                  />
                </div>
              </div>
            ) : null}

            {method === "boleto" ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="boletoDueDate">Vencimento</Label>
                  <Input
                    id="boletoDueDate"
                    type="date"
                    value={payment.boletoDueDate ?? ""}
                    onChange={(event) =>
                      onUpdatePayment({
                        boletoDueDate: event.target.value,
                      })
                    }
                    required
                  />
                </div>
                <div className="grid gap-2 sm:col-span-2">
                  <Label htmlFor="boletoInstructions">Instruções adicionais</Label>
                  <Input
                    id="boletoInstructions"
                    placeholder="Ex: Enviar comprovante após pagamento."
                    value={payment.boletoInstructions ?? ""}
                    onChange={(event) =>
                      onUpdatePayment({
                        boletoInstructions: event.target.value,
                      })
                    }
                  />
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>

      <aside className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Resumo do pedido</CardTitle>
            <CardDescription>Reveja itens antes de confirmar.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ul className="space-y-3 text-sm">
              {items.length === 0 ? (
                <li className="text-muted-foreground">Carrinho vazio após limpar pagamento.</li>
              ) : (
                items.map((item) => (
                  <li key={item.product.id} className="flex items-center justify-between">
                    <span>
                      {item.quantity}x {item.product.name}
                    </span>
                    <span className="font-medium text-foreground">
                      {formatCurrency(item.product.price * item.quantity)}
                    </span>
                  </li>
                ))
              )}
            </ul>

            <div className="flex items-center justify-between border-t border-border pt-4 text-sm">
              <span className="font-semibold text-foreground">Total a pagar</span>
              <span className="text-lg font-bold text-foreground">{formatCurrency(total)}</span>
            </div>

            <div className="space-y-2 text-xs text-muted-foreground">
              <p className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" aria-hidden="true" />
                Proteção de dados simulada. Nenhuma informação é enviada a servidores.
              </p>
              <p className="flex items-center gap-2">
                <Box className="h-4 w-4 text-primary" aria-hidden="true" />
                Pagamentos são processados em poucos segundos neste mock.
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="flex flex-col gap-2">
          <Button variant="outline" onClick={onBackToCart} disabled={processing}>
            <ChevronLeft className="mr-2 h-4 w-4" aria-hidden="true" />
            Voltar ao carrinho
          </Button>
          <Button
            onClick={onConfirm}
            disabled={processing}
            className="bg-emerald-600 hover:bg-emerald-600/90"
          >
            {processing ? (
              <span className="flex items-center gap-2">
                <RefreshCw className="h-4 w-4 animate-spin" aria-hidden="true" />
                Processando pagamento...
              </span>
            ) : (
              <>
                Confirmar pedido
                <ChevronRight className="ml-2 h-4 w-4" aria-hidden="true" />
              </>
            )}
          </Button>
        </div>
      </aside>
    </div>
  )
}

function StatusStep({
  attempt,
  attempts,
  status,
  processing,
  onRetry,
  onStartOver,
}: {
  attempt: ReturnType<typeof currentAttempt>
  attempts: ReturnType<typeof useCheckoutStore>["attempts"]
  status: string
  processing: boolean
  onRetry: () => void
  onStartOver: () => void
}) {
  const OutcomeIcon = status === "pago" ? CheckCircle : status === "processando" ? RefreshCw : XCircle
  const outcomeColor =
    status === "pago" ? "text-emerald-600" : status === "processando" ? "text-blue-600" : "text-destructive"

  return (
    <div className="grid gap-6 lg:grid-cols-[2fr,1fr]">
      <Card className="space-y-0">
        <CardHeader className="border-b border-border">
          <CardTitle>Resultado da tentativa de pagamento</CardTitle>
          <CardDescription>
            Simulação do ciclo completo: inicial → processando → pago | falhado | expirado.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 pt-6">
          <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/40 px-4 py-3">
            <OutcomeIcon className={cn("h-6 w-6", outcomeColor)} aria-hidden="true" />
            <div>
              <p className="text-sm font-semibold text-foreground capitalize">
                Status atual: {status}
              </p>
              <p className="text-xs text-muted-foreground">
                {attempt?.details ??
                  (status === "processando"
                    ? "Estamos validando as informações do pagamento."
                    : "Sem detalhes disponíveis.")}
              </p>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-foreground">Linha do tempo</h3>
            <ul className="mt-3 space-y-3">
              <TimelineItem active label="Inicial" description="Pedido preparado para pagamento" />
              <TimelineItem
                active={["processando", "pago", "falhado", "expirado"].includes(status)}
                label="Processando"
                description="Em análise pelo gateway mockado"
              />
              <TimelineItem
                active={status === "pago"}
                label="Pago"
                description="Pedido confirmado e a caminho"
              />
              <TimelineItem
                active={status === "falhado"}
                variant="destructive"
                label="Falhou"
                description="Transação recusada ou inválida"
              />
              <TimelineItem
                active={status === "expirado"}
                variant="destructive"
                label="Expirou"
                description="Tempo limite atingido"
              />
            </ul>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            {status === "pago" ? (
              <Button className="bg-emerald-600 hover:bg-emerald-600/90" onClick={onStartOver}>
                Finalizar e voltar ao catálogo
              </Button>
            ) : (
              <>
                <Button variant="outline" onClick={onStartOver}>
                  Recomeçar do zero
                </Button>
                <Button
                  onClick={onRetry}
                  disabled={processing}
                  className="bg-amber-500 hover:bg-amber-500/90"
                >
                  <RefreshCw className="mr-2 h-4 w-4" aria-hidden="true" />
                  Tentar novamente
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Histórico de tentativas</CardTitle>
          <CardDescription>Registro das tentativas mais recentes.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {attempts.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nenhuma tentativa registrada. Finalize um pagamento para começar.
            </p>
          ) : (
            <ul className="space-y-3 text-sm">
              {attempts
                .slice()
                .reverse()
                .map((item) => (
                  <li key={item.id} className="rounded-lg border border-border px-4 py-3 text-left">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-foreground capitalize">{item.method}</span>
                      <span className="text-muted-foreground">
                        {item.createdAt.toLocaleTimeString("pt-BR", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                    <Badge
                      variant={statusVariants[item.status]?.variant ?? "secondary"}
                      className="mt-2 capitalize"
                    >
                      {statusVariants[item.status]?.label ?? item.status}
                    </Badge>
                    <p className="mt-2 text-xs text-muted-foreground">{item.details}</p>
                  </li>
                ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function TimelineItem({
  label,
  description,
  active,
  variant = "default",
}: {
  label: string
  description: string
  active: boolean
  variant?: "default" | "destructive"
}) {
  return (
    <li className="flex gap-3">
      <span
        className={cn(
          "mt-1 grid h-6 w-6 place-content-center rounded-full border text-xs font-semibold",
          active
            ? variant === "destructive"
              ? "border-destructive bg-destructive text-destructive-foreground"
              : "border-primary bg-primary text-primary-foreground"
            : "border-border text-muted-foreground",
        )}
      >
        •
      </span>
      <div>
        <p className={cn("text-sm font-semibold", active ? "text-foreground" : "text-muted-foreground")}>
          {label}
        </p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
    </li>
  )
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs uppercase tracking-[0.08em] text-muted-foreground">{label}</Label>
      <div className="rounded-md border border-border bg-muted/40 px-3 py-2 text-sm text-foreground">
        {value}
      </div>
    </div>
  )
}

function validatePayment(payment: CheckoutFormValues) {
  switch (payment.paymentMethod) {
    case "pix":
      if (!payment.pixKey) {
        return "Informe a chave Pix para continuidade."
      }
      break
    case "credit":
      if (!payment.cardHolder || payment.cardHolder.length < 3) {
        return "Nome do titular inválido."
      }
      if (!payment.cardNumber || payment.cardNumber.replace(/\s/g, "").length < 16) {
        return "Número do cartão incompleto."
      }
      if (!payment.cardExpiration || payment.cardExpiration.length < 5) {
        return "Informe a validade no formato MM/AA."
      }
      if (!payment.cardCvv || payment.cardCvv.length < 3) {
        return "Informe o código de segurança (CVV)."
      }
      break
    case "boleto":
      if (!payment.boletoDueDate) {
        return "Selecione a data de vencimento do boleto."
      }
      break
    default:
      return "Selecione um método de pagamento válido."
  }
  return null
}

function AuthScreen({
  loading,
  error,
  login,
  register,
  clearError,
}: {
  loading: boolean
  error: string | null
  login: ReturnType<typeof useAuthStore>["login"]
  register: ReturnType<typeof useAuthStore>["register"]
  clearError: ReturnType<typeof useAuthStore>["clearError"]
}) {
  const [mode, setMode] = useState<"login" | "register">("login")
  const [formValues, setFormValues] = useState({
    name: "",
    email: "",
    password: "",
  })

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    clearError()
    const action = mode === "login" ? login : register
    const success = await action({
      email: formValues.email.trim(),
      password: formValues.password.trim(),
      name: formValues.name.trim(),
    })

    if (success) {
      toast.success(mode === "login" ? "Bem-vindo de volta!" : "Conta criada com sucesso!")
    }
  }

  return (
    <Card className="mx-auto max-w-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-2xl">
          <BadgeCheck className="h-5 w-5" aria-hidden="true" />
          {mode === "login" ? "Entre para continuar" : "Crie sua conta"}
        </CardTitle>
        <CardDescription>
          Use as credenciais mockadas ou crie um novo acesso para simular o fluxo completo.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <form className="space-y-4" onSubmit={handleSubmit} noValidate>
          {mode === "register" ? (
            <div className="grid gap-2">
              <Label htmlFor="name">Nome completo</Label>
              <Input
                id="name"
                name="name"
                autoComplete="name"
                placeholder="Maria Silva"
                required
                value={formValues.name}
                onChange={(event) =>
                  setFormValues((prev) => ({
                    ...prev,
                    name: event.target.value,
                  }))
                }
              />
            </div>
          ) : null}

          <div className="grid gap-2">
            <Label htmlFor="email">E-mail</Label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="aline@example.com"
              required
              value={formValues.email}
              onChange={(event) =>
                setFormValues((prev) => ({
                  ...prev,
                  email: event.target.value,
                }))
              }
            />
          </div>

          <div className="grid gap-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Senha</Label>
              {mode === "login" ? (
                <span className="text-xs text-muted-foreground">
                  Dica: use <strong>senha123</strong> para contas mock.
                </span>
              ) : null}
            </div>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              placeholder="********"
              required
              minLength={6}
              value={formValues.password}
              onChange={(event) =>
                setFormValues((prev) => ({
                  ...prev,
                  password: event.target.value,
                }))
              }
            />
          </div>

          {error ? (
            <p className="rounded-md border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          ) : null}

          <Button className="w-full" disabled={loading} type="submit">
            {loading ? (
              <span className="flex items-center gap-2">
                <RefreshCw className="h-4 w-4 animate-spin" aria-hidden="true" />
                Processando...
              </span>
            ) : mode === "login" ? (
              "Entrar"
            ) : (
              "Criar conta"
            )}
          </Button>
        </form>

        <div className="rounded-md border border-dashed border-border p-4 text-xs text-muted-foreground">
          <p className="font-semibold text-foreground">Usuários de demonstração</p>
          <ul className="mt-2 space-y-1">
            <li>
              <span className="font-medium text-foreground">E-mail:</span> aline@example.com |{" "}
              <span className="font-medium">Senha:</span> senha123
            </li>
            <li>
              <span className="font-medium text-foreground">E-mail:</span> carlos@example.com |{" "}
              <span className="font-medium">Senha:</span> senha123
            </li>
          </ul>
        </div>

        <button
          type="button"
          className="w-full text-sm text-muted-foreground transition hover:text-foreground"
          onClick={() => {
            setMode((prev) => (prev === "login" ? "register" : "login"))
            clearError()
            setFormValues((values) => ({
              ...values,
              password: "",
            }))
          }}
        >
          {mode === "login"
            ? "Nunca comprou aqui? Crie uma conta."
            : "Já possui cadastro? Faça login."}
        </button>
      </CardContent>
    </Card>
  )
}

function StepProgress({
  currentStep,
  onNavigate,
  status,
  attempts,
}: {
  currentStep: CheckoutStep
  onNavigate: (step: CheckoutStep) => void
  status: string
  attempts: number
}) {
  const currentIndex = stepOrder.indexOf(currentStep)
  return (
    <nav aria-label="Progresso do checkout" className="grid gap-3">
      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <span className="rounded-full bg-muted px-3 py-1 font-medium text-foreground">
          Passo {currentIndex + 1} de {stepOrder.length}
        </span>
        {currentStep === "status" && attempts > 0 ? (
          <span className="flex items-center gap-1 rounded-full bg-muted px-3 py-1">
            <TimerReset className="h-3.5 w-3.5" aria-hidden="true" />
            {attempts} tentativa{attempts > 1 ? "s" : ""} registrada{attempts > 1 ? "s" : ""}
          </span>
        ) : null}
        {statusVariants[status] ? (
          <span className="flex items-center gap-1 rounded-full bg-muted px-3 py-1 capitalize">
            <span className="h-2 w-2 rounded-full bg-primary" aria-hidden="true" />
            {statusVariants[status].label}
          </span>
        ) : null}
      </div>
      <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {stepOrder.map((step, index) => {
          const stepMeta = stepLabels[step]
          const isActive = currentStep === step
          const isComplete = index < currentIndex
          const Icon = stepMeta.icon
          return (
            <li key={step}>
              <button
                type="button"
                className={cn(
                  "flex w-full items-center justify-between gap-3 rounded-lg border px-4 py-3 text-left transition",
                  isActive
                    ? "border-primary bg-primary/5 text-primary shadow-sm"
                    : isComplete
                      ? "border-border bg-muted/40 text-muted-foreground hover:border-primary"
                      : "border-border text-muted-foreground hover:border-muted-foreground/40",
                )}
                aria-current={isActive ? "step" : undefined}
                onClick={() => onNavigate(step)}
              >
                <div className="flex flex-col">
                  <span className="text-xs font-medium uppercase text-muted-foreground">
                    {index + 1} • {stepMeta.title}
                  </span>
                  <span className="text-sm text-foreground">{stepMeta.description}</span>
                </div>
                <div
                  className={cn(
                    "flex h-9 w-9 items-center justify-center rounded-full border",
                    isActive
                      ? "border-primary bg-primary/10 text-primary"
                      : isComplete
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-background text-muted-foreground",
                  )}
                >
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </div>
              </button>
            </li>
          )
        })}
      </ol>
    </nav>
  )
}

export default function CheckoutExperience() {
  const [isHydrated, setIsHydrated] = useState(false)

  const authUser = useAuthStore((state) => state.user)
  const authLoading = useAuthStore((state) => state.loading)
  const authError = useAuthStore((state) => state.error)
  const login = useAuthStore((state) => state.login)
  const register = useAuthStore((state) => state.register)
  const logout = useAuthStore((state) => state.logout)
  const clearAuthError = useAuthStore((state) => state.clearError)

  const cartItems = useCartStore((state) => state.items)
  const addItemToCart = useCartStore((state) => state.addItem)
  const updateCartQuantity = useCartStore((state) => state.updateQuantity)
  const removeCartItem = useCartStore((state) => state.removeItem)
  const clearCart = useCartStore((state) => state.clear)

  const checkoutStep = useCheckoutStore((state) => state.step)
  const checkoutStatus = useCheckoutStore((state) => state.status)
  const isProcessing = useCheckoutStore((state) => state.processing)
  const paymentState = useCheckoutStore((state) => state.payment)
  const attempts = useCheckoutStore((state) => state.attempts)
  const activeAttemptId = useCheckoutStore((state) => state.activeAttemptId)
  const setCheckoutStep = useCheckoutStore((state) => state.setStep)
  const setPaymentMethod = useCheckoutStore((state) => state.setPaymentMethod)
  const updatePaymentState = useCheckoutStore((state) => state.updatePayment)
  const submitOrder = useCheckoutStore((state) => state.submitOrder)
  const resetCheckout = useCheckoutStore((state) => state.reset)
  const retryCheckout = useCheckoutStore((state) => state.retry)

  useEffect(() => {
    const frame = requestAnimationFrame(() => setIsHydrated(true))
    return () => cancelAnimationFrame(frame)
  }, [])

  useEffect(() => {
    if (!isHydrated) return
    if (!authUser) {
      resetCheckout()
      clearCart()
      return
    }

    if (cartItems.length === 0 && (checkoutStep === "cart" || checkoutStep === "payment")) {
      setCheckoutStep("catalog")
    }
  }, [authUser, isHydrated, cartItems.length, checkoutStep, resetCheckout, clearCart, setCheckoutStep])

  const cartTotalValue = useMemo(() => cartTotal(cartItems), [cartItems])
  const itemsCount = useMemo(() => cartQuantity(cartItems), [cartItems])

  const activeAttempt = useMemo(() => {
    if (!activeAttemptId) return null
    return attempts.find((item) => item.id === activeAttemptId) ?? currentAttempt()
  }, [activeAttemptId, attempts])

  if (!isHydrated) {
    return (
      <div className="min-h-screen bg-background">
        <main className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-6 py-16">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-[420px] w-full" />
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Toaster position="top-center" theme="light" richColors />
      <main className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 py-10 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-4 border-b border-border pb-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Colmeia Checkout
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              Fluxo completo de checkout com autenticação, catálogo, carrinho e pagamento via Pix, Cartão ou Boleto.
            </p>
          </div>
          {authUser ? (
            <div className="flex items-center gap-3 rounded-lg border border-border px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-foreground">{authUser.name}</p>
                <p className="text-xs text-muted-foreground">{authUser.email}</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="ml-2"
                onClick={() => {
                  logout()
                  resetCheckout()
                  clearCart()
                  toast.info("Você saiu da sessão.")
                }}
              >
                <LogOut className="mr-2 h-4 w-4" aria-hidden="true" />
                Sair
              </Button>
            </div>
          ) : null}
        </header>

        {!authUser ? (
          <AuthScreen
            loading={authLoading}
            error={authError}
            login={login}
            register={register}
            clearError={clearAuthError}
          />
        ) : (
          <section className="flex flex-col gap-8">
            <StepProgress
              currentStep={checkoutStep}
              status={checkoutStatus}
              attempts={attempts.length}
              onNavigate={(step) => {
                if (step === checkoutStep) return
                if (step === "payment" && cartItems.length === 0) {
                  toast.error("Adicione itens ao carrinho antes de continuar.")
                  return
                }
                if (step === "cart" && cartItems.length === 0) {
                  setCheckoutStep("catalog")
                  return
                }
                setCheckoutStep(step)
              }}
            />

            {checkoutStep === "catalog" ? (
              <CatalogStep
                itemsCount={itemsCount}
                onAddProduct={(productId) => {
                  const product = products.find((item) => item.id === productId)
                  if (!product) return
                  addItemToCart(product)
                  toast.success(`${product.name} adicionado ao carrinho`)
                }}
                onGoToCart={() => setCheckoutStep("cart")}
              />
            ) : null}

            {checkoutStep === "cart" ? (
              <CartStep
                items={cartItems}
                total={cartTotalValue}
                onUpdateQuantity={updateCartQuantity}
                onRemove={removeCartItem}
                onGoToCatalog={() => setCheckoutStep("catalog")}
                onGoToPayment={() => setCheckoutStep("payment")}
              />
            ) : null}

            {checkoutStep === "payment" ? (
              <PaymentStep
                user={authUser!}
                items={cartItems}
                total={cartTotalValue}
                payment={paymentState}
                processing={isProcessing}
                onUpdatePayment={updatePaymentState}
                onSelectMethod={setPaymentMethod}
                onBackToCart={() => setCheckoutStep("cart")}
                onConfirm={async () => {
                  const validationMessage = validatePayment(paymentState)
                  if (validationMessage) {
                    toast.warning(validationMessage)
                    return
                  }

                  const attempt = await submitOrder(cartTotalValue)

                  if (attempt.status === "pago") {
                    clearCart()
                    toast.success("Pagamento aprovado! Pedido confirmado.")
                  } else {
                    toast.error(attempt.details ?? "Pagamento não aprovado.")
                  }
                }}
              />
            ) : null}

            {checkoutStep === "status" ? (
              <StatusStep
                attempt={activeAttempt}
                attempts={attempts}
                status={checkoutStatus}
                processing={isProcessing}
                onRetry={() => {
                  retryCheckout()
                  toast.info("Vamos tentar novamente. Confira os dados de pagamento.")
                }}
                onStartOver={() => {
                  resetCheckout()
                  setCheckoutStep("catalog")
                  toast.message("Fluxo reiniciado. Escolha novos produtos.")
                }}
              />
            ) : null}
          </section>
        )}
      </main>
    </div>
  )
}
