

'use client';

import Link from 'next/link';
import Logo from './Logo';
import { useCart } from '@/context/CartContext';
import { useCustomerAuth } from '@/context/CustomerAuthContext';
import { Button, buttonVariants } from './ui/button';
import { ShoppingBag, User } from 'lucide-react';
import { CartSheet } from './CartSheet';
import { cn } from '@/lib/utils';

export default function Header() {
  const { cartCount, setIsCartOpen } = useCart();
  const { customer } = useCustomerAuth();

  return (
    <div className="bg-card/80 backdrop-blur-lg border-b sticky top-0 z-40">
      <div className="container mx-auto flex justify-between items-center p-4">
        <Link href="/">
          <Logo />
        </Link>
        <div className="flex items-center gap-2">
            <Link href={customer ? "/area-cliente/minha-conta" : "/area-cliente/login"} className={cn(buttonVariants({ variant: "ghost" }))}>
                <User className="mr-2" />
                Área do Cliente
            </Link>
            <CartSheet>
                <Button variant="ghost" className="relative">
                    <ShoppingBag className="mr-2" />
                    Carrinho
                    {cartCount > 0 && (
                        <span className="absolute top-0 right-0 inline-flex items-center justify-center w-5 h-5 text-xs font-bold leading-none text-primary-foreground transform translate-x-1/2 -translate-y-1/2 bg-accent rounded-full">
                        {cartCount}
                        </span>
                    )}
                </Button>
            </CartSheet>
        </div>
      </div>
    </div>
  );
}
