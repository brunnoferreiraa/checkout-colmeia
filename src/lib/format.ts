export const formatCurrency = (value: number) =>
  value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  })

export const maskCardNumber = (value: string) =>
  value.replace(/\D/g, "").replace(/(\d{4})(?=\d)/g, "$1 ").trim()

export const maskExpiration = (value: string) =>
  value
    .replace(/\D/g, "")
    .slice(0, 4)
    .replace(/(\d{2})(\d{0,2})/, (_, month, year) =>
      year ? `${month}/${year}` : month,
    )
