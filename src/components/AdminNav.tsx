
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/context/AuthContext';
import { usePermissions } from '@/context/PermissionsContext';
import { hasAccess, ALL_SECTIONS } from '@/lib/permissions';

export default function AdminNav() {
  const pathname = usePathname();
  const { user } = useAuth();
  const { permissions } = usePermissions();

  const activeTab = ALL_SECTIONS.find(item => pathname.startsWith(`/admin/${item.id}`))?.id;
  
  if (!user || !permissions) {
    return null;
  }

  const accessibleNavItems = ALL_SECTIONS.filter(item => hasAccess(user.role, item.id, permissions));

  return (
    <Tabs value={activeTab} className="mb-8 overflow-x-auto">
      <TabsList className="sm:inline-flex">
        {accessibleNavItems.map(item => (
            <TabsTrigger key={item.id} value={item.id} asChild>
              <Link href={`/admin/${item.id}`}>{item.label}</Link>
            </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}
