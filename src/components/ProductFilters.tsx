
'use client';

import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { useMemo } from 'react';
import type { Category } from '@/lib/types';


interface ProductFiltersProps {
  onFilterChange: (filters: {
    category?: string;
    subcategory?: string;
    search?: string;
    sort?: string;
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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onFilterChange({ search: e.target.value });
  };

  const handleSortChange = (value: string) => {
    onFilterChange({ sort: value });
  };
  
  const subcategories = useMemo(() => {
    if (currentFilters.category === 'all') return [];
    const selectedCat = categories.find(cat => cat.name === currentFilters.category);
    return selectedCat?.subcategories || [];
  }, [currentFilters.category, categories]);


  return (
    <div className="bg-card p-4 rounded-lg shadow-sm mb-8">
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 items-center">
        <Input
          placeholder="Buscar produto..."
          onChange={handleInputChange}
          className="md:col-span-2"
          value={currentFilters.search}
        />
        <Select onValueChange={handleSortChange} value={currentFilters.sort}>
          <SelectTrigger>
            <SelectValue placeholder="Ordenar por" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">Mais Recentes</SelectItem>
            <SelectItem value="price-asc">Menor Preço</SelectItem>
            <SelectItem value="price-desc">Maior Preço</SelectItem>
          </SelectContent>
        </Select>
      </div>

       <div className="flex flex-wrap gap-2 mt-4">
        <Button
          variant={currentFilters.category === 'all' ? 'secondary' : 'ghost'}
          onClick={() => onFilterChange({ category: 'all' })}
        >
          Todas
        </Button>
        {categories.map((cat) => (
          <Button
            key={cat.id}
            variant={currentFilters.category === cat.name ? 'secondary' : 'ghost'}
            onClick={() => onFilterChange({ category: cat.name })}
            className="capitalize"
          >
            {cat.name}
          </Button>
        ))}
      </div>
      
       {subcategories.length > 0 && (
         <div className="flex flex-wrap gap-2 mt-2 pt-2 border-t">
            <Button
              variant={currentFilters.subcategory === 'all' ? 'outline' : 'ghost'}
              size="sm"
              onClick={() => onFilterChange({ subcategory: 'all' })}
            >
              Todas as Subcategorias
            </Button>
            {subcategories.map((sub, index) => (
              <Button
                key={index}
                variant={currentFilters.subcategory === sub ? 'outline' : 'ghost'}
                size="sm"
                onClick={() => onFilterChange({ subcategory: sub })}
                className="capitalize"
              >
                {sub}
              </Button>
            ))}
         </div>
       )}
    </div>
  );
}
