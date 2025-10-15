
'use client';

import { useState, useMemo } from 'react';
import { useCart } from '@/context/CartContext';
import type { Product } from '@/lib/types';
import ProductCard from '@/components/ProductCard';
import ProductFilters from '@/components/ProductFilters';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import FilterSheet from '@/components/FilterSheet';


const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
};


export default function Home() {
  const { products: allProducts, categories, setIsCartOpen } = useCart();
  const [filters, setFilters] = useState({
    category: 'all',
    subcategory: 'all',
    search: '',
    sort: 'newest',
  });

  const handleFilterChange = (
    newFilters: Partial<typeof filters>
  ) => {
    setFilters((prevFilters) => {
        const updated = { ...prevFilters, ...newFilters };
        // Reset subcategory if parent category changes
        if (newFilters.category && newFilters.category !== prevFilters.category) {
            updated.subcategory = 'all';
        }
        return updated;
    });
  };

  const saleProducts = useMemo(() => {
    return allProducts.filter(p => p.onSale);
  }, [allProducts]);

  const filteredAndSortedProducts = useMemo(() => {
    let filtered = [...allProducts];

    if (filters.category !== 'all') {
      filtered = filtered.filter((p) => p.category === filters.category);
    }
    
    if (filters.subcategory !== 'all') {
        filtered = filtered.filter((p) => p.subcategory === filters.subcategory);
    }

    if (filters.search) {
      filtered = filtered.filter((p) =>
        p.name.toLowerCase().includes(filters.search.toLowerCase())
      );
    }

    switch (filters.sort) {
      case 'price-asc':
        filtered.sort((a, b) => a.price - b.price);
        break;
      case 'price-desc':
        filtered.sort((a, b) => b.price - b.price);
        break;
      case 'newest':
        filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        break;
      default: // relevance
        // No specific relevance logic, using default order
        break;
    }

    return filtered;
  }, [filters, allProducts]);

  return (
    <>
      <FilterSheet 
        categories={categories}
        onFilterChange={handleFilterChange}
        currentFilters={filters}
      />
      {saleProducts.length > 0 && (
        <section className="w-full bg-muted/50">
          {saleProducts.length === 1 ? (
             <div className="w-full">
                <Card className="flex flex-col md:flex-row items-center justify-center p-6 gap-6 md:gap-10 h-[60vh] border-none rounded-none">
                  <div className="relative w-full md:w-80 h-64 md:h-80 flex-shrink-0">
                    <Badge className="absolute top-2 left-2 z-10 bg-destructive text-destructive-foreground hover:bg-destructive/80">
                        Promoção
                    </Badge>
                    <Image
                      src={(saleProducts[0].imageUrls && saleProducts[0].imageUrls.length > 0) ? saleProducts[0].imageUrls[0] : 'https://placehold.co/400x400.png'}
                      alt={saleProducts[0].name}
                      fill
                      className="object-contain"
                      sizes="(max-width: 768px) 90vw, 50vw"
                    />
                  </div>
                  <div className="flex flex-col text-center md:text-left max-w-md">
                    <h3 className="text-3xl font-bold">{saleProducts[0].name}</h3>
                    <p className="text-muted-foreground text-md mt-2 mb-4">{saleProducts[0].description}</p>
                    <p className="text-4xl font-bold text-accent">{formatCurrency(saleProducts[0].price)}</p>
                    <Link href={`/products/${saleProducts[0].id}`} className="mt-6">
                      <Button size="lg">Ver Detalhes da Oferta</Button>
                    </Link>
                  </div>
                </Card>
            </div>
            ) : (
              // Render carousel for multiple products, with container
            <div className="container mx-auto py-8">
              <Carousel
                opts={{
                  align: "start",
                  loop: true,
                }}
                className="w-full"
              >
                <CarouselContent>
                  {saleProducts.map((product) => (
                    <CarouselItem key={product.id} className="md:basis-1/2 lg:basis-1/3">
                      <div className="p-1 h-full">
                        <Card className="h-full overflow-hidden">
                          <CardContent className="flex flex-col md:flex-row items-center justify-center p-6 gap-6 h-full">
                             <div className="relative w-48 h-48 flex-shrink-0">
                               <Badge className="absolute top-2 left-2 z-10 bg-destructive text-destructive-foreground hover:bg-destructive/80">
                                 Promoção
                               </Badge>
                              <Image
                                src={(product.imageUrls && product.imageUrls.length > 0) ? product.imageUrls[0] : 'https://placehold.co/400x400.png'}
                                alt={product.name}
                                fill
                                className="object-contain"
                                sizes="50vw"
                              />
                            </div>
                            <div className="flex flex-col text-center md:text-left">
                              <h3 className="text-xl font-bold">{product.name}</h3>
                              <p className="text-muted-foreground text-sm mt-1 mb-3 h-10 overflow-hidden">{product.description}</p>
                              <p className="text-3xl font-bold text-accent">{formatCurrency(product.price)}</p>
                              <Link href={`/products/${product.id}`} className="mt-4">
                                <Button>Ver Detalhes</Button>
                              </Link>
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    </CarouselItem>
                  ))}
                </CarouselContent>
                <CarouselPrevious className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4" />
                <CarouselNext className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4" />
              </Carousel>
            </div>
            )}
        </section>
      )}

      <div id="catalog" className="container mx-auto px-4 py-8">
        <ProductFilters
            onFilterChange={handleFilterChange}
            categories={categories}
            currentFilters={filters}
        />
        
        {filteredAndSortedProducts.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            {filteredAndSortedProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <p className="text-lg text-muted-foreground">Nenhum produto encontrado.</p>
          </div>
        )}
      </div>
    </>
  );
}
