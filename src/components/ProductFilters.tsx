
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useMemo } from 'react';
import type { Category } from '@/lib/types';
import { ChevronDown } from 'lucide-react';


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
        {categories.map((cat) => {
          if (!cat.subcategories || cat.subcategories.length === 0) {
            return (
              <Button
                key={cat.id}
                variant={currentFilters.category === cat.name ? 'secondary' : 'ghost'}
                onClick={() => onFilterChange({ category: cat.name })}
                className="capitalize"
              >
                {cat.name}
              </Button>
            )
          }

          return (
             <DropdownMenu key={cat.id}>
              <DropdownMenuTrigger asChild>
                <Button
                  variant={currentFilters.category === cat.name ? 'secondary' : 'ghost'}
                  className="capitalize"
                  onClick={() => onFilterChange({ category: cat.name })}
                >
                  {cat.name}
                  <ChevronDown className="ml-2 h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onSelect={() => onFilterChange({ category: cat.name, subcategory: 'all' })}>
                  Todas em {cat.name}
                </DropdownMenuItem>
                {cat.subcategories.map((sub, index) => (
                  <DropdownMenuItem key={index} onSelect={() => onFilterChange({ category: cat.name, subcategory: sub })}>
                    {sub}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )
        })}
      </div>
    </div>
  );
}
