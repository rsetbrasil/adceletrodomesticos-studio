

export type Product = {
  id: string;
  name: string;
  description: string;
  longDescription: string;
  price: number;
  cost?: number;
  onSale?: boolean;
  imageUrls: string[];
  category: string;
  subcategory?: string;
  stock: number;
  maxInstallments?: number;
  paymentCondition?: string; 
  commissionType?: 'percentage' | 'fixed';
  commissionValue?: number;
  "data-ai-hint"?: string;
  createdAt: string; 
};

export type CartItem = {
  id: string;
  name: string;
  price: number;
  imageUrl: string;
  quantity: number;
};

export type Attachment = {
  name: string;
  type: 'image' | 'pdf';
  url: string;
  comment?: string;
  addedAt?: string; // ISO String
  addedBy?: string; // User name
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
  password?: string;
};

export type Payment = {
  id: string;
  amount: number;
  date: string;
  method: 'Dinheiro' | 'Pix' | 'Cartão';
  change?: number;
}

export type Installment = {
  id: string;
  installmentNumber: number;
  dueDate: string;
  amount: number;
  status: 'Pendente' | 'Pago';
  paidAmount: number;
  payments: Payment[];
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
  status: 'Processando' | 'Enviado' | 'Entregue' | 'Cancelado' | 'Excluído';
  paymentMethod: PaymentMethod;
  installmentDetails: Installment[];
  attachments?: Attachment[];
  sellerId?: string;
  sellerName?: string;
  commission?: number;
  commissionPaid?: boolean;
  isCommissionManual?: boolean;
};

export type CommissionPayment = {
    id: string;
    sellerId: string;
    sellerName: string;
    amount: number;
    paymentDate: string;
    period: string;
    orderIds: string[];
};

export type UserRole = 'admin' | 'gerente' | 'vendedor';

export type User = {
  id: string;
  username: string;
  password?: string; 
  name: string;
  role: UserRole;
};

export type Category = {
  id: string;
  name: string;
  order: number;
  subcategories: string[];
};

export type AuditLog = {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  action: string;
  details: string;
};

export type AppSection = 
    | 'pedidos' 
    | 'clientes' 
    | 'produtos' 
    | 'categorias' 
    | 'financeiro'
    | 'minhas-comissoes'
    | 'auditoria'
    | 'configuracao'
    | 'usuarios';

export type RolePermissions = Record<UserRole, AppSection[]>;

    
