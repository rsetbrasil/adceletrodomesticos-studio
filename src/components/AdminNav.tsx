'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function AdminNav() {
  const pathname = usePathname();

  const activeTab = pathname.includes('/products') ? 'products' : 'orders';

  return (
    <Tabs defaultValue={activeTab} className="mb-8">
      <TabsList>
        <Link href="/admin/orders" legacyBehavior passHref>
          <TabsTrigger value="orders">Gerenciar Pedidos</TabsTrigger>
        </Link>
        <Link href="/admin/products" legacyBehavior passHref>
          <TabsTrigger value="products">Cadastrar Produto</TabsTrigger>
        </Link>
      </TabsList>
    </Tabs>
  );
}
