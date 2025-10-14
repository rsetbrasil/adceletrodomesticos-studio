
'use client';

import Link from 'next/link';
import { User, ShoppingBag } from 'lucide-react';
import { Button } from './ui/button';
import { useCart } from '@/context/CartContext';
import { CartSheet } from './CartSheet';

export default function Footer() {
  const { cartCount, setIsCartOpen } = useCart();
  
  return (
    <footer className="bg-card/80 backdrop-blur-lg border-t sticky bottom-0 z-40 print-hidden">
      <div className="container mx-auto flex justify-around items-center p-2">
        <Link href="/admin/orders">
          <Button variant="ghost" size="icon" className="h-12 w-12">
            <User className="h-7 w-7" />
            <span className="sr-only">Painel Administrativo</span>
          </Button>
        </Link>
        <CartSheet>
          <Button variant="ghost" size="icon" onClick={() => setIsCartOpen(true)} className="relative h-12 w-12">
            <ShoppingBag className="h-7 w-7" />
            {cartCount > 0 && (
                <span className="absolute top-1 right-1 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-primary-foreground transform translate-x-1/2 -translate-y-1/2 bg-accent rounded-full">
                {cartCount}
                </span>
            )}
            <span className="sr-only">Carrinho de Compras</span>
          </Button>
        </CartSheet>
      </div>
    </footer>
  );
}
