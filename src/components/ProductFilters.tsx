
'use client';

import { Button } from '@/components/ui/button';
import type { Category } from '@/lib/types';
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
  const { setIsFilterSheetOpen, setSelectedCategoryForSheet } = useCart();

  const handleCategoryClick = (categoryName: string) => {
    setSelectedCategoryForSheet(categoryName);
    setIsFilterSheetOpen(true);
  }

  return (
    <div className="bg-card p-2 rounded-lg shadow-sm mb-8">
       <div className="grid grid-cols-4 items-center gap-2">
            {categories.map((cat) => (
                <Button
                    key={cat.id}
                    variant={currentFilters.category === cat.name ? 'secondary' : 'outline'}
                    onClick={() => handleCategoryClick(cat.name)}
                    className="text-xs px-2 h-8 capitalize whitespace-nowrap"
                >
                    {cat.name}
                </Button>
            ))}
       </div>
    </div>
  );
}
