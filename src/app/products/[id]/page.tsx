'use client';

import { useParams, useRouter } from 'next/navigation';
import { useCart } from '@/context/CartContext';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, ShoppingCart } from 'lucide-react';
import { useEffect, useState } from 'react';

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { products, addToCart } = useCart();
  const id = params.id as string;
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const product = products.find((p) => p.id === id);

  if (!isClient) {
    return (
      <div className="container mx-auto py-24 text-center">
        <p>Carregando produto...</p>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="container mx-auto py-24 text-center">
        <h1 className="text-2xl font-bold">Produto não encontrado</h1>
        <p className="text-muted-foreground mt-2">O produto que você está procurando não existe ou foi removido.</p>
        <Button onClick={() => router.push('/')} className="mt-6">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar para a loja
        </Button>
      </div>
    );
  }

  const installmentValue = product.price / 10;

  return (
    <div className="container mx-auto max-w-5xl py-12 px-4">
      <Button variant="ghost" onClick={() => router.back()} className="mb-8">
        <ArrowLeft className="mr-2 h-4 w-4" />
        Voltar
      </Button>
      <div className="grid md:grid-cols-2 gap-8 lg:gap-12">
        <div className="bg-card p-4 border rounded-lg">
          <div className="relative aspect-square w-full overflow-hidden rounded-md">
            <Image
              src={product.imageUrl}
              alt={product.name}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 50vw"
              data-ai-hint={product['data-ai-hint']}
            />
          </div>
        </div>
        <div className="flex flex-col">
          <Badge variant="secondary" className="capitalize w-fit mb-2">{product.category}</Badge>
          <h1 className="text-3xl lg:text-4xl font-bold font-headline text-primary">{product.name}</h1>
          <p className="text-muted-foreground mt-4 text-lg">{product.description}</p>
          
          <Separator className="my-6" />

          <div className="space-y-4">
            <p className="text-4xl font-bold text-foreground">
              {formatCurrency(product.price)}
            </p>
            <p className="text-lg text-accent font-semibold">
              ou 10x de {formatCurrency(installmentValue)} sem juros
            </p>
          </div>
          
          <div className="mt-8">
            {product.stock > 0 ? (
              <>
                <Button size="lg" onClick={() => addToCart(product)} className="w-full md:w-auto bg-accent hover:bg-accent/90">
                  <ShoppingCart className="mr-2 h-5 w-5" />
                  Adicionar ao Carrinho
                </Button>
                <p className="text-sm text-green-600 mt-2">Em estoque: {product.stock} unidades</p>
              </>
            ) : (
              <Button size="lg" disabled className="w-full md:w-auto">
                Produto Indisponível
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
