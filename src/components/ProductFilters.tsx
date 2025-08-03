'use client';

import { Input } from './ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { Button } from '@/components/ui/button';
import { Search, ListFilter } from 'lucide-react';
import type { Category } from '@/lib/types';
import { useMemo } from 'react';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';


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
  
  const subcategories = useMemo(() => {
    if (currentFilters.category === 'all') {
      return [];
    }
    const selectedCategory = categories.find(c => c.name === currentFilters.category);
    return selectedCategory ? selectedCategory.subcategories : [];
  }, [currentFilters.category, categories]);

  return (
    <div className="bg-card p-4 rounded-lg shadow-sm mb-8 space-y-4">
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative w-full md:flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome..."
            className="pl-10"
            value={currentFilters.search}
            onChange={(e) => onFilterChange({ search: e.target.value })}
          />
        </div>
        <div className="flex items-center gap-4">
           {subcategories.length > 0 && (
            <Select
                value={currentFilters.subcategory}
                onValueChange={(value) => onFilterChange({ subcategory: value })}
            >
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Subcategoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as Sub</SelectItem>
                {subcategories.map((sub, index) => (
                  <SelectItem key={`${sub}-${index}`} value={sub} className="capitalize">
                    {sub}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
           )}
           <Select
              value={currentFilters.sort}
              onValueChange={(value) => onFilterChange({ sort: value })}
          >
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Ordenar por" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Novidades</SelectItem>
              <SelectItem value="relevance">Relevância</SelectItem>
              <SelectItem value="price-asc">Preço: Menor para Maior</SelectItem>
              <SelectItem value="price-desc">Preço: Maior para Menor</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      
      <ScrollArea className="w-full whitespace-nowrap">
        <div className="flex items-center gap-2 pb-2">
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
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  );
}
