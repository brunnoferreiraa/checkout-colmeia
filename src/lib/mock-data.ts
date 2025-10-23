export type ProductCategory = "bebidas" | "alimentos" | "acessorios"

export interface Product {
  id: string
  name: string
  description: string
  price: number
  category: ProductCategory
  stock: number
  image: string
}

export const products: Product[] = [
  {
    id: "cafe-gourmet",
    name: "Café Gourmet Torrado em Grãos",
    description: "Blend especial com notas de chocolate e avelã. Pacote de 500g.",
    price: 49.9,
    category: "bebidas",
    stock: 15,
    image: "/products/coffee-beans.jpg",
  },
  {
    id: "kit-xicaras",
    name: "Kit 2 Xícaras de Cerâmica",
    description: "Conjunto esmaltado com capacidade de 180ml. Resistentes a altas temperaturas.",
    price: 89,
    category: "acessorios",
    stock: 8,
    image: "/products/cups.jpg",
  },
  {
    id: "cafeteira",
    name: "Cafeteira Prensa Francesa 600ml",
    description: "Estrutura em vidro temperado com base antiderrapante. Ideal para cafés filtrados.",
    price: 159.9,
    category: "acessorios",
    stock: 5,
    image: "/products/french-press.jpg",
  },
  {
    id: "chocolate",
    name: "Chocolate Amargo 70% Cacau",
    description: "Chocolate bean-to-bar com doçura equilibrada. Barra de 90g.",
    price: 18.5,
    category: "alimentos",
    stock: 30,
    image: "/products/dark-chocolate.jpg",
  },
  {
    id: "cookie",
    name: "Cookie Artesanal de Nozes",
    description: "Feito com manteiga clarificada e pedaços generosos de nozes pecã.",
    price: 12.9,
    category: "alimentos",
    stock: 24,
    image: "/products/cookies.jpg",
  },
]

export type PaymentMethod = "pix" | "credit" | "boleto"

export interface User {
  id: string
  name: string
  email: string
  document: string
  phone: string
}

export const mockUsers: User[] = [
  {
    id: "u-aline",
    name: "Aline Souza",
    email: "aline@example.com",
    document: "123.456.789-09",
    phone: "+55 11 99999-0000",
  },
  {
    id: "u-carlos",
    name: "Carlos Lima",
    email: "carlos@example.com",
    document: "987.654.321-00",
    phone: "+55 21 98888-1111",
  },
]

export interface PaymentAttempt {
  id: string
  method: PaymentMethod
  status: "inicial" | "processando" | "pago" | "falhado" | "expirado"
  createdAt: Date
  updatedAt: Date
  details?: string
}
