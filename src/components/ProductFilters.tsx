
'use client';

import { Button } from '@/components/ui/button';
import type { Category } from '@/lib/types';

interface ProductFiltersProps {
  categories: Category[];
  onFilterChange: (filters: { category?: string; subcategory?: string; search?: string; sort?: string }) => void;
  currentFilters: {
    category: string;
    subcategory: string;
    search: string;
    sort: string;
  };
}

export default function ProductFilters({
  categories,
  onFilterChange,
  currentFilters
}: ProductFiltersProps) {

  return (
    <div className="bg-card p-4 rounded-lg shadow-sm mb-8">
      <div className="flex flex-wrap items-center gap-2">
          <Button
            variant={currentFilters.category === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => onFilterChange({ category: 'all' })}
          >
            Todas
          </Button>
          {categories.map((category) => (
            <Button
              key={category.id}
              variant={currentFilters.category === category.name ? 'default' : 'outline'}
              size="sm"
              onClick={() => onFilterChange({ category: category.name })}
              className="capitalize"
            >
              {category.name}
            </Button>
          ))}
      </div>
    </div>
  );
}
