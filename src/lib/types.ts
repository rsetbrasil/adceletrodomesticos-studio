export type Product = {
  id: string;
  name: string;
  description: string;
  longDescription: string;
  price: number;
  imageUrls: string[];
  category: string;
  subcategory?: string;
  stock: number;
  maxInstallments?: number;
  paymentCondition?: string; // Adicionado
  "data-ai-hint"?: string;
  createdAt: string; // Adicionado para ordenação
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
  zip: string;
  address: string;
  number: string;
  complement?: string;
  neighborhood: string;
  city: string;
  state: string;
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
  paymentDate?: string | null;
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

export type UserRole = 'admin' | 'gerente' | 'vendedor';

export type User = {
  id: string;
  username: string;
  password?: string; // Made optional for storing in session without password
  name: string;
  role: UserRole;
};

export type Category = {
  id: string;
  name: string;
  subcategories: string[];
};
