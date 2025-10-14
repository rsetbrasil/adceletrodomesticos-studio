
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/context/AuthContext';
import { hasAccess } from '@/lib/permissions';

const navItems = [
    { value: 'orders', label: 'Pedidos', href: '/admin/orders', section: 'orders' },
    { value: 'customers', label: 'Clientes', href: '/admin/customers', section: 'customers' },
    { value: 'products', label: 'Produtos', href: '/admin/products', section: 'products' },
    { value: 'categories', label: 'Categorias', href: '/admin/categories', section: 'categories' },
    { value: 'financeiro', label: 'Financeiro', href: '/admin/financeiro', section: 'financeiro' },
    { value: 'auditoria', label: 'Auditoria', href: '/admin/auditoria', section: 'auditoria' },
    { value: 'configuracao', label: 'Configuração', href: '/admin/configuracao', section: 'configuracao' },
    { value: 'users', label: 'Usuários', href: '/admin/users', section: 'users' },
];

export default function AdminNav() {
  const pathname = usePathname();
  const { user } = useAuth();

  const activeTab = navItems.find(item => pathname.startsWith(item.href))?.value || 'orders';
  
  if (!user) {
    return null;
  }

  const accessibleNavItems = navItems.filter(item => hasAccess(user.role, item.section));

  return (
    <Tabs value={activeTab} className="mb-8 overflow-x-auto">
      <TabsList className="sm:inline-flex">
        {accessibleNavItems.map(item => (
            <TabsTrigger key={item.value} value={item.value} asChild>
              <Link href={item.href}>{item.label}</Link>
            </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}
