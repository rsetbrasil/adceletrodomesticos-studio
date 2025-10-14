'use client';

import { useState, useMemo } from 'react';
import { useCart } from '@/context/CartContext';
import type { Product } from '@/lib/types';
import ProductCard from '@/components/ProductCard';
import ProductFilters from '@/components/ProductFilters';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { CartSheet } from '@/components/CartSheet';

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
        filtered.sort((a, b) => b.price - a.price);
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
      <section className="relative w-full h-[400px] mb-12 text-white">
        <Image
          src="https://picsum.photos/seed/banner/1600/400"
          alt="Banner de promoção"
          fill
          className="object-cover"
          priority
          data-ai-hint="living room"
        />
        <div className="absolute inset-0 bg-black/50" />
        <div className="relative container mx-auto flex flex-col items-center justify-center h-full text-center space-y-4 px-4">
          <h1 className="text-4xl md:text-6xl font-bold font-headline">Renove seu Lar</h1>
          <p className="text-lg md:text-xl max-w-2xl text-white/90">
            As melhores ofertas em móveis e eletrodomésticos para deixar sua casa do jeito que você sempre sonhou.
          </p>
          <Link href="#catalog">
            <Button size="lg" className="bg-accent text-accent-foreground hover:bg-accent/90">
              Ver Ofertas
            </Button>
          </Link>
        </div>
      </section>

      <div id="catalog" className="container mx-auto px-4 py-8">
        <header className="mb-8 text-center">
          <h2 className="text-4xl font-bold font-headline text-primary">Nosso Catálogo</h2>
          <p className="text-muted-foreground mt-2">
            Explore nossa seleção de produtos de alta qualidade.
          </p>
        </header>

        <ProductFilters
          categories={categories}
          onFilterChange={handleFilterChange}
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
