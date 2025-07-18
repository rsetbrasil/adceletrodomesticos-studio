'use client';

import { useState, useMemo } from 'react';
import { useCart } from '@/context/CartContext';
import type { Product } from '@/lib/types';
import ProductCard from '@/components/ProductCard';
import ProductFilters from '@/components/ProductFilters';

export default function Home() {
  const { products: allProducts, categories } = useCart();
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
        // Assuming products are ordered by newest in the source data
        break;
      default: // relevance
        // No specific relevance logic, using default order
        break;
    }

    return filtered;
  }, [filters, allProducts]);

  return (
    <div className="container mx-auto px-4 py-8">
      <header className="mb-8 text-center">
        <h1 className="text-4xl font-bold font-headline text-primary">Nosso Catálogo</h1>
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
  );
}
