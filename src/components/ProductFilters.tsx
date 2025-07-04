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

interface ProductFiltersProps {
  categories: string[];
  onFilterChange: (filters: { category?: string; search?: string; sort?: string }) => void;
  currentFilters: {
    category: string;
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
      <div className="flex gap-4 w-full md:w-auto">
        <Select
            value={currentFilters.category}
            onValueChange={(value) => onFilterChange({ category: value })}
        >
          <SelectTrigger className="w-full md:w-[180px]">
            <SelectValue placeholder="Categoria" />
          </SelectTrigger>
          <SelectContent>
            {categories.map((category) => (
              <SelectItem key={category} value={category} className="capitalize">
                {category === 'all' ? 'Todas as Categorias' : category}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
            value={currentFilters.sort}
            onValueChange={(value) => onFilterChange({ sort: value })}
        >
          <SelectTrigger className="w-full md:w-[180px]">
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
