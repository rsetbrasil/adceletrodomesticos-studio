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
  } else if (pathname.includes('/financeiro')) {
    activeTab = 'financeiro';
  }


  return (
    <Tabs value={activeTab} className="mb-8">
      <TabsList className="grid w-full grid-cols-2 sm:grid-cols-5">
        <TabsTrigger value="orders" asChild>
          <Link href="/admin/orders">Pedidos</Link>
        </TabsTrigger>
        <TabsTrigger value="customers" asChild>
          <Link href="/admin/customers">Clientes</Link>
        </TabsTrigger>
        <TabsTrigger value="products" asChild>
          <Link href="/admin/products">Produtos</Link>
        </TabsTrigger>
         <TabsTrigger value="categories" asChild>
          <Link href="/admin/categories">Categorias</Link>
        </TabsTrigger>
         <TabsTrigger value="financeiro" asChild>
          <Link href="/admin/financeiro">Financeiro</Link>
        </TabsTrigger>
      </TabsList>
    </Tabs>
  );
}
