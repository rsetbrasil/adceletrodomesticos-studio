'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Button } from './ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from './ui/card';
import { Badge } from './ui/badge';
import { useCart } from '@/context/CartContext';
import type { Product } from '@/lib/types';
import { ShoppingCart } from 'lucide-react';

interface ProductCardProps {
  product: Product;
}

export default function ProductCard({ product }: ProductCardProps) {
  const { addToCart, setIsCartOpen } = useCart();

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };
  
  const handleAddToCart = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    addToCart(product);
    setIsCartOpen(true);
  }

  const imageUrl = (product.imageUrls && product.imageUrls.length > 0) 
    ? product.imageUrls[0] 
    : 'https://placehold.co/600x600.png';

  return (
    <Link href={`/products/${product.id}`} className="block h-full" aria-label={`Ver detalhes de ${product.name}`}>
      <Card className="flex flex-col overflow-hidden h-full transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
        <CardHeader className="p-0">
          <div className="relative aspect-square w-full">
            <Image
              src={imageUrl}
              alt={product.name}
              fill
              className="object-contain p-2"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              data-ai-hint={product['data-ai-hint']}
            />
          </div>
        </CardHeader>
        <CardContent className="p-4 flex-grow">
          <div className="flex items-center gap-1 mb-2">
            <Badge variant="secondary" className="capitalize">{product.category}</Badge>
            {product.subcategory && <Badge variant="outline" className="capitalize">{product.subcategory}</Badge>}
          </div>
          <CardTitle className="text-lg font-semibold mb-2 h-14">{product.name}</CardTitle>
          <CardDescription className="text-sm text-muted-foreground h-16 overflow-hidden">
            {product.description}
          </CardDescription>
        </CardContent>
        <CardFooter className="p-4 pt-0 flex flex-col items-start">
          <p className="text-2xl font-bold text-primary mb-4">
            {formatCurrency(product.price)}
          </p>
          {product.stock > 0 ? (
            <Button onClick={handleAddToCart} className="w-full bg-accent hover:bg-accent/90">
              <ShoppingCart className="mr-2 h-4 w-4" />
              Adicionar ao Carrinho
            </Button>
          ) : (
            <Button disabled onClick={(e) => e.preventDefault()} className="w-full">
              Indisponível
            </Button>
          )}
        </CardFooter>
      </Card>
    </Link>
  );
}
