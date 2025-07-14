'use client';

import { Input } from './ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { Search } from 'lucide-react';
import type { Category } from '@/lib/types';
import { useMemo } from 'react';

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
    <div className="bg-card p-4 rounded-lg shadow-sm mb-8 flex flex-col md:flex-row gap-4 items-center">
      <div className="relative w-full md:flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
        <Input
          placeholder="Buscar por nome..."
          className="pl-10"
          value={currentFilters.search}
          onChange={(e) => onFilterChange({ search: e.target.value })}
        />
      </div>
      <div className="flex gap-4 w-full md:w-auto flex-wrap">
        <Select
            value={currentFilters.category}
            onValueChange={(value) => onFilterChange({ category: value })}
        >
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Categoria" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as Categorias</SelectItem>
            {categories.map((category, index) => (
              <SelectItem key={`${category.name}-${index}`} value={category.name} className="capitalize">
                {category.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
            value={currentFilters.subcategory}
            onValueChange={(value) => onFilterChange({ subcategory: value })}
            disabled={subcategories.length === 0}
        >
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Subcategoria" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as Subcategorias</SelectItem>
            {subcategories.map((sub, index) => (
              <SelectItem key={`${sub}-${index}`} value={sub} className="capitalize">
                {sub}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        <Select
            value={currentFilters.sort}
            onValueChange={(value) => onFilterChange({ sort: value })}
        >
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Ordenar por" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="relevance">Relevância</SelectItem>
            <SelectItem value="newest">Novidades</SelectItem>
            <SelectItem value="price-asc">Preço: Menor para Maior</SelectItem>
            <SelectItem value="price-desc">Preço: Maior para Menor</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
