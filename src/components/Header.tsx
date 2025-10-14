
'use client';

import Link from 'next/link';
import { ShoppingBag } from 'lucide-react';
import { Button } from './ui/button';
import { useCart } from '@/context/CartContext';
import { CartSheet } from './CartSheet';
import Logo from './Logo';

export default function Header() {
  const { cartCount, setIsCartOpen } = useCart();

  return (
    <header className="bg-card/80 backdrop-blur-lg border-b sticky top-0 z-40">
      <div className="container mx-auto flex justify-between items-center p-4">
        <Link href="/">
          <Logo />
        </Link>
        <div className="flex items-center gap-4">
            <CartSheet>
                <Button variant="ghost" size="icon" onClick={() => setIsCartOpen(true)} className="relative">
                    <ShoppingBag className="h-6 w-6" />
                    {cartCount > 0 && (
                        <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-primary-foreground transform translate-x-1/2 -translate-y-1/2 bg-accent rounded-full">
                        {cartCount}
                        </span>
                    )}
                </Button>
            </CartSheet>
        </div>
      </div>
    </header>
  );
}
