
'use client';

import Link from 'next/link';

export default function Footer() {
  return (
    <div className="bg-card border-t p-4 print-hidden">
      <div className="container mx-auto text-center">
        <Link href="/admin/orders" className="text-sm text-muted-foreground hover:text-primary">
          Painel Administrativo
        </Link>
      </div>
    </div>
  );
}
