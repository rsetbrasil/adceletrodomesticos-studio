'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/context/AuthContext';

export default function AdminNav() {
  const pathname = usePathname();
  const { user } = useAuth();

  let activeTab = 'orders';
  if (pathname.includes('/customers')) {
    activeTab = 'customers';
  } else if (pathname.includes('/products')) {
    activeTab = 'products';
  } else if (pathname.includes('/categories')) {
    activeTab = 'categories';
  } else if (pathname.includes('/financeiro')) {
    activeTab = 'financeiro';
  } else if (pathname.includes('/users')) {
    activeTab = 'users';
  } else if (pathname.includes('/configuracao')) {
    activeTab = 'configuracao';
  }

  return (
    <Tabs value={activeTab} className="mb-8 overflow-x-auto">
      <TabsList className="sm:inline-flex">
        <TabsTrigger value="orders" asChild>
          <Link href="/admin/orders">Pedidos</Link>
        </TabsTrigger>
        <TabsTrigger value="customers" asChild>
          <Link href="/admin/customers">Clientes</Link>
        </TabsTrigger>
        <TabsTrigger value="products" asChild>
          <Link href="/admin/products">Produtos</Link>
        </TabsTrigger>
        {user?.role !== 'vendedor' && (
          <>
            <TabsTrigger value="categories" asChild>
              <Link href="/admin/categories">Categorias</Link>
            </TabsTrigger>
            <TabsTrigger value="financeiro" asChild>
              <Link href="/admin/financeiro">Financeiro</Link>
            </TabsTrigger>
            <TabsTrigger value="configuracao" asChild>
              <Link href="/admin/configuracao">Configuração</Link>
            </TabsTrigger>
          </>
        )}
        {user?.role === 'admin' && (
            <TabsTrigger value="users" asChild>
              <Link href="/admin/users">Usuários</Link>
            </TabsTrigger>
        )}
      </TabsList>
    </Tabs>
  );
}
