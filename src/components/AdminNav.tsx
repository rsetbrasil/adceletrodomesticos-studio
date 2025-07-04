'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function AdminNav() {
  const pathname = usePathname();

  let activeTab = 'orders';
  if (pathname.includes('/customers')) {
    activeTab = 'customers';
  } else if (pathname.includes('/products')) {
    activeTab = 'products';
  } else if (pathname.includes('/categories')) {
    activeTab = 'categories';
  }


  return (
    <Tabs value={activeTab} className="mb-8">
      <TabsList>
        <TabsTrigger value="orders" asChild>
          <Link href="/admin/orders">Gerenciar Pedidos</Link>
        </TabsTrigger>
        <TabsTrigger value="customers" asChild>
          <Link href="/admin/customers">Gerenciar Clientes</Link>
        </TabsTrigger>
        <TabsTrigger value="products" asChild>
          <Link href="/admin/products">Gerenciar Produtos</Link>
        </TabsTrigger>
         <TabsTrigger value="categories" asChild>
          <Link href="/admin/categories">Gerenciar Categorias</Link>
        </TabsTrigger>
      </TabsList>
    </Tabs>
  );
}
