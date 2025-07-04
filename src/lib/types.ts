export type Product = {
  id: string;
  name: string;
  description: string;
  price: number;
  imageUrl: string;
  category: string;
  stock: number;
  "data-ai-hint"?: string;
};

export type CartItem = {
  id: string;
  name: string;
  price: number;
  imageUrl: string;
  quantity: number;
};

export type CustomerInfo = {
  name: string;
  cpf: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  state: string;
  zip: string;
};

export type Order = {
  id: string;
  customer: CustomerInfo;
  items: CartItem[];
  total: number;
  installments: number;
  installmentValue: number;
  date: string;
};
