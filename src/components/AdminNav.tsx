
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { usePermissions } from '@/context/PermissionsContext';
import { hasAccess, ALL_SECTIONS } from '@/lib/permissions';
import { cn } from '@/lib/utils';

export default function AdminNav() {
  const pathname = usePathname();
  const { user } = useAuth();
  const { permissions } = usePermissions();

  if (!user || !permissions) {
    return null;
  }

  const accessibleNavItems = ALL_SECTIONS.filter(item => hasAccess(user.role, item.id, permissions));

  return (
    <div className="mb-8 overflow-x-auto">
      <nav className="inline-flex h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground">
        {accessibleNavItems.map(item => {
          const isActive = pathname.startsWith(`/admin/${item.id}`);
          return (
            <Link
              key={item.id}
              href={`/admin/${item.id}`}
              className={cn(
                "inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
                isActive ? "bg-background text-foreground shadow-sm" : "hover:bg-background/50"
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
