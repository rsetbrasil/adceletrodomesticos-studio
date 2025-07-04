export type Product = {
  id: string;
  name: string;
  description: string;
  longDescription: string;
  price: number;
  imageUrls: string[];
  category: string;
  stock: number;
  maxInstallments?: number;
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
  attachments?: {
    name: string;
    type: 'image' | 'pdf';
    url: string;
  }[];
};

export type Installment = {
  installmentNumber: number;
  dueDate: string;
  amount: number;
  status: 'Pendente' | 'Pago';
}

export type PaymentMethod = 'Crediário' | 'Pix' | 'Dinheiro';

export type Order = {
  id: string;
  customer: CustomerInfo;
  items: CartItem[];
  total: number;
  installments: number;
  installmentValue: number;
  date: string;
  status: 'Processando' | 'Enviado' | 'Entregue' | 'Cancelado';
  paymentMethod: PaymentMethod;
  installmentDetails: Installment[];
};
