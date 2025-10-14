
'use client';

import { Button } from '@/components/ui/button';
import type { Category } from '@/lib/types';
import { Filter } from 'lucide-react';
import { useCart } from '@/context/CartContext';


interface ProductFiltersProps {
  onFilterChange: (filters: {
    category?: string;
    subcategory?: string;
  }) => void;
  categories: Category[];
  currentFilters: {
      category: string;
      subcategory: string;
      search: string;
      sort: string;
  }
}

export default function ProductFilters({ onFilterChange, categories, currentFilters }: ProductFiltersProps) {
  const { setIsFilterSheetOpen } = useCart();

  return (
    <div className="bg-card p-4 rounded-lg shadow-sm mb-8">
       <Button onClick={() => setIsFilterSheetOpen(true)}>
          <Filter className="mr-2 h-4 w-4" />
          Filtros
       </Button>
    </div>
  );
}
